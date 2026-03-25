/**
 * ════════════════════════════════════════════════════════════════════
 * 📋 NexaListTable — مكون الجدول المشترك الغني
 * ════════════════════════════════════════════════════════════════════
 *
 * Reusable rich list-table component extracted from PurchaseInvoicesList.
 * Provides a consistent, premium look across all modules.
 *
 * Features:
 *   ✅ Toolbar: search + date picker + count + background loading
 *   ✅ Advanced Filters Row: dynamic select/number-range filters
 *   ✅ Rich Table: colored accents, row numbers, multi-line cells
 *   ✅ Loading Skeletons
 *   ✅ Empty State
 *   ✅ Footer with totals
 *   ✅ Full RTL/LTR support
 *   ✅ Sortable columns
 *
 * Usage:
 *   <NexaListTable
 *     data={filteredData}
 *     columns={columns}
 *     searchTerm={search}
 *     onSearchChange={setSearch}
 *     isLoading={isLoading}
 *     onRowClick={handleRowClick}
 *   />
 *
 * ════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode, useState, useCallback } from 'react';
import { Search, XCircle, ArrowUpDown, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    ColorMarkerPalette,
    MARKER_COLORS,
    getMarkerBackgroundColor,
    getMarkerColor,
    type MarkerColorId
} from '@/components/shared/ColorMarkerPalette';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface NexaListColumn<T> {
    /** Unique column identifier */
    id: string;
    /** Column header text */
    header: string;
    /** Field key for sorting */
    sortKey?: string;
    /** Is this column sortable? */
    sortable?: boolean;
    /** Text alignment */
    align?: 'start' | 'center' | 'end';
    /** CSS width class (e.g. "w-12", "min-w-[200px]") */
    width?: string;
    /** Cell render function */
    cell: (row: T, index: number) => ReactNode;
}

export interface NexaListFilter {
    /** Unique filter identifier */
    id: string;
    /** Display label */
    label: string;
    /** Filter type */
    type: 'select' | 'number-range';
    /** Current value (for select) */
    value?: string;
    /** Change handler (for select) */
    onChange?: (value: string) => void;
    /** Options (for select) */
    options?: { value: string; label: string }[];
    /** Min value (for number-range) */
    minValue?: string;
    /** Max value (for number-range) */
    maxValue?: string;
    /** Min change handler (for number-range) */
    onMinChange?: (value: string) => void;
    /** Max change handler (for number-range) */
    onMaxChange?: (value: string) => void;
    /** Min placeholder (for number-range) */
    minPlaceholder?: string;
    /** Max placeholder (for number-range) */
    maxPlaceholder?: string;
}

export interface NexaListTableProps<T> {
    /** Data array to display */
    data: T[];
    /** Column definitions */
    columns: NexaListColumn<T>[];

    // ─── Search ───
    /** Current search term */
    searchTerm?: string;
    /** Search change handler */
    onSearchChange?: (term: string) => void;
    /** Search input placeholder */
    searchPlaceholder?: string;

    // ─── Date Filter ───
    /** Date range filter */
    dateRange?: DateRange;
    /** Date range change handler */
    onDateRangeChange?: (range: DateRange | undefined) => void;

    // ─── Count ───
    /** Total unfiltered count */
    totalCount?: number;
    /** Count label (e.g. "مستند" / "document") */
    countLabel?: string;

    // ─── Filters ───
    /** Advanced filter definitions */
    filters?: NexaListFilter[];
    /** Clear all filters handler */
    onClearFilters?: () => void;
    /** Whether any filters are active */
    hasActiveFilters?: boolean;
    /** Filters row label */
    filtersLabel?: string;
    /** Clear filters label */
    clearFiltersLabel?: string;

    // ─── Sorting ───
    /** Current sort field */
    sortField?: string;
    /** Current sort direction */
    sortAsc?: boolean;
    /** Sort handler (receives field key) */
    onSort?: (field: string) => void;

    // ─── Row Configuration ───
    /** Get accent color class for a row's left border */
    getRowAccent?: (row: T) => string;
    /** Row click handler */
    onRowClick?: (row: T) => void;
    /** Show row numbers (default: true) */
    showRowNumbers?: boolean;
    /** Get unique key for each row */
    getRowKey?: (row: T) => string;

    // ─── Expandable Rows ───
    /** Render expanded content below a clicked row */
    renderExpandedRow?: (row: T) => ReactNode;
    /** Allow multiple rows to be expanded at once (default: false) */
    multiExpand?: boolean;

    // ─── Marker ───
    /** Enable 9-color marker for reconciliation */
    enableMarker?: boolean;
    /** Callback when marker is changed */
    onMarkerChange?: (rowKey: string, color: MarkerColorId | null) => void;
    /** Get current marker color for a row */
    getRowMarker?: (row: T) => MarkerColorId | null;

    // ─── Loading ───
    /** Main loading state */
    isLoading?: boolean;
    /** Background loading indicator */
    isBackgroundLoading?: boolean;
    /** Background loading label */
    backgroundLoadingLabel?: string;

    // ─── Empty State ───
    /** Custom empty state icon */
    emptyIcon?: ReactNode;
    /** Empty state message */
    emptyMessage?: string;
    /** Show clear search button in empty state */
    showClearSearchInEmpty?: boolean;
    /** Clear search label */
    clearSearchLabel?: string;

    // ─── Footer ───
    /** Show footer */
    showFooter?: boolean;
    /** Footer left text (e.g. "عرض 5 من 10 مستند") */
    footerLeftText?: string;
    /** Footer right content (e.g. total amount) */
    footerRightContent?: ReactNode;

    // ─── Skeleton ───
    /** Number of skeleton rows when loading */
    skeletonRows?: number;

    // ─── Actions Column ───
    /** Render actions for each row (rendered in last column) */
    renderActions?: (row: T) => ReactNode;

    // ─── Direction ───
    /** RTL mode */
    isRTL?: boolean;
    /** Direction attribute */
    direction?: 'rtl' | 'ltr';

    /** Additional className for outer wrapper */
    className?: string;

    // ─── Toolbar Extra Content ───
    /** Content rendered at the end of the toolbar row (e.g. currency filter) */
    toolbarEndContent?: ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function NexaListTable<T>({
    data,
    columns,

    // Search
    searchTerm = '',
    onSearchChange,
    searchPlaceholder,

    // Date filter
    dateRange,
    onDateRangeChange,

    // Count
    totalCount,
    countLabel,

    // Filters
    filters,
    onClearFilters,
    hasActiveFilters = false,
    filtersLabel,
    clearFiltersLabel,

    // Sorting
    sortField,
    sortAsc = false,
    onSort,

    // Row config
    getRowAccent,
    onRowClick,
    showRowNumbers = true,
    getRowKey,

    // Expandable
    renderExpandedRow,
    multiExpand = false,

    // Marker
    enableMarker = false,
    onMarkerChange,
    getRowMarker,

    // Loading
    isLoading = false,
    isBackgroundLoading = false,
    backgroundLoadingLabel,

    // Empty
    emptyIcon,
    emptyMessage,
    showClearSearchInEmpty = true,
    clearSearchLabel,

    // Footer
    showFooter = true,
    footerLeftText,
    footerRightContent,

    // Skeleton
    skeletonRows = 8,

    // Actions
    renderActions,

    // Direction
    isRTL: isRTLProp,
    direction: directionProp,

    className,

    // Toolbar extra
    toolbarEndContent,
}: NexaListTableProps<T>) {
    const { t, direction: langDirection } = useLanguage();
    const effectiveDirection = directionProp || langDirection;
    const effectiveRTL = isRTLProp !== undefined ? isRTLProp : effectiveDirection === 'rtl';
    const totalCols = (showRowNumbers ? 1 : 0) + columns.length + (renderActions ? 1 : 0);

    // ═══ Expandable Row State ═══
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleExpand = useCallback((rowKey: string) => {
        setExpandedRows(prev => {
            const next = new Set(multiExpand ? prev : []);
            if (prev.has(rowKey)) {
                next.delete(rowKey);
            } else {
                next.add(rowKey);
            }
            return next;
        });
    }, [multiExpand]);

    // ═══ Marker State ═══
    const [localMarkers, setLocalMarkers] = useState<Record<string, MarkerColorId | null>>({});
    const [activeMarkerColor, setActiveMarkerColor] = useState<MarkerColorId>('green');
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    const getMarkerForRow = useCallback((row: T, key: string): MarkerColorId | null => {
        if (getRowMarker) return getRowMarker(row);
        return localMarkers[key] || null;
    }, [getRowMarker, localMarkers]);

    const handleMarkerToggle = useCallback((rowKey: string, currentColor: MarkerColorId | null) => {
        const newColor = currentColor ? null : activeMarkerColor;
        if (onMarkerChange) {
            onMarkerChange(rowKey, newColor);
        } else {
            setLocalMarkers(prev => ({ ...prev, [rowKey]: newColor }));
        }
    }, [onMarkerChange, activeMarkerColor]);

    return (
        <div
            dir={effectiveDirection}
            className={cn(
            "flex-1 min-h-0 border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col",
            className
        )}>
            {/* ═══ Toolbar: Search + Date Filter + Count ═══ */}
            {(onSearchChange || onDateRangeChange || totalCount !== undefined) && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-wrap">
                    {/* Search */}
                    {onSearchChange && (
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder || t('common.search') + '...'}
                                className="w-full h-9 ps-9 pe-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-gray-400"
                            />
                        </div>
                    )}

                    {/* Date Range */}
                    {onDateRangeChange && (
                        <DateRangePicker
                            date={dateRange}
                            setDate={onDateRangeChange}
                            className="w-auto"
                            align={effectiveDirection === 'rtl' ? 'end' : 'start'}
                        />
                    )}

                    {/* Count */}
                    {totalCount !== undefined && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{data.length}</span>
                            <span>{countLabel || t('common.records')}</span>
                            {isBackgroundLoading && (
                                <span className="flex items-center gap-1 text-[10px] text-indigo-400 animate-pulse">
                                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {backgroundLoadingLabel || t('common.loading')}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Marker Color Palette — inline in toolbar */}
                    {enableMarker && (
                        <div className="flex items-center gap-1 ms-auto">
                            <ColorMarkerPalette
                                selectedColor={activeMarkerColor}
                                onColorSelect={(color) => setActiveMarkerColor(color || 'green')}
                                size="sm"
                                showClear={false}
                                showHelp={true}
                            />
                        </div>
                    )}

                    {/* Toolbar End Content (e.g. currency filter) */}
                    {toolbarEndContent && (
                        <div className={cn("flex items-center gap-2", !enableMarker && "ms-auto")}>
                            {toolbarEndContent}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Standalone Marker Bar — when no search toolbar ═══ */}
            {enableMarker && !(onSearchChange || onDateRangeChange || totalCount !== undefined) && (
                <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <ColorMarkerPalette
                        selectedColor={activeMarkerColor}
                        onColorSelect={(color) => setActiveMarkerColor(color || 'green')}
                        size="sm"
                        showClear={false}
                        showHelp={true}
                    />
                </div>
            )}

            {/* ═══ Advanced Filters Row ═══ */}
            {filters && filters.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-2.5 border-b-2 border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-l from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-gray-900 flex-wrap">
                    {/* Filters Label */}
                    <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 uppercase tracking-wider whitespace-nowrap">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {filtersLabel || t('common.filter')}
                    </span>

                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Dynamic Filters */}
                    {filters.map((filter) => (
                        <div key={filter.id} className="flex items-center gap-1.5">
                            <label className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">
                                {filter.label}
                            </label>

                            {filter.type === 'select' && (
                                <select
                                    value={filter.value || ''}
                                    onChange={(e) => filter.onChange?.(e.target.value)}
                                    className="h-8 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: `${effectiveDirection === 'rtl' ? 'left' : 'right'} 8px center`,
                                    }}
                                >
                                    {(filter.options || []).map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {filter.type === 'number-range' && (
                                <>
                                    <input
                                        type="number"
                                        placeholder={filter.minPlaceholder || t('common.from')}
                                        value={filter.minValue || ''}
                                        onChange={(e) => filter.onMinChange?.(e.target.value)}
                                        className="h-8 w-24 px-2.5 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-[10px] text-gray-300">–</span>
                                    <input
                                        type="number"
                                        placeholder={filter.maxPlaceholder || t('common.to')}
                                        value={filter.maxValue || ''}
                                        onChange={(e) => filter.onMaxChange?.(e.target.value)}
                                        className="h-8 w-24 px-2.5 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </>
                            )}
                        </div>
                    ))}

                    {/* Clear All Filters */}
                    {hasActiveFilters && onClearFilters && (
                        <button
                            onClick={onClearFilters}
                            className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ms-auto bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 px-2.5 py-1.5 rounded-md"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            {clearFiltersLabel || t('common.clear')}
                        </button>
                    )}
                </div>
            )}

            {/* ═══ Table ═══ */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm table-auto" dir={effectiveDirection}>
                    {/* ─── Header ─── */}
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-b from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-850 border-b-2 border-gray-200 dark:border-gray-700">
                            {/* Row Number Header */}
                            {showRowNumbers && (
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                                    #
                                </th>
                            )}

                            {/* Data Columns */}
                            {columns.map((col) => (
                                <th
                                    key={col.id}
                                    className={cn(
                                        "px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                                        col.width,
                                        col.align === 'center' ? 'text-center' :
                                            col.align === 'end' ? 'text-end' : 'text-start'
                                    )}
                                >
                                    {col.sortable && onSort && col.sortKey ? (
                                        <button
                                            onClick={() => onSort(col.sortKey!)}
                                            className={cn(
                                                "flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200",
                                                col.align === 'end' && 'justify-end'
                                            )}
                                        >
                                            {col.header}
                                            <ArrowUpDown className={cn(
                                                "w-3 h-3 transition-colors",
                                                sortField === col.sortKey ? 'text-indigo-500' : 'text-gray-400'
                                            )} />
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            ))}

                            {/* Actions Header */}
                            {renderActions && (
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12" />
                            )}
                        </tr>
                    </thead>

                    {/* ─── Body ─── */}
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Loading Skeletons */}
                        {isLoading ? (
                            Array.from({ length: skeletonRows }).map((_, i) => (
                                <tr key={`skel-${i}`} className="animate-pulse">
                                    {showRowNumbers && (
                                        <td className="px-3 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6 mx-auto" />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.id} className="px-4 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mt-1" />
                                        </td>
                                    ))}
                                    {renderActions && (
                                        <td className="px-3 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6 mx-auto" />
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            /* Empty State */
                            <tr>
                                <td colSpan={totalCols} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-2">
                                        {emptyIcon || <FileText className="w-10 h-10 text-gray-200 dark:text-gray-700" />}
                                        <p className="text-sm text-gray-400 font-medium">
                                            {emptyMessage || t('common.noData')}
                                        </p>
                                        {showClearSearchInEmpty && searchTerm && onSearchChange && (
                                            <button
                                                onClick={() => onSearchChange('')}
                                                className="text-xs text-indigo-500 hover:underline"
                                            >
                                                {clearSearchLabel || t('common.clear')}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            /* Data Rows */
                            data.map((row, idx) => {
                                const accentClass = getRowAccent ? getRowAccent(row) : 'border-s-gray-200 dark:border-s-gray-700';
                                const rowKey = getRowKey ? getRowKey(row) : `row-${idx}`;
                                const isExpanded = expandedRows.has(rowKey);
                                const markerColor = enableMarker ? getMarkerForRow(row, rowKey) : null;
                                const markerBg = markerColor ? getMarkerBackgroundColor(markerColor) : undefined;
                                const markerBorder = markerColor ? getMarkerColor(markerColor) : undefined;

                                return (
                                    <React.Fragment key={rowKey}>
                                        <tr
                                            onClick={() => {
                                                if (renderExpandedRow) {
                                                    toggleExpand(rowKey);
                                                }
                                                onRowClick?.(row);
                                            }}
                                            className={cn(
                                                "group transition-all duration-150 border-s-[3px]",
                                                accentClass,
                                                !markerColor && (idx % 2 === 0
                                                    ? 'bg-white dark:bg-gray-900'
                                                    : 'bg-gray-50/40 dark:bg-gray-850/40'),
                                                (onRowClick || renderExpandedRow) && 'cursor-pointer',
                                                isExpanded && 'bg-indigo-50/80 dark:bg-indigo-950/30',
                                                !isExpanded && 'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.1)]'
                                            )}
                                            style={markerColor ? {
                                                backgroundColor: markerBg,
                                                borderInlineStartColor: markerBorder,
                                            } : undefined}
                                        >
                                            {/* Row Number / Marker */}
                                            {showRowNumbers && (
                                                <td className="px-3 py-3.5 text-center">
                                                    {enableMarker ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkerToggle(rowKey, markerColor);
                                                            }}
                                                            className={cn(
                                                                "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                                                                markerColor
                                                                    ? 'ring-2 shadow-sm'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600'
                                                            )}
                                                            style={markerColor ? {
                                                                backgroundColor: markerBg,
                                                                color: markerBorder,
                                                                boxShadow: `0 0 0 2px ${markerBorder}`,
                                                            } : undefined}
                                                            title={markerColor
                                                                ? t('table.removeMarker')
                                                                : t('table.addMarker')}
                                                        >
                                                            {idx + 1}
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {idx + 1}
                                                        </span>
                                                    )}
                                                </td>
                                            )}

                                            {/* Expand Chevron (if expandable) */}
                                            {renderExpandedRow && !showRowNumbers && (
                                                <td className="px-2 py-3.5 w-8">
                                                    {isExpanded
                                                        ? <ChevronDown className="w-4 h-4 text-indigo-500" />
                                                        : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                </td>
                                            )}

                                            {/* Data Cells */}
                                            {columns.map((col) => (
                                                <td
                                                    key={col.id}
                                                    className={cn(
                                                        "px-4 py-3.5",
                                                        col.align === 'center' ? 'text-center' :
                                                            col.align === 'end' ? 'text-end' : ''
                                                    )}
                                                >
                                                    {col.cell(row, idx)}
                                                </td>
                                            ))}

                                            {/* Actions Column */}
                                            {renderActions && (
                                                <td
                                                    className="px-3 py-3.5 text-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {renderActions(row)}
                                                </td>
                                            )}
                                        </tr>

                                        {/* ═══ Expanded Row Content ═══ */}
                                        {isExpanded && renderExpandedRow && (
                                            <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                                <td
                                                    colSpan={totalCols}
                                                    className="p-0"
                                                >
                                                    <div className="border-y border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
                                                        {renderExpandedRow(row)}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ═══ Footer Summary ═══ */}
            {showFooter && !isLoading && data.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 text-xs">
                    <span className="text-gray-400">
                        {footerLeftText || (
                            effectiveRTL
                                ? `${t('common.showing') || 'عرض'} ${data.length} ${totalCount !== undefined ? `${t('common.of') || 'من'} ${totalCount}` : ''} ${countLabel || t('common.records')}`
                                : `${t('common.showing') || 'Showing'} ${data.length} ${totalCount !== undefined ? `${t('common.of') || 'of'} ${totalCount}` : ''} ${countLabel || t('common.records')}`
                        )}
                    </span>
                    {footerRightContent && (
                        <div>{footerRightContent}</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NexaListTable;
