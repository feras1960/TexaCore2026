/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Material Inventory Tab
 * تبويب المخزون للمادة - عرض المخزون حسب المستودعات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NexaTable, type Column, StatusBadge } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Database, Warehouse, Package, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryRecord {
    id: string;
    warehouse_id: string;
    warehouse_name: string;
    warehouse_code: string;
    total_quantity: number;
    available_quantity: number;
    reserved_quantity: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    last_updated: string;
}

interface MaterialInventoryTabProps {
    data: any;
}

export function MaterialInventoryTab({ data }: MaterialInventoryTabProps) {
    const { t, language } = useLanguage();
    const [inventoryData, setInventoryData] = useState<InventoryRecord[]>([]);
    const [loading, setLoading] = useState(false);

    // Mock data - replace with actual API call
    useEffect(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setInventoryData([
                {
                    id: '1',
                    warehouse_id: 'wh-1',
                    warehouse_name: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
                    warehouse_code: 'WH-001',
                    total_quantity: 500,
                    available_quantity: 450,
                    reserved_quantity: 50,
                    status: 'in_stock',
                    last_updated: '2024-02-02T10:30:00Z',
                },
                {
                    id: '2',
                    warehouse_id: 'wh-2',
                    warehouse_name: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse',
                    warehouse_code: 'WH-002',
                    total_quantity: 150,
                    available_quantity: 120,
                    reserved_quantity: 30,
                    status: 'in_stock',
                    last_updated: '2024-02-02T09:15:00Z',
                },
                {
                    id: '3',
                    warehouse_id: 'wh-3',
                    warehouse_name: language === 'ar' ? 'مستودع المصنع' : 'Factory Warehouse',
                    warehouse_code: 'WH-003',
                    total_quantity: 25,
                    available_quantity: 25,
                    reserved_quantity: 0,
                    status: 'low_stock',
                    last_updated: '2024-02-01T16:45:00Z',
                },
            ]);
            setLoading(false);
        }, 500);
    }, [data?.id, language]);

    // Calculate totals
    const totals = inventoryData.reduce(
        (acc, record) => ({
            total: acc.total + record.total_quantity,
            available: acc.available + record.available_quantity,
            reserved: acc.reserved + record.reserved_quantity,
        }),
        { total: 0, available: 0, reserved: 0 }
    );

    // Table columns
    const columns: Column<InventoryRecord>[] = [
        {
            key: 'warehouse_code',
            title: language === 'ar' ? 'كود المستودع' : 'Warehouse Code',
            align: 'start',
            render: (value) => (
                <span className="font-mono font-semibold text-erp-navy dark:text-white">{value}</span>
            ),
        },
        {
            key: 'warehouse_name',
            title: language === 'ar' ? 'اسم المستودع' : 'Warehouse Name',
            align: 'start',
            render: (value) => (
                <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-gray-400" />
                    <span className="font-tajawal">{value}</span>
                </div>
            ),
        },
        {
            key: 'total_quantity',
            title: language === 'ar' ? 'الكمية الإجمالية' : 'Total Quantity',
            align: 'end',
            render: (value) => (
                <div className="flex items-center justify-end gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {value.toLocaleString('en-US')}
                    </span>
                </div>
            ),
        },
        {
            key: 'available_quantity',
            title: language === 'ar' ? 'المتاح' : 'Available',
            align: 'end',
            render: (value) => (
                <div className="flex items-center justify-end gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-green-600 dark:text-green-400">
                        {value.toLocaleString('en-US')}
                    </span>
                </div>
            ),
        },
        {
            key: 'reserved_quantity',
            title: language === 'ar' ? 'المحجوز' : 'Reserved',
            align: 'end',
            render: (value) => (
                <div className="flex items-center justify-end gap-2">
                    <Lock className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {value.toLocaleString('en-US')}
                    </span>
                </div>
            ),
        },
        {
            key: 'status',
            title: language === 'ar' ? 'الحالة' : 'Status',
            align: 'start',
            render: (value) => {
                const statusMap = {
                    in_stock: { label: language === 'ar' ? 'متوفر' : 'In Stock', variant: 'confirmed' as const },
                    low_stock: { label: language === 'ar' ? 'مخزون منخفض' : 'Low Stock', variant: 'pending' as const },
                    out_of_stock: { label: language === 'ar' ? 'نفذ' : 'Out of Stock', variant: 'cancelled' as const },
                };
                const status = statusMap[value] || statusMap.in_stock;
                return <StatusBadge status={status.variant} label={status.label} size="sm" />;
            },
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                                    {language === 'ar' ? 'إجمالي المخزون' : 'Total Stock'}
                                </p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                    {totals.total.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                                    {language === 'ar' ? 'المخزون المتاح' : 'Available Stock'}
                                </p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    {totals.available.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">
                                    {language === 'ar' ? 'المخزون المحجوز' : 'Reserved Stock'}
                                </p>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                    {totals.reserved.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'المخزون حسب المستودعات' : 'Inventory by Warehouse'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <NexaTable
                        data={inventoryData}
                        columns={columns}
                        loading={loading}
                        showRowNumbers
                        rowKey="id"
                        emptyMessage={language === 'ar' ? 'لا توجد بيانات مخزون' : 'No inventory data'}
                    />
                </CardContent>
            </Card>

            {/* Info Note */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">
                        {language === 'ar' ? 'ملاحظة' : 'Note'}
                    </p>
                    <p>
                        {language === 'ar'
                            ? 'يتم تحديث بيانات المخزون تلقائياً عند كل حركة إدخال أو إخراج. الكميات المحجوزة هي الكميات المخصصة لطلبات البيع المعلقة.'
                            : 'Inventory data is automatically updated with each stock movement. Reserved quantities are allocated to pending sales orders.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
