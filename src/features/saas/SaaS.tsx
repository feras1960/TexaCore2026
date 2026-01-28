/**
 * SaaS Management Module Main Page
 * Main page with tabs for all SaaS management features
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
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
  TrendingUp,
  Crown
} from 'lucide-react';

// Import components
import Agents from './Agents';
import Subscribers from './Subscribers';
import { SaaSDashboard } from './SaaSDashboard';
import Packages from './Packages';
import Payments from './Payments';
import WhiteLabel from './WhiteLabel';
import Support from './Support';
import Marketing from './Marketing';
import Reports from './Reports';
import SaaSSettings from './Settings';

export default function SaaS() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useAuth();

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

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-erp-teal"></div>
        <p className="mt-4 text-gray-500 font-tajawal">{t('common.loading')}</p>
      </div>
    );
  }

  // Check Super Admin permission
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
          <Crown className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo mb-2">
          {t('saas.tenants.error.noPermission')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-tajawal max-w-md text-center">
          {language === 'ar' 
            ? 'عذراً، لا تمتلك صلاحيات المدير العام للوصول إلى إدارة النظام. يرجى التواصل مع الإدارة.' 
            : 'Sorry, you do not have Super Admin permissions to access the SaaS management section. Please contact administration.'}
        </p>
        <Button 
          className="mt-6 bg-erp-navy hover:bg-erp-navy/90"
          onClick={() => navigate('/')}
        >
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </Button>
      </div>
    );
  }

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
