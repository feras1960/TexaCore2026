/**
 * Enhanced Ledger Tab - تبويب كشف الحساب المحسن
 * يعرض سجل العمليات المالية باستخدام NexaDataTable مع:
 * - فلاتر تواريخ سريعة
 * - فلتر العملة
 * - شريط مجاميع ثابت في الأسفل
 * - دعم MDI لفتح القيود في تبويبات
 * - سحب وإفلات الأعمدة
 * - تغيير حجم الأعمدة
 */

import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Download,
    Printer,
    Filter,
    ChevronDown,
    ChevronUp,
    FileText,
    Table as TableIcon,
    LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '../utils/formatters';
import type { LedgerEntry } from '../types';

interface LedgerTabProps {
    entries?: LedgerEntry[];
    loading?: boolean;
    error?: string;
    currency?: string;
    useArabicNumerals?: boolean;
    onEntryClick?: (entry: LedgerEntry) => void;
    onEntryOpen?: (entry: LedgerEntry) => void; // MDI: open in new tab
    onExport?: () => void;
    onPrint?: () => void;
    // Totals
    totalDebit?: number;
    totalCredit?: number;
    openingBalance?: number;
    closingBalance?: number;
    // Currency options
    availableCurrencies?: string[];
    selectedCurrency?: string;
    onCurrencyChange?: (currency: string) => void;
}

// Quick date preset type
type QuickDatePreset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'all';

// View mode type
type ViewMode = 'nexa' | 'classic';

export function LedgerTab({
    entries = [],
    loading = false,
    error,
    currency = '',
    useArabicNumerals = false,
    onEntryClick,
    onEntryOpen,
    onExport,
    onPrint,
    totalDebit = 0,
    totalCredit = 0,
    openingBalance = 0,
    closingBalance = 0,
    availableCurrencies,
    selectedCurrency,
    onCurrencyChange,
}: LedgerTabProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const { supportedCurrencies } = useAccountingSettings();

    // Use provided currencies or fallback to company settings
    const currencies = availableCurrencies || supportedCurrencies || [];

    // Local state for filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [quickDatePreset, setQuickDatePreset] = useState<QuickDatePreset>('all');
    const [localCurrency, setLocalCurrency] = useState(selectedCurrency || currency);
    const [viewMode, setViewMode] = useState<ViewMode>('nexa'); // Default to new table

    // Quick date helper
    const applyQuickDate = useCallback((preset: QuickDatePreset) => {
        setQuickDatePreset(preset);
        const today = new Date();
        const formatDateString = (d: Date) => d.toISOString().split('T')[0];

        switch (preset) {
            case 'today':
                setDateFrom(formatDateString(today));
                setDateTo(formatDateString(today));
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                setDateFrom(formatDateString(yesterday));
                setDateTo(formatDateString(yesterday));
                break;
            case 'thisWeek':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                setDateFrom(formatDateString(weekStart));
                setDateTo(formatDateString(today));
                break;
            case 'thisMonth':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFrom(formatDateString(monthStart));
                setDateTo(formatDateString(today));
                break;
            case 'thisYear':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                setDateFrom(formatDateString(yearStart));
                setDateTo(formatDateString(today));
                break;
            case 'all':
            default:
                setDateFrom('');
                setDateTo('');
                break;
        }
    }, []);

    // Filter entries by date only (search handled by NexaDataTable)
    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            // Date filters
            if (dateFrom && entry.date < dateFrom) return false;
            if (dateTo && entry.date > dateTo) return false;
            return true;
        });
    }, [entries, dateFrom, dateTo]);

    // Calculate filtered totals
    const filteredTotals = useMemo(() => {
        return filteredEntries.reduce(
            (acc, entry) => ({
                debit: acc.debit + (entry.debit || 0),
                credit: acc.credit + (entry.credit || 0),
            }),
            { debit: 0, credit: 0 }
        );
    }, [filteredEntries]);

    // NexaDataTable columns
    const columns: ColumnDef<LedgerEntry>[] = useMemo(() => [
        {
            accessorKey: 'serial',
            header: t('serial') || 'م',
            size: 50,
            cell: ({ row }) => (
                <span className="text-gray-400 text-center block">
                    {useArabicNumerals ? (row.index + 1).toLocaleString('ar-SA') : (row.index + 1)}
                </span>
            ),
        },
        {
            accessorKey: 'debit',
            header: t('debit') || 'مدين',
            size: 100,
            cell: ({ row }) => (
                <span className="font-mono text-end block">
                    {row.original.debit > 0 ? formatNumber(row.original.debit, useArabicNumerals) : '-'}
                </span>
            ),
        },
        {
            accessorKey: 'credit',
            header: t('credit') || 'دائن',
            size: 100,
            cell: ({ row }) => (
                <span className="font-mono text-end block">
                    {row.original.credit > 0 ? formatNumber(row.original.credit, useArabicNumerals) : '-'}
                </span>
            ),
        },
        {
            accessorKey: 'balance',
            header: t('balance') || 'الرصيد',
            size: 120,
            cell: ({ row }) => (
                <span className={cn(
                    "font-mono font-medium text-end block",
                    row.original.balance < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                )}>
                    {formatNumber(row.original.balance, useArabicNumerals)}
                </span>
            ),
        },
        {
            accessorKey: 'description',
            header: t('description') || 'البيان',
            size: 200,
            cell: ({ row }) => (
                <div className="flex flex-col gap-0.5">
                    <span className="truncate font-medium text-gray-700 dark:text-gray-200" title={row.original.description}>
                        {row.original.description || '-'}
                    </span>
                    {row.original.status && row.original.status !== 'posted' && (
                        <Badge className={cn(
                            "text-[10px] px-1.5 py-0 w-fit",
                            row.original.status === 'draft' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                        )}>
                            {row.original.status === 'draft' ? (t('status.draft') || 'مسودة') : (t('status.cancelled') || 'ملغي')}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'entry_number',
            header: t('reference') || 'المرجع',
            size: 100,
            cell: ({ row }) => (
                <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                    {row.original.entry_number || row.original.reference || '-'}
                </span>
            ),
        },
        {
            accessorKey: 'date',
            header: t('date') || 'التاريخ',
            size: 100,
            cell: ({ row }) => (
                <span className="font-mono text-gray-600">
                    {formatDate(row.original.date, useArabicNumerals, 'short')}
                </span>
            ),
        },
        {
            accessorKey: 'cost_center',
            header: t('costCenter') || 'مركز التكلفة',
            size: 100,
            cell: ({ row }) => (
                <span className="text-gray-500 truncate block" title={row.original.cost_center}>
                    {row.original.cost_center || '-'}
                </span>
            ),
        },
    ], [t, useArabicNumerals]);

    // Handle currency change
    const handleCurrencyChange = (value: string) => {
        setLocalCurrency(value);
        onCurrencyChange?.(value);
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    const currentBalance = closingBalance || (filteredTotals.debit - filteredTotals.credit + openingBalance);

    return (
        <div className="flex flex-col h-full">
            {/* Compact Toolbar */}
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b mb-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                    <Button
                        variant={viewMode === 'nexa' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('nexa')}
                        className="h-8 rounded-none px-3 gap-1.5"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="text-xs hidden sm:inline">{t('views.advanced') || 'متقدم'}</span>
                    </Button>
                    <Button
                        variant={viewMode === 'classic' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('classic')}
                        className="h-8 rounded-none px-3 gap-1.5"
                    >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span className="text-xs hidden sm:inline">{t('views.classic') || 'كلاسيكي'}</span>
                    </Button>
                </div>

                {/* Currency Filter */}
                {currencies.length > 1 && (
                    <Select value={localCurrency} onValueChange={handleCurrencyChange}>
                        <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue placeholder={t('currency') || 'العملة'} />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map((curr) => (
                                <SelectItem key={curr} value={curr} className="text-xs">
                                    {t(`currencies.${curr}`) || curr}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Show/Hide Filters */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-8 gap-1.5 text-xs px-2"
                >
                    <Filter className="w-3.5 h-3.5" />
                    {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>

                <div className="flex-1" />

                {/* Actions */}
                {onPrint && (
                    <Button variant="ghost" size="sm" onClick={onPrint} className="h-8 w-8 p-0">
                        <Printer className="w-3.5 h-3.5" />
                    </Button>
                )}
                {onExport && (
                    <Button variant="ghost" size="sm" onClick={onExport} className="h-8 w-8 p-0">
                        <Download className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>

            {/* Quick Date Presets + Date Filters */}
            {showFilters && (
                <div className="flex items-center gap-2 pb-2 border-b mb-2 flex-wrap">
                    {/* Quick Date Buttons */}
                    <div className="flex items-center gap-1">
                        {[
                            { key: 'today', label: t('filters.today') || 'اليوم' },
                            { key: 'yesterday', label: t('filters.yesterday') || 'أمس' },
                            { key: 'thisWeek', label: t('filters.thisWeek') || 'هذا الأسبوع' },
                            { key: 'thisMonth', label: t('filters.thisMonth') || 'هذا الشهر' },
                            { key: 'thisYear', label: t('filters.thisYear') || 'هذه السنة' },
                        ].map(({ key, label }) => (
                            <Button
                                key={key}
                                variant={quickDatePreset === key ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => applyQuickDate(key as QuickDatePreset)}
                                className="h-7 text-xs px-2"
                            >
                                {label}
                            </Button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-gray-300 mx-1" />

                    {/* Manual Date Inputs */}
                    <div className="flex items-center gap-1.5">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setQuickDatePreset('all'); }}
                            className="h-7 w-32 text-xs"
                        />
                        <span className="text-xs text-gray-400">→</span>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setQuickDatePreset('all'); }}
                            className="h-7 w-32 text-xs"
                        />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                            setQuickDatePreset('all');
                        }}
                        className="h-7 text-xs text-gray-500"
                    >
                        {t('filters.reset') || 'مسح'}
                    </Button>
                </div>
            )}

            {/* Table Container */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {viewMode === 'nexa' ? (
                    /* NexaDataTable View */
                    <div className="flex-1 overflow-hidden">
                        <NexaDataTable
                            data={filteredEntries}
                            columns={columns}
                            isRTL={isRTL}
                            pageSize={15}
                            searchPlaceholder={t('accounting.searchTransactions') || 'بحث في الحركات...'}
                            emptyMessage={t('messages.noTransactions') || 'لا توجد حركات'}
                            enableColumnResizing={true}
                            enableColumnReordering={true}
                            enablePagination={true}
                            enableSearch={true}
                            onRowClick={(row) => onEntryOpen?.(row)}
                        />
                    </div>
                ) : (
                    /* Classic Table View - Keep existing simple table for comparison */
                    <div className="flex-1 overflow-auto border rounded-lg bg-white dark:bg-gray-900">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="p-2 text-center w-12">{t('serial') || 'م'}</th>
                                    <th className="p-2 text-end w-24">{t('debit') || 'مدين'}</th>
                                    <th className="p-2 text-end w-24">{t('credit') || 'دائن'}</th>
                                    <th className="p-2 text-end w-28">{t('balance') || 'الرصيد'}</th>
                                    <th className="p-2">{t('description') || 'البيان'}</th>
                                    <th className="p-2 w-24">{t('reference') || 'المرجع'}</th>
                                    <th className="p-2 w-24">{t('date') || 'التاريخ'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((entry, index) => (
                                    <tr
                                        key={entry.id || index}
                                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                        onClick={() => onEntryOpen?.(entry)}
                                    >
                                        <td className="p-2 text-center text-gray-400">{index + 1}</td>
                                        <td className="p-2 text-end font-mono">{entry.debit > 0 ? formatNumber(entry.debit, useArabicNumerals) : '-'}</td>
                                        <td className="p-2 text-end font-mono">{entry.credit > 0 ? formatNumber(entry.credit, useArabicNumerals) : '-'}</td>
                                        <td className={cn("p-2 text-end font-mono font-medium", entry.balance < 0 && "text-red-600")}>
                                            {formatNumber(entry.balance, useArabicNumerals)}
                                        </td>
                                        <td className="p-2 truncate max-w-[200px]">{entry.description || '-'}</td>
                                        <td className="p-2 text-blue-600 font-mono text-xs">{entry.entry_number || '-'}</td>
                                        <td className="p-2 font-mono text-xs">{formatDate(entry.date, useArabicNumerals, 'short')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FIXED TOTALS FOOTER */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 mt-2 rounded-lg">
                <div className="flex items-center justify-between">
                    {/* Info Badge */}
                    {viewMode === 'nexa' && (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                ✨ {t('messages.dragColumns') || 'اسحب الأعمدة لإعادة الترتيب'}
                            </Badge>
                        </div>
                    )}

                    {/* Right Side: Totals Breakdown */}
                    <div className="flex items-center gap-6 flex-1 justify-end">
                        {/* Opening (Hidden on small screens if needed) */}
                        {openingBalance !== 0 && (
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-[10px] text-gray-500 font-medium">{t('accounting.openingBalance') || 'الرصيد الافتتاحي'}</span>
                                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                                    {formatNumber(openingBalance, useArabicNumerals)}
                                </span>
                            </div>
                        )}

                        {/* Separator */}
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                        {/* Totals Group */}
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-500 font-medium">{t('totalDebit') || 'مجموع المدين'}</span>
                                <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                                    {formatNumber(filteredTotals.debit, useArabicNumerals)}
                                </span>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-500 font-medium">{t('totalCredit') || 'مجموع الدائن'}</span>
                                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                                    {formatNumber(filteredTotals.credit, useArabicNumerals)}
                                </span>
                            </div>
                        </div>

                        {/* Closing Balance Card */}
                        <div className={cn(
                            "flex flex-col items-end px-3 py-1.5 rounded-lg shadow-sm min-w-[120px]",
                            currentBalance >= 0
                                ? "bg-gradient-to-br from-erp-navy/90 to-erp-navy text-white"
                                : "bg-gradient-to-br from-red-600 to-red-700 text-white"
                        )}>
                            <span className="text-[10px] opacity-80 font-medium mb-0.5">{t('currentBalance') || 'الرصيد الحالي'}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold font-mono tracking-tight">
                                    {formatNumber(Math.abs(currentBalance), useArabicNumerals)}
                                </span>
                                <span className="text-[10px] opacity-80">{currency}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LedgerTab;
