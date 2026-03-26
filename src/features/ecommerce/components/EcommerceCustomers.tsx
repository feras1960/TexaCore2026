/**
 * ═══════════════════════════════════════════════════════════════
 *  EcommerceCustomers — إدارة عملاء المتجر
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Users, Search, Package, DollarSign, Phone, Mail, Loader2, ShoppingCart, RefreshCw } from 'lucide-react';

interface Customer {
    phone: string;
    name: string;
    email?: string;
    totalOrders: number;
    totalSpent: number;
    lastOrder: string;
    currency: string;
}

export default function EcommerceCustomers() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchCustomers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ecommerce_orders')
            .select('customer_name, customer_email, customer_phone, total_amount, currency, created_at, status');

        if (data) {
            const map: Record<string, Customer> = {};
            data.forEach(o => {
                const key = o.customer_phone;
                if (!map[key]) {
                    map[key] = { phone: key, name: o.customer_name, email: o.customer_email, totalOrders: 0, totalSpent: 0, lastOrder: o.created_at, currency: o.currency };
                }
                if (!['cancelled'].includes(o.status)) {
                    map[key].totalOrders++;
                    map[key].totalSpent += o.total_amount;
                }
                if (o.created_at > map[key].lastOrder) {
                    map[key].lastOrder = o.created_at;
                    map[key].name = o.customer_name;
                }
            });
            setCustomers(Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent));
        }
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const filtered = customers.filter(c =>
        !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
    );

    const formatCurrency = (val: number) => new Intl.NumberFormat(isRTL ? 'ar-u-nu-latn' : 'en-US', { maximumFractionDigits: 2 }).format(val);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-erp-teal" /></div>;
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{isRTL ? 'إجمالي العملاء' : 'Total Customers'}</p>
                            <p className="text-xl font-bold font-mono">{customers.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{isRTL ? 'متوسط الإنفاق' : 'Avg Spend'}</p>
                            <p className="text-xl font-bold font-mono">
                                {customers.length > 0 ? formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length) : '0'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{isRTL ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                            <p className="text-xl font-bold font-mono">{customers.reduce((s, c) => s + c.totalOrders, 0)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search + Table */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder={isRTL ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'} className="ps-9 text-sm" />
                </div>
                <Button variant="ghost" size="sm" onClick={fetchCustomers}><RefreshCw className="w-4 h-4" /></Button>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                                    <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'العميل' : 'Customer'}</th>
                                    <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'الهاتف' : 'Phone'}</th>
                                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'الطلبات' : 'Orders'}</th>
                                    <th className="text-end px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'الإنفاق' : 'Spent'}</th>
                                    <th className="text-start px-4 py-3 text-xs font-medium text-gray-500">{isRTL ? 'آخر طلب' : 'Last Order'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => (
                                    <tr key={c.phone} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{c.name}</p>
                                            {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">{c.phone}</td>
                                        <td className="px-4 py-3 text-center"><Badge variant="outline">{c.totalOrders}</Badge></td>
                                        <td className="px-4 py-3 text-end font-mono font-semibold">{formatCurrency(c.totalSpent)} <span className="text-xs text-gray-400">{c.currency}</span></td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.lastOrder).toLocaleDateString(isRTL ? 'ar' : 'en')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>{isRTL ? 'لا يوجد عملاء' : 'No customers found'}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
