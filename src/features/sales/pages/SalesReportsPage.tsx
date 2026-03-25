
import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Calendar as CalendarIcon,
    Download,
    FileBarChart,
    Users,
    Package,
    MapPin,
    TrendingUp,
    Percent,
    RefreshCcw,
    Target,
    BarChart2,
    Search,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { useSalesReports } from '../hooks/useSalesReports';
import { format } from 'date-fns';

export default function SalesReportsPage() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    const {
        dateRange,
        setDateRange,
        generateReport,
        isGenerating,
        dailySales,
        productSales,
        customerSales,
        salespersonData,
        regionData,
        categoryData,
        returnsData,
        profitData,
    } = useSalesReports();

    // === Columns Definitions (Memoized) ===
    const dailyColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'date', header: isRTL ? 'التاريخ' : 'Date', cell: ({ getValue }) => <span className="font-mono">{getValue() as string}</span> },
        { accessorKey: 'invoices', header: isRTL ? 'عدد الفواتير' : 'Invoices', cell: ({ getValue }) => <span className="font-mono text-center block">{getValue() as number}</span> },
        { accessorKey: 'totalSales', header: isRTL ? 'إجمالي المبيعات' : 'Total Sales', cell: ({ getValue }) => <span className="font-mono block text-right font-bold text-blue-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'returns', header: isRTL ? 'المرتجعات' : 'Returns', cell: ({ getValue }) => <span className="font-mono text-red-500 block text-right">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'netSales', header: isRTL ? 'صافي المبيعات' : 'Net Sales', cell: ({ getValue }) => <span className="font-mono font-bold text-green-600 block text-right">{(getValue() as number).toLocaleString('en-US')}</span> },
        {
            accessorKey: 'growth', header: isRTL ? 'النمو' : 'Growth', cell: ({ getValue }) => {
                const val = getValue() as number;
                return <Badge variant={val >= 0 ? "outline" : "destructive"} className={val >= 0 ? "text-green-600 border-green-200 bg-green-50" : ""}>{val > 0 ? '+' : ''}{val}%</Badge>;
            }
        }
    ], [isRTL]);

    const productColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'code', header: isRTL ? 'كود الصنف' : 'Item Code', cell: ({ getValue }) => <span className="font-mono text-muted-foreground">{getValue() as string}</span> },
        { accessorKey: 'name', header: isRTL ? 'اسم الصنف' : 'Item Name' },
        { accessorKey: 'category', header: isRTL ? 'الفئة' : 'Category', cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge> },
        { accessorKey: 'quantity', header: isRTL ? 'الكمية' : 'Qty', cell: ({ getValue }) => <span className="font-mono text-center block">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'totalSales', header: isRTL ? 'المبيعات' : 'Sales', cell: ({ getValue }) => <span className="font-mono block text-right font-bold text-blue-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'profit', header: isRTL ? 'الربح' : 'Profit', cell: ({ getValue }) => <span className="font-mono block text-right text-green-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'margin', header: isRTL ? 'الهامش %' : 'Margin %', cell: ({ getValue }) => <span className="font-mono block text-right text-amber-600">{(getValue() as number)}%</span> },
    ], [isRTL]);

    const customerColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'name', header: isRTL ? 'اسم العميل' : 'Customer Name' },
        { accessorKey: 'region', header: isRTL ? 'المنطقة' : 'Region', cell: ({ getValue }) => <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" /> {getValue() as string}</div> },
        { accessorKey: 'invoices', header: isRTL ? 'الفواتير' : 'Invoices', cell: ({ getValue }) => <span className="font-mono text-center block">{(getValue() as number)}</span> },
        { accessorKey: 'totalSales', header: isRTL ? 'المشتروات' : 'Purchases', cell: ({ getValue }) => <span className="font-mono block text-right font-bold">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'lastPurchase', header: isRTL ? 'آخر شراء' : 'Last Purchase', cell: ({ getValue }) => <span className="font-mono text-muted-foreground">{getValue() as string}</span> },
    ], [isRTL]);

    const salespersonColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'name', header: isRTL ? 'اسم المندوب' : 'Representative' },
        { accessorKey: 'sales', header: isRTL ? 'المبيعات' : 'Sales', cell: ({ getValue }) => <span className="font-mono block text-right font-bold text-blue-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'target', header: isRTL ? 'الهدف' : 'Target', cell: ({ getValue }) => <span className="font-mono block text-right text-muted-foreground">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'commission', header: isRTL ? 'العمولة' : 'Commission', cell: ({ getValue }) => <span className="font-mono block text-right text-green-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        {
            accessorKey: 'achievement', header: isRTL ? 'الإنجاز %' : 'Achv %', cell: ({ getValue }) => {
                const val = getValue() as number;
                return <Badge variant={val >= 100 ? "default" : "secondary"} className={val >= 100 ? "bg-green-600" : ""}>{val}%</Badge>;
            }
        }
    ], [isRTL]);

    const regionColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'region', header: isRTL ? 'المنطقة' : 'Region', cell: ({ getValue }) => <div className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" />{getValue() as string}</div> },
        { accessorKey: 'sales', header: isRTL ? 'المبيعات' : 'Sales', cell: ({ getValue }) => <span className="font-mono block text-right font-bold">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'invoices', header: isRTL ? 'الفواتير' : 'Invoices', cell: ({ getValue }) => <span className="font-mono text-center block">{(getValue() as number)}</span> },
        { accessorKey: 'customers', header: isRTL ? 'العملاء' : 'Customers', cell: ({ getValue }) => <span className="font-mono text-center block">{(getValue() as number)}</span> },
        { accessorKey: 'growth', header: isRTL ? 'النمو' : 'Growth', cell: ({ getValue }) => <span className={`font-mono block text-center ${(getValue() as number) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{(getValue() as number)}%</span> },
    ], [isRTL]);

    const categoryColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'category', header: isRTL ? 'الفئة' : 'Category', cell: ({ getValue }) => <span className="font-bold">{getValue() as string}</span> },
        { accessorKey: 'sales', header: isRTL ? 'المبيعات' : 'Sales', cell: ({ getValue }) => <span className="font-mono block text-right font-bold">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'percentage', header: isRTL ? 'النسبة' : 'Share %', cell: ({ getValue }) => <span className="font-mono block text-center">{(getValue() as number)}%</span> },
        { accessorKey: 'items', header: isRTL ? 'الأصناف' : 'Items', cell: ({ getValue }) => <span className="font-mono text-center block">{(getValue() as number)}</span> },
    ], [isRTL]);

    const returnsColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'date', header: isRTL ? 'التاريخ' : 'Date', cell: ({ getValue }) => <span className="font-mono">{getValue() as string}</span> },
        { accessorKey: 'originalInvoice', header: isRTL ? 'فاتورة الأصل' : 'Orig. Invoice', cell: ({ getValue }) => <span className="font-mono text-muted-foreground">{getValue() as string}</span> },
        { accessorKey: 'customer', header: isRTL ? 'العميل' : 'Customer' },
        { accessorKey: 'amount', header: isRTL ? 'المبلغ' : 'Amount', cell: ({ getValue }) => <span className="font-mono block text-right font-bold text-red-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'reason', header: isRTL ? 'السبب' : 'Reason' },
        { accessorKey: 'status', header: isRTL ? 'الحالة' : 'Status', cell: ({ getValue }) => <Badge variant="outline">{getValue() as string}</Badge> },
    ], [isRTL]);

    const profitColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'period', header: isRTL ? 'الفترة' : 'Period' },
        { accessorKey: 'revenue', header: isRTL ? 'الإيرادات' : 'Revenue', cell: ({ getValue }) => <span className="font-mono block text-right">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'cogs', header: isRTL ? 'التكلفة' : 'COGS', cell: ({ getValue }) => <span className="font-mono block text-right text-red-500">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'grossProfit', header: isRTL ? 'إجمالي الربح' : 'Gross Profit', cell: ({ getValue }) => <span className="font-mono block text-right font-bold text-green-600">{(getValue() as number).toLocaleString('en-US')}</span> },
        { accessorKey: 'margin', header: isRTL ? 'الهامش %' : 'Margin %', cell: ({ getValue }) => <span className="font-mono block text-center font-bold">{(getValue() as number)}%</span> },
    ], [isRTL]);

    const handleGenerate = () => {
        generateReport();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('sales.reportsPage.title', 'Sales Reports')}
                    </h1>
                    <p className="text-sm text-muted-foreground font-tajawal mt-1">
                        {t('sales.reportsPage.subtitle', 'Comprehensive reporting center')}
                    </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium">{isRTL ? 'من:' : 'From:'}</span>
                        <Input
                            type="date"
                            value={format(dateRange.from, 'yyyy-MM-dd')}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                            className="w-full sm:w-[150px]"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium">{isRTL ? 'إلى:' : 'To:'}</span>
                        <Input
                            type="date"
                            value={format(dateRange.to, 'yyyy-MM-dd')}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                            className="w-full sm:w-[150px]"
                        />
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full sm:w-auto min-w-[120px] bg-primary hover:bg-primary/90 text-white gap-2"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {isRTL ? 'إنشاء التقرير' : 'Generate Report'}
                    </Button>
                </div>
            </div>

            {/* Main Tabs - Scrollable + RTL */}
            <Tabs defaultValue="daily" className="w-full space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="relative">
                    <TabsList className="bg-muted/50 p-1 rounded-lg w-full justify-start overflow-x-auto flex-nowrap md:grid md:grid-cols-5 lg:flex lg:flex-wrap">
                        <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                            <TrendingUp className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.dailySales', isRTL ? 'المبيعات اليومية' : 'Daily Sales')}
                        </TabsTrigger>
                        <TabsTrigger value="products" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-blue-600 font-tajawal">
                            <Package className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.byProduct', isRTL ? 'تقارير الأصناف' : 'Product Reports')}
                        </TabsTrigger>
                        <TabsTrigger value="customers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-indigo-600 font-tajawal">
                            <Users className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.customers', isRTL ? 'تقارير العملاء' : 'Customer Reports')}
                        </TabsTrigger>
                        <TabsTrigger value="salespersons" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-emerald-600 font-tajawal">
                            <FileBarChart className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.bySalesperson', isRTL ? 'أداء المندوبين' : 'Agents Performance')}
                        </TabsTrigger>
                        <TabsTrigger value="regions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-amber-600 font-tajawal">
                            <MapPin className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.byRegion', isRTL ? 'تحليل المناطق' : 'Regional Analysis')}
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-purple-600 font-tajawal">
                            <BarChart2 className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.byCategory', isRTL ? 'تحليل الفئات' : 'Category Analysis')}
                        </TabsTrigger>
                        <TabsTrigger value="returns" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-rose-600 font-tajawal">
                            <RefreshCcw className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.returns', isRTL ? 'المرتجعات' : 'Returns')}
                        </TabsTrigger>
                        <TabsTrigger value="profit" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-teal-600 font-tajawal">
                            <Percent className="w-4 h-4 me-1.5" /> {t('sales.reportsPage.profit', isRTL ? 'هامش الربح' : 'Profit Margin')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Content Tabs */}
                <TabsContent value="daily" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.dailySales', 'Daily Sales')} data={dailySales} columns={dailyColumns} isRTL={isRTL} filename="daily_sales" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.byProduct', 'Product Sales')} data={productSales} columns={productColumns} isRTL={isRTL} filename="product_sales" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="customers" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.customers', 'Customer Activity')} data={customerSales} columns={customerColumns} isRTL={isRTL} filename="customer_sales" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="salespersons" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.bySalesperson', 'Sales Targets')} data={salespersonData} columns={salespersonColumns} isRTL={isRTL} filename="agents_report" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="regions" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.byRegion', 'Regional Sales')} data={regionData} columns={regionColumns} isRTL={isRTL} filename="region_report" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.byCategory', 'Category Performance')} data={categoryData} columns={categoryColumns} isRTL={isRTL} filename="category_report" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="returns" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.returns', 'Returns Log')} data={returnsData} columns={returnsColumns} isRTL={isRTL} filename="returns_report" isLoading={isGenerating} />
                </TabsContent>

                <TabsContent value="profit" className="space-y-4">
                    <ReportCard title={t('sales.reportsPage.profit', 'Profit Analysis')} data={profitData} columns={profitColumns} isRTL={isRTL} filename="profit_report" isLoading={isGenerating} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Reusable Card Component
function ReportCard({ title, data, columns, isRTL, filename, isLoading }: any) {
    if (isLoading) {
        return (
            <Card className="border-none shadow-sm h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p>{isRTL ? 'جاري تحضير التقرير...' : 'Generating Report...'}</p>
                </div>
            </Card>
        )
    }

    // Show empty state if no data but not loading
    if (!data || data.length === 0) {
        return (
            <Card className="border-none shadow-sm h-[300px] flex items-center justify-center border-dashed border-2">
                <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-70">
                    <Search className="w-10 h-10 mb-2" />
                    <h3 className="text-lg font-medium">{isRTL ? 'لا توجد بيانات' : 'No Data Available'}</h3>
                    <p className="text-sm text-center max-w-xs">{isRTL ? 'يرجى تحديد الفترة الزمنية والضغط على "إنشاء التقرير"' : 'Please select a date range and click "Generate Report"'}</p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="font-cairo text-lg text-primary">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <NexaDataTable
                    data={data}
                    columns={columns}
                    isRTL={isRTL}
                    enableSequenceNumber={true}
                    enableSearch={true}
                    enableExport={true}
                    enablePagination={true}
                    pageSize={15}
                    exportFilename={filename}
                    exportTitle={title}
                    showTotalsFooter={true}
                />
            </CardContent>
        </Card>
    )
}
