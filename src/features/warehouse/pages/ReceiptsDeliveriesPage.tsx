/**
 * ════════════════════════════════════════════════════════════════
 * 📥 Receipts & Deliveries (أذون الاستلام والتسليم)
 * ════════════════════════════════════════════════════════════════
 *
 * Pattern: Uses shared NexaListTable component
 */

import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useStockMovements } from '../hooks/useWarehouseQueries';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { MaterialReceiptDialog } from '../components/MaterialReceiptDialog';
import { SalesDeliveryDialog } from '../components/SalesDeliveryDialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    ArrowDownToLine,
    Package,
    Truck,
    Clock,
    Eye,
    CheckCircle2,
    ClipboardList,
    RefreshCw,
} from 'lucide-react';

export default function ReceiptsDeliveriesPage() {
    const { language, isRTL, direction } = useLanguage();
    const { companyId } = useAuth();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');

    // ═══ State ═══
    const [mainTab, setMainTab] = useState<'pending' | 'completed'>('pending');
    const [subFilter, setSubFilter] = useState<'all' | 'purchases' | 'sales' | 'containers' | 'transfers'>('all');
    const [sortField, setSortField] = useState<string>('date');
    const [sortAsc, setSortAsc] = useState<boolean>(false);

    // ═══ Dialogs ═══
    const [receiptDialog, setReceiptDialog] = useState<{
        open: boolean;
        type: 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count';
        reference: string;
    }>({ open: false, type: 'purchase_local', reference: '' });

    const [linkedInvoiceSheet, setLinkedInvoiceSheet] = useState<{ open: boolean; invoiceData: any; mode?: 'purchase' | 'sales'; }>({ open: false, invoiceData: null });
    const [containerSheet, setContainerSheet] = useState<{ open: boolean; data: any; }>({ open: false, data: null });

    // Sales delivery dialog (uses UnifiedAccountingSheet like receipt dialog)
    const [salesDeliveryDialog, setSalesDeliveryDialog] = useState<{ open: boolean; salesInvoice: any; }>({ open: false, salesInvoice: null });

    // ⚡ React Query — Pull on Demand (no Realtime)
    const { pendingReceipts, completedReceipts, completedLoading, refetch: refetchMovements, loading: receiptsLoading } = useStockMovements({});
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const handleManualRefresh = useCallback(() => {
        refetchMovements();
        setLastRefreshed(new Date());
    }, [refetchMovements]);

    // ═══ Format Date (always English numerals) ═══
    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }
        catch { return dateStr; }
    }, []);

    // ═══ Elapsed Time Helper ═══
    const getElapsedTime = useCallback((startStr: string) => {
        if (!startStr) return '';
        const start = new Date(startStr);
        const diffMs = Date.now() - start.getTime();
        if (diffMs < 0) return '';

        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 60) return `${diffMins} ${isRTL ? 'د' : 'm'}`;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) return `${diffHours} ${isRTL ? 'س' : 'h'}`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ${isRTL ? 'يوم' : 'd'}`;
    }, [isRTL]);

    // ═══ Document Logic ═══
    const handleConfirmReceipt = useCallback((receipt: any) => {
        const docType = receipt.type || receipt.source_type || '';

        // Sales delivery → open SalesDeliveryDialog (roll picking)
        if (docType === 'sale_invoice') {
            setSalesDeliveryDialog({ open: true, salesInvoice: receipt });
            return;
        }

        // Purchase receipt → open receipt dialog
        let dialogType: any = 'purchase_local';
        if (docType === 'container') dialogType = 'container';
        else if (docType === 'transfer') dialogType = 'transfer';
        else if (docType === 'return') dialogType = 'return';
        setReceiptDialog({ open: true, type: dialogType, reference: receipt.source_id });
    }, []);

    const handleViewSourceDocument = useCallback(async (receipt: any) => {
        try {
            const sourceId = receipt.source_id || receipt.id;
            const docType = receipt.type || receipt.source_type || '';

            // 1. Container
            if (docType === 'container') {
                const { data: container } = await supabase.from('containers').select('*').eq('id', sourceId).maybeSingle();
                if (container) { setContainerSheet({ open: true, data: { ...container, party_id: container.supplier_id } }); return; }
                toast.error(isRTL ? 'الكونتينر غير موجود' : 'Container not found');
                return;
            }

            // 2. Sales invoice → open from sales_transactions
            if (docType === 'sale_invoice' || receipt.source_table === 'sales_transactions') {
                const { data: salesInv } = await supabase.from('sales_transactions').select('*').eq('id', sourceId).maybeSingle();
                if (salesInv) {
                    setLinkedInvoiceSheet({ open: true, invoiceData: salesInv, mode: 'sales' });
                    return;
                }
            }

            // 3. Try purchase_invoices (new table) by id
            const { data: newInv } = await supabase.from('purchase_invoices').select('*').eq('id', sourceId).maybeSingle();
            if (newInv) { setLinkedInvoiceSheet({ open: true, invoiceData: newInv, mode: 'purchase' }); return; }

            // 4. Try purchase_invoices by invoice_number
            const invoiceRef = receipt.reference || receipt.source_id;
            if (invoiceRef) {
                const { data: byNum } = await supabase.from('purchase_invoices').select('*').eq('invoice_number', invoiceRef).maybeSingle();
                if (byNum) { setLinkedInvoiceSheet({ open: true, invoiceData: byNum, mode: 'purchase' }); return; }
            }

            // 5. Fallback: legacy purchase_transactions table
            const { data: legacyInv } = await supabase.from('purchase_transactions').select('*').eq('id', sourceId).maybeSingle();
            if (legacyInv) { setLinkedInvoiceSheet({ open: true, invoiceData: legacyInv, mode: 'purchase' }); return; }

            // 6. Try PO
            if (docType === 'purchase_order' || receipt.source_table === 'purchase_orders') {
                window.open(`/purchases/orders?id=${sourceId}`, '_blank');
                return;
            }

            toast.error(isRTL ? 'المستند غير موجود في قاعدة البيانات' : 'Document not found in database');
        } catch (err: any) {
            console.error('handleViewSourceDocument error:', err);
            toast.error(isRTL ? 'خطأ في تحميل المستند' : 'Error loading document');
        }
    }, [isRTL]);

    // ═══ Filter Logic ═══
    const purchasesTypes = ['purchase_order', 'return', 'invoice', 'purchase', 'purchase_invoice'];
    const salesTypes = ['sale_order', 'issue', 'delivery', 'sale', 'sale_invoice'];

    const filteredPending = useMemo(() => {
        let result = pendingReceipts;
        if (subFilter === 'purchases') result = result.filter((r: any) => purchasesTypes.includes(r.type || r.source_type));
        else if (subFilter === 'sales') result = result.filter((r: any) => salesTypes.includes(r.type || r.source_type));
        else if (subFilter === 'containers') result = result.filter((r: any) => (r.type || r.source_type) === 'container');
        else if (subFilter === 'transfers') result = result.filter((r: any) => (r.type || r.source_type) === 'transfer');

        // Sorting logic
        if (sortField) {
            result = [...result].sort((a: any, b: any) => {
                let valA, valB;
                if (sortField === 'reference') { valA = a.reference || a.source_id; valB = b.reference || b.source_id; }
                else if (sortField === 'supplier') { valA = a.supplier_name || a.description; valB = b.supplier_name || b.description; }
                else if (sortField === 'amount') { valA = Number(a.total_amount || 0); valB = Number(b.total_amount || 0); }
                else if (sortField === 'date') { valA = new Date(a.pending_since || a.created_at || a.arrivalDate).getTime(); valB = new Date(b.pending_since || b.created_at || b.arrivalDate).getTime(); }
                else if (sortField === 'doc_status') { valA = a.invoice_status || a.status; valB = b.invoice_status || b.status; }
                else if (sortField === 'receipt_status') { valA = a.receipt_status || 'none'; valB = b.receipt_status || 'none'; }

                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [pendingReceipts, subFilter, sortField, sortAsc]);

    const counts = useMemo(() => {
        return {
            all: pendingReceipts.length,
            purchases: pendingReceipts.filter((r: any) => purchasesTypes.includes(r.type || r.source_type)).length,
            sales: pendingReceipts.filter((r: any) => salesTypes.includes(r.type || r.source_type)).length,
            containers: pendingReceipts.filter((r: any) => (r.type || r.source_type) === 'container').length,
            transfers: pendingReceipts.filter((r: any) => (r.type || r.source_type) === 'transfer').length,
        };
    }, [pendingReceipts]);

    const totalAmountPending = filteredPending.reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

    // ═══ Completed Receipts Columns ═══
    const completedColumns: NexaListColumn<any>[] = useMemo(() => [
        {
            id: 'receipt_number',
            header: isRTL ? 'رقم إذن الاستلام' : 'GRN #',
            sortable: true,
            sortKey: 'receipt_number',
            cell: (row: any) => (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div>
                        <span className="font-semibold font-mono text-sm block text-green-700">{row.receipt_number || row.id.slice(0, 8)}</span>
                        {row.created_by_name && (
                            <span className="text-[10px] text-muted-foreground block">{row.created_by_name}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'source',
            header: isRTL ? 'المصدر' : 'Source',
            cell: (row: any) => {
                const src = row.container_id
                    ? (isRTL ? '📦 كونتينر' : '📦 Container')
                    : row.invoice_id
                        ? (isRTL ? '📄 فاتورة' : '📄 Invoice')
                        : (isRTL ? '📋 طلب' : '📋 Order');
                return <span className="text-sm text-gray-600">{src}</span>;
            },
        },
        {
            id: 'rolls',
            header: isRTL ? 'رولونات' : 'Rolls',
            cell: (row: any) => (
                <span className="font-mono font-bold text-teal-700">
                    {row.total_rolls ?? '—'}
                </span>
            ),
        },
        {
            id: 'length',
            header: isRTL ? 'الكمية (م)' : 'Qty (m)',
            cell: (row: any) => (
                <span className="font-mono text-sm">
                    {row.total_length_m ? Number(row.total_length_m).toLocaleString() : '—'}
                </span>
            ),
        },
        {
            id: 'completed_date',
            header: isRTL ? 'تاريخ الاستلام' : 'Completed',
            sortable: true,
            sortKey: 'completed_date',
            cell: (row: any) => (
                <span className="text-sm text-muted-foreground font-mono">
                    {formatDate(row.receipt_date || row.updated_at)}
                </span>
            ),
        },
    ], [isRTL, formatDate]);

    const renderCompletedActions = useCallback((row: any) => (
        <div className="flex items-center gap-1.5 justify-end">
            <Button
                size="sm" variant="outline"
                className="h-8 px-2 text-xs border-gray-200 hover:border-green-400 hover:text-green-600 gap-1"
                onClick={(e) => {
                    e.stopPropagation();
                    const fakeRow = {
                        source_id: row.container_id || row.invoice_id || row.order_id,
                        type: row.container_id ? 'container' : 'invoice',
                    };
                    handleViewSourceDocument(fakeRow);
                }}
            >
                <Eye className="h-3.5 w-3.5" />
                {isRTL ? 'عرض' : 'View'}
            </Button>
        </div>
    ), [isRTL, handleViewSourceDocument]);

    // ═══ Columns ═══
    const columns: NexaListColumn<any>[] = useMemo(() => [
        {
            id: 'reference',
            header: isRTL ? 'رقم المستند' : 'Document #',
            sortable: true,
            sortKey: 'reference',
            cell: (row: any) => {
                const isContainer = row.type === 'container';
                const Icon = isContainer ? Package : Truck;
                return (
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", isContainer ? "text-cyan-600" : "text-emerald-600")} />
                        <div>
                            <span className="font-semibold font-mono text-sm block">{row.reference || row.source_id}</span>
                            {row.receipt_number && (
                                <span className="text-xs text-muted-foreground block font-mono mt-0.5">
                                    {row.receipt_number}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'supplier',
            header: isRTL ? 'الجهة' : 'Party',
            sortable: true,
            sortKey: 'supplier',
            cell: (row: any) => (
                <span className="text-sm font-medium">{row.supplier_name || row.description || '—'}</span>
            ),
        },
        {
            id: 'amount',
            header: isRTL ? 'المبلغ' : 'Amount',
            sortable: true,
            sortKey: 'amount',
            cell: (row: any) => (
                row.total_amount ? (
                    <span className="font-semibold text-sm font-mono tracking-tight">
                        {Number(row.total_amount).toLocaleString('en-US')} {row.currency || ''}
                    </span>
                ) : <span className="text-muted-foreground">—</span>
            ),
        },
        {
            id: 'date',
            header: isRTL ? 'التاريخ' : 'Date',
            sortable: true,
            sortKey: 'date',
            cell: (row: any) => (
                <span className="text-sm text-muted-foreground font-mono">
                    {formatDate(row.pending_since || row.created_at || row.arrivalDate)}
                </span>
            ),
        },
        {
            id: 'doc_status',
            header: isRTL ? 'حالة المستند' : 'Doc Status',
            sortable: true,
            sortKey: 'doc_status',
            cell: (row: any) => {
                const isSalesRow = row.type === 'sale_invoice' || row.source_type === 'sale_invoice';
                const status = isSalesRow ? (row.stage || 'confirmed') : (row.invoice_status || row.status || 'unknown');
                const stageLabels: Record<string, { ar: string; en: string; cls: string }> = {
                    confirmed: { ar: 'مؤكدة', en: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    sent_to_branch: { ar: 'أُرسلت للفرع', en: 'Sent to Branch', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    in_delivery: { ar: 'قيد التسليم', en: 'In Delivery', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    delivered: { ar: 'تم التسليم', en: 'Delivered', cls: 'bg-green-50 text-green-700 border-green-200' },
                };
                const sl = stageLabels[status];
                if (sl) {
                    return <Badge variant="outline" className={cn('text-[10px] sm:text-xs', sl.cls)}>
                        {isRTL ? sl.ar : sl.en}
                    </Badge>;
                }
                return <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {status}
                </Badge>;
            }
        },
        {
            id: 'receipt_status',
            header: isRTL ? 'حالة الاستلام' : 'Receipt',
            sortable: true,
            sortKey: 'receipt_status',
            cell: (row: any) => {
                const isSalesRow = row.type === 'sale_invoice' || row.source_type === 'sale_invoice';

                // For sales: use stage directly
                if (isSalesRow) {
                    const stage = row.stage || 'confirmed';
                    const hasDraft = !!row.delivery_draft;
                    const salesCfg: Record<string, { icon: any; label: string; cls: string }> = {
                        confirmed: { icon: null, label: isRTL ? 'لم يبدأ' : 'Pending', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
                        sent_to_branch: { icon: <Clock className="h-3 w-3 animate-pulse" />, label: isRTL ? 'أُرسلت للفرع' : 'Sent to Branch', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                        in_delivery: { icon: <Clock className="h-3 w-3 animate-pulse" />, label: isRTL ? 'قيد التسليم' : 'In Delivery', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                        delivered: { icon: <CheckCircle2 className="h-3 w-3" />, label: isRTL ? 'تم التسليم' : 'Delivered', cls: 'bg-green-50 text-green-700 border-green-200' },
                    };
                    const sc = salesCfg[stage] || salesCfg.confirmed;
                    const elapsed = getElapsedTime(row.pending_since || row.created_at);
                    const timerLabel = stage === 'confirmed'
                        ? (isRTL ? 'منذ التأكيد' : 'Since confirmed')
                        : (stage === 'in_delivery' || stage === 'sent_to_branch')
                            ? (isRTL ? 'منذ الإخراج' : 'Since dispatch')
                            : '';
                    return (
                        <div className="flex flex-col items-center gap-1 justify-center">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 sm:text-xs gap-1 font-normal w-fit', sc.cls)}>
                                {sc.icon}{sc.label}
                                {hasDraft && stage === 'in_delivery' && <span className="text-[8px]">📋</span>}
                            </Badge>
                            {elapsed && timerLabel && (
                                <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-0.5" title={timerLabel}>
                                    <Clock className="w-2.5 h-2.5 opacity-50" />{elapsed}
                                </span>
                            )}
                        </div>
                    );
                }

                // For purchases: original logic
                let rs = row.receipt_status || 'none';
                if (rs === 'completed') rs = 'partial';

                let elapsed = '';
                if (rs === 'none') {
                    elapsed = getElapsedTime(row.pending_since || row.created_at);
                } else if (rs === 'draft' || rs === 'in_progress') {
                    elapsed = getElapsedTime(row.receipt_created_at || row.created_at);
                }

                const cfg: Record<string, { icon: any; label: string; cls: string }> = {
                    draft: { icon: <Clock className="h-3 w-3 animate-pulse" />, label: isRTL ? 'قيد الاستلام' : 'In Progress', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    in_progress: { icon: <Clock className="h-3 w-3 animate-pulse" />, label: isRTL ? 'قيد الاستلام' : 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    partial: { icon: <ArrowDownToLine className="h-3 w-3" />, label: isRTL ? 'استلام جزئي' : 'Partial', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                    completed: { icon: <CheckCircle2 className="h-3 w-3" />, label: isRTL ? 'مكتمل' : 'Done', cls: 'bg-green-50 text-green-700 border-green-200' },
                    none: { icon: null, label: isRTL ? 'لم يبدأ' : 'Pending', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
                };
                const c = cfg[rs] || cfg.none;
                return (
                    <div className="flex flex-col items-center gap-1 justify-center">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 sm:text-xs gap-1 font-normal w-fit", c.cls)}>
                            {c.icon}{c.label}
                        </Badge>
                        {elapsed && (
                            <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-0.5" title={isRTL ? 'الوقت المنقضي' : 'Elapsed Time'}>
                                <Clock className="w-2.5 h-2.5 opacity-50" />
                                {elapsed}
                            </span>
                        )}
                    </div>
                );
            }
        }
    ], [isRTL, formatDate]);

    const renderActions = useCallback((row: any) => {
        const rs = row.receipt_status || 'none';
        const hasDraft = rs === 'draft' || rs === 'in_progress' || rs === 'completed';
        const isSales = row.type === 'sale_invoice' || row.source_type === 'sale_invoice';
        const salesHasDraft = isSales && (!!row.delivery_draft || row.stage === 'in_delivery');

        return (
            <div className="flex items-center gap-1.5 justify-end">
                {/* عرض الفاتورة/المستند */}
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-2 text-xs border-gray-200 hover:border-indigo-400 hover:text-indigo-600 gap-1"
                    title={isRTL ? 'عرض المستند المرجعي' : 'View source document'}
                    onClick={(e) => { e.stopPropagation(); handleViewSourceDocument(row); }}
                >
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'عرض' : 'View'}
                </Button>
                {/* فتح إذن التسليم (مبيعات) أو الاستلام (مشتريات) */}
                <Button
                    size="sm"
                    className={isSales
                        ? salesHasDraft
                            ? 'h-8 px-3 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white'
                            : 'h-8 px-3 text-xs gap-1 bg-rose-500 hover:bg-rose-600 text-white'
                        : hasDraft
                            ? 'h-8 px-3 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white'
                            : 'h-8 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                    }
                    onClick={(e) => { e.stopPropagation(); handleConfirmReceipt(row); }}
                >
                    {isSales ? (
                        salesHasDraft
                            ? <><Truck className="h-3.5 w-3.5" />{isRTL ? 'متابعة التسليم' : 'Continue'}</>
                            : <><Truck className="h-3.5 w-3.5" />{isRTL ? 'تسليم' : 'Deliver'}</>
                    ) : (
                        <><ArrowDownToLine className="h-3.5 w-3.5" />{hasDraft ? (isRTL ? 'متابعة' : 'Continue') : (isRTL ? 'استلام' : 'Receive')}</>
                    )}
                </Button>
            </div>
        );
    }, [isRTL, handleViewSourceDocument, handleConfirmReceipt]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <ClipboardList className="w-7 h-7 text-emerald-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'أذون الاستلام والتسليم' : 'Receipts & Deliveries'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? 'الأذونات المعلقة بانتظار التعامل المخزني' : 'Pending documents waiting for warehouse processing'}
                        </p>
                    </div>
                </div>
                {/* Manual Refresh Button */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono hidden sm:block">
                        {isRTL ? 'آخر تحديث:' : 'Updated:'} {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={handleManualRefresh}
                        disabled={receiptsLoading}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${receiptsLoading ? 'animate-spin' : ''}`} />
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* Sub-Tabs Filters */}
            <div className="flex items-center gap-2 px-1 flex-wrap mb-2 mt-2">
                {([
                    { key: 'all' as const, label: isRTL ? 'الكل' : 'All', count: counts.all, activeCls: 'bg-gray-100 text-gray-700 border-gray-300 ring-1 ring-gray-300', badgeActiveCls: 'bg-gray-200 text-gray-800' },
                    { key: 'purchases' as const, label: isRTL ? '📥 استلام مشتريات' : '📥 Purchases', count: counts.purchases, activeCls: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300', badgeActiveCls: 'bg-emerald-200 text-emerald-800' },
                    { key: 'sales' as const, label: isRTL ? '📤 تسليم مبيعات' : '📤 Sales', count: counts.sales, activeCls: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-300', badgeActiveCls: 'bg-rose-200 text-rose-800' },
                    { key: 'containers' as const, label: isRTL ? '📦 استلام كونتينرات' : '📦 Containers', count: counts.containers, activeCls: 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-300', badgeActiveCls: 'bg-indigo-200 text-indigo-800' },
                    { key: 'transfers' as const, label: isRTL ? '🔄 مناقلات' : '🔄 Transfers', count: counts.transfers, activeCls: 'bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-300', badgeActiveCls: 'bg-purple-200 text-purple-800' },
                ]).map(sf => (
                    <button
                        key={sf.key}
                        onClick={() => setSubFilter(sf.key)}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                            subFilter === sf.key
                                ? sf.activeCls
                                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        )}
                    >
                        {sf.label}
                        <span className={cn(
                            'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 font-mono',
                            subFilter === sf.key ? sf.badgeActiveCls : 'bg-gray-100 text-gray-500'
                        )}>{sf.count}</span>
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <NexaListTable
                    data={filteredPending}
                    columns={columns}
                    getRowKey={(r: any) => r.id}
                    renderActions={renderActions}
                    onRowClick={(row: any) => handleConfirmReceipt(row)}
                    searchPlaceholder={isRTL ? 'بحث بالمرجع، المورد، أو الوصف...' : 'Search by reference or supplier...'}
                    isRTL={isRTL}
                    direction={direction as 'rtl' | 'ltr'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={(field) => {
                        if (sortField === field) setSortAsc(!sortAsc);
                        else { setSortField(field); setSortAsc(false); }
                    }}
                />

                {/* Footer Totals */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 dark:bg-slate-800/50 dark:border-slate-800 flex justify-between items-center text-sm">
                    <span className="text-gray-500">{isRTL ? 'الإجمالي' : 'Total Amount'}:</span>
                    <span className="font-bold font-mono tracking-tight text-erp-navy dark:text-white">
                        {totalAmountPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-gray-400 font-sans text-xs ms-1">{baseCurrency || ''}</span>
                    </span>
                </div>
            </div>

            {/* Dialogs */}
            {receiptDialog.open && (
                <MaterialReceiptDialog
                    isOpen={receiptDialog.open}
                    onOpenChange={(open) => setReceiptDialog(prev => ({ ...prev, open }))}
                    defaultBillType={receiptDialog.type}
                    defaultReference={receiptDialog.reference}
                    onComplete={() => {
                        refetchMovements();
                        setReceiptDialog(prev => ({ ...prev, open: false }));
                    }}
                />
            )}
            {linkedInvoiceSheet.open && linkedInvoiceSheet.invoiceData && (
                <UnifiedTradeSheet
                    open={linkedInvoiceSheet.open}
                    onOpenChange={(open) => setLinkedInvoiceSheet(prev => ({ ...prev, open }))}
                    mode={linkedInvoiceSheet.mode || 'purchase'}
                    type="invoice"
                    initialData={linkedInvoiceSheet.invoiceData}
                    userRole="admin"
                    onRefresh={() => refetchMovements()}
                />
            )}
            {containerSheet.open && containerSheet.data && (
                <UnifiedTradeSheet
                    open={containerSheet.open}
                    onOpenChange={(open) => setContainerSheet(prev => ({ ...prev, open }))}
                    mode="purchase"
                    type="container"
                    initialData={containerSheet.data}
                    companyId={companyId}
                    onRefresh={() => refetchMovements()}
                />
            )}
            {/* Sales Delivery — SalesDeliveryDialog (roll picking) */}
            {salesDeliveryDialog.open && salesDeliveryDialog.salesInvoice && (
                <SalesDeliveryDialog
                    isOpen={salesDeliveryDialog.open}
                    onOpenChange={(open) => {
                        setSalesDeliveryDialog(prev => ({ ...prev, open }));
                        if (!open) refetchMovements(); // refresh on close
                    }}
                    salesInvoice={salesDeliveryDialog.salesInvoice}
                    onComplete={() => {
                        refetchMovements();
                        setSalesDeliveryDialog({ open: false, salesInvoice: null });
                    }}
                />
            )}
        </div>
    );
}
