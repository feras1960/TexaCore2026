/**
 * ════════════════════════════════════════════════════════════════
 * 👤 EmpProfileTab — الملف الشخصي الشامل
 * 5 أسطر منفتحة (Accordion):
 *   1. البيانات الأساسية
 *   2. بيانات الاتصال
 *   3. البيانات الوظيفية
 *   4. البيانات المالية
 *   5. الصلاحيات والدخول
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import type { SheetMode } from '../EmployeeSheet';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    ChevronDown, ChevronUp, User, Phone, Mail, MapPin, Briefcase,
    Wallet, Shield, Building, CreditCard, AlertTriangle, Headphones,
    Camera, Lock, Key, UserCheck, Globe, Plus, X as XIcon, Languages,
} from 'lucide-react';
import { getDepartments, getPositions, type Department, type Position } from '../../../services/hrService';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface Props {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    isRTL: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const NATIONALITIES = [
    { code: 'SA', ar: 'سعودي', en: 'Saudi', flag: '🇸🇦' },
    { code: 'UA', ar: 'أوكراني', en: 'Ukrainian', flag: '🇺🇦' },
    { code: 'TR', ar: 'تركي', en: 'Turkish', flag: '🇹🇷' },
    { code: 'EG', ar: 'مصري', en: 'Egyptian', flag: '🇪🇬' },
    { code: 'SY', ar: 'سوري', en: 'Syrian', flag: '🇸🇾' },
    { code: 'JO', ar: 'أردني', en: 'Jordanian', flag: '🇯🇴' },
    { code: 'IQ', ar: 'عراقي', en: 'Iraqi', flag: '🇮🇶' },
    { code: 'PK', ar: 'باكستاني', en: 'Pakistani', flag: '🇵🇰' },
    { code: 'IN', ar: 'هندي', en: 'Indian', flag: '🇮🇳' },
    { code: 'BD', ar: 'بنغلاديشي', en: 'Bangladeshi', flag: '🇧🇩' },
    { code: 'PH', ar: 'فلبيني', en: 'Filipino', flag: '🇵🇭' },
    { code: 'OTHER', ar: 'أخرى', en: 'Other', flag: '🌍' },
];

const EMP_TYPES: Record<string, { ar: string; en: string }> = {
    full_time: { ar: 'دوام كامل', en: 'Full Time' },
    part_time: { ar: 'دوام جزئي', en: 'Part Time' },
    contract: { ar: 'عقد', en: 'Contract' },
    temporary: { ar: 'مؤقت', en: 'Temporary' },
    intern: { ar: 'متدرب', en: 'Intern' },
};

const STATUS_TYPES: Record<string, { ar: string; en: string; color: string }> = {
    active: { ar: 'نشط', en: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    on_leave: { ar: 'في إجازة', en: 'On Leave', color: 'bg-amber-100 text-amber-700' },
    suspended: { ar: 'معلق', en: 'Suspended', color: 'bg-red-100 text-red-700' },
    terminated: { ar: 'منتهي', en: 'Terminated', color: 'bg-gray-100 text-gray-600' },
    resigned: { ar: 'مستقيل', en: 'Resigned', color: 'bg-orange-100 text-orange-700' },
};

const MARITAL: Record<string, { ar: string; en: string }> = {
    single: { ar: 'أعزب', en: 'Single' },
    married: { ar: 'متزوج', en: 'Married' },
    divorced: { ar: 'مطلق', en: 'Divorced' },
    widowed: { ar: 'أرمل', en: 'Widowed' },
};

// ═══════════════════════════════════════════════════════════════
// Reusable Components
// ═══════════════════════════════════════════════════════════════

function Section({ id, title, icon: Icon, defaultOpen = false, children, badge, badgeClassName }: {
    id: string; title: string; icon: React.ElementType; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string; badgeClassName?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border rounded-xl overflow-hidden transition-all">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-start group"
            >
                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm group-hover:shadow-md transition-shadow">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-semibold text-sm flex-1">{title}</span>
                {badge && <Badge variant="secondary" className={`text-xs ${badgeClassName || ''}`}>{badge}</Badge>}
                <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
            </button>
            <div className={`transition-all duration-300 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-5 space-y-4 border-t">{children}</div>
            </div>
        </div>
    );
}

function ViewField({ label, value, mono, icon: Icon }: {
    label: string; value?: string | null; mono?: boolean; icon?: React.ElementType;
}) {
    return (
        <div className="flex items-start gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className={`text-sm font-medium truncate ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
                    {value || '—'}
                </p>
            </div>
        </div>
    );
}

function FormField({ label, required, children }: {
    label: string; required?: boolean; children: React.ReactNode;
}) {
    return (
        <div>
            <Label className="text-xs mb-1 block">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function EmpProfileTab({ data, mode, onChange, isRTL }: Props) {
    const { language } = useLanguage();
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'create' || mode === 'edit';
    const initials = (data.first_name_ar?.[0] || '') + (data.last_name_ar?.[0] || '');

    // Fetch departments + positions for selectors
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    // Extra languages (beyond ar/en)
    const [extraLangs, setExtraLangs] = useState<SupportedLanguage[]>([]);

    useEffect(() => {
        getDepartments().then(setDepartments).catch(console.error);
        getPositions().then(setPositions).catch(console.error);
    }, []);

    // Load linked user profile
    useEffect(() => {
        if (data.user_profile_id) {
            supabase.from('user_profiles').select('id, email, full_name, role, is_active')
                .eq('id', data.user_profile_id).single()
                .then(({ data: up }) => setUserProfile(up));
        }
    }, [data.user_profile_id]);

    // Detect extra languages from custom_fields.name_translations
    useEffect(() => {
        const translations = data.custom_fields?.name_translations;
        if (translations && typeof translations === 'object') {
            const langs = Object.keys(translations).filter(
                k => k !== 'ar' && k !== 'en' && SUPPORTED_LANGUAGES.some(l => l.code === k)
            ) as SupportedLanguage[];
            setExtraLangs(langs);
        }
    }, [data.custom_fields?.name_translations]);

    // Helper: update extra language translations
    const updateTranslation = (lang: SupportedLanguage, field: 'first_name' | 'last_name', value: string) => {
        const translations = { ...(data.custom_fields?.name_translations || {}) };
        if (!translations[lang]) translations[lang] = {};
        translations[lang][field] = value;
        onChange({ custom_fields: { ...(data.custom_fields || {}), name_translations: translations } });
    };

    const getTranslation = (lang: SupportedLanguage, field: 'first_name' | 'last_name'): string => {
        return data.custom_fields?.name_translations?.[lang]?.[field] || '';
    };

    const addLanguage = (lang: SupportedLanguage) => {
        if (!extraLangs.includes(lang)) {
            setExtraLangs(prev => [...prev, lang]);
        }
    };

    const removeLanguage = (lang: SupportedLanguage) => {
        setExtraLangs(prev => prev.filter(l => l !== lang));
        // Also remove from custom_fields
        const translations = { ...(data.custom_fields?.name_translations || {}) };
        delete translations[lang];
        onChange({ custom_fields: { ...(data.custom_fields || {}), name_translations: translations } });
    };

    // Available languages to add (exclude ar, en, and already added)
    const availableLangs = SUPPORTED_LANGUAGES.filter(
        l => l.code !== 'ar' && l.code !== 'en' && !extraLangs.includes(l.code)
    );

    // Show current UI language info
    const currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === language);
    const isCurrentLangExtraNative = language !== 'ar' && language !== 'en';

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ═══ Avatar (Edit Mode Only) ═══ */}
            {isEditable && (
                <div className="flex justify-center py-2">
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
            )}

            {/* ═════════════════════════════════════════════════ */}
            {/* 1. البيانات الأساسية */}
            {/* ═════════════════════════════════════════════════ */}
            <Section id="basic" title={t('البيانات الأساسية', 'Basic Information')} icon={User} defaultOpen={true}>
                {isEditable ? (
                    <div className="space-y-4">
                        {/* ═══ Arabic Name (always shown) ═══ */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-muted-foreground">🇸🇦 {t('الاسم بالعربية', 'Arabic Name')}</span>
                            <Badge variant="outline" className="text-[10px]">{t('أساسي', 'Required')}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('الاسم الأول', 'First Name')} required>
                                <Input value={data.first_name_ar || ''} onChange={e => onChange({ first_name_ar: e.target.value })}
                                    placeholder={t('أحمد', 'Ahmed')} />
                            </FormField>
                            <FormField label={t('اسم العائلة', 'Last Name')}>
                                <Input value={data.last_name_ar || ''} onChange={e => onChange({ last_name_ar: e.target.value })}
                                    placeholder={t('الخطيب', 'Al-Khatib')} />
                            </FormField>
                        </div>

                        {/* ═══ English Name (always shown) ═══ */}
                        <div className="flex items-center gap-2 mb-1 mt-3">
                            <span className="text-xs font-semibold text-muted-foreground">🇬🇧 {t('الاسم بالإنجليزية', 'English Name')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('الاسم الأول', 'First Name')}>
                                <Input value={data.first_name_en || ''} onChange={e => onChange({ first_name_en: e.target.value })}
                                    placeholder="Ahmed" dir="ltr" />
                            </FormField>
                            <FormField label={t('اسم العائلة', 'Last Name')}>
                                <Input value={data.last_name_en || ''} onChange={e => onChange({ last_name_en: e.target.value })}
                                    placeholder="Al-Khatib" dir="ltr" />
                            </FormField>
                        </div>

                        {/* ═══ Current UI Language (if different from ar/en) ═══ */}
                        {isCurrentLangExtraNative && !extraLangs.includes(language) && (
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                        {currentLangConfig?.flag} {t(`الاسم بالـ ${currentLangConfig?.nativeName}`, `Name in ${currentLangConfig?.name}`)}
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 gap-1"
                                        onClick={() => addLanguage(language)}>
                                        <Plus className="h-3 w-3" /> {t('إضافة', 'Add')}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ═══ Extra Languages ═══ */}
                        {extraLangs.map(lang => {
                            const cfg = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                            if (!cfg) return null;
                            return (
                                <div key={lang} className="p-3 bg-muted/20 rounded-lg border relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                            {cfg.flag} {cfg.nativeName} ({cfg.name})
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-500"
                                            onClick={() => removeLanguage(lang)}>
                                            <XIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs mb-0.5 block">{t('الاسم الأول', 'First Name')}</Label>
                                            <Input value={getTranslation(lang, 'first_name')}
                                                onChange={e => updateTranslation(lang, 'first_name', e.target.value)}
                                                dir={cfg.direction} className="h-8 text-sm" />
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-0.5 block">{t('اسم العائلة', 'Last Name')}</Label>
                                            <Input value={getTranslation(lang, 'last_name')}
                                                onChange={e => updateTranslation(lang, 'last_name', e.target.value)}
                                                dir={cfg.direction} className="h-8 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* ═══ Add Language Button ═══ */}
                        {availableLangs.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Select onValueChange={(v) => addLanguage(v as SupportedLanguage)}>
                                    <SelectTrigger className="h-8 w-auto gap-1.5 text-xs text-muted-foreground border-dashed">
                                        <Languages className="h-3.5 w-3.5" />
                                        <SelectValue placeholder={t('إضافة لغة أخرى', 'Add language')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableLangs.map(l => (
                                            <SelectItem key={l.code} value={l.code} className="text-sm">
                                                {l.flag} {l.nativeName} ({l.name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-[10px] text-muted-foreground/60">
                                    {t('9 لغات مدعومة', '9 languages supported')}
                                </span>
                            </div>
                        )}

                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('تاريخ الميلاد', 'Date of Birth')}>
                                <Input type="date" value={data.date_of_birth || ''} onChange={e => onChange({ date_of_birth: e.target.value })} />
                            </FormField>
                            <FormField label={t('الجنس', 'Gender')}>
                                <Select value={data.gender || ''} onValueChange={v => onChange({ gender: v })}>
                                    <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">{t('ذكر', 'Male')}</SelectItem>
                                        <SelectItem value="female">{t('أنثى', 'Female')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label={t('الحالة الاجتماعية', 'Marital Status')}>
                                <Select value={data.marital_status || ''} onValueChange={v => onChange({ marital_status: v })}>
                                    <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(MARITAL).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label={t('الجنسية', 'Nationality')}>
                                <Select value={data.nationality || ''} onValueChange={v => onChange({ nationality: v })}>
                                    <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                    <SelectContent>
                                        {NATIONALITIES.map(n => (
                                            <SelectItem key={n.code} value={n.code}>{n.flag} {isRTL ? n.ar : n.en}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('رقم الهوية', 'National ID')}>
                                <Input value={data.national_id || ''} onChange={e => onChange({ national_id: e.target.value })}
                                    className="font-mono" dir="ltr" />
                            </FormField>
                            <FormField label={t('رقم الجواز', 'Passport')}>
                                <Input value={data.passport_number || ''} onChange={e => onChange({ passport_number: e.target.value })}
                                    className="font-mono" dir="ltr" />
                            </FormField>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Profile Card (View) */}
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-erp-navy/5 to-transparent rounded-xl">
                            <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
                                {data.avatar_url && <AvatarImage src={data.avatar_url} />}
                                <AvatarFallback className="bg-erp-navy text-white text-xl font-bold">{initials || '👤'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-lg font-bold">{data.full_name_ar || `${data.first_name_ar || ''} ${data.last_name_ar || ''}`}</h3>
                                {data.full_name_en && <p className="text-sm text-muted-foreground">{data.full_name_en}</p>}
                                {/* Show extra language names */}
                                {data.custom_fields?.name_translations && Object.entries(data.custom_fields.name_translations).map(([lang, names]: [string, any]) => {
                                    const cfg = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                                    if (!cfg || (!names.first_name && !names.last_name)) return null;
                                    return (
                                        <p key={lang} className="text-xs text-muted-foreground/70">
                                            {cfg.flag} {names.first_name || ''} {names.last_name || ''}
                                        </p>
                                    );
                                })}
                                <div className="flex items-center gap-2 mt-1">
                                    {data.employee_number && <Badge variant="outline" className="font-mono text-xs">{data.employee_number}</Badge>}
                                    {data.nationality && (
                                        <span className="text-xs">{NATIONALITIES.find(n => n.code === data.nationality)?.flag} {NATIONALITIES.find(n => n.code === data.nationality)?.[isRTL ? 'ar' : 'en']}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <ViewField label={t('تاريخ الميلاد', 'Birth Date')} value={data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : undefined} />
                            <ViewField label={t('الجنس', 'Gender')} value={data.gender === 'male' ? t('ذكر', 'Male') : data.gender === 'female' ? t('أنثى', 'Female') : undefined} />
                            <ViewField label={t('الحالة الاجتماعية', 'Marital')} value={MARITAL[data.marital_status]?.[isRTL ? 'ar' : 'en']} />
                            <ViewField label={t('رقم الهوية', 'National ID')} value={data.national_id} mono icon={CreditCard} />
                            <ViewField label={t('رقم الجواز', 'Passport')} value={data.passport_number} mono icon={Globe} />
                        </div>
                    </div>
                )}
            </Section>

            {/* ═════════════════════════════════════════════════ */}
            {/* 2. بيانات الاتصال */}
            {/* ═════════════════════════════════════════════════ */}
            <Section id="contact" title={t('بيانات الاتصال', 'Contact Information')} icon={Phone}>
                {isEditable ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('الهاتف', 'Phone')}>
                                <Input value={data.phone || ''} onChange={e => onChange({ phone: e.target.value })}
                                    className="font-mono" dir="ltr" placeholder="+966 ..." />
                            </FormField>
                            <FormField label={t('الجوال', 'Mobile')}>
                                <Input value={data.mobile || ''} onChange={e => onChange({ mobile: e.target.value })}
                                    className="font-mono" dir="ltr" placeholder="+966 5..." />
                            </FormField>
                            <div className="col-span-2">
                                <FormField label={t('البريد الإلكتروني', 'Email')}>
                                    <Input type="email" value={data.email || ''} onChange={e => onChange({ email: e.target.value })}
                                        dir="ltr" placeholder="name@company.com" />
                                </FormField>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('المدينة', 'City')}>
                                <Input value={data.city || ''} onChange={e => onChange({ city: e.target.value })} />
                            </FormField>
                            <FormField label={t('الدولة', 'Country')}>
                                <Input value={data.country || ''} onChange={e => onChange({ country: e.target.value })} />
                            </FormField>
                            <div className="col-span-2">
                                <FormField label={t('العنوان', 'Address')}>
                                    <Textarea value={data.address || ''} onChange={e => onChange({ address: e.target.value })} rows={2} />
                                </FormField>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('جهة الطوارئ', 'Emergency Contact')}>
                                <Input value={data.emergency_contact_name || ''} onChange={e => onChange({ emergency_contact_name: e.target.value })} />
                            </FormField>
                            <FormField label={t('رقم الطوارئ', 'Emergency Phone')}>
                                <Input value={data.emergency_contact_phone || ''} onChange={e => onChange({ emergency_contact_phone: e.target.value })}
                                    className="font-mono" dir="ltr" />
                            </FormField>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ViewField icon={Phone} label={t('الهاتف', 'Phone')} value={data.phone} mono />
                            <ViewField icon={Phone} label={t('الجوال', 'Mobile')} value={data.mobile} mono />
                            <ViewField icon={Mail} label={t('البريد', 'Email')} value={data.email} />
                            <ViewField icon={MapPin} label={t('المدينة', 'City')} value={data.city} />
                        </div>
                        {data.address && (
                            <ViewField icon={MapPin} label={t('العنوان', 'Address')} value={data.address} />
                        )}
                        {(data.emergency_contact_name || data.emergency_contact_phone) && (
                            <>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <ViewField icon={AlertTriangle} label={t('جهة الطوارئ', 'Emergency')} value={data.emergency_contact_name} />
                                    <ViewField icon={Phone} label={t('رقم الطوارئ', 'Emergency #')} value={data.emergency_contact_phone} mono />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Section>

            {/* ═════════════════════════════════════════════════ */}
            {/* 3. البيانات الوظيفية */}
            {/* ═════════════════════════════════════════════════ */}
            <Section id="employment" title={t('البيانات الوظيفية', 'Employment Details')} icon={Briefcase}
                badge={STATUS_TYPES[data.employment_status]?.[isRTL ? 'ar' : 'en']}
                badgeClassName={STATUS_TYPES[data.employment_status]?.color}
            >
                {isEditable ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('القسم', 'Department')}>
                                <Select value={data.department_id || ''} onValueChange={v => onChange({ department_id: v })}>
                                    <SelectTrigger><SelectValue placeholder={t('اختر القسم', 'Select Dept')} /></SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{isRTL ? d.name_ar : (d.name_en || d.name_ar)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label={t('المسمى الوظيفي', 'Position')}>
                                <Select value={data.position_id || ''} onValueChange={v => onChange({ position_id: v })}>
                                    <SelectTrigger><SelectValue placeholder={t('اختر المسمى', 'Select Title')} /></SelectTrigger>
                                    <SelectContent>
                                        {positions.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label={t('نوع التوظيف', 'Employment Type')}>
                                <Select value={data.employment_type || 'full_time'} onValueChange={v => onChange({ employment_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(EMP_TYPES).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label={t('حالة التوظيف', 'Status')}>
                                <Select value={data.employment_status || 'active'} onValueChange={v => onChange({ employment_status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_TYPES).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('تاريخ التعيين', 'Hire Date')}>
                                <Input type="date" value={data.hire_date || ''} onChange={e => onChange({ hire_date: e.target.value })} />
                            </FormField>
                            <FormField label={t('نهاية التجربة', 'Probation End')}>
                                <Input type="date" value={data.probation_end_date || ''} onChange={e => onChange({ probation_end_date: e.target.value })} />
                            </FormField>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField icon={Building} label={t('القسم', 'Department')} value={
                            data.department ? (isRTL ? data.department.name_ar : (data.department.name_en || data.department.name_ar)) :
                                departments.find(d => d.id === data.department_id)?.[isRTL ? 'name_ar' as const : 'name_en' as const] ?? undefined
                        } />
                        <ViewField icon={Briefcase} label={t('المسمى', 'Position')} value={
                            data.position ? (isRTL ? data.position.name_ar : (data.position.name_en || data.position.name_ar)) :
                                positions.find(p => p.id === data.position_id)?.[isRTL ? 'name_ar' as const : 'name_en' as const] ?? undefined
                        } />
                        <ViewField label={t('نوع التوظيف', 'Type')} value={EMP_TYPES[data.employment_type]?.[isRTL ? 'ar' : 'en']} />
                        <ViewField label={t('تاريخ التعيين', 'Hired')} value={data.hire_date ? new Date(data.hire_date).toLocaleDateString() : undefined} />
                        <ViewField label={t('نهاية التجربة', 'Probation')} value={data.probation_end_date ? new Date(data.probation_end_date).toLocaleDateString() : undefined} />
                        {data.termination_date && (
                            <ViewField label={t('إنهاء الخدمة', 'Terminated')} value={new Date(data.termination_date).toLocaleDateString()} />
                        )}
                    </div>
                )}
            </Section>

            {/* ═════════════════════════════════════════════════ */}
            {/* 4. البيانات المالية */}
            {/* ═════════════════════════════════════════════════ */}
            <Section id="financial" title={t('البيانات المالية', 'Financial Details')} icon={Wallet}>
                {isEditable ? (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('اسم البنك', 'Bank Name')}>
                            <Input value={data.bank_name || ''} onChange={e => onChange({ bank_name: e.target.value })} />
                        </FormField>
                        <FormField label={t('رقم الحساب', 'Account #')}>
                            <Input value={data.bank_account || ''} onChange={e => onChange({ bank_account: e.target.value })}
                                className="font-mono" dir="ltr" />
                        </FormField>
                        <div className="col-span-2">
                            <FormField label="IBAN">
                                <Input value={data.iban || ''} onChange={e => onChange({ iban: e.target.value })}
                                    className="font-mono" dir="ltr" placeholder="SA..." />
                            </FormField>
                        </div>
                        <FormField label={t('الرقم الضريبي', 'Tax ID')}>
                            <Input value={data.tax_id || ''} onChange={e => onChange({ tax_id: e.target.value })}
                                className="font-mono" dir="ltr" />
                        </FormField>
                        <FormField label={t('رقم التأمينات', 'Social Insurance')}>
                            <Input value={data.social_insurance_number || ''} onChange={e => onChange({ social_insurance_number: e.target.value })}
                                className="font-mono" dir="ltr" />
                        </FormField>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField icon={Building} label={t('البنك', 'Bank')} value={data.bank_name} />
                        <ViewField label={t('رقم الحساب', 'Account #')} value={data.bank_account} mono />
                        <ViewField label="IBAN" value={data.iban} mono />
                        <ViewField icon={CreditCard} label={t('الضريبي', 'Tax ID')} value={data.tax_id} mono />
                        <ViewField label={t('التأمينات', 'Social Insurance')} value={data.social_insurance_number} mono />
                    </div>
                )}
            </Section>

            {/* ═════════════════════════════════════════════════ */}
            {/* 5. الصلاحيات والدخول */}
            {/* ═════════════════════════════════════════════════ */}
            <Section id="access" title={t('الصلاحيات والدخول', 'Access & Permissions')} icon={Shield}
                badge={data.user_profile_id ? t('مرتبط', 'Linked') : t('غير مرتبط', 'Not Linked')}
                badgeClassName={data.user_profile_id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}
            >
                {data.user_profile_id ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200">
                            <UserCheck className="h-5 w-5 text-emerald-600" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-emerald-700">
                                    {t('الموظف مرتبط بحساب مستخدم', 'Employee linked to user account')}
                                </p>
                                {userProfile && (
                                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{userProfile.email}</p>
                                )}
                            </div>
                            {userProfile && (
                                <Badge className={userProfile.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                    {userProfile.is_active ? t('مفعّل', 'Active') : t('معطّل', 'Disabled')}
                                </Badge>
                            )}
                        </div>
                        {userProfile && (
                            <div className="grid grid-cols-2 gap-4">
                                <ViewField icon={Mail} label={t('البريد', 'Email')} value={userProfile.email} />
                                <ViewField icon={Shield} label={t('الدور', 'Role')} value={userProfile.role} />
                            </div>
                        )}
                        {isEditable && (
                            <div className="flex items-center gap-2 pt-2">
                                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                                    <Key className="h-3.5 w-3.5" />
                                    {t('إعادة كلمة المرور', 'Reset Password')}
                                </Button>
                                <Button variant="outline" size="sm" className="text-xs gap-1.5 text-red-600 hover:text-red-700">
                                    <Lock className="h-3.5 w-3.5" />
                                    {t('تعطيل الحساب', 'Disable Account')}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                            {t('الموظف غير مرتبط بحساب مستخدم في النظام', 'Employee not linked to a system user account')}
                        </p>
                        {isEditable && (
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <UserCheck className="h-3.5 w-3.5" />
                                {t('إنشاء حساب دخول', 'Create Login Account')}
                            </Button>
                        )}
                    </div>
                )}
            </Section>

            {/* ═══ Notes (Edit Mode) ═══ */}
            {isEditable && (
                <Section id="notes" title={t('ملاحظات', 'Notes')} icon={User}>
                    <Textarea value={data.notes || ''} onChange={e => onChange({ notes: e.target.value })}
                        rows={3} placeholder={t('ملاحظات إضافية...', 'Additional notes...')} />
                </Section>
            )}
        </div>
    );
}
