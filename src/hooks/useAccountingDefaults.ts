/**
 * 🏦 useAccountingDefaults — Hook لجلب الحسابات الافتراضية من الإعدادات
 * 
 * القاعدة الذهبية: لا أكواد حسابات ثابتة في أي مكان!
 * Golden Rule: NO hardcoded account codes anywhere!
 * 
 * يُستخدم في:
 * - PurchasePaymentTab (عرض القيد المسبق)
 * - PaymentScheduleService (عرض القيد المسبق)
 * - أي مكان يحتاج أكواد الحسابات الافتراضية
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AccountingDefaults {
    // الخزينة
    default_cash_account_id: string | null;
    default_bank_account_id: string | null;
    default_petty_cash_account_id: string | null;
    // المبيعات
    default_receivable_account_id: string | null;
    default_revenue_account_id: string | null;
    default_sales_account_id: string | null;
    default_sales_returns_account_id: string | null;
    default_sales_discount_account_id: string | null;
    // المشتريات
    default_payable_account_id: string | null;
    default_purchase_account_id: string | null;
    default_cogs_account_id: string | null;
    default_purchase_returns_account_id: string | null;
    default_purchase_discount_account_id: string | null;
    // المخزون
    default_inventory_account_id: string | null;
    default_inventory_variance_account_id: string | null;
    // الضريبة
    default_tax_input_account_id: string | null;
    default_tax_output_account_id: string | null;
    // العملات
    default_fx_gain_account_id: string | null;
    default_fx_loss_account_id: string | null;
    default_rounding_account_id: string | null;
    // الدفعات المقدمة
    default_customer_advance_account_id: string | null;
    default_supplier_advance_account_id: string | null;
    // المالية
    default_expense_account_id: string | null;
    default_retained_earnings_account_id: string | null;
    default_depreciation_account_id: string | null;
    default_freight_in_account_id: string | null;
}

export interface AccountCodeMap {
    cash: string;
    bank: string;
    receivable: string;
    payable: string;
    sales: string;
    purchase: string;
    cogs: string;
    inventory: string;
    taxInput: string;
    taxOutput: string;
    expense: string;
    fxGain: string;
    fxLoss: string;
    freightIn: string;
}

/**
 * جلب الحسابات الافتراضية مع أكوادها الفعلية من الشجرة
 */
export function useAccountingDefaults(companyId: string | null | undefined) {
    return useQuery({
        queryKey: ['accounting_defaults', companyId],
        queryFn: async () => {
            if (!companyId) return null;

            const { data, error } = await supabase
                .from('company_accounting_settings')
                .select(`
                    default_cash_account_id,
                    default_bank_account_id,
                    default_receivable_account_id,
                    default_payable_account_id,
                    default_revenue_account_id,
                    default_sales_account_id,
                    default_expense_account_id,
                    default_purchase_account_id,
                    default_cogs_account_id,
                    default_inventory_account_id,
                    default_tax_input_account_id,
                    default_tax_output_account_id,
                    default_fx_gain_account_id,
                    default_fx_loss_account_id,
                    default_freight_in_account_id
                `)
                .eq('company_id', companyId)
                .single();

            if (error || !data) return null;

            // جلب أكواد الحسابات الفعلية
            const accountIds = Object.values(data).filter(Boolean) as string[];
            if (accountIds.length === 0) return { settings: data, codes: {} };

            const { data: accounts } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en')
                .in('id', accountIds);

            const codeMap: Record<string, { code: string; nameAr: string; nameEn: string }> = {};
            accounts?.forEach(acc => {
                codeMap[acc.id] = { code: acc.account_code, nameAr: acc.name_ar, nameEn: acc.name_en };
            });

            return { settings: data as AccountingDefaults, codes: codeMap };
        },
        enabled: !!companyId,
        staleTime: 60000, // 1 minute cache
    });
}

/**
 * Helper: جلب كود الحساب من الـ map
 */
export function getAccountCode(
    codes: Record<string, { code: string; nameAr: string; nameEn: string }>,
    accountId: string | null | undefined,
    fallback: string = '—'
): string {
    if (!accountId || !codes[accountId]) return fallback;
    return codes[accountId].code;
}

/**
 * Helper: جلب اسم الحساب من الـ map
 */
export function getAccountName(
    codes: Record<string, { code: string; nameAr: string; nameEn: string }>,
    accountId: string | null | undefined,
    isRTL: boolean,
    fallback: string = ''
): string {
    if (!accountId || !codes[accountId]) return fallback;
    return isRTL ? codes[accountId].nameAr : codes[accountId].nameEn;
}
