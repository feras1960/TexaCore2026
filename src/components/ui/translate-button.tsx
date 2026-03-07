/**
 * TranslateButton — زر ترجمة تلقائية بوكيل نيكسا AI
 * ══════════════════════════════════════════════════
 * ضغطة واحدة → ترجمة فورية لكل اللغات المدعومة
 * بدون popover — بسيط وسريع
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAutoTranslate, type TranslationLanguage, type TranslationContext } from '@/hooks/useAutoTranslate';
import { useLanguage } from '@/hooks';
import { cn } from '@/lib/utils';

interface TranslateButtonProps {
    /** النص المصدر للترجمة */
    sourceText: string;
    /** لغة المصدر */
    sourceLanguage: TranslationLanguage;
    /** سياق الترجمة */
    context?: TranslationContext;
    /** Callback عند اكتمال الترجمة */
    onTranslated: (translations: Record<string, string>) => void;
    /** حجم الزر */
    size?: 'sm' | 'default' | 'icon';
    /** CSS class إضافي */
    className?: string;
    /** إخفاء النص وعرض أيقونة فقط */
    iconOnly?: boolean;
}

export function TranslateButton({
    sourceText,
    sourceLanguage,
    context = 'customer_name',
    onTranslated,
    size = 'sm',
    className,
    iconOnly = false,
}: TranslateButtonProps) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const {
        translate,
        isTranslating,
    } = useAutoTranslate({
        context,
        onTranslated,
    });

    const handleTranslate = async () => {
        if (!sourceText?.trim()) return;
        await translate(sourceText, sourceLanguage);
    };

    return (
        <Button
            variant="outline"
            size={size}
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText?.trim()}
            className={cn(
                "gap-1.5 border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950 shrink-0",
                isTranslating && "animate-pulse",
                className
            )}
        >
            {isTranslating ? (
                <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {!iconOnly && (
                        <span className="text-xs font-medium">
                            {isRTL ? 'يترجم...' : 'Translating...'}
                        </span>
                    )}
                </>
            ) : (
                <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {!iconOnly && (
                        <span className="text-xs font-medium">
                            {isRTL ? '✨ نيكسا AI' : '✨ NexaAI'}
                        </span>
                    )}
                </>
            )}
        </Button>
    );
}
