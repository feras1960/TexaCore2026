/**
 * ════════════════════════════════════════════════════════════════
 * 📝 RecurringHistoryTab — سجل تنفيذ القيود المتكررة
 * ════════════════════════════════════════════════════════════════
 * يعرض: تاريخ التنفيذ، الحالة، القيد المُولّد، المُعتمد
 * + أزرار الموافقة/الرفض للقيود المعلّقة
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    CheckCircle2, XCircle, Clock, AlertTriangle,
    ExternalLink, Loader2, History, FileText, Zap,
    Check, X, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface HistoryEntry {
    id: string;
    scheduled_date: string;
    executed_at: string | null;
    executed_by: string | null;
    amount: number;
    status: string;
    approval_status: string | null;
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    journal_entry_id: string | null;
    error_message: string | null;
    created_at: string;
}

interface RecurringHistoryTabProps {
    data: any;
    onOpenJournalEntry?: (journalEntryId: string) => void;
}

export function RecurringHistoryTab({ data, onOpenJournalEntry }: RecurringHistoryTabProps) {
    const { language, direction } = useLanguage();
    const { user } = useAuth();
    const isRTL = direction === 'rtl';

    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; historyId: string | null }>({ open: false, historyId: null });
    const [rejectReason, setRejectReason] = useState('');

    const fetchHistory = useCallback(async () => {
        if (!data?.id) return;
        setLoading(true);
        try {
            const { data: histData, error } = await supabase
                .from('recurring_entry_history')
                .select('*')
                .eq('recurring_entry_id', data.id)
                .order('scheduled_date', { ascending: false })
                .limit(50);

            if (!error && histData) setHistory(histData);
        } catch (err) {
            console.error('[RecurringHistoryTab] error:', err);
        } finally {
            setLoading(false);
        }
    }, [data?.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // ═══ Approve Handler ═══
    const handleApprove = useCallback(async (historyId: string) => {
        setActionLoading(historyId);
        try {
            const { data: result, error } = await supabase.rpc('approve_recurring_entry', {
                p_history_id: historyId,
                p_user_id: user?.id || null,
                p_execute_now: true,
            });

            if (error) throw error;

            if (result?.success) {
                toast.success(isRTL ? 'تمت الموافقة وتم ترحيل القيد بنجاح ✅' : 'Approved and posted successfully ✅');
                fetchHistory();
            } else {
                toast.error(result?.error || (isRTL ? 'فشل التنفيذ' : 'Execution failed'));
            }
        } catch (err: any) {
            console.error('[approve]', err);
            toast.error(err?.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
        } finally {
            setActionLoading(null);
        }
    }, [user?.id, isRTL, fetchHistory]);

    // ═══ Reject Handler ═══
    const handleReject = useCallback(async () => {
        const historyId = rejectDialog.historyId;
        if (!historyId) return;

        setActionLoading(historyId);
        try {
            const { data: result, error } = await supabase.rpc('reject_recurring_entry', {
                p_history_id: historyId,
                p_user_id: user?.id || null,
                p_reason: rejectReason || (isRTL ? 'تم الرفض' : 'Rejected'),
            });

            if (error) throw error;

            if (result?.success) {
                toast.success(isRTL ? 'تم رفض القيد ❌' : 'Entry rejected ❌');
                setRejectDialog({ open: false, historyId: null });
                setRejectReason('');
                fetchHistory();
            } else {
                toast.error(result?.error || (isRTL ? 'فشل الرفض' : 'Rejection failed'));
            }
        } catch (err: any) {
            console.error('[reject]', err);
            toast.error(err?.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
        } finally {
            setActionLoading(null);
        }
    }, [rejectDialog.historyId, rejectReason, user?.id, isRTL, fetchHistory]);

    const formatDate = (date: string | null) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const formatDateTime = (date: string | null) => {
        if (!date) return '—';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const getStatusConfig = (status: string, approvalStatus: string | null) => {
        if (approvalStatus === 'rejected') return {
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            label: isRTL ? 'مرفوض' : 'Rejected',
        };
        if (status === 'executed' || approvalStatus === 'approved' || approvalStatus === 'auto_approved') return {
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-200 dark:border-emerald-800',
            label: isRTL ? 'تم التنفيذ' : 'Executed',
        };
        if (status === 'failed') return {
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            label: isRTL ? 'فشل' : 'Failed',
        };
        return {
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            label: isRTL ? 'بانتظار الموافقة ⏳' : 'Awaiting Approval ⏳',
        };
    };

    // Stats
    const stats = useMemo(() => {
        const executed = history.filter(h => h.status === 'executed').length;
        const pending = history.filter(h => h.status === 'pending' && h.approval_status === 'pending').length;
        const failed = history.filter(h => h.status === 'failed').length;
        const rejected = history.filter(h => h.approval_status === 'rejected').length;
        return { executed, pending, failed, rejected, total: history.length };
    }, [history]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4 p-1">
            {/* ═══ Mini Stats ═══ */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: isRTL ? 'تم التنفيذ' : 'Executed', value: stats.executed, color: 'text-emerald-600 bg-emerald-50' },
                    { label: isRTL ? 'بانتظار الموافقة' : 'Pending', value: stats.pending, color: 'text-blue-600 bg-blue-50' },
                    { label: isRTL ? 'فشل' : 'Failed', value: stats.failed, color: 'text-amber-600 bg-amber-50' },
                    { label: isRTL ? 'مرفوض' : 'Rejected', value: stats.rejected, color: 'text-red-600 bg-red-50' },
                ].map(s => (
                    <div key={s.label} className={cn('rounded-lg p-3 text-center', s.color)}>
                        <p className="text-2xl font-bold font-mono">{s.value}</p>
                        <p className="text-[10px] font-medium font-tajawal mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ═══ History List ═══ */}
            {history.length === 0 ? (
                <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-tajawal">
                        {isRTL ? 'لا يوجد سجل تنفيذ بعد' : 'No execution history yet'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {isRTL ? 'سيظهر السجل بعد أول تنفيذ' : 'History will appear after first execution'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {history.map((entry, idx) => {
                        const config = getStatusConfig(entry.status, entry.approval_status);
                        const StatusIcon = config.icon;
                        const isPending = entry.status === 'pending' && entry.approval_status === 'pending';
                        const isProcessing = actionLoading === entry.id;

                        return (
                            <div
                                key={entry.id}
                                className={cn(
                                    'rounded-xl border p-3 transition-all hover:shadow-sm',
                                    config.bg, config.border,
                                    isPending && 'ring-2 ring-blue-300 dark:ring-blue-700 animate-pulse-subtle',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* Left: Status + Dates */}
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                                            config.bg,
                                        )}>
                                            <StatusIcon className={cn('w-4 h-4', config.color)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={cn('text-[10px] font-mono', config.color)}>
                                                    {config.label}
                                                </Badge>
                                                <span className="text-xs text-gray-500 font-mono">
                                                    #{stats.total - idx}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                                                <span className="font-medium">{isRTL ? 'المجدول:' : 'Scheduled:'}</span>{' '}
                                                {formatDate(entry.scheduled_date)}
                                            </p>
                                            {entry.executed_at && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    <span className="font-medium">{isRTL ? 'المنفّذ:' : 'Executed:'}</span>{' '}
                                                    {formatDateTime(entry.executed_at)}
                                                </p>
                                            )}
                                            {entry.rejection_reason && (
                                                <p className="text-xs text-red-600 mt-1.5 bg-red-50 dark:bg-red-900/30 rounded px-2 py-1">
                                                    {isRTL ? 'السبب:' : 'Reason:'} {entry.rejection_reason}
                                                </p>
                                            )}
                                            {entry.error_message && (
                                                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 dark:bg-amber-900/30 rounded px-2 py-1">
                                                    {isRTL ? 'الخطأ:' : 'Error:'} {entry.error_message}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* ═══ Approve/Reject Buttons for Pending ═══ */}
                                        {isPending && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => handleApprove(entry.id)}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <ThumbsUp className="w-3 h-3" />
                                                    )}
                                                    {isRTL ? 'موافقة' : 'Approve'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                                    onClick={() => setRejectDialog({ open: true, historyId: entry.id })}
                                                    disabled={isProcessing}
                                                >
                                                    <ThumbsDown className="w-3 h-3" />
                                                    {isRTL ? 'رفض' : 'Reject'}
                                                </Button>
                                            </>
                                        )}

                                        {/* Journal Entry Link */}
                                        {entry.journal_entry_id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                onClick={() => onOpenJournalEntry?.(entry.journal_entry_id!)}
                                            >
                                                <FileText className="w-3 h-3" />
                                                {isRTL ? 'القيد' : 'Entry'}
                                                <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ Reject Confirmation Dialog ═══ */}
            <Dialog open={rejectDialog.open} onOpenChange={(open) => {
                if (!open) {
                    setRejectDialog({ open: false, historyId: null });
                    setRejectReason('');
                }
            }}>
                <DialogContent className="sm:max-w-md font-tajawal" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500" />
                            {isRTL ? 'رفض القيد المتكرر' : 'Reject Recurring Entry'}
                        </DialogTitle>
                        <DialogDescription>
                            {isRTL
                                ? 'الرجاء ذكر سبب الرفض (اختياري). سيتم إشعار منشئ القيد بالنتيجة.'
                                : 'Please provide a rejection reason (optional). The entry creator will be notified.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder={isRTL ? 'سبب الرفض...' : 'Rejection reason...'}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectDialog({ open: false, historyId: null });
                                setRejectReason('');
                            }}
                        >
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={actionLoading !== null}
                            className="gap-1.5"
                        >
                            {actionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
                            {isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default RecurringHistoryTab;

