/**
 * ════════════════════════════════════════════════════════════════
 * ℹ️ Material Additional Info Tab
 * تبويب المعلومات الإضافية للمادة
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
import { Badge } from '@/components/ui/badge';
import {
    Globe2,
    Truck,
    StickyNote,
    Building2,
    MapPin
} from 'lucide-react';
import type { SheetMode } from '../types';

interface MaterialAdditionalInfoTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
    suppliers?: { id: string; name_ar: string; name_en: string; code: string }[];
}

export function MaterialAdditionalInfoTab({ data, mode, onChange, suppliers = [] }: MaterialAdditionalInfoTabProps) {
    const { language } = useLanguage();
    const isReadOnly = mode === 'view';

    // Mock suppliers if not provided
    const mockSuppliers = suppliers.length > 0 ? suppliers : [
        { id: '1', name_ar: 'شركة النسيج العالمية', name_en: 'Global Textiles Co.', code: 'SUP-001' },
        { id: '2', name_ar: 'مصانع الأقمشة الذهبية', name_en: 'Golden Fabrics Mills', code: 'SUP-002' },
        { id: '3', name_ar: 'شركة الحرير الفاخر', name_en: 'Luxury Silk LLC', code: 'SUP-003' },
        { id: '4', name_ar: 'مجموعة الأقمشة التركية', name_en: 'Turkish Fabrics Group', code: 'SUP-004' },
    ];

    // Country options
    const countryOptions = [
        { value: 'TR', labelAr: 'تركيا', labelEn: 'Turkey' },
        { value: 'CN', labelAr: 'الصين', labelEn: 'China' },
        { value: 'IN', labelAr: 'الهند', labelEn: 'India' },
        { value: 'IT', labelAr: 'إيطاليا', labelEn: 'Italy' },
        { value: 'EG', labelAr: 'مصر', labelEn: 'Egypt' },
        { value: 'SA', labelAr: 'السعودية', labelEn: 'Saudi Arabia' },
        { value: 'AE', labelAr: 'الإمارات', labelEn: 'UAE' },
        { value: 'PK', labelAr: 'باكستان', labelEn: 'Pakistan' },
        { value: 'BD', labelAr: 'بنغلاديش', labelEn: 'Bangladesh' },
        { value: 'VN', labelAr: 'فيتنام', labelEn: 'Vietnam' },
        { value: 'PT', labelAr: 'البرتغال', labelEn: 'Portugal' },
        { value: 'ES', labelAr: 'إسبانيا', labelEn: 'Spain' },
        { value: 'FR', labelAr: 'فرنسا', labelEn: 'France' },
        { value: 'UK', labelAr: 'المملكة المتحدة', labelEn: 'United Kingdom' },
        { value: 'US', labelAr: 'الولايات المتحدة', labelEn: 'United States' },
        { value: 'OTHER', labelAr: 'أخرى', labelEn: 'Other' },
    ];

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Origin & Supplier */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe2 className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'بلد المنشأ والمورد' : 'Origin & Supplier'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Country of Origin */}
                        <div className="space-y-2">
                            <Label htmlFor="origin_country" className="text-sm font-medium">
                                {language === 'ar' ? 'بلد المنشأ' : 'Country of Origin'}
                            </Label>
                            <Select
                                value={data?.origin_country || ''}
                                onValueChange={(value) => handleChange('origin_country', value)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={language === 'ar' ? 'اختر البلد...' : 'Select country...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {countryOptions.map((country) => (
                                        <SelectItem key={country.value} value={country.value}>
                                            <span className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                {language === 'ar' ? country.labelAr : country.labelEn}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Default Supplier */}
                        <div className="space-y-2">
                            <Label htmlFor="default_supplier_id" className="text-sm font-medium">
                                {language === 'ar' ? 'المورد الافتراضي' : 'Default Supplier'}
                            </Label>
                            <Select
                                value={data?.default_supplier_id || ''}
                                onValueChange={(value) => handleChange('default_supplier_id', value)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={language === 'ar' ? 'اختر المورد...' : 'Select supplier...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockSuppliers.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>
                                            <span className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <Badge variant="outline" className="text-xs me-1">{supplier.code}</Badge>
                                                {language === 'ar' ? supplier.name_ar : supplier.name_en}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="w-5 h-5 text-orange-600" />
                        {language === 'ar' ? 'إعدادات المخزون' : 'Inventory Settings'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Minimum Stock */}
                        <div className="space-y-2">
                            <Label htmlFor="min_stock" className="text-sm font-medium">
                                {language === 'ar' ? 'الحد الأدنى للمخزون' : 'Minimum Stock Level'}
                            </Label>
                            <Input
                                id="min_stock"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data?.min_stock || ''}
                                onChange={(e) => handleChange('min_stock', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                disabled={isReadOnly}
                            />
                            <p className="text-xs text-gray-500">
                                {language === 'ar'
                                    ? 'سيتم التنبيه عند وصول المخزون لهذا المستوى'
                                    : 'Alert when stock reaches this level'}
                            </p>
                        </div>

                        {/* Reorder Point */}
                        <div className="space-y-2">
                            <Label htmlFor="reorder_point" className="text-sm font-medium">
                                {language === 'ar' ? 'نقطة إعادة الطلب' : 'Reorder Point'}
                            </Label>
                            <Input
                                id="reorder_point"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data?.reorder_point || ''}
                                onChange={(e) => handleChange('reorder_point', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                disabled={isReadOnly}
                            />
                            <p className="text-xs text-gray-500">
                                {language === 'ar'
                                    ? 'الكمية التي يتم عندها إنشاء طلب شراء تلقائي'
                                    : 'Quantity at which a purchase order is auto-created'}
                            </p>
                        </div>
                    </div>

                    {/* Default Warehouse */}
                    <div className="space-y-2">
                        <Label htmlFor="default_warehouse_id" className="text-sm font-medium">
                            {language === 'ar' ? 'المستودع الافتراضي' : 'Default Warehouse'}
                        </Label>
                        <Select
                            value={data?.default_warehouse_id || ''}
                            onValueChange={(value) => handleChange('default_warehouse_id', value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر المستودع...' : 'Select warehouse...'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="wh-1">
                                    {language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse'}
                                </SelectItem>
                                <SelectItem value="wh-2">
                                    {language === 'ar' ? 'مستودع المبيعات' : 'Sales Warehouse'}
                                </SelectItem>
                                <SelectItem value="wh-3">
                                    {language === 'ar' ? 'مستودع الإنتاج' : 'Production Warehouse'}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Notes */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <StickyNote className="w-5 h-5 text-yellow-600" />
                        {language === 'ar' ? 'ملاحظات' : 'Notes'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-sm font-medium">
                            {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
                        </Label>
                        <Textarea
                            id="notes"
                            value={data?.notes || ''}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder={language === 'ar'
                                ? 'أضف أي ملاحظات أو معلومات إضافية عن المادة...'
                                : 'Add any additional notes or information about the material...'}
                            disabled={isReadOnly}
                            rows={4}
                        />
                    </div>

                    {/* Custom Fields */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            {language === 'ar' ? 'حقول مخصصة' : 'Custom Fields'}
                            <Badge variant="secondary" className="text-xs">
                                {language === 'ar' ? 'اختياري' : 'Optional'}
                            </Badge>
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                placeholder={language === 'ar' ? 'اسم الحقل...' : 'Field name...'}
                                disabled={isReadOnly}
                            />
                            <Input
                                placeholder={language === 'ar' ? 'قيمة الحقل...' : 'Field value...'}
                                disabled={isReadOnly}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {language === 'ar'
                                ? 'أضف حقولاً مخصصة لتخزين معلومات إضافية'
                                : 'Add custom fields to store additional information'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Status */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {language === 'ar' ? 'الحالة' : 'Status'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={data?.status || 'active'}
                        onValueChange={(value) => handleChange('status', value)}
                        disabled={isReadOnly}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    {language === 'ar' ? 'نشط' : 'Active'}
                                </span>
                            </SelectItem>
                            <SelectItem value="inactive">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                                    {language === 'ar' ? 'غير نشط' : 'Inactive'}
                                </span>
                            </SelectItem>
                            <SelectItem value="discontinued">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    {language === 'ar' ? 'متوقف' : 'Discontinued'}
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
        </div>
    );
}
