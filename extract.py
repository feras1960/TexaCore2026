import re
import os

path = "src/app/(dashboard)/new-dashboard/page.tsx"
with open(path, 'r') as f:
    content = f.read()

def extract_func(name):
    # Very rudimentary regex logic won't work well due to nested braces.
    # Manual brace counting in python.
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
            if char == string_char and content[i-1] != '\\':
                inside_string = False
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
                
    if end_idx != -1:
        return content[start_idx:end_idx+1]
    return None

def extract_comp(name, target_file, imports, props=""):
    code = extract_func(name)
    if code:
        # replace `export function` if it's already there
        if not code.startswith("export"):
            code = "export " + code
        full_code = f"{imports}\n\n{code}\n"
        with open(f"src/app/(dashboard)/new-dashboard/{target_file}", "w") as f:
            f.write(full_code)
        print(f"Extracted {name}")

os.makedirs('src/app/(dashboard)/new-dashboard/_components/shared', exist_ok=True)

extract_comp('MiniSparkline', '_components/shared/MiniSparkline.tsx', 
    "import { useMemo } from 'react';\nimport { LineChart, Line, ResponsiveContainer } from 'recharts';")

extract_comp('TrendBadge', '_components/shared/TrendBadge.tsx', 
    "import { ArrowUpRight, ArrowDownRight } from 'lucide-react';")

extract_comp('CurrencyValue', '_components/shared/CurrencyValue.tsx', 
    "import CountUp from 'react-countup';\nimport { useReducedMotion } from 'framer-motion';\nimport { formatCurrency } from '../../_lib/formatters';")

extract_comp('EmptyState', '_components/shared/EmptyState.tsx', 
    "import { FileQuestion } from 'lucide-react';")

extract_comp('SyncIndicator', '_components/shared/SyncIndicator.tsx', 
    "import { Wifi, WifiOff } from 'lucide-react';\nimport { formatRelativeTime } from '../../_lib/formatters';\nimport { useOnline } from '../../_hooks/useOnline';")

# Extract panels
extract_comp('AttentionPanel', '_components/AttentionPanel.tsx', 
    "import { AlertCircle } from 'lucide-react';\nimport { AttentionItem } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { motion } from 'framer-motion';")

extract_comp('TopCustomersPanel', '_components/TopCustomersPanel.tsx', 
    "import { Users } from 'lucide-react';\nimport { TopCustomer } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { formatCurrency } from '../_lib/formatters';\nimport { motion } from 'framer-motion';")

extract_comp('RecentActivityPanel', '_components/RecentActivityPanel.tsx', 
    "import { Clock } from 'lucide-react';\nimport { ActivityItem } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { formatCurrency, formatRelativeTime } from '../_lib/formatters';\nimport { motion } from 'framer-motion';")

extract_comp('CurrencyExposurePanel', '_components/CurrencyExposurePanel.tsx', 
    "import { CircleDollarSign } from 'lucide-react';\nimport { CurrencyBreakdown } from '../_lib/dashboard-types';\nimport { EmptyState } from './shared/EmptyState';\nimport { formatCurrency } from '../_lib/formatters';\nimport { motion } from 'framer-motion';")

print("Shared extraction complete.")
