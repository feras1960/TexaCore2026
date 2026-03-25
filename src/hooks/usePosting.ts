/**
 * usePosting — React Hook للترحيل الموحد
 * ═══════════════════════════════════════════════════════════════
 * يوفر:
 * - postDocument() — ترحيل أي مستند بسطر واحد
 * - getBalance() — جلب رصيد مورد/عميل
 * - convertQuotation() — تحويل عرض سعر → أمر
 * - isPosting — حالة التحميل
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useQueryClient } from '@tanstack/react-query';
import { postingService, PostingResult, ReceiptItem, PartyBalance } from '@/services/postingService';

export function usePosting() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();
    const [isPosting, setIsPosting] = useState(false);

    /**
     * ترحيل فاتورة مشتريات مع toast + invalidation
     */
    const postPurchaseInvoice = useCallback(async (invoiceId: string): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.postPurchaseInvoice(invoiceId);
            if (result.success) {
                toast.success(isRTL ? '✅ تم ترحيل فاتورة المشتريات بنجاح' : '✅ Purchase invoice posted successfully');
                queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['purchase_transactions'] });
                queryClient.invalidateQueries({ queryKey: ['purchase_transactions_list'] });
                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                // Invalidate the journal preview inside the Payment tab
                queryClient.invalidateQueries({ queryKey: ['invoice_actual_journal'] });
                queryClient.invalidateQueries({ queryKey: ['invoice_receipt_status'] });
                queryClient.invalidateQueries({ queryKey: ['purchase_payment_history'] });
                queryClient.invalidateQueries({ queryKey: ['invoice_live_status'] });
            } else {
                toast.error(isRTL ? `❌ فشل الترحيل: ${result.error}` : `❌ Posting failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    /**
     * ترحيل فاتورة مبيعات مع toast + invalidation
     */
    const postSalesInvoice = useCallback(async (invoiceId: string): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.postSalesInvoice(invoiceId);
            if (result.success) {
                toast.success(isRTL ? '✅ تم ترحيل فاتورة المبيعات بنجاح' : '✅ Sales invoice posted successfully');
                queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['sales_transactions'] });
                queryClient.invalidateQueries({ queryKey: ['sales_transactions_list'] });
                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
            } else {
                toast.error(isRTL ? `❌ فشل الترحيل: ${result.error}` : `❌ Posting failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    /**
     * ترحيل سند استلام مع toast + invalidation
     */
    const postPurchaseReceipt = useCallback(async (
        receiptId: string,
        warehouseId: string,
        items: ReceiptItem[]
    ): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.postPurchaseReceipt(receiptId, warehouseId, items);
            if (result.success) {
                toast.success(isRTL ? '✅ تم ترحيل سند الاستلام بنجاح' : '✅ Purchase receipt posted successfully');
                queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['purchase_receipts'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_stock'] });
                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                // Invalidate the journal preview inside the Payment tab
                queryClient.invalidateQueries({ queryKey: ['invoice_actual_journal'] });
                queryClient.invalidateQueries({ queryKey: ['invoice_receipt_status'] });
            } else {
                toast.error(isRTL ? `❌ فشل الترحيل: ${result.error}` : `❌ Posting failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    /**
     * ترحيل مرتجع مشتريات مع toast + invalidation
     */
    const postPurchaseReturn = useCallback(async (returnId: string): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.postPurchaseReturn(returnId);
            if (result.success) {
                toast.success(isRTL ? '✅ تم ترحيل مرتجع المشتريات بنجاح' : '✅ Purchase return posted successfully');
                queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['purchase_returns'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_stock'] });
                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
            } else {
                toast.error(isRTL ? `❌ فشل الترحيل: ${result.error}` : `❌ Posting failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    /**
     * ترحيل مرتجع مبيعات مع toast + invalidation
     */
    const postSalesReturn = useCallback(async (returnId: string): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.postSalesReturn(returnId);
            if (result.success) {
                toast.success(isRTL ? '✅ تم ترحيل مرتجع المبيعات بنجاح' : '✅ Sales return posted successfully');
                queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['sales_returns'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_stock'] });
                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
            } else {
                toast.error(isRTL ? `❌ فشل الترحيل: ${result.error}` : `❌ Posting failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    /**
     * جلب رصيد مورد/عميل
     */
    const getBalance = useCallback(async (
        partyType: 'supplier' | 'customer',
        partyId: string
    ): Promise<PartyBalance | null> => {
        return postingService.getPartyBalance(partyType, partyId);
    }, []);

    /**
     * تحويل عرض سعر إلى أمر
     */
    const convertQuotation = useCallback(async (
        quotationId: string,
        docCycle: 'purchase' | 'sales'
    ): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.convertQuotationToOrder(quotationId, docCycle);
            if (result.success) {
                toast.success(isRTL ? '✅ تم تحويل عرض السعر إلى أمر بنجاح' : '✅ Quotation converted to order successfully');
                queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
            } else {
                toast.error(isRTL ? `❌ فشل التحويل: ${result.error}` : `❌ Conversion failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    /**
     * ترحيل عام — يحدد نوع المستند تلقائياً
     */
    const postDocument = useCallback(async (
        docType: string,
        docId: string,
        extras?: { warehouseId?: string; items?: ReceiptItem[] }
    ): Promise<PostingResult> => {
        setIsPosting(true);
        try {
            const result = await postingService.postDocument(docType, docId, extras);
            if (result.success) {
                toast.success(isRTL ? '✅ تم الترحيل بنجاح' : '✅ Document posted successfully');
                // Invalidate all related queries
                queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
                queryClient.invalidateQueries({ queryKey: ['inventory_stock'] });
            } else {
                toast.error(isRTL ? `❌ فشل الترحيل: ${result.error}` : `❌ Posting failed: ${result.error}`);
            }
            return result;
        } finally {
            setIsPosting(false);
        }
    }, [isRTL, queryClient]);

    return {
        // Individual posting functions
        postPurchaseInvoice,
        postSalesInvoice,
        postPurchaseReceipt,
        postPurchaseReturn,
        postSalesReturn,
        // Utility functions
        getBalance,
        convertQuotation,
        // Generic posting
        postDocument,
        // State
        isPosting,
    };
}
