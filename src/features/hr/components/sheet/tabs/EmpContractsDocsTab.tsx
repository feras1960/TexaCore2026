/**
 * ════════════════════════════════════════════════════════════════
 * 📜 EmpContractsDocsTab — العقود والمستندات
 * 
 * ✅ وضعية الاستعراض: عرض العقد الحالي + سجل العقود + المستندات
 * ✅ وضعية التعديل: إضافة عقد جديد + تعديل عقد + حذف عقد
 * 
 * الأقسام:
 *   1. العقد الحالي (مفتوح افتراضياً)
 *   2. سجل العقود + أزرار إدارة
 *   3. المستندات + تنبيهات الانتهاء
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    ChevronDown, ScrollText, FolderOpen, CheckCircle, AlertTriangle,
    FileText, Calendar, DollarSign, Plus, Pencil, Trash2, Loader2,
    Clock, Briefcase, Save, X,
} from 'lucide-react';
import { getContracts, createContract, updateContract, type EmployeeContract } from '../../../services/hrService';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

interface Props {
    employeeId?: string;
    isRTL: boolean;
    mode?: string;
}

// ═══ Section ═══
function Section({ title, icon: Icon, defaultOpen = false, children, badge, badgeClassName, action }: {
    title: string; icon: React.ElementType; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string; badgeClassName?: string;
    action?: React.ReactNode;
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
                {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
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

// ═══ Config ═══
const CONTRACT_STATUS: Record<string, { ar: string; en: string; className: string }> = {
    draft: { ar: 'مسودة', en: 'Draft', className: 'bg-gray-100 text-gray-600' },
    active: { ar: 'ساري', en: 'Active', className: 'bg-emerald-100 text-emerald-700' },
    expired: { ar: 'منتهي', en: 'Expired', className: 'bg-red-100 text-red-700' },
    terminated: { ar: 'ملغى', en: 'Terminated', className: 'bg-orange-100 text-orange-700' },
    renewed: { ar: 'مجدد', en: 'Renewed', className: 'bg-blue-100 text-blue-700' },
};

const CONTRACT_TYPES: { value: string; ar: string; en: string }[] = [
    { value: 'permanent', ar: 'دائم', en: 'Permanent' },
    { value: 'fixed_term', ar: 'محدد المدة', en: 'Fixed Term' },
    { value: 'probation', ar: 'تجربة', en: 'Probation' },
    { value: 'temporary', ar: 'مؤقت', en: 'Temporary' },
    { value: 'freelance', ar: 'حر', en: 'Freelance' },
];

const PAYMENT_FREQUENCIES: { value: string; ar: string; en: string }[] = [
    { value: 'monthly', ar: 'شهري', en: 'Monthly' },
    { value: 'biweekly', ar: 'نصف شهري', en: 'Bi-weekly' },
    { value: 'weekly', ar: 'أسبوعي', en: 'Weekly' },
    { value: 'daily', ar: 'يومي', en: 'Daily' },
];

const DOC_TYPES: Record<string, { ar: string; en: string }> = {
    id_card: { ar: 'بطاقة هوية', en: 'ID Card' },
    passport: { ar: 'جواز سفر', en: 'Passport' },
    visa: { ar: 'تأشيرة', en: 'Visa' },
    work_permit: { ar: 'إذن عمل', en: 'Work Permit' },
    driving_license: { ar: 'رخصة قيادة', en: 'Driving License' },
    degree: { ar: 'شهادة علمية', en: 'Degree' },
    certificate: { ar: 'شهادة', en: 'Certificate' },
    contract: { ar: 'عقد', en: 'Contract' },
    medical: { ar: 'طبي', en: 'Medical' },
    insurance: { ar: 'تأمين', en: 'Insurance' },
    other: { ar: 'أخرى', en: 'Other' },
};

// ═══ Empty Contract Form ═══
const EMPTY_CONTRACT = {
    contract_type: 'permanent' as string,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    basic_salary: 0,
    currency: 'SAR',
    payment_frequency: 'monthly',
    working_hours_per_day: 8,
    working_days_per_week: 5,
    annual_leave_days: 21,
    notice_period_days: 30,
    probation_months: 3,
    status: 'draft' as string,
    contract_number: '',
};

// ═══ Component ═══
export default function EmpContractsDocsTab({ employeeId, isRTL, mode }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'edit' || mode === 'create';
    const { company, companyId } = useCompany();
    const tenantId = company?.tenant_id || companyId;
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState<EmployeeContract[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);

    // ─── Contract Dialog State ───
    const [showContractDialog, setShowContractDialog] = useState(false);
    const [editingContract, setEditingContract] = useState<EmployeeContract | null>(null);
    const [contractForm, setContractForm] = useState({ ...EMPTY_CONTRACT });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!employeeId) return;
        loadData();
    }, [employeeId]);

    async function loadData() {
        setLoading(true);
        try {
            const [contractsRes, docsRes] = await Promise.all([
                getContracts(employeeId),
                supabase.from('employee_documents')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .order('created_at', { ascending: false }),
            ]);
            setContracts(contractsRes);
            setDocuments(docsRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // ─── Contract CRUD ───
    function openCreateContract() {
        setEditingContract(null);
        setContractForm({ ...EMPTY_CONTRACT });
        setShowContractDialog(true);
    }

    function openEditContract(contract: EmployeeContract) {
        setEditingContract(contract);
        setContractForm({
            contract_type: contract.contract_type || 'permanent',
            start_date: contract.start_date?.split('T')[0] || '',
            end_date: contract.end_date?.split('T')[0] || '',
            basic_salary: contract.basic_salary || 0,
            currency: contract.currency || 'SAR',
            payment_frequency: contract.payment_frequency || 'monthly',
            working_hours_per_day: contract.working_hours_per_day || 8,
            working_days_per_week: contract.working_days_per_week || 5,
            annual_leave_days: contract.annual_leave_days || 21,
            notice_period_days: contract.notice_period_days || 30,
            probation_months: contract.probation_months || 3,
            status: contract.status || 'draft',
            contract_number: contract.contract_number || '',
        });
        setShowContractDialog(true);
    }

    async function handleSaveContract() {
        if (!employeeId) return;
        setSaving(true);
        try {
            const payload: any = {
                tenant_id: tenantId,
                employee_id: employeeId,
                contract_type: contractForm.contract_type,
                start_date: contractForm.start_date,
                end_date: contractForm.end_date || null,
                basic_salary: Number(contractForm.basic_salary) || 0,
                currency: contractForm.currency,
                payment_frequency: contractForm.payment_frequency,
                working_hours_per_day: Number(contractForm.working_hours_per_day) || 8,
                working_days_per_week: Number(contractForm.working_days_per_week) || 5,
                annual_leave_days: Number(contractForm.annual_leave_days) || 21,
                notice_period_days: Number(contractForm.notice_period_days) || 30,
                probation_months: Number(contractForm.probation_months) || 3,
                status: contractForm.status,
                contract_number: contractForm.contract_number || null,
            };

            if (editingContract) {
                await updateContract(editingContract.id, payload);
                toast.success(t('تم تحديث العقد بنجاح', 'Contract updated successfully'));
            } else {
                await createContract(payload);
                toast.success(t('تم إنشاء العقد بنجاح', 'Contract created successfully'));
            }

            setShowContractDialog(false);
            await loadData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || t('فشل في حفظ العقد', 'Failed to save contract'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteContract(contractId: string) {
        if (!confirm(t('هل تريد حذف هذا العقد؟', 'Delete this contract?'))) return;
        try {
            const { error } = await supabase
                .from('employee_contracts')
                .delete()
                .eq('id', contractId);
            if (error) throw error;
            toast.success(t('تم حذف العقد', 'Contract deleted'));
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل الحذف', 'Delete failed'));
        }
    }

    async function handleActivateContract(contractId: string) {
        try {
            // Deactivate all other contracts first
            await supabase
                .from('employee_contracts')
                .update({ status: 'expired' })
                .eq('employee_id', employeeId)
                .eq('status', 'active');

            // Activate the selected one
            await updateContract(contractId, { status: 'active' } as any);
            toast.success(t('تم تفعيل العقد', 'Contract activated'));
            await loadData();
        } catch (err: any) {
            toast.error(err.message || t('فشل التفعيل', 'Activation failed'));
        }
    }

    // ─── Computed ───
    const activeContract = contracts.find(c => c.status === 'active');
    const expiredDocs = documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date());
    const expiringDocs = documents.filter(d => {
        if (!d.expiry_date) return false;
        const diff = new Date(d.expiry_date).getTime() - Date.now();
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    });

    // ═══ Contracts Columns ═══
    const contractColumns: NexaListColumn<EmployeeContract>[] = [
        { id: 'num', header: '#', width: 'w-12', cell: (_, i) => <span className="font-mono text-xs text-muted-foreground">{(i ?? 0) + 1}</span> },
        {
            id: 'type', header: t('النوع', 'Type'), width: 'w-28', cell: (row) => {
                const ct = CONTRACT_TYPES.find(c => c.value === row.contract_type);
                return <span className="text-sm">{isRTL ? ct?.ar : ct?.en}</span>;
            }
        },
        {
            id: 'period', header: t('الفترة', 'Period'), width: 'min-w-[140px]', cell: (row) => (
                <div className="text-xs font-mono">
                    <span>{new Date(row.start_date).toLocaleDateString()}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span>{row.end_date ? new Date(row.end_date).toLocaleDateString() : t('مفتوح', 'Open')}</span>
                </div>
            )
        },
        { id: 'salary', header: t('الراتب', 'Salary'), width: 'w-24', align: 'end', cell: (row) => <span className="font-mono">{row.basic_salary?.toLocaleString()}</span> },
        {
            id: 'status', header: t('الحالة', 'Status'), width: 'w-20', align: 'center', cell: (row) => {
                const st = CONTRACT_STATUS[row.status];
                return <Badge className={`text-[10px] ${st?.className}`}>{isRTL ? st?.ar : st?.en}</Badge>;
            }
        },
        ...(isEditable ? [{
            id: 'actions',
            header: '',
            width: 'w-28',
            align: 'center' as const,
            cell: (row: EmployeeContract) => (
                <div className="flex items-center gap-1 justify-center">
                    {row.status !== 'active' && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title={t('تفعيل', 'Activate')}
                            onClick={(e) => { e.stopPropagation(); handleActivateContract(row.id); }}>
                            <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => { e.stopPropagation(); openEditContract(row); }}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleDeleteContract(row.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        }] : []),
    ];

    // ═══ Documents Columns ═══
    const docColumns: NexaListColumn<any>[] = [
        { id: 'type', header: t('النوع', 'Type'), width: 'w-28', cell: (row) => <span className="text-sm">{DOC_TYPES[row.document_type]?.[isRTL ? 'ar' : 'en'] || row.document_type}</span> },
        { id: 'title', header: t('العنوان', 'Title'), width: 'min-w-[130px]', cell: (row) => <span className="text-sm font-medium">{row.title}</span> },
        { id: 'number', header: t('الرقم', 'Number'), width: 'w-24', cell: (row) => <span className="font-mono text-xs">{row.document_number || '—'}</span> },
        {
            id: 'expiry', header: t('الانتهاء', 'Expiry'), width: 'w-24', cell: (row) => {
                if (!row.expiry_date) return <span className="text-muted-foreground/40 text-xs">—</span>;
                const isExp = new Date(row.expiry_date) < new Date();
                const isSoon = !isExp && (new Date(row.expiry_date).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
                return <span className={`font-mono text-xs ${isExp ? 'text-red-600 font-bold' : isSoon ? 'text-amber-600' : ''}`}>
                    {new Date(row.expiry_date).toLocaleDateString()}{isExp ? ' ⚠️' : isSoon ? ' ⏳' : ''}
                </span>;
            }
        },
        { id: 'verified', header: '✓', width: 'w-10', align: 'center', cell: (row) => row.is_verified ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : null },
    ];

    // ═══════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ═══ Expiry Alerts ═══ */}
            {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
                <div className="space-y-2">
                    {expiredDocs.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                            <span className="text-sm text-red-700">
                                {t(`${expiredDocs.length} مستند منتهي الصلاحية`, `${expiredDocs.length} expired document(s)`)}
                            </span>
                        </div>
                    )}
                    {expiringDocs.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="text-sm text-amber-700">
                                {t(`${expiringDocs.length} مستند ينتهي خلال 30 يوم`, `${expiringDocs.length} expiring in 30 days`)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ 1. العقد الحالي ═══ */}
            <Section title={t('العقد الحالي', 'Current Contract')} icon={ScrollText} defaultOpen={true}
                badge={activeContract ? t('ساري', 'Active') : t('لا يوجد', 'None')}
                badgeClassName={activeContract ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                {activeContract ? (
                    <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />{t('النوع', 'Type')}</span>
                                    <p className="font-medium mt-0.5">{CONTRACT_TYPES.find(c => c.value === activeContract.contract_type)?.[isRTL ? 'ar' : 'en']}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{t('من', 'From')}</span>
                                    <p className="font-mono mt-0.5">{new Date(activeContract.start_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{t('إلى', 'To')}</span>
                                    <p className="font-mono mt-0.5">{activeContract.end_date ? new Date(activeContract.end_date).toLocaleDateString() : t('مفتوح', 'Open')}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />{t('الراتب الأساسي', 'Basic Salary')}</span>
                                    <p className="font-mono font-bold text-emerald-700 mt-0.5">{activeContract.basic_salary?.toLocaleString()} {activeContract.currency}</p>
                                </div>
                            </div>
                            {/* Extra contract details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mt-3 pt-3 border-t border-emerald-200/50">
                                <div>
                                    <span className="text-muted-foreground">{t('ساعات العمل', 'Work Hours')}</span>
                                    <p className="font-mono">{activeContract.working_hours_per_day}h / {t('يوم', 'day')}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('أيام العمل', 'Work Days')}</span>
                                    <p className="font-mono">{activeContract.working_days_per_week} {t('أيام/أسبوع', 'days/week')}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('الإجازات السنوية', 'Annual Leave')}</span>
                                    <p className="font-mono">{activeContract.annual_leave_days} {t('يوم', 'days')}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('فترة الإشعار', 'Notice Period')}</span>
                                    <p className="font-mono">{activeContract.notice_period_days} {t('يوم', 'days')}</p>
                                </div>
                            </div>
                            {isEditable && (
                                <div className="mt-3 pt-3 border-t border-emerald-200/50 flex justify-end">
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                        onClick={() => openEditContract(activeContract)}>
                                        <Pencil className="h-3 w-3" />
                                        {t('تعديل العقد', 'Edit Contract')}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="text-center py-6">
                        <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-muted-foreground text-sm">{t('لا يوجد عقد ساري', 'No active contract')}</p>
                        {isEditable && (
                            <Button size="sm" className="mt-3 h-8 text-xs gap-1.5" onClick={openCreateContract}>
                                <Plus className="h-3.5 w-3.5" />
                                {t('إنشاء عقد جديد', 'Create New Contract')}
                            </Button>
                        )}
                    </div>
                )}
            </Section>

            {/* ═══ 2. سجل العقود ═══ */}
            <Section title={t('سجل العقود', 'Contract History')} icon={FileText}
                badge={`${contracts.length}`}
                action={isEditable ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-background hover:bg-muted"
                        onClick={openCreateContract}>
                        <Plus className="h-3 w-3" />
                        {t('إضافة عقد', 'Add Contract')}
                    </Button>
                ) : undefined}>
                <NexaListTable
                    data={contracts}
                    columns={contractColumns}
                    isLoading={loading}
                    isRTL={isRTL}
                    direction={isRTL ? 'rtl' : 'ltr'}
                    totalCount={contracts.length}
                    countLabel={t('عقد', 'contracts')}
                    getRowKey={(row) => row.id}
                    emptyMessage={t('لا توجد عقود', 'No contracts')}
                    getRowAccent={(row) => row.status === 'active' ? 'border-s-emerald-400' : row.status === 'expired' ? 'border-s-red-400' : 'border-s-gray-300'}
                />
            </Section>

            {/* ═══ 3. المستندات ═══ */}
            <Section title={t('المستندات', 'Documents')} icon={FolderOpen}
                badge={`${documents.length}`}
                badgeClassName={expiredDocs.length > 0 ? 'bg-red-100 text-red-700' : ''}>
                <NexaListTable
                    data={documents}
                    columns={docColumns}
                    isLoading={loading}
                    isRTL={isRTL}
                    direction={isRTL ? 'rtl' : 'ltr'}
                    totalCount={documents.length}
                    countLabel={t('مستند', 'documents')}
                    getRowKey={(row) => row.id}
                    emptyMessage={t('لا توجد مستندات', 'No documents')}
                    getRowAccent={(row) => {
                        if (row.expiry_date && new Date(row.expiry_date) < new Date()) return 'border-s-red-400';
                        if (row.is_verified) return 'border-s-emerald-400';
                        return 'border-s-gray-300';
                    }}
                />
            </Section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* ═══ Contract Dialog — إنشاء / تعديل عقد ═══ */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ScrollText className="h-5 w-5 text-emerald-600" />
                            {editingContract
                                ? t('تعديل العقد', 'Edit Contract')
                                : t('إنشاء عقد جديد', 'Create New Contract')
                            }
                        </DialogTitle>
                        <DialogDescription>
                            {editingContract
                                ? t('تعديل بيانات العقد الحالي', 'Edit existing contract details')
                                : t('إضافة عقد عمل جديد للموظف', 'Add a new employment contract')
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Row 1: Contract Type + Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('نوع العقد', 'Contract Type')} *</Label>
                                <Select value={contractForm.contract_type}
                                    onValueChange={v => setContractForm(f => ({ ...f, contract_type: v }))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CONTRACT_TYPES.map(ct => (
                                            <SelectItem key={ct.value} value={ct.value}>
                                                {isRTL ? ct.ar : ct.en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('الحالة', 'Status')}</Label>
                                <Select value={contractForm.status}
                                    onValueChange={v => setContractForm(f => ({ ...f, status: v }))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CONTRACT_STATUS).map(([key, st]) => (
                                            <SelectItem key={key} value={key}>
                                                {isRTL ? st.ar : st.en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Contract Number */}
                        <div>
                            <Label className="text-xs mb-1.5 block">{t('رقم العقد', 'Contract Number')}</Label>
                            <Input className="h-9 text-sm" placeholder="C-2026-001"
                                value={contractForm.contract_number}
                                onChange={e => setContractForm(f => ({ ...f, contract_number: e.target.value }))} />
                        </div>

                        {/* Row 3: Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('تاريخ البداية', 'Start Date')} *
                                </Label>
                                <Input type="date" className="h-9 text-sm"
                                    value={contractForm.start_date}
                                    onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('تاريخ النهاية', 'End Date')}
                                </Label>
                                <Input type="date" className="h-9 text-sm"
                                    value={contractForm.end_date}
                                    onChange={e => setContractForm(f => ({ ...f, end_date: e.target.value }))} />
                            </div>
                        </div>

                        {/* Row 4: Salary + Currency */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs mb-1.5 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {t('الراتب الأساسي', 'Basic Salary')} *
                                </Label>
                                <Input type="number" className="h-9 text-sm font-mono" placeholder="5000"
                                    value={contractForm.basic_salary || ''}
                                    onChange={e => setContractForm(f => ({ ...f, basic_salary: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('العملة', 'Currency')}</Label>
                                <Select value={contractForm.currency}
                                    onValueChange={v => setContractForm(f => ({ ...f, currency: v }))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SAR">SAR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="AED">AED</SelectItem>
                                        <SelectItem value="TRY">TRY</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 5: Payment Frequency + Probation */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('دورة الدفع', 'Payment Frequency')}</Label>
                                <Select value={contractForm.payment_frequency}
                                    onValueChange={v => setContractForm(f => ({ ...f, payment_frequency: v }))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_FREQUENCIES.map(pf => (
                                            <SelectItem key={pf.value} value={pf.value}>
                                                {isRTL ? pf.ar : pf.en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block">{t('فترة التجربة (أشهر)', 'Probation (months)')}</Label>
                                <Input type="number" className="h-9 text-sm font-mono" min={0} max={12}
                                    value={contractForm.probation_months}
                                    onChange={e => setContractForm(f => ({ ...f, probation_months: Number(e.target.value) }))} />
                            </div>
                        </div>

                        {/* Row 6: Working Hours + Days */}
                        <div className="p-3 bg-muted/20 rounded-lg border space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {t('جدول العمل', 'Work Schedule')}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1 block">{t('ساعات العمل / يوم', 'Hours / Day')}</Label>
                                    <Input type="number" className="h-8 text-sm font-mono" min={1} max={16}
                                        value={contractForm.working_hours_per_day}
                                        onChange={e => setContractForm(f => ({ ...f, working_hours_per_day: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1 block">{t('أيام العمل / أسبوع', 'Days / Week')}</Label>
                                    <Input type="number" className="h-8 text-sm font-mono" min={1} max={7}
                                        value={contractForm.working_days_per_week}
                                        onChange={e => setContractForm(f => ({ ...f, working_days_per_week: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1 block">{t('الإجازة السنوية (أيام)', 'Annual Leave (days)')}</Label>
                                    <Input type="number" className="h-8 text-sm font-mono" min={0} max={60}
                                        value={contractForm.annual_leave_days}
                                        onChange={e => setContractForm(f => ({ ...f, annual_leave_days: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1 block">{t('فترة الإشعار (أيام)', 'Notice Period (days)')}</Label>
                                    <Input type="number" className="h-8 text-sm font-mono" min={0} max={180}
                                        value={contractForm.notice_period_days}
                                        onChange={e => setContractForm(f => ({ ...f, notice_period_days: Number(e.target.value) }))} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowContractDialog(false)}>
                            <X className="h-3.5 w-3.5 me-1.5" />
                            {t('إلغاء', 'Cancel')}
                        </Button>
                        <Button onClick={handleSaveContract} disabled={saving || !contractForm.start_date || !contractForm.basic_salary}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Save className="h-4 w-4 me-1.5" />}
                            {saving
                                ? t('جاري الحفظ...', 'Saving...')
                                : editingContract
                                    ? t('تحديث العقد', 'Update Contract')
                                    : t('إنشاء العقد', 'Create Contract')
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
