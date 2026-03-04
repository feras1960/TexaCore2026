/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Material Inventory Tab — Enhanced v3 (Cart Integration)
 * تبويب المخزون للمادة — عرض المخزون حسب المستودعات
 * ✅ فلتر المستودع + فلتر الحالة
 * ✅ زر عرض المستودعات الفارغة
 * ✅ صفوف قابلة للتوسيع مع تفاصيل الرولونات
 * ✅ بيانات حقيقية من fabric_rolls + warehouses
 * ✅ V3: Cart integration — Add material per warehouse + preferred rolls toggle
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Database,
    Warehouse as WarehouseIcon,
    Package,
    AlertCircle,
    CheckCircle2,
    Lock,
    Layers,
    Ruler,
    RefreshCw,
    AlertTriangle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Filter,
    Scroll,
    ShoppingCart,
    Check,
    Heart,
    MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { warehouseService } from '@/services/warehouseService';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { AddToCartDialog } from '@/components/cart/AddToCartDialog';

// ════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════

interface InventoryRecord {
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name_ar: string;
    warehouse_name_en: string;
    roll_count: number;
    total_length: number;
    available_length: number;
    reserved_length: number;
    last_updated: string | null;
}

interface RollDetail {
    id: string;
    roll_number: string;
    warehouse_id: string;
    warehouse_name_ar: string;
    warehouse_name_en: string;
    initial_length: number;
    current_length: number;
    reserved_length: number;
    available_length: number;
    status: string;
    // ─ Color ─
    color_id?: string;
    color_name_ar?: string;
    color_name_en?: string;
    color_hex?: string;
    supplier_name?: string;
    received_date?: string;
    created_at: string;
    // ─ Location ─
    bin_location_id?: string;
    bin_location_code?: string;
    bin_location_name?: string;
}

interface WarehouseBasic {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
}

type StockStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

interface MaterialInventoryTabProps {
    data: any;
    /** Called when user wants to close the material sheet (e.g. to open cart) */
    onClose?: () => void;
    /** Called when user clicks a roll to open its detail sheet as MDI tab */
    onOpenRoll?: (roll: any) => void;
}

// ════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════

export function MaterialInventoryTab({ data, onClose, onOpenRoll }: MaterialInventoryTabProps) {
    const { language } = useLanguage();
    const { companyId } = useCompany();
    const { actions: cartActions } = useCart();
    const isRTL = language === 'ar';

    // Bilingual helper (Stabilization Pattern — Constitution §4.4)
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ═══════════ State ═══════════
    const [inventoryData, setInventoryData] = useState<InventoryRecord[]>([]);
    const [allWarehouses, setAllWarehouses] = useState<WarehouseBasic[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<StockStatus>('all');
    const [showEmpty, setShowEmpty] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>('all'); // ─ internal color filter

    // Expandable rows
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [rollsCache, setRollsCache] = useState<Record<string, RollDetail[]>>({});
    const [rollsLoading, setRollsLoading] = useState<Set<string>>(new Set());

    // AddToCartDialog state
    const [cartDialogOpen, setCartDialogOpen] = useState(false);
    const [cartDialogRecord, setCartDialogRecord] = useState<InventoryRecord | null>(null);

    // ═══════════ Unit Label ═══════════
    const unitLabel = useMemo(() => {
        const unit = data?.unit || 'meter';
        const unitLabels: Record<string, { ar: string; en: string }> = {
            meter: { ar: 'متر', en: 'm' },
            yard: { ar: 'ياردة', en: 'yd' },
            kg: { ar: 'كغ', en: 'kg' },
            piece: { ar: 'قطعة', en: 'pc' },
            roll: { ar: 'رولون', en: 'roll' },
            ton: { ar: 'طن', en: 'ton' },
        };
        return unitLabels[unit] || unitLabels.meter;
    }, [data?.unit]);

    // ═══════════ Data Fetching ═══════════
    const fetchInventory = useCallback(async () => {
        if (!companyId || !data?.id) return;

        setLoading(true);
        setError(null);

        try {
            const [stockData, warehouses] = await Promise.all([
                warehouseService.getMaterialStockByWarehouse(companyId, data.id),
                warehouseService.getAll(companyId),
            ]);
            setInventoryData(stockData);
            setAllWarehouses(warehouses.map((w: any) => ({
                id: w.id,
                code: w.code || '',
                name_ar: w.name_ar || '',
                name_en: w.name_en || '',
            })));
        } catch (err: any) {
            console.error('Failed to fetch inventory:', err);
            setError(err.message || t('فشل في تحميل بيانات المخزون', 'Failed to load inventory data'));
        } finally {
            setLoading(false);
        }
    }, [companyId, data?.id]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // ═══════════ Stock Status Helper ═══════════
    const getStockStatus = useCallback((record: InventoryRecord): 'in_stock' | 'low_stock' | 'out_of_stock' => {
        if (record.total_length <= 0) return 'out_of_stock';
        const minStock = data?.min_stock || 0;
        if (minStock > 0 && record.total_length <= minStock) return 'low_stock';
        if (record.available_length <= 0 && record.reserved_length > 0) return 'low_stock';
        return 'in_stock';
    }, [data?.min_stock]);

    // ═══════════ Filtered Data ═══════════
    const filteredData = useMemo(() => {
        // Build the base list: inventory data + empty warehouses (if showEmpty is on)
        let result = [...inventoryData];

        if (showEmpty) {
            const stockedWarehouseIds = new Set(inventoryData.map(r => r.warehouse_id));
            const emptyWarehouses: InventoryRecord[] = allWarehouses
                .filter(w => !stockedWarehouseIds.has(w.id))
                .map(w => ({
                    warehouse_id: w.id,
                    warehouse_code: w.code,
                    warehouse_name_ar: w.name_ar,
                    warehouse_name_en: w.name_en,
                    roll_count: 0,
                    total_length: 0,
                    available_length: 0,
                    reserved_length: 0,
                    last_updated: null,
                }));
            result = [...result, ...emptyWarehouses];
        }

        // Filter by warehouse
        if (selectedWarehouse !== 'all') {
            result = result.filter(r => r.warehouse_id === selectedWarehouse);
        }

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(r => getStockStatus(r) === statusFilter);
        }

        return result;
    }, [inventoryData, allWarehouses, showEmpty, selectedWarehouse, statusFilter, getStockStatus]);

    // ═══════════ Color options from this material's rolls ═══════════
    // Collects unique colors from all cached rolls across all warehouses
    const availableColors = useMemo(() => {
        const colorMap = new Map<string, { id: string; name_ar?: string; name_en?: string; hex?: string }>();
        for (const rolls of Object.values(rollsCache)) {
            for (const roll of rolls) {
                if (roll.color_id && !colorMap.has(roll.color_id)) {
                    colorMap.set(roll.color_id, {
                        id: roll.color_id,
                        name_ar: roll.color_name_ar,
                        name_en: roll.color_name_en,
                        hex: roll.color_hex,
                    });
                }
            }
        }
        return [...colorMap.values()];
    }, [rollsCache]);

    // ═══════════ Totals ═══════════
    const totals = useMemo(() => inventoryData.reduce(
        (acc, record) => ({
            rolls: acc.rolls + record.roll_count,
            total: acc.total + record.total_length,
            available: acc.available + record.available_length,
            reserved: acc.reserved + record.reserved_length,
        }),
        { rolls: 0, total: 0, available: 0, reserved: 0 }
    ), [inventoryData]);

    // ═══════════ Expandable Rows ═══════════
    const toggleExpand = useCallback(async (warehouseId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(warehouseId)) {
            newExpanded.delete(warehouseId);
            setExpandedRows(newExpanded);
            return;
        }

        newExpanded.add(warehouseId);
        setExpandedRows(newExpanded);

        // Fetch rolls if not cached
        if (!rollsCache[warehouseId] && companyId && data?.id) {
            setRollsLoading(prev => new Set(prev).add(warehouseId));
            try {
                const rolls = await warehouseService.getMaterialRollsDetail(companyId, data.id, warehouseId);
                setRollsCache(prev => ({ ...prev, [warehouseId]: rolls }));
            } catch (err) {
                console.error('Failed to fetch rolls:', err);
                setRollsCache(prev => ({ ...prev, [warehouseId]: [] }));
            } finally {
                setRollsLoading(prev => {
                    const next = new Set(prev);
                    next.delete(warehouseId);
                    return next;
                });
            }
        }
    }, [expandedRows, rollsCache, companyId, data?.id]);

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

    // Format date - always use en-US numerals
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch { return '—'; }
    };

    // ═══════════ Cart Handlers ═══════════

    /** Open AddToCartDialog for quantity input */
    const handleAddMaterialToCart = (record: InventoryRecord) => {
        setCartDialogRecord(record);
        setCartDialogOpen(true);
    };

    /** Called when user clicks "Open Cart" in the dialog */
    const handleOpenCartFromDialog = () => {
        // Close material sheet first, then open cart drawer
        if (onClose) {
            onClose();
        }
        setTimeout(() => {
            cartActions.openDrawer();
        }, 200);
    };

    /** Toggle roll as preferred — does NOT open drawer */
    const handleToggleRoll = (record: InventoryRecord, roll: RollDetail) => {
        const materialId = data?.id;
        if (!materialId) return;

        // If material+warehouse is not in cart yet, add it first with the preferred roll
        if (!cartActions.isInCart(materialId, record.warehouse_id)) {
            cartActions.addItem({
                material_id: materialId,
                material_name_ar: data?.name_ar || data?.name || '',
                material_name_en: data?.name_en || data?.name || '',
                material_code: data?.code || '',
                quantity: record.available_length,
                unit: data?.unit || 'meter',
                warehouse_id: record.warehouse_id,
                warehouse_name_ar: record.warehouse_name_ar,
                warehouse_name_en: record.warehouse_name_en,
                available_stock: record.available_length,
                preferred_rolls: [{
                    roll_id: roll.id,
                    roll_number: roll.roll_number,
                    available_length: roll.available_length,
                }],
                unit_price: data?.price || 0,
                currency: data?.currency || 'SAR',
            });
        } else {
            // Just toggle the roll preference
            cartActions.togglePreferredRoll(materialId, record.warehouse_id, {
                roll_id: roll.id,
                roll_number: roll.roll_number,
                available_length: roll.available_length,
            });
        }
        // Do NOT open drawer — just visual feedback
    };

    // ═══════════ Render ═══════════
    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-4 p-4" dir={isRTL ? 'rtl' : 'ltr'}>

                {/* ═══════════ Error Message ═══════════ */}
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                {t('خطأ في تحميل البيانات', 'Error loading data')}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchInventory} className="text-red-600 hover:text-red-800">
                            <RefreshCw className="w-4 h-4 me-1" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                )}

                {/* ═══════════ Filters Bar ═══════════ */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <WarehouseIcon className="w-5 h-5 text-erp-teal" />
                                {t('المخزون حسب المستودعات', 'Inventory by Warehouse')}
                                {!loading && (
                                    <Badge variant="secondary" className="text-xs ms-2">
                                        {filteredData.length} {t('مستودع', 'warehouses')}
                                    </Badge>
                                )}
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={fetchInventory} disabled={loading}>
                                <RefreshCw className={cn("w-4 h-4 me-1", loading && "animate-spin")} />
                                {t('تحديث', 'Refresh')}
                            </Button>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />

                            {/* Warehouse Filter */}
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                    <SelectValue placeholder={t('كل المستودعات', 'All Warehouses')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل المستودعات', 'All Warehouses')}</SelectItem>
                                    {allWarehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StockStatus)}>
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                    <SelectValue placeholder={t('كل الحالات', 'All Statuses')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل الحالات', 'All Statuses')}</SelectItem>
                                    <SelectItem value="in_stock">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            {t('متوفر', 'In Stock')}
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="low_stock">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                            {t('مخزون منخفض', 'Low Stock')}
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="out_of_stock">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                            {t('نفذ', 'Out of Stock')}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Color Filter — colors from THIS material's rolls */}
                            {availableColors.length > 0 && (
                                <Select value={selectedColor} onValueChange={setSelectedColor}>
                                    <SelectTrigger className="w-[160px] h-8 text-xs">
                                        <SelectValue placeholder={t('كل الألوان', 'All Colors')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('🎨 كل الألوان', '🎨 All Colors')}</SelectItem>
                                        {availableColors.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <span className="flex items-center gap-2">
                                                    {c.hex && (
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                                                            style={{ backgroundColor: c.hex }}
                                                        />
                                                    )}
                                                    {isRTL ? c.name_ar : (c.name_en || c.name_ar)}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Show Empty Warehouses Toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showEmpty ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn("h-8 text-xs gap-1.5", showEmpty && "bg-erp-teal hover:bg-erp-teal/90")}
                                        onClick={() => setShowEmpty(!showEmpty)}
                                    >
                                        {showEmpty ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        {t('المستودعات الفارغة', 'Empty Warehouses')}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {showEmpty
                                        ? t('إخفاء المستودعات التي لا تحتوي على مخزون', 'Hide warehouses with no stock')
                                        : t('عرض جميع المستودعات بما فيها الفارغة', 'Show all warehouses including empty ones')}
                                </TooltipContent>
                            </Tooltip>

                            {/* Reset Filters */}
                            {(selectedWarehouse !== 'all' || statusFilter !== 'all' || showEmpty || selectedColor !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-gray-500"
                                    onClick={() => {
                                        setSelectedWarehouse('all');
                                        setStatusFilter('all');
                                        setShowEmpty(false);
                                        setSelectedColor('all');
                                    }}
                                >
                                    {t('إعادة تعيين', 'Reset')}
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                        {!loading && !error && filteredData.length === 0 ? (
                            /* ═══════════ Empty State ═══════════ */
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {(selectedWarehouse !== 'all' || statusFilter !== 'all')
                                        ? t('لا توجد نتائج مطابقة للفلاتر المحددة', 'No results match the selected filters')
                                        : t('لا يوجد مخزون لهذه المادة حالياً', 'No inventory found for this material')}
                                </p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                                    {(selectedWarehouse !== 'all' || statusFilter !== 'all')
                                        ? t('جرب تغيير الفلاتر أو إعادة تعيينها', 'Try changing or resetting the filters')
                                        : t('سيظهر المخزون هنا بعد إضافة رولونات لهذه المادة', 'Stock will appear here after adding rolls')}
                                </p>
                            </div>
                        ) : (
                            /* ═══════════ Inventory Table with Expandable Rows ═══════════ */
                            <div className="border rounded-lg overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_6rem_auto] bg-gray-50 dark:bg-gray-800/50 border-b text-xs font-medium text-gray-500 dark:text-gray-400">
                                    <div className="p-2.5 text-center">#</div>
                                    <div className="p-2.5">{t('المستودع', 'Warehouse')}</div>
                                    <div className="p-2.5 text-end">{t('الرولونات', 'Rolls')}</div>
                                    <div className="p-2.5 text-end">{t(`الإجمالي (${unitLabel.ar})`, `Total (${unitLabel.en})`)}</div>
                                    <div className="p-2.5 text-end">{t('المتاح', 'Available')}</div>
                                    <div className="p-2.5 text-end">{t('المحجوز', 'Reserved')}</div>
                                    <div className="p-2.5">{t('الحالة', 'Status')}</div>
                                    <div className="p-2.5 text-center">{t('التفاصيل', 'Details')}</div>
                                    <div className="p-2.5 text-center pe-3">
                                        <ShoppingCart className="w-3.5 h-3.5 mx-auto" />
                                    </div>
                                </div>

                                {/* Loading Skeleton */}
                                {loading && (
                                    <div className="divide-y">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_6rem_auto] animate-pulse">
                                                {Array.from({ length: 9 }).map((_, j) => (
                                                    <div key={j} className="p-3">
                                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Table Rows */}
                                {!loading && filteredData.map((record, idx) => {
                                    const status = getStockStatus(record);
                                    const isExpanded = expandedRows.has(record.warehouse_id);
                                    const isRollsLoading = rollsLoading.has(record.warehouse_id);
                                    const rolls = rollsCache[record.warehouse_id] || [];
                                    // ─── Apply internal color filter ───
                                    const filteredRolls = selectedColor === 'all'
                                        ? rolls
                                        : rolls.filter(r => r.color_id === selectedColor);
                                    const isEmpty = record.roll_count === 0;
                                    const isInCart = cartActions.isInCart(data?.id, record.warehouse_id);

                                    return (
                                        <React.Fragment key={record.warehouse_id}>
                                            {/* Main Row */}
                                            <div
                                                className={cn(
                                                    "grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_6rem_auto] items-center border-b last:border-b-0 transition-colors",
                                                    isExpanded && "bg-blue-50/50 dark:bg-blue-900/10",
                                                    isInCart && "bg-emerald-50/40 dark:bg-emerald-900/10",
                                                    isEmpty && "opacity-60",
                                                    !isEmpty && "hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer",
                                                )}
                                                onClick={() => !isEmpty && toggleExpand(record.warehouse_id)}
                                            >
                                                {/* Row Number */}
                                                <div className="p-2.5 text-center text-xs text-gray-400 font-mono">
                                                    {idx + 1}
                                                </div>

                                                {/* Warehouse Name */}
                                                <div className="p-2.5 flex items-center gap-2">
                                                    <WarehouseIcon className={cn("w-4 h-4 flex-shrink-0", isEmpty ? "text-gray-300" : "text-gray-400")} />
                                                    <div>
                                                        <span className="font-tajawal text-sm">
                                                            {language === 'ar' ? record.warehouse_name_ar : (record.warehouse_name_en || record.warehouse_name_ar)}
                                                        </span>
                                                        {record.warehouse_code && (
                                                            <span className="text-[10px] font-mono text-gray-400 ms-1.5">
                                                                ({record.warehouse_code})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Rolls */}
                                                <div className="p-2.5 text-end">
                                                    <span className={cn("font-semibold font-mono text-sm", isEmpty ? "text-gray-300" : "text-indigo-600 dark:text-indigo-400")}>
                                                        {record.roll_count.toLocaleString('en-US')}
                                                    </span>
                                                </div>

                                                {/* Total */}
                                                <div className="p-2.5 text-end">
                                                    <span className={cn("font-semibold font-mono text-sm", isEmpty ? "text-gray-300" : "text-blue-600 dark:text-blue-400")}>
                                                        {record.total_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                {/* Available */}
                                                <div className="p-2.5 text-end">
                                                    <span className={cn("font-semibold font-mono text-sm", isEmpty ? "text-gray-300" : "text-green-600 dark:text-green-400")}>
                                                        {record.available_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                {/* Reserved */}
                                                <div className="p-2.5 text-end">
                                                    <span className={cn("font-semibold font-mono text-sm", isEmpty ? "text-gray-300" : "text-orange-600 dark:text-orange-400")}>
                                                        {record.reserved_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                {/* Status */}
                                                <div className="p-2.5">
                                                    {isEmpty ? (
                                                        <span className="text-xs text-gray-400 italic">{t('فارغ', 'Empty')}</span>
                                                    ) : (
                                                        <StatusBadge
                                                            status={{
                                                                code: status === 'in_stock' ? 'available' : status === 'low_stock' ? 'pending' : 'expired',
                                                                name_ar: status === 'in_stock' ? 'متوفر' : status === 'low_stock' ? 'منخفض' : 'نفذ',
                                                                name_en: status === 'in_stock' ? 'In Stock' : status === 'low_stock' ? 'Low' : 'Out',
                                                                color: status === 'in_stock' ? 'green' : status === 'low_stock' ? 'orange' : 'red'
                                                            } as any}
                                                            size="sm"
                                                        />
                                                    )}
                                                </div>

                                                {/* Expand Button */}
                                                <div className="p-2.5 text-center">
                                                    {!isEmpty && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpand(record.warehouse_id);
                                                            }}
                                                        >
                                                            <motion.div
                                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                <ChevronDown className="w-4 h-4" />
                                                            </motion.div>
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* 🛒 Add to Cart — Material Level */}
                                                <div className="p-2.5 pe-3 text-center">
                                                    {!isEmpty && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant={isInCart ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    className={cn(
                                                                        "h-8 w-8 p-0 transition-all",
                                                                        isInCart
                                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                                            : "hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                                                                    )}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isInCart) {
                                                                            // Already in cart — just open drawer
                                                                            cartActions.openDrawer();
                                                                        } else {
                                                                            handleAddMaterialToCart(record);
                                                                        }
                                                                    }}
                                                                >
                                                                    {isInCart
                                                                        ? <Check className="h-4 w-4" />
                                                                        : <ShoppingCart className="h-4 w-4" />}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="text-xs">
                                                                {isInCart
                                                                    ? t('في السلة — اضغط للعرض', 'In cart — click to view')
                                                                    : t('إضافة للسلة', 'Add to Cart')}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ═══════════ Expanded Roll Details ═══════════ */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="overflow-hidden border-b"
                                                    >
                                                        <div className="bg-blue-50/30 dark:bg-blue-900/5 px-4 py-3">
                                                            {isRollsLoading ? (
                                                                <div className="flex items-center gap-2 justify-center py-4 text-gray-400">
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                    <span className="text-sm">{t('تحميل تفاصيل الرولونات...', 'Loading roll details...')}</span>
                                                                </div>
                                                            ) : rolls.length === 0 ? (
                                                                <div className="text-center py-4 text-gray-400 text-sm">
                                                                    {t('لا توجد رولونات', 'No rolls found')}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {/* Rolls Sub-Header */}
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Scroll className="w-4 h-4 text-blue-500" />
                                                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                                            {t('تفاصيل الرولونات', 'Roll Details')}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[10px] h-5">
                                                                            {rolls.length} {t('رولون', 'rolls')}
                                                                        </Badge>
                                                                        {isInCart && (
                                                                            <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ms-auto">
                                                                                <Heart className="w-3 h-3 me-1" />
                                                                                {t('حدد رولونات مفضلة', 'Select preferred rolls')}
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {/* Rolls Mini Table */}
                                                                    <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-900">
                                                                        {/* Header */}
                                                                        <div className="grid grid-cols-[auto_1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.9fr] bg-gray-50 dark:bg-gray-800/60 text-[10px] font-medium text-gray-500 border-b">
                                                                            <div className="px-2 py-2 text-center w-10">
                                                                                <Heart className="w-3 h-3 mx-auto" />
                                                                            </div>
                                                                            <div className="px-3 py-2">{t('رقم الرولون', 'Roll #')}</div>
                                                                            <div className="px-3 py-2 flex items-center gap-1">
                                                                                <MapPin className="w-3 h-3" />
                                                                                {t('الموقع', 'Location')}
                                                                            </div>
                                                                            <div className="px-3 py-2 text-end">{t('الطول الأصلي', 'Initial')}</div>
                                                                            <div className="px-3 py-2 text-end">{t('الطول الحالي', 'Current')}</div>
                                                                            <div className="px-3 py-2 text-end">{t('المتاح', 'Available')}</div>
                                                                            <div className="px-3 py-2 text-end">{t('المحجوز', 'Reserved')}</div>
                                                                            <div className="px-3 py-2">{t('الحالة', 'Status')}</div>
                                                                            <div className="px-3 py-2">{t('تاريخ الاستلام', 'Received')}</div>
                                                                        </div>


                                                                        {/* Roll Rows */}
                                                                        {filteredRolls.map((roll) => {
                                                                            const rStatus = getRollStatusLabel(roll.status);
                                                                            const usagePercent = roll.initial_length > 0
                                                                                ? Math.round((1 - roll.current_length / roll.initial_length) * 100)
                                                                                : 0;
                                                                            const isPreferred = cartActions.isRollPreferred(data?.id, record.warehouse_id, roll.id);

                                                                            return (
                                                                                <div
                                                                                    key={roll.id}
                                                                                    className={cn(
                                                                                        "grid grid-cols-[auto_1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.9fr] items-center border-b last:border-b-0 text-xs transition-colors",
                                                                                        onOpenRoll ? "cursor-pointer" : "",
                                                                                        isPreferred
                                                                                            ? "bg-emerald-50/60 dark:bg-emerald-900/15 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/25"
                                                                                            : "hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10"
                                                                                    )}
                                                                                    onClick={() => onOpenRoll?.(roll)}
                                                                                >
                                                                                    {/* Preferred Toggle */}
                                                                                    <div className="px-2 py-2 text-center w-10">
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger asChild>
                                                                                                <button
                                                                                                    className={cn(
                                                                                                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                                                                                        roll.available_length <= 0 && "opacity-30 cursor-not-allowed",
                                                                                                        isPreferred
                                                                                                            ? "bg-emerald-500 text-white shadow-sm scale-110"
                                                                                                            : "border border-gray-300 dark:border-gray-600 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50"
                                                                                                    )}
                                                                                                    disabled={roll.available_length <= 0}
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleToggleRoll(record, roll);
                                                                                                    }}
                                                                                                >
                                                                                                    {isPreferred
                                                                                                        ? <Check className="w-3.5 h-3.5" />
                                                                                                        : <Heart className="w-3 h-3" />}
                                                                                                </button>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                                                                                                {roll.available_length <= 0
                                                                                                    ? t('غير متاح', 'Not available')
                                                                                                    : isPreferred
                                                                                                        ? t('إلغاء التفضيل', 'Remove preference')
                                                                                                        : t('تفضيل هذا الرولون (اقتراح لأمين المستودع)', 'Prefer this roll (suggestion for warehouse keeper)')}
                                                                                            </TooltipContent>
                                                                                        </Tooltip>
                                                                                    </div>

                                                                                    {/* Roll Number + Color */}
                                                                                    <div className="px-3 py-2 flex items-center gap-1.5">
                                                                                        <Scroll className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                                                                        <button
                                                                                            className={cn(
                                                                                                "font-mono font-medium hover:underline transition-colors group flex items-center gap-1",
                                                                                                onOpenRoll ? "cursor-pointer hover:text-amber-600 dark:hover:text-amber-400" : "cursor-default",
                                                                                                isPreferred ? "text-emerald-700 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"
                                                                                            )}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                onOpenRoll?.(roll);
                                                                                            }}
                                                                                            title={onOpenRoll ? (language === 'ar' ? 'فتح تفاصيل الرولون' : 'Open roll details') : undefined}
                                                                                        >
                                                                                            {roll.roll_number}
                                                                                            {onOpenRoll && (
                                                                                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                                                                                            )}
                                                                                        </button>
                                                                                        {isPreferred && (
                                                                                            <Badge className="text-[9px] h-4 px-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40">
                                                                                                {t('مفضل', '★')}
                                                                                            </Badge>
                                                                                        )}
                                                                                        {/* ─── Color badge ─── */}
                                                                                        {roll.color_hex && (
                                                                                            <div className="flex items-center gap-1 ms-1">
                                                                                                <div
                                                                                                    className="w-3 h-3 rounded-full border border-white dark:border-gray-700 shadow-sm flex-shrink-0"
                                                                                                    style={{ backgroundColor: roll.color_hex }}
                                                                                                    title={isRTL ? roll.color_name_ar : (roll.color_name_en || roll.color_name_ar)}
                                                                                                />
                                                                                                <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                                                                                                    {isRTL ? roll.color_name_ar : (roll.color_name_en || roll.color_name_ar)}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* 📍 Storage Location */}
                                                                                    <div className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                                                                        {roll.bin_location_code ? (
                                                                                            <Tooltip>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-[10px] font-mono font-semibold text-violet-700 dark:text-violet-300 cursor-default">
                                                                                                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                                                                                        {roll.bin_location_code}
                                                                                                    </span>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent side="top" className="text-xs">
                                                                                                    {roll.bin_location_name || roll.bin_location_code}
                                                                                                </TooltipContent>
                                                                                            </Tooltip>
                                                                                        ) : (
                                                                                            <span className="text-gray-300 dark:text-gray-600 text-[10px]">—</span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Initial Length */}
                                                                                    <div className="px-3 py-2 text-end font-mono text-gray-500">
                                                                                        {roll.initial_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                                                    </div>

                                                                                    {/* Current Length + Usage Bar */}
                                                                                    <div className="px-3 py-2 text-end">
                                                                                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                                                                            {roll.current_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                                                        </span>
                                                                                        {usagePercent > 0 && (
                                                                                            <div className="mt-0.5 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={cn(
                                                                                                        "h-full rounded-full transition-all",
                                                                                                        usagePercent > 75 ? "bg-red-400" : usagePercent > 40 ? "bg-yellow-400" : "bg-green-400"
                                                                                                    )}
                                                                                                    style={{ width: `${100 - usagePercent}%` }}
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Available */}
                                                                                    <div className="px-3 py-2 text-end font-mono text-green-600 dark:text-green-400">
                                                                                        {roll.available_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                                                    </div>

                                                                                    {/* Reserved */}
                                                                                    <div className="px-3 py-2 text-end font-mono text-orange-600 dark:text-orange-400">
                                                                                        {roll.reserved_length.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                                                    </div>

                                                                                    {/* Status */}
                                                                                    <div className="px-3 py-2">
                                                                                        <StatusBadge
                                                                                            status={{
                                                                                                code: roll.status,
                                                                                                name_ar: rStatus.ar,
                                                                                                name_en: rStatus.en,
                                                                                                color: rStatus.color
                                                                                            } as any}
                                                                                            size="sm"
                                                                                        />
                                                                                    </div>

                                                                                    {/* Received Date */}
                                                                                    <div className="px-3 py-2 text-gray-500 text-[10px]">
                                                                                        {formatDate(roll.received_date || roll.created_at)}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ═══════════ Info Note ═══════════ */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">{t('ملاحظة', 'Note')}</p>
                        <p>
                            {t(
                                'اضغط على أيقونة السلة 🛒 بجوار المستودع لإضافة المادة للسلة وتحديد الكمية. يمكنك أيضاً تحديد رولونات مفضلة ♥ كاقتراح لأمين المستودع. القرار النهائي لاختيار الرولونات يعود لأمين المستودع عند إذن التسليم.',
                                'Click the cart icon 🛒 next to a warehouse to add material and set quantity. You can also mark preferred rolls ♥ as suggestions for the warehouse keeper. Final roll selection is decided by the warehouse keeper at delivery.'
                            )}
                        </p>
                    </div>
                </div>

                {/* ═══════════ AddToCartDialog ═══════════ */}
                {cartDialogRecord && (
                    <AddToCartDialog
                        open={cartDialogOpen}
                        onClose={() => {
                            setCartDialogOpen(false);
                            setCartDialogRecord(null);
                        }}
                        onOpenCart={handleOpenCartFromDialog}
                        material={{
                            id: data?.id || '',
                            name_ar: data?.name_ar || data?.name || '',
                            name_en: data?.name_en || '',
                            name: data?.name || '',
                            code: data?.code || '',
                            price: data?.price || 0,
                            unit: data?.unit || 'meter',
                            currency: data?.currency || 'SAR',
                        }}
                        warehouse={{
                            id: cartDialogRecord.warehouse_id,
                            name_ar: cartDialogRecord.warehouse_name_ar,
                            name_en: cartDialogRecord.warehouse_name_en,
                            available_length: cartDialogRecord.available_length,
                        }}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}

// ════════════════════════════════════════════════════
// Summary Card Sub-component
// ════════════════════════════════════════════════════

function SummaryCard({ label, value, icon, color }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: 'indigo' | 'blue' | 'green' | 'orange';
}) {
    const colorMap = {
        indigo: {
            border: 'border-indigo-200 dark:border-indigo-800',
            bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
            text: 'text-indigo-600 dark:text-indigo-400',
            value: 'text-indigo-700 dark:text-indigo-300',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        },
        blue: {
            border: 'border-blue-200 dark:border-blue-800',
            bg: 'bg-blue-50/50 dark:bg-blue-900/10',
            text: 'text-blue-600 dark:text-blue-400',
            value: 'text-blue-700 dark:text-blue-300',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        },
        green: {
            border: 'border-green-200 dark:border-green-800',
            bg: 'bg-green-50/50 dark:bg-green-900/10',
            text: 'text-green-600 dark:text-green-400',
            value: 'text-green-700 dark:text-green-300',
            iconBg: 'bg-green-100 dark:bg-green-900/30',
        },
        orange: {
            border: 'border-orange-200 dark:border-orange-800',
            bg: 'bg-orange-50/50 dark:bg-orange-900/10',
            text: 'text-orange-600 dark:text-orange-400',
            value: 'text-orange-700 dark:text-orange-300',
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        },
    };
    const c = colorMap[color];

    return (
        <Card className={cn(c.border, c.bg)}>
            <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className={cn("text-xs font-medium mb-1", c.text)}>{label}</p>
                        <p className={cn("text-xl font-bold font-mono", c.value)}>{value}</p>
                    </div>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", c.iconBg, c.text)}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
