import { useState, useMemo, useCallback } from 'react';
import { PhoneForwarded, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface CallbackRequest {
    id: string;
    company_id: string;
    callback_id: string;
    visitor_number: string;
    visitor_ip: string;
    status: 'pending' | 'completed' | 'failed' | 'out_of_hours';
    notes: string;
    created_at: string;
    pbx_web_callbacks?: {
        name: string;
    };
}

export default function CallbackRequestsPage() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const dateLocale = isRTL ? ar : enUS;

    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    const { data: requests = [], isLoading, refetch } = useCachedQuery({
        queryKey: ['pbx_callback_requests', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('pbx_callback_requests')
                .select(`*, pbx_web_callbacks(name)`)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as CallbackRequest[];
        },
        enabled: !!companyId,
    });

    const filteredData = useMemo(() => {
        let result = requests;
        
        if (activeTab !== 'all') {
            result = result.filter(r => r.status === activeTab);
        }

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r => (r.visitor_number || '').includes(q));
        }

        return result.sort((a: any, b: any) => {
            let av = a[sortField] || '';
            let bv = b[sortField] || '';
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [requests, activeTab, searchTerm, sortField, sortAsc]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) setSortAsc(prev => !prev);
        else { setSortField(field); setSortAsc(true); }
    }, [sortField]);

    const getRowAccent = useCallback((row: CallbackRequest) => {
        if (row.status === 'pending') return 'border-s-amber-400';
        if (row.status === 'out_of_hours') return 'border-s-purple-400';
        if (row.status === 'completed') return 'border-s-emerald-400';
        return 'border-s-red-400';
    }, []);

    const columns: NexaListColumn<CallbackRequest>[] = useMemo(() => [
        {
            id: 'visitor_number',
            header: isRTL ? 'رقم الزائر' : 'Visitor Number',
            sortable: true,
            sortKey: 'visitor_number',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white" dir="ltr">{row.visitor_number}</span>
                    <span className="text-[10px] text-gray-400">{row.pbx_web_callbacks?.name || 'Unknown Widget'}</span>
                </div>
            )
        },
        {
            id: 'created_at',
            header: isRTL ? 'وقت الطلب' : 'Request Time',
            sortable: true,
            sortKey: 'created_at',
            cell: (row) => (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                    {format(new Date(row.created_at), 'dd MMM yyyy - hh:mm a', { locale: dateLocale })}
                </span>
            )
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            cell: (row) => {
                const config: Record<string, { label: string, cls: string, icon: any }> = {
                    pending: { label: isRTL ? 'قيد الانتظار' : 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
                    out_of_hours: { label: isRTL ? 'خارج الدوام' : 'Out of Hours', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: AlertCircle },
                    completed: { label: isRTL ? 'مكتمل' : 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
                    failed: { label: isRTL ? 'فشل' : 'Failed', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
                };
                const c = config[row.status];
                const Icon = c.icon;
                return (
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border", c.cls)}>
                        <Icon className="w-3 h-3" />
                        {c.label}
                    </span>
                );
            }
        }
    ], [isRTL, dateLocale]);

    return (
        <div className="h-full flex flex-col space-y-3" dir={direction}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <PhoneForwarded className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                            {isRTL ? 'طلبات الاتصال (Callback Requests)' : 'Callback Requests'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isRTL ? `إجمالي ${requests.length} طلب مسجل` : `Total ${requests.length} requests`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-3">
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                        <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
                            <TabsTrigger value="all" className="text-[13px] px-4 h-9 font-tajawal">
                                {isRTL ? 'الكل' : 'All'}
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="text-[13px] px-4 h-9 text-amber-600 font-tajawal">
                                {isRTL ? 'قيد الانتظار' : 'Pending'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] bg-amber-100 text-amber-700">
                                    {requests.filter(r => r.status === 'pending').length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="out_of_hours" className="text-[13px] px-4 h-9 text-purple-600 font-tajawal">
                                {isRTL ? 'خارج الدوام' : 'Out of Hours'}
                                <Badge variant="secondary" className="ms-1.5 text-[11px] bg-purple-100 text-purple-700">
                                    {requests.filter(r => r.status === 'out_of_hours').length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                                {isRTL ? 'مكتملة' : 'Completed'}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <NexaListTable<CallbackRequest>
                    data={filteredData}
                    columns={columns}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={isRTL ? 'ابحث برقم الهاتف...' : 'Search phone numbers...'}
                    totalCount={requests.length}
                    countLabel={isRTL ? 'طلبات' : 'requests'}
                    sortField={sortField}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    getRowAccent={getRowAccent}
                    onRowClick={() => {}}
                    getRowKey={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={isRTL ? 'لا توجد طلبات اتصال' : 'No callback requests found'}
                    isRTL={isRTL}
                    direction={direction}
                />
            </div>
        </div>
    );
}
