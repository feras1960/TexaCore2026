/**
 * AccountingEntryViewTab — تبويب "القيد المحاسبي" (للقراءة فقط)
 *
 * ══════════════════════════════════════════════════════════
 * المعمارية الصحيحة — فصل كامل عن تبويب القيد:
 *
 *  ● إذا كان القيد محفوظاً (data.id موجود):
 *    → يقرأ مباشرةً من journal_entry_lines في Supabase
 *    → المبالغ صحيحة بالعملة الأساسية (debit/credit من DB)
 *    → لا يعتمد على data.lines (الذي قد يكون قديماً)
 *
 *  ● إذا كان القيد جديداً غير محفوظ (لا id):
 *    → يحسب معاينة من data.lines (بيانات الاستمارة)
 *    → يضرب debit × rate لتحويل العملة الأصلية → الأساسية
 *    → يُولِّد سطر الصندوق تلقائياً للمعاينة
 * ══════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface AccountingEntryViewTabProps {
    data: any;
    mode?: string;
    companyId?: string;
}

interface AccountingLine {
    account_id: string;
    account_name: string;
    account_code: string;
    debit: number;
    credit: number;
    currency: string;
    exchange_rate: number;
    description: string;
}

export function AccountingEntryViewTab({ data, mode, companyId }: AccountingEntryViewTabProps) {
    const { language } = useLanguage();
    const isRtl = language === 'ar';

    // ─── جلب الأسطر مباشرةً من DB (عند وجود ID) ───────────────────────
    const [dbLines, setDbLines]     = useState<any[] | null>(null);
    const [loadingDb, setLoadingDb] = useState(false);

    const entryId = data?.id;

    useEffect(() => {
        if (!entryId) {
            setDbLines(null);
            return;
        }
        let cancelled = false;
        setLoadingDb(true);
        supabase
            .from('journal_entry_lines')
            .select(`
                id, account_id, debit, credit, debit_fc, credit_fc,
                exchange_rate, currency, description,
                account:chart_of_accounts(id, name_ar, name_en, account_code)
            `)
            .eq('entry_id', entryId)
            .order('line_number', { ascending: true })
            .then(({ data: rows, error }) => {
                if (cancelled) return;
                setLoadingDb(false);
                if (!error && rows) setDbLines(rows);
            });
        return () => { cancelled = true; };
    }, [entryId]);

    // ─── احسب أسطر العرض ─────────────────────────────────────────────────
    const { lines, isBalanced, totalDebit, totalCredit, baseCurrency } = useMemo(() => {
        const entryType: string  = data?.entry_type || data?.docType || 'cash';
        const fundAccountId: string = data?.fund_account_id || data?.header_account_id || '';
        const fundAccountName: string = data?.fund_account_name || data?.fund_name
            || (isRtl ? 'حساب الصندوق' : 'Fund Account');
        const baseCurr: string  = data?.base_currency || data?.fund_currency || data?.currency || '';

        const accountingLines: AccountingLine[] = [];

        if (dbLines !== null) {
            // ════════════════════════════════════════════════════════
            // السيناريو B: قيد محفوظ — اقرأ من DB مباشرة
            // debit/credit في DB هي المبالغ الأساسية (native × rate)
            // debit_fc/credit_fc هي المبالغ الأصلية التي أدخلها المستخدم
            // ════════════════════════════════════════════════════════
            dbLines.forEach((line: any) => {
                const baseDebit  = Number(line.debit)  || 0;
                const baseCredit = Number(line.credit) || 0;
                if (baseDebit === 0 && baseCredit === 0) return;

                const accountName = isRtl
                    ? (line.account?.name_ar || line.account?.name_en || line.account_id || 'حساب')
                    : (line.account?.name_en || line.account?.name_ar || line.account_id || 'Account');

                accountingLines.push({
                    account_id:   line.account_id || '',
                    account_name: accountName,
                    account_code: line.account?.account_code || '',
                    debit:        Math.round(baseDebit  * 100) / 100,
                    credit:       Math.round(baseCredit * 100) / 100,
                    currency:     baseCurr,
                    exchange_rate: Number(line.exchange_rate) || 1,
                    description:  line.description || '',
                });
            });
        } else {
            // ════════════════════════════════════════════════════════
            // السيناريو A: قيد جديد — اعرض معاينة من data.lines
            // debit/credit = مبلغ أصلي بالعملة الأصلية (من الاستمارة)
            // نضرب × rate للتحويل للعملة الأساسية
            // ════════════════════════════════════════════════════════
            const formLines: any[] = data?.lines || [];
            formLines.forEach((line: any) => {
                if (!line.account_id) return;
                const rate       = Number(line.exchange_rate) || 1;
                const rawDebit   = Number(line.debit)  || 0;
                const rawCredit  = Number(line.credit) || 0;
                const baseDebit  = Math.round(rawDebit  * rate * 100) / 100;
                const baseCredit = Math.round(rawCredit * rate * 100) / 100;
                if (baseDebit === 0 && baseCredit === 0) return;

                const accountName = isRtl
                    ? (line.account?.name_ar || line.account_name || line.account_code || 'حساب')
                    : (line.account?.name_en || line.account?.name_ar || line.account_name || line.account_code || 'Account');

                accountingLines.push({
                    account_id:   line.account_id || '',
                    account_name: accountName,
                    account_code: line.account?.account_code || line.account_code || '',
                    debit:        baseDebit,
                    credit:       baseCredit,
                    currency:     baseCurr,
                    exchange_rate: rate,
                    description:  line.description || '',
                });
            });

            // ── أضف سطر الصندوق للمعاينة (السيناريو A فقط) ──
            if (fundAccountId && accountingLines.length > 0) {
                const totalD = accountingLines.reduce((s, l) => s + l.debit, 0);
                const totalC = accountingLines.reduce((s, l) => s + l.credit, 0);

                let fundDebit = 0, fundCredit = 0;
                if (entryType === 'receipt') {
                    fundDebit = Math.round((totalD + totalC) * 100) / 100;
                } else if (entryType === 'payment') {
                    fundCredit = Math.round((totalD + totalC) * 100) / 100;
                } else {
                    // cash: الصندوق يغطي الفرق
                    const netEffect = totalD - totalC;
                    if (netEffect > 0.001) {
                        fundCredit = Math.round(netEffect * 100) / 100;
                    } else if (netEffect < -0.001) {
                        fundDebit = Math.round(Math.abs(netEffect) * 100) / 100;
                    }
                }

                if (fundDebit > 0 || fundCredit > 0) {
                    accountingLines.push({
                        account_id:   fundAccountId,
                        account_name: fundAccountName,
                        account_code: '',
                        debit:        fundDebit,
                        credit:       fundCredit,
                        currency:     baseCurr,
                        exchange_rate: 1,
                        description:  isRtl
                            ? (entryType === 'receipt' ? 'سند قبض' : entryType === 'payment' ? 'سند صرف' : 'يومية صندوق')
                            : (entryType === 'receipt' ? 'Receipt' : entryType === 'payment' ? 'Payment' : 'Cash Journal'),
                    });
                }
            }
        }

        const totalD   = accountingLines.reduce((s, l) => s + l.debit,  0);
        const totalC   = accountingLines.reduce((s, l) => s + l.credit, 0);
        const balanced = Math.abs(totalD - totalC) <= 0.1;

        return {
            lines: accountingLines,
            isBalanced: balanced,
            totalDebit: totalD,
            totalCredit: totalC,
            baseCurrency: baseCurr,
        };
    }, [dbLines, data, isRtl]);

    const formatAmount = (n: number) =>
        n === 0 ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── حالة التحميل ──
    if (loadingDb) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{isRtl ? 'جارٍ تحميل القيد المحاسبي…' : 'Loading accounting entry…'}</span>
            </div>
        );
    }

    if (lines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 opacity-30" />
                <p className="text-sm">
                    {isRtl ? 'أدخل بنوداً في التبويب الرئيسي لرؤية القيد المحاسبي' : 'Add line items to see the accounting entry'}
                </p>
            </div>
        );
    }

    return (
        <div className={cn('p-4 space-y-3', isRtl ? 'rtl' : 'ltr')}>
            {/* ─── عنوان ───────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                        {isRtl ? 'القيد المحاسبي' : 'Accounting Entry'}
                    </h3>
                    {baseCurrency && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs text-muted-foreground">
                            {baseCurrency}
                        </span>
                    )}
                    {entryId && (
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 rounded text-xs text-indigo-600 dark:text-indigo-400">
                            {isRtl ? 'من قاعدة البيانات' : 'From DB'}
                        </span>
                    )}
                </div>

                {/* حالة التوازن */}
                <div className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                    isBalanced
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                )}>
                    {isBalanced
                        ? <><CheckCircle2 className="w-3.5 h-3.5" />{isRtl ? 'متوازن' : 'Balanced'}</>
                        : <><AlertCircle className="w-3.5 h-3.5" />{isRtl ? 'غير متوازن' : 'Unbalanced'}</>
                    }
                </div>
            </div>

            {/* ─── جدول القيد ──────────────────────────────────── */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                            <th className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', isRtl ? 'text-right' : 'text-left')}>#</th>
                            <th className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', isRtl ? 'text-right' : 'text-left')}>
                                {isRtl ? 'الحساب' : 'Account'}
                            </th>
                            <th className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', isRtl ? 'text-right' : 'text-left')}>
                                {isRtl ? 'البيان' : 'Description'}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-emerald-600 text-end">
                                {isRtl ? 'مدين' : 'Debit'}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-red-500 text-end">
                                {isRtl ? 'دائن' : 'Credit'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, idx) => (
                            <tr
                                key={idx}
                                className={cn(
                                    'border-b last:border-0 transition-colors',
                                    idx === lines.length - 1
                                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                                        : 'hover:bg-muted/30'
                                )}
                            >
                                <td className={cn('px-3 py-2.5 text-xs text-muted-foreground', isRtl ? 'text-right' : 'text-left')}>
                                    {idx + 1}
                                </td>
                                <td className={cn('px-3 py-2.5', isRtl ? 'text-right' : 'text-left')}>
                                    <div className="font-medium text-foreground text-xs">{line.account_name}</div>
                                    {line.exchange_rate > 1.001 && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            {isRtl ? 'معدل الصرف:' : 'Rate:'} {line.exchange_rate.toFixed(4)}
                                        </div>
                                    )}
                                </td>
                                <td className={cn('px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate', isRtl ? 'text-right' : 'text-left')}>
                                    {line.description || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-end">
                                    {line.debit > 0 ? (
                                        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-end gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {formatAmount(line.debit)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground/40">—</span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-end">
                                    {line.credit > 0 ? (
                                        <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                                            <TrendingDown className="w-3 h-3" />
                                            {formatAmount(line.credit)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground/40">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-t-2">
                            <td colSpan={3} className={cn('px-3 py-2 text-xs font-semibold', isRtl ? 'text-right' : 'text-left')}>
                                {isRtl ? 'المجموع' : 'Total'}
                            </td>
                            <td className="px-3 py-2 text-end">
                                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                    {formatAmount(totalDebit)}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-end">
                                <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                                    {formatAmount(totalCredit)}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <p className="text-[11px] text-muted-foreground/60 text-center">
                {entryId
                    ? (isRtl ? 'القيد المحاسبي — المبالغ بالعملة الأساسية بعد تحويل سعر الصرف' : 'Accounting entry — amounts in base currency after exchange rate conversion')
                    : (isRtl ? 'معاينة — المبالغ المحسوبة بسعر الصرف الحالي' : 'Preview — amounts computed at current exchange rate')
                }
            </p>
        </div>
    );
}

export default AccountingEntryViewTab;
