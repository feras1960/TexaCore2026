/**
 * useLedgerData — هوك جلب بيانات كشف الحساب الحقيقية
 * 
 * يستخدم accountLedgerService لجلب الحركات من journal_entry_lines
 * ويحسب الرصيد التراكمي والمجاميع محلياً
 * 
 * يدعم: فلتر التواريخ + العملة + نوع الحركة + البحث
 * يدعم: تحويل العملات — الحركات بسعر الصرف وقت العملية، والرصيد بالسعر الحالي
 */

import { useState, useCallback, useMemo } from 'react';
import { accountLedgerService, LedgerEntry, AccountStats, LedgerFilters } from '@/services/accountLedgerService';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { CACHE_TIMES } from '@/engine/DataEngine';

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

    // ═══ React Query — cached ledger fetch ═══
    const queryKey = useMemo(() => [
        'account_ledger', accountId, companyId, dateFrom, dateTo, status, entryType, search
    ], [accountId, companyId, dateFrom, dateTo, status, entryType, search]);

    const {
        data: queryResult,
        isLoading: loading,
        error: queryError,
        refetch: queryRefetch,
    } = useCachedQuery({
        queryKey,
        queryFn: async () => {
            const filters: LedgerFilters = {
                accountId,
                companyId,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                status: status,
                entryType: entryType || undefined,
                search: search || undefined,
            };
            const result = await accountLedgerService.getLedger(filters);
            const enrichedEntries = await enrichWithCounterAccounts(result.entries, accountId);
            return { entries: enrichedEntries, stats: result.stats };
        },
        enabled: !!accountId && !!companyId && enabled,
        staleTime: CACHE_TIMES.DYNAMIC, // 5 min — refetch in background after
        gcTime: CACHE_TIMES.GC,         // 24 hours — keep in IndexedDB
    });

    const rawEntries = queryResult?.entries || [];
    const rawStats = queryResult?.stats || null;
    const error = queryError ? (queryError as Error).message : null;

    // ═══════════════════════════════════════════
    // Currency Conversion Logic — V3 (Smart FC Recovery)
    //
    // journal_entry_lines يخزّن حقلين لكل جانب:
    //   debit/credit     → المبلغ بالعملة الأساسية (UAH) — دائماً
    //   debit_fc/credit_fc → المبلغ بعملة المعاملة الأصلية (USD, EUR, etc)
    //
    // 🔑 القاعدة الأساسية:
    //   debit = debit_fc × exchange_rate
    //   لذلك: debit_fc = debit ÷ exchange_rate (عند عدم وجود fc)
    //
    // الحالات:
    //   1. المطلوب = العملة الأساسية → debit/credit مباشرة
    //   2. المطلوب = عملة المعاملة + FC موجود → debit_fc/credit_fc مباشرة
    //   3. المطلوب = عملة المعاملة + FC مفقود → استرجاع: debit ÷ exchange_rate
    //   4. المطلوب ≠ عملة المعاملة → FC × rate(عملة_المعاملة → المطلوب)
    // ═══════════════════════════════════════════

    // Determine if conversion is active
    const isConverted = !!(targetCurrency && lookupCurrentRate);
    const displayCurrency = targetCurrency || baseCurrency || '';

    // Helper: recover FC from base amount using exchange_rate
    const recoverFc = (baseAmount: number, exchangeRate: number): number => {
        if (!baseAmount || !exchangeRate || exchangeRate === 0) return baseAmount;
        return baseAmount / exchangeRate;
    };

    // Convert entries for display
    const entries: ExtendedLedgerEntry[] = useMemo(() => {
        if (!isConverted || !targetCurrency || !lookupCurrentRate) return rawEntries;

        let runningBalance = 0;

        return rawEntries.map(entry => {
            const entryCurrency = entry.currency || baseCurrency || '';
            const rate = entry.exchangeRate || 1;
            let convertedDebit: number;
            let convertedCredit: number;

            // ═══ Case 1: المطلوب = العملة الأساسية → عرض مباشر ═══
            if (targetCurrency === baseCurrency) {
                convertedDebit = entry.debit;
                convertedCredit = entry.credit;

            // ═══ Case 2+3: المطلوب = عملة المعاملة ═══
            } else if (entryCurrency === targetCurrency) {
                // Check if FC values are actually meaningful
                // debit_fc=0 && debit>0 means FC field wasn't populated correctly
                const hasValidDebitFc = entry.debitFc != null && (entry.debitFc > 0 || entry.debit === 0);
                const hasValidCreditFc = entry.creditFc != null && (entry.creditFc > 0 || entry.credit === 0);
                const hasValidFc = hasValidDebitFc || hasValidCreditFc;

                if (hasValidFc) {
                    // Case 2: FC موجود وصحيح → استخدم مباشرة
                    convertedDebit = hasValidDebitFc ? (entry.debitFc || 0) : 0;
                    convertedCredit = hasValidCreditFc ? (entry.creditFc || 0) : 0;
                } else if (rate > 1) {
                    // Case 3a: FC مفقود/صفر + سعر صرف > 1
                    // فحص: هل debit مخزّن بالعملة الأساسية (مضروب بالـ rate) أو بالعملة الأصلية؟
                    // قيود قديمة قد تخزّن المبلغ الأصلي في debit بدون ضربه بالـ rate
                    // إذا debit ÷ rate أقل بكثير من debit → المبلغ مضروب بالـ rate
                    // إذا debit ÷ rate صغير جداً → المبلغ مخزّن كعملة أصلية مباشرة
                    const recoveredDebit = recoverFc(entry.debit, rate);
                    const recoveredCredit = recoverFc(entry.credit, rate);
                    
                    // هيوريستيك: إذا المبلغ المسترجع منطقي (> 0.01) → استخدمه
                    // إذا المقسوم صغير جداً → المبلغ الأصلي مخزّن مباشرة في debit
                    if (recoveredDebit > 0.01 || recoveredCredit > 0.01) {
                        convertedDebit = recoveredDebit;
                        convertedCredit = recoveredCredit;
                    } else {
                        convertedDebit = entry.debit;
                        convertedCredit = entry.credit;
                    }
                } else {
                    // لا FC + لا سعر صرف حقيقي → المبلغ مخزّن بالعملة الأصلية مباشرة
                    convertedDebit = entry.debit;
                    convertedCredit = entry.credit;
                }

            // ═══ Case 4a: المعاملة بالعملة الأساسية → حوّل للمطلوب ═══
            } else if (entryCurrency === baseCurrency || !entryCurrency) {
                const convRate = lookupCurrentRate(baseCurrency || '', targetCurrency);
                convertedDebit = entry.debit * convRate;
                convertedCredit = entry.credit * convRate;

            // ═══ Case 4b: المعاملة بعملة ثالثة → استرجع FC ثم حوّل ═══
            } else {
                // Get FC amount (or recover from base ÷ rate)
                const fcDebit = entry.debitFc != null ? entry.debitFc : recoverFc(entry.debit, rate);
                const fcCredit = entry.creditFc != null ? entry.creditFc : recoverFc(entry.credit, rate);
                const convRate = lookupCurrentRate(entryCurrency, targetCurrency);
                convertedDebit = fcDebit * convRate;
                convertedCredit = fcCredit * convRate;
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
        refetch: () => queryRefetch(),
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

    // Collect unique journal entry IDs — chunk to avoid .in() overflow
    const entryIds = [...new Set(entries.map(e => e.entryId))];

    // Batch fetch in chunks of 250 (Supabase .in() limit ~300)
    const CHUNK_SIZE = 250;
    const allLines: any[] = [];
    for (let i = 0; i < entryIds.length; i += CHUNK_SIZE) {
        const chunk = entryIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkData, error: chunkError } = await supabase
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
            .in('entry_id', chunk);
        if (chunkError) {
            console.error('Error fetching counter accounts chunk:', chunkError);
        } else {
            allLines.push(...(chunkData || []));
        }
    }

    // (errors handled per-chunk above)

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
