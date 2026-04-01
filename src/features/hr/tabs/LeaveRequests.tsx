/**
 * 🌴 Leave Requests — طلبات الإجازات باستخدام NexaListTable
 */

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, NexaListColumn, NexaListFilter } from '@/components/ui/nexa-list-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Check, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import {
    getLeaveRequests, getLeaveTypes, getEmployees,
    createLeaveRequest, approveLeaveRequest, rejectLeaveRequest,
    type LeaveRequest, type LeaveType, type Employee
} from '../services/hrService';
import { toast } from 'sonner';

export default function LeaveRequests() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Dialogs
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    // New request form
    const [newRequest, setNewRequest] = useState({
        employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: ''
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            // ⚡ No setLoading(true) — render table immediately
            const [reqData, typesData, empData] = await Promise.all([
                getLeaveRequests(),
                getLeaveTypes(),
                getEmployees(),
            ]);
            setRequests(reqData);
            setLeaveTypes(typesData);
            setEmployees(empData);
        } catch (err) {
            console.error(err);
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id: string) {
        try {
            await approveLeaveRequest(id, 'current-user');
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
            toast.success(isRTL ? 'تمت الموافقة' : 'Approved');
        } catch {
            toast.error(isRTL ? 'فشلت الموافقة' : 'Approval failed');
        }
    }

    async function handleReject() {
        try {
            await rejectLeaveRequest(selectedRequestId, rejectReason);
            setRequests(prev => prev.map(r => r.id === selectedRequestId ? { ...r, status: 'rejected' } : r));
            setShowRejectDialog(false);
            setRejectReason('');
            toast.success(isRTL ? 'تم الرفض' : 'Rejected');
        } catch {
            toast.error(isRTL ? 'فشل الرفض' : 'Rejection failed');
        }
    }

    async function handleCreate() {
        try {
            const days = Math.ceil(
                (new Date(newRequest.end_date).getTime() - new Date(newRequest.start_date).getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

            const created = await createLeaveRequest({
                ...newRequest,
                total_days: days,
                status: 'pending',
            });
            setRequests(prev => [created, ...prev]);
            setShowNewDialog(false);
            setNewRequest({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
            toast.success(isRTL ? 'تم إنشاء الطلب' : 'Request created');
        } catch {
            toast.error(isRTL ? 'فشل الإنشاء' : 'Creation failed');
        }
    }

    // --- Stats ---
    const stats = useMemo(() => ({
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    }), [requests]);

    // --- Filter ---
    const filteredData = useMemo(() => {
        return requests.filter(r => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                r.employee?.full_name_ar?.toLowerCase().includes(s) ||
                r.leave_type?.name_ar?.toLowerCase().includes(s) ||
                r.reason?.toLowerCase().includes(s)
            );
        });
    }, [requests, search, statusFilter]);

    const filters: NexaListFilter[] = [
        {
            id: 'status',
            label: isRTL ? 'الحالة' : 'Status',
            type: 'select',
            value: statusFilter,
            onChange: (v) => setStatusFilter(v),
            options: [
                { value: 'all', label: isRTL ? 'الكل' : 'All' },
                { value: 'pending', label: isRTL ? 'معلق' : 'Pending' },
                { value: 'approved', label: isRTL ? 'موافق' : 'Approved' },
                { value: 'rejected', label: isRTL ? 'مرفوض' : 'Rejected' },
            ],
        },
    ];

    const statusConfig: Record<string, { label: string; className: string }> = {
        pending: { label: isRTL ? 'معلق' : 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        approved: { label: isRTL ? 'موافق' : 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        rejected: { label: isRTL ? 'مرفوض' : 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };

    const columns: NexaListColumn<LeaveRequest>[] = [
        {
            id: 'employee',
            header: isRTL ? 'الموظف' : 'Employee',
            width: 'min-w-[160px]',
            cell: (row) => (
                <div>
                    <p className="font-medium text-sm">{row.employee?.full_name_ar || '—'}</p>
                    <p className="text-xs text-muted-foreground">{row.employee?.employee_number}</p>
                </div>
            ),
        },
        {
            id: 'leave_type',
            header: isRTL ? 'نوع الإجازة' : 'Leave Type',
            width: 'w-28',
            cell: (row) => (
                <Badge variant="outline" className="text-xs">
                    {isRTL ? row.leave_type?.name_ar : (row.leave_type?.name_en || row.leave_type?.name_ar) || '—'}
                </Badge>
            ),
        },
        {
            id: 'dates',
            header: isRTL ? 'الفترة' : 'Period',
            width: 'min-w-[180px]',
            cell: (row) => (
                <div className="text-sm">
                    <span>{row.start_date ? new Date(row.start_date).toLocaleDateString() : ''}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span>{row.end_date ? new Date(row.end_date).toLocaleDateString() : ''}</span>
                </div>
            ),
        },
        {
            id: 'days',
            header: isRTL ? 'الأيام' : 'Days',
            width: 'w-16',
            align: 'center',
            cell: (row) => (
                <span className="font-mono font-semibold text-sm">{row.total_days || '—'}</span>
            ),
        },
        {
            id: 'reason',
            header: isRTL ? 'السبب' : 'Reason',
            width: 'min-w-[120px]',
            cell: (row) => (
                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {row.reason || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = statusConfig[row.status || 'pending'];
                return <Badge className={st?.className}>{st?.label}</Badge>;
            },
        },
    ];

    const getRowAccent = (row: LeaveRequest) => {
        switch (row.status) {
            case 'pending': return 'border-s-amber-400';
            case 'approved': return 'border-s-emerald-400';
            case 'rejected': return 'border-s-red-400';
            default: return 'border-s-gray-300';
        }
    };

    return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-amber-200 dark:border-amber-900/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'معلقة' : 'Pending'}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-emerald-200 dark:border-emerald-900/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.approved}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'موافق عليها' : 'Approved'}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-900/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <XCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.rejected}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'مرفوضة' : 'Rejected'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                    {isRTL ? 'طلبات الإجازات' : 'Leave Requests'}
                </h2>
                <Button onClick={() => setShowNewDialog(true)} className="bg-erp-primary hover:bg-erp-primary/90">
                    <PlusCircle className="h-4 w-4 me-2" />
                    {isRTL ? 'طلب إجازة' : 'New Request'}
                </Button>
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
                totalCount={requests.length}
                countLabel={isRTL ? 'طلب' : 'requests'}
                getRowKey={(row) => row.id}
                getRowAccent={getRowAccent}
                filters={filters}
                hasActiveFilters={statusFilter !== 'all'}
                onClearFilters={() => setStatusFilter('all')}
                emptyMessage={isRTL ? 'لا توجد طلبات إجازة' : 'No leave requests'}
                renderActions={(row) => row.status === 'pending' ? (
                    <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleApprove(row.id)}>
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => { setSelectedRequestId(row.id); setShowRejectDialog(true); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : null}
            />

            {/* New Request Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isRTL ? 'طلب إجازة جديد' : 'New Leave Request'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">{isRTL ? 'الموظف' : 'Employee'}</label>
                            <select className="w-full h-10 px-3 border rounded-lg mt-1" value={newRequest.employee_id}
                                onChange={(e) => setNewRequest(p => ({ ...p, employee_id: e.target.value }))}>
                                <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.full_name_ar || `${e.first_name_ar} ${e.last_name_ar}`}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{isRTL ? 'نوع الإجازة' : 'Leave Type'}</label>
                            <select className="w-full h-10 px-3 border rounded-lg mt-1" value={newRequest.leave_type_id}
                                onChange={(e) => setNewRequest(p => ({ ...p, leave_type_id: e.target.value }))}>
                                <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                                {leaveTypes.map(t => (
                                    <option key={t.id} value={t.id}>{isRTL ? t.name_ar : (t.name_en || t.name_ar)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium">{isRTL ? 'من' : 'From'}</label>
                                <Input type="date" className="mt-1" value={newRequest.start_date}
                                    onChange={(e) => setNewRequest(p => ({ ...p, start_date: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{isRTL ? 'إلى' : 'To'}</label>
                                <Input type="date" className="mt-1" value={newRequest.end_date}
                                    onChange={(e) => setNewRequest(p => ({ ...p, end_date: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{isRTL ? 'السبب' : 'Reason'}</label>
                            <Textarea className="mt-1" value={newRequest.reason}
                                onChange={(e) => setNewRequest(p => ({ ...p, reason: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                        <Button onClick={handleCreate} disabled={!newRequest.employee_id || !newRequest.leave_type_id || !newRequest.start_date || !newRequest.end_date}>
                            {isRTL ? 'إرسال الطلب' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isRTL ? 'سبب الرفض' : 'Rejection Reason'}</DialogTitle>
                    </DialogHeader>
                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        placeholder={isRTL ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>{isRTL ? 'رفض' : 'Reject'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
