/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Ticker KPIs Service
 * ════════════════════════════════════════════════════════════════
 * Fetches KPI data from the get_ticker_kpis RPC for the ticker bar.
 * Cached for 5 minutes to avoid excessive queries.
 */

import { supabase } from '@/lib/supabase';

export interface TickerKPIs {
  pending_sales_orders: number;
  today_sales_count: number;
  month_sales_total: number;
  unpaid_invoices: number;
  pending_purchases: number;
  total_materials: number;
  total_rolls: number;
  total_customers: number;
  total_suppliers: number;
}

let _cachedKPIs: TickerKPIs | null = null;
let _cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const TickerKPIsService = {

  async getKPIs(companyId: string, force = false): Promise<TickerKPIs | null> {
    // Check cache
    if (!force && _cachedKPIs && Date.now() - _cacheTimestamp < CACHE_DURATION) {
      return _cachedKPIs;
    }

    try {
      const { data, error } = await supabase.rpc('get_ticker_kpis', {
        p_tenant_id: companyId,
      });

      if (error) {
        console.warn('[TickerKPIs] RPC error:', error.message);
        return _cachedKPIs; // Return stale cache
      }

      _cachedKPIs = data as TickerKPIs;
      _cacheTimestamp = Date.now();
      return _cachedKPIs;
    } catch (err) {
      console.warn('[TickerKPIs] Error:', err);
      return _cachedKPIs;
    }
  },

  clearCache() {
    _cachedKPIs = null;
    _cacheTimestamp = 0;
  },
};
