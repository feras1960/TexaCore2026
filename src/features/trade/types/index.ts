// ═══════════════════════════════════════════════════════════════
// Trade Module Types — الأنواع الموحدة للمعاملات التجارية
// ═══════════════════════════════════════════════════════════════
// يطابق جداول: purchase_transactions, sales_transactions
// ═══════════════════════════════════════════════════════════════

import type { PurchaseStage, SalesStage } from '../config/stageConfig';
import type { ReceiptVariancePolicy, InventoryValuationMethod } from '../config/transitionRules';

// ═══ المعاملة الموحدة (purchase_transactions) ═══
export interface PurchaseTransaction {
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id?: string;

    // ═══ المرحلة ═══
    stage: PurchaseStage;

    // ═══ أرقام المستند ═══
    draft_no?: string;
    quotation_no?: string;
    order_no?: string;
    receipt_no?: string;
    invoice_no?: string;

    // ═══ المورد ═══
    supplier_id?: string;
    supplier_name?: string;

    // ═══ التواريخ ═══
    doc_date?: string;
    quotation_date?: string;
    order_date?: string;
    approval_date?: string;
    receipt_date?: string;
    invoice_date?: string;
    due_date?: string;

    // ═══ الشحن والمستودع ═══
    warehouse_id?: string;
    shipment_id?: string;
    receipt_mode?: 'direct' | 'international';

    // ═══ المالية ═══
    currency: string;
    exchange_rate: number;
    subtotal: number;
    discount_amount: number;
    discount_percent: number;
    tax_amount: number;
    expenses_total: number;
    total_amount: number;

    // ═══ الدفعات ═══
    paid_amount: number;
    balance: number;
    payment_terms_days: number;

    // ═══ بيانات المورد الخارجية ═══
    supplier_invoice_number?: string;
    supplier_invoice_date?: string;

    // ═══ المحاسبة ═══
    journal_entry_id?: string;
    is_posted: boolean;

    // ═══ تتبع المستخدمين ═══
    created_by?: string;
    created_by_name?: string;
    created_at: string;

    quoted_by?: string;
    quoted_by_name?: string;
    quoted_at?: string;

    ordered_by?: string;
    ordered_by_name?: string;
    ordered_at?: string;

    approved_by?: string;
    approved_by_name?: string;
    approved_at?: string;
    approval_notes?: string;

    received_by?: string;
    received_by_name?: string;
    received_at?: string;

    invoiced_by?: string;
    invoiced_by_name?: string;
    invoiced_at?: string;

    posted_by?: string;
    posted_by_name?: string;
    posted_at?: string;

    cancelled_by?: string;
    cancelled_by_name?: string;
    cancelled_at?: string;
    cancellation_reason?: string;

    updated_by?: string;
    updated_at?: string;

    // ═══ بيانات إضافية ═══
    notes?: string;
    supplier_notes?: string;
    internal_notes?: string;
    expenses?: Record<string, unknown>[];
    attachments?: Attachment[];
    tags?: string[];

    // ═══ حالات مساعدة ═══
    confirmation_status: 'pending' | 'confirmed' | 'rejected';
    is_active: boolean;
    is_locked: boolean;
    version: number;

    // ═══ الطباعة ═══
    printed_count: number;
    last_printed_at?: string;
    last_printed_by?: string;

    // ═══ المرتجعات ═══
    original_transaction_id?: string;
    is_return: boolean;

    // ═══ المصدر ═══
    source_type?: string;
    source_id?: string;

    // ═══ العلاقات (populated via joins) ═══
    items?: PurchaseTransactionItem[];
}

// ═══ بنود المعاملة (purchase_transaction_items) ═══
export interface PurchaseTransactionItem {
    id: string;
    transaction_id: string;

    line_number: number;

    // ═══ المنتج/المادة ═══
    product_id?: string;
    material_id?: string;
    item_code?: string;
    description?: string;
    description_ar?: string;

    // ═══ الكميات ═══
    quantity: number;
    received_qty: number;
    returned_qty: number;
    unit: string;

    // ═══ التسعير ═══
    unit_price: number;
    discount_amount: number;
    discount_percent: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;

    // ═══ الأقمشة ═══
    /** @deprecated Colors are now managed as variant materials */
    color_id?: string;
    /** @deprecated Colors are now managed as variant materials */
    color_name?: string;
    roll_id?: string;
    roll_code?: string;
    rolls_count?: number;

    // ═══ المستودع والتكلفة ═══
    warehouse_id?: string;
    cost_price?: number;
    landed_cost?: number;

    notes?: string;

    created_at?: string;
    updated_at?: string;
}

// ═══ سجل المراحل (transaction_stage_log) ═══
export interface TransactionStageLog {
    id: string;
    transaction_type: 'purchase' | 'sale';
    transaction_id: string;
    from_stage: string;
    to_stage: string;
    generated_number?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    performed_by?: string;
    performed_by_name?: string;
    performed_at: string;
    ip_address?: string;
    user_agent?: string;
}

// ═══ نتيجة advance_transaction_stage ═══
export interface StageAdvanceResult {
    success: boolean;
    error?: string;
    from_stage?: string;
    to_stage?: string;
    generated_number?: string;
    performed_by?: string;
    performed_by_name?: string;
}

// ═══ المرفقات ═══
export interface Attachment {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
}

// ═══ إعدادات المشتريات (من company_accounting_settings) ═══
export interface PurchaseSettings {
    receipt_variance_policy: ReceiptVariancePolicy;
    inventory_valuation_method: InventoryValuationMethod;

    // حدود التسامح
    receipt_qty_tolerance_percent: number;
    receipt_price_tolerance_percent: number;
    allow_over_receipt: boolean;
    over_receipt_tolerance_percent: number;

    // حسابات محاسبية
    default_purchase_variance_account_id?: string;
    default_gr_ir_clearing_account_id?: string;
    default_git_account_id?: string;
    default_purchase_account_id?: string;
    default_payable_account_id?: string;
    default_inventory_account_id?: string;

    // إعدادات المستندات
    auto_create_receipt_on_confirm: boolean;
    require_receipt_before_post: boolean;
    allow_partial_receipt: boolean;
    auto_close_remaining_qty: boolean;
    default_receipt_mode: 'direct' | 'international';

    // الموافقات
    require_approval_for_orders: boolean;
    approval_threshold_amount: number;
    require_double_approval_above: number;
}

// ═══ فروقات الاستلام ═══
export interface ReceiptDiscrepancy {
    item_id: string;
    ordered_qty: number;
    received_qty: number;
    variance_qty: number;
    variance_percent: number;
    unit_price: number;
    variance_amount: number;
    is_within_tolerance: boolean;
    /** Translation key for the suggested action */
    suggested_action_key: string;
}

// ═══ قيد تسوية ═══
export interface AdjustmentEntry {
    parent_entry_id: string;
    entry_type: 'adjustment' | 'reversal';
    adjustment_reason: string;
    lines: {
        account_id: string;
        debit: number;
        credit: number;
        description: string;
    }[];
}

// ═══ صلاحيات المشتريات ═══
export interface PurchasePermissions {
    // المستندات
    canCreateDraft: boolean;
    canCreateQuotation: boolean;
    canCreateOrder: boolean;
    canCreateInvoice: boolean;
    canEditConfirmed: boolean;
    canDeleteDraft: boolean;
    canDeleteConfirmed: boolean;

    // العمليات
    canApproveOrder: boolean;
    canRejectOrder: boolean;
    canConfirmReceipt: boolean;
    canPartialReceipt: boolean;
    canPostInvoice: boolean;
    canUnpostInvoice: boolean;
    canRecordPayment: boolean;
    canCreateReturn: boolean;
    canCreateDebitNote: boolean;
    canChooseVariancePolicy: boolean;

    // العرض
    canViewPrices: boolean;
    canViewSupplierInfo: boolean;
    canViewJournalEntries: boolean;
    canViewPayments: boolean;
    canViewAdjustments: boolean;
    canViewReceiptSummary: boolean;
    canViewActivityLog: boolean;
    canViewReports: boolean;

    // الإعدادات
    canChangeBillingPolicy: boolean;
    canChangeValuationMethod: boolean;
    canChangeTolerances: boolean;
    canChangeDefaultAccounts: boolean;
    canChangeApprovalLimits: boolean;
    canManageRoles: boolean;
}

// ═══ للتوافق مع الكود القديم (Legacy) ═══
export type TradeDocumentType = 'purchase_order' | 'purchase_invoice' | 'sales_order' | 'sales_invoice' | 'quotation' | 'delivery_note' | 'reservation';
export type TradeDocumentStatus = 'draft' | 'pending' | 'approved' | 'posted' | 'completed' | 'cancelled';

/** @deprecated Use PurchaseTransaction instead */
export interface TradeDocument {
    id: string;
    tenant_id: string;
    type: TradeDocumentType;
    status: TradeDocumentStatus;
    date: string;
    due_date?: string;
    reference_number: string;
    external_reference?: string;
    party_id: string;
    party_name: string;
    warehouse_id: string;
    warehouse_name?: string;
    shipment_id?: string;
    container_number?: string;
    currency: string;
    exchange_rate: number;
    subtotal: number;
    tax_total: number;
    discount_total: number;
    grand_total: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    notes?: string;
    items?: TradeItem[];
    attachments?: Attachment[];
}

/** @deprecated Use PurchaseTransactionItem instead */
export interface TradeItem {
    id: string;
    document_id?: string;
    item_type: 'product' | 'material' | 'service';
    item_id: string;
    item_code: string;
    item_name: string;
    item_name_ar?: string;
    /** @deprecated Colors are now managed as variant materials */
    color_id?: string;
    /** @deprecated Colors are now managed as variant materials */
    color_name?: string;
    roll_id?: string;
    roll_code?: string;
    quantity: number;
    unit: string;
    rolls_count?: number;
    unit_price: number;
    discount_amount: number;
    discount_percent: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;
    cost_price?: number;
    notes?: string;
}

/** Grid fast input for fabric rolls */
export interface GridRollItem {
    id: string;
    material_id: string;
    /** @deprecated Colors are now managed as variant materials */
    color_id?: string;
    roll_length: number;
    is_saved: boolean;
}
