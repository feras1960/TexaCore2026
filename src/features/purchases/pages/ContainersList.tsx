import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ship, Plus, Filter, LayoutGrid, List, Anchor, PackageCheck, Truck, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { toast } from 'sonner';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';

export default function ContainersList() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'cleared' | 'received'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

    // Unified Sheet State
    const [isUnifiedSheetOpen, setIsUnifiedSheetOpen] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<any>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');

    // ─── Persist view mode preference ───
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

    // Fetch Containers
    const { data: containers = [], isLoading } = useQuery({
        queryKey: ['containers_list', companyId, statusFilter, viewMode],
        queryFn: async () => {
            let query = supabase
                .from('shipments')
                .select(`
                    *,
                    supplier:suppliers(name_ar, name_en),
                    invoices:purchase_invoices(count)
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            // In kanban mode, always fetch all; in list mode, filter by tab
            if (viewMode === 'list' && statusFilter !== 'all') {
                if (statusFilter === 'in_transit') query = query.in('status', ['shipped', 'at_port']);
                else if (statusFilter === 'cleared') query = query.eq('status', 'cleared');
                else if (statusFilter === 'received') query = query.eq('status', 'received');
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }
    });

    // Create/Update Container Mutation
    const saveContainerMutation = useMutation({
        mutationFn: async (data: any) => {
            const shipmentData = {
                company_id: companyId,
                shipment_number: data.shipment_number || `SHP-${Date.now().toString().slice(-6)}`,
                container_number: data.container_number,
                bill_of_lading: data.bill_of_lading,
                supplier_id: data.party_id || data.supplier_id,
                origin_country: data.origin_country,
                port_of_loading: data.port_of_loading,
                port_of_discharge: data.port_of_discharge,
                shipping_line: data.shipping_line,
                vessel_name: data.vessel_name,
                etd: data.etd || null,
                eta: data.eta || null,
                container_size: data.container_size || '40ft',
                container_type: data.container_type || 'dry',
                status: data.status || 'ordered',
                notes: data.notes
            };

            let shipmentId = data.id;

            if (sheetMode === 'create') {
                const { data: newShipment, error: createError } = await supabase
                    .from('shipments')
                    .insert(shipmentData)
                    .select()
                    .single();
                if (createError) throw createError;
                shipmentId = newShipment.id;
            } else {
                const { error: updateError } = await supabase
                    .from('shipments')
                    .update(shipmentData)
                    .eq('id', shipmentId);
                if (updateError) throw updateError;
            }

            // Link Invoices
            const invoiceIds = data.invoice_ids as string[];
            if (invoiceIds && invoiceIds.length > 0) {
                const { error: invoiceError } = await supabase
                    .from('purchase_invoices')
                    .update({ shipment_id: shipmentId })
                    .in('id', invoiceIds);
                if (invoiceError) throw invoiceError;
            }

            return shipmentId;
        },
        onSuccess: () => {
            toast.success(isRTL ? 'تم حفظ الحاوية بنجاح' : 'Container saved successfully');
            queryClient.invalidateQueries({ queryKey: ['containers_list'] });
            setIsUnifiedSheetOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const columns = [
        {
            accessorKey: 'container_number',
            header: t('fields.containerNumber') || 'Container #',
            cell: (info: any) => <span className="font-mono font-bold">{info.getValue()}</span>
        },
        {
            accessorKey: 'supplier',
            header: t('fields.supplier') || 'Supplier',
            cell: (info: any) => {
                const s = info.getValue();
                return isRTL ? (s?.name_ar || s?.name_en) : (s?.name_en || s?.name_ar);
            }
        },
        {
            accessorKey: 'shipping_line',
            header: t('fields.shippingLine') || 'Shipping Line',
            cell: (info: any) => (
                <div className="flex flex-col text-xs">
                    <span>{info.getValue()}</span>
                    <span className="text-gray-400">{info.row.original.vessel_name}</span>
                </div>
            )
        },
        {
            accessorKey: 'eta',
            header: 'ETA',
            cell: (info: any) => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : '-'
        },
        {
            accessorKey: 'status',
            header: t('fields.status') || 'Status',
            cell: (info: any) => (
                <span className={`px-2 py-1 rounded text-xs font-medium 
                    ${info.getValue() === 'cleared' ? 'bg-green-100 text-green-800' :
                        info.getValue() === 'received' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {info.getValue()}
                </span>
            )
        },
        {
            id: 'actions',
            cell: (info: any) => {
                return (
                    <Button variant="ghost" size="sm" onClick={() => {
                        const container = info.row.original;
                        const transformedData = {
                            ...container,
                            party_id: container.supplier_id,
                        };
                        setSelectedContainer(transformedData);
                        setSheetMode('view');
                        setIsUnifiedSheetOpen(true);
                    }}>
                        {t('actions.view') || 'View'}
                    </Button>
                );
            }
        }
    ];

    const tabs = [
        { value: 'all', label: t('status.all') || 'All' },
        { value: 'in_transit', label: t('status.inTransit') || 'In Transit' },
        { value: 'cleared', label: t('status.cleared') || 'Cleared' },
        { value: 'received', label: t('status.received') || 'Received' },
    ];

    // ─── Kanban Configuration ───
    const kanbanColumns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'ordered',
            title: isRTL ? 'تم الطلب' : 'Ordered',
            color: 'border-gray-500',
            bgColor: 'bg-gray-50/40',
            accentHex: '#6b7280',
            icon: <Clock className="w-4 h-4 text-gray-600" />,
        },
        {
            id: 'shipped',
            title: isRTL ? 'في البحر' : 'Shipped',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40',
            accentHex: '#2563eb',
            icon: <Ship className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'at_port',
            title: isRTL ? 'في الميناء' : 'At Port',
            color: 'border-amber-500',
            bgColor: 'bg-amber-50/40',
            accentHex: '#d97706',
            icon: <Anchor className="w-4 h-4 text-amber-600" />,
        },
        {
            id: 'cleared',
            title: isRTL ? 'تم التخليص' : 'Cleared',
            color: 'border-emerald-500',
            bgColor: 'bg-emerald-50/40',
            accentHex: '#059669',
            icon: <PackageCheck className="w-4 h-4 text-emerald-600" />,
        },
        {
            id: 'received',
            title: isRTL ? 'تم الاستلام' : 'Received',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#4f46e5',
            icon: <Truck className="w-4 h-4 text-indigo-600" />,
        },
    ], [isRTL]);

    const kanbanItems: KanbanItem[] = useMemo(() =>
        containers.map((c: any) => ({
            id: c.id,
            columnId: c.status || 'ordered',
            content: {
                ...c,
                supplier_name: isRTL
                    ? (c.supplier?.name_ar || c.supplier?.name_en || '-')
                    : (c.supplier?.name_en || c.supplier?.name_ar || '-'),
            },
        }))
        , [containers, isRTL]);

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* ─── Top Fixed Row: Title + View Switcher + Create Button ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                    <Ship className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {t('purchases.container_details.title') || (isRTL ? 'إدارة الحاويات' : 'Containers Management')}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('purchases.container_details.subtitle') || (isRTL ? 'تتبع وإدارة شحنات الاستيراد' : 'Track and manage import shipments')}
                        </p>
                    </div>
                </div>

                {/* View Switcher + Create Button */}
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
                    <Button onClick={() => {
                        setSelectedContainer(null);
                        setSheetMode('create');
                        setIsUnifiedSheetOpen(true);
                    }} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9 px-4 gap-2">
                        <Plus className="w-4 h-4" />
                        {t('actions.addContainer') || (isRTL ? 'إضافة حاوية' : 'Add Container')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* ─── Second Row: Tabs (list only) ─── */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    {viewMode === 'list' && (
                        <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)} className="w-full sm:w-auto">
                            <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                                {(isRTL ? [...tabs].reverse() : tabs).map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    )}
                </div>

                {/* ─── Content Area ─── */}
                {viewMode === 'list' ? (
                    <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                        <NexaDataTable
                            data={containers}
                            columns={columns}
                            searchPlaceholder={t('common.search') || "Search containers..."}
                        />
                    </div>
                ) : (
                    <div
                        className="overflow-hidden rounded-lg border bg-gradient-to-br from-gray-50 to-slate-50 shadow-sm"
                        dir={direction}
                        style={{ height: 'calc(100vh - 240px)' }}
                    >
                        <NexaKanbanBoard
                            columns={kanbanColumns}
                            items={kanbanItems}
                            direction={direction}
                            isLoading={isLoading}
                            emptyText={isRTL ? 'لا توجد حاويات' : 'No containers'}
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
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] h-5 px-1.5 border capitalize ${doc.status === 'received' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                doc.status === 'cleared' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    doc.status === 'at_port' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}
                                        >
                                            {doc.status}
                                        </Badge>
                                    </div>

                                    {/* Supplier */}
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                        {doc.supplier_name || '-'}
                                    </p>

                                    {/* Shipping Info */}
                                    {(doc.shipping_line || doc.vessel_name) && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                            <Ship className="w-3 h-3" />
                                            <span className="line-clamp-1">
                                                {doc.shipping_line}{doc.vessel_name ? ` • ${doc.vessel_name}` : ''}
                                            </span>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {doc.container_size || '40ft'}
                                        </span>
                                        {doc.eta && (
                                            <span className="text-[11px] text-gray-500">
                                                ETA: {new Date(doc.eta).toLocaleDateString()}
                                            </span>
                                        )}
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

            {/* Unified Sheet */}
            {isUnifiedSheetOpen && (
                <UnifiedTradeSheet
                    open={isUnifiedSheetOpen}
                    onOpenChange={setIsUnifiedSheetOpen}
                    mode="purchase"
                    type="container"
                    initialData={selectedContainer}
                    onSave={async (data) => {
                        await saveContainerMutation.mutateAsync(data);
                    }}
                />
            )}
        </div>
    );
}
