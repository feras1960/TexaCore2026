/**
 * ════════════════════════════════════════════════════════════════
 * 💰 useCompanyCurrency — Single source of truth for currency
 * ════════════════════════════════════════════════════════════════
 * 
 * Returns the company's base currency code + symbol from DB.
 * Use this instead of hardcoded 'SAR' / 'ر.س' / '﷼' anywhere.
 * 
 * Usage:
 *   const { currencyCode, currencySymbol } = useCompanyCurrency();
 *   // currencyCode = 'UAH', currencySymbol = '₴'
 * 
 * For non-hook contexts (services, utils), use:
 *   getCompanyCurrencySync()  — returns last known value from cache
 * ════════════════════════════════════════════════════════════════
 */

import { useCompany } from './useCompany';

// ── Currency metadata map ─────────────────────────────────────────
export const CURRENCY_META: Record<string, { symbol: string; nameAr: string; nameEn: string; flag: string }> = {
    USD: { symbol: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', flag: '🇺🇸' },
    EUR: { symbol: '€', nameAr: 'يورو', nameEn: 'Euro', flag: '🇪🇺' },
    SAR: { symbol: '﷼', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', flag: '🇸🇦' },
    AED: { symbol: 'د.إ', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', flag: '🇦🇪' },
    GBP: { symbol: '£', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', flag: '🇬🇧' },
    EGP: { symbol: 'ج.م', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', flag: '🇪🇬' },
    JOD: { symbol: 'د.أ', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', flag: '🇯🇴' },
    KWD: { symbol: 'د.ك', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', flag: '🇰🇼' },
    QAR: { symbol: 'ر.ق', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', flag: '🇶🇦' },
    BHD: { symbol: 'د.ب', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', flag: '🇧🇭' },
    OMR: { symbol: 'ر.ع', nameAr: 'ريال عماني', nameEn: 'Omani Rial', flag: '🇴🇲' },
    TRY: { symbol: '₺', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', flag: '🇹🇷' },
    UAH: { symbol: '₴', nameAr: 'هريفنيا أوكرانية', nameEn: 'Ukrainian Hryvnia', flag: '🇺🇦' },
    CNY: { symbol: '¥', nameAr: 'يوان صيني', nameEn: 'Chinese Yuan', flag: '🇨🇳' },
    INR: { symbol: '₹', nameAr: 'روبية هندية', nameEn: 'Indian Rupee', flag: '🇮🇳' },
    PKR: { symbol: '₨', nameAr: 'روبية باكستانية', nameEn: 'Pakistani Rupee', flag: '🇵🇰' },
};

// ── Global cache for non-hook (sync) access ──────────────────────
let _cachedCurrencyCode: string | null = null;

/** Get currency symbol from code */
export function getCurrencySymbol(code: string): string {
    return CURRENCY_META[code]?.symbol || code;
}

/** Get currency display name */
export function getCurrencyName(code: string, lang: 'ar' | 'en'): string {
    const m = CURRENCY_META[code];
    if (!m) return code;
    return lang === 'ar' ? m.nameAr : m.nameEn;
}

/** Sync getter — returns last known company currency from cache */
export function getCompanyCurrencySync(): { code: string; symbol: string } {
    const code = _cachedCurrencyCode || '';
    return { code, symbol: getCurrencySymbol(code) };
}

// ── Hook ──────────────────────────────────────────────────────────
export interface CompanyCurrencyReturn {
    /** Currency code, e.g. 'UAH' */
    currencyCode: string;
    /** Currency symbol, e.g. '₴' */
    currencySymbol: string;
    /** Currency name in current language */
    currencyName: string;
    /** Flag emoji */
    currencyFlag: string;
    /** All currency metadata */
    meta: typeof CURRENCY_META[string] | undefined;
    /** True while company data is loading */
    loading: boolean;
}

export function useCompanyCurrency(lang: 'ar' | 'en' = 'ar'): CompanyCurrencyReturn {
    const { company, loading } = useCompany();

    const currencyCode = company?.default_currency || '';
    const meta = CURRENCY_META[currencyCode];

    // Update sync cache whenever company data changes
    if (currencyCode) {
        _cachedCurrencyCode = currencyCode;
    }

    return {
        currencyCode,
        currencySymbol: meta?.symbol || currencyCode,
        currencyName: meta ? (lang === 'ar' ? meta.nameAr : meta.nameEn) : currencyCode,
        currencyFlag: meta?.flag || '🏳️',
        meta,
        loading,
    };
}

export default useCompanyCurrency;
