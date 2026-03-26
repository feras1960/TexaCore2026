/**
 * Billing Page
 * صفحة الفوترة والاشتراك
 * 
 * تعرض:
 * - حالة الاشتراك الحالي
 * - خيارات التجديد والترقية
 * - الشركات المرتبطة
 * - سجل الفواتير
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  Building2,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  RefreshCw,
  Download,
  Eye,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { subscriptionService, type BillingInfo, type SubscriptionPlan } from '@/services/subscriptionService';
import { documentService, type StorageStatus } from '@/services/documentService';

export const BillingPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // جلب البيانات
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.user_metadata?.tenant_id) {
        setLoading(false);
        return;
      }

      try {
        const tenantId = user.user_metadata.tenant_id;
        
        const [billing, storage, plans] = await Promise.all([
          subscriptionService.getBillingInfo(tenantId),
          documentService.getStorageStatus(tenantId),
          subscriptionService.getAvailablePlans(),
        ]);

        setBillingInfo(billing);
        setStorageStatus(storage);
        setAvailablePlans(plans);
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // تنسيق التاريخ
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // الحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'trial':
        return 'bg-blue-500';
      case 'expired':
      case 'locked':
        return 'bg-red-500';
      case 'grace_period':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  // الحصول على أيقونة الحالة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'trial':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'expired':
      case 'locked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'grace_period':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      className={cn('container mx-auto p-6 max-w-6xl')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* العنوان */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('subscription.billing.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('subscription.billing.description')}
        </p>
      </div>

      {/* التبويبات */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t('subscription.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="plans">{t('subscription.tabs.plans')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('subscription.tabs.invoices')}</TabsTrigger>
          <TabsTrigger value="companies">{t('subscription.tabs.companies')}</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="space-y-6">
          {/* بطاقة الاشتراك الحالي */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t('subscription.billing.currentSubscription')}
                  </CardTitle>
                  <CardDescription>{t('subscription.billing.subscriptionDetails')}</CardDescription>
                </div>
                {billingInfo?.status && (
                  <Badge 
                    variant="outline"
                    className={cn(
                      'text-white px-3 py-1',
                      getStatusColor(billingInfo.status.status)
                    )}
                  >
                    {getStatusIcon(billingInfo.status.status)}
                    <span className="ms-1">
                      {t(`subscription.status.${billingInfo.status.status}`)}
                    </span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* معلومات الباقة */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t('subscription.billing.planName')}</p>
                  <p className="text-lg font-semibold">
                    {billingInfo?.plan 
                      ? (isRTL ? billingInfo.plan.name_ar : (billingInfo.plan.name_en || billingInfo.plan.name_ar))
                      : t('subscription.billing.noPlan')
                    }
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t('subscription.billing.periodEnd')}</p>
                  <p className="text-lg font-semibold">
                    {formatDate(billingInfo?.subscription?.current_period_end)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t('subscription.billing.daysRemaining')}</p>
                  <p className={cn(
                    'text-lg font-semibold',
                    billingInfo?.status.daysRemaining && billingInfo.status.daysRemaining <= 7 && 'text-red-500'
                  )}>
                    {billingInfo?.status.isExpired 
                      ? t('subscription.status.expired')
                      : `${billingInfo?.status.daysRemaining || 0} ${t('common.days')}`
                    }
                  </p>
                </div>
              </div>

              {/* تحذير إذا كان الاشتراك منتهياً أو قريباً */}
              {billingInfo?.status.shouldShowWarning && (
                <div className={cn(
                  'rounded-lg p-4 border',
                  billingInfo.status.warningLevel === 'critical' 
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : billingInfo.status.warningLevel === 'warning'
                    ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                )}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn(
                      'h-5 w-5 mt-0.5',
                      billingInfo.status.warningLevel === 'critical' ? 'text-red-500' :
                      billingInfo.status.warningLevel === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    )} />
                    <div>
                      <p className="font-medium">
                        {billingInfo.status.isLocked 
                          ? t('subscription.alerts.lockedMessage')
                          : billingInfo.status.isInGracePeriod
                          ? t('subscription.alerts.gracePeriodMessage', { days: billingInfo.status.graceDaysRemaining })
                          : t('subscription.alerts.warningMessage', { days: billingInfo.status.daysRemaining })
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="flex flex-wrap gap-3">
                <Button>
                  <RefreshCw className="h-4 w-4 me-2" />
                  {t('subscription.billing.renewNow')}
                </Button>
                <Button variant="outline">
                  <ArrowUpCircle className="h-4 w-4 me-2" />
                  {t('subscription.billing.upgradePlan')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* بطاقة التخزين */}
          {storageStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  {t('subscription.storage.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('subscription.storage.used')}</span>
                    <span>
                      {storageStatus.formattedUsed} / {storageStatus.formattedMax}
                    </span>
                  </div>
                  <Progress 
                    value={storageStatus.usedPercent} 
                    className={cn(
                      'h-2',
                      storageStatus.isCritical && '[&>div]:bg-red-500',
                      storageStatus.isNearLimit && !storageStatus.isCritical && '[&>div]:bg-yellow-500'
                    )}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{t('subscription.storage.files')}: {storageStatus.filesCount} / {storageStatus.maxFiles}</span>
                  <span>{t('subscription.storage.remaining')}: {storageStatus.formattedRemaining}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* معلومات الحساب */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('subscription.billing.accountInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t('subscription.billing.accountName')}</p>
                  <p className="font-medium">{billingInfo?.tenant?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t('subscription.billing.billingEmail')}</p>
                  <p className="font-medium">{billingInfo?.tenant?.email || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الباقات المتاحة */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan) => (
              <Card 
                key={plan.id}
                className={cn(
                  'relative',
                  billingInfo?.plan?.id === plan.id && 'border-primary border-2'
                )}
              >
                {billingInfo?.plan?.id === plan.id && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t('subscription.plans.current')}
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{isRTL ? plan.name_ar : (plan.name_en || plan.name_ar)}</CardTitle>
                  <CardDescription>
                    {plan.price_monthly 
                      ? `${formatAmount(plan.price_monthly, plan.currency)} / ${t('common.month')}`
                      : t('subscription.plans.free')
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {plan.max_users} {t('subscription.plans.users')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {plan.max_companies} {t('subscription.plans.companies')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {plan.storage_gb} GB {t('subscription.plans.storage')}
                    </li>
                  </ul>
                  <Button 
                    className="w-full"
                    variant={billingInfo?.plan?.id === plan.id ? 'outline' : 'default'}
                    disabled={billingInfo?.plan?.id === plan.id}
                  >
                    {billingInfo?.plan?.id === plan.id 
                      ? t('subscription.plans.currentPlan')
                      : t('subscription.plans.selectPlan')
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* سجل الفواتير */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t('subscription.invoices.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('subscription.invoices.number')}</TableHead>
                      <TableHead>{t('subscription.invoices.date')}</TableHead>
                      <TableHead>{t('subscription.invoices.amount')}</TableHead>
                      <TableHead>{t('subscription.invoices.status')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingInfo.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{formatDate(invoice.created_at)}</TableCell>
                        <TableCell>{formatAmount(invoice.amount, invoice.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                            {t(`subscription.invoices.${invoice.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('subscription.invoices.noInvoices')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* الشركات */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('subscription.companies.title')}
              </CardTitle>
              <CardDescription>
                {t('subscription.companies.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo?.companies && billingInfo.companies.length > 0 ? (
                <div className="space-y-3">
                  {billingInfo.companies.map((company) => (
                    <div 
                      key={company.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.is_main && (
                            <Badge variant="secondary" className="mt-1">
                              {t('subscription.companies.main')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('subscription.companies.noCompanies')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingPage;
