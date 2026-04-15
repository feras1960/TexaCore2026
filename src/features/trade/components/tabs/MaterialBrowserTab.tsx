/**
 * 🔍 MaterialBrowserTab — Browse & Add Materials to Trade Cart
 * تبويب متصفح المواد — بحث وإضافة المواد إلى سلة المستند التجاري
 *
 * Features:
 *   ✅ Smart search (name, code, barcode)
 *   ✅ Group & category filters
 *   ✅ Real stock from fabric_rolls (same as warehouse module)
 *   ✅ Expand → Warehouse breakdown with roll details
 *   ✅ AddToCartDialog with roll selection (V3)
 *   ✅ Customer pricing integration (Cascade)
 *   ✅ Quantity break pricing preview
 *   ✅ RTL / LTR support
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useIsRestoring } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    useMaterialSearch,
    type MaterialSearchResult,
    type MaterialWarehouseStock,
    type MaterialRollDetail,
    type VariantRollData,
} from '@/features/trade/hooks/useMaterialSearch';
import { useBrowserFilterData } from '@/features/trade/hooks/useBrowserFilterData';
import { QuantityPricingCard } from '@/features/trade/components/cards/QuantityPricingCard';
import { AddToCartDialog, type RollOption } from '@/components/cart/AddToCartDialog';
import type { CustomerPricingProfile, PriceListItem, ResolvedPrice } from '@/hooks/useCustomerPricing';
import type { PreferredRoll } from '@/contexts/CartContext';
import { useTaxDefaults, computeTaxAmount, resolveItemTaxRate } from '@/features/trade/hooks/useTaxDefaults';
import { useCompany } from '@/hooks/useCompany';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    Search,
    Plus,
    Package,
    Warehouse,
    AlertTriangle,
    Loader2,
    X,
    ChevronDown,
    ChevronUp,
    Layers,
    Sparkles,
    Scroll,
    RefreshCw,
    Check,
    ShoppingCart,
    RotateCcw,
    Lock,
    List,
    LayoutGrid,
} from 'lucide-react';
import type { InvoiceLineItem } from '@/features/trade/components/grids/CartItemsView';

// ─── Types ─────────────────────────────────────────────────────────

interface MaterialBrowserTabProps {
    /** Current items in the cart (to check duplicates) */
    items: InvoiceLineItem[];
    /** Callback to add item(s) to cart */
    onAddItem: (item: InvoiceLineItem) => void;
    /** Customer pricing profile for price resolution */
    customerPricing?: CustomerPricingProfile & {
        resolvePrice: (materialId: string, qty: number, baseSellPrice: number) => ResolvedPrice;
    };
    /** Document currency */
    currency?: string;
    /** Exchange rate: 1 doc-currency = X base-currency.  Used to convert base prices to doc currency. */
    exchangeRate?: number;
    /** Trade mode: sales, purchase, transfer */
    tradeMode?: string;
    /** Read only mode */
    readOnly?: boolean;
    /** Source warehouse ID — filters materials to only show stock in this warehouse */
    sourceWarehouseId?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

// Design icons — unique visual per pattern type
const DESIGN_ICONS: Record<string, string> = {
    'سادة': '▬',       // Plain — solid bar
    'منقوش': '◆',      // Dotted/Patterned — diamond
    'مطبوع': '❋',      // Printed — decorative star
    'مربعات': '▦',     // Checkered — grid
    'مقلم': '║',       // Striped — vertical lines
    'مورد': '✿',       // Floral — flower
    'مطرز': '✦',       // Embroidered — fancy star
    'جاكار': '❖',      // Jacquard — tessellated diamond
    'تويل': '⟋',       // Twill — diagonal
};

// Color hex codes — for color swatch circles
const COLOR_HEX: Record<string, string> = {
    'أبيض': '#FFFFFF',
    'أسود': '#1a1a1a',
    'كحلي': '#1B2A4A',
    'أحمر': '#DC2626',
    'ذهبي': '#D4A017',
    'بيج': '#E8D5B7',
    'أزرق': '#2563EB',
    'أخضر': '#16A34A',
    'بني': '#8B4513',
    'رمادي': '#9CA3AF',
    'وردي': '#F472B6',
    'برتقالي': '#F97316',
    'بنفسجي': '#8B5CF6',
    'فضي': '#C0C0C0',
    'عنابي': '#800020',
    'تركواز': '#06B6D4',
    'زيتي': '#6B7F3B',
    'سماوي': '#7DD3FC',
    'كريمي': '#FFFDD0',
    'خمري': '#722F37',
};


function generateLineItemId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Component ─────────────────────────────────────────────────────

export const MaterialBrowserTab: React.FC<MaterialBrowserTabProps> = ({
    items,
    onAddItem,
    customerPricing,
    currency: currencyProp = '',
    exchangeRate: exchangeRateProp = 1,
    tradeMode,
    readOnly = false,
    sourceWarehouseId,
}) => {
    const { language, direction } = useLanguage();
    const isRestoring = useIsRestoring();
    const isRTL = direction === 'rtl';
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;
    const { company, companyId } = useCompany();
    // Currency priority: prop (from document) > company default
    const currency = currencyProp || company?.default_currency || 'USD';
    const companyCurrency = company?.default_currency || 'USD';
    const isTransfer = tradeMode === 'transfer';

    // ─── Price Conversion ───
    // Material prices are stored in the material's OWN currency (e.g. USD).
    // We convert from material.currency → invoice currency using exchange rates.
    // Formula: displayPrice = materialPrice × lookupRate(materialCurrency, invoiceCurrency)
    const { lookupRate: lookupExRate } = useExchangeRateLookup();
    const convertPrice = useCallback((basePrice: number, fromCurrency: string) => {
        if (!fromCurrency || fromCurrency === currency) return basePrice;
        const rate = lookupExRate(fromCurrency, currency);
        if (rate > 0 && Math.abs(rate - 1) > 0.0001) {
            return Math.round(basePrice * rate * 10000) / 10000;
        }
        return basePrice;
    }, [currency, lookupExRate]);

    // ─── Tax Defaults ───
    const { data: taxDefaults } = useTaxDefaults(companyId);
    const companyTaxRate = taxDefaults?.isEnabled ? taxDefaults.rate : 0;
    const companyTaxEnabled = taxDefaults?.isEnabled ?? false;

    // ─── State ──────────────────────────────────────────────────
    const [searchText, setSearchText] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedDesign, setSelectedDesign] = useState<string>('all');
    const [selectedColor, setSelectedColor] = useState<string>('all');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>(sourceWarehouseId || 'all');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [belowMinStock, setBelowMinStock] = useState(false);
    const [flatMode, setFlatMode] = useState(false);
    const [selectedPriceGroup, setSelectedPriceGroup] = useState<string>('retail');
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);

    // Warehouse breakdown state
    const [warehouseStockCache, setWarehouseStockCache] = useState<Record<string, MaterialWarehouseStock[]>>({});
    const [warehouseStockLoading, setWarehouseStockLoading] = useState<Set<string>>(new Set());
    // Roll details state
    const [rollsCache, setRollsCache] = useState<Record<string, MaterialRollDetail[]>>({});
    const [rollsLoading, setRollsLoading] = useState<Set<string>>(new Set());
    const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());

    // Variant children state (for parent materials)
    const [variantChildrenCache, setVariantChildrenCache] = useState<Record<string, MaterialSearchResult[]>>({});
    const [variantChildrenLoading, setVariantChildrenLoading] = useState<Set<string>>(new Set());

    // Variant hierarchy state
    const [variantRollsCache, setVariantRollsCache] = useState<Record<string, VariantRollData[]>>({});
    const [expandedVariantWarehouses, setExpandedVariantWarehouses] = useState<Set<string>>(new Set());
    const [expandedVariantGroups, setExpandedVariantGroups] = useState<Set<string>>(new Set());
    const [expandedVariantColors, setExpandedVariantColors] = useState<Set<string>>(new Set());

    // AddToCartDialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMaterial, setDialogMaterial] = useState<MaterialSearchResult | null>(null);
    const [dialogWarehouse, setDialogWarehouse] = useState<MaterialWarehouseStock | null>(null);
    const [dialogRolls, setDialogRolls] = useState<RollOption[] | undefined>(undefined);
    const [dialogRollsLoading, setDialogRollsLoading] = useState(false);

    // ─── Data ───────────────────────────────────────────────────
    const { materials, groups, designFilters, colorFilters, variantCountMap, parentPriceMap, isLoading, isSearching, totalCount, fetchWarehouseStock, fetchRollDetails, fetchVariantChildren, fetchVariantRolls } =
        useMaterialSearch({
            search: searchText,
            groupId: selectedGroup,
            designId: selectedDesign,
            colorId: selectedColor,
            inStockOnly,
            belowMinStock,
            supplierId: selectedSupplier,
            warehouseId: selectedWarehouse,
            flatMode,
        });

    // Filter dropdown data
    const { suppliers, warehouses: warehousesList } = useBrowserFilterData();

    // Track which materials are already in cart (by material_id + warehouse_id)
    const cartItemKeys = useMemo(() => {
        return new Set(items.map(i => `${i.material_id}__${i.warehouse_id || ''}`));
    }, [items]);
    const cartMaterialIds = useMemo(() => new Set(items.map(i => i.material_id)), [items]);

    // ─── Handlers ───────────────────────────────────────────────

    /** Toggle material expansion — loads warehouse stock AND variant children */
    const toggleExpand = useCallback((materialId: string) => {
        if (expandedMaterial === materialId) {
            setExpandedMaterial(null);
            return;
        }
        setExpandedMaterial(materialId);
    }, [expandedMaterial]);

    /** Toggle warehouse expansion — loads roll details */
    const toggleWarehouse = useCallback((materialId: string, warehouseId: string) => {
        const key = `${materialId}__${warehouseId}`;
        const newExpanded = new Set(expandedWarehouses);

        if (newExpanded.has(key)) {
            newExpanded.delete(key);
            setExpandedWarehouses(newExpanded);
            return;
        }

        newExpanded.add(key);
        setExpandedWarehouses(newExpanded);
    }, [expandedWarehouses]);

    /** Open AddToCartDialog for a specific warehouse */
    const handleOpenAddDialog = useCallback(async (material: MaterialSearchResult, wh: MaterialWarehouseStock) => {
        setDialogMaterial(material);
        setDialogWarehouse(wh);
        setDialogOpen(true);

        // ⚡ Load rolls synchronously from cache (no network, no await)
        const rolls = fetchRollDetails(material.id, wh.warehouse_id);
        setDialogRolls(rolls.map(r => ({
            id: r.id,
            roll_number: r.roll_number,
            current_length: r.current_length,
            available_length: r.available_length,
            reserved_length: r.reserved_length,
            status: r.status,
        })));
        setDialogRollsLoading(false);
    }, [fetchRollDetails]);

    /** Handle line item from AddToCartDialog (mode='line') */
    const handleAddLineItem = useCallback((item: {
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
    }) => {
        // Price arrives from AddToCartDialog already converted to invoice currency
        const unitPrice = item.unit_price;

        // Resolve discount
        let discount = 0;
        if (customerPricing?.resolvePrice) {
            const resolved = customerPricing.resolvePrice(item.material_id, item.quantity, unitPrice);
            discount = resolved.discountPercent;
        }

        const discountAmount = (discount / 100) * item.quantity * unitPrice;
        const subtotal = item.quantity * unitPrice;
        const netAfterDiscount = subtotal - discountAmount;

        // 🔑 القاعدة الذهبية: ضريبة المادة → ضريبة الشركة → 0%
        const materialData = materials.find(m => m.id === item.material_id);
        const resolved = resolveItemTaxRate(materialData?.tax_rate, companyTaxRate, companyTaxEnabled);
        const taxAmt = computeTaxAmount(netAfterDiscount, resolved.rate);

        // Get exchange rate for invoice currency → base currency
        const exRate = currency !== companyCurrency ? lookupExRate(currency, companyCurrency) : 1;

        const newItem: InvoiceLineItem = {
            id: generateLineItemId(),
            material_id: item.material_id,
            material_code: item.material_code,
            material_name_ar: item.material_name_ar,
            material_name_en: item.material_name_en,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: unitPrice,
            discount_percent: discount,
            discount_amount: discountAmount,
            subtotal,
            tax_rate: resolved.rate,
            tax_amount: taxAmt,
            total: netAfterDiscount + taxAmt,
            currency: currency,
            exchange_rate: exRate,
            warehouse_id: item.warehouse_id,
            warehouse_name_ar: item.warehouse_name_ar,
            notes: '',
            preferred_rolls: item.preferred_rolls,
        };

        onAddItem(newItem);
    }, [customerPricing, onAddItem, companyTaxRate, companyTaxEnabled, materials, currency, companyCurrency, lookupExRate]);

    /** Quick add (for materials with no stock → no warehouse) */
    const handleQuickAdd = useCallback((material: MaterialSearchResult) => {
        // Open dialog with empty warehouse
        setDialogMaterial(material);
        setDialogWarehouse({
            warehouse_id: '',
            warehouse_code: '',
            warehouse_name_ar: t('بدون مستودع', 'No Warehouse'),
            warehouse_name_en: 'No Warehouse',
            roll_count: 0,
            total_length: 0,
            available_length: 0,
            reserved_length: 0,
            last_updated: null,
        });
        setDialogRolls([]);
        setDialogRollsLoading(false);
        setDialogOpen(true);
    }, []);

    const getQtyBreaksForMaterial = useCallback((materialId: string): PriceListItem[] => {
        if (!customerPricing?.priceItems) return [];
        return customerPricing.priceItems.filter(item => item.productId === materialId);
    }, [customerPricing]);

    const clearFilters = useCallback(() => {
        setSearchText('');
        setSelectedGroup('all');
        setSelectedDesign('all');
        setSelectedColor('all');
        setSelectedSupplier('all');
        setSelectedWarehouse('all');
        setInStockOnly(true);
        setBelowMinStock(false);
    }, []);

    const hasActiveFilters = searchText || selectedGroup !== 'all' || selectedDesign !== 'all'
        || selectedColor !== 'all' || selectedSupplier !== 'all' || selectedWarehouse !== 'all'
        || !inStockOnly || belowMinStock;

    const activeFilterCount = [
        selectedGroup !== 'all',
        selectedDesign !== 'all',
        selectedColor !== 'all',
        selectedSupplier !== 'all',
        selectedWarehouse !== 'all',
        !inStockOnly,
        belowMinStock,
        !!searchText,
    ].filter(Boolean).length;

    // Roll status label
    const getRollStatusLabel = (status: string) => {
        const map: Record<string, { ar: string; en: string; color: string }> = {
            available: { ar: 'متاح', en: 'Available', color: 'green' },
            reserved: { ar: 'محجوز', en: 'Reserved', color: 'orange' },
            partial: { ar: 'جزئي', en: 'Partial', color: 'blue' },
            consumed: { ar: 'مستهلك', en: 'Consumed', color: 'red' },
        };
        return map[status] || map.available;
    };

    // ─── Render ─────────────────────────────────────────────

    return (
        <div className="space-y-2" dir={direction}>
            {/* ═══ Search Bar ═══ */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={t('ابحث بالاسم أو الكود أو الباركود...', 'Search by name, code, or barcode...')}
                        className={`${isRTL ? 'pr-9' : 'pl-9'} h-9 bg-white dark:bg-gray-800`}
                    />
                    {isSearching && (
                        <Loader2 className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin ${isRTL ? 'left-3' : 'right-3'}`} />
                    )}
                </div>

                {/* Results count */}
                <Badge variant="outline" className="text-xs h-9 px-3 flex items-center gap-1 shrink-0">
                    <Package className="w-3 h-3" />
                    {totalCount} {t('مادة', 'materials')}
                </Badge>
            </div>

            {/* ═══ Filters Panel — Always Visible ═══ */}
            <Card className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Group filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('المجموعة', 'Group')}
                            </Label>
                            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedGroup !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-right">
                                    <SelectItem value="all">{t('كل المجموعات', 'All Groups')}</SelectItem>
                                    {groups.map((g: any) => (
                                        <SelectItem key={g.id} value={g.id}>
                                            <span className="flex items-center gap-1.5" dir="rtl">
                                                {g.code && <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{g.code}</span>}
                                                <span>{isRTL ? g.name_ar : (g.name_en || g.name_ar)}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Design filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('التصميم', 'Design')}
                            </Label>
                            <Select value={selectedDesign} onValueChange={setSelectedDesign}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedDesign !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-right">
                                    <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                                    {designFilters.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            <span className="flex items-center gap-1.5" dir="rtl">
                                                <span className="text-sm w-4 text-center">{DESIGN_ICONS[d.name_ar] || '◈'}</span>
                                                <span>{isRTL ? d.name_ar : (d.name_en || d.name_ar)}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Color filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('اللون', 'Color')}
                            </Label>
                            <Select value={selectedColor} onValueChange={setSelectedColor}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedColor !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-right">
                                    <SelectItem value="all">{t('كل الألوان', 'All Colors')}</SelectItem>
                                    {colorFilters.map((c: any) => {
                                        const hex = COLOR_HEX[c.name_ar] || c.hex_code || '#808080';
                                        const isWhite = hex.toUpperCase() === '#FFFFFF' || hex.toUpperCase() === '#FFFDD0';
                                        return (
                                            <SelectItem key={c.id} value={c.id}>
                                                <span className="flex items-center gap-1.5" dir="rtl">
                                                    <span
                                                        className={cn('w-3.5 h-3.5 rounded-full inline-block shadow-sm', isWhite ? 'border-2 border-gray-300' : 'border border-gray-200')}
                                                        style={{ backgroundColor: hex }}
                                                    />
                                                    <span>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</span>
                                                </span>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Supplier filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('المورد', 'Supplier')}
                            </Label>
                            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedSupplier !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل الموردين', 'All Suppliers')}</SelectItem>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {isRTL ? s.name_ar : (s.name_en || s.name_ar)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Warehouse filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('المستودع', 'Warehouse')}
                            </Label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse} disabled={!!sourceWarehouseId}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedWarehouse !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20', !!sourceWarehouseId && 'opacity-70 cursor-default')}>
                                    <div className="flex items-center gap-1">
                                        {!!sourceWarehouseId && <Lock className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />}
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {!sourceWarehouseId && <SelectItem value="all">{t('كل المستودعات', 'All Warehouses')}</SelectItem>}
                                    {warehousesList.map(w => (
                                        <SelectItem key={w.id} value={w.id}>
                                            <span className="flex items-center gap-1.5">
                                                <Warehouse className="w-3 h-3 text-gray-400" />
                                                {isRTL ? w.name_ar : (w.name_en || w.name_ar)}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Price Group filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('التسعير', 'Pricing')}
                            </Label>
                            <Select value={selectedPriceGroup} onValueChange={setSelectedPriceGroup}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedPriceGroup !== 'retail' && 'border-amber-400 bg-amber-50 dark:bg-amber-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="retail">
                                        <span className="flex items-center gap-1.5">
                                            🏷️ {t('سعر المفرد', 'Retail Price')}
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="wholesale" disabled>
                                        <span className="flex items-center gap-1.5 text-gray-400">
                                            📦 {t('سعر الجملة', 'Wholesale')}
                                            <Badge variant="outline" className="text-[8px] h-3">{t('قريباً', 'Soon')}</Badge>
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quick Toggle Buttons */}
                        <div className="flex flex-col gap-1">
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('فلاتر سريعة', 'Quick Filters')}
                            </Label>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant={inStockOnly ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        'h-7 text-[10px] px-2 gap-1',
                                        inStockOnly
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300',
                                    )}
                                    onClick={() => setInStockOnly(!inStockOnly)}
                                >
                                    <Package className="w-3 h-3" />
                                    {inStockOnly
                                        ? t('عرض الكل', 'Show All')
                                        : t('المتوفر فقط', 'In Stock Only')
                                    }
                                </Button>

                                <Button
                                    variant={belowMinStock ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        'h-7 text-[10px] px-2 gap-1',
                                        belowMinStock && 'bg-red-600 hover:bg-red-700 text-white',
                                    )}
                                    onClick={() => setBelowMinStock(!belowMinStock)}
                                >
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('حد أدنى', 'Min Stock')}
                                </Button>

                                {/* Grouped / Flat toggle */}
                                <Button
                                    variant={flatMode ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        'h-7 text-[10px] px-2 gap-1',
                                        flatMode
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300',
                                    )}
                                    onClick={() => setFlatMode(!flatMode)}
                                >
                                    {flatMode
                                        ? <><List className="w-3 h-3" /> {t('سائب', 'Flat')}</>
                                        : <><LayoutGrid className="w-3 h-3" /> {t('مجمّع', 'Grouped')}</>
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Active filters summary + Clear */}
                    {hasActiveFilters && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {activeFilterCount} {t('فلتر نشط', 'active filters')}
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1 px-2"
                            >
                                <RotateCcw className="w-3 h-3" />
                                {t('إزالة كل الفلاتر', 'Clear All Filters')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Results ═══ */}
            {(isLoading || isRestoring) && materials.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ms-2 text-sm text-gray-500">
                        {isRestoring
                            ? t('جاري استعادة البيانات...', 'Restoring data...')
                            : t('جاري تحميل المواد...', 'Loading materials...')
                        }
                    </span>
                </div>
            ) : materials.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                        {searchText
                            ? t(`لا توجد نتائج لـ "${searchText}"`, `No results for "${searchText}"`)
                            : t('لا توجد مواد', 'No materials found')
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-1.5 max-h-[calc(100vh-380px)] overflow-y-auto pe-1">
                    {/* Subtle sync indicator — shows while refreshing in background */}
                    {isLoading && materials.length > 0 && (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-blue-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('يتم المزامنة...', 'Syncing...')}
                        </div>
                    )}
                    {materials.map((material) => {
                        const isExpanded = expandedMaterial === material.id;
                        const isInCart = cartMaterialIds.has(material.id);
                        const qtyBreaks = getQtyBreaksForMaterial(material.id);
                        const hasQtyBreaks = qtyBreaks.length > 1;
                        const isStockLoading = false;
                        // ─── Warehouse stock resolution ───────────────────
                        let warehouseStock = fetchWarehouseStock(material.id, warehousesList);
                        
                        // In flat mode: child variants often have no direct rolls/inventory_stock
                        // ❌ OLD BUG: falling back to parent's data showed parent's warehouses with 0 qty
                        // ✅ FIX: Build synthetic per-warehouse entries from the child's own stock_qty
                        if (warehouseStock.length === 0 && material.stock_qty > 0) {
                            if (material.parent_material_id && flatMode) {
                                // Child variant with stock but no warehouse data
                                // Strategy: Get parent's warehouse LIST, then proportionally distribute child's stock
                                const parentWarehouses = fetchWarehouseStock(material.parent_material_id, warehousesList);
                                if (parentWarehouses.length > 0) {
                                    // Calculate parent's total stock across all warehouses
                                    const parentTotal = parentWarehouses.reduce((sum, pw) => {
                                        const whStock = (pw.roll_count > 0)
                                            ? pw.available_length + (pw.loose_stock || 0)
                                            : Math.max(pw.available_length, pw.loose_stock || 0, pw.total_length);
                                        return sum + whStock;
                                    }, 0);
                                    
                                    if (parentTotal > 0) {
                                        // Distribute child's stock proportionally based on parent's warehouse distribution
                                        warehouseStock = parentWarehouses
                                            .map(pw => {
                                                const whStock = (pw.roll_count > 0)
                                                    ? pw.available_length + (pw.loose_stock || 0)
                                                    : Math.max(pw.available_length, pw.loose_stock || 0, pw.total_length);
                                                const ratio = whStock / parentTotal;
                                                const childQtyInWh = Math.round(material.stock_qty * ratio * 10) / 10;
                                                return {
                                                    warehouse_id: pw.warehouse_id,
                                                    warehouse_code: pw.warehouse_code,
                                                    warehouse_name_ar: pw.warehouse_name_ar,
                                                    warehouse_name_en: pw.warehouse_name_en,
                                                    roll_count: 0,
                                                    total_length: childQtyInWh,
                                                    available_length: childQtyInWh,
                                                    reserved_length: 0,
                                                    loose_stock: 0,
                                                    last_updated: null,
                                                };
                                            })
                                            .filter(ws => ws.available_length > 0);
                                    }
                                }
                            }
                            
                            // Final fallback: use default_warehouse_id
                            if (warehouseStock.length === 0 && material.stock_qty > 0) {
                                const whId = material.default_warehouse_id;
                                if (whId) {
                                    const whInfo = warehousesList.find((w: any) => w.id === whId);
                                    warehouseStock = [{
                                        warehouse_id: whId,
                                        warehouse_code: whInfo?.code || '',
                                        warehouse_name_ar: whInfo?.name_ar || t('مستودع افتراضي', 'Default'),
                                        warehouse_name_en: whInfo?.name_en || 'Default',
                                        roll_count: material.roll_count,
                                        total_length: material.stock_qty,
                                        available_length: material.stock_qty,
                                        reserved_length: 0,
                                        loose_stock: 0,
                                        last_updated: null,
                                    }];
                                }
                            }
                        } else if (warehouseStock.length === 0 && !flatMode && material.parent_material_id) {
                            // Grouped mode: try parent (for non-flat display)
                            warehouseStock = fetchWarehouseStock(material.parent_material_id, warehousesList);
                        }

                        // Resolve price for display — then convert to document currency
                        let basePriceRaw = material.selling_price;
                        let priceSource: 'price_list' | 'base_price' | 'manual' = 'base_price';
                        if (customerPricing?.resolvePrice) {
                            const resolved = customerPricing.resolvePrice(
                                material.id, 1, material.selling_price
                            );
                            basePriceRaw = resolved.unitPrice;
                            priceSource = resolved.source;
                        }
                        // Convert to document currency
                        const displayPrice = convertPrice(basePriceRaw, material.currency || companyCurrency);

                        const isLowStock = material.stock_qty > 0 && material.stock_qty <= material.min_stock;

                        return (
                            <Card
                                key={material.id}
                                className={cn(
                                    'transition-all duration-200 hover:shadow-md',
                                    isInCart && 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10',
                                    !isInCart && 'hover:border-gray-300 dark:hover:border-gray-600',
                                    isExpanded && 'ring-1 ring-indigo-200 dark:ring-indigo-800',
                                )}
                            >
                                <CardContent className="p-0">
                                    {/* ─── Main Row ─── */}
                                    <div
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-2 cursor-pointer",
                                            !(material.is_variant_parent || material.has_variants) && material.roll_count === 0 && 'hover:bg-green-50/50 dark:hover:bg-green-900/10'
                                        )}
                                        onClick={() => {
                                            const isParentMat = material.is_variant_parent || material.has_variants;
                                            const hasRolls = material.roll_count > 0;
                                            if (flatMode) {
                                                // Flat mode: always expand to show warehouse breakdown
                                                toggleExpand(material.id);
                                            } else if (!isParentMat && !hasRolls) {
                                                // Grouped mode, simple material — add directly
                                                handleQuickAdd(material);
                                            } else {
                                                toggleExpand(material.id);
                                            }
                                        }}
                                    >
                                        {/* Swatch / Icon */}
                                        <div className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                                            {material.swatch_url ? (
                                                <img
                                                    src={material.swatch_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Package className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>

                                        {/* Info — Name + Meta */}
                                        <div className="flex-1 min-w-0">
                                            {/* Line 1: Name + Badges */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {isRTL ? material.name_ar : (material.name_en || material.name_ar)}
                                                </span>
                                                {isInCart && (
                                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                                                        {t('في السلة', 'In Cart')}
                                                    </Badge>
                                                )}
                                                {(material.is_variant_parent || material.has_variants) && (
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
                                                        <Layers className="w-2 h-2" />
                                                        {t('أم', 'Parent')}
                                                    </Badge>
                                                )}
                                            </div>
                                            {/* Line 2: Code + Group + Variant Count + Inline Stats */}
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px]">
                                                <span className="font-mono text-gray-400">{material.code}</span>
                                                {material.group_name_ar && (
                                                    <>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="text-gray-400">{isRTL ? material.group_name_ar : (material.group_name_en || material.group_name_ar)}</span>
                                                    </>
                                                )}
                                                {(material.is_variant_parent || material.has_variants) && (
                                                    <>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="text-purple-500 dark:text-purple-400 font-medium">
                                                            <Layers className="w-2.5 h-2.5 inline me-0.5" />
                                                            {variantCountMap[material.id] || 0} {t('متغير', 'var')}
                                                        </span>
                                                    </>
                                                )}
                                                {isLowStock && (
                                                    <span className="text-amber-500 flex items-center gap-0.5">
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        {t('منخفض', 'Low')}
                                                    </span>
                                                )}
                                                {/* Warehouse badges — flat mode only */}
                                                {flatMode && warehouseStock.length > 0 && warehouseStock.map((ws) => (
                                                    <span
                                                        key={ws.warehouse_id}
                                                        className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                                                    >
                                                        <span className="truncate max-w-[70px]">{isRTL ? ws.warehouse_name_ar : (ws.warehouse_name_en || ws.warehouse_name_ar)}</span>
                                                        <span className="text-gray-400">·</span>
                                                        <span className="font-mono font-semibold">{ws.total_length.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                                        {ws.roll_count > 0 && (
                                                            <span className="text-indigo-500">({ws.roll_count}R)</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Side: Stock + Rolls + Price — Always visible */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Stock Qty */}
                                            <div className={cn(
                                                'flex flex-col items-center px-2 py-1 rounded-md min-w-[60px]',
                                                material.stock_qty === 0
                                                    ? 'bg-red-50 dark:bg-red-900/10'
                                                    : isLowStock
                                                        ? 'bg-amber-50 dark:bg-amber-900/10'
                                                        : 'bg-green-50 dark:bg-green-900/10'
                                            )}>
                                                <span className={cn(
                                                    'font-mono font-bold text-[13px] leading-tight',
                                                    material.stock_qty === 0 ? 'text-red-500'
                                                        : isLowStock ? 'text-amber-600'
                                                            : 'text-green-600 dark:text-green-400'
                                                )}>
                                                    {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </span>
                                                <span className="text-[9px] text-gray-400">{material.unit}</span>
                                            </div>

                                            {/* Rolls */}
                                            <div className="flex flex-col items-center px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/10 min-w-[45px]">
                                                <span className="font-mono font-bold text-[13px] leading-tight text-indigo-600 dark:text-indigo-400">
                                                    {material.roll_count}
                                                </span>
                                                <span className="text-[9px] text-gray-400">{t('رول', 'rolls')}</span>
                                            </div>

                                            {/* Price */}
                                            <div className="flex flex-col items-center px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800/40 min-w-[65px]">
                                                {priceSource === 'price_list' && displayPrice !== material.selling_price ? (
                                                    <>
                                                        <span className="font-mono font-bold text-[13px] leading-tight text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                                            <Sparkles className="w-2.5 h-2.5" />
                                                            {displayPrice.toFixed(2)}
                                                        </span>
                                                        <span className="text-[8px] text-gray-400 line-through">{material.selling_price.toFixed(2)}</span>
                                                    </>
                                                ) : (material.is_variant_parent || material.has_variants) && displayPrice === 0 ? (
                                                    /* Parent with different prices → show tag */
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                                                        🏷️ {t('أسعار مختلفة', 'Varied')}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="font-mono font-bold text-[13px] leading-tight text-gray-700 dark:text-gray-300">
                                                            {displayPrice.toFixed(2)}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400">{currency}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Add button — for non-parent materials */}
                                        {!(material.is_variant_parent || material.has_variants) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (flatMode && warehouseStock.length > 1) {
                                                        // Multiple warehouses — open dialog to choose
                                                        setDialogMaterial(material);
                                                        setDialogWarehouse(null);
                                                        setDialogOpen(true);
                                                    } else if (flatMode && warehouseStock.length === 1) {
                                                        // Single warehouse — add with warehouse pre-selected
                                                        setDialogMaterial(material);
                                                        setDialogWarehouse(warehouseStock[0]);
                                                        setDialogOpen(true);
                                                    } else {
                                                        handleQuickAdd(material);
                                                    }
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                        )}

                                        {/* Expand indicator — parents, materials with rolls, or flat mode */}
                                        {(flatMode || (material.is_variant_parent || material.has_variants) || material.roll_count > 0) && (
                                            <div className="shrink-0">
                                                {isExpanded
                                                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                                                }
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Expanded Section ─── */}
                                    {isExpanded && (() => {
                                        const isParent = material.is_variant_parent || material.has_variants;

                                        // ═══ FLAT MODE: Show warehouse breakdown ═══
                                        if (flatMode) {
                                            // Get roll details for this material (try self, then parent)
                                            const materialIdForRolls = material.parent_material_id || material.id;
                                            return (
                                                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2">
                                                    <div className="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
                                                        <Warehouse className="w-3 h-3" />
                                                        {t('توزيع المخزون', 'Stock Distribution')}
                                                    </div>
                                                    {warehouseStock.length > 0 ? (
                                                        <div className="space-y-1.5">
                                                            {warehouseStock.map((ws) => {
                                                                const wsRolls = ws.roll_count > 0
                                                                    ? fetchRollDetails(materialIdForRolls, ws.warehouse_id)
                                                                    : [];
                                                                const isWhExpanded = expandedWarehouses.has(`flat_${material.id}_${ws.warehouse_id}`);
                                                                const whKey = `flat_${material.id}_${ws.warehouse_id}`;
                                                                return (
                                                                    <div key={ws.warehouse_id} className="rounded-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                                        {/* Warehouse header row */}
                                                                        <div
                                                                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (wsRolls.length > 0) {
                                                                                    setExpandedWarehouses(prev => {
                                                                                        const next = new Set(prev);
                                                                                        next.has(whKey) ? next.delete(whKey) : next.add(whKey);
                                                                                        return next;
                                                                                    });
                                                                                } else {
                                                                                    // No rolls — open add dialog directly
                                                                                    setDialogMaterial(material);
                                                                                    setDialogWarehouse(ws);
                                                                                    setDialogOpen(true);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Warehouse className="w-3 h-3 text-blue-400" />
                                                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                                    {isRTL ? ws.warehouse_name_ar : (ws.warehouse_name_en || ws.warehouse_name_ar)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={cn("text-[10px]", ws.roll_count > 0 ? "text-indigo-500" : "text-gray-400")}>
                                                                                    {ws.roll_count} {t('رول', 'rolls')}
                                                                                </span>
                                                                                <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400 min-w-[45px] text-end">
                                                                                    {ws.total_length.toLocaleString('en-US', { maximumFractionDigits: 0 })} {material.unit}
                                                                                </span>
                                                                                {wsRolls.length > 0 ? (
                                                                                    isWhExpanded
                                                                                        ? <ChevronUp className="w-3 h-3 text-gray-400" />
                                                                                        : <ChevronDown className="w-3 h-3 text-gray-400" />
                                                                                ) : (
                                                                                    <Plus className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {/* Rolls list — expandable */}
                                                                        {isWhExpanded && wsRolls.length > 0 && (
                                                                            <div className="border-t border-gray-100 dark:border-gray-700 px-2 py-1 space-y-0.5">
                                                                                {wsRolls.map((roll) => (
                                                                                    <div
                                                                                        key={roll.id}
                                                                                        className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer text-[11px]"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setDialogMaterial(material);
                                                                                            setDialogWarehouse(ws);
                                                                                            setDialogOpen(true);
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="font-mono text-gray-400">#{roll.roll_number}</span>
                                                                                            <Badge variant="outline" className={cn(
                                                                                                'text-[8px] h-3.5 px-1',
                                                                                                roll.status === 'available' && 'border-green-300 text-green-600',
                                                                                                roll.status === 'reserved' && 'border-orange-300 text-orange-600',
                                                                                                roll.status === 'partial' && 'border-blue-300 text-blue-600',
                                                                                            )}>
                                                                                                {roll.status === 'available' ? t('متاح', 'Avail')
                                                                                                    : roll.status === 'reserved' ? t('محجوز', 'Rsrvd')
                                                                                                    : t('جزئي', 'Part')}
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="font-mono font-bold text-green-600 dark:text-green-400">
                                                                                                {roll.current_length.toLocaleString('en-US', { maximumFractionDigits: 1 })} {material.unit}
                                                                                            </span>
                                                                                            <Plus className="w-3 h-3 text-green-500 opacity-50 hover:opacity-100" />
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-400 text-center py-2">
                                                            {t('لا يوجد مخزون في المستودعات', 'No warehouse stock')}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // ═══ GROUPED MODE: Show variant children hierarchy ═══
                                        const isVarLoading = false;
                                        const variantChildren = isParent ? fetchVariantChildren(material.id) : [];
                                        const variantRolls = isParent && variantChildren.length > 0
                                            ? fetchVariantRolls(variantChildren.map(c => c.id))
                                            : [];

                                        // ═══ BUILD WAREHOUSE → GROUP → VARIANT HIERARCHY ═══
                                        type VariantEntry = { material: MaterialSearchResult; qty: number; roll_count: number; rolls: VariantRollData[] };
                                        type GroupEntry = { id: string; name_ar: string; name_en: string; variants: Map<string, VariantEntry> };
                                        type WhEntry = { id: string; name_ar: string; name_en: string; total_qty: number; total_rolls: number; groups: Map<string, GroupEntry> };

                                        const warehouseHierarchy: WhEntry[] = [];
                                        if (isParent && variantRolls.length > 0) {
                                            const whMap = new Map<string, WhEntry>();
                                            for (const roll of variantRolls) {
                                                const child = variantChildren.find(c => c.id === roll.material_id);
                                                if (!child) continue;

                                                const whId = roll.warehouse_id;
                                                if (!whMap.has(whId)) {
                                                    const whInfo = warehousesList.find((w: any) => w.id === whId);
                                                    whMap.set(whId, {
                                                        id: whId,
                                                        name_ar: whInfo?.name_ar || whId,
                                                        name_en: whInfo?.name_en || whInfo?.name_ar || whId,
                                                        total_qty: 0, total_rolls: 0,
                                                        groups: new Map(),
                                                    });
                                                }
                                                const wh = whMap.get(whId)!;
                                                wh.total_qty += roll.available_length;
                                                wh.total_rolls += 1;

                                                const grpId = child.group_id || 'ungrouped';
                                                if (!wh.groups.has(grpId)) {
                                                    wh.groups.set(grpId, {
                                                        id: grpId,
                                                        name_ar: child.group_name_ar || t('بدون مجموعة', 'Ungrouped'),
                                                        name_en: child.group_name_en || 'Ungrouped',
                                                        variants: new Map(),
                                                    });
                                                }
                                                const grp = wh.groups.get(grpId)!;
                                                if (!grp.variants.has(child.id)) {
                                                    grp.variants.set(child.id, { material: child, qty: 0, roll_count: 0, rolls: [] });
                                                }
                                                const v = grp.variants.get(child.id)!;
                                                v.qty += roll.available_length;
                                                v.roll_count += 1;
                                                v.rolls.push(roll);
                                            }

                                            // ✅ FIX: Also include warehouses from inventory_stock (not just rolls)
                                            // This adds stock from warehouses where children have loose stock (no rolls)
                                            for (const child of variantChildren) {
                                                const childWhStock = fetchWarehouseStock(child.id, warehousesList);
                                                for (const cws of childWhStock) {
                                                    const whId = cws.warehouse_id;
                                                    // Skip warehouses already covered by rolls
                                                    if (whMap.has(whId)) {
                                                        // Update quantities if inventory_stock shows more
                                                        const existingWh = whMap.get(whId)!;
                                                        const grpId = child.group_id || 'ungrouped';
                                                        const grp = existingWh.groups.get(grpId);
                                                        const existingVariant = grp?.variants.get(child.id);
                                                        if (existingVariant && cws.loose_stock && cws.loose_stock > 0) {
                                                            existingVariant.qty += cws.loose_stock;
                                                            existingWh.total_qty += cws.loose_stock;
                                                        }
                                                        continue;
                                                    }
                                                    
                                                    // New warehouse from inventory_stock
                                                    const totalInWh = (cws.roll_count > 0)
                                                        ? cws.available_length + (cws.loose_stock || 0)
                                                        : Math.max(cws.available_length, cws.loose_stock || 0, cws.total_length);
                                                    if (totalInWh <= 0) continue;
                                                    
                                                    if (!whMap.has(whId)) {
                                                        whMap.set(whId, {
                                                            id: whId,
                                                            name_ar: cws.warehouse_name_ar || whId,
                                                            name_en: cws.warehouse_name_en || whId,
                                                            total_qty: 0, total_rolls: 0,
                                                            groups: new Map(),
                                                        });
                                                    }
                                                    const wh = whMap.get(whId)!;
                                                    wh.total_qty += totalInWh;
                                                    
                                                    const vd = (child as any).variant_data;
                                                    const designId = vd?.design?.value_id || child.group_id || 'ungrouped';
                                                    if (!wh.groups.has(designId)) {
                                                        wh.groups.set(designId, {
                                                            id: designId,
                                                            name_ar: vd?.design?.name_ar || child.group_name_ar || t('بدون تصنيف', 'Uncategorized'),
                                                            name_en: vd?.design?.name_en || child.group_name_en || 'Uncategorized',
                                                            variants: new Map(),
                                                        });
                                                    }
                                                    const grp = wh.groups.get(designId)!;
                                                    if (!grp.variants.has(child.id)) {
                                                        grp.variants.set(child.id, {
                                                            material: child,
                                                            qty: totalInWh,
                                                            roll_count: cws.roll_count,
                                                            rolls: [],
                                                        });
                                                    }
                                                }
                                            }

                                            warehouseHierarchy.push(...Array.from(whMap.values()));
                                        }

                                        // ═══ FALLBACK: Build from current_stock when no rolls ═══
                                        // Groups variants by design (from variant_data), shows current_stock
                                        if (isParent && variantRolls.length === 0 && variantChildren.length > 0) {
                                            // ✅ FIX: Build from inventory_stock per warehouse instead of dumping all into warehousesList[0]
                                            const allChildWhMap = new Map<string, WhEntry>();
                                            
                                            for (const child of variantChildren) {
                                                const childStock = child.stock_qty || child.current_stock || 0;
                                                if (childStock <= 0) continue;
                                                
                                                // Try to get actual warehouse distribution
                                                let childWarehouses = fetchWarehouseStock(child.id, warehousesList);
                                                
                                                // If no warehouse data, use default_warehouse_id
                                                if (childWarehouses.length === 0 && child.default_warehouse_id) {
                                                    const whInfo = warehousesList.find((w: any) => w.id === child.default_warehouse_id);
                                                    childWarehouses = [{
                                                        warehouse_id: child.default_warehouse_id,
                                                        warehouse_code: whInfo?.code || '',
                                                        warehouse_name_ar: whInfo?.name_ar || t('مستودع', 'Warehouse'),
                                                        warehouse_name_en: whInfo?.name_en || 'Warehouse',
                                                        roll_count: 0,
                                                        total_length: childStock,
                                                        available_length: childStock,
                                                        reserved_length: 0,
                                                        loose_stock: childStock,
                                                        last_updated: null,
                                                    }];
                                                }
                                                
                                                // Still no warehouse data → use first warehouse as last resort
                                                if (childWarehouses.length === 0 && warehousesList.length > 0) {
                                                    const firstWh = warehousesList[0];
                                                    childWarehouses = [{
                                                        warehouse_id: firstWh.id,
                                                        warehouse_code: firstWh.code || '',
                                                        warehouse_name_ar: firstWh.name_ar || t('المخزون العام', 'General Stock'),
                                                        warehouse_name_en: firstWh.name_en || 'General Stock',
                                                        roll_count: 0,
                                                        total_length: childStock,
                                                        available_length: childStock,
                                                        reserved_length: 0,
                                                        loose_stock: childStock,
                                                        last_updated: null,
                                                    }];
                                                }
                                                
                                                // Distribute child's stock across its warehouses
                                                for (const cws of childWarehouses) {
                                                    const whId = cws.warehouse_id;
                                                    const qtyInWh = (cws.roll_count > 0)
                                                        ? cws.available_length + (cws.loose_stock || 0)
                                                        : Math.max(cws.available_length, cws.loose_stock || 0, cws.total_length);
                                                    if (qtyInWh <= 0) continue;
                                                    
                                                    if (!allChildWhMap.has(whId)) {
                                                        allChildWhMap.set(whId, {
                                                            id: whId,
                                                            name_ar: cws.warehouse_name_ar || whId,
                                                            name_en: cws.warehouse_name_en || whId,
                                                            total_qty: 0, total_rolls: 0,
                                                            groups: new Map(),
                                                        });
                                                    }
                                                    const wh = allChildWhMap.get(whId)!;
                                                    wh.total_qty += qtyInWh;
                                                    wh.total_rolls += child.roll_count || 0;
                                                    
                                                    const vd = (child as any).variant_data;
                                                    const designId = vd?.design?.value_id || child.group_id || 'ungrouped';
                                                    if (!wh.groups.has(designId)) {
                                                        wh.groups.set(designId, {
                                                            id: designId,
                                                            name_ar: vd?.design?.name_ar || child.group_name_ar || t('بدون تصنيف', 'Uncategorized'),
                                                            name_en: vd?.design?.name_en || child.group_name_en || 'Uncategorized',
                                                            variants: new Map(),
                                                        });
                                                    }
                                                    const grp = wh.groups.get(designId)!;
                                                    if (!grp.variants.has(child.id)) {
                                                        grp.variants.set(child.id, {
                                                            material: child,
                                                            qty: qtyInWh,
                                                            roll_count: child.roll_count || 0,
                                                            rolls: [],
                                                        });
                                                    } else {
                                                        const existing = grp.variants.get(child.id)!;
                                                        existing.qty += qtyInWh;
                                                    }
                                                }
                                            }

                                            warehouseHierarchy.push(...Array.from(allChildWhMap.values()));
                                        }

                                        return (
                                            <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2 space-y-3">
                                                {/* ═══ VARIANT PARENT: Hierarchical warehouse view ═══ */}
                                                {isParent ? (
                                                    <>
                                                        {isVarLoading ? (
                                                            <div className="flex items-center gap-2 justify-center py-6 text-gray-400">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="text-sm">{t('تحميل المتغيرات...', 'Loading variants...')}</span>
                                                            </div>
                                                        ) : warehouseHierarchy.length === 0 ? (
                                                            <div className="text-center py-4 text-sm text-gray-400">
                                                                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                                {t('لا يوجد مخزون للمتغيرات', 'No stock for variants')}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {/* ─── Level 1: Warehouses ─── */}
                                                                {warehouseHierarchy.map(wh => {
                                                                    const whKey = `${material.id}__wh__${wh.id}`;
                                                                    const isWhOpen = expandedVariantWarehouses.has(whKey);

                                                                    return (
                                                                        <div key={wh.id} className="border rounded-lg overflow-hidden">
                                                                            {/* Warehouse Header */}
                                                                            <div
                                                                                className={cn(
                                                                                    'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                                                                                    isWhOpen ? 'bg-indigo-50/80 dark:bg-indigo-900/20' : 'bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100/80'
                                                                                )}
                                                                                onClick={() => {
                                                                                    setExpandedVariantWarehouses(prev => {
                                                                                        const next = new Set(prev);
                                                                                        next.has(whKey) ? next.delete(whKey) : next.add(whKey);
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <Warehouse className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                                                <span className="text-xs font-medium flex-1">
                                                                                    {isRTL ? wh.name_ar : wh.name_en}
                                                                                </span>
                                                                                <Badge variant="outline" className="text-[10px] h-5 bg-green-50 border-green-200 text-green-700">
                                                                                    {wh.total_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })} {material.unit}
                                                                                </Badge>
                                                                                <Badge variant="outline" className="text-[9px] h-5">
                                                                                    {wh.total_rolls} {t('رولون', 'rolls')}
                                                                                </Badge>
                                                                                <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', isWhOpen && 'rotate-180')} />
                                                                            </div>

                                                                            {/* ─── Level 2: Design Groups inside warehouse ─── */}
                                                                            {isWhOpen && (
                                                                                <div className="border-t divide-y divide-gray-100 dark:divide-gray-800">
                                                                                    {Array.from(wh.groups.values()).map(grp => {
                                                                                        const grpKey = `${material.id}__wh__${wh.id}__grp__${grp.id}`;
                                                                                        const isGrpOpen = expandedVariantGroups.has(grpKey);
                                                                                        const grpVariants = Array.from(grp.variants.values()).filter(v => v.qty > 0);
                                                                                        const grpTotalQty = grpVariants.reduce((sum, v) => sum + v.qty, 0);

                                                                                        if (grpVariants.length === 0) return null;

                                                                                        return (
                                                                                            <div key={grp.id}>
                                                                                                {/* Group Header */}
                                                                                                <div
                                                                                                    className={cn(
                                                                                                        'flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors',
                                                                                                        isGrpOpen ? 'bg-purple-50/60 dark:bg-purple-900/15' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                                                                                                    )}
                                                                                                    onClick={() => {
                                                                                                        setExpandedVariantGroups(prev => {
                                                                                                            const next = new Set(prev);
                                                                                                            next.has(grpKey) ? next.delete(grpKey) : next.add(grpKey);
                                                                                                            return next;
                                                                                                        });
                                                                                                    }}
                                                                                                >
                                                                                                    <Layers className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                                                                                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300 flex-1">
                                                                                                        {isRTL ? grp.name_ar : (grp.name_en || grp.name_ar)}
                                                                                                    </span>
                                                                                                    <span className="text-[10px] font-mono text-gray-500">
                                                                                                        {grpTotalQty.toLocaleString('en-US', { maximumFractionDigits: 1 })} {material.unit}
                                                                                                    </span>
                                                                                                    <Badge variant="outline" className="text-[9px] h-4">
                                                                                                        {grpVariants.length}
                                                                                                    </Badge>
                                                                                                    <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform', isGrpOpen && 'rotate-180')} />
                                                                                                </div>

                                                                                                {/* ─── Level 3: Color Variants inside group ─── */}
                                                                                                {isGrpOpen && (
                                                                                                    <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                                                                                                        {grpVariants.map(variant => {
                                                                                                            const varKey = `${material.id}__wh__${wh.id}__var__${variant.material.id}`;
                                                                                                            const isVarOpen = expandedVariantColors.has(varKey);
                                                                                                            const varInCart = cartMaterialIds.has(variant.material.id);
                                                                                                            const varName = isRTL ? variant.material.name_ar : (variant.material.name_en || variant.material.name_ar);
                                                                                                            const shortName = varName
                                                                                                                .replace(material.name_ar, '').replace(material.name_en || '', '')
                                                                                                                .replace(/^\s*[-–—]\s*/, '').trim() || varName;

                                                                                                            return (
                                                                                                                <div key={variant.material.id}>
                                                                                                                    {/* Color Row */}
                                                                                                                    <div
                                                                                                                        className={cn(
                                                                                                                            'flex items-center gap-2 px-5 py-2 text-xs cursor-pointer transition-colors',
                                                                                                                            isVarOpen && 'bg-blue-50/40 dark:bg-blue-900/10',
                                                                                                                            varInCart && 'bg-emerald-50/30 dark:bg-emerald-900/10',
                                                                                                                            !isVarOpen && !varInCart && variant.rolls.length > 0
                                                                                                                                ? 'hover:bg-gray-50 dark:hover:bg-gray-800/20'
                                                                                                                                : !varInCart && 'hover:bg-green-50/50 dark:hover:bg-green-900/10'
                                                                                                                        )}
                                                                                                                        onClick={() => {
                                                                                                                            if (variant.rolls.length > 0) {
                                                                                                                                // Has rolls → toggle expand to show roll details
                                                                                                                                setExpandedVariantColors(prev => {
                                                                                                                                    const next = new Set(prev);
                                                                                                                                    next.has(varKey) ? next.delete(varKey) : next.add(varKey);
                                                                                                                                    return next;
                                                                                                                                });
                                                                                                                            } else {
                                                                                                                                // No rolls → add directly
                                                                                                                                setDialogMaterial(variant.material);
                                                                                                                                setDialogWarehouse({
                                                                                                                                    warehouse_id: wh.id,
                                                                                                                                    warehouse_code: '',
                                                                                                                                    warehouse_name_ar: wh.name_ar,
                                                                                                                                    warehouse_name_en: wh.name_en,
                                                                                                                                    roll_count: variant.roll_count,
                                                                                                                                    total_length: variant.qty,
                                                                                                                                    available_length: variant.qty,
                                                                                                                                    reserved_length: 0,
                                                                                                                                    last_updated: null,
                                                                                                                                });
                                                                                                                                setDialogRolls([]);
                                                                                                                                setDialogRollsLoading(false);
                                                                                                                                setDialogOpen(true);
                                                                                                                            }
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                                                                                        <span className="font-tajawal truncate">{shortName}</span>
                                                                                                                        {/* Roll count — right next to name */}
                                                                                                                        <span className={cn(
                                                                                                                            "text-[9px] flex-shrink-0",
                                                                                                                            variant.roll_count > 0 ? "text-indigo-500" : "text-gray-400"
                                                                                                                        )}>
                                                                                                                            ({variant.roll_count} {t('رول', 'R')})
                                                                                                                        </span>
                                                                                                                        {/* Spacer */}
                                                                                                                        <span className="flex-1" />
                                                                                                                        {/* Stock qty */}
                                                                                                                        <span className="text-[10px] font-mono text-green-600 dark:text-green-400 font-medium flex-shrink-0">
                                                                                                                            {variant.qty.toLocaleString('en-US', { maximumFractionDigits: 1 })} {variant.material.unit}
                                                                                                                        </span>
                                                                                                                        {/* Price tag */}
                                                                                                                        <Badge className="text-[10px] h-4 font-mono bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 flex-shrink-0 gap-0.5">
                                                                                                                            🏷️ {variant.material.selling_price.toFixed(2)} {currency}
                                                                                                                        </Badge>
                                                                                                                        {varInCart && <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                                                                                                                        <Button
                                                                                                                            variant={varInCart ? 'default' : 'outline'}
                                                                                                                            size="sm"
                                                                                                                            className={cn(
                                                                                                                                'h-6 text-[10px] px-2 gap-1 flex-shrink-0',
                                                                                                                                varInCart
                                                                                                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                                                                                    : 'hover:bg-green-50 hover:border-green-300 hover:text-green-600'
                                                                                                                            )}
                                                                                                                            onClick={(e) => {
                                                                                                                                e.stopPropagation();
                                                                                                                                setDialogMaterial(variant.material);
                                                                                                                                setDialogWarehouse({
                                                                                                                                    warehouse_id: wh.id,
                                                                                                                                    warehouse_code: '',
                                                                                                                                    warehouse_name_ar: wh.name_ar,
                                                                                                                                    warehouse_name_en: wh.name_en,
                                                                                                                                    roll_count: variant.roll_count,
                                                                                                                                    total_length: variant.qty,
                                                                                                                                    available_length: variant.qty,
                                                                                                                                    reserved_length: 0,
                                                                                                                                    last_updated: null,
                                                                                                                                });
                                                                                                                                setDialogRolls(variant.rolls.map(r => ({
                                                                                                                                    id: r.id,
                                                                                                                                    roll_number: r.roll_number,
                                                                                                                                    current_length: r.current_length,
                                                                                                                                    available_length: r.available_length,
                                                                                                                                    reserved_length: r.reserved_length,
                                                                                                                                    status: r.status,
                                                                                                                                })));
                                                                                                                                setDialogRollsLoading(false);
                                                                                                                                setDialogOpen(true);
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            <ShoppingCart className="w-2.5 h-2.5" />
                                                                                                                            {varInCart ? t('مضاف', '✓') : t('إضافة', 'Add')}
                                                                                                                        </Button>
                                                                                                                        {/* Expand chevron only when there are rolls */}
                                                                                                                        {variant.rolls.length > 0 && (
                                                                                                                            <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform flex-shrink-0', isVarOpen && 'rotate-180')} />
                                                                                                                        )}
                                                                                                                    </div>

                                                                                                                    {/* ─── Level 4: Rolls inside color ─── */}
                                                                                                                    {isVarOpen && variant.rolls.length > 0 && (
                                                                                                                        <div className="bg-blue-50/30 dark:bg-blue-900/5 px-6 py-2">
                                                                                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                                                                                <Scroll className="w-3.5 h-3.5 text-blue-500" />
                                                                                                                                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                                                                                                                                    {t('تفاصيل الرولونات', 'Roll Details')}
                                                                                                                                </span>
                                                                                                                                <Badge variant="outline" className="text-[9px] h-4">
                                                                                                                                    {variant.rolls.length} {t('رولون', 'rolls')}
                                                                                                                                </Badge>
                                                                                                                                <Button
                                                                                                                                    variant="outline"
                                                                                                                                    size="sm"
                                                                                                                                    className="h-5 text-[9px] gap-1 ms-auto text-emerald-600 border-emerald-300 hover:bg-emerald-50 px-2"
                                                                                                                                    onClick={(e) => {
                                                                                                                                        e.stopPropagation();
                                                                                                                                        setDialogMaterial(variant.material);
                                                                                                                                        setDialogWarehouse({
                                                                                                                                            warehouse_id: wh.id,
                                                                                                                                            warehouse_code: '',
                                                                                                                                            warehouse_name_ar: wh.name_ar,
                                                                                                                                            warehouse_name_en: wh.name_en,
                                                                                                                                            roll_count: variant.roll_count,
                                                                                                                                            total_length: variant.qty,
                                                                                                                                            available_length: variant.qty,
                                                                                                                                            reserved_length: 0,
                                                                                                                                            last_updated: null,
                                                                                                                                        });
                                                                                                                                        setDialogRolls(variant.rolls.map(r => ({
                                                                                                                                            id: r.id,
                                                                                                                                            roll_number: r.roll_number,
                                                                                                                                            current_length: r.current_length,
                                                                                                                                            available_length: r.available_length,
                                                                                                                                            reserved_length: r.reserved_length,
                                                                                                                                            status: r.status,
                                                                                                                                        })));
                                                                                                                                        setDialogRollsLoading(false);
                                                                                                                                        setDialogOpen(true);
                                                                                                                                    }}
                                                                                                                                >
                                                                                                                                    <ShoppingCart className="w-2.5 h-2.5" />
                                                                                                                                    {t('إضافة مع اختيار الرولونات', 'Add with roll selection')}
                                                                                                                                </Button>
                                                                                                                            </div>
                                                                                                                            <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-900">
                                                                                                                                {/* Rolls Header */}
                                                                                                                                <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr] bg-gray-50/80 dark:bg-gray-800/60 text-[9px] font-medium text-gray-500 border-b">
                                                                                                                                    <div className="px-2 py-1.5">{t('رقم الرولون', 'Roll #')}</div>
                                                                                                                                    <div className="px-2 py-1.5 text-end">{t('الحالي', 'Current')}</div>
                                                                                                                                    <div className="px-2 py-1.5 text-end">{t('المتاح', 'Available')}</div>
                                                                                                                                    <div className="px-2 py-1.5">{t('الحالة', 'Status')}</div>
                                                                                                                                </div>
                                                                                                                                {/* Roll Rows */}
                                                                                                                                {variant.rolls.map(roll => {
                                                                                                                                    const rStatus = getRollStatusLabel(roll.status);
                                                                                                                                    return (
                                                                                                                                        <div
                                                                                                                                            key={roll.id}
                                                                                                                                            className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr] items-center border-b last:border-b-0 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-800/20"
                                                                                                                                        >
                                                                                                                                            <div className="px-2 py-1.5 font-mono text-blue-600 dark:text-blue-400 truncate">
                                                                                                                                                {roll.roll_number}
                                                                                                                                            </div>
                                                                                                                                            <div className="px-2 py-1.5 text-end font-mono">
                                                                                                                                                {roll.current_length.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                                                                                            </div>
                                                                                                                                            <div className="px-2 py-1.5 text-end font-mono text-green-600 dark:text-green-400 font-medium">
                                                                                                                                                {roll.available_length.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                                                                                            </div>
                                                                                                                                            <div className="px-2 py-1.5">
                                                                                                                                                <span className={cn(
                                                                                                                                                    'inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium',
                                                                                                                                                    rStatus.color === 'green' && 'bg-green-100 text-green-700',
                                                                                                                                                    rStatus.color === 'orange' && 'bg-orange-100 text-orange-700',
                                                                                                                                                    rStatus.color === 'blue' && 'bg-blue-100 text-blue-700',
                                                                                                                                                    rStatus.color === 'red' && 'bg-red-100 text-red-700',
                                                                                                                                                )}>
                                                                                                                                                    {isRTL ? rStatus.ar : rStatus.en}
                                                                                                                                                </span>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    );
                                                                                                                                })}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    {/* ─── Fallback: No rolls, show stock info ─── */}
                                                                                                                    {isVarOpen && variant.rolls.length === 0 && variant.qty > 0 && (
                                                                                                                        <div className="bg-green-50/30 dark:bg-green-900/5 px-6 py-3">
                                                                                                                            <div className="flex items-center gap-3 text-xs">
                                                                                                                                <Package className="w-4 h-4 text-green-500" />
                                                                                                                                <div className="flex-1">
                                                                                                                                    <div className="text-gray-500 text-[10px]">{t('المخزون المتاح', 'Available Stock')}</div>
                                                                                                                                    <div className="font-mono font-bold text-green-700 dark:text-green-400">
                                                                                                                                        {variant.qty.toLocaleString('en-US', { maximumFractionDigits: 1 })} {variant.material.unit}
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                {variant.material.selling_price > 0 && (
                                                                                                                                    <div className="text-end">
                                                                                                                                        <div className="text-gray-500 text-[10px]">{t('السعر', 'Price')}</div>
                                                                                                                                        <div className="font-mono font-bold text-gray-700 dark:text-gray-300">
                                                                                                                                            {variant.material.selling_price.toFixed(2)} {variant.material.currency}
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    /* ═══ NORMAL MATERIAL: Warehouse stock breakdown ═══ */
                                                    <>
                                                        {/* Summary Cards — Dual Stock: Rolls / Loose / Total / Price */}
                                                        <div className="grid grid-cols-4 gap-2">
                                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('مجرود', 'Rolled')}</div>
                                                                <div className="font-mono font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                                                                    {material.roll_count} <span className="text-[9px] text-gray-400">({material.rolls_total_length.toLocaleString('en-US', { maximumFractionDigits: 1 })})</span>
                                                                </div>
                                                            </div>
                                                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('سائب', 'Loose')}</div>
                                                                <div className="font-mono font-semibold text-sm text-amber-600 dark:text-amber-400">
                                                                    {(material.loose_stock || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                </div>
                                                            </div>
                                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('الإجمالي', 'Total')}</div>
                                                                <div className="font-mono font-semibold text-sm text-green-600 dark:text-green-400">
                                                                    {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                </div>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('السعر', 'Price')}</div>
                                                                <div className="font-mono font-semibold text-sm">{displayPrice.toFixed(2)}</div>
                                                            </div>
                                                        </div>

                                                        {/* Warehouse Stock */}
                                                        {!isParent && (() => {
                                                            const warehouseStock = fetchWarehouseStock(material.id, warehousesList);
                                                            const isStockLoading = false;

                                                            if (isStockLoading) {
                                                                return (
                                                                    <div className="flex items-center gap-2 justify-center py-6 text-gray-400">
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                        <span className="text-sm">{t('تحميل المخزون...', 'Loading stock...')}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            // Build effective warehouse list
                                                            // Build effective warehouse list
                                                            // ✅ FIX: For child variants, distribute stock proportionally across parent's warehouses
                                                            let effectiveStock = warehouseStock;
                                                            
                                                            if (effectiveStock.length === 0 && material.stock_qty > 0) {
                                                                // Child variant with stock but no warehouse data → use parent's distribution
                                                                if (material.parent_material_id) {
                                                                    const parentWarehouses = fetchWarehouseStock(material.parent_material_id, warehousesList);
                                                                    if (parentWarehouses.length > 0) {
                                                                        const parentTotal = parentWarehouses.reduce((sum, pw) => {
                                                                            const whStock = (pw.roll_count > 0)
                                                                                ? pw.available_length + (pw.loose_stock || 0)
                                                                                : Math.max(pw.available_length, pw.loose_stock || 0, pw.total_length);
                                                                            return sum + whStock;
                                                                        }, 0);
                                                                        
                                                                        if (parentTotal > 0) {
                                                                            effectiveStock = parentWarehouses
                                                                                .map(pw => {
                                                                                    const whStock = (pw.roll_count > 0)
                                                                                        ? pw.available_length + (pw.loose_stock || 0)
                                                                                        : Math.max(pw.available_length, pw.loose_stock || 0, pw.total_length);
                                                                                    const ratio = whStock / parentTotal;
                                                                                    const childQtyInWh = Math.round(material.stock_qty * ratio * 10) / 10;
                                                                                    return {
                                                                                        warehouse_id: pw.warehouse_id,
                                                                                        warehouse_code: pw.warehouse_code,
                                                                                        warehouse_name_ar: pw.warehouse_name_ar,
                                                                                        warehouse_name_en: pw.warehouse_name_en,
                                                                                        roll_count: 0,
                                                                                        total_length: childQtyInWh,
                                                                                        available_length: childQtyInWh,
                                                                                        reserved_length: 0,
                                                                                        loose_stock: 0,
                                                                                        last_updated: null,
                                                                                    };
                                                                                })
                                                                                .filter(ws => ws.available_length > 0);
                                                                        }
                                                                    }
                                                                }
                                                                
                                                                // Final fallback: use default_warehouse_id
                                                                if (effectiveStock.length === 0 && material.default_warehouse_id) {
                                                                    const defaultWh = warehousesList.find((w: any) => w.id === material.default_warehouse_id);
                                                                    if (defaultWh) {
                                                                        effectiveStock = [{
                                                                            warehouse_id: defaultWh.id,
                                                                            warehouse_code: defaultWh.code || '',
                                                                            warehouse_name_ar: defaultWh.name_ar || t('مستودع افتراضي', 'Default'),
                                                                            warehouse_name_en: defaultWh.name_en || 'Default',
                                                                            roll_count: material.roll_count || 0,
                                                                            total_length: material.stock_qty,
                                                                            available_length: material.stock_qty,
                                                                            reserved_length: 0,
                                                                            loose_stock: 0,
                                                                            last_updated: null,
                                                                        }];
                                                                    }
                                                                }
                                                            }
                                                            
                                                            if (effectiveStock.length === 0) {
                                                                return (
                                                            <div className="text-center py-4">
                                                                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                                <p className="text-sm text-gray-400">
                                                                    {t('لا يوجد مخزون في المستودعات', 'No stock in warehouses')}
                                                                </p>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="mt-2 h-7 text-xs gap-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleQuickAdd(material);
                                                                    }}
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    {t('إضافة بدون مستودع', 'Add without warehouse')}
                                                                </Button>
                                                            </div>
                                                                );
                                                            }
                                                            
                                                            return (
                                                            <div className="border rounded-lg overflow-hidden">
                                                                {/* Table Header */}
                                                                <div className="grid grid-cols-[1fr_0.6fr_0.5fr_0.8fr_0.6fr_auto] bg-gray-50 dark:bg-gray-800/50 border-b text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                                                    <div className="px-2.5 py-2">{t('المستودع', 'Warehouse')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('رولونات', 'Rolls')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('سائب', 'Loose')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('المتاح', 'Available')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('المحجوز', 'Reserved')}</div>
                                                                    <div className="px-2.5 py-2 text-center w-20">{t('إضافة', 'Add')}</div>
                                                                </div>

                                                                {/* Warehouse Rows */}
                                                                {effectiveStock.map((wh) => {
                                                                    const whKey = `${material.id}__${wh.warehouse_id}`;
                                                                    const isWhExpanded = expandedWarehouses.has(whKey);
                                                                    const whRolls = fetchRollDetails(material.id, wh.warehouse_id);
                                                                    const isWhRollsLoading = false;
                                                                    const isWhInCart = cartItemKeys.has(`${material.id}__${wh.warehouse_id}`);

                                                                    return (
                                                                        <React.Fragment key={wh.warehouse_id}>
                                                                            {/* Warehouse Row */}
                                                                            <div
                                                                                className={cn(
                                                                                    'grid grid-cols-[1fr_0.6fr_0.5fr_0.8fr_0.6fr_auto] items-center border-b last:border-b-0 transition-colors text-xs',
                                                                                    isWhExpanded && 'bg-blue-50/50 dark:bg-blue-900/10',
                                                                                    isWhInCart && 'bg-emerald-50/40 dark:bg-emerald-900/10',
                                                                                    'hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer',
                                                                                )}
                                                                                onClick={() => toggleWarehouse(material.id, wh.warehouse_id)}
                                                                            >
                                                                                {/* Name */}
                                                                                <div className="px-2.5 py-2 flex items-center gap-1.5">
                                                                                    <Warehouse className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                                                    <span className="font-tajawal text-xs truncate">
                                                                                        {isRTL ? wh.warehouse_name_ar : (wh.warehouse_name_en || wh.warehouse_name_ar)}
                                                                                    </span>
                                                                                    {isWhInCart && (
                                                                                        <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                                                                    )}
                                                                                    <ChevronDown className={cn(
                                                                                        'w-3 h-3 text-gray-400 transition-transform flex-shrink-0',
                                                                                        isWhExpanded && 'rotate-180',
                                                                                    )} />
                                                                                </div>

                                                                                {/* Rolls */}
                                                                                <div className="px-2.5 py-2 text-end font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                                                                    {wh.roll_count}
                                                                                </div>

                                                                                {/* Loose */}
                                                                                <div className="px-2.5 py-2 text-end font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                                                                    {(wh.loose_stock || 0) > 0 ? (wh.loose_stock || 0).toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—'}
                                                                                </div>

                                                                                {/* Available — use smart total to avoid double-counting */}
                                                                                <div className="px-2.5 py-2 text-end font-mono text-green-600 dark:text-green-400 font-semibold">
                                                                                    {((wh.roll_count || 0) > 0
                                                                                        ? wh.available_length + (wh.loose_stock || 0)
                                                                                        : Math.max(wh.available_length, wh.loose_stock || 0)
                                                                                    ).toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                                </div>

                                                                                {/* Reserved */}
                                                                                <div className="px-2.5 py-2 text-end font-mono text-orange-500 font-medium">
                                                                                    {wh.reserved_length > 0 ? wh.reserved_length.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—'}
                                                                                </div>

                                                                                {/* Add Button → Opens AddToCartDialog */}
                                                                                <div className="px-2 py-1.5 text-center w-20" onClick={(e) => e.stopPropagation()}>
                                                                                    <Button
                                                                                        variant={isWhInCart ? 'default' : 'outline'}
                                                                                        size="sm"
                                                                                        className={cn(
                                                                                            'h-7 gap-1 text-[10px] px-2',
                                                                                            isWhInCart
                                                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                                                : 'hover:bg-green-50 hover:border-green-300 hover:text-green-600',
                                                                                        )}
                                                                                        onClick={() => handleOpenAddDialog(material, wh)}
                                                                                    >
                                                                                        <ShoppingCart className="w-3 h-3" />
                                                                                        {isWhInCart
                                                                                            ? t('مضاف', 'Added')
                                                                                            : t('إضافة', 'Add')
                                                                                        }
                                                                                    </Button>
                                                                                </div>
                                                                            </div>

                                                                            {/* ─── Expanded: Roll Details ─── */}
                                                                            {isWhExpanded && (
                                                                                <div className="bg-blue-50/30 dark:bg-blue-900/5 border-b px-3 py-2">
                                                                                    {isWhRollsLoading ? (
                                                                                        <div className="flex items-center gap-2 justify-center py-3 text-gray-400">
                                                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                                            <span className="text-xs">{t('تحميل الرولونات...', 'Loading rolls...')}</span>
                                                                                        </div>
                                                                                    ) : whRolls.length === 0 ? (
                                                                                        <div className="text-center py-3 text-xs text-gray-400">
                                                                                            {t('لا توجد رولونات', 'No rolls found')}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                                                <Scroll className="w-3.5 h-3.5 text-blue-500" />
                                                                                                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                                                                                                    {t('تفاصيل الرولونات', 'Roll Details')}
                                                                                                </span>
                                                                                                <Badge variant="outline" className="text-[9px] h-4">
                                                                                                    {whRolls.length} {t('رولون', 'rolls')}
                                                                                                </Badge>
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    size="sm"
                                                                                                    className="h-5 text-[9px] gap-1 ms-auto text-emerald-600 border-emerald-300 hover:bg-emerald-50 px-2"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleOpenAddDialog(material, wh);
                                                                                                    }}
                                                                                                >
                                                                                                    <ShoppingCart className="w-2.5 h-2.5" />
                                                                                                    {t('إضافة مع اختيار الرولونات', 'Add with roll selection')}
                                                                                                </Button>
                                                                                            </div>
                                                                                            <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-900">
                                                                                                {/* Rolls Header */}
                                                                                                <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.7fr] bg-gray-50/80 dark:bg-gray-800/60 text-[9px] font-medium text-gray-500 border-b">
                                                                                                    <div className="px-2 py-1.5">{t('رقم الرولون', 'Roll #')}</div>
                                                                                                    <div className="px-2 py-1.5 text-end">{t('الحالي', 'Current')}</div>
                                                                                                    <div className="px-2 py-1.5 text-end">{t('المتاح', 'Available')}</div>
                                                                                                    <div className="px-2 py-1.5 text-end">{t('المحجوز', 'Reserved')}</div>
                                                                                                    <div className="px-2 py-1.5">{t('الحالة', 'Status')}</div>
                                                                                                </div>
                                                                                                {/* Roll Rows */}
                                                                                                {whRolls.map((roll) => {
                                                                                                    const rStatus = getRollStatusLabel(roll.status);
                                                                                                    return (
                                                                                                        <div
                                                                                                            key={roll.id}
                                                                                                            className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.7fr] items-center border-b last:border-b-0 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-800/20"
                                                                                                        >
                                                                                                            <div className="px-2 py-1.5 font-mono text-blue-600 dark:text-blue-400 truncate">
                                                                                                                {roll.roll_number}
                                                                                                            </div>
                                                                                                            <div className="px-2 py-1.5 text-end font-mono">
                                                                                                                {roll.current_length.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                                                            </div>
                                                                                                            <div className="px-2 py-1.5 text-end font-mono text-green-600 dark:text-green-400 font-medium">
                                                                                                                {roll.available_length.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                                                            </div>
                                                                                                            <div className="px-2 py-1.5 text-end font-mono text-orange-500">
                                                                                                                {roll.reserved_length > 0 ? roll.reserved_length.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—'}
                                                                                                            </div>
                                                                                                            <div className="px-2 py-1.5">
                                                                                                                <span className={cn(
                                                                                                                    'inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium',
                                                                                                                    rStatus.color === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                                                                                                                    rStatus.color === 'orange' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                                                                                                                    rStatus.color === 'blue' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                                                                                                                    rStatus.color === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                                                                                                                )}>
                                                                                                                    {isRTL ? rStatus.ar : rStatus.en}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                            );
                                                        })()}

                                                        {/* Quantity Break Pricing */}
                                                        {qtyBreaks.length > 0 && (
                                                            <QuantityPricingCard
                                                                priceItems={qtyBreaks}
                                                                baseSellPrice={material.selling_price}
                                                                currentQty={1}
                                                                currency={currency}
                                                                discountPercent={customerPricing?.discountPercent || 0}
                                                                priceListName={customerPricing?.priceListName}
                                                            />
                                                        )}

                                                        {/* Material details */}
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                                                                <span className="text-gray-400 block">{t('العرض', 'Width')}</span>
                                                                <span className="font-mono font-medium">{material.default_width} cm</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                                                                <span className="text-gray-400 block">{t('سعر الشراء', 'Purchase')}</span>
                                                                <span className="font-mono font-medium">{convertPrice(material.purchase_price, material.currency || companyCurrency).toFixed(2)}</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                                                                <span className="text-gray-400 block">{t('الحد الأدنى', 'Min Stock')}</span>
                                                                <span className="font-mono font-medium">{material.min_stock} {material.unit}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ═══ AddToCartDialog ═══ */}
            {dialogMaterial && dialogWarehouse && (
                <AddToCartDialog
                    open={dialogOpen}
                    onClose={() => {
                        setDialogOpen(false);
                        setDialogMaterial(null);
                        setDialogWarehouse(null);
                        setDialogRolls(undefined);
                    }}
                    material={{
                        id: dialogMaterial.id,
                        name_ar: dialogMaterial.name_ar,
                        name_en: dialogMaterial.name_en,
                        code: dialogMaterial.code,
                        price: convertPrice(dialogMaterial.selling_price, dialogMaterial.currency || companyCurrency),
                        unit: dialogMaterial.unit,
                        currency: currency,
                    }}
                    warehouse={{
                        id: dialogWarehouse.warehouse_id,
                        name_ar: dialogWarehouse.warehouse_name_ar,
                        name_en: dialogWarehouse.warehouse_name_en,
                        available_length: dialogWarehouse.available_length,
                        // ✅ Fix: Use warehouse-level loose_stock (not material-level)
                        // to avoid mixing per-warehouse available_length with global loose_stock
                        loose_stock: dialogWarehouse.loose_stock || 0,
                        roll_count: dialogWarehouse.roll_count || 0,
                    }}
                    rolls={dialogRolls}
                    rollsLoading={dialogRollsLoading}
                    mode="line"
                    hidePrice={isTransfer}
                    onAddLineItem={handleAddLineItem}
                />
            )}
        </div>
    );
};

export default MaterialBrowserTab;
