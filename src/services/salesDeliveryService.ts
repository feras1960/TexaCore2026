/**
 * ═══════════════════════════════════════════════════════════════
 *  salesDeliveryService — خدمة التسليم للمبيعات
 * ═══════════════════════════════════════════════════════════════
 *  
 *  المرحلة 3: تأكيد إخراج البضاعة + ترحيل محاسبي + تحديث الحالة
 * 
 *  السيناريوهات المدعومة:
 *    1. store_pickup    → إخراج + ترحيل → sent_to_branch
 *    2. direct_delivery → إخراج + ترحيل → in_delivery  
 *    3. direct_pickup   → إخراج + ترحيل → delivered (فوري)
 * 
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { postingService } from './postingService';
import { telegramNotify } from './telegramNotificationService';

// ═══ Types ═══

export interface DeliveryOutInput {
    /** معرّف الفاتورة */
    transaction_id: string;
    /** نوع التسليم */
    delivery_method: 'store_pickup' | 'direct_delivery' | 'direct_pickup' | 'carrier';
    /** السائق (سيناريو 1+2) */
    driver_name?: string;
    driver_phone?: string;
    driver_id?: string;
    /** الفرع المستلم (سيناريو 1) */
    receiving_branch_id?: string;
    receiving_branch_name?: string;
    /** بيانات المستلم المباشر (سيناريو 3) */
    pickup_person_name?: string;
    pickup_person_id_number?: string;
    pickup_vehicle_number?: string;
    pickup_vehicle_type?: string;
    pickup_driver_name?: string;
    pickup_driver_phone?: string;
    /** البنود المسلّمة */
    items?: DeliveryItem[];
    /** ملاحظات */
    notes?: string;
    /** المعرّفات */
    user_id: string;
    user_name?: string;
    company_id: string;
    warehouse_id?: string;
}

export interface DeliveryItem {
    item_id: string;
    qty: number;
    material_id?: string;
    roll_ids?: string[];
}

export interface DeliveryResult {
    success: boolean;
    error?: string;
    new_stage?: string;
    stock_movement_id?: string;
    journal_entry_id?: string;
}

export interface DeliveryConfirmInput {
    transaction_id: string;
    user_id: string;
    user_name?: string;
    notes?: string;
}

// ═══ Service ═══

class SalesDeliveryService {

    /**
     * تأكيد إخراج البضاعة — الخطوة الرئيسية
     * 
     * 1. تحديث بيانات التسليم في الفاتورة
     * 2. إنشاء stock_movement (OUT)
     * 3. ترحيل القيود المحاسبية
     * 4. تحديث الحالة حسب نوع التسليم
     */
    async confirmDeliveryOut(input: DeliveryOutInput): Promise<DeliveryResult> {
        try {
            // ─── 1. جلب بيانات الفاتورة ───
            const { data: transaction, error: fetchError } = await supabase
                .from('sales_transactions')
                .select('*')
                .eq('id', input.transaction_id)
                .single();

            if (fetchError || !transaction) {
                return { success: false, error: fetchError?.message || 'الفاتورة غير موجودة' };
            }

            // التحقق من الحالة — يجب أن تكون confirmed
            if (transaction.stage !== 'confirmed') {
                return {
                    success: false,
                    error: `لا يمكن إخراج البضاعة — الحالة الحالية: ${transaction.stage}. يجب أن تكون "مؤكدة"`
                };
            }

            // ─── 2. تحديد الحالة الجديدة حسب نوع التسليم ───
            let newStage: string;
            switch (input.delivery_method) {
                case 'store_pickup':
                    newStage = 'sent_to_branch';
                    break;
                case 'direct_delivery':
                    newStage = 'in_delivery';
                    break;
                case 'direct_pickup':
                    newStage = 'delivered';
                    break;
                case 'carrier':
                    newStage = 'in_delivery';
                    break;
                default:
                    newStage = 'in_delivery';
            }

            // ─── 3. تحديث بيانات التسليم في الفاتورة ───
            const updatePayload: Record<string, any> = {
                delivery_method: input.delivery_method,
                stage: newStage,
                delivery_notes: input.notes || transaction.delivery_notes,
            };

            // حقول السائق (سيناريو 1+2)
            if (input.driver_name) updatePayload.driver_name = input.driver_name;
            if (input.driver_phone) updatePayload.driver_phone = input.driver_phone;
            if (input.driver_id) updatePayload.driver_id = input.driver_id;

            // حقول الفرع (سيناريو 1)
            if (input.receiving_branch_id) updatePayload.receiving_branch_id = input.receiving_branch_id;
            if (input.receiving_branch_name) updatePayload.receiving_branch_name = input.receiving_branch_name;

            // حقول المستلم المباشر (سيناريو 3)
            if (input.pickup_person_name) updatePayload.pickup_person_name = input.pickup_person_name;
            if (input.pickup_person_id_number) updatePayload.pickup_person_id_number = input.pickup_person_id_number;
            if (input.pickup_vehicle_number) updatePayload.pickup_vehicle_number = input.pickup_vehicle_number;
            if (input.pickup_vehicle_type) updatePayload.pickup_vehicle_type = input.pickup_vehicle_type;
            if (input.pickup_driver_name) updatePayload.pickup_driver_name = input.pickup_driver_name;
            if (input.pickup_driver_phone) updatePayload.pickup_driver_phone = input.pickup_driver_phone;

            // إذا كان تسليم مباشر → تسجيل وقت التسليم
            if (newStage === 'delivered') {
                updatePayload.delivered_at = new Date().toISOString();
                updatePayload.delivery_confirmed_at = new Date().toISOString();
                updatePayload.delivery_confirmed_by = input.user_id;
            }

            const { error: updateError } = await supabase
                .from('sales_transactions')
                .update(updatePayload)
                .eq('id', input.transaction_id);

            if (updateError) {
                return { success: false, error: `فشل تحديث الفاتورة: ${updateError.message}` };
            }

            // ─── 4. إنشاء stock_movement (OUT) ───
            let stockMovementId: string | undefined;
            try {
                const warehouseId = input.warehouse_id || transaction.warehouse_id;
                if (warehouseId) {
                    const movementPayload = {
                        company_id: input.company_id,
                        tenant_id: transaction.tenant_id,
                        warehouse_id: warehouseId,
                        movement_type: 'OUT',
                        source_type: 'sales_delivery',
                        source_id: input.transaction_id,
                        source_ref: transaction.invoice_no || transaction.order_no || transaction.draft_no,
                        notes: `إخراج بضاعة — فاتورة مبيعات ${transaction.invoice_no || transaction.draft_no}`,
                        status: 'completed',
                        created_by: input.user_id,
                    };

                    const { data: movement, error: movError } = await supabase
                        .from('stock_movements')
                        .insert(movementPayload)
                        .select('id')
                        .single();

                    if (movError) {
                        console.warn('⚠️ Stock movement creation failed:', movError.message);
                    } else {
                        stockMovementId = movement?.id;
                        console.log('✅ Stock movement created:', stockMovementId);
                    }
                }
            } catch (stockErr) {
                console.warn('⚠️ Stock movement error (non-blocking):', stockErr);
            }

            // ─── 5. ترحيل القيود المحاسبية ───
            let journalEntryId: string | undefined;
            try {
                const postResult = await postingService.postSalesInvoice(input.transaction_id);
                if (postResult.success) {
                    journalEntryId = postResult.journal_entry_id;
                    console.log('✅ Journal entry posted:', journalEntryId);
                } else {
                    console.warn('⚠️ Posting failed (non-blocking):', postResult.error);
                }
            } catch (postErr) {
                console.warn('⚠️ Posting error (non-blocking):', postErr);
            }

            // ─── 6. تسجيل في سجل النشاط ───
            try {
                await supabase.from('activity_log').insert({
                    table_name: 'sales_transactions',
                    document_id: input.transaction_id,
                    event: 'delivery_out',
                    user_id: input.user_id,
                    user_name: input.user_name || '',
                    details: {
                        delivery_method: input.delivery_method,
                        new_stage: newStage,
                        driver_name: input.driver_name || input.pickup_driver_name,
                        stock_movement_id: stockMovementId,
                        journal_entry_id: journalEntryId,
                    },
                    company_id: input.company_id,
                    tenant_id: transaction.tenant_id,
                });
            } catch (logErr) {
                console.warn('Activity log error (non-blocking):', logErr);
            }

            // ─── 7. 📱 Telegram notifications ───
            try {
                const docNo = transaction.invoice_no || transaction.order_no || transaction.draft_no || '';

                // Send driver delivery notification
                if (['in_delivery', 'sent_to_branch'].includes(newStage) && input.driver_name) {
                    telegramNotify.deliveryRoute(input.company_id, {
                        deliveryNumber: docNo,
                        customerName: transaction.customer_name || '-',
                        address: transaction.shipping_address || '-',
                        items: `${(input.items || []).length} بنود`,
                        collectAmount: transaction.balance || 0,
                        currency: transaction.currency || 'TRY',
                    });
                }

                // Send issue order notification (goods leaving warehouse)
                telegramNotify.issueOrder(input.company_id, {
                    orderNumber: docNo,
                    customerName: transaction.customer_name || '-',
                    warehouseId: input.warehouse_id || transaction.warehouse_id || undefined,
                    items: (input.items || []).map((i: any) => ({
                        name: i.description || '-',
                        qty: i.qty || 0,
                    })),
                    createdBy: input.user_name || undefined,
                });

                // Notify customer their goods are ready/dispatched
                if (transaction.customer_id) {
                    telegramNotify.customerGoodsReady(input.company_id, {
                        customerId: transaction.customer_id,
                        customerName: transaction.customer_name || '',
                        invoiceNumber: docNo,
                    });
                }
            } catch (tgErr) {
                console.warn('[Delivery] Telegram notification failed (non-blocking):', tgErr);
            }

            return {
                success: true,
                new_stage: newStage,
                stock_movement_id: stockMovementId,
                journal_entry_id: journalEntryId,
            };

        } catch (err: any) {
            console.error('❌ confirmDeliveryOut error:', err);
            return { success: false, error: err.message || 'خطأ غير متوقع' };
        }
    }

    /**
     * تأكيد استلام البضاعة — الخطوة الأخيرة
     * 
     * يُستخدم عندما:
     * - الفرع يؤكد استلام البضاعة (سيناريو 1: sent_to_branch → delivered)
     * - أمين المستودع يؤكد أن السائق سلّم (سيناريو 2: in_delivery → delivered)
     */
    async confirmDeliveryReceived(input: DeliveryConfirmInput): Promise<DeliveryResult> {
        try {
            const { data: transaction, error: fetchError } = await supabase
                .from('sales_transactions')
                .select('stage, tenant_id')
                .eq('id', input.transaction_id)
                .single();

            if (fetchError || !transaction) {
                return { success: false, error: 'الفاتورة غير موجودة' };
            }

            // التحقق — يجب أن تكون sent_to_branch أو in_delivery
            if (!['sent_to_branch', 'in_delivery'].includes(transaction.stage)) {
                return {
                    success: false,
                    error: `لا يمكن تأكيد التسليم — الحالة الحالية: ${transaction.stage}`
                };
            }

            const { error: updateError } = await supabase
                .from('sales_transactions')
                .update({
                    stage: 'delivered',
                    delivered_at: new Date().toISOString(),
                    delivery_confirmed_at: new Date().toISOString(),
                    delivery_confirmed_by: input.user_id,
                    delivery_notes: input.notes || undefined,
                })
                .eq('id', input.transaction_id);

            if (updateError) {
                return { success: false, error: updateError.message };
            }

            // Activity log
            try {
                await supabase.from('activity_log').insert({
                    table_name: 'sales_transactions',
                    document_id: input.transaction_id,
                    event: 'delivery_confirmed',
                    user_id: input.user_id,
                    user_name: input.user_name || '',
                    details: {
                        previous_stage: transaction.stage,
                        new_stage: 'delivered',
                        notes: input.notes,
                    },
                    tenant_id: transaction.tenant_id,
                });
            } catch (logErr) {
                console.warn('Activity log error:', logErr);
            }

            return { success: true, new_stage: 'delivered' };

        } catch (err: any) {
            console.error('❌ confirmDeliveryReceived error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * الحصول على حالة التسليم لفاتورة معينة
     */
    async getDeliveryStatus(transactionId: string) {
        const { data, error } = await supabase
            .from('sales_transactions')
            .select(`
                stage, delivery_method, 
                driver_name, driver_phone,
                receiving_branch_name,
                pickup_person_name, pickup_vehicle_number,
                delivered_at, delivery_confirmed_at, delivery_confirmed_by,
                delivery_notes
            `)
            .eq('id', transactionId)
            .single();

        if (error) return null;
        return data;
    }
}

export const salesDeliveryService = new SalesDeliveryService();
