/**
 * Enhanced Ledger Tab - تبويب كشف الحساب المحسن
 * يعرض سجل العمليات المالية مع:
 * - فلاتر تواريخ سريعة
 * - فلتر العملة
 * - شريط مجاميع ثابت في الأسفل
 * - دعم MDI لفتح القيود في تبويبات
 */

import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Search,
    Download,
    Printer,
    Filter,
    ChevronDown,
    ChevronUp,
    FileText,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
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

export function LedgerTab({
    entries = [],
    loading = false,
    error,
    currency = 'SAR',
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
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const { supportedCurrencies } = useAccountingSettings();

    // Use provided currencies or fallback to company settings
    const currencies = availableCurrencies || supportedCurrencies || ['SAR'];

    // Local state for filters
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [quickDatePreset, setQuickDatePreset] = useState<QuickDatePreset>('all');
    const [localCurrency, setLocalCurrency] = useState(selectedCurrency || currency);

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

    // Filter entries
    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesDescription = entry.description?.toLowerCase().includes(searchLower);
                const matchesRef = entry.reference?.toLowerCase().includes(searchLower);
                const matchesEntry = entry.entry_number?.toLowerCase().includes(searchLower);
                if (!matchesDescription && !matchesRef && !matchesEntry) return false;
            }

            // Date filters
            if (dateFrom && entry.date < dateFrom) return false;
            if (dateTo && entry.date > dateTo) return false;

            return true;
        });
    }, [entries, search, dateFrom, dateTo]);

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

    // Get status badge
    const getStatusBadge = (status?: string) => {
        if (!status) return null;

        const statusConfig: Record<string, { color: string; label: string }> = {
            posted: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: t('status.posted') || 'مرحّل' },
            draft: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: t('status.draft') || 'مسودة' },
            cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: t('status.cancelled') || 'ملغي' },
        };

        const config = statusConfig[status];
        if (!config) return null;

        return (
            <Badge className={cn("text-[10px] px-1.5 py-0", config.color)}>
                {config.label}
            </Badge>
        );
    };

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
                {/* Search */}
                <div className="relative flex-1 min-w-[150px] max-w-xs">
                    <Search className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400",
                        isRTL ? "right-2.5" : "left-2.5"
                    )} />
                    <Input
                        placeholder={t('accounting.searchTransactions') || 'بحث...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn("h-8 text-xs", isRTL ? "pr-8" : "pl-8")}
                    />
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
                            setSearch('');
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

            {/* Table Container - Scrollable */}
            <div className="flex-1 overflow-hidden border rounded-lg bg-white dark:bg-gray-900 flex flex-col min-h-0 shadow-sm relative">
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                    <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-bold w-12 h-9 text-center">{t('serial') || 'م'}</TableHead>
                                <TableHead className="text-xs font-bold text-end w-24 h-9">{t('debit') || 'مدين'}</TableHead>
                                <TableHead className="text-xs font-bold text-end w-24 h-9">{t('credit') || 'دائن'}</TableHead>
                                <TableHead className="text-xs font-bold text-end w-28 h-9 bg-gray-50/50 dark:bg-gray-800/50">{t('balance') || 'الرصيد'}</TableHead>
                                <TableHead className="text-xs font-bold h-9">{t('description') || 'البيان'}</TableHead>
                                <TableHead className="text-xs font-bold w-24 h-9">{t('reference') || 'المرجع'}</TableHead>
                                <TableHead className="text-xs font-bold w-24 h-9">{t('date') || 'التاريخ'}</TableHead>
                                <TableHead className="text-xs font-bold w-24 h-9">{t('costCenter') || 'مركز التكلفة'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Opening Balance Row */}
                            {openingBalance !== 0 && (
                                <TableRow className="bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50">
                                    <TableCell colSpan={3} className="p-0 border-none" />
                                    <TableCell className="text-xs font-mono text-end font-bold py-2 text-blue-800 dark:text-blue-300">
                                        {formatNumber(openingBalance, useArabicNumerals)}
                                    </TableCell>
                                    <TableCell colSpan={4} className="text-xs font-medium py-2 text-blue-800 dark:text-blue-300 px-4">
                                        {t('accounting.openingBalance') || 'الرصيد الافتتاحي'}
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* Entries */}
                            {filteredEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium">{t('messages.noTransactions') || 'لا توجد حركات'}</p>
                                            <p className="text-xs text-gray-400">{t('messages.tryAdjustingFilters') || 'جرب تغيير الفلاتر'}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEntries.map((entry, index) => (
                                    <TableRow
                                        key={entry.id || index}
                                        tabIndex={0}
                                        role="button"
                                        className={cn(
                                            "group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors border-b-0 focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20",
                                            entry.status === 'cancelled' && "opacity-50 line-through bg-red-50/30",
                                            index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-800/30"
                                        )}
                                        onClick={() => onEntryOpen?.(entry)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onEntryOpen?.(entry);
                                            }
                                        }}
                                    >
                                        {/* Serial */}
                                        <TableCell className="text-xs text-center text-gray-400 py-1.5 align-top">
                                            {useArabicNumerals ? (index + 1).toLocaleString('ar-SA') : (index + 1)}
                                        </TableCell>

                                        {/* Debit */}
                                        <TableCell className="text-xs font-mono text-end py-1.5 align-top">
                                            {entry.debit > 0 ? (
                                                <span className="text-gray-600 dark:text-gray-300">
                                                    {formatNumber(entry.debit, useArabicNumerals)}
                                                </span>
                                            ) : '-'}
                                        </TableCell>

                                        {/* Credit */}
                                        <TableCell className="text-xs font-mono text-end py-1.5 align-top">
                                            {entry.credit > 0 ? (
                                                <span className="text-gray-600 dark:text-gray-300">
                                                    {formatNumber(entry.credit, useArabicNumerals)}
                                                </span>
                                            ) : '-'}
                                        </TableCell>

                                        {/* Balance */}
                                        <TableCell className={cn(
                                            "text-xs font-mono text-end font-medium py-1.5 align-top bg-gray-50/30 dark:bg-gray-800/30",
                                            entry.balance < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                                        )}>
                                            {formatNumber(entry.balance, useArabicNumerals)}
                                        </TableCell>

                                        {/* Description */}
                                        <TableCell className="text-xs max-w-[200px] py-1.5 align-top">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="truncate font-medium text-gray-700 dark:text-gray-200" title={entry.description}>
                                                    {entry.description || '-'}
                                                </span>
                                                {entry.status && entry.status !== 'posted' && (
                                                    <div className="flex">
                                                        {getStatusBadge(entry.status)}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Reference */}
                                        <TableCell className="text-xs py-1.5 align-top">
                                            <div className="flex items-center gap-1 group/ref">
                                                <span className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-[11px] truncate max-w-[90px] block" title={entry.entry_number || entry.reference}>
                                                    {entry.entry_number || entry.reference || '-'}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Date */}
                                        <TableCell className="text-xs font-mono whitespace-nowrap py-1.5 align-top text-gray-600">
                                            {formatDate(entry.date, useArabicNumerals, 'short')}
                                        </TableCell>

                                        {/* Cost Center */}
                                        <TableCell className="text-xs text-gray-500 py-1.5 align-top truncate max-w-[100px]" title={entry.cost_center}>
                                            {entry.cost_center || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* FIXED TOTALS FOOTER - No sticky, part of flex layout */}
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex items-center justify-between">
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
        </div>
    );
}

export default LedgerTab;
