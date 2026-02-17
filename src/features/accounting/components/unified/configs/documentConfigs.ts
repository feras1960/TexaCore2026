/**
 * Document Configurations - تكوينات أنواع المستندات
 * يحدد الخصائص والتبويبات والإجراءات لكل نوع مستند
 */

import type { DocumentConfig } from '../types';

// Account Configuration - تكوين الحسابات
export const accountConfig: DocumentConfig = {
    type: 'account',
    titleKey: 'accounting.account.title',
    subtitleKey: 'accounting.account.subtitle',
    icon: 'BookOpen',
    iconColor: 'bg-blue-600',
    defaultTab: 'overview',
    supportsModes: ['view', 'edit'],
    headerFields: ['code', 'name', 'current_balance', 'account_type'],
    tabs: [
        {
            id: 'overview',
            labelKey: 'accounting.tabs.overview',
            icon: 'LayoutDashboard',
            component: 'OverviewTab',
        },
        {
            id: 'ledger',
            labelKey: 'accounting.tabs.ledger',
            icon: 'FileText',
            component: 'LedgerTab',
        },
        {
            id: 'documents',
            labelKey: 'accounting.tabs.documents',
            icon: 'Files',
            component: 'DocumentsTab',
        },
        {
            id: 'payments',
            labelKey: 'accounting.tabs.payments',
            icon: 'CreditCard',
            component: 'PaymentsTab',
        },
        {
            id: 'analysis',
            labelKey: 'accounting.tabs.analysis',
            icon: 'BarChart3',
            component: 'AnalysisTab',
            badge: 'AI',
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
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'outline',
            shortcut: 'Ctrl+P',
        },
        {
            id: 'export',
            labelKey: 'actions.export',
            icon: 'Download',
            variant: 'outline',
        },
        {
            id: 'edit',
            labelKey: 'actions.edit',
            icon: 'Edit',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'refresh',
            labelKey: 'actions.refresh',
            icon: 'RefreshCw',
            variant: 'ghost',
        },
    ],
    stats: [
        {
            id: 'balance',
            labelKey: 'accounting.account.balance',
            valueKey: 'current_balance',
            icon: 'Wallet',
            format: 'currency',
            colorClass: 'text-erp-navy',
        },
        {
            id: 'debit',
            labelKey: 'accounting.entry.debit',
            valueKey: 'total_debit',
            icon: 'ArrowUpRight',
            format: 'currency',
            colorClass: 'text-green-600',
        },
        {
            id: 'credit',
            labelKey: 'accounting.entry.credit',
            valueKey: 'total_credit',
            icon: 'ArrowDownRight',
            format: 'currency',
            colorClass: 'text-red-600',
        },
        {
            id: 'transactions',
            labelKey: 'accounting.transactionCount',
            valueKey: 'transaction_count',
            icon: 'Hash',
            format: 'number',
        },
    ],
};

// Fund Configuration - تكوين الصناديق
export const fundConfig: DocumentConfig = {
    type: 'fund',
    titleKey: 'accounting.fund.title',
    subtitleKey: 'accounting.fund.subtitle',
    icon: 'Wallet',
    iconColor: 'bg-emerald-600',
    defaultTab: 'transactions',
    supportsModes: ['view', 'edit'],
    headerFields: ['name', 'type', 'balance', 'currency'],
    tabs: [
        {
            id: 'overview',
            labelKey: 'accounting.tabs.overview',
            icon: 'LayoutDashboard',
            component: 'FundOverviewTab',
        },
        {
            id: 'transactions',
            labelKey: 'accounting.tabs.transactions',
            icon: 'ArrowRightLeft',
            component: 'FundTransactionsTab',
        },
        {
            id: 'currencies',
            labelKey: 'accounting.tabs.currencies',
            icon: 'DollarSign',
            component: 'FundCurrenciesTab',
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
            id: 'receipt',
            labelKey: 'accounting.quickReceipt',
            icon: 'ArrowDownRight',
            variant: 'default',
        },
        {
            id: 'payment',
            labelKey: 'accounting.quickPayment',
            icon: 'ArrowUpRight',
            variant: 'outline',
        },
        {
            id: 'transfer',
            labelKey: 'accounting.transfer',
            icon: 'ArrowRightLeft',
            variant: 'outline',
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
        },
    ],
    stats: [
        {
            id: 'balance',
            labelKey: 'accounting.account.balance',
            valueKey: 'balance',
            icon: 'Wallet',
            format: 'currency',
            colorClass: 'text-erp-navy',
        },
        {
            id: 'deposits',
            labelKey: 'accounting.deposits',
            valueKey: 'totalDeposits',
            icon: 'ArrowDownRight',
            format: 'currency',
            colorClass: 'text-green-600',
        },
        {
            id: 'withdrawals',
            labelKey: 'accounting.withdrawals',
            valueKey: 'totalWithdrawals',
            icon: 'ArrowUpRight',
            format: 'currency',
            colorClass: 'text-red-600',
        },
        {
            id: 'todayChange',
            labelKey: 'accounting.todayChange',
            valueKey: 'todayChange',
            icon: 'TrendingUp',
            format: 'currency',
        },
    ],
};

// Party Configuration - تكوين الجهات (عملاء/موردين)
export const partyConfig: DocumentConfig = {
    type: 'party',
    titleKey: 'accounting.party.title',
    subtitleKey: 'accounting.party.subtitle',
    icon: 'Users',
    iconColor: 'bg-purple-600',
    defaultTab: 'overview',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['name', 'type', 'balance', 'code'],
    tabs: [
        {
            id: 'overview',
            labelKey: 'accounting.tabs.overview',
            icon: 'LayoutDashboard',
            component: 'PartyOverviewTab',
        },
        {
            id: 'ledger',
            labelKey: 'accounting.tabs.ledger',
            icon: 'FileText',
            component: 'LedgerTab',
        },
        {
            id: 'invoices',
            labelKey: 'accounting.tabs.invoices',
            icon: 'Receipt',
            component: 'InvoicesTab',
        },
        {
            id: 'payments',
            labelKey: 'accounting.tabs.payments',
            icon: 'CreditCard',
            component: 'PaymentsTab',
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
            id: 'invoice',
            labelKey: 'accounting.newInvoice',
            icon: 'FilePlus',
            variant: 'default',
            showInModes: ['view'],
        },
        {
            id: 'payment',
            labelKey: 'accounting.quickPayment',
            icon: 'CreditCard',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'edit',
            labelKey: 'actions.edit',
            icon: 'Edit',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
        },
    ],
    stats: [
        {
            id: 'balance',
            labelKey: 'accounting.account.balance',
            valueKey: 'balance',
            icon: 'Wallet',
            format: 'currency',
        },
        {
            id: 'invoices',
            labelKey: 'accounting.invoiceCount',
            valueKey: 'invoiceCount',
            icon: 'Receipt',
            format: 'number',
        },
        {
            id: 'creditLimit',
            labelKey: 'accounting.creditLimit',
            valueKey: 'creditLimit',
            icon: 'CreditCard',
            format: 'currency',
        },
    ],
};

// Journal Entry Configuration - تكوين القيود المحاسبية
export const journalConfig: DocumentConfig = {
    type: 'journal',
    titleKey: 'accounting.journalEntry.title',
    subtitleKey: 'accounting.journalEntry.subtitle',
    icon: 'BookMarked',
    iconColor: 'bg-indigo-600',
    defaultTab: 'entry',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['entry_number', 'date', 'status', 'total_debit'],
    tabs: [
        {
            id: 'entry',
            labelKey: 'accounting.tabs.entry',
            icon: 'FileEdit',
            component: 'JournalEntryTab',
        },
        {
            id: 'attachments',
            labelKey: 'accounting.tabs.attachments',
            icon: 'Paperclip',
            component: 'AttachmentsTab',
            showInModes: ['view', 'edit'],
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
            showInModes: ['view'],
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
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'post',
            labelKey: 'accounting.post',
            icon: 'CheckCircle',
            variant: 'default',
            showInModes: ['view'],
        },
        {
            id: 'unpost',
            labelKey: 'accounting.unpost',
            icon: 'XCircle',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'duplicate',
            labelKey: 'actions.duplicate',
            icon: 'Copy',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
            showInModes: ['view'],
        },
        {
            id: 'delete',
            labelKey: 'actions.delete',
            icon: 'Trash2',
            variant: 'destructive',
            requiresConfirm: true,
            confirmMessageKey: 'messages.confirmDelete',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'debit',
            labelKey: 'accounting.entry.debit',
            valueKey: 'total_debit',
            icon: 'ArrowUpRight',
            format: 'currency',
            colorClass: 'text-green-600',
        },
        {
            id: 'credit',
            labelKey: 'accounting.entry.credit',
            valueKey: 'total_credit',
            icon: 'ArrowDownRight',
            format: 'currency',
            colorClass: 'text-red-600',
        },
    ],
};

// Cash Journal Configuration - تكوين يومية الصندوق
export const cashConfig: DocumentConfig = {
    type: 'cash',
    titleKey: 'accounting.entryTypes.cash',
    subtitleKey: 'accounting.cashJournal.subtitle',
    icon: 'Wallet',
    iconColor: 'bg-purple-600',
    defaultTab: 'entry',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['entry_number', 'date', 'fund_account', 'status'],
    tabs: [
        {
            id: 'entry',
            labelKey: 'accounting.tabs.entry',
            icon: 'FileEdit',
            component: 'CashJournalEntryTab',
        },
        {
            id: 'attachments',
            labelKey: 'accounting.tabs.attachments',
            icon: 'Paperclip',
            component: 'AttachmentsTab',
            showInModes: ['view', 'edit'],
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
            showInModes: ['view'],
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
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'post',
            labelKey: 'accounting.post',
            icon: 'CheckCircle',
            variant: 'default',
            showInModes: ['view'],
        },
        {
            id: 'unpost',
            labelKey: 'accounting.unpost',
            icon: 'XCircle',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
            showInModes: ['view'],
        },
        {
            id: 'delete',
            labelKey: 'actions.delete',
            icon: 'Trash2',
            variant: 'destructive',
            requiresConfirm: true,
            confirmMessageKey: 'messages.confirmDelete',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'credit',
            labelKey: 'accounting.entryTypes.receipt',
            valueKey: 'total_credit',
            icon: 'ArrowDownRight',
            format: 'currency',
            colorClass: 'text-green-600',
        },
        {
            id: 'debit',
            labelKey: 'accounting.entryTypes.payment',
            valueKey: 'total_debit',
            icon: 'ArrowUpRight',
            format: 'currency',
            colorClass: 'text-red-600',
        },
    ],
};

// Receipt Configuration - تكوين سندات القبض
export const receiptConfig: DocumentConfig = {
    type: 'receipt',
    titleKey: 'accounting.receipt.title',
    subtitleKey: 'accounting.receipt.subtitle',
    icon: 'ArrowDownRight',
    iconColor: 'bg-green-600',
    defaultTab: 'form',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference', 'date', 'amount', 'status'],
    tabs: [
        {
            id: 'form',
            labelKey: 'accounting.tabs.form',
            icon: 'FileEdit',
            component: 'ReceiptFormTab',
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
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'post',
            labelKey: 'accounting.post',
            icon: 'CheckCircle',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
        },
    ],
    stats: [
        {
            id: 'amount',
            labelKey: 'accounting.amount',
            valueKey: 'amount',
            icon: 'DollarSign',
            format: 'currency',
            colorClass: 'text-green-600',
        },
    ],
};

// Payment Configuration - تكوين سندات الصرف
export const paymentConfig: DocumentConfig = {
    type: 'payment',
    titleKey: 'accounting.payment.title',
    subtitleKey: 'accounting.payment.subtitle',
    icon: 'ArrowUpRight',
    iconColor: 'bg-red-600',
    defaultTab: 'form',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['reference', 'date', 'amount', 'status'],
    tabs: [
        {
            id: 'form',
            labelKey: 'accounting.tabs.form',
            icon: 'FileEdit',
            component: 'PaymentFormTab',
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
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'post',
            labelKey: 'accounting.post',
            icon: 'CheckCircle',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
        },
    ],
    stats: [
        {
            id: 'amount',
            labelKey: 'accounting.amount',
            valueKey: 'amount',
            icon: 'DollarSign',
            format: 'currency',
            colorClass: 'text-red-600',
        },
    ],
};

// Transfer Configuration
export const transferConfig: DocumentConfig = {
    type: 'transfer',
    titleKey: 'accounting.transfer.title',
    subtitleKey: 'accounting.transfer.subtitle',
    icon: 'ArrowRightLeft',
    iconColor: 'bg-orange-600',
    defaultTab: 'form',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['from', 'to', 'amount'],
    tabs: [
        {
            id: 'form',
            labelKey: 'accounting.tabs.form',
            icon: 'FileEdit',
            component: 'TransferFormTab',
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
            showInModes: ['view'],
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
            showInModes: ['view'],
            requiresConfirm: true,
            confirmMessageKey: 'messages.confirmDelete',
        },
    ],
    stats: [],
};

// Exchange Configuration
export const exchangeConfig: DocumentConfig = {
    type: 'exchange',
    titleKey: 'accounting.exchange.title',
    subtitleKey: 'accounting.exchange.subtitle',
    icon: 'RefreshCw',
    iconColor: 'bg-cyan-600',
    defaultTab: 'form',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['fromCurrency', 'toCurrency', 'amount', 'rate'],
    tabs: [
        {
            id: 'form',
            labelKey: 'accounting.tabs.form',
            icon: 'FileEdit',
            component: 'ExchangeFormTab',
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
            showInModes: ['view'],
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
            showInModes: ['view'],
            requiresConfirm: true,
            confirmMessageKey: 'messages.confirmDelete',
        },
    ],
    stats: [],
};

// Transaction Configuration
export const transactionConfig: DocumentConfig = {
    type: 'transaction',
    titleKey: 'accounting.transaction.title',
    subtitleKey: 'accounting.transaction.subtitle',
    icon: 'FileText',
    iconColor: 'bg-gray-600',
    defaultTab: 'details',
    supportsModes: ['view', 'edit'],
    headerFields: ['id', 'date', 'type', 'amount', 'status'],
    tabs: [
        {
            id: 'details',
            labelKey: 'accounting.tabs.details',
            icon: 'Info',
            component: 'TransactionDetailsTab',
        },
        {
            id: 'journal',
            labelKey: 'accounting.tabs.journalLines',
            icon: 'List',
            component: 'JournalLinesTab',
        },
    ],
    actions: [
        {
            id: 'edit',
            labelKey: 'actions.edit',
            icon: 'Edit',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'ghost',
        },
    ],
    stats: [
        {
            id: 'amount',
            labelKey: 'accounting.amount',
            valueKey: 'amount',
            icon: 'DollarSign',
            format: 'currency',
        },
    ],
};

// Warehouse Configuration - تكوين المستودعات
export const warehouseConfig: DocumentConfig = {
    type: 'warehouse',
    titleKey: 'warehouse.details',
    subtitleKey: 'warehouse.manageWarehouse',
    icon: 'Warehouse', // Need to check if Warehouse icon is imported? No, it's string based logic later?
    iconColor: 'bg-orange-600',
    defaultTab: 'overview',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['code', 'name', 'warehouse_type', 'city'],
    tabs: [
        {
            id: 'overview',
            labelKey: 'common.overview',
            icon: 'LayoutDashboard',
            component: 'WarehouseOverviewTab',
        },
        {
            id: 'items',
            labelKey: 'warehouse.items',
            icon: 'Package',
            component: 'WarehouseItemsTab',
            badge: 'New',
        },
        {
            id: 'stocktakes',
            labelKey: 'warehouse.stocktakes',
            icon: 'ClipboardList',
            component: 'WarehouseStocktakesTab',
        },
        {
            id: 'activity',
            labelKey: 'common.activity',
            icon: 'Clock',
            component: 'ActivityTab',
        },
    ],
    actions: [
        {
            id: 'edit',
            labelKey: 'actions.edit',
            icon: 'Edit',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'items',
            labelKey: 'warehouse.manageItems',
            icon: 'Package',
            variant: 'secondary',
            showInModes: ['view'],
        },
        {
            id: 'save',
            labelKey: 'actions.save',
            icon: 'Save',
            variant: 'default',
            showInModes: ['edit', 'create'],
        },
    ],
    stats: [
        {
            id: 'capacity',
            labelKey: 'warehouse.capacity',
            valueKey: 'capacity',
            icon: 'Database',
            format: 'number',
        },
        {
            id: 'itemsCount',
            labelKey: 'warehouse.itemsCount',
            valueKey: 'items_count',
            icon: 'Package',
            format: 'number',
        },
    ],
};

// Material Configuration - تكوين المواد (للعرض)
export const materialConfig: DocumentConfig = {
    type: 'material',
    titleKey: 'warehouse.material.title',
    subtitleKey: 'warehouse.material.subtitle',
    icon: 'Package',
    iconColor: 'bg-teal-600',
    defaultTab: 'overview',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['code', 'name_ar', 'category', 'is_active'],
    tabs: [
        // === View Mode Tabs (7 تبويبات - الهيكل المحدث) ===
        {
            id: 'overview',
            labelKey: 'warehouse.material.tabs.overview',
            icon: 'LayoutDashboard',
            component: 'MaterialOverviewTab',
            showInModes: ['view'],
        },
        {
            id: 'inventory',
            labelKey: 'warehouse.material.tabs.inventory',
            icon: 'Package',
            component: 'MaterialInventoryTab',
            showInModes: ['view'],
        },
        {
            id: 'movements',
            labelKey: 'warehouse.material.tabs.movements',
            icon: 'TrendingUp',
            component: 'MaterialMovementsTab',
            showInModes: ['view'],
        },
        {
            id: 'pricing',
            labelKey: 'warehouse.material.tabs.pricing',
            icon: 'DollarSign',
            component: 'MaterialPricingTab',
            showInModes: ['view'],
        },
        {
            id: 'images',
            labelKey: 'warehouse.material.tabs.images',
            icon: 'Image',
            component: 'MaterialImagesTab',
            showInModes: ['view'],
        },
        {
            id: 'analytics',
            labelKey: 'warehouse.material.tabs.analytics',
            icon: 'BarChart3',
            component: 'MaterialAnalyticsTab',
            showInModes: ['view'],
        },
        {
            id: 'activity',
            labelKey: 'accounting.tabs.activity',
            icon: 'Clock',
            component: 'ActivityTab',
            showInModes: ['view'],
        },
        // === Create/Edit Mode Tabs ===
        {
            id: 'basicInfo',
            labelKey: 'warehouse.material.tabs.basicInfo',
            icon: 'FileText',
            component: 'MaterialBasicInfoTab',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'specs',
            labelKey: 'warehouse.material.tabs.specs',
            icon: 'Ruler',
            component: 'MaterialSpecsTab',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'variants',
            labelKey: 'warehouse.material.tabs.variants',
            icon: 'Layers',
            component: 'MaterialVariantsTab',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'createImages',
            labelKey: 'warehouse.material.tabs.images',
            icon: 'Image',
            component: 'MaterialImagesTab',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'createPricing',
            labelKey: 'warehouse.material.tabs.pricing',
            icon: 'DollarSign',
            component: 'MaterialPricingTab',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'additionalInfo',
            labelKey: 'warehouse.material.tabs.additionalInfo',
            icon: 'Info',
            component: 'MaterialAdditionalInfoTab',
            showInModes: ['create', 'edit'],
        },
    ],
    actions: [
        {
            id: 'edit',
            labelKey: 'actions.edit',
            icon: 'Edit',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'save',
            labelKey: 'actions.save',
            icon: 'Save',
            variant: 'default',
            showInModes: ['edit', 'create'],
        },
        {
            id: 'delete',
            labelKey: 'actions.delete',
            icon: 'Trash2',
            variant: 'destructive',
            showInModes: ['view', 'edit'],
            requiresConfirm: true,
            confirmMessageKey: 'warehouse.material.deleteConfirm',
        },
        {
            id: 'print',
            labelKey: 'actions.print',
            icon: 'Printer',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'export',
            labelKey: 'actions.export',
            icon: 'Download',
            variant: 'outline',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'totalStock',
            labelKey: 'warehouse.material.stats.totalStock',
            valueKey: 'total_stock',
            icon: 'Database',
            format: 'number',
            colorClass: 'text-blue-600',
        },
        {
            id: 'rollsCount',
            labelKey: 'warehouse.material.stats.rollsCount',
            valueKey: 'rolls_count',
            icon: 'Cylinder',
            format: 'number',
            colorClass: 'text-purple-600',
        },
        {
            id: 'availableStock',
            labelKey: 'warehouse.material.stats.availableStock',
            valueKey: 'available_stock',
            icon: 'CheckCircle2',
            format: 'number',
            colorClass: 'text-green-600',
        },
        {
            id: 'reservedStock',
            labelKey: 'warehouse.material.stats.reservedStock',
            valueKey: 'reserved_stock',
            icon: 'Lock',
            format: 'number',
            colorClass: 'text-orange-600',
        },
        {
            id: 'avgPrice',
            labelKey: 'warehouse.material.stats.avgPrice',
            valueKey: 'average_price',
            icon: 'DollarSign',
            format: 'currency',
            colorClass: 'text-erp-navy',
        },
    ],
};

// Material Group Configuration - تكوين مجموعات المواد
export const materialGroupConfig: DocumentConfig = {
    type: 'materialGroup',
    titleKey: 'warehouse.group.title',
    subtitleKey: 'warehouse.group.subtitle',
    icon: 'FolderPlus',
    iconColor: 'bg-indigo-600',
    defaultTab: 'groupInfo',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['code', 'name_ar', 'category'],
    tabs: [
        {
            id: 'groupInfo',
            labelKey: 'warehouse.group.tabs.info',
            icon: 'FolderTree',
            component: 'MaterialGroupInfoTab',
        },
    ],
    actions: [
        {
            id: 'save',
            labelKey: 'actions.save',
            icon: 'Save',
            variant: 'default',
            showInModes: ['edit', 'create'],
        },
        {
            id: 'delete',
            labelKey: 'actions.delete',
            icon: 'Trash2',
            variant: 'destructive',
            showInModes: ['view', 'edit'],
            requiresConfirm: true,
            confirmMessageKey: 'warehouse.group.deleteConfirm',
        },
    ],
    stats: [],
};

// Debit Note Configuration
export const debitNoteConfig: DocumentConfig = {
    type: 'debit_note',
    titleKey: 'accounting.debitNote.title',
    subtitleKey: 'accounting.debitNote.subtitle',
    icon: 'FileText',
    iconColor: 'bg-blue-600',
    defaultTab: 'form',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['entry_number', 'date', 'amount'],
    tabs: [
        {
            id: 'form',
            labelKey: 'accounting.tabs.form',
            icon: 'FileEdit',
            component: 'JournalVoucherTab',
        },
    ],
    actions: journalConfig.actions,
    stats: [],
};

// Credit Note Configuration
export const creditNoteConfig: DocumentConfig = {
    type: 'credit_note',
    titleKey: 'accounting.creditNote.title',
    subtitleKey: 'accounting.creditNote.subtitle',
    icon: 'FileText',
    iconColor: 'bg-red-600',
    defaultTab: 'form',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['entry_number', 'date', 'amount'],
    tabs: [
        {
            id: 'form',
            labelKey: 'accounting.tabs.form',
            icon: 'FileEdit',
            component: 'JournalVoucherTab',
        },
    ],
    actions: journalConfig.actions,
    stats: [],
};

// ═══════════════════════════════════════════════════════════════
// CRM Contact Configuration - تكوين جهات الاتصال
// ═══════════════════════════════════════════════════════════════
export const contactConfig: DocumentConfig = {
    type: 'contact',
    titleKey: 'crm.contacts',
    subtitleKey: 'crm.contactsSubtitle',
    icon: 'Users',
    iconColor: 'bg-indigo-600',
    defaultTab: 'contactOverview',
    supportsModes: ['view', 'edit', 'create'],
    headerFields: ['display_name', 'organization', 'lifecycle_stage', 'source'],
    tabs: [
        {
            id: 'contactOverview',
            labelKey: 'crm.overview',
            icon: 'LayoutDashboard',
            component: 'ContactOverviewTab',
        },
        {
            id: 'contactInteractions',
            labelKey: 'crm.interactions',
            icon: 'MessageSquare',
            component: 'ContactInteractionsTab',
            showInModes: ['view', 'edit'],
        },
        {
            id: 'contactCalls',
            labelKey: 'crm.calls',
            icon: 'Phone',
            component: 'ContactCallsTab',
            showInModes: ['view', 'edit'],
        },
        {
            id: 'contactNotes',
            labelKey: 'crm.notes',
            icon: 'StickyNote',
            component: 'ContactNotesTab',
        },
        {
            id: 'activity',
            labelKey: 'crm.activity',
            icon: 'Clock',
            component: 'ActivityTab',
            showInModes: ['view'],
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
            id: 'cancel',
            labelKey: 'actions.cancel',
            icon: 'X',
            variant: 'outline',
            showInModes: ['create', 'edit'],
        },
        {
            id: 'edit',
            labelKey: 'actions.edit',
            icon: 'Edit',
            variant: 'outline',
            showInModes: ['view'],
        },
        {
            id: 'convertToCustomer',
            labelKey: 'crm.convertToCustomer',
            icon: 'UserCheck',
            variant: 'default',
            showInModes: ['view'],
        },
        {
            id: 'delete',
            labelKey: 'actions.delete',
            icon: 'Trash2',
            variant: 'destructive',
            requiresConfirm: true,
            confirmMessageKey: 'messages.confirmDelete',
            showInModes: ['view'],
        },
    ],
    stats: [
        {
            id: 'interactions',
            labelKey: 'crm.interactions',
            valueKey: 'interaction_count',
            icon: 'MessageSquare',
            format: 'number',
        },
        {
            id: 'calls',
            labelKey: 'crm.calls',
            valueKey: 'total_calls',
            icon: 'Phone',
            format: 'number',
        },
        {
            id: 'score',
            labelKey: 'crm.leadScore',
            valueKey: 'lead_score',
            icon: 'Star',
            format: 'number',
            colorClass: 'text-amber-600',
        },
    ],
};

import {
    tradeOrderConfig,
    tradeInvoiceConfig,
    tradeQuotationConfig,
    tradeReceiptConfig,
    tradeReturnConfig,
    tradeDeliveryConfig,
    tradeReservationConfig,
    tradeRequestConfig,
    tradeContainerConfig,
    goodsReceiptConfig,
    getTradeDocConfig,
} from './tradeConfigs';

// Export all configs in a map (sales/default)
export const documentConfigs: Record<string, DocumentConfig> = {
    account: accountConfig,
    fund: fundConfig,
    party: partyConfig,
    journal: journalConfig,
    cash: cashConfig,
    receipt: receiptConfig,
    payment: paymentConfig,
    transfer: transferConfig,
    exchange: exchangeConfig,
    transaction: transactionConfig,
    warehouse: warehouseConfig,
    material: materialConfig,
    materialGroup: materialGroupConfig,
    contact: contactConfig,
    debit_note: debitNoteConfig,
    credit_note: creditNoteConfig,
    trade_order: tradeOrderConfig,
    trade_request: tradeRequestConfig,
    trade_invoice: tradeInvoiceConfig,
    trade_quotation: tradeQuotationConfig,
    trade_receipt: tradeReceiptConfig,
    trade_return: tradeReturnConfig,
    trade_delivery: tradeDeliveryConfig,
    trade_reservation: tradeReservationConfig,
    trade_container: tradeContainerConfig,
    goods_receipt: goodsReceiptConfig,
};

// Get config by type — with optional tradeMode for smart tab selection
export function getDocumentConfig(type: string, tradeMode?: 'sales' | 'purchase'): DocumentConfig {
    // For trade documents, use mode-aware config
    if (type.startsWith('trade_') && tradeMode) {
        const tradeConfig = getTradeDocConfig(type, tradeMode);
        if (tradeConfig) return tradeConfig;
    }
    return documentConfigs[type] || accountConfig;
}

