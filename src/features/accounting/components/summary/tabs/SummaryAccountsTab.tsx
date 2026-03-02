/**
 * ════════════════════════════════════════════════════════════════
 * 📋 SummaryAccountsTab — جدول حسابات الأطراف
 * ════════════════════════════════════════════════════════════════
 * يستخدم NexaListTable وفقاً للقانون 21
 * يعرض كل الحسابات الفرعية مع أرصدتها وتفاصيلها
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { cn } from '@/lib/utils';
import type { PartySubAccount } from '../SummaryAccountSheet';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Props {
    subAccounts: PartySubAccount[];
    partyType: string;
    isRTL: boolean;
    companyId?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SummaryAccountsTab({ subAccounts, partyType, isRTL, companyId }: Props) {
    const { t, language, direction } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');

    // Filter
    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return subAccounts;
        const q = searchTerm.toLowerCase();
        return subAccounts.filter(a =>
            (a.name_ar || '').toLowerCase().includes(q) ||
            (a.name_en || '').toLowerCase().includes(q) ||
            (a.account_code || '').toLowerCase().includes(q),
        );
    }, [subAccounts, searchTerm]);

    // Format currency
    const fmt = (val: number) =>
        val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Columns
    const columns: NexaListColumn<PartySubAccount>[] = useMemo(() => [
        {
            id: 'account_code',
            header: t('accounting.summarySheet.columns.code'),
            sortable: true,
            sortKey: 'account_code',
            width: '120px',
            cell: (row) => (
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    {row.account_code}
                </span>
            ),
        },
        {
            id: 'name',
            header: t('accounting.summarySheet.columns.name'),
            sortable: true,
            sortKey: language === 'ar' ? 'name_ar' : 'name_en',
            cell: (row) => (
                <span className="font-tajawal text-gray-900 dark:text-white">
                    {language === 'ar' ? row.name_ar : (row.name_en || row.name_ar)}
                </span>
            ),
        },
        {
            id: 'current_balance',
            header: t('accounting.summarySheet.columns.balance'),
            sortable: true,
            sortKey: 'current_balance',
            align: 'end' as const,
            cell: (row) => {
                const bal = row.current_balance || 0;
                return (
                    <span className={cn(
                        'font-mono font-semibold text-sm',
                        bal > 0 ? 'text-emerald-600 dark:text-emerald-400'
                            : bal < 0 ? 'text-rose-600 dark:text-rose-400'
                                : 'text-gray-400',
                    )}>
                        {fmt(bal)}
                    </span>
                );
            },
        },
        {
            id: 'total_debit',
            header: t('accounting.summarySheet.columns.totalDebit'),
            align: 'end' as const,
            cell: (row) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    {fmt(row.total_debit || 0)}
                </span>
            ),
        },
        {
            id: 'total_credit',
            header: t('accounting.summarySheet.columns.totalCredit'),
            align: 'end' as const,
            cell: (row) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    {fmt(row.total_credit || 0)}
                </span>
            ),
        },
        {
            id: 'is_active',
            header: t('accounting.summarySheet.columns.status'),
            width: '100px',
            cell: (row) => (
                <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    row.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                )}>
                    {row.is_active
                        ? t('common.status.active')
                        : t('common.status.inactive')
                    }
                </span>
            ),
        },
    ], [t, language, fmt]);

    // Footer totals
    const totalBalance = filteredAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

    return (
        <NexaListTable
            data={filteredAccounts}
            columns={columns}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('accounting.summarySheet.searchAccounts')}
            totalCount={filteredAccounts.length}
            countLabel={t('accounting.summarySheet.accountsCount')}
            isLoading={false}
            emptyIcon="📋"
            emptyMessage={t('accounting.summarySheet.noAccountsTitle')}
            showFooter
            footerLeftText={`${t('accounting.summarySheet.totalLabel')}: ${filteredAccounts.length}`}
            footerRightContent={
                <span className={cn(
                    'font-mono font-bold',
                    totalBalance >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                )}>
                    {fmt(totalBalance)}
                </span>
            }
            isRTL={isRTL}
            direction={direction}
        />
    );
}

export default SummaryAccountsTab;
