/**
 * Config Registry - سجل الإعدادات
 * يجمع جميع إعدادات الشيتات ويوفر دالة للحصول على الإعدادات حسب النوع
 */

import { type SheetConfig, type DocType } from './sheet.types';
import { tenantConfig } from './tenant.config';
import { agentConfig } from './agent.config';
import { invoiceConfig } from './invoice.config';
import { paymentConfig } from './payment.config';
import { accountConfig } from './account.config';
import { customerConfig } from './customer.config';
import { supplierConfig } from './supplier.config';
import { journalEntryConfig } from './journal_entry.config';
import { fundConfig } from './fund.config';
// Voucher Configs
import { receiptConfig } from './receipt.config';
import { transferConfig } from './transfer.config';
import { cashJournalConfig } from './cash_journal.config';
import { exchangeConfig } from './exchange.config';
// SaaS Sheet Configs
import { planConfig } from './plan.config';
import { subscriptionConfig } from './subscription.config';
import { couponConfig } from './coupon.config';
import { moduleConfig } from './module.config';
import { companyConfig } from './company.config';
// Exchange Module Configs
import { exchangeCustomerConfig } from './exchange_customer.config';
import { exchangeAgentConfig } from './exchange_agent.config';
import { exchangePartnerConfig } from './exchange_partner.config';

// ===== Config Registry =====
const configRegistry: Partial<Record<DocType, SheetConfig>> = {
  // SaaS Sheets
  tenant: tenantConfig,
  company: companyConfig,
  agent: agentConfig,
  payment: paymentConfig,
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
  // Voucher Sheets
  receipt: receiptConfig,
  transfer: transferConfig,
  cash_journal: cashJournalConfig,
  exchange: exchangeConfig,
  // Exchange Module Sheets
  exchange_customer: exchangeCustomerConfig,
  exchange_agent: exchangeAgentConfig,
  exchange_partner: exchangePartnerConfig,
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
export { paymentConfig } from './payment.config';
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
// Voucher Sheets
export { receiptConfig } from './receipt.config';
export { transferConfig } from './transfer.config';
export { cashJournalConfig } from './cash_journal.config';
export { exchangeConfig } from './exchange.config';
// Exchange Module
export { exchangeCustomerConfig } from './exchange_customer.config';
export { exchangeAgentConfig } from './exchange_agent.config';
export { exchangePartnerConfig } from './exchange_partner.config';
