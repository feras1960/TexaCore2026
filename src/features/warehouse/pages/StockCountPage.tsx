/**
 * ════════════════════════════════════════════════════════════════
 * 📋 Stock Count Page (الجرد المخزني)
 * ════════════════════════════════════════════════════════════════
 * 
 * Constitution-Compliant Implementation:
 * - Uses t('key') pattern from LanguageProvider
 * - Connects to warehouseService for real data
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    ClipboardCheck,
    ClipboardList,
    Calendar,
    Warehouse,
    Plus,
    Play,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Package,
    RefreshCw
} from 'lucide-react';

// Status colors
const statusColors: Record<string, string> = {
    'planned': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function StockCountPage() {
    const { t, language, isRTL } = useLanguage();
    const { companyId } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('all');
    const [stockCounts, setStockCounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load stock counts from database
    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [companyId]);

    const loadData = async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);
        try {
            const statusFilter = activeSubTab !== 'all' ? activeSubTab : undefined;
            const data = await warehouseService.getStockCounts(companyId, {
                status: statusFilter
            });
            setStockCounts(data);
        } catch (err) {
            console.error('Error loading stock counts:', err);
            setError(t('errors.network.loadFailed') || 'فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // Reload when tab changes
    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [activeSubTab]);

    // Format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
        } catch {
            return dateStr;
        }
    };

    // Get status label
    const getStatusLabel = (status: string) => {
        const key = `warehouse.stockCount.statuses.${status}`;
        const translated = t(key);
        return translated !== key ? translated : status;
    };

    // Calculate progress
    const getProgress = (counted: number, total: number) => {
        if (!total) return 0;
        return Math.round((counted / total) * 100);
    };

    // Filter counts by tab
    const filteredCounts = stockCounts.filter(sc => {
        if (activeSubTab === 'all') return true;
        return sc.status === activeSubTab;
    });

    // Stats
    const stats = {
        planned: stockCounts.filter(s => s.status === 'planned').length,
        inProgress: stockCounts.filter(s => s.status === 'in_progress').length,
        completed: stockCounts.filter(s => s.status === 'completed').length,
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header with action button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{t('warehouse.stockCount.title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('warehouse.stockCount.description')}</p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 me-2" />
                    {t('warehouse.stockCount.createCount')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('warehouse.stockCount.planned')}</p>
                                <p className="text-2xl font-bold font-mono">{stats.planned}</p>
                            </div>
                            <ClipboardList className="h-8 w-8 text-blue-500 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('warehouse.stockCount.inProgress')}</p>
                                <p className="text-2xl font-bold font-mono">{stats.inProgress}</p>
                            </div>
                            <Play className="h-8 w-8 text-yellow-500 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('warehouse.stockCount.completed')}</p>
                                <p className="text-2xl font-bold font-mono">{stats.completed}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all">{t('warehouse.stockCount.allCounts')}</TabsTrigger>
                        <TabsTrigger value="planned">{t('warehouse.stockCount.planned')}</TabsTrigger>
                        <TabsTrigger value="in_progress">{t('warehouse.stockCount.inProgress')}</TabsTrigger>
                        <TabsTrigger value="completed">{t('warehouse.stockCount.completed')}</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Error Alert */}
                {error && (
                    <Card className="border-destructive mt-4">
                        <CardContent className="flex items-center gap-2 p-4 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </CardContent>
                    </Card>
                )}

                <TabsContent value={activeSubTab} className="mt-4">
                    {loading ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                {t('common.loading')}
                            </CardContent>
                        </Card>
                    ) : filteredCounts.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">
                                    {t('warehouse.stockCount.noCounts')}
                                </p>
                                <Button variant="outline" className="mt-4">
                                    <Plus className="h-4 w-4 me-2" />
                                    {t('warehouse.stockCount.createCount')}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {filteredCounts.map(count => (
                                <Card key={count.id} className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold font-mono">{count.count_number}</h4>
                                                    <Badge className={statusColors[count.status]}>
                                                        {getStatusLabel(count.status)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Warehouse className="h-4 w-4" />
                                                        {count.warehouse_name || t('common.notSpecified')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(count.count_date)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Package className="h-4 w-4" />
                                                        {count.total_items || 0} {t('warehouse.stockCount.totalItems')}
                                                    </span>
                                                </div>

                                                {/* Progress */}
                                                <div className="mt-3">
                                                    <div className="flex items-center justify-between text-sm mb-1">
                                                        <span>{t('warehouse.stockCount.progress')}</span>
                                                        <span className="font-mono">
                                                            {count.counted_items || 0} / {count.total_items || 0}
                                                        </span>
                                                    </div>
                                                    <Progress value={getProgress(count.counted_items, count.total_items)} />
                                                </div>

                                                {/* Variance info */}
                                                {count.status !== 'planned' && (
                                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                                        <span className="text-green-600">
                                                            ✓ {count.match_count || 0} {t('warehouse.stockCount.matchCount')}
                                                        </span>
                                                        {(count.variance_count || 0) > 0 && (
                                                            <span className="text-red-600">
                                                                ⚠ {count.variance_count} {t('warehouse.stockCount.varianceCount')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-2 ms-4">
                                                {count.status === 'planned' && (
                                                    <Button size="sm">
                                                        <Play className="h-4 w-4 me-1" />
                                                        {t('warehouse.stockCount.startCount')}
                                                    </Button>
                                                )}
                                                {count.status === 'in_progress' && (
                                                    <Button size="sm" variant="outline">
                                                        {t('common.continue')}
                                                    </Button>
                                                )}
                                                {count.status === 'completed' && (
                                                    <Button size="sm" variant="ghost">
                                                        {t('common.view')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
