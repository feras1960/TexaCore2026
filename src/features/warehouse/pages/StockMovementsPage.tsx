/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Stock Movements Page (حركات المخزون)
 * ════════════════════════════════════════════════════════════════
 * 
 * Constitution-Compliant Implementation:
 * - Uses t('key') pattern from LanguageProvider
 * - Connects to warehouseService for real data
 * - Covers: fabrics, rolls, containers, transfers, delivery notes, invoices
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { MaterialReceiptDialog } from '../components/MaterialReceiptDialog';
import { useStockMovements } from '../hooks/useWarehouseQueries';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ArrowLeftRight,
    Search,
    RefreshCw,
    Package,
    Truck,
    ClipboardList,
    Calendar,
    MapPin,
    Boxes,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2,
    Eye,
    FileText,
} from 'lucide-react';

// Movement type colors
const movementTypeColors: Record<string, string> = {
    'receipt': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'purchase': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'transfer_in': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'sale': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'issue': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'transfer_out': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'transfer': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'adjustment': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'container': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    'delivery': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function StockMovementsPage() {
    const { t, language, isRTL } = useLanguage();
    const { companyId } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('movements');

    // ═══ Receipt Dialog State ═══
    const [receiptDialog, setReceiptDialog] = useState<{
        open: boolean;
        type: 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count';
        reference: string;
    }>({
        open: false,
        type: 'purchase_local',
        reference: ''
    });

    const handleConfirmReceipt = (receipt: any) => {
        // Map pending receipt type to dialog type
        let dialogType: any = 'purchase_local';
        if (receipt.type === 'container') dialogType = 'container';
        else if (receipt.type === 'transfer') dialogType = 'transfer';
        else if (receipt.type === 'return') dialogType = 'return';

        setReceiptDialog({
            open: true,
            type: dialogType,
            reference: receipt.source_id
        });
    };

    // ═══ View Source Document (Invoice/PO) ═══
    const handleViewSourceDocument = useCallback(async (receipt: any) => {
        try {
            const sourceId = receipt.source_id || receipt.id;
            const sourceType = receipt.source_type;

            if (sourceType === 'invoice') {
                const { data: invoice } = await supabase
                    .from('purchase_transactions')
                    .select('*')
                    .eq('id', sourceId)
                    .single();

                if (invoice) {
                    setLinkedInvoiceSheet({ open: true, invoiceData: invoice });
                } else {
                    toast.error(language === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found');
                }
            } else if (sourceType === 'order') {
                const { data: order } = await supabase
                    .from('purchase_orders')
                    .select('*')
                    .eq('id', sourceId)
                    .single();

                if (order) {
                    setLinkedInvoiceSheet({ open: true, invoiceData: order });
                } else {
                    toast.error(language === 'ar' ? 'لم يتم العثور على أمر الشراء' : 'Purchase order not found');
                }
            }
        } catch (err) {
            console.error('Error viewing source document:', err);
            toast.error(language === 'ar' ? 'خطأ في عرض المستند' : 'Error viewing document');
        }
    }, [language]);

    // ═══ State for opening linked invoice from movement ═══
    const [linkedInvoiceSheet, setLinkedInvoiceSheet] = useState<{
        open: boolean;
        invoiceData: any;
    }>({ open: false, invoiceData: null });

    // 🔄 Realtime: auto-update when inventory_movements change
    useRealtimeInvalidation({
        table: 'inventory_movements',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['warehouse', 'stock-movements']],
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        warehouse: 'all',
        movementType: 'all',
        dateFrom: '',
        dateTo: ''
    });

    // ⚡ React Query: cached data, instant tab switching
    const {
        movements,
        pendingReceipts,
        loading,
        error,
        refetch: refetchMovements,
    } = useStockMovements({
        warehouse: filters.warehouse,
        movementType: filters.movementType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
    });

    // Filter movements locally
    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const material = m.material_name_ar || m.material_name_en || '';
                const reference = m.reference_number || '';
                if (!material.toLowerCase().includes(query) && !reference.toLowerCase().includes(query)) {
                    return false;
                }
            }
            return true;
        });
    }, [movements, searchQuery]);

    // Get movement type label from translations
    const getMovementTypeLabel = (type: string) => {
        const key = `warehouse.stockMovements.types.${type}`;
        const translated = t(key);
        return translated !== key ? translated : type;
    };

    // Movement type icon
    const getMovementTypeIcon = (type: string) => {
        if (type.includes('receipt') || type.includes('purchase') || type === 'adjustment_in') {
            return <ArrowDownToLine className="h-4 w-4" />;
        }
        if (type.includes('sale') || type.includes('issue') || type === 'adjustment_out') {
            return <ArrowUpFromLine className="h-4 w-4" />;
        }
        return <ArrowLeftRight className="h-4 w-4" />;
    };

    // Receipt type icon
    const getReceiptTypeIcon = (type: string) => {
        switch (type) {
            case 'container': return <Package className="h-5 w-5 text-blue-500" />;
            case 'transfer': return <ArrowLeftRight className="h-5 w-5 text-green-500" />;
            case 'purchase': return <Truck className="h-5 w-5 text-orange-500" />;
            default: return <ClipboardList className="h-5 w-5" />;
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
        } catch {
            return dateStr;
        }
    };

    // ═══ Open linked invoice from GRN movement ═══
    const handleOpenLinkedInvoice = useCallback(async (movement: any) => {
        try {
            if (!movement.reference_id || movement.reference_type !== 'goods_receipt') {
                toast.info(language === 'ar' ? 'لا توجد فاتورة مرتبطة' : 'No linked invoice found');
                return;
            }

            // Find the receipt first
            const { data: receipt } = await supabase
                .from('purchase_receipts')
                .select('id, invoice_id, order_id')
                .eq('id', movement.reference_id)
                .single();

            if (!receipt) {
                toast.error(language === 'ar' ? 'لم يتم العثور على إذن الاستلام' : 'Receipt not found');
                return;
            }

            // Get the linked invoice
            const invoiceId = receipt.invoice_id;
            if (!invoiceId) {
                // If receipt is linked to PO, find invoices for that PO
                if (receipt.order_id) {
                    const { data: invoices } = await supabase
                        .from('purchase_transactions')
                        .select('*')
                        .eq('source_order_id', receipt.order_id)
                        .limit(1);
                    if (invoices?.length) {
                        setLinkedInvoiceSheet({ open: true, invoiceData: invoices[0] });
                        return;
                    }
                }
                toast.info(language === 'ar' ? 'لا توجد فاتورة مرتبطة بالاستلام' : 'No invoice linked to this receipt');
                return;
            }

            const { data: invoice } = await supabase
                .from('purchase_transactions')
                .select('*')
                .eq('id', invoiceId)
                .single();

            if (invoice) {
                setLinkedInvoiceSheet({ open: true, invoiceData: invoice });
            } else {
                toast.error(language === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found');
            }
        } catch (err: any) {
            console.error('Failed to load linked invoice:', err);
            toast.error(err.message);
        }
    }, [language]);

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ─── Action Bar ─── */}
            <div className="flex items-center justify-between">
                <div />
                <MaterialReceiptDialog onComplete={() => refetchMovements()} />
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="movements" className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        {t('warehouse.stockMovements.allMovements')}
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="flex items-center gap-2 relative">
                        <ClipboardList className="h-4 w-4" />
                        {t('warehouse.stockMovements.pendingReceipts')}
                        {pendingReceipts.length > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 text-xs absolute -top-1 -right-1">
                                {pendingReceipts.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Movements Tab */}
                <TabsContent value="movements" className="mt-6 space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                {/* Search */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-sm font-medium mb-1.5 block">
                                        {t('common.search')}
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('warehouse.searchPlaceholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pr-10"
                                        />
                                    </div>
                                </div>

                                {/* Movement Type Filter */}
                                <div className="w-[180px]">
                                    <label className="text-sm font-medium mb-1.5 block">
                                        {t('warehouse.stockMovements.type')}
                                    </label>
                                    <Select
                                        value={filters.movementType}
                                        onValueChange={(v) => setFilters(f => ({ ...f, movementType: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('common.all')}</SelectItem>
                                            <SelectItem value="receipt">{t('warehouse.stockMovements.types.receipt')}</SelectItem>
                                            <SelectItem value="sale">{t('warehouse.stockMovements.types.sale')}</SelectItem>
                                            <SelectItem value="transfer_in">{t('warehouse.stockMovements.types.transfer_in')}</SelectItem>
                                            <SelectItem value="transfer_out">{t('warehouse.stockMovements.types.transfer_out')}</SelectItem>
                                            <SelectItem value="container">{t('warehouse.stockMovements.types.container')}</SelectItem>
                                            <SelectItem value="delivery">{t('warehouse.stockMovements.types.delivery')}</SelectItem>
                                            <SelectItem value="adjustment">{t('warehouse.stockMovements.types.adjustment')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Refresh */}
                                <Button variant="outline" onClick={() => refetchMovements()} disabled={loading}>
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Alert */}
                    {error && (
                        <Card className="border-destructive">
                            <CardContent className="flex items-center gap-2 p-4 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                {error}
                            </CardContent>
                        </Card>
                    )}

                    {/* Movements Table */}
                    <Card>
                        <CardContent className="p-0 overflow-auto">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    {t('common.loading')}
                                </div>
                            ) : filteredMovements.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    {t('warehouse.stockMovements.noMovements')}
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.date')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.type')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.material')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.quantity')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.fromWarehouse')} ← {t('warehouse.stockMovements.toWarehouse')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.reference')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMovements.map(m => (
                                            <tr key={m.id} className="border-b hover:bg-muted/50">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2 font-mono">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        {formatDate(m.movement_date)}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge className={`${movementTypeColors[m.movement_type] || 'bg-gray-100'} flex items-center gap-1 w-fit`}>
                                                        {getMovementTypeIcon(m.movement_type)}
                                                        {getMovementTypeLabel(m.movement_type)}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 font-medium">
                                                    {language === 'ar'
                                                        ? (m.material_name_ar || m.material_name_en || m.notes?.split(' - ')?.[1]?.split(' from')?.[0] || '—')
                                                        : (m.material_name_en || m.material_name_ar || m.notes?.split(' - ')?.[1]?.split(' from')?.[0] || '—')}
                                                    {m.roll_number && (
                                                        <div className="text-xs text-muted-foreground">{m.roll_number}</div>
                                                    )}
                                                    {m.reference_number?.startsWith('GRN-') && !m.material_name_ar && !m.material_name_en && (
                                                        <div className="text-xs text-muted-foreground">{m.notes}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono font-medium">{m.quantity || 0} {m.unit || 'م'}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                        <span>{m.from_warehouse_name || '—'}</span>
                                                        <span className="text-muted-foreground mx-1">←</span>
                                                        <span>{m.to_warehouse_name || m.warehouse_name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-primary hover:underline cursor-pointer">
                                                            {m.reference_number || m.id?.slice(0, 8)}
                                                        </span>
                                                        {/* View linked invoice button for GRN movements */}
                                                        {m.reference_type === 'goods_receipt' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                                                                onClick={() => handleOpenLinkedInvoice(m)}
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                                <span className="hidden md:inline">
                                                                    {language === 'ar' ? 'الفاتورة' : 'Invoice'}
                                                                </span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    {(() => {
                                                        const status = m.status || 'completed';
                                                        const statusKey = `warehouse.stockMovements.statuses.${status}`;
                                                        const translated = t(statusKey);
                                                        const label = translated !== statusKey ? translated : (status === 'completed' ? (isRTL ? 'مكتمل' : 'Completed') : status);
                                                        return (
                                                            <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                                                                {label}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pending Receipts Tab */}
                <TabsContent value="pending" className="mt-6 space-y-4">
                    {loading ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                {t('common.loading')}
                            </CardContent>
                        </Card>
                    ) : pendingReceipts.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                                <p className="text-lg font-medium">
                                    {t('warehouse.stockMovements.pendingReceipts')} - {t('common.noData')}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="py-3 px-4 text-start font-semibold">{isRTL ? 'رقم المستند' : 'Document #'}</th>
                                                <th className="py-3 px-4 text-start font-semibold">{isRTL ? 'المورد' : 'Supplier'}</th>
                                                <th className="py-3 px-4 text-start font-semibold">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                                <th className="py-3 px-4 text-start font-semibold">{isRTL ? 'التاريخ' : 'Date'}</th>
                                                <th className="py-3 px-4 text-center font-semibold">{isRTL ? 'حالة المستند' : 'Doc Status'}</th>
                                                <th className="py-3 px-4 text-center font-semibold">{isRTL ? 'حالة الاستلام' : 'Receipt Status'}</th>
                                                <th className="py-3 px-4 text-center font-semibold">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {pendingReceipts.map(receipt => {
                                                const receiptStatus = receipt.receipt_status || 'none';
                                                const hasDraft = receiptStatus === 'draft';

                                                // Receipt status badge
                                                const getReceiptStatusBadge = () => {
                                                    switch (receiptStatus) {
                                                        case 'draft':
                                                            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                                                                {isRTL ? '📝 مسودة' : '📝 Draft'}
                                                            </Badge>;
                                                        case 'completed':
                                                            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                                {isRTL ? '✅ مكتمل' : '✅ Completed'}
                                                            </Badge>;
                                                        default:
                                                            return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-300 text-xs">
                                                                {isRTL ? 'لم يبدأ' : 'Not Started'}
                                                            </Badge>;
                                                    }
                                                };

                                                // Document status badge
                                                const getDocStatusBadge = () => {
                                                    const status = receipt.invoice_status || receipt.status;
                                                    switch (status) {
                                                        case 'posted':
                                                            return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">{isRTL ? 'مرحّل' : 'Posted'}</Badge>;
                                                        case 'partially_received':
                                                            return <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">{isRTL ? 'استلام جزئي' : 'Partial'}</Badge>;
                                                        case 'confirmed':
                                                            return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{isRTL ? 'مؤكد' : 'Confirmed'}</Badge>;
                                                        default:
                                                            return <Badge variant="outline" className="text-xs">{status}</Badge>;
                                                    }
                                                };

                                                return (
                                                    <tr key={receipt.id} className="hover:bg-muted/30 transition-colors">
                                                        {/* Document Number */}
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {getReceiptTypeIcon(receipt.type)}
                                                                <div>
                                                                    <span className="font-semibold text-sm">{receipt.reference}</span>
                                                                    {receipt.receipt_number && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {isRTL ? 'إذن استلام:' : 'GRN:'} {receipt.receipt_number}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Supplier */}
                                                        <td className="py-3 px-4">
                                                            <span className="text-sm">{receipt.supplier_name || receipt.description}</span>
                                                        </td>

                                                        {/* Amount */}
                                                        <td className="py-3 px-4">
                                                            {receipt.total_amount ? (
                                                                <span className="font-semibold text-sm">
                                                                    {Number(receipt.total_amount).toLocaleString()} {receipt.currency || ''}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>

                                                        {/* Date */}
                                                        <td className="py-3 px-4">
                                                            <span className="text-sm text-muted-foreground">
                                                                {formatDate(receipt.arrivalDate)}
                                                            </span>
                                                        </td>

                                                        {/* Document Status */}
                                                        <td className="py-3 px-4 text-center">
                                                            {getDocStatusBadge()}
                                                        </td>

                                                        {/* Receipt Status */}
                                                        <td className="py-3 px-4 text-center">
                                                            {getReceiptStatusBadge()}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {/* View Invoice Button */}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-xs gap-1"
                                                                    onClick={() => handleViewSourceDocument(receipt)}
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                    {isRTL ? 'عرض' : 'View'}
                                                                </Button>

                                                                {/* Confirm / Continue / Received Button */}
                                                                {receiptStatus === 'completed' ? (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs gap-1 text-green-600 border-green-300 cursor-default opacity-80"
                                                                        disabled
                                                                    >
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        {isRTL ? 'تم الاستلام' : 'Received'}
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        className={`text-xs gap-1 ${hasDraft
                                                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                            }`}
                                                                        onClick={() => handleConfirmReceipt(receipt)}
                                                                    >
                                                                        <ArrowDownToLine className="h-3.5 w-3.5" />
                                                                        {hasDraft
                                                                            ? (isRTL ? 'متابعة' : 'Continue')
                                                                            : (isRTL ? 'استلام' : 'Receive')
                                                                        }
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* ═══ Material Receipt Dialog (Controlled) ═══ */}
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

            {/* ═══ Linked Invoice Sheet (Manager Override) ═══ */}
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
        </div>
    );
}
