import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Calendar,
    ShoppingCart,
    Flag,
    CheckCircle,
    Plus,
    FileText,
    Truck,
    RotateCcw,
    ChevronDown,
    Filter,
    Package,
    LayoutGrid,
    List,
    MoreHorizontal,
    Eye,
    Send,
    ArrowLeftRight,
    Loader2,
    Receipt,
    BookOpen,
    FilePlus,
    User,
    Clock
} from 'lucide-react';
import { NexaKanbanBoard } from '@/components/ui/nexa-kanban/NexaKanbanBoard';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import type { DocType } from '@/components/sheets/configs/sheet.types';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay, format, formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { validateTradeDocument } from '@/features/trade/utils/validateTradeDocument';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { useCompanyCurrencies } from '@/hooks/useCompanyCurrencies';
import { usePosting } from '@/hooks/usePosting';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { salesTransactionService } from '@/services/salesTransactionService';
import { cn } from '@/lib/utils';

// Define Types
type CycleType = 'quotation' | 'order' | 'delivery' | 'invoice' | 'return' | 'reservation' | 'draft' | 'confirmed' | 'posted';

// Map stages to display cycle types
const STAGE_TO_CYCLE: Record<string, CycleType> = {
    draft: 'draft',
    quotation: 'quotation',
    reservation: 'reservation',
    order: 'order',
    confirmed: 'confirmed',
    posted: 'invoice',
    in_delivery: 'confirmed',
    in_receiving: 'confirmed',
    delivery: 'delivery',
    delivered: 'delivery',
    invoice: 'invoice',
    invoiced: 'invoice',
    partially_received: 'confirmed',
    fully_received: 'confirmed',
    completed: 'confirmed',
    paid: 'confirmed',
    partial_paid: 'confirmed',
    partially_paid: 'confirmed',
    cancelled: 'return',
    return: 'return',
    closed: 'confirmed',
};

// ─── Status Style Map ───
const STAGE_STYLES: Record<string, {
    bg: string; text: string; dot: string; labelAr: string; labelEn: string;
}> = {
    draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400', labelAr: 'مسودة', labelEn: 'Draft' },
    quotation: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', labelAr: 'عرض سعر', labelEn: 'Quotation' },
    reservation: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500', labelAr: 'حجز', labelEn: 'Reserved' },
    order: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', labelAr: 'أمر بيع', labelEn: 'Order' },
    confirmed: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', labelAr: 'مؤكد', labelEn: 'Confirmed' },
    posted: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', labelAr: 'مسلّمة ومرحّلة', labelEn: 'Delivered & Posted' },
    in_delivery: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500', labelAr: 'قيد التسليم', labelEn: 'In Delivery' },
    in_receiving: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500', labelAr: 'قيد الاستلام', labelEn: 'In Receiving' },
    delivery: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500', labelAr: 'تسليم', labelEn: 'Delivery' },
    delivered: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500', labelAr: 'تم التسليم', labelEn: 'Delivered' },
    invoice: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500', labelAr: 'فاتورة', labelEn: 'Invoice' },
    invoiced: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500', labelAr: 'مفوتر', labelEn: 'Invoiced' },
    paid: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', labelAr: 'مدفوع', labelEn: 'Paid' },
    partial_paid: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500', labelAr: 'مدفوع جزئياً', labelEn: 'Partially Paid' },
    partially_paid: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500', labelAr: 'مدفوع جزئياً', labelEn: 'Partially Paid' },
    partially_received: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', labelAr: 'مستلم جزئياً', labelEn: 'Partially Received' },
    fully_received: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', labelAr: 'مستلم بالكامل', labelEn: 'Fully Received' },
    completed: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', labelAr: 'مكتمل', labelEn: 'Completed' },
    cancelled: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', labelAr: 'ملغى', labelEn: 'Cancelled' },
    closed: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500', labelAr: 'مغلق', labelEn: 'Closed' },
    return: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', labelAr: 'مرتجع', labelEn: 'Return' },
};

// ─── Row accent colors ───
const STAGE_ACCENT: Record<string, string> = {
    draft: 'border-s-gray-300',
    quotation: 'border-s-purple-400',
    reservation: 'border-s-cyan-400',
    order: 'border-s-blue-400',
    confirmed: 'border-s-green-400',
    posted: 'border-s-emerald-400',
    in_delivery: 'border-s-sky-400',
    in_receiving: 'border-s-cyan-400',
    delivery: 'border-s-orange-400',
    delivered: 'border-s-teal-400',
    invoice: 'border-s-indigo-400',
    invoiced: 'border-s-indigo-400',
    paid: 'border-s-blue-400',
    partial_paid: 'border-s-indigo-300',
    partially_paid: 'border-s-indigo-300',
    cancelled: 'border-s-red-400',
    return: 'border-s-rose-400',
    completed: 'border-s-emerald-400',
    closed: 'border-s-slate-400',
};

interface SalesDocument {
    id: string;
    document_number: string;
    date: string;
    type: CycleType;
    status: string;
    stage: string;
    total_amount: number;
    customer_id?: string;
    customer_name?: string;
    currency: string;
    created_at: string;
    delivered_at?: string;
    posted_at?: string;
    delivery_confirmed_at?: string;
    original_table: string;
    reservation_type?: 'stock' | 'transit';
    source_ref?: string;
    _rawData?: any;
}

export default function SalesCycleList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { baseCurrency, supportedCurrencies } = useCompanyCurrencies();
    const { fmtAmount } = useNumberFormat();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();
    const {
        postSalesInvoice,
        postSalesReturn,
        convertQuotation,
        isPosting
    } = usePosting();

    // 🔄 Realtime: auto-update — single table
    useRealtimeInvalidation({
        table: 'sales_transactions',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['sales_cycle_full']],
    });

    // State
    const [activeTab, setActiveTab] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [viewModeLoaded, setViewModeLoaded] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<SalesDocument | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');
    const [newDocType, setNewDocType] = useState<CycleType>('order');

    // Currency selection with persistence
    const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
        try { return localStorage.getItem('sales_cycle_currency') || ''; } catch { return ''; }
    });
    const activeCurrency = selectedCurrency || baseCurrency;
    const handleCurrencyChange = useCallback((cur: string) => {
        setSelectedCurrency(cur);
        try { localStorage.setItem('sales_cycle_currency', cur); } catch { }
        debouncedSavePreferences(VIEW_PREF_KEY, {
            columnVisibility: { viewMode: viewMode as any, activeTab, currency: cur } as any
        }, 500);
    }, [viewMode, activeTab]);

    // Date Filter State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // Search & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);
    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    }, [sortField]);

    // ─── Persist ALL preferences ───
    const VIEW_PREF_KEY = 'sales-cycle-view';

    // Load saved preferences on mount
    useEffect(() => {
        getTablePreferences(VIEW_PREF_KEY).then((prefs) => {
            const vis = prefs?.columnVisibility as any;
            if (vis?.viewMode) {
                const saved = vis.viewMode as string;
                if (saved === 'kanban' || saved === 'list') {
                    setViewMode(saved);
                    if (saved === 'kanban') setActiveTab('all');
                }
            }
            if (vis?.activeTab && vis.activeTab !== 'all') {
                setActiveTab(vis.activeTab);
            }
            if (vis?.currency) {
                setSelectedCurrency(vis.currency);
            }
            setViewModeLoaded(true);
        }).catch(() => setViewModeLoaded(true));
    }, []);

    // Save view mode when it changes
    const handleSetViewMode = useCallback((mode: 'list' | 'kanban') => {
        setViewMode(mode);
        if (mode === 'kanban') setActiveTab('all');
        debouncedSavePreferences(VIEW_PREF_KEY, {
            columnVisibility: { viewMode: mode as any, activeTab: mode === 'kanban' ? 'all' : activeTab, currency: selectedCurrency } as any
        }, 500);
    }, [activeTab, selectedCurrency]);

    // Save active tab when it changes
    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab);
        debouncedSavePreferences(VIEW_PREF_KEY, {
            columnVisibility: { viewMode: viewMode as any, activeTab: tab, currency: selectedCurrency } as any
        }, 500);
    }, [viewMode, selectedCurrency]);

    // 1. Fetch Customers Map
    const { data: customersMap = {} } = useQuery({
        queryKey: ['customers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('customers')
                .select('id, name_ar, name_en')
                .eq('tenant_id', (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id); // Use safer tenant check

            if (error) {
                console.warn('Customers fetch failed', error);
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

    // 2. Fetch ALL Documents — always fetch everything, filter in frontend
    const { data: documents = [], isLoading, error, refetch } = useQuery({
        queryKey: ['sales_cycle_full', companyId, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            const fromISO = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString().split('T')[0] : null;

            let q = supabase
                .from('sales_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Only filter by date — tabs and currency are filtered client-side
            if (fromISO) q = q.gte('doc_date', fromISO);
            if (toISO) q = q.lte('doc_date', toISO);

            const { data, error: fetchErr } = await q;

            if (fetchErr) {
                console.error('Failed to fetch sales_transactions:', fetchErr.message);
                return [];
            }

            return (data || []).map((item: any): SalesDocument => {
                const stage = item.stage || 'draft';
                const type = STAGE_TO_CYCLE[stage] || 'draft';

                // Pick the best document number for current stage
                const docNum = item.invoice_no || item.delivery_no || item.order_no
                    || item.reservation_no || item.quotation_no || item.draft_no
                    || item.id?.substring(0, 8);

                // Pick the best date for current stage
                const docDate = item.invoice_date || item.delivery_date || item.order_date
                    || item.reservation_date || item.quotation_date || item.doc_date
                    || item.created_at;

                const exchangeRate = Number(item.exchange_rate || 1);

                return {
                    id: item.id,
                    document_number: docNum,
                    date: docDate,
                    type,
                    status: stage,
                    stage,
                    total_amount: Number(item.total_amount || 0),
                    customer_id: item.customer_id,
                    customer_name: item.customer_name,
                    currency: item.currency || baseCurrency,
                    created_at: item.created_at,
                    delivered_at: item.delivered_at || item.delivery_confirmed_at || null,
                    posted_at: item.posted_at || null,
                    delivery_confirmed_at: item.delivery_confirmed_at || null,
                    original_table: 'sales_transactions',
                    _rawData: { ...item, exchange_rate: exchangeRate },
                };
            });
        },
        enabled: !!companyId
    });

    // Combine Data with Customer Names
    const enrichedDocuments = useMemo(() => {
        return documents.map(doc => ({
            ...doc,
            customer_name_display: doc.customer_id ? (customersMap[doc.customer_id] || doc.customer_name || 'Unknown Client') : '-'
        })) as (SalesDocument & { customer_name_display: string })[];
    }, [documents, customersMap]);

    // ─── Stage filter map (for tab filtering) ───
    const STAGE_FILTER: Record<string, string[]> = useMemo(() => ({
        draft: ['draft'],
        quotation: ['quotation'],
        reservation: ['reservation'],
        order: ['order'],
        confirmed: ['confirmed', 'in_delivery', 'in_receiving', 'partially_received', 'fully_received', 'completed'],
        delivery: ['delivery', 'delivered'],
        invoice: ['invoice', 'invoiced', 'posted', 'paid', 'partial_paid', 'partially_paid', 'closed'],
        return: ['return', 'cancelled'],
    }), []);

    // ─── Counts per tab (from ALL documents — always visible) ───
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        enrichedDocuments.forEach(d => {
            const cycle = STAGE_TO_CYCLE[d.stage] || 'draft';
            counts[cycle] = (counts[cycle] || 0) + 1;
        });
        return counts;
    }, [enrichedDocuments]);

    // ─── Fetch exchange rates for currency conversion ───
    const { data: exchangeRates = {} } = useQuery({
        queryKey: ['exchange_rates', companyId],
        queryFn: async () => {
            const { data: user } = await supabase.auth.getUser();
            const tenantId = user.user?.user_metadata?.tenant_id;
            if (!tenantId) return {};

            const { data, error } = await supabase
                .from('exchange_rates')
                .select('from_currency, to_currency, mid_rate')
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            if (error || !data) return {};

            // Build rate map: rates['USD->UAH'] = 42.811
            const rateMap: Record<string, number> = {};
            data.forEach((r: any) => {
                rateMap[`${r.from_currency}->${r.to_currency}`] = Number(r.mid_rate);
            });
            return rateMap;
        },
        enabled: !!companyId,
        staleTime: 300000, // 5 min cache
    });

    // ─── Currency conversion helper ───
    const convertAmount = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
        if (!amount || fromCurrency === toCurrency) return amount;

        // Direct rate
        const directKey = `${fromCurrency}->${toCurrency}`;
        if (exchangeRates[directKey]) {
            return amount * exchangeRates[directKey];
        }

        // Inverse rate
        const inverseKey = `${toCurrency}->${fromCurrency}`;
        if (exchangeRates[inverseKey]) {
            return amount / exchangeRates[inverseKey];
        }

        // Try via base currency (UAH usually)
        if (baseCurrency) {
            const toBase = exchangeRates[`${fromCurrency}->${baseCurrency}`];
            const fromBase = exchangeRates[`${baseCurrency}->${toCurrency}`];
            if (toBase && fromBase) {
                return amount * toBase * fromBase;
            }
        }

        return amount; // fallback: no conversion
    }, [exchangeRates, baseCurrency]);

    // ─── Filter documents for display (by tab only — currency is display, not filter) ───
    const displayDocuments = useMemo(() => {
        let filtered = enrichedDocuments;

        // Filter by tab
        if (activeTab !== 'all') {
            const stages = STAGE_FILTER[activeTab] || [activeTab];
            filtered = filtered.filter(d => stages.includes(d.stage));
        }

        return filtered;
    }, [enrichedDocuments, activeTab, STAGE_FILTER]);

    // ─── Converted total for footer (all amounts converted to display currency) ───
    const displayTotal = useMemo(() => {
        return displayDocuments.reduce((sum, doc) => {
            const converted = convertAmount(Number(doc.total_amount || 0), doc.currency, activeCurrency);
            return sum + converted;
        }, 0);
    }, [displayDocuments, convertAmount, activeCurrency]);

    // ─── Parse notes JSON to extract cart items ───
    const parseDocumentItems = useCallback((doc: SalesDocument): any[] => {
        try {
            const raw = doc._rawData;
            // Priority 1: items array from fetchById (includes delivery_rolls)
            if (raw?.items && Array.isArray(raw.items) && raw.items.length > 0) {
                return raw.items;
            }
            // Priority 2: items serialized in notes JSON
            if (!raw?.notes) return [];
            const parsed = typeof raw.notes === 'string' ? JSON.parse(raw.notes) : raw.notes;
            if (parsed?._source === 'cart' && Array.isArray(parsed.items)) {
                return parsed.items;
            }
            return [];
        } catch {
            return [];
        }
    }, []);

    const handleRowClick = async (row: SalesDocument) => {
        // For delivered/posted invoices, fetch full data with delivery rolls
        if (row.id && ['delivered', 'posted', 'in_delivery'].includes(row.stage || '')) {
            const fullDoc = await salesTransactionService.fetchById(row.id);
            if (fullDoc) {
                setSelectedDoc({
                    ...row,
                    _rawData: { ...row._rawData, ...fullDoc, items: fullDoc.items },
                });
                setDocMode('view');
                setIsSheetOpen(true);
                return;
            }
        }
        setSelectedDoc(row);
        setDocMode('view');
        setIsSheetOpen(true);
    };

    const handleCreate = (type: CycleType) => {
        setNewDocType(type);
        setSelectedDoc(null);
        setDocMode('create');
        setIsSheetOpen(true);
    };

    // ─── All docs are in sales_transactions — no multi-table map needed ───

    // ─── Save (update) existing document in sales_transactions ───
    const handleDocumentSave = useCallback(async (docData: any) => {
        if (!selectedDoc?.id) {
            toast.error(isRTL ? 'لا يمكن الحفظ — المستند غير محدد' : 'Cannot save — document not identified');
            return;
        }

        // Validation
        const validation = validateTradeDocument({
            data: docData, mode: 'sales', action: 'save',
            creditLimit: docData._creditLimit, balance: docData._balance,
            isCreditExceeded: docData._isCreditExceeded,
        });
        if (!validation.isValid) {
            validation.errors.forEach(err => toast.error(isRTL ? err.messageAr : err.messageEn));
            return;
        }
        validation.warnings.forEach(warn => toast.warning(isRTL ? warn.messageAr : warn.messageEn));

        try {
            const updates: Record<string, any> = {};

            if (docData.customer_id) updates.customer_id = docData.customer_id;
            if (docData.customer_name) updates.customer_name = docData.customer_name;
            if (docData.warehouse_id) updates.warehouse_id = docData.warehouse_id;
            if (docData.currency) updates.currency = docData.currency;
            if (docData.date) updates.doc_date = new Date(docData.date).toISOString().split('T')[0];
            if (docData.due_date) updates.due_date = new Date(docData.due_date).toISOString().split('T')[0];
            if (docData.salesperson_id !== undefined) updates.salesperson_id = docData.salesperson_id || null;
            if (docData.exchange_rate != null) updates.exchange_rate = Number(docData.exchange_rate) || 1;
            if (docData.payment_terms_days != null) updates.payment_terms_days = Number(docData.payment_terms_days) || 0;
            if (docData.discount_percent != null) updates.discount_percent = Number(docData.discount_percent) || 0;
            if (docData.total_amount != null) updates.total_amount = Number(docData.total_amount) || 0;
            if (docData.notes != null) updates.notes = docData.notes;
            if (docData.internal_notes != null) updates.internal_notes = docData.internal_notes;

            const result = await salesTransactionService.update(selectedDoc.id, updates);
            if (!result) throw new Error('Update returned null');

            // Update items if provided
            if (docData.items && Array.isArray(docData.items)) {
                await salesTransactionService.replaceItems(selectedDoc.id, docData.items);
            }

            toast.success(isRTL ? 'تم حفظ المستند بنجاح ✅' : 'Document saved successfully ✅');
            queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
            setIsSheetOpen(false);
            setSelectedDoc(null);
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(isRTL ? `خطأ في الحفظ: ${err.message}` : `Save error: ${err.message}`);
        }
    }, [selectedDoc, isRTL, queryClient]);

    // ─── Create new document using salesTransactionService ───
    const handleCreateSave = useCallback(async (docData: any) => {
        if (!companyId) {
            toast.error(isRTL ? 'لا يوجد شركة محددة' : 'No company selected');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const tenantId = user?.user_metadata?.tenant_id;

            const transaction = await salesTransactionService.create({
                tenant_id: tenantId!,
                company_id: companyId,
                customer_id: docData.customer_id || null,
                customer_name: docData.customer_name || null,
                salesperson_id: docData.salesperson_id || null,
                salesperson_name: docData.salesperson_name || null,
                warehouse_id: docData.warehouse_id || null,
                currency: docData.currency || activeCurrency,
                exchange_rate: docData.exchange_rate || 1,
                doc_date: docData.date ? new Date(docData.date).toISOString().split('T')[0] : undefined,
                due_date: docData.due_date ? new Date(docData.due_date).toISOString().split('T')[0] : undefined,
                payment_terms_days: docData.payment_terms_days || 30,
                is_pos: docData._posMode || false,
                notes: docData.notes || docData.user_notes || null,
                internal_notes: docData.internal_notes || null,
                created_by: user?.id || null,
                created_by_name: user?.user_metadata?.full_name || user?.email || null,
                auto_update_stock: docData.auto_update_stock || false,
                stock_warehouse_id: docData.stock_warehouse_id || null,
            });

            if (!transaction) throw new Error('فشل إنشاء المعاملة');

            // Add items if provided
            if (docData.items && docData.items.length > 0) {
                await salesTransactionService.addItems(transaction.id, docData.items);
            }

            toast.success(isRTL ? 'تم إنشاء المستند بنجاح ✅' : 'Document created successfully ✅');
            queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
            setIsSheetOpen(false);
            setSelectedDoc(null);
        } catch (err: any) {
            console.error('Create error:', err);
            toast.error(isRTL ? `خطأ في الإنشاء: ${err.message}` : `Create error: ${err.message}`);
        }
    }, [companyId, activeCurrency, isRTL, queryClient]);

    // ─── Auto-save as draft when closing the sheet ───
    const handleSheetClose = useCallback(async (open: boolean) => {
        if (!open && selectedDoc?.id && docMode !== 'create') {
            // Keep status as-is
        }
        setIsSheetOpen(open);
        if (!open) setSelectedDoc(null);
    }, [selectedDoc, docMode]);

    // Helper to map CycleType to DocType for the Sheet
    const getSheetDocType = (type: CycleType): DocType => {
        switch (type) {
            case 'quotation': return 'quotation'; // Reusing quotation (assuming sales/purchase shared or separate types needed)
            case 'order': return 'sales_order' as DocType; // Need to ensure this exists in Sheet types
            case 'delivery': return 'delivery_note' as DocType;
            case 'invoice': return 'sales_invoice' as DocType;
            case 'return': return 'sales_return' as DocType;
            case 'reservation': return 'reservation' as DocType;
            default: return 'sales_order' as DocType;
        }
    }



    // Kanban column definitions — matching pipeline tabs exactly
    const kanbanColumns = useMemo(() => [
        {
            id: 'draft',
            title: isRTL ? 'مسودة' : 'Draft',
            color: 'border-gray-400',
            bgColor: 'bg-gray-50/40',
            accentHex: '#9ca3af',
            icon: <FileText className="w-4 h-4 text-gray-500" />,
        },
        {
            id: 'quotation',
            title: isRTL ? 'عروض الأسعار' : 'Quotations',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40',
            accentHex: '#9333ea',
            icon: <FileText className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'reservation',
            title: isRTL ? 'الحجوزات' : 'Reservations',
            color: 'border-cyan-500',
            bgColor: 'bg-cyan-50/40',
            accentHex: '#0891b2',
            icon: <Package className="w-4 h-4 text-cyan-600" />,
        },
        {
            id: 'order',
            title: isRTL ? 'أوامر البيع' : 'Orders',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40',
            accentHex: '#2563eb',
            icon: <ShoppingCart className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'confirmed',
            title: isRTL ? 'فاتورة مؤكدة' : 'Confirmed',
            color: 'border-green-500',
            bgColor: 'bg-green-50/40',
            accentHex: '#16a34a',
            icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        },
        {
            id: 'delivery',
            title: isRTL ? 'تسليم' : 'Delivery',
            color: 'border-orange-500',
            bgColor: 'bg-orange-50/40',
            accentHex: '#ea580c',
            icon: <Truck className="w-4 h-4 text-orange-600" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'فاتورة' : 'Invoice',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#4f46e5',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'return',
            title: isRTL ? 'المرتجعات' : 'Returns',
            color: 'border-rose-500',
            bgColor: 'bg-rose-50/40',
            accentHex: '#e11d48',
            icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
        },
    ], [isRTL]);

    // Kanban items — use STAGE_TO_CYCLE for correct column placement
    const kanbanItems = useMemo(() =>
        enrichedDocuments.map(doc => ({
            id: doc.id,
            columnId: STAGE_TO_CYCLE[doc.stage] || STAGE_TO_CYCLE[doc.status] || 'draft',  // kanban always shows all
            content: doc as Record<string, any>,
        }))
        , [enrichedDocuments]);

    if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg mx-4 mt-4 border border-red-100">
        <p className="font-bold">Error loading sales documents</p>
        <p className="text-sm opacity-80 mt-1">{(error as Error).message}</p>
    </div>;

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* ─── Top Fixed Row: Title + View Switcher + Create Button ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('sales.cycle')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('sales.cycleSubtitle')}
                        </p>
                    </div>
                </div>

                {/* View Switcher + Create Button (always visible, fixed position) */}
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
                                activeTab === 'invoice' ? 'invoice' :
                                    activeTab === 'quotation' ? 'quotation' :
                                        activeTab === 'delivery' ? 'delivery' :
                                            activeTab === 'reservation' ? 'reservation' :
                                                activeTab === 'return' ? 'return' :
                                                    'order'
                            )}
                            className={`rounded-e-none gap-2 px-4 h-9 text-white shadow-sm ${activeTab === 'invoice' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                activeTab === 'return' ? 'bg-rose-600 hover:bg-rose-700' :
                                    activeTab === 'delivery' ? 'bg-orange-600 hover:bg-orange-700' :
                                        activeTab === 'reservation' ? 'bg-cyan-600 hover:bg-cyan-700' :
                                            activeTab === 'quotation' ? 'bg-purple-600 hover:bg-purple-700' :
                                                'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            {activeTab === 'invoice' ? (isRTL ? 'فاتورة مبيعات' : 'New Invoice') :
                                activeTab === 'quotation' ? (isRTL ? 'عرض سعر' : 'New Quotation') :
                                    activeTab === 'delivery' ? (isRTL ? 'إذن تسليم' : 'New Delivery') :
                                        activeTab === 'reservation' ? (isRTL ? 'حجز بضائع' : 'New Reservation') :
                                            activeTab === 'return' ? (isRTL ? 'مرتجع مبيعات' : 'New Return') :
                                                (isRTL ? 'أمر بيع جديد' : 'New Order')}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className={`border-s border-white/20 rounded-s-none px-2 h-9 text-white ${activeTab === 'invoice' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    activeTab === 'return' ? 'bg-rose-600 hover:bg-rose-700' :
                                        activeTab === 'delivery' ? 'bg-orange-600 hover:bg-orange-700' :
                                            activeTab === 'reservation' ? 'bg-cyan-600 hover:bg-cyan-700' :
                                                activeTab === 'quotation' ? 'bg-purple-600 hover:bg-purple-700' :
                                                    'bg-blue-600 hover:bg-blue-700'
                                    }`}>
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{isRTL ? 'إنشاء مستند جديد' : 'Create New Document'}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCreate('quotation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-purple-100 rounded text-purple-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'عرض سعر' : 'Quotation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('reservation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-cyan-100 rounded text-cyan-600"><Package className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'حجز بضائع' : 'Reservation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('order')} className="gap-2 cursor-pointer py-2.5 bg-blue-50/50">
                                    <div className="p-1 bg-blue-100 rounded text-blue-600"><ShoppingCart className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'أمر بيع' : 'Sales Order'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('delivery')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-orange-100 rounded text-orange-600"><Truck className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'إذن تسليم' : 'Delivery Note'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreate('invoice')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-indigo-100 rounded text-indigo-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'فاتورة مبيعات' : 'Sales Invoice'}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Tabs (list only) + Date Picker ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    {/* Tabs — only in list mode */}
                    {viewMode === 'list' && (() => {
                        const total = enrichedDocuments.length;
                        const badge = (n: number) => n > 0 ? ` ${n}` : '';

                        return (
                            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto" dir={direction}>
                                <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                                    <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'الكل' : 'All'}{badge(total)}</TabsTrigger>
                                    <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'مسودة' : 'Draft'}{badge(tabCounts.draft || 0)}</TabsTrigger>
                                    <TabsTrigger value="quotation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-purple-600">{isRTL ? 'عرض سعر' : 'Quotation'}{badge(tabCounts.quotation || 0)}</TabsTrigger>
                                    <TabsTrigger value="reservation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-cyan-600">{isRTL ? 'حجز' : 'Reserved'}{badge(tabCounts.reservation || 0)}</TabsTrigger>
                                    <TabsTrigger value="order" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-blue-600">{isRTL ? 'أمر بيع' : 'Order'}{badge(tabCounts.order || 0)}</TabsTrigger>
                                    <TabsTrigger value="confirmed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-green-600">{isRTL ? 'فاتورة مؤكدة' : 'Confirmed'}{badge(tabCounts.confirmed || 0)}</TabsTrigger>
                                    <TabsTrigger value="delivery" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-orange-600">{isRTL ? 'تسليم' : 'Delivery'}{badge(tabCounts.delivery || 0)}</TabsTrigger>
                                    <TabsTrigger value="invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-indigo-600">{isRTL ? 'فاتورة' : 'Invoice'}{badge(tabCounts.invoice || 0)}</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        );
                    })()}

                    {/* Currency Selector */}
                    {supportedCurrencies.length > 1 && (
                        <div className="flex bg-muted/50 p-1 rounded-lg border border-gray-200/50">
                            {supportedCurrencies.map(cur => (
                                <Button key={cur} variant="ghost" size="sm"
                                    className={`h-8 px-2.5 text-xs font-medium transition-all ${activeCurrency === cur
                                        ? 'bg-white shadow-sm text-erp-navy dark:bg-gray-800 dark:text-white font-bold'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    onClick={() => handleCurrencyChange(cur)}
                                >
                                    {cur}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Content Area ─── */}
                {viewMode === 'list' ? (
                    <NexaListTable<SalesDocument & { customer_name_display: string }>
                        data={displayDocuments}
                        columns={(() => {
                            const cols: NexaListColumn<SalesDocument & { customer_name_display: string }>[] = [
                                {
                                    id: 'document_number',
                                    header: isRTL ? 'رقم المستند' : 'Document #',
                                    sortable: true,
                                    sortKey: 'document_number',
                                    cell: (row) => (
                                        <div className="flex flex-col">
                                            <span className="font-mono text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 leading-tight">
                                                {row.document_number || '—'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                {row.created_at ? formatDistanceToNow(new Date(row.created_at), {
                                                    addSuffix: true,
                                                    locale: isRTL ? arLocale : undefined
                                                }) : ''}
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    id: 'date',
                                    header: isRTL ? 'التاريخ والوقت' : 'Date & Time',
                                    sortable: true,
                                    sortKey: 'created_at',
                                    cell: (row) => {
                                        const d = row.date || row.created_at;
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
                                                    {format(new Date(row.created_at), 'HH:mm')}
                                                </span>
                                            </div>
                                        );
                                    },
                                },
                                {
                                    id: 'customer',
                                    header: isRTL ? 'العميل' : 'Customer',
                                    cell: (row) => {
                                        const name = row.customer_name_display || row.customer_name || (isRTL ? 'عميل غير محدد' : 'Unknown');
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
                                    },
                                },
                                {
                                    id: 'total',
                                    header: isRTL ? 'الإجمالي' : 'Total',
                                    align: 'end',
                                    sortable: true,
                                    sortKey: 'total_amount',
                                    cell: (row) => {
                                        const amount = Number(row.total_amount || 0);
                                        if (amount === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
                                        const isSameCurrency = row.currency === activeCurrency;
                                        const convertedAmount = isSameCurrency ? amount : convertAmount(amount, row.currency, activeCurrency);
                                        const hasConversion = !isSameCurrency && convertedAmount !== amount;
                                        return (
                                            <div className="flex flex-col items-end">
                                                <span className="font-mono font-bold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight tabular-nums" dir="ltr">
                                                    {fmtAmount(hasConversion ? convertedAmount : amount)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-semibold">
                                                    {hasConversion ? (
                                                        <>{activeCurrency} <span className="text-gray-300">({fmtAmount(amount)} {row.currency})</span></>
                                                    ) : (
                                                        row.currency || activeCurrency
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    },
                                },
                                {
                                    id: 'delivery',
                                    header: isRTL ? 'التسليم' : 'Delivery',
                                    cell: (row) => {
                                        const delivered = row.delivered_at || row.delivery_confirmed_at;
                                        const posted = row.posted_at;
                                        if (!delivered && !posted) {
                                            if (['in_delivery'].includes(row.stage)) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-sky-600 font-medium">
                                                        <Truck className="w-3 h-3" />
                                                        {isRTL ? 'قيد التسليم' : 'In delivery'}
                                                    </span>
                                                );
                                            }
                                            return <span className="text-[11px] text-gray-300">—</span>;
                                        }
                                        return (
                                            <div className="flex flex-col gap-0.5">
                                                {delivered && (
                                                    <div className="flex items-center gap-1 text-[10px] text-teal-600 font-medium">
                                                        <Truck className="w-3 h-3" />
                                                        {format(new Date(delivered), 'MM/dd HH:mm')}
                                                    </div>
                                                )}
                                                {posted && (
                                                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                                        <CheckCircle className="w-3 h-3" />
                                                        {format(new Date(posted), 'MM/dd HH:mm')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    },
                                },
                                {
                                    id: 'status',
                                    header: isRTL ? 'الحالة' : 'Status',
                                    cell: (row) => {
                                        const style = STAGE_STYLES[row.stage] || STAGE_STYLES[row.status] || STAGE_STYLES.draft;
                                        return (
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
                                                style.bg, style.text
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                                                {isRTL ? style.labelAr : style.labelEn}
                                            </span>
                                        );
                                    },
                                },
                            ];
                            return cols;
                        })()}

                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder={isRTL ? 'بحث برقم الفاتورة...' : 'Search by invoice number...'}

                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}

                        totalCount={displayDocuments.length}
                        countLabel={isRTL ? 'مستند' : 'documents'}

                        sortField={sortField}
                        sortAsc={sortAsc}
                        onSort={handleSort}

                        getRowAccent={(row) => STAGE_ACCENT[row.stage] || STAGE_ACCENT[row.status] || 'border-s-gray-300'}
                        onRowClick={handleRowClick}
                        getRowKey={(row) => row.id}

                        isLoading={isLoading}

                        emptyIcon={<FileText className="w-12 h-12 text-gray-300" />}
                        emptyMessage={isRTL ? 'لا توجد مستندات مبيعات' : 'No sales documents found'}

                        showFooter={true}
                        footerLeftText={
                            isRTL
                                ? `عرض ${displayDocuments.length} مستند`
                                : `Showing ${displayDocuments.length} documents`
                        }
                        footerRightContent={
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300" dir="ltr">
                                    {isRTL ? 'الإجمالي: ' : 'Total: '}
                                    {fmtAmount(displayTotal)}
                                    <span className="text-gray-400 ms-1 text-xs">{activeCurrency}</span>
                                </span>
                            </div>
                        }

                        renderActions={(row) => (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                                        disabled={isPosting}
                                    >
                                        {isPosting ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <MoreHorizontal className="h-4 w-4 text-gray-400" />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[180px]">
                                    <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleRowClick(row)} className="gap-2 cursor-pointer">
                                        <Eye className="w-4 h-4" /> {isRTL ? 'عرض التفاصيل' : 'View Details'}
                                    </DropdownMenuItem>
                                    {row.type === 'invoice' && !['posted', 'cancelled'].includes(row.status) && (
                                        <DropdownMenuItem
                                            onClick={() => postSalesInvoice(row.id)}
                                            className="gap-2 cursor-pointer text-green-700 focus:text-green-800 focus:bg-green-50"
                                            disabled={isPosting}
                                        >
                                            <Send className="w-4 h-4" /> {isRTL ? 'ترحيل الفاتورة' : 'Post Invoice'}
                                        </DropdownMenuItem>
                                    )}
                                    {row.type === 'return' && !['posted', 'cancelled'].includes(row.status) && (
                                        <DropdownMenuItem
                                            onClick={() => postSalesReturn(row.id)}
                                            className="gap-2 cursor-pointer text-orange-700 focus:text-orange-800 focus:bg-orange-50"
                                            disabled={isPosting}
                                        >
                                            <RotateCcw className="w-4 h-4" /> {isRTL ? 'ترحيل المرتجع' : 'Post Return'}
                                        </DropdownMenuItem>
                                    )}
                                    {row.type === 'quotation' && !['converted', 'cancelled'].includes(row.status) && (
                                        <DropdownMenuItem
                                            onClick={() => convertQuotation(row.id, 'sales')}
                                            className="gap-2 cursor-pointer text-purple-700 focus:text-purple-800 focus:bg-purple-50"
                                            disabled={isPosting}
                                        >
                                            <ArrowLeftRight className="w-4 h-4" /> {isRTL ? 'تحويل إلى أمر بيع' : 'Convert to Order'}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

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
                            currency={activeCurrency}
                            isLoading={isLoading}
                            emptyText={isRTL ? 'لا توجد مستندات' : 'No documents'}
                            getItemValue={(content) => Number(content.total_amount || 0)}
                            renderCard={(doc, _colId) => {
                                const stageStyle = STAGE_STYLES[doc.stage] || STAGE_STYLES[doc.status] || STAGE_STYLES.draft;
                                return (
                                    <div
                                        className="p-3.5 space-y-2.5 cursor-pointer"
                                        onClick={() => handleRowClick(doc as any)}
                                    >
                                        {/* Header: Doc # + Status */}
                                        <div className="flex justify-between items-start">
                                            <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                                {doc.document_number || '-'}
                                            </span>
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                                                stageStyle.bg, stageStyle.text
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", stageStyle.dot)} />
                                                {isRTL ? stageStyle.labelAr : stageStyle.labelEn}
                                            </span>
                                        </div>

                                        {/* Customer Name */}
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1" title={doc.customer_name_display || doc.customer_name}>
                                            {doc.customer_name_display || doc.customer_name || (isRTL ? 'عميل غير محدد' : 'Unknown Client')}
                                        </p>

                                        {/* Footer: Date + Value */}
                                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {doc.created_at ? formatDistanceToNow(new Date(doc.created_at), {
                                                    addSuffix: true,
                                                    locale: isRTL ? arLocale : undefined
                                                }) : '-'}
                                            </span>
                                            <span className="font-mono text-sm font-bold text-erp-navy">
                                                {fmtAmount(Number(doc.total_amount || 0))}{' '}
                                                <span className="text-[10px] text-gray-400">{doc.currency || activeCurrency}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                            onCardMove={(itemId, fromColumn, toColumn) => {
                                console.log(`Move ${itemId} from ${fromColumn} to ${toColumn}`);
                                toast.info(
                                    isRTL
                                        ? `تم نقل المستند من "${kanbanColumns.find(c => c.id === fromColumn)?.title}" إلى "${kanbanColumns.find(c => c.id === toColumn)?.title}"`
                                        : `Document moved from "${fromColumn}" to "${toColumn}"`
                                );
                            }}
                        />
                    </div>
                )}

                {isSheetOpen && (
                    <UnifiedTradeSheet
                        open={isSheetOpen}
                        onOpenChange={handleSheetClose}
                        mode="sales"
                        type="invoice"
                        initialData={docMode === 'create'
                            ? { type: newDocType, status: 'draft', stage: 'draft', currency: activeCurrency, date: new Date().toISOString() }
                            : selectedDoc ? {
                                ...selectedDoc,
                                ...selectedDoc._rawData,
                                items: parseDocumentItems(selectedDoc),
                                type: selectedDoc.type,
                            } : selectedDoc
                        }
                        onSave={docMode === 'create' ? handleCreateSave : (selectedDoc?.id ? handleDocumentSave : undefined)}
                        companyId={companyId}
                        currentStage={selectedDoc?.stage || (docMode === 'create' ? 'draft' : undefined)}
                        onStageAdvance={selectedDoc?.id ? async (targetStage: string, notes?: string) => {
                            try {
                                const { data: { user } } = await supabase.auth.getUser();
                                const result = await salesTransactionService.advanceStage({
                                    transaction_id: selectedDoc.id,
                                    transaction_type: 'sale',
                                    new_stage: targetStage,
                                    user_id: user?.id || '',
                                    user_name: user?.user_metadata?.full_name || user?.email || '',
                                    notes,
                                });
                                if (!result.success) {
                                    toast.error(isRTL ? `خطأ في التحويل: ${result.error}` : `Stage error: ${result.error}`);
                                    return;
                                }
                                toast.success(isRTL ? `تم التحويل إلى ${targetStage} ✅` : `Advanced to ${targetStage} ✅`);
                                queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
                                setIsSheetOpen(false);
                                setSelectedDoc(null);
                            } catch (err: any) {
                                toast.error(isRTL ? `خطأ: ${err.message}` : `Error: ${err.message}`);
                            }
                        } : undefined}
                        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] })}
                    />
                )}
            </div>
        </div >
    );
}
