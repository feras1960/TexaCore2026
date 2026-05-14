import { useState, useMemo, useCallback } from 'react';
import { Mic, Volume2, Plus, Star, Filter, Eye, MoreHorizontal, PlayCircle, Bot } from 'lucide-react';
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
import { IVRMenuSheet } from '../components/IVRMenuSheet';

interface IVRMenu {
    id: string;
    company_id: string;
    name: string;
    type: 'greeting' | 'hold' | 'out_of_office' | 'busy';
    text_content: string;
    voice_id: string;
    audio_url: string;
    bgm_enabled: boolean;
    bgm_volume: number;
    is_active: boolean;
    created_at: string;
}

export default function IVRMenusPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [selectedMenu, setSelectedMenu] = useState<IVRMenu | null>(null);

    const { data: ivrMenus = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_ivr_menus', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_ivr_menus')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as IVRMenu[];
        },
        enabled: !!companyId,
    });

    const filteredMenus = useMemo(() => {
        let result = ivrMenus;

        if (activeTab === 'active') result = result.filter(m => m.is_active);
        if (activeTab === 'inactive') result = result.filter(m => !m.is_active);

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(m =>
                (m.name || '').toLowerCase().includes(q) ||
                (m.text_content || '').toLowerCase().includes(q)
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
    }, [ivrMenus, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    }, [sortField]);

    const getRowAccent = useCallback((row: IVRMenu) => {
        return row.is_active
            ? 'border-s-indigo-400'
            : 'border-s-gray-300 dark:border-s-gray-600';
    }, []);

    const columns: NexaListColumn<IVRMenu>[] = useMemo(() => [
        {
            id: 'name',
            header: isRTL ? 'الاسم المعروض' : 'Menu Name',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-sm shrink-0">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                            {row.name || '—'}
                        </p>
                        <span className="text-[11px] text-gray-400 block truncate max-w-[200px]">
                            {row.text_content}
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
                    greeting: { label: 'Greeting', labelAr: 'رسالة ترحيبية', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    hold: { label: 'Hold Message', labelAr: 'رسالة انتظار', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    out_of_office: { label: 'Out of Office', labelAr: 'خارج أوقات العمل', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                    busy: { label: 'Busy', labelAr: 'مشغول', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
                };
                const c = config[row.type] || config.greeting;
                return (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full border", c.cls)}>
                        {isRTL ? c.labelAr : c.label}
                    </span>
                );
            },
        },
        {
            id: 'ai_voice',
            header: isRTL ? 'صوت الذكاء الاصطناعي' : 'AI Voice',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                        {row.voice_id || 'افتراضي'}
                    </span>
                    {row.bgm_enabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            <Volume2 className="w-3 h-3" /> {isRTL ? 'موسيقى' : 'BGM'}
                        </span>
                    )}
                </div>
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

    const renderActions = useCallback((row: IVRMenu) => (
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
                        setSelectedMenu(row);
                        setSheetMode('edit');
                        setIsSheetOpen(true);
                    }}
                >
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'تعديل الرسالة' : 'Edit Menu'}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-indigo-600">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {isRTL ? 'استماع للرسالة الموّلدة' : 'Listen to Audio'}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-rose-600">
                    <Bot className="h-3.5 w-3.5" />
                    {isRTL ? 'إعادة توليد الصوت (AI)' : 'Regenerate Voice (AI)'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            {/* Title & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Mic className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'الرد الآلي والرسائل (Smart IVR)' : 'Smart IVR Menus'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `إجمالي ${ivrMenus.length} رسالة وقائمة` : `Total ${ivrMenus.length} menus`}
                        </p>
                    </div>
                </div>

                <Button 
                    className="gap-2 px-4 h-9 text-white shadow-sm bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                        setSelectedMenu(null);
                        setSheetMode('create');
                        setIsSheetOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إنشاء رسالة جديدة' : 'Add Menu'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* Tabs & Search */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <Mic className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{ivrMenus.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Star className="w-4 h-4 me-1.5" />
                                {isRTL ? 'النشطة' : 'Active'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{ivrMenus.filter(m => m.is_active).length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-500 font-tajawal">
                                {isRTL ? 'المعطلة' : 'Inactive'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{ivrMenus.filter(m => !m.is_active).length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Data Grid */}
                <NexaListTable<IVRMenu>
                    data={filteredMenus}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'البحث بالاسم أو النص...' : 'Search menus...'}
                    totalCount={ivrMenus.length}
                    countLabel={isRTL ? 'رسائل' : 'menus'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد رسائل مضافة حالياً' : 'No menus found'}
                    showFooter={true}
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {isSheetOpen && companyId && (
                <IVRMenuSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedMenu(null);
                    }}
                    mode={sheetMode}
                    data={selectedMenu}
                    companyId={companyId}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
