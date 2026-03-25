/**
 * ════════════════════════════════════════════════════════════════
 * 🌍 Tax System Tab
 * ════════════════════════════════════════════════════════════════
 * 
 * Dynamic tax configuration based on selected country.
 * Shows country-specific tax types, rates, ZATCA/Zakat settings,
 * and electronic invoicing status.
 * 
 * @module features/settings/components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { companiesService, Company } from '@/services/companiesService';
import { getCountryTaxConfig, CountryTaxConfig } from '@/config/countryTaxConfig';
import { useToast } from '@/components/ui/use-toast';
import {
    Globe, Receipt, Percent, Shield, Landmark, FileCheck2,
    Save, Loader2, CheckCircle2, AlertTriangle, Info, Zap
} from 'lucide-react';


export default function TaxSystemTab() {
    const { language } = useLanguage();
    const { company, loading: companyLoading, refetch: refreshCompany } = useCompany();
    const { toast } = useToast();
    const isAr = language === 'ar';

    // ─── Form state ────────────────────────────────────────────────
    const [form, setForm] = useState<Partial<Company>>({});
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [formReady, setFormReady] = useState(false);

    // Populate from company data
    useEffect(() => {
        if (company) {
            setForm({
                country_code: company.country_code || '',
                tax_system: company.tax_system || 'vat',
                vat_rate: company.vat_rate ?? 15,
                enable_zatca: company.enable_zatca ?? false,
                zatca_settings: company.zatca_settings || {},
                enable_zakat: company.enable_zakat ?? false,
                zakat_calculation_method: company.zakat_calculation_method || '',
                zakat_rate: company.zakat_rate ?? 2.5,
            });
            setIsDirty(false);
            setFormReady(true);
        }
    }, [company]);

    const countryConfig = form.country_code ? getCountryTaxConfig(form.country_code) : null;

    const updateField = useCallback((key: keyof Company, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
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
                description: isAr ? 'تم حفظ إعدادات الضرائب بنجاح' : 'Tax settings saved successfully',
            });
        } catch (error: any) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }, [company?.id, form, isAr, refreshCompany, toast]);

    // ─── Loading State ─────────────────────────────────────────────
    if (companyLoading || !formReady) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-5 h-28" />
                <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="space-y-3">
                        <div className="h-14 bg-gray-100 dark:bg-gray-700 rounded" />
                        <div className="h-14 bg-gray-100 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-4xl mx-auto">

            {/* ── Country-specific banner ──────────────────────────────── */}
            {countryConfig && (
                <div className="bg-gradient-to-r from-erp-navy/5 via-erp-teal/5 to-erp-navy/5 dark:from-erp-navy/20 dark:via-erp-teal/10 dark:to-erp-navy/20 border border-erp-teal/20 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                        <span className="text-4xl">{countryConfig.flag}</span>
                        <div className="flex-1">
                            <h3 className="font-tajawal font-bold text-lg text-erp-navy dark:text-white">
                                {isAr ? countryConfig.taxSystemNameAr : countryConfig.taxSystemNameEn}
                            </h3>
                            <p className="font-tajawal text-sm text-gray-500 mt-1">
                                {isAr ? countryConfig.nameAr : countryConfig.nameEn}
                            </p>
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                <Badge variant="outline" className="font-tajawal bg-erp-teal/10 text-erp-teal border-erp-teal/30 px-3 py-1">
                                    <Percent className="w-3 h-3 me-1" />
                                    {countryConfig.defaultVatRate}%
                                </Badge>
                                {countryConfig.hasElectronicInvoicing && (
                                    <Badge variant="outline" className="font-tajawal bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700 px-3 py-1">
                                        <Zap className="w-3 h-3 me-1" />
                                        {isAr ? (countryConfig.electronicInvoicingNameAr || 'فاتورة إلكترونية') : (countryConfig.electronicInvoicingNameEn || 'E-Invoicing')}
                                    </Badge>
                                )}
                                {countryConfig.hasZakat && (
                                    <Badge variant="outline" className="font-tajawal bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700 px-3 py-1">
                                        <Landmark className="w-3 h-3 me-1" />
                                        {isAr ? 'زكاة' : 'Zakat'} ({countryConfig.zakatRate}%)
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tax Types Card ────────────────────────────────────────── */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                        <Receipt className="w-5 h-5 text-erp-teal" />
                        {isAr ? 'أنواع الضرائب المتاحة' : 'Available Tax Types'}
                    </CardTitle>
                    <CardDescription className="font-tajawal">
                        {isAr ? 'الأنواع الضريبية المحددة حسب نظام الدولة المختارة' : 'Tax types defined by the selected country system'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3">
                        {countryConfig?.taxTypes.map((taxType) => (
                            <div
                                key={taxType.code}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${taxType.isDefault
                                    ? 'bg-erp-teal/5 border-erp-teal/30 dark:bg-erp-teal/10'
                                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {taxType.isDefault && (
                                        <CheckCircle2 className="w-5 h-5 text-erp-teal flex-shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-tajawal font-medium text-sm">
                                            {isAr ? taxType.nameAr : taxType.nameEn}
                                        </p>
                                        {taxType.description && (
                                            <p className="font-tajawal text-xs text-gray-500 mt-0.5">
                                                {isAr ? taxType.description.ar : taxType.description.en}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Badge
                                    variant={taxType.defaultRate > 0 ? 'default' : 'secondary'}
                                    className={`font-mono text-sm ${taxType.isDefault ? 'bg-erp-teal text-white' : ''}`}
                                >
                                    {taxType.defaultRate}%
                                </Badge>
                            </div>
                        ))}
                    </div>

                    {/* Custom VAT Rate override */}
                    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="font-tajawal text-sm">{isAr ? 'نسبة الضريبة المطبقة (%)' : 'Applied Tax Rate (%)'}</Label>
                                <Input
                                    type="number"
                                    value={form.vat_rate ?? countryConfig?.defaultVatRate ?? 0}
                                    onChange={(e) => updateField('vat_rate', Number(e.target.value))}
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    className="mt-1 font-mono w-32"
                                    dir="ltr"
                                />
                                <p className="text-xs text-gray-400 mt-1 font-tajawal">
                                    {isAr ? 'يمكنك تعديل النسبة إذا كانت تختلف عن الافتراضية' : 'Adjust if different from default'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── ZATCA Section (Saudi Only) ────────────────────────────── */}
            {(form.country_code === 'SA') && (
                <Card className="border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                            <Shield className="w-5 h-5 text-erp-teal" />
                            {isAr ? 'ربط ZATCA (فاتورة)' : 'ZATCA Integration (Fatoorah)'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {isAr ? 'إعدادات الربط مع هيئة الزكاة والضريبة والجمارك' : 'Integration with Zakat, Tax and Customs Authority'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-tajawal text-sm font-medium">
                                    {isAr ? 'تفعيل ربط ZATCA' : 'Enable ZATCA Integration'}
                                </Label>
                                <p className="text-xs text-gray-500 font-tajawal mt-0.5">
                                    {isAr ? 'ربط الفواتير مع منصة فاتورة' : 'Connect invoices with Fatoorah platform'}
                                </p>
                            </div>
                            <Switch
                                checked={form.enable_zatca ?? false}
                                onCheckedChange={(v) => updateField('enable_zatca', v)}
                            />
                        </div>

                        {form.enable_zatca && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {/* ZATCA Integration Type from country config additional fields */}
                                {countryConfig?.additionalFields?.map((field) => (
                                    <div key={field.key}>
                                        <Label className="font-tajawal text-sm">{isAr ? field.labelAr : field.labelEn}</Label>
                                        {field.type === 'select' && field.options && (
                                            <Select
                                                value={form.zatca_settings?.[field.key] || ''}
                                                onValueChange={(v) => updateField('zatca_settings', { ...form.zatca_settings, [field.key]: v })}
                                            >
                                                <SelectTrigger className="mt-1 font-tajawal">
                                                    <SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {field.options.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value} className="font-tajawal">
                                                            {isAr ? opt.labelAr : opt.labelEn}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                ))}

                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-tajawal">
                                            {isAr
                                                ? 'يتطلب ربط ZATCA شهادات رقمية وإعداد تقني متخصص. تواصل مع الدعم الفني.'
                                                : 'ZATCA integration requires digital certificates and specialized setup. Contact support.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Zakat Section (Saudi Only) ────────────────────────────── */}
            {(form.country_code === 'SA') && (
                <Card className="border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                            <Landmark className="w-5 h-5 text-amber-500" />
                            {isAr ? 'إعدادات الزكاة' : 'Zakat Settings'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-tajawal text-sm font-medium">
                                    {isAr ? 'تفعيل حساب الزكاة' : 'Enable Zakat Calculation'}
                                </Label>
                                <p className="text-xs text-gray-500 font-tajawal mt-0.5">
                                    {isAr ? 'حساب الزكاة على أرباح المنشأة تلقائياً' : 'Auto-calculate Zakat on company profits'}
                                </p>
                            </div>
                            <Switch
                                checked={form.enable_zakat ?? false}
                                onCheckedChange={(v) => updateField('enable_zakat', v)}
                            />
                        </div>

                        {form.enable_zakat && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                <div>
                                    <Label className="font-tajawal text-sm">{isAr ? 'طريقة حساب الزكاة' : 'Zakat Calculation Method'}</Label>
                                    <Select
                                        value={form.zakat_calculation_method || 'net_income'}
                                        onValueChange={(v) => updateField('zakat_calculation_method', v)}
                                    >
                                        <SelectTrigger className="mt-1 font-tajawal">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="net_income" className="font-tajawal">
                                                {isAr ? 'صافي الربح' : 'Net Income Method'}
                                            </SelectItem>
                                            <SelectItem value="net_assets" className="font-tajawal">
                                                {isAr ? 'صافي الأصول' : 'Net Assets Method'}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="font-tajawal text-sm">{isAr ? 'نسبة الزكاة (%)' : 'Zakat Rate (%)'}</Label>
                                    <Input
                                        type="number"
                                        value={form.zakat_rate ?? 2.5}
                                        onChange={(e) => updateField('zakat_rate', Number(e.target.value))}
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        className="mt-1 font-mono w-32"
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Country-specific Additional Fields ────────────────────── */}
            {countryConfig?.additionalFields && form.country_code !== 'SA' && (
                <Card className="border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                            <Info className="w-5 h-5 text-erp-teal" />
                            {isAr ? 'إعدادات إضافية' : 'Additional Settings'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {isAr ? `إعدادات خاصة بـ${countryConfig.nameAr}` : `Settings specific to ${countryConfig.nameEn}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {countryConfig.additionalFields.map((field) => (
                            <div key={field.key}>
                                <Label className="font-tajawal text-sm">{isAr ? field.labelAr : field.labelEn}</Label>
                                {field.type === 'select' && field.options ? (
                                    <Select
                                        value={form.zatca_settings?.[field.key] || ''}
                                        onValueChange={(v) => updateField('zatca_settings', { ...form.zatca_settings, [field.key]: v })}
                                    >
                                        <SelectTrigger className="mt-1 font-tajawal">
                                            <SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value} className="font-tajawal">
                                                    {isAr ? opt.labelAr : opt.labelEn}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : field.type === 'boolean' ? (
                                    <div className="flex items-center gap-3 mt-1">
                                        <Switch
                                            checked={form.zatca_settings?.[field.key] ?? false}
                                            onCheckedChange={(v) => updateField('zatca_settings', { ...form.zatca_settings, [field.key]: v })}
                                        />
                                        <span className="text-sm text-gray-500 font-tajawal">
                                            {form.zatca_settings?.[field.key] ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
                                        </span>
                                    </div>
                                ) : (
                                    <Input
                                        value={form.zatca_settings?.[field.key] || ''}
                                        onChange={(e) => updateField('zatca_settings', { ...form.zatca_settings, [field.key]: e.target.value })}
                                        className="mt-1 font-tajawal"
                                    />
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

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
