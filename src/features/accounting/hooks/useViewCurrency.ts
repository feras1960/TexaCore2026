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
    isLoading: boolean;
}

const STORAGE_KEY = 'erp_view_currency_preference';

export function useViewCurrency(): UseViewCurrencyReturn {
    const { t } = useLanguage();
    const { company } = useCompany();
    const [selectedCurrency, setSelectedCurrencyState] = useState<string>('all');
    const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
    const [ratesMap, setRatesMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const initialized = useRef(false);

    // Initialize from storage or company default
    useEffect(() => {
        if (!company) return;

        // Fetch supported currencies from settings
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('company_accounting_settings')
                    .select('supported_currencies, base_currency')
                    .eq('company_id', company.id)
                    .single();

                let options: string[] = [];
                if (data?.supported_currencies && data.supported_currencies.length > 0) {
                    options = data.supported_currencies;
                } else {
                    // Fallback to commonly used ones + default
                    options = Array.from(new Set([data?.base_currency || 'SAR', 'USD', 'EUR', 'SAR']));
                }
                setCurrencyOptions(options);

                // Fetch rates for client-side conversion
                const rates = await ExchangeRatesService.getExchangeRatesMap(company.id);
                setRatesMap(rates);

                // Set selected currency
                if (!initialized.current) {
                    const stored = localStorage.getItem(STORAGE_KEY);
                    if (stored && options.includes(stored)) {
                        setSelectedCurrencyState(stored);
                    } else if (data?.base_currency) {
                        setSelectedCurrencyState(data.base_currency);
                    } else if (company.default_currency) {
                        setSelectedCurrencyState(company.default_currency);
                    }
                    initialized.current = true;
                }
            } catch (err) {
                console.error('Error fetching currency settings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [company]);

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

        // Direct rate
        const directKey = `${fromCurrency}-${selectedCurrency}`;
        if (ratesMap[directKey]) {
            return amount * ratesMap[directKey];
        }

        // Inverse rate
        const inverseKey = `${selectedCurrency}-${fromCurrency}`;
        if (ratesMap[inverseKey]) {
            return amount * (1 / ratesMap[inverseKey]);
        }

        // If no direct conversion found, try via base currency (assuming SAR or USD as common pivot)
        // This is a simplified fallback. Ideally, the backend function handles complex paths.

        return amount; // Return original if conversion not possible
    }, [selectedCurrency, ratesMap]);

    const formatAmount = useCallback((amount: number, fromCurrencyCode?: string) => {
        if (amount === undefined || amount === null) return '-';

        const currencyToDisplay = selectedCurrency !== 'all' ? selectedCurrency : (fromCurrencyCode || company?.default_currency || 'SAR');
        const finalAmount = selectedCurrency !== 'all' && fromCurrencyCode
            ? convertAmount(amount, fromCurrencyCode)
            : amount;

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyToDisplay,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(finalAmount);
        } catch (e) {
            // Fallback for invalid currency codes
            return `${finalAmount.toFixed(2)} ${currencyToDisplay}`;
        }
    }, [selectedCurrency, company?.default_currency, convertAmount]);

    return {
        selectedCurrency,
        setSelectedCurrency,
        currencyOptions,
        formatAmount,
        convertAmount,
        isCurrencySelected: selectedCurrency !== 'all',
        isLoading: loading
    };
}
