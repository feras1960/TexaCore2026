/**
 * ════════════════════════════════════════════════════════════════
 * ☁️ Cloud Importer — استيراد البيانات إلى Supabase
 * ════════════════════════════════════════════════════════════════
 * Takes UnifiedImportData and inserts it into Supabase.
 * Supports both full import (empty account) and partial import.
 * @module features/import/core
 */

import { supabase } from '@/lib/supabase';
import type {
  UnifiedImportData, ImportSelections, ImportProgress, ImportResult,
  ImportPhase, ImportWarning, ImportError, AccountReadiness,
  UnifiedAccount, UnifiedCustomer, UnifiedSupplier, UnifiedMaterial,
  UnifiedJournalEntry, AccountMatch, AccountMatchResult,
  UnifiedCurrency, UnifiedCostCenter, UnifiedWarehouse,
  UnifiedPurchaseInvoice, UnifiedSalesInvoice, UnifiedVoucher,
} from './unified-data-model';

const BATCH_SIZE = 100; // Insert in batches

// ═══════════════════════════════════════════════════════════════
// Account Readiness Check
// ═══════════════════════════════════════════════════════════════

export async function checkAccountReadiness(companyId: string): Promise<AccountReadiness> {
  const [accounts, customers, suppliers, journals, transactions, materials] = await Promise.all([
    supabase.from('chart_of_accounts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('purchase_transactions').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('fabric_materials').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);

  const acctCount = accounts.count || 0;
  const custCount = customers.count || 0;
  const suppCount = suppliers.count || 0;
  const jeCount = journals.count || 0;
  const txCount = transactions.count || 0;
  const matCount = materials.count || 0;

  // Default template has ~30-50 accounts
  const hasCustomAccounts = acctCount > 55;
  const isEmpty = !hasCustomAccounts && custCount === 0 && suppCount === 0 && jeCount === 0 && txCount === 0 && matCount === 0;

  return {
    isEmpty,
    details: { hasCustomAccounts, accountsCount: acctCount, customersCount: custCount, suppliersCount: suppCount, journalEntriesCount: jeCount, transactionsCount: txCount, materialsCount: matCount },
    reason: isEmpty ? undefined : 'Account has existing data',
    reasonAr: isEmpty ? undefined : 'يوجد بيانات في الحساب. الاستيراد الكامل متاح فقط للحسابات الفارغة.',
  };
}

// ═══════════════════════════════════════════════════════════════
// Account Matching
// ═══════════════════════════════════════════════════════════════

export async function matchAccounts(companyId: string, sourceAccounts: { code: string; name: string }[]): Promise<AccountMatchResult> {
  const { data: targetAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, name_ar, name_en')
    .eq('company_id', companyId);

  const targets = targetAccounts || [];
  const targetByCode: Record<string, any> = {};
  for (const t of targets) targetByCode[t.account_code] = t;

  const matches: AccountMatch[] = sourceAccounts.map(src => {
    const exact = targetByCode[src.code];
    if (exact) {
      return {
        sourceCode: src.code, sourceName: src.name,
        targetId: exact.id, targetCode: exact.account_code,
        targetName: exact.name_ar || exact.name_en,
        matchType: 'exact' as const, confidence: 100,
      };
    }
    return {
      sourceCode: src.code, sourceName: src.name,
      targetId: null, targetCode: null, targetName: null,
      matchType: 'unmatched' as const, confidence: 0,
    };
  });

  const exact = matches.filter(m => m.matchType === 'exact').length;
  const unmatched = matches.filter(m => m.matchType === 'unmatched').length;

  return {
    matches,
    stats: {
      total: matches.length, exactMatch: exact, fuzzyMatch: 0,
      manualMatch: 0, unmatched,
      matchRate: Math.round((exact / Math.max(matches.length, 1)) * 100),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Main Importer
// ═══════════════════════════════════════════════════════════════

export async function importData(
  data: UnifiedImportData,
  selections: ImportSelections,
  tenantId: string,
  companyId: string,
  userId: string,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> {
  const startTime = Date.now();
  const warnings: ImportWarning[] = [];
  const errors: ImportError[] = [];
  const counts: Record<string, number> = {};

  const emit = (phase: ImportPhase, label: string, current: number, total: number) => {
    const overallPercent = Math.round((current / Math.max(total, 1)) * 100);
    onProgress?.({ phase, label, current, total, overallPercent });
  };

  try {
    // ─── Full Import: clear defaults first ──────────────
    if (selections.mode === 'full') {
      emit('clearing', 'حذف البيانات الافتراضية...', 0, 1);
      await clearDefaults(companyId);
    }

    // ─── Chart of Accounts ──────────────────────────────
    if (selections.include.chartOfAccounts && data.chartOfAccounts.length > 0) {
      emit('accounts', 'استيراد شجرة الحسابات...', 0, data.chartOfAccounts.length);
      counts.accounts = await importAccounts(data.chartOfAccounts, tenantId, companyId, (c, t) => emit('accounts', `استيراد الحسابات... ${c}/${t}`, c, t), selections.mode);
    }

    // ─── Customers ──────────────────────────────────────
    if (selections.include.customers && data.customers.length > 0) {
      emit('customers', 'استيراد العملاء...', 0, data.customers.length);
      counts.customers = await importCustomers(data.customers, tenantId, companyId, userId, (c, t) => emit('customers', `استيراد العملاء... ${c}/${t}`, c, t));
    }

    // ─── Suppliers ──────────────────────────────────────
    if (selections.include.suppliers && data.suppliers.length > 0) {
      emit('suppliers', 'استيراد الموردين...', 0, data.suppliers.length);
      counts.suppliers = await importSuppliers(data.suppliers, tenantId, companyId, userId, (c, t) => emit('suppliers', `استيراد الموردين... ${c}/${t}`, c, t));
    }

    // ─── Materials ──────────────────────────────────────
    if (selections.include.materials && data.materials.length > 0) {
      emit('materials', 'استيراد المواد...', 0, data.materials.length);
      counts.materials = await importMaterials(data.materials, tenantId, companyId, userId, (c, t) => emit('materials', `استيراد المواد... ${c}/${t}`, c, t));
    }

    // ─── Currencies ──────────────────────────────────────
    if (selections.include.currencies && data.currencies && data.currencies.length > 0) {
      emit('currencies', 'استيراد العملات...', 0, data.currencies.length);
      counts.currencies = await importCurrencies(data.currencies, tenantId, companyId);
    }

    // ─── Cost Centers ───────────────────────────────────
    if (selections.include.costCenters && data.costCenters && data.costCenters.length > 0) {
      emit('costcenters', 'استيراد مراكز التكلفة...', 0, data.costCenters.length);
      counts.costCenters = await importCostCenters(data.costCenters, tenantId, companyId);
    }

    // ─── Warehouses ─────────────────────────────────────
    if (selections.include.warehouses && data.warehouses && data.warehouses.length > 0) {
      emit('warehouses', 'استيراد المستودعات...', 0, data.warehouses.length);
      counts.warehouses = await importWarehouses(data.warehouses, tenantId, companyId);
    }

    // ─── Journal Entries ────────────────────────────────
    if (selections.include.journalEntries && data.journalEntries.length > 0) {
      emit('journals', 'استيراد القيود المحاسبية...', 0, data.journalEntries.length);
      counts.journalEntries = await importJournalEntries(data.journalEntries, tenantId, companyId, userId, selections.accountMapping || {}, (c, t) => emit('journals', `استيراد القيود... ${c}/${t}`, c, t));
    }

    // ─── Purchase Invoices ──────────────────────────────
    if (selections.include.purchaseInvoices && data.purchaseInvoices && data.purchaseInvoices.length > 0) {
      emit('purchases', 'استيراد فواتير المشتريات...', 0, data.purchaseInvoices.length);
      counts.purchaseInvoices = await importPurchaseInvoices(data.purchaseInvoices, tenantId, companyId, userId, (c, t) => emit('purchases', `استيراد المشتريات... ${c}/${t}`, c, t));
    }

    // ─── Sales Invoices ─────────────────────────────────
    if (selections.include.salesInvoices && data.salesInvoices && data.salesInvoices.length > 0) {
      emit('sales', 'استيراد فواتير المبيعات...', 0, data.salesInvoices.length);
      counts.salesInvoices = await importSalesInvoices(data.salesInvoices, tenantId, companyId, userId, (c, t) => emit('sales', `استيراد المبيعات... ${c}/${t}`, c, t));
    }

    // ─── Vouchers ───────────────────────────────────────
    if (selections.include.vouchers && data.vouchers && data.vouchers.length > 0) {
      emit('vouchers', 'استيراد السندات...', 0, data.vouchers.length);
      counts.vouchers = await importVouchers(data.vouchers, tenantId, companyId, userId, (c, t) => emit('vouchers', `استيراد السندات... ${c}/${t}`, c, t));
    }

    // ─── Settings ───────────────────────────────────────
    if (selections.mode === 'full' && data.companySettings) {
      emit('settings', 'تعيين الإعدادات...', 0, 1);
      await applySettings(data.companySettings, companyId);
    }

    emit('done', 'اكتمل الاستيراد', 1, 1);

    return {
      success: true, counts, warnings, errors,
      durationMs: Date.now() - startTime,
      completedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push({ phase: 'error' as ImportPhase, message: err.message });
    return {
      success: false, counts, warnings, errors,
      durationMs: Date.now() - startTime,
      completedAt: new Date().toISOString(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Individual importers
// ═══════════════════════════════════════════════════════════════

async function clearDefaults(companyId: string) {
  // Delete default chart of accounts (template data)
  await supabase.from('journal_entry_lines').delete().eq('company_id', companyId);
  await supabase.from('journal_entries').delete().eq('company_id', companyId);
  await supabase.from('chart_of_accounts').delete().eq('company_id', companyId);
}

async function importAccounts(
  accounts: UnifiedAccount[], tenantId: string, companyId: string,
  onBatch: (c: number, t: number) => void,
  mode: string = 'full',
): Promise<number> {
  // ─── Step 1: Load existing chart structure ─────────────
  const { data: existingAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, parent_id, name_ar, is_group, is_cash_account, is_bank_account, is_receivable, is_payable')
    .eq('company_id', companyId);

  const existingCodes = new Set<string>();
  const existingGroups: import('./account-classifier').TexaCoreGroup[] = [];
  const codeToId: Record<string, string> = {};

  for (const a of (existingAccounts || [])) {
    existingCodes.add(a.account_code);
    codeToId[a.account_code] = a.id;

    if (a.is_group) {
      // Count existing children to determine next sequence
      const childCount = (existingAccounts || []).filter(c =>
        c.account_code.startsWith(a.account_code) && c.account_code.length > a.account_code.length
        && c.account_code.length <= a.account_code.length + 3
      ).length;

      existingGroups.push({
        code: a.account_code,
        name: a.name_ar,
        id: a.id,
        parentCode: null, // Not needed for classification
        isCash: a.is_cash_account || false,
        isBank: a.is_bank_account || false,
        isReceivable: a.is_receivable || false,
        isPayable: a.is_payable || false,
        nextSeq: childCount + 1,
      });
    }
  }

  // ─── Ensure "imported accounts" fallback group exists ──
  if (!existingCodes.has('119')) {
    const parent11Id = codeToId['11'];
    if (parent11Id) {
      const id119 = globalThis.crypto.randomUUID();
      await supabase.from('chart_of_accounts').insert({
        id: id119, tenant_id: tenantId, company_id: companyId,
        account_code: '119', name_ar: 'حسابات مستوردة أخرى', name_en: 'Other Imported Accounts',
        parent_id: parent11Id, is_group: true, is_active: true,
      });
      codeToId['119'] = id119;
      existingGroups.push({
        code: '119', name: 'حسابات مستوردة أخرى', id: id119,
        parentCode: '11', isCash: false, isBank: false, isReceivable: false, isPayable: false, nextSeq: 1,
      });
      existingCodes.add('119');
    }
  }

  onBatch(0, accounts.length);

  // ─── Step 2: Classify accounts (rules) ─────────────────
  const { classifyAccounts, applyAIClassifications, getAccountsNeedingAI } = await import('./account-classifier');
  const classResult = classifyAccounts(accounts, existingGroups, existingCodes);

  onBatch(Math.floor(accounts.length * 0.2), accounts.length);

  // ─── Step 3: AI analysis for ambiguous accounts ────────
  const needsAI = getAccountsNeedingAI(classResult);
  if (needsAI.length > 0) {
    try {
      const { analyzeAccountsWithAI } = await import('./ai-account-analyzer');
      const aiSuggestions = await analyzeAccountsWithAI(needsAI, existingGroups);
      if (aiSuggestions.length > 0) {
        applyAIClassifications(classResult, aiSuggestions, existingGroups);
      }
    } catch (e) {
      console.warn('[Import] AI analysis failed, using rules only:', e);
    }
  }

  onBatch(Math.floor(accounts.length * 0.4), accounts.length);

  // ─── Step 4: Insert classified accounts ────────────────
  let count = 0;
  const newIdMap: Record<string, string> = {}; // oldCode → newId

  for (let i = 0; i < classResult.classified.length; i++) {
    const classified = classResult.classified[i];
    const acc = classified.original;

    // Find parent group ID
    const parentGroupId = codeToId[classified.targetGroupCode];
    if (!parentGroupId) continue; // Skip if no valid parent

    const newId = globalThis.crypto.randomUUID();
    newIdMap[acc.code] = newId;
    codeToId[classified.newCode] = newId;

    const { error } = await supabase.from('chart_of_accounts').upsert({
      id: newId,
      tenant_id: tenantId,
      company_id: companyId,
      account_code: classified.newCode,
      external_code: acc.code, // ← الكود الأصلي كمرجع للبحث
      parent_id: parentGroupId,
      name_ar: acc.nameAr || acc.name,
      name_en: acc.name,
      is_group: false,
      is_detail: true,
      is_cash_account: classified.flags.isCash,
      is_bank_account: classified.flags.isBank,
      is_receivable: classified.flags.isReceivable,
      is_payable: classified.flags.isPayable,
      is_party_account: classified.flags.isPartyAccount,
      opening_balance: (acc.openingDebit || 0) - (acc.openingCredit || 0),
      is_active: true,
    }, { onConflict: 'company_id,account_code' });

    if (!error) count++;
    if (i % 50 === 0) onBatch(Math.floor(accounts.length * 0.4) + Math.floor(i * 0.6), accounts.length);
  }

  onBatch(accounts.length, accounts.length);
  return count;
}

async function importCustomers(customers: UnifiedCustomer[], tenantId: string, companyId: string, userId: string, onBatch: (c: number, t: number) => void): Promise<number> {
  let count = 0;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    const rows = batch.map(c => ({
      tenant_id: tenantId, company_id: companyId,
      customer_code: c.code,
      name_ar: c.nameAr || c.name, name_en: c.name || c.nameAr,
      phone: c.phone || null, mobile: c.mobile || null,
      email: c.email || null, address: c.address || null,
      city: c.city || null, country: c.country || null,
      tax_number: c.taxNumber || null,
      credit_limit: c.creditLimit,
      opening_balance: c.openingBalance,
      notes: c.notes || null,
      is_active: true,
      created_by: userId,
    }));
    const { error } = await supabase.from('customers').insert(rows);
    if (!error) count += batch.length;
    onBatch(Math.min(i + BATCH_SIZE, customers.length), customers.length);
  }
  return count;
}

async function importSuppliers(suppliers: UnifiedSupplier[], tenantId: string, companyId: string, userId: string, onBatch: (c: number, t: number) => void): Promise<number> {
  let count = 0;
  for (let i = 0; i < suppliers.length; i += BATCH_SIZE) {
    const batch = suppliers.slice(i, i + BATCH_SIZE);
    const rows = batch.map(s => ({
      tenant_id: tenantId, company_id: companyId,
      supplier_code: s.code,
      name_ar: s.nameAr || s.name, name_en: s.name || s.nameAr,
      phone: s.phone || null, mobile: s.mobile || null,
      email: s.email || null, address: s.address || null,
      city: s.city || null, country: s.country || null,
      tax_number: s.taxNumber || null,
      opening_balance: s.openingBalance,
      notes: s.notes || null,
      is_active: true,
      created_by: userId,
    }));
    const { error } = await supabase.from('suppliers').insert(rows);
    if (!error) count += batch.length;
    onBatch(Math.min(i + BATCH_SIZE, suppliers.length), suppliers.length);
  }
  return count;
}

async function importMaterials(materials: UnifiedMaterial[], tenantId: string, companyId: string, userId: string, onBatch: (c: number, t: number) => void): Promise<number> {
  let count = 0;
  const nonGroup = materials.filter(m => !m.isGroup);
  for (let i = 0; i < nonGroup.length; i += BATCH_SIZE) {
    const batch = nonGroup.slice(i, i + BATCH_SIZE);
    const rows = batch.map(m => ({
      tenant_id: tenantId, company_id: companyId,
      material_code: m.code,
      name_ar: m.nameAr || m.name, name_en: m.name || m.nameAr,
      unit: m.unit || 'قطعة',
      buy_price: m.buyPrice, sell_price: m.sellPrice,
      opening_balance: m.openingBalance,
      barcode: m.barcode || null,
      notes: m.notes || null,
      is_active: true,
      created_by: userId,
    }));
    const { error } = await supabase.from('fabric_materials').insert(rows);
    if (!error) count += batch.length;
    onBatch(Math.min(i + BATCH_SIZE, nonGroup.length), nonGroup.length);
  }
  return count;
}

async function importJournalEntries(
  entries: UnifiedJournalEntry[], tenantId: string, companyId: string, userId: string,
  accountMapping: Record<string, string>,
  onBatch: (c: number, t: number) => void,
): Promise<number> {
  // Get account code → id map (includes both new codes AND original external_code)
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, external_code')
    .eq('company_id', companyId);

  const codeToId: Record<string, string> = {};
  for (const a of (accounts || [])) {
    codeToId[a.account_code] = a.id;
    // Also map by original external_code (RSF code) for imported accounts
    if (a.external_code) codeToId[a.external_code] = a.id;
  }

  // Merge with user-provided mapping
  for (const [src, tgt] of Object.entries(accountMapping)) {
    if (tgt) codeToId[src] = tgt;
  }

  let count = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // Skip entries with unmapped accounts
    const mappedLines = entry.lines.filter(l => codeToId[l.accountCode]);
    if (mappedLines.length === 0) continue;

    const jeId = globalThis.crypto.randomUUID();
    const { error: jeErr } = await supabase.from('journal_entries').insert({
      id: jeId, tenant_id: tenantId, company_id: companyId,
      entry_number: typeof entry.sourceNumber === 'number' ? entry.sourceNumber : parseInt(String(entry.sourceNumber)) || i + 1,
      entry_date: entry.date, description: entry.description,
      total_debit: entry.totalDebit, total_credit: entry.totalCredit,
      is_posted: entry.isPosted, source: 'import',
      created_by: userId,
    });

    if (!jeErr) {
      const lineRows = mappedLines.map((l, idx) => ({
        tenant_id: tenantId, company_id: companyId,
        journal_entry_id: jeId,
        account_id: codeToId[l.accountCode],
        line_number: idx + 1,
        debit: l.debit, credit: l.credit,
        description: l.description || entry.description,
      }));
      await supabase.from('journal_entry_lines').insert(lineRows);
      count++;
    }

    if (i % 50 === 0) onBatch(i, entries.length);
  }
  onBatch(entries.length, entries.length);
  return count;
}

async function applySettings(settings: any, companyId: string) {
  await supabase.from('company_accounting_settings').upsert({
    company_id: companyId,
    vat_enabled: false,
    vat_rate: 0,
  }, { onConflict: 'company_id' });
}

// ═══════════════════════════════════════════════════════════════
// Currencies, Cost Centers, Warehouses importers
// ═══════════════════════════════════════════════════════════════

async function importCurrencies(currencies: UnifiedCurrency[], tenantId: string, companyId: string): Promise<number> {
  let count = 0;
  for (const c of currencies) {
    const { error } = await supabase.from('currencies').upsert({
      tenant_id: tenantId, company_id: companyId,
      code: c.code, name_en: c.name, name_ar: c.nameAr || c.name,
      symbol: c.symbol || c.code,
      exchange_rate: c.rate || 1,
      is_base: c.isBaseCurrency || false,
      is_active: true,
    }, { onConflict: 'company_id,code' });
    if (!error) count++;
  }
  return count;
}

async function importCostCenters(centers: UnifiedCostCenter[], tenantId: string, companyId: string): Promise<number> {
  // Sort by code length (parents first)
  const sorted = [...centers].sort((a, b) => (a.code?.length || 0) - (b.code?.length || 0));
  const idMap: Record<string, string> = {};
  let count = 0;

  for (const cc of sorted) {
    const id = globalThis.crypto.randomUUID();
    idMap[cc.code] = id;
    const parentId = cc.parentCode ? (idMap[cc.parentCode] || null) : null;
    const { error } = await supabase.from('cost_centers').upsert({
      id, tenant_id: tenantId, company_id: companyId,
      code: cc.code, name_ar: cc.nameAr || cc.name, name_en: cc.name,
      parent_id: parentId, is_group: cc.isGroup || false, is_active: true,
    }, { onConflict: 'company_id,code' });
    if (!error) count++;
  }
  return count;
}

async function importWarehouses(warehouses: UnifiedWarehouse[], tenantId: string, companyId: string): Promise<number> {
  let count = 0;
  for (const wh of warehouses) {
    const { error } = await supabase.from('warehouses').upsert({
      tenant_id: tenantId, company_id: companyId,
      name: wh.nameAr || wh.name, name_en: wh.name,
      is_default: wh.isDefault || false, is_active: true,
    }, { onConflict: 'company_id,name' });
    if (!error) count++;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════
// Purchase & Sales Invoices, Vouchers importers
// ═══════════════════════════════════════════════════════════════

async function importPurchaseInvoices(
  invoices: UnifiedPurchaseInvoice[], tenantId: string, companyId: string, userId: string,
  onBatch: (c: number, t: number) => void,
): Promise<number> {
  // Get supplier code → id map
  const { data: suppliers } = await supabase.from('suppliers').select('id, supplier_code').eq('company_id', companyId);
  const supplierMap: Record<string, string> = {};
  for (const s of (suppliers || [])) supplierMap[s.supplier_code] = s.id;

  // Get material code → id map
  const { data: materials } = await supabase.from('fabric_materials').select('id, material_code').eq('company_id', companyId);
  const materialMap: Record<string, string> = {};
  for (const m of (materials || [])) materialMap[m.material_code] = m.id;

  let count = 0;
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const supplierId = supplierMap[inv.supplierCode];
    if (!supplierId) continue; // Skip if supplier not found

    const txId = globalThis.crypto.randomUUID();
    const { error } = await supabase.from('purchase_transactions').insert({
      id: txId, tenant_id: tenantId, company_id: companyId,
      transaction_number: inv.sourceNumber,
      stage: 'posted', transaction_date: inv.date,
      supplier_id: supplierId,
      subtotal: inv.subtotal || inv.totalAmount,
      discount_amount: inv.discountAmount || 0,
      tax_amount: inv.taxAmount || 0,
      total_amount: inv.totalAmount,
      notes: inv.notes || `فاتورة مشتريات مستوردة #${inv.sourceNumber}`,
      source: 'import', created_by: userId,
    });

    if (!error && inv.items) {
      const itemRows = inv.items.filter(item => materialMap[item.materialCode]).map((item, idx) => ({
        tenant_id: tenantId, company_id: companyId,
        transaction_id: txId,
        material_id: materialMap[item.materialCode],
        line_number: idx + 1,
        quantity: item.quantity, unit_price: item.unitPrice,
        discount_percent: item.discountPercent || 0,
        tax_rate: item.taxRate || 0, tax_amount: item.taxAmount || 0,
        subtotal: item.subtotal, total: item.total,
      }));
      if (itemRows.length > 0) await supabase.from('purchase_transaction_items').insert(itemRows);
      count++;
    }
    if (i % 50 === 0) onBatch(i, invoices.length);
  }
  onBatch(invoices.length, invoices.length);
  return count;
}

async function importSalesInvoices(
  invoices: UnifiedSalesInvoice[], tenantId: string, companyId: string, userId: string,
  onBatch: (c: number, t: number) => void,
): Promise<number> {
  // Get customer code → id map
  const { data: customers } = await supabase.from('customers').select('id, customer_code').eq('company_id', companyId);
  const customerMap: Record<string, string> = {};
  for (const c of (customers || [])) customerMap[c.customer_code] = c.id;

  // Get material code → id map
  const { data: materials } = await supabase.from('fabric_materials').select('id, material_code').eq('company_id', companyId);
  const materialMap: Record<string, string> = {};
  for (const m of (materials || [])) materialMap[m.material_code] = m.id;

  let count = 0;
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const customerId = customerMap[inv.customerCode];
    if (!customerId) continue;

    const txId = globalThis.crypto.randomUUID();
    const { error } = await supabase.from('sales_transactions').insert({
      id: txId, tenant_id: tenantId, company_id: companyId,
      transaction_number: inv.sourceNumber,
      stage: 'posted', transaction_date: inv.date,
      customer_id: customerId,
      subtotal: inv.subtotal || inv.totalAmount,
      discount_amount: inv.discountAmount || 0,
      tax_amount: inv.taxAmount || 0,
      total_amount: inv.totalAmount,
      paid_amount: inv.paidAmount || 0,
      notes: inv.notes || `فاتورة مبيعات مستوردة #${inv.sourceNumber}`,
      source: 'import', created_by: userId,
    });

    if (!error && inv.items) {
      const itemRows = inv.items.filter(item => materialMap[item.materialCode]).map((item, idx) => ({
        tenant_id: tenantId, company_id: companyId,
        transaction_id: txId,
        material_id: materialMap[item.materialCode],
        line_number: idx + 1,
        quantity: item.quantity, unit_price: item.unitPrice,
        discount_percent: item.discountPercent || 0,
        tax_rate: item.taxRate || 0, tax_amount: item.taxAmount || 0,
        subtotal: item.subtotal, total: item.total,
      }));
      if (itemRows.length > 0) await supabase.from('sales_transaction_items').insert(itemRows);
      count++;
    }
    if (i % 50 === 0) onBatch(i, invoices.length);
  }
  onBatch(invoices.length, invoices.length);
  return count;
}

async function importVouchers(
  vouchers: UnifiedVoucher[], tenantId: string, companyId: string, userId: string,
  onBatch: (c: number, t: number) => void,
): Promise<number> {
  // Get account code → id map
  const { data: accounts } = await supabase.from('chart_of_accounts').select('id, account_code').eq('company_id', companyId);
  const codeToId: Record<string, string> = {};
  for (const a of (accounts || [])) codeToId[a.account_code] = a.id;

  let count = 0;
  for (let i = 0; i < vouchers.length; i++) {
    const v = vouchers[i];
    const table = v.type === 'receipt' ? 'payment_receipts' : 'payment_vouchers';
    const cashAccountId = codeToId[v.cashAccountCode];
    if (!cashAccountId) continue;

    const { error } = await supabase.from(table).insert({
      tenant_id: tenantId, company_id: companyId,
      voucher_number: v.sourceNumber,
      voucher_date: v.date,
      amount: v.amount,
      account_id: cashAccountId,
      description: v.description || `${v.type === 'receipt' ? 'سند قبض' : 'سند دفع'} #${v.sourceNumber}`,
      source: 'import', created_by: userId,
    });
    if (!error) count++;
    if (i % 50 === 0) onBatch(i, vouchers.length);
  }
  onBatch(vouchers.length, vouchers.length);
  return count;
}
