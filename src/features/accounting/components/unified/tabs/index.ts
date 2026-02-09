/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Unified Accounting Sheet Tabs - Index
 * تصدير جميع تبويبات الشيت الموحد
 * ════════════════════════════════════════════════════════════════
 */

// Trade Tabs
export * from './TradeMainTab';
export * from './TradeShippingTab';

// Common Tabs
export * from './OverviewTab';
export * from './LedgerTab';
export * from './ActivityTab';

// Warehouse Tabs
export { WarehouseOverviewTab } from './WarehouseOverviewTab';
export { WarehouseItemsTab } from './WarehouseItemsTab';
export { WarehouseStocktakesTab } from './WarehouseStocktakesTab';

// Material Tabs - View Mode
export { MaterialOverviewTab } from './MaterialOverviewTab';
export { MaterialVariantsTab } from './MaterialVariantsTab';
export { MaterialInventoryTab } from './MaterialInventoryTab';
export { MaterialMovementsTab } from './MaterialMovementsTab';
export { MaterialRollsTab } from './MaterialRollsTab';
export {
    MaterialPricingTab,
    MaterialSalesTab,
    MaterialPurchasesTab,
    MaterialAnalyticsTab,
} from './MaterialPricingTab';

// Material Tabs - Create/Edit Mode
export { MaterialBasicInfoTab } from './MaterialBasicInfoTab';
export { MaterialSpecsTab } from './MaterialSpecsTab';
export { MaterialImagesTab } from './MaterialImagesTab';
export { MaterialAdditionalInfoTab } from './MaterialAdditionalInfoTab';

// Material Group Tabs
export { MaterialGroupInfoTab } from './MaterialGroupInfoTab';

// ═══ Accounting Entry Tabs (Phase 2 - Specialized) ═══
export { AccountingEntryTab } from './AccountingEntryTab';
export { JournalVoucherTab } from './JournalVoucherTab';
export { CashJournalTab } from './CashJournalTab';
export { ReceiptVoucherTab } from './ReceiptVoucherTab';
export { PaymentVoucherTab } from './PaymentVoucherTab';
export { FundTransferTab } from './FundTransferTab';
export { CurrencyExchangeTab } from './CurrencyExchangeTab';
