/**
 * TenantModulesTab - تبويب الوحدات المفعلة للمشترك
 * يعرض قائمة الوحدات والميزات المتاحة
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Boxes,
  ShoppingCart,
  Users,
  FileText,
  BarChart3,
  Settings,
  Crown,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { type TabComponentProps } from '../../configs/sheet.types';

// Module Interface
interface Module {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  icon?: any;
  enabled: boolean;
  isPremium?: boolean;
  features?: string[];
}

// Default modules list
const DEFAULT_MODULES: Module[] = [
  {
    id: 'accounting',
    code: 'ACC',
    name: 'Accounting',
    nameAr: 'المحاسبة',
    description: 'General ledger, accounts, journal entries',
    descriptionAr: 'دفتر الأستاذ، الحسابات، القيود اليومية',
    icon: FileText,
    enabled: true,
    features: ['General Ledger', 'Chart of Accounts', 'Journal Entries', 'Financial Reports'],
  },
  {
    id: 'inventory',
    code: 'INV',
    name: 'Inventory',
    nameAr: 'المخزون',
    description: 'Stock management, warehouses, transfers',
    descriptionAr: 'إدارة المخزون، المستودعات، التحويلات',
    icon: Boxes,
    enabled: true,
    features: ['Stock Management', 'Multiple Warehouses', 'Stock Transfer', 'Valuation'],
  },
  {
    id: 'sales',
    code: 'SLS',
    name: 'Sales',
    nameAr: 'المبيعات',
    description: 'Customers, invoices, quotations',
    descriptionAr: 'الزبائن، الفواتير، عروض الأسعار',
    icon: ShoppingCart,
    enabled: true,
    features: ['Customer Management', 'Sales Invoices', 'Quotations', 'Returns'],
  },
  {
    id: 'hr',
    code: 'HR',
    name: 'Human Resources',
    nameAr: 'الموارد البشرية',
    description: 'Employees, payroll, attendance',
    descriptionAr: 'الموظفين، الرواتب، الحضور',
    icon: Users,
    enabled: false,
    isPremium: true,
    features: ['Employee Directory', 'Payroll', 'Attendance', 'Leave Management'],
  },
  {
    id: 'reports',
    code: 'RPT',
    name: 'Advanced Reports',
    nameAr: 'التقارير المتقدمة',
    description: 'Custom reports, dashboards, analytics',
    descriptionAr: 'تقارير مخصصة، لوحات تحكم، تحليلات',
    icon: BarChart3,
    enabled: false,
    isPremium: true,
    features: ['Custom Reports', 'Dashboards', 'Data Export', 'Scheduled Reports'],
  },
];

// Module Card Component
function ModuleCard({ 
  module, 
  language, 
  t,
  onToggle,
  canToggle = true,
}: { 
  module: Module; 
  language: string;
  t: (key: string) => string;
  onToggle?: (id: string, enabled: boolean) => void;
  canToggle?: boolean;
}) {
  const isArabic = language === 'ar';
  const Icon = module.icon || Settings;

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border p-4 transition-all',
      module.enabled 
        ? 'border-erp-teal/50 dark:border-erp-teal/30'
        : 'border-gray-200 dark:border-gray-700'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            module.enabled 
              ? 'bg-erp-teal/10 text-erp-teal'
              : 'bg-gray-100 dark:bg-gray-900/50 text-gray-400'
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {isArabic ? module.nameAr : module.name}
              </h4>
              <Badge variant="outline" className="text-xs font-mono">
                {module.code}
              </Badge>
              {module.isPremium && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                  <Crown className="w-3 h-3 me-1" />
                  {t('common.premium')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isArabic ? module.descriptionAr : module.description}
            </p>
          </div>
        </div>

        {canToggle ? (
          <Switch
            checked={module.enabled}
            onCheckedChange={(checked) => onToggle?.(module.id, checked)}
            disabled={module.isPremium && !module.enabled}
          />
        ) : (
          <Badge className={cn(
            'text-xs',
            module.enabled 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
          )}>
            {module.enabled 
              ? t('status.enabled')
              : t('status.disabled')
            }
          </Badge>
        )}
      </div>

      {/* Features List */}
      {module.features && module.features.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {module.features.slice(0, 4).map((feature, idx) => (
              <span 
                key={idx}
                className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  module.enabled 
                    ? 'bg-erp-teal/10 text-erp-teal'
                    : 'bg-gray-100 dark:bg-gray-900/50 text-gray-500'
                )}
              >
                {module.enabled ? (
                  <Check className="w-3 h-3 inline me-1" />
                ) : (
                  <X className="w-3 h-3 inline me-1" />
                )}
                {feature}
              </span>
            ))}
            {module.features.length > 4 && (
              <span className="text-xs text-gray-400">
                +{module.features.length - 4} {t('common.more')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TenantModulesTab({ data, docType: _docType, language, t, onRefresh: _onRefresh }: TabComponentProps) {
  // Get modules from data or use defaults
  const modules: Module[] = useMemo(() => {
    if (data.modules && Array.isArray(data.modules)) {
      return data.modules.map((m: any) => ({
        ...DEFAULT_MODULES.find(dm => dm.id === m.id || dm.code === m.code) || {},
        ...m,
      }));
    }
    if (data.enabled_modules && Array.isArray(data.enabled_modules)) {
      return DEFAULT_MODULES.map(m => ({
        ...m,
        enabled: data.enabled_modules.includes(m.id) || data.enabled_modules.includes(m.code),
      }));
    }
    return DEFAULT_MODULES;
  }, [data]);

  // Stats
  const enabledCount = modules.filter(m => m.enabled).length;
  const premiumCount = modules.filter(m => m.isPremium && m.enabled).length;

  // Handle module toggle
  const handleToggle = (_id: string, _enabled: boolean) => {
    // TODO: Implement API call to update module status
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-erp-teal" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('modules.modulesAndFeatures')}
            </h3>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 me-1" />
            {t('actions.addModule')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {t('modules.totalModules')}
            </div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {modules.length}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400">
              {t('status.enabled')}
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {enabledCount}
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <div className="text-xs text-amber-600 dark:text-amber-400">
              {t('common.premium')}
            </div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {premiumCount}
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              language={language}
              t={t}
              onToggle={handleToggle}
              canToggle={false} // Set to true to allow toggling
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

export default TenantModulesTab;
