import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatsGrid, StatCard } from '@/components/shared/stats/StatCard';
import { StatusBadge } from '@/components/shared/status/StatusBadge';
import { 
  RefreshCw, 
  Building2,
  Coins,
  TrendingUp,
  ShoppingCart,
  Users,
  CreditCard,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Dashboard() {
  const { t, direction, language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isPromoting, setIsPromoting] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handlePromoteToSuperAdmin = async () => {
    if (!user) return;
    setIsPromoting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { is_super_admin: true }
      });
      
      if (error) throw error;
      
      toast.success(language === 'ar' ? 'تمت ترقيتك لمدير عام بنجاح! يرجى تحديث الصفحة.' : 'Successfully promoted to Super Admin! Please refresh the page.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error('Promotion error:', err);
      toast.error(err.message || 'Failed to promote to Super Admin');
    } finally {
      setIsPromoting(false);
    }
  };

  // Mock Data - using translation keys for labels
  const statsData = [
    { 
      label: t('stats.totalSales'), 
      value: 1250000, 
      type: 'positive' as const, 
      change: 12.5, 
      icon: TrendingUp,
    },
    { 
      label: t('stats.totalRevenue'), 
      value: 980000, 
      type: 'info' as const, 
      change: 8.3, 
      icon: CreditCard,
    },
    { 
      label: t('stats.totalOrders'), 
      value: 1247, 
      type: 'neutral' as const, 
      change: -2.1, 
      icon: ShoppingCart
    },
    { 
      label: t('stats.activeCustomers'), 
      value: 342, 
      type: 'positive' as const, 
      change: 5.7, 
      icon: Users
    },
  ];

  // Mock orders data - IDs are universal, customer names use translation keys
  const recentOrders = [
    { id: 'ORD-001', customerKey: 'mockData.customers.customer1', amount: 15000, status: 'completed' as const },
    { id: 'ORD-002', customerKey: 'mockData.customers.customer2', amount: 8500, status: 'pending' as const },
    { id: 'ORD-003', customerKey: 'mockData.customers.customer3', amount: 22000, status: 'confirmed' as const },
    { id: 'ORD-004', customerKey: 'mockData.customers.customer4', amount: 45000, status: 'in_progress' as const },
  ];

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Dev Tool: Promote to Super Admin (Only show if not already Super Admin) */}
          {!isSuperAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePromoteToSuperAdmin}
              disabled={isPromoting}
              className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800"
            >
              {isPromoting ? (
                <RefreshCw className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 me-2" />
              )}
              {language === 'ar' ? 'تفعيل كمدير عام' : 'Activate as Super Admin'}
            </Button>
          )}

          {/* Currency Filter */}
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-full lg:w-[160px] bg-white dark:bg-gray-800 h-10 text-sm border-gray-200 dark:border-gray-700">
              <Coins className="w-4 h-4 me-2 text-gray-400" />
              <SelectValue placeholder={t('filters.selectCurrency')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAR">{t('currencies.SAR')}</SelectItem>
              <SelectItem value="USD">{t('currencies.USD')}</SelectItem>
              <SelectItem value="EUR">{t('currencies.EUR')}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Branch Filter */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full lg:w-[180px] bg-white dark:bg-gray-800 h-10 text-sm border-gray-200 dark:border-gray-700">
              <Building2 className="w-4 h-4 me-2 text-gray-400" />
              <SelectValue placeholder={t('filters.selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('branches.all')}</SelectItem>
              <SelectItem value="main">{t('branches.main')}</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            className={cn(
              "h-10 w-10 border-gray-200 dark:border-gray-700",
              isRefreshing && "animate-spin"
            )}
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Stats Grid - Using StatCard Component */}
      <StatsGrid cols={4}>
        {statsData.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            type={stat.type}
            change={stat.change}
            icon={stat.icon}
            formatValue={(val) => formatCurrency(Number(val), selectedCurrency)}
          />
        ))}
      </StatsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Stats Placeholder */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-cairo">{t('dashboard.quickStats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 dark:text-gray-500 font-tajawal">
                {t('dashboard.chartsPlaceholder')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders - Using StatusBadge */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-cairo">{t('dashboard.recentOrders')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-erp-teal hover:text-erp-teal/80">
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-erp-navy/10 dark:bg-erp-teal/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-erp-navy dark:text-erp-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-erp-navy dark:text-white">
                        {t(order.customerKey)}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{order.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-erp-navy dark:text-white font-mono">
                      {formatCurrency(order.amount, selectedCurrency)}
                    </span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
