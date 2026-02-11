/**
 * 📊 QuantityPricingCard — Shows quantity break pricing table
 * بطاقة تسعير الكميات المتدرجة
 *
 * Displays the price list breaks for a specific material,
 * highlighting the currently applicable tier based on quantity.
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Tag, Check, Layers } from 'lucide-react';
import type { PriceListItem } from '@/hooks/useCustomerPricing';

// ─── Types ─────────────────────────────────────────────────────────

interface QuantityPricingCardProps {
    /** All price list items for this material */
    priceItems: PriceListItem[];
    /** Material's base selling price */
    baseSellPrice: number;
    /** Currently entered quantity (to highlight matching tier) */
    currentQty?: number;
    /** Currency code */
    currency?: string;
    /** Customer discount percent */
    discountPercent?: number;
    /** Price list name to display */
    priceListName?: string;
    /** Compact mode for inline display */
    compact?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────

export const QuantityPricingCard: React.FC<QuantityPricingCardProps> = ({
    priceItems,
    baseSellPrice,
    currentQty = 0,
    currency = 'SAR',
    discountPercent = 0,
    priceListName,
    compact = false,
}) => {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    // Sort and build tier ranges
    const tiers = useMemo(() => {
        // Filter items for this material (already filtered by caller)
        const sorted = [...priceItems].sort((a, b) => a.minQuantity - b.minQuantity);

        return sorted.map((item, index) => {
            const nextItem = sorted[index + 1];
            const minQty = item.minQuantity || 1;
            const maxQty = nextItem ? nextItem.minQuantity - 1 : null;
            const price = item.price;
            const priceAfterDiscount = price * (1 - discountPercent / 100);

            // Calculate savings vs base price
            const savingsPercent = baseSellPrice > 0
                ? Math.round((1 - price / baseSellPrice) * 100)
                : 0;

            // Check if this tier is active for current quantity
            const isActive = currentQty >= minQty && (maxQty === null || currentQty <= maxQty);

            return {
                minQty,
                maxQty,
                price,
                priceAfterDiscount,
                savingsPercent,
                isActive,
            };
        });
    }, [priceItems, baseSellPrice, discountPercent, currentQty]);

    if (tiers.length === 0) {
        return (
            <div className="text-xs text-gray-400 italic px-2 py-1">
                {isRTL ? 'لا توجد أسعار متدرجة' : 'No quantity breaks available'}
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex flex-wrap gap-1">
                {tiers.map((tier, i) => (
                    <Badge
                        key={i}
                        variant={tier.isActive ? 'default' : 'outline'}
                        className={`text-[10px] font-mono ${tier.isActive
                            ? 'bg-green-600 text-white border-green-600'
                            : 'text-gray-500'
                            }`}
                    >
                        {tier.minQty}+: {tier.price.toFixed(2)}
                        {tier.savingsPercent > 0 && (
                            <span className="mr-1 text-green-200 dark:text-green-300">
                                (-{tier.savingsPercent}%)
                            </span>
                        )}
                    </Badge>
                ))}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {isRTL ? 'تسعير الكميات' : 'Quantity Pricing'}
                </span>
                {priceListName && (
                    <Badge variant="outline" className="text-[10px] ms-auto">
                        <Tag className="w-2.5 h-2.5 me-1" />
                        {priceListName}
                    </Badge>
                )}
            </div>

            {/* Table */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {/* Base price row */}
                <div className="flex items-center px-3 py-1.5 text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="flex-1">
                        {isRTL ? 'سعر أساسي' : 'Base Price'}
                    </span>
                    <span className="font-mono line-through">
                        {baseSellPrice.toFixed(2)} {currency}
                    </span>
                </div>

                {/* Tier rows */}
                {tiers.map((tier, i) => (
                    <div
                        key={i}
                        className={`flex items-center px-3 py-2 text-xs transition-colors ${tier.isActive
                            ? 'bg-green-50 dark:bg-green-900/20 border-s-2 border-green-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        {/* Quantity Range */}
                        <div className="flex-1 flex items-center gap-1.5">
                            {tier.isActive && (
                                <Check className="w-3 h-3 text-green-600 shrink-0" />
                            )}
                            <span className={`font-medium ${tier.isActive ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                {tier.maxQty
                                    ? `${tier.minQty} — ${tier.maxQty}`
                                    : `${tier.minQty}+`
                                }
                            </span>
                            <span className="text-gray-400">
                                {isRTL ? 'وحدة' : 'units'}
                            </span>
                        </div>

                        {/* Price */}
                        <div className="text-end">
                            <span className={`font-mono font-semibold ${tier.isActive ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                {tier.price.toFixed(2)}
                            </span>
                            <span className="text-gray-400 ms-1">{currency}</span>
                        </div>

                        {/* Savings badge */}
                        {tier.savingsPercent > 0 && (
                            <Badge
                                variant="outline"
                                className={`ms-2 text-[10px] ${tier.isActive
                                    ? 'border-green-400 text-green-600'
                                    : 'border-gray-300 text-gray-400'
                                    }`}
                            >
                                <TrendingDown className="w-2.5 h-2.5 me-0.5" />
                                {tier.savingsPercent}%
                            </Badge>
                        )}

                        {/* After discount */}
                        {discountPercent > 0 && (
                            <div className="ms-2 text-[10px] text-orange-500">
                                → {tier.priceAfterDiscount.toFixed(2)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer with discount note */}
            {discountPercent > 0 && (
                <div className="px-3 py-1.5 text-[10px] text-orange-500 bg-orange-50/50 dark:bg-orange-900/10 border-t border-gray-100 dark:border-gray-700">
                    {isRTL
                        ? `* الأسعار بعد خصم العميل (${discountPercent}%)`
                        : `* Prices include customer discount (${discountPercent}%)`
                    }
                </div>
            )}
        </div>
    );
};

export default QuantityPricingCard;
