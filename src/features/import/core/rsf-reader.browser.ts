/**
 * ════════════════════════════════════════════════════════════════
 * 📋 RSF Browser Reader — قارئ ملفات الرشيد في المتصفح
 * ════════════════════════════════════════════════════════════════
 * Browser-compatible port of texacore-installer/src/rsf-reader.js
 * Uses mdb-reader (works with ArrayBuffer — no Node.js fs needed)
 * @module features/import/core
 */

import type MDBReader from 'mdb-reader';

// ═══════════════════════════════════════════════════════════════
// Windows-1256 (Arabic) decode table
// ═══════════════════════════════════════════════════════════════

const cp1252 = [
  0x20AC,0x0081,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0160,0x2039,0x0152,0x008D,0x017D,0x008F,
  0x0090,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0x0161,0x203A,0x0153,0x009D,0x017E,0x0178,
  0x00A0,0x00A1,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF,
  0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00BA,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF,
  0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF,
  0x00D0,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,0x00DF,
  0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF,
  0x00F0,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,0x00FE,0x00FF,
];

const cp1256 = [
  0x20AC,0x067E,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0679,0x2039,0x0152,0x0686,0x0698,0x0688,
  0x06AF,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x06A9,0x2122,0x06A9,0x203A,0x0153,0x200C,0x200D,0x06BA,
  0x00A0,0x060C,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x06BE,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF,
  0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x061B,0x00BB,0x00BC,0x00BD,0x00BE,0x061F,
  0x06C1,0x0621,0x0622,0x0623,0x0624,0x0625,0x0626,0x0627,0x0628,0x0629,0x062A,0x062B,0x062C,0x062D,0x062E,0x062F,
  0x0630,0x0631,0x0632,0x0633,0x0634,0x0635,0x0636,0x00D7,0x0637,0x0638,0x0639,0x063A,0x0640,0x0641,0x0642,0x0643,
  0x00E0,0x0644,0x00E2,0x0645,0x0646,0x0647,0x0648,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x0649,0x064A,0x00EE,0x00EF,
  0x064B,0x064C,0x064D,0x064E,0x00F4,0x064F,0x0650,0x00F7,0x0651,0x00F9,0x0652,0x00FB,0x00FC,0x200E,0x200F,0x06D2,
];

const _remapTable: Record<number, number> = {};
for (let i = 0; i < 128; i++) {
  if (cp1252[i] !== cp1256[i]) _remapTable[cp1252[i]] = cp1256[i];
}

function fixArabic(str: string): string {
  if (!str) return str;
  let result = '';
  let hasHigh = false;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x80 && _remapTable[code] !== undefined) {
      result += String.fromCharCode(_remapTable[code]);
      hasHigh = true;
    } else {
      result += str[i];
    }
  }
  return hasHigh ? result : str;
}

function fixRow(row: Record<string, any>): Record<string, any> {
  const fixed: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    fixed[key] = typeof val === 'string' ? fixArabic(val) : val;
  }
  return fixed;
}

// ═══════════════════════════════════════════════════════════════
// Main Reader Class
// ═══════════════════════════════════════════════════════════════

export interface RsfRawData {
  companyInfo: any;
  settings: Record<string, any>;
  accounts: any[];
  customers: any[];
  suppliers: any[];
  costCenters: any[];
  currencies: any[];
  materials: any[];
  journalHeaders: any[];
  journalLines: any[];
  salesInvoices: any[];
  purchaseInvoices: any[];
  receipts: any[];
  inventoryMoves: any[];
  warehouseNames: Record<number, string>;
  users: any[];
}

export class RsfBrowserReader {
  private db: MDBReader | null = null;
  private tableNames: string[] = [];
  private cache: Record<string, any[]> = {};
  private settingsParsed: Record<string, any> | null = null;
  public fileName: string;

  constructor(public readonly fileBuffer: ArrayBuffer, fileName: string) {
    this.fileName = fileName.replace(/\.rsf$/i, '');
  }

  /** Validate that buffer is a valid RSF/MDB file */
  static validate(buffer: ArrayBuffer): { valid: boolean; error?: string } {
    try {
      const bytes = new Uint8Array(buffer, 0, Math.min(20, buffer.byteLength));
      const header = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      if (!header.includes('Standard Jet')) {
        return { valid: false, error: 'الملف ليس ملف رشيد (.rsf) صالح' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'تعذر قراءة الملف' };
    }
  }

  open(): this {
    if (this.db) return this;
    // Dynamic import handled in openAsync
    throw new Error('Use openAsync() instead');
  }

  async openAsync(): Promise<this> {
    if (this.db) return this;
    const { default: MDBReaderClass } = await import('mdb-reader');
    const buffer = Buffer.from(this.fileBuffer);
    this.db = new MDBReaderClass(buffer) as MDBReader;
    this.tableNames = this.db.getTableNames();
    return this;
  }

  private readTable(name: string): any[] {
    if (this.cache[name]) return this.cache[name];
    try {
      if (!this.tableNames.includes(name)) return [];
      const table = this.db!.getTable(name);
      const data = table.getData().map((row: any) => fixRow(row));
      this.cache[name] = data;
      return data;
    } catch {
      return [];
    }
  }

  // ─── Settings ──────────────────────────────────────────
  getSettings(): Record<string, any> {
    if (this.settingsParsed) return this.settingsParsed;
    const rows = this.readTable('Set');
    const s: Record<string, any> = {};
    for (const row of rows) {
      const key = row.SetItem || row.SettingName || row.Name || Object.values(row)[0];
      const value = row.SetKey || row.SettingValue || row.Value || Object.values(row)[1];
      if (key) s[String(key).trim()] = value;
    }
    this.settingsParsed = s;
    return s;
  }

  getWarehouseNames(): Record<number, string> {
    const settings = this.getSettings();
    const names: Record<number, string> = {};
    for (const [key, val] of Object.entries(settings)) {
      const m = key.match(/^StockName_?(\d+)$/i);
      if (m && val && String(val).trim()) {
        names[parseInt(m[1]) + 1] = String(val).trim();
      }
    }
    if (Object.keys(names).length === 0) {
      for (const [key, val] of Object.entries(settings)) {
        const m = key.match(/^(?:Stock|Store|Makhzan)_?(\d+)$/i);
        if (m && val && String(val).trim()) {
          names[parseInt(m[1])] = String(val).trim();
        }
      }
    }
    return names;
  }

  // ─── Company Info ──────────────────────────────────────
  getCompanyInfo() {
    const s = this.getSettings();
    const currencies = this.getCurrencies();
    const companyName = s['Company'] || s['CompanyName'] || s['CompName'] || this.fileName;
    const baseCurrency = currencies.find(c => c.num === 1);
    const mainCurrency = currencies.find(c => c.num === 2);
    return {
      name: companyName,
      nameAr: s['AHeader1'] || s['CompanyNameAr'] || companyName,
      accLevels: [parseInt(s['AccLvl_0'] || '2'), parseInt(s['AccLvl_1'] || '1'), parseInt(s['AccLvl_2'] || '3')],
      baseCurrencyName: baseCurrency?.name || 'العملة المحلية',
      mainCurrencyName: mainCurrency?.name || 'USD',
      mainCurrencyRate: mainCurrency?.rate || 1,
    };
  }

  // ─── Accounts ──────────────────────────────────────────
  getAccounts() {
    return this.readTable('Accounts').map(row => ({
      code: String(row.Num || '').trim(),
      ref: String(row.Ref || '').trim(),
      name: String(row.NAME || row.Name || '').trim(),
      nameAr: String(row.Name2 || row.NAME || '').trim(),
      credit: parseFloat(row.Credit) || 0,
      debit: parseFloat(row.Debt || row.Debit) || 0,
      isSub: row.IS_SUB === 1 || row.IS_SUB === true,
      currencyNum: parseInt(row.Currency) || 0,
      mianCredit: parseFloat(row.MianCredit) || 0,
      mianDebt: parseFloat(row.MianDebt) || 0,
    }));
  }

  // ─── Customers ─────────────────────────────────────────
  getCustomers() {
    return this.readTable('Custmers').map(row => ({
      code: String(row.Num || row.Code || '').trim(),
      name: String(row.Name || row.NAME || '').trim(),
      nameAr: String(row.Name2 || row.Name || '').trim(),
      phone: String(row.Phone || row.Tel || '').trim(),
      mobile: String(row.Mobile || row.Mob || '').trim(),
      email: String(row.Email || '').trim(),
      address: String(row.Address || row.Addr || '').trim(),
      city: String(row.City || '').trim(),
      country: String(row.Country || '').trim(),
      taxNumber: String(row.TaxNum || '').trim(),
      accountCode: String(row.AccNum || row.AccNbr || '').trim(),
      creditLimit: parseFloat(row.CreditLimit || row.Limit) || 0,
      notes: String(row.Notes || row.Note || '').trim(),
      balance: parseFloat(row.Balance || row.Bal) || 0,
    }));
  }

  // ─── Suppliers ─────────────────────────────────────────
  getSuppliers() {
    return this.readTable('Suplyers').map(row => ({
      code: String(row.Num || row.Code || '').trim(),
      name: String(row.Name || row.NAME || '').trim(),
      nameAr: String(row.Name2 || row.Name || '').trim(),
      phone: String(row.Phone || row.Tel || '').trim(),
      mobile: String(row.Mobile || row.Mob || '').trim(),
      email: String(row.Email || '').trim(),
      address: String(row.Address || row.Addr || '').trim(),
      city: String(row.City || '').trim(),
      country: String(row.Country || '').trim(),
      taxNumber: String(row.TaxNum || '').trim(),
      accountCode: String(row.AccNum || row.AccNbr || '').trim(),
      notes: String(row.Notes || row.Note || '').trim(),
      balance: parseFloat(row.Balance || row.Bal) || 0,
    }));
  }

  // ─── Currencies ────────────────────────────────────────
  getCurrencies() {
    return this.readTable('Currency').map(row => ({
      num: parseInt(row.Num || row.Code) || 0,
      name: String(row.Name || row.NAME || '').trim(),
      nameAr: String(row.Name2 || row.Name || '').trim(),
      rate: parseFloat(row.Price || row.Rate || row.ExRate) || 1,
      symbol: String(row.Symbol || row.Sym || '').trim(),
    }));
  }

  // ─── Cost Centers ──────────────────────────────────────
  getCostCenters() {
    return this.readTable('CostCenters').map(row => ({
      code: String(row.Num || row.Code || '').trim(),
      name: String(row.Name || row.NAME || '').trim(),
      nameAr: String(row.Name2 || row.Name || '').trim(),
      type: parseInt(row.Type) || 0,
      ref: String(row.Ref || '').trim(),
    }));
  }

  // ─── Materials ─────────────────────────────────────────
  getMaterials() {
    return this.readTable('MAT').map(row => {
      const warehouseBalances: Record<number, number> = {};
      for (const [key, val] of Object.entries(row)) {
        let m = key.match(/^Bal_(\d+)$/i);
        if (m) { const q = parseFloat(val as string) || 0; if (q !== 0) warehouseBalances[parseInt(m[1]) + 1] = q; continue; }
        m = key.match(/^Balance_?(\d+)$/i);
        if (m) { const q = parseFloat(val as string) || 0; if (q !== 0) warehouseBalances[parseInt(m[1])] = q; }
      }
      return {
        code: String(row.Num || row.Code || '').trim(),
        name: String(row.Name || row.NAME || '').trim(),
        nameAr: String(row.Name2 || row.Name || '').trim(),
        unit: String(row.Unit || '').trim(),
        buyPrice: parseFloat(row.BayPrice || row.BuyPrice) || 0,
        sellPrice: parseFloat(row.LastPrice || row.SellPrice) || 0,
        wholesalePrice: parseFloat(row.AllPrice) || 0,
        halfWholesalePrice: parseFloat(row.HalfPrice) || 0,
        specialPrice: parseFloat(row.PrivatPrice) || 0,
        minPrice: parseFloat(row.MinPrice) || 0,
        balance: parseFloat(row.Balance || row.Bal) || 0,
        isSub: row.IsSub === 1 || row.IsSub === true,
        ref: String(row.Ref || '').trim(),
        barcode: String(row.Barcode || '').trim(),
        notes: String(row.Notes || '').trim(),
        warehouseBalances,
      };
    });
  }

  // ─── Journal Entries ───────────────────────────────────
  getJournalHeaders() {
    return this.readTable('GENDAY').map(row => ({
      nrs: parseInt(row.NRS || row.Nrs || row.Num) || 0,
      date: row.Date || row.DATE || null,
      type: parseInt(row.Type) || 0,
      notes: String(row.Notes || row.Note || row.Document || '').trim(),
      totalDebit: parseFloat(row.TotalDebt || row.TotalDebit) || 0,
      totalCredit: parseFloat(row.TotalCredit) || 0,
      userId: parseInt(row.UserID || row.UserId) || 0,
      isPosted: true,
    }));
  }

  getJournalLines() {
    return this.readTable('MoveDiffar').map(row => ({
      nrs: parseInt(row.Num || row.NBRREC || row.NRS) || 0,
      lineOrder: parseInt(row.Order || row.LineNum) || 0,
      accountCode: String(row.Accnbr || row.AccNum || '').trim(),
      debit: parseFloat(row.Total) || 0,
      credit: parseFloat(row.Total1) || 0,
      description: String(row.Document || row.Desc || '').trim(),
      date: row.Date || null,
      costCenterCode: String(row.CostCenter || '').trim(),
      currencyNum: parseInt(row.Currency) || 0,
      localAmount: parseFloat(row.LocalTot) || 0,
      foreignAmount: parseFloat(row.MianTot) || 0,
    }));
  }

  // ─── Sales Invoices ────────────────────────────────────
  getSalesInvoices() {
    const headers = this.readTable('SaleBill');
    const lines = this.readTable('MoveSaleBill');
    if (headers.length > 0) {
      const linesByBill: Record<number, any[]> = {};
      for (const l of lines) { const k = l.BillNum || l.Num || 0; if (!linesByBill[k]) linesByBill[k] = []; linesByBill[k].push(l); }
      return headers.map(h => ({
        number: h.Num || h.BillNum, date: h.Date,
        customerCode: String(h.CustNum || h.CustomerNum || '').trim(),
        total: parseFloat(h.Total) || 0, discount: parseFloat(h.Discount) || 0,
        tax: parseFloat(h.Tax) || 0, netTotal: parseFloat(h.NetTotal || h.Total) || 0,
        notes: String(h.Notes || '').trim(), lines: linesByBill[h.Num || h.BillNum] || [],
      }));
    }
    if (lines.length > 0) {
      const moves = this.readTable('MOVE').filter(m => m.SWAY === 'O' || m.SWay === 'O');
      const byInv: Record<number, any[]> = {};
      for (const m of moves) { const k = m.SERNRO || m.Claim || 0; if (!byInv[k]) byInv[k] = []; byInv[k].push(m); }
      return lines.map(h => ({
        number: h.Num || 0, date: h.Date,
        customerCode: String(h.Debt || h.Credit || '').trim(),
        total: parseFloat(h.Total) || 0, discount: 0, tax: parseFloat(h.Tax) || 0,
        netTotal: parseFloat(h.Total) || 0, notes: String(h.Notes || h.Document || '').trim(),
        lines: byInv[h.Num || 0] || [],
      }));
    }
    return [];
  }

  // ─── Purchase Invoices ─────────────────────────────────
  getPurchaseInvoices() {
    const headers = this.readTable('BayBill');
    const lines = this.readTable('MoveBayBill');
    if (headers.length > 0) {
      const linesByBill: Record<number, any[]> = {};
      for (const l of lines) { const k = l.BillNum || l.Num || 0; if (!linesByBill[k]) linesByBill[k] = []; linesByBill[k].push(l); }
      return headers.map(h => ({
        number: h.Num || h.BillNum, date: h.Date,
        supplierCode: String(h.SupNum || h.SupplierNum || '').trim(),
        total: parseFloat(h.Total) || 0, discount: parseFloat(h.Discount) || 0,
        tax: parseFloat(h.Tax) || 0, netTotal: parseFloat(h.NetTotal || h.Total) || 0,
        notes: String(h.Notes || '').trim(), lines: linesByBill[h.Num || h.BillNum] || [],
      }));
    }
    if (lines.length > 0) {
      const moves = this.readTable('MOVE').filter(m => m.SWAY === 'I' || m.SWay === 'I');
      const byInv: Record<number, any[]> = {};
      for (const m of moves) { const k = m.SERNRI || m.Claim || 0; if (!byInv[k]) byInv[k] = []; byInv[k].push(m); }
      return lines.map(h => ({
        number: h.Num || 0, date: h.Date,
        supplierCode: String(h.Credit || h.Claim || '').trim(),
        total: parseFloat(h.Total) || 0, discount: 0, tax: parseFloat(h.Tax) || 0,
        netTotal: parseFloat(h.Total) || 0, notes: String(h.Notes || h.Document || '').trim(),
        lines: byInv[h.Num || 0] || [],
      }));
    }
    return [];
  }

  // ─── Receipts (سندات قبض/دفع) ─────────────────────────
  getReceipts() {
    const headers = this.readTable('TakeMony');
    const lines = this.readTable('MoveTakemony');
    if (headers.length === 0) return [];
    const byReceipt: Record<number, any[]> = {};
    for (const l of lines) { const k = l.Num || l.TakeNum || 0; if (!byReceipt[k]) byReceipt[k] = []; byReceipt[k].push(l); }
    return headers.map(h => ({
      number: h.Num, date: h.Date, type: h.Type,
      amount: parseFloat(h.Total) || 0,
      accountCode: String(h.AccNum || '').trim(),
      notes: String(h.Notes || '').trim(),
      lines: byReceipt[h.Num] || [],
    }));
  }

  // ─── Inventory Moves ───────────────────────────────────
  getInventoryMoves() {
    return this.readTable('MOVE');
  }

  // ─── Users ─────────────────────────────────────────────
  getUsers() {
    return this.readTable('Password').map(row => ({
      name: String(row.Name || row.UserName || '').trim(),
      level: parseInt(row.Level || row.UserLevel) || 0,
    }));
  }

  // ─── Summary ───────────────────────────────────────────
  getSummary() {
    const accounts = this.getAccounts();
    const customers = this.getCustomers();
    const suppliers = this.getSuppliers();
    const jHeaders = this.getJournalHeaders();
    const materials = this.getMaterials();
    const sales = this.getSalesInvoices();
    const purchases = this.getPurchaseInvoices();
    const receipts = this.getReceipts();
    const costCenters = this.getCostCenters();
    const currencies = this.getCurrencies();
    return {
      company: this.getCompanyInfo(),
      counts: {
        accounts: accounts.length, customers: customers.length,
        suppliers: suppliers.length, journalEntries: jHeaders.length,
        materials: materials.length, salesInvoices: sales.length,
        purchaseInvoices: purchases.length, receipts: receipts.length,
        costCenters: costCenters.length, currencies: currencies.length,
      },
    };
  }

  /** Read all data into a flat structure */
  readAll(): RsfRawData {
    return {
      companyInfo: this.getCompanyInfo(),
      settings: this.getSettings(),
      accounts: this.getAccounts(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      costCenters: this.getCostCenters(),
      currencies: this.getCurrencies(),
      materials: this.getMaterials(),
      journalHeaders: this.getJournalHeaders(),
      journalLines: this.getJournalLines(),
      salesInvoices: this.getSalesInvoices(),
      purchaseInvoices: this.getPurchaseInvoices(),
      receipts: this.getReceipts(),
      inventoryMoves: this.getInventoryMoves(),
      warehouseNames: this.getWarehouseNames(),
      users: this.getUsers(),
    };
  }

  close() {
    this.db = null;
    this.cache = {};
    this.settingsParsed = null;
  }
}
