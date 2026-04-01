/**
 * ═══════════════════════════════════════════════════════════════
 * 💰 useTaxDefaults — Hook لجلب إعدادات الضريبة الافتراضية
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🔑 القاعدة الذهبية لمسار الضريبة (3 خطوات):
 * ─────────────────────────────────────────────────
 * 1️⃣ هل المادة لها ضريبة خاصة (fabric_materials.tax_rate ≠ NULL)? → استخدمها
 *    - NULL = استخدم الافتراضي
 *    - 0 = المادة معفاة
 *    - 4 = 4% ضريبة خاصة بالمادة
 * 2️⃣ إذا NULL → إعدادات الشركة (company_accounting_settings.vat_rate)
 * 3️⃣ إذا لم يجد إعداد → 0%
 * 
 * 📊 مصدر إعدادات الشركة: company_accounting_settings
 * 
 * يُستخدم في:
 * - StageJournalPreview (حساب الضريبة + أسماء الحسابات)
 * - MaterialBrowserTab / PurchaseMaterialBrowserTab (نسبة الضريبة لكل صنف)
 * - CartItemsView (إعادة حساب الضريبة عند تعديل الكمية/السعر)
 * ═══════════════════════════════════════════════════════════════
 */

import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';

export interface TaxDefaults {
    /** نسبة الضريبة (مثال: 4) */
    rate: number;
    /** نوع الضريبة */
    taxType: string;
    /** اسم الضريبة بالعربي */
    nameAr: string;
    /** اسم الضريبة بالإنجليزي */
    nameEn: string;
    /** حساب ضريبة المدخلات (للمشتريات) */
    inputAccount: {
        id: string;
        code: string;
        nameAr: string;
        nameEn: string;
    } | null;
    /** حساب ضريبة المخرجات (للمبيعات) */
    outputAccount: {
        id: string;
        code: string;
        nameAr: string;
        nameEn: string;
    } | null;
    /** هل الضريبة مُفعّلة */
    isEnabled: boolean;
}

interface AccountInfo {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
}

/**
 * جلب إعدادات الضريبة من مصدر واحد فقط:
 * company_accounting_settings (vat_rate, vat_enabled, حسابات الضريبة)
 */
export function useTaxDefaults(companyId: string | null | undefined) {
    return useCachedQuery<TaxDefaults>({
        queryKey: ['tax_defaults', companyId],
        queryFn: async () => {
            if (!companyId) {
                return getEmptyDefaults();
            }

            // ─── مصدر واحد فقط: company_accounting_settings ───────────
            const { data: settings, error } = await supabase
                .from('company_accounting_settings')
                .select(`
                    vat_enabled,
                    vat_rate,
                    default_tax_input_account_id,
                    default_tax_output_account_id
                `)
                .eq('company_id', companyId)
                .maybeSingle();

            if (error) {
                console.warn('[useTaxDefaults] Error fetching settings:', error);
                return getEmptyDefaults();
            }

            // لا يوجد إعدادات → 0%
            if (!settings) {
                console.log('[useTaxDefaults] No settings found for company, using 0%');
                return getEmptyDefaults();
            }

            // ─── Resolve account details ──────────────────────────
            const accountIds: string[] = [];
            const inputAccId = settings.default_tax_input_account_id;
            const outputAccId = settings.default_tax_output_account_id;

            if (inputAccId) accountIds.push(inputAccId);
            if (outputAccId) accountIds.push(outputAccId);

            let accountsMap: Record<string, AccountInfo> = {};

            if (accountIds.length > 0) {
                const { data: accounts } = await supabase
                    .from('chart_of_accounts')
                    .select('id, account_code, name_ar, name_en')
                    .in('id', accountIds);

                accounts?.forEach(acc => {
                    accountsMap[acc.id] = {
                        id: acc.id,
                        code: acc.account_code,
                        nameAr: acc.name_ar,
                        nameEn: acc.name_en || acc.name_ar,
                    };
                });
            }

            // ─── Build result ─────────────────────────────────────
            const rate = Number(settings.vat_rate ?? 0);
            const isEnabled = settings.vat_enabled ?? false;

            console.log(`[useTaxDefaults] ✅ Rate: ${rate}%, Enabled: ${isEnabled}`);

            return {
                rate,
                taxType: 'vat',
                nameAr: 'ضريبة القيمة المضافة',
                nameEn: 'VAT',
                inputAccount: inputAccId ? (accountsMap[inputAccId] || null) : null,
                outputAccount: outputAccId ? (accountsMap[outputAccId] || null) : null,
                isEnabled,
            };
        },
        enabled: !!companyId,
        staleTime: 60_000, // 1 minute cache (reduced from 2 min for faster refresh)
    });
}

/** Helper: Empty defaults — 0% tax */
function getEmptyDefaults(): TaxDefaults {
    return {
        rate: 0,
        taxType: 'vat',
        nameAr: 'ضريبة القيمة المضافة',
        nameEn: 'VAT',
        inputAccount: null,
        outputAccount: null,
        isEnabled: false,
    };
}

/**
 * حساب مبلغ الضريبة
 * @param netAmount المبلغ الصافي (قبل الضريبة)
 * @param taxRate نسبة الضريبة (مثال: 4 يعني 4%)
 */
export function computeTaxAmount(netAmount: number, taxRate: number): number {
    if (!taxRate || taxRate <= 0 || !netAmount || netAmount <= 0) return 0;
    return Math.round(netAmount * (taxRate / 100) * 100) / 100; // Round to 2 decimal places
}

/**
 * حساب الإجمالي شامل الضريبة
 */
export function computeGrossAmount(netAmount: number, taxRate: number): number {
    return netAmount + computeTaxAmount(netAmount, taxRate);
}

/**
 * 🔑 القاعدة الذهبية: حل نسبة الضريبة الفعلية لصنف معين
 * 
 * المسار:
 * 1️⃣ materialTaxRate ≠ null → استخدمها (حتى لو 0 = معفاة)
 * 2️⃣ materialTaxRate === null → استخدم companyRate
 * 3️⃣ companyRate غير متوفر → 0%
 * 
 * @param materialTaxRate نسبة ضريبة المادة (من fabric_materials.tax_rate) — null = لم يُحدد
 * @param companyRate نسبة ضريبة الشركة (من company_accounting_settings.vat_rate)
 * @param companyTaxEnabled هل الضريبة مفعّلة في إعدادات الشركة
 * @returns { rate: number, source: 'material' | 'company' | 'none' }
 */
export function resolveItemTaxRate(
    materialTaxRate: number | null | undefined,
    companyRate: number,
    companyTaxEnabled: boolean,
): { rate: number; source: 'material' | 'company' | 'none' } {
    // 1️⃣ ضريبة المادة (إذا مُحددة — حتى لو 0 = معفاة)
    if (materialTaxRate !== null && materialTaxRate !== undefined) {
        return { rate: materialTaxRate, source: 'material' };
    }

    // 2️⃣ ضريبة الشركة (إذا مُفعّلة ونسبة > 0)
    if (companyTaxEnabled && companyRate > 0) {
        return { rate: companyRate, source: 'company' };
    }

    // 3️⃣ لا ضريبة
    return { rate: 0, source: 'none' };
}
