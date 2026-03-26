/**
 * RollMovementsTab — سجل حركات الرولون
 * يعرض timeline لجميع الأحداث المتعلقة بالمادة (وببياناتها من fabric_rolls)
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { warehouseService } from '@/services/warehouseService';
import { cn } from '@/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Package,
    Ship,
    ShoppingCart,
    Truck,
    RefreshCw,
    Loader2,
    Inbox,
    DollarSign,
} from 'lucide-react';

interface RollMovementsTabProps {
    data: any;
    language?: string;
}

// Movement type config
const movementConfig: Record<string, {
    icon: any; color: string; bg: string; labelAr: string; labelEn: string; direction?: 'in' | 'out' | 'neutral';
}> = {
    container_receipt: { icon: Ship, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', labelAr: 'استلام من كونتينر', labelEn: 'Container Receipt', direction: 'in' },
    goods_receipt: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', labelAr: 'استلام بضاعة', labelEn: 'Goods Receipt', direction: 'in' },
    purchase_receipt: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', labelAr: 'استلام مشتريات', labelEn: 'Purchase Receipt', direction: 'in' },
    sale: { icon: ShoppingCart, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', labelAr: 'مبيعات', labelEn: 'Sale', direction: 'out' },
    sales_delivery: { icon: Truck, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', labelAr: 'تسليم مبيعات', labelEn: 'Sales Delivery', direction: 'out' },
    internal_transfer: { icon: ArrowRightLeft, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', labelAr: 'تحويل داخلي', labelEn: 'Internal Transfer', direction: 'neutral' },
    transfer: { icon: ArrowRightLeft, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', labelAr: 'تحويل', labelEn: 'Transfer', direction: 'neutral' },
    adjustment: { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', labelAr: 'تعديل مخزن', labelEn: 'Adjustment', direction: 'neutral' },
    write_off: { icon: TrendingDown, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', labelAr: 'شطب', labelEn: 'Write-Off', direction: 'out' },
    return: { icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', labelAr: 'مرتجع', labelEn: 'Return', direction: 'in' },
};

const getMovCfg = (type: string) => movementConfig[type] || {
    icon: Package, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800',
    labelAr: type, labelEn: type, direction: 'neutral' as const
};

function fmtDate(d?: string, isAr = false) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function fmtTime(d?: string, isAr = false) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString(isAr ? 'ar-u-nu-latn' : 'en-GB', {
        hour: '2-digit', minute: '2-digit',
    });
}

export function RollMovementsTab({ data, language: langProp }: RollMovementsTabProps) {
    const { language: ctxLang } = useLanguage();
    const { companyId } = useCompany();
    const lang = langProp || ctxLang;
    const isAr = lang === 'ar';

    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const roll = data || {};
    const materialId = roll.material_id;

    useEffect(() => {
        if (!companyId || !materialId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        warehouseService.getInventoryMovements(companyId, { materialId, limit: 100 })
            .then((result) => {
                setMovements(result);
            })
            .finally(() => setLoading(false));
    }, [companyId, materialId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-500">{isAr ? 'جار التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    if (movements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Inbox className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-base">{isAr ? 'لا توجد حركات مسجّلة' : 'No movements recorded'}</p>
                <p className="text-xs mt-1 opacity-60">
                    {isAr ? 'ستظهر هنا عند وجود استلام أو بيع أو تحويل' : 'Will appear when receipts, sales or transfers exist'}
                </p>
            </div>
        );
    }

    // Group by date
    const grouped: Record<string, any[]> = {};
    movements.forEach(m => {
        const date = m.movement_date?.substring(0, 10) || m.created_at?.substring(0, 10) || 'unknown';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(m);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first

    return (
        <div className="p-4 space-y-1">
            {/* Summary bar */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isAr
                        ? `${movements.length} حركة للمادة • ابتداءً من ${fmtDate(movements[movements.length - 1]?.movement_date, isAr)}`
                        : `${movements.length} movements for this material • Since ${fmtDate(movements[movements.length - 1]?.movement_date, isAr)}`}
                </span>
                <div className="ms-auto">
                    {/* Roll creation marker */}
                    <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        {isAr ? 'رولون: ' : 'Roll: '}{roll.roll_number}
                    </span>
                </div>
            </div>

            {/* Roll creation event (always first in timeline) */}
            <div className="relative ps-10 pb-4">
                <div className="absolute start-3 top-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="absolute start-[22px] top-9 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            {isAr ? '🎉 إنشاء الرولون' : '🎉 Roll Created'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                            {fmtDate(roll.created_at, isAr)}
                        </span>
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                        {isAr
                            ? `${roll.initial_length?.toFixed(1)} م • المستودع: ${roll.warehouse_name_ar || roll.warehouse?.name_ar || '—'}`
                            : `${roll.initial_length?.toFixed(1)} m • Warehouse: ${roll.warehouse?.name_en || roll.warehouse?.name_ar || '—'}`}
                    </div>
                    {roll.notes && (
                        <div className="text-xs text-amber-500 mt-0.5 font-mono">{roll.notes}</div>
                    )}
                </div>
            </div>

            {/* Timeline */}
            {sortedDates.map((date, dateIdx) => {
                const dayMovements = grouped[date];
                const isLastGroup = dateIdx === sortedDates.length - 1;
                return (
                    <div key={date}>
                        {/* Date header */}
                        <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm py-1.5 mb-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {fmtDate(date, isAr)}
                            </span>
                        </div>

                        {dayMovements.map((mov, movIdx) => {
                            const cfg = getMovCfg(mov.movement_type);
                            const Icon = cfg.icon;
                            const isLast = isLastGroup && movIdx === dayMovements.length - 1;
                            const qty = Number(mov.quantity) || 0;
                            const isIn = cfg.direction === 'in';
                            const isOut = cfg.direction === 'out';

                            return (
                                <div key={mov.id} className="relative ps-10 pb-3">
                                    {/* Circle */}
                                    <div className={cn(
                                        'absolute start-3 top-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950',
                                        cfg.bg, cfg.color
                                    )}>
                                        <Icon className="w-3 h-3" />
                                    </div>
                                    {/* Line */}
                                    {!isLast && (
                                        <div className="absolute start-[22px] top-9 bottom-0 w-px bg-gray-100 dark:bg-gray-800" />
                                    )}

                                    {/* Card */}
                                    <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                                                        {isAr ? cfg.labelAr : cfg.labelEn}
                                                    </span>
                                                    {mov.movement_number && (
                                                        <span className="text-xs font-mono text-gray-400">{mov.movement_number}</span>
                                                    )}
                                                </div>

                                                {/* Warehouse info */}
                                                <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 flex-wrap">
                                                    {mov.from_warehouse_name && (
                                                        <>
                                                            <span className="font-medium">{mov.from_warehouse_name}</span>
                                                            <span className="text-gray-300">→</span>
                                                        </>
                                                    )}
                                                    {mov.to_warehouse_name && (
                                                        <span className="font-medium text-emerald-600">{mov.to_warehouse_name}</span>
                                                    )}
                                                </div>

                                                {/* Reference */}
                                                {mov.reference_number && (
                                                    <div className="text-xs text-gray-400 mt-0.5 font-mono">
                                                        {mov.reference_type}: {mov.reference_number}
                                                    </div>
                                                )}
                                                {mov.notes && (
                                                    <div className="text-xs text-gray-400 mt-0.5 italic line-clamp-1">{mov.notes}</div>
                                                )}
                                            </div>

                                            {/* Quantity + Balance */}
                                            <div className="text-end flex-shrink-0">
                                                <div className={cn(
                                                    'text-sm font-bold font-mono',
                                                    isIn ? 'text-emerald-600' : isOut ? 'text-rose-600' : 'text-indigo-600'
                                                )}>
                                                    {isIn ? '+' : isOut ? '-' : ''}
                                                    {qty.toFixed(1)} م
                                                </div>
                                                {mov.balance_after != null && (
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        ← {Number(mov.balance_after).toFixed(1)}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {fmtTime(mov.created_at, isAr)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Current state pin */}
            <div className="relative ps-10 pt-1">
                <div className="absolute start-3 top-2 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {isAr ? '📍 الحالة الحالية' : '📍 Current State'}
                    </span>
                    <div className="text-xs text-blue-600 mt-1">
                        {isAr
                            ? `${roll.current_length?.toFixed(1)} م متبقي • ${roll.available_length?.toFixed(1)} م متاح`
                            : `${roll.current_length?.toFixed(1)} m remaining • ${roll.available_length?.toFixed(1)} m available`}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RollMovementsTab;
