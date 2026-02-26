/**
 * ═══════════════════════════════════════════════════════════════
 * 📦 Unified Transaction Types
 * ═══════════════════════════════════════════════════════════════
 * التعريفات الموحدة لنظام المعاملات الجديد
 * يُستخدم لكل من المبيعات والمشتريات
 * ═══════════════════════════════════════════════════════════════
 */

// ═══ المراحل ═══

export type PurchaseStage =
    | 'draft'
    | 'quotation'
    | 'order'
    | 'approved'
    | 'receipt'
    | 'invoice'
    | 'posted'
    | 'partial_paid'
    | 'paid'
    | 'cancelled';

export type SalesStage =
    | 'draft'
    | 'quotation'
    | 'reservation'
    | 'order'
    | 'delivery'
    | 'invoice'
    | 'posted'
    | 'partial_paid'
    | 'paid'
    | 'cancelled';

export type TransactionType = 'purchase' | 'sale';

// ═══ واجهة المستخدم المتعلقة بالمراحل ═══

export interface StageConfig {
    key: string;
    label_ar: string;
    label_en: string;
    icon: string;
    color: string;
    bgColor: string;
    /** الأزرار المتاحة من هذه المرحلة */
    actions: StageAction[];
}

export interface StageAction {
    target_stage: string;
    label_ar: string;
    label_en: string;
    icon: string;
    variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'success';
    /** يتطلب تأكيد */
    requires_confirmation: boolean;
    /** يتطلب ملاحظات */
    requires_notes: boolean;
    /** يتطلب سبب (للإلغاء) */
    requires_reason: boolean;
}

// ═══ تتبع المستخدمين ═══

export interface UserTracking {
    user_id: string | null;
    user_name: string | null;
    timestamp: string | null;
}

// ═══ جدول المشتريات ═══

export interface PurchaseTransaction {
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id: string | null;

    stage: PurchaseStage;

    // أرقام المستند
    draft_no: string | null;
    quotation_no: string | null;
    order_no: string | null;
    receipt_no: string | null;
    invoice_no: string | null;

    // المورد
    supplier_id: string | null;
    supplier_name: string | null;

    // التواريخ
    doc_date: string;
    quotation_date: string | null;
    order_date: string | null;
    approval_date: string | null;
    receipt_date: string | null;
    invoice_date: string | null;
    due_date: string | null;

    // المستودع
    warehouse_id: string | null;
    shipment_id: string | null;
    receipt_mode: 'direct' | 'international';

    // المالية
    currency: string;
    exchange_rate: number;
    subtotal: number;
    discount_amount: number;
    discount_percent: number;
    tax_amount: number;
    expenses_total: number;
    total_amount: number;

    // الدفعات
    paid_amount: number;
    balance: number;
    payment_terms_days: number;

    // بيانات المورد الخارجية
    supplier_invoice_number: string | null;
    supplier_invoice_date: string | null;

    // المحاسبة
    journal_entry_id: string | null;
    is_posted: boolean;

    // 👤 تتبع المستخدمين
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;

    quoted_by: string | null;
    quoted_by_name: string | null;
    quoted_at: string | null;

    ordered_by: string | null;
    ordered_by_name: string | null;
    ordered_at: string | null;

    approved_by: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    approval_notes: string | null;

    received_by: string | null;
    received_by_name: string | null;
    received_at: string | null;

    invoiced_by: string | null;
    invoiced_by_name: string | null;
    invoiced_at: string | null;

    posted_by: string | null;
    posted_by_name: string | null;
    posted_at: string | null;

    cancelled_by: string | null;
    cancelled_by_name: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;

    updated_by: string | null;
    updated_at: string;

    // بيانات إضافية
    notes: string | null;
    supplier_notes: string | null;
    internal_notes: string | null;
    expenses: any[];
    attachments: any[];
    tags: string[];

    // حالات مساعدة
    confirmation_status: 'pending' | 'confirmed' | 'rejected';
    is_active: boolean;
    is_locked: boolean;

    // 🔒 Optimistic Locking
    version: number;

    // 🖨️ تتبع الطباعة
    printed_count: number;
    last_printed_at: string | null;
    last_printed_by: string | null;

    // ⏰ تتبع التذكيرات
    reminder_count: number;
    last_reminder_sent_at: string | null;

    // 🔄 المرتجعات
    original_transaction_id: string | null;
    is_return: boolean;

    // المصدر
    source_type: string | null;
    source_id: string | null;

    // 📦 تحديث المخزون المباشر
    auto_update_stock: boolean;
    stock_warehouse_id: string | null;
    stock_movement_id: string | null;

    // البنود (joins)
    items?: PurchaseTransactionItem[];
}

// ═══ جدول المبيعات ═══

export interface SalesTransaction {
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id: string | null;

    stage: SalesStage;

    // أرقام المستند
    draft_no: string | null;
    quotation_no: string | null;
    reservation_no: string | null;
    order_no: string | null;
    delivery_no: string | null;
    invoice_no: string | null;

    // العميل
    customer_id: string | null;
    customer_name: string | null;

    // المندوب
    salesperson_id: string | null;
    salesperson_name: string | null;

    // التواريخ
    doc_date: string;
    quotation_date: string | null;
    quotation_valid_until: string | null;
    reservation_date: string | null;
    order_date: string | null;
    delivery_date: string | null;
    invoice_date: string | null;
    due_date: string | null;

    // المستودع
    warehouse_id: string | null;
    shipping_method: string | null;
    shipping_address: string | null;
    tracking_number: string | null;

    // المالية
    currency: string;
    exchange_rate: number;
    subtotal: number;
    discount_amount: number;
    discount_percent: number;
    tax_amount: number;
    total_amount: number;

    // الدفعات
    paid_amount: number;
    balance: number;
    payment_terms_days: number;

    // نقاط البيع
    is_pos: boolean;
    pos_session_id: string | null;

    // المحاسبة
    journal_entry_id: string | null;
    cost_entry_id: string | null;
    cogs_journal_entry_id: string | null;
    is_posted: boolean;

    // 👤 تتبع المستخدمين
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;

    quoted_by: string | null;
    quoted_by_name: string | null;
    quoted_at: string | null;

    reserved_by: string | null;
    reserved_by_name: string | null;
    reserved_at: string | null;

    ordered_by: string | null;
    ordered_by_name: string | null;
    ordered_at: string | null;

    delivered_by: string | null;
    delivered_by_name: string | null;
    delivered_at: string | null;

    invoiced_by: string | null;
    invoiced_by_name: string | null;
    invoiced_at: string | null;

    posted_by: string | null;
    posted_by_name: string | null;
    posted_at: string | null;

    cancelled_by: string | null;
    cancelled_by_name: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;

    updated_by: string | null;
    updated_at: string;

    // بيانات إضافية
    notes: string | null;
    internal_notes: string | null;
    attachments: any[];
    tags: string[];

    // حالات مساعدة
    confirmation_status: string;
    is_active: boolean;
    is_locked: boolean;

    // 🔒 Optimistic Locking
    version: number;

    // 🖨️ تتبع الطباعة
    printed_count: number;
    last_printed_at: string | null;
    last_printed_by: string | null;

    // ⏰ تتبع التذكيرات
    reminder_count: number;
    last_reminder_sent_at: string | null;

    // 🔄 المرتجعات
    original_transaction_id: string | null;
    is_return: boolean;

    // المصدر
    source_type: string | null;
    source_id: string | null;

    // 📦 تحديث المخزون المباشر
    auto_update_stock: boolean;
    stock_warehouse_id: string | null;
    stock_movement_id: string | null;

    // البنود (joins)
    items?: SalesTransactionItem[];
}

// ═══ بنود المشتريات ═══

export interface PurchaseTransactionItem {
    id: string;
    transaction_id: string;
    line_number: number;

    product_id: string | null;
    material_id: string | null;
    item_code: string | null;
    description: string | null;
    description_ar: string | null;

    quantity: number;
    received_qty: number;
    returned_qty: number;
    unit: string;

    unit_price: number;
    discount_amount: number;
    discount_percent: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;

    color_id: string | null;
    color_name: string | null;
    roll_id: string | null;
    roll_code: string | null;
    rolls_count: number | null;

    warehouse_id: string | null;

    cost_price: number | null;
    landed_cost: number | null;

    notes: string | null;

    created_at: string;
    updated_at: string;
}

// ═══ بنود المبيعات ═══

export interface SalesTransactionItem {
    id: string;
    transaction_id: string;
    line_number: number;

    product_id: string | null;
    material_id: string | null;
    item_code: string | null;
    description: string | null;
    description_ar: string | null;

    quantity: number;
    delivered_qty: number;
    returned_qty: number;
    unit: string;

    unit_price: number;
    discount_amount: number;
    discount_percent: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;

    color_id: string | null;
    color_name: string | null;
    roll_id: string | null;
    roll_code: string | null;
    rolls_count: number | null;

    warehouse_id: string | null;

    cost_price: number | null;

    notes: string | null;

    created_at: string;
    updated_at: string;
}

// ═══ سجل المراحل ═══

export interface TransactionStageLog {
    id: string;
    transaction_type: TransactionType;
    transaction_id: string;
    from_stage: string;
    to_stage: string;
    generated_number: string | null;
    notes: string | null;
    metadata: Record<string, any>;
    performed_by: string | null;
    performed_by_name: string | null;
    performed_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

// ═══ نتيجة تحويل المرحلة ═══

export interface StageTransitionResult {
    success: boolean;
    error?: string;
    from_stage?: string;
    to_stage?: string;
    generated_number?: string;
    performed_by?: string;
    performed_by_name?: string;
}

// ═══ Input Types ═══

export interface CreatePurchaseTransactionInput {
    tenant_id: string;
    company_id: string;
    branch_id?: string;
    supplier_id?: string;
    supplier_name?: string;
    warehouse_id?: string;
    currency?: string;
    exchange_rate?: number;
    doc_date?: string;
    due_date?: string;
    payment_terms_days?: number;
    receipt_mode?: 'direct' | 'international';
    notes?: string;
    supplier_notes?: string;
    internal_notes?: string;
    tags?: string[];
    created_by?: string;
    created_by_name?: string;
    auto_update_stock?: boolean;
    stock_warehouse_id?: string;
}

export interface CreateSalesTransactionInput {
    tenant_id: string;
    company_id: string;
    branch_id?: string;
    customer_id?: string;
    customer_name?: string;
    salesperson_id?: string;
    salesperson_name?: string;
    warehouse_id?: string;
    currency?: string;
    exchange_rate?: number;
    doc_date?: string;
    due_date?: string;
    payment_terms_days?: number;
    is_pos?: boolean;
    notes?: string;
    internal_notes?: string;
    tags?: string[];
    created_by?: string;
    created_by_name?: string;
    auto_update_stock?: boolean;
    stock_warehouse_id?: string;
}

export interface TransactionItemInput {
    product_id?: string;
    material_id?: string;
    item_code?: string;
    description?: string;
    description_ar?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount_amount?: number;
    discount_percent?: number;
    tax_rate?: number;
    color_id?: string;
    color_name?: string;
    roll_id?: string;
    roll_code?: string;
    rolls_count?: number;
    warehouse_id?: string;
    notes?: string;
}

export interface AdvanceStageInput {
    transaction_type: TransactionType;
    transaction_id: string;
    new_stage: string;
    user_id: string;
    user_name?: string;
    notes?: string;
    cancellation_reason?: string;
}

// ═══ الفلاتر ═══

export interface TransactionFilter {
    stage?: string;
    stages?: string[];
    supplier_id?: string;
    customer_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    is_return?: boolean;
    is_posted?: boolean;
    salesperson_id?: string;
    min_amount?: number;
    max_amount?: number;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
