const fs = require('fs');

const code = `/**
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
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { useStockMovements } from '../hooks/useWarehouseQueries';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { MaterialReceiptDialog } from '../components/MaterialReceiptDialog';
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
    Warehouse,
    ClipboardList,
} from 'lucide-react';

export default function ReceiptsDeliveriesPage() {
    const { t, language, isRTL, direction } = useLanguage();
    const { companyId } = useAuth();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');

    // ═══ State ═══
    const [subFilter, setSubFilter] = useState<'all' | 'purchases' | 'sales' | 'containers' | 'transfers'>('all');

    // ═══ Dialogs ═══
    const [receiptDialog, setReceiptDialog] = useState<{
        open: boolean;
        type: 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count';
        reference: string;
    }>({ open: false, type: 'purchase_local', reference: '' });

    const [linkedInvoiceSheet, setLinkedInvoiceSheet] = useState<{ open: boolean; invoiceData: any; }>({ open: false, invoiceData: null });
    const [containerSheet, setContainerSheet] = useState<{ open: boolean; data: any; }>({ open: false, data: null });

    // ⚡ React Query
    const { pendingReceipts, loading, refetch: refetchMovements } = useStockMovements({});

    // 🔄 Realtime
    useRealtimeInvalidation({
        table: 'purchase_receipts',
        companyId,
        queryKeys: [['warehouse', 'pending-receipts']],
    });
    useRealtimeInvalidation({
        table: 'containers',
        companyId,
        queryKeys: [['warehouse', 'pending-receipts']],
    });

    // ═══ Format Date (always English numerals) ═══
    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        }
        catch { return dateStr; }
    }, []);

    // ═══ Document Logic ═══
    const handleConfirmReceipt = useCallback((receipt: any) => {
        let dialogType: any = 'purchase_local';
        if (receipt.type === 'container') dialogType = 'container';
        else if (receipt.type === 'transfer') dialogType = 'transfer';
        else if (receipt.type === 'return') dialogType = 'return';
        setReceiptDialog({ open: true, type: dialogType, reference: receipt.source_id });
    }, []);

    const handleViewSourceDocument = useCallback(async (receipt: any) => {
        try {
            const sourceId = receipt.source_id || receipt.id;
            const docType = receipt.type || receipt.source_type || '';

            if (docType === 'container') {
                const { data: container } = await supabase.from('containers').select('*').eq('id', sourceId).maybeSingle();
                if (container) setContainerSheet({ open: true, data: { ...container, party_id: container.supplier_id } });
                else toast.error(isRTL ? 'الكونتينر غير موجود' : 'Container not found');
                return;
            }
            if (docType === 'purchase_order') {
                window.open(\`/purchases/orders?id=\${sourceId}\`, '_blank');
                return;
            }
            const { data: inv } = await supabase.from('purchase_invoices').select('*').eq('id', sourceId).maybeSingle();
            if (inv) { setLinkedInvoiceSheet({ open: true, invoiceData: inv }); return; }
            toast.error(isRTL ? 'المستند غير موجود' : 'Document not found');
        } catch { toast.error(isRTL ? 'خطأ' : 'Error'); }
    }, [isRTL]);

    // ═══ Filter Logic ═══
    const filteredPending = useMemo(() => {
        if (subFilter === 'all') return pendingReceipts;
        if (subFilter === 'purchases') return pendingReceipts.filter((r: any) => ['purchase_order', 'return', 'invoice'].includes(r.type || r.source_type));
        if (subFilter === 'sales') return pendingReceipts.filter((r: any) => ['sale_order', 'issue', 'delivery'].includes(r.type || r.source_type));
        if (subFilter === 'containers') return pendingReceipts.filter((r: any) => (r.type || r.source_type) === 'container');
        if (subFilter === 'transfers') return pendingReceipts.filter((r: any) => (r.type || r.source_type) === 'transfer');
        return pendingReceipts;
    }, [pendingReceipts, subFilter]);

    const counts = useMemo(() => {
        return {
            all: pendingReceipts.length,
            purchases: pendingReceipts.filter((r: any) => ['purchase_order', 'return', 'invoice'].includes(r.type || r.source_type)).length,
            sales: pendingReceipts.filter((r: any) => ['sale_order', 'issue', 'delivery'].includes(r.type || r.source_type)).length,
            containers: pendingReceipts.filter((r: any) => (r.type || r.source_type) === 'container').length,
            transfers: pendingReceipts.filter((r: any) => (r.type || r.source_type) === 'transfer').length,
        };
    }, [pendingReceipts]);

    const totalAmountPending = filteredPending.reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

    // ═══ Columns ═══
    const columns: NexaListColumn[] = useMemo(() => [
        {
            id: 'reference',
            header: isRTL ? 'رقم المستند' : 'Document #',
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
            cell: (row: any) => (
                <span className="text-sm font-medium">{row.supplier_name || row.description || '—'}</span>
            ),
        },
        {
            id: 'amount',
            header: isRTL ? 'المبلغ' : 'Amount',
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
            cell: (row: any) => (
                <span className="text-sm text-muted-foreground font-mono">
                    {formatDate(row.arrivalDate || row.created_at)}
                </span>
            ),
        },
        {
            id: 'doc_status',
            header: isRTL ? 'حالة المستند' : 'Doc Status',
            cell: (row: any) => {
                const status = row.invoice_status || row.status || 'unknown';
                return <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {status}
                </Badge>;
            }
        },
        {
            id: 'receipt_status',
            header: isRTL ? 'حالة الاستلام' : 'Receipt',
            cell: (row: any) => {
                let rs = row.receipt_status || 'none';
                if (rs === 'completed') rs = 'partial'; // Important fix: If it's in the pending list but has completed receipts, it means partial

                const cfg: Record<string, { icon: any; label: string; cls: string }> = {
                    draft: { icon: <Clock className="h-3 w-3 animate-pulse" />, label: isRTL ? 'قيد الاستلام' : 'In Progress', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    in_progress: { icon: <Clock className="h-3 w-3 animate-pulse" />, label: isRTL ? 'قيد الاستلام' : 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    partial: { icon: <ArrowDownToLine className="h-3 w-3" />, label: isRTL ? 'استلام جزئي' : 'Partial', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                    completed: { icon: <CheckCircle2 className="h-3 w-3" />, label: isRTL ? 'مكتمل' : 'Done', cls: 'bg-green-50 text-green-700 border-green-200' },
                    none: { icon: null, label: isRTL ? 'لم يبدأ' : 'Pending', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
                };
                const c = cfg[rs] || cfg.none;
                return (
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 sm:text-xs gap-1 font-normal", c.cls)}>
                        {c.icon}{c.label}
                    </Badge>
                );
            }
        }
    ], [isRTL, formatDate]);

    const renderActions = useCallback((row: any) => {
        const rs = row.receipt_status || 'none';
        const hasDraft = rs === 'draft' || rs === 'in_progress' || rs === 'completed'; // completed here means partial

        return (
            <div className="flex items-center gap-1.5 justify-end">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleViewSourceDocument(row); }}>
                    <Eye className="h-3.5 w-3.5 ml-1" />
                    {isRTL ? 'عرض' : 'View'}
                </Button>
                <Button size="sm" className={cn("h-7 px-3 text-xs gap-1 text-white", hasDraft ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700')} onClick={(e) => { e.stopPropagation(); handleConfirmReceipt(row); }}>
                    <ArrowDownToLine className="h-3.5 w-3.5 ml-1" />
                    {hasDraft ? (isRTL ? 'متابعة' : 'Continue') : (isRTL ? 'استلام' : 'Receive')}
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
                    rowKey="id"
                    renderActions={renderActions}
                    searchPlaceholder={isRTL ? 'بحث بالمرجع، المورد، أو الوصف...' : 'Search by reference or supplier...'}
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
                    mode="purchase"
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
        </div>
    );
}
`;

fs.writeFileSync('src/features/warehouse/pages/ReceiptsDeliveriesPage.tsx', code);
