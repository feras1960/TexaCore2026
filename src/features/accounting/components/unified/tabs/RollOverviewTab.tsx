/**
 * RollOverviewTab — تبويب نظرة عامة على الرولون
 * يعرض كامل تفاصيل الرولون: الأبعاد، الحالة، الموقع، التكلفة
 */

import { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Layers,
    Package,
    Warehouse,
    DollarSign,
    Hash,
    Calendar,
    MapPin,
    Ruler,
    Lock,
    CheckCircle,
    TrendingDown,
    Ship,
    FileText,
    Barcode,
} from 'lucide-react';

interface RollOverviewTabProps {
    data: any;
    language?: string;
}

// Status config
const statusConfig: Record<string, { label: string; labelAr: string; color: string; bg: string; icon: any }> = {
    available: { label: 'Available', labelAr: 'متاح', color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle },
    reserved: { label: 'Reserved', labelAr: 'محجوز', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Lock },
    partial: { label: 'Partially Used', labelAr: 'مستخدم جزئياً', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: TrendingDown },
    consumed: { label: 'Consumed', labelAr: 'منتهي', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: Package },
    sold: { label: 'Sold', labelAr: 'مباع', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: DollarSign },
};

function InfoRow({ icon: Icon, label, value, mono = false, className = '' }: {
    icon: any; label: string; value: any; mono?: boolean; className?: string;
}) {
    if (!value && value !== 0) return null;
    return (
        <div className={cn('flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0', className)}>
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
                <div className={cn('text-sm font-medium text-gray-900 dark:text-white break-all', mono && 'font-mono')}>
                    {value}
                </div>
            </div>
        </div>
    );
}

function LengthBar({ initial, current, reserved }: { initial: number; current: number; reserved: number }) {
    const usedPct = initial > 0 ? Math.min(100, ((initial - current) / initial) * 100) : 0;
    const resPct = initial > 0 ? Math.min(100, (reserved / initial) * 100) : 0;
    const availPct = Math.max(0, 100 - usedPct - resPct);

    return (
        <div className="space-y-2">
            {/* Bar */}
            <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                {usedPct > 0 && <div style={{ width: `${usedPct}%` }} className="bg-red-400 dark:bg-red-500 transition-all" />}
                {resPct > 0 && <div style={{ width: `${resPct}%` }} className="bg-amber-400 dark:bg-amber-500 transition-all" />}
                {availPct > 0 && <div style={{ width: `${availPct}%` }} className="bg-emerald-400 dark:bg-emerald-500 transition-all" />}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
                {usedPct > 0 && (
                    <span className="flex items-center gap-1.5 text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
                        {(initial - current).toFixed(1)} م مستخدم
                    </span>
                )}
                {resPct > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                        {reserved.toFixed(1)} م محجوز
                    </span>
                )}
                <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                    {Math.max(0, current - reserved).toFixed(1)} م متاح
                </span>
            </div>
        </div>
    );
}

export function RollOverviewTab({ data, language: langProp }: RollOverviewTabProps) {
    const { language: ctxLang } = useLanguage();
    const lang = langProp || ctxLang;
    const isAr = lang === 'ar';

    const roll = data || {};
    const status = statusConfig[roll.status] || statusConfig['available'];
    const StatusIcon = status.icon;

    const warehouseName = roll.warehouse_name_ar || roll.warehouse?.name_ar || roll.warehouse?.name_en || '—';
    const materialName = roll.material_name_ar || roll.material?.name_ar || roll.material?.name_en || '—';

    const costPerMeter = Number(roll.cost_per_meter) || 0;
    const totalCost = Number(roll.total_cost) || 0;
    const initialLength = Number(roll.initial_length) || 0;
    const currentLength = Number(roll.current_length) || 0;
    const reservedLength = Number(roll.reserved_length) || 0;
    const availableLength = Number(roll.available_length) || Math.max(0, currentLength - reservedLength);

    // Date formats
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : null;

    return (
        <div className="p-6 space-y-6">
            {/* ── Status Banner ── */}
            <div className={cn(
                'flex items-center gap-3 p-4 rounded-xl border',
                status.bg,
                'border-current/10'
            )}>
                <div className={cn('p-2.5 rounded-lg bg-white/60 dark:bg-black/20', status.color)}>
                    <StatusIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className={cn('font-semibold text-lg', status.color)}>
                        {isAr ? status.labelAr : status.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                        {roll.roll_number}
                    </div>
                </div>
                {roll.color_name && (
                    <Badge variant="outline" className="text-xs">
                        🎨 {roll.color_name}
                    </Badge>
                )}
            </div>

            {/* ── Length Bar ── */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-blue-500" />
                    {isAr ? 'رصيد الأمتار' : 'Length Status'}
                </h3>
                <LengthBar initial={initialLength} current={currentLength} reserved={reservedLength} />

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                        { label: isAr ? 'أصلي' : 'Initial', val: initialLength, color: 'text-gray-600' },
                        { label: isAr ? 'حالي' : 'Current', val: currentLength, color: 'text-blue-600' },
                        { label: isAr ? 'متاح' : 'Available', val: availableLength, color: 'text-emerald-600' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="text-center p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className={cn('text-xl font-bold font-mono', color)}>{val.toFixed(1)}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{isAr ? 'م ' : 'm '}{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Two columns: Info + Cost ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Basic Info */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-500" />
                        {isAr ? 'معلومات الرولون' : 'Roll Info'}
                    </h3>
                    <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
                        <InfoRow icon={Hash} label={isAr ? 'رقم الرولون' : 'Roll Number'} value={roll.roll_number} mono />
                        <InfoRow icon={Package} label={isAr ? 'المادة' : 'Material'} value={materialName} />
                        <InfoRow icon={Warehouse} label={isAr ? 'المستودع' : 'Warehouse'} value={warehouseName} />
                        <InfoRow icon={MapPin} label={isAr ? 'الموقع/الرف' : 'Bin Location'} value={roll.bin_location_code || roll.bin_location?.code} mono />
                        <InfoRow icon={Ruler} label={isAr ? 'العرض' : 'Width'} value={roll.width ? `${roll.width} م` : null} />
                        <InfoRow icon={Layers} label={isAr ? 'الوزن' : 'Weight'} value={roll.weight ? `${roll.weight} كغ` : null} />
                        <InfoRow icon={Calendar} label={isAr ? 'تاريخ الاستلام' : 'Receipt Date'} value={fmtDate(roll.receipt_date || roll.created_at)} />
                    </div>
                </div>

                {/* Right: Cost Info */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-purple-500" />
                        {isAr ? 'معلومات التكلفة' : 'Cost Info'}
                    </h3>
                    <div className="space-y-3">
                        {/* Cost breakdown */}
                        {[
                            { label: isAr ? 'تكلفة المورد/م' : 'Supplier Cost/m', val: roll.supplier_unit_cost, color: 'text-gray-700' },
                            { label: isAr ? 'تكلفة الشحن/م' : 'Landed Cost/m', val: roll.estimated_landed_cost, color: 'text-blue-600' },
                            { label: isAr ? 'المصاريف المخصصة' : 'Allocated Exp.', val: roll.allocated_expenses, color: 'text-orange-600' },
                            { label: isAr ? 'التكلفة النهائية/م' : 'Final Cost/m', val: roll.final_landed_cost || costPerMeter, color: 'text-purple-700', bold: true },
                        ].filter(i => i.val != null && i.val !== undefined).map(item => (
                            <div key={item.label} className={cn(
                                'flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0',
                                item.bold && 'font-semibold border-t border-gray-200 dark:border-gray-700 pt-2 mt-1'
                            )}>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                                <span className={cn('text-sm font-mono', item.color, item.bold && 'text-base')}>
                                    {Number(item.val).toFixed(4)}
                                </span>
                            </div>
                        ))}

                        {/* Total cost block */}
                        <div className="mt-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-purple-700 dark:text-purple-300">
                                    {isAr ? 'إجمالي التكلفة' : 'Total Roll Cost'}
                                </span>
                                <span className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300">
                                    {totalCost.toFixed(2)}
                                </span>
                            </div>
                            <div className="text-xs text-purple-500 mt-1">
                                {initialLength.toFixed(1)} م × {costPerMeter.toFixed(4)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Source / Container ── */}
            {(roll.container_id || roll.notes) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-4">
                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                        <Ship className="w-4 h-4" />
                        {isAr ? 'مصدر الرولون' : 'Roll Source'}
                    </h3>
                    <div className="space-y-0 divide-y divide-blue-100 dark:divide-blue-800">
                        {roll.notes && (
                            <InfoRow icon={FileText} label={isAr ? 'مرجع الاستلام' : 'GRN Reference'} value={roll.notes} mono />
                        )}
                        {roll.barcode && (
                            <InfoRow icon={Barcode} label={isAr ? 'الباركود' : 'Barcode'} value={roll.barcode} mono />
                        )}
                        {roll.rfid_tag && (
                            <InfoRow icon={Hash} label="RFID" value={roll.rfid_tag} mono />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RollOverviewTab;
