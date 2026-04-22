/**
 * ════════════════════════════════════════════════════════════════
 * 💰 SalesDashboard v2 — uses shared dashboard-kit
 * ════════════════════════════════════════════════════════════════
 *
 * Migrated from custom Glass design → unified dashboard-kit
 * (DashboardHero, KpiGrid, SectionCard, ListPanel).
 * Same data logic, same realtime, but consistent UI across all departments.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, CURRENCY_META, getCurrencySymbol } from '@/hooks/useCompanyCurrency';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/providers/ThemeProvider';
import { startOfMonth, endOfDay, startOfYear, format, subMonths } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import ReactECharts from 'echarts-for-react';

// ── dashboard-kit (shared with all departments) ──
import {
  DashboardHero, KpiGrid, SectionCard, ListPanel,
  type KpiItem, type ListItem,
} from '@/components/dashboard-kit';

// ── UI ──
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// ── Lucide icons ──
import {
  ShoppingCart, TrendingUp, TrendingDown, FileText, Clock,
  BarChart3, Users, Star, AlertTriangle, Hash, Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Stage metadata ─────────────────────────────────────────
const STAGE_META: Record<string, { key: string; badge: string; color: string }> = {
  draft: { key: 'stages.draft', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', color: '#9CA3AF' },
  confirmed: { key: 'stages.confirmed', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', color: '#3B82F6' },
  delivered: { key: 'stages.delivered', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300', color: '#0EA5E9' },
  posted: { key: 'stages.posted', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', color: '#10B981' },
  partial_paid: { key: 'stages.partial_paid', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', color: '#F59E0B' },
  paid: { key: 'stages.paid', badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', color: '#059669' },
  cancelled: { key: 'stages.cancelled', badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', color: '#EF4444' },
};

// ═════════════════════════════════════════════════════════════
export default function SalesDashboard() {
  const { t, language, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isAr = language === 'ar';
  const isRTL = direction === 'rtl';
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
  const { lookupRate } = useExchangeRateLookup();
  const queryClient = useQueryClient();

  // ─── Currency ──────────────────────────────────────────
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try { return localStorage.getItem('sales_dashboard_currency') || 'all'; } catch { return 'all'; }
  });
  const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
  const sym = getCurrencySymbol(displayCurrency);

  // ─── Date range ────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    try {
      const saved = localStorage.getItem('sales_dashboard_daterange');
      if (saved) {
        const p = JSON.parse(saved);
        return { from: p.from ? new Date(p.from) : startOfMonth(new Date()), to: p.to ? new Date(p.to) : new Date() };
      }
    } catch { }
    return { from: startOfMonth(new Date()), to: new Date() };
  });

  // Persist preferences
  useEffect(() => { try { localStorage.setItem('sales_dashboard_currency', selectedCurrency); } catch {} }, [selectedCurrency]);
  useEffect(() => {
    try { localStorage.setItem('sales_dashboard_daterange', JSON.stringify({ from: dateRange?.from?.toISOString(), to: dateRange?.to?.toISOString() })); } catch {}
  }, [dateRange]);


  const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const toStr = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  // Convert
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!amount || !fromCurrency || fromCurrency === displayCurrency) return amount;
    const rate = lookupRate(fromCurrency, displayCurrency);
    return amount * rate;
  }, [displayCurrency, lookupRate]);

  // ─── Cache-first query ─────────────────────────────────
  const { data: rawData, isLoading: loading } = useCachedQuery({
    queryKey: ['sales', 'dashboard-v2', companyId, fromStr, toStr, selectedCurrency],
    queryFn: async () => {
      if (!companyId) return null;

      const [settingsRes, txsRes, customersCountRes] = await Promise.all([
        supabase.from('company_accounting_settings').select('supported_currencies').eq('company_id', companyId).single(),
        supabase.from('sales_transactions').select('id, stage, customer_id, customer_name, currency, total_amount, created_at').eq('company_id', companyId),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      ]);

      const availableCurrencies = settingsRes.data?.supported_currencies || [];
      const allRows = txsRes.data || [];
      const totalCustomers = customersCountRes.count || 0;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const yearStart = startOfYear(now);
      const fromDate = dateRange?.from || monthStart;
      const toDate = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(now);

      const dateFiltered = allRows.filter(r => {
        const d = new Date(r.created_at);
        return d >= fromDate && d <= toDate;
      });

      const thisMonthRows = allRows.filter(r => new Date(r.created_at) >= monthStart);
      const totalSalesMonth = thisMonthRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);

      const lastMonthRows = allRows.filter(r => {
        const d = new Date(r.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      });
      const totalSalesLastMonth = lastMonthRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);

      const yearRows = allRows.filter(r => new Date(r.created_at) >= yearStart);
      const totalSalesYear = yearRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);

      const totalInvoices = dateFiltered.length;
      const total = dateFiltered.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      const avgInvoice = dateFiltered.length > 0 ? total / dateFiltered.length : 0;

      const unpaid = allRows.filter(r => r.stage === 'posted' || r.stage === 'partial_paid' || r.stage === 'confirmed' || r.stage === 'delivered');
      const unpaidBalance = unpaid.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      const unpaidCount = unpaid.length;

      const pendingOrders = allRows.filter(r => r.stage === 'draft' || r.stage === 'confirmed').length;
      const uniqueCustomers = new Set(dateFiltered.map(r => r.customer_id).filter(Boolean));
      const activeCustomers = uniqueCustomers.size;

      // Monthly sparkline data (last 6 months)
      const monthlyData: { label: string; total: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const label = new Intl.DateTimeFormat(language === 'ar' ? 'ar-u-nu-latn' : 'en-US', { month: 'short' }).format(d);
        const mRows = allRows.filter(r => {
          const rd = new Date(r.created_at);
          return rd >= mStart && rd <= mEnd && r.stage !== 'cancelled';
        });
        const mTotal = mRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
        monthlyData.push({ label, total: mTotal, count: mRows.length });
      }

      // Recent transactions
      const sorted = [...dateFiltered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const recent = sorted.slice(0, 8).map(r => ({
        id: r.id, stage: r.stage,
        customerName: r.customer_name || 'Customer',
        amount: convertAmount(Number(r.total_amount || 0), r.currency),
        currency: r.currency,
        date: format(new Date(r.created_at), 'yyyy-MM-dd'),
      }));

      // Top customers
      const customerMap = new Map<string, { name: string; total: number; count: number }>();
      dateFiltered.forEach(r => {
        const key = r.customer_id || r.customer_name || 'unknown';
        const existing = customerMap.get(key) || { name: r.customer_name || (isAr ? 'عميل' : 'Customer'), total: 0, count: 0 };
        existing.total += convertAmount(Number(r.total_amount || 0), r.currency);
        existing.count++;
        customerMap.set(key, existing);
      });
      const topCustomers = [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

      return {
        availableCurrencies, totalCustomers, totalSalesMonth, totalSalesLastMonth,
        totalSalesYear, avgInvoice, unpaidBalance, unpaidCount, totalInvoices,
        pendingOrders, activeCustomers, monthly: monthlyData, recent, topCustomers,
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  // Derive stats
  const availableCurrencies = rawData?.availableCurrencies ?? [];
  const totalSalesMonth = rawData?.totalSalesMonth ?? 0;
  const totalSalesLastMonth = rawData?.totalSalesLastMonth ?? 0;
  const totalSalesYear = rawData?.totalSalesYear ?? 0;
  const avgInvoice = rawData?.avgInvoice ?? 0;
  const unpaidBalance = rawData?.unpaidBalance ?? 0;
  const unpaidCount = rawData?.unpaidCount ?? 0;
  const totalInvoices = rawData?.totalInvoices ?? 0;
  const pendingOrders = rawData?.pendingOrders ?? 0;
  const activeCustomers = rawData?.activeCustomers ?? 0;
  const totalCustomers = rawData?.totalCustomers ?? 0;
  const monthly = rawData?.monthly ?? [];
  const recent = rawData?.recent ?? [];
  const topCustomers = rawData?.topCustomers ?? [];

  // Auto-select single currency
  useEffect(() => {
    if (availableCurrencies.length === 1 && selectedCurrency === 'all') {
      setSelectedCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, selectedCurrency]);

  // Realtime
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('sales-dashboard-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_transactions', filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard-v2'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, queryClient]);

  // Last sync
  const [lastSync, setLastSync] = useState<Date | null>(null);
  useEffect(() => { if (!loading && rawData) setLastSync(new Date()); }, [rawData, loading]);

  const pctChange = totalSalesLastMonth > 0 ? ((totalSalesMonth - totalSalesLastMonth) / totalSalesLastMonth * 100) : 0;

  // ─── Sparklines ────────────────────────────────────────
  const salesSparkline = monthly.map(m => m.total);

  function computeDelta(arr: number[]): number | undefined {
    if (arr.length < 2) return undefined;
    const prev = arr[arr.length - 2];
    const curr = arr[arr.length - 1];
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }

  const currencyBreakdown = [{ key: displayCurrency, label: displayCurrency, pct: 100 }];

  // ─── KPI items ────────────────────────────────────────
  const kpis: KpiItem[] = [
    { id: 'month-sales',   label: t('salesDashboard.thisMonth'),     value: totalSalesMonth,  currency: displayCurrency, icon: ShoppingCart,   color: '#10B981',
      sparkline: salesSparkline, deltaPct: computeDelta(salesSparkline), breakdown: currencyBreakdown },
    { id: 'year-sales',    label: t('salesDashboard.thisYear'),      value: totalSalesYear,   currency: displayCurrency, icon: TrendingUp,     color: '#3B82F6',
      breakdown: currencyBreakdown },
    { id: 'avg-invoice',   label: t('salesDashboard.avgInvoice'),    value: avgInvoice,       currency: displayCurrency, icon: BarChart3,      color: '#8B5CF6',
      breakdown: currencyBreakdown },
    { id: 'uncollected',   label: t('salesDashboard.uncollected'),   value: unpaidBalance,    currency: displayCurrency, icon: AlertTriangle,  color: '#F59E0B',
      suffix: unpaidCount > 0 ? `${unpaidCount} ${isAr ? 'فاتورة' : 'invoices'}` : undefined,
      secondaryLabel: unpaidCount > 0 ? (isAr ? '⚠ تحتاج تحصيل' : '⚠ Needs collection') : (isAr ? '✓ لا مستحقات' : '✓ All collected'),
      secondaryTone: unpaidCount > 0 ? 'warning' : 'success', breakdown: currencyBreakdown },
    { id: 'total-invoices', label: t('salesDashboard.totalInvoices'), value: totalInvoices,    icon: Hash,        color: '#64748b' },
    { id: 'pending',       label: t('salesDashboard.pendingOrders'),  value: pendingOrders,    icon: Clock,       color: '#ea580c',
      secondaryLabel: pendingOrders > 0 ? (isAr ? '⚠ طلبات معلّقة' : '⚠ Pending orders') : (isAr ? '✓ لا طلبات' : '✓ No pending'),
      secondaryTone: pendingOrders > 0 ? 'warning' : 'success' },
    { id: 'customers',     label: t('salesDashboard.activeCustomers'), value: activeCustomers, icon: Users,       color: '#0d9488',
      suffix: `/ ${totalCustomers} ${isAr ? 'إجمالي' : 'total'}` },
    { id: 'top-customer',  label: t('salesDashboard.topCustomer'),   value: topCustomers[0]?.total || 0, currency: displayCurrency, icon: Star, color: '#0ea5e9',
      suffix: topCustomers[0]?.name || '-' },
  ];

  // ─── Recent Sales → ListItem ──────────────────────────
  const recentListItems: ListItem[] = recent.map((tx) => ({
    id: tx.id,
    title: tx.customerName,
    subtitle: tx.date,
    value: tx.amount,
    icon: ShoppingCart,
    iconClassName: STAGE_META[tx.stage]?.badge || 'bg-stone-100 text-stone-500',
    tags: [{
      label: t(STAGE_META[tx.stage]?.key || 'stages.draft'),
      className: STAGE_META[tx.stage]?.badge || 'bg-stone-100 text-stone-600',
    }],
  }));

  // ─── Top Customers → ListItem ─────────────────────────
  const customerListItems: ListItem[] = topCustomers.map((c, i) => ({
    id: `customer-${i}`,
    rank: i + 1,
    title: c.name,
    subtitle: `${c.count} ${t('salesDashboard.invoices')}`,
    value: c.total,
    valueSub: `${sym} ${Math.round(c.total).toLocaleString()}`,
  }));

  // ─── Hero config ──────────────────────────────────────
  const heroConfig = {
    label: t('salesDashboard.title'),
    value: totalInvoices,
    valueSuffix: isAr ? 'فاتورة مبيعات' : 'sales invoices',
    badges: [
      { label: `${sym} ${totalSalesMonth.toLocaleString()} ${isAr ? 'هذا الشهر' : 'this month'}`, tone: 'success' as const },
      ...(pendingOrders > 0 ? [{ label: `${pendingOrders} ${isAr ? 'معلّقة' : 'pending'}`, tone: 'warning' as const }] : []),
    ],
    secondaryLabel: isAr ? 'الفترة' : 'Period',
    secondaryValue: `${fromStr} → ${toStr}`,
    lastSync,
    isFetching: loading,
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
          <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">{isAr ? 'العملة' : 'Currency'}</label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-full bg-white/10 backdrop-blur-sm h-9 text-xs border-stone-700 text-white hover:bg-white/15 transition-colors">
              <Coins className="w-3.5 h-3.5 me-1.5 text-emerald-400" />
              <SelectValue placeholder={t('salesDashboard.allCurrencies')} />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.length > 1 && (
                <SelectItem value="all">🌍 {t('salesDashboard.allConverted')}</SelectItem>
              )}
              {availableCurrencies.map((c: string) => {
                const m = CURRENCY_META[c];
                return (
                  <SelectItem key={c} value={c}>
                    {m?.flag || '🏳️'} {language === 'ar' ? m?.nameAr : m?.nameEn} ({c})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </>
    ),
  };

  // ─── Chart ─────────────────────────────────────────────
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
    legend: { data: [isAr ? 'المبيعات' : 'Sales'], textStyle: { color: textColor, fontSize: 11 }, top: 0, right: isRTL ? 'auto' : 8, left: isRTL ? 8 : 'auto' },
    grid: { left: '1%', right: '1%', bottom: '1%', top: '14%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: monthly.map(d => d.label), axisLabel: { color: textColor, fontSize: 10 }, axisLine: { lineStyle: { color: gridColor } }, inverse: isRTL },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }, axisLabel: { color: textColor, fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v } },
    series: [
      { name: isAr ? 'المبيعات' : 'Sales', type: 'line', smooth: 0.4, lineStyle: { width: 2, color: '#10B981' }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#10B981' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.18)' }, { offset: 1, color: 'rgba(16,185,129,0)' }] } }, data: monthly.map(d => d.total) },
    ],
  }), [monthly, isDark, isAr, isRTL, textColor, gridColor]);

  // ════════════════════════════════════════════════════════
  return (
    <div className="space-y-5" dir={direction}>
      {/* ─── Hero (shared DashboardHero) ─── */}
      <DashboardHero config={heroConfig} loading={loading && !rawData} />

      {/* ─── KPIs (shared KpiGrid) ─── */}
      <KpiGrid kpis={kpis} loading={loading && !rawData} cols={4} />

      {/* ─── Chart + Top Customers ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title={`📈 ${t('salesDashboard.monthlySales')}`}
          className="lg:col-span-2"
          action={selectedCurrency === 'all' ? (
            <span className="text-[10px] text-stone-400">({isAr ? 'محوّل إلى' : 'Converted →'} {displayCurrency})</span>
          ) : undefined}
        >
          <ReactECharts option={chartOption} style={{ height: '300px', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
        </SectionCard>

        <SectionCard
          title={isAr ? '⭐ أفضل العملاء' : '⭐ Top Customers'}
          action={<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">{topCustomers.length}</span>}
          noPadding
        >
          <ListPanel
            items={customerListItems}
            loading={loading && !rawData}
            currency={displayCurrency}
            emptyTitle={isAr ? 'لا توجد بيانات' : 'No data'}
          />
        </SectionCard>
      </div>

      {/* ─── Recent Sales ─── */}
      <SectionCard
        title={t('salesDashboard.recentSales')}
        action={<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">{totalInvoices}</span>}
        noPadding
      >
        <ListPanel
          items={recentListItems}
          loading={loading && !rawData}
          showRank={false}
          currency={displayCurrency}
          emptyTitle={isAr ? 'لا توجد مبيعات في هذه الفترة' : 'No sales in this period'}
        />
      </SectionCard>
    </div>
  );
}
