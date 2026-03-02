/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Accounting Module Main Page
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ PERFORMANCE PATTERN: "Keep All Mounted"
 * 
 * Instead of lazy loading and unmounting tabs on switch, we:
 * 1. Render ALL tab content once on mount
 * 2. Use CSS (display: none) to hide inactive tabs
 * 3. Result: INSTANT tab switching with ZERO flicker or reload
 * 
 * This matches the Warehouse module's smooth experience.
 * React Query cache works perfectly because components stay mounted.
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { preloadAccounts } from '@/components/ui/InlineAccountCell';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  BookMarked,
  Wallet,
  Users,
  Settings,
  FileText,
  PieChart,
  RefreshCw,
  Scale,
  Handshake,
} from 'lucide-react';

// Direct imports (no lazy loading) for instant switching
import ChartOfAccounts from './ChartOfAccounts/ChartOfAccounts';
import JournalEntries from './JournalEntries';
import GeneralLedgerPage from './GeneralLedgerPage';
import FundsManagement from './FundsManagement';
import AccountingDashboard from './AccountingDashboard';
import AccountingReports from './AccountingReports';
import Parties from './Parties';
import AccountingSettings from './AccountingSettings';
import BudgetPage from './BudgetPage';
import VATSettlement from './VATSettlement';
import EquityPartnersPage from './EquityPartnersPage';
const RecurringEntriesPage = lazy(() => import('./RecurringEntriesPage'));

// Tab configuration type
interface TabConfig {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

export default function Accounting() {
  const { t: _t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { companyId } = useCompany();

  // ═══ Preload accounts as soon as accounting module opens ═══
  useEffect(() => {
    if (companyId) preloadAccounts(companyId);
  }, [companyId]);

  // Determine active tab from route
  const getActiveTab = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/accounting')) {
      if (path.includes('/chart-of-accounts')) return 'chart-of-accounts';
      if (path.includes('/journal-entries')) return 'journal-entries';
      if (path.includes('/general-ledger')) return 'general-ledger';
      if (path.includes('/funds')) return 'funds';
      if (path.includes('/parties')) return 'parties';
      if (path.includes('/equity-partners')) return 'equity-partners';
      if (path.includes('/budget')) return 'budget';
      if (path.includes('/vat-settlement')) return 'vat-settlement';
      if (path.includes('/recurring')) return 'recurring';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/reports')) return 'reports';
      return 'dashboard';
    }
    return 'dashboard';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(getActiveTab);

  // Track which tabs have been visited to enable mount-on-first-visit
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getActiveTab()]));

  // Update active tab when location changes
  useEffect(() => {
    const newTab = getActiveTab();
    setActiveTab(newTab);
    setVisitedTabs(prev => {
      if (prev.has(newTab)) return prev;
      const next = new Set(prev);
      next.add(newTab);
      return next;
    });
  }, [getActiveTab]);

  // Tab configuration - memoized to prevent re-renders
  const tabs: TabConfig[] = useMemo(() => [
    {
      id: 'dashboard',
      labelKey: 'accounting.dashboardLabel',
      icon: LayoutDashboard,
      component: AccountingDashboard,
    },
    {
      id: 'chart-of-accounts',
      labelKey: 'accounting.chartOfAccounts',
      icon: BookOpen,
      component: ChartOfAccounts,
    },
    {
      id: 'journal-entries',
      labelKey: 'accounting.journalEntries',
      icon: Calculator,
      component: JournalEntries,
    },
    {
      id: 'general-ledger',
      labelKey: 'accounting.generalLedger',
      icon: BookMarked,
      component: GeneralLedgerPage,
    },
    {
      id: 'funds',
      labelKey: 'accounting.funds',
      icon: Wallet,
      component: FundsManagement,
    },
    {
      id: 'parties',
      labelKey: 'parties.title',
      icon: Users,
      component: Parties,
    },
    {
      id: 'equity-partners',
      labelKey: 'accounting.equityPartners',
      icon: Handshake,
      component: EquityPartnersPage,
    },
    {
      id: 'budget',
      labelKey: 'accounting.budget',
      icon: PieChart,
      component: BudgetPage,
    },
    {
      id: 'recurring',
      labelKey: 'accounting.recurring',
      icon: RefreshCw,
      component: RecurringEntriesPage,
    },
    {
      id: 'vat-settlement',
      labelKey: 'accounting.vatSettlement',
      icon: Scale,
      component: VATSettlement,
    },
    {
      id: 'settings',
      labelKey: 'accounting.settings',
      icon: Settings,
      component: AccountingSettings,
    },
    {
      id: 'reports',
      labelKey: 'accounting.reports',
      icon: FileText,
      component: AccountingReports,
    },
  ], []);

  // Handle tab change - update state AND URL
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setVisitedTabs(prev => {
        if (prev.has(tabId)) return prev;
        const next = new Set(prev);
        next.add(tabId);
        return next;
      });
      // Navigate to the correct URL so refresh preserves state
      const path = tabId === 'dashboard' ? '/accounting' : `/accounting/${tabId}`;
      navigate(path, { replace: true });
    }
  }, [activeTab, navigate]);

  // Tabs data for MainTabsBar (without component property)
  const tabsForBar = useMemo(() =>
    tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })) as any,
    [tabs]
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <MainTabsBar
        tabs={tabsForBar}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
      />

      {/* 
        ⚡ PERFORMANCE: Keep All Mounted Pattern
        
        All tab panels are rendered once and kept in DOM.
        We use CSS to control visibility instead of conditional rendering.
        This eliminates the flicker caused by mounting/unmounting
        and preserves React Query cache across tab switches.
      */}
      <div className="relative">
        {tabs.map((tab) => {
          const TabComponent = tab.component;
          const isActive = activeTab === tab.id;
          const wasVisited = visitedTabs.has(tab.id);

          // Only mount the component after the tab has been visited at least once
          if (!wasVisited) return null;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              aria-hidden={!isActive}
              className={isActive ? 'block' : 'hidden'}
              // Performance: prevent any re-renders when hidden
              style={{
                contain: isActive ? 'none' : 'strict',
                contentVisibility: isActive ? 'visible' : 'hidden',
              }}
            >
              <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>}>
                <TabComponent />
              </Suspense>
            </div>
          );
        })}
      </div>
    </div>
  );
}
