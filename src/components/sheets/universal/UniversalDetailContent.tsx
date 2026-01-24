/**
 * UniversalDetailContent - منطقة المحتوى الموحدة
 * تعرض محتوى التبويب المحدد مع دعم الإحصائيات
 */

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import {
  type SheetConfig,
  type DocType,
  type StatCardConfig,
  type NestedSheetConfig,
} from '../configs/sheet.types';

interface UniversalDetailContentProps {
  config: SheetConfig;
  data: any;
  activeTab: string;
  language: string;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
  loading?: boolean;
  onRowClick?: (config: NestedSheetConfig) => void;
  onRefresh?: () => void;
}

const resolveLabel = (label: string, _labelAr: string | undefined, t: (key: string) => string, _isArabic: boolean) => {
  // Always use translation system - label should be a translation key
  return t(label);
};

// Stats Card Component
function StatsCard({ stat, data, language, t }: {
  stat: StatCardConfig;
  data: any;
  language: string;
  t: (key: string) => string;
}) {
  const isArabic = language === 'ar';
  const Icon = stat.icon;
  const value = stat.value(data);
  const label = resolveLabel(stat.label, stat.labelAr, t, isArabic);
  const formattedValue = stat.format ? stat.format(value, data) : value;

  const colorClasses: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  const iconBgClasses: Record<string, string> = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
    gray: 'text-gray-500',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className={cn(
            'text-2xl font-bold font-mono mt-1',
            stat.color ? colorClasses[stat.color] : 'text-gray-900 dark:text-white'
          )}>
            {typeof formattedValue === 'number' 
              ? formattedValue.toLocaleString('en-US')
              : formattedValue}
          </p>
        </div>
        {Icon && (
          <Icon className={cn('w-8 h-8', stat.color ? iconBgClasses[stat.color] : 'text-gray-400')} />
        )}
      </div>
    </div>
  );
}

// Stats Grid Component
function StatsGrid({ stats, data, language, t }: {
  stats: StatCardConfig[];
  data: any;
  language: string;
  t: (key: string) => string;
}) {
  if (!stats || stats.length === 0) return null;

  const gridCols = Math.min(stats.length, 4);
  
  return (
    <div className={cn(
      'grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50',
      `grid-cols-${gridCols}`,
      stats.length === 1 && 'grid-cols-1',
      stats.length === 2 && 'grid-cols-2',
      stats.length === 3 && 'grid-cols-3',
      stats.length >= 4 && 'grid-cols-4'
    )}>
      {stats.map((stat) => (
        <StatsCard 
          key={stat.key} 
          stat={stat} 
          data={data} 
          language={language}
          t={t}
        />
      ))}
    </div>
  );
}

export function UniversalDetailContent({
  config,
  data,
  activeTab,
  language,
  t,
  direction: _direction,
  loading = false,
  onRowClick,
  onRefresh,
}: UniversalDetailContentProps) {
  // Find active tab component
  const activeTabConfig = config.tabs.find(tab => tab.id === activeTab);
  
  if (!activeTabConfig) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        {t('common.noData')}
      </div>
    );
  }

  const TabComponent = activeTabConfig.component;

  // Handle row click from tab content
  const handleRowClick = (row: any, rowDocType: DocType) => {
    if (config.onRowClick && onRowClick) {
      const nestedConfig = config.onRowClick(row, rowDocType);
      if (nestedConfig) {
        onRowClick(nestedConfig);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats Cards */}
      {config.stats && config.stats.length > 0 && activeTab === config.defaultTab && (
        <StatsGrid 
          stats={config.stats} 
          data={data}
          language={language}
          t={t}
        />
      )}
      
      {/* Tab Content */}
      <ScrollArea className="flex-1">
        <div className="h-full">
          <TabComponent
            data={data}
            docType={config.docType}
            language={language}
            t={t}
            onRowClick={handleRowClick}
            onRefresh={onRefresh}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

export default UniversalDetailContent;
