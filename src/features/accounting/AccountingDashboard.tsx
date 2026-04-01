/**
 * ════════════════════════════════════════════════════════════════
 * 🧮 AccountingDashboard — لوحة المحاسبة (Glass Design)
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Same Glass pattern as PurchasesDashboard
 *   - Header gradient (navy → teal)
 *   - 8 KPI glass cards
 *   - Revenue vs Expense chart
 *   - Recent journal entries + Top accounts
 *   - QuickActionsBar integration
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, CURRENCY_META, getCurrencySymbol } from '@/hooks/useCompanyCurrency';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsGrid, StatCard } from '@/components/shared/stats/StatCard';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfDay, startOfYear, format, subMonths, subYears } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import ReactECharts from 'echarts-for-react';
import { SafeChartContainer } from '@/components/ui/SafeChartContainer';
import {
  Calculator, TrendingUp, TrendingDown, Wallet, FileText, Clock,
  ArrowDownRight, ArrowUpRight, RefreshCw, Calendar, BarChart3,
  BookOpen, Coins, DollarSign, CreditCard, Star, Loader2, BadgeDollarSign,
  Lock, Eye, EyeOff, ShieldCheck, KeyRound,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import QuickActionsBar from './components/QuickActionsBar';
import { Input } from '@/components/ui/input';

// ═════════════════════════════════════════════════════════════════
export default function AccountingDashboard() {
  const { t, language, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isAr = language === 'ar';
  const isRTL = direction === 'rtl';
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency, currencySymbol: baseSymbol } = useCompanyCurrency(language as 'ar' | 'en');
  const { lookupRate, isLoading: ratesLoading } = useExchangeRateLookup();
  const { user } = useAuth();

  // Password-protected profit section
  const [profitUnlocked, setProfitUnlocked] = useState(false);
  const [profitPassword, setProfitPassword] = useState('');
  const [profitPasswordError, setProfitPasswordError] = useState('');
  const [profitPasswordLoading, setProfitPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoLockCountdown, setAutoLockCountdown] = useState(0);
  const autoLockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const AUTO_LOCK_SECONDS = 180; // 3 minutes

  // ─── Auto-lock: Timer + Page Visibility ─────────────────────
  useEffect(() => {
    if (!profitUnlocked) {
      if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current);
      setAutoLockCountdown(0);
      return;
    }
    setAutoLockCountdown(AUTO_LOCK_SECONDS);
    autoLockTimerRef.current = setInterval(() => {
      setAutoLockCountdown(prev => {
        if (prev <= 1) {
          setProfitUnlocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current); };
  }, [profitUnlocked]);

  // Auto-lock when tab becomes hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && profitUnlocked) {
        setProfitUnlocked(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [profitUnlocked]);

  // Currency filter with localStorage
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try { return localStorage.getItem('acct_dashboard_currency') || 'all'; } catch { return 'all'; }
  });

  const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
  const sym = getCurrencySymbol(displayCurrency);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    try {
      const saved = localStorage.getItem('acct_dashboard_daterange');
      if (saved) {
        const p = JSON.parse(saved);
        return { from: p.from ? new Date(p.from) : startOfMonth(new Date()), to: p.to ? new Date(p.to) : new Date() };
      }
    } catch { }
    return { from: startOfMonth(new Date()), to: new Date() };
  });

  useEffect(() => {
    try { localStorage.setItem('acct_dashboard_daterange', JSON.stringify({ from: dateRange?.from?.toISOString(), to: dateRange?.to?.toISOString() })); } catch {}
  }, [dateRange]);

  useEffect(() => {
    try { localStorage.setItem('acct_dashboard_currency', selectedCurrency); } catch {}
  }, [selectedCurrency]);

  const [isLive, setIsLive] = useState(false);

  // Stable date strings for queryKey (prevents infinite re-renders)
  const fromDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const toDateStr = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  // ═══ React Query: Fetch ALL dashboard data in one query ═══
  const { data: rawData, isLoading: loading } = useCachedQuery({
    queryKey: ['accounting', 'dashboard', companyId, fromDateStr, toDateStr],
    queryFn: async () => {
      if (!companyId) return null;

      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');

      const [settingsRes, entriesRes, linesRes, accountsRes] = await Promise.all([
        supabase
          .from('company_accounting_settings')
          .select('supported_currencies, base_currency')
          .eq('company_id', companyId)
          .single(),
        supabase
          .from('journal_entries')
          .select('id, entry_number, description, total_debit, total_credit, status, entry_date')
          .eq('company_id', companyId)
          .gte('entry_date', fromDateStr)
          .lte('entry_date', toDateStr)
          .order('entry_date', { ascending: false }),
        supabase
          .from('journal_entry_lines')
          .select('debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)')
          .eq('journal_entries.company_id', companyId)
          .eq('journal_entries.status', 'posted')
          .gte('journal_entries.entry_date', sixMonthsAgo)
          .lte('journal_entries.entry_date', toDateStr),
        supabase
          .from('chart_of_accounts')
          .select('id, account_type_id, is_group')
          .eq('company_id', companyId),
      ]);

      return {
        currencies: settingsRes.data?.supported_currencies || [],
        entries: entriesRes.data || [],
        lines: linesRes.data || [],
        accounts: accountsRes.data || [],
        yearStart,
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 24 * 60 * 60 * 1000,    // 24 hours (for persistence)
  });

  // ═══ Compute KPIs from raw data (useMemo, no useState!) ═══
  const {
    availableCurrencies, totalRevenue, totalExpenses, netProfit,
    totalReceipts, totalPayments, journalCount, draftCount, postedCount,
    unpostedCount, accountsCount, cashBalance, receivables, payables,
    monthly, recentEntries,
  } = useMemo(() => {
    const defaults = {
      availableCurrencies: [] as string[],
      totalRevenue: 0, totalExpenses: 0, netProfit: 0,
      totalReceipts: 0, totalPayments: 0,
      journalCount: 0, draftCount: 0, postedCount: 0, unpostedCount: 0,
      accountsCount: 0, cashBalance: 0, receivables: 0, payables: 0,
      monthly: [] as { label: string; revenue: number; expenses: number }[],
      recentEntries: [] as { id: string; entry_number: string; description: string; total_debit: number; status: string; entry_date: string }[],
    };
    if (!rawData) return defaults;

    const { currencies, entries, lines, accounts, yearStart } = rawData;

    // Entries KPIs
    const posted = entries.filter((e: any) => e.status === 'posted').length;
    const draft = entries.filter((e: any) => e.status === 'draft').length;
    const totalDebit = entries.reduce((s: number, e: any) => s + Number(e.total_debit || 0), 0);
    const recent = entries.slice(0, 8).map((e: any) => ({
      id: e.id,
      entry_number: e.entry_number || '-',
      description: e.description || '',
      total_debit: Number(e.total_debit || 0),
      status: e.status || 'draft',
      entry_date: e.entry_date,
    }));

    // Account type sets
    const revenueIds = new Set(accounts.filter((a: any) => a.account_type_id === 4).map((a: any) => a.id));
    const expenseIds = new Set(accounts.filter((a: any) => a.account_type_id === 5).map((a: any) => a.id));
    const cashIds = new Set(accounts.filter((a: any) => a.account_type_id === 1).map((a: any) => a.id));
    const recvIds = new Set(accounts.filter((a: any) => a.account_type_id === 2).map((a: any) => a.id));
    const payIds = new Set(accounts.filter((a: any) => a.account_type_id === 3).map((a: any) => a.id));

    let rev = 0, exp = 0, cash = 0, recv = 0, pay = 0;
    lines.forEach((l: any) => {
      const entryDate = l.journal_entries?.entry_date;
      if (!entryDate || entryDate < yearStart) return;
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      if (revenueIds.has(l.account_id)) rev += credit - debit;
      if (expenseIds.has(l.account_id)) exp += debit - credit;
      if (cashIds.has(l.account_id)) cash += debit - credit;
      if (recvIds.has(l.account_id)) recv += debit - credit;
      if (payIds.has(l.account_id)) pay += credit - debit;
    });

    // Monthly chart
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      monthlyMap.set(format(d, 'yyyy-MM'), { revenue: 0, expenses: 0 });
    }
    lines.forEach((l: any) => {
      const entryDate = l.journal_entries?.entry_date;
      if (!entryDate) return;
      const bucket = monthlyMap.get(entryDate.substring(0, 7));
      if (!bucket) return;
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      if (revenueIds.has(l.account_id)) bucket.revenue += credit - debit;
      if (expenseIds.has(l.account_id)) bucket.expenses += debit - credit;
    });
    const monthlyData: { label: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      const label = new Intl.DateTimeFormat(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short' }).format(d);
      const bucket = monthlyMap.get(key) || { revenue: 0, expenses: 0 };
      monthlyData.push({ label, revenue: Math.abs(bucket.revenue), expenses: Math.abs(bucket.expenses) });
    }

    return {
      availableCurrencies: currencies,
      totalRevenue: Math.abs(rev), totalExpenses: Math.abs(exp), netProfit: rev - exp,
      totalReceipts: totalDebit, totalPayments: exp,
      journalCount: entries.length, draftCount: draft, postedCount: posted,
      unpostedCount: entries.length - posted - draft,
      accountsCount: accounts.filter((a: any) => !a.is_group).length,
      cashBalance: cash, receivables: recv > 0 ? recv : 0, payables: pay > 0 ? pay : 0,
      monthly: monthlyData, recentEntries: recent,
    };
  }, [rawData, isAr]);

  // ═══ Realtime: invalidate query instead of fetching directly ═══
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('acct-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter: `company_id=eq.${companyId}` }, () => {
        setIsLive(true);
        queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, queryClient]);

  // fetchData wrapper for manual refresh button
  const fetchData = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard'] });
  }, [queryClient]);

  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

  // Status color
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      posted: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      posted: { ar: 'مرحّل', en: 'Posted' },
      cancelled: { ar: 'ملغى', en: 'Cancelled' },
    };
    return t(`common.statuses.${status}`) || status;
  };

  // ─── Chart Options ───────────────────────────────────────────
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const mainChartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      textStyle: { color: isDark ? '#f9fafb' : '#111827', fontSize: 12 },
      axisPointer: { type: 'cross', label: { backgroundColor: isDark ? '#374151' : '#f3f4f6' } },
      formatter: function (params: any) {
        if (!params || !params.length) return '';
        let res = `<div style="margin-bottom: 4px; font-weight: bold; font-family: sans-serif;">${params[0].axisValue}</div>`;
        params.forEach(function (item: any) {
          res += `
            <div style="display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-top: 4px;">
              <span><span style="display:inline-block;margin-right:4px;border-radius:50%;width:8px;height:8px;background-color:${item.color};"></span>${item.seriesName}</span>
              <span style="font-weight:bold;font-family:monospace">${sym} ${Number(item.value).toLocaleString()}</span>
            </div>
          `;
        });
        return res;
      }
    },
    legend: {
      data: [isAr ? 'الإيرادات' : 'Revenue', isAr ? 'المصروفات' : 'Expenses'],
      textStyle: { color: textColor, fontSize: 12 },
      top: 0, right: isRTL ? 'auto' : 16, left: isRTL ? 16 : 'auto',
    },
    grid: { left: '2%', right: '2%', bottom: '2%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false,
      data: monthly.map(d => d.label),
      axisLabel: { color: textColor, fontSize: 11 },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: false },
      inverse: isRTL,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      axisLabel: { color: textColor, fontSize: 11, formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val },
    },
    series: [
      {
        name: isAr ? 'الإيرادات' : 'Revenue',
        type: 'line', smooth: 0.5,
        lineStyle: { width: 2.5, color: '#10b981' },
        symbol: 'circle', symbolSize: 6,
        itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.25)' }, { offset: 1, color: 'rgba(16,185,129,0.01)' }]
          }
        },
        data: monthly.map(d => d.revenue)
      },
      {
        name: isAr ? 'المصروفات' : 'Expenses',
        type: 'line', smooth: 0.5,
        lineStyle: { width: 2.5, color: '#f43f5e' },
        symbol: 'circle', symbolSize: 6,
        itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(244,63,94,0.2)' }, { offset: 1, color: 'rgba(244,63,94,0.01)' }]
          }
        },
        data: monthly.map(d => d.expenses)
      }
    ]
  }), [monthly, isDark, isAr, isRTL, textColor, gridColor, sym]);

  // ─── Loading ─────────────────────────────────────────────────
  if (loading && !recentEntries.length) {
    return (
      <div className="space-y-6" dir={direction}>
        <div className="bg-gradient-to-r from-erp-navy via-teal-800 to-erp-navy p-6 rounded-2xl animate-pulse h-28" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-72 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6" dir={direction}>
      {/* ─ Header — Glass Gradient (Navy → Teal) ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-teal-800 to-erp-navy p-6 rounded-2xl shadow-lg">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-erp-teal/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Calculator className="w-6 h-6 text-erp-teal" />
              </div>
              <h1 className="text-2xl font-bold text-white font-cairo">
                {t('accounting.dashboardTitle')}
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
            </div>
            <p className="text-sm text-teal-200/80 font-tajawal ps-12">
              {t('accounting.dashboardSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <DateRangePicker
              date={dateRange}
              setDate={setDateRange}
              className="w-full lg:w-auto [&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-white/20 [&_button]:text-white [&_button]:hover:bg-white/20"
              align="end"
            />
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-full lg:w-[175px] bg-white/10 backdrop-blur-sm h-10 text-sm border-white/20 text-white hover:bg-white/20 transition-colors">
                <Coins className="w-4 h-4 me-2 text-erp-teal" />
                <SelectValue placeholder={t('accounting.allCurrencies')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  🌍 {t('accounting.allConverted')}
                </SelectItem>
                {availableCurrencies.map(c => {
                  const m = CURRENCY_META[c];
                  return (
                    <SelectItem key={c} value={c}>
                      {m?.flag || '🏳️'} {isAr ? m?.nameAr : m?.nameEn} ({c})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="[&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-white/20 [&_button]:text-white [&_button]:hover:bg-white/20">
              <QuickActionsBar />
            </div>
          </div>
        </div>
      </div>

      {/* ─ KPIs Row 1 — Financial (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={t('accounting.revenue')}
          value={totalRevenue}
          type="positive"
          icon={TrendingUp}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('accounting.expenses')}
          value={totalExpenses}
          type="negative"
          icon={TrendingDown}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-red-50/80 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/20 backdrop-blur-sm border border-red-100/50 dark:border-red-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('accounting.accountsCount')}
          value={accountsCount}
          type="info"
          icon={BookOpen}
          className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('accounting.cashBalance')}
          value={cashBalance}
          type="info"
          icon={Wallet}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
        />
      </StatsGrid>

      {/* ─ KPIs Row 2 — Operational (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={t('accounting.journalEntries')}
          value={journalCount}
          type="neutral"
          icon={FileText}
          suffix={postedCount > 0 ? `(${postedCount} ${t('common.posted')})` : ''}
          className="bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/30 dark:to-gray-950/20 backdrop-blur-sm border border-slate-100/50 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('accounting.drafts')}
          value={draftCount}
          type="warning"
          icon={Clock}
          className="bg-gradient-to-br from-yellow-50/80 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/20 backdrop-blur-sm border border-yellow-100/50 dark:border-yellow-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('accounting.receivables')}
          value={receivables}
          type="info"
          icon={ArrowDownRight}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/30 dark:to-cyan-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('accounting.payables')}
          value={payables}
          type="negative"
          icon={ArrowUpRight}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 backdrop-blur-sm border border-orange-100/50 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all"
        />
      </StatsGrid>

      {/* ─ Charts Row (Glass) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses — 2 cols */}
        <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
            <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-erp-teal" />
              {t('accounting.revenueVsExpenses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <div className="w-full min-h-[280px]">
              {monthly.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-erp-teal border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ReactECharts 
                  option={mainChartOption} 
                  style={{ height: '320px', width: '100%' }} 
                  opts={{ renderer: 'canvas' }} 
                  notMerge={true} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats — 1 col */}
        <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
          <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
            <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-erp-teal" />
              {t('accounting.financialSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Accounts Count */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-100/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-tajawal text-gray-600 dark:text-gray-300">{t('accounting.accountsCount')}</span>
                <span className="text-lg font-mono font-bold text-indigo-600">
                  {accountsCount}
                </span>
              </div>
            </div>

            {/* Revenue */}
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-tajawal">{t('accounting.totalRevenue')}</span>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-600">{sym} {totalRevenue.toLocaleString()}</span>
            </div>

            {/* Expenses */}
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-tajawal">{t('accounting.totalExpenses')}</span>
              </div>
              <span className="font-mono text-sm font-bold text-red-600">{sym} {totalExpenses.toLocaleString()}</span>
            </div>

            {/* Accounts Count */}
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-tajawal">{t('accounting.accountsCount')}</span>
              </div>
              <span className="font-mono text-sm font-bold text-indigo-600">{accountsCount}</span>
            </div>

            {/* Receivables vs Payables */}
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-tajawal">{t('accounting.recvMinusPay')}</span>
              </div>
              <span className={cn("font-mono text-sm font-bold", (receivables - payables) >= 0 ? "text-emerald-600" : "text-red-600")}>
                {sym} {(receivables - payables).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─ Recent Journal Entries (Glass) ── */}
      <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
        <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
          <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-erp-teal" />
            {t('accounting.recentEntries')}
          </CardTitle>
          <Badge variant="secondary" className="text-[11px] font-mono bg-erp-teal/10 text-erp-teal border-0">
            {journalCount} {t('accounting.entries')}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
            {recentEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-tajawal">
                {t('accounting.noEntriesInPeriod')}
              </div>
            ) : (
              recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      entry.status === 'posted' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    )}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{entry.entry_number}</span>
                        <Badge className={cn("text-[10px] px-1.5 py-0 h-4 font-tajawal", getStatusBadge(entry.status))}>
                          {getStatusLabel(entry.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-tajawal truncate mt-0.5">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-end shrink-0 ms-4">
                    <p className="font-mono font-bold text-sm text-erp-navy dark:text-white">
                      {sym} {entry.total_debit.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {entry.entry_date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Password-Protected Profit & Loss Section ═══ */}
      <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
        <button
          onClick={() => {
            if (profitUnlocked) setProfitUnlocked(false);
          }}
          className={cn(
            "w-full p-5 flex items-center gap-4 border-b transition-colors cursor-default",
            profitUnlocked
              ? "bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-100/50 dark:border-emerald-800/30"
              : "bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-100/50 dark:border-amber-800/30 hover:from-amber-100/80 hover:to-orange-100/50"
          )}
        >
          <div className={cn(
            "p-2.5 rounded-xl shadow-sm",
            profitUnlocked
              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
              : "bg-gradient-to-br from-amber-500 to-orange-600"
          )}>
            {profitUnlocked ? <ShieldCheck className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 text-start">
            <h3 className={cn(
              "text-base font-bold font-cairo",
              profitUnlocked ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
            )}>
              {profitUnlocked
                ? (isAr ? '✅ تقرير الأرباح والخسائر' : '✅ Profit & Loss Report')
                : (isAr ? '🔒 تقرير الأرباح والخسائر' : '🔒 Profit & Loss Report')}
            </h3>
            <p className={cn(
              "text-xs mt-0.5",
              profitUnlocked ? "text-emerald-600/80 dark:text-emerald-400/70" : "text-amber-600/80 dark:text-amber-400/70"
            )}>
              {profitUnlocked
                ? (isAr ? 'اضغط لإعادة القفل — يُقفل تلقائياً عند مغادرة الصفحة' : 'Click to re-lock — auto-locks when you leave')
                : (isAr ? 'محمي بكلمة السر — يُقفل تلقائياً بعد 3 دقائق' : 'Password protected — auto-locks after 3 minutes')}
            </p>
          </div>
          {profitUnlocked && (
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {Math.floor(autoLockCountdown / 60)}:{String(autoLockCountdown % 60).padStart(2, '0')}
              </Badge>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 gap-1 cursor-pointer hover:bg-red-200 transition-colors" onClick={(e) => { e.stopPropagation(); setProfitUnlocked(false); }}>
                <Lock className="w-3 h-3" />
                {isAr ? 'قفل' : 'Lock'}
              </Badge>
            </div>
          )}
        </button>

        {!profitUnlocked ? (
          /* Password Entry */
          <div className="p-8 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="p-5 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20">
                <KeyRound className="w-10 h-10 text-amber-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-500 shadow">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-bold text-gray-700 dark:text-gray-300 font-cairo">
                {isAr ? 'التحقق من الهوية' : 'Identity Verification'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal mt-1 max-w-sm">
                {isAr
                  ? 'ادخل كلمة سر حسابك لعرض التقرير المالي الحساس'
                  : 'Enter your account password to view sensitive financial data'}
              </p>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfitPasswordError('');
                setProfitPasswordLoading(true);
                try {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: user?.email || '',
                    password: profitPassword,
                  });
                  if (error) {
                    setProfitPasswordError(isAr ? 'كلمة السر غير صحيحة' : 'Incorrect password');
                  } else {
                    setProfitUnlocked(true);
                    setProfitPassword('');
                  }
                } catch {
                  setProfitPasswordError(isAr ? 'حدث خطأ' : 'An error occurred');
                } finally {
                  setProfitPasswordLoading(false);
                }
              }}
              className="flex items-center gap-2 w-full max-w-sm"
            >
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={profitPassword}
                  onChange={(e) => setProfitPassword(e.target.value)}
                  placeholder={isAr ? 'كلمة السر...' : 'Password...'}
                  className="pe-10 bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800 focus:border-amber-400 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="submit"
                disabled={!profitPassword || profitPasswordLoading}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white gap-2 h-11 px-6 shadow-sm"
              >
                {profitPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {isAr ? 'فتح' : 'Unlock'}
              </Button>
            </form>
            {profitPasswordError && (
              <p className="text-sm text-red-500 font-medium animate-pulse">{profitPasswordError}</p>
            )}
          </div>
        ) : (
          /* Unlocked: Detailed P&L with Charts */
          <div className="p-5 space-y-5">
            {/* Net Profit Hero */}
            <div className={cn(
              "p-6 rounded-2xl border-2 text-center relative overflow-hidden",
              netProfit >= 0
                ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/10 border-emerald-200 dark:border-emerald-800"
                : "bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/20 dark:to-pink-950/10 border-red-200 dark:border-red-800"
            )}>
              {/* Decorative circles */}
              <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30", netProfit >= 0 ? "bg-emerald-400" : "bg-red-400")} />
              <div className={cn("absolute -bottom-10 -left-10 w-28 h-28 rounded-full blur-3xl opacity-20", netProfit >= 0 ? "bg-teal-400" : "bg-rose-400")} />

              <p className="text-sm font-tajawal text-gray-600 dark:text-gray-400 relative z-10">
                {isAr ? 'صافي الربح / الخسارة' : 'Net Profit / Loss'}
              </p>
              <p className={cn(
                "text-4xl font-bold font-mono mt-2 relative z-10 tracking-tight",
                netProfit >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {sym} {Math.abs(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 relative z-10">
                <Badge className={cn(
                  netProfit >= 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                )}>
                  {netProfit >= 0 ? (isAr ? '✓ ربح صافي' : '✓ Net Profit') : (isAr ? '⚠ خسارة صافية' : '⚠ Net Loss')}
                </Badge>
                <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-mono">
                  {isAr ? 'هامش' : 'Margin'}: {profitMargin.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Donut Chart — Revenue vs Expenses */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 font-cairo mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-violet-500" />
                  {isAr ? 'توزيع الإيرادات والمصروفات' : 'Revenue vs Expenses Distribution'}
                </h4>
                <ReactECharts
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'item',
                      formatter: (p: any) => `${p.name}: ${sym} ${Number(p.value).toLocaleString()} (${p.percent}%)`,
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      borderColor: isDark ? '#374151' : '#e5e7eb',
                      textStyle: { color: isDark ? '#f9fafb' : '#111827', fontSize: 12 },
                    },
                    series: [{
                      type: 'pie',
                      radius: ['45%', '75%'],
                      center: ['50%', '50%'],
                      avoidLabelOverlap: true,
                      itemStyle: { borderRadius: 8, borderColor: isDark ? '#1f2937' : '#ffffff', borderWidth: 3 },
                      label: { show: true, fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', formatter: '{b}\n{d}%' },
                      emphasis: {
                        label: { show: true, fontSize: 14, fontWeight: 'bold' },
                        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' }
                      },
                      data: [
                        { value: totalRevenue, name: isAr ? 'الإيرادات' : 'Revenue', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }] } } },
                        { value: totalExpenses, name: isAr ? 'المصروفات' : 'Expenses', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#f43f5e' }, { offset: 1, color: '#e11d48' }] } } },
                      ],
                    }],
                  }}
                  style={{ height: '220px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge
                />
              </div>

              {/* Bar Chart — Monthly P&L */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 font-cairo mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  {isAr ? 'الأداء الشهري (الربح/الخسارة)' : 'Monthly P&L Performance'}
                </h4>
                <ReactECharts
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'axis',
                      axisPointer: { type: 'shadow' },
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      borderColor: isDark ? '#374151' : '#e5e7eb',
                      textStyle: { color: isDark ? '#f9fafb' : '#111827', fontSize: 12 },
                      formatter: (params: any) => {
                        if (!params?.length) return '';
                        let html = `<div style="font-weight:bold;margin-bottom:4px">${params[0].axisValue}</div>`;
                        params.forEach((p: any) => {
                          html += `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:2px"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px"></span>${p.seriesName}</span><b style="font-family:monospace">${sym}${Number(p.value).toLocaleString()}</b></div>`;
                        });
                        return html;
                      },
                    },
                    grid: { left: '2%', right: '2%', bottom: '8%', top: '8%', containLabel: true },
                    xAxis: {
                      type: 'category',
                      data: monthly.map(d => d.label),
                      axisLabel: { color: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 },
                      axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }},
                      inverse: isRTL,
                    },
                    yAxis: {
                      type: 'value',
                      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', type: 'dashed' }},
                      axisLabel: { color: isDark ? '#9ca3af' : '#6b7280', fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v },
                    },
                    series: [
                      {
                        name: isAr ? 'الإيرادات' : 'Revenue',
                        type: 'bar',
                        barGap: '20%',
                        itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#10b981' }] }},
                        data: monthly.map(d => d.revenue),
                      },
                      {
                        name: isAr ? 'المصروفات' : 'Expenses',
                        type: 'bar',
                        itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#fb7185' }, { offset: 1, color: '#f43f5e' }] }},
                        data: monthly.map(d => d.expenses),
                      },
                    ],
                  }}
                  style={{ height: '220px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge
                />
              </div>
            </div>

            {/* Detailed Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-tajawal text-gray-600 dark:text-gray-400">{isAr ? 'الإيرادات' : 'Revenue'}</span>
                </div>
                <p className="text-lg font-mono font-bold text-emerald-600">{sym} {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-950/20 border border-red-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-tajawal text-gray-600 dark:text-gray-400">{isAr ? 'المصروفات' : 'Expenses'}</span>
                </div>
                <p className="text-lg font-mono font-bold text-red-600">{sym} {totalExpenses.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-tajawal text-gray-600 dark:text-gray-400">{isAr ? 'هامش الربح' : 'Margin'}</span>
                </div>
                <p className={cn("text-lg font-mono font-bold", profitMargin >= 0 ? "text-blue-600" : "text-red-600")}>
                  {profitMargin.toFixed(1)}%
                </p>
                <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", profitMargin >= 0 ? "bg-blue-500" : "bg-red-500")} style={{ width: `${Math.min(Math.abs(profitMargin), 100)}%` }} />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-violet-50/80 dark:bg-violet-950/20 border border-violet-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-tajawal text-gray-600 dark:text-gray-400">{isAr ? 'الرصيد النقدي' : 'Cash'}</span>
                </div>
                <p className="text-lg font-mono font-bold text-violet-600">{sym} {cashBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Disclaimer + Timer */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400 dark:text-gray-600 font-tajawal">
                {isAr
                  ? 'صافي الربح = الإيرادات (كود 4xx) - المصروفات (كود 5xx)'
                  : 'Net Profit = Revenue (4xx) - Expenses (5xx)'}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <Clock className="w-3 h-3" />
                {isAr ? `يُقفل تلقائياً خلال ${Math.floor(autoLockCountdown / 60)}:${String(autoLockCountdown % 60).padStart(2, '0')}` : `Auto-locks in ${Math.floor(autoLockCountdown / 60)}:${String(autoLockCountdown % 60).padStart(2, '0')}`}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
