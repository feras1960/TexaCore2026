import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Activity,
  AlertCircle,
  TrendingDown,
  BarChart3,
  Plus,
} from 'lucide-react';
import { ProductSwitcher } from './components/ProductSwitcher';
import { CurrencySwitcher, formatCurrency } from './components/CurrencySwitcher';
import { PaymentFormDialog } from './components/PaymentFormDialog';
import {
  SubscribersGrowthChart,
  RevenueTrendChart,
  PlanDistributionChart,
  ProductRevenueChart,
  PaymentMethodsChart,
  RecentPaymentsTable,
} from './components/DashboardCharts';
import { saasStatsService, DashboardStats, ProductStats } from '@/services/saas/saasStatsService';
import { useLanguage } from '@/hooks';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SaaSDashboard() {
  const { language, t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charts data
  const [subscribersGrowth, setSubscribersGrowth] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [productRevenue, setProductRevenue] = useState<any[]>([]);
  const [churnRate, setChurnRate] = useState<any>({ total: 0, active: 0, cancelled: 0, churnRate: 0 });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  // Payment form dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);

  useEffect(() => {
    loadAllData();
  }, [selectedProduct, selectedCurrency]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load main stats
      const statsData = await saasStatsService.getDashboardStats();
      setStats(statsData);

      // Load charts data in parallel
      const [growth, revenue, distribution, prodRevenue, churn, payMethods, recPayments] = await Promise.all([
        saasStatsService.getSubscribersGrowth(),
        saasStatsService.getRevenueTrend(),
        saasStatsService.getPlanDistribution(),
        saasStatsService.getRevenueByProduct(selectedCurrency),
        saasStatsService.getChurnRate(),
        saasStatsService.getPaymentsByMethod(),
        saasStatsService.getRecentPayments(10),
      ]);

      setSubscribersGrowth(growth);
      setRevenueTrend(revenue);
      setPlanDistribution(distribution);
      setProductRevenue(prodRevenue);
      setChurnRate(churn);
      setPaymentMethods(payMethods);
      setRecentPayments(recPayments);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleViewPayment = (payment: any) => {
    // TODO: Open payment details sheet
    toast.info(language === 'ar' ? 'عرض التفاصيل قريباً' : 'View details coming soon');
  };

  const handleDeletePayment = async () => {
    if (!deletingPayment) return;

    try {
      const { error } = await supabase
        .from('saas_payments')
        .delete()
        .eq('id', deletingPayment.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حذف الدفعة بنجاح' : 'Payment deleted successfully');
      loadAllData(); // Reload data
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error(error.message || (language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting payment'));
    } finally {
      setDeletingPayment(null);
    }
  };

  const handlePaymentSuccess = () => {
    loadAllData(); // Reload all data after successful payment operation
  };

  // Filter stats based on selected product
  const filteredStats = () => {
    if (!stats) return null;
    
    if (selectedProduct === 'all') {
      return stats;
    }
    
    const productStat = stats.products.find((p) => p.product_code === selectedProduct);
    if (!productStat) return null;
    
    return {
      totalProducts: 1,
      totalPlans: productStat.total_plans,
      totalTenants: productStat.total_tenants,
      activeTenants: productStat.active_tenants,
      totalRevenue: stats.totalRevenue,
      products: [productStat],
    };
  };

  const currentStats = filteredStats();

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('saas.dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('saas.dashboard.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={handleAddPayment} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'إضافة دفعة' : 'Add Payment'}
          </Button>
          <ProductSwitcher
            selectedProduct={selectedProduct}
            onProductChange={setSelectedProduct}
          />
          <CurrencySwitcher
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
          />
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-4 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : currentStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Products Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {selectedProduct === 'all' 
                    ? t('saas.dashboard.totalProducts')
                    : t('saas.dashboard.product')}
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentStats.totalProducts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedProduct === 'all'
                    ? language === 'ar' ? 'منتجات نشطة' : 'Active products'
                    : currentStats.products[0]?.product_name}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Plans Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('saas.dashboard.totalPlans')}
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentStats.totalPlans}
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'باقات متاحة' : 'Available plans'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Subscribers Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('saas.dashboard.totalSubscribers')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentStats.totalTenants}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">
                    {currentStats.activeTenants}
                  </span>{' '}
                  {language === 'ar' ? 'نشط' : 'active'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('saas.dashboard.monthlyRevenue')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentStats.totalRevenue, selectedCurrency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentStats.totalRevenue === 0 ? (
                    <span className="text-amber-600">
                      {language === 'ar' ? 'لا توجد اشتراكات نشطة' : 'No active subscriptions'}
                    </span>
                  ) : (
                    <span className="text-green-600">
                      <TrendingUp className="inline h-3 w-3" />
                      {language === 'ar' ? ' من الاشتراكات النشطة' : ' from active subscriptions'}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Churn Rate Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'معدل الإلغاء' : 'Churn Rate'}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {churnRate.churnRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className={churnRate.churnRate > 10 ? 'text-red-600' : 'text-green-600'}>
                    {churnRate.cancelled} {language === 'ar' ? 'ملغي' : 'cancelled'}
                  </span>
                  {' / '}
                  <span>{churnRate.total} {language === 'ar' ? 'إجمالي' : 'total'}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : null}

      {/* Charts Section */}
      {!loading && currentStats && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 me-2" />
              {language === 'ar' ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Activity className="h-4 w-4 me-2" />
              {language === 'ar' ? 'التحليلات' : 'Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Products Grid (when "All Products" selected) */}
            {selectedProduct === 'all' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      {language === 'ar' ? 'نظرة عامة على المنتجات' : 'Products Overview'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {currentStats.products.map((product, index) => (
                        <motion.div
                          key={product.product_code}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <Card className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedProduct(product.product_code)}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {product.product_name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {language === 'ar' ? 'الباقات' : 'Plans'}:
                                </span>
                                <span className="font-medium">{product.total_plans}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {language === 'ar' ? 'المشتركين' : 'Subscribers'}:
                                </span>
                                <span className="font-medium">
                                  {product.total_tenants}{' '}
                                  <span className="text-xs text-green-600">
                                    ({product.active_tenants} {language === 'ar' ? 'نشط' : 'active'})
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {language === 'ar' ? 'الموديولات' : 'Modules'}:
                                </span>
                                <span className="font-medium">{product.available_modules}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <SubscribersGrowthChart data={subscribersGrowth} />
              <RevenueTrendChart data={revenueTrend} currency={selectedCurrency} />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PlanDistributionChart data={planDistribution} />
              <ProductRevenueChart data={productRevenue} currency={selectedCurrency} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PaymentMethodsChart data={paymentMethods} currency={selectedCurrency} />
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {language === 'ar' ? 'ملخص الدفعات' : 'Payments Summary'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'إجمالي الدفعات' : 'Total Payments'}
                      </span>
                      <span className="text-lg font-bold">{recentPayments.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}
                      </span>
                      <span className="text-lg font-bold">
                        {formatCurrency(
                          recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
                          selectedCurrency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'متوسط الدفعة' : 'Average Payment'}
                      </span>
                      <span className="text-lg font-bold">
                        {formatCurrency(
                          recentPayments.length > 0
                            ? recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / recentPayments.length
                            : 0,
                          selectedCurrency
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Payments Table */}
            <RecentPaymentsTable 
              data={recentPayments} 
              currency={selectedCurrency}
              onEdit={handleEditPayment}
              onView={handleViewPayment}
              onDelete={(payment) => setDeletingPayment(payment)}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Form Dialog */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={handlePaymentSuccess}
        editingPayment={editingPayment}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف الدفعة ${deletingPayment?.payment_number}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete payment ${deletingPayment?.payment_number}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
