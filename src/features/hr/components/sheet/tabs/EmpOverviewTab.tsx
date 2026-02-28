/**
 * 👤 EmpOverviewTab — البيانات الأساسية للموظف
 * مستوحى من PartyOverviewTab — مع أقسام Accordion
 */

import { useState } from 'react';
import type { SheetMode } from '../EmployeeSheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ChevronDown, ChevronUp, User, CreditCard, Globe, Camera,
} from 'lucide-react';

interface Props {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    isRTL: boolean;
}

// ═══ Accordion Section ═══
function Section({ title, icon: Icon, defaultOpen = true, children, badge }: {
    title: string; icon: React.ElementType; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-start"
            >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm flex-1">{title}</span>
                {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open && <div className="p-4 space-y-4">{children}</div>}
        </div>
    );
}

// ═══ Field Row ═══
function Field({ label, children, required }: {
    label: string; children: React.ReactNode; required?: boolean;
}) {
    return (
        <div className="grid grid-cols-3 items-center gap-3">
            <Label className="text-sm text-muted-foreground text-end">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="col-span-2">{children}</div>
        </div>
    );
}

const NATIONALITIES = [
    { code: 'SA', ar: 'سعودي', en: 'Saudi' },
    { code: 'UA', ar: 'أوكراني', en: 'Ukrainian' },
    { code: 'TR', ar: 'تركي', en: 'Turkish' },
    { code: 'EG', ar: 'مصري', en: 'Egyptian' },
    { code: 'SY', ar: 'سوري', en: 'Syrian' },
    { code: 'JO', ar: 'أردني', en: 'Jordanian' },
    { code: 'PK', ar: 'باكستاني', en: 'Pakistani' },
    { code: 'IN', ar: 'هندي', en: 'Indian' },
    { code: 'BD', ar: 'بنغلاديشي', en: 'Bangladeshi' },
    { code: 'PH', ar: 'فلبيني', en: 'Filipino' },
    { code: 'OTHER', ar: 'أخرى', en: 'Other' },
];

export default function EmpOverviewTab({ data, mode, onChange, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'create' || mode === 'edit';
    const initials = (data.first_name_ar?.[0] || '') + (data.last_name_ar?.[0] || '');

    if (!isEditable) {
        // ═══ VIEW MODE ═══
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                {/* Profile Card */}
                <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-erp-navy/5 to-transparent rounded-2xl border">
                    <Avatar className="h-20 w-20 border-3 border-white shadow-lg">
                        {data.avatar_url && <AvatarImage src={data.avatar_url} />}
                        <AvatarFallback className="bg-erp-navy text-white text-2xl font-bold">{initials || '👤'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">{data.full_name_ar || `${data.first_name_ar || ''} ${data.last_name_ar || ''}`}</h3>
                        {data.full_name_en && <p className="text-sm text-muted-foreground">{data.full_name_en}</p>}
                        <div className="flex items-center gap-2 mt-1">
                            {data.employee_number && <Badge variant="outline" className="font-mono text-xs">{data.employee_number}</Badge>}
                            {data.nationality && <Badge variant="secondary" className="text-xs">{NATIONALITIES.find(n => n.code === data.nationality)?.[isRTL ? 'ar' : 'en'] || data.nationality}</Badge>}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <Section title={t('البيانات الشخصية', 'Personal Info')} icon={User}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('الاسم بالعربي', 'Arabic Name')} value={data.full_name_ar} />
                        <ViewField label={t('الاسم بالإنجليزي', 'English Name')} value={data.full_name_en} />
                        <ViewField label={t('تاريخ الميلاد', 'Date of Birth')} value={data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : '—'} />
                        <ViewField label={t('الجنس', 'Gender')} value={data.gender === 'male' ? t('ذكر', 'Male') : t('أنثى', 'Female')} />
                        <ViewField label={t('الحالة الاجتماعية', 'Marital Status')} value={
                            { single: t('أعزب', 'Single'), married: t('متزوج', 'Married'), divorced: t('مطلق', 'Divorced'), widowed: t('أرمل', 'Widowed') }[data.marital_status] || '—'
                        } />
                        <ViewField label={t('الجنسية', 'Nationality')} value={NATIONALITIES.find(n => n.code === data.nationality)?.[isRTL ? 'ar' : 'en'] || data.nationality || '—'} />
                    </div>
                </Section>

                <Section title={t('الهوية والوثائق', 'Identity')} icon={CreditCard} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('رقم الهوية', 'National ID')} value={data.national_id} mono />
                        <ViewField label={t('رقم الجواز', 'Passport')} value={data.passport_number} mono />
                    </div>
                </Section>
            </div>
        );
    }

    // ═══ EDIT / CREATE MODE ═══
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Avatar Upload */}
            <div className="flex justify-center">
                <div className="relative group cursor-pointer">
                    <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 group-hover:border-erp-primary transition-colors">
                        {data.avatar_url && <AvatarImage src={data.avatar_url} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-2xl">{initials || '👤'}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                        <Camera className="h-5 w-5 text-white" />
                    </div>
                </div>
            </div>

            {/* Names Section */}
            <Section title={t('الاسم', 'Name')} icon={User}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('الاسم الأول (عربي)', 'First Name (AR)')} <span className="text-red-500">*</span></Label>
                        <Input value={data.first_name_ar || ''} onChange={e => onChange({ first_name_ar: e.target.value })}
                            placeholder={t('أحمد', 'Ahmed')} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('اسم العائلة (عربي)', 'Last Name (AR)')}</Label>
                        <Input value={data.last_name_ar || ''} onChange={e => onChange({ last_name_ar: e.target.value })}
                            placeholder={t('الخطيب', 'Al-Khatib')} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('الاسم الأول (إنجليزي)', 'First Name (EN)')}</Label>
                        <Input value={data.first_name_en || ''} onChange={e => onChange({ first_name_en: e.target.value })}
                            placeholder="Ahmed" className="mt-1" dir="ltr" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('اسم العائلة (إنجليزي)', 'Last Name (EN)')}</Label>
                        <Input value={data.last_name_en || ''} onChange={e => onChange({ last_name_en: e.target.value })}
                            placeholder="Al-Khatib" className="mt-1" dir="ltr" />
                    </div>
                </div>
            </Section>

            {/* Personal Info */}
            <Section title={t('البيانات الشخصية', 'Personal Info')} icon={User}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('تاريخ الميلاد', 'Date of Birth')}</Label>
                        <Input type="date" value={data.date_of_birth || ''} onChange={e => onChange({ date_of_birth: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('الجنس', 'Gender')}</Label>
                        <Select value={data.gender || ''} onValueChange={v => onChange({ gender: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">{t('ذكر', 'Male')}</SelectItem>
                                <SelectItem value="female">{t('أنثى', 'Female')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">{t('الحالة الاجتماعية', 'Marital Status')}</Label>
                        <Select value={data.marital_status || ''} onValueChange={v => onChange({ marital_status: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">{t('أعزب', 'Single')}</SelectItem>
                                <SelectItem value="married">{t('متزوج', 'Married')}</SelectItem>
                                <SelectItem value="divorced">{t('مطلق', 'Divorced')}</SelectItem>
                                <SelectItem value="widowed">{t('أرمل', 'Widowed')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">{t('الجنسية', 'Nationality')}</Label>
                        <Select value={data.nationality || ''} onValueChange={v => onChange({ nationality: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                            <SelectContent>
                                {NATIONALITIES.map(n => (
                                    <SelectItem key={n.code} value={n.code}>{isRTL ? n.ar : n.en}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Section>

            {/* Identity */}
            <Section title={t('الهوية والوثائق', 'Identity')} icon={CreditCard} defaultOpen={false}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('رقم الهوية', 'National ID')}</Label>
                        <Input value={data.national_id || ''} onChange={e => onChange({ national_id: e.target.value })}
                            className="mt-1 font-mono" dir="ltr" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('رقم الجواز', 'Passport Number')}</Label>
                        <Input value={data.passport_number || ''} onChange={e => onChange({ passport_number: e.target.value })}
                            className="mt-1 font-mono" dir="ltr" />
                    </div>
                </div>
            </Section>
        </div>
    );
}

// Helper: View-only field
function ViewField({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
        </div>
    );
}
