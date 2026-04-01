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
    FileSearch,
    ShieldCheck,
    PackageCheck,
    BookCheck,
    LayoutGrid,
    List,
    Send,
    ArrowLeftRight,
    ArrowRight,
    Loader2,
    XCircle
} from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useQueryClient } from '@tanstack/react-query';
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
import { ContainerStatusBadge } from '@/features/trade/components/ContainerStatusStepper';
import type { DocType } from '@/components/sheets/configs/sheet.types';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { StatusDropdown } from '@/components/shared/status';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay, format } from 'date-fns';
import { toast } from 'sonner';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { usePosting } from '@/hooks/usePosting';
import { useStageTransition } from '@/features/trade/hooks/useStageTransition';

// Define Types
type CycleType = 'request' | 'quotation' | 'draft' | 'confirmed' | 'received' | 'posted' | 'cancelled' | 'receipt' | 'return';

interface PurchaseDocument {
    id: string;
    order_number: string;
    date: string;
    type: CycleType;
    status: string;
    stage?: string;
    total_amount: number;
    paid_amount?: number;
    balance?: number;
    supplier_id?: string;
    supplier_name?: string;
    currency: string;
    created_at: string;
    original_table: string;
    container_number?: string;
    receipt_type?: 'direct' | 'shipment';
    shipment_id?: string;
    warehouse_id?: string;
    receipt_mode?: string;
    confirmation_status?: string;
    is_posted?: boolean;
    _source_type?: string;
    container_status?: string;
    container_name?: string;
}

export default function PurchaseCycleList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { tenantId } = useAuth();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();
    const {
        postPurchaseInvoice,
        postPurchaseReceipt,
        postPurchaseReturn,
        convertQuotation,
        isPosting
    } = usePosting();


    // 🔄 Realtime: auto-update when purchase documents change
    useRealtimeInvalidation({
        table: 'purchase_orders',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['purchase_cycle_full']],
    });
    useRealtimeInvalidation({
        table: 'purchase_transactions',
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
    const [newDocType, setNewDocType] = useState<CycleType>('draft');

    // ─── New Unified Transaction Sheet (for invoice-type docs) ───
    const [isUnifiedSheetOpen, setIsUnifiedSheetOpen] = useState(false);
    const [unifiedTransactionId, setUnifiedTransactionId] = useState<string | null>(null);
    const [unifiedMode, setUnifiedMode] = useState<'create' | 'view' | 'edit'>('view');

    // ─── NexaListTable state ───
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<string | undefined>();
    const [sortAsc, setSortAsc] = useState(false);
    const handleSort = useCallback((field: string) => {
        setSortField(prev => {
            if (prev === field) { setSortAsc(a => !a); return field; }
            setSortAsc(false);
            return field;
        });
    }, []);

    // ═══ Stage Transition Hook (must be after state declarations) ═══
    const { advanceStage, isTransitioning } = useStageTransition({
        tradeMode: 'purchase',
        documentId: selectedDoc?.id || unifiedTransactionId,
        currentData: selectedDoc,
        onSuccess: (newStage) => {
            // Update local state to reflect the new stage  
            if (selectedDoc) {
                setSelectedDoc((prev: any) => prev ? { ...prev, stage: newStage, status: newStage === 'cancelled' ? 'cancelled' : prev.status } : prev);
            }
            refetch();
        },
    });

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
    const { data: suppliersMap = {} } = useCachedQuery({
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

    // 2. Fetch Documents — Unified: purchase_transactions + receipts + returns
    const purchaseCycleQuery = useCachedQuery({
        queryKey: ['purchase_cycle_full', companyId, activeTab, viewMode, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let allDocs: PurchaseDocument[] = [];
            const fromISO = dateRange?.from ? dateRange.from.toISOString() : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

            const effectiveTab = viewMode === 'kanban' ? 'all' : activeTab;

            // ═══ Fetch from purchase_transactions (unified table) ═══
            const shouldFetchTransactions = ['all', 'request', 'quotation', 'invoice'].includes(effectiveTab);
            if (shouldFetchTransactions) {
                let q = supabase
                    .from('purchase_transactions')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('doc_date', { ascending: false });

                if (fromISO) q = q.gte('doc_date', fromISO);
                if (toISO) q = q.lte('doc_date', toISO);

                // Tab-specific stage filtering
                if (effectiveTab === 'request') {
                    q = q.eq('stage', 'request');
                } else if (effectiveTab === 'quotation') {
                    q = q.eq('stage', 'quotation');
                } else if (effectiveTab === 'invoice') {
                    q = q.in('stage', ['draft', 'confirmed', 'received', 'posted', 'cancelled']);
                }

                const { data, error: txError } = await q;
                if (txError) {
                    console.warn('Failed to fetch purchase_transactions:', txError.message);
                } else {
                    const txDocs = (data || []).map((item: any) => {
                        return {
                            id: item.id,
                            order_number: item.invoice_no || item.id.substring(0, 8),
                            date: item.doc_date,
                            type: (item.stage || 'draft') as CycleType,
                            status: item.stage || 'draft',
                            stage: item.stage,
                            total_amount: item.total_amount || 0,
                            paid_amount: item.paid_amount || 0,
                            balance: item.balance || item.total_amount || 0,
                            supplier_id: item.supplier_id,
                            warehouse_id: item.warehouse_id,
                            receipt_mode: item.receipt_mode || 'direct',
                            currency: item.currency || '',
                            created_at: item.created_at,
                            original_table: 'purchase_transactions',
                            receipt_type: item.receipt_type,
                            shipment_id: item.shipment_id,
                            is_posted: item.is_posted,
                            container_number: item.container_number || null,
                            container_status: item.container_status || null,
                        };
                    });
                    allDocs.push(...txDocs);
                }
            }

            // ═══ Fetch purchase_receipts (delivery notes) ═══
            if (effectiveTab === 'all' || effectiveTab === 'receipt') {
                let rq = supabase
                    .from('purchase_receipts')
                    .select('*, shipment:shipments(container_number)')
                    .eq('company_id', companyId)
                    .order('receipt_date', { ascending: false });

                if (fromISO) rq = rq.gte('receipt_date', fromISO);
                if (toISO) rq = rq.lte('receipt_date', toISO);

                const { data: receipts } = await rq;
                const receiptDocs = (receipts || []).map((item: any) => ({
                    id: item.id,
                    order_number: item.receipt_number || item.id.substring(0, 8),
                    date: item.receipt_date,
                    type: 'receipt' as CycleType,
                    status: item.status || 'draft',
                    total_amount: 0,
                    supplier_id: item.supplier_id,
                    currency: item.currency || '',
                    created_at: item.created_at,
                    original_table: 'purchase_receipts',
                    container_number: item.shipment?.container_number,
                    shipment_id: item.shipment_id,
                }));
                allDocs.push(...receiptDocs);
            }

            // ═══ Fetch purchase_returns ═══
            if (effectiveTab === 'all' || effectiveTab === 'return') {
                let retq = supabase
                    .from('purchase_returns')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('return_date', { ascending: false });

                if (fromISO) retq = retq.gte('return_date', fromISO);
                if (toISO) retq = retq.lte('return_date', toISO);

                const { data: returns } = await retq;
                const returnDocs = (returns || []).map((item: any) => ({
                    id: item.id,
                    order_number: item.return_number || item.id.substring(0, 8),
                    date: item.return_date,
                    type: 'return' as CycleType,
                    status: item.status || 'draft',
                    total_amount: item.total_amount || 0,
                    supplier_id: item.supplier_id,
                    currency: item.currency || '',
                    created_at: item.created_at,
                    original_table: 'purchase_returns',
                }));
                allDocs.push(...returnDocs);
            }

            return allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ⚡ CACHE-FIRST: Don't show skeletons when query is disabled (auth init)
    const documents = purchaseCycleQuery.data ?? [];
    const isLoading = !!companyId && purchaseCycleQuery.isPending;
    const error = purchaseCycleQuery.error;
    const refetch = purchaseCycleQuery.refetch;

    // Combine Data with Supplier Names (container info already in query via join)
    const enrichedDocuments = useMemo(() => {
        return documents.map(doc => ({
            ...doc,
            supplier_name: doc.supplier_id ? (suppliersMap[doc.supplier_id] || 'Unknown Supplier') : '-',
        })) as PurchaseDocument[];
    }, [documents, suppliersMap]);

    const handleRowClick = (row: PurchaseDocument) => {
        // All purchase_transactions docs → use UnifiedTradeSheet
        if (row.original_table === 'purchase_transactions') {
            setSelectedDoc(row);
            setUnifiedTransactionId(row.id);
            setUnifiedMode('view');
            setIsUnifiedSheetOpen(true);
            return;
        }

        // Other types (receipts, returns) → use existing sheet
        setSelectedDoc(row);
        setDocMode('view');
        setIsSheetOpen(true);
    };

    // handleCreate: creates new doc in purchase_transactions with initial stage
    const handleCreate = (type: CycleType) => {
        // All new docs go through UnifiedTradeSheet as invoice-type
        // The stage is set on the initial data
        const initialStage = (['request', 'quotation', 'draft'].includes(type)) ? type : 'draft';
        setNewDocType(type);
        setSelectedDoc(null);
        setDocMode('create');

        // For transaction-type stages, use the unified sheet
        if (['request', 'quotation', 'draft', 'confirmed', 'received', 'posted'].includes(type)) {
            setUnifiedTransactionId(null);
            setUnifiedMode('create');
            setIsUnifiedSheetOpen(true);
        } else {
            setIsSheetOpen(true);
        }
    };

    const handleTransitReservation = (doc: any) => {
        setNewDocType('draft');
        setSelectedDoc({
            ...doc,
            type: 'draft',
            source_ref: doc.shipment_id || doc.id
        });
        setDocMode('create');
        setIsSheetOpen(true);
    };

    // Columns Configuration — NexaListTable format
    const columns: NexaListColumn<any>[] = [
        {
            id: 'order_number',
            header: isRTL ? 'رقم المستند' : 'Document #',
            sortable: true,
            sortKey: 'order_number',
            cell: (doc) => {
                return (
                    <div className="flex flex-col gap-0.5">
                        <span
                            className="font-bold font-mono text-[13px] text-erp-primary leading-tight"
                        >
                            {doc.order_number || '-'}
                        </span>
                        {doc.container_number && (
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-0.5">
                                    <Truck className="w-2.5 h-2.5" /> {doc.container_number}
                                </span>
                                {doc.container_status && (
                                    <ContainerStatusBadge status={doc.container_status} />
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'type',
            header: isRTL ? 'النوع' : 'Type',
            cell: (doc) => {
                const type = doc.type;
                let colorClass = 'bg-gray-100 text-gray-800';

                switch (type) {
                    case 'request': colorClass = 'bg-amber-100/50 text-amber-700 border-amber-200'; break;
                    case 'quotation': colorClass = 'bg-purple-100/50 text-purple-700 border-purple-200'; break;
                    case 'order': colorClass = 'bg-blue-100/50 text-blue-700 border-blue-200'; break;
                    case 'receipt': colorClass = 'bg-emerald-100/50 text-emerald-700 border-emerald-200'; break;
                    case 'invoice': colorClass = 'bg-indigo-100/50 text-indigo-700 border-indigo-200'; break;
                    case 'return': colorClass = 'bg-rose-100/50 text-rose-700 border-rose-200'; break;
                    case 'pending_receipt': colorClass = 'bg-orange-100/50 text-orange-700 border-orange-200'; break;
                }

                const typeLabel = type === 'pending_receipt'
                    ? (isRTL
                        ? `بانتظار الاستلام (${doc._source_type === 'order' ? 'أمر' : 'فاتورة'})`
                        : `Pending Receipt (${doc._source_type})`)
                    : (t(`purchases.types.${type}`) || type);

                return (
                    <Badge variant="outline" className={`capitalize ${colorClass} font-medium px-2 py-0.5`}>
                        {typeLabel}
                    </Badge>
                );
            }
        },
        {
            id: 'date',
            header: isRTL ? 'التاريخ والوقت' : 'Date & Time',
            sortable: true,
            sortKey: 'date',
            cell: (doc) => {
                const d = doc.date || doc.created_at;
                if (!d) return <span className="text-[11px] text-gray-300">—</span>;
                const dt = new Date(d);
                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar className="w-3 h-3 opacity-50" />
                            <span className="text-[12px] font-mono font-medium">
                                {format(dt, 'yyyy/MM/dd')}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono ps-[18px]">
                            {format(new Date(doc.created_at), 'HH:mm')}
                        </span>
                    </div>
                );
            }
        },
        {
            id: 'reference',
            header: isRTL ? 'المرجع' : 'Reference',
            cell: (doc) => (
                <span className="font-mono text-xs text-gray-500">
                    {doc.reference_number || '-'}
                </span>
            )
        },
        {
            id: 'supplier',
            header: isRTL ? 'المورد' : 'Supplier',
            cell: (doc) => {
                const name = doc.supplier_name || (isRTL ? 'مورد غير محدد' : 'Unknown');
                const initials = name === '-' ? '?' : name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0 shadow-sm">
                            {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {name}
                        </span>
                    </div>
                );
            }
        },
        {
            id: 'shipping',
            header: isRTL ? 'الشحن / الكونتينر' : 'Shipping / Container',
            cell: (doc) => {

                // Show container info for ANY document linked to a container
                if (doc.container_number || doc.container_status) {
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                <Truck className="w-3 h-3" /> {doc.container_number || '-'}
                            </span>
                            {doc.container_status && (
                                <ContainerStatusBadge status={doc.container_status} />
                            )}
                        </div>
                    );
                }

                // Pending receipt
                if (doc.type === 'pending_receipt') {
                    return (
                        <Badge variant="secondary" className="text-[10px] w-max bg-orange-50 text-orange-700 border-orange-200">
                            {isRTL ? '🚚 محلي - بانتظار' : '🚚 Direct - Awaiting'}
                        </Badge>
                    );
                }

                // Receipt documents
                if (doc.type === 'receipt') {
                    const isShipment = doc.receipt_type === 'shipment';
                    return (
                        <Badge variant="secondary" className={`text-[10px] w-max ${isShipment ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                            {isShipment ? (isRTL ? 'شحنة' : 'Shipment') : (isRTL ? 'مباشر' : 'Direct')}
                        </Badge>
                    );
                }

                return <span className="text-gray-300">-</span>;
            }
        },
        {
            id: 'total',
            header: isRTL ? 'الإجمالي' : 'Total',
            align: 'end',
            sortable: true,
            sortKey: 'total_amount',
            cell: (doc) => {
                const amount = Number(doc.total_amount || 0);
                if (amount === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight tabular-nums" dir="ltr">
                            {amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold">
                            {doc.currency || ''}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'receiving',
            header: isRTL ? 'الاستلام' : 'Receiving',
            cell: (doc) => {
                const receivedAt = doc.received_at;
                const postedAt = doc.posted_at;
                if (!receivedAt && !postedAt) {
                    if (['in_receiving', 'partially_received'].includes(doc.stage || doc.status)) {
                        return (
                            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-600 font-medium">
                                <PackageCheck className="w-3 h-3" />
                                {isRTL ? (doc.stage === 'partially_received' ? 'مستلم جزئياً' : 'قيد الاستلام') : (doc.stage === 'partially_received' ? 'Partial' : 'In receiving')}
                            </span>
                        );
                    }
                    return <span className="text-[11px] text-gray-300">—</span>;
                }
                return (
                    <div className="flex flex-col gap-0.5">
                        {receivedAt && (
                            <div className="flex items-center gap-1 text-[10px] text-teal-600 font-medium">
                                <PackageCheck className="w-3 h-3" />
                                {format(new Date(receivedAt), 'MM/dd HH:mm')}
                            </div>
                        )}
                        {postedAt && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <CheckCircle className="w-3 h-3" />
                                {format(new Date(postedAt), 'MM/dd HH:mm')}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            cell: (doc) => {
                const stage = doc.stage || doc.status || 'draft';

                // Compound status labels
                const stageConfig: Record<string, { bg: string; text: string; dot: string; labelAr: string; labelEn: string }> = {
                    draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', labelAr: 'مسودة', labelEn: 'Draft' },
                    quotation: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', labelAr: 'عرض سعر', labelEn: 'Quotation' },
                    order: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', labelAr: 'أمر شراء', labelEn: 'Order' },
                    approved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', labelAr: 'معتمد', labelEn: 'Approved' },
                    confirmed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', labelAr: 'مؤكد', labelEn: 'Confirmed' },
                    in_receiving: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500', labelAr: 'قيد الاستلام', labelEn: 'In Receiving' },
                    partially_received: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', labelAr: 'مستلم جزئياً', labelEn: 'Partially Received' },
                    received: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', labelAr: 'مستلمة', labelEn: 'Received' },
                    invoice: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', labelAr: 'فاتورة', labelEn: 'Invoice' },
                    posted: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', labelAr: doc.received_at ? 'مستلمة ومرحّلة' : 'مرحّلة', labelEn: doc.received_at ? 'Received & Posted' : 'Posted' },
                    paid: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', labelAr: 'مدفوع', labelEn: 'Paid' },
                    partial_paid: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', labelAr: 'مدفوع جزئياً', labelEn: 'Partially Paid' },
                    cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', labelAr: 'ملغاة', labelEn: 'Cancelled' },
                    closed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-500', labelAr: 'مغلقة', labelEn: 'Closed' },
                };
                const style = stageConfig[stage] || stageConfig.draft;

                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {isRTL ? style.labelAr : style.labelEn}
                    </span>
                );
            }
        },
    ];

    // Actions renderer for NexaListTable
    const renderRowActions = (doc: any) => {
        const isOrderOrInvoice = (doc.type === 'order' || doc.type === 'invoice') && doc.status !== 'received';
        const isShipmentReceipt = doc.type === 'receipt' && doc.receipt_type === 'shipment' && doc.shipment_id;
        const canPostInvoice = doc.type === 'invoice' && !['posted', 'cancelled'].includes(doc.status);
        const canPostReturn = doc.type === 'return' && !['posted', 'cancelled'].includes(doc.status);
        const canConvertQuotation = doc.type === 'quotation' && !['converted', 'cancelled'].includes(doc.status);
        const hasActions = isOrderOrInvoice || isShipmentReceipt || canPostInvoice || canPostReturn || canConvertQuotation;

        if (!hasActions) return null;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100" disabled={isPosting}>
                        {isPosting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[180px]">
                    <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {canPostInvoice && (
                        <DropdownMenuItem
                            onClick={async (e) => {
                                e.stopPropagation();
                                await postPurchaseInvoice(doc.id);
                            }}
                            className="gap-2 cursor-pointer text-green-700 focus:text-green-800 focus:bg-green-50"
                            disabled={isPosting}
                        >
                            <Send className="w-4 h-4" />
                            {isRTL ? 'ترحيل الفاتورة' : 'Post Invoice'}
                        </DropdownMenuItem>
                    )}

                    {canPostReturn && (
                        <DropdownMenuItem
                            onClick={async (e) => {
                                e.stopPropagation();
                                await postPurchaseReturn(doc.id);
                            }}
                            className="gap-2 cursor-pointer text-orange-700 focus:text-orange-800 focus:bg-orange-50"
                            disabled={isPosting}
                        >
                            <RotateCcw className="w-4 h-4" />
                            {isRTL ? 'ترحيل المرتجع' : 'Post Return'}
                        </DropdownMenuItem>
                    )}

                    {canConvertQuotation && (
                        <>
                            <DropdownMenuItem
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await convertQuotation(doc.id, 'purchase');
                                }}
                                className="gap-2 cursor-pointer text-purple-700 focus:text-purple-800 focus:bg-purple-50"
                                disabled={isPosting}
                            >
                                <ArrowLeftRight className="w-4 h-4" />
                                {isRTL ? 'تحويل إلى أمر شراء' : 'Convert to Order'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    toast.info(isRTL ? 'جاري التحويل إلى فاتورة...' : 'Converting to invoice...');
                                    try {
                                        const { data: quote } = await supabase
                                            .from('purchase_quotations')
                                            .select('*')
                                            .eq('id', doc.id)
                                            .single();
                                        if (quote) {
                                            handleCreate('draft');
                                            toast.success(isRTL ? '✅ تم فتح فاتورة جديدة من بيانات عرض السعر' : '✅ New invoice opened from quotation data');
                                        }
                                    } catch (err) {
                                        toast.error(isRTL ? '❌ خطأ في التحويل' : '❌ Conversion error');
                                    }
                                }}
                                className="gap-2 cursor-pointer text-indigo-700 focus:text-indigo-800 focus:bg-indigo-50"
                                disabled={isPosting}
                            >
                                <ArrowRight className="w-4 h-4" />
                                {isRTL ? 'تحويل إلى فاتورة مشتريات' : 'Convert to Invoice'}
                            </DropdownMenuItem>
                        </>
                    )}

                    {doc.type === 'order' && !['cancelled', 'closed'].includes(doc.status) && (
                        <DropdownMenuItem
                            onClick={async (e) => {
                                e.stopPropagation();
                                toast.info(isRTL ? 'جاري إنشاء فاتورة من أمر الشراء...' : 'Creating invoice from order...');
                                handleCreate('draft');
                            }}
                            className="gap-2 cursor-pointer text-indigo-700 focus:text-indigo-800 focus:bg-indigo-50"
                            disabled={isPosting}
                        >
                            <ArrowRight className="w-4 h-4" />
                            {isRTL ? 'تحويل إلى فاتورة مشتريات' : 'Convert to Invoice'}
                        </DropdownMenuItem>
                    )}

                    {(canPostInvoice || canPostReturn || canConvertQuotation) && (isOrderOrInvoice || isShipmentReceipt) && (
                        <DropdownMenuSeparator />
                    )}

                    {isOrderOrInvoice && (
                        <DropdownMenuItem onClick={() => {
                            toast.info(isRTL ? 'تسجيل استلام بضائع...' : 'Recording Receipt...');
                        }} className="gap-2 cursor-pointer">
                            <Truck className="w-4 h-4" />
                            {isRTL ? 'تسجيل استلام' : 'Record Receipt'}
                        </DropdownMenuItem>
                    )}

                    {isShipmentReceipt && (
                        <DropdownMenuItem onClick={() => handleTransitReservation(doc)} className="gap-2 cursor-pointer">
                            <Truck className="w-4 h-4" />
                            {isRTL ? 'حجز بضاعة بالطريق' : 'Transit Reservation'}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    // ─── Kanban Configuration — حسب الدستور: 6 أعمدة ───
    // request | quotation | invoice (يشمل draft+confirmed+received+posted) | receipt | return | cancelled
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'request',
            title: isRTL ? 'طلبات شراء' : 'Requests',
            color: 'border-amber-500',
            bgColor: 'bg-amber-50/40',
            accentHex: '#d97706',
            icon: <Flag className="w-4 h-4 text-amber-600" />,
        },
        {
            id: 'quotation',
            title: isRTL ? 'عروض سعر' : 'Quotations',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40',
            accentHex: '#9333ea',
            icon: <FileSearch className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'فواتير مشتريات' : 'Invoices',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#4f46e5',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'receipt',
            title: isRTL ? 'اذون تسليم' : 'Receipts',
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
        {
            id: 'cancelled',
            title: isRTL ? 'ملغاة' : 'Cancelled',
            color: 'border-red-400',
            bgColor: 'bg-red-50/30',
            accentHex: '#DC2626',
            icon: <XCircle className="w-4 h-4 text-red-500" />,
        },
    ], [isRTL]);

    // Map documents to Kanban columns:
    // - request/quotation → their own columns
    // - draft/confirmed/received/posted → "invoice" column (with stage badge on card)
    // - cancelled → "cancelled" column
    // - receipt/return → their own columns
    const kanbanItems: KanbanItem[] = useMemo(() =>
        enrichedDocuments.map(doc => {
            let columnId: string;
            const stage = doc.stage || doc.status || doc.type || 'draft';

            if (doc.original_table === 'purchase_receipts') {
                columnId = 'receipt';
            } else if (doc.original_table === 'purchase_returns') {
                columnId = 'return';
            } else if (stage === 'request') {
                columnId = 'request';
            } else if (stage === 'quotation') {
                columnId = 'quotation';
            } else if (stage === 'cancelled') {
                columnId = 'cancelled';
            } else {
                // draft, confirmed, received, posted → all go to "invoice" column
                columnId = 'invoice';
            }

            return {
                id: doc.id,
                columnId,
                content: doc as Record<string, any>,
            };
        })
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
                                activeTab === 'invoice' ? 'draft' :
                                    activeTab === 'quotation' ? 'quotation' :
                                        activeTab === 'request' ? 'request' :
                                            activeTab === 'return' ? 'return' :
                                                'draft'
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
                                            (isRTL ? 'فاتورة جديدة' : 'New Invoice')}
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
                                <DropdownMenuItem onClick={() => handleCreate('draft')} className="gap-2 cursor-pointer py-2.5 bg-teal-50/50">
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
                                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                                <TabsTrigger value="request" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-amber-600 font-tajawal">{isRTL ? 'طلبات شراء' : 'Requests'}</TabsTrigger>
                                <TabsTrigger value="quotation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-purple-600 font-tajawal">{isRTL ? 'عروض سعر' : 'Quotations'}</TabsTrigger>
                                <TabsTrigger value="invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-indigo-600 font-tajawal">{isRTL ? 'فواتير مشتريات' : 'Invoices'}</TabsTrigger>
                                <TabsTrigger value="receipt" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">{isRTL ? 'اذون تسليم' : 'Receipts'}</TabsTrigger>
                                <TabsTrigger value="return" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-rose-600 font-tajawal">{isRTL ? 'مرتجعات' : 'Returns'}</TabsTrigger>
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
                    <NexaListTable
                        data={enrichedDocuments}
                        columns={columns}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder={isRTL ? 'بحث برقم المستند أو المورد...' : 'Search document # or supplier...'}
                        totalCount={enrichedDocuments.length}
                        countLabel={isRTL ? 'مستند' : 'documents'}
                        sortField={sortField}
                        sortAsc={sortAsc}
                        onSort={handleSort}
                        onRowClick={handleRowClick}
                        getRowKey={(row: any) => row.id}
                        isLoading={isLoading}
                        emptyIcon={<FileText className="w-12 h-12 text-gray-300" />}
                        emptyMessage={isRTL ? 'لا توجد مستندات مشتريات' : 'No purchase documents found'}
                        showFooter={true}
                        footerLeftText={
                            isRTL
                                ? `عرض ${enrichedDocuments.length} مستند`
                                : `Showing ${enrichedDocuments.length} documents`
                        }
                        footerRightContent={
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300" dir="ltr">
                                    {isRTL ? 'الإجمالي: ' : 'Total: '}
                                    {enrichedDocuments.reduce((sum: number, d: any) => sum + Number(d.total_amount || 0), 0).toLocaleString()}
                                    <span className="text-gray-400 ms-1 text-xs">{enrichedDocuments[0]?.currency || ''}</span>
                                </span>
                            </div>
                        }
                        renderActions={renderRowActions}
                        isRTL={isRTL}
                        direction={direction}
                    />
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
                            renderCard={(doc, colId) => {
                                // ═══ Stage Badge for cards in "invoice" column ═══
                                const stage = (doc.stage || doc.status || 'draft') as string;
                                const totalAmt = Number(doc.total_amount || 0);
                                const paidAmt = Number(doc.paid_amount || 0);
                                const isPosted = doc.is_posted || stage === 'posted';
                                const isInvoiceCol = colId === 'invoice';

                                // Stage badge config (only shown in invoice column)
                                const stageBadges: Record<string, { label: string; cls: string }> = {
                                    draft: { label: isRTL ? '📝 مسودة' : '📝 Draft', cls: 'bg-gray-100 text-gray-700' },
                                    confirmed: { label: isRTL ? '🛡️ مؤكدة' : '🛡️ Confirmed', cls: 'bg-blue-100 text-blue-700' },
                                    received: { label: isRTL ? '📦 مستلمة' : '📦 Received', cls: 'bg-teal-100 text-teal-700' },
                                    posted: { label: isRTL ? '📊 مرحّلة' : '📊 Posted', cls: 'bg-green-100 text-green-700' },
                                };
                                const currentStageBadge = stageBadges[stage];

                                // Payment badge
                                const showPayment = ['confirmed', 'received', 'posted'].includes(stage) && totalAmt > 0;
                                const paymentBadge = paidAmt >= totalAmt && totalAmt > 0
                                    ? { icon: '🟢', label: isRTL ? 'مدفوعة' : 'Paid', cls: 'bg-green-50 text-green-700' }
                                    : paidAmt > 0
                                        ? { icon: '🟡', label: isRTL ? 'جزئي' : 'Partial', cls: 'bg-amber-50 text-amber-700' }
                                        : { icon: '🔴', label: isRTL ? 'غير مدفوعة' : 'Unpaid', cls: 'bg-red-50 text-red-700' };

                                return (
                                    <div
                                        className="p-3.5 space-y-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => handleRowClick(doc as any)}
                                    >
                                        {/* Row 1: Number + Stage badge (for invoice column) */}
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                                {doc.order_number || '-'}
                                            </span>
                                            {isInvoiceCol && currentStageBadge && (
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${currentStageBadge.cls}`}>
                                                    {currentStageBadge.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* Row 2: Supplier */}
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                            {doc.supplier_name || '-'}
                                        </p>

                                        {/* Row 3: Payment + Posted badges */}
                                        {showPayment && (
                                            <div className="flex flex-wrap gap-1">
                                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${paymentBadge.cls}`}>
                                                    {paymentBadge.icon} {paymentBadge.label}
                                                </span>
                                                {isPosted && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                                                        📊 {isRTL ? 'مرحّلة' : 'Posted'}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Row 4: Date + Amount */}
                                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {doc.date ? new Date(doc.date as string).toLocaleDateString() : '-'}
                                            </span>
                                            <span className="font-mono text-sm font-bold text-erp-navy">
                                                {totalAmt.toLocaleString()}{' '}
                                                <span className="text-[10px] text-gray-400">{doc.currency || ''}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                            onCardMove={async (itemId, fromColumn, toColumn) => {
                                const fromTitle = kanbanColumns.find(c => c.id === fromColumn)?.title;
                                const toTitle = kanbanColumns.find(c => c.id === toColumn)?.title;

                                // ═══ Allowed Kanban drag rules (constitution) ═══
                                // request ↔ quotation ↔ invoice (stage=draft)
                                // receipt, return, cancelled columns are READ-ONLY (no drop)
                                const allowedMoves: Record<string, string[]> = {
                                    request: ['quotation', 'invoice'],     // request → quotation or invoice(draft)
                                    quotation: ['request', 'invoice'],     // quotation → request or invoice(draft)
                                    invoice: ['request', 'quotation'],     // invoice(draft only) → back to request/quotation
                                };

                                const allowed = allowedMoves[fromColumn];
                                if (!allowed || !allowed.includes(toColumn)) {
                                    toast.error(
                                        isRTL
                                            ? `❌ لا يمكن نقل مستند من "${fromTitle}" إلى "${toTitle}"`
                                            : `❌ Cannot move from "${fromTitle}" to "${toTitle}"`
                                    );
                                    return;
                                }

                                // Find the actual document to check its stage
                                const movedDoc = enrichedDocuments.find(d => d.id === itemId);
                                if (!movedDoc) return;

                                // If moving FROM invoice column, only draft-stage docs can be moved back
                                if (fromColumn === 'invoice') {
                                    const docStage = movedDoc.stage || movedDoc.status || 'draft';
                                    if (docStage !== 'draft') {
                                        toast.error(
                                            isRTL
                                                ? `❌ لا يمكن نقل فاتورة "${docStage === 'confirmed' ? 'مؤكدة' : docStage === 'received' ? 'مستلمة' : 'مرحّلة'}" — فقط المسودات يمكن نقلها`
                                                : `❌ Cannot move a "${docStage}" invoice — only drafts can be moved`
                                        );
                                        return;
                                    }
                                }

                                // Determine target stage
                                const targetStage = toColumn === 'invoice' ? 'draft' : toColumn;

                                // Confirm the move
                                const confirmed = window.confirm(
                                    isRTL
                                        ? `هل تريد نقل المستند من "${fromTitle}" إلى "${toTitle}"؟`
                                        : `Move document from "${fromTitle}" to "${toTitle}"?`
                                );
                                if (!confirmed) return;

                                // ═══ Execute stage transition ═══
                                try {
                                    const { error: updateError } = await supabase
                                        .from('purchase_transactions')
                                        .update({ stage: targetStage })
                                        .eq('id', itemId);

                                    if (updateError) throw updateError;

                                    toast.success(
                                        isRTL
                                            ? `✅ تم نقل المستند إلى "${toTitle}"`
                                            : `✅ Document moved to "${toTitle}"`
                                    );
                                    refetch();
                                } catch (err: any) {
                                    toast.error(
                                        isRTL
                                            ? `❌ خطأ: ${err.message}`
                                            : `❌ Error: ${err.message}`
                                    );
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Unified Trade Sheet (for receipts/returns) */}
            {isSheetOpen && (
                <UnifiedTradeSheet
                    open={isSheetOpen}
                    onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (!open) {
                            setSelectedDoc(null);
                            refetch();
                        }
                    }}
                    mode="purchase"
                    type={(docMode === 'create' ? newDocType : (selectedDoc?.type)) as any}
                    initialData={docMode === 'create' ? { type: newDocType, status: 'draft', stage: 'draft', currency: '', date: new Date().toISOString() } : selectedDoc}
                    currentStage={selectedDoc?.stage || (docMode === 'create' ? 'draft' : undefined)}
                    onStageAdvance={advanceStage}
                    onRefresh={refetch}
                />
            )}

            {/* ★ Unified Trade Sheet (for all purchase_transactions stages) */}
            {isUnifiedSheetOpen && (
                <UnifiedTradeSheet
                    open={isUnifiedSheetOpen}
                    onOpenChange={(open) => {
                        setIsUnifiedSheetOpen(open);
                        if (!open) {
                            setUnifiedTransactionId(null);
                            setSelectedDoc(null);
                            refetch();
                        }
                    }}
                    mode="purchase"
                    type="invoice"
                    initialData={docMode === 'create'
                        ? { type: newDocType, status: newDocType, stage: newDocType, currency: '', date: new Date().toISOString() }
                        : (selectedDoc || undefined)}
                    currentStage={selectedDoc?.stage || (docMode === 'create' ? newDocType : undefined)}
                    onStageAdvance={advanceStage}
                    onRefresh={refetch}
                />
            )}
        </div>
    );
}
