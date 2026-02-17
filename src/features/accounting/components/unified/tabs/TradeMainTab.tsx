/**
 * 🧾 TradeMainTab — Unified Trade Details Tab
 *
 * Always uses the modern CartItemsView component for all document types.
 * Parses items from data.items or from notes JSON (cart → document save).
 *
 * ✅ Fetches real customers and warehouses from Supabase
 * ✅ Document-level notes/memo field
 * ✅ Per-item currency & exchange rate support
 * ✅ Constitution: Law 2 (services), Law 1 (translations)
 */

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { TradeHeader } from '@/features/trade/components/forms/TradeHeader';
import { CartItemsView, type InvoiceLineItem } from '@/features/trade/components/grids/CartItemsView';
import { TradeDocument } from '@/features/trade/types';
import { ContainerInvoiceSelector } from '@/features/trade/components/ContainerInvoiceSelector';
import { ContainerMainTab } from './ContainerMainTab';
import { ContainerInfoCard } from '@/features/trade/components/shared/ContainerInfoCard';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useCompany } from '@/hooks/useCompany';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    StickyNote, AlertTriangle, CreditCard, Percent,
    CalendarClock, Tag, Loader2, ShieldAlert, CheckCircle2,
    ChevronDown, Building2, Calendar, DollarSign, Warehouse
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeMainTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
    tradeMode?: 'sales' | 'purchase';
}

export const TradeMainTab: React.FC<TradeMainTabProps> = ({
    data,
    mode,
    onChange,
    tradeMode: tradeModeFromProp,
}) => {
    const { isRTL, t, language } = useLanguage();
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const { companyId } = useCompany();
    const { lookupRate } = useExchangeRateLookup();

    // Determine specific trade mode — prop takes priority, then fallback
    const tradeMode = tradeModeFromProp || (data.type?.includes('purchase') ? 'purchase' : 'sales');

    // ─── Smart pricing hook ───
    const currentPartyId = data.party_id || data.customer_id || '';
    const customerPricing = useCustomerPricing(
        tradeMode === 'sales' ? currentPartyId : null,
        companyId
    );

    // ─── Auto-fill currency & due_date when customer changes ───
    const prevPartyRef = useRef<string>('');
    useEffect(() => {
        if (!currentPartyId || currentPartyId === prevPartyRef.current) return;
        if (tradeMode !== 'sales' || customerPricing.isLoading) return;

        prevPartyRef.current = currentPartyId;

        // Auto-fill currency from customer profile
        if (customerPricing.currency && !data.currency) {
            onChange({ currency: customerPricing.currency });
        }

        // Auto-fill due date from payment terms
        if (customerPricing.paymentTermsDays > 0 && !data.due_date) {
            onChange({ due_date: customerPricing.dueDate });
        }

        // Sync pricing metadata into data for save handler
        onChange({
            _creditLimit: customerPricing.creditLimit,
            _balance: customerPricing.balance,
            _isCreditExceeded: customerPricing.isCreditExceeded,
            payment_terms_days: customerPricing.paymentTermsDays,
            discount_percent: customerPricing.discountPercent,
            price_list_id: customerPricing.priceListId,
        });
    }, [currentPartyId, customerPricing.isLoading, customerPricing.currency, customerPricing.dueDate, customerPricing.paymentTermsDays, tradeMode]);

    // Extract user-facing notes (separate from items JSON in notes field)
    const userNotes = useMemo(() => {
        // If we have a dedicated user_notes field, use it
        if (data.user_notes != null) return data.user_notes;
        // Try parsing notes - if it's cart JSON, don't show it as user notes
        if (data.notes) {
            try {
                const parsed = typeof data.notes === 'string' ? JSON.parse(data.notes) : data.notes;
                if (parsed?._source === 'cart') {
                    // It's cart serialized data — extract user_notes from inside if present
                    return parsed.user_notes || '';
                }
            } catch { /* Not JSON, it's plain text notes */ }
            // If notes is not JSON, treat it as user notes
            if (typeof data.notes === 'string') {
                try { JSON.parse(data.notes); return ''; } catch { return data.notes; }
            }
        }
        return '';
    }, [data.notes, data.user_notes]);

    // ─── Parse items: from data.items directly, OR from notes JSON ───
    const resolvedItems = useMemo(() => {
        // Priority 1: direct items array
        if (data.items && data.items.length > 0) return data.items;

        // Priority 2: items serialized in notes JSON (cart → document save)
        if (data.notes) {
            try {
                const parsed = typeof data.notes === 'string' ? JSON.parse(data.notes) : data.notes;
                if (parsed?._source === 'cart' && Array.isArray(parsed.items) && parsed.items.length > 0) {
                    return parsed.items;
                }
            } catch { /* invalid JSON — ignore */ }
        }

        return [];
    }, [data.items, data.notes]);

    // Convert data to TradeDocument format if needed
    const tradeData: Partial<TradeDocument> = {
        ...data,
        items: resolvedItems,
        party_id: data.party_id || data.supplier_id || data.customer_id,
    };

    const handleHeaderChange = (field: string, value: any) => {
        onChange({ [field]: value });
    };

    const isContainer = data.docType === 'trade_container' || data.subType === 'container' || data.type === 'trade_container';

    // ─── Fetch real customers from Supabase ───
    const { data: customersList = [] } = useQuery({
        queryKey: ['trade_customers', companyId, tradeMode],
        queryFn: async () => {
            if (!companyId) return [];
            const table = tradeMode === 'purchase' ? 'suppliers' : 'customers';
            const { data: rows, error } = await supabase
                .from(table)
                .select('id, name_ar, name_en')
                .eq('company_id', companyId)
                .order(language === 'ar' ? 'name_ar' : 'name_en');
            if (error) {
                console.warn(`Failed to fetch ${table}:`, error.message);
                return [];
            }
            return (rows || []).map((r: any) => ({
                id: r.id,
                name: language === 'ar' ? (r.name_ar || r.name_en || '') : (r.name_en || r.name_ar || ''),
            }));
        },
        enabled: !!companyId,
        staleTime: 60000,
    });

    // ─── Fetch real warehouses from Supabase ───
    const { data: warehousesList = [] } = useQuery({
        queryKey: ['trade_warehouses', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: rows, error } = await supabase
                .from('warehouses')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order(language === 'ar' ? 'name_ar' : 'name_en');
            if (error) {
                console.warn('Failed to fetch warehouses:', error.message);
                return [];
            }
            return (rows || []).map((r: any) => ({
                id: r.id,
                name: language === 'ar' ? (r.name_ar || r.name_en || '') : (r.name_en || r.name_ar || ''),
            }));
        },
        enabled: !!companyId,
        staleTime: 60000,
    });

    // ─── Fetch salespersons from user_profiles (for sales mode) ───
    const { data: salespersonsList = [] } = useQuery({
        queryKey: ['trade_salespersons', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: rows, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .eq('company_id', companyId)
                .order('full_name');
            if (error) {
                console.warn('Failed to fetch salespersons:', error.message);
                return [];
            }
            return (rows || []).map((r: any) => ({
                id: r.id,
                name: r.full_name || r.id,
            }));
        },
        enabled: !!companyId && tradeMode === 'sales',
        staleTime: 120000,
    });

    // ─── Map ALL items to InvoiceLineItem format ───
    const lineItems: InvoiceLineItem[] = useMemo(() => {
        return resolvedItems.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            material_id: item.material_id || item.product_id || '',
            material_code: item.material_code || item.item_code || '',
            material_name_ar: item.material_name_ar || item.item_name || item.name_ar || '',
            material_name_en: item.material_name_en || item.item_name_en || item.name_en || '',
            quantity: Number(item.quantity || 0),
            unit: item.unit || 'meter',
            unit_price: Number(item.unit_price || 0),
            discount_percent: Number(item.discount_percent || 0),
            discount_amount: Number(item.discount_amount || 0),
            tax_rate: Number(item.tax_rate || 0),
            tax_amount: Number(item.tax_amount || 0),
            subtotal: Number(item.subtotal || (item.quantity * item.unit_price) || 0),
            total: Number(item.total || item.subtotal || (item.quantity * item.unit_price) || 0),
            currency: item.currency || data.currency || companyCurrency || 'SAR',
            exchange_rate: Number(item.exchange_rate || 1),
            warehouse_id: item.warehouse_id || '',
            warehouse_name_ar: item.warehouse_name_ar || '',
            warehouse_name_en: item.warehouse_name_en || '',
            available_stock: item.available_stock,
            preferred_rolls: item.preferred_rolls || [],
            notes: item.notes,
        }));
    }, [resolvedItems, data.currency, companyCurrency]);

    // ─── Handle items update ───
    const handleItemsChange = useCallback((updatedItems: InvoiceLineItem[]) => {
        // Subtotal = مجموع (كمية × سعر)
        const subtotal = updatedItems.reduce((s, i) => s + Number(i.subtotal || (i.quantity * i.unit_price) || 0), 0);
        // Discount = مجموع خصومات الأصناف
        const discountAmount = updatedItems.reduce((s, i) => s + Number(i.discount_amount || 0), 0);
        // Tax = مجموع ضرائب الأصناف (كل صنف يحمل ضريبته الخاصة)
        const taxAmount = updatedItems.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
        // Total = صافي + ضريبة
        const net = subtotal - discountAmount;
        const total = net + taxAmount;

        onChange({
            items: updatedItems,
            subtotal: subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: total,
            grand_total: total,
        });
    }, [onChange]);

    // Handle container invoice selection
    const handleInvoiceSelection = (ids: string[]) => {
        onChange({
            invoice_ids: ids,
            items: ids.map(id => ({ id, type: 'invoice_link' }))
        });
    };

    // ─── Handle currency change with auto exchange rate ───
    const handleCurrencyChange = useCallback((currency: string) => {
        const rate = lookupRate(currency, companyCurrency);
        onChange({
            currency,
            exchange_rate: rate,
        });
    }, [lookupRate, companyCurrency, onChange]);

    // ─── Container gets its own dedicated tab ───
    if (isContainer) {
        return (
            <ContainerMainTab
                data={data}
                mode={mode}
                onChange={onChange}
                tradeMode={tradeMode}
            />
        );
    }

    // ─── Collapsible header state ───
    // Auto-open in create mode, collapsed in view/edit mode
    const [headerOpen, setHeaderOpen] = useState(mode === 'create');

    // Summary values for collapsed state
    const partyName = data.party_name || data.supplier_name || data.customer_name || '';
    const docDate = data.doc_date || data.date || '';
    const docCurrency = data.currency || companyCurrency || '';
    const docTotal = Number(data.total_amount || data.grand_total || 0);

    return (
        <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
            {/* ═══ Collapsible Header Section ═══ */}
            <Collapsible open={headerOpen} onOpenChange={setHeaderOpen}>
                <Card className={cn(
                    "shadow-sm overflow-hidden transition-all",
                    "border-gray-200/80 dark:border-gray-700/60"
                )}>
                    {/* ─── Collapsed Summary Bar ─── */}
                    <CollapsibleTrigger asChild>
                        <button
                            className={cn(
                                "w-full px-4 py-2.5 flex items-center gap-3 cursor-pointer",
                                "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/60 dark:to-gray-800/40",
                                "hover:brightness-95 transition-colors",
                                isRTL && "flex-row-reverse"
                            )}
                        >
                            <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                            <span className={cn(
                                "text-sm font-semibold text-gray-700 dark:text-gray-200",
                                isRTL ? "text-right" : "text-left"
                            )}>
                                {isRTL ? 'بيانات المستند' : 'Document Details'}
                            </span>

                            {/* Summary badges — visible always for quick reference */}
                            <div className={cn("flex items-center gap-1.5 ms-auto", isRTL && "flex-row-reverse")}>
                                {partyName && (
                                    <Badge variant="secondary" className="text-[10px] max-w-[140px] truncate">
                                        {partyName}
                                    </Badge>
                                )}
                                {docDate && (
                                    <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {new Date(docDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                    </Badge>
                                )}
                                {docCurrency && (
                                    <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                                        <DollarSign className="w-2.5 h-2.5" />
                                        {docCurrency}
                                    </Badge>
                                )}
                                {docTotal > 0 && (
                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        {docTotal.toLocaleString()} {docCurrency}
                                    </Badge>
                                )}
                            </div>

                            <ChevronDown className={cn(
                                "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                                headerOpen && "rotate-180"
                            )} />
                        </button>
                    </CollapsibleTrigger>

                    {/* ─── Expanded Content ─── */}
                    <CollapsibleContent>
                        <div className="p-4 pt-2 space-y-4 border-t border-gray-100 dark:border-gray-800">
                            {/* 1. Header Portion */}
                            <TradeHeader
                                data={tradeData}
                                mode={tradeMode}
                                type={data.subType || 'order'}
                                onChange={handleHeaderChange}
                                partyList={customersList}
                                warehouseList={warehousesList}
                                salespersonList={salespersonsList}
                                baseCurrency={companyCurrency}
                                onCurrencyChange={handleCurrencyChange}
                                viewMode={mode}
                            />

                            {/* 1.5 Customer Pricing Info Bar — only for Sales with selected customer */}
                            {tradeMode === 'sales' && currentPartyId && (
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs flex-wrap",
                                    customerPricing.isCreditExceeded
                                        ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                                        : "bg-blue-50/60 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-800/40"
                                )}>
                                    {customerPricing.isLoading ? (
                                        <span className="flex items-center gap-1.5 text-gray-400">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            {isRTL ? 'جارِ تحميل بيانات العميل...' : 'Loading customer data...'}
                                        </span>
                                    ) : (
                                        <>
                                            {/* Price List Badge */}
                                            {customerPricing.priceListName && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="gap-1 text-[10px] bg-white/80 dark:bg-gray-800">
                                                                <Tag className="w-2.5 h-2.5 text-purple-500" />
                                                                {customerPricing.priceListName}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">
                                                            {isRTL ? `مصدر: ${customerPricing.priceListSource === 'customer' ? 'العميل مباشرة' : customerPricing.priceListSource === 'group' ? 'مجموعة العميل' : 'القائمة الافتراضية'}` : `Source: ${customerPricing.priceListSource}`}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}

                                            {/* Discount */}
                                            {customerPricing.discountPercent > 0 && (
                                                <Badge variant="outline" className="gap-1 text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                                                    <Percent className="w-2.5 h-2.5" />
                                                    {customerPricing.discountPercent}%
                                                    <span className="text-[9px] opacity-70">
                                                        ({isRTL ? (customerPricing.discountSource === 'customer' ? 'عميل' : 'مجموعة') : customerPricing.discountSource})
                                                    </span>
                                                </Badge>
                                            )}

                                            {/* Credit Status */}
                                            {customerPricing.creditLimit > 0 && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className={cn(
                                                                "gap-1 text-[10px]",
                                                                customerPricing.isCreditExceeded
                                                                    ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700"
                                                                    : "bg-white/80 dark:bg-gray-800"
                                                            )}>
                                                                {customerPricing.isCreditExceeded
                                                                    ? <ShieldAlert className="w-2.5 h-2.5 text-red-500" />
                                                                    : <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                                                }
                                                                <CreditCard className="w-2.5 h-2.5" />
                                                                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(customerPricing.availableCredit)}
                                                                <span className="text-[9px] opacity-60">/ {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(customerPricing.creditLimit)}</span>
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">
                                                            <div className="text-xs space-y-1">
                                                                <div>{isRTL ? 'حد الائتمان:' : 'Credit Limit:'} {customerPricing.creditLimit.toLocaleString()}</div>
                                                                <div>{isRTL ? 'الرصيد الحالي:' : 'Balance:'} {customerPricing.balance.toLocaleString()}</div>
                                                                <div className={customerPricing.isCreditExceeded ? 'text-red-400 font-bold' : 'text-green-400'}>
                                                                    {isRTL ? 'المتاح:' : 'Available:'} {customerPricing.availableCredit.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}

                                            {/* Payment Terms */}
                                            {customerPricing.paymentTermsDays > 0 && (
                                                <Badge variant="outline" className="gap-1 text-[10px] bg-white/80 dark:bg-gray-800">
                                                    <CalendarClock className="w-2.5 h-2.5 text-orange-500" />
                                                    {customerPricing.paymentTermsDays} {isRTL ? 'يوم' : 'days'}
                                                </Badge>
                                            )}

                                            {/* Credit exceeded warning */}
                                            {customerPricing.isCreditExceeded && (
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium ms-auto">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {isRTL ? 'تجاوز حد الائتمان!' : 'Credit limit exceeded!'}
                                                </span>
                                            )}

                                            {/* Group name */}
                                            {customerPricing.groupName && (
                                                <span className="text-[10px] text-gray-400 ms-auto">
                                                    {customerPricing.groupName}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* 2. Document Notes / Memo */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-2">
                                    <StickyNote className="w-3.5 h-3.5" />
                                    {isRTL ? 'ملاحظات القيد' : 'Document Notes'}
                                </Label>
                                <Textarea
                                    value={userNotes}
                                    onChange={(e) => onChange({ user_notes: e.target.value })}
                                    placeholder={isRTL ? 'أضف ملاحظات على المستند...' : 'Add notes to this document...'}
                                    className="min-h-[50px] max-h-[100px] bg-white dark:bg-gray-800 text-sm resize-y"
                                    readOnly={mode === 'view'}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* ═══ Container Info Card — outside collapsible for visibility ═══ */}
            {tradeMode === 'purchase' && (data.container_id || data.container_number) && (
                <ContainerInfoCard
                    containerId={data.container_id}
                    containerNumber={data.container_number}
                    containerStatus={data.container_status}
                />
            )}

            {/* 3. Items Grid — Always uses CartItemsView (modern component) */}
            <div className="mt-4">
                {isContainer ? (
                    <ContainerInvoiceSelector
                        supplierId={tradeData.party_id || ''}
                        selectedInvoiceIds={data.invoice_ids || tradeData.items?.map((i: any) => i.id) || []}
                        onSelectionChange={handleInvoiceSelection}
                        readOnly={mode === 'view'}
                    />
                ) : (
                    <CartItemsView
                        items={lineItems}
                        onItemsChange={handleItemsChange}
                        readOnly={mode === 'view'}
                        currency={data.currency || companyCurrency || 'SAR'}
                        companyCurrency={companyCurrency || 'SAR'}
                        showDiscount={true}
                        showTax={true}
                        customerId={currentPartyId || undefined}
                        priceResolver={tradeMode === 'sales' && currentPartyId ? customerPricing.resolvePrice : undefined}
                    />
                )}
            </div>
        </div>
    );
};
