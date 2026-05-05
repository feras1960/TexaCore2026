#!/usr/bin/env python3
"""
استيراد بيانات الرشيد الشامل — يقرأ CSV ويُنتج SQL
"""
import csv, sys, os
from collections import defaultdict

COMPANY_ID = '8440576b-b792-46d4-aee3-dc35da568174'
TENANT_ID  = 'f0b58b92-4cde-4da7-b8a0-206552b8b229'
DATA_DIR   = 'rashid_data'
CURRENCY_MAP = {'0': 'UAH', '1': 'UAH', '2': 'USD'}

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

def read_csv(name):
    path = os.path.join(DATA_DIR, name)
    with open(path, 'r', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def p(sql): print(sql)

# ══════════════════════════════════════
# 1. شجرة الحسابات  
# Accounts.csv headers: Num2,Num,Ref,Credit,Debt,Date,IS_SUB,Currency,...,NAME
# ══════════════════════════════════════
def import_accounts():
    p("-- ═══ 1. شجرة الحسابات ═══")
    rows = read_csv('Accounts.csv')
    codes = set()
    for r in rows:
        code = r.get('Num', '').strip().strip('"')
        if code: codes.add(code)
    
    def acc_type(code):
        c = code[0] if code else '1'
        return {'1':'asset','2':'liability','3':'equity','4':'revenue','5':'expense'}.get(c, 'asset')
    
    def is_group(code):
        return any(c != code and c.startswith(code) for c in codes)
    
    def find_parent(code):
        for ln in range(len(code)-1, 0, -1):
            cand = code[:ln]
            if cand in codes: return cand
        return None
    
    for r in rows:
        code = esc(r.get('Num', ''))
        name = esc(r.get('NAME', ''))
        if not code or not name: continue
        grp = 'true' if is_group(code) else 'false'
        p(f"INSERT INTO chart_of_accounts (id, company_id, tenant_id, account_code, account_name, account_type, is_group, is_active, opening_balance, created_at) VALUES (gen_random_uuid(), '{COMPANY_ID}', '{TENANT_ID}', '{code}', '{name}', '{acc_type(code)}', {grp}, true, 0, NOW()) ON CONFLICT (company_id, account_code) DO NOTHING;")
    
    p("-- Set parents")
    for r in rows:
        code = esc(r.get('Num', ''))
        if not code: continue
        parent = find_parent(code)
        if parent:
            p(f"UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code='{parent}' AND company_id='{COMPANY_ID}' LIMIT 1) WHERE account_code='{code}' AND company_id='{COMPANY_ID}';")
    p("")

# ══════════════════════════════════════
# 2. العملاء  
# Custmers.csv: Num,NAME,ADDRESS,PHONE,MEMO,...
# ══════════════════════════════════════
def import_customers():
    p("-- ═══ 2. العملاء ═══")
    rows = read_csv('Custmers.csv')
    for r in rows:
        name = esc(r.get('NAME', ''))
        acc = esc(r.get('Num', ''))
        phone = esc(r.get('PHONE', ''))
        if not name: continue
        p(f"INSERT INTO customers (id, company_id, tenant_id, name, phone, receivable_account_id, is_active, created_at) VALUES (gen_random_uuid(), '{COMPANY_ID}', '{TENANT_ID}', '{name}', '{phone}', (SELECT id FROM chart_of_accounts WHERE account_code='{acc}' AND company_id='{COMPANY_ID}' LIMIT 1), true, NOW());")
    p("")

# ══════════════════════════════════════
# 3. الموردون
# Suplyers.csv: Num,NAME,ADDRESS,PHONE,...
# ══════════════════════════════════════
def import_suppliers():
    p("-- ═══ 3. الموردون ═══")
    rows = read_csv('Suplyers.csv')
    for r in rows:
        name = esc(r.get('NAME', ''))
        acc = esc(r.get('Num', ''))
        phone = esc(r.get('PHONE', ''))
        if not name: continue
        p(f"INSERT INTO suppliers (id, company_id, tenant_id, name, phone, payable_account_id, is_active, created_at) VALUES (gen_random_uuid(), '{COMPANY_ID}', '{TENANT_ID}', '{name}', '{phone}', (SELECT id FROM chart_of_accounts WHERE account_code='{acc}' AND company_id='{COMPANY_ID}' LIMIT 1), true, NOW());")
    p("")

# ══════════════════════════════════════
# 4. وحدات قياس + منتجات
# MAT.csv: Num2,Num,Name,Unit,...,MinPrice,BayPrice,...,Balance,...,IsManuf,IsGroop1,...
# ══════════════════════════════════════
def import_products():
    p("-- ═══ 4. وحدات قياس + منتجات ═══")
    p(f"INSERT INTO units_of_measure (id, tenant_id, company_id, name_ar, name_en, symbol, is_base_unit) VALUES (gen_random_uuid(), '{TENANT_ID}', '{COMPANY_ID}', 'متر مربع', 'Square Meter', 'm²', true) ON CONFLICT DO NOTHING;")
    
    rows = read_csv('MAT.csv')
    for r in rows:
        sku = esc(r.get('Num', ''))
        name = esc(r.get('Name', ''))
        unit = r.get('Unit', '').strip().strip('"')
        buy = float(r.get('MinPrice', 0) or 0)
        sell = float(r.get('BayPrice', 0) or 0)
        bal = float(r.get('Balance', 0) or 0)
        is_grp = len(sku) <= 3  # short codes = categories
        if not sku or not name: continue
        
        unit_name = 'متر مربع' if 'متر' in unit else 'قطعة'
        ptype = 'service' if is_grp else 'stockable'
        
        p(f"INSERT INTO products (id, tenant_id, company_id, sku, name_ar, product_type, base_unit_id, default_cost, default_price, min_stock, is_active, created_at) VALUES (gen_random_uuid(), '{TENANT_ID}', '{COMPANY_ID}', '{sku}', '{name}', '{ptype}', (SELECT id FROM units_of_measure WHERE name_ar='{unit_name}' AND tenant_id='{TENANT_ID}' LIMIT 1), {buy}, {sell}, {bal}, true, NOW()) ON CONFLICT DO NOTHING;")
    p("")

# ══════════════════════════════════════
# 5. مراكز التكلفة
# CostCenters.csv: Num,Name,Type,CODE
# ══════════════════════════════════════
def import_cost_centers():
    p("-- ═══ 5. مراكز التكلفة ═══")
    rows = read_csv('CostCenters.csv')
    codes = set()
    for r in rows:
        codes.add(r['Num'].strip().strip('"'))
    
    for r in rows:
        code = esc(r['Num'])
        name = esc(r.get('Name', ''))
        is_grp = r.get('Type', '0').strip() == '0'
        if not code: continue
        p(f"INSERT INTO cost_centers (id, tenant_id, company_id, code, name_ar, is_group, is_active, created_at) VALUES (gen_random_uuid(), '{TENANT_ID}', '{COMPANY_ID}', '{code}', '{name}', {'true' if is_grp else 'false'}, true, NOW()) ON CONFLICT (tenant_id, company_id, code) DO NOTHING;")
    
    for r in rows:
        code = esc(r['Num'])
        if not code or len(code) <= 2: continue
        parent = code[:2]
        if parent in codes:
            p(f"UPDATE cost_centers SET parent_id = (SELECT id FROM cost_centers WHERE code='{parent}' AND company_id='{COMPANY_ID}' LIMIT 1) WHERE code='{code}' AND company_id='{COMPANY_ID}';")
    p("")

# ══════════════════════════════════════
# 6. القيود المحاسبية من TEATCHER
# TEATCHER.csv: ID,Acc_nr,Acc_nrr,How,Way,Date,Nbrrec,Summ,Docum,Currency,LocalTot,MianTot,SERNR,...,CostCenter,...
# ══════════════════════════════════════
def import_journal_entries():
    p("-- ═══ 6. القيود المحاسبية ═══")
    p("ALTER TABLE journal_entry_lines DISABLE TRIGGER ALL;")
    p("ALTER TABLE journal_entries DISABLE TRIGGER ALL;")
    
    genday = {}
    for r in read_csv('GENDAY.csv'):
        try:
            nrs = int(r.get('NRS', 0) or 0)
            genday[nrs] = parse_date(r.get('Date', ''))
        except: pass
    
    entries = defaultdict(list)
    for r in read_csv('TEATCHER.csv'):
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
        desc = descs[0] if descs else f'قيد رشيد {nbrrec}'
        
        how = lines[0]['how']
        etype = {'20':'purchase','80':'receipt'}.get(how, 'imported')
        currs = [l['cur'] for l in lines]
        ecur = max(set(currs), key=currs.count)
        
        p(f"INSERT INTO journal_entries (id, company_id, tenant_id, entry_number, entry_date, description, entry_type, status, is_posted, currency, total_debit, total_credit, reference_type, created_at, updated_at) VALUES (gen_random_uuid(), '{COMPANY_ID}', '{TENANT_ID}', '{en}', '{ed}', '{desc}', '{etype}', 'posted', true, '{ecur}', {td:.2f}, {tc:.2f}, 'rashid_import', NOW(), NOW());")
        
        for i, line in enumerate(sorted(lines, key=lambda x: x['way']), 1):
            cc_sql = "NULL"
            if line['cc'] and line['cc'] != '0':
                cc_sql = f"(SELECT id FROM cost_centers WHERE code='{esc(line['cc'])}' AND company_id='{COMPANY_ID}' LIMIT 1)"
            
            p(f"INSERT INTO journal_entry_lines (id, entry_id, tenant_id, line_number, account_id, debit, credit, debit_fc, credit_fc, currency, exchange_rate, description, cost_center_id, created_at) VALUES (gen_random_uuid(), (SELECT id FROM journal_entries WHERE entry_number='{en}' AND company_id='{COMPANY_ID}' LIMIT 1), '{TENANT_ID}', {i}, (SELECT id FROM chart_of_accounts WHERE account_code='{line['acc']}' AND company_id='{COMPANY_ID}' LIMIT 1), {line['d']:.2f}, {line['c']:.2f}, {line['df']:.2f}, {line['cf']:.2f}, '{line['cur']}', {line['rate']}, '{line['desc']}', {cc_sql}, NOW());")
            tl += 1
        te += 1
    
    p("ALTER TABLE journal_entry_lines ENABLE TRIGGER ALL;")
    p("ALTER TABLE journal_entries ENABLE TRIGGER ALL;")
    p(f"-- ═══ ملخص القيود: {te} قيد، {tl} سطر ═══")
    p("")

# ══════════════════════════════════════
# 7. فاتورة الشراء
# ══════════════════════════════════════
def import_purchase_invoice():
    p("-- ═══ 7. فاتورة الشراء ═══")
    rows = read_csv('MoveBayBill.csv')
    moves = read_csv('MOVE.csv')
    
    for r in rows:
        num = r.get('Num', '1').strip()
        date = parse_date(r.get('Date', ''))
        total = float(r.get('Total', 0) or 0)
        doc = esc(r.get('Document', ''))
        supp_acc = esc(r.get('Credit', ''))
        
        p(f"INSERT INTO purchase_invoices (id, company_id, tenant_id, invoice_number, invoice_date, supplier_id, supplier_name, total_amount, currency, status, notes, created_at) VALUES (gen_random_uuid(), '{COMPANY_ID}', '{TENANT_ID}', 'PI-RSF-{num}', '{date}', (SELECT id FROM suppliers WHERE payable_account_id = (SELECT id FROM chart_of_accounts WHERE account_code='{supp_acc}' AND company_id='{COMPANY_ID}' LIMIT 1) LIMIT 1), (SELECT name FROM suppliers WHERE payable_account_id = (SELECT id FROM chart_of_accounts WHERE account_code='{supp_acc}' AND company_id='{COMPANY_ID}' LIMIT 1) LIMIT 1), {total}, 'UAH', 'posted', '{doc}', NOW());")
        
        for i, mv in enumerate(moves, 1):
            mc = esc(mv.get('SACC-NR', ''))
            qty = float(mv.get('SQUANT', 0) or 0)
            price = float(mv.get('SPRICE', 0) or 0)
            lt = qty * price
            p(f"INSERT INTO purchase_invoice_items (id, tenant_id, invoice_id, line_number, product_id, description, quantity, unit_price, subtotal, total, created_at) VALUES (gen_random_uuid(), '{TENANT_ID}', (SELECT id FROM purchase_invoices WHERE invoice_number='PI-RSF-{num}' AND company_id='{COMPANY_ID}' LIMIT 1), {i}, (SELECT id FROM products WHERE sku='{mc}' AND company_id='{COMPANY_ID}' LIMIT 1), (SELECT name_ar FROM products WHERE sku='{mc}' AND company_id='{COMPANY_ID}' LIMIT 1), {qty}, {price}, {lt}, {lt}, NOW());")
    p("")

# ══════════════════════════════════════
# Main
# ══════════════════════════════════════
def main():
    p("-- ═══════════════════════════════════════════════════")
    p("-- استيراد بيانات الرشيد الشامل — ملف 2023")
    p(f"-- Company: {COMPANY_ID}")
    p(f"-- Tenant:  {TENANT_ID}")
    p("-- ═══════════════════════════════════════════════════")
    p("BEGIN;")
    p("")
    
    import_accounts()
    import_customers()
    import_suppliers()
    import_products()
    import_cost_centers()
    import_journal_entries()
    import_purchase_invoice()
    
    p("COMMIT;")
    p("-- ═══ تم الانتهاء ═══")

if __name__ == '__main__':
    main()
