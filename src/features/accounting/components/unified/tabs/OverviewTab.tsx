/**
 * Overview Tab - تبويب النظرة العامة
 * يعرض ملخص البيانات والإحصائيات الرئيسية
 * ═══ يدعم وضع العرض (view) والتعديل (edit) والإنشاء (create) ═══
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    Activity,
    Info,
    Globe,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickStats } from '../components/QuickStats';
import { formatCurrency, formatNumber, formatDate, getCurrencySymbol } from '../utils/formatters';
import type { StatConfig } from '../types';
import type { SheetMode } from '../types';
import { supabase } from '@/lib/supabase';

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

// ═══ Account Type from DB ═══
interface AccountType {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    classification: string;
    normal_balance: string;
}

interface OverviewTabProps {
    data: any;
    stats: StatConfig[];
    currency?: string;
    useArabicNumerals?: boolean;
    mode?: SheetMode;
    onChange?: (field: string, value: any) => void;
    companyId?: string;
    allAccounts?: any[];
}

export function OverviewTab({
    data,
    stats,
    currency = '',
    useArabicNumerals = false,
    mode = 'view',
    onChange,
    companyId,
    allAccounts,
}: OverviewTabProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isEditable = mode === 'edit' || mode === 'create';
    const isCreate = mode === 'create';

    // ═══ State ═══
    const [showLanguages, setShowLanguages] = useState(false);
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [visibleLanguages, setVisibleLanguages] = useState<string[]>([]);
    const [companyCurrencies, setCompanyCurrencies] = useState<string[]>([]);

    // ═══ Load account types + company currencies ═══
    useEffect(() => {
        if (!isEditable) return;
        const fetchEditData = async () => {
            // Account types
            const { data: types } = await supabase
                .from('account_types')
                .select('*')
                .order('display_order', { ascending: true });
            if (types) setAccountTypes(types);

            // Company currencies from settings + company default
            const cId = companyId || data?.company_id;
            if (cId) {
                const [settingsRes, companyRes] = await Promise.all([
                    supabase
                        .from('company_accounting_settings')
                        .select('supported_currencies, base_currency')
                        .eq('company_id', cId)
                        .single(),
                    supabase
                        .from('companies')
                        .select('default_currency')
                        .eq('id', cId)
                        .single(),
                ]);
                const supported = settingsRes.data?.supported_currencies || [];
                const baseCur = settingsRes.data?.base_currency || companyRes.data?.default_currency || '';
                // Merge: base currency first, then supported
                const merged = baseCur ? [baseCur, ...supported.filter((c: string) => c !== baseCur)] : supported;
                setCompanyCurrencies(merged.length > 0 ? merged : ['USD']);
            }
        };
        fetchEditData();
    }, [isEditable, companyId, data?.company_id]);

    // ═══ Detect which languages have values (for initial display) ═══
    useEffect(() => {
        const langs: string[] = [];
        LANGUAGE_CONFIG.forEach((lang) => {
            if (!lang.required && data?.[lang.field]) {
                langs.push(lang.code);
            }
        });
        // Always show EN by default when editing
        if (isEditable && !langs.includes('en')) {
            langs.push('en');
        }
        setVisibleLanguages(langs);
        if (langs.length > 0) setShowLanguages(true);
    }, [data?.id, isEditable]);

    // ═══ Handler ═══
    const handleChange = useCallback((field: string, value: any) => {
        onChange?.(field, value);
    }, [onChange]);

    // ═══ Available parent accounts (groups only, exclude self) ═══
    const parentOptions = (allAccounts || []).filter(
        (a: any) => a.is_group && a.id !== data?.id
    );

    // ═══ Auto-generate account code based on parent ═══
    // الترقيم التسلسلي: أول ابن = كود الأب + "1" (111 → 1111)، التالي = آخر كود + 1 (1113 → 1114)
    const getNextAccountCode = useCallback((parentId: string | null): string => {
        const accounts = allAccounts || [];
        if (!parentId) return '';
        const parent = accounts.find((a: any) => a.id === parentId);
        if (!parent) return '';
        const parentCode = parent.account_code || parent.code || '';
        if (!parentCode) return '';

        // Get DIRECT children of this parent only
        const children = accounts.filter((a: any) => a.parent_id === parentId);

        if (children.length === 0) {
            // First child: parentCode + "1" → e.g. 111 → 1111, 11 → 111
            return parentCode + '1';
        }

        // Find max code among direct children (only codes that start with parentCode)
        const childCodes = children
            .map((a: any) => {
                const code = a.account_code || a.code || '';
                return code.startsWith(parentCode) ? parseInt(code) : NaN;
            })
            .filter((n: number) => !isNaN(n));

        if (childCodes.length === 0) {
            return parentCode + '1';
        }

        const maxCode = Math.max(...childCodes);
        return (maxCode + 1).toString();
    }, [allAccounts]);

    // ═══ Resolve account_type_id for a given parent (walks up to the root group) ═══
    const resolveAccountTypeFromParent = useCallback((parentId: string | null): string | null => {
        if (!parentId) return null;
        const accounts = allAccounts || [];
        const parent = accounts.find((a: any) => a.id === parentId);
        if (!parent) return null;
        // If the parent has an account_type_id, use it
        if (parent.account_type_id) return parent.account_type_id;
        // Otherwise walk up the tree
        if (parent.parent_id) return resolveAccountTypeFromParent(parent.parent_id);
        return null;
    }, [allAccounts]);

    // ═══ Handle parent change → auto-generate code + inherit account_type ═══
    const handleParentChange = useCallback((parentId: string | null) => {
        handleChange('parent_id', parentId);
        if (parentId) {
            // Auto-inherit account_type_id from parent group
            const inheritedType = resolveAccountTypeFromParent(parentId);
            if (inheritedType) {
                handleChange('account_type_id', inheritedType);
            }
            if (isCreate) {
                const newCode = getNextAccountCode(parentId);
                if (newCode) handleChange('account_code', newCode);
            }
        }
    }, [handleChange, isCreate, getNextAccountCode, resolveAccountTypeFromParent]);

    if (!data && !isCreate) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>{t('messages.noData') || 'لا توجد بيانات'}</p>
            </div>
        );
    }

    // ═══ View Mode Helpers ═══
    const getName = () => {
        if (language === 'ar' && data?.name_ar) return data.name_ar;
        if (language === 'en' && data?.name_en) return data.name_en;
        return data?.name || data?.name_ar || '-';
    };

    const accountTypeColor: Record<string, string> = {
        asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        current_asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        fixed_asset: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        current_liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        expense: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        cogs: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const typeCode = (data?.account_type_code || data?.account_type || data?.type || '').toLowerCase();
    const typeColorClass = accountTypeColor[typeCode] || 'bg-gray-100 text-gray-700';

    const getAccountTypeName = (typeId: string) => {
        const found = accountTypes.find(t => t.id === typeId);
        if (!found) return typeCode || '-';
        return language === 'ar' ? found.name_ar : (found.name_en || found.name_ar);
    };

    // currencyOptions now from companyCurrencies (fetched from DB)

    // ═══ RENDER ═══
    return (
        <div className="space-y-6">
            {/* Quick Stats — always visible, always read-only */}
            {!isCreate && (
                <QuickStats
                    stats={stats}
                    data={data}
                    currency={currency || data?.currency || ''}
                    useArabicNumerals={useArabicNumerals}
                    columns={4}
                />
            )}

            {/* ═══════ EDITABLE SECTION ═══════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ═══ Basic Info Card ═══ */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-400" />
                            {t('accounting.details') || 'التفاصيل'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* رمز الحساب — يتولّد تلقائياً عند الإنشاء */}
                        <div>
                            <Label className="text-xs text-gray-500">
                                {t('accounting.account.code') || 'رمز الحساب'}
                                {isCreate && (
                                    <span className="text-[10px] text-gray-400 ms-1">
                                        ({language === 'ar' ? 'تلقائي' : 'Auto'})
                                    </span>
                                )}
                            </Label>
                            {isEditable ? (
                                <Input
                                    value={data?.account_code || data?.code || ''}
                                    onChange={(e) => handleChange('account_code', e.target.value)}
                                    className="mt-1 font-mono font-bold"
                                    dir="ltr"
                                    placeholder={language === 'ar' ? 'اختر المجموعة أولاً' : 'Select parent first'}
                                />
                            ) : (
                                <p className="font-mono font-bold text-erp-primary text-lg mt-1">
                                    {data?.code || data?.account_code || '-'}
                                </p>
                            )}
                        </div>

                        {/* اسم الحساب (العربي — دائماً مطلوب) */}
                        <div>
                            <Label className="text-xs text-gray-500">
                                {t('accounting.account.name') || 'اسم الحساب'} (العربية) <span className="text-red-500">*</span>
                            </Label>
                            {isEditable ? (
                                <Input
                                    value={data?.name_ar || ''}
                                    onChange={(e) => handleChange('name_ar', e.target.value)}
                                    className="mt-1"
                                    placeholder="اسم الحساب بالعربية"
                                    dir="rtl"
                                />
                            ) : (
                                <p className="text-base font-medium mt-1">{getName()}</p>
                            )}
                        </div>

                        {/* نوع الحساب — يُورث تلقائياً من المجموعة الأم */}
                        <div>
                            <Label className="text-xs text-gray-500">
                                {t('accounting.account.type') || 'نوع الحساب'}
                                {isEditable && data?.parent_id && (
                                    <span className="text-[10px] text-gray-400 ms-1">
                                        ({language === 'ar' ? 'يُحدد من المجموعة' : 'Inherited from group'})
                                    </span>
                                )}
                            </Label>
                            {isEditable && !data?.parent_id ? (
                                /* Root-level account: allow manual type selection */
                                <Select
                                    value={data?.account_type_id || ''}
                                    onValueChange={(v) => handleChange('account_type_id', v)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={language === 'ar' ? 'اختر نوع الحساب' : 'Select type'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accountTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {language === 'ar' ? type.name_ar : (type.name_en || type.name_ar)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                /* Has parent → type is inherited, show as info badge */
                                <div className="mt-1 flex items-center gap-2">
                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', typeColorClass)}>
                                        {getAccountTypeName(data?.account_type_id)}
                                    </span>
                                    {isEditable && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            {language === 'ar' ? 'نوع الحساب موروث من المجموعة الأم' : 'Type inherited from parent group'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* المجموعة (عرض فقط — المجموعات لها زر مخصص) */}
                        {!isCreate && (
                            <div>
                                <Label className="text-xs text-gray-500">
                                    {language === 'ar' ? 'نوع السجل' : 'Record Type'}
                                </Label>
                                <div className="mt-1">
                                    <Badge variant={data?.is_group ? 'secondary' : 'outline'} className="text-xs">
                                        {data?.is_group
                                            ? (language === 'ar' ? '📁 مجموعة' : '📁 Group')
                                            : (language === 'ar' ? '📄 حساب تفصيلي' : '📄 Detail Account')}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {/* الحساب الأب / المجموعة */}
                        <div>
                            <Label className="text-xs text-gray-500">
                                {isCreate
                                    ? (language === 'ar' ? 'ضمن مجموعة' : 'Under Group')
                                    : (t('accounting.parent') || 'الحساب الأب')}
                                {isCreate && <span className="text-red-500 ms-1">*</span>}
                            </Label>
                            {isEditable ? (
                                <Select
                                    value={data?.parent_id || '__none__'}
                                    onValueChange={(v) => handleParentChange(v === '__none__' ? null : v)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={language === 'ar' ? 'اختر المجموعة' : 'Select group'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!isCreate && (
                                            <SelectItem value="__none__">
                                                {language === 'ar' ? '— بدون أب (رئيسي)' : '— No parent (root)'}
                                            </SelectItem>
                                        )}
                                        {parentOptions.map((a: any) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                <span className="font-mono text-xs me-2">{a.account_code || a.code}</span>
                                                {a.name_ar || a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm mt-1">
                                    {data?.parent
                                        ? `${data.parent.code || data.parent.account_code} — ${data.parent.name_ar || data.parent.name}`
                                        : (data?.parent_id
                                            ? (language === 'ar' ? 'مرتبط بحساب أب' : 'Has parent')
                                            : (language === 'ar' ? 'حساب رئيسي' : 'Root account'))}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ═══ Right Column: Currency, Status, Activity ═══ */}
                <div className="space-y-4">
                    {/* Currency & Status Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="w-4 h-4 text-gray-400" />
                                {isEditable
                                    ? (language === 'ar' ? 'الإعدادات' : 'Settings')
                                    : (t('accounting.activity') || 'النشاط')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* العملة */}
                            <div>
                                <Label className="text-xs text-gray-500">{t('accounting.currency') || 'العملة'}</Label>
                                {isEditable ? (
                                    <Select
                                        value={data?.currency || ''}
                                        onValueChange={(v) => handleChange('currency', v)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companyCurrencies.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-mono text-xs w-8">{c}</span>
                                                        <span className="text-gray-500">{getCurrencySymbol(c)}</span>
                                                        <span className="text-xs text-gray-400">
                                                            {t(`currencies.${c}`) || ''}
                                                        </span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="mt-1">
                                        {(data?.currency_code || data?.currency) ? (
                                            <Badge variant="secondary" className="font-mono">
                                                {getCurrencySymbol(data.currency_code || data.currency)}{' '}
                                                {data.currency_code || data.currency}
                                            </Badge>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* الحالة */}
                            <div>
                                <Label className="text-xs text-gray-500">
                                    {language === 'ar' ? 'الحالة' : 'Status'}
                                </Label>
                                {isEditable ? (
                                    <div className="flex items-center gap-3 mt-2">
                                        <Switch
                                            checked={data?.is_active !== false}
                                            onCheckedChange={(v) => handleChange('is_active', v)}
                                        />
                                        <span className={cn('text-sm', data?.is_active !== false ? 'text-green-600' : 'text-red-500')}>
                                            {data?.is_active !== false
                                                ? (language === 'ar' ? '✓ نشط' : '✓ Active')
                                                : (language === 'ar' ? '✗ غير نشط' : '✗ Inactive')}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mt-1">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-xs',
                                                data?.is_active !== false
                                                    ? 'border-green-500 text-green-600'
                                                    : 'border-red-400 text-red-500'
                                            )}
                                        >
                                            {data?.is_active !== false
                                                ? (language === 'ar' ? '✓ نشط' : '✓ Active')
                                                : (language === 'ar' ? '✗ غير نشط' : '✗ Inactive')}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* الرصيد الافتتاحي (فقط في الإنشاء/التعديل) */}
                            {isEditable && (
                                <div>
                                    <Label className="text-xs text-gray-500">
                                        {t('accounting.openingBalance') || 'الرصيد الافتتاحي'}
                                    </Label>
                                    <Input
                                        type="number"
                                        value={data?.opening_balance || 0}
                                        onChange={(e) => handleChange('opening_balance', parseFloat(e.target.value) || 0)}
                                        className="mt-1 font-mono"
                                        dir="ltr"
                                        step="0.01"
                                    />
                                </div>
                            )}

                            {/* Activity info (view mode only) */}
                            {!isEditable && (
                                <>
                                    <InfoRow
                                        label={t('accounting.transactionCount') || 'عدد العمليات'}
                                        value={
                                            <span className="font-mono font-bold text-lg">
                                                {formatNumber(data?.transaction_count || 0, useArabicNumerals)}
                                            </span>
                                        }
                                    />
                                    <InfoRow
                                        label={t('accounting.lastActivity') || 'آخر حركة'}
                                        value={
                                            data?.last_activity
                                                ? formatDate(data.last_activity, useArabicNumerals)
                                                : (language === 'ar' ? 'لا توجد حركات' : 'No movements')
                                        }
                                    />
                                    <InfoRow
                                        label={t('accounting.createdAt') || 'تاريخ الإنشاء'}
                                        value={formatDate(data?.created_at, useArabicNumerals)}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Description (editable) */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('accounting.description') || 'الوصف'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditable ? (
                                <Textarea
                                    value={data?.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder={language === 'ar' ? 'ملاحظات أو وصف للحساب...' : 'Account notes or description...'}
                                    rows={3}
                                    className="text-sm"
                                />
                            ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {data?.description || (language === 'ar' ? 'لا يوجد وصف' : 'No description')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ═══════ MULTI-LANGUAGE NAMES ═══════ */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            {language === 'ar' ? 'الأسماء بلغات أخرى' : 'Names in Other Languages'}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLanguages(!showLanguages)}
                            className="text-xs"
                        >
                            {showLanguages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <span className="ms-1">
                                {showLanguages
                                    ? (language === 'ar' ? 'إخفاء' : 'Hide')
                                    : (language === 'ar' ? 'عرض' : 'Show')}
                            </span>
                        </Button>
                    </div>
                </CardHeader>
                {showLanguages && (
                    <CardContent className="space-y-3">
                        {/* Current visible languages */}
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
                                                setVisibleLanguages((prev) => prev.filter((c) => c !== lang.code));
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
                                    <Select
                                        onValueChange={(code) => {
                                            setVisibleLanguages((prev) => [...prev, code]);
                                        }}
                                    >
                                        <SelectTrigger className="w-full text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Plus className="w-3 h-3" />
                                                {language === 'ar' ? 'إضافة لغة...' : 'Add language...'}
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
                                {language === 'ar' ? 'لم تُضف ترجمات بلغات أخرى' : 'No translations added yet'}
                            </p>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* ═══════ BALANCE SUMMARY (view/edit mode only, not create) ═══════ */}
            {
                !isCreate && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-gray-400" />
                                {t('accounting.balanceSummary') || 'ملخص الأرصدة'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <BalanceItem
                                    label={t('accounting.openingBalance') || 'الرصيد الافتتاحي'}
                                    subtitle={language === 'ar' ? 'رصيد بداية الفترة' : 'Period opening'}
                                    value={data?.opening_balance || 0}
                                    currency={currency || data?.currency || ''}
                                    useArabicNumerals={useArabicNumerals}
                                />
                                <BalanceItem
                                    label={t('accounting.entry.debit') || 'مدين'}
                                    subtitle={language === 'ar' ? 'ما دخل للحساب' : 'Inflow'}
                                    value={data?.total_debit || 0}
                                    currency={currency || data?.currency || ''}
                                    useArabicNumerals={useArabicNumerals}
                                    colorClass="text-green-600"
                                />
                                <BalanceItem
                                    label={t('accounting.entry.credit') || 'دائن'}
                                    subtitle={language === 'ar' ? 'ما خرج من الحساب' : 'Outflow'}
                                    value={data?.total_credit || 0}
                                    currency={currency || data?.currency || ''}
                                    useArabicNumerals={useArabicNumerals}
                                    colorClass="text-red-600"
                                />
                                {(() => {
                                    const balance = data?.current_balance || data?.balance || 0;
                                    const isPositive = balance > 0;
                                    const isZero = Math.abs(balance) < 0.01;
                                    const balanceHint = isZero
                                        ? (language === 'ar' ? 'مُصفّى' : 'Settled')
                                        : isPositive
                                            ? (language === 'ar' ? '💰 لنا (مدين)' : '💰 Receivable')
                                            : (language === 'ar' ? '📤 علينا (دائن)' : '📤 Payable');
                                    return (
                                        <BalanceItem
                                            label={t('accounting.account.balance') || 'الرصيد'}
                                            subtitle={balanceHint}
                                            value={balance}
                                            currency={currency || data?.currency || ''}
                                            useArabicNumerals={useArabicNumerals}
                                            colorClass={isZero ? 'text-gray-500' : isPositive ? 'text-erp-navy' : 'text-red-600'}
                                            highlight
                                        />
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* ═══════ DELETE WARNING ═══════ */}
            {
                isEditable && !isCreate && (data?.transaction_count > 0 || data?.total_debit > 0 || data?.total_credit > 0) && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            {language === 'ar'
                                ? '⚠️ هذا الحساب عليه حركات محاسبية — لا يمكن حذفه. يمكنك تعديل بياناته الأساسية فقط.'
                                : '⚠️ This account has transactions — it cannot be deleted. You can only edit its basic data.'}
                        </p>
                    </div>
                )
            }
        </div >
    );
}

// ═══ Info Row Component ═══
interface InfoRowProps {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}

function InfoRow({ label, value, mono }: InfoRowProps) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={cn('text-sm text-gray-900 dark:text-white', mono && 'font-mono')}>
                {value}
            </span>
        </div>
    );
}

// ═══ Balance Item Component ═══
interface BalanceItemProps {
    label: string;
    subtitle?: string;
    value: number;
    currency: string;
    useArabicNumerals: boolean;
    colorClass?: string;
    highlight?: boolean;
}

function BalanceItem({
    label,
    subtitle,
    value,
    currency,
    useArabicNumerals,
    colorClass,
    highlight,
}: BalanceItemProps) {
    return (
        <div className={cn(
            'p-3 rounded-lg text-center',
            highlight ? 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700' : 'bg-gray-50/50 dark:bg-gray-800/50'
        )}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={cn('font-bold font-mono text-lg', colorClass || 'text-gray-800 dark:text-white')}>
                {formatCurrency(value, currency, useArabicNumerals, false)}
            </p>
            {subtitle && (
                <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
            )}
        </div>
    );
}

export default OverviewTab;
