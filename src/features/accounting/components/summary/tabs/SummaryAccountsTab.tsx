/**
 * ════════════════════════════════════════════════════════════════
 * 📋 SummaryAccountsTab — جدول حسابات الأطراف مع العملات
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
    convert?: (amount: number, currency: string) => number;
    selectedCurrency?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SummaryAccountsTab({ subAccounts, partyType, isRTL, companyId, convert, selectedCurrency }: Props) {
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

    // Helper: convert amount
    const cv = (amount: number, currency: string) => {
        if (convert) return convert(amount, currency);
        return amount;
    };

    // Columns
    const columns: NexaListColumn<PartySubAccount>[] = useMemo(() => [
        {
            id: 'row_num',
            header: '#',
            width: '45px',
            cell: (_row, index) => (
                <span className="text-xs text-gray-400">{(index || 0) + 1}</span>
            ),
        },
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
            id: 'currency',
            header: t('accounting.currency') || 'العملة',
            width: '80px',
            cell: (row) => (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {row.currency || '—'}
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
                const bal = cv(row.current_balance || 0, row.currency || 'USD');
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
                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {fmt(cv(row.total_debit || 0, row.currency || 'USD'))}
                </span>
            ),
        },
        {
            id: 'total_credit',
            header: t('accounting.summarySheet.columns.totalCredit'),
            align: 'end' as const,
            cell: (row) => (
                <span className="font-mono text-sm text-rose-600 dark:text-rose-400">
                    {fmt(cv(row.total_credit || 0, row.currency || 'USD'))}
                </span>
            ),
        },
        {
            id: 'is_active',
            header: t('accounting.summarySheet.columns.status'),
            width: '80px',
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
    ], [t, language, convert, selectedCurrency]);

    // Footer totals
    const totalBalance = filteredAccounts.reduce((s, a) => s + cv(a.current_balance || 0, a.currency || 'USD'), 0);
    const totalDebit = filteredAccounts.reduce((s, a) => s + cv(a.total_debit || 0, a.currency || 'USD'), 0);
    const totalCredit = filteredAccounts.reduce((s, a) => s + cv(a.total_credit || 0, a.currency || 'USD'), 0);

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
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                        {t('accounting.summarySheet.columns.totalDebit')}: <span className="font-mono font-bold text-emerald-600">{fmt(totalDebit)}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                        {t('accounting.summarySheet.columns.totalCredit')}: <span className="font-mono font-bold text-rose-600">{fmt(totalCredit)}</span>
                    </span>
                    <span className={cn(
                        'font-mono font-bold',
                        totalBalance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400',
                    )}>
                        {fmt(totalBalance)}
                    </span>
                </div>
            }
            isRTL={isRTL}
            direction={direction}
        />
    );
}

export default SummaryAccountsTab;
