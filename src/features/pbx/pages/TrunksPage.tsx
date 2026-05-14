import { useState, useMemo, useCallback } from 'react';
import { Network, Plus, Star, MoreHorizontal, Eye, Server, Activity } from 'lucide-react';
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
import { TrunkSheet } from '../components/TrunkSheet';

interface Trunk {
    id: string;
    company_id: string;
    name: string;
    type: 'sip_trunk' | 'voip_gateway' | 'gsm_gateway';
    host: string;
    port: number;
    username?: string;
    password?: string;
    codecs: string[];
    max_channels: number;
    is_active: boolean;
    outbound_caller_id?: string;
    created_at: string;
}

export default function TrunksPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('name');
    const [sortAsc, setSortAsc] = useState(true);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [selectedTrunk, setSelectedTrunk] = useState<Trunk | null>(null);

    const { data: trunks = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_trunks', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_trunks')
                .select('*')
                .eq('company_id', companyId)
                .order('name', { ascending: true });

            if (error) throw error;
            return (data || []) as Trunk[];
        },
        enabled: !!companyId,
    });

    const filteredTrunks = useMemo(() => {
        let result = trunks;

        if (activeTab === 'active') result = result.filter(t => t.is_active);
        if (activeTab === 'inactive') result = result.filter(t => !t.is_active);

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(t =>
                (t.name || '').toLowerCase().includes(q) ||
                (t.host || '').toLowerCase().includes(q)
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
    }, [trunks, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    }, [sortField]);

    const getRowAccent = useCallback((row: Trunk) => {
        return row.is_active
            ? 'border-s-emerald-400'
            : 'border-s-gray-300 dark:border-s-gray-600';
    }, []);

    const columns: NexaListColumn<Trunk>[] = useMemo(() => [
        {
            id: 'name',
            header: isRTL ? 'اسم الخط/البوابة' : 'Trunk Name',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
                        <Network className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-white font-tajawal">
                            {row.name}
                        </p>
                        <span className="text-[11px] text-gray-400 block font-mono">
                            {row.host}:{row.port}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'type',
            header: isRTL ? 'النوع' : 'Type',
            cell: (row) => {
                const config: Record<string, { label: string; labelAr: string; cls: string }> = {
                    sip_trunk: { label: 'SIP Trunk', labelAr: 'SIP Trunk', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    voip_gateway: { label: 'VoIP Gateway', labelAr: 'VoIP Gateway', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    gsm_gateway: { label: 'GSM Gateway', labelAr: 'بوابة GSM', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                };
                const c = config[row.type] || config.sip_trunk;
                return (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full border", c.cls)}>
                        <Server className="w-3 h-3" />
                        {isRTL ? c.labelAr : c.label}
                    </span>
                );
            },
        },
        {
            id: 'capacity',
            header: isRTL ? 'السعة' : 'Capacity',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                        {row.max_channels} {isRTL ? 'قنوات متزامنة' : 'Channels'}
                    </span>
                    <div className="flex gap-1 mt-1">
                        {(row.codecs || []).slice(0, 2).map((codec, i) => (
                            <span key={i} className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1 py-0.5 rounded font-mono uppercase">
                                {codec}
                            </span>
                        ))}
                        {(row.codecs || []).length > 2 && (
                            <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1 py-0.5 rounded">
                                +{(row.codecs || []).length - 2}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'is_active',
            header: isRTL ? 'الحالة' : 'Status',
            cell: (row) => (
                <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    row.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                )}>
                    {row.is_active && <Activity className="w-3 h-3" />}
                    {row.is_active ? (isRTL ? 'متصل ونشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                </span>
            ),
        },
    ], [isRTL]);

    const renderActions = useCallback((row: Trunk) => (
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
                        setSelectedTrunk(row);
                        setSheetMode('edit');
                        setIsSheetOpen(true);
                    }}
                >
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'تعديل إعدادات الخط' : 'Edit Trunk'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            {/* Title & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Network className="w-7 h-7 text-emerald-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'الخطوط والبوابات (Trunks)' : 'Trunks & Gateways'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `إجمالي ${trunks.length} خط متصل` : `Total ${trunks.length} trunks`}
                        </p>
                    </div>
                </div>

                <Button 
                    className="gap-2 px-4 h-9 text-white shadow-sm bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                        setSelectedTrunk(null);
                        setSheetMode('create');
                        setIsSheetOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة خط جديد' : 'Add Trunk'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* Tabs & Search */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <Network className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{trunks.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Star className="w-4 h-4 me-1.5" />
                                {isRTL ? 'النشطة' : 'Active'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{trunks.filter(t => t.is_active).length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-500 font-tajawal">
                                {isRTL ? 'المعطلة' : 'Inactive'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{trunks.filter(t => !t.is_active).length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Data Grid */}
                <NexaListTable<Trunk>
                    data={filteredTrunks}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'البحث بالاسم أو المضيف...' : 'Search trunks...'}
                    totalCount={trunks.length}
                    countLabel={isRTL ? 'خط' : 'trunks'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد خطوط خارجية مضافة' : 'No trunks found'}
                    showFooter={true}
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {isSheetOpen && companyId && (
                <TrunkSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedTrunk(null);
                    }}
                    mode={sheetMode}
                    data={selectedTrunk}
                    companyId={companyId}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
