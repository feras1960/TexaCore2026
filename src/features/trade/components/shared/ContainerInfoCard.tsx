/**
 * 🚢 ContainerInfoCard — بطاقة معلومات الكونتينر المصغّرة
 * ═══════════════════════════════════════════════════════════
 * تُعرض في التبويب الرئيسي لفاتورة المشتريات عند وجود container_id
 * تُظهر: رقم الكونتينر + الحالة + ETA + اسم السفينة
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Ship, Calendar, Anchor, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { ContainerStatusBadge, CONTAINER_STATUSES } from '../ContainerStatusStepper';

interface ContainerDetails {
    container_number: string;
    status: string;
    vessel_name?: string;
    eta?: string;
    etd?: string;
    port_of_loading?: string;
    port_of_discharge?: string;
    shipping_company?: string;
}

interface ContainerInfoCardProps {
    /** FK to containers table */
    containerId?: string | null;
    /** Denormalized container number (for quick display before full data loads) */
    containerNumber?: string | null;
    /** Denormalized container status */
    containerStatus?: string | null;
    /** Callback to open the container details page/sheet */
    onViewContainer?: (containerId: string) => void;
    /** Additional className */
    className?: string;
}

export const ContainerInfoCard: React.FC<ContainerInfoCardProps> = ({
    containerId,
    containerNumber,
    containerStatus,
    onViewContainer,
    className,
}) => {
    const { isRTL } = useLanguage();
    const [details, setDetails] = useState<ContainerDetails | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch full container details when containerId is available
    useEffect(() => {
        if (!containerId) {
            setDetails(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        supabase
            .from('containers')
            .select('container_number, status, vessel_name, eta, etd, port_of_loading, port_of_discharge, shipping_company')
            .eq('id', containerId)
            .single()
            .then(({ data, error }) => {
                if (cancelled) return;
                setLoading(false);
                if (error) {
                    console.warn('Failed to fetch container details:', error.message);
                    return;
                }
                setDetails(data);
            });

        return () => { cancelled = true; };
    }, [containerId]);

    // Nothing to show
    if (!containerId && !containerNumber) return null;

    // Use denormalized data as fallback while loading
    const displayNumber = details?.container_number || containerNumber || '—';
    const displayStatus = details?.status || containerStatus || 'draft';

    // Find status info for mini stepper
    const currentStatusIdx = CONTAINER_STATUSES.findIndex(s => s.key === displayStatus);
    const statusInfo = CONTAINER_STATUSES[currentStatusIdx] || CONTAINER_STATUSES[0];
    const StatusIcon = statusInfo.icon;

    return (
        <Card className={cn(
            "overflow-hidden transition-all",
            "border-blue-200/60 dark:border-blue-800/40",
            "bg-gradient-to-r from-blue-50/60 via-sky-50/40 to-cyan-50/30",
            "dark:from-blue-950/20 dark:via-sky-950/10 dark:to-cyan-950/10",
            className
        )}>
            <div className="px-4 py-3">
                {/* ─── Header Row ─── */}
                <div className={cn("flex items-center justify-between gap-3 mb-2", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                            <Ship className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block">
                                {isRTL ? 'الكونتينر' : 'Container'}
                            </span>
                            <span className="text-sm font-bold font-mono text-blue-800 dark:text-blue-300">
                                {displayNumber}
                            </span>
                        </div>
                    </div>

                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <ContainerStatusBadge status={displayStatus} />
                        {containerId && onViewContainer && (
                            <button
                                onClick={() => onViewContainer(containerId)}
                                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                title={isRTL ? 'عرض تفاصيل الكونتينر' : 'View container details'}
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── Details Row (from full query) ─── */}
                {loading ? (
                    <div className="flex items-center justify-center py-1">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    </div>
                ) : details && (
                    <div className={cn(
                        "flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-blue-100/60 dark:border-blue-800/30",
                        isRTL && "flex-row-reverse"
                    )}>
                        {/* Vessel */}
                        {details.vessel_name && (
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Ship className="w-3 h-3 text-gray-400" />
                                <span>{details.vessel_name}</span>
                            </div>
                        )}

                        {/* Shipping company */}
                        {details.shipping_company && !details.vessel_name && (
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Anchor className="w-3 h-3 text-gray-400" />
                                <span>{details.shipping_company}</span>
                            </div>
                        )}

                        {/* Ports */}
                        {(details.port_of_loading || details.port_of_discharge) && (
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>
                                    {details.port_of_loading || '?'} → {details.port_of_discharge || '?'}
                                </span>
                            </div>
                        )}

                        {/* ETA */}
                        {details.eta && (
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>ETA: {new Date(details.eta).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}

                        {/* ETD */}
                        {details.etd && !details.eta && (
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>ETD: {new Date(details.etd).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}

                        {/* Mini progress: X/9 steps */}
                        {currentStatusIdx >= 0 && (
                            <div className={cn("flex items-center gap-1 ms-auto", isRTL && "flex-row-reverse")}>
                                <div className="flex gap-0.5">
                                    {CONTAINER_STATUSES.map((s, i) => (
                                        <div
                                            key={s.key}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-colors",
                                                i <= currentStatusIdx
                                                    ? "bg-blue-500 dark:bg-blue-400"
                                                    : "bg-gray-200 dark:bg-gray-700"
                                            )}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] text-gray-400 tabular-nums">
                                    {currentStatusIdx + 1}/{CONTAINER_STATUSES.length}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ContainerInfoCard;
