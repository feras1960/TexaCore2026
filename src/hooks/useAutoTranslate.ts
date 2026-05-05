/**
 * useAutoTranslate Hook
 * ═════════════════════
 * ترجمة تلقائية بوكيل نيكسا AI (Gemini 2.5 Flash)
 * يترجم لكل اللغات المدعومة — ضغطة واحدة بدون اختيار
 * التكلفة مهملة (~$0.0002 لكل ترجمة)
 */

import { useState, useCallback } from 'react';
import { supabase, cloudSupabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// كل اللغات المدعومة في النظام
export type TranslationLanguage = 'ar' | 'en' | 'tr' | 'ru' | 'uk' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'ro' | 'pl';
export type TranslationContext = 'customer_name' | 'account_name' | 'product_name' | 'address';

// كل اللغات المدعومة في النظام (10 لغات — 9 من i18n + الفرنسية)
const SYSTEM_LANGUAGES: TranslationLanguage[] = [
    'ar', 'en', 'ru', 'uk', 'ro', 'pl', 'tr', 'de', 'it', 'fr',
];

interface TranslationResult {
    [key: string]: string;
}

interface UseAutoTranslateOptions {
    context?: TranslationContext;
    onTranslated?: (translations: TranslationResult) => void;
}

const LANGUAGE_LABELS: Record<string, { ar: string; en: string; flag: string }> = {
    ar: { ar: 'العربية', en: 'Arabic', flag: '🇸🇦' },
    en: { ar: 'الإنجليزية', en: 'English', flag: '🇬🇧' },
    tr: { ar: 'التركية', en: 'Turkish', flag: '🇹🇷' },
    ru: { ar: 'الروسية', en: 'Russian', flag: '🇷🇺' },
    uk: { ar: 'الأوكرانية', en: 'Ukrainian', flag: '🇺🇦' },
    fr: { ar: 'الفرنسية', en: 'French', flag: '🇫🇷' },
    de: { ar: 'الألمانية', en: 'German', flag: '🇩🇪' },
    it: { ar: 'الإيطالية', en: 'Italian', flag: '🇮🇹' },
    ro: { ar: 'الرومانية', en: 'Romanian', flag: '🇷🇴' },
    pl: { ar: 'البولندية', en: 'Polish', flag: '🇵🇱' },
    es: { ar: 'الإسبانية', en: 'Spanish', flag: '🇪🇸' },
    pt: { ar: 'البرتغالية', en: 'Portuguese', flag: '🇵🇹' },
};

export { LANGUAGE_LABELS };

export function useAutoTranslate(options: UseAutoTranslateOptions = {}) {
    const { context = 'customer_name', onTranslated } = options;
    const { toast } = useToast();
    const [isTranslating, setIsTranslating] = useState(false);

    /**
     * ترجمة فورية لكل اللغات المدعومة — ضغطة واحدة
     */
    const translate = useCallback(async (
        text: string,
        sourceLanguage: TranslationLanguage
    ): Promise<TranslationResult | null> => {
        if (!text.trim()) {
            toast({ title: 'لا يوجد نص للترجمة', variant: 'destructive' });
            return null;
        }

        // ترجم لكل اللغات المدعومة ماعدا لغة المصدر
        const targetLangs = SYSTEM_LANGUAGES.filter(l => l !== sourceLanguage);

        setIsTranslating(true);
        try {
            const { data, error } = await cloudSupabase.functions.invoke('auto-translate', {
                body: {
                    text: text.trim(),
                    source_language: sourceLanguage,
                    target_languages: targetLangs,
                    context,
                }
            });

            if (error) throw error;

            if (data?.success && data.translations) {
                const result = data.translations as TranslationResult;
                onTranslated?.(result);

                const count = Object.keys(result).length;
                const flags = Object.keys(result).map(lang => LANGUAGE_LABELS[lang]?.flag || '').join(' ');
                toast({
                    title: `✅ وكيل نيكسا AI — ترجم إلى ${count} لغات`,
                    description: flags,
                });

                return result;
            }

            throw new Error(data?.error || 'Translation failed');
        } catch (err: any) {
            console.error('Translation error:', err);
            toast({
                title: 'فشل الترجمة',
                description: err.message || 'حاول مرة أخرى',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsTranslating(false);
        }
    }, [context, onTranslated, toast]);

    return {
        translate,
        isTranslating,
        LANGUAGE_LABELS,
        autoEnabled: true,
    };
}
