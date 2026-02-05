/**
 * Quick Stats Component - بطاقات الإحصائيات السريعة
 * يعرض إحصائيات المستند في بطاقات صغيرة
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    TrendingUp,
    DollarSign,
    Receipt,
    CreditCard,
    Clock,
    Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatConfig } from '../types';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../utils/formatters';

// Icon mapping
const statIconMap: Record<string, any> = {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    TrendingUp,
    DollarSign,
    Receipt,
    CreditCard,
    Clock,
    Calendar,
};

interface QuickStatsProps {
    stats: StatConfig[];
    data: any;
    currency?: string;
    useArabicNumerals?: boolean;
    compact?: boolean;
    columns?: 2 | 3 | 4;
}

export function QuickStats({
    stats,
    data,
    currency = 'SAR',
    useArabicNumerals = false,
    compact = false,
    columns = 4,
}: QuickStatsProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    // Get value from data object by path
    const getValue = (path: string): any => {
        if (!data) return undefined;
        const keys = path.split('.');
        let value = data;
        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) break;
        }
        return value;
    };

    // Format value based on type
    const formatValue = (value: any, format?: string): string => {
        if (value === undefined || value === null) return '-';

        switch (format) {
            case 'currency':
                return formatCurrency(value, currency, useArabicNumerals, false);
            case 'number':
                return formatNumber(value, useArabicNumerals);
            case 'percent':
                return formatPercent(value, useArabicNumerals);
            case 'date':
                return formatDate(value, useArabicNumerals);
            default:
                return formatNumber(value, useArabicNumerals);
        }
    };

    // Get grid columns class
    const getGridClass = () => {
        switch (columns) {
            case 2: return 'grid-cols-2';
            case 3: return 'grid-cols-3';
            case 4: return 'grid-cols-2 md:grid-cols-4';
            default: return 'grid-cols-2 md:grid-cols-4';
        }
    };

    if (stats.length === 0) return null;

    return (
        <div className={cn(
            "grid gap-3",
            getGridClass(),
            compact && "gap-2"
        )}>
            {stats.map((stat) => {
                const IconComponent = statIconMap[stat.icon] || Hash;
                const value = getValue(stat.valueKey);
                const formattedValue = formatValue(value, stat.format);

                return (
                    <div
                        key={stat.id}
                        className={cn(
                            "bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700",
                            "p-4 flex items-center gap-3",
                            compact && "p-3"
                        )}
                    >
                        {/* Icon */}
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            "bg-gray-100 dark:bg-gray-700",
                            compact && "w-8 h-8"
                        )}>
                            <IconComponent className={cn(
                                "w-5 h-5",
                                stat.colorClass || "text-gray-600 dark:text-gray-400",
                                compact && "w-4 h-4"
                            )} />
                        </div>

                        {/* Value & Label */}
                        <div className="min-w-0 flex-1">
                            <p className={cn(
                                "font-bold font-mono truncate",
                                stat.colorClass || "text-gray-900 dark:text-white",
                                compact ? "text-base" : "text-lg"
                            )}>
                                {formattedValue}
                            </p>
                            <p className={cn(
                                "text-gray-500 dark:text-gray-400 truncate",
                                compact ? "text-[10px]" : "text-xs"
                            )}>
                                {t(stat.labelKey)}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Inline Stats Row - صف إحصائيات مدمج
interface InlineStatsProps {
    items: Array<{
        label: string;
        value: string | number;
        color?: string;
    }>;
    useArabicNumerals?: boolean;
}

export function InlineStats({ items, useArabicNumerals = false }: InlineStatsProps) {
    const { direction } = useLanguage();

    return (
        <div className="flex items-center gap-4 divide-x divide-gray-200 dark:divide-gray-700">
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(
                        "flex items-center gap-2",
                        index > 0 && "ps-4"
                    )}
                >
                    <span className="text-xs text-gray-500">{item.label}:</span>
                    <span className={cn(
                        "font-bold font-mono text-sm",
                        item.color || "text-gray-900 dark:text-white"
                    )}>
                        {typeof item.value === 'number'
                            ? formatNumber(item.value, useArabicNumerals)
                            : item.value
                        }
                    </span>
                </div>
            ))}
        </div>
    );
}

// Balance Display - عرض الرصيد الكبير
interface BalanceDisplayProps {
    balance: number;
    label?: string;
    currency?: string;
    useArabicNumerals?: boolean;
    showTrend?: boolean;
    previousBalance?: number;
    size?: 'sm' | 'md' | 'lg';
}

export function BalanceDisplay({
    balance,
    label,
    currency = 'SAR',
    useArabicNumerals = false,
    showTrend = false,
    previousBalance,
    size = 'md',
}: BalanceDisplayProps) {
    const { t, direction } = useLanguage();

    const trend = previousBalance !== undefined
        ? ((balance - previousBalance) / Math.abs(previousBalance || 1)) * 100
        : 0;

    const sizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-4xl',
    };

    return (
        <div className={cn(
            "text-center py-4",
            direction === 'rtl' && "text-center"
        )}>
            {label && (
                <p className="text-sm text-gray-500 mb-1">{label}</p>
            )}
            <p className={cn(
                "font-bold font-mono",
                sizeClasses[size],
                balance >= 0 ? "text-erp-navy dark:text-white" : "text-red-600"
            )}>
                {formatCurrency(balance, currency, useArabicNumerals)}
            </p>
            {showTrend && previousBalance !== undefined && (
                <div className={cn(
                    "flex items-center justify-center gap-1 mt-1 text-xs",
                    trend >= 0 ? "text-green-600" : "text-red-600"
                )}>
                    {trend >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                    ) : (
                        <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>{formatPercent(Math.abs(trend), useArabicNumerals)}</span>
                </div>
            )}
        </div>
    );
}

export default QuickStats;
