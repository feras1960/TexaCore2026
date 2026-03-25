/**
 * NexaDataTable - جدول بيانات متقدم
 * 
 * مبني على TanStack Table مع دعم كامل لـ:
 * - RTL والعربية
 * - السحب والإفلات
 * - تغيير حجم الأعمدة
 * - إعادة ترتيب الأعمدة
 * - التصفح (Pagination)
 * - الفرز (Sorting)
 * - الفلترة (Filtering)
 * - تصدير Excel/PDF/طباعة
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { InlineAccountCell } from '@/components/ui/InlineAccountCell';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { numberToWords } from '@/utils/numberToWords';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    ColumnResizeMode,
    Row,
} from '@tanstack/react-table';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    GripVertical,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    Settings2,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    MoreVertical,
    Pencil,
    Save,
    X,
    Plus,
    Trash2,
    Copy,
    HelpCircle,
    PlusSquare,
} from 'lucide-react';
// Phosphor Icons for beautiful summary bar
import {
    CurrencyDollar,
    TrendUp,
    TrendDown,
    ChartBar,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, printTable, openInGoogleSheets, ExportColumn, CompanyInfo } from '@/lib/export-utils';
import { toast } from 'sonner';
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
import {
    getTablePreferences,
    debouncedSavePreferences,
    type TablePreferences
} from '@/services/tablePreferencesService';

// === Types ===
export interface EditableColumnConfig {
    key: string;
    type: 'text' | 'number' | 'select' | 'date' | 'account';
    options?: { value: string; label: string }[];  // for select type
    dynamicOptions?: (row: any) => { value: string; label: string }[];  // dynamic options based on row data
    required?: boolean;
    min?: number;
    max?: number;
    placeholder?: string;
}

export interface NexaDataTableProps<TData> {
    data: TData[];
    columns: ColumnDef<TData>[];
    enableColumnResizing?: boolean;
    enableColumnReordering?: boolean;
    enableRowSelection?: boolean;
    enablePagination?: boolean;
    enableSearch?: boolean;
    enableColumnVisibility?: boolean;
    enableExport?: boolean;
    enableMarker?: boolean;
    enableSequenceNumber?: boolean;

    // === Excel Mode ===
    enableExcelMode?: boolean;          // وضع الإكسل (بدون pagination + scroll)
    maxHeight?: string;                 // ارتفاع منطقة البيانات (مثال: "500px" أو "calc(100vh - 300px)")

    // === Totals Footer ===
    showTotalsFooter?: boolean;         // عرض سطر المجاميع الثابت
    openingBalance?: number;            // الرصيد الافتتاحي

    // === Summary Header ===
    showSummaryHeader?: boolean;        // عرض ملخص في الأعلى

    // === Edit Mode ===
    enableEditMode?: boolean;           // تفعيل وضع التعديل
    editableColumns?: EditableColumnConfig[];  // الأعمدة القابلة للتعديل
    onDataChange?: (newData: TData[]) => void;  // عند تغيير البيانات
    onCellChange?: (rowIndex: number, colKey: string, newValue: unknown, currentRow: TData) => TData | void; // يعترض التغيير
    onSave?: (data: TData[]) => Promise<void>;  // عند الحفظ
    onCancel?: () => void;              // عند الإلغاء
    enableInstantEdit?: boolean;        // تفعيل التعديل الفوري (بدون أزرار حفظ/إلغاء)
    onAddRow?: () => TData;             // إنشاء صف جديد
    onDeleteRow?: (row: TData, index: number) => void;  // حذف صف
    onInsertRow?: (atIndex: number) => TData;  // إدراج صف في موضع معين
    canAddRows?: boolean;               // السماح بإضافة صفوف
    canDeleteRows?: boolean;            // السماح بحذف صفوف
    renderAccountBalance?: (accountId: string, rowIndex: number) => React.ReactNode; // Callback for account balance rendering

    // === Auto-Rows Management ===
    initialEmptyRows?: number;          // الأسطر الفارغة الابتدائية (افتراضي: 0 - عند التفعيل: 20)
    emptyRowsThreshold?: number;        // عتبة الإضافة التلقائية (افتراضي: 5)
    autoAddRowsCount?: number;          // عدد الأسطر المضافة تلقائياً (افتراضي: 5)
    editModeExtraRows?: number;         // أسطر إضافية عند التعديل (افتراضي: 10)
    cleanEmptyRowsOnSave?: boolean;     // تنظيف الفارغة عند الحفظ (افتراضي: true)

    // === Accounting Balance ===
    enableBalanceShortcut?: boolean;    // تفعيل اختصار الموازنة (* أو double-click)

    // === Keyboard Shortcuts Help ===
    showKeyboardHelp?: boolean;         // عرض أيقونة المساعدة للاختصارات (افتراضي: true في وضع التعديل)

    pageSize?: number;
    isRTL?: boolean;
    className?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    exportFilename?: string;
    exportTitle?: string;
    exportSubtitle?: string;
    companyInfo?: CompanyInfo;
    showTotals?: boolean;
    showAmountInWords?: boolean;
    debitKey?: string;
    creditKey?: string;
    balanceKey?: string;
    onRowClick?: (row: TData) => void;
    onMarkerChange?: (rowId: string, color: MarkerColorId) => void;
    getRowId?: (row: TData) => string;
    getRowMarker?: (row: TData) => MarkerColorId;
    selectedRows?: TData[];

    // === Persistence ===
    persistKey?: string;                 // مفتاح حفظ التفضيلات في localStorage (visibility, sizes, order)
}

// === Sortable Header Cell ===
function SortableHeaderCell({
    header,
    isRTL,
}: {
    header: any;
    isRTL: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: header.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width: header.getSize(),
    };

    const canSort = header.column.getCanSort();
    const isSorted = header.column.getIsSorted();

    return (
        <th
            ref={setNodeRef}
            style={style}
            className={cn(
                'px-4 py-3 font-semibold relative group',
                'bg-muted/50 border-b border-border',
                // فاصل عمودي خفيف
                isRTL ? 'border-l border-l-border/40' : 'border-r border-r-border/40',
                'last:border-l-0 last:border-r-0',
                isRTL ? 'text-right' : 'text-left',
                isDragging && 'z-10 bg-primary/10'
            )}
        >
            <div className="flex items-center gap-2">
                {/* Drag Handle */}
                <span
                    {...attributes}
                    {...listeners}
                    className={cn(
                        'cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity',
                        isDragging && 'opacity-100'
                    )}
                >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                </span>

                {/* Header Content */}
                <span
                    className={cn(
                        'flex-1 select-none',
                        canSort && 'cursor-pointer hover:text-primary'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                </span>

                {/* Sort Indicator */}
                {canSort && (
                    <span className="text-muted-foreground">
                        {isSorted === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : isSorted === 'desc' ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronsUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                    </span>
                )}
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                className={cn(
                    'absolute top-0 h-full w-1 cursor-col-resize select-none touch-none',
                    'bg-transparent hover:bg-primary/50 active:bg-primary',
                    isRTL ? 'left-0' : 'right-0'
                )}
            />
        </th>
    );
}

// === Editable Cell Component ===

interface EditableCellProps {
    value: unknown;
    rowIndex: number;
    colIndex: number;  // Added for cell navigation
    colKey: string;
    config?: EditableColumnConfig;
    isEditing: boolean;
    onChange: (rowIndex: number, colKey: string, value: unknown) => void;
    onCopyFromAbove?: (rowIndex: number, colKey: string) => void;
    onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onCopyAndMove?: (rowIndex: number, colKey: string, direction: 'down' | 'right') => unknown;
    onBalance?: (rowIndex: number, colKey: string) => number | undefined;  // حساب الموازنة
    onInsertRowBelow?: (rowIndex: number) => void;  // إدراج صف تحت الحالي
    onDeleteCell?: () => void;  // مسح محتوى الخلية
    onSwapDebitCredit?: (rowIndex: number, colKey: string) => void;  // نقل الرقم بين المدين والدائن
    onDuplicateRow?: (rowIndex: number) => void;  // نسخ الصف بالكامل
    isRTL: boolean;
    totalRows: number;
    totalCols: number;
    enableBalanceShortcut?: boolean;  // تفعيل اختصار الموازنة
    companyId?: string; // For account selector
    rowData?: Record<string, unknown>; // Full row data for context
    renderAccountBalance?: (accountId: string, rowIndex: number) => React.ReactNode;
}

function EditableCell({
    value,
    rowIndex,
    colIndex,
    colKey,
    config,
    isEditing,
    onChange,
    onCopyFromAbove,
    onNavigate,
    onCopyAndMove,
    onBalance,
    onInsertRowBelow,
    onDeleteCell,
    onSwapDebitCredit,
    onDuplicateRow,
    isRTL,
    totalRows,
    totalCols,
    enableBalanceShortcut,
    companyId,
    rowData,
    renderAccountBalance,
}: EditableCellProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
    const { decimalPlaces } = useAccountingSettings();

    useEffect(() => {
        if (!isFocused) {
            setLocalValue(value);
        }
    }, [value, isFocused]);

    // إذا لم يكن في وضع التعديل أو العمود غير قابل للتعديل
    if (!isEditing || !config) {
        // عرض القيمة فقط
        if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;
        if (typeof value === 'number') {
            return <span className="font-mono">{value.toLocaleString('en-US')}</span>;
        }
        return <span>{String(value)}</span>;
    }

    const handleChange = (newValue: unknown) => {
        setLocalValue(newValue);
        onChange(rowIndex, colKey, newValue);
    };

    // For text fields: update local only, commit on blur
    const handleTextLocalChange = (newValue: string) => {
        setLocalValue(newValue);
    };
    
    const commitLocalValue = () => {
        if (config.type === 'number') {
            const parsed = parseFloat(String(localValue)) || 0;
            const rounded = Number(parsed.toFixed(decimalPlaces ?? 2));
            if (rounded !== value) {
                setLocalValue(rounded);
                onChange(rowIndex, colKey, rounded);
            }
        } else {
            if (localValue !== value) {
                onChange(rowIndex, colKey, localValue);
            }
        }
    };

    // === Double-click: swap debit/credit OR balance shortcut ===
    const handleDoubleClick = () => {
        // If this is a debit or credit cell with a value, swap it
        if (onSwapDebitCredit && (colKey === 'debit' || colKey === 'credit') && Number(localValue) > 0) {
            onSwapDebitCredit(rowIndex, colKey);
            setLocalValue(0);
            return;
        }
        // Otherwise, use balance shortcut if enabled
        if (enableBalanceShortcut && onBalance) {
            const balanceValue = onBalance(rowIndex, colKey);
            if (balanceValue !== undefined) {
                setLocalValue(balanceValue);
                onChange(rowIndex, colKey, balanceValue);
            }
        }
    };

    // === Excel-Style Keyboard Navigation ===
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const inputValue = String(localValue || '');

        // === اختصار النسخ السريع: = ثم Enter أو Tab ===
        // عندما تكون القيمة = فقط وضغط المستخدم Enter أو Tab
        if (inputValue.trim() === '=' || inputValue.endsWith('=')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // نسخ من فوق + انتقال لأسفل
                const copiedValue = onCopyAndMove?.(rowIndex, colKey, 'down');
                // تحديث القيمة المحلية مباشرة بالقيمة المنسوخة
                if (copiedValue !== undefined) {
                    setLocalValue(copiedValue);
                }
                return;
            } else if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                // نسخ من فوق + انتقال للخلية التالية
                const copiedValue = onCopyAndMove?.(rowIndex, colKey, 'right');
                // تحديث القيمة المحلية مباشرة بالقيمة المنسوخة
                if (copiedValue !== undefined) {
                    setLocalValue(copiedValue);
                }
                return;
            }
        }

        // === اختصار الموازنة: * ثم Enter ===
        if (enableBalanceShortcut && (inputValue.trim() === '*' || inputValue.endsWith('*'))) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const balanceValue = onBalance?.(rowIndex, colKey);
                if (balanceValue !== undefined) {
                    setLocalValue(balanceValue);
                    onChange(rowIndex, colKey, balanceValue);
                    // الانتقال للخلية التالية
                    setTimeout(() => onNavigate?.('down'), 50);
                }
                return;
            }
        }

        // === التنقل بالأسهم ===
        switch (e.key) {
            case 'ArrowUp':
                if (!e.shiftKey) {
                    e.preventDefault();
                    onNavigate?.('up');
                }
                break;

            case 'ArrowDown':
                if (!e.shiftKey) {
                    e.preventDefault();
                    onNavigate?.('down');
                }
                break;

            case 'ArrowLeft':
                // التنقل للخلية السابقة
                e.preventDefault();
                onNavigate?.(isRTL ? 'right' : 'left');
                break;

            case 'ArrowRight':
                // التنقل للخلية التالية
                e.preventDefault();
                onNavigate?.(isRTL ? 'left' : 'right');
                break;

            case 'Tab':
                e.preventDefault();
                commitLocalValue(); // flush any pending text edits
                if (e.shiftKey) {
                    onNavigate?.('left');
                } else {
                    onNavigate?.('right');
                }
                break;

            case 'Enter':
                e.preventDefault();
                commitLocalValue(); // flush any pending text edits
                if (e.shiftKey) {
                    onNavigate?.('up');
                } else {
                    onNavigate?.('down');
                }
                break;

            case 'Escape':
                e.preventDefault();
                setLocalValue(value);
                (e.target as HTMLInputElement).blur();
                break;

            case 'Delete':
                // Delete = مسح محتوى الخلية
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    setLocalValue(config.type === 'number' ? 0 : '');
                    onChange(rowIndex, colKey, config.type === 'number' ? 0 : '');
                }
                break;

            case 'Insert':
                // Insert = إدراج صف جديد تحت الحالي
                e.preventDefault();
                onInsertRowBelow?.(rowIndex);
                break;

            case 'i':
            case 'I':
                // Ctrl+I = إدراج صف جديد تحت الحالي
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    onInsertRowBelow?.(rowIndex);
                }
                break;

            case 'd':
            case 'D':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Ctrl+Shift+D = نسخ الصف بالكامل
                        onDuplicateRow?.(rowIndex);
                    } else {
                        // Ctrl+D = نسخ من الخلية التي فوق (Excel standard)
                        onCopyFromAbove?.(rowIndex, colKey);
                    }
                }
                break;

            case 'Home':
                // Home = الانتقال لأول عمود
                e.preventDefault();
                // سيتم معالجته في handleCellNavigate
                break;

            case 'End':
                // End = الانتقال لآخر عمود
                e.preventDefault();
                // سيتم معالجته في handleCellNavigate
                break;

            case 's':
            case 'S':
                // Ctrl+S = حفظ (سيتم التقاطه في المستوى الأعلى)
                if (e.ctrlKey || e.metaKey) {
                    // Allow to bubble up
                }
                break;
        }
    };

    // === Excel-like full cell input styling ===
    const baseInputClass = cn(
        'w-full h-full min-h-[36px] px-3 py-2',
        'bg-transparent border-0 outline-none shadow-none',
        'focus:bg-blue-50/50 focus:ring-2 focus:ring-blue-400 focus:ring-inset',
        'transition-colors duration-150',
        'text-sm',
        config.type === 'number' && 'text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
    );

    // Render based on type
    switch (config.type) {
        case 'number':
            return (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={isFocused ? "number" : "text"}
                    value={
                        isFocused
                            ? (localValue !== undefined && localValue !== null ? String(localValue) : '')
                            : (localValue !== undefined && localValue !== null && !isNaN(Number(localValue)) ? Number(localValue).toFixed(decimalPlaces) : '')
                    }
                    onFocus={(e) => {
                        setIsFocused(true);
                        // Optional: select all text when focusing a number (ERP standard UX)
                        setTimeout(() => e.target.select(), 10);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        const parsed = parseFloat(String(localValue)) || 0;
                        const rounded = Number(parsed.toFixed(decimalPlaces));
                        setLocalValue(rounded);
                        onChange(rowIndex, colKey, rounded);
                    }}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onDoubleClick={handleDoubleClick}
                    min={config.min}
                    max={config.max}
                    placeholder={config.placeholder}
                    className={baseInputClass}
                    data-cell-id={`${rowIndex}-${colKey}`}
                />
            );
        case 'select': {
            const selectOptions = config.dynamicOptions ? config.dynamicOptions(rowData) : config.options;
            return (
                <select
                    ref={inputRef as React.RefObject<HTMLSelectElement>}
                    value={localValue as string || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(baseInputClass, 'cursor-pointer')}
                    data-cell-id={`${rowIndex}-${colKey}`}
                >
                    {!localValue && <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>}
                    {selectOptions?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }
        case 'date':
            return (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="date"
                    value={localValue as string || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={baseInputClass}
                    data-cell-id={`${rowIndex}-${colKey}`}
                />
            );
        case 'account':
            return (
                <InlineAccountCell
                    value={localValue as string || ''}
                    companyId={companyId}
                    onChange={(accountId, account) => {
                        handleChange(accountId);
                        // Also update account_name, account_code, current_balance, and currency on the row
                        if (account) {
                            onChange(rowIndex, 'account_name', account.name_ar || account.name_en || '');
                            onChange(rowIndex, 'account_code', account.code || '');
                            // Push balance directly from cached account data
                            onChange(rowIndex, 'current_balance', account.current_balance ?? 0);
                            if (account.currency) {
                                onChange(rowIndex, 'currency', account.currency);
                            }
                        }
                    }}
                    onNavigate={onNavigate}
                    onCopyFromAbove={() => onCopyFromAbove?.(rowIndex, colKey)}
                    isRTL={isRTL}
                    cellId={`${rowIndex}-${colKey}`}
                    displayName={rowData?.account_name as string}
                    displayCode={rowData?.account_code as string}
                    balanceElement={renderAccountBalance ? renderAccountBalance(localValue as string, rowIndex) : undefined}
                />
            );
        default: // text
            return (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={localValue as string || ''}
                    onChange={(e) => handleTextLocalChange(e.target.value)}
                    onBlur={commitLocalValue}
                    onKeyDown={handleKeyDown}
                    onDoubleClick={handleDoubleClick}
                    placeholder={config.placeholder}
                    className={baseInputClass}
                    data-cell-id={`${rowIndex}-${colKey}`}
                />
            );
    }
}

// === Main Component ===
export function NexaDataTable<TData>({
    data,
    columns: initialColumns,
    enableColumnResizing = true,
    enableColumnReordering = true,
    enableRowSelection = false,
    enablePagination = true,
    enableSearch = true,
    enableColumnVisibility = true,
    enableExport = true,
    enableMarker = false,
    enableSequenceNumber = false,
    enableExcelMode = false,
    maxHeight = '500px',
    showTotalsFooter = false,
    openingBalance = 0,
    showSummaryHeader = false,
    pageSize = 10,
    isRTL = true,
    className,
    searchPlaceholder,
    emptyMessage,
    exportFilename = 'export',
    exportTitle,
    exportSubtitle,
    companyInfo,
    showTotals = true,
    showAmountInWords = true,
    debitKey = 'debit',
    creditKey = 'credit',
    balanceKey = 'balance',
    onRowClick,
    onMarkerChange,
    getRowId,
    getRowMarker,
    // Edit Mode Props
    enableEditMode = false,
    editableColumns = [],
    onDataChange,
    onCellChange,
    onSave,
    onCancel,
    onAddRow,
    onDeleteRow,
    onInsertRow,
    enableInstantEdit = false,
    canAddRows = false, // Default to false - auto-expand makes this unnecessary
    canDeleteRows = true,
    renderAccountBalance,
    // Auto-Rows Props
    initialEmptyRows = 0,
    emptyRowsThreshold = 5,
    autoAddRowsCount = 5,
    editModeExtraRows = 10,
    cleanEmptyRowsOnSave = true,
    // Accounting Balance Props
    enableBalanceShortcut = false,
    // Keyboard Help Props
    showKeyboardHelp = true,
    // Persistence Props
    persistKey,
    // Row styling
    getRowClassName,
}: NexaDataTableProps<TData> & { getRowClassName?: (row: TData) => string }) {
    // === Company context for account selectors ===
    const { companyId: hookCompanyId } = useCompany();

    // === Default texts based on RTL ===
    const defaultSearchPlaceholder = isRTL ? 'بحث...' : 'Search...';
    const defaultEmptyMessage = isRTL ? 'لا توجد بيانات' : 'No data';

    // === State ===
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [preferencesLoaded, setPreferencesLoaded] = useState(!persistKey); // true if no persistKey

    // === Persistence State ===
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnOrder, setColumnOrder] = useState<string[]>(
        initialColumns.map((col) => (col as any).accessorKey || (col as any).id || '')
    );
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

    // === Load preferences from Supabase on mount ===
    useEffect(() => {
        if (!persistKey) return;

        const loadPreferences = async () => {
            const prefs = await getTablePreferences(persistKey);
            if (prefs) {
                if (prefs.columnVisibility && Object.keys(prefs.columnVisibility).length > 0) {
                    // Ensure new columns (not in saved prefs) default to visible
                    const currentColumnKeys = initialColumns.map(
                        (col) => (col as any).accessorKey || (col as any).id || ''
                    ).filter(Boolean);
                    const mergedVisibility = { ...prefs.columnVisibility };
                    currentColumnKeys.forEach((key) => {
                        if (!(key in mergedVisibility)) {
                            mergedVisibility[key] = true;
                        }
                    });
                    // Force-show columns with enableHiding: false
                    initialColumns.forEach((col) => {
                        if ((col as any).enableHiding === false) {
                            const colKey = (col as any).accessorKey || (col as any).id;
                            if (colKey) mergedVisibility[colKey] = true;
                        }
                    });
                    setColumnVisibility(mergedVisibility);
                }
                if (prefs.columnOrder && prefs.columnOrder.length > 0) {
                    setColumnOrder(prefs.columnOrder);
                }
                if (prefs.columnSizing && Object.keys(prefs.columnSizing).length > 0) {
                    setColumnSizing(prefs.columnSizing);
                }
            }
            setPreferencesLoaded(true);
        };

        loadPreferences();
    }, [persistKey]);

    // === Save preferences to Supabase when they change (debounced) ===
    useEffect(() => {
        if (!persistKey || !preferencesLoaded) return;
        if (Object.keys(columnVisibility).length > 0) {
            debouncedSavePreferences(persistKey, { columnVisibility }, 1500);
        }
    }, [persistKey, columnVisibility, preferencesLoaded]);

    useEffect(() => {
        if (!persistKey || !preferencesLoaded) return;
        if (columnOrder.length > 0) {
            debouncedSavePreferences(persistKey, { columnOrder }, 1500);
        }
    }, [persistKey, columnOrder, preferencesLoaded]);

    useEffect(() => {
        if (!persistKey || !preferencesLoaded) return;
        if (Object.keys(columnSizing).length > 0) {
            debouncedSavePreferences(persistKey, { columnSizing }, 1500);
        }
    }, [persistKey, columnSizing, preferencesLoaded]);

    // === Edit Mode State ===
    const [isEditing, setIsEditing] = useState(enableEditMode || enableInstantEdit);
    const [editedData, setEditedData] = useState<TData[]>([]);
    const [originalData, setOriginalData] = useState<TData[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

    // === Marker State ===
    const [localMarkers, setLocalMarkers] = useState<Record<string, MarkerColorId>>({});
    const [activeMarkerColor, setActiveMarkerColor] = useState<MarkerColorId>('green'); // اللون النشط للتعليم
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    // === Marker Helpers ===
    const getRowIdInternal = useCallback((row: TData, index: number): string => {
        if (getRowId) return getRowId(row);
        if ((row as any).id) return String((row as any).id);
        return String(index);
    }, [getRowId]);

    const getRowMarkerColor = useCallback((row: TData, index: number): MarkerColorId => {
        if (getRowMarker) return getRowMarker(row);
        const rowId = getRowIdInternal(row, index);
        return localMarkers[rowId] || null;
    }, [getRowMarker, getRowIdInternal, localMarkers]);

    // Toggle marker: إذا الصف معلّم → نزيل التعليم، إذا غير معلّم → نعلّمه باللون النشط
    const handleMarkerToggle = useCallback((rowId: string, currentColor: MarkerColorId) => {
        const newColor = currentColor ? null : activeMarkerColor;
        if (onMarkerChange) {
            onMarkerChange(rowId, newColor);
        } else {
            setLocalMarkers(prev => ({ ...prev, [rowId]: newColor }));
        }
    }, [onMarkerChange, activeMarkerColor]);

    // === Edit Mode Handlers ===
    // بدء التعديل
    const handleStartEdit = useCallback(() => {
        setOriginalData([...data]);
        // إضافة أسطر فارغة عند بدء التعديل
        let initialData = [...data];
        if (onAddRow && editModeExtraRows > 0) {
            for (let i = 0; i < editModeExtraRows; i++) {
                initialData.push(onAddRow());
            }
        }
        setEditedData(initialData);
        setIsEditing(true);
    }, [data, onAddRow, editModeExtraRows]);

    // Force Edit Mode if Instant Edit is enabled
    // Force Edit Mode if Instant Edit is enabled and handle Initial Empty Rows
    useEffect(() => {
        if (enableInstantEdit) {
            setIsEditing(true);

            // ONLY deep merge or set initial data if editedData is empty,
            // otherwise rely on editedData taking priority to prevent cursor jumps
            if (editedData.length === 0 && data.length > 0) {
                let initialData = [...data];
                if (onAddRow && initialEmptyRows > 0) {
                    const needed = Math.max(0, initialEmptyRows - initialData.length);
                    if (needed > 0) {
                        for (let i = 0; i < needed; i++) {
                            initialData.push(onAddRow());
                        }
                    }
                }
                setEditedData(initialData);
            } else if (data.length > 0) {
                // If async updates happen (like exchange_rate), we merge them carefully
                setEditedData(prev => {
                    const merged = [...prev];
                    let changed = false;
                    for (let i = 0; i < Math.min(merged.length, data.length); i++) {
                        const original = data[i] as any;
                        const edited = merged[i] as any;
                        // For example, if parent updated exchange rate from async fetch:
                        if (original.exchange_rate && original.exchange_rate !== edited.exchange_rate && (edited.exchange_rate === undefined || edited.exchange_rate === 1)) {
                            merged[i] = { ...edited, exchange_rate: original.exchange_rate };
                            changed = true;
                        }
                    }
                    return changed ? merged : prev;
                });
            }
        }
    }, [data]); // intentionally decoupled from other dependencies to prevent thrashing

    // حفظ التغييرات
    const handleSave = useCallback(async () => {
        // تنظيف الأسطر الفارغة قبل الحفظ
        const dataToSave = cleanEmptyRowsOnSave
            ? editedData.filter(row => {
                const rowData = row as Record<string, unknown>;
                return !editableColumns.every(col => {
                    const value = rowData[col.key];
                    return value === null || value === undefined || value === '' || value === 0;
                });
            })
            : editedData;

        if (onSave) {
            setIsSaving(true);
            try {
                await onSave(dataToSave);
                setIsEditing(false);
                setEditingCell(null);
            } catch (error) {
                console.error('Save failed:', error);
            } finally {
                setIsSaving(false);
            }
        } else if (onDataChange) {
            onDataChange(dataToSave);
            setIsEditing(false);
            setEditingCell(null);
        }
    }, [editedData, onSave, onDataChange, cleanEmptyRowsOnSave, editableColumns]);

    // إلغاء التعديل
    const handleCancelEdit = useCallback(() => {
        setEditedData(originalData);
        setIsEditing(false);
        setEditingCell(null);
        if (onCancel) onCancel();
    }, [originalData, onCancel]);

    // تغيير قيمة خلية
    const [cellChangeCounter, setCellChangeCounter] = useState(0);
    
    const handleCellChange = useCallback((rowIndex: number, colKey: string, value: unknown) => {
        setEditedData(prev => {
            const newData = [...prev];
            let newRow = { ...newData[rowIndex], [colKey]: value } as Record<string, unknown>;

            // Debit/Credit mutual exclusivity:
            const dk = debitKey || 'debit';
            const ck = creditKey || 'credit';
            const numVal = Number(value);
            if (colKey === dk && numVal > 0) {
                newRow = { ...newRow, [dk]: value, [ck]: 0 };
            } else if (colKey === ck && numVal > 0) {
                newRow = { ...newRow, [ck]: value, [dk]: 0 };
            }

            if (onCellChange) {
                const interceptedRow = onCellChange(rowIndex, colKey, value, newRow as TData);
                if (interceptedRow) {
                    newRow = interceptedRow as Record<string, unknown>;
                }
            }

            newData[rowIndex] = newRow as TData;
            return newData;
        });
        // Signal that data changed (useEffect will propagate to parent)
        if (enableInstantEdit) {
            setCellChangeCounter(c => c + 1);
        }
    }, [enableInstantEdit, debitKey, creditKey, onCellChange]);

    // Propagate cell changes to parent AFTER render (React 18 safe)
    useEffect(() => {
        if (cellChangeCounter > 0 && onDataChange) {
            onDataChange(editedData as TData[]);
        }
    }, [cellChangeCounter]); // eslint-disable-line react-hooks/exhaustive-deps

    // إضافة صف جديد
    const handleAddRow = useCallback(() => {
        if (onAddRow) {
            const newRow = onAddRow();
            setEditedData(prev => [...prev, newRow]);
        }
    }, [onAddRow]);

    // حذف صف
    const handleDeleteRow = useCallback((rowIndex: number) => {
        const row = editedData[rowIndex];
        if (onDeleteRow) {
            onDeleteRow(row, rowIndex);
        }
        setEditedData(prev => prev.filter((_, idx) => idx !== rowIndex));
    }, [editedData, onDeleteRow]);

    // === إدراج صف في موضع معين ===
    const handleInsertRowAt = useCallback((atIndex: number) => {
        if (onInsertRow) {
            const newRow = onInsertRow(atIndex);
            setEditedData(prev => {
                const newData = [...prev];
                newData.splice(atIndex + 1, 0, newRow);
                return newData;
            });
        } else if (onAddRow) {
            const newRow = onAddRow();
            setEditedData(prev => {
                const newData = [...prev];
                newData.splice(atIndex + 1, 0, newRow);
                return newData;
            });
        }
    }, [onInsertRow, onAddRow]);

    // === نسخ صف بالكامل ===
    const handleDuplicateRow = useCallback((rowIndex: number) => {
        const sourceRow = editedData[rowIndex] as Record<string, unknown>;
        const clonedRow = { ...sourceRow, id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } as TData;
        setEditedData(prev => {
            const newData = [...prev];
            newData.splice(rowIndex + 1, 0, clonedRow);
            if (enableInstantEdit && onDataChange) {
                onDataChange(newData);
            }
            return newData;
        });
    }, [editedData, enableInstantEdit, onDataChange]);

    // === حساب الموازنة للقيود المحاسبية ===
    const handleBalance = useCallback((rowIndex: number, colKey: string): number | undefined => {
        // حساب مجموع المدين والدائن
        let totalDebit = 0;
        let totalCredit = 0;

        editedData.forEach((row, idx) => {
            const rowData = row as Record<string, unknown>;
            // لا نحسب الصف الحالي
            if (idx !== rowIndex) {
                totalDebit += Number(rowData[debitKey]) || 0;
                totalCredit += Number(rowData[creditKey]) || 0;
            }
        });

        const difference = totalDebit - totalCredit;

        // إذا كان الفرق موجب، نحتاج دائن
        // إذا كان الفرق سالب، نحتاج مدين
        if (colKey === debitKey) {
            return difference < 0 ? Math.abs(difference) : 0;
        } else if (colKey === creditKey) {
            return difference > 0 ? difference : 0;
        }

        return undefined;
    }, [editedData, debitKey, creditKey]);

    // === الكشف عن السطر الفارغ ===
    const isRowEmpty = useCallback((row: TData): boolean => {
        const rowData = row as Record<string, unknown>;
        return editableColumns.every(col => {
            const value = rowData[col.key];
            return value === null || value === undefined || value === '' || value === 0;
        });
    }, [editableColumns]);

    // === تنظيف الأسطر الفارغة عند الحفظ ===
    const getCleanedData = useCallback((): TData[] => {
        if (!cleanEmptyRowsOnSave) return editedData;
        return editedData.filter(row => !isRowEmpty(row));
    }, [editedData, cleanEmptyRowsOnSave, isRowEmpty]);

    // === حساب عدد الأسطر الفارغة المتبقية ===
    const remainingEmptyRows = useMemo(() => {
        let count = 0;
        for (let i = editedData.length - 1; i >= 0; i--) {
            if (isRowEmpty(editedData[i])) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }, [editedData, isRowEmpty]);

    // === إضافة أسطر فارغة تلقائياً عند الوصول للعتبة ===
    useEffect(() => {
        if (isEditing && onAddRow && remainingEmptyRows < emptyRowsThreshold) {
            const rowsToAdd = autoAddRowsCount;
            const newRows: TData[] = [];
            for (let i = 0; i < rowsToAdd; i++) {
                newRows.push(onAddRow());
            }
            setEditedData(prev => [...prev, ...newRows]);
        }
    }, [isEditing, onAddRow, remainingEmptyRows, emptyRowsThreshold, autoAddRowsCount]);

    // === Swap debit/credit on double-click ===
    const handleSwapDebitCredit = useCallback((rowIndex: number, colKey: string) => {
        const dk = debitKey || 'debit';
        const ck = creditKey || 'credit';
        const row = editedData[rowIndex] as Record<string, unknown>;
        const currentVal = Number(row[colKey]) || 0;
        if (currentVal > 0) {
            const targetKey = colKey === dk ? ck : dk;
            handleCellChange(rowIndex, colKey, 0);
            handleCellChange(rowIndex, targetKey, currentVal);
        }
    }, [editedData, handleCellChange, debitKey, creditKey]);

    // نسخ القيم من الصف السابق
    const handleCopyFromAbove = useCallback((rowIndex: number, colKey: string) => {
        if (rowIndex > 0) {
            const prevRow = editedData[rowIndex - 1] as Record<string, unknown>;
            const prevValue = prevRow[colKey];
            handleCellChange(rowIndex, colKey, prevValue);
            // If copying an account, also copy the display fields
            if (colKey === 'account_id') {
                if (prevRow['account_name']) handleCellChange(rowIndex, 'account_name', prevRow['account_name']);
                if (prevRow['account_code']) handleCellChange(rowIndex, 'account_code', prevRow['account_code']);
            }
        }
    }, [editedData, handleCellChange]);

    // === Cell Navigation System ===
    // الحصول على قائمة الأعمدة القابلة للتعديل
    const editableColumnKeys = useMemo(() => {
        return editableColumns.map(col => col.key);
    }, [editableColumns]);

    // التنقل بين الخلايا
    const handleCellNavigate = useCallback((
        currentRowIndex: number,
        currentColKey: string,
        direction: 'up' | 'down' | 'left' | 'right'
    ) => {
        const colIndex = editableColumnKeys.indexOf(currentColKey);
        let newRowIndex = currentRowIndex;
        let newColIndex = colIndex;

        switch (direction) {
            case 'up':
                newRowIndex = Math.max(0, currentRowIndex - 1);
                break;
            case 'down':
                newRowIndex = Math.min(editedData.length - 1, currentRowIndex + 1);
                // إذا كنا في آخر صف وضغطنا Enter، أضف صف جديد
                if (currentRowIndex === editedData.length - 1 && onAddRow) {
                    handleAddRow();
                    newRowIndex = currentRowIndex + 1;
                }
                break;
            case 'left':
                newColIndex = Math.max(0, colIndex - 1);
                // إذا كنا في أول عمود، انتقل للصف السابق
                if (colIndex === 0 && currentRowIndex > 0) {
                    newRowIndex = currentRowIndex - 1;
                    newColIndex = editableColumnKeys.length - 1;
                }
                break;
            case 'right':
                newColIndex = Math.min(editableColumnKeys.length - 1, colIndex + 1);
                // إذا كنا في آخر عمود، انتقل للصف التالي
                if (colIndex === editableColumnKeys.length - 1 && currentRowIndex < editedData.length - 1) {
                    newRowIndex = currentRowIndex + 1;
                    newColIndex = 0;
                } else if (colIndex === editableColumnKeys.length - 1 && currentRowIndex === editedData.length - 1 && onAddRow) {
                    // إذا كنا في آخر خلية، أضف صف جديد
                    handleAddRow();
                    newRowIndex = currentRowIndex + 1;
                    newColIndex = 0;
                }
                break;
        }

        const newColKey = editableColumnKeys[newColIndex];
        setEditingCell({ rowIndex: newRowIndex, colKey: newColKey });

        // Focus on the new cell after a small delay
        setTimeout(() => {
            const cellInput = document.querySelector(
                `[data-cell-id="${newRowIndex}-${newColKey}"]`
            ) as HTMLInputElement;
            if (cellInput) {
                cellInput.focus();
                // For number inputs, select all (user typically wants to replace)
                // For text inputs, place cursor at end (user typically wants to continue typing)
                if (cellInput.type === 'number') {
                    cellInput.select();
                } else {
                    const len = cellInput.value?.length || 0;
                    cellInput.setSelectionRange(len, len);
                }
            }
        }, 50);
    }, [editableColumnKeys, editedData.length, onAddRow, handleAddRow]);

    // نسخ من فوق مع الانتقال
    const handleCopyAndMove = useCallback((
        rowIndex: number,
        colKey: string,
        direction: 'down' | 'right'
    ): unknown => {
        // أولاً: انسخ القيمة من الصف السابق
        if (rowIndex > 0) {
            const prevValue = (editedData[rowIndex - 1] as Record<string, unknown>)[colKey];
            handleCellChange(rowIndex, colKey, prevValue);

            // ثانياً: انتقل للخلية التالية بعد الانتظار
            setTimeout(() => {
                handleCellNavigate(rowIndex, colKey, direction);
            }, 100);

            // إرجاع القيمة المنسوخة لتحديث الخلية
            return prevValue;
        } else {
            // إذا كنا في الصف الأول، لا يوجد ما ننسخه
            // فقط انتقل للخلية التالية
            handleCellNavigate(rowIndex, colKey, direction);
            return undefined;
        }
    }, [editedData, handleCellChange, handleCellNavigate]);

    // === Global Keyboard Handler for Edit Mode ===
    useEffect(() => {
        if (!isEditing) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S للحفظ
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            // Escape للإلغاء
            if (e.key === 'Escape' && !editingCell) {
                handleCancelEdit();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isEditing, editingCell, handleSave, handleCancelEdit]);

    // البيانات المعروضة (الأصلية أو المعدلة)
    const displayData = isEditing ? editedData : data;

    // === Calculate Totals ===
    const totals = useMemo(() => {
        let totalDebit = 0;
        let totalCredit = 0;
        let markedCount = 0;

        displayData.forEach((row, index) => {
            const rowData = row as Record<string, unknown>;
            totalDebit += Number(rowData[debitKey]) || 0;
            totalCredit += Number(rowData[creditKey]) || 0;

            // Count marked rows
            const rowId = getRowIdInternal(row, index);
            if (localMarkers[rowId]) markedCount++;
        });

        const finalBalance = openingBalance + totalDebit - totalCredit;

        return {
            totalDebit,
            totalCredit,
            finalBalance,
            markedCount,
        };
    }, [displayData, debitKey, creditKey, openingBalance, localMarkers, getRowIdInternal]);

    // === Get translation function ===
    const { t, language } = useLanguage();

    // === Amount in Words (Multi-language) ===
    const getAmountInWords = useCallback((amount: number): string => {
        return numberToWords(amount, language);
    }, [language]);

    // === DnD Sensors ===
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // === Columns with order ===
    const orderedColumns = useMemo(() => {
        return columnOrder
            .map((key) =>
                initialColumns.find(
                    (col) => (col as any).accessorKey === key || (col as any).id === key
                )
            )
            .filter(Boolean) as ColumnDef<TData>[];
    }, [columnOrder, initialColumns]);

    // === Table Instance ===
    const table = useReactTable({
        data: displayData, // استخدام البيانات المعروضة (الأصلية أو المعدلة)
        columns: orderedColumns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            globalFilter,
            columnSizing,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        onColumnSizingChange: setColumnSizing,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
        enableColumnResizing,
        columnResizeMode: 'onChange' as ColumnResizeMode,
        initialState: {
            pagination: {
                pageSize,
            },
        },
    });

    // === Export Helpers ===
    const getExportColumns = useCallback((): ExportColumn[] => {
        return table.getVisibleLeafColumns().map(col => ({
            key: col.id,
            header: typeof col.columnDef.header === 'string'
                ? col.columnDef.header
                : col.id,
            width: col.getSize() / 10,
        }));
    }, [table]);

    const getExportData = useCallback((): Record<string, any>[] => {
        return table.getFilteredRowModel().rows.map(row => {
            const rowData: Record<string, any> = {};
            row.getVisibleCells().forEach(cell => {
                // Get raw value for export
                rowData[cell.column.id] = cell.getValue();
            });
            return rowData;
        });
    }, [table]);

    // === Export Handlers ===
    const handleExportExcel = useCallback(() => {
        setIsExporting(true);
        try {
            exportToExcel({
                filename: exportFilename,
                title: exportTitle,
                subtitle: exportSubtitle,
                columns: getExportColumns(),
                data: getExportData(),
                isRTL,
                companyInfo,
            });
            toast.success(isRTL ? 'تم تصدير الملف بنجاح' : 'File exported successfully');
        } catch (error) {
            toast.error(isRTL ? 'فشل في التصدير' : 'Export failed');
            console.error('Excel export error:', error);
        } finally {
            setIsExporting(false);
        }
    }, [exportFilename, exportTitle, exportSubtitle, getExportColumns, getExportData, isRTL, companyInfo]);

    const handleExportPDF = useCallback(() => {
        setIsExporting(true);
        try {
            exportToPDF({
                filename: exportFilename,
                title: exportTitle,
                subtitle: exportSubtitle || (isRTL ? `إجمالي السجلات: ${data.length}` : `Total records: ${data.length}`),
                columns: getExportColumns(),
                data: getExportData(),
                isRTL,
                companyInfo,
                showTotals,
                showAmountInWords,
                debitKey,
                creditKey,
                balanceKey,
            });
            toast.success(isRTL ? 'تم تصدير PDF بنجاح' : 'PDF exported successfully');
        } catch (error) {
            toast.error(isRTL ? 'فشل في تصدير PDF' : 'PDF export failed');
            console.error('PDF export error:', error);
        } finally {
            setIsExporting(false);
        }
    }, [data.length, exportFilename, exportTitle, exportSubtitle, getExportColumns, getExportData, isRTL, companyInfo, showTotals, showAmountInWords, debitKey, creditKey, balanceKey]);

    const handlePrint = useCallback(() => {
        try {
            printTable({
                filename: exportFilename,
                title: exportTitle,
                subtitle: exportSubtitle || (isRTL ? `إجمالي السجلات: ${data.length}` : `Total records: ${data.length}`),
                columns: getExportColumns(),
                data: getExportData(),
                isRTL,
                companyInfo,
                showTotals,
                showAmountInWords,
                debitKey,
                creditKey,
                balanceKey,
            });
        } catch (error) {
            toast.error(isRTL ? 'فشل في الطباعة' : 'Print failed');
            console.error('Print error:', error);
        }
    }, [data.length, exportFilename, exportTitle, exportSubtitle, getExportColumns, getExportData, isRTL, companyInfo, showTotals, showAmountInWords, debitKey, creditKey, balanceKey]);

    const handleGoogleSheets = useCallback(() => {
        setIsExporting(true);
        try {
            openInGoogleSheets({
                filename: exportFilename,
                columns: getExportColumns(),
                data: getExportData(),
                isRTL,
            });
            toast.success(isRTL ? 'تم تحميل الملف' : 'File downloaded');
        } catch (error) {
            toast.error(isRTL ? 'فشل في التحميل' : 'Download failed');
            console.error('Google Sheets error:', error);
        } finally {
            setIsExporting(false);
        }
    }, [exportFilename, getExportColumns, getExportData, isRTL]);

    // === DnD Handler ===
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };


    return (
        <div className={cn('space-y-4', className)} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* === Toolbar === */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Search */}
                {enableSearch && (
                    <div className="relative flex-1 max-w-sm">
                        <Search className={cn(
                            'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground',
                            isRTL ? 'right-3' : 'left-3'
                        )} />
                        <Input
                            placeholder={searchPlaceholder || defaultSearchPlaceholder}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className={cn(isRTL ? 'pr-10' : 'pl-10')}
                        />
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Export Menu */}
                    {enableExport && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    disabled={isExporting}
                                >
                                    <Download className="w-4 h-4" />
                                    {isRTL ? 'تصدير' : 'Export'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
                                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    {isRTL ? 'تصدير Excel' : 'Export to Excel'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleGoogleSheets} className="gap-2 cursor-pointer">
                                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                    {isRTL ? 'فتح في Google Sheets' : 'Open in Google Sheets'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                                    <FileText className="w-4 h-4 text-red-600" />
                                    {isRTL ? 'تصدير PDF' : 'Export to PDF'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                                    <Printer className="w-4 h-4 text-gray-600" />
                                    {isRTL ? 'طباعة' : 'Print'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Edit Mode Buttons */}
                    {enableEditMode && (
                        <>
                            {!isEditing ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-amber-300 hover:bg-amber-50 text-amber-700"
                                    onClick={handleStartEdit}
                                >
                                    <Pencil className="w-4 h-4" />
                                    {isRTL ? 'تعديل' : 'Edit'}
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {/* Add Row Button */}
                                    {canAddRows && onAddRow && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-blue-300 hover:bg-blue-50 text-blue-700"
                                            onClick={handleAddRow}
                                        >
                                            <Plus className="w-4 h-4" />
                                            {isRTL ? 'إضافة' : 'Add'}
                                        </Button>
                                    )}

                                    {/* Save/Cancel Buttons - Only show if NOT instant edit */}
                                    {!enableInstantEdit && (
                                        <>
                                            {/* Save Button */}
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                                onClick={handleSave}
                                                disabled={isSaving}
                                            >
                                                <Save className="w-4 h-4" />
                                                {isSaving ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                                            </Button>

                                            {/* Cancel Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 border-red-300 hover:bg-red-50 text-red-700"
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                            >
                                                <X className="w-4 h-4" />
                                                {isRTL ? 'إلغاء' : 'Cancel'}
                                            </Button>
                                        </>
                                    )}

                                    {/* Keyboard Shortcuts Help */}
                                    {showKeyboardHelp && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-8 h-8 p-0 text-muted-foreground hover:text-primary"
                                                    title={isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
                                                >
                                                    <HelpCircle className="w-4 h-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                align={isRTL ? 'start' : 'end'}
                                                className="w-80 p-4"
                                                dir={isRTL ? 'rtl' : 'ltr'}
                                            >
                                                <div className="space-y-3">
                                                    <h4 className="font-semibold text-sm border-b pb-2">
                                                        {isRTL ? '⌨️ اختصارات لوحة المفاتيح' : '⌨️ Keyboard Shortcuts'}
                                                    </h4>
                                                    <div className="space-y-2 text-xs">
                                                        {/* Navigation */}
                                                        <div className="font-medium text-muted-foreground">
                                                            {isRTL ? '📍 التنقل' : '📍 Navigation'}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <span className="text-muted-foreground">Enter</span>
                                                            <span>{isRTL ? 'الخلية التالية (أسفل)' : 'Next row'}</span>
                                                            <span className="text-muted-foreground">Tab</span>
                                                            <span>{isRTL ? 'العمود التالي' : 'Next column'}</span>
                                                            <span className="text-muted-foreground">↑ ↓ ← →</span>
                                                            <span>{isRTL ? 'التنقل بين الخلايا' : 'Navigate cells'}</span>
                                                        </div>

                                                        {/* Copy Shortcuts */}
                                                        <div className="font-medium text-muted-foreground pt-2">
                                                            {isRTL ? '📋 النسخ' : '📋 Copy'}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <span className="text-muted-foreground">= + Enter</span>
                                                            <span>{isRTL ? 'نسخ من فوق + أسفل' : 'Copy above + down'}</span>
                                                            <span className="text-muted-foreground">= + Tab</span>
                                                            <span>{isRTL ? 'نسخ من فوق + تالي' : 'Copy above + next'}</span>
                                                            <span className="text-muted-foreground">Ctrl+D</span>
                                                            <span>{isRTL ? 'نسخ من فوق' : 'Copy from above'}</span>
                                                        </div>

                                                        {/* Balance Shortcuts */}
                                                        {enableBalanceShortcut && (
                                                            <>
                                                                <div className="font-medium text-muted-foreground pt-2">
                                                                    {isRTL ? '⚖️ الموازنة' : '⚖️ Balance'}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    <span className="text-muted-foreground">* + Enter</span>
                                                                    <span>{isRTL ? 'موازنة القيد' : 'Balance entry'}</span>
                                                                    <span className="text-muted-foreground">Double-click</span>
                                                                    <span>{isRTL ? 'موازنة سريعة' : 'Quick balance'}</span>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Row Management */}
                                                        <div className="font-medium text-muted-foreground pt-2">
                                                            {isRTL ? '📝 إدارة الصفوف' : '📝 Row Management'}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <span className="text-muted-foreground">Ctrl+I / Insert</span>
                                                            <span>{isRTL ? 'إدراج صف' : 'Insert row'}</span>
                                                            <span className="text-muted-foreground">Delete</span>
                                                            <span>{isRTL ? 'مسح الخلية' : 'Clear cell'}</span>
                                                        </div>

                                                        {/* Save/Cancel - Hide in Instant Edit Mode */}
                                                        {!enableInstantEdit && (
                                                            <>
                                                                <div className="font-medium text-muted-foreground pt-2">
                                                                    {isRTL ? '💾 الحفظ' : '💾 Save'}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    <span className="text-muted-foreground">Ctrl+S</span>
                                                                    <span>{isRTL ? 'حفظ التغييرات' : 'Save changes'}</span>
                                                                    <span className="text-muted-foreground">Escape</span>
                                                                    <span>{isRTL ? 'إلغاء / خروج' : 'Cancel / Exit'}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Column Visibility */}
                    {enableColumnVisibility && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Settings2 className="w-4 h-4" />
                                    {isRTL ? 'الأعمدة' : 'Columns'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
                                {table.getAllLeafColumns().map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Marker Color Picker */}
                    {enableMarker && (
                        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    title={isRTL ? 'اختر لون التعليم' : 'Select marker color'}
                                >
                                    <div
                                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                        style={{ backgroundColor: getMarkerColor(activeMarkerColor) }}
                                    />
                                    {isRTL ? 'تعليم' : 'Mark'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-3"
                                align={isRTL ? 'start' : 'end'}
                            >
                                <div className="space-y-3">
                                    <p className="text-sm font-medium">
                                        {isRTL ? '🎨 اختر لون التعليم' : '🎨 Select marker color'}
                                    </p>
                                    <ColorMarkerPalette
                                        selectedColor={activeMarkerColor}
                                        onColorSelect={(color) => {
                                            if (color) setActiveMarkerColor(color);
                                            setColorPickerOpen(false);
                                        }}
                                        size="md"
                                        showClear={false}
                                        showHelp={true}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 {t('table.markerHint')}
                                    </p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {/* === Summary Header - Clean Simple Design (No Borders) === */}
            {showSummaryHeader && (
                <div
                    className={cn(
                        "flex items-center gap-8 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800",
                        isRTL ? "flex-row justify-start" : "flex-row-reverse justify-start"
                    )}
                >
                    {/* Opening Balance - Order: Icon → Label → Number (RTL: right to left) */}
                    <div className="flex items-center gap-2">
                        <CurrencyDollar size={18} weight="bold" className="text-slate-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {t('accounting.openingBalance')}:
                        </span>
                        <span className="font-semibold text-base text-slate-700 dark:text-slate-200 tabular-nums">
                            {openingBalance?.toLocaleString('en-US') || '0'}
                        </span>
                    </div>

                    {/* Separator */}
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* Total Debit */}
                    <div className="flex items-center gap-2">
                        <TrendUp size={18} weight="bold" className="text-teal-500" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {t('common.totalDebit')}:
                        </span>
                        <span className="font-semibold text-base text-teal-600 dark:text-teal-400 tabular-nums">
                            {totals.totalDebit.toLocaleString('en-US')}
                        </span>
                    </div>

                    {/* Separator */}
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* Total Credit */}
                    <div className="flex items-center gap-2">
                        <TrendDown size={18} weight="bold" className="text-rose-500" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {t('common.totalCredit')}:
                        </span>
                        <span className="font-semibold text-base text-rose-600 dark:text-rose-400 tabular-nums">
                            {totals.totalCredit.toLocaleString('en-US')}
                        </span>
                    </div>

                    {/* Separator */}
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* Final Balance */}
                    <div className="flex items-center gap-2">
                        <ChartBar size={18} weight="bold" className="text-slate-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {t('common.balance')}:
                        </span>
                        <span className={cn(
                            "font-bold text-base tabular-nums",
                            totals.finalBalance >= 0
                                ? "text-slate-700 dark:text-slate-200"
                                : "text-red-600 dark:text-red-400"
                        )}>
                            {totals.finalBalance.toLocaleString('en-US')}
                        </span>
                    </div>
                </div>
            )}

            {/* === Table Container === */}
            <div
                className="rounded-lg border border-border overflow-hidden bg-background flex flex-col"
                style={{ maxHeight: enableExcelMode ? maxHeight : undefined }}
            >
                {/* Scrollable Data Area */}
                <div
                    className="overflow-auto flex-1 min-h-0"
                >
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <table className="w-full border-collapse" style={{ minWidth: table.getTotalSize() }}>
                            {/* Header - Sticky when in Excel mode */}
                            <thead className={enableExcelMode ? 'sticky top-0 z-10 bg-background' : ''}>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {/* Sequence Number Header */}
                                        {enableSequenceNumber && (
                                            <th
                                                className={cn(
                                                    'px-2 py-3 text-center bg-muted/50 text-muted-foreground font-medium text-xs w-12',
                                                    isRTL ? 'border-l border-border' : 'border-r border-border'
                                                )}
                                            >
                                                #
                                            </th>
                                        )}
                                        <SortableContext
                                            items={columnOrder}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            {headerGroup.headers.map((header) => (
                                                <SortableHeaderCell
                                                    key={header.id}
                                                    header={header}
                                                    isRTL={isRTL}
                                                />
                                            ))}
                                        </SortableContext>

                                        {/* Actions Header - only in edit mode */}
                                        {isEditing && canDeleteRows && (
                                            <th className={cn(
                                                "px-2 py-3 text-center bg-muted/50 text-muted-foreground font-medium text-xs w-10 z-20",
                                                isRTL
                                                    ? "sticky left-0 border-r border-border/50 shadow-sm"
                                                    : "sticky right-0 border-l border-border/50 shadow-sm"
                                            )}>
                                                {isRTL ? '✕' : '✕'}
                                            </th>
                                        )}
                                    </tr>
                                ))}
                            </thead>

                            {/* Body */}
                            <tbody>
                                {(enableExcelMode ? table.getFilteredRowModel().rows : table.getRowModel().rows).length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={orderedColumns.length + (enableSequenceNumber ? 1 : 0)}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            {emptyMessage || defaultEmptyMessage}
                                        </td>
                                    </tr>
                                ) : (
                                    (enableExcelMode ? table.getFilteredRowModel().rows : table.getRowModel().rows).map((row, rowIndex) => {
                                        const rowId = getRowIdInternal(row.original, row.index);
                                        const markerColor = getRowMarkerColor(row.original, row.index);
                                        const bgColor = getMarkerBackgroundColor(markerColor);
                                        const borderColor = getMarkerColor(markerColor);

                                        return (
                                            <tr
                                                key={row.id}
                                                onClick={() => onRowClick?.(row.original)}
                                                className={cn(
                                                    'group border-b border-border last:border-b-0',
                                                    'transition-colors',
                                                    onRowClick && 'cursor-pointer',
                                                    !markerColor && 'hover:bg-muted/50',
                                                    getRowClassName?.(row.original)
                                                )}
                                                style={{
                                                    backgroundColor: bgColor,
                                                    borderLeft: borderColor ? `3px solid ${borderColor}` : undefined,
                                                }}
                                            >
                                                {/* Sequence Number Cell with Marker */}
                                                {enableSequenceNumber && (
                                                    <td
                                                        className={cn(
                                                            'px-2 py-2 text-center w-12',
                                                            isRTL ? 'border-l border-border/50' : 'border-r border-border/50'
                                                        )}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {enableMarker ? (
                                                            <button
                                                                onClick={() => handleMarkerToggle(rowId, markerColor)}
                                                                className={cn(
                                                                    'w-7 h-7 rounded-full text-xs font-bold transition-all',
                                                                    'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary',
                                                                    markerColor
                                                                        ? 'text-white shadow-md'
                                                                        : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                                                                )}
                                                                style={{
                                                                    backgroundColor: borderColor || undefined,
                                                                }}
                                                                title={markerColor
                                                                    ? (isRTL ? 'انقر لإزالة التعليم' : 'Click to remove marker')
                                                                    : (isRTL ? 'انقر للتعليم' : 'Click to mark')
                                                                }
                                                            >
                                                                {rowIndex + 1}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                {rowIndex + 1}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}

                                                {row.getVisibleCells().map((cell, cellIndex) => {
                                                    const colKey = (cell.column.columnDef as any).accessorKey || cell.column.id;
                                                    const editConfig = editableColumns.find(c => c.key === colKey);
                                                    const cellValue = (row.original as Record<string, unknown>)[colKey];

                                                    return (
                                                        <td
                                                            key={cell.id}
                                                            className={cn(
                                                                // Normal mode: standard padding
                                                                !isEditing && 'px-4 py-2',
                                                                // Edit mode: no padding for full-cell input
                                                                isEditing && editConfig && 'p-0',
                                                                isEditing && !editConfig && 'px-4 py-2',
                                                                isRTL ? 'text-right' : 'text-left',
                                                                // فاصل عمودي خفيف بين الأعمدة
                                                                'border-l border-l-border/30',
                                                                // إخفاء الحد الأخير
                                                                cellIndex === row.getVisibleCells().length - 1 && !isEditing && 'border-l-0 border-r-0',
                                                                // Edit mode cell highlight
                                                                isEditing && editConfig && 'bg-inherit hover:bg-blue-50/30 transition-colors'
                                                            )}
                                                            style={{ width: cell.column.getSize() }}
                                                        >
                                                            {isEditing && editConfig ? (
                                                                <EditableCell
                                                                    value={cellValue}
                                                                    rowIndex={row.index}
                                                                    colIndex={cellIndex}
                                                                    colKey={colKey}
                                                                    config={editConfig}
                                                                    isEditing={isEditing}
                                                                    onChange={handleCellChange}
                                                                    onCopyFromAbove={handleCopyFromAbove}
                                                                    onNavigate={(direction) => handleCellNavigate(row.index, colKey, direction)}
                                                                    onCopyAndMove={(ri, ck, dir) => handleCopyAndMove(ri, ck, dir)}
                                                                    onBalance={enableBalanceShortcut ? handleBalance : undefined}
                                                                    onInsertRowBelow={handleInsertRowAt}
                                                                    onSwapDebitCredit={handleSwapDebitCredit}
                                                                    onDuplicateRow={handleDuplicateRow}
                                                                    enableBalanceShortcut={enableBalanceShortcut}
                                                                    isRTL={isRTL}
                                                                    totalRows={displayData.length}
                                                                    totalCols={editableColumns.length}
                                                                    companyId={hookCompanyId}
                                                                    rowData={row.original as Record<string, unknown>}
                                                                    renderAccountBalance={renderAccountBalance}
                                                                />
                                                            ) : (
                                                                flexRender(cell.column.columnDef.cell, cell.getContext())
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Delete Row Button - only in edit mode */}
                                                {isEditing && canDeleteRows && (
                                                    <td className={cn(
                                                        "px-2 py-2 w-10 z-10 bg-background group-hover:bg-muted/50 transition-colors",
                                                        isRTL
                                                            ? "sticky left-0 border-r border-border/50 shadow-sm"
                                                            : "sticky right-0 border-l border-border/50 shadow-sm"
                                                    )}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteRow(row.index);
                                                            }}
                                                            title={isRTL ? 'حذف الصف' : 'Delete row'}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </DndContext>
                </div>
            </div>

            {/* === Totals Footer (Sticky) === */}
            {showTotalsFooter && (
                <div
                    className="shrink-0 z-20 overflow-hidden"
                    style={{
                        background: 'linear-gradient(90deg, #0a1628 0%, #132238 50%, #0a1628 100%)',
                    }}
                >
                    {/* Main Footer Content */}
                    <div className="flex items-center justify-between px-4 py-2.5 text-white">
                        {/* Marked Count */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs opacity-70">{t('accounting.labels.marked')}</span>
                            <span className="font-semibold text-sm text-amber-400">{totals.markedCount}</span>
                        </div>

                        {/* Totals - Spread across */}
                        <div className="flex items-center gap-6">
                            {/* Total Credit */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">{t('common.totalCredit')}</span>
                                <span className="font-semibold text-sm text-white">
                                    {totals.totalCredit.toLocaleString('en-US')}
                                </span>
                            </div>

                            {/* Total Debit */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">{t('common.totalDebit')}</span>
                                <span className="font-semibold text-sm text-white">
                                    {totals.totalDebit.toLocaleString('en-US')}
                                </span>
                            </div>

                            {/* Final Balance */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">{t('accounting.closingBalance')}</span>
                                <span className={cn(
                                    'font-bold text-base',
                                    totals.finalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                                )}>
                                    {totals.finalBalance.toLocaleString('en-US')}
                                </span>
                            </div>
                        </div>

                        {/* Amount in Words - inline */}
                        {showAmountInWords && (
                            <div className="text-xs text-slate-400 max-w-md truncate">
                                {getAmountInWords(totals.finalBalance)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === Pagination (hidden in Excel mode) === */}
            {
                enablePagination && !enableExcelMode && (
                    <div className="flex items-center justify-between gap-4 flex-wrap text-sm mt-4">
                        <div className="text-muted-foreground">
                            {isRTL
                                ? `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - ${Math.min(
                                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                                    table.getFilteredRowModel().rows.length
                                )} من ${table.getFilteredRowModel().rows.length}`
                                : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - ${Math.min(
                                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                                    table.getFilteredRowModel().rows.length
                                )} of ${table.getFilteredRowModel().rows.length}`}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                {isRTL ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </Button>

                            <span className="px-3 py-1 rounded bg-muted font-medium">
                                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                            </span>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                {isRTL ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                )}
        </div>
    );
}

export default NexaDataTable;
