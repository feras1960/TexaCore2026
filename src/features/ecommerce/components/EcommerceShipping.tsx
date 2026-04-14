/**
 * EcommerceShipping — إدارة الشحن وطرق الدفع + Nova Poshta
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { Truck, CreditCard, Wallet, Shield, MapPin, Package, Globe, Loader2, RefreshCw, CheckCircle, Plus } from 'lucide-react';

interface Carrier {
    id: string;
    carrier_code: string;
    name_ar: string;
    name_en: string;
    name_uk?: string;
    is_active: boolean;
    is_default: boolean;
    default_service_type?: string;
    tracking_url_template?: string;
    country?: string;
}

export default function EcommerceShipping() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const { companyId } = useCompany();
    const queryClient = useQueryClient();

    // ─── Cache-first query (IndexedDB persistence) ────────────
    const { data: carriers = [], isLoading: loading } = useCachedQuery({
        queryKey: ['ecommerce', 'shipping', companyId],
        queryFn: async () => {
            const { data } = await supabase.from('shipping_carriers').select('*').order('carrier_code');
            return (data || []) as Carrier[];
        },
        staleTime: 30 * 60 * 1000,      // 30 minutes (carriers rarely change)
        gcTime: 24 * 60 * 60 * 1000,    // 24 hours in IndexedDB
    });

    // ─── Realtime — invalidate on carrier changes ────────────
    useRealtimeInvalidation({
        table: 'shipping_carriers',
        companyId,
        queryKeys: [['ecommerce', 'shipping']],
    });

    const toggleCarrier = async (id: string, current: boolean) => {
        // Optimistic update
        queryClient.setQueryData(['ecommerce', 'shipping', companyId], (old: Carrier[] | undefined) =>
            (old || []).map(c => c.id === id ? { ...c, is_active: !current } : c)
        );
        await supabase.from('shipping_carriers').update({ is_active: !current }).eq('id', id);
    };

    const paymentMethods = [
        { id: 'cod', name: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery', icon: '💵', enabled: true, fees: '0%' },
        { id: 'bank', name: isRTL ? 'تحويل بنكي' : 'Bank Transfer', icon: '🏦', enabled: true, fees: '0%' },
        { id: 'card', name: isRTL ? 'بطاقة إئتمان' : 'Credit Card', icon: '💳', enabled: false, fees: '2.9%' },
        { id: 'liqpay', name: 'LiqPay', icon: '💳', enabled: false, fees: '2.75%' },
    ];

    const carrierLogos: Record<string, string> = {
        nova_poshta: '📦',
        ukrposhta: '📮',
        meest: '✈️',
        dhl: '🚛',
        aramex: '🚚',
    };

    if (loading && !carriers.length) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-erp-teal" /></div>;

    return (
        <div className="space-y-6">
            {/* Shipping Carriers */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Truck className="w-5 h-5 text-erp-teal" /> {isRTL ? 'شركات الشحن' : 'Shipping Carriers'}</CardTitle>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> {isRTL ? 'إضافة شركة' : 'Add Carrier'}</Button>
                </CardHeader>
                <CardContent>
                    {carriers.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{isRTL ? 'لم يتم إعداد شركات شحن بعد' : 'No carriers configured yet'}</p>
                            <p className="text-xs mt-1">{isRTL ? 'أضف نوفايا بوشتا من الإعدادات' : 'Add Nova Poshta from settings'}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {carriers.map(carrier => (
                                <div key={carrier.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{carrierLogos[carrier.carrier_code] || '📦'}</span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">{isRTL ? carrier.name_ar : carrier.name_en}</p>
                                                {carrier.is_default && <Badge className="bg-erp-teal/10 text-erp-teal text-[10px]">{isRTL ? 'افتراضي' : 'Default'}</Badge>}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {carrier.carrier_code} • {carrier.default_service_type || '-'} • {carrier.country || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={carrier.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                            {carrier.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                                        </Badge>
                                        <Switch checked={carrier.is_active} onCheckedChange={() => toggleCarrier(carrier.id, carrier.is_active)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Nova Poshta Integration  */}
            <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">📦</span> Nova Poshta {isRTL ? 'التكامل' : 'Integration'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 text-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs font-medium">{isRTL ? 'Edge Function' : 'Edge Function'}</p>
                            <p className="text-[10px] text-gray-500">{isRTL ? 'جاهز' : 'Ready'}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 text-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs font-medium">{isRTL ? 'إنشاء TTN' : 'Create TTN'}</p>
                            <p className="text-[10px] text-gray-500">{isRTL ? 'جاهز' : 'Ready'}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 text-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs font-medium">{isRTL ? 'التتبع' : 'Tracking'}</p>
                            <p className="text-[10px] text-gray-500">{isRTL ? 'جاهز' : 'Ready'}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 text-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs font-medium">{isRTL ? 'حساب التكلفة' : 'Cost Calc'}</p>
                            <p className="text-[10px] text-gray-500">{isRTL ? 'جاهز' : 'Ready'}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">{isRTL ? 'جميع خدمات Nova Poshta API v2.0 متاحة: بحث المدن، نقاط التسليم، إنشاء بوليصة، تتبع، حساب التكلفة' : 'All Nova Poshta API v2.0 services available: city search, warehouses, TTN creation, tracking, cost calculation'}</p>
                </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-600" /> {isRTL ? 'طرق الدفع' : 'Payment Methods'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {paymentMethods.map(pm => (
                            <div key={pm.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{pm.icon}</span>
                                    <div>
                                        <p className="font-medium text-sm">{pm.name}</p>
                                        <p className="text-xs text-gray-500">{isRTL ? 'رسوم:' : 'Fees:'} {pm.fees}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge className={pm.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                        {pm.enabled ? (isRTL ? 'مفعّل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                                    </Badge>
                                    <Switch checked={pm.enabled} />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Shipping Zones */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-500" /> {isRTL ? 'مناطق الشحن' : 'Shipping Zones'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[
                            { name: isRTL ? 'أوكرانيا — كييف' : 'Ukraine — Kyiv', cost: isRTL ? 'مجاني +500₴' : 'Free +500₴', days: '1-2' },
                            { name: isRTL ? 'أوكرانيا — مدن أخرى' : 'Ukraine — Other cities', cost: '40-80₴', days: '2-4' },
                            { name: isRTL ? 'دولي' : 'International', cost: isRTL ? 'حسب الوزن' : 'By weight', days: '5-14' },
                        ].map((zone, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium">{zone.name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{zone.cost}</span>
                                    <span>{zone.days} {isRTL ? 'أيام' : 'days'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
