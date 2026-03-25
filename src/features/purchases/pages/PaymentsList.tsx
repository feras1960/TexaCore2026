/**
 * ════════════════════════════════════════════════════════════════
 * 💳 PaymentsList — قائمة المدفوعات (سندات الصرف)
 * ════════════════════════════════════════════════════════════════
 *
 * Pattern: NexaListTable + filter tabs
 *   - Tabs: الكل | فواتير مشتريات | كونتينرات
 *   - Sub-Ledger party tracking
 *   - DateRangePicker + Search
 *   - Premium design matching SuppliersList
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from 'react';
import {
    Wallet,
    Plus,
    CreditCard,
    Banknote,
    Building2,
    Ship,
    FileText,
    Eye,
    MoreHorizontal,
    CalendarDays,
    Hash,
    CheckCircle2,
    Clock,
    XCircle,
    Package,
    Receipt,
    CircleDollarSign,
} from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay, format } from 'date-fns';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────
interface PaymentVoucher {
    id: string;
    voucher_number: string;
    payment_number: string;
    voucher_date: string;
    supplier_id: string;
    supplier_name: string;
    amount: number;
    payment_method: string;
    status: string;
    currency: string;
    exchange_rate: number;
    journal_entry_id: string;
    notes: string;
    type: string;
    purchase_invoice_id: string | null;
    container_id: string | null;
    shipment_id: string | null;
    sales_invoice_id: string | null;
    customer_id: string | null;
    created_at: string;
    // Joined relations
    supplier?: { name_ar: string; name_en: string } | null;
    container?: { container_number: string; shipment_number: string } | null;
    invoice?: { invoice_no: string } | null;
    // Computed
    linked_type: 'purchase_invoice' | 'container' | 'shipment' | 'other';
}

// ═══════════════════════════════════════════════════════════════
export default function PaymentsList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isRTL = direction === 'rtl';

    // 🔄 Realtime
    useRealtimeInvalidation({
        table: 'payment_vouchers',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['payments_list']],
    });

    // ─── State ───────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'all' | 'purchase_invoice' | 'container'>('all');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<PaymentVoucher | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('voucher_date');
    const [sortAsc, setSortAsc] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // ─── Fetch Payments ──────────────────────────────────────────
    const { data: payments = [], isLoading } = useQuery({
        queryKey: ['payments_list', companyId, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let q = supabase
                .from('payment_vouchers')
                .select(`
                    *,
                    supplier:suppliers(name_ar, name_en),
                    container:containers(container_number, shipment_number),
                    invoice:purchase_invoices!purchase_invoice_id(invoice_number)
                `)
                .eq('company_id', companyId)
                .order('voucher_date', { ascending: false });

            if (dateRange?.from) {
                q = q.gte('voucher_date', dateRange.from.toISOString().split('T')[0]);
            }
            if (dateRange?.to) {
                q = q.lte('voucher_date', endOfDay(dateRange.to).toISOString().split('T')[0]);
            }

            const { data, error } = await q;

            if (error) {
                console.error('❌ Error fetching payments:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                ...item,
                supplier_display: item.supplier
                    ? (language === 'ar'
                        ? (item.supplier.name_ar || item.supplier.name_en)
                        : (item.supplier.name_en || item.supplier.name_ar))
                    : item.supplier_name || '',
                linked_type: item.container_id
                    ? 'container'
                    : item.purchase_invoice_id
                        ? 'purchase_invoice'
                        : item.shipment_id
                            ? 'shipment'
                            : 'other',
            })) as PaymentVoucher[];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── Counts per tab ──────────────────────────────────────────
    const tabCounts = useMemo(() => {
        const counts = { all: payments.length, purchase_invoice: 0, container: 0 };
        payments.forEach(p => {
            if (p.container_id) counts.container++;
            else if (p.purchase_invoice_id) counts.purchase_invoice++;
        });
        return counts;
    }, [payments]);

    const tabTotals = useMemo(() => {
        const totals = { all: 0, purchase_invoice: 0, container: 0 };
        payments.forEach(p => {
            const amt = Number(p.amount || 0);
            totals.all += amt;
            if (p.container_id) totals.container += amt;
            else if (p.purchase_invoice_id) totals.purchase_invoice += amt;
        });
        return totals;
    }, [payments]);

    // ─── Filtered Data ───────────────────────────────────────────
    const filteredPayments = useMemo(() => {
        let result = payments;

        // Tab filter
        if (activeTab === 'purchase_invoice') {
            result = result.filter(p => p.purchase_invoice_id && !p.container_id);
        } else if (activeTab === 'container') {
            result = result.filter(p => p.container_id);
        }

        // Search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(p =>
                (p.voucher_number || '').toLowerCase().includes(q) ||
                (p.payment_number || '').toLowerCase().includes(q) ||
                (p.supplier_name || '').toLowerCase().includes(q) ||
                ((p as any).supplier_display || '').toLowerCase().includes(q) ||
                (p.notes || '').toLowerCase().includes(q) ||
                (p.container?.container_number || '').toLowerCase().includes(q) ||
                (p.container?.shipment_number || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let av: any, bv: any;
            switch (sortField) {
                case 'amount': av = Number(a.amount || 0); bv = Number(b.amount || 0); break;
                case 'supplier': av = (a as any).supplier_display || ''; bv = (b as any).supplier_display || ''; break;
                case 'status': av = a.status || ''; bv = b.status || ''; break;
                default: av = a.voucher_date || a.created_at || ''; bv = b.voucher_date || b.created_at || '';
            }
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [payments, activeTab, searchTerm, sortField, sortAsc]);

    // ─── Handlers ────────────────────────────────────────────────
    const handleRowClick = useCallback((row: PaymentVoucher) => {
        setSelectedDoc(row);
        setDocMode('view');
        setIsSheetOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setSelectedDoc(null);
        setDocMode('create');
        setIsSheetOpen(true);
    }, []);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    }, [sortField]);

    // ─── Row Accent ──────────────────────────────────────────────
    const getRowAccent = useCallback((row: PaymentVoucher) => {
        if (row.status === 'posted') return 'border-s-emerald-400';
        if (row.status === 'cancelled') return 'border-s-red-300';
        return 'border-s-amber-400';
    }, []);

    // ─── Status helpers ──────────────────────────────────────────
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'posted':
                return {
                    label: isRTL ? 'مرحّل' : 'Posted',
                    icon: CheckCircle2,
                    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                };
            case 'cancelled':
                return {
                    label: isRTL ? 'ملغي' : 'Cancelled',
                    icon: XCircle,
                    cls: 'bg-red-50 text-red-600 border-red-200',
                };
            default:
                return {
                    label: isRTL ? 'مسودة' : 'Draft',
                    icon: Clock,
                    cls: 'bg-amber-50 text-amber-700 border-amber-200',
                };
        }
    };

    const getPaymentMethodConfig = (method: string) => {
        const m = (method || '').toLowerCase();
        if (m.includes('bank') || m.includes('transfer') || m.includes('تحويل')) {
            return { label: isRTL ? 'تحويل بنكي' : 'Bank Transfer', icon: Building2, cls: 'bg-blue-50 text-blue-700 border-blue-200' };
        }
        if (m.includes('check') || m.includes('cheque') || m.includes('شيك')) {
            return { label: isRTL ? 'شيك' : 'Cheque', icon: Receipt, cls: 'bg-violet-50 text-violet-700 border-violet-200' };
        }
        if (m.includes('card') || m.includes('بطاقة')) {
            return { label: isRTL ? 'بطاقة' : 'Card', icon: CreditCard, cls: 'bg-pink-50 text-pink-700 border-pink-200' };
        }
        return { label: isRTL ? 'نقداً' : 'Cash', icon: Banknote, cls: 'bg-green-50 text-green-700 border-green-200' };
    };

    // ─── Columns — NexaListColumn format ─────────────────────────
    const columns: NexaListColumn<PaymentVoucher>[] = useMemo(() => [
        {
            id: 'voucher_number',
            header: isRTL ? 'رقم السند' : 'Payment #',
            sortable: true,
            sortKey: 'voucher_date',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-mono text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 leading-tight">
                        {row.payment_number || row.voucher_number || '—'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                        {row.voucher_date
                            ? format(new Date(row.voucher_date), 'yyyy-MM-dd')
                            : '—'
                        }
                    </span>
                </div>
            ),
        },
        {
            id: 'supplier',
            header: isRTL ? 'المورد / الجهة' : 'Supplier / Payee',
            sortable: true,
            sortKey: 'supplier',
            cell: (row) => {
                const name = (row as any).supplier_display || row.supplier_name || '';
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0">
                            {(name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                                {name || '—'}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'linked_to',
            header: isRTL ? 'مرتبط بـ' : 'Linked To',
            cell: (row) => {
                if (row.container_id && row.container) {
                    return (
                        <div className="flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[12px] font-semibold text-blue-700">
                                    {row.container.container_number}
                                </span>
                                {row.container.shipment_number && (
                                    <span className="text-[10px] text-gray-400">{row.container.shipment_number}</span>
                                )}
                            </div>
                        </div>
                    );
                }
                if (row.purchase_invoice_id && row.invoice) {
                    return (
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="text-[12px] font-semibold text-purple-700 font-mono">
                                {(row.invoice as any)?.invoice_number || '—'}
                            </span>
                        </div>
                    );
                }
                if (row.shipment_id) {
                    return (
                        <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                            <span className="text-[12px] text-teal-700">{isRTL ? 'شحنة' : 'Shipment'}</span>
                        </div>
                    );
                }
                return <span className="text-[11px] text-gray-300">—</span>;
            },
        },
        {
            id: 'amount',
            header: isRTL ? 'المبلغ' : 'Amount',
            align: 'end',
            sortable: true,
            sortKey: 'amount',
            cell: (row) => {
                const val = Number(row.amount || 0);
                const cur = row.currency || baseCurrency || 'USD';
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-[14px] text-red-600 dark:text-red-400 tracking-tight" dir="ltr">
                            {getCurrencySymbol(cur)} {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-400">{cur}</span>
                    </div>
                );
            },
        },
        {
            id: 'payment_method',
            header: isRTL ? 'طريقة الدفع' : 'Method',
            cell: (row) => {
                const config = getPaymentMethodConfig(row.payment_method);
                const Icon = config.icon;
                return (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-2 py-0.5 rounded-full border",
                        config.cls
                    )}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            sortable: true,
            sortKey: 'status',
            cell: (row) => {
                const config = getStatusConfig(row.status);
                const Icon = config.icon;
                return (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-2 py-0.5 rounded-full border",
                        config.cls
                    )}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'notes',
            header: isRTL ? 'ملاحظات' : 'Notes',
            cell: (row) => (
                <span className="text-[12px] text-gray-500 line-clamp-1 max-w-[180px]">
                    {row.notes || '—'}
                </span>
            ),
        },
    ], [isRTL, baseCurrency]);

    // ─── Actions Renderer ────────────────────────────────────────
    const renderActions = useCallback((row: PaymentVoucher) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[160px]">
                <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRowClick(row)} className="gap-2 cursor-pointer text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'عرض التفاصيل' : 'View Details'}
                </DropdownMenuItem>
                {row.journal_entry_id && (
                    <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                        <FileText className="h-3.5 w-3.5" />
                        {isRTL ? 'عرض القيد المحاسبي' : 'View Journal Entry'}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL, handleRowClick]);

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>

            {/* ─── Header Row ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-200/50">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'المدفوعات' : 'Payments'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL
                                ? `${filteredPayments.length} سند صرف — إجمالي ${payments.length}`
                                : `${filteredPayments.length} vouchers — ${payments.length} total`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-auto"
                        align={isRTL ? "end" : "start"}
                    />
                    <Button
                        onClick={handleCreate}
                        className="gap-2 px-4 h-9 text-white shadow-sm bg-red-600 hover:bg-red-700"
                    >
                        <Plus className="w-4 h-4" />
                        {isRTL ? 'سند صرف جديد' : 'New Payment'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Tabs: الكل | فواتير مشتريات | كونتينرات ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            {/* الكل */}
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <CircleDollarSign className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{tabCounts.all}</Badge>
                            </TabsTrigger>

                            {/* فواتير مشتريات */}
                            <TabsTrigger value="purchase_invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-purple-600 font-tajawal">
                                <FileText className="w-4 h-4 me-1.5" />
                                {isRTL ? 'فواتير مشتريات' : 'Purchase Invoices'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-purple-100/60 text-purple-700">{tabCounts.purchase_invoice}</Badge>
                            </TabsTrigger>

                            {/* كونتينرات */}
                            <TabsTrigger value="container" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-blue-600 font-tajawal">
                                <Ship className="w-4 h-4 me-1.5" />
                                {isRTL ? 'كونتينرات' : 'Containers'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-blue-100/60 text-blue-700">{tabCounts.container}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Summary chip */}
                    <div className="flex items-center gap-1.5 ms-auto">
                        <span className="text-[11px] text-gray-400">{isRTL ? 'إجمالي المدفوع:' : 'Total Paid:'}</span>
                        <span className="font-mono font-bold text-sm text-red-600" dir="ltr">
                            {tabTotals[activeTab].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-400">{baseCurrency || ''}</span>
                    </div>
                </div>

                {/* ─── Content: NexaListTable ─── */}
                <NexaListTable<PaymentVoucher>
                    data={filteredPayments}
                    columns={columns}

                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'بحث برقم السند، المورد، الكونتينر...' : 'Search payment #, supplier, container...'}

                    totalCount={payments.length}
                    countLabel={isRTL ? 'سند' : 'vouchers'}

                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}

                    getRowAccent={getRowAccent}
                    onRowClick={handleRowClick}
                    getRowKey={(row) => row.id}

                    isLoading={isLoading}

                    emptyIcon={<Wallet className="w-12 h-12 text-gray-300" />}
                    emptyMessage={
                        activeTab === 'purchase_invoice'
                            ? (isRTL ? 'لا توجد مدفوعات لفواتير المشتريات' : 'No purchase invoice payments')
                            : activeTab === 'container'
                                ? (isRTL ? 'لا توجد مدفوعات للكونتينرات' : 'No container payments')
                                : (isRTL ? 'لا توجد مدفوعات' : 'No payments found')
                    }

                    showFooter={true}
                    footerLeftText={
                        isRTL
                            ? `عرض ${filteredPayments.length} من ${payments.length} سند`
                            : `Showing ${filteredPayments.length} of ${payments.length} vouchers`
                    }
                    footerRightContent={
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-red-600 dark:text-red-400" dir="ltr">
                                {isRTL ? 'إجمالي: ' : 'Total: '}
                                {filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
                                    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-gray-400 ms-1 text-xs">{baseCurrency || ''}</span>
                            </span>
                        </div>
                    }

                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {/* ─── Detail Sheet ─── */}
            {isSheetOpen && (
                <UnifiedAccountingSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedDoc(null);
                    }}
                    docType="payment"
                    data={docMode === 'create' ? {
                        type: 'payment',
                        status: 'draft',
                        currency: baseCurrency || '',
                        date: new Date().toISOString(),
                        amount: 0
                    } : selectedDoc}
                    mode={docMode === 'view' ? 'view' : 'edit'}
                    onSave={async (data) => {
                        console.log('Save Payment', data);
                        toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
                        setIsSheetOpen(false);
                    }}
                />
            )}
        </div>
    );
}
