/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 Company Profile Tab
 * ════════════════════════════════════════════════════════════════
 * 
 * Manages company identity and basic business data:
 * - Company name (AR/EN), logo, contact info
 * - Country selection → drives tax system
 * - Tax Number, Commercial Register
 * - Default currency and fiscal year
 * 
 * @module features/settings/components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { companiesService, Company } from '@/services/companiesService';
import { COUNTRY_TAX_CONFIGS, getCountryTaxConfig, getAvailableCountries } from '@/config/countryTaxConfig';
import { useToast } from '@/components/ui/use-toast';
import {
    Building2, Globe, Phone, Mail, MapPin, Hash, FileCheck,
    Save, Loader2, Camera, CheckCircle2, AlertTriangle
} from 'lucide-react';

// ─── Helper: Available currencies ────────────────────────────────────────

const CURRENCIES = [
    { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: '﷼' },
    { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'UAH', nameAr: 'هريفنيا أوكرانية', nameEn: 'Ukrainian Hryvnia', symbol: '₴' },
    { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$' },
    { code: 'EUR', nameAr: 'يورو', nameEn: 'Euro', symbol: '€' },
    { code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£' },
    { code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺' },
    { code: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', symbol: 'ج.م' },
    { code: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', symbol: 'د.أ' },
    { code: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', symbol: 'ر.ق' },
];

const MONTHS = [
    { value: 1, labelAr: 'يناير', labelEn: 'January' },
    { value: 2, labelAr: 'فبراير', labelEn: 'February' },
    { value: 3, labelAr: 'مارس', labelEn: 'March' },
    { value: 4, labelAr: 'أبريل', labelEn: 'April' },
    { value: 5, labelAr: 'مايو', labelEn: 'May' },
    { value: 6, labelAr: 'يونيو', labelEn: 'June' },
    { value: 7, labelAr: 'يوليو', labelEn: 'July' },
    { value: 8, labelAr: 'أغسطس', labelEn: 'August' },
    { value: 9, labelAr: 'سبتمبر', labelEn: 'September' },
    { value: 10, labelAr: 'أكتوبر', labelEn: 'October' },
    { value: 11, labelAr: 'نوفمبر', labelEn: 'November' },
    { value: 12, labelAr: 'ديسمبر', labelEn: 'December' },
];


export default function CompanyProfileTab() {
    const { language } = useLanguage();
    const { company, loading: companyLoading, refetch: refreshCompany } = useCompany();
    const { toast } = useToast();
    const isAr = language === 'ar';

    // ─── Local form state ──────────────────────────────────────────
    const [form, setForm] = useState<Partial<Company>>({});
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [formReady, setFormReady] = useState(false);

    // Populate form from company data — NO hardcoded fallbacks!
    useEffect(() => {
        if (company) {
            setForm({
                name: company.name || '',
                name_en: company.name_en || '',
                logo_url: company.logo_url || '',
                country_code: company.country_code || '',
                city: company.city || '',
                address: company.address || '',
                phone: company.phone || '',
                email: company.email || '',
                website: company.website || '',
                tax_number: company.tax_number || '',
                commercial_register: company.commercial_register || '',
                default_currency: company.default_currency || '',
                fiscal_year_start_month: company.fiscal_year_start_month || 1,
            });
            setIsDirty(false);
            setFormReady(true);
        }
    }, [company]);

    // ─── Handlers ──────────────────────────────────────────────────

    const updateField = useCallback((key: keyof Company, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    }, []);

    const handleCountryChange = useCallback((countryCode: string) => {
        const taxConfig = getCountryTaxConfig(countryCode);
        setForm(prev => ({
            ...prev,
            country_code: countryCode,
            // Auto-fill defaults from country config
            default_currency: taxConfig?.currency || prev.default_currency,
            fiscal_year_start_month: taxConfig?.fiscalYearDefaultMonth || prev.fiscal_year_start_month,
            vat_rate: taxConfig?.defaultVatRate ?? prev.vat_rate,
        }));
        setIsDirty(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!company?.id) return;

        setSaving(true);
        try {
            await companiesService.update(company.id, form);
            await refreshCompany();
            setIsDirty(false);
            toast({
                title: isAr ? 'تم الحفظ' : 'Saved',
                description: isAr ? 'تم حفظ بيانات المنشأة بنجاح' : 'Company profile saved successfully',
            });
        } catch (error: any) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: error.message || (isAr ? 'فشل حفظ البيانات' : 'Failed to save'),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }, [company?.id, form, isAr, refreshCompany, toast]);

    // Get current country tax config for dynamic labels
    const countryConfig = form.country_code ? getCountryTaxConfig(form.country_code) : null;
    const countries = getAvailableCountries();

    // ─── Loading State ─────────────────────────────────────────────
    if (companyLoading || !formReady) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
                            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-4xl mx-auto">

            {/* ── Section 1: Basic Info  ──────────────────────────────── */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                        <Building2 className="w-5 h-5 text-erp-teal" />
                        {isAr ? 'بيانات المنشأة الأساسية' : 'Basic Company Information'}
                    </CardTitle>
                    <CardDescription className="font-tajawal">
                        {isAr ? 'الاسم والشعار ومعلومات الاتصال' : 'Name, logo, and contact information'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Logo area */}
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Camera className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <Label className="font-tajawal text-sm">{isAr ? 'رابط الشعار' : 'Logo URL'}</Label>
                            <Input
                                value={form.logo_url || ''}
                                onChange={(e) => updateField('logo_url', e.target.value)}
                                placeholder="https://..."
                                className="mt-1 font-tajawal"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Names */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="font-tajawal text-sm">{isAr ? 'اسم المنشأة (عربي)' : 'Company Name (Arabic)'} *</Label>
                            <Input
                                value={form.name || ''}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder={isAr ? 'الاسم بالعربية' : 'Arabic name'}
                                className="mt-1 font-tajawal"
                                dir="rtl"
                            />
                        </div>
                        <div>
                            <Label className="font-tajawal text-sm">{isAr ? 'اسم المنشأة (إنجليزي)' : 'Company Name (English)'}</Label>
                            <Input
                                value={form.name_en || ''}
                                onChange={(e) => updateField('name_en', e.target.value)}
                                placeholder="English name"
                                className="mt-1"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Contact info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {isAr ? 'رقم الهاتف' : 'Phone'}
                            </Label>
                            <Input
                                value={form.phone || ''}
                                onChange={(e) => updateField('phone', e.target.value)}
                                placeholder="+966 5X XXX XXXX"
                                className="mt-1"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {isAr ? 'البريد الإلكتروني' : 'Email'}
                            </Label>
                            <Input
                                value={form.email || ''}
                                onChange={(e) => updateField('email', e.target.value)}
                                placeholder="info@company.com"
                                className="mt-1"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                {isAr ? 'الموقع الإلكتروني' : 'Website'}
                            </Label>
                            <Input
                                value={form.website || ''}
                                onChange={(e) => updateField('website', e.target.value)}
                                placeholder="https://www.company.com"
                                className="mt-1"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {isAr ? 'المدينة' : 'City'}
                            </Label>
                            <Input
                                value={form.city || ''}
                                onChange={(e) => updateField('city', e.target.value)}
                                placeholder={isAr ? 'المدينة' : 'City'}
                                className="mt-1 font-tajawal"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="font-tajawal text-sm flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {isAr ? 'العنوان' : 'Address'}
                        </Label>
                        <Input
                            value={form.address || ''}
                            onChange={(e) => updateField('address', e.target.value)}
                            placeholder={isAr ? 'العنوان الكامل' : 'Full address'}
                            className="mt-1 font-tajawal"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Section 2: Country & Tax IDs ────────────────────────── */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                        <Globe className="w-5 h-5 text-erp-teal" />
                        {isAr ? 'الدولة والبيانات الرسمية' : 'Country & Official Data'}
                    </CardTitle>
                    <CardDescription className="font-tajawal">
                        {isAr ? 'اختيار الدولة يحدد النظام الضريبي ومتطلبات التسجيل' : 'Country selection determines tax system and registration requirements'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Country selector */}
                    <div>
                        <Label className="font-tajawal text-sm">{isAr ? 'الدولة' : 'Country'} *</Label>
                        <Select
                            value={form.country_code || ''}
                            onValueChange={handleCountryChange}
                        >
                            <SelectTrigger className="mt-1 font-tajawal">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map((c) => (
                                    <SelectItem key={c.countryCode} value={c.countryCode} className="font-tajawal">
                                        <span className="flex items-center gap-2">
                                            <span>{c.flag}</span>
                                            <span>{isAr ? c.nameAr : c.nameEn}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dynamic Tax Info Banner */}
                    {countryConfig && (
                        <div className="bg-gradient-to-r from-erp-teal/5 to-erp-navy/5 dark:from-erp-teal/10 dark:to-erp-navy/10 border border-erp-teal/20 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{countryConfig.flag}</span>
                                <div>
                                    <p className="font-tajawal font-semibold text-sm text-erp-navy dark:text-white">
                                        {isAr ? countryConfig.taxSystemNameAr : countryConfig.taxSystemNameEn}
                                    </p>
                                    <p className="font-tajawal text-xs text-gray-500">
                                        {isAr ? 'النسبة الافتراضية:' : 'Default rate:'} {countryConfig.defaultVatRate}%
                                        {countryConfig.hasElectronicInvoicing && (
                                            <span className="ms-2 text-erp-teal">
                                                ✓ {isAr ? countryConfig.electronicInvoicingNameAr : countryConfig.electronicInvoicingNameEn}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tax ID fields - dynamic per country */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {countryConfig?.taxIdFormats.map((format, idx) => (
                            <div key={idx}>
                                <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5" />
                                    {isAr ? format.labelAr : format.labelEn}
                                </Label>
                                <Input
                                    value={idx === 0 ? (form.tax_number || '') : (form.commercial_register || '')}
                                    onChange={(e) => updateField(
                                        idx === 0 ? 'tax_number' : 'commercial_register',
                                        e.target.value
                                    )}
                                    placeholder={format.placeholder}
                                    maxLength={format.length}
                                    className="mt-1 font-mono"
                                    dir="ltr"
                                />
                                {format.length && (
                                    <p className="text-xs text-gray-400 mt-1 font-tajawal">
                                        {isAr ? `${format.length} خانة` : `${format.length} digits`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Section 3: Currency & Fiscal Year ───────────────────── */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                        <FileCheck className="w-5 h-5 text-erp-teal" />
                        {isAr ? 'العملة والسنة المالية' : 'Currency & Fiscal Year'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="font-tajawal text-sm">{isAr ? 'العملة الأساسية' : 'Base Currency'} *</Label>
                            <Select
                                value={form.default_currency || ''}
                                onValueChange={(v) => updateField('default_currency', v)}
                            >
                                <SelectTrigger className="mt-1 font-tajawal">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code} className="font-tajawal">
                                            {c.symbol} {isAr ? c.nameAr : c.nameEn} ({c.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="font-tajawal text-sm">{isAr ? 'بداية السنة المالية' : 'Fiscal Year Start'}</Label>
                            <Select
                                value={String(form.fiscal_year_start_month || 1)}
                                onValueChange={(v) => updateField('fiscal_year_start_month', Number(v))}
                            >
                                <SelectTrigger className="mt-1 font-tajawal">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m) => (
                                        <SelectItem key={m.value} value={String(m.value)} className="font-tajawal">
                                            {isAr ? m.labelAr : m.labelEn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Save Button ─────────────────────────────────────────── */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className="bg-gradient-to-r from-erp-teal to-emerald-600 hover:from-erp-teal/90 hover:to-emerald-600/90 text-white font-tajawal px-8 py-2.5 rounded-xl shadow-lg disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin me-2" />
                            {isAr ? 'جاري الحفظ...' : 'Saving...'}
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 me-2" />
                            {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
