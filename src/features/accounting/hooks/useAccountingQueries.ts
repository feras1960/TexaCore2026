/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Accounting React Query Hooks
 * هوكات تحميل بيانات المحاسبة بنظام الكاش الذكي + Realtime
 * ════════════════════════════════════════════════════════════════
 *
 * ⚡ PERFORMANCE POLICY (from data-loading-policy.md):
 * ─────────────────────────────────────────────────────
 * - Journal entries: DYNAMIC (2 min staleTime)
 * - Accounts/Funds: SEMI_STATIC (10 min staleTime)
 * - All have gcTime: 30 min
 *
 * 🔄 REALTIME:
 * ─────────────────────────────────────────────────────
 * - journal_entries table → auto-updates entries list
 * - chart_of_accounts table → auto-updates funds
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
// accountsService no longer needed — useFunds queries Supabase directly
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

// ═══════════════════════════════════════════════
// Cache Duration Constants
// ═══════════════════════════════════════════════
const SEMI_STATIC = 10 * 60 * 1000;  // 10 min - accounts, funds
const DYNAMIC = 2 * 60 * 1000;       //  2 min - journal entries
const GC_TIME = 30 * 60 * 1000;      // 30 min - keep in cache after unmount

// ═══════════════════════════════════════════════
// 1. Journal Entries
// ═══════════════════════════════════════════════
interface JournalEntriesFilters {
    status?: string;
    entryType?: string;
    entryNumber?: string;
    reference?: string;
    dateFrom?: string;
    dateTo?: string;
}

export function useJournalEntries(filters?: JournalEntriesFilters) {
    const { companyId } = useCompany();
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: ['accounting', 'journal-entries', companyId, filters],
        queryFn: async () => {
            if (!companyId) return [];

            let q = supabase
                .from('journal_entries')
                .select(`
                    id,
                    entry_number,
                    entry_date,
                    description,
                    description_ar,
                    description_en,
                    status,
                    is_posted,
                    entry_type,
                    reference_type,
                    reference_id,
                    reference_number,
                    total_debit,
                    total_credit,
                    created_by,
                    currency,
                    fund_account_id,
                    lines:journal_entry_lines(
                        id,
                        account_id,
                        description,
                        debit,
                        credit,
                        debit_fc,
                        credit_fc,
                        currency,
                        exchange_rate,
                        cost_center_id,
                        reference_type,
                        reference_id,
                        is_fund_line,
                        line_number,
                        account:chart_of_accounts(
                            account_code,
                            name_ar,
                            name_en,
                            currency
                        )
                    )
                `)
                .eq('company_id', companyId)
                .order('entry_date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(500);

            // Apply filters
            if (filters?.status && filters.status !== 'all') {
                q = q.eq('status', filters.status);
            }
            if (filters?.entryType && filters.entryType !== 'all') {
                q = q.eq('entry_type', filters.entryType);
            }
            if (filters?.entryNumber) {
                q = q.ilike('entry_number', `%${filters.entryNumber}%`);
            }
            if (filters?.reference) {
                q = q.ilike('reference_number', `%${filters.reference}%`);
            }
            if (filters?.dateFrom) {
                q = q.gte('entry_date', filters.dateFrom);
            }
            if (filters?.dateTo) {
                q = q.lte('entry_date', filters.dateTo);
            }

            const { data, error } = await q;

            if (error) {
                console.error('Error fetching journal entries:', error);
                throw error;
            }

            return data || [];
        },
        enabled: !!companyId,
        staleTime: DYNAMIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime: auto-update when any user adds/edits/deletes entries
    useRealtimeInvalidation({
        table: 'journal_entries',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [
            ['accounting', 'journal-entries'],
            ['accounting', 'funds'],
            ['journal_entries'],                   // ← مفتاح useSheetActions
            ['party_balances_supplier'],            // ← أرصدة الموردين
            ['party_balances_customer'],            // ← أرصدة العملاء
            ['chart_of_accounts'],                 // ← ميزانية الحسابات
        ],
    });

    // 🔄 Realtime: تحديث عند تغيّر أسطر القيود أيضاً
    useRealtimeInvalidation({
        table: 'journal_entry_lines',
        companyId,
        queryKeys: [
            ['accounting', 'journal-entries'],
            ['party_balances_supplier'],
            ['party_balances_customer'],
        ],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['accounting', 'journal-entries'] });
        queryClient.invalidateQueries({ queryKey: ['journal_entries'] }); // legacy key
    };

    return {
        entries: query.data || [],
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: query.refetch,
        invalidate,
    };
}

// ═══════════════════════════════════════════════
// 2. Funds (Cash + Bank Accounts)
// ═══════════════════════════════════════════════
export function useFunds() {
    const { company } = useCompany();
    const companyId = company?.id;
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: ['accounting', 'funds', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            // ⚡ Direct lightweight query — only fetch cash/bank accounts
            // Old code used accountsService.getAll() which fetches ALL accounts + JOINs
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en, current_balance, is_cash_account, is_bank_account, is_group, currency')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .or('is_cash_account.eq.true,is_bank_account.eq.true')
                .order('account_code', { ascending: true });

            if (error) {
                console.error('Error fetching funds:', error);
                throw error;
            }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: SEMI_STATIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime: auto-update when chart_of_accounts changes
    useRealtimeInvalidation({
        table: 'chart_of_accounts',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [
            ['accounting', 'funds'],
        ],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['accounting', 'funds'] });
    };

    return {
        funds: query.data || [],
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: query.refetch,
        invalidate,
    };
}
