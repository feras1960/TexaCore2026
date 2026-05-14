import { useState, useMemo, useCallback } from 'react';
import { Phone, Users, Plus, Star, Filter, Eye, MoreHorizontal, Settings, Voicemail } from 'lucide-react';
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
import { ExtensionSheet } from '../components/ExtensionSheet';

interface Extension {
    id: string;
    company_id: string;
    extension_number: string;
    display_name: string;
    status: 'online' | 'offline' | 'busy' | 'dnd';
    caller_id: string;
    voicemail_enabled: boolean;
    recording_enabled: boolean;
    is_active: boolean;
    created_at: string;
}

export default function ExtensionsPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('extension_number');
    const [sortAsc, setSortAsc] = useState(true);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);

    const { data: extensions = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_extensions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_extensions')
                .select('*, user_profiles(id, full_name, email)')
                .eq('company_id', companyId)
                .order('extension_number', { ascending: true });

            if (error) throw error;
            return (data || []) as Extension[];
        },
        enabled: !!companyId,
    });

    const filteredExtensions = useMemo(() => {
        let result = extensions;

        if (activeTab === 'active') result = result.filter(e => e.is_active);
        if (activeTab === 'inactive') result = result.filter(e => !e.is_active);

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(e =>
                (e.extension_number || '').toLowerCase().includes(q) ||
                (e.display_name || '').toLowerCase().includes(q)
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
    }, [extensions, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    }, [sortField]);

    const getRowAccent = useCallback((row: Extension) => {
        return row.status === 'online'
            ? 'border-s-green-400'
            : row.status === 'busy'
                ? 'border-s-red-400'
                : 'border-s-gray-300 dark:border-s-gray-600';
    }, []);

    const columns: NexaListColumn<Extension>[] = useMemo(() => [
        {
            id: 'extension_number',
            header: isRTL ? 'الرقم' : 'Extension',
            sortable: true,
            sortKey: 'extension_number',
            cell: (row) => (
                <span className="font-mono text-[14px] font-bold text-indigo-600 group-hover:text-indigo-700 leading-tight">
                    {row.extension_number}
                </span>
            ),
        },
        {
            id: 'display_name',
            header: isRTL ? 'الاسم المعروض' : 'Display Name',
            sortable: true,
            sortKey: 'display_name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                        {(row.display_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                            {row.display_name || '—'}
                        </p>
                        {row.caller_id && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {row.caller_id}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'features',
            header: isRTL ? 'الميزات' : 'Features',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    {row.voicemail_enabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-full" title={isRTL ? "البريد الصوتي مفعل" : "Voicemail Enabled"}>
                            <Voicemail className="w-3 h-3" /> {isRTL ? 'بريد صوتي' : 'Voicemail'}
                        </span>
                    )}
                    {row.recording_enabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full" title={isRTL ? "تسجيل المكالمات مفعل" : "Call Recording Enabled"}>
                            <Settings className="w-3 h-3" /> {isRTL ? 'تسجيل' : 'Recording'}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'assigned_user',
            header: isRTL ? 'مربوط بـ' : 'Assigned To',
            cell: (row: any) => (
                row.user_profiles ? (
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{row.user_profiles.full_name || row.user_profiles.email}</span>
                        <span className="text-[10px] text-gray-400">Softphone App</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-gray-400">{isRTL ? 'هاتف مادي فقط' : 'Physical Phone Only'}</span>
                )
            )
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            cell: (row) => {
                const config: Record<string, { label: string; labelAr: string; cls: string }> = {
                    online: { label: 'Online', labelAr: 'متاح', cls: 'bg-green-50 text-green-700 border-green-200' },
                    offline: { label: 'Offline', labelAr: 'غير متصل', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
                    busy: { label: 'Busy', labelAr: 'مشغول', cls: 'bg-red-50 text-red-700 border-red-200' },
                    dnd: { label: 'DND', labelAr: 'عدم الإزعاج', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                };
                const c = config[row.status] || config.offline;
                return (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full border", c.cls)}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", row.status === 'online' ? 'bg-green-500' : row.status === 'busy' ? 'bg-red-500' : 'bg-gray-400')} />
                        {isRTL ? c.labelAr : c.label}
                    </span>
                );
            },
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

    const renderActions = useCallback((row: Extension) => (
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
                        setSelectedExtension(row);
                        setSheetMode('edit');
                        setIsSheetOpen(true);
                    }}
                >
                    <Eye className="h-3.5 w-3.5" />
                    {isRTL ? 'تعديل الرقم' : 'Edit Extension'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            {/* Title & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Phone className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'الأرقام الداخلية (Extensions)' : 'Extensions'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `إجمالي ${extensions.length} رقم داخلي مسجل` : `Total ${extensions.length} extensions registered`}
                        </p>
                    </div>
                </div>

                <Button 
                    className="gap-2 px-4 h-9 text-white shadow-sm bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                        setSelectedExtension(null);
                        setSheetMode('create');
                        setIsSheetOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة رقم جديد' : 'Add Extension'}
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
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{extensions.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <Star className="w-4 h-4 me-1.5" />
                                {isRTL ? 'النشطة' : 'Active'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-emerald-100/60 text-emerald-700">{extensions.filter(c => c.is_active).length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-gray-500 font-tajawal">
                                {isRTL ? 'المعطلة' : 'Inactive'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] px-1.5 py-0 h-[18px] bg-gray-200/60">{extensions.filter(c => !c.is_active).length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Data Grid */}
                <NexaListTable<Extension>
                    data={filteredExtensions}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'البحث بالاسم أو الرقم...' : 'Search extensions...'}
                    totalCount={extensions.length}
                    countLabel={isRTL ? 'أرقام' : 'extensions'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد أرقام داخلية مضافة حالياً' : 'No extensions found'}
                    showFooter={true}
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {isSheetOpen && companyId && (
                <ExtensionSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedExtension(null);
                    }}
                    mode={sheetMode}
                    data={selectedExtension}
                    companyId={companyId}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
