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

let ratesCachePromise: Promise<ExchangeRate[]> | null = null;
let ratesCacheCompanyId: string | null = null;
let ratesCacheData: ExchangeRate[] | null = null;
let ratesCacheTime = 0;

export const ExchangeRatesService = {
    /**
     * Get all active exchange rates for a company
     * Uses a singleton promise to prevent parallel identical DB fetches
     */
    async getRates(companyId: string, force = false): Promise<ExchangeRate[]> {
        if (!companyId) return [];
        
        const now = Date.now();
        // Return existing data if cache is fresh (within 5 minutes)
        // ⚠️ Empty cache is NOT valid — always re-fetch if we got 0 rates
        if (!force && ratesCacheData && ratesCacheData.length > 0 && ratesCacheCompanyId === companyId && (now - ratesCacheTime < 5 * 60 * 1000)) {
            return ratesCacheData;
        }
        
        // If a request is already in flight, return the same promise
        if (!force && ratesCachePromise && ratesCacheCompanyId === companyId) {
            return ratesCachePromise;
        }

        ratesCacheCompanyId = companyId;
        ratesCachePromise = (async () => {
            try {
                const { data, error } = await supabase
                    .from('exchange_rates')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('is_active', true)
                    .order('effective_from', { ascending: false });
                
                if (error) throw error;
                ratesCacheData = data || [];
                ratesCacheTime = Date.now();
                return ratesCacheData;
            } catch (err) {
                console.error('[ExchangeRatesService] Error fetching rates:', err);
                return [];
            }
        })();

        return ratesCachePromise;
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

        // Rates are sorted by effective_from DESC — first match is the latest
        rates.forEach(rate => {
            const directKey = `${rate.from_currency}-${rate.to_currency}`;
            const inverseKey = `${rate.to_currency}-${rate.from_currency}`;
            
            // Direct key
            if (!ratesMap[directKey]) { 
                ratesMap[directKey] = rate.buy_rate || rate.mid_rate;
            }
            
            // Inverse key
            if (!ratesMap[inverseKey]) {
                const invRate = rate.sell_rate || rate.buy_rate || rate.mid_rate;
                if (invRate && invRate > 0) {
                    ratesMap[inverseKey] = 1 / invRate;
                }
            }
        });

        return ratesMap;
    }
};
