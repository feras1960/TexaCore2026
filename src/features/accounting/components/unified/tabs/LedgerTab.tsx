/**
 * LedgerTab — كشف الحساب (الإصدار الجديد)
 * 
 * يستخدم NexaListTable + بيانات حقيقية من accountLedgerService
 * ✅ أسطر منفتحة (تفاصيل القيد عند الضغط)
 * ✅ ماركر 9 ألوان للمطابقة المحاسبية
 * ✅ تجميع شهري قابل للإلغاء
 * ✅ فلاتر: تواريخ سريعة + عملة + نوع الحركة
 * ✅ حساب مقابل ذكي (ثنائي أو متعدد)
 * ✅ أيقونة نوع المستند
 * ✅ شريط ملخص علوي + footer ثابت
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { LedgerExpandedRow } from './LedgerExpandedRow';
import { useLedgerData, type ExtendedLedgerEntry } from '../hooks/useLedgerData';
import { cn, formatNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
    Calendar,
    CalendarDays,
    CalendarRange,
    Layers,
    TrendingUp,
    TrendingDown,
    Minus,
    ListOrdered,
    LayoutList,
} from 'lucide-react';

// ═══ Entry Type Icons ═══
const ENTRY_TYPE_ICONS: Record<string, string> = {
    journal: '📋',
    invoice: '🧾',
    payment: '💸',
    receipt: '💰',
    transfer: '🔄',
};

// ═══ Props ═══
interface LedgerTabProps {
    accountId: string;
    companyId: string;
    currency?: string;
    onEntryOpen?: (entry: ExtendedLedgerEntry) => void;
    renderExpandedRowOverride?: (row: ExtendedLedgerEntry) => React.ReactNode;
    /** Party mode: enables invoice+payment grouping toggle */
    partyMode?: boolean;
}

// ═══ View Mode ═══
type ViewMode = 'chronological' | 'grouped';

// ═══ Quick Date Presets ═══
type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

const DATE_PRESETS: { id: DatePreset; label_ar: string; label_en: string; icon: React.ReactNode }[] = [
    { id: 'month', label_ar: 'الشهر', label_en: 'Month', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'quarter', label_ar: 'الربع', label_en: 'Quarter', icon: <CalendarRange className="w-3.5 h-3.5" /> },
    { id: 'year', label_ar: 'السنة', label_en: 'Year', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'all', label_ar: 'الكل', label_en: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
];

// ═══ Movement Type Filter ═══
type MovementFilter = 'all' | 'debit' | 'credit';

// ═══ Entry Type Filter (Party mode) ═══
type EntryTypeFilter = 'all' | 'invoices' | 'payments';

export function LedgerTab({
    accountId,
    companyId,
    currency = '',
    onEntryOpen,
    renderExpandedRowOverride,
    partyMode = false,
}: LedgerTabProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const { supportedCurrencies } = useAccountingSettings();

    // ═══ Data Hook ═══
    const {
        entries,
        stats,
        loading,
        error,
        filters,
        setDateFrom,
        setDateTo,
        setCurrency,
        setDatePreset,
        setSearch,
        refetch,
        fetchEntryDetails,
    } = useLedgerData({
        accountId,
        companyId,
        enabled: !!accountId,
    });

    // ═══ Local State ═══
    const [activePreset, setActivePreset] = useState<DatePreset>('all');
    const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
    const [showMonthlyGroups, setShowMonthlyGroups] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('chronological');
    const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>('all');
    const [invoicePaymentMap, setInvoicePaymentMap] = useState<Map<string, string[]>>(new Map());

    // ═══ Handle Preset Click ═══
    const handlePresetClick = useCallback((preset: DatePreset) => {
        setActivePreset(preset);
        setDatePreset(preset);
    }, [setDatePreset]);

    // ═══ Build Invoice→Payment Links (for grouped mode) ═══
    useEffect(() => {
        if (!partyMode || viewMode !== 'grouped' || entries.length === 0) return;

        const buildLinks = async () => {
            // Find all payment/receipt entries that have a referenceId
            const paymentEntries = entries.filter(e =>
                (e.type === 'payment' || e.type === 'receipt') && e.referenceId
            );
            if (paymentEntries.length === 0) return;

            // Query cash_transactions to find their reference_id (which links to sales_transactions)
            const paymentRefIds = paymentEntries.map(e => e.referenceId!).filter(Boolean);
            const { data: cashTxns } = await supabase
                .from('cash_transactions')
                .select('id, reference_type, reference_id')
                .in('id', paymentRefIds);

            if (!cashTxns) return;

            // Build map: invoice_id → [payment_entry_ids]
            const map = new Map<string, string[]>();
            for (const ct of cashTxns) {
                if (ct.reference_id && (ct.reference_type?.includes('invoice') || ct.reference_type?.includes('sales'))) {
                    // Find which invoice entry has this reference_id
                    const invoiceEntry = entries.find(e => e.type === 'invoice' && e.referenceId === ct.reference_id);
                    if (invoiceEntry) {
                        const payEntry = paymentEntries.find(e => e.referenceId === ct.id);
                        if (payEntry) {
                            const existing = map.get(invoiceEntry.id) || [];
                            existing.push(payEntry.id);
                            map.set(invoiceEntry.id, existing);
                        }
                    }
                }
            }
            setInvoicePaymentMap(map);
        };

        buildLinks();
    }, [partyMode, viewMode, entries]);

    // ═══ Filter Entries by Movement Type + Entry Type ═══
    const filteredEntries = useMemo(() => {
        let filtered = entries;
        if (movementFilter === 'debit') {
            filtered = filtered.filter(e => e.debit > 0);
        } else if (movementFilter === 'credit') {
            filtered = filtered.filter(e => e.credit > 0);
        }
        // Entry type filter (party mode)
        if (partyMode && entryTypeFilter !== 'all') {
            if (entryTypeFilter === 'invoices') {
                filtered = filtered.filter(e => e.type === 'invoice');
            } else if (entryTypeFilter === 'payments') {
                filtered = filtered.filter(e => e.type === 'payment' || e.type === 'receipt');
            }
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(e =>
                e.description?.toLowerCase().includes(term) ||
                e.entryNumber?.toLowerCase().includes(term) ||
                e.counterAccount?.accountNameAr?.toLowerCase().includes(term) ||
                e.counterAccount?.accountNameEn?.toLowerCase().includes(term) ||
                e.counterAccount?.accountCode?.toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [entries, movementFilter, entryTypeFilter, partyMode, searchTerm]);

    // ═══ Grouped Entries (invoices with their payments) ═══
    const groupedEntries = useMemo(() => {
        if (!partyMode || viewMode !== 'grouped') return filteredEntries;

        // Collect all payment IDs that are linked to invoices
        const linkedPaymentIds = new Set<string>();
        invoicePaymentMap.forEach(payIds => payIds.forEach(id => linkedPaymentIds.add(id)));

        // Build ordered list: invoice → its payments → next invoice → ...
        const result: ExtendedLedgerEntry[] = [];
        const processedIds = new Set<string>();

        // First pass: invoices with their linked payments
        for (const entry of filteredEntries) {
            if (entry.type === 'invoice' && !processedIds.has(entry.id)) {
                result.push(entry);
                processedIds.add(entry.id);

                // Add linked payments right after the invoice
                const linkedPayIds = invoicePaymentMap.get(entry.id) || [];
                for (const payId of linkedPayIds) {
                    const payEntry = filteredEntries.find(e => e.id === payId);
                    if (payEntry && !processedIds.has(payEntry.id)) {
                        result.push(payEntry);
                        processedIds.add(payEntry.id);
                    }
                }
            }
        }

        // Second pass: unlinked entries (payments not tied to invoices, journal entries, etc.)
        for (const entry of filteredEntries) {
            if (!processedIds.has(entry.id)) {
                result.push(entry);
                processedIds.add(entry.id);
            }
        }

        return result;
    }, [filteredEntries, partyMode, viewMode, invoicePaymentMap]);

    // Use grouped or filtered entries based on mode
    const displayEntries = partyMode && viewMode === 'grouped' ? groupedEntries : filteredEntries;

    // ═══ Monthly Groups ═══
    const monthlyData = useMemo(() => {
        if (!showMonthlyGroups || filteredEntries.length === 0) return null;

        const groups = new Map<string, { debit: number; credit: number; count: number }>();
        filteredEntries.forEach(e => {
            const monthKey = e.date.substring(0, 7); // "2026-02"
            const existing = groups.get(monthKey) || { debit: 0, credit: 0, count: 0 };
            existing.debit += e.debit;
            existing.credit += e.credit;
            existing.count++;
            groups.set(monthKey, existing);
        });
        return groups;
    }, [filteredEntries, showMonthlyGroups]);

    // ═══ Column Definitions ═══
    const dateCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'date',
        header: isRTL ? 'التاريخ' : 'Date',
        sortKey: 'date',
        sortable: true,
        width: 'w-[85px]',
        cell: (row) => (
            <div className="flex items-center gap-1">
                <span className="text-xs">{ENTRY_TYPE_ICONS[row.type] || '📋'}</span>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                    {row.date}
                </span>
            </div>
        ),
    };

    const referenceCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'reference',
        header: isRTL ? 'المرجع' : 'Ref',
        width: 'w-[55px]',
        cell: (row) => {
            // Abbreviate long reference: "JE-17713680391085-3873" → "...3873"
            const ref = row.entryNumber || '';
            const short = ref.length > 8 ? '...' + ref.slice(-4) : ref;
            return (
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400" title={ref}>
                    {short}
                </span>
            );
        },
    };

    const descriptionCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'description',
        header: isRTL ? 'البيان' : 'Description',
        width: 'min-w-[120px]',
        cell: (row) => (
            <p className="text-xs text-gray-800 dark:text-gray-200">
                {row.description || '-'}
            </p>
        ),
    };

    const counterAccountCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'counterAccount',
        header: isRTL ? 'الحساب المقابل' : 'Counter Acct',
        width: 'w-[100px]',
        cell: (row) => {
            const ca = row.counterAccount;
            if (!ca || ca.otherLinesCount === 0) {
                return <span className="text-xs text-gray-300">-</span>;
            }
            if (ca.otherLinesCount === 1) {
                return (
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                            {ca.accountCode}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[80px]">
                            {isRTL ? ca.accountNameAr : (ca.accountNameEn || ca.accountNameAr)}
                        </span>
                    </div>
                );
            }
            return (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-full">
                    {isRTL ? `متعددة (${ca.otherLinesCount})` : `Multiple (${ca.otherLinesCount})`}
                </span>
            );
        },
    };

    const debitCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'debit',
        header: isRTL ? 'مدين' : 'Debit',
        align: 'end',
        width: 'w-[85px]',
        sortKey: 'debit',
        sortable: true,
        cell: (row) => (
            row.debit > 0 ? (
                <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatNumber(row.debit)}
                </span>
            ) : (
                <span className="text-gray-300 dark:text-gray-600">-</span>
            )
        ),
    };

    const creditCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'credit',
        header: isRTL ? 'دائن' : 'Credit',
        align: 'end',
        width: 'w-[85px]',
        sortKey: 'credit',
        sortable: true,
        cell: (row) => (
            row.credit > 0 ? (
                <span className="font-mono text-sm font-medium text-red-500 dark:text-red-400">
                    {formatNumber(row.credit)}
                </span>
            ) : (
                <span className="text-gray-300 dark:text-gray-600">-</span>
            )
        ),
    };

    const balanceCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'balance',
        header: isRTL ? 'الرصيد' : 'Balance',
        align: 'end',
        width: 'w-[90px]',
        cell: (row) => {
            const isPositive = row.balance >= 0;
            return (
                <span className={cn(
                    "font-mono text-sm font-bold",
                    isPositive
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                )}>
                    {formatNumber(Math.abs(row.balance))}
                    <span className="text-[9px] ms-0.5 opacity-60">
                        {isPositive ? (isRTL ? 'م' : 'D') : (isRTL ? 'د' : 'C')}
                    </span>
                </span>
            );
        },
    };

    const currencyCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'currency',
        header: isRTL ? 'العملة' : 'Cur',
        align: 'center',
        width: 'w-[50px]',
        cell: (row) => (
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {row.currency || '-'}
            </span>
        ),
    };

    const costCenterCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'costCenter',
        header: isRTL ? 'م.التكلفة' : 'CC',
        width: 'w-[70px]',
        cell: (row) => (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {row.costCenterName || '-'}
            </span>
        ),
    };

    // ═══ Columns — ordered for correct visual display ═══
    // With dir="rtl" on <table>, array[0] appears on the RIGHT side
    // RTL (right→left): # | مدين | دائن | الرصيد | التاريخ | المرجع | البيان | الحساب المقابل | العملة
    // LTR (left→right): Date | Ref | Description | Counter Acct | Debit | Credit | Balance | Currency
    const columns: NexaListColumn<ExtendedLedgerEntry>[] = useMemo(() =>
        isRTL
            ? [debitCol, creditCol, balanceCol, dateCol, referenceCol, descriptionCol, counterAccountCol, currencyCol]
            : [dateCol, referenceCol, descriptionCol, counterAccountCol, debitCol, creditCol, balanceCol, currencyCol],
        [isRTL]);

    // ═══ Row Accent (entry type color) ═══
    const getRowAccent = useCallback((row: ExtendedLedgerEntry) => {
        switch (row.type) {
            case 'receipt': return 'border-s-emerald-400';
            case 'payment': return 'border-s-red-400';
            case 'invoice': return 'border-s-amber-400';
            case 'transfer': return 'border-s-blue-400';
            default: return 'border-s-gray-300 dark:border-s-gray-600';
        }
    }, []);

    // ═══ Filters for NexaListTable ═══
    const nexaFilters = useMemo(() => {
        const f: any[] = [];

        // Movement filter
        f.push({
            id: 'movement',
            label: isRTL ? 'النوع' : 'Type',
            type: 'select' as const,
            value: movementFilter,
            onChange: (v: string) => setMovementFilter(v as MovementFilter),
            options: [
                { value: 'all', label: isRTL ? 'الكل' : 'All' },
                { value: 'debit', label: isRTL ? 'مدين فقط' : 'Debit Only' },
                { value: 'credit', label: isRTL ? 'دائن فقط' : 'Credit Only' },
            ],
        });

        // Entry type filter (Party mode only)
        if (partyMode) {
            f.push({
                id: 'entryType',
                label: isRTL ? 'المستند' : 'Document',
                type: 'select' as const,
                value: entryTypeFilter,
                onChange: (v: string) => setEntryTypeFilter(v as EntryTypeFilter),
                options: [
                    { value: 'all', label: isRTL ? 'الكل' : 'All' },
                    { value: 'invoices', label: isRTL ? '🧾 فواتير فقط' : '🧾 Invoices' },
                    { value: 'payments', label: isRTL ? '💰 دفعات فقط' : '💰 Payments' },
                ],
            });
        }

        // Monthly groups toggle
        f.push({
            id: 'monthlyGroup',
            label: isRTL ? 'تجميع شهري' : 'Monthly',
            type: 'select' as const,
            value: showMonthlyGroups ? 'on' : 'off',
            onChange: (v: string) => setShowMonthlyGroups(v === 'on'),
            options: [
                { value: 'on', label: isRTL ? 'مُفعّل' : 'On' },
                { value: 'off', label: isRTL ? 'مُعطّل' : 'Off' },
            ],
        });

        return f;
    }, [isRTL, movementFilter, showMonthlyGroups, partyMode, entryTypeFilter]);

    // ═══ Footer Content ═══
    const footerRight = useMemo(() => {
        if (!stats) return null;
        return (
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <span className="text-gray-400">{isRTL ? 'افتتاحي:' : 'Opening:'}</span>
                    <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">
                        {formatNumber(stats.openingBalance)}
                    </span>
                </div>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(stats.totalDebit)}
                    </span>
                </div>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <div className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-mono font-semibold text-red-500 dark:text-red-400">
                        {formatNumber(stats.totalCredit)}
                    </span>
                </div>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <div className="flex items-center gap-1">
                    <span className="text-gray-400">{isRTL ? 'الرصيد:' : 'Balance:'}</span>
                    <span className={cn(
                        "font-mono font-bold",
                        stats.currentBalance >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                    )}>
                        {formatNumber(Math.abs(stats.currentBalance))}
                        <span className="text-[10px] ms-0.5 opacity-60">
                            {stats.currentBalance >= 0 ? (isRTL ? 'م' : 'D') : (isRTL ? 'د' : 'C')}
                        </span>
                    </span>
                </div>
            </div>
        );
    }, [stats, isRTL]);

    return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto">
            {/* ═══ Summary Cards ═══ */}
            {stats && (
                <div className="grid grid-cols-4 gap-3">
                    <SummaryCard
                        label={isRTL ? 'عدد الحركات' : 'Transactions'}
                        value={stats.transactionCount.toString()}
                        icon={<Layers className="w-4 h-4" />}
                        color="indigo"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        label={isRTL ? 'مجموع المدين' : 'Total Debit'}
                        value={formatNumber(stats.totalDebit)}
                        icon={<TrendingUp className="w-4 h-4" />}
                        color="emerald"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        label={isRTL ? 'مجموع الدائن' : 'Total Credit'}
                        value={formatNumber(stats.totalCredit)}
                        icon={<TrendingDown className="w-4 h-4" />}
                        color="red"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        label={isRTL ? 'الرصيد الحالي' : 'Current Balance'}
                        value={formatNumber(Math.abs(stats.currentBalance))}
                        suffix={stats.currentBalance >= 0 ? (isRTL ? 'مدين' : 'Dr') : (isRTL ? 'دائن' : 'Cr')}
                        icon={<Minus className="w-4 h-4" />}
                        color={stats.currentBalance >= 0 ? 'emerald' : 'red'}
                        isRTL={isRTL}
                    />
                </div>
            )}

            {/* ═══ Quick Date Presets + View Mode Toggle ═══ */}
            <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {isRTL ? 'الفترة:' : 'Period:'}
                </span>
                {DATE_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => handlePresetClick(preset.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                            activePreset === preset.id
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700'
                        )}
                    >
                        {preset.icon}
                        {isRTL ? preset.label_ar : preset.label_en}
                    </button>
                ))}

                {/* ═══ View Mode Toggle (Party mode only) ═══ */}
                {partyMode && (
                    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ms-2">
                        <button
                            onClick={() => setViewMode('chronological')}
                            title={isRTL ? 'عرض زمني' : 'Chronological'}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'chronological'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            <ListOrdered className="w-3.5 h-3.5" />
                            {isRTL ? 'زمني' : 'Timeline'}
                        </button>
                        <button
                            onClick={() => setViewMode('grouped')}
                            title={isRTL ? 'تجميع الفواتير مع دفعاتها' : 'Group invoices with payments'}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'grouped'
                                    ? 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            {isRTL ? 'تجميع' : 'Grouped'}
                        </button>
                    </div>
                )}

                {/* Manual dates */}
                <div className="flex items-center gap-1.5 ms-auto">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            setActivePreset('all'); // custom = no preset active
                        }}
                        className="h-7 px-2 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-indigo-400"
                    />
                    <span className="text-[10px] text-gray-300">→</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            setActivePreset('all');
                        }}
                        className="h-7 px-2 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
            </div>

            {/* ═══ Error ═══ */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}

            {/* ═══ NexaListTable ═══ */}
            <NexaListTable<ExtendedLedgerEntry>
                data={displayEntries}
                columns={columns}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder={isRTL ? 'بحث في البيان أو رقم القيد أو الحساب المقابل...' : 'Search description, entry number, or counter account...'}
                totalCount={entries.length}
                countLabel={isRTL ? 'حركة' : 'entries'}
                filters={nexaFilters}
                hasActiveFilters={movementFilter !== 'all' || !showMonthlyGroups || (partyMode && viewMode !== 'chronological') || (partyMode && entryTypeFilter !== 'all')}
                onClearFilters={() => {
                    setMovementFilter('all');
                    setShowMonthlyGroups(true);
                    setViewMode('chronological');
                    setEntryTypeFilter('all');
                }}
                filtersLabel={isRTL ? 'فلاتر' : 'Filters'}
                clearFiltersLabel={isRTL ? 'مسح الفلاتر' : 'Clear All'}
                getRowAccent={getRowAccent}
                getRowKey={(row) => row.id}
                showRowNumbers={true}
                isLoading={loading}
                isRTL={isRTL}
                direction={direction}
                showFooter={true}
                footerLeftText={isRTL
                    ? `عرض ${displayEntries.length} من ${entries.length} حركة`
                    : `Showing ${displayEntries.length} of ${entries.length} entries`
                }
                footerRightContent={footerRight}
                // Expandable rows
                renderExpandedRow={(row) => (
                    renderExpandedRowOverride ? renderExpandedRowOverride(row) : (
                        <LedgerExpandedRow
                            entry={row}
                            currency={currency}
                            fetchEntryDetails={fetchEntryDetails}
                            onOpenEntry={onEntryOpen}
                        />
                    )
                )}
                // Marker
                enableMarker={true}
                className="min-h-[400px]"
            />
        </div>
    );
}

// ═══════════════════════════════════════════
// Summary Card Component
// ═══════════════════════════════════════════

function SummaryCard({
    label,
    value,
    suffix,
    icon,
    color,
    isRTL,
}: {
    label: string;
    value: string;
    suffix?: string;
    icon: React.ReactNode;
    color: 'indigo' | 'emerald' | 'red' | 'amber';
    isRTL: boolean;
}) {
    const colorMap = {
        indigo: 'from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/10 text-indigo-600 dark:text-indigo-400',
        emerald: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 text-emerald-600 dark:text-emerald-400',
        red: 'from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/10 text-red-600 dark:text-red-400',
        amber: 'from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className={cn(
            "bg-gradient-to-br rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-800",
            colorMap[color]
        )}>
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono">{value}</span>
                {suffix && <span className="text-[10px] opacity-60">{suffix}</span>}
            </div>
        </div>
    );
}

export default LedgerTab;
