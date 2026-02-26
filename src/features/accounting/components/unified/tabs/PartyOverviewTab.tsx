/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 PartyOverviewTab — تبويب نظرة عامة للجهات (عملاء / موردين)
 * ════════════════════════════════════════════════════════════════
 * يعرض بيانات الجهة في أقسام مطوية (Accordion):
 * 1. معلومات أساسية + حساب محاسبي
 * 2. بيانات التواصل
 * 3. العنوان والموقع
 * 4. البيانات الضريبية
 * 5. البيانات البنكية
 * 6. الشروط المالية
 * 7. الأسماء بلغات أخرى
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    ChevronUp,
    Info,
    BookOpen,
    Layers,
    Hash,
    Phone,
    MapPin,
    Receipt,
    Landmark,
    CreditCard,
    Globe,
    Users,
    Building2,
    User,
    UserCheck,
    Plus,
    X,
    FileText,
    AlertTriangle,
    Wallet,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { SheetMode } from '../types';
import { formatCurrency, formatNumber, formatDate, getCurrencySymbol } from '../utils/formatters';
import { useNumberFormat } from '@/hooks/useNumberFormat';

// ═══ Language Config ═══
const LANGUAGE_CONFIG = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦', field: 'name_ar', required: true },
    { code: 'en', label: 'English', flag: '🇬🇧', field: 'name_en', required: false },
    { code: 'ru', label: 'Русский', flag: '🇷🇺', field: 'name_ru', required: false },
    { code: 'uk', label: 'Українська', flag: '🇺🇦', field: 'name_uk', required: false },
    { code: 'ro', label: 'Română', flag: '🇷🇴', field: 'name_ro', required: false },
    { code: 'pl', label: 'Polski', flag: '🇵🇱', field: 'name_pl', required: false },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', field: 'name_tr', required: false },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪', field: 'name_de', required: false },
    { code: 'it', label: 'Italiano', flag: '🇮🇹', field: 'name_it', required: false },
] as const;

// ═══ Country list ═══
const COUNTRY_LIST = [
    { code: 'UA', name_ar: 'أوكرانيا', name_en: 'Ukraine', flag: '🇺🇦', taxSystem: 'VAT' },
    { code: 'TR', name_ar: 'تركيا', name_en: 'Turkey', flag: '🇹🇷', taxSystem: 'KDV' },
    { code: 'SA', name_ar: 'السعودية', name_en: 'Saudi Arabia', flag: '🇸🇦', taxSystem: 'VAT' },
    { code: 'AE', name_ar: 'الإمارات', name_en: 'UAE', flag: '🇦🇪', taxSystem: 'VAT' },
    { code: 'CN', name_ar: 'الصين', name_en: 'China', flag: '🇨🇳', taxSystem: 'VAT' },
    { code: 'IN', name_ar: 'الهند', name_en: 'India', flag: '🇮🇳', taxSystem: 'GST' },
    { code: 'EG', name_ar: 'مصر', name_en: 'Egypt', flag: '🇪🇬', taxSystem: 'VAT' },
    { code: 'JO', name_ar: 'الأردن', name_en: 'Jordan', flag: '🇯🇴', taxSystem: 'GST' },
    { code: 'RO', name_ar: 'رومانيا', name_en: 'Romania', flag: '🇷🇴', taxSystem: 'TVA' },
    { code: 'PL', name_ar: 'بولندا', name_en: 'Poland', flag: '🇵🇱', taxSystem: 'VAT' },
    { code: 'DE', name_ar: 'ألمانيا', name_en: 'Germany', flag: '🇩🇪', taxSystem: 'USt' },
    { code: 'IT', name_ar: 'إيطاليا', name_en: 'Italy', flag: '🇮🇹', taxSystem: 'IVA' },
    { code: 'US', name_ar: 'أمريكا', name_en: 'United States', flag: '🇺🇸', taxSystem: 'Sales Tax' },
    { code: 'GB', name_ar: 'بريطانيا', name_en: 'United Kingdom', flag: '🇬🇧', taxSystem: 'VAT' },
    { code: 'FR', name_ar: 'فرنسا', name_en: 'France', flag: '🇫🇷', taxSystem: 'TVA' },
    { code: 'RU', name_ar: 'روسيا', name_en: 'Russia', flag: '🇷🇺', taxSystem: 'НДС' },
    { code: 'PK', name_ar: 'باكستان', name_en: 'Pakistan', flag: '🇵🇰', taxSystem: 'GST' },
    { code: 'BD', name_ar: 'بنغلاديش', name_en: 'Bangladesh', flag: '🇧🇩', taxSystem: 'VAT' },
    { code: 'OTHER', name_ar: 'أخرى', name_en: 'Other', flag: '🌍', taxSystem: '' },
];

// ═══ Party type options ═══
const CUSTOMER_TYPES = [
    { value: 'wholesale', label_ar: 'جملة', label_en: 'Wholesale' },
    { value: 'retail', label_ar: 'تجزئة', label_en: 'Retail' },
    { value: 'corporate', label_ar: 'شركات', label_en: 'Corporate' },
    { value: 'individual', label_ar: 'فرد', label_en: 'Individual' },
];

const SUPPLIER_TYPES = [
    { value: 'fabric', label_ar: 'أقمشة', label_en: 'Fabric' },
    { value: 'accessories', label_ar: 'إكسسوارات', label_en: 'Accessories' },
    { value: 'service', label_ar: 'خدمات', label_en: 'Service' },
    { value: 'manufacturer', label_ar: 'مصنّع', label_en: 'Manufacturer' },
];

// ═══ Entity Type (individual/company) ═══
const ENTITY_TYPES = [
    { value: 'individual', label_ar: 'فرد', label_en: 'Individual', icon: User },
    { value: 'company', label_ar: 'شركة', label_en: 'Company', icon: Building2 },
];

// ═══ Props ═══
interface PartyOverviewTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    companyId?: string;
}

// ═══ Accordion Section ═══
function Section({
    title,
    icon: Icon,
    defaultOpen = false,
    children,
    badge,
    badgeColor = 'gray',
}: {
    title: string;
    icon: React.ElementType;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: string;
    badgeColor?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const colorMap: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <div className="border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                        {title}
                    </span>
                    {badge && (
                        <Badge className={cn("text-[10px] px-1.5 py-0 h-4", colorMap[badgeColor] || colorMap.gray)}>
                            {badge}
                        </Badge>
                    )}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

// ═══ Field Row ═══
function Field({ label, hint, children, required }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-gray-500 flex items-center gap-1">
                {label}
                {required && <span className="text-red-500">*</span>}
                {hint && <span className="text-[10px] text-gray-400 ms-1">({hint})</span>}
            </Label>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export function PartyOverviewTab({ data, mode, onChange, companyId }: PartyOverviewTabProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isAr = language === 'ar';
    const isEditable = mode === 'edit' || mode === 'create';
    const t = (ar: string, en: string) => isAr ? ar : en;
    const { fmtAmount } = useNumberFormat();

    // ─── Detect if this is an ACCOUNT from chart_of_accounts (not a party) ───
    const isAccountMode = !!(data?.account_code || data?.account_type_id || data?.is_group !== undefined);

    // ─── Determine party type from data (only relevant for party mode) ───
    const partyType: 'customer' | 'supplier' = data?._partyType || data?.party_type || data?.type || 'customer';
    const isCustomer = partyType === 'customer';

    // ─── State ───
    const [accountInfo, setAccountInfo] = useState<any>(null);
    const [accountTypeInfo, setAccountTypeInfo] = useState<any>(null);
    const [parentInfo, setParentInfo] = useState<any>(null);
    const [companyCurrencies, setCompanyCurrencies] = useState<string[]>([]);
    const [visibleLanguages, setVisibleLanguages] = useState<string[]>([]);
    const [showLanguages, setShowLanguages] = useState(false);
    const [salesAgents, setSalesAgents] = useState<{ id: string; full_name: string; role: string }[]>([]);

    // ─── Load account info from chart_of_accounts (party mode only) ───
    useEffect(() => {
        if (isAccountMode) return; // Skip for account mode
        const fetchAccountInfo = async () => {
            const accountId = isCustomer
                ? data?.receivable_account_id
                : data?.payable_account_id;
            if (!accountId) return;

            const { data: acct, error } = await supabase
                .from('chart_of_accounts')
                .select(`
                    id, account_code, name_ar, name_en, account_type_id, parent_id, is_group,
                    parent:chart_of_accounts!parent_id(id, account_code, name_ar, name_en)
                `)
                .eq('id', accountId)
                .single();

            if (!error && acct) {
                setAccountInfo(acct);
            }
        };
        fetchAccountInfo();
    }, [data?.receivable_account_id, data?.payable_account_id, isCustomer, isAccountMode]);

    // ─── Load account type info (account mode only) ───
    useEffect(() => {
        if (!isAccountMode || !data?.account_type_id) return;
        const fetchTypeInfo = async () => {
            const { data: typeData } = await supabase
                .from('account_types')
                .select('id, code, name_ar, name_en, classification, normal_balance')
                .eq('id', data.account_type_id)
                .maybeSingle();
            if (typeData) setAccountTypeInfo(typeData);
        };
        fetchTypeInfo();
    }, [isAccountMode, data?.account_type_id]);

    // ─── Load parent account info (account mode only) ───
    useEffect(() => {
        if (!isAccountMode || !data?.parent_id) return;
        const fetchParent = async () => {
            const { data: parent } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en')
                .eq('id', data.parent_id)
                .maybeSingle();
            if (parent) setParentInfo(parent);
        };
        fetchParent();
    }, [isAccountMode, data?.parent_id]);

    // ─── Load company currencies ───
    useEffect(() => {
        const fetchCurrencies = async () => {
            const cId = companyId || data?.company_id;
            if (!cId) return;
            const { data: settings } = await supabase
                .from('company_accounting_settings')
                .select('supported_currencies, base_currency')
                .eq('company_id', cId)
                .single();
            const supported = settings?.supported_currencies || [];
            const baseCur = settings?.base_currency || '';
            const merged = baseCur ? [baseCur, ...supported.filter((c: string) => c !== baseCur)] : supported;
            setCompanyCurrencies(merged.length > 0 ? merged : ['USD']);
        };
        fetchCurrencies();
    }, [companyId, data?.company_id]);

    // ─── Load sales agents (employees) — party mode only ───
    useEffect(() => {
        if (isAccountMode) return;
        const fetchAgents = async () => {
            const cId = companyId || data?.company_id;
            if (!cId) return;
            const { data: agents, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .eq('company_id', cId)
                .eq('is_active', true)
                .order('full_name');
            if (!error && agents) {
                setSalesAgents(agents);
            }
        };
        fetchAgents();
    }, [companyId, data?.company_id, isAccountMode]);

    // ─── Language visibility ───
    useEffect(() => {
        const langs: string[] = [];
        LANGUAGE_CONFIG.forEach((lang) => {
            if (!lang.required && data?.[lang.field]) {
                langs.push(lang.code);
            }
        });
        if (isEditable && !langs.includes('en')) langs.push('en');
        setVisibleLanguages(langs);
        if (langs.length > 0) setShowLanguages(true);
    }, [data?.id, isEditable]);

    // ─── Handlers ───
    const handleChange = useCallback((field: string, value: any) => {
        onChange({ [field]: value });
    }, [onChange]);

    // ─── The entity type (individual/company) — party mode ───
    const entityType = data?.customer_type || data?.supplier_type || 'wholesale';
    const entityKind = (entityType === 'individual' || entityType === 'retail') ? 'individual' : 'company';

    // ─── Country info — party mode ───
    const countryInfo = COUNTRY_LIST.find(c =>
        c.code === data?.country || c.name_en?.toLowerCase() === data?.country?.toLowerCase() || c.name_ar === data?.country
    );

    // ═══ Balance Card ═══
    const balance = data?.current_balance ?? data?.balance ?? 0;
    const openingBalance = data?.opening_balance ?? 0;
    const balanceLabel = isAccountMode
        ? (balance === 0 ? t('الحساب مُصفّى', 'Account Settled') : t('الرصيد الحالي', 'Current Balance'))
        : balance === 0
            ? t('مُصفّى', 'Settled')
            : balance > 0
                ? (isCustomer ? t('مستحق لنا', 'They owe us') : t('مستحق لهم', 'We owe them'))
                : (isCustomer ? t('مستحق لهم', 'We owe them') : t('مستحق لنا', 'They owe us'));
    const balanceColor = balance === 0
        ? 'text-gray-500'
        : isAccountMode
            ? 'text-indigo-600'
            : balance > 0
                ? (isCustomer ? 'text-green-600' : 'text-red-600')
                : (isCustomer ? 'text-red-600' : 'text-green-600');

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>{t('لا توجد بيانات', 'No data')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">

            {/* ════════ Balance Summary Card ════════ */}
            {!isEditable && !isAccountMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('الرصيد الحالي', 'Current Balance')}</p>
                        <p className={cn("text-lg font-bold font-mono", balanceColor)} dir="ltr">
                            {getCurrencySymbol(data?.currency || 'USD')} {fmtAmount(Math.abs(balance))}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{balanceLabel}</p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('رقم الحساب', 'Account Code')}</p>
                        <p className="text-lg font-bold font-mono text-indigo-600" dir="ltr">
                            {accountInfo?.account_code || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {isCustomer ? t('ذمم مدينة', 'Receivable') : t('ذمم دائنة', 'Payable')}
                        </p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('العملة', 'Currency')}</p>
                        <p className="text-lg font-bold font-mono">
                            {countryInfo?.flag || '🏳️'} {data?.currency || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{countryInfo?.name_ar || data?.country || ''}</p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('نوع الجهة', 'Party Type')}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {isCustomer
                                ? <Users className="w-5 h-5 text-blue-500" />
                                : <Building2 className="w-5 h-5 text-orange-500" />
                            }
                            <span className="font-semibold text-sm">
                                {isCustomer ? t('عميل', 'Customer') : t('مورد', 'Supplier')}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{data?.code}</p>
                    </div>
                </div>
            )}

            {/* ════════ Account Mode — Summary Cards ════════ */}
            {!isEditable && isAccountMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('الرصيد الحالي', 'Current Balance')}</p>
                        <p className={cn("text-lg font-bold font-mono", balanceColor)} dir="ltr">
                            {getCurrencySymbol(data?.currency || 'USD')} {fmtAmount(Math.abs(balance))}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{balanceLabel}</p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('رمز الحساب', 'Account Code')}</p>
                        <p className="text-lg font-bold font-mono text-indigo-600" dir="ltr">
                            {data?.account_code || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {accountTypeInfo ? (isAr ? accountTypeInfo.name_ar : (accountTypeInfo.name_en || accountTypeInfo.name_ar)) : ''}
                        </p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('العملة', 'Currency')}</p>
                        <p className="text-lg font-bold font-mono">
                            {getCurrencySymbol(data?.currency || 'USD')} {data?.currency || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {data?.is_multi_currency ? t('متعدد العملات', 'Multi-Currency') : ''}
                        </p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('الرصيد الافتتاحي', 'Opening Balance')}</p>
                        <p className="text-lg font-bold font-mono text-amber-600" dir="ltr">
                            {getCurrencySymbol(data?.currency || 'USD')} {fmtAmount(Math.abs(openingBalance))}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{data?.is_group ? t('حساب رئيسي', 'Group') : t('حساب تفصيلي', 'Detail')}</p>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* ═══ ACCOUNT MODE SECTIONS ═══ */}
            {/* ═══════════════════════════════════════════════════════ */}
            {isAccountMode && (
                <>
                    {/* ════════ 1. Account Details ════════ */}
                    <Section
                        title={t('التفاصيل', 'Details')}
                        icon={BookOpen}
                        defaultOpen={true}
                        badge={data?.is_group ? t('رئيسي', 'Group') : t('تفصيلي', 'Detail')}
                        badgeColor={data?.is_group ? 'purple' : 'blue'}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <Field label={t('اسم الحساب (العربية)', 'Account Name (Arabic)')} required>
                                {isEditable ? (
                                    <Input
                                        value={data?.name_ar || ''}
                                        onChange={(e) => handleChange('name_ar', e.target.value)}
                                        dir="rtl"
                                        placeholder={t('الاسم بالعربية', 'Arabic name')}
                                    />
                                ) : (
                                    <p className="text-sm font-semibold mt-1">{data?.name_ar || '—'}</p>
                                )}
                            </Field>

                            <Field label={t('اسم الحساب (الإنجليزية)', 'Account Name (English)')}>
                                {isEditable ? (
                                    <Input
                                        value={data?.name_en || ''}
                                        onChange={(e) => handleChange('name_en', e.target.value)}
                                        dir="ltr"
                                        placeholder="English name"
                                    />
                                ) : (
                                    <p className="text-sm mt-1">{data?.name_en || '—'}</p>
                                )}
                            </Field>

                            <Field label={t('رمز الحساب', 'Account Code')}>
                                <p className="text-sm font-mono font-bold text-indigo-600 mt-1" dir="ltr">{data?.account_code || '—'}</p>
                            </Field>

                            <Field label={t('نوع الحساب', 'Account Type')}>
                                <div className="flex items-center gap-2 mt-1">
                                    {accountTypeInfo ? (
                                        <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            {isAr ? accountTypeInfo.name_ar : (accountTypeInfo.name_en || accountTypeInfo.name_ar)}
                                        </Badge>
                                    ) : (
                                        <span className="text-sm text-gray-400">—</span>
                                    )}
                                    {accountTypeInfo?.normal_balance && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {accountTypeInfo.normal_balance === 'debit' ? t('مدين', 'Debit') : t('دائن', 'Credit')}
                                        </Badge>
                                    )}
                                </div>
                            </Field>

                            <Field label={t('نوع السجل', 'Record Type')}>
                                <div className="flex items-center gap-2 mt-1">
                                    {data?.is_group ? (
                                        <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                            <Layers className="w-3 h-3 me-1" />
                                            {t('حساب رئيسي (مجموعة)', 'Group Account')}
                                        </Badge>
                                    ) : (
                                        <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            <Hash className="w-3 h-3 me-1" />
                                            {t('حساب تفصيلي', 'Detail Account')}
                                        </Badge>
                                    )}
                                </div>
                            </Field>

                            <Field label={t('الحساب الأب', 'Parent Account')}>
                                <div className="flex items-center gap-2 mt-1">
                                    {parentInfo ? (
                                        <>
                                            <span className="font-mono text-xs text-gray-600" dir="ltr">
                                                {parentInfo.account_code}
                                            </span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {isAr ? parentInfo.name_ar : (parentInfo.name_en || parentInfo.name_ar)}
                                            </span>
                                        </>
                                    ) : data?.parent_id ? (
                                        <span className="text-sm text-gray-400">{t('جاري التحميل...', 'Loading...')}</span>
                                    ) : (
                                        <span className="text-sm text-gray-400">{t('حساب جذر', 'Root Account')}</span>
                                    )}
                                </div>
                            </Field>

                            <Field label={t('العملة', 'Currency')}>
                                {isEditable ? (
                                    <Select
                                        value={data?.currency || ''}
                                        onValueChange={(v) => handleChange('currency', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder={t('اختر العملة', 'Select')} /></SelectTrigger>
                                        <SelectContent>
                                            {companyCurrencies.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    <span className="font-mono text-xs">{getCurrencySymbol(c)} {c}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm font-mono mt-1">
                                        {data?.currency ? `${getCurrencySymbol(data.currency)} ${data.currency}` : '—'}
                                        {data?.is_multi_currency && (
                                            <Badge variant="outline" className="text-[10px] ms-2">{t('متعدد العملات', 'Multi-Currency')}</Badge>
                                        )}
                                    </p>
                                )}
                            </Field>

                            <Field label={t('الحالة', 'Status')}>
                                {isEditable ? (
                                    <div className="flex items-center gap-3 mt-1">
                                        <Switch
                                            checked={data?.is_active !== false}
                                            onCheckedChange={(v) => handleChange('is_active', v)}
                                        />
                                        <span className={cn('text-sm', data?.is_active !== false ? 'text-green-600' : 'text-red-500')}>
                                            {data?.is_active !== false ? t('✓ نشط', '✓ Active') : t('✗ غير نشط', '✗ Inactive')}
                                        </span>
                                    </div>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs mt-1',
                                            data?.is_active !== false
                                                ? 'border-green-500 text-green-600'
                                                : 'border-red-400 text-red-500'
                                        )}
                                    >
                                        {data?.is_active !== false ? t('✓ نشط', '✓ Active') : t('✗ غير نشط', '✗ Inactive')}
                                    </Badge>
                                )}
                            </Field>

                            {/* Account properties badges */}
                            {(data?.is_bank_account || data?.is_cash_account || data?.is_receivable || data?.is_payable) && (
                                <div className="md:col-span-2">
                                    <Field label={t('خصائص الحساب', 'Account Properties')}>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {data?.is_bank_account && (
                                                <Badge className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                                    🏦 {t('حساب بنكي', 'Bank Account')}
                                                </Badge>
                                            )}
                                            {data?.is_cash_account && (
                                                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    💵 {t('حساب نقدي (صندوق)', 'Cash Account')}
                                                </Badge>
                                            )}
                                            {data?.is_receivable && (
                                                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {t('ذمم مدينة', 'Receivable')}
                                                </Badge>
                                            )}
                                            {data?.is_payable && (
                                                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    {t('ذمم دائنة', 'Payable')}
                                                </Badge>
                                            )}
                                        </div>
                                    </Field>
                                </div>
                            )}

                            {/* Creation date */}
                            <Field label={t('تاريخ الإنشاء', 'Created At')}>
                                <p className="text-sm mt-1">
                                    {data?.created_at ? new Date(data.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                    }) : '—'}
                                </p>
                            </Field>
                        </div>
                    </Section>

                    {/* ════════ 2. Bank Info (only for bank accounts) ════════ */}
                    {data?.is_bank_account && (
                        <Section
                            title={t('البيانات البنكية', 'Bank Information')}
                            icon={Landmark}
                            defaultOpen={true}
                            badge="🏦"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <Field label={t('اسم البنك', 'Bank Name')}>
                                    {isEditable ? (
                                        <Input
                                            value={data?.bank_name || ''}
                                            onChange={(e) => handleChange('bank_name', e.target.value)}
                                            placeholder={t('اسم البنك', 'Bank name')}
                                        />
                                    ) : (
                                        <p className="text-sm mt-1">{data?.bank_name || '—'}</p>
                                    )}
                                </Field>

                                <Field label={t('رقم الحساب البنكي / IBAN', 'Account Number / IBAN')}>
                                    {isEditable ? (
                                        <Input
                                            value={data?.bank_account_number || ''}
                                            onChange={(e) => handleChange('bank_account_number', e.target.value)}
                                            dir="ltr"
                                            placeholder="UA123456789012345678901234567"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono mt-1" dir="ltr">{data?.bank_account_number || '—'}</p>
                                    )}
                                </Field>
                            </div>
                            {!data?.bank_name && !data?.bank_account_number && !isEditable && (
                                <p className="text-xs text-gray-400 text-center mt-2">
                                    {t('لم تُضف بيانات بنكية بعد', 'No bank information added yet')}
                                </p>
                            )}
                        </Section>
                    )}

                    {/* ════════ 3. Description & Notes ════════ */}
                    <Section
                        title={t('الوصف والملاحظات', 'Description & Notes')}
                        icon={Info}
                        defaultOpen={!!(data?.description || data?.notes)}
                    >
                        <div className="grid grid-cols-1 gap-4 mt-2">
                            <Field label={t('الوصف', 'Description')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder={t('وصف الحساب...', 'Account description...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.description || t('لا يوجد وصف', 'No description')}</p>
                                )}
                            </Field>
                            <Field label={t('ملاحظات', 'Notes')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.notes || ''}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        placeholder={t('ملاحظات إضافية...', 'Additional notes...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.notes || t('لا توجد ملاحظات', 'No notes')}</p>
                                )}
                            </Field>
                        </div>
                    </Section>

                    {/* ════════ 4. Multi-Language Names ════════ */}
                    <Section
                        title={t('الأسماء بلغات أخرى', 'Names in Other Languages')}
                        icon={Globe}
                        defaultOpen={false}
                    >
                        <div className="space-y-3 mt-2">
                            {LANGUAGE_CONFIG.filter(
                                (l) => !l.required && (visibleLanguages.includes(l.code) || data?.[l.field])
                            ).map((lang) => (
                                <div key={lang.code} className="flex items-center gap-2">
                                    <span className="text-lg w-8 shrink-0">{lang.flag}</span>
                                    <span className="text-xs text-gray-500 w-10 shrink-0">{lang.code.toUpperCase()}</span>
                                    {isEditable ? (
                                        <>
                                            <Input
                                                value={data?.[lang.field] || ''}
                                                onChange={(e) => handleChange(lang.field, e.target.value)}
                                                placeholder={`${lang.label}...`}
                                                className="flex-1 text-sm"
                                                dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 w-8 h-8 text-gray-400 hover:text-red-500"
                                                onClick={() => {
                                                    handleChange(lang.field, '');
                                                    setVisibleLanguages(prev => prev.filter(c => c !== lang.code));
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {data?.[lang.field] || '—'}
                                        </span>
                                    )}
                                </div>
                            ))}

                            {isEditable && (() => {
                                const addable = LANGUAGE_CONFIG.filter(
                                    (l) => !l.required && !visibleLanguages.includes(l.code) && !data?.[l.field]
                                );
                                if (addable.length === 0) return null;
                                return (
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <Select onValueChange={(code) => setVisibleLanguages(prev => [...prev, code])}>
                                            <SelectTrigger className="w-full text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Plus className="w-3 h-3" />
                                                    {t('إضافة لغة...', 'Add language...')}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {addable.map((l) => (
                                                    <SelectItem key={l.code} value={l.code}>
                                                        <span className="flex items-center gap-2">
                                                            <span>{l.flag}</span>
                                                            <span>{l.label}</span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })()}

                            {!isEditable && visibleLanguages.length === 0 && !LANGUAGE_CONFIG.some(l => !l.required && data?.[l.field]) && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                    {t('لم تُضف ترجمات بلغات أخرى', 'No translations added yet')}
                                </p>
                            )}
                        </div>
                    </Section>
                </>
            )}

            {/* ════════ PARTY MODE SECTIONS ════════ */}
            {!isAccountMode && (<>
                <Section
                    title={t('المعلومات الأساسية', 'Basic Information')}
                    icon={Info}
                    defaultOpen={true}
                    badge={isCustomer ? t('عميل', 'Customer') : t('مورد', 'Supplier')}
                    badgeColor={isCustomer ? 'blue' : 'orange'}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {/* اسم الجهة (عربي) */}
                        <Field label={t('اسم الجهة (العربية)', 'Name (Arabic)')} required>
                            {isEditable ? (
                                <Input
                                    value={data?.name_ar || ''}
                                    onChange={(e) => handleChange('name_ar', e.target.value)}
                                    dir="rtl"
                                    placeholder={t('الاسم بالعربية', 'Arabic name')}
                                />
                            ) : (
                                <p className="text-sm font-semibold mt-1">{data?.name_ar || '—'}</p>
                            )}
                        </Field>

                        {/* اسم الجهة (إنجليزي) */}
                        <Field label={t('اسم الجهة (الإنجليزية)', 'Name (English)')}>
                            {isEditable ? (
                                <Input
                                    value={data?.name_en || ''}
                                    onChange={(e) => handleChange('name_en', e.target.value)}
                                    dir="ltr"
                                    placeholder="English name"
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.name_en || '—'}</p>
                            )}
                        </Field>

                        {/* رقم الحساب بالشجرة المحاسبية */}
                        <Field
                            label={t('رقم الحساب بالشجرة', 'Chart Account Code')}
                            hint={t('تلقائي', 'Auto')}
                        >
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono font-bold text-indigo-600 text-base" dir="ltr">
                                    {accountInfo?.account_code || '—'}
                                </span>
                                {accountInfo && (
                                    <span className="text-[11px] text-gray-400">
                                        {isAr ? accountInfo.name_ar : (accountInfo.name_en || accountInfo.name_ar)}
                                    </span>
                                )}
                            </div>
                        </Field>

                        {/* نوع الحساب */}
                        <Field
                            label={t('نوع الحساب المحاسبي', 'Accounting Type')}
                            hint={t('تلقائي حسب الجهة', 'Auto by party type')}
                        >
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={cn(
                                    "text-xs",
                                    isCustomer
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                    {isCustomer ? t('ذمم مدينة (مدين)', 'Receivable (Debit)') : t('ذمم دائنة (دائن)', 'Payable (Credit)')}
                                </Badge>
                            </div>
                        </Field>

                        {/* الحساب الأب */}
                        <Field
                            label={t('الحساب الأب', 'Parent Account')}
                            hint={t('تلقائي', 'Auto')}
                        >
                            <div className="flex items-center gap-2 mt-1">
                                {accountInfo?.parent ? (
                                    <>
                                        <span className="font-mono text-xs text-gray-600" dir="ltr">
                                            {(accountInfo.parent as any).account_code}
                                        </span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {isAr ? (accountInfo.parent as any).name_ar : ((accountInfo.parent as any).name_en || (accountInfo.parent as any).name_ar)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                )}
                            </div>
                        </Field>

                        {/* نوع الجهة (جملة / تجزئة / أقمشة...) */}
                        <Field label={isCustomer ? t('تصنيف العميل', 'Customer Type') : t('تصنيف المورد', 'Supplier Type')}>
                            {isEditable ? (
                                <Select
                                    value={isCustomer ? (data?.customer_type || '') : (data?.supplier_type || '')}
                                    onValueChange={(v) => handleChange(isCustomer ? 'customer_type' : 'supplier_type', v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                    <SelectContent>
                                        {(isCustomer ? CUSTOMER_TYPES : SUPPLIER_TYPES).map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {isAr ? opt.label_ar : opt.label_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm mt-1">
                                    {(() => {
                                        const types = isCustomer ? CUSTOMER_TYPES : SUPPLIER_TYPES;
                                        const val = isCustomer ? data?.customer_type : data?.supplier_type;
                                        const found = types.find(t => t.value === val);
                                        return found ? (isAr ? found.label_ar : found.label_en) : (val || '—');
                                    })()}
                                </p>
                            )}
                        </Field>

                        {/* اسم الشركة */}
                        <Field label={t('اسم الشركة / المؤسسة', 'Company Name')}>
                            {isEditable ? (
                                <Input
                                    value={data?.company_name || ''}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    placeholder={t('اسم المؤسسة إذا كانت شركة', 'Company name if entity is a company')}
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.company_name || '—'}</p>
                            )}
                        </Field>

                        {/* الحالة */}
                        <Field label={t('الحالة', 'Status')}>
                            {isEditable ? (
                                <div className="flex items-center gap-3 mt-1">
                                    <Switch
                                        checked={data?.status === 'active' || data?.is_active !== false}
                                        onCheckedChange={(v) => {
                                            handleChange('status', v ? 'active' : 'inactive');
                                            handleChange('is_active', v);
                                        }}
                                    />
                                    <span className={cn('text-sm', (data?.status === 'active' || data?.is_active !== false) ? 'text-green-600' : 'text-red-500')}>
                                        {(data?.status === 'active' || data?.is_active !== false)
                                            ? t('✓ نشط', '✓ Active')
                                            : t('✗ غير نشط', '✗ Inactive')}
                                    </span>
                                </div>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-xs mt-1',
                                        data?.status === 'active'
                                            ? 'border-green-500 text-green-600'
                                            : 'border-red-400 text-red-500'
                                    )}
                                >
                                    {data?.status === 'active' ? t('✓ نشط', '✓ Active') : t('✗ غير نشط', '✗ Inactive')}
                                </Badge>
                            )}
                        </Field>

                        {/* موظف المبيعات / الوكيل المسؤول */}
                        <Field
                            label={isCustomer ? t('موظف المبيعات المسؤول', 'Sales Agent') : t('موظف المشتريات المسؤول', 'Purchase Agent')}
                            hint={t('للتارغت والحوافز لاحقاً', 'For targets & incentives')}
                        >
                            {isEditable ? (
                                <Select
                                    value={data?.sales_agent_id || ''}
                                    onValueChange={(v) => handleChange('sales_agent_id', v === '__none__' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر الموظف المسؤول', 'Select responsible agent')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            <span className="text-gray-400">{t('— بدون —', '— None —')}</span>
                                        </SelectItem>
                                        {salesAgents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span>{agent.full_name}</span>
                                                    {agent.role && (
                                                        <span className="text-[10px] text-gray-400 ms-1">({agent.role})</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-2 mt-1">
                                    {data?.sales_agent_id ? (
                                        <>
                                            <UserCheck className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-medium">
                                                {salesAgents.find(a => a.id === data.sales_agent_id)?.full_name || data.sales_agent_id}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-400">{t('لم يُحدد بعد', 'Not assigned')}</span>
                                    )}
                                </div>
                            )}
                        </Field>

                        {/* ملاحظات */}
                        <div className="md:col-span-2">
                            <Field label={t('ملاحظات', 'Notes')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.notes || ''}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        placeholder={t('ملاحظات إضافية...', 'Additional notes...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.notes || t('لا توجد ملاحظات', 'No notes')}</p>
                                )}
                            </Field>
                        </div>
                    </div>
                </Section>

                {/* ════════ 2. Contact Info ════════ */}
                <Section
                    title={t('بيانات التواصل', 'Contact Information')}
                    icon={Phone}
                    defaultOpen={!isEditable}
                    badge={[data?.phone, data?.mobile, data?.email, data?.telegram_username].filter(Boolean).length + ''}
                    badgeColor="blue"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Field label={t('الهاتف', 'Phone')}>
                            {isEditable ? (
                                <Input
                                    value={data?.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    dir="ltr"
                                    placeholder="+380 XX XXX XXXX"
                                    type="tel"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.phone || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('الجوال', 'Mobile')}>
                            {isEditable ? (
                                <Input
                                    value={data?.mobile || ''}
                                    onChange={(e) => handleChange('mobile', e.target.value)}
                                    dir="ltr"
                                    placeholder="+380 XX XXX XXXX"
                                    type="tel"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.mobile || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('البريد الإلكتروني', 'Email')}>
                            {isEditable ? (
                                <Input
                                    value={data?.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    dir="ltr"
                                    placeholder="email@example.com"
                                    type="email"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.email || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('تلغرام', 'Telegram')}>
                            {isEditable ? (
                                <Input
                                    value={data?.telegram_username || ''}
                                    onChange={(e) => handleChange('telegram_username', e.target.value)}
                                    dir="ltr"
                                    placeholder="@username"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">
                                    {data?.telegram_username ? `@${data.telegram_username}` : '—'}
                                </p>
                            )}
                        </Field>

                        {isCustomer && (
                            <Field label={t('اللغة المفضلة', 'Preferred Language')}>
                                {isEditable ? (
                                    <Select
                                        value={data?.preferred_language || ''}
                                        onValueChange={(v) => handleChange('preferred_language', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                        <SelectContent>
                                            {LANGUAGE_CONFIG.map((l) => (
                                                <SelectItem key={l.code} value={l.code}>
                                                    {l.flag} {l.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm mt-1">
                                        {(() => {
                                            const lang = LANGUAGE_CONFIG.find(l => l.code === data?.preferred_language);
                                            return lang ? `${lang.flag} ${lang.label}` : '—';
                                        })()}
                                    </p>
                                )}
                            </Field>
                        )}
                    </div>
                </Section>

                {/* ════════ 3. Address ════════ */}
                <Section
                    title={t('العنوان والموقع', 'Address & Location')}
                    icon={MapPin}
                    defaultOpen={false}
                    badge={countryInfo?.flag}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Field label={t('الدولة', 'Country')}>
                            {isEditable ? (
                                <Select
                                    value={data?.country || ''}
                                    onValueChange={(v) => handleChange('country', v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('اختر الدولة', 'Select country')} /></SelectTrigger>
                                    <SelectContent>
                                        {COUNTRY_LIST.map((c) => (
                                            <SelectItem key={c.code} value={c.name_en}>
                                                {c.flag} {isAr ? c.name_ar : c.name_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm mt-1">
                                    {countryInfo ? `${countryInfo.flag} ${isAr ? countryInfo.name_ar : countryInfo.name_en}` : (data?.country || '—')}
                                </p>
                            )}
                        </Field>

                        <Field label={t('المدينة', 'City')}>
                            {isEditable ? (
                                <Input
                                    value={data?.city || ''}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder={t('المدينة', 'City')}
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.city || '—'}</p>
                            )}
                        </Field>

                        <div className="md:col-span-2">
                            <Field label={t('العنوان التفصيلي', 'Full Address')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        placeholder={t('العنوان بالتفصيل...', 'Detailed address...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.address || t('لا يوجد عنوان', 'No address')}</p>
                                )}
                            </Field>
                        </div>
                    </div>
                </Section>

                {/* ════════ 4. Tax Info ════════ */}
                <Section
                    title={t('البيانات الضريبية', 'Tax Information')}
                    icon={Receipt}
                    defaultOpen={false}
                    badge={data?.tax_number ? t('مسجّل', 'Registered') : undefined}
                    badgeColor="green"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Field label={t('الرقم الضريبي', 'Tax Number / VAT ID')}>
                            {isEditable ? (
                                <Input
                                    value={data?.tax_number || ''}
                                    onChange={(e) => handleChange('tax_number', e.target.value)}
                                    dir="ltr"
                                    placeholder={t('رقم التسجيل الضريبي', 'Tax registration number')}
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.tax_number || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('النظام الضريبي', 'Tax System')} hint={t('حسب الدولة', 'Based on country')}>
                            <div className="flex items-center gap-2 mt-1">
                                {countryInfo?.taxSystem ? (
                                    <Badge variant="outline" className="text-xs">
                                        {countryInfo.flag} {countryInfo.taxSystem}
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                )}
                            </div>
                        </Field>

                        {/* Alert for international parties */}
                        {countryInfo && data?.country && (() => {
                            const cId = companyId || data?.company_id;
                            // Simple heuristic: if country != Ukraine, it's international
                            const isInternational = data?.country !== 'Ukraine' && data?.country !== 'UA';
                            if (!isInternational) return null;
                            return (
                                <div className="md:col-span-2 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                            {t('🌍 جهة دولية', '🌍 International Party')}
                                        </p>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                                            {t(
                                                'الضرائب على المشتريات الدولية تُدفع عبر الكونتينر وليس عبر الفاتورة مباشرة',
                                                'Taxes on international purchases are paid via container, not directly on invoice'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </Section>

                {/* ════════ 5. Bank Info ════════ */}
                <Section
                    title={t('البيانات البنكية', 'Bank Information')}
                    icon={Landmark}
                    defaultOpen={false}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Field label={t('اسم البنك', 'Bank Name')}>
                            {isEditable ? (
                                <Input
                                    value={data?.bank_name || ''}
                                    onChange={(e) => handleChange('bank_name', e.target.value)}
                                    placeholder={t('اسم البنك', 'Bank name')}
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.bank_name || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('رقم الحساب / IBAN', 'Account Number / IBAN')}>
                            {isEditable ? (
                                <Input
                                    value={data?.iban || data?.bank_account || ''}
                                    onChange={(e) => handleChange('iban', e.target.value)}
                                    dir="ltr"
                                    placeholder="UA123456789012345678901234567"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.iban || data?.bank_account || '—'}</p>
                            )}
                        </Field>
                    </div>
                    {!data?.bank_name && !data?.iban && !data?.bank_account && !isEditable && (
                        <p className="text-xs text-gray-400 text-center mt-2">
                            {t('لم تُضف بيانات بنكية بعد', 'No bank information added yet')}
                        </p>
                    )}
                </Section>

                {/* ════════ 6. Financial Terms ════════ */}
                <Section
                    title={t('الشروط المالية', 'Financial Terms')}
                    icon={CreditCard}
                    defaultOpen={false}
                    badge={data?.currency || undefined}
                    badgeColor="purple"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Field label={t('العملة المفضلة', 'Preferred Currency')}>
                            {isEditable ? (
                                <Select
                                    value={data?.currency || ''}
                                    onValueChange={(v) => handleChange('currency', v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('اختر العملة', 'Select currency')} /></SelectTrigger>
                                    <SelectContent>
                                        {companyCurrencies.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                <span className="font-mono text-xs">{getCurrencySymbol(c)} {c}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm font-mono mt-1">
                                    {data?.currency ? `${getCurrencySymbol(data.currency)} ${data.currency}` : '—'}
                                </p>
                            )}
                        </Field>

                        <Field label={t('شروط الدفع (أيام)', 'Payment Terms (days)')}>
                            {isEditable ? (
                                <Input
                                    type="number"
                                    value={data?.payment_terms_days ?? ''}
                                    onChange={(e) => handleChange('payment_terms_days', parseInt(e.target.value) || null)}
                                    dir="ltr"
                                    placeholder="30"
                                    min={0}
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1">
                                    {data?.payment_terms_days != null ? `${data.payment_terms_days} ${t('يوم', 'days')}` : '—'}
                                </p>
                            )}
                        </Field>

                        {isCustomer && (
                            <>
                                <Field label={t('حد الائتمان', 'Credit Limit')}>
                                    {isEditable ? (
                                        <Input
                                            type="number"
                                            value={data?.credit_limit ?? ''}
                                            onChange={(e) => handleChange('credit_limit', parseFloat(e.target.value) || null)}
                                            dir="ltr"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono mt-1">
                                            {data?.credit_limit != null
                                                ? `${getCurrencySymbol(data?.currency || 'USD')} ${fmtAmount(data.credit_limit)}`
                                                : '—'
                                            }
                                        </p>
                                    )}
                                </Field>

                                <Field label={t('نسبة الخصم الافتراضية %', 'Default Discount %')}>
                                    {isEditable ? (
                                        <Input
                                            type="number"
                                            value={data?.discount_percent ?? ''}
                                            onChange={(e) => handleChange('discount_percent', parseFloat(e.target.value) || null)}
                                            dir="ltr"
                                            placeholder="0"
                                            min={0}
                                            max={100}
                                            step="0.5"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono mt-1">
                                            {data?.discount_percent != null ? `${data.discount_percent}%` : '—'}
                                        </p>
                                    )}
                                </Field>
                            </>
                        )}
                    </div>
                </Section>

                {/* ════════ 7. Multi-Language Names ════════ */}
                <Section
                    title={t('الأسماء بلغات أخرى', 'Names in Other Languages')}
                    icon={Globe}
                    defaultOpen={false}
                >
                    <div className="space-y-3 mt-2">
                        {LANGUAGE_CONFIG.filter(
                            (l) => !l.required && (visibleLanguages.includes(l.code) || data?.[l.field])
                        ).map((lang) => (
                            <div key={lang.code} className="flex items-center gap-2">
                                <span className="text-lg w-8 shrink-0">{lang.flag}</span>
                                <span className="text-xs text-gray-500 w-10 shrink-0">{lang.code.toUpperCase()}</span>
                                {isEditable ? (
                                    <>
                                        <Input
                                            value={data?.[lang.field] || ''}
                                            onChange={(e) => handleChange(lang.field, e.target.value)}
                                            placeholder={`${lang.label}...`}
                                            className="flex-1 text-sm"
                                            dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 w-8 h-8 text-gray-400 hover:text-red-500"
                                            onClick={() => {
                                                handleChange(lang.field, '');
                                                setVisibleLanguages(prev => prev.filter(c => c !== lang.code));
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {data?.[lang.field] || '—'}
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Add language button (edit mode) */}
                        {isEditable && (() => {
                            const addable = LANGUAGE_CONFIG.filter(
                                (l) => !l.required && !visibleLanguages.includes(l.code) && !data?.[l.field]
                            );
                            if (addable.length === 0) return null;
                            return (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Select onValueChange={(code) => setVisibleLanguages(prev => [...prev, code])}>
                                        <SelectTrigger className="w-full text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Plus className="w-3 h-3" />
                                                {t('إضافة لغة...', 'Add language...')}
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {addable.map((l) => (
                                                <SelectItem key={l.code} value={l.code}>
                                                    <span className="flex items-center gap-2">
                                                        <span>{l.flag}</span>
                                                        <span>{l.label}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        })()}

                        {/* No languages message (view mode) */}
                        {!isEditable && visibleLanguages.length === 0 && !LANGUAGE_CONFIG.some(l => !l.required && data?.[l.field]) && (
                            <p className="text-xs text-gray-400 text-center py-2">
                                {t('لم تُضف ترجمات بلغات أخرى', 'No translations added yet')}
                            </p>
                        )}
                    </div>
                </Section>
            </>)}
        </div>
    );
}

export default PartyOverviewTab;
