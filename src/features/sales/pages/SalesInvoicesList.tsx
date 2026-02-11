
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Calendar, LayoutGrid, List } from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';

export default function SalesInvoicesList() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');

    // 🔄 Realtime: auto-update when sales_invoices change
    useRealtimeInvalidation({
        table: 'sales_invoices',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['sales_invoices']],
    });

    // State
    const [activeTab, setActiveTab] = useState('all');
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

    // Fetch Invoices
    const { data: invoicesRaw = [], isLoading, error, refetch } = useQuery({
        queryKey: ['sales_invoices_list', companyId, activeTab, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('sales_invoices')
                .select('*')
                .eq('company_id', companyId)
                .order('invoice_date', { ascending: false });

            // Apply Status Filter (only in list mode)
            if (activeTab !== 'all' && viewMode === 'list') {
                query = query.eq('status', activeTab);
            }

            // Apply Date Filter
            if (dateRange?.from) {
                query = query.gte('invoice_date', dateRange.from.toISOString());
            }
            if (dateRange?.to) {
                query = query.lte('invoice_date', endOfDay(dateRange.to).toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!companyId
    });

    // Fetch Customers Map
    const { data: customersMap = {} } = useQuery({
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
        return invoicesRaw.map((inv: any) => ({
            ...inv,
            customer_name: customersMap[inv.customer_id] || inv.customer_name || 'Unknown',
            total_amount: Number(inv.total_amount || 0)
        }));
    }, [invoicesRaw, customersMap]);

    // Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'invoice_number',
            header: t('table.invoiceNumber') || 'Invoice #',
            cell: (info: any) => <span className="font-mono font-bold text-indigo-600">{info.getValue()}</span>
        },
        {
            accessorKey: 'invoice_date',
            header: t('table.date') || 'Date',
            cell: (info: any) => <span className="text-gray-600 font-mono text-xs">{new Date(info.getValue()).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
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
            accessorKey: 'status',
            header: t('table.status') || 'Status',
            cell: (info: any) => {
                const status = info.getValue();
                let color = 'bg-gray-100 text-gray-600';
                if (status === 'posted') color = 'bg-blue-100 text-blue-700';
                if (status === 'draft') color = 'bg-yellow-100 text-yellow-700';
                if (status === 'cancelled') color = 'bg-red-100 text-red-700';
                if (status === 'paid') color = 'bg-green-100 text-green-700';
                if (status === 'partially_paid') color = 'bg-orange-100 text-orange-700';
                if (status === 'returned') color = 'bg-rose-100 text-rose-700';

                return (
                    <Badge variant="secondary" className={`${color} px-2 py-0.5 capitalize`}>
                        {t(`status.${status}`) || status}
                    </Badge>
                );
            }
        }
    ], [t, language, isRTL, companyCurrency]);

    // ─── Kanban Configuration ───
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'draft',
            title: isRTL ? 'مسودة' : 'Draft',
            color: 'border-yellow-500',
            bgColor: 'bg-yellow-50/40',
            accentHex: '#eab308',
            icon: <FileText className="w-4 h-4 text-yellow-600" />,
        },
        {
            id: 'posted',
            title: isRTL ? 'مؤكدة' : 'Posted',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40',
            accentHex: '#2563eb',
            icon: <FileText className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'partially_paid',
            title: isRTL ? 'مدفوعة جزئياً' : 'Partially Paid',
            color: 'border-orange-500',
            bgColor: 'bg-orange-50/40',
            accentHex: '#ea580c',
            icon: <FileText className="w-4 h-4 text-orange-600" />,
        },
        {
            id: 'paid',
            title: isRTL ? 'مدفوعة' : 'Paid',
            color: 'border-green-500',
            bgColor: 'bg-green-50/40',
            accentHex: '#16a34a',
            icon: <FileText className="w-4 h-4 text-green-600" />,
        },
        {
            id: 'cancelled',
            title: isRTL ? 'ملغاة' : 'Cancelled',
            color: 'border-red-500',
            bgColor: 'bg-red-50/40',
            accentHex: '#dc2626',
            icon: <FileText className="w-4 h-4 text-red-600" />,
        },
        {
            id: 'returned',
            title: isRTL ? 'مرتجعة' : 'Returned',
            color: 'border-rose-500',
            bgColor: 'bg-rose-50/40',
            accentHex: '#e11d48',
            icon: <FileText className="w-4 h-4 text-rose-600" />,
        },
    ], [isRTL]);

    const kanbanItems: KanbanItem[] = useMemo(() =>
        invoices.map((inv: any) => ({
            id: inv.id,
            columnId: inv.status || 'draft',
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
                            {t('sales.invoices')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('sales.invoicesSubtitle')}
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
                        {t('actions.createInvoice') || (isRTL ? 'فاتورة جديدة' : 'New Invoice')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Tabs (list only) + Date Picker ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    {viewMode === 'list' && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                            <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                                <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-yellow-600">{isRTL ? 'مسودة' : 'Draft'}</TabsTrigger>
                                <TabsTrigger value="posted" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-blue-600">{isRTL ? 'مؤكدة' : 'Posted'}</TabsTrigger>
                                <TabsTrigger value="partially_paid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-orange-600">{isRTL ? 'مدفوعة جزئياً' : 'Partially Paid'}</TabsTrigger>
                                <TabsTrigger value="paid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-green-600">{isRTL ? 'مدفوعة' : 'Paid'}</TabsTrigger>
                                <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-red-600">{isRTL ? 'ملغاة' : 'Cancelled'}</TabsTrigger>
                            </TabsList>
                        </Tabs>
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
                                            {doc.invoice_number || '-'}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] h-5 px-1.5 border capitalize"
                                        >
                                            {t(`status.${doc.status}`) || doc.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                        {doc.customer_name || '-'}
                                    </p>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {doc.invoice_date ? new Date(doc.invoice_date).toLocaleDateString() : '-'}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-erp-navy">
                                            {Number(doc.total_amount || 0).toLocaleString()}{' '}
                                            <span className="text-[10px] text-gray-400">{doc.currency || companyCurrency || ''}</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                            onCardMove={(itemId, fromColumn, toColumn) => {
                                const fromTitle = kanbanColumns.find(c => c.id === fromColumn)?.title;
                                const toTitle = kanbanColumns.find(c => c.id === toColumn)?.title;
                                toast.info(
                                    isRTL
                                        ? `تم نقل الفاتورة من "${fromTitle}" إلى "${toTitle}"`
                                        : `Invoice moved from "${fromTitle}" to "${toTitle}"`
                                );
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
                    initialData={sheetMode === 'create' ? { status: 'draft', currency: companyCurrency || '', date: new Date().toISOString() } : selectedInvoice}
                />
            )}
        </div>
    );
}
