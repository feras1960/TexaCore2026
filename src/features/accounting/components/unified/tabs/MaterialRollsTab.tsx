/**
 * ════════════════════════════════════════════════════════════════
 * 🧵 Material Rolls Tab
 * تبويب رولونات المادة - عرض تفصيلي للرولونات مع NexaDataTable
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Cylinder,
    Package,
    MapPin,
    Calendar,
    TrendingUp,
    TrendingDown,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Ruler,
    Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabricRoll {
    id: string;
    roll_number: string;
    barcode?: string;
    material_name: string;
    color_name?: string;
    initial_length: number;
    current_length: number;
    reserved_length: number;
    available_length: number;
    width: number;
    weight?: number;
    quality_grade: string;
    shade: string;
    warehouse_name: string;
    location_code?: string;
    status: 'available' | 'reserved' | 'in_use' | 'depleted' | 'damaged';
    received_date: string;
    last_movement_date?: string;
    dye_lot?: string;
    cost_per_meter: number;
    currency: string;
}

interface MaterialRollsTabProps {
    data: any;
}

// Status configuration
const statusConfig = {
    available: {
        labelAr: 'متاح',
        labelEn: 'Available',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2
    },
    reserved: {
        labelAr: 'محجوز',
        labelEn: 'Reserved',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: Clock
    },
    in_use: {
        labelAr: 'قيد الاستخدام',
        labelEn: 'In Use',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: TrendingDown
    },
    depleted: {
        labelAr: 'مستنفد',
        labelEn: 'Depleted',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        icon: Package
    },
    damaged: {
        labelAr: 'تالف',
        labelEn: 'Damaged',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: AlertTriangle
    },
};

// Quality grades
const gradeConfig = {
    A: { labelAr: 'ممتاز', labelEn: 'Excellent', color: 'bg-green-500' },
    B: { labelAr: 'جيد جداً', labelEn: 'Very Good', color: 'bg-blue-500' },
    C: { labelAr: 'جيد', labelEn: 'Good', color: 'bg-yellow-500' },
    D: { labelAr: 'مقبول', labelEn: 'Acceptable', color: 'bg-orange-500' },
};

// Mock data for demo
const mockRolls: FabricRoll[] = [
    {
        id: '1',
        roll_number: 'ROLL-2024-001',
        barcode: '5901234567890',
        material_name: 'قماش قطني ناعم',
        color_name: 'أزرق سماوي',
        initial_length: 100,
        current_length: 85.5,
        reserved_length: 10,
        available_length: 75.5,
        width: 150,
        weight: 125,
        quality_grade: 'A',
        shade: 'medium',
        warehouse_name: 'المستودع الرئيسي',
        location_code: 'A-12-3',
        status: 'available',
        received_date: '2024-01-15',
        last_movement_date: '2024-02-01',
        dye_lot: 'DL-2024-0125',
        cost_per_meter: 15.50,
        currency: 'USD',
    },
    {
        id: '2',
        roll_number: 'ROLL-2024-002',
        barcode: '5901234567891',
        material_name: 'قماش قطني ناعم',
        color_name: 'أحمر داكن',
        initial_length: 80,
        current_length: 45,
        reserved_length: 20,
        available_length: 25,
        width: 150,
        weight: 100,
        quality_grade: 'B',
        shade: 'dark',
        warehouse_name: 'المستودع الرئيسي',
        location_code: 'A-12-4',
        status: 'reserved',
        received_date: '2024-01-20',
        last_movement_date: '2024-02-05',
        dye_lot: 'DL-2024-0130',
        cost_per_meter: 14.00,
        currency: 'USD',
    },
    {
        id: '3',
        roll_number: 'ROLL-2024-003',
        barcode: '5901234567892',
        material_name: 'قماش قطني ناعم',
        color_name: 'أخضر زيتوني',
        initial_length: 120,
        current_length: 5,
        reserved_length: 0,
        available_length: 5,
        width: 150,
        weight: 7.5,
        quality_grade: 'A',
        shade: 'light',
        warehouse_name: 'مستودع الفرع',
        location_code: 'B-05-1',
        status: 'depleted',
        received_date: '2023-12-10',
        last_movement_date: '2024-01-28',
        dye_lot: 'DL-2023-0985',
        cost_per_meter: 16.00,
        currency: 'USD',
    },
];

export function MaterialRollsTab({ data }: MaterialRollsTabProps) {
    const { language } = useLanguage();
    const [rolls] = useState<FabricRoll[]>(data?.rolls || mockRolls);

    // Summary stats
    const summary = useMemo(() => {
        return rolls.reduce((acc, roll) => ({
            totalRolls: acc.totalRolls + 1,
            totalLength: acc.totalLength + roll.current_length,
            availableLength: acc.availableLength + roll.available_length,
            reservedLength: acc.reservedLength + roll.reserved_length,
            totalValue: acc.totalValue + (roll.current_length * roll.cost_per_meter),
        }), {
            totalRolls: 0,
            totalLength: 0,
            availableLength: 0,
            reservedLength: 0,
            totalValue: 0,
        });
    }, [rolls]);

    // Table columns
    const columns: ColumnDef<FabricRoll>[] = useMemo(() => [
        {
            accessorKey: 'roll_number',
            header: language === 'ar' ? 'رقم الرولون' : 'Roll Number',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <span className="font-mono font-medium text-erp-primary">
                        {row.original.roll_number}
                    </span>
                    {row.original.barcode && (
                        <p className="text-xs text-gray-500 font-mono">
                            {row.original.barcode}
                        </p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'color_name',
            header: language === 'ar' ? 'اللون' : 'Color',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-gray-200" />
                    <span>{row.original.color_name || '-'}</span>
                </div>
            ),
        },
        {
            accessorKey: 'current_length',
            header: language === 'ar' ? 'الطول الحالي' : 'Current Length',
            cell: ({ row }) => {
                const percentage = (row.original.current_length / row.original.initial_length) * 100;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <Ruler className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{row.original.current_length.toFixed(1)}</span>
                            <span className="text-xs text-gray-500">
                                / {row.original.initial_length} {language === 'ar' ? 'م' : 'm'}
                            </span>
                        </div>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    percentage > 50 ? "bg-green-500" : percentage > 20 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'available_length',
            header: language === 'ar' ? 'المتاح' : 'Available',
            cell: ({ row }) => (
                <span className="text-green-600 font-medium">
                    {row.original.available_length.toFixed(1)} {language === 'ar' ? 'م' : 'm'}
                </span>
            ),
        },
        {
            accessorKey: 'reserved_length',
            header: language === 'ar' ? 'محجوز' : 'Reserved',
            cell: ({ row }) => (
                <span className={cn(
                    "font-medium",
                    row.original.reserved_length > 0 ? "text-orange-600" : "text-gray-400"
                )}>
                    {row.original.reserved_length.toFixed(1)} {language === 'ar' ? 'م' : 'm'}
                </span>
            ),
        },
        {
            accessorKey: 'width',
            header: language === 'ar' ? 'العرض' : 'Width',
            cell: ({ row }) => (
                <span className="text-gray-600">
                    {row.original.width} {language === 'ar' ? 'سم' : 'cm'}
                </span>
            ),
        },
        {
            accessorKey: 'quality_grade',
            header: language === 'ar' ? 'الجودة' : 'Quality',
            cell: ({ row }) => {
                const grade = gradeConfig[row.original.quality_grade as keyof typeof gradeConfig] || gradeConfig.C;
                return (
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", grade.color)} />
                        <span className="font-medium">{row.original.quality_grade}</span>
                        <span className="text-xs text-gray-500">
                            ({language === 'ar' ? grade.labelAr : grade.labelEn})
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'warehouse_name',
            header: language === 'ar' ? 'الموقع' : 'Location',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{row.original.warehouse_name}</span>
                    </div>
                    {row.original.location_code && (
                        <span className="text-xs text-gray-500 font-mono">
                            {row.original.location_code}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: language === 'ar' ? 'الحالة' : 'Status',
            cell: ({ row }) => {
                const status = statusConfig[row.original.status] || statusConfig.available;
                const Icon = status.icon;
                return (
                    <Badge variant="outline" className={cn("gap-1", status.color)}>
                        <Icon className="w-3 h-3" />
                        {language === 'ar' ? status.labelAr : status.labelEn}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'cost_per_meter',
            header: language === 'ar' ? 'التكلفة/م' : 'Cost/m',
            cell: ({ row }) => (
                <span className="font-mono text-erp-navy">
                    {row.original.cost_per_meter.toFixed(2)} {row.original.currency}
                </span>
            ),
        },
        {
            accessorKey: 'received_date',
            header: language === 'ar' ? 'تاريخ الاستلام' : 'Received Date',
            cell: ({ row }) => (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {new Date(row.original.received_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                    )}
                </div>
            ),
        },
    ], [language]);

    return (
        <div className="space-y-6 pb-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4 text-center">
                        <Cylinder className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                            {summary.totalRolls}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                            {language === 'ar' ? 'إجمالي الرولونات' : 'Total Rolls'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 text-center">
                        <Ruler className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {summary.totalLength.toFixed(1)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            {language === 'ar' ? 'الطول الإجمالي (م)' : 'Total Length (m)'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {summary.availableLength.toFixed(1)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                            {language === 'ar' ? 'المتاح (م)' : 'Available (m)'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4 text-center">
                        <Clock className="w-8 h-8 mx-auto text-orange-600 dark:text-orange-400 mb-2" />
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                            {summary.reservedLength.toFixed(1)}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                            {language === 'ar' ? 'محجوز (م)' : 'Reserved (m)'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-erp-navy/5 to-erp-navy/10 dark:from-erp-navy/20 dark:to-erp-navy/30 border-erp-navy/20">
                    <CardContent className="p-4 text-center">
                        <Scale className="w-8 h-8 mx-auto text-erp-navy dark:text-erp-primary mb-2" />
                        <p className="text-2xl font-bold text-erp-navy dark:text-erp-primary">
                            ${summary.totalValue.toFixed(0)}
                        </p>
                        <p className="text-xs text-erp-navy/70 dark:text-erp-primary/70">
                            {language === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Rolls Table */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Cylinder className="w-5 h-5 text-purple-600" />
                            {language === 'ar' ? 'قائمة الرولونات' : 'Rolls List'}
                        </CardTitle>
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            {language === 'ar' ? 'إضافة رولون' : 'Add Roll'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <NexaDataTable
                        columns={columns}
                        data={rolls}
                        persistKey="material-rolls-table"
                        enablePagination={true}
                        enableSearch={true}
                        enableColumnVisibility={true}
                        pageSize={10}
                        maxHeight="400px"
                        emptyMessage={language === 'ar' ? 'لا توجد رولونات' : 'No rolls found'}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
