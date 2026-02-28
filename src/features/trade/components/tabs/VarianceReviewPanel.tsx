/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 VarianceReviewPanel — لوحة مراجعة فروقات الاستلام
 * ═══════════════════════════════════════════════════════════════
 * تظهر عند وجود فروقات في استلام الكونتينر
 * يستخدمها المحاسب لاتخاذ قرار بخصوص كل فرق:
 * - تسامح (قبول الفرق)
 * - إرجاع (مرتجع للمورد)
 * - قيد فروقات (تسجيل محاسبي)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { resolveContainerVariances } from '@/features/trade/services/varianceResolutionService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertTriangle,
    CheckCircle2,
    Shield,
    Undo2,
    FileText,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Send,
    ClipboardCheck,
} from 'lucide-react';

// ═══ Types ═══

interface ContainerItemVariance {
    id: string;
    material_id: string;
    material_name: string;
    color_name: string | null;
    expected_quantity: number;
    received_quantity: number;
    variance_amount: number;
    variance_action: string | null;
    variance_resolved: boolean;
    unit_price: number;
    allocated_costs: number;
    final_unit_cost: number;
}

interface VarianceReviewPanelProps {
    containerId: string;
    containerNumber: string;
    varianceStatus: string | null; // 'pending_review' | 'reviewed' | null
    onReviewComplete?: () => void;
    readOnly?: boolean;
}

// ═══ Variance Action definitions ═══

const VARIANCE_ACTIONS = [
    {
        value: 'tolerance',
        label_ar: 'تسامح — قبول الفرق',
        label_en: 'Tolerance — Accept Variance',
        icon: Shield,
        color: 'text-emerald-600',
        description_ar: 'قبول الفرق بدون إجراء محاسبي',
        description_en: 'Accept variance without accounting action',
    },
    {
        value: 'journal_entry',
        label_ar: 'قيد فروقات',
        label_en: 'Variance Journal Entry',
        icon: FileText,
        color: 'text-blue-600',
        description_ar: 'إنشاء قيد محاسبي لتسجيل الفرق',
        description_en: 'Create journal entry to record the variance',
    },
    {
        value: 'return',
        label_ar: 'إرجاع للمورد',
        label_en: 'Return to Supplier',
        icon: Undo2,
        color: 'text-orange-600',
        description_ar: 'إنشاء مرتجع مشتريات للكمية الزائدة',
        description_en: 'Create purchase return for excess quantity',
    },
] as const;

// ═══ Component ═══

export const VarianceReviewPanel: React.FC<VarianceReviewPanelProps> = ({
    containerId,
    containerNumber,
    varianceStatus,
    onReviewComplete,
    readOnly = false,
}) => {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<ContainerItemVariance[]>([]);
    const [actions, setActions] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');

    // ─── Load container items with variances ─────────────
    useEffect(() => {
        async function loadItems() {
            setLoading(true);
            const { data, error } = await supabase
                .from('container_items')
                .select(`
                    id,
                    material_id,
                    color_name,
                    expected_quantity,
                    received_quantity,
                    variance_amount,
                    variance_action,
                    variance_resolved,
                    unit_price,
                    allocated_costs,
                    final_unit_cost,
                    materials:material_id (name_ar, name_en)
                `)
                .eq('container_id', containerId)
                .order('created_at');

            if (!error && data) {
                const mapped: ContainerItemVariance[] = data.map((d: any) => ({
                    id: d.id,
                    material_id: d.material_id,
                    material_name: isRTL
                        ? (d.materials?.name_ar || d.materials?.name_en || '')
                        : (d.materials?.name_en || d.materials?.name_ar || ''),
                    color_name: d.color_name,
                    expected_quantity: d.expected_quantity || 0,
                    received_quantity: d.received_quantity || 0,
                    variance_amount: d.variance_amount || 0,
                    variance_action: d.variance_action,
                    variance_resolved: d.variance_resolved || false,
                    unit_price: d.unit_price || 0,
                    allocated_costs: d.allocated_costs || 0,
                    final_unit_cost: d.final_unit_cost || 0,
                }));
                setItems(mapped);

                // Pre-fill existing actions
                const existingActions: Record<string, string> = {};
                mapped.forEach(m => {
                    if (m.variance_action) existingActions[m.id] = m.variance_action;
                });
                setActions(existingActions);
            }
            setLoading(false);
        }
        loadItems();
    }, [containerId, isRTL]);

    // ─── Items with variance ─────────────────────────────
    const itemsWithVariance = useMemo(
        () => items.filter(i => Math.abs(i.variance_amount) > 0.5), // threshold: 0.5m
        [items]
    );

    const itemsNoVariance = useMemo(
        () => items.filter(i => Math.abs(i.variance_amount) <= 0.5),
        [items]
    );

    // ─── Summary ─────────────────────────────────────────
    const summary = useMemo(() => {
        const totalExpected = items.reduce((s, i) => s + i.expected_quantity, 0);
        const totalReceived = items.reduce((s, i) => s + i.received_quantity, 0);
        const totalVariance = totalReceived - totalExpected;
        const totalVarianceValue = itemsWithVariance.reduce(
            (s, i) => s + (i.variance_amount * i.unit_price), 0
        );
        const allResolved = itemsWithVariance.every(i => actions[i.id]);
        return { totalExpected, totalReceived, totalVariance, totalVarianceValue, allResolved };
    }, [items, itemsWithVariance, actions]);

    // ─── Handle action change ────────────────────────────
    const handleActionChange = useCallback((itemId: string, action: string) => {
        setActions(prev => ({ ...prev, [itemId]: action }));
    }, []);

    // ─── Confirm Review ──────────────────────────────────
    const handleConfirmReview = useCallback(async () => {
        if (!summary.allResolved) {
            toast.warning(isRTL
                ? 'يرجى تحديد إجراء لكل بند يحتوي على فرق'
                : 'Please select an action for every item with variance'
            );
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            // Build items for the resolution service
            const varianceItems = itemsWithVariance.map(item => ({
                id: item.id,
                material_id: item.material_id,
                expected_quantity: item.expected_quantity,
                received_quantity: item.received_quantity,
                variance_amount: item.variance_amount,
                variance_action: actions[item.id],
                unit_price: item.unit_price,
                allocated_costs: item.allocated_costs,
                final_unit_cost: item.final_unit_cost,
            }));

            // Call the resolution service (recalculates costs, updates rolls, etc.)
            const result = await resolveContainerVariances(
                containerId,
                varianceItems,
                notes,
                user?.id || '',
            );

            if (result.success) {
                const toleranceCount = varianceItems.filter(i => i.variance_action === 'tolerance').length;
                toast.success(isRTL
                    ? `✅ تمت المراجعة — ${result.costsRecalculated} تكلفة مُحدّثة، ${result.rollsUpdated} رولون مُعدّل`
                    : `✅ Review complete — ${result.costsRecalculated} costs recalculated, ${result.rollsUpdated} rolls updated`
                );
                if (toleranceCount > 0) {
                    toast.info(isRTL
                        ? `📊 تم إعادة توزيع المصاريف على الكميات الفعلية لـ ${toleranceCount} مادة`
                        : `📊 Costs redistributed based on actual quantities for ${toleranceCount} items`
                    );
                }
                const jeCount = varianceItems.filter(i => i.variance_action === 'journal_entry').length;
                if (jeCount > 0 && result.journalEntryId) {
                    toast.info(isRTL
                        ? `📄 تم إنشاء قيد فروقات مخزون لـ ${jeCount} مادة`
                        : `📄 Inventory variance journal entry created for ${jeCount} items`
                    );
                }
            } else {
                toast.error(result.error || (isRTL ? 'خطأ في المعالجة' : 'Processing error'));
            }

            onReviewComplete?.();
        } catch (err: any) {
            console.error('Variance review error:', err);
            toast.error(isRTL ? 'خطأ في حفظ المراجعة' : 'Error saving review');
        } finally {
            setSaving(false);
        }
    }, [containerId, itemsWithVariance, actions, notes, summary.allResolved, isRTL, onReviewComplete]);

    // ─── Loading ─────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin me-2" />
                <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    // ─── No variance ─────────────────────────────────────
    if (itemsWithVariance.length === 0) {
        return (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <div>
                            <p className="font-medium text-emerald-700 dark:text-emerald-400">
                                {isRTL ? 'لا توجد فروقات — الكميات متطابقة' : 'No variances — quantities match'}
                            </p>
                            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-0.5">
                                {isRTL
                                    ? `إجمالي المستلم: ${summary.totalReceived.toLocaleString()} متر`
                                    : `Total received: ${summary.totalReceived.toLocaleString()} meters`
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isAlreadyReviewed = varianceStatus === 'reviewed';

    // ─── Render ──────────────────────────────────────────
    return (
        <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ─── Header Alert ─── */}
            <Card className={cn(
                "border-2",
                isAlreadyReviewed
                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
                    : "border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10"
            )}>
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        {isAlreadyReviewed
                            ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                            : <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        }
                        <div className="flex-1">
                            <p className="font-semibold text-sm">
                                {isAlreadyReviewed
                                    ? (isRTL ? '✅ تمت مراجعة الفروقات' : '✅ Variance Review Complete')
                                    : (isRTL ? '⚠️ يوجد فروقات تحتاج مراجعة المحاسب' : '⚠️ Variances require accountant review')
                                }
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isRTL
                                    ? `${itemsWithVariance.length} بند يحتوي على فرق — إجمالي الفرق: ${summary.totalVariance > 0 ? '+' : ''}${summary.totalVariance.toFixed(1)} متر`
                                    : `${itemsWithVariance.length} items with variance — Total: ${summary.totalVariance > 0 ? '+' : ''}${summary.totalVariance.toFixed(1)} meters`
                                }
                            </p>
                            {summary.totalVarianceValue !== 0 && (
                                <p className="text-xs font-mono mt-0.5">
                                    <span className="text-muted-foreground">
                                        {isRTL ? 'القيمة المالية:' : 'Financial impact:'}
                                    </span>{' '}
                                    <span className={summary.totalVarianceValue > 0 ? 'text-blue-600' : 'text-red-500'}>
                                        {summary.totalVarianceValue > 0 ? '+' : ''}{summary.totalVarianceValue.toFixed(2)} USD
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Variance Items Table ─── */}
            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        {isRTL ? 'بنود تحتاج مراجعة' : 'Items Requiring Review'}
                        <Badge variant="secondary" className="text-[10px]">
                            {itemsWithVariance.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b">
                                    <th className={cn("px-3 py-2.5 text-xs font-semibold text-gray-500", isRTL ? "text-right" : "text-left")}>
                                        {isRTL ? 'المادة' : 'Material'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">
                                        {isRTL ? 'متوقع' : 'Expected'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">
                                        {isRTL ? 'مستلم' : 'Received'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">
                                        {isRTL ? 'الفرق' : 'Variance'}
                                    </th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">
                                        {isRTL ? 'القيمة' : 'Value'}
                                    </th>
                                    {!readOnly && !isAlreadyReviewed && (
                                        <th className={cn("px-3 py-2.5 text-xs font-semibold text-gray-500 min-w-[200px]", isRTL ? "text-right" : "text-left")}>
                                            {isRTL ? 'الإجراء' : 'Action'}
                                        </th>
                                    )}
                                    {isAlreadyReviewed && (
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">
                                            {isRTL ? 'القرار' : 'Decision'}
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {itemsWithVariance.map(item => {
                                    const isExcess = item.variance_amount > 0;
                                    const varianceValue = item.variance_amount * item.unit_price;
                                    const selectedAction = actions[item.id] || item.variance_action || '';
                                    const actionDef = VARIANCE_ACTIONS.find(a => a.value === selectedAction);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                            {/* Material */}
                                            <td className={cn("px-3 py-2.5", isRTL ? "text-right" : "text-left")}>
                                                <div className="font-medium text-sm">{item.material_name}</div>
                                                {item.color_name && (
                                                    <div className="text-xs text-muted-foreground">{item.color_name}</div>
                                                )}
                                            </td>

                                            {/* Expected */}
                                            <td className="px-3 py-2.5 text-center font-mono text-sm">
                                                {item.expected_quantity.toLocaleString()}
                                            </td>

                                            {/* Received */}
                                            <td className="px-3 py-2.5 text-center font-mono text-sm font-semibold">
                                                {item.received_quantity.toLocaleString()}
                                            </td>

                                            {/* Variance */}
                                            <td className="px-3 py-2.5 text-center">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1 font-mono text-sm font-bold",
                                                    isExcess ? "text-blue-600" : "text-red-500"
                                                )}>
                                                    {isExcess
                                                        ? <ArrowUpRight className="w-3.5 h-3.5" />
                                                        : <ArrowDownRight className="w-3.5 h-3.5" />
                                                    }
                                                    {isExcess ? '+' : ''}{item.variance_amount.toFixed(1)}
                                                </div>
                                            </td>

                                            {/* Value */}
                                            <td className="px-3 py-2.5 text-center font-mono text-xs">
                                                <span className={varianceValue > 0 ? 'text-blue-600' : 'text-red-500'}>
                                                    {varianceValue > 0 ? '+' : ''}{varianceValue.toFixed(2)}
                                                </span>
                                            </td>

                                            {/* Action dropdown */}
                                            {!readOnly && !isAlreadyReviewed && (
                                                <td className="px-3 py-2.5">
                                                    <Select
                                                        value={selectedAction}
                                                        onValueChange={(v) => handleActionChange(item.id, v)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder={isRTL ? 'اختر الإجراء...' : 'Select action...'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {VARIANCE_ACTIONS.map(action => {
                                                                const Icon = action.icon;
                                                                return (
                                                                    <SelectItem key={action.value} value={action.value}>
                                                                        <div className="flex items-center gap-2">
                                                                            <Icon className={cn("w-3.5 h-3.5", action.color)} />
                                                                            <span>{isRTL ? action.label_ar : action.label_en}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            )}

                                            {/* Decision (reviewed) */}
                                            {isAlreadyReviewed && actionDef && (
                                                <td className="px-3 py-2.5 text-center">
                                                    <Badge className={cn("text-[10px] gap-1", actionDef.color)}>
                                                        <actionDef.icon className="w-3 h-3" />
                                                        {isRTL ? actionDef.label_ar.split('—')[0].trim() : actionDef.label_en.split('—')[0].trim()}
                                                    </Badge>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Items without variance (collapsed summary) ─── */}
            {itemsNoVariance.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                        {isRTL
                            ? `${itemsNoVariance.length} بند بدون فروقات — الكميات متطابقة`
                            : `${itemsNoVariance.length} items with no variance — quantities match`
                        }
                    </span>
                </div>
            )}

            {/* ─── Notes + Confirm Button ─── */}
            {!readOnly && !isAlreadyReviewed && (
                <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 space-y-3">
                        <Textarea
                            placeholder={isRTL
                                ? 'ملاحظات المحاسب على مراجعة الفروقات (اختياري)...'
                                : 'Accountant notes on variance review (optional)...'
                            }
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="min-h-[60px] text-sm"
                        />
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                                {summary.allResolved
                                    ? (
                                        <span className="text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {isRTL ? 'جميع البنود محددة — جاهز للتأكيد' : 'All items resolved — ready to confirm'}
                                        </span>
                                    )
                                    : (
                                        <span className="text-amber-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {isRTL
                                                ? `${itemsWithVariance.filter(i => !actions[i.id]).length} بند يحتاج تحديد إجراء`
                                                : `${itemsWithVariance.filter(i => !actions[i.id]).length} items need action`
                                            }
                                        </span>
                                    )
                                }
                            </div>
                            <Button
                                onClick={handleConfirmReview}
                                disabled={!summary.allResolved || saving}
                                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                            >
                                {saving
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <ClipboardCheck className="w-4 h-4" />
                                }
                                {isRTL ? 'تأكيد مراجعة الفروقات' : 'Confirm Variance Review'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default VarianceReviewPanel;
