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
import { startOfMonth, endOfDay, format } from 'date-fns';
import { partyBalanceService } from '@/services/partyBalanceService';
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
      queryKey: ['sales_cycle_full', null, format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(endOfDay(new Date()), 'yyyy-MM-dd')],
      queryFn: async (companyId: string) => {
        const fromDate = startOfMonth(new Date());
        const toDate = endOfDay(new Date());

        const { data, error } = await supabase
          .from('sales_transactions')
          .select('*, items:sales_transaction_items(*)')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .gte('doc_date', fromDate.toISOString())
          .lte('doc_date', toDate.toISOString())
          .order('created_at', { ascending: false });
        if (error) {
           console.error('sales preload error', error);
           return [];
        }
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 4. Sales Invoices List ─────────────────────────────
    {
      queryKey: ['sales_transactions_list', null, format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(endOfDay(new Date()), 'yyyy-MM-dd')],
      queryFn: async (companyId: string) => {
        const fromDate = startOfMonth(new Date());
        const toDate = endOfDay(new Date());

        const { data, error } = await supabase
          .from('sales_transactions')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .gte('doc_date', fromDate.toISOString())
          .lte('doc_date', toDate.toISOString())
          .order('created_at', { ascending: false });
        if (error) {
           console.error('sales transactions preload error', error);
           return [];
        }
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },


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

    // ─── 7. Customer Balances (Sub Ledger) ──────────────────
    {
      queryKey: ['customer_balances_subledger', null],
      queryFn: async (companyId: string) => {
        return partyBalanceService.getAllPartyBalances(companyId, 'customer');
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 8. Sales Dashboard Stats ───────────────────────────
    {
      queryKey: ['sales', 'dashboard', null, format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(endOfDay(new Date()), 'yyyy-MM-dd'), 'base'],
      queryFn: async () => null, // Dashboard query logic is inside the component
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 9. Sales Payments List ─────────────────────────────
    {
      queryKey: ['sales_payments_list', null, 'all', format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(endOfDay(new Date()), 'yyyy-MM-dd')],
      queryFn: async (companyId: string) => {
        const fromDate = startOfMonth(new Date());
        const toDate = endOfDay(new Date());

        const { data: entries, error } = await supabase
            .from('journal_entries')
            .select('id, entry_number, entry_date, status, total_debit, currency, notes, description, description_ar, reference_type, reference_id')
            .eq('company_id', companyId)
            .eq('entry_type', 'receipt')
            .gte('entry_date', format(fromDate, 'yyyy-MM-dd'))
            .lte('entry_date', format(toDate, 'yyyy-MM-dd'))
            .order('entry_date', { ascending: false });

        if (error || !entries?.length) return [];

        const entryIds = entries.map((e: any) => e.id);
        const { data: lines } = await supabase
            .from('journal_entry_lines')
            .select('entry_id, account_id, credit, credit_fc, currency, exchange_rate, is_fund_line')
            .in('entry_id', entryIds)
            .gt('credit', 0);

        const customerLines = (lines || []).filter((l: any) => !l.is_fund_line);
        const accountIds = [...new Set(customerLines.map((l: any) => l.account_id).filter(Boolean))];
        let accountPartyMap: Record<string, string> = {};
        if (accountIds.length > 0) {
            const { data: accounts } = await supabase
                .from('chart_of_accounts')
                .select('id, party_id, party_type')
                .in('id', accountIds)
                .eq('party_type', 'customer');
            (accounts || []).forEach((a: any) => { if (a.party_id) accountPartyMap[a.id] = a.party_id; });
        }

        const entryCustomerMap: Record<string, string> = {};
        const entryAmountMap: Record<string, { amount: number; currency: string }> = {};
        customerLines.forEach((l: any) => {
            const customerId = accountPartyMap[l.account_id];
            if (customerId && !entryCustomerMap[l.entry_id]) {
                entryCustomerMap[l.entry_id] = customerId;
            }
            if (!entryAmountMap[l.entry_id]) {
                const rate = Number(l.exchange_rate) || 1;
                const isFC = rate > 1 && Number(l.credit_fc) > 0;
                entryAmountMap[l.entry_id] = {
                    amount: isFC ? Number(l.credit_fc) : Number(l.credit),
                    currency: l.currency || '',
                };
            }
        });

        return entries.map((e: any) => ({
            ...e,
            _customer_id: entryCustomerMap[e.id] || null,
            _amount: entryAmountMap[e.id]?.amount ?? Number(e.total_debit),
            _currency: entryAmountMap[e.id]?.currency || e.currency || '',
        }));
      },
      staleTime: CACHE_TIMES.DYNAMIC,
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
