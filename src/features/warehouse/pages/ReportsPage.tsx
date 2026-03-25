/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Reports Page - Warehouse Reports
 * صفحة التقارير - تقارير المستودعات
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ تقارير المخزون والمستودعات
 * - Stock report
 * - Movement report  
 * - Valuation report
 * - Reservation report
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FileText,
    Package,
    ArrowDownUp,
    Calendar,
    TrendingUp,
    Download,
    Printer,
    BarChart3,
    ClipboardList,
    AlertTriangle,
    Boxes
} from 'lucide-react';

// Report card type
interface ReportCard {
    id: string;
    icon: React.ReactNode;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    available: boolean;
}

const reports: ReportCard[] = [
    {
        id: 'stock-summary',
        icon: <Package className="w-6 h-6" />,
        titleAr: 'تقرير ملخص المخزون',
        titleEn: 'Stock Summary Report',
        descAr: 'عرض ملخص المخزون الحالي بجميع المستودعات',
        descEn: 'View current stock summary across all warehouses',
        available: true,
    },
    {
        id: 'movement-history',
        icon: <ArrowDownUp className="w-6 h-6" />,
        titleAr: 'تقرير حركات المخزون',
        titleEn: 'Stock Movement Report',
        descAr: 'تتبع جميع حركات الدخول والخروج والتحويل',
        descEn: 'Track all incoming, outgoing, and transfer movements',
        available: true,
    },
    {
        id: 'inventory-valuation',
        icon: <TrendingUp className="w-6 h-6" />,
        titleAr: 'تقرير تقييم المخزون',
        titleEn: 'Inventory Valuation Report',
        descAr: 'قيمة المخزون حسب طريقة التكلفة المختارة',
        descEn: 'Inventory value based on selected costing method',
        available: true,
    },
    {
        id: 'rolls-tracking',
        icon: <Boxes className="w-6 h-6" />,
        titleAr: 'تقرير تتبع الرولونات',
        titleEn: 'Rolls Tracking Report',
        descAr: 'تتبع حالة جميع الرولونات والأمتار المتبقية',
        descEn: 'Track status of all rolls and remaining meters',
        available: true,
    },
    {
        id: 'reservations',
        icon: <Calendar className="w-6 h-6" />,
        titleAr: 'تقرير الحجوزات',
        titleEn: 'Reservations Report',
        descAr: 'عرض الحجوزات النشطة والمنتهية',
        descEn: 'View active and expired reservations',
        available: true,
    },
    {
        id: 'low-stock',
        icon: <AlertTriangle className="w-6 h-6" />,
        titleAr: 'تقرير نقص المخزون',
        titleEn: 'Low Stock Alert Report',
        descAr: 'قائمة المواد التي وصلت للحد الأدنى',
        descEn: 'List of materials that reached minimum level',
        available: true,
    },
    {
        id: 'delivery-summary',
        icon: <ClipboardList className="w-6 h-6" />,
        titleAr: 'تقرير التسليمات',
        titleEn: 'Delivery Summary Report',
        descAr: 'ملخص سندات التسليم حسب الفترة',
        descEn: 'Summary of delivery notes by period',
        available: true,
    },
    {
        id: 'warehouse-performance',
        icon: <BarChart3 className="w-6 h-6" />,
        titleAr: 'تقرير أداء المستودعات',
        titleEn: 'Warehouse Performance Report',
        descAr: 'تقييم أداء المستودعات ومعدل الدوران',
        descEn: 'Evaluate warehouse performance and turnover rate',
        available: false,
    },
];

export default function ReportsPage() {
    const { language, direction } = useLanguage();

    const handleGenerateReport = (reportId: string) => {
        console.log('Generating report:', reportId);
        // TODO: Implement report generation
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {language === 'ar' ? 'تقارير المستودعات' : 'Warehouse Reports'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'إنشاء وتصدير تقارير المخزون والمستودعات' : 'Generate and export inventory and warehouse reports'}
                    </p>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                    <Card
                        key={report.id}
                        className={`bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all ${!report.available ? 'opacity-60' : ''}`}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-lg bg-erp-teal/10 flex items-center justify-center text-erp-teal">
                                    {report.icon}
                                </div>
                                {!report.available && (
                                    <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 px-2 py-1 rounded">
                                        {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                                    </span>
                                )}
                            </div>
                            <CardTitle className="text-base font-cairo mt-3 text-erp-navy dark:text-white">
                                {language === 'ar' ? report.titleAr : report.titleEn}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {language === 'ar' ? report.descAr : report.descEn}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-2"
                                    disabled={!report.available}
                                    onClick={() => handleGenerateReport(report.id)}
                                >
                                    <FileText className="w-4 h-4" />
                                    {language === 'ar' ? 'إنشاء' : 'Generate'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                    disabled={!report.available}
                                >
                                    <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                    disabled={!report.available}
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-erp-teal/5 to-erp-navy/5 border-erp-teal/20">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-cairo font-bold text-erp-navy dark:text-white">
                                {language === 'ar' ? 'التقارير المجدولة' : 'Scheduled Reports'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {language === 'ar'
                                    ? 'جدولة تقارير تلقائية يومية أو أسبوعية أو شهرية'
                                    : 'Schedule automatic daily, weekly, or monthly reports'}
                            </p>
                        </div>
                        <Button variant="outline" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            {language === 'ar' ? 'إعداد الجدولة' : 'Setup Schedule'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
