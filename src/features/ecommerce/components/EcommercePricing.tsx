/**
 * EcommercePricing — التسعير والعروض
 */
import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, Plus, Percent, Zap, Gift, Calendar, DollarSign } from 'lucide-react';

export default function EcommercePricing() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const pricingRules = [
        { id: 1, title: isRTL ? 'خصم VIP 15%' : 'VIP 15% Discount', type: 'percentage', value: 15, target: 'VIP', enabled: true, usageCount: 89 },
        { id: 2, title: isRTL ? 'خصم الطلبات الكبيرة' : 'Bulk Order Discount', type: 'percentage', value: 10, target: isRTL ? 'طلبات +5 قطع' : '5+ items', enabled: true, usageCount: 234 },
        { id: 3, title: isRTL ? 'خصم ثابت 50' : '50 Fixed Discount', type: 'fixed', value: 50, target: isRTL ? 'إلكترونيات' : 'Electronics', enabled: false, usageCount: 45 },
    ];

    const coupons = [
        { code: 'WELCOME20', desc: isRTL ? 'خصم 20% للعملاء الجدد' : '20% off for new customers', type: 'percentage', value: 20, maxUses: 100, used: 67, minPurchase: 100, active: true },
        { code: 'SAVE50', desc: isRTL ? 'خصم 50 — فلاش سيل' : '50 off - Flash Sale', type: 'fixed', value: 50, maxUses: 50, used: 50, minPurchase: 300, active: false },
        { code: 'FREESHIP', desc: isRTL ? 'شحن مجاني' : 'Free Shipping', type: 'shipping', value: 0, maxUses: 200, used: 134, minPurchase: 200, active: true },
    ];

    return (
        <div className="space-y-6">
            {/* Pricing Rules */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Tag className="w-5 h-5 text-erp-teal" /> {isRTL ? 'قواعد التسعير' : 'Pricing Rules'}</CardTitle>
                    <Button size="sm" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> {isRTL ? 'إضافة قاعدة' : 'Add Rule'}</Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {pricingRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.type === 'percentage' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                                        {rule.type === 'percentage' ? <Percent className="w-5 h-5 text-blue-600" /> : <DollarSign className="w-5 h-5 text-green-600" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{rule.title}</p>
                                        <p className="text-xs text-gray-500">{isRTL ? 'الهدف:' : 'Target:'} {rule.target} • {rule.usageCount} {isRTL ? 'استخدام' : 'uses'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold font-mono text-erp-teal">{rule.type === 'percentage' ? `${rule.value}%` : rule.value}</span>
                                    <Badge className={rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                        {rule.enabled ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Coupons */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Gift className="w-5 h-5 text-purple-600" /> {isRTL ? 'كوبونات الخصم' : 'Discount Coupons'}</CardTitle>
                    <Button size="sm" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> {isRTL ? 'كوبون جديد' : 'New Coupon'}</Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coupons.map(coupon => (
                            <div key={coupon.code} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-dashed border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <code className="bg-erp-teal/10 text-erp-teal px-2.5 py-1 rounded-lg font-mono text-sm font-bold">{coupon.code}</code>
                                    <Badge className={coupon.active ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                                        {coupon.active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'منتهي' : 'Expired')}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{coupon.desc}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{coupon.used}/{coupon.maxUses} {isRTL ? 'استخدام' : 'used'}</span>
                                    <span>{isRTL ? 'حد أدنى:' : 'Min:'} {coupon.minPurchase}</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-erp-teal rounded-full" style={{ width: `${(coupon.used / coupon.maxUses) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Flash Sales */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Zap className="w-5 h-5 text-orange-500" /> {isRTL ? 'عروض فلاش' : 'Flash Sales'}</CardTitle>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5" /> {isRTL ? 'جدولة عرض' : 'Schedule Sale'}</Button>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-400">
                        <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{isRTL ? 'لا توجد عروض فلاش حالياً — يمكنك إنشاء واحد جديد' : 'No flash sales — Create one to boost sales'}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
