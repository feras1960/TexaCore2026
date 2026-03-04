import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { SheetMode } from '../types';

interface MaterialEcommerceTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
}

export function MaterialEcommerceTab({ data, mode, onChange }: MaterialEcommerceTabProps) {
    const { t, language } = useLanguage();
    const isView = mode === 'view';

    // Safe access to custom_fields
    const customFields = data?.custom_fields || {};

    // We treat 'ecommerce' values as custom_fields, or we could also store them directly on data if DB supports it.
    // For now we assume ecommerce related fields might be in data or data.custom_fields
    const published = customFields?.ecommerce_published || false;
    const marketingName = customFields?.ecommerce_marketing_name || '';
    const marketingDesc = customFields?.ecommerce_marketing_description || '';
    const sellingPrice = customFields?.ecommerce_price || data?.standard_selling_price || 0;

    return (
        <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                            {language === 'ar' ? 'نشر في المتجر الإلكتروني' : 'Publish to E-commerce'}
                        </Label>
                        <p className="text-xs text-gray-500">
                            {language === 'ar' ? 'اجعل هذا المنتج متاحاً للبيع في المتجر الإلكتروني' : 'Make this product available for sale in the online store'}
                        </p>
                    </div>
                    <Switch
                        checked={published}
                        onCheckedChange={(val) => {
                            if (!isView) {
                                onChange({
                                    custom_fields: { ...customFields, ecommerce_published: val }
                                });
                            }
                        }}
                        disabled={isView}
                        className={published ? "data-[state=checked]:bg-erp-teal" : ""}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الاسم التجاري (في المتجر)' : 'Marketing Name (Store)'}</Label>
                        <Input
                            placeholder={language === 'ar' ? 'مثال: قماش حرير طبيعي 100%' : 'e.g. 100% Natural Silk Fabric'}
                            value={marketingName}
                            disabled={isView}
                            onChange={(e) => onChange({
                                custom_fields: { ...customFields, ecommerce_marketing_name: e.target.value }
                            })}
                        />
                        <p className="text-[10px] text-gray-500">
                            {language === 'ar' ? 'اتركه فارغاً لاستخدام الاسم الأساسي للمادة.' : 'Leave empty to use the standard material name.'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>{language === 'ar' ? 'السعر في المتجر (البيع)' : 'Store Selling Price'}</Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={sellingPrice}
                            disabled={isView}
                            onChange={(e) => onChange({
                                custom_fields: { ...customFields, ecommerce_price: Number(e.target.value) }
                            })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الوصف التسويقي' : 'Marketing Description'}</Label>
                    <Textarea
                        placeholder={language === 'ar' ? 'اكتب وصفاً جذاباً للزبائن...' : 'Write an attractive description for customers...'}
                        value={marketingDesc}
                        disabled={isView}
                        onChange={(e) => onChange({
                            custom_fields: { ...customFields, ecommerce_marketing_description: e.target.value }
                        })}
                        className="min-h-[100px]"
                    />
                </div>
            </div>

            {/* In a real scenario we'd add an image uploader component here if desired */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                    {language === 'ar' ? 'صور المتجر' : 'Store Images'}
                </Label>
                <div className="mt-4 text-center py-8 bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                    <p className="text-sm text-gray-500">
                        {language === 'ar' ? 'ارفع الصور التسويقية الخاصة بالمتجر (قريباً)' : 'Upload store marketing images (Coming soon)'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default MaterialEcommerceTab;
