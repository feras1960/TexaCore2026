/**
 * ════════════════════════════════════════════════════════════════
 * 📐 Material Specifications Tab
 * تبويب المواصفات الفنية للمادة
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
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
import {
    FlaskConical,
    Ruler,
    Scale,
    Percent,
    Box,
} from 'lucide-react';
import type { SheetMode } from '../types';

interface MaterialSpecsTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
}

export function MaterialSpecsTab({ data, mode, onChange }: MaterialSpecsTabProps) {
    const { language } = useLanguage();
    const isReadOnly = mode === 'view';

    // ═══ Lock Unit of Measure if material has stock movements ═══
    const hasMovements = Boolean(
        data?.rolls_count > 0 ||
        data?.current_stock > 0 ||
        data?.rolls_total_length > 0
    );

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    // Unit options
    const unitOptions = [
        { value: 'meter', labelAr: 'متر', labelEn: 'Meter' },
        { value: 'cm', labelAr: 'سنتيمتر', labelEn: 'Centimeter' },
        { value: 'yard', labelAr: 'ياردة', labelEn: 'Yard' },
        { value: 'kg', labelAr: 'كيلوجرام', labelEn: 'Kilogram' },
        { value: 'gram', labelAr: 'جرام', labelEn: 'Gram' },
        { value: 'piece', labelAr: 'قطعة', labelEn: 'Piece' },
        { value: 'roll', labelAr: 'رولون', labelEn: 'Roll' },
    ];

    // Category options
    const categoryOptions = [
        { value: 'cotton', labelAr: 'قطن', labelEn: 'Cotton' },
        { value: 'silk', labelAr: 'حرير', labelEn: 'Silk' },
        { value: 'wool', labelAr: 'صوف', labelEn: 'Wool' },
        { value: 'linen', labelAr: 'كتان', labelEn: 'Linen' },
        { value: 'polyester', labelAr: 'بوليستر', labelEn: 'Polyester' },
        { value: 'nylon', labelAr: 'نايلون', labelEn: 'Nylon' },
        { value: 'mixed', labelAr: 'مخلوط', labelEn: 'Mixed' },
        { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
    ];

    return (
        <div className="space-y-6 pb-6">
            {/* Composition & Category */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FlaskConical className="w-5 h-5 text-purple-600" />
                        {language === 'ar' ? 'التركيب والتصنيف' : 'Composition & Category'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-sm font-medium">
                                {language === 'ar' ? 'التصنيف' : 'Category'}
                            </Label>
                            <Select
                                value={data?.category || 'mixed'}
                                onValueChange={(value) => handleChange('category', value)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {language === 'ar' ? cat.labelAr : cat.labelEn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Unit */}
                        <div className="space-y-2">
                            <Label htmlFor="unit" className="text-sm font-medium">
                                {language === 'ar' ? 'وحدة القياس' : 'Unit of Measure'} <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data?.unit || 'meter'}
                                onValueChange={(value) => handleChange('unit', value)}
                                disabled={isReadOnly || hasMovements}
                            >
                                <SelectTrigger className={hasMovements && !isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {unitOptions.map((unit) => (
                                        <SelectItem key={unit.value} value={unit.value}>
                                            {language === 'ar' ? unit.labelAr : unit.labelEn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {hasMovements && !isReadOnly && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    🔒 {language === 'ar'
                                        ? 'لا يمكن تغيير وحدة القياس الأساسية بعد وجود حركات مخزنية على المادة'
                                        : 'Base unit cannot be changed after stock movements exist'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Composition */}
                    <div className="space-y-2">
                        <Label htmlFor="composition" className="text-sm font-medium">
                            {language === 'ar' ? 'التركيب' : 'Composition'}
                        </Label>
                        <Textarea
                            id="composition"
                            value={data?.composition || ''}
                            onChange={(e) => handleChange('composition', e.target.value)}
                            placeholder={language === 'ar'
                                ? 'مثال: 60% قطن، 40% بوليستر'
                                : 'E.g., 60% Cotton, 40% Polyester'}
                            disabled={isReadOnly}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Physical Specifications */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Ruler className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'المواصفات الفيزيائية' : 'Physical Specifications'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Weight */}
                        <div className="space-y-2">
                            <Label htmlFor="weight_per_meter" className="text-sm font-medium">
                                {language === 'ar' ? 'الوزن (جم/م²)' : 'Weight (g/m²)'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="weight_per_meter"
                                    type="number"
                                    step="0.01"
                                    value={data?.weight_per_meter || ''}
                                    onChange={(e) => handleChange('weight_per_meter', parseFloat(e.target.value) || null)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="pe-12"
                                />
                                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    g/m²
                                </span>
                            </div>
                        </div>

                        {/* Width */}
                        <div className="space-y-2">
                            <Label htmlFor="default_width" className="text-sm font-medium">
                                {language === 'ar' ? 'عرض الرولون (سم)' : 'Roll Width (cm)'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="default_width"
                                    type="number"
                                    step="0.5"
                                    value={data?.default_width || ''}
                                    onChange={(e) => handleChange('default_width', parseFloat(e.target.value) || null)}
                                    placeholder="150"
                                    disabled={isReadOnly}
                                    className="pe-12"
                                />
                                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    cm
                                </span>
                            </div>
                        </div>

                        {/* Shrinkage */}
                        <div className="space-y-2">
                            <Label htmlFor="shrinkage_percent" className="text-sm font-medium">
                                {language === 'ar' ? 'نسبة الانكماش' : 'Shrinkage Rate'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="shrinkage_percent"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={data?.shrinkage_percent || ''}
                                    onChange={(e) => handleChange('shrinkage_percent', parseFloat(e.target.value) || null)}
                                    placeholder="0.0"
                                    disabled={isReadOnly}
                                    className="pe-8"
                                />
                                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Thread Count */}
                    <div className="space-y-2">
                        <Label htmlFor="thread_count" className="text-sm font-medium">
                            {language === 'ar' ? 'عدد الخيوط' : 'Thread Count'}
                        </Label>
                        <Input
                            id="thread_count"
                            type="number"
                            value={data?.thread_count || ''}
                            onChange={(e) => handleChange('thread_count', parseInt(e.target.value) || null)}
                            placeholder={language === 'ar' ? 'عدد الخيوط لكل بوصة مربعة' : 'Threads per square inch'}
                            disabled={isReadOnly}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
