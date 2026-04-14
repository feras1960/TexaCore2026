/**
 * ⏰ Attendance Table — جدول الحضور والانصراف باستخدام NexaListTable
 * ⚡ PERFORMANCE: useCachedQuery (IndexedDB persistence)
 */

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogIn, LogOut, Users, Clock, AlertTriangle, Timer } from 'lucide-react';
import { getAttendance, checkIn, checkOut, getEmployees, type AttendanceRecord, type Employee } from '../services/hrService';
import { toast } from 'sonner';

export default function AttendanceTable() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const { companyId } = useCompany();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // ─── Cache-first query (keyed by date) ────────────
    const { data: rawData, isLoading: loading } = useCachedQuery({
        queryKey: ['hr', 'attendance', companyId, selectedDate],
        queryFn: async () => {
            const [attData, empData] = await Promise.all([
                getAttendance(selectedDate),
                getEmployees(),
            ]);
            return { records: attData, employees: empData };
        },
        enabled: !!companyId,
        staleTime: 1 * 60 * 1000,     // 1 min for attendance (more time-sensitive)
        gcTime: 24 * 60 * 60 * 1000,
    });

    const records = rawData?.records ?? [];
    const employees = rawData?.employees ?? [];

    // ─── Realtime ────────────
    useEffect(() => {
        if (!companyId) return;
        const channel = supabase
            .channel('hr-attendance-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
                queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
                queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [companyId, queryClient]);

    const invalidateAttendance = () => {
        queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
        queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    };

    async function handleCheckIn(empId: string) {
        try {
            await checkIn(empId, 'manual');
            invalidateAttendance();
            toast.success(isRTL ? 'تم تسجيل الحضور' : 'Checked in');
        } catch {
            toast.error(isRTL ? 'فشل تسجيل الحضور' : 'Check-in failed');
        }
    }

    async function handleCheckOut(empId: string) {
        try {
            await checkOut(empId);
            invalidateAttendance();
            toast.success(isRTL ? 'تم تسجيل الانصراف' : 'Checked out');
        } catch {
            toast.error(isRTL ? 'فشل تسجيل الانصراف' : 'Check-out failed');
        }
    }

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // --- Stats ---
    const stats = useMemo(() => ({
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => (r.late_minutes || 0) > 0).length,
        totalHours: records.reduce((sum, r) => sum + (r.worked_hours || 0), 0).toFixed(1),
    }), [records]);

    // --- Filter ---
    const filteredData = useMemo(() => {
        if (!search) return records;
        const s = search.toLowerCase();
        return records.filter(r =>
            r.employee?.full_name_ar?.toLowerCase().includes(s) ||
            r.employee?.employee_number?.toLowerCase().includes(s)
        );
    }, [records, search]);

    const statusConfig: Record<string, { label: string; className: string }> = {
        present: { label: isRTL ? 'حاضر' : 'Present', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        absent: { label: isRTL ? 'غائب' : 'Absent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        late: { label: isRTL ? 'متأخر' : 'Late', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        half_day: { label: isRTL ? 'نصف يوم' : 'Half Day', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    };

    const methodLabels: Record<string, string> = {
        manual: isRTL ? 'يدوي' : 'Manual',
        biometric: isRTL ? 'بصمة' : 'Biometric',
        face: isRTL ? 'وجه' : 'Face',
        qr: isRTL ? 'QR' : 'QR Code',
        gps: isRTL ? 'موقع' : 'GPS',
    };

    const columns: NexaListColumn<AttendanceRecord>[] = [
        {
            id: 'employee',
            header: isRTL ? 'الموظف' : 'Employee',
            width: 'min-w-[180px]',
            cell: (row) => (
                <div>
                    <p className="font-medium text-sm">{row.employee?.full_name_ar || '—'}</p>
                    <p className="text-xs text-muted-foreground">{row.employee?.employee_number}</p>
                </div>
            ),
        },
        {
            id: 'check_in',
            header: isRTL ? 'الحضور' : 'Check In',
            width: 'w-24',
            align: 'center',
            cell: (row) => (
                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {row.check_in ? new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
            ),
        },
        {
            id: 'check_out',
            header: isRTL ? 'الانصراف' : 'Check Out',
            width: 'w-24',
            align: 'center',
            cell: (row) => (
                <span className="font-mono text-sm text-red-600 dark:text-red-400">
                    {row.check_out ? new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
            ),
        },
        {
            id: 'worked_hours',
            header: isRTL ? 'الساعات' : 'Hours',
            width: 'w-20',
            align: 'center',
            cell: (row) => (
                <span className="font-mono font-semibold text-sm">{row.worked_hours?.toFixed(1) || '—'}</span>
            ),
        },
        {
            id: 'overtime',
            header: isRTL ? 'إضافي' : 'OT',
            width: 'w-16',
            align: 'center',
            cell: (row) => (
                <span className="font-mono text-xs text-blue-600">{row.overtime_hours ? `+${row.overtime_hours.toFixed(1)}` : ''}</span>
            ),
        },
        {
            id: 'late',
            header: isRTL ? 'تأخير' : 'Late',
            width: 'w-16',
            align: 'center',
            cell: (row) => (
                row.late_minutes && row.late_minutes > 0 ? (
                    <span className="text-xs text-amber-600 font-mono">{row.late_minutes}{isRTL ? 'د' : 'm'}</span>
                ) : null
            ),
        },
        {
            id: 'method',
            header: isRTL ? 'الطريقة' : 'Method',
            width: 'w-20',
            align: 'center',
            cell: (row) => (
                <span className="text-xs text-muted-foreground">{methodLabels[row.check_in_method || 'manual']}</span>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = statusConfig[row.status || 'present'];
                return <Badge className={st?.className}>{st?.label}</Badge>;
            },
        },
    ];

    const getRowAccent = (row: AttendanceRecord) => {
        if ((row.late_minutes || 0) > 0) return 'border-s-amber-400';
        switch (row.status) {
            case 'present': return 'border-s-emerald-400';
            case 'absent': return 'border-s-red-400';
            default: return 'border-s-gray-300';
        }
    };

    return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-4">
            {/* Date Picker & Check In/Out */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-44" />
                    <h2 className="text-xl font-bold text-erp-navy dark:text-gray-100">
                        {isRTL ? 'سجل الحضور' : 'Attendance'}
                    </h2>
                </div>
                {isToday && (
                    <div className="flex gap-2">
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => employees[0] && handleCheckIn(employees[0].id)}>
                            <LogIn className="h-4 w-4 me-2" /> {isRTL ? 'تسجيل حضور' : 'Check In'}
                        </Button>
                        <Button variant="outline" className="border-red-300 text-red-600" onClick={() => employees[0] && handleCheckOut(employees[0].id)}>
                            <LogOut className="h-4 w-4 me-2" /> {isRTL ? 'تسجيل انصراف' : 'Check Out'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
                <Card><CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><Users className="h-4 w-4 text-emerald-600" /></div>
                    <div><p className="text-xl font-bold">{stats.present}</p><p className="text-[11px] text-muted-foreground">{isRTL ? 'حاضر' : 'Present'}</p></div>
                </CardContent></Card>
                <Card><CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><Users className="h-4 w-4 text-red-600" /></div>
                    <div><p className="text-xl font-bold">{stats.absent}</p><p className="text-[11px] text-muted-foreground">{isRTL ? 'غائب' : 'Absent'}</p></div>
                </CardContent></Card>
                <Card><CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
                    <div><p className="text-xl font-bold">{stats.late}</p><p className="text-[11px] text-muted-foreground">{isRTL ? 'متأخر' : 'Late'}</p></div>
                </CardContent></Card>
                <Card><CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Timer className="h-4 w-4 text-blue-600" /></div>
                    <div><p className="text-xl font-bold">{stats.totalHours}</p><p className="text-[11px] text-muted-foreground">{isRTL ? 'ساعة' : 'Hours'}</p></div>
                </CardContent></Card>
            </div>

            {/* Table */}
            <NexaListTable
                data={filteredData}
                columns={columns}
                searchTerm={search}
                onSearchChange={setSearch}
                searchPlaceholder={isRTL ? 'بحث...' : 'Search...'}
                isLoading={loading}
                isRTL={isRTL}
                direction={isRTL ? 'rtl' : 'ltr'}
                totalCount={records.length}
                countLabel={isRTL ? 'سجل' : 'records'}
                getRowKey={(row) => row.id}
                getRowAccent={getRowAccent}
                emptyMessage={isRTL ? 'لا توجد سجلات حضور' : 'No attendance records'}
            />
        </div>
    );
}
