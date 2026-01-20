/**
 * UniversalDetailTabs - شريط التبويبات الموحد
 * يعرض التبويبات مع دعم الأيقونات والشارات
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { type SheetTab } from '../configs/sheet.types';

interface UniversalDetailTabsProps {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  data: any;
  language: string;
  t: (key: string) => string;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function UniversalDetailTabs({
  tabs,
  activeTab,
  onTabChange,
  data,
  language,
  t,
  className,
  variant = 'default',
}: UniversalDetailTabsProps) {
  const isArabic = language === 'ar';

  // Filter visible tabs
  const visibleTabs = tabs.filter(tab => !tab.hidden || !tab.hidden(data));

  if (visibleTabs.length === 0) return null;

  const getTabLabel = (tab: SheetTab) => {
    if (isArabic && tab.labelAr) return tab.labelAr;
    // Try to use translation if label looks like a key
    if (tab.label.includes('.')) return t(tab.label);
    return tab.label;
  };

  const getTabBadge = (tab: SheetTab) => {
    if (!tab.badge) return null;
    const badgeValue = tab.badge(data);
    if (badgeValue === null || badgeValue === undefined || badgeValue === 0) return null;
    return badgeValue;
  };

  const getTabStyles = (isActive: boolean, isDisabled: boolean) => {
    const base = 'flex items-center gap-1.5 font-medium transition-all whitespace-nowrap';
    
    switch (variant) {
      case 'pills':
        return cn(
          base,
          'px-3 py-1.5 rounded-lg text-xs font-semibold',
          isActive
            ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md dark:from-teal-600 dark:to-cyan-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700',
          isDisabled && 'opacity-50 cursor-not-allowed'
        );
      
      case 'underline':
        return cn(
          base,
          'px-4 py-3 text-sm border-b-2',
          isActive
            ? 'border-erp-teal text-erp-teal dark:border-erp-teal dark:text-erp-teal'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
          isDisabled && 'opacity-50 cursor-not-allowed'
        );
      
      default:
        return cn(
          base,
          'px-3 py-1.5 rounded-lg text-xs',
          isActive
            ? 'bg-white text-erp-navy shadow-sm dark:bg-gray-700 dark:text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10',
          isDisabled && 'opacity-50 cursor-not-allowed'
        );
    }
  };

  const containerStyles = cn(
    'flex gap-1 overflow-x-auto scrollbar-hide',
    variant === 'underline' 
      ? 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4'
      : 'mt-4 pb-1',
    className
  );

  return (
    <div className={containerStyles}>
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled ? tab.disabled(data) : false;
        const badgeValue = getTabBadge(tab);

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={getTabStyles(isActive, isDisabled)}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{getTabLabel(tab)}</span>
            {badgeValue !== null && (
              <Badge 
                variant="secondary"
                className={cn(
                  'text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center',
                  isActive 
                    ? 'bg-erp-teal/20 text-erp-teal' 
                    : 'bg-white/20 text-white/80'
                )}
              >
                {badgeValue}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default UniversalDetailTabs;
