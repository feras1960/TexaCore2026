/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Material Overview Tab - Enhanced
 * تبويب نظرة عامة للمادة - محسّن
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Layers, Tag, FileText, Ruler, Weight, Palette } from 'lucide-react';
import type { SheetMode } from '../types';

interface MaterialOverviewTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
    groups?: any[];
}

export function MaterialOverviewTab({ data, mode, onChange, groups = [] }: MaterialOverviewTabProps) {
    const { t, language, isRTL } = useLanguage();
    const isReadOnly = mode === 'view';

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Basic Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Group Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="group_id" className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                {language === 'ar' ? 'المجموعة' : 'Group'} <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data?.group_id || data?.category_id || ''}
                                onValueChange={(value) => {
                                    handleChange('group_id', value);
                                    handleChange('category_id', value); // Save both for compatibility

                                    if (mode === 'create' && !data?.code) {
                                        const group = groups.find(g => g.id === value);
                                        const prefix = group?.code || 'MAT';
                                        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                                        handleChange('code', `${prefix}-${randomNum}`);
                                    }
                                }}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger id="group_id">
                                    <SelectValue placeholder={language === 'ar' ? 'اختر المجموعة' : 'Select Group'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.length > 0 ? (
                                        groups.map((group) => (
                                            <SelectItem key={group.id} value={group.id}>
                                                <span className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">{group.code}</Badge>
                                                    {language === 'ar' ? group.name_ar : (group.name_en || group.name_ar)}
                                                </span>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-center text-sm text-gray-500">
                                            {language === 'ar' ? 'لا توجد مجموعات' : 'No groups available'}
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Code - Auto-generated */}
                        <div className="space-y-2">
                            <Label htmlFor="code" className="flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                {t('warehouse.material.code')}
                                <span className="text-xs text-gray-500">({language === 'ar' ? 'تلقائي' : 'Auto'})</span>
                            </Label>
                            <Input
                                id="code"
                                value={data?.code || ''}
                                onChange={(e) => handleChange('code', e.target.value)}
                                disabled={true}
                                placeholder={language === 'ar' ? 'FAB-0001' : 'FAB-0001'}
                                className="font-mono bg-gray-50 dark:bg-gray-800"
                            />
                        </div>
                    </div>

                    {/* Name Arabic */}
                    <div className="space-y-2">
                        <Label htmlFor="name_ar">
                            {language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
                            <span className="text-red-500 mr-1">*</span>
                        </Label>
                        <Input
                            id="name_ar"
                            value={data?.name_ar || ''}
                            onChange={(e) => handleChange('name_ar', e.target.value)}
                            disabled={isReadOnly}
                            placeholder={language === 'ar' ? 'قماش قطني' : 'Cotton Fabric'}
                            dir="rtl"
                        />
                    </div>

                    {/* Name English */}
                    <div className="space-y-2">
                        <Label htmlFor="name_en">
                            {language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
                        </Label>
                        <Input
                            id="name_en"
                            value={data?.name_en || ''}
                            onChange={(e) => handleChange('name_en', e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Cotton Fabric"
                            dir="ltr"
                        />
                    </div>

                    {/* Description/Composition */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {language === 'ar' ? 'التركيب / الوصف' : 'Composition / Description'}
                        </Label>
                        <Textarea
                            id="description"
                            value={data?.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            disabled={isReadOnly}
                            placeholder={language === 'ar' ? '100% قطن، نسيج عالي الجودة...' : '100% Cotton, high quality fabric...'}
                            rows={3}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    {/* Unit - Primary Units Only */}
                    <div className="space-y-2">
                        <Label htmlFor="unit" className="flex items-center gap-2">
                            <Ruler className="w-4 h-4" />
                            {language === 'ar' ? 'الوحدة الأساسية' : 'Primary Unit'}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data?.unit_id || data?.unit || 'meter'}
                            onValueChange={(value) => handleChange('unit_id', value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger id="unit">
                                <SelectValue placeholder={language === 'ar' ? 'اختر الوحدة' : 'Select Unit'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="meter">{language === 'ar' ? 'متر' : 'Meter'}</SelectItem>
                                <SelectItem value="yard">{language === 'ar' ? 'ياردة' : 'Yard'}</SelectItem>
                                <SelectItem value="kg">{language === 'ar' ? 'كيلوغرام' : 'Kilogram'}</SelectItem>
                                <SelectItem value="piece">{language === 'ar' ? 'قطعة' : 'Piece'}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            {language === 'ar'
                                ? 'الوحدة الأساسية للتعامل مع المادة. الرولون هو خيار للإحصاء فقط.'
                                : 'Primary unit for material handling. Roll is for counting only.'}
                        </p>
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                        <Label htmlFor="color" className="flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            {language === 'ar' ? 'اللون' : 'Color'}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="color"
                                value={data?.color || ''}
                                onChange={(e) => handleChange('color', e.target.value)}
                                disabled={isReadOnly}
                                placeholder={language === 'ar' ? 'أحمر، أزرق، أخضر...' : 'Red, Blue, Green...'}
                                className="flex-1"
                            />
                            <input
                                type="color"
                                value={data?.color_hex || '#000000'}
                                onChange={(e) => handleChange('color_hex', e.target.value)}
                                disabled={isReadOnly}
                                className="w-12 h-10 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Fabric Specifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Ruler className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'مواصفات القماش' : 'Fabric Specifications'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Default Width */}
                        <div className="space-y-2">
                            <Label htmlFor="default_width">
                                {language === 'ar' ? 'العرض الافتراضي (سم)' : 'Default Width (cm)'}
                            </Label>
                            <Input
                                id="default_width"
                                type="number"
                                value={data?.default_width || 150}
                                onChange={(e) => handleChange('default_width', parseFloat(e.target.value))}
                                disabled={isReadOnly}
                                placeholder="150"
                            />
                        </div>

                        {/* Weight per Meter */}
                        <div className="space-y-2">
                            <Label htmlFor="weight_per_meter" className="flex items-center gap-2">
                                <Weight className="w-4 h-4" />
                                {language === 'ar' ? 'الوزن الغرامي (جم/متر)' : 'Weight per Meter (g/m)'}
                            </Label>
                            <Input
                                id="weight_per_meter"
                                type="number"
                                step="0.01"
                                value={data?.weight_per_meter || ''}
                                onChange={(e) => handleChange('weight_per_meter', parseFloat(e.target.value))}
                                disabled={isReadOnly}
                                placeholder="250.50"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Roll Management */}
            <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-purple-600" />
                        {language === 'ar' ? 'إدارة الرولونات' : 'Roll Management'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Track by Rolls */}
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div>
                            <Label htmlFor="track_by_rolls" className="text-base font-medium">
                                {language === 'ar' ? 'الجرد بالرولون' : 'Track by Rolls'}
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {language === 'ar'
                                    ? 'تفعيل الجرد بالرولون وإنشاء كود مخصص لكل رولون'
                                    : 'Enable roll-based inventory with unique code per roll'}
                            </p>
                        </div>
                        <Switch
                            id="track_by_rolls"
                            checked={data?.track_by_rolls || false}
                            onCheckedChange={(checked) => handleChange('track_by_rolls', checked)}
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* Batch Tracking */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div>
                            <Label htmlFor="track_batches" className="text-base font-medium">
                                {language === 'ar' ? 'تتبع الدفعات' : 'Track Batches'}
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {language === 'ar'
                                    ? 'تتبع الدفعات ورقم اللون (Dye Lot)'
                                    : 'Track batches and dye lot numbers'}
                            </p>
                        </div>
                        <Switch
                            id="track_batches"
                            checked={data?.track_batches || false}
                            onCheckedChange={(checked) => handleChange('track_batches', checked)}
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* Roll Count Display */}
                    {mode === 'view' && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    {language === 'ar' ? 'عدد الرولونات الحالي:' : 'Current Roll Count:'}
                                </span>
                                <span className="text-lg font-bold text-purple-600">
                                    {data?.roll_count || 0}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stock Levels */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-orange-600" />
                        {language === 'ar' ? 'مستويات المخزون' : 'Stock Levels'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Min Stock */}
                        <div className="space-y-2">
                            <Label htmlFor="min_stock_level">
                                {language === 'ar' ? 'الحد الأدنى للمخزون' : 'Minimum Stock Level'}
                            </Label>
                            <Input
                                id="min_stock_level"
                                type="number"
                                step="0.01"
                                value={data?.min_stock_level || 0}
                                onChange={(e) => handleChange('min_stock_level', parseFloat(e.target.value))}
                                disabled={isReadOnly}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Reorder Point */}
                        <div className="space-y-2">
                            <Label htmlFor="max_stock_level">
                                {language === 'ar' ? 'نقطة إعادة الطلب' : 'Reorder Point'}
                            </Label>
                            <Input
                                id="max_stock_level"
                                type="number"
                                step="0.01"
                                value={data?.max_stock_level || 0}
                                onChange={(e) => handleChange('max_stock_level', parseFloat(e.target.value))}
                                disabled={isReadOnly}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Tag className="w-5 h-5 text-gray-600" />
                        {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SKU */}
                        <div className="space-y-2">
                            <Label htmlFor="sku">
                                {language === 'ar' ? 'رمز SKU' : 'SKU Code'}
                            </Label>
                            <Input
                                id="sku"
                                value={data?.sku || ''}
                                onChange={(e) => handleChange('sku', e.target.value)}
                                disabled={isReadOnly}
                                placeholder="SKU-001"
                            />
                        </div>

                        {/* Barcode */}
                        <div className="space-y-2">
                            <Label htmlFor="barcode">
                                {language === 'ar' ? 'الباركود' : 'Barcode'}
                            </Label>
                            <Input
                                id="barcode"
                                value={data?.barcode || ''}
                                onChange={(e) => handleChange('barcode', e.target.value)}
                                disabled={isReadOnly}
                                placeholder="1234567890123"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">
                            {language === 'ar' ? 'ملاحظات' : 'Notes'}
                        </Label>
                        <Textarea
                            id="notes"
                            value={data?.notes || ''}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            disabled={isReadOnly}
                            placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-green-600" />
                        {language === 'ar' ? 'الحالة' : 'Status'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="is_active" className="text-base font-medium">
                                {language === 'ar' ? 'نشط' : 'Active'}
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {language === 'ar'
                                    ? 'تفعيل أو تعطيل المادة'
                                    : 'Enable or disable this material'}
                            </p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={data?.is_active ?? true}
                            onCheckedChange={(checked) => handleChange('is_active', checked)}
                            disabled={isReadOnly}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
