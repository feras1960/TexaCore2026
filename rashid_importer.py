#!/usr/bin/env python3
"""
استيراد بيانات الرشيد الشامل — Universal RSF Importer V2
يتوافق مع Schema الفعلي لـ TexaCore (name_ar, account_type_id, code...)
Usage: python3 rashid_importer.py <rsf_file> <company_id> <tenant_id> > output.sql
"""
import csv, sys, os, subprocess
from collections import defaultdict

CURRENCY_MAP = {'0': 'UAH', '1': 'UAH', '2': 'USD', '3': 'EUR'}
TABLES_TO_EXTRACT = [
    'Accounts', 'Custmers', 'Suplyers', 'MAT', 'CostCenters',
    'TEATCHER', 'GENDAY', 'MoveBayBill', 'MOVE', 'MoveTakemony',
    'Claim', 'Manufd', 'Currency', 'EndBal', 'MoveSaleBill'
]

# Account type mapping: Rashid code prefix → TexaCore account_type code
ACC_TYPE_MAP = {
    '1': 'CURRENT_ASSET',   # 1xx = أصول متداولة
    '2': 'CURRENT_LIABILITY', # 2xx = التزامات متداولة  
    '3': 'EQUITY',          # 3xx = حقوق ملكية (عمال/مصروفات عامة)
    '4': 'REVENUE',         # 4xx = إيرادات
    '5': 'EXPENSE',         # 5xx = مصروفات
}

def esc(s):
    if not s: return ''
    return str(s).replace("'", "''").strip().strip('"')

def parse_date(d):
    if not d: return '2021-01-01'
    try:
        d = d.strip().split(' ')[0]
        p = d.split('/')
        m, d2, y = int(p[0]), int(p[1]), int(p[2])
        if y < 100: y += 2000
        return f'{y:04d}-{m:02d}-{d2:02d}'
    except: return '2021-01-01'

def extract_csvs(rsf_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    available = subprocess.check_output(['mdb-tables', rsf_path]).decode().split()
    for tbl in TABLES_TO_EXTRACT:
        if tbl in available:
            outpath = os.path.join(output_dir, f'{tbl}.csv')
            with open(outpath, 'w') as f:
                subprocess.run(['mdb-export', rsf_path, tbl], stdout=f, stderr=subprocess.DEVNULL)
            lines = sum(1 for _ in open(outpath)) - 1
            print(f"  ✓ {tbl}: {lines} rows", file=sys.stderr)
        else:
            print(f"  ✗ {tbl}: not found", file=sys.stderr)

class RashidImporter:
    def __init__(self, data_dir, company_id, tenant_id, code_prefix=''):
        self.data_dir = data_dir
        self.CID = company_id
        self.TID = tenant_id
        self.code_prefix = code_prefix  # Prefix for codes to avoid tenant-wide duplicates
        self.out = []
    
    def p(self, sql): self.out.append(sql)
    
    def read_csv(self, name):
        path = os.path.join(self.data_dir, name)
        if not os.path.exists(path): return []
        with open(path, 'r', encoding='utf-8') as f:
            return list(csv.DictReader(f))
    
    def acc_type_sql(self, code):
        """Get account_type_id SQL for a Rashid account code"""
        c = code[0] if code else '1'
        at_code = ACC_TYPE_MAP.get(c, 'CURRENT_ASSET')
        return f"(SELECT id FROM account_types WHERE code='{at_code}' LIMIT 1)"
    
    def run(self):
        self.p(f"-- ═══ Rashid Universal Import V2 ═══")
        self.p(f"-- Company: {self.CID}")
        self.p(f"-- Tenant:  {self.TID}")
        self.p("BEGIN;")
        self.p("")
        self.p("-- Disable triggers for bulk import")
        self.p("ALTER TABLE chart_of_accounts DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE customers DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE suppliers DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE products DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE journal_entries DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE journal_entry_lines DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE purchase_invoices DISABLE TRIGGER ALL;")
        self.p("ALTER TABLE purchase_invoice_items DISABLE TRIGGER ALL;")
        self.p("")
        
        self.import_accounts()
        self.import_customers()
        self.import_suppliers()
        self.import_products()
        self.import_cost_centers()
        self.import_journal_entries()
        self.import_purchase_invoices()
        
        self.p("")
        self.p("-- Re-enable triggers")
        self.p("ALTER TABLE chart_of_accounts ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE customers ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE suppliers ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE products ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE journal_entries ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE journal_entry_lines ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE purchase_invoices ENABLE TRIGGER ALL;")
        self.p("ALTER TABLE purchase_invoice_items ENABLE TRIGGER ALL;")
        self.p("")
        self.p("COMMIT;")
        self.p("-- ═══ Done ═══")
        return '\n'.join(self.out)
    
    # ── 1. شجرة الحسابات ──
    # Schema: id, tenant_id, company_id, account_code, name_ar, account_type_id(UUID), parent_id, is_group, is_detail, level
    def import_accounts(self):
        self.p("-- ═══ 1. شجرة الحسابات ═══")
        rows = self.read_csv('Accounts.csv')
        if not rows: return
        
        codes = set()
        for r in rows:
            code = r.get('Num', '').strip().strip('"')
            if code: codes.add(code)
        
        def is_group(code):
            return any(c != code and c.startswith(code) for c in codes)
        
        def find_parent(code):
            for ln in range(len(code)-1, 0, -1):
                if code[:ln] in codes: return code[:ln]
            return None
        
        cnt = 0
        for r in rows:
            code = esc(r.get('Num', ''))
            name = esc(r.get('NAME', ''))
            if not code or not name: continue
            grp = is_group(code)
            lvl = len(code) // 2 if len(code) >= 2 else 1  # Approximate level from code length
            at_sql = self.acc_type_sql(code)
            
            self.p(f"INSERT INTO chart_of_accounts (id, company_id, tenant_id, account_code, name_ar, account_type_id, is_group, is_detail, level, created_at) VALUES (gen_random_uuid(), '{self.CID}', '{self.TID}', '{code}', '{name}', {at_sql}, {'true' if grp else 'false'}, {'false' if grp else 'true'}, {lvl}, NOW());")
            cnt += 1
        
        self.p("-- Set parents")
        for r in rows:
            code = esc(r.get('Num', ''))
            if not code: continue
            parent = find_parent(code)
            if parent:
                self.p(f"UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code='{parent}' AND company_id='{self.CID}' LIMIT 1) WHERE account_code='{code}' AND company_id='{self.CID}';")
        self.p(f"-- → {cnt} accounts")
        self.p("")
    
    # ── 2. العملاء ──
    # Schema: id, tenant_id, company_id, code(required), name_ar(required), phone, receivable_account_id
    def import_customers(self):
        self.p("-- ═══ 2. العملاء ═══")
        rows = self.read_csv('Custmers.csv')
        cnt = 0
        for r in rows:
            name = esc(r.get('NAME', ''))
            acc = esc(r.get('Num', ''))
            phone = esc(r.get('PHONE', ''))
            address = esc(r.get('ADDRESS', ''))
            if not name or not acc: continue
            pfx_acc = f'{self.code_prefix}{acc}'
            self.p(f"INSERT INTO customers (id, company_id, tenant_id, code, name_ar, phone, address, receivable_account_id, status, created_at) VALUES (gen_random_uuid(), '{self.CID}', '{self.TID}', '{pfx_acc}', '{name}', '{phone}', '{address}', (SELECT id FROM chart_of_accounts WHERE account_code='{acc}' AND company_id='{self.CID}' LIMIT 1), 'active', NOW());")
            cnt += 1
        self.p(f"-- → {cnt} customers")
        self.p("")
    
    # ── 3. الموردون ──
    # Schema: id, tenant_id, company_id, code(required), name_ar(required), phone, payable_account_id
    def import_suppliers(self):
        self.p("-- ═══ 3. الموردون ═══")
        rows = self.read_csv('Suplyers.csv')
        cnt = 0
        for r in rows:
            name = esc(r.get('NAME', ''))
            acc = esc(r.get('Num', ''))
            phone = esc(r.get('PHONE', ''))
            address = esc(r.get('ADDRESS', ''))
            if not name or not acc: continue
            pfx_acc = f'{self.code_prefix}{acc}'
            self.p(f"INSERT INTO suppliers (id, company_id, tenant_id, code, name_ar, phone, address, payable_account_id, status, created_at) VALUES (gen_random_uuid(), '{self.CID}', '{self.TID}', '{pfx_acc}', '{name}', '{phone}', '{address}', (SELECT id FROM chart_of_accounts WHERE account_code='{acc}' AND company_id='{self.CID}' LIMIT 1), 'active', NOW());")
            cnt += 1
        self.p(f"-- → {cnt} suppliers")
        self.p("")
    
    # ── 4. منتجات ──
    def import_products(self):
        self.p("-- ═══ 4. منتجات ═══")
        # Ensure unit exists
        self.p(f"INSERT INTO units_of_measure (id, tenant_id, code, name_ar, name_en, symbol, is_base_unit) SELECT gen_random_uuid(), '{self.TID}', 'SQM', 'متر مربع', 'Square Meter', 'm²', true WHERE NOT EXISTS (SELECT 1 FROM units_of_measure WHERE name_ar='متر مربع' AND tenant_id='{self.TID}');")
        self.p(f"INSERT INTO units_of_measure (id, tenant_id, code, name_ar, name_en, symbol, is_base_unit) SELECT gen_random_uuid(), '{self.TID}', 'KG', 'كيلو', 'Kilogram', 'kg', true WHERE NOT EXISTS (SELECT 1 FROM units_of_measure WHERE name_ar='كيلو' AND tenant_id='{self.TID}');")
        self.p(f"INSERT INTO units_of_measure (id, tenant_id, code, name_ar, name_en, symbol, is_base_unit) SELECT gen_random_uuid(), '{self.TID}', 'PCS', 'قطعة', 'Piece', 'pcs', true WHERE NOT EXISTS (SELECT 1 FROM units_of_measure WHERE name_ar='قطعة' AND tenant_id='{self.TID}');")
        
        rows = self.read_csv('MAT.csv')
        cnt = 0
        for r in rows:
            sku = esc(r.get('Num', ''))
            name = esc(r.get('Name', ''))
            unit = r.get('Unit', '').strip().strip('"')
            buy = float(r.get('MinPrice', 0) or 0)
            sell = float(r.get('BayPrice', 0) or 0)
            if not sku or not name: continue
            
            unit_name = 'متر مربع' if 'متر' in unit else ('كيلو' if 'كيلو' in unit or 'كغ' in unit else 'قطعة')
            is_grp = len(sku) <= 3
            ptype = 'service' if is_grp else 'stockable'
            
            self.p(f"INSERT INTO products (id, tenant_id, company_id, sku, name_ar, product_type, base_unit_id, default_cost, default_price, created_at) VALUES (gen_random_uuid(), '{self.TID}', '{self.CID}', '{sku}', '{name}', '{ptype}', (SELECT id FROM units_of_measure WHERE name_ar='{unit_name}' AND tenant_id='{self.TID}' LIMIT 1), {buy}, {sell}, NOW());")
            cnt += 1
        self.p(f"-- → {cnt} products")
        self.p("")
    
    # ── 5. مراكز التكلفة ──
    def import_cost_centers(self):
        self.p("-- ═══ 5. مراكز التكلفة ═══")
        rows = self.read_csv('CostCenters.csv')
        if not rows:
            self.p("-- No cost centers found")
            self.p("")
            return
        
        codes = set()
        for r in rows:
            codes.add(r['Num'].strip().strip('"'))
        
        cnt = 0
        for r in rows:
            code = esc(r['Num'])
            name = esc(r.get('Name', ''))
            is_grp = r.get('Type', '0').strip() == '0'
            if not code: continue
            self.p(f"INSERT INTO cost_centers (id, tenant_id, company_id, code, name_ar, is_group, is_active, created_at) VALUES (gen_random_uuid(), '{self.TID}', '{self.CID}', '{self.code_prefix}{code}', '{name}', {'true' if is_grp else 'false'}, true, NOW()) ON CONFLICT (tenant_id, company_id, code) DO NOTHING;")
            cnt += 1
        
        for r in rows:
            code = esc(r['Num'])
            if not code or len(code) <= 2: continue
            parent = code[:2]
            if parent in codes:
                self.p(f"UPDATE cost_centers SET parent_id = (SELECT id FROM cost_centers WHERE code='{parent}' AND company_id='{self.CID}' LIMIT 1) WHERE code='{code}' AND company_id='{self.CID}';")
        self.p(f"-- → {cnt} cost centers")
        self.p("")
    
    # ── 6. القيود المحاسبية ──
    def import_journal_entries(self):
        self.p("-- ═══ 6. القيود المحاسبية ═══")
        
        genday = {}
        for r in self.read_csv('GENDAY.csv'):
            try:
                nrs = int(r.get('NRS', 0) or 0)
                genday[nrs] = parse_date(r.get('Date', ''))
            except: pass
        
        entries = defaultdict(list)
        for r in self.read_csv('TEATCHER.csv'):
            try: nbrrec = int(r.get('Nbrrec', 0) or 0)
            except: continue
            if nbrrec == 0: continue
            
            acc = esc(r.get('Acc_nr', ''))
            way = int(r.get('Way', 1) or 1)
            summ = float(r.get('Summ', 0) or 0)
            ltot = float(r.get('LocalTot', 0) or 0)
            mtot = float(r.get('MianTot', 0) or 0)
            cur = r.get('Currency', '1') or '1'
            doc = esc(r.get('Docum', ''))
            date = parse_date(r.get('Date', ''))
            how = r.get('How', '1').strip().strip('"')
            cc = r.get('CostCenter', '').strip().strip('"')
            
            cur_code = CURRENCY_MAP.get(cur, 'UAH')
            
            if way == 1:
                d_uah, c_uah = (ltot if ltot > 0 else summ), 0.0
            else:
                d_uah, c_uah = 0.0, (ltot if ltot > 0 else summ)
            
            if cur_code != 'UAH':
                d_fc = summ if way == 1 else 0.0
                c_fc = summ if way == 2 else 0.0
                rate = d_uah/d_fc if d_fc > 0 else (c_uah/c_fc if c_fc > 0 else 1.0)
            elif mtot > 0:
                d_fc = mtot if way == 1 else 0.0
                c_fc = mtot if way == 2 else 0.0
                rate = ltot/mtot if mtot > 0 else 1.0
            else:
                d_fc, c_fc, rate = d_uah, c_uah, 1.0
            
            entries[nbrrec].append({
                'acc': acc, 'way': way,
                'd': round(d_uah,2), 'c': round(c_uah,2),
                'df': round(d_fc,2), 'cf': round(c_fc,2),
                'cur': cur_code, 'rate': round(rate,6),
                'desc': doc, 'date': date, 'how': how, 'cc': cc,
            })
        
        te, tl = 0, 0
        for nbrrec in sorted(entries.keys()):
            lines = entries[nbrrec]
            en = f'RSF-{nbrrec}'
            ed = genday.get(nbrrec, lines[0]['date'])
            td = sum(l['d'] for l in lines)
            tc = sum(l['c'] for l in lines)
            descs = [l['desc'] for l in lines if l['desc']]
            desc = esc(descs[0] if descs else f'قيد رشيد {nbrrec}')
            
            how = lines[0]['how']
            etype = {'20':'purchase','80':'receipt'}.get(how, 'imported')
            currs = [l['cur'] for l in lines]
            ecur = max(set(currs), key=currs.count)
            
            self.p(f"INSERT INTO journal_entries (id, company_id, tenant_id, entry_number, entry_date, description, entry_type, status, is_posted, currency, total_debit, total_credit, reference_type, created_at, updated_at) VALUES (gen_random_uuid(), '{self.CID}', '{self.TID}', '{en}', '{ed}', '{desc}', '{etype}', 'posted', true, '{ecur}', {td:.2f}, {tc:.2f}, 'rashid_import', NOW(), NOW());")
            
            for i, line in enumerate(sorted(lines, key=lambda x: x['way']), 1):
                cc_sql = "NULL"
                if line['cc'] and line['cc'] != '0':
                    cc_sql = f"(SELECT id FROM cost_centers WHERE code='{esc(line['cc'])}' AND company_id='{self.CID}' LIMIT 1)"
                
                self.p(f"INSERT INTO journal_entry_lines (id, entry_id, tenant_id, line_number, account_id, debit, credit, debit_fc, credit_fc, currency, exchange_rate, description, cost_center_id, created_at) VALUES (gen_random_uuid(), (SELECT id FROM journal_entries WHERE entry_number='{en}' AND company_id='{self.CID}' LIMIT 1), '{self.TID}', {i}, (SELECT id FROM chart_of_accounts WHERE account_code='{line['acc']}' AND company_id='{self.CID}' LIMIT 1), {line['d']:.2f}, {line['c']:.2f}, {line['df']:.2f}, {line['cf']:.2f}, '{line['cur']}', {line['rate']}, '{line['desc']}', {cc_sql}, NOW());")
                tl += 1
            te += 1
        
        self.p(f"-- → {te} entries, {tl} lines")
        self.p("")
    
    # ── 7. فواتير الشراء ──
    def import_purchase_invoices(self):
        self.p("-- ═══ 7. فواتير الشراء ═══")
        bills = self.read_csv('MoveBayBill.csv')
        moves = self.read_csv('MOVE.csv')
        if not bills: return
        
        # Group moves by SERNRI (bill serial)
        moves_by_bill = defaultdict(list)
        for mv in moves:
            sernri = mv.get('SERNRI', '').strip()
            moves_by_bill[sernri].append(mv)
        
        cnt = 0
        for r in bills:
            num = r.get('Num', '1').strip()
            date = parse_date(r.get('Date', ''))
            total = float(r.get('Total', 0) or 0)
            doc = esc(r.get('Document', ''))
            supp_acc = esc(r.get('Credit', ''))
            
            self.p(f"INSERT INTO purchase_invoices (id, company_id, tenant_id, invoice_number, invoice_date, supplier_id, supplier_name, total_amount, currency, status, notes, created_at) VALUES (gen_random_uuid(), '{self.CID}', '{self.TID}', 'PI-RSF-{num}', '{date}', (SELECT s.id FROM suppliers s WHERE s.code='{supp_acc}' AND s.company_id='{self.CID}' LIMIT 1), (SELECT s.name_ar FROM suppliers s WHERE s.code='{supp_acc}' AND s.company_id='{self.CID}' LIMIT 1), {total}, 'UAH', 'posted', '{doc}', NOW()) ON CONFLICT DO NOTHING;")
            
            bill_moves = moves_by_bill.get(num, [])
            for i, mv in enumerate(bill_moves, 1):
                mc = esc(mv.get('SACC-NR', ''))
                qty = float(mv.get('SQUANT', 0) or 0)
                price = float(mv.get('SPRICE', 0) or 0)
                lt = qty * price
                if qty == 0: continue
                self.p(f"INSERT INTO purchase_invoice_items (id, tenant_id, invoice_id, line_number, product_id, description, quantity, unit_price, subtotal, total, created_at) VALUES (gen_random_uuid(), '{self.TID}', (SELECT id FROM purchase_invoices WHERE invoice_number='PI-RSF-{num}' AND company_id='{self.CID}' LIMIT 1), {i}, (SELECT id FROM products WHERE sku='{mc}' AND company_id='{self.CID}' LIMIT 1), (SELECT name_ar FROM products WHERE sku='{mc}' AND company_id='{self.CID}' LIMIT 1), {qty}, {price}, {lt}, {lt}, NOW());")
            cnt += 1
        self.p(f"-- → {cnt} purchase invoices")
        self.p("")

def main():
    if len(sys.argv) < 4:
        print("Usage: python3 rashid_importer.py <rsf_file> <company_id> <tenant_id>", file=sys.stderr)
        sys.exit(1)
    
    rsf_path = sys.argv[1]
    company_id = sys.argv[2]
    tenant_id = sys.argv[3]
    
    # Optional 4th arg: code prefix for multi-tenant uniqueness
    code_prefix = sys.argv[4] if len(sys.argv) > 4 else ''
    
    data_dir = f'/tmp/rashid_import_{os.path.basename(rsf_path).replace(" ", "_")}'
    print(f"Step 1: Extracting CSVs...", file=sys.stderr)
    extract_csvs(rsf_path, data_dir)
    
    print(f"Step 2: Generating SQL...", file=sys.stderr)
    importer = RashidImporter(data_dir, company_id, tenant_id, code_prefix)
    sql = importer.run()
    print(sql)
    print(f"Done!", file=sys.stderr)

if __name__ == '__main__':
    main()
