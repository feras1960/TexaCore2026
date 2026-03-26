/**
 * ════════════════════════════════════════════════════════════════
 * 👥 SuppliersList — قائمة الموردين
 * ════════════════════════════════════════════════════════════════
 *
 * Pattern: Uses shared NexaListTable component
 *   - Same rich table design as PurchaseInvoicesList (دورة الشراء)
 *   - Header row: title + icon + create button
 *   - Filter row: status tabs + DateRangePicker
 *   - NexaListTable with row numbers, accent borders, search, footer
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from 'react';
import {
    Users,
    Phone,
    Eye,
    Plus,
    Star,
    MapPin,
    CreditCard,
    FileText,
    MoreHorizontal,
    ChevronDown,
    Search,
} from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol, CURRENCY_META } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { partyBalanceService, type PartyBalance } from '@/services/partyBalanceService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay } from 'date-fns';
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
interface Supplier {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    name_en: string;
    supplier_type: string;
    company_name: string;
    phone: string;
    mobile: string;
    email: string;
    website: string;
    country: string;
    city: string;
    address: string;
    tax_number: string;
    balance: number;
    total_purchases: number;
    total_payments: number;
    currency: string;
    payment_terms_days: number;
    rating: number;
    status: string;
    tags: string[];
    notes: string;
    created_at: string;
}

// ═══════════════════════════════════════════════════════════════
export default function SuppliersList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isRTL = direction === 'rtl';

    // 🔄 Realtime: auto-update
    useRealtimeInvalidation({
        table: 'suppliers',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['suppliers_list'], ['suppliers_map'], ['party_balances_supplier_purchases']],
    });
    // 🔄 Realtime — تحديث الأرصدة عند ترحيل/إلغاء ترحيل القيود
    useRealtimeInvalidation({
        table: 'journal_entries',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['party_balances_supplier_purchases']],
    });
    useRealtimeInvalidation({
        table: 'journal_entry_lines',
        companyId,
        queryKeys: [['party_balances_supplier_purchases']],
    });
    // 🔄 Realtime — تحديث إحصائيات المشتريات عند تغيير حالة الفواتير
    useRealtimeInvalidation({
        table: 'purchase_transactions',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['suppliers_purchase_stats'], ['party_balances_supplier_purchases']],
    });

    // ─── State ───────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('all');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // Date Filter State
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // ─── Fetch Suppliers ─────────────────────────────────────────
    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers_list', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((item: any) => ({
                ...item,
                name: language === 'ar'
                    ? (item.name_ar || item.name_en || '')
                    : (item.name_en || item.name_ar || ''),
            })) as Supplier[];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ─── Fetch Purchase Stats per Supplier ────────────────────────
    const { data: purchaseStats = {} } = useQuery({
        queryKey: ['suppliers_purchase_stats', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data } = await supabase
                .from('purchase_transactions')
                .select('supplier_id, total_amount, stage')
                .eq('company_id', companyId);

            const stats: Record<string, { invoiceCount: number; totalAmount: number; unpaid: number }> = {};
            const COUNTABLE_STAGES = ['posted', 'received', 'paid', 'partially_paid', 'completed'];
            (data || []).forEach((tx: any) => {
                if (!tx.supplier_id) return;
                // Only count posted/finalized invoices — drafts and confirmed don't count
                if (!COUNTABLE_STAGES.includes(tx.stage)) return;
                if (!stats[tx.supplier_id]) stats[tx.supplier_id] = { invoiceCount: 0, totalAmount: 0, unpaid: 0 };
                stats[tx.supplier_id].invoiceCount++;
                stats[tx.supplier_id].totalAmount += Number(tx.total_amount || 0);
                if (!['paid', 'completed'].includes(tx.stage)) {
                    stats[tx.supplier_id].unpaid += Number(tx.total_amount || 0);
                }
            });
            return stats;
        },
        enabled: !!companyId,
        staleTime: 10_000,
    });

    // ─── Fetch Sub-Ledger Balances (same as Parties.tsx) ─────────
    const { data: supplierBalances = new Map() } = useQuery({
        queryKey: ['party_balances_supplier_purchases', companyId],
        queryFn: async () => {
            if (!companyId) return new Map<string, PartyBalance>();
            return partyBalanceService.getAllPartyBalances(companyId, 'supplier');
        },
        enabled: !!companyId,
        staleTime: 10_000,
    });

    // ─── Filtered Data (status tabs + date range + search + sort) ─
    const filteredSuppliers = useMemo(() => {
        let result = suppliers;

        // Status filter
        if (activeTab !== 'all') {
            result = result.filter(s => s.status === activeTab);
        }

        // Date filter
        if (dateRange?.from) {
            const from = dateRange.from;
            const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
            result = result.filter(s => {
                const d = new Date(s.created_at);
                return d >= from && d <= to;
            });
        }

        // Search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(s =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.code || '').toLowerCase().includes(q) ||
                (s.phone || '').toLowerCase().includes(q) ||
                (s.mobile || '').toLowerCase().includes(q) ||
                (s.city || '').toLowerCase().includes(q) ||
                (s.country || '').toLowerCase().includes(q) ||
                (s.company_name || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let av: any, bv: any;
            switch (sortField) {
                case 'name': av = a.name || ''; bv = b.name || ''; break;
                case 'total_purchases': av = Number(a.total_purchases || 0); bv = Number(b.total_purchases || 0); break;
                case 'balance': av = Number(a.balance || 0); bv = Number(b.balance || 0); break;
                case 'rating': av = Number(a.rating || 0); bv = Number(b.rating || 0); break;
                default: av = a.created_at || ''; bv = b.created_at || '';
            }
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [suppliers, activeTab, dateRange, searchTerm, sortField, sortAsc]);

    // ─── Handlers ────────────────────────────────────────────────
    const handleRowClick = useCallback((row: Supplier) => {
        setSelectedSupplier(row);
        setIsSheetOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        toast.info(isRTL ? 'سيتم ربط نموذج إضافة المورد قريباً' : 'Add Supplier form coming soon...');
    }, [isRTL]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    }, [sortField]);

    // ─── Rating Stars ────────────────────────────────────────────
    const renderRating = (rating: number) => {
        const stars = Math.round(rating * 5) || 0;
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star
                        key={i}
                        className={cn(
                            "w-3 h-3",
                            i <= stars ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"
                        )}
                    />
                ))}
            </div>
        );
    };

    // ─── Status accent colors ────────────────────────────────────
    const getRowAccent = useCallback((row: Supplier) => {
        const status = row.status || 'active';
        return status === 'active'
            ? 'border-s-emerald-400'
            : 'border-s-gray-300 dark:border-s-gray-600';
    }, []);

    // ─── Columns — NexaListColumn format ─────────────────────────
    const columns: NexaListColumn<Supplier>[] = useMemo(() => [
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
            header: isRTL ? 'المورد' : 'Supplier',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                        {(row.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                            {row.name || '—'}
                        </p>
                        {row.company_name && row.company_name !== row.name && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                🏢 {row.company_name}
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
                const type = row.supplier_type || 'company';
                const config: Record<string, { label: string; labelAr: string; cls: string }> = {
                    company: { label: 'Company', labelAr: 'شركة', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    individual: { label: 'Individual', labelAr: 'فرد', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
                    factory: { label: 'Factory', labelAr: 'مصنع', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
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
            header: isRTL ? 'الدولة / المدينة' : 'Location',
            cell: (row) => {
                const loc = [row.city, row.country].filter(Boolean).join(', ');
                return loc ? (
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">{loc}</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-gray-300">—</span>
                );
            },
        },
        {
            id: 'currency',
            header: isRTL ? 'العملة' : 'Currency',
            cell: (row) => {
                const cur = row.currency || baseCurrency || 'USD';
                const meta = CURRENCY_META[cur];
                return (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {meta?.flag || '🏳️'} {cur}
                    </span>
                );
            },
        },
        {
            id: 'invoices',
            header: isRTL ? 'الفواتير' : 'Invoices',
            cell: (row) => {
                const st = purchaseStats[row.id];
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
            id: 'total_purchases',
            header: isRTL ? 'إجمالي المشتريات' : 'Total Purchases',
            align: 'end',
            sortable: true,
            sortKey: 'total_purchases',
            cell: (row) => {
                // 🔑 Read from purchaseStats (aggregated from purchase_transactions)
                const st = purchaseStats[row.id];
                const val = st?.totalAmount || 0;
                const cur = row.currency || baseCurrency || 'USD';
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-[14px] text-erp-navy dark:text-white tracking-tight" dir="ltr">
                            {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-400">{cur}</span>
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
                // 🔑 Use partyBalanceService — native currency balances from journal lines
                const subLedger = supplierBalances.get(row.id);
                const balance = subLedger ? subLedger.balance : 0;
                const cur = row.currency || baseCurrency || 'USD';
                const color = balance > 0
                    ? 'text-red-600 dark:text-red-400'
                    : balance < 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400';
                return (
                    <div className="flex flex-col items-end">
                        <span className={cn("font-mono font-bold text-[14px] tracking-tight", color)} dir="ltr">
                            {getCurrencySymbol(cur)} {Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {balance > 0 && <span className="text-[10px] text-red-400">{isRTL ? 'مستحق لهم' : 'we owe'}</span>}
                        {balance < 0 && <span className="text-[10px] text-green-400">{isRTL ? 'دفعنا أكثر' : 'overpaid'}</span>}
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
            id: 'rating',
            header: isRTL ? 'التقييم' : 'Rating',
            sortable: true,
            sortKey: 'rating',
            cell: (row) => renderRating(row.rating || 0),
        },
    ], [isRTL, purchaseStats, baseCurrency, language, supplierBalances]);

    // ─── Actions Renderer ────────────────────────────────────────
    const renderActions = useCallback((row: Supplier) => (
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
                <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                    <CreditCard className="h-3.5 w-3.5" />
                    {isRTL ? 'تسجيل دفعة' : 'Record Payment'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL, handleRowClick]);

    // ═══════════════════════════════════════════════════════════════
    // RENDER — Same layout structure as PurchaseInvoicesList
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>

            {/* ─── First Row: Title + Create Button ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Users className="w-7 h-7 text-teal-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('purchases.suppliers') || (isRTL ? 'الموردين' : 'Suppliers')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL
                                ? `${filteredSuppliers.length} مورد — إجمالي ${suppliers.length}`
                                : `${filteredSuppliers.length} suppliers — ${suppliers.length} total`}
                        </p>
                    </div>
                </div>

                {/* Create Button */}
                <div className="flex items-center gap-0 shadow-sm rounded-md shrink-0">
                    <Button
                        onClick={handleCreate}
                        className="rounded-e-none gap-2 px-4 h-9 text-white shadow-sm bg-teal-600 hover:bg-teal-700"
                    >
                        <Plus className="w-4 h-4" />
                        {isRTL ? 'إضافة مورد' : 'Add Supplier'}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="border-s border-white/20 rounded-s-none px-2 h-9 text-white bg-teal-600 hover:bg-teal-700">
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal font-tajawal">
                                {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleCreate} className="gap-2 cursor-pointer py-2.5">
                                <div className="p-1 bg-teal-100 rounded text-teal-600"><Plus className="w-3.5 h-3.5" /></div>
                                <span className="font-medium text-sm font-tajawal">{isRTL ? 'مورد جديد' : 'New Supplier'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer py-2.5" disabled>
                                <div className="p-1 bg-blue-100 rounded text-blue-600"><FileText className="w-3.5 h-3.5" /></div>
                                <span className="font-medium text-sm font-tajawal">{isRTL ? 'استيراد من ملف' : 'Import from File'}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Tabs + Date Picker ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <Users className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60 dark:bg-gray-700">{suppliers.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Star className="w-4 h-4 me-1.5" />
                                {isRTL ? 'نشط' : 'Active'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/20">{suppliers.filter(s => s.status === 'active').length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-500 font-tajawal">
                                {isRTL ? 'غير نشط' : 'Inactive'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60 dark:bg-gray-700">{suppliers.filter(s => s.status !== 'active').length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-full sm:w-[260px]"
                        align={isRTL ? "end" : "start"}
                    />
                </div>

                {/* ─── Content: NexaListTable ─── */}
                <NexaListTable<Supplier>
                    data={filteredSuppliers}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'بحث بالاسم، الكود، الهاتف...' : 'Search name, code, phone...'}
                    totalCount={suppliers.length}
                    countLabel={isRTL ? 'مورد' : 'suppliers'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={handleRowClick}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد موردين' : 'No suppliers found'}
                    showFooter={true}
                    footerLeftText={
                        isRTL
                            ? `عرض ${filteredSuppliers.length} من ${suppliers.length} مورد`
                            : `Showing ${filteredSuppliers.length} of ${suppliers.length} suppliers`
                    }
                    footerRightContent={
                        <span className="font-mono font-bold text-erp-navy dark:text-white">
                            {isRTL ? 'إجمالي المشتريات: ' : 'Total Purchases: '}
                            {filteredSuppliers.reduce((sum, s) => sum + Number(s.total_purchases || 0), 0)
                                .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-gray-400 ms-1">{baseCurrency || ''}</span>
                        </span>
                    }
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {/* ─── Supplier Sheet (UnifiedAccountingSheet — partyConfig) ─── */}
            {isSheetOpen && selectedSupplier && (
                <UnifiedAccountingSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedSupplier(null);
                    }}
                    docType="party"
                    data={{
                        ...selectedSupplier,
                        party_type: 'supplier',
                        _partyType: 'supplier',
                        type: 'supplier',
                        name: selectedSupplier.name_ar || selectedSupplier.name_en || selectedSupplier.name,
                        code: selectedSupplier.code,
                        current_balance: supplierBalances.get(selectedSupplier.id)?.balance || 0,
                        is_active: selectedSupplier.status === 'active',
                        currency: selectedSupplier.currency || baseCurrency,
                    }}
                    mode="view"
                    companyId={companyId || undefined}
                />
            )}
        </div>
    );
}
