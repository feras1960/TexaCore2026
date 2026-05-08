/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 Unified Data Model — نموذج البيانات الموحد للاستيراد
 * ════════════════════════════════════════════════════════════════
 * 
 * كل مصادر الاستيراد (RSF, TCDB, Excel, Odoo, ERPNext...) تتحول
 * إلى هذا النموذج الموحد قبل الإدخال في قاعدة البيانات.
 * 
 * Architecture:
 *   [RSF File]   → rsf-to-unified.ts   ─┐
 *   [TCDB File]  → tcdb-to-unified.ts  ─┤
 *   [Excel File] → excel-to-unified.ts ─┤→ UnifiedImportData → cloud-importer.ts → Supabase
 *   [Odoo CSV]   → odoo-to-unified.ts  ─┤                   → pg-importer.ts   → PostgreSQL (local)
 *   [Any Source]  → xxx-to-unified.ts   ─┘
 * 
 * @module features/import/core
 */

// ═══════════════════════════════════════════════════════════════
// 📦 Main Container — حاوية البيانات الرئيسية
// ═══════════════════════════════════════════════════════════════

export interface UnifiedImportData {
  /** Source identifier */
  source: ImportSource;
  
  /** File metadata */
  metadata: ImportMetadata;
  
  /** Record counts — for preview step */
  counts: ImportCounts;

  // ─── Structure (حساب فارغ فقط) ──────────────────────────────
  chartOfAccounts: UnifiedAccount[];
  accountTypes: UnifiedAccountType[];
  costCenters: UnifiedCostCenter[];
  currencies: UnifiedCurrency[];
  companySettings: UnifiedCompanySettings | null;
  fiscalYear: UnifiedFiscalYear | null;
  warehouses: UnifiedWarehouse[];

  // ─── Master Data (آمن للاستيراد دائماً — إضافي) ─────────────
  customers: UnifiedCustomer[];
  suppliers: UnifiedSupplier[];
  materials: UnifiedMaterial[];
  priceLists: UnifiedPriceList[];
  
  // ─── Transactions (يحتاج مطابقة حسابات) ─────────────────────
  journalEntries: UnifiedJournalEntry[];
  purchaseInvoices: UnifiedPurchaseInvoice[];
  salesInvoices: UnifiedSalesInvoice[];
  vouchers: UnifiedVoucher[];
  inventoryMovements: UnifiedInventoryMovement[];
}

export type ImportSource = 'rsf' | 'tcdb' | 'excel' | 'odoo' | 'erpnext' | 'other';

export interface ImportMetadata {
  /** Original file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Source software version */
  sourceVersion?: string;
  /** Company name from source */
  companyName: string;
  companyNameAr?: string;
  /** Timestamp of the source data */
  dataTimestamp?: string;
  /** Extra source-specific info */
  extra?: Record<string, any>;
}

export interface ImportCounts {
  accounts: number;
  customers: number;
  suppliers: number;
  materials: number;
  journalEntries: number;
  purchaseInvoices: number;
  salesInvoices: number;
  vouchers: number;
  inventoryMovements: number;
  costCenters: number;
  currencies: number;
  warehouses: number;
}

// ═══════════════════════════════════════════════════════════════
// 🌳 Chart of Accounts — شجرة الحسابات
// ═══════════════════════════════════════════════════════════════

export interface UnifiedAccount {
  /** Account code (primary key for matching) */
  code: string;
  /** Parent account code (for tree structure) */
  parentCode: string;
  /** Account name (primary language) */
  name: string;
  /** Arabic name */
  nameAr: string;
  /** English name (if available) */
  nameEn?: string;
  /** Is this a group/parent account? */
  isGroup: boolean;
  /** Account classification */
  classification: AccountClassification;
  /** Account type code */
  accountType: string;
  /** Normal balance side */
  normalBalance: 'debit' | 'credit';
  /** Opening debit balance */
  openingDebit: number;
  /** Opening credit balance */
  openingCredit: number;
  /** Currency code (if foreign currency account) */
  currencyCode?: string;
  /** Special flags */
  flags: AccountFlags;
}

export type AccountClassification = 
  | 'assets' 
  | 'liabilities' 
  | 'equity' 
  | 'income' 
  | 'expenses';

export interface AccountFlags {
  isCashAccount: boolean;
  isBankAccount: boolean;
  isReceivable: boolean;
  isPayable: boolean;
}

export interface UnifiedAccountType {
  code: string;
  name: string;
  nameAr: string;
  classification: AccountClassification;
  normalBalance: 'debit' | 'credit';
}

// ═══════════════════════════════════════════════════════════════
// 👥 Customers & Suppliers — العملاء والموردين
// ═══════════════════════════════════════════════════════════════

export interface UnifiedCustomer {
  /** Customer code from source (for dedup) */
  code: string;
  /** Customer name */
  name: string;
  nameAr: string;
  nameEn?: string;
  nameTr?: string;
  nameRu?: string;
  nameUk?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  /** Linked accounting code (e.g., 161001) */
  accountCode?: string;
  creditLimit: number;
  openingBalance: number;
  notes?: string;
}

export interface UnifiedSupplier {
  code: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  nameTr?: string;
  nameRu?: string;
  nameUk?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  accountCode?: string;
  openingBalance: number;
  paymentTermsDays?: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// 📦 Materials & Products — المواد والمنتجات
// ═══════════════════════════════════════════════════════════════

export interface UnifiedMaterial {
  code: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  /** Unit of measure (piece, meter, kg...) */
  unit: string;
  /** Is this a group/category? */
  isGroup: boolean;
  /** Parent group code */
  parentCode?: string;
  /** Purchase price */
  buyPrice: number;
  /** Sale price (retail) */
  sellPrice: number;
  /** Wholesale price */
  wholesalePrice?: number;
  /** Half wholesale price */
  halfWholesalePrice?: number;
  /** Special/VIP price */
  specialPrice?: number;
  /** Minimum sale price */
  minPrice?: number;
  /** Opening balance (total quantity) */
  openingBalance: number;
  /** Opening balance per warehouse: { warehouseNum: qty } */
  warehouseBalances: Record<number, number>;
  barcode?: string;
  notes?: string;
}

export interface UnifiedPriceList {
  code: string;
  name: string;
  nameAr: string;
  type: 'retail' | 'wholesale' | 'half_wholesale' | 'special' | 'custom';
  /** Items: materialCode → price */
  prices: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// 📋 Journal Entries — القيود المحاسبية
// ═══════════════════════════════════════════════════════════════

export interface UnifiedJournalEntry {
  /** Entry number from source */
  sourceNumber: number | string;
  date: string; // ISO date string
  description: string;
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
  /** Entry type: 0=عادي، 1=سند قبض، 2=سند دفع، etc. */
  type: number;
  /** Source user ID */
  sourceUserId?: number;
  lines: UnifiedJournalLine[];
}

export interface UnifiedJournalLine {
  lineNumber: number;
  /** Account code from source — needs matching */
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
  /** Cost center code (optional) */
  costCenterCode?: string;
  /** Currency number from source */
  currencyCode?: string;
  /** Amount in local currency */
  localAmount?: number;
  /** Amount in foreign currency */
  foreignAmount?: number;
}

// ═══════════════════════════════════════════════════════════════
// 🧾 Invoices — الفواتير
// ═══════════════════════════════════════════════════════════════

export interface UnifiedPurchaseInvoice {
  sourceNumber: number | string;
  date: string;
  /** Supplier code from source */
  supplierCode: string;
  supplierName?: string;
  warehouseNum?: number;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  notes?: string;
  supplierInvoiceNumber?: string;
  isPosted: boolean;
  items: UnifiedInvoiceItem[];
}

export interface UnifiedSalesInvoice {
  sourceNumber: number | string;
  date: string;
  customerCode: string;
  customerName?: string;
  warehouseNum?: number;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  isPosted: boolean;
  items: UnifiedInvoiceItem[];
}

export interface UnifiedInvoiceItem {
  lineNumber: number;
  /** Material code from source */
  materialCode: string;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unit?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// 💰 Vouchers — سندات القبض والدفع
// ═══════════════════════════════════════════════════════════════

export interface UnifiedVoucher {
  sourceNumber: number | string;
  date: string;
  /** 'receipt' = سند قبض, 'payment' = سند دفع */
  type: 'receipt' | 'payment';
  amount: number;
  /** Account code (cash/bank) */
  cashAccountCode: string;
  /** Counterparty account code (customer/supplier) */
  partyAccountCode: string;
  partyName?: string;
  description: string;
  currency?: string;
  exchangeRate?: number;
}

// ═══════════════════════════════════════════════════════════════
// 📊 Other — مراكز التكلفة، العملات، المستودعات
// ═══════════════════════════════════════════════════════════════

export interface UnifiedCostCenter {
  code: string;
  name: string;
  nameAr: string;
  parentCode?: string;
  isGroup: boolean;
}

export interface UnifiedCurrency {
  /** Source currency number (1, 2, 3...) */
  sourceNum: number;
  /** ISO code (USD, EUR, UAH...) */
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  rate: number;
  isBaseCurrency: boolean;
}

export interface UnifiedWarehouse {
  /** Source warehouse number (1-based) */
  sourceNum: number;
  name: string;
  nameAr: string;
  isDefault: boolean;
}

export interface UnifiedFiscalYear {
  startDate: string;
  endDate: string;
  name: string;
  isCurrent: boolean;
}

export interface UnifiedCompanySettings {
  vatEnabled: boolean;
  vatRate: number;
  baseCurrencyCode: string;
  foreignCurrencyCode?: string;
  /** Account levels for chart hierarchy (from Rashid: AccLvl_0, AccLvl_1, AccLvl_2) */
  accountLevels?: number[];
}

// ═══════════════════════════════════════════════════════════════
// 📊 Inventory Movements — حركات المخزون
// ═══════════════════════════════════════════════════════════════

export interface UnifiedInventoryMovement {
  sourceNumber: number | string;
  date: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  materialCode: string;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  warehouseNum: number;
  /** For transfers: destination warehouse */
  toWarehouseNum?: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 Import Selection — اختيارات المستخدم
// ═══════════════════════════════════════════════════════════════

export type ImportMode = 'full' | 'partial';

export interface ImportSelections {
  mode: ImportMode;
  
  /** Which data types to import (for partial mode) */
  include: {
    chartOfAccounts: boolean;  // 🔒 only in full mode
    costCenters: boolean;      // 🔒 only in full mode
    currencies: boolean;       // 🔒 only in full mode
    warehouses: boolean;       // 🔒 only in full mode
    companySettings: boolean;  // 🔒 only in full mode
    customers: boolean;        // ✅ always available
    suppliers: boolean;        // ✅ always available
    materials: boolean;        // ✅ always available
    journalEntries: boolean;   // ⚠️ needs account matching
    purchaseInvoices: boolean; // ⚠️ needs account matching
    salesInvoices: boolean;    // ⚠️ needs account matching
    vouchers: boolean;         // ⚠️ needs account matching
    inventoryMovements: boolean; // ⚠️ needs warehouse + material matching
  };
  
  /** Account mapping (sourceCode → targetId) — for partial import */
  accountMapping?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// 📊 Import Progress & Results — التقدم والنتائج
// ═══════════════════════════════════════════════════════════════

export interface ImportProgress {
  /** Current phase */
  phase: ImportPhase;
  /** Phase label (Arabic) */
  label: string;
  /** Current item number */
  current: number;
  /** Total items in this phase */
  total: number;
  /** Overall percentage (0-100) */
  overallPercent: number;
}

export type ImportPhase = 
  | 'reading'        // قراءة الملف
  | 'parsing'        // تحليل البيانات
  | 'validating'     // فحص الصحة
  | 'matching'       // مطابقة الحسابات
  | 'clearing'       // حذف البيانات الافتراضية (full mode)
  | 'accounts'       // استيراد شجرة الحسابات
  | 'currencies'     // استيراد العملات
  | 'costcenters'    // استيراد مراكز التكلفة
  | 'warehouses'     // استيراد المستودعات
  | 'customers'      // استيراد العملاء
  | 'suppliers'      // استيراد الموردين
  | 'materials'      // استيراد المواد
  | 'journals'       // استيراد القيود
  | 'purchases'      // استيراد فواتير المشتريات
  | 'sales'          // استيراد فواتير المبيعات
  | 'invoices'       // استيراد الفواتير (عام)
  | 'vouchers'       // استيراد السندات
  | 'inventory'      // استيراد حركات المخزون
  | 'balances'       // تحديث الأرصدة
  | 'settings'       // تعيين الإعدادات
  | 'done'           // انتهى
  | 'error';         // خطأ

export interface ImportResult {
  success: boolean;
  /** Records imported per type */
  counts: Partial<ImportCounts>;
  /** Warnings (non-fatal issues) */
  warnings: ImportWarning[];
  /** Errors (failed records) */
  errors: ImportError[];
  /** Duration in milliseconds */
  durationMs: number;
  /** Timestamp */
  completedAt: string;
}

export interface ImportWarning {
  type: string;
  message: string;
  /** Affected record codes */
  records?: string[];
}

export interface ImportError {
  phase: ImportPhase;
  message: string;
  /** Source record that failed */
  record?: any;
}

// ═══════════════════════════════════════════════════════════════
// 🔗 Account Matching — مطابقة الحسابات
// ═══════════════════════════════════════════════════════════════

export interface AccountMatch {
  /** Source account code */
  sourceCode: string;
  /** Source account name */
  sourceName: string;
  /** Matched target account ID (null if unmatched) */
  targetId: string | null;
  /** Matched target account code */
  targetCode: string | null;
  /** Matched target account name */
  targetName: string | null;
  /** Match quality */
  matchType: 'exact' | 'fuzzy' | 'manual' | 'unmatched';
  /** Match confidence (0-100) */
  confidence: number;
}

export interface AccountMatchResult {
  /** All matches */
  matches: AccountMatch[];
  /** Stats */
  stats: {
    total: number;
    exactMatch: number;
    fuzzyMatch: number;
    manualMatch: number;
    unmatched: number;
    matchRate: number; // percentage
  };
}

// ═══════════════════════════════════════════════════════════════
// 🏗️ Account Readiness Check — فحص جاهزية الحساب
// ═══════════════════════════════════════════════════════════════

export interface AccountReadiness {
  /** Is the account empty (ready for full import)? */
  isEmpty: boolean;
  /** Details per entity */
  details: {
    hasCustomAccounts: boolean;
    accountsCount: number;
    customersCount: number;
    suppliersCount: number;
    journalEntriesCount: number;
    transactionsCount: number;
    materialsCount: number;
  };
  /** Human-readable reason if not empty */
  reason?: string;
  reasonAr?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔌 Converter Interface — واجهة المحوّلات
// ═══════════════════════════════════════════════════════════════

/**
 * Interface that all source converters must implement.
 * To add a new import source:
 * 1. Create a new file: `src/features/import/converters/xxx-to-unified.ts`
 * 2. Implement this interface
 * 3. Register in the source selector UI
 */
export interface ImportConverter {
  /** Source identifier */
  source: ImportSource;
  
  /** Supported file extensions */
  fileExtensions: string[];
  
  /** Validate file before parsing */
  validateFile(buffer: ArrayBuffer): Promise<{ valid: boolean; error?: string }>;
  
  /** Parse file and return unified data */
  parse(
    buffer: ArrayBuffer, 
    options?: Record<string, any>,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<UnifiedImportData>;
}
