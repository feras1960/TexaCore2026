/**
 * ═══════════════════════════════════════════════════════════════
 * 🎯 Stage Configuration — تعريف المراحل والأزرار المتاحة
 * ═══════════════════════════════════════════════════════════════
 * Unified Trade Cycle — Feb 16, 2026
 * المرجع: .agent/artifacts/TRADE_CYCLE_CONSTITUTION.md
 * ═══════════════════════════════════════════════════════════════
 */

import type { StageConfig, StageAction } from '@/types/transactions';

// ═══════════════════════════════════════════════════════════════
// 📦 مراحل المشتريات — Purchase Stages (7 مراحل فقط)
// ═══════════════════════════════════════════════════════════════

export const PURCHASE_STAGES: Record<string, StageConfig> = {
    request: {
        key: 'request',
        label_ar: 'طلب شراء',
        label_en: 'Purchase Request',
        icon: '🏷️',
        color: '#D97706',     // amber
        bgColor: '#FFFBEB',
        actions: [
            {
                target_stage: 'quotation',
                label_ar: 'تحويل لعرض سعر',
                label_en: 'Convert to Quotation',
                icon: '📋',
                variant: 'outline',
                requires_confirmation: false,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'draft',
                label_ar: 'تحويل لفاتورة',
                label_en: 'Convert to Invoice',
                icon: '🧾',
                variant: 'default',
                requires_confirmation: false,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'cancelled',
                label_ar: 'إلغاء',
                label_en: 'Cancel',
                icon: '❌',
                variant: 'destructive',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: true,
            },
        ],
    },

    quotation: {
        key: 'quotation',
        label_ar: 'عرض سعر شراء',
        label_en: 'Purchase Quotation',
        icon: '📋',
        color: '#9333EA',     // purple
        bgColor: '#FAF5FF',
        actions: [
            {
                target_stage: 'draft',
                label_ar: 'تحويل لفاتورة',
                label_en: 'Convert to Invoice',
                icon: '🧾',
                variant: 'default',
                requires_confirmation: false,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'cancelled',
                label_ar: 'إلغاء',
                label_en: 'Cancel',
                icon: '❌',
                variant: 'destructive',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: true,
            },
        ],
    },

    draft: {
        key: 'draft',
        label_ar: 'مسودة فاتورة',
        label_en: 'Invoice Draft',
        icon: '📝',
        color: '#6B7280',     // gray
        bgColor: '#F3F4F6',
        actions: [
            {
                target_stage: 'confirmed',
                label_ar: 'تأكيد الفاتورة',
                label_en: 'Confirm Invoice',
                icon: '🛡️',
                variant: 'default',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'cancelled',
                label_ar: 'إلغاء',
                label_en: 'Cancel',
                icon: '❌',
                variant: 'destructive',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: true,
            },
        ],
    },

    confirmed: {
        key: 'confirmed',
        label_ar: 'فاتورة مؤكدة',
        label_en: 'Confirmed Invoice',
        icon: '🛡️',
        color: '#2563EB',     // blue
        bgColor: '#EFF6FF',
        actions: [
            {
                target_stage: 'received',
                label_ar: 'تسجيل استلام',
                label_en: 'Record Receipt',
                icon: '📦',
                variant: 'default',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'draft',
                label_ar: 'إلغاء التأكيد',
                label_en: 'Unconfirm',
                icon: '🔄',
                variant: 'outline',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
        ],
    },

    received: {
        key: 'received',
        label_ar: 'تم الاستلام',
        label_en: 'Received',
        icon: '📦',
        color: '#0D9488',     // teal
        bgColor: '#F0FDFA',
        actions: [
            {
                target_stage: 'posted',
                label_ar: 'ترحيل',
                label_en: 'Post',
                icon: '📊',
                variant: 'default',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
        ],
    },

    posted: {
        key: 'posted',
        label_ar: 'مُرحّلة',
        label_en: 'Posted',
        icon: '📊',
        color: '#16A34A',     // green
        bgColor: '#F0FDF4',
        actions: [],
    },

    cancelled: {
        key: 'cancelled',
        label_ar: 'ملغاة',
        label_en: 'Cancelled',
        icon: '❌',
        color: '#DC2626',     // red
        bgColor: '#FEF2F2',
        actions: [
            {
                target_stage: 'draft',
                label_ar: 'إعادة كمسودة',
                label_en: 'Reopen as Draft',
                icon: '🔄',
                variant: 'outline',
                requires_confirmation: true,
                requires_notes: true,
                requires_reason: false,
            },
        ],
    },
};


// ═══════════════════════════════════════════════════════════════
// 🛒 مراحل المبيعات — Sales Stages (7 مراحل فقط)
// ═══════════════════════════════════════════════════════════════

export const SALES_STAGES: Record<string, StageConfig> = {
    quotation: {
        key: 'quotation',
        label_ar: 'عرض سعر',
        label_en: 'Quotation',
        icon: '📋',
        color: '#9333EA',
        bgColor: '#FAF5FF',
        actions: [
            {
                target_stage: 'reservation',
                label_ar: 'حجز',
                label_en: 'Reserve',
                icon: '🔒',
                variant: 'outline',
                requires_confirmation: false,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'draft',
                label_ar: 'تحويل لفاتورة',
                label_en: 'Convert to Invoice',
                icon: '🧾',
                variant: 'default',
                requires_confirmation: false,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'cancelled',
                label_ar: 'إلغاء',
                label_en: 'Cancel',
                icon: '❌',
                variant: 'destructive',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: true,
            },
        ],
    },

    reservation: {
        key: 'reservation',
        label_ar: 'حجز',
        label_en: 'Reservation',
        icon: '🔒',
        color: '#7C3AED',
        bgColor: '#F5F3FF',
        actions: [
            {
                target_stage: 'draft',
                label_ar: 'تحويل لفاتورة',
                label_en: 'Convert to Invoice',
                icon: '🧾',
                variant: 'default',
                requires_confirmation: false,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'cancelled',
                label_ar: 'إلغاء الحجز',
                label_en: 'Cancel Reservation',
                icon: '❌',
                variant: 'destructive',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: true,
            },
        ],
    },

    draft: {
        key: 'draft',
        label_ar: 'مسودة فاتورة',
        label_en: 'Invoice Draft',
        icon: '📝',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        actions: [
            {
                target_stage: 'confirmed',
                label_ar: 'تأكيد الفاتورة',
                label_en: 'Confirm Invoice',
                icon: '🛡️',
                variant: 'default',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'cancelled',
                label_ar: 'إلغاء',
                label_en: 'Cancel',
                icon: '❌',
                variant: 'destructive',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: true,
            },
        ],
    },

    confirmed: {
        key: 'confirmed',
        label_ar: 'فاتورة مؤكدة',
        label_en: 'Confirmed Invoice',
        icon: '🛡️',
        color: '#2563EB',
        bgColor: '#EFF6FF',
        actions: [
            {
                target_stage: 'delivery',
                label_ar: 'تسليم',
                label_en: 'Deliver',
                icon: '🚚',
                variant: 'default',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
            {
                target_stage: 'draft',
                label_ar: 'إلغاء التأكيد',
                label_en: 'Unconfirm',
                icon: '🔄',
                variant: 'outline',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
        ],
    },

    delivery: {
        key: 'delivery',
        label_ar: 'تم التسليم',
        label_en: 'Delivered',
        icon: '🚚',
        color: '#0D9488',
        bgColor: '#F0FDFA',
        actions: [
            {
                target_stage: 'posted',
                label_ar: 'ترحيل',
                label_en: 'Post',
                icon: '📊',
                variant: 'default',
                requires_confirmation: true,
                requires_notes: false,
                requires_reason: false,
            },
        ],
    },

    posted: {
        key: 'posted',
        label_ar: 'مسلّمة ومرحّلة',
        label_en: 'Delivered & Posted',
        icon: '📊',
        color: '#16A34A',
        bgColor: '#F0FDF4',
        actions: [],
    },

    cancelled: {
        key: 'cancelled',
        label_ar: 'ملغاة',
        label_en: 'Cancelled',
        icon: '❌',
        color: '#DC2626',
        bgColor: '#FEF2F2',
        actions: [
            {
                target_stage: 'draft',
                label_ar: 'إعادة كمسودة',
                label_en: 'Reopen as Draft',
                icon: '🔄',
                variant: 'outline',
                requires_confirmation: true,
                requires_notes: true,
                requires_reason: false,
            },
        ],
    },
};


// ═══════════════════════════════════════════════════════════════
// 🔧 Helper Functions
// ═══════════════════════════════════════════════════════════════

/**
 * الحصول على تعريف المرحلة حسب النوع والمرحلة
 */
export function getStageConfig(type: 'purchase' | 'sale', stage: string): StageConfig | undefined {
    const stages = type === 'purchase' ? PURCHASE_STAGES : SALES_STAGES;
    return stages[stage];
}

/**
 * الحصول على الأزرار المتاحة لمرحلة معينة
 */
export function getAvailableActions(type: 'purchase' | 'sale', stage: string): StageAction[] {
    const config = getStageConfig(type, stage);
    return config?.actions || [];
}

/**
 * الحصول على اسم المرحلة بالعربي
 */
export function getStageLabelAr(type: 'purchase' | 'sale', stage: string): string {
    const config = getStageConfig(type, stage);
    return config?.label_ar || stage;
}

/**
 * الحصول على لون المرحلة
 */
export function getStageColor(type: 'purchase' | 'sale', stage: string): string {
    const config = getStageConfig(type, stage);
    return config?.color || '#6B7280';
}

/**
 * التحقق هل المرحلة قابلة للتعديل
 * request و quotation و draft كلها قابلة للتعديل (معلوماتية أو مسودة)
 */
export function isEditableStage(stage: string): boolean {
    return ['draft', 'request', 'quotation'].includes(stage);
}

/**
 * التحقق هل المستند مرحّل (مقفل)
 */
export function isLockedStage(stage: string): boolean {
    return ['posted'].includes(stage);
}

/**
 * ترتيب المراحل (للـ timeline)
 */
export const PURCHASE_STAGE_ORDER: string[] = [
    'request', 'quotation', 'draft', 'confirmed', 'received', 'posted'
];

export const SALES_STAGE_ORDER: string[] = [
    'quotation', 'reservation', 'draft', 'confirmed', 'delivery', 'posted'
];

/**
 * الحصول على رقم ترتيب المرحلة
 */
export function getStageIndex(type: 'purchase' | 'sale', stage: string): number {
    const order = type === 'purchase' ? PURCHASE_STAGE_ORDER : SALES_STAGE_ORDER;
    const idx = order.indexOf(stage);
    return idx >= 0 ? idx : -1;
}
