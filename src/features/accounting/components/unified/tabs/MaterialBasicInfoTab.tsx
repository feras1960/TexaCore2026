/**
 * ════════════════════════════════════════════════════════════════
 * 📝 Material Basic Info Tab
 * تبويب المعلومات الأساسية للمادة (خاص بوضع الإضافة)
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
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
import {
    Package,
    Hash,
    Globe,
    FolderTree,
    Barcode,
    Info
} from 'lucide-react';
import type { SheetMode } from '../types';
import { TranslateButton } from '@/components/ui/translate-button';

interface MaterialBasicInfoTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
    groups?: { id: string; name_ar: string; name_en: string; code: string }[];
}

export function MaterialBasicInfoTab({ data, mode, onChange, groups = [] }: MaterialBasicInfoTabProps) {
    const { language } = useLanguage();
    const { companyId, user } = useAuth();
    const isReadOnly = mode === 'view';
    const [loadedGroups, setLoadedGroups] = useState<any[]>(groups);

    // Load groups from API if not provided
    useEffect(() => {
        if (groups.length > 0) {
            setLoadedGroups(groups);
            return;
        }
        const fetchGroups = async () => {
            try {
                const tenantId = user?.user_metadata?.tenant_id;
                const result = await warehouseService.getGroups(companyId || '', tenantId);
                if (result.length > 0) {
                    setLoadedGroups(result);
                }
            } catch (err) {
                console.error('Error loading groups in BasicInfoTab:', err);
            }
        };
        fetchGroups();
    }, [companyId, groups, user]);

    // Use loaded groups or fallback mock
    const availableGroups = loadedGroups.length > 0 ? loadedGroups : [
        { id: '1', name_ar: 'أقمشة قطنية', name_en: 'Cotton Fabrics', code: 'COT' },
        { id: '2', name_ar: 'أقمشة حريرية', name_en: 'Silk Fabrics', code: 'SLK' },
        { id: '3', name_ar: 'أقمشة صناعية', name_en: 'Synthetic Fabrics', code: 'SYN' },
        { id: '4', name_ar: 'أقمشة مخلوطة', name_en: 'Blended Fabrics', code: 'BLD' },
        { id: '5', name_ar: 'أقمشة صوفية', name_en: 'Wool Fabrics', code: 'WOL' },
    ];

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    // Use official supported languages from i18n config
    const supportedLanguages = SUPPORTED_LANGUAGES.map(l => ({
        code: l.code,
        label: l.nativeName,
        labelEn: l.name,
    }));

    return (
        <div className="space-y-6 pb-6">
            {/* Group & Code Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FolderTree className="w-5 h-5 text-erp-primary" />
                        {language === 'ar' ? 'المجموعة والكود' : 'Group & Code'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Group Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="group_id" className="text-sm font-medium">
                                {language === 'ar' ? 'المجموعة' : 'Group'} <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data?.group_id || ''}
                                onValueChange={(value) => handleChange('group_id', value)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={language === 'ar' ? 'اختر المجموعة...' : 'Select group...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            <span className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">{group.code}</Badge>
                                                {language === 'ar' ? group.name_ar : group.name_en}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Auto-generated Code */}
                        <div className="space-y-2">
                            <Label htmlFor="code" className="text-sm font-medium">
                                {language === 'ar' ? 'الكود التسلسلي' : 'Sequential Code'}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="code"
                                    value={data?.code || ''}
                                    onChange={(e) => handleChange('code', e.target.value)}
                                    placeholder={language === 'ar' ? 'يتم توليده تلقائياً' : 'Auto-generated'}
                                    disabled={mode === 'create'} // Auto-generated in create mode
                                    readOnly={isReadOnly}
                                    className="font-mono"
                                />
                                {mode === 'create' && (
                                    <Badge variant="secondary" className="shrink-0">
                                        <Hash className="w-3 h-3 me-1" />
                                        {language === 'ar' ? 'تلقائي' : 'Auto'}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                {language === 'ar'
                                    ? 'سيتم توليد الكود تلقائياً بناءً على المجموعة المختارة'
                                    : 'Code will be auto-generated based on selected group'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Primary Name Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-erp-primary" />
                        {language === 'ar' ? 'اسم المادة' : 'Material Name'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Arabic Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name_ar" className="text-sm font-medium">
                                {language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name_ar"
                                value={data?.name_ar || ''}
                                onChange={(e) => handleChange('name_ar', e.target.value)}
                                placeholder={language === 'ar' ? 'مثال: قماش قطني ناعم' : 'E.g., Soft Cotton Fabric'}
                                disabled={isReadOnly}
                                dir="rtl"
                            />
                        </div>

                        {/* English Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name_en" className="text-sm font-medium">
                                {language === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}
                            </Label>
                            <Input
                                id="name_en"
                                value={data?.name_en || ''}
                                onChange={(e) => handleChange('name_en', e.target.value)}
                                placeholder="E.g., Soft Cotton Fabric"
                                disabled={isReadOnly}
                                dir="ltr"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Supplier & Internal Codes */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Barcode className="w-5 h-5 text-erp-primary" />
                        {language === 'ar' ? 'الأكواد الإضافية' : 'Additional Codes'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Supplier Code */}
                        <div className="space-y-2">
                            <Label htmlFor="supplier_code" className="text-sm font-medium">
                                {language === 'ar' ? 'كود المورد' : 'Supplier Code'}
                            </Label>
                            <Input
                                id="supplier_code"
                                value={data?.supplier_code || ''}
                                onChange={(e) => handleChange('supplier_code', e.target.value)}
                                placeholder={language === 'ar' ? 'كود المادة لدى المورد' : "Supplier's product code"}
                                disabled={isReadOnly}
                                className="font-mono"
                            />
                        </div>

                        {/* Internal Code */}
                        <div className="space-y-2">
                            <Label htmlFor="internal_code" className="text-sm font-medium">
                                {language === 'ar' ? 'الكود الداخلي' : 'Internal Code'}
                            </Label>
                            <Input
                                id="internal_code"
                                value={data?.internal_code || ''}
                                onChange={(e) => handleChange('internal_code', e.target.value)}
                                placeholder={language === 'ar' ? 'كود مخصص للاستخدام الداخلي' : 'Custom internal code'}
                                disabled={isReadOnly}
                                className="font-mono"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Multi-language Names — Manual + AI */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Globe className="w-5 h-5 text-erp-primary" />
                                {language === 'ar' ? 'الأسماء باللغات الأخرى' : 'Names in Other Languages'}
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                {language === 'ar'
                                    ? 'أدخل الترجمات يدوياً أو استخدم وكيل نيكسا AI للترجمة التلقائية'
                                    : 'Enter translations manually or use NexaAI Agent for auto-translation'}
                            </p>
                        </div>
                        {!isReadOnly && (
                            <TranslateButton
                                sourceText={data?.name_ar || data?.name_en || ''}
                                sourceLanguage={(data?.name_ar ? 'ar' : 'en') as any}
                                context="product_name"
                                onTranslated={(translations) => {
                                    if (onChange) {
                                        const updates: any = {};
                                        for (const [lang, text] of Object.entries(translations)) {
                                            updates[`name_${lang}`] = text;
                                        }
                                        onChange(updates);
                                    }
                                }}
                                size="sm"
                            />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {supportedLanguages.filter(l => l.code !== 'ar' && l.code !== 'en').map((lang) => (
                        <div key={lang.code} className="flex items-center gap-3">
                            <div className="w-28 shrink-0">
                                <Badge variant="outline" className="w-full justify-center">
                                    {lang.label}
                                </Badge>
                            </div>
                            <Input
                                value={data?.[`name_${lang.code}`] || ''}
                                onChange={(e) => handleChange(`name_${lang.code}`, e.target.value)}
                                placeholder={`${language === 'ar' ? 'الاسم بـ' : 'Name in '}${lang.labelEn}`}
                                disabled={isReadOnly}
                                className="flex-1"
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
