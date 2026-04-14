/**
 * ═══════════════════════════════════════════════════════════
 * 🔍 normalizeSearch — Universal multi-language text search
 * تطبيع النص للبحث: عربي + روسي + أوكراني + تركي + إنجليزي
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Normalizes text for search comparison.
 * - Arabic: removes tashkeel, normalizes hamza/ta-marbuta/alef-maqsura
 * - Russian: ё → е
 * - Ukrainian: ґ → г
 * - Turkish: ı→i, ş→s, ç→c, ğ→g, ü→u, ö→o
 * - Universal: strips dashes, dots, special chars, collapses spaces
 */
export function normalizeText(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        // ─── Arabic ───
        // Remove diacritics (tashkeel: فتحة ضمة كسرة شدة سكون تنوين)
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
        // Hamza variants → ا
        .replace(/[أإآءٱ]/g, 'ا')
        // ؤ → و  |  ئ → ي
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        // ة → ه  |  ى → ي
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        // ─── Russian ───
        .replace(/ё/g, 'е')
        .replace(/й/g, 'и')
        // ─── Ukrainian ───
        .replace(/ґ/g, 'г')
        // ─── Turkish ───
        .replace(/ı/g, 'i')
        .replace(/İ/gi, 'i')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        // ─── Universal ───
        .replace(/[-_./\\|,;:!@#$%^&*()+=~`'"<>{}[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Smart multi-term search.
 * Splits query into words, ALL must be found in the haystack (AND logic).
 * Order of words doesn't matter.
 * 
 * @example
 * matchesSearch("سادة ابيض", "قطن بياز - سادة - أبيض") // true
 * matchesSearch("cotton white", "Cotton-White-Plain") // true
 * matchesSearch("бязь белая", "Бязь - Белая") // true
 */
export function matchesSearch(query: string, ...searchableTexts: string[]): boolean {
    if (!query || !query.trim()) return true;
    const terms = normalizeText(query).split(' ').filter(Boolean);
    if (terms.length === 0) return true;
    const haystack = normalizeText(searchableTexts.join(' '));
    return terms.every(term => haystack.includes(term));
}
