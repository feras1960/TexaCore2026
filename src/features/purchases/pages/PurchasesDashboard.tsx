/**
 * ════════════════════════════════════════════════════════════════
 * 📊 PurchasesDashboard v2 — uses shared dashboard-kit
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfDay } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import {
  DashboardHero, KpiGrid, SectionCard, ListPanel,
  type KpiItem, type ListItem,
} from '@/components/dashboard-kit';
import {
    ShoppingBag, FileText, Clock, AlertTriangle, Ship,
    Star, Coins, TrendingUp, Hash, BarChart3, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Metadata maps ──────────────────────────────────────────────
const STAGE_META: Record<string, { ar: string; en: string; badge: string; color: string }> = {
    draft: { ar: 'مسودة', en: 'Draft', badge: 'bg-gray-100 text-gray-700', color: '#9CA3AF' },
    confirmed: { ar: 'مؤكدة', en: 'Confirmed', badge: 'bg-blue-100 text-blue-800', color: '#3B82F6' },
    shipped: { ar: 'شُحنت', en: 'Shipped', badge: 'bg-violet-100 text-violet-800', color: '#8B5CF6' },
    received: { ar: 'مُستلمة', en: 'Received', badge: 'bg-sky-100 text-sky-800', color: '#0EA5E9' },
    posted: { ar: 'مرحّلة', en: 'Posted', badge: 'bg-emerald-100 text-emerald-800', color: '#10B981' },
    partial_paid: { ar: 'دفع جزئي', en: 'Partial Paid', badge: 'bg-amber-100 text-amber-800', color: '#F59E0B' },
    paid: { ar: 'مدفوعة', en: 'Paid', badge: 'bg-green-100 text-green-800', color: '#059669' },
    cancelled: { ar: 'ملغاة', en: 'Cancelled', badge: 'bg-red-100 text-red-800', color: '#EF4444' },
};

const CONTAINER_META: Record<string, { ar: string; en: string; color: string }> = {
    draft: { ar: 'مسودة', en: 'Draft', color: '#9CA3AF' },
    booked: { ar: 'تم الحجز', en: 'Booked', color: '#0EA5E9' },
    loading: { ar: 'جاري التحميل', en: 'Loading', color: '#D97706' },
    in_transit: { ar: 'بالبحر', en: 'In Transit', color: '#2563EB' },
    at_port: { ar: 'في الميناء', en: 'At Port', color: '#7C3AED' },
    customs: { ar: 'بالجمركة', en: 'Customs', color: '#EA580C' },
    cleared: { ar: 'تم التخليص', en: 'Cleared', color: '#059669' },
    in_receiving: { ar: 'قيد الاستلام', en: 'Receiving', color: '#0D9488' },
    received: { ar: 'تم الاستلام', en: 'Received', color: '#16A34A' },
    closed: { ar: 'مغلق', en: 'Closed', color: '#6B7280' },
};

// ═════════════════════════════════════════════════════════════════
export default function PurchasesDashboard() {
    const { t, language, direction } = useLanguage();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isAr = language === 'ar';
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency, currencySymbol: baseSymbol } = useCompanyCurrency(language as 'ar' | 'en');
    const { lookupRate, isLoading: ratesLoading } = useExchangeRateLookup();

    const queryClient = useQueryClient();

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Restore user preference from localStorage
    const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
        try { return localStorage.getItem('purchases_dashboard_currency') || 'all'; } catch { return 'all'; }
    });

    // Date Range Filter — default: start of current month → today
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        try {
            const saved = localStorage.getItem('purchases_dashboard_daterange');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    from: parsed.from ? new Date(parsed.from) : startOfMonth(new Date()),
                    to: parsed.to ? new Date(parsed.to) : new Date(),
                };
            }
        } catch { }
        return { from: startOfMonth(new Date()), to: new Date() };
    });

    // Save preferences
    useEffect(() => {
        try { localStorage.setItem('purchases_dashboard_currency', selectedCurrency); } catch { }
    }, [selectedCurrency]);
    useEffect(() => {
        try { localStorage.setItem('purchases_dashboard_daterange', JSON.stringify({ from: dateRange?.from?.toISOString(), to: dateRange?.to?.toISOString() })); } catch { }
    }, [dateRange]);

    // Display currency
    const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
    const sym = getCurrencySymbol(displayCurrency);
    const displayCurrencyLabel = selectedCurrency === 'all'
        ? `${t('purchasesDashboard.baseCurrency')} (${displayCurrency})`
        : displayCurrency;

    const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
        if (!amount || !fromCurrency) return amount;
        if (fromCurrency === displayCurrency) return amount;
        const rate = lookupRate(fromCurrency, displayCurrency);
        return amount * rate;
    }, [displayCurrency, lookupRate]);

    // Stable date strings for queryKey
    const fromDateStr = dateRange?.from?.toISOString()?.slice(0, 10) || '';
    const toDateStr = dateRange?.to?.toISOString()?.slice(0, 10) || '';

    // ─── Cache-first query (IndexedDB persistence) ────────────
    const { data: rawData, isLoading: loading } = useCachedQuery({
        queryKey: ['purchases', 'dashboard', companyId, fromDateStr, toDateStr, selectedCurrency],
        queryFn: async () => {
            if (!companyId) return null;

            const [txsRes, ctrsRes, supsRes] = await Promise.all([
                supabase.from('purchase_transactions').select('id, stage, supplier_id, supplier_name, currency, total_amount, created_at').eq('company_id', companyId),
                supabase.from('containers').select('id, status').eq('company_id', companyId),
                supabase.from('suppliers').select('id, name_ar, name_en').eq('company_id', companyId),
            ]);

            const allRows = txsRes.data || [];
            const containers = ctrsRes.data || [];
            const allSups = supsRes.data || [];

            const currs = [...new Set(allRows.map(r => r.currency).filter(Boolean))] as string[];
            const availableCurrencies = currs.length > 0
                ? (baseCurrency && !currs.includes(baseCurrency) ? [baseCurrency, ...currs] : currs) : [];

            const fromDate = dateRange?.from || startOfMonth(new Date());
            const toDate = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());
            const dateFilteredRows = allRows.filter(r => { const d = new Date(r.created_at); return d >= fromDate && d <= toDate; });

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            const thisMonthRows = allRows.filter(r => new Date(r.created_at) >= monthStart);
            const lastMonthRows = allRows.filter(r => { const d = new Date(r.created_at); return d >= lastMonthStart && d <= lastMonthEnd; });

            const totalPurchases = thisMonthRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            const totalLastMonth = lastMonthRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            const pendingOrders = dateFilteredRows.filter(r => r.stage === 'draft' || r.stage === 'confirmed').length;

            const unpaid = dateFilteredRows.filter(r => ['confirmed', 'posted', 'partial_paid'].includes(r.stage));
            const unpaidBalance = unpaid.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            const unpaidCount = unpaid.length;

            const totalInvoices = dateFilteredRows.length;
            const totalAllAmount = dateFilteredRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            const avgInvoiceValue = dateFilteredRows.length > 0 ? totalAllAmount / dateFilteredRows.length : 0;

            const yearStart = new Date(now.getFullYear(), 0, 1);
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
            const yearlyPurchases = allRows.filter(r => new Date(r.created_at) >= yearStart).reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            const yearlyPurchasesLastYear = allRows.filter(r => { const d = new Date(r.created_at); return d >= lastYearStart && d <= lastYearEnd; }).reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);

            const inTransit = containers.filter(c => !['received', 'closed'].includes(c.status)).length;
            const ctrMap: Record<string, number> = {};
            containers.forEach(c => { ctrMap[c.status] = (ctrMap[c.status] || 0) + 1; });
            const containerStatuses = Object.entries(ctrMap).map(([s, count]) => ({
                label: language === 'ar' ? (CONTAINER_META[s]?.ar || s) : (CONTAINER_META[s]?.en || s),
                count, color: CONTAINER_META[s]?.color || '#9CA3AF',
            }));

            const supMap: Record<string, string> = {};
            allSups?.forEach(s => { supMap[s.id] = language === 'ar' ? (s.name_ar || s.name_en || '') : (s.name_en || s.name_ar || ''); });
            const getSupName = (r: any) => supMap[r.supplier_id] || r.supplier_name || '';

            const supTotals: Record<string, { name: string; total: number; count: number }> = {};
            dateFilteredRows.forEach(r => {
                if (r.supplier_id) {
                    if (!supTotals[r.supplier_id]) supTotals[r.supplier_id] = { name: getSupName(r), total: 0, count: 0 };
                    supTotals[r.supplier_id].total += convertAmount(r.total_amount || 0, r.currency);
                    supTotals[r.supplier_id].count += 1;
                }
            });
            const activeSuppliers = new Set(dateFilteredRows.map(r => r.supplier_id).filter(Boolean)).size;
            const totalSuppliers = allSups?.length || 0;
            const topSuppliers = Object.values(supTotals)
                .map(d => ({ name: d.name || t('purchasesDashboard.supplier'), total: d.total, count: d.count }))
                .sort((a, b) => b.total - a.total).slice(0, 4);

            const mNames = language === 'ar'
                ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthly: { label: string; total: number; count: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                const mRows = allRows.filter(r => { const rd = new Date(r.created_at); return rd >= d && rd <= end; });
                monthly.push({ label: mNames[d.getMonth()], total: mRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0), count: mRows.length });
            }

            const stgMap: Record<string, { count: number; total: number }> = {};
            dateFilteredRows.forEach(r => { if (!stgMap[r.stage]) stgMap[r.stage] = { count: 0, total: 0 }; stgMap[r.stage].count++; stgMap[r.stage].total += convertAmount(r.total_amount || 0, r.currency); });
            const stages = Object.entries(stgMap).map(([s, d]) => ({
                stage: s, label: language === 'ar' ? (STAGE_META[s]?.ar || s) : (STAGE_META[s]?.en || s),
                count: d.count, total: d.total, color: STAGE_META[s]?.color || '#9CA3AF',
            }));

            const recentRows = [...allRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
            const recent = recentRows.map(r => ({
                id: r.id, stage: r.stage,
                supplierName: supMap[r.supplier_id] || r.supplier_name || t('purchasesDashboard.supplier'),
                amount: r.total_amount || 0, convertedAmount: convertAmount(r.total_amount || 0, r.currency),
                currency: r.currency || '', date: r.created_at,
            }));

            return {
                totalPurchases, totalLastMonth, pendingOrders, unpaidBalance, unpaidCount,
                inTransit, totalInvoices, avgInvoiceValue, yearlyPurchases, yearlyPurchasesLastYear,
                activeSuppliers, totalSuppliers, monthly, stages, containerStatuses, recent, topSuppliers,
                availableCurrencies,
            };
        },
        enabled: !!companyId,
        staleTime: 2 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });

    // Derive stats from cached data
    const availableCurrencies = rawData?.availableCurrencies ?? [];
    const totalPurchases = rawData?.totalPurchases ?? 0;
    const totalLastMonth = rawData?.totalLastMonth ?? 0;
    const pendingOrders = rawData?.pendingOrders ?? 0;
    const unpaidBalance = rawData?.unpaidBalance ?? 0;
    const unpaidCount = rawData?.unpaidCount ?? 0;
    const inTransit = rawData?.inTransit ?? 0;
    const totalInvoices = rawData?.totalInvoices ?? 0;
    const avgInvoiceValue = rawData?.avgInvoiceValue ?? 0;
    const yearlyPurchases = rawData?.yearlyPurchases ?? 0;
    const yearlyPurchasesLastYear = rawData?.yearlyPurchasesLastYear ?? 0;
    const activeSuppliers = rawData?.activeSuppliers ?? 0;
    const totalSuppliers = rawData?.totalSuppliers ?? 0;
    const monthly = rawData?.monthly ?? [];
    const stages = rawData?.stages ?? [];
    const containerStatuses = rawData?.containerStatuses ?? [];
    const recent = rawData?.recent ?? [];
    const topSuppliers = rawData?.topSuppliers ?? [];
    const isLive = true;

    // ─── Supabase Realtime — invalidate cache ───────────────────
    useEffect(() => {
        if (!companyId) return;
        const channel = supabase
            .channel('purchases-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_transactions', filter: `company_id=eq.${companyId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['purchases', 'dashboard'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'containers', filter: `company_id=eq.${companyId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['purchases', 'dashboard'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [companyId, queryClient]);
    const pctChange = totalLastMonth > 0 ? ((totalPurchases - totalLastMonth) / totalLastMonth * 100) : undefined;
    const yearlyPctChange = yearlyPurchasesLastYear > 0 ? ((yearlyPurchases - yearlyPurchasesLastYear) / yearlyPurchasesLastYear * 100) : undefined;

    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return t('purchasesDashboard.minutesAgo', { n: mins });
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return t('purchasesDashboard.hoursAgo', { n: hrs });
        return t('purchasesDashboard.daysAgo', { n: Math.floor(hrs / 24) });
    };

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
                name: t('purchasesDashboard.purchases'),
                type: 'line', smooth: 0.5,
                lineStyle: { width: 2.5, color: '#00D4AA' },
                symbol: 'circle', symbolSize: 6,
                itemStyle: { color: '#00D4AA', borderColor: '#fff', borderWidth: 2 },
                areaStyle: {
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(0,212,170,0.25)' }, { offset: 1, color: 'rgba(0,212,170,0.01)' }]
                    }
                },
                data: monthly.map(d => d.total)
            }
        ]
    };



    // ── Last sync tracking ──
    const [lastSync, setLastSync] = useState<Date | null>(null);
    useEffect(() => { if (!loading && rawData) setLastSync(new Date()); }, [rawData, loading]);

    const purchasesSparkline = monthly.map(m => m.total);
    function computeDelta(arr: number[]): number | undefined {
      if (arr.length < 2) return undefined;
      const prev = arr[arr.length - 2]; const curr = arr[arr.length - 1];
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    }
    const bk = [{ key: displayCurrency, label: displayCurrency, pct: 100 }];

    // ── KPI items ──
    const kpis: KpiItem[] = [
      { id: 'month', label: t('purchasesDashboard.thisMonth'), value: totalPurchases, currency: displayCurrency, icon: ShoppingBag, color: '#10B981', sparkline: purchasesSparkline, deltaPct: computeDelta(purchasesSparkline), breakdown: bk },
      { id: 'year', label: t('purchasesDashboard.thisYear'), value: yearlyPurchases, currency: displayCurrency, icon: TrendingUp, color: '#3B82F6', breakdown: bk },
      { id: 'avg', label: t('purchasesDashboard.avgInvoice'), value: avgInvoiceValue, currency: displayCurrency, icon: BarChart3, color: '#8B5CF6', breakdown: bk },
      { id: 'unpaid', label: t('purchasesDashboard.unpaid'), value: unpaidBalance, currency: displayCurrency, icon: AlertTriangle, color: '#F59E0B', suffix: unpaidCount > 0 ? `${unpaidCount} ${isAr ? 'فاتورة' : 'invoices'}` : undefined, secondaryLabel: unpaidCount > 0 ? (isAr ? '⚠ تحتاج دفع' : '⚠ Needs payment') : (isAr ? '✓ لا مستحقات' : '✓ All paid'), secondaryTone: unpaidCount > 0 ? 'warning' : 'success', breakdown: bk },
      { id: 'total', label: t('purchasesDashboard.totalInvoices'), value: totalInvoices, icon: Hash, color: '#64748b' },
      { id: 'pending', label: t('purchasesDashboard.pendingOrders'), value: pendingOrders, icon: Clock, color: '#ea580c', secondaryLabel: pendingOrders > 0 ? (isAr ? '⚠ طلبات معلّقة' : '⚠ Pending') : (isAr ? '✓ لا طلبات' : '✓ None'), secondaryTone: pendingOrders > 0 ? 'warning' : 'success' },
      { id: 'containers', label: t('purchasesDashboard.activeContainers'), value: inTransit, icon: Ship, color: '#0ea5e9', suffix: isAr ? 'كونتينر' : 'containers' },
      { id: 'suppliers', label: t('purchasesDashboard.activeSuppliers'), value: activeSuppliers, icon: Users, color: '#0d9488', suffix: `/ ${totalSuppliers} ${isAr ? 'إجمالي' : 'total'}` },
    ];

    // ── List items ──
    const recentListItems: ListItem[] = recent.map(r => ({
      id: r.id, title: r.supplierName, subtitle: timeAgo(r.date), value: r.convertedAmount,
      icon: FileText, iconClassName: STAGE_META[r.stage]?.badge || 'bg-stone-100 text-stone-500',
      tags: [{ label: isAr ? (STAGE_META[r.stage]?.ar || r.stage) : (STAGE_META[r.stage]?.en || r.stage), className: STAGE_META[r.stage]?.badge || 'bg-stone-100 text-stone-600' }],
    }));
    const supplierListItems: ListItem[] = topSuppliers.map((s, i) => ({
      id: `sup-${i}`, rank: i + 1, title: s.name, subtitle: `${s.count} ${isAr ? 'فاتورة' : 'invoices'}`, value: s.total,
      valueSub: `${sym} ${Math.round(s.total).toLocaleString()}`,
    }));

    // ── Hero ──
    const fromLabel = fromDateStr; const toLabel = toDateStr;
    const heroConfig = {
      label: t('purchasesDashboard.title'), value: totalInvoices,
      valueSuffix: isAr ? 'فاتورة مشتريات' : 'purchase invoices',
      badges: [
        { label: `${sym} ${totalPurchases.toLocaleString()} ${isAr ? 'هذا الشهر' : 'this month'}`, tone: 'success' as const },
        ...(inTransit > 0 ? [{ label: `${inTransit} ${isAr ? 'كونتينر نشط' : 'active containers'}`, tone: 'info' as const }] : []),
        ...(pendingOrders > 0 ? [{ label: `${pendingOrders} ${isAr ? 'معلّقة' : 'pending'}`, tone: 'warning' as const }] : []),
      ],
      secondaryLabel: isAr ? 'الفترة' : 'Period', secondaryValue: `${fromLabel} → ${toLabel}`,
      lastSync, isFetching: loading,
      actions: (
        <>
          <DateRangePicker date={dateRange} setDate={setDateRange} align="end" className="w-full lg:w-auto [&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-stone-700 [&_button]:text-white [&_button]:hover:bg-white/15" />
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-full lg:w-[175px] bg-white/10 backdrop-blur-sm h-10 text-sm border-stone-700 text-white hover:bg-white/15 transition-colors">
              <Coins className="w-4 h-4 me-2 text-teal-400" /><SelectValue placeholder={t('purchasesDashboard.allCurrencies')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌍 {t('purchasesDashboard.allConverted')}</SelectItem>
              {availableCurrencies.map((c: string) => { const m = CURRENCY_META[c]; return (<SelectItem key={c} value={c}>{m?.flag || '🏳️'} {language === 'ar' ? m?.nameAr : m?.nameEn} ({c})</SelectItem>); })}
            </SelectContent>
          </Select>
        </>
      ),
    };

    // ── Stages for SectionCard ──
    const stagesSection = stages.length > 0 ? (
      <div className="space-y-3">
        {stages.map(s => { const max = Math.max(...stages.map(x => x.total), 1); return (
          <div key={s.stage}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-stone-700 dark:text-stone-300">{s.label}</span>
                <span className="text-[10px] font-mono text-stone-400 bg-stone-50 dark:bg-stone-800 px-1.5 rounded">{s.count}</span>
              </div>
              <span className="text-xs font-mono text-stone-500">{sym} {s.total.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(s.total / max) * 100}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ); })}
      </div>
    ) : <div className="h-48 flex items-center justify-center text-sm text-stone-400">{isAr ? 'لا توجد فواتير' : 'No invoices'}</div>;

    // ═════════════════════════════════════════════════════════════
    return (
        <div className="space-y-5" dir={direction}>
            <DashboardHero config={heroConfig} loading={loading && !rawData} />
            <KpiGrid kpis={kpis} loading={loading && !rawData} cols={4} />

            {/* Chart + Stages */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <SectionCard title={`📈 ${t('purchasesDashboard.monthlyPurchases')}`} className="lg:col-span-2">
                <ReactECharts option={mainChartOption} style={{ height: '300px', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
              </SectionCard>
              <SectionCard title={isAr ? 'حالة الفواتير' : 'Invoice Status'}>
                {stagesSection}
              </SectionCard>
            </div>

            {/* Recent + Top Suppliers */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <SectionCard title={t('purchasesDashboard.recentPurchases')} className="lg:col-span-2" noPadding
                action={<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">{totalInvoices}</span>}>
                <ListPanel items={recentListItems} loading={loading && !rawData} showRank={false} currency={displayCurrency} emptyTitle={isAr ? 'لا توجد مشتريات' : 'No purchases'} />
              </SectionCard>
              <SectionCard title={isAr ? '⭐ أفضل الموردين' : '⭐ Top Suppliers'} noPadding
                action={<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">{topSuppliers.length}</span>}>
                <ListPanel items={supplierListItems} loading={loading && !rawData} currency={displayCurrency} emptyTitle={isAr ? 'لا توجد بيانات' : 'No data'} />
              </SectionCard>
            </div>

            {/* Container chips */}
            {containerStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                <Ship className="w-4 h-4 text-stone-400" />
                <span className="text-sm text-stone-500">{isAr ? 'الكونتينرات:' : 'Containers:'}</span>
                {containerStatuses.map(cs => (
                  <div key={cs.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cs.color }} />
                    <span className="text-xs text-stone-600 dark:text-stone-300">{cs.label}</span>
                    <span className="text-xs font-mono font-bold text-stone-900 dark:text-white">{cs.count}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
    );
}

