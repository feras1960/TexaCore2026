/**
 * SaaS Admin Dashboard
 * لوحة تحكم إدارة SaaS - مربوطة بقاعدة البيانات الفعلية
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { dashboardService, type DashboardStats } from '@/services/saas/dashboardService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  Package,
  Server,
  CheckCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  BarChart3,
  UserCog,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SaaSDashboard() {
  const { t, language, direction } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from database
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, tenantsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentTenants(5),
      ]);
      setStats(statsData);
      setRecentTenants(tenantsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pending tasks based on real data
  const pendingTasks = stats ? [
    { 
      type: 'subscription', 
      label: language === 'ar' ? 'اشتراكات بحاجة للتجديد' : 'Subscriptions pending renewal', 
      count: stats.expiredTenants
    },
    { 
      type: 'approval', 
      label: language === 'ar' ? 'وكلاء بانتظار الموافقة' : 'Agents pending approval', 
      count: stats.pendingAgents
    },
    { 
      type: 'suspended', 
      label: language === 'ar' ? 'حسابات موقوفة' : 'Suspended accounts', 
      count: stats.suspendedTenants
    },
    { 
      type: 'trial', 
      label: language === 'ar' ? 'حسابات تجريبية' : 'Trial accounts', 
      count: stats.trialTenants
    },
  ] : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar' ? 'نظرة عامة على إحصائيات النظام' : 'System statistics overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => navigate('/saas/subscribers')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('saas.tenants.create')}
          </Button>
        </div>
      </div>

      {/* Main Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* MRR */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-tajawal">
                    {language === 'ar' ? 'الإيرادات الشهرية' : 'MRR'}
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                    {stats.mrr.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">SAR</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          {/* Total Tenants */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-tajawal">
                    {t('saas.tenants.total')}
                  </p>
                  <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                    {stats.totalTenants}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.activeTenants} {t('saas.status.active')}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-tajawal">
                    {t('saas.agents.totalAgents')}
                  </p>
                  <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                    {stats.totalAgents}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.activeAgents} {t('saas.status.active')}
                  </p>
                </div>
                <UserCog className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
            </CardContent>
          </Card>

          {/* Churn Rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-tajawal">
                    {language === 'ar' ? 'معدل التسرب' : 'Churn Rate'}
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {stats.churnRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.suspendedTenants + stats.expiredTenants} {language === 'ar' ? 'متراجع' : 'churned'}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-amber-300 dark:text-amber-600" />
              </div>
            </CardContent>
          </Card>

          {/* System Uptime */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-tajawal">
                    {language === 'ar' ? 'وقت التشغيل' : 'Uptime'}
                  </p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                    {stats.uptime}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">
                      {language === 'ar' ? 'يعمل' : 'Operational'}
                    </span>
                  </div>
                </div>
                <Server className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          {/* Retention Rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-tajawal">
                    {language === 'ar' ? 'معدل الاحتفاظ' : 'Retention'}
                  </p>
                  <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                    {stats.retentionRate}%
                  </p>
                  <Progress value={stats.retentionRate} className="h-1.5 mt-2" />
                </div>
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Subscribers */}
        <Card className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-erp-navy dark:text-white font-cairo">
              {language === 'ar' ? 'أحدث المشتركين' : 'Recent Subscribers'}
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => navigate('/saas/subscribers')}
            >
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                {t('common.loading')}
              </div>
            ) : recentTenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('common.code')}</TableHead>
                    <TableHead className="text-xs">{t('common.name')}</TableHead>
                    <TableHead className="text-xs">{language === 'ar' ? 'الباقة' : 'Plan'}</TableHead>
                    <TableHead className="text-xs">{t('common.status')}</TableHead>
                    <TableHead className="text-xs">{t('common.date')}</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTenants.map((tenant) => {
                    const subscription = tenant.tenant_subscriptions?.[0];
                    return (
                      <TableRow key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-mono text-xs text-gray-600">{tenant.code}</TableCell>
                        <TableCell className="font-medium text-sm">{tenant.name}</TableCell>
                        <TableCell>
                          {subscription?.plan_code && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {subscription.plan_code}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              tenant.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                                : tenant.status === 'trial'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
                                : tenant.status === 'suspended'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {t(`saas.status.${tenant.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Tasks */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-erp-navy dark:text-white font-cairo flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                {language === 'ar' ? 'المهام المعلقة' : 'Pending Tasks'}
              </h3>
            </div>
            <CardContent className="p-4 space-y-3">
              {pendingTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">{task.label}</span>
                  <Badge variant="outline" className="bg-white dark:bg-gray-800">
                    {task.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-erp-navy dark:text-white font-cairo flex items-center gap-2">
                <Server className="w-4 h-4 text-green-500" />
                {language === 'ar' ? 'صحة النظام' : 'System Health'}
              </h3>
            </div>
            <CardContent className="p-4 space-y-3">
              {[
                { label: language === 'ar' ? 'الخوادم' : 'Servers', status: 'good' },
                { label: language === 'ar' ? 'قاعدة البيانات' : 'Database', status: 'good' },
                { label: 'API', status: 'good' },
                { label: language === 'ar' ? 'النسخ الاحتياطي' : 'Backup', status: 'warning' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      item.status === 'good'
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}
                  >
                    {item.status === 'good'
                      ? (language === 'ar' ? 'يعمل' : 'OK')
                      : (language === 'ar' ? 'يحتاج مراجعة' : 'Warning')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-erp-navy dark:text-white font-cairo">
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </h3>
            </div>
            <CardContent className="p-4 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/saas/subscribers')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إضافة مشترك' : 'Add Subscriber'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/saas/packages')}
              >
                <Package className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إدارة الباقات' : 'Manage Packages'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/saas/agents')}
              >
                <UserCog className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إدارة الوكلاء' : 'Manage Agents'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/saas/payments')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'المدفوعات' : 'View Payments'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
