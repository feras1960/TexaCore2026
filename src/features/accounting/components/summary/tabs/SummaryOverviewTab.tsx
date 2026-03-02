/**
 * ════════════════════════════════════════════════════════════════
 * 📊 SummaryOverviewTab — نظرة عامة على مجموعة الأطراف
 * ════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Users, TrendingUp, TrendingDown, BarChart3,
    DollarSign, Activity, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SummaryAccountData, PartySubAccount } from '../SummaryAccountSheet';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Props {
    data: SummaryAccountData | null;
    subAccounts: PartySubAccount[];
    stats: {
        total: number;
        active: number;
        totalDebit: number;
        totalCredit: number;
        totalBalance: number;
        maxBalance: number;
    };
    partyType: string;
    isRTL: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SummaryOverviewTab({ data, subAccounts, stats, partyType, isRTL }: Props) {
    const { t, language } = useLanguage();

    // Top 5 by balance
    const topAccounts = useMemo(() => {
        return [...subAccounts]
            .sort((a, b) => Math.abs(b.current_balance || 0) - Math.abs(a.current_balance || 0))
            .slice(0, 5);
    }, [subAccounts]);

    const formatCurrency = (val: number) =>
        val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-5">
            {/* ═══ Stats Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Accounts */}
                <StatCard
                    icon={Users}
                    label={t('accounting.summarySheet.overview.totalAccounts')}
                    value={stats.total.toString()}
                    color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    iconBg="bg-blue-100 dark:bg-blue-900/40"
                />
                {/* Active Accounts */}
                <StatCard
                    icon={Activity}
                    label={t('accounting.summarySheet.overview.activeAccounts')}
                    value={stats.active.toString()}
                    color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                    iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                />
                {/* Total Debit */}
                <StatCard
                    icon={TrendingUp}
                    label={t('accounting.summarySheet.overview.totalDebit')}
                    value={formatCurrency(stats.totalDebit)}
                    color="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                    iconBg="bg-rose-100 dark:bg-rose-900/40"
                    isMono
                />
                {/* Total Credit */}
                <StatCard
                    icon={TrendingDown}
                    label={t('accounting.summarySheet.overview.totalCredit')}
                    value={formatCurrency(stats.totalCredit)}
                    color="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                    iconBg="bg-violet-100 dark:bg-violet-900/40"
                    isMono
                />
            </div>

            {/* ═══ Net Balance Card ═══ */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-300 text-sm font-tajawal">
                            {t('accounting.summarySheet.overview.netBalance')}
                        </p>
                        <p className="text-3xl font-bold font-mono mt-1">
                            {formatCurrency(stats.totalBalance)}
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                        <DollarSign className="w-7 h-7 text-white/80" />
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span>
                        {t('accounting.summarySheet.overview.debit')}: {formatCurrency(stats.totalDebit)}
                    </span>
                    <span>•</span>
                    <span>
                        {t('accounting.summarySheet.overview.credit')}: {formatCurrency(stats.totalCredit)}
                    </span>
                </div>
            </div>

            {/* ═══ Top 5 Accounts ═══ */}
            {topAccounts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-cairo">
                            {t('accounting.summarySheet.overview.topAccounts')}
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {topAccounts.map((account, idx) => {
                            const balance = account.current_balance || 0;
                            const pct = stats.maxBalance > 0 ? (Math.abs(balance) / stats.maxBalance) * 100 : 0;
                            const name = language === 'ar' ? account.name_ar : (account.name_en || account.name_ar);

                            return (
                                <div key={account.id} className="px-4 py-3 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate font-tajawal">
                                            {name}
                                        </p>
                                        <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all',
                                                    balance >= 0
                                                        ? 'bg-emerald-500 dark:bg-emerald-400'
                                                        : 'bg-rose-500 dark:bg-rose-400',
                                                )}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'text-sm font-mono font-semibold flex-shrink-0',
                                        balance >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400',
                                    )}>
                                        {formatCurrency(balance)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ Empty State ═══ */}
            {subAccounts.length === 0 && !stats.total && (
                <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-tajawal">
                        {t('accounting.summarySheet.overview.noAccounts')}
                    </p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// StatCard — Mini component
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, color, iconBg, isMono }: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
    iconBg: string;
    isMono?: boolean;
}) {
    return (
        <div className={cn('rounded-xl p-4', color)}>
            <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
                    <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-current/70 font-tajawal truncate">{label}</p>
                    <p className={cn('text-lg font-bold', isMono && 'font-mono')}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SummaryOverviewTab;
