const fs = require('fs');

const path = "src/app/(dashboard)/new-dashboard/page.tsx";
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const outLines = [];
let skip = false;
let injectImports = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('// ═══════════════════════════════════════════════════════════════════════')) {
        const nextLine = lines[i+1] || "";
        if (nextLine.includes('1. TYPES') || nextLine.includes('2. MOCK DATA') || nextLine.includes('3. HOOKS') || nextLine.includes('4. FORMATTERS')) {
            skip = true;
        }
        if (nextLine.includes('5. SHARED COMPONENTS')) {
            skip = false;
            injectImports = true;
        }
    }

    if (skip) {
        continue;
    }

    if (injectImports) {
        outLines.push(`import { NetPosition, KpiItem, CashFlowPoint, AttentionItem, TopCustomer, ActivityItem, CurrencyBreakdown } from './_lib/dashboard-types';`);
        outLines.push(`import { formatCurrency, formatRelativeTime, formatDateArabic } from './_lib/formatters';`);
        outLines.push(`import { useNetPosition, useKpiSummary, useCashFlowSeries, useAttentionItems, useTopCustomers, useRecentActivity, useCurrencyExposure } from './_hooks/useDashboardData';`);
        outLines.push(`import { useAccountingSettings } from '@/hooks/useAccountingSettings';`);
        
        // Add useOnline explicitly since it was in 3. HOOKS
        outLines.push(`
function useOnline(): boolean {
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
`);
        injectImports = false;
    }

    let modified = line;
    modified = modified.replace("const netQuery = useMockQuery(MOCK_NET_POSITION, 300);", "const netQuery = useNetPosition(companyId, currency);");
    modified = modified.replace("const kpiQuery = useMockQuery(MOCK_KPIS, 450);", "const kpiQuery = useKpiSummary(companyId, currency);");
    modified = modified.replace("const flowQuery = useMockQuery(MOCK_CASH_FLOW, 600);", "const flowQuery = useCashFlowSeries(companyId, currency, 30);");
    modified = modified.replace("const attnQuery = useMockQuery(MOCK_ATTENTION, 400);", "const attnQuery = useAttentionItems(companyId);");
    modified = modified.replace("const custQuery = useMockQuery(MOCK_TOP_CUSTOMERS, 500);", "const custQuery = useTopCustomers(companyId);");
    modified = modified.replace("const actQuery = useMockQuery(MOCK_ACTIVITY, 550);", "const actQuery = useRecentActivity(companyId);");
    modified = modified.replace("const curQuery = useMockQuery(MOCK_CURRENCIES, 700);", "const curQuery = useCurrencyExposure(companyId);");
    outLines.push(modified);
}

// Ensure the page gets companyId properly if it was missing 
// Let's replace 'export default function DashboardPage() {' with logic to parse companyId and baseCurrency if needed
const finalContent = outLines.join('\n');
fs.writeFileSync(path, finalContent, 'utf8');
console.log('Refactor complete!');
