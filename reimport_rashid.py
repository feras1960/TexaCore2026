#!/usr/bin/env python3
"""
إعادة استيراد بيانات الرشيد بشكل نظيف وصحيح
يقرأ من MoveDiffar + GENDAY ويكتب SQL للإدراج في Supabase
"""
import csv
import sys
from collections import defaultdict
from datetime import datetime

COMPANY_ID = '91585816-2e38-4d38-a408-53c536db1864'
TENANT_ID = '4acbb2b3-3e97-49e5-b2cb-8de587b7d1cd'

# Currency mapping: Rashid → ISO code
CURRENCY_MAP = {
    '0': 'UAH',  # Default = local
    '1': 'UAH',  # غريفن
    '2': 'USD',  # دولار
}

def parse_date(d):
    """Parse Rashid date format: 'MM/DD/YY HH:MM:SS' → 'YYYY-MM-DD'"""
    if not d:
        return '2021-01-01'
    try:
        # Remove time part
        d = d.strip().split(' ')[0]
        parts = d.split('/')
        month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
        if year < 100:
            year += 2000
        return f'{year:04d}-{month:02d}-{day:02d}'
    except:
        return '2021-01-01'

def escape_sql(s):
    """Escape single quotes for SQL"""
    if not s:
        return ''
    return s.replace("'", "''").strip()

def main():
    # ══════════════════════════════════════════
    # 1. Read GENDAY (entry headers)
    # ══════════════════════════════════════════
    genday = {}
    with open('rashid_genday.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            nrs = int(row['NRS'])
            genday[nrs] = {
                'date': parse_date(row['Date']),
                'file_num': row.get('FileNum', '10'),
            }

    # ══════════════════════════════════════════
    # 2. Read MoveDiffar (entry lines) and group by NBRREC
    # ══════════════════════════════════════════
    entries = defaultdict(list)
    with open('rashid_movediffar.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            nbrrec = int(row['NBRREC'] or 0)
            if nbrrec == 0:
                continue
            
            total = float(row['Total'] or 0)       # Debit amount (in FC or UAH)
            total1 = float(row['Total1'] or 0)      # Credit amount (in FC or UAH)
            local_tot = float(row['LocalTot'] or 0)  # Amount in UAH
            mian_tot = float(row['MianTot'] or 0)    # Amount in foreign currency
            currency = row.get('Currency', '0') or '0'
            acc_nbr = row['Accnbr']
            document = row.get('Document', '') or ''
            date = parse_date(row.get('Date', ''))
            order = int(row.get('Order', '1') or '1')
            cost_center = row.get('CostCenter', '') or ''
            
            # Determine debit/credit in UAH
            if total > 0:
                debit_uah = local_tot
                credit_uah = 0.0
            else:
                debit_uah = 0.0
                credit_uah = local_tot
            
            # Foreign currency amounts
            # MianTot = المبلغ بالعملة الأجنبية (المعادل بالدولار) — الرشيد يخزّنه حتى للقيود بالغريفن
            cur_code = CURRENCY_MAP.get(currency, 'UAH')
            if cur_code != 'UAH':
                # عملة أجنبية (USD, EUR, etc) — Total/Total1 هي المبالغ بالعملة الأجنبية
                debit_fc = total if total > 0 else 0.0
                credit_fc = total1 if total1 > 0 else 0.0
                # Calculate exchange rate: UAH / FC
                if debit_fc > 0:
                    exchange_rate = debit_uah / debit_fc if debit_fc != 0 else 1.0
                elif credit_fc > 0:
                    exchange_rate = credit_uah / credit_fc if credit_fc != 0 else 1.0
                else:
                    exchange_rate = 1.0
            elif mian_tot > 0:
                # عملة محلية (UAH) لكن الرشيد خزّن المعادل بالدولار في MianTot
                # مثال: LocalTot=20100 UAH, MianTot=741.70 USD → rate = 20100/741.70 = 27.10
                if total > 0:
                    debit_fc = mian_tot
                    credit_fc = 0.0
                else:
                    debit_fc = 0.0
                    credit_fc = mian_tot
                exchange_rate = local_tot / mian_tot if mian_tot != 0 else 1.0
            else:
                # عملة محلية بدون معادل أجنبي — FC = نسخة و rate = 1
                debit_fc = debit_uah
                credit_fc = credit_uah
                exchange_rate = 1.0
            
            entries[nbrrec].append({
                'acc_nbr': acc_nbr,
                'debit': round(debit_uah, 2),
                'credit': round(credit_uah, 2),
                'debit_fc': round(debit_fc, 2),
                'credit_fc': round(credit_fc, 2),
                'currency': cur_code,
                'exchange_rate': round(exchange_rate, 6),
                'description': document,
                'date': date,
                'order': order,
                'cost_center': cost_center,
            })

    # ══════════════════════════════════════════
    # 3. Generate SQL
    # ══════════════════════════════════════════
    print("-- ═══════════════════════════════════════════════════════════════")
    print("-- إعادة استيراد بيانات الرشيد - نظيف وكامل")
    print(f"-- {len(entries)} قيد، {sum(len(v) for v in entries.values())} سطر")
    print("-- ═══════════════════════════════════════════════════════════════")
    print()
    print("ALTER TABLE journal_entry_lines DISABLE TRIGGER ALL;")
    print("ALTER TABLE journal_entries DISABLE TRIGGER ALL;")
    print()
    
    total_entries = 0
    total_lines = 0
    
    for nbrrec in sorted(entries.keys()):
        lines = entries[nbrrec]
        entry_number = f'RSF-{nbrrec}'
        
        # Get date from GENDAY or from first line
        if nbrrec in genday:
            entry_date = genday[nbrrec]['date']
        else:
            entry_date = lines[0]['date']
        
        # Calculate totals for the entry
        total_debit = sum(l['debit'] for l in lines)
        total_credit = sum(l['credit'] for l in lines)
        
        # Get description from lines
        descriptions = [l['description'] for l in lines if l['description']]
        entry_desc = escape_sql(descriptions[0] if descriptions else f'قيد رشيد {nbrrec}')
        
        # Determine currency (use most common)
        currencies = [l['currency'] for l in lines]
        entry_currency = max(set(currencies), key=currencies.count) if currencies else 'UAH'
        
        # INSERT journal entry
        print(f"-- ═══ RSF-{nbrrec} ({entry_date}) ═══")
        print(f"INSERT INTO journal_entries (")
        print(f"  id, company_id, tenant_id, entry_number, entry_date, description,")
        print(f"  entry_type, status, is_posted, currency, total_debit, total_credit,")
        print(f"  reference_type, created_at, updated_at")
        print(f") VALUES (")
        print(f"  gen_random_uuid(), '{COMPANY_ID}', '{TENANT_ID}',")
        print(f"  '{entry_number}', '{entry_date}', '{entry_desc}',")
        print(f"  'imported', 'posted', true, '{entry_currency}',")
        print(f"  {total_debit:.2f}, {total_credit:.2f},")
        print(f"  'rashid_import', NOW(), NOW()")
        print(f");")
        print()
        
        # INSERT journal entry lines
        for i, line in enumerate(sorted(lines, key=lambda x: x['order']), 1):
            acc = line['acc_nbr']
            desc = escape_sql(line['description'])
            cur = line['currency']
            rate = line['exchange_rate']
            
            print(f"INSERT INTO journal_entry_lines (")
            print(f"  id, entry_id, tenant_id, line_number,")
            print(f"  account_id, debit, credit, debit_fc, credit_fc,")
            print(f"  currency, exchange_rate, description, created_at")
            print(f") VALUES (")
            print(f"  gen_random_uuid(),")
            print(f"  (SELECT id FROM journal_entries WHERE entry_number = '{entry_number}' AND company_id = '{COMPANY_ID}' LIMIT 1),")
            print(f"  '{TENANT_ID}', {i},")
            print(f"  (SELECT id FROM chart_of_accounts WHERE account_code = '{acc}' AND company_id = '{COMPANY_ID}' LIMIT 1),")
            print(f"  {line['debit']:.2f}, {line['credit']:.2f},")
            print(f"  {line['debit_fc']:.2f}, {line['credit_fc']:.2f},")
            print(f"  '{cur}', {rate},")
            print(f"  '{desc}', NOW()")
            print(f");")
            total_lines += 1
        
        print()
        total_entries += 1
    
    print("ALTER TABLE journal_entry_lines ENABLE TRIGGER ALL;")
    print("ALTER TABLE journal_entries ENABLE TRIGGER ALL;")
    print()
    print(f"-- ═══ الملخص: {total_entries} قيد، {total_lines} سطر ═══")

if __name__ == '__main__':
    main()
