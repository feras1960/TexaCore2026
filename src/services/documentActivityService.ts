/**
 * 📝 Document Activity Service — خدمة سجل نشاط المستند
 * 
 * تجمع بين:
 * - ملاحظات المستخدم (يكتبها يدوياً)
 * - أحداث المستند المهمة (إرسال عرض سعر، تأكيد، ترحيل...)
 * - أحداث النظام التلقائية (تغيير حالة، إرفاق ملف...)
 * 
 * جدول: document_activity
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** أنواع النشاط */
export type ActivityType = 'note' | 'event' | 'milestone' | 'system';

/** أكواد الأحداث المحددة مسبقاً */
export type EventCode =
    // أحداث دورة حياة المستند (الأهم)
    | 'created'               // تم إنشاء المستند
    | 'edited'                // تم تعديل المستند
    | 'items_updated'         // تم تعديل البنود
    // أحداث المبيعات
    | 'quotation_sent'        // تم إرسال عرض السعر
    | 'quotation_approved'    // تم قبول عرض السعر
    | 'quotation_rejected'    // تم رفض عرض السعر
    | 'order_created'         // تم إنشاء الأمر
    | 'order_confirmed'       // تم تأكيد الأمر
    | 'invoice_created'       // تم إنشاء الفاتورة
    | 'invoice_sent'          // تم إرسال الفاتورة
    // أحداث المشتريات
    | 'po_sent'               // تم إرسال أمر الشراء
    | 'po_confirmed'          // تم تأكيد أمر الشراء
    | 'goods_received'        // تم استلام البضاعة
    | 'goods_partial'         // استلام جزئي
    // أحداث مالية
    | 'payment_received'      // تم استلام دفعة
    | 'payment_sent'          // تم إرسال دفعة
    | 'payment_partial'       // دفعة جزئية
    // أحداث المستند العامة
    | 'status_changed'        // تغيير الحالة
    | 'confirmed'             // تم التأكيد
    | 'unconfirmed'           // إلغاء التأكيد
    | 'posted'                // تم الترحيل
    | 'unposted'              // إلغاء الترحيل
    | 'cancelled'             // تم الإلغاء
    | 'printed'               // تم الطباعة
    | 'exported'              // تم التصدير
    | 'duplicated'            // تم النسخ
    | 'attachment_added'      // تم إرفاق ملف
    | 'attachment_removed'    // تم حذف مرفق
    // أحداث المراحل (تلقائية)
    | 'reservation_created'   // تم حجز البضاعة
    | 'receipt_started'       // بدء الاستلام
    | 'partially_received'    // استلام جزئي
    | 'receipt_received'      // تم الاستلام الكامل
    | 'delivery_started'      // بدء التسليم
    | 'fully_paid'            // تم السداد الكامل
    | 'reopened'              // تم إعادة الفتح
    // اتصالات
    | 'phone_call'            // مكالمة هاتفية
    | 'email_sent'            // تم إرسال بريد
    | 'whatsapp_sent'         // تم إرسال واتساب
    | 'meeting'               // اجتماع
    | 'follow_up'             // متابعة
    // عام
    | 'note'                  // ملاحظة عامة
    | 'reminder'              // تذكير
    | 'custom'               // حدث مخصص
    // أحداث الضريبة الجمركية
    | 'tax_posted'            // تم ترحيل الضريبة
    | 'tax_edited'            // تم تعديل الضريبة
    // أحداث المرفقات
    | 'document_uploaded'     // تم رفع مرفق
    | 'document_deleted';     // تم حذف مرفق

/** سجل نشاط واحد */
export interface DocumentActivityEntry {
    id: string;
    tenant_id: string;
    entity_type: string;
    entity_id: string;
    activity_type: ActivityType;
    content: string | null;
    event_code: EventCode | string | null;
    metadata: Record<string, any>;
    is_pinned: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    user_name?: string;
    user_avatar?: string;
}

/** معاملات إضافة نشاط */
export interface AddActivityParams {
    entityType: string;
    entityId: string;
    tenantId: string;
    activityType: ActivityType;
    content?: string;
    eventCode?: EventCode | string;
    metadata?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// Event Definitions — تعريفات الأحداث مع الأيقونات والألوان
// ═══════════════════════════════════════════════════════════════

export interface EventDefinition {
    code: EventCode;
    labelAr: string;
    labelEn: string;
    icon: string;          // lucide icon name
    color: string;         // tailwind color class
    bgColor: string;       // background color class
    activityType: ActivityType;
    category: 'sales' | 'purchase' | 'finance' | 'document' | 'communication' | 'general';
}

export const EVENT_DEFINITIONS: Record<string, EventDefinition> = {
    // ── دورة حياة المستند (الأساسية) ──
    created: { code: 'created' as any, labelAr: 'تم الإنشاء', labelEn: 'Created', icon: 'FilePlus', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40', activityType: 'milestone', category: 'document' },
    edited: { code: 'edited' as any, labelAr: 'تم التعديل', labelEn: 'Edited', icon: 'FileEdit', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40', activityType: 'event', category: 'document' },
    items_updated: { code: 'items_updated' as any, labelAr: 'تعديل البنود', labelEn: 'Items Updated', icon: 'PackageOpen', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'document' },

    // ── المبيعات ──
    quotation_sent: { code: 'quotation_sent', labelAr: 'تم إرسال عرض السعر', labelEn: 'Quotation Sent', icon: 'Send', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40', activityType: 'event', category: 'sales' },
    quotation_approved: { code: 'quotation_approved', labelAr: 'تم قبول عرض السعر', labelEn: 'Quotation Approved', icon: 'CheckCircle', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'sales' },
    quotation_rejected: { code: 'quotation_rejected', labelAr: 'تم رفض عرض السعر', labelEn: 'Quotation Rejected', icon: 'XCircle', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/40', activityType: 'event', category: 'sales' },
    order_created: { code: 'order_created', labelAr: 'تم إنشاء الأمر', labelEn: 'Order Created', icon: 'FilePlus', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40', activityType: 'event', category: 'sales' },
    order_confirmed: { code: 'order_confirmed', labelAr: 'تم تأكيد الأمر', labelEn: 'Order Confirmed', icon: 'CheckCircle2', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40', activityType: 'milestone', category: 'sales' },
    invoice_created: { code: 'invoice_created', labelAr: 'تم إنشاء الفاتورة', labelEn: 'Invoice Created', icon: 'FileText', color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900/40', activityType: 'event', category: 'sales' },
    invoice_sent: { code: 'invoice_sent', labelAr: 'تم إرسال الفاتورة', labelEn: 'Invoice Sent', icon: 'Send', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40', activityType: 'event', category: 'sales' },

    // ── المشتريات ──
    po_sent: { code: 'po_sent', labelAr: 'تم إرسال أمر الشراء', labelEn: 'PO Sent', icon: 'Send', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/40', activityType: 'event', category: 'purchase' },
    po_confirmed: { code: 'po_confirmed', labelAr: 'تم تأكيد أمر الشراء', labelEn: 'PO Confirmed', icon: 'CheckCircle2', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/40', activityType: 'milestone', category: 'purchase' },
    goods_received: { code: 'goods_received', labelAr: 'تم استلام البضاعة', labelEn: 'Goods Received', icon: 'PackageCheck', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'purchase' },
    goods_partial: { code: 'goods_partial', labelAr: 'استلام جزئي', labelEn: 'Partial Receipt', icon: 'PackageOpen', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'purchase' },

    // ── المالية ──
    payment_received: { code: 'payment_received', labelAr: 'تم استلام دفعة', labelEn: 'Payment Received', icon: 'Banknote', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'finance' },
    payment_sent: { code: 'payment_sent', labelAr: 'تم إرسال دفعة', labelEn: 'Payment Sent', icon: 'CreditCard', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40', activityType: 'milestone', category: 'finance' },
    payment_partial: { code: 'payment_partial', labelAr: 'دفعة جزئية', labelEn: 'Partial Payment', icon: 'Coins', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'finance' },

    // ── أحداث المستند ──
    status_changed: { code: 'status_changed', labelAr: 'تغيير الحالة', labelEn: 'Status Changed', icon: 'ArrowRightLeft', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/40', activityType: 'system', category: 'document' },
    confirmed: { code: 'confirmed', labelAr: 'تم التأكيد', labelEn: 'Confirmed', icon: 'CheckCircle', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40', activityType: 'milestone', category: 'document' },
    unconfirmed: { code: 'unconfirmed', labelAr: 'إلغاء التأكيد', labelEn: 'Unconfirmed', icon: 'XCircle', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40', activityType: 'event', category: 'document' },
    posted: { code: 'posted', labelAr: 'تم الترحيل', labelEn: 'Posted', icon: 'BookCheck', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'document' },
    unposted: { code: 'unposted', labelAr: 'إلغاء الترحيل', labelEn: 'Unposted', icon: 'BookX', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/40', activityType: 'event', category: 'document' },
    cancelled: { code: 'cancelled', labelAr: 'تم الإلغاء', labelEn: 'Cancelled', icon: 'Ban', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/40', activityType: 'milestone', category: 'document' },
    printed: { code: 'printed', labelAr: 'تم الطباعة', labelEn: 'Printed', icon: 'Printer', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800', activityType: 'system', category: 'document' },
    exported: { code: 'exported', labelAr: 'تم التصدير', labelEn: 'Exported', icon: 'Download', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800', activityType: 'system', category: 'document' },
    duplicated: { code: 'duplicated', labelAr: 'تم النسخ', labelEn: 'Duplicated', icon: 'Copy', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/30', activityType: 'system', category: 'document' },
    attachment_added: { code: 'attachment_added', labelAr: 'تم إرفاق ملف', labelEn: 'Attachment Added', icon: 'Paperclip', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40', activityType: 'system', category: 'document' },
    attachment_removed: { code: 'attachment_removed', labelAr: 'تم حذف مرفق', labelEn: 'Attachment Removed', icon: 'Trash2', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/30', activityType: 'system', category: 'document' },

    // ── أحداث المراحل (تُسجّل تلقائياً) ──
    reservation_created: { code: 'reservation_created', labelAr: 'تم حجز البضاعة', labelEn: 'Reservation Created', icon: 'Lock', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'document' },
    receipt_started: { code: 'receipt_started', labelAr: 'بدء الاستلام', labelEn: 'Receipt Started', icon: 'Package', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/40', activityType: 'event', category: 'purchase' },
    partially_received: { code: 'partially_received', labelAr: 'استلام جزئي', labelEn: 'Partially Received', icon: 'PackageOpen', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'purchase' },
    receipt_received: { code: 'receipt_received', labelAr: 'تم الاستلام الكامل', labelEn: 'Fully Received', icon: 'PackageCheck', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'purchase' },
    delivery_started: { code: 'delivery_started', labelAr: 'بدء التسليم', labelEn: 'Delivery Started', icon: 'Truck', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40', activityType: 'event', category: 'sales' },
    fully_paid: { code: 'fully_paid', labelAr: 'تم السداد الكامل', labelEn: 'Fully Paid', icon: 'BadgeCheck', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'finance' },
    reopened: { code: 'reopened', labelAr: 'تم إعادة الفتح', labelEn: 'Reopened', icon: 'RotateCcw', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40', activityType: 'event', category: 'document' },

    // ── الاتصالات ──
    phone_call: { code: 'phone_call', labelAr: 'مكالمة هاتفية', labelEn: 'Phone Call', icon: 'Phone', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/30', activityType: 'event', category: 'communication' },
    email_sent: { code: 'email_sent', labelAr: 'تم إرسال بريد', labelEn: 'Email Sent', icon: 'Mail', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30', activityType: 'event', category: 'communication' },
    whatsapp_sent: { code: 'whatsapp_sent', labelAr: 'تم إرسال واتساب', labelEn: 'WhatsApp Sent', icon: 'MessageCircle', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/30', activityType: 'event', category: 'communication' },
    meeting: { code: 'meeting', labelAr: 'اجتماع', labelEn: 'Meeting', icon: 'Users', color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-900/30', activityType: 'event', category: 'communication' },
    follow_up: { code: 'follow_up', labelAr: 'متابعة', labelEn: 'Follow Up', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30', activityType: 'event', category: 'communication' },

    // ── عام ──
    note: { code: 'note', labelAr: 'ملاحظة', labelEn: 'Note', icon: 'StickyNote', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30', activityType: 'note', category: 'general' },
    reminder: { code: 'reminder', labelAr: 'تذكير', labelEn: 'Reminder', icon: 'Bell', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/30', activityType: 'note', category: 'general' },
    custom: { code: 'custom', labelAr: 'حدث مخصص', labelEn: 'Custom Event', icon: 'Star', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-800', activityType: 'event', category: 'general' },

    // ── أحداث الضريبة الجمركية ──
    tax_posted: { code: 'tax_posted', labelAr: 'تم ترحيل الضريبة', labelEn: 'Tax Posted', icon: 'BookCheck', color: 'text-rose-700', bgColor: 'bg-rose-100 dark:bg-rose-900/40', activityType: 'milestone', category: 'finance' },
    tax_edited: { code: 'tax_edited', labelAr: 'تم تعديل الضريبة', labelEn: 'Tax Edited', icon: 'RefreshCw', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'finance' },

    // ── أحداث المرفقات ──
    document_uploaded: { code: 'document_uploaded', labelAr: 'تم رفع مرفق', labelEn: 'Document Uploaded', icon: 'Upload', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30', activityType: 'event', category: 'general' },
    document_deleted: { code: 'document_deleted', labelAr: 'تم حذف مرفق', labelEn: 'Document Deleted', icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30', activityType: 'event', category: 'general' },

    // ── أحداث دورة حياة الحاوية (status transitions) ──
    in_receiving: { code: 'in_receiving' as any, labelAr: 'بدأ الاستلام', labelEn: 'Receiving Started', icon: 'PackageOpen', color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/30', activityType: 'event', category: 'purchase' },
    received: { code: 'received' as any, labelAr: 'تم الاستلام', labelEn: 'Received', icon: 'PackageCheck', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', activityType: 'milestone', category: 'purchase' },
    fully_received: { code: 'fully_received' as any, labelAr: 'استلام كامل', labelEn: 'Fully Received', icon: 'PackageCheck', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/40', activityType: 'milestone', category: 'purchase' },
    status_updated: { code: 'status_updated' as any, labelAr: 'تحديث الحالة', labelEn: 'Status Updated', icon: 'ArrowRightLeft', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/40', activityType: 'system', category: 'document' },
    confirmed_sent: { code: 'confirmed_sent' as any, labelAr: 'تم التأكيد والإرسال', labelEn: 'Confirmed & Sent', icon: 'Shield', color: 'text-emerald-700', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40', activityType: 'milestone', category: 'document' },
    tax_adjusted: { code: 'tax_adjusted' as any, labelAr: 'تعديل الضريبة', labelEn: 'Tax Adjusted', icon: 'RefreshCw', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40', activityType: 'event', category: 'finance' },
};

/** أحداث سريعة يمكن إضافتها بزر واحد */
export const QUICK_EVENTS: EventCode[] = [
    'phone_call', 'email_sent', 'whatsapp_sent', 'meeting', 'follow_up',
    'quotation_sent', 'invoice_sent', 'payment_received', 'payment_sent',
];

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

export const documentActivityService = {

    // ─── جلب سجل النشاط لمستند ─────────────────────────────
    async getActivities(
        entityType: string,
        entityId: string,
        options?: {
            limit?: number;
            offset?: number;
            activityType?: ActivityType;
            pinnedOnly?: boolean;
        }
    ): Promise<DocumentActivityEntry[]> {
        try {
            let query = supabase
                .from('document_activity')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false });

            if (options?.activityType) {
                query = query.eq('activity_type', options.activityType);
            }

            if (options?.pinnedOnly) {
                query = query.eq('is_pinned', true);
            }

            if (options?.limit) {
                query = query.limit(options.limit);
            }

            if (options?.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[documentActivityService] getActivities error:', error);
                return [];
            }

            // Fetch user names
            const userIds = [...new Set((data || []).map(d => d.created_by).filter(Boolean))];
            let userMap: Record<string, { name: string; avatar?: string }> = {};

            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);

                if (profiles) {
                    profiles.forEach((p: any) => {
                        userMap[p.id] = {
                            name: p.full_name || 'User',
                            avatar: p.avatar_url,
                        };
                    });
                }
            }

            return (data || []).map(entry => ({
                ...entry,
                user_name: entry.created_by ? userMap[entry.created_by]?.name || 'User' : 'System',
                user_avatar: entry.created_by ? userMap[entry.created_by]?.avatar : undefined,
            }));
        } catch (err) {
            console.error('[documentActivityService] getActivities error:', err);
            return [];
        }
    },

    // ─── عدد الأنشطة (للـ badge) ─────────────────────────
    async getActivityCount(entityType: string, entityId: string): Promise<number> {
        const { count, error } = await supabase
            .from('document_activity')
            .select('*', { count: 'exact', head: true })
            .eq('entity_type', entityType)
            .eq('entity_id', entityId);

        if (error) {
            console.error('[documentActivityService] getActivityCount error:', error);
            return 0;
        }

        return count || 0;
    },

    // ─── إضافة ملاحظة أو حدث ────────────────────────────
    async addActivity(params: AddActivityParams): Promise<{ success: boolean; id?: string; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('document_activity')
                .insert({
                    tenant_id: params.tenantId,
                    entity_type: params.entityType,
                    entity_id: params.entityId,
                    activity_type: params.activityType,
                    content: params.content || null,
                    event_code: params.eventCode || null,
                    metadata: params.metadata || {},
                    created_by: user?.id || null,
                })
                .select('id')
                .single();

            if (error) {
                console.error('[documentActivityService] addActivity error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, id: data?.id };
        } catch (err: any) {
            console.error('[documentActivityService] addActivity error:', err);
            return { success: false, error: err.message };
        }
    },

    // ─── إضافة ملاحظة (اختصار) ──────────────────────────
    async addNote(
        entityType: string,
        entityId: string,
        tenantId: string,
        content: string
    ): Promise<{ success: boolean; id?: string; error?: string }> {
        return this.addActivity({
            entityType,
            entityId,
            tenantId,
            activityType: 'note',
            content,
            eventCode: 'note',
        });
    },

    // ─── تسجيل حدث (اختصار) ─────────────────────────────
    async logEvent(
        entityType: string,
        entityId: string,
        tenantId: string,
        eventCode: EventCode | string,
        content?: string,
        metadata?: Record<string, any>
    ): Promise<{ success: boolean; id?: string; error?: string }> {
        const eventDef = EVENT_DEFINITIONS[eventCode];
        return this.addActivity({
            entityType,
            entityId,
            tenantId,
            activityType: eventDef?.activityType || 'event',
            content: content || (eventDef ? undefined : eventCode),
            eventCode,
            metadata,
        });
    },

    // ─── تثبيت/إلغاء تثبيت ملاحظة ───────────────────────
    async togglePin(activityId: string, isPinned: boolean): Promise<boolean> {
        const { error } = await supabase
            .from('document_activity')
            .update({ is_pinned: isPinned })
            .eq('id', activityId);

        if (error) {
            console.error('[documentActivityService] togglePin error:', error);
            return false;
        }

        return true;
    },

    // ─── تعديل ملاحظة ───────────────────────────────────
    async updateContent(activityId: string, content: string): Promise<boolean> {
        const { error } = await supabase
            .from('document_activity')
            .update({ content })
            .eq('id', activityId);

        if (error) {
            console.error('[documentActivityService] updateContent error:', error);
            return false;
        }

        return true;
    },

    // ─── حذف نشاط ───────────────────────────────────────
    async deleteActivity(activityId: string): Promise<boolean> {
        const { error } = await supabase
            .from('document_activity')
            .delete()
            .eq('id', activityId);

        if (error) {
            console.error('[documentActivityService] deleteActivity error:', error);
            return false;
        }

        return true;
    },
};

export default documentActivityService;
