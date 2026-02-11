/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Inventory Page - Real Data Version
 * صفحة المخزون - بيانات حقيقية
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ عرض حالة المخزون بشكل شامل
 * - Stock levels by warehouse
 * - Movement history
 * - Valuation summary
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useInventory } from '../hooks/useWarehouseQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Package,
    RefreshCw,
    Search,
    ArrowDownUp,
    TrendingUp,
    TrendingDown,
    Warehouse,
    Boxes,
    BarChart3,
    Download
} from 'lucide-react';

export default function InventoryPage() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    // ⚡ React Query: cached data, instant tab switching
    const { stats, movements, warehouseCapacity, loading, refetch: refetchInventory } = useInventory();

    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.inventory') || (language === 'ar' ? 'إدارة المخزون' : 'Inventory Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'مراقبة مستويات المخزون والحركات' : 'Monitor stock levels and movements'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={refetchInventory}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">{language === 'ar' ? 'تقرير' : 'Report'}</span>
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview" className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        {language === 'ar' ? 'نظرة عامة' : 'Overview'}
                    </TabsTrigger>
                    <TabsTrigger value="movements" className="gap-2">
                        <ArrowDownUp className="w-4 h-4" />
                        {language === 'ar' ? 'الحركات' : 'Movements'}
                    </TabsTrigger>
                    <TabsTrigger value="valuation" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        {language === 'ar' ? 'التقييم' : 'Valuation'}
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <Skeleton className="h-4 w-20 mb-2" />
                                        <Skeleton className="h-8 w-16" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <>
                                <Card className="bg-white dark:bg-slate-900">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{language === 'ar' ? 'المستودعات' : 'Warehouses'}</span>
                                            <Warehouse className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <p className="text-2xl font-bold font-mono mt-2">{stats?.totalWarehouses || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white dark:bg-slate-900">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{language === 'ar' ? 'المواد' : 'Materials'}</span>
                                            <Package className="w-4 h-4 text-green-500" />
                                        </div>
                                        <p className="text-2xl font-bold font-mono mt-2">{stats?.totalMaterials || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white dark:bg-slate-900">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{language === 'ar' ? 'الرولونات' : 'Rolls'}</span>
                                            <Boxes className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <p className="text-2xl font-bold font-mono mt-2">{stats?.totalRolls || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white dark:bg-slate-900">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{language === 'ar' ? 'نقص المخزون' : 'Low Stock'}</span>
                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                        </div>
                                        <p className="text-2xl font-bold font-mono mt-2 text-red-600">{stats?.lowStockItems || 0}</p>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Warehouse Capacity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-cairo flex items-center gap-2">
                                <Warehouse className="w-4 h-4" />
                                {language === 'ar' ? 'سعة المستودعات' : 'Warehouse Capacity'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-8 w-full" />
                                    ))}
                                </div>
                            ) : warehouseCapacity.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {language === 'ar' ? 'لا توجد مستودعات' : 'No warehouses'}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {warehouseCapacity.map((wh) => (
                                        <div key={wh.id} className="flex items-center gap-4">
                                            <span className="text-sm min-w-[120px]">{wh.name}</span>
                                            <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                                                <div
                                                    className={`h-full rounded-full transition-all ${wh.percentage > 80 ? 'bg-red-500' : wh.percentage > 60 ? 'bg-amber-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(wh.percentage, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-mono w-12 text-end">{wh.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Movements Tab */}
                <TabsContent value="movements" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-cairo flex items-center gap-2">
                                <ArrowDownUp className="w-4 h-4" />
                                {language === 'ar' ? 'آخر الحركات' : 'Recent Movements'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : movements.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ArrowDownUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>{language === 'ar' ? 'لا توجد حركات مسجلة' : 'No movements recorded'}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {movements.map((mov) => (
                                        <div key={mov.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mov.movement_type === 'in' ? 'bg-green-100 text-green-600' :
                                                    mov.movement_type === 'out' ? 'bg-red-100 text-red-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {mov.movement_type === 'in' ? <TrendingUp className="w-4 h-4" /> :
                                                        mov.movement_type === 'out' ? <TrendingDown className="w-4 h-4" /> :
                                                            <ArrowDownUp className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{mov.movement_type}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(mov.movement_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline">{mov.quantity}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Valuation Tab */}
                <TabsContent value="valuation" className="space-y-4">
                    <Card>
                        <CardContent className="py-16 text-center">
                            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-cairo font-bold text-gray-600 dark:text-gray-300 mb-2">
                                {language === 'ar' ? 'تقييم المخزون' : 'Inventory Valuation'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {language === 'ar'
                                    ? 'سيتم عرض تقييم المخزون والقيمة الإجمالية بناءً على طريقة التكلفة المحددة'
                                    : 'Inventory valuation and total value will be displayed based on the selected costing method'}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
