/**
 * PriceHistoryPopover — سجل أسعار المادة لكل عميل
 * 
 * يعرض آخر 5 أسعار بيع للمادة لنفس العميل عبر جميع أنواع المستندات التجارية.
 * عند اختيار سعر سابق، يتم تطبيقه مباشرة على السطر.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, History, Loader2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

// ─── Types ──────────────────────────────────────────────────────────────
interface PriceRecord {
    date: string;
    unit_price: number;
    quantity: number;
    doc_type: string;
    doc_number: string;
    currency: string;
}

interface PriceHistoryPopoverProps {
    materialId: string;
    customerId?: string;
    currentPrice?: number;
    currency?: string;
    onApplyPrice?: (price: number) => void;
}

// ─── Component ──────────────────────────────────────────────────────────
export function PriceHistoryPopover({
    materialId,
    customerId,
    currentPrice,
    currency = '₴',
    onApplyPrice,
}: PriceHistoryPopoverProps) {
    const { language, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
    const [fetched, setFetched] = useState(false);

    // ─── Fetch price history on open ───
    const fetchPriceHistory = useCallback(async () => {
        if (!companyId || !materialId || fetched) return;

        setLoading(true);
        try {
            const results: PriceRecord[] = [];

            // Search across all trade document tables
            const tables = [
                { table: 'sales_orders', dateCol: 'order_date', numCol: 'order_number', type: 'order' },
                { table: 'sales_transactions', dateCol: 'doc_date', numCol: 'invoice_no', type: 'invoice' },
                { table: 'quotations', dateCol: 'quotation_date', numCol: 'quotation_number', type: 'quotation' },
            ];

            for (const t of tables) {
                let query = supabase
                    .from(t.table as any)
                    .select('*')
                    .eq('company_id', companyId)
                    .order(t.dateCol, { ascending: false })
                    .limit(20);

                if (customerId) {
                    query = query.eq('customer_id', customerId);
                }

                const { data, error } = await query;
                if (error || !data) continue;

                for (const doc of (data as any[])) {
                    try {
                        const notes = typeof doc.notes === 'string' ? JSON.parse(doc.notes) : doc.notes;
                        if (!notes?._source || !Array.isArray(notes.items)) continue;

                        const matchingItem = notes.items.find(
                            (item: any) => item.material_id === materialId
                        );

                        if (matchingItem) {
                            results.push({
                                date: doc[t.dateCol],
                                unit_price: Number(matchingItem.unit_price || 0),
                                quantity: Number(matchingItem.quantity || 0),
                                doc_type: t.type,
                                doc_number: doc[t.numCol] || '-',
                                currency: doc.currency || currency,
                            });
                        }
                    } catch {
                        continue;
                    }
                }
            }

            // Sort by date descending and take top 5
            results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPriceHistory(results.slice(0, 5));
            setFetched(true);
        } catch (err) {
            console.error('Price history fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId, materialId, customerId, currency, fetched]);

    // ─── Trigger fetch when opening ───
    const handleOpenChange = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen && !fetched) {
            fetchPriceHistory();
        }
    }, [fetchPriceHistory, fetched]);

    // ─── Price trend indicator ───
    const getTrendIcon = (price: number) => {
        if (!currentPrice) return <Minus className="w-3 h-3 text-gray-400" />;
        if (price > currentPrice) return <TrendingUp className="w-3 h-3 text-red-500" />;
        if (price < currentPrice) return <TrendingDown className="w-3 h-3 text-green-500" />;
        return <Minus className="w-3 h-3 text-gray-400" />;
    };

    const getDiffPercent = (price: number) => {
        if (!currentPrice || currentPrice === 0) return null;
        const diff = ((price - currentPrice) / currentPrice) * 100;
        if (Math.abs(diff) < 0.01) return null;
        return diff;
    };

    const docTypeLabel = (type: string) => {
        const labels: Record<string, { ar: string; en: string }> = {
            order: { ar: 'أمر بيع', en: 'Order' },
            invoice: { ar: 'فاتورة', en: 'Invoice' },
            quotation: { ar: 'عرض سعر', en: 'Quote' },
        };
        return labels[type] ? (isRTL ? labels[type].ar : labels[type].en) : type;
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 hover:text-indigo-700 transition-colors"
                    title={isRTL ? 'سجل الأسعار' : 'Price History'}
                >
                    <History className="w-3.5 h-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side={isRTL ? 'left' : 'right'}
                align="start"
                className="w-80 p-0"
            >
                {/* Header */}
                <div className="px-3 py-2 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-t-md">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">
                            {isRTL ? 'سجل الأسعار' : 'Price History'}
                        </p>
                        {customerId && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ms-auto">
                                {isRTL ? 'لهذا العميل' : 'This customer'}
                            </Badge>
                        )}
                    </div>
                    {currentPrice != null && (
                        <p className="text-[10px] text-indigo-600/70 mt-0.5" dir="ltr">
                            {isRTL ? 'السعر الحالي: ' : 'Current: '}
                            <span className="font-bold">{currentPrice.toLocaleString()}</span>
                            {' '}{currency}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className="px-2 py-1.5 max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-6 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span className="text-xs text-gray-500">
                                {isRTL ? 'جاري التحميل...' : 'Loading...'}
                            </span>
                        </div>
                    ) : priceHistory.length === 0 ? (
                        <div className="text-center py-6">
                            <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">
                                {isRTL ? 'لا يوجد سجل أسعار سابق' : 'No price history found'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {priceHistory.map((record, i) => {
                                const diffPercent = getDiffPercent(record.unit_price);

                                return (
                                    <div
                                        key={`${record.doc_number}-${i}`}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
                                        onClick={() => {
                                            onApplyPrice?.(record.unit_price);
                                            setOpen(false);
                                        }}
                                    >
                                        {/* Trend Icon */}
                                        {getTrendIcon(record.unit_price)}

                                        {/* Price */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200" dir="ltr">
                                                    {record.unit_price.toLocaleString()}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{record.currency}</span>
                                                {diffPercent != null && (
                                                    <span className={`text-[10px] font-medium ${diffPercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                                <span>{new Date(record.date).toLocaleDateString()}</span>
                                                <span>·</span>
                                                <span>{docTypeLabel(record.doc_type)}</span>
                                                <span className="font-mono text-gray-300">#{record.doc_number}</span>
                                            </div>
                                        </div>

                                        {/* Apply button on hover */}
                                        <ArrowRight className={`w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'rotate-180' : ''}`} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {priceHistory.length > 0 && (
                    <div className="px-3 py-1.5 border-t bg-gray-50/50 dark:bg-gray-900/50 rounded-b-md">
                        <p className="text-[9px] text-gray-400 text-center">
                            {isRTL
                                ? 'اضغط على أي سعر لتطبيقه'
                                : 'Click any price to apply it'}
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
