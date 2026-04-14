/**
 * ════════════════════════════════════════════════════════════════
 * 🏛️ VAT Settlement Page — صفحة التسوية الضريبية
 * ════════════════════════════════════════════════════════════════
 * 
 * تسوية دورية (شهرية/ربع سنوية) بين:
 * - حساب 117 ضريبة مدخلات (ما دفعناه عند الاستيراد)
 * - حساب 214 ضريبة مخرجات (ما حصّلناه من العملاء)
 * 
 * النتائج:
 * - مدخلات > مخرجات → الحكومة مدينة لنا (ترحيل أو استرداد)
 * - مخرجات > مدخلات → ندفع الفرق للحكومة
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
    Calculator,
    ArrowDownCircle,
    ArrowUpCircle,
    Check,
    AlertCircle,
    Loader2,
    FileText,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Scale,
    BookOpen,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VATLine {
    id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    reference_type: string;
    debit: number;
    credit: number;
}

interface SettlementRecord {
    id: string;
    period: string;
    created_at: string;
    total_input: number;
    total_output: number;
    net_amount: number;
    settlement_type: string;
    journal_entry_id: string;
    entry_number: string;
}

export default function VATSettlement() {
    const { language } = useLanguage();
    const { user, companyId, tenantId } = useAuth();
    const isRTL = language === 'ar';

    // ─── State ───
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [inputLines, setInputLines] = useState<VATLine[]>([]);
    const [outputLines, setOutputLines] = useState<VATLine[]>([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [settlementHistory, setSettlementHistory] = useState<SettlementRecord[]>([]);

    // Period selection
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    const months = isRTL
        ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    const periodStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const periodEnd = selectedMonth === 12
        ? `${selectedYear + 1}-01-01`
        : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

    const fmtNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ─── Load accounts (cached via React Query) ───
    const { data: vatAccounts } = useCachedQuery({
        queryKey: ['accounting', 'vat-accounts-v2', companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const [settingsRes, banksRes] = await Promise.all([
                supabase.from('company_accounting_settings')
                    .select('default_tax_input_account_id, default_tax_output_account_id')
                    .eq('company_id', companyId).single(),
                supabase.from('chart_of_accounts')
                    .select('id, account_code, name_ar, name_en')
                    .eq('company_id', companyId).eq('is_detail', true)
                    .or('account_code.like.112%,account_code.like.111%')
                    .order('account_code'),
            ]);

            let inputId = '';
            let inputName = '';
            let outputId = '';
            let outputName = '';

            const accountIds: string[] = [];
            if (settingsRes.data?.default_tax_input_account_id) accountIds.push(settingsRes.data.default_tax_input_account_id);
            if (settingsRes.data?.default_tax_output_account_id) accountIds.push(settingsRes.data.default_tax_output_account_id);

            if (accountIds.length > 0) {
                const { data: accounts } = await supabase
                    .from('chart_of_accounts')
                    .select('id, account_code, name_ar, name_en')
                    .in('id', accountIds);

                accounts?.forEach(acc => {
                    if (acc.id === settingsRes.data?.default_tax_input_account_id) {
                        inputId = acc.id;
                        inputName = `${acc.account_code} — ${acc.name_ar}`;
                    }
                    if (acc.id === settingsRes.data?.default_tax_output_account_id) {
                        outputId = acc.id;
                        outputName = `${acc.account_code} — ${acc.name_ar}`;
                    }
                });
            }

            return { inputId, inputName, outputId, outputName, banks: banksRes.data || [] };
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,   // 5 min — tax accounts can change from settings
        gcTime: 24 * 60 * 60 * 1000,
    });

    // Derive account IDs from cached query
    const inputAccountId = vatAccounts?.inputId || '';
    const inputAccountName = vatAccounts?.inputName || '';
    const outputAccountId = vatAccounts?.outputId || '';
    const outputAccountName = vatAccounts?.outputName || '';
    const bankAccounts = vatAccounts?.banks || [];

    // ─── Fetch VAT data for selected period ───
    const fetchVATData = useCallback(async () => {
        if (!inputAccountId || !outputAccountId || !companyId) return;

        setLoading(true);
        try {
            // ⚡ Parallel fetch: input lines + output lines + settlement history
            const [inputRes, outputRes, historyRes] = await Promise.all([
                supabase.from('journal_entry_lines').select(`id, debit, credit, description, journal_entries!inner(entry_number, entry_date, description, reference_type, company_id, status)`)
                    .eq('account_id', inputAccountId).gte('journal_entries.entry_date', periodStart).lt('journal_entries.entry_date', periodEnd)
                    .eq('journal_entries.company_id', companyId).eq('journal_entries.status', 'posted'),
                supabase.from('journal_entry_lines').select(`id, debit, credit, description, journal_entries!inner(entry_number, entry_date, description, reference_type, company_id, status)`)
                    .eq('account_id', outputAccountId).gte('journal_entries.entry_date', periodStart).lt('journal_entries.entry_date', periodEnd)
                    .eq('journal_entries.company_id', companyId).eq('journal_entries.status', 'posted'),
                supabase.from('journal_entries').select('id, entry_number, entry_date, total_debit, description, created_at')
                    .eq('company_id', companyId).eq('reference_type', 'vat_settlement').order('created_at', { ascending: false }).limit(10),
            ]);

            const mapLine = (line: any): VATLine => ({
                id: line.id,
                entry_number: line.journal_entries?.entry_number || '',
                entry_date: line.journal_entries?.entry_date || '',
                description: line.description || line.journal_entries?.description || '',
                reference_type: line.journal_entries?.reference_type || '',
                debit: line.debit || 0,
                credit: line.credit || 0,
            });

            setInputLines((inputRes.data || []).map(mapLine));
            setOutputLines((outputRes.data || []).map(mapLine));
            setSettlementHistory((historyRes.data || []).map((h: any) => ({
                id: h.id, period: h.entry_date, created_at: h.created_at,
                total_input: 0, total_output: 0, net_amount: h.total_debit,
                settlement_type: '', journal_entry_id: h.id, entry_number: h.entry_number,
            })));

        } catch (err) {
            console.error('Error fetching VAT data:', err);
            toast.error(isRTL ? 'خطأ في جلب بيانات الضريبة' : 'Error fetching VAT data');
        } finally {
            setLoading(false);
        }
    }, [inputAccountId, outputAccountId, companyId, periodStart, periodEnd, isRTL]);

    useEffect(() => {
        if (inputAccountId && outputAccountId) {
            fetchVATData();
        }
    }, [fetchVATData]);

    // ─── Calculations ───
    const totals = useMemo(() => {
        const totalInput = inputLines.reduce((sum, l) => sum + l.debit - l.credit, 0);
        const totalOutput = outputLines.reduce((sum, l) => sum + l.credit - l.debit, 0);
        const net = totalOutput - totalInput;
        // net > 0 → output > input → we owe the government
        // net < 0 → input > output → government owes us
        return { totalInput, totalOutput, net };
    }, [inputLines, outputLines]);

    const getRefTypeLabel = (type: string) => {
        const labels: Record<string, { ar: string; en: string }> = {
            container_tax: { ar: 'ضريبة جمركية', en: 'Customs Tax' },
            sales_invoice: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
            purchase_invoice: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
            vat_settlement: { ar: 'تسوية ضريبية', en: 'VAT Settlement' },
        };
        return labels[type] ? (isRTL ? labels[type].ar : labels[type].en) : type;
    };

    // ─── Create settlement entry ───
    const handleCreateSettlement = async (action: 'offset' | 'pay' | 'refund') => {
        if (!user?.id || !tenantId || !companyId) return;

        const { totalInput, totalOutput, net } = totals;
        const settlementAmount = Math.min(totalInput, totalOutput);

        if (settlementAmount <= 0) {
            toast.error(isRTL ? 'لا يوجد مبلغ للتسوية' : 'No amount to settle');
            return;
        }

        if ((action === 'pay' || action === 'refund') && !selectedBankId) {
            toast.error(isRTL ? 'اختر حساب البنك' : 'Select bank account');
            return;
        }

        setPosting(true);
        try {
            const ts = Date.now();
            const rand = Math.floor(1000 + Math.random() * 9000);
            const entryNumber = `JE-VAT-${ts}-${rand}`;
            const today = new Date().toISOString().slice(0, 10);
            const periodLabel = `${months[selectedMonth - 1]} ${selectedYear}`;

            const lines: any[] = [];
            let totalDebit = 0;
            let totalCredit = 0;

            if (action === 'offset') {
                // مقاصة فقط: Dr 214 / Cr 117 بالمبلغ الأقل
                lines.push(
                    {
                        tenant_id: tenantId,
                        account_id: outputAccountId,
                        debit: settlementAmount,
                        credit: 0,
                        description: isRTL
                            ? `تسوية ضريبية — مقاصة مدخلات/مخرجات — ${periodLabel}`
                            : `VAT Settlement — Offset — ${periodLabel}`,
                        line_number: 1,
                    },
                    {
                        tenant_id: tenantId,
                        account_id: inputAccountId,
                        debit: 0,
                        credit: settlementAmount,
                        description: isRTL
                            ? `تسوية ضريبية — مقاصة مدخلات/مخرجات — ${periodLabel}`
                            : `VAT Settlement — Offset — ${periodLabel}`,
                        line_number: 2,
                    }
                );
                totalDebit = settlementAmount;
                totalCredit = settlementAmount;
            } else if (action === 'pay') {
                // ندفع للحكومة: Dr 214 (كامل) / Cr 117 (كامل) / Cr بنك (الفرق)
                const amountToPay = net; // net > 0 means we owe
                lines.push(
                    {
                        tenant_id: tenantId,
                        account_id: outputAccountId,
                        debit: totalOutput,
                        credit: 0,
                        description: isRTL ? `تصفير ضريبة مخرجات — ${periodLabel}` : `Clear VAT Output — ${periodLabel}`,
                        line_number: 1,
                    },
                    {
                        tenant_id: tenantId,
                        account_id: inputAccountId,
                        debit: 0,
                        credit: totalInput,
                        description: isRTL ? `تصفير ضريبة مدخلات — ${periodLabel}` : `Clear VAT Input — ${periodLabel}`,
                        line_number: 2,
                    },
                    {
                        tenant_id: tenantId,
                        account_id: selectedBankId,
                        debit: 0,
                        credit: amountToPay,
                        description: isRTL ? `دفع ضريبة للحكومة — ${periodLabel}` : `VAT Payment to Government — ${periodLabel}`,
                        line_number: 3,
                    }
                );
                totalDebit = totalOutput;
                totalCredit = totalInput + amountToPay;
            } else if (action === 'refund') {
                // استرداد: Dr 117 (تصفير) / Dr بنك (الفرق) / Cr ... 
                const amountToRefund = Math.abs(net);
                lines.push(
                    {
                        tenant_id: tenantId,
                        account_id: outputAccountId,
                        debit: totalOutput,
                        credit: 0,
                        description: isRTL ? `تصفير ضريبة مخرجات — ${periodLabel}` : `Clear VAT Output — ${periodLabel}`,
                        line_number: 1,
                    },
                    {
                        tenant_id: tenantId,
                        account_id: selectedBankId,
                        debit: amountToRefund,
                        credit: 0,
                        description: isRTL ? `استرداد ضريبة من الحكومة — ${periodLabel}` : `VAT Refund from Government — ${periodLabel}`,
                        line_number: 2,
                    },
                    {
                        tenant_id: tenantId,
                        account_id: inputAccountId,
                        debit: 0,
                        credit: totalInput,
                        description: isRTL ? `تصفير ضريبة مدخلات — ${periodLabel}` : `Clear VAT Input — ${periodLabel}`,
                        line_number: 3,
                    }
                );
                totalDebit = totalOutput + amountToRefund;
                totalCredit = totalInput;
            }

            // Create journal entry
            const { data: je, error: jeErr } = await supabase
                .from('journal_entries')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    entry_number: entryNumber,
                    entry_date: today,
                    description: isRTL
                        ? `تسوية ضريبية — ${periodLabel}`
                        : `VAT Settlement — ${periodLabel}`,
                    reference_type: 'vat_settlement',
                    status: 'posted',
                    total_debit: totalDebit,
                    total_credit: totalCredit,
                    created_by: user.id,
                })
                .select()
                .single();

            if (jeErr) throw jeErr;

            // Add entry_id to lines
            const linesWithEntry = lines.map(l => ({ ...l, entry_id: je.id }));
            const { error: lnErr } = await supabase
                .from('journal_entry_lines')
                .insert(linesWithEntry);

            if (lnErr) throw lnErr;

            toast.success(isRTL
                ? `✅ تم إنشاء قيد التسوية — ${entryNumber}`
                : `✅ Settlement entry created — ${entryNumber}`
            );

            // Refresh
            fetchVATData();
        } catch (err: any) {
            console.error('Error creating settlement:', err);
            toast.error(err.message || (isRTL ? 'خطأ في إنشاء التسوية' : 'Error creating settlement'));
        } finally {
            setPosting(false);
        }
    };

    // ─── RENDER ───
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                        <Scale className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isRTL ? 'التسوية الضريبية' : 'VAT Settlement'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isRTL ? 'مقاصة بين ضريبة المدخلات والمخرجات' : 'Offset Input VAT vs Output VAT'}
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchVATData} disabled={loading}>
                    <RefreshCw className={cn("w-4 h-4 me-1", loading && "animate-spin")} />
                    {isRTL ? 'تحديث' : 'Refresh'}
                </Button>
            </div>

            {/* Period Selector */}
            <Card className="border-violet-200/60 dark:border-violet-800/40">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {isRTL ? 'الفترة:' : 'Period:'}
                        </span>
                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                            <SelectTrigger className="w-[160px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-[100px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Account badges */}
                        <div className="flex items-center gap-2 ms-auto">
                            {inputAccountName && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700 gap-1">
                                    <ArrowDownCircle className="w-3 h-3" />
                                    {inputAccountName}
                                </Badge>
                            )}
                            {outputAccountName && (
                                <Badge variant="outline" className="text-xs bg-rose-50 border-rose-200 text-rose-700 gap-1">
                                    <ArrowUpCircle className="w-3 h-3" />
                                    {outputAccountName}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    <span className="ms-2 text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Input VAT */}
                        <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-gray-900">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                                    <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">
                                        {isRTL ? 'ضريبة مدخلات (ما دفعناه)' : 'Input VAT (What We Paid)'}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                                    {fmtNum(totals.totalInput)}
                                </div>
                                <div className="text-xs text-emerald-600/70 mt-1">
                                    {inputLines.length} {isRTL ? 'حركة' : 'entries'}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Output VAT */}
                        <Card className="border-rose-200/60 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-gray-900">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowUpCircle className="w-5 h-5 text-rose-600" />
                                    <span className="font-semibold text-sm text-rose-800 dark:text-rose-200">
                                        {isRTL ? 'ضريبة مخرجات (ما حصّلناه)' : 'Output VAT (What We Collected)'}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300">
                                    {fmtNum(totals.totalOutput)}
                                </div>
                                <div className="text-xs text-rose-600/70 mt-1">
                                    {outputLines.length} {isRTL ? 'حركة' : 'entries'}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Net */}
                        <Card className={cn(
                            "border-2",
                            totals.net > 0 ? "border-amber-300 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20" :
                                totals.net < 0 ? "border-blue-300 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20" :
                                    "border-gray-300 bg-gradient-to-br from-gray-50/50 to-white"
                        )}>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Scale className="w-5 h-5 text-violet-600" />
                                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                        {isRTL ? 'صافي الفرق' : 'Net Difference'}
                                    </span>
                                </div>
                                <div className={cn(
                                    "text-2xl font-bold font-mono",
                                    totals.net > 0 ? "text-amber-700" : totals.net < 0 ? "text-blue-700" : "text-gray-500"
                                )}>
                                    {fmtNum(Math.abs(totals.net))}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    {totals.net > 0 ? (
                                        <>
                                            <TrendingUp className="w-3 h-3 text-amber-600" />
                                            <span className="text-xs text-amber-600 font-medium">
                                                {isRTL ? 'مستحق للحكومة — ندفع' : 'Owed to government — we pay'}
                                            </span>
                                        </>
                                    ) : totals.net < 0 ? (
                                        <>
                                            <TrendingDown className="w-3 h-3 text-blue-600" />
                                            <span className="text-xs text-blue-600 font-medium">
                                                {isRTL ? 'لصالح الشركة — نسترد أو نرحّل' : 'In our favor — refund or carry forward'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-500">
                                            {isRTL ? 'متساوي — لا حاجة لتسوية' : 'Equal — no settlement needed'}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detail Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Input VAT Details */}
                        <Card>
                            <CardHeader className="py-3 px-4 bg-emerald-50/50 dark:bg-emerald-950/20">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                                    {isRTL ? 'تفاصيل ضريبة المدخلات' : 'Input VAT Details'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead className="text-xs">{isRTL ? 'القيد' : 'Entry'}</TableHead>
                                            <TableHead className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                                            <TableHead className="text-xs">{isRTL ? 'النوع' : 'Type'}</TableHead>
                                            <TableHead className="text-xs text-end">{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inputLines.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-xs text-gray-400 py-6">
                                                    {isRTL ? 'لا توجد حركات' : 'No entries'}
                                                </TableCell>
                                            </TableRow>
                                        ) : inputLines.map(line => (
                                            <TableRow key={line.id} className="text-xs">
                                                <TableCell className="font-mono text-xs">{line.entry_number}</TableCell>
                                                <TableCell className="text-xs">{line.entry_date}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] px-1">
                                                        {getRefTypeLabel(line.reference_type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-emerald-700 font-medium">
                                                    {fmtNum(line.debit - line.credit)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    {inputLines.length > 0 && (
                                        <TableFooter>
                                            <TableRow className="bg-emerald-50/60 font-bold">
                                                <TableCell colSpan={3} className="text-xs">{isRTL ? 'الإجمالي' : 'Total'}</TableCell>
                                                <TableCell className="text-end font-mono text-emerald-700">{fmtNum(totals.totalInput)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    )}
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Output VAT Details */}
                        <Card>
                            <CardHeader className="py-3 px-4 bg-rose-50/50 dark:bg-rose-950/20">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ArrowUpCircle className="w-4 h-4 text-rose-600" />
                                    {isRTL ? 'تفاصيل ضريبة المخرجات' : 'Output VAT Details'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead className="text-xs">{isRTL ? 'القيد' : 'Entry'}</TableHead>
                                            <TableHead className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                                            <TableHead className="text-xs">{isRTL ? 'النوع' : 'Type'}</TableHead>
                                            <TableHead className="text-xs text-end">{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {outputLines.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-xs text-gray-400 py-6">
                                                    {isRTL ? 'لا توجد حركات' : 'No entries'}
                                                </TableCell>
                                            </TableRow>
                                        ) : outputLines.map(line => (
                                            <TableRow key={line.id} className="text-xs">
                                                <TableCell className="font-mono text-xs">{line.entry_number}</TableCell>
                                                <TableCell className="text-xs">{line.entry_date}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] px-1">
                                                        {getRefTypeLabel(line.reference_type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-rose-700 font-medium">
                                                    {fmtNum(line.credit - line.debit)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    {outputLines.length > 0 && (
                                        <TableFooter>
                                            <TableRow className="bg-rose-50/60 font-bold">
                                                <TableCell colSpan={3} className="text-xs">{isRTL ? 'الإجمالي' : 'Total'}</TableCell>
                                                <TableCell className="text-end font-mono text-rose-700">{fmtNum(totals.totalOutput)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    )}
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Settlement Actions */}
                    {(totals.totalInput > 0 || totals.totalOutput > 0) && (
                        <Card className="border-2 border-violet-200 dark:border-violet-800/40 bg-gradient-to-r from-violet-50/30 to-purple-50/20 dark:from-violet-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-violet-600" />
                                    {isRTL ? 'إجراء التسوية' : 'Settlement Action'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Bank selector */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 whitespace-nowrap">
                                        {isRTL ? 'حساب البنك:' : 'Bank Account:'}
                                    </span>
                                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                                        <SelectTrigger className="h-9 w-[250px]">
                                            <SelectValue placeholder={isRTL ? 'اختر حساب البنك...' : 'Select bank...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id} className="text-sm">
                                                    {acc.account_code} — {isRTL ? acc.name_ar : (acc.name_en || acc.name_ar)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator />

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-3">
                                    {/* Offset only */}
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-violet-300 hover:bg-violet-50"
                                        onClick={() => handleCreateSettlement('offset')}
                                        disabled={posting || Math.min(totals.totalInput, totals.totalOutput) <= 0}
                                    >
                                        {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                                        {isRTL ? `مقاصة (${fmtNum(Math.min(totals.totalInput, totals.totalOutput))})` : `Offset (${fmtNum(Math.min(totals.totalInput, totals.totalOutput))})`}
                                    </Button>

                                    {/* Pay government */}
                                    {totals.net > 0 && (
                                        <Button
                                            variant="default"
                                            className="gap-2 bg-amber-600 hover:bg-amber-700"
                                            onClick={() => handleCreateSettlement('pay')}
                                            disabled={posting || !selectedBankId}
                                        >
                                            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                            {isRTL ? `دفع للحكومة (${fmtNum(totals.net)})` : `Pay Government (${fmtNum(totals.net)})`}
                                        </Button>
                                    )}

                                    {/* Refund */}
                                    {totals.net < 0 && (
                                        <Button
                                            variant="default"
                                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleCreateSettlement('refund')}
                                            disabled={posting || !selectedBankId}
                                        >
                                            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
                                            {isRTL ? `استرداد (${fmtNum(Math.abs(totals.net))})` : `Refund (${fmtNum(Math.abs(totals.net))})`}
                                        </Button>
                                    )}
                                </div>

                                {/* Preview entry */}
                                <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 text-xs space-y-1">
                                    <div className="font-medium text-gray-600 mb-2">
                                        {isRTL ? 'القيد المقترح (مقاصة):' : 'Proposed Entry (Offset):'}
                                    </div>
                                    <div className="flex justify-between font-mono">
                                        <span className="text-violet-700">{isRTL ? 'مدين' : 'Dr'} | 214 {isRTL ? 'ضريبة مخرجات' : 'VAT Output'}</span>
                                        <span className="font-bold">{fmtNum(Math.min(totals.totalInput, totals.totalOutput))}</span>
                                    </div>
                                    <div className="flex justify-between font-mono">
                                        <span className="text-emerald-700">{isRTL ? 'دائن' : 'Cr'} | 117 {isRTL ? 'ضريبة مدخلات' : 'VAT Input'}</span>
                                        <span className="font-bold">{fmtNum(Math.min(totals.totalInput, totals.totalOutput))}</span>
                                    </div>
                                    {totals.net !== 0 && (
                                        <div className="pt-1 border-t mt-1 text-gray-500">
                                            {isRTL ? 'الباقي:' : 'Remaining:'} {fmtNum(Math.abs(totals.net))} —{' '}
                                            {totals.net > 0
                                                ? (isRTL ? 'يُدفع للحكومة' : 'to pay')
                                                : (isRTL ? 'يُرحّل أو يُسترد' : 'carry forward or refund')
                                            }
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Settlement History */}
                    {settlementHistory.length > 0 && (
                        <Card>
                            <CardHeader className="py-3 px-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {isRTL ? 'سجل التسويات السابقة' : 'Settlement History'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead className="text-xs">{isRTL ? 'رقم القيد' : 'Entry #'}</TableHead>
                                            <TableHead className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                                            <TableHead className="text-xs text-end">{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {settlementHistory.map(s => (
                                            <TableRow key={s.id} className="text-xs">
                                                <TableCell className="font-mono">{s.entry_number}</TableCell>
                                                <TableCell>{s.period}</TableCell>
                                                <TableCell className="text-end font-mono font-medium">{fmtNum(s.net_amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
