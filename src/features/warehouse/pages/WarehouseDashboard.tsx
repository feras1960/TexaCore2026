/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Dashboard - Real Data Version
 * لوحة تحكم المستودعات - بيانات حقيقية
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ يستخدم بيانات حقيقية من warehouseService:
 * - getDashboardStats() - الإحصائيات
 * - getLowStockItems() - تنبيهات نقص المخزون
 * - getPendingTransfers() - التحويلات المعلقة
 * - getWarehouseCapacity() - سعة المستودعات
 * - getInventoryMovements() - آخر النشاطات
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useWarehouseDashboard } from '../hooks/useWarehouseQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Warehouse,
    Package,
    Boxes,
    TrendingUp,
    AlertTriangle,
    Calendar,
    Truck,
    Activity,
    Plus,
    RefreshCw,
    ArrowRightLeft,
    Clock,
    Layers,
    FileText,
    ClipboardCheck,
    Settings2
} from 'lucide-react';

// Types for real data
interface DashboardStats {
    totalWarehouses: number;
    totalMaterials: number;
    totalRolls: number;
    activeReservations: number;
    pendingDeliveries: number;
    lowStockItems: number;
}

interface LowStockItem {
    id: string;
    roll_number: string;
    current_length: number;
    material?: {
        id: string;
        name_ar: string;
        name_en: string;
    };
    warehouse?: {
        id: string;
        name_ar: string;
    };
}

interface PendingTransfer {
    id: string;
    from_warehouse?: { id: string; name_ar: string };
    to_warehouse?: { id: string; name_ar: string };
    quantity: number;
    created_at: string;
}

interface WarehouseCapacity {
    id: string;
    name: string;
    usedCapacity: number;
    totalCapacity: number;
    percentage: number;
}

interface InventoryMovement {
    id: string;
    movement_type: string;
    movement_date: string;
    roll?: { id: string; roll_number: string };
    warehouse?: { id: string; name_ar: string };
}

export default function WarehouseDashboard() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    // ⚡ React Query: all dashboard data cached & managed
    const {
        stats,
        lowStockItems,
        warehouseCapacity,
        recentActivity,
        loading,
        error,
        refetch: refetchDashboard,
    } = useWarehouseDashboard();

    // Pending transfers placeholder (not implemented yet in service)
    const pendingTransfers: PendingTransfer[] = [];

    // Loading skeleton
    const StatSkeleton = () => (
        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-slate-700">
            <Skeleton className="w-5 h-5 rounded" />
            <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-6 w-16" />
            </div>
        </div>
    );

    const CardSkeleton = () => (
        <Card className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-8 w-16 mt-2" />
                <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header with Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                    {t('warehouse.dashboard.title') || (language === 'ar' ? 'لوحة المستودعات' : 'Warehouse Dashboard')}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Refresh */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={refetchDashboard}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                    </Button>

                    {/* Settings */}
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Settings2 className="w-5 h-5" />
                        <span className="hidden md:inline">{language === 'ar' ? 'تخصيص' : 'Customize'}</span>
                    </Button>

                    {/* Quick Actions */}
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Truck className="w-5 h-5" />
                        <span className="hidden md:inline">{language === 'ar' ? 'استلام' : 'Receive'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <FileText className="w-5 h-5" />
                        <span className="hidden md:inline">{language === 'ar' ? 'تسليم' : 'Dispatch'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <ArrowRightLeft className="w-5 h-5" />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحويل' : 'Transfer'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <ClipboardCheck className="w-5 h-5" />
                        <span className="hidden md:inline">{language === 'ar' ? 'جرد' : 'Audit'}</span>
                    </Button>

                    {/* Add Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90">
                                <Plus className="w-5 h-5" />
                                {language === 'ar' ? 'إضافة' : 'Add'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2">
                                <Package className="w-4 h-4" />
                                {language === 'ar' ? 'مادة جديدة' : 'New Material'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                                <Layers className="w-4 h-4" />
                                {language === 'ar' ? 'مجموعة جديدة' : 'New Category'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                                <Warehouse className="w-4 h-4" />
                                {language === 'ar' ? 'مستودع جديد' : 'New Warehouse'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={refetchDashboard}>
                        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </Button>
                </div>
            )}

            {/* Unified Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800">
                {loading ? (
                    <>
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                    </>
                ) : stats && (
                    <>
                        {/* Total Materials */}
                        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-slate-700">
                            <Package className="w-5 h-5 text-blue-500/70" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'إجمالي المواد' : 'Total Materials'}</p>
                                <p className="font-mono text-xl font-bold text-erp-navy dark:text-white">
                                    {stats.totalMaterials.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Total Rolls */}
                        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-slate-700">
                            <Boxes className="w-5 h-5 text-purple-500/70" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الرولونات' : 'Rolls'}</p>
                                <p className="font-mono text-xl font-bold text-erp-navy dark:text-white">
                                    {stats.totalRolls.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Active Reservations */}
                        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-slate-700">
                            <Calendar className="w-5 h-5 text-orange-500/70" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'حجوزات نشطة' : 'Active Reservations'}</p>
                                <p className="font-mono text-xl font-bold text-erp-navy dark:text-white">
                                    {stats.activeReservations}
                                </p>
                            </div>
                        </div>

                        {/* Low Stock Alerts */}
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500/70" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'تنبيهات نقص' : 'Low Stock'}</p>
                                <p className={`font-mono text-xl font-bold ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {stats.lowStockItems}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {loading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : stats && (
                    <>
                        {/* Warehouses */}
                        <Card className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {language === 'ar' ? 'المستودعات' : 'Warehouses'}
                                    </span>
                                    <Warehouse className="w-4 h-4 text-blue-500" />
                                </div>
                                <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white mt-2">
                                    {stats.totalWarehouses}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-[10px] text-gray-400">{language === 'ar' ? 'نشط' : 'Active'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total Rolls */}
                        <Card className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {language === 'ar' ? 'الرولونات' : 'Rolls'}
                                    </span>
                                    <Boxes className="w-4 h-4 text-purple-500" />
                                </div>
                                <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white mt-2">
                                    {stats.totalRolls.toLocaleString()}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Active Reservations */}
                        <Card className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {language === 'ar' ? 'حجوزات نشطة' : 'Active Reservations'}
                                    </span>
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                </div>
                                <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white mt-2">
                                    {stats.activeReservations}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Pending Deliveries */}
                        <Card className="bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {language === 'ar' ? 'تسليمات معلقة' : 'Pending Deliveries'}
                                    </span>
                                    <Truck className="w-4 h-4 text-cyan-500" />
                                </div>
                                <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white mt-2">
                                    {stats.pendingDeliveries}
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Low Stock Alerts */}
                <Card className="lg:col-span-1 border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
                        <CardTitle className="font-cairo text-base text-erp-navy dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            {language === 'ar' ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts'}
                            {!loading && (
                                <Badge variant="destructive" className="text-[10px] h-5 ms-auto">
                                    {lowStockItems.length}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : lowStockItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                <p className="text-sm">{language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {lowStockItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-800">
                                        <div>
                                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                                {item.material?.name_ar || item.roll_number}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-mono">{item.roll_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-red-600">{item.current_length}m</span>
                                            <span className="text-[10px] text-gray-400 block">{item.warehouse?.name_ar}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Transfers */}
                <Card className="lg:col-span-1 border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
                        <CardTitle className="font-cairo text-base text-erp-navy dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {language === 'ar' ? 'التحويلات المعلقة' : 'Pending Transfers'}
                            {!loading && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 ms-auto">
                                    {pendingTransfers.length}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : pendingTransfers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">{language === 'ar' ? 'لا توجد تحويلات معلقة' : 'No pending transfers'}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pendingTransfers.map((transfer) => (
                                    <div key={transfer.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded-md border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/20 cursor-pointer transition-colors">
                                        <div>
                                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                                {transfer.from_warehouse?.name_ar} → {transfer.to_warehouse?.name_ar}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-mono">{transfer.id}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-amber-600">{transfer.quantity}</span>
                                            <span className="text-[10px] text-gray-400 block">
                                                {new Date(transfer.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Warehouse Capacity */}
                <Card className="lg:col-span-1 border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
                        <CardTitle className="font-cairo text-base text-erp-navy dark:text-white flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-blue-500" />
                            {language === 'ar' ? 'سعة المستودعات' : 'Warehouse Capacity'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : warehouseCapacity.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Warehouse className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">{language === 'ar' ? 'لا توجد مستودعات' : 'No warehouses'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {warehouseCapacity.map((wh) => (
                                    <div key={wh.id} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">{wh.name}</span>
                                            <span className="font-mono text-gray-500">{wh.percentage}%</span>
                                        </div>
                                        <Progress
                                            value={wh.percentage}
                                            className={`h-2 ${wh.percentage > 80 ? '[&>div]:bg-red-500' : wh.percentage > 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
                    <CardTitle className="font-cairo text-base text-erp-navy dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        {language === 'ar' ? 'آخر النشاطات' : 'Recent Activity'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <p>{language === 'ar' ? 'لا يوجد نشاط بعد' : 'No activity yet'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded-md">
                                    <div className="flex items-center gap-3">
                                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {activity.movement_type} - {activity.roll?.roll_number}
                                            </p>
                                            <p className="text-xs text-gray-500">{activity.warehouse?.name_ar}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(activity.movement_date).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
