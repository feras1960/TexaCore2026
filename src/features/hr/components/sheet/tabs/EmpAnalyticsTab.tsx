/**
 * ════════════════════════════════════════════════════════════════
 * 🤖 EmpAnalyticsTab — تحليلات الذكاء الاصطناعي
 * 3 أقسام:
 *   1. ملخص الأداء + رسوم بيانية
 *   2. تنبيهات ذكية
 *   3. توصيات AI
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Award,
    ArrowUp, ArrowDown, Minus, BarChart3, Clock, Calendar, Users, Target,
    Sparkles, ShieldCheck, GraduationCap, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props { data: any; isRTL: boolean; }

// ═══ AI Insight Types ═══
interface AIInsight {
    id: string;
    type: 'positive' | 'warning' | 'neutral' | 'suggestion';
    icon: React.ElementType;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    score?: number;
}

export default function EmpAnalyticsTab({ data, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        attendanceRate: 0,
        leaveUsage: 0,
        overtimeHours: 0,
        salaryGrowth: 0,
        tenure: 0,
        performanceScore: 0,
        salesCount: 0,
        salesTotal: 0,
    });

    useEffect(() => {
        if (!data?.id) return;
        calculateAnalytics();
    }, [data?.id]);

    async function calculateAnalytics() {
        setLoading(true);
        try {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

            // Attendance rate (this month)
            const { data: attendance, count: attendCount } = await supabase
                .from('attendance')
                .select('status', { count: 'exact' })
                .eq('employee_id', data.id)
                .gte('attendance_date', monthStart);

            const presentDays = (attendance || []).filter(a => a.status === 'present' || a.status === 'late').length;
            const totalDays = attendCount || 0;

            // Leave usage this year
            const { data: leaves } = await supabase
                .from('leave_requests')
                .select('total_days, status')
                .eq('employee_id', data.id)
                .eq('status', 'approved')
                .gte('start_date', yearStart);
            const totalLeaveDays = (leaves || []).reduce((s, l) => s + (l.total_days || 0), 0);

            // Overtime this month
            const { data: otData } = await supabase
                .from('attendance')
                .select('overtime_hours')
                .eq('employee_id', data.id)
                .gte('attendance_date', monthStart);
            const totalOT = (otData || []).reduce((s, a) => s + (a.overtime_hours || 0), 0);

            // Tenure
            const hireDate = data.hire_date ? new Date(data.hire_date) : null;
            const tenureYears = hireDate ? (Date.now() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) : 0;

            // Sales metrics
            const { data: salesData } = await supabase
                .from('sales_transactions')
                .select('total_amount, stage')
                .eq('created_by', data.user_profile_id || data.id)
                .eq('stage', 'invoice')
                .gte('created_at', yearStart);

            const salesCount = (salesData || []).length;
            const salesTotal = (salesData || []).reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);

            // Calculate performance score (composite)
            const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
            const perfScore = Math.min(100, Math.round(
                (attendanceRate * 0.3) +
                (Math.min(100, salesCount * 5) * 0.3) +
                (totalLeaveDays < 15 ? 80 : 50) * 0.2 +
                (Math.min(tenureYears, 5) / 5 * 100) * 0.2
            ));

            setStats({
                attendanceRate: Math.round(attendanceRate),
                leaveUsage: totalLeaveDays,
                overtimeHours: Math.round(totalOT * 10) / 10,
                salaryGrowth: 0,
                tenure: Math.round(tenureYears * 10) / 10,
                performanceScore: perfScore || 0,
                salesCount,
                salesTotal,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // ═══ Generate AI Insights ═══
    const insights = useMemo<AIInsight[]>(() => {
        const list: AIInsight[] = [];

        // Attendance
        if (stats.attendanceRate >= 90) {
            list.push({ id: 'att-good', type: 'positive', icon: ShieldCheck, titleAr: 'التزام ممتاز بالحضور', titleEn: 'Excellent Attendance', descAr: `معدل حضور ${stats.attendanceRate}% — أعلى من المتوسط`, descEn: `${stats.attendanceRate}% attendance rate — above average`, score: stats.attendanceRate });
        } else if (stats.attendanceRate < 75 && stats.attendanceRate > 0) {
            list.push({ id: 'att-warn', type: 'warning', icon: AlertTriangle, titleAr: 'معدل حضور منخفض', titleEn: 'Low Attendance', descAr: `معدل الحضور ${stats.attendanceRate}% — يحتاج متابعة`, descEn: `${stats.attendanceRate}% attendance — needs attention`, score: stats.attendanceRate });
        }

        // Leave usage
        if (stats.leaveUsage > 20) {
            list.push({ id: 'leave-high', type: 'warning', icon: Calendar, titleAr: 'استخدام مرتفع للإجازات', titleEn: 'High Leave Usage', descAr: `${stats.leaveUsage} يوم إجازة هذا العام`, descEn: `${stats.leaveUsage} leave days used this year` });
        }

        // Tenure
        if (stats.tenure >= 3) {
            list.push({ id: 'tenure', type: 'positive', icon: Star, titleAr: 'موظف مخلص', titleEn: 'Loyal Employee', descAr: `${stats.tenure} سنة في الشركة — يستحق ترقية أو حافز`, descEn: `${stats.tenure} years with company — deserves recognition`, score: Math.min(100, stats.tenure * 20) });
        }

        // Sales
        if (stats.salesCount > 10) {
            list.push({ id: 'sales-good', type: 'positive', icon: TrendingUp, titleAr: 'أداء مبيعات قوي', titleEn: 'Strong Sales Performance', descAr: `${stats.salesCount} فاتورة بقيمة ${stats.salesTotal.toLocaleString()}`, descEn: `${stats.salesCount} invoices worth ${stats.salesTotal.toLocaleString()}` });
        } else if (stats.salesCount === 0) {
            list.push({ id: 'sales-none', type: 'neutral', icon: Target, titleAr: 'لا توجد مبيعات', titleEn: 'No Sales Activity', descAr: 'لم يتم تسجيل فواتير مبيعات هذا العام', descEn: 'No sales invoices recorded this year' });
        }

        // Overtime
        if (stats.overtimeHours > 20) {
            list.push({ id: 'ot-high', type: 'warning', icon: Clock, titleAr: 'ساعات إضافية مرتفعة', titleEn: 'High Overtime', descAr: `${stats.overtimeHours} ساعة إضافية — يجب مراجعة عبء العمل`, descEn: `${stats.overtimeHours} overtime hours — review workload` });
        }

        // Recommendations
        list.push({ id: 'rec-training', type: 'suggestion', icon: GraduationCap, titleAr: 'توصية: تدريب متقدم', titleEn: 'Suggestion: Advanced Training', descAr: 'برنامج تطوير مهني مقترح بناءً على الأداء', descEn: 'Suggested professional development based on performance' });

        return list;
    }, [stats]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* ═══ Performance Score ═══ */}
            <Card className="border-0 bg-gradient-to-br from-erp-navy/5 via-purple-50/30 to-blue-50/30 dark:from-erp-navy/20 dark:via-purple-900/10 dark:to-blue-900/10">
                <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full bg-white dark:bg-gray-900 border-4 flex items-center justify-center"
                                style={{ borderColor: stats.performanceScore >= 70 ? '#10b981' : stats.performanceScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                                <div className="text-center">
                                    <p className="text-2xl font-bold font-mono">{stats.performanceScore}</p>
                                    <p className="text-[9px] text-muted-foreground">{t('النقاط', 'Score')}</p>
                                </div>
                            </div>
                            <Sparkles className="h-4 w-4 text-amber-500 absolute -top-1 -end-1" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Brain className="h-5 w-5 text-purple-600" />
                                {t('تقييم الأداء الشامل', 'Overall Performance')}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {stats.performanceScore >= 70 ? t('أداء ممتاز — تابع هكذا! 🌟', 'Excellent — Keep it up! 🌟') :
                                    stats.performanceScore >= 40 ? t('أداء جيد — يمكن تحسينه', 'Good — Room for improvement') :
                                        t('يحتاج متابعة وتطوير', 'Needs attention and development')}
                            </p>
                        </div>
                    </div>

                    {/* Mini Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <MiniStat label={t('الحضور', 'Attendance')} value={`${stats.attendanceRate}%`} trend={stats.attendanceRate >= 90 ? 'up' : stats.attendanceRate < 75 ? 'down' : 'neutral'} />
                        <MiniStat label={t('الإجازات', 'Leave Days')} value={`${stats.leaveUsage}`} trend={stats.leaveUsage > 20 ? 'down' : 'neutral'} />
                        <MiniStat label={t('الإضافي', 'Overtime')} value={`${stats.overtimeHours}h`} trend="neutral" />
                        <MiniStat label={t('الأقدمية', 'Tenure')} value={`${stats.tenure}y`} trend="up" />
                    </div>
                </CardContent>
            </Card>

            {/* ═══ AI Insights ═══ */}
            <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    {t('تحليلات وتوصيات AI', 'AI Insights & Recommendations')}
                </h3>
                <div className="space-y-2">
                    {insights.map(insight => (
                        <InsightCard key={insight.id} insight={insight} isRTL={isRTL} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══ Mini Stat ═══
function MiniStat({ label, value, trend }: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }) {
    return (
        <div className="bg-white dark:bg-gray-900/50 rounded-lg p-2.5 border text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
                {trend === 'up' ? <ArrowUp className="h-3 w-3 text-emerald-500" /> :
                    trend === 'down' ? <ArrowDown className="h-3 w-3 text-red-500" /> :
                        <Minus className="h-3 w-3 text-gray-400" />}
                <span className="font-mono font-bold text-sm">{value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        </div>
    );
}

// ═══ Insight Card ═══
function InsightCard({ insight, isRTL }: { insight: AIInsight; isRTL: boolean }) {
    const Icon = insight.icon;
    const colorMap = {
        positive: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10',
        warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10',
        neutral: 'bg-gray-50 border-gray-200 dark:bg-gray-900/10',
        suggestion: 'bg-blue-50 border-blue-200 dark:bg-blue-900/10',
    };
    const iconColorMap = {
        positive: 'text-emerald-600',
        warning: 'text-amber-600',
        neutral: 'text-gray-500',
        suggestion: 'text-blue-600',
    };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${colorMap[insight.type]} transition-all hover:shadow-sm`}>
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColorMap[insight.type]}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{isRTL ? insight.titleAr : insight.titleEn}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? insight.descAr : insight.descEn}</p>
            </div>
            {insight.score !== undefined && (
                <Badge variant="outline" className="shrink-0 font-mono text-xs">{insight.score}%</Badge>
            )}
        </div>
    );
}
