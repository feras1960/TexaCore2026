/**
 * PipelineBoard — سير المبيعات CRM (Kanban)
 *
 * ✅ NexaKanbanBoard مع Drag & Drop
 * ✅ يعرض فقط الجهات/العملاء الذين لديهم مستندات تجارية
 * ✅ أعمدة: عرض سعر → حجز → أمر بيع → تسليم → فاتورة → مكتمل
 * ✅ بطاقات إحصائية + فلاتر + عرض جدولي/كانبان
 * ✅ دعم 9 لغات + RTL
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { NexaKanbanBoard, type KanbanItem, type KanbanColumnDef } from '@/components/ui/nexa-kanban';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
    TrendingUp, LayoutGrid, List, FileText, ShoppingCart,
    Truck, Receipt, CheckCircle2, Package, DollarSign,
    Users, Phone, Mail, Building2, Globe, MessageSquare,
    Clock, ArrowRight, Sparkles, Star, Plus, MoreVertical,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfDay, subMonths } from 'date-fns';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import type { SheetMode } from '@/features/accounting/components/unified/types';
import { getContactName, type Contact } from '@/services/contactsService';
import { useCompanyCurrencies } from '@/hooks/useCompanyCurrencies';

// Stage → Trade document type mapping
const STAGE_TO_TRADE_TYPE: Record<string, string> = {
    quotation: 'quotation',
    reservation: 'reservation',
    order: 'order',
    delivery: 'delivery',
    invoice: 'invoice',
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
    quotation: { ar: 'عرض سعر', en: 'Quotation' },
    reservation: { ar: 'حجز', en: 'Reservation' },
    order: { ar: 'أمر بيع', en: 'Sales Order' },
    delivery: { ar: 'إذن تسليم', en: 'Delivery Note' },
    invoice: { ar: 'فاتورة', en: 'Invoice' },
};

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════
interface PipelineDeal {
    id: string;
    stage: PipelineStage;
    // Contact/Customer info
    contact_id?: string;
    customer_id?: string;
    entity_name: string;
    entity_type: 'contact' | 'customer';
    organization?: string;
    phone?: string;
    email?: string;
    source?: string;
    // Deal info
    total_value: number;
    currency: string;
    document_count: number;
    latest_document_number?: string;
    latest_document_date?: string;
    latest_document_type?: string;
    // Tracking
    created_at: string;
    last_activity_at?: string;
}

type PipelineStage = 'quotation' | 'reservation' | 'order' | 'delivery' | 'invoice' | 'completed';

// Source icons mapping
const SOURCE_ICONS: Record<string, React.ElementType> = {
    phone_inbound: Phone, phone_outbound: Phone,
    google_ads: Globe, facebook_ads: Globe, instagram_ads: Globe,
    website: Globe, telegram: MessageSquare, whatsapp: MessageSquare,
    referral: Users, walk_in: Users, exhibition: Users,
    email_campaign: Mail, manual: Users, online_store: Globe,
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════
export default function PipelineBoard() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const { baseCurrency, supportedCurrencies } = useCompanyCurrencies();
    const queryClient = useQueryClient();
    const isRTL = direction === 'rtl';

    // State
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 3),
        to: new Date(),
    });
    const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
    const [showSheet, setShowSheet] = useState(false);
    const [sheetMode, setSheetMode] = useState<SheetMode>('view');

    // Trade document creation state
    const [showTradeSheet, setShowTradeSheet] = useState(false);
    const [tradeDocType, setTradeDocType] = useState<string>('quotation');
    const [tradeInitialData, setTradeInitialData] = useState<any>(null);

    // Currency selection with persistence
    const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
        try {
            return localStorage.getItem('crm_pipeline_currency') || '';
        } catch { return ''; }
    });
    const activeCurrency = selectedCurrency || baseCurrency;

    const handleCurrencyChange = useCallback((currency: string) => {
        setSelectedCurrency(currency);
        try { localStorage.setItem('crm_pipeline_currency', currency); } catch { }
    }, []);

    // ─── Fetch sales documents grouped by contact/customer ───
    const { data: pipelineDeals = [], isPending: _isPending } = useCachedQuery({
        queryKey: ['crm_pipeline_deals', companyId, dateRange?.from?.toISOString()?.split('T')[0], dateRange?.to?.toISOString()?.split('T')[0]],
        queryFn: async () => {
            if (!companyId) return [];

            const fromISO = dateRange?.from ? dateRange.from.toISOString() : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

            // Safe fetch — never throws, returns [] on error
            const fetchTable = async (table: string, type: string, dateCol: string, numCol: string, amountCol?: string) => {
                try {
                    let q = supabase
                        .from(table).select('*')
                        .eq('company_id', companyId)
                        .order(dateCol, { ascending: false });
                    if (fromISO) q = q.gte(dateCol, fromISO);
                    if (toISO) q = q.lte(dateCol, toISO);
                    const { data, error } = await q;
                    if (error) {
                        console.warn(`[Pipeline] ${table} query failed:`, error.message);
                        return [];
                    }
                    return (data || []).map((item: any) => ({
                        ...item,
                        _type: type,
                        _date: item[dateCol],
                        _number: item[numCol] || item.id?.substring(0, 8),
                        _amount: amountCol ? Number(item[amountCol] || 0) : 0,
                    }));
                } catch (e) {
                    console.warn(`[Pipeline] ${table} fetch error:`, e);
                    return [];
                }
            };

            // Each fetch is independent — failure of one doesn't affect others
            const results = await Promise.allSettled([
                fetchTable('quotations', 'quotation', 'quotation_date', 'quotation_number', 'total_amount'),
                fetchTable('sales_orders', 'order', 'order_date', 'order_number', 'total_amount'),
                fetchTable('sales_deliveries', 'delivery', 'delivery_date', 'delivery_number', undefined),
                fetchTable('sales_transactions', 'invoice', 'doc_date', 'invoice_no', 'total_amount'),
            ]);
            const [quotations, orders, deliveries, invoices] = results.map(r =>
                r.status === 'fulfilled' ? r.value : []
            );

            // Fetch contacts & customers — also safe
            let contacts: any[] = [];
            let customers: any[] = [];
            try {
                const { data: c, error: ce } = await supabase.from('contacts').select('*').eq('company_id', companyId);
                if (!ce) contacts = c || [];
                else console.warn('[Pipeline] contacts query failed:', ce.message);
            } catch (e) { console.warn('[Pipeline] contacts fetch error:', e); }

            try {
                const { data: cu, error: cue } = await supabase.from('customers').select('*').eq('company_id', companyId);
                if (!cue) customers = cu || [];
                else console.warn('[Pipeline] customers query failed:', cue.message);
            } catch (e) { console.warn('[Pipeline] customers fetch error:', e); }

            const contactsMap = new Map(contacts.map((c: any) => [c.id, c]));
            const customersMap = new Map(customers.map((c: any) => [c.id, c]));

            // Group all documents by customer_id (or contact_id)
            const allDocs = [...quotations, ...orders, ...deliveries, ...invoices];
            const grouped = new Map<string, { docs: any[]; entityType: 'contact' | 'customer'; entityId: string }>();

            for (const doc of allDocs) {
                // Try contact_id first, then customer_id
                const key = doc.contact_id || doc.customer_id || 'unknown';
                if (key === 'unknown') continue;

                if (!grouped.has(key)) {
                    grouped.set(key, {
                        docs: [],
                        entityType: doc.contact_id && contactsMap.has(doc.contact_id) ? 'contact' : 'customer',
                        entityId: key,
                    });
                }
                grouped.get(key)!.docs.push(doc);
            }

            // Determine pipeline stage based on latest document type
            const getStage = (docs: any[]): PipelineStage => {
                const types = new Set(docs.map((d: any) => d._type));
                // Check from most advanced to least
                if (docs.some((d: any) => d._type === 'invoice' && ['posted', 'paid'].includes(d.status || d.stage))) return 'completed';
                if (types.has('invoice')) return 'invoice';
                if (types.has('delivery')) return 'delivery';
                if (types.has('order')) return 'order';
                if (types.has('reservation')) return 'reservation';
                return 'quotation';
            };

            // Build pipeline deals
            const deals: PipelineDeal[] = [];

            for (const [key, group] of grouped) {
                const { docs, entityType, entityId } = group;
                const sortedDocs = docs.sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
                const latestDoc = sortedDocs[0];

                // Get entity info
                let entityName = '';
                let organization = '';
                let phone = '';
                let email = '';
                let source = '';

                if (entityType === 'contact' && contactsMap.has(entityId)) {
                    const contact = contactsMap.get(entityId)!;
                    entityName = getContactName(contact as any, language);
                    organization = contact.organization || '';
                    phone = contact.phone || contact.mobile || '';
                    email = contact.email || '';
                    source = contact.source || '';
                } else if (customersMap.has(entityId)) {
                    const customer = customersMap.get(entityId)!;
                    entityName = language === 'ar' ? (customer.name_ar || customer.name_en) : (customer.name_en || customer.name_ar);
                    organization = customer.organization || '';
                    phone = customer.phone || '';
                    email = customer.email || '';
                }

                if (!entityName) entityName = isRTL ? 'عميل غير محدد' : 'Unknown';

                const totalValue = sortedDocs.reduce((sum, d) => sum + (d._amount || 0), 0);

                deals.push({
                    id: `deal-${key}`,
                    stage: getStage(docs),
                    contact_id: entityType === 'contact' ? entityId : undefined,
                    customer_id: entityType === 'customer' ? entityId : undefined,
                    entity_name: entityName,
                    entity_type: entityType,
                    organization,
                    phone,
                    email,
                    source,
                    total_value: totalValue,
                    currency: latestDoc.currency || baseCurrency,
                    document_count: docs.length,
                    latest_document_number: latestDoc._number,
                    latest_document_date: latestDoc._date,
                    latest_document_type: latestDoc._type,
                    created_at: sortedDocs[sortedDocs.length - 1]._date,
                    last_activity_at: latestDoc._date,
                });
            }

            return deals.sort((a, b) => b.total_value - a.total_value);
        },
        enabled: !!companyId,
    });

    // ⚡ CACHE-FIRST: Don't show kanban skeletons during auth init
    const isLoading = !!companyId && _isPending;

    // ─── Column definitions ───
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'quotation',
            title: isRTL ? 'عروض الأسعار' : 'Quotations',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/30 dark:bg-purple-950/20',
            accentHex: '#9333ea',
            icon: <FileText className="w-4 h-4 text-purple-500" />,
        },
        {
            id: 'reservation',
            title: isRTL ? 'الحجوزات' : 'Reservations',
            color: 'border-cyan-500',
            bgColor: 'bg-cyan-50/30 dark:bg-cyan-950/20',
            accentHex: '#0891b2',
            icon: <Package className="w-4 h-4 text-cyan-500" />,
        },
        {
            id: 'order',
            title: isRTL ? 'أوامر البيع' : 'Sales Orders',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/30 dark:bg-blue-950/20',
            accentHex: '#2563eb',
            icon: <ShoppingCart className="w-4 h-4 text-blue-500" />,
        },
        {
            id: 'delivery',
            title: isRTL ? 'التسليم' : 'Deliveries',
            color: 'border-orange-500',
            bgColor: 'bg-orange-50/30 dark:bg-orange-950/20',
            accentHex: '#ea580c',
            icon: <Truck className="w-4 h-4 text-orange-500" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'الفوترة' : 'Invoiced',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/30 dark:bg-indigo-950/20',
            accentHex: '#4f46e5',
            icon: <Receipt className="w-4 h-4 text-indigo-500" />,
        },
        {
            id: 'completed',
            title: isRTL ? 'مكتمل' : 'Completed',
            color: 'border-emerald-500',
            bgColor: 'bg-emerald-50/30 dark:bg-emerald-950/20',
            accentHex: '#059669',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
            locked: true,
        },
    ], [isRTL]);

    // ─── Kanban items ───
    const kanbanItems: KanbanItem[] = useMemo(() =>
        pipelineDeals.map(deal => ({
            id: deal.id,
            columnId: deal.stage,
            content: deal as Record<string, any>,
        })),
        [pipelineDeals]
    );

    // ─── Stats ───
    const stats = useMemo(() => {
        const totalValue = pipelineDeals.reduce((sum, d) => sum + d.total_value, 0);
        const activeDeals = pipelineDeals.filter(d => d.stage !== 'completed').length;
        const completedDeals = pipelineDeals.filter(d => d.stage === 'completed').length;
        const conversionRate = pipelineDeals.length > 0
            ? Math.round((completedDeals / pipelineDeals.length) * 100) : 0;
        const currency = pipelineDeals[0]?.currency || baseCurrency;
        return { totalValue, activeDeals, completedDeals, conversionRate, total: pipelineDeals.length, currency };
    }, [pipelineDeals]);

    // ─── Handlers ───
    const handleDealClick = useCallback((deal: PipelineDeal) => {
        if (deal.contact_id) {
            setSelectedDeal(deal);
            setSheetMode('view');
            setShowSheet(true);
        } else {
            toast.info(isRTL ? 'هذا عميل — يمكنك مشاهدته من وحدة العملاء' : 'This is a customer — view from Customers module');
        }
    }, [isRTL]);

    // Create a trade document for a specific deal
    const handleCreateDocument = useCallback((deal: PipelineDeal, docType: string) => {
        setTradeDocType(docType);
        setTradeInitialData({
            customer_id: deal.customer_id || undefined,
            contact_id: deal.contact_id || undefined,
            customer_name: deal.entity_name,
            status: 'draft',
            currency: deal.currency || baseCurrency,
            date: new Date().toISOString(),
        });
        setShowTradeSheet(true);
    }, []);

    // Drag & Drop → Convert document type (Pipeline Stage Transition)
    const STAGE_ORDER: PipelineStage[] = ['quotation', 'reservation', 'order', 'delivery', 'invoice', 'completed'];

    const handleCardMove = useCallback((itemId: string, fromColumn: string, toColumn: string) => {
        if (toColumn === 'completed') {
            toast.info(isRTL ? 'لا يمكن النقل مباشرة إلى مكتمل' : 'Cannot move directly to Completed');
            return;
        }

        const deal = pipelineDeals.find(d => d.id === itemId);
        if (!deal) return;

        // Validate flow direction (can only move forward in pipeline)
        const fromIdx = STAGE_ORDER.indexOf(fromColumn as PipelineStage);
        const toIdx = STAGE_ORDER.indexOf(toColumn as PipelineStage);

        if (toIdx <= fromIdx) {
            toast.error(
                isRTL ? 'لا يمكن الرجوع للخلف في المسار — أنشئ مستنداً جديداً' : 'Cannot move backwards — create a new document instead'
            );
            return;
        }

        // Delivery requires an existing order
        if (toColumn === 'delivery' && fromColumn !== 'order') {
            toast.error(
                isRTL ? 'إذن التسليم يتطلب أمر بيع أولاً' : 'Delivery Note requires a Sales Order first'
            );
            return;
        }

        // Invoice requires delivery
        if (toColumn === 'invoice' && fromColumn !== 'delivery') {
            toast.error(
                isRTL ? 'الفاتورة تُنشأ تلقائياً عند تنفيذ إذن التسليم' : 'Invoice is auto-generated when Delivery is executed'
            );
            return;
        }

        const targetType = STAGE_TO_TRADE_TYPE[toColumn];
        if (!targetType) return;

        const fromLabel = STAGE_LABELS[fromColumn];
        const toLabel = STAGE_LABELS[toColumn];
        toast.success(
            isRTL
                ? `تحويل من ${fromLabel?.ar} ← ${toLabel?.ar}...`
                : `Converting ${fromLabel?.en} → ${toLabel?.en}...`,
            { duration: 2000 }
        );

        // Open the trade sheet with the TARGET type, carrying over deal data
        handleCreateDocument(deal, targetType);
    }, [pipelineDeals, isRTL, handleCreateDocument]);

    // ─── Table columns ───
    const tableColumns = useMemo(() => [
        {
            accessorKey: 'entity_name',
            header: isRTL ? 'العميل / جهة الاتصال' : 'Customer / Contact',
            cell: (info: any) => {
                const deal = info.row.original as PipelineDeal;
                const SourceIcon = deal.source ? (SOURCE_ICONS[deal.source] || Globe) : Users;
                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${deal.entity_type === 'contact'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            }`}>
                            {deal.entity_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-erp-navy dark:text-white truncate">
                                {deal.entity_name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                {deal.organization && (
                                    <span className="flex items-center gap-1 truncate">
                                        <Building2 className="w-3 h-3 shrink-0" /> {deal.organization}
                                    </span>
                                )}
                                {deal.source && (
                                    <span className="flex items-center gap-1">
                                        <SourceIcon className="w-3 h-3 shrink-0" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
            size: 260,
        },
        {
            accessorKey: 'stage',
            header: isRTL ? 'المرحلة' : 'Stage',
            cell: (info: any) => {
                const stage = info.getValue() as string;
                const col = kanbanColumns.find(c => c.id === stage);
                return col ? (
                    <Badge variant="outline" className={`${col.bgColor} border-0 gap-1 text-xs font-medium px-2 py-0.5`}
                        style={{ color: col.accentHex }}>
                        {col.icon} {col.title}
                    </Badge>
                ) : stage;
            },
            size: 160,
        },
        {
            accessorKey: 'total_value',
            header: isRTL ? 'القيمة الإجمالية' : 'Total Value',
            cell: (info: any) => {
                const deal = info.row.original as PipelineDeal;
                return (
                    <span className="font-mono font-bold text-erp-navy dark:text-white">
                        {deal.total_value.toLocaleString()}
                        <span className="text-xs text-gray-400 ms-1">{deal.currency}</span>
                    </span>
                );
            },
            size: 140,
        },
        {
            accessorKey: 'document_count',
            header: isRTL ? 'المستندات' : 'Documents',
            cell: (info: any) => (
                <span className="font-mono text-sm text-gray-600">{info.getValue()}</span>
            ),
            size: 100,
        },
        {
            accessorKey: 'latest_document_number',
            header: isRTL ? 'آخر مستند' : 'Latest Doc',
            cell: (info: any) => {
                const deal = info.row.original as PipelineDeal;
                return (
                    <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-indigo-600">{deal.latest_document_number}</span>
                        <span className="text-[10px] text-gray-400">{deal.latest_document_type}</span>
                    </div>
                );
            },
            size: 120,
        },
        {
            accessorKey: 'last_activity_at',
            header: isRTL ? 'آخر نشاط' : 'Last Activity',
            cell: (info: any) => {
                const date = info.getValue() as string;
                if (!date) return <span className="text-gray-300">—</span>;
                const d = new Date(date);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                let label: string;
                if (diffDays === 0) label = isRTL ? 'اليوم' : 'Today';
                else if (diffDays === 1) label = isRTL ? 'أمس' : 'Yesterday';
                else if (diffDays < 7) label = isRTL ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
                else label = d.toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' });
                return (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" /> {label}
                    </div>
                );
            },
            size: 120,
        },
    ], [isRTL, kanbanColumns, language]);

    // ─── Relative time helper ───
    const getRelativeTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return isRTL ? 'اليوم' : 'Today';
        if (diffDays === 1) return isRTL ? 'أمس' : 'Yesterday';
        if (diffDays < 7) return isRTL ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
        return d.toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' });
    };

    // Quick create a new trade doc (no customer pre-selected)
    const handleQuickCreate = useCallback((docType: string) => {
        setTradeDocType(docType);
        setTradeInitialData({
            status: 'draft',
            currency: activeCurrency,
            date: new Date().toISOString(),
        });
        setShowTradeSheet(true);
    }, [activeCurrency]);

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-erp-navy dark:text-white">
                        <TrendingUp className="w-7 h-7 text-indigo-600" />
                        {t('crm.pipeline') || (isRTL ? 'سير المبيعات' : 'Sales Pipeline')}
                        <Badge variant="secondary" className="ms-2 text-xs">{stats.total}</Badge>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {isRTL
                            ? 'تتبع العملاء والجهات الذين لديهم مستندات تجارية'
                            : 'Track contacts & customers with active sales documents'}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* ── Quick Create Split Button ── */}
                    <div className="flex">
                        <Button
                            onClick={() => handleQuickCreate('quotation')}
                            className="rounded-e-none gap-2 px-4 h-9 text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            {isRTL ? 'عرض سعر' : 'Quotation'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="border-s border-white/20 rounded-s-none px-2 h-9 text-white bg-indigo-600 hover:bg-indigo-700">
                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                    {isRTL ? 'إنشاء مستند جديد' : 'Create New Document'}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleQuickCreate('quotation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-purple-100 rounded text-purple-600"><FileText className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'عرض سعر' : 'Quotation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickCreate('reservation')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-cyan-100 rounded text-cyan-600"><Package className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'حجز بضائع' : 'Reservation'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickCreate('order')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-blue-100 rounded text-blue-600"><ShoppingCart className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'أمر بيع' : 'Sales Order'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickCreate('delivery')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-orange-100 rounded text-orange-600"><Truck className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'إذن تسليم' : 'Delivery Note'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickCreate('invoice')} className="gap-2 cursor-pointer py-2.5">
                                    <div className="p-1 bg-indigo-100 rounded text-indigo-600"><Receipt className="w-3.5 h-3.5" /></div>
                                    <span className="font-medium text-sm">{isRTL ? 'فاتورة مبيعات' : 'Sales Invoice'}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Date Range */}
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-[230px]"
                        align={isRTL ? 'end' : 'start'}
                    />

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

                    {/* View Switcher */}
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-gray-200/50">
                        <Button variant="ghost" size="sm"
                            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-erp-navy dark:bg-gray-800 dark:text-white' : 'text-gray-500'}`}
                            onClick={() => setViewMode('kanban')}>
                            <LayoutGrid className="w-4 h-4" />
                            Kanban
                        </Button>
                        <Button variant="ghost" size="sm"
                            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-erp-navy dark:bg-gray-800 dark:text-white' : 'text-gray-500'}`}
                            onClick={() => setViewMode('list')}>
                            <List className="w-4 h-4" />
                            {isRTL ? 'جدول' : 'List'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">
                                {stats.totalValue.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                                {isRTL ? `قيمة Pipeline (${activeCurrency})` : `Pipeline Value (${activeCurrency})`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-erp-navy dark:text-white">{stats.activeDeals}</p>
                            <p className="text-xs text-gray-500">{isRTL ? 'صفقات نشطة' : 'Active Deals'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-erp-navy dark:text-white">{stats.completedDeals}</p>
                            <p className="text-xs text-gray-500">{isRTL ? 'مكتمل' : 'Completed'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-erp-navy dark:text-white">{stats.conversionRate}%</p>
                            <p className="text-xs text-gray-500">{isRTL ? 'معدل التحويل' : 'Conversion Rate'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Content ─── */}
            {viewMode === 'kanban' ? (
                <div
                    className="overflow-hidden rounded-xl border bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 shadow-sm"
                    dir={direction}
                    style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}
                >
                    <NexaKanbanBoard
                        columns={kanbanColumns}
                        items={kanbanItems}
                        direction={direction}
                        currency={activeCurrency}
                        isLoading={isLoading}
                        emptyText={isRTL ? 'لا توجد صفقات' : 'No deals'}
                        getItemValue={(content) => Number(content.total_value || 0)}
                        onCardMove={handleCardMove}
                        renderCard={(deal, colId) => {
                            const d = deal as unknown as PipelineDeal;
                            const SourceIcon = d.source ? (SOURCE_ICONS[d.source] || Globe) : null;

                            // Determine next stage for quick-action button
                            const stageOrder: PipelineStage[] = ['quotation', 'reservation', 'order', 'delivery', 'invoice', 'completed'];
                            const currentIdx = stageOrder.indexOf(d.stage);
                            const nextStage = currentIdx < stageOrder.length - 2 ? stageOrder[currentIdx + 1] : null;
                            const nextLabel = nextStage ? STAGE_LABELS[nextStage] : null;

                            return (
                                <div className="p-3.5 space-y-2.5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    {/* Header: Name + Actions Menu */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div
                                            className="flex items-center gap-2 min-w-0 flex-1"
                                            onClick={() => handleDealClick(d)}
                                        >
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${d.entity_type === 'contact'
                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                }`}>
                                                {d.entity_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                                                {d.entity_name}
                                            </span>
                                        </div>

                                        {/* Quick Actions Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-60 hover:opacity-100"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-52">
                                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                                    {isRTL ? 'إنشاء مستند' : 'Create Document'}
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); handleCreateDocument(d, 'quotation'); }}
                                                    className="gap-2 cursor-pointer py-2"
                                                >
                                                    <div className="p-1 bg-purple-100 rounded"><FileText className="w-3.5 h-3.5 text-purple-600" /></div>
                                                    <span className="text-sm">{isRTL ? 'عرض سعر' : 'Quotation'}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); handleCreateDocument(d, 'order'); }}
                                                    className="gap-2 cursor-pointer py-2"
                                                >
                                                    <div className="p-1 bg-blue-100 rounded"><ShoppingCart className="w-3.5 h-3.5 text-blue-600" /></div>
                                                    <span className="text-sm">{isRTL ? 'أمر بيع' : 'Sales Order'}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); handleCreateDocument(d, 'delivery'); }}
                                                    className="gap-2 cursor-pointer py-2"
                                                >
                                                    <div className="p-1 bg-orange-100 rounded"><Truck className="w-3.5 h-3.5 text-orange-600" /></div>
                                                    <span className="text-sm">{isRTL ? 'إذن تسليم' : 'Delivery Note'}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); handleCreateDocument(d, 'invoice'); }}
                                                    className="gap-2 cursor-pointer py-2"
                                                >
                                                    <div className="p-1 bg-indigo-100 rounded"><Receipt className="w-3.5 h-3.5 text-indigo-600" /></div>
                                                    <span className="text-sm">{isRTL ? 'فاتورة' : 'Invoice'}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); handleDealClick(d); }}
                                                    className="gap-2 cursor-pointer py-2"
                                                >
                                                    <div className="p-1 bg-gray-100 rounded"><Users className="w-3.5 h-3.5 text-gray-600" /></div>
                                                    <span className="text-sm">{isRTL ? 'عرض جهة الاتصال' : 'View Contact'}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Organization + Entity Badge */}
                                    <div className="flex items-center justify-between" onClick={() => handleDealClick(d)}>
                                        {d.organization ? (
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                                                <Building2 className="w-3 h-3 shrink-0" /> {d.organization}
                                            </p>
                                        ) : <span />}
                                        <Badge variant="outline" className={`shrink-0 text-[10px] h-5 px-1.5 ${d.entity_type === 'contact'
                                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40'
                                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40'
                                            }`}>
                                            {d.entity_type === 'contact'
                                                ? (isRTL ? 'جهة' : 'Contact')
                                                : (isRTL ? 'عميل' : 'Customer')}
                                        </Badge>
                                    </div>

                                    {/* Source + Contact Info */}
                                    <div className="flex items-center gap-2 flex-wrap" onClick={() => handleDealClick(d)}>
                                        {SourceIcon && (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                <SourceIcon className="w-3 h-3" />
                                            </span>
                                        )}
                                        {d.phone && (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                <Phone className="w-3 h-3 text-green-500" />
                                                <span dir="ltr">{d.phone}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer: Value + Docs + Date */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100/80" onClick={() => handleDealClick(d)}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-erp-navy dark:text-white">
                                                {d.total_value.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{d.currency}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <span className="flex items-center gap-0.5">
                                                <FileText className="w-3 h-3" /> {d.document_count}
                                            </span>
                                            {d.last_activity_at && (
                                                <span className="flex items-center gap-0.5">
                                                    <Clock className="w-3 h-3" /> {getRelativeTime(d.last_activity_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Action: Create Next Document */}
                                    {nextStage && nextLabel && d.stage !== 'completed' && (
                                        <button
                                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium
                                                       bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400
                                                       transition-colors border border-indigo-100 dark:border-indigo-900/50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreateDocument(d, STAGE_TO_TRADE_TYPE[nextStage]!);
                                            }}
                                        >
                                            <Plus className="w-3 h-3" />
                                            <ArrowRight className="w-3 h-3" />
                                            {isRTL ? nextLabel.ar : nextLabel.en}
                                        </button>
                                    )}
                                </div>
                            );
                        }}
                    />
                </div>
            ) : (
                /* ─── List View ─── */
                <div className="flex-1 min-h-0 border rounded-lg bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    <NexaDataTable
                        data={pipelineDeals}
                        columns={tableColumns}
                        onRowClick={(row: any) => handleDealClick(row)}
                        enableSearch
                        searchPlaceholder={isRTL ? 'بحث عن عميل أو جهة اتصال...' : 'Search deals...'}
                        enablePagination
                        pageSize={25}
                        persistKey="crm_pipeline_board"
                    />
                </div>
            )}

            {/* ─── Contact Sheet ─── */}
            {showSheet && selectedDeal?.contact_id && (
                <UnifiedAccountingSheet
                    isOpen={showSheet}
                    onClose={() => { setShowSheet(false); setSelectedDeal(null); }}
                    docType="contact"
                    mode={sheetMode}
                    data={{ id: selectedDeal.contact_id }}
                    documentId={selectedDeal.contact_id}
                    companyId={companyId}
                    onRefresh={() => {
                        queryClient.invalidateQueries({ queryKey: ['crm_pipeline_deals'] });
                    }}
                    onModeChange={(mode) => setSheetMode(mode as SheetMode)}
                />
            )}

            {/* ─── Trade Document Sheet (Create Quotation/Order/Invoice/etc.) ─── */}
            {showTradeSheet && (
                <UnifiedTradeSheet
                    open={showTradeSheet}
                    onOpenChange={(open) => {
                        setShowTradeSheet(open);
                        if (!open) {
                            setTradeInitialData(null);
                            // Refresh pipeline after creating a document
                            queryClient.invalidateQueries({ queryKey: ['crm_pipeline_deals'] });
                        }
                    }}
                    mode="sales"
                    type={tradeDocType as any}
                    initialData={tradeInitialData}
                />
            )}
        </div>
    );
}
