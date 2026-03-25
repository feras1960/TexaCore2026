/**
 * ════════════════════════════════════════════════════════════════
 * 📋 EmpActivityLogTab — سجل النشاط
 * يعرض جميع الأنشطة والتغييرات على بيانات الموظف
 * 
 * المصادر: audit trail (custom_fields), sales_transactions, attendance
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Activity, Clock, FileText, ShoppingCart, Calendar, User,
    ChevronDown, DollarSign, Package, ArrowRightLeft, Briefcase,
    LogIn, LogOut, Edit, PlusCircle, Trash2, Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
    employeeId?: string;
    data?: any;
    isRTL: boolean;
}

interface ActivityEntry {
    id: string;
    date: string;
    type: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    metadata?: any;
}

function Section({ title, icon: Icon, defaultOpen = false, children, badge, badgeClassName }: {
    title: string; icon: React.ElementType; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string; badgeClassName?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border rounded-xl overflow-hidden transition-all">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-start group">
                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm group-hover:shadow-md transition-shadow">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-semibold text-sm flex-1">{title}</span>
                {badge && <Badge variant="secondary" className={`text-xs ${badgeClassName || ''}`}>{badge}</Badge>}
                <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
            </button>
            <div className={`transition-all duration-300 ${open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-5 space-y-4 border-t">{children}</div>
            </div>
        </div>
    );
}

export default function EmpActivityLogTab({ employeeId, data, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'sales' | 'attendance' | 'changes'>('all');

    const empId = employeeId || data?.id;

    useEffect(() => {
        if (!empId) return;
        loadActivities();
    }, [empId]);

    async function loadActivities() {
        setLoading(true);
        try {
            const allActivities: ActivityEntry[] = [];

            // 1. Sales transactions
            const { data: salesData } = await supabase
                .from('sales_transactions')
                .select('id, transaction_number, stage, status, total_amount, currency, created_at, customer:customer_id(name_ar, name_en)')
                .eq('created_by', data?.user_profile_id || empId)
                .order('created_at', { ascending: false })
                .limit(30);

            (salesData || []).forEach((s: any) => {
                const stageLabels: Record<string, { ar: string; en: string }> = {
                    quotation: { ar: 'عرض سعر', en: 'Quotation' },
                    order: { ar: 'أمر بيع', en: 'Sales Order' },
                    invoice: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
                    delivery: { ar: 'تسليم', en: 'Delivery' },
                    return: { ar: 'مرتجع', en: 'Return' },
                };
                const stageLabel = stageLabels[s.stage] || { ar: s.stage, en: s.stage };
                allActivities.push({
                    id: `sale-${s.id}`,
                    date: s.created_at,
                    type: 'sales',
                    title: isRTL ? stageLabel.ar : stageLabel.en,
                    description: `${s.transaction_number || '—'} — ${s.customer?.name_ar || s.customer?.name_en || '—'} — ${(s.total_amount || 0).toLocaleString()} ${s.currency || 'SAR'}`,
                    icon: s.stage === 'quotation' ? FileText : s.stage === 'invoice' ? DollarSign : ShoppingCart,
                    color: s.stage === 'invoice' ? 'text-emerald-600' : 'text-blue-600',
                    bgColor: s.stage === 'invoice' ? 'bg-emerald-100' : 'bg-blue-100',
                });
            });

            // 2. Attendance records
            const { data: attendData } = await supabase
                .from('attendance')
                .select('id, date, check_in_time, check_out_time, status, worked_hours')
                .eq('employee_id', empId)
                .order('date', { ascending: false })
                .limit(20);

            (attendData || []).forEach((a: any) => {
                allActivities.push({
                    id: `att-${a.id}`,
                    date: a.date + 'T' + (a.check_in_time || '08:00:00'),
                    type: 'attendance',
                    title: a.check_out_time ? t('حضور وانصراف', 'Check In/Out') : t('تسجيل حضور', 'Check In'),
                    description: `${a.check_in_time?.substring(0, 5) || '—'} → ${a.check_out_time?.substring(0, 5) || '—'} | ${a.worked_hours ? `${a.worked_hours}h` : '—'}`,
                    icon: a.check_out_time ? LogOut : LogIn,
                    color: a.status === 'present' ? 'text-emerald-600' : 'text-amber-600',
                    bgColor: a.status === 'present' ? 'bg-emerald-100' : 'bg-amber-100',
                });
            });

            // 3. Leave requests
            const { data: leaveData } = await supabase
                .from('leave_requests')
                .select('id, start_date, end_date, status, reason, leave_type:leave_type_id(name_ar, name_en)')
                .eq('employee_id', empId)
                .order('created_at', { ascending: false })
                .limit(10);

            (leaveData || []).forEach((l: any) => {
                const statusLabels: Record<string, { ar: string; en: string }> = {
                    pending: { ar: 'بانتظار الموافقة', en: 'Pending' },
                    approved: { ar: 'موافق عليها', en: 'Approved' },
                    rejected: { ar: 'مرفوضة', en: 'Rejected' },
                };
                const statusLabel = statusLabels[l.status] || { ar: l.status, en: l.status };
                allActivities.push({
                    id: `leave-${l.id}`,
                    date: l.start_date,
                    type: 'changes',
                    title: t('طلب إجازة', 'Leave Request'),
                    description: `${(l.leave_type as any)?.name_ar || '—'} | ${l.start_date} → ${l.end_date} | ${isRTL ? statusLabel.ar : statusLabel.en}`,
                    icon: Calendar,
                    color: l.status === 'approved' ? 'text-emerald-600' : l.status === 'rejected' ? 'text-red-600' : 'text-amber-600',
                    bgColor: l.status === 'approved' ? 'bg-emerald-100' : l.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100',
                });
            });

            // Sort all by date descending
            allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setActivities(allActivities);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Filter activities
    const filteredActivities = filter === 'all' ? activities : activities.filter(a => a.type === filter);

    // Group by date
    const grouped = filteredActivities.reduce<Record<string, ActivityEntry[]>>((acc, a) => {
        const dateKey = new Date(a.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(a);
        return acc;
    }, {});

    const filters = [
        { id: 'all' as const, label: t('الكل', 'All'), icon: Activity, count: activities.length },
        { id: 'sales' as const, label: t('المبيعات', 'Sales'), icon: ShoppingCart, count: activities.filter(a => a.type === 'sales').length },
        { id: 'attendance' as const, label: t('الحضور', 'Attendance'), icon: Clock, count: activities.filter(a => a.type === 'attendance').length },
        { id: 'changes' as const, label: t('التغييرات', 'Changes'), icon: Edit, count: activities.filter(a => a.type === 'changes').length },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ═══ Stats ═══ */}
            <div className="grid grid-cols-4 gap-3">
                {filters.map(f => {
                    const FIcon = f.icon;
                    return (
                        <Card key={f.id} className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${filter === f.id ? 'ring-2 ring-erp-primary/50' : ''}`}
                            onClick={() => setFilter(f.id)}>
                            <CardContent className="p-3 flex items-center gap-2">
                                <FIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground">{f.label}</p>
                                    <p className="text-base font-bold font-mono">{f.count}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ═══ Timeline ═══ */}
            <Section title={t('سجل النشاط', 'Activity Log')} icon={Activity} defaultOpen={true}
                badge={`${filteredActivities.length}`}>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-8">
                        <Activity className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {t('لا توجد أنشطة مسجلة', 'No activities recorded')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([dateKey, entries]) => (
                            <div key={dateKey}>
                                {/* Date Header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground">{dateKey}</span>
                                    <div className="flex-1 border-b border-dashed" />
                                    <Badge variant="outline" className="text-[10px]">{entries.length}</Badge>
                                </div>

                                {/* Entries */}
                                <div className="space-y-2 ps-2 border-s-2 border-muted ms-1">
                                    {entries.map(entry => {
                                        const EntryIcon = entry.icon;
                                        return (
                                            <div key={entry.id} className="flex items-start gap-3 ps-4 relative">
                                                {/* Timeline dot */}
                                                <div className={`absolute -start-[9px] top-2.5 h-4 w-4 rounded-full ${entry.bgColor} flex items-center justify-center`}>
                                                    <EntryIcon className={`h-2.5 w-2.5 ${entry.color}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{entry.title}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );
}
