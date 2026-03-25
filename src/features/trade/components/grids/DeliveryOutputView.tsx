/**
 * ═══════════════════════════════════════════════════════════════
 * 🚚 Delivery Output View
 * ═══════════════════════════════════════════════════════════════
 * عرض تفاصيل الفاتورة المسلمة — المحجوزة + المسلمة + الرولونات
 * يظهر كقسم مطوي في صفحة الأصناف والتفاصيل
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    ChevronDown,
    ChevronRight,
    Truck,
    Scroll,
    Package,
    Ruler,
    Warehouse as WarehouseIcon,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useNumberFormat } from '@/hooks/useNumberFormat';

// ── Types ──
export interface DeliveryLineItem {
    id: string;
    material_id: string;
    material_code?: string;
    material_name_ar?: string;
    material_name_en?: string;
    quantity: number;
    delivered_qty: number;
    unit: string;
    unit_price: number;
    discount_percent?: number;
    discount_amount?: number;
    tax_rate?: number;
    tax_amount?: number;
    subtotal?: number;
    total?: number;
    cost_price?: number;
    warehouse_id?: string;
    warehouse_name_ar?: string;
    warehouse_name_en?: string;
    delivery_rolls?: {
        roll_id: string;
        roll_number: string;
        length: number;
        status: string;
        color_name?: string;
    }[];
}

interface DeliveryOutputViewProps {
    items: DeliveryLineItem[];
    currency: string;
    tradeMode?: 'sales' | 'purchase';
    defaultWarehouseNameAr?: string;
    defaultWarehouseNameEn?: string;
}

// ── Component ──
export function DeliveryOutputView({ items, currency, tradeMode = 'sales', defaultWarehouseNameAr, defaultWarehouseNameEn }: DeliveryOutputViewProps) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const getName = (ar?: string, en?: string) => isRTL ? (ar || en || '') : (en || ar || '');
    const { fmtAmount, fmtQty } = useNumberFormat();

    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    // Group items by material
    const materialGroups = useMemo(() => {
        const groups: Record<string, {
            materialId: string;
            materialName: string;
            materialCode: string;
            totalQty: number;
            totalDelivered: number;
            totalAmount: number;
            totalTax: number;
            totalRolls: number;
            items: DeliveryLineItem[];
        }> = {};

        items.forEach(item => {
            const key = item.material_id || item.id;
            if (!groups[key]) {
                groups[key] = {
                    materialId: key,
                    materialName: getName(item.material_name_ar, item.material_name_en),
                    materialCode: item.material_code || '',
                    totalQty: 0,
                    totalDelivered: 0,
                    totalAmount: 0,
                    totalTax: 0,
                    totalRolls: 0,
                    items: [],
                };
            }
            // Recalculate based on delivered qty
            const deliveredSubtotal = (item.delivered_qty || 0) * (item.unit_price || 0);
            const discountRate = (item.discount_percent || 0) / 100;
            const deliveredDiscount = deliveredSubtotal * discountRate;
            const deliveredNet = deliveredSubtotal - deliveredDiscount;
            const deliveredTax = deliveredNet * ((item.tax_rate || 0) / 100);

            groups[key].totalQty += item.quantity || 0;
            groups[key].totalDelivered += item.delivered_qty || 0;
            groups[key].totalAmount += deliveredNet;
            groups[key].totalTax += deliveredTax;
            groups[key].totalRolls += item.delivery_rolls?.length || 0;
            groups[key].items.push(item);
        });

        return Object.values(groups);
    }, [items, isRTL]);

    // Grand totals
    const grandTotals = useMemo(() => {
        return materialGroups.reduce((acc, g) => ({
            qty: acc.qty + g.totalQty,
            delivered: acc.delivered + g.totalDelivered,
            amount: acc.amount + g.totalAmount,
            tax: acc.tax + g.totalTax,
            rolls: acc.rolls + g.totalRolls,
        }), { qty: 0, delivered: 0, amount: 0, tax: 0, rolls: 0 });
    }, [materialGroups]);

    const toggleItem = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm">
                {t('لا توجد بنود مسلمة', 'No delivered items')}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* ═══ Header Stats ═══ */}
            <div className="flex items-center gap-3 flex-wrap px-1 mb-3">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 gap-1 text-xs">
                    <Package className="w-3 h-3" />
                    {materialGroups.length} {t('مادة', 'materials')}
                </Badge>
                <Badge className={cn(
                    "gap-1 text-xs",
                    grandTotals.delivered >= grandTotals.qty
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                )}>
                    <Truck className="w-3 h-3" />
                    {grandTotals.delivered.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                    /{grandTotals.qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                    <span className="text-[10px]">
                        ({Math.round((grandTotals.delivered / (grandTotals.qty || 1)) * 100)}%)
                    </span>
                </Badge>
                {grandTotals.rolls > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                        <Scroll className="w-3 h-3" />
                        {grandTotals.rolls} {t('رولون', 'rolls')}
                    </Badge>
                )}
            </div>

            {/* ═══ Column Header ═══ */}
            <div className="grid items-center text-[10px] font-medium text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 rounded-t-md border-b px-1
                grid-cols-[28px_1fr_80px_80px_70px_60px_100px]">
                <div />
                <div className="px-3 py-1.5">{t('المادة / المستودع', 'Material / Warehouse')}</div>
                <div className="py-1.5 text-center">{tradeMode === 'purchase' ? t('المطلوبة', 'Ordered') : t('المحجوزة', 'Reserved')}</div>
                <div className="py-1.5 text-center">{tradeMode === 'purchase' ? t('المستلمة', 'Received') : t('المسلمة', 'Delivered')}</div>
                <div className="py-1.5 text-center">{t('السعر', 'Price')}</div>
                <div className="py-1.5 text-center">{t('الخصم', 'Disc')}</div>
                <div className="py-1.5 text-end pe-3">{t('الإجمالي', 'Total')}</div>
            </div>

            {/* ═══ Material Groups ═══ */}
            <div className="space-y-0.5">
                {materialGroups.map(group => {
                    const deliveryPercent = group.totalQty > 0 ? Math.round((group.totalDelivered / group.totalQty) * 100) : 0;

                    return (
                        <div key={group.materialId} className="rounded-lg border overflow-hidden">
                            {group.items.map((item, idx) => {
                                const whName = getName(item.warehouse_name_ar || defaultWarehouseNameAr, item.warehouse_name_en || defaultWarehouseNameEn);
                                const hasRolls = (item.delivery_rolls?.length || 0) > 0;
                                const isExpanded = expandedItems.has(item.id);
                                // Recalculate based on delivered qty
                                const deliveredSubtotal = (item.delivered_qty || 0) * (item.unit_price || 0);
                                const discountRate = (item.discount_percent || 0) / 100;
                                const deliveredDiscount = deliveredSubtotal * discountRate;
                                const itemNet = deliveredSubtotal - deliveredDiscount;
                                const itemTax = itemNet * ((item.tax_rate || 0) / 100);
                                const itemDeliveryPercent = item.quantity > 0 ? Math.round(((item.delivered_qty || 0) / item.quantity) * 100) : 0;

                                return (
                                    <div key={item.id}>
                                        {/* Material header (first item only) */}
                                        {idx === 0 && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-gray-800/60 dark:to-gray-800/30 border-b">
                                                <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                <span className="text-sm font-bold truncate">{group.materialName}</span>
                                                {group.materialCode && (
                                                    <span className="text-[10px] font-mono text-gray-400">{group.materialCode}</span>
                                                )}
                                                <div className="flex items-center gap-1.5 ms-auto flex-shrink-0">
                                                    <Badge className={cn(
                                                        "text-[10px] gap-0.5",
                                                        deliveryPercent >= 99
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                                    )}>
                                                        <Truck className="w-3 h-3" />
                                                        {deliveryPercent}%
                                                    </Badge>
                                                    {group.totalRolls > 0 && (
                                                        <Badge variant="outline" className="text-[10px] gap-0.5 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300">
                                                            <Scroll className="w-3 h-3" />
                                                            {group.totalRolls}
                                                        </Badge>
                                                    )}
                                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono">
                                                        {fmtAmount(group.totalAmount)} {currency}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}

                                        {/* Item Row */}
                                        <div
                                            className={cn(
                                                "grid items-center text-sm transition-colors",
                                                "grid-cols-[28px_1fr_80px_80px_70px_60px_100px]",
                                                hasRolls && "cursor-pointer",
                                                hasRolls && !isExpanded && "hover:bg-blue-50/30 dark:hover:bg-blue-900/5",
                                                isExpanded && "bg-blue-50/40 dark:bg-blue-950/15",
                                                !hasRolls && "hover:bg-gray-50/50 dark:hover:bg-gray-800/20",
                                                idx < group.items.length - 1 && "border-b border-gray-100 dark:border-gray-800"
                                            )}
                                            onClick={() => hasRolls && toggleItem(item.id)}
                                        >
                                            {/* Expand icon */}
                                            <div className="flex justify-center">
                                                {hasRolls ? (
                                                    isExpanded
                                                        ? <ChevronDown className="w-4 h-4 text-blue-500" />
                                                        : <ChevronRight className="w-4 h-4 text-blue-400" />
                                                ) : (
                                                    <WarehouseIcon className="w-3.5 h-3.5 text-gray-300" />
                                                )}
                                            </div>

                                            {/* Warehouse / label */}
                                            <div className="px-3 py-2.5 flex items-center gap-2 min-w-0">
                                                <span className="truncate font-medium text-gray-600 dark:text-gray-300">{whName || t('مستودع رئيسي', 'Main WH')}</span>
                                                {hasRolls && (
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-300">
                                                        <Scroll className="w-2.5 h-2.5" />
                                                        {item.delivery_rolls!.length}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Reserved Qty */}
                                            <div className="py-2.5 text-center font-mono font-bold text-gray-600 dark:text-gray-300">
                                                {item.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                            </div>

                                            {/* Delivered Qty */}
                                            <div className="py-2.5 text-center">
                                                <span className={cn(
                                                    "font-mono font-bold",
                                                    itemDeliveryPercent >= 99
                                                        ? "text-green-600 dark:text-green-400"
                                                        : itemDeliveryPercent > 0
                                                            ? "text-amber-600 dark:text-amber-400"
                                                            : "text-gray-300"
                                                )}>
                                                    {(item.delivered_qty || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            {/* Unit Price */}
                                            <div className="py-2.5 text-center font-mono text-gray-600 dark:text-gray-300">
                                                {fmtAmount(item.unit_price)}
                                            </div>

                                            {/* Discount */}
                                            <div className="py-2.5 text-center">
                                                {(item.discount_percent || 0) > 0 ? (
                                                    <span className="text-xs font-mono text-amber-600 font-bold">{item.discount_percent}%</span>
                                                ) : (
                                                    <span className="text-xs text-gray-300">—</span>
                                                )}
                                            </div>

                                            {/* Total + Tax */}
                                            <div className="py-2 pe-3 text-end">
                                                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                                    {fmtAmount(itemNet)}
                                                </div>
                                                {itemTax > 0 && (
                                                    <div className="text-[10px] font-mono text-rose-500 dark:text-rose-400 mt-0.5">
                                                        +{fmtAmount(itemTax)}
                                                        <span className="text-rose-400/60 ms-0.5">({item.tax_rate || 0}%)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Expandable Rolls ── */}
                                        {isExpanded && hasRolls && (
                                            <div className="bg-blue-50/50 dark:bg-blue-950/15 border-t border-blue-100 dark:border-blue-900 px-6 py-3">
                                                <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                                                    <Scroll className="w-3.5 h-3.5" />
                                                    {tradeMode === 'purchase'
                                                        ? t('رولونات مدخلة للمستودع', 'Warehouse Input Rolls')
                                                        : t('رولونات مخرجة من المستودع', 'Warehouse Output Rolls')} ({item.delivery_rolls!.length})
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                    {item.delivery_rolls!.map((roll, ridx) => (
                                                        <div
                                                            key={roll.roll_id || ridx}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all",
                                                                roll.status === 'sold'
                                                                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                                                                    : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                                                            )}
                                                        >
                                                            <Scroll className={cn(
                                                                "w-3.5 h-3.5 flex-shrink-0",
                                                                roll.status === 'sold' ? "text-green-500" : "text-blue-400"
                                                            )} />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate font-semibold text-[11px]">{roll.roll_number}</div>
                                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                    <span>{roll.length?.toLocaleString('en-US', { maximumFractionDigits: 1 })} m</span>
                                                                    {roll.color_name && <span>• {roll.color_name}</span>}
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className={cn(
                                                                "text-[9px] h-4 px-1",
                                                                roll.status === 'sold' ? "border-green-300 text-green-600" : "border-gray-300 text-gray-500"
                                                            )}>
                                                                {roll.status === 'sold' ? t('مباع', 'sold')
                                                                    : roll.status === 'available' ? t('متاح', 'avail')
                                                                        : roll.status}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* ═══ Grand Totals ═══ */}
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
                <CardContent className="p-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">{t('إجمالي المبلغ', 'Subtotal')}</span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                {fmtAmount(grandTotals.amount)} {currency}
                            </span>
                        </div>
                        {grandTotals.tax > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-rose-500">{t('إجمالي الضريبة', 'Total Tax')}</span>
                                <span className="font-mono font-bold text-rose-500">
                                    +{fmtAmount(grandTotals.tax)} {currency}
                                </span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between items-center text-base font-bold">
                            <span>{t('الإجمالي النهائي', 'Grand Total')}</span>
                            <span className="font-mono text-lg text-emerald-700 dark:text-emerald-400">
                                {fmtAmount(grandTotals.amount + grandTotals.tax)} {currency}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
