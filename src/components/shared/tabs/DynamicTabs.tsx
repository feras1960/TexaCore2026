import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';

// Tab Data Interface
export interface DynamicTab {
  id: string;
  title: string;
  type: 'invoice' | 'payment' | 'journal' | 'receipt' | 'account' | 'product' | 'custom';
  data?: any;
  closable?: boolean;
}

// Hook Return Type
interface UseDynamicTabsReturn {
  tabs: DynamicTab[];
  activeTab: string | null;
  setActiveTab: (id: string | null) => void;
  addTab: (tab: DynamicTab) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  backToMain: () => void;
  hasOpenTabs: boolean;
  activeTabData: DynamicTab | undefined;
  updateTab: (id: string, updates: Partial<DynamicTab>) => void;
}

// Custom Hook for Dynamic Tabs Management
export function useDynamicTabs(initialTabs: DynamicTab[] = []): UseDynamicTabsReturn {
  const [tabs, setTabs] = useState<DynamicTab[]>(initialTabs);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const addTab = useCallback((tab: DynamicTab) => {
    setTabs(prev => {
      // Check if tab already exists
      const existingTab = prev.find(t => t.id === tab.id);
      if (existingTab) {
        // Just focus the existing tab
        setActiveTab(tab.id);
        return prev;
      }
      // Add new tab
      const newTab = { ...tab, closable: tab.closable ?? true };
      setActiveTab(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      // If closing active tab, switch to last tab or null
      if (activeTab === id) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTab(lastTab?.id ?? null);
      }
      return newTabs;
    });
  }, [activeTab]);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTab(null);
  }, []);

  const backToMain = useCallback(() => {
    setActiveTab(null);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<DynamicTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === id ? { ...tab, ...updates } : tab
    ));
  }, []);

  const activeTabData = tabs.find(t => t.id === activeTab);
  const hasOpenTabs = tabs.length > 0;

  return {
    tabs,
    activeTab,
    setActiveTab,
    addTab,
    closeTab,
    closeAllTabs,
    backToMain,
    hasOpenTabs,
    activeTabData,
    updateTab,
  };
}

// Dynamic Tabs Bar Component
interface DynamicTabsBarProps {
  tabs: DynamicTab[];
  activeTab: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  mainTabLabel?: string;
  onMainTabClick?: () => void;
  showMainTab?: boolean;
  className?: string;
}

export function DynamicTabsBar({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose,
  mainTabLabel,
  onMainTabClick,
  showMainTab = true,
  className,
}: DynamicTabsBarProps) {
  const { t } = useLanguage();

  if (tabs.length === 0 && !showMainTab) return null;

  return (
    <div className={cn(
      'flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide',
      className
    )}>
      {/* Main Tab */}
      {showMainTab && (
        <button
          onClick={onMainTabClick}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
            activeTab === null
              ? 'bg-white dark:bg-gray-700 text-erp-navy dark:text-white shadow-sm'
              : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50'
          )}
        >
          {mainTabLabel || t('tabs.overview')}
        </button>
      )}

      {/* Dynamic Tabs */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap group',
              isActive
                ? 'bg-white dark:bg-gray-700 text-erp-navy dark:text-white shadow-sm'
                : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50'
            )}
          >
            <span>{tab.title}</span>
            {tab.closable !== false && (
              <X
                className="w-3 h-3 opacity-50 group-hover:opacity-100 hover:text-erp-error transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
