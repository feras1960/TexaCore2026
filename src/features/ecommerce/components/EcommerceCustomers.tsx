/**
 * ═══════════════════════════════════════════════════════════════
 *  EcommerceCustomers — إدارة عملاء المتجر
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Users, DollarSign, Loader2, ShoppingCart } from 'lucide-react';

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
    const { companyId } = useCompany();
    const [searchQuery, setSearchQuery] = useState('');

    // ─── Cache-first query (IndexedDB persistence) ────────────
    const { data: customers = [], isLoading: loading } = useCachedQuery({
        queryKey: ['ecommerce', 'customers', companyId],
        queryFn: async () => {
            const { data } = await supabase
                .from('ecommerce_orders')
                .select('customer_name, customer_email, customer_phone, total_amount, currency, created_at, status');

            if (!data) return [] as Customer[];

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
            return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });

    // ─── Realtime — customers derived from orders ────────────
    useRealtimeInvalidation({
        table: 'ecommerce_orders',
        companyId,
        queryKeys: [['ecommerce', 'customers']],
    });

    const filtered = customers.filter(c =>
        !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
    );

    const formatCurrency = (val: number) => new Intl.NumberFormat(isRTL ? 'ar-u-nu-latn' : 'en-US', { maximumFractionDigits: 2 }).format(val);

    // ─── NexaListTable columns ────────────
    const columns: NexaListColumn<Customer>[] = [
        {
            id: 'name',
            header: isRTL ? 'العميل' : 'Customer',
            cell: (row) => (
                <div>
                    <p className="font-medium text-sm">{row.name}</p>
                    {row.email && <p className="text-xs text-gray-500">{row.email}</p>}
                </div>
            ),
        },
        {
            id: 'phone',
            header: isRTL ? 'الهاتف' : 'Phone',
            cell: (row) => <span className="font-mono text-xs" dir="ltr">{row.phone}</span>,
        },
        {
            id: 'orders',
            header: isRTL ? 'الطلبات' : 'Orders',
            align: 'center',
            sortable: true,
            sortKey: 'totalOrders',
            cell: (row) => <Badge variant="outline">{row.totalOrders}</Badge>,
        },
        {
            id: 'spent',
            header: isRTL ? 'الإنفاق' : 'Spent',
            align: 'end',
            sortable: true,
            sortKey: 'totalSpent',
            cell: (row) => (
                <span className="font-mono font-semibold">
                    {formatCurrency(row.totalSpent)} <span className="text-xs text-gray-400">{row.currency}</span>
                </span>
            ),
        },
        {
            id: 'lastOrder',
            header: isRTL ? 'آخر طلب' : 'Last Order',
            sortable: true,
            sortKey: 'lastOrder',
            cell: (row) => <span className="text-xs text-gray-500">{new Date(row.lastOrder).toLocaleDateString(isRTL ? 'ar' : 'en')}</span>,
        },
    ];

    if (loading && !customers.length) {
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

            {/* NexaListTable */}
            <NexaListTable<Customer>
                data={filtered}
                columns={columns}
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={isRTL ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                isLoading={loading}
                getRowKey={(row) => row.phone}
                totalCount={customers.length}
                countLabel={isRTL ? 'عميل' : 'customers'}
                emptyMessage={isRTL ? 'لا يوجد عملاء' : 'No customers found'}
                showFooter={true}
                footerRightContent={
                    <span className="font-mono font-bold text-erp-teal">
                        {isRTL ? 'الإجمالي: ' : 'Total: '}{formatCurrency(filtered.reduce((s, c) => s + c.totalSpent, 0))} {customers[0]?.currency || ''}
                    </span>
                }
            />
        </div>
    );
}
