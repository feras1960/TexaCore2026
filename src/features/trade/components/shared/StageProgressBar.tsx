/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 StageProgressBar — شريط المراحل Odoo-style
 * ═══════════════════════════════════════════════════════════════
 * شريط أفقي يعرض جميع مراحل دورة الشراء/البيع مع:
 * - المرحلة الحالية ملوّنة ومميّزة
 * - المراحل المكتملة بعلامة ✓ والتاريخ
 * - المراحل المتبقية باللون الرمادي
 * - دعم RTL كامل
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import {
    PURCHASE_STAGES,
    SALES_STAGES,
    PURCHASE_PROGRESS_STAGES,
    SALES_PROGRESS_STAGES,
} from '../../config/stageConfig';
import type { PurchaseStage, SalesStage, StageDefinition } from '../../config/stageConfig';
import type { TransactionStageLog } from '../../types';
import {
    Check,
    Clock,
    Circle,
    FileEdit,
    FileSearch,
    ClipboardList,
    ShieldCheck,
    Package,
    PackageCheck,
    Receipt,
    CreditCard,
    CheckCircle2,
    XCircle,
    ArrowLeftRight,
    BookCheck,
    Flag,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
    FileEdit,
    FileSearch,
    ClipboardList,
    ShieldCheck,
    Package,
    PackageCheck,
    Receipt,
    CreditCard,
    CheckCircle2,
    XCircle,
    ArrowLeftRight,
    BookCheck,
    Flag,
    Check,
    Clock,
    Circle,
};

interface StageProgressBarProps {
    /** Transaction type */
    type: 'purchase' | 'sale';
    /** Current stage key */
    currentStage: string;
    /** Stage transition logs (to show timestamps) */
    stageLogs?: TransactionStageLog[];
    /** Additional CSS classes */
    className?: string;
    /** Compact mode (no labels, smaller) */
    compact?: boolean;
    /** Show cancelled stage? */
    showCancelled?: boolean;
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
    type,
    currentStage,
    stageLogs = [],
    className,
    compact = false,
    showCancelled = false,
}) => {
    const { isRTL, t } = useLanguage();

    // Get ordered stages (excluding cancelled and returned unless showCancelled)
    const stageKeys = useMemo(() => {
        const keys = type === 'purchase' ? PURCHASE_PROGRESS_STAGES : SALES_PROGRESS_STAGES;
        if (showCancelled || currentStage === 'cancelled') {
            return [...keys, 'cancelled'];
        }
        return keys;
    }, [type, showCancelled, currentStage]);

    const stageDefinitions = type === 'purchase' ? PURCHASE_STAGES : SALES_STAGES;

    // Find current stage index
    const currentIndex = stageKeys.indexOf(currentStage);

    // Build stage data with completion info
    const stages = useMemo(() => {
        return stageKeys.map((key, index) => {
            const def = stageDefinitions[key as PurchaseStage | SalesStage];
            if (!def) return null;

            // Find log entry for this stage
            const log = stageLogs.find(l => l.to_stage === key);
            const isCompleted = index < currentIndex;
            const isCurrent = key === currentStage;
            const isPending = index > currentIndex;
            const isCancelled = key === 'cancelled';

            // Get icon component
            const IconComponent = ICON_MAP[def.icon] || Circle;

            return {
                key,
                def,
                icon: IconComponent,
                isCompleted,
                isCurrent,
                isPending,
                isCancelled,
                timestamp: log?.performed_at,
                performedBy: log?.performed_by_name,
                generatedNumber: log?.generated_number,
                notes: log?.notes,
            };
        }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[];
    }, [stageKeys, stageDefinitions, currentStage, currentIndex, stageLogs]);

    const formatTimestamp = (ts: string) => {
        try {
            return format(new Date(ts), 'dd/MM HH:mm', { locale: isRTL ? ar : undefined });
        } catch {
            return ts;
        }
    };

    if (stages.length === 0) return null;

    return (
        <TooltipProvider>
            <div
                className={cn(
                    'flex items-center w-full overflow-x-auto scrollbar-thin',
                    isRTL ? 'flex-row-reverse' : 'flex-row',
                    compact ? 'gap-0.5' : 'gap-0',
                    className
                )}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {stages.map((stage: any, index: number) => {
                    const Icon = stage.icon;
                    const isLast = index === stages.length - 1;

                    // Base colors
                    let bgColor = 'bg-gray-100 dark:bg-gray-800';
                    let textColor = 'text-gray-400 dark:text-gray-500';
                    let borderColor = 'border-gray-200 dark:border-gray-700';
                    let connectorColor = 'bg-gray-200 dark:bg-gray-700';
                    let dotColor = 'bg-gray-300 dark:bg-gray-600';

                    if (stage.isCompleted) {
                        bgColor = 'bg-emerald-50 dark:bg-emerald-950/30';
                        textColor = 'text-emerald-600 dark:text-emerald-400';
                        borderColor = 'border-emerald-200 dark:border-emerald-800';
                        connectorColor = 'bg-emerald-400 dark:bg-emerald-600';
                        dotColor = 'bg-emerald-500';
                    } else if (stage.isCurrent) {
                        bgColor = stage.def.color.replace('bg-', 'bg-').replace('500', '50') + ' dark:bg-opacity-20';
                        textColor = stage.def.color.replace('bg-', 'text-');
                        borderColor = stage.def.color.replace('bg-', 'border-').replace('500', '300');
                        connectorColor = 'bg-gray-200 dark:bg-gray-700';
                        dotColor = stage.def.color;
                    } else if (stage.isCancelled && stage.isCurrent) {
                        bgColor = 'bg-red-50 dark:bg-red-950/30';
                        textColor = 'text-red-600 dark:text-red-400';
                        borderColor = 'border-red-200 dark:border-red-800';
                        dotColor = 'bg-red-500';
                    }

                    return (
                        <React.Fragment key={stage.key}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            'flex flex-col items-center shrink-0 cursor-default transition-all duration-200',
                                            compact ? 'min-w-[28px]' : 'min-w-[72px]',
                                            stage.isCurrent && !compact && 'scale-105',
                                        )}
                                    >
                                        {/* Stage dot/icon */}
                                        <div
                                            className={cn(
                                                'relative flex items-center justify-center rounded-full border-2 transition-all duration-300',
                                                compact ? 'w-6 h-6' : 'w-8 h-8',
                                                stage.isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                                                stage.isCurrent && !stage.isCancelled && `${dotColor} border-current ${textColor} ring-2 ring-offset-1 ring-current/30`,
                                                stage.isCurrent && stage.isCancelled && 'bg-red-500 border-red-500 text-white',
                                                stage.isPending && 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400',
                                            )}
                                        >
                                            {stage.isCompleted ? (
                                                <Check className={cn(compact ? 'w-3 h-3' : 'w-4 h-4')} />
                                            ) : stage.isCurrent ? (
                                                <Icon className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', stage.isCancelled ? 'text-white' : '')} />
                                            ) : (
                                                <Circle className={cn(compact ? 'w-2 h-2' : 'w-3 h-3')} />
                                            )}

                                            {/* Pulse animation for current */}
                                            {stage.isCurrent && !stage.isCancelled && (
                                                <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
                                            )}
                                        </div>

                                        {/* Stage label */}
                                        {!compact && (
                                            <div className="mt-1.5 text-center">
                                                <span
                                                    className={cn(
                                                        'block text-[10px] font-medium leading-tight',
                                                        stage.isCompleted && 'text-emerald-600 dark:text-emerald-400',
                                                        stage.isCurrent && textColor,
                                                        stage.isCurrent && 'font-bold text-[11px]',
                                                        stage.isPending && 'text-gray-400 dark:text-gray-500',
                                                    )}
                                                >
                                                    {t(stage.def.labelKey) || stage.key}
                                                </span>

                                                {/* Timestamp for completed */}
                                                {stage.timestamp && (
                                                    <span className="block text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {formatTimestamp(stage.timestamp)}
                                                    </span>
                                                )}

                                                {/* Generated number */}
                                                {stage.generatedNumber && (
                                                    <span className="block text-[8px] text-emerald-500 font-mono mt-0.5">
                                                        {stage.generatedNumber}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>

                                <TooltipContent side="bottom" className="max-w-[200px]">
                                    <div className="text-xs space-y-1">
                                        <p className="font-semibold">
                                            {t(stage.def.labelKey) || stage.key}
                                        </p>
                                        {stage.timestamp && (
                                            <p className="text-gray-400">
                                                📅 {formatTimestamp(stage.timestamp)}
                                            </p>
                                        )}
                                        {stage.performedBy && (
                                            <p className="text-gray-400">
                                                👤 {stage.performedBy}
                                            </p>
                                        )}
                                        {stage.generatedNumber && (
                                            <p className="text-emerald-500 font-mono">
                                                # {stage.generatedNumber}
                                            </p>
                                        )}
                                        {stage.notes && (
                                            <p className="text-gray-400 italic">
                                                💬 {stage.notes}
                                            </p>
                                        )}
                                        {stage.isPending && (
                                            <p className="text-gray-400">
                                                {isRTL ? 'لم يصل بعد' : 'Not reached yet'}
                                            </p>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            {/* Connector line */}
                            {!isLast && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 min-w-[12px] max-w-[40px] self-center mb-auto',
                                        compact ? 'mt-3' : 'mt-4',
                                        stage.isCompleted ? connectorColor : 'bg-gray-200 dark:bg-gray-700',
                                    )}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </TooltipProvider>
    );
};

export default StageProgressBar;
