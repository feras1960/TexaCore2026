/**
 * Config Registry - سجل الإعدادات
 * يجمع جميع إعدادات الشيتات ويوفر دالة للحصول على الإعدادات حسب النوع
 */

import { type SheetConfig, type DocType } from './sheet.types';
import { tenantConfig } from './tenant.config';
import { agentConfig } from './agent.config';
import { invoiceConfig } from './invoice.config';
import { accountConfig } from './account.config';
import { customerConfig } from './customer.config';
import { supplierConfig } from './supplier.config';
import { journalEntryConfig } from './journal_entry.config';
import { fundConfig } from './fund.config';
// SaaS Sheet Configs
import { planConfig } from './plan.config';
import { subscriptionConfig } from './subscription.config';
import { couponConfig } from './coupon.config';
import { moduleConfig } from './module.config';

// ===== Config Registry =====
const configRegistry: Partial<Record<DocType, SheetConfig>> = {
  // SaaS Sheets
  tenant: tenantConfig,
  agent: agentConfig,
  plan: planConfig,
  subscription: subscriptionConfig,
  coupon: couponConfig,
  module: moduleConfig,
  // Accounting Sheets
  invoice: invoiceConfig,
  account: accountConfig,
  customer: customerConfig,
  supplier: supplierConfig,
  journal_entry: journalEntryConfig,
  fund: fundConfig,
};

/**
 * Get sheet configuration for a document type
 * @param docType - The document type
 * @returns SheetConfig or null if not found
 */
export function getSheetConfig(docType: DocType): SheetConfig | null {
  return configRegistry[docType] || null;
}

/**
 * Register a new sheet configuration
 * @param docType - The document type
 * @param config - The sheet configuration
 */
export function registerSheetConfig(docType: DocType, config: SheetConfig): void {
  configRegistry[docType] = config;
}

/**
 * Check if a configuration exists for a document type
 * @param docType - The document type
 * @returns boolean
 */
export function hasSheetConfig(docType: DocType): boolean {
  return docType in configRegistry;
}

/**
 * Get all registered document types
 * @returns Array of DocType
 */
export function getRegisteredDocTypes(): DocType[] {
  return Object.keys(configRegistry) as DocType[];
}

// ===== Exports =====
export * from './sheet.types';
// SaaS Sheets
export { tenantConfig } from './tenant.config';
export { agentConfig } from './agent.config';
export { planConfig } from './plan.config';
export { subscriptionConfig } from './subscription.config';
export { couponConfig } from './coupon.config';
export { moduleConfig } from './module.config';
// Accounting Sheets
export { invoiceConfig } from './invoice.config';
export { accountConfig } from './account.config';
export { customerConfig } from './customer.config';
export { supplierConfig } from './supplier.config';
export { journalEntryConfig } from './journal_entry.config';
export { fundConfig } from './fund.config';
