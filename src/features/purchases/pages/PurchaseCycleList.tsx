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
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
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
type CycleType = 'request' | 'quotation' | 'order' | 'receipt' | 'invoice' | 'return';

interface PurchaseDocument {
    id: string;
    order_number: string;
    date: string;
    type: CycleType;
    status: string;
    total_amount: number;
    supplier_id?: string;
    supplier_name?: string;
    currency: string;
    created_at: string;
    original_table: string;
    container_number?: string;
    receipt_type?: 'direct' | 'shipment';
    shipment_id?: string;
}

export default function PurchaseCycleList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    // 🔄 Realtime: auto-update when purchase documents change
    useRealtimeInvalidation({
        table: 'purchase_orders',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['purchase_cycle_full']],
    });
    useRealtimeInvalidation({
        table: 'purchase_invoices',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['purchase_cycle_full']],
    });

    // State
    const [activeTab, setActiveTab] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<PurchaseDocument | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');
    const [newDocType, setNewDocType] = useState<CycleType>('order');

    // Date Filter State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // ─── Persist view mode preference ───
    const VIEW_PREF_KEY = 'purchase-cycle-view';

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

    // 1. Fetch Suppliers Map
    const { data: suppliersMap = {} } = useQuery({
        queryKey: ['suppliers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId);

            if (error) {
                console.warn('Suppliers fetch failed', error);
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

    // 2. Fetch Documents
    const { data: documents = [], isLoading, error, refetch } = useQuery({
        queryKey: ['purchase_cycle_full', companyId, activeTab, viewMode, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let allDocs: PurchaseDocument[] = [];
            const fromISO = dateRange?.from ? dateRange.from.toISOString() : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

            const fetchTable = async (table: string, type: CycleType, dateCol: string, numCol: string, amountCol?: string, extraSelect?: string) => {
                let selectQuery = extraSelect ? `${extraSelect}` : '*';

                let q = supabase
                    .from(table)
                    .select(selectQuery)
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
                    order_number: item[numCol] || item.id.substring(0, 8),
                    date: item[dateCol],
                    type: type,
                    status: item.status || 'draft',
                    total_amount: amountCol ? (item[amountCol] || 0) : 0,
                    supplier_id: item.supplier_id,
                    currency: item.currency || '',
                    created_at: item.created_at,
                    original_table: table,
                    receipt_type: item.receipt_type,
                    container_number: item.shipment?.container_number,
                    shipment_id: item.shipment_id
                }));
            };

            const effectiveTab = viewMode === 'kanban' ? 'all' : activeTab;
            const fetchPromises = [];

            if (effectiveTab === 'all' || effectiveTab === 'request') {
                fetchPromises.push(fetchTable('purchase_requests', 'request', 'request_date', 'request_number'));
            }
            if (effectiveTab === 'all' || effectiveTab === 'quotation') {
                fetchPromises.push(fetchTable('purchase_quotations', 'quotation', 'quotation_date', 'quotation_number', 'total_amount'));
            }
            if (effectiveTab === 'all' || effectiveTab === 'order') {
                fetchPromises.push(fetchTable('purchase_orders', 'order', 'order_date', 'order_number', 'total_amount'));
            }
            if (effectiveTab === 'all' || effectiveTab === 'invoice') {
                fetchPromises.push(fetchTable('purchase_invoices', 'invoice', 'invoice_date', 'invoice_number', 'total_amount'));
            }
            if (effectiveTab === 'all' || effectiveTab === 'receipt') {
                fetchPromises.push(fetchTable(
                    'purchase_receipts', 'receipt', 'receipt_date', 'receipt_number',
                    undefined, '*, shipment:shipments(container_number)'
                ));
            }
            if (effectiveTab === 'all' || effectiveTab === 'return') {
                fetchPromises.push(fetchTable('purchase_returns', 'return', 'return_date', 'return_number', 'total_amount'));
            }

            const results = await Promise.all(fetchPromises);
            results.forEach(docs => allDocs = [...allDocs, ...docs]);

            return allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        enabled: !!companyId
    });

    // Combine Data with Supplier Names
    const enrichedDocuments = useMemo(() => {
        return documents.map(doc => ({
            ...doc,
            supplier_name: doc.supplier_id ? (suppliersMap[doc.supplier_id] || 'Unknown Supplier') : '-'
        })) as PurchaseDocument[];
    }, [documents, suppliersMap]);

    const handleRowClick = (row: PurchaseDocument) => {
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

    const getSheetDocType = (type: CycleType): DocType => {
        switch (type) {
            case 'order': return 'purchase_order';
            case 'request': return 'purchase_request';
            case 'quotation': return 'quotation';
            case 'receipt': return 'receipt';
            case 'invoice': return 'invoice';
            case 'return': return 'return' as DocType;
            default: return 'purchase_order';
        }
    }

    const handleTransitReservation = (doc: any) => {
        setNewDocType('reservation' as any);
        setSelectedDoc({
            ...doc,
            type: 'reservation',
            source_ref: doc.shipment_id || doc.id
        });
        setDocMode('create');
        setIsSheetOpen(true);
    };

    // Columns Configuration
    const columns = [
        {
            header: isRTL ? 'رقم المستند' : 'Document #',
            accessorKey: 'order_number',
            cell: ({ row }: any) => (
                <span
                    className="font-bold font-mono text-erp-primary cursor-pointer hover:underline"
                    onClick={() => handleRowClick(row.original)}
                >
                    {row.original.order_number || '-'}
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
                    case 'request': colorClass = 'bg-amber-100/50 text-amber-700 border-amber-200'; break;
                    case 'quotation': colorClass = 'bg-purple-100/50 text-purple-700 border-purple-200'; break;
                    case 'order': colorClass = 'bg-blue-100/50 text-blue-700 border-blue-200'; break;
                    case 'receipt': colorClass = 'bg-emerald-100/50 text-emerald-700 border-emerald-200'; break;
                    case 'invoice': colorClass = 'bg-indigo-100/50 text-indigo-700 border-indigo-200'; break;
                    case 'return': colorClass = 'bg-rose-100/50 text-rose-700 border-rose-200'; break;
                }

                return (
                    <Badge variant="outline" className={`capitalize ${colorClass} font-medium px-2 py-0.5`}>
                        {t(`purchases.types.${type}`) || type}
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
            header: isRTL ? 'المورد' : 'Supplier',
            accessorKey: 'supplier_id',
            cell: ({ row }: any) => <span className="font-medium">{row.original.supplier_name}</span>
        },
        {
            header: isRTL ? 'توضيح الاستلام' : 'Receipt Info',
            accessorKey: 'receipt_type',
            cell: ({ row }: any) => {
                if (row.original.type !== 'receipt') return <span className="text-gray-300">-</span>;

                const isShipment = row.original.receipt_type === 'shipment';
                return (
                    <div className="flex flex-col gap-0.5">
                        <Badge variant="secondary" className={`text-[10px] w-max ${isShipment ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                            {isShipment ? (isRTL ? 'شحنة/كونتينر' : 'Shipment/Container') : (isRTL ? 'مباشر' : 'Direct')}
                        </Badge>
                        {isShipment && row.original.container_number && (
                            <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                                <Truck className="w-3 h-3" /> {row.original.container_number}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: isRTL ? 'الإجمالي' : 'Total',
            accessorKey: 'total_amount',
            cell: ({ row }: any) => (
                <span className="font-mono font-bold tracking-tight">
                    {Number(row.original.total_amount || 0).toLocaleString()} <span className="text-xs text-gray-500">{row.original.currency || ''}</span>
                </span>
            )
        },
        {
            header: isRTL ? 'الحالة' : 'Status',
            accessorKey: 'status',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${['approved', 'confirmed', 'posted', 'received'].includes(row.original.status) ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="capitalize text-sm text-gray-600">{row.original.status}</span>
                </div>
            )
        },
        {
            id: 'actions',
            cell: ({ row }: any) => {
                const doc = row.original;
                const isOrderOrInvoice = (doc.type === 'order' || doc.type === 'invoice') && doc.status !== 'received';
                const isShipmentReceipt = doc.type === 'receipt' && doc.receipt_type === 'shipment' && doc.shipment_id;

                if (!isOrderOrInvoice && !isShipmentReceipt) return null;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>

                            {isOrderOrInvoice && (
                                <DropdownMenuItem onClick={() => {
                                    toast.info(isRTL ? 'تسجيل استلام بضائع...' : 'Recording Receipt...');
                                }}>
                                    <Truck className="mr-2 h-4 w-4" />
                                    {isRTL ? 'تسجيل استلام' : 'Record Receipt'}
                                </DropdownMenuItem>
                            )}

                            {isShipmentReceipt && (
                                <DropdownMenuItem onClick={() => handleTransitReservation(doc)}>
                                    <Truck className="mr-2 h-4 w-4" />
                                    {isRTL ? 'حجز بضاعة بالطريق' : 'Transit Reservation'}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        }
    ];

    // ─── Kanban Configuration ───
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'request',
            title: isRTL ? 'طلبات الشراء' : 'Requests',
            color: 'border-amber-500',
            bgColor: 'bg-amber-50/40',
            accentHex: '#d97706',
            icon: <Flag className="w-4 h-4 text-amber-600" />,
        },
        {
            id: 'quotation',
            title: isRTL ? 'عروض الأسعار' : 'Quotations',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40',
            accentHex: '#9333ea',
            icon: <FileText className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'order',
            title: isRTL ? 'أوامر الشراء' : 'Orders',
            color: 'border-teal-500',
            bgColor: 'bg-teal-50/40',
            accentHex: '#0d9488',
            icon: <ShoppingCart className="w-4 h-4 text-teal-600" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'فواتير المشتريات' : 'Invoices',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#4f46e5',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'receipt',
            title: isRTL ? 'استلام بضائع' : 'Receipts',
            color: 'border-emerald-500',
            bgColor: 'bg-emerald-50/40',
            accentHex: '#059669',
            icon: <Package className="w-4 h-4 text-emerald-600" />,
        },
        {
            id: 'return',
            title: isRTL ? 'مرتجعات' : 'Returns',
            color: 'border-rose-500',
            bgColor: 'bg-rose-50/40',
            accentHex: '#e11d48',
            icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
        },
    ], [isRTL]);

    const kanbanItems: KanbanItem[] = useMemo(() =>
        enrichedDocuments.map(doc => ({
            id: doc.id,
            columnId: doc.type,
            content: doc as Record<string, any>,
        }))
        , [enrichedDocuments]);

    if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg mx-4 mt-4 border border-red-100">
        <p className="font-bold">Error loading cycle documents</p>
        <p className="text-sm opacity-80 mt-1">{(error as Error).message}</p>
    </div>;

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* ─── Top Fixed Row: Title + View Switcher + Create Button ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-7 h-7 text-teal-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('purchases.cycle') || (isRTL ? 'دورة المشتريات' : 'Purchase Cycle')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('purchases.cycleSubtitle') || (isRTL ? 'طلبات الشراء وعروض الأسعار وأوامر الشراء والفواتير والاستلامات' : 'Requests, quotations, orders, invoices & receipts')}
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
                    <div className="flex items-center gap-0 shadow-sm rounded-md shrink-0">
                        <Button
                            onClick={() => handleCreate(
                                activeTab === 'invoice' ? 'invoice' :
                                    activeTab === 'quotation' ? 'quotation' :
                                        activeTab === 'request' ? 'request' :
                                            activeTab === 'return' ? 'return' :
                                                'order'
                            )}
                            className={`rounded-e-none gap-2 px-4 h-9 text-white shadow-sm ${activeTab === 'invoice' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                activeTab === 'return' ? 'bg-rose-600 hover:bg-rose-700' :
                                    activeTab === 'quotation' ? 'bg-purple-600 hover:bg-purple-700' :
                                        activeTab === 'request' ? 'bg-amber-600 hover:bg-amber-700' :
                                            'bg-teal-600 hover:bg-teal-700'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            {activeTab === 'invoice' ? (isRTL ? 'فاتورة شراء' : 'New Invoice') :
                                activeTab === 'quotation' ? (isRTL ? 'عرض سعر' : 'New Quotation') :
                                    activeTab === 'request' ? (isRTL ? 'طلب شراء' : 'New Request') :
                                        activeTab === 'return' ? (isRTL ? 'مرتجع شراء' : 'New Return') :
                                            (isRTL ? 'أمر شراء جديد' : 'New Order')}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className={`border-s border-white/20 rounded-s-none px-2 h-9 text-white ${activeTab === 'invoice' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    activeTab === 'return' ? 'bg-rose-600 hover:bg-rose-700' :
                                        activeTab === 'quotation' ? 'bg-purple-600 hover:bg-purple-700' :
                                            activeTab === 'request' ? 'bg-amber-600 hover:bg-amber-700' :
                                                'bg-teal-600 hover:bg-teal-700'
                                    }`}>
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{isRTL ? 'إنشاء مستند جديد' : 'Create New Document'}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCreate('request')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-orange-100 rounded text-orange-600"><Flag className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'طلب شراء' : 'Purchase Request'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('quotation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-purple-100 rounded text-purple-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'عرض سعر' : 'Quotation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('order')} className="gap-2 cursor-pointer py-2.5 bg-teal-50/50">
                                    <div className="p-1 bg-teal-100 rounded text-teal-600"><ShoppingCart className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'أمر شراء' : 'Purchase Order'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('invoice')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-indigo-100 rounded text-indigo-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'فاتورة مشتريات' : 'Purchase Invoice'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('return')} className="gap-2 cursor-pointer py-2.5 text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                                    <div className="p-1 bg-rose-100 rounded text-rose-600"><RotateCcw className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'مرتجع مشتريات' : 'Purchase Return'}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Tabs (list only) + Date Picker ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    {viewMode === 'list' && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                            <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                                <TabsTrigger value="request" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'طلبات الشراء' : 'Requests'}</TabsTrigger>
                                <TabsTrigger value="quotation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'عروض الأسعار' : 'Quotations'}</TabsTrigger>
                                <TabsTrigger value="order" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'أوامر الشراء' : 'Orders'}</TabsTrigger>
                                <TabsTrigger value="invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-indigo-600">{isRTL ? 'فواتير المشتريات' : 'Invoices'}</TabsTrigger>
                                <TabsTrigger value="receipt" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'استلام بضائع' : 'Receipts'}</TabsTrigger>
                                <TabsTrigger value="return" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-rose-600">{isRTL ? 'مرتجع' : 'Returns'}</TabsTrigger>
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
                            currency=""
                            isLoading={isLoading}
                            emptyText={isRTL ? 'لا توجد مستندات' : 'No documents'}
                            getItemValue={(content) => Number(content.total_amount || 0)}
                            renderCard={(doc, _colId) => (
                                <div
                                    className="p-3.5 space-y-2.5 cursor-pointer"
                                    onClick={() => handleRowClick(doc as any)}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                            {doc.order_number || '-'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${['approved', 'confirmed', 'posted', 'received'].includes(doc.status) ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="text-[10px] capitalize text-gray-500">{doc.status}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                        {doc.supplier_name || '-'}
                                    </p>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {doc.date ? new Date(doc.date).toLocaleDateString() : '-'}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-erp-navy">
                                            {Number(doc.total_amount || 0).toLocaleString()}{' '}
                                            <span className="text-[10px] text-gray-400">{doc.currency || ''}</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                            onCardMove={(itemId, fromColumn, toColumn) => {
                                const fromTitle = kanbanColumns.find(c => c.id === fromColumn)?.title;
                                const toTitle = kanbanColumns.find(c => c.id === toColumn)?.title;
                                toast.info(
                                    isRTL
                                        ? `تم نقل المستند من "${fromTitle}" إلى "${toTitle}"`
                                        : `Document moved from "${fromTitle}" to "${toTitle}"`
                                );
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Unified Trade Sheet */}
            {isSheetOpen && (
                <UnifiedTradeSheet
                    open={isSheetOpen}
                    onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (!open) setSelectedDoc(null);
                    }}
                    mode="purchase"
                    type={(docMode === 'create' ? newDocType : (selectedDoc?.type)) as any}
                    initialData={docMode === 'create' ? { type: newDocType, status: 'draft', currency: '', date: new Date().toISOString() } : selectedDoc}
                />
            )}
        </div>
    );
}
