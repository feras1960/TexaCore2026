/**
 * ════════════════════════════════════════════════════════════════
 * 🚛 DeliveryInfoTab — بيانات التسليم والعميل
 * ════════════════════════════════════════════════════════════════
 *
 * يعرض:
 * 1. طريقة التوصيل المختارة في الفاتورة (للمرجع)
 * 2. بيانات العميل وعنوانه
 * 3. حقول بيانات التوصيل (السائق، السيارة...)
 * 4. ملاحظات التسليم
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import {
    Building2, Truck, Navigation, MapPin, Phone,
    User, Package, Clock, FileText, Hash,
    Loader2, AlertCircle, Car,
} from 'lucide-react';

interface DeliveryInfoTabProps {
    data: any;
    mode: string;
    onChange: (updates: any) => void;
}

// Delivery methods (matching CustomerShippingTab)
const DELIVERY_METHODS = [
    { id: 'store_pickup', label_ar: 'تسليم عبر الفرع', label_en: 'Branch Delivery', icon: Building2, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'direct_delivery', label_ar: 'توصيل لعنوان العميل', label_en: 'Customer Delivery', icon: Truck, color: 'bg-green-100 text-green-600 border-green-200' },
    { id: 'direct_pickup', label_ar: 'تسليم مباشر بالمستودع', label_en: 'Warehouse Pickup', icon: Package, color: 'bg-amber-100 text-amber-600 border-amber-200' },
    { id: 'carrier', label_ar: 'شركة شحن', label_en: 'Shipping Carrier', icon: Navigation, color: 'bg-purple-100 text-purple-600 border-purple-200' },
];

export function DeliveryInfoTab({ data, mode, onChange }: DeliveryInfoTabProps) {
    const { language, isRTL } = useLanguage();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;
    const isEditable = mode === 'create' || mode === 'edit';

    // Wrap onChange to also notify parent (SalesDeliveryDialog) via onDeliveryDataChange
    const handleChange = React.useCallback((updates: any) => {
        onChange(updates);
        // Propagate to SalesDeliveryDialog for header badge + DB persistence
        if (typeof data?.onDeliveryDataChange === 'function') {
            data.onDeliveryDataChange(updates);
        }
    }, [onChange, data?.onDeliveryDataChange]);

    // Customer data — cached via React Query (no loading spinner on re-open)
    const customerId = data?.customer_id;
    const deliveryMethod = data?.delivery_method || 'store_pickup';

    const { companyId } = useAuth();

    // ═══ Drivers list — cached ═══
    const { data: driversList = [] } = useCachedQuery({
        queryKey: ['delivery_drivers', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: drv } = await supabase
                .from('drivers')
                .select('id, name_ar, phone, vehicle_number')
                .eq('company_id', companyId)
                .eq('status', 'active')
                .order('name_ar');
            return drv || [];
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,  // 5 min
        gcTime: 30 * 60 * 1000,    // 30 min
    });

    // ═══ Customer data — cached ═══
    const { data: customer = null } = useCachedQuery({
        queryKey: ['delivery_customer', customerId],
        queryFn: async () => {
            if (!customerId) return null;
            const { data: cust } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .maybeSingle();
            return cust || null;
        },
        enabled: !!customerId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    // ═══ Customer address — cached ═══
    const { data: customerAddress = null } = useCachedQuery({
        queryKey: ['delivery_customer_address', customerId],
        queryFn: async () => {
            if (!customerId) return null;
            const { data: addrs } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', customerId)
                .order('is_default', { ascending: false })
                .limit(1);
            return addrs?.[0] || null;
        },
        enabled: !!customerId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    // Current delivery method info
    const currentMethod = DELIVERY_METHODS.find(m => m.id === deliveryMethod) || DELIVERY_METHODS[0];
    const MethodIcon = currentMethod.icon;



    return (
        <div className="p-4 space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══ 1. طريقة التوصيل ═══ */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-rose-500" />
                    {tl('طريقة التوصيل', 'Delivery Method')}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DELIVERY_METHODS.map(method => {
                        const Icon = method.icon;
                        const isSelected = deliveryMethod === method.id;
                        return (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => {
                                    if (isEditable) {
                                        handleChange({ delivery_method: method.id });
                                    }
                                }}
                                disabled={!isEditable}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${isSelected
                                    ? `${method.color} border-current shadow-sm`
                                    : isEditable
                                        ? 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-400 opacity-50'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium text-center leading-tight">
                                    {tl(method.label_ar, method.label_en)}
                                </span>
                                {isSelected && (
                                    <Badge className="text-[8px] bg-white/50 dark:bg-black/20 border-none mt-0.5">
                                        {tl('المحدد', 'Selected')}
                                    </Badge>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══ 2. بيانات العميل ═══ */}
            <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    {tl('بيانات العميل', 'Customer Details')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Customer name */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {tl('اسم العميل', 'Customer Name')}
                        </Label>
                        <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border">
                            {data?.customer_name || customer?.name || customer?.name_ar || '—'}
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {tl('رقم الهاتف', 'Phone Number')}
                        </Label>
                        <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border font-mono" dir="ltr">
                            {customer?.phone || data?.customer_phone || '—'}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {tl('العنوان', 'Address')}
                        </Label>
                        <div className="text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border">
                            {customerAddress ? (
                                <div className="space-y-0.5">
                                    <div>{[customerAddress.street, customerAddress.building && `${tl('مبنى', 'Bldg')} ${customerAddress.building}`].filter(Boolean).join(', ')}</div>
                                    <div className="text-xs text-gray-500">{[customerAddress.district, customerAddress.city, customerAddress.country].filter(Boolean).join(', ')}</div>
                                </div>
                            ) : data?.shipping_address ? (
                                <span>{data.shipping_address}</span>
                            ) : (
                                <span className="text-gray-400">{tl('لا يوجد عنوان', 'No address')}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ 3. بيانات السائق (تسليم عبر الفرع أو توصيل لعنوان العميل) ═══ */}
            {(deliveryMethod === 'store_pickup' || deliveryMethod === 'direct_delivery') && (
                <div className="space-y-3 bg-green-50/50 dark:bg-green-950/10 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-green-500" />
                        {tl('بيانات السائق', 'Driver Details')}
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        {/* اختيار السائق */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('اختر السائق', 'Select Driver')}</Label>
                            <Select
                                value={data?.driver_id || ''}
                                onValueChange={(driverId) => {
                                    const driver = driversList.find(d => d.id === driverId);
                                    if (driver) {
                                        handleChange({
                                            driver_id: driver.id,
                                            driver_name: driver.name_ar,
                                            driver_phone: driver.phone || '',
                                        });
                                    }
                                }}
                                disabled={!isEditable}
                            >
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder={tl('اختر سائقاً...', 'Select a driver...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {driversList.map(drv => (
                                        <SelectItem key={drv.id} value={drv.id}>
                                            <span className="font-medium">{drv.name_ar}</span>
                                            {drv.vehicle_number && (
                                                <span className="text-[10px] text-gray-400 font-mono ms-2">({drv.vehicle_number})</span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* عرض البيانات المعبأة */}
                        {data?.driver_name && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <div className="text-[10px] text-gray-400">{tl('الاسم', 'Name')}</div>
                                    <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border">
                                        {data.driver_name}
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[10px] text-gray-400">{tl('الهاتف', 'Phone')}</div>
                                    <div className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border" dir="ltr">
                                        {data.driver_phone || '—'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* الفرع المستلم — فقط عند store_pickup */}
                    {deliveryMethod === 'store_pickup' && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-green-100">
                            <Label className="text-xs text-gray-500 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {tl('الفرع المستلم', 'Receiving Branch')}
                            </Label>
                            <Input
                                value={data?.receiving_branch_name || ''}
                                onChange={(e) => handleChange({ receiving_branch_name: e.target.value })}
                                disabled={!isEditable}
                                placeholder={tl('اسم الفرع المستلم...', 'Receiving branch name...')}
                                className="h-9 text-sm"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ═══ 3.5. بيانات المستلم المباشر (تسليم مباشر بالمستودع) ═══ */}
            {deliveryMethod === 'direct_pickup' && (
                <div className="space-y-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <Car className="w-4 h-4 text-amber-500" />
                        {tl('بيانات المستلم والسيارة', 'Pickup Person & Vehicle')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('اسم المستلم', 'Recipient Name')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border">
                                {data?.pickup_person_name || '—'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('رقم الهوية / الجواز', 'ID / Passport')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border font-mono">
                                {data?.pickup_person_id_number || '—'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('رقم السيارة', 'Vehicle Number')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border font-mono">
                                {data?.pickup_vehicle_number || '—'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('نوع السيارة', 'Vehicle Type')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border">
                                {data?.pickup_vehicle_type || '—'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('اسم السائق', 'Driver Name')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border">
                                {data?.pickup_driver_name || '—'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('هاتف السائق', 'Driver Phone')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border font-mono" dir="ltr">
                                {data?.pickup_driver_phone || '—'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ 4. بيانات الشحن ═══ */}
            {deliveryMethod === 'carrier' && (
                <div className="space-y-3 bg-purple-50/50 dark:bg-purple-950/10 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30">
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-purple-500" />
                        {tl('بيانات الشحن', 'Shipping Details')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('شركة الشحن', 'Carrier')}</Label>
                            <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border">
                                {data?.shipping_carrier || '—'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('رقم التتبع', 'Tracking #')}</Label>
                            <div className="text-sm font-mono font-bold bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border text-purple-600">
                                {data?.tracking_number || '—'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ 5. بيانات الفاتورة المرجعية ═══ */}
            <div className="space-y-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    {tl('بيانات الفاتورة', 'Invoice Details')}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400">{tl('رقم الفاتورة', 'Invoice #')}</div>
                        <div className="text-sm font-mono font-bold text-rose-600">
                            {data?.invoice_no || data?.draft_no || '—'}
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400">{tl('تاريخ الفاتورة', 'Invoice Date')}</div>
                        <div className="text-sm font-mono">
                            {data?.created_at ? new Date(data.created_at).toLocaleDateString('en-GB') : '—'}
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400">{tl('المبلغ الإجمالي', 'Total Amount')}</div>
                        <div className="text-sm font-mono font-bold">
                            {data?.total_amount ? Number(data.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400">{tl('المرحلة', 'Stage')}</div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                            {data?.stage || 'confirmed'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* ═══ 6. ملاحظات التسليم ═══ */}
            <div className="space-y-2">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {tl('ملاحظات التسليم', 'Delivery Notes')}
                </Label>
                <Textarea
                    value={data?.delivery_notes || ''}
                    onChange={(e) => handleChange({ delivery_notes: e.target.value })}
                    disabled={!isEditable}
                    placeholder={tl('أضف ملاحظات خاصة بالتسليم...', 'Add delivery notes...')}
                    className="text-sm min-h-[70px] resize-none"
                />
            </div>
        </div>
    );
}

export default DeliveryInfoTab;
