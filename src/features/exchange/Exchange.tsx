/**
 * ════════════════════════════════════════════════════════════════
 * 🏦 Exchange & Remittance Module — Main Page
 * ════════════════════════════════════════════════════════════════
 *
 * ⚡ PERFORMANCE PATTERN: "Keep Visited Mounted"
 * Only visited tabs get mounted. After first visit, they stay in DOM.
 * 
 * 🔧 AUTO-SETUP: On first load, calls setup_exchange_accounts()
 * to create exchange chart of accounts if not already present.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Send,
  Users,
  Building,
  Handshake,
  Wallet,
  BookOpen,
  GitBranch,
  Settings,
  BarChart3,
} from 'lucide-react';

// ═══ Real tab components ═══
import ExchangeDashboard from './tabs/ExchangeDashboard';
import ExchangeCustomers from './tabs/ExchangeCustomers';
import ExchangeOperationsTab from './tabs/ExchangeOperations';
import RemittancesPageTab from './tabs/RemittancesPage';
import AgentsPageTab from './tabs/AgentsPage';
import PartnersPage from './tabs/PartnersPage';
import ExchangeTreasury from './tabs/ExchangeTreasury';
import ExchangeJournal from './tabs/ExchangeJournal';
import ExchangeBranches from './tabs/ExchangeBranches';
import ExchangeSettings from './tabs/ExchangeSettings';
import ExchangeReports from './tabs/ExchangeReports';


interface TabConfig {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

export default function Exchange() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { company } = useCompany();
  const setupDoneRef = useRef(false);

  // ═══ Auto-setup exchange accounts on first load ═══
  useEffect(() => {
    if (company?.id && !setupDoneRef.current) {
      setupDoneRef.current = true;
      supabase.rpc('setup_exchange_accounts', {
        p_company_id: company.id
      }).then(({ data, error }) => {
        if (error) {
          console.warn('[Exchange] setup_exchange_accounts error:', error.message);
        } else {
          console.log('[Exchange] Accounts setup:', data);
        }
      });
    }
  }, [company?.id]);

  // ═══ Tab routing ═══
  const getActiveTab = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/exchange')) {
      if (path === '/exchange' || path === '/exchange/') return 'dashboard';
      if (path.includes('/operations')) return 'operations';
      if (path.includes('/remittances')) return 'remittances';
      if (path.includes('/customers')) return 'customers';
      if (path.includes('/agents')) return 'agents';
      if (path.includes('/partners')) return 'partners';
      if (path.includes('/treasury')) return 'treasury';
      if (path.includes('/journal')) return 'journal';
      if (path.includes('/branches')) return 'branches';
      if (path.includes('/reports')) return 'reports';
      if (path.includes('/settings')) return 'settings';
      return 'dashboard';
    }
    return 'dashboard';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(getActiveTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getActiveTab()]));

  useEffect(() => {
    const newTab = getActiveTab();
    setActiveTab(newTab);
    setVisitedTabs(prev => {
      if (prev.has(newTab)) return prev;
      return new Set(prev).add(newTab);
    });
  }, [getActiveTab]);

  // ═══ Tab definitions (9 tabs) ═══
  const tabs: TabConfig[] = useMemo(() => [
    { id: 'dashboard', labelKey: 'exchange.tabs.dashboard', icon: LayoutDashboard, component: ExchangeDashboard },
    { id: 'operations', labelKey: 'exchange.tabs.operations', icon: ArrowRightLeft, component: ExchangeOperationsTab },
    { id: 'remittances', labelKey: 'exchange.tabs.remittances', icon: Send, component: RemittancesPageTab },
    { id: 'customers', labelKey: 'exchange.tabs.customers', icon: Users, component: ExchangeCustomers },
    { id: 'agents', labelKey: 'exchange.tabs.agents', icon: Building, component: AgentsPageTab },
    { id: 'partners', labelKey: 'exchange.tabs.partners', icon: Handshake, component: PartnersPage },
    { id: 'treasury', labelKey: 'exchange.tabs.treasury', icon: Wallet, component: ExchangeTreasury },
    { id: 'journal', labelKey: 'exchange.tabs.journal', icon: BookOpen, component: ExchangeJournal },
    { id: 'branches', labelKey: 'exchange.tabs.branches', icon: GitBranch, component: ExchangeBranches },
    { id: 'reports', labelKey: 'exchange.tabs.reports', icon: BarChart3, component: ExchangeReports },
    { id: 'settings', labelKey: 'exchange.tabs.settings', icon: Settings, component: ExchangeSettings },
  ], []);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setVisitedTabs(prev => {
        if (prev.has(tabId)) return prev;
        return new Set(prev).add(tabId);
      });
      const path = tabId === 'dashboard' ? '/exchange' : `/exchange/${tabId}`;
      navigate(path, { replace: true });
    }
  }, [activeTab, navigate]);

  const tabsForBar = useMemo(() =>
    tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })) as { id: string; labelKey: string; icon?: any }[],
    [tabs]
  );

  return (
    <div className="space-y-6">
      <MainTabsBar
        tabs={tabsForBar}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
      />

      <div className="relative">
        {tabs.map((tab) => {
          const TabComponent = tab.component;
          const isActive = activeTab === tab.id;
          const wasVisited = visitedTabs.has(tab.id);

          if (!wasVisited) return null;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              aria-hidden={!isActive}
              className={isActive ? 'block' : 'hidden'}
              style={{
                contain: isActive ? 'none' : 'strict',
                contentVisibility: isActive ? 'visible' : 'hidden',
              }}
            >
              <TabComponent />
            </div>
          );
        })}
      </div>
    </div>
  );
}
