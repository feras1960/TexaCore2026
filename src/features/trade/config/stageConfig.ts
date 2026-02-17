// ═══════════════════════════════════════════════════════════════
// Trade Stage Configuration (Unified Trade Cycle — Feb 16, 2026)
// ═══════════════════════════════════════════════════════════════
// دستور دورة التجارة الموحدة — جدول واحد + مراحل بسيطة
// المرجع: .agent/artifacts/TRADE_CYCLE_CONSTITUTION.md
// ═══════════════════════════════════════════════════════════════

// ═══ Purchase Stages (7 مراحل فقط) ═══
export type PurchaseStage =
    | 'request'       // طلب شراء — معلوماتي
    | 'quotation'     // عرض سعر — معلوماتي
    | 'draft'         // مسودة فاتورة
    | 'confirmed'     // فاتورة مؤكدة — التزام رسمي
    | 'received'      // بضاعة مستلمة — حركة مخزون
    | 'posted'        // مرحّلة — قيد محاسبي
    | 'cancelled';    // ملغاة

// ═══ Sales Stages (7 مراحل فقط) ═══
export type SalesStage =
    | 'quotation'     // عرض سعر — معلوماتي
    | 'reservation'   // حجز — معلوماتي
    | 'draft'         // مسودة فاتورة
    | 'confirmed'     // فاتورة مؤكدة — التزام رسمي
    | 'delivery'      // تم التسليم — حركة مخزون
    | 'posted'        // مرحّلة — قيد محاسبي
    | 'cancelled';    // ملغاة

// ═══ تعريف المرحلة ═══
export interface StageDefinition {
    key: string;
    /** Translation key for the stage label */
    labelKey: string;
    /** Order for progress bar display */
    order: number;
    /** Tailwind color class */
    color: string;
    /** Badge variant */
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    /** Lucide icon name */
    icon: string;
    /** Which tabs are visible at this stage */
    visibleTabs: string[];
    /** Can edit items at this stage? */
    canEditItems: boolean;
    /** Can edit header at this stage? */
    canEditHeader: boolean;
    /** Is this a terminal stage? */
    isTerminal: boolean;
    /** Is this stage informational only (no accounting/inventory impact)? */
    isInformational?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// تعريفات مراحل المشتريات
// ═══════════════════════════════════════════════════════════════
export const PURCHASE_STAGES: Record<PurchaseStage, StageDefinition> = {
    request: {
        key: 'request',
        labelKey: 'trade.stages.request',
        order: 0,
        color: 'bg-amber-500',
        variant: 'secondary',
        icon: 'Flag',
        visibleTabs: ['items', 'supplier_finance', 'notes', 'attachments'],
        canEditItems: true,
        canEditHeader: true,
        isTerminal: false,
        isInformational: true,
    },
    quotation: {
        key: 'quotation',
        labelKey: 'trade.stages.quotation',
        order: 1,
        color: 'bg-purple-500',
        variant: 'secondary',
        icon: 'FileSearch',
        visibleTabs: ['items', 'supplier_finance', 'notes', 'attachments'],
        canEditItems: true,
        canEditHeader: true,
        isTerminal: false,
        isInformational: true,
    },
    draft: {
        key: 'draft',
        labelKey: 'trade.stages.draft',
        order: 2,
        color: 'bg-gray-500',
        variant: 'secondary',
        icon: 'FileEdit',
        visibleTabs: ['items', 'supplier_finance', 'notes', 'attachments'],
        canEditItems: true,
        canEditHeader: true,
        isTerminal: false,
    },
    confirmed: {
        key: 'confirmed',
        labelKey: 'trade.stages.confirmed',
        order: 3,
        color: 'bg-blue-600',
        variant: 'default',
        icon: 'ShieldCheck',
        visibleTabs: ['items', 'supplier_finance', 'notes', 'attachments', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: false,
    },
    received: {
        key: 'received',
        labelKey: 'trade.stages.received',
        order: 4,
        color: 'bg-teal-600',
        variant: 'default',
        icon: 'PackageCheck',
        visibleTabs: ['items', 'receipt_summary', 'warehouse_receiving', 'supplier_finance', 'notes', 'attachments', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: false,
    },
    posted: {
        key: 'posted',
        labelKey: 'trade.stages.posted',
        order: 5,
        color: 'bg-green-600',
        variant: 'default',
        icon: 'BookCheck',
        visibleTabs: ['items', 'receipt_summary', 'supplier_finance', 'journal', 'notes', 'attachments', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: true,
    },
    cancelled: {
        key: 'cancelled',
        labelKey: 'trade.stages.cancelled',
        order: -1,
        color: 'bg-red-500',
        variant: 'destructive',
        icon: 'XCircle',
        visibleTabs: ['items', 'notes', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: true,
    },
};

// ═══════════════════════════════════════════════════════════════
// تعريفات مراحل المبيعات
// ═══════════════════════════════════════════════════════════════
export const SALES_STAGES: Record<SalesStage, StageDefinition> = {
    quotation: {
        key: 'quotation',
        labelKey: 'trade.stages.quotation',
        order: 0,
        color: 'bg-purple-500',
        variant: 'secondary',
        icon: 'FileSearch',
        visibleTabs: ['items', 'notes'],
        canEditItems: true,
        canEditHeader: true,
        isTerminal: false,
        isInformational: true,
    },
    reservation: {
        key: 'reservation',
        labelKey: 'trade.stages.reservation',
        order: 1,
        color: 'bg-indigo-500',
        variant: 'secondary',
        icon: 'ClipboardList',
        visibleTabs: ['items', 'notes'],
        canEditItems: true,
        canEditHeader: true,
        isTerminal: false,
        isInformational: true,
    },
    draft: {
        key: 'draft',
        labelKey: 'trade.stages.draft',
        order: 2,
        color: 'bg-gray-500',
        variant: 'secondary',
        icon: 'FileEdit',
        visibleTabs: ['items', 'notes'],
        canEditItems: true,
        canEditHeader: true,
        isTerminal: false,
    },
    confirmed: {
        key: 'confirmed',
        labelKey: 'trade.stages.confirmed',
        order: 3,
        color: 'bg-blue-600',
        variant: 'default',
        icon: 'ShieldCheck',
        visibleTabs: ['items', 'notes', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: false,
    },
    delivery: {
        key: 'delivery',
        labelKey: 'trade.stages.delivery',
        order: 4,
        color: 'bg-teal-500',
        variant: 'default',
        icon: 'Package',
        visibleTabs: ['items', 'notes', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: false,
    },
    posted: {
        key: 'posted',
        labelKey: 'trade.stages.posted',
        order: 5,
        color: 'bg-green-600',
        variant: 'default',
        icon: 'BookCheck',
        visibleTabs: ['items', 'supplier_finance', 'journal', 'notes', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: true,
    },
    cancelled: {
        key: 'cancelled',
        labelKey: 'trade.stages.cancelled',
        order: -1,
        color: 'bg-red-500',
        variant: 'destructive',
        icon: 'XCircle',
        visibleTabs: ['items', 'notes', 'activity_log'],
        canEditItems: false,
        canEditHeader: false,
        isTerminal: true,
    },
};

// ═══ المراحل الأساسية لشريط التقدم (بدون cancelled) ═══
export const PURCHASE_PROGRESS_STAGES: PurchaseStage[] = [
    'request', 'quotation', 'draft', 'confirmed', 'received', 'posted'
];

export const SALES_PROGRESS_STAGES: SalesStage[] = [
    'quotation', 'reservation', 'draft', 'confirmed', 'delivery', 'posted'
];

// ═══════════════════════════════════════════════════════════════
// Stage Actions — أزرار الإجراءات لكل مرحلة
// ═══════════════════════════════════════════════════════════════
export interface StageAction {
    labelKey: string;
    icon: string;
    targetStage: PurchaseStage | SalesStage;
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
    /** Requires confirmation dialog? */
    requireConfirm: boolean;
    /** Permission key required */
    permissionKey: string;
}

export const PURCHASE_STAGE_ACTIONS: Record<PurchaseStage, StageAction[]> = {
    request: [
        { labelKey: 'trade.actions.convertToQuotation', icon: 'FileSearch', targetStage: 'quotation', variant: 'default', requireConfirm: false, permissionKey: 'canCreateQuotation' },
        { labelKey: 'trade.actions.convertToInvoice', icon: 'FileText', targetStage: 'draft', variant: 'default', requireConfirm: false, permissionKey: 'canCreateInvoice' },
    ],
    quotation: [
        { labelKey: 'trade.actions.convertToInvoice', icon: 'FileText', targetStage: 'draft', variant: 'default', requireConfirm: false, permissionKey: 'canCreateInvoice' },
    ],
    draft: [
        { labelKey: 'trade.actions.confirm', icon: 'ShieldCheck', targetStage: 'confirmed', variant: 'default', requireConfirm: true, permissionKey: 'canConfirmInvoice' },
    ],
    confirmed: [
        { labelKey: 'trade.actions.recordReceipt', icon: 'PackageCheck', targetStage: 'received', variant: 'default', requireConfirm: true, permissionKey: 'canReceiveGoods' },
        { labelKey: 'trade.actions.unconfirm', icon: 'RotateCcw', targetStage: 'draft', variant: 'outline', requireConfirm: true, permissionKey: 'canEditConfirmed' },
    ],
    received: [
        { labelKey: 'trade.actions.post', icon: 'BookCheck', targetStage: 'posted', variant: 'default', requireConfirm: true, permissionKey: 'canPostInvoice' },
    ],
    posted: [],
    cancelled: [
        { labelKey: 'trade.actions.reopen', icon: 'RotateCcw', targetStage: 'draft', variant: 'outline', requireConfirm: true, permissionKey: 'canEditConfirmed' },
    ],
};

export const SALES_STAGE_ACTIONS: Record<SalesStage, StageAction[]> = {
    quotation: [
        { labelKey: 'trade.actions.convertToReservation', icon: 'ClipboardList', targetStage: 'reservation', variant: 'default', requireConfirm: false, permissionKey: 'canCreateReservation' },
        { labelKey: 'trade.actions.convertToInvoice', icon: 'FileText', targetStage: 'draft', variant: 'default', requireConfirm: false, permissionKey: 'canCreateInvoice' },
    ],
    reservation: [
        { labelKey: 'trade.actions.convertToInvoice', icon: 'FileText', targetStage: 'draft', variant: 'default', requireConfirm: false, permissionKey: 'canCreateInvoice' },
    ],
    draft: [
        { labelKey: 'trade.actions.confirm', icon: 'ShieldCheck', targetStage: 'confirmed', variant: 'default', requireConfirm: true, permissionKey: 'canConfirmInvoice' },
    ],
    confirmed: [
        { labelKey: 'trade.actions.createDelivery', icon: 'Package', targetStage: 'delivery', variant: 'default', requireConfirm: true, permissionKey: 'canCreateDelivery' },
        { labelKey: 'trade.actions.unconfirm', icon: 'RotateCcw', targetStage: 'draft', variant: 'outline', requireConfirm: true, permissionKey: 'canEditConfirmed' },
    ],
    delivery: [
        { labelKey: 'trade.actions.post', icon: 'BookCheck', targetStage: 'posted', variant: 'default', requireConfirm: true, permissionKey: 'canPostInvoice' },
    ],
    posted: [],
    cancelled: [
        { labelKey: 'trade.actions.reopen', icon: 'RotateCcw', targetStage: 'draft', variant: 'outline', requireConfirm: true, permissionKey: 'canEditConfirmed' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// قواعد الانتقال في الكانبان (Drag & Drop Transition Rules)
// ═══════════════════════════════════════════════════════════════
export interface TransitionRule {
    allowed: boolean;
    requiresConfirmation: boolean;
    /** If this transition assigns a permanent number */
    assignsNumber: boolean;
    /** Warning message key */
    warningKey?: string;
}

const PURCHASE_TRANSITIONS: Record<string, TransitionRule> = {
    // Forward transitions (informational stages — free movement)
    'request→quotation': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'request→draft': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'quotation→draft': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    // Forward transitions (commitment stages — require confirmation)
    'draft→confirmed': { allowed: true, requiresConfirmation: true, assignsNumber: true },
    'confirmed→received': { allowed: true, requiresConfirmation: true, assignsNumber: false },
    'received→posted': { allowed: true, requiresConfirmation: true, assignsNumber: false },
    // Backward transitions (informational stages — free movement)
    'quotation→request': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'draft→quotation': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'draft→request': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    // Backward transitions (commitment stages — require explicit action)
    'confirmed→draft': { allowed: true, requiresConfirmation: true, assignsNumber: false, warningKey: 'trade.warnings.unconfirmWillRemoveNumber' },
};

const SALES_TRANSITIONS: Record<string, TransitionRule> = {
    'quotation→reservation': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'quotation→draft': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'reservation→draft': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'draft→confirmed': { allowed: true, requiresConfirmation: true, assignsNumber: true },
    'confirmed→delivery': { allowed: true, requiresConfirmation: true, assignsNumber: false },
    'delivery→posted': { allowed: true, requiresConfirmation: true, assignsNumber: false },
    'reservation→quotation': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'draft→reservation': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'draft→quotation': { allowed: true, requiresConfirmation: false, assignsNumber: false },
    'confirmed→draft': { allowed: true, requiresConfirmation: true, assignsNumber: false, warningKey: 'trade.warnings.unconfirmWillRemoveNumber' },
};

export function getTransitionRule(type: 'purchase' | 'sale', fromStage: string, toStage: string): TransitionRule {
    const key = `${fromStage}→${toStage}`;
    const transitions = type === 'purchase' ? PURCHASE_TRANSITIONS : SALES_TRANSITIONS;
    return transitions[key] || { allowed: false, requiresConfirmation: false, assignsNumber: false };
}

export function isTransitionAllowed(type: 'purchase' | 'sale', fromStage: string, toStage: string): boolean {
    return getTransitionRule(type, fromStage, toStage).allowed;
}

// ═══════════════════════════════════════════════════════════════
// Payment Status Computation (أعلام الدفع — حساب تلقائي)
// ═══════════════════════════════════════════════════════════════
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid';

export function computePaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
    if (!totalAmount || totalAmount <= 0) return 'unpaid';
    if (paidAmount >= totalAmount) return 'fully_paid';
    if (paidAmount > 0) return 'partially_paid';
    return 'unpaid';
}

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { labelKey: string; color: string; icon: string }> = {
    unpaid: { labelKey: 'trade.payment.unpaid', color: 'text-red-500 bg-red-50', icon: '🔴' },
    partially_paid: { labelKey: 'trade.payment.partiallyPaid', color: 'text-amber-600 bg-amber-50', icon: '🟡' },
    fully_paid: { labelKey: 'trade.payment.fullyPaid', color: 'text-green-600 bg-green-50', icon: '🟢' },
};

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════
export function getStageDefinition(type: 'purchase' | 'sale', stage: string): StageDefinition | undefined {
    if (type === 'purchase') {
        return PURCHASE_STAGES[stage as PurchaseStage];
    }
    return SALES_STAGES[stage as SalesStage];
}

export function isTabVisibleAtStage(type: 'purchase' | 'sale', stage: string, tabKey: string): boolean {
    const def = getStageDefinition(type, stage);
    return def?.visibleTabs.includes(tabKey) ?? false;
}

export function getVisibleTabs(type: 'purchase' | 'sale', stage: string): string[] {
    const def = getStageDefinition(type, stage);
    return def?.visibleTabs || ['items', 'notes'];
}

// ═══ التبويبات المتاحة ═══
export const PURCHASE_TABS = [
    { key: 'items', labelKey: 'trade.tabs.items', icon: 'Package' },
    { key: 'supplier_finance', labelKey: 'trade.tabs.supplierFinance', icon: 'Building2' },
    { key: 'receipt_summary', labelKey: 'trade.tabs.receiptSummary', icon: 'ClipboardCheck' },
    { key: 'journal', labelKey: 'trade.tabs.journal', icon: 'BookOpen' },
    { key: 'notes', labelKey: 'trade.tabs.notes', icon: 'StickyNote' },
    { key: 'attachments', labelKey: 'trade.tabs.attachments', icon: 'Paperclip' },
    { key: 'activity_log', labelKey: 'trade.tabs.activityLog', icon: 'History' },
] as const;
