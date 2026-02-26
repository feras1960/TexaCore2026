import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';

export interface CompanyAccountingSettings {
    id?: string;
    company_id: string;
    base_currency: string;
    decimal_places: number;
    date_format: string;
    number_format: string;
    vat_enabled: boolean;
    vat_rate: number;
    auto_post_entries: boolean;
    require_approval: boolean;
    default_cash_account_id?: string;
    default_bank_account_id?: string;
    default_revenue_account_id?: string;
    default_expense_account_id?: string;
    default_receivable_account_id?: string;
    default_payable_account_id?: string;
    default_purchase_account_id?: string;
    default_cogs_account_id?: string;
    default_sales_account_id?: string;
    default_tax_input_account_id?: string;
    default_tax_output_account_id?: string;
    default_inventory_account_id?: string;
    journal_entry_prefix: string;
    reset_numbering_yearly: boolean;
    current_entry_number: number;
    supported_currencies?: string[];
    default_sales_currency?: string;
    default_purchase_currency?: string;
    default_international_purchase_currency?: string;
}

export function useAccountingSettings() {
    const { company } = useCompany();
    const [settings, setSettings] = useState<CompanyAccountingSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const fetchedRef = useRef(false);

    const fetchSettings = useCallback(async (force = false) => {
        if ((!company?.id || fetchedRef.current) && !force) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('company_accounting_settings')
                .select('*')
                .eq('company_id', company?.id)
                .single();

            if (error) throw error;
            setSettings(data);
            fetchedRef.current = true;
        } catch (err: any) {
            console.error('Error fetching accounting settings:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [company?.id]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return {
        settings,
        loading,
        error,
        refetch: () => fetchSettings(true),
        // Helper properties for cleaner access
        vatRate: settings?.vat_rate ?? 0,
        isVatEnabled: settings?.vat_enabled ?? false,
        baseCurrency: settings?.base_currency || '',
        decimalPlaces: settings?.decimal_places ?? 2,
        dateFormat: settings?.date_format || 'DD/MM/YYYY',
        autoPost: settings?.auto_post_entries ?? false,
        requireApproval: settings?.require_approval ?? true,
        entryPrefix: settings?.journal_entry_prefix || 'JE',
        defaultSalesCurrency: settings?.default_sales_currency || settings?.base_currency || '',
        defaultPurchaseCurrency: settings?.default_purchase_currency || settings?.base_currency || '',
        defaultIntlPurchaseCurrency: settings?.default_international_purchase_currency || '',
        supportedCurrencies: settings?.supported_currencies || (settings?.base_currency ? [settings.base_currency] : []),
        defaultReceivableAccountId: settings?.default_receivable_account_id,
        defaultPayableAccountId: settings?.default_payable_account_id
    };
}
