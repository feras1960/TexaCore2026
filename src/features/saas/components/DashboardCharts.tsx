import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getLocalizedField } from '@/lib/i18n-helpers';

interface SubscribersGrowthChartProps {
  data: Array<{ month: string; total: number; active: number }>;
}

export function SubscribersGrowthChart({ data }: SubscribersGrowthChartProps) {
  const { language, t } = useLanguage();
  const isRTL = language === 'ar';

  // Format month for display
  const formattedData = data.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      { month: 'short', year: '2-digit' }
    ),
  }));

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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                reversed={isRTL}
                style={{ fontSize: '12px' }}
              />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3B82F6"
                name={language === 'ar' ? 'إجمالي' : 'Total'}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#10B981"
                name={language === 'ar' ? 'نشط' : 'Active'}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
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
  const isRTL = language === 'ar';

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';

  const formattedData = data.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      { month: 'short', year: '2-digit' }
    ),
  }));

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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                reversed={isRTL}
                style={{ fontSize: '12px' }}
              />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip
                formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`}
              />
              <Legend />
              <Bar
                dataKey="revenue"
                fill="#10B981"
                name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
              />
            </BarChart>
          </ResponsiveContainer>
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

  const chartData = data.map((item) => ({
    name: getLocalizedField(item, 'name', language, item.code),
    value: item.count,
  }));

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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
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
  const isRTL = language === 'ar';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';

  const productColors: Record<string, string> = {
    nexacore: '#3B82F6',
    texacore: '#8B5CF6',
    fincore: '#10B981',
    inducore: '#F59E0B',
    medcore: '#EF4444',
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout={isRTL ? 'horizontal' : 'vertical'}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type={isRTL ? 'number' : 'category'}
                dataKey={isRTL ? 'revenue' : 'name'}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                type={isRTL ? 'category' : 'number'}
                dataKey={isRTL ? 'name' : undefined}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`}
              />
              <Bar
                dataKey="revenue"
                fill="#3B82F6"
                name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={productColors[entry.product] || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'ر.س';

  const chartData = data.map((item) => ({
    name: methodNames[item.method]?.[language === 'ar' ? 'ar' : 'en'] || item.method,
    value: item.total,
    count: item.count,
  }));

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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => {
                  const method = data[index]?.method;
                  return (
                    <Cell key={`cell-${index}`} fill={methodColors[method] || '#3B82F6'} />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
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
                        language === 'ar' ? 'ar-SA' : 'en-US',
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
