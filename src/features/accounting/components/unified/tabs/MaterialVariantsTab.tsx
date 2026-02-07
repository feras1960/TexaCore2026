/**
 * ════════════════════════════════════════════════════════════════
 * 🎨 Material Variants Tab
 * تبويب المتغيرات للمادة
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Layers, Palette, Image as ImageIcon, Info } from 'lucide-react';
import type { SheetMode } from '../types';

interface MaterialVariantsTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
}

export function MaterialVariantsTab({ data, mode, onChange }: MaterialVariantsTabProps) {
    const { t, language } = useLanguage();
    const isReadOnly = mode === 'view';

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {language === 'ar' ? 'ما هي المتغيرات؟' : 'What are Variants?'}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {language === 'ar'
                                ? 'المتغيرات تسمح لك بإنشاء عدة مواد مرتبطة بنفس المنتج الأساسي ولكن بخصائص مختلفة مثل الألوان، الرسمات، أو الأحجام. كل متغير سيكون له كود فريد ومخزون منفصل.'
                                : 'Variants allow you to create multiple materials linked to the same base product but with different properties like colors, patterns, or sizes. Each variant will have a unique code and separate inventory.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Color Variants */}
            <Card className="border-2 border-dashed border-erp-teal/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Palette className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'متغيرات الألوان' : 'Color Variants'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {language === 'ar'
                            ? 'إنشاء عدة مواد بألوان مختلفة دفعة واحدة. سيتم إنشاء مادة منفصلة لكل لون مع كود فريد.'
                            : 'Create multiple materials with different colors at once. A separate material will be created for each color with a unique code.'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Enable Color Variants */}
                    <div className="flex items-center justify-between p-3 bg-erp-teal/5 rounded-lg">
                        <div>
                            <Label htmlFor="has_color_variants" className="text-base font-medium">
                                {language === 'ar' ? 'تفعيل متغيرات الألوان' : 'Enable Color Variants'}
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {language === 'ar'
                                    ? 'إنشاء مواد متعددة بألوان مختلفة'
                                    : 'Create multiple materials with different colors'}
                            </p>
                        </div>
                        <Switch
                            id="has_color_variants"
                            checked={data?.has_variants || false}
                            onCheckedChange={(checked) => handleChange('has_variants', checked)}
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* Color Selection - Only in Create Mode */}
                    {mode === 'create' && data?.has_variants && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">
                                {language === 'ar' ? 'اختر الألوان:' : 'Select Colors:'}
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    'أحمر/Red', 'أزرق/Blue', 'أخضر/Green', 'أصفر/Yellow',
                                    'أسود/Black', 'أبيض/White', 'رمادي/Gray', 'بني/Brown',
                                    'وردي/Pink', 'برتقالي/Orange', 'بنفسجي/Purple', 'بيج/Beige',
                                    'ذهبي/Gold', 'فضي/Silver', 'نيلي/Navy', 'فيروزي/Turquoise'
                                ].map((color) => {
                                    const [ar, en] = color.split('/');
                                    const colorValue = language === 'ar' ? ar : en;
                                    const isSelected = (data?.variant_colors || []).includes(colorValue);
                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => {
                                                const currentColors = data?.variant_colors || [];
                                                const newColors = isSelected
                                                    ? currentColors.filter((c: string) => c !== colorValue)
                                                    : [...currentColors, colorValue];
                                                handleChange('variant_colors', newColors);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                                                ? 'bg-erp-teal text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-erp-teal'
                                                }`}
                                        >
                                            {colorValue}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Selected Colors Summary */}
                            {(data?.variant_colors || []).length > 0 && (
                                <div className="p-3 bg-erp-teal/10 border border-erp-teal/30 rounded-lg space-y-2">
                                    <p className="text-sm font-medium text-erp-teal">
                                        {language === 'ar' ? 'الألوان المختارة:' : 'Selected Colors:'}
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {(data?.variant_colors || []).join(', ')}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {language === 'ar'
                                            ? `سيتم إنشاء ${(data?.variant_colors || []).length} مادة (واحدة لكل لون)`
                                            : `${(data?.variant_colors || []).length} materials will be created (one for each color)`}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-erp-teal/20">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {language === 'ar' ? 'مثال على الأكواد:' : 'Example codes:'}
                                        </p>
                                        <div className="mt-1 space-y-1">
                                            {(data?.variant_colors || []).slice(0, 3).map((color: string, idx: number) => (
                                                <p key={idx} className="text-xs font-mono text-gray-600 dark:text-gray-400">
                                                    {data?.code || 'FAB-0001'}-{color.substring(0, 3).toUpperCase()}
                                                </p>
                                            ))}
                                            {(data?.variant_colors || []).length > 3 && (
                                                <p className="text-xs text-gray-500">
                                                    ... {language === 'ar' ? 'والمزيد' : 'and more'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View Mode - Show existing variants */}
                    {mode === 'view' && data?.has_variants && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {language === 'ar' ? 'المتغيرات الموجودة:' : 'Existing Variants:'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                {language === 'ar'
                                    ? 'يمكنك عرض وإدارة المتغيرات من صفحة المواد الرئيسية.'
                                    : 'You can view and manage variants from the main materials page.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pattern/Design Variants */}
            <Card className="border-2 border-pink-200 dark:border-pink-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ImageIcon className="w-5 h-5 text-pink-600" />
                        {language === 'ar' ? 'متغيرات الرسمات والتصاميم' : 'Pattern & Design Variants'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {language === 'ar'
                            ? 'إدارة الرسمات والتصاميم المختلفة لنفس المادة. كل رسمة يمكن أن يكون لها ألوان متعددة وصور خاصة بها.'
                            : 'Manage different patterns and designs for the same material. Each pattern can have multiple colors and its own images.'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Has Patterns */}
                    <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <div>
                            <Label htmlFor="has_patterns" className="text-base font-medium">
                                {language === 'ar' ? 'يحتوي على رسمات' : 'Has Patterns'}
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {language === 'ar'
                                    ? 'تفعيل إدارة الرسمات والتصاميم المختلفة'
                                    : 'Enable pattern and design management'}
                            </p>
                        </div>
                        <Switch
                            id="has_patterns"
                            checked={data?.has_patterns || false}
                            onCheckedChange={(checked) => handleChange('has_patterns', checked)}
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* Pattern Details */}
                    {data?.has_patterns && (
                        <div className="space-y-3 p-3 border border-pink-200 dark:border-pink-800 rounded-lg">
                            <p className="text-sm font-medium text-pink-700 dark:text-pink-400">
                                {language === 'ar' ? 'إدارة الرسمات:' : 'Pattern Management:'}
                            </p>
                            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                <p className="flex items-start gap-2">
                                    <span className="text-pink-600 mt-0.5">•</span>
                                    {language === 'ar'
                                        ? 'يمكنك إضافة رسمات مختلفة بعد حفظ المادة'
                                        : 'You can add different patterns after saving the material'}
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="text-pink-600 mt-0.5">•</span>
                                    {language === 'ar'
                                        ? 'كل رسمة يمكن أن يكون لها صورة خاصة بها'
                                        : 'Each pattern can have its own image'}
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="text-pink-600 mt-0.5">•</span>
                                    {language === 'ar'
                                        ? 'يمكن تحديد ألوان متعددة لكل رسمة'
                                        : 'Multiple colors can be specified for each pattern'}
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="text-pink-600 mt-0.5">•</span>
                                    {language === 'ar'
                                        ? 'كل مجموعة (رسمة + لون) ستكون مادة منفصلة'
                                        : 'Each combination (pattern + color) will be a separate material'}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Size Variants (Future Feature) */}
            <Card className="border-2 border-gray-200 dark:border-gray-700 opacity-60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers className="w-5 h-5 text-gray-600" />
                        {language === 'ar' ? 'متغيرات الأحجام' : 'Size Variants'}
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                        </span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {language === 'ar'
                            ? 'إدارة متغيرات الأحجام المختلفة (صغير، متوسط، كبير، إلخ)'
                            : 'Manage different size variants (Small, Medium, Large, etc.)'}
                    </p>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'ar'
                            ? 'هذه الميزة ستكون متاحة قريباً...'
                            : 'This feature will be available soon...'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
