import { useState, useMemo, useCallback } from 'react';
import { HeadphonesIcon, Users, Plus, Star, Filter, Eye, MoreHorizontal, Link } from 'lucide-react';
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
import { RingGroupSheet } from '../components/RingGroupSheet';

interface RingGroup {
    id: string;
    company_id: string;
    extension: string;
    name: string;
    strategy: 'ringall' | 'linear' | 'leastrecent' | 'fewestcalls' | 'random' | 'memoryhunter';
    ring_time: number;
    description: string;
    is_active: boolean;
    created_at: string;
}

export default function RingGroupsPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('extension');
    const [sortAsc, setSortAsc] = useState(true);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [selectedGroup, setSelectedGroup] = useState<RingGroup | null>(null);

    const { data: ringGroups = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_ring_groups', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_ring_groups')
                .select('*')
                .eq('company_id', companyId)
                .order('name', { ascending: true });

            if (error) throw error;
            return (data || []) as RingGroup[];
        },
        enabled: !!companyId,
    });

    const filteredGroups = useMemo(() => {
        let result = ringGroups;

        if (activeTab === 'active') result = result.filter(g => g.is_active);
        if (activeTab === 'inactive') result = result.filter(g => !g.is_active);

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(g =>
                (g.extension || '').toLowerCase().includes(q) ||
                (g.name || '').toLowerCase().includes(q)
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
    }, [ringGroups, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    }, [sortField]);

    const getRowAccent = useCallback((row: RingGroup) => {
        return row.is_active
            ? 'border-s-orange-400'
            : 'border-s-gray-300 dark:border-s-gray-600';
    }, []);

    const columns: NexaListColumn<RingGroup>[] = useMemo(() => [
        {
            id: 'extension',
            header: isRTL ? 'رقم المجموعة' : 'Group Number',
            sortable: true,
            sortKey: 'extension',
            cell: (row) => (
                <span className="font-mono text-[14px] font-bold text-orange-600 group-hover:text-orange-700 leading-tight">
                    {row.extension}
                </span>
            ),
        },
        {
            id: 'name',
            header: isRTL ? 'اسم المجموعة' : 'Group Name',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-sm shrink-0">
                        <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                            {row.name || '—'}
                        </p>
                        {row.description && (
                            <span className="text-[11px] text-gray-400 block truncate">
                                {row.description}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'strategy',
            header: isRTL ? 'استراتيجية الرنين' : 'Ring Strategy',
            cell: (row) => {
                const config: Record<string, { label: string; labelAr: string; cls: string }> = {
                    ringall: { label: 'Ring All', labelAr: 'رنين للجميع', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    linear: { label: 'Linear', labelAr: 'تتابعي', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    leastrecent: { label: 'Least Recent', labelAr: 'الأقل اتصالاً', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    fewestcalls: { label: 'Fewest Calls', labelAr: 'الأقل مكالمات', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
                    random: { label: 'Random', labelAr: 'عشوائي', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
                    memoryhunter: { label: 'Memory Hunter', labelAr: 'ذاكرة التتبع', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                };
                const c = config[row.strategy] || config.ringall;
                return (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full border", c.cls)}>
                        {isRTL ? c.labelAr : c.label}
                    </span>
                );
            },
        },
        {
            id: 'ring_time',
            header: isRTL ? 'مدة الرنين' : 'Ring Time',
            cell: (row) => (
                <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                    {row.ring_time} {isRTL ? 'ثانية' : 'sec'}
                </span>
            ),
        },
        {
            id: 'is_active',
            header: isRTL ? 'النشاط' : 'Active',
            cell: (row) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    row.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                )}>
                    {row.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                </span>
            ),
        },
    ], [isRTL]);

    const renderActions = useCallback((row: RingGroup) => (
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
                        setSelectedGroup(row);
                        setSheetMode('edit');
                        setIsSheetOpen(true);
                    }}
                >
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'تعديل المجموعة' : 'Edit Group'}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer text-sm">
                    <Link className="h-3.5 w-3.5" />
                    {isRTL ? 'إدارة الأعضاء (الأرقام)' : 'Manage Members'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            {/* Title & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <HeadphonesIcon className="w-7 h-7 text-orange-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'مجموعات الرنين (Ring Groups)' : 'Ring Groups'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `إجمالي ${ringGroups.length} مجموعة رنين` : `Total ${ringGroups.length} ring groups`}
                        </p>
                    </div>
                </div>

                <Button 
                    className="gap-2 px-4 h-9 text-white shadow-sm bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                        setSelectedGroup(null);
                        setSheetMode('create');
                        setIsSheetOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة مجموعة جديدة' : 'Add Ring Group'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* Tabs & Search */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <Users className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{ringGroups.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Star className="w-4 h-4 me-1.5" />
                                {isRTL ? 'النشطة' : 'Active'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{ringGroups.filter(g => g.is_active).length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-500 font-tajawal">
                                {isRTL ? 'المعطلة' : 'Inactive'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{ringGroups.filter(g => !g.is_active).length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Data Grid */}
                <NexaListTable<RingGroup>
                    data={filteredGroups}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'البحث بالاسم أو الرقم...' : 'Search ring groups...'}
                    totalCount={ringGroups.length}
                    countLabel={isRTL ? 'مجموعات' : 'groups'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد مجموعات رنين مضافة حالياً' : 'No ring groups found'}
                    showFooter={true}
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {isSheetOpen && companyId && (
                <RingGroupSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedGroup(null);
                    }}
                    mode={sheetMode}
                    data={selectedGroup}
                    companyId={companyId}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
