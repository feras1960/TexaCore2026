/**
 * ════════════════════════════════════════════════════════════════
 * 🧮 AccountingDashboard v4 — uses shared dashboard-kit
 * ════════════════════════════════════════════════════════════════
 *
 * KpiGrid, DashboardHero, SectionCard, ListPanel come from
 * @/components/dashboard-kit  — identical to main dashboard.
 *
 * P&L section preserved with password protection + auto-lock.
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol } from '@/hooks/useCompanyCurrency';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfDay, format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import ReactECharts from 'echarts-for-react';

// ── dashboard-kit (shared with all departments) ──
import {
  DashboardHero, KpiGrid, SectionCard, ListPanel,
  type KpiItem, type ListItem,
} from '@/components/dashboard-kit';

// ── Lucide icons ──────────────────────────────────────────
import {
  TrendingUp, TrendingDown, Wallet, FileText, Clock,
  ArrowDownRight, ArrowUpRight, BookOpen, Scale, BarChart3,
  Activity, HelpCircle, AlertTriangle, CheckCircle2,
  Lock, Eye, EyeOff, ShieldCheck, KeyRound, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import QuickActionsBar from './components/QuickActionsBar';

// ════════════════════════════════════════════════════════════════
export default function AccountingDashboard() {
  const { t, language, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isAr = language === 'ar';
  const isRTL = direction === 'rtl';
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const displayCurrency = baseCurrency || 'USD';
  const sym = getCurrencySymbol(displayCurrency);

  // ─── Password-protected P&L ───────────────────────────
  const [profitUnlocked, setProfitUnlocked] = useState(false);
  const [profitPassword, setProfitPassword] = useState('');
  const [profitPasswordError, setProfitPasswordError] = useState('');
  const [profitPasswordLoading, setProfitPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoLockCountdown, setAutoLockCountdown] = useState(0);
  const autoLockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const AUTO_LOCK = 180;

  useEffect(() => {
    if (!profitUnlocked) { if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current); setAutoLockCountdown(0); return; }
    setAutoLockCountdown(AUTO_LOCK);
    autoLockTimerRef.current = setInterval(() => {
      setAutoLockCountdown(p => { if (p <= 1) { setProfitUnlocked(false); return 0; } return p - 1; });
    }, 1000);
    return () => { if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current); };
  }, [profitUnlocked]);

  useEffect(() => {
    const h = () => { if (document.hidden && profitUnlocked) setProfitUnlocked(false); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [profitUnlocked]);

  // ─── Date range ───────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    try { const s = localStorage.getItem('acct_dash_dr'); if (s) { const p = JSON.parse(s); return { from: new Date(p.from), to: new Date(p.to) }; } } catch {}
    return { from: startOfMonth(new Date()), to: new Date() };
  });
  useEffect(() => { try { localStorage.setItem('acct_dash_dr', JSON.stringify({ from: dateRange?.from, to: dateRange?.to })); } catch {} }, [dateRange]);

  const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const toStr = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  // ─── RPC fetch ────────────────────────────────────────
  const { data: dash, isLoading } = useCachedQuery({
    queryKey: ['accounting', 'dashboard-v4', companyId, fromStr, toStr],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc('get_accounting_dashboard', { p_company_id: companyId, p_base_currency: displayCurrency, p_from_date: fromStr, p_to_date: toStr });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: recentEntries } = useCachedQuery({
    queryKey: ['accounting', 'recent-v4', companyId, fromStr, toStr],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('journal_entries')
        .select('id, entry_number, description, total_debit, status, entry_date')
        .eq('company_id', companyId).gte('entry_date', fromStr).lte('entry_date', toStr)
        .order('entry_date', { ascending: false }).limit(8);
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });

  // ─── Realtime ─────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase.channel('acct-dash-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard-v4'] });
        queryClient.invalidateQueries({ queryKey: ['accounting', 'recent-v4'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, queryClient]);

  // ─── Last sync tracking ───────────────────────────────
  const [lastSync, setLastSync] = useState<Date | null>(null);
  useEffect(() => {
    if (!isLoading && dash) setLastSync(new Date());
  }, [dash, isLoading]);

  // ─── Extract ──────────────────────────────────────────
  const kpisData = dash?.kpis || { revenue: 0, expenses: 0, cashBalance: 0, receivables: 0, payables: 0 };
  const stats = dash?.journalStats || { total: 0, draft: 0, posted: 0 };
  const trialBalance = dash?.trialBalance || { totalDebit: 0, totalCredit: 0, difference: 0, isBalanced: true };
  const topAccounts = dash?.topAccounts || [];
  const alerts = dash?.alerts || { draftEntries: 0, accountsCount: 0 };
  const monthly = dash?.monthly || [];
  const netProfit = kpisData.revenue - kpisData.expenses;
  const profitMargin = kpisData.revenue > 0 ? (netProfit / kpisData.revenue) * 100 : 0;

  // ─── Derive sparklines from monthly data ──────────────
  const revenueSparkline = monthly.map((m: any) => Number(m.revenue || 0));
  const expensesSparkline = monthly.map((m: any) => Number(m.expenses || 0));
  const netSparkline = monthly.map((m: any) => Number(m.revenue || 0) - Number(m.expenses || 0));

  // ─── Compute delta % from first → last month ─────────
  function computeDelta(arr: number[]): number | undefined {
    if (arr.length < 2) return undefined;
    const prev = arr[arr.length - 2];
    const curr = arr[arr.length - 1];
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }

  // ─── Currency breakdown pill ──────────────────────────
  const currencyBreakdown = [{ key: displayCurrency, label: displayCurrency, pct: 100 }];

  // ─── KPI items (using shared KpiItem type) ────────────
  const kpis: KpiItem[] = [
    { id: 'revenue',     label: t('accounting.revenue'),        value: kpisData.revenue,       currency: displayCurrency, icon: TrendingUp,    color: '#14b8a6',
      sparkline: revenueSparkline,  deltaPct: computeDelta(revenueSparkline),  breakdown: currencyBreakdown },
    { id: 'expenses',    label: t('accounting.expenses'),       value: kpisData.expenses,      currency: displayCurrency, icon: TrendingDown,  color: '#f43f5e',
      sparkline: expensesSparkline, deltaPct: computeDelta(expensesSparkline), breakdown: currencyBreakdown },
    { id: 'cash',        label: t('accounting.cashBalance'),    value: kpisData.cashBalance,   currency: displayCurrency, icon: Wallet,        color: '#0ea5e9',
      sparkline: netSparkline,      deltaPct: computeDelta(netSparkline),      breakdown: currencyBreakdown },
    { id: 'receivables', label: t('accounting.receivables'),    value: kpisData.receivables,   currency: displayCurrency, icon: ArrowDownRight, color: '#8b5cf6',
      breakdown: currencyBreakdown },
    { id: 'payables',    label: t('accounting.payables'),       value: kpisData.payables,      currency: displayCurrency, icon: ArrowUpRight,  color: '#f59e0b',
      breakdown: currencyBreakdown },
    { id: 'accounts',    label: t('accounting.accountsCount'),  value: alerts.accountsCount,   icon: BookOpen,   color: '#6366f1' },
    { id: 'entries',     label: t('accounting.journalEntries'), value: stats.total,            icon: FileText,   color: '#64748b',
      suffix: stats.posted > 0 ? `${stats.posted} ${t('common.posted')} / ${stats.draft} ${t('accounting.drafts')}` : undefined },
    { id: 'drafts',      label: t('accounting.drafts'),         value: stats.draft,            icon: Clock,      color: '#ea580c',
      secondaryLabel: stats.draft > 0 ? (isAr ? '⚠ تحتاج مراجعة' : '⚠ Needs review') : (isAr ? '✓ لا مسودات' : '✓ No drafts'),
      secondaryTone: stats.draft > 0 ? 'warning' : 'success' },
  ];

  // ─── Top Accounts → ListItem ──────────────────────────
  const CLASSIFICATION_COLORS: Record<string, string> = {
    assets: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    liabilities: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    equity: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
    income: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    expenses: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  };

  const accountListItems: ListItem[] = topAccounts.map((acc: any, i: number) => ({
    id: acc.accountCode,
    rank: i + 1,
    title: acc.accountName,
    subtitle: acc.accountCode,
    value: acc.activity,
    valueSub: `${isAr ? 'رصيد' : 'Bal'}: ${sym} ${Number(acc.balance).toLocaleString()}`,
    tags: [{ label: acc.typeName, className: CLASSIFICATION_COLORS[acc.classification] || 'bg-stone-100 text-stone-600' }],
  }));

  // ─── Recent Entries → ListItem ────────────────────────
  const entryListItems: ListItem[] = (recentEntries || []).map((e: any) => ({
    id: e.id,
    title: e.description || '-',
    subtitle: `#${e.entry_number || '-'}`,
    value: Number(e.total_debit || 0),
    valueSub: e.entry_date,
    icon: FileText,
    iconClassName: e.status === 'posted'
      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
      : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
    tags: [{
      label: t(`common.statuses.${e.status}`) || e.status,
      className: e.status === 'posted'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
    }],
  }));

  // ─── Hero config ──────────────────────────────────────
  const heroConfig = {
    label: t('accounting.dashboardTitle'),
    value: stats.total,
    valueSuffix: isAr ? 'قيد محاسبي' : 'journal entries',
    badges: [
      { label: `${stats.posted} ${isAr ? 'مرّحل' : 'posted'}`, tone: 'success' as const },
      ...(stats.draft > 0 ? [{ label: `${stats.draft} ${isAr ? 'مسودة' : 'drafts'}`, tone: 'warning' as const }] : []),
    ],
    secondaryLabel: isAr ? 'آخر تحديث' : 'Period',
    secondaryValue: `${fromStr} → ${toStr}`,
    // ── Live sync ──
    lastSync,
    isFetching: isLoading,
    actions: (
      <>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">{isAr ? 'الفترة' : 'Period'}</label>
          <DateRangePicker
            date={dateRange} setDate={setDateRange} align="end"
            className="w-full [&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-stone-700 [&_button]:text-white [&_button]:hover:bg-white/15 [&_button]:h-9 [&_button]:text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">{isAr ? 'إجراءات سريعة' : 'Quick Actions'}</label>
          <div className="[&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-stone-700 [&_button]:text-white [&_button]:hover:bg-white/15 [&_button]:h-9 [&_button]:text-xs">
            <QuickActionsBar />
          </div>
        </div>
      </>
    ),
  };

  // ─── Chart ────────────────────────────────────────────
  const textColor = isDark ? '#78716c' : '#a8a29e';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const chartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1c1917' : '#ffffff',
      borderColor: isDark ? '#292524' : '#e7e5e4',
      textStyle: { color: isDark ? '#fafaf9' : '#1c1917', fontSize: 12 },
    },
    legend: { data: [isAr ? 'الإيرادات' : 'Revenue', isAr ? 'المصروفات' : 'Expenses'], textStyle: { color: textColor, fontSize: 11 }, top: 0, right: isRTL ? 'auto' : 8, left: isRTL ? 8 : 'auto' },
    grid: { left: '1%', right: '1%', bottom: '1%', top: '14%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: monthly.map((d: any) => d.label), axisLabel: { color: textColor, fontSize: 10 }, axisLine: { lineStyle: { color: gridColor } }, inverse: isRTL },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }, axisLabel: { color: textColor, fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v } },
    series: [
      { name: isAr ? 'الإيرادات' : 'Revenue', type: 'line', smooth: 0.4, lineStyle: { width: 2, color: '#14b8a6' }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#14b8a6' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(20,184,166,0.15)' }, { offset: 1, color: 'rgba(20,184,166,0)' }] } }, data: monthly.map((d: any) => d.revenue) },
      { name: isAr ? 'المصروفات' : 'Expenses', type: 'line', smooth: 0.4, lineStyle: { width: 2, color: '#f43f5e' }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#f43f5e' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(244,63,94,0.12)' }, { offset: 1, color: 'rgba(244,63,94,0)' }] } }, data: monthly.map((d: any) => d.expenses) },
    ],
  }), [monthly, isDark, isAr, isRTL, textColor, gridColor]);

  // ════════════════════════════════════════════════════════
  return (
    <div className="space-y-5" dir={direction}>
      {/* ─── Hero (shared DashboardHero) ─── */}
      <DashboardHero config={heroConfig} loading={isLoading && !dash} />

      {/* ─── KPIs (shared KpiGrid) ─── */}
      <KpiGrid kpis={kpis} loading={isLoading && !dash} cols={4} />

      {/* ─── Chart + Trial Balance ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title={`${isAr ? '📈' : '📈'} ${t('accounting.revenueVsExpenses')}`}
          className="lg:col-span-2"
        >
          <ReactECharts option={chartOption} style={{ height: '300px', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
        </SectionCard>

        <SectionCard
          title={isAr ? 'ميزان المراجعة' : 'Trial Balance'}
          action={
            <span className="cursor-help text-stone-400" title={isAr ? 'يجب أن يتساوى إجمالي المدين والدائن' : 'Total debits must equal credits'}>
              <HelpCircle className="h-3.5 w-3.5" />
            </span>
          }
        >
          <div className="space-y-3">
            {/* Status */}
            <div className={cn('rounded-xl p-4 text-center', trialBalance.isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20')}>
              {trialBalance.isBalanced
                ? <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                : <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-1" />}
              <p className={cn('text-sm font-medium', trialBalance.isBalanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
                {trialBalance.isBalanced ? (isAr ? 'الميزان متوازن ✓' : 'Balanced ✓') : (isAr ? 'غير متوازن ⚠' : 'Unbalanced ⚠')}
              </p>
            </div>
            {/* Amounts */}
            {[
              { label: isAr ? 'إجمالي المدين' : 'Total Debit', val: trialBalance.totalDebit },
              { label: isAr ? 'إجمالي الدائن' : 'Total Credit', val: trialBalance.totalCredit },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center rounded-lg bg-stone-50 px-3 py-2.5 dark:bg-stone-800/50">
                <span className="text-xs text-stone-500 dark:text-stone-400">{row.label}</span>
                <span className="font-medium tabular-nums text-sm text-stone-900 dark:text-stone-100">{sym} {Number(row.val).toLocaleString()}</span>
              </div>
            ))}
            {/* Alerts */}
            <div className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
              <div className="flex items-center gap-2 text-xs">
                {alerts.draftEntries > 0
                  ? <><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-700 dark:text-amber-400">{alerts.draftEntries} {isAr ? 'مسودات معلقة' : 'pending drafts'}</span></>
                  : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-700 dark:text-emerald-400">{isAr ? 'لا مسودات معلقة' : 'No pending drafts'}</span></>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-stone-500">{alerts.accountsCount} {isAr ? 'حساب مُفعّل' : 'active accounts'}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ─── Top Accounts + Recent Entries (shared ListPanel) ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title={isAr ? 'أعلى الحسابات حركة' : 'Top Accounts by Activity'}
          action={<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"><Activity className="inline h-3 w-3 me-1" />{topAccounts.length}</span>}
          noPadding
        >
          <ListPanel
            items={accountListItems}
            loading={isLoading && !dash}
            currency={displayCurrency}
            emptyTitle={isAr ? 'لا توجد حركات في هذه الفترة' : 'No activity in this period'}
          />
        </SectionCard>

        <SectionCard
          title={t('accounting.recentEntries')}
          action={<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">{stats.total}</span>}
          noPadding
        >
          <ListPanel
            items={entryListItems}
            loading={isLoading && !dash}
            showRank={false}
            currency={displayCurrency}
            emptyTitle={t('accounting.noEntriesInPeriod')}
          />
        </SectionCard>
      </div>

      {/* ─── Password-Protected P&L ─── */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <button
          className={cn('w-full p-5 flex items-center gap-4 border-b transition-colors',
            profitUnlocked ? 'bg-emerald-50/50 border-stone-100 dark:bg-emerald-950/10 dark:border-stone-800' : 'bg-amber-50/50 border-stone-100 dark:bg-amber-950/10 dark:border-stone-800 hover:bg-amber-50/80'
          )}
          onClick={() => { if (profitUnlocked) setProfitUnlocked(false); }}
        >
          <div className={cn('p-2.5 rounded-xl', profitUnlocked ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30')}>
            {profitUnlocked ? <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          </div>
          <div className="flex-1 text-start">
            <h3 className={cn('text-sm font-medium', profitUnlocked ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
              {profitUnlocked ? (isAr ? '✅ تقرير الأرباح والخسائر' : '✅ Profit & Loss Report') : (isAr ? '🔒 تقرير الأرباح والخسائر' : '🔒 Profit & Loss Report')}
            </h3>
            <p className={cn('text-xs mt-0.5', profitUnlocked ? 'text-emerald-600/70 dark:text-emerald-400/60' : 'text-amber-600/70 dark:text-amber-400/60')}>
              {profitUnlocked ? (isAr ? 'انقر لإعادة القفل' : 'Click to re-lock') : (isAr ? 'محمي — يُقفل بعد 3 دقائق' : 'Protected — auto-locks in 3 min')}
            </p>
          </div>
          {profitUnlocked && (
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-mono font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Clock className="inline h-3 w-3 me-1" />{Math.floor(autoLockCountdown / 60)}:{String(autoLockCountdown % 60).padStart(2, '0')}
              </span>
              <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-200 cursor-pointer dark:bg-red-900/30 dark:text-red-300"
                onClick={e => { e.stopPropagation(); setProfitUnlocked(false); }}>
                <Lock className="inline h-3 w-3 me-1" />{isAr ? 'قفل' : 'Lock'}
              </span>
            </div>
          )}
        </button>

        {!profitUnlocked ? (
          /* ── Locked ── */
          <div className="p-8 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="p-5 rounded-full bg-amber-50 dark:bg-amber-950/20"><KeyRound className="w-10 h-10 text-amber-500" /></div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-500 shadow"><Lock className="w-3 h-3 text-white" /></div>
            </div>
            <div className="text-center">
              <h4 className="font-medium text-stone-700 dark:text-stone-300">{isAr ? 'التحقق من الهوية' : 'Identity Verification'}</h4>
              <p className="text-sm text-stone-500 mt-1 max-w-sm">{isAr ? 'ادخل كلمة سر حسابك لعرض البيانات المالية الحساسة' : 'Enter your password to view sensitive financial data'}</p>
            </div>
            <form className="flex items-center gap-2 w-full max-w-sm"
              onSubmit={async e => {
                e.preventDefault(); setProfitPasswordError(''); setProfitPasswordLoading(true);
                try {
                  const { error } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: profitPassword });
                  if (error) setProfitPasswordError(isAr ? 'كلمة السر غير صحيحة' : 'Incorrect password');
                  else { setProfitUnlocked(true); setProfitPassword(''); }
                } catch { setProfitPasswordError(isAr ? 'حدث خطأ' : 'Error'); }
                finally { setProfitPasswordLoading(false); }
              }}>
              <div className="relative flex-1">
                <Input type={showPassword ? 'text' : 'password'} value={profitPassword} onChange={e => setProfitPassword(e.target.value)} placeholder={isAr ? 'كلمة السر...' : 'Password...'} className="pe-10 h-11 border-stone-200 dark:border-stone-700" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="submit" disabled={!profitPassword || profitPasswordLoading} className="bg-stone-900 hover:bg-stone-800 text-white gap-2 h-11 px-6 dark:bg-stone-100 dark:text-stone-900">
                {profitPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}{isAr ? 'فتح' : 'Unlock'}
              </Button>
            </form>
            {profitPasswordError && <p className="text-sm text-red-500 font-medium animate-pulse">{profitPasswordError}</p>}
          </div>
        ) : (
          /* ── Unlocked ── */
          <div className="p-5 space-y-5">
            <div className={cn('rounded-xl p-6 text-center', netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/15' : 'bg-red-50 dark:bg-red-950/15')}>
              <p className="text-xs text-stone-500">{isAr ? 'صافي الربح / الخسارة' : 'Net Profit / Loss'}</p>
              <p className={cn('text-4xl font-medium tabular-nums mt-2', netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {sym} {Math.abs(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <span className={cn('rounded-md px-2 py-1 text-xs font-medium', netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300')}>
                  {netProfit >= 0 ? (isAr ? '✓ ربح' : '✓ Profit') : (isAr ? '⚠ خسارة' : '⚠ Loss')}
                </span>
                <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                  {isAr ? 'هامش' : 'Margin'}: {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: isAr ? 'الإيرادات' : 'Revenue', val: kpisData.revenue, Icon: TrendingUp, cls: 'text-teal-600' },
                { label: isAr ? 'المصروفات' : 'Expenses', val: kpisData.expenses, Icon: TrendingDown, cls: 'text-rose-600' },
                { label: isAr ? 'الهامش' : 'Margin', val: null, Icon: BarChart3, cls: profitMargin >= 0 ? 'text-teal-600' : 'text-rose-600', display: `${profitMargin.toFixed(1)}%` },
                { label: isAr ? 'النقد' : 'Cash', val: kpisData.cashBalance, Icon: Wallet, cls: 'text-sky-600' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-stone-100 p-3 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.Icon className={cn('w-3.5 h-3.5', item.cls)} />
                    <span className="text-[11px] text-stone-500">{item.label}</span>
                  </div>
                  <p className={cn('text-lg font-medium tabular-nums', item.cls)}>
                    {item.display || `${sym} ${(item.val || 0).toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 text-center">
              {isAr ? `يُقفل تلقائياً خلال ${Math.floor(autoLockCountdown / 60)}:${String(autoLockCountdown % 60).padStart(2, '0')}` : `Auto-locks in ${Math.floor(autoLockCountdown / 60)}:${String(autoLockCountdown % 60).padStart(2, '0')}`}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
