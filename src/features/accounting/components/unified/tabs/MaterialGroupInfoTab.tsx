/**
 * ════════════════════════════════════════════════════════════════
 * 📁 Material Group Info Tab - تبويب معلومات مجموعة المواد
 * يعرض/يعدّل بيانات مجموعة المواد ضمن الـ UnifiedAccountingSheet
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    FolderTree,
    Hash,
    Globe,
    Tag,
    MessageSquare,
    Smile,
} from 'lucide-react';
import type { SheetMode } from '../types';

// ═══════════════════════════════════════════════════════════════
// أنواع المواد المدعومة
// ═══════════════════════════════════════════════════════════════
const MATERIAL_CATEGORIES = [
    { value: 'fabric', labelAr: 'أقمشة', labelEn: 'Fabrics', emoji: '🧵' },
    { value: 'garment', labelAr: 'ملابس جاهزة', labelEn: 'Garments', emoji: '👔' },
    { value: 'automotive', labelAr: 'سيارات', labelEn: 'Automotive', emoji: '🚗' },
    { value: 'spare_parts', labelAr: 'قطع تبديل', labelEn: 'Spare Parts', emoji: '🔧' },
    { value: 'electronics', labelAr: 'إلكترونيات', labelEn: 'Electronics', emoji: '💻' },
    { value: 'food', labelAr: 'مواد غذائية', labelEn: 'Food & Beverages', emoji: '🍽️' },
    { value: 'construction', labelAr: 'مواد بناء', labelEn: 'Construction', emoji: '🏗️' },
    { value: 'jewelry', labelAr: 'ذهب ومجوهرات', labelEn: 'Jewelry', emoji: '💎' },
    { value: 'cosmetics', labelAr: 'مستحضرات تجميل', labelEn: 'Cosmetics', emoji: '💄' },
    { value: 'general', labelAr: 'بضائع عامة', labelEn: 'General Goods', emoji: '📦' },
    { value: 'raw_materials', labelAr: 'مواد خام', labelEn: 'Raw Materials', emoji: '🪨' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', emoji: '📋' },
];

// أيقونات المجموعة
const GROUP_ICONS = [
    { value: '📁', label: 'مجلد' },
    { value: '📂', label: 'مجلد مفتوح' },
    { value: '🏷️', label: 'بطاقة' },
    { value: '📦', label: 'صندوق' },
    { value: '🗂️', label: 'فهرس' },
    { value: '🧵', label: 'خيط' },
    { value: '🔧', label: 'مفتاح' },
    { value: '⚙️', label: 'ترس' },
    { value: '🏪', label: 'متجر' },
    { value: '🏭', label: 'مصنع' },
    { value: '🌿', label: 'طبيعي' },
    { value: '✨', label: 'فاخر' },
];

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════
interface MaterialGroupInfoTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
}

export function MaterialGroupInfoTab({ data, mode, onChange }: MaterialGroupInfoTabProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, user } = useAuth();
    const isReadOnly = mode === 'view';

    // Existing groups for parent selection
    const [existingGroups, setExistingGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Load groups on mount
    useEffect(() => {
        loadGroups();
    }, [companyId]);

    const loadGroups = async () => {
        setLoadingGroups(true);
        try {
            const tenantId = user?.user_metadata?.tenant_id;
            const groups = await warehouseService.getGroups(companyId || '', tenantId);
            // Filter out self if editing
            setExistingGroups(
                data?.id ? groups.filter((g: any) => g.id !== data.id) : groups
            );
        } catch (err) {
            console.error('Error loading groups:', err);
        } finally {
            setLoadingGroups(false);
        }
    };

    // Languages config - dynamic based on user's current language
    const userLangConfig = useMemo(() =>
        SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0],
        [language]);

    // Name field for user's language (dynamic label)
    const userLangFieldKey = `name_${language}`;
    const userLangLabel = language === 'ar'
        ? `الاسم (${userLangConfig.nativeName})`
        : `Name (${userLangConfig.nativeName})`;

    // English is always separate unless it's the user's language
    const showEnglishSeparately = language !== 'en';

    // Other languages for the translations table
    const translationLanguages = useMemo(() =>
        SUPPORTED_LANGUAGES.filter(l => {
            // Exclude user's current language (shown above)
            if (l.code === language) return false;
            // Exclude English if shown separately
            if (l.code === 'en' && showEnglishSeparately) return false;
            return true;
        }),
        [language, showEnglishSeparately]);

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    // Get/set translation value - stored directly as name_xx columns
    const getTranslation = (langCode: string): string => {
        return data?.[`name_${langCode}`] || '';
    };

    const setTranslation = (langCode: string, value: string) => {
        // Store directly as name_xx field (matches DB column)
        handleChange(`name_${langCode}`, value);
    };

    // Auto-generate code based on parent
    const parentGroup = existingGroups.find(g => g.id === data?.parent_id);

    return (
        <div className="space-y-4 p-1">
            {/* ══════════════════════════════════════ */}
            {/* المجموعة الأم + الكود */}
            {/* ══════════════════════════════════════ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FolderTree className="w-4 h-4 text-indigo-600" />
                        {language === 'ar' ? 'التصنيف' : 'Classification'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* المجموعة الأم */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {language === 'ar' ? 'المجموعة الأم' : 'Parent Group'}
                        </Label>
                        <Select
                            value={data?.parent_id || 'root'}
                            onValueChange={(value) => handleChange('parent_id', value === 'root' ? null : value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    language === 'ar' ? '— مجموعة رئيسية (بدون أم) —' : '— Root Group (no parent) —'
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="root">
                                    {language === 'ar' ? '— مجموعة رئيسية —' : '— Root Group —'}
                                </SelectItem>
                                {existingGroups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                        <span className="flex items-center gap-2">
                                            <span>{group.icon || '📁'}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {group.code}
                                            </Badge>
                                            {language === 'ar' ? group.name_ar : (group.name_en || group.name_ar)}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {data?.parent_id && parentGroup && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                {language === 'ar'
                                    ? `✓ مجموعة فرعية ضمن: ${parentGroup.name_ar}`
                                    : `✓ Sub-group of: ${parentGroup.name_en || parentGroup.name_ar}`}
                            </p>
                        )}
                    </div>

                    {/* الكود */}
                    <div className="space-y-2">
                        <Label htmlFor="group_code" className="text-sm font-medium flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5 text-gray-500" />
                            {language === 'ar' ? 'كود المجموعة' : 'Group Code'}
                        </Label>
                        <Input
                            id="group_code"
                            value={data?.code || ''}
                            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                            placeholder={
                                parentGroup
                                    ? `${parentGroup.code}-XXX`
                                    : (language === 'ar' ? 'مثال: FAB (اختياري - تلقائي)' : 'E.g., FAB (optional - auto)')
                            }
                            disabled={isReadOnly}
                            className="font-mono"
                            dir="ltr"
                        />
                        <p className="text-xs text-gray-500">
                            {language === 'ar'
                                ? 'اتركه فارغاً ليتم توليده تلقائياً'
                                : 'Leave empty for auto-generation'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════ */}
            {/* الاسم الأساسي */}
            {/* ══════════════════════════════════════ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        {language === 'ar' ? 'اسم المجموعة' : 'Group Name'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* الاسم بلغة المستخدم */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {userLangLabel}
                            <span className="text-red-500 ms-1">*</span>
                        </Label>
                        <Input
                            value={data?.[userLangFieldKey] || ''}
                            onChange={(e) => handleChange(userLangFieldKey, e.target.value)}
                            placeholder={language === 'ar' ? 'مثال: أقمشة قطنية' : 'E.g., Cotton Fabrics'}
                            disabled={isReadOnly}
                            dir={userLangConfig.direction}
                        />
                    </div>

                    {/* الاسم بالإنجليزية - يظهر فقط إذا لغة المستخدم ليست إنجليزية */}
                    {showEnglishSeparately && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                {language === 'ar' ? 'الاسم (English)' : 'Name (English)'}
                            </Label>
                            <Input
                                value={data?.name_en || ''}
                                onChange={(e) => handleChange('name_en', e.target.value)}
                                placeholder="E.g., Cotton Fabrics"
                                disabled={isReadOnly}
                                dir="ltr"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════ */}
            {/* الترجمات */}
            {/* ══════════════════════════════════════ */}
            {translationLanguages.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Globe className="w-4 h-4 text-indigo-600" />
                            {language === 'ar' ? 'الاسم باللغات الأخرى' : 'Name in Other Languages'}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                            {language === 'ar'
                                ? 'أضف ترجمات اسم المجموعة للغات المختلفة'
                                : 'Add group name translations for different languages'}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-3 py-2 text-start font-medium text-gray-600 dark:text-gray-400 w-32">
                                            {language === 'ar' ? 'اللغة' : 'Language'}
                                        </th>
                                        <th className="px-3 py-2 text-start font-medium text-gray-600 dark:text-gray-400">
                                            {language === 'ar' ? 'الاسم المترجم' : 'Translated Name'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {translationLanguages.map((lang) => (
                                        <tr key={lang.code}
                                            className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                        >
                                            <td className="px-3 py-2">
                                                <Badge variant="outline" className="text-xs font-medium">
                                                    <span className="me-1.5">{lang.flag}</span>
                                                    {lang.nativeName}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <Input
                                                    value={getTranslation(lang.code)}
                                                    onChange={(e) => setTranslation(lang.code, e.target.value)}
                                                    placeholder={`${language === 'ar' ? 'الاسم بـ' : 'Name in '}${lang.name}`}
                                                    disabled={isReadOnly}
                                                    className="border-0 bg-transparent h-8 text-sm focus-visible:ring-1"
                                                    dir={lang.direction}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ══════════════════════════════════════ */}
            {/* نوع المواد + الأيقونة */}
            {/* ══════════════════════════════════════ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        {language === 'ar' ? 'تفاصيل إضافية' : 'Additional Details'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* نوع المواد */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {language === 'ar' ? 'نوع المواد بداخل المجموعة' : 'Type of Materials'}
                        </Label>
                        <Select
                            value={data?.category || 'fabric'}
                            onValueChange={(value) => handleChange('category', value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MATERIAL_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <span className="flex items-center gap-2">
                                            <span>{cat.emoji}</span>
                                            {language === 'ar' ? cat.labelAr : cat.labelEn}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* الأيقونة */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Smile className="w-3.5 h-3.5 text-gray-500" />
                            {language === 'ar' ? 'الأيقونة' : 'Icon'}
                        </Label>
                        <Select
                            value={data?.icon || '📁'}
                            onValueChange={(value) => handleChange('icon', value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger>
                                <SelectValue>
                                    <span className="flex items-center gap-2">
                                        <span className="text-lg">{data?.icon || '📁'}</span>
                                        {language === 'ar' ? 'أيقونة المجموعة' : 'Group Icon'}
                                    </span>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {GROUP_ICONS.map((icon) => (
                                    <SelectItem key={icon.value} value={icon.value}>
                                        <span className="flex items-center gap-2">
                                            <span className="text-lg">{icon.value}</span>
                                            {icon.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════ */}
            {/* ملاحظات */}
            {/* ══════════════════════════════════════ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        {language === 'ar' ? 'ملاحظات' : 'Notes'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={data?.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder={language === 'ar'
                            ? 'ملاحظات إضافية عن المجموعة...'
                            : 'Additional notes about the group...'}
                        disabled={isReadOnly}
                        rows={3}
                        className="resize-none"
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default MaterialGroupInfoTab;
