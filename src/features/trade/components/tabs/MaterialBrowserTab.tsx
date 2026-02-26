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
    /** Read only mode */
    readOnly?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
    { value: 'all', labelAr: 'الكل', labelEn: 'All' },
    { value: 'silk', labelAr: 'حرير', labelEn: 'Silk' },
    { value: 'cotton', labelAr: 'قطن', labelEn: 'Cotton' },
    { value: 'polyester', labelAr: 'بوليستر', labelEn: 'Polyester' },
    { value: 'chiffon', labelAr: 'شيفون', labelEn: 'Chiffon' },
    { value: 'linen', labelAr: 'كتان', labelEn: 'Linen' },
    { value: 'wool', labelAr: 'صوف', labelEn: 'Wool' },
    { value: 'velvet', labelAr: 'مخمل', labelEn: 'Velvet' },
    { value: 'denim', labelAr: 'جينز', labelEn: 'Denim' },
    { value: 'mixed', labelAr: 'مخلوط', labelEn: 'Mixed' },
    { value: 'synthetic', labelAr: 'صناعي', labelEn: 'Synthetic' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

function generateLineItemId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Component ─────────────────────────────────────────────────────

export const MaterialBrowserTab: React.FC<MaterialBrowserTabProps> = ({
    items,
    onAddItem,
    customerPricing,
    currency = 'SAR',
    readOnly = false,
}) => {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ─── Company & Tax Defaults ───
    const { companyId } = useCompany();
    const { data: taxDefaults } = useTaxDefaults(companyId);
    const companyTaxRate = taxDefaults?.isEnabled ? taxDefaults.rate : 0;
    const companyTaxEnabled = taxDefaults?.isEnabled ?? false;

    // ─── State ──────────────────────────────────────────────────
    const [searchText, setSearchText] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
    const [inStockOnly, setInStockOnly] = useState(true);
    const [belowMinStock, setBelowMinStock] = useState(false);
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
    const { materials, groups, isLoading, isSearching, totalCount, fetchWarehouseStock, fetchRollDetails, fetchVariantChildren, fetchVariantRolls } =
        useMaterialSearch({
            search: searchText,
            groupId: selectedGroup,
            category: selectedCategory,
            inStockOnly,
            belowMinStock,
            supplierId: selectedSupplier,
            warehouseId: selectedWarehouse,
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
    const toggleExpand = useCallback(async (materialId: string) => {
        if (expandedMaterial === materialId) {
            setExpandedMaterial(null);
            return;
        }
        setExpandedMaterial(materialId);

        // Check if this is a variant parent
        const material = materials.find(m => m.id === materialId);
        const isParent = material?.is_variant_parent || material?.has_variants;

        // Fetch variant children + rolls if parent
        if (isParent) {
            setVariantChildrenLoading(prev => new Set(prev).add(materialId));
            try {
                // Fetch children if not cached
                let children = variantChildrenCache[materialId];
                if (!children) {
                    children = await fetchVariantChildren(materialId);
                    setVariantChildrenCache(prev => ({ ...prev, [materialId]: children! }));
                }

                // Fetch rolls for all children if not cached
                if (!variantRollsCache[materialId] && children.length > 0) {
                    const childIds = children.map(c => c.id);
                    const rolls = await fetchVariantRolls(childIds);
                    setVariantRollsCache(prev => ({ ...prev, [materialId]: rolls }));
                }
            } catch (err) {
                if (!variantChildrenCache[materialId]) {
                    setVariantChildrenCache(prev => ({ ...prev, [materialId]: [] }));
                }
                setVariantRollsCache(prev => ({ ...prev, [materialId]: [] }));
            } finally {
                setVariantChildrenLoading(prev => {
                    const next = new Set(prev);
                    next.delete(materialId);
                    return next;
                });
            }
        }

        // Fetch warehouse stock if not cached (for non-parent materials)
        if (!isParent && !warehouseStockCache[materialId]) {
            setWarehouseStockLoading(prev => new Set(prev).add(materialId));
            try {
                const data = await fetchWarehouseStock(materialId);
                setWarehouseStockCache(prev => ({ ...prev, [materialId]: data }));
            } catch (err) {
                setWarehouseStockCache(prev => ({ ...prev, [materialId]: [] }));
            } finally {
                setWarehouseStockLoading(prev => {
                    const next = new Set(prev);
                    next.delete(materialId);
                    return next;
                });
            }
        }
    }, [expandedMaterial, warehouseStockCache, fetchWarehouseStock, materials, variantChildrenCache, fetchVariantChildren, variantRollsCache, fetchVariantRolls]);

    /** Toggle warehouse expansion — loads roll details */
    const toggleWarehouse = useCallback(async (materialId: string, warehouseId: string) => {
        const key = `${materialId}__${warehouseId}`;
        const newExpanded = new Set(expandedWarehouses);

        if (newExpanded.has(key)) {
            newExpanded.delete(key);
            setExpandedWarehouses(newExpanded);
            return;
        }

        newExpanded.add(key);
        setExpandedWarehouses(newExpanded);

        // Fetch rolls
        if (!rollsCache[key]) {
            setRollsLoading(prev => new Set(prev).add(key));
            try {
                const rolls = await fetchRollDetails(materialId, warehouseId);
                setRollsCache(prev => ({ ...prev, [key]: rolls }));
            } catch (err) {
                setRollsCache(prev => ({ ...prev, [key]: [] }));
            } finally {
                setRollsLoading(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }
        }
    }, [expandedWarehouses, rollsCache, fetchRollDetails]);

    /** Open AddToCartDialog for a specific warehouse */
    const handleOpenAddDialog = useCallback(async (material: MaterialSearchResult, wh: MaterialWarehouseStock) => {
        setDialogMaterial(material);
        setDialogWarehouse(wh);
        setDialogOpen(true);

        // Load rolls for the dialog
        const key = `${material.id}__${wh.warehouse_id}`;
        const cachedRolls = rollsCache[key];
        if (cachedRolls) {
            // Map to RollOption format
            setDialogRolls(cachedRolls.map(r => ({
                id: r.id,
                roll_number: r.roll_number,
                current_length: r.current_length,
                available_length: r.available_length,
                reserved_length: r.reserved_length,
                status: r.status,
            })));
            setDialogRollsLoading(false);
        } else {
            // Fetch rolls
            setDialogRolls(undefined);
            setDialogRollsLoading(true);
            try {
                const rolls = await fetchRollDetails(material.id, wh.warehouse_id);
                setRollsCache(prev => ({ ...prev, [key]: rolls }));
                setDialogRolls(rolls.map(r => ({
                    id: r.id,
                    roll_number: r.roll_number,
                    current_length: r.current_length,
                    available_length: r.available_length,
                    reserved_length: r.reserved_length,
                    status: r.status,
                })));
            } catch (err) {
                setDialogRolls([]);
            } finally {
                setDialogRollsLoading(false);
            }
        }
    }, [rollsCache, fetchRollDetails]);

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
        // Resolve discount
        let discount = 0;
        if (customerPricing?.resolvePrice) {
            const resolved = customerPricing.resolvePrice(item.material_id, item.quantity, item.unit_price);
            discount = resolved.discountPercent;
        }

        const discountAmount = (discount / 100) * item.quantity * item.unit_price;
        const subtotal = item.quantity * item.unit_price;
        const netAfterDiscount = subtotal - discountAmount;

        // 🔑 القاعدة الذهبية: ضريبة المادة → ضريبة الشركة → 0%
        // البحث عن tax_rate المادة من المواد المحملة
        const materialData = materials.find(m => m.id === item.material_id);
        const resolved = resolveItemTaxRate(materialData?.tax_rate, companyTaxRate, companyTaxEnabled);
        const taxAmt = computeTaxAmount(netAfterDiscount, resolved.rate);

        const newItem: InvoiceLineItem = {
            id: generateLineItemId(),
            material_id: item.material_id,
            material_code: item.material_code,
            material_name_ar: item.material_name_ar,
            material_name_en: item.material_name_en,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            discount_percent: discount,
            discount_amount: discountAmount,
            subtotal,
            tax_rate: resolved.rate,
            tax_amount: taxAmt,
            total: netAfterDiscount + taxAmt,
            currency: item.currency,
            warehouse_id: item.warehouse_id,
            warehouse_name_ar: item.warehouse_name_ar,
            notes: '',
            preferred_rolls: item.preferred_rolls,
        };

        onAddItem(newItem);
    }, [customerPricing, onAddItem, companyTaxRate, companyTaxEnabled, materials, currency]);

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
        setSelectedCategory('all');
        setSelectedSupplier('all');
        setSelectedWarehouse('all');
        setInStockOnly(true);
        setBelowMinStock(false);
    }, []);

    const hasActiveFilters = searchText || selectedGroup !== 'all' || selectedCategory !== 'all'
        || selectedSupplier !== 'all' || selectedWarehouse !== 'all'
        || !inStockOnly || belowMinStock;

    const activeFilterCount = [
        selectedGroup !== 'all',
        selectedCategory !== 'all',
        selectedSupplier !== 'all',
        selectedWarehouse !== 'all',
        !inStockOnly, // "عرض الكل" يعتبر فلتر نشط لأنه مختلف عن الافتراضي
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {/* Group filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('المجموعة', 'Group')}
                            </Label>
                            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedGroup !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل المجموعات', 'All Groups')}</SelectItem>
                                    {groups.map((g: any) => (
                                        <SelectItem key={g.id} value={g.id}>
                                            {g.icon} {isRTL ? g.name_ar : (g.name_en || g.name_ar)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category filter */}
                        <div>
                            <Label className="text-[10px] text-gray-500 mb-0.5 block">
                                {t('النوع', 'Category')}
                            </Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedCategory !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {isRTL ? opt.labelAr : opt.labelEn}
                                        </SelectItem>
                                    ))}
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
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger className={cn('h-7 text-xs', selectedWarehouse !== 'all' && 'border-blue-400 bg-blue-50 dark:bg-blue-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل المستودعات', 'All Warehouses')}</SelectItem>
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
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ms-2 text-sm text-gray-500">
                        {t('جاري تحميل المواد...', 'Loading materials...')}
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
                    {materials.map((material) => {
                        const isExpanded = expandedMaterial === material.id;
                        const isInCart = cartMaterialIds.has(material.id);
                        const qtyBreaks = getQtyBreaksForMaterial(material.id);
                        const hasQtyBreaks = qtyBreaks.length > 1;
                        const isStockLoading = warehouseStockLoading.has(material.id);
                        const warehouseStock = warehouseStockCache[material.id] || [];

                        // Resolve price for display
                        let displayPrice = material.selling_price;
                        let priceSource: 'price_list' | 'base_price' | 'manual' = 'base_price';
                        if (customerPricing?.resolvePrice) {
                            const resolved = customerPricing.resolvePrice(
                                material.id, 1, material.selling_price
                            );
                            displayPrice = resolved.unitPrice;
                            priceSource = resolved.source;
                        }

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
                                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                                        onClick={() => toggleExpand(material.id)}
                                    >
                                        {/* Swatch / Icon */}
                                        <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                                            {material.swatch_url ? (
                                                <img
                                                    src={material.swatch_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Package className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {isRTL ? material.name_ar : (material.name_en || material.name_ar)}
                                                </span>
                                                {isInCart && (
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                                                        {t('في السلة', 'In Cart')}
                                                    </Badge>
                                                )}
                                                {(material.is_variant_parent || material.has_variants) && (
                                                    <Badge variant="outline" className="text-[10px] gap-0.5 bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
                                                        <Layers className="w-2.5 h-2.5" />
                                                        {t('أم', 'Parent')}
                                                    </Badge>
                                                )}
                                                {hasQtyBreaks && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Layers className="w-3 h-3 text-indigo-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {t('يوجد تسعير متدرج', 'Has quantity breaks')}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="font-mono">{material.code}</span>
                                                {material.group_name_ar && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{isRTL ? material.group_name_ar : (material.group_name_en || material.group_name_ar)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stock */}
                                        <div className="text-end shrink-0">
                                            <div className={cn(
                                                'flex items-center gap-1 text-xs',
                                                material.stock_qty === 0 ? 'text-red-500'
                                                    : isLowStock ? 'text-amber-500'
                                                        : 'text-green-600 dark:text-green-400'
                                            )}>
                                                <Warehouse className="w-3 h-3" />
                                                <span className="font-mono font-medium">
                                                    {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                </span>
                                                <span className="text-gray-400">{material.unit}</span>
                                            </div>
                                            {isLowStock && (
                                                <div className="flex items-center gap-0.5 text-[10px] text-amber-500 mt-0.5">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    {t('مخزون منخفض', 'Low stock')}
                                                </div>
                                            )}
                                            {material.roll_count > 0 && (
                                                <span className="text-[10px] text-gray-400">
                                                    {material.roll_count} {t('رولون', 'rolls')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="text-end shrink-0 min-w-[80px]">
                                            {priceSource === 'price_list' && displayPrice !== material.selling_price ? (
                                                <>
                                                    <div className="text-xs text-gray-400 line-through font-mono">
                                                        {material.selling_price.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm font-semibold text-green-600 dark:text-green-400 font-mono flex items-center gap-0.5 justify-end">
                                                        <Sparkles className="w-3 h-3" />
                                                        {displayPrice.toFixed(2)}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
                                                    {displayPrice.toFixed(2)}
                                                </div>
                                            )}
                                            <div className="text-[10px] text-gray-400">{currency}</div>
                                        </div>

                                        {/* Quick Add for zero stock (not for variant parents) */}
                                        {material.stock_qty === 0 && !(material.is_variant_parent || material.has_variants) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuickAdd(material);
                                                }}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        )}

                                        {/* Expand indicator */}
                                        <div className="shrink-0">
                                            {isExpanded
                                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                                            }
                                        </div>
                                    </div>

                                    {/* ─── Expanded Section ─── */}
                                    {isExpanded && (() => {
                                        const isParent = material.is_variant_parent || material.has_variants;
                                        const variantChildren = variantChildrenCache[material.id] || [];
                                        const variantRolls = variantRollsCache[material.id] || [];
                                        const isVarLoading = variantChildrenLoading.has(material.id);

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
                                            warehouseHierarchy.push(...Array.from(whMap.values()));
                                        }

                                        return (
                                            <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2 space-y-3">
                                                {/* ═══ VARIANT PARENT: Hierarchical warehouse view ═══ */}
                                                {isParent ? (
                                                    <>
                                                        {/* Summary */}
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('الرولونات', 'Rolls')}</div>
                                                                <div className="font-mono font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                                                                    {material.roll_count}
                                                                </div>
                                                            </div>
                                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('المتاح', 'Available')}</div>
                                                                <div className="font-mono font-semibold text-sm text-green-600 dark:text-green-400">
                                                                    {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                                </div>
                                                            </div>
                                                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('المتغيرات', 'Variants')}</div>
                                                                <div className="font-mono font-semibold text-sm text-purple-600 dark:text-purple-400">
                                                                    {variantChildren.length}
                                                                </div>
                                                            </div>
                                                        </div>

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
                                                                                                                            !isVarOpen && !varInCart && 'hover:bg-gray-50 dark:hover:bg-gray-800/20'
                                                                                                                        )}
                                                                                                                        onClick={() => {
                                                                                                                            setExpandedVariantColors(prev => {
                                                                                                                                const next = new Set(prev);
                                                                                                                                next.has(varKey) ? next.delete(varKey) : next.add(varKey);
                                                                                                                                return next;
                                                                                                                            });
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                                                                                        <span className="flex-1 font-tajawal truncate">{shortName}</span>
                                                                                                                        <span className="text-[10px] font-mono text-green-600 dark:text-green-400 font-medium flex-shrink-0">
                                                                                                                            {variant.qty.toLocaleString('en-US', { maximumFractionDigits: 1 })} {variant.material.unit}
                                                                                                                        </span>
                                                                                                                        <Badge variant="outline" className="text-[9px] h-4 flex-shrink-0">
                                                                                                                            {variant.roll_count} {t('رولون', 'rolls')}
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
                                                                                                                                // Open AddToCartDialog with correct warehouse + rolls
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
                                                                                                                        <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform flex-shrink-0', isVarOpen && 'rotate-180')} />
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
                                                        {/* Summary Cards */}
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('الرولونات', 'Rolls')}</div>
                                                                <div className="font-mono font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                                                                    {material.roll_count}
                                                                </div>
                                                            </div>
                                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                                                <div className="text-[10px] text-gray-500">{t('المتاح', 'Available')}</div>
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
                                                        {isStockLoading ? (
                                                            <div className="flex items-center gap-2 justify-center py-6 text-gray-400">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="text-sm">{t('تحميل المخزون...', 'Loading stock...')}</span>
                                                            </div>
                                                        ) : warehouseStock.length === 0 ? (
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
                                                        ) : (
                                                            <div className="border rounded-lg overflow-hidden">
                                                                {/* Table Header */}
                                                                <div className="grid grid-cols-[1fr_0.6fr_0.8fr_0.6fr_auto] bg-gray-50 dark:bg-gray-800/50 border-b text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                                                    <div className="px-2.5 py-2">{t('المستودع', 'Warehouse')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('رولونات', 'Rolls')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('المتاح', 'Available')}</div>
                                                                    <div className="px-2.5 py-2 text-end">{t('المحجوز', 'Reserved')}</div>
                                                                    <div className="px-2.5 py-2 text-center w-20">{t('إضافة', 'Add')}</div>
                                                                </div>

                                                                {/* Warehouse Rows */}
                                                                {warehouseStock.map((wh) => {
                                                                    const whKey = `${material.id}__${wh.warehouse_id}`;
                                                                    const isWhExpanded = expandedWarehouses.has(whKey);
                                                                    const isWhRollsLoading = rollsLoading.has(whKey);
                                                                    const whRolls = rollsCache[whKey] || [];
                                                                    const isWhInCart = cartItemKeys.has(`${material.id}__${wh.warehouse_id}`);

                                                                    return (
                                                                        <React.Fragment key={wh.warehouse_id}>
                                                                            {/* Warehouse Row */}
                                                                            <div
                                                                                className={cn(
                                                                                    'grid grid-cols-[1fr_0.6fr_0.8fr_0.6fr_auto] items-center border-b last:border-b-0 transition-colors text-xs',
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

                                                                                {/* Available */}
                                                                                <div className="px-2.5 py-2 text-end font-mono text-green-600 dark:text-green-400 font-semibold">
                                                                                    {wh.available_length.toLocaleString('en-US', { maximumFractionDigits: 1 })}
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
                                                        )}

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
                                                                <span className="font-mono font-medium">{material.purchase_price.toFixed(2)}</span>
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
                        price: dialogMaterial.selling_price,
                        unit: dialogMaterial.unit,
                        currency: currency,
                    }}
                    warehouse={{
                        id: dialogWarehouse.warehouse_id,
                        name_ar: dialogWarehouse.warehouse_name_ar,
                        name_en: dialogWarehouse.warehouse_name_en,
                        available_length: dialogWarehouse.available_length,
                    }}
                    rolls={dialogRolls}
                    rollsLoading={dialogRollsLoading}
                    mode="line"
                    onAddLineItem={handleAddLineItem}
                />
            )}
        </div>
    );
};

export default MaterialBrowserTab;
