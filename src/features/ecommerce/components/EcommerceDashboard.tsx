/**
 * ═══════════════════════════════════════════════════════════════
 *  EcommerceDashboard — لوحة معلومات المتجر
 * ═══════════════════════════════════════════════════════════════
 *  إحصائيات حية من Supabase: الطلبات، المبيعات، العملاء
 *  الطلبات الأخيرة، الأكثر مبيعاً، السلات المهجورة
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import {
    ShoppingCart, Package, Users, DollarSign, TrendingUp,
    Eye, Clock, AlertCircle, CheckCircle, Truck, Star,
    RefreshCw, ExternalLink, ShoppingBag, Tag, BarChart3,
    ArrowUpRight, Loader2,
} from 'lucide-react';

interface DashboardStats {
    totalSales: number;
    newOrders: number;
    totalCustomers: number;
    pendingOrders: number;
    currency: string;
}

interface RecentOrder {
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    status: string;
    payment_status: string;
    currency: string;
    created_at: string;
}

interface TopProduct {
    product_name: any;
    total_sold: number;
    total_revenue: number;
}

const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string; icon: any }> = {
    pending: { label: 'في الانتظار', labelEn: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    confirmed: { label: 'مؤكد', labelEn: 'Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { label: 'قيد التجهيز', labelEn: 'Processing', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Package },
    shipped: { label: 'تم الشحن', labelEn: 'Shipped', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
    delivered: { label: 'تم التسليم', labelEn: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    completed: { label: 'مكتمل', labelEn: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'ملغى', labelEn: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

export default function EcommerceDashboard() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({ totalSales: 0, newOrders: 0, totalCustomers: 0, pendingOrders: 0, currency: 'UAH' });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            // 1. Recent orders
            const { data: orders } = await supabase
                .from('ecommerce_orders')
                .select('id, order_number, customer_name, total_amount, status, payment_status, currency, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            setRecentOrders(orders || []);

            // 2. Stats from orders
            const { data: allOrders } = await supabase
                .from('ecommerce_orders')
                .select('total_amount, status, customer_phone, currency');

            if (allOrders) {
                const totalSales = allOrders
                    .filter(o => !['cancelled', 'returned'].includes(o.status))
                    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
                const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
                const uniqueCustomers = new Set(allOrders.map(o => o.customer_phone)).size;
                const currency = allOrders[0]?.currency || 'UAH';

                setStats({
                    totalSales,
                    newOrders: allOrders.length,
                    totalCustomers: uniqueCustomers,
                    pendingOrders,
                    currency,
                });
            }

            // 3. Top products from order items
            const { data: items } = await supabase
                .from('ecommerce_order_items')
                .select('product_name, quantity, total_price');

            if (items && items.length > 0) {
                const productMap: Record<string, { name: any; sold: number; revenue: number }> = {};
                items.forEach(item => {
                    const key = JSON.stringify(item.product_name);
                    if (!productMap[key]) productMap[key] = { name: item.product_name, sold: 0, revenue: 0 };
                    productMap[key].sold += item.quantity;
                    productMap[key].revenue += item.total_price;
                });
                const sorted = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
                setTopProducts(sorted.map(p => ({ product_name: p.name, total_sold: p.sold, total_revenue: p.revenue })));
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboard(); }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 }).format(val);
    };

    const getName = (name: any) => {
        if (!name) return '-';
        if (typeof name === 'string') return name;
        return name[isRTL ? 'ar' : 'en'] || name.ar || name.en || '-';
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return isRTL ? `منذ ${mins} دقيقة` : `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return isRTL ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return isRTL ? `منذ ${days} يوم` : `${days}d ago`;
    };

    const statCards = [
        { label: isRTL ? 'إجمالي المبيعات' : 'Total Sales', value: formatCurrency(stats.totalSales), suffix: stats.currency, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: isRTL ? 'الطلبات' : 'Orders', value: stats.newOrders.toString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: isRTL ? 'العملاء' : 'Customers', value: stats.totalCustomers.toString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: isRTL ? 'طلبات معلقة' : 'Pending', value: stats.pendingOrders.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-erp-teal" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">
                                        {stat.value}
                                        {stat.suffix && <span className="text-xs text-gray-400 ms-1">{stat.suffix}</span>}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <Card className="lg:col-span-2 border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                            {isRTL ? 'الطلبات الأخيرة' : 'Recent Orders'}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={fetchDashboard} className="gap-1.5 text-xs">
                            <RefreshCw className="w-3.5 h-3.5" />
                            {isRTL ? 'تحديث' : 'Refresh'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">{isRTL ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {recentOrders.slice(0, 6).map(order => {
                                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                    return (
                                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <Package className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-erp-navy dark:text-white">{order.order_number}</p>
                                                    <p className="text-xs text-gray-500">{order.customer_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge className={`text-[10px] ${sc.color}`}>
                                                    {isRTL ? sc.label : sc.labelEn}
                                                </Badge>
                                                <div className="text-end">
                                                    <p className="font-semibold text-sm text-erp-navy dark:text-white font-mono">
                                                        {formatCurrency(order.total_amount)} <span className="text-[10px] text-gray-400">{order.currency}</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">{timeAgo(order.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            {isRTL ? 'الأكثر مبيعاً' : 'Top Selling'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topProducts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-xs">{isRTL ? 'لا توجد مبيعات بعد' : 'No sales data yet'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topProducts.map((product, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                                                {i + 1}
                                            </span>
                                            <div>
                                                <p className="font-medium text-sm text-erp-navy dark:text-white">{getName(product.product_name)}</p>
                                                <p className="text-xs text-gray-500">{product.total_sold} {isRTL ? 'مبيعات' : 'sold'}</p>
                                            </div>
                                        </div>
                                        <p className="font-semibold text-sm text-erp-navy dark:text-white font-mono">
                                            {formatCurrency(product.total_revenue)} <span className="text-[10px] text-gray-400">{stats.currency}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                        {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button variant="outline" className="h-20 flex flex-col gap-2 text-gray-600 dark:text-gray-400 hover:border-erp-teal hover:text-erp-teal transition-all">
                            <Package className="w-6 h-6" />
                            <span className="text-xs">{isRTL ? 'إضافة منتج' : 'Add Product'}</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2 text-gray-600 dark:text-gray-400 hover:border-erp-teal hover:text-erp-teal transition-all">
                            <Tag className="w-6 h-6" />
                            <span className="text-xs">{isRTL ? 'عرض جديد' : 'New Offer'}</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2 text-gray-600 dark:text-gray-400 hover:border-erp-teal hover:text-erp-teal transition-all">
                            <Truck className="w-6 h-6" />
                            <span className="text-xs">{isRTL ? 'تتبع الشحنات' : 'Track Shipments'}</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2 text-erp-teal border-erp-teal/30 hover:bg-erp-teal/10 transition-all">
                            <BarChart3 className="w-6 h-6" />
                            <span className="text-xs">{isRTL ? 'التقارير' : 'Reports'}</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
