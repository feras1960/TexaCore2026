/**
 * PartyLedgerExpandedRow — السطر المنفتح في كشف حساب الجهة
 * 
 * يعرض بنود المستند الأصلي (فاتورة/سند قبض/سند صرف) بدلاً من القيد المحاسبي
 * لأن العميل أو المورد يحتاج رؤية محتوى الفاتورة للمطابقة وليس بنود القيد
 * 
 * ✅ يعرض الكمية المسلّمة (delivered_qty) بدلاً من الكمية الأصلية (quantity)
 * ✅ يعرض حالة الدفع (مدفوعة/جزئي/غير مدفوعة)
 * ✅ يعرض حالة الترحيل (مرحّل/غير مرحّل) بناءً على journal_entry_id/posted_at
 * ✅ يعرض حالة التسليم (مسلّم/جزئي/لم يُسلَّم) بناءً على stage/delivered_at
 * ✅ يعرض تفاصيل سندات القبض/الصرف مع ربط بالفاتورة
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn, formatNumber } from '@/lib/utils';
import { Loader2, ExternalLink, CreditCard, ArrowRightLeft, FileText, CheckCircle2, AlertCircle, Clock, Package, Ship, Truck, BookOpen, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
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
    material_id?: string;
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
    container_id?: string;
    container_number?: string;
    // حالة الترحيل
    journal_entry_id?: string | null;
    posted_at?: string | null;
    // حالة التسليم
    delivered_at?: string | null;
    delivery_confirmed_at?: string | null;
    delivery_no?: string | null;
    // معلومات المستودع
    warehouse_id?: string | null;
    warehouse_name_ar?: string | null;
    warehouse_name_en?: string | null;
    stock_warehouse_id?: string | null;
    stock_warehouse_name_ar?: string | null;
    stock_warehouse_name_en?: string | null;
}

// ═══ Payment Status ═══
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

// ═══ Posting Status ═══
type PostingStatus = 'posted' | 'unposted';

// ═══ Delivery Status ═══
type DeliveryStatus = 'delivered' | 'partial' | 'pending';

function getPaymentStatus(totalAmount: number, paidAmount: number): PaymentStatus {
    if (paidAmount >= totalAmount && totalAmount > 0) return 'paid';
    if (paidAmount > 0 && paidAmount < totalAmount) return 'partial';
    return 'unpaid';
}

function getPostingStatus(summary: InvoiceSummary): PostingStatus {
    if (summary.journal_entry_id || summary.posted_at) return 'posted';
    // Check stage as fallback
    const postedStages = ['posted', 'delivered', 'completed', 'paid', 'fully_received', 'partially_received', 'received'];
    if (postedStages.includes(summary.stage)) return 'posted';
    return 'unposted';
}

function getDeliveryStatus(summary: InvoiceSummary): DeliveryStatus {
    if (summary.delivered_at || summary.delivery_confirmed_at || summary.stage === 'delivered' || summary.stage === 'completed') return 'delivered';
    if (summary.delivery_no || summary.stage === 'in_delivery') return 'partial';
    if (summary.stage === 'partially_received' || summary.stage === 'in_receiving') return 'partial';
    return 'pending';
}

function PaymentStatusBadge({ status, isRTL }: { status: PaymentStatus; isRTL: boolean }) {
    const config = {
        paid: {
            label_ar: 'مدفوعة ✓',
            label_en: 'Paid ✓',
            icon: <CheckCircle2 className="w-3 h-3" />,
            className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
        },
        partial: {
            label_ar: 'جزئي الدفع',
            label_en: 'Part. Paid',
            icon: <Clock className="w-3 h-3" />,
            className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
        },
        unpaid: {
            label_ar: 'غير مدفوعة',
            label_en: 'Unpaid',
            icon: <XCircle className="w-3 h-3" />,
            className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
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

function PostingStatusBadge({ status, postedAt, isRTL }: { status: PostingStatus; postedAt?: string | null; isRTL: boolean }) {
    const config = {
        posted: {
            label_ar: 'مرحَّل ✓',
            label_en: 'Posted ✓',
            icon: <BookOpen className="w-3 h-3" />,
            className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
        },
        unposted: {
            label_ar: 'غير مرحَّل',
            label_en: 'Not Posted',
            icon: <AlertCircle className="w-3 h-3" />,
            className: 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        },
    };

    const c = config[status];
    return (
        <span
            className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", c.className)}
            title={postedAt ? `${isRTL ? 'تاريخ الترحيل: ' : 'Posted: '}${postedAt}` : undefined}
        >
            {c.icon}
            {isRTL ? c.label_ar : c.label_en}
        </span>
    );
}

function DeliveryStatusBadge({ status, deliveredAt, deliveryNo, isRTL }: { status: DeliveryStatus; deliveredAt?: string | null; deliveryNo?: string | null; isRTL: boolean }) {
    const config = {
        delivered: {
            label_ar: 'مُسلَّم ✓',
            label_en: 'Delivered ✓',
            icon: <Truck className="w-3 h-3" />,
            className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
        },
        partial: {
            label_ar: 'تسليم جزئي',
            label_en: 'Part. Delivered',
            icon: <Package className="w-3 h-3" />,
            className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800',
        },
        pending: {
            label_ar: 'لم يُسلَّم',
            label_en: 'Not Delivered',
            icon: <Clock className="w-3 h-3" />,
            className: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
        },
    };

    const c = config[status];
    const titleParts = [];
    if (deliveredAt) titleParts.push(`${isRTL ? 'تاريخ التسليم: ' : 'Delivered: '}${deliveredAt}`);
    if (deliveryNo) titleParts.push(`${isRTL ? 'أمر التسليم: ' : 'Delivery Note: '}${deliveryNo}`);
    return (
        <span
            className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", c.className)}
            title={titleParts.join(' | ') || undefined}
        >
            {c.icon}
            {isRTL ? c.label_ar : c.label_en}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════
// Cached data structure — all details for one ledger entry
// ═══════════════════════════════════════════════════════════
interface PartyDocDetails {
    invoiceItems: InvoiceItem[];
    invoiceSummary: InvoiceSummary | null;
    paymentDetail: PaymentDetail | null;
    rollMovements: { total: number; movementRef?: string } | null;
    itemRollsMap: Record<string, { roll_id: string; roll_number: string; length: number; status: string; color_name?: string }[]>;
}

// ═══════════════════════════════════════════════════════════
// Fetch function — extracted so it can be used by useCachedQuery
// ═══════════════════════════════════════════════════════════
export async function fetchPartyDocDetails(entry: ExtendedLedgerEntry, currency: string): Promise<PartyDocDetails> {
    const refType = entry.referenceType || '';
    let refId = entry.referenceId;
    const desc = entry.description || '';

    const isPurchaseHint = refType.includes('purchase')
        || desc.includes('مشتريات') || desc.includes('PI-') || desc.includes('purchase');

    const safeQuery = async (query: PromiseLike<any>) => {
        try { return await query; } catch { return { data: null, error: true }; }
    };

    let invoiceItems: InvoiceItem[] = [];
    let invoiceSummary: InvoiceSummary | null = null;
    let paymentDetail: PaymentDetail | null = null;
    let rollMovements: { total: number; movementRef?: string } | null = null;
    let itemRollsMap: Record<string, any[]> = {};

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
            const [itemsResult, summaryResult] = await Promise.all([
                safeQuery(supabase.from('purchase_invoice_items').select('*').eq('invoice_id', refId)),
                safeQuery(supabase.from('purchase_invoices').select('*').eq('id', refId).maybeSingle()),
            ]);
            items = (itemsResult as any)?.data || null;
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
                    container_id: pi.container_id || undefined,
                    journal_entry_id: pi.journal_entry_id || null,
                    posted_at: pi.posted_at || null,
                    delivered_at: pi.received_at || pi.delivered_at || null,
                    delivery_confirmed_at: pi.delivery_confirmed_at || null,
                    delivery_no: pi.delivery_no || null,
                };
            } else {
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
                            container_id: pt.container_id || undefined,
                            journal_entry_id: pt.journal_entry_id || null,
                            posted_at: pt.posted_at || null,
                            delivered_at: pt.delivered_at || null,
                            delivery_confirmed_at: pt.delivery_confirmed_at || null,
                            delivery_no: pt.delivery_no || null,
                        };
                    }
                } catch { /* ignore */ }
            }
            if (summaryData?.container_id) {
                try {
                    const { data: ctn } = await supabase.from('containers').select('container_number').eq('id', summaryData.container_id).maybeSingle();
                    if (ctn) summaryData.container_number = ctn.container_number;
                } catch { /* ignore */ }
            }
        }

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
                    journal_entry_id: txn.journal_entry_id || null,
                    posted_at: txn.posted_at || null,
                    delivered_at: txn.delivered_at || txn.delivery_confirmed_at || null,
                    delivery_confirmed_at: txn.delivery_confirmed_at || null,
                    delivery_no: txn.delivery_no || null,
                    warehouse_id: txn.warehouse_id || null,
                    stock_warehouse_id: txn.stock_warehouse_id || null,
                };
            }
        }

        invoiceItems = (items || []).map((item: any) => ({
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
            material_id: item.material_id || undefined,
        }));

        // ═══ PARALLEL: Fetch warehouse, movements, and rolls all at once ═══
        const materialIds = [...new Set((items || []).map((i: any) => i.material_id).filter(Boolean))] as string[];
        const whId = summaryData?.warehouse_id || summaryData?.stock_warehouse_id;

        const [warehouseResult, movCountResult, rollsResult] = await Promise.all([
            // 1. Warehouse name lookup
            whId
                ? safeQuery(supabase.from('warehouses').select('id, name_ar, name_en').eq('id', whId).maybeSingle())
                : Promise.resolve({ data: null }),
            // 2. Inventory movements count
            refId
                ? safeQuery(supabase.from('inventory_movements').select('id', { count: 'exact', head: true }).eq('reference_id', refId))
                : Promise.resolve({ data: null, count: 0 }),
            // 3. Fabric rolls for material items
            (materialIds.length > 0 && summaryData)
                ? safeQuery(supabase.from('fabric_rolls').select('id, roll_number, current_length, status, material_id, color_name').in('material_id', materialIds).in('status', ['sold', 'delivered']))
                : Promise.resolve({ data: null }),
        ]);

        if (summaryData) {
            const wh = (warehouseResult as any)?.data;
            if (wh) {
                summaryData.warehouse_name_ar = wh.name_ar || null;
                summaryData.warehouse_name_en = wh.name_en || null;
            }
            invoiceSummary = { ...summaryData };
        }

        if (refId) {
            rollMovements = { total: (movCountResult as any)?.count || 0 };
        }

        const rollsData = (rollsResult as any)?.data;
        if (rollsData && rollsData.length > 0) {
            const rollMap: Record<string, any[]> = {};
            for (const r of rollsData) {
                if (!rollMap[r.material_id]) rollMap[r.material_id] = [];
                rollMap[r.material_id].push({ roll_id: r.id, roll_number: r.roll_number, length: r.current_length || 0, status: r.status, color_name: r.color_name || undefined });
            }
            itemRollsMap = rollMap;
        }

    } else if ((entry.type === 'payment' || entry.type === 'receipt') && refId) {
        const { data: txn, error: txnErr } = await supabase
            .from('cash_transactions')
            .select(`id, transaction_number, amount, currency, payment_method, party_name, description, check_number, check_date, reference_number, contra_account_id, reference_type, reference_id`)
            .eq('id', refId)
            .single();

        if (txnErr) throw txnErr;

        // ═══ PARALLEL: Fetch contra account name + linked invoice at once ═══
        const payRefType = txn?.reference_type || '';
        const [contraResult, purchaseInvResult, salesInvResult] = await Promise.all([
            // 1. Contra account name
            txn?.contra_account_id
                ? safeQuery(supabase.from('chart_of_accounts').select('name_ar, name_en').eq('id', txn.contra_account_id).single())
                : Promise.resolve({ data: null }),
            // 2. Purchase invoice link
            (txn?.reference_id && payRefType.includes('purchase'))
                ? safeQuery(supabase.from('purchase_invoices').select('id, invoice_number').eq('id', txn.reference_id).maybeSingle())
                : Promise.resolve({ data: null }),
            // 3. Sales invoice link
            (txn?.reference_id && !payRefType.includes('purchase') && (payRefType.includes('invoice') || payRefType.includes('sales')))
                ? safeQuery(supabase.from('sales_transactions').select('id, invoice_no').eq('id', txn.reference_id).maybeSingle())
                : Promise.resolve({ data: null }),
        ]);

        const contraName = (contraResult as any)?.data?.name_ar || (contraResult as any)?.data?.name_en || '';
        let linkedInvoiceNo = '';
        let linkedInvoiceId = '';
        const piData = (purchaseInvResult as any)?.data;
        if (piData) { linkedInvoiceNo = piData.invoice_number || ''; linkedInvoiceId = piData.id || ''; }
        if (!linkedInvoiceId) {
            const siData = (salesInvResult as any)?.data;
            if (siData) { linkedInvoiceNo = siData.invoice_no || ''; linkedInvoiceId = siData.id || ''; }
        }

        paymentDetail = {
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
        };
    }

    return { invoiceItems, invoiceSummary, paymentDetail, rollMovements, itemRollsMap };
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

    // ═══ Cached query — fetches once, then serves from IndexedDB cache ═══
    const { data: details, isLoading: loading, error: queryError } = useCachedQuery<PartyDocDetails>({
        queryKey: ['party_doc_details', entry.entryId, entry.referenceId || '', entry.type],
        queryFn: () => fetchPartyDocDetails(entry, currency),
        staleTime: 10 * 60 * 1000,  // 10 minutes — data stays fresh
        gcTime: 24 * 60 * 60 * 1000, // 24 hours — persist in IndexedDB
    });

    const invoiceItems = details?.invoiceItems || [];
    const paymentDetail = details?.paymentDetail || null;
    const invoiceSummary = details?.invoiceSummary || null;
    const rollMovements = details?.rollMovements || null;
    const itemRollsMap = details?.itemRollsMap || {};
    const error = queryError ? (isRTL ? 'خطأ في تحميل التفاصيل' : 'Error loading details') : null;

    // السطر المنفتح من بنود الفاتورة
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

    // Entry type info
    const typeConfig = ENTRY_TYPE_CONFIG[entry.type] || ENTRY_TYPE_CONFIG.journal;

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

    // Posting status
    const invoicePostingStatus = invoiceSummary ? getPostingStatus(invoiceSummary) : null;

    // Delivery status
    const invoiceDeliveryStatus = invoiceSummary ? getDeliveryStatus(invoiceSummary) : null;

    // Stage labels for display
    const stageLabelMap: Record<string, { ar: string; en: string; color: string; icon: React.ReactNode }> = {
        draft: { ar: 'مسودة', en: 'Draft', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
        confirmed: { ar: 'مؤكدة', en: 'Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <CheckCircle2 className="w-3 h-3" /> },
        posted: { ar: 'مرحّلة', en: 'Posted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle2 className="w-3 h-3" /> },
        received: { ar: 'مستلمة', en: 'Received', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', icon: <Package className="w-3 h-3" /> },
        fully_received: { ar: 'مستلمة بالكامل', en: 'Fully Received', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: <Package className="w-3 h-3" /> },
        partially_received: { ar: 'مستلمة جزئياً', en: 'Partially Received', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: <Package className="w-3 h-3" /> },
        in_receiving: { ar: 'جاري الاستلام', en: 'In Receiving', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', icon: <Truck className="w-3 h-3" /> },
        in_delivery: { ar: 'قيد التسليم', en: 'In Delivery', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', icon: <Truck className="w-3 h-3" /> },
        delivered: { ar: 'تم التسليم', en: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: <Package className="w-3 h-3" /> },
        completed: { ar: 'مكتملة', en: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle2 className="w-3 h-3" /> },
        cancelled: { ar: 'ملغاة', en: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: <AlertCircle className="w-3 h-3" /> },
        paid: { ar: 'مدفوعة', en: 'Paid', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <CheckCircle2 className="w-3 h-3" /> },
        partial_paid: { ar: 'مدفوعة جزئياً', en: 'Partially Paid', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', icon: <Clock className="w-3 h-3" /> },
    };

    // Handle container click — opens container in MDI tab
    const handleContainerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onOpenEntry || !invoiceSummary?.container_id) return;
        // Create a synthetic entry for the container
        onOpenEntry({
            ...entry,
            referenceType: 'container',
            referenceId: invoiceSummary.container_id,
            type: 'journal' as any, // Will trigger container detection in handler
            entryId: entry.entryId,
        });
    };

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
                            {/* Container Link Badge */}
                            {invoiceSummary?.container_id && (
                                <button
                                    onClick={handleContainerClick}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-800/50 transition-colors cursor-pointer"
                                    title={isRTL ? 'فتح الكونتينر' : 'Open Container'}
                                >
                                    <Ship className="w-3 h-3" />
                                    {invoiceSummary.container_number || (isRTL ? 'كونتينر' : 'Container')}
                                </button>
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

            {/* ═══ STATUS BAR — للفواتير فقط ═══ */}
            {entry.type === 'invoice' && invoiceSummary && !loading && (
                <div className="flex items-center gap-2 flex-wrap bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                    {/* عنوان */}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {isRTL ? 'الحالات:' : 'Status:'}
                    </span>

                    {/* ── حالة الدفع ── */}
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400">{isRTL ? 'الدفع' : 'Payment'}</span>
                        {invoicePaymentStatus && (
                            <PaymentStatusBadge status={invoicePaymentStatus} isRTL={isRTL} />
                        )}
                    </div>

                    <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>

                    {/* ── حالة الترحيل + رقم القيد معاً ── */}
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400">{isRTL ? 'الترحيل' : 'Posting'}</span>
                        {invoicePostingStatus === 'posted' ? (
                            // مرحَّل: نعرض البادج + رقم القيد معاً
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                                title={invoiceSummary.posted_at ? `${isRTL ? 'تاريخ الترحيل: ' : 'Posted: '}${invoiceSummary.posted_at}` : undefined}
                            >
                                <BookOpen className="w-3 h-3" />
                                {isRTL ? 'مرحَّل ✓' : 'Posted ✓'}
                                {invoiceSummary.journal_entry_id && (
                                    <span className="font-mono opacity-70 text-[9px] ms-0.5">
                                        #{invoiceSummary.journal_entry_id.substring(0, 6)}
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                <AlertCircle className="w-3 h-3" />
                                {isRTL ? 'غير مرحَّل' : 'Not Posted'}
                            </span>
                        )}
                    </div>

                    <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>

                    {/* ── حالة التسليم ── */}
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400">{isRTL ? 'التسليم' : 'Delivery'}</span>
                        {invoiceDeliveryStatus && (
                            <DeliveryStatusBadge
                                status={invoiceDeliveryStatus}
                                deliveredAt={invoiceSummary.delivered_at || invoiceSummary.delivery_confirmed_at}
                                deliveryNo={invoiceSummary.delivery_no}
                                isRTL={isRTL}
                            />
                        )}
                    </div>

                    {/* ── المستودع ── */}
                    {(invoiceSummary.warehouse_name_ar || invoiceSummary.warehouse_name_en) && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] text-gray-400">{isRTL ? 'المستودع' : 'Warehouse'}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                                    🏭
                                    {isRTL
                                        ? (invoiceSummary.warehouse_name_ar || invoiceSummary.warehouse_name_en)
                                        : (invoiceSummary.warehouse_name_en || invoiceSummary.warehouse_name_ar)}
                                </span>
                            </div>
                        </>
                    )}

                    {/* ── المرحلة الكاملة (فقط للحالات غير المكررة) ── */}
                    {invoiceSummary.stage &&
                        !['draft', 'posted', 'paid'].includes(invoiceSummary.stage) && (
                            <>
                                <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>
                                <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                    stageLabelMap[invoiceSummary.stage]?.color || 'bg-gray-100 text-gray-600'
                                )}>
                                    {stageLabelMap[invoiceSummary.stage]?.icon}
                                    {isRTL ? (stageLabelMap[invoiceSummary.stage]?.ar || invoiceSummary.stage) : (stageLabelMap[invoiceSummary.stage]?.en || invoiceSummary.stage)}
                                </span>
                            </>
                        )}
                </div>
            )}

            {/* ═══ WAREHOUSE ROLLS VERIFICATION — للفواتير فقط ═══ */}
            {entry.type === 'invoice' && invoiceSummary && !loading && rollMovements !== null && (
                <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border text-xs",
                    rollMovements.total > 0
                        ? "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40"
                        : "bg-orange-50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800/40"
                )}>
                    {/* أيقونة */}
                    <span className="text-base">{rollMovements.total > 0 ? '📦' : '⚠️'}</span>
                    {/* معلومات المستودع */}
                    <div className="flex items-center gap-2 flex-1">
                        <span className={cn(
                            "font-semibold text-[11px]",
                            rollMovements.total > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"
                        )}>
                            {isRTL ? 'المستودع / الرولونات:' : 'Warehouse / Rolls:'}
                        </span>
                        {rollMovements.total > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                {isRTL
                                    ? `تم ترحيل ${rollMovements.total} حركة في المستودع ✓`
                                    : `${rollMovements.total} warehouse movement(s) posted ✓`}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-200 dark:border-orange-800">
                                <AlertCircle className="w-3 h-3" />
                                {isRTL ? 'لا توجد حركات مستودعية مسجّلة' : 'No warehouse movements recorded'}
                            </span>
                        )}
                    </div>
                    {/* مؤشر إجمالي الرولونات في الفاتورة */}
                    {invoiceItems.some(i => (i.rollsCount || 0) > 0) && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                            {isRTL ? 'الفاتورة: ' : 'Invoice: '}
                            {invoiceItems.reduce((s, i) => s + (i.rollsCount || 0), 0)} {isRTL ? 'رول' : 'rolls'}
                        </span>
                    )}
                </div>
            )}

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
                                            const displayQty = item.deliveredQty > 0 ? item.deliveredQty : item.quantity;
                                            const qtyDiffers = item.deliveredQty > 0 && Math.abs(item.deliveredQty - item.quantity) > 0.001;
                                            // الرولونات لهذه المادة
                                            const itemRolls = (item as any).material_id
                                                ? (itemRollsMap[(item as any).material_id] || [])
                                                : [];
                                            const isItemExpanded = expandedItemId === item.id;
                                            const hasRolls = itemRolls.length > 0;

                                            return (
                                                <React.Fragment key={item.id}>
                                                    {/* ── سطر المادة الرئيسي ── */}
                                                    <tr
                                                        className={cn(
                                                            "transition-colors",
                                                            hasRolls
                                                                ? "cursor-pointer hover:bg-teal-50/60 dark:hover:bg-teal-950/20"
                                                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                                            isItemExpanded && "bg-teal-50/40 dark:bg-teal-950/10"
                                                        )}
                                                        onClick={() => hasRolls && setExpandedItemId(isItemExpanded ? null : item.id)}
                                                    >
                                                        {/* # */}
                                                        <td className="px-3 py-2 text-xs text-gray-400 font-mono">
                                                            {hasRolls && (
                                                                <span className={cn(
                                                                    "inline-block w-3 h-3 me-1 text-teal-500 transition-transform duration-200",
                                                                    isItemExpanded ? "rotate-90" : ""
                                                                )}>▶</span>
                                                            )}
                                                            {item.lineNumber}
                                                        </td>
                                                        {/* البند */}
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
                                                                        <span className="text-[10px] text-purple-500">🎨 {item.colorName}</span>
                                                                    )}
                                                                    {/* عدد الرولونات المسلّمة */}
                                                                    {hasRolls ? (
                                                                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                                                            📦 {itemRolls.length} {isRTL ? 'رول مُسلَّم' : 'rolls delivered'}
                                                                        </span>
                                                                    ) : item.rollsCount && item.rollsCount > 0 ? (
                                                                        <span className="text-[10px] text-blue-500">
                                                                            📦 {item.rollsCount} {isRTL ? 'رول' : 'rolls'}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* الكمية */}
                                                        <td className="px-3 py-2 text-center font-mono text-sm">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-gray-800 dark:text-gray-200 font-medium">{formatNumber(displayQty)}</span>
                                                                {qtyDiffers && (
                                                                    <span className="text-[9px] text-gray-400 line-through">
                                                                        {isRTL ? 'طلب' : 'ord'}: {formatNumber(item.quantity)}
                                                                    </span>
                                                                )}
                                                                {item.unit && <span className="text-[10px] text-gray-400">{item.unit}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-end font-mono text-sm text-gray-600 dark:text-gray-300">{formatNumber(item.unitPrice)}</td>
                                                        <td className="px-3 py-2 text-end font-mono text-sm">
                                                            {item.discount > 0 ? <span className="text-orange-500">{formatNumber(item.discount)}</span> : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-end font-mono text-sm">
                                                            {item.taxAmount > 0 ? (
                                                                <span className="text-violet-500">
                                                                    {formatNumber(item.taxAmount)}
                                                                    <span className="text-[9px] ms-0.5 opacity-60">{item.taxRate}%</span>
                                                                </span>
                                                            ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-end font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">{formatNumber(item.total)}</td>
                                                    </tr>

                                                    {/* ── السطر المنفتح: قائمة الرولونات المسلّمة ── */}
                                                    {isItemExpanded && hasRolls && (
                                                        <tr className="bg-teal-50/30 dark:bg-teal-950/10">
                                                            <td colSpan={7} className="px-4 py-3">
                                                                <div className="space-y-1">
                                                                    {/* عنوان */}
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                                                        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                                                                            {isRTL ? `الرولونات المسلّمة (${itemRolls.length} رول)` : `Delivered Rolls (${itemRolls.length})`}
                                                                        </span>
                                                                        <span className="text-[10px] text-teal-500 font-mono">
                                                                            {isRTL ? 'إجمالي: ' : 'Total: '}
                                                                            {formatNumber(itemRolls.reduce((s, r) => s + (r.length || 0), 0))}
                                                                            {item.unit ? ` ${item.unit}` : 'm'}
                                                                        </span>
                                                                    </div>
                                                                    {/* شبكة الرولونات */}
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                                                                        {itemRolls.map((roll, ridx) => (
                                                                            <div
                                                                                key={roll.roll_id || ridx}
                                                                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800/50 rounded-lg px-2.5 py-1.5"
                                                                            >
                                                                                <span className="text-teal-500 text-xs">📦</span>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs font-bold font-mono text-gray-700 dark:text-gray-300">
                                                                                        {roll.roll_number || `R-${ridx + 1}`}
                                                                                    </span>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                                                                                            {formatNumber(roll.length)}{item.unit || 'm'}
                                                                                        </span>
                                                                                        {roll.color_name && (
                                                                                            <span className="text-[9px] text-purple-500">🎨 {roll.color_name}</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
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
