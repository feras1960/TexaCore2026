/**
 * ActivityFilters Component
 * فلاتر البحث في سجل الأحداث
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  X, 
  Calendar as CalendarIcon,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AuditLogFilters } from '@/services/systemService';
import { cn } from '@/lib/utils';

interface ActivityFiltersProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onRefresh: () => void;
  entityTypes: string[];
  actions: string[];
  loading?: boolean;
}

// ترجمة أنواع الكيانات
const entityTypeLabels: Record<string, { ar: string; en: string }> = {
  customers: { ar: 'العملاء', en: 'Customers' },
  suppliers: { ar: 'الموردين', en: 'Suppliers' },
  products: { ar: 'المنتجات', en: 'Products' },
  chart_of_accounts: { ar: 'دليل الحسابات', en: 'Chart of Accounts' },
  journal_entries: { ar: 'القيود المحاسبية', en: 'Journal Entries' },
  sales_invoices: { ar: 'فواتير المبيعات', en: 'Sales Invoices' },
  purchase_invoices: { ar: 'فواتير المشتريات', en: 'Purchase Invoices' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  receipts: { ar: 'المقبوضات', en: 'Receipts' },
  companies: { ar: 'الشركات', en: 'Companies' },
  user_profiles: { ar: 'المستخدمين', en: 'Users' },
  documents: { ar: 'المستندات', en: 'Documents' },
  inventory_movements: { ar: 'حركات المخزون', en: 'Inventory Movements' },
  tenants: { ar: 'المشتركين', en: 'Tenants' },
  agents: { ar: 'الوكلاء', en: 'Agents' },
  subscriptions: { ar: 'الاشتراكات', en: 'Subscriptions' },
};

// ترجمة أنواع الإجراءات
const actionLabels: Record<string, { ar: string; en: string }> = {
  create: { ar: 'إنشاء', en: 'Create' },
  update: { ar: 'تعديل', en: 'Update' },
  delete: { ar: 'حذف', en: 'Delete' },
  login: { ar: 'تسجيل دخول', en: 'Login' },
  logout: { ar: 'تسجيل خروج', en: 'Logout' },
  import: { ar: 'استيراد', en: 'Import' },
  export: { ar: 'تصدير', en: 'Export' },
  status_change: { ar: 'تغيير حالة', en: 'Status Change' },
  permission_change: { ar: 'تغيير صلاحيات', en: 'Permission Change' },
  view: { ar: 'عرض', en: 'View' },
};

// ترجمة مستويات الخطورة
const severityLabels: Record<string, { ar: string; en: string }> = {
  info: { ar: 'معلومات', en: 'Info' },
  warning: { ar: 'تحذير', en: 'Warning' },
  error: { ar: 'خطأ', en: 'Error' },
  critical: { ar: 'حرج', en: 'Critical' },
};

export function ActivityFilters({
  filters,
  onFiltersChange,
  onRefresh,
  entityTypes,
  actions,
  loading
}: ActivityFiltersProps) {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  const handleDateChange = (key: 'start_date' | 'end_date', date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: date ? format(date, 'yyyy-MM-dd') : undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className="space-y-4">
      {/* الصف الأول: البحث والتحديث */}
      <div className="flex flex-wrap items-center gap-3">
        {/* البحث */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={language === 'ar' ? 'بحث في السجل...' : 'Search logs...'}
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
            className={cn(isRTL ? "pr-9" : "pl-9")}
          />
        </div>

        {/* زر التحديث */}
        <Button 
          variant="outline" 
          size="icon"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>

        {/* زر مسح الفلاتر */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 me-1" />
            {language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
          </Button>
        )}
      </div>

      {/* الصف الثاني: الفلاتر */}
      <div className="flex flex-wrap items-center gap-3">
        {/* نوع الإجراء */}
        <Select
          value={filters.action || 'all'}
          onValueChange={(value) => handleFilterChange('action', value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={language === 'ar' ? 'الإجراء' : 'Action'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {language === 'ar' ? 'كل الإجراءات' : 'All Actions'}
            </SelectItem>
            {actions.map(action => (
              <SelectItem key={action} value={action}>
                {actionLabels[action]?.[language] || action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* نوع الكيان */}
        <Select
          value={filters.entity_type || 'all'}
          onValueChange={(value) => handleFilterChange('entity_type', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={language === 'ar' ? 'نوع البيانات' : 'Entity Type'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {language === 'ar' ? 'كل الأنواع' : 'All Types'}
            </SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>
                {entityTypeLabels[type]?.[language] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* مستوى الخطورة */}
        <Select
          value={filters.severity || 'all'}
          onValueChange={(value) => handleFilterChange('severity', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={language === 'ar' ? 'الخطورة' : 'Severity'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {language === 'ar' ? 'كل المستويات' : 'All Levels'}
            </SelectItem>
            {Object.entries(severityLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label[language]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* من تاريخ */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-start">
              <CalendarIcon className="h-4 w-4 me-2" />
              {filters.start_date 
                ? format(new Date(filters.start_date), 'yyyy/MM/dd')
                : (language === 'ar' ? 'من تاريخ' : 'From date')
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.start_date ? new Date(filters.start_date) : undefined}
              onSelect={(date) => handleDateChange('start_date', date)}
              locale={language === 'ar' ? ar : undefined}
            />
          </PopoverContent>
        </Popover>

        {/* إلى تاريخ */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-start">
              <CalendarIcon className="h-4 w-4 me-2" />
              {filters.end_date 
                ? format(new Date(filters.end_date), 'yyyy/MM/dd')
                : (language === 'ar' ? 'إلى تاريخ' : 'To date')
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.end_date ? new Date(filters.end_date) : undefined}
              onSelect={(date) => handleDateChange('end_date', date)}
              locale={language === 'ar' ? ar : undefined}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export default ActivityFilters;

// تصدير الثوابت للاستخدام في مكونات أخرى
export { entityTypeLabels, actionLabels, severityLabels };
