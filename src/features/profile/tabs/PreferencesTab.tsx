/**
 * ════════════════════════════════════════════════════════════════
 * ⚙️ PreferencesTab — التفضيلات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { profileService, type FullUserProfile } from '../services/profileService';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Globe, Clock, Palette, Calendar, Hash, Coins,
    Save, Loader2, CheckCircle2, Sun, Moon, Monitor,
    Building2, Laptop
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Country code → default timezone mapping
const COUNTRY_TIMEZONES: Record<string, string> = {
    SA: 'Asia/Riyadh', AE: 'Asia/Dubai', KW: 'Asia/Kuwait', QA: 'Asia/Qatar',
    BH: 'Asia/Bahrain', OM: 'Asia/Muscat', IQ: 'Asia/Baghdad', JO: 'Asia/Amman',
    LB: 'Asia/Beirut', SY: 'Asia/Damascus', PS: 'Asia/Hebron', YE: 'Asia/Aden',
    EG: 'Africa/Cairo', LY: 'Africa/Tripoli', TN: 'Africa/Tunis', DZ: 'Africa/Algiers',
    MA: 'Africa/Casablanca', SD: 'Africa/Khartoum', TR: 'Europe/Istanbul',
    UA: 'Europe/Kyiv', RU: 'Europe/Moscow', DE: 'Europe/Berlin', FR: 'Europe/Paris',
    GB: 'Europe/London', US: 'America/New_York', CN: 'Asia/Shanghai', JP: 'Asia/Tokyo',
    IN: 'Asia/Kolkata', PK: 'Asia/Karachi', IR: 'Asia/Tehran', IE: 'Europe/Dublin',
};

type TimezoneMode = 'company' | 'auto' | 'custom';

export default function PreferencesTab() {
    const { language } = useLanguage();
    const { resolvedTheme, setTheme } = useTheme();
    const isAr = language === 'ar';

    const [profile, setProfile] = useState<FullUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [companyTimezone, setCompanyTimezone] = useState<string>('Asia/Riyadh');
    const [companyCountry, setCompanyCountry] = useState<string>('');
    const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>('auto');

    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const [form, setForm] = useState({
        timezone: 'Asia/Riyadh',
        theme_preference: 'system',
        date_format: 'DD/MM/YYYY',
        number_format: 'en',
        default_currency: 'USD',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const p = await profileService.getCurrentProfile();
            setProfile(p);

            // Get company timezone from country_code
            if (p?.company_id) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('country_code, country')
                    .eq('id', p.company_id)
                    .maybeSingle();
                if (company?.country_code) {
                    const tz = COUNTRY_TIMEZONES[company.country_code] || 'UTC';
                    setCompanyTimezone(tz);
                    setCompanyCountry(company.country || company.country_code);
                }
            }

            if (p) {
                const savedTz = p.timezone || '';
                // Determine mode from saved timezone
                let mode: TimezoneMode = 'auto'; // default
                if (savedTz === '__company__') {
                    mode = 'company';
                } else if (savedTz && savedTz !== '__auto__' && savedTz !== '') {
                    mode = 'custom';
                }

                setTimezoneMode(mode);
                setForm({
                    timezone: savedTz || '__auto__',
                    theme_preference: p.theme_preference || 'system',
                    date_format: p.date_format || 'DD/MM/YYYY',
                    number_format: p.number_format || 'en',
                    default_currency: p.default_currency || 'USD',
                });
            }
        } catch { }
        setLoading(false);
    };

    const handleTimezoneMode = (mode: TimezoneMode) => {
        setTimezoneMode(mode);
        if (mode === 'company') {
            setForm(f => ({ ...f, timezone: '__company__' }));
        } else if (mode === 'auto') {
            setForm(f => ({ ...f, timezone: '__auto__' }));
        }
        // custom: keep current timezone in form
    };

    // Resolved timezone for display
    const resolvedTimezone = timezoneMode === 'company' ? companyTimezone
        : timezoneMode === 'auto' ? deviceTimezone
            : form.timezone;

    const currentTime = new Date().toLocaleTimeString('en-US', {
        timeZone: resolvedTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            const saveData = { ...form };
            // Save the mode marker or actual timezone
            if (timezoneMode === 'company') saveData.timezone = '__company__';
            else if (timezoneMode === 'auto') saveData.timezone = '__auto__';
            await profileService.updateProfile(saveData as any);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { }
        setSaving(false);
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6 py-4 max-w-3xl mx-auto">
            {/* Timezone */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {isAr ? 'المنطقة الزمنية' : 'Timezone'}
                        </CardTitle>
                        <span className="text-sm font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                            {currentTime} — {resolvedTimezone}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* Option 1: Company Time */}
                    <label className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                        timezoneMode === 'company'
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}>
                        <input
                            type="radio" name="tzMode" value="company"
                            checked={timezoneMode === 'company'}
                            onChange={() => handleTimezoneMode('company')}
                            className="accent-blue-600"
                        />
                        <Building2 className={cn("w-5 h-5", timezoneMode === 'company' ? "text-blue-600" : "text-gray-400")} />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{isAr ? 'وقت الشركة' : 'Company Time'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {companyTimezone} {companyCountry ? `(${companyCountry})` : ''}
                            </p>
                        </div>

                    </label>

                    {/* Option 2: Device Auto */}
                    <label className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                        timezoneMode === 'auto'
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}>
                        <input
                            type="radio" name="tzMode" value="auto"
                            checked={timezoneMode === 'auto'}
                            onChange={() => handleTimezoneMode('auto')}
                            className="accent-emerald-600"
                        />
                        <Laptop className={cn("w-5 h-5", timezoneMode === 'auto' ? "text-emerald-600" : "text-gray-400")} />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{isAr ? 'تلقائي (وقت الجهاز)' : 'Automatic (Device Time)'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {deviceTimezone}
                            </p>
                        </div>
                        <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                            {isAr ? 'افتراضي' : 'Default'}
                        </span>
                    </label>

                    {/* Option 3: Custom  */}
                    <label className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                        timezoneMode === 'custom'
                            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}>
                        <input
                            type="radio" name="tzMode" value="custom"
                            checked={timezoneMode === 'custom'}
                            onChange={() => handleTimezoneMode('custom')}
                            className="accent-orange-600"
                        />
                        <Globe className={cn("w-5 h-5", timezoneMode === 'custom' ? "text-orange-600" : "text-gray-400")} />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{isAr ? 'مخصص' : 'Custom'}</p>
                        </div>
                    </label>

                    {timezoneMode === 'custom' && (
                        <select
                            value={form.timezone.startsWith('__') ? companyTimezone : form.timezone}
                            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                            className="w-full mt-2 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500"
                        >
                            {(Intl as any).supportedValuesOf('timeZone').map((tz: string) => (
                                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    )}
                </CardContent>
            </Card>

            {/* Theme */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Palette className="w-4 h-4 text-purple-600" />
                        {isAr ? 'المظهر' : 'Theme'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'light', icon: Sun, label: { ar: 'فاتح', en: 'Light' } },
                            { id: 'dark', icon: Moon, label: { ar: 'داكن', en: 'Dark' } },
                            { id: 'system', icon: Monitor, label: { ar: 'تلقائي', en: 'System' } },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setForm(f => ({ ...f, theme_preference: t.id })); setTheme(t.id as any); }}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                    form.theme_preference === t.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                )}
                            >
                                <t.icon className={cn("w-6 h-6", form.theme_preference === t.id ? "text-blue-600" : "text-gray-400")} />
                                <span className={cn("text-sm font-medium", form.theme_preference === t.id ? "text-blue-700 dark:text-blue-400" : "text-gray-500")}>
                                    {t.label[isAr ? 'ar' : 'en']}
                                </span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Date Format */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        {isAr ? 'تنسيق التاريخ' : 'Date Format'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[
                            { value: 'DD/MM/YYYY', example: '07/03/2026' },
                            { value: 'MM/DD/YYYY', example: '03/07/2026' },
                            { value: 'YYYY-MM-DD', example: '2026-03-07' },
                        ].map(df => (
                            <label key={df.value} className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                form.date_format === df.value
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}>
                                <input
                                    type="radio"
                                    name="dateFormat"
                                    value={df.value}
                                    checked={form.date_format === df.value}
                                    onChange={e => setForm(f => ({ ...f, date_format: e.target.value }))}
                                    className="accent-blue-600"
                                />
                                <span className="text-sm font-medium">{df.value}</span>
                                <span className="text-xs text-gray-400 font-mono">({df.example})</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Number Format */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-600" />
                        {isAr ? 'تنسيق الأرقام' : 'Number Format'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[
                            { value: 'en', label: '1,234.56', name: 'English' },
                            { value: 'eu', label: '1.234,56', name: 'European' },
                        ].map(nf => (
                            <label key={nf.value} className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                                form.number_format === nf.value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700"
                            )}>
                                <input
                                    type="radio"
                                    name="numberFormat"
                                    value={nf.value}
                                    checked={form.number_format === nf.value}
                                    onChange={e => setForm(f => ({ ...f, number_format: e.target.value }))}
                                    className="accent-blue-600"
                                />
                                <span className="text-sm font-mono">{nf.label}</span>
                                <span className="text-xs text-gray-400">({nf.name})</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className={cn("gap-2 min-w-[140px]", saved ? "bg-green-600" : "bg-gradient-to-r from-blue-600 to-indigo-600")}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : saved ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓') : (isAr ? 'حفظ التفضيلات' : 'Save Preferences')}
                </Button>
            </div>
        </div>
    );
}
