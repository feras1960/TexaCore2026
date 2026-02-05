import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Loader2 } from 'lucide-react';
import { useCompanyCurrencies, getCurrencyDisplayName } from '@/hooks/useCompanyCurrencies';

interface CurrencySelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    options?: string[];           // Optional - if not provided, uses company currencies
    className?: string;
    showAllOption?: boolean;
    useCompanyCurrenciesHook?: boolean;  // If true, fetch from company settings
}

export function CurrencySelector({
    value,
    onValueChange,
    options,
    className,
    showAllOption = true,
    useCompanyCurrenciesHook = true
}: CurrencySelectorProps) {
    const { t, language } = useLanguage();
    const companyCurrencies = useCompanyCurrencies();

    // Determine which currencies to show
    const currencies = options || (useCompanyCurrenciesHook ? companyCurrencies.supportedCurrencies : ['USD', 'EUR', 'SAR']);
    const isLoading = useCompanyCurrenciesHook && companyCurrencies.loading;

    // Get currency label
    const getCurrencyLabel = (code: string) => {
        // Try translation first
        const translated = t(`currencies.${code}`);
        if (translated !== `currencies.${code}`) {
            return `${code} - ${translated}`;
        }
        // Fallback to metadata
        return `${code} - ${getCurrencyDisplayName(code, language as 'ar' | 'en')}`;
    };

    return (
        <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
            <SelectTrigger className={`h-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-w-[140px] ${className}`}>
                {isLoading ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin text-gray-400" />
                ) : (
                    <Globe className="w-4 h-4 me-2 text-gray-400" />
                )}
                <SelectValue placeholder={t('common.currency')} />
            </SelectTrigger>
            <SelectContent>
                {showAllOption && (
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                )}
                {currencies.map((code) => (
                    <SelectItem key={code} value={code}>
                        {getCurrencyLabel(code)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/**
 * SmartCurrencySelector - Uses company currencies automatically
 * Use this when you want to show only the currencies configured for the company
 */
export function SmartCurrencySelector({
    value,
    onValueChange,
    className,
    showAllOption = false
}: Omit<CurrencySelectorProps, 'options' | 'useCompanyCurrenciesHook'>) {
    return (
        <CurrencySelector
            value={value}
            onValueChange={onValueChange}
            className={className}
            showAllOption={showAllOption}
            useCompanyCurrenciesHook={true}
        />
    );
}
