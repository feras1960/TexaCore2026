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
import { queryClient } from '@/app/providers';

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
    detailLines?: EntryDetailLine[];
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
    // Currency Conversion Logic — V4 (Per-Line Rate)
    //
    // journal_entry_lines يخزّن لكل سطر:
    //   debit/credit       → المبلغ بالعملة الأساسية (UAH) — دائماً
    //   debit_fc/credit_fc → المبلغ بعملة المعاملة الأصلية (USD, EUR, etc)
    //   currency           → عملة المعاملة
    //   exchange_rate      → سعر الصرف وقت العملية (عملة_المعاملة → UAH)
    //
    // 🔑 القواعد:
    //   debit = debit_fc × exchange_rate
    //   لذلك: debit_fc = debit ÷ exchange_rate
    //
    // 🎯 منطق التحويل (بسيط وواضح — كما في الرشيد):
    //   1. المطلوب = العملة الأساسية → debit/credit مباشرة
    //   2. عملة السطر = المطلوب + سعر صرف حقيقي (> 1) → FC مباشرة أو debit/rate
    //   3. عملة السطر = أساسية (UAH) مع rate=1 → حوّل بالسعر الحالي
    //   4. عملة السطر ≠ المطلوب + rate > 1 → debit/rate (استرجاع FC) ثم حوّل
    //
    // ⚠️ ملاحظة حرجة:
    //   القيود بعملة UAH مع rate=1 → debit_fc/credit_fc مجرد نسخة من debit/credit
    //   يجب تجاهل FC تماماً في هذه الحالة واستخدام التحويل الحسابي
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
            const rate = entry.exchangeRate || 1;
            const hasRealRate = rate > 1; // سعر صرف حقيقي (ليس 1)
            let convertedDebit: number;
            let convertedCredit: number;

            // ═══ Case 1: المطلوب = العملة الأساسية → عرض مباشر ═══
            if (targetCurrency === baseCurrency) {
                convertedDebit = entry.debit;
                convertedCredit = entry.credit;

            // ═══ Case 2: عملة السطر = العملة المطلوبة + سعر صرف حقيقي ═══
            // مثال: السطر بالدولار + المطلوب دولار + rate=28.10
            // → استخدم debit_fc/credit_fc (المبلغ الحقيقي بالدولار)
            // → أو استرجع: debit ÷ rate
            } else if (entryCurrency === targetCurrency && hasRealRate) {
                // FC values exist and are meaningful (different from base)
                const hasRealDebitFc = entry.debitFc != null && entry.debitFc > 0;
                const hasRealCreditFc = entry.creditFc != null && entry.creditFc > 0;

                if (hasRealDebitFc || hasRealCreditFc) {
                    convertedDebit = hasRealDebitFc ? entry.debitFc! : 0;
                    convertedCredit = hasRealCreditFc ? entry.creditFc! : 0;
                } else {
                    // FC مفقود → استرجع من القيمة الأساسية: base ÷ rate
                    convertedDebit = entry.debit / rate;
                    convertedCredit = entry.credit / rate;
                }

            // ═══ Case 3: عملة السطر = العملة الأساسية (UAH) + سعر صرف حقيقي ═══
            // بعد الاستيراد المصحح: القيود بالغريفن تحمل:
            //   debit/credit = المبلغ بالغريفن (UAH)
            //   debit_fc/credit_fc = المعادل بالدولار (من MianTot في الرشيد)
            //   exchange_rate = سعر الصرف (UAH/USD وقت العملية)
            // مثال: credit=16420, credit_fc=600, rate=27.37
            //   → إذا المطلوب USD → credit_fc = 600 مباشرة ✓
            //   → إذا المطلوب EUR → credit_fc × lookupRate(USD, EUR)
            } else if (entryCurrency === baseCurrency && hasRealRate) {
                // FC هنا يمثل المعادل بالعملة الأجنبية (عادةً USD)
                const fcDebit = (entry.debitFc != null && entry.debitFc > 0) ? entry.debitFc : entry.debit / rate;
                const fcCredit = (entry.creditFc != null && entry.creditFc > 0) ? entry.creditFc : entry.credit / rate;
                
                // العملة الضمنية للـ FC: نحسبها من rate
                // rate = UAH/FC → FC currency هي العملة التي سعر صرفها = rate
                // في معظم الحالات هي USD (السعر الأجنبي الأساسي)
                // نحدد العملة الضمنية: إذا كان target هو نفس العملة → مباشرة
                // إذا لا → نحوّل من USD (الافتراضية) للمطلوب
                
                // تحقق: هل debit/rate ≈ debit_fc? إذا نعم → FC بالعملة المطلوبة
                // لتبسيط: نفترض أن FC للقيود بالغريفن دائماً USD
                const fcCurrency = 'USD'; // العملة الضمنية للمعادل الأجنبي
                
                if (targetCurrency === fcCurrency) {
                    // المطلوب = USD → FC مباشرة
                    convertedDebit = fcDebit;
                    convertedCredit = fcCredit;
                } else {
                    // المطلوب ≠ USD → حوّل FC من USD للمطلوب
                    const convRate = lookupCurrentRate(fcCurrency, targetCurrency);
                    convertedDebit = fcDebit * convRate;
                    convertedCredit = fcCredit * convRate;
                }

            // ═══ Case 4: عملة السطر ≠ المطلوبة ≠ الأساسية + سعر صرف حقيقي ═══
            // مثال: السطر بالدولار + المطلوب يورو + rate=28.10
            // → أولاً نسترجع المبلغ بعملة السطر (FC أو base÷rate)
            // → ثم نحوّل من عملة السطر للمطلوبة بالسعر الحالي
            } else if (hasRealRate) {
                const fcDebit = (entry.debitFc != null && entry.debitFc > 0) ? entry.debitFc : entry.debit / rate;
                const fcCredit = (entry.creditFc != null && entry.creditFc > 0) ? entry.creditFc : entry.credit / rate;
                const convRate = lookupCurrentRate(entryCurrency, targetCurrency);
                convertedDebit = fcDebit * convRate;
                convertedCredit = fcCredit * convRate;


            // ═══ Case 5a: لا سعر صرف حقيقي (rate=1) لكن FC موجود ═══
            // مثال: فاتورة مشتريات بـ UAH مع credit_fc=48.75 و rate=1
            // → FC يمثل المبلغ الحقيقي بالعملة الأجنبية (USD عادةً)
            // → استخدم FC مباشرة بدلاً من التحويل الخاطئ
            } else if (!hasRealRate && (
                (entry.debitFc != null && entry.debitFc > 0) || 
                (entry.creditFc != null && entry.creditFc > 0)
            )) {
                const fcDebit = (entry.debitFc != null && entry.debitFc > 0) ? entry.debitFc : 0;
                const fcCredit = (entry.creditFc != null && entry.creditFc > 0) ? entry.creditFc : 0;
                const fcCurrency = 'USD'; // FC للقيود المحلية = معادل بالدولار عادةً
                
                if (targetCurrency === fcCurrency) {
                    convertedDebit = fcDebit;
                    convertedCredit = fcCredit;
                } else {
                    const convRate = lookupCurrentRate(fcCurrency, targetCurrency);
                    convertedDebit = fcDebit * convRate;
                    convertedCredit = fcCredit * convRate;
                }

            // ═══ Case 5b: لا سعر صرف حقيقي (rate = 1) ولا FC ═══
            // عملة محلية بدون أي معادل أجنبي مخزّن
            // → حوّل من العملة الأساسية بالسعر الحالي
            } else {
                const convRate = lookupCurrentRate(baseCurrency || 'UAH', targetCurrency);
                convertedDebit = entry.debit * convRate;
                convertedCredit = entry.credit * convRate;
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

export async function enrichWithCounterAccounts(
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
                line_number,
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
        journalLines.sort((a, b) => (a.line_number || 0) - (b.line_number || 0));

        const detailLines: EntryDetailLine[] = journalLines.map((line: any) => ({
            id: line.id,
            accountId: line.account_id,
            accountCode: line.chart_of_accounts?.account_code || '',
            accountNameAr: line.chart_of_accounts?.name_ar || '',
            accountNameEn: line.chart_of_accounts?.name_en || '',
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description || '',
            isCurrentAccount: line.account_id === currentAccountId,
        }));

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
            detailLines,
        };
    });
}

export default useLedgerData;
