
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { Button } from '@/components/ui/button';
import {
    FileText, Plus, LayoutGrid, List, MoreHorizontal,
    Flag, FileSearch, Package, RotateCcw, XCircle,
    CheckCircle2, Clock, Eye, Edit, Search, ArrowUpDown, Calendar, User, ArrowDownToLine
} from 'lucide-react';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { MaterialReceiptDialog } from '@/features/warehouse/components/MaterialReceiptDialog';
// StatusDropdown removed — stage is now shown as inline badge
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { endOfDay, startOfMonth, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { TransactionStageStats } from '@/components/transactions';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PurchaseInvoicesList() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const { tenantId } = useAuth();
    const queryClient = useQueryClient();
    const isRTL = direction === 'rtl';
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');

    // 🔄 Realtime — listen to purchase_transactions & purchase_invoices (DSS updates)
    useRealtimeInvalidation({
        table: 'purchase_transactions',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['purchase_transactions_recent'], ['purchase_transactions_full']],
    });
    useRealtimeInvalidation({
        table: 'purchase_invoices',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['purchase_transactions_recent'], ['purchase_transactions_full']],
    });
    useRealtimeInvalidation({
        table: 'purchase_receipts',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['purchase_transactions_recent'], ['purchase_transactions_full']],
    });

    // State
    const [activeTab, setActiveTab] = useState('all');
    const [stageFilter, setStageFilter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortAsc, setSortAsc] = useState(false);
    const [filterBranch, setFilterBranch] = useState<string>('');
    const [filterCreator, setFilterCreator] = useState<string>('');
    const [filterSupplier, setFilterSupplier] = useState<string>('');
    const [filterAmountMin, setFilterAmountMin] = useState<string>('');
    const [filterAmountMax, setFilterAmountMax] = useState<string>('');
    const [filterPayment, setFilterPayment] = useState<string>('');
    const [filterDelivery, setFilterDelivery] = useState<string>('');

    // ✅ حالة MaterialReceiptDialog السريع
    const [receiptDialog, setReceiptDialog] = useState<{ open: boolean; sourceDocId?: string }>({ open: false });

    // ─── Persist view mode preference ───
    const VIEW_PREF_KEY = 'purchase-invoices-view';

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

    // Fetch Branches List (for filter)
    const { data: branchesList = [] } = useCachedQuery({
        queryKey: ['branches_list', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data } = await supabase
                .from('branches')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('name_ar');
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 120000
    });

    // Fetch Suppliers Map
    const { data: suppliersMap = {} } = useCachedQuery({
        queryKey: ['suppliers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name_ar, name_en, city')
                .eq('company_id', companyId);

            if (error) return {};

            return (data || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = {
                    name: language === 'ar' ? (curr.name_ar || curr.name_en) : (curr.name_en || curr.name_ar),
                    city: curr.city || ''
                };
                return acc;
            }, {});
        },
        enabled: !!companyId,
        staleTime: 60000
    });

    // ═══ Progressive Loading Strategy ═══
    // Phase 1: Load last 2 days instantly (fast initial render)
    // Phase 2: Load remaining month data in background
    // Merge: Combine both with deduplication

    const twoDaysAgo = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    }, []);

    const effectiveFrom = dateRange?.from ? dateRange.from.toISOString() : undefined;
    const effectiveTo = dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined;

    // Phase 1 — Last 2 Days (fast, shown immediately)
    const recentQuery = useCachedQuery({
        queryKey: ['purchase_transactions_recent', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('purchase_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gte('created_at', twoDaysAgo)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    });

    // Phase 2 — Full Month (loads in background after Phase 1)
    const fullQuery = useCachedQuery({
        queryKey: ['purchase_transactions_full', companyId, dateRange?.from?.toISOString()?.split('T')[0], dateRange?.to?.toISOString()?.split('T')[0]],
        queryFn: async () => {
            if (!companyId) return [];
            let query = supabase
                .from('purchase_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Apply Date Filter
            if (effectiveFrom) {
                query = query.gte('doc_date', effectiveFrom);
            }
            if (effectiveTo) {
                query = query.lte('doc_date', effectiveTo);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId && !recentQuery.isPending, // Wait for Phase 1 to finish
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    });

    // ⚡ CACHE-FIRST: derive loading states gated on auth
    const recentRaw = recentQuery.data ?? [];
    const fullRaw = fullQuery.data ?? [];
    const isLoading = !!tenantId && !!companyId && recentQuery.isPending;
    const isBackgroundLoading = fullQuery.isPending && !recentQuery.isPending;

    // Merge Phase 1 + Phase 2 (deduplicate by id)
    const invoicesRaw = useMemo(() => {
        if (fullRaw.length > 0) return fullRaw; // Phase 2 complete, use full data
        return recentRaw; // Still in Phase 1, show recent only
    }, [recentRaw, fullRaw]);

    // Enrich Data — NEW: using purchase_transactions fields
    const invoices = useMemo(() => {
        let result = invoicesRaw.map((doc: any) => {
            const supplierInfo = doc.supplier_id ? suppliersMap[doc.supplier_id] : null;
            return {
                ...doc,
                supplier_name: supplierInfo?.name || doc.supplier_name || '-',
                supplier_city: supplierInfo?.city || '',
                total_amount: Number(doc.total_amount || 0),
                _stage: doc.stage || 'draft',
                _doc_number: doc.invoice_no || doc.order_no || doc.quotation_no || doc.receipt_no || doc.draft_no || '-',
            };
        });

        // Apply stage filter from TransactionStageStats
        if (stageFilter) {
            result = result.filter(doc => doc._stage === stageFilter);
        }

        return result;
    }, [invoicesRaw, suppliersMap, stageFilter]);

    // ═══ Search + Sort filtered invoices ═══
    const filteredInvoices = useMemo(() => {
        let result = invoices;

        // Branch filter
        if (filterBranch) {
            result = result.filter((doc: any) => doc.branch_id === filterBranch);
        }

        // Creator filter
        if (filterCreator) {
            result = result.filter((doc: any) => doc.created_by_name === filterCreator);
        }

        // Supplier filter
        if (filterSupplier) {
            result = result.filter((doc: any) => doc.supplier_id === filterSupplier);
        }

        // Amount range filter
        if (filterAmountMin) {
            const min = parseFloat(filterAmountMin);
            if (!isNaN(min)) result = result.filter((doc: any) => Number(doc.total_amount || 0) >= min);
        }
        if (filterAmountMax) {
            const max = parseFloat(filterAmountMax);
            if (!isNaN(max)) result = result.filter((doc: any) => Number(doc.total_amount || 0) <= max);
        }

        // Payment status filter
        if (filterPayment) {
            result = result.filter((doc: any) => {
                const total = Number(doc.total_amount || 0);
                const paid = Number(doc.paid_amount || 0);
                const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                if (filterPayment === 'unpaid') return pct === 0;
                if (filterPayment === 'partial') return pct > 0 && pct < 100;
                if (filterPayment === 'paid') return pct >= 100;
                return true;
            });
        }

        // Delivery status filter
        if (filterDelivery) {
            result = result.filter((doc: any) => {
                const stage = doc.stage || doc._stage || 'draft';
                const isDelivered = stage === 'received' || stage === 'posted';
                if (filterDelivery === 'delivered') return isDelivered;
                if (filterDelivery === 'pending') return !isDelivered;
                return true;
            });
        }

        // Search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter((doc: any) =>
                (doc._doc_number || '').toLowerCase().includes(q) ||
                (doc.supplier_name || '').toLowerCase().includes(q) ||
                (doc.supplier_city || '').toLowerCase().includes(q) ||
                (doc.created_by_name || '').toLowerCase().includes(q) ||
                (doc.invoice_no || '').toLowerCase().includes(q) ||
                (doc.order_no || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let av: any, bv: any;
            switch (sortField) {
                case 'doc_date': av = a.doc_date || a.created_at; bv = b.doc_date || b.created_at; break;
                case 'created_at': av = a.created_at; bv = b.created_at; break;
                case 'total_amount': av = Number(a.total_amount || 0); bv = Number(b.total_amount || 0); break;
                case 'supplier_name': av = a.supplier_name || ''; bv = b.supplier_name || ''; break;
                default: av = a.created_at || a.doc_date; bv = b.created_at || b.doc_date;
            }
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [invoices, searchTerm, sortField, sortAsc, filterBranch, filterCreator, filterSupplier, filterAmountMin, filterAmountMax, filterPayment, filterDelivery]);

    // Compute stage counts for TransactionStageStats
    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        invoicesRaw.forEach((doc: any) => {
            const stage = doc.stage || 'draft';
            counts[stage] = (counts[stage] || 0) + 1;
        });
        return counts;
    }, [invoicesRaw]);

    // ─── Stage label map for dynamic create button ───
    const stageLabels: Record<string, { ar: string; en: string; key: string }> = {
        all: { ar: 'مستند جديد', en: 'New Document', key: 'purchaseInvoices.newDocument' },
        draft: { ar: 'مسودة جديدة', en: 'New Draft', key: 'purchaseInvoices.newDraft' },
        request: { ar: 'طلب شراء جديد', en: 'New Purchase Request', key: 'purchaseInvoices.newPurchaseRequest' },
        quotation: { ar: 'عرض سعر جديد', en: 'New Quotation', key: 'purchaseInvoices.newQuotation' },
        confirmed: { ar: 'فاتورة شراء جديدة', en: 'New Purchase Invoice', key: 'purchaseInvoices.newPurchaseInvoice' },
        posted: { ar: 'فاتورة مرحّلة', en: 'New Posted Invoice', key: 'purchaseInvoices.newPostedInvoice' },
    };

    // Map tab → initial status for new documents
    const getInitialStatus = (tab: string) => {
        if (tab === 'all' || tab === 'draft') return 'draft';
        return tab; // requested, ordered, invoiced, etc.
    };

    const createButtonLabel = stageLabels[activeTab] || stageLabels.all;

    // Handlers
    const handleRowClick = (row: any) => {
        setSelectedDoc(row);
        setDocMode('view');
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedDoc(null);
        setDocMode('create');
        setIsSheetOpen(true);
    };

    // ═══════════════════════════════════════════════════════
    // Stage badge config — reusable across table & kanban
    // ═══════════════════════════════════════════════════════
    const stageBadgeConfig: Record<string, { label: string; cls: string; icon: string }> = {
        request: { label: t('purchaseInvoices.stageRequest'), cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', icon: '📋' },
        quotation: { label: t('purchaseInvoices.stageQuotation'), cls: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', icon: '💬' },
        draft: { label: t('purchaseInvoices.stageDraft'), cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', icon: '📝' },
        confirmed: { label: t('purchaseInvoices.stageConfirmed'), cls: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: '🛡️' },
        received: { label: t('purchaseInvoices.stageReceived'), cls: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800', icon: '📦' },
        posted: { label: t('purchaseInvoices.stagePosted'), cls: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: '📊' },
        cancelled: { label: t('purchaseInvoices.stageCancelled'), cls: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: '❌' },
    };


    // ─── Kanban Configuration — حسب الدستور: 6 أعمدة ───
    // request | quotation | invoice (يشمل draft+confirmed+received+posted) | receipt | return | cancelled
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'request',
            title: t('purchaseInvoices.requests'),
            color: 'border-amber-500',
            bgColor: 'bg-amber-50/40 dark:bg-amber-950/20',
            accentHex: '#d97706',
            icon: <Flag className="w-4 h-4 text-amber-600" />,
        },
        {
            id: 'quotation',
            title: t('purchaseInvoices.quotations'),
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40 dark:bg-purple-950/20',
            accentHex: '#9333ea',
            icon: <FileSearch className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'invoice',
            title: t('purchaseInvoices.invoices'),
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40 dark:bg-indigo-950/20',
            accentHex: '#4f46e5',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'receipt',
            title: t('purchaseInvoices.receipts'),
            color: 'border-emerald-500',
            bgColor: 'bg-emerald-50/40 dark:bg-emerald-950/20',
            accentHex: '#059669',
            icon: <Package className="w-4 h-4 text-emerald-600" />,
        },
        {
            id: 'return',
            title: t('purchaseInvoices.returns'),
            color: 'border-rose-500',
            bgColor: 'bg-rose-50/40 dark:bg-rose-950/20',
            accentHex: '#e11d48',
            icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
        },
        {
            id: 'cancelled',
            title: t('purchaseInvoices.cancelled'),
            color: 'border-red-400',
            bgColor: 'bg-red-50/30',
            accentHex: '#DC2626',
            icon: <XCircle className="w-4 h-4 text-red-500" />,
        },
    ], [t]);

    // Map documents to Kanban columns:
    // - request/quotation → their own columns
    // - draft/confirmed/received/posted → "invoice" column (with stage badge on card)
    // - cancelled → "cancelled" column
    const kanbanItems: KanbanItem[] = useMemo(() =>
        invoices.map((inv: any) => {
            const stage = inv.stage || inv._stage || 'draft';
            let columnId: string;

            if (stage === 'request') columnId = 'request';
            else if (stage === 'quotation') columnId = 'quotation';
            else if (stage === 'cancelled') columnId = 'cancelled';
            else columnId = 'invoice'; // draft, confirmed, received, posted

            return { id: inv.id, columnId, content: inv };
        })
        , [invoices]);


    return (
        <div className="h-full flex flex-col space-y-4">
            {/* ─── Top Fixed Row: Title + View Switcher + Create Button ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <FileText className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('purchases.cycle') || (isRTL ? 'دورة المشتريات' : 'Purchase Cycle')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('purchases.cycleSubtitle') || (isRTL ? 'طلبات وأوامر وفواتير المشتريات' : 'Requests, orders & invoices')}
                        </p>
                    </div>
                </div>

                {/* View Switcher + Create Button */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-erp-navy dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            onClick={() => handleSetViewMode('list')}
                        >
                            <List className="w-4 h-4" />
                            {t('purchaseInvoices.list')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm text-erp-navy dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            onClick={() => handleSetViewMode('kanban')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            {t('purchaseInvoices.kanban')}
                        </Button>
                    </div>

                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9 px-4 gap-2">
                        <Plus className="w-4 h-4" />
                        {t(createButtonLabel.key || 'purchaseInvoices.newDocument')}
                    </Button>

                    {/* ✅ زر استلام مواد سريع */}
                    <Button
                        onClick={() => setReceiptDialog({ open: true })}
                        variant="outline"
                        className="gap-2 h-9 px-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-400 shadow-sm dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                        {t('purchaseInvoices.receiveGoods')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Stage Stats ─── */}
                {viewMode === 'list' && (
                    <div className="px-1">
                        <TransactionStageStats
                            type="purchase"
                            stats={stageCounts}
                            selectedStage={stageFilter}
                            onStageSelect={(stage) => {
                                setStageFilter(stage);
                                setActiveTab(stage || 'all');
                            }}
                        />
                    </div>
                )}

                {/* ═══ Content Area ═══ */}
                {viewMode === 'list' ? (
                    <div className="flex-1 min-h-0 border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                        {/* ─── Toolbar: Search + Date Filter + Count ─── */}
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-wrap">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('purchaseInvoices.searchPlaceholder')}
                                    className="w-full h-9 ps-9 pe-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-gray-400"
                                />
                            </div>
                            <DateRangePicker
                                date={dateRange}
                                setDate={setDateRange}
                                className="w-auto"
                                align={isRTL ? 'end' : 'start'}
                            />
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{filteredInvoices.length}</span>
                                <span>{t('purchaseInvoices.documents')}</span>
                                {isBackgroundLoading && (
                                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 animate-pulse">
                                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        {t('purchaseInvoices.loadingMore')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ─── Enhanced Filters Row ─── */}
                        <div className="flex items-center gap-4 px-4 py-2.5 border-b-2 border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-l from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-gray-900 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 uppercase tracking-wider whitespace-nowrap">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                {t('purchaseInvoices.filters')}
                            </span>

                            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

                            {/* Branch Filter */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">{t('purchaseInvoices.branch')}</label>
                                <select
                                    value={filterBranch}
                                    onChange={(e) => setFilterBranch(e.target.value)}
                                    className="h-8 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: `${isRTL ? 'left' : 'right'} 8px center` }}
                                >
                                    <option value="">{t('purchaseInvoices.allBranches')}</option>
                                    {branchesList.map((b: any) => (
                                        <option key={b.id} value={b.id}>
                                            {language === 'ar' ? (b.name_ar || b.name_en) : (b.name_en || b.name_ar)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Creator Filter */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">{t('purchaseInvoices.creator')}</label>
                                <select
                                    value={filterCreator}
                                    onChange={(e) => setFilterCreator(e.target.value)}
                                    className="h-8 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: `${isRTL ? 'left' : 'right'} 8px center` }}
                                >
                                    <option value="">{t('purchaseInvoices.allCreators')}</option>
                                    {[...new Set(invoices.map((d: any) => d.created_by_name).filter(Boolean))].sort().map((name: any) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Value Range Filter */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">{t('purchaseInvoices.amount')}</label>
                                <input
                                    type="number"
                                    placeholder={t('purchaseInvoices.min')}
                                    value={filterAmountMin}
                                    onChange={(e) => setFilterAmountMin(e.target.value)}
                                    className="h-8 w-24 px-2.5 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[10px] text-gray-300">–</span>
                                <input
                                    type="number"
                                    placeholder={t('purchaseInvoices.max')}
                                    value={filterAmountMax}
                                    onChange={(e) => setFilterAmountMax(e.target.value)}
                                    className="h-8 w-24 px-2.5 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            {/* Supplier Filter */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">{t('purchaseInvoices.supplier')}</label>
                                <select
                                    value={filterSupplier}
                                    onChange={(e) => setFilterSupplier(e.target.value)}
                                    className="h-8 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: `${isRTL ? 'left' : 'right'} 8px center` }}
                                >
                                    <option value="">{t('purchaseInvoices.allSuppliers')}</option>
                                    {Object.entries(suppliersMap).map(([id, s]: [string, any]) => (
                                        <option key={id} value={id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Status Filter */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">{t('purchaseInvoices.payment')}</label>
                                <select
                                    value={filterPayment}
                                    onChange={(e) => setFilterPayment(e.target.value)}
                                    className="h-8 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: `${isRTL ? 'left' : 'right'} 8px center` }}
                                >
                                    <option value="">{t('purchaseInvoices.all')}</option>
                                    <option value="unpaid">{t('purchaseInvoices.unpaid')}</option>
                                    <option value="partial">{t('purchaseInvoices.partial')}</option>
                                    <option value="paid">{t('purchaseInvoices.fullyPaid')}</option>
                                </select>
                            </div>

                            {/* Delivery Status Filter */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">{t('purchaseInvoices.delivery')}</label>
                                <select
                                    value={filterDelivery}
                                    onChange={(e) => setFilterDelivery(e.target.value)}
                                    className="h-8 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: `${isRTL ? 'left' : 'right'} 8px center` }}
                                >
                                    <option value="">{t('purchaseInvoices.all')}</option>
                                    <option value="pending">{t('purchaseInvoices.pending')}</option>
                                    <option value="delivered">{t('purchaseInvoices.delivered')}</option>
                                </select>
                            </div>

                            {/* Clear All Filters */}
                            {(filterBranch || filterCreator || filterSupplier || filterAmountMin || filterAmountMax || filterPayment || filterDelivery || searchTerm) && (
                                <button
                                    onClick={() => { setFilterBranch(''); setFilterCreator(''); setFilterSupplier(''); setFilterAmountMin(''); setFilterAmountMax(''); setFilterPayment(''); setFilterDelivery(''); setSearchTerm(''); }}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ms-auto bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 px-2.5 py-1.5 rounded-md"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    {t('purchaseInvoices.clearAll')}
                                </button>
                            )}
                        </div>

                        {/* ─── Table ─── */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm" dir={direction}>
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-b from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                                        <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                                        <th className="px-4 py-3 text-start text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <button onClick={() => { setSortField('_doc_number'); setSortAsc(f => !f); }} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                                                {t('purchaseInvoices.document')}
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-start text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <button onClick={() => { setSortField('supplier_name'); setSortAsc(f => !f); }} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                                                {t('purchaseInvoices.supplierCol')}
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-start text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <button onClick={() => { setSortField('created_at'); setSortAsc(f => !f); }} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                                                {t('purchaseInvoices.dateTime')}
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-start text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('purchaseInvoices.creatorCol')}
                                        </th>
                                        <th className="px-4 py-3 text-end text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <button onClick={() => { setSortField('total_amount'); setSortAsc(f => !f); }} className="flex items-center gap-1 justify-end hover:text-gray-700 dark:hover:text-gray-200">
                                                {t('purchaseInvoices.total')}
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-start text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('purchaseInvoices.paymentCol')}</th>
                                        <th className="px-4 py-3 text-start text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('purchaseInvoices.deliveryCol')}</th>
                                        <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {isLoading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={`skel-${i}`} className="animate-pulse">
                                                <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-6 mx-auto" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-28" /><div className="h-3 bg-gray-100 rounded w-16 mt-1" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-14 mt-1" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /><div className="h-3 bg-gray-100 rounded w-16 mt-1" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20 ms-auto" /></td>
                                                <td className="px-4 py-4"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                                                <td className="px-4 py-4"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                                                <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-6 mx-auto" /></td>
                                            </tr>
                                        ))
                                    ) : filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-16">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-10 h-10 text-gray-200" />
                                                    <p className="text-sm text-gray-400 font-medium">{t('purchaseInvoices.noDocuments')}</p>
                                                    {searchTerm && (
                                                        <button onClick={() => setSearchTerm('')} className="text-xs text-indigo-500 hover:underline">
                                                            {t('purchaseInvoices.clearSearch')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((doc: any, idx: number) => {
                                            const stage = doc.stage || doc._stage || 'draft';
                                            const badge = stageBadgeConfig[stage] || stageBadgeConfig.draft;
                                            const total = Number(doc.total_amount || 0);
                                            const paid = Number(doc.paid_amount || 0);
                                            const curr = doc.currency || companyCurrency || 'USD';
                                            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                                            const isConfirmedPlus = ['confirmed', 'received', 'posted'].includes(stage);
                                            const isDelivered = stage === 'received';

                                            // Date & elapsed time
                                            const createdAt = new Date(doc.created_at);
                                            const elapsed = formatDistanceToNow(createdAt, { addSuffix: true, locale: enUS });
                                            const ageMs = Date.now() - createdAt.getTime();
                                            const ageColor = ageMs > 7 * 86400000 ? 'text-red-500' : ageMs > 3 * 86400000 ? 'text-amber-500' : 'text-emerald-500';

                                            // Stage accent colors for left border
                                            const accentColors: Record<string, string> = {
                                                request: 'border-s-amber-400',
                                                quotation: 'border-s-purple-400',
                                                draft: 'border-s-gray-300',
                                                confirmed: 'border-s-blue-400',
                                                received: 'border-s-teal-400',
                                                posted: 'border-s-green-400',
                                                cancelled: 'border-s-red-400',
                                            };

                                            return (
                                                <tr
                                                    key={doc.id}
                                                    onClick={() => handleRowClick(doc)}
                                                    className={`group cursor-pointer transition-all duration-150 border-s-[3px] ${accentColors[stage] || 'border-s-gray-200 dark:border-s-gray-700'} ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-850/40'} hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.1)]`}
                                                >
                                                    {/* # */}
                                                    <td className="px-3 py-3.5 text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {idx + 1}
                                                        </span>
                                                    </td>

                                                    {/* Document */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-mono text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 leading-tight">
                                                                {doc._doc_number || '-'}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                                                                {badge.icon} {badge.label}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Supplier + City */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{doc.supplier_name || '-'}</span>
                                                            {doc.supplier_city && (
                                                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                    📍 {doc.supplier_city}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Date & Time & Elapsed */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                                                                <span className="font-mono text-[12px] text-gray-700 dark:text-gray-300">
                                                                    {createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-[11px] text-gray-400 ps-[18px]">
                                                                {createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                            <span className={`text-[10px] font-medium ps-[18px] ${ageColor}`}>
                                                                ⏱ {elapsed}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Creator */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span className="text-[12px] text-gray-600 dark:text-gray-400 line-clamp-1">{doc.created_by_name || '-'}</span>
                                                        </div>
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-4 py-3.5 text-end">
                                                        <span className="font-mono font-bold text-[14px] text-erp-navy dark:text-gray-200 tracking-tight">
                                                            {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="block text-[10px] text-gray-400">{curr}</span>
                                                    </td>

                                                    {/* Payment */}
                                                    <td className="px-4 py-3.5">
                                                        {isConfirmedPlus && total > 0 ? (
                                                            <div className="flex flex-col gap-1 min-w-[100px]">
                                                                <span className={`text-[11px] font-semibold ${pct >= 100 ? 'text-green-700' : pct > 0 ? 'text-amber-700' : 'text-red-600'}`}>
                                                                    {pct >= 100 ? '🟢' : pct > 0 ? '🟡' : '🔴'}{' '}
                                                                    {pct >= 100 ? t('purchaseInvoices.paid') : pct > 0 ? `${pct}% ${t('purchaseInvoices.paid')}` : t('purchaseInvoices.unpaid')}
                                                                </span>
                                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-red-300'}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                {pct > 0 && pct < 100 && (
                                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                                        {paid.toLocaleString('en-US')} / {total.toLocaleString('en-US')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-gray-300">—</span>
                                                        )}
                                                    </td>

                                                    {/* Receipt Status — DSS Real-time */}
                                                    <td className="px-4 py-3.5">
                                                        {isConfirmedPlus ? (() => {
                                                            // الحالة الحقيقية من stage في purchase_transactions
                                                            const receiptStatus =
                                                                doc.receipt_status ||
                                                                (stage === 'received' ? 'received' :
                                                                    ['confirmed', 'posted'].includes(stage) ? 'pending' : null);
                                                            const cfg: Record<string, { label_ar: string; label_en: string; cls: string; icon: string }> = {
                                                                received: { label_ar: 'مستلم ✔', label_en: 'Received ✔', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: '✅' },
                                                                partial: { label_ar: 'جزئي', label_en: 'Partial', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', icon: '🔶' },
                                                                in_progress: { label_ar: 'قيد الاستلام', label_en: 'Receiving...', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800 animate-pulse', icon: '🔄' },
                                                                pending: { label_ar: 'معلق', label_en: 'Pending', cls: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', icon: '⏳' },
                                                            };
                                                            const c = cfg[receiptStatus || 'pending'] || cfg.pending;
                                                            return (
                                                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${c.cls}`}>
                                                                    {c.icon} {language === 'ar' ? c.label_ar : c.label_en}
                                                                </span>
                                                            );
                                                        })() : (
                                                            <span className="text-[11px] text-gray-300">—</span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="min-w-[150px]">
                                                                <DropdownMenuLabel className="text-[11px] text-gray-400">{t('common.actions')}</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => handleRowClick(doc)} className="gap-2 cursor-pointer text-sm">
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                    {t('common.view')}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => { setSelectedDoc(doc); setDocMode('edit'); setIsSheetOpen(true); }}
                                                                    className="gap-2 cursor-pointer text-sm"
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                    {t('common.edit')}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ─── Footer Summary ─── */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 text-xs">
                            <span className="text-gray-400">
                                {t('purchaseInvoices.showingOf')} {filteredInvoices.length} {t('purchaseInvoices.of')} {invoices.length} {t('purchaseInvoices.documents')}
                            </span>
                            <span className="font-mono font-bold text-erp-navy dark:text-gray-200">
                                {t('purchaseInvoices.totalLabel')}
                                {filteredInvoices.reduce((sum: number, d: any) => sum + Number(d.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-gray-400 ms-1">{companyCurrency || ''}</span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <div
                        className="overflow-hidden rounded-lg border dark:border-gray-800 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-950 shadow-sm"
                        dir={direction}
                        style={{ height: 'calc(100vh - 260px)' }}
                    >
                        <NexaKanbanBoard
                            columns={kanbanColumns}
                            items={kanbanItems}
                            direction={direction}
                            currency={companyCurrency || ''}
                            isLoading={isLoading}
                            emptyText={t('purchaseInvoices.noDocumentsKanban')}
                            getItemValue={(content) => Number(content.total_amount || 0)}
                            renderCard={(doc, colId) => {
                                const stage = (doc.stage || doc._stage || 'draft') as string;
                                const totalAmt = Number(doc.total_amount || 0);
                                const paidAmt = Number(doc.paid_amount || 0);
                                const isInvoiceCol = colId === 'invoice';

                                // ═══ Stage badge (shown in invoice column only) ═══
                                const stageBadges: Record<string, { label: string; cls: string }> = {
                                    draft: { label: '📝 ' + t('purchaseInvoices.stageDraft'), cls: 'bg-gray-100 text-gray-700' },
                                    confirmed: { label: '🛡️ ' + t('purchaseInvoices.stageConfirmed'), cls: 'bg-blue-100 text-blue-700' },
                                    received: { label: '📦 ' + t('purchaseInvoices.stageReceived'), cls: 'bg-teal-100 text-teal-700' },
                                    posted: { label: '📊 ' + t('purchaseInvoices.stagePosted'), cls: 'bg-green-100 text-green-700' },
                                };
                                const currentStageBadge = stageBadges[stage];

                                // ═══ Payment percentage ═══
                                const paymentPct = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0;
                                const showPayment = ['confirmed', 'received', 'posted'].includes(stage) && totalAmt > 0;
                                const paymentColor = paymentPct >= 100 ? 'text-green-600 bg-green-50' : paymentPct > 0 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                                const paymentIcon = paymentPct >= 100 ? '🟢' : paymentPct > 0 ? '🟡' : '🔴';
                                const paymentLabel = paymentPct >= 100
                                    ? t('purchaseInvoices.paid')
                                    : paymentPct > 0
                                        ? `${paymentPct}% ${t('purchaseInvoices.paid')}`
                                        : t('purchaseInvoices.unpaid');

                                // ═══ Receipt Status — from purchase_transactions directly ═══
                                const receiptStatus =
                                    doc.receipt_status ||
                                    (stage === 'received' ? 'received' :
                                        ['confirmed', 'posted'].includes(stage) ? 'pending' : null);
                                const receiptCfg: Record<string, { label: string; cls: string }> = {
                                    received: { label: '✅ ' + t('purchaseInvoices.stageReceived'), cls: 'text-green-700 bg-green-50' },
                                    partial: { label: '🔶 ' + t('purchaseInvoices.partial'), cls: 'text-amber-700 bg-amber-50' },
                                    in_progress: { label: '🔄 ' + t('purchaseInvoices.loadingMore').replace('...',''), cls: 'text-teal-700 bg-teal-50 animate-pulse' },
                                    pending: { label: '⏳ ' + t('purchaseInvoices.pending'), cls: 'text-orange-600 bg-orange-50' },
                                };
                                const receiptBadge = receiptCfg[receiptStatus || 'pending'] || receiptCfg.pending;

                                // ═══ Posted badge ═══
                                const isPosted = doc.is_posted || stage === 'posted';

                                return (
                                    <div
                                        className="p-3 space-y-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => handleRowClick(doc)}
                                    >
                                        {/* Row 1: Doc Number + Stage badge */}
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                                {doc._doc_number || doc.invoice_no || doc.order_no || doc.draft_no || '-'}
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

                                        {/* Row 3: Status Badges — Payment % + Delivery + Posted */}
                                        {showPayment && (
                                            <div className="flex flex-wrap gap-1">
                                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${paymentColor}`}>
                                                    {paymentIcon} {paymentLabel}
                                                </span>
                                                {receiptStatus && (
                                                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${receiptBadge.cls}`}>
                                                        {receiptBadge.label}
                                                    </span>
                                                )}
                                                {isPosted && (
                                                    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                                        📊 {t('purchaseInvoices.stagePosted')}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Row 4: Date + Amount */}
                                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString() : '-'}
                                            </span>
                                            <span className="font-mono text-sm font-bold text-erp-navy">
                                                {totalAmt.toLocaleString()}{' '}
                                                <span className="text-[10px] text-gray-400">{doc.currency || companyCurrency || ''}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                            onCardMove={async (itemId, fromColumn, toColumn) => {
                                const fromTitle = kanbanColumns.find(c => c.id === fromColumn)?.title;
                                const toTitle = kanbanColumns.find(c => c.id === toColumn)?.title;

                                // ═══ Allowed Kanban drag rules (constitution) ═══
                                // request ↔ quotation ↔ invoice (→ stage=draft)
                                // receipt, return, cancelled columns are READ-ONLY
                                const allowedMoves: Record<string, string[]> = {
                                    request: ['quotation', 'invoice'],
                                    quotation: ['request', 'invoice'],
                                    invoice: ['request', 'quotation'],
                                };

                                const allowed = allowedMoves[fromColumn];
                                if (!allowed || !allowed.includes(toColumn)) {
                                    toast.error(
                                        `❌ ${t('purchaseInvoices.cannotMove')} "${fromTitle}" ${t('purchaseInvoices.to')} "${toTitle}"`
                                    );
                                    return;
                                }

                                // If moving FROM invoice column, only draft-stage docs can be moved
                                if (fromColumn === 'invoice') {
                                    const movedDoc = invoices.find((d: any) => d.id === itemId);
                                    const docStage = movedDoc?.stage || movedDoc?._stage || 'draft';
                                    if (docStage !== 'draft') {
                                        toast.error(
                                            `❌ ${t('purchaseInvoices.cannotMoveNonDraft')}`
                                        );
                                        return;
                                    }
                                }

                                const targetStage = toColumn === 'invoice' ? 'draft' : toColumn;

                                const confirmed = window.confirm(
                                    `${t('purchaseInvoices.confirmMove')} "${fromTitle}" ${t('purchaseInvoices.to')} "${toTitle}"?`
                                );
                                if (!confirmed) return;

                                try {
                                    const { error } = await supabase
                                        .from('purchase_transactions')
                                        .update({ stage: targetStage })
                                        .eq('id', itemId);

                                    if (error) throw error;

                                    toast.success(
                                        `✅ ${t('purchaseInvoices.moveSuccess')} "${toTitle}"`
                                    );
                                    queryClient.invalidateQueries({ queryKey: ['purchase_transactions_list'] });
                                } catch (err: any) {
                                    toast.error(`❌ ${t('purchaseInvoices.errorPrefix')}: ${err.message}`);
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Unified Trade Sheet */}
            {
                isSheetOpen && (
                    <UnifiedTradeSheet
                        open={isSheetOpen}
                        onOpenChange={(open) => {
                            setIsSheetOpen(open);
                            if (!open) setSelectedDoc(null);
                        }}
                        mode="purchase"
                        type="invoice"
                        initialData={docMode === 'create'
                            ? { type: 'invoice', stage: 'draft', currency: companyCurrency || '', date: new Date().toISOString() }
                            : selectedDoc
                        }
                        currentStage={selectedDoc?.stage || undefined}
                        onRefresh={() => {
                            queryClient.invalidateQueries({ queryKey: ['purchase_transactions_list'] });
                            queryClient.invalidateQueries({ queryKey: ['purchase_transactions_recent'] });
                            queryClient.invalidateQueries({ queryKey: ['purchase_transactions_full'] });
                        }}
                    />
                )
            }

            {/* ✅ MaterialReceiptDialog — استلام سريع من صفحة المشتريات */}
            <MaterialReceiptDialog
                isOpen={receiptDialog.open}
                onOpenChange={(open) => {
                    setReceiptDialog({ open });
                    if (!open) {
                        queryClient.invalidateQueries({ queryKey: ['purchase_transactions_recent'] });
                        queryClient.invalidateQueries({ queryKey: ['purchase_transactions_full'] });
                    }
                }}
                defaultBillType="purchase_local"
                defaultReference={receiptDialog.sourceDocId || ''}
                onComplete={() => {
                    setReceiptDialog({ open: false });
                    queryClient.invalidateQueries({ queryKey: ['purchase_transactions_recent'] });
                    queryClient.invalidateQueries({ queryKey: ['purchase_transactions_full'] });
                }}
                onOpenSourceDocument={(sourceId) => {
                    // فتح الفاتورة المصدر في الشيت
                    const found = filteredInvoices.find((d: any) => d.id === sourceId);
                    if (found) {
                        setReceiptDialog({ open: false });
                        setTimeout(() => {
                            setSelectedDoc(found);
                            setDocMode('view');
                            setIsSheetOpen(true);
                        }, 300);
                    }
                }}
            />
        </div >
    );
}
