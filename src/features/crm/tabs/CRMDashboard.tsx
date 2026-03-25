/**
 * ════════════════════════════════════════════════════════════════
 * 👥 CRMDashboard — لوحة إدارة العملاء (Glass Design)
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Same Glass pattern — filters below header
 *   - Header gradient (navy → sky)
 *   - 8 KPI glass cards
 *   - Customer growth chart + Top customers
 *   - Recent activity + Realtime
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
  Users, UserPlus, UserCheck, TrendingUp, Clock,
  RefreshCw, Calendar, Star, DollarSign, Coins,
  FileText, Phone, Mail, CreditCard, AlertTriangle,
  BarChart3, Hash, ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═════════════════════════════════════════════════════════════
export default function CRMDashboard() {
  const { t, language, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isAr = language === 'ar';
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
  const { lookupRate } = useExchangeRateLookup();

  // Currency
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try { return localStorage.getItem('crm_dashboard_currency') || 'all'; } catch { return 'all'; }
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
  const sym = getCurrencySymbol(displayCurrency);

  // Date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    try {
      const saved = localStorage.getItem('crm_dashboard_daterange');
      if (saved) {
        const p = JSON.parse(saved);
        return { from: p.from ? new Date(p.from) : startOfMonth(new Date()), to: p.to ? new Date(p.to) : new Date() };
      }
    } catch { }
    return { from: startOfMonth(new Date()), to: new Date() };
  });

  useEffect(() => { try { localStorage.setItem('crm_dashboard_currency', selectedCurrency); } catch {} }, [selectedCurrency]);
  useEffect(() => {
    try { localStorage.setItem('crm_dashboard_daterange', JSON.stringify({ from: dateRange?.from?.toISOString(), to: dateRange?.to?.toISOString() })); } catch {}
  }, [dateRange]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // KPIs
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newCustomersMonth, setNewCustomersMonth] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [avgCustomerValue, setAvgCustomerValue] = useState(0);
  const [totalSalesVolume, setTotalSalesVolume] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [topCustomerName, setTopCustomerName] = useState('-');
  const [topCustomerAmount, setTopCustomerAmount] = useState(0);
  const [monthly, setMonthly] = useState<{ label: string; count: number }[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<{ id: string; name: string; phone: string; email: string; created_at: string; total_sales: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; total: number; count: number }[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Convert
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!amount || !fromCurrency || fromCurrency === displayCurrency) return amount;
    return amount * lookupRate(fromCurrency, displayCurrency);
  }, [displayCurrency, lookupRate]);

  // ─── Fetch ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      // ⚡ Parallel fetch: all 3 queries at once
      const [settingsRes, customersRes, salesRes] = await Promise.all([
        supabase.from('company_accounting_settings').select('supported_currencies').eq('company_id', companyId).single(),
        supabase.from('customers').select('id, name_ar, name_en, phone, email, created_at').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('sales_transactions').select('customer_id, customer_name, total_amount, currency, stage, created_at').eq('company_id', companyId),
      ]);

      if (settingsRes.data?.supported_currencies) setAvailableCurrencies(settingsRes.data.supported_currencies);

      const now = new Date();
      const monthStart = startOfMonth(now);

      const allCustomers = customersRes.data || [];
      setTotalCustomers(allCustomers.length);

      // New this month
      const newThisMonth = allCustomers.filter(c => new Date(c.created_at) >= monthStart);
      setNewCustomersMonth(newThisMonth.length);

      // Recent 8
      setRecentCustomers(allCustomers.slice(0, 8).map(c => ({
        id: c.id,
        name: isAr ? (c.name_ar || c.name_en || '-') : (c.name_en || c.name_ar || '-'),
        phone: c.phone || '-',
        email: c.email || '-',
        created_at: c.created_at ? format(new Date(c.created_at), 'yyyy-MM-dd') : '-',
        total_sales: 0,
      })));

      // Sales data for customer analytics
      const sales = salesRes.data || [];

      // Active customers (have transactions)
      const activeIds = new Set(sales.map(s => s.customer_id).filter(Boolean));
      setActiveCustomers(activeIds.size);

      // Total sales volume
      const totalVol = sales.reduce((s, tx) => s + convertAmount(Number(tx.total_amount || 0), tx.currency), 0);
      setTotalSalesVolume(totalVol);
      setAvgCustomerValue(activeIds.size > 0 ? totalVol / activeIds.size : 0);

      // Receivables (unpaid)
      const unpaid = sales.filter(s => s.stage === 'posted' || s.stage === 'partial_paid' || s.stage === 'confirmed' || s.stage === 'delivered');
      const recvTotal = unpaid.reduce((s, tx) => s + convertAmount(Number(tx.total_amount || 0), tx.currency), 0);
      setTotalReceivables(recvTotal);
      setOverdueCount(unpaid.length);

      // Top customer by sales
      const customerMap = new Map<string, { name: string; total: number; count: number }>();
      sales.forEach(tx => {
        const key = tx.customer_id || tx.customer_name || 'unknown';
        const existing = customerMap.get(key) || { name: tx.customer_name || (isAr ? 'عميل' : 'Customer'), total: 0, count: 0 };
        existing.total += convertAmount(Number(tx.total_amount || 0), tx.currency);
        existing.count++;
        customerMap.set(key, existing);
      });
      const sortedCustomers = [...customerMap.values()].sort((a, b) => b.total - a.total);
      setTopCustomers(sortedCustomers.slice(0, 5));
      if (sortedCustomers[0]) {
        setTopCustomerName(sortedCustomers[0].name);
        setTopCustomerAmount(sortedCustomers[0].total);
      }

      // Monthly new customers (6 months)
      const monthlyData: { label: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const label = new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-US', { month: 'short' }).format(d);
        const count = allCustomers.filter(c => {
          const cd = new Date(c.created_at);
          return cd >= mStart && cd <= mEnd;
        }).length;
        monthlyData.push({ label, count });
      }
      setMonthly(monthlyData);

    } catch (err) {
      console.error('CRM dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, isAr, convertAmount]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('crm-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `company_id=eq.${companyId}` }, () => {
        setIsLive(true);
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchData]);



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
                      <span style="font-weight:bold;font-family:monospace">${Number(item.value).toLocaleString()} ${isAr ? 'عميل' : 'customers'}</span>
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
          axisLabel: { color: textColor, fontSize: 11, fontFamily: 'monospace' },
          minInterval: 1
      },
      series: [
          {
              name: isAr ? 'عملاء جدد' : 'New Customers',
              type: 'line', smooth: 0.5,
              lineStyle: { width: 2.5, color: '#0EA5E9' },
              symbol: 'circle', symbolSize: 6,
              itemStyle: { color: '#0EA5E9', borderColor: '#fff', borderWidth: 2 },
              areaStyle: {
                  color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: 'rgba(14,165,233,0.25)' }, { offset: 1, color: 'rgba(14,165,233,0.01)' }]
                  }
              },
              data: monthly.map(d => d.count)
          }
      ]
  };

  // Loading
  if (loading && !recentCustomers.length) {
    return (
      <div className="space-y-6" dir={direction}>
        <div className="bg-gradient-to-r from-erp-navy via-sky-800 to-erp-navy p-6 rounded-2xl animate-pulse h-24" />
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-96" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6" dir={direction}>
      {/* ─ Header — Glass Gradient (Navy → Sky) ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-sky-800 to-erp-navy p-6 rounded-2xl shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-sky-400/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-sky-400/10 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Users className="w-6 h-6 text-sky-400" />
              </div>
              <h1 className="text-2xl font-bold text-white font-cairo">
                {isAr ? 'لوحة إدارة العملاء' : 'Customer Management'}
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
            </div>
            <p className="text-sm text-sky-200/80 font-tajawal ps-12">
              {isAr ? 'نظرة عامة على العملاء والذمم والنشاط' : 'Overview of customers, receivables, and activity'}
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
                <Coins className="w-4 h-4 me-2 text-sky-400" />
                <SelectValue placeholder={isAr ? 'كل العملات' : 'All Currencies'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌍 {isAr ? 'كل العملات (محوّلة)' : 'All (Converted)'}</SelectItem>
                {availableCurrencies.map(c => {
                  const m = CURRENCY_META[c];
                  return <SelectItem key={c} value={c}>{m?.flag || '🏳️'} {isAr ? m?.nameAr : m?.nameEn} ({c})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─ KPIs Row 1 — Customer Metrics (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={isAr ? 'إجمالي العملاء' : 'Total Customers'}
          value={totalCustomers}
          type="info"
          icon={Users}
          className="bg-gradient-to-br from-sky-50/80 to-blue-50/50 dark:from-sky-950/30 dark:to-blue-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'عملاء جدد (الشهر)' : 'New This Month'}
          value={newCustomersMonth}
          type="positive"
          icon={UserPlus}
          className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'عملاء نشطين' : 'Active Customers'}
          value={`${activeCustomers}/${totalCustomers}`}
          type="positive"
          icon={UserCheck}
          className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'ذمم مدينة' : 'Receivables'}
          value={totalReceivables}
          type={totalReceivables > 0 ? 'negative' : 'neutral'}
          icon={AlertTriangle}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          suffix={overdueCount > 0 ? `(${overdueCount})` : ''}
          className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
        />
      </StatsGrid>

      {/* ─ KPIs Row 2 — Financial (Glass) ── */}
      <StatsGrid cols={4}>
        <StatCard
          label={isAr ? 'إجمالي المبيعات' : 'Total Sales'}
          value={totalSalesVolume}
          type="positive"
          icon={ShoppingCart}
          formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
          className="bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'متوسط قيمة العميل' : 'Avg. Customer Value'}
          value={avgCustomerValue}
          type="neutral"
          icon={BarChart3}
          formatValue={(val) => `${sym} ${Math.round(Number(val)).toLocaleString()}`}
          className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'أفضل عميل' : 'Top Customer'}
          value={topCustomerName}
          type="info"
          icon={Star}
          suffix={topCustomerAmount > 0 ? `${sym} ${Math.round(topCustomerAmount).toLocaleString()}` : ''}
          className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          label={isAr ? 'فواتير غير محصّلة' : 'Unpaid Invoices'}
          value={overdueCount}
          type="warning"
          icon={Clock}
          className="bg-gradient-to-br from-red-50/80 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/20 backdrop-blur-sm border border-red-100/50 dark:border-red-800/30 shadow-sm hover:shadow-md transition-all"
        />
      </StatsGrid>

      {/* ─ Charts Row (Glass) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Customers Chart — 2 cols */}
        <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
            <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              {isAr ? 'العملاء الجدد شهرياً' : 'New Customers Monthly'}
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
                    )}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-tajawal truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-400">{c.count} {isAr ? 'فاتورة' : 'invoices'}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-sky-600 shrink-0">
                    {sym} {Math.round(c.total).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─ Recent Customers (Glass) ── */}
      <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
        <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
          <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-sky-500" />
            {isAr ? 'آخر العملاء المضافين' : 'Recently Added Customers'}
          </CardTitle>
          <Badge variant="secondary" className="text-[11px] font-mono bg-sky-50 text-sky-600 border-0">
            {totalCustomers} {isAr ? 'عميل' : 'customers'}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
            {recentCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-tajawal">
                {isAr ? 'لا يوجد عملاء بعد' : 'No customers yet'}
              </div>
            ) : (
              recentCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-tajawal font-medium truncate">{c.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.phone !== '-' && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        )}
                        {c.email !== '-' && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Mail className="w-3 h-3" /> {c.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-end shrink-0 ms-4">
                    <p className="text-[11px] text-gray-400 font-mono">{c.created_at}</p>
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
