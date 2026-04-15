/**
 * ════════════════════════════════════════════════════════════════
 * 🚢 ContainersList — قائمة الكونتينرات (إدارة الحاويات)
 * ════════════════════════════════════════════════════════════════
 *
 * Pattern:
 *   View mode switcher: List (NexaListTable) ↔ Kanban
 *   Status tabs: الكل | تم الطلب | في البحر | في الميناء | تم التخليص | مستلم
 *   Premium design matching SuppliersList & PaymentsList
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol } from '@/hooks/useCompanyCurrency';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { MaterialReceiptDialog } from '@/features/warehouse/components/MaterialReceiptDialog';
import {
    ContainerStatusBadge,
    getStatusDef,
    CONTAINER_STATUSES,
} from '@/features/trade/components/ContainerStatusStepper';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import {
    Ship,
    Plus,
    LayoutGrid,
    List,
    Anchor,
    PackageCheck,
    Truck,
    Clock,
    MoreHorizontal,
    Eye,
    Globe,
    ArrowRightLeft,
    FileText,
    Warehouse,
    ArrowDownToLine,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────
interface ContainerRow {
    id: string;
    container_number: string;
    container_name: string;
    shipment_number: string;
    shipping_company: string;
    vessel_name: string;
    status: string;
    container_size: string;
    container_type: string;
    eta: string | null;
    etd: string | null;
    port_of_loading: string;
    port_of_discharge: string;
    origin_country: string;
    total_purchase_value: number;
    total_landed_cost: number;
    total_cost: number;
    currency: string;
    supplier_id: string;
    created_at: string;
    order_date: string | null;
    arrival_date: string | null;
    // joined
    supplier?: { name_ar: string; name_en: string } | null;
    // computed
    supplier_display?: string;
    linked_invoices_count?: number;
    // variance
    variance_status?: string | null;
}

// ─── Progress helpers ────────────────────────────────────────
const STAGE_ORDER = ['draft', 'booked', 'loading', 'in_transit', 'at_port', 'customs', 'cleared', 'in_receiving', 'received', 'closed'];

function getStageProgress(status: string): { current: number; total: number; percent: number } {
    const idx = STAGE_ORDER.indexOf(status || 'draft');
    const current = idx >= 0 ? idx + 1 : 1;
    const total = STAGE_ORDER.length;
    return { current, total, percent: Math.round((current / total) * 100) };
}

function getStageColor(status: string): string {
    switch (status) {
        case 'received': case 'closed': return 'bg-green-500';
        case 'in_receiving': return 'bg-teal-500';
        case 'cleared': return 'bg-emerald-500';
        case 'customs': return 'bg-orange-500';
        case 'at_port': return 'bg-violet-500';
        case 'in_transit': return 'bg-blue-500';
        case 'loading': return 'bg-amber-500';
        case 'booked': return 'bg-sky-500';
        default: return 'bg-gray-400';
    }
}

function getDaysInfo(etaDate: string | null, t: (key: string, params?: any) => string): { text: string; color: string; isOverdue: boolean } | null {
    if (!etaDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eta = new Date(etaDate);
    eta.setHours(0, 0, 0, 0);
    const diff = differenceInDays(eta, today);
    if (diff > 0) {
        return {
            text: t('containers.daysRemaining', { n: diff }),
            color: diff <= 3 ? 'text-amber-600' : 'text-blue-600',
            isOverdue: false,
        };
    } else if (diff === 0) {
        return {
            text: t('containers.today'),
            color: 'text-emerald-600',
            isOverdue: false,
        };
    } else {
        return {
            text: t('containers.overdue', { n: Math.abs(diff) }),
            color: 'text-red-600',
            isOverdue: true,
        };
    }
}

// Status tab definitions
const STATUS_TABS = [
    { value: 'all', key: 'all' },
    { value: 'draft', key: 'draft' },
    { value: 'booked', key: 'booked' },
    { value: 'loading', key: 'loading' },
    { value: 'in_transit', key: 'in_transit' },
    { value: 'at_port', key: 'at_port' },
    { value: 'customs', key: 'customs' },
    { value: 'cleared', key: 'cleared' },
    { value: 'in_receiving', key: 'in_receiving' },
    { value: 'received', key: 'received' },
    { value: 'closed', key: 'closed' },
] as const;

// ═══════════════════════════════════════════════════════════════
export default function ContainersList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();

    // 🔄 Realtime
    useRealtimeInvalidation({
        table: 'containers',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['containers_list']],
    });
    // 🔄 Realtime — DSS: GRN changes should refresh container status badges
    useRealtimeInvalidation({
        table: 'purchase_receipts',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['containers_list']],
    });
    useRealtimeInvalidation({
        table: 'purchase_invoices',
        companyId,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        queryKeys: [['containers_list']],
    });

    // ─── State ───────────────────────────────────────────────────
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // Unified Sheet State
    const [isUnifiedSheetOpen, setIsUnifiedSheetOpen] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<any>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');

    // ✅ حالة MaterialReceiptDialog السريع
    const [receiptDialog, setReceiptDialog] = useState<{ open: boolean; containerId?: string }>({ open: false });

    // ─── Persist view mode preference ────────────────────────────
    const VIEW_PREF_KEY = 'containers-view';

    useEffect(() => {
        getTablePreferences(VIEW_PREF_KEY).then((prefs) => {
            if (prefs?.columnVisibility?.viewMode) {
                const saved = prefs.columnVisibility.viewMode as unknown as string;
                if (saved === 'kanban' || saved === 'list') {
                    setViewMode(saved);
                    if (saved === 'kanban') setStatusFilter('all');
                }
            }
        }).catch(() => { });
    }, []);

    const handleSetViewMode = useCallback((mode: 'list' | 'kanban') => {
        setViewMode(mode);
        if (mode === 'kanban') setStatusFilter('all');
        debouncedSavePreferences(VIEW_PREF_KEY, {
            columnVisibility: { viewMode: mode as any }
        }, 500);
    }, []);

    // ─── Fetch Containers ────────────────────────────────────────
    const containersQuery = useCachedQuery({
        queryKey: ['containers_list', companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('containers')
                .select('*')
                .eq('company_id', companyId!)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching containers:', error);
                return [];
            }

            // Fetch supplier names separately if supplier_id exists
            const supplierIds = [...new Set((data || []).map((c: any) => c.supplier_id).filter(Boolean))];
            let supplierMap: Record<string, { name_ar: string; name_en: string }> = {};
            if (supplierIds.length > 0) {
                const { data: suppliers } = await supabase
                    .from('suppliers')
                    .select('id, name_ar, name_en')
                    .in('id', supplierIds);
                (suppliers || []).forEach((s: any) => {
                    supplierMap[s.id] = { name_ar: s.name_ar, name_en: s.name_en };
                });
            }

            return (data || []).map((c: any) => {
                const sup = c.supplier_id ? supplierMap[c.supplier_id] : null;
                return {
                    ...c,
                    // Map DB column names → UI field names
                    eta: c.eta || c.expected_arrival_date || null,
                    etd: c.etd || c.departure_date || null,
                    port_of_loading: c.port_of_loading || c.origin_port || null,
                    port_of_discharge: c.port_of_discharge || c.destination_port || null,
                    supplier: sup || null,
                    supplier_display: sup
                        ? (language === 'ar'
                            ? (sup.name_ar || sup.name_en)
                            : (sup.name_en || sup.name_ar))
                        : '',
                };
            }) as ContainerRow[];
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // ⚡ CACHE-FIRST: Don't show skeletons when query is disabled (auth init)
    const containers = containersQuery.data ?? [];
    const isLoading = !!companyId && containersQuery.isLoading;

    // ─── Fetch linked invoice counts per container ───────────────
    const { data: invoiceCounts = {} } = useCachedQuery({
        queryKey: ['container_invoice_counts', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            // Count purchase_invoices linked to each container
            const { data, error } = await supabase
                .from('purchase_invoices')
                .select('container_id')
                .eq('company_id', companyId)
                .not('container_id', 'is', null);
            if (error) {
                console.warn('Could not fetch invoice counts:', error.message);
                return {};
            }
            const counts: Record<string, number> = {};
            (data || []).forEach((inv: any) => {
                if (inv.container_id) {
                    counts[inv.container_id] = (counts[inv.container_id] || 0) + 1;
                }
            });
            return counts;
        },
        enabled: !!companyId,
        staleTime: 60_000,
    });

    // ─── Fetch total tax per container (from actual posted expenses) ───
    const { data: containerTaxMap = {} } = useCachedQuery({
        queryKey: ['container_tax_totals', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data } = await supabase
                .from('container_expenses')
                .select('container_id, tax_amount')
                .not('vendor_account_id', 'is', null); // فقط الفعلية المرحّلة
            const map: Record<string, number> = {};
            (data || []).forEach((exp: any) => {
                if (exp.container_id && exp.tax_amount) {
                    map[exp.container_id] = (map[exp.container_id] || 0) + (exp.tax_amount || 0);
                }
            });
            return map;
        },
        enabled: !!companyId,
        staleTime: 60_000,
    });

    // ─── Status Counts ───────────────────────────────────────────
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: containers.length };
        containers.forEach(c => {
            const st = c.status || 'draft';
            counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [containers]);

    // Only show tabs that have data (plus 'all')
    const visibleTabs = useMemo(() => {
        return STATUS_TABS.filter(tab =>
            tab.value === 'all' || (statusCounts[tab.value] || 0) > 0
        );
    }, [statusCounts]);

    // ─── Filtered + Sorted Data ──────────────────────────────────
    const filteredContainers = useMemo(() => {
        let result = containers;

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(c => c.status === statusFilter);
        }

        // Search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(c =>
                (c.container_number || '').toLowerCase().includes(q) ||
                (c.container_name || '').toLowerCase().includes(q) ||
                (c.shipment_number || '').toLowerCase().includes(q) ||
                (c.shipping_company || '').toLowerCase().includes(q) ||
                (c.vessel_name || '').toLowerCase().includes(q) ||
                ((c as any).supplier_display || '').toLowerCase().includes(q) ||
                (c.port_of_loading || '').toLowerCase().includes(q) ||
                (c.port_of_discharge || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let av: any, bv: any;
            switch (sortField) {
                case 'container_number': av = a.container_number || ''; bv = b.container_number || ''; break;
                case 'status': av = a.status || ''; bv = b.status || ''; break;
                case 'eta': av = a.eta || ''; bv = b.eta || ''; break;
                case 'total_landed_cost': av = Number(a.total_landed_cost || 0); bv = Number(b.total_landed_cost || 0); break;
                default: av = a.created_at || ''; bv = b.created_at || '';
            }
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [containers, statusFilter, searchTerm, sortField, sortAsc]);

    // ─── Handlers ────────────────────────────────────────────────
    const handleRowClick = useCallback((row: ContainerRow) => {
        const transformedData = {
            ...row,
            party_id: row.supplier_id,
        };
        setSelectedContainer(transformedData);
        setSheetMode('view');
        setIsUnifiedSheetOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setSelectedContainer(null);
        setSheetMode('create');
        setIsUnifiedSheetOpen(true);
    }, []);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    }, [sortField]);

    // ─── Row Accent by status ────────────────────────────────────
    const getRowAccent = useCallback((row: ContainerRow) => {
        const st = row.status || 'draft';
        switch (st) {
            case 'received': return 'border-s-green-400';
            case 'in_receiving': return 'border-s-teal-400';   // ← جديد ✨
            case 'cleared': return 'border-s-emerald-400';
            case 'customs': return 'border-s-orange-400';
            case 'at_port': return 'border-s-violet-400';
            case 'in_transit': return 'border-s-blue-400';
            case 'loading': return 'border-s-amber-400';
            case 'booked': return 'border-s-sky-400';
            case 'closed': return 'border-s-gray-400';
            default: return 'border-s-gray-300';
        }
    }, []);

    // ─── Columns ─────────────────────────────────────────────────
    const columns: NexaListColumn<ContainerRow>[] = useMemo(() => [
        {
            id: 'container_number',
            header: t('containers.containerNumber'),
            sortable: true,
            sortKey: 'container_number',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-mono text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 leading-tight">
                        {row.container_number || '—'}
                    </span>
                    {row.shipment_number && (
                        <span className="text-[10px] text-gray-400 font-mono">
                            {row.shipment_number}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'container_name',
            header: t('containers.name'),
            cell: (row) => {
                const name = row.container_name || (row as any).supplier_display || '';
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0">
                            <Ship className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                                {name || '—'}
                            </p>
                            {row.shipping_company && (
                                <p className="text-[10px] text-gray-400 line-clamp-1">
                                    {row.shipping_company}
                                    {row.vessel_name ? ` • ${row.vessel_name}` : ''}
                                </p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'route',
            header: t('containers.route'),
            cell: (row) => {
                const from = row.port_of_loading || row.origin_country;
                const to = row.port_of_discharge;
                if (!from && !to) return <span className="text-[11px] text-gray-300">—</span>;
                return (
                    <div className="flex items-center gap-1.5 text-[11px]">
                        {from && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-800">
                                {from}
                            </span>
                        )}
                        {from && to && <ArrowRightLeft className="w-3 h-3 text-gray-300" />}
                        {to && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-emerald-800">
                                {to}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'size_type',
            header: t('containers.size'),
            cell: (row) => {
                const size = row.container_size;
                const type = row.container_type;
                if (!size && !type) return <span className="text-[11px] text-gray-300">—</span>;
                return (
                    <div className="flex items-center gap-1">
                        {size && (
                            <span className="text-[11px] font-mono font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {size}
                            </span>
                        )}
                        {type && (
                            <span className="text-[10px] text-gray-400 capitalize">
                                {type}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'progress',
            header: t('containers.progress'),
            cell: (row) => {
                const prog = getStageProgress(row.status);
                const color = getStageColor(row.status);
                return (
                    <div className="flex flex-col gap-1 min-w-[80px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-gray-500">{prog.current}/{prog.total}</span>
                            <span className="text-[10px] text-gray-400">{prog.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", color)}
                                style={{ width: `${prog.percent}%` }}
                            />
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'eta',
            header: t('containers.eta'),
            sortable: true,
            sortKey: 'eta',
            cell: (row) => {
                const eta = row.eta || row.arrival_date;
                if (!eta) return <span className="text-[11px] text-gray-300">—</span>;
                const daysInfo = getDaysInfo(eta, t);
                return (
                    <div className="flex flex-col">
                        <span className="text-[11px] font-mono text-gray-500">
                            {format(new Date(eta), 'yyyy-MM-dd')}
                        </span>
                        {daysInfo && (
                            <span className={cn("text-[10px] font-semibold", daysInfo.color)}>
                                {daysInfo.isOverdue ? '⚠ ' : ''}{daysInfo.text}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'linked_invoices',
            header: t('containers.invoices'),
            cell: (row) => {
                const count = invoiceCounts[row.id] || 0;
                if (count === 0) return <span className="text-[11px] text-gray-300">—</span>;
                return (
                    <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[12px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-800">
                            {count}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'total_landed_cost',
            header: t('containers.cost'),
            align: 'end',
            sortable: true,
            sortKey: 'total_landed_cost',
            cell: (row) => {
                const cost = Number(row.total_landed_cost || row.total_cost || 0);
                const tax = Number((row as any).customs_tax_total || 0);
                const taxPosted = (row as any).customs_tax_posted === true;
                const cur = row.currency || baseCurrency || 'USD';
                if (cost === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight" dir="ltr">
                            {getCurrencySymbol(cur)} {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {tax > 0 && taxPosted && (
                            <span className="text-[10px] text-rose-500 font-mono" dir="ltr">
                                {t('containers.tax')} {getCurrencySymbol(cur)} {tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: t('table.status'),
            sortable: true,
            sortKey: 'status',
            cell: (row) => <ContainerStatusBadge status={row.status || 'draft'} varianceStatus={row.variance_status} />,
        },
    ], [isRTL, baseCurrency, invoiceCounts, containerTaxMap]);

    // ─── Actions Renderer ────────────────────────────────────────
    const renderActions = useCallback((row: ContainerRow) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[160px]">
                <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRowClick(row)} className="gap-2 cursor-pointer text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {t('containers.viewDetails')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL, handleRowClick]);

    // ─── Kanban Configuration ────────────────────────────────────
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'draft',
            title: t('containers.draft'),
            color: 'border-gray-400',
            bgColor: 'bg-gray-50/40 dark:bg-gray-900/20',
            accentHex: '#9ca3af',
            icon: <Clock className="w-4 h-4 text-gray-500" />,
        },
        {
            id: 'booked',
            title: t('containers.booked'),
            color: 'border-sky-500',
            bgColor: 'bg-sky-50/40 dark:bg-sky-950/20',
            accentHex: '#0ea5e9',
            icon: <FileText className="w-4 h-4 text-sky-600" />,
        },
        {
            id: 'loading',
            title: t('containers.loading'),
            color: 'border-amber-500',
            bgColor: 'bg-amber-50/40 dark:bg-amber-950/20',
            accentHex: '#d97706',
            icon: <Truck className="w-4 h-4 text-amber-600" />,
        },
        {
            id: 'in_transit',
            title: t('containers.inTransit'),
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40 dark:bg-blue-950/20',
            accentHex: '#2563eb',
            icon: <Ship className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'at_port',
            title: t('containers.atPort'),
            color: 'border-violet-500',
            bgColor: 'bg-violet-50/40 dark:bg-violet-950/20',
            accentHex: '#7c3aed',
            icon: <Anchor className="w-4 h-4 text-violet-600" />,
        },
        {
            id: 'customs',
            title: t('containers.customs'),
            color: 'border-orange-500',
            bgColor: 'bg-orange-50/40 dark:bg-orange-950/20',
            accentHex: '#ea580c',
            icon: <Globe className="w-4 h-4 text-orange-600" />,
        },
        {
            id: 'cleared',
            title: t('containers.cleared'),
            color: 'border-emerald-500',
            bgColor: 'bg-emerald-50/40 dark:bg-emerald-950/20',
            accentHex: '#059669',
            icon: <PackageCheck className="w-4 h-4 text-emerald-600" />,
        },
        {
            id: 'in_receiving',
            title: t('containers.receiving'),
            color: 'border-teal-500',
            bgColor: 'bg-teal-50/40 dark:bg-teal-950/20',
            accentHex: '#0d9488',
            icon: <Warehouse className="w-4 h-4 text-teal-600" />,
        },
        {
            id: 'received',
            title: t('containers.received'),
            color: 'border-green-500',
            bgColor: 'bg-green-50/40 dark:bg-green-950/20',
            accentHex: '#16a34a',
            icon: <Warehouse className="w-4 h-4 text-green-600" />,
        },
    ], [isRTL, t]);

    const kanbanItems: KanbanItem[] = useMemo(() =>
        containers.map((c: any) => ({
            id: c.id,
            columnId: c.status || 'draft',
            content: {
                ...c,
                supplier_name: c.supplier_display || c.shipping_company || c.supplier_name || '-',
            },
        }))
        , [containers]);

    // ─── Tab label helper ────────────────────────────────────────
    const getTabLabel = (value: string) => {
        if (value === 'all') return t('common.all');
        const def = CONTAINER_STATUSES.find(s => s.key === value);
        if (def) return language === 'ar' ? def.label_ar : def.label_en;
        return value;
    };

    const getTabIcon = (value: string) => {
        switch (value) {
            case 'all': return <Ship className="w-4 h-4 me-1.5" />;
            case 'in_transit': return <Ship className="w-4 h-4 me-1.5" />;
            case 'at_port': return <Anchor className="w-4 h-4 me-1.5" />;
            case 'customs': return <Globe className="w-4 h-4 me-1.5" />;
            case 'cleared': return <PackageCheck className="w-4 h-4 me-1.5" />;
            case 'in_receiving': return <Warehouse className="w-4 h-4 me-1.5 text-teal-500" />;
            case 'received': return <Warehouse className="w-4 h-4 me-1.5" />;
            default: return null;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>

            {/* ─── Header Row ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
                        <Ship className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('containers.management')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {`${filteredContainers.length} ${t('containers.containerLabel')} — ${containers.length} total`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 px-3 gap-1.5 text-xs font-medium transition-all",
                                viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-erp-navy dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            )}
                            onClick={() => handleSetViewMode('list')}
                        >
                            <List className="w-4 h-4" />
                            {t('containers.list')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 px-3 gap-1.5 text-xs font-medium transition-all",
                                viewMode === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm text-erp-navy dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            )}
                            onClick={() => handleSetViewMode('kanban')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Kanban
                        </Button>
                    </div>

                    {/* ✅ زر استلام مواد سريع */}
                    <Button
                        onClick={() => setReceiptDialog({ open: true })}
                        variant="outline"
                        className="gap-2 px-4 h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-400 shadow-sm dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                        {t('containers.receiveGoods')}
                    </Button>

                    {/* Create Button */}
                    <Button
                        onClick={handleCreate}
                        className="gap-2 px-4 h-9 text-white shadow-sm bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" />
                        {t('containers.addContainer')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Tabs (list mode only) ─── */}
                {viewMode === 'list' && (
                    <div className="flex flex-wrap items-center gap-3 px-1">
                        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v)} className="w-full sm:w-auto" dir={direction}>
                            <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                                {visibleTabs.map(tab => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal"
                                    >
                                        {getTabIcon(tab.value)}
                                        {getTabLabel(tab.value)}
                                        <Badge
                                            variant="secondary"
                                            className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60"
                                        >
                                            {statusCounts[tab.value] || 0}
                                        </Badge>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                {/* ─── Content Area ─── */}
                {viewMode === 'list' ? (
                    <NexaListTable<ContainerRow>
                        data={filteredContainers}
                        columns={columns}

                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder={t('table.search')}

                        totalCount={containers.length}
                        countLabel={t('containers.containerLabel')}

                        sortField={sortField}
                        sortAsc={sortAsc}
                        onSort={handleSort}

                        getRowAccent={getRowAccent}
                        onRowClick={handleRowClick}
                        getRowKey={(row) => row.id}

                        isLoading={isLoading}

                        emptyIcon={<Ship className="w-12 h-12 text-gray-300" />}
                        emptyMessage={
                            statusFilter !== 'all'
                                ? `${t('containers.noContainersWithStatus')} "${getTabLabel(statusFilter)}"`
                                : t('containers.noContainersFound')
                        }

                        showFooter={true}
                        footerLeftText={
                            `Showing ${filteredContainers.length} of ${containers.length} ${t('containers.containerLabel')}`
                        }
                        footerRightContent={
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300" dir="ltr">
                                    {t('containers.totalCost')}
                                    {filteredContainers.reduce((s, c) => s + Number(c.total_landed_cost || c.total_cost || 0), 0)
                                        .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span className="text-gray-400 ms-1 text-xs">{baseCurrency || ''}</span>
                                </span>
                            </div>
                        }

                        renderActions={renderActions}
                        isRTL={isRTL}
                        direction={direction}
                    />
                ) : (
                    /* ─── Kanban View ─── */
                    <div
                        className="overflow-hidden rounded-lg border dark:border-gray-800 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-950 shadow-sm"
                        dir={direction}
                        style={{ height: 'calc(100vh - 240px)' }}
                    >
                        <NexaKanbanBoard
                            columns={kanbanColumns}
                            items={kanbanItems}
                            direction={direction}
                            isLoading={isLoading}
                            emptyText={t('containers.noContainersFound')}
                            renderCard={(doc, _colId) => (
                                <div
                                    className="p-3.5 space-y-2.5 cursor-pointer"
                                    onClick={() => {
                                        const transformedData = {
                                            ...doc,
                                            party_id: doc.supplier_id,
                                        };
                                        setSelectedContainer(transformedData);
                                        setSheetMode('view');
                                        setIsUnifiedSheetOpen(true);
                                    }}
                                >
                                    {/* Header: Container # */}
                                    <div className="flex justify-between items-start">
                                        <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                            {doc.container_number || '-'}
                                        </span>
                                        <ContainerStatusBadge status={doc.status || 'draft'} />
                                    </div>

                                    {/* Name / Supplier */}
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                        {doc.container_name || doc.supplier_name || '-'}
                                    </p>

                                    {/* Shipping Info */}
                                    {(doc.shipping_company || doc.vessel_name) && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                            <Ship className="w-3 h-3" />
                                            <span className="line-clamp-1">
                                                {doc.shipping_company}{doc.vessel_name ? ` • ${doc.vessel_name}` : ''}
                                            </span>
                                        </div>
                                    )}

                                    {/* Mini Progress Bar */}
                                    {(() => {
                                        const prog = getStageProgress(doc.status || 'draft');
                                        const color = getStageColor(doc.status || 'draft');
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-500", color)}
                                                        style={{ width: `${prog.percent}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] text-gray-400 font-mono shrink-0">{prog.current}/{prog.total}</span>
                                            </div>
                                        );
                                    })()}

                                    {/* Footer */}
                                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {doc.container_size || '40ft'}
                                            </span>
                                            {/* Invoice count badge */}
                                            {invoiceCounts[doc.id] > 0 && (
                                                <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100 flex items-center gap-0.5">
                                                    <FileText className="w-2.5 h-2.5" />
                                                    {invoiceCounts[doc.id]}
                                                </span>
                                            )}
                                        </div>
                                        {doc.eta && (() => {
                                            const dInfo = getDaysInfo(doc.eta, t);
                                            return dInfo ? (
                                                <span className={cn("text-[10px] font-semibold", dInfo.color)}>
                                                    {dInfo.isOverdue ? '⚠ ' : ''}{dInfo.text}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-500">
                                                    ETA: {new Date(doc.eta).toLocaleDateString()}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                            onCardMove={(itemId, fromColumn, toColumn) => {
                                const fromTitle = kanbanColumns.find(c => c.id === fromColumn)?.title;
                                const toTitle = kanbanColumns.find(c => c.id === toColumn)?.title;
                                toast.info(
                                    isRTL
                                        ? `تم نقل الحاوية من "${fromTitle}" إلى "${toTitle}"`
                                        : `Container moved from "${fromTitle}" to "${toTitle}"`
                                );
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ─── Unified Sheet ─── */}
            {isUnifiedSheetOpen && (
                <UnifiedTradeSheet
                    open={isUnifiedSheetOpen}
                    onOpenChange={(open) => {
                        setIsUnifiedSheetOpen(open);
                        if (!open) {
                            queryClient.invalidateQueries({ queryKey: ['containers_list'] });
                        }
                    }}
                    mode="purchase"
                    type="container"
                    initialData={selectedContainer}
                    companyId={companyId}
                />
            )}

            {/* ✅ MaterialReceiptDialog — استلام سريع */}
            <MaterialReceiptDialog
                isOpen={receiptDialog.open}
                onOpenChange={(open) => {
                    setReceiptDialog({ open });
                    if (!open) {
                        queryClient.invalidateQueries({ queryKey: ['containers_list'] });
                    }
                }}
                defaultBillType="container"
                onComplete={() => {
                    setReceiptDialog({ open: false });
                    queryClient.invalidateQueries({ queryKey: ['containers_list'] });
                }}
            />
        </div>
    );
}
