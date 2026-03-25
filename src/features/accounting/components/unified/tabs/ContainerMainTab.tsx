/**
 * 📦 ContainerMainTab — Container-Specific Creation & Info Tab
 * 
 * Replaces generic TradeHeader for containers.
 * Required at creation: container_number only (+ auto-generated reference)
 * Optional: supplier (shipping company), origin, ports, dates, size/type
 * 
 * ✅ V2 Improvements (Feb 2026):
 * - Status Stepper always visible at top (not inside collapsible)
 * - Container info in collapsible section (collapsed by default in view mode)
 * - Route & dates in collapsible section (collapsed by default in view mode)
 * - NEW: Warehouse receiving section (collapsible) with warehouse + keeper selection
 * - NEW: Per-container notification settings (who gets notified + at which status)
 * - Summary badges visible in collapsed state for quick reference
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
    Building2,
    Anchor,
    ChevronDown,
    Warehouse,
    UserCheck,
    Package,
    Bell,
    BellRing,
    Plus,
    Trash2,
    ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContainerStatusStepper, CONTAINER_STATUSES, getStatusDef } from '@/features/trade/components/ContainerStatusStepper';

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

    // ─── Collapsible states ───
    // Auto-open in create mode, collapsed in view/edit
    const [infoOpen, setInfoOpen] = useState(mode === 'create');
    const [routeOpen, setRouteOpen] = useState(mode === 'create');
    const [warehouseOpen, setWarehouseOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

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

    // ─── Fetch shipping companies & agents ───
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

    // ─── Fetch warehouses ───
    const { data: warehousesList = [] } = useQuery({
        queryKey: ['container_warehouses', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: rows, error } = await supabase
                .from('warehouses')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order(language === 'ar' ? 'name_ar' : 'name_en');
            if (error) return [];
            return (rows || []).map((r: any) => ({
                id: r.id,
                name: language === 'ar' ? (r.name_ar || r.name_en || '') : (r.name_en || r.name_ar || ''),
            }));
        },
        enabled: !!companyId,
        staleTime: 60000,
    });

    // ─── Fetch warehouse keepers (staff with warehouse role) ───
    const { data: warehouseKeepersList = [] } = useQuery({
        queryKey: ['container_warehouse_keepers', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: rows, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .eq('company_id', companyId)
                .order('full_name');
            if (error) return [];
            return (rows || []).map((r: any) => ({
                id: r.id,
                name: r.full_name || r.id,
                role: r.role,
            }));
        },
        enabled: !!companyId,
        staleTime: 120000,
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

    // Category labels for display
    const categoryLabel = (cat: string) => {
        const map: Record<string, { ar: string; en: string }> = {
            shipping_company: { ar: 'شحن', en: 'Shipping' },
            customs_agent: { ar: 'تخليص', en: 'Customs' },
            transport_company: { ar: 'نقل', en: 'Transport' },
        };
        return isRTL ? (map[cat]?.ar || cat) : (map[cat]?.en || cat);
    };

    // Summary data for collapsed badges
    const containerNumber = data.container_number || '';
    const containerName = data.container_name || '';
    const supplierName = shippingAgentsList.find((s: any) => s.id === (data.supplier_id || data.party_id))?.name || '';
    const currentStatusDef = getStatusDef(data.status || 'draft');
    const warehouseName = warehousesList.find((w: any) => w.id === data.receiving_warehouse_id)?.name || '';
    const keeperName = warehouseKeepersList.find((k: any) => k.id === data.warehouse_keeper_id)?.name || '';

    return (
        <div className="space-y-3" dir={direction}>

            {/* ═══ STATUS STEPPER — Always visible at top ═══ */}
            {data.id && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-violet-50/30 dark:from-gray-800/60 dark:via-gray-800/40 dark:to-gray-800/30 border border-blue-100/80 dark:border-blue-900/30 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {isRTL ? 'حالة الشحن' : 'Shipping Status'}
                        </span>
                        <Badge variant="outline" className={cn(
                            "text-[10px] ms-auto",
                            currentStatusDef.textColor,
                            currentStatusDef.borderColor
                        )}>
                            {isRTL ? currentStatusDef.label_ar : currentStatusDef.label_en}
                        </Badge>
                    </div>
                    <ContainerStatusStepper
                        containerId={data.id}
                        currentStatus={data.status || 'draft'}
                        mode={mode}
                        onStatusChange={(newStatus) => handleChange('status', newStatus)}
                    />
                </div>
            )}

            {/* ═══ SECTION 1: Container Info — Collapsible ═══ */}
            <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-gray-900/50 dark:to-gray-800/30">
                    <CollapsibleTrigger asChild>
                        <button className={cn(
                            "w-full px-5 py-3 flex items-center gap-2 cursor-pointer",
                            "hover:brightness-95 transition-colors",
                            isRTL && "flex-row-reverse"
                        )}>
                            <ContainerIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className={cn(
                                "text-sm font-semibold text-blue-800 dark:text-blue-300",
                                isRTL ? "text-right" : "text-left"
                            )}>
                                {isRTL ? 'معلومات الكونتينر' : 'Container Information'}
                            </span>

                            {/* Summary badges — visible when collapsed */}
                            <div className={cn("flex items-center gap-1.5 ms-auto", isRTL && "flex-row-reverse")}>
                                {containerNumber && (
                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                        {containerNumber}
                                    </Badge>
                                )}
                                {containerName && !infoOpen && (
                                    <Badge variant="outline" className="text-[10px] max-w-[120px] truncate hidden sm:flex">
                                        {containerName}
                                    </Badge>
                                )}
                                {data.container_size && !infoOpen && (
                                    <Badge variant="outline" className="text-[10px] hidden md:flex">
                                        {data.container_size}
                                    </Badge>
                                )}
                            </div>

                            <ChevronDown className={cn(
                                "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                                infoOpen && "rotate-180"
                            )} />
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <CardContent className="px-5 pb-5 pt-0 border-t border-blue-100/50 dark:border-blue-900/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
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

                            {/* ─── Shipping Company (inside info section) ─── */}
                            <Separator className="my-4" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Supplier/Shipping Company */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {isRTL ? 'شركة الشحن / الوكيل' : 'Shipping Co / Agent'}
                                        <Badge variant="outline" className="text-[8px] font-normal ms-1">
                                            {isRTL ? 'اختياري' : 'Optional'}
                                        </Badge>
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
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* ═══ SECTION 2: Shipping Route & Dates — Collapsible ═══ */}
            <Collapsible open={routeOpen} onOpenChange={setRouteOpen}>
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-amber-50/30 to-orange-50/20 dark:from-gray-900/40 dark:to-gray-800/20">
                    <CollapsibleTrigger asChild>
                        <button className={cn(
                            "w-full px-5 py-3 flex items-center gap-2 cursor-pointer",
                            "hover:brightness-95 transition-colors",
                            isRTL && "flex-row-reverse"
                        )}>
                            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className={cn(
                                "text-sm font-semibold text-amber-800 dark:text-amber-300",
                                isRTL ? "text-right" : "text-left"
                            )}>
                                {isRTL ? 'مسار الشحن والتواريخ' : 'Route & Dates'}
                            </span>

                            {/* Summary badges */}
                            <div className={cn("flex items-center gap-1.5 ms-auto", isRTL && "flex-row-reverse")}>
                                {(data.port_of_loading || data.origin_port) && !routeOpen && (
                                    <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                                        <MapPin className="w-2.5 h-2.5 text-green-500" />
                                        {data.port_of_loading || data.origin_port}
                                    </Badge>
                                )}
                                {(data.port_of_discharge || data.destination_port) && !routeOpen && (
                                    <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                                        <MapPin className="w-2.5 h-2.5 text-red-500" />
                                        {data.port_of_discharge || data.destination_port}
                                    </Badge>
                                )}
                                {(data.eta || data.expected_arrival_date) && !routeOpen && (
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                        <Calendar className="w-2.5 h-2.5" />
                                        ETA: {new Date(data.eta || data.expected_arrival_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                    </Badge>
                                )}
                            </div>

                            <ChevronDown className={cn(
                                "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                                routeOpen && "rotate-180"
                            )} />
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <CardContent className="px-5 pb-5 pt-0 border-t border-amber-100/50 dark:border-amber-900/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
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
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* ═══ SECTION 3: Warehouse Receiving — Collapsible (NEW) ═══ */}
            <Collapsible open={warehouseOpen} onOpenChange={setWarehouseOpen}>
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-emerald-50/30 to-green-50/20 dark:from-gray-900/40 dark:to-gray-800/20">
                    <CollapsibleTrigger asChild>
                        <button className={cn(
                            "w-full px-5 py-3 flex items-center gap-2 cursor-pointer",
                            "hover:brightness-95 transition-colors",
                            isRTL && "flex-row-reverse"
                        )}>
                            <Warehouse className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className={cn(
                                "text-sm font-semibold text-emerald-800 dark:text-emerald-300",
                                isRTL ? "text-right" : "text-left"
                            )}>
                                {isRTL ? 'مستودعات الاستلام' : 'Warehouse Receiving'}
                            </span>

                            {/* Summary badges */}
                            <div className={cn("flex items-center gap-1.5 ms-auto", isRTL && "flex-row-reverse")}>
                                {warehouseName && !warehouseOpen && (
                                    <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                                        <Warehouse className="w-2.5 h-2.5" />
                                        {warehouseName}
                                    </Badge>
                                )}
                                {keeperName && !warehouseOpen && (
                                    <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                                        <UserCheck className="w-2.5 h-2.5" />
                                        {keeperName}
                                    </Badge>
                                )}
                                {!warehouseName && !warehouseOpen && (
                                    <Badge variant="outline" className="text-[10px] text-gray-400">
                                        {isRTL ? 'لم يُحدد بعد' : 'Not set'}
                                    </Badge>
                                )}
                            </div>

                            <ChevronDown className={cn(
                                "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                                warehouseOpen && "rotate-180"
                            )} />
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <CardContent className="px-5 pb-5 pt-0 border-t border-emerald-100/50 dark:border-emerald-900/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                {/* Receiving Warehouse */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                        <Warehouse className="w-3.5 h-3.5" />
                                        {isRTL ? 'مستودع الاستلام' : 'Receiving Warehouse'}
                                    </Label>
                                    <Select
                                        value={data.receiving_warehouse_id || ''}
                                        onValueChange={(v) => handleChange('receiving_warehouse_id', v)}
                                        disabled={!isEditable}
                                    >
                                        <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
                                            <SelectValue placeholder={isRTL ? 'اختر المستودع...' : 'Select warehouse...'} />
                                        </SelectTrigger>
                                        <SelectContent align={isRTL ? "end" : "start"}>
                                            {warehousesList.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-gray-400">
                                                    {isRTL ? 'لا توجد مستودعات — أضف مستودع من إدارة المستودعات' : 'No warehouses found'}
                                                </div>
                                            ) : (
                                                warehousesList.map((w: any) => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {w.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-[10px] text-gray-400">
                                        {isRTL ? 'المستودع الذي ستُستلم فيه البضاعة عند وصول الكونتينر' : 'Warehouse where goods will be received upon container arrival'}
                                    </span>
                                </div>

                                {/* Warehouse Keeper */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        {isRTL ? 'أمين المستودع' : 'Warehouse Keeper'}
                                    </Label>
                                    <Select
                                        value={data.warehouse_keeper_id || ''}
                                        onValueChange={(v) => handleChange('warehouse_keeper_id', v)}
                                        disabled={!isEditable}
                                    >
                                        <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
                                            <SelectValue placeholder={isRTL ? 'اختر أمين المستودع...' : 'Select keeper...'} />
                                        </SelectTrigger>
                                        <SelectContent align={isRTL ? "end" : "start"}>
                                            {warehouseKeepersList.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-gray-400">
                                                    {isRTL ? 'لا يوجد موظفون — أضف موظفين من لوحة المستخدمين' : 'No staff found'}
                                                </div>
                                            ) : (
                                                warehouseKeepersList.map((k: any) => (
                                                    <SelectItem key={k.id} value={k.id}>
                                                        <span className="flex items-center gap-2">
                                                            {k.name}
                                                            {k.role && (
                                                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                                    {k.role}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-[10px] text-gray-400">
                                        {isRTL ? 'الشخص المسؤول عن استلام وفحص البضاعة' : 'Person responsible for receiving and inspecting goods'}
                                    </span>
                                </div>
                            </div>

                            {/* Receiving notes */}
                            <div className="mt-4 space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5" />
                                    {isRTL ? 'ملاحظات الاستلام' : 'Receiving Notes'}
                                </Label>
                                <Textarea
                                    value={data.receiving_notes || ''}
                                    onChange={(e) => handleChange('receiving_notes', e.target.value)}
                                    placeholder={isRTL ? 'تعليمات خاصة للاستلام، أو وصف حالة البضاعة...' : 'Special receiving instructions or goods condition notes...'}
                                    className="min-h-[50px] max-h-[100px] bg-white dark:bg-gray-800 text-sm resize-y"
                                    readOnly={!isEditable}
                                />
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* ═══ SECTION 4: Notification Settings — Per Container ═══ */}
            <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-violet-50/30 to-purple-50/20 dark:from-gray-900/40 dark:to-gray-800/20">
                    <CollapsibleTrigger asChild>
                        <button className={cn(
                            "w-full px-5 py-3 flex items-center gap-2 cursor-pointer",
                            "hover:brightness-95 transition-colors",
                            isRTL && "flex-row-reverse"
                        )}>
                            <BellRing className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                            <span className={cn(
                                "text-sm font-semibold text-violet-800 dark:text-violet-300",
                                isRTL ? "text-right" : "text-left"
                            )}>
                                {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
                            </span>

                            {/* Summary badges */}
                            <div className={cn("flex items-center gap-1.5 ms-auto", isRTL && "flex-row-reverse")}>
                                {(() => {
                                    const rules = data.notification_rules || [];
                                    const activeCount = rules.filter((r: any) => r.enabled).length;
                                    if (activeCount > 0 && !notificationsOpen) {
                                        return (
                                            <Badge variant="outline" className="text-[10px] gap-1 text-violet-600 border-violet-300">
                                                <Bell className="w-2.5 h-2.5" />
                                                {activeCount} {isRTL ? 'قاعدة مفعّلة' : 'active'}
                                            </Badge>
                                        );
                                    }
                                    if (activeCount === 0 && !notificationsOpen) {
                                        return (
                                            <Badge variant="outline" className="text-[10px] text-gray-400">
                                                {isRTL ? 'لا إشعارات' : 'No notifications'}
                                            </Badge>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <ChevronDown className={cn(
                                "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                                notificationsOpen && "rotate-180"
                            )} />
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <CardContent className="px-5 pb-5 pt-0 border-t border-violet-100/50 dark:border-violet-900/20">
                            <p className="text-[11px] text-gray-400 mt-3 mb-4">
                                {isRTL
                                    ? 'حدد مَن يتم إشعاره تلقائياً عند تغيير حالة هذا الكونتينر. يمكنك إضافة عدة قواعد إشعار.'
                                    : 'Configure who gets notified automatically when this container\'s status changes. You can add multiple notification rules.'}
                            </p>

                            {/* ── Notification Rules List ── */}
                            <div className="space-y-3">
                                {(data.notification_rules || []).length === 0 && !isEditable && (
                                    <div className="text-center py-6 text-gray-400 text-xs">
                                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        {isRTL ? 'لم يتم إعداد إشعارات لهذا الكونتينر' : 'No notifications configured for this container'}
                                    </div>
                                )}

                                {(data.notification_rules || []).map((rule: any, index: number) => {
                                    const ruleUser = warehouseKeepersList.find((k: any) => k.id === rule.user_id);
                                    const ruleTriggerDef = getStatusDef(rule.trigger_status);

                                    return (
                                        <div
                                            key={rule.id || index}
                                            className={cn(
                                                "relative flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-all",
                                                rule.enabled
                                                    ? "bg-white dark:bg-gray-800 border-violet-200 dark:border-violet-800/50 shadow-sm"
                                                    : "bg-gray-50/50 dark:bg-gray-900/30 border-gray-200/60 dark:border-gray-700/40 opacity-60"
                                            )}
                                        >
                                            {/* Toggle */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Switch
                                                    checked={rule.enabled}
                                                    onCheckedChange={(checked) => {
                                                        if (!isEditable) return;
                                                        const updated = [...(data.notification_rules || [])];
                                                        updated[index] = { ...updated[index], enabled: checked };
                                                        onChange({ notification_rules: updated });
                                                    }}
                                                    disabled={!isEditable}
                                                    className="data-[state=checked]:bg-violet-500"
                                                />
                                                {/* Role icon */}
                                                {rule.role === 'sales' ? (
                                                    <ShoppingCart className={cn("w-4 h-4", rule.enabled ? "text-violet-500" : "text-gray-400")} />
                                                ) : (
                                                    <Warehouse className={cn("w-4 h-4", rule.enabled ? "text-emerald-500" : "text-gray-400")} />
                                                )}
                                            </div>

                                            {/* Role Label */}
                                            <div className="shrink-0 min-w-[100px]">
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    rule.enabled ? "text-gray-700 dark:text-gray-200" : "text-gray-400"
                                                )}>
                                                    {rule.role === 'sales'
                                                        ? (isRTL ? 'موظف مبيعات' : 'Sales Staff')
                                                        : (isRTL ? 'أمين مستودع' : 'Warehouse Keeper')}
                                                </span>
                                            </div>

                                            {/* User Select */}
                                            <div className="flex-1 min-w-0">
                                                <Select
                                                    value={rule.user_id || ''}
                                                    onValueChange={(v) => {
                                                        if (!isEditable) return;
                                                        const updated = [...(data.notification_rules || [])];
                                                        updated[index] = { ...updated[index], user_id: v };
                                                        onChange({ notification_rules: updated });
                                                    }}
                                                    disabled={!isEditable}
                                                >
                                                    <SelectTrigger className="h-9 bg-white dark:bg-gray-800 text-start text-xs">
                                                        <SelectValue placeholder={isRTL ? 'اختر الشخص...' : 'Select person...'} />
                                                    </SelectTrigger>
                                                    <SelectContent align={isRTL ? "end" : "start"}>
                                                        {warehouseKeepersList.map((k: any) => (
                                                            <SelectItem key={k.id} value={k.id}>
                                                                <span className="flex items-center gap-2 text-xs">
                                                                    {k.name}
                                                                    {k.role && (
                                                                        <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                                                                            {k.role}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Arrow */}
                                            <span className="text-gray-300 text-xs hidden sm:block">→</span>

                                            {/* Status Trigger */}
                                            <div className="flex-1 min-w-0">
                                                <Select
                                                    value={rule.trigger_status || ''}
                                                    onValueChange={(v) => {
                                                        if (!isEditable) return;
                                                        const updated = [...(data.notification_rules || [])];
                                                        updated[index] = { ...updated[index], trigger_status: v };
                                                        onChange({ notification_rules: updated });
                                                    }}
                                                    disabled={!isEditable}
                                                >
                                                    <SelectTrigger className="h-9 bg-white dark:bg-gray-800 text-start text-xs">
                                                        <SelectValue placeholder={isRTL ? 'عند أي حالة؟' : 'At which status?'} />
                                                    </SelectTrigger>
                                                    <SelectContent align={isRTL ? "end" : "start"}>
                                                        {CONTAINER_STATUSES.filter(s => s.key !== 'draft').map((status) => {
                                                            const StatusIcon = status.icon;
                                                            return (
                                                                <SelectItem key={status.key} value={status.key}>
                                                                    <span className={cn("flex items-center gap-2 text-xs", status.textColor)}>
                                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                                        {isRTL ? status.label_ar : status.label_en}
                                                                    </span>
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Delete button */}
                                            {isEditable && (
                                                <button
                                                    onClick={() => {
                                                        const updated = (data.notification_rules || []).filter((_: any, i: number) => i !== index);
                                                        onChange({ notification_rules: updated });
                                                    }}
                                                    className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                    title={isRTL ? 'حذف القاعدة' : 'Delete rule'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* ── Add Rule Buttons ── */}
                                {isEditable && (
                                    <div className={cn("flex items-center gap-2 pt-1", isRTL && "flex-row-reverse")}>
                                        <button
                                            onClick={() => {
                                                const newRule = {
                                                    id: crypto.randomUUID(),
                                                    role: 'sales',
                                                    user_id: '',
                                                    trigger_status: 'customs',
                                                    enabled: true,
                                                };
                                                onChange({ notification_rules: [...(data.notification_rules || []), newRule] });
                                            }}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                "border border-dashed border-violet-300 dark:border-violet-700",
                                                "text-violet-600 dark:text-violet-400",
                                                "hover:bg-violet-50 dark:hover:bg-violet-950/20"
                                            )}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <ShoppingCart className="w-3 h-3" />
                                            {isRTL ? 'إشعار مبيعات' : 'Sales Notification'}
                                        </button>

                                        <button
                                            onClick={() => {
                                                const newRule = {
                                                    id: crypto.randomUUID(),
                                                    role: 'warehouse',
                                                    user_id: data.warehouse_keeper_id || '',
                                                    trigger_status: 'cleared',
                                                    enabled: true,
                                                };
                                                onChange({ notification_rules: [...(data.notification_rules || []), newRule] });
                                            }}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                "border border-dashed border-emerald-300 dark:border-emerald-700",
                                                "text-emerald-600 dark:text-emerald-400",
                                                "hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                            )}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <Warehouse className="w-3 h-3" />
                                            {isRTL ? 'إشعار مستودع' : 'Warehouse Notification'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ── Notification Summary (view mode) ── */}
                            {!isEditable && (data.notification_rules || []).length > 0 && (
                                <div className="mt-4 p-3 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
                                    <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium mb-2">
                                        <Bell className="w-3.5 h-3.5" />
                                        {isRTL ? 'ملخص الإشعارات' : 'Notification Summary'}
                                    </div>
                                    <div className="space-y-1">
                                        {(data.notification_rules || []).filter((r: any) => r.enabled).map((rule: any, i: number) => {
                                            const user = warehouseKeepersList.find((k: any) => k.id === rule.user_id);
                                            const statusDef = getStatusDef(rule.trigger_status);
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                                                    <BellRing className="w-3 h-3 text-violet-400" />
                                                    <span className="font-medium">{user?.name || (isRTL ? 'غير محدد' : 'Not set')}</span>
                                                    <span className="text-gray-400">←</span>
                                                    <Badge variant="outline" className={cn("text-[9px]", statusDef.textColor, statusDef.borderColor)}>
                                                        {isRTL ? statusDef.label_ar : statusDef.label_en}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* ═══ SECTION 5: Notes ═══ */}
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
