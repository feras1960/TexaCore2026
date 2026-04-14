/**
 * ════════════════════════════════════════════════════════════════
 * 👤 HRDashboard — لوحة الموارد البشرية (Glass Design)
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Glass pattern — filters below header
 *   - Header gradient (navy → purple)
 *   - 8 KPI glass cards
 *   - Department distribution + Leave requests
 *   - Expiring contracts + Quick actions
 *   - Realtime via hrService
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatsGrid, StatCard } from '@/components/shared/stats/StatCard';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import {
    Users, UserCheck, UserPlus, Calendar, Clock,
    AlertTriangle, FileText, Building2, DollarSign, Briefcase,
    RefreshCw, Star, TrendingUp, Hash,
} from 'lucide-react';
import { getHRDashboardStats, getLeaveRequests, getContracts, type LeaveRequest, type EmployeeContract } from '../services/hrService';
import { cn } from '@/lib/utils';

export default function HRDashboard() {
    const { t, language, direction } = useLanguage();
    const isAr = language === 'ar';
    const { companyId } = useCompany();

    const queryClient = useQueryClient();

    const { data: rawData, isLoading: loading } = useCachedQuery({
        queryKey: ['hr', 'dashboard', companyId],
        queryFn: async () => {
            const [dashStats, leaves, contracts] = await Promise.all([
                getHRDashboardStats(),
                getLeaveRequests({ status: 'pending' }),
                getContracts(),
            ]);
            const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return {
                stats: dashStats,
                recentLeaves: leaves.slice(0, 5),
                expiringContractsList: contracts.filter(c => c.status === 'active' && c.end_date && new Date(c.end_date) < thirtyDays).slice(0, 5),
            };
        },
        enabled: !!companyId,
        staleTime: 2 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });

    const stats = rawData?.stats ?? { totalEmployees: 0, presentToday: 0, pendingLeaves: 0, expiringContracts: 0, departments: [] as Array<{ id: string; name_ar: string; name_en?: string }>, employees: [] as Array<{ id: string; department_id?: string; hire_date?: string }> };
    const recentLeaves = rawData?.recentLeaves ?? [];
    const expiringContractsList = rawData?.expiringContractsList ?? [];

    // Realtime — invalidate cache
    useEffect(() => {
        if (!companyId) return;
        const channel = supabase
            .channel('hr-dashboard-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${companyId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
                queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [companyId, queryClient]);

    // Department distribution
    const deptDistribution = stats.departments.map(dept => ({
        ...dept,
        count: stats.employees.filter(e => e.department_id === dept.id).length,
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // New hires (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newHires = stats.employees.filter(e => e.hire_date && new Date(e.hire_date) > thirtyDaysAgo);

    const attendanceRate = stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0;

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            pending: { label: isAr ? 'معلق' : 'Pending', className: 'bg-amber-100 text-amber-700' },
            approved: { label: isAr ? 'موافق' : 'Approved', className: 'bg-emerald-100 text-emerald-700' },
            rejected: { label: isAr ? 'مرفوض' : 'Rejected', className: 'bg-red-100 text-red-700' },
        };
        const config = map[status] || map.pending;
        return <Badge className={cn("text-[10px] px-1.5 py-0 h-4 font-tajawal", config.className)}>{config.label}</Badge>;
    };

    // ⚡ CACHE-FIRST: No blocking skeleton — dashboard renders immediately

    return (
        <div className="space-y-6" dir={direction}>
            {/* ─ Header — Glass Gradient (Navy → Purple) ── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-purple-800 to-erp-navy p-6 rounded-2xl shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-400/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-400/10 blur-2xl" />
                <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <Users className="w-6 h-6 text-purple-300" />
                            </div>
                            <h1 className="text-2xl font-bold text-white font-cairo">
                                {isAr ? 'لوحة الموارد البشرية' : 'HR Dashboard'}
                            </h1>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE
                            </span>
                        </div>
                        <p className="text-sm text-purple-200/80 font-tajawal ps-12">
                            {isAr ? 'نظرة عامة على الموظفين والحضور والعقود' : 'Overview of employees, attendance, and contracts'}
                        </p>
                    </div>

                    {/* Quick Actions in header */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <UserPlus className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'إضافة موظف' : 'Add Employee'}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <Calendar className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'طلب إجازة' : 'Request Leave'}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <Clock className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'تسجيل حضور' : 'Check In'}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <DollarSign className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'كشف رواتب' : 'Payroll'}
                        </Button>
                    </div>
                </div>
            </div>



            {/* ─ KPIs Row 1 — People Metrics (Glass) ── */}
            <StatsGrid cols={4}>
                <StatCard
                    label={isAr ? 'إجمالي الموظفين' : 'Total Employees'}
                    value={stats.totalEmployees}
                    type="info"
                    icon={Users}
                    className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'الحاضرون اليوم' : 'Present Today'}
                    value={stats.presentToday}
                    type="positive"
                    icon={UserCheck}
                    suffix={`${attendanceRate}%`}
                    className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'موظفين جدد (30 يوم)' : 'New Hires (30d)'}
                    value={newHires.length}
                    type="positive"
                    icon={UserPlus}
                    className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'الأقسام' : 'Departments'}
                    value={stats.departments.length}
                    type="neutral"
                    icon={Building2}
                    className="bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/30 dark:to-gray-950/20 backdrop-blur-sm border border-slate-100/50 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-all"
                />
            </StatsGrid>

            {/* ─ KPIs Row 2 — Status Metrics (Glass) ── */}
            <StatsGrid cols={4}>
                <StatCard
                    label={isAr ? 'إجازات معلقة' : 'Pending Leaves'}
                    value={stats.pendingLeaves}
                    type="warning"
                    icon={Calendar}
                    className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'عقود منتهية قريباً' : 'Expiring Contracts'}
                    value={stats.expiringContracts}
                    type={stats.expiringContracts > 0 ? 'negative' : 'neutral'}
                    icon={AlertTriangle}
                    className="bg-gradient-to-br from-red-50/80 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/20 backdrop-blur-sm border border-red-100/50 dark:border-red-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'نسبة الحضور' : 'Attendance Rate'}
                    value={`${attendanceRate}%`}
                    type={attendanceRate >= 80 ? 'positive' : attendanceRate >= 50 ? 'warning' : 'negative'}
                    icon={TrendingUp}
                    className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/30 dark:to-cyan-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'عقود نشطة' : 'Active Contracts'}
                    value={stats.totalEmployees - stats.expiringContracts}
                    type="positive"
                    icon={Briefcase}
                    className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 backdrop-blur-sm border border-teal-100/50 dark:border-teal-800/30 shadow-sm hover:shadow-md transition-all"
                />
            </StatsGrid>

            {/* ─ Main Grid (Glass) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department Distribution */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-500" />
                            {isAr ? 'توزيع حسب القسم' : 'By Department'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        {deptDistribution.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm font-tajawal py-4">{isAr ? 'لا توجد أقسام بعد' : 'No departments yet'}</p>
                        ) : (
                            deptDistribution.map((dept) => (
                                <div key={dept.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-tajawal">{isAr ? dept.name_ar : (dept.name_en || dept.name_ar)}</span>
                                        <span className="text-gray-500 font-mono text-xs">{dept.count} / {stats.totalEmployees}</span>
                                    </div>
                                    <Progress value={(dept.count / stats.totalEmployees) * 100} className="h-2" />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Leave Requests */}
                <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {isAr ? 'طلبات الإجازات المعلقة' : 'Pending Leave Requests'}
                        </CardTitle>
                        <Badge variant="secondary" className="text-[11px] font-mono bg-amber-50 text-amber-600 border-0">
                            {stats.pendingLeaves}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                            {recentLeaves.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-tajawal">
                                    {isAr ? 'لا توجد طلبات معلقة' : 'No pending requests'}
                                </div>
                            ) : (
                                recentLeaves.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                                                <Calendar className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-tajawal font-medium">{req.employee?.full_name_ar || '—'}</p>
                                                <p className="text-[11px] text-gray-400 font-tajawal">
                                                    {req.leave_type?.name_ar || '—'} • {req.total_days} {isAr ? 'أيام' : 'days'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {new Date(req.start_date).toLocaleDateString()}
                                            </span>
                                            {getStatusBadge(req.status)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─ Bottom Row (Glass) ── */}
            <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                    <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-500" />
                        {isAr ? 'عقود قاربت على الانتهاء' : 'Expiring Contracts'}
                    </CardTitle>
                    <Badge variant="secondary" className="text-[11px] font-mono bg-red-50 text-red-600 border-0">
                        {expiringContractsList.length}
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                        {expiringContractsList.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 font-tajawal">
                                {isAr ? 'لا توجد عقود منتهية قريباً' : 'No expiring contracts'}
                            </div>
                        ) : (
                            expiringContractsList.map((c) => {
                                const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                                return (
                                    <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={cn("p-1.5 rounded-lg", daysLeft < 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                                <FileText className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-tajawal font-medium">{c.employee?.full_name_ar || '—'}</p>
                                                <p className="text-[11px] text-gray-400 font-tajawal">{c.contract_number || c.contract_type}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn("text-xs font-mono shrink-0", daysLeft < 7 ? 'text-red-600 border-red-200' : 'text-amber-600 border-amber-200')}>
                                            {daysLeft} {isAr ? 'يوم' : 'days'}
                                        </Badge>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
