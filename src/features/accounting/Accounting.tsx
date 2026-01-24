/**
 * Accounting Module Main Page
 * Main page with tabs for all accounting features
 * With beautiful loading transitions
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import SectionLoader from '@/components/common/SectionLoader';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calculator, 
  BookMarked, 
  Wallet, 
  Users, 
  Settings, 
  FileText 
} from 'lucide-react';

// Lazy load components for better performance
const ChartOfAccounts = lazy(() => import('./ChartOfAccounts/ChartOfAccounts'));
const JournalEntries = lazy(() => import('./JournalEntries'));
const GeneralLedgerPage = lazy(() => import('./GeneralLedgerPage'));
const FundsManagement = lazy(() => import('./FundsManagement'));
const AccountingDashboard = lazy(() => import('./AccountingDashboard'));
const AccountingReports = lazy(() => import('./AccountingReports'));
const Parties = lazy(() => import('./Parties'));
const AccountingSettings = lazy(() => import('./AccountingSettings'));

// Loading component for Suspense
const TabContentLoader = () => (
  <SectionLoader variant="dashboard" showTabs={false} />
);

export default function Accounting() {
  const { t: _t } = useLanguage();
  const location = useLocation();

  // Determine active tab from route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/accounting')) {
      if (path.includes('/chart-of-accounts')) return 'chart-of-accounts';
      if (path.includes('/journal-entries')) return 'journal-entries';
      if (path.includes('/general-ledger')) return 'general-ledger';
      if (path.includes('/funds')) return 'funds';
      if (path.includes('/parties')) return 'parties';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/reports')) return 'reports';
      return 'dashboard';
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Tabs ordered according to old project structure
  const tabs = [
    {
      id: 'dashboard',
      labelKey: 'accounting.dashboardLabel',
      icon: LayoutDashboard,
    },
    {
      id: 'chart-of-accounts',
      labelKey: 'accounting.chartOfAccounts',
      icon: BookOpen,
    },
    {
      id: 'journal-entries',
      labelKey: 'accounting.journalEntries',
      icon: Calculator,
    },
    {
      id: 'general-ledger',
      labelKey: 'accounting.generalLedger',
      icon: BookMarked,
    },
    {
      id: 'funds',
      labelKey: 'accounting.funds',
      icon: Wallet,
    },
    {
      id: 'parties',
      labelKey: 'accounting.parties',
      icon: Users,
    },
    {
      id: 'settings',
      labelKey: 'accounting.settings',
      icon: Settings,
    },
    {
      id: 'reports',
      labelKey: 'accounting.reports',
      icon: FileText,
    },
  ];

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AccountingDashboard />;
      case 'chart-of-accounts':
        return <ChartOfAccounts />;
      case 'journal-entries':
        return <JournalEntries />;
      case 'general-ledger':
        return <GeneralLedgerPage />;
      case 'funds':
        return <FundsManagement />;
      case 'parties':
        return <Parties />;
      case 'settings':
        return <AccountingSettings />;
      case 'reports':
        return <AccountingReports />;
      default:
        return <AccountingDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <MainTabsBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
      />

      {/* Content - بدون animations */}
      <Suspense fallback={<TabContentLoader />}>
        {renderContent()}
      </Suspense>
    </div>
  );
}
