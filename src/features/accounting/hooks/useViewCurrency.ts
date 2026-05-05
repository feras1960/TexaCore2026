import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { ExchangeRatesService } from '@/services/data/ExchangeRatesService';
import { supabase } from '@/lib/supabase';

export interface UseViewCurrencyReturn {
    selectedCurrency: string;
    setSelectedCurrency: (currency: string) => void;
    currencyOptions: string[];
    formatAmount: (amount: number, currencyCode?: string) => string;
    isCurrencySelected: boolean;
    convertAmount: (amount: number, fromCurrency: string) => number;
    getRate: (fromCurrency: string, toCurrency: string) => number;
    isLoading: boolean;
}

const STORAGE_KEY = 'erp_view_currency_preference';

// ════════════════════════════════════════════════════════
// 🚀 MODULE-LEVEL CACHE — starts loading at JS import time
//    (before any React component mounts!!)
// ════════════════════════════════════════════════════════

interface CurrencyData {
    options: string[];
    baseCurrency: string;
    ratesMap: Record<string, number>;
}

let _cachedCurrencyData: CurrencyData | null = null;
let _loadingPromise: Promise<CurrencyData | null> | null = null;
let _cacheCompanyId: string | null = null;

/**
 * Read company_id directly from Supabase's cached auth token in localStorage.
 * This is INSTANT (0ms) — no network calls, no async, no auth chain!
 */
function getCompanyIdFromLocalStorage(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                const cid = parsed?.user?.user_metadata?.company_id;
                if (cid) return cid;
            }
        }
    } catch { /* ignore */ }
    return null;
}

async function loadCurrencyData(companyId: string): Promise<CurrencyData | null> {
    try {
        const [settingsResult, ratesMap] = await Promise.all([
            supabase
                .from('company_accounting_settings')
                .select('supported_currencies, base_currency')
                .eq('company_id', companyId)
                .single(),
            ExchangeRatesService.getExchangeRatesMap(companyId)
        ]);

        const data = settingsResult.data;
        let options: string[] = [];
        if (data?.supported_currencies && data.supported_currencies.length > 0) {
            options = data.supported_currencies;
        } else if (data?.base_currency) {
            options = [data.base_currency];
        }

        return {
            options,
            baseCurrency: data?.base_currency || '',
            ratesMap: ratesMap || {}
        };
    } catch (err) {
        console.error('[useViewCurrency] preload error:', err);
        return null;
    }
}

/**
 * Preload currencies immediately — call this as early as possible.
 */
export function preloadCurrencies(companyId: string, force = false): void {
    if (!companyId) return;
    if (!force && _cachedCurrencyData && _cacheCompanyId === companyId) return;
    if (!force && _loadingPromise && _cacheCompanyId === companyId) return;

    _cacheCompanyId = companyId;
    _loadingPromise = loadCurrencyData(companyId).then(result => {
        _cachedCurrencyData = result;
        _loadingPromise = null;
        return result;
    });
}

// ─── AUTO-PRELOAD at module import time (INSTANT!) ─────────────────────────
// ⚠️ Only preload if the stored session is still valid (not expired).
// Without this check, a stale sb-*-auth-token with an old company_id
// triggers a 406 error on every page load (including the login page).
(() => {
    const cachedCid = getCompanyIdFromLocalStorage();
    if (cachedCid) {
        // Verify the session token is not expired before preloading
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const parsed = JSON.parse(raw);
                    const expiresAt = parsed?.expires_at;
                    // expires_at is a Unix timestamp in seconds
                    if (expiresAt && expiresAt * 1000 < Date.now()) {
                        // Session expired — don't preload with stale company_id
                        return;
                    }
                }
            }
        } catch { /* ignore */ }
        preloadCurrencies(cachedCid);
    }
})();
// ───────────────────────────────────────────────────────────────────────────

export function useViewCurrency(): UseViewCurrencyReturn {
    const { language } = useLanguage();
    const { company } = useCompany();

    const companyId = company?.id;

    // ─── Initialize state directly from cached data if available ───
    const [selectedCurrency, setSelectedCurrencyState] = useState<string>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (_cachedCurrencyData) {
            if (stored && _cachedCurrencyData.options.includes(stored)) return stored;
            // Auto-select if only one currency is available
            if (_cachedCurrencyData.options.length === 1) return _cachedCurrencyData.options[0];
            return _cachedCurrencyData.baseCurrency || 'all';
        }
        return stored || 'all';
    });
    const [currencyOptions, setCurrencyOptions] = useState<string[]>(() => _cachedCurrencyData?.options || []);
    const [ratesMap, setRatesMap] = useState<Record<string, number>>(() => _cachedCurrencyData?.ratesMap || {});
    const [loading, setLoading] = useState<boolean>(!_cachedCurrencyData);
    const initialized = useRef(false);

    // ─── Sync once company is available & data is ready ───
    useEffect(() => {
        if (!companyId) return;

        // Trigger preload if not already started for this company
        preloadCurrencies(companyId);

        const apply = (data: CurrencyData) => {
            setCurrencyOptions(data.options);
            setRatesMap(data.ratesMap);

            if (!initialized.current) {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored && data.options.includes(stored)) {
                    setSelectedCurrencyState(stored);
                } else if (data.options.length === 1) {
                    // Auto-select if only one currency is available
                    setSelectedCurrencyState(data.options[0]);
                } else if (data.baseCurrency) {
                    setSelectedCurrencyState(data.baseCurrency);
                }
                initialized.current = true;
            }
            setLoading(false);
        };

        // If data is already cached for this company → apply immediately (0ms!)
        if (_cachedCurrencyData && _cacheCompanyId === companyId) {
            apply(_cachedCurrencyData);
            return;
        }

        // Wait for the in-flight promise
        const promise = _loadingPromise;
        if (promise) {
            setLoading(true);
            promise.then(data => {
                if (data) apply(data);
                else setLoading(false);
            });
            return;
        }

        // Fallback: fetch on demand
        setLoading(true);
        loadCurrencyData(companyId).then(data => {
            if (data) {
                _cachedCurrencyData = data;
                _cacheCompanyId = companyId;
                apply(data);
            } else {
                setLoading(false);
            }
        });
    }, [companyId]);

    const setSelectedCurrency = (value: string) => {
        setSelectedCurrencyState(value);
        if (value !== 'all') {
            localStorage.setItem(STORAGE_KEY, value);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    /**
     * Convert amount from source currency to selected currency
     */
    const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
        if (selectedCurrency === 'all' || !fromCurrency || fromCurrency === selectedCurrency) {
            return amount;
        }

        const directKey = `${fromCurrency}-${selectedCurrency}`;
        if (ratesMap[directKey]) return amount * ratesMap[directKey];

        const inverseKey = `${selectedCurrency}-${fromCurrency}`;
        if (ratesMap[inverseKey]) return amount * (1 / ratesMap[inverseKey]);

        const pivots = ['USD', 'EUR', 'SAR', 'UAH', 'TRY'];
        for (const pivot of pivots) {
            if (pivot === fromCurrency || pivot === selectedCurrency) continue;
            let fromToPivot: number | null = null;
            if (ratesMap[`${fromCurrency}-${pivot}`]) fromToPivot = ratesMap[`${fromCurrency}-${pivot}`];
            else if (ratesMap[`${pivot}-${fromCurrency}`]) fromToPivot = 1 / ratesMap[`${pivot}-${fromCurrency}`];
            if (fromToPivot === null) continue;

            let pivotToSelected: number | null = null;
            if (ratesMap[`${pivot}-${selectedCurrency}`]) pivotToSelected = ratesMap[`${pivot}-${selectedCurrency}`];
            else if (ratesMap[`${selectedCurrency}-${pivot}`]) pivotToSelected = 1 / ratesMap[`${selectedCurrency}-${pivot}`];

            if (pivotToSelected !== null) return amount * fromToPivot * pivotToSelected;
        }

        return amount;
    }, [selectedCurrency, ratesMap]);

    const formatAmount = useCallback((amount: number, fromCurrencyCode?: string) => {
        if (amount === undefined || amount === null) return '-';

        const currencyToDisplay = selectedCurrency !== 'all' ? selectedCurrency : (fromCurrencyCode || '');
        const finalAmount = selectedCurrency !== 'all' && fromCurrencyCode
            ? convertAmount(amount, fromCurrencyCode)
            : amount;

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyToDisplay || 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(finalAmount);
        } catch {
            return `${finalAmount.toFixed(2)} ${currencyToDisplay}`;
        }
    }, [selectedCurrency, convertAmount]);

    const getRate = useCallback((fromCurrency: string, toCurrency: string): number => {
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return 1;

        const directKey = `${fromCurrency}-${toCurrency}`;
        if (ratesMap[directKey]) return ratesMap[directKey];

        const inverseKey = `${toCurrency}-${fromCurrency}`;
        if (ratesMap[inverseKey]) return 1 / ratesMap[inverseKey];

        const pivots = ['USD', 'EUR', 'SAR', 'UAH', 'TRY', 'GBP'];
        for (const pivot of pivots) {
            if (pivot === fromCurrency || pivot === toCurrency) continue;
            let fromToPivot: number | null = null;
            if (ratesMap[`${fromCurrency}-${pivot}`]) fromToPivot = ratesMap[`${fromCurrency}-${pivot}`];
            else if (ratesMap[`${pivot}-${fromCurrency}`]) fromToPivot = 1 / ratesMap[`${pivot}-${fromCurrency}`];
            if (fromToPivot === null) continue;

            let pivotToTarget: number | null = null;
            if (ratesMap[`${pivot}-${toCurrency}`]) pivotToTarget = ratesMap[`${pivot}-${toCurrency}`];
            else if (ratesMap[`${toCurrency}-${pivot}`]) pivotToTarget = 1 / ratesMap[`${toCurrency}-${pivot}`];

            if (pivotToTarget !== null) return fromToPivot * pivotToTarget;
        }

        return 1;
    }, [ratesMap]);

    return {
        selectedCurrency,
        setSelectedCurrency,
        currencyOptions,
        formatAmount,
        convertAmount,
        getRate,
        isCurrencySelected: selectedCurrency !== 'all',
        isLoading: loading
    };
}
