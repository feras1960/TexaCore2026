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
    | 'delivered'
    | 'cancelled'
    | 'unposted'
    | 'reminder_sent';

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
    delivered: { icon: '📤', color: 'sky', labelAr: 'تم التسليم', labelEn: 'Delivered' },
    cancelled: { icon: '🚫', color: 'red', labelAr: 'تم الإلغاء', labelEn: 'Cancelled' },
    unposted: { icon: '↩️', color: 'orange', labelAr: 'إلغاء الترحيل', labelEn: 'Unposted' },
    reminder_sent: { icon: '🔔', color: 'yellow', labelAr: 'تذكير بالدفع', labelEn: 'Reminder Sent' },
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
};

export default activityLogService;
