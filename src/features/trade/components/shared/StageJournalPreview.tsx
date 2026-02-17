/**
 * ═══════════════════════════════════════════════════════════════
 * 📒 StageJournalPreview — معاينة القيد المحاسبي المقترح
 * ═══════════════════════════════════════════════════════════════
 * V2 — يستخدم الحسابات الافتراضية الفعلية من الإعدادات
 * - يجلب أسماء الحسابات من useAccountingDefaults
 * - يجلب نسبة الضريبة من useTaxDefaults
 * - يعرض سطر الضريبة دائماً (حتى بقيمة 0) مع ملاحظة النسبة
 * - يدعم الضرائب المتغيرة (قابلة للتعديل من الإعدادات)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    BookOpen, Eye, AlertCircle, ArrowUpRight, ArrowDownRight,
    Settings2, Percent, Info
} from 'lucide-react';
import { useAccountingDefaults, getAccountName } from '@/hooks/useAccountingDefaults';
import { useTaxDefaults, computeTaxAmount } from '../../hooks/useTaxDefaults';

// ─── Types ──────────────────────────────────────────────────────────

interface JournalLine {
    accountName: string;
    accountNameAr?: string;
    accountCode?: string;
    debit: number;
    credit: number;
    description?: string;
    descriptionEn?: string;
    /** هل السطر مرتبط بالضريبة */
    isTax?: boolean;
    /** نسبة الضريبة (لعرضها) */
    taxRate?: number;
    /** هل الحساب مفقود من الإعدادات */
    isMissing?: boolean;
}

interface StageJournalPreviewProps {
    /** Current stage */
    stage: string;
    /** Transaction total (inclusive of tax if taxAmount provided) */
    totalAmount: number;
    /** Tax amount — if 0 or missing, will be auto-calculated from settings */
    taxAmount?: number;
    /** Discount amount */
    discountAmount: number;
    /** Supplier/Customer name */
    supplierName?: string;
    /** Currency code */
    currency: string;
    /** Transaction type */
    transactionType?: 'purchase' | 'sale';
    /** Company ID for fetching defaults */
    companyId?: string;
    /** Additional className */
    className?: string;
}

// ─── Journal Line Builder ───────────────────────────────────────────

interface AccountResolverResult {
    name: string;
    nameAr: string;
    code: string;
    isMissing: boolean;
}

function resolveAccount(
    codes: Record<string, { code: string; nameAr: string; nameEn: string }> | undefined,
    accountId: string | null | undefined,
    isRTL: boolean,
    fallbackEn: string,
    fallbackAr: string,
): AccountResolverResult {
    if (!accountId || !codes || !codes[accountId]) {
        return {
            name: fallbackEn,
            nameAr: fallbackAr,
            code: '—',
            isMissing: !!accountId === false && !!codes, // missing only if codes loaded but no id
        };
    }
    const acc = codes[accountId];
    return {
        name: acc.nameEn || acc.nameAr,
        nameAr: acc.nameAr,
        code: acc.code,
        isMissing: false,
    };
}

/**
 * Compute journal lines using real accounts from settings
 */
function computeJournalLines(
    stage: string,
    totalAmount: number,
    taxAmount: number,
    discountAmount: number,
    transactionType: 'purchase' | 'sale',
    taxRate: number,
    accountCodes: Record<string, { code: string; nameAr: string; nameEn: string }> | undefined,
    settings: any, // AccountingDefaults
    taxDefaults: { nameAr: string; nameEn: string; inputAccount: any; outputAccount: any } | null,
    isRTL: boolean,
): JournalLine[] {
    // ─── حساب الضريبة — مسار هرمي نظيف ───────────────────────────
    // totalAmount = إجمالي الأصناف (المبلغ الصافي بعد الخصم)
    // taxAmount = مجموع ضرائب الأصناف (من item.tax_amount) — قد يكون > 0 إذا الأصناف تحمل ضريبة
    // taxRate = نسبة الضريبة من إعدادات الشركة (company_accounting_settings.vat_rate) — fallback
    // 
    // المسار:
    // 1️⃣ إذا taxAmount > 0 (مُجمع من الأصناف) → استخدمه مباشرة
    // 2️⃣ إذا taxAmount = 0 و taxRate > 0 → احسب من نسبة الشركة
    // 3️⃣ كلاهما 0 → لا ضريبة
    const netAmount = totalAmount;
    const computedTax = taxAmount > 0
        ? taxAmount  // ← ضريبة محسوبة من الأصناف (material-level أو company-level)
        : (taxRate > 0 && netAmount > 0) ? computeTaxAmount(netAmount, taxRate) : 0;
    const gross = netAmount + computedTax;

    if (transactionType === 'purchase') {
        switch (stage) {
            case 'invoice':
            case 'posted': {
                // فاتورة مشتريات: مخزون/مشتريات (مدين) + ضريبة مدخلات (مدين) — موردين (دائن)
                const purchaseAcc = resolveAccount(
                    accountCodes,
                    settings?.default_purchase_account_id || settings?.default_inventory_account_id,
                    isRTL,
                    'Inventory / Purchases',
                    'المخزون / المشتريات'
                );
                const taxAcc = taxDefaults?.inputAccount
                    ? {
                        name: taxDefaults.inputAccount.nameEn || taxDefaults.nameEn,
                        nameAr: taxDefaults.inputAccount.nameAr || taxDefaults.nameAr,
                        code: taxDefaults.inputAccount.code,
                        isMissing: false,
                    }
                    : resolveAccount(
                        accountCodes,
                        settings?.default_tax_input_account_id,
                        isRTL,
                        'Input VAT',
                        'ضريبة المدخلات'
                    );
                const payableAcc = resolveAccount(
                    accountCodes,
                    settings?.default_payable_account_id,
                    isRTL,
                    'Accounts Payable',
                    'الموردون / الدائنون'
                );

                return [
                    {
                        accountName: purchaseAcc.name,
                        accountNameAr: purchaseAcc.nameAr,
                        accountCode: purchaseAcc.code,
                        debit: netAmount,
                        credit: 0,
                        description: 'صافي قيمة البضاعة',
                        descriptionEn: 'Net goods value',
                        isMissing: purchaseAcc.isMissing,
                    },
                    // سطر الضريبة — يظهر دائماً (حتى بقيمة 0)
                    {
                        accountName: taxAcc.name,
                        accountNameAr: taxAcc.nameAr,
                        accountCode: taxAcc.code,
                        debit: computedTax,
                        credit: 0,
                        description: computedTax > 0
                            ? `ضريبة القيمة المضافة (${taxRate}%)`
                            : `معفاة (${taxRate}%)`,
                        descriptionEn: computedTax > 0
                            ? `VAT (${taxRate}%)`
                            : `Exempt (${taxRate}%)`,
                        isTax: true,
                        taxRate,
                        isMissing: taxAcc.isMissing,
                    },
                    {
                        accountName: payableAcc.name,
                        accountNameAr: payableAcc.nameAr,
                        accountCode: payableAcc.code,
                        debit: 0,
                        credit: gross,
                        description: 'إجمالي المستحق',
                        descriptionEn: 'Total payable',
                        isMissing: payableAcc.isMissing,
                    },
                ];
            }

            case 'paid': {
                // دفعة: موردين (مدين) — نقد/بنك (دائن)
                const payableAcc = resolveAccount(
                    accountCodes, settings?.default_payable_account_id,
                    isRTL, 'Accounts Payable', 'الموردون / الدائنون'
                );
                const cashAcc = resolveAccount(
                    accountCodes,
                    settings?.default_cash_account_id || settings?.default_bank_account_id,
                    isRTL, 'Cash / Bank', 'الصندوق / البنك'
                );
                return [
                    {
                        accountName: payableAcc.name,
                        accountNameAr: payableAcc.nameAr,
                        accountCode: payableAcc.code,
                        debit: gross,
                        credit: 0,
                        description: 'تسوية المستحق',
                        descriptionEn: 'Settle payable',
                        isMissing: payableAcc.isMissing,
                    },
                    {
                        accountName: cashAcc.name,
                        accountNameAr: cashAcc.nameAr,
                        accountCode: cashAcc.code,
                        debit: 0,
                        credit: gross,
                        description: 'المبلغ المدفوع',
                        descriptionEn: 'Amount paid',
                        isMissing: cashAcc.isMissing,
                    },
                ];
            }

            case 'receipt': {
                // استلام بضاعة: مخزون (مدين) — بضاعة في الطريق (دائن)
                const inventoryAcc = resolveAccount(
                    accountCodes, settings?.default_inventory_account_id,
                    isRTL, 'Inventory', 'المخزون'
                );
                const freightAcc = resolveAccount(
                    accountCodes, settings?.default_freight_in_account_id,
                    isRTL, 'Goods in Transit', 'بضاعة في الطريق'
                );
                return [
                    {
                        accountName: inventoryAcc.name,
                        accountNameAr: inventoryAcc.nameAr,
                        accountCode: inventoryAcc.code,
                        debit: netAmount,
                        credit: 0,
                        description: 'إدخال البضاعة للمخزون',
                        descriptionEn: 'Goods received into inventory',
                        isMissing: inventoryAcc.isMissing,
                    },
                    {
                        accountName: freightAcc.name,
                        accountNameAr: freightAcc.nameAr,
                        accountCode: freightAcc.code,
                        debit: 0,
                        credit: netAmount,
                        description: 'تحويل من حساب الشحنة',
                        descriptionEn: 'Transfer from transit',
                        isMissing: freightAcc.isMissing,
                    },
                ];
            }

            // For early stages (draft, quotation, order, approved) — show projected entry
            default: {
                if (totalAmount <= 0) return []; // No entry if no amount
                // Show a projected invoice entry
                const purchaseAcc = resolveAccount(
                    accountCodes,
                    settings?.default_purchase_account_id || settings?.default_inventory_account_id,
                    isRTL,
                    'Inventory / Purchases',
                    'المخزون / المشتريات'
                );
                const taxAcc = taxDefaults?.inputAccount
                    ? {
                        name: taxDefaults.inputAccount.nameEn || taxDefaults.nameEn,
                        nameAr: taxDefaults.inputAccount.nameAr || taxDefaults.nameAr,
                        code: taxDefaults.inputAccount.code,
                        isMissing: false,
                    }
                    : resolveAccount(
                        accountCodes,
                        settings?.default_tax_input_account_id,
                        isRTL,
                        'Input VAT',
                        'ضريبة المدخلات'
                    );
                const payableAcc = resolveAccount(
                    accountCodes,
                    settings?.default_payable_account_id,
                    isRTL,
                    'Accounts Payable',
                    'الموردون / الدائنون'
                );

                return [
                    {
                        accountName: purchaseAcc.name,
                        accountNameAr: purchaseAcc.nameAr,
                        accountCode: purchaseAcc.code,
                        debit: netAmount,
                        credit: 0,
                        description: 'صافي قيمة البضاعة (متوقع)',
                        descriptionEn: 'Net goods value (projected)',
                        isMissing: purchaseAcc.isMissing,
                    },
                    {
                        accountName: taxAcc.name,
                        accountNameAr: taxAcc.nameAr,
                        accountCode: taxAcc.code,
                        debit: computedTax,
                        credit: 0,
                        description: computedTax > 0
                            ? `ضريبة القيمة المضافة (${taxRate}%)`
                            : `معفاة (${taxRate}%)`,
                        descriptionEn: computedTax > 0
                            ? `VAT (${taxRate}%)`
                            : `Exempt (${taxRate}%)`,
                        isTax: true,
                        taxRate,
                        isMissing: taxAcc.isMissing,
                    },
                    {
                        accountName: payableAcc.name,
                        accountNameAr: payableAcc.nameAr,
                        accountCode: payableAcc.code,
                        debit: 0,
                        credit: gross,
                        description: 'إجمالي المستحق (متوقع)',
                        descriptionEn: 'Total payable (projected)',
                        isMissing: payableAcc.isMissing,
                    },
                ];
            }
        }
    } else {
        // Sales
        switch (stage) {
            case 'invoice':
            case 'posted': {
                const receivableAcc = resolveAccount(
                    accountCodes, settings?.default_receivable_account_id,
                    isRTL, 'Accounts Receivable', 'العملاء / المدينون'
                );
                const taxAcc = taxDefaults?.outputAccount
                    ? {
                        name: taxDefaults.outputAccount.nameEn || taxDefaults.nameEn,
                        nameAr: taxDefaults.outputAccount.nameAr || taxDefaults.nameAr,
                        code: taxDefaults.outputAccount.code,
                        isMissing: false,
                    }
                    : resolveAccount(
                        accountCodes, settings?.default_tax_output_account_id,
                        isRTL, 'Output VAT', 'ضريبة المخرجات'
                    );
                const revenueAcc = resolveAccount(
                    accountCodes,
                    settings?.default_sales_account_id || settings?.default_revenue_account_id,
                    isRTL, 'Sales Revenue', 'إيرادات المبيعات'
                );

                return [
                    {
                        accountName: receivableAcc.name,
                        accountNameAr: receivableAcc.nameAr,
                        accountCode: receivableAcc.code,
                        debit: gross,
                        credit: 0,
                        description: 'إجمالي المستحق للتحصيل',
                        descriptionEn: 'Total receivable',
                        isMissing: receivableAcc.isMissing,
                    },
                    // سطر الضريبة — يظهر دائماً
                    {
                        accountName: taxAcc.name,
                        accountNameAr: taxAcc.nameAr,
                        accountCode: taxAcc.code,
                        debit: 0,
                        credit: computedTax,
                        description: computedTax > 0
                            ? `ضريبة القيمة المضافة (${taxRate}%)`
                            : `معفاة (${taxRate}%)`,
                        descriptionEn: computedTax > 0
                            ? `VAT (${taxRate}%)`
                            : `Exempt (${taxRate}%)`,
                        isTax: true,
                        taxRate,
                        isMissing: taxAcc.isMissing,
                    },
                    {
                        accountName: revenueAcc.name,
                        accountNameAr: revenueAcc.nameAr,
                        accountCode: revenueAcc.code,
                        debit: 0,
                        credit: netAmount,
                        description: 'إيراد المبيعات',
                        descriptionEn: 'Sales revenue',
                        isMissing: revenueAcc.isMissing,
                    },
                ];
            }

            case 'paid': {
                const receivableAcc = resolveAccount(
                    accountCodes, settings?.default_receivable_account_id,
                    isRTL, 'Accounts Receivable', 'العملاء / المدينون'
                );
                const cashAcc = resolveAccount(
                    accountCodes,
                    settings?.default_cash_account_id || settings?.default_bank_account_id,
                    isRTL, 'Cash / Bank', 'الصندوق / البنك'
                );
                return [
                    {
                        accountName: cashAcc.name,
                        accountNameAr: cashAcc.nameAr,
                        accountCode: cashAcc.code,
                        debit: gross,
                        credit: 0,
                        description: 'المبلغ المحصّل',
                        descriptionEn: 'Amount collected',
                        isMissing: cashAcc.isMissing,
                    },
                    {
                        accountName: receivableAcc.name,
                        accountNameAr: receivableAcc.nameAr,
                        accountCode: receivableAcc.code,
                        debit: 0,
                        credit: gross,
                        description: 'تسوية المدينون',
                        descriptionEn: 'Settle receivable',
                        isMissing: receivableAcc.isMissing,
                    },
                ];
            }

            // For early stages — show projected entry
            default: {
                if (totalAmount <= 0) return [];
                const receivableAcc = resolveAccount(
                    accountCodes, settings?.default_receivable_account_id,
                    isRTL, 'Accounts Receivable', 'العملاء / المدينون'
                );
                const taxAcc = taxDefaults?.outputAccount
                    ? {
                        name: taxDefaults.outputAccount.nameEn || taxDefaults.nameEn,
                        nameAr: taxDefaults.outputAccount.nameAr || taxDefaults.nameAr,
                        code: taxDefaults.outputAccount.code,
                        isMissing: false,
                    }
                    : resolveAccount(
                        accountCodes, settings?.default_tax_output_account_id,
                        isRTL, 'Output VAT', 'ضريبة المخرجات'
                    );
                const revenueAcc = resolveAccount(
                    accountCodes,
                    settings?.default_sales_account_id || settings?.default_revenue_account_id,
                    isRTL, 'Sales Revenue', 'إيرادات المبيعات'
                );
                return [
                    {
                        accountName: receivableAcc.name,
                        accountNameAr: receivableAcc.nameAr,
                        accountCode: receivableAcc.code,
                        debit: gross,
                        credit: 0,
                        description: 'إجمالي المستحق للتحصيل (متوقع)',
                        descriptionEn: 'Total receivable (projected)',
                        isMissing: receivableAcc.isMissing,
                    },
                    {
                        accountName: taxAcc.name,
                        accountNameAr: taxAcc.nameAr,
                        accountCode: taxAcc.code,
                        debit: 0,
                        credit: computedTax,
                        description: computedTax > 0
                            ? `ضريبة القيمة المضافة (${taxRate}%)`
                            : `معفاة (${taxRate}%)`,
                        descriptionEn: computedTax > 0
                            ? `VAT (${taxRate}%)`
                            : `Exempt (${taxRate}%)`,
                        isTax: true,
                        taxRate,
                        isMissing: taxAcc.isMissing,
                    },
                    {
                        accountName: revenueAcc.name,
                        accountNameAr: revenueAcc.nameAr,
                        accountCode: revenueAcc.code,
                        debit: 0,
                        credit: netAmount,
                        description: 'إيراد المبيعات (متوقع)',
                        descriptionEn: 'Sales revenue (projected)',
                        isMissing: revenueAcc.isMissing,
                    },
                ];
            }
        }
    }
}

// All stages can show journal entries — we show projected entries for early stages
const JOURNAL_STAGES = ['draft', 'quotation', 'order', 'approved', 'invoice', 'posted', 'paid', 'receipt'];

// ─── Component ──────────────────────────────────────────────────────────

export const StageJournalPreview: React.FC<StageJournalPreviewProps> = ({
    stage,
    totalAmount,
    taxAmount = 0,
    discountAmount,
    supplierName,
    currency,
    transactionType = 'purchase',
    companyId,
    className,
}) => {
    const { isRTL } = useLanguage();

    // ─── Fetch real account names & tax defaults ─────────────────
    const { data: accountingData } = useAccountingDefaults(companyId);
    const { data: taxDefaults } = useTaxDefaults(companyId);

    const taxRate = taxDefaults?.rate ?? 0;
    const taxEnabled = taxDefaults?.isEnabled ?? false;

    const lines = useMemo(() => {
        return computeJournalLines(
            stage,
            totalAmount,
            taxAmount,
            discountAmount,
            transactionType,
            taxRate,
            accountingData?.codes,
            accountingData?.settings,
            taxDefaults || null,
            isRTL,
        );
    }, [stage, totalAmount, taxAmount, discountAmount, transactionType, taxRate, accountingData, taxDefaults, isRTL]);

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const hasMissingAccounts = lines.some(l => l.isMissing);
    // Determine if this is a projected (early) stage
    const isProjected = ['draft', 'quotation', 'order', 'approved'].includes(stage);
    const hasJournal = JOURNAL_STAGES.includes(stage) && totalAmount > 0;

    // Format number — ALWAYS English digits per project constitution
    const fmt = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(n);
    };

    if (!hasJournal) {
        return (
            <div className={cn(
                'rounded-lg border border-dashed p-4 text-center text-sm text-gray-400',
                'bg-gray-50/50 dark:bg-gray-900/50',
                className
            )}>
                <BookOpen className="w-5 h-5 mx-auto mb-2 opacity-50" />
                <p>{isRTL
                    ? 'أضف مواد لمعاينة القيد المحاسبي المقترح'
                    : 'Add items to preview the projected journal entry'}</p>
                <p className="text-xs mt-1 opacity-60">
                    {isRTL
                        ? 'سيتحدث تلقائياً بناءً على المواد والأسعار'
                        : 'Auto-updates based on items and prices'}
                </p>
            </div>
        );
    }

    return (
        <div className={cn(
            'rounded-lg border bg-card',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/30">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">
                            {isRTL ? 'معاينة القيد المحاسبي' : 'Journal Entry Preview'}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                            {isProjected
                                ? (isRTL ? 'مسودة متوقعة — تتحدث لحظياً' : 'Projected draft — updates live')
                                : (isRTL ? 'مسودة — سيُنشأ تلقائياً' : 'Draft — auto-generated')
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Tax Rate Badge */}
                    <Badge variant="outline" className="text-[10px] gap-1">
                        <Percent className="w-3 h-3" />
                        {taxRate}%
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                        <Eye className="w-3 h-3" />
                        {isRTL ? 'قراءة فقط' : 'Read-only'}
                    </Badge>
                    {isProjected && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 text-[10px]">
                            {isRTL ? 'متوقع' : 'Projected'}
                        </Badge>
                    )}
                    {isBalanced ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                            {isRTL ? 'متوازن ✓' : 'Balanced ✓'}
                        </Badge>
                    ) : (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">
                            <AlertCircle className="w-3 h-3 mr-0.5" />
                            {isRTL ? 'غير متوازن!' : 'Unbalanced!'}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Missing accounts warning */}
            {hasMissingAccounts && (
                <div className="mx-3 mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                        <Settings2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                            {isRTL
                                ? 'بعض الحسابات غير معيّنة في الإعدادات — يرجى ضبطها من إعدادات المحاسبة'
                                : 'Some accounts are not configured — please set them in Accounting Settings'}
                        </span>
                    </div>
                </div>
            )}

            {/* Journal lines */}
            <div className="p-2">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-gray-400 border-b">
                            <th className={cn('py-1.5 font-medium w-12 text-center')}>
                                {isRTL ? 'رمز' : 'Code'}
                            </th>
                            <th className={cn('py-1.5 font-medium', isRTL ? 'text-right' : 'text-left')}>
                                {isRTL ? 'الحساب' : 'Account'}
                            </th>
                            <th className="py-1.5 font-medium text-center w-24">
                                {isRTL ? 'مدين' : 'Debit'}
                            </th>
                            <th className="py-1.5 font-medium text-center w-24">
                                {isRTL ? 'دائن' : 'Credit'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, i) => (
                            <tr
                                key={i}
                                className={cn(
                                    'border-b border-dashed last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                    line.isTax && 'bg-violet-50/30 dark:bg-violet-950/10',
                                    line.isMissing && 'bg-amber-50/30 dark:bg-amber-950/10',
                                )}
                            >
                                {/* Account Code */}
                                <td className="py-2 text-center">
                                    <span className={cn(
                                        'font-mono text-[10px] px-1.5 py-0.5 rounded',
                                        line.isMissing
                                            ? 'bg-amber-100 text-amber-600'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    )}>
                                        {line.accountCode || '—'}
                                    </span>
                                </td>

                                {/* Account Name */}
                                <td className={cn('py-2', isRTL ? 'text-right' : 'text-left')}>
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            'font-medium',
                                            line.isMissing && 'text-amber-600'
                                        )}>
                                            {isRTL ? (line.accountNameAr || line.accountName) : line.accountName}
                                        </span>
                                        {line.isTax && (
                                            <Badge
                                                variant="outline"
                                                className="text-[8px] px-1 py-0 h-3.5 border-violet-300 text-violet-600"
                                            >
                                                {line.taxRate}%
                                            </Badge>
                                        )}
                                        {line.isMissing && (
                                            <AlertCircle className="w-3 h-3 text-amber-500" />
                                        )}
                                    </div>
                                    {(line.description || line.descriptionEn) && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {isRTL ? line.description : line.descriptionEn || line.description}
                                        </p>
                                    )}
                                </td>

                                {/* Debit */}
                                <td className="py-2 text-center">
                                    {line.debit > 0 ? (
                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 font-mono font-semibold">
                                            <ArrowUpRight className="w-3 h-3" />
                                            {fmt(line.debit)}
                                        </span>
                                    ) : line.debit === 0 && line.isTax ? (
                                        <span className="text-gray-300 font-mono text-[10px]">0.00</span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>

                                {/* Credit */}
                                <td className="py-2 text-center">
                                    {line.credit > 0 ? (
                                        <span className="inline-flex items-center gap-0.5 text-red-500 font-mono font-semibold">
                                            <ArrowDownRight className="w-3 h-3" />
                                            {fmt(line.credit)}
                                        </span>
                                    ) : line.credit === 0 && line.isTax ? (
                                        <span className="text-gray-300 font-mono text-[10px]">0.00</span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 font-bold text-sm">
                            <td></td>
                            <td className={cn('py-2', isRTL ? 'text-right' : 'text-left')}>
                                {isRTL ? 'الإجمالي' : 'Total'}
                                <span className="text-[10px] font-normal text-gray-400 ms-1">
                                    {currency}
                                </span>
                            </td>
                            <td className="py-2 text-center text-emerald-600 font-mono">
                                {fmt(totalDebit)}
                            </td>
                            <td className="py-2 text-center text-red-500 font-mono">
                                {fmt(totalCredit)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Tax Source Info */}
            {taxDefaults && (
                <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <Info className="w-3 h-3" />
                        <span>
                            {isRTL
                                ? `الضريبة: ${taxDefaults.nameAr} (${taxRate}%) — من الإعدادات`
                                : `Tax: ${taxDefaults.nameEn} (${taxRate}%) — from settings`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StageJournalPreview;
