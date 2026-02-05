import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  ChevronDown,
  ChevronUp,
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
  loading?: boolean;
  bordered?: boolean; // New: Vertical dividers
  striped?: boolean;  // New: Zebra striping
  rowClassName?: (row: T, index: number) => string; // CSS class for row
  rowStyle?: (row: T, index: number) => React.CSSProperties | undefined; // Inline style for row
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
  onDataChange: _onDataChange,
  showRowNumbers = true,
  stickyHeader = true,
  stickyFooter = true,
  className,
  emptyMessage,
  loading = false,
  bordered = true, // Default to true for the "unified" look
  striped = true,  // Default to true
  rowClassName, // Destructure
  rowStyle, // Destructure inline style function
}: NexaTableProps<T>) {
  const { t, direction } = useLanguage();

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<T[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(selectedCell);
  // Mark as used to prevent warnings
  void selectedCell;
  void editingCell;

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
    <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm', className)}>
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
                <Button variant="default" size="sm" onClick={() => exitEditMode(true)} className="bg-erp-teal hover:bg-erp-teal/90">
                  {t('common.save')}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto w-full">
        <table className="w-full min-w-full text-sm border-collapse" dir={direction}>
          {/* Header */}
          <thead className={cn(stickyHeader && 'sticky top-0 z-20 bg-gray-100 dark:bg-gray-800')}>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              {/* Checkbox/Row Number */}
              {(selectable || showRowNumbers) && (
                <th className={cn(
                  "w-12 px-3 py-3 text-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold",
                  bordered && "border-e border-gray-300 dark:border-gray-600"
                )}>
                  {selectable && !isEditMode ? (
                    <Checkbox
                      checked={selectedRows.length === displayData.length && displayData.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-400"
                    />
                  ) : (
                    "#"
                  )}
                </th>
              )}

              {/* Column Headers */}
              {columns.map((column, colIndex) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider bg-gray-100 dark:bg-gray-800 select-none group',
                    colIndex < columns.length - 1 && bordered && 'border-e border-gray-300 dark:border-gray-600',
                    column.align === 'center' && 'text-center',
                    column.align === 'end' && 'text-end',
                    // Default alignment if not specified
                    !column.align && 'text-start'
                  )}
                  style={{ width: column.width }}
                >
                  <div className={cn("flex items-center gap-2", column.align === 'end' && "justify-end", column.align === 'center' && "justify-center")}>
                    <span className="truncate">{t(column.title)}</span>
                    {column.sortable && (
                      <div
                        onClick={() => handleSort(String(column.key))}
                        className="cursor-pointer p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-erp-teal" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-erp-teal" />
                          )
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    )}
                  </div>
                  {column.filterable && (
                    <div className="mt-2">
                      <Input
                        placeholder={t('table.filter')}
                        value={columnFilters[String(column.key)] || ''}
                        onChange={(e) => handleFilter(String(column.key), e.target.value)}
                        className="h-7 w-full text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-erp-teal"
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse border-b border-gray-200 dark:border-gray-700">
                  {(selectable || showRowNumbers) && (
                    <td className="w-12 px-3 py-3 border-e border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="h-4 w-4 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
                    </td>
                  )}
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn(
                        'px-4 py-3',
                        colIdx < columns.length - 1 && bordered && 'border-e border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable || showRowNumbers ? 1 : 0)}
                  className="px-4 py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="font-medium text-lg">{emptyMessage || t('table.noData')}</p>
                    <p className="text-sm opacity-70">Try adjusting your filters or search terms</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((row, rowIndex) => (
                <tr
                  key={String(row[rowKey]) || rowIndex}
                  className={cn(
                    'group transition-colors border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
                    // Stripe logic (only apply if no custom style)
                    !rowStyle?.(row, rowIndex)?.backgroundColor && striped && rowIndex % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-800/30' : !rowStyle?.(row, rowIndex)?.backgroundColor ? 'bg-white dark:bg-gray-900' : '',
                    onRowClick && 'cursor-pointer',
                    selectedRows.includes(String(row[rowKey])) && 'bg-blue-50 dark:bg-blue-900/20',
                    rowClassName && rowClassName(row, rowIndex) // Apply custom row class
                  )}
                  style={rowStyle?.(row, rowIndex)} // Apply inline style for background color
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {/* Checkbox/Row Number */}
                  {(selectable || showRowNumbers) && (
                    <td className={cn(
                      "w-12 px-3 py-3 text-center text-xs text-gray-400 font-mono",
                      bordered && "border-e border-gray-200 dark:border-gray-700"
                    )}>
                      {selectable && !isEditMode ? (
                        <Checkbox
                          checked={selectedRows.includes(String(row[rowKey]))}
                          onCheckedChange={() => handleSelectRow(String(row[rowKey]))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        rowIndex + 1
                      )}
                    </td>
                  )}

                  {/* Data Cells */}
                  {columns.map((column, colIndex) => {
                    const cellValue = row[column.key as keyof T];

                    return (
                      <td
                        key={String(column.key)}
                        className={cn(
                          'px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300',
                          colIndex < columns.length - 1 && bordered && 'border-e border-gray-200 dark:border-gray-700',
                          column.align === 'center' && 'text-center',
                          column.align === 'end' && 'text-end font-mono', // Mono font for numbers
                          !column.align && 'text-start'
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
            <tfoot className={cn(stickyFooter && 'sticky bottom-0 z-20 bg-gray-100 dark:bg-gray-800 shadow-inner')}>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                {(selectable || showRowNumbers) && (
                  <td className={cn("px-3 py-3", bordered && "border-e border-gray-300 dark:border-gray-600")} />
                )}
                {columns.map((column, colIndex) => {
                  const footerValue = calculateFooter(column);
                  return (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-800 dark:text-gray-100',
                        colIndex < columns.length - 1 && bordered && 'border-e border-gray-300 dark:border-gray-600',
                        column.align === 'center' && 'text-center',
                        column.align === 'end' && 'text-end',
                        !column.align && 'text-start'
                      )}
                    >
                      {footerValue !== null && (
                        <span className={cn(
                          column.key === 'debit' && 'text-emerald-700 dark:text-emerald-400',
                          column.key === 'credit' && 'text-rose-700 dark:text-rose-400',
                          column.key === 'balance' && 'text-blue-700 dark:text-blue-400',
                        )}>
                          {typeof footerValue === 'number'
                            ? footerValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
