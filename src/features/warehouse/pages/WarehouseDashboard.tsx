/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 WarehouseDashboard — لوحة المستودعات (Glass Design)
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Glass pattern — navy → orange gradient
 *   - Header with Quick Actions
 *   - 8 KPI glass cards
 *   - Low stock alerts + Pending transfers + Capacity
 *   - Recent activity + Realtime via useWarehouseDashboard
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
import { StatsGrid, StatCard } from '@/components/shared/stats/StatCard';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Warehouse, Package, Boxes, TrendingUp, AlertTriangle,
    Calendar, Truck, Activity, Plus, ArrowRightLeft, Clock,
    Layers, FileText, ClipboardCheck, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingTransfer {
    id: string;
    from_warehouse?: { id: string; name_ar: string };
    to_warehouse?: { id: string; name_ar: string };
    quantity: number;
    created_at: string;
}

export default function WarehouseDashboard() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    const {
        stats, lowStockItems, warehouseCapacity, recentActivity,
        loading, error, refetch: refetchDashboard,
    } = useWarehouseDashboard();

    const pendingTransfers: PendingTransfer[] = [];

    // Loading
    if (loading) {
        return (
            <div className="space-y-6" dir={direction}>
                <div className="bg-gradient-to-r from-erp-navy via-orange-800 to-erp-navy p-6 rounded-2xl animate-pulse h-24" />
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir={direction}>
            {/* ─ Header — Glass Gradient (Navy → Orange) ── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-orange-800 to-erp-navy p-6 rounded-2xl shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-400/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-400/10 blur-2xl" />
                <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <Warehouse className="w-6 h-6 text-orange-300" />
                            </div>
                            <h1 className="text-2xl font-bold text-white font-cairo">
                                {t('warehouse.dashboard.title')}
                            </h1>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE
                            </span>
                        </div>
                        <p className="text-sm text-orange-200/80 font-tajawal ps-12">
                            {t('warehouse.dashboard.subtitle')}
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <Truck className="w-3.5 h-3.5 me-1.5" />
                            {t('warehouse.dashboard.receive')}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <FileText className="w-3.5 h-3.5 me-1.5" />
                            {t('warehouse.dashboard.dispatch')}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <ArrowRightLeft className="w-3.5 h-3.5 me-1.5" />
                            {t('warehouse.dashboard.transfer')}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <ClipboardCheck className="w-3.5 h-3.5 me-1.5" />
                            {t('warehouse.dashboard.audit')}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="bg-orange-500/80 hover:bg-orange-500 border-0 text-white text-xs">
                                    <Plus className="w-3.5 h-3.5 me-1.5" />
                                    {t('warehouse.dashboard.add')}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="gap-2">
                                    <Package className="w-4 h-4" />
                                    {t('warehouse.dashboard.newMaterial')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                    <Layers className="w-4 h-4" />
                                    {t('warehouse.dashboard.newCategory')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                    <Warehouse className="w-4 h-4" />
                                    {t('warehouse.dashboard.newWarehouse')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={refetchDashboard}>
                        {t('warehouse.dashboard.retry')}
                    </Button>
                </div>
            )}

            {/* ─ KPIs Row 1 — Inventory (Glass) ── */}
            {stats && (
                <>
                    <StatsGrid cols={4}>
                        <StatCard
                            label={t('warehouse.dashboard.totalMaterials')}
                            value={stats.totalMaterials}
                            type="info"
                            icon={Package}
                            className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                        <StatCard
                            label={t('warehouse.dashboard.totalRolls')}
                            value={stats.totalRolls}
                            type="neutral"
                            icon={Boxes}
                            className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                        <StatCard
                            label={t('warehouse.dashboard.totalWarehouses')}
                            value={stats.totalWarehouses}
                            type="positive"
                            icon={Warehouse}
                            className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                        <StatCard
                            label={t('warehouse.dashboard.lowStock')}
                            value={stats.lowStockItems}
                            type={stats.lowStockItems > 0 ? 'negative' : 'positive'}
                            icon={AlertTriangle}
                            className="bg-gradient-to-br from-red-50/80 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/20 backdrop-blur-sm border border-red-100/50 dark:border-red-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                    </StatsGrid>

                    <StatsGrid cols={4}>
                        <StatCard
                            label={t('warehouse.dashboard.activeReservations')}
                            value={stats.activeReservations}
                            type="warning"
                            icon={Calendar}
                            className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                        <StatCard
                            label={t('warehouse.dashboard.pendingDeliveries')}
                            value={stats.pendingDeliveries}
                            type="info"
                            icon={Truck}
                            className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/30 dark:to-cyan-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                        <StatCard
                            label={t('warehouse.dashboard.pendingTransfers')}
                            value={pendingTransfers.length}
                            type="neutral"
                            icon={ArrowRightLeft}
                            className="bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 backdrop-blur-sm border border-orange-100/50 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                        <StatCard
                            label={t('warehouse.dashboard.recentMovements')}
                            value={recentActivity.length}
                            type="neutral"
                            icon={Activity}
                            className="bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/30 dark:to-gray-950/20 backdrop-blur-sm border border-slate-100/50 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-all"
                        />
                    </StatsGrid>
                </>
            )}

            {/* ─ Main Content Grid (Glass) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Low Stock Alerts */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            {t('warehouse.dashboard.lowStockAlerts')}
                            <Badge variant="destructive" className="text-[10px] h-5 ms-auto">
                                {lowStockItems.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                            {lowStockItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                    <p className="text-sm font-tajawal">{t('warehouse.dashboard.noAlerts')}</p>
                                </div>
                            ) : (
                                lowStockItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                                                <Package className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-tajawal font-medium truncate">{item.material?.name_ar || item.roll_number}</p>
                                                <p className="text-[11px] text-gray-400 font-mono">{item.roll_number}</p>
                                            </div>
                                        </div>
                                        <div className="text-end shrink-0 ms-3">
                                            <span className="font-mono text-sm font-bold text-red-600">{item.current_length}m</span>
                                            <p className="text-[10px] text-gray-400 font-tajawal">{item.warehouse?.name_ar}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Transfers */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {t('warehouse.dashboard.pendingTransfers')}
                            <Badge variant="secondary" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-0 ms-auto">
                                {pendingTransfers.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                            {pendingTransfers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm font-tajawal">{t('warehouse.dashboard.noPendingTransfers')}</p>
                                </div>
                            ) : (
                                pendingTransfers.map((transfer) => (
                                    <div key={transfer.id} className="flex items-center justify-between px-5 py-3 hover:bg-amber-50/50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-tajawal font-medium">{transfer.from_warehouse?.name_ar} → {transfer.to_warehouse?.name_ar}</p>
                                            </div>
                                        </div>
                                        <div className="text-end shrink-0 ms-3">
                                            <span className="font-mono text-sm font-bold text-amber-600">{transfer.quantity}</span>
                                            <p className="text-[10px] text-gray-400 font-mono">{new Date(transfer.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Warehouse Capacity */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-orange-500" />
                            {t('warehouse.dashboard.warehouseCapacity')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        {warehouseCapacity.length === 0 ? (
                            <div className="text-center py-4 text-gray-400">
                                <Warehouse className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-tajawal">{t('warehouse.dashboard.noWarehouses')}</p>
                            </div>
                        ) : (
                            warehouseCapacity.map((wh) => (
                                <div key={wh.id} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400 font-tajawal">{wh.name}</span>
                                        <span className="font-mono text-xs text-gray-500">{wh.percentage}%</span>
                                    </div>
                                    <Progress
                                        value={wh.percentage}
                                        className={`h-2 ${wh.percentage > 80 ? '[&>div]:bg-red-500' : wh.percentage > 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                                    />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ─ Recent Activity (Glass) ── */}
            <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                    <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-500" />
                        {t('warehouse.dashboard.recentActivity')}
                    </CardTitle>
                    <Badge variant="secondary" className="text-[11px] font-mono bg-orange-50 text-orange-600 border-0">
                        {recentActivity.length}
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                        {recentActivity.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 font-tajawal">
                                {t('warehouse.dashboard.noActivity')}
                            </div>
                        ) : (
                            recentActivity.map((act) => (
                                <div key={act.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-tajawal font-medium">
                                                {act.movement_type} - {act.roll?.roll_number}
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-tajawal">{act.warehouse?.name_ar}</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-mono shrink-0">
                                        {new Date(act.movement_date).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
