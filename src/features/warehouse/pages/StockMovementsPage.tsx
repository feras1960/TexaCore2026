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

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useStockMovements, useWarehouses } from '../hooks/useWarehouseQueries';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { SalesDeliveryDialog } from '../components/SalesDeliveryDialog';
import { MaterialReceiptDialog } from '../components/MaterialReceiptDialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Button } from '@/components/ui/button';

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
};

export default function StockMovementsPage() {
    const { t, language, isRTL, direction } = useLanguage();
    const { companyId, isSuperAdmin } = useAuth();

    // ═══ Filters State ═══
    const [subFilter, setSubFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<string>('date');
    const [sortAsc, setSortAsc] = useState<boolean>(false);
    // 📅 فلتر التاريخ — يستخدم DateRangePicker المشترك
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
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
    // ── داخل إذن التسليم: يفتح الفاتورة المالية عند الضغط على العميل ──
    const [salesInvoiceSheet, setSalesInvoiceSheet] = useState<{ open: boolean; invoiceData: any }>({ open: false, invoiceData: null });

    // ⚡ React Query: cached data — Pull on Demand
    const {
        movements,
        loading,
        error,
        refetch: refetchMovements,
    } = useStockMovements({
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        warehouse: selectedWarehouse !== 'all' ? selectedWarehouse : undefined,
    });
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // 🔑 إثراء أسماء الجهات (reference_id → عميل/مورد) — مستقل عن React Query
    const [partyNames, setPartyNames] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!movements || movements.length === 0) return;
        const saleTypes = ['sale', 'sale_invoice', 'issue', 'delivery'];
        const purTypes = ['receipt', 'purchase', 'container_receipt', 'goods_receipt', 'container'];

        const fetchPartyNames = async () => {
            const result: Record<string, string> = {};

            // أ) مبيعات: reference_id = sales_transactions.id
            const saleRefIds = [...new Set(
                movements
                    .filter(m => saleTypes.includes(m.movement_type))
                    .map(m => (m as any).reference_id)
                    .filter(Boolean)
            )] as string[];

            if (saleRefIds.length > 0) {
                const { data } = await supabase
                    .from('sales_transactions')
                    .select('id, customer_name')
                    .in('id', saleRefIds);
                data?.forEach((s: any) => { if (s.id && s.customer_name) result[s.id] = s.customer_name; });
            }

            // ب) شراء: reference_id = purchase_receipts.id → invoice_id → supplier_name
            const purRefIds = [...new Set(
                movements
                    .filter(m => purTypes.includes(m.movement_type) || purTypes.includes((m as any).reference_type))
                    .map(m => (m as any).reference_id)
                    .filter(Boolean)
            )] as string[];

            if (purRefIds.length > 0) {
                const { data: rcpts } = await supabase
                    .from('purchase_receipts')
                    .select('id, invoice_id, container_id')
                    .in('id', purRefIds);

                if (rcpts && rcpts.length > 0) {
                    // مسار 1: invoice_id → purchase_invoices.supplier_name
                    const iids = [...new Set(rcpts.map((r: any) => r.invoice_id).filter(Boolean))] as string[];
                    if (iids.length > 0) {
                        const { data: pi } = await supabase.from('purchase_invoices').select('id, supplier_name').in('id', iids);
                        pi?.forEach((r: any) => { rcpts.forEach((rc: any) => { if (rc.invoice_id === r.id && r.supplier_name) result[rc.id] = r.supplier_name; }); });
                        const { data: pt } = await supabase.from('purchase_transactions').select('id, supplier_name').in('id', iids);
                        pt?.forEach((r: any) => { rcpts.forEach((rc: any) => { if (rc.invoice_id === r.id && r.supplier_name && !result[rc.id]) result[rc.id] = r.supplier_name; }); });
                    }
                    // مسار 2: container_id → containers.supplier_id → parties
                    const cids = [...new Set(rcpts.filter((r: any) => !result[r.id]).map((r: any) => r.container_id).filter(Boolean))] as string[];
                    if (cids.length > 0) {
                        const { data: conts } = await supabase.from('containers').select('id, supplier_id').in('id', cids);
                        if (conts && conts.length > 0) {
                            const sids = [...new Set(conts.map((c: any) => c.supplier_id).filter(Boolean))] as string[];
                            if (sids.length > 0) {
                                const { data: parties } = await supabase.from('parties').select('id, name_ar, name_en').in('id', sids);
                                const pm: Record<string, string> = {};
                                parties?.forEach((p: any) => { pm[p.id] = p.name_ar || p.name_en || ''; });
                                conts.forEach((c: any) => {
                                    rcpts.filter((r: any) => r.container_id === c.id).forEach((r: any) => {
                                        if (!result[r.id]) result[r.id] = pm[c.supplier_id] || '';
                                    });
                                });
                            }
                        }
                    }
                }
            }

            setPartyNames(result);
        };

        fetchPartyNames();
    }, [movements]);

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
        else if (subFilter === 'sales') result = result.filter(m => salesTypes.includes(m.movement_type));
        else if (subFilter === 'containers') result = result.filter(m => containerTypes.includes(m.movement_type));
        else if (subFilter === 'transfers') result = result.filter(m => transferTypes.includes(m.movement_type));

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
                // Keep first movement for dates/metadata
            } else {
                groupMap.set(key, {
                    ...m,
                    total_quantity: Number(m.quantity || 0),
                    items_count: 1,
                    material_names: new Set([
                        (language === 'ar' ? m.material_name_ar : m.material_name_en) || m.material_name_ar || m.material_name_en || ''
                    ]),
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
        if (diffMins < 60) return `${diffMins} ${isRTL ? 'د' : 'm'}`;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) return `${diffHours} ${isRTL ? 'س' : 'h'}`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ${isRTL ? 'يوم' : 'd'}`;
    };

    // خريطة ثابتة لأنواع الحركات — بديل للمفاتيح غير المترجمة
    const movementTypeLabels: Record<string, { ar: string; en: string }> = {
        'sale': { ar: 'مبيعات', en: 'Sale' },
        'sale_invoice': { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
        'issue': { ar: 'صرف بضاعة', en: 'Issue' },
        'delivery': { ar: 'تسليم', en: 'Delivery' },
        'receipt': { ar: 'استلام', en: 'Receipt' },
        'purchase': { ar: 'مشتريات', en: 'Purchase' },
        'purchase_invoice': { ar: 'فاتورة شراء', en: 'Purchase Invoice' },
        'return': { ar: 'مرتجع', en: 'Return' },
        'container': { ar: 'كونتينر', en: 'Container' },
        'container_receipt': { ar: 'استلام كونتينر', en: 'Container Receipt' },
        'goods_receipt': { ar: 'إذن استلام', en: 'GRN' },
        'transfer': { ar: 'مناقلة', en: 'Transfer' },
        'transfer_in': { ar: 'مناقلة واردة', en: 'Transfer In' },
        'transfer_out': { ar: 'مناقلة صادرة', en: 'Transfer Out' },
        'adjustment': { ar: 'تسوية', en: 'Adjustment' },
        'adjustment_in': { ar: 'تسوية واردة', en: 'Adj. In' },
        'adjustment_out': { ar: 'تسوية صادرة', en: 'Adj. Out' },
    };

    const getMovementTypeLabel = (type: string) => {
        const entry = movementTypeLabels[type];
        if (entry) return isRTL ? entry.ar : entry.en;
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
                toast.info(language === 'ar' ? 'لا توجد فاتورة مرتبطة' : 'No linked invoice found');
                return;
            }

            const { data: receipt } = await supabase
                .from('purchase_receipts')
                .select('id, invoice_id, order_id')
                .eq('id', movement.reference_id)
                .single();

            if (!receipt) {
                toast.error(language === 'ar' ? 'لم يتم العثور على إذن الاستلام' : 'Receipt not found');
                return;
            }

            const invoiceId = receipt.invoice_id;
            if (!invoiceId) {
                if (receipt.order_id) {
                    const { data: invoices } = await supabase.from('purchase_transactions').select('*').eq('source_order_id', receipt.order_id).limit(1);
                    if (invoices?.length) { setLinkedInvoiceSheet({ open: true, invoiceData: invoices[0] }); return; }
                }
                toast.info(language === 'ar' ? 'لا توجد فاتورة مرتبطة بالاستلام' : 'No invoice linked to this receipt');
                return;
            }

            const { data: invoice } = await supabase.from('purchase_transactions').select('*').eq('id', invoiceId).single();
            if (invoice) { setLinkedInvoiceSheet({ open: true, invoiceData: invoice }); }
            else { toast.error(language === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found'); }
        } catch (err: any) {
            console.error('Failed to load linked invoice:', err);
            toast.error(err.message);
        }
    }, [language]);

    const handleOpenDocument = useCallback(async (m: any) => {
        try {
            // ══ حركات المبيعات → فتح فاتورة المبيعات ══
            const isSalesMovement = salesTypes.includes(m.movement_type);
            if (isSalesMovement) {
                // البحث عن فاتورة المبيعات عبر reference_id أو reference_number
                let salesInvoice: any = null;

                // محاولة 1: reference_id هو sales_transaction
                if (m.reference_id) {
                    const { data: st } = await supabase
                        .from('sales_transactions')
                        .select('*')
                        .eq('id', m.reference_id)
                        .maybeSingle();
                    if (st) salesInvoice = st;
                }

                // محاولة 2: reference_number هو رقم الفاتورة
                if (!salesInvoice && m.reference_number) {
                    const { data: st } = await supabase
                        .from('sales_transactions')
                        .select('*')
                        .or(`invoice_no.eq.${m.reference_number},delivery_no.eq.${m.reference_number},order_no.eq.${m.reference_number}`)
                        .maybeSingle();
                    if (st) salesInvoice = st;
                }

                if (salesInvoice) {
                    // فتح SalesDeliveryDialog (إذن التسليم بتبويباته الكاملة)
                    // يحتوي على: الرولونات، تفاصيل التسليم، وزر لفتح الفاتورة المالية
                    setSalesDeliveryDialog({
                        open: true,
                        salesInvoice: {
                            ...salesInvoice,
                            // id مطلوب لـ SalesDeliveryDialog
                            id: salesInvoice.id,
                            source_id: salesInvoice.id,
                        },
                    });
                    return;
                }
                toast.info(isRTL ? 'لم يتم العثور على فاتورة المبيعات المرتبطة' : 'No linked sales invoice found');
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

            toast.info(isRTL
                ? 'لا توجد وثيقة مرتبطة بهذه الحركة'
                : 'No linked document for this movement');
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
            sales: countUnique(movements.filter(m => salesTypes.includes(m.movement_type))),
            containers: countUnique(movements.filter(m => containerTypes.includes(m.movement_type))),
            transfers: countUnique(movements.filter(m => transferTypes.includes(m.movement_type))),
        };
    }, [movements]);

    // ═══ Columns ═══
    const columns: NexaListColumn<any>[] = useMemo(() => [
        {
            id: 'date',
            header: isRTL ? 'التاريخ والوقت' : 'Date & Time',
            sortable: true,
            sortKey: 'date',
            cell: (m: any) => (
                <div className="flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center gap-1.5 whitespace-nowrap font-mono text-gray-700 dark:text-gray-300">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        {formatDate(m.movement_date || m.created_at)}
                    </div>
                    <span className="text-[10px] text-muted-foreground ms-5 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                        {isRTL ? 'منذ ' : ''}{getElapsedTime(m.created_at || m.movement_date)}{!isRTL ? ' ago' : ''}
                    </span>
                </div>
            )
        },
        {
            id: 'type',
            header: isRTL ? 'نوع الحركة' : 'Movement Type',
            sortable: true,
            sortKey: 'type',
            cell: (m: any) => (
                <Badge variant="outline" className={`${movementTypeColors[m.movement_type] || 'bg-gray-50 border-gray-200'} flex items-center gap-1.5 w-fit text-xs px-2 py-0.5 font-medium`}>
                    {getMovementTypeIcon(m.movement_type)}
                    {getMovementTypeLabel(m.movement_type)}
                </Badge>
            )
        },
        {
            // عمود الجهة الذكي: من → إلى حسب نوع الحركة
            id: 'flow',
            header: isRTL ? 'الجهة (من → إلى)' : 'Flow (From → To)',
            cell: (m: any) => {
                // الجهة من state المحلي (partyNames) أو من service enrichment
                const resolvedPartyName = partyNames[m.reference_id] || m.party_name || '';
                const isSales = salesTypes.includes(m.movement_type);
                const isContainer = containerTypes.includes(m.movement_type);
                const isPurchase = purchasesTypes.includes(m.movement_type);
                const isTransfer = transferTypes.includes(m.movement_type);

                // من طرف
                let fromNode: React.ReactNode = null;
                if (isSales) {
                    // مبيعات: المستودع هو المصدر
                    const wName = m.from_warehouse_name || m.warehouse_name || '—';
                    fromNode = (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Warehouse className="h-3 w-3 flex-shrink-0 text-blue-400" />
                            <span className="truncate max-w-[110px]" title={wName}>{wName}</span>
                        </div>
                    );
                } else if (isContainer) {
                    // كونتينر: اسم المورد أو رقم الكونتينر هو المصدر
                    const src = resolvedPartyName || m.reference_number || '—';
                    fromNode = (
                        <div className="flex items-center gap-1 text-cyan-700 dark:text-cyan-400">
                            <Package className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[110px] font-mono text-[11px]" title={src}>{src}</span>
                        </div>
                    );
                } else if (isPurchase) {
                    // شراء: المورد هو المصدر
                    const supplier = resolvedPartyName || '—';
                    fromNode = (
                        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[110px]" title={supplier}>{supplier}</span>
                        </div>
                    );
                } else if (isTransfer) {
                    // مناقلة: مستودع المصدر
                    const wName = m.from_warehouse_name || '—';
                    fromNode = (
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <Warehouse className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[110px]" title={wName}>{wName}</span>
                        </div>
                    );
                }

                // إلى طرف
                let toNode: React.ReactNode = null;
                if (isSales) {
                    // مبيعات: العميل هو الوجهة
                    const customer = resolvedPartyName || '—';
                    toNode = (
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[110px] font-semibold" title={customer}>{customer}</span>
                        </div>
                    );
                } else {
                    // شراء/كونتينر/مناقلة: المستودع هو الوجهة
                    const dest = m.to_warehouse_name || m.warehouse_name || '—';
                    toNode = (
                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium">
                            <Warehouse className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                            <span className="truncate max-w-[110px]" title={dest}>{dest}</span>
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
            header: isRTL ? 'المحتويات' : 'Contents',
            sortable: true,
            sortKey: 'material',
            cell: (m: any) => {
                const names = m.material_names ? Array.from(m.material_names as Set<string>) : [];
                const displayName = names.length > 0 ? names[0] : '—';
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                            {m.items_count > 1
                                ? (isRTL ? `${m.items_count} مادة` : `${m.items_count} items`)
                                : displayName}
                        </span>
                        {m.items_count > 1 && (
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
            header: isRTL ? 'الكمية' : 'Quantity',
            sortable: true,
            sortKey: 'quantity',
            cell: (m: any) => (
                <span className="font-mono font-semibold text-sm tabular-nums text-gray-800 dark:text-gray-200">
                    {Number(m.total_quantity || m.quantity || 0).toLocaleString('en-US')}
                    <span className="text-[10px] text-muted-foreground font-normal ms-1">{m.unit || (isRTL ? 'م' : 'm')}</span>
                </span>
            )
        },
        {
            id: 'reference',
            header: isRTL ? 'المرجع' : 'Reference',
            sortable: true,
            sortKey: 'reference',
            cell: (m: any) => (
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-erp-navy dark:text-blue-300 font-semibold font-mono text-sm tracking-wide">
                        {m.reference_number || m.id?.substring(0, 8)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                        {m.reference_type || m.movement_type}
                    </span>
                </div>
            )
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            sortable: true,
            sortKey: 'status',
            cell: (m: any) => {
                const status = m.status || 'completed';
                const label = status === 'completed' ? (isRTL ? 'مكتمل' : 'Completed')
                    : status === 'pending' ? (isRTL ? 'معلق' : 'Pending')
                        : status;
                return (
                    <Badge
                        variant={status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs px-2"
                    >
                        {label}
                    </Badge>
                );
            }
        },
    ], [isRTL, language, t, salesTypes, containerTypes, purchasesTypes, transferTypes, partyNames]);

    return (
        <div className="flex flex-col space-y-3" dir={direction}>
            {/* ─── Page Header ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shadow-sm">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'حركات المخزون' : 'Stock Movements'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? 'سجل شامل لجميع حركات الأصناف والمواد في المستودعات' : 'Comprehensive record of all item and material movements'}
                        </p>
                    </div>
                </div>
                {/* ─── Filters Bar: Warehouse + Date Range + Refresh ─── */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* فلتر المستودع */}
                    <div className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                            <SelectTrigger className="h-9 text-xs w-[160px] border-gray-200">
                                <SelectValue placeholder={isRTL ? 'كل المستودعات' : 'All Warehouses'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isRTL ? 'كل المستودعات' : 'All Warehouses'}</SelectItem>
                                {warehouses.map((w: any) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {isRTL ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* فلتر التاريخ — المكوّن المشترك */}
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                        align={isRTL ? 'end' : 'start'}
                    />
                    {dateRange && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-xs text-gray-400 hover:text-red-500"
                            onClick={() => setDateRange(undefined)}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    )}

                    {/* آخر تحديث + زر التحديث */}
                    <span className="text-[10px] text-gray-400 font-mono hidden lg:block">
                        {isRTL ? 'آخر تحديث:' : 'Updated:'} {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={handleManualRefresh}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </Button>
                </div>
            </div>
            {/* Header Tabs - RTL: الكل ← مشتريات ← مبيعات ← كونتينرات ← مناقلات */}
            <div className="bg-white dark:bg-gray-900 rounded-t-xl border-b overflow-x-auto">
                <Tabs value={subFilter} onValueChange={setSubFilter} dir={direction}>
                    <TabsList className={`bg-transparent h-12 p-0 border-none rounded-none flex ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                        <TabsTrigger
                            value="transfers"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 data-[state=active]:shadow-none rounded-none h-12 px-4 text-sm font-medium"
                        >
                            <ArrowLeftRight className="w-4 h-4 me-2" />
                            {isRTL ? 'مناقلات' : 'Transfers'}
                            <Badge className="ms-2 text-[10px] py-0 px-1.5 h-4 bg-orange-100 text-orange-700 hover:bg-orange-100">{counts.transfers}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="containers"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none h-12 px-4 text-sm font-medium"
                        >
                            <Package className="w-4 h-4 me-2" />
                            {isRTL ? 'كونتينرات' : 'Containers'}
                            <Badge className="ms-2 text-[10px] py-0 px-1.5 h-4 bg-blue-100 text-blue-700 hover:bg-blue-100">{counts.containers}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="sales"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-rose-600 data-[state=active]:text-rose-600 data-[state=active]:shadow-none rounded-none h-12 px-4 text-sm font-medium"
                        >
                            <ShoppingCart className="w-4 h-4 me-2" />
                            {isRTL ? 'مبيعات' : 'Sales'}
                            <Badge className="ms-2 text-[10px] py-0 px-1.5 h-4 bg-rose-100 text-rose-700 hover:bg-rose-100">{counts.sales}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="purchases"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none rounded-none h-12 px-4 text-sm font-medium"
                        >
                            <Truck className="w-4 h-4 me-2" />
                            {isRTL ? 'مشتريات' : 'Purchases'}
                            <Badge className="ms-2 text-[10px] py-0 px-1.5 h-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{counts.purchases}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="all"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-erp-navy data-[state=active]:text-erp-navy data-[state=active]:shadow-none rounded-none h-12 px-4 text-sm font-medium"
                        >
                            <ArrowLeftRight className="w-4 h-4 me-2" />
                            {isRTL ? 'الكل' : 'All'}
                            <Badge variant="secondary" className="ms-2 text-[10px] py-0 px-1.5 h-4">{counts.all}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Main Table View */}
            <div className="bg-white dark:bg-gray-900 rounded-b-xl border border-t-0 shadow-sm overflow-hidden">
                <NexaListTable
                    data={groupedMovements}
                    columns={columns}
                    getRowKey={(r: any) => r.id}
                    isLoading={loading}
                    searchPlaceholder={isRTL ? 'ابحث بالصنف أو المرجع...' : 'Search material or reference...'}
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
                    emptyMessage={isRTL ? 'لم يتم العثور على حركات مطابقة' : 'No movements found'}
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
        </div>
    );
}

