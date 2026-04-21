/**
 * ═══════════════════════════════════════════════════════════════
 * 📜 Activity Log Service — سجل النشاط الموحد
 * ═══════════════════════════════════════════════════════════════
 * يسجّل كل حدث مهم في دورة حياة المستند:
 * الإنشاء، التأكيد، الترحيل، التعديل، الطباعة، الدفع، الإلغاء
 * 
 * يُخزّن في حقل activity_log (JSONB array) على المستند نفسه
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ═══ Types ═══

export type ActivityEventType =
    | 'created'
    | 'saved'
    | 'confirmed'
    | 'posted'
    | 'stock_updated'
    | 'edited'
    | 'printed'
    | 'paid'
    | 'partially_paid'
    | 'received'
    | 'partially_received'
    | 'delivered'
    | 'cancelled'
    | 'unposted'
    | 'reminder_sent'
    // ── دورة حياة المبيعات الكاملة ──
    | 'quotation'
    | 'order'
    | 'reserved'
    | 'approved'
    | 'loading'
    | 'dispatched'
    | 'in_transit'
    | 'at_branch'
    | 'reopened'
    | 'stage_changed';

export type DocumentTable = 'purchase_transactions' | 'sales_transactions' | 'journal_entries' | 'containers';

export interface ActivityLogEntry {
    event: ActivityEventType;
    at: string;
    by: string;
    by_name: string;
    details?: Record<string, any> | null;
}

export interface LogEventInput {
    table: DocumentTable;
    documentId: string;
    event: ActivityEventType;
    userId: string;
    userName: string;
    details?: Record<string, any> | null;
}

// ═══ Event Metadata (for UI display) ═══

export const ACTIVITY_EVENT_CONFIG: Record<ActivityEventType, {
    icon: string;
    color: string;
    labelAr: string;
    labelEn: string;
}> = {
    created: { icon: '📝', color: 'blue', labelAr: 'تم الإنشاء', labelEn: 'Created' },
    saved: { icon: '💾', color: 'gray', labelAr: 'تم الحفظ', labelEn: 'Saved' },
    confirmed: { icon: '✅', color: 'green', labelAr: 'تم التأكيد', labelEn: 'Confirmed' },
    posted: { icon: '📊', color: 'purple', labelAr: 'تم الترحيل', labelEn: 'Posted' },
    stock_updated: { icon: '📦', color: 'emerald', labelAr: 'تحديث المخزون', labelEn: 'Stock Updated' },
    edited: { icon: '⚡', color: 'orange', labelAr: 'تعديل مباشر', labelEn: 'Edited' },
    printed: { icon: '🖨️', color: 'slate', labelAr: 'تمت الطباعة', labelEn: 'Printed' },
    paid: { icon: '💰', color: 'green', labelAr: 'تم الدفع', labelEn: 'Paid' },
    partially_paid: { icon: '💳', color: 'yellow', labelAr: 'دفع جزئي', labelEn: 'Partially Paid' },
    received: { icon: '📥', color: 'sky', labelAr: 'تم الاستلام', labelEn: 'Received' },
    partially_received: { icon: '📥', color: 'teal', labelAr: 'استلام جزئي', labelEn: 'Partially Received' },
    delivered: { icon: '📤', color: 'sky', labelAr: 'تم التسليم للعميل', labelEn: 'Delivered to Customer' },
    cancelled: { icon: '🚫', color: 'red', labelAr: 'تم الإلغاء', labelEn: 'Cancelled' },
    unposted: { icon: '↩️', color: 'orange', labelAr: 'إلغاء الترحيل', labelEn: 'Unposted' },
    reminder_sent: { icon: '🔔', color: 'yellow', labelAr: 'تذكير بالدفع', labelEn: 'Reminder Sent' },
    // ── دورة حياة المبيعات الكاملة ──
    quotation: { icon: '📋', color: 'indigo', labelAr: 'عرض سعر', labelEn: 'Quotation Issued' },
    order: { icon: '🛒', color: 'blue', labelAr: 'أمر بيع', labelEn: 'Order Placed' },
    reserved: { icon: '🔒', color: 'cyan', labelAr: 'حجز بضاعة', labelEn: 'Stock Reserved' },
    approved: { icon: '✅', color: 'green', labelAr: 'تم الاعتماد', labelEn: 'Approved' },
    loading: { icon: '📦', color: 'amber', labelAr: 'بدء التجميع والتحميل', labelEn: 'Loading Started' },
    dispatched: { icon: '🚚', color: 'orange', labelAr: 'تم الإخراج من المستودع', labelEn: 'Dispatched from Warehouse' },
    in_transit: { icon: '🚛', color: 'blue', labelAr: 'في الطريق للفرع', labelEn: 'In Transit to Branch' },
    at_branch: { icon: '🏪', color: 'teal', labelAr: 'وصل الفرع', labelEn: 'Arrived at Branch' },
    reopened: { icon: '🔄', color: 'gray', labelAr: 'إعادة فتح', labelEn: 'Reopened' },
    stage_changed: { icon: '🔀', color: 'purple', labelAr: 'تغيير مرحلة', labelEn: 'Stage Changed' },
};

// ═══════════════════════════════════════════════════════════════
// Main Service
// ═══════════════════════════════════════════════════════════════

export const activityLogService = {

    /**
     * تسجيل حدث في سجل النشاط
     * يقرأ السجل الحالي → يُضيف الحدث → يحفظ
     */
    async logEvent(input: LogEventInput): Promise<void> {
        const { table, documentId, event, userId, userName, details } = input;

        try {
            // Read current log
            const { data: doc } = await supabase
                .from(table)
                .select('activity_log')
                .eq('id', documentId)
                .single();

            const currentLog: ActivityLogEntry[] = (doc?.activity_log as ActivityLogEntry[]) || [];

            // Append new event
            const newEntry: ActivityLogEntry = {
                event,
                at: new Date().toISOString(),
                by: userId,
                by_name: userName,
                details: details || null,
            };

            currentLog.push(newEntry);

            // Save
            await supabase
                .from(table)
                .update({ activity_log: currentLog })
                .eq('id', documentId);

            const config = ACTIVITY_EVENT_CONFIG[event];
            console.log(`${config.icon} [ActivityLog] ${event} → ${table}/${documentId.slice(0, 8)} by ${userName}`);

        } catch (error) {
            // Activity logging should never break the main flow
            console.warn(`⚠️ [ActivityLog] Failed to log ${event}:`, error);
        }
    },

    /**
     * تسجيل عدة أحداث دفعة واحدة (مثل: posted + stock_updated)
     */
    async logEvents(inputs: LogEventInput[]): Promise<void> {
        for (const input of inputs) {
            await this.logEvent(input);
        }
    },

    /**
     * قراءة سجل النشاط لمستند
     * ✅ يُنظّف الإدخالات: يُزيل تلك التي لا تحتوي على تاريخ صالح
     */
    async getLog(table: DocumentTable, documentId: string): Promise<ActivityLogEntry[]> {
        const { data } = await supabase
            .from(table)
            .select('activity_log, created_at')
            .eq('id', documentId)
            .single();

        const raw = (data?.activity_log as any[]) || [];

        // Sanitize each entry
        const cleaned: ActivityLogEntry[] = raw
            .filter((entry: any) => {
                if (!entry || typeof entry !== 'object') return false;
                // Must have a valid event type
                if (!entry.event || typeof entry.event !== 'string') return false;
                return true;
            })
            .map((entry: any) => {
                // Fix the `at` field: use entry.at if valid, else fallback to now
                let at = entry.at;
                if (!at || typeof at !== 'string' || at.trim() === '' || isNaN(new Date(at).getTime())) {
                    // Try common alternative field names
                    at = entry.timestamp || entry.date || entry.created_at || new Date().toISOString();
                    // Validate the fallback too
                    if (isNaN(new Date(at).getTime())) {
                        at = new Date().toISOString();
                    }
                }

                return {
                    event: entry.event as ActivityEventType,
                    at,
                    by: entry.by || entry.user_id || '',
                    by_name: entry.by_name || entry.userName || entry.user_name || 'النظام',
                    details: entry.details || null,
                } satisfies ActivityLogEntry;
            });

        // If no entries at all, synthesize a "created" event from the document's created_at
        if (cleaned.length === 0 && data?.created_at) {
            cleaned.push({
                event: 'created',
                at: data.created_at,
                by: '',
                by_name: 'النظام',
                details: null,
            });
        }

        return cleaned;
    },

    /**
     * تسجيل حدث التعديل المباشر (يشمل تفاصيل التغييرات)
     */
    async logEdit(
        table: DocumentTable,
        documentId: string,
        userId: string,
        userName: string,
        changes: Record<string, { old: any; new: any }>,
        reason?: string
    ): Promise<void> {
        // 1. Log in activity_log
        await this.logEvent({
            table,
            documentId,
            event: 'edited',
            userId,
            userName,
            details: { reason, changes },
        });

        // 2. Also append to edit_history + update edit metadata
        try {
            const { data: doc } = await supabase
                .from(table)
                .select('edit_history, edit_count')
                .eq('id', documentId)
                .single();

            const editHistory = (doc?.edit_history as any[]) || [];
            const editCount = (doc?.edit_count || 0) + 1;

            editHistory.push({
                edited_at: new Date().toISOString(),
                edited_by: userId,
                edited_by_name: userName,
                reason: reason || null,
                changes,
            });

            await supabase
                .from(table)
                .update({
                    edit_history: editHistory,
                    edit_count: editCount,
                    last_edited_at: new Date().toISOString(),
                    last_edited_by: userId,
                })
                .eq('id', documentId);

        } catch (error) {
            console.warn('⚠️ [ActivityLog] Failed to update edit_history:', error);
        }
    },

    /**
     * Helper: تحديد اسم الجدول من نوع المستند
     */
    getTable(docType: 'purchase' | 'sales' | 'journal'): DocumentTable {
        switch (docType) {
            case 'purchase': return 'purchase_transactions';
            case 'sales': return 'sales_transactions';
            case 'journal': return 'journal_entries';
        }
    },

    /**
     * 🔄 تسجيل حدث دورة حياة معزز
     * يستخرج تلقائياً: الفرع، المستودع، العميل/المورد، عدد البنود، المبلغ
     * من بيانات المستند نفسه — لا يحتاج المُستدعي لتوفير هذه البيانات يدوياً
     */
    async logLifecycleEvent(input: LogEventInput & {
        /** بيانات المستند الحالية (لاستخراج الفرع والمستودع والعميل) */
        documentData?: Record<string, any> | null;
        /** المرحلة السابقة (للمقارنة) */
        stageFrom?: string;
        /** المرحلة الجديدة */
        stageTo?: string;
    }): Promise<void> {
        const { documentData, stageFrom, stageTo, ...baseInput } = input;
        const enrichedDetails: Record<string, any> = { ...baseInput.details };

        // ═══ استخراج البيانات التلقائي من المستند ═══
        if (documentData) {
            // الفرع
            if (documentData.branch_name || documentData.branch_name_ar) {
                enrichedDetails.branch_name = documentData.branch_name || documentData.branch_name_ar;
            }

            // المستودع
            if (documentData.warehouse_name || documentData.warehouse_name_ar) {
                enrichedDetails.warehouse_name = documentData.warehouse_name || documentData.warehouse_name_ar;
            }

            // العميل/المورد
            if (documentData.party_name || documentData.customer_name || documentData.supplier_name) {
                enrichedDetails.party_name = documentData.party_name || documentData.customer_name || documentData.supplier_name;
            }

            // عدد البنود
            const items = documentData.items || documentData.line_items;
            if (Array.isArray(items)) {
                enrichedDetails.items_count = items.length;
            }

            // المبلغ الإجمالي
            if (documentData.total_amount || documentData.grand_total || documentData.total) {
                enrichedDetails.total_amount = documentData.total_amount || documentData.grand_total || documentData.total;
            }

            // العملة
            if (documentData.currency) {
                enrichedDetails.currency = documentData.currency;
            }

            // رقم الفاتورة
            if (documentData.invoice_no || documentData.order_number || documentData.document_number) {
                enrichedDetails.document_number = documentData.invoice_no || documentData.order_number || documentData.document_number;
            }
        }

        // تسجيل تغيير المرحلة
        if (stageFrom && stageTo) {
            enrichedDetails.stage_from = stageFrom;
            enrichedDetails.stage_to = stageTo;
        }

        await this.logEvent({
            ...baseInput,
            details: Object.keys(enrichedDetails).length > 0 ? enrichedDetails : null,
        });
    },

    /**
     * 🧑‍💻 الحصول على سياق المستخدم الحالي من الجلسة
     * مفيد لاستدعاء logEvent/logLifecycleEvent بدون تمرير userId/userName يدوياً
     */
    async getCurrentUserContext(): Promise<{ userId: string; userName: string } | null> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return null;
            return {
                userId: user.id,
                userName: user.user_metadata?.full_name || user.email || 'System',
            };
        } catch {
            return null;
        }
    },
};

export default activityLogService;
