/**
 * ═══════════════════════════════════════════════════════════════
 * 🏷️ TransactionStageBadge — شارة المرحلة الملونة
 * ═══════════════════════════════════════════════════════════════
 * تعرض مرحلة المعاملة مع لون + أيقونة + اسم
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getStageConfig } from '@/config/stageConfig';
import { cn } from '@/lib/utils';

interface TransactionStageBadgeProps {
    type: 'purchase' | 'sale';
    stage: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

export const TransactionStageBadge: React.FC<TransactionStageBadgeProps> = ({
    type,
    stage,
    size = 'md',
    showIcon = true,
    className,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const config = getStageConfig(type, stage);

    if (!config) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                {stage}
            </span>
        );
    }

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px] gap-1',
        md: 'px-2.5 py-1 text-xs gap-1.5',
        lg: 'px-3.5 py-1.5 text-sm gap-2',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full font-semibold transition-all duration-200',
                sizeClasses[size],
                className
            )}
            style={{
                backgroundColor: config.bgColor,
                color: config.color,
                border: `1px solid ${config.color}20`,
            }}
        >
            {/* Dot */}
            <span
                className={cn(
                    'rounded-full shrink-0',
                    size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5'
                )}
                style={{ backgroundColor: config.color }}
            />

            {/* Icon */}
            {showIcon && <span className="shrink-0">{config.icon}</span>}

            {/* Label */}
            <span className="whitespace-nowrap">
                {isAr ? config.label_ar : config.label_en}
            </span>
        </span>
    );
};

export default TransactionStageBadge;
