/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Material Movements Tab - Unified
 * تبويب الحركات الموحد للمادة
 * يشمل: مبيعات، مشتريات، مناقلات، تسويات، مرتجعات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Calendar,
    Filter,
    ShoppingCart,
    Package,
    RotateCcw,
    ClipboardCheck,
    PackagePlus,
    PackageMinus,
    Search,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Movement Types ─────────────────────────────────────────
type MovementType = 'all' | 'sale' | 'purchase' | 'transfer' | 'adjustment' | 'sales_return' | 'purchase_return' | 'in' | 'out';

interface StockMovement {
    id: string;
    date: string;
    type: MovementType;
    reference: string;
    counterparty?: string; // customer or supplier name
    warehouse_from?: string;
    warehouse_to?: string;
    quantity: number;
    unit_price?: number;
    total_value?: number;
    notes?: string;
    status?: string;
    created_by: string;
}

interface MaterialMovementsTabProps {
    data: any;
}

// ─── Movement Type Config ────────────────────────────────────
const getMovementTypeConfig = (language: string) => ({
    all: {
        label: language === 'ar' ? 'الكل' : 'All',
        icon: Filter,
        color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
        activeColor: 'bg-gray-700 text-white border-gray-700 dark:bg-gray-200 dark:text-gray-900',
        badgeColor: 'bg-gray-200 text-gray-700',
    },
    sale: {
        label: language === 'ar' ? 'مبيعات' : 'Sales',
        icon: ShoppingCart,
        color: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400',
        activeColor: 'bg-green-600 text-white border-green-600',
        badgeColor: 'bg-green-100 text-green-800',
    },
    purchase: {
        label: language === 'ar' ? 'مشتريات' : 'Purchases',
        icon: Package,
        color: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400',
        activeColor: 'bg-blue-600 text-white border-blue-600',
        badgeColor: 'bg-blue-100 text-blue-800',
    },
    transfer: {
        label: language === 'ar' ? 'مناقلات' : 'Transfers',
        icon: ArrowRightLeft,
        color: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400',
        activeColor: 'bg-purple-600 text-white border-purple-600',
        badgeColor: 'bg-purple-100 text-purple-800',
    },
    adjustment: {
        label: language === 'ar' ? 'تسويات' : 'Adjustments',
        icon: ClipboardCheck,
        color: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400',
        activeColor: 'bg-amber-600 text-white border-amber-600',
        badgeColor: 'bg-amber-100 text-amber-800',
    },
    sales_return: {
        label: language === 'ar' ? 'مرتجع مبيعات' : 'Sales Returns',
        icon: RotateCcw,
        color: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400',
        activeColor: 'bg-orange-600 text-white border-orange-600',
        badgeColor: 'bg-orange-100 text-orange-800',
    },
    purchase_return: {
        label: language === 'ar' ? 'مرتجع مشتريات' : 'Purchase Returns',
        icon: RotateCcw,
        color: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/20 dark:text-rose-400',
        activeColor: 'bg-rose-600 text-white border-rose-600',
        badgeColor: 'bg-rose-100 text-rose-800',
    },
    in: {
        label: language === 'ar' ? 'إدخال' : 'Stock In',
        icon: PackagePlus,
        color: 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/20 dark:text-teal-400',
        activeColor: 'bg-teal-600 text-white border-teal-600',
        badgeColor: 'bg-teal-100 text-teal-800',
    },
    out: {
        label: language === 'ar' ? 'إخراج' : 'Stock Out',
        icon: PackageMinus,
        color: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400',
        activeColor: 'bg-red-600 text-white border-red-600',
        badgeColor: 'bg-red-100 text-red-800',
    },
});

// ─── Sample Data ─────────────────────────────────────────────
const generateSampleMovements = (language: string): StockMovement[] => [
    // Sales
    {
        id: 'MOV-001', date: '2024-02-05T10:30:00Z', type: 'sale',
        reference: 'INV-2024-045',
        counterparty: language === 'ar' ? 'شركة النسيج المتحدة' : 'United Textile Co.',
        warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: -150, unit_price: 25, total_value: 3750,
        status: 'delivered', created_by: 'أحمد',
    },
    {
        id: 'MOV-002', date: '2024-02-01T09:15:00Z', type: 'sale',
        reference: 'INV-2024-038',
        counterparty: language === 'ar' ? 'مصنع الأزياء الحديثة' : 'Modern Fashion Factory',
        warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: -200, unit_price: 22, total_value: 4400,
        status: 'delivered', created_by: 'محمد',
    },
    // Purchases
    {
        id: 'MOV-003', date: '2024-02-03T14:20:00Z', type: 'purchase',
        reference: 'PO-2024-018',
        counterparty: language === 'ar' ? 'مصنع الأقمشة التركية' : 'Turkish Fabric Mill',
        warehouse_to: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: 500, unit_price: 15.5, total_value: 7750,
        status: 'received', created_by: 'خالد',
    },
    {
        id: 'MOV-004', date: '2024-01-25T11:00:00Z', type: 'purchase',
        reference: 'PO-2024-014',
        counterparty: language === 'ar' ? 'شركة القطن المصرية' : 'Egyptian Cotton Co.',
        warehouse_to: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse',
        quantity: 300, unit_price: 14.8, total_value: 4440,
        status: 'received', created_by: 'خالد',
    },
    // Transfers
    {
        id: 'MOV-005', date: '2024-01-30T08:45:00Z', type: 'transfer',
        reference: 'TR-2024-007',
        warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        warehouse_to: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse',
        quantity: 100, notes: language === 'ar' ? 'نقل داخلي لتغطية الطلب' : 'Internal transfer to cover demand',
        status: 'completed', created_by: 'سعيد',
    },
    {
        id: 'MOV-006', date: '2024-01-22T16:30:00Z', type: 'transfer',
        reference: 'TR-2024-005',
        warehouse_from: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse',
        warehouse_to: language === 'ar' ? 'مستودع المصنع' : 'Factory Warehouse',
        quantity: 50, notes: language === 'ar' ? 'تحويل للإنتاج' : 'Transfer for production',
        status: 'completed', created_by: 'سعيد',
    },
    // Adjustments
    {
        id: 'MOV-007', date: '2024-01-28T13:00:00Z', type: 'adjustment',
        reference: 'ADJ-2024-003',
        warehouse_to: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: 25, notes: language === 'ar' ? 'تسوية جرد - فائض' : 'Stock count - surplus',
        status: 'approved', created_by: 'عمر',
    },
    {
        id: 'MOV-008', date: '2024-01-15T10:00:00Z', type: 'adjustment',
        reference: 'ADJ-2024-001',
        warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: -10, notes: language === 'ar' ? 'تسوية جرد - نقص' : 'Stock count - shortage',
        status: 'approved', created_by: 'عمر',
    },
    // Sales Returns
    {
        id: 'MOV-009', date: '2024-01-27T11:30:00Z', type: 'sales_return',
        reference: 'RET-S-2024-002',
        counterparty: language === 'ar' ? 'دار الخياطة الفاخرة' : 'Luxury Tailoring',
        warehouse_to: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: 20, unit_price: 25, total_value: 500,
        notes: language === 'ar' ? 'مرتجع - عيب تصنيع' : 'Return - manufacturing defect',
        status: 'received', created_by: 'أحمد',
    },
    // Purchase Returns
    {
        id: 'MOV-010', date: '2024-01-20T09:45:00Z', type: 'purchase_return',
        reference: 'RET-P-2024-001',
        counterparty: language === 'ar' ? 'مصنع الأقمشة التركية' : 'Turkish Fabric Mill',
        warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: -30, unit_price: 15.5, total_value: 465,
        notes: language === 'ar' ? 'إرجاع - لون مخالف للمواصفات' : 'Return - color mismatch',
        status: 'returned', created_by: 'خالد',
    },
    // Stock In
    {
        id: 'MOV-011', date: '2024-01-18T12:00:00Z', type: 'in',
        reference: 'GRN-2024-012',
        warehouse_to: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
        quantity: 200, unit_price: 15, total_value: 3000,
        notes: language === 'ar' ? 'استلام بضاعة من الشحنة رقم SH-045' : 'Goods receipt from shipment SH-045',
        status: 'confirmed', created_by: 'محمد',
    },
    // Stock Out
    {
        id: 'MOV-012', date: '2024-01-12T15:30:00Z', type: 'out',
        reference: 'DN-2024-008',
        warehouse_from: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse',
        quantity: -80, unit_price: 25, total_value: 2000,
        notes: language === 'ar' ? 'إذن صرف للقسم الإنتاج' : 'Issue note for production dept',
        status: 'issued', created_by: 'سعيد',
    },
];

// ─── Component ───────────────────────────────────────────────
export function MaterialMovementsTab({ data }: MaterialMovementsTabProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<MovementType>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const typeConfig = useMemo(() => getMovementTypeConfig(language), [language]);

    // Load sample data
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setMovements(generateSampleMovements(language));
            setLoading(false);
        }, 300);
    }, [language]);

    // Filter movements
    const filteredMovements = useMemo(() => {
        let result = movements;

        // Type filter
        if (activeFilter !== 'all') {
            result = result.filter(m => m.type === activeFilter);
        }

        // Date filters
        if (dateFrom) {
            result = result.filter(m => m.date >= dateFrom);
        }
        if (dateTo) {
            result = result.filter(m => m.date <= dateTo + 'T23:59:59Z');
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.reference.toLowerCase().includes(q) ||
                m.counterparty?.toLowerCase().includes(q) ||
                m.notes?.toLowerCase().includes(q) ||
                m.warehouse_from?.toLowerCase().includes(q) ||
                m.warehouse_to?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [movements, activeFilter, dateFrom, dateTo, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const totalIn = filteredMovements.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
        const totalOut = filteredMovements.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);
        const totalValue = filteredMovements.reduce((s, m) => s + (m.total_value || 0), 0);
        return { totalIn, totalOut, net: totalIn - totalOut, totalValue, count: filteredMovements.length };
    }, [filteredMovements]);

    // Type counts for badges
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: movements.length };
        movements.forEach(m => { counts[m.type] = (counts[m.type] || 0) + 1; });
        return counts;
    }, [movements]);

    // Filter types to show (only those with data + 'all')
    const filterTypes: MovementType[] = ['all', 'sale', 'purchase', 'transfer', 'adjustment', 'sales_return', 'purchase_return', 'in', 'out'];

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; color: string; bg: string }> = {
            delivered: { label: language === 'ar' ? 'تم التسليم' : 'Delivered', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            received: { label: language === 'ar' ? 'تم الاستلام' : 'Received', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            completed: { label: language === 'ar' ? 'مكتمل' : 'Completed', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            approved: { label: language === 'ar' ? 'معتمد' : 'Approved', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
            confirmed: { label: language === 'ar' ? 'مؤكد' : 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
            pending: { label: language === 'ar' ? 'قيد الانتظار' : 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            returned: { label: language === 'ar' ? 'تم الإرجاع' : 'Returned', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
            issued: { label: language === 'ar' ? 'تم الصرف' : 'Issued', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
        };
        const c = config[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };
        return (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', c.bg, c.color)}>
                {c.label}
            </span>
        );
    };

    const clearFilters = () => {
        setActiveFilter('all');
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
    };

    const hasActiveFilters = activeFilter !== 'all' || dateFrom || dateTo || searchQuery;

    return (
        <div className="space-y-5 pb-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ─── Summary Stats ───────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <p className="text-xs text-green-600 dark:text-green-400">
                                {language === 'ar' ? 'إجمالي الوارد' : 'Total In'}
                            </p>
                        </div>
                        <p className="text-xl font-bold text-green-800 dark:text-green-200">{stats.totalIn.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/20 dark:border-red-800">
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {language === 'ar' ? 'إجمالي الصادر' : 'Total Out'}
                            </p>
                        </div>
                        <p className="text-xl font-bold text-red-800 dark:text-red-200">{stats.totalOut.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className={cn(
                    "dark:border-gray-700",
                    stats.net >= 0 ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/20" : "border-orange-200 bg-orange-50/50 dark:bg-orange-900/20"
                )}>
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                {language === 'ar' ? 'صافي الحركة' : 'Net Movement'}
                            </p>
                        </div>
                        <p className={cn("text-xl font-bold", stats.net >= 0 ? "text-blue-800 dark:text-blue-200" : "text-orange-800 dark:text-orange-200")}>
                            {stats.net >= 0 ? '+' : ''}{stats.net.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-800">
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Filter className="w-4 h-4 text-purple-600" />
                            <p className="text-xs text-purple-600 dark:text-purple-400">
                                {language === 'ar' ? 'عدد الحركات' : 'Movements'}
                            </p>
                        </div>
                        <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{stats.count}</p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Filter Chips ────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col gap-3">
                        {/* Type filters */}
                        <div className="flex flex-wrap gap-2">
                            {filterTypes.map(type => {
                                const config = typeConfig[type];
                                if (!config) return null;
                                const count = typeCounts[type] || 0;
                                if (type !== 'all' && count === 0) return null;
                                const isActive = activeFilter === type;
                                const Icon = config.icon;

                                return (
                                    <button
                                        key={type}
                                        onClick={() => setActiveFilter(type)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                                            "hover:shadow-sm active:scale-95",
                                            isActive ? config.activeColor : config.color
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{config.label}</span>
                                        <span className={cn(
                                            "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold",
                                            isActive ? "bg-white/30 text-current" : config.badgeColor
                                        )}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search & Date filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className={cn("w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-3" : "left-3")} />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={language === 'ar' ? 'بحث بالمرجع أو الاسم...' : 'Search by reference or name...'}
                                    className={cn("h-9 text-sm", isRTL ? "pr-9" : "pl-9")}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Calendar className={cn("w-3.5 h-3.5 text-gray-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-2.5" : "left-2.5")} />
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className={cn("h-9 text-xs w-36", isRTL ? "pr-8" : "pl-8")}
                                        placeholder={language === 'ar' ? 'من' : 'From'}
                                    />
                                </div>
                                <span className="text-gray-400 text-xs">→</span>
                                <div className="relative">
                                    <Calendar className={cn("w-3.5 h-3.5 text-gray-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-2.5" : "left-2.5")} />
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        className={cn("h-9 text-xs w-36", isRTL ? "pr-8" : "pl-8")}
                                        placeholder={language === 'ar' ? 'إلى' : 'To'}
                                    />
                                </div>
                            </div>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-red-500 hover:text-red-700">
                                    <X className="w-3.5 h-3.5 me-1" />
                                    {language === 'ar' ? 'مسح الفلاتر' : 'Clear'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Movements Table ─────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ArrowRightLeft className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'سجل الحركات' : 'Movement Log'}
                        <Badge variant="secondary" className="text-xs">
                            {filteredMovements.length} {language === 'ar' ? 'حركة' : 'entries'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-3 border-erp-teal border-t-transparent rounded-full" />
                        </div>
                    ) : filteredMovements.length === 0 ? (
                        <div className="text-center py-12">
                            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">
                                {language === 'ar' ? 'لا توجد حركات مطابقة للفلاتر' : 'No movements match the filters'}
                            </p>
                            {hasActiveFilters && (
                                <Button variant="link" onClick={clearFilters} className="mt-2 text-erp-teal">
                                    {language === 'ar' ? 'مسح جميع الفلاتر' : 'Clear all filters'}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>#</th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                                            {language === 'ar' ? 'التاريخ' : 'Date'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                                            {language === 'ar' ? 'النوع' : 'Type'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                                            {language === 'ar' ? 'المرجع' : 'Reference'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                                            {language === 'ar' ? 'الطرف المقابل' : 'Counterparty'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                                            {language === 'ar' ? 'من / إلى' : 'From / To'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-center")}>
                                            {language === 'ar' ? 'الكمية' : 'Qty'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-center")}>
                                            {language === 'ar' ? 'القيمة' : 'Value'}
                                        </th>
                                        <th className={cn("py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-center")}>
                                            {language === 'ar' ? 'الحالة' : 'Status'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMovements.map((mov, idx) => {
                                        const tc = typeConfig[mov.type];
                                        const TypeIcon = tc?.icon || Filter;
                                        return (
                                            <tr
                                                key={mov.id}
                                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
                                                <td className="py-3 px-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                                                    {new Date(mov.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                                    })}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                                                        tc?.color || 'bg-gray-50 text-gray-600 border-gray-200'
                                                    )}>
                                                        <TypeIcon className="w-3 h-3" />
                                                        {tc?.label || mov.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 font-mono text-xs font-semibold text-erp-navy dark:text-white group-hover:text-erp-teal transition-colors">
                                                    {mov.reference}
                                                </td>
                                                <td className="py-3 px-3 text-gray-800 dark:text-gray-200 text-xs">
                                                    {mov.counterparty || '—'}
                                                </td>
                                                <td className="py-3 px-3 text-xs text-gray-500">
                                                    {mov.warehouse_from && mov.warehouse_to ? (
                                                        <span className="flex items-center gap-1">
                                                            <span>{mov.warehouse_from}</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span>{mov.warehouse_to}</span>
                                                        </span>
                                                    ) : (
                                                        mov.warehouse_from || mov.warehouse_to || '—'
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={cn(
                                                        "font-semibold text-sm",
                                                        mov.quantity > 0
                                                            ? "text-green-600 dark:text-green-400"
                                                            : "text-red-600 dark:text-red-400"
                                                    )}>
                                                        {mov.quantity > 0 ? '+' : ''}{mov.quantity.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {mov.total_value ? `$${mov.total_value.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {mov.status ? getStatusBadge(mov.status) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Info Note ──────────────────────────────── */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2.5">
                <ArrowRightLeft className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    {language === 'ar'
                        ? 'يعرض هذا التبويب جميع حركات المادة: مبيعات، مشتريات، مناقلات، تسويات جرد، ومرتجعات. استخدم الفلاتر لتصفية النتائج حسب النوع أو التاريخ.'
                        : 'This tab shows all material movements: sales, purchases, transfers, stock adjustments, and returns. Use the filters to narrow results by type or date.'}
                </p>
            </div>
        </div>
    );
}

export default MaterialMovementsTab;
