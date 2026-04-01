/**
 * ════════════════════════════════════════════════════════════════
 * 💰 Sales Module — تعريف بيانات المبيعات لـ DataEngine
 * ════════════════════════════════════════════════════════════════
 *
 * يُعرّف كل الـ queries الخاصة بقسم المبيعات.
 * QueryKeys يجب أن تتطابق تماماً مع ما تستخدمه الصفحات.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import type { DataModule } from '../DataEngine';
import { CACHE_TIMES } from '../DataEngine';

export const salesModule: DataModule = {
  code: 'sales',
  label: { ar: 'المبيعات', en: 'Sales' },
  queries: [
    // ─── 1. Customers List ───────────────────────────────────
    {
      queryKey: ['customers_list', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 2. Customers Map (id → name) ───────────────────────
    {
      queryKey: ['customers_map', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name_ar, name_en')
          .eq('company_id', companyId);
        if (error) return {};
        return (data || []).reduce((acc: any, curr: any) => {
          acc[curr.id] = curr.name_ar || curr.name_en;
          return acc;
        }, {});
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 3. Sales Transactions (recent — preload) ───────────
    {
      queryKey: ['sales_cycle_full', null, undefined, undefined],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('sales_transactions')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // NOTE: sales_transactions_list removed — identical to sales_cycle_full above.
    // SalesInvoicesList uses date filters that don't match DataEngine's prefetch.


    // ─── 5. Customer Sales Stats ────────────────────────────
    {
      queryKey: ['customers_sales_stats', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('sales_transactions')
          .select('customer_id, total_amount, stage')
          .eq('company_id', companyId);

        const stats: Record<string, { invoiceCount: number; totalAmount: number; unpaid: number }> = {};
        const COUNTABLE = ['posted', 'delivered', 'paid', 'partially_paid', 'completed'];
        (data || []).forEach((tx: any) => {
          if (!tx.customer_id || !COUNTABLE.includes(tx.stage)) return;
          if (!stats[tx.customer_id]) stats[tx.customer_id] = { invoiceCount: 0, totalAmount: 0, unpaid: 0 };
          stats[tx.customer_id].invoiceCount++;
          stats[tx.customer_id].totalAmount += Number(tx.total_amount || 0);
          if (!['paid', 'completed'].includes(tx.stage)) {
            stats[tx.customer_id].unpaid += Number(tx.total_amount || 0);
          }
        });
        return stats;
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 6. Exchange Rates (shared) ─────────────────────────
    {
      queryKey: ['exchange_rates', null],
      queryFn: async (companyId: string) => {
        // Use company_id to get tenant_id first, then rates
        const { data: company } = await supabase
          .from('companies')
          .select('tenant_id')
          .eq('id', companyId)
          .single();

        if (!company?.tenant_id) return {};

        const { data, error } = await supabase
          .from('exchange_rates')
          .select('from_currency, to_currency, mid_rate')
          .eq('tenant_id', company.tenant_id)
          .eq('is_active', true);

        if (error || !data) return {};

        const rateMap: Record<string, number> = {};
        data.forEach((r: any) => {
          rateMap[`${r.from_currency}->${r.to_currency}`] = Number(r.mid_rate);
        });
        return rateMap;
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },
  ],
};

/**
 * Patch query keys: replace `null` with actual companyId
 */
export function resolveSalesQueries(companyId: string): DataModule {
  return {
    ...salesModule,
    queries: salesModule.queries.map(q => ({
      ...q,
      queryKey: q.queryKey.map(k => k === null ? companyId : k),
    })),
  };
}
