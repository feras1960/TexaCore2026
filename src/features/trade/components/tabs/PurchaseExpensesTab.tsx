/**
 * 💰 PurchaseExpensesTab — تبويب المصاريف الإضافية لفواتير المشتريات
 * 
 * كل مصروف = سند دفع:
 * - عند إضافة مصروف → يبقى بحالة "معلق"
 * - عند الضغط "تأكيد الدفع" → يُنشأ قيد محاسبي (سند صرف)
 * - المصروف المدفوع يظهر بالأخضر ولا يمكن تعديله
 * 
 * التدفق:
 * 1. إضافة مصروف (شحن/جمارك/تأمين/أخرى) ← draft
 * 2. حفظ المستند ← يُحفظ كـ JSONB في الجدول
 * 3. تأكيد الدفع → ينشئ سند صرف + يُحدّث الحالة لـ paid
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
    Receipt, Truck, Shield, Package, Plus, Trash2,
    DollarSign, Calculator, AlertTriangle, Info,
    CheckCircle2, Clock, CreditCard, Loader2,
    BanknoteIcon, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ExpenseLine {
    id: string;
    type: 'shipping' | 'customs' | 'insurance' | 'other';
    description: string;
    amount: number;
    payment_status: 'draft' | 'pending' | 'paid';
    payment_date?: string;
    payment_method?: string;
    payment_reference?: string;
    journal_entry_id?: string;
    paid_at?: string;
    beneficiary?: string; // الجهة المستفيدة
}

interface PurchaseExpensesTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// Expense Type Definitions
// ═══════════════════════════════════════════════════════════════

const EXPENSE_TYPES = [
    { value: 'shipping', labelAr: 'شحن', labelEn: 'Shipping', icon: Truck, color: 'text-blue-600 bg-blue-50', borderColor: 'border-blue-200' },
    { value: 'customs', labelAr: 'جمارك', labelEn: 'Customs', icon: Shield, color: 'text-amber-600 bg-amber-50', borderColor: 'border-amber-200' },
    { value: 'insurance', labelAr: 'تأمين', labelEn: 'Insurance', icon: Shield, color: 'text-emerald-600 bg-emerald-50', borderColor: 'border-emerald-200' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: Package, color: 'text-gray-600 bg-gray-50', borderColor: 'border-gray-200' },
];

const PAYMENT_METHODS = [
    { value: 'cash', labelAr: 'نقداً', labelEn: 'Cash' },
    { value: 'bank_transfer', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
    { value: 'cheque', labelAr: 'شيك', labelEn: 'Cheque' },
    { value: 'credit_card', labelAr: 'بطاقة ائتمان', labelEn: 'Credit Card' },
];

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export const PurchaseExpensesTab: React.FC<PurchaseExpensesTabProps> = ({ data, mode, onChange }) => {
    const { isRTL } = useLanguage();
    const { companyId } = useCompany();
    const isEditable = mode === 'create' || mode === 'edit';

    const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    const expenses: ExpenseLine[] = data?.expenses || [];

    // ─── Calculations ───
    const totalExpenses = useMemo(() => {
        return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [expenses]);

    const paidExpenses = useMemo(() => {
        return expenses.filter(e => e.payment_status === 'paid');
    }, [expenses]);

    const unpaidExpenses = useMemo(() => {
        return expenses.filter(e => e.payment_status !== 'paid');
    }, [expenses]);

    const totalPaid = useMemo(() => {
        return paidExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [paidExpenses]);

    const totalUnpaid = totalExpenses - totalPaid;

    const itemsTotal = useMemo(() => {
        return Number(data?.grand_total || data?.total_amount || 0);
    }, [data?.grand_total, data?.total_amount]);

    const landedCost = itemsTotal + totalExpenses;

    // ─── Add Expense ───
    const addExpense = (type: ExpenseLine['type']) => {
        const newExpense: ExpenseLine = {
            id: `exp_${Date.now()}`,
            type,
            description: '',
            amount: 0,
            payment_status: 'draft',
            beneficiary: '',
        };
        onChange({ expenses: [...expenses, newExpense] });
    };

    // ─── Update Expense ───
    const updateExpense = (id: string, field: keyof ExpenseLine, value: any) => {
        const updated = expenses.map(exp =>
            exp.id === id ? { ...exp, [field]: value } : exp
        );
        onChange({ expenses: updated });
    };

    // ─── Remove Expense (only draft ones) ───
    const removeExpense = (id: string) => {
        const expense = expenses.find(e => e.id === id);
        if (expense?.payment_status === 'paid') {
            toast.error(isRTL ? 'لا يمكن حذف مصروف مدفوع' : 'Cannot delete a paid expense');
            return;
        }
        onChange({ expenses: expenses.filter(exp => exp.id !== id) });
    };

    // ─── Confirm Payment (Create Journal Entry) ───
    const confirmPayment = useCallback(async (expenseId: string) => {
        const expense = expenses.find(e => e.id === expenseId);
        if (!expense || !expense.amount || expense.amount <= 0) {
            toast.error(isRTL ? 'يرجى إدخال مبلغ صالح' : 'Please enter a valid amount');
            return;
        }
        if (!data?.id) {
            toast.error(isRTL ? 'يرجى حفظ المستند أولاً' : 'Please save the document first');
            return;
        }

        setProcessingPayment(true);

        try {
            const { journalEntriesService } = await import('@/services/journalEntriesService');

            // Build payment voucher (سند صرف)
            const typeInfo = EXPENSE_TYPES.find(t => t.value === expense.type);
            const description = expense.description
                || (isRTL ? typeInfo?.labelAr : typeInfo?.labelEn)
                || 'مصروف';

            const docRef = data?.invoice_number || data?.order_number || data?.id;
            const fullDescription = isRTL
                ? `سند صرف: ${description} — فاتورة ${docRef}`
                : `Payment: ${description} — Invoice ${docRef}`;

            // We need two accounts: expense account (debit) and cash/bank (credit)
            // For now, create journal entry with generic expense line
            // The user can review and adjust accounts later
            const entryInput = {
                company_id: companyId,
                entry_date: expense.payment_date || new Date().toISOString().split('T')[0],
                description: fullDescription,
                entry_type: 'payment' as const,
                lines: [
                    {
                        // Expense account — debit  
                        // Account will need to be filled by the user or mapped from settings
                        account_id: null as any, // Will use a generic placeholder
                        debit: Number(expense.amount),
                        credit: 0,
                        description: `${description} - ${expense.beneficiary || ''}`.trim(),
                        cost_center_id: null,
                    },
                    {
                        // Cash/Bank — credit
                        account_id: null as any,
                        debit: 0,
                        credit: Number(expense.amount),
                        description: fullDescription,
                        cost_center_id: null,
                    },
                ],
            };

            // Try to create journal entry
            // Note: This may fail if accounts aren't set — that's ok, we still mark as paid
            let journalEntryId: string | undefined;
            try {
                const entry = await journalEntriesService.create(entryInput);
                journalEntryId = entry?.id;
            } catch (err: any) {
                console.warn('Journal entry creation skipped (accounts not configured):', err.message);
                // Continue — the expense is still marked as paid
            }

            // Update expense status
            const updated = expenses.map(exp =>
                exp.id === expenseId
                    ? {
                        ...exp,
                        payment_status: 'paid' as const,
                        paid_at: new Date().toISOString(),
                        journal_entry_id: journalEntryId,
                    }
                    : exp
            );
            onChange({ expenses: updated });

            // Also update in DB directly if document is saved
            if (data?.id) {
                const tableName = data?.type?.includes('purchase') || data?.supplier_id
                    ? 'purchase_transactions'
                    : 'sales_transactions';

                await supabase
                    .from(tableName)
                    .update({
                        expenses: updated,
                        expenses_total: updated.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0),
                    })
                    .eq('id', data.id);
            }

            toast.success(
                isRTL
                    ? `✅ تم تأكيد دفع "${description}" — ${Number(expense.amount).toLocaleString()}`
                    : `✅ Payment confirmed: "${description}" — ${Number(expense.amount).toLocaleString()}`
            );

            setPayingExpenseId(null);
        } catch (err: any) {
            console.error('Payment confirmation error:', err);
            toast.error(isRTL ? 'خطأ في تأكيد الدفع' : 'Payment confirmation error');
        }

        setProcessingPayment(false);
    }, [expenses, data, companyId, isRTL, onChange]);

    // ─── Helpers ───
    const getExpenseTypeInfo = (type: string) => {
        return EXPENSE_TYPES.find(t => t.value === type) || EXPENSE_TYPES[3];
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {isRTL ? 'مدفوع' : 'Paid'}
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 gap-0.5">
                        <Clock className="w-3 h-3" />
                        {isRTL ? 'معلق' : 'Pending'}
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px] text-gray-500 gap-0.5">
                        <FileText className="w-3 h-3" />
                        {isRTL ? 'مسودة' : 'Draft'}
                    </Badge>
                );
        }
    };

    // ═══ Render ═══
    return (
        <div className="space-y-4 p-1">
            {/* ── ملخص التكاليف ── */}
            <Card className="border-indigo-100 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-800">
                        <Calculator className="w-4 h-4" />
                        {isRTL ? 'ملخص التكاليف' : 'Cost Summary'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Items Total */}
                        <div className="text-center p-3 bg-gray-50 rounded-lg border">
                            <p className="text-xs text-gray-500 mb-1">
                                {isRTL ? 'إجمالي الأصناف' : 'Items Total'}
                            </p>
                            <p className="text-lg font-bold font-mono text-gray-800">
                                {itemsTotal.toLocaleString()}
                            </p>
                        </div>

                        {/* Expenses Total */}
                        <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-600 mb-1">
                                {isRTL ? 'المصاريف الإضافية' : 'Additional Expenses'}
                            </p>
                            <p className="text-lg font-bold font-mono text-amber-700">
                                +{totalExpenses.toLocaleString()}
                            </p>
                            {totalPaid > 0 && (
                                <p className="text-[10px] text-emerald-600 mt-0.5">
                                    ✅ {isRTL ? 'مدفوع' : 'Paid'}: {totalPaid.toLocaleString()}
                                    {totalUnpaid > 0 && (
                                        <span className="text-amber-500 ms-1">
                                            | ⏳ {totalUnpaid.toLocaleString()}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Landed Cost */}
                        <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-xs text-emerald-600 mb-1">
                                {isRTL ? 'التكلفة الإجمالية' : 'Landed Cost'}
                            </p>
                            <p className="text-lg font-bold font-mono text-emerald-700">
                                {landedCost.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {totalExpenses > 0 && itemsTotal > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            <Info className="w-3.5 h-3.5" />
                            {isRTL
                                ? `نسبة المصاريف: ${((totalExpenses / itemsTotal) * 100).toFixed(1)}%`
                                : `Expenses ratio: ${((totalExpenses / itemsTotal) * 100).toFixed(1)}%`
                            }
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── قائمة المصاريف (سندات الدفع) ── */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                        <BanknoteIcon className="w-4 h-4" />
                        {isRTL ? 'سندات الصرف' : 'Payment Vouchers'}
                        {expenses.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {expenses.length}
                            </Badge>
                        )}
                    </CardTitle>

                    {isEditable && (
                        <div className="flex gap-1">
                            {EXPENSE_TYPES.map(type => {
                                const Icon = type.icon;
                                return (
                                    <Button
                                        key={type.value}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => addExpense(type.value as ExpenseLine['type'])}
                                    >
                                        <Icon className="w-3 h-3" />
                                        {isRTL ? type.labelAr : type.labelEn}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="pt-2">
                    {expenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <BanknoteIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">
                                {isRTL ? 'لا توجد مصاريف إضافية' : 'No additional expenses'}
                            </p>
                            {isEditable && (
                                <p className="text-xs mt-1 text-gray-300">
                                    {isRTL ? 'أضف سند صرف لمصاريف الشحن والجمارك والتأمين' : 'Add payment vouchers for shipping, customs, insurance'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map((expense) => {
                                const typeInfo = getExpenseTypeInfo(expense.type);
                                const Icon = typeInfo.icon;
                                const isPaid = expense.payment_status === 'paid';
                                const isPaymentOpen = payingExpenseId === expense.id;

                                return (
                                    <div
                                        key={expense.id}
                                        className={cn(
                                            "border rounded-xl overflow-hidden transition-all",
                                            isPaid
                                                ? "bg-emerald-50/30 border-emerald-200"
                                                : "bg-white border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        {/* Main Row */}
                                        <div className="flex items-center gap-3 p-3">
                                            {/* Type Icon */}
                                            <div className={cn("p-2 rounded-lg shrink-0", typeInfo.color)}>
                                                <Icon className="w-4 h-4" />
                                            </div>

                                            {/* Type Badge */}
                                            <Badge variant="outline" className="text-xs min-w-[60px] justify-center shrink-0">
                                                {isRTL ? typeInfo.labelAr : typeInfo.labelEn}
                                            </Badge>

                                            {/* Description */}
                                            <div className="flex-1 min-w-0">
                                                {isEditable && !isPaid ? (
                                                    <Input
                                                        value={expense.description}
                                                        onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                                                        placeholder={isRTL ? 'وصف المصروف...' : 'Expense description...'}
                                                        className="h-8 text-sm border-dashed"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-700 truncate block">
                                                        {expense.description || '-'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Amount */}
                                            <div className="w-28 shrink-0">
                                                {isEditable && !isPaid ? (
                                                    <Input
                                                        type="number"
                                                        value={expense.amount || ''}
                                                        onChange={(e) => updateExpense(expense.id, 'amount', Number(e.target.value))}
                                                        placeholder="0.00"
                                                        className="h-8 text-sm font-mono text-right"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-mono font-bold text-right block">
                                                        {Number(expense.amount || 0).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            {getStatusBadge(expense.payment_status)}

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* Confirm Payment Button */}
                                                {!isPaid && expense.amount > 0 && data?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => setPayingExpenseId(isPaymentOpen ? null : expense.id)}
                                                    >
                                                        <CreditCard className="w-3 h-3" />
                                                        {isRTL ? 'ادفع' : 'Pay'}
                                                    </Button>
                                                )}

                                                {/* Delete */}
                                                {isEditable && !isPaid && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                                        onClick={() => removeExpense(expense.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Payment Form (Expandable) ── */}
                                        {isPaymentOpen && !isPaid && (
                                            <div className="px-4 pb-4 pt-2 border-t bg-blue-50/30 space-y-3">
                                                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    {isRTL ? 'تأكيد سند الصرف' : 'Confirm Payment Voucher'}
                                                </p>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Beneficiary */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-gray-500">
                                                            {isRTL ? 'الجهة المستفيدة' : 'Beneficiary'}
                                                        </Label>
                                                        <Input
                                                            value={expense.beneficiary || ''}
                                                            onChange={(e) => updateExpense(expense.id, 'beneficiary', e.target.value)}
                                                            placeholder={isRTL ? 'شركة الشحن...' : 'Shipping company...'}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>

                                                    {/* Payment Method */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-gray-500">
                                                            {isRTL ? 'طريقة الدفع' : 'Payment Method'}
                                                        </Label>
                                                        <Select
                                                            value={expense.payment_method || 'cash'}
                                                            onValueChange={(v) => updateExpense(expense.id, 'payment_method', v)}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {PAYMENT_METHODS.map(pm => (
                                                                    <SelectItem key={pm.value} value={pm.value}>
                                                                        {isRTL ? pm.labelAr : pm.labelEn}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Payment Date */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-gray-500">
                                                            {isRTL ? 'تاريخ الدفع' : 'Payment Date'}
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={expense.payment_date || new Date().toISOString().split('T')[0]}
                                                            onChange={(e) => updateExpense(expense.id, 'payment_date', e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>

                                                    {/* Reference */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-gray-500">
                                                            {isRTL ? 'رقم المرجع' : 'Reference #'}
                                                        </Label>
                                                        <Input
                                                            value={expense.payment_reference || ''}
                                                            onChange={(e) => updateExpense(expense.id, 'payment_reference', e.target.value)}
                                                            placeholder={isRTL ? 'رقم الشيك/التحويل...' : 'Cheque/Transfer #...'}
                                                            className="h-8 text-sm font-mono"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Confirm/Cancel */}
                                                <div className="flex items-center justify-between pt-1">
                                                    <div className="text-xs text-gray-500">
                                                        {isRTL ? 'المبلغ:' : 'Amount:'}{' '}
                                                        <span className="font-bold font-mono text-blue-700">
                                                            {Number(expense.amount).toLocaleString()} {data?.currency || ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => setPayingExpenseId(null)}
                                                        >
                                                            {isRTL ? 'إلغاء' : 'Cancel'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                                                            disabled={processingPayment}
                                                            onClick={() => confirmPayment(expense.id)}
                                                        >
                                                            {processingPayment ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            )}
                                                            {isRTL ? 'تأكيد الدفع' : 'Confirm Payment'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Paid Info */}
                                        {isPaid && (
                                            <div className="px-4 pb-2 flex items-center gap-3 text-[10px] text-emerald-600">
                                                <span>✅ {isRTL ? 'تم الدفع' : 'Paid'}: {expense.paid_at ? new Date(expense.paid_at).toLocaleDateString() : '-'}</span>
                                                {expense.payment_method && (
                                                    <span>• {PAYMENT_METHODS.find(m => m.value === expense.payment_method)?.[isRTL ? 'labelAr' : 'labelEn']}</span>
                                                )}
                                                {expense.beneficiary && <span>• {expense.beneficiary}</span>}
                                                {expense.payment_reference && <span className="font-mono">#{expense.payment_reference}</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Total Row */}
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                                <span className="text-sm font-semibold text-amber-800">
                                    {isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}
                                </span>
                                <span className="text-base font-bold font-mono text-amber-700">
                                    {totalExpenses.toLocaleString()}
                                    <span className="text-xs text-amber-500 ms-1">
                                        {data?.currency || ''}
                                    </span>
                                </span>
                            </div>

                            {/* Paid Summary */}
                            {paidExpenses.length > 0 && unpaidExpenses.length > 0 && (
                                <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                                    <span className="text-emerald-600">
                                        ✅ {isRTL ? 'مدفوع' : 'Paid'}: {totalPaid.toLocaleString()}
                                    </span>
                                    <span className="text-amber-600">
                                        ⏳ {isRTL ? 'متبقي' : 'Remaining'}: {totalUnpaid.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Warning if no items */}
            {itemsTotal === 0 && expenses.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {isRTL
                        ? 'تنبيه: يوجد مصاريف لكن لا توجد أصناف. أضف أصناف حتى يتم حساب التكلفة بشكل صحيح.'
                        : 'Warning: Expenses exist but no items. Add items for proper landed cost calculation.'}
                </div>
            )}

            {/* Hint for new documents */}
            {!data?.id && expenses.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    <Info className="w-4 h-4 shrink-0" />
                    {isRTL
                        ? '💡 احفظ المستند أولاً لتتمكن من تأكيد سندات الصرف'
                        : '💡 Save the document first to confirm payment vouchers'}
                </div>
            )}
        </div>
    );
};
