import { supabase } from '@/lib/supabase';

export interface ExchangeRate {
    id: string;
    tenant_id: string;
    company_id: string;
    from_currency: string;
    to_currency: string;
    buy_rate: number;
    sell_rate: number;
    mid_rate: number;
    margin_percent: number;
    effective_from: string;
    effective_to?: string;
    source: string;
    is_active: boolean;
    created_at: string;
    created_by?: string;
}

export type CreateExchangeRate = Omit<ExchangeRate, 'id' | 'created_at' | 'mid_rate'>;

export const ExchangeRatesService = {
    /**
     * Get all active exchange rates for a company
     */
    async getRates(companyId: string): Promise<ExchangeRate[]> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('from_currency', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Add a new exchange rate
     */
    async addRate(rate: CreateExchangeRate): Promise<ExchangeRate> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .insert(rate)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing exchange rate
     */
    async updateRate(id: string, updates: Partial<ExchangeRate>): Promise<ExchangeRate> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete (deactivate) an exchange rate
     */
    async deleteRate(id: string): Promise<void> {
        const { error } = await supabase
            .from('exchange_rates')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Convert an amount from one currency to another using the latest rates
     */
    async convertCurrency(
        amount: number,
        fromCurrency: string,
        toCurrency: string,
        companyId: string,
        date: Date = new Date()
    ): Promise<number> {
        if (fromCurrency === toCurrency) return amount;

        // Call the database function for accurate historical conversion
        const { data, error } = await supabase
            .rpc('convert_currency', {
                p_amount: amount,
                p_from_currency: fromCurrency,
                p_to_currency: toCurrency,
                p_company_id: companyId,
                p_date: date.toISOString()
            });

        if (error) {
            console.warn(`Conversion failed for ${fromCurrency} to ${toCurrency}:`, error);
            // Fallback: If DB function fails (e.g. rate missing), try to find a rate client-side or return original
            // For now, we'll return the original amount to avoid crashing the UI, but log the error
            return amount;
        }

        return data;
    },

    /**
     * Bulk convert amounts (client-side optimization for lists)
     * This fetches all rates once and performs conversions in memory
     */
    async getExchangeRatesMap(companyId: string): Promise<Record<string, number>> {
        const rates = await this.getRates(companyId);
        const ratesMap: Record<string, number> = {};

        rates.forEach(rate => {
            // Create a key like "USD-SAR"
            ratesMap[`${rate.from_currency}-${rate.to_currency}`] = rate.mid_rate || rate.buy_rate;
        });

        return ratesMap;
    }
};
