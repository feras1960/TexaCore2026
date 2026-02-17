/**
 * 📦 ContainerMainTab — Container-Specific Creation & Info Tab
 * 
 * Replaces generic TradeHeader for containers.
 * Required at creation: container_number only (+ auto-generated reference)
 * Optional: supplier (shipping company), origin, ports, dates, size/type
 * 
 * Best practices (SAP/Odoo/Oracle):
 * - Container is an independent entity, NOT a purchase invoice
 * - Shipping company = informational, can be added later
 * - Locked once payment is made against it
 * - Supplier invoices linked separately via items tab
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Container as ContainerIcon,
    Hash,
    Ship,
    Globe,
    MapPin,
    Calendar,
    Truck,
    FileText,
    Ruler,
    Box,
    StickyNote,
    Users,
    Building2,
    Anchor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContainerStatusStepper, CONTAINER_STATUSES } from '@/features/trade/components/ContainerStatusStepper';

interface ContainerMainTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
    tradeMode?: 'sales' | 'purchase';
}

export const ContainerMainTab: React.FC<ContainerMainTabProps> = ({
    data,
    mode,
    onChange,
}) => {
    const { t, isRTL, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isEditable = mode === 'create' || mode === 'edit';

    // ─── Set container defaults on creation ───
    useEffect(() => {
        if (mode === 'create') {
            const defaults: Record<string, any> = {};
            if (!data.date) defaults.date = new Date().toISOString();
            if (!data.status) defaults.status = 'draft';
            if (!data.container_size) defaults.container_size = '40ft';
            if (!data.container_type) defaults.container_type = 'dry';
            if (!data.base_currency) defaults.base_currency = companyCurrency || 'USD';
            if (Object.keys(defaults).length > 0) {
                onChange(defaults);
            }
        }
    }, [mode]);

    // ─── Fetch shipping companies & agents (filtered by vendor_category) ───
    const { data: shippingAgentsList = [] } = useQuery({
        queryKey: ['container_shipping_agents', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: rows, error } = await supabase
                .from('suppliers')
                .select('id, name_ar, name_en, vendor_category')
                .eq('company_id', companyId)
                .in('vendor_category', ['shipping_company', 'customs_agent', 'transport_company'])
                .order(language === 'ar' ? 'name_ar' : 'name_en');
            if (error) return [];
            return (rows || []).map((r: any) => ({
                id: r.id,
                name: language === 'ar' ? (r.name_ar || r.name_en || '') : (r.name_en || r.name_ar || ''),
                category: r.vendor_category,
            }));
        },
        enabled: !!companyId,
        staleTime: 60000,
    });

    const handleChange = useCallback((field: string, value: any) => {
        onChange({ [field]: value });
    }, [onChange]);

    const handleSupplierChange = useCallback((val: string) => {
        onChange({
            supplier_id: val,
            party_id: val
        });
    }, [onChange]);

    // Container size options
    const sizeOptions = [
        { value: '20ft', label: '20ft' },
        { value: '40ft', label: '40ft' },
        { value: '40hc', label: '40ft HC' },
        { value: '45ft', label: '45ft' },
    ];

    // Container type options
    const typeOptions = [
        { value: 'dry', labelAr: 'جاف', labelEn: 'Dry' },
        { value: 'reefer', labelAr: 'مُبرّد', labelEn: 'Reefer' },
        { value: 'open', labelAr: 'مفتوح', labelEn: 'Open Top' },
        { value: 'flat', labelAr: 'مسطح', labelEn: 'Flat Rack' },
    ];

    const currentSupplierName = shippingAgentsList.find((s: any) => s.id === (data.supplier_id || data.party_id))?.name || '';

    // Category labels for display
    const categoryLabel = (cat: string) => {
        const map: Record<string, { ar: string; en: string }> = {
            shipping_company: { ar: 'شحن', en: 'Shipping' },
            customs_agent: { ar: 'تخليص', en: 'Customs' },
            transport_company: { ar: 'نقل', en: 'Transport' },
        };
        return isRTL ? (map[cat]?.ar || cat) : (map[cat]?.en || cat);
    };

    return (
        <div className="space-y-5" dir={direction}>
            {/* ═══ Section 1: Container Identity ═══ */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-gray-900/50 dark:to-gray-800/30">
                <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                        <ContainerIcon className="w-4 h-4" />
                        {isRTL ? 'معلومات الكونتينر' : 'Container Information'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Reference Number (Auto-generated) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Hash className="w-3.5 h-3.5" />
                                {isRTL ? 'الرقم المرجعي' : 'Reference #'}
                            </Label>
                            <Input
                                value={data.shipment_number || ''}
                                className="h-10 font-mono bg-white dark:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder={mode === 'create' ? 'AUTO-GEN' : ''}
                                disabled={true}
                                dir="ltr"
                            />
                            {mode === 'create' && (
                                <span className="text-[10px] text-gray-400">
                                    {isRTL ? 'يُولّد تلقائياً عند الحفظ (CNT-XXXX)' : 'Auto-generated on save (CNT-XXXX)'}
                                </span>
                            )}
                        </div>

                        {/* Container Number (Physical) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <ContainerIcon className="w-3.5 h-3.5" />
                                {isRTL ? 'رقم الكونتينر' : 'Container Number'}
                                <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                value={data.container_number || ''}
                                onChange={(e) => handleChange('container_number', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                placeholder="e.g. MSKU1234567"
                                disabled={!isEditable}
                                dir="ltr"
                            />
                        </div>

                        {/* Container Name (User-friendly) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {isRTL ? 'اسم الكونتينر' : 'Container Name'}
                            </Label>
                            <Input
                                value={data.container_name || ''}
                                onChange={(e) => handleChange('container_name', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                placeholder={isRTL ? 'مثال: أقمشة تركية صيف 2026' : 'e.g. Turkish Fabrics Summer 2026'}
                                disabled={!isEditable}
                            />
                            <span className="text-[10px] text-gray-400">
                                {isRTL ? 'اسم وصفي لسهولة المتابعة' : 'Descriptive name for easy tracking'}
                            </span>
                        </div>

                        {/* B/L Number */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {isRTL ? 'رقم البوليصة (B/L)' : 'Bill of Lading'}
                            </Label>
                            <Input
                                value={data.bill_of_lading || ''}
                                onChange={(e) => handleChange('bill_of_lading', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Origin Country */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" />
                                {isRTL ? 'بلد المنشأ' : 'Origin Country'}
                            </Label>
                            <Input
                                value={data.origin_country || ''}
                                onChange={(e) => handleChange('origin_country', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                            />
                        </div>

                        {/* Container Size */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Ruler className="w-3.5 h-3.5" />
                                {isRTL ? 'حجم الكونتينر' : 'Container Size'}
                            </Label>
                            <Select
                                value={data.container_size || '40ft'}
                                onValueChange={(v) => handleChange('container_size', v)}
                                disabled={!isEditable}
                            >
                                <SelectTrigger className="h-10 bg-white dark:bg-gray-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sizeOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Container Type */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Box className="w-3.5 h-3.5" />
                                {isRTL ? 'نوع الكونتينر' : 'Container Type'}
                            </Label>
                            <Select
                                value={data.container_type || 'dry'}
                                onValueChange={(v) => handleChange('container_type', v)}
                                disabled={!isEditable}
                            >
                                <SelectTrigger className="h-10 bg-white dark:bg-gray-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {isRTL ? opt.labelAr : opt.labelEn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ═══ Container Status Stepper ═══ */}
                    {data.id && (
                        <div className="mt-5 p-4 rounded-xl bg-white/70 dark:bg-gray-800/50 border border-blue-100 dark:border-blue-900/30">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-3">
                                <Truck className="w-3.5 h-3.5" />
                                {isRTL ? 'حالة الشحن' : 'Shipping Status'}
                            </Label>
                            <ContainerStatusStepper
                                containerId={data.id}
                                currentStatus={data.status || 'draft'}
                                mode={mode}
                                onStatusChange={(newStatus) => handleChange('status', newStatus)}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Section 2: Shipping Company (Optional) ═══ */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-teal-50/30 to-cyan-50/20 dark:from-gray-900/40 dark:to-gray-800/20">
                <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-teal-800 dark:text-teal-300">
                        <Ship className="w-4 h-4" />
                        {isRTL ? 'شركة الشحن' : 'Shipping Company'}
                        <Badge variant="outline" className="text-[9px] font-normal">
                            {isRTL ? 'اختياري' : 'Optional'}
                        </Badge>
                    </CardTitle>
                    {mode === 'create' && (
                        <p className="text-[11px] text-gray-400 mt-1">
                            {isRTL
                                ? 'يمكن إضافة شركة الشحن لاحقاً — ستُثبّت تلقائياً عند إجراء أول دفعة'
                                : 'Can be added later — auto-locked on first payment'}
                        </p>
                    )}
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Supplier/Shipping Company */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {isRTL ? 'شركة الشحن / الوكيل' : 'Shipping Co / Agent'}
                            </Label>
                            <Select
                                value={data.supplier_id || data.party_id || ''}
                                onValueChange={handleSupplierChange}
                                disabled={!isEditable}
                            >
                                <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
                                    <SelectValue placeholder={isRTL ? 'اختر شركة الشحن...' : 'Select shipping company...'} />
                                </SelectTrigger>
                                <SelectContent align={isRTL ? "end" : "start"}>
                                    {shippingAgentsList.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-400">
                                            {isRTL
                                                ? 'لا توجد شركات شحن — أضف مورد بتصنيف "شركة شحن" من إدارة الموردين'
                                                : 'No shipping companies found — add a supplier with "Shipping Company" category'}
                                        </div>
                                    ) : (
                                        shippingAgentsList.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <span className="flex items-center gap-2">
                                                    {s.name}
                                                    <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                        {categoryLabel(s.category)}
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Shipping Line Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Anchor className="w-3.5 h-3.5" />
                                {isRTL ? 'خط الشحن الدولي' : 'Shipping Line'}
                            </Label>
                            <Input
                                value={data.shipping_line || data.shipping_company || ''}
                                onChange={(e) => handleChange('shipping_company', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                placeholder={isRTL ? 'مثال: MSC, Maersk, CMA CGM' : 'e.g. MSC, Maersk, CMA CGM'}
                                disabled={!isEditable}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Section 3: Shipping Route ═══ */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50/30 to-orange-50/20 dark:from-gray-900/40 dark:to-gray-800/20">
                <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <MapPin className="w-4 h-4" />
                        {isRTL ? 'مسار الشحن والتواريخ' : 'Route & Dates'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Port of Loading */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-green-500" />
                                {isRTL ? 'ميناء التحميل' : 'Port of Loading'}
                            </Label>
                            <Input
                                value={data.port_of_loading || data.origin_port || ''}
                                onChange={(e) => {
                                    handleChange('port_of_loading', e.target.value);
                                    handleChange('origin_port', e.target.value);
                                }}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                            />
                        </div>

                        {/* Port of Discharge */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                {isRTL ? 'ميناء الوصول' : 'Port of Discharge'}
                            </Label>
                            <Input
                                value={data.port_of_discharge || data.destination_port || ''}
                                onChange={(e) => {
                                    handleChange('port_of_discharge', e.target.value);
                                    handleChange('destination_port', e.target.value);
                                }}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                            />
                        </div>

                        {/* Vessel Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Ship className="w-3.5 h-3.5" />
                                {isRTL ? 'اسم السفينة' : 'Vessel Name'}
                            </Label>
                            <Input
                                value={data.vessel_name || ''}
                                onChange={(e) => handleChange('vessel_name', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                            />
                        </div>

                        {/* Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {isRTL ? 'تاريخ الإنشاء' : 'Date'}
                            </Label>
                            <Input
                                type="date"
                                value={data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ETD */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                {isRTL ? 'موعد المغادرة (ETD)' : 'Estimated Departure (ETD)'}
                            </Label>
                            <Input
                                type="date"
                                value={data.etd || data.departure_date || ''}
                                onChange={(e) => {
                                    handleChange('etd', e.target.value);
                                    handleChange('departure_date', e.target.value);
                                }}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                                dir="ltr"
                            />
                        </div>

                        {/* ETA */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-green-500" />
                                {isRTL ? 'موعد الوصول (ETA)' : 'Estimated Arrival (ETA)'}
                            </Label>
                            <Input
                                type="date"
                                value={data.eta || data.expected_arrival_date || ''}
                                onChange={(e) => {
                                    handleChange('eta', e.target.value);
                                    handleChange('expected_arrival_date', e.target.value);
                                }}
                                className="h-10 bg-white dark:bg-gray-800"
                                disabled={!isEditable}
                                dir="ltr"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Section 4: Notes ═══ */}
            <Card className="border-none shadow-sm bg-gray-50/50 dark:bg-gray-900/50">
                <CardContent className="p-4">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-2">
                        <StickyNote className="w-3.5 h-3.5" />
                        {isRTL ? 'ملاحظات' : 'Notes'}
                    </Label>
                    <Textarea
                        value={data.notes || data.remarks || ''}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder={isRTL ? 'أضف ملاحظات على الكونتينر...' : 'Add notes...'}
                        className="min-h-[60px] max-h-[120px] bg-white dark:bg-gray-800 text-sm resize-y"
                        readOnly={!isEditable}
                    />
                </CardContent>
            </Card>
        </div>
    );
};
