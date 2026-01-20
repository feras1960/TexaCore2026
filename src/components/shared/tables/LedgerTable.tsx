/**
 * LedgerTable - جدول دفتر الأستاذ المحسّن
 * نسخة محسّنة من NexaTable مع ميزات محاسبية متقدمة
 * 
 * الميزات:
 * - فلاتر متقدمة (تاريخ، عملة، حالة، بحث)
 * - أزرار سريعة (اليوم، أمس، هذا الأسبوع...)
 * - بطاقات إحصائية ملونة
 * - تلوين تلقائي للأرقام المالية
 * - Checkboxes للتحديد المتعدد
 * - Badges ملونة للحالات
 * - صف إجمالي مميز
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { 
  ChevronDown, 
  ChevronUp, 
  Search,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  Filter,
  X,
  FileText,
  Loader2,
  AlertCircle,
  Maximize2,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

// ===== TYPES =====

export interface LedgerColumn<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;
  filterable?: boolean;
  
  // نوع العمود
  type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'reference' | 'checkbox';
  
  // للأرقام المالية
  colorize?: boolean;
  showZeroAs?: '-' | '0' | '0.00' | '';
  
  // للحالة
  statusConfig?: Record<string, { label: string; color: string }>;
  
  // للمرجع
  clickable?: boolean;
  
  // الفوتر
  footer?: 'sum' | 'average' | 'count' | ((data: T[]) => React.ReactNode);
  
  // التخصيص
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface LedgerFilters {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  status?: string;
  search?: string;
}

export interface LedgerStats {
  totalDebit?: number;
  totalCredit?: number;
  balance?: number;
  count?: number;
  pending?: number;
  label1?: { title: string; value: number | string; color?: 'green' | 'red' | 'blue' | 'gray' };
  label2?: { title: string; value: number | string; color?: 'green' | 'red' | 'blue' | 'gray' };
  label3?: { title: string; value: number | string; color?: 'green' | 'red' | 'blue' | 'gray' };
  label4?: { title: string; value: number | string; color?: 'green' | 'red' | 'blue' | 'gray' };
}

export interface QuickFilter {
  id: string;
  label: string;
  getDateRange: () => { from: string; to: string };
}

export interface LedgerTableProps<T> {
  // البيانات
  data: T[];
  columns: LedgerColumn<T>[];
  loading?: boolean;
  error?: string | null;
  
  // الفلاتر
  showFilters?: boolean;
  filters?: LedgerFilters;
  onFiltersChange?: (filters: LedgerFilters) => void;
  showQuickFilters?: boolean;
  customQuickFilters?: QuickFilter[];
  
  // الإحصائيات
  showStats?: boolean;
  stats?: LedgerStats;
  
  // التحديد
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  rowKey?: keyof T;
  
  // الأحداث
  onRowClick?: (row: T, index: number) => void;
  onReferenceClick?: (row: T) => void;
  onRefresh?: () => void;
  onExport?: (format: 'excel' | 'pdf' | 'csv') => void;
  onPrint?: () => void;
  onFullscreen?: () => void;
  
  // التخصيص
  variant?: 'default' | 'ledger' | 'payments' | 'invoices' | 'reservations';
  compactMode?: boolean;
  stickyHeader?: boolean;
  stickyFooter?: boolean;
  showRowNumbers?: boolean;
  showFooterTotals?: boolean;
  footerLabel?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  
  // العملات
  currencies?: { value: string; label: string }[];
  defaultCurrency?: string;
  
  // الحالات
  statuses?: { value: string; label: string }[];
}

// ===== DEFAULT QUICK FILTERS =====
const defaultQuickFilters: QuickFilter[] = [
  {
    id: 'today',
    label: 'اليوم',
    getDateRange: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return { from: today, to: today };
    }
  },
  {
    id: 'yesterday',
    label: 'أمس',
    getDateRange: () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      return { from: yesterday, to: yesterday };
    }
  },
  {
    id: 'thisWeek',
    label: 'هذا الأسبوع',
    getDateRange: () => ({
      from: format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    })
  },
  {
    id: 'thisMonth',
    label: 'هذا الشهر',
    getDateRange: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    id: 'thisYear',
    label: 'هذه السنة',
    getDateRange: () => ({
      from: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      to: format(endOfYear(new Date()), 'yyyy-MM-dd')
    })
  }
];

// ===== STATUS COLORS =====
const defaultStatusColors: Record<string, { label: string; color: string }> = {
  posted: { label: 'مؤكد', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  draft: { label: 'مسودة', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  paid: { label: 'مدفوع', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  partial: { label: 'مدفوع جزئياً', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  unpaid: { label: 'غير مدفوع', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'ملغى', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  active: { label: 'نشط', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'معلق', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

// ===== MAIN COMPONENT =====
export function LedgerTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error = null,
  showFilters = true,
  filters: externalFilters,
  onFiltersChange,
  showQuickFilters = true,
  customQuickFilters,
  showStats = true,
  stats,
  selectable = false,
  selectedRows: externalSelectedRows,
  onSelectionChange,
  rowKey = 'id' as keyof T,
  onRowClick,
  onReferenceClick,
  onRefresh,
  onExport,
  onPrint,
  onFullscreen,
  variant = 'default',
  compactMode = false,
  stickyHeader = true,
  stickyFooter = true,
  showRowNumbers = true,
  showFooterTotals = true,
  footerLabel,
  emptyMessage,
  emptyIcon,
  className,
  currencies = [
    { value: 'SAR', label: 'ريال سعودي - SAR' },
    { value: 'USD', label: 'دولار أمريكي - USD' },
    { value: 'EUR', label: 'يورو - EUR' },
  ],
  defaultCurrency = 'SAR',
  statuses = [
    { value: 'all', label: 'الكل' },
    { value: 'posted', label: 'مؤكد' },
    { value: 'draft', label: 'مسودة' },
  ],
}: LedgerTableProps<T>) {
  const { t, direction, language } = useLanguage();
  
  // Internal state
  const [internalFilters, setInternalFilters] = useState<LedgerFilters>({
    dateFrom: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    currency: defaultCurrency,
    status: 'all',
    search: '',
  });
  const [internalSelectedRows, setInternalSelectedRows] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  
  // Use external or internal state
  const filters = externalFilters || internalFilters;
  const selectedRows = externalSelectedRows || internalSelectedRows;
  const quickFilters = customQuickFilters || defaultQuickFilters;
  
  // Handlers
  const handleFiltersChange = useCallback((newFilters: Partial<LedgerFilters>) => {
    const updated = { ...filters, ...newFilters };
    if (onFiltersChange) {
      onFiltersChange(updated);
    } else {
      setInternalFilters(updated);
    }
    setActiveQuickFilter(null);
  }, [filters, onFiltersChange]);
  
  const handleQuickFilter = useCallback((filter: QuickFilter) => {
    const range = filter.getDateRange();
    handleFiltersChange({ dateFrom: range.from, dateTo: range.to });
    setActiveQuickFilter(filter.id);
  }, [handleFiltersChange]);
  
  const handleSelectionChange = useCallback((ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedRows(ids);
    }
  }, [onSelectionChange]);
  
  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === data.length) {
      handleSelectionChange([]);
    } else {
      handleSelectionChange(data.map(row => String(row[rowKey])));
    }
  }, [selectedRows, data, rowKey, handleSelectionChange]);
  
  const handleSelectRow = useCallback((rowId: string) => {
    if (selectedRows.includes(rowId)) {
      handleSelectionChange(selectedRows.filter(id => id !== rowId));
    } else {
      handleSelectionChange([...selectedRows, rowId]);
    }
  }, [selectedRows, handleSelectionChange]);
  
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);
  
  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(row => {
        return columns.some(col => {
          const val = row[col.key as keyof T];
          return String(val || '').toLowerCase().includes(query);
        });
      });
    }
    
    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [data, filters.search, sortConfig, columns]);
  
  // Calculate footer
  const calculateFooter = useCallback((column: LedgerColumn<T>) => {
    if (!column.footer) return null;
    
    const values = filteredData.map(row => {
      const val = row[column.key as keyof T];
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    });
    
    if (column.footer === 'sum') {
      return values.reduce((a, b) => a + b, 0);
    }
    if (column.footer === 'average') {
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
    if (column.footer === 'count') {
      return filteredData.length;
    }
    if (typeof column.footer === 'function') {
      return column.footer(filteredData);
    }
    return null;
  }, [filteredData]);
  
  const hasFooter = columns.some(col => col.footer);
  
  // Render cell value
  const renderCellValue = useCallback((column: LedgerColumn<T>, value: any, row: T, index: number) => {
    // Custom render
    if (column.render) {
      return column.render(value, row, index);
    }
    
    // Type-based rendering
    switch (column.type) {
      case 'currency':
      case 'number':
        const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
        if (numVal === 0 && column.showZeroAs !== undefined) {
          return <span className="text-gray-300 dark:text-gray-600">{column.showZeroAs}</span>;
        }
        const formatted = numVal.toLocaleString('en-US', { minimumFractionDigits: 2 });
        if (column.colorize) {
          return (
            <span className={cn(
              'font-mono font-medium',
              numVal > 0 && 'text-green-600 dark:text-green-400',
              numVal < 0 && 'text-red-600 dark:text-red-400'
            )}>
              {numVal > 0 ? '+' : ''}{formatted}
            </span>
          );
        }
        return <span className="font-mono">{formatted}</span>;
        
      case 'date':
        return <span className="font-mono text-xs">{value}</span>;
        
      case 'status':
        const statusKey = String(value).toLowerCase();
        const statusConfig = column.statusConfig || defaultStatusColors;
        const status = statusConfig[statusKey] || { label: value, color: 'bg-gray-100 text-gray-700' };
        return (
          <span className={cn('px-2 py-1 rounded-md text-xs font-medium', status.color)}>
            {language === 'ar' ? status.label : value}
          </span>
        );
        
      case 'reference':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReferenceClick?.(row);
            }}
            className="font-mono text-xs text-erp-teal hover:text-erp-teal/80 hover:underline"
          >
            {value}
          </button>
        );
        
      default:
        return String(value ?? '');
    }
  }, [language, onReferenceClick]);
  
  // Stat card color
  const getStatColor = (color?: 'green' | 'red' | 'blue' | 'gray') => {
    switch (color) {
      case 'green': return 'text-green-600 dark:text-green-400';
      case 'red': return 'text-red-600 dark:text-red-400';
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-900 dark:text-white';
    }
  };
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          {onRefresh && (
            <Button variant="outline" className="mt-3" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 me-2" />
              {t('common.refresh')}
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('flex flex-col h-full', className)} dir={direction}>
      {/* Filters Bar */}
      {showFilters && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date From */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('common.from')}</span>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFiltersChange({ dateFrom: e.target.value })}
                className="h-8 w-36 text-sm"
              />
            </div>
            
            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('common.to')}</span>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFiltersChange({ dateTo: e.target.value })}
                className="h-8 w-36 text-sm"
              />
            </div>
            
            {/* Currency */}
            <Select
              value={filters.currency || defaultCurrency}
              onValueChange={(value) => handleFiltersChange({ currency: value })}
            >
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder={t('common.currency')} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status (optional based on variant) */}
            {(variant === 'ledger' || variant === 'payments' || variant === 'invoices') && (
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFiltersChange({ status: value })}
              >
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t('common.search') + '...'}
                value={filters.search || ''}
                onChange={(e) => handleFiltersChange({ search: e.target.value })}
                className="ps-9 h-8 text-sm"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {onExport && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
              )}
              {onExport && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onExport('csv')}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {onPrint && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrint}>
                  <Printer className="w-4 h-4" />
                </Button>
              )}
              {onRefresh && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={loading}>
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </Button>
              )}
              {onFullscreen && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFullscreen}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Quick Filters */}
          {showQuickFilters && (
            <div className="flex items-center gap-2 mt-2">
              {quickFilters.map(filter => (
                <Button
                  key={filter.id}
                  variant={activeQuickFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    activeQuickFilter === filter.id && 'bg-erp-navy text-white hover:bg-erp-navy/90'
                  )}
                  onClick={() => handleQuickFilter(filter)}
                >
                  {language === 'ar' ? filter.label : filter.id.replace(/([A-Z])/g, ' $1').trim()}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Stats Cards - White background with colored numbers */}
      {showStats && stats && (
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="grid grid-cols-4 gap-4">
            {/* Custom labels or default stats */}
            {stats.label1 ? (
              <>
                <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{stats.label1.title}</div>
                  <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label1.color))}>
                    {typeof stats.label1.value === 'number' 
                      ? stats.label1.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : stats.label1.value}
                  </div>
                </div>
                {stats.label2 && (
                  <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{stats.label2.title}</div>
                    <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label2.color))}>
                      {typeof stats.label2.value === 'number' 
                        ? stats.label2.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : stats.label2.value}
                    </div>
                  </div>
                )}
                {stats.label3 && (
                  <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{stats.label3.title}</div>
                    <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label3.color))}>
                      {typeof stats.label3.value === 'number' 
                        ? stats.label3.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : stats.label3.value}
                    </div>
                  </div>
                )}
                {stats.label4 && (
                  <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{stats.label4.title}</div>
                    <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label4.color))}>
                      {typeof stats.label4.value === 'number' 
                        ? stats.label4.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : stats.label4.value}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('accounting.labels.debitTotal')}</div>
                  <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {(stats.totalDebit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('accounting.labels.creditTotal')}</div>
                  <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                    {(stats.totalCredit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('common.balance')}</div>
                  <div className={cn(
                    'text-2xl font-bold font-mono',
                    (stats.balance || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {(stats.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('common.count')}</div>
                  <div className="text-2xl font-bold font-mono text-gray-700 dark:text-gray-300">
                    {stats.count || filteredData.length}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full" dir={direction}>
            {/* Header - Light background style */}
            <thead className={cn(stickyHeader && 'sticky top-0 z-20')}>
              <tr className="bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                {/* Row Number */}
                {showRowNumbers && (
                  <th className="w-12 px-3 py-3 text-center border-e border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">#</span>
                  </th>
                )}
                
                {/* Checkbox Column */}
                {selectable && (
                  <th className="w-12 px-3 py-3 text-center border-e border-gray-200 dark:border-gray-700">
                    <Checkbox
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300"
                    />
                  </th>
                )}
                
                {/* Column Headers */}
                {columns.map((column, colIndex) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300',
                      colIndex < columns.length - 1 && 'border-e border-gray-200 dark:border-gray-700',
                      column.align === 'center' && 'text-center',
                      column.align === 'end' && 'text-end',
                    )}
                    style={{ width: column.width }}
                  >
                    <div className={cn(
                      'flex items-center gap-2',
                      column.align === 'end' && 'justify-end',
                      column.align === 'center' && 'justify-center'
                    )}>
                      <span>{t(column.title)}</span>
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(String(column.key))}
                          className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-4 h-4 text-erp-teal" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-erp-teal" />
                            )
                          ) : (
                            <ChevronDown className="w-4 h-4 opacity-30" />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Body */}
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0)}
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-3">
                      {emptyIcon || <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                      <span>{emptyMessage || t('table.noData')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => (
                  <tr
                    key={String(row[rowKey]) || rowIndex}
                    className={cn(
                      'transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0',
                      rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30',
                      onRowClick && 'cursor-pointer hover:bg-erp-teal/5 dark:hover:bg-erp-teal/10',
                      selectedRows.includes(String(row[rowKey])) && 'bg-erp-teal/10 dark:bg-erp-teal/20'
                    )}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {/* Row Number */}
                    {showRowNumbers && (
                      <td className="w-12 px-3 py-3 text-center border-e border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-gray-400 font-mono">{rowIndex + 1}</span>
                      </td>
                    )}
                    
                    {/* Checkbox */}
                    {selectable && (
                      <td className="w-12 px-3 py-3 text-center border-e border-gray-100 dark:border-gray-800">
                        <Checkbox
                          checked={selectedRows.includes(String(row[rowKey]))}
                          onCheckedChange={() => handleSelectRow(String(row[rowKey]))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    
                    {/* Data Cells */}
                    {columns.map((column, colIndex) => {
                      const cellValue = row[column.key as keyof T];
                      
                      return (
                        <td
                          key={String(column.key)}
                          className={cn(
                            'px-4 py-3 text-sm',
                            colIndex < columns.length - 1 && 'border-e border-gray-100 dark:border-gray-800',
                            column.align === 'center' && 'text-center',
                            column.align === 'end' && 'text-end',
                            compactMode && 'py-2'
                          )}
                        >
                          {renderCellValue(column, cellValue, row, rowIndex)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            
            {/* Footer - Dark background */}
            {hasFooter && showFooterTotals && filteredData.length > 0 && (
              <tfoot className={cn(stickyFooter && 'sticky bottom-0 z-20')}>
                <tr className="bg-erp-navy dark:bg-slate-900">
                  {/* Row number / Footer label */}
                  {showRowNumbers && (
                    <td className="px-3 py-3 border-e border-white/10 text-white font-semibold text-sm">
                      {filteredData.length}
                    </td>
                  )}
                  
                  {/* Checkbox placeholder */}
                  {selectable && (
                    <td className="px-3 py-3 border-e border-white/10" />
                  )}
                  
                  {/* Footer cells */}
                  {columns.map((column, colIndex) => {
                    const footerValue = calculateFooter(column);
                    const isDescriptionColumn = column.key === 'description';
                    return (
                      <td
                        key={String(column.key)}
                        className={cn(
                          'px-4 py-3 text-sm font-semibold text-white',
                          colIndex < columns.length - 1 && 'border-e border-white/10',
                          column.align === 'center' && 'text-center',
                          column.align === 'end' && 'text-end',
                        )}
                      >
                        {isDescriptionColumn ? (
                          <span>{footerLabel || t('common.total')}</span>
                        ) : footerValue !== null ? (
                          <span className={cn(
                            'font-mono',
                            column.key === 'debit' && 'text-emerald-400',
                            column.key === 'credit' && 'text-rose-400',
                            column.key === 'balance' && 'text-white',
                          )}>
                            {typeof footerValue === 'number' 
                              ? footerValue.toLocaleString('en-US', { minimumFractionDigits: 0 })
                              : footerValue
                            }
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}

export default LedgerTable;
