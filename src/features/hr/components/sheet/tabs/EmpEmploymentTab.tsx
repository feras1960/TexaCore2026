/**
 * 💼 EmpEmploymentTab — البيانات الوظيفية
 */

import { useState, useEffect } from 'react';
import type { SheetMode } from '../EmployeeSheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    ChevronDown, ChevronUp, Briefcase, Building2, UserCheck, GitBranch,
} from 'lucide-react';
import { getDepartments, getPositions, type Department, type Position } from '../../../services/hrService';

interface Props {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    isRTL: boolean;
}

function Section({ title, icon: Icon, defaultOpen = true, children }: {
    title: string; icon: React.ElementType; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-start">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm flex-1">{title}</span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open && <div className="p-4 space-y-4">{children}</div>}
        </div>
    );
}

function ViewField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-medium">{value || '—'}</p>
        </div>
    );
}

const EMP_TYPES: Record<string, { ar: string; en: string }> = {
    full_time: { ar: 'دوام كامل', en: 'Full Time' },
    part_time: { ar: 'دوام جزئي', en: 'Part Time' },
    contract: { ar: 'عقد', en: 'Contract' },
    temporary: { ar: 'مؤقت', en: 'Temporary' },
    intern: { ar: 'متدرب', en: 'Intern' },
};

const STATUS_TYPES: Record<string, { ar: string; en: string }> = {
    active: { ar: 'نشط', en: 'Active' },
    on_leave: { ar: 'في إجازة', en: 'On Leave' },
    suspended: { ar: 'معلق', en: 'Suspended' },
    terminated: { ar: 'منتهي', en: 'Terminated' },
    resigned: { ar: 'مستقيل', en: 'Resigned' },
};

export default function EmpEmploymentTab({ data, mode, onChange, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'create' || mode === 'edit';

    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    useEffect(() => {
        getDepartments().then(setDepartments).catch(console.error);
        getPositions().then(setPositions).catch(console.error);
    }, []);

    if (!isEditable) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <Section title={t('الوظيفة', 'Position')} icon={Briefcase}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('القسم', 'Department')} value={
                            data.department ? (isRTL ? data.department.name_ar : (data.department.name_en || data.department.name_ar)) :
                                departments.find(d => d.id === data.department_id)?.[isRTL ? 'name_ar' : 'name_en'] || '—'
                        } />
                        <ViewField label={t('المسمى الوظيفي', 'Position')} value={
                            data.position ? (isRTL ? data.position.name_ar : (data.position.name_en || data.position.name_ar)) :
                                positions.find(p => p.id === data.position_id)?.[isRTL ? 'name_ar' : 'name_en'] || '—'
                        } />
                        <ViewField label={t('نوع التوظيف', 'Employment Type')} value={EMP_TYPES[data.employment_type]?.[isRTL ? 'ar' : 'en'] || '—'} />
                        <ViewField label={t('حالة التوظيف', 'Status')} value={STATUS_TYPES[data.employment_status]?.[isRTL ? 'ar' : 'en'] || '—'} />
                    </div>
                </Section>

                <Section title={t('التواريخ', 'Dates')} icon={Briefcase} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('تاريخ التعيين', 'Hire Date')} value={data.hire_date ? new Date(data.hire_date).toLocaleDateString() : '—'} />
                        <ViewField label={t('نهاية فترة التجربة', 'Probation End')} value={data.probation_end_date ? new Date(data.probation_end_date).toLocaleDateString() : '—'} />
                        {data.termination_date && (
                            <>
                                <ViewField label={t('تاريخ إنهاء الخدمة', 'Termination Date')} value={new Date(data.termination_date).toLocaleDateString()} />
                                <ViewField label={t('سبب الإنهاء', 'Termination Reason')} value={data.termination_reason} />
                            </>
                        )}
                    </div>
                </Section>
            </div>
        );
    }

    // ═══ EDIT MODE ═══
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <Section title={t('الوظيفة', 'Position')} icon={Briefcase}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('القسم', 'Department')}</Label>
                        <Select value={data.department_id || ''} onValueChange={v => onChange({ department_id: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={t('اختر القسم', 'Select Department')} /></SelectTrigger>
                            <SelectContent>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{isRTL ? d.name_ar : (d.name_en || d.name_ar)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">{t('المسمى الوظيفي', 'Position')}</Label>
                        <Select value={data.position_id || ''} onValueChange={v => onChange({ position_id: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={t('اختر المسمى', 'Select Position')} /></SelectTrigger>
                            <SelectContent>
                                {positions.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">{t('نوع التوظيف', 'Employment Type')}</Label>
                        <Select value={data.employment_type || 'full_time'} onValueChange={v => onChange({ employment_type: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(EMP_TYPES).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">{t('حالة التوظيف', 'Status')}</Label>
                        <Select value={data.employment_status || 'active'} onValueChange={v => onChange({ employment_status: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(STATUS_TYPES).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Section>

            <Section title={t('التواريخ', 'Dates')} icon={Briefcase}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('تاريخ التعيين', 'Hire Date')}</Label>
                        <Input type="date" value={data.hire_date || ''} onChange={e => onChange({ hire_date: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('نهاية فترة التجربة', 'Probation End')}</Label>
                        <Input type="date" value={data.probation_end_date || ''} onChange={e => onChange({ probation_end_date: e.target.value })} className="mt-1" />
                    </div>
                </div>
            </Section>

            <Section title={t('ملاحظات', 'Notes')} icon={Briefcase} defaultOpen={false}>
                <Textarea value={data.notes || ''} onChange={e => onChange({ notes: e.target.value })}
                    rows={3} placeholder={t('ملاحظات إضافية...', 'Additional notes...')} />
            </Section>
        </div>
    );
}
