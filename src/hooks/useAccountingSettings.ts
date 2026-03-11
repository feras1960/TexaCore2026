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

let cachedSettingsData: CompanyAccountingSettings | null = null;
let cachedSettingsCompanyId: string | null = null;
let settingsPromise: Promise<CompanyAccountingSettings | null> | null = null;

export function useAccountingSettings() {
    const { company } = useCompany();
    const [settings, setSettings] = useState<CompanyAccountingSettings | null>(cachedSettingsCompanyId === company?.id ? cachedSettingsData : null);
    const [loading, setLoading] = useState(!cachedSettingsData || cachedSettingsCompanyId !== company?.id);
    const [error, setError] = useState<Error | null>(null);

    const fetchSettings = useCallback(async (force = false) => {
        const companyId = company?.id;
        if (!companyId) return;

        // Return cache if valid
        if (!force && cachedSettingsData && cachedSettingsCompanyId === companyId) {
            setSettings(cachedSettingsData);
            setLoading(false);
            return;
        }

        // Wait for existing promise if one is already fetching for this company
        if (!force && settingsPromise && cachedSettingsCompanyId === companyId) {
            setLoading(true);
            try {
                const data = await settingsPromise;
                setSettings(data);
            } catch (err: any) {
                setError(err);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        cachedSettingsCompanyId = companyId;
        
        settingsPromise = (async () => {
            try {
                const { data, error } = await supabase
                    .from('company_accounting_settings')
                    .select('*')
                    .eq('company_id', companyId)
                    .single();

                if (error) throw error;
                cachedSettingsData = data;
                return data;
            } catch (err: any) {
                console.error('[useAccountingSettings] Error fetching:', err);
                throw err;
            }
        })();

        try {
            const data = await settingsPromise;
            setSettings(data);
        } catch (err: any) {
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

export async function fetchAccountingSettingsSingleton(companyId: string, force = false): Promise<CompanyAccountingSettings | null> {
    if (!companyId) return null;

    if (!force && cachedSettingsData && cachedSettingsCompanyId === companyId) {
        return cachedSettingsData;
    }

    if (!force && settingsPromise && cachedSettingsCompanyId === companyId) {
        return settingsPromise;
    }

    cachedSettingsCompanyId = companyId;
    settingsPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('company_accounting_settings')
                .select('*')
                .eq('company_id', companyId)
                .single();

            if (error) throw error;
            cachedSettingsData = data;
            return data;
        } catch (err: any) {
            console.error('[fetchAccountingSettingsSingleton] Error:', err);
            return null;
        }
    })();

    return settingsPromise;
}
