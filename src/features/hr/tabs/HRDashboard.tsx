/**
 * 📊 HR Dashboard — لوحة معلومات الموارد البشرية
 * بيانات حية من Supabase
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Users, UserCheck, UserPlus, Calendar, Clock,
    AlertTriangle, FileText, Building2, DollarSign, Target, Briefcase
} from 'lucide-react';
import { getHRDashboardStats, getLeaveRequests, getContracts, type LeaveRequest, type EmployeeContract } from '../services/hrService';

export default function HRDashboard() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        pendingLeaves: 0,
        expiringContracts: 0,
        departments: [] as Array<{ id: string; name_ar: string; name_en?: string }>,
        employees: [] as Array<{ id: string; department_id?: string; hire_date?: string }>,
    });
    const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<EmployeeContract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const [dashStats, leaves, contracts] = await Promise.all([
                getHRDashboardStats(),
                getLeaveRequests({ status: 'pending' }),
                getContracts(),
            ]);
            setStats(dashStats);
            setRecentLeaves(leaves.slice(0, 5));
            // Filter expiring contracts (next 30 days)
            const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            setExpiringContracts(
                contracts.filter(c => c.status === 'active' && c.end_date && new Date(c.end_date) < thirtyDays).slice(0, 5)
            );
        } catch (err) {
            console.error('Failed to load HR dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    // Department employee distribution
    const deptDistribution = stats.departments.map(dept => ({
        ...dept,
        count: stats.employees.filter(e => e.department_id === dept.id).length,
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newHires = stats.employees.filter(e => e.hire_date && new Date(e.hire_date) > thirtyDaysAgo);

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            pending: { label: isRTL ? 'معلق' : 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            approved: { label: isRTL ? 'موافق' : 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            rejected: { label: isRTL ? 'مرفوض' : 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        };
        const config = map[status] || map.pending;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
                <div className="grid grid-cols-3 gap-6">
                    <div className="h-64 bg-muted rounded-lg" />
                    <div className="h-64 bg-muted rounded-lg col-span-2" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {isRTL ? 'لوحة تحكم الموارد البشرية' : 'HR Dashboard'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {isRTL ? 'نظرة عامة على بيانات الموظفين والأداء' : 'Overview of employee data and performance'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 me-2" />
                        {isRTL ? 'تقرير' : 'Report'}
                    </Button>
                    <Button size="sm" className="bg-erp-primary hover:bg-erp-primary/90">
                        <UserPlus className="h-4 w-4 me-2" />
                        {isRTL ? 'إضافة موظف' : 'Add Employee'}
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
                    <Users className="w-5 h-5 text-blue-500/70" />
                    <div>
                        <p className="text-sm text-gray-500">{isRTL ? 'إجمالي الموظفين' : 'Total Employees'}</p>
                        <p className="font-mono text-xl font-bold text-erp-navy dark:text-white">
                            {stats.totalEmployees}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
                    <UserCheck className="w-5 h-5 text-emerald-500/70" />
                    <div>
                        <p className="text-sm text-gray-500">{isRTL ? 'الحاضرون اليوم' : 'Present Today'}</p>
                        <p className="font-mono text-xl font-bold text-emerald-600">
                            {stats.presentToday}
                            {stats.totalEmployees > 0 && (
                                <span className="text-xs font-normal ms-1">
                                    {Math.round((stats.presentToday / stats.totalEmployees) * 100)}%
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
                    <Calendar className="w-5 h-5 text-amber-500/70" />
                    <div>
                        <p className="text-sm text-gray-500">{isRTL ? 'طلبات إجازة معلقة' : 'Pending Leaves'}</p>
                        <p className="font-mono text-xl font-bold text-amber-600">{stats.pendingLeaves}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
                    <AlertTriangle className="w-5 h-5 text-red-500/70" />
                    <div>
                        <p className="text-sm text-gray-500">{isRTL ? 'عقود منتهية قريباً' : 'Expiring Contracts'}</p>
                        <p className="font-mono text-xl font-bold text-red-600">{stats.expiringContracts}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-purple-500/70" />
                    <div>
                        <p className="text-sm text-gray-500">{isRTL ? 'موظفين جدد (30 يوم)' : 'New Hires (30d)'}</p>
                        <p className="font-mono text-xl font-bold text-purple-600">{newHires.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department Distribution */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-500" />
                            {isRTL ? 'توزيع حسب القسم' : 'By Department'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {deptDistribution.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {isRTL ? 'لا توجد أقسام بعد' : 'No departments yet'}
                            </p>
                        ) : (
                            deptDistribution.map((dept) => (
                                <div key={dept.id} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{isRTL ? dept.name_ar : (dept.name_en || dept.name_ar)}</span>
                                        <span className="text-muted-foreground font-mono">{dept.count}</span>
                                    </div>
                                    <Progress value={(dept.count / stats.totalEmployees) * 100} className="h-2" />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Recent Leave Requests */}
                <Card className="border-0 shadow-sm lg:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-500" />
                                {isRTL ? 'طلبات الإجازات المعلقة' : 'Pending Leave Requests'}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentLeaves.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                {isRTL ? 'لا توجد طلبات معلقة' : 'No pending requests'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {recentLeaves.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{req.employee?.full_name_ar || '—'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {req.leave_type?.name_ar || '—'} • {req.total_days} {isRTL ? 'أيام' : 'days'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(req.start_date).toLocaleDateString()}
                                            </span>
                                            {getStatusBadge(req.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expiring Contracts */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-amber-500" />
                            {isRTL ? 'عقود قاربت على الانتهاء' : 'Expiring Contracts'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expiringContracts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {isRTL ? 'لا توجد عقود منتهية قريباً' : 'No expiring contracts'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {expiringContracts.map((c) => {
                                    const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                                    return (
                                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{c.employee?.full_name_ar || '—'}</p>
                                                    <p className="text-xs text-muted-foreground">{c.contract_number || c.contract_type}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={daysLeft < 7 ? 'text-red-600 border-red-200' : 'text-amber-600 border-amber-200'}>
                                                {daysLeft} {isRTL ? 'يوم' : 'days'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-0 shadow-sm bg-gradient-to-r from-erp-navy to-erp-navy/90">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-4">
                            <div className="text-white">
                                <h3 className="text-xl font-semibold">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</h3>
                                <p className="text-white/70 text-sm mt-1">
                                    {isRTL ? 'الوصول السريع للعمليات الأكثر استخداماً' : 'Quick access to common operations'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                    <UserPlus className="w-4 h-4 me-2" />
                                    {isRTL ? 'إضافة موظف' : 'Add Employee'}
                                </Button>
                                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                    <Calendar className="w-4 h-4 me-2" />
                                    {isRTL ? 'طلب إجازة' : 'Request Leave'}
                                </Button>
                                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                    <Clock className="w-4 h-4 me-2" />
                                    {isRTL ? 'تسجيل حضور' : 'Check In'}
                                </Button>
                                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                    <DollarSign className="w-4 h-4 me-2" />
                                    {isRTL ? 'كشف رواتب' : 'Run Payroll'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
