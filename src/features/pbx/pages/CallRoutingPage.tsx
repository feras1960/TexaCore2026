import { useState, useMemo, useCallback } from 'react';
import { Route, Plus, SortAsc, MoreHorizontal, Eye, ArrowRightLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CallRoutingSheet } from '../components/CallRoutingSheet';

interface CallRouting {
    id: string;
    company_id: string;
    name: string;
    priority: number;
    direction: 'inbound' | 'outbound';
    condition_type: 'time_based' | 'caller_id' | 'did_number' | 'prefix' | 'all';
    condition_value: any;
    action: 'ring_group' | 'extension' | 'ivr' | 'voicemail' | 'trunk' | 'external';
    action_target: string;
    created_at: string;
}

export default function CallRoutingPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('priority');
    const [sortAsc, setSortAsc] = useState(true);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [selectedRoute, setSelectedRoute] = useState<CallRouting | null>(null);

    const { data: routes = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_call_routing', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_call_routing')
                .select('*')
                .eq('company_id', companyId)
                .order('priority', { ascending: true });

            if (error) throw error;
            return (data || []) as CallRouting[];
        },
        enabled: !!companyId,
    });

    const filteredRoutes = useMemo(() => {
        let result = routes;

        if (activeTab === 'inbound') result = result.filter(r => r.direction === 'inbound');
        if (activeTab === 'outbound') result = result.filter(r => r.direction === 'outbound');

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r =>
                (r.name || '').toLowerCase().includes(q)
            );
        }

        result = [...result].sort((a: any, b: any) => {
            let av = a[sortField] || '';
            let bv = b[sortField] || '';
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [routes, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    }, [sortField]);

    const getRowAccent = useCallback((row: CallRouting) => {
        return row.direction === 'inbound'
            ? 'border-s-emerald-400'
            : 'border-s-blue-400';
    }, []);

    const columns: NexaListColumn<CallRouting>[] = useMemo(() => [
        {
            id: 'name',
            header: isRTL ? 'اسم القاعدة' : 'Route Name',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0",
                        row.direction === 'inbound' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                    )}>
                        {row.direction === 'inbound' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-white font-tajawal flex items-center gap-2">
                            {row.name}
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-[16px] uppercase tracking-wider">{row.direction}</Badge>
                        </p>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                            {isRTL ? 'الأولوية (Priority):' : 'Priority:'} <strong className="text-gray-700 dark:text-gray-300">{row.priority}</strong>
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'condition',
            header: isRTL ? 'الشرط (متى تعمل؟)' : 'Condition',
            cell: (row) => {
                const config: Record<string, string> = {
                    time_based: isRTL ? 'وقت العمل' : 'Time Based',
                    caller_id: isRTL ? 'هوية المتصل' : 'Caller ID',
                    did_number: isRTL ? 'الرقم المطلوب (DID)' : 'DID Number',
                    prefix: isRTL ? 'بداية الرقم (Prefix)' : 'Prefix',
                    all: isRTL ? 'جميع المكالمات' : 'All Calls',
                };
                return (
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {config[row.condition_type] || row.condition_type}
                        </span>
                        {row.condition_type !== 'all' && (
                            <span className="text-[10px] text-gray-500 font-mono">
                                {JSON.stringify(row.condition_value)}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'action',
            header: isRTL ? 'الإجراء (الوجهة)' : 'Action',
            cell: (row) => {
                const config: Record<string, { label: string; cls: string }> = {
                    ring_group: { label: isRTL ? 'تحويل لمجموعة' : 'Ring Group', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                    extension: { label: isRTL ? 'تحويل لتحويلة' : 'Extension', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    ivr: { label: isRTL ? 'رد آلي (IVR)' : 'IVR Menu', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                    voicemail: { label: isRTL ? 'البريد الصوتي' : 'Voicemail', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                    trunk: { label: isRTL ? 'خط خارجي (Trunk)' : 'Trunk', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    external: { label: isRTL ? 'رقم خارجي' : 'External Num', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
                };
                const c = config[row.action];
                return (
                    <div className="flex flex-col gap-1">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded border", c?.cls)}>
                            {c?.label || row.action}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-1 py-0.5 rounded w-fit max-w-[120px] truncate">
                            {row.action_target}
                        </span>
                    </div>
                );
            },
        },
    ], [isRTL]);

    const renderActions = useCallback((row: CallRouting) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[150px]">
                <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    className="gap-2 cursor-pointer text-sm"
                    onClick={() => {
                        setSelectedRoute(row);
                        setSheetMode('edit');
                        setIsSheetOpen(true);
                    }}
                >
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'تعديل القاعدة' : 'Edit Route'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            {/* Title & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Route className="w-7 h-7 text-rose-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'قواعد توجيه المكالمات' : 'Call Routing Rules'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `إجمالي ${routes.length} قاعدة مبرمجة` : `Total ${routes.length} routes`}
                        </p>
                    </div>
                </div>

                <Button 
                    className="gap-2 px-4 h-9 text-white shadow-sm bg-rose-600 hover:bg-rose-700"
                    onClick={() => {
                        setSelectedRoute(null);
                        setSheetMode('create');
                        setIsSheetOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة قاعدة جديدة' : 'Add Rule'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* Tabs & Search */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <ArrowRightLeft className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{routes.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inbound" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <ArrowDown className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الواردة (Inbound)' : 'Inbound'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{routes.filter(r => r.direction === 'inbound').length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="outbound" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-blue-600 font-tajawal">
                                <ArrowUp className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الصادرة (Outbound)' : 'Outbound'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-blue-100/60 text-blue-700">{routes.filter(r => r.direction === 'outbound').length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Data Grid */}
                <NexaListTable<CallRouting>
                    data={filteredRoutes}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'البحث في القواعد...' : 'Search routes...'}
                    totalCount={routes.length}
                    countLabel={isRTL ? 'قاعدة' : 'routes'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد قواعد توجيه. المقسم قد لا يستقبل مكالمات.' : 'No routes found. PBX may not process calls.'}
                    showFooter={true}
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {isSheetOpen && companyId && (
                <CallRoutingSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedRoute(null);
                    }}
                    mode={sheetMode}
                    data={selectedRoute}
                    companyId={companyId}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
