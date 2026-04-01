/**
 * ⚙️ HR Settings — إعدادات الموارد البشرية
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, DollarSign, Calendar, Shield, Save } from 'lucide-react';
import { getHRSettings, saveHRSettings, type HRSettings as HRSettingsType } from '../services/hrService';
import { toast } from 'sonner';

const defaultSettings: HRSettingsType = {
    id: '',
    tenant_id: '',
    default_working_hours: 8,
    default_working_days: 5,
    weekend_days: [5, 6],
    grace_period_minutes: 15,
    overtime_multiplier: 1.5,
    payroll_day: 25,
    default_currency: 'SAR',
    employer_social_insurance_pct: 12,
    employee_social_insurance_pct: 9.75,
    default_annual_leave_days: 21,
    employee_number_prefix: 'EMP',
    employee_number_counter: 1,
};

export default function HRSettingsTab() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const [settings, setSettings] = useState<HRSettingsType>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    async function loadSettings() {
        try {
            const data = await getHRSettings();
            if (data) setSettings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { id, tenant_id, ...toSave } = settings;
            await saveHRSettings(toSave as any);
            toast.success(isRTL ? 'تم حفظ الإعدادات ✅' : 'Settings saved ✅');
        } catch {
            toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    function updateField<K extends keyof HRSettingsType>(key: K, value: HRSettingsType[K]) {
        setSettings(prev => ({ ...prev, [key]: value }));
    }

    // ⚡ CACHE-FIRST: No blocking skeleton — form renders with defaults immediately

    return (
        <div className="p-2 space-y-6 animate-in fade-in duration-500 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                        {isRTL ? 'إعدادات الموارد البشرية' : 'HR Settings'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isRTL ? 'ضبط إعدادات العمل والرواتب والإجازات' : 'Configure work, payroll, and leave settings'}
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-erp-primary hover:bg-erp-primary/90">
                    <Save className="h-4 w-4 me-2" />
                    {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                </Button>
            </div>

            {/* Work Hours */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        {isRTL ? 'ساعات العمل' : 'Working Hours'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>{isRTL ? 'ساعات العمل اليومية' : 'Daily Hours'}</Label>
                            <Input type="number" value={settings.default_working_hours}
                                onChange={e => updateField('default_working_hours', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label>{isRTL ? 'أيام العمل الأسبوعية' : 'Working Days/Week'}</Label>
                            <Input type="number" value={settings.default_working_days}
                                onChange={e => updateField('default_working_days', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label>{isRTL ? 'فترة السماح (دقائق)' : 'Grace Period (min)'}</Label>
                            <Input type="number" value={settings.grace_period_minutes}
                                onChange={e => updateField('grace_period_minutes', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label>{isRTL ? 'مضاعف الساعات الإضافية' : 'Overtime Multiplier'}</Label>
                            <Input type="number" step="0.1" value={settings.overtime_multiplier}
                                onChange={e => updateField('overtime_multiplier', Number(e.target.value))} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payroll */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        {isRTL ? 'الرواتب' : 'Payroll'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>{isRTL ? 'يوم صرف الراتب' : 'Payroll Day'}</Label>
                            <Input type="number" min={1} max={31} value={settings.payroll_day}
                                onChange={e => updateField('payroll_day', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label>{isRTL ? 'العملة الافتراضية' : 'Default Currency'}</Label>
                            <select className="w-full border rounded-md p-2 bg-background" value={settings.default_currency}
                                onChange={e => updateField('default_currency', e.target.value)}>
                                <option value="SAR">{isRTL ? 'ريال سعودي' : 'SAR'}</option>
                                <option value="USD">{isRTL ? 'دولار أمريكي' : 'USD'}</option>
                                <option value="EUR">{isRTL ? 'يورو' : 'EUR'}</option>
                                <option value="UAH">{isRTL ? 'هريفنيا' : 'UAH'}</option>
                                <option value="TRY">{isRTL ? 'ليرة تركية' : 'TRY'}</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Social Insurance */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        {isRTL ? 'التأمينات الاجتماعية' : 'Social Insurance'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>{isRTL ? 'حصة صاحب العمل %' : 'Employer %'}</Label>
                            <Input type="number" step="0.25" value={settings.employer_social_insurance_pct}
                                onChange={e => updateField('employer_social_insurance_pct', Number(e.target.value))}
                                className="font-mono" />
                        </div>
                        <div>
                            <Label>{isRTL ? 'حصة الموظف %' : 'Employee %'}</Label>
                            <Input type="number" step="0.25" value={settings.employee_social_insurance_pct}
                                onChange={e => updateField('employee_social_insurance_pct', Number(e.target.value))}
                                className="font-mono" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Leave & Numbering */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        {isRTL ? 'الإجازات والترقيم' : 'Leave & Numbering'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>{isRTL ? 'أيام الإجازة السنوية' : 'Annual Leave Days'}</Label>
                            <Input type="number" value={settings.default_annual_leave_days}
                                onChange={e => updateField('default_annual_leave_days', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label>{isRTL ? 'بادئة رقم الموظف' : 'Employee # Prefix'}</Label>
                            <Input value={settings.employee_number_prefix}
                                onChange={e => updateField('employee_number_prefix', e.target.value as any)}
                                className="font-mono" placeholder="EMP" />
                        </div>
                        <div>
                            <Label>{isRTL ? 'العداد الحالي' : 'Current Counter'}</Label>
                            <Input type="number" value={settings.employee_number_counter}
                                onChange={e => updateField('employee_number_counter', Number(e.target.value))}
                                className="font-mono" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
