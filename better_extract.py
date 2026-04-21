import re
import os

with open('/Users/macbook/Downloads/DashboardPage.tsx', 'r') as f:
    text = f.read()

def find_block(func_name):
    # Search for "function Name(" or "function Name<"
    pattern = r"function\s+" + func_name + r"\s*[<\(]"
    match = re.search(pattern, text)
    if not match:
        return None
        
    start_idx = match.start()
    
    # We find where the next "function " starts, or exactly at the end of file.
    # Alternatively, we just count braces properly.
    
    brace_count = 0
    in_str = False
    str_char = ''
    end_idx = -1
    
    # Wait, the previous brace counter failed when there was a newline before the opening brace or something?
    # function KpiGrid({
    #   kpis,
    #   loading,
    # }: {
    #   kpis?: KpiItem[];
    #   loading?: boolean;
    # }) {
    # Wait! In KpiGrid, the function starts, and it finds `{` in the parameter list!!!
    # If the brace count goes back to 0 at `}: {`, it thinks the function ended!!
    
    # Ah! The brace count assumes the first `{` is the block body! But it's the parameter destructuring!
    
    # Better logic: The component ends at a `^}` at the beginning of a line.
    
    lines = text[start_idx:].split('\n')
    extracted = []
    
    # The first line has the function signature
    for line in lines:
        extracted.append(line)
        if line == "}":
            break
            
    return "\n".join(extracted)

def dump(comps, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for c in comps:
        code = find_block(c['name'])
        if code:
            if not code.startswith("export"):
                code = "export " + code
            with open(os.path.join(out_dir, c['file']), 'w') as f:
                f.write(c['imports'] + "\n\n" + code + "\n")
            print("Extracted", c['name'])
        else:
            print("Failed", c['name'])

shared = [
    { 'name': 'MiniSparkline', 'file': 'MiniSparkline.tsx', 'imports': "import { useMemo } from 'react';\nimport { LineChart, Line, ResponsiveContainer } from 'recharts';" },
    { 'name': 'TrendBadge', 'file': 'TrendBadge.tsx', 'imports': "import { ArrowUpRight, ArrowDownRight } from 'lucide-react';" },
    { 'name': 'CurrencyValue', 'file': 'CurrencyValue.tsx', 'imports': "import CountUp from 'react-countup';\nimport { useReducedMotion } from 'framer-motion';\nimport { formatCurrency } from '../../_lib/formatters';" },
    { 'name': 'EmptyState', 'file': 'EmptyState.tsx', 'imports': "import { FileQuestion } from 'lucide-react';" },
    { 'name': 'SyncIndicator', 'file': 'SyncIndicator.tsx', 'imports': "import { Wifi, WifiOff } from 'lucide-react';\nimport { formatRelativeTime } from '../../_lib/formatters';\nimport { useOnline } from '../../_hooks/useOnline';" }
]

main_comps = [
    { 'name': 'DashboardHeader', 'file': 'DashboardHeader.tsx', 'imports': "import { SyncIndicator } from './shared/SyncIndicator';\nimport { formatDateArabic } from '../_lib/formatters';\nimport { motion } from 'framer-motion';" },
    { 'name': 'NetPositionHero', 'file': 'NetPositionHero.tsx', 'imports': "import { NetPosition } from '../_lib/dashboard-types';\nimport { TrendBadge } from './shared/TrendBadge';\nimport CountUp from 'react-countup';\nimport { motion } from 'framer-motion';" },
    { 'name': 'KpiGrid', 'file': 'KpiGrid.tsx', 'imports': "import { KpiItem } from '../_lib/dashboard-types';\nimport { KpiCard } from './KpiCard';" },
    { 'name': 'KpiCard', 'file': 'KpiCard.tsx', 'imports': "import { KpiItem } from '../_lib/dashboard-types';\nimport { TrendBadge } from './shared/TrendBadge';\nimport { CurrencyValue } from './shared/CurrencyValue';\nimport { MiniSparkline } from './shared/MiniSparkline';\nimport { formatCurrency } from '../_lib/formatters';\nimport { Wallet, Receipt, Package, CircleDollarSign } from 'lucide-react';\nimport { motion } from 'framer-motion';\n\nconst KPI_ICONS: Record<string, any> = {\n  cash: Wallet,\n  receivables: Receipt,\n  payables: CircleDollarSign,\n  inventory: Package,\n};\n\nconst KPI_COLORS: Record<string, string> = {\n  cash: '#0ea5e9',\n  receivables: '#8b5cf6',\n  payables: '#f59e0b',\n  inventory: '#ec4899',\n};" },
    { 'name': 'CashFlowChart', 'file': 'CashFlowChart.tsx', 'imports': "import { CashFlowPoint } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport ReactECharts from 'echarts-for-react';\nimport { motion } from 'framer-motion';" },
    { 'name': 'QuickActionsBar', 'file': 'QuickActionsBar.tsx', 'imports': "import { Plus, TrendingUp, Users, Package } from 'lucide-react';\nimport { motion } from 'framer-motion';" },
    { 'name': 'AttentionPanel', 'file': 'AttentionPanel.tsx', 'imports': "import { AlertCircle } from 'lucide-react';\nimport { AttentionItem } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { motion } from 'framer-motion';" },
    { 'name': 'TopCustomersPanel', 'file': 'TopCustomersPanel.tsx', 'imports': "import { Users } from 'lucide-react';\nimport { TopCustomer } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { formatCurrency } from '../_lib/formatters';\nimport { motion } from 'framer-motion';" },
    { 'name': 'RecentActivityPanel', 'file': 'RecentActivityPanel.tsx', 'imports': "import { Clock } from 'lucide-react';\nimport { ActivityItem } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { formatCurrency, formatRelativeTime } from '../_lib/formatters';\nimport { motion } from 'framer-motion';" },
    { 'name': 'CurrencyExposurePanel', 'file': 'CurrencyExposurePanel.tsx', 'imports': "import { CircleDollarSign } from 'lucide-react';\nimport { CurrencyBreakdown } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { formatCurrency } from '../_lib/formatters';\nimport { motion } from 'framer-motion';" },
]

dump(shared, 'src/app/(dashboard)/new-dashboard/_components/shared')
dump(main_comps, 'src/app/(dashboard)/new-dashboard/_components')
