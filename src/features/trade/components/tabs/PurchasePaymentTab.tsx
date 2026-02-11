/**
 * 💳 PurchasePaymentTab — سند الصرف + المصاريف + القيد المحاسبي
 * Combined Payment Voucher + Expenses + Journal Preview Tab
 * 
 * Modeled after PaymentReceiptTab (sales) but adapted for purchases:
 * - Payment voucher form (amount, treasury, method) → سند صرف
 * - Additional expenses (shipping, customs, insurance, other) 
 * - Each expense can be paid via a payment voucher
 * - Journal entry preview (debit/credit) for purchase invoice
 * - Payment history from payment_vouchers table
 * 
 * Data flow:
 *   expenses[] stored in purchase_invoices.expenses (JSONB)
 *   Payments stored in payment_vouchers table (linked by purchase_invoice_id)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    CreditCard, Banknote, Building2, Wallet,
    CheckCircle2, Clock, Plus, Trash2,
    Receipt, BookOpen, ChevronDown, ChevronUp,
    CircleDollarSign, FileText, Truck, Shield,
    Package, AlertTriangle, DollarSign, Calculator,
    Loader2
} from 'lucide-react';
import {
    paymentScheduleService,
    type TreasuryAccount,
    type PaymentMethod,
    type JournalPreviewLine,
} from '@/services/paymentScheduleService';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface ExpenseLine {
    id: string;
    type: 'shipping' | 'customs' | 'insurance' | 'other';
    description: string;
    amount: number;
    currency?: string;
    beneficiary: string;
    payment_status: 'draft' | 'pending' | 'paid';
    payment_method?: string;
    payment_date?: string;
    payment_reference?: string;
    treasury_account_id?: string;
    journal_entry_id?: string;
    paid_at?: string;
}

interface PurchasePaymentTabProps {
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
];

const EXPENSE_TYPES = [
    { value: 'shipping', labelAr: 'شحن', labelEn: 'Shipping', icon: <Truck className="w-4 h-4" />, color: 'text-blue-600' },
    { value: 'customs', labelAr: 'جمارك', labelEn: 'Customs', icon: <Shield className="w-4 h-4" />, color: 'text-red-600' },
    { value: 'insurance', labelAr: 'تأمين', labelEn: 'Insurance', icon: <Shield className="w-4 h-4" />, color: 'text-amber-600' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: <Package className="w-4 h-4" />, color: 'text-gray-600' },
];

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export const PurchasePaymentTab: React.FC<PurchasePaymentTabProps> = ({ data, mode, onChange }) => {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const { companyId } = useCompany();
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const queryClient = useQueryClient();
    const readOnly = mode === 'view';

    // ─── State ─────────────────────────────
    const [journalExpanded, setJournalExpanded] = useState(true);
    const [expenseFormExpanded, setExpenseFormExpanded] = useState(false);
    const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    // Quick payment form
    const [voucherAmount, setVoucherAmount] = useState('');
    const [voucherMethod, setVoucherMethod] = useState<PaymentMethod>('bank_transfer');
    const [voucherTreasury, setVoucherTreasury] = useState('');
    const [voucherNotes, setVoucherNotes] = useState('');

    // ─── Derived values ───────────────────
    const docCurrency = data?.currency || companyCurrency || 'USD';
    const totalAmount = Number(data?.grand_total || data?.total_amount || 0);
    const paidAmount = Number(data?.paid_amount || 0);
    const balanceDue = totalAmount - paidAmount;
    const supplierName = isRTL
        ? (data?.supplier_name_ar || data?.party_name || data?.supplier_name)
        : (data?.supplier_name_en || data?.party_name || data?.supplier_name);

    // Expenses from data
    const expenses: ExpenseLine[] = useMemo(() => data?.expenses || [], [data?.expenses]);

    const totalExpenses = useMemo(() =>
        expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0),
        [expenses]
    );
    const paidExpenses = useMemo(() =>
        expenses.filter(e => e.payment_status === 'paid')
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0),
        [expenses]
    );
    const unpaidExpenses = totalExpenses - paidExpenses;
    const landedCost = totalAmount + totalExpenses;

    // Document IDs
    const docId = data?.id;
    const invoiceNumber = data?.invoice_number || data?.reference_number || '';

    // ─── Queries ──────────────────────────
    const { data: treasuryAccounts = [] } = useQuery({
        queryKey: ['treasury_accounts', companyId],
        queryFn: () => paymentScheduleService.getTreasuryAccounts(companyId!),
        enabled: !!companyId,
        staleTime: 60000,
    });

    // Payment history from payment_vouchers
    const { data: paymentHistory = [], refetch: refetchHistory } = useQuery({
        queryKey: ['purchase_payment_history', docId],
        queryFn: async () => {
            if (!docId) return [];
            const { data: vouchers, error } = await supabase
                .from('payment_vouchers')
                .select('id, voucher_number, voucher_date, amount, currency, payment_method, status, notes, treasury_account_id')
                .eq('purchase_invoice_id', docId)
                .order('created_at', { ascending: false });
            if (error) { console.warn('Payment history error:', error); return []; }
            return vouchers || [];
        },
        enabled: !!docId,
    });

    // ─── Journal Preview ─────────────────
    const journalLines = useMemo<JournalPreviewLine[]>(() => {
        const lines: JournalPreviewLine[] = [];

        if (totalAmount > 0) {
            // Purchase invoice journal entry:
            // Debit: Inventory / Purchases (مشتريات)
            lines.push({
                account_name: isRTL ? 'المشتريات / المخزون' : 'Purchases / Inventory',
                account_code: '5100',
                debit: totalAmount,
                credit: 0,
                description: isRTL
                    ? `فاتورة شراء ${invoiceNumber} — ${supplierName || ''}`
                    : `Purchase Invoice ${invoiceNumber} — ${supplierName || ''}`,
            });
            // Credit: Accounts Payable (ذمم دائنة — موردين)
            lines.push({
                account_name: isRTL ? 'ذمم دائنة — موردين' : 'Accounts Payable',
                account_code: '2100',
                debit: 0,
                credit: totalAmount,
                description: isRTL
                    ? `مستحقات مورد ${supplierName || ''}`
                    : `Supplier payable ${supplierName || ''}`,
            });
        }

        // Expenses journal lines
        expenses.filter(e => e.payment_status === 'paid' && Number(e.amount) > 0).forEach(exp => {
            const typeInfo = EXPENSE_TYPES.find(t => t.value === exp.type);
            const label = exp.description || (isRTL ? typeInfo?.labelAr : typeInfo?.labelEn) || '';
            lines.push({
                account_name: isRTL ? `مصاريف ${typeInfo?.labelAr || 'أخرى'}` : `${typeInfo?.labelEn || 'Other'} Expense`,
                account_code: exp.type === 'shipping' ? '5210' : exp.type === 'customs' ? '5220' : exp.type === 'insurance' ? '5230' : '5290',
                debit: Number(exp.amount),
                credit: 0,
                description: label,
            });
            lines.push({
                account_name: isRTL ? 'الصندوق / البنك' : 'Cash / Bank',
                account_code: '1100',
                debit: 0,
                credit: Number(exp.amount),
                description: isRTL ? `دفع ${label}` : `Payment: ${label}`,
            });
        });

        if (paidAmount > 0) {
            // Payment journal
            lines.push({
                account_name: isRTL ? 'ذمم دائنة — موردين' : 'Accounts Payable',
                account_code: '2100',
                debit: paidAmount,
                credit: 0,
                description: isRTL
                    ? `سداد فاتورة ${invoiceNumber}`
                    : `Payment on Invoice ${invoiceNumber}`,
            });
            lines.push({
                account_name: isRTL ? 'الصندوق / البنك' : 'Cash / Bank',
                account_code: '1100',
                debit: 0,
                credit: paidAmount,
                description: isRTL
                    ? `دفعة للمورد ${supplierName || ''}`
                    : `Payment to ${supplierName || 'supplier'}`,
            });
        }

        return lines;
    }, [totalAmount, paidAmount, expenses, invoiceNumber, supplierName, isRTL]);

    // ─── Direct Payment Voucher (to supplier) ────
    const directVoucherMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company');
            if (!docId) throw new Error(isRTL ? 'يرجى حفظ المستند أولاً' : 'Please save the document first');

            const { getCurrentTenantIdAsync: getTenantId } = await import('@/lib/supabase');
            const tenantId = await getTenantId();

            const { data: result, error } = await supabase.from('payment_vouchers').insert({
                tenant_id: tenantId,
                company_id: companyId,
                voucher_number: `PV-${Date.now().toString().slice(-8)}`,
                voucher_date: new Date().toISOString().split('T')[0],
                supplier_id: data?.party_id || data?.supplier_id,
                amount: Number(voucherAmount),
                currency: docCurrency,
                payment_method: voucherMethod,
                status: 'confirmed',
                notes: voucherNotes || `${isRTL ? 'دفعة على فاتورة' : 'Payment on invoice'} ${invoiceNumber}`,
                treasury_account_id: voucherTreasury || null,
                purchase_invoice_id: docId,
            }).select('id').single();

            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            toast.success(isRTL ? '✅ تم إنشاء سند الصرف' : '✅ Payment voucher created');
            setVoucherAmount('');
            setVoucherNotes('');
            refetchHistory();
            queryClient.invalidateQueries({ queryKey: ['purchase_payment_history'] });
        },
        onError: (err: any) => {
            toast.error(err.message || (isRTL ? 'خطأ في إنشاء سند الصرف' : 'Error creating payment voucher'));
        },
    });

    // ─── Expense Management ──────────────
    const addExpense = useCallback((type: ExpenseLine['type']) => {
        const newExpense: ExpenseLine = {
            id: `exp_${Date.now()}`,
            type,
            description: '',
            amount: 0,
            beneficiary: '',
            payment_status: 'draft',
        };
        onChange({ expenses: [...expenses, newExpense] });
    }, [expenses, onChange]);

    const updateExpense = useCallback((id: string, field: keyof ExpenseLine, value: any) => {
        const updated = expenses.map(exp =>
            exp.id === id ? { ...exp, [field]: value } : exp
        );
        onChange({ expenses: updated });
    }, [expenses, onChange]);

    const removeExpense = useCallback((id: string) => {
        const expense = expenses.find(e => e.id === id);
        if (expense?.payment_status === 'paid') {
            toast.error(isRTL ? 'لا يمكن حذف مصروف مدفوع' : 'Cannot delete a paid expense');
            return;
        }
        onChange({ expenses: expenses.filter(exp => exp.id !== id) });
    }, [expenses, onChange, isRTL]);

    // ─── Pay Expense ─────────────────────
    const confirmExpensePayment = useCallback(async (expenseId: string) => {
        const expense = expenses.find(e => e.id === expenseId);
        if (!expense || !expense.amount || expense.amount <= 0) {
            toast.error(isRTL ? 'يرجى إدخال مبلغ صالح' : 'Please enter a valid amount');
            return;
        }
        if (!docId) {
            toast.error(isRTL ? 'يرجى حفظ المستند أولاً' : 'Please save the document first');
            return;
        }

        setProcessingPayment(true);
        try {
            // Create payment voucher for this expense
            const { getCurrentTenantIdAsync: getTenantId } = await import('@/lib/supabase');
            const tenantId = await getTenantId();
            const typeInfo = EXPENSE_TYPES.find(t => t.value === expense.type);
            const desc = expense.description || (isRTL ? typeInfo?.labelAr : typeInfo?.labelEn) || '';

            const { data: pv, error: pvError } = await supabase.from('payment_vouchers').insert({
                tenant_id: tenantId,
                company_id: companyId,
                voucher_number: `PV-EXP-${Date.now().toString().slice(-8)}`,
                voucher_date: expense.payment_date || new Date().toISOString().split('T')[0],
                supplier_id: data?.party_id || data?.supplier_id,
                amount: Number(expense.amount),
                currency: docCurrency,
                payment_method: expense.payment_method || 'cash',
                status: 'confirmed',
                notes: `${isRTL ? 'مصروف' : 'Expense'}: ${desc} — ${isRTL ? 'فاتورة' : 'Invoice'} ${invoiceNumber}`,
                treasury_account_id: expense.treasury_account_id || null,
                purchase_invoice_id: docId,
            }).select('id').single();

            if (pvError) throw pvError;

            // Update expense status
            const updated = expenses.map(exp =>
                exp.id === expenseId
                    ? {
                        ...exp,
                        payment_status: 'paid' as const,
                        paid_at: new Date().toISOString(),
                        journal_entry_id: pv?.id,
                    }
                    : exp
            );
            onChange({ expenses: updated });

            // Also update in DB directly
            if (docId) {
                await supabase
                    .from('purchase_invoices')
                    .update({
                        expenses: updated,
                        expenses_total: updated.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0),
                    })
                    .eq('id', docId);
            }

            toast.success(
                isRTL
                    ? `✅ تم دفع "${desc}" — ${Number(expense.amount).toLocaleString()} ${docCurrency}`
                    : `✅ Paid: "${desc}" — ${Number(expense.amount).toLocaleString()} ${docCurrency}`
            );

            setPayingExpenseId(null);
            refetchHistory();
        } catch (err: any) {
            console.error('Expense payment error:', err);
            toast.error(isRTL ? 'خطأ في تسجيل الدفع' : 'Payment error');
        }
        setProcessingPayment(false);
    }, [expenses, data, docId, companyId, docCurrency, isRTL, onChange, invoiceNumber, refetchHistory]);

    // ─── Format helpers ───────────────────
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-';

    const getExpenseTypeInfo = (type: string) => EXPENSE_TYPES.find(t => t.value === type);
    const getStatusLabel = (status: string) => {
        const map: Record<string, { ar: string; en: string }> = {
            draft: { ar: 'مسودة', en: 'Draft' },
            pending: { ar: 'معلق', en: 'Pending' },
            paid: { ar: 'مدفوع', en: 'Paid' },
            partial: { ar: 'جزئي', en: 'Partial' },
            confirmed: { ar: 'مؤكد', en: 'Confirmed' },
        };
        return isRTL ? map[status]?.ar || status : map[status]?.en || status;
    };

    // ═══════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════

    return (
        <div className="space-y-4 p-3 overflow-y-auto max-h-[calc(100vh-280px)]" dir={direction}>

            {/* ═══ Section 1: Payment Summary ═══ */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 rounded-xl p-4 border border-teal-100 dark:border-teal-800/40">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        {isRTL ? 'ملخص المدفوعات' : 'Payment Summary'}
                    </h3>
                    <Badge className={cn('text-xs',
                        paidAmount >= totalAmount ? STATUS_COLORS.paid :
                            paidAmount > 0 ? STATUS_COLORS.partial : STATUS_COLORS.pending
                    )}>
                        {paidAmount >= totalAmount
                            ? (isRTL ? 'مدفوع بالكامل' : 'Fully Paid')
                            : paidAmount > 0
                                ? (isRTL ? 'مدفوع جزئياً' : 'Partial')
                                : (isRTL ? 'غير مدفوع' : 'Unpaid')}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {/* Invoice Total */}
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'إجمالي الفاتورة' : 'Invoice Total'}</p>
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">{fmt(totalAmount)}</p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    {/* Expenses */}
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'المصاريف الإضافية' : 'Expenses'}</p>
                        <p className={cn('text-lg font-bold font-mono', totalExpenses > 0 ? 'text-amber-600' : 'text-gray-400')}>{fmt(totalExpenses)}</p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    {/* Landed Cost */}
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'التكلفة الإجمالية' : 'Landed Cost'}</p>
                        <p className="text-lg font-bold font-mono text-indigo-600">{fmt(landedCost)}</p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    {/* Paid */}
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'المدفوع' : 'Paid'}</p>
                        <p className="text-lg font-bold font-mono text-emerald-600">{fmt(paidAmount + paidExpenses)}</p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                    </div>
                    {/* Balance */}
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-1">{isRTL ? 'المتبقي' : 'Remaining'}</p>
                        <p className={cn('text-lg font-bold font-mono',
                            (balanceDue + unpaidExpenses) > 0 ? 'text-red-600' : 'text-emerald-600'
                        )}>
                            {fmt(balanceDue + unpaidExpenses)}
                        </p>
                        <p className="text-[10px] text-gray-400">{docCurrency}</p>
                        {/* Progress bar */}
                        {landedCost > 0 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                                <div
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min(((paidAmount + paidExpenses) / landedCost) * 100, 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Section 2: Payment Voucher / سند صرف ═══ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                    <Banknote className="w-4 h-4 text-teal-600" />
                    {isRTL ? 'سند صرف / دفعة للمورد' : 'Payment Voucher'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Amount */}
                    <div>
                        <Label className="text-xs mb-1 block">{isRTL ? 'المبلغ' : 'Amount'}</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="0.01"
                                value={voucherAmount}
                                onChange={e => setVoucherAmount(e.target.value)}
                                placeholder={fmt(balanceDue > 0 ? balanceDue : 0)}
                                className="font-mono pe-12"
                                disabled={readOnly}
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{docCurrency}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <Label className="text-xs mb-1 block">{isRTL ? 'طريقة الدفع' : 'Method'}</Label>
                        <Select value={voucherMethod} onValueChange={v => setVoucherMethod(v as PaymentMethod)} disabled={readOnly}>
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
                        <Select value={voucherTreasury} onValueChange={setVoucherTreasury} disabled={readOnly}>
                            <SelectTrigger>
                                <SelectValue placeholder={isRTL ? 'اختر المستودع...' : 'Select treasury...'} />
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
                            onClick={() => directVoucherMutation.mutate()}
                            disabled={readOnly || !voucherAmount || Number(voucherAmount) <= 0 || !docId || directVoucherMutation.isPending}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                            size="sm"
                        >
                            {directVoucherMutation.isPending
                                ? <Loader2 className="w-4 h-4 animate-spin me-1" />
                                : <CheckCircle2 className="w-4 h-4 me-1" />}
                            {isRTL ? 'تسجيل سند صرف' : 'Record Voucher'}
                        </Button>
                    </div>
                </div>

                {/* Notes */}
                <div className="mt-2">
                    <Input
                        value={voucherNotes}
                        onChange={e => setVoucherNotes(e.target.value)}
                        placeholder={isRTL ? 'ملاحظات الدفعة...' : 'Payment notes...'}
                        className="text-xs"
                        disabled={readOnly}
                    />
                </div>

                {!docId && !readOnly && (
                    <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {isRTL ? 'يرجى حفظ الفاتورة أولاً قبل تسجيل الدفع' : 'Please save the invoice first before recording payments'}
                    </p>
                )}
            </div>

            {/* ═══ Section 3: Expenses (مصاريف إضافية) ═══ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        {isRTL ? 'مصاريف إضافية على الفاتورة' : 'Additional Expenses'}
                        {expenses.length > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{expenses.length}</Badge>
                        )}
                    </h3>
                    {!readOnly && (
                        <div className="flex items-center gap-1">
                            {EXPENSE_TYPES.map(type => (
                                <Button
                                    key={type.value}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={() => addExpense(type.value as ExpenseLine['type'])}
                                >
                                    {type.icon}
                                    <span className="ms-1">{isRTL ? type.labelAr : type.labelEn}</span>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expense Items */}
                {expenses.length > 0 ? (
                    <div className="space-y-2">
                        {expenses.map((expense) => {
                            const typeInfo = getExpenseTypeInfo(expense.type);
                            const isPaying = payingExpenseId === expense.id;
                            const isPaid = expense.payment_status === 'paid';

                            return (
                                <div
                                    key={expense.id}
                                    className={cn(
                                        'rounded-lg border p-3 transition-all',
                                        isPaid
                                            ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40'
                                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Type Icon */}
                                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 border', typeInfo?.color)}>
                                            {typeInfo?.icon}
                                        </div>

                                        {/* Description */}
                                        <div className="flex-1 min-w-0">
                                            {!isPaid && !readOnly ? (
                                                <Input
                                                    value={expense.description}
                                                    onChange={e => updateExpense(expense.id, 'description', e.target.value)}
                                                    placeholder={isRTL ? `وصف ${typeInfo?.labelAr || 'المصروف'}...` : `${typeInfo?.labelEn || 'Expense'} description...`}
                                                    className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                                                />
                                            ) : (
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {expense.description || (isRTL ? typeInfo?.labelAr : typeInfo?.labelEn)}
                                                </p>
                                            )}
                                            {expense.beneficiary && (
                                                <p className="text-[10px] text-gray-500">{isRTL ? 'المستفيد:' : 'To:'} {expense.beneficiary}</p>
                                            )}
                                        </div>

                                        {/* Amount */}
                                        <div className="w-28">
                                            {!isPaid && !readOnly ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={expense.amount || ''}
                                                    onChange={e => updateExpense(expense.id, 'amount', Number(e.target.value))}
                                                    placeholder="0.00"
                                                    className="h-7 text-xs font-mono text-end"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold font-mono text-end text-gray-900 dark:text-white">
                                                    {fmt(Number(expense.amount))}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        <Badge className={cn('text-[10px] min-w-[60px] justify-center', STATUS_COLORS[expense.payment_status])}>
                                            {isPaid ? <CheckCircle2 className="w-3 h-3 me-1" /> : <Clock className="w-3 h-3 me-1" />}
                                            {getStatusLabel(expense.payment_status)}
                                        </Badge>

                                        {/* Actions */}
                                        {!readOnly && !isPaid && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-[10px] text-teal-600 border-teal-300 hover:bg-teal-50"
                                                    onClick={() => setPayingExpenseId(isPaying ? null : expense.id)}
                                                    disabled={!expense.amount || expense.amount <= 0}
                                                >
                                                    <CircleDollarSign className="w-3 h-3 me-1" />
                                                    {isRTL ? 'ادفع' : 'Pay'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                                    onClick={() => removeExpense(expense.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                        {isPaid && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </div>

                                    {/* Payment form (expanded) */}
                                    {isPaying && !isPaid && !readOnly && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div>
                                                <Label className="text-[10px] mb-1 block">{isRTL ? 'المستفيد' : 'Beneficiary'}</Label>
                                                <Input
                                                    value={expense.beneficiary || ''}
                                                    onChange={e => updateExpense(expense.id, 'beneficiary', e.target.value)}
                                                    className="h-7 text-xs"
                                                    placeholder={isRTL ? 'اسم الجهة...' : 'Name...'}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] mb-1 block">{isRTL ? 'طريقة الدفع' : 'Method'}</Label>
                                                <Select
                                                    value={expense.payment_method || 'cash'}
                                                    onValueChange={v => updateExpense(expense.id, 'payment_method', v)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {PAYMENT_METHODS.map(m => (
                                                            <SelectItem key={m.value} value={m.value}>
                                                                <span className="flex items-center gap-1 text-xs">{m.icon} {isRTL ? m.labelAr : m.labelEn}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] mb-1 block">{isRTL ? 'الصندوق / البنك' : 'Treasury'}</Label>
                                                <Select
                                                    value={expense.treasury_account_id || ''}
                                                    onValueChange={v => updateExpense(expense.id, 'treasury_account_id', v)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {treasuryAccounts.map(acc => (
                                                            <SelectItem key={acc.id} value={acc.id}>
                                                                <span className="text-xs">{acc.account_code} — {isRTL ? acc.name_ar : (acc.name_en || acc.name_ar)}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    onClick={() => confirmExpensePayment(expense.id)}
                                                    disabled={processingPayment}
                                                    className="w-full h-7 bg-teal-600 hover:bg-teal-700 text-white text-xs"
                                                    size="sm"
                                                >
                                                    {processingPayment
                                                        ? <Loader2 className="w-3 h-3 animate-spin me-1" />
                                                        : <CheckCircle2 className="w-3 h-3 me-1" />}
                                                    {isRTL ? 'تأكيد الدفع' : 'Confirm'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Expense Totals */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                    <Calculator className="w-3 h-3 inline me-1" />
                                    {isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}: <span className="font-mono font-bold text-gray-800 dark:text-white">{fmt(totalExpenses)}</span>
                                </span>
                                <span>
                                    {isRTL ? 'مدفوع' : 'Paid'}: <span className="font-mono text-emerald-600">{fmt(paidExpenses)}</span>
                                </span>
                                {unpaidExpenses > 0 && (
                                    <span>
                                        {isRTL ? 'متبقي' : 'Remaining'}: <span className="font-mono text-red-600">{fmt(unpaidExpenses)}</span>
                                    </span>
                                )}
                            </div>
                            {totalExpenses > 0 && totalAmount > 0 && (
                                <span className="text-[10px] text-gray-400">
                                    {isRTL ? 'نسبة المصاريف' : 'Expense %'}: {((totalExpenses / totalAmount) * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">{isRTL ? 'لا توجد مصاريف إضافية — أضف من الأزرار أعلاه' : 'No additional expenses — add using buttons above'}</p>
                    </div>
                )}
            </div>

            {/* ═══ Section 4: Payment History ═══ */}
            {paymentHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {isRTL ? 'سجل سندات الصرف' : 'Payment Voucher History'}
                        <Badge variant="secondary" className="text-[10px]">{paymentHistory.length}</Badge>
                    </h3>
                    <div className="space-y-2">
                        {paymentHistory.map((ph: any, idx: number) => (
                            <div key={ph.id || idx} className="flex items-center justify-between text-xs p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-teal-600 dark:text-teal-400">{ph.voucher_number}</span>
                                    <span className="text-gray-500">{fmtDate(ph.voucher_date)}</span>
                                    <Badge className={cn('text-[10px]', STATUS_COLORS[ph.status] || STATUS_COLORS.paid)}>
                                        {getStatusLabel(ph.status)}
                                    </Badge>
                                    {ph.payment_method && (
                                        <span className="capitalize text-gray-400">{ph.payment_method}</span>
                                    )}
                                </div>
                                <span className="font-mono font-bold text-red-600">
                                    -{fmt(Number(ph.amount || 0))} {ph.currency || docCurrency}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Section 5: Journal Entry Preview ═══ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <button
                    onClick={() => setJournalExpanded(!journalExpanded)}
                    className="flex items-center justify-between w-full text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                    <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        {isRTL ? 'معاينة القيد المحاسبي' : 'Journal Entry Preview'}
                    </span>
                    {journalExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {journalExpanded && journalLines.length > 0 && (
                    <div className="mt-3">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-amber-50 dark:bg-amber-900/20">
                                    <tr>
                                        <th className="px-3 py-2 text-start">{isRTL ? 'الحساب' : 'Account'}</th>
                                        <th className="px-3 py-2 text-start">{isRTL ? 'البيان' : 'Description'}</th>
                                        <th className="px-3 py-2 text-end">{isRTL ? 'مدين' : 'Debit'}</th>
                                        <th className="px-3 py-2 text-end">{isRTL ? 'دائن' : 'Credit'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {journalLines.map((line, idx) => (
                                        <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                                            <td className="px-3 py-2">
                                                <span className="font-mono text-gray-500 me-1">{line.account_code}</span>
                                                <span className="font-medium">{line.account_name}</span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">{line.description}</td>
                                            <td className="px-3 py-2 text-end font-mono font-medium text-red-600">
                                                {line.debit > 0 ? fmt(line.debit) : ''}
                                            </td>
                                            <td className="px-3 py-2 text-end font-mono font-medium text-emerald-600">
                                                {line.credit > 0 ? fmt(line.credit) : ''}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals */}
                                    <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-bold">
                                        <td colSpan={2} className="px-3 py-2 text-end">{isRTL ? 'الإجمالي' : 'Total'}</td>
                                        <td className="px-3 py-2 text-end font-mono text-red-600">
                                            {fmt(journalLines.reduce((s, l) => s + l.debit, 0))}
                                        </td>
                                        <td className="px-3 py-2 text-end font-mono text-emerald-600">
                                            {fmt(journalLines.reduce((s, l) => s + l.credit, 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 text-center">
                            {isRTL
                                ? '⚠️ هذه معاينة تقريبية — القيد الفعلي يُنشأ عند تأكيد الدفع'
                                : '⚠️ Preview only — actual entries created on payment confirmation'}
                        </p>
                    </div>
                )}

                {journalExpanded && journalLines.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4 mt-2">
                        {isRTL ? 'لا يوجد قيد — أدخل مبلغ الفاتورة أولاً' : 'No entry — enter invoice amount first'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default PurchasePaymentTab;
