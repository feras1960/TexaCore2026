/**
 * ═══════════════════════════════════════════════════════════════
 *  EcommerceOrders — إدارة الطلبات (Kanban + Table)
 * ═══════════════════════════════════════════════════════════════
 *  - عرض Kanban للحالات
 *  - جدول قائمة الطلبات
 *  - تفاصيل الطلب + تحديث الحالة
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import {
    ShoppingCart, Package, Clock, CheckCircle, Truck, XCircle,
    Search, Filter, List, LayoutGrid, Eye, MapPin, Phone,
    Mail, User, CreditCard, Loader2, ChevronRight, ArrowRight,
    RefreshCw, FileText,
} from 'lucide-react';

// ═══ Types ═══
interface OrderItem {
    id: string;
    product_name: any;
    product_image?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    unit?: string;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email?: string;
    customer_phone: string;
    status: string;
    payment_status: string;
    payment_method: string;
    subtotal: number;
    shipping_amount: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    shipping_address: any;
    customer_notes?: string;
    created_at: string;
    confirmed_at?: string;
    shipped_at?: string;
    delivered_at?: string;
}

// ═══ Status Config ═══
const ORDER_STAGES = [
    { id: 'pending', label: 'في الانتظار', labelEn: 'Pending', color: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10', icon: Clock, textColor: 'text-yellow-700 dark:text-yellow-400' },
    { id: 'confirmed', label: 'مؤكد', labelEn: 'Confirmed', color: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', icon: CheckCircle, textColor: 'text-blue-700 dark:text-blue-400' },
    { id: 'processing', label: 'قيد التجهيز', labelEn: 'Processing', color: 'border-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10', icon: Package, textColor: 'text-indigo-700 dark:text-indigo-400' },
    { id: 'shipped', label: 'تم الشحن', labelEn: 'Shipped', color: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10', icon: Truck, textColor: 'text-purple-700 dark:text-purple-400' },
    { id: 'delivered', label: 'تم التسليم', labelEn: 'Delivered', color: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/10', icon: CheckCircle, textColor: 'text-green-700 dark:text-green-400' },
    { id: 'cancelled', label: 'ملغى', labelEn: 'Cancelled', color: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/10', icon: XCircle, textColor: 'text-red-700 dark:text-red-400' },
];

export default function EcommerceOrders() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [view, setView] = useState<'kanban' | 'table'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ecommerce_orders')
            .select('*')
            .order('created_at', { ascending: false });
        setOrders(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchOrders(); }, []);

    const openOrderDetails = async (order: Order) => {
        setSelectedOrder(order);
        setDetailsOpen(true);
        const { data } = await supabase
            .from('ecommerce_order_items')
            .select('*')
            .eq('order_id', order.id);
        setOrderItems(data || []);
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdating(true);
        const updateData: any = { status: newStatus };
        if (newStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString();
        if (newStatus === 'shipped') updateData.shipped_at = new Date().toISOString();
        if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString();

        await supabase.from('ecommerce_orders').update(updateData).eq('id', orderId);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, ...updateData } : o));
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, status: newStatus, ...updateData } : null);
        }
        setUpdating(false);
    };

    const getNextStatus = (current: string): string | null => {
        const flow = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        const idx = flow.indexOf(current);
        return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
    };

    const getStageConfig = (status: string) => ORDER_STAGES.find(s => s.id === status) || ORDER_STAGES[0];

    const filteredOrders = orders.filter(o =>
        !searchQuery || o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_phone.includes(searchQuery)
    );

    const ordersByStage = (stageId: string) => filteredOrders.filter(o => o.status === stageId);

    const formatCurrency = (val: number, currency: string) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 }).format(val) + ` ${currency}`;

    const getName = (name: any) => {
        if (!name) return '-';
        if (typeof name === 'string') return name;
        return name[isRTL ? 'ar' : 'en'] || name.ar || name.en || '-';
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-erp-teal" /></div>;
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={isRTL ? 'بحث بالرقم أو اسم العميل...' : 'Search by number or customer...'}
                            className="ps-9 text-sm"
                        />
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <Button variant={view === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setView('kanban')} className="gap-1.5 text-xs">
                        <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                    </Button>
                    <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setView('table')} className="gap-1.5 text-xs">
                        <List className="w-3.5 h-3.5" /> {isRTL ? 'جدول' : 'Table'}
                    </Button>
                </div>
            </div>

            {/* Kanban View */}
            {view === 'kanban' && (
                <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
                    {ORDER_STAGES.filter(s => s.id !== 'cancelled').map(stage => {
                        const stageOrders = ordersByStage(stage.id);
                        return (
                            <div key={stage.id} className={`flex-shrink-0 w-72 rounded-xl border-t-4 ${stage.color} ${stage.bg} p-3`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <stage.icon className={`w-4 h-4 ${stage.textColor}`} />
                                        <span className={`text-sm font-semibold ${stage.textColor}`}>{isRTL ? stage.label : stage.labelEn}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1.5">{stageOrders.length}</Badge>
                                </div>
                                <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                                    {stageOrders.map(order => (
                                        <div
                                            key={order.id}
                                            className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => openOrderDetails(order)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-mono font-semibold text-erp-navy dark:text-white">{order.order_number}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{order.customer_name}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-erp-teal font-mono">{formatCurrency(order.total_amount, order.currency)}</span>
                                                {getNextStatus(order.status) && (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-6 px-2 text-[10px] gap-1"
                                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, getNextStatus(order.status)!); }}
                                                    >
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stageOrders.length === 0 && (
                                        <p className="text-xs text-center text-gray-400 py-6">{isRTL ? 'لا توجد طلبات' : 'No orders'}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Table View */}
            {view === 'table' && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'الطلب' : 'Order'}</th>
                                        <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'العميل' : 'Customer'}</th>
                                        <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'الحالة' : 'Status'}</th>
                                        <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'الدفع' : 'Payment'}</th>
                                        <th className="text-end px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                        <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'التاريخ' : 'Date'}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map(order => {
                                        const sc = getStageConfig(order.status);
                                        return (
                                            <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => openOrderDetails(order)}>
                                                <td className="px-4 py-3 font-mono font-medium text-erp-navy dark:text-white">{order.order_number}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{order.customer_name}</p>
                                                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`text-[10px] ${sc.bg} ${sc.textColor}`}>{isRTL ? sc.label : sc.labelEn}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={`text-[10px] ${order.payment_status === 'paid' ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}`}>
                                                        {order.payment_status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : (isRTL ? 'معلق' : 'Pending')}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono font-semibold">{formatCurrency(order.total_amount, order.currency)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}</td>
                                                <td className="px-4 py-3"><Eye className="w-4 h-4 text-gray-400" /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredOrders.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>{isRTL ? 'لا توجد طلبات' : 'No orders found'}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Order Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
                    {selectedOrder && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="w-5 h-5 text-erp-teal" />
                                    {isRTL ? 'تفاصيل الطلب' : 'Order Details'} — {selectedOrder.order_number}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-5 mt-4">
                                {/* Status + Actions */}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <Badge className={`text-sm py-1 px-3 ${getStageConfig(selectedOrder.status).bg} ${getStageConfig(selectedOrder.status).textColor}`}>
                                        {isRTL ? getStageConfig(selectedOrder.status).label : getStageConfig(selectedOrder.status).labelEn}
                                    </Badge>
                                    <div className="flex gap-2">
                                        {getNextStatus(selectedOrder.status) && (
                                            <Button size="sm" onClick={() => updateOrderStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!)} disabled={updating} className="gap-1.5 text-xs">
                                                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                                                {isRTL ? `نقل إلى: ${getStageConfig(getNextStatus(selectedOrder.status)!).label}` : `Move to: ${getStageConfig(getNextStatus(selectedOrder.status)!).labelEn}`}
                                            </Button>
                                        )}
                                        {selectedOrder.status === 'pending' && (
                                            <Button variant="destructive" size="sm" onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')} className="text-xs">
                                                {isRTL ? 'إلغاء' : 'Cancel'}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <Card className="border shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> {isRTL ? 'بيانات العميل' : 'Customer Info'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.customer_name}</div>
                                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> <span dir="ltr">{selectedOrder.customer_phone}</span></div>
                                        {selectedOrder.customer_email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.customer_email}</div>}
                                    </CardContent>
                                </Card>

                                {/* Shipping Address */}
                                {selectedOrder.shipping_address && (
                                    <Card className="border shadow-none">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {isRTL ? 'عنوان الشحن' : 'Shipping Address'}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                                            {typeof selectedOrder.shipping_address === 'string' ? selectedOrder.shipping_address : (
                                                <div className="space-y-0.5">
                                                    <p>{selectedOrder.shipping_address.country} — {selectedOrder.shipping_address.city}</p>
                                                    {selectedOrder.shipping_address.district && <p>{selectedOrder.shipping_address.district}</p>}
                                                    {selectedOrder.shipping_address.street && <p>{selectedOrder.shipping_address.street}</p>}
                                                    {selectedOrder.shipping_address.building && <p>{selectedOrder.shipping_address.building}</p>}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Order Items */}
                                <Card className="border shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" /> {isRTL ? 'المنتجات' : 'Items'} ({orderItems.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {orderItems.map(item => (
                                                <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                                        {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{getName(item.product_name)}</p>
                                                        <p className="text-xs text-gray-500">{item.quantity} × {formatCurrency(item.unit_price, selectedOrder.currency)}</p>
                                                    </div>
                                                    <span className="text-sm font-mono font-semibold">{formatCurrency(item.total_price, selectedOrder.currency)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Totals */}
                                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span><span className="font-mono">{formatCurrency(selectedOrder.subtotal, selectedOrder.currency)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">{isRTL ? 'الشحن' : 'Shipping'}</span><span className="font-mono">{formatCurrency(selectedOrder.shipping_amount, selectedOrder.currency)}</span></div>
                                    {selectedOrder.tax_amount > 0 && <div className="flex justify-between"><span className="text-gray-500">{isRTL ? 'الضريبة' : 'Tax'}</span><span className="font-mono">{formatCurrency(selectedOrder.tax_amount, selectedOrder.currency)}</span></div>}
                                    <div className="border-t pt-2 flex justify-between font-bold">
                                        <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                                        <span className="text-erp-teal font-mono text-lg">{formatCurrency(selectedOrder.total_amount, selectedOrder.currency)}</span>
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div className="flex items-center gap-3 text-sm">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">{isRTL ? 'طريقة الدفع:' : 'Payment:'}</span>
                                    <span>{selectedOrder.payment_method === 'cod' ? (isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery') : (isRTL ? 'تحويل بنكي' : 'Bank Transfer')}</span>
                                    <Badge variant="outline" className={selectedOrder.payment_status === 'paid' ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}>
                                        {selectedOrder.payment_status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : (isRTL ? 'معلق' : 'Pending')}
                                    </Badge>
                                </div>

                                {selectedOrder.customer_notes && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3 text-sm">
                                        <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">{isRTL ? 'ملاحظات العميل:' : 'Customer Notes:'}</p>
                                        <p className="text-gray-600 dark:text-gray-400">{selectedOrder.customer_notes}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
