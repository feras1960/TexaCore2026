/**
 * 🛒 AddToCartDialog V3 — Wholesale Quantity Picker + Roll Selection
 * نافذة إضافة مادة للسلة — تحديد الكمية والسعر واختيار الرولونات المفضلة
 * 
 * ✅ Constitution: Law 1 (t()), Law 2 (no Supabase), RTL
 * 
 * 📋 Two actions:
 * 1. "متابعة التصفح" (Enter) → adds to cart, closes dialog, stays on material
 * 2. "فتح السلة" → adds to cart, closes dialog AND material sheet, opens cart
 * 
 * 🆕 V3: Integrated roll selection (preferred_rolls) inside the dialog
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ShoppingCart,
    Package,
    Warehouse as WarehouseIcon,
    AlertCircle,
    CornerDownLeft,
    ArrowRight,
    Ruler,
    Check,
    Scroll,
    Heart,
    Loader2,
    Info,
    ChevronDown,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCart, type PreferredRoll } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

/** Roll data that can be shown in the dialog */
export interface RollOption {
    id: string;
    roll_number: string;
    current_length: number;
    available_length: number;
    reserved_length: number;
    status: string;
}

interface AddToCartDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called when user wants to open cart (closes material sheet too) */
    onOpenCart?: () => void;
    material: {
        id: string;
        name_ar: string;
        name_en?: string;
        name?: string;
        code: string;
        price?: number;
        unit?: string;
        currency?: string;
    };
    warehouse: {
        id: string;
        name_ar: string;
        name_en?: string;
        available_length: number;
        /** Loose stock (unrolled meters) — added to available_length for total */
        loose_stock?: number;
        /** Number of rolls in this warehouse */
        roll_count?: number;
    };
    /** Optional: Available rolls to select from (V3) */
    rolls?: RollOption[];
    /** Optional: Loading state for rolls */
    rollsLoading?: boolean;
    /** Optional: Fetch rolls on demand */
    onLoadRolls?: () => void;
    /** 
     * Mode: 'cart' uses CartContext, 'line' calls onAddLineItem callback 
     * Default: 'cart' (uses CartContext)
     */
    mode?: 'cart' | 'line';
    /** Hide price/currency fields (e.g. for transfers) */
    hidePrice?: boolean;
    /** Used in 'line' mode — called with the line item data */
    onAddLineItem?: (item: {
        material_id: string;
        material_code: string;
        material_name_ar: string;
        material_name_en: string;
        quantity: number;
        unit: string;
        unit_price: number;
        warehouse_id: string;
        warehouse_name_ar: string;
        preferred_rolls: PreferredRoll[];
        currency: string;
    }) => void;
}

export function AddToCartDialog({
    open,
    onClose,
    onOpenCart,
    material,
    warehouse,
    rolls,
    rollsLoading = false,
    onLoadRolls,
    mode = 'cart',
    hidePrice = false,
    onAddLineItem,
}: AddToCartDialogProps) {
    const { language } = useLanguage();
    const { actions } = useCart();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const isAr = language === 'ar';
    const t = (ar: string, en: string) => isAr ? ar : en;

    const [quantity, setQuantity] = useState<string>('');
    const [unitPrice, setUnitPrice] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [selectedRolls, setSelectedRolls] = useState<Set<string>>(new Set());
    const [showRolls, setShowRolls] = useState(true); // open by default — user can collapse

    const rollsAvailable = warehouse.available_length || 0;
    const looseAvailable = warehouse.loose_stock || 0;
    // ✅ Fix: Prevent double-counting when available_length already includes loose stock.
    // When there are physical rolls: available_length = sum(roll lengths), loose = current_stock - rolled
    //   → max = rolled + loose = current_stock ✓
    // When there are NO physical rolls: available_length is set to current_stock directly,
    //   and loose_stock also equals current_stock → summing them would DOUBLE the quantity!
    // Solution: If warehouse has actual rolls (roll_count > 0), sum them. Otherwise use the larger value.
    const hasPhysicalRolls = (warehouse.roll_count || 0) > 0;
    const max = hasPhysicalRolls
        ? rollsAvailable + looseAvailable  // Separate: rolled + loose = current_stock
        : Math.max(rollsAvailable, looseAvailable);  // Same source: use whichever is set
    const qty = parseFloat(quantity) || 0;
    const price = hidePrice ? 1 : (parseFloat(unitPrice) || 0);
    const subtotal = qty * price;
    const usagePercent = max > 0 ? Math.min(100, (qty / max) * 100) : 0;
    const unit = material.unit || 'meter';

    const unitLabels: Record<string, { ar: string; en: string }> = {
        meter: { ar: 'متر', en: 'm' },
        yard: { ar: 'ياردة', en: 'yd' },
        kg: { ar: 'كغ', en: 'kg' },
        piece: { ar: 'قطعة', en: 'pc' },
        roll: { ar: 'رولون', en: 'roll' },
    };
    const unitLabel = unitLabels[unit] || unitLabels.meter;

    // Build selectedRolls as PreferredRoll[]
    const preferredRolls: PreferredRoll[] = useMemo(() => {
        if (!rolls) return [];
        return rolls
            .filter(r => selectedRolls.has(r.id))
            .map(r => ({
                roll_id: r.id,
                roll_number: r.roll_number,
                available_length: r.available_length,
            }));
    }, [rolls, selectedRolls]);

    // Total length of selected rolls
    const selectedRollsLength = useMemo(() => {
        return preferredRolls.reduce((sum, r) => sum + r.available_length, 0);
    }, [preferredRolls]);

    // Initialize on open
    useEffect(() => {
        if (open) {
            setQuantity('');
            setUnitPrice(String(material.price || ''));
            setError('');
            setSelectedRolls(new Set());
            setShowRolls(true); // always open on mount
            setTimeout(() => inputRef.current?.focus(), 100);
            if (onLoadRolls && !rolls && !rollsLoading) {
                onLoadRolls();
            }
        }
    }, [open, material.price]);

    const validate = useCallback(() => {
        if (qty <= 0) return t('أدخل كمية أكبر من صفر', 'Enter a quantity greater than 0');
        if (max > 0 && qty > max) return t(`الكمية تتجاوز المتاح (${max})`, `Quantity exceeds available (${max})`);
        if (!hidePrice && price <= 0) return t('أدخل سعر الوحدة', 'Enter unit price');
        return '';
    }, [qty, max, price]);

    const handleQuantityChange = (value: string) => {
        setQuantity(value);
        const v = parseFloat(value);
        if (v && max > 0 && v > max) {
            setError(t(`الكمية تتجاوز المتاح (${max})`, `Exceeds available (${max})`));
        } else {
            setError('');
        }
    };

    /** Toggle roll selection */
    const handleToggleRoll = (rollId: string) => {
        setSelectedRolls(prev => {
            const next = new Set(prev);
            if (next.has(rollId)) {
                next.delete(rollId);
            } else {
                next.add(rollId);
            }
            return next;
        });
    };

    /** Select all available rolls */
    const handleSelectAllRolls = () => {
        if (!rolls) return;
        const available = rolls.filter(r => r.available_length > 0);
        if (selectedRolls.size === available.length) {
            setSelectedRolls(new Set());
        } else {
            setSelectedRolls(new Set(available.map(r => r.id)));
        }
        setQuantity(''); // Reset manual quantity when toggling rolls
    };

    /** Core add-to-cart logic */
    const addToCart = useCallback(() => {
        const err = validate();
        if (err) {
            setError(err);
            return false;
        }
        // Determine effective quantity: use selected rolls total length if any rolls selected, otherwise manual quantity
        const effectiveQty = selectedRollsLength > 0 ? selectedRollsLength : qty;

        if (mode === 'line' && onAddLineItem) {
            // Line mode — call parent callback
            onAddLineItem({
                material_id: material.id,
                material_code: material.code,
                material_name_ar: material.name_ar || material.name || '',
                material_name_en: material.name_en || material.name || '',
                quantity: effectiveQty,
                unit,
                unit_price: price,
                warehouse_id: warehouse.id,
                warehouse_name_ar: warehouse.name_ar,
                preferred_rolls: preferredRolls,
                currency: material.currency || '',
            });
        } else {
            // Cart mode — use CartContext
            actions.addItem({
                material_id: material.id,
                material_name_ar: material.name_ar || material.name || '',
                material_name_en: material.name_en || material.name || '',
                material_code: material.code,
                quantity: effectiveQty,
                unit,
                warehouse_id: warehouse.id,
                warehouse_name_ar: warehouse.name_ar,
                warehouse_name_en: warehouse.name_en,
                available_stock: max,
                preferred_rolls: preferredRolls,
                unit_price: price,
                currency: material.currency || '',
            });
        }

        const matName = isAr ? (material.name_ar || material.name) : (material.name_en || material.name_ar || material.name);
        const rollsMsg = preferredRolls.length > 0
            ? ` + ${preferredRolls.length} ${t('رولون مفضل', 'preferred rolls')}`
            : '';
        toast({
            title: t('تمت الإضافة ✓', 'Added ✓'),
            description: `${matName} — ${effectiveQty} ${unitLabel[isAr ? 'ar' : 'en']}${rollsMsg}`,
        });

        return true;
    }, [qty, price, material, warehouse, max, unit, validate, preferredRolls, mode, onAddLineItem]);

    /** Option 1: Continue browsing (Enter) */
    const handleContinueBrowsing = useCallback(() => {
        if (addToCart()) {
            onClose();
        }
    }, [addToCart, onClose]);

    /** Option 2: Open cart */
    const handleOpenCart = useCallback(() => {
        if (addToCart()) {
            onClose();
            // Small delay to let dialog close first
            setTimeout(() => {
                if (onOpenCart) {
                    onOpenCart();
                } else {
                    actions.openDrawer();
                }
            }, 150);
        }
    }, [addToCart, onClose, onOpenCart, actions]);

    /** Keyboard shortcut: Enter → Continue browsing */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleContinueBrowsing();
        }
    }, [handleContinueBrowsing]);

    const matName = isAr ? (material.name_ar || material.name) : (material.name_en || material.name_ar || material.name);
    const whName = isAr ? warehouse.name_ar : (warehouse.name_en || warehouse.name_ar);

    // Roll status badges
    const getRollStatusLabel = (status: string) => {
        const map: Record<string, { label: string; color: string }> = {
            available: { label: t('متاح', 'Available'), color: 'green' },
            reserved: { label: t('محجوز', 'Reserved'), color: 'orange' },
            partial: { label: t('جزئي', 'Partial'), color: 'blue' },
            consumed: { label: t('مستهلك', 'Consumed'), color: 'red' },
        };
        return map[status] || map.available;
    };

    const hasRolls = rolls && rolls.length > 0;
    const availableRolls = rolls?.filter(r => r.available_length > 0) || [];

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-emerald-600" />
                        </div>
                        {t('إضافة للسلة', 'Add to Cart')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Material + Warehouse Info */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <Package className="h-9 w-9 text-indigo-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{matName}</p>
                            <p className="text-[11px] text-gray-500 font-mono">{material.code}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                        <WarehouseIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('من مستودع', 'From warehouse')}:
                        </span>
                        <span className="text-sm font-semibold">{whName}</span>
                        <Badge variant="outline" className="text-xs font-mono ms-auto gap-1">
                            <Ruler className="w-3 h-3" />
                            {t('المتاح', 'Available')}: {max.toLocaleString('en-US')} {unitLabel[isAr ? 'ar' : 'en']}
                        </Badge>
                    </div>
                    {/* Dual stock breakdown */}
                    {(rollsAvailable > 0 || looseAvailable > 0) && (rollsAvailable > 0 && looseAvailable > 0) && (
                        <div className="flex items-center gap-3 px-6 text-[10px]">
                            <span className="text-indigo-500 flex items-center gap-0.5">
                                <Scroll className="w-2.5 h-2.5" />
                                {t('مجرود', 'Rolled')}: {rollsAvailable.toLocaleString('en-US')} {unitLabel[isAr ? 'ar' : 'en']}
                                {warehouse.roll_count > 0 && (
                                    <span className="text-gray-400 ms-0.5">({warehouse.roll_count} {t('رول', 'R')})</span>
                                )}
                            </span>
                            <span className="text-amber-600 flex items-center gap-0.5">
                                <Package className="w-2.5 h-2.5" />
                                {t('سائب', 'Loose')}: {looseAvailable.toLocaleString('en-US')} {unitLabel[isAr ? 'ar' : 'en']}
                            </span>
                        </div>
                    )}

                    {/* ─── Quantity Input ─── */}
                    <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                            <span>{t('الكمية المطلوبة', 'Required Quantity')} ({unitLabel[isAr ? 'ar' : 'en']})</span>
                            {max > 0 && qty > 0 && (
                                <span className={cn(
                                    "text-xs font-mono",
                                    usagePercent > 100 ? "text-red-500" : usagePercent > 80 ? "text-amber-500" : "text-emerald-500"
                                )}>
                                    {usagePercent.toFixed(0)}% {t('من المتاح', 'of available')}
                                </span>
                            )}
                        </Label>
                        <Input
                            ref={inputRef}
                            type="number"
                            min={0.01}
                            step={1}
                            max={max || undefined}
                            value={quantity}
                            onChange={(e) => handleQuantityChange(e.target.value)}
                            placeholder={selectedRolls.size > 0 ? `${selectedRollsLength.toFixed(1)} (Selected Rolls)` : `0 — ${max.toLocaleString('en-US')} ${unitLabel[isAr ? 'ar' : 'en']}`}
                            className="font-mono text-lg h-11"
                        />
                        {/* Usage Progress Bar */}
                        {max > 0 && qty > 0 && (
                            <Progress
                                value={Math.min(usagePercent, 100)}
                                className={cn(
                                    "h-1.5",
                                    usagePercent > 100 && "[&>div]:bg-red-500",
                                    usagePercent > 80 && usagePercent <= 100 && "[&>div]:bg-amber-500",
                                    usagePercent <= 80 && "[&>div]:bg-emerald-500"
                                )}
                            />
                        )}
                        {/* Quick quantity buttons */}
                        {max > 0 && (
                            <div className="flex gap-1.5">
                                {[25, 50, 75, 100].map(pct => {
                                    const pctQty = Math.round(max * pct / 100);
                                    if (pctQty <= 0) return null;
                                    return (
                                        <Button
                                            key={pct}
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "flex-1 text-xs h-7 font-mono",
                                                qty === pctQty && "bg-emerald-50 border-emerald-300 text-emerald-700"
                                            )}
                                            onClick={() => {
                                                setQuantity(String(pctQty));
                                                setSelectedRolls(new Set());
                                                setError('');
                                            }}
                                        >
                                            {pct}%
                                            <span className="text-[9px] text-gray-400 ms-0.5">({pctQty})</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ─── Unit Price (hidden for transfers) ─── */}
                    {!hidePrice && (
                        <div className="space-y-1.5">
                            <Label>{t('سعر الوحدة', 'Unit Price')} ({material.currency || ''})</Label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                placeholder="0.00"
                                className="font-mono"
                            />
                        </div>
                    )}

                    {/* ─── Roll Selection — Always Visible if rolls available ─── */}
                    {(hasRolls || rollsLoading || onLoadRolls) && (
                        <div className="space-y-2">
                            {/* Section header */}
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                                    onClick={() => {
                                        setShowRolls(!showRolls);
                                        if (!showRolls && onLoadRolls && !rolls) onLoadRolls();
                                    }}
                                >
                                    <div className={cn(
                                        'w-5 h-5 rounded-md flex items-center justify-center transition-colors',
                                        showRolls ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'
                                    )}>
                                        <Scroll className="w-3 h-3" />
                                    </div>
                                    {t('تفضيل الرولونات للحجز', 'Preferred Rolls for Reservation')}
                                    {selectedRolls.size > 0 && (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                            {selectedRolls.size}
                                        </span>
                                    )}
                                    <ChevronDown className={cn('w-3.5 h-3.5 text-indigo-400 transition-transform ms-auto', showRolls && 'rotate-180')} />
                                </button>
                            </div>

                            {showRolls && (
                                <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-800/50 overflow-hidden bg-indigo-50/30 dark:bg-indigo-950/20">
                                    {rollsLoading ? (
                                        <div className="flex items-center gap-2 justify-center py-6 text-gray-400">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs">{t('تحميل الرولونات...', 'Loading rolls...')}</span>
                                        </div>
                                    ) : !hasRolls ? (
                                        <div className="text-center py-4 text-xs text-gray-400">
                                            {t('لا توجد رولونات متاحة', 'No rolls available')}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Header — select all */}
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-200/50 dark:border-indigo-800/40">
                                                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                                                    {availableRolls.length} {t('رولون متاح', 'rolls available')}
                                                </span>
                                                {availableRolls.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
                                                        onClick={handleSelectAllRolls}
                                                    >
                                                        {selectedRolls.size === availableRolls.length
                                                            ? t('إلغاء تحديد الكل', 'Deselect All')
                                                            : t('تحديد الكل', 'Select All')
                                                        }
                                                    </button>
                                                )}
                                            </div>

                                            {/* Roll cards grid */}
                                            <div className="max-h-[280px] overflow-y-auto p-2">
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {rolls!.map((roll) => {
                                                        const isSelected = selectedRolls.has(roll.id);
                                                        const isAvailable = roll.available_length > 0;
                                                        const rstatus = getRollStatusLabel(roll.status);

                                                        return (
                                                            <div
                                                                key={roll.id}
                                                                className={cn(
                                                                    'relative flex flex-col gap-1 p-2.5 rounded-lg border-2 cursor-pointer transition-all select-none',
                                                                    isSelected
                                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/50'
                                                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-indigo-300 dark:hover:border-indigo-700',
                                                                    !isAvailable && 'opacity-40 cursor-not-allowed',
                                                                )}
                                                                onClick={() => isAvailable && handleToggleRoll(roll.id)}
                                                            >
                                                                {/* Selected checkmark */}
                                                                <div className={cn(
                                                                    'absolute top-2 end-2 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                                                                    isSelected
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                                                                )}>
                                                                    {isSelected && <Check className="w-2.5 h-2.5" />}
                                                                </div>

                                                                {/* Roll number */}
                                                                <span className={cn(
                                                                    'text-xs font-mono font-semibold pe-5',
                                                                    isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                                                                )} dir="ltr">
                                                                    {roll.roll_number}
                                                                </span>

                                                                {/* Available meters */}
                                                                <div className="flex items-center justify-between">
                                                                    <span className={cn(
                                                                        'text-sm font-bold font-mono',
                                                                        isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                                                                    )} dir="ltr">
                                                                        {roll.available_length.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                        <span className="text-[9px] font-normal text-gray-400 ms-0.5">{unitLabel[isAr ? 'ar' : 'en']}</span>
                                                                    </span>
                                                                    {/* Status dot */}
                                                                    <span className={cn(
                                                                        'text-[8px] px-1.5 py-0.5 rounded-full font-semibold',
                                                                        rstatus.color === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                                                                        rstatus.color === 'orange' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
                                                                        rstatus.color === 'blue' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
                                                                        rstatus.color === 'red' && 'bg-red-100 text-red-700',
                                                                    )}>
                                                                        {rstatus.label}
                                                                    </span>
                                                                </div>

                                                                {/* Heart when selected */}
                                                                {isSelected && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                                                                        <span className="text-[9px] text-pink-500 font-medium">{t('مفضل', 'Preferred')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Selected summary bar */}
                                            {selectedRolls.size > 0 && (
                                                <div className="flex items-center justify-between px-3 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <Heart className="w-3.5 h-3.5 fill-white" />
                                                        <span className="font-semibold">
                                                            {selectedRolls.size} {t('رولون مفضل للحجز', 'rolls preferred for reservation')}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold font-mono" dir="ltr">
                                                        {selectedRollsLength.toLocaleString('en-US', { maximumFractionDigits: 1 })} {unitLabel[isAr ? 'ar' : 'en']}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Info note */}
                            {showRolls && hasRolls && (
                                <div className="flex items-start gap-1.5 px-1">
                                    <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-blue-500 dark:text-blue-400 leading-tight">
                                        {t(
                                            'الرولونات المفضلة اقتراح لأمين المستودع. القرار النهائي عند إذن التسليم.',
                                            'Preferred rolls are suggestions. Final selection is at delivery.'
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Error ─── */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* ─── Subtotal Preview ─── */}
                    {!hidePrice && qty > 0 && price > 0 && !error && (
                        <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <div>
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                    {t('الإجمالي', 'Subtotal')}
                                </span>
                                {selectedRolls.size > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                                        <Heart className="w-2.5 h-2.5 fill-pink-500 text-pink-500" />
                                        {selectedRolls.size} {t('رولون مفضل', 'preferred rolls')}
                                    </div>
                                )}
                            </div>
                            <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                <span className="text-xs ms-1 font-normal text-emerald-500">{material.currency || ''}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* ══════════ Action Buttons ══════════ */}
                <div className="flex gap-2 pt-2">
                    {/* Continue Browsing (Primary — Enter) */}
                    <Button
                        onClick={handleContinueBrowsing}
                        disabled={qty <= 0 || (!hidePrice && price <= 0) || !!error}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                        <Check className="h-4 w-4" />
                        {t('إضافة ومتابعة التصفح', 'Add & Continue')}
                        <kbd className="ms-1 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-700/50 text-emerald-200">
                            <CornerDownLeft className="w-2.5 h-2.5 me-0.5" />
                            Enter
                        </kbd>
                    </Button>

                    {/* Open Cart */}
                    <Button
                        variant="outline"
                        onClick={handleOpenCart}
                        disabled={qty <= 0 || (!hidePrice && price <= 0) || !!error}
                        className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        {t('فتح السلة', 'Open Cart')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AddToCartDialog;
