/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 useExchangeRateLookup
 * هوك لجلب سعر الصرف تلقائياً عند تغيير العملة
 * يُستخدم في القيود المحاسبية والفواتير والسندات
 * 
 * ✨ يدعم:
 *    1. جلب من DB (exchange_rates table) — الأولوية الأولى
 *    2. Online API fallback (ExchangeRateOnlineService) — عند عدم وجود سعر
 *    3. Cross-Rate Calculation — EUR→UAH عبر USD
 *    4. Sync + Async lookup — lookupRate (sync) + lookupRateAsync (async with online fallback)
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { ExchangeRatesService, ExchangeRate } from '@/services/data/ExchangeRatesService';
import { ExchangeRateOnlineService } from '@/services/data/ExchangeRateOnlineService';

export interface ExchangeRateLookupReturn {
    /** Look up exchange rate for a given currency pair (sync — DB only) */
    lookupRate: (fromCurrency: string, toCurrency?: string) => number;
    /** Look up exchange rate with online API fallback (async — DB + API) */
    lookupRateAsync: (fromCurrency: string, toCurrency?: string) => Promise<number>;
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
let _loadingRatesPromise: Promise<ExchangeRate[]> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Online rates in-memory cache (populated by async lookups) ──
// TTL + size-limited to prevent memory leak in long sessions
const _onlineRatesCache: Record<string, { rate: number; timestamp: number }> = {};
const ONLINE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ONLINE_CACHE_MAX_SIZE = 100;

function _getOnlineRate(key: string): number | null {
    const entry = _onlineRatesCache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ONLINE_CACHE_TTL_MS) {
        delete _onlineRatesCache[key];
        return null;
    }
    return entry.rate;
}

function _setOnlineRate(key: string, rate: number): void {
    // Evict oldest entries if cache is full
    const keys = Object.keys(_onlineRatesCache);
    if (keys.length >= ONLINE_CACHE_MAX_SIZE) {
        let oldestKey = keys[0];
        let oldestTime = _onlineRatesCache[keys[0]].timestamp;
        for (const k of keys) {
            if (_onlineRatesCache[k].timestamp < oldestTime) {
                oldestTime = _onlineRatesCache[k].timestamp;
                oldestKey = k;
            }
        }
        delete _onlineRatesCache[oldestKey];
    }
    _onlineRatesCache[key] = { rate, timestamp: Date.now() };
}

// ── Warn-once tracker (prevents console spam on repeated lookups) ──
const _warnedPairs = new Set<string>();
let _warnedCompanyId: string | null = null;

/**
 * Read company_id from localStorage Supabase auth token — no network needed!
 */
function _getCompanyIdFromLocalStorage(): string | null {
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

export function preloadExchangeRates(companyId: string, force = false): void {
    if (!companyId) return;
    const now = Date.now();
    if (!force && _cachedRates.length > 0 && _cachedCompanyId === companyId && (now - _cacheTimestamp < CACHE_TTL_MS)) return;
    if (!force && _loadingRatesPromise && _cachedCompanyId === companyId && _cachedRates.length > 0) return;

    _cachedCompanyId = companyId;
    _loadingRatesPromise = ExchangeRatesService.getRates(companyId).then(data => {
        _cachedRates = data || [];
        _cacheTimestamp = Date.now();
        _loadingRatesPromise = null;
        return _cachedRates;
    }).catch(() => {
        _loadingRatesPromise = null;
        return [];
    });
}

// ─── AUTO-PRELOAD at module import time ─────────────────────────────────────
// ⚠️ Only preload if the stored session is still valid (not expired).
// Without this check, a stale sb-*-auth-token with an old company_id
// triggers 406 errors on every page load (including the login page).
(() => {
    const cachedCid = _getCompanyIdFromLocalStorage();
    if (cachedCid) {
        // Verify session token is not expired before preloading
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const parsed = JSON.parse(raw);
                    const expiresAt = parsed?.expires_at;
                    if (expiresAt && expiresAt * 1000 < Date.now()) {
                        return; // Session expired — skip preload
                    }
                }
            }
        } catch { /* ignore */ }
        preloadExchangeRates(cachedCid);
    }
})();
// ─────────────────────────────────────────────────────────────────────────────

export function useExchangeRateLookup(): ExchangeRateLookupReturn {
    const { companyId } = useCompany();
    const { currencyCode: defaultCurrency } = useCompanyCurrency();
    const { baseCurrency: accBaseCurrency } = useAccountingSettings();
    const baseCurrency = accBaseCurrency || defaultCurrency;
    const [rates, setRates] = useState<ExchangeRate[]>(_cachedRates);
    const [isLoading, setIsLoading] = useState(_cachedRates.length === 0 || _loadingRatesPromise !== null);
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
            setIsLoading(false);
            return;
        }

        // If there's a preload already in flight, wait for it
        if (_loadingRatesPromise && _cachedCompanyId === companyId) {
            setIsLoading(true);
            _loadingRatesPromise.then(data => {
                setRates(data);
                setIsLoading(false);
            });
            return;
        }

        // Otherwise start a fresh fetch
        setIsLoading(true);
        try {
            const data = await ExchangeRatesService.getRates(companyId);
            _cachedRates = data;
            _cachedCompanyId = companyId;
            _cacheTimestamp = Date.now();
            setRates(data);
        } catch (err) {
            console.error('Failed to fetch exchange rates:', err);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (!companyId) return;
        // Clear warn-once tracker when company changes
        if (_warnedCompanyId !== companyId) {
            _warnedPairs.clear();
            _warnedCompanyId = companyId;
        }
        // Trigger preload for this company (no-op if already loading/cached)
        preloadExchangeRates(companyId);
        if (!fetchedRef.current) {
            fetchRates();
            fetchedRef.current = true;
        }
    }, [companyId, fetchRates]);

    // ─── Core lookup logic (shared between sync and async) ───
    const lookupFromDB = useCallback((fromCurrency: string, toCurrency: string, currentRates: ExchangeRate[] = rates): number | null => {
        // Collect direct and inverse matches
        const directMatches = currentRates.filter(
            r => r.from_currency === fromCurrency && r.to_currency === toCurrency && r.is_active
        );
        const inverseMatches = currentRates.filter(
            r => r.from_currency === toCurrency && r.to_currency === fromCurrency && r.is_active
        );

        // Find the absolute latest record across both direct and inverse
        let latestRecord: ExchangeRate | null = null;
        let isInverse = false;

        const allMatches = [
            ...directMatches.map(r => ({ record: r, inverse: false })),
            ...inverseMatches.map(r => ({ record: r, inverse: true }))
        ];

        if (allMatches.length > 0) {
            // Sort to get the most recent one
            allMatches.sort((a, b) => new Date(b.record.effective_from).getTime() - new Date(a.record.effective_from).getTime());
            
            latestRecord = allMatches[0].record;
            isInverse = allMatches[0].inverse;
        }

        if (latestRecord) {
            if (!isInverse) {
                return latestRecord.buy_rate || latestRecord.mid_rate;
            } else {
                const rate = latestRecord.sell_rate || latestRecord.buy_rate || latestRecord.mid_rate;
                return rate > 0 ? 1 / rate : null;
            }
        }

        // 3) Cross via base currency (e.g., EUR→UAH via EUR→USD + USD→UAH)
        if (fromCurrency !== baseCurrency && toCurrency !== baseCurrency) {
            // Find rate from fromCurrency to Base
            const fromBaseMatches = [
                ...currentRates.filter(r => r.from_currency === fromCurrency && r.to_currency === baseCurrency && r.is_active).map(r => ({ r, inv: false })),
                ...currentRates.filter(r => r.from_currency === baseCurrency && r.to_currency === fromCurrency && r.is_active).map(r => ({ r, inv: true }))
            ];
            fromBaseMatches.sort((a, b) => new Date(b.r.effective_from).getTime() - new Date(a.r.effective_from).getTime());
            
            // Find rate from target to Base
            const toBaseMatches = [
                ...currentRates.filter(r => r.from_currency === baseCurrency && r.to_currency === toCurrency && r.is_active).map(r => ({ r, inv: false })),
                ...currentRates.filter(r => r.from_currency === toCurrency && r.to_currency === baseCurrency && r.is_active).map(r => ({ r, inv: true }))
            ];
            toBaseMatches.sort((a, b) => new Date(b.r.effective_from).getTime() - new Date(a.r.effective_from).getTime());

            if (fromBaseMatches.length > 0 && toBaseMatches.length > 0) {
                const rFrom = fromBaseMatches[0];
                const rToBase = toBaseMatches[0];

                const rate1 = rFrom.inv 
                    ? (rFrom.r.sell_rate || rFrom.r.buy_rate || rFrom.r.mid_rate > 0 ? 1 / (rFrom.r.sell_rate || rFrom.r.buy_rate || rFrom.r.mid_rate) : 0)
                    : (rFrom.r.buy_rate || rFrom.r.mid_rate);
                    
                const rate2 = rToBase.inv
                    ? (rToBase.r.sell_rate || rToBase.r.buy_rate || rToBase.r.mid_rate > 0 ? 1 / (rToBase.r.sell_rate || rToBase.r.buy_rate || rToBase.r.mid_rate) : 0)
                    : (rToBase.r.buy_rate || rToBase.r.mid_rate);

                if (rate1 > 0 && rate2 > 0) return rate1 * rate2;
            }
        }

        return null; // Not found in DB
    }, [rates, baseCurrency]);

    const lookupRate = useCallback((fromCurrency: string, toCurrency?: string): number => {
        const to = toCurrency || baseCurrency;

        // Same currency = 1
        if (!fromCurrency || !to || fromCurrency === to) return 1;

        // Try DB first
        const dbRate = lookupFromDB(fromCurrency, to);
        if (dbRate !== null && dbRate > 0) {
            return dbRate;
        }

        // Check in-memory online cache (populated by lookupRateAsync)
        const onlineKey = `${fromCurrency}->${to}`;
        const cachedOnline = _getOnlineRate(onlineKey);
        if (cachedOnline !== null) return cachedOnline;

        // Check inverse in online cache
        const inverseKey = `${to}->${fromCurrency}`;
        const cachedInverse = _getOnlineRate(inverseKey);
        if (cachedInverse !== null && cachedInverse > 0) {
            return 1 / cachedInverse;
        }

        // No rate found — return 1 (warn once per pair to avoid console spam)
        const warnKey = `${fromCurrency}->${to}`;
        if (!_warnedPairs.has(warnKey)) {
            _warnedPairs.add(warnKey);
            // Only show in dev mode to keep production console clean
            if (import.meta.env.DEV) {
                console.debug(`[lookupRate] No rate found for ${fromCurrency}→${to}. rates.length=${rates.length}, baseCurrency=${baseCurrency}`);
            }
        }
        return 1;
    }, [lookupFromDB, baseCurrency]);

    // ─── Async Lookup: DB + Online API fallback ───
    const lookupRateAsync = useCallback(async (fromCurrency: string, toCurrency?: string): Promise<number> => {
        const to = toCurrency || baseCurrency;

        // Same currency = 1
        if (!fromCurrency || !to || fromCurrency === to) return 1;

        let currentRates = rates;

        // If rates haven't loaded yet, try to fetch them quickly so we don't fall back to Online API unnecessarily
        if (currentRates.length === 0 && companyId) {
            try {
                currentRates = await ExchangeRatesService.getRates(companyId);
                _cachedRates = currentRates;
                _cachedCompanyId = companyId;
                _cacheTimestamp = Date.now();
                setRates(currentRates);
            } catch (err) {
                console.warn('[ExchangeRateLookup] Fast fetch failed, continuing with empty DB rates.', err);
            }
        }

        // 1) Try DB first (using fresh rates if we just fetched them)
        const dbRate = lookupFromDB(fromCurrency, to, currentRates);
        if (dbRate !== null && dbRate > 0) return dbRate;

        // 2) Check online cache
        const onlineKey = `${fromCurrency}->${to}`;
        const cachedOnlineAsync = _getOnlineRate(onlineKey);
        if (cachedOnlineAsync !== null) return cachedOnlineAsync;

        // 3) Fetch from Online API
        if (import.meta.env.DEV) console.debug(`[ExchangeRateLookup] 🌐 No DB rate for ${fromCurrency}→${to}, fetching from online API...`);
        try {
            // Use USD as intermediary base for cross-rate calculation
            const onlineRate = await ExchangeRateOnlineService.getRate(fromCurrency, to, 'USD');
            if (onlineRate && onlineRate > 0) {
                // Cache for future sync lookups (with TTL)
                _setOnlineRate(onlineKey, onlineRate);
                if (import.meta.env.DEV) console.debug(`[ExchangeRateLookup] ✅ Online rate: 1 ${fromCurrency} = ${onlineRate.toFixed(4)} ${to}`);
                return onlineRate;
            }
        } catch (err) {
            console.warn(`[ExchangeRateLookup] ⚠️ Online API fallback failed for ${fromCurrency}→${to}:`, err);
        }

        // 4) Last resort
        return 1;
    }, [lookupFromDB, baseCurrency, rates, companyId]);

    // ─── Detailed lookup: returns buy/sell/mid ───
    const lookupRateDetails = useCallback((fromCurrency: string, toCurrency?: string) => {
        const to = toCurrency || baseCurrency;
        if (!fromCurrency || !to || fromCurrency === to) return null;

        const allMatches = [
            ...rates.filter(r => r.from_currency === fromCurrency && r.to_currency === to && r.is_active).map(r => ({ record: r, inverse: false })),
            ...rates.filter(r => r.from_currency === to && r.to_currency === fromCurrency && r.is_active).map(r => ({ record: r, inverse: true }))
        ];

        if (allMatches.length > 0) {
            allMatches.sort((a, b) => new Date(b.record.effective_from).getTime() - new Date(a.record.effective_from).getTime());
            const best = allMatches[0];

            if (!best.inverse) {
                return {
                    rate: best.record.buy_rate || best.record.mid_rate,
                    buyRate: best.record.buy_rate,
                    sellRate: best.record.sell_rate,
                    source: best.record.source,
                };
            } else {
                const mid = best.record.buy_rate || best.record.mid_rate;
                return {
                    rate: mid > 0 ? 1 / mid : 1,
                    buyRate: best.record.sell_rate > 0 ? 1 / best.record.sell_rate : 1,
                    sellRate: best.record.buy_rate > 0 ? 1 / best.record.buy_rate : 1,
                    source: best.record.source + ' (inverted)',
                };
            }
        }

        // Check online cache for details
        const onlineKey = `${fromCurrency}->${to}`;
        const cachedDetail = _getOnlineRate(onlineKey);
        if (cachedDetail !== null) {
            return {
                rate: cachedDetail,
                buyRate: cachedDetail,
                sellRate: cachedDetail,
                source: 'online (ExchangeRate-API)',
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
        lookupRateAsync,
        lookupRateDetails,
        isLoading,
        rates,
        refreshRates,
    };
}
