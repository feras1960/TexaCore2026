/**
 * useLedgerData — هوك جلب بيانات كشف الحساب الحقيقية
 * 
 * يستخدم accountLedgerService لجلب الحركات من journal_entry_lines
 * ويحسب الرصيد التراكمي والمجاميع محلياً
 * 
 * يدعم: فلتر التواريخ + العملة + نوع الحركة + البحث
 * يدعم: تحويل العملات — الحركات بسعر الصرف وقت العملية، والرصيد بالسعر الحالي
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { accountLedgerService, LedgerEntry, AccountStats, LedgerFilters } from '@/services/accountLedgerService';
import { supabase } from '@/lib/supabase';

// ═══ Counter Account Info ═══
export interface CounterAccountInfo {
    accountId: string | null;
    accountCode: string | null;
    accountNameAr: string | null;
    accountNameEn: string | null;
    otherLinesCount: number; // عدد الأطراف الأخرى (0 = لا يوجد حساب مقابل)
}

// ═══ Extended Ledger Entry with Counter Account ═══
export interface ExtendedLedgerEntry extends LedgerEntry {
    counterAccount: CounterAccountInfo;
    // Original values (before currency conversion)
    _originalDebit?: number;
    _originalCredit?: number;
    _originalBalance?: number;
    _originalCurrency?: string;
}

// ═══ Entry Detail Line (for expanded row) ═══
export interface EntryDetailLine {
    id: string;
    accountId: string;
    accountCode: string;
    accountNameAr: string;
    accountNameEn: string;
    debit: number;
    credit: number;
    description: string;
    isCurrentAccount: boolean; // هل هذا هو الحساب الحالي؟
}

// ═══ Hook Props ═══
export interface UseLedgerDataProps {
    accountId: string;
    companyId: string;
    enabled?: boolean; // لتأخير الجلب حتى يكون التبويب مفعّل
    /** العملة المستهدفة لتحويل كشف الحساب إليها */
    targetCurrency?: string;
    /** العملة الأساسية للشركة */
    baseCurrency?: string;
    /** دالة البحث عن سعر الصرف الحالي */
    lookupCurrentRate?: (fromCurrency: string, toCurrency: string) => number;
}

// ═══ Hook Return ═══
export interface UseLedgerDataReturn {
    // Data
    entries: ExtendedLedgerEntry[];
    stats: AccountStats | null;
    loading: boolean;
    error: string | null;
    // Filters
    filters: {
        dateFrom: string;
        dateTo: string;
        currency: string;
        status: 'all' | 'posted' | 'draft';
        entryType: string;
        search: string;
    };
    setDateFrom: (date: string) => void;
    setDateTo: (date: string) => void;
    setCurrency: (currency: string) => void;
    setStatus: (status: 'all' | 'posted' | 'draft') => void;
    setEntryType: (type: string) => void;
    setSearch: (search: string) => void;
    // Quick date presets
    setDatePreset: (preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') => void;
    // Actions
    refetch: () => void;
    // Expanded row detail fetching
    fetchEntryDetails: (journalEntryId: string) => Promise<EntryDetailLine[]>;
    /** هل كشف الحساب محوّل لعملة مختلفة؟ */
    isConverted: boolean;
    /** العملة الحالية المعروضة */
    displayCurrency: string;
}

export function useLedgerData({
    accountId,
    companyId,
    enabled = true,
    targetCurrency,
    baseCurrency,
    lookupCurrentRate,
}: UseLedgerDataProps): UseLedgerDataReturn {

    // ═══ State ═══
    const [rawEntries, setRawEntries] = useState<ExtendedLedgerEntry[]>([]);
    const [rawStats, setRawStats] = useState<AccountStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ═══ Filter State ═══
    // افتراضياً: كل الفترات + كل الحالات لعرض كل الحركات
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currency, setCurrency] = useState('');
    const [status, setStatus] = useState<'all' | 'posted' | 'draft'>('posted');

    const [entryType, setEntryType] = useState('');
    const [search, setSearch] = useState('');

    // ═══ Quick Date Presets ═══
    const setDatePreset = useCallback((preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        switch (preset) {
            case 'today':
                setDateFrom(today);
                setDateTo(today);
                break;
            case 'week': {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setDateFrom(weekAgo.toISOString().split('T')[0]);
                setDateTo(today);
                break;
            }
            case 'month': {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                setDateFrom(monthStart.toISOString().split('T')[0]);
                setDateTo(today);
                break;
            }
            case 'quarter': {
                const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                setDateFrom(quarterStart.toISOString().split('T')[0]);
                setDateTo(today);
                break;
            }
            case 'year': {
                const yearStart = new Date(now.getFullYear(), 0, 1);
                setDateFrom(yearStart.toISOString().split('T')[0]);
                setDateTo(today);
                break;
            }
            case 'all':
                setDateFrom('');
                setDateTo('');
                break;
        }
    }, []);

    // ═══ Reset on Account Change ═══
    useEffect(() => {
        setRawEntries([]);
        setRawStats(null);
    }, [accountId]);

    // ═══ Fetch Ledger Data ═══
    const fetchData = useCallback(async (currentAccountId: string) => {
        if (!currentAccountId || !enabled) return;

        setLoading(true);
        setError(null);

        try {
            const filters: LedgerFilters = {
                accountId: currentAccountId,
                companyId,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                // Don't filter by currency at query level — fetch all and convert client-side
                status: status,
                entryType: entryType || undefined,
                search: search || undefined,
            };

            const result = await accountLedgerService.getLedger(filters);

            // Enrich entries with counter account info
            const enrichedEntries = await enrichWithCounterAccounts(result.entries, currentAccountId);

            setRawEntries(enrichedEntries);
            setRawStats(result.stats);
        } catch (err: any) {
            console.error('[LedgerTab] Error fetching ledger data:', err);
            setError(err?.message || 'Error fetching ledger data');
        } finally {
            setLoading(false);
        }
    }, [companyId, enabled, dateFrom, dateTo, status, entryType, search]);

    // ═══ Auto-fetch on filter change ═══
    useEffect(() => {
        let active = true;

        const loadData = async () => {
            if (!accountId || !enabled) return;
            setLoading(true);
            setError(null);
            try {
                const filters: LedgerFilters = {
                    accountId,
                    companyId,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    // Don't filter by currency at query level
                    status: status,
                    entryType: entryType || undefined,
                    search: search || undefined,
                };
                const result = await accountLedgerService.getLedger(filters);
                const enrichedEntries = await enrichWithCounterAccounts(result.entries, accountId);

                if (active) {
                    setRawEntries(enrichedEntries);
                    setRawStats(result.stats);
                }
            } catch (err: any) {
                if (active) setError(err?.message || 'Error fetching ledger data');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadData();

        return () => { active = false; };
    }, [accountId, companyId, enabled, dateFrom, dateTo, status, entryType, search]);

    // ═══════════════════════════════════════════
    // Currency Conversion Logic — V2 (debit_fc/credit_fc aware)
    //
    // journal_entry_lines يخزّن حقلين لكل جانب:
    //   debit/credit     → المبلغ بالعملة الأساسية (UAH) — دائماً
    //   debit_fc/credit_fc → المبلغ بعملة المعاملة الأصلية (USD, EUR, etc)
    //
    // عند اختيار عملة مستهدفة:
    //   - إذا العملة = عملة المعاملة الأصلية وfC موجود → نعرض debit_fc/credit_fc مباشرة
    //   - إذا العملة مختلفة → نحوّل debit_fc (أو debit) × rate
    //   - إذا العملة = العملة الأساسية → نعرض debit/credit بدون تحويل
    // ═══════════════════════════════════════════

    // Determine if conversion is active
    const isConverted = !!(targetCurrency && lookupCurrentRate);
    const displayCurrency = targetCurrency || baseCurrency || '';

    // Convert entries for display
    const entries: ExtendedLedgerEntry[] = useMemo(() => {
        if (!isConverted || !targetCurrency || !lookupCurrentRate) return rawEntries;

        let runningBalance = 0;

        return rawEntries.map(entry => {
            const entryCurrency = entry.currency || baseCurrency || '';
            let convertedDebit: number;
            let convertedCredit: number;

            if (entryCurrency === targetCurrency) {
                // ═══ العملة المطلوبة = عملة المعاملة الأصلية ═══
                // استخدم debitFc/creditFc مباشرة (هذه هي المبالغ بالعملة الأصلية)
                // مثال: دفعنا 1000 USD → debitFc=1000, debit=43890 → نعرض 1000
                if (entry.debitFc != null || entry.creditFc != null) {
                    convertedDebit = entry.debitFc || 0;
                    convertedCredit = entry.creditFc || 0;
                } else {
                    // لا يوجد fc → المعاملة بالعملة الأساسية نفسها
                    convertedDebit = entry.debit;
                    convertedCredit = entry.credit;
                }
            } else if (entryCurrency === baseCurrency || !entryCurrency) {
                // ═══ المعاملة بالعملة الأساسية → حوّل للعملة المطلوبة ═══
                const rate = lookupCurrentRate(baseCurrency || '', targetCurrency);
                convertedDebit = entry.debit * rate;
                convertedCredit = entry.credit * rate;
            } else {
                // ═══ المعاملة بعملة مختلفة عن المطلوبة وعن الأساسية ═══
                // حوّل من العملة الأصلية (fc) إلى العملة المطلوبة
                const fcDebit = entry.debitFc != null ? entry.debitFc : entry.debit;
                const fcCredit = entry.creditFc != null ? entry.creditFc : entry.credit;
                const rate = lookupCurrentRate(entryCurrency, targetCurrency);
                convertedDebit = fcDebit * rate;
                convertedCredit = fcCredit * rate;
            }

            // Recalculate running balance with converted amounts
            runningBalance = runningBalance + convertedDebit - convertedCredit;

            return {
                ...entry,
                debit: Math.round(convertedDebit * 100) / 100,
                credit: Math.round(convertedCredit * 100) / 100,
                balance: Math.round(runningBalance * 100) / 100,
                // Keep original values for reference
                _originalDebit: entry.debit,
                _originalCredit: entry.credit,
                _originalBalance: entry.balance,
                _originalCurrency: entry.currency,
            };
        });
    }, [rawEntries, isConverted, targetCurrency, baseCurrency, lookupCurrentRate]);

    // Convert stats for display
    const stats: AccountStats | null = useMemo(() => {
        if (!rawStats) return null;
        if (!isConverted || !targetCurrency || !lookupCurrentRate) return rawStats;

        // IMPORTANT: Compute stats from the CONVERTED entries, NOT from rawStats × rate
        // rawStats.currentBalance mixes currencies (e.g., 17500 USD + 87560 UAH = 105060)
        // which can't be converted by a single rate
        const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
        const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
        const currentBalance = totalDebit - totalCredit;

        return {
            ...rawStats,
            totalDebit: Math.round(totalDebit * 100) / 100,
            totalCredit: Math.round(totalCredit * 100) / 100,
            currentBalance: Math.round(currentBalance * 100) / 100,
            openingBalance: 0, // Opening balance is folded into running balance
            periodDebit: Math.round(totalDebit * 100) / 100,
            periodCredit: Math.round(totalCredit * 100) / 100,
        };
    }, [rawStats, entries, isConverted, targetCurrency, lookupCurrentRate]);

    // ═══ Fetch Entry Details (for expanded row — lazy) ═══
    const fetchEntryDetails = useCallback(async (journalEntryId: string): Promise<EntryDetailLine[]> => {
        try {
            const { data, error } = await supabase
                .from('journal_entry_lines')
                .select(`
                    id,
                    account_id,
                    debit,
                    credit,
                    description,
                    chart_of_accounts (
                        id,
                        account_code,
                        name_ar,
                        name_en
                    )
                `)
                .eq('entry_id', journalEntryId)
                .order('line_number', { ascending: true });

            if (error) throw error;

            return (data || []).map((line: any) => ({
                id: line.id,
                accountId: line.account_id,
                accountCode: line.chart_of_accounts?.account_code || '',
                accountNameAr: line.chart_of_accounts?.name_ar || '',
                accountNameEn: line.chart_of_accounts?.name_en || '',
                debit: line.debit || 0,
                credit: line.credit || 0,
                description: line.description || '',
                isCurrentAccount: line.account_id === accountId,
            }));
        } catch (err) {
            console.error('Error fetching entry details:', err);
            return [];
        }
    }, [accountId]);

    return {
        entries,
        stats,
        loading,
        error,
        filters: { dateFrom, dateTo, currency, status, entryType, search },
        setDateFrom,
        setDateTo,
        setCurrency,
        setStatus,
        setEntryType,
        setSearch,
        setDatePreset,
        refetch: () => fetchData(accountId),
        fetchEntryDetails,
        isConverted,
        displayCurrency,
    };
}

// ═══════════════════════════════════════════
// Helper: Enrich entries with counter account info
// ═══════════════════════════════════════════

async function enrichWithCounterAccounts(
    entries: LedgerEntry[],
    currentAccountId: string
): Promise<ExtendedLedgerEntry[]> {
    if (entries.length === 0) return [];

    // Collect unique journal entry IDs
    const entryIds = [...new Set(entries.map(e => e.entryId))];

    // Batch fetch all lines for these journal entries
    const { data: allLines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
            id,
            entry_id,
            account_id,
            chart_of_accounts (
                account_code,
                name_ar,
                name_en
            )
        `)
        .in('entry_id', entryIds);

    if (error) {
        console.error('Error fetching counter accounts:', error);
        // Return entries without counter account info
        return entries.map(e => ({
            ...e,
            counterAccount: {
                accountId: null,
                accountCode: null,
                accountNameAr: null,
                accountNameEn: null,
                otherLinesCount: 0,
            },
        }));
    }

    // Group lines by entry_id
    const linesByEntry = new Map<string, any[]>();
    (allLines || []).forEach((line: any) => {
        const key = line.entry_id;
        if (!linesByEntry.has(key)) linesByEntry.set(key, []);
        linesByEntry.get(key)!.push(line);
    });

    // Enrich each entry
    return entries.map(entry => {
        const journalLines = linesByEntry.get(entry.entryId) || [];
        const otherLines = journalLines.filter(l => l.account_id !== currentAccountId);
        const otherLinesCount = otherLines.length;

        let counterAccount: CounterAccountInfo;
        if (otherLinesCount === 1) {
            // قيد ثنائي — نعرض الحساب المقابل مباشرة
            const counter = otherLines[0];
            counterAccount = {
                accountId: counter.account_id,
                accountCode: counter.chart_of_accounts?.account_code || null,
                accountNameAr: counter.chart_of_accounts?.name_ar || null,
                accountNameEn: counter.chart_of_accounts?.name_en || null,
                otherLinesCount,
            };
        } else if (otherLinesCount > 1) {
            // قيد متعدد — نعرض أول حساب مع عدد الحسابات
            const first = otherLines[0];
            counterAccount = {
                accountId: first.account_id,
                accountCode: first.chart_of_accounts?.account_code || null,
                accountNameAr: first.chart_of_accounts?.name_ar || null,
                accountNameEn: first.chart_of_accounts?.name_en || null,
                otherLinesCount,
            };
        } else {
            // لا يوجد حساب مقابل (حالة نادرة)
            counterAccount = {
                accountId: null,
                accountCode: null,
                accountNameAr: null,
                accountNameEn: null,
                otherLinesCount: 0,
            };
        }

        return {
            ...entry,
            counterAccount,
        };
    });
}

export default useLedgerData;
