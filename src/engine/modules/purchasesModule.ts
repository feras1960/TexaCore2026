/**
 * ════════════════════════════════════════════════════════════════
 * 🛒 Purchases Module — تعريف بيانات المشتريات لـ DataEngine
 * ════════════════════════════════════════════════════════════════
 *
 * يُعرّف كل الـ queries الخاصة بقسم المشتريات.
 * QueryKeys يجب أن تتطابق تماماً مع ما تستخدمه الصفحات.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import type { DataModule } from '../DataEngine';
import { CACHE_TIMES } from '../DataEngine';

export const purchasesModule: DataModule = {
  code: 'purchases',
  label: { ar: 'المشتريات', en: 'Purchases' },
  queries: [
    // ─── 1. Suppliers List ───────────────────────────────────
    {
      queryKey: ['suppliers_list', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 2. Suppliers Map (id → name) ───────────────────────
    {
      queryKey: ['suppliers_map', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name_ar, name_en, city')
          .eq('company_id', companyId);
        if (error) return {};
        return (data || []).reduce((acc: any, curr: any) => {
          acc[curr.id] = {
            name: curr.name_ar || curr.name_en,
            city: curr.city || ''
          };
          return acc;
        }, {});
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 3. Purchase Transactions (recent — fast initial load) ─
    {
      queryKey: ['purchase_transactions_recent', null],
      queryFn: async (companyId: string) => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('purchase_transactions')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .gte('created_at', twoDaysAgo.toISOString())
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // NOTE: purchase_transactions_full removed — it duplicated purchase_cycle_full (entry #8)
    // and PurchaseInvoicesList uses date filters that don't match DataEngine's prefetch.


    // ─── 5. Containers List ─────────────────────────────────
    {
      queryKey: ['containers_list', null],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('containers')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 6. Supplier Purchase Stats ─────────────────────────
    {
      queryKey: ['suppliers_purchase_stats', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('purchase_transactions')
          .select('supplier_id, total_amount, stage')
          .eq('company_id', companyId);

        const stats: Record<string, { invoiceCount: number; totalAmount: number; unpaid: number }> = {};
        const COUNTABLE = ['posted', 'received', 'paid', 'partially_paid', 'completed'];
        (data || []).forEach((tx: any) => {
          if (!tx.supplier_id || !COUNTABLE.includes(tx.stage)) return;
          if (!stats[tx.supplier_id]) stats[tx.supplier_id] = { invoiceCount: 0, totalAmount: 0, unpaid: 0 };
          stats[tx.supplier_id].invoiceCount++;
          stats[tx.supplier_id].totalAmount += Number(tx.total_amount || 0);
          if (!['paid', 'completed'].includes(tx.stage)) {
            stats[tx.supplier_id].unpaid += Number(tx.total_amount || 0);
          }
        });
        return stats;
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 7. Branches List (for purchase filters) ────────────
    {
      queryKey: ['branches_list', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('branches')
          .select('id, name_ar, name_en')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name_ar');
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 8. Purchase Cycle Documents ────────────────────────
    {
      queryKey: ['purchase_cycle_full', null, undefined, undefined],
      queryFn: async (companyId: string) => {
        const { data, error } = await supabase
          .from('purchase_transactions')
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
  ],
};

/**
 * Patch query keys: replace `null` with actual companyId
 */
export function resolvePurchasesQueries(companyId: string): DataModule {
  return {
    ...purchasesModule,
    queries: purchasesModule.queries.map(q => ({
      ...q,
      queryKey: q.queryKey.map(k => k === null ? companyId : k),
    })),
  };
}
