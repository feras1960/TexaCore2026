/**
 * 🚢 ContainerStatusStepper — Visual stepper for container shipping statuses
 * يعرض حالة الكونتينر كمراحل متتابعة مع إمكانية تغيير الحالة
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Check,
    Ship,
    Package,
    Truck,
    Building2,
    FileCheck,
    Warehouse,
    Lock,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Anchor,
} from 'lucide-react';

// ─── Status Definitions ─────────────────────────────────────────

export interface ContainerStatus {
    key: string;
    label_ar: string;
    label_en: string;
    icon: React.ElementType;
    color: string;        // Tailwind bg color for active
    textColor: string;    // Tailwind text color
    borderColor: string;  // Tailwind border color
}

export const CONTAINER_STATUSES: ContainerStatus[] = [
    {
        key: 'draft',
        label_ar: 'مسودة',
        label_en: 'Draft',
        icon: Package,
        color: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-600 dark:text-gray-400',
        borderColor: 'border-gray-300 dark:border-gray-600',
    },
    {
        key: 'booked',
        label_ar: 'تم الحجز',
        label_en: 'Booked',
        icon: FileCheck,
        color: 'bg-sky-50 dark:bg-sky-950/30',
        textColor: 'text-sky-600 dark:text-sky-400',
        borderColor: 'border-sky-300 dark:border-sky-700',
    },
    {
        key: 'loading',
        label_ar: 'جاري التحميل',
        label_en: 'Loading',
        icon: Truck,
        color: 'bg-amber-50 dark:bg-amber-950/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-300 dark:border-amber-700',
    },
    {
        key: 'in_transit',
        label_ar: 'بالبحر',
        label_en: 'In Transit',
        icon: Ship,
        color: 'bg-blue-50 dark:bg-blue-950/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-300 dark:border-blue-700',
    },
    {
        key: 'at_port',
        label_ar: 'وصل الميناء',
        label_en: 'At Port',
        icon: Anchor,
        color: 'bg-violet-50 dark:bg-violet-950/30',
        textColor: 'text-violet-600 dark:text-violet-400',
        borderColor: 'border-violet-300 dark:border-violet-700',
    },
    {
        key: 'customs',
        label_ar: 'بالجمركة',
        label_en: 'At Customs',
        icon: Building2,
        color: 'bg-orange-50 dark:bg-orange-950/30',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'border-orange-300 dark:border-orange-700',
    },
    {
        key: 'cleared',
        label_ar: 'تم التخليص',
        label_en: 'Cleared',
        icon: Check,
        color: 'bg-emerald-50 dark:bg-emerald-950/30',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        borderColor: 'border-emerald-300 dark:border-emerald-700',
    },
    {
        key: 'in_receiving',
        label_ar: 'قيد الاستلام',
        label_en: 'Receiving',
        icon: Warehouse,
        color: 'bg-teal-50 dark:bg-teal-950/30',
        textColor: 'text-teal-600 dark:text-teal-400',
        borderColor: 'border-teal-300 dark:border-teal-700',
    },
    {
        key: 'received',
        label_ar: 'تم الاستلام',
        label_en: 'Received',
        icon: Warehouse,
        color: 'bg-green-50 dark:bg-green-950/30',
        textColor: 'text-green-600 dark:text-green-400',
        borderColor: 'border-green-300 dark:border-green-700',
    },
    {
        key: 'closed',
        label_ar: 'مغلق',
        label_en: 'Closed',
        icon: Lock,
        color: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-500 dark:text-gray-500',
        borderColor: 'border-gray-400 dark:border-gray-600',
    },
];

// ─── Helper Functions ───────────────────────────────────────────

export function getStatusIndex(status: string): number {
    return CONTAINER_STATUSES.findIndex(s => s.key === status);
}

export function getStatusDef(status: string): ContainerStatus {
    return CONTAINER_STATUSES.find(s => s.key === status) || CONTAINER_STATUSES[0];
}

// ─── Component Props ────────────────────────────────────────────

interface ContainerStatusStepperProps {
    containerId: string;
    currentStatus: string;
    mode: 'view' | 'edit' | 'create';
    onStatusChange?: (newStatus: string) => void;
    compact?: boolean; // For use in table rows or small spaces
}

// ─── Component ──────────────────────────────────────────────────

export const ContainerStatusStepper: React.FC<ContainerStatusStepperProps> = ({
    containerId,
    currentStatus,
    mode,
    onStatusChange,
    compact = false,
}) => {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const queryClient = useQueryClient();
    const [updating, setUpdating] = useState(false);

    const currentIndex = getStatusIndex(currentStatus);
    const canEdit = mode === 'edit';

    // Statuses that can ONLY be set automatically by the system
    const AUTOMATED_STATUSES = ['in_receiving', 'received', 'closed'];

    const handleStatusChange = async (newStatus: string) => {
        if (!canEdit || updating) return;

        // Block manual transition to automated statuses
        if (AUTOMATED_STATUSES.includes(newStatus)) {
            toast.warning(
                isRTL
                    ? newStatus === 'in_receiving'
                        ? '⚠️ حالة "قيد الاستلام" تتغير تلقائياً عند بدء الاستلام الفعلي من المستودع'
                        : newStatus === 'received'
                            ? '⚠️ حالة "تم الاستلام" تتغير تلقائياً عند اكتمال استلام جميع البنود'
                            : '⚠️ إغلاق الحاوية يتم من زر "إغلاق" بعد اكتمال الاستلام'
                    : newStatus === 'in_receiving'
                        ? '⚠️ "Receiving" status is set automatically when warehouse starts receiving'
                        : newStatus === 'received'
                            ? '⚠️ "Received" status is set automatically when all items are received'
                            : '⚠️ Use the "Close" button after receiving is complete',
            );
            return;
        }

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('containers')
                .update({ status: newStatus })
                .eq('id', containerId);

            if (error) throw error;

            toast.success(
                isRTL
                    ? `تم تحديث حالة الكونتينر إلى: ${getStatusDef(newStatus).label_ar}`
                    : `Container status updated to: ${getStatusDef(newStatus).label_en}`
            );

            onStatusChange?.(newStatus);
            queryClient.invalidateQueries({ queryKey: ['containers_list'] });
        } catch (err: any) {
            console.error('Status update error:', err);
            toast.error(isRTL ? 'خطأ في تحديث الحالة' : 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    // ── Compact Badge View (for tables) ──
    if (compact) {
        const statusDef = getStatusDef(currentStatus);
        const Icon = statusDef.icon;
        return (
            <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                statusDef.color,
                statusDef.textColor,
                statusDef.borderColor,
            )}>
                <Icon className="w-3.5 h-3.5" />
                {isRTL ? statusDef.label_ar : statusDef.label_en}
            </div>
        );
    }

    // ── Full Stepper View ──
    return (
        <div className="w-full">
            {/* Stepper Steps */}
            <div className="flex items-center justify-between gap-0 overflow-x-auto pb-2">
                {CONTAINER_STATUSES.map((status, index) => {
                    const Icon = status.icon;
                    const isActive = index === currentIndex;
                    const isPast = index < currentIndex;
                    const isNext = index === currentIndex + 1;
                    const isAutomatedStatus = AUTOMATED_STATUSES.includes(status.key);
                    const canClick = canEdit && (isNext || index === currentIndex - 1) && !isAutomatedStatus;

                    return (
                        <React.Fragment key={status.key}>
                            {/* Step Node */}
                            <button
                                onClick={() => canClick && handleStatusChange(status.key)}
                                disabled={!canClick || updating}
                                className={cn(
                                    'flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px]',
                                    canClick && !updating && 'cursor-pointer hover:scale-110',
                                    !canClick && 'cursor-default',
                                )}
                                title={isRTL ? status.label_ar : status.label_en}
                            >
                                {/* Circle */}
                                <div className={cn(
                                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                    isActive && cn(status.color, status.borderColor, 'ring-2 ring-offset-2 ring-offset-background', status.borderColor.replace('border-', 'ring-')),
                                    isPast && 'bg-green-500 border-green-500 text-white',
                                    !isActive && !isPast && 'bg-muted/50 border-muted-foreground/20 text-muted-foreground/40',
                                    canClick && !updating && 'hover:border-primary/60 hover:shadow-md',
                                )}>
                                    {updating && (isNext || index === currentIndex - 1) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isPast ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Icon className={cn('w-4 h-4', isActive && status.textColor)} />
                                    )}
                                </div>

                                {/* Label */}
                                <span className={cn(
                                    'text-[10px] font-medium text-center leading-tight max-w-[70px]',
                                    isActive && status.textColor + ' font-semibold',
                                    isPast && 'text-green-600 dark:text-green-400',
                                    !isActive && !isPast && 'text-muted-foreground/50',
                                )}>
                                    {isRTL ? status.label_ar : status.label_en}
                                </span>
                            </button>

                            {/* Connector Line */}
                            {index < CONTAINER_STATUSES.length - 1 && (
                                <div className={cn(
                                    'flex-1 h-0.5 min-w-[12px] mx-0.5 rounded-full transition-all duration-300',
                                    index < currentIndex ? 'bg-green-400' : 'bg-muted-foreground/15',
                                )} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Quick Action Buttons */}
            {canEdit && !updating && (() => {
                const prevStatus = currentIndex > 0 ? CONTAINER_STATUSES[currentIndex - 1] : null;
                const nextStatus = currentIndex < CONTAINER_STATUSES.length - 1 ? CONTAINER_STATUSES[currentIndex + 1] : null;
                const canGoBack = prevStatus && !AUTOMATED_STATUSES.includes(prevStatus.key);
                const canGoForward = nextStatus && !AUTOMATED_STATUSES.includes(nextStatus.key);

                if (!canGoBack && !canGoForward) return null;

                return (
                    <div className="flex items-center justify-center gap-2 mt-3">
                        {canGoBack && prevStatus && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(prevStatus.key)}
                                className="gap-1 text-xs h-7"
                            >
                                {isRTL ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                                {isRTL
                                    ? `الرجوع إلى: ${prevStatus.label_ar}`
                                    : `Back to: ${prevStatus.label_en}`
                                }
                            </Button>
                        )}
                        {canGoForward && nextStatus && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusChange(nextStatus.key)}
                                className={cn(
                                    'gap-1 text-xs h-7 text-white',
                                    nextStatus.borderColor.replace('border-', 'bg-').replace('-300', '-500').replace('-700', '-500'),
                                )}
                            >
                                {isRTL
                                    ? `نقل إلى: ${nextStatus.label_ar}`
                                    : `Move to: ${nextStatus.label_en}`
                                }
                                {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </Button>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

// ─── Status Badge (for inline use) ──────────────────────────────

export const ContainerStatusBadge: React.FC<{ status: string; varianceStatus?: string | null }> = ({ status, varianceStatus }) => {
    const hasVariance = status === 'received' && varianceStatus === 'pending_review';

    return (
        <div className="inline-flex items-center gap-1.5">
            <ContainerStatusStepper containerId="" currentStatus={status} mode="view" compact />
            {hasVariance && (
                <span className="relative flex items-center">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 animate-pulse">
                        ⚠️
                    </span>
                </span>
            )}
        </div>
    );
};
