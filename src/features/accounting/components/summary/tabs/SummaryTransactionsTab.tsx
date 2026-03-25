/**
 * ════════════════════════════════════════════════════════════════
 * 💰 SummaryTransactionsTab — كل الحركات المالية للمجموعة
 * ════════════════════════════════════════════════════════════════
 * يعرض: قيود يومية + مقبوضات + مدفوعات + فواتير
 * مع فلاتر: نوع الحركة، التاريخ، بحث
 * يستخدم NexaListTable وفقاً للقانون 21
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, type NexaListColumn, type NexaListFilter } from '@/components/ui/nexa-list-table';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { PartySubAccount } from '../SummaryAccountSheet';
import type { DateRange } from 'react-day-picker';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Props {
    subAccounts: PartySubAccount[];
    partyType: string;
    isRTL: boolean;
    parentAccountId: string;
}

type TransactionType = 'journal' | 'receipt' | 'payment' | 'invoice' | 'all';

interface UnifiedTransaction {
    id: string;
    date: string;
    type: TransactionType;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    currency: string;
    accountName: string;
    contraAccount: string;
    status: string;
}

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

const TYPE_STYLES: Record<string, { labelKey: string; className: string }> = {
    journal: {
        labelKey: 'accounting.summarySheet.txType.journal',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    receipt: {
        labelKey: 'accounting.summarySheet.txType.receipt',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    payment: {
        labelKey: 'accounting.summarySheet.txType.payment',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    },
    invoice: {
        labelKey: 'accounting.summarySheet.txType.invoice',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SummaryTransactionsTab({ subAccounts, partyType, isRTL, parentAccountId }: Props) {
    const { t, language, direction } = useLanguage();

    // State
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Account IDs for query
    const accountIds = useMemo(() => subAccounts.map(a => a.id), [subAccounts]);

    // ═══ Fetch all transactions ═══
    const fetchTransactions = useCallback(async () => {
        if (accountIds.length === 0) return;
        setLoading(true);

        try {
            const results: UnifiedTransaction[] = [];

            // 1) Journal Entry Lines
            const { data: journalLines } = await supabase
                .from('journal_entry_lines')
                .select(`
          id, debit, credit, description, account_id,
          journal_entries (
            id, entry_number, entry_date, description, status, currency
          )
        `)
                .in('account_id', accountIds)
                .order('created_at', { ascending: false })
                .limit(500);

            if (journalLines) {
                for (const line of journalLines) {
                    const entry = (line as any).journal_entries;
                    if (!entry) continue;
                    const acct = subAccounts.find(a => a.id === line.account_id);
                    results.push({
                        id: line.id,
                        date: entry.entry_date || '',
                        type: 'journal',
                        reference: entry.entry_number || '',
                        description: line.description || entry.description || '',
                        debit: Number(line.debit) || 0,
                        credit: Number(line.credit) || 0,
                        currency: entry.currency || 'USD',
                        accountName: language === 'ar' ? (acct?.name_ar || '') : (acct?.name_en || acct?.name_ar || ''),
                        contraAccount: acct?.account_code || '',
                        status: entry.status || 'draft',
                    });
                }
            }

            // 2) Cash Transactions (Receipts + Payments)
            const { data: cashTx } = await supabase
                .from('cash_transactions')
                .select('*')
                .or(accountIds.map(id => `contra_account_id.eq.${id}`).join(','))
                .order('transaction_date', { ascending: false })
                .limit(200);

            if (cashTx) {
                for (const tx of cashTx) {
                    const acct = subAccounts.find(a => a.id === tx.contra_account_id);
                    const isReceipt = tx.transaction_type === 'receipt' || tx.transaction_type === 'income';
                    results.push({
                        id: tx.id,
                        date: tx.transaction_date || '',
                        type: isReceipt ? 'receipt' : 'payment',
                        reference: tx.transaction_number || '',
                        description: tx.description || '',
                        debit: isReceipt ? Number(tx.amount) || 0 : 0,
                        credit: !isReceipt ? Number(tx.amount) || 0 : 0,
                        currency: tx.currency || 'USD',
                        accountName: language === 'ar' ? (acct?.name_ar || tx.party_name || '') : (acct?.name_en || acct?.name_ar || tx.party_name || ''),
                        contraAccount: acct?.account_code || '',
                        status: tx.status || 'confirmed',
                    });
                }
            }

            // Sort by date descending
            results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setTransactions(results);
        } catch (err) {
            console.error('[SummaryTransactionsTab] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [accountIds, subAccounts, language]);

    useEffect(() => {
        // Reset transactions when switching accounts
        setTransactions([]);
        if (accountIds.length > 0) {
            fetchTransactions();
        }
    }, [fetchTransactions]);

    // ═══ Filtered transactions ═══
    const filtered = useMemo(() => {
        let result = transactions;

        // Type filter
        if (typeFilter !== 'all') {
            result = result.filter(tx => tx.type === typeFilter);
        }

        // Date filter
        if (dateRange?.from) {
            const from = dateRange.from.toISOString().split('T')[0];
            result = result.filter(tx => tx.date >= from);
        }
        if (dateRange?.to) {
            const to = dateRange.to.toISOString().split('T')[0];
            result = result.filter(tx => tx.date <= to);
        }

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(tx =>
                (tx.reference || '').toLowerCase().includes(q) ||
                (tx.description || '').toLowerCase().includes(q) ||
                (tx.accountName || '').toLowerCase().includes(q),
            );
        }

        return result;
    }, [transactions, typeFilter, dateRange, searchTerm]);

    // Format currency
    const fmt = (val: number) =>
        val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ═══ Columns ═══
    const columns: NexaListColumn<UnifiedTransaction>[] = useMemo(() => [
        {
            id: 'date',
            header: t('accounting.summarySheet.columns.date'),
            sortable: true,
            sortKey: 'date',
            width: '110px',
            cell: (row) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    {row.date}
                </span>
            ),
        },
        {
            id: 'type',
            header: t('accounting.summarySheet.columns.type'),
            width: '100px',
            cell: (row) => {
                const style = TYPE_STYLES[row.type] || TYPE_STYLES.journal;
                return (
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', style.className)}>
                        {t(style.labelKey)}
                    </span>
                );
            },
        },
        {
            id: 'reference',
            header: t('accounting.summarySheet.columns.reference'),
            sortable: true,
            sortKey: 'reference',
            width: '130px',
            cell: (row) => (
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {row.reference}
                </span>
            ),
        },
        {
            id: 'accountName',
            header: t('accounting.summarySheet.columns.account'),
            cell: (row) => (
                <span className="text-sm text-gray-900 dark:text-white font-tajawal truncate">
                    {row.accountName}
                </span>
            ),
        },
        {
            id: 'description',
            header: t('accounting.summarySheet.columns.description'),
            cell: (row) => (
                <span className="text-sm text-gray-600 dark:text-gray-400 font-tajawal truncate">
                    {row.description}
                </span>
            ),
        },
        {
            id: 'currency',
            header: t('accounting.currency') || 'العملة',
            width: '70px',
            cell: (row: UnifiedTransaction) => (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {row.currency}
                </span>
            ),
        },
        {
            id: 'debit',
            header: t('accounting.summarySheet.columns.debit'),
            align: 'end' as const,
            sortable: true,
            sortKey: 'debit',
            width: '120px',
            cell: (row) => (
                <span className={cn(
                    'font-mono text-sm',
                    row.debit > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-gray-300 dark:text-gray-600',
                )}>
                    {row.debit > 0 ? fmt(row.debit) : '-'}
                </span>
            ),
        },
        {
            id: 'credit',
            header: t('accounting.summarySheet.columns.credit'),
            align: 'end' as const,
            sortable: true,
            sortKey: 'credit',
            width: '120px',
            cell: (row) => (
                <span className={cn(
                    'font-mono text-sm',
                    row.credit > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-300 dark:text-gray-600',
                )}>
                    {row.credit > 0 ? fmt(row.credit) : '-'}
                </span>
            ),
        },
    ], [t, fmt]);

    // ═══ Filters ═══
    const filters: NexaListFilter[] = useMemo(() => [
        {
            id: 'type',
            label: t('accounting.summarySheet.filters.txType'),
            type: 'select' as const,
            value: typeFilter,
            onChange: (val: string) => setTypeFilter(val),
            options: [
                { value: 'all', label: t('common.all') },
                { value: 'journal', label: t('accounting.summarySheet.txType.journal') },
                { value: 'receipt', label: t('accounting.summarySheet.txType.receipt') },
                { value: 'payment', label: t('accounting.summarySheet.txType.payment') },
                { value: 'invoice', label: t('accounting.summarySheet.txType.invoice') },
            ],
        },
    ], [t, typeFilter]);

    // Footer totals
    const totalDebit = filtered.reduce((s, tx) => s + tx.debit, 0);
    const totalCredit = filtered.reduce((s, tx) => s + tx.credit, 0);

    return (
        <NexaListTable
            data={filtered}
            columns={columns}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('accounting.summarySheet.searchTransactions')}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            totalCount={filtered.length}
            countLabel={t('accounting.summarySheet.transactionsCount')}
            filters={filters}
            isLoading={loading}
            emptyIcon="💰"
            emptyMessage={t('accounting.summarySheet.noTransactionsTitle')}
            showFooter
            footerLeftText={`${t('accounting.summarySheet.totalLabel')}: ${filtered.length}`}
            footerRightContent={
                <div className="flex items-center gap-4 font-mono text-sm">
                    <span className="text-rose-600 dark:text-rose-400">
                        {t('accounting.summarySheet.overview.debit')}: {fmt(totalDebit)}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                        {t('accounting.summarySheet.overview.credit')}: {fmt(totalCredit)}
                    </span>
                </div>
            }
            isRTL={isRTL}
            direction={direction}
        />
    );
}

export default SummaryTransactionsTab;
