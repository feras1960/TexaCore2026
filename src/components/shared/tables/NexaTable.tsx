import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  X,
  Download,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  inputType?: 'text' | 'number' | 'select' | 'date';
  selectOptions?: { value: string; label: string }[];
  render?: (value: any, row: T, index: number) => React.ReactNode;
  footer?: 'sum' | 'average' | 'count' | ((data: T[]) => React.ReactNode);
}

export interface NexaTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T, index: number) => void;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selected: string[]) => void;
  rowKey?: keyof T;
  editable?: boolean;
  onSave?: (data: T[]) => void;
  onCancel?: () => void;
  onDataChange?: (data: T[]) => void;
  showRowNumbers?: boolean;
  stickyHeader?: boolean;
  stickyFooter?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function NexaTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = 'id' as keyof T,
  editable = false,
  onSave,
  onCancel,
  onDataChange,
  showRowNumbers = true,
  stickyHeader = true,
  stickyFooter = true,
  className,
  emptyMessage,
}: NexaTableProps<T>) {
  const { t, direction } = useLanguage();

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<T[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Filter data
  const filteredData = useMemo(() => {
    return sortedData.filter(row => {
      return Object.entries(columnFilters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String(row[key] || '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });
  }, [sortedData, columnFilters]);

  const displayData = isEditMode ? editData : filteredData;

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setColumnFilters({});
  };

  const hasActiveFilters = Object.values(columnFilters).some(v => v);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedRows.length === displayData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(displayData.map(row => String(row[rowKey])));
    }
  };

  const handleSelectRow = (rowId: string) => {
    if (!onSelectionChange) return;
    if (selectedRows.includes(rowId)) {
      onSelectionChange(selectedRows.filter(id => id !== rowId));
    } else {
      onSelectionChange([...selectedRows, rowId]);
    }
  };

  const enterEditMode = () => {
    setEditData([...data]);
    setIsEditMode(true);
  };

  const exitEditMode = (save: boolean) => {
    if (save && onSave) {
      onSave(editData);
    }
    setIsEditMode(false);
    setSelectedCell(null);
    setEditingCell(null);
    onCancel?.();
  };

  const calculateFooter = (column: Column<T>) => {
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
  };

  const hasFooter = columns.some(col => col.footer);

  return (
    <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      {/* Toolbar */}
      {(editable || hasActiveFilters) && (
        <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <X className="w-4 h-4 me-1" />
                {t('table.clearFilters')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editable && !isEditMode && (
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                {t('common.edit')}
              </Button>
            )}
            {isEditMode && (
              <>
                <Button variant="outline" size="sm" onClick={() => exitEditMode(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="teal" size="sm" onClick={() => exitEditMode(true)}>
                  {t('common.save')}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full" dir={direction}>
          {/* Header */}
          <thead className={cn(stickyHeader && 'sticky top-0 z-20')}>
            <tr className="bg-erp-navy dark:bg-slate-900">
              {/* Checkbox/Row Number */}
              {(selectable || showRowNumbers) && (
                <th className="w-12 px-3 py-3 text-center border-e border-white/10">
                  {selectable && !isEditMode ? (
                    <Checkbox
                      checked={selectedRows.length === displayData.length && displayData.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-white/30"
                    />
                  ) : (
                    <span className="text-xs text-white/70 font-medium">#</span>
                  )}
                </th>
              )}
              {/* Serial Number Column (when selectable is enabled) */}
              {selectable && showRowNumbers && (
                <th className="w-12 px-3 py-3 text-center border-e border-white/10">
                  <span className="text-xs text-white/70 font-medium">#</span>
                </th>
              )}
              
              {/* Column Headers */}
              {columns.map((column, colIndex) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-white/90 uppercase tracking-wider',
                    colIndex < columns.length - 1 && 'border-e border-white/10',
                    column.align === 'center' && 'text-center',
                    column.align === 'end' && 'text-end',
                  )}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{t(column.title)}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(String(column.key))}
                        className="p-0.5 hover:bg-white/10 rounded"
                      >
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronDown className="w-4 h-4 opacity-30" />
                        )}
                      </button>
                    )}
                    {column.filterable && (
                      <div className="relative">
                        <Input
                          placeholder={t('table.filter')}
                          value={columnFilters[String(column.key)] || ''}
                          onChange={(e) => handleFilter(String(column.key), e.target.value)}
                          className="h-6 w-24 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable || showRowNumbers ? 1 : 0) + (selectable && showRowNumbers ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage || t('table.noData')}
                </td>
              </tr>
            ) : (
              displayData.map((row, rowIndex) => (
                <tr
                  key={String(row[rowKey]) || rowIndex}
                  className={cn(
                    'transition-colors border-b border-slate-200 dark:border-slate-700 last:border-0',
                    rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30',
                    onRowClick && 'cursor-pointer hover:bg-erp-teal/5 dark:hover:bg-erp-teal/10',
                    selectedRows.includes(String(row[rowKey])) && 'bg-erp-teal/10 dark:bg-erp-teal/20'
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {/* Checkbox/Row Number */}
                  {(selectable || showRowNumbers) && (
                    <td className="w-12 px-3 py-3 text-center border-e border-slate-200 dark:border-slate-700">
                      {selectable && !isEditMode ? (
                        <Checkbox
                          checked={selectedRows.includes(String(row[rowKey]))}
                          onCheckedChange={() => handleSelectRow(String(row[rowKey]))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">{rowIndex + 1}</span>
                      )}
                    </td>
                  )}
                  {/* Serial Number Column (when selectable is enabled) */}
                  {selectable && showRowNumbers && (
                    <td className="w-12 px-3 py-3 text-center border-e border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-gray-400 font-mono">{rowIndex + 1}</span>
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
                          colIndex < columns.length - 1 && 'border-e border-slate-200 dark:border-slate-700',
                          column.align === 'center' && 'text-center',
                          column.align === 'end' && 'text-end',
                        )}
                      >
                        {column.render 
                          ? column.render(cellValue, row, rowIndex)
                          : String(cellValue ?? '')
                        }
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>

          {/* Footer */}
            {hasFooter && (
            <tfoot className={cn(stickyFooter && 'sticky bottom-0 z-20')}>
              <tr className="bg-erp-navy dark:bg-slate-900">
                {(selectable || showRowNumbers) && (
                  <td className="px-3 py-3 border-e border-white/10" />
                )}
                {selectable && showRowNumbers && (
                  <td className="px-3 py-3 border-e border-white/10" />
                )}
                {columns.map((column, colIndex) => {
                  const footerValue = calculateFooter(column);
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
                      {footerValue !== null && (
                        <span className={cn(
                          column.key === 'debit' && 'text-emerald-400',
                          column.key === 'credit' && 'text-rose-400',
                          column.key === 'balance' && 'text-blue-400',
                        )}>
                          {typeof footerValue === 'number' 
                            ? footerValue.toLocaleString('en-US')
                            : footerValue
                          }
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
