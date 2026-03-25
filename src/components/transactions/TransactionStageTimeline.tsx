/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 TransactionStageTimeline — خط الزمن للمراحل
 * ═══════════════════════════════════════════════════════════════
 * يعرض مراحل المعاملة كخط زمني أفقي مع:
 * - المراحل المنجزة (ملونة)
 * - المرحلة الحالية (مميزة)
 * - المراحل المستقبلية (رمادية)
 * - عرض سجل التحويلات من قاعدة البيانات
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getStageConfig, getStageIndex, PURCHASE_STAGE_ORDER, SALES_STAGE_ORDER } from '@/config/stageConfig';
import type { TransactionStageLog } from '@/types/transactions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface TransactionStageTimelineProps {
    type: 'purchase' | 'sale';
    currentStage: string;
    /** سجل التحويلات (اختياري — لعرض تفاصيل كل مرحلة) */
    stageHistory?: TransactionStageLog[];
    /** إخفاء المراحل الملغاة */
    hideCancelled?: boolean;
    className?: string;
}

export const TransactionStageTimeline: React.FC<TransactionStageTimelineProps> = ({
    type,
    currentStage,
    stageHistory = [],
    hideCancelled = true,
    className,
}) => {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';

    const stageOrder = type === 'purchase' ? PURCHASE_STAGE_ORDER : SALES_STAGE_ORDER;
    const currentIndex = getStageIndex(type, currentStage);

    // بناء خريطة سريعة للتاريخ
    const historyMap = new Map<string, TransactionStageLog>();
    stageHistory.forEach(log => {
        historyMap.set(log.to_stage, log);
    });

    // هل المعاملة ملغاة؟
    const isCancelled = currentStage === 'cancelled';

    const formatTimestamp = (ts: string) => {
        try {
            return format(new Date(ts), 'dd/MM/yyyy HH:mm', { locale: isAr ? ar : undefined });
        } catch {
            return ts;
        }
    };

    return (
        <div className={cn('w-full', className)} dir={direction}>
            {/* ═══ Horizontal Timeline ═══ */}
            <div className="relative flex items-center overflow-x-auto py-3 px-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                <TooltipProvider delayDuration={200}>
                    {stageOrder.map((stageKey, idx) => {
                        const config = getStageConfig(type, stageKey);
                        if (!config) return null;

                        const log = historyMap.get(stageKey);
                        const isPast = idx < currentIndex;
                        const isCurrent = stageKey === currentStage;
                        const isFuture = idx > currentIndex;

                        return (
                            <React.Fragment key={stageKey}>
                                {/* ─── Node ─── */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                'relative flex flex-col items-center shrink-0 cursor-default',
                                                'transition-all duration-300',
                                                isCurrent && 'scale-110 z-10',
                                            )}
                                        >
                                            {/* Circle */}
                                            <div
                                                className={cn(
                                                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                                    isPast && 'border-transparent shadow-sm',
                                                    isCurrent && 'border-2 shadow-lg ring-4 ring-opacity-20',
                                                    isFuture && 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
                                                    isCancelled && isCurrent && 'border-red-500 ring-red-500/20',
                                                )}
                                                style={{
                                                    ...(isPast ? { backgroundColor: config.color } : {}),
                                                    ...(isCurrent && !isCancelled ? {
                                                        backgroundColor: config.bgColor,
                                                        borderColor: config.color,
                                                        boxShadow: `0 0 0 4px ${config.color}20`,
                                                    } : {}),
                                                }}
                                            >
                                                {isPast ? (
                                                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                                ) : isCurrent ? (
                                                    <span className="text-sm">{config.icon}</span>
                                                ) : (
                                                    <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                                                )}
                                            </div>

                                            {/* Label */}
                                            <span
                                                className={cn(
                                                    'mt-1.5 text-[10px] font-semibold whitespace-nowrap max-w-[80px] text-center truncate',
                                                    isPast && 'text-gray-500 dark:text-gray-400',
                                                    isCurrent && 'font-bold',
                                                    isFuture && 'text-gray-300 dark:text-gray-600',
                                                )}
                                                style={{
                                                    ...(isCurrent ? { color: config.color } : {}),
                                                }}
                                            >
                                                {isAr ? config.label_ar : config.label_en}
                                            </span>
                                        </div>
                                    </TooltipTrigger>

                                    {/* Tooltip Details */}
                                    <TooltipContent
                                        side="bottom"
                                        className="max-w-[240px] text-xs"
                                        dir={direction}
                                    >
                                        <div className="space-y-1.5">
                                            <p className="font-bold flex items-center gap-1.5">
                                                <span>{config.icon}</span>
                                                {isAr ? config.label_ar : config.label_en}
                                            </p>
                                            {log ? (
                                                <>
                                                    <p className="text-gray-500">
                                                        {log.performed_by_name || (isAr ? 'مستخدم' : 'User')}
                                                    </p>
                                                    <p className="text-gray-400 text-[10px] font-mono tabular-nums">
                                                        {formatTimestamp(log.performed_at)}
                                                    </p>
                                                    {log.notes && (
                                                        <p className="text-gray-400 italic">
                                                            {log.notes}
                                                        </p>
                                                    )}
                                                    {log.generated_number && (
                                                        <p className="font-mono text-[10px] text-gray-400">
                                                            # {log.generated_number}
                                                        </p>
                                                    )}
                                                </>
                                            ) : isPast ? (
                                                <p className="text-gray-400">{isAr ? 'تم التحويل' : 'Completed'}</p>
                                            ) : isCurrent ? (
                                                <p className="text-gray-400">{isAr ? 'المرحلة الحالية' : 'Current Stage'}</p>
                                            ) : (
                                                <p className="text-gray-400">{isAr ? 'قيد الانتظار' : 'Pending'}</p>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>

                                {/* ─── Connector Line ─── */}
                                {idx < stageOrder.length - 1 && (
                                    <div className="flex-1 min-w-[24px] max-w-[60px] mx-1 flex items-center">
                                        <div
                                            className={cn(
                                                'h-[2px] w-full rounded-full transition-all duration-500',
                                                idx < currentIndex
                                                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                                                    : 'bg-gray-200 dark:bg-gray-700',
                                            )}
                                        />
                                        {idx === currentIndex - 1 && (
                                            <div className="absolute">
                                                {isAr ? (
                                                    <ChevronLeft
                                                        className="w-3 h-3 text-green-500 animate-pulse"
                                                        style={{ marginInlineStart: '-2px' }}
                                                    />
                                                ) : (
                                                    <ChevronRight
                                                        className="w-3 h-3 text-green-500 animate-pulse"
                                                        style={{ marginInlineStart: '-2px' }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </TooltipProvider>
            </div>

            {/* ═══ Cancelled Overlay ═══ */}
            {isCancelled && !hideCancelled && (
                <div className="mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                    <span className="text-red-500 text-sm">❌</span>
                    <span className="text-red-600 dark:text-red-400 text-sm font-semibold">
                        {isAr ? 'تم إلغاء هذه المعاملة' : 'This transaction has been cancelled'}
                    </span>
                    {historyMap.get('cancelled')?.performed_by_name && (
                        <span className="text-red-400 text-xs">
                            — {historyMap.get('cancelled')!.performed_by_name}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionStageTimeline;
