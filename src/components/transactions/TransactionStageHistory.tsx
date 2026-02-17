/**
 * ═══════════════════════════════════════════════════════════════
 * 📜 TransactionStageHistory — سجل تحويلات المراحل
 * ═══════════════════════════════════════════════════════════════
 * عرض كل التحويلات بشكل عمودي (vertical timeline)
 * مع تفاصيل المستخدم والوقت والملاحظات
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getStageConfig } from '@/config/stageConfig';
import type { TransactionStageLog, TransactionType } from '@/types/transactions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowDown, User, Clock, FileText, Hash } from 'lucide-react';

interface TransactionStageHistoryProps {
    type: TransactionType;
    history: TransactionStageLog[];
    className?: string;
}

export const TransactionStageHistory: React.FC<TransactionStageHistoryProps> = ({
    type,
    history,
    className,
}) => {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';
    const stageType = type === 'purchase' ? 'purchase' : 'sale';

    const formatTimestamp = (ts: string) => {
        try {
            return format(new Date(ts), 'dd/MM/yyyy — HH:mm:ss', { locale: isAr ? ar : undefined });
        } catch {
            return ts;
        }
    };

    if (history.length === 0) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-8 text-gray-400', className)}>
                <Clock className="w-10 h-10 mb-2 opacity-25" />
                <p className="text-sm font-medium">{isAr ? 'لا يوجد سجل تحويلات بعد' : 'No stage transitions yet'}</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-0', className)} dir={direction}>
            {history.map((log, idx) => {
                const fromConfig = getStageConfig(stageType, log.from_stage);
                const toConfig = getStageConfig(stageType, log.to_stage);
                const isLast = idx === history.length - 1;

                return (
                    <div key={log.id} className="relative">
                        {/* ─── Card ─── */}
                        <div
                            className={cn(
                                'relative flex items-start gap-3 py-3 px-4 rounded-xl transition-all duration-200',
                                'hover:bg-gray-50/80 dark:hover:bg-gray-800/40',
                                isLast && 'bg-gray-50/50 dark:bg-gray-800/30',
                            )}
                        >
                            {/* ─── Timeline Dot ─── */}
                            <div className="relative flex flex-col items-center shrink-0 mt-0.5">
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center border-2 z-10',
                                        isLast
                                            ? 'border-transparent shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
                                    )}
                                    style={{
                                        ...(isLast && toConfig ? {
                                            backgroundColor: toConfig.color,
                                        } : {}),
                                    }}
                                >
                                    {isLast && toConfig ? (
                                        <span className="text-white text-xs">{toConfig.icon}</span>
                                    ) : (
                                        <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                </div>
                                {/* Vertical Line */}
                                {!isLast && (
                                    <div className="w-[2px] h-full absolute top-8 bg-gray-200 dark:bg-gray-700" />
                                )}
                            </div>

                            {/* ─── Content ─── */}
                            <div className="flex-1 min-w-0 space-y-1.5 pb-3">
                                {/* Stage Transition Label */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {fromConfig && (
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                            style={{
                                                backgroundColor: fromConfig.bgColor,
                                                color: fromConfig.color,
                                            }}
                                        >
                                            {fromConfig.icon} {isAr ? fromConfig.label_ar : fromConfig.label_en}
                                        </span>
                                    )}
                                    <span className="text-gray-400 text-xs">→</span>
                                    {toConfig && (
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
                                            style={{
                                                backgroundColor: toConfig.bgColor,
                                                color: toConfig.color,
                                                border: `1px solid ${toConfig.color}30`,
                                            }}
                                        >
                                            {toConfig.icon} {isAr ? toConfig.label_ar : toConfig.label_en}
                                        </span>
                                    )}
                                </div>

                                {/* Meta Info */}
                                <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                                    {/* User */}
                                    {log.performed_by_name && (
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {log.performed_by_name}
                                        </span>
                                    )}

                                    {/* Time */}
                                    <span className="flex items-center gap-1 font-mono tabular-nums">
                                        <Clock className="w-3 h-3" />
                                        {formatTimestamp(log.performed_at)}
                                    </span>

                                    {/* Generated Number */}
                                    {log.generated_number && (
                                        <span className="flex items-center gap-1 font-mono">
                                            <Hash className="w-3 h-3" />
                                            {log.generated_number}
                                        </span>
                                    )}
                                </div>

                                {/* Notes */}
                                {log.notes && (
                                    <div className="flex items-start gap-1.5 mt-1">
                                        <FileText className="w-3 h-3 text-gray-300 mt-0.5 shrink-0" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {log.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TransactionStageHistory;
