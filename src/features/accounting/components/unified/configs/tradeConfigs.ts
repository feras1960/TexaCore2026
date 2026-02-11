import type { DocumentConfig, TabConfig, ActionConfig, StatConfig } from '../types';

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
    },
    attachments: {
        id: 'attachments',
        labelKey: 'trade.tabs.attachments',
        icon: 'Paperclip',
        component: 'AttachmentsTab',
        badge: '0',
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
        TAB.activity,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
};

// ── فاتورة بيع (Sales Invoice) ──
// نفس أمر البيع
export const tradeInvoiceConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_invoice',
    titleKey: 'trade.invoice.title',
    icon: 'FileText',
    iconColor: 'bg-emerald-600',
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
        TAB.activity,
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
        TAB.activity,
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
        TAB.activity,
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
        TAB.activity,
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
        TAB.materialBrowser,
        TAB.supplierInfo,
        TAB.customerShipping, // re-used as purchase shipping
        TAB.attachments,
        TAB.activity,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
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
        TAB.tradeDetails,
        TAB.materialBrowser,
        TAB.supplierInfo,
        TAB.purchasePayment,
        TAB.attachments,
        TAB.activity,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
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
        TAB.materialBrowser,
        TAB.attachments,
        TAB.activity,
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
        TAB.materialBrowser,
        TAB.supplierInfo,
        TAB.attachments,
        TAB.activity,
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
        TAB.materialBrowser,
        TAB.attachments,
        TAB.activity,
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
        TAB.activity,
    ],
    actions: TRADE_ACTIONS,
    stats: [TOTAL_STAT],
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
            labelKey: 'purchases.container_details.contents',
            icon: 'FileText',
        },
        TAB.maritimeShipping,
        TAB.shipmentItems,
        TAB.purchasePayment,
        TAB.expenses,
        TAB.attachments,
        TAB.activity,
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
 * - If mode is 'sales' or undefined, returns sales config (default)
 */
export function getTradeDocConfig(
    docType: string,
    tradeMode?: 'sales' | 'purchase'
): DocumentConfig | null {
    if (tradeMode === 'purchase') {
        return PURCHASE_CONFIG_MAP[docType] || null;
    }
    return SALES_CONFIG_MAP[docType] || null;
}
