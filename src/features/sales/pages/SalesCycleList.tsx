import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Calendar,
    ShoppingCart,
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
import { NexaKanbanBoard } from '@/components/ui/nexa-kanban/NexaKanbanBoard';
import { NexaSalesTable } from '@/features/sales/components/NexaSalesTable';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { validateTradeDocument } from '@/features/trade/utils/validateTradeDocument';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { useCompanyCurrencies } from '@/hooks/useCompanyCurrencies';

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
    // Raw data from Supabase (including notes with items JSON)
    _rawData?: any;
}

export default function SalesCycleList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { baseCurrency, supportedCurrencies } = useCompanyCurrencies();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();

    // 🔄 Realtime: auto-update when any user changes sales documents
    useRealtimeInvalidation({
        table: 'sales_orders',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['sales_cycle_full']],
    });
    useRealtimeInvalidation({
        table: 'quotations',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['sales_cycle_full']],
    });
    useRealtimeInvalidation({
        table: 'sales_invoices',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['sales_cycle_full']],
    });

    // State
    const [activeTab, setActiveTab] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [viewModeLoaded, setViewModeLoaded] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<SalesDocument | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');
    const [newDocType, setNewDocType] = useState<CycleType>('order');

    // Currency selection with persistence
    const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
        try { return localStorage.getItem('sales_cycle_currency') || ''; } catch { return ''; }
    });
    const activeCurrency = selectedCurrency || baseCurrency;
    const handleCurrencyChange = useCallback((cur: string) => {
        setSelectedCurrency(cur);
        try { localStorage.setItem('sales_cycle_currency', cur); } catch { }
    }, []);

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
            const fetchTable = async (table: string, type: CycleType, dateCol: string, numCol: string, amountCol?: string, extraProps: (item: any) => any = () => ({})) => {
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
                    customer_name: item.customer_name,
                    currency: item.currency || activeCurrency,
                    created_at: item.created_at,
                    original_table: table,
                    _rawData: item, // Preserve raw data including notes JSON
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

    // ─── Parse notes JSON to extract cart items ───
    const parseDocumentItems = useCallback((doc: SalesDocument): any[] => {
        try {
            const raw = doc._rawData;
            if (!raw?.notes) return [];
            const parsed = typeof raw.notes === 'string' ? JSON.parse(raw.notes) : raw.notes;
            if (parsed?._source === 'cart' && Array.isArray(parsed.items)) {
                return parsed.items;
            }
            return [];
        } catch {
            return [];
        }
    }, []);

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

    // ─── Table map for reverse-lookup (CycleType → Supabase table config) ───
    const TABLE_MAP_REVERSE: Record<CycleType, {
        table: string;
        dateCol: string;
        numCol: string;
        totalCol?: string;
    }> = {
        quotation: { table: 'quotations', dateCol: 'quotation_date', numCol: 'quotation_number', totalCol: 'total_amount' },
        order: { table: 'sales_orders', dateCol: 'order_date', numCol: 'order_number', totalCol: 'total_amount' },
        delivery: { table: 'sales_deliveries', dateCol: 'delivery_date', numCol: 'delivery_number' },
        invoice: { table: 'sales_invoices', dateCol: 'invoice_date', numCol: 'invoice_number', totalCol: 'total_amount' },
        return: { table: 'sales_returns', dateCol: 'return_date', numCol: 'return_number', totalCol: 'total_amount' },
        reservation: { table: 'transit_reservations', dateCol: 'reservation_date', numCol: 'reservation_number' },
    };

    // ─── Save document to Supabase (on explicit Save button click) ───
    const handleDocumentSave = useCallback(async (docData: any) => {
        if (!selectedDoc?.id || !selectedDoc?.type) {
            toast.error(isRTL ? 'لا يمكن الحفظ — المستند غير محدد' : 'Cannot save — document not identified');
            return;
        }

        // ─── Validation ───
        const validation = validateTradeDocument({
            data: docData,
            mode: 'sales',
            action: 'save',
            creditLimit: docData._creditLimit,
            balance: docData._balance,
            isCreditExceeded: docData._isCreditExceeded,
        });

        if (!validation.isValid) {
            validation.errors.forEach(err => {
                toast.error(isRTL ? err.messageAr : err.messageEn);
            });
            return;
        }

        // Show warnings as info toasts (non-blocking)
        validation.warnings.forEach(warn => {
            toast.warning(isRTL ? warn.messageAr : warn.messageEn);
        });

        const originalType = selectedDoc.type;
        const newType = (docData.subType || docData.type || originalType) as CycleType;
        const isTypeChanged = newType !== originalType && TABLE_MAP_REVERSE[newType];

        const targetConfig = TABLE_MAP_REVERSE[isTypeChanged ? newType : originalType];
        if (!targetConfig) {
            toast.error(isRTL ? 'نوع مستند غير مدعوم' : 'Unsupported document type');
            return;
        }

        try {
            // Build the update/insert payload
            const payload: Record<string, any> = {
                // Keep existing status unless explicitly changed, or set to 'saved' on first save
                status: docData.status || selectedDoc.status || 'saved',
            };

            // Customer
            if (docData.customer_id) {
                payload.customer_id = docData.customer_id;
            }
            if (docData.customer_name) {
                payload.customer_name = docData.customer_name;
            }

            // Warehouse (single)
            if (docData.warehouse_id) {
                payload.warehouse_id = docData.warehouse_id;
            }

            // Total amount
            if (targetConfig.totalCol && docData.total_amount != null) {
                payload[targetConfig.totalCol] = docData.total_amount;
            }

            // Currency
            if (docData.currency) {
                payload.currency = docData.currency;
            }

            // Date
            if (docData.date) {
                payload[targetConfig.dateCol] = new Date(docData.date).toISOString().split('T')[0];
            }

            // Reference number
            if (docData.reference_number) {
                payload.reference_number = docData.reference_number;
            }

            // ─── New Trade Fields ───
            // Salesperson
            if (docData.salesperson_id !== undefined) {
                payload.salesperson_id = docData.salesperson_id || null;
            }

            // Due date
            if (docData.due_date) {
                payload.due_date = new Date(docData.due_date).toISOString().split('T')[0];
            }

            // Exchange rate
            if (docData.exchange_rate != null) {
                payload.exchange_rate = Number(docData.exchange_rate) || 1;
            }

            // Payment terms days
            if (docData.payment_terms_days != null) {
                payload.payment_terms_days = Number(docData.payment_terms_days) || 0;
            }

            // Document-level discount
            if (docData.discount_percent != null) {
                payload.discount_percent = Number(docData.discount_percent) || 0;
            }

            // Price list tracking
            if (docData.price_list_id !== undefined) {
                payload.price_list_id = docData.price_list_id || null;
            }

            // Re-serialize items back into notes JSON (with currency, exchange_rate, user_notes)
            const notesPayload: Record<string, any> = {
                _source: 'cart',
            };

            if (docData.items && docData.items.length > 0) {
                notesPayload.items = docData.items.map((item: any) => ({
                    material_id: item.material_id,
                    material_code: item.material_code,
                    material_name_ar: item.material_name_ar,
                    material_name_en: item.material_name_en,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    total: item.total,
                    discount_percent: item.discount_percent,
                    discount_amount: item.discount_amount,
                    currency: item.currency,
                    exchange_rate: item.exchange_rate,
                    warehouse_id: item.warehouse_id,
                    warehouse_name_ar: item.warehouse_name_ar,
                    warehouse_name_en: item.warehouse_name_en,
                    preferred_rolls: item.preferred_rolls,
                }));
            }

            // Attach user-facing notes inside the JSON
            if (docData.user_notes != null) {
                notesPayload.user_notes = docData.user_notes;
            }

            payload.notes = JSON.stringify(notesPayload);

            if (isTypeChanged) {
                // ═══ TYPE CONVERSION: Move document to new table ═══
                // 1. Copy company_id + tenant_id + created_by from raw data (required for RLS)
                payload.company_id = selectedDoc._rawData?.company_id || companyId;
                payload.tenant_id = selectedDoc._rawData?.tenant_id;
                payload.created_by = selectedDoc._rawData?.created_by;

                // If tenant_id/created_by not in raw data, fetch from user metadata
                if (!payload.tenant_id || !payload.created_by) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!payload.tenant_id) payload.tenant_id = user?.user_metadata?.tenant_id;
                    if (!payload.created_by) payload.created_by = user?.id;
                }

                // 2. Generate the document number for the target table
                const NUM_PREFIX: Record<CycleType, string> = {
                    quotation: 'QTN',
                    order: 'SO',
                    delivery: 'DN',
                    invoice: 'INV',
                    return: 'RET',
                    reservation: 'RSV',
                };
                const prefix = NUM_PREFIX[newType] || 'DOC';
                const randomSuffix = crypto.randomUUID().substring(0, 8).toUpperCase();
                payload[targetConfig.numCol] = `${prefix}-${randomSuffix}`;

                // Remove the old table's number column if present (prevent unknown column error)
                const oldConfig = TABLE_MAP_REVERSE[originalType];
                if (oldConfig && oldConfig.numCol !== targetConfig.numCol) {
                    delete payload[oldConfig.numCol];
                }
                // Also remove old date column if different
                if (oldConfig && oldConfig.dateCol !== targetConfig.dateCol) {
                    delete payload[oldConfig.dateCol];
                }

                // 3. Insert into new table
                const { data: newRecord, error: insertErr } = await supabase
                    .from(targetConfig.table)
                    .insert(payload)
                    .select('id')
                    .single();

                if (insertErr) throw insertErr;

                // 4. Delete from old table
                const oldTableConfig = TABLE_MAP_REVERSE[originalType];
                if (oldTableConfig) {
                    const { error: delErr } = await supabase
                        .from(oldTableConfig.table)
                        .delete()
                        .eq('id', selectedDoc.id);

                    if (delErr) {
                        console.warn('Failed to remove old record:', delErr.message);
                        // Not critical — the new record was already created
                    }
                }

                toast.success(
                    isRTL
                        ? `تم تحويل المستند إلى ${newType === 'order' ? 'طلب' : newType === 'invoice' ? 'فاتورة' : newType} بنجاح ✅`
                        : `Document converted to ${newType} successfully ✅`
                );
            } else {
                // ═══ SAME TYPE: Just update in place ═══
                const { error } = await supabase
                    .from(targetConfig.table)
                    .update(payload)
                    .eq('id', selectedDoc.id);

                if (error) throw error;

                toast.success(isRTL ? 'تم حفظ المستند بنجاح ✅' : 'Document saved successfully ✅');
            }

            // Refresh the list
            queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });

            setIsSheetOpen(false);
            setSelectedDoc(null);
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(isRTL ? `خطأ في الحفظ: ${err.message}` : `Save error: ${err.message}`);
        }
    }, [selectedDoc, isRTL, queryClient, companyId]);

    // ─── Auto-save as draft when closing the sheet ───
    const handleSheetClose = useCallback(async (open: boolean) => {
        if (!open && selectedDoc?.id && docMode !== 'create') {
            // Keep status as-is (draft remains draft, saved remains saved)
            // No need to auto-save on close for existing documents
        }
        setIsSheetOpen(open);
        if (!open) setSelectedDoc(null);
    }, [selectedDoc, docMode]);

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

                    {/* Currency Selector */}
                    {supportedCurrencies.length > 1 && (
                        <div className="flex bg-muted/50 p-1 rounded-lg border border-gray-200/50">
                            {supportedCurrencies.map(cur => (
                                <Button key={cur} variant="ghost" size="sm"
                                    className={`h-8 px-2.5 text-xs font-medium transition-all ${activeCurrency === cur
                                        ? 'bg-white shadow-sm text-erp-navy dark:bg-gray-800 dark:text-white font-bold'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    onClick={() => handleCurrencyChange(cur)}
                                >
                                    {cur}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Content Area ─── */}
                {viewMode === 'list' ? (
                    <div className="flex-1 min-h-0 border rounded-xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
                        <NexaSalesTable
                            data={enrichedDocuments}
                            isLoading={isLoading}
                            pageSize={15}
                            onRowClick={handleRowClick}
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
                            currency={activeCurrency}
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
                                            <span className="text-[10px] text-gray-400">{doc.currency || activeCurrency}</span>
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
                        onOpenChange={handleSheetClose}
                        mode="sales"
                        type={(docMode === 'create' ? newDocType : selectedDoc?.type) as any}
                        initialData={docMode === 'create'
                            ? { type: newDocType, status: 'draft', currency: activeCurrency, date: new Date().toISOString() }
                            : selectedDoc ? {
                                ...selectedDoc,
                                ...selectedDoc._rawData,
                                items: parseDocumentItems(selectedDoc),
                                type: selectedDoc.type,
                            } : selectedDoc
                        }
                        onSave={selectedDoc?.id ? handleDocumentSave : undefined}
                    />
                )}
            </div>
        </div>
    );
}
