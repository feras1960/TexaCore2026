/**
 * 📞 EmpContactTab — بيانات الاتصال + تكامل UCM
 */

import { useState } from 'react';
import type { SheetMode } from '../EmployeeSheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown, ChevronUp, Phone, Mail, MapPin, AlertTriangle, Headphones,
} from 'lucide-react';

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

function ViewField({ label, value, mono, icon: Icon }: { label: string; value?: string | null; mono?: boolean; icon?: React.ElementType }) {
    return (
        <div className="flex items-start gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
            <div>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className={`text-sm font-medium ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>{value || '—'}</p>
            </div>
        </div>
    );
}

export default function EmpContactTab({ data, mode, onChange, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'create' || mode === 'edit';

    if (!isEditable) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <Section title={t('أرقام الاتصال', 'Phone Numbers')} icon={Phone}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField icon={Phone} label={t('الهاتف', 'Phone')} value={data.phone} mono />
                        <ViewField icon={Phone} label={t('الجوال', 'Mobile')} value={data.mobile} mono />
                        <ViewField icon={Mail} label={t('البريد الإلكتروني', 'Email')} value={data.email} />
                    </div>
                </Section>

                <Section title={t('العنوان', 'Address')} icon={MapPin} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField icon={MapPin} label={t('المدينة', 'City')} value={data.city} />
                        <ViewField label={t('الدولة', 'Country')} value={data.country} />
                        <div className="col-span-2">
                            <ViewField label={t('العنوان', 'Address')} value={data.address} />
                        </div>
                    </div>
                </Section>

                <Section title={t('جهة الطوارئ', 'Emergency Contact')} icon={AlertTriangle} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('الاسم', 'Name')} value={data.emergency_contact_name} />
                        <ViewField icon={Phone} label={t('الرقم', 'Phone')} value={data.emergency_contact_phone} mono />
                    </div>
                </Section>

                {/* UCM Integration placeholder */}
                <Section title={t('الاتصالات - UCM', 'Communications - UCM')} icon={Headphones} defaultOpen={false}>
                    <div className="text-center py-6 text-muted-foreground">
                        <Headphones className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('تكامل غراند ستريم UCM', 'Grandstream UCM Integration')}</p>
                        <Badge variant="outline" className="mt-2 text-xs">{t('قريباً', 'Coming Soon')}</Badge>
                    </div>
                </Section>
            </div>
        );
    }

    // ═══ EDIT MODE ═══
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <Section title={t('أرقام الاتصال', 'Phone Numbers')} icon={Phone}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('الهاتف', 'Phone')}</Label>
                        <Input value={data.phone || ''} onChange={e => onChange({ phone: e.target.value })}
                            className="mt-1 font-mono" dir="ltr" placeholder="+966 ..." />
                    </div>
                    <div>
                        <Label className="text-xs">{t('الجوال', 'Mobile')}</Label>
                        <Input value={data.mobile || ''} onChange={e => onChange({ mobile: e.target.value })}
                            className="mt-1 font-mono" dir="ltr" placeholder="+966 5..." />
                    </div>
                    <div className="col-span-2">
                        <Label className="text-xs">{t('البريد الإلكتروني', 'Email')}</Label>
                        <Input type="email" value={data.email || ''} onChange={e => onChange({ email: e.target.value })}
                            className="mt-1" dir="ltr" placeholder="name@company.com" />
                    </div>
                </div>
            </Section>

            <Section title={t('العنوان', 'Address')} icon={MapPin}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('المدينة', 'City')}</Label>
                        <Input value={data.city || ''} onChange={e => onChange({ city: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('الدولة', 'Country')}</Label>
                        <Input value={data.country || ''} onChange={e => onChange({ country: e.target.value })} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                        <Label className="text-xs">{t('العنوان الكامل', 'Full Address')}</Label>
                        <Textarea value={data.address || ''} onChange={e => onChange({ address: e.target.value })}
                            className="mt-1" rows={2} />
                    </div>
                </div>
            </Section>

            <Section title={t('جهة الطوارئ', 'Emergency Contact')} icon={AlertTriangle}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('اسم جهة الطوارئ', 'Emergency Contact Name')}</Label>
                        <Input value={data.emergency_contact_name || ''} onChange={e => onChange({ emergency_contact_name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('رقم الطوارئ', 'Emergency Phone')}</Label>
                        <Input value={data.emergency_contact_phone || ''} onChange={e => onChange({ emergency_contact_phone: e.target.value })}
                            className="mt-1 font-mono" dir="ltr" />
                    </div>
                </div>
            </Section>
        </div>
    );
}
