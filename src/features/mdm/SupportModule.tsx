import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  MonitorSmartphone,
  FolderOpen,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';

// Placeholders for the tabs
import { DeviceList } from './components/DeviceList';

const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px]">
    <LayoutGrid className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
    <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 font-cairo">
      {title}
    </h3>
    <p className="text-gray-400 dark:text-gray-500 mt-2 font-tajawal">
      قيد التطوير...
    </p>
  </div>
);

interface TabConfig {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

export default function SupportModule() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Note: Company Admins can also access this, so we don't strictly block them,
  // but we will filter data based on their role later.
  // We can use isSuperAdmin to determine if they see all companies or just theirs.
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const getActiveTab = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/support')) {
      if (path === '/support' || path === '/support/') return 'devices';
      if (path.includes('/files')) return 'files';
      if (path.includes('/screens')) return 'screens';
      return 'devices';
    }
    return 'devices';
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
    { 
      id: 'devices', 
      labelKey: language === 'ar' ? 'إدارة الكمبيوترات' : 'Computers', 
      icon: MonitorSmartphone, 
      component: DeviceList 
    },
    { 
      id: 'screens', 
      labelKey: language === 'ar' ? 'المراقبة والشاشات' : 'Screens', 
      icon: LayoutGrid, 
      component: () => <PlaceholderTab title={language === 'ar' ? 'شاشات المراقبة' : 'Monitoring Screens'} /> 
    },
    { 
      id: 'files', 
      labelKey: language === 'ar' ? 'مدير الملفات' : 'File Manager', 
      icon: FolderOpen, 
      component: () => <PlaceholderTab title={language === 'ar' ? 'مدير الملفات' : 'File Manager'} /> 
    },
  ], [language]);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setVisitedTabs(prev => {
        if (prev.has(tabId)) return prev;
        return new Set(prev).add(tabId);
      });
      const path = tabId === 'devices' ? '/support' : `/support/${tabId}`;
      navigate(path, { replace: true });
    }
  }, [activeTab, navigate]);

  const tabsForBar = useMemo(() =>
    tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon: icon as any })),
    [tabs]
  );

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-erp-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Tabs */}
      <MainTabsBar
        tabs={tabsForBar}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
      />

      {/* Content Area */}
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
