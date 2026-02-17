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
    type MaterialColorVariant,
} from '@/features/trade/hooks/useMaterialSearch';
import { useBrowserFilterData } from '@/features/trade/hooks/useBrowserFilterData';
import { useMaterialPriceHistory, type PriceHistoryRecord } from '@/features/trade/hooks/useMaterialPriceHistory';
import { useTradePermissions } from '@/hooks/useTradePermissions';
import { useTaxDefaults, computeTaxAmount, resolveItemTaxRate } from '@/features/trade/hooks/useTaxDefaults';
import { useCompany } from '@/hooks/useCompany';

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
    Palette,
    Warehouse,
    RotateCcw,
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
    /** Read only mode */
    readOnly?: boolean;
    /** Supplier ID — for price history context */
    supplierId?: string;
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
    readOnly = false,
    supplierId,
}) => {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ─── Company & Tax Defaults ───
    const { companyId } = useCompany();
    const { data: taxDefaults } = useTaxDefaults(companyId);
    const companyTaxRate = taxDefaults?.isEnabled ? taxDefaults.rate : 0;
    const companyTaxEnabled = taxDefaults?.isEnabled ?? false;

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

    // Expanded material (to show colors)
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
    // Color cache: materialId → colors
    const [colorsCache, setColorsCache] = useState<Record<string, MaterialColorVariant[]>>({});
    const [colorsLoading, setColorsLoading] = useState<Set<string>>(new Set());

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMaterial, setDialogMaterial] = useState<MaterialSearchResult | null>(null);
    const [dialogColor, setDialogColor] = useState<MaterialColorVariant | null>(null);

    // ─── Data ───────────────────────────────────────────────────
    const { materials, groups, isLoading, isSearching, totalCount, fetchMaterialColors } =
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
    const { suppliers, warehouses } = useBrowserFilterData();

    // Track which materials are already in the document
    const cartMaterialIds = useMemo(() => new Set(items.map(i => i.material_id)), [items]);

    // Build a set of "materialId__colorId" keys for items in cart
    const cartItemKeys = useMemo(() => {
        return new Set(items.map(i => {
            const colorId = (i as any).color_id || '';
            return `${i.material_id}__${colorId}`;
        }));
    }, [items]);

    // ─── Handlers ───────────────────────────────────────────────

    /** Toggle material expand → loads colors on demand */
    const toggleExpand = useCallback(async (materialId: string) => {
        if (expandedMaterial === materialId) {
            setExpandedMaterial(null);
            return;
        }
        setExpandedMaterial(materialId);

        // Fetch colors if not cached
        if (!colorsCache[materialId]) {
            setColorsLoading(prev => new Set(prev).add(materialId));
            try {
                const colors = await fetchMaterialColors(materialId);
                setColorsCache(prev => ({ ...prev, [materialId]: colors }));
            } catch {
                setColorsCache(prev => ({ ...prev, [materialId]: [] }));
            } finally {
                setColorsLoading(prev => {
                    const next = new Set(prev);
                    next.delete(materialId);
                    return next;
                });
            }
        }
    }, [expandedMaterial, colorsCache, fetchMaterialColors]);

    /** Open add dialog for a material (no color) */
    const handleOpenDialog = useCallback((material: MaterialSearchResult, color?: MaterialColorVariant) => {
        setDialogMaterial(material);
        setDialogColor(color || null);
        setDialogOpen(true);
    }, []);

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
        colorId?: string;
        colorNameAr?: string;
        colorNameEn?: string;
        colorHex?: string;
        materialTaxRate?: number | null;
    }) => {
        const subtotal = data.quantity * data.unitPrice;

        // 🔑 القاعدة الذهبية: مادة → شركة → 0%
        const resolved = resolveItemTaxRate(data.materialTaxRate, companyTaxRate, companyTaxEnabled);
        const taxAmt = computeTaxAmount(subtotal, resolved.rate);

        const newItem: InvoiceLineItem = {
            id: generateLineItemId(),
            material_id: data.materialId,
            material_code: data.materialCode,
            material_name_ar: data.colorNameAr
                ? `${data.materialNameAr} — ${data.colorNameAr}`
                : data.materialNameAr,
            material_name_en: data.colorNameEn
                ? `${data.materialNameEn} — ${data.colorNameEn}`
                : data.materialNameEn,
            quantity: data.quantity,
            unit: data.unit,
            unit_price: data.unitPrice,
            discount_percent: 0,
            discount_amount: 0,
            subtotal,
            tax_rate: resolved.rate,
            tax_amount: taxAmt,
            total: subtotal + taxAmt,
            currency: data.currency,
            warehouse_id: '',
            warehouse_name_ar: '',
            notes: '',
            // Color tracking
            ...(data.colorId ? {
                color_id: data.colorId,
                color_name_ar: data.colorNameAr,
                color_name_en: data.colorNameEn,
                color_hex: data.colorHex,
            } : {}),
        } as any;

        onAddItem(newItem);
        setDialogOpen(false);
    }, [onAddItem]);

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
                        const displayPrice = material.purchase_price || material.selling_price;
                        const isLowStock = material.stock_qty > 0 && material.stock_qty <= material.min_stock;
                        const isColorLoading = colorsLoading.has(material.id);
                        const colors = colorsCache[material.id] || [];
                        const hasColors = colors.length > 0;

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
                                                    <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                                                        {t('مضاف', 'Added')}
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

                                        {/* Expand Arrow */}
                                        <div className="shrink-0">
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* ─── Expanded: Colors or Direct Add ─── */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 dark:border-gray-800">
                                            {isColorLoading ? (
                                                <div className="flex items-center gap-2 justify-center py-4">
                                                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                                    <span className="text-xs text-gray-400">
                                                        {t('تحميل الألوان...', 'Loading colors...')}
                                                    </span>
                                                </div>
                                            ) : hasColors ? (
                                                /* ─── Color Grid ─── */
                                                <div className="p-3 space-y-1.5">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Palette className="w-3.5 h-3.5 text-orange-500" />
                                                        <span className="text-[11px] font-medium text-gray-500">
                                                            {t('اختر اللون', 'Select Color')}
                                                            <span className="text-gray-400 ms-1">({colors.length})</span>
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                        {colors.map((color) => {
                                                            const colorKey = `${material.id}__${color.color_id}`;
                                                            const colorInCart = cartItemKeys.has(colorKey);
                                                            const colorPrice = color.price_override ?? displayPrice;

                                                            return (
                                                                <div
                                                                    key={color.id}
                                                                    onClick={() => !readOnly && color.is_available && handleOpenDialog(material, color)}
                                                                    className={cn(
                                                                        'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all duration-150',
                                                                        'hover:shadow-sm',
                                                                        colorInCart
                                                                            ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20'
                                                                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600',
                                                                        !color.is_available && 'opacity-50 cursor-not-allowed',
                                                                    )}
                                                                >
                                                                    {/* Color swatch */}
                                                                    <div
                                                                        className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-600 shrink-0 shadow-inner"
                                                                        style={{ backgroundColor: color.hex_color }}
                                                                    />

                                                                    {/* Color info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                                                            {isRTL ? color.color_name_ar : (color.color_name_en || color.color_name_ar)}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-mono text-gray-400">{color.color_code}</span>
                                                                            {color.price_override != null && (
                                                                                <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400">
                                                                                    {colorPrice.toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Status */}
                                                                    {colorInCart ? (
                                                                        <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                                    ) : !readOnly && color.is_available ? (
                                                                        <Plus className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Add without color (optional) */}
                                                    {!readOnly && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full h-7 text-[10px] text-gray-400 hover:text-gray-600 mt-1"
                                                            onClick={() => handleOpenDialog(material)}
                                                        >
                                                            {t('إضافة بدون تحديد لون', 'Add without specific color')}
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                /* ─── No colors → Direct add button ─── */
                                                <div className="p-3 flex items-center justify-between">
                                                    <span className="text-xs text-gray-400">
                                                        {t('لا توجد ألوان محددة لهذه المادة', 'No colors defined for this material')}
                                                    </span>
                                                    {!readOnly && (
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs gap-1 bg-orange-600 hover:bg-orange-700 text-white"
                                                            onClick={() => handleOpenDialog(material)}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            {t('إضافة', 'Add')}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                        setDialogColor(null);
                    }}
                    material={dialogMaterial}
                    color={dialogColor}
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
    color: MaterialColorVariant | null;
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
        colorId?: string;
        colorNameAr?: string;
        colorNameEn?: string;
        colorHex?: string;
        materialTaxRate?: number | null;
    }) => void;
}

function PurchaseAddDialog({
    open,
    onClose,
    material,
    color,
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
    const colorName = color
        ? (isAr ? color.color_name_ar : (color.color_name_en || color.color_name_ar))
        : null;
    const displayName = colorName ? `${matName} — ${colorName}` : matName;

    // Use color price override if available
    const basePrice = color?.price_override ?? material.purchase_price ?? material.selling_price ?? 0;

    // Initialize on open
    useEffect(() => {
        if (open) {
            setQuantity('');
            setUnitPrice(String(basePrice || ''));
            setError('');
            setShowPriceHistory(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, material.id, color?.color_id]);

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
            ...(color ? {
                colorId: color.color_id,
                colorNameAr: color.color_name_ar,
                colorNameEn: color.color_name_en,
                colorHex: color.hex_color,
            } : {}),
            materialTaxRate: material.tax_rate,
        });
    }, [qty, price, material, color, unit, currency, validate, onAdd]);

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
                    {/* Material + Color Info */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {/* Material swatch or color swatch */}
                        <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 shrink-0 overflow-hidden flex items-center justify-center"
                            style={color ? { backgroundColor: color.hex_color } : undefined}
                        >
                            {!color && (material.swatch_url ? (
                                <img src={material.swatch_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Package className="h-5 w-5 text-gray-400" />
                            ))}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{displayName}</p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <span className="font-mono">{material.code}</span>
                                {color && (
                                    <>
                                        <span>·</span>
                                        <span className="font-mono">{color.color_code}</span>
                                    </>
                                )}
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
