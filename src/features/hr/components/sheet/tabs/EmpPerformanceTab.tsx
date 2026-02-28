/**
 * ════════════════════════════════════════════════════════════════
 * 🎯 EmpPerformanceTab — الأداء والمبيعات  
 * 3 أسطر منفتحة:
 *   1. التارغت والحوافز (مفتوح افتراضياً)
 *   2. الزبائن المرتبطين
 *   3. الحركات والعمليات (Activity Log)
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    ChevronDown, Target, Users, Activity, TrendingUp, Award,
    ShoppingCart, FileText, Package, DollarSign, ArrowRightLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props { employeeId?: string; data?: any; isRTL: boolean; }

// ═══ Section ═══
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
            <div className={`transition-all duration-300 ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-5 space-y-4 border-t">{children}</div>
            </div>
        </div>
    );
}

// ═══ Types ═══
const ACTIVITY_TYPES: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
    invoice: { ar: 'فاتورة بيع', en: 'Sales Invoice', icon: FileText, color: 'text-emerald-600' },
    quotation: { ar: 'عرض سعر', en: 'Quotation', icon: FileText, color: 'text-blue-600' },
    order: { ar: 'أمر بيع', en: 'Sales Order', icon: ShoppingCart, color: 'text-purple-600' },
    return: { ar: 'مرتجع', en: 'Return', icon: ArrowRightLeft, color: 'text-red-600' },
    receipt: { ar: 'سند قبض', en: 'Receipt', icon: DollarSign, color: 'text-green-600' },
    delivery: { ar: 'تسليم', en: 'Delivery', icon: Package, color: 'text-orange-600' },
};

export default function EmpPerformanceTab({ employeeId, data, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [loading, setLoading] = useState(true);
    const [linkedCustomers, setLinkedCustomers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [salesStats, setSalesStats] = useState({ totalSales: 0, totalInvoices: 0, avgInvoice: 0 });

    const empId = employeeId || data?.id;

    useEffect(() => {
        if (!empId) return;
        loadData();
    }, [empId]);

    async function loadData() {
        setLoading(true);
        try {
            // Linked customers (via agent_id in contacts)
            const { data: customers } = await supabase
                .from('contacts')
                .select('id, name_ar, name_en, contact_type, phone, email, balance, created_at')
                .eq('agent_id', empId)
                .order('name_ar');

            setLinkedCustomers(customers || []);

            // Sales activities (from sales_transactions)
            const { data: salesData } = await supabase
                .from('sales_transactions')
                .select('id, transaction_number, stage, status, total_amount, currency, created_at, customer:customer_id(name_ar, name_en)')
                .eq('created_by', data?.user_profile_id || empId)
                .order('created_at', { ascending: false })
                .limit(50);

            const acts = (salesData || []).map((s: any) => ({
                id: s.id,
                date: s.created_at,
                type: s.stage === 'quotation' ? 'quotation' : s.stage === 'order' ? 'order' : 'invoice',
                reference: s.transaction_number,
                description: s.customer?.name_ar || s.customer?.name_en || '—',
                amount: s.total_amount,
                status: s.status,
            }));
            setActivities(acts);

            // Stats
            const invoices = (salesData || []).filter((s: any) => s.stage === 'invoice');
            const total = invoices.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
            setSalesStats({
                totalSales: total,
                totalInvoices: invoices.length,
                avgInvoice: invoices.length > 0 ? total / invoices.length : 0,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // ═══ Linked Customers Columns ═══
    const customerColumns: NexaListColumn<any>[] = [
        { id: 'name', header: t('الاسم', 'Name'), width: 'min-w-[150px]', cell: (row) => <span className="text-sm font-medium">{isRTL ? row.name_ar : (row.name_en || row.name_ar)}</span> },
        { id: 'type', header: t('النوع', 'Type'), width: 'w-20', align: 'center', cell: (row) => <Badge variant="outline" className="text-xs">{row.contact_type === 'customer' ? t('عميل', 'Customer') : t('مورد', 'Supplier')}</Badge> },
        { id: 'phone', header: t('الهاتف', 'Phone'), width: 'w-28', cell: (row) => <span className="font-mono text-xs">{row.phone || '—'}</span> },
        { id: 'balance', header: t('الرصيد', 'Balance'), width: 'w-24', align: 'end', cell: (row) => <span className={`font-mono text-sm ${(row.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(row.balance || 0).toLocaleString()}</span> },
    ];

    // ═══ Activities Columns ═══
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

            {/* ═══ 1. التارغت والحوافز ═══ */}
            <Section title={t('التارغت والحوافز', 'Targets & Incentives')} icon={Target} defaultOpen={true}>
                {/* Target Progress — placeholder until targets table exists */}
                <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-amber-600" />
                                <span className="font-semibold text-sm">{t('هدف المبيعات الشهري', 'Monthly Sales Target')}</span>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                                {salesStats.totalInvoices > 0 ? t('قيد التنفيذ', 'In Progress') : t('لم يبدأ', 'Not Started')}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{t('المحقق', 'Achieved')}: <span className="font-mono font-bold text-foreground">{salesStats.totalSales.toLocaleString()}</span></span>
                                <span>{t('الهدف', 'Target')}: <span className="font-mono">—</span></span>
                            </div>
                            <Progress value={salesStats.totalSales > 0 ? Math.min(100, 65) : 0} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center">
                                {t('سيتم ربط الأهداف مع جدول targets لاحقاً', 'Targets table integration coming soon')}
                            </p>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ═══ 2. الزبائن المرتبطين ═══ */}
            <Section title={t('الزبائن المرتبطين', 'Linked Customers')} icon={Users}
                badge={`${linkedCustomers.length}`}>
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
        </div>
    );
}
