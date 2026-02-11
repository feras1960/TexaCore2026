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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { accountsService } from '@/services/accountsService';
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

    const query = useQuery({
        queryKey: ['accounting', 'journal-entries', companyId, filters],
        queryFn: async () => {
            if (!companyId) return [];

            let q = supabase
                .from('journal_entries')
                .select(`
                    *,
                    lines:journal_entry_lines(
                        id,
                        account_id,
                        description,
                        debit,
                        credit,
                        account:chart_of_accounts(
                            id,
                            account_code,
                            name_ar,
                            name_en
                        )
                    )
                `)
                .eq('company_id', companyId)
                .order('entry_date', { ascending: false });

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
                q = q.ilike('reference', `%${filters.reference}%`);
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
                return [];
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
        ],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['accounting', 'journal-entries'] });
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

    const query = useQuery({
        queryKey: ['accounting', 'funds', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const allAccounts = await accountsService.getAll(companyId);
            // Filter for Cash and Bank accounts
            return allAccounts.filter((acc: any) =>
                acc.is_cash_account || acc.is_bank_account ||
                acc.account_type_code === 'CASH' || acc.account_type_code === 'BANK'
            );
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
