import type { DocumentConfig } from '../types'; // Correct import path if types is in parent

// Trade Order Config
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
        {
            id: 'trade_details',
            labelKey: 'trade.tabs.details',
            icon: 'LayoutList',
            component: 'TradeMainTab',
        },
        {
            id: 'shipping',
            labelKey: 'trade.tabs.shipping',
            icon: 'Truck',
            component: 'TradeShippingTab',
        },
        {
            id: 'attachments',
            labelKey: 'trade.tabs.attachments',
            icon: 'Paperclip',
            component: 'AttachmentsTab',
            badge: '0',
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
        },
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
    ],
    stats: [
        {
            id: 'total',
            labelKey: 'trade.total',
            valueKey: 'grand_total',
            icon: 'DollarSign',
            format: 'currency',
            colorClass: 'text-erp-navy',
        }
    ]
};

// Trade Request Config
export const tradeRequestConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_request',
    titleKey: 'trade.request.title',
    icon: 'Flag',
    iconColor: 'bg-amber-600',
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

// Trade Invoice Config
export const tradeInvoiceConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_invoice',
    titleKey: 'trade.invoice.title',
    icon: 'FileText',
    iconColor: 'bg-emerald-600',
};

// Trade Quotation Config
export const tradeQuotationConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_quotation',
    titleKey: 'trade.quotation.title',
    icon: 'FileText', // Or specialized icon
    iconColor: 'bg-purple-600',
};

// Trade Receipt Config (Goods Receipt)
export const tradeReceiptConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_receipt',
    titleKey: 'trade.receipt.title',
    icon: 'Truck',
    iconColor: 'bg-orange-600',
    // Custom stats for Receipt
    stats: [
        {
            id: 'container',
            labelKey: 'fields.containerNumber',
            valueKey: 'container_number', // Ensure mapping handles this or structured data
            icon: 'Container',
            colorClass: 'text-orange-600',
        },
        // ... default total maybe not relevant for receipt unless valued
    ]
};

// Trade Return Config
export const tradeReturnConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_return',
    titleKey: 'trade.return.title',
    icon: 'RotateCcw',
    iconColor: 'bg-rose-600',
};

// Trade Delivery Config
export const tradeDeliveryConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_delivery',
    titleKey: 'trade.delivery.title',
    icon: 'Truck',
    iconColor: 'bg-orange-500',
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

// Trade Reservation Config
export const tradeReservationConfig: DocumentConfig = {
    ...tradeOrderConfig,
    type: 'trade_reservation',
    titleKey: 'trade.reservation.title',
    icon: 'Package',
    iconColor: 'bg-cyan-600',
    stats: [
        {
            id: 'reservation_type',
            labelKey: 'fields.type',
            valueKey: 'reservation_type', // transit or stock
            icon: 'Layers',
            colorClass: 'text-cyan-600',
        }
    ]
};

// Trade Container Config (New)
export const tradeContainerConfig: DocumentConfig = {
    type: 'trade_container',
    titleKey: 'purchases.container_details.title', // or trade.container.title
    subtitleKey: 'purchases.container_details.subtitle', // or trade.container.subtitle
    icon: 'Ship', // Requires Ship icon in UnifiedAccountingSheet imports or mapped
    iconColor: 'bg-blue-600',
    defaultTab: 'trade_details', // Will render Container Invoices Selector
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['container_number', 'supplier_name', 'eta', 'status'],
    tabs: [
        {
            id: 'trade_details',
            labelKey: 'purchases.container_details.contents', // "Contents" / "Invoices"
            icon: 'FileText', // Invoice Icon
            component: 'TradeMainTab', // Will handle mode='container' internally
        },
        {
            id: 'shipping',
            labelKey: 'trade.tabs.shipping',
            icon: 'Anchor',
            component: 'TradeShippingTab',
        },
        {
            id: 'expenses',
            labelKey: 'purchases.container_details.expenses', // "Expenses"
            icon: 'DollarSign',
            component: 'ContainerExpensesTab', // Need to ensure UnifiedAccountingSheet handles this string
            // For now, let's stick to standard components or handle it in TradeMainTab
        },
        {
            id: 'attachments',
            labelKey: 'trade.tabs.attachments',
            icon: 'Paperclip',
            component: 'AttachmentsTab',
            badge: '0',
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
        },
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
