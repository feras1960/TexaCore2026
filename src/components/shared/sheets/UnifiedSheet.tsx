import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Edit, LucideIcon, Eye, Book, Receipt, DollarSign, Calendar, Brain, Activity } from 'lucide-react';

// Main Tab Types
export type MainTabType = 'overview' | 'ledger' | 'invoices' | 'payments' | 'reservations' | 'ai-analysis' | 'events';

export interface MainTab {
  id: MainTabType;
  labelKey: string;
  icon: LucideIcon;
}

export const DEFAULT_MAIN_TABS: MainTab[] = [
  { id: 'overview', labelKey: 'tabs.overview', icon: Eye },
  { id: 'ledger', labelKey: 'tabs.ledger', icon: Book },
  { id: 'invoices', labelKey: 'tabs.invoices', icon: Receipt },
  { id: 'payments', labelKey: 'tabs.payments', icon: DollarSign },
  { id: 'reservations', labelKey: 'tabs.reservations', icon: Calendar },
  { id: 'ai-analysis', labelKey: 'tabs.aiAnalysis', icon: Brain },
  { id: 'events', labelKey: 'tabs.events', icon: Activity },
];

// Document Tab Interface
export interface DocumentTab {
  id: string;
  title: string;
  type: 'invoice' | 'payment' | 'journal' | 'receipt';
  closable?: boolean;
}

// Stat Card Interface
export interface SheetStatCard {
  labelKey: string;
  value: number | string;
  colorClass: string;
  valueColorClass: string;
}

// Badge Interface
export interface SheetBadge {
  text: string;
  colorClass: string;
}

// Balance Interface
export interface SheetBalance {
  value: number;
  labelKey?: string;
  currencyKey?: string;
}

// Sheet Size
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_CLASSES: Record<SheetSize, string> = {
  sm: '!w-[400px] !max-w-[400px]',
  md: '!w-[500px] !max-w-[500px]',
  lg: '!w-[60%] !max-w-none',
  xl: '!w-[75%] !max-w-none',
  full: '!w-[90%] !max-w-none',
};

interface UnifiedSheetProps {
  isOpen: boolean;
  onClose: () => void;
  size?: SheetSize;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: SheetBadge;
  balance?: SheetBalance;
  mainTabs?: MainTab[];
  activeMainTab?: MainTabType;
  onMainTabChange?: (tab: MainTabType) => void;
  documentTabs?: DocumentTab[];
  activeDocumentTab?: string | null;
  onDocumentTabSelect?: (id: string) => void;
  onDocumentTabClose?: (id: string) => void;
  stats?: SheetStatCard[];
  onEdit?: () => void;
  children: React.ReactNode;
}

export function UnifiedSheet({
  isOpen,
  onClose,
  size = 'lg',
  icon: Icon,
  title,
  subtitle,
  badge,
  balance,
  mainTabs,
  activeMainTab,
  onMainTabChange,
  documentTabs,
  activeDocumentTab,
  onDocumentTabSelect,
  onDocumentTabClose,
  stats,
  onEdit,
  children,
}: UnifiedSheetProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        className={cn(
          'p-0 bg-gray-50 dark:bg-gray-900 z-[9999] flex flex-col',
          SIZE_CLASSES[size]
        )}
      >
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="bg-gradient-to-br from-erp-navy to-erp-teal p-2.5 rounded-xl text-white shadow-lg">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-erp-navy dark:text-white font-cairo">
                    {title}
                  </h2>
                  {badge && (
                    <Badge className={cn('text-xs', badge.colorClass)}>
                      {badge.text}
                    </Badge>
                  )}
                </div>
                {subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Balance + Actions */}
            <div className="flex items-center gap-3">
              {balance && (
                <div className="text-end">
                  {balance.labelKey && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t(balance.labelKey)}
                    </p>
                  )}
                  <p className="text-xl font-bold text-erp-navy dark:text-white font-cairo">
                    {balance.value.toLocaleString('en-US')}
                    {balance.currencyKey && (
                      <span className="text-sm font-normal ms-1 text-gray-500">
                        {t(balance.currencyKey)}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4 me-1" />
                  {t('common.edit')}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        {mainTabs && mainTabs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {mainTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeMainTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onMainTabChange?.(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap',
                      isActive
                        ? 'border-erp-teal text-erp-teal'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    <TabIcon className="w-4 h-4" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Document Tabs */}
        {documentTabs && documentTabs.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {documentTabs.map((tab) => {
                const isActive = activeDocumentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onDocumentTabSelect?.(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-white dark:bg-gray-700 text-erp-navy dark:text-white shadow-sm'
                        : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <span>{tab.title}</span>
                    {tab.closable && (
                      <X
                        className="w-3 h-3 hover:text-erp-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDocumentTabClose?.(tab.id);
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && stats.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className={cn('grid gap-3', `grid-cols-${Math.min(stats.length, 4)}`)}>
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={cn('rounded-lg p-3', stat.colorClass)}
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t(stat.labelKey)}
                  </p>
                  <p className={cn('text-lg font-bold font-cairo', stat.valueColorClass)}>
                    {typeof stat.value === 'number'
                      ? stat.value.toLocaleString('en-US')
                      : stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {children}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-erp-navy dark:text-white mb-3 font-cairo">
          {title}
        </h3>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function InfoRow({ label, value, icon: Icon, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0', className)}>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-erp-navy dark:text-white">
        {value}
      </div>
    </div>
  );
}
