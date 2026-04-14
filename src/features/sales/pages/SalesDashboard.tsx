/**
 * ════════════════════════════════════════════════════════════════
 * 💰 SalesDashboard — لوحة المبيعات (Glass Design)
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Same Glass pattern as AccountingDashboard / PurchasesDashboard
 *   - Header gradient (navy → emerald)
 *   - Filters below header (date + currency)
 *   - 8 KPI glass cards
 *   - Monthly sales chart
 *   - Recent transactions + top customers
 *   - Realtime updates
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsGrid, StatCard } from '@/components/shared/stats/StatCard';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfDay, startOfYear, format, subMonths } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { SafeChartContainer } from '@/components/ui/SafeChartContainer';
import {
  ShoppingCart, TrendingUp, TrendingDown, FileText, Clock,
  RefreshCw, Calendar, BarChart3, Users, DollarSign, Coins,
  Package, Star, CreditCard, AlertTriangle, Hash, Loader2,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Stage metadata ─────────────────────────────────────────
const STAGE_META: Record<string, { key: string; badge: string; color: string }> = {
  draft: { key: 'stages.draft', badge: 'bg-gray-100 text-gray-700', color: '#9CA3AF' },
  confirmed: { key: 'stages.confirmed', badge: 'bg-blue-100 text-blue-800', color: '#3B82F6' },
  delivered: { key: 'stages.delivered', badge: 'bg-sky-100 text-sky-800', color: '#0EA5E9' },
  posted: { key: 'stages.posted', badge: 'bg-emerald-100 text-emerald-800', color: '#10B981' },
  partial_paid: { key: 'stages.partial_paid', badge: 'bg-amber-100 text-amber-800', color: '#F59E0B' },
  paid: { key: 'stages.paid', badge: 'bg-green-100 text-green-800', color: '#059669' },
  cancelled: { key: 'stages.cancelled', badge: 'bg-red-100 text-red-800', color: '#EF4444' },
};
// ═════════════════════════════════════════════════════════════
export default function SalesDashboard() {
  const { t, language, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isAr = language === 'ar';
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency, currencySymbol: baseSymbol } = useCompanyCurrency(language as 'ar' | 'en');
  const { lookupRate } = useExchangeRateLookup();

  const queryClient = useQueryClient();

  // Currency
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try { return localStorage.getItem('sales_dashboard_currency') || 'all'; } catch { return 'all'; }
  });
  const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
  const sym = getCurrencySymbol(displayCurrency);

  // Date range
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

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Convert
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!amount || !fromCurrency || fromCurrency === displayCurrency) return amount;
    const rate = lookupRate(fromCurrency, displayCurrency);
    return amount * rate;
  }, [displayCurrency, lookupRate]);

  // Stable date strings for queryKey
  const fromDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const toDateStr = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  // ─── Cache-first query (IndexedDB persistence) ────────────
  const { data: rawData, isLoading: loading } = useCachedQuery({
    queryKey: ['sales', 'dashboard', companyId, fromDateStr, toDateStr, selectedCurrency],
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

      const monthlyData: { label: string; total: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const label = new Intl.DateTimeFormat(language === 'ar' ? 'ar-u-nu-latn' : language === 'ru' ? 'ru' : language === 'uk' ? 'uk' : language === 'tr' ? 'tr' : 'en-US', { month: 'short' }).format(d);
        const mRows = allRows.filter(r => {
          const rd = new Date(r.created_at);
          return rd >= mStart && rd <= mEnd && r.stage !== 'cancelled';
        });
        const mTotal = mRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
        monthlyData.push({ label, total: mTotal, count: mRows.length });
      }

      const sorted = [...dateFiltered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const recent = sorted.slice(0, 8).map(r => ({
        id: r.id, stage: r.stage,
        customerName: r.customer_name || 'Customer',
        amount: convertAmount(Number(r.total_amount || 0), r.currency),
        currency: r.currency,
        date: format(new Date(r.created_at), 'yyyy-MM-dd'),
      }));

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

  // Derive stats from cached data
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
  const isLive = true;

  // Realtime — invalidate cache
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('sales-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_transactions', filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, queryClient]);



  const pctChange = totalSalesLastMonth > 0 ? ((totalSalesMonth - totalSalesLastMonth) / totalSalesLastMonth * 100) : 0;

  // ─── Chart Options ───────────────────────────────────────────
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const mainChartOption = {
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
              const item = params[0];
              res += `
                  <div style="display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-top: 4px;">
                      <span><span style="display:inline-block;margin-right:4px;border-radius:50%;width:8px;height:8px;background-color:${item.color};"></span>${item.seriesName}</span>
                      <span style="font-weight:bold;font-family:monospace">${sym} ${Number(item.value).toLocaleString()}</span>
                  </div>
              `;
              return res;
          }
      },
      grid: { left: '2%', right: '2%', bottom: '2%', top: '15%', containLabel: true },
      xAxis: {
          type: 'category', boundaryGap: false,
          data: monthly.map(d => d.label),
          axisLabel: { color: textColor, fontSize: 11, fontFamily: 'Tajawal' },
          axisLine: { lineStyle: { color: gridColor } },
          splitLine: { show: false },
          inverse: direction === 'rtl',
      },
      yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
          axisLabel: { color: textColor, fontSize: 11, fontFamily: 'monospace', formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val },
      },
      series: [
          {
              name: t('salesDashboard.sales'),
              type: 'line', smooth: 0.5,
              lineStyle: { width: 2.5, color: '#10B981' },
              symbol: 'circle', symbolSize: 6,
              itemStyle: { color: '#10B981', borderColor: '#fff', borderWidth: 2 },
              areaStyle: {
                  color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.25)' }, { offset: 1, color: 'rgba(16,185,129,0.01)' }]
                  }
              },
              data: monthly.map(d => d.total)
          }
      ]
  };

  // ⚡ CACHE-FIRST: No blocking skeleton — dashboard renders immediately

  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6" dir={direction}>
      {/* ─ Header — Glass Gradient (Navy → Emerald) ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-emerald-800 to-erp-navy p-6 rounded-2xl shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <ShoppingCart className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-white font-cairo">
                {t('salesDashboard.title')}
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
            </div>
            <p className="text-sm text-emerald-200/80 font-tajawal ps-12">
              {t('salesDashboard.subtitle')}
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
                <Coins className="w-4 h-4 me-2 text-emerald-400" />
                <SelectValue placeholder={t('salesDashboard.allCurrencies')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  🌍 {t('salesDashboard.allConverted')}
                </SelectItem>
                {availableCurrencies.map(c => {
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
        </div>
      </div>

      {/* ─ KPIs Row 1 — Financial (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={t('salesDashboard.thisMonth')}
          value={totalSalesMonth}
          type="positive"
          change={pctChange ? Number(pctChange.toFixed(1)) : undefined}
          changeLabel={t('salesDashboard.vsLastMonth')}
          icon={ShoppingCart}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('salesDashboard.thisYear')}
          value={totalSalesYear}
          type="info"
          icon={TrendingUp}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('salesDashboard.avgInvoice')}
          value={avgInvoice}
          type="neutral"
          icon={BarChart3}
          formatValue={(val) => `${sym} ${Math.round(Number(val)).toLocaleString()}`}
          className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('salesDashboard.uncollected')}
          value={unpaidBalance}
          type={unpaidBalance > 0 ? 'negative' : 'neutral'}
          icon={AlertTriangle}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          suffix={unpaidCount > 0 ? `(${unpaidCount})` : ''}
          className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
        />
      </StatsGrid>

      {/* ─ KPIs Row 2 — Operational (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={t('salesDashboard.totalInvoices')}
          value={totalInvoices}
          type="neutral"
          icon={Hash}
          className="bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/30 dark:to-gray-950/20 backdrop-blur-sm border border-slate-100/50 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('salesDashboard.pendingOrders')}
          value={pendingOrders}
          type="warning"
          icon={Clock}
          className="bg-gradient-to-br from-yellow-50/80 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/20 backdrop-blur-sm border border-yellow-100/50 dark:border-yellow-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('salesDashboard.activeCustomers')}
          value={`${activeCustomers}/${totalCustomers}`}
          type="positive"
          icon={Users}
          className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 backdrop-blur-sm border border-teal-100/50 dark:border-teal-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={t('salesDashboard.topCustomer')}
          value={topCustomers[0]?.name || '-'}
          type="info"
          icon={Star}
          suffix={topCustomers[0] ? `${sym} ${Math.round(topCustomers[0].total).toLocaleString()}` : ''}
          className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/30 dark:to-cyan-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
        />
      </StatsGrid>

      {/* ─ Charts Row (Glass) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Chart — 2 cols */}
        <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
            <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              {t('salesDashboard.monthlySales')}
              {selectedCurrency === 'all' && (
                <span className="text-[10px] text-gray-400 font-normal font-tajawal">
                  ({t('salesDashboard.converted')} → {displayCurrency})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <div className="w-full min-h-[280px]">
              {monthly.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400">{t('salesDashboard.loadingData')}</p>
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

        {/* Top Customers — 1 col */}
        <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
          <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
            <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              {t('salesDashboard.topCustomers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-center text-gray-400 text-sm font-tajawal py-4">{t('salesDashboard.noData')}</p>
            ) : (
              topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                      i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-tajawal truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-400">{c.count} {t('salesDashboard.invoices')}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-600 shrink-0">
                    {sym} {Math.round(c.total).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─ Recent Transactions (Glass) ── */}
      <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
        <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
          <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            {t('salesDashboard.recentSales')}
          </CardTitle>
          <Badge variant="secondary" className="text-[11px] font-mono bg-emerald-50 text-emerald-600 border-0">
            {totalInvoices} {t('salesDashboard.invoices')}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-tajawal">
                {t('salesDashboard.noSalesInPeriod')}
              </div>
            ) : (
              recent.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("p-1.5 rounded-lg", STAGE_META[tx.stage]?.badge || 'bg-gray-100')}>
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-tajawal font-medium truncate">{tx.customerName}</span>
                        <Badge className={cn("text-[10px] px-1.5 py-0 h-4 font-tajawal", STAGE_META[tx.stage]?.badge)}>
                          {t(STAGE_META[tx.stage]?.key || 'stages.draft')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-end shrink-0 ms-4">
                    <p className="font-mono font-bold text-sm text-erp-navy dark:text-white">
                      {sym} {tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">{tx.date}</p>
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
