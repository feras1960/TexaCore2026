/**
 * 🛒 PurchaseMaterialBrowserTab — Browse & Add Materials for Purchase Documents
 * تبويب متصفح المواد للمشتريات — بحث وإضافة مواد بتبويب منفصل عن المبيعات
 *
 * ✅ مكون منفصل تماماً عن MaterialBrowserTab (المبيعات)
 * ✅ نفس النمط البصري والتجربة كما في المبيعات
 * ✅ لا يوجد اختيار رولونات (المشتريات تستلم رولونات جديدة)
 * ✅ لا يوجد اختيار مستودع (يتم تحديده لاحقاً عند الاستلام)
 * ✅ عرض ألوان المادة: النقر على المادة → فتح الألوان تحتها → إضافة اللون المطلوب
 * ✅ إضافة سريعة: كمية + سعر شراء + إضافة
 * ✅ عرض آخر أسعار الشراء (RBAC — manager/purchasing_manager)
 * ✅ RTL / LTR support
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    useMaterialSearch,
    type MaterialSearchResult,
} from '@/features/trade/hooks/useMaterialSearch';
import { useBrowserFilterData } from '@/features/trade/hooks/useBrowserFilterData';
import { useMaterialPriceHistory, type PriceHistoryRecord } from '@/features/trade/hooks/useMaterialPriceHistory';
import { useTradePermissions } from '@/hooks/useTradePermissions';
import { useTaxDefaults, computeTaxAmount, resolveItemTaxRate } from '@/features/trade/hooks/useTaxDefaults';
import { useCompany } from '@/hooks/useCompany';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Search,
    Plus,
    Package,
    AlertTriangle,
    Loader2,
    X,
    Check,
    ShoppingCart,
    AlertCircle,
    CornerDownLeft,
    History,
    TrendingDown,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Warehouse,
    RotateCcw,
    Layers,
    CheckSquare,
    Square,
    ListChecks,
} from 'lucide-react';
import type { InvoiceLineItem } from '@/features/trade/components/grids/CartItemsView';

// ─── Types ─────────────────────────────────────────────────────────

interface PurchaseMaterialBrowserTabProps {
    /** Current items in the document (to check duplicates) */
    items: InvoiceLineItem[];
    /** Callback to add item(s) */
    onAddItem: (item: InvoiceLineItem) => void;
    /** Document currency */
    currency?: string;
    /** Exchange rate: 1 doc-currency = X base-currency */
    exchangeRate?: number;
    /** Read only mode */
    readOnly?: boolean;
    /** Supplier ID — for price history context */
    supplierId?: string;
    /** Receipt mode — international purchases have no tax */
    receiptMode?: 'direct' | 'international';
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

export const PurchaseMaterialBrowserTab: React.FC<PurchaseMaterialBrowserTabProps> = ({
    items,
    onAddItem,
    currency = '',
    exchangeRate: exchangeRateProp = 1,
    readOnly = false,
    supplierId,
    receiptMode,
}) => {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ─── Company & Tax Defaults ───
    const { companyId, company } = useCompany();
    const companyCurrency = company?.default_currency || 'USD';
    const { data: taxDefaults } = useTaxDefaults(companyId);
    const companyTaxRate = taxDefaults?.isEnabled ? taxDefaults.rate : 0;
    const companyTaxEnabled = taxDefaults?.isEnabled ?? false;

    // ─── Price Conversion ───
    // Material prices are in the material's own currency.
    // Convert: materialCurrency → invoiceCurrency using lookupRate × multiply
    const { lookupRate: lookupExRate } = useExchangeRateLookup();
    const convertPrice = useCallback((basePrice: number, fromCurrency: string) => {
        if (!fromCurrency || fromCurrency === currency) return basePrice;
        const rate = lookupExRate(fromCurrency, currency);
        if (rate > 0 && Math.abs(rate - 1) > 0.0001) {
            return Math.round(basePrice * rate * 10000) / 10000;
        }
        return basePrice;
    }, [currency, lookupExRate]);

    // ─── Permissions ────────────────────────────────────────────
    const permissions = useTradePermissions({ tradeMode: 'purchase' });

    // ─── State ──────────────────────────────────────────────────
    const [searchText, setSearchText] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [belowMinStock, setBelowMinStock] = useState(false);

    // Expanded material (to show variants or direct add)
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
    // Variant children cache: parentMaterialId → variant materials
    const [variantChildrenCache, setVariantChildrenCache] = useState<Record<string, MaterialSearchResult[]>>({});
    const [variantChildrenLoading, setVariantChildrenLoading] = useState<Set<string>>(new Set());

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMaterial, setDialogMaterial] = useState<MaterialSearchResult | null>(null);

    // Multi-select mode
    const [selectMode, setSelectMode] = useState(false);
    const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());

    // ─── Data ───────────────────────────────────────────────────
    const { materials, groups, isLoading, isSearching, totalCount, fetchVariantChildren, fetchRollDetails, fetchWarehouseStock } =
        useMaterialSearch({
            search: searchText,
            groupId: selectedGroup,
            inStockOnly,
            belowMinStock,
            supplierId: selectedSupplier,
            warehouseId: selectedWarehouse,
        });

    // Filter dropdown data
    const { suppliers, warehouses } = useBrowserFilterData();

    // Track which materials are already in the document
    const cartMaterialIds = useMemo(() => new Set(items.map(i => i.material_id)), [items]);

    // ─── Handlers ───────────────────────────────────────────────

    /** Toggle material expand → loads variant children for parents */
    const toggleExpand = useCallback((materialId: string) => {
        if (expandedMaterial === materialId) {
            setExpandedMaterial(null);
            return;
        }
        setExpandedMaterial(materialId);
    }, [expandedMaterial]);

    /** Open add dialog for a material */
    const handleOpenDialog = useCallback((material: MaterialSearchResult) => {
        setDialogMaterial(material);
        setDialogOpen(true);
    }, []);

    /** Toggle material selection in multi-select mode */
    const toggleSelect = useCallback((materialId: string) => {
        setSelectedMaterials(prev => {
            const next = new Set(prev);
            if (next.has(materialId)) {
                next.delete(materialId);
            } else {
                next.add(materialId);
            }
            return next;
        });
    }, []);

    /** Build a line item from material data */
    const buildLineItem = useCallback((mat: { id: string; code: string; name_ar: string; name_en: string; unit: string; purchase_price: number; selling_price: number; tax_rate?: number | null }, qty: number, price: number) => {
        const subtotal = qty * price;
        const isInternational = receiptMode === 'international';
        const resolved = isInternational
            ? { rate: 0, source: 'international' as const }
            : resolveItemTaxRate(mat.tax_rate, companyTaxRate, companyTaxEnabled);
        const taxAmt = computeTaxAmount(subtotal, resolved.rate);

        return {
            id: generateLineItemId(),
            material_id: mat.id,
            material_code: mat.code,
            material_name_ar: mat.name_ar,
            material_name_en: mat.name_en,
            quantity: qty,
            unit: mat.unit || 'meter',
            unit_price: price,
            discount_percent: 0,
            discount_amount: 0,
            subtotal,
            tax_rate: resolved.rate,
            tax_amount: taxAmt,
            total: subtotal + taxAmt,
            currency: currency,
            warehouse_id: '',
            warehouse_name_ar: '',
            notes: '',
        } as any;
    }, [companyTaxRate, companyTaxEnabled, receiptMode, currency]);

    /** Handle add from dialog */
    const handleAddLineItem = useCallback((data: {
        materialId: string;
        materialCode: string;
        materialNameAr: string;
        materialNameEn: string;
        quantity: number;
        unitPrice: number;
        unit: string;
        currency: string;
        materialTaxRate?: number | null;
    }) => {
        const item = buildLineItem(
            { id: data.materialId, code: data.materialCode, name_ar: data.materialNameAr, name_en: data.materialNameEn, unit: data.unit, purchase_price: data.unitPrice, selling_price: 0, tax_rate: data.materialTaxRate },
            data.quantity, data.unitPrice
        );
        onAddItem(item);
        setDialogOpen(false);
    }, [onAddItem, buildLineItem]);

    /** Batch add all selected materials with qty=1 */
    const handleBatchAdd = useCallback(() => {
        const toAdd = materials.filter(m => selectedMaterials.has(m.id) && !cartMaterialIds.has(m.id));
        for (const mat of toAdd) {
            const price = mat.purchase_price || mat.selling_price || 0;
            const item = buildLineItem(mat, 1, price);
            onAddItem(item);
        }
        setSelectedMaterials(new Set());
        setSelectMode(false);
    }, [materials, selectedMaterials, cartMaterialIds, buildLineItem, onAddItem]);

    const clearFilters = useCallback(() => {
        setSearchText('');
        setSelectedGroup('all');
        setSelectedCategory('all');
        setSelectedSupplier('all');
        setSelectedWarehouse('all');
        setInStockOnly(false);
        setBelowMinStock(false);
    }, []);

    const hasActiveFilters = searchText || selectedGroup !== 'all' || selectedCategory !== 'all'
        || selectedSupplier !== 'all' || selectedWarehouse !== 'all'
        || inStockOnly || belowMinStock;

    // Count active filters for badge
    const activeFilterCount = [
        selectedGroup !== 'all',
        selectedCategory !== 'all',
        selectedSupplier !== 'all',
        selectedWarehouse !== 'all',
        inStockOnly,
        belowMinStock,
        !!searchText,
    ].filter(Boolean).length;

    // ─── Render ─────────────────────────────────────────────────

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
                                <SelectTrigger className={cn('h-7 text-xs', selectedGroup !== 'all' && 'border-orange-400 bg-orange-50 dark:bg-orange-900/20')}>
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
                                <SelectTrigger className={cn('h-7 text-xs', selectedCategory !== 'all' && 'border-orange-400 bg-orange-50 dark:bg-orange-900/20')}>
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
                                <SelectTrigger className={cn('h-7 text-xs', selectedSupplier !== 'all' && 'border-orange-400 bg-orange-50 dark:bg-orange-900/20')}>
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
                                <SelectTrigger className={cn('h-7 text-xs', selectedWarehouse !== 'all' && 'border-orange-400 bg-orange-50 dark:bg-orange-900/20')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل المستودعات', 'All Warehouses')}</SelectItem>
                                    {warehouses.map(w => (
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
                                {/* In Stock Only */}
                                <Button
                                    variant={inStockOnly ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        'h-7 text-[10px] px-2 gap-1',
                                        inStockOnly && 'bg-green-600 hover:bg-green-700 text-white',
                                    )}
                                    onClick={() => setInStockOnly(!inStockOnly)}
                                >
                                    <Package className="w-3 h-3" />
                                    {t('متوفر', 'In Stock')}
                                </Button>

                                {/* Below Min Stock */}
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
                                <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
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

            {/* ═══ Multi-select toolbar ═══ */}
            {!readOnly && (
                <div className="flex items-center justify-between mb-2">
                    <Button
                        variant={selectMode ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                            'h-7 text-xs gap-1.5 px-3',
                            selectMode && 'bg-blue-600 hover:bg-blue-700 text-white',
                        )}
                        onClick={() => {
                            setSelectMode(!selectMode);
                            if (selectMode) setSelectedMaterials(new Set());
                        }}
                    >
                        <ListChecks className="w-3.5 h-3.5" />
                        {t('تحديد متعدد', 'Multi-Select')}
                    </Button>

                    {selectMode && selectedMaterials.size > 0 && (
                        <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5 px-4 bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleBatchAdd}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {t(`إضافة ${selectedMaterials.size} مادة`, `Add ${selectedMaterials.size} materials`)}
                        </Button>
                    )}
                </div>
            )}

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
                        const displayPrice = convertPrice(material.purchase_price || material.selling_price, material.currency || companyCurrency);
                        const isLowStock = material.stock_qty > 0 && material.stock_qty <= material.min_stock;

                        return (
                            <Card
                                key={material.id}
                                className={cn(
                                    'transition-all duration-200 hover:shadow-md',
                                    isInCart && 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10',
                                    !isInCart && 'hover:border-gray-300 dark:hover:border-gray-600',
                                    isExpanded && 'ring-1 ring-orange-200 dark:ring-orange-800',
                                )}
                            >
                                <CardContent className="p-0">
                                    {/* ─── Main Row ─── */}
                                    <div
                                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                                        onClick={() => selectMode ? toggleSelect(material.id) : toggleExpand(material.id)}
                                    >
                                        {/* Multi-select checkbox */}
                                        {selectMode && (
                                            <div className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(material.id); }}>
                                                {selectedMaterials.has(material.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        )}
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
                                                    <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                                                        {t('مضاف', 'Added')}
                                                    </Badge>
                                                )}
                                                {(material.is_variant_parent || material.has_variants) && (
                                                    <Badge variant="outline" className="text-[10px] gap-0.5 bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
                                                        <Layers className="w-2.5 h-2.5" />
                                                        {t('أم', 'Parent')}
                                                    </Badge>
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
                                                material.stock_qty === 0 ? 'text-gray-400'
                                                    : isLowStock ? 'text-amber-500'
                                                        : 'text-green-600 dark:text-green-400'
                                            )}>
                                                <Package className="w-3 h-3" />
                                                <span className="font-mono font-medium">
                                                    {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                                                </span>
                                                <span className="text-gray-400">{material.unit}</span>
                                            </div>
                                            {material.roll_count > 0 && (
                                                <div className="flex items-center justify-end gap-1 text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                                                    <span className="font-mono font-medium">{material.roll_count}</span>
                                                    <span>{t('رولون', 'rolls')}</span>
                                                </div>
                                            )}
                                            {isLowStock && (
                                                <div className="flex items-center gap-0.5 text-[10px] text-amber-500 mt-0.5">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    {t('مخزون منخفض', 'Low stock')}
                                                </div>
                                            )}

                                        </div>

                                        {/* Purchase Price */}
                                        <div className="text-end shrink-0 min-w-[80px]">
                                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
                                                {displayPrice.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-gray-400">{currency}</div>
                                        </div>

                                        {/* Quick Add button — for all materials (parents expand, normal opens dialog) */}
                                        {!readOnly && !selectMode && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const isParent = material.is_variant_parent || material.has_variants;
                                                    if (isParent) {
                                                        toggleExpand(material.id);
                                                    } else {
                                                        handleOpenDialog(material);
                                                    }
                                                }}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        )}

                                        {/* Expand Arrow */}
                                        <div className="shrink-0">
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* ─── Expanded: Variants (new) or Colors (legacy) ─── */}
                                    {isExpanded && (() => {
                                        const isParent = material.is_variant_parent || material.has_variants;
                                        const variantChildren = isParent ? fetchVariantChildren(material.id) : [];
                                        const isVarLoading = false;

                                        // Group variant children by their group (design)
                                        const variantGroups: { name_ar: string; name_en: string; items: MaterialSearchResult[] }[] = [];
                                        if (isParent && variantChildren.length > 0) {
                                            const groupMap = new Map<string, { name_ar: string; name_en: string; items: MaterialSearchResult[] }>();
                                            for (const child of variantChildren) {
                                                const gKey = child.group_id || 'ungrouped';
                                                if (!groupMap.has(gKey)) {
                                                    groupMap.set(gKey, {
                                                        name_ar: child.group_name_ar || t('بدون مجموعة', 'Ungrouped'),
                                                        name_en: child.group_name_en || 'Ungrouped',
                                                        items: [],
                                                    });
                                                }
                                                groupMap.get(gKey)!.items.push(child);
                                            }
                                            variantGroups.push(...Array.from(groupMap.values()));
                                        }

                                        return (
                                            <div className="border-t border-gray-100 dark:border-gray-800">
                                                {isParent ? (
                                                    /* ═══ VARIANT PARENT: Show grouped variant children ═══ */
                                                    <div className="p-3 space-y-2">
                                                        {/* Header */}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Layers className="w-4 h-4 text-purple-500" />
                                                            <span className="font-medium text-purple-700 dark:text-purple-300">
                                                                {t('المتغيرات', 'Variants')}
                                                            </span>
                                                            {!isVarLoading && (
                                                                <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                                                                    {variantChildren.length}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {isVarLoading ? (
                                                            <div className="flex items-center gap-2 justify-center py-4">
                                                                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                                                <span className="text-xs text-gray-400">
                                                                    {t('تحميل المتغيرات...', 'Loading variants...')}
                                                                </span>
                                                            </div>
                                                        ) : variantChildren.length === 0 ? (
                                                            <div className="text-center py-3">
                                                                <span className="text-xs text-gray-400">
                                                                    {t('لا توجد متغيرات', 'No variants found')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {variantGroups.map((group, gi) => (
                                                                    <div key={gi}>
                                                                        {/* Group header */}
                                                                        {variantGroups.length > 1 && (
                                                                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                                                                <Package className="w-3 h-3" />
                                                                                {isRTL ? group.name_ar : group.name_en}
                                                                                <span className="text-gray-300">({group.items.length})</span>
                                                                            </div>
                                                                        )}
                                                                        {/* Variant items */}
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                                            {group.items.map((variant) => {
                                                                                const varInCart = cartMaterialIds.has(variant.id);
                                                                                const varPrice = variant.purchase_price || variant.selling_price;
                                                                                return (
                                                                                    <div
                                                                                        key={variant.id}
                                                                                        onClick={() => !readOnly && handleOpenDialog(variant)}
                                                                                        className={cn(
                                                                                            'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all duration-150 hover:shadow-sm',
                                                                                            varInCart
                                                                                                ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20'
                                                                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600',
                                                                                        )}
                                                                                    >
                                                                                        {/* Variant swatch */}
                                                                                        <div className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-600 shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                                                                            {variant.swatch_url ? (
                                                                                                <img src={variant.swatch_url} alt="" className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <Layers className="w-3 h-3 text-gray-400" />
                                                                                            )}
                                                                                        </div>
                                                                                        {/* Variant info */}
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                                                                                {isRTL ? variant.name_ar : (variant.name_en || variant.name_ar)}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <span className="text-[10px] font-mono text-gray-400">{variant.code}</span>
                                                                                                {varPrice > 0 && (
                                                                                                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                                                                                                        {varPrice.toFixed(2)}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Stock */}
                                                                                        <div className="text-end shrink-0">
                                                                                            <div className="text-[10px] font-mono text-gray-500">
                                                                                                {variant.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })} {variant.unit}
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Status icon */}
                                                                                        {varInCart ? (
                                                                                            <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                                                                        ) : !readOnly ? (
                                                                                            <Plus className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                                                        ) : null}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* ═══ NORMAL MATERIAL: Direct add ═══ */
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                                    {t('إضافة مباشرة', 'Direct Add')}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400">
                                                                    {t('هذه المادة ليس لها متغيرات', 'This material has no variants')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!readOnly && (
                                                            <Button size="sm" className="h-7 text-xs gap-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleOpenDialog(material)}>
                                                                <Plus className="w-3 h-3" />
                                                                {t('إضافة', 'Add')}
                                                            </Button>
                                                        )}
                                                    </div>
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

            {/* ═══ Purchase Add Dialog ═══ */}
            {dialogMaterial && (
                <PurchaseAddDialog
                    open={dialogOpen}
                    onClose={() => {
                        setDialogOpen(false);
                        setDialogMaterial(null);
                    }}
                    material={dialogMaterial}
                    currency={currency}
                    supplierId={supplierId}
                    onAdd={handleAddLineItem}
                    canSeePurchasePrices={permissions.isManager || permissions.isPurchasingManager}
                />
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
// 📦 PurchaseAddDialog — Quantity + Price dialog for purchases
// ═══════════════════════════════════════════════════════════════════

interface PurchaseAddDialogProps {
    open: boolean;
    onClose: () => void;
    material: MaterialSearchResult;
    currency: string;
    supplierId?: string;
    canSeePurchasePrices: boolean;
    onAdd: (data: {
        materialId: string;
        materialCode: string;
        materialNameAr: string;
        materialNameEn: string;
        quantity: number;
        unitPrice: number;
        unit: string;
        currency: string;
        materialTaxRate?: number | null;
    }) => void;
}

function PurchaseAddDialog({
    open,
    onClose,
    material,
    currency,
    supplierId,
    canSeePurchasePrices,
    onAdd,
}: PurchaseAddDialogProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const t = (ar: string, en: string) => isAr ? ar : en;
    const inputRef = useRef<HTMLInputElement>(null);

    const [quantity, setQuantity] = useState<string>('');
    const [unitPrice, setUnitPrice] = useState<string>('');
    const [error, setError] = useState('');
    const [showPriceHistory, setShowPriceHistory] = useState(false);

    // Price history hook
    const { fetchPriceHistory, data: priceHistoryData, loading: priceHistoryLoading } = useMaterialPriceHistory();

    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const subtotal = qty * price;

    const unit = material.unit || 'meter';
    const unitLabels: Record<string, { ar: string; en: string }> = {
        meter: { ar: 'متر', en: 'm' },
        yard: { ar: 'ياردة', en: 'yd' },
        kg: { ar: 'كغ', en: 'kg' },
        piece: { ar: 'قطعة', en: 'pc' },
        roll: { ar: 'رولون', en: 'roll' },
    };
    const unitLabel = unitLabels[unit] || unitLabels.meter;

    const matName = isAr ? material.name_ar : (material.name_en || material.name_ar);
    const displayName = matName;

    // Use material price directly
    const basePrice = material.purchase_price ?? material.selling_price ?? 0;

    // Initialize on open
    useEffect(() => {
        if (open) {
            setQuantity('');
            setUnitPrice(String(basePrice || ''));
            setError('');
            setShowPriceHistory(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, material.id]);

    // Fetch price history on demand
    const handleShowPriceHistory = useCallback(() => {
        const next = !showPriceHistory;
        setShowPriceHistory(next);
        if (next && !priceHistoryData) {
            fetchPriceHistory(material.id, supplierId, canSeePurchasePrices);
        }
    }, [showPriceHistory, priceHistoryData, material.id, supplierId, canSeePurchasePrices, fetchPriceHistory]);

    const validate = useCallback(() => {
        if (qty <= 0) return t('أدخل كمية أكبر من صفر', 'Enter a quantity greater than 0');
        if (price <= 0) return t('أدخل سعر الوحدة', 'Enter unit price');
        return '';
    }, [qty, price]);

    const handleAdd = useCallback(() => {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }

        onAdd({
            materialId: material.id,
            materialCode: material.code,
            materialNameAr: material.name_ar,
            materialNameEn: material.name_en,
            quantity: qty,
            unitPrice: price,
            unit,
            currency,
            materialTaxRate: material.tax_rate,
        });
    }, [qty, price, material, unit, currency, validate, onAdd]);

    /** Keyboard shortcut: Enter → Add */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAdd();
        }
    }, [handleAdd]);

    /** Apply a price from history */
    const applyPrice = (histPrice: number) => {
        setUnitPrice(String(histPrice));
        setError('');
    };

    // Purchase prices from history
    const purchasePrices = priceHistoryData?.purchasePrices || [];
    const salePrices = priceHistoryData?.salePrices || [];

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[520px]" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </div>
                        {t('إضافة مادة للفاتورة', 'Add Material to Invoice')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Material Info */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {/* Material swatch */}
                        <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 shrink-0 overflow-hidden flex items-center justify-center">
                            {material.swatch_url ? (
                                <img src={material.swatch_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Package className="h-5 w-5 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{displayName}</p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <span className="font-mono">{material.code}</span>
                                <span>·</span>
                                <span>{isAr ? material.group_name_ar : (material.group_name_en || material.group_name_ar)}</span>
                            </div>
                        </div>
                        {/* Current stock info */}
                        <div className="text-end shrink-0">
                            <div className={cn(
                                'font-mono text-sm font-semibold',
                                material.stock_qty > 0 ? 'text-green-600' : 'text-gray-400',
                            )}>
                                {material.stock_qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                {t('المخزون الحالي', 'Current Stock')}
                            </div>
                        </div>
                    </div>

                    {/* ─── Quantity Input ─── */}
                    <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                            <span>{t('الكمية المطلوبة', 'Required Quantity')} ({unitLabel[isAr ? 'ar' : 'en']})</span>
                        </Label>
                        <Input
                            ref={inputRef}
                            type="number"
                            min={0.01}
                            step={1}
                            value={quantity}
                            onChange={(e) => {
                                setQuantity(e.target.value);
                                setError('');
                            }}
                            placeholder={`0 ${unitLabel[isAr ? 'ar' : 'en']}`}
                            className="font-mono text-lg h-11"
                        />
                    </div>

                    {/* ─── Unit Price ─── */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label>{t('سعر الوحدة', 'Unit Price')} {currency && `(${currency})`}</Label>
                            {/* Price History Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2"
                                onClick={handleShowPriceHistory}
                            >
                                <History className="w-3 h-3" />
                                {t('آخر الأسعار', 'Price History')}
                            </Button>
                        </div>
                        <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={unitPrice}
                            onChange={(e) => {
                                setUnitPrice(e.target.value);
                                setError('');
                            }}
                            placeholder="0.00"
                            className="font-mono"
                        />
                    </div>

                    {/* ─── Price History Panel ─── */}
                    {showPriceHistory && (
                        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                            <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-2 border-b flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                    {t('آخر أسعار الشراء', 'Recent Purchase Prices')}
                                </span>
                            </div>

                            {priceHistoryLoading ? (
                                <div className="flex items-center gap-2 justify-center py-4 text-gray-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span className="text-xs">{t('تحميل...', 'Loading...')}</span>
                                </div>
                            ) : purchasePrices.length === 0 && salePrices.length === 0 ? (
                                <div className="text-center py-4 text-xs text-gray-400">
                                    {t('لا يوجد سجل أسعار', 'No price history')}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {/* Purchase prices */}
                                    {purchasePrices.length > 0 && (
                                        <div className="p-2 space-y-1">
                                            {purchasePrices.map((record: PriceHistoryRecord, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 group transition-colors"
                                                    onClick={() => applyPrice(record.unit_price)}
                                                >
                                                    {idx === 0 ? (
                                                        <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[8px] text-orange-600 font-bold">★</span>
                                                        </div>
                                                    ) : record.unit_price > purchasePrices[0].unit_price ? (
                                                        <TrendingUp className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                                    ) : (
                                                        <TrendingDown className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono" dir="ltr">
                                                                {record.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            {record.currency && (
                                                                <span className="text-[9px] text-gray-400">{record.currency}</span>
                                                            )}
                                                            {record.quantity > 0 && (
                                                                <span className="text-[9px] text-gray-400">
                                                                    × {record.quantity.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-gray-400">
                                                            {new Date(record.date).toLocaleDateString()}
                                                            {record.doc_number && (
                                                                <span className="font-mono ms-1">#{record.doc_number}</span>
                                                            )}
                                                            {record.customer_or_supplier_name && (
                                                                <span className="ms-1">— {record.customer_or_supplier_name}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className="text-[9px] text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {t('استخدم', 'Apply')} →
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Sale prices (reference for managers) */}
                                    {canSeePurchasePrices && salePrices.length > 0 && (
                                        <div className="p-2">
                                            <div className="text-[9px] text-gray-400 px-2 mb-1">
                                                {t('أسعار البيع (مرجع)', 'Sale Prices (reference)')}
                                            </div>
                                            {salePrices.slice(0, 3).map((record: PriceHistoryRecord, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-500"
                                                >
                                                    <span className="font-mono font-medium">
                                                        {record.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span>{record.currency}</span>
                                                    <span className="text-gray-300">·</span>
                                                    <span>{new Date(record.date).toLocaleDateString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                    {qty > 0 && price > 0 && !error && (
                        <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                {t('الإجمالي', 'Subtotal')}
                            </span>
                            <span className="text-xl font-bold font-mono text-orange-700 dark:text-orange-400">
                                {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                {currency && (
                                    <span className="text-xs ms-1 font-normal text-orange-500">{currency}</span>
                                )}
                            </span>
                        </div>
                    )}
                </div>

                {/* ══════════ Action Buttons ══════════ */}
                <div className="flex gap-2 pt-2">
                    <Button
                        onClick={handleAdd}
                        disabled={qty <= 0 || price <= 0 || !!error}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                        <Check className="h-4 w-4" />
                        {t('إضافة ومتابعة التصفح', 'Add & Continue')}
                        <kbd className="ms-1 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-700/50 text-orange-200">
                            <CornerDownLeft className="w-2.5 h-2.5 me-0.5" />
                            Enter
                        </kbd>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        {t('إلغاء', 'Cancel')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default PurchaseMaterialBrowserTab;
