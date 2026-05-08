/**
 * ════════════════════════════════════════════════════════════════
 * 💾 TCDB Browser Reader — قارئ ملفات TexaCore في المتصفح
 * ════════════════════════════════════════════════════════════════
 * Reads .tcdb files (encrypted backups from TexaCore local).
 * Supports Version 2 (SQL dump) and Version 3 (JSON payload).
 * Uses Web Crypto API for decryption + pako for decompression.
 * @module features/import/core
 */

import * as pako from 'pako';
import type {
  ImportConverter, ImportSource, UnifiedImportData, ImportProgress,
} from './unified-data-model';

// ─── Constants (must match backup-manager.js) ─────────────────
const TCDB_MAGIC = new Uint8Array([0x54, 0x43, 0x44, 0x42]); // "TCDB"
const KEY_ITERATIONS = 100000;
const HEADER_SIZE = 153;

// ═══════════════════════════════════════════════════════════════
// File Parser
// ═══════════════════════════════════════════════════════════════

interface TcdbHeader {
  version: number;
  timestamp: number;
  originalSize: number;
  compressedSize: number;
  encryptedSize: number;
  salt: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  checksum: Uint8Array;
  payload: Uint8Array;
}

function parseTcdbHeader(buffer: ArrayBuffer): TcdbHeader {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Verify magic
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== TCDB_MAGIC[i]) throw new Error('ملف غير صالح — ليس ملف TexaCore');
  }

  let offset = 4;
  const version = view.getUint8(offset); offset += 1;
  if (version > 3) throw new Error(`إصدار الملف (${version}) غير مدعوم`);

  // Timestamp (BigUInt64LE) — read as two 32-bit
  const lo = view.getUint32(offset, true);
  const hi = view.getUint32(offset + 4, true);
  const timestamp = lo + hi * 0x100000000;
  offset += 8;

  const originalSize = view.getUint32(offset, true); offset += 4;
  const compressedSize = view.getUint32(offset, true); offset += 4;
  const encryptedSize = view.getUint32(offset, true); offset += 4;

  const salt = bytes.slice(offset, offset + 32); offset += 32;
  const iv = bytes.slice(offset, offset + 16); offset += 16;
  const authTag = bytes.slice(offset, offset + 16); offset += 16;
  const checksum = bytes.slice(offset, offset + 64); offset += 64;
  const payload = bytes.slice(offset, offset + encryptedSize);

  return { version, timestamp, originalSize, compressedSize, encryptedSize, salt, iv, authTag, checksum, payload };
}

// ═══════════════════════════════════════════════════════════════
// Crypto (Web Crypto API)
// ═══════════════════════════════════════════════════════════════

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: KEY_ITERATIONS, hash: 'SHA-512' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

async function decryptPayload(password: string, header: TcdbHeader): Promise<Uint8Array> {
  const key = await deriveKey(password, header.salt);
  // AES-GCM: authTag is appended to ciphertext for Web Crypto
  const cipherWithTag = new Uint8Array(header.payload.length + header.authTag.length);
  cipherWithTag.set(header.payload);
  cipherWithTag.set(header.authTag, header.payload.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: header.iv.buffer as ArrayBuffer, tagLength: 128 },
    key,
    cipherWithTag.buffer as ArrayBuffer,
  );
  return new Uint8Array(decrypted);
}

// ═══════════════════════════════════════════════════════════════
// SQL Parser (for Version 2 — extracts data from SQL dump)
// ═══════════════════════════════════════════════════════════════

function parseSqlToJson(sql: string): Record<string, any[]> {
  const tables: Record<string, any[]> = {};
  // Simple INSERT parser: INSERT INTO schema.table (...) VALUES (...);
  const insertRegex = /INSERT INTO (?:public\.)?(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^;]+)\);/gi;
  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
    const valuesStr = match[3];
    if (!tables[tableName]) tables[tableName] = [];
    try {
      // Basic value parser (handles strings, numbers, nulls)
      const values = parseValues(valuesStr);
      const row: Record<string, any> = {};
      columns.forEach((col, i) => { row[col] = values[i] ?? null; });
      tables[tableName].push(row);
    } catch { /* skip malformed rows */ }
  }
  return tables;
}

function parseValues(str: string): any[] {
  const values: any[] = [];
  let i = 0;
  while (i < str.length) {
    // Skip whitespace/comma
    while (i < str.length && (str[i] === ' ' || str[i] === ',')) i++;
    if (i >= str.length) break;

    if (str[i] === "'") {
      // String value
      let val = '';
      i++; // skip opening quote
      while (i < str.length) {
        if (str[i] === "'" && str[i + 1] === "'") { val += "'"; i += 2; }
        else if (str[i] === "'") { i++; break; }
        else { val += str[i]; i++; }
      }
      values.push(val);
    } else if (str.substring(i, i + 4).toUpperCase() === 'NULL') {
      values.push(null);
      i += 4;
    } else if (str.substring(i, i + 4).toLowerCase() === 'true') {
      values.push(true);
      i += 4;
    } else if (str.substring(i, i + 5).toLowerCase() === 'false') {
      values.push(false);
      i += 5;
    } else {
      // Number
      let num = '';
      while (i < str.length && str[i] !== ',' && str[i] !== ')') { num += str[i]; i++; }
      const parsed = Number(num.trim());
      values.push(isNaN(parsed) ? num.trim() : parsed);
    }
  }
  return values;
}

// ═══════════════════════════════════════════════════════════════
// TCDB → UnifiedImportData converter
// ═══════════════════════════════════════════════════════════════

function tcdbJsonToUnified(data: Record<string, any[]>, fileName: string, fileSize: number): UnifiedImportData {
  const companies = data.companies || [];
  const company = companies[0] || {};
  const settings = (data.company_accounting_settings || [])[0] || {};

  return {
    source: 'tcdb',
    metadata: {
      fileName, fileSize,
      companyName: company.name_ar || company.name_en || 'TexaCore',
      companyNameAr: company.name_ar,
      sourceVersion: 'TexaCore Local',
    },
    counts: {
      accounts: (data.chart_of_accounts || []).length,
      customers: (data.customers || []).length,
      suppliers: (data.suppliers || []).length,
      materials: (data.fabric_materials || data.products || []).length,
      journalEntries: (data.journal_entries || []).length,
      purchaseInvoices: (data.purchase_transactions || []).length,
      salesInvoices: (data.sales_transactions || []).length,
      vouchers: 0, inventoryMovements: (data.inventory_movements || []).length,
      costCenters: (data.cost_centers || []).length,
      currencies: (data.exchange_rates || []).length,
      warehouses: (data.warehouses || []).length,
    },
    // Pass through data — it's already in TexaCore format
    chartOfAccounts: (data.chart_of_accounts || []).map(a => ({
      code: a.account_code || '', parentCode: '', name: a.name_en || a.name_ar || '',
      nameAr: a.name_ar || '', isGroup: a.is_group || false,
      classification: a.classification || 'assets', accountType: a.account_type || 'ASSET',
      normalBalance: a.normal_balance || 'debit',
      openingDebit: a.opening_debit || 0, openingCredit: a.opening_credit || 0,
      flags: { isCashAccount: a.is_cash_account || false, isBankAccount: a.is_bank_account || false, isReceivable: a.is_receivable || false, isPayable: a.is_payable || false },
    })),
    accountTypes: [], costCenters: [], currencies: [],
    companySettings: { vatEnabled: settings.vat_enabled || false, vatRate: settings.vat_rate || 0, baseCurrencyCode: settings.base_currency || 'UAH' },
    fiscalYear: null, warehouses: [],
    customers: (data.customers || []).map(c => ({
      code: c.customer_code || c.id || '', name: c.name_en || c.name_ar || '',
      nameAr: c.name_ar || '', openingBalance: c.opening_balance || 0, creditLimit: c.credit_limit || 0,
      phone: c.phone, email: c.email, address: c.address,
    })),
    suppliers: (data.suppliers || []).map(s => ({
      code: s.supplier_code || s.id || '', name: s.name_en || s.name_ar || '',
      nameAr: s.name_ar || '', openingBalance: s.opening_balance || 0,
      phone: s.phone, email: s.email, address: s.address,
    })),
    materials: (data.fabric_materials || data.products || []).map(m => ({
      code: m.material_code || m.product_code || m.id || '', name: m.name_en || m.name_ar || '',
      nameAr: m.name_ar || '', unit: m.unit || 'قطعة', isGroup: false,
      buyPrice: m.buy_price || 0, sellPrice: m.sell_price || 0,
      openingBalance: m.opening_balance || 0, warehouseBalances: {},
    })),
    priceLists: [],
    journalEntries: (data.journal_entries || []).map(je => ({
      sourceNumber: je.entry_number || je.id, date: je.entry_date || je.created_at?.split('T')[0] || '',
      description: je.description || '', totalDebit: je.total_debit || 0, totalCredit: je.total_credit || 0,
      isPosted: je.is_posted ?? true, type: 0,
      lines: (data.journal_entry_lines || []).filter((l: any) => l.journal_entry_id === je.id).map((l: any, i: number) => ({
        lineNumber: i + 1, accountCode: l.account_code || '', debit: l.debit || 0, credit: l.credit || 0,
        description: l.description || '',
      })),
    })),
    purchaseInvoices: [], salesInvoices: [], vouchers: [], inventoryMovements: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// Exported Converter
// ═══════════════════════════════════════════════════════════════

export const tcdbConverter: ImportConverter = {
  source: 'tcdb' as ImportSource,
  fileExtensions: ['.tcdb'],

  async validateFile(buffer: ArrayBuffer) {
    try {
      const bytes = new Uint8Array(buffer, 0, 4);
      for (let i = 0; i < 4; i++) {
        if (bytes[i] !== TCDB_MAGIC[i]) return { valid: false, error: 'ليس ملف TexaCore (.tcdb)' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'تعذر قراءة الملف' };
    }
  },

  async parse(buffer: ArrayBuffer, options?: Record<string, any>, onProgress?: (p: ImportProgress) => void): Promise<UnifiedImportData> {
    const fileName = options?.fileName || 'backup.tcdb';
    const password = options?.password;
    if (!password) throw new Error('كلمة المرور مطلوبة لفتح ملف TCDB');

    const emit = (label: string, phase: any, pct: number) => {
      onProgress?.({ phase, label, current: pct, total: 100, overallPercent: pct });
    };

    emit('قراءة الملف...', 'reading', 10);
    const header = parseTcdbHeader(buffer);

    emit('فك التشفير...', 'parsing', 30);
    let compressed: Uint8Array;
    try {
      compressed = await decryptPayload(password, header);
    } catch {
      throw new Error('كلمة المرور غير صحيحة أو الملف تالف');
    }

    emit('فك الضغط...', 'parsing', 60);
    const decompressed = pako.ungzip(compressed);
    const text = new TextDecoder('utf-8').decode(decompressed);

    emit('تحليل البيانات...', 'parsing', 80);
    let data: Record<string, any[]>;

    if (header.version >= 3) {
      // Version 3: JSON payload
      data = JSON.parse(text);
    } else {
      // Version 2: SQL dump — parse INSERT statements
      data = parseSqlToJson(text);
    }

    emit('تحويل البيانات...', 'parsing', 90);
    const result = tcdbJsonToUnified(data, fileName, buffer.byteLength);

    emit('اكتمل', 'done', 100);
    return result;
  },
};

/** Get TCDB file info without decrypting */
export function getTcdbFileInfo(buffer: ArrayBuffer) {
  try {
    const header = parseTcdbHeader(buffer);
    return {
      version: header.version,
      timestamp: new Date(header.timestamp),
      originalSize: header.originalSize,
      compressedSize: header.compressedSize,
      fileSize: buffer.byteLength,
      compressionRatio: ((1 - header.compressedSize / header.originalSize) * 100).toFixed(1) + '%',
    };
  } catch { return null; }
}

export default tcdbConverter;
