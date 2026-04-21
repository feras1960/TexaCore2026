const fs = require('fs');

const path = "src/app/(dashboard)/new-dashboard/page.tsx";
const content = fs.readFileSync(path, 'utf8');

function extractFunc(name) {
    const startStr = `function ${name}(`;
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) return null;
    
    let braceCount = 0;
    let endIdx = -1;
    let insideString = false;
    let stringChar = '';
    
    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        
        if (insideString) {
            if (char === stringChar && content[i-1] !== '\\') {
                insideString = false;
            }
            continue;
        }
        
        if (char === '"' || char === "'" || char === '`') {
            insideString = true;
            stringChar = char;
            continue;
        }
        
        if (char === '{') braceCount++;
        if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIdx = i;
                break;
            }
        }
    }
    
    if (endIdx !== -1) {
        return content.slice(startIdx, endIdx + 1);
    }
    return null;
}

const comps = [
    { name: 'MiniSparkline', file: '_components/shared/MiniSparkline.tsx', imports: "import { useMemo } from 'react';\nimport { LineChart, Line, ResponsiveContainer } from 'recharts';" },
    { name: 'TrendBadge', file: '_components/shared/TrendBadge.tsx', imports: "import { ArrowUpRight, ArrowDownRight } from 'lucide-react';" },
    { name: 'CurrencyValue', file: '_components/shared/CurrencyValue.tsx', imports: "import CountUp from 'react-countup';\nimport { useReducedMotion } from 'framer-motion';\nimport { formatCurrency } from '../_lib/formatters';" },
    { name: 'EmptyState', file: '_components/shared/EmptyState.tsx', imports: "import { FileQuestion } from 'lucide-react';" },
    { name: 'SyncIndicator', file: '_components/shared/SyncIndicator.tsx', imports: "import { Wifi, WifiOff } from 'lucide-react';\nimport { formatRelativeTime } from '../_lib/formatters';\nimport { useOnline } from '../_hooks/useOnline';" },
];

fs.mkdirSync('src/app/(dashboard)/new-dashboard/_components/shared', { recursive: true });

comps.forEach(c => {
    const code = extractFunc(c.name);
    if (code) {
        fs.writeFileSync(`src/app/(dashboard)/new-dashboard/${c.file}`, `// Auto-extracted\n${c.imports}\n\nexport ${code}\n`);
        console.log(`Extracted ${c.name}`);
    } else {
        console.log(`Could not find ${c.name}`);
    }
});

// We also need useOnline hook
const onlineHookCode = `import { useState, useEffect } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
`;
fs.writeFileSync('src/app/(dashboard)/new-dashboard/_hooks/useOnline.ts', onlineHookCode);
console.log('Created useOnline hook');

