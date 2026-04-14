/**
 * ════════════════════════════════════════════════════════════════
 * 🌍 Tax System Tab — Unified Tax Configuration & Settlement
 * ════════════════════════════════════════════════════════════════
 * 
 * المرجع الوحيد لكل إعدادات الضرائب في النظام.
 * تبويبين داخليين:
 *   1️⃣ الإعدادات — النسب، الحسابات، ZATCA، الزكاة
 *   2️⃣ التسويات الضريبية — مقاصة المدخلات/المخرجات
 * 
 * عند الحفظ → يُزامن مع company_accounting_settings تلقائياً
 * 
 * @module features/settings/components
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { companiesService, Company } from '@/services/companiesService';
import { getCountryTaxConfig } from '@/config/countryTaxConfig';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import VATSettlement from '@/features/accounting/VATSettlement';
import {
    Globe, Receipt, Percent, Shield, Landmark, FileCheck2,
    Save, Loader2, CheckCircle2, AlertTriangle, Info, Zap,
    Wallet, Scale, Settings as SettingsIcon
} from 'lucide-react';


// ════ Internal Sub-Tab Buttons ════
interface SubTabProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isAr: boolean;
}

function TaxSubTabs({ activeTab, onTabChange, isAr }: SubTabProps) {
    const tabs = [
        { id: 'settings', label: isAr ? 'الإعدادات' : 'Settings', icon: SettingsIcon },
        { id: 'settlement', label: isAr ? 'التسويات الضريبية' : 'VAT Settlement', icon: Scale },
    ];
    return (
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-tajawal font-medium transition-all flex-1 justify-center ${
                            isActive
                                ? 'bg-white dark:bg-gray-700 text-erp-navy dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}


export default function TaxSystemTab() {
    const { language } = useLanguage();
    const { companyId, company, loading: companyLoading, refetch: refreshCompany } = useCompany();
    const { toast } = useToast();
    const isAr = language === 'ar';
    const queryClient = useQueryClient();

    // ─── Sub-tab state ──────────────────────────────────────────
    const [subTab, setSubTab] = useState('settings');

    // ─── Form state ────────────────────────────────────────────
    const [form, setForm] = useState<Partial<Company>>({});
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [formReady, setFormReady] = useState(false);

    // ─── Tax accounts state ─────────────────────────────────────
    const [vatEnabled, setVatEnabled] = useState(true);
    const [taxInputAccountId, setTaxInputAccountId] = useState('');
    const [taxOutputAccountId, setTaxOutputAccountId] = useState('');

    // Populate from company data
    useEffect(() => {
        if (company) {
            setForm({
                country_code: company.country_code || '',
                tax_system: company.tax_system || 'vat',
                vat_rate: company.vat_rate ?? 0,
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

    // ─── Load accounting settings (vat_enabled, tax accounts) ──
    const { data: accountingData } = useCachedQuery({
        queryKey: ['tax-tab', 'accounting-settings', companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const [settingsRes, accountsRes] = await Promise.all([
                supabase.from('company_accounting_settings')
                    .select('vat_enabled, vat_rate, default_tax_input_account_id, default_tax_output_account_id')
                    .eq('company_id', companyId).maybeSingle(),
                supabase.from('chart_of_accounts')
                    .select('id, account_code, name_ar, name_en, account_types(classification)')
                    .eq('company_id', companyId).eq('is_detail', true).eq('is_active', true)
                    .order('account_code'),
            ]);
            return { settings: settingsRes.data, accounts: accountsRes.data || [] };
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
    });

    // Apply loaded accounting settings
    useEffect(() => {
        if (accountingData?.settings) {
            setVatEnabled(accountingData.settings.vat_enabled ?? true);
            setTaxInputAccountId(accountingData.settings.default_tax_input_account_id || '');
            setTaxOutputAccountId(accountingData.settings.default_tax_output_account_id || '');
            // Sync vat_rate from accounting settings if company vat_rate is 0
            if (accountingData.settings.vat_rate && (!form.vat_rate || form.vat_rate === 0)) {
                setForm(prev => ({ ...prev, vat_rate: accountingData.settings!.vat_rate }));
            }
        }
    }, [accountingData]);

    const accounts = accountingData?.accounts || [];

    const countryConfig = form.country_code ? getCountryTaxConfig(form.country_code) : null;

    const updateField = useCallback((key: keyof Company, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    }, []);

    // ─── SAVE — sync to both companies AND company_accounting_settings ──
    const handleSave = useCallback(async () => {
        if (!company?.id || !companyId) return;
        setSaving(true);
        try {
            // 1️⃣ Save BOTH tables in parallel
            const [, syncResult] = await Promise.all([
                companiesService.update(company.id, form),
                supabase.from('company_accounting_settings').upsert({
                    company_id: companyId,
                    vat_rate: form.vat_rate ?? 0,
                    vat_enabled: vatEnabled,
                    default_tax_input_account_id: taxInputAccountId || null,
                    default_tax_output_account_id: taxOutputAccountId || null,
                }, { onConflict: 'company_id' }),
            ]);

            if (syncResult.error) {
                console.warn('Sync to accounting settings failed:', syncResult.error);
            }

            setIsDirty(false);
            setSaving(false);

            toast({
                title: isAr ? 'تم الحفظ' : 'Saved',
                description: isAr ? 'تم حفظ إعدادات الضرائب ومزامنتها مع المحاسبة' : 'Tax settings saved and synced with accounting',
            });

            // 2️⃣ Background: refresh caches (no await — don't block UI)
            queryClient.removeQueries({ queryKey: ['accounting', 'vat-accounts-v2'] });
            queryClient.removeQueries({ queryKey: ['tax_defaults'] });
            queryClient.removeQueries({ queryKey: ['tax-tab', 'accounting-settings'] });
            refreshCompany();
        } catch (error: any) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: error.message,
                variant: 'destructive',
            });
            setSaving(false);
        }
    }, [company?.id, companyId, form, vatEnabled, taxInputAccountId, taxOutputAccountId, isAr, refreshCompany, toast, queryClient]);

    // ─── Loading State ─────────────────────────────────────────
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

    // ─── Render ────────────────────────────────────────────────
    return (
        <div className="space-y-0 max-w-4xl mx-auto">

            {/* Sub-tabs */}
            <TaxSubTabs activeTab={subTab} onTabChange={setSubTab} isAr={isAr} />

            {/* ═══════════════════════════════════════════════════════ */}
            {/* ═══ Settings Sub-Tab ═════════════════════════════════ */}
            {/* ═══════════════════════════════════════════════════════ */}
            {subTab === 'settings' && (
                <div className="space-y-6">

                    {/* ── Country-specific banner ────────────────────── */}
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

                    {/* ── VAT Enable/Disable + Rate ─────────────────── */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardHeader className="pb-4">
                            <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                                <Receipt className="w-5 h-5 text-erp-teal" />
                                {isAr ? 'إعدادات الضريبة الأساسية' : 'Core Tax Settings'}
                            </CardTitle>
                            <CardDescription className="font-tajawal">
                                {isAr ? 'تفعيل الضريبة ونسبتها على مستوى النظام' : 'Enable tax and set the system-wide rate'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* VAT Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="space-y-1">
                                    <Label className="font-tajawal text-sm font-medium">
                                        {isAr ? 'تفعيل ضريبة القيمة المضافة' : 'Enable VAT'}
                                    </Label>
                                    <p className="text-xs text-gray-500 font-tajawal">
                                        {isAr ? 'عند التفعيل، تُحتسب الضريبة تلقائياً على جميع المعاملات' : 'When enabled, tax is auto-calculated on all transactions'}
                                    </p>
                                </div>
                                <Switch
                                    checked={vatEnabled}
                                    onCheckedChange={(v) => { setVatEnabled(v); setIsDirty(true); }}
                                />
                            </div>

                            {/* Status Alert */}
                            <Alert className={vatEnabled ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}>
                                {vatEnabled
                                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                                <AlertTitle className={vatEnabled ? 'text-green-800' : 'text-amber-800'}>
                                    {isAr
                                        ? vatEnabled ? `الضريبة مفعلة — ${form.vat_rate || 0}%` : 'الضريبة معطلة'
                                        : vatEnabled ? `Tax Enabled — ${form.vat_rate || 0}%` : 'Tax Disabled'}
                                </AlertTitle>
                                <AlertDescription className={vatEnabled ? 'text-green-700' : 'text-amber-700'}>
                                    {isAr
                                        ? vatEnabled
                                            ? 'تُطبّق هذه النسبة على جميع الفواتير والمبيعات والمشتريات'
                                            : 'لن يتم احتساب ضريبة على الفواتير'
                                        : vatEnabled
                                            ? 'This rate applies to all invoices, sales, and purchases'
                                            : 'No tax will be calculated on invoices'}
                                </AlertDescription>
                            </Alert>

                            {/* VAT Rate */}
                            {vatEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                                    <div className="space-y-2">
                                        <Label className="font-tajawal text-sm font-medium">
                                            <Percent className="w-4 h-4 inline me-1 text-erp-teal" />
                                            {isAr ? 'نسبة الضريبة المطبقة (%)' : 'Applied Tax Rate (%)'}
                                        </Label>
                                        <Input
                                            type="number"
                                            value={form.vat_rate ?? 0}
                                            onChange={(e) => updateField('vat_rate', Number(e.target.value))}
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            className="font-mono w-32"
                                            dir="ltr"
                                        />
                                        <p className="text-xs text-gray-400 font-tajawal">
                                            {isAr ? 'النسبة الافتراضية — يمكن تعديلها لكل مادة بشكل مستقل' : 'Default rate — can be overridden per material'}
                                        </p>
                                    </div>

                                    {/* Priority info */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 font-tajawal">
                                                    {isAr ? 'مسار تطبيق الضريبة' : 'Tax Application Priority'}
                                                </p>
                                                <ol className="text-xs text-blue-700 dark:text-blue-400 font-tajawal mt-2 space-y-1 list-decimal list-inside">
                                                    <li>{isAr ? 'ضريبة المادة (إذا محددة)' : 'Material tax rate (if set)'}</li>
                                                    <li>{isAr ? `نسبة الشركة (${form.vat_rate || 0}%)` : `Company rate (${form.vat_rate || 0}%)`}</li>
                                                    <li>{isAr ? '0% (لا ضريبة)' : '0% (no tax)'}</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Tax Types (Country-specific) ───────────────── */}
                    {countryConfig && countryConfig.taxTypes.length > 0 && (
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
                                    {countryConfig.taxTypes.map((taxType) => (
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
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Tax Accounts ───────────────────────────────── */}
                    {vatEnabled && (
                        <Card className="border-gray-200 dark:border-gray-700">
                            <CardHeader className="pb-4">
                                <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                                    <Wallet className="w-5 h-5 text-erp-teal" />
                                    {isAr ? 'حسابات الضريبة' : 'Tax Accounts'}
                                </CardTitle>
                                <CardDescription className="font-tajawal">
                                    {isAr ? 'الحسابات المحاسبية المستخدمة لتسجيل الضريبة' : 'Accounting accounts used for recording tax'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tax Input Account */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="font-tajawal text-sm">
                                            {isAr ? 'ضريبة المدخلات (المشتريات)' : 'VAT Input (Purchases)'}
                                        </Label>
                                        {taxInputAccountId
                                            ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{isAr ? 'مُعيّن' : 'Set'}</Badge>
                                            : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{isAr ? 'غير مُعيّن' : 'Not set'}</Badge>}
                                    </div>
                                    <Select value={taxInputAccountId} onValueChange={(v) => { setTaxInputAccountId(v); setIsDirty(true); }}>
                                        <SelectTrigger><SelectValue placeholder={isAr ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.filter(a => ['assets', 'liabilities'].includes((a as any).account_types?.classification || '')).map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    {a.account_code} - {isAr ? a.name_ar : (a.name_en || a.name_ar)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-400 font-tajawal">
                                        {isAr ? 'ضريبة المشتريات القابلة للاسترداد' : 'Recoverable VAT on purchases'}
                                    </p>
                                </div>

                                {/* Tax Output Account */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="font-tajawal text-sm">
                                            {isAr ? 'ضريبة المخرجات (المبيعات)' : 'VAT Output (Sales)'}
                                        </Label>
                                        {taxOutputAccountId
                                            ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{isAr ? 'مُعيّن' : 'Set'}</Badge>
                                            : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{isAr ? 'غير مُعيّن' : 'Not set'}</Badge>}
                                    </div>
                                    <Select value={taxOutputAccountId} onValueChange={(v) => { setTaxOutputAccountId(v); setIsDirty(true); }}>
                                        <SelectTrigger><SelectValue placeholder={isAr ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.filter(a => ['liabilities'].includes((a as any).account_types?.classification || '')).map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    {a.account_code} - {isAr ? a.name_ar : (a.name_en || a.name_ar)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-400 font-tajawal">
                                        {isAr ? 'ضريبة المبيعات المستحقة للدفع' : 'VAT payable on sales'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── ZATCA Section (Saudi Only) ─────────────────── */}
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

                    {/* ── Zakat Section (Saudi Only) ─────────────────── */}
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
                                                <SelectTrigger className="mt-1 font-tajawal"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="net_income" className="font-tajawal">{isAr ? 'صافي الربح' : 'Net Income Method'}</SelectItem>
                                                    <SelectItem value="net_assets" className="font-tajawal">{isAr ? 'صافي الأصول' : 'Net Assets Method'}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="font-tajawal text-sm">{isAr ? 'نسبة الزكاة (%)' : 'Zakat Rate (%)'}</Label>
                                            <Input type="number" value={form.zakat_rate ?? 2.5} onChange={(e) => updateField('zakat_rate', Number(e.target.value))} min={0} max={10} step={0.1} className="mt-1 font-mono w-32" dir="ltr" />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Country-specific Additional Fields (non-Saudi) ── */}
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
                                                <SelectTrigger className="mt-1 font-tajawal"><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
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

                    {/* ── Save Button ───────────────────────────────── */}
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
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* ═══ Settlement Sub-Tab ═══════════════════════════════ */}
            {/* ═══════════════════════════════════════════════════════ */}
            {subTab === 'settlement' && (
                <VATSettlement />
            )}
        </div>
    );
}
