import type { DocumentConfig, TabConfig, ActionConfig, StatConfig, StageActionConfig } from '../types';

// ═══════════════════════════════════════════════════════════════
// Tab Definitions — تعريفات التبويبات
// ═══════════════════════════════════════════════════════════════

const TAB: Record<string, TabConfig> = {
    // ── مشترك بين المبيعات والمشتريات ──
    tradeDetails: {
        id: 'trade_details',
        labelKey: 'trade.tabs.details',
        icon: 'LayoutList',
        component: 'TradeMainTab',
    },
    materialBrowser: {
        id: 'material_browser',
        labelKey: 'trade.tabs.materials',
        icon: 'Search',
        component: 'MaterialBrowserTab',
        showInModes: ['view', 'create', 'edit'],
    },
    attachments: {
        id: 'attachments',
        labelKey: 'trade.tabs.attachments',
        icon: 'Paperclip',
        component: 'AttachmentsTab',
    },
    activity: {
        id: 'activity',
        labelKey: 'accounting.tabs.activity',
        icon: 'Clock',
        component: 'ActivityTab',
    },

    // ── خاص بالمبيعات ──
    paymentReceipt: {
        id: 'payment_receipt',
        labelKey: 'trade.tabs.payment',
        icon: 'CreditCard',
        component: 'PaymentReceiptTab',
    },
    customerShipping: {
        id: 'shipping',
        labelKey: 'trade.tabs.shipping',
        icon: 'Truck',
        component: 'CustomerShippingTab',
    },
    nexaAgent: {
        id: 'nexa_agent',
        labelKey: 'trade.tabs.nexaAgent',
        icon: 'Bot',
        component: 'NexaAgentTab',
    },

    // ── خاص بالمشتريات ──
    purchaseMaterialBrowser: {
        id: 'purchase_material_browser',
        labelKey: 'trade.tabs.materials',
        icon: 'Search',
        component: 'PurchaseMaterialBrowserTab',
        showInModes: ['view', 'create', 'edit'],
    },
    supplierInfo: {
        id: 'supplier_info',
        labelKey: 'trade.tabs.supplierInfo',
        icon: 'Building2',
        component: 'SupplierInfoTab',
    },
    purchasePayment: {
        id: 'purchase_payment',
        labelKey: 'trade.tabs.paymentAndExpenses',
        icon: 'Receipt',
        component: 'PurchasePaymentTab',
    },
    warehouseReceiving: {
        id: 'warehouse_receiving',
        labelKey: 'trade.tabs.warehouseReceiving',
        icon: 'Warehouse',
        component: 'WarehouseReceivingTab',
    },
    receiptSummary: {
        id: 'receipt_summary',
        labelKey: 'trade.tabs.receiptSummary',
        icon: 'ClipboardCheck',
        component: 'ReceiptSummaryTab',
    },
    // ── المورد والمالية (مدمج) ──
    supplierFinance: {
        id: 'supplier_finance',
        labelKey: 'trade.tabs.supplierFinance',
        icon: 'Building2',
        component: 'SupplierFinanceTab',
    },
    // ── معاينة القيد المحاسبي ──
    journalPreview: {
        id: 'journal_preview',
        labelKey: 'trade.tabs.journalPreview',
        icon: 'BookOpen',
        component: 'StageJournalPreview',
    },
    // ── المبيعات: الدفعات + القيد + التوصيل (مدمج) ──
    salesFinance: {
        id: 'sales_finance',
        labelKey: 'trade.tabs.salesFinance',
        icon: 'CreditCard',
        component: 'SalesFinanceTab',
    },

    // ── خاص بالحاويات ──
    maritimeShipping: {
        id: 'shipping',
        labelKey: 'trade.tabs.shipping',
        icon: 'Anchor',
        component: 'TradeShippingTab',
    },
    shipmentItems: {
        id: 'shipment_items',
        labelKey: 'trade.tabs.shipmentItems',
        icon: 'Package',
        component: 'ShipmentItemsTab',
    },
    expenses: {
        id: 'expenses',
        labelKey: 'purchases.container_details.expenses',
        icon: 'DollarSign',
        component: 'ContainerExpensesTab',
    },
};

// ═══════════════════════════════════════════════════════════════
// Stage-Aware Tab Variants — تبويبات حسب المرحلة
// ═══════════════════════════════════════════════════════════════

const STAGE_TAB: Record<string, TabConfig> = {
    // ── تبويب سجل المراحل (ظاهر دائماً) ──
    stageHistory: {
        id: 'stage_history',
        labelKey: 'trade.tabs.stageHistory',
        icon: 'GitBranch',
        component: 'TransactionStageHistory',
    },
    // ── أصناف (stage-aware) ──
    tradeDetailsStaged: {
        ...TAB.tradeDetails,
        editableInStages: ['draft', 'quotation'],
    },
    // ── مواد (stage-aware) ──
    materialBrowserStaged: {
        ...TAB.materialBrowser,
        visibleInStages: ['draft', 'quotation', 'order', 'approved', 'confirmed', 'in_delivery', 'delivered', 'partially_received', 'received', 'receipt', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['draft', 'quotation'],
        showInModes: ['view', 'create', 'edit'],
    },
    purchaseMaterialBrowserStaged: {
        ...TAB.purchaseMaterialBrowser,
        visibleInStages: ['draft', 'quotation', 'order', 'approved', 'confirmed', 'in_delivery', 'delivered', 'partially_received', 'received', 'receipt', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['draft', 'quotation'],
        showInModes: ['view', 'create', 'edit'],
    },
    // ── مورد (stage-aware) ──
    supplierInfoStaged: {
        ...TAB.supplierInfo,
        visibleInStages: ['draft', 'quotation', 'order', 'approved', 'confirmed', 'partially_received', 'received', 'receipt', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['draft', 'quotation'],
    },
    // ── سداد مشتريات (stage-aware) ──
    purchasePaymentStaged: {
        ...TAB.purchasePayment,
        visibleInStages: ['confirmed', 'partially_received', 'received', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['invoice', 'partial_paid'],
    },
    // ── استلام (stage-aware) ──
    warehouseReceivingStaged: {
        ...TAB.warehouseReceiving,
        visibleInStages: ['approved', 'confirmed', 'partially_received', 'received', 'receipt', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['receipt'],
    },
    // ── شحن مبيعات (stage-aware) ──
    customerShippingStaged: {
        ...TAB.customerShipping,
        visibleInStages: ['order', 'confirmed', 'in_delivery', 'delivered', 'delivery', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['order', 'delivery', 'in_delivery'],
    },
    // ── سداد مبيعات (stage-aware) ──
    paymentReceiptStaged: {
        ...TAB.paymentReceipt,
        visibleInStages: ['draft', 'quotation', 'reservation', 'order', 'confirmed', 'delivery', 'in_delivery', 'delivered', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['draft', 'quotation', 'order', 'invoice', 'partial_paid'],
    },
    // ── المورد والمالية المدمج — مشتريات (stage-aware) ──
    supplierFinanceStaged: {
        ...TAB.supplierFinance,
        visibleInStages: ['draft', 'quotation', 'reservation', 'order', 'approved', 'confirmed', 'delivery', 'in_delivery', 'delivered', 'partially_received', 'received', 'receipt', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['quotation', 'order'],
    },
    // ── المبيعات: دفعات + قيد + توصيل (stage-aware) ──
    salesFinanceStaged: {
        ...TAB.salesFinance,
        visibleInStages: ['draft', 'quotation', 'reservation', 'order', 'confirmed', 'delivery', 'in_delivery', 'in_transit', 'sent_to_branch', 'at_branch', 'delivered', 'invoice', 'posted', 'partial_paid', 'paid'],
        editableInStages: ['draft', 'quotation', 'order', 'invoice', 'partial_paid'],
    },
    // ── القيد المحاسبي (stage-aware) ──
    journalPreviewStaged: {
        ...TAB.journalPreview,
        visibleInStages: ['confirmed', 'in_delivery', 'in_transit', 'sent_to_branch', 'at_branch', 'delivered', 'partially_received', 'received', 'invoice', 'posted', 'partial_paid', 'paid'],
    },
};

// ═══════════════════════════════════════════════════════════════
// Stage Actions — أزرار كل مرحلة
// ═══════════════════════════════════════════════════════════════

const PURCHASE_STAGE_ACTIONS: Record<string, StageActionConfig[]> = {
    draft: [
        { id: 'to_quotation', labelAr: 'تأكيد كعرض سعر', labelEn: 'Confirm as Quotation', icon: '📋', targetStage: 'quotation', variant: 'default' },
        { id: 'to_order', labelAr: 'تحويل لأمر شراء', labelEn: 'Convert to Order', icon: '📦', targetStage: 'order', variant: 'outline' },
        { id: 'to_invoice_direct', labelAr: 'فاتورة مباشرة', labelEn: 'Direct Invoice', icon: '📄', targetStage: 'invoice', variant: 'outline' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    quotation: [
        { id: 'to_order', labelAr: 'تحويل لأمر شراء', labelEn: 'Convert to Purchase Order', icon: '📦', targetStage: 'order', variant: 'default' },
        { id: 'to_invoice', labelAr: 'تحويل لفاتورة', labelEn: 'Convert to Invoice', icon: '📄', targetStage: 'invoice', variant: 'outline' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    order: [
        { id: 'approve', labelAr: 'اعتماد الأمر', labelEn: 'Approve Order', icon: '✅', targetStage: 'approved', variant: 'success', requiresConfirm: true, confirmMessageAr: 'هل تريد اعتماد هذا الأمر؟', confirmMessageEn: 'Approve this purchase order?' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    approved: [
        { id: 'to_receipt', labelAr: 'تسجيل استلام', labelEn: 'Record Receipt', icon: '📦', targetStage: 'receipt', variant: 'default' },
        { id: 'to_invoice', labelAr: 'فاتورة بدون استلام', labelEn: 'Invoice without Receipt', icon: '📄', targetStage: 'invoice', variant: 'outline' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    receipt: [
        { id: 'to_invoice', labelAr: 'إنشاء فاتورة', labelEn: 'Create Invoice', icon: '📄', targetStage: 'invoice', variant: 'default' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    // ═══ مرحلة التأكيد — بعد save_confirm ═══
    confirmed: [
        { id: 'post', labelAr: 'ترحيل (بدون استلام)', labelEn: 'Post (without receipt)', icon: '📮', targetStage: 'posted', variant: 'success', requiresConfirm: true, confirmMessageAr: 'لم يتم استلام البضاعة بعد. سيتم الترحيل بقيم الفاتورة. متابعة؟', confirmMessageEn: 'Goods not received yet. Will post using invoice amounts. Continue?' },
        { id: 'unconfirm', labelAr: 'إلغاء التأكيد', labelEn: 'Unconfirm', icon: '↩️', targetStage: 'draft', variant: 'outline', requiresConfirm: true, confirmMessageAr: 'إعادة الفاتورة لحالة المسودة؟', confirmMessageEn: 'Return invoice to draft?' },
    ],
    // ═══ استلام جزئي — تم استلام جزء من البضاعة ═══
    partially_received: [
        { id: 'post', labelAr: 'ترحيل (بالكميات المستلمة)', labelEn: 'Post (received quantities)', icon: '📮', targetStage: 'posted', variant: 'success', requiresConfirm: true, confirmMessageAr: 'سيتم الترحيل بالكميات المستلمة فعلياً. متابعة؟', confirmMessageEn: 'Will post using actual received quantities. Continue?' },
    ],
    // ═══ استلام كامل — تم استلام كل البضاعة ═══
    received: [
        { id: 'post', labelAr: 'ترحيل', labelEn: 'Post', icon: '📮', targetStage: 'posted', variant: 'success', requiresConfirm: true, confirmMessageAr: 'سيتم إنشاء القيد المحاسبي بالكميات المستلمة. متابعة؟', confirmMessageEn: 'Journal entry will use received quantities. Continue?' },
    ],
    invoice: [
        { id: 'post', labelAr: 'ترحيل', labelEn: 'Post', icon: '📮', targetStage: 'posted', variant: 'success', requiresConfirm: true, confirmMessageAr: 'سيتم إنشاء قيد محاسبي. هل تريد المتابعة؟', confirmMessageEn: 'A journal entry will be created. Continue?' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    posted: [
        { id: 'pay', labelAr: 'تسجيل دفعة', labelEn: 'Record Payment', icon: '💰', targetStage: 'partial_paid', variant: 'default', requiresNotes: true },
    ],
    partial_paid: [
        { id: 'pay_full', labelAr: 'دفع كامل', labelEn: 'Pay in Full', icon: '💰', targetStage: 'paid', variant: 'success' },
        { id: 'pay_partial', labelAr: 'دفعة إضافية', labelEn: 'Additional Payment', icon: '💳', targetStage: 'partial_paid', variant: 'default', requiresNotes: true },
    ],
    paid: [],
    cancelled: [
        { id: 'reopen', labelAr: 'إعادة فتح', labelEn: 'Reopen', icon: '🔄', targetStage: 'draft', variant: 'outline', requiresConfirm: true, confirmMessageAr: 'إعادة فتح المعاملة كمسودة؟', confirmMessageEn: 'Reopen as draft?' },
    ],
};

const SALES_STAGE_ACTIONS: Record<string, StageActionConfig[]> = {
    draft: [
        { id: 'to_quotation', labelAr: 'تأكيد كعرض سعر', labelEn: 'Confirm as Quotation', icon: '📋', targetStage: 'quotation', variant: 'default' },
        { id: 'to_order', labelAr: 'تحويل لأمر بيع', labelEn: 'Convert to Sales Order', icon: '🛒', targetStage: 'order', variant: 'outline' },
        { id: 'to_invoice_pos', labelAr: 'فاتورة مباشرة (POS)', labelEn: 'Direct Invoice (POS)', icon: '⚡', targetStage: 'invoice', variant: 'outline' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    quotation: [
        { id: 'to_reservation', labelAr: 'حجز بضاعة', labelEn: 'Reserve Stock', icon: '📦', targetStage: 'reservation', variant: 'outline' },
        { id: 'to_order', labelAr: 'تحويل لأمر بيع', labelEn: 'Convert to Sales Order', icon: '🛒', targetStage: 'order', variant: 'default' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    reservation: [
        { id: 'to_order', labelAr: 'تأكيد كأمر بيع', labelEn: 'Confirm as Sales Order', icon: '🛒', targetStage: 'order', variant: 'default' },
        { id: 'cancel', labelAr: 'إلغاء الحجز', labelEn: 'Cancel Reservation', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    order: [
        { id: 'to_delivery', labelAr: 'تسليم البضاعة', labelEn: 'Deliver Goods', icon: '🚚', targetStage: 'delivery', variant: 'default' },
        { id: 'to_invoice', labelAr: 'فوترة بدون تسليم', labelEn: 'Invoice without Delivery', icon: '📄', targetStage: 'invoice', variant: 'outline' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    delivery: [
        { id: 'to_invoice', labelAr: 'إنشاء فاتورة', labelEn: 'Create Invoice', icon: '📄', targetStage: 'invoice', variant: 'default' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    invoice: [
        { id: 'post', labelAr: 'ترحيل', labelEn: 'Post', icon: '📮', targetStage: 'posted', variant: 'success', requiresConfirm: true, confirmMessageAr: 'سيتم إنشاء قيد محاسبي. هل تريد المتابعة؟', confirmMessageEn: 'A journal entry will be created. Continue?' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    // المراحل الجديدة — إذن التسليم
    confirmed: [
        { id: 'to_in_delivery', labelAr: 'تأكيد الإخراج من المستودع', labelEn: 'Confirm Warehouse Dispatch', icon: '📤', targetStage: 'in_delivery', variant: 'success', requiresConfirm: true, confirmMessageAr: 'سيتم إخراج البضاعة وترحيل القيد المحاسبي', confirmMessageEn: 'Stock will be dispatched and journal entry posted' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    sent_to_branch: [
        { id: 'confirm_delivery', labelAr: 'تأكيد التسليم للعميل', labelEn: 'Confirm Customer Delivery', icon: '✅', targetStage: 'delivered', variant: 'success', requiresConfirm: true, confirmMessageAr: 'هل تم تسليم البضاعة للعميل؟', confirmMessageEn: 'Has goods been delivered to the customer?' },
    ],
    in_delivery: [
        { id: 'confirm_delivery', labelAr: 'تأكيد التسليم', labelEn: 'Confirm Delivery', icon: '✅', targetStage: 'delivered', variant: 'success', requiresConfirm: true, confirmMessageAr: 'هل تم تسليم البضاعة للعميل؟', confirmMessageEn: 'Has goods been delivered to the customer?' },
    ],
    // ── مراحل التسليم عبر الفرع ──
    in_transit: [
        { id: 'confirm_branch_receipt', labelAr: 'تأكيد الاستلام في الفرع', labelEn: 'Confirm Branch Receipt', icon: '📥', targetStage: 'at_branch', variant: 'success', requiresConfirm: true, confirmMessageAr: 'تأكيد استلام البضاعة في الفرع؟', confirmMessageEn: 'Confirm goods received at branch?' },
        { id: 'return_goods', labelAr: 'إرجاع البضاعة', labelEn: 'Return Goods', icon: '↩️', targetStage: 'confirmed', variant: 'destructive', requiresReason: true },
    ],
    at_branch: [
        { id: 'confirm_customer_delivery', labelAr: 'تأكيد التسليم للعميل', labelEn: 'Confirm Customer Delivery', icon: '✅', targetStage: 'delivered', variant: 'success', requiresConfirm: true, confirmMessageAr: 'هل تم تسليم البضاعة للعميل؟', confirmMessageEn: 'Has goods been delivered to the customer?' },
        { id: 'return_to_warehouse', labelAr: 'إرجاع للمستودع', labelEn: 'Return to Warehouse', icon: '🔙', targetStage: 'confirmed', variant: 'destructive', requiresReason: true },
    ],
    delivered: [],
    posted: [
        { id: 'collect', labelAr: 'تحصيل دفعة', labelEn: 'Collect Payment', icon: '💰', targetStage: 'partial_paid', variant: 'default', requiresNotes: true },
    ],
    partial_paid: [
        { id: 'collect_full', labelAr: 'تحصيل كامل', labelEn: 'Collect in Full', icon: '💰', targetStage: 'paid', variant: 'success' },
        { id: 'collect_partial', labelAr: 'دفعة إضافية', labelEn: 'Additional Collection', icon: '💳', targetStage: 'partial_paid', variant: 'default', requiresNotes: true },
    ],
    paid: [],
    cancelled: [
        { id: 'reopen', labelAr: 'إعادة فتح', labelEn: 'Reopen', icon: '🔄', targetStage: 'draft', variant: 'outline', requiresConfirm: true, confirmMessageAr: 'إعادة فتح المعاملة كمسودة؟', confirmMessageEn: 'Reopen as draft?' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// مراحل المناقلات — Transfer Stage Actions
// ═══════════════════════════════════════════════════════════════

const TRANSFER_STAGE_ACTIONS: Record<string, StageActionConfig[]> = {
    draft: [
        { id: 'confirm_transfer', labelAr: 'تأكيد طلب المناقلة', labelEn: 'Confirm Transfer Request', icon: '✅', targetStage: 'confirmed', variant: 'success', requiresConfirm: true, confirmMessageAr: 'سيتم إرسال الطلب لأمين المستودع المصدر', confirmMessageEn: 'Request will be sent to source warehouse keeper' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    confirmed: [
        { id: 'start_loading', labelAr: 'بدء التحميل', labelEn: 'Start Loading', icon: '📦', targetStage: 'loading', variant: 'default' },
        { id: 'cancel', labelAr: 'إلغاء', labelEn: 'Cancel', icon: '❌', targetStage: 'cancelled', variant: 'destructive', requiresReason: true },
    ],
    loading: [
        { id: 'ship', labelAr: 'إرسال البضاعة', labelEn: 'Ship Goods', icon: '🚚', targetStage: 'shipped', variant: 'success', requiresConfirm: true, confirmMessageAr: 'تأكيد إرسال البضاعة؟', confirmMessageEn: 'Confirm goods shipment?' },
    ],
    shipped: [
        { id: 'receive', labelAr: 'تأكيد الاستلام', labelEn: 'Confirm Receipt', icon: '📥', targetStage: 'received', variant: 'success', requiresConfirm: true, confirmMessageAr: 'تأكيد استلام البضاعة في المستودع الوجهة؟', confirmMessageEn: 'Confirm goods received at destination warehouse?' },
    ],
    received: [],
    cancelled: [
        { id: 'reopen', labelAr: 'إعادة فتح', labelEn: 'Reopen', icon: '🔄', targetStage: 'draft', variant: 'outline', requiresConfirm: true, confirmMessageAr: 'إعادة فتح المناقلة كمسودة؟', confirmMessageEn: 'Reopen transfer as draft?' },
    ],
};

const TRANSFER_STAGE_ORDER = ['draft', 'confirmed', 'loading', 'shipped', 'received'];

// Stage order constants
const PURCHASE_STAGE_ORDER = ['draft', 'quotation', 'order', 'approved', 'confirmed', 'partially_received', 'received', 'receipt', 'invoice', 'posted', 'partial_paid', 'paid'];
const SALES_STAGE_ORDER = ['draft', 'quotation', 'reservation', 'order', 'delivery', 'invoice', 'confirmed', 'in_delivery', 'in_transit', 'sent_to_branch', 'at_branch', 'delivered', 'posted', 'partial_paid', 'paid'];

// ═══════════════════════════════════════════════════════════════
// Common Action Definitions
// ═══════════════════════════════════════════════════════════════

const TRADE_ACTIONS: ActionConfig[] = [
    {
        id: 'save',
        labelKey: 'actions.save',
        icon: 'Save',
        variant: 'default',
        showInModes: ['create', 'edit'],
    },
    {
        id: 'confirm',
        labelKey: 'actions.confirm',
        icon: 'CheckCircle',
        variant: 'default',
        showInModes: ['view'],
        requiresConfirm: true,
        confirmMessageKey: 'trade.confirmDocument',
    },
    {
        id: 'print',
        labelKey: 'actions.print',
        icon: 'Printer',
        variant: 'outline',
        showInModes: ['view'],
    },
    {
        id: 'track',
        labelKey: 'trade.track',
        icon: 'MapPin',
        variant: 'secondary',
        showInModes: ['view'],
    }
];

const TOTAL_STAT: StatConfig = {
    id: 'total',
    labelKey: 'trade.total',
    valueKey: 'grand_total',
    icon: 'DollarSign',
    format: 'currency',
    colorClass: 'text-erp-navy',
};

// ═══════════════════════════════════════════════════════════════
//   ██████  ███    ███ ██████  ██ ██     ██  █████  ████████
//  ██       ████  ████ ██   ██    ██     ██ ██   ██    ██
//  ██   ███ ██ ████ ██ ██████  ██ ██  █  ██ ███████    ██
//  ██    ██ ██  ██  ██ ██      ██ ██ ███ ██ ██   ██    ██
//   ██████  ██      ██ ██      ██  ███ ███  ██   ██    ██
//
//  المبيعات — Sales Configurations
// ═══════════════════════════════════════════════════════════════

// ── أمر بيع (Sales Order) ──
// التبويبات: الأصناف + متصفح المواد + السداد + الشحن + NexaAgent + المرفقات + النشاط
export const tradeOrderConfig: DocumentConfig = {
    type: 'trade_order',
    titleKey: 'trade.order.title',
    subtitleKey: 'trade.order.subtitle',
    icon: 'ShoppingCart',
    iconColor: 'bg-indigo-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'party_name', 'date', 'status'],
    tabs: [
        TAB.tradeDetails,
        TAB.materialBrowser,
        TAB.paymentReceipt,
        TAB.customerShipping,
        TAB.nexaAgent,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
    // ═══ Stage Awareness ═══
    stageOrder: SALES_STAGE_ORDER,
    stageActions: SALES_STAGE_ACTIONS,
    editableStages: ['draft', 'quotation'],
    lockedStages: ['posted', 'partial_paid', 'paid', 'cancelled'],
};

// ── فاتورة بيع (Sales Invoice) ──
// نفس أمر البيع
export const tradeInvoiceConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_invoice',
    titleKey: 'trade.invoice.title',
    icon: 'FileText',
    iconColor: 'bg-emerald-600',
    // Stage-aware tabs (override parent)
    tabs: [
        STAGE_TAB.tradeDetailsStaged,
        STAGE_TAB.materialBrowserStaged,
        STAGE_TAB.salesFinanceStaged,
        TAB.nexaAgent,
        TAB.activity,
        TAB.attachments,
    ],
};

// ── عرض سعر (Sales Quotation) ──
// ❌ لا يحتاج: شحن, سداد, NexaAgent
export const tradeQuotationConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_quotation',
    titleKey: 'trade.quotation.title',
    icon: 'FileText',
    iconColor: 'bg-purple-600',
    tabs: [
        TAB.tradeDetails,
        TAB.materialBrowser,
        TAB.attachments,
    ],
};

// ── إذن تسليم (Delivery Note) ──
// ❌ لا يحتاج: متصفح مواد, سداد, NexaAgent
export const tradeDeliveryConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_delivery',
    titleKey: 'trade.delivery.title',
    icon: 'Truck',
    iconColor: 'bg-orange-500',
    tabs: [
        TAB.tradeDetails,
        TAB.customerShipping,
        TAB.attachments,
    ],
    stats: [
        {
            id: 'delivery_status',
            labelKey: 'fields.status',
            valueKey: 'status',
            icon: 'Activity',
            colorClass: 'text-orange-600',
        }
    ]
};

// ── حجز بضاعة (Reservation) ──
// ❌ لا يحتاج: شحن, سداد, NexaAgent
export const tradeReservationConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_reservation',
    titleKey: 'trade.reservation.title',
    icon: 'Package',
    iconColor: 'bg-cyan-600',
    tabs: [
        TAB.tradeDetails,
        TAB.materialBrowser,
        TAB.attachments,
    ],
    stats: [
        {
            id: 'reservation_type',
            labelKey: 'fields.type',
            valueKey: 'reservation_type',
            icon: 'Layers',
            colorClass: 'text-cyan-600',
        }
    ]
};

// ── مرتجع بيع (Sales Return) ──
export const tradeReturnConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_return',
    titleKey: 'trade.return.title',
    icon: 'RotateCcw',
    iconColor: 'bg-rose-600',
    tabs: [
        TAB.tradeDetails,
        TAB.materialBrowser,
        TAB.paymentReceipt,
        TAB.attachments,
    ],
};

// ═══════════════════════════════════════════════════════════════
//  ██████  ██    ██ ██████   ██████ ██   ██  █████  ███████ ███████
//  ██   ██ ██    ██ ██   ██ ██      ██   ██ ██   ██ ██      ██
//  ██████  ██    ██ ██████  ██      ███████ ███████ ███████ █████
//  ██      ██    ██ ██   ██ ██      ██   ██ ██   ██      ██ ██
//  ██       ██████  ██   ██  ██████ ██   ██ ██   ██ ███████ ███████
//
//  المشتريات — Purchase Configurations
// ═══════════════════════════════════════════════════════════════

// ── أمر شراء (Purchase Order) ──
// التبويبات: الأصناف + متصفح المواد + المورد + الشحن + المرفقات + النشاط
export const purchaseOrderConfig: DocumentConfig = {
    type: 'trade_order',
    titleKey: 'purchases.order.title',
    subtitleKey: 'purchases.order.subtitle',
    icon: 'ShoppingCart',
    iconColor: 'bg-teal-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'supplier_name', 'date', 'status'],
    tabs: [
        TAB.tradeDetails,
        TAB.purchaseMaterialBrowser,
        TAB.supplierInfo,
        TAB.customerShipping, // re-used as purchase shipping
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
    // ═══ Stage Awareness ═══
    stageOrder: PURCHASE_STAGE_ORDER,
    stageActions: PURCHASE_STAGE_ACTIONS,
    editableStages: ['draft', 'quotation'],
    lockedStages: ['posted', 'partial_paid', 'paid', 'cancelled'],
};

// ── فاتورة شراء (Purchase Invoice) ──
// التبويبات: الأصناف + متصفح المواد + المورد + المصاريف + المرفقات + النشاط
export const purchaseInvoiceConfig: DocumentConfig = {
    type: 'trade_invoice',
    titleKey: 'purchases.invoice.title',
    subtitleKey: 'purchases.invoice.subtitle',
    icon: 'FileText',
    iconColor: 'bg-indigo-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'supplier_name', 'date', 'status'],
    tabs: [
        STAGE_TAB.tradeDetailsStaged,
        STAGE_TAB.purchaseMaterialBrowserStaged,
        STAGE_TAB.supplierFinanceStaged,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
    // ═══ Stage Awareness ═══
    stageOrder: PURCHASE_STAGE_ORDER,
    stageActions: PURCHASE_STAGE_ACTIONS,
    editableStages: ['draft', 'quotation', 'receipt', 'invoice', 'partial_paid'],
    lockedStages: ['confirmed', 'partially_received', 'received', 'posted', 'paid', 'cancelled'],
};

// ── طلب شراء (Purchase Request) ──
// التبويبات: الأصناف + متصفح المواد + المرفقات + النشاط
export const purchaseRequestConfig: DocumentConfig = {
    type: 'trade_request',
    titleKey: 'purchases.request.title',
    subtitleKey: 'purchases.request.subtitle',
    icon: 'Flag',
    iconColor: 'bg-amber-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'date', 'status'],
    tabs: [
        TAB.tradeDetails,
        TAB.purchaseMaterialBrowser,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [
        {
            id: 'request_date',
            labelKey: 'fields.requestDate',
            valueKey: 'date',
            icon: 'Calendar',
            colorClass: 'text-amber-600',
        }
    ]
};

// ── عرض سعر مورد (Purchase Quotation) ──
export const purchaseQuotationConfig: DocumentConfig = {
    type: 'trade_quotation',
    titleKey: 'purchases.quotation.title',
    subtitleKey: 'purchases.quotation.subtitle',
    icon: 'FileText',
    iconColor: 'bg-purple-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'supplier_name', 'date', 'status'],
    tabs: [
        TAB.tradeDetails,
        TAB.purchaseMaterialBrowser,
        TAB.supplierInfo,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
};

// ── استلام بضاعة (Purchase Receipt / Goods Receipt) ──
export const purchaseReceiptConfig: DocumentConfig = {
    type: 'trade_receipt',
    titleKey: 'purchases.receipt.title',
    subtitleKey: 'purchases.receipt.subtitle',
    icon: 'Truck',
    iconColor: 'bg-orange-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'supplier_name', 'date', 'status'],
    tabs: [
        TAB.tradeDetails,
        TAB.purchaseMaterialBrowser,
        TAB.warehouseReceiving,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [
        {
            id: 'container',
            labelKey: 'fields.containerNumber',
            valueKey: 'container_number',
            icon: 'Container',
            colorClass: 'text-orange-600',
        },
    ]
};

// ── مرتجع شراء (Purchase Return) ──
export const purchaseReturnConfig: DocumentConfig = {
    type: 'trade_return',
    titleKey: 'purchases.return.title',
    subtitleKey: 'purchases.return.subtitle',
    icon: 'RotateCcw',
    iconColor: 'bg-rose-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'supplier_name', 'date', 'status'],
    tabs: [
        TAB.tradeDetails,
        TAB.supplierInfo,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
};

// ═══════════════════════════════════════════════════════════════
// استلام مواد مخزنية (Goods Receipt — Warehouse Level)
// ═══════════════════════════════════════════════════════════════
export const goodsReceiptConfig: DocumentConfig = {
    type: 'goods_receipt',
    titleKey: 'warehouse.goodsReceipt.title',
    subtitleKey: 'warehouse.goodsReceipt.subtitle',
    icon: 'ArrowDownToLine',
    iconColor: 'bg-emerald-600',
    defaultTab: 'goods_receipt_items',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'warehouse_name', 'date', 'status'],
    tabs: [
        {
            id: 'goods_receipt_items',
            labelKey: 'warehouse.goodsReceipt.tabs.items',
            icon: 'ScanLine',
            component: 'GoodsReceiptItemsTab',
        },
        TAB.attachments,
    ],
    actions: [
        {
            id: 'save',
            labelKey: 'actions.save',
            icon: 'Save',
            variant: 'default',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'delete',
            labelKey: 'actions.delete',
            icon: 'Trash2',
            variant: 'destructive',
            showInModes: ['create', 'edit', 'view'],
            requiresConfirm: true,
            confirmMessageKey: 'messages.confirmDelete',
        },
        {
            id: 'post',
            labelKey: 'accounting.post',
            icon: 'CheckCircle',
            variant: 'default',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'outline',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'rollsCount',
            labelKey: 'warehouse.goodsReceipt.stats.rolls',
            valueKey: 'rolls_count',
            icon: 'Cylinder',
            format: 'number',
            colorClass: 'text-emerald-600',
        },
        {
            id: 'totalLength',
            labelKey: 'warehouse.goodsReceipt.stats.totalLength',
            valueKey: 'total_length',
            icon: 'Ruler',
            format: 'number',
            colorClass: 'text-blue-600',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════
// تسليم مبيعات (Sales Delivery — Warehouse Level)
// اختيار رولونات موجودة للتسليم (عكس الاستلام)
// ═══════════════════════════════════════════════════════════════
export const salesDeliveryConfig: DocumentConfig = {
    type: 'sales_delivery',
    titleKey: 'warehouse.salesDelivery.title',
    subtitleKey: 'warehouse.salesDelivery.subtitle',
    icon: 'Truck',
    iconColor: 'bg-rose-600',
    defaultTab: 'sales_delivery_items',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'warehouse_name', 'date', 'status'],
    tabs: [
        {
            id: 'sales_delivery_items',
            labelKey: 'warehouse.salesDelivery.tabs.items',
            icon: 'ScanLine',
            component: 'SalesDeliveryItemsTab',
        },
        {
            id: 'delivery_info',
            labelKey: 'warehouse.salesDelivery.tabs.deliveryInfo',
            icon: 'Truck',
            component: 'DeliveryInfoTab',
        },
        TAB.attachments,
    ],
    actions: [
        {
            id: 'save',
            labelKey: 'actions.save',
            icon: 'Save',
            variant: 'default',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'outline',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'rollsCount',
            labelKey: 'warehouse.salesDelivery.stats.rolls',
            valueKey: 'rolls_count',
            icon: 'Cylinder',
            format: 'number',
            colorClass: 'text-rose-600',
        },
        {
            id: 'totalLength',
            labelKey: 'warehouse.salesDelivery.stats.totalLength',
            valueKey: 'total_length',
            icon: 'Ruler',
            format: 'number',
            colorClass: 'text-blue-600',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════
// حاوية (Container/Shipment) — مشتريات فقط
// ═══════════════════════════════════════════════════════════════
export const tradeContainerConfig: DocumentConfig = {
    type: 'trade_container',
    titleKey: 'purchases.container_details.title',
    subtitleKey: 'purchases.container_details.subtitle',
    icon: 'Ship',
    iconColor: 'bg-blue-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['container_number', 'supplier_name', 'eta', 'status'],
    tabs: [
        {
            ...TAB.tradeDetails,
            labelKey: 'purchases.container_details.info',
            icon: 'FileText',
        },
        TAB.shipmentItems,
        TAB.expenses,
        {
            id: 'receipt_summary',
            labelKey: 'trade.tabs.receiptSummary',
            icon: 'ClipboardCheck',
            component: 'ContainerReceiptSummaryTab',
        },
        TAB.attachments,
    ],
    actions: [
        {
            id: 'save',
            labelKey: 'actions.save',
            icon: 'Save',
            variant: 'default',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'track',
            labelKey: 'trade.track',
            icon: 'MapPin',
            variant: 'secondary',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'outline',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'status',
            labelKey: 'fields.status',
            valueKey: 'status',
            icon: 'Activity',
            colorClass: 'text-blue-600',
        },
        {
            id: 'eta',
            labelKey: 'fields.eta',
            valueKey: 'eta',
            icon: 'Calendar',
            colorClass: 'text-gray-600',
        }
    ]
};


// ═══════════════════════════════════════════════════════════════
// مناقلات — Transfer Configurations
// ═══════════════════════════════════════════════════════════════

// ── طلب مناقلة (Transfer Request / Invoice) ──
// شبيه بفاتورة المبيعات لكن:
// - بدون أسعار/ضرائب/خصومات/سداد
// - بدل العميل → مستودع من + مستودع إلى
export const transferInvoiceConfig: DocumentConfig = {
    type: 'trade_invoice',
    titleKey: 'warehouse.transfer.title',
    subtitleKey: 'warehouse.transfer.subtitle',
    icon: 'ArrowLeftRight',
    iconColor: 'bg-blue-600',
    defaultTab: 'trade_details',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference_number', 'from_warehouse', 'to_warehouse', 'date', 'status'],
    tabs: [
        STAGE_TAB.tradeDetailsStaged,
        STAGE_TAB.materialBrowserStaged,
        TAB.attachments,
    ],
    actions: TRADE_ACTIONS,
    stats: [],
    // ═══ Stage Awareness ═══
    stageOrder: TRANSFER_STAGE_ORDER,
    stageActions: TRANSFER_STAGE_ACTIONS,
    editableStages: ['draft'],
    lockedStages: ['received', 'cancelled'],
};

const TRANSFER_CONFIG_MAP: Partial<Record<string, DocumentConfig>> = {
    trade_invoice: transferInvoiceConfig,
};

// ═══════════════════════════════════════════════════════════════
// Sales-mode configs (default) — backward compatible
// ═══════════════════════════════════════════════════════════════
export const tradeRequestConfig = purchaseRequestConfig;
export const tradeReceiptConfig = purchaseReceiptConfig;


// ═══════════════════════════════════════════════════════════════
// getTradeDocConfig — Smart config resolver
// Returns the correct DocumentConfig based on docType + tradeMode
// ═══════════════════════════════════════════════════════════════

const PURCHASE_CONFIG_MAP: Partial<Record<string, DocumentConfig>> = {
    trade_order: purchaseOrderConfig,
    trade_invoice: purchaseInvoiceConfig,
    trade_quotation: purchaseQuotationConfig,
    trade_request: purchaseRequestConfig,
    trade_receipt: purchaseReceiptConfig,
    trade_return: purchaseReturnConfig,
    trade_container: tradeContainerConfig,
};

const SALES_CONFIG_MAP: Partial<Record<string, DocumentConfig>> = {
    trade_order: tradeOrderConfig,
    trade_invoice: tradeInvoiceConfig,
    trade_quotation: tradeQuotationConfig,
    trade_delivery: tradeDeliveryConfig,
    trade_reservation: tradeReservationConfig,
    trade_return: tradeReturnConfig,
};

/**
 * Get trade document config based on docType and mode.
 * - If mode is 'purchase', returns purchase-specific config (different tabs)
 * - If mode is 'transfer', returns transfer-specific config (no prices)
 * - If mode is 'sales' or undefined, returns sales config (default)
 */
export function getTradeDocConfig(
    docType: string,
    tradeMode?: 'sales' | 'purchase' | 'transfer'
): DocumentConfig | null {
    if (tradeMode === 'transfer') {
        return TRANSFER_CONFIG_MAP[docType] || null;
    }
    if (tradeMode === 'purchase') {
        return PURCHASE_CONFIG_MAP[docType] || null;
    }
    return SALES_CONFIG_MAP[docType] || null;
}
