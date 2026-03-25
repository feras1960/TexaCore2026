/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 TransfersPage — صفحة المناقلات
 * إدارة طلبات المناقلة بين المستودعات
 *
 * ✅ جدول المناقلات مع فلاتر (حالة، اتجاه)
 * ✅ زر إنشاء مناقلة جديدة → UnifiedAccountingSheet (tradeMode="transfer", mode="create")
 * ✅ فتح مناقلة → UnifiedAccountingSheet (tradeMode="transfer", mode="view")
 * ✅ جلب البيانات من stock_transfers
 * ✅ تبويبات فرعية pill badges لفلترة الحالات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import {
    ArrowLeftRight, Plus,
    Clock, CheckCircle2,
    Truck, Package, XCircle,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';

// ─── Status Configs ──────────────────────────────────────
const STATUS_CONFIG: Record<string, { labelAr: string; labelEn: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    draft: { labelAr: 'مسودة', labelEn: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
    confirmed: { labelAr: 'مؤكد', labelEn: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
    loading: { labelAr: 'قيد التحميل', labelEn: 'Loading', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Package },
    shipped: { labelAr: 'مُرسل', labelEn: 'Shipped', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
    received: { labelAr: 'مُستلم', labelEn: 'Received', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    completed: { labelAr: 'مكتمل', labelEn: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    cancelled: { labelAr: 'ملغي', labelEn: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

// Statuses where the transfer is beyond draft — no delete allowed
const NON_DRAFT_STATUSES = ['confirmed', 'loading', 'shipped', 'received', 'completed'];

type DirectionFilter = 'all' | 'outgoing' | 'incoming';

export default function TransfersPage() {
    const { t, language, direction } = useLanguage();
    const { user, tenantId } = useAuth();
    const queryClient = useQueryClient();
    const isRTL = direction === 'rtl';

    // ─── State ──────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');

    // UnifiedAccountingSheet state (for create + view transfers)
    const [unifiedSheetOpen, setUnifiedSheetOpen] = useState(false);
    const [unifiedSheetData, setUnifiedSheetData] = useState<any>(null);
    const [unifiedSheetMode, setUnifiedSheetMode] = useState<'create' | 'view'>('view');

    // ─── Fetch Transfers from DB ─────────────────────────
    const { data: transfers = [], isLoading, refetch } = useQuery({
        queryKey: ['stock_transfers', tenantId, statusFilter, search],
        queryFn: async () => {
            let query = supabase
                .from('stock_transfers')
                .select(`
                    *,
                    from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id, name_ar, name_en),
                    to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id, name_ar, name_en)
                `)
                .order('created_at', { ascending: false });

            if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'loading') {
                    query = query.in('status', ['loading', 'confirmed']);
                } else if (statusFilter === 'completed') {
                    query = query.in('status', ['received', 'completed']);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            if (search.trim()) {
                query = query.ilike('transfer_number', `%${search.trim()}%`);
            }

            const { data, error } = await query;
            if (error) {
                console.error('[TransfersPage] fetch error:', error);
                return [];
            }
            return data || [];
        },
        enabled: true,
        staleTime: 10000,
        refetchOnWindowFocus: true,
    });

    // ─── Summary Counts ─────────────────────────────────
    const counts = useMemo(() => {
        const all = transfers.length;
        const draft = transfers.filter((t: any) => t.status === 'draft').length;
        const loading = transfers.filter((t: any) => t.status === 'loading' || t.status === 'confirmed').length;
        const shipped = transfers.filter((t: any) => t.status === 'shipped').length;
        const completed = transfers.filter((t: any) => t.status === 'received' || t.status === 'completed').length;
        return { all, draft, loading, shipped, completed };
    }, [transfers]);

    // ─── Handlers ───────────────────────────────────────
    const handleNewTransfer = useCallback(() => {
        // Create mode → open UnifiedAccountingSheet with no data (create)
        // Create mode → open UnifiedAccountingSheet with initial data
        setUnifiedSheetData({ type: 'transfer', status: 'draft', subType: 'transfer' });
        setUnifiedSheetMode('create');
        setUnifiedSheetOpen(true);
    }, []);

    const handleOpenTransfer = useCallback(async (transfer: any) => {
        // View mode → open UnifiedAccountingSheet with existing data
        setUnifiedSheetData(transfer);
        setUnifiedSheetMode('view');
        setUnifiedSheetOpen(true);
    }, []);

    const handleSheetClose = useCallback(() => {
        setUnifiedSheetOpen(false);
        setUnifiedSheetData(null);
        refreshList();
    }, []);



    const refreshList = useCallback(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['stock_transfers'] });
    }, [refetch, queryClient]);

    // ─── Delete Draft Transfer ───────────────────────────
    const handleDeleteDraft = useCallback(async (e: React.MouseEvent, transfer: any) => {
        e.stopPropagation(); // Prevent row click

        // Safety: only allow deleting drafts
        if (NON_DRAFT_STATUSES.includes(transfer.status)) {
            toast.error(
                language === 'ar'
                    ? '🚫 لا يمكن حذف مناقلة مؤكدة أو مُرسلة'
                    : '🚫 Cannot delete a confirmed/shipped transfer'
            );
            return;
        }

        const confirmed = window.confirm(
            language === 'ar'
                ? 'هل أنت متأكد من حذف هذه المناقلة المسودة؟'
                : 'Are you sure you want to delete this draft transfer?'
        );
        if (!confirmed) return;

        try {
            // Delete transfer items first
            await supabase
                .from('stock_transfer_items')
                .delete()
                .eq('transfer_id', transfer.id);

            // Delete the transfer itself
            const { error } = await supabase
                .from('stock_transfers')
                .delete()
                .eq('id', transfer.id);

            if (error) throw error;

            toast.success(
                language === 'ar'
                    ? '🗑️ تم حذف المناقلة المسودة'
                    : '🗑️ Draft transfer deleted'
            );
            refreshList();
        } catch (err: any) {
            console.error('Delete draft transfer error:', err);
            toast.error(
                language === 'ar'
                    ? 'فشل في الحذف'
                    : 'Delete failed'
            );
        }
    }, [language, refreshList]);

    // ─── Direction Labels ────────────────────────────────
    const directionOptions = useMemo(() => [
        { value: 'all', labelAr: 'الكل', labelEn: 'All' },
        { value: 'outgoing', labelAr: 'صادرة (من مستودعي)', labelEn: 'Outgoing (from my warehouse)' },
        { value: 'incoming', labelAr: 'واردة (إلى مستودعي)', labelEn: 'Incoming (to my warehouse)' },
    ], []);

    // ─── Format Date ─────────────────────────────────────
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
                day: 'numeric', month: 'short', year: 'numeric',
            }).format(new Date(dateStr));
        } catch {
            return dateStr;
        }
    };

    // ─── NexaListTable Columns ────────────────────────────
    const transferColumns: NexaListColumn<any>[] = useMemo(() => [
        {
            id: 'transfer_number',
            header: language === 'ar' ? 'الرقم' : '#',
            sortable: true,
            sortKey: 'transfer_number',
            cell: (row: any) => (
                <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">
                    {row.transfer_number || row.id?.substring(0, 8)}
                </span>
            ),
        },
        {
            id: 'from_warehouse',
            header: language === 'ar' ? 'من المستودع' : 'From',
            cell: (row: any) => (
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {language === 'ar'
                        ? (row.from_warehouse?.name_ar || row.from_warehouse?.name_en || '—')
                        : (row.from_warehouse?.name_en || row.from_warehouse?.name_ar || '—')}
                </span>
            ),
        },
        {
            id: 'to_warehouse',
            header: language === 'ar' ? 'إلى المستودع' : 'To',
            cell: (row: any) => (
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {language === 'ar'
                        ? (row.to_warehouse?.name_ar || row.to_warehouse?.name_en || '—')
                        : (row.to_warehouse?.name_en || row.to_warehouse?.name_ar || '—')}
                </span>
            ),
        },
        {
            id: 'transfer_date',
            header: language === 'ar' ? 'التاريخ' : 'Date',
            sortable: true,
            sortKey: 'transfer_date',
            cell: (row: any) => (
                <span className="text-xs text-muted-foreground">
                    {formatDate(row.transfer_date || row.created_at)}
                </span>
            ),
        },
        {
            id: 'total_items',
            header: language === 'ar' ? 'الأصناف' : 'Items',
            cell: (row: any) => (
                <span className="text-sm font-medium text-center block">
                    {row.total_items || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: language === 'ar' ? 'الحالة' : 'Status',
            cell: (row: any) => {
                const s = STATUS_CONFIG[row.status] || STATUS_CONFIG.draft;
                const SIcon = s.icon;
                return (
                    <Badge variant="outline" className={cn('gap-1 text-[10px] px-2 py-0.5 font-semibold', s.color)}>
                        <SIcon className="w-3 h-3" />
                        {language === 'ar' ? s.labelAr : s.labelEn}
                    </Badge>
                );
            },
        },
    ], [language, formatDate]);

    // ─── Render Actions (delete for drafts only) ─────────
    const renderTransferActions = useCallback((row: any) => {
        if (row.status !== 'draft') return null;
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => handleDeleteDraft(e, row)}
                title={language === 'ar' ? 'حذف المسودة' : 'Delete draft'}
            >
                <Trash2 className="w-3.5 h-3.5" />
            </Button>
        );
    }, [language, handleDeleteDraft]);

    return (
        <div className="space-y-4">
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shadow-sm flex-shrink-0">
                        <ArrowLeftRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            {language === 'ar' ? 'المناقلات' : 'Stock Transfers'}
                        </h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {language === 'ar' ? 'إدارة طلبات نقل المواد بين المستودعات' : 'Manage stock transfer requests between warehouses'}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400"
                    onClick={handleNewTransfer}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">{language === 'ar' ? 'مناقلة جديدة' : 'New Transfer'}</span>
                </Button>
            </div>

            {/* ═══ Summary Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { labelAr: 'الكل', labelEn: 'Total', value: counts.all, color: 'text-gray-700 dark:text-gray-300', bg: 'from-gray-500/10 to-gray-600/5 border-gray-200/60 dark:border-gray-700/40', iconBg: 'text-gray-500 bg-gray-50 dark:bg-gray-800', icon: ArrowLeftRight },
                    { labelAr: 'مسودة', labelEn: 'Draft', value: counts.draft, color: 'text-gray-600 dark:text-gray-400', bg: 'from-gray-500/10 to-gray-600/5 border-gray-200/60 dark:border-gray-700/40', iconBg: 'text-gray-500 bg-gray-50 dark:bg-gray-800', icon: Clock },
                    { labelAr: 'قيد التحميل', labelEn: 'Loading', value: counts.loading, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-500/10 to-amber-600/5 border-amber-200/60 dark:border-amber-800/40', iconBg: 'text-amber-500 bg-amber-50 dark:bg-amber-900/40', icon: Package },
                    { labelAr: 'مرسلة', labelEn: 'Shipped', value: counts.shipped, color: 'text-purple-600 dark:text-purple-400', bg: 'from-purple-500/10 to-purple-600/5 border-purple-200/60 dark:border-purple-800/40', iconBg: 'text-purple-500 bg-purple-50 dark:bg-purple-900/40', icon: Truck },
                    { labelAr: 'مكتمل', labelEn: 'Completed', value: counts.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/60 dark:border-emerald-800/40', iconBg: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/40', icon: CheckCircle2 },
                ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                        <div key={i} className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-br px-4 py-3 shadow-sm transition-shadow hover:shadow-md', stat.bg)}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                                        {language === 'ar' ? stat.labelAr : stat.labelEn}
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

            {/* ═══ Table Panel ═══ */}
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

                {/* ── Toolbar (filters) ── */}
                <div className="flex items-end gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex-wrap">

                    {/* Direction Filter */}
                    <div className="flex flex-col gap-1 min-w-[130px]">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                            {language === 'ar' ? 'الاتجاه' : 'Direction'}
                        </span>
                        <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as DirectionFilter)}>
                            <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {directionOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {language === 'ar' ? opt.labelAr : opt.labelEn}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                {/* ── Sub-Tabs Filters ── */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-wrap">
                    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <ArrowLeftRight className="w-4 h-4 me-1.5" />
                                {language === 'ar' ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{counts.all}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-600 font-tajawal">
                                <Clock className="w-4 h-4 me-1.5" />
                                {language === 'ar' ? 'مسودة' : 'Draft'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-100/60 text-gray-700">{counts.draft}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="loading" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-amber-600 font-tajawal">
                                <Package className="w-4 h-4 me-1.5" />
                                {language === 'ar' ? 'قيد التحميل' : 'Loading'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-amber-100/60 text-amber-700">{counts.loading}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="shipped" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-purple-600 font-tajawal">
                                <Truck className="w-4 h-4 me-1.5" />
                                {language === 'ar' ? 'مرسلة' : 'Shipped'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-purple-100/60 text-purple-700">{counts.shipped}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <CheckCircle2 className="w-4 h-4 me-1.5" />
                                {language === 'ar' ? 'مكتمل' : 'Completed'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{counts.completed}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* ── NexaListTable ── */}
                <NexaListTable
                    data={transfers}
                    columns={transferColumns}
                    getRowKey={(r: any) => r.id}
                    isLoading={isLoading}
                    renderActions={renderTransferActions}
                    onRowClick={(row: any) => handleOpenTransfer(row)}
                    searchPlaceholder={language === 'ar' ? 'بحث برقم المناقلة...' : 'Search by transfer number...'}
                    searchTerm={search}
                    onSearchChange={setSearch}
                    isRTL={isRTL}
                    direction={direction as 'rtl' | 'ltr'}
                />
            </div>

            {/* ═══ UnifiedAccountingSheet — for ALL transfers (create + view) ═══ */}
            {unifiedSheetOpen && (
                <UnifiedAccountingSheet
                    isOpen={unifiedSheetOpen}
                    onClose={handleSheetClose}
                    docType="trade_invoice"
                    tradeMode="transfer"
                    mode={unifiedSheetMode}
                    data={unifiedSheetData}
                />
            )}


        </div>
    );
}
