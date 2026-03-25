/**
 * ═══════════════════════════════════════════════════════════════
 * 📦 Purchase Transaction Service
 * ═══════════════════════════════════════════════════════════════
 * خدمة إدارة دورة المشتريات الموحدة
 * CRUD + Stage Transitions + Items Management
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { activityLogService } from './activityLogService';
import { telegramNotify } from './telegramNotificationService';
import type {
    PurchaseTransaction,
    PurchaseTransactionItem,
    CreatePurchaseTransactionInput,
    TransactionItemInput,
    TransactionFilter,
    StageTransitionResult,
    AdvanceStageInput,
} from '@/types/transactions';


// ═══════════════════════════════════════════════════════════════
// 📦 CRUD — العمليات الأساسية
// ═══════════════════════════════════════════════════════════════

export const purchaseTransactionService = {

    /**
     * إنشاء معاملة شراء جديدة (مسودة)
     */
    async create(input: CreatePurchaseTransactionInput): Promise<PurchaseTransaction | null> {
        const { data, error } = await supabase
            .from('purchase_transactions')
            .insert({
                tenant_id: input.tenant_id,
                company_id: input.company_id,
                branch_id: input.branch_id || null,
                supplier_id: input.supplier_id || null,
                supplier_name: input.supplier_name || null,
                warehouse_id: input.warehouse_id || null,
                currency: input.currency || 'SAR',
                exchange_rate: input.exchange_rate || 1,
                doc_date: input.doc_date || new Date().toISOString().split('T')[0],
                due_date: input.due_date || null,
                payment_terms_days: input.payment_terms_days || 30,
                receipt_mode: input.receipt_mode || 'direct',
                notes: input.notes || null,
                supplier_notes: input.supplier_notes || null,
                internal_notes: input.internal_notes || null,
                tags: input.tags || [],
                stage: 'draft',
                created_by: input.created_by || null,
                created_by_name: input.created_by_name || null,
                auto_update_stock: input.auto_update_stock || false,
                stock_warehouse_id: input.stock_warehouse_id || null,
            })
            .select()
            .single();

        if (error) {
            console.error('❌ خطأ في إنشاء معاملة الشراء:', error.message);
            return null;
        }

        // 📜 Activity Log: تسجيل الإنشاء
        if (data) {
            activityLogService.logEvent({
                table: 'purchase_transactions',
                documentId: data.id,
                event: 'created',
                userId: input.created_by || 'system',
                userName: input.created_by_name || 'النظام',
            });
        }

        return data as PurchaseTransaction;
    },


    /**
     * جلب معاملة شراء واحدة مع البنود
     */
    async fetchById(id: string): Promise<PurchaseTransaction | null> {
        const { data, error } = await supabase
            .from('purchase_transactions')
            .select(`
        *,
        items:purchase_transaction_items(*)
      `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ خطأ في جلب المعاملة:', error.message);
            return null;
        }

        return data as PurchaseTransaction;
    },


    /**
     * جلب قائمة المعاملات مع فلاتر
     */
    async fetchAll(
        companyId: string,
        filters: TransactionFilter = {}
    ): Promise<{ data: PurchaseTransaction[]; count: number }> {
        let query = supabase
            .from('purchase_transactions')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId)
            .eq('is_active', true);

        // الفلاتر
        if (filters.stage) {
            query = query.eq('stage', filters.stage);
        }
        if (filters.stages && filters.stages.length > 0) {
            query = query.in('stage', filters.stages);
        }
        if (filters.supplier_id) {
            query = query.eq('supplier_id', filters.supplier_id);
        }
        if (filters.is_return !== undefined) {
            query = query.eq('is_return', filters.is_return);
        }
        if (filters.is_posted !== undefined) {
            query = query.eq('is_posted', filters.is_posted);
        }
        if (filters.date_from) {
            query = query.gte('doc_date', filters.date_from);
        }
        if (filters.date_to) {
            query = query.lte('doc_date', filters.date_to);
        }
        if (filters.min_amount) {
            query = query.gte('total_amount', filters.min_amount);
        }
        if (filters.max_amount) {
            query = query.lte('total_amount', filters.max_amount);
        }
        if (filters.search) {
            query = query.or(
                `supplier_name.ilike.%${filters.search}%,` +
                `invoice_no.ilike.%${filters.search}%,` +
                `order_no.ilike.%${filters.search}%,` +
                `quotation_no.ilike.%${filters.search}%,` +
                `notes.ilike.%${filters.search}%`
            );
        }

        // الترتيب
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order === 'asc' ? true : false;
        query = query.order(sortBy, { ascending: sortOrder });

        // التصفح
        if (filters.page && filters.page_size) {
            const from = (filters.page - 1) * filters.page_size;
            const to = from + filters.page_size - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('❌ خطأ في جلب المعاملات:', error.message);
            return { data: [], count: 0 };
        }

        return {
            data: (data || []) as PurchaseTransaction[],
            count: count || 0,
        };
    },


    /**
     * تحديث معاملة (في مرحلة المسودة فقط)
     */
    async update(
        id: string,
        updates: Partial<PurchaseTransaction>,
        expectedVersion?: number
    ): Promise<PurchaseTransaction | null> {
        // حذف الحقول المحسوبة والمقيدة
        const { id: _id, items: _items, version: _v, balance: _b, ...cleanUpdates } = updates as any;

        let query = supabase
            .from('purchase_transactions')
            .update(cleanUpdates)
            .eq('id', id);

        // ✅ Optimistic Locking
        if (expectedVersion !== undefined) {
            query = query.eq('version', expectedVersion);
        }

        const { data, error } = await query.select().single();

        if (error) {
            if (error.code === 'PGRST116') {
                // لا يوجد سجل — ربما version تغيّر
                console.error('⚠️ تضارب في التعديل — يرجى إعادة تحميل البيانات');
                return null;
            }
            console.error('❌ خطأ في تحديث المعاملة:', error.message);
            return null;
        }

        return data as PurchaseTransaction;
    },


    /**
     * حذف معاملة (soft delete = is_active: false)
     */
    async softDelete(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('purchase_transactions')
            .update({ is_active: false })
            .eq('id', id)
            .eq('stage', 'draft');  // فقط المسودات يمكن حذفها

        if (error) {
            console.error('❌ خطأ في حذف المعاملة:', error.message);
            return false;
        }
        return true;
    },


    // ═══════════════════════════════════════════════════════════════
    // 🔄 Stage Transitions — تحويل المراحل
    // ═══════════════════════════════════════════════════════════════

    /**
     * تحويل مرحلة المعاملة — تستدعي الـ database function
     */
    async advanceStage(input: AdvanceStageInput): Promise<StageTransitionResult> {
        const { data, error } = await supabase.rpc('advance_transaction_stage', {
            p_type: 'purchase',
            p_transaction_id: input.transaction_id,
            p_new_stage: input.new_stage,
            p_user_id: input.user_id,
            p_user_name: input.user_name || null,
            p_notes: input.notes || null,
            p_cancellation_reason: input.cancellation_reason || null,
        });

        if (error) {
            console.error('❌ خطأ في تحويل المرحلة:', error.message);
            return { success: false, error: error.message };
        }

        // 📜 Activity Log: تسجيل تحويل المرحلة
        const stageEventMap: Record<string, string> = {
            confirmed: 'confirmed',
            received: 'received',
            cancelled: 'cancelled',
        };
        const logEvent = stageEventMap[input.new_stage];
        if (logEvent) {
            activityLogService.logEvent({
                table: 'purchase_transactions',
                documentId: input.transaction_id,
                event: logEvent as any,
                userId: input.user_id,
                userName: input.user_name || '',
                details: { new_stage: input.new_stage, notes: input.notes },
            });
        }

        // 📱 Telegram: إشعار عند تأكيد أو استلام مشتريات
        if (['received', 'receipt', 'confirmed'].includes(input.new_stage)) {
            this._sendPurchaseStageNotification(input).catch(() => { });
        }

        return data as StageTransitionResult;
    },


    /**
     * جلب سجل المراحل لمعاملة
     */
    async fetchStageHistory(transactionId: string) {
        const { data, error } = await supabase
            .from('transaction_stage_log')
            .select('*')
            .eq('transaction_type', 'purchase')
            .eq('transaction_id', transactionId)
            .order('performed_at', { ascending: true });

        if (error) {
            console.error('❌ خطأ في جلب سجل المراحل:', error.message);
            return [];
        }

        return data || [];
    },


    // ═══════════════════════════════════════════════════════════════
    // 📋 Items — إدارة البنود
    // ═══════════════════════════════════════════════════════════════

    /**
     * إضافة بنود لمعاملة
     */
    async addItems(
        transactionId: string,
        items: TransactionItemInput[]
    ): Promise<PurchaseTransactionItem[]> {
        const rows = items.map((item, index) => ({
            transaction_id: transactionId,
            line_number: index + 1,
            product_id: item.product_id || null,
            material_id: item.material_id || null,
            item_code: item.item_code || null,
            description: item.description || null,
            description_ar: item.description_ar || null,
            quantity: item.quantity,
            unit: item.unit || 'piece',
            unit_price: item.unit_price,
            discount_amount: item.discount_amount || 0,
            discount_percent: item.discount_percent || 0,
            tax_rate: item.tax_rate || 0,
            // حساب المبالغ
            tax_amount: ((item.quantity * item.unit_price) - (item.discount_amount || 0)) * ((item.tax_rate || 0) / 100),
            subtotal: (item.quantity * item.unit_price) - (item.discount_amount || 0),
            total: ((item.quantity * item.unit_price) - (item.discount_amount || 0)) * (1 + ((item.tax_rate || 0) / 100)),
            color_id: item.color_id || null,
            color_name: item.color_name || null,
            roll_id: item.roll_id || null,
            roll_code: item.roll_code || null,
            rolls_count: item.rolls_count || null,
            warehouse_id: item.warehouse_id || null,
            notes: item.notes || null,
        }));

        const { data, error } = await supabase
            .from('purchase_transaction_items')
            .insert(rows)
            .select();

        if (error) {
            console.error('❌ خطأ في إضافة البنود:', error.message);
            return [];
        }

        // إعادة حساب إجماليات المعاملة
        await this.recalculateTotals(transactionId);

        return (data || []) as PurchaseTransactionItem[];
    },


    /**
     * تحديث بند واحد
     */
    async updateItem(
        itemId: string,
        updates: Partial<TransactionItemInput>
    ): Promise<PurchaseTransactionItem | null> {
        const { data, error } = await supabase
            .from('purchase_transaction_items')
            .update(updates)
            .eq('id', itemId)
            .select()
            .single();

        if (error) {
            console.error('❌ خطأ في تحديث البند:', error.message);
            return null;
        }

        // إعادة حساب الإجماليات
        if (data) {
            await this.recalculateTotals(data.transaction_id);
        }

        return data as PurchaseTransactionItem;
    },


    /**
     * حذف بند
     */
    async deleteItem(itemId: string, transactionId: string): Promise<boolean> {
        const { error } = await supabase
            .from('purchase_transaction_items')
            .delete()
            .eq('id', itemId);

        if (error) {
            console.error('❌ خطأ في حذف البند:', error.message);
            return false;
        }

        // إعادة حساب الإجماليات
        await this.recalculateTotals(transactionId);
        return true;
    },


    /**
     * استبدال كل البنود (delete all then insert)
     */
    async replaceItems(
        transactionId: string,
        items: TransactionItemInput[]
    ): Promise<PurchaseTransactionItem[]> {
        // حذف الحالية
        await supabase
            .from('purchase_transaction_items')
            .delete()
            .eq('transaction_id', transactionId);

        // إدراج الجديدة
        if (items.length > 0) {
            return this.addItems(transactionId, items);
        }

        await this.recalculateTotals(transactionId);
        return [];
    },


    /**
     * جلب بنود معاملة
     */
    async fetchItems(transactionId: string): Promise<PurchaseTransactionItem[]> {
        const { data, error } = await supabase
            .from('purchase_transaction_items')
            .select('*')
            .eq('transaction_id', transactionId)
            .order('line_number', { ascending: true });

        if (error) {
            console.error('❌ خطأ في جلب البنود:', error.message);
            return [];
        }

        return (data || []) as PurchaseTransactionItem[];
    },


    // ═══════════════════════════════════════════════════════════════
    // 🧮 الحسابات — Recalculate
    // ═══════════════════════════════════════════════════════════════

    /**
     * إعادة حساب إجماليات المعاملة من البنود
     */
    async recalculateTotals(transactionId: string): Promise<void> {
        const items = await this.fetchItems(transactionId);

        const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
        const taxAmount = items.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

        await supabase
            .from('purchase_transactions')
            .update({
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
            })
            .eq('id', transactionId);
    },


    // ═══════════════════════════════════════════════════════════════
    // 🖨️ تتبع الطباعة
    // ═══════════════════════════════════════════════════════════════

    /**
     * تسجيل طباعة المستند
     */
    async recordPrint(id: string, userId: string): Promise<void> {
        await supabase.rpc('', {}).then(() => { }); // placeholder

        // استخدام UPDATE مباشر مع increment
        const { data: current } = await supabase
            .from('purchase_transactions')
            .select('printed_count')
            .eq('id', id)
            .single();

        if (current) {
            await supabase
                .from('purchase_transactions')
                .update({
                    printed_count: (current.printed_count || 0) + 1,
                    last_printed_at: new Date().toISOString(),
                    last_printed_by: userId,
                })
                .eq('id', id);

            // 📜 Activity Log: تسجيل الطباعة
            activityLogService.logEvent({
                table: 'purchase_transactions',
                documentId: id,
                event: 'printed',
                userId,
                userName: '',
                details: { print_count: (current.printed_count || 0) + 1 },
            });
        }
    },


    // ═══════════════════════════════════════════════════════════════
    // ⏰ تتبع التذكيرات
    // ═══════════════════════════════════════════════════════════════

    /**
     * تسجيل إرسال تذكير
     */
    async recordReminder(id: string): Promise<void> {
        const { data: current } = await supabase
            .from('purchase_transactions')
            .select('reminder_count')
            .eq('id', id)
            .single();

        if (current) {
            await supabase
                .from('purchase_transactions')
                .update({
                    reminder_count: (current.reminder_count || 0) + 1,
                    last_reminder_sent_at: new Date().toISOString(),
                })
                .eq('id', id);
        }
    },


    // ═══════════════════════════════════════════════════════════════
    // 🔄 المرتجعات
    // ═══════════════════════════════════════════════════════════════

    /**
     * إنشاء مرتجع من معاملة أصلية
     */
    async createReturn(
        originalId: string,
        input: CreatePurchaseTransactionInput
    ): Promise<PurchaseTransaction | null> {
        const result = await this.create({
            ...input,
        });

        if (result) {
            // ربط بالمعاملة الأصلية
            await supabase
                .from('purchase_transactions')
                .update({
                    original_transaction_id: originalId,
                    is_return: true,
                })
                .eq('id', result.id);

            // إعادة جلب البيانات المحدثة
            return this.fetchById(result.id);
        }

        return null;
    },


    // ═══════════════════════════════════════════════════════════════
    // 📊 إحصاءات مختصرة
    // ═══════════════════════════════════════════════════════════════

    /**
     * عدد المعاملات حسب المرحلة
     */
    async getStageStats(companyId: string): Promise<Record<string, number>> {
        const { data, error } = await supabase
            .from('purchase_transactions')
            .select('stage')
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (error || !data) return {};

        const stats: Record<string, number> = {};
        data.forEach(row => {
            stats[row.stage] = (stats[row.stage] || 0) + 1;
        });

        return stats;
    },


    // ═══════════════════════════════════════════════════════════════
    // 📱 Telegram Notification Helpers
    // ═══════════════════════════════════════════════════════════════

    async _sendPurchaseStageNotification(input: AdvanceStageInput): Promise<void> {
        try {
            const { data: tx } = await supabase
                .from('purchase_transactions')
                .select('id, receipt_no, order_no, invoice_no, supplier_name, total_amount, currency, warehouse_id, company_id, notes')
                .eq('id', input.transaction_id)
                .single();
            if (!tx) return;

            // Fetch items WITH material_id and color
            const { data: items } = await supabase
                .from('purchase_transaction_items')
                .select('material_id, description, description_ar, quantity, unit, rolls_count, color_name')
                .eq('transaction_id', input.transaction_id);

            // Fetch warehouse name
            let warehouseName = '';
            if (tx.warehouse_id) {
                const { data: wh } = await supabase
                    .from('warehouses')
                    .select('name_ar')
                    .eq('id', tx.warehouse_id)
                    .maybeSingle();
                warehouseName = wh?.name_ar || '';
            }

            const docNo = tx.receipt_no || tx.order_no || tx.invoice_no || tx.id.substring(0, 8);
            const richItems = (items || []).map((i: any) => ({
                materialId: i.material_id || undefined,
                name: i.description_ar || i.description || '-',
                qty: i.quantity || 0,
                unit: i.unit || 'م',
                rolls: i.rolls_count || undefined,
                color: i.color_name || undefined,
            }));

            if (['received', 'receipt'].includes(input.new_stage)) {
                // 📥 Rich warehouse receiving order (with suggested bin locations!)
                telegramNotify.warehouseReceivingOrder(tx.company_id, {
                    orderNumber: docNo,
                    supplierName: tx.supplier_name || '-',
                    warehouseId: tx.warehouse_id || undefined,
                    warehouseName: warehouseName || undefined,
                    items: richItems,
                    totalAmount: tx.total_amount || 0,
                    currency: tx.currency || 'TRY',
                    notes: tx.notes || undefined,
                    createdBy: input.user_name || undefined,
                });
            }
        } catch (err) {
            console.warn('[PurchaseService] Telegram notification failed (non-blocking):', err);
        }
    },

};

export default purchaseTransactionService;
