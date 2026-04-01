/**
 * 💳 PaymentReceiptTab — سند القبض + الأقساط + القيد المحاسبي
 * Combined Payment Receipt + Installment Plan + Journal Preview Tab
 * 
 * Features:
 * - Payment receipt form (amount, treasury, method)
 * - Installment plan creation & tracking
 * - Payment requirement toggle for document confirmation
 * - Treasury account selection (cash/bank)
 * - Journal entry preview (debit/credit)
 * - Payment history
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useAccountingDefaults, getAccountCode, getAccountName } from '@/hooks/useAccountingDefaults';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
    CreditCard, Banknote, Building2, Wallet, CalendarDays,
    CheckCircle2, Clock, AlertTriangle, Plus, Trash2,
    Receipt, BookOpen, ChevronDown, ChevronUp, Shield,
    Bell, Send, ArrowDownUp, CircleDollarSign, FileText
} from 'lucide-react';
import {
    paymentScheduleService,
    type PaymentSchedule,
    type PaymentScheduleItem,
    type TreasuryAccount,
    type PlanType,
    type InstallmentPeriod,
    type PaymentMethod,
    type JournalPreviewLine,
} from '@/services/paymentScheduleService';

// ═══════════════════════════════════════════
// Props
// ═══════════════════════════════════════════

interface PaymentReceiptTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const PAYMENT_METHODS: { value: PaymentMethod; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { value: 'cash', labelAr: 'نقداً', labelEn: 'Cash', icon: <Banknote className="w-4 h-4" /> },
    { value: 'bank_transfer', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer', icon: <Building2 className="w-4 h-4" /> },
    { value: 'check', labelAr: 'شيك', labelEn: 'Check', icon: <FileText className="w-4 h-4" /> },
    { value: 'credit_card', labelAr: 'بطاقة ائتمان', labelEn: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'pos', labelAr: 'نقاط البيع', labelEn: 'POS', icon: <Wallet className="w-4 h-4" /> },
];

const PLAN_TYPES: { value: PlanType; labelAr: string; labelEn: string }[] = [
    { value: 'installment', labelAr: 'أقساط متساوية', labelEn: 'Equal Installments' },
    { value: 'custom', labelAr: 'مبالغ مخصصة', labelEn: 'Custom Amounts' },
    { value: 'deposit', labelAr: 'عربون + باقي', labelEn: 'Deposit + Balance' },
];

const PERIODS: { value: InstallmentPeriod; labelAr: string; labelEn: string }[] = [
    { value: 'weekly', labelAr: 'أسبوعياً', labelEn: 'Weekly' },
    { value: 'biweekly', labelAr: 'كل أسبوعين', labelEn: 'Bi-weekly' },
    { value: 'monthly', labelAr: 'شهرياً', labelEn: 'Monthly' },
    { value: 'quarterly', labelAr: 'ربع سنوي', labelEn: 'Quarterly' },
];

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export const PaymentReceiptTab: React.FC<PaymentReceiptTabProps> = ({ data, mode, onChange }) => {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const { data: accountingDefaults } = useAccountingDefaults(companyId);
    const acctCodes = accountingDefaults?.codes || {};
    const acctSettings = accountingDefaults?.settings;
    const queryClient = useQueryClient();

    // ─── State ─────────────────────────────
    const [showInstallmentForm, setShowInstallmentForm] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState<string | null>(null);
    const [journalExpanded, setJournalExpanded] = useState(true);

    // Quick Receipt form
    const [receiptAmount, setReceiptAmount] = useState('');
    const [receiptMethod, setReceiptMethod] = useState<PaymentMethod>('cash');
    const [receiptTreasury, setReceiptTreasury] = useState('');
    const [receiptNotes, setReceiptNotes] = useState('');

    // Installment plan form
    const [planType, setPlanType] = useState<PlanType>('installment');
    const [installmentCount, setInstallmentCount] = useState(3);
    const [installmentPeriod, setInstallmentPeriod] = useState<InstallmentPeriod>('monthly');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [depositAmount, setDepositAmount] = useState('');
    const [telegramEnabled, setTelegramEnabled] = useState(false);
    const [telegramDays, setTelegramDays] = useState(3);

    // Payment requirement
    const [paymentRequired, setPaymentRequired] = useState(data?.payment_required || false);

    // ─── Derived values ───────────────────
    const docCurrency = data?.currency || companyCurrency || 'USD';
    const totalAmount = Number(data?.total_amount || data?.grand_total || 0);
    const paidAmount = Number(data?.paid_amount || 0);
    const balanceDue = totalAmount - paidAmount;
    const customerName = isRTL ? (data?.customer_name_ar || data?.customer_name) : (data?.customer_name_en || data?.customer_name);

    // Document IDs
    const docIds = useMemo(() => ({
        quotation_id: data?.quotation_id || (data?._docType === 'quotation' ? data?.id : undefined),
        sales_order_id: data?.sales_order_id || (data?._docType === 'order' ? data?.id : undefined),
        sales_invoice_id: data?.sales_invoice_id || (data?._docType === 'invoice' ? data?.id : undefined),
        company_id: companyId || '',
    }), [data, companyId]);

    // ─── Queries ──────────────────────────
    const { data: schedule, refetch: refetchSchedule } = useCachedQuery({
        queryKey: ['payment_schedule', docIds],
        queryFn: () => paymentScheduleService.getByDocument(docIds),
        enabled: !!companyId && !!(docIds.quotation_id || docIds.sales_order_id || docIds.sales_invoice_id),
    });

    const { data: treasuryAccounts = [] } = useCachedQuery({
        queryKey: ['treasury_accounts', companyId],
        queryFn: () => paymentScheduleService.getTreasuryAccounts(companyId!),
        enabled: !!companyId,
        staleTime: 60000,
    });

    const { data: paymentHistory = [] } = useCachedQuery({
        queryKey: ['payment_history', docIds],
        queryFn: () => paymentScheduleService.getPaymentHistory(docIds),
        enabled: !!companyId && !!(docIds.quotation_id || docIds.sales_order_id || docIds.sales_invoice_id),
    });

    // ─── Fetch party sub-account (customer) ──────────
    const customerId = data?.customer_id;
    const { data: partySubAccount } = useCachedQuery({
        queryKey: ['party_sub_account', customerId, 'customer'],
        queryFn: async () => {
            if (!customerId) return null;
            const { data: row, error } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en')
                .eq('is_party_account', true)
                .eq('party_type', 'customer')
                .eq('party_id', customerId)
                .maybeSingle();
            if (error || !row) return null;
            return {
                code: row.account_code,
                nameAr: row.name_ar || '',
                nameEn: row.name_en || row.name_ar || '',
            };
        },
        enabled: !!customerId,
    });

    // ─── Tax from data ───────────────────────
    const taxAmount = Number(data?.tax_amount || 0);

    // ─── Journal Preview ─────────────────
    const journalLines = useMemo<JournalPreviewLine[]>(() => {
        return paymentScheduleService.generateJournalPreview({
            totalAmount,
            paidAmount,
            taxAmount,
            currency: docCurrency,
            customerName,
            isRTL,
            partySubAccount: partySubAccount || null,
            accountCodes: acctSettings ? {
                receivableCode: getAccountCode(acctCodes, acctSettings.default_receivable_account_id),
                receivableName: getAccountName(acctCodes, acctSettings.default_receivable_account_id, isRTL),
                salesCode: getAccountCode(acctCodes, acctSettings.default_sales_account_id),
                salesName: getAccountName(acctCodes, acctSettings.default_sales_account_id, isRTL),
                cashCode: getAccountCode(acctCodes, acctSettings.default_cash_account_id),
                cashName: getAccountName(acctCodes, acctSettings.default_cash_account_id, isRTL),
                taxOutputCode: getAccountCode(acctCodes, acctSettings.default_tax_output_account_id),
                taxOutputName: getAccountName(acctCodes, acctSettings.default_tax_output_account_id, isRTL),
            } : undefined,
        });
    }, [totalAmount, paidAmount, taxAmount, docCurrency, customerName, isRTL, acctCodes, acctSettings, partySubAccount]);

    // ─── Payment Requirement Toggle ───────
    useEffect(() => {
        if (data?.payment_required !== undefined) {
            setPaymentRequired(data.payment_required);
        }
    }, [data?.payment_required]);

    const handlePaymentRequiredChange = useCallback((checked: boolean) => {
        setPaymentRequired(checked);
        onChange({ payment_required: checked });
    }, [onChange]);

    // ─── Create Schedule ──────────────────
    const createScheduleMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company');
            return paymentScheduleService.createSchedule({
                company_id: companyId,
                ...docIds,
                customer_id: data?.customer_id,
                plan_type: planType,
                total_amount: totalAmount,
                currency: docCurrency,
                installment_count: installmentCount,
                installment_period: installmentPeriod,
                start_date: startDate,
                deposit_amount: planType === 'deposit' ? Number(depositAmount) || 0 : 0,
                payment_required_for_confirmation: paymentRequired,
                telegram_reminder_enabled: telegramEnabled,
                telegram_reminder_days_before: telegramDays,
            });
        },
        onSuccess: () => {
            toast.success(isRTL ? 'تم إنشاء خطة الأقساط' : 'Installment plan created');
            setShowInstallmentForm(false);
            refetchSchedule();
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    // ─── Record Quick Payment ─────────────
    const recordPaymentMutation = useMutation({
        mutationFn: async (itemId: string) => {
            return paymentScheduleService.recordPayment({
                schedule_item_id: itemId,
                amount: Number(receiptAmount),
                payment_method: receiptMethod,
                treasury_account_id: receiptTreasury || undefined,
                notes: receiptNotes,
                create_receipt: true,
            });
        },
        onSuccess: () => {
            toast.success(isRTL ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded');
            setShowPaymentDialog(null);
            setReceiptAmount('');
            setReceiptNotes('');
            refetchSchedule();
            queryClient.invalidateQueries({ queryKey: ['payment_history'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    // ─── Direct Receipt (No Schedule) ─────
    const directReceiptMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company');
            const { getCurrentTenantIdAsync: getTenantId } = await import('@/lib/supabase');
            const tenantId = await getTenantId();
            const { error } = await supabase.from('payment_receipts').insert({
                tenant_id: tenantId,
                company_id: companyId,
                receipt_number: `RCV-${Date.now()}`,
                receipt_date: new Date().toISOString().split('T')[0],
                customer_id: data?.customer_id,
                amount: Number(receiptAmount),
                currency: docCurrency,
                payment_method: receiptMethod,
                status: 'confirmed',
                notes: receiptNotes,
                treasury_account_id: receiptTreasury || null,
                sales_invoice_id: docIds.sales_invoice_id,
                sales_order_id: docIds.sales_order_id,
                quotation_id: docIds.quotation_id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(isRTL ? 'تم إنشاء سند القبض' : 'Receipt created');
            setReceiptAmount('');
            setReceiptNotes('');
            queryClient.invalidateQueries({ queryKey: ['payment_history'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    // ─── Format helpers ───────────────────
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US') : '-';
    const statusLabel = (s: string) => {
        const map: Record<string, { ar: string; en: string }> = {
            pending: { ar: 'قيد الانتظار', en: 'Pending' },
            paid: { ar: 'مدفوع', en: 'Paid' },
            partial: { ar: 'مدفوع جزئياً', en: 'Partial' },
            overdue: { ar: 'متأخر', en: 'Overdue' },
            active: { ar: 'نشط', en: 'Active' },
            completed: { ar: 'مكتمل', en: 'Completed' },
            cancelled: { ar: 'ملغي', en: 'Cancelled' },
        };
        return isRTL ? map[s]?.ar || s : map[s]?.en || s;
    };

    const readOnly = mode === 'view';

    // ═══════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════

    return (
        <div className="space-y-4 p-3 overflow-y-auto max-h-[calc(100vh-280px)]" dir={direction}>

            {/* ═══ Section 1: Document Payment Summary ═══ */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/40">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        {isRTL ? 'ملخص المدفوعات' : 'Payment Summary'}
                    </h3>
                    {schedule && (
                        <Badge className={cn('text-xs', STATUS_COLORS[schedule.status])}>
                            {statusLabel(schedule.status)}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'إجمالي الفاتورة' : 'Invoice Total'}</p>
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">{fmt(totalAmount)}</p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'المدفوع' : 'Paid'}</p>
                        <p className="text-lg font-bold font-mono text-emerald-600">{fmt(paidAmount)}</p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'المتبقي' : 'Balance'}</p>
                        <p className={cn('text-lg font-bold font-mono', balanceDue > 0 ? 'text-red-600' : 'text-emerald-600')}>
                            {fmt(balanceDue)}
                        </p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'حالة السداد' : 'Status'}</p>
                        <p className={cn('text-sm font-bold',
                            paidAmount >= totalAmount ? 'text-emerald-600' :
                                paidAmount > 0 ? 'text-blue-600' : 'text-gray-500'
                        )}>
                            {paidAmount >= totalAmount
                                ? (isRTL ? 'مدفوع بالكامل ✅' : 'Fully Paid ✅')
                                : paidAmount > 0
                                    ? (isRTL ? 'مدفوع جزئياً' : 'Partially Paid')
                                    : (isRTL ? 'غير مدفوع' : 'Unpaid')}
                        </p>
                        {totalAmount > 0 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                                <div
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min((paidAmount / totalAmount) * 100, 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Required Toggle */}
                {!readOnly && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-700/30">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {isRTL ? 'الدفعة ضرورية لتأكيد المستند' : 'Payment required for confirmation'}
                            </span>
                        </div>
                        <Switch checked={paymentRequired} onCheckedChange={handlePaymentRequiredChange} />
                    </div>
                )}
                {paymentRequired && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {isRTL
                            ? 'لن يتم تأكيد الحجز/الفاتورة إلا بعد استلام الدفعة من الصندوق أو البنك'
                            : 'Document cannot be confirmed until payment is received via cash or bank'}
                    </p>
                )}
            </div>

            {/* ═══ Section 2: Quick Receipt / سند قبض سريع ═══ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    {isRTL ? 'سند قبض / تسجيل دفعة' : 'Payment Receipt'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Amount */}
                    <div>
                        <Label className="text-xs mb-1 block">{isRTL ? 'المبلغ' : 'Amount'}</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="0.01"
                                value={receiptAmount}
                                onChange={e => setReceiptAmount(e.target.value)}
                                placeholder={fmt(balanceDue)}
                                className="font-mono pe-12"
                                disabled={readOnly}
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{docCurrency}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <Label className="text-xs mb-1 block">{isRTL ? 'طريقة الدفع' : 'Method'}</Label>
                        <Select value={receiptMethod} onValueChange={v => setReceiptMethod(v as PaymentMethod)} disabled={readOnly}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map(m => (
                                    <SelectItem key={m.value} value={m.value}>
                                        <span className="flex items-center gap-2">
                                            {m.icon}
                                            {isRTL ? m.labelAr : m.labelEn}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Treasury Account */}
                    <div>
                        <Label className="text-xs mb-1 block">{isRTL ? 'الصندوق / البنك' : 'Treasury'}</Label>
                        <Select value={receiptTreasury} onValueChange={setReceiptTreasury} disabled={readOnly}>
                            <SelectTrigger>
                                <SelectValue placeholder={isRTL ? 'اختر الصندوق...' : 'Select treasury...'} />
                            </SelectTrigger>
                            <SelectContent>
                                {treasuryAccounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        <span className="flex items-center gap-2">
                                            {acc.is_cash_account ? <Banknote className="w-3 h-3 text-emerald-600" /> : <Building2 className="w-3 h-3 text-blue-600" />}
                                            <span className="text-xs">{acc.account_code} — {isRTL ? acc.name_ar : (acc.name_en || acc.name_ar)}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{fmt(acc.current_balance)}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                                {treasuryAccounts.length === 0 && (
                                    <div className="p-2 text-xs text-gray-400 text-center">
                                        {isRTL ? 'لا توجد حسابات خزينة' : 'No treasury accounts'}
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Submit */}
                    <div className="flex items-end">
                        <Button
                            onClick={() => directReceiptMutation.mutate()}
                            disabled={readOnly || !receiptAmount || Number(receiptAmount) <= 0 || directReceiptMutation.isPending}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            size="sm"
                        >
                            <CheckCircle2 className="w-4 h-4 me-1" />
                            {isRTL ? 'تسجيل سند قبض' : 'Record Receipt'}
                        </Button>
                    </div>
                </div>

                {/* Notes */}
                <div className="mt-2">
                    <Input
                        value={receiptNotes}
                        onChange={e => setReceiptNotes(e.target.value)}
                        placeholder={isRTL ? 'ملاحظات الدفعة...' : 'Payment notes...'}
                        className="text-xs"
                        disabled={readOnly}
                    />
                </div>
            </div>

            {/* ═══ Section 3: Installment Plan ═══ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-purple-600" />
                        {isRTL ? 'خطة الأقساط' : 'Installment Plan'}
                    </h3>
                    {!schedule && !readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInstallmentForm(!showInstallmentForm)}
                            className="text-xs"
                        >
                            <Plus className="w-3 h-3 me-1" />
                            {isRTL ? 'إنشاء خطة' : 'Create Plan'}
                        </Button>
                    )}
                </div>

                {/* Create Plan Form */}
                {showInstallmentForm && !schedule && (
                    <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-700/30 mb-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <Label className="text-xs mb-1 block">{isRTL ? 'نوع الخطة' : 'Plan Type'}</Label>
                                <Select value={planType} onValueChange={v => setPlanType(v as PlanType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PLAN_TYPES.map(pt => (
                                            <SelectItem key={pt.value} value={pt.value}>
                                                {isRTL ? pt.labelAr : pt.labelEn}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs mb-1 block">{isRTL ? 'عدد الأقساط' : 'Count'}</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={installmentCount}
                                    onChange={e => setInstallmentCount(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <Label className="text-xs mb-1 block">{isRTL ? 'الفترة' : 'Period'}</Label>
                                <Select value={installmentPeriod} onValueChange={v => setInstallmentPeriod(v as InstallmentPeriod)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PERIODS.map(p => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {isRTL ? p.labelAr : p.labelEn}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs mb-1 block">{isRTL ? 'تاريخ أول قسط' : 'Start Date'}</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                        </div>

                        {planType === 'deposit' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1 block">{isRTL ? 'مبلغ العربون' : 'Deposit Amount'}</Label>
                                    <Input
                                        type="number"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="font-mono"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <p className="text-xs text-gray-500 pb-2">
                                        {isRTL ? 'المتبقي بعد العربون:' : 'After deposit:'}{' '}
                                        <span className="font-mono font-bold">{fmt(totalAmount - (Number(depositAmount) || 0))}</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Telegram Reminders */}
                        <div className="flex items-center justify-between pt-2 border-t border-purple-200/50">
                            <div className="flex items-center gap-2">
                                <Bell className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs">{isRTL ? 'تذكيرات تلغرام' : 'Telegram Reminders'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                                {telegramEnabled && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">{isRTL ? 'قبل' : 'Before'}</span>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={telegramDays}
                                            onChange={e => setTelegramDays(Number(e.target.value))}
                                            className="w-14 h-6 text-xs text-center"
                                        />
                                        <span className="text-[10px] text-gray-500">{isRTL ? 'يوم' : 'days'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-white/60 dark:bg-black/20 rounded p-2 text-xs">
                            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {isRTL ? '📊 معاينة الأقساط:' : '📊 Preview:'}
                            </p>
                            <p className="text-gray-500">
                                {installmentCount} × {fmt((totalAmount - (planType === 'deposit' ? Number(depositAmount) || 0 : 0)) / installmentCount)} {docCurrency}
                                {' '}{isRTL ? PERIODS.find(p => p.value === installmentPeriod)?.labelAr : PERIODS.find(p => p.value === installmentPeriod)?.labelEn}
                                {planType === 'deposit' && ` + ${isRTL ? 'عربون' : 'deposit'} ${fmt(Number(depositAmount) || 0)}`}
                            </p>
                        </div>

                        <Button
                            onClick={() => createScheduleMutation.mutate()}
                            disabled={createScheduleMutation.isPending || totalAmount <= 0}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            size="sm"
                        >
                            {createScheduleMutation.isPending
                                ? (isRTL ? 'جاري الإنشاء...' : 'Creating...')
                                : (isRTL ? 'إنشاء خطة الأقساط' : 'Create Installment Plan')}
                        </Button>
                    </div>
                )}

                {/* Existing Schedule Items */}
                {schedule?.items && schedule.items.length > 0 && (
                    <div className="space-y-2">
                        {/* Progress */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all"
                                    style={{ width: `${schedule.total_amount > 0 ? (schedule.paid_amount / schedule.total_amount) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                                {fmt(schedule.paid_amount)} / {fmt(schedule.total_amount)}
                            </span>
                        </div>

                        {/* Items Table */}
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-start">#</th>
                                        <th className="px-3 py-2 text-start">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                                        <th className="px-3 py-2 text-end">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                        <th className="px-3 py-2 text-end">{isRTL ? 'المدفوع' : 'Paid'}</th>
                                        <th className="px-3 py-2 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                        <th className="px-3 py-2 text-center">{isRTL ? 'إجراء' : 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.items.map(item => (
                                        <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                            <td className="px-3 py-2 font-mono">{item.installment_number}</td>
                                            <td className="px-3 py-2 font-mono">{fmtDate(item.due_date)}</td>
                                            <td className="px-3 py-2 text-end font-mono font-medium">{fmt(item.amount)}</td>
                                            <td className="px-3 py-2 text-end font-mono text-emerald-600">{fmt(item.paid_amount)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <Badge className={cn('text-[10px]', STATUS_COLORS[item.status])}>
                                                    {statusLabel(item.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {item.status !== 'paid' && item.status !== 'cancelled' && !readOnly && (
                                                    showPaymentDialog === item.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={receiptAmount}
                                                                onChange={e => setReceiptAmount(e.target.value)}
                                                                placeholder={fmt(item.amount - item.paid_amount)}
                                                                className="w-20 h-6 text-xs font-mono"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                className="h-6 px-2 text-[10px] bg-emerald-600"
                                                                onClick={() => recordPaymentMutation.mutate(item.id)}
                                                                disabled={recordPaymentMutation.isPending}
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 px-1"
                                                                onClick={() => setShowPaymentDialog(null)}
                                                            >
                                                                ✕
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 px-2 text-[10px]"
                                                            onClick={() => {
                                                                setShowPaymentDialog(item.id);
                                                                setReceiptAmount(String(item.amount - item.paid_amount));
                                                            }}
                                                        >
                                                            <CircleDollarSign className="w-3 h-3 me-1" />
                                                            {isRTL ? 'دفع' : 'Pay'}
                                                        </Button>
                                                    )
                                                )}
                                                {item.status === 'paid' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Telegram status */}
                        {schedule.telegram_reminder_enabled && (
                            <div className="flex items-center gap-2 text-[10px] text-blue-500 mt-1">
                                <Send className="w-3 h-3" />
                                {isRTL
                                    ? `تذكيرات تلغرام مفعلة — قبل ${schedule.telegram_reminder_days_before} يوم`
                                    : `Telegram reminders active — ${schedule.telegram_reminder_days_before} days before`}
                            </div>
                        )}
                    </div>
                )}

                {!schedule && !showInstallmentForm && (
                    <p className="text-xs text-gray-400 text-center py-4">
                        {isRTL ? 'لا توجد خطة أقساط — يمكنك إنشاء واحدة' : 'No installment plan — create one above'}
                    </p>
                )}
            </div>

            {/* ═══ Section 4: Payment History ═══ */}
            {paymentHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {isRTL ? 'سجل المدفوعات' : 'Payment History'}
                        <Badge variant="secondary" className="text-[10px]">{paymentHistory.length}</Badge>
                    </h3>
                    <div className="space-y-2">
                        {paymentHistory.slice(0, 10).map((ph: any, idx: number) => (
                            <div key={ph.id || idx} className="flex items-center justify-between text-xs p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{ph.receipt_number}</span>
                                    <span className="text-gray-500">{fmtDate(ph.receipt_date)}</span>
                                    <span className="capitalize text-gray-400">{ph.payment_method}</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-600">
                                    +{fmt(Number(ph.amount || 0))} {ph.currency || docCurrency}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentReceiptTab;
