/**
 * ════════════════════════════════════════════════════════════════
 * 💰 Material Pricing Tab V2 — Professional Table-Based Layout
 * تبويب الأسعار — جدول التكاليف + جدول أسعار البيع + ضوابط
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DollarSign, Package, Tag, ShoppingCart,
    Store, Globe, Factory, Calculator, ShieldCheck, AlertCircle,
    Loader2, Layers, Crown, ChevronRight, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SheetMode } from '../types';

// ─── Formatters ────────────────────────────────────────────
const FMT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n: number) => FMT.format(n);
const FMTP = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtP = (n: number) => FMTP.format(n);

// ─── Currency metadata ────────────────────────────────────
const CURRENCIES: Record<string, { symbol: string; ar: string; en: string }> = {
    USD: { symbol: '$', ar: 'دولار أمريكي', en: 'US Dollar' },
    EUR: { symbol: '€', ar: 'يورو', en: 'Euro' },
    SAR: { symbol: 'ر.س', ar: 'ريال سعودي', en: 'Saudi Riyal' },
    AED: { symbol: 'د.إ', ar: 'درهم إماراتي', en: 'UAE Dirham' },
    TRY: { symbol: '₺', ar: 'ليرة تركية', en: 'Turkish Lira' },
    UAH: { symbol: '₴', ar: 'هريفنيا أوكرانية', en: 'Ukrainian Hryvnia' },
    EGP: { symbol: 'ج.م', ar: 'جنيه مصري', en: 'Egyptian Pound' },
};

interface MaterialPricingTabProps {
    data: any;
    mode?: SheetMode;
    onChange?: (updates: any) => void;
}

export function MaterialPricingTab({ data, mode = 'view', onChange }: MaterialPricingTabProps) {
    const { language } = useLanguage();
    const { companyId } = useAuth();
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isRTL = language === 'ar';
    const isReadOnly = mode === 'view';
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [supplierExpanded, setSupplierExpanded] = useState(false);

    const materialCurrency = data?.currency || companyCurrency || 'USD';
    const currSymbol = CURRENCIES[materialCurrency]?.symbol || materialCurrency;

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) onChange({ [field]: value });
    };

    // ═══════════ Fetch pricing data (parallel) ═══════════
    const { data: pricingData, isLoading } = useCachedQuery({
        queryKey: ['material-pricing-v2', companyId, data?.id],
        queryFn: async () => {
            const materialId = data!.id;
            const [rollsRes] = await Promise.all([
                // 1. Roll costs
                supabase.from('fabric_rolls')
                    .select('cost_per_meter, estimated_landed_cost, final_landed_cost')
                    .eq('material_id', materialId)
                    .eq('company_id', companyId!)
                    .in('status', ['available', 'reserved', 'partial']),
            ]);

            // 2. Supplier purchase history from containers
            type SupplierHistory = { supplierName: string; unitCost: number; containerNumber: string; date: string };
            let supplierHistory: SupplierHistory[] = [];
            try {
                const { data: ciRows } = await supabase
                    .from('container_items')
                    .select('unit_cost, created_at, container_id')
                    .eq('material_id', materialId)
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (ciRows && ciRows.length > 0) {
                    const containerIds = [...new Set(ciRows.map((r: any) => r.container_id))];
                    const { data: containers } = await supabase
                        .from('containers')
                        .select('id, container_number, shipment_number, supplier_id, order_date')
                        .in('id', containerIds);
                    const cMap = new Map((containers || []).map((c: any) => [c.id, c]));
                    const supplierIds = [...new Set((containers || []).map((c: any) => c.supplier_id).filter(Boolean))];
                    let sMap = new Map<string, any>();
                    if (supplierIds.length > 0) {
                        const { data: suppliers } = await supabase
                            .from('suppliers')
                            .select('id, name_ar, name_en, code')
                            .in('id', supplierIds);
                        sMap = new Map((suppliers || []).map((s: any) => [s.id, s]));
                    }
                    supplierHistory = ciRows.map((ci: any) => {
                        const c = cMap.get(ci.container_id);
                        const s = c?.supplier_id ? sMap.get(c.supplier_id) : null;
                        return {
                            supplierName: s ? (isRTL ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)) : (isRTL ? 'غير محدد' : 'Unknown'),
                            unitCost: Number(ci.unit_cost || 0),
                            containerNumber: c?.container_number || c?.shipment_number || '',
                            date: (c?.order_date || ci.created_at || '').slice(0, 10),
                        };
                    });
                }
            } catch (e) {
                console.warn('[MaterialPricingTab] supplier history query failed:', e);
            }

            // 2b. Fallback: default supplier from fabric_materials
            let defaultSupplierName = '';
            if (data?.default_supplier_id) {
                try {
                    const { data: sup } = await supabase
                        .from('suppliers')
                        .select('name_ar, name_en, code')
                        .eq('id', data.default_supplier_id)
                        .maybeSingle();
                    if (sup) {
                        defaultSupplierName = isRTL ? (sup.name_ar || sup.name_en || sup.code) : (sup.name_en || sup.name_ar || sup.code);
                    }
                } catch { /* ignore */ }
            }

            // Roll avg cost
            const rolls = rollsRes.data || [];
            const rollCount = rolls.length;
            const avgCostPerMeter = rollCount > 0
                ? rolls.reduce((s, r) => s + Number(r.cost_per_meter || 0), 0) / rollCount
                : 0;
            const avgLandedCost = rollCount > 0
                ? rolls.reduce((s, r) => s + Number(r.final_landed_cost || r.estimated_landed_cost || r.cost_per_meter || 0), 0) / rollCount
                : 0;

            // Price lists — separate queries to avoid 400 on !inner join
            let priceLists: { listName: string; listCode: string; price: number; minQty: number }[] = [];
            try {
                const { data: plItems } = await supabase
                    .from('price_list_items')
                    .select('price, min_quantity, price_list_id')
                    .eq('product_id', materialId);
                if (plItems && plItems.length > 0) {
                    const listIds = [...new Set(plItems.map((p: any) => p.price_list_id))];
                    const { data: lists } = await supabase
                        .from('price_lists')
                        .select('id, code, name_ar, name_en, is_active')
                        .in('id', listIds)
                        .eq('is_active', true);
                    const listMap = new Map((lists || []).map((l: any) => [l.id, l]));
                    priceLists = plItems
                        .filter((p: any) => listMap.has(p.price_list_id))
                        .map((p: any) => {
                            const l = listMap.get(p.price_list_id)!;
                            return {
                                listName: isRTL ? (l.name_ar || l.name_en) : (l.name_en || l.name_ar),
                                listCode: l.code || '',
                                price: Number(p.price || 0),
                                minQty: Number(p.min_quantity || 0),
                            };
                        });
                }
            } catch (e) {
                console.warn('[MaterialPricingTab] price_lists query failed:', e);
            }

            return { avgCostPerMeter, avgLandedCost, rollCount, priceLists, supplierHistory, defaultSupplierName };
        },
        enabled: !!companyId && !!data?.id,
        staleTime: 2 * 60 * 1000,
    });

    // ═══════════ Computed values ═══════════
    const cf = data?.custom_fields || {};
    const purchasePrice = Number(data?.purchase_price || 0);
    const costPrice = Number(data?.cost_price || cf._cost_price || 0);
    const costPerMeter = Number(data?.cost_per_meter || 0);
    const sellingPrice = Number(data?.selling_price || 0);
    const wholesalePrice = Number(data?.wholesale_price || cf._wholesale_price || 0);
    const halfWholesalePrice = Number(data?.half_wholesale_price || cf._half_wholesale_price || 0);
    const specialPrice = Number(data?.special_price || cf._special_price || 0);
    const onlinePrice = Number(data?.online_price || 0);
    const actualCost = pricingData?.avgLandedCost || pricingData?.avgCostPerMeter || Number(data?.avg_cost_per_unit || 0);
    const baseCost = actualCost > 0 ? actualCost : (costPrice > 0 ? costPrice : purchasePrice);

    // Unit label based on material unit
    const unitKey = (data?.unit || 'meter').toLowerCase();
    const unitLabel = { meter: { ar: 'متر', en: 'meter' }, yard: { ar: 'يارد', en: 'yard' }, kg: { ar: 'كغ', en: 'kg' }, piece: { ar: 'قطعة', en: 'piece' } }[unitKey] || { ar: 'وحدة', en: 'unit' };

    const calcMargin = (price: number) => baseCost > 0 ? ((price - baseCost) / baseCost * 100) : 0;

    const MarginBadge = ({ val }: { val: number }) => {
        if (val === 0) return <span className="text-gray-300 text-xs">—</span>;
        return (
            <Badge variant="outline" className={cn('text-[10px] font-mono px-1.5 h-5 border',
                val >= 20 ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
                : val >= 10 ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400'
                : 'border-red-300 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
            )}>
                {val > 0 ? '+' : ''}{fmtP(val)}%
            </Badge>
        );
    };

    // ═══════════ Price Input (inline) ═══════════
    const PriceInput = ({ id, value, field, placeholder }: { id: string; value: number; field: string; placeholder?: string }) => (
        <div className="relative w-28">
            <Input
                id={id} type="number" step="0.01" min="0"
                value={value || ''} placeholder={placeholder || '0.00'}
                onChange={e => handleChange(field, parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="h-8 text-sm font-mono ps-7 pe-1 text-end"
            />
            <span className="absolute start-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">{currSymbol}</span>
        </div>
    );

    // ═══════════ Render ═══════════
    return (
        <div className="space-y-5 pb-6" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══ Currency Badge ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('عملة المادة', 'Material Currency')}
                    </span>
                </div>
                {isReadOnly ? (
                    <Badge variant="secondary" className="text-sm gap-1 px-3 py-1 font-mono">
                        {currSymbol} {CURRENCIES[materialCurrency]?.[isRTL ? 'ar' : 'en'] || materialCurrency}
                    </Badge>
                ) : (
                    <Select value={materialCurrency} onValueChange={v => handleChange('currency', v)}>
                        <SelectTrigger className="w-52 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.entries(CURRENCIES).map(([code, c]) => (
                                <SelectItem key={code} value={code}>
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono text-gray-500">{c.symbol}</span>
                                        {isRTL ? c.ar : c.en} ({code})
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* ═══════════ COST BREAKDOWN TABLE ═══════════ */}
            <Card className="border-orange-200 dark:border-orange-800/50">
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Calculator className="w-4 h-4 text-orange-500" />
                        {t('هيكل التكلفة', 'Cost Breakdown')}
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-orange-50/50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30">
                                <th className={cn('px-4 py-2.5 text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide', isRTL ? 'text-right' : 'text-left')}>
                                    {t('البند', 'Item')}
                                </th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-orange-700 dark:text-orange-400 text-end uppercase tracking-wide w-32">
                                    {t('المبلغ', 'Amount')} ({materialCurrency})
                                </th>
                                <th className={cn('px-4 py-2.5 text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide w-44', isRTL ? 'text-right' : 'text-left')}>
                                    {t('المورّد', 'Supplier')}
                                </th>
                                <th className={cn('px-4 py-2.5 text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide w-28', isRTL ? 'text-right' : 'text-left')}>
                                    {t('ملاحظة', 'Note')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Factory Price — expandable with supplier history */}
                            <tr
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-orange-50/30 dark:hover:bg-orange-900/5 cursor-pointer"
                                onClick={() => setSupplierExpanded(!supplierExpanded)}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className={cn('w-4 h-4 text-orange-400 flex-shrink-0 transition-transform duration-200', !supplierExpanded && (isRTL ? 'rotate-90' : '-rotate-90'))} />
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{t('سعر المعمل (FOB)', 'Factory Price (FOB)')}</span>
                                        {(pricingData?.supplierHistory?.length || 0) > 0 && (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-orange-200 text-orange-500">
                                                {pricingData!.supplierHistory.length}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                            {currSymbol} {fmt(purchasePrice)}
                                        </span>
                                    ) : <PriceInput id="purchase_price" value={purchasePrice} field="purchase_price" />}
                                </td>
                                <td className="px-4 py-3">
                                    {(() => {
                                        const name = pricingData?.supplierHistory?.[0]?.supplierName || pricingData?.defaultSupplierName || '';
                                        return name ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                                                <Factory className="w-3 h-3" />
                                                {name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">—</span>
                                        );
                                    })()}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {t(`/ ${unitLabel.ar}`, `/ ${unitLabel.en}`)}
                                </td>
                            </tr>

                            {/* Supplier History Accordion */}
                            {supplierExpanded && (
                                <>
                                    {(pricingData?.supplierHistory?.length || 0) > 0 ? (
                                        pricingData!.supplierHistory.map((sh, i) => (
                                            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 bg-orange-50/20 dark:bg-orange-900/5">
                                                <td className="px-4 py-2 ps-10">
                                                    <span className="text-xs text-gray-500">{sh.containerNumber || `#${i + 1}`}</span>
                                                </td>
                                                <td className="px-4 py-2 text-end">
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                                        {currSymbol} {fmt(sh.unitCost)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{sh.supplierName}</span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="text-[10px] font-mono text-gray-400">{sh.date}</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-orange-50/20 dark:bg-orange-900/5">
                                            <td colSpan={4} className="px-4 py-3 ps-10 text-center">
                                                <span className="text-xs text-gray-400">
                                                    {pricingData?.defaultSupplierName
                                                        ? t(`المورّد الافتراضي: ${pricingData.defaultSupplierName}`, `Default supplier: ${pricingData.defaultSupplierName}`)
                                                        : t('لا يوجد سجل مشتريات بعد', 'No purchase history yet')
                                                    }
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}



                            {/* Production Cost */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-purple-50/30 dark:hover:bg-purple-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('سعر التكلفة', 'Cost Price')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono', costPrice > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-gray-300')}>
                                            {costPrice > 0 ? `${currSymbol} ${fmt(costPrice)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="cost_price" value={costPrice} field="cost_price" />}
                                </td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {t(`سعر التكلفة / ${unitLabel.ar}`, `Cost price / ${unitLabel.en}`)}
                                </td>
                            </tr>

                            {/* Production/Manufacturing Cost */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-purple-50/30 dark:hover:bg-purple-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('تكلفة الإنتاج', 'Production Cost')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono', costPerMeter > 0 ? 'font-semibold text-purple-600 dark:text-purple-400' : 'text-gray-300')}>
                                            {costPerMeter > 0 ? `${currSymbol} ${fmt(costPerMeter)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="cost_per_meter" value={costPerMeter} field="cost_per_meter" />}
                                </td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {t(`تكلفة الإنتاج / ${unitLabel.ar}`, `Production cost / ${unitLabel.en}`)}
                                </td>
                            </tr>

                            {/* Actual Cost */}
                            <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{t('التكلفة الفعلية', 'Actual Cost')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    <span className={cn('font-mono font-bold text-base', actualCost > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300')}>
                                        {actualCost > 0 ? `${currSymbol} ${fmt(actualCost)}` : '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3">
                                    {(pricingData?.rollCount || 0) > 0 ? (
                                        <span className="text-[10px] text-gray-500">
                                            {t(`متوسط ${pricingData!.rollCount} رولون / ${unitLabel.ar}`, `Avg of ${pricingData!.rollCount} rolls / ${unitLabel.en}`)}
                                        </span>
                                    ) : actualCost > 0 ? (
                                        <span className="text-[10px] text-gray-500">
                                            {t(`لكل ${unitLabel.ar}`, `Per ${unitLabel.en}`)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">{t('لم تُحسب بعد', 'Not calculated yet')}</span>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* ═══════════ SELLING PRICES TABLE ═══════════ */}
            <Card className="border-emerald-200 dark:border-emerald-800/50">
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        {t('أسعار البيع', 'Selling Prices')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30">
                                <th className={cn('px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide', isRTL ? 'text-right' : 'text-left')}>
                                    {t('نوع السعر', 'Price Type')}
                                </th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-end uppercase tracking-wide w-32">
                                    {t('السعر', 'Price')} ({materialCurrency})
                                </th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center uppercase tracking-wide w-24">
                                    {t('هامش %', 'Margin %')}
                                </th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center uppercase tracking-wide w-20">
                                    {t('أقل كمية', 'Min Qty')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Retail */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('سعر التجزئة', 'Retail Price')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono font-semibold', sellingPrice > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300')}>
                                            {sellingPrice > 0 ? `${currSymbol} ${fmt(sellingPrice)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="selling_price" value={sellingPrice} field="selling_price" />}
                                </td>
                                <td className="px-4 py-3 text-center"><MarginBadge val={calcMargin(sellingPrice)} /></td>
                                <td className="px-4 py-3 text-center text-gray-400">—</td>
                            </tr>
                            {/* Wholesale */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('سعر الجملة', 'Wholesale Price')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono font-semibold', wholesalePrice > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300')}>
                                            {wholesalePrice > 0 ? `${currSymbol} ${fmt(wholesalePrice)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="wholesale_price" value={wholesalePrice} field="wholesale_price" />}
                                </td>
                                <td className="px-4 py-3 text-center"><MarginBadge val={calcMargin(wholesalePrice)} /></td>
                                <td className="px-4 py-3 text-center text-gray-400">—</td>
                            </tr>
                            {/* Online */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('سعر الأونلاين', 'Online Price')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono font-semibold', onlinePrice > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300')}>
                                            {onlinePrice > 0 ? `${currSymbol} ${fmt(onlinePrice)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="online_price" value={onlinePrice} field="online_price" />}
                                </td>
                                <td className="px-4 py-3 text-center"><MarginBadge val={calcMargin(onlinePrice)} /></td>
                                <td className="px-4 py-3 text-center text-gray-400">—</td>
                            </tr>

                            {/* Half Wholesale */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-teal-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('سعر نصف الجملة', 'Semi-Wholesale')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono font-semibold', halfWholesalePrice > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300')}>
                                            {halfWholesalePrice > 0 ? `${currSymbol} ${fmt(halfWholesalePrice)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="half_wholesale_price" value={halfWholesalePrice} field="half_wholesale_price" />}
                                </td>
                                <td className="px-4 py-3 text-center"><MarginBadge val={calcMargin(halfWholesalePrice)} /></td>
                                <td className="px-4 py-3 text-center text-gray-400">—</td>
                            </tr>

                            {/* Special Price */}
                            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5">
                                <td className="px-4 py-3 flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('السعر الخاص', 'Special Price')}</span>
                                </td>
                                <td className="px-4 py-3 text-end">
                                    {isReadOnly ? (
                                        <span className={cn('font-mono font-semibold', specialPrice > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300')}>
                                            {specialPrice > 0 ? `${currSymbol} ${fmt(specialPrice)}` : '—'}
                                        </span>
                                    ) : <PriceInput id="special_price" value={specialPrice} field="special_price" />}
                                </td>
                                <td className="px-4 py-3 text-center"><MarginBadge val={calcMargin(specialPrice)} /></td>
                                <td className="px-4 py-3 text-center text-gray-400">—</td>
                            </tr>

                            {/* ─── Price Lists Separator ─── */}
                            {(pricingData?.priceLists?.length || 0) > 0 && (
                                <>
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/10">
                                            <div className="flex items-center gap-2">
                                                <Crown className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                                    {t('قوائم الأسعار', 'Price Lists')}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-indigo-200 text-indigo-500">
                                                    {pricingData!.priceLists.length}
                                                </Badge>
                                            </div>
                                        </td>
                                    </tr>
                                    {pricingData!.priceLists.map((pl, i) => (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/5">
                                            <td className="px-4 py-2.5 flex items-center gap-2">
                                                <ChevronRight className={cn('w-3.5 h-3.5 text-indigo-300 flex-shrink-0', isRTL && 'rotate-180')} />
                                                <span className="text-gray-700 dark:text-gray-300">{pl.listName || pl.listCode}</span>
                                                {pl.listCode && (
                                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                        {pl.listCode}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-end">
                                                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                                    {currSymbol} {fmt(pl.price)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center"><MarginBadge val={calcMargin(pl.price)} /></td>
                                            <td className="px-4 py-2.5 text-center">
                                                {pl.minQty > 0 ? (
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{pl.minQty}</span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}

                            {/* Empty price lists notice */}
                            {!isLoading && (pricingData?.priceLists?.length || 0) === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-center text-xs text-gray-400">
                                        {t('لا توجد قوائم أسعار تحتوي هذه المادة', 'No price lists include this material')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* ═══════════ PRICING CONTROLS ═══════════ */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="w-4 h-4 text-red-500" />
                        {t('ضوابط التسعير', 'Pricing Controls')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="min_price" className="text-xs font-medium text-gray-500">
                                {t('أقل سعر مسموح', 'Minimum Allowed Price')}
                            </Label>
                            <div className="relative">
                                <Input id="min_price" type="number" step="0.01" min="0"
                                    value={data?.min_price || ''} placeholder="0.00"
                                    onChange={e => handleChange('min_price', parseFloat(e.target.value) || 0)}
                                    disabled={isReadOnly} className="h-8 text-sm ps-7 font-mono" />
                                <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currSymbol}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="max_discount_percent" className="text-xs font-medium text-gray-500">
                                {t('أقصى نسبة خصم', 'Maximum Discount')}
                            </Label>
                            <div className="relative">
                                <Input id="max_discount_percent" type="number" step="0.5" min="0" max="100"
                                    value={data?.max_discount_percent || ''} placeholder="0"
                                    onChange={e => handleChange('max_discount_percent', parseFloat(e.target.value) || 0)}
                                    disabled={isReadOnly} className="h-8 text-sm pe-7 font-mono" />
                                <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Info Note ═══ */}
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    {t(
                        'التكلفة الفعلية تُحسب من متوسط تكلفة الرولونات المتاحة. هامش الربح يُحسب نسبة للتكلفة الفعلية أو سعر الشراء. كل الأسعار بعملة المادة.',
                        'Actual cost = average of available rolls. Margin is computed relative to actual cost or purchase price. All prices in material currency.'
                    )}
                </p>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// MaterialSalesTab — kept inline for backward compatibility
// ────────────────────────────────────────────────────────────
export function MaterialSalesTab({ data }: { data: any }) {
    const { language } = useLanguage();
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;
    return (
        <div className="text-center py-12 text-gray-400 space-y-2">
            <ShoppingCart className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-medium">{t('سيتم ربط فواتير المبيعات قريباً', 'Sales invoices will be linked soon')}</p>
        </div>
    );
}

export function MaterialPurchasesTab({ data }: { data: any }) {
    const { language } = useLanguage();
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;
    return (
        <div className="text-center py-12 text-gray-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-medium">{t('سيتم ربط أوامر الشراء قريباً', 'Purchase orders will be linked soon')}</p>
        </div>
    );
}

// Re-export MaterialAnalyticsTab from its standalone file
export { MaterialAnalyticsTab } from './MaterialAnalyticsTab';
