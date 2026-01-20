/**
 * SaaS Management Module Main Page
 * Main page with tabs for all SaaS management features
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { 
  LayoutDashboard,
  Users,
  Package,
  Building2,
  CreditCard,
  Settings,
  FileText,
  BarChart3,
  UserCog,
  Globe,
  Ticket,
  Bell,
  Gift,
  Share2,
  Webhook,
  TrendingUp
} from 'lucide-react';

// Import components
import Agents from './Agents';
import Subscribers from './Subscribers';
import SaaSDashboard from './SaaSDashboard';
import Packages from './Packages';
import Payments from './Payments';
import WhiteLabel from './WhiteLabel';
import Support from './Support';
import Marketing from './Marketing';
import Reports from './Reports';
import SaaSSettings from './Settings';

export default function SaaS() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/saas')) {
      if (path === '/saas' || path === '/saas/') return 'dashboard';
      if (path.includes('/subscribers')) return 'subscribers';
      if (path.includes('/packages')) return 'packages';
      if (path.includes('/agents')) return 'agents';
      if (path.includes('/white-label')) return 'white-label';
      if (path.includes('/payments')) return 'payments';
      if (path.includes('/support') || path.includes('/notifications')) return 'support';
      if (path.includes('/marketing') || path.includes('/coupons') || path.includes('/referrals')) return 'marketing';
      if (path.includes('/reports') || path.includes('/analytics')) return 'reports';
      if (path.includes('/settings') || path.includes('/modules') || path.includes('/webhooks')) return 'settings';
      return 'dashboard';
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Tabs configuration - Simplified from 15 to 9 tabs
  const tabs = [
    {
      id: 'dashboard',
      labelKey: 'saas.dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'subscribers',
      labelKey: 'saas.subscribers',
      icon: Building2,
    },
    {
      id: 'packages',
      labelKey: 'saas.packages',
      icon: Package,
    },
    {
      id: 'agents',
      labelKey: 'saas.agents',
      icon: UserCog,
    },
    {
      id: 'white-label',
      labelKey: 'saas.whiteLabel',
      icon: Globe,
    },
    {
      id: 'payments',
      labelKey: 'saas.payments',
      icon: CreditCard,
    },
    {
      id: 'support',
      labelKey: 'saas.support',
      icon: Ticket,
      // Includes: notifications
    },
    {
      id: 'marketing',
      labelKey: 'saas.marketing',
      icon: Gift,
      // Includes: coupons, referrals
    },
    {
      id: 'reports',
      labelKey: 'saas.reports',
      icon: BarChart3,
      // Includes: analytics
    },
    {
      id: 'settings',
      labelKey: 'saas.settings',
      icon: Settings,
      // Includes: modules, webhooks
    },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Navigate to route
    if (tabId === 'dashboard') {
      navigate('/saas');
    } else {
      navigate(`/saas/${tabId}`);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SaaSDashboard />;
      case 'subscribers':
        return <Subscribers />;
      case 'packages':
        return <Packages />;
      case 'agents':
        return <Agents />;
      case 'white-label':
        return <WhiteLabel />;
      case 'payments':
        return <Payments />;
      case 'support':
        return <Support />;
      case 'marketing':
        return <Marketing />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SaaSSettings />;
      default:
        return <SaaSDashboard />;
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
