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
import { DeliveryOutputView } from '@/features/trade/components/grids/DeliveryOutputView';
import { TradeDocument } from '@/features/trade/types';
import { ContainerInvoiceSelector } from '@/features/trade/components/ContainerInvoiceSelector';
import { ContainerMainTab } from './ContainerMainTab';
import { ContainerInfoCard } from '@/features/trade/components/shared/ContainerInfoCard';
import { DeliveryProgressBanner } from '@/features/trade/components/DeliveryProgressBanner';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useCompany } from '@/hooks/useCompany';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useTaxDefaults, resolveItemTaxRate, computeTaxAmount } from '@/features/trade/hooks/useTaxDefaults';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getTablePreferences, debouncedSavePreferences } from '@/services/tablePreferencesService';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    StickyNote, AlertTriangle, CreditCard, Percent,
    CalendarClock, Tag, Loader2, ShieldAlert, CheckCircle2,
    ChevronDown, Building2, Calendar, DollarSign, Warehouse, Truck,
    Lock, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeMainTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
    tradeMode?: 'sales' | 'purchase' | 'transfer';
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
    const { supportedCurrencies } = useAccountingSettings();
    const { lookupRate, lookupRateAsync } = useExchangeRateLookup();

    // ─── Tax Defaults (for tax reconciliation on load) ───
    const { data: taxDefaults } = useTaxDefaults(companyId);
    const companyTaxRate = taxDefaults?.isEnabled ? taxDefaults.rate : 0;
    const companyTaxEnabled = taxDefaults?.isEnabled ?? false;

    // Determine specific trade mode — prop takes priority, then fallback
    const tradeMode = tradeModeFromProp || (data.type?.includes('purchase') ? 'purchase' : 'sales');
    const isTransfer = tradeMode === 'transfer';

    // ─── Load Trade Defaults on Create ───
    const tradeDefaultsAppliedRef = useRef(false);
    useEffect(() => {
        if (mode !== 'create' || tradeDefaultsAppliedRef.current) return;
        tradeDefaultsAppliedRef.current = true;

        (async () => {
            try {
                const prefs = await getTablePreferences(`trade_defaults_${tradeMode}`);
                if (!prefs) return;
                const defaults = (prefs as any).custom_data || (prefs as any).columnVisibility || {};
                if (!defaults || typeof defaults !== 'object') return;

                const updates: Record<string, any> = {};

                // Apply receipt_mode default (purchase only)
                if (tradeMode === 'purchase' && defaults.receipt_mode && !data.receipt_mode) {
                    updates.receipt_mode = defaults.receipt_mode;
                }

                // Apply auto_update_stock default
                if (defaults.auto_update_stock !== undefined && data.auto_update_stock === undefined) {
                    updates.auto_update_stock = defaults.auto_update_stock;
                }

                // Apply default warehouse
                if (defaults.stock_warehouse_id && !data.stock_warehouse_id) {
                    updates.stock_warehouse_id = defaults.stock_warehouse_id;
                }

                // ═══ Transfer: auto-fill from_warehouse from user defaults ═══
                if (tradeMode === 'transfer' && defaults.from_warehouse_id && !data.from_warehouse_id && !data.warehouse_id) {
                    updates.warehouse_id = defaults.from_warehouse_id;
                    updates.from_warehouse_id = defaults.from_warehouse_id;
                    console.log(`[TradeMainTab] 🏭 Applied default from_warehouse:`, defaults.from_warehouse_id);
                }

                if (Object.keys(updates).length > 0) {
                    console.log(`[TradeMainTab] 📋 Applied trade defaults:`, updates);
                    onChange(updates);
                }
            } catch (e) {
                console.warn('[TradeMainTab] Could not load trade defaults:', e);
            }
        })();
    }, [mode, tradeMode]); // Only on mount for create mode

    // ─── Save Trade Defaults when settings change ───
    const prevAutoStockRef = useRef<boolean | undefined>(undefined);
    useEffect(() => {
        // Skip on initial load and non-interactive modes
        if (mode === 'view') return;
        if (prevAutoStockRef.current === undefined) {
            prevAutoStockRef.current = data.auto_update_stock;
            return;
        }
        // Save preferences when auto_update_stock or related fields change
        const prefsPayload: Record<string, any> = {
            auto_update_stock: data.auto_update_stock || false,
            stock_warehouse_id: data.warehouse_id || '',
            receipt_mode: data.receipt_mode || 'direct',
        };
        // ═══ Transfer: persist from_warehouse choice as default ═══
        if (isTransfer && (data.warehouse_id || data.from_warehouse_id)) {
            prefsPayload.from_warehouse_id = data.from_warehouse_id || data.warehouse_id || '';
        }
        debouncedSavePreferences(`trade_defaults_${tradeMode}`, {
            columnVisibility: prefsPayload,
        } as any, 2000);
        prevAutoStockRef.current = data.auto_update_stock;
    }, [data.auto_update_stock, data.warehouse_id, data.from_warehouse_id, data.receipt_mode, tradeMode, mode, isTransfer]);

    // ═══ Transfer Gate: both warehouses must be selected before items ═══
    const transferWarehousesReady = !isTransfer || (
        !!(data.warehouse_id || data.from_warehouse_id) && !!data.to_warehouse_id
    );

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
    // For sales: delivered, posted, in_delivery
    // For purchases: received, partially_received, in_receiving, posted
    const purchaseReceiptStages = ['received', 'partially_received', 'in_receiving', 'posted'];
    const salesDeliveryStages = ['delivered', 'posted', 'in_delivery'];
    const isDeliveredStage = tradeMode === 'purchase'
        ? purchaseReceiptStages.includes(data.stage || '')
        : salesDeliveryStages.includes(data.stage || '');

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
        // 🌍 International purchases: override stored tax values to 0
        const isInternationalLoad = tradeMode === 'purchase' && data.receipt_mode === 'international';

        return resolvedItems.map((item: any) => {
            const sub = Number(item.subtotal || (item.quantity * item.unit_price) || 0);
            const disc = Number(item.discount_amount || 0);
            const taxRate = isInternationalLoad ? 0 : Number(item.tax_rate || 0);
            const taxAmt  = isInternationalLoad ? 0 : Number(item.tax_amount || 0);
            const total   = isInternationalLoad ? (sub - disc) : Number(item.total || sub);

            return {
                id: item.id || crypto.randomUUID(),
                material_id: item.material_id || item.product_id || '',
                material_code: item.material_code || item.item_code || '',
                material_name_ar: item.material_name_ar || item.description_ar || item.description || item.item_name || item.name_ar || '',
                material_name_en: item.material_name_en || item.item_name_en || item.name_en || '',
                quantity: Number(item.quantity || 0),
                unit: item.unit || 'meter',
                unit_price: Number(item.unit_price || 0),
                discount_percent: Number(item.discount_percent || 0),
                discount_amount: disc,
                tax_rate: taxRate,
                tax_amount: taxAmt,
                subtotal: sub,
                total: total,
                currency: item.currency || data.currency || companyCurrency || 'SAR',
                exchange_rate: Number(item.exchange_rate || 1),
                warehouse_id: item.warehouse_id || '',
                warehouse_name_ar: item.warehouse_name_ar || '',
                warehouse_name_en: item.warehouse_name_en || '',
                available_stock: item.available_stock,
                preferred_rolls: item.preferred_rolls || [],
                notes: item.notes,
                // Delivery/Receipt tracking — map received_qty (purchases) → delivered_qty
                delivered_qty: Number(item.delivered_qty || item.received_qty || 0),
                cost_price: Number(item.cost_price || 0),
                delivery_rolls: item.delivery_rolls || [],
            };
        });
    }, [resolvedItems, data.currency, companyCurrency, tradeMode, data.receipt_mode]);

    // ─── Handle items update ───
    const handleItemsChange = useCallback((updatedItems: InvoiceLineItem[]) => {
        const isInternational = tradeMode === 'purchase' && data.receipt_mode === 'international';

        // 🌍 International: strip tax from individual items BEFORE calculations & save
        if (isInternational) {
            updatedItems = updatedItems.map(item => ({
                ...item,
                tax_rate: 0,
                tax_amount: 0,
                total: (Number(item.subtotal) || 0) - (Number(item.discount_amount) || 0),
            }));
        }

        // Subtotal = مجموع (كمية × سعر)
        const subtotal = updatedItems.reduce((s, i) => s + Number(i.subtotal || (i.quantity * i.unit_price) || 0), 0);
        // Discount = مجموع خصومات الأصناف
        const discountAmount = updatedItems.reduce((s, i) => s + Number(i.discount_amount || 0), 0);
        // Tax = مجموع ضرائب الأصناف
        const taxAmount = isInternational ? 0 : updatedItems.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
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
    }, [onChange, tradeMode, data.receipt_mode]);

    // ─── Tax Reconciliation: recalculate tax for items loaded with tax_rate=0 ───
    // This runs ONCE when items are loaded AND tax defaults are ready
    const taxReconciliationDoneRef = useRef(false);
    useEffect(() => {
        // Skip if already reconciled, or no items, or tax defaults not loaded
        if (taxReconciliationDoneRef.current) return;
        if (!taxDefaults || lineItems.length === 0) return;

        // Skip for international purchases (tax = 0 is correct)
        const isInternational = tradeMode === 'purchase' && data.receipt_mode === 'international';
        if (isInternational) {
            taxReconciliationDoneRef.current = true;
            return;
        }

        // Check if any items are missing tax but should have it
        const needsReconciliation = companyTaxEnabled && companyTaxRate > 0 &&
            lineItems.some(item => !item.tax_rate || item.tax_rate === 0);

        if (!needsReconciliation) {
            taxReconciliationDoneRef.current = true;
            return;
        }

        // Recalculate tax for items missing it
        const reconciledItems = lineItems.map(item => {
            if (item.tax_rate && item.tax_rate > 0) return item; // Already has tax

            // Apply Golden Rule: material → company → 0%
            // For loaded items, we don't have material.tax_rate from fabric_materials,
            // so we use company tax as fallback (materialTaxRate = undefined)
            const resolved = resolveItemTaxRate(undefined, companyTaxRate, companyTaxEnabled);
            if (resolved.rate <= 0) return item;

            const subtotal = Number(item.subtotal || (item.quantity * item.unit_price) || 0);
            const discountAmount = Number(item.discount_amount || 0);
            const netAfterDiscount = subtotal - discountAmount;
            const taxAmt = computeTaxAmount(netAfterDiscount, resolved.rate);

            return {
                ...item,
                tax_rate: resolved.rate,
                tax_amount: taxAmt,
                total: netAfterDiscount + taxAmt,
            };
        });

        taxReconciliationDoneRef.current = true;

        // Trigger update with reconciled items
        const totalTax = reconciledItems.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
        if (totalTax > 0) {
            console.log(`[TradeMainTab] 🔄 Tax reconciliation: applied ${companyTaxRate}% to ${reconciledItems.filter(i => i.tax_amount! > 0).length} items`);
            handleItemsChange(reconciledItems);
        }
    }, [lineItems, taxDefaults, companyTaxRate, companyTaxEnabled, tradeMode, data.receipt_mode, handleItemsChange]);

    // Reset reconciliation flag when document changes
    useEffect(() => {
        taxReconciliationDoneRef.current = false;
    }, [data.id]);

    // Handle container invoice selection
    const handleInvoiceSelection = (ids: string[]) => {
        onChange({
            invoice_ids: ids,
            items: ids.map(id => ({ id, type: 'invoice_link' }))
        });
    };

    // ─── Handle currency change with auto exchange rate + PRICE CONVERSION ───
    // Converts ALL existing line item prices from old currency to new currency
    const handleCurrencyChange = useCallback(async (currency: string) => {
        const oldCurrency = data.currency || companyCurrency || '';
        const oldRate = Number(data.exchange_rate) || 1; // 1 oldCurrency = X baseCurrency
        const newRate = lookupRate(currency, companyCurrency); // 1 newCurrency = X baseCurrency

        // Convert items: price_new = price_old × (oldRate / newRate)
        // Example: 75 UAH→USD: oldRate=1, newRate=43.78 → 75 × (1/43.78) = $1.71
        const currentItems = data.items || [];
        const conversionFactor = (oldRate > 0 && newRate > 0) ? (oldRate / newRate) : 1;
        const needsConversion = oldCurrency !== currency && Math.abs(conversionFactor - 1) > 0.0001;

        const convertItem = (item: any, rate: number, factor: number, doConvert: boolean) => {
            if (!doConvert) return { ...item, currency, exchange_rate: rate };
            const newUnitPrice = Math.round(item.unit_price * factor * 10000) / 10000;
            const newQty = Number(item.quantity || 0);
            const newSubtotal = newQty * newUnitPrice;
            const discAmt = (Number(item.discount_percent) || 0) / 100 * newSubtotal;
            const net = newSubtotal - discAmt;
            const tr = Number(item.tax_rate) || 0;
            const tax = tr > 0 ? Math.round(net * (tr / 100) * 100) / 100 : 0;
            return { ...item, currency, exchange_rate: rate, unit_price: newUnitPrice, subtotal: newSubtotal, discount_amount: discAmt, tax_amount: tax, total: net + tax };
        };

        const recalcTotals = (items: any[]) => {
            const sub = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
            const disc = items.reduce((s: number, i: any) => s + Number(i.discount_amount || 0), 0);
            const tax = items.reduce((s: number, i: any) => s + Number(i.tax_amount || 0), 0);
            return { subtotal: sub, discount_amount: disc, tax_amount: tax, total_amount: sub - disc + tax, grand_total: sub - disc + tax };
        };

        const convertedItems = currentItems.map((item: any) => convertItem(item, newRate, conversionFactor, needsConversion));
        const totals = recalcTotals(convertedItems);

        onChange({ currency, exchange_rate: newRate, items: convertedItems, ...totals });

        if (needsConversion) {
            console.log(`[TradeMainTab] 💱 Converted ${convertedItems.length} items: ${oldCurrency}→${currency} (factor: ${conversionFactor.toFixed(6)})`);
        }

        // Async fallback: if sync returned 1 but should have a real rate
        if (newRate === 1 && currency !== companyCurrency) {
            try {
                const asyncRate = await lookupRateAsync(currency, companyCurrency);
                if (asyncRate !== 1 && asyncRate > 0) {
                    const asyncFactor = (oldRate > 0 && asyncRate > 0) ? (oldRate / asyncRate) : 1;
                    const doConvert2 = oldCurrency !== currency && Math.abs(asyncFactor - 1) > 0.0001;
                    const reItems = currentItems.map((item: any) => convertItem(item, asyncRate, asyncFactor, doConvert2));
                    const reTotals = recalcTotals(reItems);
                    onChange({ exchange_rate: asyncRate, items: reItems, ...reTotals });
                    console.log(`[TradeMainTab] 🌐 Online rate: 1 ${currency} = ${asyncRate.toFixed(4)} ${companyCurrency} — reconverted ${reItems.length} items`);
                }
            } catch (err) {
                console.warn('[TradeMainTab] Failed to fetch online exchange rate:', err);
            }
        }
    }, [lookupRate, lookupRateAsync, companyCurrency, onChange, data.currency, data.exchange_rate, data.items]);

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
    // For transfers: keep open until both warehouses are selected
    const [headerOpen, setHeaderOpen] = useState(mode === 'create');

    // Force header open when transfer warehouses not yet selected
    useEffect(() => {
        if (isTransfer && !transferWarehousesReady && !headerOpen) {
            setHeaderOpen(true);
        }
    }, [isTransfer, transferWarehousesReady, headerOpen]);

    // Summary values for collapsed state
    const partyName = data.party_name || data.supplier_name || data.customer_name || '';
    const docDate = data.doc_date || data.date || '';
    const docCurrency = data.currency || companyCurrency || '';
    const docTotal = Number(data.total_amount || data.grand_total || 0);

    // ── اسم مستودع التسليم — يُحسب مرة واحدة ويُستخدم في STATUS BAR وDeliveryOutputView ──
    const deliveryWhIdResolved = (data as any).delivery_warehouse_id || data.stock_warehouse_id || data.warehouse_id;
    const deliveryWhObj = warehousesList.find((w: any) => w.id === deliveryWhIdResolved);
    const resolvedDeliveryWhAr: string = (data as any).delivery_warehouse_name_ar || (isRTL ? deliveryWhObj?.name : '') || '';
    const resolvedDeliveryWhEn: string = (data as any).delivery_warehouse_name_en || (!isRTL ? deliveryWhObj?.name : '') || '';
    // اسم يُعرض في الـ UI حسب اللغة
    const resolvedDeliveryWhName: string = isRTL
        ? (resolvedDeliveryWhAr || resolvedDeliveryWhEn || deliveryWhObj?.name || '')
        : (resolvedDeliveryWhEn || resolvedDeliveryWhAr || deliveryWhObj?.name || '');

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
                                        {new Date(docDate).toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' })}
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
                                supportedCurrencies={supportedCurrencies}
                                onCurrencyChange={handleCurrencyChange}
                                viewMode={mode}
                            />

                            {/* 1.5 Customer Pricing Info Bar — only for Sales with selected customer */}
                            {tradeMode === 'sales' && !isTransfer && currentPartyId && (
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

            {/* ═══ Sales Delivery Progress — Real-time ═══ */}
            {tradeMode === 'sales' && data.id && ['in_delivery', 'delivered', 'confirmed'].includes(data.stage || '') && (
                <DeliveryProgressBanner
                    invoiceId={data.id}
                    stage={data.stage || 'confirmed'}
                    initialDraft={data.delivery_draft}
                    items={resolvedItems}
                />
            )}

            {/* ═══ STATUS BAR — حالات الفاتورة ═══ */}
            {mode === 'view' && !isTransfer && data.stage && data.stage !== 'draft' && (() => {
                const totalAmt = Number(data.total_amount || data.grand_total || 0);
                const paidAmt = Number(data.paid_amount || 0);
                const payStatus: 'paid' | 'partial' | 'unpaid' =
                    paidAmt >= totalAmt && totalAmt > 0 ? 'paid'
                        : paidAmt > 0 ? 'partial'
                            : 'unpaid';

                const isPosted = !!(data.journal_entry_id || data.posted_at || data.is_posted || data.stage === 'posted');
                const jeId = data.journal_entry_id as string | undefined;
                const postedAt = data.posted_at as string | undefined;

                const isDelivered = !!(data.delivered_at || data.delivery_confirmed_at || data.delivery_no
                    || ['delivered', 'posted', 'completed'].includes(data.stage));
                const deliveryNo = data.delivery_no as string | undefined;
                const deliveredAt = data.delivered_at || data.delivery_confirmed_at;

                // warehouse name — يستخدم المتغيرات المحسوبة مسبقاً
                const warehouseName = resolvedDeliveryWhName;

                const payBadge = {
                    paid: { label: isRTL ? 'مدفوعة ✓' : 'Paid ✓', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                    partial: { label: isRTL ? 'مدفوعة جزئياً' : 'Partial', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
                    unpaid: { label: isRTL ? 'غير مدفوعة' : 'Unpaid', cls: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
                }[payStatus];

                return (
                    <div className="flex items-center gap-2 flex-wrap bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2.5 border border-gray-100 dark:border-gray-700 shadow-sm">
                        {/* عنوان */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {isRTL ? 'الحالات:' : 'Status:'}
                        </span>

                        {/* ── حالة الدفع ── */}
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400">{isRTL ? 'الدفع' : 'Payment'}</span>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', payBadge.cls)}>
                                {payStatus === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : null}
                                {payBadge.label}
                                {payStatus !== 'unpaid' && paidAmt > 0 && (
                                    <span className="font-mono opacity-70 text-[9px] ms-0.5">
                                        {paidAmt.toLocaleString()} / {totalAmt.toLocaleString()}
                                    </span>
                                )}
                            </span>
                        </div>

                        <span className="text-gray-300 dark:text-gray-600">•</span>

                        {/* ── حالة الترحيل + رقم القيد ── */}
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400">{isRTL ? 'الترحيل' : 'Posting'}</span>
                            {isPosted ? (
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                                    title={postedAt ? `${isRTL ? 'تاريخ الترحيل: ' : 'Posted: '}${new Date(postedAt).toLocaleDateString()}` : undefined}
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {isRTL ? 'مرحَّل ✓' : 'Posted ✓'}
                                    {jeId && (
                                        <span className="font-mono opacity-70 text-[9px] ms-0.5">#{jeId.substring(0, 6)}</span>
                                    )}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                    {isRTL ? 'غير مرحَّل' : 'Not Posted'}
                                </span>
                            )}
                        </div>

                        <span className="text-gray-300 dark:text-gray-600">•</span>

                        {/* ── حالة التسليم ── */}
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400">{isRTL ? 'التسليم' : 'Delivery'}</span>
                            {isDelivered ? (
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
                                    title={deliveredAt ? `${isRTL ? 'تاريخ التسليم: ' : 'Delivered: '}${new Date(deliveredAt).toLocaleDateString()}` : undefined}
                                >
                                    <Truck className="w-3 h-3" />
                                    {isRTL ? 'مُسلَّم ✓' : 'Delivered ✓'}
                                    {deliveryNo && <span className="font-mono opacity-70 text-[9px] ms-0.5">#{deliveryNo}</span>}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    {isRTL ? 'لم يُسلَّم' : 'Pending'}
                                </span>
                            )}
                        </div>

                        {/* ── المستودع ── */}
                        {warehouseName && (
                            <>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-gray-400">{isRTL ? 'المستودع' : 'Warehouse'}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                                        <Warehouse className="w-3 h-3" />
                                        {warehouseName}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                );
            })()}

            {/* 3. Items Grid — CartItemsView + DeliveryOutputView */}
            <div className="mt-4 space-y-3">
                {isContainer ? (
                    <ContainerInvoiceSelector
                        supplierId={tradeData.party_id || ''}
                        selectedInvoiceIds={data.invoice_ids || tradeData.items?.map((i: any) => i.id) || []}
                        onSelectionChange={handleInvoiceSelection}
                        readOnly={mode === 'view'}
                    />
                ) : (
                    <>
                        {/* ═══ Original Invoice Section — always on top ═══ */}
                        {isDeliveredStage ? (
                            <Collapsible defaultOpen={false}>
                                <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 hover:from-gray-100 hover:to-slate-100 dark:hover:from-gray-800/60 dark:hover:to-gray-800/40 transition-colors group">
                                    <StickyNote className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                        {tradeMode === 'purchase'
                                            ? (isRTL ? 'الفاتورة الأصلية — البنود المطلوبة' : 'Original Invoice — Ordered Items')
                                            : (isRTL ? 'الفاتورة الأصلية — البنود المحجوزة' : 'Original Invoice — Reserved Items')}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-400 ms-auto transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                    <CartItemsView
                                        items={lineItems}
                                        onItemsChange={handleItemsChange}
                                        readOnly={mode === 'view'}
                                        currency={data.currency || companyCurrency || 'SAR'}
                                        companyCurrency={companyCurrency || 'SAR'}
                                        showDiscount={!isTransfer}
                                        showTax={!isTransfer}
                                        hideFinancials={isTransfer}
                                        customerId={currentPartyId || undefined}
                                        isInternational={tradeMode === 'purchase' && data.receipt_mode === 'international'}
                                        priceResolver={tradeMode === 'sales' && currentPartyId ? customerPricing.resolvePrice : undefined}
                                    />
                                </CollapsibleContent>
                            </Collapsible>
                        ) : (
                            <CartItemsView
                                items={lineItems}
                                onItemsChange={handleItemsChange}
                                readOnly={mode === 'view'}
                                currency={data.currency || companyCurrency || 'SAR'}
                                companyCurrency={companyCurrency || 'SAR'}
                                showDiscount={!isTransfer}
                                showTax={!isTransfer}
                                hideFinancials={isTransfer}
                                customerId={currentPartyId || undefined}
                                isInternational={tradeMode === 'purchase' && data.receipt_mode === 'international'}
                                priceResolver={tradeMode === 'sales' && currentPartyId ? customerPricing.resolvePrice : undefined}
                            />
                        )}

                        {/* ═══ Delivery/Receipt Output Section — appears after delivery/receipt, below original invoice ═══ */}
                        {isDeliveredStage && (
                            <Collapsible defaultOpen={false}>
                                <CollapsibleTrigger className={cn(
                                    "flex items-center gap-2 w-full px-4 py-3 rounded-lg border transition-colors group",
                                    tradeMode === 'purchase'
                                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-950/50 dark:hover:to-teal-950/30"
                                        : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-950/50 dark:hover:to-indigo-950/30"
                                )}>
                                    <Truck className={cn("w-5 h-5", tradeMode === 'purchase' ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400")} />
                                    <span className={cn("text-sm font-bold", tradeMode === 'purchase' ? "text-emerald-800 dark:text-emerald-300" : "text-blue-800 dark:text-blue-300")}>
                                        {tradeMode === 'purchase'
                                            ? (isRTL ? 'البضاعة المستلمة — مدخلات المستودع' : 'Received Goods — Warehouse Input')
                                            : (isRTL ? 'الفاتورة المسلمة — مخرجات المستودع' : 'Delivered Invoice — Warehouse Output')}
                                    </span>
                                    <ChevronDown className={cn("w-4 h-4 ms-auto transition-transform group-data-[state=closed]:rotate-[-90deg]", tradeMode === 'purchase' ? "text-emerald-500" : "text-blue-500")} />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                    <DeliveryOutputView
                                        items={(lineItems as any[]).map(item => ({
                                            ...item,
                                            delivered_qty: (item as any).delivered_qty || 0,
                                            delivery_rolls: (item as any).delivery_rolls || [],
                                        }))}
                                        currency={data.currency || companyCurrency || 'SAR'}
                                        tradeMode={tradeMode as 'sales' | 'purchase'}
                                        defaultWarehouseNameAr={resolvedDeliveryWhAr || undefined}
                                        defaultWarehouseNameEn={resolvedDeliveryWhEn || undefined}
                                    />
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
