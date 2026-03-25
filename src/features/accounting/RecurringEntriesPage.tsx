/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 RecurringEntriesPage — صفحة القيود المتكررة
 * ════════════════════════════════════════════════════════════════
 * بنمط NexaListTable — جدول احترافي + بطاقات إحصائية
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    RefreshCw, Plus, CheckCircle2, Pause, Play,
    Loader2, Zap, Calendar, Hash, DollarSign,
    AlertCircle, FileText, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { UnifiedAccountingSheet } from './components/unified/UnifiedAccountingSheet';

interface RecurringEntry {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    description?: string;
    frequency: string;
    day_of_month?: number;
    day_of_week?: number;
    next_run_date: string;
    last_run_date?: string;
    amount: number;
    currency: string;
    status: string;
    requires_approval: boolean;
    auto_post: boolean;
    times_executed: number;
    max_executions?: number;
    start_date: string;
    end_date?: string;
    created_at: string;
}

const FREQUENCY_LABELS: Record<string, { ar: string; en: string }> = {
    daily: { ar: 'يومي', en: 'Daily' },
    weekly: { ar: 'أسبوعي', en: 'Weekly' },
    bi_weekly: { ar: 'نصف شهري', en: 'Bi-weekly' },
    monthly: { ar: 'شهري', en: 'Monthly' },
    quarterly: { ar: 'ربع سنوي', en: 'Quarterly' },
    semi_annual: { ar: 'نصف سنوي', en: 'Semi-annual' },
    yearly: { ar: 'سنوي', en: 'Yearly' },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; labelAr: string; labelEn: string; color: string; bg: string }> = {
    active: { icon: Play, labelAr: 'نشط', labelEn: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    draft: { icon: FileText, labelAr: 'مسودة', labelEn: 'Draft', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
    paused: { icon: Pause, labelAr: 'متوقف', labelEn: 'Paused', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    completed: { icon: CheckCircle2, labelAr: 'مكتمل', labelEn: 'Completed', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    cancelled: { icon: AlertCircle, labelAr: 'ملغي', labelEn: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export default function RecurringEntriesPage() {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const { companyId } = useCompany();

    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<RecurringEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Sort state
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'view' | 'edit' | 'create'>('create');
    const [selectedEntry, setSelectedEntry] = useState<RecurringEntry | null>(null);

    // ═══ Load Data ═══
    const loadData = useCallback(async () => {
        if (!companyId) {
            console.warn('[RecurringEntries] No companyId available');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            console.log('[RecurringEntries] Loading for company:', companyId);
            const { data: entriesData, error } = await supabase
                .from('recurring_entries')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            console.log('[RecurringEntries] Result:', { count: entriesData?.length, error: error?.message });

            if (error) {
                console.error('[RecurringEntries] Load error:', error);
                toast.error(isRTL ? `خطأ في تحميل البيانات: ${error.message}` : `Load error: ${error.message}`);
                return;
            }

            if (entriesData) {
                console.log('[RecurringEntries] Loaded entries:', entriesData);
                setEntries(entriesData);
            }
        } catch (error: any) {
            console.error('[RecurringEntries] Exception:', error);
            toast.error(error?.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [companyId, isRTL]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ═══ Statistics ═══
    const stats = useMemo(() => {
        const total = entries.length;
        const active = entries.filter(e => e.status === 'active').length;
        const paused = entries.filter(e => e.status === 'paused').length;
        const totalAmount = entries.filter(e => e.status === 'active').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { total, active, paused, totalAmount };
    }, [entries]);

    // ═══ Format helpers ═══
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // ═══ Sort handler ═══
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    // ═══ Sorted and filtered data ═══
    const filteredData = useMemo(() => {
        let result = [...entries];

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(e =>
                (e.name_ar || '').toLowerCase().includes(q) ||
                (e.name_en || '').toLowerCase().includes(q) ||
                (e.description || '').toLowerCase().includes(q) ||
                (e.code || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result.sort((a: any, b: any) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortAsc ? -1 : 1;
            if (aVal > bVal) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [entries, searchTerm, sortField, sortAsc]);

    // ═══ Actions ═══
    const handleNewEntry = () => {
        setSelectedEntry(null);
        setSheetMode('create');
        setSheetOpen(true);
    };

    const handleViewEntry = async (entry: RecurringEntry) => {
        setSelectedEntry(entry);
        setSheetMode('view');

        // Fetch lines from recurring_entry_lines
        try {
            const { data: linesData } = await supabase
                .from('recurring_entry_lines')
                .select('*')
                .eq('recurring_entry_id', entry.id)
                .order('line_number', { ascending: true });

            if (linesData && linesData.length > 0) {
                // Fetch account names
                const accountIds = [...new Set(linesData.map(l => l.account_id).filter(Boolean))];
                let accountMap: Record<string, any> = {};
                if (accountIds.length > 0) {
                    const { data: accounts } = await supabase
                        .from('chart_of_accounts')
                        .select('id, name_ar, name_en, account_code')
                        .in('id', accountIds);
                    if (accounts) {
                        for (const a of accounts) accountMap[a.id] = a;
                    }
                }

                const mappedLines = linesData.map(line => {
                    const acct = accountMap[line.account_id] || {};
                    return {
                        ...line,
                        account_name: acct.name_ar || acct.name_en || '',
                        account_code: acct.account_code || '',
                        account: acct,
                    };
                });

                // Store lines in the entry for the sheet
                setSelectedEntry(prev => prev ? { ...prev, lines: mappedLines } as any : null);
            }
        } catch (err) {
            console.error('[RecurringEntries] Failed to load lines:', err);
        }

        setSheetOpen(true);
    };

    const handleExecuteNow = async (entry: RecurringEntry) => {
        try {
            // Create history record then execute
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            // First create a history record with auto_approved
            const { data: historyData, error: historyErr } = await supabase
                .from('recurring_entry_history')
                .insert({
                    tenant_id: (entry as any).tenant_id,
                    recurring_entry_id: entry.id,
                    scheduled_date: new Date().toISOString().split('T')[0],
                    amount: entry.amount,
                    approval_status: 'auto_approved',
                    status: 'pending',
                })
                .select('id')
                .single();

            if (historyErr) throw historyErr;

            // Execute via RPC
            const { data: result, error: execErr } = await supabase.rpc('execute_recurring_entry', {
                p_history_id: historyData.id,
                p_user_id: userId,
            });

            if (execErr) throw execErr;

            if (result?.success) {
                toast.success(isRTL ? '✅ تم تنفيذ القيد وإنشاء قيد محاسبي' : '✅ Entry executed successfully');
                loadData();
            } else {
                toast.error(result?.error || (isRTL ? 'فشل التنفيذ' : 'Execution failed'));
            }
        } catch (err: any) {
            console.error('[Execute]', err);
            toast.error(err?.message || 'Error');
        }
    };

    const handleToggleStatus = async (entry: RecurringEntry) => {
        const newStatus = entry.status === 'active' ? 'paused' : 'active';
        const { error } = await supabase
            .from('recurring_entries')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', entry.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(
                newStatus === 'active'
                    ? (isRTL ? '✅ تم تفعيل القيد' : '✅ Activated')
                    : (isRTL ? '⏸ تم إيقاف القيد مؤقتاً' : '⏸ Paused')
            );
            loadData();
        }
    };

    const handleDelete = async (entry: RecurringEntry) => {
        if (!confirm(isRTL ? 'هل تريد حذف هذا القيد المتكرر؟' : 'Delete this recurring entry?')) return;
        const { error } = await supabase.from('recurring_entries').delete().eq('id', entry.id);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success(isRTL ? 'تم الحذف' : 'Deleted');
            loadData();
        }
    };

    // ═══ Sheet data ═══
    const sheetData = useMemo(() => {
        if (!selectedEntry) return { type: 'recurring' };
        return {
            ...selectedEntry,
            type: 'recurring',
        };
    }, [selectedEntry]);

    // ═══ NexaListTable Columns ═══
    const columns: NexaListColumn<RecurringEntry>[] = useMemo(() => {
        const cols: NexaListColumn<RecurringEntry>[] = [
            {
                id: 'name_ar',
                header: isRTL ? 'اسم القيد' : 'Entry Name',
                width: 'min-w-[200px]',
                sortable: true,
                sortKey: 'name_ar',
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-[13px]">
                            {isRTL ? row.name_ar : (row.name_en || row.name_ar)}
                        </span>
                        {row.description && (
                            <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                {row.description}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                id: 'status',
                header: isRTL ? 'الحالة' : 'Status',
                sortable: true,
                sortKey: 'status',
                cell: (row) => {
                    const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.draft;
                    const Icon = cfg.icon;
                    return (
                        <Badge variant="outline" className={cn('text-[11px] py-0.5', cfg.color, cfg.bg)}>
                            <Icon className="w-3 h-3 me-1" />
                            {isRTL ? cfg.labelAr : cfg.labelEn}
                        </Badge>
                    );
                },
            },
            {
                id: 'frequency',
                header: isRTL ? 'التكرار' : 'Frequency',
                sortable: true,
                sortKey: 'frequency',
                cell: (row) => {
                    const freq = FREQUENCY_LABELS[row.frequency] || { ar: row.frequency, en: row.frequency };
                    return (
                        <span className="text-[12px] text-purple-600 font-medium">
                            <RefreshCw className="w-3 h-3 inline me-1" />
                            {isRTL ? freq.ar : freq.en}
                        </span>
                    );
                },
            },
            {
                id: 'amount',
                header: isRTL ? 'المبلغ' : 'Amount',
                sortable: true,
                sortKey: 'amount',
                align: 'center',
                cell: (row) => (
                    <span className="font-mono font-bold text-[13px] text-gray-900 dark:text-gray-100" dir="ltr">
                        {formatCurrency(row.amount)} {row.currency}
                    </span>
                ),
            },
            {
                id: 'next_run_date',
                header: isRTL ? 'التنفيذ القادم' : 'Next Run',
                sortable: true,
                sortKey: 'next_run_date',
                cell: (row) => (
                    <span className="text-[12px] text-gray-600 dark:text-gray-400">
                        <Calendar className="w-3 h-3 inline me-1" />
                        {formatDate(row.next_run_date)}
                    </span>
                ),
            },
            {
                id: 'times_executed',
                header: isRTL ? 'مرات التنفيذ' : 'Executions',
                sortable: true,
                sortKey: 'times_executed',
                align: 'center',
                cell: (row) => (
                    <span className="font-mono text-[12px]">
                        <Hash className="w-3 h-3 inline me-1 text-gray-400" />
                        {row.times_executed || 0}
                        {row.max_executions ? ` / ${row.max_executions}` : ''}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: isRTL ? 'إجراءات' : 'Actions',
                align: 'center',
                cell: (row) => (
                    <div className="flex items-center gap-1 justify-center">
                        {row.status === 'active' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); handleExecuteNow(row); }}
                                className="h-7 px-2 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                title={isRTL ? 'تنفيذ الآن' : 'Execute Now'}
                            >
                                <Zap className="w-3.5 h-3.5 me-1" />
                                <span className="text-[11px]">{isRTL ? 'تنفيذ' : 'Run'}</span>
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(row); }}
                            className={cn(
                                "h-7 px-2",
                                row.status === 'active'
                                    ? "text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                            )}
                            title={row.status === 'active' ? (isRTL ? 'إيقاف' : 'Pause') : (isRTL ? 'تفعيل' : 'Activate')}
                        >
                            {row.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                            className="h-7 px-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                            title={isRTL ? 'حذف' : 'Delete'}
                        >
                            <AlertCircle className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                ),
            },
        ];

        return cols;
    }, [isRTL, entries]);

    return (
        <div className="space-y-4">
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
                        <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {isRTL ? 'القيود المتكررة' : 'Recurring Entries'}
                        </h2>
                        <p className="text-xs text-gray-500">
                            {isRTL ? 'إدارة القيود الدورية والمجدولة' : 'Manage scheduled and recurring entries'}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleNewEntry}
                    className="gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md shadow-purple-500/20"
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'قيد متكرر جديد' : 'New Recurring Entry'}
                </Button>
            </div>

            {/* ═══ Stats Cards ═══ */}
            <div className="grid grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] text-gray-500 mb-1">{isRTL ? 'الإجمالي' : 'Total'}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] text-gray-500 mb-1">{isRTL ? 'نشط' : 'Active'}</p>
                                <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-amber-50/30 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] text-gray-500 mb-1">{isRTL ? 'متوقف' : 'Paused'}</p>
                                <p className="text-2xl font-bold text-amber-600">{stats.paused}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <Pause className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-indigo-50/30 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] text-gray-500 mb-1">{isRTL ? 'إجمالي شهري' : 'Monthly Total'}</p>
                                <p className="text-lg font-bold text-indigo-600 font-mono" dir="ltr">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                <DollarSign className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ NexaListTable ═══ */}
            <NexaListTable
                data={filteredData}
                columns={columns}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder={isRTL ? 'بحث في القيود المتكررة...' : 'Search recurring entries...'}
                totalCount={filteredData.length}
                countLabel={isRTL ? 'قيد' : 'entries'}
                sortField={sortField}
                sortAsc={sortAsc}
                onSort={handleSort}
                onRowClick={(row) => handleViewEntry(row)}
                getRowKey={(row: any) => row.id}
                isLoading={loading}
                emptyIcon={<RefreshCw className="w-12 h-12 text-gray-300" />}
                emptyMessage={isRTL ? 'لا توجد قيود متكررة' : 'No recurring entries'}
                showFooter={true}
                footerLeftText={`${filteredData.length} ${isRTL ? 'قيد متكرر' : 'recurring entries'}`}
                footerRightContent={
                    <div className="flex items-center gap-4 text-xs font-mono font-bold">
                        <span className="text-emerald-600">
                            {isRTL ? 'نشط: ' : 'Active: '}{stats.active}
                        </span>
                        <span className="text-purple-600">
                            {isRTL ? 'إجمالي: ' : 'Total: '}{formatCurrency(stats.totalAmount)}
                        </span>
                    </div>
                }
                isRTL={isRTL}
                direction={direction}
            />

            {/* ═══ UnifiedAccountingSheet ═══ */}
            <UnifiedAccountingSheet
                key={`recurring-${selectedEntry?.id || 'new'}-${sheetOpen}`}
                isOpen={sheetOpen}
                onClose={() => {
                    setSheetOpen(false);
                    setSelectedEntry(null);
                    // Reload data after close with small delay to ensure DB write completes
                    setTimeout(() => loadData(), 300);
                }}
                docType="recurring"
                mode={sheetMode}
                data={sheetData}
                documentId={selectedEntry?.id}
                onRefresh={loadData}
            />
        </div>
    );
}
