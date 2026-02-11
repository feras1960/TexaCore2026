/**
 * Overview Tab - تبويب النظرة العامة
 * يعرض ملخص البيانات والإحصائيات الرئيسية
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Calendar,
    User,
    Building2,
    Tag,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickStats } from '../components/QuickStats';
import { formatCurrency, formatNumber, formatDate, getCurrencySymbol } from '../utils/formatters';
import type { StatConfig, AccountData } from '../types';

interface OverviewTabProps {
    data: any;
    stats: StatConfig[];
    currency?: string;
    useArabicNumerals?: boolean;
}

export function OverviewTab({
    data,
    stats,
    currency = '',
    useArabicNumerals = false,
}: OverviewTabProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>{t('messages.noData') || 'لا توجد بيانات'}</p>
            </div>
        );
    }

    // Get name based on language
    const getName = () => {
        if (language === 'ar' && data.nameAr) return data.nameAr;
        if (language === 'ar' && data.name_ar) return data.name_ar;
        if (language === 'en' && data.name_en) return data.name_en;
        return data.name || '-';
    };

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <QuickStats
                stats={stats}
                data={data}
                currency={currency}
                useArabicNumerals={useArabicNumerals}
                columns={4}
            />

            {/* Account Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-400" />
                            {t('accounting.details') || 'التفاصيل'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <InfoRow
                            label={t('accounting.account.code') || 'الكود'}
                            value={data.code}
                            mono
                        />
                        <InfoRow
                            label={t('accounting.account.name') || 'الاسم'}
                            value={getName()}
                        />
                        <InfoRow
                            label={t('accounting.account.type') || 'النوع'}
                            value={
                                <Badge variant="outline" className="text-xs">
                                    {data.account_type || data.type || '-'}
                                </Badge>
                            }
                        />
                        {data.parent && (
                            <InfoRow
                                label={t('accounting.parent') || 'الحساب الأب'}
                                value={`${data.parent.code} - ${data.parent.name}`}
                            />
                        )}
                        {data.currency && (
                            <InfoRow
                                label={t('accounting.currency') || 'العملة'}
                                value={<Badge variant="secondary">{data.currency}</Badge>}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Activity Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-400" />
                            {t('accounting.activity') || 'النشاط'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <InfoRow
                            label={t('accounting.transactionCount') || 'عدد العمليات'}
                            value={formatNumber(data.transaction_count, useArabicNumerals)}
                            mono
                        />
                        {data.monthly_average !== undefined && (
                            <InfoRow
                                label={t('accounting.monthlyAverage') || 'المتوسط الشهري'}
                                value={formatCurrency(data.monthly_average, currency, useArabicNumerals)}
                                mono
                            />
                        )}
                        <InfoRow
                            label={t('accounting.lastActivity') || 'آخر نشاط'}
                            value={formatDate(data.last_activity || data.updated_at, useArabicNumerals)}
                        />
                        <InfoRow
                            label={t('accounting.createdAt') || 'تاريخ الإنشاء'}
                            value={formatDate(data.created_at, useArabicNumerals)}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Balance Summary */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        {t('accounting.balanceSummary') || 'ملخص الأرصدة'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <BalanceItem
                            label={t('accounting.openingBalance') || 'الرصيد الافتتاحي'}
                            value={data.opening_balance || 0}
                            currency={currency}
                            useArabicNumerals={useArabicNumerals}
                        />
                        <BalanceItem
                            label={t('accounting.entry.debit') || 'إجمالي المدين'}
                            value={data.total_debit || 0}
                            currency={currency}
                            useArabicNumerals={useArabicNumerals}
                            colorClass="text-green-600"
                        />
                        <BalanceItem
                            label={t('accounting.entry.credit') || 'إجمالي الدائن'}
                            value={data.total_credit || 0}
                            currency={currency}
                            useArabicNumerals={useArabicNumerals}
                            colorClass="text-red-600"
                        />
                        <BalanceItem
                            label={t('accounting.account.balance') || 'الرصيد الحالي'}
                            value={data.current_balance || data.balance || 0}
                            currency={currency}
                            useArabicNumerals={useArabicNumerals}
                            colorClass="text-erp-navy"
                            highlight
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Description */}
            {data.description && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            {t('accounting.description') || 'الوصف'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {data.description}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Info Row Component
interface InfoRowProps {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}

function InfoRow({ label, value, mono }: InfoRowProps) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={cn(
                "text-sm font-medium text-gray-900 dark:text-white",
                mono && "font-mono"
            )}>
                {value}
            </span>
        </div>
    );
}

// Balance Item Component
interface BalanceItemProps {
    label: string;
    value: number;
    currency: string;
    useArabicNumerals: boolean;
    colorClass?: string;
    highlight?: boolean;
}

function BalanceItem({
    label,
    value,
    currency,
    useArabicNumerals,
    colorClass,
    highlight,
}: BalanceItemProps) {
    return (
        <div className={cn(
            "p-3 rounded-lg",
            highlight
                ? "bg-erp-navy/5 dark:bg-erp-navy/20"
                : "bg-gray-50 dark:bg-gray-800"
        )}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <div className={cn(
                "text-lg font-bold font-mono flex items-baseline gap-1.5",
                colorClass || "text-gray-900 dark:text-white"
            )}>
                <span>{formatNumber(value, useArabicNumerals)}</span>
                <span className="text-[0.7em] font-normal opacity-80">
                    {getCurrencySymbol(currency)}
                </span>
            </div>
        </div>
    );
}

export default OverviewTab;
