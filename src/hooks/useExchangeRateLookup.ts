/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 useExchangeRateLookup
 * هوك لجلب سعر الصرف تلقائياً عند تغيير العملة
 * يُستخدم في القيود المحاسبية والفواتير والسندات
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { ExchangeRatesService, ExchangeRate } from '@/services/data/ExchangeRatesService';

export interface ExchangeRateLookupReturn {
    /** Look up exchange rate for a given currency pair */
    lookupRate: (fromCurrency: string, toCurrency?: string) => number;
    /** Get the full rate object (buy/sell/mid) */
    lookupRateDetails: (fromCurrency: string, toCurrency?: string) => {
        rate: number;
        buyRate: number;
        sellRate: number;
        source: string;
    } | null;
    /** Whether rates are currently loading */
    isLoading: boolean;
    /** All loaded rates */
    rates: ExchangeRate[];
    /** Force refresh rates from DB */
    refreshRates: () => Promise<void>;
}

// ── Module-level cache to avoid re-fetching across components ──
let _cachedRates: ExchangeRate[] = [];
let _cachedCompanyId: string | null = null;
let _cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useExchangeRateLookup(): ExchangeRateLookupReturn {
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency } = useCompanyCurrency();
    const [rates, setRates] = useState<ExchangeRate[]>(_cachedRates);
    const [isLoading, setIsLoading] = useState(false);
    const fetchedRef = useRef(false);

    // ─── Fetch rates on mount or company change ───
    const fetchRates = useCallback(async () => {
        if (!companyId) return;

        // Check cache validity
        const now = Date.now();
        if (
            _cachedCompanyId === companyId &&
            _cachedRates.length > 0 &&
            now - _cacheTimestamp < CACHE_TTL_MS
        ) {
            setRates(_cachedRates);
            return;
        }

        setIsLoading(true);
        try {
            const data = await ExchangeRatesService.getRates(companyId);
            _cachedRates = data;
            _cachedCompanyId = companyId;
            _cacheTimestamp = now;
            setRates(data);
        } catch (err) {
            console.error('Failed to fetch exchange rates:', err);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (!fetchedRef.current) {
            fetchRates();
            fetchedRef.current = true;
        }
    }, [fetchRates]);

    // ─── Lookup: find best rate for a currency pair ───
    const lookupRate = useCallback((fromCurrency: string, toCurrency?: string): number => {
        const to = toCurrency || baseCurrency;

        // Same currency = 1
        if (!fromCurrency || !to || fromCurrency === to) return 1;

        // 1) Direct match: fromCurrency → toCurrency
        const direct = rates.find(
            r => r.from_currency === fromCurrency && r.to_currency === to && r.is_active
        );
        if (direct) return direct.mid_rate || direct.buy_rate;

        // 2) Inverse match: toCurrency → fromCurrency (invert the rate)
        const inverse = rates.find(
            r => r.from_currency === to && r.to_currency === fromCurrency && r.is_active
        );
        if (inverse) {
            const rate = inverse.mid_rate || inverse.sell_rate || inverse.buy_rate;
            return rate > 0 ? 1 / rate : 1;
        }

        // 3) Cross via base currency (e.g., EUR→UAH via EUR→USD + USD→UAH)
        if (fromCurrency !== baseCurrency && to !== baseCurrency) {
            const fromToBase = rates.find(
                r => r.from_currency === fromCurrency && r.to_currency === baseCurrency && r.is_active
            );
            const baseToTarget = rates.find(
                r => r.from_currency === baseCurrency && r.to_currency === to && r.is_active
            );

            if (fromToBase && baseToTarget) {
                const r1 = fromToBase.mid_rate || fromToBase.buy_rate;
                const r2 = baseToTarget.mid_rate || baseToTarget.buy_rate;
                return r1 * r2;
            }

            // Try inverted paths
            const baseFromSource = rates.find(
                r => r.from_currency === baseCurrency && r.to_currency === fromCurrency && r.is_active
            );
            if (baseFromSource && baseToTarget) {
                const r1 = baseFromSource.mid_rate || baseFromSource.buy_rate;
                const r2 = baseToTarget.mid_rate || baseToTarget.buy_rate;
                return r1 > 0 ? (1 / r1) * r2 : 1;
            }
        }

        // No rate found — return 1 (same currency treatment)
        return 1;
    }, [rates, baseCurrency]);

    // ─── Detailed lookup: returns buy/sell/mid ───
    const lookupRateDetails = useCallback((fromCurrency: string, toCurrency?: string) => {
        const to = toCurrency || baseCurrency;
        if (!fromCurrency || !to || fromCurrency === to) return null;

        const direct = rates.find(
            r => r.from_currency === fromCurrency && r.to_currency === to && r.is_active
        );
        if (direct) {
            return {
                rate: direct.mid_rate || direct.buy_rate,
                buyRate: direct.buy_rate,
                sellRate: direct.sell_rate,
                source: direct.source,
            };
        }

        const inverse = rates.find(
            r => r.from_currency === to && r.to_currency === fromCurrency && r.is_active
        );
        if (inverse) {
            const mid = inverse.mid_rate || inverse.buy_rate;
            return {
                rate: mid > 0 ? 1 / mid : 1,
                buyRate: inverse.sell_rate > 0 ? 1 / inverse.sell_rate : 1,
                sellRate: inverse.buy_rate > 0 ? 1 / inverse.buy_rate : 1,
                source: inverse.source + ' (inverted)',
            };
        }

        return null;
    }, [rates, baseCurrency]);

    // ─── Force refresh ───
    const refreshRates = useCallback(async () => {
        _cacheTimestamp = 0; // Invalidate cache
        fetchedRef.current = false;
        await fetchRates();
    }, [fetchRates]);

    return {
        lookupRate,
        lookupRateDetails,
        isLoading,
        rates,
        refreshRates,
    };
}
