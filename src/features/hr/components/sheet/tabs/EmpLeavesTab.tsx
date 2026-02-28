/**
 * 📅 EmpLeavesTab — الإجازات والحضور
 */

import { useState, useEffect } from 'react';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, XCircle, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props { employeeId?: string; isRTL: boolean; }

const LEAVE_STATUS: Record<string, { ar: string; en: string; className: string }> = {
    draft: { ar: 'مسودة', en: 'Draft', className: 'bg-gray-100 text-gray-600' },
    pending: { ar: 'قيد المراجعة', en: 'Pending', className: 'bg-amber-100 text-amber-700' },
    approved: { ar: 'موافق عليها', en: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
    rejected: { ar: 'مرفوضة', en: 'Rejected', className: 'bg-red-100 text-red-700' },
    cancelled: { ar: 'ملغاة', en: 'Cancelled', className: 'bg-gray-100 text-gray-600' },
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

export default function EmpLeavesTab({ employeeId, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [subTab, setSubTab] = useState('balances');
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);

    useEffect(() => {
        if (!employeeId) return;
        loadData();
    }, [employeeId]);

    async function loadData() {
        setLoading(true);
        try {
            const [balRes, leaveRes, attendRes] = await Promise.all([
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
            ]);

            setBalances(balRes.data || []);
            setLeaveRequests(leaveRes.data || []);
            setAttendance(attendRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const totalAllocated = balances.reduce((s, b) => s + (b.allocated_days || 0), 0);
    const totalUsed = balances.reduce((s, b) => s + (b.used_days || 0), 0);
    const totalRemaining = balances.reduce((s, b) => s + (b.remaining_days || 0), 0);

    const leaveColumns: NexaListColumn<any>[] = [
        { id: 'type', header: t('النوع', 'Type'), width: 'w-28', cell: (row) => <Badge style={{ backgroundColor: row.leave_types?.color + '22', color: row.leave_types?.color }}>{isRTL ? row.leave_types?.name_ar : row.leave_types?.name_en}</Badge> },
        { id: 'dates', header: t('الفترة', 'Period'), width: 'min-w-[130px]', cell: (row) => <span className="text-xs font-mono">{new Date(row.start_date).toLocaleDateString()} → {new Date(row.end_date).toLocaleDateString()}</span> },
        { id: 'days', header: t('الأيام', 'Days'), width: 'w-16', align: 'center' as const, cell: (row: any) => <span className="font-mono">{row.total_days}</span> },
        { id: 'status', header: t('الحالة', 'Status'), width: 'w-24', align: 'center' as const, cell: (row: any) => { const st = LEAVE_STATUS[row.status]; return <Badge className={st?.className}>{isRTL ? st?.ar : st?.en}</Badge>; } },
    ];

    const attendColumns: NexaListColumn<any>[] = [
        { id: 'date', header: t('التاريخ', 'Date'), width: 'w-24', cell: (row) => <span className="font-mono text-xs">{new Date(row.attendance_date).toLocaleDateString()}</span> },
        { id: 'check_in', header: t('الدخول', 'In'), width: 'w-20', align: 'center' as const, cell: (row: any) => <span className="font-mono text-xs">{row.check_in ? new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span> },
        { id: 'check_out', header: t('الخروج', 'Out'), width: 'w-20', align: 'center' as const, cell: (row: any) => <span className="font-mono text-xs">{row.check_out ? new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span> },
        { id: 'hours', header: t('ساعات', 'Hours'), width: 'w-16', align: 'center' as const, cell: (row: any) => <span className="font-mono">{row.worked_hours || '—'}</span> },
        { id: 'status', header: t('الحالة', 'Status'), width: 'w-24', align: 'center' as const, cell: (row: any) => { const st = ATTEND_STATUS[row.status]; return <Badge className={st?.className}>{isRTL ? st?.ar : st?.en}</Badge>; } },
    ];

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Balance Cards */}
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

            {/* Sub-tabs */}
            <Tabs value={subTab} onValueChange={setSubTab}>
                <TabsList className="h-8">
                    <TabsTrigger value="balances" className="text-xs h-7">{t('الأرصدة', 'Balances')}</TabsTrigger>
                    <TabsTrigger value="requests" className="text-xs h-7">{t('الطلبات', 'Requests')}</TabsTrigger>
                    <TabsTrigger value="attendance" className="text-xs h-7">{t('الحضور', 'Attendance')}</TabsTrigger>
                </TabsList>

                <TabsContent value="balances" className="mt-3">
                    <div className="space-y-2">
                        {balances.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: b.leave_types?.color || '#3B82F6' }} />
                                    <span className="text-sm font-medium">{isRTL ? b.leave_types?.name_ar : b.leave_types?.name_en}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span><span className="text-muted-foreground">{t('مخصص:', 'Alloc:')}</span> <span className="font-mono font-bold">{b.allocated_days}</span></span>
                                    <span><span className="text-muted-foreground">{t('مستخدم:', 'Used:')}</span> <span className="font-mono text-red-600">{b.used_days}</span></span>
                                    <span><span className="text-muted-foreground">{t('متبقي:', 'Left:')}</span> <span className="font-mono text-emerald-600 font-bold">{b.remaining_days}</span></span>
                                </div>
                            </div>
                        ))}
                        {balances.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground py-8 text-sm">{t('لا توجد أرصدة إجازات', 'No leave balances')}</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="requests" className="mt-3">
                    <NexaListTable data={leaveRequests} columns={leaveColumns} isLoading={loading} isRTL={isRTL} direction={isRTL ? 'rtl' : 'ltr'} totalCount={leaveRequests.length} countLabel={t('طلب', 'requests')} getRowKey={(r) => r.id} emptyMessage={t('لا توجد طلبات', 'No requests')} />
                </TabsContent>

                <TabsContent value="attendance" className="mt-3">
                    <NexaListTable data={attendance} columns={attendColumns} isLoading={loading} isRTL={isRTL} direction={isRTL ? 'rtl' : 'ltr'} totalCount={attendance.length} countLabel={t('يوم', 'days')} getRowKey={(r) => r.id} emptyMessage={t('لا توجد سجلات حضور', 'No attendance records')} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
