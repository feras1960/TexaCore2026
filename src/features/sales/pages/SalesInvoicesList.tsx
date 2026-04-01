
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Calendar, LayoutGrid, List } from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { Badge } from '@/components/ui/badge';
import { StatusDropdown } from '@/components/shared/status';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { TransactionStageStats } from '@/components/transactions';
import { salesTransactionService } from '@/services/salesTransactionService';

export default function SalesInvoicesList() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const { tenantId } = useAuth();
    const queryClient = useQueryClient();
    const isRTL = direction === 'rtl';
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');

    // 🔄 Realtime: auto-update when sales_transactions change
    useRealtimeInvalidation({
        table: 'sales_transactions',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['sales_transactions_list']],
    });

    // State
    const [activeTab, setActiveTab] = useState('all');
    const [stageFilter, setStageFilter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('view');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // ─── Persist view mode preference ───
    const VIEW_PREF_KEY = 'sales-invoices-view';

    useEffect(() => {
        getTablePreferences(VIEW_PREF_KEY).then((prefs) => {
            if (prefs?.columnVisibility?.viewMode) {
                const saved = prefs.columnVisibility.viewMode as unknown as string;
                if (saved === 'kanban' || saved === 'list') {
                    setViewMode(saved);
                    if (saved === 'kanban') setActiveTab('all');
                }
            }
        }).catch(() => { });
    }, []);

    const handleSetViewMode = useCallback((mode: 'list' | 'kanban') => {
        setViewMode(mode);
        if (mode === 'kanban') setActiveTab('all');
        debouncedSavePreferences(VIEW_PREF_KEY, {
            columnVisibility: { viewMode: mode as any }
        }, 500);
    }, []);

    // Fetch Invoices — NEW: from sales_transactions
    const invoicesQuery = useCachedQuery({
        queryKey: ['sales_transactions_list', companyId, dateRange?.from?.toISOString()?.split('T')[0], dateRange?.to?.toISOString()?.split('T')[0]],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('sales_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Apply Date Filter
            if (dateRange?.from) {
                query = query.gte('doc_date', dateRange.from.toISOString());
            }
            if (dateRange?.to) {
                query = query.lte('doc_date', endOfDay(dateRange.to).toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ⚡ CACHE-FIRST: Don't show skeletons when query is disabled (auth init)
    const invoicesRaw = invoicesQuery.data ?? [];
    const isLoading = !!tenantId && !!companyId && invoicesQuery.isPending;
    const error = invoicesQuery.error;
    const refetch = invoicesQuery.refetch;

    // Fetch Customers Map
    const { data: customersMap = {} } = useCachedQuery({
        queryKey: ['customers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('customers')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId);

            if (error) {
                console.warn('Customers fetch failed', error);
                return {};
            }

            return (data || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = isRTL ? (curr.name_ar || curr.name_en) : (curr.name_en || curr.name_ar);
                return acc;
            }, {});
        },
        enabled: !!companyId,
        staleTime: 60000
    });

    const invoices = useMemo(() => {
        let result = invoicesRaw.map((inv: any) => ({
            ...inv,
            customer_name: customersMap[inv.customer_id] || inv.customer_name || 'Unknown',
            total_amount: Number(inv.total_amount || 0),
            _stage: inv.stage || 'draft',
            // Smart document number: show the most relevant number for the current stage
            _doc_number: inv.invoice_no || inv.order_no || inv.quotation_no || inv.delivery_no || inv.reservation_no || inv.draft_no || '-',
        }));

        // Apply stage filter from TransactionStageStats
        if (stageFilter) {
            result = result.filter(inv => inv._stage === stageFilter);
        }

        return result;
    }, [invoicesRaw, customersMap, stageFilter]);

    // Compute stage counts for TransactionStageStats
    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        invoicesRaw.forEach((inv: any) => {
            const stage = inv.stage || 'draft';
            counts[stage] = (counts[stage] || 0) + 1;
        });
        return counts;
    }, [invoicesRaw]);

    // ─── Stage label map for dynamic create button ───
    const salesStageLabels: Record<string, { ar: string; en: string }> = {
        all: { ar: 'مستند جديد', en: 'New Document' },
        draft: { ar: 'مسودة جديدة', en: 'New Draft' },
        requested: { ar: 'طلب بيع جديد', en: 'New Sales Request' },
        ordered: { ar: 'أمر بيع جديد', en: 'New Sales Order' },
        invoiced: { ar: 'فاتورة مبيعات جديدة', en: 'New Sales Invoice' },
        posted: { ar: 'فاتورة مرحّلة', en: 'New Posted Invoice' },
        paid: { ar: 'فاتورة مدفوعة', en: 'New Paid Invoice' },
    };

    const getSalesInitialStatus = (tab: string) => {
        if (tab === 'all' || tab === 'draft') return 'draft';
        return tab;
    };

    // Columns — NEW: using sales_transactions fields
    const columns = useMemo(() => [
        {
            accessorKey: '_doc_number',
            header: t('table.invoiceNumber') || 'Doc #',
            cell: (info: any) => <span className="font-mono font-bold text-indigo-600">{info.row.original._doc_number}</span>
        },
        {
            accessorKey: 'doc_date',
            header: t('table.date') || 'Date',
            cell: (info: any) => <span className="text-gray-600 font-mono text-xs">{new Date(info.row.original.doc_date || info.row.original.created_at).toLocaleDateString(language === 'ar' ? 'ar-u-nu-latn' : 'en-US')}</span>
        },
        {
            accessorKey: 'customer_name',
            header: t('table.customer') || 'Customer',
            cell: (info: any) => <span className="font-medium">{info.getValue() || '-'}</span>
        },
        {
            accessorKey: 'total_amount',
            header: t('table.amount') || 'Amount',
            cell: (info: any) => {
                const curr = info.row.original.currency || companyCurrency || 'USD';
                const amount = Number(info.getValue() || 0);
                return (
                    <span className="font-mono font-bold text-gray-800">
                        {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-muted-foreground ml-1">{curr}</span>
                    </span>
                );
            }
        },
        {
            accessorKey: 'currency',
            header: language === 'ar' ? 'العملة' : 'Currency',
            size: 70,
            cell: (info: any) => {
                const curr = info.getValue() || companyCurrency;
                const isDifferent = curr && companyCurrency && curr !== companyCurrency;
                return (
                    <span className={`font-mono text-xs font-medium ${isDifferent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {curr}
                    </span>
                );
            }
        },
        {
            accessorKey: 'stage',
            header: t('table.status') || 'Stage',
            cell: (info: any) => (
                <StatusDropdown
                    docType="sales_transaction"
                    docId={info.row.original.id}
                    currentStatusCode={info.row.original.stage || 'draft'}
                    tenantId={tenantId}
                    size="sm"
                    onStatusChange={() => {
                        queryClient.invalidateQueries({ queryKey: ['sales_transactions_list'] });
                    }}
                />
            )
        }
    ], [t, language, isRTL, companyCurrency]);

    // ─── Kanban Configuration — Stage-based columns ───
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'draft',
            title: isRTL ? 'مسودة' : 'Draft',
            color: 'border-gray-400',
            bgColor: 'bg-gray-50/40',
            accentHex: '#6b7280',
            icon: <FileText className="w-4 h-4 text-gray-500" />,
        },
        {
            id: 'quotation',
            title: isRTL ? 'عرض سعر' : 'Quotation',
            color: 'border-yellow-500',
            bgColor: 'bg-yellow-50/40',
            accentHex: '#eab308',
            icon: <FileText className="w-4 h-4 text-yellow-600" />,
        },
        {
            id: 'reservation',
            title: isRTL ? 'حجز' : 'Reservation',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40',
            accentHex: '#a855f7',
            icon: <FileText className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'order',
            title: isRTL ? 'أمر بيع' : 'Order',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40',
            accentHex: '#2563eb',
            icon: <FileText className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'delivery',
            title: isRTL ? 'تسليم' : 'Delivery',
            color: 'border-teal-500',
            bgColor: 'bg-teal-50/40',
            accentHex: '#14b8a6',
            icon: <FileText className="w-4 h-4 text-teal-600" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'فاتورة' : 'Invoice',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#6366f1',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'posted',
            title: isRTL ? 'مرحّلة' : 'Posted',
            color: 'border-cyan-500',
            bgColor: 'bg-cyan-50/40',
            accentHex: '#06b6d4',
            icon: <FileText className="w-4 h-4 text-cyan-600" />,
        },
        {
            id: 'paid',
            title: isRTL ? 'مدفوعة' : 'Paid',
            color: 'border-green-500',
            bgColor: 'bg-green-50/40',
            accentHex: '#16a34a',
            icon: <FileText className="w-4 h-4 text-green-600" />,
        },
    ], [isRTL]);

    const kanbanItems: KanbanItem[] = useMemo(() =>
        invoices.map((inv: any) => ({
            id: inv.id,
            columnId: inv.stage || 'draft',
            content: inv,
        }))
        , [invoices]);

    // Handlers
    const handleRowClick = (row: any) => {
        setSelectedInvoice(row);
        setSheetMode('view');
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedInvoice(null);
        setSheetMode('create');
        setIsSheetOpen(true);
    };

    if (error) {
        return <div className="p-4 text-red-500">Error loading invoices: {(error as Error).message}</div>
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* ─── Top Fixed Row: Title + View Switcher + Create Button ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <FileText className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('sales.cycle') || (isRTL ? 'دورة المبيعات' : 'Sales Cycle')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('sales.cycleSubtitle') || (isRTL ? 'طلبات وأوامر وفواتير المبيعات' : 'Requests, orders & invoices')}
                        </p>
                    </div>
                </div>

                {/* View Switcher + Create Button */}
                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-gray-200/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-erp-navy' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => handleSetViewMode('list')}
                        >
                            <List className="w-4 h-4" />
                            {isRTL ? 'جدول' : 'List'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-erp-navy' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => handleSetViewMode('kanban')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Kanban
                        </Button>
                    </div>

                    {/* Create Button */}
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9 px-4 gap-2">
                        <Plus className="w-4 h-4" />
                        {isRTL ? (salesStageLabels[activeTab]?.ar || 'مستند جديد') : (salesStageLabels[activeTab]?.en || 'New Document')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Stage Stats (NEW) + Date Picker ─── */}
                <div className="flex flex-col gap-3 px-1">
                    {viewMode === 'list' && (
                        <TransactionStageStats
                            type="sale"
                            stats={stageCounts}
                            selectedStage={stageFilter}
                            onStageSelect={(stage) => {
                                setStageFilter(stage);
                                // Sync with legacy tabs
                                setActiveTab(stage || 'all');
                            }}
                        />
                    )}

                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-full sm:w-[260px]"
                        align={isRTL ? "end" : "start"}
                    />
                </div>

                {/* ─── Content Area ─── */}
                {viewMode === 'list' ? (
                    <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                        <NexaDataTable
                            data={invoices}
                            columns={columns}
                            onRowClick={handleRowClick}
                            enableSearch
                            searchPlaceholder={isRTL ? "بحث برقم الفاتورة..." : "Search invoice #..."}
                        />
                    </div>
                ) : (
                    <div
                        className="overflow-hidden rounded-lg border bg-gradient-to-br from-gray-50 to-slate-50 shadow-sm"
                        dir={direction}
                        style={{ height: 'calc(100vh - 260px)' }}
                    >
                        <NexaKanbanBoard
                            columns={kanbanColumns}
                            items={kanbanItems}
                            direction={direction}
                            currency={companyCurrency || ''}
                            isLoading={isLoading}
                            emptyText={isRTL ? 'لا توجد فواتير' : 'No invoices'}
                            getItemValue={(content) => Number(content.total_amount || 0)}
                            renderCard={(doc, _colId) => (
                                <div
                                    className="p-3.5 space-y-2.5 cursor-pointer"
                                    onClick={() => handleRowClick(doc)}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                            {doc._doc_number || doc.invoice_no || doc.order_no || doc.quotation_no || '-'}
                                        </span>
                                        <StatusDropdown
                                            docType="sales_transaction"
                                            docId={doc.id}
                                            currentStatusCode={doc.stage || 'draft'}
                                            tenantId={tenantId}
                                            size="sm"
                                            onStatusChange={() => {
                                                queryClient.invalidateQueries({ queryKey: ['sales_transactions_list'] });
                                            }}
                                        />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                        {doc.customer_name || '-'}
                                    </p>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString() : '-'}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-erp-navy">
                                            {Number(doc.total_amount || 0).toLocaleString()}{' '}
                                            <span className="text-[10px] text-gray-400">{doc.currency || companyCurrency || ''}</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                            onCardMove={async (itemId, fromColumn, toColumn) => {
                                const fromTitle = kanbanColumns.find(c => c.id === fromColumn)?.title;
                                const toTitle = kanbanColumns.find(c => c.id === toColumn)?.title;

                                // Allowed stage transitions (matching new DB)
                                const allowedMoves: Record<string, string[]> = {
                                    draft: ['quotation', 'order', 'cancelled'],
                                    quotation: ['reservation', 'order', 'cancelled'],
                                    reservation: ['order'],
                                    order: ['delivery', 'invoice'],
                                    delivery: ['invoice'],
                                    invoice: ['posted', 'cancelled'],
                                    posted: ['partial_paid', 'paid'],
                                    partial_paid: ['paid'],
                                    cancelled: ['draft'],
                                };

                                const allowed = allowedMoves[fromColumn];
                                if (!allowed || !allowed.includes(toColumn)) {
                                    toast.error(
                                        isRTL
                                            ? `❌ لا يمكن الانتقال من "${fromTitle}" إلى "${toTitle}" مباشرة`
                                            : `❌ Cannot move from "${fromTitle}" to "${toTitle}" directly`
                                    );
                                    return;
                                }

                                // Update stage in database
                                try {
                                    const { error } = await supabase
                                        .from('sales_transactions')
                                        .update({ stage: toColumn })
                                        .eq('id', itemId);

                                    if (error) throw error;

                                    toast.success(
                                        isRTL
                                            ? `✅ تم الانتقال من "${fromTitle}" إلى "${toTitle}"`
                                            : `✅ Stage changed from "${fromTitle}" to "${toTitle}"`
                                    );
                                    queryClient.invalidateQueries({ queryKey: ['sales_transactions_list'] });
                                } catch (err: any) {
                                    toast.error(isRTL ? `❌ خطأ: ${err.message}` : `❌ Error: ${err.message}`);
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {isSheetOpen && (
                <UnifiedTradeSheet
                    open={isSheetOpen}
                    onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (!open) setSelectedInvoice(null);
                    }}
                    mode="sales"
                    type="invoice"
                    initialData={sheetMode === 'create'
                        ? { stage: 'draft', currency: companyCurrency || '', date: new Date().toISOString() }
                        : selectedInvoice
                    }
                    currentStage={selectedInvoice?.stage || undefined}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['sales_transactions_list'] })}
                />
            )}
        </div>
    );
}
