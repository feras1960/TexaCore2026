import os
import re

comps_dir = 'src/app/(dashboard)/new-dashboard/_components'
shared_dir = os.path.join(comps_dir, 'shared')

with open('/Users/macbook/Downloads/DashboardPage.tsx', 'r') as f:
    text = f.read()

def extract(func_name):
    pattern = r"function\s+" + func_name + r"\s*[<\(]"
    match = re.search(pattern, text)
    if not match: return None
    lines = text[match.start():].split('\n')
    out = []
    for line in lines:
        out.append(line)
        if line == "}": break
    return "\n".join(out)

# 1. DashboardHeader - add useGreeting
dash_header = os.path.join(comps_dir, 'DashboardHeader.tsx')
with open(dash_header, 'r') as f: content = f.read()
if 'function useGreeting' not in content:
    use_greeting = extract('useGreeting')
    if use_greeting:
        content = content + "\n\n" + use_greeting + "\n"
        with open(dash_header, 'w') as f: f.write(content)

# 2. SectionCard -> extract to shared/SectionCard.tsx
sc = extract('SectionCard')
if sc:
    imports = "import { ReactNode } from 'react';\n"
    if not sc.startswith("export"): sc = "export " + sc
    with open(os.path.join(shared_dir, 'SectionCard.tsx'), 'w') as f:
        f.write(imports + "\n" + sc + "\n")

panels = ['AttentionPanel.tsx', 'TopCustomersPanel.tsx', 'RecentActivityPanel.tsx', 'CurrencyExposurePanel.tsx']
for p in panels:
    path = os.path.join(comps_dir, p)
    with open(path, 'r') as f: content = f.read()
    if 'SectionCard' in content and 'import { SectionCard' not in content:
        content = "import { SectionCard } from './shared/SectionCard';\n" + content
        with open(path, 'w') as f: f.write(content)

# 3. CashFlowChart - add useMemo
cf_path = os.path.join(comps_dir, 'CashFlowChart.tsx')
with open(cf_path, 'r') as f: content = f.read()
if 'import { useMemo' not in content:
    content = "import { useMemo } from 'react';\n" + content
    with open(cf_path, 'w') as f: f.write(content)

# 4. QuickActionsBar - add QUICK_ACTIONS & imports
qa_path = os.path.join(comps_dir, 'QuickActionsBar.tsx')
with open(qa_path, 'r') as f: content = f.read()
if 'QUICK_ACTIONS =' not in content:
    # also add Receipt, CircleDollarSign
    content = content.replace("Plus, TrendingUp, Users, Package", "Plus, TrendingUp, Users, Package, Receipt, CircleDollarSign")
    qa_list = """
const QUICK_ACTIONS = [
  { label: 'فاتورة مبيعات', icon: Receipt, href: '/sales/invoices/new' },
  { label: 'قيد يومية', icon: TrendingUp, href: '/accounting/journal-entries/new' },
  { label: 'سند دفع', icon: CircleDollarSign, href: '/accounting/payments/new' },
  { label: 'عميل جديد', icon: Users, href: '/customers/new' },
  { label: 'أمر شراء', icon: Package, href: '/purchases/orders/new' },
];
"""
    # Insert right before export function
    content = content.replace("export function QuickActionsBar", qa_list + "\nexport function QuickActionsBar")
    with open(qa_path, 'w') as f: f.write(content)

# 5. NetPositionHero - EmptyState import
np_path = os.path.join(comps_dir, 'NetPositionHero.tsx')
with open(np_path, 'r') as f: content = f.read()
if 'import { EmptyState' not in content and 'EmptyState' in content:
    content = "import { EmptyState } from './shared/EmptyState';\n" + content
    with open(np_path, 'w') as f: f.write(content)

print("Fixes applied.")
