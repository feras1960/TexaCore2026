/**
 * 💳 EmpFinancialTab — البيانات المالية
 */
import { useState } from 'react';
import type { SheetMode } from '../EmployeeSheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Wallet, Building, CreditCard } from 'lucide-react';

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

function ViewField({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>{value || '—'}</p>
        </div>
    );
}

export default function EmpFinancialTab({ data, mode, onChange, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const isEditable = mode === 'edit';

    if (!isEditable) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <Section title={t('الحساب البنكي', 'Bank Account')} icon={Building}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('اسم البنك', 'Bank Name')} value={data.bank_name} />
                        <ViewField label={t('رقم الحساب', 'Account Number')} value={data.bank_account} mono />
                        <ViewField label={t('IBAN', 'IBAN')} value={data.iban} mono />
                    </div>
                </Section>
                <Section title={t('الضرائب والتأمينات', 'Tax & Insurance')} icon={CreditCard} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                        <ViewField label={t('الرقم الضريبي', 'Tax ID')} value={data.tax_id} mono />
                        <ViewField label={t('رقم التأمينات', 'Social Insurance')} value={data.social_insurance_number} mono />
                    </div>
                </Section>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <Section title={t('الحساب البنكي', 'Bank Account')} icon={Building}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('اسم البنك', 'Bank Name')}</Label>
                        <Input value={data.bank_name || ''} onChange={e => onChange({ bank_name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('رقم الحساب', 'Account Number')}</Label>
                        <Input value={data.bank_account || ''} onChange={e => onChange({ bank_account: e.target.value })} className="mt-1 font-mono" dir="ltr" />
                    </div>
                    <div className="col-span-2">
                        <Label className="text-xs">IBAN</Label>
                        <Input value={data.iban || ''} onChange={e => onChange({ iban: e.target.value })} className="mt-1 font-mono" dir="ltr" placeholder="SA..." />
                    </div>
                </div>
            </Section>
            <Section title={t('الضرائب والتأمينات', 'Tax & Insurance')} icon={CreditCard}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">{t('الرقم الضريبي', 'Tax ID')}</Label>
                        <Input value={data.tax_id || ''} onChange={e => onChange({ tax_id: e.target.value })} className="mt-1 font-mono" dir="ltr" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('رقم التأمينات الاجتماعية', 'Social Insurance #')}</Label>
                        <Input value={data.social_insurance_number || ''} onChange={e => onChange({ social_insurance_number: e.target.value })} className="mt-1 font-mono" dir="ltr" />
                    </div>
                </div>
            </Section>
        </div>
    );
}
