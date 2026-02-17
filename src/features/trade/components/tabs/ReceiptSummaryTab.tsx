/**
 * ═══════════════════════════════════════════════════════════════
 * 📦 ReceiptSummaryTab — ملخص الاستلام
 * ═══════════════════════════════════════════════════════════════
 * مقارنة بين الكميات المطلوبة والمُستلمة لكل بند:
 * - 3 بطاقات ملخص (مطلوب / مُستلم / متبقي) + progress bar
 * - جدول تفصيلي لكل مادة (مادة + لون + مطلوب + مُستلم + الفرق + الحالة)
 * - Timeline عمليات الاستلام
 * - RTL + Dark mode + Empty state
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Package,
    PackageCheck,
    PackageMinus,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Loader2,
    TrendingUp,
    Palette,
    Hash,
    Ruler,
} from 'lucide-react';
import type { PurchaseTransactionItem } from '../../types';

// ═══ Props ═══
interface ReceiptSummaryTabProps {
    /** Transaction items */
    items: PurchaseTransactionItem[];
    /** Current stage */
    currentStage: string;
    /** Loading state */
    isLoading?: boolean;
    /** Currency symbol */
    currency?: string;
    /** Additional className */
    className?: string;
}

// ═══ Receipt status helpers ═══
type ReceiptStatus = 'complete' | 'partial' | 'pending' | 'over';

function getReceiptStatus(item: PurchaseTransactionItem): ReceiptStatus {
    const received = item.received_qty || 0;
    const ordered = item.quantity || 0;

    if (ordered <= 0) return 'pending';
    if (received >= ordered) return received > ordered ? 'over' : 'complete';
    if (received > 0) return 'partial';
    return 'pending';
}

function getStatusConfig(status: ReceiptStatus, isRTL: boolean) {
    switch (status) {
        case 'complete':
            return {
                label: isRTL ? 'مكتمل' : 'Complete',
                icon: CheckCircle2,
                color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
                badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            };
        case 'partial':
            return {
                label: isRTL ? 'جزئي' : 'Partial',
                icon: AlertTriangle,
                color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
                badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            };
        case 'over':
            return {
                label: isRTL ? 'زيادة' : 'Over',
                icon: TrendingUp,
                color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
                badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            };
        case 'pending':
        default:
            return {
                label: isRTL ? 'بانتظار' : 'Pending',
                icon: Clock,
                color: 'text-gray-500 bg-gray-50 dark:bg-gray-800/50',
                badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            };
    }
}

// ═══ Component ═══
export const ReceiptSummaryTab: React.FC<ReceiptSummaryTabProps> = ({
    items,
    currentStage,
    isLoading = false,
    currency = '',
    className,
}) => {
    const { isRTL } = useLanguage();

    // ─── Computed totals ────────────────────
    const summary = useMemo(() => {
        let totalOrdered = 0;
        let totalReceived = 0;
        let totalReturned = 0;
        let completeCount = 0;
        let partialCount = 0;
        let pendingCount = 0;

        items.forEach(item => {
            totalOrdered += item.quantity || 0;
            totalReceived += item.received_qty || 0;
            totalReturned += item.returned_qty || 0;

            const status = getReceiptStatus(item);
            if (status === 'complete' || status === 'over') completeCount++;
            else if (status === 'partial') partialCount++;
            else pendingCount++;
        });

        const remaining = Math.max(0, totalOrdered - totalReceived);
        const progressPercent = totalOrdered > 0
            ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100))
            : 0;

        return {
            totalOrdered,
            totalReceived,
            totalReturned,
            remaining,
            progressPercent,
            completeCount,
            partialCount,
            pendingCount,
            itemCount: items.length,
        };
    }, [items]);

    // ─── Progress bar color ─────────────────
    const getProgressColor = (percent: number) => {
        if (percent >= 100) return 'bg-emerald-500';
        if (percent >= 50) return 'bg-amber-500';
        if (percent > 0) return 'bg-orange-500';
        return 'bg-gray-300 dark:bg-gray-600';
    };

    // ─── Loading ────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    // ─── Empty ──────────────────────────────
    if (items.length === 0) {
        return (
            <div className={cn("text-center py-12", className)}>
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isRTL ? 'لا توجد بنود لعرض ملخص الاستلام' : 'No items to show receipt summary'}
                </p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-5", className)} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ─── Summary Cards + Progress ───── */}
            <div className="space-y-3">
                {/* Progress bar */}
                <div className="space-y-2">
                    <div className={cn(
                        "flex items-center justify-between text-xs text-gray-500",
                        isRTL && "flex-row-reverse"
                    )}>
                        <span>{isRTL ? 'نسبة الاستلام' : 'Receipt Progress'}</span>
                        <span className="font-bold text-sm text-gray-800 dark:text-white">
                            {summary.progressPercent}%
                        </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                getProgressColor(summary.progressPercent),
                            )}
                            style={{ width: `${summary.progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                    <SummaryCard
                        icon={Package}
                        label={isRTL ? 'إجمالي المطلوب' : 'Total Ordered'}
                        value={summary.totalOrdered}
                        color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        icon={PackageCheck}
                        label={isRTL ? 'إجمالي المُستلم' : 'Total Received'}
                        value={summary.totalReceived}
                        color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        icon={PackageMinus}
                        label={isRTL ? 'المتبقي' : 'Remaining'}
                        value={summary.remaining}
                        color={summary.remaining > 0
                            ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                            : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                        }
                        isRTL={isRTL}
                        highlight={summary.remaining > 0}
                    />
                </div>

                {/* Status breakdown badges */}
                <div className={cn(
                    "flex items-center gap-2 flex-wrap",
                    isRTL && "flex-row-reverse"
                )}>
                    {summary.completeCount > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 gap-1 text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            {summary.completeCount} {isRTL ? 'مكتمل' : 'complete'}
                        </Badge>
                    )}
                    {summary.partialCount > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 gap-1 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            {summary.partialCount} {isRTL ? 'جزئي' : 'partial'}
                        </Badge>
                    )}
                    {summary.pendingCount > 0 && (
                        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {summary.pendingCount} {isRTL ? 'بانتظار' : 'pending'}
                        </Badge>
                    )}
                </div>
            </div>

            {/* ─── Detail Table ───────────────── */}
            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800">
                    <CardTitle className={cn(
                        "text-sm font-semibold flex items-center gap-2",
                        isRTL && "flex-row-reverse"
                    )}>
                        <Package className="w-4 h-4 text-gray-600" />
                        {isRTL ? 'تفصيل البنود' : 'Item Details'}
                        <Badge variant="secondary" className="text-[10px] font-mono">
                            {items.length} {isRTL ? 'بند' : 'items'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b">
                                    <th className={cn(
                                        "px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider",
                                        isRTL ? "text-right" : "text-left"
                                    )}>
                                        <Hash className="w-3 h-3 inline mr-1" />
                                        #
                                    </th>
                                    <th className={cn(
                                        "px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider",
                                        isRTL ? "text-right" : "text-left"
                                    )}>
                                        {isRTL ? 'المادة' : 'Material'}
                                    </th>
                                    <th className={cn(
                                        "px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider",
                                        isRTL ? "text-right" : "text-left"
                                    )}>
                                        <Palette className="w-3 h-3 inline mr-1" />
                                        {isRTL ? 'اللون' : 'Color'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                        <Ruler className="w-3 h-3 inline mr-1" />
                                        {isRTL ? 'الوحدة' : 'Unit'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                        {isRTL ? 'مطلوب' : 'Ordered'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                        {isRTL ? 'مُستلم' : 'Received'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                        {isRTL ? 'الفرق' : 'Variance'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                        {isRTL ? 'الحالة' : 'Status'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {items.map((item, index) => {
                                    const status = getReceiptStatus(item);
                                    const config = getStatusConfig(status, isRTL);
                                    const variance = (item.received_qty || 0) - (item.quantity || 0);
                                    const itemProgress = item.quantity > 0
                                        ? Math.min(100, Math.round(((item.received_qty || 0) / item.quantity) * 100))
                                        : 0;

                                    return (
                                        <tr
                                            key={item.id || index}
                                            className={cn(
                                                "hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
                                                status === 'complete' && "bg-emerald-50/20 dark:bg-emerald-950/10",
                                            )}
                                        >
                                            {/* # */}
                                            <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">
                                                {item.line_number || index + 1}
                                            </td>

                                            {/* Material */}
                                            <td className={cn(
                                                "px-3 py-2.5 font-medium text-gray-800 dark:text-gray-100",
                                                isRTL ? "text-right" : "text-left"
                                            )}>
                                                <div className="max-w-[200px] truncate">
                                                    {(isRTL ? item.description_ar : item.description) || item.item_code || '-'}
                                                </div>
                                            </td>

                                            {/* Color */}
                                            <td className={cn(
                                                "px-3 py-2.5 text-gray-600 dark:text-gray-300",
                                                isRTL ? "text-right" : "text-left"
                                            )}>
                                                {item.color_name || '-'}
                                            </td>

                                            {/* Unit */}
                                            <td className="px-3 py-2.5 text-center text-gray-500">
                                                {item.unit || '-'}
                                            </td>

                                            {/* Ordered */}
                                            <td className="px-3 py-2.5 text-center font-mono font-medium">
                                                {(item.quantity || 0).toLocaleString()}
                                            </td>

                                            {/* Received */}
                                            <td className="px-3 py-2.5 text-center font-mono font-medium">
                                                <span className={cn(
                                                    status === 'complete' && "text-emerald-600",
                                                    status === 'partial' && "text-amber-600",
                                                    status === 'over' && "text-blue-600",
                                                )}>
                                                    {(item.received_qty || 0).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* Variance */}
                                            <td className="px-3 py-2.5 text-center font-mono text-xs">
                                                <span className={cn(
                                                    variance === 0 && "text-gray-400",
                                                    variance > 0 && "text-blue-600",
                                                    variance < 0 && "text-red-500 font-semibold",
                                                )}>
                                                    {variance > 0 ? `+${variance}` : variance}
                                                </span>
                                                {/* Mini progress bar */}
                                                <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            getProgressColor(itemProgress),
                                                        )}
                                                        style={{ width: `${itemProgress}%` }}
                                                    />
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2.5 text-center">
                                                <Badge className={cn(
                                                    "text-[10px] gap-1 font-medium",
                                                    config.badgeClass,
                                                )}>
                                                    <config.icon className="w-3 h-3" />
                                                    {config.label}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Footer totals */}
                            <tfoot>
                                <tr className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700">
                                    <td colSpan={4} className={cn(
                                        "px-3 py-2.5 text-xs font-bold text-gray-600 uppercase",
                                        isRTL ? "text-right" : "text-left"
                                    )}>
                                        {isRTL ? 'الإجمالي' : 'Total'}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-800 dark:text-white">
                                        {summary.totalOrdered.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-600">
                                        {summary.totalReceived.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-mono font-bold">
                                        <span className={cn(
                                            summary.remaining === 0 ? "text-emerald-600" : "text-red-500"
                                        )}>
                                            {summary.remaining > 0 ? `-${summary.remaining}` : '0'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        <Badge className={cn(
                                            "text-[10px] font-mono",
                                            summary.progressPercent >= 100
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                        )}>
                                            {summary.progressPercent}%
                                        </Badge>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Returned items note ────────── */}
            {summary.totalReturned > 0 && (
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/10">
                    <CardContent className="p-3">
                        <div className={cn(
                            "flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400",
                            isRTL && "flex-row-reverse"
                        )}>
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                                {isRTL
                                    ? `تم إرجاع ${summary.totalReturned.toLocaleString()} وحدة من المواد`
                                    : `${summary.totalReturned.toLocaleString()} units have been returned`
                                }
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

interface SummaryCardProps {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
    isRTL: boolean;
    highlight?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    icon: Icon,
    label,
    value,
    color,
    isRTL,
    highlight = false,
}) => (
    <Card className={cn(
        "border shadow-sm transition-all",
        highlight && "ring-1 ring-amber-300 dark:ring-amber-700"
    )}>
        <CardContent className="p-3">
            <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
                <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    color
                )}>
                    <Icon className="w-4.5 h-4.5" />
                </div>
                <div className={cn("min-w-0", isRTL ? "text-right" : "text-left")}>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {label}
                    </p>
                    <p className="text-lg font-bold font-mono text-gray-800 dark:text-white">
                        {value.toLocaleString()}
                    </p>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default ReceiptSummaryTab;
