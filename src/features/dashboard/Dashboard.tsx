/**
 * ════════════════════════════════════════════════════════════════
 * 🏠 Dashboard — لوحة التحكم المركزية v2
 * ════════════════════════════════════════════════════════════════
 * - Glass gradient header (Navy → Teal)
 * - Premium Framer Motion animated KPI cards
 * - ECharts Smooth Area for Revenue vs Expenses
 * - Real currency selector from company_accounting_settings
 * - Realtime updates via Supabase channels
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrencies } from '@/hooks/useCompanyCurrencies';
import { supabase } from '@/lib/supabase';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactECharts from 'echarts-for-react';
import {
  LayoutDashboard, TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  Calculator, UserCheck, Truck, Activity, ChevronRight, ChevronLeft,
  Briefcase, Coins, ArrowUpRight, ArrowDownRight, Zap,
  BarChart3, PieChart, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { ExchangeRatesService } from '@/services/data/ExchangeRatesService';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalMaterials: number;
  totalEmployees: number;
  totalJournalEntries: number;
  pendingOrders: number;
  recentSalesOrders: any[];
  recentPurchaseOrders: any[];
  chartData: { name: string; sales: number; purchases: number }[];
  topEmployees: { name: string; sales: number }[];
}

// ═══════════════════════════════════════════
// Currency conversion helpers
// ═══════════════════════════════════════════

const convertAmount = (amount: number, fromCurrency: string, toCurrency: string, baseCurrency: string, rates: any[]) => {
  if (fromCurrency === toCurrency) return amount;
  if (!amount) return 0;
  let baseAmount = amount;
  if (fromCurrency !== baseCurrency) {
    const rule = rates.find(r => r.from_currency === baseCurrency && r.to_currency === fromCurrency);
    const displayRate = rule && rule.mid_rate && rule.mid_rate > 0 ? (1 / rule.mid_rate) : 1;
    baseAmount = amount * displayRate;
  }
  if (toCurrency !== baseCurrency) {
    const targetRule = rates.find(r => r.from_currency === baseCurrency && r.to_currency === toCurrency);
    const targetDisplayRate = targetRule && targetRule.mid_rate && targetRule.mid_rate > 0 ? (1 / targetRule.mid_rate) : 1;
    return baseAmount / targetDisplayRate;
  }
  return baseAmount;
};

const processChartData = (sales: any[], purchases: any[], isAr: boolean, targetCurrency: string, baseCurrency: string, rates: any[]) => {
  const monthsData = new Map<string, { name: string; sales: number; purchases: number }>();
  const d = new Date();
  d.setDate(1);
  for (let i = 6; i >= 0; i--) {
    const historicalDate = new Date(d);
    historicalDate.setMonth(d.getMonth() - i);
    const monthKey = `${historicalDate.getFullYear()}-${String(historicalDate.getMonth() + 1).padStart(2, '0')}`;
    const monthFormatter = new Intl.DateTimeFormat(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short' });
    monthsData.set(monthKey, { name: monthFormatter.format(historicalDate), sales: 0, purchases: 0 });
  }
  sales?.forEach(invoice => {
    const dateStr = invoice.invoice_date || invoice.created_at;
    if (!dateStr) return;
    const invDate = new Date(dateStr);
    const key = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthsData.has(key)) {
      const invCurr = invoice.currency || baseCurrency;
      monthsData.get(key)!.sales += convertAmount(Number(invoice.total_amount) || 0, invCurr, targetCurrency, baseCurrency, rates);
    }
  });
  purchases?.forEach(invoice => {
    const dateStr = invoice.invoice_date || invoice.created_at;
    if (!dateStr) return;
    const invDate = new Date(dateStr);
    const key = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthsData.has(key)) {
      const invCurr = invoice.currency || baseCurrency;
      monthsData.get(key)!.purchases += convertAmount(Number(invoice.total_amount) || 0, invCurr, targetCurrency, baseCurrency, rates);
    }
  });
  return Array.from(monthsData.values());
};

const processTopEmployees = (sales: any[], userProfiles: any[], targetCurrency: string, baseCurrency: string, rates: any[]) => {
  const salesByEmp = new Map<string, number>();
  sales?.forEach(inv => {
    const empId = inv.salesperson_id || inv.created_by;
    if (empId) {
      const invCurr = inv.currency || baseCurrency;
      salesByEmp.set(empId, (salesByEmp.get(empId) || 0) + convertAmount(Number(inv.total_amount) || 0, invCurr, targetCurrency, baseCurrency, rates));
    }
  });
  return Array.from(salesByEmp.entries())
    .map(([id, total]) => {
      const profile = userProfiles?.find((p: any) => p.id === id);
      return { name: profile?.full_name || profile?.email?.split('@')[0] || 'Unknown', sales: total };
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
};

// ═══════════════════════════════════════════
// Animated Counter
// ═══════════════════════════════════════════
function AnimatedNumber({ value, currency, loading }: { value: number; currency?: string; loading: boolean }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (loading) return;
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 900;
    const step = (timestamp: number, startTime: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(ts => step(ts, startTime));
      else setDisplay(end);
    };
    requestAnimationFrame(ts => step(ts, ts));
  }, [value, loading]);

  if (loading) return <span className="animate-pulse text-gray-300 dark:text-gray-700">——</span>;
  if (currency) return <span>{formatCurrency(display, currency)}</span>;
  return <span>{formatNumber(display)}</span>;
}

// ═══════════════════════════════════════════
// Skeleton Loader
// ═══════════════════════════════════════════
function KPISkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
    </div>
  );
}

// ═══════════════════════════════════════════
// KPI Card Component
// ═══════════════════════════════════════════
interface KPICardProps {
  title: string;
  value: number;
  currency?: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  trend?: number;
  loading: boolean;
  delay?: number;
}

function KPICard({ title, value, currency, icon: Icon, gradient, iconBg, iconColor, subtitle, badge, badgeColor, trend, loading, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="group relative h-full flex flex-col"
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl border p-5 cursor-default flex-1 flex flex-col",
        "bg-white dark:bg-gray-900",
        "border-gray-200/80 dark:border-gray-800",
        "shadow-sm hover:shadow-lg transition-all duration-300",
        "hover:-translate-y-0.5"
      )}>
        {/* Gradient glow blob */}
        <div className={cn("absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-40 transition-opacity duration-300 group-hover:opacity-70", gradient)} />

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2.5 rounded-xl border", iconBg, "border-opacity-30")}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
            {trend !== undefined && !loading && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                trend >= 0
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
              )}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
            <AnimatedNumber value={value} currency={currency} loading={loading} />
          </p>

          {subtitle && !loading && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{subtitle}</p>
          )}

          {badge && !loading && (
            <div className={cn("mt-auto w-fit inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", badgeColor)}>
              {badge}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// Main Dashboard Component
// ═══════════════════════════════════════════

export default function Dashboard() {
  const { t, language, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const isRTL = direction === 'rtl';
  const isDark = resolvedTheme === 'dark';

  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0, totalPurchases: 0, totalCustomers: 0,
    totalSuppliers: 0, totalMaterials: 0, totalEmployees: 0,
    totalJournalEntries: 0, pendingOrders: 0,
    recentSalesOrders: [], recentPurchaseOrders: [],
    chartData: [], topEmployees: [],
  });
  const [loading, setLoading] = useState(true);

  // ─── Currency selector from company_accounting_settings ───────
  const {
    baseCurrency: companyBaseCurrency,
    supportedCurrencies: companySupportedCurrencies,
    loading: currenciesLoading,
  } = useCompanyCurrencies();

  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    () => localStorage.getItem('dashboard_currency_pref') || 'USD'
  );

  // Validate saved preference once currencies load
  useEffect(() => {
    if (currenciesLoading || companySupportedCurrencies.length === 0) return;
    const saved = localStorage.getItem('dashboard_currency_pref');
    const isValid = saved && companySupportedCurrencies.includes(saved);
    if (!isValid) {
      const fallback = companyBaseCurrency || companySupportedCurrencies[0] || 'USD';
      setSelectedCurrency(fallback);
    }
  }, [companyBaseCurrency, companySupportedCurrencies, currenciesLoading]);

  const handleCurrencyChange = (val: string) => {
    setSelectedCurrency(val);
    localStorage.setItem('dashboard_currency_pref', val);
  };

  // ─── Fetch real data from Supabase ────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const companyId = company.id;
      const baseCurr = companyBaseCurrency || (company as any)?.settings?.base_currency || 'USD';
      const rangeDate = new Date();
      rangeDate.setMonth(rangeDate.getMonth() - 6);
      rangeDate.setDate(1);
      const rangeDateIso = rangeDate.toISOString();

      const [
        rates,
        salesRes, purchasesRes, customersRes, suppliersRes, materialsRes,
        employeesRes, journalRes, pendingRes, recentSalesRes, recentPurchasesRes,
        allSalesRes, allPurchasesRes
      ] = await Promise.all([
        ExchangeRatesService.getRates(companyId).catch(() => []),
        supabase.from('sales_invoices').select('total_amount, currency').eq('company_id', companyId).in('status', ['confirmed', 'completed', 'paid']),
        supabase.from('purchase_invoices').select('total_amount, currency').eq('company_id', companyId).in('status', ['confirmed', 'completed', 'paid']),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('materials').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
        supabase.from('sales_orders').select('id, order_number, customer_name, total_amount, status, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
        supabase.from('purchase_orders').select('id, order_number, supplier_name, total_amount, status, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
        supabase.from('sales_invoices').select('id, total_amount, currency, invoice_date, created_at, created_by, salesperson_id').eq('company_id', companyId).gte('created_at', rangeDateIso).in('status', ['confirmed', 'completed', 'paid']),
        supabase.from('purchase_invoices').select('id, total_amount, currency, invoice_date, created_at').eq('company_id', companyId).gte('created_at', rangeDateIso).in('status', ['confirmed', 'completed', 'paid']),
      ]);

      const chartData = processChartData(allSalesRes.data || [], allPurchasesRes.data || [], isAr, selectedCurrency, baseCurr, rates);

      let topEmployees: { name: string; sales: number }[] = [];
      const userIdsToFetch = [...new Set(allSalesRes.data?.map(s => s.salesperson_id || s.created_by).filter(Boolean))];
      if (userIdsToFetch.length > 0) {
        const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, email').in('id', userIdsToFetch as string[]);
        topEmployees = processTopEmployees(allSalesRes.data || [], usersData || [], selectedCurrency, baseCurr, rates);
      }

      const totalSales = salesRes.data?.reduce((s, r) => s + convertAmount(Number(r.total_amount) || 0, r.currency || baseCurr, selectedCurrency, baseCurr, rates), 0) || 0;
      const totalPurchases = purchasesRes.data?.reduce((s, r) => s + convertAmount(Number(r.total_amount) || 0, r.currency || baseCurr, selectedCurrency, baseCurr, rates), 0) || 0;

      setStats({
        totalSales, totalPurchases,
        totalCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        totalMaterials: materialsRes.count || 0,
        totalEmployees: employeesRes.count || 0,
        totalJournalEntries: journalRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        recentSalesOrders: recentSalesRes.data || [],
        recentPurchaseOrders: recentPurchasesRes.data || [],
        chartData,
        topEmployees
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [company?.id, selectedCurrency, isAr, companyBaseCurrency]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Realtime
  useEffect(() => {
    if (!company?.id) return;
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_invoices' }, fetchDashboardData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company?.id, fetchDashboardData]);

  // ═══════════════════════════════════════════
  // ECharts Options
  // ═══════════════════════════════════════════
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const trendData = stats.chartData || [];
  const employeesData = stats.topEmployees || [];

  const mainChartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      textStyle: { color: isDark ? '#f9fafb' : '#111827', fontSize: 12 },
      axisPointer: { type: 'cross', label: { backgroundColor: isDark ? '#374151' : '#f3f4f6' } },
    },
    legend: {
      data: [isAr ? 'الإيرادات' : 'Revenue', isAr ? 'المصروفات' : 'Expenses'],
      textStyle: { color: textColor, fontSize: 12 },
      top: 8, right: isRTL ? 'auto' : 16, left: isRTL ? 16 : 'auto',
    },
    grid: { left: '2%', right: '2%', bottom: '2%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false,
      data: trendData.map(d => d.name),
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
        data: trendData.map(d => d.sales)
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
        data: trendData.map(d => d.purchases)
      }
    ]
  }), [trendData, isDark, isAr, isRTL, textColor, gridColor]);

  const employeeChartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      textStyle: { color: isDark ? '#f9fafb' : '#111827', fontSize: 12 },
    },
    grid: { left: '2%', right: '4%', bottom: '2%', top: '4%', containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      axisLabel: { color: textColor, fontSize: 11, formatter: (val: number) => `${(val / 1000).toFixed(0)}k` }
    },
    yAxis: {
      type: 'category',
      data: employeesData.length ? employeesData.map(d => d.name).reverse() : [isAr ? 'لا يوجد' : 'None'],
      axisLabel: { color: textColor, fontSize: 11, margin: 12, width: 80, overflow: 'truncate' },
      axisLine: { show: false }, axisTick: { show: false }
    },
    series: [{
      name: isAr ? 'المبيعات' : 'Sales',
      type: 'bar', barWidth: '50%', barMaxWidth: 28,
      itemStyle: {
        borderRadius: isRTL ? [4, 0, 0, 4] : [0, 4, 4, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#8b5cf6' }]
        }
      },
      data: employeesData.length ? employeesData.map(d => d.sales).reverse() : [0]
    }]
  }), [employeesData, isDark, isAr, isRTL, textColor, gridColor]);

  // ─── Module Nav Cards ──────────────────────
  const modules = useMemo(() => [
    { label: isAr ? 'المحاسبة' : 'Accounting', icon: Calculator, path: '/accounting', color: 'teal' },
    { label: isAr ? 'المبيعات' : 'Sales', icon: TrendingUp, path: '/sales', color: 'emerald' },
    { label: isAr ? 'المشتريات' : 'Purchases', icon: ShoppingCart, path: '/purchases', color: 'indigo' },
    { label: isAr ? 'المستودعات' : 'Warehouse', icon: Truck, path: '/warehouse', color: 'amber' },
    { label: isAr ? 'إدارة العملاء' : 'CRM', icon: Users, path: '/crm', color: 'sky' },
    { label: isAr ? 'الموارد البشرية' : 'HR', icon: UserCheck, path: '/hr', color: 'purple' },
  ], [isAr]);

  const colorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-300',    border: 'border-teal-200 dark:border-teal-800',    dot: 'bg-teal-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-300',  border: 'border-indigo-200 dark:border-indigo-800',  dot: 'bg-indigo-500' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800',   dot: 'bg-amber-500' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-900/20',       text: 'text-sky-700 dark:text-sky-300',       border: 'border-sky-200 dark:border-sky-800',       dot: 'bg-sky-500' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  };

  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6 pb-12 overflow-x-hidden">

      {/* ═══ Glass Command Center Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden bg-gradient-to-br from-[#0d2137] via-teal-900 to-[#0d2137] p-6 rounded-2xl shadow-xl"
      >
        {/* Decorative blobs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-20 bg-teal-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-inner">
              <LayoutDashboard className="w-7 h-7 text-teal-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-cairo tracking-tight leading-none">
                {isAr ? 'لوحة التحكم المركزية' : 'Command Center'}
              </h1>
              <p className="text-sm text-teal-200/70 mt-1">
                {company?.name_ar || company?.name_en || (isAr ? 'نظرة عامة على الأعمال' : 'Business overview')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Currency Selector */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2 text-white backdrop-blur-sm">
              <Coins className="w-4 h-4 text-amber-300 shrink-0" />
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[80px] h-7 bg-transparent border-none text-white font-mono font-bold text-sm focus:ring-0 shadow-none p-0">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 text-white border-white/10 rounded-xl shadow-2xl backdrop-blur-xl min-w-[100px]">
                  {currenciesLoading ? (
                    <SelectItem value={selectedCurrency} disabled className="text-gray-400 font-mono">
                      {selectedCurrency}
                    </SelectItem>
                  ) : companySupportedCurrencies.length > 0 ? (
                    companySupportedCurrencies.map(curr => (
                      <SelectItem key={curr} value={curr} className="focus:bg-teal-500/30 focus:text-white font-mono font-bold text-sm cursor-pointer">
                        {curr}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={selectedCurrency} className="focus:bg-teal-500/30 focus:text-white font-mono font-bold text-sm cursor-pointer">
                      {selectedCurrency}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Live Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/25 rounded-xl px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-emerald-300 text-xs font-mono font-bold tracking-widest">LIVE</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI Cards: 4 Primary + 4 Secondary (Perfect 2 rows of 4) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <KPISkeleton />
            </div>
          ))
        ) : (
          <>
            <KPICard
              title={isAr ? 'إجمالي المبيعات' : 'Total Revenue'}
              value={stats.totalSales}
              currency={selectedCurrency}
              icon={TrendingUp}
              gradient="bg-emerald-400"
              iconBg="bg-emerald-50 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-400"
              trend={14}
              subtitle={isAr ? `${stats.pendingOrders} طلب معلق` : `${stats.pendingOrders} pending orders`}
              loading={loading}
              delay={0}
            />
            <KPICard
              title={isAr ? 'المشتريات التشغيلية' : 'Total Expenses'}
              value={stats.totalPurchases}
              currency={selectedCurrency}
              icon={TrendingDown}
              gradient="bg-rose-400"
              iconBg="bg-rose-50 dark:bg-rose-900/30"
              iconColor="text-rose-600 dark:text-rose-400"
              trend={-5}
              loading={loading}
              delay={0.07}
            />
            <KPICard
              title={isAr ? 'القيود المحاسبية' : 'Journal Entries'}
              value={stats.totalJournalEntries}
              icon={Activity}
              gradient="bg-violet-400"
              iconBg="bg-violet-50 dark:bg-violet-900/30"
              iconColor="text-violet-600 dark:text-violet-400"
              badge={isAr ? '📒 إجمالي القيود' : '📒 Total Entries'}
              badgeColor="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
              loading={loading}
              delay={0.14}
            />
            <KPICard
              title={isAr ? 'الشركاء التجاريين' : 'Business Partners'}
              value={stats.totalCustomers + stats.totalSuppliers}
              icon={Users}
              gradient="bg-sky-400"
              iconBg="bg-sky-50 dark:bg-sky-900/30"
              iconColor="text-sky-600 dark:text-sky-400"
              subtitle={isAr ? `${stats.totalCustomers} عميل · ${stats.totalSuppliers} مورد` : `${stats.totalCustomers} customers · ${stats.totalSuppliers} suppliers`}
              loading={loading}
              delay={0.21}
            />
            <KPICard
              title={isAr ? 'قاعدة المواد' : 'Materials'}
              value={stats.totalMaterials}
              icon={Package}
              gradient="bg-amber-400"
              iconBg="bg-amber-50 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
              loading={loading}
              delay={0.28}
            />
            <KPICard
              title={isAr ? 'الموظفون' : 'Employees'}
              value={stats.totalEmployees}
              icon={UserCheck}
              gradient="bg-indigo-400"
              iconBg="bg-indigo-50 dark:bg-indigo-900/30"
              iconColor="text-indigo-600 dark:text-indigo-400"
              loading={loading}
              delay={0.32}
            />
        <KPICard
          title={isAr ? 'الموظفون' : 'Employees'}
          value={stats.totalEmployees}
          icon={UserCheck}
          gradient="bg-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          badge={isAr ? '✓ نشط' : '✓ Active'}
          badgeColor="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
          loading={loading}
          delay={0.35}
        />
        <KPICard
          title={isAr ? 'طلبات المبيعات المعلقة' : 'Pending Sales Orders'}
          value={stats.pendingOrders}
          icon={Clock}
          gradient="bg-orange-400"
          iconBg="bg-orange-50 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          badge={stats.pendingOrders > 0 ? (isAr ? '⚡ يحتاج متابعة' : '⚡ Needs attention') : (isAr ? '✓ تمام' : '✓ All clear')}
          badgeColor={stats.pendingOrders > 0
            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'}
          loading={loading}
          delay={0.42}
        />
          </>
        )}
      </div>

      {/* ═══ Row 3: Charts ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue vs Expenses Area Chart (2/3) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 h-full overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    {isAr ? 'التدفق المالي والأداء' : 'Financial Flow & Performance'}
                    <Badge variant="outline" className="text-[10px] font-mono ml-1 border-gray-200 dark:border-gray-700">{selectedCurrency}</Badge>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isAr ? 'مقارنة الإيرادات والمصروفات · آخر 7 أشهر' : 'Revenue vs Expenses · Last 7 months'}
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-[280px] px-1 pb-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ReactECharts option={mainChartOption} style={{ height: '100%', width: '100%', minHeight: '280px' }} opts={{ renderer: 'canvas' }} notMerge={true} />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Sales Reps Bar Chart (1/3) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 h-full overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-violet-500" />
                  {isAr ? 'أفضل مندوبي المبيعات' : 'Top Sales Reps'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isAr ? 'بناءً على إجمالي الفواتير المحققة' : 'By total invoiced amount'}
                </p>
              </div>
              <div className="flex-1 min-h-[280px] pb-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ReactECharts option={employeeChartOption} style={{ height: '100%', width: '100%', minHeight: '280px' }} opts={{ renderer: 'canvas' }} notMerge={true} />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ Row 4: Recent Orders + Quick Access ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Sales Orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  {isAr ? 'آخر طلبات المبيعات' : 'Recent Sales Orders'}
                </h3>
                <button
                  onClick={() => navigate('/sales')}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-0.5"
                >
                  {isAr ? 'عرض الكل' : 'View all'} <Arrow className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : stats.recentSalesOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{isAr ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentSalesOrders.map((order, i) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors group cursor-pointer"
                      onClick={() => navigate('/sales')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {order.customer_name || `#${order.order_number}`}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{order.order_number}</p>
                      </div>
                      <div className={cn(
                        "shrink-0 ms-3 px-2 py-0.5 rounded-full text-xs font-semibold",
                        order.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                        order.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      )}>
                        {isAr
                          ? (order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : order.status)
                          : order.status}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Access Modules */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.42 }}
        >
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 h-full">
            <CardContent className="p-5 h-full flex flex-col">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                {isAr ? 'الوصول السريع للأقسام' : 'Quick Access Modules'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                {modules.map((mod, i) => {
                  const Icon = mod.icon;
                  const c = colorMap[mod.color];
                  return (
                    <motion.button
                      key={mod.path}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      onClick={() => navigate(mod.path)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-center",
                        "transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md",
                        c.bg, c.border
                      )}
                    >
                      <div className={cn("p-2.5 rounded-xl bg-white dark:bg-gray-900 shadow-sm border", c.border)}>
                        <Icon className={cn("w-5 h-5", c.text)} />
                      </div>
                      <span className={cn("text-xs font-semibold leading-tight", c.text)}>{mod.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}
