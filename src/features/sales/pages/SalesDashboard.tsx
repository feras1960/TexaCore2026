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
const STAGE_META: Record<string, { ar: string; en: string; badge: string; color: string }> = {
  draft: { ar: 'مسودة', en: 'Draft', badge: 'bg-gray-100 text-gray-700', color: '#9CA3AF' },
  confirmed: { ar: 'مؤكدة', en: 'Confirmed', badge: 'bg-blue-100 text-blue-800', color: '#3B82F6' },
  delivered: { ar: 'مسلّمة', en: 'Delivered', badge: 'bg-sky-100 text-sky-800', color: '#0EA5E9' },
  posted: { ar: 'مرحّلة', en: 'Posted', badge: 'bg-emerald-100 text-emerald-800', color: '#10B981' },
  partial_paid: { ar: 'دفع جزئي', en: 'Partial Paid', badge: 'bg-amber-100 text-amber-800', color: '#F59E0B' },
  paid: { ar: 'مدفوعة', en: 'Paid', badge: 'bg-green-100 text-green-800', color: '#059669' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled', badge: 'bg-red-100 text-red-800', color: '#EF4444' },
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

  // Currency
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try { return localStorage.getItem('sales_dashboard_currency') || 'all'; } catch { return 'all'; }
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
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

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // KPIs
  const [totalSalesMonth, setTotalSalesMonth] = useState(0);
  const [totalSalesLastMonth, setTotalSalesLastMonth] = useState(0);
  const [totalSalesYear, setTotalSalesYear] = useState(0);
  const [avgInvoice, setAvgInvoice] = useState(0);
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [monthly, setMonthly] = useState<{ label: string; total: number; count: number }[]>([]);
  const [recent, setRecent] = useState<{ id: string; stage: string; customerName: string; amount: number; currency: string; date: string }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; total: number; count: number }[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Convert
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!amount || !fromCurrency || fromCurrency === displayCurrency) return amount;
    const rate = lookupRate(fromCurrency, displayCurrency);
    return amount * rate;
  }, [displayCurrency, lookupRate]);

  // ─── Fetch ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!companyId) return;
    // ⚡ No setLoading(true) — render dashboard structure immediately

    try {
      // ⚡ Parallel fetch: all 3 queries at once
      const [settingsRes, txsRes, customersCountRes] = await Promise.all([
        supabase.from('company_accounting_settings').select('supported_currencies').eq('company_id', companyId).single(),
        supabase.from('sales_transactions').select('id, stage, customer_id, customer_name, currency, total_amount, created_at').eq('company_id', companyId),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      ]);

      if (settingsRes.data?.supported_currencies) setAvailableCurrencies(settingsRes.data.supported_currencies);
      const allRows = txsRes.data || [];
      setTotalCustomers(customersCountRes.count || 0);

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

      // This month
      const thisMonthRows = allRows.filter(r => new Date(r.created_at) >= monthStart);
      const thisMonthTotal = thisMonthRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      setTotalSalesMonth(thisMonthTotal);

      // Last month
      const lastMonthRows = allRows.filter(r => {
        const d = new Date(r.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      });
      const lastMonthTotal = lastMonthRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      setTotalSalesLastMonth(lastMonthTotal);

      // This year
      const yearRows = allRows.filter(r => new Date(r.created_at) >= yearStart);
      const yearTotal = yearRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      setTotalSalesYear(yearTotal);

      // By date range
      setTotalInvoices(dateFiltered.length);
      const total = dateFiltered.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      setAvgInvoice(dateFiltered.length > 0 ? total / dateFiltered.length : 0);

      // Unpaid
      const unpaid = allRows.filter(r => r.stage === 'posted' || r.stage === 'partial_paid' || r.stage === 'confirmed' || r.stage === 'delivered');
      const unpaidTotal = unpaid.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
      setUnpaidBalance(unpaidTotal);
      setUnpaidCount(unpaid.length);

      // Pending
      setPendingOrders(allRows.filter(r => r.stage === 'draft' || r.stage === 'confirmed').length);

      // Customers
      const uniqueCustomers = new Set(dateFiltered.map(r => r.customer_id).filter(Boolean));
      setActiveCustomers(uniqueCustomers.size);

      // Monthly (6 months)
      const monthlyData: { label: string; total: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const label = new Intl.DateTimeFormat(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short' }).format(d);
        const mRows = allRows.filter(r => {
          const rd = new Date(r.created_at);
          return rd >= mStart && rd <= mEnd && r.stage !== 'cancelled';
        });
        const mTotal = mRows.reduce((s, r) => s + convertAmount(Number(r.total_amount || 0), r.currency), 0);
        monthlyData.push({ label, total: mTotal, count: mRows.length });
      }
      setMonthly(monthlyData);

      // Recent 8
      const sorted = [...dateFiltered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecent(sorted.slice(0, 8).map(r => ({
        id: r.id,
        stage: r.stage,
        customerName: r.customer_name || (isAr ? 'عميل' : 'Customer'),
        amount: convertAmount(Number(r.total_amount || 0), r.currency),
        currency: r.currency,
        date: format(new Date(r.created_at), 'yyyy-MM-dd'),
      })));

      // Top 5 customers
      const customerMap = new Map<string, { name: string; total: number; count: number }>();
      dateFiltered.forEach(r => {
        const key = r.customer_id || r.customer_name || 'unknown';
        const existing = customerMap.get(key) || { name: r.customer_name || (isAr ? 'عميل' : 'Customer'), total: 0, count: 0 };
        existing.total += convertAmount(Number(r.total_amount || 0), r.currency);
        existing.count++;
        customerMap.set(key, existing);
      });
      setTopCustomers(
        [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 5)
      );
    } catch (err) {
      console.error('Sales dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange, isAr, convertAmount]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('sales-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_transactions', filter: `company_id=eq.${companyId}` }, () => {
        setIsLive(true);
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchData]);



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
              name: isAr ? 'المبيعات' : 'Sales',
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
                {isAr ? 'لوحة المبيعات' : 'Sales Dashboard'}
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
            </div>
            <p className="text-sm text-emerald-200/80 font-tajawal ps-12">
              {isAr ? 'نظرة عامة على عمليات البيع والعملاء' : 'Overview of sales operations and customers'}
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
                <SelectValue placeholder={isAr ? 'كل العملات' : 'All Currencies'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  🌍 {isAr ? 'كل العملات (محوّلة)' : 'All (Converted)'}
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
      </div>

      {/* ─ KPIs Row 1 — Financial (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={isAr ? 'مبيعات الشهر' : 'This Month'}
          value={totalSalesMonth}
          type="positive"
          change={pctChange ? Number(pctChange.toFixed(1)) : undefined}
          changeLabel={isAr ? 'عن الشهر السابق' : 'vs last month'}
          icon={ShoppingCart}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'مبيعات السنة' : 'This Year'}
          value={totalSalesYear}
          type="info"
          icon={TrendingUp}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'متوسط الفاتورة' : 'Avg. Invoice'}
          value={avgInvoice}
          type="neutral"
          icon={BarChart3}
          formatValue={(val) => `${sym} ${Math.round(Number(val)).toLocaleString()}`}
          className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'غير محصّل' : 'Uncollected'}
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
          label={isAr ? 'إجمالي الفواتير' : 'Total Invoices'}
          value={totalInvoices}
          type="neutral"
          icon={Hash}
          className="bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/30 dark:to-gray-950/20 backdrop-blur-sm border border-slate-100/50 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'طلبات معلقة' : 'Pending Orders'}
          value={pendingOrders}
          type="warning"
          icon={Clock}
          className="bg-gradient-to-br from-yellow-50/80 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/20 backdrop-blur-sm border border-yellow-100/50 dark:border-yellow-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'العملاء النشطين' : 'Active Customers'}
          value={`${activeCustomers}/${totalCustomers}`}
          type="positive"
          icon={Users}
          className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 backdrop-blur-sm border border-teal-100/50 dark:border-teal-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'أعلى عميل' : 'Top Customer'}
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
              {isAr ? 'المبيعات الشهرية' : 'Monthly Sales'}
              {selectedCurrency === 'all' && (
                <span className="text-[10px] text-gray-400 font-normal font-tajawal">
                  ({isAr ? 'محوّلة' : 'converted'} → {displayCurrency})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <div className="w-full min-h-[280px]">
              {monthly.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400">{isAr ? 'جاري تحميل البيانات...' : 'Loading data...'}</p>
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
              {isAr ? 'أفضل العملاء' : 'Top Customers'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-center text-gray-400 text-sm font-tajawal py-4">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
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
                      <p className="text-[11px] text-gray-400">{c.count} {isAr ? 'فاتورة' : 'invoices'}</p>
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
            {isAr ? 'آخر عمليات البيع' : 'Recent Sales'}
          </CardTitle>
          <Badge variant="secondary" className="text-[11px] font-mono bg-emerald-50 text-emerald-600 border-0">
            {totalInvoices} {isAr ? 'فاتورة' : 'invoices'}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-tajawal">
                {isAr ? 'لا توجد مبيعات في هذه الفترة' : 'No sales in this period'}
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
                          {isAr ? STAGE_META[tx.stage]?.ar : STAGE_META[tx.stage]?.en || tx.stage}
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
