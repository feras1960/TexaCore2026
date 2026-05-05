/**
 * ════════════════════════════════════════════════════════════════════
 * 📊 AccountingGrid — مكون جدول محاسبي حديث (Controlled Component)
 * ════════════════════════════════════════════════════════════════════
 * 
 * بديل لـ NexaDataTable مخصص لإدخال القيود المحاسبية.
 * يعمل كـ Controlled Component — الأب يمتلك البيانات والمكون يعرضها مباشرة.
 * 
 * ✨ المميزات:
 *   ✅ Controlled State — لا editedData داخلي (يحل مشكلة تزامن سعر الصرف)
 *   ✅ TanStack Table — عرض جميل ومألوف
 *   ✅ Excel-style navigation — 18 اختصار لوحة مفاتيح
 *   ✅ InlineAccountCell — بحث حسابات ذكي
 *   ✅ تزامن فوري بين العملة وسعر الصرف
 *   ✅ ربط فواتير/كونتينرات/حوالات
 *   ✅ RTL كامل
 *   ✅ يدعم: journal / receipt / payment / cash
 * 
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { normalizeNumerals } from '@/lib/arabicNumeralNormalizer';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import {
    Trash2,
    HelpCircle,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InlineAccountCell } from '@/components/ui/InlineAccountCell';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { numberToWords } from '@/utils/numberToWords';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

export interface GridEditableColumn {
    key: string;
    type: 'text' | 'number' | 'select' | 'date' | 'account';
    options?: { value: string; label: string }[];
    dynamicOptions?: (row: any) => { value: string; label: string }[];
    required?: boolean;
    min?: number;
    max?: number;
    placeholder?: string;
}

export interface AccountingGridProps<TData extends Record<string, any>> {
    /** البيانات — المصدر الوحيد (Controlled) */
    rows: TData[];
    /** عند أي تغيير في البيانات */
    onChange: (rows: TData[]) => void;

    /** أعمدة العرض (TanStack ColumnDef) */
    columns: ColumnDef<TData>[];
    /** أعمدة التعديل */
    editableColumns: GridEditableColumn[];

    /** يعترض التغيير قبل تطبيقه (مثلاً: ربط العملة بسعر الصرف) */
    onCellChange?: (rowIndex: number, colKey: string, newValue: unknown, currentRow: TData) => TData | void;
    /** إنشاء صف جديد فارغ */
    onAddRow?: () => TData;
    /** حذف صف */
    onDeleteRow?: (row: TData, index: number) => void;
    /** إدراج صف في موضع معين */
    onInsertRow?: (atIndex: number) => TData;
    /** حفظ البيانات */
    onSave?: (rows: TData[]) => Promise<void>;

    /** مفتاح عمود المدين */
    debitKey?: string;
    /** مفتاح عمود الدائن */
    creditKey?: string;
    /** مفتاح المدين لحساب التوازن (العملة المحلية) — افتراضي = debitKey */
    balanceDebitKey?: string;
    /** مفتاح الدائن لحساب التوازن (العملة المحلية) — افتراضي = creditKey */
    balanceCreditKey?: string;
    /** تفعيل اختصار الموازنة */
    enableBalanceShortcut?: boolean;
    /** إخفاء تحذير الفرق في التوازن (لليومية الصندوق/المقبوضات/المدفوعات) */
    hideBalanceWarning?: boolean;
    /** عرض تذييل المجاميع */
    showTotalsFooter?: boolean;
    /** عرض المبلغ بالحروف */
    showAmountInWords?: boolean;
    /** تسمية عمود المدين في الفوتر (افتراضي: مدين) */
    footerDebitLabel?: string;
    /** تسمية عمود الدائن في الفوتر (افتراضي: دائن) */
    footerCreditLabel?: string;
    /** إخفاء الرصيد من الفوتر (لليومية الصندوق) */
    hideFooterBalance?: boolean;

    /** صفوف فارغة ابتدائية */
    initialEmptyRows?: number;
    /** عتبة إضافة صفوف تلقائية */
    emptyRowsThreshold?: number;
    /** عدد الصفوف المضافة تلقائياً */
    autoAddRowsCount?: number;
    /** تنظيف الفارغة عند الحفظ */
    cleanEmptyRowsOnSave?: boolean;

    /** السماح بحذف الصفوف */
    canDeleteRows?: boolean;
    /** عرض أيقونة الاختصارات */
    showKeyboardHelp?: boolean;

    /** RTL */
    isRTL?: boolean;
    /** ارتفاع منطقة البيانات */
    maxHeight?: string;
    /** رسالة عند عدم وجود بيانات */
    emptyMessage?: string;
    /** CSS class إضافي */
    className?: string;

    /** رندر رصيد الحساب */
    renderAccountBalance?: (accountId: string, rowIndex: number) => React.ReactNode;
    /** تلوين صف حسب بياناته */
    getRowClassName?: (row: TData) => string;

    /** company ID لمحدد الحسابات */
    companyId?: string;
    /** مفتاح العملة في بيانات الصف — لعرض رمز العملة بجانب المبالغ */
    currencyKey?: string;
    /** وضع القراءة فقط — يُخفي الصفوف الفارغة ويمنع التعديل */
    isReadOnly?: boolean;
}


// ═══════════════════════════════════════
// EditableGridCell — الخلية القابلة للتعديل
// ═══════════════════════════════════════

interface GridCellProps {
    value: unknown;
    rowIndex: number;
    colKey: string;
    config: GridEditableColumn;
    onChange: (rowIndex: number, colKey: string, value: unknown) => void;
    onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onCopyFromAbove?: (rowIndex: number, colKey: string) => void;
    onCopyAndMove?: (rowIndex: number, colKey: string, direction: 'down' | 'right') => unknown;
    onBalance?: (rowIndex: number, colKey: string) => number | undefined;
    onInsertRowBelow?: (rowIndex: number) => void;
    onSwapDebitCredit?: (rowIndex: number, colKey: string) => void;
    /** نقل القيمة من الخلية المقابلة إلى هذه الخلية — يُرجع القيمة المسحوبة */
    onPullFromOpposite?: (rowIndex: number, targetColKey: string) => number;
    /** موازنة القيد تلقائياً (الطرفان فارغان) — يُرجع { targetColKey, value } */
    onAutoBalance?: (rowIndex: number) => { targetColKey: string; value: number } | null;
    onDuplicateRow?: (rowIndex: number) => void;
    enableBalanceShortcut?: boolean;
    isRTL: boolean;
    companyId?: string;
    rowData?: Record<string, unknown>;
    renderAccountBalance?: (accountId: string, rowIndex: number) => React.ReactNode;
    currencyKey?: string;
}

const EditableGridCell = React.memo(function EditableGridCell({
    value,
    rowIndex,
    colKey,
    config,
    onChange,
    onNavigate,
    onCopyFromAbove,
    onCopyAndMove,
    onBalance,
    onInsertRowBelow,
    onSwapDebitCredit,
    onPullFromOpposite,
    onAutoBalance,
    onDuplicateRow,
    enableBalanceShortcut,
    isRTL,
    companyId,
    rowData,
    renderAccountBalance,
    currencyKey,
}: GridCellProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
    const { decimalPlaces } = useAccountingSettings();

    // Sync from parent when not focused (Controlled behavior!)
    useEffect(() => {
        if (!isFocused) {
            setLocalValue(value);
        }
    }, [value, isFocused]);

    const handleChange = (newValue: unknown) => {
        setLocalValue(newValue);
        onChange(rowIndex, colKey, newValue);
    };

    const handleTextLocalChange = (newValue: string) => {
        // Normalize Arabic/Persian numerals to English on every keystroke
        setLocalValue(normalizeNumerals(newValue));
    };

    const commitLocalValue = () => {
        if (config.type === 'number') {
            const raw = normalizeNumerals(String(localValue ?? ''));
            const parsed = parseFloat(raw) || 0;
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

    // === Double-click: نقل القيمة للطرف الآخر (مدين ↔ دائن ، مقبوضات ↔ مدفوعات) ===
    const handleDoubleClick = () => {
        const currentVal = Number(localValue) || 0;
        const swapPairs: Record<string, string> = {
            'debit': 'credit',
            'credit': 'debit',
            'receipts': 'payments',
            'payments': 'receipts',
        };
        const oppositeKey = swapPairs[colKey];

        if (oppositeKey) {
            // ─── الخلية فارغة ───
            if (currentVal === 0) {

                // 1) حاول السحب من الطرف الآخر (له قيمة)
                if (onPullFromOpposite) {
                    const pulledVal = onPullFromOpposite(rowIndex, colKey);
                    if (pulledVal > 0) {
                        setLocalValue(pulledVal);
                        return;
                    }
                }

                // 2) الطرفان فارغان → موازنة تلقائية للقيد كله
                if (onAutoBalance) {
                    const result = onAutoBalance(rowIndex);
                    if (result && result.value > 0) {
                        // إذا كانت هذه الخلية هي الخلية الصحيحة للموازنة → أظهر القيمة فيها
                        if (result.targetColKey === colKey) {
                            setLocalValue(result.value);
                        }
                        // إذا ذهبت الموازنة للطرف الآخر → هذه الخلية تبقى 0 لكن الصف يُحدَّث
                        return;
                    }
                }
                return;
            }

            // ─── الخلية فيها قيمة ← ادفعها للطرف الآخر ───
            if (currentVal > 0 && onSwapDebitCredit) {
                onSwapDebitCredit(rowIndex, colKey);
                setLocalValue(0);
                return;
            }
        }

        // اختصار الموازنة للحقول الأخرى (غير debit/credit)
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
        if (inputValue.trim() === '=' || inputValue.endsWith('=')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const copiedValue = onCopyAndMove?.(rowIndex, colKey, 'down');
                if (copiedValue !== undefined) setLocalValue(copiedValue);
                return;
            } else if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const copiedValue = onCopyAndMove?.(rowIndex, colKey, 'right');
                if (copiedValue !== undefined) setLocalValue(copiedValue);
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
                    setTimeout(() => onNavigate?.('down'), 50);
                }
                return;
            }
        }

        // === التنقل بالأسهم ===
        switch (e.key) {
            case 'ArrowUp':
                if (!e.shiftKey) { e.preventDefault(); onNavigate?.('up'); }
                break;
            case 'ArrowDown':
                if (!e.shiftKey) { e.preventDefault(); onNavigate?.('down'); }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                onNavigate?.(isRTL ? 'right' : 'left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                onNavigate?.(isRTL ? 'left' : 'right');
                break;
            case 'Tab':
                e.preventDefault();
                commitLocalValue();
                onNavigate?.(e.shiftKey ? 'left' : 'right');
                break;
            case 'Enter':
                e.preventDefault();
                commitLocalValue();
                onNavigate?.(e.shiftKey ? 'up' : 'down');
                break;
            case 'Escape':
                e.preventDefault();
                setLocalValue(value);
                (e.target as HTMLInputElement).blur();
                break;
            case 'Delete':
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    setLocalValue(config.type === 'number' ? 0 : '');
                    onChange(rowIndex, colKey, config.type === 'number' ? 0 : '');
                }
                break;
            case 'Insert':
                e.preventDefault();
                onInsertRowBelow?.(rowIndex);
                break;
            case 'i':
            case 'I':
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
                        onDuplicateRow?.(rowIndex);
                    } else {
                        onCopyFromAbove?.(rowIndex, colKey);
                    }
                }
                break;
        }
    };

    // === Styling ===
    const baseInputClass = cn(
        'w-full h-full min-h-[36px] px-3 py-2',
        'bg-transparent border-0 outline-none shadow-none',
        'focus:bg-blue-50/50 focus:ring-2 focus:ring-blue-400 focus:ring-inset',
        'transition-colors duration-150',
        'text-sm',
        config.type === 'number' && 'text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
    );

    // === Render by type ===
    switch (config.type) {
        case 'number':
            return (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    inputMode="decimal"
                    value={
                        isFocused
                            ? (localValue !== undefined && localValue !== null ? String(localValue) : '')
                            : (localValue !== undefined && localValue !== null && !isNaN(Number(localValue)) ? Number(localValue).toFixed(decimalPlaces) : '')
                    }
                    onFocus={(e) => {
                        setIsFocused(true);
                        setTimeout(() => e.target.select(), 10);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        // Normalize Arabic numerals then parse
                        const raw = normalizeNumerals(String(localValue ?? ''));
                        const parsed = parseFloat(raw) || 0;
                        const rounded = Number(parsed.toFixed(decimalPlaces));
                        setLocalValue(rounded);
                        onChange(rowIndex, colKey, rounded);
                    }}
                    onChange={(e) => {
                        // Normalize Arabic/Persian numerals inline as user types
                        const normalized = normalizeNumerals(e.target.value);
                        setLocalValue(normalized);
                    }}
                    onKeyDown={handleKeyDown}
                    onDoubleClick={handleDoubleClick}
                    min={config.min}
                    max={config.max}
                    placeholder={config.placeholder}
                    className={cn(
                        baseInputClass,
                        // Visual hint on all swappable columns
                        ['debit','credit','receipts','payments'].includes(colKey)
                            ? 'cursor-pointer'
                            : ''
                    )}
                    title={(() => {
                        if (!['debit','credit','receipts','payments'].includes(colKey)) return undefined;
                        const swapMap: Record<string, string> = {
                            'debit': 'دائن', 'credit': 'مدين',
                            'receipts': 'مدفوعات', 'payments': 'مقبوضات'
                        };
                        const oppKey: Record<string, string> = {
                            'debit': 'credit', 'credit': 'debit',
                            'receipts': 'payments', 'payments': 'receipts'
                        };
                        const thisVal = Number(localValue) || 0;
                        const oppVal = Number((rowData as Record<string, unknown>)?.[oppKey[colKey]]) || 0;
                        if (thisVal > 0) return `انقر مرتين لنقل القيمة إلى ${swapMap[colKey]}`;
                        if (oppVal > 0) return `انقر مرتين لسحب القيمة من ${swapMap[oppKey[colKey]]}`;
                        return undefined;
                    })()}
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
                    {!localValue && <option value="">{config.placeholder || '...'}</option>}
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
                        if (account) {
                            onChange(rowIndex, 'account_name', account.name_ar || account.name_en || '');
                            onChange(rowIndex, 'account_code', account.code || '');
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
});


// ═══════════════════════════════════════
// AccountingGrid — المكون الرئيسي
// ═══════════════════════════════════════

export function AccountingGrid<TData extends Record<string, any>>({
    rows,
    onChange,
    columns: initialColumns,
    editableColumns,
    onCellChange,
    onAddRow,
    onDeleteRow,
    onInsertRow,
    onSave,
    debitKey = 'debit',
    creditKey = 'credit',
    balanceDebitKey: propBalanceDebitKey,
    balanceCreditKey: propBalanceCreditKey,
    enableBalanceShortcut = false,
    hideBalanceWarning = false,
    showTotalsFooter = false,
    showAmountInWords = true,
    footerDebitLabel,
    footerCreditLabel,
    hideFooterBalance = false,
    initialEmptyRows = 0,
    emptyRowsThreshold = 5,
    autoAddRowsCount = 5,
    cleanEmptyRowsOnSave = true,
    canDeleteRows = true,
    showKeyboardHelp = true,
    isRTL = true,
    maxHeight = '500px',
    emptyMessage,
    className,
    renderAccountBalance,
    getRowClassName,
    companyId,
    currencyKey,
    isReadOnly = false,
}: AccountingGridProps<TData>) {

    const { t, language } = useLanguage();
    const { decimalPlaces } = useAccountingSettings();

    // ═══ Balance keys — للتوازن نستخدم المبلغ المحلي (debit_local/credit_local) ═══
    const balDebitKey = propBalanceDebitKey || debitKey;
    const balCreditKey = propBalanceCreditKey || creditKey;

    // ─── Initialize with empty rows if needed ───
    const initializedRef = useRef(false);
    useEffect(() => {
        // Skip init in read-only mode
        if (isReadOnly) return;
        if (onAddRow && initialEmptyRows > 0 && rows.length === 0 && !initializedRef.current) {
            initializedRef.current = true;
            const newRows: TData[] = [];
            for (let i = 0; i < initialEmptyRows; i++) {
                newRows.push(onAddRow());
            }
            onChange(newRows);
        }
        if (rows.length === 0) {
            initializedRef.current = false;
        }
    }, [rows.length, initialEmptyRows, isReadOnly]);

    // ─── Auto-add empty rows when threshold reached ───
    // CRITICAL: Only check KEY fields (account + amounts + description)
    // Do NOT check fields with defaults (currency, exchange_rate, link_type) to avoid infinite loops!
    const isRowEmpty = useCallback((row: TData): boolean => {
        const r = row as Record<string, unknown>;
        const accountEmpty = !r['account_id'];
        const debitEmpty = !r[debitKey] || Number(r[debitKey]) === 0;
        const creditEmpty = !r[creditKey] || Number(r[creditKey]) === 0;
        const descEmpty = !r['description'] || String(r['description']).trim() === '';
        return accountEmpty && debitEmpty && creditEmpty && descEmpty;
    }, [debitKey, creditKey]);

    const remainingEmptyRows = useMemo(() => {
        let count = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
            if (isRowEmpty(rows[i])) count++;
            else break;
        }
        return count;
    }, [rows, isRowEmpty]);

    useEffect(() => {
        // Skip auto-add in read-only mode
        if (isReadOnly) return;
        if (onAddRow && rows.length > 0 && remainingEmptyRows < emptyRowsThreshold) {
            const newRows: TData[] = [...rows];
            for (let i = 0; i < autoAddRowsCount; i++) {
                newRows.push(onAddRow());
            }
            onChange(newRows);
        }
    }, [remainingEmptyRows, emptyRowsThreshold, rows.length, isReadOnly]);

    // ─── Editable column keys for navigation ───
    const editableColumnKeys = useMemo(() => editableColumns.map(col => col.key), [editableColumns]);

    // ─── STABLE REFS for callbacks (prevents re-render cascade!) ───
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onCellChangeRef = useRef(onCellChange);
    onCellChangeRef.current = onCellChange;

    // ─── Cell change handler (CONTROLLED — updates parent directly!) ───
    const handleCellChange = useCallback((rowIndex: number, colKey: string, newValue: unknown) => {
        const currentRow = rowsRef.current[rowIndex];
        if (!currentRow) return;

        let updatedRow = { ...currentRow, [colKey]: newValue };

        // ── قاعدة المحاسبة المدمجة: مدين / دائن و مقبوضات / مدفوعات حصرية ──
        const numVal = Number(newValue) || 0;
        if (colKey === 'debit' && numVal > 0) {
            updatedRow = { ...updatedRow, debit: numVal, credit: 0 };
        } else if (colKey === 'credit' && numVal > 0) {
            updatedRow = { ...updatedRow, credit: numVal, debit: 0 };
        } else if (colKey === 'receipts' && numVal > 0) {
            updatedRow = { ...updatedRow, receipts: numVal, payments: 0 };
        } else if (colKey === 'payments' && numVal > 0) {
            updatedRow = { ...updatedRow, payments: numVal, receipts: 0 };
        }

        // Call interceptor if provided (e.g., currency → exchange rate sync)
        const interceptor = onCellChangeRef.current;
        if (interceptor) {
            const intercepted = interceptor(rowIndex, colKey, newValue, updatedRow);
            if (intercepted) {
                updatedRow = intercepted;
            }
        }

        // ⚡ CRITICAL FIX: Update rowsRef.current IMMEDIATELY so that subsequent
        // synchronous onChange calls (e.g. account_name, account_code, currency after
        // account_id selection) read the already-updated row and don't overwrite changes.
        const newRows = [...rowsRef.current];
        newRows[rowIndex] = updatedRow;
        rowsRef.current = newRows; // ← فوري قبل التصيير التالي
        onChangeRef.current(newRows);
    }, []); // STABLE — no deps!


    // ─── Row management ───
    const handleAddRow = useCallback(() => {
        if (onAddRow) {
            const newRow = onAddRow();
            onChangeRef.current([...rowsRef.current, newRow]);
        }
    }, [onAddRow]);

    const handleDeleteRow = useCallback((rowIndex: number) => {
        const row = rowsRef.current[rowIndex];
        if (onDeleteRow) onDeleteRow(row, rowIndex);
        onChangeRef.current(rowsRef.current.filter((_, idx) => idx !== rowIndex));
    }, [onDeleteRow]);

    const handleInsertRowAt = useCallback((atIndex: number) => {
        const newRow = onInsertRow ? onInsertRow(atIndex) : onAddRow?.();
        if (newRow) {
            const newRows = [...rowsRef.current];
            newRows.splice(atIndex + 1, 0, newRow);
            onChangeRef.current(newRows);
        }
    }, [onInsertRow, onAddRow]);

    const handleDuplicateRow = useCallback((rowIndex: number) => {
        const sourceRow = rowsRef.current[rowIndex];
        const clonedRow = { ...sourceRow, id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } as TData;
        const newRows = [...rowsRef.current];
        newRows.splice(rowIndex + 1, 0, clonedRow);
        onChangeRef.current(newRows);
    }, []);

    // ─── Balance calculation ───
    const handleBalance = useCallback((rowIndex: number, colKey: string): number | undefined => {
        let totalDebit = 0;
        let totalCredit = 0;
        rowsRef.current.forEach((row, idx) => {
            if (idx !== rowIndex) {
                totalDebit += Number(row[debitKey]) || 0;
                totalCredit += Number(row[creditKey]) || 0;
            }
        });
        const difference = totalDebit - totalCredit;
        if (colKey === debitKey) return difference < 0 ? Math.abs(difference) : 0;
        if (colKey === creditKey) return difference > 0 ? difference : 0;
        return undefined;
    }, [debitKey, creditKey]);

    // ─── Swap debit↔credit / receipts↔payments on double-click (PUSH from source) ───
    const handleSwapDebitCredit = useCallback((rowIndex: number, colKey: string) => {
        const row = rowsRef.current[rowIndex];
        const currentVal = Number(row[colKey]) || 0;
        if (currentVal <= 0) return;

        const swapMap: Record<string, string> = {
            [debitKey]: creditKey,
            [creditKey]: debitKey,
            'receipts': 'payments',
            'payments': 'receipts',
        };
        const targetKey = swapMap[colKey];
        if (!targetKey) return;

        const newRows = [...rowsRef.current];
        newRows[rowIndex] = { ...row, [colKey]: 0, [targetKey]: currentVal };
        onChangeRef.current(newRows);
    }, [debitKey, creditKey]);

    // ─── Pull from opposite cell (PULL into target, reads from rowsRef directly) ───
    // يُرجع القيمة المسحوبة حتى تقدر الخلية تُحدّث localValue فوراً (تجاوز مشكلة isFocused)
    const handlePullFromOpposite = useCallback((rowIndex: number, targetColKey: string): number => {
        const row = rowsRef.current[rowIndex];

        const swapMap: Record<string, string> = {
            [debitKey]: creditKey,
            [creditKey]: debitKey,
            'receipts': 'payments',
            'payments': 'receipts',
        };
        const sourceKey = swapMap[targetColKey];
        if (!sourceKey) return 0;

        const sourceVal = Number(row[sourceKey]) || 0;
        if (sourceVal <= 0) return 0;

        const newRows = [...rowsRef.current];
        newRows[rowIndex] = { ...row, [sourceKey]: 0, [targetColKey]: sourceVal };
        onChangeRef.current(newRows);
        return sourceVal; // ← نُرجع القيمة للخلية لتضعها في localValue
    }, [debitKey, creditKey]);

    // ─── Auto-balance: double-click على صف فارغ ← يُوازن القيد تلقائياً ───
    // يحسب الفرق بين مجموع المدين ومجموع الدائن (من باقي الصفوف)
    // ويضع القيمة في المدين أو الدائن حسب ما يحتاجه القيد
    const handleAutoBalance = useCallback((rowIndex: number): { targetColKey: string; value: number } | null => {
        let totalDebit = 0;
        let totalCredit = 0;
        rowsRef.current.forEach((row, idx) => {
            if (idx !== rowIndex) {
                totalDebit += Number(row[debitKey]) || 0;
                totalCredit += Number(row[creditKey]) || 0;
            }
        });

        const difference = totalDebit - totalCredit;
        if (Math.abs(difference) < 0.001) return null; // القيد متوازن

        // إذا مجموع المدين > مجموع الدائن ← نحتاج دائن
        // إذا مجموع الدائن > مجموع المدين ← نحتاج مدين
        const targetColKey = difference > 0 ? creditKey : debitKey;
        const value = Number(Math.abs(difference).toFixed(6));

        const row = rowsRef.current[rowIndex];
        const newRows = [...rowsRef.current];
        newRows[rowIndex] = { ...row, [debitKey]: 0, [creditKey]: 0, [targetColKey]: value };
        onChangeRef.current(newRows);

        return { targetColKey, value };
    }, [debitKey, creditKey]);


    // ─── Copy from above ───
    const handleCopyFromAbove = useCallback((rowIndex: number, colKey: string) => {
        if (rowIndex > 0) {
            const prevRow = rowsRef.current[rowIndex - 1];
            const prevValue = prevRow[colKey];
            handleCellChange(rowIndex, colKey, prevValue);
            if (colKey === 'account_id') {
                if (prevRow['account_name']) handleCellChange(rowIndex, 'account_name', prevRow['account_name']);
                if (prevRow['account_code']) handleCellChange(rowIndex, 'account_code', prevRow['account_code']);
            }
        }
    }, [handleCellChange]);

    // ─── Cell Navigation ───
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

    const handleCellNavigate = useCallback((
        currentRowIndex: number,
        currentColKey: string,
        direction: 'up' | 'down' | 'left' | 'right'
    ) => {
        const colIndex = editableColumnKeys.indexOf(currentColKey);
        let newRowIndex = currentRowIndex;
        let newColIndex = colIndex;
        const rowCount = rowsRef.current.length;

        switch (direction) {
            case 'up':
                newRowIndex = Math.max(0, currentRowIndex - 1);
                break;
            case 'down':
                newRowIndex = Math.min(rowCount - 1, currentRowIndex + 1);
                if (currentRowIndex === rowCount - 1 && onAddRow) {
                    handleAddRow();
                    newRowIndex = currentRowIndex + 1;
                }
                break;
            case 'left':
                newColIndex = Math.max(0, colIndex - 1);
                if (colIndex === 0 && currentRowIndex > 0) {
                    newRowIndex = currentRowIndex - 1;
                    newColIndex = editableColumnKeys.length - 1;
                }
                break;
            case 'right':
                newColIndex = Math.min(editableColumnKeys.length - 1, colIndex + 1);
                if (colIndex === editableColumnKeys.length - 1 && currentRowIndex < rowCount - 1) {
                    newRowIndex = currentRowIndex + 1;
                    newColIndex = 0;
                } else if (colIndex === editableColumnKeys.length - 1 && currentRowIndex === rowCount - 1 && onAddRow) {
                    handleAddRow();
                    newRowIndex = currentRowIndex + 1;
                    newColIndex = 0;
                }
                break;
        }

        const newColKey = editableColumnKeys[newColIndex];
        setEditingCell({ rowIndex: newRowIndex, colKey: newColKey });

        setTimeout(() => {
            const cellInput = document.querySelector(
                `[data-cell-id="${newRowIndex}-${newColKey}"]`
            ) as HTMLElement;
            if (cellInput) {
                cellInput.focus();
                if (cellInput instanceof HTMLInputElement) {
                    if (cellInput.type === 'number') {
                        cellInput.select();
                    } else {
                        const len = cellInput.value?.length || 0;
                        cellInput.setSelectionRange(len, len);
                    }
                }
            }
        }, 50);
    }, [editableColumnKeys, onAddRow, handleAddRow]);

    // ─── Copy and move ───
    const handleCopyAndMove = useCallback((
        rowIndex: number,
        colKey: string,
        direction: 'down' | 'right'
    ): unknown => {
        if (rowIndex > 0) {
            const prevValue = rowsRef.current[rowIndex - 1][colKey];
            handleCellChange(rowIndex, colKey, prevValue);
            setTimeout(() => handleCellNavigate(rowIndex, colKey, direction), 100);
            return prevValue;
        } else {
            handleCellNavigate(rowIndex, colKey, direction);
            return undefined;
        }
    }, [handleCellChange, handleCellNavigate]);

    // ─── Global keyboard handler ───
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (onSave) {
                    const cleanedRows = cleanEmptyRowsOnSave
                        ? rows.filter(row => !isRowEmpty(row))
                        : rows;
                    onSave(cleanedRows);
                }
            }
        };
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [rows, onSave, cleanEmptyRowsOnSave, isRowEmpty]);

    // ─── Totals (بالعملة المحلية للتوازن الصحيح) ───
    const totals = useMemo(() => {
        let totalDebit = 0;
        let totalCredit = 0;
        rows.forEach(row => {
            // ═══ المجاميع بالمبلغ المحلي — لحساب التوازن الصحيح ═══
            totalDebit += Number(row[balDebitKey]) || 0;
            totalCredit += Number(row[balCreditKey]) || 0;
        });
        return {
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit,
            rowCount: rows.filter(row => !isRowEmpty(row)).length,
        };
    }, [rows, balDebitKey, balCreditKey, isRowEmpty]);

    // ─── TanStack Table ───
    // In read-only mode: filter out empty rows so only real data shows
    const displayRows = useMemo(
        () => isReadOnly ? rows.filter(r => !isRowEmpty(r)) : rows,
        [rows, isReadOnly, isRowEmpty]
    );
    const table = useReactTable({
        data: displayRows,
        columns: initialColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    // ─── Render ───
    return (
        <div className={cn('space-y-0', className)} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ═══ Toolbar ═══ */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t('accounting.lines') || 'Lines'}: {totals.rowCount}</span>
                    {enableBalanceShortcut && !hideBalanceWarning && (
                        <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-medium',
                            Math.abs(totals.balance) < 0.01
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        )}>
                            {Math.abs(totals.balance) < 0.01
                                ? `✓ ${t('accounting.balanced') || 'Balanced'}`
                                : `${t('accounting.difference') || 'Diff'}: ${Math.abs(totals.balance).toLocaleString()}`}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {showKeyboardHelp && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-7 h-7 p-0 text-muted-foreground hover:text-primary"
                                    title={t('accounting.grid.keyboardShortcuts') || 'Keyboard Shortcuts'}
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align={isRTL ? 'start' : 'end'}
                                className="w-72 p-3"
                                dir={isRTL ? 'rtl' : 'ltr'}
                            >
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-xs border-b pb-1">
                                        ⌨️ {t('accounting.grid.keyboardShortcuts') || 'Keyboard Shortcuts'}
                                    </h4>
                                    <div className="space-y-1.5 text-[11px]">
                                        <div className="font-medium text-muted-foreground">📍 {t('accounting.grid.navigation') || 'Navigation'}</div>
                                        <div className="grid grid-cols-2 gap-0.5">
                                            <span className="text-muted-foreground">Enter</span><span>{t('accounting.grid.nextRow') || 'Next row'}</span>
                                            <span className="text-muted-foreground">Tab</span><span>{t('accounting.grid.nextColumn') || 'Next column'}</span>
                                            <span className="text-muted-foreground">↑ ↓ ← →</span><span>{t('accounting.grid.navigateCells') || 'Navigate cells'}</span>
                                        </div>
                                        <div className="font-medium text-muted-foreground pt-1">📋 {t('accounting.grid.copy') || 'Copy'}</div>
                                        <div className="grid grid-cols-2 gap-0.5">
                                            <span className="text-muted-foreground">= + Enter</span><span>{t('accounting.grid.copyAboveDown') || 'Copy above + down'}</span>
                                            <span className="text-muted-foreground">Ctrl+D</span><span>{t('shortcuts.copyFromAbove') || 'Copy from above'}</span>
                                            <span className="text-muted-foreground">Ctrl+Shift+D</span><span>{t('accounting.duplicateRow') || 'Duplicate row'}</span>
                                        </div>
                                        {enableBalanceShortcut && (
                                            <>
                                                <div className="font-medium text-muted-foreground pt-1">⚖️ {t('accounting.balance') || 'Balance'}</div>
                                                <div className="grid grid-cols-2 gap-0.5">
                                                    <span className="text-muted-foreground">* + Enter</span><span>{t('accounting.balanceEntry') || 'Balance entry'}</span>
                                                    <span className="text-muted-foreground">Double-click</span><span>{t('accounting.grid.swapDebitCredit') || 'Swap debit↔credit'}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="font-medium text-muted-foreground pt-1">📝 {t('accounting.grid.rows') || 'Rows'}</div>
                                        <div className="grid grid-cols-2 gap-0.5">
                                            <span className="text-muted-foreground">Ctrl+I</span><span>{t('accounting.grid.insertRow') || 'Insert row'}</span>
                                            <span className="text-muted-foreground">Delete</span><span>{t('accounting.grid.clearCell') || 'Clear cell'}</span>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {/* ═══ Table ═══ */}
            <div
                className="rounded-lg border border-border overflow-hidden bg-background flex flex-col"
                style={{ maxHeight }}
            >
                <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full border-collapse" style={{ minWidth: table.getTotalSize() }}>
                        {/* Header - Sticky */}
                        <thead className="sticky top-0 z-10 bg-background">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {/* Row # */}
                                    <th className={cn(
                                        'px-2 py-2.5 text-center bg-muted/50 text-muted-foreground font-medium text-xs w-10',
                                        isRTL ? 'border-l border-border' : 'border-r border-border'
                                    )}>
                                        #
                                    </th>

                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                'px-3 py-2.5 font-semibold text-xs',
                                                'bg-muted/50 border-b border-border',
                                                isRTL ? 'text-right border-l border-l-border/40' : 'text-left border-r border-r-border/40',
                                                'last:border-l-0 last:border-r-0'
                                            )}
                                            style={{ width: header.getSize() }}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}

                                    {/* Delete column header — hidden in read-only */}
                                    {canDeleteRows && !isReadOnly && (
                                        <th className={cn(
                                            "px-1 py-2.5 text-center bg-muted/50 text-muted-foreground font-medium text-xs w-9 z-20",
                                            isRTL
                                                ? "sticky left-0 border-r border-border/50 shadow-sm"
                                                : "sticky right-0 border-l border-border/50 shadow-sm"
                                        )}>
                                            ✕
                                        </th>
                                    )}
                                </tr>
                            ))}
                        </thead>

                        {/* Body */}
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={initialColumns.length + 2}
                                        className="py-8 text-center text-muted-foreground text-sm"
                                    >
                                        {emptyMessage || t('noData') || 'No data'}
                                    </td>
                                </tr>
                            ) : (
                                table.getCoreRowModel().rows.map((row, rowIndex) => (
                                    <tr
                                        key={row.id}
                                        className={cn(
                                            'group border-b border-border last:border-b-0',
                                            'transition-colors hover:bg-muted/30',
                                            getRowClassName?.(row.original)
                                        )}
                                    >
                                        {/* Row number */}
                                        <td className={cn(
                                            'px-2 py-1.5 text-center w-10',
                                            isRTL ? 'border-l border-border/50' : 'border-r border-border/50'
                                        )}>
                                            <span className="text-xs text-muted-foreground">{rowIndex + 1}</span>
                                        </td>

                                        {/* Cells */}
                                        {row.getVisibleCells().map((cell, cellIndex) => {
                                            const colKey = (cell.column.columnDef as any).accessorKey || cell.column.id;
                                            // In read-only mode, treat all cells as non-editable
                                            const editConfig = !isReadOnly ? editableColumns.find(c => c.key === colKey) : undefined;

                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={cn(
                                                        editConfig ? 'p-0' : 'px-3 py-1.5',
                                                        isRTL ? 'text-right' : 'text-left',
                                                        'border-l border-l-border/30',
                                                        cellIndex === row.getVisibleCells().length - 1 && 'border-l-0 border-r-0',
                                                        editConfig && 'bg-inherit hover:bg-blue-50/30 transition-colors'
                                                    )}
                                                    style={{ width: cell.column.getSize() }}
                                                >
                                                    {editConfig ? (
                                                        <EditableGridCell
                                                            value={(row.original as Record<string, unknown>)[colKey]}
                                                            rowIndex={row.index}
                                                            colKey={colKey}
                                                            config={editConfig}
                                                            onChange={handleCellChange}
                                                            onCopyFromAbove={handleCopyFromAbove}
                                                            onNavigate={(direction) => handleCellNavigate(row.index, colKey, direction)}
                                                            onCopyAndMove={(ri, ck, dir) => handleCopyAndMove(ri, ck, dir)}
                                                            onBalance={enableBalanceShortcut ? handleBalance : undefined}
                                                            onInsertRowBelow={handleInsertRowAt}
                                                            onSwapDebitCredit={handleSwapDebitCredit}
                                                            onPullFromOpposite={handlePullFromOpposite}
                                                            onAutoBalance={enableBalanceShortcut ? handleAutoBalance : undefined}
                                                            onDuplicateRow={handleDuplicateRow}
                                                            enableBalanceShortcut={enableBalanceShortcut}
                                                            isRTL={isRTL}
                                                            companyId={companyId}
                                                            rowData={row.original as Record<string, unknown>}
                                                            renderAccountBalance={renderAccountBalance}
                                                            currencyKey={currencyKey}
                                                        />
                                                    ) : (
                                                        flexRender(cell.column.columnDef.cell, cell.getContext())
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Delete button — hidden in read-only */}
                                        {canDeleteRows && !isReadOnly && (
                                            <td className={cn(
                                                "px-1 py-1.5 w-9 z-10 bg-background group-hover:bg-muted/50 transition-colors",
                                                isRTL
                                                    ? "sticky left-0 border-r border-border/50 shadow-sm"
                                                    : "sticky right-0 border-l border-border/50 shadow-sm"
                                            )}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRow(row.index);
                                                    }}
                                                    title={t('accounting.deleteRow') || 'Delete row'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══ Totals Footer ═══ */}
            {showTotalsFooter && (
                <div
                    className="shrink-0 z-20 overflow-hidden rounded-b-lg"
                    style={{
                        background: 'linear-gradient(90deg, #0a1628 0%, #132238 50%, #0a1628 100%)',
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-2.5 text-white">
                        <div className="flex items-center gap-2">
                            <span className="text-xs opacity-70">{t('accounting.lines') || 'Lines'}</span>
                            <span className="font-semibold text-sm text-amber-400">{totals.rowCount}</span>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">
                                    {footerDebitLabel || t('accounting.columns.debit') || 'Debit'}
                                </span>
                                <span className="font-semibold text-sm text-white">
                                    {totals.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">
                                    {footerCreditLabel || t('accounting.columns.credit') || 'Credit'}
                                </span>
                                <span className="font-semibold text-sm text-white">
                                    {totals.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            {!hideFooterBalance && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs opacity-70">{t('accounting.balance') || 'Balance'}</span>
                                    <span className={cn(
                                        'font-bold text-base',
                                        Math.abs(totals.balance) < 0.01 ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {totals.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {showAmountInWords && (
                            <div className="text-xs text-slate-400 max-w-md truncate">
                                {numberToWords(Math.abs(totals.balance), language)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountingGrid;
