/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 TransactionStageStats — إحصاءات المراحل
 * ═══════════════════════════════════════════════════════════════
 * عرض عدد المعاملات حسب المرحلة كـ mini dashboard
 * يُستخدم في أعلى صفحة القائمة
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { PURCHASE_STAGES, SALES_STAGES, PURCHASE_STAGE_ORDER, SALES_STAGE_ORDER } from '@/config/stageConfig';
import type { TransactionType } from '@/types/transactions';
import { cn } from '@/lib/utils';

interface TransactionStageStatsProps {
    type: TransactionType;
    stats: Record<string, number>;
    /** المرحلة المختارة حالياً (فلتر) */
    selectedStage?: string | null;
    /** عند اختيار مرحلة */
    onStageSelect?: (stage: string | null) => void;
    className?: string;
}

export const TransactionStageStats: React.FC<TransactionStageStatsProps> = ({
    type,
    stats,
    selectedStage,
    onStageSelect,
    className,
}) => {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';
    const isPurchase = type === 'purchase';

    const stageOrder = isPurchase ? PURCHASE_STAGE_ORDER : SALES_STAGE_ORDER;
    const stagesConfig = isPurchase ? PURCHASE_STAGES : SALES_STAGES;

    const totalCount = Object.values(stats).reduce((sum, v) => sum + v, 0);

    const handleClick = (stage: string) => {
        if (!onStageSelect) return;
        if (selectedStage === stage) {
            onStageSelect(null); // toggle off
        } else {
            onStageSelect(stage);
        }
    };

    return (
        <div className={cn('w-full', className)} dir={direction}>
            {/* ─── Summary Bar ─── */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {isPurchase ? (isAr ? 'المشتريات' : 'Purchases') : (isAr ? 'المبيعات' : 'Sales')}
                </span>
                <span className="text-xs font-mono text-gray-400 tabular-nums bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                    {totalCount}
                </span>
            </div>

            {/* ─── Stage Chips ─── */}
            <div className="flex flex-wrap gap-2">
                {/* All */}
                <button
                    onClick={() => onStageSelect?.(null)}
                    className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
                        'transition-all duration-200 cursor-pointer border',
                        !selectedStage
                            ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 border-transparent shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300',
                    )}
                >
                    {isAr ? 'الكل' : 'All'}
                    <span className="font-mono tabular-nums text-[10px] opacity-70">
                        {totalCount}
                    </span>
                </button>

                {stageOrder.map((stageKey) => {
                    const config = stagesConfig[stageKey];
                    if (!config) return null;

                    const count = stats[stageKey] || 0;
                    const isSelected = selectedStage === stageKey;

                    return (
                        <button
                            key={stageKey}
                            onClick={() => handleClick(stageKey)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
                                'transition-all duration-200 cursor-pointer border',
                                isSelected
                                    ? 'shadow-sm border-transparent'
                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-sm',
                                count === 0 && !isSelected && 'opacity-40',
                            )}
                            style={{
                                ...(isSelected ? {
                                    backgroundColor: config.bgColor,
                                    color: config.color,
                                    borderColor: `${config.color}40`,
                                } : {}),
                            }}
                        >
                            <span
                                className={cn(
                                    'w-1.5 h-1.5 rounded-full shrink-0',
                                )}
                                style={{ backgroundColor: config.color }}
                            />
                            {isAr ? config.label_ar : config.label_en}
                            <span
                                className={cn(
                                    'font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-md min-w-[20px] text-center',
                                    isSelected
                                        ? 'bg-white/30'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}

                {/* Cancelled (separate) */}
                {(stats['cancelled'] || 0) > 0 && (
                    <button
                        onClick={() => handleClick('cancelled')}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
                            'transition-all duration-200 cursor-pointer border',
                            selectedStage === 'cancelled'
                                ? 'bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200 dark:border-red-800 shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:shadow-sm',
                        )}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {isAr ? 'ملغاة' : 'Cancelled'}
                        <span className="font-mono tabular-nums text-[10px] bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded-md">
                            {stats['cancelled'] || 0}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TransactionStageStats;
