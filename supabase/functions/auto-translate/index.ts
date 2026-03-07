/**
 * Auto-Translate Edge Function
 * ════════════════════════════
 * ترجمة تلقائية للحقول باستخدام Google Gemini 2.5 Flash
 * يُستخدم لترجمة أسماء العملاء والموردين والحسابات
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslateRequest {
    text: string;
    source_language: string;      // ar, en, tr, ru, uk
    target_languages: string[];   // ['en', 'tr', 'ru', 'uk']
    context?: string;             // 'customer_name' | 'account_name' | 'product_name' | 'address'
}

const LANGUAGE_NAMES: Record<string, string> = {
    ar: 'Arabic',
    en: 'English',
    tr: 'Turkish',
    ru: 'Russian',
    uk: 'Ukrainian',
    ro: 'Romanian',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    hi: 'Hindi',
    fa: 'Persian',
    ur: 'Urdu',
    nl: 'Dutch',
    pl: 'Polish',
    sv: 'Swedish',
    el: 'Greek',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const apiKey = Deno.env.get('GOOGLE_AI_KEY');
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'GOOGLE_AI_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const body = await req.json();
        const { text, source_language, target_languages, context, mode } = body;

        if (!text || !target_languages || target_languages.length === 0) {
            throw new Error('Missing required fields: text, target_languages');
        }

        const sourceLang = source_language || 'ar';
        const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
        const targetPairs = target_languages
            .filter((lang: string) => lang !== sourceLang)
            .map((lang: string) => `"${lang}": ${LANGUAGE_NAMES[lang] || lang}`)
            .join('\n');

        let prompt = '';

        if (mode === 'generate_marketing_name') {
            // توليد اسم تجاري + ترجمته لكل اللغات
            prompt = `You are a marketing copywriter for an e-commerce fabric store.
Based on this product name: "${text}"
Generate a catchy, professional marketing/commercial name for it.
Then translate that marketing name to all these languages:
${targetPairs}

Also include "${sourceLang}" with the generated marketing name in ${sourceName}.

Return ONLY a JSON object: {"${sourceLang}": "generated name in ${sourceName}", ${target_languages.filter((l: string) => l !== sourceLang).map((l: string) => `"${l}": "translated name"`).join(', ')}}
Return JSON only, no markdown, no backticks.`;

        } else if (mode === 'generate_seo') {
            // توليد عنوان ووصف SEO
            prompt = `You are an SEO expert for an e-commerce fabric/textile store.
Based on this product: "${text}"
Generate SEO-optimized title (max 60 chars) and description (max 160 chars) in all these languages:
${targetPairs}
Also include "${sourceLang}" in ${sourceName}.

Return ONLY a JSON with this structure:
{
  "title": {"${sourceLang}": "SEO title", ${target_languages.filter((l: string) => l !== sourceLang).map((l: string) => `"${l}": "title"`).join(', ')}},
  "description": {"${sourceLang}": "SEO desc", ${target_languages.filter((l: string) => l !== sourceLang).map((l: string) => `"${l}": "desc"`).join(', ')}}
}
Return JSON only, no markdown, no backticks.`;

        } else if (mode === 'generate_description') {
            // توليد وصف تسويقي
            prompt = `You are a marketing copywriter for an e-commerce fabric/textile store.
Based on this product: "${text}"
Write a short, attractive marketing description (2-3 sentences max).
Then translate it to all these languages:
${targetPairs}
Also include "${sourceLang}" with the original description in ${sourceName}.

Return ONLY a JSON object: {"${sourceLang}": "description", ${target_languages.filter((l: string) => l !== sourceLang).map((l: string) => `"${l}": "translated desc"`).join(', ')}}
Return JSON only, no markdown, no backticks.`;

        } else {
            // الوضع الافتراضي: ترجمة
            const contextHint = context === 'customer_name' ? 'This is a company/customer name in an ERP system.' :
                context === 'account_name' ? 'This is an accounting chart of accounts entry name.' :
                    context === 'product_name' ? 'This is a product/material name in inventory.' :
                        context === 'address' ? 'This is a physical address or city name.' :
                            'This is a business entity name.';

            prompt = `Translate the following text from ${sourceName} to the requested languages.

${contextHint}
Keep proper nouns as-is when appropriate (brand names, company names that shouldn't be translated).
For company names, translate the descriptive part but keep the brand identity.
For accounting terms, use standard accounting terminology in each language.

Source text (${sourceName}): "${text}"

Translate to:
${targetPairs}

Return ONLY a JSON object with language codes as keys and translations as values.
Example: {"en": "...", "tr": "...", "ru": "...", "uk": "..."}
Return JSON only, no markdown, no backticks, no explanation.`;
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                    responseMimeType: 'application/json',
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
        }

        const result = await response.json();
        const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON response
        let cleanedText = responseText.trim();
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        let translations: any;
        try {
            translations = JSON.parse(cleanedText);
        } catch (parseErr) {
            console.error('JSON parse failed, raw:', cleanedText.slice(0, 500));
            // Try extracting JSON from the response — support nested objects
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                translations = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse translation response');
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                source: { language: sourceLang, text },
                translations,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error: any) {
        console.error('Translation error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Translation failed' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );
    }
});
