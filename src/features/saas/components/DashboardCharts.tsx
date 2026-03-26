import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks';
import { useTheme } from '@/app/providers/ThemeProvider';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { SafeChartContainer } from '@/components/ui/SafeChartContainer';
import { getLocalizedField } from '@/lib/i18n-helpers';

interface SubscribersGrowthChartProps {
  data: Array<{ month: string; total: number; active: number }>;
}

export function SubscribersGrowthChart({ data }: SubscribersGrowthChartProps) {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isRTL = language === 'ar';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const formattedData = data.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString(
      language === 'ar' ? 'ar-u-nu-latn' : 'en-US',
      { month: 'short', year: '2-digit' }
    ),
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: textColor }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false, data: formattedData.map(d => d.monthLabel),
      axisLabel: { color: textColor, fontSize: 12 },
      axisLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      axisLabel: { color: textColor, fontSize: 12 }
    },
    series: [
      { name: language === 'ar' ? 'إجمالي' : 'Total', type: 'line', smooth: 0.5, data: formattedData.map(d => d.total), itemStyle: { color: '#3B82F6' }, lineStyle: { width: 2.5 } },
      { name: language === 'ar' ? 'نشط' : 'Active', type: 'line', smooth: 0.5, data: formattedData.map(d => d.active), itemStyle: { color: '#10B981' }, lineStyle: { width: 2.5 } }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'نمو المشتركين' : 'Subscribers Growth'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formattedData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
          </div>
        ) : (
          <SafeChartContainer className="h-[300px]">
            <ReactECharts option={option} style={{ height: '300px', width: '100%' }} notMerge={true} />
          </SafeChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface RevenueTrendChartProps {
  data: Array<{ month: string; revenue: number }>;
  currency: string;
}

export function RevenueTrendChart({ data, currency }: RevenueTrendChartProps) {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isRTL = language === 'ar';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const formattedData = data.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString(
      language === 'ar' ? 'ar-u-nu-latn' : 'en-US',
      { month: 'short', year: '2-digit' }
    ),
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0].name}<br/>${params[0].marker} ${params[0].seriesName}: ${currencySymbol}${Number(params[0].value).toLocaleString()}` },
    legend: { textStyle: { color: textColor }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category', data: formattedData.map(d => d.monthLabel),
      axisLabel: { color: textColor, fontSize: 12 },
      axisLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      axisLabel: { color: textColor, fontSize: 12 }
    },
    series: [
      { name: language === 'ar' ? 'الإيرادات' : 'Revenue', type: 'bar', data: formattedData.map(d => d.revenue), itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] } }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'اتجاه الإيرادات' : 'Revenue Trend'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formattedData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد اشتراكات نشطة بعد' : 'No active subscriptions yet'}
          </div>
        ) : (
          <SafeChartContainer className="h-[300px]">
            <ReactECharts option={option} style={{ height: '300px', width: '100%' }} notMerge={true} />
          </SafeChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface PlanDistributionChartProps {
  data: Array<{ code: string; name_en: string; name_ar: string; count: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  const chartData = data.map((item) => ({
    name: getLocalizedField(item, 'name', language, item.code),
    value: item.count,
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { textStyle: { color: textColor }, bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: isDark ? '#1f2937' : '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: chartData,
        color: COLORS
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'توزيع الباقات' : 'Plan Distribution'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد اشتراكات نشطة' : 'No active subscriptions'}
          </div>
        ) : (
          <SafeChartContainer className="h-[300px]">
             <ReactECharts option={option} style={{ height: '300px', width: '100%' }} notMerge={true} />
          </SafeChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface ProductRevenueChartProps {
  data: Array<{ product: string; name: string; revenue: number }>;
  currency: string;
}

export function ProductRevenueChart({ data, currency }: ProductRevenueChartProps) {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isRTL = language === 'ar';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const productColors: Record<string, string> = {
    nexacore: '#3B82F6',
    texacore: '#8B5CF6',
    fincore: '#10B981',
    inducore: '#F59E0B',
    medcore: '#EF4444',
  };

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0].name}<br/>${params[0].marker} ${params[0].seriesName}: ${currencySymbol}${Number(params[0].value).toLocaleString()}` },
    grid: { left: '3%', right: '4%', bottom: '5%', top: '5%', containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor, margin: 12 },
      position: isRTL ? 'right' : 'left'
    },
    series: [
      {
        name: language === 'ar' ? 'الإيرادات' : 'Revenue',
        type: 'bar',
        data: data.map((d) => ({ value: d.revenue, itemStyle: { color: productColors[d.product] || '#3B82F6' } })),
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'الإيرادات حسب المنتج' : 'Revenue by Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
          </div>
        ) : (
          <SafeChartContainer className="h-[300px]">
            <ReactECharts option={option} style={{ height: '300px', width: '100%' }} notMerge={true} />
          </SafeChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface PaymentMethodsChartProps {
  data: Array<{ method: string; count: number; total: number }>;
  currency: string;
}

const methodColors: Record<string, string> = {
  bank_transfer: '#3B82F6',
  cash: '#10B981',
  credit_card: '#8B5CF6',
  digital_wallet: '#F59E0B',
  check: '#EF4444',
};

const methodNames: Record<string, { en: string; ar: string }> = {
  bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  cash: { en: 'Cash', ar: 'نقدي' },
  credit_card: { en: 'Credit Card', ar: 'بطاقة ائتمان' },
  digital_wallet: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
  check: { en: 'Check', ar: 'شيك' },
};

export function PaymentMethodsChart({ data, currency }: PaymentMethodsChartProps) {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';

  const chartData = data.map((item) => ({
    name: methodNames[item.method]?.[language === 'ar' ? 'ar' : 'en'] || item.method,
    value: item.total,
    count: item.count,
    itemStyle: { color: methodColors[item.method] || '#3B82F6' }
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: (params: any) => `${params.name}<br/>${params.marker} ${currencySymbol}${Number(params.value).toLocaleString()} (${params.percent}%)` },
    legend: { textStyle: { color: textColor }, bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: isDark ? '#1f2937' : '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: chartData
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'طرق الدفع' : 'Payment Methods'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد دفعات بعد' : 'No payments yet'}
          </div>
        ) : (
          <SafeChartContainer className="h-[300px]">
             <ReactECharts option={option} style={{ height: '300px', width: '100%' }} notMerge={true} />
          </SafeChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface RecentPaymentsTableProps {
  data: Array<any>;
  currency: string;
  onEdit?: (payment: any) => void;
  onView?: (payment: any) => void;
  onDelete?: (payment: any) => void;
}

export function RecentPaymentsTable({ data, currency, onEdit, onView, onDelete }: RecentPaymentsTableProps) {
  const { language } = useLanguage();
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusNames: Record<string, { en: string; ar: string }> = {
    completed: { en: 'Completed', ar: 'مكتمل' },
    pending: { en: 'Pending', ar: 'معلق' },
    failed: { en: 'Failed', ar: 'فشل' },
    refunded: { en: 'Refunded', ar: 'مسترد' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'آخر الدفعات' : 'Recent Payments'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد دفعات بعد' : 'No payments yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'الرقم' : 'Number'}
                  </th>
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'العميل' : 'Customer'}
                  </th>
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'الطريقة' : 'Method'}
                  </th>
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th className={`pb-2 text-start font-medium ${language === 'ar' ? 'text-end' : ''}`}>
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((payment: any, index: number) => (
                  <tr key={payment.id || index} className="border-b last:border-0">
                    <td className="py-3 text-start">
                      <span className="font-mono text-xs">{payment.payment_number}</span>
                    </td>
                    <td className="py-3 text-start">
                      {payment.tenants?.name || '-'}
                    </td>
                    <td className="py-3 text-start font-medium">
                      {currencySymbol}{payment.amount?.toLocaleString()}
                    </td>
                    <td className="py-3 text-start">
                      <span className="text-xs">
                        {methodNames[payment.payment_method]?.[language === 'ar' ? 'ar' : 'en'] || payment.payment_method}
                      </span>
                    </td>
                    <td className="py-3 text-start">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[payment.status]}`}>
                        {statusNames[payment.status]?.[language === 'ar' ? 'ar' : 'en'] || payment.status}
                      </span>
                    </td>
                    <td className="py-3 text-start text-xs text-muted-foreground">
                      {new Date(payment.collection_date).toLocaleDateString(
                        language === 'ar' ? 'ar-u-nu-latn' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    </td>
                    <td className="py-3 text-start">
                      <div className="flex items-center gap-1">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(payment)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(payment)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && payment.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(payment)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
