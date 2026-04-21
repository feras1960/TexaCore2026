/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Stock Movements Page (حركات المخزون)
 * ════════════════════════════════════════════════════════════════
 * 
 * Constitution-Compliant Implementation:
 * - Uses t('key') pattern from LanguageProvider
 * - Connects to warehouseService for real data
 * - Covers: fabrics, rolls, containers, transfers, delivery notes, invoices
 * - Powered by NexaListTable for standardized data grids
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useStockMovements, useWarehouses } from '../hooks/useWarehouseQueries';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { SalesDeliveryDialog } from '../components/SalesDeliveryDialog';
import { TransferDeliveryDialog } from '../components/TransferDeliveryDialog';
import { MaterialReceiptDialog } from '../components/MaterialReceiptDialog';
import { MovementDetailDialog } from '../components/MovementDetailDialog';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getLocalizedLabel, getLocalizedUnit } from '@/lib/utils/getLocalizedUnit';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ArrowLeftRight,
    Calendar,
    Clock,
    Package,
    Truck,
    ShoppingCart,
    RefreshCw,
    X,
    Warehouse,
    User,
    Building2,
    Import,
} from 'lucide-react';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Movement type colors
const movementTypeColors: Record<string, string> = {
    'receipt': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    'purchase': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    'transfer_in': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    'sale': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    'issue': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    'transfer_out': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
    'transfer': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    'adjustment': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
    'container': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400',
    'delivery': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    'opening_balance': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export default function StockMovementsPage() {
    const { t, language, isRTL, direction } = useLanguage();
    const { companyId, isSuperAdmin } = useAuth();

    // ═══ Filters State ═══
    const [subFilter, setSubFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<string>('date');
    const [sortAsc, setSortAsc] = useState<boolean>(false);
    // 📅 فلتر التاريخ — null/undefined by default to ALWAYS MATCH Preloader Cache
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    // 🏗️ فلتر المستودع (all = كل المستودعات)
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

    // قائمة المستودعات للفلتر
    const { warehouses } = useWarehouses();

    // ═══ State for opening linked documents ═══
    const [linkedInvoiceSheet, setLinkedInvoiceSheet] = useState<{ open: boolean; invoiceData: any }>({ open: false, invoiceData: null });
    const [containerSheet, setContainerSheet] = useState<{ open: boolean; data: any }>({ open: false, data: null });
    // ✅ إذن الاستلام (purchase/container) ← يفتح MaterialReceiptDialog في وضع العرض
    const [receiptViewDialog, setReceiptViewDialog] = useState<{
        open: boolean;
        billType: 'purchase_local' | 'container';
        reference: string;
        receiptId?: string;
    }>({ open: false, billType: 'purchase_local', reference: '' });
    // ── Sales: يفتح SalesDeliveryDialog (إذن التسليم بتبويباته) ──
    const [salesDeliveryDialog, setSalesDeliveryDialog] = useState<{ open: boolean; salesInvoice: any }>({ open: false, salesInvoice: null });
    // ── Transfer: يفتح TransferDeliveryDialog لعرض/استلام المناقلة ──
    const [transferDeliveryDialog, setTransferDeliveryDialog] = useState<{ open: boolean; transfer: any }>({ open: false, transfer: null });
    // ── Movement Detail: حركات بدون مستند (opening_balance, adjustment) ──
    const [movementDetail, setMovementDetail] = useState<{ open: boolean; movement: any }>({ open: false, movement: null });
    // ── داخل إذن التسليم: يفتح الفاتورة المالية عند الضغط على العميل ──
    const [salesInvoiceSheet, setSalesInvoiceSheet] = useState<{ open: boolean; invoiceData: any }>({ open: false, invoiceData: null });
    // ── Journal Entry Sheet: فتح القيد المحاسبي المرتبط ──
    const [journalSheet, setJournalSheet] = useState<{ open: boolean; data: any }>({ open: false, data: null });

    // ⚡ React Query: cached data — Pull on Demand
    // Memoize filters to prevent new object reference on each render → avoids re-fetch
    const stableFilters = useMemo(() => ({
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        warehouse: selectedWarehouse !== 'all' ? selectedWarehouse : undefined,
    }), [dateRange?.from?.getTime(), dateRange?.to?.getTime(), selectedWarehouse]);

    const {
        movements,
        loading,
        error,
        refetch: refetchMovements,
    } = useStockMovements(stableFilters);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // 🔑 أسماء الجهات الآن تأتي مثراة مباشرة من warehouseService.getInventoryMovements
    // لا حاجة لجلبها مرة ثانية هنا — party_name موجود على كل حركة


    const handleManualRefresh = useCallback(() => {
        refetchMovements();
        setLastRefreshed(new Date());
    }, [refetchMovements]);

    // ═══ Filter Logic ═══
    const purchasesTypes = ['receipt', 'purchase', 'return', 'purchase_invoice'];
    const salesTypes = ['sale', 'issue', 'delivery', 'sale_invoice'];
    // 🔑 Container tab: includes 'container_receipt' (from GRN) + 'container' (legacy)
    const containerTypes = ['container', 'container_receipt', 'goods_receipt'];
    const transferTypes = ['transfer_in', 'transfer_out', 'transfer'];

    // ═══ Group movements by reference_number ═══
    const groupedMovements = useMemo(() => {
        let result = movements;

        // Sub-tabs filtering
        if (subFilter === 'purchases') result = result.filter(m => purchasesTypes.includes(m.movement_type));
        else if (subFilter === 'sales') result = result.filter(m => salesTypes.includes(m.movement_type) || m.reference_type === 'sale_invoice');
        else if (subFilter === 'containers') result = result.filter(m => containerTypes.includes(m.movement_type));
        else if (subFilter === 'transfers') result = result.filter(m => transferTypes.includes(m.movement_type) && m.reference_type !== 'sale_invoice');

        // Search filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => {
                const material = m.material_name_ar || m.material_name_en || '';
                const reference = m.reference_number || '';
                return material.toLowerCase().includes(query) || reference.toLowerCase().includes(query);
            });
        }

        // Group by reference_number (one row per GRN/invoice/container)
        const groupMap = new Map<string, any>();
        for (const m of result) {
            const key = m.reference_number || m.id; // fallback to id if no reference
            if (groupMap.has(key)) {
                const existing = groupMap.get(key);
                existing.total_quantity += Number(m.quantity || 0);
                existing.items_count += 1;
                existing.material_names.add(
                    (language === 'ar' ? m.material_name_ar : m.material_name_en) || m.material_name_ar || m.material_name_en || ''
                );
                if (m.to_warehouse_name) existing.warehouse_names.add(m.to_warehouse_name);
                if (m.roll_id) existing.roll_ids.add(m.roll_id);
            } else {
                const rollIds = new Set<string>();
                if (m.roll_id) rollIds.add(m.roll_id);
                groupMap.set(key, {
                    ...m,
                    total_quantity: Number(m.quantity || 0),
                    items_count: 1,
                    material_names: new Set([
                        (language === 'ar' ? m.material_name_ar : m.material_name_en) || m.material_name_ar || m.material_name_en || ''
                    ]),
                    warehouse_names: new Set(m.to_warehouse_name ? [m.to_warehouse_name] : []),
                    roll_ids: rollIds,
                    receipt_rolls_count: m.receipt_rolls_count || 0,
                    _groupKey: key,
                });
            }
        }

        let grouped = Array.from(groupMap.values());

        // Sorting
        if (sortField) {
            grouped = grouped.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                if (sortField === 'date') {
                    valA = new Date(a.movement_date || a.created_at).getTime();
                    valB = new Date(b.movement_date || b.created_at).getTime();
                }
                else if (sortField === 'type') { valA = a.movement_type; valB = b.movement_type; }
                else if (sortField === 'material') { valA = a.items_count; valB = b.items_count; }
                else if (sortField === 'quantity') { valA = a.total_quantity; valB = b.total_quantity; }
                else if (sortField === 'reference') { valA = a.reference_number || ''; valB = b.reference_number || ''; }
                else if (sortField === 'status') { valA = a.status || 'completed'; valB = b.status || 'completed'; }

                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });
        }

        return grouped;
    }, [movements, subFilter, searchQuery, sortField, sortAsc, language]);

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch {
            return dateStr;
        }
    };

    const getElapsedTime = (startStr: string) => {
        if (!startStr) return '';
        const start = new Date(startStr);
        const diffMs = Date.now() - start.getTime();
        if (diffMs < 0) return '';

        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 60) return `${diffMins} ${getLocalizedLabel('time_m', language)}`;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) return `${diffHours} ${getLocalizedLabel('time_h', language)}`;

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 30) return `${diffDays} ${getLocalizedLabel('time_d', language)}`;

        const diffMonths = Math.floor(diffDays / 30);
        return `${diffMonths} ${language === 'ar' ? (diffMonths === 1 ? 'شهر' : 'أشهر') : language === 'ru' ? 'мес' : language === 'uk' ? 'міс' : language === 'tr' ? 'ay' : 'mo'}`;
    };

    // خريطة ثابتة لأنواع الحركات — بديل للمفاتيح غير المترجمة
    const movementTypeLabels: Record<string, string> = {
        'sale': 'mt_sale',
        'sale_invoice': 'mt_sale_inv',
        'issue': 'mt_issue',
        'delivery': 'mt_delivery',
        'receipt': 'mt_receipt',
        'purchase': 'mt_purchase',
        'purchase_invoice': 'mt_purchase_inv',
        'return': 'mt_return',
        'container': 'mt_container',
        'container_receipt': 'mt_container_rec',
        'goods_receipt': 'mt_grn',
        'transfer': 'mt_transfer',
        'transfer_in': 'mt_transfer_in',
        'transfer_out': 'mt_transfer_out',
        'adjustment': 'mt_adjustment',
        'adjustment_in': 'mt_adj_in',
        'adjustment_out': 'mt_adj_out',
        'opening_balance': 'mt_opening_bal',
    };

    const getMovementTypeLabel = (type: string) => {
        const entry = movementTypeLabels[type];
        if (entry) return getLocalizedLabel(entry, language);
        // fallback: محاولة ترجمة من i18n
        const key = `warehouse.stockMovements.types.${type}`;
        const translated = t(key);
        return translated !== key ? translated : type;
    };

    const getMovementTypeIcon = (type: string) => {
        if (type.includes('receipt') || type.includes('purchase') || type === 'adjustment_in') return <ArrowDownToLine className="h-3.5 w-3.5" />;
        if (type.includes('sale') || type.includes('issue') || type === 'adjustment_out') return <ArrowUpFromLine className="h-3.5 w-3.5" />;
        return <ArrowLeftRight className="h-3.5 w-3.5" />;
    };

    const handleOpenLinkedInvoice = useCallback(async (movement: any) => {
        try {
            if (!movement.reference_id || movement.reference_type !== 'goods_receipt') {
                toast.info(getLocalizedLabel('err_no_linked_inv', language));
                return;
            }

            const { data: receipt } = await supabase
                .from('purchase_receipts')
                .select('id, invoice_id, order_id')
                .eq('id', movement.reference_id)
                .single();

            if (!receipt) {
                toast.error(getLocalizedLabel('err_receipt_nf', language));
                return;
            }

            const invoiceId = receipt.invoice_id;
            if (!invoiceId) {
                if (receipt.order_id) {
                    const { data: invoices } = await supabase.from('purchase_transactions').select('*').eq('source_order_id', receipt.order_id).limit(1);
                    if (invoices?.length) { setLinkedInvoiceSheet({ open: true, invoiceData: invoices[0] }); return; }
                }
                toast.info(getLocalizedLabel('err_no_inv_linked', language));
                return;
            }

            const { data: invoice } = await supabase.from('purchase_transactions').select('*').eq('id', invoiceId).single();
            if (invoice) { setLinkedInvoiceSheet({ open: true, invoiceData: invoice }); }
            else { toast.error(getLocalizedLabel('err_inv_nf', language)); }
        } catch (err: any) {
            console.error('Failed to load linked invoice:', err);
            toast.error(err.message);
        }
    }, [language]);

    const handleOpenDocument = useCallback(async (m: any) => {
        try {
            // ══ حركات opening_balance (استيراد بضاعة أول المدة) → فتح MovementDetailDialog ══
            if (m.reference_type === 'opening_balance') {
                setMovementDetail({ open: true, movement: m });
                return;
            }

            // ══ حركات المناقلات → فتح TransferDeliveryDialog ══
            const isTransferMovement = transferTypes.includes(m.movement_type);
            if (isTransferMovement && m.reference_type === 'stock_transfer' && m.reference_id) {
                const { data: transfer } = await supabase
                    .from('stock_transfers')
                    .select('*')
                    .eq('id', m.reference_id)
                    .maybeSingle();
                if (transfer) {
                    setTransferDeliveryDialog({ open: true, transfer });
                    return;
                }
            }

            // ══ حركات المبيعات → فتح إذن التسليم فوراً ══
            // 🔑 تشمل: sale, issue, delivery, sale_invoice AND transfer_out with reference_type='sale_invoice'
            const isSalesMovement = salesTypes.includes(m.movement_type) || m.reference_type === 'sale_invoice';
            if (isSalesMovement) {
                const saleId = m.reference_id;
                if (!saleId) {
                    toast.info(getLocalizedLabel('err_no_linked_sale', language));
                    return;
                }
                // ⚡ فتح فوري — SalesDeliveryDialog يحمّل بياناته بنفسه via useEffect
                // نمرر فقط الـ id + أي بيانات متاحة من الحركة نفسها
                setSalesDeliveryDialog({
                    open: true,
                    salesInvoice: {
                        id: saleId,
                        source_id: saleId,
                        invoice_no: m.reference_number || undefined,
                        customer_name: m.party_name || undefined,
                        from_warehouse_name: m.from_warehouse_name || m.warehouse_name || undefined,
                    },
                });
                return;
            }

            // ── Helper: try to open receipt in viewMode ──
            const openReceiptView = (billType: 'purchase_local' | 'container', reference: string, receiptId?: string) => {
                setReceiptViewDialog({ open: true, billType, reference, receiptId });
            };

            // ── Helper: fallback - open purchase invoice directly ──
            const openById = async (id: string) => {
                const { data: inv } = await supabase.from('purchase_invoices').select('*').eq('id', id).maybeSingle();
                if (inv) { openReceiptView('purchase_local', inv.id); return true; }
                const { data: leg } = await supabase.from('purchase_transactions').select('*').eq('id', id).maybeSingle();
                if (leg) { openReceiptView('purchase_local', leg.id); return true; }
                return false;
            };

            // ── Helper: try to open by reference number ──
            const openByNumber = async (num: string) => {
                const { data: inv } = await supabase.from('purchase_invoices').select('id').eq('invoice_number', num).maybeSingle();
                if (inv) { openReceiptView('purchase_local', inv.id); return true; }
                const { data: leg } = await supabase.from('purchase_transactions').select('id').eq('invoice_no', num).maybeSingle();
                if (leg) { openReceiptView('purchase_local', leg.id); return true; }
                return false;
            };

            // ══ Path 1: reference_id = purchase_receipts.id ══
            if (m.reference_id) {
                const { data: receipt } = await supabase
                    .from('purchase_receipts')
                    .select('id, invoice_id, order_id, container_id')
                    .eq('id', m.reference_id)
                    .maybeSingle();

                if (receipt) {
                    if (receipt.container_id) {
                        // ✅ كونتينر → MaterialReceiptDialog نوع container
                        openReceiptView('container', receipt.container_id, receipt.id);
                        return;
                    }
                    if (receipt.invoice_id) {
                        // ✅ فاتورة شراء → MaterialReceiptDialog نوع purchase_local
                        openReceiptView('purchase_local', receipt.invoice_id, receipt.id);
                        return;
                    }
                    if (receipt.order_id) {
                        openReceiptView('purchase_local', receipt.order_id, receipt.id);
                        return;
                    }
                    // إذن استلام بدون مرجع
                    setReceiptViewDialog({ open: true, billType: 'purchase_local', reference: '', receiptId: receipt.id });
                    return;
                }

                const found = await openById(m.reference_id);
                if (found) return;
            }

            // ══ Path 2: Try reference_number as invoice number ══
            if (m.reference_number) {
                const found = await openByNumber(m.reference_number);
                if (found) return;
            }

            toast.info(getLocalizedLabel('err_no_linked_mov', language));
        } catch (err: any) {
            console.error('handleOpenDocument error:', err);
            toast.error(err.message);
        }
    }, [language, isRTL, salesTypes]);

    const counts = useMemo(() => {
        // Count unique reference_numbers (grouped documents), not individual material rows
        const countUnique = (filtered: typeof movements) => {
            const refs = new Set(filtered.map(m => m.reference_number || m.id));
            return refs.size;
        };
        return {
            all: countUnique(movements),
            purchases: countUnique(movements.filter(m => purchasesTypes.includes(m.movement_type))),
            sales: countUnique(movements.filter(m => salesTypes.includes(m.movement_type) || m.reference_type === 'sale_invoice')),
            containers: countUnique(movements.filter(m => containerTypes.includes(m.movement_type))),
            transfers: countUnique(movements.filter(m => transferTypes.includes(m.movement_type) && m.reference_type !== 'sale_invoice')),
        };
    }, [movements]);

    // ═══ Columns ═══
    const columns: NexaListColumn<any>[] = useMemo(() => [
        {
            id: 'date',
            header: getLocalizedLabel('sm_date', language),
            sortable: true,
            sortKey: 'date',
            cell: (m: any) => {
                const d = new Date(m.movement_date || m.created_at);
                const dateStr = d.toLocaleDateString('en-CA'); // yyyy-mm-dd
                const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                return (
                    <div className="flex flex-col gap-0.5 text-xs">
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-gray-800 dark:text-gray-200 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            {dateStr}
                        </div>
                        <span className="text-[11px] text-muted-foreground ms-5">
                            {timeStr}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 ms-5 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                            {getLocalizedLabel('sm_since', language)}{getElapsedTime(m.movement_date || m.created_at)}{getLocalizedLabel('sm_ago', language)}
                        </span>
                    </div>
                );
            }
        },
        {
            id: 'type',
            header: getLocalizedLabel('sm_type', language),
            sortable: true,
            sortKey: 'type',
            cell: (m: any) => {
                // opening_balance → show as special type
                const isOpeningBalance = m.reference_type === 'opening_balance';
                // transfer_out from sales → show as "تسليم مبيعات"
                const displayType = isOpeningBalance ? 'opening_balance'
                    : (m.movement_type === 'transfer_out' && m.reference_type === 'sale_invoice') ? 'delivery'
                    : m.movement_type;
                return (
                    <Badge variant="outline" className={`${movementTypeColors[displayType] || 'bg-gray-50 border-gray-200'} flex items-center gap-1.5 w-fit text-xs px-2 py-0.5 font-medium`}>
                        {isOpeningBalance ? <Import className="h-3.5 w-3.5" /> : getMovementTypeIcon(displayType)}
                        {isOpeningBalance
                            ? getLocalizedLabel('mt_opening_bal', language)
                            : m.movement_type === 'transfer_out' && m.reference_type === 'sale_invoice'
                            ? getLocalizedLabel('mt_sales_del', language)
                            : getMovementTypeLabel(m.movement_type)}
                    </Badge>
                );
            }
        },
        {
            // عمود الجهة الذكي: من → إلى حسب نوع الحركة
            id: 'flow',
            header: getLocalizedLabel('sm_flow', language),
            cell: (m: any) => {
                const resolvedPartyName = m.party_name || '';
                const isSales = salesTypes.includes(m.movement_type) || m.reference_type === 'sale_invoice';
                const isContainer = containerTypes.includes(m.movement_type);
                const isPurchase = purchasesTypes.includes(m.movement_type);
                const isTransfer = transferTypes.includes(m.movement_type) && m.reference_type !== 'sale_invoice';

                // من طرف
                let fromNode: React.ReactNode = null;
                if (isSales) {
                    const wName = m.from_warehouse_name || m.warehouse_name || '—';
                    fromNode = (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Warehouse className="h-3 w-3 flex-shrink-0 text-blue-400" />
                            <span className="truncate max-w-[130px]" title={wName}>{wName}</span>
                        </div>
                    );
                } else if (isContainer) {
                    const containerNo = m.reference_number || '—';
                    const supplier = resolvedPartyName && resolvedPartyName !== containerNo ? resolvedPartyName : '';
                    fromNode = (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-cyan-700 dark:text-cyan-400 font-medium">
                                <Package className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[130px] text-[11px]" title={containerNo}>{containerNo}</span>
                            </div>
                            {supplier && (
                                <span className="text-[9px] text-muted-foreground ms-4 truncate max-w-[130px]" title={supplier}>
                                    {supplier}
                                </span>
                            )}
                        </div>
                    );
                } else if (isPurchase) {
                    const supplier = resolvedPartyName || '—';
                    const invNo = m.reference_number || '';
                    fromNode = (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                <Building2 className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[130px]" title={supplier}>{supplier}</span>
                            </div>
                            {invNo && (
                                <span className="text-[9px] text-muted-foreground font-mono ms-4 truncate max-w-[130px]">
                                    {invNo}
                                </span>
                            )}
                        </div>
                    );
                } else if (isTransfer) {
                    const wName = m.from_warehouse_name || '—';
                    fromNode = (
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                            <Warehouse className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[130px]" title={wName}>{wName}</span>
                        </div>
                    );
                } else if (m.reference_type === 'opening_balance') {
                    fromNode = (
                        <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <Import className="h-3 w-3 flex-shrink-0" />
                            <span className="text-[11px] font-semibold">{getLocalizedLabel('mt_opening_bal', language)}</span>
                        </div>
                    );
                }

                // إلى طرف
                let toNode: React.ReactNode = null;
                if (isSales) {
                    const customer = resolvedPartyName || '—';
                    const refNo = m.reference_number || '';
                    toNode = (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[130px] font-semibold" title={customer}>{customer}</span>
                            </div>
                            {refNo && (
                                <span className="text-[10px] text-muted-foreground font-mono ms-4 truncate max-w-[130px]">
                                    {refNo}
                                </span>
                            )}
                        </div>
                    );
                } else if (m.reference_type === 'opening_balance') {
                    // Opening balance → show all unique warehouses
                    const whNames = m.warehouse_names ? Array.from(m.warehouse_names as Set<string>) : [];
                    const dest = whNames.length > 1
                        ? (`${whNames.length} ${getLocalizedLabel('sm_warehouses', language)}`)
                        : (m.to_warehouse_name || m.warehouse_name || '—');
                    toNode = (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-medium">
                                <Warehouse className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                                <span className="truncate max-w-[130px]" title={dest}>{dest}</span>
                            </div>
                            {whNames.length > 1 && (
                                <span className="text-[10px] text-muted-foreground ms-4 truncate max-w-[140px]">
                                    {whNames.join(' • ')}
                                </span>
                            )}
                        </div>
                    );
                } else {
                    const dest = m.to_warehouse_name || m.warehouse_name || '—';
                    toNode = (
                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium">
                            <Warehouse className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                            <span className="truncate max-w-[130px]" title={dest}>{dest}</span>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col gap-0.5 text-xs min-w-[160px]">
                        {fromNode}
                        <div className="flex items-center gap-1 text-gray-300 dark:text-gray-600 ms-1">
                            <ArrowDownToLine className="h-2.5 w-2.5" />
                        </div>
                        {toNode}
                    </div>
                );
            }
        },
        {
            id: 'material',
            header: getLocalizedLabel('sm_contents', language),
            sortable: true,
            sortKey: 'material',
            cell: (m: any) => {
                const names = m.material_names ? Array.from(m.material_names as Set<string>) : [];
                const uniqueCount = names.length;
                const displayName = uniqueCount > 0 ? names[0] : '—';
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                            {uniqueCount > 1
                                ? (`${uniqueCount} ${getLocalizedLabel('sm_items', language)}`)
                                : displayName}
                        </span>
                        {uniqueCount > 1 && (
                            <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {names.slice(0, 3).join('، ')}{names.length > 3 ? ` +${names.length - 3}` : ''}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'quantity',
            header: getLocalizedLabel('sm_quantity', language),
            sortable: true,
            sortKey: 'quantity',
            cell: (m: any) => {
                const rollCount = m.roll_ids?.size || m.receipt_rolls_count || 0;
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-semibold text-sm tabular-nums text-gray-800 dark:text-gray-200">
                            {Number(m.total_quantity || m.quantity || 0).toLocaleString('en-US')}
                            <span className="text-[10px] text-muted-foreground font-normal ms-1">{m.unit || getLocalizedUnit('meter', language)}</span>
                        </span>
                        {rollCount > 0 && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                                {rollCount} {getLocalizedLabel('sm_rolls', language)}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'reference',
            header: getLocalizedLabel('sm_ref_party', language),
            sortable: true,
            sortKey: 'reference',
            cell: (m: any) => {
                const resolvedPartyName = m.party_name || '';
                const isSales = salesTypes.includes(m.movement_type) || m.reference_type === 'sale_invoice';
                const isPurchase = purchasesTypes.includes(m.movement_type);
                const isContainer = containerTypes.includes(m.movement_type);
                return (
                    <div className="flex flex-col items-start gap-0.5">
                        <span className="text-erp-navy dark:text-blue-300 font-semibold font-mono text-sm tracking-wide">
                            {m.reference_number || m.id?.substring(0, 8)}
                        </span>
                        {resolvedPartyName ? (
                            <div className="flex items-center gap-1 text-[11px]">
                                {isSales ? <User className="h-3 w-3 flex-shrink-0 text-rose-500" />
                                    : (isPurchase || isContainer) ? <Building2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                                        : <Warehouse className="h-3 w-3 flex-shrink-0 text-orange-500" />}
                                <span className={`truncate max-w-[140px] font-medium ${isSales ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                    }`} title={resolvedPartyName}>
                                    {resolvedPartyName}
                                </span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-muted-foreground">
                                {getMovementTypeLabel(m.reference_type || m.movement_type)}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'status',
            header: getLocalizedLabel('sm_status', language),
            sortable: true,
            sortKey: 'status',
            cell: (m: any) => {
                const isTransfer = transferTypes.includes(m.movement_type);
                let status = m.status || 'completed';
                let label = '';
                let variant: 'default' | 'secondary' | 'outline' = 'default';

                if (isTransfer) {
                    // For transfers, show the actual transfer status
                    if (m.movement_type === 'transfer_out') {
                        label = getLocalizedLabel('sm_shipped', language);
                        variant = 'secondary';
                    } else if (m.movement_type === 'transfer_in') {
                        label = getLocalizedLabel('sm_received', language);
                        variant = 'default';
                    } else {
                        label = getLocalizedLabel('mt_transfer', language);
                        variant = 'outline';
                    }
                } else {
                    label = status === 'completed' ? getLocalizedLabel('sm_completed', language)
                        : status === 'pending' ? getLocalizedLabel('sm_pending', language)
                            : status;
                    variant = status === 'completed' ? 'default' : 'secondary';
                }
                return (
                    <Badge
                        variant={variant}
                        className="text-xs px-2"
                    >
                        {label}
                    </Badge>
                );
            }
        },
    ], [language, t, salesTypes, containerTypes, purchasesTypes, transferTypes]);

    return (
        <div className="flex flex-col space-y-3" dir={direction}>
            {/* ─── Page Header ─── */}
            <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            {getLocalizedLabel('sm_title', language)}
                        </h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {getLocalizedLabel('sm_subtitle', language)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══ Summary Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { labelKey: 'rd_tab_all', value: counts.all, color: 'text-gray-700 dark:text-gray-300', bg: 'from-gray-500/10 to-gray-600/5 border-gray-200/60 dark:border-gray-700/40', iconBg: 'text-gray-500 bg-gray-50 dark:bg-gray-800', icon: Package },
                    { labelKey: 'rd_purchases', value: counts.purchases, color: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/60 dark:border-emerald-800/40', iconBg: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/40', icon: Truck },
                    { labelKey: 'rd_sales', value: counts.sales, color: 'text-rose-600 dark:text-rose-400', bg: 'from-rose-500/10 to-rose-600/5 border-rose-200/60 dark:border-rose-800/40', iconBg: 'text-rose-500 bg-rose-50 dark:bg-rose-900/40', icon: ShoppingCart },
                    { labelKey: 'rd_containers', value: counts.containers, color: 'text-indigo-600 dark:text-indigo-400', bg: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200/60 dark:border-indigo-800/40', iconBg: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40', icon: Package },
                    { labelKey: 'rd_transfers', value: counts.transfers, color: 'text-purple-600 dark:text-purple-400', bg: 'from-purple-500/10 to-purple-600/5 border-purple-200/60 dark:border-purple-800/40', iconBg: 'text-purple-500 bg-purple-50 dark:bg-purple-900/40', icon: ArrowLeftRight },
                ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                        <div key={i} className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-br px-4 py-3 shadow-sm transition-shadow hover:shadow-md', stat.bg)}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                                        {getLocalizedLabel(stat.labelKey, language)}
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

                    {/* Warehouse */}
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                            {getLocalizedLabel('sm_warehouse', language)}
                        </span>
                        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                            <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <SelectValue placeholder={getLocalizedLabel('sm_all_wh', language)} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">{getLocalizedLabel('sm_all_wh', language)}</SelectItem>
                                {warehouses.map((w: any) => (
                                    <SelectItem key={w.id} value={w.id} className="text-xs">
                                        {isRTL ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                            {getLocalizedLabel('sm_period', language)}
                        </span>
                        <div className="flex items-center gap-1">
                            <DateRangePicker
                                date={dateRange}
                                setDate={setDateRange}
                                align={isRTL ? 'end' : 'start'}
                            />
                            {dateRange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-gray-400 hover:text-red-500"
                                    onClick={() => setDateRange(undefined)}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Spacer + Refresh */}
                    <div className="flex items-end gap-2 ms-auto">
                        <span className="text-[10px] text-gray-400 hidden lg:block pb-1.5">
                            {getLocalizedLabel('rd_updated', language)} {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                            onClick={handleManualRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline">{getLocalizedLabel('rd_refresh', language)}</span>
                        </Button>
                    </div>
                </div>

                {/* ── Sub-Tabs Filters ── */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-wrap">
                    <Tabs value={subFilter} onValueChange={(v) => setSubFilter(v as any)} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <Package className="w-4 h-4 me-1.5" />
                                {getLocalizedLabel('rd_tab_all', language)}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{counts.all}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="purchases" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Truck className="w-4 h-4 me-1.5" />
                                {getLocalizedLabel('rd_tab_purch', language)}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{counts.purchases}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="sales" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-rose-600 font-tajawal">
                                <ShoppingCart className="w-4 h-4 me-1.5" />
                                {getLocalizedLabel('rd_tab_sales', language)}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-rose-100/60 text-rose-700">{counts.sales}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="containers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-indigo-600 font-tajawal">
                                <Package className="w-4 h-4 me-1.5" />
                                {getLocalizedLabel('rd_tab_cont', language)}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-indigo-100/60 text-indigo-700">{counts.containers}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-purple-600 font-tajawal">
                                <ArrowLeftRight className="w-4 h-4 me-1.5" />
                                {getLocalizedLabel('rd_tab_trans', language)}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-purple-100/60 text-purple-700">{counts.transfers}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* ── Table ── */}
                <NexaListTable
                    data={groupedMovements}
                    columns={columns}
                    getRowKey={(r: any) => r.id}
                    isLoading={loading}
                    searchPlaceholder={getLocalizedLabel('sm_search', language)}
                    searchTerm={searchQuery}
                    onSearchChange={setSearchQuery}
                    onRowClick={(m: any) => handleOpenDocument(m)}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={(field) => {
                        if (sortField === field) setSortAsc(!sortAsc);
                        else { setSortField(field); setSortAsc(false); }
                    }}
                    isRTL={isRTL}
                    direction={direction as 'rtl' | 'ltr'}
                    emptyMessage={getLocalizedLabel('sm_empty', language)}
                />
            </div>

            {/* Linked Invoice Sheet */}
            {linkedInvoiceSheet.open && linkedInvoiceSheet.invoiceData && (
                <UnifiedTradeSheet
                    open={linkedInvoiceSheet.open}
                    onOpenChange={(open) => setLinkedInvoiceSheet(prev => ({ ...prev, open }))}
                    mode="purchase"
                    type="invoice"
                    initialData={linkedInvoiceSheet.invoiceData}
                    userRole="admin"
                    onRefresh={() => { }}
                />
            )}


            {/* Container Sheet — إذن استلام الكونتينر */}
            {containerSheet.open && containerSheet.data && (
                <UnifiedTradeSheet
                    open={containerSheet.open}
                    onOpenChange={(open) => setContainerSheet(prev => ({ ...prev, open }))}
                    mode="purchase"
                    type="container"
                    initialData={containerSheet.data}
                    companyId={companyId}
                    onRefresh={() => { }}
                />
            )}

            {/* ✅ إذن الاستلام / الكونتينر — MaterialReceiptDialog في وضع العرض */}
            {receiptViewDialog.open && (
                <MaterialReceiptDialog
                    isOpen={receiptViewDialog.open}
                    onOpenChange={(open) => setReceiptViewDialog(prev => ({ ...prev, open }))}
                    defaultBillType={receiptViewDialog.billType}
                    defaultReference={receiptViewDialog.reference}
                    receiptId={receiptViewDialog.receiptId}
                    viewMode={true}
                    onComplete={() => {
                        setReceiptViewDialog(prev => ({ ...prev, open: false }));
                        refetchMovements();
                    }}
                    onOpenSourceDocument={(sourceId, sourceType) => {
                        // ✅ فتح الوثيقة الأم (فاتورة أو كونتينر)
                        setReceiptViewDialog(prev => ({ ...prev, open: false }));
                        setTimeout(() => {
                            if (sourceType === 'container') {
                                // فتح الكونتينر في UnifiedTradeSheet
                                setContainerSheet({ open: true, data: { id: sourceId } });
                            } else {
                                // فتح فاتورة الشراء في UnifiedTradeSheet
                                setLinkedInvoiceSheet({ open: true, invoiceData: { id: sourceId } });
                            }
                        }, 200);
                    }}
                />
            )}

            {/* Sales Delivery Dialog — إذن التسليم بتبويباته */}
            {salesDeliveryDialog.open && salesDeliveryDialog.salesInvoice && (
                <SalesDeliveryDialog
                    isOpen={salesDeliveryDialog.open}
                    onOpenChange={(open) => setSalesDeliveryDialog(prev => ({ ...prev, open }))}
                    salesInvoice={salesDeliveryDialog.salesInvoice}
                    viewMode={true}
                    onOpenInvoice={(invData) => setSalesInvoiceSheet({ open: true, invoiceData: invData })}
                    onComplete={() => {
                        setSalesDeliveryDialog({ open: false, salesInvoice: null });
                        refetchMovements();
                    }}
                />
            )}

            {/* Sales Invoice Sheet — الفاتورة المالية */}
            {salesInvoiceSheet.open && salesInvoiceSheet.invoiceData && (
                <UnifiedTradeSheet
                    open={salesInvoiceSheet.open}
                    onOpenChange={(open) => setSalesInvoiceSheet(prev => ({ ...prev, open }))}
                    mode="sales"
                    type="invoice"
                    initialData={salesInvoiceSheet.invoiceData}
                    companyId={companyId}
                    onRefresh={() => { }}
                />
            )}

            {/* Transfer Delivery Dialog — عرض/استلام مناقلة */}
            {transferDeliveryDialog.open && transferDeliveryDialog.transfer && (
                <TransferDeliveryDialog
                    isOpen={transferDeliveryDialog.open}
                    onOpenChange={(open) => setTransferDeliveryDialog(prev => ({ ...prev, open }))}
                    transfer={transferDeliveryDialog.transfer}
                    onComplete={() => {
                        setTransferDeliveryDialog({ open: false, transfer: null });
                        refetchMovements();
                    }}
                />
            )}

            {/* Movement Detail Sheet — حركات بدون مستند (opening_balance, adjustment, etc.) */}
            <MovementDetailDialog
                open={movementDetail.open}
                onOpenChange={(open) => setMovementDetail(prev => ({ ...prev, open }))}
                movement={movementDetail.movement}
                onOpenJournal={async (journalId) => {
                    try {
                        const { data: je } = await supabase
                            .from('journal_entries')
                            .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(id, account_code, name_ar, name_en))')
                            .eq('id', journalId)
                            .single();
                        if (je) {
                            setJournalSheet({ open: true, data: je });
                        } else {
                            toast.error(getLocalizedLabel('err_journal_nf', language));
                        }
                    } catch (err) {
                        console.error('Failed to load journal:', err);
                        toast.error(getLocalizedLabel('err_journal_load', language));
                    }
                }}
            />

            {/* Journal Entry Sheet — عرض القيد المحاسبي المرتبط */}
            {journalSheet.open && journalSheet.data && (
                <UnifiedAccountingSheet
                    key={`journal-${journalSheet.data.id}`}
                    isOpen={journalSheet.open}
                    onClose={() => setJournalSheet({ open: false, data: null })}
                    docType="journal"
                    mode="view"
                    data={journalSheet.data}
                    documentId={journalSheet.data.id}
                />
            )}
        </div>
    );
}

