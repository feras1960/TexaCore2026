/**
 * 💰 Payroll Dashboard — كشوف الرواتب الشاملة (NexaListTable)
 * يشمل: فترات الرواتب + كشوف مفصلة + مكونات الراتب
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DollarSign, Plus, FileText, TrendingUp, TrendingDown,
    Calculator, Eye, CheckCircle, Banknote,
} from 'lucide-react';
import {
    getPayrollPeriods, createPayrollPeriod, getPayrollEntries,
    updatePayrollPeriodStatus, getSalaryComponents,
    type PayrollPeriod, type PayrollEntry, type SalaryComponent,
} from '../services/hrService';
import { toast } from 'sonner';

export default function PayrollDashboard() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [entries, setEntries] = useState<PayrollEntry[]>([]);
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
    const [loading, setLoading] = useState(false);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('periods');
    const [periodSearch, setPeriodSearch] = useState('');
    const [entrySearch, setEntrySearch] = useState('');

    const [createForm, setCreateForm] = useState({
        period_year: new Date().getFullYear(),
        period_month: new Date().getMonth() + 1,
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            // ⚡ No setLoading(true) — render dashboard immediately
            const [p, c] = await Promise.all([getPayrollPeriods(), getSalaryComponents()]);
            setPeriods(p);
            setComponents(c);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadEntries(periodId: string) {
        try {
            setEntriesLoading(true);
            const data = await getPayrollEntries(periodId);
            setEntries(data);
        } catch (err) {
            console.error(err);
        } finally {
            setEntriesLoading(false);
        }
    }

    async function handleCreatePeriod() {
        try {
            const y = createForm.period_year;
            const m = createForm.period_month;
            const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(y, m, 0).toISOString().split('T')[0];

            await createPayrollPeriod({
                period_name: `${y}-${String(m).padStart(2, '0')}`,
                period_year: y,
                period_month: m,
                start_date: startDate,
                end_date: endDate,
                status: 'draft',
            } as any);

            toast.success(isRTL ? 'تم إنشاء فترة الرواتب' : 'Payroll period created');
            setShowCreateDialog(false);
            loadData();
        } catch {
            toast.error(isRTL ? 'فشل الإنشاء' : 'Creation failed');
        }
    }

    async function handleStatusChange(id: string, newStatus: string) {
        try {
            await updatePayrollPeriodStatus(id, newStatus);
            toast.success(isRTL ? 'تم تحديث الحالة' : 'Status updated');
            loadData();
        } catch {
            toast.error(isRTL ? 'فشل التحديث' : 'Update failed');
        }
    }

    function viewPeriodEntries(period: PayrollPeriod) {
        setSelectedPeriod(period);
        loadEntries(period.id);
        setActiveTab('entries');
    }

    const monthNames = isRTL
        ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const statusConfig: Record<string, { label: string; className: string }> = {
        draft: { label: isRTL ? 'مسودة' : 'Draft', className: 'bg-gray-100 text-gray-600' },
        processing: { label: isRTL ? 'قيد المعالجة' : 'Processing', className: 'bg-blue-100 text-blue-700' },
        calculated: { label: isRTL ? 'محسوب' : 'Calculated', className: 'bg-amber-100 text-amber-700' },
        approved: { label: isRTL ? 'معتمد' : 'Approved', className: 'bg-emerald-100 text-emerald-700' },
        paid: { label: isRTL ? 'مدفوع' : 'Paid', className: 'bg-green-100 text-green-800' },
        cancelled: { label: isRTL ? 'ملغي' : 'Cancelled', className: 'bg-red-100 text-red-700' },
    };

    // Period stats
    const totalGross = periods.reduce((s, p) => s + (p.total_gross || 0), 0);
    const totalNet = periods.reduce((s, p) => s + (p.total_net || 0), 0);

    // --- Periods columns (NexaListColumn) ---
    const periodColumns: NexaListColumn<PayrollPeriod>[] = [
        {
            id: 'period_name',
            header: isRTL ? 'الفترة' : 'Period',
            width: 'min-w-[140px]',
            sortable: true,
            sortKey: 'period_year',
            cell: (row) => (
                <span className="font-medium">
                    {monthNames[(row.period_month || 1) - 1]} {row.period_year}
                </span>
            ),
        },
        {
            id: 'employee_count',
            header: isRTL ? 'الموظفين' : 'Employees',
            width: 'w-24',
            align: 'center',
            cell: (row) => <span className="font-mono">{row.employee_count || 0}</span>,
        },
        {
            id: 'total_gross',
            header: isRTL ? 'إجمالي الراتب' : 'Gross',
            width: 'w-28',
            align: 'end',
            cell: (row) => <span className="font-mono text-emerald-600">{(row.total_gross || 0).toLocaleString()}</span>,
        },
        {
            id: 'total_deductions',
            header: isRTL ? 'الخصومات' : 'Deductions',
            width: 'w-28',
            align: 'end',
            cell: (row) => <span className="font-mono text-red-500">{(row.total_deductions || 0).toLocaleString()}</span>,
        },
        {
            id: 'total_net',
            header: isRTL ? 'الصافي' : 'Net',
            width: 'w-28',
            align: 'end',
            cell: (row) => <span className="font-mono font-bold">{(row.total_net || 0).toLocaleString()}</span>,
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = statusConfig[row.status];
                return <Badge className={st?.className}>{st?.label}</Badge>;
            },
        },
    ];

    // --- Entries columns ---
    const entryColumns: NexaListColumn<PayrollEntry>[] = [
        {
            id: 'employee',
            header: isRTL ? 'الموظف' : 'Employee',
            width: 'min-w-[180px]',
            cell: (row) => (
                <div>
                    <p className="font-medium text-sm">{row.employee?.full_name_ar || '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.employee?.employee_number || ''}</p>
                </div>
            ),
        },
        {
            id: 'basic_salary',
            header: isRTL ? 'الأساسي' : 'Basic',
            width: 'w-24',
            align: 'end',
            cell: (row) => <span className="font-mono">{row.basic_salary?.toLocaleString()}</span>,
        },
        {
            id: 'total_earnings',
            header: isRTL ? 'البدلات' : 'Earnings',
            width: 'w-24',
            align: 'end',
            cell: (row) => <span className="font-mono text-emerald-600">+{(row.total_earnings || 0).toLocaleString()}</span>,
        },
        {
            id: 'total_deductions',
            header: isRTL ? 'الخصومات' : 'Deductions',
            width: 'w-24',
            align: 'end',
            cell: (row) => <span className="font-mono text-red-500">-{(row.total_deductions || 0).toLocaleString()}</span>,
        },
        {
            id: 'overtime_amount',
            header: isRTL ? 'إضافي' : 'Overtime',
            width: 'w-28',
            align: 'end',
            cell: (row) => (
                <div className="text-end">
                    <span className="font-mono text-blue-600">{(row.overtime_amount || 0).toLocaleString()}</span>
                    {row.overtime_hours > 0 && (
                        <span className="text-xs text-muted-foreground ms-1">({row.overtime_hours}h)</span>
                    )}
                </div>
            ),
        },
        {
            id: 'absent_days',
            header: isRTL ? 'غياب' : 'Absent',
            width: 'w-16',
            align: 'center',
            cell: (row) => (
                <span className={`font-mono ${row.absent_days > 0 ? 'text-red-500' : ''}`}>
                    {row.absent_days || 0}
                </span>
            ),
        },
        {
            id: 'net_salary',
            header: isRTL ? 'الصافي' : 'Net',
            width: 'w-28',
            align: 'end',
            cell: (row) => (
                <span className="font-mono font-bold text-erp-navy dark:text-white">
                    {(row.net_salary || 0).toLocaleString()}
                </span>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = statusConfig[row.status];
                return <Badge className={st?.className}>{st?.label}</Badge>;
            },
        },
    ];

    const getRowAccent = (row: PayrollPeriod) => {
        switch (row.status) {
            case 'paid': return 'border-s-green-400';
            case 'approved': return 'border-s-emerald-400';
            case 'calculated': return 'border-s-amber-400';
            case 'cancelled': return 'border-s-red-400';
            default: return 'border-s-gray-300';
        }
    };

    // Salary Components Tab
    const earningComponents = components.filter(c => c.component_type === 'earning');
    const deductionComponents = components.filter(c => c.component_type === 'deduction');
    const employerComponents = components.filter(c => c.component_type === 'employer_contribution');

    // Filtered periods
    const filteredPeriods = periods.filter(p => {
        if (!periodSearch) return true;
        const s = periodSearch.toLowerCase();
        return p.period_name?.toLowerCase().includes(s) ||
            monthNames[(p.period_month || 1) - 1].toLowerCase().includes(s);
    });

    // Filtered entries
    const filteredEntries = entries.filter(e => {
        if (!entrySearch) return true;
        const s = entrySearch.toLowerCase();
        return e.employee?.full_name_ar?.toLowerCase().includes(s) ||
            e.employee?.employee_number?.toLowerCase().includes(s);
    });

    return (
        <div className="p-2 space-y-6 animate-in fade-in duration-500">
            {/* Stats */}
            <div className="flex items-center gap-4 flex-wrap">
                <Card className="flex-1 min-w-[160px] border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        <div><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي الرواتب' : 'Total Gross'}</p>
                            <p className="text-xl font-bold font-mono">{totalGross.toLocaleString()}</p></div>
                    </CardContent>
                </Card>
                <Card className="flex-1 min-w-[160px] border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        <div><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي الخصومات' : 'Total Deductions'}</p>
                            <p className="text-xl font-bold font-mono text-red-600">{(totalGross - totalNet).toLocaleString()}</p></div>
                    </CardContent>
                </Card>
                <Card className="flex-1 min-w-[160px] border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Banknote className="h-5 w-5 text-blue-500" />
                        <div><p className="text-xs text-muted-foreground">{isRTL ? 'صافي المدفوع' : 'Total Net'}</p>
                            <p className="text-xl font-bold font-mono text-blue-600">{totalNet.toLocaleString()}</p></div>
                    </CardContent>
                </Card>
                <Card className="flex-1 min-w-[160px] border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-purple-500" />
                        <div><p className="text-xs text-muted-foreground">{isRTL ? 'فترات الرواتب' : 'Periods'}</p>
                            <p className="text-xl font-bold font-mono">{periods.length}</p></div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs: Periods / Entries / Components */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="periods">{isRTL ? 'فترات الرواتب' : 'Periods'}</TabsTrigger>
                        <TabsTrigger value="entries" disabled={!selectedPeriod}>{isRTL ? 'كشوف مفصلة' : 'Payslips'}</TabsTrigger>
                        <TabsTrigger value="components">{isRTL ? 'مكونات الراتب' : 'Components'}</TabsTrigger>
                    </TabsList>
                    {activeTab === 'periods' && (
                        <Button className="bg-erp-primary hover:bg-erp-primary/90" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 me-2" />
                            {isRTL ? 'فترة جديدة' : 'New Period'}
                        </Button>
                    )}
                </div>

                {/* === Periods Tab === */}
                <TabsContent value="periods" className="mt-4">
                    <NexaListTable
                        data={filteredPeriods}
                        columns={periodColumns}
                        searchTerm={periodSearch}
                        onSearchChange={setPeriodSearch}
                        searchPlaceholder={isRTL ? 'بحث في الفترات...' : 'Search periods...'}
                        isLoading={loading}
                        isRTL={isRTL}
                        direction={isRTL ? 'rtl' : 'ltr'}
                        totalCount={periods.length}
                        countLabel={isRTL ? 'فترة' : 'periods'}
                        getRowKey={(row) => row.id}
                        getRowAccent={getRowAccent}
                        emptyMessage={isRTL ? 'لا توجد فترات رواتب' : 'No payroll periods'}
                        renderActions={(row) => (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewPeriodEntries(row)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                                {row.status === 'draft' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600"
                                        onClick={() => handleStatusChange(row.id, 'calculated')}>
                                        <Calculator className="h-4 w-4" />
                                    </Button>
                                )}
                                {row.status === 'calculated' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600"
                                        onClick={() => handleStatusChange(row.id, 'approved')}>
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                )}
                                {row.status === 'approved' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                        onClick={() => handleStatusChange(row.id, 'paid')}>
                                        <Banknote className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                        footerRightContent={
                            <span className="font-mono font-semibold text-emerald-600">
                                {isRTL ? 'الإجمالي: ' : 'Total: '}{totalNet.toLocaleString()}
                            </span>
                        }
                    />
                </TabsContent>

                {/* === Entries Tab === */}
                <TabsContent value="entries" className="mt-4">
                    {selectedPeriod && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setActiveTab('periods')}>←</Button>
                                <h3 className="text-lg font-semibold">
                                    {monthNames[(selectedPeriod.period_month || 1) - 1]} {selectedPeriod.period_year}
                                </h3>
                                <Badge className={statusConfig[selectedPeriod.status]?.className}>
                                    {statusConfig[selectedPeriod.status]?.label}
                                </Badge>
                            </div>
                            <NexaListTable
                                data={filteredEntries}
                                columns={entryColumns}
                                searchTerm={entrySearch}
                                onSearchChange={setEntrySearch}
                                searchPlaceholder={isRTL ? 'بحث عن موظف...' : 'Search employee...'}
                                isLoading={entriesLoading}
                                isRTL={isRTL}
                                direction={isRTL ? 'rtl' : 'ltr'}
                                totalCount={entries.length}
                                countLabel={isRTL ? 'كشف' : 'payslips'}
                                getRowKey={(row) => row.id}
                                emptyMessage={isRTL ? 'لا توجد كشوف لهذه الفترة' : 'No payslips for this period'}
                                footerRightContent={
                                    <span className="font-mono font-semibold">
                                        {isRTL ? 'صافي: ' : 'Net: '}
                                        {entries.reduce((s, e) => s + (e.net_salary || 0), 0).toLocaleString()}
                                    </span>
                                }
                            />
                        </div>
                    )}
                </TabsContent>

                {/* === Components Tab === */}
                <TabsContent value="components" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Earnings */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    {isRTL ? 'البدلات والمكافآت' : 'Earnings'}
                                    <Badge variant="outline">{earningComponents.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {earningComponents.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                                        <div>
                                            <p className="text-sm font-medium">{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {c.calculation_type === 'fixed' ? (isRTL ? 'ثابت' : 'Fixed') :
                                                c.calculation_type === 'percentage' ? '%' : (isRTL ? 'معادلة' : 'Formula')}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Deductions */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                    {isRTL ? 'الخصومات' : 'Deductions'}
                                    <Badge variant="outline">{deductionComponents.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {deductionComponents.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                                        <div>
                                            <p className="text-sm font-medium">{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {c.calculation_type === 'fixed' ? (isRTL ? 'ثابت' : 'Fixed') :
                                                c.calculation_type === 'percentage' ? '%' : (isRTL ? 'معادلة' : 'Formula')}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Employer Contributions */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-500" />
                                    {isRTL ? 'مساهمات صاحب العمل' : 'Employer'}
                                    <Badge variant="outline">{employerComponents.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {employerComponents.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                                        <div>
                                            <p className="text-sm font-medium">{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">%</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Period Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{isRTL ? 'فترة رواتب جديدة' : 'New Payroll Period'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div><Label>{isRTL ? 'السنة' : 'Year'}</Label>
                            <Input type="number" value={createForm.period_year}
                                onChange={e => setCreateForm(f => ({ ...f, period_year: Number(e.target.value) }))} /></div>
                        <div><Label>{isRTL ? 'الشهر' : 'Month'}</Label>
                            <select className="w-full border rounded-md p-2 bg-background" value={createForm.period_month}
                                onChange={e => setCreateForm(f => ({ ...f, period_month: Number(e.target.value) }))}>
                                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                        <Button onClick={handleCreatePeriod}>{isRTL ? 'إنشاء' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
