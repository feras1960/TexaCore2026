/**
 * ════════════════════════════════════════════════════════════════
 * 📊 PurchasesDashboard — لوحة المشتريات
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Follows the exact same pattern as the main Dashboard.tsx
 *   - Header bar (white bg + border)
 *   - StatsGrid + StatCard (shared components)
 *   - Grid cards with border-0 shadow-sm
 *   - ERP palette: erp-navy, erp-teal, font-cairo, font-mono
 *   - Real data from Supabase + dynamic currency filter
 *   - Exchange rate conversion for multi-currency totals
 *   - Date range filter (default: start of month → today)
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { startOfMonth, endOfDay } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { SafeChartContainer } from '@/components/ui/SafeChartContainer';
import {
    ShoppingBag, Truck, FileText, Clock, AlertTriangle, Ship,
    Star, Loader2, Coins, RefreshCw,
    Calendar, Package, TrendingUp, Hash, BarChart3, Users,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

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
    ordered: { ar: 'تم الطلب', en: 'Ordered', color: '#8B5CF6' },
    shipped: { ar: 'تم الشحن', en: 'Shipped', color: '#3B82F6' },
    in_transit: { ar: 'بالطريق', en: 'In Transit', color: '#0EA5E9' },
    at_port: { ar: 'في الميناء', en: 'At Port', color: '#F59E0B' },
    customs: { ar: 'تخليص', en: 'Customs', color: '#F97316' },
    cleared: { ar: 'تم التخليص', en: 'Cleared', color: '#10B981' },
    received: { ar: 'تم الاستلام', en: 'Received', color: '#6366F1' },
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

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Restore user preference from localStorage
    const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
        try { return localStorage.getItem('purchases_dashboard_currency') || 'all'; } catch { return 'all'; }
    });
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

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
        try {
            localStorage.setItem('purchases_dashboard_daterange', JSON.stringify({
                from: dateRange?.from?.toISOString(),
                to: dateRange?.to?.toISOString(),
            }));
        } catch { }
    }, [dateRange]);

    // Data
    const [totalPurchases, setTotalPurchases] = useState(0);
    const [totalLastMonth, setTotalLastMonth] = useState(0);
    const [pendingOrders, setPendingOrders] = useState(0);
    const [unpaidBalance, setUnpaidBalance] = useState(0);
    const [unpaidCount, setUnpaidCount] = useState(0);
    const [inTransit, setInTransit] = useState(0);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const [avgInvoiceValue, setAvgInvoiceValue] = useState(0);
    const [yearlyPurchases, setYearlyPurchases] = useState(0);
    const [yearlyPurchasesLastYear, setYearlyPurchasesLastYear] = useState(0);
    const [activeSuppliers, setActiveSuppliers] = useState(0);
    const [totalSuppliers, setTotalSuppliers] = useState(0);
    const [monthly, setMonthly] = useState<{ label: string; total: number; count: number }[]>([]);
    const [stages, setStages] = useState<{ stage: string; label: string; count: number; total: number; color: string }[]>([]);
    const [containerStatuses, setContainerStatuses] = useState<{ label: string; count: number; color: string }[]>([]);
    const [recent, setRecent] = useState<{ id: string; stage: string; supplierName: string; amount: number; convertedAmount: number; currency: string; date: string }[]>([]);
    const [topSuppliers, setTopSuppliers] = useState<{ name: string; total: number; count: number }[]>([]);
    const [isLive, setIsLive] = useState(false);

    const realtimeRef = useRef<any>(null);

    // Display currency: when "all" show base currency, else the selected one
    const displayCurrency = selectedCurrency === 'all' ? (baseCurrency || 'USD') : selectedCurrency;
    const sym = getCurrencySymbol(displayCurrency);
    const displayCurrencyLabel = selectedCurrency === 'all'
        ? (isAr ? `بالعملة الأساسية (${displayCurrency})` : `Base (${displayCurrency})`)
        : displayCurrency;

    // ─── Convert amount to display currency ─────────────────────
    const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
        if (!amount || !fromCurrency) return amount;
        if (fromCurrency === displayCurrency) return amount;
        const rate = lookupRate(fromCurrency, displayCurrency);
        return amount * rate;
    }, [displayCurrency, lookupRate]);

    // ─── Fetch ──────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!companyId) return;
        try {
            // Run all queries in PARALLEL for faster loading
            const [txsRes, ctrsRes, supsRes] = await Promise.all([
                supabase
                    .from('purchase_transactions')
                    .select('id, stage, supplier_id, supplier_name, currency, total_amount, created_at')
                    .eq('company_id', companyId),
                supabase.from('containers').select('id, status').eq('company_id', companyId),
                supabase.from('suppliers').select('id, name_ar, name_en').eq('company_id', companyId),
            ]);

            const allRows = txsRes.data || [];
            const containers = ctrsRes.data || [];
            const allSups = supsRes.data || [];

            // Discover available currencies
            const currs = [...new Set(allRows.map(r => r.currency).filter(Boolean))] as string[];
            if (currs.length > 0) {
                const allCurrs = baseCurrency && !currs.includes(baseCurrency)
                    ? [baseCurrency, ...currs]
                    : currs;
                setAvailableCurrencies(allCurrs);
            }

            const rows = allRows;

            // Date filter bounds for date-based KPIs
            const fromDate = dateRange?.from || startOfMonth(new Date());
            const toDate = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());

            // Filter by date range
            const dateFilteredRows = rows.filter(r => {
                const d = new Date(r.created_at);
                return d >= fromDate && d <= toDate;
            });

            // ── Time-based calculations (within date range) ──
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            const thisMonthRows = rows.filter(r => new Date(r.created_at) >= monthStart);
            const lastMonthRows = rows.filter(r => {
                const d = new Date(r.created_at);
                return d >= lastMonthStart && d <= lastMonthEnd;
            });

            // Convert all amounts to display currency
            const thisMonthTotal = thisMonthRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            const lastMonthTotal = lastMonthRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);

            setTotalPurchases(thisMonthTotal);
            setTotalLastMonth(lastMonthTotal);
            setPendingOrders(dateFilteredRows.filter(r => r.stage === 'draft' || r.stage === 'confirmed').length);

            const unpaid = dateFilteredRows.filter(r => ['confirmed', 'posted', 'partial_paid'].includes(r.stage));
            setUnpaidBalance(unpaid.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0));
            setUnpaidCount(unpaid.length);

            // ── New KPIs ──
            setTotalInvoices(dateFilteredRows.length);
            const totalAllAmount = dateFilteredRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0);
            setAvgInvoiceValue(dateFilteredRows.length > 0 ? totalAllAmount / dateFilteredRows.length : 0);

            // ── Yearly purchases ──
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
            const thisYearRows = rows.filter(r => new Date(r.created_at) >= yearStart);
            const lastYearRows = rows.filter(r => {
                const d = new Date(r.created_at);
                return d >= lastYearStart && d <= lastYearEnd;
            });
            setYearlyPurchases(thisYearRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0));
            setYearlyPurchasesLastYear(lastYearRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0));

            // ── Containers ──
            setInTransit(containers.filter(c => ['in_transit', 'at_port', 'shipped'].includes(c.status)).length);

            const ctrMap: Record<string, number> = {};
            containers.forEach(c => { ctrMap[c.status] = (ctrMap[c.status] || 0) + 1; });
            setContainerStatuses(
                Object.entries(ctrMap).map(([s, count]) => ({
                    label: isAr ? (CONTAINER_META[s]?.ar || s) : (CONTAINER_META[s]?.en || s),
                    count,
                    color: CONTAINER_META[s]?.color || '#9CA3AF',
                }))
            );

            // ── Suppliers — use name_ar / name_en from suppliers table ──
            const supMap: Record<string, string> = {};
            allSups?.forEach(s => {
                supMap[s.id] = isAr
                    ? (s.name_ar || s.name_en || '')
                    : (s.name_en || s.name_ar || '');
            });

            // Build supplier name: prefer supplier map (name_ar/name_en), fallback to supplier_name field
            const getSupName = (r: any) => supMap[r.supplier_id] || r.supplier_name || '';

            const supTotals: Record<string, { name: string; total: number; count: number }> = {};
            dateFilteredRows.forEach(r => {
                if (r.supplier_id) {
                    if (!supTotals[r.supplier_id]) supTotals[r.supplier_id] = { name: getSupName(r), total: 0, count: 0 };
                    supTotals[r.supplier_id].total += convertAmount(r.total_amount || 0, r.currency);
                    supTotals[r.supplier_id].count += 1;
                }
            });
            setActiveSuppliers(new Set(dateFilteredRows.map(r => r.supplier_id).filter(Boolean)).size);
            setTotalSuppliers(allSups?.length || 0);

            setTopSuppliers(
                Object.values(supTotals)
                    .map(d => ({ name: d.name || (isAr ? 'مورد' : 'Supplier'), total: d.total, count: d.count }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 4)
            );

            // ── Monthly trend (last 6 months, always shown) ──
            const mNames = isAr
                ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const pts: typeof monthly = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                const mRows = rows.filter(r => { const rd = new Date(r.created_at); return rd >= d && rd <= end; });
                pts.push({
                    label: mNames[d.getMonth()],
                    total: mRows.reduce((s, r) => s + convertAmount(r.total_amount || 0, r.currency), 0),
                    count: mRows.length,
                });
            }
            setMonthly(pts);

            // ── Stages ──
            const stgMap: Record<string, { count: number; total: number }> = {};
            dateFilteredRows.forEach(r => {
                if (!stgMap[r.stage]) stgMap[r.stage] = { count: 0, total: 0 };
                stgMap[r.stage].count++;
                stgMap[r.stage].total += convertAmount(r.total_amount || 0, r.currency);
            });
            setStages(
                Object.entries(stgMap).map(([s, d]) => ({
                    stage: s, label: isAr ? (STAGE_META[s]?.ar || s) : (STAGE_META[s]?.en || s),
                    count: d.count, total: d.total, color: STAGE_META[s]?.color || '#9CA3AF',
                }))
            );

            // ── Recent — reuse already-fetched data, sort client-side ──
            const recentRows = [...allRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
            setRecent(recentRows.map(r => ({
                id: r.id, stage: r.stage,
                supplierName: supMap[r.supplier_id] || r.supplier_name || (isAr ? 'مورد' : 'Supplier'),
                amount: r.total_amount || 0,
                convertedAmount: convertAmount(r.total_amount || 0, r.currency),
                currency: r.currency || '', date: r.created_at,
            })));

        } catch (e) { console.error('Dashboard error:', e); }
        finally { setLoading(false); setIsRefreshing(false); }
    }, [companyId, isAr, convertAmount, dateRange, baseCurrency]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Supabase Realtime ───────────────────────────────────────
    useEffect(() => {
        if (!companyId) return;

        // Clean up previous subscription
        if (realtimeRef.current) {
            supabase.removeChannel(realtimeRef.current);
        }

        const channel = supabase
            .channel('purchases-dashboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'purchase_transactions',
                    filter: `company_id=eq.${companyId}`,
                },
                () => { fetchData(); }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'containers',
                    filter: `company_id=eq.${companyId}`,
                },
                () => { fetchData(); }
            )
            .subscribe((status) => {
                setIsLive(status === 'SUBSCRIBED');
            });

        realtimeRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            setIsLive(false);
        };
    }, [companyId, fetchData]);



    const pctChange = totalLastMonth > 0 ? ((totalPurchases - totalLastMonth) / totalLastMonth * 100) : undefined;
    const yearlyPctChange = yearlyPurchasesLastYear > 0 ? ((yearlyPurchases - yearlyPurchasesLastYear) / yearlyPurchasesLastYear * 100) : undefined;

    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return isAr ? `منذ ${mins} دقيقة` : `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return isAr ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
        return isAr ? `منذ ${Math.floor(hrs / 24)} يوم` : `${Math.floor(hrs / 24)}d ago`;
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
                name: isAr ? 'المشتريات' : 'Purchases',
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-erp-teal" />
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6" dir={direction}>
            {/* ─ Header Bar — Glass Gradient ── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-indigo-800 to-erp-navy p-6 rounded-2xl shadow-lg">
                {/* Decorative glass circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-erp-teal/10 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-400/10 blur-2xl" />
                <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <ShoppingBag className="w-6 h-6 text-erp-teal" />
                            </div>
                            <h1 className="text-2xl font-bold text-white font-cairo">
                                {isAr ? 'لوحة المشتريات' : 'Purchases Dashboard'}
                            </h1>
                            {isLive && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    LIVE
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-indigo-200/80 font-tajawal ps-12">
                            {isAr ? 'نظرة عامة على عمليات الشراء والموردين' : 'Overview of purchasing operations and suppliers'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Date Range Filter */}
                        <DateRangePicker
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full lg:w-auto [&_button]:bg-white/10 [&_button]:backdrop-blur-sm [&_button]:border-white/20 [&_button]:text-white [&_button]:hover:bg-white/20"
                            align="end"
                        />

                        {/* Currency Filter */}
                        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                            <SelectTrigger className="w-full lg:w-[175px] bg-white/10 backdrop-blur-sm h-10 text-sm border-white/20 text-white hover:bg-white/20 transition-colors">
                                <Coins className="w-4 h-4 me-2 text-erp-teal" />
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

            {/* ─ Stats Grid Row 1 — Financial KPIs (Glass Cards) ── */}
            <StatsGrid cols={4}>
                <StatCard
                    label={isAr ? 'مشتريات الشهر' : 'This Month'}
                    value={totalPurchases}
                    type="positive"
                    change={pctChange ? Number(pctChange.toFixed(1)) : undefined}
                    changeLabel={isAr ? 'عن الشهر السابق' : 'vs last month'}
                    icon={ShoppingBag}
                    formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
                    className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'مشتريات السنة' : 'This Year'}
                    value={yearlyPurchases}
                    type="info"
                    change={yearlyPctChange ? Number(yearlyPctChange.toFixed(1)) : undefined}
                    changeLabel={isAr ? 'عن السنة السابقة' : 'vs last year'}
                    icon={TrendingUp}
                    formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
                    className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'متوسط الفاتورة' : 'Avg. Invoice'}
                    value={avgInvoiceValue}
                    type="neutral"
                    icon={BarChart3}
                    formatValue={(val) => `${sym} ${Math.round(Number(val)).toLocaleString()}`}
                    className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'غير مدفوع' : 'Unpaid'}
                    value={unpaidBalance}
                    type={unpaidBalance > 0 ? 'negative' : 'neutral'}
                    icon={AlertTriangle}
                    formatValue={(val) => `${sym} ${Number(val).toLocaleString()}`}
                    suffix={unpaidCount > 0 ? `(${unpaidCount})` : ''}
                    className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
                />
            </StatsGrid>

            {/* ─ Stats Grid Row 2 — Operational KPIs (Glass Cards) ── */}
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
                    label={isAr ? 'كونتينرات بالطريق' : 'In Transit'}
                    value={inTransit}
                    type="info"
                    icon={Ship}
                    suffix={isAr ? 'كونتينر' : 'containers'}
                    className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/30 dark:to-cyan-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'الموردين النشطين' : 'Active Suppliers'}
                    value={`${activeSuppliers}/${totalSuppliers}`}
                    type="positive"
                    icon={Users}
                    className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 backdrop-blur-sm border border-teal-100/50 dark:border-teal-800/30 shadow-sm hover:shadow-md transition-all"
                />
            </StatsGrid>

            {/* ─ Charts Row (Glass) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Trend — 2 cols */}
                <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-erp-teal" />
                            {isAr ? 'المشتريات الشهرية' : 'Monthly Purchases'}
                            {selectedCurrency === 'all' && (
                                <span className="text-[10px] text-gray-400 font-normal font-tajawal">
                                    ({isAr ? `محوّلة لـ ${displayCurrency}` : `converted to ${displayCurrency}`})
                                </span>
                            )}
                        </CardTitle>
                        <span className="text-xs text-gray-400 font-tajawal">{isAr ? 'آخر 6 أشهر' : 'Last 6 months'}</span>
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

                {/* Stages Breakdown — 1 col */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Package className="w-4 h-4 text-erp-teal" />
                            {isAr ? 'حالة الفواتير' : 'Invoice Status'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {stages.length > 0 ? (
                            <div className="space-y-3">
                                {stages.map((s) => {
                                    const max = Math.max(...stages.map(x => x.total), 1);
                                    return (
                                        <div key={s.stage}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                    <span className="text-sm font-tajawal text-gray-700 dark:text-gray-300">{s.label}</span>
                                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 px-1.5 rounded">{s.count}</span>
                                                </div>
                                                <span className="text-xs font-mono text-gray-500">{sym} {s.total.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${(s.total / max) * 100}%`, backgroundColor: s.color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-sm text-gray-400 font-tajawal">
                                {isAr ? 'لا توجد فواتير' : 'No invoices'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ─ Bottom Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Purchases */}
                <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-erp-teal" />
                            {isAr ? 'أحدث عمليات الشراء' : 'Recent Purchases'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-2">
                            {recent.map((r) => (
                                <div
                                    key={r.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm font-tajawal">{r.supplierName}</p>
                                            <p className="text-xs text-gray-400 font-tajawal">{timeAgo(r.date)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={cn('px-2 py-0.5 text-xs border-0', STAGE_META[r.stage]?.badge || 'bg-gray-100 text-gray-700')}>
                                            {isAr ? (STAGE_META[r.stage]?.ar || r.stage) : (STAGE_META[r.stage]?.en || r.stage)}
                                        </Badge>
                                        <div className="text-end min-w-[100px]">
                                            <span className="font-semibold text-erp-navy dark:text-white font-mono text-sm block" dir="ltr">
                                                {sym} {r.convertedAmount.toLocaleString()}
                                            </span>
                                            {r.currency !== displayCurrency && (
                                                <span className="text-[10px] text-gray-400 font-mono block" dir="ltr">
                                                    {getCurrencySymbol(r.currency)} {r.amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {recent.length === 0 && (
                                <div className="py-8 text-center text-sm text-gray-400 font-tajawal">
                                    {isAr ? 'لا توجد عمليات' : 'No transactions'}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Suppliers */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            {isAr ? 'أفضل الموردين' : 'Top Suppliers'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-2">
                            {topSuppliers.map((s, i) => (
                                <div
                                    key={`supplier-${i}-${s.name}`}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs",
                                        i === 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                                            i === 1 ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300" :
                                                i === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                                                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm font-tajawal">{s.name}</p>
                                        <p className="text-xs text-gray-500 font-tajawal">{s.count} {isAr ? 'فاتورة' : 'invoices'}</p>
                                    </div>
                                    <p className="font-semibold text-erp-teal font-mono text-sm" dir="ltr">
                                        {sym} {s.total.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                            {topSuppliers.length === 0 && (
                                <div className="py-8 text-center text-sm text-gray-400 font-tajawal">
                                    {isAr ? 'لا توجد بيانات' : 'No data'}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Container chips (if any) */}
            {containerStatuses.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-100/50 dark:border-gray-800/50 shadow-sm">
                    <Ship className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-tajawal text-gray-500">{isAr ? 'الكونتينرات:' : 'Containers:'}</span>
                    {containerStatuses.map(cs => (
                        <div key={cs.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cs.color }} />
                            <span className="text-xs font-tajawal text-gray-600 dark:text-gray-300">{cs.label}</span>
                            <span className="text-xs font-mono font-bold text-erp-navy dark:text-white">{cs.count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
