import { useState, useMemo, useCallback } from 'react';
import { PhoneOutgoing, Plus, Code, Eye, MoreHorizontal } from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WebRTCWidgetSheet } from '../components/WebRTCWidgetSheet';
import { WebRTCSnippetModal } from '../components/WebRTCSnippetModal';

export interface WebRTCWidget {
    id: string;
    company_id: string;
    name: string;
    target_destination: string;
    allowed_domains: string[];
    theme_color: string;
    button_text: string;
    is_active: boolean;
    created_at: string;
}

export default function WebRTCWidgetsPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('name');
    const [sortAsc, setSortAsc] = useState(true);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [selectedWidget, setSelectedWidget] = useState<WebRTCWidget | null>(null);
    const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);

    const { data: widgets = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_webrtc_widgets', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_webrtc_widgets')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as WebRTCWidget[];
        },
        enabled: !!companyId,
    });

    const filteredData = useMemo(() => {
        let result = widgets;
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(w => (w.name || '').toLowerCase().includes(q));
        }
        return result.sort((a: any, b: any) => {
            let av = a[sortField] || '';
            let bv = b[sortField] || '';
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [widgets, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) setSortAsc(prev => !prev);
        else { setSortField(field); setSortAsc(true); }
    }, [sortField]);

    const getRowAccent = useCallback((row: WebRTCWidget) => {
        return row.is_active ? 'border-s-emerald-500' : 'border-s-gray-300';
    }, []);

    const columns: NexaListColumn<WebRTCWidget>[] = useMemo(() => [
        {
            id: 'name',
            header: isRTL ? 'اسم الويدجت' : 'Widget Name',
            sortable: true,
            sortKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <PhoneOutgoing className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm">{row.name}</span>
                </div>
            )
        },
        {
            id: 'target_destination',
            header: isRTL ? 'الوجهة (الاتصال بـ)' : 'Target Destination',
            cell: (row) => (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                    <strong className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{row.target_destination}</strong>
                </span>
            )
        },
        {
            id: 'domains',
            header: isRTL ? 'النطاقات المسموحة' : 'Allowed Domains',
            cell: (row) => (
                <div className="flex flex-wrap gap-1">
                    {row.allowed_domains && row.allowed_domains.length > 0 ? (
                        row.allowed_domains.map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] text-gray-600">{d}</span>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400">{isRTL ? 'الكل (غير آمن)' : 'All (Insecure)'}</span>
                    )}
                </div>
            )
        },
        {
            id: 'is_active',
            header: isRTL ? 'الحالة' : 'Status',
            cell: (row) => (
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", row.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200')}>
                    {row.is_active ? (isRTL ? 'فعال' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                </span>
            )
        }
    ], [isRTL]);

    const renderActions = useCallback((row: WebRTCWidget) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[150px]">
                <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSelectedWidget(row); setSheetMode('edit'); setIsSheetOpen(true); }} className="gap-2 cursor-pointer text-sm">
                    <Eye className="h-3.5 w-3.5" /> {isRTL ? 'تعديل الإعدادات' : 'Edit Settings'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedWidget(row); setIsSnippetModalOpen(true); }} className="gap-2 cursor-pointer text-sm text-emerald-600">
                    <Code className="h-3.5 w-3.5" /> {isRTL ? 'توليد الكود (Snippet)' : 'Get Snippet Code'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ), [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                        <PhoneOutgoing className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'الاتصال المباشر (Click-to-Call)' : 'Click-to-Call Widgets'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `اتصال صوتي مجاني من المتصفح مباشرة` : `Free voice calls directly from browser`}
                        </p>
                    </div>
                </div>
                <Button className="gap-2 px-4 h-9 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedWidget(null); setSheetMode('create'); setIsSheetOpen(true); }}>
                    <Plus className="w-4 h-4" /> {isRTL ? 'إنشاء ويدجت جديد' : 'Create Widget'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <NexaListTable<WebRTCWidget>
                    data={filteredData}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'ابحث عن ويدجت...' : 'Search widgets...'}
                    totalCount={widgets.length}
                    countLabel={isRTL ? 'ويدجت' : 'widgets'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد ويدجت اتصال مباشر' : 'No WebRTC widgets found'}
                    renderActions={renderActions}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>

            {isSheetOpen && companyId && (
                <WebRTCWidgetSheet
                    isOpen={isSheetOpen}
                    onClose={() => { setIsSheetOpen(false); setSelectedWidget(null); }}
                    mode={sheetMode}
                    data={selectedWidget}
                    companyId={companyId}
                    onSuccess={() => refetch()}
                />
            )}

            {isSnippetModalOpen && selectedWidget && (
                <WebRTCSnippetModal
                    isOpen={isSnippetModalOpen}
                    onClose={() => { setIsSnippetModalOpen(false); setSelectedWidget(null); }}
                    widgetData={selectedWidget}
                />
            )}
        </div>
    );
}
