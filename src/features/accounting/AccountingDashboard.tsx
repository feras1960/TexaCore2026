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

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
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
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import {
  Calculator, TrendingUp, TrendingDown, Wallet, FileText, Clock,
  ArrowDownRight, ArrowUpRight, RefreshCw, Calendar, BarChart3,
  BookOpen, Coins, DollarSign, CreditCard, Star, Loader2, PiggyBank,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import QuickActionsBar from './components/QuickActionsBar';

// ─── Chart tooltip ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label, sym, isAr }: any) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 shadow-soft-md rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-500 font-tajawal mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono font-bold text-sm" style={{ color: p.color }}>
          {p.name === 'revenue' ? t('accounting.revenue') : t('accounting.expenses')}: {sym} {Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
export default function AccountingDashboard() {
  const { t, language, direction } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency, currencySymbol: baseSymbol } = useCompanyCurrency(language as 'ar' | 'en');
  const { lookupRate, isLoading: ratesLoading } = useExchangeRateLookup();

  // Currency filter with localStorage
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try { return localStorage.getItem('acct_dashboard_currency') || 'all'; } catch { return 'all'; }
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

  const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
  const sym = getCurrencySymbol(displayCurrency);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // KPI State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [postedCount, setPostedCount] = useState(0);
  const [unpostedCount, setUnpostedCount] = useState(0);
  const [accountsCount, setAccountsCount] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [receivables, setReceivables] = useState(0);
  const [payables, setPayables] = useState(0);
  const [monthly, setMonthly] = useState<{ label: string; revenue: number; expenses: number }[]>([]);
  const [recentEntries, setRecentEntries] = useState<{ id: string; entry_number: string; description: string; total_debit: number; status: string; entry_date: string }[]>([]);
  const [isLive, setIsLive] = useState(false);

  // ─── Fetch data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const toDate = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

    try {
      // Fetch supported currencies from company settings
      const { data: settings } = await supabase
        .from('company_accounting_settings')
        .select('supported_currencies, base_currency')
        .eq('company_id', companyId)
        .single();

      if (settings?.supported_currencies) {
        setAvailableCurrencies(settings.supported_currencies);
      }

      // Journal entries in date range
      const { data: entries, error: entriesErr } = await supabase
        .from('journal_entries')
        .select('id, entry_number, description, total_debit, total_credit, status, entry_date')
        .eq('company_id', companyId)
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate)
        .order('entry_date', { ascending: false });

      if (!entriesErr && entries) {
        setJournalCount(entries.length);
        setDraftCount(entries.filter(e => e.status === 'draft').length);
        setPostedCount(entries.filter(e => e.status === 'posted').length);
        setUnpostedCount(entries.filter(e => e.status !== 'posted' && e.status !== 'draft').length);
        
        const totalDebit = entries.reduce((s, e) => s + Number(e.total_debit || 0), 0);
        setTotalReceipts(totalDebit);

        // Recent 8
        setRecentEntries(entries.slice(0, 8).map(e => ({
          id: e.id,
          entry_number: e.entry_number || '-',
          description: e.description || t('accounting.noDescription'),
          total_debit: Number(e.total_debit || 0),
          status: e.status || 'draft',
          entry_date: e.entry_date,
        })));
      }

      // Revenue & Expenses from journal_entry_lines (year)
      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)')
        .eq('journal_entries.company_id', companyId)
        .eq('journal_entries.status', 'posted')
        .gte('journal_entries.entry_date', yearStart)
        .lte('journal_entries.entry_date', toDate);

      // Get revenue/expense accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_type_id, is_group')
        .eq('company_id', companyId);

      if (accounts) {
        setAccountsCount(accounts.filter(a => !a.is_group).length);
        
        // account_type_id: 4 = Revenue, 5 = Expenses (common pattern)
        const revenueAccountIds = new Set(accounts.filter(a => a.account_type_id === 4).map(a => a.id));
        const expenseAccountIds = new Set(accounts.filter(a => a.account_type_id === 5).map(a => a.id));
        const cashAccountIds = new Set(accounts.filter(a => a.account_type_id === 1).map(a => a.id));
        const receivableIds = new Set(accounts.filter(a => a.account_type_id === 2).map(a => a.id));
        const payableIds = new Set(accounts.filter(a => a.account_type_id === 3).map(a => a.id));

        if (lines) {
          let rev = 0, exp = 0, cash = 0, recv = 0, pay = 0;
          lines.forEach(l => {
            const debit = Number(l.debit || 0);
            const credit = Number(l.credit || 0);
            if (revenueAccountIds.has(l.account_id)) rev += credit - debit;
            if (expenseAccountIds.has(l.account_id)) exp += debit - credit;
            if (cashAccountIds.has(l.account_id)) cash += debit - credit;
            if (receivableIds.has(l.account_id)) recv += debit - credit;
            if (payableIds.has(l.account_id)) pay += credit - debit;
          });
          setTotalRevenue(Math.abs(rev));
          setTotalExpenses(Math.abs(exp));
          setNetProfit(rev - exp);
          setCashBalance(cash);
          setReceivables(recv > 0 ? recv : 0);
          setPayables(pay > 0 ? pay : 0);
          setTotalPayments(exp);
        }
      }

      // Monthly trend (6 months)
      const monthlyData: { label: string; revenue: number; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
        const mEnd = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd');
        const label = format(d, 'MMM', { locale: isAr ? arSA : enUS });

        const { data: mLines } = await supabase
          .from('journal_entry_lines')
          .select('debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)')
          .eq('journal_entries.company_id', companyId)
          .eq('journal_entries.status', 'posted')
          .gte('journal_entries.entry_date', mStart)
          .lte('journal_entries.entry_date', mEnd);

        let mRev = 0, mExp = 0;
        if (mLines && accounts) {
          const revIds = new Set(accounts.filter(a => a.account_type_id === 4).map(a => a.id));
          const expIds = new Set(accounts.filter(a => a.account_type_id === 5).map(a => a.id));
          mLines.forEach(l => {
            if (revIds.has(l.account_id)) mRev += Number(l.credit || 0) - Number(l.debit || 0);
            if (expIds.has(l.account_id)) mExp += Number(l.debit || 0) - Number(l.credit || 0);
          });
        }
        monthlyData.push({ label, revenue: Math.abs(mRev), expenses: Math.abs(mExp) });
      }
      setMonthly(monthlyData);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange, isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('acct-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter: `company_id=eq.${companyId}` }, () => {
        setIsLive(true);
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchData]);

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
            {/* Quick Actions only in header */}
            <div className="[&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-white/20 [&_button]:text-white [&_button]:hover:bg-white/20">
              <QuickActionsBar />
            </div>
          </div>
        </div>
      </div>

      {/* ─ Filter Bar — Below Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="w-auto"
            align="start"
          />

          {/* Currency Filter */}
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[175px] h-10 text-sm border-gray-200 dark:border-gray-700 hover:border-erp-teal transition-colors">
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
          label={t('accounting.netProfit')}
          value={netProfit}
          type={netProfit >= 0 ? 'positive' : 'negative'}
          icon={PiggyBank}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          suffix={profitMargin ? `${profitMargin.toFixed(1)}%` : ''}
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
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip sym={sym} isAr={isAr} />} />
                  <Area type="monotone" dataKey="revenue" name="revenue" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
                  <Area type="monotone" dataKey="expenses" name="expenses" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#expGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-600 font-tajawal">{t('accounting.revenue')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600 font-tajawal">{t('accounting.expenses')}</span>
              </div>
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
            {/* Profit Margin */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-100/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-tajawal text-gray-600 dark:text-gray-300">{t('accounting.profitMargin')}</span>
                <span className={cn("text-lg font-mono font-bold", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", netProfit >= 0 ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${Math.min(Math.abs(profitMargin), 100)}%` }} />
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
    </div>
  );
}
