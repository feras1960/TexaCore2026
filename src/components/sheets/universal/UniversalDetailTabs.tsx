/**
 * UniversalDetailTabs - شريط التبويبات الموحد
 * يعرض التبويبات مع دعم الأيقونات والشارات
 */

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
  styleVariant?: 'classic' | 'swiss';
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
  styleVariant = 'classic',
}: UniversalDetailTabsProps) {
  const _isArabic = language === 'ar';
  const isSwiss = styleVariant === 'swiss';

  // Filter visible tabs
  const visibleTabs = tabs.filter(tab => !tab.hidden || !tab.hidden(data));

  if (visibleTabs.length === 0) return null;

  const getTabLabel = (tab: SheetTab) => {
    // Always use translation system - label should be a translation key like 'tabs.overview'
    return t(tab.label);
  };

  const getTabBadge = (tab: SheetTab) => {
    if (!tab.badge) return null;
    const badgeValue = tab.badge(data);
    if (badgeValue === null || badgeValue === undefined || badgeValue === 0) return null;
    return badgeValue;
  };

  const getTabStyles = (isActive: boolean, isDisabled: boolean) => {
    const base = isSwiss
      ? 'inline-flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap min-h-[36px]'
      : 'flex items-center gap-1.5 font-medium transition-all whitespace-nowrap';
    
    switch (variant) {
      case 'pills':
        return cn(
          base,
          isSwiss ? 'px-3 py-1.5 rounded-md text-xs' : 'px-3 py-1.5 rounded-lg text-xs font-semibold',
          isActive
            ? (isSwiss
              ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]'
              : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md dark:from-teal-600 dark:to-cyan-700')
            : (isSwiss
              ? 'text-gray-600 hover:text-[#111111] hover:bg-[#F2F2F2] dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#1A1A1A]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'),
          isDisabled && 'opacity-50 cursor-not-allowed'
        );
      
      case 'underline':
        return cn(
          base,
          isSwiss ? 'px-3 py-2 text-sm border-b-2' : 'px-4 py-3 text-sm border-b-2',
          isActive
            ? (isSwiss
              ? 'border-[#111111] text-[#111111] dark:border-white dark:text-white'
              : 'border-erp-teal text-erp-teal dark:border-erp-teal dark:text-erp-teal')
            : (isSwiss
              ? 'border-transparent text-gray-500 hover:text-[#111111] dark:text-gray-400 dark:hover:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'),
          isDisabled && 'opacity-50 cursor-not-allowed'
        );
      
      default:
        return cn(
          base,
          isSwiss ? 'px-3 py-1.5 rounded-md text-xs' : 'px-3 py-1.5 rounded-lg text-xs',
          isActive
            ? (isSwiss
              ? 'bg-white text-[#111111] shadow-sm dark:bg-[#1A1A1A] dark:text-white'
              : 'bg-white text-erp-navy shadow-sm dark:bg-gray-700 dark:text-white')
            : (isSwiss
              ? 'text-gray-500 hover:text-[#111111] hover:bg-[#F2F2F2] dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#1A1A1A]'
              : 'text-white/70 hover:text-white hover:bg-white/10'),
          isDisabled && 'opacity-50 cursor-not-allowed'
        );
    }
  };

  const containerStyles = cn(
    isSwiss
      ? 'flex gap-1 overflow-x-auto scrollbar-hide min-h-[44px]'
      : 'flex gap-1 overflow-x-auto scrollbar-hide',
    variant === 'underline' 
      ? (isSwiss
        ? 'bg-transparent border-b border-[#E5E5E5] dark:border-[#222222] px-4'
        : 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4')
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
                    ? (isSwiss
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]'
                      : 'bg-erp-teal/20 text-erp-teal')
                    : (isSwiss
                      ? 'bg-[#F2F2F2] text-[#6B7280] dark:bg-[#1A1A1A] dark:text-[#9CA3AF]'
                      : 'bg-white/20 text-white/80')
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
