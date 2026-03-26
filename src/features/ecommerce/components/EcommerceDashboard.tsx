/**
 * ════════════════════════════════════════════════════════════════
 * 🛒 EcommerceDashboard — لوحة المتجر الإلكتروني (Glass Design)
 * ════════════════════════════════════════════════════════════════
 *
 * Design: Glass pattern — navy → rose gradient
 *   - Header with Quick Actions + LIVE badge
 *   - 8 KPI glass cards
 *   - Recent orders + Top products
 *   - Realtime via Supabase channel
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsGrid, StatCard } from '@/components/shared/stats/StatCard';
import { supabase } from '@/lib/supabase';
import {
    ShoppingCart, Package, Users, DollarSign, TrendingUp,
    Clock, AlertCircle, CheckCircle, Truck, Star,
    ShoppingBag, Tag, BarChart3, Globe, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; labelEn: string; className: string }> = {
    pending:    { label: 'في الانتظار',   labelEn: 'Pending',    className: 'bg-amber-100 text-amber-700' },
    confirmed:  { label: 'مؤكد',         labelEn: 'Confirmed',  className: 'bg-blue-100 text-blue-700' },
    processing: { label: 'قيد التجهيز',   labelEn: 'Processing', className: 'bg-indigo-100 text-indigo-700' },
    shipped:    { label: 'تم الشحن',      labelEn: 'Shipped',    className: 'bg-purple-100 text-purple-700' },
    delivered:  { label: 'تم التسليم',    labelEn: 'Delivered',  className: 'bg-emerald-100 text-emerald-700' },
    completed:  { label: 'مكتمل',        labelEn: 'Completed',  className: 'bg-emerald-100 text-emerald-700' },
    cancelled:  { label: 'ملغى',         labelEn: 'Cancelled',  className: 'bg-red-100 text-red-700' },
};

interface RecentOrder {
    id: string; order_number: string; customer_name: string;
    total_amount: number; status: string; payment_status: string;
    currency: string; created_at: string;
}
interface TopProduct { product_name: any; total_sold: number; total_revenue: number; }

export default function EcommerceDashboard() {
    const { direction, language } = useLanguage();
    const isAr = language === 'ar';
    const { companyId } = useCompany();

    const [loading, setLoading] = useState(true);
    const [totalSales, setTotalSales] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [pendingOrders, setPendingOrders] = useState(0);
    const [shippedOrders, setShippedOrders] = useState(0);
    const [completedOrders, setCompletedOrders] = useState(0);
    const [avgOrderValue, setAvgOrderValue] = useState(0);
    const [currency, setCurrency] = useState('UAH');
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            // ⚡ Parallel fetch: both queries at once
            const [ordersRes, itemsRes] = await Promise.all([
                supabase.from('ecommerce_orders')
                    .select('id, order_number, customer_name, total_amount, status, payment_status, currency, created_at, customer_phone')
                    .order('created_at', { ascending: false }),
                supabase.from('ecommerce_order_items').select('product_name, quantity, total_price'),
            ]);

            const allOrders = ordersRes.data || [];
            setRecentOrders(allOrders.slice(0, 8).map(o => ({
                id: o.id, order_number: o.order_number, customer_name: o.customer_name,
                total_amount: o.total_amount, status: o.status, payment_status: o.payment_status,
                currency: o.currency, created_at: o.created_at,
            })));

            const validOrders = allOrders.filter(o => !['cancelled', 'returned'].includes(o.status));
            const sales = validOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
            setTotalSales(sales);
            setTotalOrders(allOrders.length);
            setPendingOrders(allOrders.filter(o => o.status === 'pending').length);
            setShippedOrders(allOrders.filter(o => o.status === 'shipped').length);
            setCompletedOrders(allOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length);
            setTotalCustomers(new Set(allOrders.map(o => o.customer_phone)).size);
            setAvgOrderValue(validOrders.length > 0 ? sales / validOrders.length : 0);
            setCurrency(allOrders[0]?.currency || 'UAH');

            const items = itemsRes.data;
            if (items?.length) {
                const map: Record<string, { name: any; sold: number; rev: number }> = {};
                items.forEach(it => {
                    const k = JSON.stringify(it.product_name);
                    if (!map[k]) map[k] = { name: it.product_name, sold: 0, rev: 0 };
                    map[k].sold += it.quantity;
                    map[k].rev += it.total_price;
                });
                setTopProducts(Object.values(map).sort((a, b) => b.rev - a.rev).slice(0, 5)
                    .map(p => ({ product_name: p.name, total_sold: p.sold, total_revenue: p.rev })));
            }
        } catch (err) { console.error('Ecommerce dashboard error:', err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    // Realtime
    useEffect(() => {
        const channel = supabase
            .channel('ecommerce-dashboard-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ecommerce_orders' }, () => fetchDashboard())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchDashboard]);

    const fmt = (val: number) => new Intl.NumberFormat(isAr ? 'ar-u-nu-latn' : 'en-US', { maximumFractionDigits: 0 }).format(val);
    const getName = (name: any) => {
        if (!name) return '-';
        if (typeof name === 'string') return name;
        return name[isAr ? 'ar' : 'en'] || name.ar || name.en || '-';
    };
    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return isAr ? `منذ ${mins} دقيقة` : `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return isAr ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
        return isAr ? `منذ ${Math.floor(hrs / 24)} يوم` : `${Math.floor(hrs / 24)}d ago`;
    };

    if (loading && !recentOrders.length) {
        return (
            <div className="space-y-6" dir={direction}>
                <div className="bg-gradient-to-r from-erp-navy via-rose-800 to-erp-navy p-6 rounded-2xl animate-pulse h-24" />
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir={direction}>
            {/* ─ Header — Glass Gradient (Navy → Rose) ── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-rose-800 to-erp-navy p-6 rounded-2xl shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rose-400/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-rose-400/10 blur-2xl" />
                <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <Globe className="w-6 h-6 text-rose-300" />
                            </div>
                            <h1 className="text-2xl font-bold text-white font-cairo">
                                {isAr ? 'لوحة المتجر الإلكتروني' : 'E-Commerce Dashboard'}
                            </h1>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE
                            </span>
                        </div>
                        <p className="text-sm text-rose-200/80 font-tajawal ps-12">
                            {isAr ? 'نظرة عامة على الطلبات والمبيعات والمنتجات' : 'Overview of orders, sales, and products'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <Package className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'إضافة منتج' : 'Add Product'}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <Tag className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'عرض جديد' : 'New Offer'}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                            <Truck className="w-3.5 h-3.5 me-1.5" />
                            {isAr ? 'تتبع الشحنات' : 'Track Shipments'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─ KPIs Row 1 (Glass) ── */}
            <StatsGrid cols={4}>
                <StatCard
                    label={isAr ? 'إجمالي المبيعات' : 'Total Sales'}
                    value={totalSales}
                    type="positive"
                    icon={DollarSign}
                    formatValue={(v) => `${fmt(Number(v))} ${currency}`}
                    className="bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'إجمالي الطلبات' : 'Total Orders'}
                    value={totalOrders}
                    type="info"
                    icon={ShoppingCart}
                    className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'العملاء' : 'Customers'}
                    value={totalCustomers}
                    type="neutral"
                    icon={Users}
                    className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 backdrop-blur-sm border border-violet-100/50 dark:border-violet-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'طلبات معلقة' : 'Pending Orders'}
                    value={pendingOrders}
                    type="warning"
                    icon={Clock}
                    className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/20 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all"
                />
            </StatsGrid>

            {/* ─ KPIs Row 2 (Glass) ── */}
            <StatsGrid cols={4}>
                <StatCard
                    label={isAr ? 'متوسط قيمة الطلب' : 'Avg. Order Value'}
                    value={avgOrderValue}
                    type="neutral"
                    icon={BarChart3}
                    formatValue={(v) => `${fmt(Number(v))} ${currency}`}
                    className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/30 dark:to-cyan-950/20 backdrop-blur-sm border border-sky-100/50 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'قيد الشحن' : 'In Shipping'}
                    value={shippedOrders}
                    type="info"
                    icon={Truck}
                    className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20 backdrop-blur-sm border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'طلبات مكتملة' : 'Completed'}
                    value={completedOrders}
                    type="positive"
                    icon={CheckCircle}
                    className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 backdrop-blur-sm border border-teal-100/50 dark:border-teal-800/30 shadow-sm hover:shadow-md transition-all"
                />
                <StatCard
                    label={isAr ? 'أفضل المنتجات' : 'Top Products'}
                    value={topProducts.length}
                    type="neutral"
                    icon={Star}
                    className="bg-gradient-to-br from-rose-50/80 to-pink-50/50 dark:from-rose-950/30 dark:to-pink-950/20 backdrop-blur-sm border border-rose-100/50 dark:border-rose-800/30 shadow-sm hover:shadow-md transition-all"
                />
            </StatsGrid>

            {/* ─ Charts Row (Glass) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders — 2 cols */}
                <Card className="lg:col-span-2 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-rose-500" />
                            {isAr ? 'الطلبات الأخيرة' : 'Recent Orders'}
                        </CardTitle>
                        <Badge variant="secondary" className="text-[11px] font-mono bg-rose-50 text-rose-600 border-0">
                            {totalOrders}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                            {recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-tajawal">{isAr ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
                                </div>
                            ) : (
                                recentOrders.map(order => {
                                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                    return (
                                        <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                                                    <Package className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-tajawal font-medium">{order.order_number}</p>
                                                    <p className="text-[11px] text-gray-400">{order.customer_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <Badge className={cn("text-[10px] px-1.5 py-0 h-4 font-tajawal", sc.className)}>
                                                    {isAr ? sc.label : sc.labelEn}
                                                </Badge>
                                                <div className="text-end">
                                                    <p className="font-mono text-sm font-bold text-erp-navy dark:text-white">
                                                        {fmt(order.total_amount)} <span className="text-[10px] text-gray-400">{order.currency}</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{timeAgo(order.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Products — 1 col */}
                <Card className="border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2 border-b border-gray-100/50 dark:border-gray-800/50">
                        <CardTitle className="text-base font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            {isAr ? 'الأكثر مبيعاً' : 'Top Selling'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        {topProducts.length === 0 ? (
                            <div className="text-center py-4 text-gray-400">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-tajawal">{isAr ? 'لا توجد مبيعات بعد' : 'No sales data'}</p>
                            </div>
                        ) : (
                            topProducts.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                                            i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"
                                        )}>{i + 1}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-tajawal truncate">{getName(p.product_name)}</p>
                                            <p className="text-[11px] text-gray-400">{p.total_sold} {isAr ? 'مبيعات' : 'sold'}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-rose-600 shrink-0">
                                        {fmt(p.total_revenue)} {currency}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
