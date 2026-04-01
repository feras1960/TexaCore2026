/**
 * ════════════════════════════════════════════════════════════════
 * 📋 Stock Count Page — الجرد المخزني (v3)
 * ════════════════════════════════════════════════════════════════
 *
 * صفحة مستقلة للجرد المخزني — متناسقة مع نمط ReceiptsDeliveriesPage:
 *  - NexaListTable بدل البطاقات
 *  - بطاقات إحصائية بتصميم gradient
 *  - Sub-Tabs مع badges
 *  - Real-time اشتراكات
 *  - دعم كامل للغات (AR/EN)
 *  - اتجاه RTL/LTR تلقائي
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useWarehouses } from '@/features/warehouse/hooks/useWarehouseQueries';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockCountSheet } from '@/features/warehouse/components/StockCountSheet';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ClipboardCheck,
    ClipboardList,
    Calendar,
    Warehouse as WarehouseIcon,
    Play,
    CheckCircle2,
    AlertCircle,
    Package,
    RefreshCw,
    Scan,
    Boxes,
    CalendarClock,
    ArrowRight,
    BarChart3,
    Eye,
    ListChecks,
} from 'lucide-react';


// ═══════════════════════════════════════════════════════════════
// Status Configuration
// ═══════════════════════════════════════════════════════════════

const statusConfig: Record<string, {
    color: string;
    labelAr: string;
    labelEn: string;
    icon: any;
    accentColor: string;
}> = {
    planned: {
        color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
        labelAr: 'مخطط',
        labelEn: 'Planned',
        icon: ClipboardList,
        accentColor: '#3b82f6',
    },
    in_progress: {
        color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
        labelAr: 'جاري التنفيذ',
        labelEn: 'In Progress',
        icon: Play,
        accentColor: '#eab308',
    },
    completed: {
        color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
        labelAr: 'مكتمل',
        labelEn: 'Completed',
        icon: CheckCircle2,
        accentColor: '#22c55e',
    },
    cancelled: {
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400',
        labelAr: 'ملغى',
        labelEn: 'Cancelled',
        icon: AlertCircle,
        accentColor: '#9ca3af',
    },
};

// ─── Count Mode Labels ────────────────────────────────────────
const countModeLabels: Record<string, { ar: string; en: string; icon: any; badgeClass: string }> = {
    full:         { ar: 'جرد كامل',    en: 'Full Count',    icon: ClipboardCheck, badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
    barcode_scan: { ar: 'مسح باركود',   en: 'Barcode Scan',  icon: Scan,           badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    loose_only:   { ar: 'مخزون سائب',   en: 'Loose Stock',   icon: Boxes,          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    partial:      { ar: 'جرد جزئي',    en: 'Partial Count', icon: Package,        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    scheduled:    { ar: 'جرد مجدول',    en: 'Scheduled',     icon: CalendarClock,  badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function StockCountPage() {
    const { t, language, isRTL, direction } = useLanguage();
    const { companyId, tenantId, user } = useAuth();
    const { warehouses } = useWarehouses();

    // ─── State ───
    const [subFilter, setSubFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed'>('all');
    const [stockCounts, setStockCounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState<string>('count_date');
    const [sortAsc, setSortAsc] = useState<boolean>(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // Sheet state — single instance, controlled
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeStockCount, setActiveStockCount] = useState<any | null>(null);

    // ─── Load Data ───
    const loadData = useCallback(async (showLoader = false) => {
        if (!companyId) return;
        if (showLoader) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_counts')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStockCounts(data || []);
        } catch (err: any) {
            console.error('Error loading stock counts:', err);
            toast.error(isRTL ? 'فشل تحميل بيانات الجرد' : 'Failed to load stock count data');
        } finally {
            setLoading(false);
        }
    }, [companyId, isRTL]);

    useEffect(() => {
        if (companyId) loadData();
    }, [companyId, loadData]);

    // ─── Real-time Subscription ───
    useEffect(() => {
        if (!companyId) return;

        const channel = supabase
            .channel('stock_counts_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stock_counts',
                    filter: `company_id=eq.${companyId}`,
                },
                (payload) => {
                    console.log('📊 Stock count realtime update:', payload.eventType);
                    if (payload.eventType === 'INSERT') {
                        setStockCounts(prev => [payload.new as any, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setStockCounts(prev => prev.map(sc => sc.id === (payload.new as any).id ? payload.new as any : sc));
                    } else if (payload.eventType === 'DELETE') {
                        setStockCounts(prev => prev.filter(sc => sc.id !== (payload.old as any).id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyId]);

    // ─── Manual Refresh ───
    const handleManualRefresh = useCallback(() => {
        loadData(true);
        setLastRefreshed(new Date());
    }, [loadData]);

    // ─── Helpers ───
    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch { return dateStr; }
    }, []);

    const getWarehouseName = useCallback((warehouseId: string) => {
        const wh = warehouses.find((w: any) => w.id === warehouseId);
        return wh ? (isRTL ? wh.name_ar : (wh.name_en || wh.name_ar)) : '—';
    }, [warehouses, isRTL]);

    const getModeLabel = useCallback((mode: string) => {
        const m = countModeLabels[mode] || countModeLabels.full;
        return isRTL ? m.ar : m.en;
    }, [isRTL]);

    // ─── Counts ───
    const counts = useMemo(() => ({
        all: stockCounts.length,
        planned: stockCounts.filter(s => s.status === 'planned').length,
        inProgress: stockCounts.filter(s => s.status === 'in_progress').length,
        completed: stockCounts.filter(s => s.status === 'completed').length,
    }), [stockCounts]);

    // ─── Filter + Sort ───
    const filteredCounts = useMemo(() => {
        let result = stockCounts;
        if (subFilter !== 'all') {
            result = result.filter(sc => sc.status === subFilter);
        }

        if (sortField) {
            result = [...result].sort((a: any, b: any) => {
                let valA: any, valB: any;
                if (sortField === 'count_number') { valA = a.count_number; valB = b.count_number; }
                else if (sortField === 'warehouse') { valA = a.warehouse_id; valB = b.warehouse_id; }
                else if (sortField === 'count_date') { valA = new Date(a.count_date || a.created_at).getTime(); valB = new Date(b.count_date || b.created_at).getTime(); }
                else if (sortField === 'status') { valA = a.status; valB = b.status; }
                else if (sortField === 'items') { valA = a.total_items || 0; valB = b.total_items || 0; }

                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [stockCounts, subFilter, sortField, sortAsc]);

    // ─── Open sheet for a stock count ───
    const openStockCountSheet = useCallback((count?: any) => {
        setActiveStockCount(count || null);
        setSheetOpen(true);
    }, []);

    const openCreateSheet = useCallback(() => {
        setActiveStockCount(null);
        setSheetOpen(true);
    }, []);

    // ═══════════════════════════════════════════════════════════
    // Columns
    // ═══════════════════════════════════════════════════════════

    const columns: NexaListColumn<any>[] = useMemo(() => [
        {
            id: 'count_number',
            header: isRTL ? 'رقم الجرد' : 'Count #',
            sortable: true,
            sortKey: 'count_number',
            cell: (row: any) => {
                const sc = statusConfig[row.status] || statusConfig.planned;
                const StatusIcon = sc.icon;
                return (
                    <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-4 w-4 shrink-0", 
                            row.status === 'completed' ? 'text-green-500' :
                            row.status === 'in_progress' ? 'text-amber-500' :
                            row.status === 'cancelled' ? 'text-gray-400' : 'text-blue-500'
                        )} />
                        <div>
                            <span className="font-semibold font-mono text-sm block">
                                {row.count_number || row.id?.slice(0, 8)}
                            </span>
                            {row.created_by_name && (
                                <span className="text-[10px] text-muted-foreground block">{row.created_by_name}</span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'warehouse',
            header: isRTL ? 'المستودع' : 'Warehouse',
            sortable: true,
            sortKey: 'warehouse',
            cell: (row: any) => (
                <div className="flex items-center gap-1.5">
                    <WarehouseIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-medium">{getWarehouseName(row.warehouse_id)}</span>
                </div>
            ),
        },
        {
            id: 'count_mode',
            header: isRTL ? 'نوع الجرد' : 'Count Type',
            cell: (row: any) => {
                const mode = countModeLabels[row.count_mode] || countModeLabels.full;
                const ModeIcon = mode.icon;
                return (
                    <Badge variant="outline" className={cn('text-[10px] sm:text-xs gap-1', mode.badgeClass)}>
                        <ModeIcon className="h-3 w-3" />
                        {isRTL ? mode.ar : mode.en}
                    </Badge>
                );
            },
        },
        {
            id: 'count_date',
            header: isRTL ? 'التاريخ' : 'Date',
            sortable: true,
            sortKey: 'count_date',
            cell: (row: any) => (
                <span className="text-sm text-muted-foreground font-mono">
                    {formatDate(row.count_date || row.created_at)}
                </span>
            ),
        },
        {
            id: 'items',
            header: isRTL ? 'البنود' : 'Items',
            sortable: true,
            sortKey: 'items',
            align: 'center',
            cell: (row: any) => (
                <span className="font-mono font-bold text-teal-700">
                    {row.total_items ?? 0}
                </span>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            sortable: true,
            sortKey: 'status',
            align: 'center',
            cell: (row: any) => {
                const sc = statusConfig[row.status] || statusConfig.planned;
                return (
                    <Badge variant="outline" className={cn('text-[10px] sm:text-xs', sc.color)}>
                        {isRTL ? sc.labelAr : sc.labelEn}
                    </Badge>
                );
            },
        },
    ], [isRTL, formatDate, getWarehouseName]);

    // ─── Row Actions ───
    const renderActions = useCallback((row: any) => {
        const status = row.status || 'planned';
        return (
            <div className="flex items-center gap-1.5 justify-end">
                {status === 'planned' && (
                    <Button
                        size="sm"
                        className="h-8 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={(e) => { e.stopPropagation(); openStockCountSheet(row); }}
                    >
                        <Play className="h-3.5 w-3.5" />
                        {isRTL ? 'بدء' : 'Start'}
                    </Button>
                )}
                {status === 'in_progress' && (
                    <Button
                        size="sm"
                        className="h-8 px-3 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={(e) => { e.stopPropagation(); openStockCountSheet(row); }}
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {isRTL ? 'متابعة' : 'Continue'}
                    </Button>
                )}
                {status === 'completed' && (
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-2 text-xs border-gray-200 hover:border-green-400 hover:text-green-600 gap-1"
                        onClick={(e) => { e.stopPropagation(); openStockCountSheet(row); }}
                    >
                        <BarChart3 className="h-3.5 w-3.5" />
                        {isRTL ? 'التقرير' : 'Report'}
                    </Button>
                )}
            </div>
        );
    }, [isRTL, openStockCountSheet]);

    // ─── Row Accent ───
    const getRowAccent = useCallback((row: any) => {
        const sc = statusConfig[row.status];
        if (!sc) return 'border-s-gray-200 dark:border-s-gray-700';
        return `border-s-[${sc.accentColor}]`;
    }, []);

    // ═══════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>

            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shadow-sm flex-shrink-0">
                        <ListChecks className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            {isRTL ? 'الجرد المخزني' : 'Stock Count'}
                        </h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {isRTL ? 'إدارة وتنفيذ جرد المستودعات' : 'Manage and execute warehouse inventory counts'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Last Refresh */}
                    <span className="text-[10px] text-gray-400 font-mono hidden sm:block">
                        {isRTL ? 'آخر تحديث:' : 'Updated:'} {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    {/* Refresh */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 text-teal-600 border-teal-200 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400"
                        onClick={handleManualRefresh}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
                    </Button>

                    {/* Green Stock Count Sheet Button */}
                    <Button
                        onClick={openCreateSheet}
                        className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold shadow-lg shadow-teal-500/20 px-4"
                    >
                        <ClipboardList className="w-4 h-4" />
                        {isRTL ? 'جرد جديد' : 'New Count'}
                    </Button>

                    <StockCountSheet
                        stockCount={activeStockCount}
                        createMode={!activeStockCount}
                        isOpen={sheetOpen}
                        onOpenChange={(open) => {
                            setSheetOpen(open);
                            if (!open) {
                                setActiveStockCount(null);
                                loadData();
                            }
                        }}
                        onComplete={() => {
                            setSheetOpen(false);
                            setActiveStockCount(null);
                            loadData();
                        }}
                    />
                </div>
            </div>

            {/* ═══ Summary Cards (Gradient style like ReceiptsDeliveriesPage) ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { labelAr: 'الكل', labelEn: 'Total', value: counts.all, color: 'text-gray-700 dark:text-gray-300', bg: 'from-gray-500/10 to-gray-600/5 border-gray-200/60 dark:border-gray-700/40', iconBg: 'text-gray-500 bg-gray-50 dark:bg-gray-800', icon: ClipboardList },
                    { labelAr: 'مخطط', labelEn: 'Planned', value: counts.planned, color: 'text-blue-600 dark:text-blue-400', bg: 'from-blue-500/10 to-blue-600/5 border-blue-200/60 dark:border-blue-800/40', iconBg: 'text-blue-500 bg-blue-50 dark:bg-blue-900/40', icon: Calendar },
                    { labelAr: 'جاري', labelEn: 'In Progress', value: counts.inProgress, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-500/10 to-amber-600/5 border-amber-200/60 dark:border-amber-800/40', iconBg: 'text-amber-500 bg-amber-50 dark:bg-amber-900/40', icon: Play },
                    { labelAr: 'مكتمل', labelEn: 'Completed', value: counts.completed, color: 'text-green-600 dark:text-green-400', bg: 'from-green-500/10 to-green-600/5 border-green-200/60 dark:border-green-800/40', iconBg: 'text-green-500 bg-green-50 dark:bg-green-900/40', icon: CheckCircle2 },
                ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                        <div key={i} className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-br px-4 py-3 shadow-sm transition-shadow hover:shadow-md', stat.bg)}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                                        {isRTL ? stat.labelAr : stat.labelEn}
                                    </p>
                                    <p className={cn('text-2xl font-bold font-mono mt-1', stat.color)} dir="ltr">{stat.value}</p>
                                </div>
                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0', stat.iconBg)}>
                                    <StatIcon className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ Sub-Tabs Filters ═══ */}
            <div className="flex items-center gap-3 px-1 flex-wrap mb-2 mt-2">
                <Tabs value={subFilter} onValueChange={(v) => setSubFilter(v as any)} className="w-full sm:w-auto" dir={direction}>
                    <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                        <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                            <ClipboardList className="w-4 h-4 me-1.5" />
                            {isRTL ? 'الكل' : 'All'}
                            <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{counts.all}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="planned" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-blue-600 font-tajawal">
                            <Calendar className="w-4 h-4 me-1.5" />
                            {isRTL ? 'مخطط' : 'Planned'}
                            <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-blue-100/60 text-blue-700">{counts.planned}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-amber-600 font-tajawal">
                            <Play className="w-4 h-4 me-1.5" />
                            {isRTL ? 'جاري' : 'Active'}
                            <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-amber-100/60 text-amber-700">{counts.inProgress}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-green-600 font-tajawal">
                            <CheckCircle2 className="w-4 h-4 me-1.5" />
                            {isRTL ? 'مكتمل' : 'Done'}
                            <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-green-100/60 text-green-700">{counts.completed}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* ═══ NexaListTable ═══ */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <NexaListTable
                    data={filteredCounts}
                    columns={columns}
                    getRowKey={(r: any) => r.id}
                    renderActions={renderActions}
                    onRowClick={(row: any) => openStockCountSheet(row)}
                    searchPlaceholder={isRTL ? 'بحث برقم الجرد أو المستودع...' : 'Search by count number or warehouse...'}
                    isRTL={isRTL}
                    direction={direction as 'rtl' | 'ltr'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={(field) => {
                        if (sortField === field) setSortAsc(!sortAsc);
                        else { setSortField(field); setSortAsc(false); }
                    }}
                    isLoading={loading}
                    emptyMessage={isRTL ? 'لا يوجد جرود بعد' : 'No stock counts yet'}
                    getRowAccent={(row: any) => {
                        const sc = statusConfig[row.status];
                        if (!sc) return 'border-s-gray-200';
                        if (row.status === 'completed') return 'border-s-green-400';
                        if (row.status === 'in_progress') return 'border-s-amber-400';
                        if (row.status === 'cancelled') return 'border-s-gray-300';
                        return 'border-s-blue-400';
                    }}
                    totalCount={stockCounts.length}
                    countLabel={isRTL ? 'جرد' : 'count'}
                    showFooter={true}
                />
            </div>
        </div>
    );
}
