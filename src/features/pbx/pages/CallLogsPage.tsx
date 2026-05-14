import { useState, useMemo, useCallback } from 'react';
import { History, Play, Download, PhoneMissed, PhoneIncoming, PhoneOutgoing, PhoneCall, Filter, Calendar } from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CallLog {
    id: string;
    company_id: string;
    caller_id: string;
    destination: string;
    direction: 'inbound' | 'outbound' | 'internal';
    status: 'answered' | 'missed' | 'busy' | 'failed' | 'voicemail';
    duration: number;
    recording_url?: string;
    created_at: string;
}

export default function CallLogsPage() {
    const { t, direction: layoutDirection } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = layoutDirection === 'rtl';

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    const { data: logs = [], isLoading } = useCachedQuery({
        queryKey: ['pbx_call_logs', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_call_logs')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(500); // Limit to last 500 for performance

            if (error) throw error;
            return (data || []) as CallLog[];
        },
        enabled: !!companyId,
    });

    const filteredLogs = useMemo(() => {
        let result = logs;

        if (activeTab === 'inbound') result = result.filter(r => r.direction === 'inbound');
        if (activeTab === 'outbound') result = result.filter(r => r.direction === 'outbound');
        if (activeTab === 'missed') result = result.filter(r => r.status === 'missed');
        if (activeTab === 'recorded') result = result.filter(r => !!r.recording_url);

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r =>
                (r.caller_id || '').toLowerCase().includes(q) ||
                (r.destination || '').toLowerCase().includes(q)
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
    }, [logs, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(false); // default to newest first when changing columns
        }
    }, [sortField]);

    const getRowAccent = useCallback((row: CallLog) => {
        if (row.status === 'missed') return 'border-s-rose-400';
        if (row.direction === 'inbound') return 'border-s-emerald-400';
        if (row.direction === 'outbound') return 'border-s-blue-400';
        return 'border-s-gray-300';
    }, []);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '00:00';
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const columns: NexaListColumn<CallLog>[] = useMemo(() => [
        {
            id: 'direction_icon',
            header: '',
            cell: (row) => {
                if (row.status === 'missed') return <PhoneMissed className="w-4 h-4 text-rose-500" />;
                if (row.direction === 'inbound') return <PhoneIncoming className="w-4 h-4 text-emerald-500" />;
                if (row.direction === 'outbound') return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
                return <PhoneCall className="w-4 h-4 text-gray-500" />;
            },
        },
        {
            id: 'caller',
            header: isRTL ? 'المتصل (من)' : 'Caller (From)',
            sortable: true,
            sortKey: 'caller_id',
            cell: (row) => (
                <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    {row.caller_id}
                </span>
            ),
        },
        {
            id: 'destination',
            header: isRTL ? 'المستقبل (إلى)' : 'Destination (To)',
            sortable: true,
            sortKey: 'destination',
            cell: (row) => (
                <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    {row.destination}
                </span>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            sortable: true,
            sortKey: 'status',
            cell: (row) => {
                const config: Record<string, { label: string; cls: string }> = {
                    answered: { label: isRTL ? 'مُجاب' : 'Answered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    missed: { label: isRTL ? 'فائتة' : 'Missed', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                    busy: { label: isRTL ? 'مشغول' : 'Busy', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                    failed: { label: isRTL ? 'فشل' : 'Failed', cls: 'bg-red-50 text-red-700 border-red-200' },
                    voicemail: { label: isRTL ? 'بريد صوتي' : 'Voicemail', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                };
                const c = config[row.status] || config.failed;
                return (
                    <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border", c.cls)}>
                        {c.label}
                    </span>
                );
            },
        },
        {
            id: 'duration',
            header: isRTL ? 'المدة' : 'Duration',
            sortable: true,
            sortKey: 'duration',
            cell: (row) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {formatDuration(row.duration)}
                </span>
            ),
        },
        {
            id: 'created_at',
            header: isRTL ? 'وقت المكالمة' : 'Time',
            sortable: true,
            sortKey: 'created_at',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs text-gray-800 dark:text-gray-200">
                        {format(new Date(row.created_at), 'yyyy-MM-dd')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                        {format(new Date(row.created_at), 'HH:mm:ss')}
                    </span>
                </div>
            ),
        },
        {
            id: 'recording',
            header: isRTL ? 'التسجيل' : 'Recording',
            cell: (row) => {
                if (!row.recording_url) return <span className="text-[10px] text-gray-400">{isRTL ? 'لا يوجد' : 'None'}</span>;
                return (
                    <div className="flex items-center gap-2">
                        <audio controls className="h-8 w-40" src={row.recording_url}>
                            Your browser does not support the audio element.
                        </audio>
                        <a href={row.recording_url} target="_blank" rel="noopener noreferrer" download>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                                <Download className="w-3 h-3" />
                            </Button>
                        </a>
                    </div>
                );
            },
        },
    ], [isRTL]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={layoutDirection}>
            {/* Title & Stats */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <History className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'سجل المكالمات (CDR)' : 'Call Details Record (CDR)'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? 'استعرض وابحث واستمع لتسجيلات المكالمات السابقة' : 'Browse, search, and listen to previous call recordings'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* Tabs & Search */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={layoutDirection}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                                <History className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الكل' : 'All'}
                            </TabsTrigger>
                            <TabsTrigger value="inbound" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                <PhoneIncoming className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الواردة' : 'Inbound'}
                            </TabsTrigger>
                            <TabsTrigger value="outbound" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-blue-600 font-tajawal">
                                <PhoneOutgoing className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الصادرة' : 'Outbound'}
                            </TabsTrigger>
                            <TabsTrigger value="missed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-rose-600 font-tajawal">
                                <PhoneMissed className="w-4 h-4 me-1.5" />
                                {isRTL ? 'الفائتة' : 'Missed'}
                            </TabsTrigger>
                            <TabsTrigger value="recorded" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-purple-600 font-tajawal">
                                <Play className="w-4 h-4 me-1.5" />
                                {isRTL ? 'مسجلة' : 'Recorded'}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Data Grid */}
                <NexaListTable<CallLog>
                    data={filteredLogs}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'ابحث عن رقم أو تحويلة...' : 'Search numbers...'}
                    totalCount={logs.length}
                    countLabel={isRTL ? 'مكالمة' : 'calls'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا يوجد سجل مكالمات حتى الآن' : 'No call logs found'}
                    showFooter={true}
                    isRTL={isRTL}
                    direction={layoutDirection}
                />
            </div>
        </div>
    );
}
