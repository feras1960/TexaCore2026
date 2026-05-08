/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 RSF → Unified Converter
 * ════════════════════════════════════════════════════════════════
 * Converts RSF raw data to UnifiedImportData format.
 * Implements the ImportConverter interface.
 * @module features/import/core
 */

import { RsfBrowserReader } from './rsf-reader.browser';
import type {
  ImportConverter, ImportSource, UnifiedImportData, ImportProgress,
  UnifiedAccount, UnifiedCustomer, UnifiedSupplier, UnifiedMaterial,
  UnifiedJournalEntry, UnifiedJournalLine, UnifiedPurchaseInvoice,
  UnifiedSalesInvoice, UnifiedInvoiceItem, UnifiedVoucher,
  UnifiedCostCenter, UnifiedCurrency, UnifiedWarehouse,
  UnifiedCompanySettings, UnifiedFiscalYear, AccountClassification, AccountFlags,
} from './unified-data-model';

// ═══════════════════════════════════════════════════════════════
// Account classification helper (from rsf-reader.js)
// ═══════════════════════════════════════════════════════════════

function classifyAccount(code: string): { type: string; classification: AccountClassification; normalBalance: 'debit' | 'credit' } | null {
  if (!code || code.length < 2) return null;
  const prefix = parseInt(code.substring(0, 2));
  if (prefix >= 11 && prefix <= 19) return { type: 'CURRENT_ASSET', classification: 'assets', normalBalance: 'debit' };
  if (prefix >= 21 && prefix <= 22) return { type: 'EQUITY', classification: 'equity', normalBalance: 'credit' };
  if (prefix === 23) return { type: 'FIXED_ASSET', classification: 'assets', normalBalance: 'credit' };
  if (prefix >= 25 && prefix <= 29) return { type: 'CURRENT_LIABILITY', classification: 'liabilities', normalBalance: 'credit' };
  if (prefix >= 31 && prefix <= 39) return { type: 'EXPENSE', classification: 'expenses', normalBalance: 'debit' };
  if (prefix >= 41 && prefix <= 49) return { type: 'REVENUE', classification: 'income', normalBalance: 'credit' };
  return null;
}

function getAccountFlags(code: string): AccountFlags {
  const c = String(code);
  return {
    isCashAccount: c === '181' || c.startsWith('181'),
    isBankAccount: c === '182' || c.startsWith('182'),
    isReceivable: c === '161' || c.startsWith('161'),
    isPayable: c === '261' || c.startsWith('261'),
  };
}

function formatDate(d: any): string {
  if (!d) return new Date().toISOString().split('T')[0];
  if (d instanceof Date) return d.toISOString().split('T')[0];
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  try { return new Date(s).toISOString().split('T')[0]; } catch { return new Date().toISOString().split('T')[0]; }
}

// ═══════════════════════════════════════════════════════════════
// Converter
// ═══════════════════════════════════════════════════════════════

export const rsfConverter: ImportConverter = {
  source: 'rsf' as ImportSource,
  fileExtensions: ['.rsf', '.mdb'],

  async validateFile(buffer: ArrayBuffer) {
    return RsfBrowserReader.validate(buffer);
  },

  async parse(buffer: ArrayBuffer, options?: Record<string, any>, onProgress?: (p: ImportProgress) => void): Promise<UnifiedImportData> {
    const fileName = options?.fileName || 'rashid.rsf';
    const emit = (label: string, current: number, total: number, phase: any = 'parsing') => {
      onProgress?.({ phase, label, current, total, overallPercent: Math.round((current / Math.max(total, 1)) * 100) });
    };

    emit('فتح الملف...', 0, 10);
    const reader = new RsfBrowserReader(buffer, fileName);
    await reader.openAsync();

    emit('قراءة البيانات...', 1, 10);
    const raw = reader.readAll();

    emit('تحويل شجرة الحسابات...', 2, 10);
    const chartOfAccounts = convertAccounts(raw.accounts);

    emit('تحويل العملاء...', 3, 10);
    const customers = convertCustomers(raw.customers, chartOfAccounts);

    emit('تحويل الموردين...', 4, 10);
    const suppliers = convertSuppliers(raw.suppliers, chartOfAccounts);

    emit('تحويل المواد...', 5, 10);
    const materials = convertMaterials(raw.materials);

    emit('تحويل القيود...', 6, 10);
    const journalEntries = convertJournalEntries(raw.journalHeaders, raw.journalLines);

    emit('تحويل فواتير المشتريات...', 7, 10);
    const purchaseInvoices = convertPurchaseInvoices(raw.purchaseInvoices, raw.materials);

    emit('تحويل فواتير المبيعات...', 8, 10);
    const salesInvoices = convertSalesInvoices(raw.salesInvoices, raw.materials);

    emit('تحويل السندات...', 9, 10);
    const vouchers = convertVouchers(raw.receipts);

    emit('اكتمل التحويل', 10, 10, 'done');

    const currencies = convertCurrencies(raw.currencies);
    const costCenters = convertCostCenters(raw.costCenters);
    const warehouses = convertWarehouses(raw.warehouseNames);

    reader.close();

    return {
      source: 'rsf',
      metadata: {
        fileName,
        fileSize: buffer.byteLength,
        companyName: raw.companyInfo.name,
        companyNameAr: raw.companyInfo.nameAr,
        sourceVersion: 'Rashid ERP',
      },
      counts: {
        accounts: chartOfAccounts.length,
        customers: customers.length,
        suppliers: suppliers.length,
        materials: materials.length,
        journalEntries: journalEntries.length,
        purchaseInvoices: purchaseInvoices.length,
        salesInvoices: salesInvoices.length,
        vouchers: vouchers.length,
        inventoryMovements: 0,
        costCenters: costCenters.length,
        currencies: currencies.length,
        warehouses: warehouses.length,
      },
      chartOfAccounts,
      accountTypes: [],
      costCenters,
      currencies,
      companySettings: {
        vatEnabled: false, vatRate: 0,
        baseCurrencyCode: currencies.find(c => c.isBaseCurrency)?.code || 'UAH',
        foreignCurrencyCode: currencies.find(c => !c.isBaseCurrency)?.code,
        accountLevels: raw.companyInfo.accLevels,
      },
      fiscalYear: { startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31`, name: `${new Date().getFullYear()}`, isCurrent: true },
      warehouses,
      customers,
      suppliers,
      materials,
      priceLists: [],
      journalEntries,
      purchaseInvoices,
      salesInvoices,
      vouchers,
      inventoryMovements: [],
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// Individual converters
// ═══════════════════════════════════════════════════════════════

function convertAccounts(raw: any[]): UnifiedAccount[] {
  return raw.filter(a => a.code).map(a => {
    const cls = classifyAccount(a.code);
    return {
      code: a.code, parentCode: a.ref, name: a.name, nameAr: a.nameAr || a.name,
      // In Rashid: IS_SUB=1 means "has sub-accounts" → it IS a group/parent
      isGroup: a.isSub === true,
      classification: cls?.classification || 'assets',
      accountType: cls?.type || 'ASSET',
      normalBalance: cls?.normalBalance || 'debit',
      openingDebit: a.debit, openingCredit: a.credit,
      currencyCode: undefined,
      flags: getAccountFlags(a.code),
    };
  });
}

function convertCustomers(raw: any[], accounts: UnifiedAccount[]): UnifiedCustomer[] {
  // Build account balance lookup for customer accounts (161xxx)
  const accBalances: Record<string, number> = {};
  for (const a of accounts) {
    if (a.code.startsWith('161')) {
      const bal = (a.openingDebit || 0) - (a.openingCredit || 0);
      if (bal !== 0) accBalances[a.code] = bal;
    }
  }

  return raw.filter(c => c.code).map(c => {
    // In Rashid, customer code (161xxx) IS the account code
    const ownBalance = c.balance || 0;
    const accCode = c.accountCode || c.code || '';
    // Try: own balance → accountCode lookup → customer code lookup
    const accBalance = accBalances[accCode] || accBalances[c.code] || 0;
    return {
      code: c.code, name: c.name, nameAr: c.nameAr || c.name,
      phone: c.phone || undefined, mobile: c.mobile || undefined,
      email: c.email || undefined, address: c.address || undefined,
      city: c.city || undefined, country: c.country || undefined,
      taxNumber: c.taxNumber || undefined, accountCode: accCode || undefined,
      creditLimit: c.creditLimit, openingBalance: ownBalance || accBalance, notes: c.notes || undefined,
    };
  });
}

function convertSuppliers(raw: any[], accounts: UnifiedAccount[]): UnifiedSupplier[] {
  // Build account balance lookup for supplier accounts (261xxx)
  const accBalances: Record<string, number> = {};
  for (const a of accounts) {
    if (a.code.startsWith('261')) {
      const bal = (a.openingCredit || 0) - (a.openingDebit || 0);
      if (bal !== 0) accBalances[a.code] = bal;
    }
  }

  return raw.filter(s => s.code).map(s => {
    const ownBalance = s.balance || 0;
    const accCode = s.accountCode || s.code || '';
    const accBalance = accBalances[accCode] || accBalances[s.code] || 0;
    return {
      code: s.code, name: s.name, nameAr: s.nameAr || s.name,
      phone: s.phone || undefined, mobile: s.mobile || undefined,
      email: s.email || undefined, address: s.address || undefined,
      city: s.city || undefined, country: s.country || undefined,
      taxNumber: s.taxNumber || undefined, accountCode: accCode || undefined,
      openingBalance: ownBalance || accBalance, notes: s.notes || undefined,
    };
  });
}

function convertMaterials(raw: any[]): UnifiedMaterial[] {
  return raw.filter(m => m.code).map(m => ({
    code: m.code, name: m.name, nameAr: m.nameAr || m.name,
    unit: m.unit || 'قطعة', isGroup: m.isSub === true, parentCode: m.ref || undefined,
    buyPrice: m.buyPrice, sellPrice: m.sellPrice,
    wholesalePrice: m.wholesalePrice, halfWholesalePrice: m.halfWholesalePrice,
    specialPrice: m.specialPrice, minPrice: m.minPrice,
    openingBalance: m.balance, warehouseBalances: m.warehouseBalances || {},
    barcode: m.barcode || undefined, notes: m.notes || undefined,
  }));
}

function convertJournalEntries(headers: any[], lines: any[]): UnifiedJournalEntry[] {
  const linesByNrs: Record<number, any[]> = {};
  for (const l of lines) { if (!linesByNrs[l.nrs]) linesByNrs[l.nrs] = []; linesByNrs[l.nrs].push(l); }

  return headers.filter(h => h.nrs).map(h => {
    const entryLines = (linesByNrs[h.nrs] || []).sort((a: any, b: any) => a.lineOrder - b.lineOrder).map((l: any, i: number): UnifiedJournalLine => ({
      lineNumber: i + 1, accountCode: l.accountCode,
      debit: l.debit || 0, credit: l.credit || 0, description: l.description || '',
      costCenterCode: l.costCenterCode || undefined,
      localAmount: l.localAmount, foreignAmount: l.foreignAmount,
    }));

    // Calculate totals from lines if header totals are 0
    const headerDebit = h.totalDebit || 0;
    const headerCredit = h.totalCredit || 0;
    const linesDebit = entryLines.reduce((s, l) => s + (l.debit || 0), 0);
    const linesCredit = entryLines.reduce((s, l) => s + (l.credit || 0), 0);

    return {
      sourceNumber: h.nrs,
      date: formatDate(h.date),
      description: h.notes || `قيد رقم ${h.nrs}`,
      totalDebit: headerDebit || linesDebit,
      totalCredit: headerCredit || linesCredit,
      isPosted: true, type: h.type,
      lines: entryLines,
    };
  });
}

function convertPurchaseInvoices(raw: any[], materials: any[]): UnifiedPurchaseInvoice[] {
  const matMap: Record<string, string> = {};
  for (const m of materials) if (m.code) matMap[m.code] = m.nameAr || m.name;

  return raw.filter(inv => inv.number).map(inv => ({
    sourceNumber: inv.number, date: formatDate(inv.date),
    supplierCode: inv.supplierCode, currency: 'UAH', exchangeRate: 1,
    subtotal: inv.total, discountAmount: inv.discount || 0, discountPercent: 0,
    taxAmount: 0, taxRate: 0, totalAmount: inv.netTotal || inv.total,
    notes: inv.notes || undefined, isPosted: true,
    items: (inv.lines || []).map((l: any, i: number): UnifiedInvoiceItem => {
      const code = String(l.MatNum || l['SACC-NR'] || '').trim();
      const qty = parseFloat(l.Qty || l.SQUANT) || 0;
      const price = parseFloat(l.Price || l.UnitPrice || l.SPRICE) || 0;
      return {
        lineNumber: i + 1, materialCode: code, materialName: matMap[code],
        quantity: qty, unitPrice: price, discountPercent: 0, discountAmount: 0,
        taxRate: 0, taxAmount: 0, subtotal: qty * price, total: qty * price,
      };
    }),
  }));
}

function convertSalesInvoices(raw: any[], materials: any[]): UnifiedSalesInvoice[] {
  const matMap: Record<string, string> = {};
  for (const m of materials) if (m.code) matMap[m.code] = m.nameAr || m.name;

  return raw.filter(inv => inv.number).map(inv => ({
    sourceNumber: inv.number, date: formatDate(inv.date),
    customerCode: inv.customerCode, currency: 'UAH', exchangeRate: 1,
    subtotal: inv.total, discountAmount: inv.discount || 0, discountPercent: 0,
    taxAmount: 0, taxRate: 0, totalAmount: inv.netTotal || inv.total,
    paidAmount: 0, notes: inv.notes || undefined, isPosted: true,
    items: (inv.lines || []).map((l: any, i: number): UnifiedInvoiceItem => {
      const code = String(l.MatNum || l['SACC-NR'] || '').trim();
      const qty = parseFloat(l.Qty || l.SQUANT) || 0;
      const price = parseFloat(l.Price || l.UnitPrice || l.SPRICE) || 0;
      return {
        lineNumber: i + 1, materialCode: code, materialName: matMap[code],
        quantity: qty, unitPrice: price, discountPercent: 0, discountAmount: 0,
        taxRate: 0, taxAmount: 0, subtotal: qty * price, total: qty * price,
      };
    }),
  }));
}

function convertVouchers(raw: any[]): UnifiedVoucher[] {
  return raw.filter(r => r.number).map(r => ({
    sourceNumber: r.number, date: formatDate(r.date),
    type: (r.type === 1 || r.type === 'receipt') ? 'receipt' : 'payment',
    amount: r.amount, cashAccountCode: r.accountCode || '',
    partyAccountCode: '', description: r.notes || '',
  }));
}

// Currency name → ISO code mapping (Arabic + English)
const CURRENCY_NAME_MAP: [RegExp, string][] = [
  [/دولار|dollar/i, 'USD'],
  [/يورو|euro/i, 'EUR'],
  [/ليرة.*(?:تركي|turk)|turkish.*lira/i, 'TRY'],
  [/ليرة.*(?:سوري|syri)|syrian/i, 'SYP'],
  [/ليرة.*(?:لبنان|leban)|lebanese/i, 'LBP'],
  [/ريال.*(?:سعود|saudi)|saudi.*riyal/i, 'SAR'],
  [/درهم.*(?:إمارات|emarat|uae)|dirham/i, 'AED'],
  [/دينار.*(?:عراق|iraq)|iraqi.*dinar/i, 'IQD'],
  [/دينار.*(?:أردن|jordan)|jordan.*dinar/i, 'JOD'],
  [/دينار.*(?:كويت|kuwait)|kuwait.*dinar/i, 'KWD'],
  [/جنيه.*(?:مصر|egypt)|egyptian.*pound/i, 'EGP'],
  [/جنيه.*(?:استرلين|بريطان|pound.*sterl|british)/i, 'GBP'],
  [/روبل|ruble|rub/i, 'RUB'],
  [/غريفن|гривн|hryvn|uah/i, 'UAH'],
  [/ين.*(?:ياب|japan)|yen/i, 'JPY'],
  [/فرنك.*(?:سويس|swiss)|franc/i, 'CHF'],
  [/ريال.*(?:قطر|qatar)|qatari/i, 'QAR'],
  [/ريال.*(?:عمان|oman)|omani/i, 'OMR'],
];

function detectCurrencyCode(name: string, nameAr: string, index: number): string {
  const combined = `${name || ''} ${nameAr || ''}`;
  for (const [pattern, code] of CURRENCY_NAME_MAP) {
    if (pattern.test(combined)) return code;
  }
  // Fallback: if name looks like a 3-letter code already
  const trimmed = (name || '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return index === 0 ? 'UAH' : 'USD';
}

function convertCurrencies(raw: any[]): UnifiedCurrency[] {
  return raw
    .filter(c => c.num && c.name && String(c.name).trim().length > 0) // only currencies with actual names
    .map((c, i) => ({
      sourceNum: c.num,
      code: detectCurrencyCode(c.name, c.nameAr, i),
      name: c.name, nameAr: c.nameAr || c.name, symbol: c.symbol || '',
      rate: c.rate, isBaseCurrency: c.num === 1,
    }));
}

function convertCostCenters(raw: any[]): UnifiedCostCenter[] {
  return raw.filter(c => c.code).map(c => ({
    code: c.code, name: c.name, nameAr: c.nameAr || c.name,
    parentCode: c.ref || undefined, isGroup: c.type === 0,
  }));
}

function convertWarehouses(names: Record<number, string>): UnifiedWarehouse[] {
  const entries = Object.entries(names).filter(([, name]) => {
    const n = String(name).trim();
    // Filter out empty names and auto-generated placeholders like "المستودع2", "المستودع3"
    return n.length > 0 && !/^المستودع\d+$/i.test(n);
  });
  if (entries.length === 0) return [{ sourceNum: 1, name: 'المستودع الرئيسي', nameAr: 'المستودع الرئيسي', isDefault: true }];
  return entries.map(([num, name], i) => ({
    sourceNum: parseInt(num), name, nameAr: name, isDefault: i === 0,
  }));
}

export default rsfConverter;
