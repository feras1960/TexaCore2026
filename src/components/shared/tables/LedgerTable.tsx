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
 * - ميزة الماركر بالألوان (مطابقة الدفاتر)
 * - التفقيط (الأرقام بالكلمات)
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
  FileText,
  Loader2,
  AlertCircle,
  Maximize2,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  Paintbrush,
  Table2,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ColorMarkerPalette, MARKER_COLORS, getMarkerBackgroundColor, getMarkerColor, type MarkerColorId } from '../ColorMarkerPalette';
import { numberToWords } from '@/utils/numberToWords';

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
  
  // ميزة الماركر (مطابقة الدفاتر)
  enableMarker?: boolean;
  onMarkerChange?: (rowIds: string[], color: MarkerColorId) => void;
  
  // التفقيط
  showAmountInWords?: boolean;
  
  // الفلاتر الذكية
  enableSmartFilters?: boolean;
  
  // شرح المدين/الدائن
  showDebitCreditHelp?: boolean;
}

// ===== DEFAULT QUICK FILTERS =====
const defaultQuickFilters: QuickFilter[] = [
  {
    id: 'today',
    label: 'filters.today',
    getDateRange: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return { from: today, to: today };
    }
  },
  {
    id: 'yesterday',
    label: 'filters.yesterday',
    getDateRange: () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      return { from: yesterday, to: yesterday };
    }
  },
  {
    id: 'thisWeek',
    label: 'filters.thisWeek',
    getDateRange: () => ({
      from: format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    })
  },
  {
    id: 'thisMonth',
    label: 'filters.thisMonth',
    getDateRange: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    id: 'thisYear',
    label: 'filters.thisYear',
    getDateRange: () => ({
      from: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      to: format(endOfYear(new Date()), 'yyyy-MM-dd')
    })
  }
];

// ===== STATUS COLORS =====
const defaultStatusColors: Record<string, { label: string; color: string }> = {
  posted: { label: 'common.posted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  confirmed: { label: 'common.confirmed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  draft: { label: 'common.draft', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  paid: { label: 'common.paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  partial: { label: 'common.partial', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  unpaid: { label: 'common.unpaid', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'common.cancelled', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  active: { label: 'common.active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'common.pending', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  inactive: { label: 'common.inactive', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
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
    { value: 'all', label: 'common.all' },
    { value: 'posted', label: 'common.posted' },
    { value: 'draft', label: 'common.draft' },
  ],
  // ميزات جديدة
  enableMarker = false,
  onMarkerChange,
  showAmountInWords = false,
  enableSmartFilters = true,
  showDebitCreditHelp = true,
}: LedgerTableProps<T>) {
  const { t, direction, language } = useLanguage();
  const resolveLabel = useCallback((label: string) => {
    if (!label) return label;
    if (label.includes('.') || label.startsWith('erp.')) {
      return t(label);
    }
    return label;
  }, [t]);
  
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
  const [activeMarkerColor, setActiveMarkerColor] = useState<MarkerColorId>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
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
  
  // معالج تطبيق الماركر
  const handleApplyMarker = useCallback(() => {
    if (selectedRows.length === 0) return;
    if (onMarkerChange) {
      onMarkerChange(selectedRows, activeMarkerColor);
    }
  }, [selectedRows, activeMarkerColor, onMarkerChange]);
  
  // معالج فلتر العمود
  const handleColumnFilter = useCallback((columnKey: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value === 'all' ? '' : value
    }));
  }, []);
  
  // استخراج القيم الفريدة لعمود معين
  const getUniqueColumnValues = useCallback((columnKey: string): string[] => {
    const values = new Set<string>();
    data.forEach(row => {
      const val = row[columnKey as keyof T];
      if (val !== null && val !== undefined && val !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values).sort();
  }, [data]);
  
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
    
    // Column filters (الفلاتر الذكية)
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row => {
          const rowVal = String(row[key as keyof T] || '');
          return rowVal.toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
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
  }, [data, filters.search, sortConfig, columns, columnFilters]);
  
  // ======== دوال التصدير والطباعة ========
  
  // تصدير CSV
  const handleExportCSV = useCallback(() => {
    const BOM = '\uFEFF'; // For Arabic support
    const headers = columns.map(col => resolveLabel(col.title)).join(',');
    const rows = filteredData.map(row => 
      columns.map(col => {
        const val = row[col.key as keyof T];
        const strVal = String(val ?? '').replace(/"/g, '""');
        return `"${strVal}"`;
      }).join(',')
    );
    const csv = BOM + headers + '\n' + rows.join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData, columns, resolveLabel]);
  
  // تصدير Excel
  const handleExportExcel = useCallback(() => {
    // Convert to TSV for Excel
    const BOM = '\uFEFF';
    const headers = columns.map(col => resolveLabel(col.title)).join('\t');
    const rows = filteredData.map(row => 
      columns.map(col => {
        const val = row[col.key as keyof T];
        return String(val ?? '').replace(/\t/g, ' ');
      }).join('\t')
    );
    const tsv = BOM + headers + '\n' + rows.join('\n');
    
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData, columns, resolveLabel]);
  
  // فتح في Google Sheets
  const handleOpenGoogleSheets = useCallback(() => {
    const headers = columns.map(col => resolveLabel(col.title));
    const rows = filteredData.map(row => 
      columns.map(col => String(row[col.key as keyof T] ?? ''))
    );
    const allData = [headers, ...rows];
    
    // Encode data for Google Sheets URL
    const csvContent = allData.map(row => row.join(',')).join('\n');
    
    // Copy to clipboard for pasting
    navigator.clipboard.writeText(csvContent).then(() => {
      // Open new Google Sheet
      window.open('https://sheets.new', '_blank');
      // Alert user to paste
      setTimeout(() => {
        alert(t('table.dataCopied') || 'تم نسخ البيانات! اضغط Ctrl+V للصق في Google Sheets');
      }, 1000);
    }).catch(() => {
      // Fallback: just open Google Sheets
      window.open('https://sheets.new', '_blank');
    });
  }, [filteredData, columns, resolveLabel, t]);
  
  // طباعة مع التنسيق والألوان
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Generate marker colors CSS
    const markerColorStyles = MARKER_COLORS.map(m => 
      `.marker-${m.id} { background-color: ${m.bgLight}; border-${direction === 'rtl' ? 'right' : 'left'}: 4px solid ${m.color}; }`
    ).join('\n');
    
    const html = `
<!DOCTYPE html>
<html dir="${direction}">
<head>
  <meta charset="utf-8">
  <title>${t('common.print')} - ${format(new Date(), 'yyyy-MM-dd')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 20px;
      direction: ${direction};
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #14b8a6;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 5px;
    }
    
    .header .date {
      font-size: 11px;
      color: #6b7280;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      text-align: center;
      padding: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
    }
    
    .stat-card .label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    
    .stat-card .value {
      font-size: 16px;
      font-weight: 700;
      font-family: monospace;
    }
    
    .stat-card.debit .value { color: #16a34a; }
    .stat-card.credit .value { color: #dc2626; }
    .stat-card.balance .value { color: #2563eb; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      padding: 10px 8px;
      text-align: ${direction === 'rtl' ? 'right' : 'left'};
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      border-bottom: 2px solid #14b8a6;
    }
    
    td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    tr:hover {
      background-color: #f0fdfa;
    }
    
    .number {
      font-family: 'Courier New', monospace;
      text-align: ${direction === 'rtl' ? 'left' : 'right'};
    }
    
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    
    tfoot td {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      font-weight: 700;
      border-top: 2px solid #14b8a6;
      padding: 10px 8px;
    }
    
    ${markerColorStyles}
    
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
    }
    
    @media print {
      body { padding: 10px; }
      .header { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t('common.print')} - ${t('table.ledger') || 'دفتر الأستاذ'}</h1>
    <div class="date">${format(new Date(), 'yyyy/MM/dd HH:mm')}</div>
  </div>
  
  ${stats ? `
  <div class="stats">
    <div class="stat-card debit">
      <div class="label">${t('accounting.labels.debitTotal')}</div>
      <div class="value">${(stats.totalDebit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-card credit">
      <div class="label">${t('accounting.labels.creditTotal')}</div>
      <div class="value">${(stats.totalCredit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-card balance">
      <div class="label">${t('common.balance')}</div>
      <div class="value">${Math.abs(stats.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t('common.count')}</div>
      <div class="value">${filteredData.length}</div>
    </div>
  </div>
  ` : ''}
  
  <table>
    <thead>
      <tr>
        <th style="width: 40px">#</th>
        ${columns.map(col => `<th>${resolveLabel(col.title)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${filteredData.map((row, idx) => {
        const markerColor = (row as any).marker_color;
        const markerClass = markerColor ? `marker-${markerColor}` : '';
        return `
        <tr class="${markerClass}">
          <td style="text-align: center; color: #9ca3af;">${idx + 1}</td>
          ${columns.map(col => {
            const val = row[col.key as keyof T];
            const isNumber = col.type === 'number' || col.type === 'currency';
            const numVal = isNumber ? parseFloat(String(val)) : null;
            const colorClass = numVal !== null ? (numVal > 0 ? 'positive' : numVal < 0 ? 'negative' : '') : '';
            const displayVal = isNumber && numVal !== null 
              ? numVal.toLocaleString('en-US', { minimumFractionDigits: 2 })
              : String(val ?? '');
            return `<td class="${isNumber ? 'number' : ''} ${colorClass}">${displayVal}</td>`;
          }).join('')}
        </tr>
      `}).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td></td>
        ${columns.map(col => {
          if (col.footer === 'sum') {
            const sum = filteredData.reduce((acc, row) => {
              const val = row[col.key as keyof T];
              return acc + (parseFloat(String(val)) || 0);
            }, 0);
            return `<td class="number">${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>`;
          }
          if (col.footer === 'count') {
            return `<td class="number">${filteredData.length}</td>`;
          }
          return '<td></td>';
        }).join('')}
      </tr>
    </tfoot>
  </table>
  
  <div class="footer">
    ${t('common.printedOn') || 'طُبع بتاريخ'}: ${format(new Date(), 'yyyy/MM/dd HH:mm:ss')} | TexaCore ERP
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    };
  <\/script>
</body>
</html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  }, [filteredData, columns, stats, resolveLabel, direction, t]);
  
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
        const status = statusConfig[statusKey] || { label: String(value), color: 'bg-gray-100 text-gray-700' };
        return (
          <span className={cn('px-2 py-1 rounded-md text-xs font-medium', status.color)}>
            {resolveLabel(status.label || String(value))}
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
  }, [resolveLabel, onReferenceClick]);
  
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
                  <SelectItem key={c.value} value={c.value}>{resolveLabel(c.label)}</SelectItem>
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
                    <SelectItem key={s.value} value={s.value}>{resolveLabel(s.label)}</SelectItem>
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
            
            {/* Marker Palette - ميزة الماركر */}
            {enableMarker && (
              <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <ColorMarkerPalette
                  selectedColor={activeMarkerColor}
                  onColorSelect={setActiveMarkerColor}
                  size="sm"
                />
                {selectedRows.length > 0 && activeMarkerColor && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleApplyMarker}
                  >
                    <Paintbrush className="w-3 h-3" />
                    {t('common.apply')} ({selectedRows.length})
                  </Button>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {/* Excel Export */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600" 
                      onClick={handleExportExcel}
                    >
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {t('table.exportExcel') || 'تصدير Excel'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* CSV Export */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600" 
                      onClick={handleExportCSV}
                    >
                  <Download className="w-4 h-4" />
                </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {t('table.exportCSV') || 'تصدير CSV'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Google Sheets */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600" 
                      onClick={handleOpenGoogleSheets}
                    >
                      <Table2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {t('table.openGoogleSheets') || 'فتح في Google Sheets'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
              
              {/* Print */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600" 
                      onClick={handlePrint}
                    >
                  <Printer className="w-4 h-4" />
                </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {t('common.print') || 'طباعة'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Refresh */}
              {onRefresh && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={onRefresh} 
                        disabled={loading}
                      >
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {t('common.refresh') || 'تحديث'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Fullscreen */}
              {onFullscreen && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={onFullscreen}
                      >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {t('common.fullscreen') || 'ملء الشاشة'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                  {resolveLabel(filter.label)}
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
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{resolveLabel(stats.label1.title)}</div>
                  <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label1.color))}>
                    {typeof stats.label1.value === 'number' 
                      ? stats.label1.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : stats.label1.value}
                  </div>
                </div>
                {stats.label2 && (
                  <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{resolveLabel(stats.label2.title)}</div>
                    <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label2.color))}>
                      {typeof stats.label2.value === 'number' 
                        ? stats.label2.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : stats.label2.value}
                    </div>
                  </div>
                )}
                {stats.label3 && (
                  <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{resolveLabel(stats.label3.title)}</div>
                    <div className={cn('text-2xl font-bold font-mono', getStatColor(stats.label3.color))}>
                      {typeof stats.label3.value === 'number' 
                        ? stats.label3.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : stats.label3.value}
                    </div>
                  </div>
                )}
                {stats.label4 && (
                  <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{resolveLabel(stats.label4.title)}</div>
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
                {/* إجمالي المدين */}
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400 mb-2">
                    {t('accounting.labels.debitTotal')}
                    {showDebitCreditHelp && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {t('accounting.help.debitTotal') || 'المدين: إجمالي المبالغ المستحقة لنا'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-mono text-green-700 dark:text-green-300">
                    {(stats.totalDebit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                {/* إجمالي الدائن */}
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-sm text-red-600 dark:text-red-400 mb-2">
                    {t('accounting.labels.creditTotal')}
                    {showDebitCreditHelp && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {t('accounting.help.creditTotal') || 'الدائن: إجمالي المبالغ المستحقة علينا'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-mono text-red-700 dark:text-red-300">
                    {(stats.totalCredit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                {/* الرصيد */}
                <div className={cn(
                  'text-center p-4 rounded-lg border',
                  (stats.balance || 0) >= 0 
                    ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800'
                )}>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('common.balance')} {(stats.balance || 0) >= 0 ? `(${t('accounting.debitBalance') || 'مدين'})` : `(${t('accounting.creditBalance') || 'دائن'})`}
                  </div>
                  <div className={cn(
                    'text-2xl font-bold font-mono',
                    (stats.balance || 0) >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'
                  )}>
                    {Math.abs(stats.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  {/* التفقيط */}
                  {showAmountInWords && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      {numberToWords(Math.abs(stats.balance || 0), language)}
                </div>
                  )}
                </div>
                
                {/* العدد */}
                <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
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
            {/* Header - Light elegant gradient */}
            <thead className={cn(stickyHeader && 'sticky top-0 z-20')}>
              <tr className="bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border-b-2 border-erp-teal/30">
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
                {columns.map((column, colIndex) => {
                  const columnKey = String(column.key);
                  const uniqueValues = enableSmartFilters && column.filterable ? getUniqueColumnValues(columnKey) : [];
                  const hasActiveFilter = columnFilters[columnKey] && columnFilters[columnKey] !== '';
                  
                  return (
                  <th
                    key={columnKey}
                    className={cn(
                      'px-4 py-3.5 text-xs font-semibold uppercase tracking-wide',
                      'text-gray-700 dark:text-gray-200', // Fixed: better contrast
                      'hover:text-gray-900 dark:hover:text-white', // Fixed: visible on hover
                      colIndex < columns.length - 1 && 'border-e border-gray-200 dark:border-gray-700',
                      column.align === 'center' && 'text-center',
                      column.align === 'end' && 'text-end',
                    )}
                    style={{ width: column.width }}
                  >
                    <div className={cn(
                      'flex items-center gap-1.5',
                      column.align === 'end' && 'justify-end',
                      column.align === 'center' && 'justify-center'
                    )}>
                      {/* Help tooltip for debit/credit */}
                      {showDebitCreditHelp && (column.key === 'debit' || column.key === 'credit') && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-erp-teal cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              {column.key === 'debit' 
                                ? t('accounting.help.debit') || 'المدين: المبالغ المستحقة لنا (زيادة في الأصول أو نقص في الالتزامات)'
                                : t('accounting.help.credit') || 'الدائن: المبالغ المستحقة علينا (نقص في الأصول أو زيادة في الالتزامات)'
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <span className="font-semibold">{resolveLabel(column.title)}</span>
                      
                      {/* Sort button */}
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(columnKey)}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {sortConfig?.key === columnKey ? (
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
                      
                      {/* Smart Filter Dropdown */}
                      {enableSmartFilters && column.filterable && uniqueValues.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={cn(
                              'p-0.5 rounded transition-colors',
                              hasActiveFilter 
                                ? 'text-erp-teal bg-erp-teal/10' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}>
                              <Filter className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-auto">
                            <DropdownMenuLabel className="text-xs">
                              {t('table.filter')} {resolveLabel(column.title)}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup 
                              value={columnFilters[columnKey] || 'all'}
                              onValueChange={(value) => handleColumnFilter(columnKey, value)}
                            >
                              <DropdownMenuRadioItem value="all" className="text-sm">
                                {t('common.all')}
                              </DropdownMenuRadioItem>
                              {uniqueValues.slice(0, 20).map(val => (
                                <DropdownMenuRadioItem key={val} value={val} className="text-sm">
                                  {val}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </th>
                );
                })}
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
                      <span>{emptyMessage ? resolveLabel(emptyMessage) : t('table.noData')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => {
                  const rowMarkerColor = (row as any).marker_color as MarkerColorId;
                  const markerBgColor = getMarkerBackgroundColor(rowMarkerColor);
                  const markerBorderColor = getMarkerColor(rowMarkerColor);
                  
                  return (
                  <tr
                    key={String(row[rowKey]) || rowIndex}
                    className={cn(
                      'transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 relative',
                      !rowMarkerColor && rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : '',
                      !rowMarkerColor && rowIndex % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-800/30' : '',
                      onRowClick && 'cursor-pointer hover:bg-erp-teal/5 dark:hover:bg-erp-teal/10',
                      selectedRows.includes(String(row[rowKey])) && !rowMarkerColor && 'bg-erp-teal/10 dark:bg-erp-teal/20'
                    )}
                    style={markerBgColor ? { backgroundColor: markerBgColor } : undefined}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {/* Marker Color Bar */}
                    {rowMarkerColor && (
                      <div 
                        className="absolute start-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: markerBorderColor }}
                      />
                    )}
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
                );
                })
              )}
            </tbody>
            
            {/* Footer - Light elegant gradient */}
            {hasFooter && showFooterTotals && filteredData.length > 0 && (
              <tfoot className={cn(stickyFooter && 'sticky bottom-0 z-20')}>
                <tr className="bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border-t-2 border-erp-teal/30">
                  {/* Row number / Footer label */}
                  {showRowNumbers && (
                    <td className="px-3 py-3.5 border-e border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm">
                      {filteredData.length}
                    </td>
                  )}
                  
                  {/* Checkbox placeholder */}
                  {selectable && (
                    <td className="px-3 py-3.5 border-e border-gray-200 dark:border-gray-700" />
                  )}
                  
                  {/* Footer cells */}
                  {columns.map((column, colIndex) => {
                    const footerValue = calculateFooter(column);
                    const isDescriptionColumn = column.key === 'description';
                    return (
                      <td
                        key={String(column.key)}
                        className={cn(
                          'px-4 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-200',
                          colIndex < columns.length - 1 && 'border-e border-gray-200 dark:border-gray-700',
                          column.align === 'center' && 'text-center',
                          column.align === 'end' && 'text-end',
                        )}
                      >
                        {isDescriptionColumn ? (
                          <span>{footerLabel ? resolveLabel(footerLabel) : t('common.total')}</span>
                        ) : footerValue !== null ? (
                          <span className={cn(
                            'font-mono',
                            column.key === 'debit' && 'text-emerald-600 dark:text-emerald-400',
                            column.key === 'credit' && 'text-rose-600 dark:text-rose-400',
                            column.key === 'balance' && 'text-blue-600 dark:text-blue-400',
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
