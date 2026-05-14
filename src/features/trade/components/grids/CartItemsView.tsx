/**
 * 🧾 CartItemsView — Invoice Line Items in Cart-Style Grouped Display
 * عرض أسطر الفاتورة بنمط السلة المجمّع حسب المادة
 *
 * ✅ Grouped by material_id with warehouse sub-rows
 * ✅ Price History — آخر 5 أسعار لكل مادة لنفس العميل
 * ✅ Inline quantity/price editing
 * ✅ Per-item currency & exchange rate
 * ✅ Preferred rolls display
 * ✅ Auto-subtotal calculation
 * ✅ Sticky totals footer
 * ✅ RTL support
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Package,
    Warehouse as WarehouseIcon,
    Ruler,
    Scroll,
    Heart,
    Check,
    Minus,
    Plus,
    Trash2,
    X,
    GripVertical,
    Edit3,
    AlertCircle,
    Percent,
    Tag,
    DollarSign,
    ArrowLeftRight,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PriceHistoryPopover } from '@/features/trade/components/PriceHistoryPopover';
import { useNumberFormat } from '@/hooks/useNumberFormat';

// ─── Types ───────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
    id: string;
    material_id: string;
    material_code: string;
    material_name_ar: string;
    material_name_en?: string;
    /** variant support — links to product_variants.id */
    variant_id?: string;
    variant_name_ar?: string;
    variant_name_en?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_percent?: number;
    discount_amount?: number;
    tax_rate?: number;
    tax_amount?: number;
    subtotal: number;
    total: number;
    currency: string;
    exchange_rate?: number;
    warehouse_id: string;
    warehouse_name_ar: string;
    warehouse_name_en?: string;
    available_stock?: number;
    preferred_rolls?: {
        roll_id: string;
        roll_number: string;
        available_length: number;
    }[];
    roll_id?: string;
    roll_number?: string;
    available_length?: number;
    notes?: string;
}

export interface CartItemsViewProps {
    items: InvoiceLineItem[];
    onItemsChange: (items: InvoiceLineItem[]) => void;
    readOnly?: boolean;
    currency?: string;
    /** The company's base currency for exchange rate reference */
    companyCurrency?: string;
    showDiscount?: boolean;
    showTax?: boolean;
    /** Customer ID for price history lookup */
    customerId?: string;
    /** International purchase — tax is 0 on invoice, paid later via container */
    isInternational?: boolean;
    /** Hide all financial columns (price, discount, total) — used for transfer mode */
    hideFinancials?: boolean;
    /** Optional price resolver from customer pricing — applies smart pricing when qty changes */
    priceResolver?: (materialId: string, qty: number, baseSellPrice: number) => {
        unitPrice: number;
        discountPercent: number;
        priceAfterDiscount: number;
        source: 'price_list' | 'base_price' | 'manual';
        priceListName: string;
        quantityBreakApplied: boolean;
    };
}

// ─── Grouped Material Type ──────────────────────────────────────────────

interface MaterialGroup {
    materialId: string;
    materialName: string;
    materialCode: string;
    items: InvoiceLineItem[];
    groupQty: number;
    groupSubtotal: number;
    groupTotal: number;
}

// ═════════════════════════════════════════════════════════════════════════
// CartItemsView Component
// ═════════════════════════════════════════════════════════════════════════

export const CartItemsView: React.FC<CartItemsViewProps> = ({
    items,
    onItemsChange,
    readOnly = false,
    currency = 'SAR',
    companyCurrency = 'SAR',
    showDiscount = true,
    showTax = false,
    customerId,
    isInternational = false,
    hideFinancials = false,
    priceResolver,
}) => {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isAr = language === 'ar';

    const t = (ar: string, en: string) => isAr ? ar : en;
    const getName = (nameAr: string, nameEn?: string) => isAr ? nameAr : (nameEn || nameAr);
    const { fmtAmount, fmtQty } = useNumberFormat();

    // ─── Editing State ───
    const [editingQty, setEditingQty] = useState<string | null>(null);
    const [editingPrice, setEditingPrice] = useState<string | null>(null);
    const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
    const [editingNotes, setEditingNotes] = useState<string | null>(null);
    const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [tempCurrency, setTempCurrency] = useState('');
    const [tempExchangeRate, setTempExchangeRate] = useState('1');

    // ─── Group items by material_id ───
    const groupedItems: MaterialGroup[] = useMemo(() => {
        const map = new Map<string, InvoiceLineItem[]>();

        items.forEach(item => {
            if (!map.has(item.material_id)) {
                map.set(item.material_id, []);
            }
            map.get(item.material_id)!.push(item);
        });

        const groups: MaterialGroup[] = [];
        map.forEach((groupItems, materialId) => {
            const first = groupItems[0];
            groups.push({
                materialId,
                materialName: getName(first.material_name_ar, first.material_name_en),
                materialCode: first.material_code,
                items: groupItems,
                groupQty: groupItems.reduce((s, i) => s + i.quantity, 0),
                groupSubtotal: groupItems.reduce((s, i) => s + i.subtotal, 0),
                groupTotal: groupItems.reduce((s, i) => s + (i.total || i.subtotal), 0),
            });
        });

        return groups;
    }, [items, isAr]);

    // ─── Totals ───
    const grandTotals = useMemo(() => ({
        items: items.length,
        materials: groupedItems.length,
        quantity: items.reduce((s, i) => s + i.quantity, 0),
        subtotal: items.reduce((s, i) => s + i.subtotal, 0),
        discount: items.reduce((s, i) => s + (i.discount_amount || 0), 0),
        tax: items.reduce((s, i) => s + (i.tax_amount || 0), 0),
        total: items.reduce((s, i) => s + (i.total || i.subtotal), 0),
    }), [items, groupedItems]);

    // ─── Update Helpers ───
    const updateItem = useCallback((id: string, updates: Partial<InvoiceLineItem>) => {
        const newItems = items.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };

            // Apply smart pricing when quantity changes and priceResolver exists
            if (priceResolver && (updates.quantity !== undefined)) {
                const resolved = priceResolver(
                    updated.material_id,
                    updated.quantity,
                    updated.unit_price
                );
                // Only apply if from a price list (not fallback base price)
                if (resolved.source === 'price_list') {
                    updated.unit_price = resolved.unitPrice;
                }
            }

            // Recalculate — use item's stored tax_rate (from material or company fallback)
            // 🌍 International: force tax to 0
            const effectiveTaxRate = isInternational ? 0 : (updated.tax_rate || 0);
            const discountAmount = (updated.discount_percent || 0) / 100 * updated.quantity * updated.unit_price;
            updated.discount_amount = discountAmount;
            updated.subtotal = updated.quantity * updated.unit_price;
            const netAfterDiscount = updated.subtotal - discountAmount;
            updated.tax_rate = effectiveTaxRate;
            updated.tax_amount = (effectiveTaxRate > 0 && netAfterDiscount > 0)
                ? Math.round(netAfterDiscount * (effectiveTaxRate / 100) * 100) / 100
                : 0;
            updated.total = netAfterDiscount + updated.tax_amount;
            return updated;
        });
        onItemsChange(newItems);
    }, [items, onItemsChange, priceResolver, isInternational]);

    const removeItem = useCallback((id: string) => {
        onItemsChange(items.filter(i => i.id !== id));
    }, [items, onItemsChange]);

    // ─── Field Editing Handlers ───
    const startEdit = (id: string, field: 'qty' | 'price' | 'discount' | 'notes', value: string) => {
        setTempValue(value);
        if (field === 'qty') setEditingQty(id);
        if (field === 'price') setEditingPrice(id);
        if (field === 'discount') setEditingDiscount(id);
        if (field === 'notes') setEditingNotes(id);
    };

    const confirmEdit = (id: string, field: 'qty' | 'price' | 'discount' | 'notes') => {
        const val = parseFloat(tempValue);
        if (field === 'qty' && val > 0) updateItem(id, { quantity: val });
        if (field === 'price' && val >= 0) updateItem(id, { unit_price: val });
        if (field === 'discount') updateItem(id, { discount_percent: Math.min(100, Math.max(0, val || 0)) });
        if (field === 'notes') updateItem(id, { notes: tempValue });
        setEditingQty(null);
        setEditingPrice(null);
        setEditingDiscount(null);
        setEditingNotes(null);
    };

    // ─── Currency & Exchange Rate Editing ───
    const startEditCurrency = (id: string, cur: string, rate: number) => {
        setEditingCurrency(id);
        setTempCurrency(cur);
        setTempExchangeRate(String(rate || 1));
    };

    const confirmCurrencyEdit = (id: string) => {
        const rate = parseFloat(tempExchangeRate);
        updateItem(id, {
            currency: tempCurrency || companyCurrency,
            exchange_rate: rate > 0 ? rate : 1,
        });
        setEditingCurrency(null);
    };

    const cancelCurrencyEdit = () => {
        setEditingCurrency(null);
    };

    const handleQtyDelta = (id: string, delta: number) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const newQty = Math.max(0.1, item.quantity + delta);
        if (item.available_stock && newQty > item.available_stock) return;
        updateItem(id, { quantity: newQty });
    };

    // ═══════════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════════

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 shadow-inner">
                    <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-base font-bold text-gray-600 dark:text-gray-400 mb-1">
                    {t('لا توجد أصناف', 'No Items')}
                </h3>
                <p className="text-sm text-gray-400 max-w-[280px]">
                    {t(
                        'أضف مواد من السلة أو استخدم إدخال سريع',
                        'Add materials from cart or use quick entry'
                    )}
                </p>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-4">
                {/* ════════ Summary Bar (hidden in transfer mode — info shown in transfer status bar) ════════ */}
                {!hideFinancials && (
                <div className={cn("grid gap-3", "grid-cols-2 sm:grid-cols-4")}>
                    <SummaryMiniCard
                        label={t('المواد', 'Materials')}
                        value={String(grandTotals.materials)}
                        icon={<Package className="w-4 h-4" />}
                        color="indigo"
                    />
                    <SummaryMiniCard
                        label={t('إجمالي الكمية', 'Total Qty')}
                        value={fmtQty(grandTotals.quantity)}
                        icon={<Ruler className="w-4 h-4" />}
                        color="blue"
                    />
                    {showDiscount && grandTotals.discount > 0 && (
                        <SummaryMiniCard
                            label={t('الخصم', 'Discount')}
                            value={`-${fmtAmount(grandTotals.discount)}`}
                            icon={<Tag className="w-4 h-4" />}
                            color="orange"
                        />
                    )}
                    <SummaryMiniCard
                        label={grandTotals.tax > 0 ? t('الإجمالي شامل الضريبة', 'Total incl. Tax') : t('الإجمالي', 'Total')}
                        value={`${fmtAmount(grandTotals.total)} ${currency}`}
                        icon={<Check className="w-4 h-4" />}
                        color="green"
                    />
                </div>
                )}

                {/* ════════ Grouped Items ════════ */}
                <div className="space-y-3">
                    <AnimatePresence>
                        {groupedItems.map((group, groupIdx) => (
                            <motion.div
                                key={group.materialId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, delay: groupIdx * 0.05 }}
                                className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
                            >
                                {/* ═══ Material Header ═══ */}
                                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-800/60 dark:to-gray-800/40 px-4 py-3 border-b">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">{group.materialName}</h3>
                                                <span className="text-[11px] text-gray-500 font-mono">{group.materialCode}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="text-xs font-mono gap-1 bg-white dark:bg-gray-800">
                                                <WarehouseIcon className="w-3 h-3" />
                                                {group.items.length} {t('مستودع', 'wh')}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs font-mono gap-1 bg-white dark:bg-gray-800">
                                                <Ruler className="w-3 h-3" />
                                                {fmtQty(group.groupQty)}
                                            </Badge>

                                            {!hideFinancials && (
                                                <Badge className="text-xs font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                    {fmtAmount(group.groupTotal)} {currency}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ═══ Column Sub-Header ═══ */}
                                <div className={cn(
                                    "grid items-center text-[10px] font-medium text-gray-400 border-b bg-gray-50/50 dark:bg-gray-800/30",
                                    hideFinancials
                                        ? "grid-cols-[1fr_140px_40px]"
                                        : showDiscount
                                            ? "grid-cols-[1fr_140px_20px_90px_80px_20px_100px_40px]"
                                            : "grid-cols-[1fr_140px_20px_90px_20px_100px_40px]"
                                )}>
                                    <div className="px-4 py-1.5">{t('المستودع', 'Warehouse')}</div>
                                    <div className="px-2 py-1.5 text-center">{t('الكمية', 'Qty')}</div>
                                    {!hideFinancials && <div />}
                                    {!hideFinancials && <div className="px-2 py-1.5 text-center">{t('السعر', 'Price')}</div>}
                                    {!hideFinancials && showDiscount && <div className="px-2 py-1.5 text-center">{t('الخصم %', 'Disc %')}</div>}
                                    {!hideFinancials && <div />}
                                    {!hideFinancials && <div className="px-2 py-1.5 text-end">{t('المجموع', 'Total')}</div>}
                                    <div />
                                </div>

                                {/* ═══ Warehouse Sub-items ═══ */}
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {group.items.map((item) => {
                                        const whName = getName(item.warehouse_name_ar, item.warehouse_name_en);
                                        const isQtyEdit = editingQty === item.id;
                                        const isPriceEdit = editingPrice === item.id;
                                        const isDiscountEdit = editingDiscount === item.id;
                                        const preferredCount = item.preferred_rolls?.length || 0;

                                        return (
                                            <div key={item.id} className="group">
                                                {/* ── Row ── */}
                                                <div className={cn(
                                                    "grid items-center hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors",
                                                    hideFinancials
                                                        ? "grid-cols-[1fr_140px_40px]"
                                                        : showDiscount
                                                            ? "grid-cols-[1fr_140px_20px_90px_80px_20px_100px_40px]"
                                                            : "grid-cols-[1fr_140px_20px_90px_20px_100px_40px]"
                                                )}>
                                                    {/* Warehouse Name */}
                                                    <div className="px-4 py-3 flex items-center gap-2 min-w-0">
                                                        <WarehouseIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span className="text-sm font-medium truncate">{whName}</span>
                                                        {item.available_stock && (
                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                ({t('متاح', 'avail')}: {item.available_stock.toLocaleString('en-US')})
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Quantity */}
                                                    <div className="px-2 py-3 flex items-center justify-center">
                                                        {readOnly ? (
                                                            <span className="text-sm font-mono font-bold">
                                                                {fmtQty(item.quantity)}
                                                                <span className="text-[10px] text-gray-400 ms-1">{item.unit}</span>
                                                            </span>
                                                        ) : isQtyEdit ? (
                                                            <div className="flex items-center gap-0.5">
                                                                <Input
                                                                    type="number"
                                                                    value={tempValue}
                                                                    onChange={(e) => setTempValue(e.target.value)}
                                                                    className="h-7 w-20 text-xs font-mono text-center px-1"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') confirmEdit(item.id, 'qty');
                                                                        if (e.key === 'Escape') setEditingQty(null);
                                                                    }}
                                                                />
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600"
                                                                    onClick={() => confirmEdit(item.id, 'qty')}>
                                                                    <Check className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-md px-1">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                                                    onClick={() => handleQtyDelta(item.id, -10)}
                                                                    disabled={item.quantity <= 0.1}>
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            onClick={() => startEdit(item.id, 'qty', String(item.quantity))}
                                                                            className="text-sm font-mono font-bold min-w-[50px] text-center hover:text-emerald-600 hover:underline transition-colors cursor-text"
                                                                        >
                                                                            {fmtQty(item.quantity)}
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="text-xs">
                                                                        {t('انقر للتعديل', 'Click to edit')}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                                                    onClick={() => handleQtyDelta(item.id, 10)}
                                                                    disabled={!!item.available_stock && item.quantity >= item.available_stock}>
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                                <span className="text-[10px] text-gray-400 ms-0.5">{item.unit}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ═══ Financial Columns — hidden in transfer mode ═══ */}
                                                    {!hideFinancials && (
                                                        <>
                                                            {/* × */}
                                                            <span className="text-gray-300 text-xs text-center">×</span>

                                                            {/* Unit Price */}
                                                            <div className="px-2 py-3 text-center">
                                                                {readOnly ? (
                                                                    <span className="text-sm font-mono">{fmtAmount(item.unit_price)}</span>
                                                                ) : isPriceEdit ? (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <Input
                                                                            type="number"
                                                                            value={tempValue}
                                                                            onChange={(e) => setTempValue(e.target.value)}
                                                                            className="h-7 w-20 text-xs font-mono text-center px-1"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') confirmEdit(item.id, 'price');
                                                                                if (e.key === 'Escape') setEditingPrice(null);
                                                                            }}
                                                                        />
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600"
                                                                            onClick={() => confirmEdit(item.id, 'price')}>
                                                                            <Check className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                onClick={() => startEdit(item.id, 'price', String(item.unit_price))}
                                                                                className="text-sm font-mono hover:text-emerald-600 hover:underline transition-colors cursor-text"
                                                                            >
                                                                                {fmtAmount(item.unit_price)}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">
                                                                            {t('سعر الوحدة — انقر للتعديل', 'Unit price — Click to edit')}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                {/* Price History Icon */}
                                                                {!readOnly && (
                                                                    <PriceHistoryPopover
                                                                        materialId={item.material_id}
                                                                        customerId={customerId}
                                                                        currentPrice={item.unit_price}
                                                                        currency={currency}
                                                                        onApplyPrice={(price) => {
                                                                            updateItem(item.id, { unit_price: price });
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Discount % */}
                                                            {showDiscount && (
                                                                <div className="px-2 py-3 text-center">
                                                                    {readOnly ? (
                                                                        <span className="text-xs font-mono text-amber-600">{item.discount_percent || 0}%</span>
                                                                    ) : isDiscountEdit ? (
                                                                        <div className="flex items-center gap-0.5">
                                                                            <Input
                                                                                type="number"
                                                                                value={tempValue}
                                                                                onChange={(e) => setTempValue(e.target.value)}
                                                                                className="h-7 w-16 text-xs font-mono text-center px-1"
                                                                                autoFocus
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') confirmEdit(item.id, 'discount');
                                                                                    if (e.key === 'Escape') setEditingDiscount(null);
                                                                                }}
                                                                            />
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600"
                                                                                onClick={() => confirmEdit(item.id, 'discount')}>
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <button
                                                                                    onClick={() => startEdit(item.id, 'discount', String(item.discount_percent || 0))}
                                                                                    className={cn(
                                                                                        "text-xs font-mono transition-colors cursor-text",
                                                                                        (item.discount_percent || 0) > 0
                                                                                            ? "text-amber-600 font-bold hover:text-amber-700"
                                                                                            : "text-gray-400 hover:text-amber-500"
                                                                                    )}
                                                                                >
                                                                                    {item.discount_percent || 0}%
                                                                                </button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top" className="text-xs">
                                                                                {t('نسبة الخصم — انقر للتعديل', 'Discount % — Click to edit')}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* = */}
                                                            <span className="text-gray-300 text-xs text-center">=</span>

                                                            {/* Total (net after discount, before tax) */}
                                                            <div className="px-2 py-3 text-end">
                                                                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                                                    {fmtAmount((item.subtotal || 0) - (item.discount_amount || 0))}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Delete */}
                                                    <div className="px-2 py-3 text-center">
                                                        {!readOnly && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                                        onClick={() => removeItem(item.id)}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="text-xs">
                                                                    {t('حذف', 'Remove')}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>



                                                {/* ── Preferred Rolls ── */}
                                                {preferredCount > 0 && (
                                                    <div className="px-4 pb-2.5 -mt-1">
                                                        <div className="ms-6 flex flex-wrap items-center gap-1.5">
                                                            <Heart className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                {t('رولونات مفضلة:', 'Preferred:')}
                                                            </span>
                                                            {item.preferred_rolls!.map(roll => (
                                                                <Badge
                                                                    key={roll.roll_id}
                                                                    variant="outline"
                                                                    className="text-[10px] h-5 px-1.5 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 gap-1 font-mono"
                                                                >
                                                                    <Scroll className="w-2.5 h-2.5" />
                                                                    {roll.roll_number}
                                                                    <span className="text-emerald-400">
                                                                        ({roll.available_length.toLocaleString('en-US')})
                                                                    </span>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── Notes ── */}
                                                {item.notes && (
                                                    <div className="px-4 pb-2 -mt-1">
                                                        <p className="ms-6 text-[11px] text-gray-400 italic">
                                                            📝 {item.notes}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* ── Currency & Exchange Rate (hidden in transfer mode) ── */}
                                                {!hideFinancials && (
                                                    <div className="px-4 pb-2.5 -mt-1">
                                                        <div className="ms-6 flex items-center gap-2">
                                                            {editingCurrency === item.id ? (
                                                                /* Edit mode */
                                                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                                                                    <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                                                                    <Input
                                                                        value={tempCurrency}
                                                                        onChange={(e) => setTempCurrency(e.target.value.toUpperCase())}
                                                                        className="h-6 w-16 text-xs font-mono text-center px-1"
                                                                        placeholder="USD"
                                                                        autoFocus
                                                                        dir="ltr"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') confirmCurrencyEdit(item.id);
                                                                            if (e.key === 'Escape') cancelCurrencyEdit();
                                                                        }}
                                                                    />
                                                                    {tempCurrency !== companyCurrency && (
                                                                        <>
                                                                            <ArrowLeftRight className="w-3 h-3 text-blue-400" />
                                                                            <span className="text-[10px] text-blue-500">
                                                                                {t('سعر التصريف', 'Rate')}:
                                                                            </span>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.0001"
                                                                                value={tempExchangeRate}
                                                                                onChange={(e) => setTempExchangeRate(e.target.value)}
                                                                                className="h-6 w-20 text-xs font-mono text-center px-1"
                                                                                dir="ltr"
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') confirmCurrencyEdit(item.id);
                                                                                    if (e.key === 'Escape') cancelCurrencyEdit();
                                                                                }}
                                                                            />
                                                                            <span className="text-[10px] text-blue-400 font-mono">{companyCurrency}</span>
                                                                        </>
                                                                    )}
                                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-emerald-600"
                                                                        onClick={() => confirmCurrencyEdit(item.id)}>
                                                                        <Check className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400"
                                                                        onClick={cancelCurrencyEdit}>
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                /* Display mode */
                                                                <button
                                                                    onClick={() => !readOnly && startEditCurrency(item.id, item.currency || currency, item.exchange_rate || 1)}
                                                                    disabled={readOnly}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors",
                                                                        readOnly
                                                                            ? "cursor-default"
                                                                            : "hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer",
                                                                        (item.currency && item.currency !== companyCurrency)
                                                                            ? "text-blue-600 dark:text-blue-400 font-semibold"
                                                                            : "text-gray-400"
                                                                    )}
                                                                >
                                                                    <DollarSign className="w-3 h-3" />
                                                                    <span className="font-mono">{item.currency || currency}</span>
                                                                    {item.currency && item.currency !== companyCurrency && (item.exchange_rate || 0) !== 1 && (
                                                                        <>
                                                                            <ArrowLeftRight className="w-2.5 h-2.5 text-gray-300" />
                                                                            <span className="font-mono text-[10px]">
                                                                                {(item.exchange_rate || 1).toFixed(4)} {companyCurrency}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {!readOnly && (
                                                                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 ms-0.5" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* ════════ Grand Totals Footer (hidden in transfer mode) ════════ */}
                {!hideFinancials && (
                    <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10">
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                {/* Subtotal */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">{t('المجموع الفرعي', 'Subtotal')}</span>
                                    <span className="font-mono font-semibold">
                                        {fmtAmount(grandTotals.subtotal)}
                                        <span className="text-xs text-gray-400 ms-1">{currency}</span>
                                    </span>
                                </div>

                                {/* Discount line */}
                                {showDiscount && grandTotals.discount > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-amber-600">{t('إجمالي الخصم', 'Total Discount')}</span>
                                        <span className="font-mono font-semibold text-amber-600">
                                            -{fmtAmount(grandTotals.discount)}
                                        </span>
                                    </div>
                                )}

                                {/* Tax line — show rate % OR international notice */}
                                {showTax && isInternational ? (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-amber-600 flex items-center gap-1.5">
                                            🌍 {t('الضريبة عبر الكونتينر', 'Tax via Container')}
                                        </span>
                                        <span className="font-mono text-xs text-amber-500">
                                            {t('تُدفع لاحقاً', 'Paid later')}
                                        </span>
                                    </div>
                                ) : showTax && grandTotals.tax > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-blue-600">
                                            {t('ضريبة القيمة المضافة', 'VAT')}
                                            {items[0]?.tax_rate ? ` (${items[0].tax_rate}%)` : ''}
                                        </span>
                                        <span className="font-mono font-semibold text-blue-600">
                                            +{fmtAmount(grandTotals.tax)}
                                        </span>
                                    </div>
                                )}

                                {/* Grand Total — clarify tax-inclusive */}
                                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-700 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base">{t('الإجمالي النهائي', 'Grand Total')}</span>
                                        {grandTotals.tax > 0 && (
                                            <span className="text-[10px] text-gray-400">{t('شامل الضريبة', 'Tax Inclusive')}</span>
                                        )}
                                    </div>
                                    <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                                        {fmtAmount(grandTotals.total)}
                                        <span className="text-sm text-emerald-500 ms-1">{currency}</span>
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </TooltipProvider >
    );
};

// ═══════════════════════════════════════════════════════════════════
// SummaryMiniCard Sub-component
// ═══════════════════════════════════════════════════════════════════

function SummaryMiniCard({ label, value, icon, color }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: 'indigo' | 'blue' | 'green' | 'orange';
}) {
    const colorMap = {
        indigo: 'border-indigo-200 bg-indigo-50/50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/10 dark:text-indigo-400',
        blue: 'border-blue-200 bg-blue-50/50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-400',
        green: 'border-emerald-200 bg-emerald-50/50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400',
        orange: 'border-amber-200 bg-amber-50/50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-400',
    };

    return (
        <div className={cn("rounded-lg border p-2.5 flex items-center gap-2.5", colorMap[color])}>
            <div className="flex-shrink-0 opacity-70">{icon}</div>
            <div>
                <p className="text-[10px] opacity-70">{label}</p>
                <p className="text-sm font-bold font-mono">{value}</p>
            </div>
        </div>
    );
}

export default CartItemsView;
