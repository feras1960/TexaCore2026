/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 SaaS Management Module Main Page
 * ════════════════════════════════════════════════════════════════
 *
 * ⚡ PERFORMANCE PATTERN: "Keep Visited Mounted"
 * Only visited tabs get mounted. After first visit, they stay in DOM.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Layers,
  Settings,
  Crown,
  Megaphone,
  Key,
} from 'lucide-react';

// Direct imports for instant switching
import { SaaSDashboard } from './SaaSDashboard';
import PlatformsTab from './PlatformsTab';
import PlatformAnnouncementsTab from './PlatformAnnouncementsTab';
import LicensingTab from './LicensingTab';
import SaaSSettings from './Settings';

interface TabConfig {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

export default function SaaS() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const getActiveTab = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/saas')) {
      if (path === '/saas' || path === '/saas/') return 'dashboard';
      if (path.includes('/platforms')) return 'platforms';
      if (path.includes('/announcements')) return 'announcements';
      if (path.includes('/licensing')) return 'licensing';
      if (path.includes('/settings') || path.includes('/webhooks')) return 'settings';
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

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'dashboard', labelKey: 'saas.dashboard.label', icon: LayoutDashboard, component: SaaSDashboard },
    { id: 'platforms', labelKey: 'saas.platforms', icon: Layers, component: PlatformsTab },
    { id: 'announcements', labelKey: 'saas.announcements', icon: Megaphone, component: PlatformAnnouncementsTab },
    { id: 'licensing', labelKey: 'saas.licensing', icon: Key, component: LicensingTab },
    { id: 'settings', labelKey: 'saas.settings', icon: Settings, component: SaaSSettings },
  ], [language]);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setVisitedTabs(prev => {
        if (prev.has(tabId)) return prev;
        return new Set(prev).add(tabId);
      });
      const path = tabId === 'dashboard' ? '/saas' : `/saas/${tabId}`;
      navigate(path, { replace: true });
    }
  }, [activeTab, navigate]);

  const tabsForBar = useMemo(() =>
    tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })) as { id: string; labelKey: string; icon?: any }[],
    [tabs]
  );

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-erp-teal"></div>
        <p className="mt-4 text-gray-500 font-tajawal">{t('common.loading')}</p>
      </div>
    );
  }

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
        <Button className="mt-6 bg-erp-navy hover:bg-erp-navy/90" onClick={() => navigate('/')}>
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </Button>
      </div>
    );
  }

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
