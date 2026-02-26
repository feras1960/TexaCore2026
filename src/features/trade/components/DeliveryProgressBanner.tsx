/**
 * 🚛 DeliveryProgressBanner — Real-time delivery loading progress
 *
 * Shows live progress of warehouse staff loading rolls onto a delivery.
 * Uses Supabase Realtime subscription to auto-update without page refresh.
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DeliveryProgressBannerProps {
    invoiceId: string;
    stage: string;
    initialDraft?: any;
    items: any[];  // Invoice line items (for expected quantities)
}

export const DeliveryProgressBanner: React.FC<DeliveryProgressBannerProps> = ({
    invoiceId,
    stage,
    initialDraft,
    items,
}) => {
    const { isRTL } = useLanguage();
    const [deliveryDraft, setDeliveryDraft] = useState<any>(initialDraft || null);
    const subscriptionRef = useRef<any>(null);

    useEffect(() => {
        if (!invoiceId) return;

        // Fetch latest draft
        supabase
            .from('sales_transactions')
            .select('delivery_draft, stage')
            .eq('id', invoiceId)
            .maybeSingle()
            .then(({ data: row }) => {
                if (row?.delivery_draft) setDeliveryDraft(row.delivery_draft);
            });

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`delivery_progress_${invoiceId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'sales_transactions',
                filter: `id=eq.${invoiceId}`,
            }, (payload: any) => {
                console.log('[Realtime] 📡 Delivery progress update');
                if (payload.new?.delivery_draft) {
                    setDeliveryDraft(payload.new.delivery_draft);
                } else if (payload.new?.delivery_draft === null) {
                    setDeliveryDraft(null);
                }
            })
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [invoiceId]);

    const draftRolls = deliveryDraft?.rolls || [];

    // Don't show for confirmed with no draft
    if (draftRolls.length === 0 && stage === 'confirmed') return null;
    // Show empty state for in_delivery with no rolls yet
    if (draftRolls.length === 0 && stage === 'in_delivery') {
        return (
            <Card className="shadow-sm overflow-hidden border-2 border-amber-300 dark:border-amber-700">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🚛</span>
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            {isRTL ? 'جارِ التحميل — بانتظار الرولونات...' : 'Loading in progress — waiting for rolls...'}
                        </span>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const loadedMeters = draftRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
    const expectedMeters = items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    const percent = expectedMeters > 0 ? Math.min(100, (loadedMeters / expectedMeters) * 100) : 0;

    // Group rolls by material
    const rollsByMaterial: Record<string, any[]> = {};
    draftRolls.forEach((r: any) => {
        const key = r.material_id || 'unknown';
        if (!rollsByMaterial[key]) rollsByMaterial[key] = [];
        rollsByMaterial[key].push(r);
    });

    return (
        <Card className={cn(
            "shadow-sm overflow-hidden border-2",
            stage === 'in_delivery' ? "border-amber-300 dark:border-amber-700" :
                stage === 'delivered' ? "border-green-300 dark:border-green-700" : "border-gray-200"
        )}>
            <CardContent className="p-3 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🚛</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {isRTL ? 'حالة التحميل — مباشر' : 'Loading Status — Live'}
                        </span>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                            {draftRolls.length} {isRTL ? 'رولون' : 'rolls'}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs">
                            {loadedMeters.toFixed(1)} / {expectedMeters.toFixed(1)} {isRTL ? 'متر' : 'm'}
                        </Badge>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                        className={cn(
                            "h-2.5 rounded-full transition-all duration-500",
                            percent >= 100 ? "bg-green-500" : percent > 50 ? "bg-amber-500" : "bg-blue-500"
                        )}
                        style={{ width: `${Math.round(percent)}%` }}
                    />
                </div>
                <div className="text-[10px] text-gray-500 text-center">
                    {Math.round(percent)}% {isRTL ? 'مكتمل' : 'complete'}
                </div>

                {/* Per-material breakdown */}
                {Object.entries(rollsByMaterial).length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-gray-800">
                        {Object.entries(rollsByMaterial).map(([materialId, rolls]) => {
                            const matchingItem = items.find((i: any) => i.material_id === materialId);
                            const materialName = matchingItem?.material_name_ar || matchingItem?.material_name_en || matchingItem?.item_name || materialId.substring(0, 8);
                            const materialQty = Number(matchingItem?.quantity || 0);
                            const loadedQty = rolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);

                            return (
                                <div key={materialId} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                                        {materialName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-gray-500">
                                            {rolls.length} {isRTL ? 'رولون' : 'rolls'}
                                        </span>
                                        <span className="font-mono font-semibold">
                                            {loadedQty.toFixed(1)}/{materialQty.toFixed(1)} {isRTL ? 'م' : 'm'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
