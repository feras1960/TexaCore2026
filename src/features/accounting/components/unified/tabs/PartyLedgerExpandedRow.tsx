/**
 * PartyLedgerExpandedRow — السطر المنفتح في كشف حساب الجهة
 * 
 * يعرض بنود المستند الأصلي (فاتورة/سند قبض/سند صرف) بدلاً من القيد المحاسبي
 * لأن العميل أو المورد يحتاج رؤية محتوى الفاتورة للمطابقة وليس بنود القيد
 * 
 * ✅ يعرض الكمية المسلّمة (delivered_qty) بدلاً من الكمية الأصلية (quantity)
 * ✅ يعرض حالة الدفع (مدفوعة/جزئي/غير مدفوعة) 
 * ✅ يعرض تفاصيل سندات القبض/الصرف مع ربط بالفاتورة
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn, formatNumber } from '@/lib/utils';
import { Loader2, ExternalLink, CreditCard, ArrowRightLeft, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ExtendedLedgerEntry } from '../hooks/useLedgerData';

// ═══ Entry Type Config ═══
const ENTRY_TYPE_CONFIG: Record<string, { icon: string; label_ar: string; label_en: string; color: string }> = {
    invoice: { icon: '🧾', label_ar: 'فاتورة', label_en: 'Invoice', color: 'amber' },
    payment: { icon: '💸', label_ar: 'سند صرف', label_en: 'Payment', color: 'red' },
    receipt: { icon: '💰', label_ar: 'سند قبض', label_en: 'Receipt', color: 'emerald' },
    transfer: { icon: '🔄', label_ar: 'تحويل', label_en: 'Transfer', color: 'blue' },
    journal: { icon: '📋', label_ar: 'قيد يومية', label_en: 'Journal Entry', color: 'gray' },
};

// ═══ Invoice Item ═══
interface InvoiceItem {
    id: string;
    lineNumber: number;
    description: string;
    descriptionAr: string;
    itemCode: string;
    quantity: number;         // الكمية الأصلية (المطلوبة)
    deliveredQty: number;     // الكمية المسلّمة فعلياً
    unitPrice: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    subtotal: number;
    total: number;
    unit: string;
    colorName?: string;
    rollsCount?: number;
}

// ═══ Payment Detail ═══
interface PaymentDetail {
    id: string;
    transactionNumber: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    partyName: string;
    description: string;
    checkNumber?: string;
    checkDate?: string;
    referenceNumber?: string;
    contraAccountName?: string;
    // linked invoice info
    linkedInvoiceNo?: string;
    linkedInvoiceId?: string;
}

// ═══ Invoice Summary ═══
interface InvoiceSummary {
    invoice_no: string;
    total_amount: number;
    tax_amount: number;
    discount_amount: number;
    paid_amount: number;
    balance: number;
    currency: string;
    stage: string;
    notes?: string;
}

// ═══ Payment Status ═══
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

function getPaymentStatus(totalAmount: number, paidAmount: number): PaymentStatus {
    if (paidAmount >= totalAmount && totalAmount > 0) return 'paid';
    if (paidAmount > 0 && paidAmount < totalAmount) return 'partial';
    return 'unpaid';
}

function PaymentStatusBadge({ status, isRTL }: { status: PaymentStatus; isRTL: boolean }) {
    const config = {
        paid: {
            label_ar: 'مدفوعة',
            label_en: 'Paid',
            icon: <CheckCircle2 className="w-3 h-3" />,
            className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        },
        partial: {
            label_ar: 'مدفوعة جزئياً',
            label_en: 'Partially Paid',
            icon: <Clock className="w-3 h-3" />,
            className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        },
        unpaid: {
            label_ar: 'غير مدفوعة',
            label_en: 'Unpaid',
            icon: <AlertCircle className="w-3 h-3" />,
            className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
    };

    const c = config[status];
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", c.className)}>
            {c.icon}
            {isRTL ? c.label_ar : c.label_en}
        </span>
    );
}

interface PartyLedgerExpandedRowProps {
    entry: ExtendedLedgerEntry;
    currency: string;
    onOpenEntry?: (entry: ExtendedLedgerEntry) => void;
}

export function PartyLedgerExpandedRow({
    entry,
    currency,
    onOpenEntry,
}: PartyLedgerExpandedRowProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [paymentDetail, setPaymentDetail] = useState<PaymentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);

    // Entry type info
    const typeConfig = ENTRY_TYPE_CONFIG[entry.type] || ENTRY_TYPE_CONFIG.journal;

    // ═══ Fetch document details on mount ═══
    useEffect(() => {
        let cancelled = false;

        const loadDetails = async () => {
            setLoading(true);
            setError(null);

            try {
                const refType = entry.referenceType || '';
                let refId = entry.referenceId;
                const desc = entry.description || '';

                // ═══ Detect invoice type ═══
                const isPurchaseHint = refType.includes('purchase')
                    || desc.includes('مشتريات') || desc.includes('PI-') || desc.includes('purchase');

                // Helper: safe query wrapper for Promise.all
                const safeQuery = async (query: PromiseLike<any>) => {
                    try { return await query; } catch { return { data: null, error: true }; }
                };

                // ═══ If referenceId is missing, try reverse lookup (parallel) ═══
                if (entry.type === 'invoice' && !refId && entry.entryId) {
                    if (isPurchaseHint) {
                        const [piResult, ptResult] = await Promise.all([
                            safeQuery(supabase.from('purchase_invoices').select('id').eq('journal_entry_id', entry.entryId).maybeSingle()),
                            safeQuery(supabase.from('purchase_transactions').select('id').eq('journal_entry_id', entry.entryId).maybeSingle()),
                        ]);
                        refId = piResult?.data?.id || ptResult?.data?.id || undefined;
                    } else {
                        const stResult = await safeQuery(supabase.from('sales_transactions').select('id').eq('journal_entry_id', entry.entryId).maybeSingle());
                        refId = stResult?.data?.id || undefined;
                    }
                }

                if (entry.type === 'invoice' && refId) {
                    let items: any[] | null = null;
                    let summaryData: any = null;

                    if (isPurchaseHint) {
                        // ═══ PURCHASE INVOICE: Fetch items + summary in parallel ═══
                        const [itemsResult, summaryResult] = await Promise.all([
                            safeQuery(supabase.from('purchase_invoice_items').select('*').eq('invoice_id', refId)),
                            safeQuery(supabase.from('purchase_invoices').select('*').eq('id', refId).maybeSingle()),
                        ]);

                        items = (itemsResult as any)?.data || null;

                        // Fallback items: legacy purchase_transaction_items
                        if (!items || items.length === 0) {
                            try {
                                const { data: ptItems } = await supabase.from('purchase_transaction_items').select('*').eq('transaction_id', refId);
                                if (ptItems && ptItems.length > 0) items = ptItems;
                            } catch { /* ignore */ }
                        }

                        const pi = (summaryResult as any)?.data;
                        if (pi) {
                            summaryData = {
                                invoice_no: pi.invoice_number || pi.invoice_no || '',
                                total_amount: pi.total_amount || 0,
                                tax_amount: pi.tax_amount || 0,
                                discount_amount: pi.discount_amount || 0,
                                paid_amount: pi.paid_amount || 0,
                                balance: pi.balance || 0,
                                currency: pi.currency || currency,
                                stage: pi.document_stage || pi.status || '',
                                notes: pi.notes || '',
                            };
                        } else {
                            // Legacy fallback summary
                            try {
                                const { data: pt } = await supabase.from('purchase_transactions').select('*').eq('id', refId).maybeSingle();
                                if (pt) {
                                    summaryData = {
                                        invoice_no: pt.invoice_no || pt.invoice_number || '',
                                        total_amount: pt.total_amount || 0,
                                        tax_amount: pt.tax_amount || 0,
                                        discount_amount: pt.discount_amount || 0,
                                        paid_amount: pt.paid_amount || 0,
                                        balance: pt.balance || 0,
                                        currency: pt.currency || currency,
                                        stage: pt.stage || '',
                                        notes: pt.notes || '',
                                    };
                                }
                            } catch { /* ignore */ }
                        }
                    }

                    // If not purchase or no results → try sales (parallel)
                    if (!items || items.length === 0) {
                        const [salesItemsResult, salesSummaryResult] = await Promise.all([
                            safeQuery(supabase.from('sales_transaction_items').select('*').eq('transaction_id', refId)),
                            !summaryData
                                ? safeQuery(supabase.from('sales_transactions').select('*').eq('id', refId).maybeSingle())
                                : Promise.resolve({ data: null }),
                        ]);

                        const salesItems = (salesItemsResult as any)?.data;
                        if (salesItems && salesItems.length > 0) items = salesItems;

                        const txn = (salesSummaryResult as any)?.data;
                        if (!summaryData && txn) {
                            summaryData = {
                                invoice_no: txn.invoice_no || '',
                                total_amount: txn.total_amount || 0,
                                tax_amount: txn.tax_amount || 0,
                                discount_amount: txn.discount_amount || 0,
                                paid_amount: txn.paid_amount || 0,
                                balance: txn.balance || 0,
                                currency: txn.currency || currency,
                                stage: txn.stage || '',
                                notes: txn.notes || '',
                            };
                        }
                    }

                    if (!cancelled) {
                        setInvoiceItems((items || []).map((item: any) => ({
                            id: item.id,
                            lineNumber: item.line_number || 0,
                            description: item.description || item.item_description || '',
                            descriptionAr: item.description_ar || item.description || item.item_description || '',
                            itemCode: item.item_code || item.material_code || '',
                            quantity: item.quantity || 0,
                            deliveredQty: item.delivered_qty ?? item.received_qty ?? item.quantity ?? 0,
                            unitPrice: item.unit_price || item.unit_cost || 0,
                            discount: item.discount_amount || item.discount || 0,
                            taxRate: item.tax_rate || 0,
                            taxAmount: item.tax_amount || 0,
                            subtotal: item.subtotal || 0,
                            total: item.total || item.subtotal || 0,
                            unit: item.unit || item.uom || '',
                            colorName: item.color_name || undefined,
                            rollsCount: item.rolls_count || undefined,
                        })));
                        setInvoiceSummary(summaryData);
                    }

                } else if ((entry.type === 'payment' || entry.type === 'receipt') && refId) {
                    // ═══ PAYMENT/RECEIPT: Fetch from cash_transactions ═══
                    const { data: txn, error: txnErr } = await supabase
                        .from('cash_transactions')
                        .select(`
                            id, transaction_number, amount, currency, payment_method,
                            party_name, description, check_number, check_date,
                            reference_number, contra_account_id,
                            reference_type, reference_id
                        `)
                        .eq('id', refId)
                        .single();

                    if (txnErr) throw txnErr;

                    // Get contra account name
                    let contraName = '';
                    if (txn?.contra_account_id) {
                        const { data: acct } = await supabase
                            .from('chart_of_accounts')
                            .select('name_ar, name_en')
                            .eq('id', txn.contra_account_id)
                            .single();
                        contraName = isRTL ? (acct?.name_ar || '') : (acct?.name_en || acct?.name_ar || '');
                    }

                    // Get linked invoice info via reference_id
                    let linkedInvoiceNo = '';
                    let linkedInvoiceId = '';
                    const payRefType = txn?.reference_type || '';
                    if (txn?.reference_id) {
                        if (payRefType.includes('purchase')) {
                            // Try purchase_invoices first
                            const { data: inv } = await supabase
                                .from('purchase_invoices')
                                .select('id, invoice_number')
                                .eq('id', txn.reference_id)
                                .maybeSingle();
                            if (inv) {
                                linkedInvoiceNo = inv.invoice_number || '';
                                linkedInvoiceId = inv.id || '';
                            }
                        }
                        if (!linkedInvoiceId && (payRefType.includes('invoice') || payRefType.includes('sales'))) {
                            // Try sales_transactions
                            const { data: inv } = await supabase
                                .from('sales_transactions')
                                .select('id, invoice_no')
                                .eq('id', txn.reference_id)
                                .maybeSingle();
                            if (inv) {
                                linkedInvoiceNo = inv.invoice_no || '';
                                linkedInvoiceId = inv.id || '';
                            }
                        }
                    }

                    if (!cancelled) {
                        setPaymentDetail({
                            id: txn.id,
                            transactionNumber: txn.transaction_number || '',
                            amount: txn.amount || 0,
                            currency: txn.currency || currency,
                            paymentMethod: txn.payment_method || '',
                            partyName: txn.party_name || '',
                            description: txn.description || '',
                            checkNumber: txn.check_number || undefined,
                            checkDate: txn.check_date || undefined,
                            referenceNumber: txn.reference_number || undefined,
                            contraAccountName: contraName || undefined,
                            linkedInvoiceNo: linkedInvoiceNo || undefined,
                            linkedInvoiceId: linkedInvoiceId || undefined,
                        });
                    }

                } else {
                    // ═══ JOURNAL ENTRY: Show basic info ═══
                    if (!cancelled) {
                        // No extra details to fetch for generic journal entries
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error('[PartyLedgerExpandedRow] Error:', err);
                    setError(isRTL ? 'خطأ في تحميل التفاصيل' : 'Error loading details');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadDetails();
        return () => { cancelled = true; };
    }, [entry.entryId, entry.referenceId, entry.type]);

    // ═══ Payment Method Labels ═══
    const paymentMethodLabel = (method: string) => {
        const map: Record<string, { ar: string; en: string }> = {
            cash: { ar: 'نقداً', en: 'Cash' },
            bank_transfer: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
            check: { ar: 'شيك', en: 'Check' },
            credit_card: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
            wire: { ar: 'حوالة', en: 'Wire Transfer' },
        };
        return isRTL ? (map[method]?.ar || method) : (map[method]?.en || method);
    };

    // Payment status for invoice
    const invoicePaymentStatus = invoiceSummary
        ? getPaymentStatus(invoiceSummary.total_amount, invoiceSummary.paid_amount)
        : null;

    return (
        <div className="px-3 py-3 space-y-2" dir={direction}>
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg">{typeConfig.icon}</span>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                {isRTL ? typeConfig.label_ar : typeConfig.label_en}
                            </span>
                            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                                {invoiceSummary?.invoice_no || entry.entryNumber}
                            </span>
                            {/* Payment Status Badge for invoices */}
                            {invoicePaymentStatus && (
                                <PaymentStatusBadge status={invoicePaymentStatus} isRTL={isRTL} />
                            )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {entry.date} • {entry.description}
                        </div>
                    </div>
                </div>

                {/* Open Document Button */}
                {onOpenEntry && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenEntry(entry);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {isRTL ? 'فتح المستند' : 'Open Document'}
                    </button>
                )}
            </div>

            {/* ═══ Detail Content ═══ */}
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    <span className="text-xs text-gray-400 ms-2">
                        {isRTL ? 'جاري تحميل التفاصيل...' : 'Loading details...'}
                    </span>
                </div>
            ) : error ? (
                <div className="text-center py-4 text-xs text-red-400">{error}</div>
            ) : (
                <>
                    {/* ═══ INVOICE ITEMS TABLE ═══ */}
                    {entry.type === 'invoice' && invoiceItems.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" dir={direction}>
                                    <thead>
                                        <tr className="bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30">
                                            <th className="px-3 py-2 text-start text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider w-8">#</th>
                                            <th className="px-3 py-2 text-start text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                {isRTL ? 'البند' : 'Item'}
                                            </th>
                                            <th className="px-3 py-2 text-center text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider w-20">
                                                {isRTL ? 'الكمية' : 'Qty'}
                                            </th>
                                            <th className="px-3 py-2 text-end text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider w-24">
                                                {isRTL ? 'السعر' : 'Price'}
                                            </th>
                                            <th className="px-3 py-2 text-end text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider w-20">
                                                {isRTL ? 'الخصم' : 'Disc.'}
                                            </th>
                                            <th className="px-3 py-2 text-end text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider w-20">
                                                {isRTL ? 'الضريبة' : 'Tax'}
                                            </th>
                                            <th className="px-3 py-2 text-end text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider w-28">
                                                {isRTL ? 'الإجمالي' : 'Total'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {invoiceItems.map((item) => {
                                            // Use delivered quantity if available, otherwise original quantity
                                            const displayQty = item.deliveredQty > 0 ? item.deliveredQty : item.quantity;
                                            const qtyDiffers = item.deliveredQty > 0 && Math.abs(item.deliveredQty - item.quantity) > 0.001;

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{item.lineNumber}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                                                {isRTL ? (item.descriptionAr || item.description) : item.description}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {item.itemCode && (
                                                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                                        {item.itemCode}
                                                                    </span>
                                                                )}
                                                                {item.colorName && (
                                                                    <span className="text-[10px] text-purple-500">
                                                                        🎨 {item.colorName}
                                                                    </span>
                                                                )}
                                                                {item.rollsCount && item.rollsCount > 0 && (
                                                                    <span className="text-[10px] text-blue-500">
                                                                        📦 {item.rollsCount} {isRTL ? 'رول' : 'rolls'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-center font-mono text-sm">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                                                                {formatNumber(displayQty)}
                                                            </span>
                                                            {qtyDiffers && (
                                                                <span className="text-[9px] text-gray-400 line-through">
                                                                    {isRTL ? 'طلب' : 'ord'}: {formatNumber(item.quantity)}
                                                                </span>
                                                            )}
                                                            {item.unit && <span className="text-[10px] text-gray-400">{item.unit}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-end font-mono text-sm text-gray-600 dark:text-gray-300">
                                                        {formatNumber(item.unitPrice)}
                                                    </td>
                                                    <td className="px-3 py-2 text-end font-mono text-sm">
                                                        {item.discount > 0 ? (
                                                            <span className="text-orange-500">{formatNumber(item.discount)}</span>
                                                        ) : (
                                                            <span className="text-gray-300 dark:text-gray-600">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-end font-mono text-sm">
                                                        {item.taxAmount > 0 ? (
                                                            <span className="text-violet-500">
                                                                {formatNumber(item.taxAmount)}
                                                                <span className="text-[9px] ms-0.5 opacity-60">{item.taxRate}%</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 dark:text-gray-600">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-end font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                        {formatNumber(item.total)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                    {/* ═══ Invoice Summary Footer ═══ */}
                                    <tfoot>
                                        {/* Total Row */}
                                        <tr className="bg-amber-50/50 dark:bg-amber-950/10 border-t-2 border-amber-200/50 dark:border-amber-800/30">
                                            <td colSpan={6} className="px-3 py-2 text-end text-sm font-bold text-gray-600 dark:text-gray-300">
                                                {isRTL ? 'إجمالي الفاتورة' : 'Invoice Total'}
                                            </td>
                                            <td className="px-3 py-2 text-end font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
                                                {formatNumber(invoiceSummary?.total_amount || invoiceItems.reduce((s, i) => s + i.total, 0))}
                                                <span className="text-[10px] ms-1 opacity-60">
                                                    {invoiceSummary?.currency || currency}
                                                </span>
                                            </td>
                                        </tr>
                                        {/* Payment info row */}
                                        {invoiceSummary && invoiceSummary.paid_amount > 0 && (
                                            <tr className="bg-emerald-50/40 dark:bg-emerald-950/10">
                                                <td colSpan={6} className="px-3 py-1.5 text-end text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                    {isRTL ? 'المدفوع' : 'Paid'}
                                                </td>
                                                <td className="px-3 py-1.5 text-end font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {formatNumber(invoiceSummary.paid_amount)}
                                                </td>
                                            </tr>
                                        )}
                                        {/* Remaining balance row */}
                                        {invoiceSummary && invoiceSummary.balance > 0 && (
                                            <tr className="bg-red-50/40 dark:bg-red-950/10">
                                                <td colSpan={6} className="px-3 py-1.5 text-end text-xs font-medium text-red-600 dark:text-red-400">
                                                    {isRTL ? 'المتبقي' : 'Remaining'}
                                                </td>
                                                <td className="px-3 py-1.5 text-end font-mono text-xs font-bold text-red-600 dark:text-red-400">
                                                    {formatNumber(invoiceSummary.balance)}
                                                </td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ═══ PAYMENT/RECEIPT DETAIL CARD ═══ */}
                    {(entry.type === 'payment' || entry.type === 'receipt') && paymentDetail && (
                        <div className={cn(
                            "rounded-lg border overflow-hidden",
                            entry.type === 'receipt'
                                ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30"
                                : "bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30"
                        )}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                                {/* المبلغ */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                        {isRTL ? 'المبلغ' : 'Amount'}
                                    </span>
                                    <span className={cn(
                                        "font-mono text-lg font-bold",
                                        entry.type === 'receipt' ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {formatNumber(paymentDetail.amount)}
                                    </span>
                                    <span className="text-xs text-gray-400 ms-1">{paymentDetail.currency}</span>
                                </div>

                                {/* طريقة الدفع */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                        {isRTL ? 'طريقة الدفع' : 'Payment Method'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <CreditCard className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {paymentMethodLabel(paymentDetail.paymentMethod)}
                                        </span>
                                    </div>
                                </div>

                                {/* الحساب المقابل */}
                                {paymentDetail.contraAccountName && (
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                            {isRTL ? 'من/إلى حساب' : 'From/To Account'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {paymentDetail.contraAccountName}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* الفاتورة المرتبطة */}
                                {paymentDetail.linkedInvoiceNo && (
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                            {isRTL ? 'لحساب الفاتورة' : 'For Invoice'}
                                        </span>
                                        <span className="text-sm font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded">
                                            🧾 {paymentDetail.linkedInvoiceNo}
                                        </span>
                                    </div>
                                )}

                                {/* المرجع */}
                                {paymentDetail.referenceNumber && (
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                            {isRTL ? 'رقم المرجع' : 'Reference'}
                                        </span>
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                            {paymentDetail.referenceNumber}
                                        </span>
                                    </div>
                                )}

                                {/* معلومات الشيك */}
                                {paymentDetail.checkNumber && (
                                    <div className="col-span-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                            {isRTL ? 'رقم الشيك' : 'Check Number'}
                                        </span>
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                            {paymentDetail.checkNumber}
                                            {paymentDetail.checkDate && (
                                                <span className="text-xs text-gray-400 ms-2">
                                                    ({isRTL ? 'تاريخ: ' : 'Date: '}{paymentDetail.checkDate})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}

                                {/* البيان */}
                                {paymentDetail.description && (
                                    <div className="col-span-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                            {isRTL ? 'البيان' : 'Description'}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                            {paymentDetail.description}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ JOURNAL ENTRY (fallback) ═══ */}
                    {entry.type === 'journal' && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <FileText className="w-4 h-4" />
                                <span>{isRTL ? 'قيد يومية' : 'Journal Entry'}: {entry.entryNumber}</span>
                            </div>
                            {entry.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{entry.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs">
                                <span className="text-emerald-600">
                                    {isRTL ? 'مدين' : 'Debit'}: {formatNumber(entry.debit)}
                                </span>
                                <span className="text-red-500">
                                    {isRTL ? 'دائن' : 'Credit'}: {formatNumber(entry.credit)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ═══ No items found ═══ */}
                    {entry.type === 'invoice' && invoiceItems.length === 0 && !loading && (
                        <div className="text-center py-4 text-xs text-gray-400">
                            {isRTL ? 'لم يتم العثور على بنود' : 'No items found'}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default PartyLedgerExpandedRow;
