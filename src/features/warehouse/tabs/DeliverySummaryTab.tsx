/**
 * ════════════════════════════════════════════════════════════════
 * 📊 DeliverySummaryTab — ملخص التسليم
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DeliverySummaryTabProps {
    data: any;
    mode: string;
    onChange: (updates: any) => void;
}

export function DeliverySummaryTab({ data }: DeliverySummaryTabProps) {
    const { language, isRTL } = useLanguage();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;

    const sourceItems = data?.source_items || data?.source_document?.items || [];
    const selectedRolls = data?.selected_rolls || [];

    const summary = useMemo(() => {
        const byMaterial: Record<string, {
            name: string;
            required: number;
            selected: number;
            rollCount: number;
            colors: string[];
        }> = {};

        for (const si of sourceItems) {
            const matId = si.material_id || si.product_id || 'unknown';
            if (!byMaterial[matId]) {
                byMaterial[matId] = {
                    name: si.material_name_ar || si.material_name || si.description || matId.substring(0, 8),
                    required: 0,
                    selected: 0,
                    rollCount: 0,
                    colors: [],
                };
            }
            byMaterial[matId].required += Number(si.quantity) || 0;
        }

        for (const roll of selectedRolls) {
            const matId = roll.material_id;
            if (!byMaterial[matId]) {
                byMaterial[matId] = { name: matId.substring(0, 8), required: 0, selected: 0, rollCount: 0, colors: [] };
            }
            byMaterial[matId].selected += roll.net_length || 0;
            byMaterial[matId].rollCount += 1;
            if (roll.color_name && !byMaterial[matId].colors.includes(roll.color_name)) {
                byMaterial[matId].colors.push(roll.color_name);
            }
        }

        const totalRequired = Object.values(byMaterial).reduce((s, m) => s + m.required, 0);
        const totalSelected = Object.values(byMaterial).reduce((s, m) => s + m.selected, 0);
        const totalRolls = selectedRolls.length;
        const allFulfilled = Object.values(byMaterial).every(m => m.selected >= m.required * 0.99);

        return { byMaterial, totalRequired, totalSelected, totalRolls, allFulfilled };
    }, [sourceItems, selectedRolls]);

    return (
        <div className="p-4 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Overall Status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${summary.allFulfilled && summary.totalRolls > 0
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                    : summary.totalRolls > 0
                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800'
                }`}>
                {summary.allFulfilled && summary.totalRolls > 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : summary.totalRolls > 0 ? (
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                ) : (
                    <Truck className="w-6 h-6 text-gray-400" />
                )}
                <div>
                    <div className="font-bold text-sm">
                        {summary.allFulfilled && summary.totalRolls > 0
                            ? tl('✅ التسليم مكتمل — جاهز للتأكيد', '✅ Delivery complete — ready to confirm')
                            : summary.totalRolls > 0
                                ? tl('⏳ التسليم غير مكتمل — بعض المواد ناقصة', '⏳ Delivery incomplete — some materials missing')
                                : tl('📦 لم يتم اختيار أي رولونات بعد', '📦 No rolls selected yet')
                        }
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                        {tl(
                            `${summary.totalRolls} رولون | ${summary.totalSelected.toFixed(1)} م من ${summary.totalRequired.toFixed(1)} م`,
                            `${summary.totalRolls} rolls | ${summary.totalSelected.toFixed(1)}m of ${summary.totalRequired.toFixed(1)}m`
                        )}
                    </div>
                </div>
            </div>

            {/* Material Breakdown */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {tl('تفصيل المواد', 'Material Breakdown')}
                </h3>
                {Object.entries(summary.byMaterial).map(([matId, mat]) => {
                    const pct = mat.required > 0 ? (mat.selected / mat.required) * 100 : 0;
                    const isFulfilled = pct >= 99;
                    return (
                        <div key={matId} className="border rounded-lg p-3 bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                                <Package className={`w-5 h-5 ${isFulfilled ? 'text-green-500' : 'text-gray-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{mat.name}</div>
                                    {mat.colors.length > 0 && (
                                        <div className="text-[10px] text-gray-400">
                                            {mat.colors.join(', ')}
                                        </div>
                                    )}
                                </div>
                                <div className="text-end shrink-0">
                                    <div className="font-mono text-sm font-bold">
                                        <span className={isFulfilled ? 'text-green-600' : 'text-amber-600'}>
                                            {mat.selected.toFixed(1)}
                                        </span>
                                        <span className="text-gray-400"> / {mat.required.toFixed(1)} م</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">
                                        {mat.rollCount} {tl('رولون', 'rolls')}
                                    </Badge>
                                </div>
                            </div>
                            {/* Progress */}
                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${isFulfilled ? 'bg-green-400' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'
                                        }`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default DeliverySummaryTab;
