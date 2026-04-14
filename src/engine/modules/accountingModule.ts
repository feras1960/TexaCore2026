/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Accounting Module — تعريف بيانات المحاسبة لـ DataEngine
 * ════════════════════════════════════════════════════════════════
 *
 * يُعرّف كل الـ queries الخاصة بقسم المحاسبة.
 * QueryKeys يجب أن تتطابق تماماً مع ما تستخدمه الصفحات.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { accountsService } from '@/services/accountsService';
import { accountLedgerService } from '@/services/accountLedgerService';
import type { DataModule } from '../DataEngine';
import { CACHE_TIMES } from '../DataEngine';

/**
 * Get the date string for 1 month ago (for dynamic data limits)
 */
function oneMonthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
}

export const accountingModule: DataModule = {
  code: 'accounting',
  label: { ar: 'المحاسبة', en: 'Accounting' },
  queries: [
    // ─── 1. Chart of Accounts (STATIC — full tree) ───────────
    {
      queryKey: ['accounts', null, 'all'], // companyId inserted at load time
      queryFn: async (companyId: string) => {
        return accountsService.getAll(companyId, { includePartyAccounts: true });
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 2. Journal Entries (DYNAMIC — last month) ───────────
    {
      queryKey: ['accounting', 'journal-entries', null, undefined],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('journal_entries')
          .select(`
            id, entry_number, entry_date, description, description_ar, description_en,
            status, is_posted, entry_type, reference_type, reference_id, reference_number,
            total_debit, total_credit, created_by, currency,
            lines:journal_entry_lines(
              id, account_id, description, debit, credit,
              debit_fc, credit_fc, currency, exchange_rate, cost_center_id,
              account:chart_of_accounts(account_code, name_ar, name_en)
            )
          `)
          .eq('company_id', companyId)
          .gte('entry_date', oneMonthAgo())
          .order('entry_date', { ascending: false })
          .limit(500);
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 3. Funds — Cash & Bank Accounts ─────────────────────
    {
      queryKey: ['accounting', 'funds', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, name_ar, name_en, current_balance, is_cash_account, is_bank_account, is_group, currency')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .or('is_cash_account.eq.true,is_bank_account.eq.true')
          .order('account_code', { ascending: true });
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 4. Suppliers ────────────────────────────────────────
    {
      queryKey: ['parties_suppliers', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('suppliers')
          .select('*, account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        return (data || []).map((s: any) => ({ ...s, type: 'supplier' as const }));
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 5. Customers ────────────────────────────────────────
    {
      queryKey: ['parties_customers', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('customers')
          .select('*, account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        return (data || []).map((c: any) => ({ ...c, type: 'customer' as const }));
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 6. Accounting Settings ──────────────────────────────
    {
      queryKey: ['accounting', 'settings', null],
      queryFn: async (companyId: string) => {
        const { data: settings } = await supabase
          .from('company_accounting_settings')
          .select('*')
          .eq('company_id', companyId)
          .single();

        // Also load account types
        const { data: accountTypes } = await supabase
          .from('account_types')
          .select('id, name_ar, name_en, code, classification')
          .order('code');

        return { settings, accountTypes: accountTypes || [] };
      },
      staleTime: CACHE_TIMES.STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 7. Accounting Defaults (with account code lookup) ───
    {
      queryKey: ['accounting_defaults', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('company_accounting_settings')
          .select(`
            default_cash_account_id, default_bank_account_id,
            default_receivable_account_id, default_payable_account_id,
            default_revenue_account_id, default_sales_account_id,
            default_expense_account_id, default_purchase_account_id,
            default_cogs_account_id, default_inventory_account_id,
            default_tax_input_account_id, default_tax_output_account_id,
            default_fx_gain_account_id, default_fx_loss_account_id,
            default_freight_in_account_id
          `)
          .eq('company_id', companyId)
          .single();
        if (!data) return null;

        const accountIds = Object.values(data).filter(Boolean) as string[];
        if (accountIds.length === 0) return { settings: data, codes: {} };

        const { data: accounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, name_ar, name_en')
          .in('id', accountIds);

        const codeMap: Record<string, { code: string; nameAr: string; nameEn: string }> = {};
        accounts?.forEach((acc: any) => {
          codeMap[acc.id] = { code: acc.account_code, nameAr: acc.name_ar, nameEn: acc.name_en };
        });
        return { settings: data, codes: codeMap };
      },
      staleTime: CACHE_TIMES.STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 8. Budgets ──────────────────────────────────────────
    {
      queryKey: ['accounting', 'budgets'],
      queryFn: async (companyId: string) => {
        const budgetsRes = await supabase.from('budgets').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
        // budget_alerts may not exist yet — handle gracefully
        let alerts: any[] = [];
        try {
          const { data, error } = await supabase.from('budget_alerts').select('*').eq('company_id', companyId).eq('is_read', false);
          if (!error) alerts = data || [];
        } catch { /* table doesn't exist */ }
        return { budgets: budgetsRes.data || [], alerts };
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 9. Exchange Rates ───────────────────────────────────
    {
      queryKey: ['accounting', 'exchange-rates', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('exchange_rates')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('effective_from', { ascending: false });
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 10. Recurring Entries ───────────────────────────────
    {
      queryKey: ['accounting', 'recurring-entries', null],
      queryFn: async (companyId: string) => {
        const { data } = await supabase
          .from('recurring_entries')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 11. Cost Centers (for dropdowns) ────────────────────
    {
      queryKey: ['accounting', 'ledger-dropdowns', null],
      queryFn: async (companyId: string) => {
        const { data: ccData } = await supabase
          .from('cost_centers')
          .select('id, name_ar, name_en, code')
          .eq('company_id', companyId)
          .eq('is_active', true);
        return { costCenters: ccData || [], projects: [] as any[] };
      },
      staleTime: CACHE_TIMES.STATIC,
      gcTime: CACHE_TIMES.GC,
    },
  ],
};

/**
 * Patch query keys: replace `null` with actual companyId
 */
export function resolveAccountingQueries(companyId: string): DataModule {
  return {
    ...accountingModule,
    queries: accountingModule.queries.map(q => ({
      ...q,
      queryKey: q.queryKey.map(k => k === null ? companyId : k),
    })),
  };
}
