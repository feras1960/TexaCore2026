/**
 * useCompanyCurrencies Hook
 * 
 * Fetches the supported currencies for the current company
 * from company_accounting_settings
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from './useCompany';

interface CompanyCurrencies {
    baseCurrency: string;
    supportedCurrencies: string[];
    loading: boolean;
    error: string | null;
}

// Default currencies as fallback
const DEFAULT_CURRENCIES: string[] = [];

export function useCompanyCurrencies(): CompanyCurrencies {
    const { companyId } = useCompany();
    const [baseCurrency, setBaseCurrency] = useState<string>('');
    const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(DEFAULT_CURRENCIES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!companyId) {
            setLoading(false);
            return;
        }

        const fetchCurrencies = async () => {
            try {
                setLoading(true);
                setError(null);

                const { data, error: fetchError } = await supabase
                    .from('company_accounting_settings')
                    .select('base_currency, supported_currencies')
                    .eq('company_id', companyId)
                    .single();

                if (fetchError) {
                    // If no settings found, use company's default_currency
                    const { data: companyData } = await supabase
                        .from('companies')
                        .select('default_currency')
                        .eq('id', companyId)
                        .single();

                    if (companyData?.default_currency) {
                        setBaseCurrency(companyData.default_currency);
                        setSupportedCurrencies([companyData.default_currency]);
                    }
                    return;
                }

                if (data) {
                    setBaseCurrency(data.base_currency || '');
                    // Ensure it's an array and has at least the base currency
                    const currencies = Array.isArray(data.supported_currencies)
                        ? data.supported_currencies
                        : data.base_currency ? [data.base_currency] : [];

                    // Make sure base currency is included
                    if (!currencies.includes(data.base_currency)) {
                        currencies.unshift(data.base_currency);
                    }

                    setSupportedCurrencies(currencies);
                }
            } catch (err: any) {
                console.error('Error fetching company currencies:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrencies();
    }, [companyId]);

    return {
        baseCurrency,
        supportedCurrencies,
        loading,
        error
    };
}

// Currency metadata for display
export const currencyMetadata: Record<string, { name: string; nameAr: string; symbol: string }> = {
    USD: { name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
    EUR: { name: 'Euro', nameAr: 'يورو', symbol: '€' },
    SAR: { name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: '﷼' },
    AED: { name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ' },
    GBP: { name: 'British Pound', nameAr: 'جنيه إسترليني', symbol: '£' },
    EGP: { name: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'ج.م' },
    JOD: { name: 'Jordanian Dinar', nameAr: 'دينار أردني', symbol: 'د.أ' },
    KWD: { name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك' },
    QAR: { name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'ر.ق' },
    BHD: { name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'د.ب' },
    OMR: { name: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'ر.ع' },
    TRY: { name: 'Turkish Lira', nameAr: 'ليرة تركية', symbol: '₺' },
    CNY: { name: 'Chinese Yuan', nameAr: 'يوان صيني', symbol: '¥' },
    INR: { name: 'Indian Rupee', nameAr: 'روبية هندية', symbol: '₹' },
    PKR: { name: 'Pakistani Rupee', nameAr: 'روبية باكستانية', symbol: '₨' },
};

// Helper to get currency display name
export function getCurrencyDisplayName(code: string, language: 'ar' | 'en' = 'ar'): string {
    const meta = currencyMetadata[code];
    if (!meta) return code;
    return language === 'ar' ? meta.nameAr : meta.name;
}
