/**
 * Accounting Module Main Page
 * Main page with tabs for all accounting features
 * Ordered according to old project structure
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
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
import ChartOfAccounts from './ChartOfAccounts/ChartOfAccounts';
import JournalEntries from './JournalEntries';
import GeneralLedgerPage from './GeneralLedgerPage';
import FundsManagement from './FundsManagement';
import AccountingDashboard from './AccountingDashboard';
import AccountingReports from './AccountingReports';
import CostCenters from './CostCenters';
import Parties from './Parties';
import AccountingSettings from './AccountingSettings';

export default function Accounting() {
  const { t } = useLanguage();
  const location = useLocation();

  // Determine active tab from route
  const getActiveTab = () => {
    const path = location.pathname;
    // Check if we're in accounting module
    if (path.startsWith('/accounting')) {
      if (path.includes('/chart-of-accounts')) return 'chart-of-accounts';
      if (path.includes('/journal-entries')) return 'journal-entries';
      if (path.includes('/general-ledger')) return 'general-ledger';
      if (path.includes('/funds')) return 'funds';
      if (path.includes('/parties')) return 'parties';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/reports')) return 'reports';
      // Default to dashboard if path is /accounting or /accounting/
      return 'dashboard';
    }
    return 'dashboard'; // Default to dashboard
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
      labelKey: 'accounting.dashboard',
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
    setActiveTab(tabId);
    // For now, just update the tab state (routes will be added later)
    // navigate(`/accounting/${tabId}`);
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

      {/* Content */}
      {renderContent()}
    </div>
  );
}
