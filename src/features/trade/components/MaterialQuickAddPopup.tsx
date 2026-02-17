/**
 * 🚀 MaterialQuickAddPopup — Quick Add Popup for Material Browser V2
 * نافذة الإضافة السريعة — تظهر فوق المادة مع كل المعلومات المطلوبة
 *
 * Features:
 *   ✅ Material swatch / color preview
 *   ✅ Last 3 sale prices (with trend arrow + apply on click)
 *   ✅ Last 3 purchase prices (RBAC: manager only)
 *   ✅ Quantity input with +/- buttons
 *   ✅ Price input (editable)
 *   ✅ Warehouse selector (if multiple)
 *   ✅ One-click "Add to Cart"
 *   ✅ Keyboard: Enter = add, Escape = close
 *   ✅ RTL/LTR support
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useMaterialPriceHistory, type MaterialPriceHistoryResult, type PriceHistoryRecord } from '@/features/trade/hooks/useMaterialPriceHistory';
import useTradePermissions from '@/hooks/useTradePermissions';
import type { MaterialSearchResult, MaterialWarehouseStock } from '@/features/trade/hooks/useMaterialSearch';
import type { ResolvedPrice } from '@/hooks/useCustomerPricing';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Package,
    X,
    Plus,
    Minus,
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    History,
    Loader2,
    Sparkles,
    ArrowRight,
    DollarSign,
    Warehouse,
    Check,
    AlertTriangle,
    Layers,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

interface MaterialQuickAddPopupProps {
    /** The material to add */
    material: MaterialSearchResult;
    /** Warehouse stock breakdown (pre-loaded or empty) */
    warehouseStock: MaterialWarehouseStock[];
    /** Is warehouse stock loading */
    warehouseLoading?: boolean;
    /** Customer ID for price history */
    customerId?: string;
    /** Current resolved price */
    resolvedPrice?: number;
    /** Price source */
    priceSource?: 'price_list' | 'base_price' | 'manual';
    /** Document currency */
    currency?: string;
    /** Is material already in cart */
    isInCart?: boolean;
    /** Callback: add item to cart */
    onAdd: (data: {
        material: MaterialSearchResult;
        warehouseId: string;
        warehouseName: string;
        quantity: number;
        unitPrice: number;
        currency: string;
    }) => void;
    /** Callback: open full AddToCartDialog for roll selection */
    onOpenFullDialog?: (material: MaterialSearchResult, wh: MaterialWarehouseStock) => void;
    /** Close the popup */
    onClose: () => void;
    /** Trade mode */
    tradeMode?: 'sales' | 'purchase';
}

// ─── Component ─────────────────────────────────────────────────────

export function MaterialQuickAddPopup({
    material,
    warehouseStock,
    warehouseLoading = false,
    customerId,
    resolvedPrice,
    priceSource = 'base_price',
    currency = 'UAH',
    isInCart = false,
    onAdd,
    onOpenFullDialog,
    onClose,
    tradeMode = 'sales',
}: MaterialQuickAddPopupProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // RBAC
    const permissions = useTradePermissions({ tradeMode });

    // Price history
    const { fetchPriceHistory, data: priceData, loading: priceLoading } = useMaterialPriceHistory();

    // State
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(resolvedPrice || material.selling_price);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [priceEditing, setPriceEditing] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    const qtyInputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    // ─── Load price history on mount ─────────────────────────
    useEffect(() => {
        fetchPriceHistory(
            material.id,
            customerId,
            permissions.isManager || permissions.isPurchasingManager,
        );
    }, [material.id, customerId, permissions.isManager, permissions.isPurchasingManager]);

    // ─── Auto-select first warehouse ──────────────────────────
    useEffect(() => {
        if (warehouseStock.length > 0 && !selectedWarehouseId) {
            // Pick warehouse with most stock
            const best = warehouseStock.reduce((a, b) =>
                b.available_length > a.available_length ? b : a
            );
            setSelectedWarehouseId(best.warehouse_id);
        }
    }, [warehouseStock, selectedWarehouseId]);

    // ─── Focus qty input on mount ─────────────────────────────
    useEffect(() => {
        setTimeout(() => qtyInputRef.current?.select(), 100);
    }, []);

    // ─── Keyboard handling ────────────────────────────────────
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [quantity, unitPrice, selectedWarehouseId]);

    // ─── Click outside to close ───────────────────────────────
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Delay to prevent immediate close
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClick);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClick);
        };
    }, [onClose]);

    // ─── Selected warehouse info ──────────────────────────────
    const selectedWh = useMemo(() =>
        warehouseStock.find(w => w.warehouse_id === selectedWarehouseId),
        [warehouseStock, selectedWarehouseId]);

    const availableQty = selectedWh?.available_length || 0;
    const isOverStock = quantity > availableQty && availableQty > 0;

    // ─── Handlers ─────────────────────────────────────────────

    const handleAdd = useCallback(() => {
        const whName = selectedWh
            ? (isRTL ? selectedWh.warehouse_name_ar : (selectedWh.warehouse_name_en || selectedWh.warehouse_name_ar))
            : t('بدون مستودع', 'No Warehouse');

        onAdd({
            material,
            warehouseId: selectedWarehouseId,
            warehouseName: whName,
            quantity,
            unitPrice,
            currency,
        });

        setJustAdded(true);
        setTimeout(() => {
            setJustAdded(false);
            onClose();
        }, 600);
    }, [material, selectedWarehouseId, selectedWh, quantity, unitPrice, currency, onAdd, onClose]);

    const handleApplyPrice = useCallback((price: number) => {
        setUnitPrice(price);
        setPriceEditing(false);
    }, []);

    const adjustQty = (delta: number) => {
        setQuantity(prev => Math.max(0.5, +(prev + delta).toFixed(2)));
    };

    // ─── Doc type label ───────────────────────────────────────
    const docTypeLabel = (type: string) => {
        const labels: Record<string, { ar: string; en: string }> = {
            sale_invoice: { ar: 'فاتورة بيع', en: 'Sale Invoice' },
            purchase_invoice: { ar: 'فاتورة شراء', en: 'Purchase' },
            quotation: { ar: 'عرض سعر', en: 'Quote' },
            sale_order: { ar: 'أمر بيع', en: 'Order' },
        };
        return labels[type] ? (isRTL ? labels[type].ar : labels[type].en) : type;
    };

    // ─── Price trend icon ─────────────────────────────────────
    const getTrendIcon = (price: number, reference: number) => {
        if (price > reference * 1.01) return <TrendingUp className="w-3 h-3 text-red-500" />;
        if (price < reference * 0.99) return <TrendingDown className="w-3 h-3 text-green-500" />;
        return <Minus className="w-3 h-3 text-gray-400" />;
    };

    // ─── Total ────────────────────────────────────────────────
    const total = quantity * unitPrice;

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <AnimatePresence>
            <motion.div
                ref={popupRef}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                    'absolute z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
                    'rounded-xl shadow-2xl w-[380px] overflow-hidden',
                    isRTL ? 'left-0' : 'right-0',
                    'top-full mt-1',
                )}
                dir={direction}
            >
                {/* ═══ Header ═══ */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-purple-950/30 border-b border-gray-100 dark:border-gray-800">
                    {/* Swatch */}
                    <div className="w-11 h-11 rounded-lg border-2 border-white dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {material.swatch_url ? (
                            <img src={material.swatch_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {isRTL ? material.name_ar : (material.name_en || material.name_ar)}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono">{material.code}</span>
                            {material.group_name_ar && (
                                <>
                                    <span>·</span>
                                    <span>{isRTL ? material.group_name_ar : (material.group_name_en || material.group_name_ar)}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Close */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full hover:bg-white/60 dark:hover:bg-gray-800/60"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* ═══ Stock & Price Summary ═══ */}
                <div className="grid grid-cols-3 gap-2 px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="text-center">
                        <div className="text-[10px] text-gray-400">{t('المخزون', 'Stock')}</div>
                        <div className={cn(
                            'text-sm font-bold font-mono',
                            material.stock_qty === 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'
                        )}>
                            {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                        </div>
                        <div className="text-[9px] text-gray-400">{material.unit}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-gray-400">{t('السعر', 'Price')}</div>
                        <div className="text-sm font-bold font-mono text-gray-800 dark:text-gray-200">
                            {unitPrice.toFixed(2)}
                        </div>
                        {priceSource === 'price_list' && (
                            <Badge className="text-[8px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                <Sparkles className="w-2 h-2 me-0.5" />
                                {t('قائمة أسعار', 'Price List')}
                            </Badge>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-gray-400">{t('رولونات', 'Rolls')}</div>
                        <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {material.roll_count}
                        </div>
                    </div>
                </div>

                {/* ═══ Price History Section ═══ */}
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                            {t('آخر الأسعار', 'Price History')}
                        </span>
                        {priceData?.saleTrend && (
                            <Badge variant="outline" className={cn(
                                'text-[8px] px-1.5 py-0',
                                priceData.saleTrend === 'up' && 'text-red-600 border-red-200',
                                priceData.saleTrend === 'down' && 'text-green-600 border-green-200',
                                priceData.saleTrend === 'stable' && 'text-gray-500 border-gray-200',
                            )}>
                                {priceData.saleTrend === 'up' && '↑'}
                                {priceData.saleTrend === 'down' && '↓'}
                                {priceData.saleTrend === 'stable' && '→'}
                                {' '}
                                {priceData.saleTrend === 'up' ? t('في ارتفاع', 'Rising') :
                                    priceData.saleTrend === 'down' ? t('في انخفاض', 'Falling') :
                                        t('مستقر', 'Stable')}
                            </Badge>
                        )}
                    </div>

                    {priceLoading ? (
                        <div className="flex items-center justify-center py-3 gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            <span className="text-[10px] text-gray-400">{t('تحميل الأسعار...', 'Loading prices...')}</span>
                        </div>
                    ) : (
                        <div className="space-y-1 max-h-[120px] overflow-y-auto pe-1">
                            {/* Sale Prices */}
                            {priceData?.salePrices && priceData.salePrices.length > 0 ? (
                                priceData.salePrices.slice(0, 3).map((record, i) => (
                                    <PriceRow
                                        key={`s-${i}`}
                                        record={record}
                                        referencePrice={unitPrice}
                                        isRTL={isRTL}
                                        docTypeLabel={docTypeLabel}
                                        getTrendIcon={getTrendIcon}
                                        onApply={handleApplyPrice}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-2 text-[10px] text-gray-400">
                                    {t('لا يوجد سجل أسعار بيع', 'No sale price history')}
                                </div>
                            )}

                            {/* Purchase Prices — RBAC controlled */}
                            {(permissions.isManager || permissions.isPurchasingManager) &&
                                priceData?.purchasePrices && priceData.purchasePrices.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-1.5 pt-1">
                                            <DollarSign className="w-3 h-3 text-orange-500" />
                                            <span className="text-[9px] font-medium text-orange-600 dark:text-orange-400">
                                                {t('أسعار الشراء', 'Purchase Prices')}
                                            </span>
                                        </div>
                                        {priceData.purchasePrices.slice(0, 2).map((record, i) => (
                                            <PriceRow
                                                key={`p-${i}`}
                                                record={record}
                                                referencePrice={unitPrice}
                                                isRTL={isRTL}
                                                docTypeLabel={docTypeLabel}
                                                getTrendIcon={getTrendIcon}
                                                onApply={handleApplyPrice}
                                                isPurchase
                                            />
                                        ))}
                                    </>
                                )}
                        </div>
                    )}
                </div>

                {/* ═══ Warehouse Selector ═══ */}
                {warehouseStock.length > 1 && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                        <Label className="text-[10px] text-gray-500 mb-1 block">
                            {t('المستودع', 'Warehouse')}
                        </Label>
                        <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t('اختر المستودع', 'Select warehouse')} />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouseStock.map(wh => (
                                    <SelectItem key={wh.warehouse_id} value={wh.warehouse_id}>
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="w-3 h-3 text-gray-400" />
                                            <span>{isRTL ? wh.warehouse_name_ar : (wh.warehouse_name_en || wh.warehouse_name_ar)}</span>
                                            <Badge variant="outline" className="text-[9px] ms-auto">
                                                {wh.available_length.toLocaleString('en-US', { maximumFractionDigits: 1 })} {material.unit}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* ═══ Quantity & Price Input ═══ */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <div className="flex items-center gap-3">
                        {/* Quantity */}
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 block mb-1">
                                {t('الكمية', 'Quantity')} ({material.unit})
                            </label>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustQty(-1)}
                                    disabled={quantity <= 0.5}
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <Input
                                    ref={qtyInputRef}
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(0.5, +e.target.value || 0.5))}
                                    className={cn(
                                        'h-8 text-center text-sm font-mono font-bold w-20',
                                        isOverStock && 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
                                    )}
                                    min={0.5}
                                    step={0.5}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustQty(1)}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            {isOverStock && (
                                <div className="flex items-center gap-1 text-[9px] text-amber-600 mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    {t(`المتاح: ${availableQty}`, `Available: ${availableQty}`)}
                                </div>
                            )}
                        </div>

                        {/* Price */}
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 block mb-1">
                                {t('سعر الوحدة', 'Unit Price')} ({currency})
                            </label>
                            <Input
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(+(+e.target.value).toFixed(2))}
                                className="h-8 text-center text-sm font-mono font-bold"
                                disabled={!permissions.actions.canEditPrice}
                                min={0}
                                step={0.01}
                            />
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                            {t('الإجمالي', 'Total')}
                        </span>
                        <span className="text-base font-bold font-mono text-indigo-700 dark:text-indigo-300" dir="ltr">
                            {total.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
                        </span>
                    </div>
                </div>

                {/* ═══ Action Buttons ═══ */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex gap-2">
                    {/* Add to Cart */}
                    <Button
                        className={cn(
                            'flex-1 h-9 gap-2 text-sm font-semibold transition-all',
                            justAdded
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg',
                        )}
                        onClick={handleAdd}
                        disabled={justAdded || quantity <= 0}
                    >
                        {justAdded ? (
                            <>
                                <Check className="w-4 h-4" />
                                {t('تمت الإضافة!', 'Added!')}
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-4 h-4" />
                                {t('إضافة للسلة', 'Add to Cart')}
                            </>
                        )}
                    </Button>

                    {/* Full dialog (roll selection) — sales only, purchases don't need roll picking */}
                    {tradeMode !== 'purchase' && selectedWh && material.roll_count > 0 && onOpenFullDialog && (
                        <Button
                            variant="outline"
                            className="h-9 text-xs gap-1 px-3"
                            onClick={() => {
                                onOpenFullDialog(material, selectedWh);
                                onClose();
                            }}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            {t('اختيار رولونات', 'Select Rolls')}
                        </Button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

/** Individual price row in history */
function PriceRow({
    record,
    referencePrice,
    isRTL,
    docTypeLabel,
    getTrendIcon,
    onApply,
    isPurchase = false,
}: {
    record: PriceHistoryRecord;
    referencePrice: number;
    isRTL: boolean;
    docTypeLabel: (type: string) => string;
    getTrendIcon: (price: number, reference: number) => React.ReactNode;
    onApply: (price: number) => void;
    isPurchase?: boolean;
}) {
    const diffPercent = referencePrice > 0
        ? ((record.unit_price - referencePrice) / referencePrice) * 100
        : null;

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-all',
                isPurchase
                    ? 'hover:bg-orange-50 dark:hover:bg-orange-900/10'
                    : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/10',
            )}
            onClick={() => onApply(record.unit_price)}
        >
            {getTrendIcon(record.unit_price, referencePrice)}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono" dir="ltr">
                        {record.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-gray-400">{record.currency}</span>
                    {diffPercent != null && Math.abs(diffPercent) > 0.1 && (
                        <span className={cn(
                            'text-[9px] font-medium',
                            diffPercent > 0 ? 'text-red-500' : 'text-green-600',
                        )}>
                            {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                        </span>
                    )}
                    {record.quantity > 0 && (
                        <span className="text-[9px] text-gray-400">
                            × {record.quantity.toLocaleString()}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                    <span>{new Date(record.date).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{docTypeLabel(record.doc_type)}</span>
                    <span className="font-mono text-gray-300">#{record.doc_number}</span>
                </div>
            </div>

            <ArrowRight className={cn(
                'w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity',
                isRTL && 'rotate-180',
            )} />
        </div>
    );
}



export default MaterialQuickAddPopup;
