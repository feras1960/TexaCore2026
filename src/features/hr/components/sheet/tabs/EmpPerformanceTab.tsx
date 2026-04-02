/**
 * ════════════════════════════════════════════════════════════════
 * 🎯 EmpPerformanceTab — الأداء والمبيعات
 * 
 * ✅ وضعية الاستعراض: عرض الإحصائيات + التارغت + الزبائن + العمليات
 * ✅ وضعية التعديل: إدارة التارغت + تعيين الزبائن
 * 
 * 3 أقسام:
 *   1. التارغت والحوافز — CRUD أهداف + Progress bars
 *   2. الزبائن المرتبطين — ربط/فك ربط العملاء
 *   3. الحركات والعمليات — Activity Log
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    ChevronDown, Target, Users, Activity, TrendingUp, Award,
    ShoppingCart, FileText, Package, DollarSign, ArrowRightLeft,
    Plus, Pencil, Trash2, Loader2, Save, X, UserPlus, UserMinus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

interface Props { employeeId?: string; data?: any; isRTL: boolean; mode?: string; }

// ═══ Section Component ═══
function Section({ title, icon: Icon, defaultOpen = false, children, badge, badgeClassName, actions }: {
    title: string; icon: React.ElementType; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string; badgeClassName?: string;
    actions?: React.ReactNode;
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
                {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
                {badge && <Badge variant="secondary" className={`text-xs ${badgeClassName || ''}`}>{badge}</Badge>}
                <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
            </button>
            <div className={`transition-all duration-300 ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-5 space-y-4 border-t">{children}</div>
            </div>
        </div>
    );
}

// ═══ Types ═══
const TARGET_TYPES: Record<string, { ar: string; en: string }> = {
    sales_amount: { ar: 'مبيعات (مبلغ)', en: 'Sales Amount' },
    sales_units: { ar: 'مبيعات (وحدات)', en: 'Sales Units' },
    new_customers: { ar: 'عملاء جدد', en: 'New Customers' },
    collections: { ar: 'تحصيلات', en: 'Collections' },
    profit: { ar: 'أرباح', en: 'Profit' },
};

const TARGET_STATUS: Record<string, { ar: string; en: string; className: string }> = {
    active: { ar: 'نشط', en: 'Active', className: 'bg-blue-100 text-blue-700' },
    achieved: { ar: 'تحقق', en: 'Achieved', className: 'bg-emerald-100 text-emerald-700' },
    partial: { ar: 'جزئي', en: 'Partial', className: 'bg-amber-100 text-amber-700' },
    failed: { ar: 'لم يتحقق', en: 'Failed', className: 'bg-red-100 text-red-700' },
};

const ACTIVITY_TYPES: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
    invoice: { ar: 'فاتورة بيع', en: 'Sales Invoice', icon: FileText, color: 'text-emerald-600' },
    quotation: { ar: 'عرض سعر', en: 'Quotation', icon: FileText, color: 'text-blue-600' },
    order: { ar: 'أمر بيع', en: 'Sales Order', icon: ShoppingCart, color: 'text-purple-600' },
    return: { ar: 'مرتجع', en: 'Return', icon: ArrowRightLeft, color: 'text-red-600' },
    receipt: { ar: 'سند قبض', en: 'Receipt', icon: DollarSign, color: 'text-green-600' },
    delivery: { ar: 'تسليم', en: 'Delivery', icon: Package, color: 'text-orange-600' },
};

// ═══ Empty Target Form ═══
const currentDate = new Date();
const EMPTY_TARGET = {
    target_type: 'sales_amount',
    period_type: 'monthly',
    period_year: currentDate.getFullYear(),
    period_month: currentDate.getMonth() + 1,
    period_quarter: null as number | null,
    target_amount: 0,
    target_units: 0,
    target_count: 0,
    bonus_on_achievement: 0,
    bonus_on_exceed: 0,
    notes: '',
};

export default function EmpPerformanceTab({ employeeId, data, isRTL, mode }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'edit' || mode === 'create';
    const { company, companyId } = useCompany();
    const tenantId = company?.tenant_id || companyId;

    const empId = employeeId || data?.id;

    const [loading, setLoading] = useState(false);
    const [targets, setTargets] = useState<any[]>([]);
    const [linkedCustomers, setLinkedCustomers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [salesStats, setSalesStats] = useState({ totalSales: 0, totalInvoices: 0, avgInvoice: 0 });
    const [allCustomers, setAllCustomers] = useState<any[]>([]);

    // ─── Target Dialog ───
    const [showTargetDialog, setShowTargetDialog] = useState(false);
    const [editingTarget, setEditingTarget] = useState<any>(null);
    const [targetForm, setTargetForm] = useState({ ...EMPTY_TARGET });
    const [saving, setSaving] = useState(false);

    // ─── Customer Assignment ───
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    useEffect(() => {
        if (!empId) return;
        loadData();
    }, [empId]);

    async function loadData() {
        try {
            // 1. Targets — always safe
            const targetsRes = await supabase.from('employee_targets')
                .select('*')
                .eq('employee_id', empId)
                .order('period_year', { ascending: false })
                .order('period_month', { ascending: false });
            setTargets(targetsRes.data || []);

            // 2. Linked customers — agent_id may not exist, fail silently
            try {
                const custRes = await supabase.from('contacts')
                    .select('id, name_ar, name_en, contact_type, phone, email, balance, created_at')
                    .eq('agent_id', empId)
                    .order('name_ar');
                setLinkedCustomers(custRes.data || []);
            } catch (e) {
                console.warn('[EmpPerformance] contacts.agent_id query failed (column may not exist):', e);
                setLinkedCustomers([]);
            }

            // 3. Sales activities — created_by may not exist, fail silently
            try {
                const salesRes = await supabase.from('sales_transactions')
                    .select('id, transaction_number, stage, status, total_amount, currency, created_at, customer:customer_id(name_ar, name_en)')
                    .eq('created_by', data?.user_profile_id || empId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                const salesData = salesRes.data || [];
                const acts = salesData.map((s: any) => ({
                    id: s.id,
                    date: s.created_at,
                    type: s.stage === 'quotation' ? 'quotation' : s.stage === 'order' ? 'order' : 'invoice',
                    reference: s.transaction_number,
                    description: s.customer?.name_ar || s.customer?.name_en || '—',
                    amount: s.total_amount,
                    status: s.status,
                }));
                setActivities(acts);

                const invoices = salesData.filter((s: any) => s.stage === 'invoice');
                const total = invoices.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
                setSalesStats({
                    totalSales: total,
                    totalInvoices: invoices.length,
                    avgInvoice: invoices.length > 0 ? total / invoices.length : 0,
                });
            } catch (e) {
                console.warn('[EmpPerformance] sales_transactions.created_by query failed (column may not exist):', e);
                setActivities([]);
                setSalesStats({ totalSales: 0, totalInvoices: 0, avgInvoice: 0 });
            }
        } catch (err) {
            console.error('[EmpPerformance] loadData failed:', err);
        } finally {
            setLoading(false);
        }
    }

    // ─── Target CRUD ───
    function openCreateTarget() {
        setEditingTarget(null);
        setTargetForm({ ...EMPTY_TARGET });
        setShowTargetDialog(true);
    }

    function openEditTarget(target: any) {
        setEditingTarget(target);
        setTargetForm({
            target_type: target.target_type || 'sales_amount',
            period_type: target.period_type || 'monthly',
            period_year: target.period_year,
            period_month: target.period_month,
            period_quarter: target.period_quarter,
            target_amount: target.target_amount || 0,
            target_units: target.target_units || 0,
            target_count: target.target_count || 0,
            bonus_on_achievement: target.bonus_on_achievement || 0,
            bonus_on_exceed: target.bonus_on_exceed || 0,
            notes: target.notes || '',
        });
        setShowTargetDialog(true);
    }

    async function handleSaveTarget() {
        if (!empId) return;
        setSaving(true);
        try {
            const payload: any = {
                tenant_id: tenantId,
                company_id: companyId,
                employee_id: empId,
                target_type: targetForm.target_type,
                period_type: targetForm.period_type,
                period_year: Number(targetForm.period_year),
                period_month: targetForm.period_type === 'monthly' ? Number(targetForm.period_month) : null,
                period_quarter: targetForm.period_type === 'quarterly' ? Number(targetForm.period_quarter) : null,
                target_amount: Number(targetForm.target_amount) || 0,
                target_units: Number(targetForm.target_units) || 0,
                target_count: Number(targetForm.target_count) || 0,
                bonus_on_achievement: Number(targetForm.bonus_on_achievement) || 0,
                bonus_on_exceed: Number(targetForm.bonus_on_exceed) || 0,
                notes: targetForm.notes || null,
            };

            if (editingTarget) {
                await supabase.from('employee_targets').update(payload).eq('id', editingTarget.id);
                toast.success(t('تم تحديث الهدف', 'Target updated'));
            } else {
                payload.status = 'active';
                await supabase.from('employee_targets').insert(payload);
                toast.success(t('تم إنشاء الهدف بنجاح', 'Target created'));
            }
            setShowTargetDialog(false);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل في حفظ الهدف', 'Failed to save target'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteTarget(id: string) {
        if (!confirm(t('هل تريد حذف هذا الهدف؟', 'Delete this target?'))) return;
        try {
            await supabase.from('employee_targets').delete().eq('id', id);
            toast.success(t('تم حذف الهدف', 'Target deleted'));
            await loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    // ─── Customer Assignment ───
    async function openAssignCustomer() {
        setSelectedCustomerId('');
        try {
            const { data: customers, error: err } = await supabase.from('contacts')
                .select('id, name_ar, name_en')
                .eq('contact_type', 'customer')
                .is('agent_id', null)
                .limit(200);
            if (err) {
                console.warn('[EmpPerformance] agent_id filter failed:', err.message);
                setAllCustomers([]);
            } else {
                setAllCustomers(customers || []);
            }
        } catch (e) {
            console.warn('[EmpPerformance] openAssignCustomer failed:', e);
            setAllCustomers([]);
        }
        setShowCustomerDialog(true);
    }

    async function handleAssignCustomer() {
        if (!selectedCustomerId) return;
        try {
            await supabase.from('contacts').update({ agent_id: empId }).eq('id', selectedCustomerId);
            toast.success(t('تم ربط العميل بالموظف', 'Customer assigned'));
            setShowCustomerDialog(false);
            await loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    async function handleUnlinkCustomer(customerId: string) {
        if (!confirm(t('هل تريد فك ربط هذا العميل؟', 'Unlink this customer?'))) return;
        try {
            await supabase.from('contacts').update({ agent_id: null }).eq('id', customerId);
            toast.success(t('تم فك ربط العميل', 'Customer unlinked'));
            await loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    // ─── Target columns ───
    const currentTargets = targets.filter(t => t.period_year === currentDate.getFullYear());

    const customerColumns: NexaListColumn<any>[] = [
        { id: 'name', header: t('الاسم', 'Name'), width: 'min-w-[150px]', cell: (row) => <span className="text-sm font-medium">{isRTL ? row.name_ar : (row.name_en || row.name_ar)}</span> },
        { id: 'type', header: t('النوع', 'Type'), width: 'w-20', align: 'center', cell: (row) => <Badge variant="outline" className="text-xs">{row.contact_type === 'customer' ? t('عميل', 'Customer') : t('مورد', 'Supplier')}</Badge> },
        { id: 'phone', header: t('الهاتف', 'Phone'), width: 'w-28', cell: (row) => <span className="font-mono text-xs">{row.phone || '—'}</span> },
        { id: 'balance', header: t('الرصيد', 'Balance'), width: 'w-24', align: 'end', cell: (row) => <span className={`font-mono text-sm ${(row.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(row.balance || 0).toLocaleString()}</span> },
        ...(isEditable ? [{
            id: 'actions', header: '', width: 'w-10', align: 'center' as const,
            cell: (row: any) => (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                    title={t('فك ربط', 'Unlink')}
                    onClick={(e) => { e.stopPropagation(); handleUnlinkCustomer(row.id); }}>
                    <UserMinus className="h-3.5 w-3.5" />
                </Button>
            ),
        }] : []),
    ];

    const activityColumns: NexaListColumn<any>[] = [
        { id: 'date', header: t('التاريخ', 'Date'), width: 'w-24', cell: (row) => <span className="font-mono text-xs text-muted-foreground">{new Date(row.date).toLocaleDateString()}</span> },
        {
            id: 'type', header: t('النوع', 'Type'), width: 'w-24', cell: (row) => {
                const cfg = ACTIVITY_TYPES[row.type];
                const Icon = cfg?.icon || FileText;
                return <span className={`flex items-center gap-1 text-xs ${cfg?.color || ''}`}><Icon className="h-3 w-3" /> {isRTL ? cfg?.ar : cfg?.en}</span>;
            }
        },
        { id: 'ref', header: t('المرجع', 'Ref'), width: 'w-24', cell: (row) => <span className="font-mono text-xs">{row.reference || '—'}</span> },
        { id: 'desc', header: t('العميل', 'Customer'), width: 'min-w-[120px]', cell: (row) => <span className="text-sm">{row.description}</span> },
        { id: 'amount', header: t('المبلغ', 'Amount'), width: 'w-24', align: 'end', cell: (row) => <span className="font-mono text-sm">{row.amount?.toLocaleString() || '0'}</span> },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ═══ Stats Cards ═══ */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('إجمالي المبيعات', 'Total Sales')}</p>
                            <p className="text-lg font-bold font-mono text-emerald-600">{salesStats.totalSales.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('عدد الفواتير', 'Invoices')}</p>
                            <p className="text-lg font-bold font-mono">{salesStats.totalInvoices}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('العملاء المرتبطين', 'Linked Clients')}</p>
                            <p className="text-lg font-bold font-mono">{linkedCustomers.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ 1. التارغت ═══ */}
            <Section title={t('التارغت والحوافز', 'Targets & Incentives')} icon={Target} defaultOpen={true}
                badge={`${currentTargets.length}`}
                actions={isEditable ? (
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={openCreateTarget}>
                        <Plus className="h-3 w-3" />
                        {t('إضافة هدف', 'Add Target')}
                    </Button>
                ) : undefined}>
                <div className="space-y-3">
                    {currentTargets.length > 0 ? currentTargets.map(tgt => {
                        const pct = tgt.achievement_percentage || 0;
                        const st = TARGET_STATUS[tgt.status] || TARGET_STATUS.active;
                        const tType = TARGET_TYPES[tgt.target_type];
                        return (
                            <div key={tgt.id} className="p-4 border rounded-lg bg-gradient-to-br from-muted/20 to-transparent hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-4 w-4 text-amber-600" />
                                        <span className="font-semibold text-sm">
                                            {isRTL ? tType?.ar : tType?.en}
                                            <span className="text-muted-foreground text-xs ms-2">
                                                ({tgt.period_month}/{tgt.period_year})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`text-[10px] ${st.className}`}>{isRTL ? st.ar : st.en}</Badge>
                                        {isEditable && (
                                            <>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                                    onClick={() => openEditTarget(tgt)}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500"
                                                    onClick={() => handleDeleteTarget(tgt.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{t('المحقق', 'Achieved')}: <span className="font-mono font-bold text-foreground">{(tgt.achieved_amount || 0).toLocaleString()}</span></span>
                                        <span>{t('الهدف', 'Target')}: <span className="font-mono">{(tgt.target_amount || 0).toLocaleString()}</span></span>
                                    </div>
                                    <Progress value={Math.min(pct, 100)} className="h-2.5" />
                                    <div className="flex justify-between text-xs">
                                        <span className={`font-mono font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {pct.toFixed(1)}%
                                        </span>
                                        {tgt.bonus_on_achievement > 0 && (
                                            <span className="text-muted-foreground">
                                                {t('مكافأة:', 'Bonus:')} <span className="font-mono">{tgt.bonus_on_achievement.toLocaleString()}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-6 text-muted-foreground">
                            <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">{t('لا توجد أهداف لهذه الفترة', 'No targets for this period')}</p>
                            {isEditable && (
                                <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={openCreateTarget}>
                                    <Plus className="h-3 w-3" />
                                    {t('إنشاء أول هدف', 'Create First Target')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Section>

            {/* ═══ 2. الزبائن المرتبطين ═══ */}
            <Section title={t('الزبائن المرتبطين', 'Linked Customers')} icon={Users}
                badge={`${linkedCustomers.length}`}
                actions={isEditable ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openAssignCustomer}>
                        <UserPlus className="h-3 w-3" />
                        {t('ربط عميل', 'Assign')}
                    </Button>
                ) : undefined}>
                <NexaListTable
                    data={linkedCustomers}
                    columns={customerColumns}
                    isLoading={loading}
                    isRTL={isRTL}
                    direction={isRTL ? 'rtl' : 'ltr'}
                    totalCount={linkedCustomers.length}
                    countLabel={t('عميل', 'clients')}
                    getRowKey={(row) => row.id}
                    emptyMessage={t('لا توجد عملاء مرتبطين', 'No linked customers')}
                />
            </Section>

            {/* ═══ 3. الحركات والعمليات ═══ */}
            <Section title={t('الحركات والعمليات', 'Activities & Transactions')} icon={Activity}
                badge={`${activities.length}`}>
                <NexaListTable
                    data={activities}
                    columns={activityColumns}
                    isLoading={loading}
                    isRTL={isRTL}
                    direction={isRTL ? 'rtl' : 'ltr'}
                    totalCount={activities.length}
                    countLabel={t('عملية', 'transactions')}
                    getRowKey={(row) => row.id}
                    emptyMessage={t('لا توجد حركات', 'No activities')}
                    getRowAccent={(row) =>
                        row.type === 'invoice' ? 'border-s-emerald-400' :
                            row.type === 'quotation' ? 'border-s-blue-400' :
                                row.type === 'return' ? 'border-s-red-400' :
                                    'border-s-gray-300'
                    }
                />
            </Section>

            {/* ═════════════════════════════════════════════════════ */}
            {/* ═══ Target Dialog ═══ */}
            {/* ═════════════════════════════════════════════════════ */}
            <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
                <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-amber-600" />
                            {editingTarget ? t('تعديل الهدف', 'Edit Target') : t('إنشاء هدف جديد', 'New Target')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('تحديد هدف مبيعات أو تحصيلات للموظف', 'Set a sales or collections target')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Target Type */}
                        <div>
                            <Label className="text-xs mb-1.5 block">{t('نوع الهدف', 'Target Type')} *</Label>
                            <Select value={targetForm.target_type}
                                onValueChange={v => setTargetForm(f => ({ ...f, target_type: v }))}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TARGET_TYPES).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Period */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('الفترة', 'Period')}</Label>
                                <Select value={targetForm.period_type}
                                    onValueChange={v => setTargetForm(f => ({ ...f, period_type: v }))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">{t('شهري', 'Monthly')}</SelectItem>
                                        <SelectItem value="quarterly">{t('ربعي', 'Quarterly')}</SelectItem>
                                        <SelectItem value="yearly">{t('سنوي', 'Yearly')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('السنة', 'Year')}</Label>
                                <Input type="number" className="h-9 text-sm"
                                    value={targetForm.period_year}
                                    onChange={e => setTargetForm(f => ({ ...f, period_year: Number(e.target.value) }))} />
                            </div>
                            {targetForm.period_type === 'monthly' && (
                                <div>
                                    <Label className="text-xs mb-1.5 block">{t('الشهر', 'Month')}</Label>
                                    <Select value={String(targetForm.period_month)}
                                        onValueChange={v => setTargetForm(f => ({ ...f, period_month: Number(v) }))}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Target Value */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('المبلغ المستهدف', 'Target Amount')}</Label>
                                <Input type="number" className="h-9 text-sm"
                                    value={targetForm.target_amount}
                                    onChange={e => setTargetForm(f => ({ ...f, target_amount: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('مكافأة التحقيق', 'Achievement Bonus')}</Label>
                                <Input type="number" className="h-9 text-sm"
                                    value={targetForm.bonus_on_achievement}
                                    onChange={e => setTargetForm(f => ({ ...f, bonus_on_achievement: Number(e.target.value) }))} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowTargetDialog(false)}>
                            <X className="h-3.5 w-3.5 me-1.5" />{t('إلغاء', 'Cancel')}
                        </Button>
                        <Button onClick={handleSaveTarget} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Save className="h-4 w-4 me-1.5" />}
                            {saving ? t('جاري الحفظ...', 'Saving...') : editingTarget ? t('تحديث', 'Update') : t('إنشاء', 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════ */}
            {/* ═══ Assign Customer Dialog ═══ */}
            {/* ═════════════════════════════════════════════════════ */}
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogContent className="sm:max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-purple-600" />
                            {t('ربط عميل بالموظف', 'Assign Customer')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('اختر عميل لربطه بهذا الموظف كمندوب', 'Select a customer to assign to this employee')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder={t('اختر عميل', 'Select customer')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                                {allCustomers.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {isRTL ? c.name_ar : (c.name_en || c.name_ar)}
                                    </SelectItem>
                                ))}
                                {allCustomers.length === 0 && (
                                    <div className="text-center text-xs text-muted-foreground py-3">
                                        {t('لا يوجد عملاء غير مرتبطين', 'No unassigned customers')}
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                            {t('إلغاء', 'Cancel')}
                        </Button>
                        <Button onClick={handleAssignCustomer} disabled={!selectedCustomerId}>
                            <UserPlus className="h-3.5 w-3.5 me-1.5" />
                            {t('ربط', 'Assign')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
