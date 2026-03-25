/**
 * ════════════════════════════════════════════════════════════════
 * 🔢 Smart Roll Number Service — خدمة ترقيم الرولونات الذكية
 * ════════════════════════════════════════════════════════════════
 *
 * نظام ترقيم هجين:
 *   الكود الوصفي: COT.PL.WH  (مادة.تصميم.لون)
 *   الرقم الفريد: 001         (تسلسلي per-company يبدأ من 1)
 *   الكود الكامل: COT.PL.WH-001
 *
 * البحث السريع: بالرقم الفريد فقط (أرقام)
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────
export interface RollCodeInput {
    companyId: string;
    /** كود المادة المسجل في fabric_materials.code */
    materialCode?: string;
    /** اسم المادة (يُستخدم إذا لم يكن هناك كود) */
    materialName?: string;
    /** كود التصميم (variant axis 1) — اختياري */
    designCode?: string;
    /** كود اللون (variant axis 2 أو fabric_colors.code) — اختياري */
    colorCode?: string;
    /** اسم اللون (يُستخدم لتوليد كود إذا لم يكن هناك code) */
    colorName?: string;
}

export interface SmartRollNumber {
    /** الرقم الكامل: COT.PL.WH-001 */
    roll_number: string;
    /** الكود الوصفي: COT.PL.WH */
    roll_code: string;
    /** الرقم التسلسلي الفريد: 1 */
    roll_seq: number;
}

// ─── Abbreviation Helpers ───────────────────────────────────

/**
 * تحويل نص إلى كود مختصر (2-5 أحرف إنجليزية كبيرة)
 * - يأخذ كود المادة إذا كان موجوداً ومختصراً
 * - يولّد اختصار من الاسم إذا لم يكن هناك كود
 */
export function abbreviate(text: string | undefined | null, maxLen = 4): string {
    if (!text) return '';

    // 1. إذا كان النص أصلاً كود قصير إنجليزي
    const clean = text.replace(/[-_.\s]/g, '').toUpperCase();
    if (/^[A-Z0-9]+$/.test(clean) && clean.length <= maxLen + 2) {
        return clean.slice(0, maxLen);
    }

    // 2. إذا كان يحتوي على "-" كفاصل → خذ أول حرف من كل جزء
    if (text.includes('-') || text.includes('_')) {
        const parts = text.split(/[-_]/);
        const abbr = parts
            .map(p => p.trim().replace(/[^A-Za-z0-9\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase())
            .filter(Boolean)
            .join('');
        if (abbr.length >= 2) return abbr.slice(0, maxLen);
    }

    // 3. محاولة أخذ الأحرف الأولى من الكلمات
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1) {
        // خذ أول حرف أو حرفين من كل كلمة
        const initials = words
            .map(w => {
                const asciiOnly = w.replace(/[^A-Za-z0-9]/g, '');
                return asciiOnly ? asciiOnly.slice(0, 2).toUpperCase() : '';
            })
            .filter(Boolean)
            .join('');
        if (initials.length >= 2) return initials.slice(0, maxLen);
    }

    // 4. Fallback: أول N أحرف إنجليزية
    const ascii = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return ascii.slice(0, maxLen) || 'XX';
}

/**
 * بناء الكود الوصفي من أجزاء المادة والمتغيرات
 * الصيغة: MAT[.DES][.CLR]
 */
export function buildRollCode(input: {
    materialCode?: string;
    materialName?: string;
    designCode?: string;
    colorCode?: string;
    colorName?: string;
}): string {
    const parts: string[] = [];

    // الجزء 1: كود المادة (مطلوب دائماً)
    const matAbbr = abbreviate(input.materialCode || input.materialName, 4);
    if (matAbbr) parts.push(matAbbr);
    else parts.push('MAT');

    // الجزء 2: كود التصميم (اختياري)
    if (input.designCode) {
        const desAbbr = abbreviate(input.designCode, 3);
        if (desAbbr) parts.push(desAbbr);
    }

    // الجزء 3: كود اللون (اختياري)
    const colorAbbr = abbreviate(input.colorCode || input.colorName, 3);
    if (colorAbbr) parts.push(colorAbbr);

    return parts.join('.');
}

// ─── Main Service ───────────────────────────────────────────

export const rollNumberService = {

    /**
     * 🔢 الحصول على الرقم التسلسلي التالي لشركة معينة
     */
    async getNextSeq(companyId: string): Promise<number> {
        const { data, error } = await supabase
            .from('fabric_rolls')
            .select('roll_seq')
            .eq('company_id', companyId)
            .not('roll_seq', 'is', null)
            .order('roll_seq', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            // 🔑 MUST throw so callers' catch blocks activate (e.g. offline fallback)
            console.error('[RollNumber] Error getting next seq:', error.message);
            throw new Error(`[RollNumber] Cannot get next seq: ${error.message}`);
        }
        return (data?.roll_seq || 0) + 1;
    },

    /**
     * 🏗️ توليد رقم رولون ذكي كامل (يحتاج إنترنت)
     *
     * @returns { roll_number: "COT.PL.WH-001", roll_code: "COT.PL.WH", roll_seq: 1 }
     */
    async generate(input: RollCodeInput): Promise<SmartRollNumber> {
        const rollCode = buildRollCode(input);
        const rollSeq = await this.getNextSeq(input.companyId);
        const rollNumber = `${rollCode}-${String(rollSeq).padStart(3, '0')}`;

        return {
            roll_number: rollNumber,
            roll_code: rollCode,
            roll_seq: rollSeq,
        };
    },

    /**
     * 🏷️ توليد رقم رولون محلياً — لا يحتاج إنترنت ✅
     *
     * يعمل بنفس الطريقة أونلاين وأوفلاين.
     * الرقم نهائي من اللحظة الأولى = اللصاقة صحيحة دائماً.
     *
     * الصيغة: {ROLL_CODE}-{PREFIX}{SHORT_REF}{INDEX}
     * أمثلة:
     *   COT.PL.WH-J4E03    ← جرد (J) | مرجع 4E | بند #3
     *   POLY.RD-R7B01      ← استلام (R) | مرجع 7B | بند #1
     *   SILK-A9C01          ← تلقائي (A) | مرجع 9C | بند #1
     *
     * @param sourcePrefix - 'J' جرد | 'R' استلام | 'A' تلقائي
     * @param sourceDocNumber - رقم الوثيقة المصدر (e.g., "SC-20260318-4E7B")
     * @param itemIndex - ترتيب البند في الجلسة (1-based)
     */
    generateLocal(input: {
        materialCode?: string;
        materialName?: string;
        designCode?: string;
        colorCode?: string;
        colorName?: string;
        /** Source prefix: 'J' for جرد, 'R' for استلام, 'A' for تلقائي */
        sourcePrefix: 'J' | 'R' | 'A';
        /** Source document number (e.g., "SC-20260318-4E7B") */
        sourceDocNumber: string;
        /** Item index within the session (1-based) */
        itemIndex: number;
    }): { roll_number: string; roll_code: string } {
        const rollCode = buildRollCode(input);

        // Extract short reference from document number
        // "SC-20260318-4E7B" → last segment → "4E7B" → first 2 chars → "4E"
        const parts = input.sourceDocNumber.split('-');
        const lastPart = parts[parts.length - 1] || '';
        const shortRef = lastPart.substring(0, 2).toUpperCase() || 'XX';

        const paddedIndex = String(input.itemIndex).padStart(2, '0');
        const rollNumber = `${rollCode}-${input.sourcePrefix}${shortRef}${paddedIndex}`;

        return { roll_number: rollNumber, roll_code: rollCode };
    },

    /**
     * 🔍 بحث ذكي عن رولونات — يدعم:
     *   - رقم تسلسلي (أرقام فقط) → بحث بـ roll_seq
     *   - كود وصفي (حروف) → بحث بـ roll_code
     *   - رقم كامل (مختلط) → بحث بـ roll_number
     *   - باركود → بحث بـ barcode
     *
     * @returns حتى 10 نتائج
     */
    async search(query: string, companyId: string, warehouseId?: string) {
        const q = query.trim();
        if (!q || q.length < 1) return [];

        const isNumericOnly = /^\d+$/.test(q);
        const seqNum = isNumericOnly ? parseInt(q) : null;

        let supaQuery = supabase
            .from('fabric_rolls')
            .select(`
                id, roll_number, roll_code, roll_seq, barcode,
                material_id, color_id, current_length, status, location_code,
                fabric_materials!inner(name_ar, name_en, name_tr, code)
            `)
            .eq('company_id', companyId)
            .in('status', ['available', 'reserved', 'in_stock']);

        if (warehouseId) {
            supaQuery = supaQuery.eq('warehouse_id', warehouseId);
        }

        if (isNumericOnly && seqNum !== null) {
            // ── بحث بالرقم التسلسلي ──
            if (q.length >= 3) {
                // مطابقة تامة أولاً
                supaQuery = supaQuery.eq('roll_seq', seqNum);
            } else {
                // بحث بالنص في roll_number (أرقام قصيرة)
                supaQuery = supaQuery.ilike('roll_number', `%-${q}%`);
            }
        } else if (/^[A-Za-z]/.test(q)) {
            // ── بحث بالكود الوصفي ──
            supaQuery = supaQuery.ilike('roll_code', `${q.toUpperCase()}%`);
        } else {
            // ── بحث عام (رقم كامل أو باركود) ──
            supaQuery = supaQuery.or(
                `roll_number.ilike.%${q}%,barcode.ilike.%${q}%`
            );
        }

        const { data, error } = await supaQuery
            .order('roll_seq', { ascending: true })
            .limit(10);

        if (error) {
            console.error('[RollNumber] Search error:', error.message);
            return [];
        }

        return data || [];
    },

    /**
     * 🎯 بحث بمطابقة تامة — للماسح الضوئي
     * يبحث بـ roll_number أو barcode أو roll_seq
     */
    async findExact(query: string, companyId: string, warehouseId?: string) {
        const q = query.trim();
        if (!q) return null;

        let supaQuery = supabase
            .from('fabric_rolls')
            .select(`
                id, roll_number, roll_code, roll_seq, barcode,
                material_id, color_id, current_length, status, location_code,
                fabric_materials!inner(name_ar, name_en, name_tr, name_ru, name_uk, code)
            `)
            .eq('company_id', companyId)
            .in('status', ['available', 'reserved', 'in_stock']);

        if (warehouseId) {
            supaQuery = supaQuery.eq('warehouse_id', warehouseId);
        }

        const isNumericOnly = /^\d+$/.test(q);

        if (isNumericOnly) {
            // بحث بالرقم التسلسلي (مطابقة تامة)
            supaQuery = supaQuery.eq('roll_seq', parseInt(q));
        } else {
            // بحث بالرقم الكامل أو الباركود
            supaQuery = supaQuery.or(`roll_number.eq.${q},barcode.eq.${q}`);
        }

        const { data, error } = await supaQuery.maybeSingle();

        if (error) {
            console.error('[RollNumber] findExact error:', error.message);
            return null;
        }

        return data;
    },

    /**
     * 🔧 تحديث الأرقام الوصفية لرولونات موجودة
     * (يُستخدم عند تغيير كود المادة أو اللون)
     */
    async updateRollCode(rollId: string, newCode: string) {
        const { error } = await supabase
            .from('fabric_rolls')
            .update({ roll_code: newCode })
            .eq('id', rollId);

        if (error) {
            console.error('[RollNumber] updateRollCode error:', error.message);
        }
        return !error;
    },
};
