import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Calendar,
    ShoppingCart,
    MoreHorizontal,
    Flag,
    CheckCircle,
    Plus,
    FileText,
    Truck,
    RotateCcw,
    ChevronDown,
    Filter,
    Package,
    LayoutGrid,
    List
} from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { NexaKanbanBoard } from '@/components/ui/nexa-kanban/NexaKanbanBoard'; // Import new board
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import type { DocType } from '@/components/sheets/configs/sheet.types';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';

// Define Types
type CycleType = 'quotation' | 'order' | 'delivery' | 'invoice' | 'return' | 'reservation';

interface SalesDocument {
    id: string;
    document_number: string; // Unified display ID
    date: string; // Unified date
    type: CycleType;
    status: string;
    total_amount: number; // 0 if not applicable
    customer_id?: string;
    customer_name?: string;
    currency: string;
    created_at: string;
    original_table: string;
    // Specifics
    reservation_type?: 'stock' | 'transit';
    source_ref?: string; // Shipment/Order ref
}

export default function SalesCycleList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    // State
    const [activeTab, setActiveTab] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [viewModeLoaded, setViewModeLoaded] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<SalesDocument | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');
    const [newDocType, setNewDocType] = useState<CycleType>('order');

    // Date Filter State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // ─── Persist view mode preference ───
    const VIEW_PREF_KEY = 'sales-cycle-view';

    // Load saved view mode on mount
    useEffect(() => {
        getTablePreferences(VIEW_PREF_KEY).then((prefs) => {
            if (prefs?.columnVisibility?.viewMode) {
                const saved = prefs.columnVisibility.viewMode as unknown as string;
                if (saved === 'kanban' || saved === 'list') {
                    setViewMode(saved);
                    if (saved === 'kanban') setActiveTab('all');
                }
            }
            setViewModeLoaded(true);
        }).catch(() => setViewModeLoaded(true));
    }, []);

    // Save view mode when it changes
    const handleSetViewMode = useCallback((mode: 'list' | 'kanban') => {
        setViewMode(mode);
        if (mode === 'kanban') setActiveTab('all');
        debouncedSavePreferences(VIEW_PREF_KEY, {
            columnVisibility: { viewMode: mode as any }
        }, 500);
    }, []);

    // 1. Fetch Customers Map
    const { data: customersMap = {} } = useQuery({
        queryKey: ['customers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('customers')
                .select('id, name_ar, name_en')
                .eq('tenant_id', (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id); // Use safer tenant check

            if (error) {
                console.warn('Customers fetch failed', error);
                return {};
            }

            return (data || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = language === 'ar' ? (curr.name_ar || curr.name_en) : (curr.name_en || curr.name_ar);
                return acc;
            }, {});
        },
        enabled: !!companyId,
        staleTime: 60000
    });

    // 2. Fetch Documents (Sales Cycle)
    const { data: documents = [], isLoading, error, refetch } = useQuery({
        queryKey: ['sales_cycle_full', companyId, activeTab, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let allDocs: SalesDocument[] = [];
            const fromISO = dateRange?.from ? dateRange.from.toISOString() : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

            // Generic Helper
            const fetchTable = async (table: string, type: CycleType, dateCol: string, numCol: string, amountCol?: string, extraProps: any = {}) => {
                let q = supabase
                    .from(table)
                    .select('*')
                    .eq('company_id', companyId)
                    .order(dateCol, { ascending: false });

                if (fromISO) q = q.gte(dateCol, fromISO);
                if (toISO) q = q.lte(dateCol, toISO);

                const { data, error } = await q;

                if (error) {
                    console.warn(`Failed to fetch ${table}:`, error.message);
                    return [];
                }

                return (data || []).map((item: any) => ({
                    id: item.id,
                    document_number: item[numCol] || item.id.substring(0, 8),
                    date: item[dateCol],
                    type: type,
                    status: item.status || 'draft',
                    total_amount: amountCol ? (item[amountCol] || 0) : 0,
                    customer_id: item.customer_id,
                    customer_name: item.customer_name, // Some tables might store name directly
                    currency: item.currency || 'SAR',
                    created_at: item.created_at,
                    original_table: table,
                    ...extraProps(item)
                }));
            };

            // Parallel Fetches based on Active Tab
            const fetchPromises = [];

            // 1. Quotations
            if (activeTab === 'all' || activeTab === 'quotation') {
                fetchPromises.push(fetchTable('quotations', 'quotation', 'quotation_date', 'quotation_number', 'total_amount'));
            }

            // 2. Orders
            if (activeTab === 'all' || activeTab === 'order') {
                fetchPromises.push(fetchTable('sales_orders', 'order', 'order_date', 'order_number', 'total_amount'));
            }

            // 3. Deliveries (Delivery Notes)
            if (activeTab === 'all' || activeTab === 'delivery') {
                fetchPromises.push(fetchTable('sales_deliveries', 'delivery', 'delivery_date', 'delivery_number'));
            }

            // 4. Invoices
            if (activeTab === 'all' || activeTab === 'invoice') {
                fetchPromises.push(fetchTable('sales_invoices', 'invoice', 'invoice_date', 'invoice_number', 'total_amount'));
            }

            // 5. Returns
            if (activeTab === 'all' || activeTab === 'return') {
                fetchPromises.push(fetchTable('sales_returns', 'return', 'return_date', 'return_number', 'total_amount'));
            }

            // 6. Reservations (Transit)
            if (activeTab === 'all' || activeTab === 'reservation') {
                fetchPromises.push(fetchTable('transit_reservations', 'reservation', 'reservation_date', 'reservation_number', undefined, (item: any) => ({
                    reservation_type: 'transit',
                    source_ref: item.shipment_id ? 'Shipment' : 'Unknown'
                })));
            }

            // Execute all
            const results = await Promise.all(fetchPromises);
            results.forEach(docs => allDocs = [...allDocs, ...docs]);

            // Final Sort
            return allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        enabled: !!companyId
    });

    // Combine Data with Customer Names
    const enrichedDocuments = useMemo(() => {
        return documents.map(doc => ({
            ...doc,
            // Prioritize fetched map, fallback to stored name, fallback to Unknown
            customer_name_display: doc.customer_id ? (customersMap[doc.customer_id] || doc.customer_name || 'Unknown Client') : '-'
        })) as (SalesDocument & { customer_name_display: string })[];
    }, [documents, customersMap]);

    const handleRowClick = (row: SalesDocument) => {
        setSelectedDoc(row);
        setDocMode('view');
        setIsSheetOpen(true);
    };

    const handleCreate = (type: CycleType) => {
        setNewDocType(type);
        setSelectedDoc(null);
        setDocMode('create');
        setIsSheetOpen(true);
    };

    // Helper to map CycleType to DocType for the Sheet
    const getSheetDocType = (type: CycleType): DocType => {
        switch (type) {
            case 'quotation': return 'quotation'; // Reusing quotation (assuming sales/purchase shared or separate types needed)
            case 'order': return 'sales_order' as DocType; // Need to ensure this exists in Sheet types
            case 'delivery': return 'delivery_note' as DocType;
            case 'invoice': return 'sales_invoice' as DocType;
            case 'return': return 'sales_return' as DocType;
            case 'reservation': return 'reservation' as DocType;
            default: return 'sales_order' as DocType;
        }
    }

    // Columns Configuration
    const columns = [
        {
            header: isRTL ? 'رقم المستند' : 'Document #',
            accessorKey: 'document_number',
            cell: ({ row }: any) => (
                <span
                    className="font-bold font-mono text-erp-primary cursor-pointer hover:underline"
                    onClick={() => handleRowClick(row.original)}
                >
                    {row.original.document_number || '-'}
                </span>
            )
        },
        {
            header: isRTL ? 'النوع' : 'Type',
            accessorKey: 'type',
            cell: ({ row }: any) => {
                const type = row.original.type;
                let colorClass = 'bg-gray-100 text-gray-800';

                switch (type) {
                    case 'quotation': colorClass = 'bg-purple-100/50 text-purple-700 border-purple-200'; break;
                    case 'order': colorClass = 'bg-blue-100/50 text-blue-700 border-blue-200'; break;
                    case 'delivery': colorClass = 'bg-orange-100/50 text-orange-700 border-orange-200'; break;
                    case 'invoice': colorClass = 'bg-indigo-100/50 text-indigo-700 border-indigo-200'; break;
                    case 'return': colorClass = 'bg-rose-100/50 text-rose-700 border-rose-200'; break;
                    case 'reservation': colorClass = 'bg-cyan-100/50 text-cyan-700 border-cyan-200'; break;
                }

                return (
                    <Badge variant="outline" className={`capitalize ${colorClass} font-medium px-2 py-0.5`}>
                        {t(`sales.types.${type}`) || type}
                    </Badge>
                );
            }
        },
        {
            header: isRTL ? 'التاريخ' : 'Date',
            accessorKey: 'date',
            enableSorting: true,
            cell: ({ row }: any) => <span className="text-gray-600 font-mono text-xs">{new Date(row.original.date || row.original.created_at).toLocaleDateString()}</span>
        },
        {
            header: isRTL ? 'العميل' : 'Customer',
            accessorKey: 'customer_id',
            cell: ({ row }: any) => <span className="font-medium">{row.original.customer_name_display}</span>
        },
        {
            header: isRTL ? 'الإجمالي' : 'Total',
            accessorKey: 'total_amount',
            cell: ({ row }: any) => (
                <span className="font-mono font-bold tracking-tight">
                    {Number(row.original.total_amount || 0).toLocaleString()} <span className="text-xs text-gray-500">{row.original.currency || 'SAR'}</span>
                </span>
            )
        },
        {
            header: isRTL ? 'الحالة' : 'Status',
            accessorKey: 'status',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${['approved', 'confirmed', 'posted', 'delivered'].includes(row.original.status) ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="capitalize text-sm text-gray-600">{row.original.status}</span>
                </div>
            )
        },
        {
            id: 'actions',
            cell: ({ row }: any) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRowClick(row.original)}>
                            {isRTL ? 'عرض التفاصيل' : 'View Details'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ];


    // Kanban column definitions (matching existing sub-tabs exactly)
    const kanbanColumns = useMemo(() => [
        {
            id: 'quotation',
            title: isRTL ? 'عروض الأسعار' : 'Quotations',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40',
            accentHex: '#9333ea',
            icon: <FileText className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'reservation',
            title: isRTL ? 'الحجوزات' : 'Reservations',
            color: 'border-cyan-500',
            bgColor: 'bg-cyan-50/40',
            accentHex: '#0891b2',
            icon: <Package className="w-4 h-4 text-cyan-600" />,
        },
        {
            id: 'order',
            title: isRTL ? 'أوامر البيع' : 'Orders',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40',
            accentHex: '#2563eb',
            icon: <ShoppingCart className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'delivery',
            title: isRTL ? 'أذونات التسليم' : 'Deliveries',
            color: 'border-orange-500',
            bgColor: 'bg-orange-50/40',
            accentHex: '#ea580c',
            icon: <Truck className="w-4 h-4 text-orange-600" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'فواتير المبيعات' : 'Invoices',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#4f46e5',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'return',
            title: isRTL ? 'المرتجعات' : 'Returns',
            color: 'border-rose-500',
            bgColor: 'bg-rose-50/40',
            accentHex: '#e11d48',
            icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
        },
    ], [isRTL]);

    // Kanban items
    const kanbanItems = useMemo(() =>
        enrichedDocuments.map(doc => ({
            id: doc.id,
            columnId: doc.type,
            content: doc as Record<string, any>,
        }))
        , [enrichedDocuments]);

    if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg mx-4 mt-4 border border-red-100">
        <p className="font-bold">Error loading sales documents</p>
        <p className="text-sm opacity-80 mt-1">{(error as Error).message}</p>
    </div>;

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* ─── Top Fixed Row: Title + View Switcher + Create Button ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('sales.cycle')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('sales.cycleSubtitle')}
                        </p>
                    </div>
                </div>

                {/* View Switcher + Create Button (always visible, fixed position) */}
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
                    <div className="flex items-center gap-0 shadow-sm rounded-md shrink-0">
                        <Button
                            onClick={() => handleCreate(
                                activeTab === 'invoice' ? 'invoice' :
                                    activeTab === 'quotation' ? 'quotation' :
                                        activeTab === 'delivery' ? 'delivery' :
                                            activeTab === 'reservation' ? 'reservation' :
                                                activeTab === 'return' ? 'return' :
                                                    'order'
                            )}
                            className={`rounded-e-none gap-2 px-4 h-9 text-white shadow-sm ${activeTab === 'invoice' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                activeTab === 'return' ? 'bg-rose-600 hover:bg-rose-700' :
                                    activeTab === 'delivery' ? 'bg-orange-600 hover:bg-orange-700' :
                                        activeTab === 'reservation' ? 'bg-cyan-600 hover:bg-cyan-700' :
                                            activeTab === 'quotation' ? 'bg-purple-600 hover:bg-purple-700' :
                                                'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            {activeTab === 'invoice' ? (isRTL ? 'فاتورة مبيعات' : 'New Invoice') :
                                activeTab === 'quotation' ? (isRTL ? 'عرض سعر' : 'New Quotation') :
                                    activeTab === 'delivery' ? (isRTL ? 'إذن تسليم' : 'New Delivery') :
                                        activeTab === 'reservation' ? (isRTL ? 'حجز بضائع' : 'New Reservation') :
                                            activeTab === 'return' ? (isRTL ? 'مرتجع مبيعات' : 'New Return') :
                                                (isRTL ? 'أمر بيع جديد' : 'New Order')}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className={`border-s border-white/20 rounded-s-none px-2 h-9 text-white ${activeTab === 'invoice' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    activeTab === 'return' ? 'bg-rose-600 hover:bg-rose-700' :
                                        activeTab === 'delivery' ? 'bg-orange-600 hover:bg-orange-700' :
                                            activeTab === 'reservation' ? 'bg-cyan-600 hover:bg-cyan-700' :
                                                activeTab === 'quotation' ? 'bg-purple-600 hover:bg-purple-700' :
                                                    'bg-blue-600 hover:bg-blue-700'
                                    }`}>
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{isRTL ? 'إنشاء مستند جديد' : 'Create New Document'}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCreate('quotation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-purple-100 rounded text-purple-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'عرض سعر' : 'Quotation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('reservation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-cyan-100 rounded text-cyan-600"><Package className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'حجز بضائع' : 'Reservation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('order')} className="gap-2 cursor-pointer py-2.5 bg-blue-50/50">
                                    <div className="p-1 bg-blue-100 rounded text-blue-600"><ShoppingCart className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'أمر بيع' : 'Sales Order'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('delivery')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-orange-100 rounded text-orange-600"><Truck className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'إذن تسليم' : 'Delivery Note'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('invoice')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-indigo-100 rounded text-indigo-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'فاتورة مبيعات' : 'Sales Invoice'}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Tabs (list only) + Date Picker ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    {/* Tabs — only in list mode */}
                    {viewMode === 'list' && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                            <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                                <TabsTrigger value="quotation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'عروض الأسعار' : 'Quotations'}</TabsTrigger>
                                <TabsTrigger value="reservation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-cyan-600">{isRTL ? 'الحجوزات' : 'Reservations'}</TabsTrigger>
                                <TabsTrigger value="order" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'أوامر البيع' : 'Orders'}</TabsTrigger>
                                <TabsTrigger value="delivery" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-orange-600">{isRTL ? 'أذونات التسليم' : 'Deliveries'}</TabsTrigger>
                                <TabsTrigger value="invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-indigo-600">{isRTL ? 'فواتير المبيعات' : 'Invoices'}</TabsTrigger>
                                <TabsTrigger value="return" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-rose-600">{isRTL ? 'المرتجعات' : 'Returns'}</TabsTrigger>
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
                            data={enrichedDocuments}
                            columns={columns}
                            enableSearch={true}
                            searchPlaceholder={isRTL ? 'بحث برقم المستند...' : 'Search document #...'}
                            pageSize={15}
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
                            currency="SAR"
                            isLoading={isLoading}
                            emptyText={isRTL ? 'لا توجد مستندات' : 'No documents'}
                            getItemValue={(content) => Number(content.total_amount || 0)}
                            renderCard={(doc, _colId) => (
                                <div
                                    className="p-3.5 space-y-2.5 cursor-pointer"
                                    onClick={() => handleRowClick(doc as any)}
                                >
                                    {/* Header: Doc # + Status */}
                                    <div className="flex justify-between items-start">
                                        <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                            {doc.document_number || '-'}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] h-5 px-1.5 border capitalize ${['approved', 'confirmed', 'posted', 'delivered'].includes(doc.status)
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : doc.status === 'cancelled'
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}
                                        >
                                            {doc.status}
                                        </Badge>
                                    </div>

                                    {/* Customer Name */}
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1" title={doc.customer_name_display || doc.customer_name}>
                                        {doc.customer_name_display || doc.customer_name || (isRTL ? 'عميل غير محدد' : 'Unknown Client')}
                                    </p>

                                    {/* Footer: Date + Value */}
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100/80">
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {doc.date ? new Date(doc.date).toLocaleDateString() : '-'}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-erp-navy">
                                            {Number(doc.total_amount || 0).toLocaleString()}{' '}
                                            <span className="text-[10px] text-gray-400">{doc.currency || 'SAR'}</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                            onCardMove={(itemId, fromColumn, toColumn) => {
                                console.log(`Move ${itemId} from ${fromColumn} to ${toColumn}`);
                                toast.info(
                                    isRTL
                                        ? `تم نقل المستند من "${kanbanColumns.find(c => c.id === fromColumn)?.title}" إلى "${kanbanColumns.find(c => c.id === toColumn)?.title}"`
                                        : `Document moved from "${fromColumn}" to "${toColumn}"`
                                );
                            }}
                        />
                    </div>
                )}

                {isSheetOpen && (
                    <UnifiedTradeSheet
                        open={isSheetOpen}
                        onOpenChange={(open) => {
                            setIsSheetOpen(open);
                            if (!open) setSelectedDoc(null);
                        }}
                        mode="sales"
                        type={(docMode === 'create' ? newDocType : selectedDoc?.type) as any}
                        initialData={docMode === 'create' ? { type: newDocType, status: 'draft', currency: 'SAR', date: new Date().toISOString() } : selectedDoc}
                    />
                )}
            </div>
        </div>
    );
}
