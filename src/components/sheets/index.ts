/**
 * Universal Detail Sheet System - Main Export Index
 * نظام الشيتات الموحد - الملف الرئيسي للتصدير
 * 
 * Usage:
 * ```tsx
 * import { UniversalDetailSheet, getSheetConfig } from '@/components/sheets';
 * 
 * <UniversalDetailSheet
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   docType="tenant"
 *   data={selectedTenant}
 * />
 * ```
 */

// ===== Core Components =====
export {
  UniversalDetailSheet,
  UniversalDetailSheetWithUnderlineTabs,
  UniversalDetailSheetPreview,
  UniversalDetailHeader,
  UniversalDetailTabs,
  UniversalDetailContent,
  NestedSheetManager,
} from './universal';

// ===== Configuration =====
export {
  getSheetConfig,
  registerSheetConfig,
  hasSheetConfig,
  getRegisteredDocTypes,
  tenantConfig,
  agentConfig,
  invoiceConfig,
} from './configs';

// ===== Types =====
export type {
  DocType,
  SheetSize,
  SheetConfig,
  SheetTab,
  SheetAction,
  InfoField,
  BadgeConfig,
  BadgeVariant,
  StatCardConfig,
  NestedSheetConfig,
  NestedSheetState,
  TabComponentProps,
  UseUniversalSheetReturn,
  UseNestedSheetsReturn,
  StatusConfig,
  StatusMap,
  TranslationFn,
  SheetContext,
} from './configs/sheet.types';

export {
  SHEET_SIZE_CLASSES,
  BADGE_VARIANT_CLASSES,
  DEFAULT_STATUS_MAP,
} from './configs/sheet.types';

// ===== Hooks =====
export { useNestedSheets } from './hooks';

// ===== Shared Tabs =====
export {
  OverviewTab,
  ActivityTab,
  LedgerTab,
  PaymentsTab,
  ReservationsTab,
  AIAnalysisTab,
  DocumentsTab,
  NotesTab,
} from './tabs/shared';

// ===== Tenant Tabs =====
export {
  TenantSubscriptionsTab,
  TenantUsageTab,
  TenantModulesTab,
} from './tabs/tenant';

// ===== Agent Tabs =====
export {
  AgentCommissionsTab,
  AgentTenantsTab,
  AgentWithdrawalsTab,
} from './tabs/agent';
