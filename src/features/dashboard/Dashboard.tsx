/**
 * ════════════════════════════════════════════════════════════════
 * 🏠 Dashboard — لوحة التحكم الرئيسية (Glass Design + Real Data)
 * ════════════════════════════════════════════════════════════════
 * - Glass gradient header (Navy → Teal)
 * - 8 KPI cards from live Supabase data
 * - Module overview cards
 * - Recent activity
 * - Realtime updates via Supabase channels
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Users, Package,
  Wallet, FileText, ArrowUpRight, ArrowDownRight,
  Calculator, UserCheck, Truck, DollarSign,
  BarChart3, Activity, Clock, ChevronRight, ChevronLeft,
} from 'lucide-react';

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
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0, totalPurchases: 0, totalCustomers: 0,
    totalSuppliers: 0, totalMaterials: 0, totalEmployees: 0,
    totalJournalEntries: 0, pendingOrders: 0,
    recentSalesOrders: [], recentPurchaseOrders: [],
  });
  const [loading, setLoading] = useState(true);

  // ─── Fetch real data from Supabase ──────────────
  const fetchDashboardData = useCallback(async () => {
    if (!company?.id) return;

    try {
      const companyId = company.id;

      // Parallel queries for all stats
      const [
        salesRes,
        purchasesRes,
        customersRes,
        suppliersRes,
        materialsRes,
        employeesRes,
        journalRes,
        pendingRes,
        recentSalesRes,
        recentPurchasesRes,
      ] = await Promise.all([
        // Total sales amount (confirmed/completed invoices)
        supabase.from('sales_invoices')
          .select('total_amount', { count: 'exact' })
          .eq('company_id', companyId)
          .in('status', ['confirmed', 'completed', 'paid']),
        // Total purchases
        supabase.from('purchase_invoices')
          .select('total_amount', { count: 'exact' })
          .eq('company_id', companyId)
          .in('status', ['confirmed', 'completed', 'paid']),
        // Customers count
        supabase.from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        // Suppliers count
        supabase.from('suppliers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        // Materials count
        supabase.from('materials')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        // Employees count
        supabase.from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        // Journal entries count
        supabase.from('journal_entries')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        // Pending sales orders
        supabase.from('sales_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'pending'),
        // Recent 5 sales orders
        supabase.from('sales_orders')
          .select('id, order_number, customer_name, total_amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
        // Recent 5 purchase orders
        supabase.from('purchase_orders')
          .select('id, order_number, supplier_name, total_amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Sum total sales
      const totalSales = salesRes.data?.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) || 0;
      const totalPurchases = purchasesRes.data?.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) || 0;

      setStats({
        totalSales,
        totalPurchases,
        totalCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        totalMaterials: materialsRes.count || 0,
        totalEmployees: employeesRes.count || 0,
        totalJournalEntries: journalRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        recentSalesOrders: recentSalesRes.data || [],
        recentPurchaseOrders: recentPurchasesRes.data || [],
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // ─── Realtime subscription ──────────────────────
  useEffect(() => {
    if (!company?.id) return;
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_invoices' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchDashboardData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company?.id, fetchDashboardData]);

  // ─── Currency ───────────────────────────────────
  const currency = company?.base_currency || 'USD';

  // ─── KPI Cards ──────────────────────────────────
  const kpis = useMemo(() => [
    { label: isAr ? 'إجمالي المبيعات' : 'Total Sales', value: formatCurrency(stats.totalSales, currency), icon: TrendingUp, color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-400' },
    { label: isAr ? 'إجمالي المشتريات' : 'Total Purchases', value: formatCurrency(stats.totalPurchases, currency), icon: ShoppingCart, color: 'from-blue-500 to-indigo-600', textColor: 'text-blue-400' },
    { label: isAr ? 'العملاء' : 'Customers', value: formatNumber(stats.totalCustomers), icon: Users, color: 'from-sky-500 to-cyan-600', textColor: 'text-sky-400' },
    { label: isAr ? 'الموردين' : 'Suppliers', value: formatNumber(stats.totalSuppliers), icon: Truck, color: 'from-orange-500 to-amber-600', textColor: 'text-orange-400' },
    { label: isAr ? 'المواد' : 'Materials', value: formatNumber(stats.totalMaterials), icon: Package, color: 'from-violet-500 to-purple-600', textColor: 'text-violet-400' },
    { label: isAr ? 'الموظفين' : 'Employees', value: formatNumber(stats.totalEmployees), icon: UserCheck, color: 'from-pink-500 to-rose-600', textColor: 'text-pink-400' },
    { label: isAr ? 'القيود المحاسبية' : 'Journal Entries', value: formatNumber(stats.totalJournalEntries), icon: FileText, color: 'from-teal-500 to-emerald-600', textColor: 'text-teal-400' },
    { label: isAr ? 'طلبات معلقة' : 'Pending Orders', value: formatNumber(stats.pendingOrders), icon: Clock, color: 'from-amber-500 to-yellow-600', textColor: 'text-amber-400' },
  ], [stats, isAr, currency]);

  // ─── Module Nav Cards ───────────────────────────
  const modules = useMemo(() => [
    { label: isAr ? 'المحاسبة' : 'Accounting', icon: Calculator, path: '/accounting', gradient: 'from-teal-500/15 to-emerald-500/15', iconColor: 'text-teal-600', desc: isAr ? 'القيود والحسابات والتقارير' : 'Entries, accounts & reports' },
    { label: isAr ? 'المبيعات' : 'Sales', icon: ShoppingCart, path: '/sales', gradient: 'from-emerald-500/15 to-green-500/15', iconColor: 'text-emerald-600', desc: isAr ? 'العروض والطلبات والفواتير' : 'Quotes, orders & invoices' },
    { label: isAr ? 'المشتريات' : 'Purchases', icon: Package, path: '/purchases', gradient: 'from-indigo-500/15 to-blue-500/15', iconColor: 'text-indigo-600', desc: isAr ? 'طلبات الشراء والاستلام' : 'PO, receipts & bills' },
    { label: isAr ? 'المستودعات' : 'Warehouse', icon: Truck, path: '/warehouse', gradient: 'from-orange-500/15 to-amber-500/15', iconColor: 'text-orange-600', desc: isAr ? 'المخزون والحركات والتحويلات' : 'Stock, movements & transfers' },
    { label: isAr ? 'إدارة العملاء' : 'CRM', icon: Users, path: '/crm', gradient: 'from-sky-500/15 to-cyan-500/15', iconColor: 'text-sky-600', desc: isAr ? 'العملاء المحتملين والفرص' : 'Leads, contacts & deals' },
    { label: isAr ? 'الموارد البشرية' : 'HR', icon: UserCheck, path: '/hr', gradient: 'from-purple-500/15 to-violet-500/15', iconColor: 'text-purple-600', desc: isAr ? 'الموظفين والرواتب والإجازات' : 'Employees, payroll & leaves' },
  ], [isAr]);

  // ─── Status badge color ─────────────────────────
  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = isAr
      ? { pending: 'معلق', confirmed: 'مؤكد', completed: 'مكتمل', paid: 'مدفوع', cancelled: 'ملغي', draft: 'مسودة' }
      : { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', paid: 'Paid', cancelled: 'Cancelled', draft: 'Draft' };
    return map[status] || status;
  };

  const Arrow = isAr ? ChevronLeft : ChevronRight;

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ═══ Glass Header (Navy → Teal) ═══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-teal-800 to-erp-navy p-6 rounded-2xl shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-teal-400/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-cyan-400/10 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <LayoutDashboard className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-cairo">
                  {isAr ? 'لوحة التحكم' : 'Dashboard'}
                </h1>
                <p className="text-sm text-teal-200/80">
                  {company?.name_ar || company?.name_en || (isAr ? 'نظرة شاملة على أعمالك' : 'Overview of your business')}
                </p>
              </div>
            </div>
          </div>

          {/* LIVE Badge */}
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 gap-1.5 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              LIVE
            </Badge>
          </div>
        </div>
      </div>

      {/* ═══ KPI Cards (8 Glass Cards) ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className={cn("absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br opacity-20 -translate-y-6 translate-x-6", kpi.color)} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white", kpi.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className={cn("text-xl font-bold text-gray-900 dark:text-white", loading && "animate-pulse")}>
                  {loading ? '—' : kpi.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Module Navigation Cards ═══ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 font-cairo flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          {isAr ? 'الأقسام' : 'Modules'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.path}
                onClick={() => navigate(mod.path)}
                className={cn(
                  "group cursor-pointer rounded-xl p-4 border border-gray-100 dark:border-gray-700/50",
                  "bg-gradient-to-br", mod.gradient,
                  "hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm flex items-center justify-center", mod.iconColor)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Arrow className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{mod.label}</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{mod.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Recent Activity (Sales + Purchases) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Orders */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                {isAr ? 'آخر طلبات المبيعات' : 'Recent Sales Orders'}
              </h3>
              <button onClick={() => navigate('/sales')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                {isAr ? 'عرض الكل' : 'View All'} →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentSalesOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{isAr ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
              ) : (
                stats.recentSalesOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{order.customer_name || order.order_number}</p>
                        <p className="text-[11px] text-gray-400 font-mono">#{order.order_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                        {formatCurrency(Number(order.total_amount) || 0, currency)}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColor(order.status))}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Purchase Orders */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Package className="w-4 h-4 text-indigo-600" />
                </div>
                {isAr ? 'آخر طلبات الشراء' : 'Recent Purchase Orders'}
              </h3>
              <button onClick={() => navigate('/purchases')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                {isAr ? 'عرض الكل' : 'View All'} →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentPurchaseOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{isAr ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
              ) : (
                stats.recentPurchaseOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{order.supplier_name || order.order_number}</p>
                        <p className="text-[11px] text-gray-400 font-mono">#{order.order_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                        {formatCurrency(Number(order.total_amount) || 0, currency)}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColor(order.status))}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
