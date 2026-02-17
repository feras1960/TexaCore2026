/**
 * PostingService — خدمة الترحيل الموحدة
 * ═══════════════════════════════════════════════════════════════
 * تستخدم دوال الـ Backend (SECURITY DEFINER) بدلاً من المنطق المعقد في الفرونت.
 * 
 * الدوال المدعومة:
 * 1. post_purchase_invoice(p_invoice_id)
 * 2. post_sales_invoice(p_invoice_id)
 * 3. post_purchase_receipt(p_receipt_id, p_warehouse_id, p_items)
 * 4. post_purchase_return(p_return_id)
 * 5. post_sales_return(p_return_id)
 * 6. get_party_balance(p_party_type, p_party_id)
 * 7. convert_quotation_to_order(p_quotation_id, p_doc_cycle)
 */

import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────
export interface PostingResult {
    success: boolean;
    journal_entry_id?: string;
    message?: string;
    error?: string;
    data?: any;
}

export interface PartyBalance {
    party_type: string;
    party_id: string;
    total_debit: number;
    total_credit: number;
    balance: number;
    currency?: string;
}

export interface ReceiptItem {
    material_id?: string;
    product_id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total: number;
}

// ─── Posting Service ────────────────────────────────────────────
export const postingService = {

    /**
     * ترحيل فاتورة مشتريات — يُنشئ قيد محاسبي + يُحدّث حالة الفاتورة
     */
    async postPurchaseInvoice(invoiceId: string): Promise<PostingResult> {
        try {
            const { data, error } = await supabase.rpc('post_purchase_invoice', {
                p_invoice_id: invoiceId,
            });

            if (error) {
                console.error('❌ Post Purchase Invoice Error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            console.log('✅ Purchase Invoice Posted:', data);
            console.log('✅ journal_entry_id from RPC:', data?.journal_entry_id, '| Full keys:', data ? Object.keys(data) : 'null');
            return {
                success: true,
                journal_entry_id: data?.journal_entry_id,
                message: data?.message || 'تم ترحيل فاتورة المشتريات بنجاح',
                data,
            };
        } catch (err: any) {
            console.error('❌ Post Purchase Invoice Exception:', err);
            return {
                success: false,
                error: err.message || 'فشل في ترحيل فاتورة المشتريات',
            };
        }
    },

    /**
     * ترحيل فاتورة مبيعات — يُنشئ قيد محاسبي + يُحدّث حالة الفاتورة
     */
    async postSalesInvoice(invoiceId: string): Promise<PostingResult> {
        try {
            const { data, error } = await supabase.rpc('post_sales_invoice', {
                p_invoice_id: invoiceId,
            });

            if (error) {
                console.error('❌ Post Sales Invoice Error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            console.log('✅ Sales Invoice Posted:', data);
            return {
                success: true,
                journal_entry_id: data?.journal_entry_id,
                message: data?.message || 'تم ترحيل فاتورة المبيعات بنجاح',
                data,
            };
        } catch (err: any) {
            console.error('❌ Post Sales Invoice Exception:', err);
            return {
                success: false,
                error: err.message || 'فشل في ترحيل فاتورة المبيعات',
            };
        }
    },

    /**
     * ترحيل سند استلام — يُنشئ حركة مخزون + قيد محاسبي
     */
    async postPurchaseReceipt(
        receiptId: string,
        warehouseId: string,
        items: ReceiptItem[]
    ): Promise<PostingResult> {
        try {
            const { data, error } = await supabase.rpc('post_purchase_receipt', {
                p_receipt_id: receiptId,
                p_warehouse_id: warehouseId,
                p_items: items,
            });

            if (error) {
                console.error('❌ Post Purchase Receipt Error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            console.log('✅ Purchase Receipt Posted:', data);
            return {
                success: true,
                journal_entry_id: data?.journal_entry_id,
                message: data?.message || 'تم ترحيل سند الاستلام بنجاح',
                data,
            };
        } catch (err: any) {
            console.error('❌ Post Purchase Receipt Exception:', err);
            return {
                success: false,
                error: err.message || 'فشل في ترحيل سند الاستلام',
            };
        }
    },

    /**
     * ترحيل مرتجع مشتريات — يُعكس حركة المخزون + يُنشئ قيد
     */
    async postPurchaseReturn(returnId: string): Promise<PostingResult> {
        try {
            const { data, error } = await supabase.rpc('post_purchase_return', {
                p_return_id: returnId,
            });

            if (error) {
                console.error('❌ Post Purchase Return Error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            console.log('✅ Purchase Return Posted:', data);
            return {
                success: true,
                journal_entry_id: data?.journal_entry_id,
                message: data?.message || 'تم ترحيل مرتجع المشتريات بنجاح',
                data,
            };
        } catch (err: any) {
            console.error('❌ Post Purchase Return Exception:', err);
            return {
                success: false,
                error: err.message || 'فشل في ترحيل مرتجع المشتريات',
            };
        }
    },

    /**
     * ترحيل مرتجع مبيعات — يُعيد المخزون + يُنشئ قيد
     */
    async postSalesReturn(returnId: string): Promise<PostingResult> {
        try {
            const { data, error } = await supabase.rpc('post_sales_return', {
                p_return_id: returnId,
            });

            if (error) {
                console.error('❌ Post Sales Return Error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            console.log('✅ Sales Return Posted:', data);
            return {
                success: true,
                journal_entry_id: data?.journal_entry_id,
                message: data?.message || 'تم ترحيل مرتجع المبيعات بنجاح',
                data,
            };
        } catch (err: any) {
            console.error('❌ Post Sales Return Exception:', err);
            return {
                success: false,
                error: err.message || 'فشل في ترحيل مرتجع المبيعات',
            };
        }
    },

    /**
     * جلب رصيد مورد أو عميل
     */
    async getPartyBalance(partyType: 'supplier' | 'customer', partyId: string): Promise<PartyBalance | null> {
        try {
            const { data, error } = await supabase.rpc('get_party_balance', {
                p_party_type: partyType,
                p_party_id: partyId,
            });

            if (error) {
                console.error('❌ Get Party Balance Error:', error);
                return null;
            }

            return data as PartyBalance;
        } catch (err: any) {
            console.error('❌ Get Party Balance Exception:', err);
            return null;
        }
    },

    /**
     * تحويل عرض سعر إلى أمر (شراء أو بيع)
     */
    async convertQuotationToOrder(
        quotationId: string,
        docCycle: 'purchase' | 'sales'
    ): Promise<PostingResult> {
        try {
            const { data, error } = await supabase.rpc('convert_quotation_to_order', {
                p_quotation_id: quotationId,
                p_doc_cycle: docCycle,
            });

            if (error) {
                console.error('❌ Convert Quotation Error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            console.log('✅ Quotation Converted:', data);
            return {
                success: true,
                message: data?.message || 'تم تحويل عرض السعر إلى أمر بنجاح',
                data,
            };
        } catch (err: any) {
            console.error('❌ Convert Quotation Exception:', err);
            return {
                success: false,
                error: err.message || 'فشل في تحويل عرض السعر',
            };
        }
    },

    /**
     * ترحيل عام — يحدد نوع المستند ويستدعي الدالة المناسبة
     * مفيد للاستخدام من الـ Grid مباشرة
     */
    async postDocument(
        docType: string,
        docId: string,
        extras?: { warehouseId?: string; items?: ReceiptItem[] }
    ): Promise<PostingResult> {
        switch (docType) {
            case 'purchase_invoice':
            case 'invoice_purchase':
            case 'purchase_transaction':
                return this.postPurchaseInvoice(docId);

            case 'sales_invoice':
            case 'invoice_sales':
            case 'invoice':
            case 'sales_transaction':
                return this.postSalesInvoice(docId);

            case 'purchase_receipt':
            case 'receipt':
                if (!extras?.warehouseId || !extras?.items) {
                    return {
                        success: false,
                        error: 'warehouse_id and items are required for receipt posting',
                    };
                }
                return this.postPurchaseReceipt(docId, extras.warehouseId, extras.items);

            case 'purchase_return':
            case 'return_purchase':
                return this.postPurchaseReturn(docId);

            case 'sales_return':
            case 'return_sales':
            case 'return':
                return this.postSalesReturn(docId);

            default:
                return {
                    success: false,
                    error: `Unsupported document type for posting: ${docType}`,
                };
        }
    },
};

export default postingService;
