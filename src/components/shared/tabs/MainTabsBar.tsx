import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { LucideIcon } from 'lucide-react';

export interface MainTab {
  id: string;
  labelKey: string;
  icon?: LucideIcon;
  badge?: number | string;
  disabled?: boolean;
}

interface MainTabsBarProps {
  tabs: MainTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function MainTabsBar({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = 'underline',
}: MainTabsBarProps) {
  const { t } = useLanguage();

  const variantStyles = {
    default: {
      container: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
      tab: 'rounded-md',
      active: 'bg-white dark:bg-gray-700 shadow-sm',
      inactive: 'hover:bg-white/50 dark:hover:bg-gray-700/50',
    },
    pills: {
      container: 'gap-2',
      tab: 'rounded-full px-4',
      active: 'bg-erp-teal text-white',
      inactive: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
    },
    underline: {
      container: 'border-b border-gray-200 dark:border-gray-700',
      tab: 'border-b-2 -mb-px',
      active: 'border-erp-teal text-erp-teal',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-hide', styles.container, className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              styles.tab,
              isActive ? styles.active : styles.inactive,
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{t(tab.labelKey)}</span>
            {tab.badge !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                isActive 
                  ? 'bg-erp-teal/20 text-erp-teal' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
