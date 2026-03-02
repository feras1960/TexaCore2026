/**
 * ════════════════════════════════════════════════════════════════
 * 📅 EmpLeavesTab — الإجازات والحضور
 * 
 * ✅ وضعية الاستعراض: عرض الأرصدة + الطلبات + الحضور
 * ✅ وضعية التعديل: طلب إجازة جديد + موافقة/رفض الطلبات
 * 
 * التبويبات الفرعية:
 *   1. الأرصدة — ملخص أرصدة كل نوع إجازة
 *   2. الطلبات — قائمة طلبات الإجازات مع إدارة
 *   3. الحضور — سجل الحضور والانصراف
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
    Calendar, Clock, CheckCircle, XCircle, Sun, Plus, Loader2,
    Save, X, ThumbsUp, ThumbsDown, AlertTriangle, FileText,
} from 'lucide-react';
import {
    getLeaveTypes, createLeaveRequest, approveLeaveRequest, rejectLeaveRequest,
    type LeaveType, type LeaveRequest,
} from '../../../services/hrService';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

interface Props {
    employeeId?: string;
    isRTL: boolean;
    mode?: string;
}

const LEAVE_STATUS: Record<string, { ar: string; en: string; className: string; icon: React.ElementType }> = {
    draft: { ar: 'مسودة', en: 'Draft', className: 'bg-gray-100 text-gray-600', icon: FileText },
    pending: { ar: 'قيد المراجعة', en: 'Pending', className: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { ar: 'موافق عليها', en: 'Approved', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    rejected: { ar: 'مرفوضة', en: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
    cancelled: { ar: 'ملغاة', en: 'Cancelled', className: 'bg-gray-100 text-gray-600', icon: X },
};

const ATTEND_STATUS: Record<string, { ar: string; en: string; className: string }> = {
    present: { ar: 'حاضر', en: 'Present', className: 'bg-emerald-100 text-emerald-700' },
    absent: { ar: 'غائب', en: 'Absent', className: 'bg-red-100 text-red-700' },
    late: { ar: 'متأخر', en: 'Late', className: 'bg-amber-100 text-amber-700' },
    half_day: { ar: 'نصف يوم', en: 'Half Day', className: 'bg-blue-100 text-blue-700' },
    on_leave: { ar: 'إجازة', en: 'On Leave', className: 'bg-purple-100 text-purple-700' },
    holiday: { ar: 'عطلة', en: 'Holiday', className: 'bg-sky-100 text-sky-700' },
    weekend: { ar: 'عطلة أسبوعية', en: 'Weekend', className: 'bg-gray-100 text-gray-600' },
};

// ═══ Empty Leave Request Form ═══
const EMPTY_LEAVE = {
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    is_half_day: false,
    reason: '',
    status: 'pending' as string,
};

export default function EmpLeavesTab({ employeeId, isRTL, mode }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'edit' || mode === 'create';
    const { company, companyId } = useCompany();
    const tenantId = company?.tenant_id || companyId;

    const [subTab, setSubTab] = useState('balances');
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);

    // ─── Leave Dialog State ───
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ ...EMPTY_LEAVE });
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [saving, setSaving] = useState(false);

    // ─── Reject Dialog State ───
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectingId, setRejectingId] = useState<string>('');
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        if (!employeeId) return;
        loadData();
    }, [employeeId]);

    async function loadData() {
        setLoading(true);
        try {
            const [balRes, leaveRes, attendRes, typesRes] = await Promise.all([
                supabase.from('leave_balances')
                    .select('*, leave_types!leave_type_id(name_ar, name_en, color)')
                    .eq('employee_id', employeeId)
                    .eq('year', new Date().getFullYear()),
                supabase.from('leave_requests')
                    .select('*, leave_types!leave_type_id(name_ar, name_en, color)')
                    .eq('employee_id', employeeId)
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase.from('attendance')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .order('attendance_date', { ascending: false })
                    .limit(60),
                getLeaveTypes(),
            ]);

            setBalances(balRes.data || []);
            setLeaveRequests(leaveRes.data || []);
            setAttendance(attendRes.data || []);
            setLeaveTypes(typesRes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // ─── Leave Request CRUD ───
    function openCreateLeave() {
        setLeaveForm({ ...EMPTY_LEAVE });
        setShowLeaveDialog(true);
    }

    // Auto calculate total_days
    function updateDates(field: 'start_date' | 'end_date', value: string) {
        setLeaveForm(f => {
            const updated = { ...f, [field]: value };
            if (updated.start_date && updated.end_date) {
                const start = new Date(updated.start_date);
                const end = new Date(updated.end_date);
                const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                updated.total_days = updated.is_half_day ? 0.5 : Math.max(diff, 1);
            }
            return updated;
        });
    }

    function toggleHalfDay(checked: boolean) {
        setLeaveForm(f => ({
            ...f,
            is_half_day: checked,
            total_days: checked ? 0.5 : (() => {
                if (f.start_date && f.end_date) {
                    const diff = Math.ceil((new Date(f.end_date).getTime() - new Date(f.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return Math.max(diff, 1);
                }
                return 1;
            })(),
            end_date: checked ? f.start_date : f.end_date,
        }));
    }

    async function handleSaveLeave() {
        if (!employeeId || !leaveForm.leave_type_id) return;
        setSaving(true);
        try {
            await createLeaveRequest({
                tenant_id: tenantId,
                employee_id: employeeId,
                leave_type_id: leaveForm.leave_type_id,
                start_date: leaveForm.start_date,
                end_date: leaveForm.end_date,
                total_days: Number(leaveForm.total_days),
                is_half_day: leaveForm.is_half_day,
                reason: leaveForm.reason || null,
                status: leaveForm.status as any,
            } as any);
            toast.success(t('تم إنشاء طلب الإجازة بنجاح', 'Leave request created'));
            setShowLeaveDialog(false);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل في إنشاء الطلب', 'Failed to create request'));
        } finally {
            setSaving(false);
        }
    }

    async function handleApprove(requestId: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await approveLeaveRequest(requestId, session?.user?.id || '');
            toast.success(t('تمت الموافقة على الطلب', 'Leave request approved'));
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل في الموافقة', 'Approval failed'));
        }
    }

    function openRejectDialog(requestId: string) {
        setRejectingId(requestId);
        setRejectReason('');
        setShowRejectDialog(true);
    }

    async function handleReject() {
        if (!rejectingId) return;
        try {
            await rejectLeaveRequest(rejectingId, rejectReason);
            toast.success(t('تم رفض الطلب', 'Leave request rejected'));
            setShowRejectDialog(false);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل في الرفض', 'Rejection failed'));
        }
    }

    async function handleCancelRequest(requestId: string) {
        if (!confirm(t('هل تريد إلغاء هذا الطلب؟', 'Cancel this request?'))) return;
        try {
            await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', requestId);
            toast.success(t('تم إلغاء الطلب', 'Request cancelled'));
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل في الإلغاء', 'Cancellation failed'));
        }
    }

    // ─── Computed ───
    const totalAllocated = balances.reduce((s, b) => s + (b.allocated_days || 0), 0);
    const totalUsed = balances.reduce((s, b) => s + (b.used_days || 0), 0);
    const totalRemaining = balances.reduce((s, b) => s + (b.remaining_days || 0), 0);
    const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;

    // ─── Columns ───
    const leaveColumns: NexaListColumn<any>[] = [
        {
            id: 'type', header: t('النوع', 'Type'), width: 'w-28', cell: (row) => (
                <Badge style={{ backgroundColor: row.leave_types?.color + '22', color: row.leave_types?.color }}>
                    {isRTL ? row.leave_types?.name_ar : row.leave_types?.name_en}
                </Badge>
            )
        },
        {
            id: 'dates', header: t('الفترة', 'Period'), width: 'min-w-[130px]', cell: (row) => (
                <span className="text-xs font-mono">
                    {new Date(row.start_date).toLocaleDateString()} → {new Date(row.end_date).toLocaleDateString()}
                </span>
            )
        },
        {
            id: 'days', header: t('الأيام', 'Days'), width: 'w-16', align: 'center' as const,
            cell: (row: any) => (
                <span className="font-mono">
                    {row.is_half_day ? '½' : row.total_days}
                </span>
            )
        },
        {
            id: 'reason', header: t('السبب', 'Reason'), width: 'min-w-[100px]',
            cell: (row: any) => (
                <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                    {row.reason || '—'}
                </span>
            )
        },
        {
            id: 'status', header: t('الحالة', 'Status'), width: 'w-24', align: 'center' as const,
            cell: (row: any) => {
                const st = LEAVE_STATUS[row.status];
                return <Badge className={`text-[10px] ${st?.className}`}>{isRTL ? st?.ar : st?.en}</Badge>;
            }
        },
        ...(isEditable ? [{
            id: 'actions',
            header: '',
            width: 'w-24',
            align: 'center' as const,
            cell: (row: any) => (
                <div className="flex items-center gap-1 justify-center">
                    {row.status === 'pending' && (
                        <>
                            <Button variant="ghost" size="sm"
                                className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50"
                                title={t('موافقة', 'Approve')}
                                onClick={(e) => { e.stopPropagation(); handleApprove(row.id); }}>
                                <ThumbsUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                                title={t('رفض', 'Reject')}
                                onClick={(e) => { e.stopPropagation(); openRejectDialog(row.id); }}>
                                <ThumbsDown className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                    {(row.status === 'pending' || row.status === 'draft') && (
                        <Button variant="ghost" size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:bg-gray-100"
                            title={t('إلغاء', 'Cancel')}
                            onClick={(e) => { e.stopPropagation(); handleCancelRequest(row.id); }}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            ),
        }] : []),
    ];

    const attendColumns: NexaListColumn<any>[] = [
        {
            id: 'date', header: t('التاريخ', 'Date'), width: 'w-24',
            cell: (row) => <span className="font-mono text-xs">{new Date(row.attendance_date).toLocaleDateString()}</span>
        },
        {
            id: 'check_in', header: t('الدخول', 'In'), width: 'w-20', align: 'center' as const,
            cell: (row: any) => <span className="font-mono text-xs">{row.check_in ? new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        },
        {
            id: 'check_out', header: t('الخروج', 'Out'), width: 'w-20', align: 'center' as const,
            cell: (row: any) => <span className="font-mono text-xs">{row.check_out ? new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        },
        {
            id: 'hours', header: t('ساعات', 'Hours'), width: 'w-16', align: 'center' as const,
            cell: (row: any) => <span className="font-mono">{row.worked_hours || '—'}</span>
        },
        {
            id: 'status', header: t('الحالة', 'Status'), width: 'w-24', align: 'center' as const,
            cell: (row: any) => {
                const st = ATTEND_STATUS[row.status];
                return <Badge className={`text-[10px] ${st?.className}`}>{isRTL ? st?.ar : st?.en}</Badge>;
            }
        },
    ];

    // ═══════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* ═══ Balance Cards ═══ */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                        <Sun className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                        <p className="text-2xl font-bold font-mono">{totalAllocated}</p>
                        <p className="text-xs text-muted-foreground">{t('الرصيد المخصص', 'Allocated')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                        <CheckCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                        <p className="text-2xl font-bold font-mono text-red-600">{totalUsed}</p>
                        <p className="text-xs text-muted-foreground">{t('المستخدم', 'Used')}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                        <Calendar className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                        <p className="text-2xl font-bold font-mono text-emerald-600">{totalRemaining}</p>
                        <p className="text-xs text-muted-foreground">{t('المتبقي', 'Remaining')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Pending Alert ═══ */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-amber-700">
                        {t(`${pendingCount} طلب إجازة بانتظار المراجعة`, `${pendingCount} pending leave request(s)`)}
                    </span>
                </div>
            )}

            {/* ═══ Sub-tabs ═══ */}
            <Tabs value={subTab} onValueChange={setSubTab}>
                <div className="flex items-center justify-between mb-1">
                    <TabsList className="h-8">
                        <TabsTrigger value="balances" className="text-xs h-7">{t('الأرصدة', 'Balances')}</TabsTrigger>
                        <TabsTrigger value="requests" className="text-xs h-7">
                            {t('الطلبات', 'Requests')}
                            {pendingCount > 0 && (
                                <span className="ms-1.5 bg-amber-500 text-white text-[9px] rounded-full h-4 w-4 inline-flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="text-xs h-7">{t('الحضور', 'Attendance')}</TabsTrigger>
                    </TabsList>

                    {isEditable && subTab === 'requests' && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={openCreateLeave}>
                            <Plus className="h-3 w-3" />
                            {t('طلب إجازة', 'Request Leave')}
                        </Button>
                    )}
                </div>

                {/* ─── Balances ─── */}
                <TabsContent value="balances" className="mt-3">
                    <div className="space-y-2">
                        {balances.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: b.leave_types?.color || '#3B82F6' }} />
                                    <span className="text-sm font-medium">{isRTL ? b.leave_types?.name_ar : b.leave_types?.name_en}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span><span className="text-muted-foreground">{t('مخصص:', 'Alloc:')}</span> <span className="font-mono font-bold">{b.allocated_days}</span></span>
                                    <span><span className="text-muted-foreground">{t('مستخدم:', 'Used:')}</span> <span className="font-mono text-red-600">{b.used_days}</span></span>
                                    <span><span className="text-muted-foreground">{t('متبقي:', 'Left:')}</span> <span className="font-mono text-emerald-600 font-bold">{b.remaining_days}</span></span>
                                    {/* Progress bar */}
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${b.allocated_days > 0 ? ((b.remaining_days / b.allocated_days) * 100) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {balances.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground py-8 text-sm">{t('لا توجد أرصدة إجازات', 'No leave balances')}</p>
                        )}
                    </div>
                </TabsContent>

                {/* ─── Requests ─── */}
                <TabsContent value="requests" className="mt-3">
                    <NexaListTable
                        data={leaveRequests}
                        columns={leaveColumns}
                        isLoading={loading}
                        isRTL={isRTL}
                        direction={isRTL ? 'rtl' : 'ltr'}
                        totalCount={leaveRequests.length}
                        countLabel={t('طلب', 'requests')}
                        getRowKey={(r) => r.id}
                        emptyMessage={t('لا توجد طلبات إجازة', 'No leave requests')}
                        getRowAccent={(row) =>
                            row.status === 'approved' ? 'border-s-emerald-400' :
                                row.status === 'rejected' ? 'border-s-red-400' :
                                    row.status === 'pending' ? 'border-s-amber-400' :
                                        'border-s-gray-300'
                        }
                    />
                </TabsContent>

                {/* ─── Attendance ─── */}
                <TabsContent value="attendance" className="mt-3">
                    <NexaListTable
                        data={attendance}
                        columns={attendColumns}
                        isLoading={loading}
                        isRTL={isRTL}
                        direction={isRTL ? 'rtl' : 'ltr'}
                        totalCount={attendance.length}
                        countLabel={t('يوم', 'days')}
                        getRowKey={(r) => r.id}
                        emptyMessage={t('لا توجد سجلات حضور', 'No attendance records')}
                        getRowAccent={(row) =>
                            row.status === 'present' ? 'border-s-emerald-400' :
                                row.status === 'absent' ? 'border-s-red-400' :
                                    row.status === 'late' ? 'border-s-amber-400' :
                                        'border-s-gray-300'
                        }
                    />
                </TabsContent>
            </Tabs>

            {/* ═════════════════════════════════════════════════════ */}
            {/* ═══ Leave Request Dialog ═══ */}
            {/* ═════════════════════════════════════════════════════ */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            {t('طلب إجازة جديد', 'New Leave Request')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('تقديم طلب إجازة للموظف', 'Submit a leave request for this employee')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Leave Type */}
                        <div>
                            <Label className="text-xs mb-1.5 block">{t('نوع الإجازة', 'Leave Type')} *</Label>
                            <Select value={leaveForm.leave_type_id}
                                onValueChange={v => setLeaveForm(f => ({ ...f, leave_type_id: v }))}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('اختر نوع الإجازة', 'Select leave type')} /></SelectTrigger>
                                <SelectContent>
                                    {leaveTypes.map(lt => (
                                        <SelectItem key={lt.id} value={lt.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: lt.color }} />
                                                {isRTL ? lt.name_ar : lt.name_en || lt.name_ar}
                                                {lt.max_days_per_year && (
                                                    <span className="text-muted-foreground text-[10px]">
                                                        ({t(`حد: ${lt.max_days_per_year} يوم`, `max: ${lt.max_days_per_year}d`)})
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Half Day Toggle */}
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                            <div>
                                <Label className="text-xs font-medium">{t('نصف يوم', 'Half Day')}</Label>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{t('إجازة لنصف يوم فقط', 'Leave for half a day only')}</p>
                            </div>
                            <Switch checked={leaveForm.is_half_day} onCheckedChange={toggleHalfDay} />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('من', 'From')} *
                                </Label>
                                <Input type="date" className="h-9 text-sm"
                                    value={leaveForm.start_date}
                                    onChange={e => updateDates('start_date', e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('إلى', 'To')} *
                                </Label>
                                <Input type="date" className="h-9 text-sm"
                                    value={leaveForm.end_date}
                                    disabled={leaveForm.is_half_day}
                                    onChange={e => updateDates('end_date', e.target.value)} />
                            </div>
                        </div>

                        {/* Total Days Display */}
                        <div className="text-center py-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-600 mb-0.5">{t('إجمالي الأيام', 'Total Days')}</p>
                            <p className="text-2xl font-bold font-mono text-blue-700">{leaveForm.total_days}</p>
                        </div>

                        {/* Reason */}
                        <div>
                            <Label className="text-xs mb-1.5 block">{t('السبب', 'Reason')}</Label>
                            <Textarea className="text-sm min-h-[60px] resize-none"
                                placeholder={t('سبب الإجازة (اختياري)', 'Leave reason (optional)')}
                                value={leaveForm.reason}
                                onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
                            <X className="h-3.5 w-3.5 me-1.5" />
                            {t('إلغاء', 'Cancel')}
                        </Button>
                        <Button onClick={handleSaveLeave}
                            disabled={saving || !leaveForm.leave_type_id || !leaveForm.start_date}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Save className="h-4 w-4 me-1.5" />}
                            {saving ? t('جاري الإرسال...', 'Submitting...') : t('إرسال الطلب', 'Submit Request')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════ */}
            {/* ═══ Reject Reason Dialog ═══ */}
            {/* ═════════════════════════════════════════════════════ */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <ThumbsDown className="h-5 w-5" />
                            {t('رفض الطلب', 'Reject Request')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('الرجاء إدخال سبب الرفض', 'Please enter a rejection reason')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea className="text-sm min-h-[80px]"
                            placeholder={t('سبب الرفض...', 'Rejection reason...')}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            {t('إلغاء', 'Cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleReject}>
                            <ThumbsDown className="h-3.5 w-3.5 me-1.5" />
                            {t('رفض', 'Reject')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
