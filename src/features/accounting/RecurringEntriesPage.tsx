import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    RefreshCw, Plus, Clock, CheckCircle2, XCircle,
    Loader2, Search, Play, Pause, History, FileText,
    MoreHorizontal, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Shared Components
import { AccountingPageHeader } from './components/shared/AccountingPageHeader';
import { AccountingStatsCard } from './components/shared/AccountingStatsCard';
import { StatusBadge } from './components/shared/StatusBadge';
import { DataTable, Column } from './components/shared/DataTable';

// Types
interface RecurringEntry {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    day_of_month?: number;
    day_of_week?: number;
    next_run_date: string;
    last_run_date?: string;
    total_amount: number;
    currency: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    requires_approval: boolean;
    created_at: string;
}

interface RecurringHistory {
    id: string;
    recurring_entry_id: string;
    scheduled_date: string;
    execution_date?: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
    journal_entry_id?: string;
    approved_by?: string;
    rejected_reason?: string;
    created_at: string;
}

interface PendingApproval {
    id: string;
    recurring_entry_id: string;
    entry_name: string;
    scheduled_date: string;
    total_amount: number;
    currency: string;
    created_at: string;
}

// Module-level flag: persists across component remounts (unlike ref/state)
let _historyTableExists: boolean | null = null;

export default function RecurringEntriesPage() {
    const { t, language, direction } = useLanguage();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('templates');
    const [entries, setEntries] = useState<RecurringEntry[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
    const [history, setHistory] = useState<RecurringHistory[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedEntry, setSelectedEntry] = useState<RecurringEntry | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load recurring entries
            const { data: entriesData, error: entriesError } = await supabase
                .from('recurring_entries')
                .select('*')
                .order('created_at', { ascending: false });

            if (entriesError) {
                // Table doesn't exist yet - skip all related queries
                console.warn('recurring_entries table not available:', entriesError.message);
                return;
            }

            if (entriesData) setEntries(entriesData);

            // Skip recurring_entry_history queries if we already know the table doesn't exist
            if (_historyTableExists === false) {
                // Already checked - table doesn't exist, skip silently
            } else {
                // First time - check availability with lightweight query
                if (_historyTableExists === null) {
                    const { error: historyTableCheck } = await supabase
                        .from('recurring_entry_history')
                        .select('id')
                        .limit(0);
                    _historyTableExists = !historyTableCheck;
                }

                if (_historyTableExists) {
                    // Load pending approvals
                    const { data: pendingData } = await supabase
                        .from('recurring_entry_history')
                        .select(`
                            id,
                            recurring_entry_id,
                            scheduled_date,
                            created_at,
                            recurring_entries (
                                name_ar,
                                name_en,
                                total_amount,
                                currency
                            )
                        `)
                        .eq('status', 'pending')
                        .order('scheduled_date');

                    if (pendingData) {
                        setPendingApprovals(pendingData.map(p => ({
                            id: p.id,
                            recurring_entry_id: p.recurring_entry_id,
                            entry_name: language === 'ar'
                                ? (p.recurring_entries as any)?.name_ar
                                : (p.recurring_entries as any)?.name_en,
                            scheduled_date: p.scheduled_date,
                            total_amount: (p.recurring_entries as any)?.total_amount || 0,
                            currency: (p.recurring_entries as any)?.currency || '',
                            created_at: p.created_at,
                        })));
                    }

                    // Load recent history
                    const { data: historyData } = await supabase
                        .from('recurring_entry_history')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(50);

                    if (historyData) setHistory(historyData);
                }
            }
        } catch (error) {
            // Silently handle - tables may not exist yet
            // Don't show toast since Keep All Mounted loads this even when tab isn't visible
            console.warn('Recurring entries tables not available:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter entries
    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const matchesSearch =
                entry.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.code?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [entries, searchQuery, statusFilter]);

    // Stats
    const stats = useMemo(() => {
        return {
            total: entries.length,
            active: entries.filter(e => e.status === 'active').length,
            paused: entries.filter(e => e.status === 'paused').length,
            pendingCount: pendingApprovals.length,
        };
    }, [entries, pendingApprovals]);

    const getFrequencyLabel = (freq: string) => {
        return t(`recurringEntries.frequency_${freq}`) || freq;
    };

    const formatCurrency = (amount: number, currency = '') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleApprove = async (approval: PendingApproval) => {
        setProcessing(true);
        try {
            const { error } = await supabase.rpc('approve_recurring_entry', {
                p_history_id: approval.id,
                p_user_id: null
            });

            if (error) throw error;

            toast({
                title: t('recurringEntries.messages.approved'),
                description: t('recurringEntries.messages.entryExecuted'),
            });

            loadData();
            setIsApprovalOpen(false);
        } catch (error) {
            console.error('Error approving:', error);
            toast({
                title: t('recurringEntries.messages.error'),
                description: t('recurringEntries.messages.approveError'),
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (approval: PendingApproval) => {
        if (!rejectionReason.trim()) {
            toast({
                title: t('recurringEntries.messages.required'),
                description: t('recurringEntries.messages.enterReason'),
                variant: 'destructive',
            });
            return;
        }

        setProcessing(true);
        try {
            const { error } = await supabase.rpc('reject_recurring_entry', {
                p_history_id: approval.id,
                p_user_id: null,
                p_reason: rejectionReason
            });

            if (error) throw error;

            toast({
                title: t('recurringEntries.messages.rejected'),
                description: t('recurringEntries.messages.entryRejected'),
            });

            loadData();
            setIsApprovalOpen(false);
            setRejectionReason('');
        } catch (error) {
            console.error('Error rejecting:', error);
            toast({
                title: t('recurringEntries.messages.error'),
                description: t('recurringEntries.messages.rejectError'),
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleProcessDue = async () => {
        setProcessing(true);
        try {
            const { data, error } = await supabase.rpc('process_due_recurring_entries');

            if (error) throw error;

            toast({
                title: t('recurringEntries.messages.processed'),
                description: t('recurringEntries.messages.entriesCreated').replace('{count}', String(data || 0)),
            });

            loadData();
        } catch (error) {
            console.error('Error processing:', error);
            toast({
                title: t('recurringEntries.messages.error'),
                description: t('recurringEntries.messages.processError'),
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    // Columns for Templates
    const templateColumns: Column<RecurringEntry>[] = [
        {
            header: t('recurringEntries.name'),
            cell: (row) => (
                <div>
                    <p className="font-medium">{language === 'ar' ? row.name_ar : row.name_en}</p>
                    <p className="text-xs text-muted-foreground">{row.code}</p>
                </div>
            )
        },
        {
            header: t('recurringEntries.frequency'),
            cell: (row) => <Badge variant="outline">{getFrequencyLabel(row.frequency)}</Badge>
        },
        {
            header: t('recurringEntries.amount'),
            cell: (row) => <span className="font-mono font-medium">{formatCurrency(row.total_amount, row.currency)}</span>
        },
        {
            header: t('recurringEntries.nextRun'),
            cell: (row) => formatDate(row.next_run_date)
        },
        {
            header: t('recurringEntries.status._'),
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: '',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedEntry(row); setIsDetailsOpen(true); }}>
                            <Eye className="w-4 h-4 me-2" />
                            {t('recurringEntries.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            {row.status === 'active' ? (
                                <><Pause className="w-4 h-4 me-2" />{t('recurringEntries.pause')}</>
                            ) : (
                                <><Play className="w-4 h-4 me-2" />{t('recurringEntries.activate')}</>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ];

    // Columns for History
    const historyColumns: Column<RecurringHistory>[] = [
        {
            header: t('recurringEntries.scheduledDate'),
            cell: (row) => formatDate(row.scheduled_date)
        },
        {
            header: t('recurringEntries.executionDate'),
            cell: (row) => row.execution_date ? formatDate(row.execution_date) : '-'
        },
        {
            header: t('recurringEntries.status._'),
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: t('recurringEntries.entryNumber'),
            cell: (row) => row.journal_entry_id ? (
                <Badge variant="outline" className="font-mono">
                    {row.journal_entry_id.slice(0, 8)}...
                </Badge>
            ) : '-'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-erp-teal" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10" dir={direction}>
            <AccountingPageHeader
                title={t('recurringEntries.title')}
                description={t('recurringEntries.description')}
            >
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleProcessDue}
                        disabled={processing}
                        className="gap-2"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {t('recurringEntries.processDue')}
                    </Button>
                    <Button className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
                        <Plus className="w-4 h-4" />
                        {t('recurringEntries.newEntry')}
                    </Button>
                </div>
            </AccountingPageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <AccountingStatsCard
                    title={t('recurringEntries.total')}
                    value={stats.total}
                    icon={RefreshCw}
                    variant="blue"
                />
                <AccountingStatsCard
                    title={t('recurringEntries.active')}
                    value={stats.active}
                    icon={CheckCircle2}
                    variant="green"
                />
                <AccountingStatsCard
                    title={t('recurringEntries.paused')}
                    value={stats.paused}
                    icon={Pause}
                    variant="orange"
                />
                <AccountingStatsCard
                    title={t('recurringEntries.pending')}
                    value={stats.pendingCount}
                    icon={Clock}
                    variant={stats.pendingCount > 0 ? "red" : "default"}
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Simplified Tabs List */}
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="templates" className="flex-1 sm:flex-none">{t('recurringEntries.templates')}</TabsTrigger>
                    <TabsTrigger value="pending" className="flex-1 sm:flex-none">
                        {t('recurringEntries.pending')}
                        {stats.pendingCount > 0 && (
                            <Badge variant="destructive" className="ms-2 rounded-full px-1.5 py-0 text-[10px]">{stats.pendingCount}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-1 sm:flex-none">{t('recurringEntries.history')}</TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates" className="mt-6 space-y-4">
                    <DataTable
                        data={filteredEntries}
                        columns={templateColumns}
                        actions={
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={t('recurringEntries.status._')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('recurringEntries.all')}</SelectItem>
                                    <SelectItem value="active">{t('recurringEntries.active')}</SelectItem>
                                    <SelectItem value="paused">{t('recurringEntries.paused')}</SelectItem>
                                </SelectContent>
                            </Select>
                        }
                    />
                </TabsContent>

                {/* Pending Approvals Tab */}
                <TabsContent value="pending" className="mt-6">
                    {pendingApprovals.length === 0 ? (
                        <Card className="py-12 border-dashed">
                            <CardContent className="text-center">
                                <CheckCircle2 className="w-12 h-12 mx-auto text-green-300 mb-4" />
                                <h3 className="text-lg font-semibold text-muted-foreground">
                                    {t('recurringEntries.noPending')}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {t('recurringEntries.noPendingDesc')}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingApprovals.map((approval, index) => (
                                <motion.div
                                    key={approval.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                                                    <Clock className="w-5 h-5 text-yellow-600" />
                                                </div>
                                                <div className="text-end">
                                                    <p className="font-bold font-mono">
                                                        {formatCurrency(approval.total_amount, approval.currency)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(approval.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <h4 className="font-semibold line-clamp-1">{approval.entry_name}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {t('recurringEntries.scheduledFor')} {formatDate(approval.scheduled_date)}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => { setSelectedApproval(approval); setIsApprovalOpen(true); }}
                                                    className="flex-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                >
                                                    <XCircle className="w-4 h-4 me-2" />
                                                    {t('common.reject')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(approval)}
                                                    disabled={processing}
                                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                                >
                                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                                                    {t('common.approve')}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-6">
                    <DataTable
                        data={history}
                        columns={historyColumns}
                    />
                </TabsContent>
            </Tabs>

            {/* Rejection Dialog */}
            <Sheet open={isApprovalOpen} onOpenChange={setIsApprovalOpen}>
                <SheetContent className="w-full sm:max-w-md" side={direction === 'rtl' ? 'left' : 'right'}>
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            {t('recurringEntries.rejectEntry')}
                        </SheetTitle>
                        <SheetDescription>
                            {selectedApproval?.entry_name}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>{t('recurringEntries.rejectionReason')}</Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={t('recurringEntries.rejectionPlaceholder')}
                                rows={4}
                            />
                        </div>
                    </div>

                    <SheetFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsApprovalOpen(false)}>
                            {t('recurringEntries.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedApproval && handleReject(selectedApproval)}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <XCircle className="w-4 h-4 me-2" />}
                            {t('recurringEntries.confirmReject')}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
