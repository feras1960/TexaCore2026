/**
 * NexaGrid - Professional Data Grid Component
 * Built with AG Grid for Excel-like experience
 * 
 * ميزات:
 * - ⚡ أداء فائق مع AG Grid
 * - 📏 تغيير حجم الأعمدة بسلاسة
 * - 🔀 سحب وإفلات الأعمدة
 * - 🎨 الماركر (9 ألوان)
 * - 🔍 فلاتر ذكية
 * - 📊 بطاقات الإحصائيات
 * - 📝 التفقيط
 * - 📤 تصدير Excel/CSV/Google Sheets
 * - 🖨️ طباعة احترافية
 * - 🌐 RTL كامل
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { ColDef, GridApi, GridReadyEvent, CellClickedEvent, RowClassParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register all AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  FileSpreadsheet,
  Printer,
  Paintbrush,
  HelpCircle,
  FileText,
  X,
  FilterX,
  Filter,
  Columns,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { numberToWords } from '@/utils/numberToWords';
import { MARKER_COLORS, type MarkerColorId } from './gridConstants';

// Re-export for backwards compatibility
export { MARKER_COLORS, type MarkerColorId } from './gridConstants';

// Column Definition
export interface NexaGridColumn<T = any> {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'badge';
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  footer?: 'sum' | 'count' | 'average' | string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  filterOptions?: string[];
  editable?: boolean;
  pinned?: 'left' | 'right';
}

// Stats
export interface NexaGridStats {
  totalDebit?: number;
  totalCredit?: number;
  closingBalance?: number;
  openingBalance?: number;
  [key: string]: number | undefined;
}

// Props
export interface NexaGridProps<T extends Record<string, any>> {
  data: T[];
  columns: NexaGridColumn<T>[];
  rowKey?: string;
  className?: string;
  height?: number | string;
  title?: string;
  
  // Features
  enableSearch?: boolean;
  enableExport?: boolean;
  enablePrint?: boolean;
  enableMarker?: boolean;
  enableSmartFilters?: boolean;
  enableColumnReordering?: boolean;
  enablePagination?: boolean;
  enableColumnFilters?: boolean;
  enableColumnVisibility?: boolean;
  
  // Marker
  markerColors?: Record<string, MarkerColorId>;
  onMarkerChange?: (rowId: string, color: MarkerColorId) => void;
  
  // Stats
  showStats?: boolean;
  stats?: NexaGridStats;
  showAmountInWords?: boolean;
  showDebitCreditHelp?: boolean;
  
  // Pagination
  pageSize?: number;
  pageSizeOptions?: number[];
  
  // Events
  onRowClick?: (row: T, index: number) => void;
  onCellEdit?: (rowId: string, field: string, newValue: any) => void;
}

// Format number
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Custom CSS for AG Grid
const agGridCustomStyles = `
  .nexa-grid .ag-header {
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
    border-bottom: none;
  }
  
  .nexa-grid .ag-header-cell {
    color: white !important;
    font-weight: 600;
    font-size: 14px;
  }
  
  .nexa-grid .ag-header-cell:hover {
    background-color: rgba(255,255,255,0.1) !important;
  }
  
  .nexa-grid .ag-header-cell-text {
    color: white !important;
  }
  
  .nexa-grid .ag-icon {
    color: white !important;
  }
  
  .nexa-grid .ag-row-even {
    background-color: #ffffff;
  }
  
  .nexa-grid .ag-row-odd {
    background-color: #f9fafb;
  }
  
  .nexa-grid .ag-row:hover {
    background-color: #f3f4f6 !important;
  }
  
  .nexa-grid .ag-cell {
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 14px;
    border-right: 1px solid #e5e7eb !important;
  }
  
  .nexa-grid .ag-header-cell {
    border-right: 1px solid rgba(255,255,255,0.2) !important;
  }
  
  .nexa-grid.rtl-mode .ag-cell {
    border-right: none !important;
    border-left: 1px solid #e5e7eb !important;
  }
  
  .nexa-grid.rtl-mode .ag-header-cell {
    border-right: none !important;
    border-left: 1px solid rgba(255,255,255,0.2) !important;
  }
  
  .nexa-grid .ag-root-wrapper {
    border: none;
    width: 100%;
  }
  
  .nexa-grid .ag-body-viewport {
    width: 100%;
  }
  
  .nexa-grid .ag-paging-panel {
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    padding: 8px 16px;
  }
  
  /* Row number column */
  .nexa-grid .ag-row-number {
    color: #9ca3af;
    font-weight: 500;
  }
  
  /* Marker row styles */
  .nexa-grid .marker-red { background-color: #FEE2E2 !important; border-bottom: 1px solid #FECACA !important; }
  .nexa-grid .marker-orange { background-color: #FFEDD5 !important; border-bottom: 1px solid #FED7AA !important; }
  .nexa-grid .marker-yellow { background-color: #FEF9C3 !important; border-bottom: 1px solid #FEF08A !important; }
  .nexa-grid .marker-green { background-color: #DCFCE7 !important; border-bottom: 1px solid #BBF7D0 !important; }
  .nexa-grid .marker-blue { background-color: #DBEAFE !important; border-bottom: 1px solid #BFDBFE !important; }
  .nexa-grid .marker-purple { background-color: #F3E8FF !important; border-bottom: 1px solid #E9D5FF !important; }
  .nexa-grid .marker-pink { background-color: #FCE7F3 !important; border-bottom: 1px solid #FBCFE8 !important; }
  .nexa-grid .marker-gray { background-color: #F3F4F6 !important; border-bottom: 1px solid #E5E7EB !important; }
  .nexa-grid .marker-white { background-color: #FFFFFF !important; border-bottom: 1px solid #F3F4F6 !important; }
  
  /* Ensure marker rows keep their color on hover */
  .nexa-grid .marker-red:hover, .nexa-grid .marker-orange:hover, .nexa-grid .marker-yellow:hover, 
  .nexa-grid .marker-green:hover, .nexa-grid .marker-blue:hover, .nexa-grid .marker-purple:hover, 
  .nexa-grid .marker-pink:hover, .nexa-grid .marker-gray:hover, .nexa-grid .marker-white:hover {
    filter: brightness(0.95);
  }
  
  /* Dark mode */
  .dark .nexa-grid .ag-row-even {
    background-color: #111827;
  }
  
  .dark .nexa-grid .ag-row-odd {
    background-color: #1f2937;
  }
  
  .dark .nexa-grid .ag-row:hover {
    background-color: #374151 !important;
  }
  
  .dark .nexa-grid .ag-cell {
    color: #f3f4f6;
    border-right: 1px solid #374151 !important;
  }
  
  .dark .nexa-grid .ag-paging-panel {
    background-color: #1f2937;
    border-color: #374151;
  }
  
  /* Footer row */
  .nexa-grid .ag-footer-row {
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%) !important;
    font-weight: bold;
    color: #0f766e;
  }
  
  .dark .nexa-grid .ag-footer-row {
    background: linear-gradient(135deg, #134e4a 0%, #115e59 100%) !important;
    color: #5eead4;
  }
  
  /* ============================================
     LTR Default - Text on LEFT, Icons on RIGHT
     ============================================ */
  
  .nexa-grid .ag-header-cell-label {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    align-items: center !important;
  }
  
  .nexa-grid .ag-header-cell-text {
    flex: 1 !important;
    text-align: left !important;
    order: 0 !important;
  }
  
  .nexa-grid .ag-sort-indicator-container {
    order: 1 !important;
    margin-left: 4px !important;
    margin-right: 0 !important;
  }
  
  .nexa-grid .ag-header-icon {
    order: 2 !important;
    margin-left: 4px !important;
    margin-right: 0 !important;
  }
  
  .nexa-grid .ag-header-cell-menu-button {
    order: 3 !important;
    margin-left: 4px !important;
    margin-right: 0 !important;
  }
  
  /* ============================================
     RTL Support - Arabic and RTL Languages
     Text on RIGHT, Icons on LEFT
     ============================================ */
  
  /* RTL Header Cell - Main Layout */
  .nexa-grid.rtl-mode .ag-header-cell,
  .ag-theme-alpine.ag-rtl .ag-header-cell {
    text-align: right !important;
  }
  
  /* RTL Header - Flex container reversed */
  .nexa-grid.rtl-mode .ag-header-cell-comp-wrapper,
  .ag-theme-alpine.ag-rtl .ag-header-cell-comp-wrapper {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
  }
  
  /* RTL Header Label - Text RIGHT, Icons LEFT */
  .nexa-grid.rtl-mode .ag-header-cell-label,
  .ag-theme-alpine.ag-rtl .ag-header-cell-label {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    justify-content: flex-start !important;
  }
  
  /* Text should be on the RIGHT (start in RTL) */
  .nexa-grid.rtl-mode .ag-header-cell-text,
  .ag-theme-alpine.ag-rtl .ag-header-cell-text {
    flex: 1 !important;
    text-align: right !important;
    order: 2 !important;
  }
  
  /* Sort indicator on LEFT */
  .nexa-grid.rtl-mode .ag-sort-indicator-container,
  .ag-theme-alpine.ag-rtl .ag-sort-indicator-container {
    order: 1 !important;
    margin-left: 0 !important;
    margin-right: 8px !important;
  }
  
  /* Filter icon on LEFT */
  .nexa-grid.rtl-mode .ag-header-icon,
  .ag-theme-alpine.ag-rtl .ag-header-icon {
    order: 0 !important;
    margin-left: 0 !important;
    margin-right: 4px !important;
  }
  
  /* Menu button (hamburger) on LEFT */
  .nexa-grid.rtl-mode .ag-header-cell-menu-button,
  .ag-theme-alpine.ag-rtl .ag-header-cell-menu-button {
    order: -1 !important;
    margin-left: 0 !important;
    margin-right: 8px !important;
  }
  
  /* RTL Cell content */
  .nexa-grid.rtl-mode .ag-cell,
  .ag-theme-alpine.ag-rtl .ag-cell {
    text-align: right !important;
    border-right: none !important;
    border-left: 1px solid #e5e7eb !important;
  }
  
  .dark .nexa-grid.rtl-mode .ag-cell,
  .dark .ag-theme-alpine.ag-rtl .ag-cell {
    border-left: 1px solid #374151 !important;
  }
  
  /* RTL Header cell borders */
  .nexa-grid.rtl-mode .ag-header-cell,
  .ag-theme-alpine.ag-rtl .ag-header-cell {
    border-right: none !important;
    border-left: 1px solid rgba(255,255,255,0.2) !important;
  }
  
  /* RTL Paging */
  .nexa-grid.rtl-mode .ag-paging-panel,
  .ag-theme-alpine.ag-rtl .ag-paging-panel {
    direction: rtl !important;
  }
  
  /* RTL Pinned columns */
  .nexa-grid.rtl-mode .ag-pinned-right-header,
  .nexa-grid.rtl-mode .ag-pinned-right-cols-container,
  .ag-theme-alpine.ag-rtl .ag-pinned-right-header,
  .ag-theme-alpine.ag-rtl .ag-pinned-right-cols-container {
    border-left: 1px solid #e5e7eb !important;
    border-right: none !important;
  }
  
  .nexa-grid.rtl-mode .ag-pinned-left-header,
  .nexa-grid.rtl-mode .ag-pinned-left-cols-container,
  .ag-theme-alpine.ag-rtl .ag-pinned-left-header,
  .ag-theme-alpine.ag-rtl .ag-pinned-left-cols-container {
    border-right: 1px solid #e5e7eb !important;
    border-left: none !important;
  }
  
  /* ============================================
     RTL Filter Popup Styling
     ============================================ */
  
  /* Global AG Grid popup RTL support */
  body[data-ag-rtl="true"] .ag-popup,
  body[data-ag-rtl="true"] .ag-menu {
    direction: rtl !important;
  }
  
  body[data-ag-rtl="true"] .ag-filter {
    direction: rtl !important;
    text-align: right !important;
  }
  
  body[data-ag-rtl="true"] .ag-filter-body-wrapper {
    direction: rtl !important;
  }
  
  body[data-ag-rtl="true"] .ag-filter-condition {
    direction: rtl !important;
    text-align: right !important;
  }
  
  body[data-ag-rtl="true"] .ag-select-list {
    direction: rtl !important;
  }
  
  body[data-ag-rtl="true"] .ag-select-list-item {
    text-align: right !important;
    direction: rtl !important;
    padding-right: 12px !important;
    padding-left: 8px !important;
  }
  
  body[data-ag-rtl="true"] .ag-picker-field-wrapper {
    flex-direction: row-reverse !important;
  }
  
  body[data-ag-rtl="true"] .ag-picker-field-display {
    text-align: right !important;
    direction: rtl !important;
  }
  
  body[data-ag-rtl="true"] .ag-text-field-input,
  body[data-ag-rtl="true"] .ag-filter-filter {
    text-align: right !important;
    direction: rtl !important;
  }
  
  body[data-ag-rtl="true"] .ag-filter-apply-panel {
    direction: rtl !important;
    flex-direction: row-reverse !important;
  }
  
  body[data-ag-rtl="true"] .ag-filter-apply-panel-button {
    margin-left: 8px !important;
    margin-right: 0 !important;
  }
  
  body[data-ag-rtl="true"] .ag-mini-filter {
    direction: rtl !important;
  }
  
  body[data-ag-rtl="true"] .ag-mini-filter input {
    text-align: right !important;
  }
  
  /* Filter input styling */
  .nexa-grid .ag-filter-filter,
  .nexa-grid .ag-text-field-input {
    font-family: 'Cairo', sans-serif !important;
  }
  
  /* ============================================
     Popover Fix - Prevent layout shift
     ============================================ */
  [data-radix-popper-content-wrapper] {
    z-index: 9999 !important;
  }
  
  /* Keep scrollbar gutter stable to avoid grid width jump */
  html {
    overflow-y: scroll;
  }
  
  body {
    scrollbar-gutter: stable;
    overflow-x: hidden;
  }
  
  /* Prevent grid container from changing size when popover opens */
  .nexa-grid {
    min-width: 100%;
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }
  
  /* Ensure AG Grid stays full width */
  .nexa-grid .ag-root-wrapper {
    width: 100% !important;
    flex: 1 !important;
  }
  
  .nexa-grid .ag-root {
    width: 100% !important;
  }
  
  .nexa-grid .ag-body-viewport {
    width: 100% !important;
    overflow-x: auto !important;
  }
  
  .nexa-grid .ag-center-cols-container {
    min-width: 100% !important;
  }
  
  .nexa-grid .ag-header-viewport {
    width: 100% !important;
  }
  
  /* ============================================
     Better RTL Header Styling
     ============================================ */
  .nexa-grid.rtl-mode .ag-header-cell-comp-wrapper {
    display: flex !important;
    width: 100% !important;
  }
  
  .nexa-grid.rtl-mode .ag-header-cell-label {
    display: flex !important;
    width: 100% !important;
    flex-direction: row !important;
  }
  
  /* In RTL: Text goes to end (right), icons stay at start (left) */
  .nexa-grid.rtl-mode .ag-header-cell-text {
    flex-grow: 1 !important;
    text-align: right !important;
    margin-right: 0 !important;
    margin-left: auto !important;
  }
  
  .nexa-grid.rtl-mode .ag-sort-indicator-container,
  .nexa-grid.rtl-mode .ag-header-icon {
    margin-right: 8px !important;
    margin-left: 0 !important;
  }
  
  .nexa-grid.rtl-mode .ag-header-cell-menu-button {
    margin-right: 4px !important;
    margin-left: 0 !important;
  }
  
  /* Hide filter search icon in popup */
  body[data-ag-rtl="true"] .ag-icon-filter {
    display: none !important;
  }
  
  .nexa-grid[dir="rtl"] .ag-paging-panel {
    direction: rtl;
  }
  
  .nexa-grid[dir="rtl"] .ag-paging-page-summary-panel {
    flex-direction: row-reverse;
  }
  
  /* Dark mode RTL */
  .dark .nexa-grid[dir="rtl"] .ag-cell {
    border-left: 1px solid #374151 !important;
    border-right: none !important;
  }
  
  /* RTL - Ensure full RTL layout */
  .nexa-grid[dir="rtl"] .ag-root {
    direction: rtl;
  }
  
  .nexa-grid[dir="rtl"] .ag-body-horizontal-scroll-viewport {
    direction: rtl;
  }
  
  .nexa-grid[dir="rtl"] .ag-header-viewport {
    direction: rtl;
  }
  
  /* Ensure cell content aligns right in RTL */
  .nexa-grid[dir="rtl"] .ag-cell-value {
    text-align: right;
    width: 100%;
  }
  
  /* RTL - Menu button (filter) on LEFT side */
  .nexa-grid[dir="rtl"] .ag-header-cell-menu-button {
    order: -2;
    margin-left: 0;
    margin-right: 4px;
  }
  
  /* RTL - Resize handle on correct side */
  .nexa-grid[dir="rtl"] .ag-header-cell-resize {
    right: auto;
    left: 0;
  }
  
  .nexa-grid[dir="rtl"] .ag-pinned-right-header,
  .nexa-grid[dir="rtl"] .ag-pinned-right-cols-container {
    border-left: 1px solid #e5e7eb;
    border-right: none;
  }
  
  .nexa-grid[dir="rtl"] .ag-pinned-left-header,
  .nexa-grid[dir="rtl"] .ag-pinned-left-cols-container {
    border-right: 1px solid #e5e7eb;
    border-left: none;
  }
  
  /* RTL numeric columns - keep LTR for numbers */
  .nexa-grid[dir="rtl"] .ag-cell[col-id="debit"],
  .nexa-grid[dir="rtl"] .ag-cell[col-id="credit"],
  .nexa-grid[dir="rtl"] .ag-cell[col-id="price"],
  .nexa-grid[dir="rtl"] .ag-cell[col-id="quantity"],
  .nexa-grid[dir="rtl"] .ag-cell[col-id="balance"],
  .nexa-grid[dir="rtl"] .ag-cell[col-id="amount"],
  .nexa-grid[dir="rtl"] .ag-cell[col-id="_rowIndex"] {
    direction: ltr;
    text-align: left;
  }

`;

// Main Component
export function NexaGrid<T extends Record<string, any>>({
  data,
  columns,
  rowKey = 'id',
  className,
  height = 500,
  title,
  enableSearch = false,
  enableExport = false,
  enablePrint = false,
  enableMarker = false,
  enableSmartFilters = false,
  enableColumnReordering = true,
  enablePagination = false,
  enableColumnFilters = false,
  enableColumnVisibility = false,
  markerColors: externalMarkerColors,
  onMarkerChange,
  showStats = false,
  stats,
  showAmountInWords = false,
  showDebitCreditHelp = false,
  pageSize: initialPageSize = 50,
  pageSizeOptions = [25, 50, 100, 500],
  onRowClick,
  onCellEdit,
}: NexaGridProps<T>) {
  const { t, direction, isRTL, language } = useLanguage();
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarkerPalette, setShowMarkerPalette] = useState(false);
  const [activeMarkerColor, setActiveMarkerColor] = useState<MarkerColorId>(null);
  const [internalMarkerColors, setInternalMarkerColors] = useState<Record<string, MarkerColorId>>({});
  const [pageSize] = useState(initialPageSize);
  
  // Column Filters State
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);
  
  // Column Visibility State
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showColumnVisibility, setShowColumnVisibility] = useState(false);
  
  const markerColors = externalMarkerColors || internalMarkerColors;
  
  // Extract unique values per column for filters
  const uniqueValuesPerColumn = useMemo(() => {
    const values: Record<string, string[]> = {};
    
    columns.forEach(col => {
      if (col.filterable !== false) {
        const uniqueSet = new Set<string>();
        data.forEach(row => {
          const value = row[col.key];
          if (value !== null && value !== undefined && value !== '') {
            // Format the value for display
            if (col.type === 'number' || col.type === 'currency') {
              uniqueSet.add(String(value));
            } else {
              uniqueSet.add(String(value));
            }
          }
        });
        values[col.key] = Array.from(uniqueSet).sort((a, b) => {
          // Sort numbers numerically, strings alphabetically
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.localeCompare(b, 'ar');
        });
      }
    });
    
    return values;
  }, [data, columns]);
  
  // Filter data based on column filters
  const filteredData = useMemo(() => {
    if (Object.keys(columnFilters).length === 0) {
      return data;
    }
    
    return data.filter(row => {
      return Object.entries(columnFilters).every(([colKey, selectedValues]) => {
        if (selectedValues.length === 0) return true;
        const rowValue = String(row[colKey] ?? '');
        return selectedValues.includes(rowValue);
      });
    });
  }, [data, columnFilters]);
  
  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(columnFilters).reduce((count, values) => count + (values.length > 0 ? 1 : 0), 0);
  }, [columnFilters]);
  
  // Visible columns (excluding hidden)
  const visibleColumns = useMemo(() => {
    return columns.filter(col => !hiddenColumns.includes(col.key));
  }, [columns, hiddenColumns]);
  
  // Resolve translation
  const resolveLabel = useCallback((label: string): string => {
    const translated = t(label, { defaultValue: '' });
    return translated || label;
  }, [t]);
  
  // Computed stats (uses filteredData)
  const computedStats = useMemo(() => {
    if (stats) return stats;
    
    let totalDebit = 0;
    let totalCredit = 0;
    let openingBalance = 0;
    
    filteredData.forEach(row => {
      if (row.debit) totalDebit += Number(row.debit) || 0;
      if (row.credit) totalCredit += Number(row.credit) || 0;
      if (row.openingBalance) openingBalance = Number(row.openingBalance) || 0;
    });
    
    return {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance: openingBalance + totalDebit - totalCredit,
    };
  }, [filteredData, stats]);
  
  // Calculate footer values (uses filteredData)
  const footerValues = useMemo(() => {
    const values: Record<string, number | string> = {};
    
    visibleColumns.forEach(col => {
      if (!col.footer) return;
      
      const numericValues = filteredData
        .map(row => Number(row[col.key]) || 0)
        .filter(v => !isNaN(v));
      
      if (col.footer === 'sum') {
        values[col.key] = numericValues.reduce((a, b) => a + b, 0);
      } else if (col.footer === 'average') {
        values[col.key] = numericValues.length > 0
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          : 0;
      } else if (col.footer === 'count') {
        values[col.key] = filteredData.length;
      } else {
        values[col.key] = col.footer;
      }
    });
    
    return values;
  }, [visibleColumns, filteredData]);
  
  // Add row index to data (use filteredData)
  const processedData = useMemo(() => {
    return filteredData.map((row, index) => ({
      ...row,
      _rowIndex: index + 1,
      _rowId: row[rowKey] || index,
    }));
  }, [filteredData, rowKey]);
  
  // Column definitions for AG Grid
  const columnDefs = useMemo((): ColDef[] => {
    const cols: ColDef[] = [
      // Row number column
      {
        headerName: '#',
        field: '_rowIndex',
        width: 60,
        minWidth: 50,
        maxWidth: 80,
        pinned: isRTL ? 'right' : 'left',
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        cellClass: 'ag-row-number',
        cellRenderer: (params: any) => {
          // Don't show row number for footer row
          if (params.data?._isFooter) {
            return '';
          }
          return params.value;
        },
      },
    ];
    
    visibleColumns.forEach(col => {
      const colDef: ColDef = {
        headerName: resolveLabel(col.title),
        field: col.key,
        width: col.width || 150,
        minWidth: col.minWidth || 80,
        maxWidth: col.maxWidth,
        resizable: col.resizable !== false,
        sortable: col.sortable !== false,
        filter: col.filterable !== false,
        editable: col.editable,
        pinned: col.pinned,
        suppressMovable: false, // Always allow movement if enabled
      };
      
      // Type-specific formatting
      if (col.type === 'number' || col.type === 'currency') {
        colDef.type = 'numericColumn';
        colDef.valueFormatter = (params) => formatNumber(params.value);
        // In RTL, numbers are usually aligned to the left for better readability with decimals,
        // but the user wants right-to-left alignment for the whole table.
        // Let's use start/end instead.
        colDef.cellStyle = { textAlign: isRTL ? 'left' : 'right' };
      }
      
      // Alignment
      if (col.align === 'center') {
        colDef.cellStyle = { ...(colDef.cellStyle as object || {}), textAlign: 'center', justifyContent: 'center' };
      } else if (col.align === 'end') {
        colDef.cellStyle = { ...(colDef.cellStyle as object || {}), textAlign: isRTL ? 'left' : 'right', justifyContent: isRTL ? 'flex-start' : 'flex-end' };
      } else if (col.align === 'start') {
        colDef.cellStyle = { ...(colDef.cellStyle as object || {}), textAlign: isRTL ? 'right' : 'left', justifyContent: isRTL ? 'flex-end' : 'flex-start' };
      }
      
      // Filter options - use text filter for community version
      if (col.filterOptions && col.filterOptions.length > 0) {
        colDef.filter = 'agTextColumnFilter';
      }
      
      // Custom renderer
      if (col.render) {
        colDef.cellRenderer = (params: any) => {
          return col.render!(params.value, params.data, params.rowIndex);
        };
      }
      
      cols.push(colDef);
    });
    
    return cols;
  }, [visibleColumns, isRTL, resolveLabel, enableSmartFilters, enableColumnReordering]);
  
  // Footer row data
  const pinnedBottomRowData = useMemo(() => {
    if (Object.keys(footerValues).length === 0) return undefined;
    
    const footerRow: Record<string, any> = {
      _rowIndex: '', // Empty for footer row - no serial number
      _isFooter: true,
    };
    
    Object.entries(footerValues).forEach(([key, value]) => {
      footerRow[key] = value;
    });
    
    return [footerRow];
  }, [footerValues]);
  
  // Set RTL direction for AG Grid popups (filter dropdowns)
  useEffect(() => {
    if (isRTL) {
      // Add RTL class to body for AG Grid popups
      document.body.setAttribute('data-ag-rtl', 'true');
      document.documentElement.style.setProperty('--ag-popup-direction', 'rtl');
    } else {
      document.body.removeAttribute('data-ag-rtl');
      document.documentElement.style.removeProperty('--ag-popup-direction');
    }
    
    return () => {
      document.body.removeAttribute('data-ag-rtl');
      document.documentElement.style.removeProperty('--ag-popup-direction');
    };
  }, [isRTL]);
  
  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
    // Auto-size columns to fit
    params.api.sizeColumnsToFit();
    
    // Resize on window resize
    const handleResize = () => {
      setTimeout(() => {
        params.api.sizeColumnsToFit();
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Row class rules for markers
  const getRowClass = useCallback((params: RowClassParams): string => {
    if (params.data?._isFooter) {
      return 'ag-footer-row';
    }
    
    const rowId = String(params.data?._rowId || params.data?.[rowKey]);
    const markerColor = markerColors[rowId];
    
    if (markerColor) {
      return `marker-${markerColor}`;
    }
    
    return '';
  }, [markerColors, rowKey]);
  
  // Redraw rows when marker colors change
  useEffect(() => {
    if (gridApiRef.current) {
      gridApiRef.current.redrawRows();
    }
  }, [markerColors]);
  
  // Handle cell click for marker
  const onCellClicked = useCallback((event: CellClickedEvent) => {
    if (event.data?._isFooter) return;
    
    const rowId = String(event.data?._rowId || event.data?.[rowKey]);
    
    // If marker is enabled and a color is selected, apply/remove marker
    if (enableMarker && activeMarkerColor) {
      const currentColor = markerColors[rowId];
      
      if (currentColor) {
        // Already marked - toggle or remove
        if (currentColor === activeMarkerColor) {
          // Same color - remove it
          const newColors = { ...markerColors };
          delete newColors[rowId];
          setInternalMarkerColors(newColors);
          onMarkerChange?.(rowId, null);
        } else {
          // Different color - update it
          setInternalMarkerColors({
            ...markerColors,
            [rowId]: activeMarkerColor,
          });
          onMarkerChange?.(rowId, activeMarkerColor);
        }
      } else {
        // Not marked - add it
        setInternalMarkerColors({
          ...markerColors,
          [rowId]: activeMarkerColor,
        });
        onMarkerChange?.(rowId, activeMarkerColor);
      }
      
      // Force redraw rows to show changes
      setTimeout(() => {
        gridApiRef.current?.redrawRows();
      }, 10);
    } else if (onRowClick) {
      onRowClick(event.data, event.rowIndex!);
    }
  }, [enableMarker, activeMarkerColor, markerColors, rowKey, onMarkerChange, onRowClick]);
  
  // Quick filter
  const onQuickFilterChanged = useCallback((value: string) => {
    setSearchQuery(value);
    gridApiRef.current?.setGridOption('quickFilterText', value);
  }, []);
  
  // Clear all filters
  const handleClearFilters = useCallback(() => {
    gridApiRef.current?.setFilterModel(null);
    setSearchQuery('');
    setColumnFilters({});
    gridApiRef.current?.setGridOption('quickFilterText', '');
  }, []);
  
  // Toggle column filter value
  const handleColumnFilterToggle = useCallback((columnKey: string, value: string) => {
    setColumnFilters(prev => {
      const current = prev[columnKey] || [];
      const isSelected = current.includes(value);
      
      if (isSelected) {
        // Remove value
        const newValues = current.filter(v => v !== value);
        if (newValues.length === 0) {
          const { [columnKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [columnKey]: newValues };
      } else {
        // Add value
        return { ...prev, [columnKey]: [...current, value] };
      }
    });
  }, []);
  
  // Select all values for a column
  const handleSelectAllColumnFilter = useCallback((columnKey: string) => {
    const allValues = uniqueValuesPerColumn[columnKey] || [];
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: [...allValues]
    }));
  }, [uniqueValuesPerColumn]);
  
  // Clear column filter
  const handleClearColumnFilter = useCallback((columnKey: string) => {
    setColumnFilters(prev => {
      const { [columnKey]: _, ...rest } = prev;
      return rest;
    });
  }, []);
  
  // Toggle column visibility
  const handleToggleColumnVisibility = useCallback((columnKey: string) => {
    setHiddenColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(k => k !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  }, []);
  
  // Show all columns
  const handleShowAllColumns = useCallback(() => {
    setHiddenColumns([]);
  }, []);
  
  // Export CSV
  const handleExportCSV = useCallback(() => {
    gridApiRef.current?.exportDataAsCsv({
      fileName: `export_${new Date().toISOString().split('T')[0]}.csv`,
      columnSeparator: ',',
      processCellCallback: (params) => {
        if (params.column.getColId() === '_rowIndex' && params.node?.data?._isFooter) {
          return t('table.totals') || 'المجاميع';
        }
        return params.value;
      },
    });
  }, [t]);
  
  // Export Excel (Tab-separated for Excel compatibility)
  const handleExportExcel = useCallback(() => {
    const exportColumns = visibleColumns;
    const exportData = filteredData;
    
    const headers = exportColumns.map(col => resolveLabel(col.title));
    const rows = exportData.map(row =>
      exportColumns.map(col => {
        const value = row[col.key];
        // Format numbers
        if ((col.type === 'number' || col.type === 'currency') && value != null) {
          return formatNumber(value);
        }
        return value ?? '';
      }).join('\t')
    );
    
    // Add footer
    if (Object.keys(footerValues).length > 0) {
      const footerRow = exportColumns.map(col => {
        const value = footerValues[col.key];
        return typeof value === 'number' ? formatNumber(value) : value || '';
      }).join('\t');
      rows.push(footerRow);
    }
    
    // Add stats if shown
    if (showStats && computedStats) {
      rows.push('');
      if (computedStats.totalDebit !== undefined) {
        rows.push(`${t('accounting.labels.debitTotal') || 'إجمالي المدين'}\t${formatNumber(computedStats.totalDebit)}`);
      }
      if (computedStats.totalCredit !== undefined) {
        rows.push(`${t('accounting.labels.creditTotal') || 'إجمالي الدائن'}\t${formatNumber(computedStats.totalCredit)}`);
      }
      if (computedStats.closingBalance !== undefined) {
        rows.push(`${t('accounting.closingBalance') || 'الرصيد الختامي'}\t${formatNumber(computedStats.closingBalance)}`);
      }
    }
    
    const tsv = '\uFEFF' + [headers.join('\t'), ...rows].join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `export_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  }, [visibleColumns, filteredData, footerValues, resolveLabel, showStats, computedStats, t]);
  
  // Open in Google Sheets
  const handleOpenGoogleSheets = useCallback(async () => {
    const exportColumns = visibleColumns;
    const exportData = filteredData;
    
    const headers = exportColumns.map(col => resolveLabel(col.title));
    const rows = exportData.map(row =>
      exportColumns.map(col => {
        const value = row[col.key];
        // Format numbers
        if ((col.type === 'number' || col.type === 'currency') && value != null) {
          return formatNumber(value);
        }
        return value ?? '';
      }).join('\t')
    );
    
    // Add footer
    if (Object.keys(footerValues).length > 0) {
      const footerRow = exportColumns.map(col => {
        const value = footerValues[col.key];
        return typeof value === 'number' ? formatNumber(value) : value || '';
      }).join('\t');
      rows.push('');
      rows.push(`${t('table.totals') || 'المجاميع'}\t${footerRow}`);
    }
    
    // Add stats if shown
    if (showStats && computedStats) {
      rows.push('');
      if (computedStats.openingBalance !== undefined) {
        rows.push(`${t('accounting.openingBalance') || 'الرصيد الافتتاحي'}\t${formatNumber(computedStats.openingBalance)}`);
      }
      if (computedStats.totalDebit !== undefined) {
        rows.push(`${t('accounting.labels.debitTotal') || 'إجمالي المدين'}\t${formatNumber(computedStats.totalDebit)}`);
      }
      if (computedStats.totalCredit !== undefined) {
        rows.push(`${t('accounting.labels.creditTotal') || 'إجمالي الدائن'}\t${formatNumber(computedStats.totalCredit)}`);
      }
      if (computedStats.closingBalance !== undefined) {
        rows.push(`${t('accounting.closingBalance') || 'الرصيد الختامي'}\t${formatNumber(computedStats.closingBalance)}`);
      }
    }
    
    const tsv = [headers.join('\t'), ...rows].join('\n');
    
    // Copy to clipboard silently
    try {
      // Method 1: Modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsv);
      } else {
        // Method 2: Fallback using textarea
        const textArea = document.createElement('textarea');
        textArea.value = tsv;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
    
    // Open Google Sheets directly (create new spreadsheet)
    window.open('https://sheets.new', '_blank');
  }, [visibleColumns, filteredData, footerValues, resolveLabel, t, showStats, computedStats]);
  
  // Print with beautiful formatting
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printColumns = visibleColumns;
    const printData = filteredData;
    
    const headers = printColumns.map(col => 
      `<th style="padding:12px 16px;border:1px solid #d1d5db;background:linear-gradient(135deg, #2d5a4c 0%, #1e3d33 100%);color:white;font-weight:600;white-space:nowrap;text-align:${col.align === 'end' ? 'right' : col.align === 'center' ? 'center' : 'right'};">${resolveLabel(col.title)}</th>`
    ).join('');
    
    const rows = printData.map((row, idx) => {
      const rowId = String(row[rowKey]);
      const markerColor = markerColors[rowId];
      const bgColor = markerColor ? MARKER_COLORS[markerColor].bg : (idx % 2 === 0 ? '#ffffff' : '#f9fafb');
      const borderColor = markerColor ? MARKER_COLORS[markerColor].border : '#e5e7eb';
      
      const cells = printColumns.map(col => {
        let value = row[col.key];
        if ((col.type === 'number' || col.type === 'currency') && value != null) {
          value = formatNumber(value);
        }
        const textAlign = col.type === 'number' || col.type === 'currency' ? 'left' : (col.align === 'center' ? 'center' : 'right');
        const fontWeight = markerColor ? '500' : 'normal';
        return `<td style="padding:10px 16px;border:1px solid ${borderColor};background:${bgColor};text-align:${textAlign};font-weight:${fontWeight};">${value ?? ''}</td>`;
      }).join('');
      
      return `<tr><td style="padding:10px 16px;border:1px solid ${borderColor};background:${bgColor};text-align:center;color:#6b7280;font-weight:500;">${idx + 1}</td>${cells}</tr>`;
    }).join('');
    
    // Footer row
    let footerRow = '';
    if (Object.keys(footerValues).length > 0) {
      const footerCells = printColumns.map(col => {
        const value = footerValues[col.key];
        const display = typeof value === 'number' ? formatNumber(value) : value || '';
        const textAlign = col.type === 'number' || col.type === 'currency' ? 'left' : 'right';
        return `<td style="padding:12px 16px;border:1px solid #4a8a74;background:linear-gradient(135deg, #e8f5f0 0%, #d1e8df 100%);font-weight:bold;color:#2d5a4c;text-align:${textAlign};">${display}</td>`;
      }).join('');
      footerRow = `<tr><td style="padding:12px 16px;border:1px solid #4a8a74;background:linear-gradient(135deg, #e8f5f0 0%, #d1e8df 100%);font-weight:bold;color:#2d5a4c;text-align:center;">${t('table.totals') || 'المجاميع'}</td>${footerCells}</tr>`;
    }
    
    // Stats section with beautiful cards
    let statsHtml = '';
    if (showStats && computedStats) {
      statsHtml = `
        <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;justify-content:flex-start;">
          ${computedStats.openingBalance !== undefined ? `
            <div style="padding:16px 24px;background:linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);border-radius:12px;border:1px solid #7dd3fc;box-shadow:0 2px 8px rgba(0,0,0,0.05);min-width:200px;">
              <div style="color:#0369a1;font-size:12px;font-weight:500;margin-bottom:4px;">${t('accounting.openingBalance') || 'الرصيد الافتتاحي'}</div>
              <div style="color:#0c4a6e;font-size:20px;font-weight:700;">${formatNumber(computedStats.openingBalance)}</div>
            </div>
          ` : ''}
          ${computedStats.totalDebit !== undefined ? `
            <div style="padding:16px 24px;background:linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);border-radius:12px;border:1px solid #f87171;box-shadow:0 2px 8px rgba(0,0,0,0.05);min-width:200px;">
              <div style="color:#dc2626;font-size:12px;font-weight:500;margin-bottom:4px;">${t('accounting.labels.debitTotal') || 'إجمالي المدين'}</div>
              <div style="color:#991b1b;font-size:20px;font-weight:700;">${formatNumber(computedStats.totalDebit)}</div>
            </div>
          ` : ''}
          ${computedStats.totalCredit !== undefined ? `
            <div style="padding:16px 24px;background:linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);border-radius:12px;border:1px solid #34d399;box-shadow:0 2px 8px rgba(0,0,0,0.05);min-width:200px;">
              <div style="color:#059669;font-size:12px;font-weight:500;margin-bottom:4px;">${t('accounting.labels.creditTotal') || 'إجمالي الدائن'}</div>
              <div style="color:#065f46;font-size:20px;font-weight:700;">${formatNumber(computedStats.totalCredit)}</div>
            </div>
          ` : ''}
          ${computedStats.closingBalance !== undefined ? `
            <div style="padding:16px 24px;background:linear-gradient(135deg, #e8f5f0 0%, #d1e8df 100%);border-radius:12px;border:2px solid #2d5a4c;box-shadow:0 4px 12px rgba(45,90,76,0.15);min-width:200px;">
              <div style="color:#2d5a4c;font-size:12px;font-weight:500;margin-bottom:4px;">${t('accounting.closingBalance') || 'الرصيد الختامي'}</div>
              <div style="color:#1e3d33;font-size:24px;font-weight:700;">${formatNumber(computedStats.closingBalance)}</div>
            </div>
          ` : ''}
        </div>
        ${showAmountInWords && computedStats.closingBalance !== undefined ? `
          <div style="padding:16px 24px;background:linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);border-radius:12px;border:1px solid #facc15;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="color:#a16207;font-size:12px;font-weight:500;margin-bottom:4px;">${t('accounting.amountInWords') || 'المبلغ بالتفقيط'}</div>
            <div style="color:#713f12;font-size:16px;font-weight:600;">${numberToWords(Math.abs(computedStats.closingBalance), language)} ${computedStats.closingBalance >= 0 ? (t('accounting.debitBalance') || 'مدين') : (t('accounting.creditBalance') || 'دائن')}</div>
          </div>
        ` : ''}
      `;
    }
    
    // Generate marker legend if there are marked rows
    let markerLegend = '';
    const usedMarkers = new Set<string>();
    printData.forEach(row => {
      const rowId = String(row[rowKey]);
      const markerColor = markerColors[rowId];
      if (markerColor) usedMarkers.add(markerColor);
    });
    
    if (usedMarkers.size > 0) {
      const legendItems = Array.from(usedMarkers).map(colorId => {
        const color = MARKER_COLORS[colorId as keyof typeof MARKER_COLORS];
        return `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:16px;">
          <span style="width:16px;height:16px;border-radius:4px;background:${color.bg};border:1px solid ${color.border};"></span>
          <span style="font-size:12px;color:#6b7280;">${color.name}</span>
        </span>`;
      }).join('');
      
      markerLegend = `
        <div style="margin-bottom:16px;padding:12px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <span style="font-size:12px;font-weight:600;color:#374151;margin-left:8px;">${t('table.markerLegend') || 'دليل الألوان'}:</span>
          ${legendItems}
        </div>
      `;
    }
    
    // Active filters info
    let filtersInfo = '';
    if (activeFiltersCount > 0) {
      filtersInfo = `
        <div style="margin-bottom:16px;padding:12px 16px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d;">
          <span style="font-size:12px;color:#92400e;">
            ⚠️ ${t('table.filteredData') || 'البيانات مفلترة'}: ${printData.length} ${t('table.of') || 'من'} ${data.length} ${t('table.records') || 'سجل'}
          </span>
        </div>
      `;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <title>${title || t('common.print') || 'طباعة'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            padding: 32px;
            direction: ${direction};
            background: #ffffff;
            color: #1f2937;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #2d5a4c;
          }
          .title {
            font-size: 24px;
            font-weight: 700;
            color: #2d5a4c;
          }
          .date {
            font-size: 12px;
            color: #6b7280;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 16px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          thead tr {
            background: linear-gradient(135deg, #2d5a4c 0%, #1e3d33 100%);
          }
          th {
            color: white;
            font-weight: 600;
            padding: 14px 16px;
            text-align: right;
            border: none;
            font-size: 14px;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          tbody tr:hover {
            background: #f9fafb;
          }
          tfoot tr {
            background: linear-gradient(135deg, #e8f5f0 0%, #d1e8df 100%);
          }
          tfoot td {
            font-weight: 700;
            color: #2d5a4c;
            border-top: 2px solid #2d5a4c;
          }
          .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
          @media print {
            body { 
              print-color-adjust: exact; 
              -webkit-print-color-adjust: exact;
              padding: 0;
            }
            @page {
              margin: 1cm;
              size: A4 ${direction === 'rtl' ? 'landscape' : 'portrait'};
            }
            .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title || t('common.report') || 'تقرير'}</div>
          <div class="date">${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        ${filtersInfo}
        ${markerLegend}
        ${statsHtml}
        <table>
          <thead>
            <tr>
              <th style="width:50px;text-align:center;">#</th>
              ${headers}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          ${footerRow ? `<tfoot>${footerRow}</tfoot>` : ''}
        </table>
        <div class="footer">
          ${t('common.printedOn') || 'طُبع بتاريخ'}: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}
          ${activeFiltersCount > 0 ? ` | ${t('table.filteredResults') || 'نتائج مفلترة'}` : ''}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }, [visibleColumns, filteredData, data, footerValues, markerColors, rowKey, direction, resolveLabel, t, title, showStats, computedStats, showAmountInWords, activeFiltersCount, language]);
  
  return (
    <>
      <style>{agGridCustomStyles}</style>
      
      <div 
        className={cn(
          'flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-full nexa-grid',
          isRTL && 'rtl-mode',
          className
        )}
        dir={direction}
      >
        {/* Stats Cards */}
        {showStats && (
          <div className="flex flex-wrap gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            {computedStats.openingBalance !== undefined && computedStats.openingBalance !== 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm text-blue-600 dark:text-blue-400">{t('accounting.openingBalance')}</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{formatNumber(computedStats.openingBalance)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm text-red-600 dark:text-red-400">{t('accounting.labels.debitTotal')}</span>
              <span className="font-bold text-red-700 dark:text-red-300">{formatNumber(computedStats.totalDebit)}</span>
              {showDebitCreditHelp && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-red-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('accounting.help.debit')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <span className="text-sm text-green-600 dark:text-green-400">{t('accounting.labels.creditTotal')}</span>
              <span className="font-bold text-green-700 dark:text-green-300">{formatNumber(computedStats.totalCredit)}</span>
              {showDebitCreditHelp && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-green-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('accounting.help.credit')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="text-sm text-amber-600 dark:text-amber-400">{t('accounting.closingBalance')}</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {formatNumber(computedStats.closingBalance)}
                <span className="text-xs ms-1">
                  ({(computedStats.closingBalance || 0) >= 0 ? t('accounting.debitBalance') : t('accounting.creditBalance')})
                </span>
              </span>
            </div>
            
            {showAmountInWords && computedStats.closingBalance !== undefined && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 flex-wrap">
                <span className="text-sm text-purple-600 dark:text-purple-400">{t('accounting.amountInWords')}:</span>
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {numberToWords(Math.abs(computedStats.closingBalance), language)}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {/* Search */}
          {enableSearch && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => onQuickFilterChanged(e.target.value)}
                placeholder={t('common.search') || 'بحث...'}
                className="ps-9 h-9"
              />
            </div>
          )}
          
          {/* Column Filters - Smart Categorized */}
          {enableColumnFilters && (() => {
            // Priority filter keys (shown first) - common accounting/ERP fields
            const priorityKeys = ['costCenter', 'currency', 'warehouse', 'supplier', 'unit', 'status', 'accountName', 'item', 'reference', 'entryNumber'];
            
            // Get all filterable columns with unique values (max 50 unique values)
            const filterableColumns = columns.filter(col => 
              col.filterable !== false && 
              uniqueValuesPerColumn[col.key]?.length > 0 &&
              uniqueValuesPerColumn[col.key]?.length <= 50
            );
            
            // Separate priority and other columns
            const priorityColumns = filterableColumns.filter(col => priorityKeys.includes(col.key));
            const otherColumns = filterableColumns.filter(col => !priorityKeys.includes(col.key));
            
            // Get icon for filter based on column key
            const getFilterIcon = (key: string) => {
              if (key === 'currency') return '💱';
              if (key === 'costCenter') return '🏢';
              if (key === 'warehouse') return '📦';
              if (key === 'supplier') return '🏭';
              if (key === 'unit') return '📏';
              if (key === 'status') return '📊';
              if (key === 'accountName') return '📒';
              if (key === 'item') return '📋';
              return null;
            };
            
            // Render filter button
            const renderFilterButton = (col: NexaGridColumn) => {
              const selectedCount = columnFilters[col.key]?.length || 0;
              const uniqueValues = uniqueValuesPerColumn[col.key] || [];
              const isOpen = openFilterPopover === col.key;
              const icon = getFilterIcon(col.key);
              
              return (
                <Popover 
                  key={col.key} 
                  open={isOpen} 
                  onOpenChange={(open) => setOpenFilterPopover(open ? col.key : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant={selectedCount > 0 ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 text-xs gap-1.5',
                        selectedCount > 0 
                          ? 'bg-[#2d5a4c] hover:bg-[#1e3d33] text-white' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {icon ? <span className="text-sm">{icon}</span> : <Filter className="w-3 h-3" />}
                      <span className="max-w-[100px] truncate">{resolveLabel(col.title)}</span>
                      {selectedCount > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-white/20 text-white">
                          {selectedCount}
                        </Badge>
                      )}
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-72 p-0" 
                    align={isRTL ? 'end' : 'start'}
                    side="bottom"
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          {icon && <span>{icon}</span>}
                          {resolveLabel(col.title)}
                        </span>
                        <span className="text-xs text-muted-foreground bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {selectedCount}/{uniqueValues.length}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleSelectAllColumnFilter(col.key)}
                        >
                          <Check className="w-3 h-3 me-1" />
                          {t('common.selectAll') || 'تحديد الكل'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleClearColumnFilter(col.key)}
                        >
                          <X className="w-3 h-3 me-1" />
                          {t('common.clear') || 'مسح'}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[220px]">
                      <div className="p-2 space-y-0.5">
                        {uniqueValues.map((value, idx) => {
                          const isChecked = columnFilters[col.key]?.includes(value) || false;
                          const displayValue = col.type === 'number' || col.type === 'currency' 
                            ? formatNumber(parseFloat(value))
                            : value;
                          
                          // Count occurrences
                          const count = data.filter(row => String(row[col.key] ?? '') === value).length;
                          
                          return (
                            <label
                              key={idx}
                              className={cn(
                                'flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-all',
                                'hover:bg-gray-100 dark:hover:bg-gray-800',
                                isChecked && 'bg-[#2d5a4c]/10 border-s-2 border-[#2d5a4c]'
                              )}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleColumnFilterToggle(col.key, value)}
                                className="h-4 w-4"
                              />
                              <span className="text-sm truncate flex-1" title={displayValue}>
                                {displayValue || `(${t('common.empty') || 'فارغ'})`}
                              </span>
                              <span className="text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {count}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              );
            };
            
            return (
              <div className="flex items-center gap-1 flex-wrap">
                {/* Priority Filters */}
                {priorityColumns.map(col => renderFilterButton(col))}
                
                {/* More Filters Dropdown */}
                {otherColumns.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <Filter className="w-3 h-3" />
                        {t('table.moreFilters') || 'المزيد'}
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          {otherColumns.length}
                        </Badge>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align={isRTL ? 'end' : 'start'} side="bottom">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <span className="text-sm font-semibold">{t('table.additionalFilters') || 'فلاتر إضافية'}</span>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="p-2 space-y-2">
                          {otherColumns.map(col => {
                            const selectedCount = columnFilters[col.key]?.length || 0;
                            const uniqueValues = uniqueValuesPerColumn[col.key] || [];
                            
                            return (
                              <div key={col.key} className="border rounded-lg p-2 bg-white dark:bg-gray-900">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">{resolveLabel(col.title)}</span>
                                  {selectedCount > 0 && (
                                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-[#2d5a4c]/10 text-[#2d5a4c]">
                                      {selectedCount}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {uniqueValues.slice(0, 8).map((value, idx) => {
                                    const isChecked = columnFilters[col.key]?.includes(value) || false;
                                    const displayValue = col.type === 'number' || col.type === 'currency' 
                                      ? formatNumber(parseFloat(value))
                                      : value;
                                    
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => handleColumnFilterToggle(col.key, value)}
                                        className={cn(
                                          'px-2 py-1 text-[11px] rounded-md transition-all',
                                          isChecked 
                                            ? 'bg-[#2d5a4c] text-white' 
                                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        )}
                                        title={displayValue}
                                      >
                                        {(displayValue || '(فارغ)').slice(0, 15)}{displayValue && displayValue.length > 15 ? '...' : ''}
                                      </button>
                                    );
                                  })}
                                  {uniqueValues.length > 8 && (
                                    <span className="px-2 py-1 text-[10px] text-muted-foreground">+{uniqueValues.length - 8}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
                
                {/* Active Filters Badge */}
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-8 px-3 bg-[#2d5a4c]/10 text-[#2d5a4c] dark:bg-[#4a8a74]/20 dark:text-[#4a8a74] cursor-pointer hover:bg-[#2d5a4c]/20 transition-colors"
                    onClick={handleClearFilters}
                  >
                    <FilterX className="w-3.5 h-3.5 me-1.5" />
                    {activeFiltersCount} {t('table.activeFilters') || 'فلتر نشط'}
                    <X className="w-3 h-3 ms-1.5 opacity-60" />
                  </Badge>
                )}
              </div>
            );
          })()}
          
          <div className="flex items-center gap-2 ms-auto">
            {/* Column Visibility Toggle */}
            {enableColumnVisibility && (
              <Popover open={showColumnVisibility} onOpenChange={setShowColumnVisibility}>
                <TooltipProvider>
                  <Tooltip>
                    <PopoverTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-8 w-8 p-0',
                            hiddenColumns.length > 0 && 'border-[#2d5a4c] text-[#2d5a4c]'
                          )}
                        >
                          <Columns className="w-4 h-4" />
                          {hiddenColumns.length > 0 && (
                            <span className="absolute -top-1 -end-1 w-4 h-4 bg-[#2d5a4c] text-white text-[10px] rounded-full flex items-center justify-center">
                              {hiddenColumns.length}
                            </span>
                          )}
                        </Button>
                      </TooltipTrigger>
                    </PopoverTrigger>
                    <TooltipContent>{t('table.columnVisibility') || 'إظهار/إخفاء الأعمدة'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <PopoverContent 
                  className="w-64 p-0" 
                  align={isRTL ? 'start' : 'end'}
                  side="bottom"
                >
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('table.columns') || 'الأعمدة'}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={handleShowAllColumns}
                      >
                        {t('table.showAll') || 'إظهار الكل'}
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[250px]">
                    <div className="p-2 space-y-1">
                      {columns.map((col) => {
                        const isVisible = !hiddenColumns.includes(col.key);
                        
                        return (
                          <label
                            key={col.key}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                              'hover:bg-gray-100 dark:hover:bg-gray-800',
                              isVisible && 'bg-[#2d5a4c]/5'
                            )}
                          >
                            <Checkbox
                              checked={isVisible}
                              onCheckedChange={() => handleToggleColumnVisibility(col.key)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm flex-1">{resolveLabel(col.title)}</span>
                            {isVisible ? (
                              <Eye className="w-4 h-4 text-[#2d5a4c]" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
            {/* Marker Toggle with Floating Palette */}
            {enableMarker && (
              <Popover open={showMarkerPalette} onOpenChange={setShowMarkerPalette}>
                <TooltipProvider>
                  <Tooltip>
                    <PopoverTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant={showMarkerPalette ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'relative h-8 w-8 p-0',
                            showMarkerPalette ? 'bg-teal-600 hover:bg-teal-700' : ''
                          )}
                        >
                          <Paintbrush className="w-4 h-4" />
                          {activeMarkerColor && (
                            <span 
                              className="absolute -top-1 -end-1 w-3 h-3 rounded-full border"
                              style={{ 
                                backgroundColor: MARKER_COLORS[activeMarkerColor].bg, 
                                borderColor: MARKER_COLORS[activeMarkerColor].border 
                              }}
                            />
                          )}
                        </Button>
                      </TooltipTrigger>
                    </PopoverTrigger>
                    <TooltipContent>{t('table.marker')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <PopoverContent 
                  className="w-auto p-3" 
                  align={isRTL ? 'start' : 'end'}
                  side="bottom"
                  sideOffset={8}
                >
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('table.selectMarkerColor')}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(Object.keys(MARKER_COLORS) as (keyof typeof MARKER_COLORS)[]).map((colorId) => {
                        const color = MARKER_COLORS[colorId];
                        return (
                          <button
                            key={colorId}
                            onClick={() => {
                              setActiveMarkerColor(colorId === activeMarkerColor ? null : colorId);
                            }}
                            className={cn(
                              'w-8 h-8 rounded-full border-2 transition-all shadow-sm',
                              activeMarkerColor === colorId 
                                ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' 
                                : 'hover:scale-105'
                            )}
                            style={{ backgroundColor: color.bg, borderColor: color.border }}
                            title={color.name}
                          />
                        );
                      })}
                      
                      {/* Clear marker button */}
                      <button
                        onClick={() => setActiveMarkerColor(null)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center transition-all',
                          activeMarkerColor === null ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:border-gray-600'
                        )}
                        title={t('table.clearMarker') || 'إزالة الماركر'}
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    
                    {activeMarkerColor && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span 
                          className="inline-block w-3 h-3 rounded" 
                          style={{ 
                            backgroundColor: MARKER_COLORS[activeMarkerColor].bg, 
                            border: `1px solid ${MARKER_COLORS[activeMarkerColor].border}` 
                          }} 
                        />
                        {t('table.clickRowToMark')}
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            {/* Export Icons - Direct buttons */}
            {enableExport && (
              <div className="flex items-center gap-1 border-s border-gray-200 dark:border-gray-700 ps-2 ms-1">
                {/* CSV Export */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleExportCSV}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('table.exportCSV') || 'CSV'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Excel Export */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleExportExcel}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('table.exportExcel') || 'Excel'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Google Sheets */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleOpenGoogleSheets}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" fill="#0F9D58"/>
                          <rect x="6" y="6" width="12" height="3" fill="white"/>
                          <rect x="6" y="10.5" width="12" height="3" fill="white"/>
                          <rect x="6" y="15" width="12" height="3" fill="white"/>
                          <line x1="10" y1="6" x2="10" y2="18" stroke="#0F9D58" strokeWidth="1.5"/>
                          <line x1="14" y1="6" x2="14" y2="18" stroke="#0F9D58" strokeWidth="1.5"/>
                        </svg>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('table.openGoogleSheets') || 'Google Sheets'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            {/* Clear Filters */}
            {(enableSmartFilters || searchQuery) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearFilters}
                      className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                    >
                      <FilterX className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('table.clearFilters') || 'مسح الفلاتر'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Print */}
            {enablePrint && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.print')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* AG Grid */}
        <div 
          className={cn('ag-theme-alpine w-full', isRTL && 'rtl-mode')}
          style={{ 
            height: typeof height === 'number' ? `${height}px` : height,
            width: '100%',
            minWidth: 0, // Prevents flex item from overflowing
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={processedData}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: enableSmartFilters,
            }}
            pinnedBottomRowData={pinnedBottomRowData}
            enableRtl={isRTL}
            rowSelection="single"
            animateRows={true}
            pagination={enablePagination}
            paginationPageSize={pageSize}
            paginationPageSizeSelector={pageSizeOptions}
            getRowClass={getRowClass}
            onGridReady={onGridReady}
            onCellClicked={onCellClicked}
            suppressRowClickSelection={true}
            domLayout="normal"
            rowHeight={44}
            headerHeight={48}
            localeText={isRTL ? {
              // Pagination
              page: 'صفحة',
              of: 'من',
              to: '-',
              // Loading/Empty
              noRowsToShow: 'لا توجد بيانات',
              loadingOoo: 'جاري التحميل...',
              // Filter
              filterOoo: 'تصفية...',
              searchOoo: 'بحث...',
              selectAll: 'تحديد الكل',
              selectAllSearchResults: 'تحديد كل نتائج البحث',
              blanks: 'فارغ',
              // Filter conditions - Text
              contains: 'يحتوي على',
              notContains: 'لا يحتوي على',
              equals: 'يساوي',
              notEqual: 'لا يساوي',
              startsWith: 'يبدأ بـ',
              endsWith: 'ينتهي بـ',
              blank: 'فارغ',
              notBlank: 'غير فارغ',
              // Filter conditions - Numbers
              lessThan: 'أقل من',
              greaterThan: 'أكبر من',
              lessThanOrEqual: 'أقل من أو يساوي',
              greaterThanOrEqual: 'أكبر من أو يساوي',
              inRange: 'بين',
              inRangeStart: 'من',
              inRangeEnd: 'إلى',
              // Filter buttons
              applyFilter: 'تطبيق',
              resetFilter: 'إعادة تعيين',
              clearFilter: 'مسح',
              andCondition: 'و',
              orCondition: 'أو',
              // Column menu
              pinColumn: 'تثبيت العمود',
              pinLeft: 'تثبيت يسار',
              pinRight: 'تثبيت يمين',
              noPin: 'بدون تثبيت',
              autosizeThiscolumn: 'حجم تلقائي',
              autosizeAllColumns: 'حجم تلقائي للكل',
              resetColumns: 'إعادة تعيين الأعمدة',
              // Other
              copy: 'نسخ',
              ctrlC: 'Ctrl+C',
              copyWithHeaders: 'نسخ مع العناوين',
              paste: 'لصق',
              ctrlV: 'Ctrl+V',
            } : undefined}
          />
        </div>
      </div>
    </>
  );
}

export default NexaGrid;
