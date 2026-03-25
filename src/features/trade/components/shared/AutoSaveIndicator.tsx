/**
 * ═══════════════════════════════════════════════════════════════
 * 💾 AutoSaveIndicator — مؤشر الحفظ التلقائي
 * ═══════════════════════════════════════════════════════════════
 * يعرض حالة الحفظ: ⏳ جاري / ✅ تم / ⚠️ خطأ / ○ لا تغييرات
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoSaveIndicatorProps {
    /** Is saving right now? */
    isSaving: boolean;
    /** Last saved timestamp */
    lastSavedAt: Date | null;
    /** Has unsaved changes? */
    hasUnsavedChanges: boolean;
    /** Error message */
    error?: string | null;
    /** Manual save trigger */
    onSaveNow?: () => void;
    /** Additional CSS */
    className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
    isSaving,
    lastSavedAt,
    hasUnsavedChanges,
    error,
    onSaveNow,
    className,
}) => {
    const { isRTL } = useLanguage();

    const formatTime = (date: Date) => {
        try {
            return format(date, 'HH:mm:ss', { locale: isRTL ? ar : undefined });
        } catch {
            return '';
        }
    };

    // Determine state
    let icon: React.ReactNode;
    let text: string;
    let colorClass: string;

    if (error) {
        icon = <AlertTriangle className="w-3 h-3" />;
        text = isRTL ? 'خطأ في الحفظ' : 'Save error';
        colorClass = 'text-red-500';
    } else if (isSaving) {
        icon = <Loader2 className="w-3 h-3 animate-spin" />;
        text = isRTL ? 'جاري الحفظ...' : 'Saving...';
        colorClass = 'text-amber-500';
    } else if (hasUnsavedChanges) {
        icon = <Circle className="w-3 h-3 fill-current" />;
        text = isRTL ? 'تغييرات غير محفوظة' : 'Unsaved changes';
        colorClass = 'text-amber-500';
    } else if (lastSavedAt) {
        icon = <CheckCircle2 className="w-3 h-3" />;
        text = isRTL ? `تم الحفظ ${formatTime(lastSavedAt)}` : `Saved at ${formatTime(lastSavedAt)}`;
        colorClass = 'text-emerald-500';
    } else {
        return null; // Nothing to show
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={hasUnsavedChanges && onSaveNow ? onSaveNow : undefined}
                        className={cn(
                            'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all',
                            colorClass,
                            hasUnsavedChanges && onSaveNow ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                            error && 'bg-red-50 dark:bg-red-950/20',
                            isSaving && 'bg-amber-50 dark:bg-amber-950/20',
                            !isSaving && !error && !hasUnsavedChanges && lastSavedAt && 'bg-emerald-50 dark:bg-emerald-950/20',
                            className
                        )}
                    >
                        {icon}
                        <span className="font-medium">{text}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-xs space-y-1">
                        {error && <p className="text-red-500">{error}</p>}
                        {hasUnsavedChanges && onSaveNow && (
                            <p>{isRTL ? 'اضغط للحفظ الآن' : 'Click to save now'}</p>
                        )}
                        {lastSavedAt && (
                            <p className="text-gray-400">
                                {isRTL ? 'آخر حفظ: ' : 'Last saved: '}
                                {formatTime(lastSavedAt)}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default AutoSaveIndicator;
