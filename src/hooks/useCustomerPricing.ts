/**
 * 🧠 useCustomerPricing — Smart Pricing Resolution Hook
 *
 * Cascade pricing logic:
 *   1. Customer's direct price_list → price_list_items
 *   2. Customer Group's price_list → price_list_items
 *   3. Default price_list (is_default=true) → price_list_items
 *   4. Material's base selling_price (fallback)
 *
 * Also resolves:
 *   - credit_limit (customer → group → 0)
 *   - discount_percent (customer → group → 0)
 *   - payment_terms_days (customer → group → 0)
 *   - customer currency
 *   - balance & credit status
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

export interface CustomerPricingProfile {
    /** Customer's resolved price list ID (from customer or group) */
    priceListId: string | null;
    /** Price list name */
    priceListName: string;
    /** Source of price list: 'customer' | 'group' | 'default' | 'none' */
    priceListSource: 'customer' | 'group' | 'default' | 'none';
    /** Resolved discount percent */
    discountPercent: number;
    /** Source of discount */
    discountSource: 'customer' | 'group' | 'none';
    /** Resolved credit limit */
    creditLimit: number;
    /** Current balance */
    balance: number;
    /** Available credit = creditLimit - balance */
    availableCredit: number;
    /** Whether customer has exceeded credit limit */
    isCreditExceeded: boolean;
    /** Payment terms in days */
    paymentTermsDays: number;
    /** Due date based on payment terms */
    dueDate: string;
    /** Customer's preferred currency */
    currency: string;
    /** Group name if any */
    groupName: string;
    /** All price list items (product_id → price, min_quantity) */
    priceItems: PriceListItem[];
    /** Loading state */
    isLoading: boolean;
    /** Error */
    error: string | null;
}

export interface PriceListItem {
    productId: string;
    price: number;
    minQuantity: number;
    validFrom: string | null;
    validTo: string | null;
}

export interface ResolvedPrice {
    /** Final unit price */
    unitPrice: number;
    /** Discount applied */
    discountPercent: number;
    /** Price after discount */
    priceAfterDiscount: number;
    /** Source of the price */
    source: 'price_list' | 'base_price' | 'manual';
    /** Price list name if applicable */
    priceListName: string;
    /** Whether a quantity break was applied */
    quantityBreakApplied: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useCustomerPricing(
    customerId: string | null | undefined,
    companyId: string | null | undefined
): CustomerPricingProfile & {
    resolvePrice: (materialId: string, quantity: number, baseSellPrice: number) => ResolvedPrice;
} {
    // ─── Fetch customer with group details ───
    const { data: customerData, isLoading: customerLoading, error: customerError } = useQuery({
        queryKey: ['customer_pricing_profile', customerId],
        queryFn: async () => {
            if (!customerId) return null;

            // Level 1: Full query with group join
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select(`
              id,
              price_list_id,
              discount_percent,
              credit_limit,
              payment_terms_days,
              currency,
              balance,
              group_id,
              group:customer_groups!group_id (
                id,
                name_ar,
                name_en,
                price_list_id,
                discount_percent,
                credit_limit,
                payment_terms_days
              )
            `)
                    .eq('id', customerId)
                    .maybeSingle();

                if (!error && data) return data;
            } catch { /* Level 1 failed */ }

            // Level 2: Without group join, all pricing columns
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('id, price_list_id, discount_percent, credit_limit, payment_terms_days, currency, balance, group_id')
                    .eq('id', customerId)
                    .maybeSingle();

                if (!error && data) return { ...data, group: null };
            } catch { /* Level 2 failed */ }

            // Level 3: Minimal — just id + basic columns that definitely exist
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('id, currency, group_id')
                    .eq('id', customerId)
                    .maybeSingle();

                if (!error && data) {
                    return {
                        ...data,
                        price_list_id: null,
                        discount_percent: 0,
                        credit_limit: 0,
                        payment_terms_days: 0,
                        balance: 0,
                        group: null,
                    };
                }
            } catch { /* Level 3 failed */ }

            console.warn('[useCustomerPricing] All customer queries failed for:', customerId);
            return null;
        },
        enabled: !!customerId,
        staleTime: 60000,
        retry: 0, // Don't retry — we handle fallbacks internally
    });

    // ─── Resolve which price list to use (cascade) ───
    const resolvedPriceListId = useMemo(() => {
        if (!customerData) return null;

        // 1. Customer's direct price list
        if (customerData.price_list_id) {
            return { id: customerData.price_list_id, source: 'customer' as const };
        }

        // 2. Customer group's price list
        const group = (customerData as any).group;
        if (group?.price_list_id) {
            return { id: group.price_list_id, source: 'group' as const };
        }

        return null; // Will try default price list
    }, [customerData]);

    // ─── Fetch price list + items ───
    const { data: priceListData, isLoading: priceListLoading } = useQuery({
        queryKey: ['price_list_items', resolvedPriceListId?.id, companyId],
        queryFn: async () => {
            let priceListId = resolvedPriceListId?.id;
            let source = resolvedPriceListId?.source || 'default';

            // If no customer/group price list, find the default one
            if (!priceListId && companyId) {
                try {
                    const { data: defaultPL, error: plError } = await supabase
                        .from('price_lists')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('is_default', true)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (!plError && defaultPL) {
                        priceListId = defaultPL.id;
                        source = 'default';
                    }
                } catch (err) {
                    // price_lists table may not exist yet — ignore
                    console.warn('Failed to fetch default price list (table may not exist):', err);
                }
            }

            if (!priceListId) return { priceList: null, items: [], source: 'none' as const };

            // Fetch price list details + items
            try {
                const [plResult, itemsResult] = await Promise.all([
                    supabase
                        .from('price_lists')
                        .select('id, code, name_ar, name_en, currency, is_tax_inclusive')
                        .eq('id', priceListId)
                        .maybeSingle(),
                    supabase
                        .from('price_list_items')
                        .select('product_id, price, min_quantity, valid_from, valid_to')
                        .eq('price_list_id', priceListId),
                ]);

                return {
                    priceList: plResult.data,
                    items: itemsResult.data || [],
                    source,
                };
            } catch (err) {
                console.warn('Failed to fetch price list items:', err);
                return { priceList: null, items: [], source: 'none' as const };
            }
        },
        enabled: !!customerId && (!!resolvedPriceListId || !!companyId),
        staleTime: 60000,
        retry: 1,
    });

    // ─── Build profile ───
    const profile = useMemo((): CustomerPricingProfile => {
        const group = (customerData as any)?.group;
        const now = new Date();

        // Cascade discount: customer → group → 0
        const discountPercent = customerData?.discount_percent || group?.discount_percent || 0;
        const discountSource = customerData?.discount_percent
            ? 'customer' as const
            : group?.discount_percent
                ? 'group' as const
                : 'none' as const;

        // Cascade credit limit: customer → group → 0
        const creditLimit = customerData?.credit_limit || group?.credit_limit || 0;
        const balance = customerData?.balance || 0;
        const availableCredit = creditLimit > 0 ? creditLimit - balance : Infinity;

        // Cascade payment terms: customer → group → 0
        const paymentTermsDays = customerData?.payment_terms_days || group?.payment_terms_days || 0;
        const dueDate = new Date(now.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        // Filter valid price items (check date validity)
        const today = now.toISOString().split('T')[0];
        const validItems: PriceListItem[] = (priceListData?.items || [])
            .filter((item: any) => {
                if (item.valid_from && item.valid_from > today) return false;
                if (item.valid_to && item.valid_to < today) return false;
                return true;
            })
            .map((item: any) => ({
                productId: item.product_id,
                price: Number(item.price),
                minQuantity: Number(item.min_quantity),
                validFrom: item.valid_from,
                validTo: item.valid_to,
            }));

        return {
            priceListId: priceListData?.priceList?.id || null,
            priceListName: priceListData?.priceList?.name_ar || priceListData?.priceList?.name_en || '',
            priceListSource: (priceListData?.source as any) || 'none',
            discountPercent,
            discountSource,
            creditLimit,
            balance,
            availableCredit: availableCredit === Infinity ? 0 : availableCredit,
            isCreditExceeded: creditLimit > 0 && balance >= creditLimit,
            paymentTermsDays,
            dueDate,
            currency: customerData?.currency || '',
            groupName: group?.name_ar || group?.name_en || '',
            priceItems: validItems,
            isLoading: customerLoading || priceListLoading,
            error: customerError ? (customerError as any).message : null,
        };
    }, [customerData, priceListData, customerLoading, priceListLoading, customerError]);

    // ─── Price resolution function ───
    const resolvePrice = useCallback(
        (materialId: string, quantity: number, baseSellPrice: number): ResolvedPrice => {
            // Find matching price list items for this material
            const matchingItems = profile.priceItems
                .filter((item) => item.productId === materialId)
                .sort((a, b) => b.minQuantity - a.minQuantity); // Highest min_quantity first

            // Find best quantity break
            const bestMatch = matchingItems.find((item) => quantity >= item.minQuantity);

            if (bestMatch) {
                const unitPrice = bestMatch.price;
                const discountAmount = unitPrice * (profile.discountPercent / 100);
                return {
                    unitPrice,
                    discountPercent: profile.discountPercent,
                    priceAfterDiscount: unitPrice - discountAmount,
                    source: 'price_list',
                    priceListName: profile.priceListName,
                    quantityBreakApplied: bestMatch.minQuantity > 1,
                };
            }

            // Fallback to base price
            const discountAmount = baseSellPrice * (profile.discountPercent / 100);
            return {
                unitPrice: baseSellPrice,
                discountPercent: profile.discountPercent,
                priceAfterDiscount: baseSellPrice - discountAmount,
                source: 'base_price',
                priceListName: '',
                quantityBreakApplied: false,
            };
        },
        [profile]
    );

    return {
        ...profile,
        resolvePrice,
    };
}

export default useCustomerPricing;
