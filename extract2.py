import re
import os

path = "src/app/(dashboard)/new-dashboard/page.tsx"
with open(path, 'r') as f:
    content = f.read()

def extract_func(name):
    start_str = f"function {name}("
    start_idx = content.find(start_str)
    if start_idx == -1: return None
    brace_count = 0
    end_idx = -1
    inside_string = False
    string_char = ''
    for i in range(start_idx, len(content)):
        char = content[i]
        if inside_string:
            if char == string_char and content[i-1] != '\\': inside_string = False
            continue
        if char in ('"', "'", '`'):
            inside_string = True
            string_char = char
            continue
        if char == '{': brace_count += 1
        if char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break
    if end_idx != -1: return content[start_idx:end_idx+1]
    return None

def extract_comp(name, target_file, imports):
    code = extract_func(name)
    if code:
        if not code.startswith("export"): code = "export " + code
        full_code = f"{imports}\n\n{code}\n"
        with open(f"src/app/(dashboard)/new-dashboard/{target_file}", "w") as f:
            f.write(full_code)
        print(f"Extracted {name}")

extract_comp('DashboardHeader', '_components/DashboardHeader.tsx', 
    "import { SyncIndicator } from './shared/SyncIndicator';\nimport { formatDateArabic } from '../_lib/formatters';\nimport { motion } from 'framer-motion';")

extract_comp('NetPositionHero', '_components/NetPositionHero.tsx', 
    "import { NetPosition } from '../_lib/dashboard-types';\nimport { TrendBadge } from './shared/TrendBadge';\nimport CountUp from 'react-countup';\nimport { motion } from 'framer-motion';")

extract_comp('KpiGrid', '_components/KpiGrid.tsx', 
    "import { KpiItem } from '../_lib/dashboard-types';\nimport { KpiCard } from './KpiCard';")

extract_comp('KpiCard', '_components/KpiCard.tsx', 
    "import { KpiItem } from '../_lib/dashboard-types';\nimport { TrendBadge } from './shared/TrendBadge';\nimport { CurrencyValue } from './shared/CurrencyValue';\nimport { MiniSparkline } from './shared/MiniSparkline';\nimport { formatCurrency } from '../_lib/formatters';\nimport { Wallet, Receipt, Package, CircleDollarSign } from 'lucide-react';\nimport { motion } from 'framer-motion';\n\nconst KPI_ICONS: Record<string, any> = {\n  cash: Wallet,\n  receivables: Receipt,\n  payables: CircleDollarSign,\n  inventory: Package,\n};\n\nconst KPI_COLORS: Record<string, string> = {\n  cash: '#0ea5e9',\n  receivables: '#8b5cf6',\n  payables: '#f59e0b',\n  inventory: '#ec4899',\n};")

extract_comp('CashFlowChart', '_components/CashFlowChart.tsx', 
    "import { CashFlowPoint } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport ReactECharts from 'echarts-for-react';\nimport { motion } from 'framer-motion';")

extract_comp('QuickActionsBar', '_components/QuickActionsBar.tsx', 
    "import { Plus, TrendingUp, Users, Package } from 'lucide-react';\nimport { motion } from 'framer-motion';")

print("Stage 2 complete.")
