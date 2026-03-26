/**
 * ════════════════════════════════════════════════════════════════
 * 👥 CustomersList — قائمة العملاء
 * ════════════════════════════════════════════════════════════════
 *
 * Pattern: Uses shared NexaListTable component
 *   - Sub-Ledger balances from journal_entry_lines (party_type='customer')
 *   - Same premium design as SuppliersList
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from 'react';
import {
    Users,
    Phone,
    Mail,
    Eye,
    Plus,
    Star,
    MapPin,
    CreditCard,
    FileText,
    MoreHorizontal,
    ChevronDown,
} from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol, CURRENCY_META } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { partyBalanceService, type PartyBalance } from '@/services/partyBalanceService';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────
interface Customer {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    name_en: string;
    customer_type: string;
    company_name: string;
    phone: string;
    mobile: string;
    email: string;
    country: string;
    city: string;
    address: string;
    tax_number: string;
    balance: number;
    credit_limit: number;
    currency: string;
    payment_terms_days: number;
    status: string;
    notes: string;
    created_at: string;
}

// ═══════════════════════════════════════════════════════════════
export default function CustomersList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isRTL = direction === 'rtl';

    // 🔄 Realtime: auto-update
    useRealtimeInvalidation({
        table: 'customers',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['customers_list'], ['customer_balances_subledger']],
    });
    // 🔄 Realtime — تحديث الأرصدة عند ترحيل/إلغاء ترحيل القيود
    useRealtimeInvalidation({
        table: 'journal_entries',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['customer_balances_subledger']],
    });
    useRealtimeInvalidation({
        table: 'journal_entry_lines',
        companyId,
        queryKeys: [['customer_balances_subledger']],
    });

    // ─── State ───────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('all');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('view');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // ─── Fetch Customers ─────────────────────────────────────────
    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers_list', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((item: any) => ({
                ...item,
                name: language === 'ar'
                    ? (item.name_ar || item.name_en || '')
                    : (item.name_en || item.name_ar || ''),
            })) as Customer[];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── Fetch Sales Stats per Customer ────────────────────────
    const { data: salesStats = {} } = useQuery({
        queryKey: ['customers_sales_stats', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data } = await supabase
                .from('sales_transactions')
                .select('customer_id, total_amount, stage')
                .eq('company_id', companyId);

            const stats: Record<string, { invoiceCount: number; totalAmount: number; unpaid: number }> = {};
            (data || []).forEach((tx: any) => {
                if (!tx.customer_id) return;
                if (!stats[tx.customer_id]) stats[tx.customer_id] = { invoiceCount: 0, totalAmount: 0, unpaid: 0 };
                stats[tx.customer_id].invoiceCount++;
                stats[tx.customer_id].totalAmount += Number(tx.total_amount || 0);
                if (!['paid', 'cancelled'].includes(tx.stage)) {
                    stats[tx.customer_id].unpaid += Number(tx.total_amount || 0);
                }
            });
            return stats;
        },
        enabled: !!companyId,
        staleTime: 60000,
    });

    // ─── Fetch Sub-Ledger Balances (REAL balances from journal entries) ─
    const { data: customerBalances = new Map() } = useQuery({
        queryKey: ['customer_balances_subledger', companyId],
        queryFn: async () => {
            if (!companyId) return new Map<string, PartyBalance>();
            return partyBalanceService.getAllPartyBalances(companyId, 'customer');
        },
        enabled: !!companyId,
        staleTime: 10_000,  // 10 ثوانٍ — تحديث سريع للأرصدة
    });

    // ─── Filtered Data ───────────────────────────────────────────
    const filteredCustomers = useMemo(() => {
        let result = customers;

        // Status filter
        if (activeTab !== 'all') {
            result = result.filter(c => c.status === activeTab);
        }

        // Search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(c =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.code || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.mobile || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.city || '').toLowerCase().includes(q) ||
                (c.company_name || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let av: any, bv: any;
            switch (sortField) {
                case 'name': av = a.name || ''; bv = b.name || ''; break;
                case 'balance': {
                    const ba = customerBalances.get(a.id);
                    const bb = customerBalances.get(b.id);
                    av = ba ? ba.balance : 0;
                    bv = bb ? bb.balance : 0;
                    break;
                }
                default: av = a.created_at || ''; bv = b.created_at || '';
            }
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [customers, activeTab, searchTerm, sortField, sortAsc, customerBalances]);

    // ─── Handlers ────────────────────────────────────────────────
    const handleRowClick = useCallback((row: Customer) => {
        setSelectedCustomer(row);
        setSheetMode('view');
        setIsSheetOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setSelectedCustomer(null);
        setSheetMode('create');
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

    // ─── Status accent colors ────────────────────────────────────
    const getRowAccent = useCallback((row: Customer) => {
        return row.status === 'active'
            ? 'border-s-indigo-400'
            : 'border-s-gray-300 dark:border-s-gray-600';
    }, []);

    // ─── Columns — NexaListColumn format ─────────────────────────
    const columns: NexaListColumn<Customer>[] = useMemo(() => [
        {
            id: 'code',
            header: isRTL ? 'الكود' : 'Code',
            sortable: true,
            sortKey: 'code',
            cell: (row) => (
                <span className="font-mono text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 leading-tight">
                    {row.code || '—'}
                </span>
            ),
        },
        {
            id: 'name',
            header: isRTL ? 'العميل' : 'Customer',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                        {(row.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                            {row.name || '—'}
                        </p>
                        {row.email && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {row.email}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'type',
            header: isRTL ? 'النوع' : 'Type',
            cell: (row) => {
                const type = row.customer_type || 'company';
                const config: Record<string, { label: string; labelAr: string; cls: string }> = {
                    company: { label: 'Company', labelAr: 'شركة', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    individual: { label: 'Individual', labelAr: 'فرد', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
                    wholesale: { label: 'Wholesale', labelAr: 'جملة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    retail: { label: 'Retail', labelAr: 'تجزئة', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                };
                const c = config[type] || config.company;
                return (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full border", c.cls)}>
                        {isRTL ? c.labelAr : c.label}
                    </span>
                );
            },
        },
        {
            id: 'phone',
            header: isRTL ? 'الهاتف' : 'Phone',
            cell: (row) => {
                const phone = row.phone || row.mobile;
                return phone ? (
                    <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="font-mono text-[12px] text-gray-700 dark:text-gray-300" dir="ltr">{phone}</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-gray-300">—</span>
                );
            },
        },
        {
            id: 'location',
            header: isRTL ? 'الموقع' : 'Location',
            cell: (row) => {
                const loc = [row.city, row.country].filter(Boolean).join(', ');
                return loc ? (
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-tajawal">{loc}</span>
                ) : (
                    <span className="text-[11px] text-gray-300">—</span>
                );
            },
        },
        {
            id: 'invoices',
            header: isRTL ? 'الفواتير' : 'Invoices',
            cell: (row) => {
                const st = salesStats[row.id];
                return (
                    <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">
                            {st?.invoiceCount || 0}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'balance',
            header: isRTL ? 'الرصيد' : 'Balance',
            align: 'end',
            sortable: true,
            sortKey: 'balance',
            cell: (row) => {
                // 🔑 Use Sub-Ledger balance (from journal_entry_lines) instead of static row.balance
                const subLedger = customerBalances.get(row.id);
                const balance = subLedger ? subLedger.balance : 0;
                const cur = row.currency || baseCurrency || 'USD';
                const color = balance > 0
                    ? 'text-green-600 dark:text-green-400'   // they owe us
                    : balance < 0
                        ? 'text-red-600 dark:text-red-400'   // we owe them (overpaid)
                        : 'text-gray-400';
                return (
                    <div className="flex flex-col items-end">
                        <span className={cn("font-mono font-bold text-[14px] tracking-tight", color)} dir="ltr">
                            {getCurrencySymbol(cur)} {Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {balance > 0 && <span className="text-[10px] text-green-400">{isRTL ? 'مستحق لنا' : 'they owe'}</span>}
                        {balance < 0 && <span className="text-[10px] text-red-400">{isRTL ? 'دفعوا أكثر' : 'overpaid'}</span>}
                        {subLedger && subLedger.transaction_count > 0 && (
                            <span className="text-[9px] text-gray-300 mt-0.5">
                                {subLedger.transaction_count} {isRTL ? 'حركة' : 'txn'}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            cell: (row) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    row.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                )}>
                    {row.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                </span>
            ),
        },
    ], [isRTL, salesStats, customerBalances, baseCurrency]);

    // ─── Actions Renderer ────────────────────────────────────────
    const renderActions = useCallback((row: Customer) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[150px]">
                <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRowClick(row)} className="gap-2 cursor-pointer text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'عرض التفاصيل' : 'View Details'}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                    <FileText className="h-3.5 w-3.5" />
                    {isRTL ? 'كشف حساب' : 'Account Statement'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL, handleRowClick]);

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>

            {/* ─── First Row: Title + Create Button ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Users className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('sales.customers') || (isRTL ? 'العملاء' : 'Customers')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL
                                ? `${filteredCustomers.length} عميل — إجمالي ${customers.length}`
                                : `${filteredCustomers.length} customers — ${customers.length} total`}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleCreate}
                    className="gap-2 px-4 h-9 text-white shadow-sm bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة عميل' : 'Add Customer'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Tabs ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <Users className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{customers.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Star className="w-4 h-4 me-1.5" />
                                {isRTL ? 'نشط' : 'Active'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{customers.filter(c => c.status === 'active').length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-500 font-tajawal">
                                {isRTL ? 'غير نشط' : 'Inactive'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{customers.filter(c => c.status !== 'active').length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* ─── Content: NexaListTable ─── */}
                <NexaListTable<Customer>
                    data={filteredCustomers}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'بحث بالاسم، الكود، الهاتف...' : 'Search name, code, phone...'}
                    totalCount={customers.length}
                    countLabel={isRTL ? 'عميل' : 'customers'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={handleRowClick}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد عملاء' : 'No customers found'}
                    showFooter={true}
                    footerLeftText={
                        isRTL
                            ? `عرض ${filteredCustomers.length} من ${customers.length} عميل`
                            : `Showing ${filteredCustomers.length} of ${customers.length} customers`
                    }
                    footerRightContent={
                        <span className="font-mono font-bold text-erp-navy dark:text-white">
                            {isRTL ? 'إجمالي المستحق: ' : 'Total Receivable: '}
                            {Array.from(customerBalances.values())
                                .reduce((sum, b) => sum + Math.max(b.balance, 0), 0)
                                .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-gray-400 ms-1">{baseCurrency || ''}</span>
                        </span>
                    }
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {/* ─── Detail Sheet ─── */}
            {isSheetOpen && (
                <UnifiedAccountingSheet
                    docType="party"
                    mode={sheetMode}
                    data={selectedCustomer ? {
                        ...selectedCustomer,
                        type: 'customer',
                        _partyType: 'customer',
                        party_type: 'customer',
                        current_balance: customerBalances.get(selectedCustomer.id)?.balance || 0,
                        is_active: selectedCustomer.status === 'active',
                        name: selectedCustomer.name_ar || selectedCustomer.name_en || selectedCustomer.name,
                        currency: selectedCustomer.currency || baseCurrency,
                    } : {
                        _partyType: 'customer',
                        type: 'customer',
                        is_active: true,
                    }}
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedCustomer(null);
                    }}
                    companyId={companyId || undefined}
                />
            )}
        </div>
    );
}
