/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Material Movements Tab
 * تبويب حركات المخزون للمادة
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NexaTable, type Column, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, ArrowRightLeft, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockMovement {
    id: string;
    date: string;
    type: 'in' | 'out' | 'transfer' | 'adjustment';
    reference: string;
    warehouse_from?: string;
    warehouse_to?: string;
    quantity: number;
    unit_price?: number;
    total_value?: number;
    notes?: string;
    created_by: string;
}

interface MaterialMovementsTabProps {
    data: any;
}

export function MaterialMovementsTab({ data }: MaterialMovementsTabProps) {
    const { t, language } = useLanguage();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Mock data - replace with actual API call
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setMovements([
                {
                    id: '1',
                    date: '2024-02-02T10:30:00Z',
                    type: 'in',
                    reference: 'PO-2024-001',
                    warehouse_to: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
                    quantity: 100,
                    unit_price: 25.50,
                    total_value: 2550,
                    notes: language === 'ar' ? 'شراء من المورد الرئيسي' : 'Purchase from main supplier',
                    created_by: 'أحمد محمد',
                },
                {
                    id: '2',
                    date: '2024-02-01T14:15:00Z',
                    type: 'out',
                    reference: 'SO-2024-005',
                    warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
                    quantity: 50,
                    unit_price: 30.00,
                    total_value: 1500,
                    notes: language === 'ar' ? 'بيع للعميل' : 'Sale to customer',
                    created_by: 'فاطمة علي',
                },
                {
                    id: '3',
                    date: '2024-01-31T09:00:00Z',
                    type: 'transfer',
                    reference: 'TR-2024-003',
                    warehouse_from: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
                    warehouse_to: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse',
                    quantity: 30,
                    notes: language === 'ar' ? 'نقل داخلي' : 'Internal transfer',
                    created_by: 'محمد خالد',
                },
                {
                    id: '4',
                    date: '2024-01-30T16:45:00Z',
                    type: 'adjustment',
                    reference: 'ADJ-2024-002',
                    warehouse_to: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse',
                    quantity: 5,
                    notes: language === 'ar' ? 'تسوية جرد' : 'Inventory adjustment',
                    created_by: 'سارة أحمد',
                },
            ]);
            setLoading(false);
        }, 500);
    }, [data?.id, language]);

    // Calculate summary
    const summary = movements.reduce(
        (acc, mov) => {
            if (mov.type === 'in' || mov.type === 'adjustment') {
                acc.totalIn += mov.quantity;
            } else if (mov.type === 'out') {
                acc.totalOut += mov.quantity;
            }
            return acc;
        },
        { totalIn: 0, totalOut: 0 }
    );

    // Table columns
    const columns: Column<StockMovement>[] = [
        {
            key: 'date',
            title: language === 'ar' ? 'التاريخ' : 'Date',
            align: 'start',
            render: (value) => (
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                        {new Date(value).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        })}
                    </span>
                </div>
            ),
        },
        {
            key: 'type',
            title: language === 'ar' ? 'النوع' : 'Type',
            align: 'start',
            render: (value) => {
                const typeConfig = {
                    in: {
                        label: language === 'ar' ? 'إدخال' : 'In',
                        icon: TrendingUp,
                        color: 'text-green-600 bg-green-50 border-green-200',
                    },
                    out: {
                        label: language === 'ar' ? 'إخراج' : 'Out',
                        icon: TrendingDown,
                        color: 'text-red-600 bg-red-50 border-red-200',
                    },
                    transfer: {
                        label: language === 'ar' ? 'نقل' : 'Transfer',
                        icon: ArrowRightLeft,
                        color: 'text-blue-600 bg-blue-50 border-blue-200',
                    },
                    adjustment: {
                        label: language === 'ar' ? 'تسوية' : 'Adjustment',
                        icon: Filter,
                        color: 'text-orange-600 bg-orange-50 border-orange-200',
                    },
                };
                const config = typeConfig[value] || typeConfig.in;
                const Icon = config.icon;
                return (
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium', config.color)}>
                        <Icon className="w-3.5 h-3.5" />
                        {config.label}
                    </div>
                );
            },
        },
        {
            key: 'reference',
            title: language === 'ar' ? 'المرجع' : 'Reference',
            align: 'start',
            render: (value) => (
                <span className="font-mono text-sm font-semibold text-erp-navy dark:text-white">{value}</span>
            ),
        },
        {
            key: 'warehouse_from',
            title: language === 'ar' ? 'من' : 'From',
            align: 'start',
            render: (value) => value ? (
                <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            ) : (
                <span className="text-xs text-gray-400">-</span>
            ),
        },
        {
            key: 'warehouse_to',
            title: language === 'ar' ? 'إلى' : 'To',
            align: 'start',
            render: (value) => value ? (
                <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            ) : (
                <span className="text-xs text-gray-400">-</span>
            ),
        },
        {
            key: 'quantity',
            title: language === 'ar' ? 'الكمية' : 'Quantity',
            align: 'end',
            render: (value, row) => (
                <span className={cn(
                    'font-semibold',
                    row.type === 'in' || row.type === 'adjustment' ? 'text-green-600' : 'text-red-600'
                )}>
                    {row.type === 'in' || row.type === 'adjustment' ? '+' : '-'}
                    {value.toLocaleString('en-US')}
                </span>
            ),
        },
        {
            key: 'total_value',
            title: language === 'ar' ? 'القيمة' : 'Value',
            align: 'end',
            render: (value) => value ? (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            ) : (
                <span className="text-xs text-gray-400">-</span>
            ),
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                                    {language === 'ar' ? 'إجمالي الإدخال' : 'Total In'}
                                </p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    +{summary.totalIn.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                                    {language === 'ar' ? 'إجمالي الإخراج' : 'Total Out'}
                                </p>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                    -{summary.totalOut.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                                    {language === 'ar' ? 'الصافي' : 'Net Change'}
                                </p>
                                <p className={cn(
                                    'text-2xl font-bold',
                                    summary.totalIn - summary.totalOut >= 0
                                        ? 'text-green-700 dark:text-green-300'
                                        : 'text-red-700 dark:text-red-300'
                                )}>
                                    {summary.totalIn - summary.totalOut >= 0 ? '+' : ''}
                                    {(summary.totalIn - summary.totalOut).toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <ArrowRightLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter className="w-4 h-4" />
                        {language === 'ar' ? 'تصفية الحركات' : 'Filter Movements'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date_from">
                                {language === 'ar' ? 'من تاريخ' : 'From Date'}
                            </Label>
                            <Input
                                id="date_from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_to">
                                {language === 'ar' ? 'إلى تاريخ' : 'To Date'}
                            </Label>
                            <Input
                                id="date_to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" className="w-full">
                                {language === 'ar' ? 'تطبيق' : 'Apply'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Movements Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'سجل الحركات' : 'Movement History'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <NexaTable
                        data={movements}
                        columns={columns}
                        loading={loading}
                        showRowNumbers
                        rowKey="id"
                        emptyMessage={language === 'ar' ? 'لا توجد حركات' : 'No movements'}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
