/**
 * ════════════════════════════════════════════════════════════════
 * 🌐 Exchange Rate Online Service
 * ════════════════════════════════════════════════════════════════
 * 
 * Fetches live exchange rates from ExchangeRate-API (free, no key).
 * Caches rates in localStorage for 1 hour.
 * Provides fallback to last cached rates if API is unreachable.
 * 
 * API: https://open.er-api.com/v6/latest/{BASE}
 * - 161 currencies
 * - Daily updates
 * - Free, no API key required
 * 
 * @module services/data/ExchangeRateOnlineService
 */

// ─── Types ─────────────────────────────────────────────────────
export interface OnlineRatesResponse {
    result: string;
    provider: string;
    documentation: string;
    terms_of_use: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    time_eol_unix: number;
    base_code: string;
    rates: Record<string, number>;
}

export interface CachedOnlineRates {
    baseCurrency: string;
    rates: Record<string, number>;
    fetchedAt: number; // timestamp
    lastUpdateUTC: string;
    nextUpdateUTC: string;
}

// ─── Constants ─────────────────────────────────────────────────
const API_BASE_URL = 'https://open.er-api.com/v6/latest';
const CACHE_KEY_PREFIX = 'texacore_online_rates_';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// ─── Service ───────────────────────────────────────────────────
export const ExchangeRateOnlineService = {

    /**
     * Fetch live rates for a base currency
     * Returns cached data if fresh enough, otherwise fetches from API
     */
    async fetchRates(baseCurrency: string): Promise<CachedOnlineRates | null> {
        const cacheKey = CACHE_KEY_PREFIX + baseCurrency.toUpperCase();

        // Check cache first
        const cached = this.getCachedRates(baseCurrency);
        if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
            return cached;
        }

        // Fetch from API
        try {
            const response = await fetch(`${API_BASE_URL}/${baseCurrency.toUpperCase()}`);

            if (!response.ok) {
                console.warn(`[ExchangeRateOnline] API returned ${response.status}`);
                return cached || null; // Return stale cache as fallback
            }

            const data: OnlineRatesResponse = await response.json();

            if (data.result !== 'success') {
                console.warn('[ExchangeRateOnline] API returned non-success result:', data.result);
                return cached || null;
            }

            const cachedData: CachedOnlineRates = {
                baseCurrency: data.base_code,
                rates: data.rates,
                fetchedAt: Date.now(),
                lastUpdateUTC: data.time_last_update_utc,
                nextUpdateUTC: data.time_next_update_utc,
            };

            // Save to cache
            try {
                localStorage.setItem(cacheKey, JSON.stringify(cachedData));
            } catch {
                // localStorage might be full — ignore
            }

            return cachedData;
        } catch (err) {
            console.warn('[ExchangeRateOnline] Failed to fetch rates:', err);
            return cached || null; // Return stale cache as fallback
        }
    },

    /**
     * Get cached rates (even if stale)
     */
    getCachedRates(baseCurrency: string): CachedOnlineRates | null {
        try {
            const cacheKey = CACHE_KEY_PREFIX + baseCurrency.toUpperCase();
            const raw = localStorage.getItem(cacheKey);
            if (!raw) return null;
            return JSON.parse(raw) as CachedOnlineRates;
        } catch {
            return null;
        }
    },

    /**
     * Get the online rate between two currencies
     * Uses the base currency rates to calculate cross rates
     */
    async getRate(
        fromCurrency: string,
        toCurrency: string,
        baseCurrency: string = 'USD'
    ): Promise<number | null> {
        if (fromCurrency === toCurrency) return 1;

        const rates = await this.fetchRates(baseCurrency);
        if (!rates || !rates.rates) return null;

        const fromRate = rates.rates[fromCurrency.toUpperCase()];
        const toRate = rates.rates[toCurrency.toUpperCase()];

        if (!fromRate || !toRate) return null;

        // Cross rate: 1 fromCurrency = (toRate / fromRate) toCurrency
        return toRate / fromRate;
    },

    /**
     * Get rates between a specific currency and all other currencies
     * Returns: { 'EUR': 0.92, 'UAH': 41.35, ... } (1 baseCurrency = X other)
     */
    async getRatesForCurrency(
        currency: string
    ): Promise<Record<string, number> | null> {
        // Fetch with the target currency as base for direct rates
        const rates = await this.fetchRates(currency);
        if (!rates || !rates.rates) return null;
        return rates.rates;
    },

    /**
     * Get rates matrix between all supported currencies
     * Returns: { 'USD': { 'EUR': 0.92, ... }, 'EUR': { 'USD': 1.08, ... } }
     */
    async getRatesMatrix(
        supportedCurrencies: string[],
        baseCurrency: string = 'USD'
    ): Promise<Record<string, Record<string, number>>> {
        const rates = await this.fetchRates(baseCurrency);
        if (!rates || !rates.rates) return {};

        const matrix: Record<string, Record<string, number>> = {};

        for (const from of supportedCurrencies) {
            matrix[from] = {};
            const fromRate = rates.rates[from.toUpperCase()];
            if (!fromRate) continue;

            for (const to of supportedCurrencies) {
                if (from === to) {
                    matrix[from][to] = 1;
                    continue;
                }
                const toRate = rates.rates[to.toUpperCase()];
                if (!toRate) continue;
                matrix[from][to] = toRate / fromRate;
            }
        }

        return matrix;
    },

    /**
     * Check if rates are fresh (within cache duration)
     */
    isCacheFresh(baseCurrency: string): boolean {
        const cached = this.getCachedRates(baseCurrency);
        if (!cached) return false;
        return Date.now() - cached.fetchedAt < CACHE_DURATION_MS;
    },

    /**
     * Get time since last fetch (human readable)
     */
    getTimeSinceLastFetch(baseCurrency: string, isAr: boolean = true): string {
        const cached = this.getCachedRates(baseCurrency);
        if (!cached) return isAr ? 'لم يتم الجلب بعد' : 'Not fetched yet';

        const diffMs = Date.now() - cached.fetchedAt;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMin < 1) return isAr ? 'الآن' : 'Just now';
        if (diffMin < 60) return isAr ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
        if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
        return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    },

    /**
     * Clear all cached rates
     */
    clearCache(): void {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    },
};
