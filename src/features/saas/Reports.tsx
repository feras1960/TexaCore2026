/**
 * SaaS Reports Page
 * صفحة تقارير وتحليلات SaaS - مربوطة بقاعدة البيانات الفعلية
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { dashboardService, type DashboardStats, type RevenueData } from '@/services/saas/dashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Printer, 
  Users, 
  CreditCard, 
  Activity, 
  Server,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';

export default function Reports() {
  const { t, language, direction } = useLanguage();
  const [timeRange, setTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<any[]>([]);

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const months = timeRange === '30days' ? 1 : 
                       timeRange === '3months' ? 3 : 
                       timeRange === '6months' ? 6 : 12;
        
        const [statsData, revenue, tenants, expiring] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRevenueData(months),
          dashboardService.getRecentTenants(5),
          dashboardService.getExpiringSubscriptions(30),
        ]);
        
        setDbStats(statsData);
        setRevenueData(revenue);
        setRecentTenants(tenants);
        setExpiringSubscriptions(expiring);
      } catch (err) {
        console.error('Error loading reports data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [timeRange]);

  // Computed stats from database
  const stats = useMemo(() => {
    if (!dbStats) {
      return {
        currentMrr: 0,
        mrrGrowth: 0,
        arr: 0,
        arrGrowth: 0,
        arpu: 0,
        arpuGrowth: 0,
        churnRate: 0,
        churnTrend: 0,
        nrr: 100,
        ltv: 0,
        cac: 0,
        ltvCacRatio: 0,
        totalCustomers: 0,
        newCustomers: 0,
        churnedCustomers: 0,
      };
    }
    
    const arpu = dbStats.activeTenants > 0 ? dbStats.mrr / dbStats.activeTenants : 0;
    const ltv = arpu * 24; // Assuming 24 month average lifetime
    const cac = arpu * 3; // Assuming 3 months payback
    
    return {
      currentMrr: dbStats.mrr,
      mrrGrowth: dbStats.mrrGrowth,
      arr: dbStats.arr,
      arrGrowth: dbStats.mrrGrowth, // Same as MRR growth
      arpu: Math.round(arpu),
      arpuGrowth: 0,
      churnRate: dbStats.churnRate,
      churnTrend: 0,
      nrr: 100 + dbStats.mrrGrowth - dbStats.churnRate,
      ltv: Math.round(ltv),
      cac: Math.round(cac),
      ltvCacRatio: cac > 0 ? Math.round((ltv / cac) * 10) / 10 : 0,
      totalCustomers: dbStats.totalTenants,
      newCustomers: dbStats.newTenantsThisMonth,
      churnedCustomers: dbStats.suspendedTenants + dbStats.expiredTenants,
    };
  }, [dbStats]);

  // Revenue by plan data from database
  const revenueByPlanData = useMemo(() => {
    if (!dbStats) return [];
    
    const total = dbStats.starterCount + dbStats.professionalCount + dbStats.enterpriseCount;
    if (total === 0) return [];
    
    const starterRevenue = dbStats.starterCount * 500; // Assuming 500 SAR for starter
    const professionalRevenue = dbStats.professionalCount * 1500;
    const enterpriseRevenue = dbStats.enterpriseCount * 5000;
    const totalRevenue = starterRevenue + professionalRevenue + enterpriseRevenue;
    
    return [
      { 
        name: 'Enterprise', 
        value: totalRevenue > 0 ? Math.round((enterpriseRevenue / totalRevenue) * 100) : 0, 
        revenue: enterpriseRevenue, 
        color: '#8b5cf6',
        count: dbStats.enterpriseCount
      },
      { 
        name: 'Professional', 
        value: totalRevenue > 0 ? Math.round((professionalRevenue / totalRevenue) * 100) : 0, 
        revenue: professionalRevenue, 
        color: '#06b6d4',
        count: dbStats.professionalCount
      },
      { 
        name: 'Starter', 
        value: totalRevenue > 0 ? Math.round((starterRevenue / totalRevenue) * 100) : 0, 
        revenue: starterRevenue, 
        color: '#10b981',
        count: dbStats.starterCount
      },
    ].filter(p => p.count > 0);
  }, [dbStats]);

  // Churn analysis data
  const churnAnalysisData = useMemo(() => {
    if (!dbStats) return [];
    return [{
      month: language === 'ar' ? 'الشهر الحالي' : 'Current Month',
      churnRate: dbStats.churnRate,
      churned: dbStats.suspendedTenants + dbStats.expiredTenants,
      retained: dbStats.activeTenants,
    }];
  }, [dbStats, language]);

  // New subscribers from database
  const newSubscribers = useMemo(() => {
    return recentTenants.map(t => ({
      id: t.code || t.id,
      name: t.name,
      plan: t.tenant_subscriptions?.[0]?.plan_code || 'N/A',
      status: t.status,
      date: new Date(t.created_at).toISOString().split('T')[0],
      amount: t.tenant_subscriptions?.[0]?.monthly_price || 0,
    }));
  }, [recentTenants]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-erp-navy dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handlePrint = () => window.print();
  const handleExport = () => console.log('Exporting...');

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-erp-teal" />
            {language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal mt-1">
            {language === 'ar' ? 'تحليلات شاملة للإيرادات والمشتركين' : 'Comprehensive revenue and subscriber analytics'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">{language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days'}</SelectItem>
              <SelectItem value="3months">{language === 'ar' ? 'آخر 3 أشهر' : 'Last 3 Months'}</SelectItem>
              <SelectItem value="6months">{language === 'ar' ? 'آخر 6 أشهر' : 'Last 6 Months'}</SelectItem>
              <SelectItem value="12months">{language === 'ar' ? 'آخر 12 شهر' : 'Last 12 Months'}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">{t('common.print')}</span>
          </Button>
          <Button onClick={handleExport} className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{language === 'ar' ? 'تصدير' : 'Export'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">MRR</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono mt-1">
                  {stats.currentMrr.toLocaleString()} <span className="text-sm font-normal">SAR</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">+{stats.mrrGrowth}%</span>
                </div>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">ARR</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono mt-1">
                  {(stats.arr / 1000).toFixed(0)}K <span className="text-sm font-normal">SAR</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-600">+{stats.arrGrowth}%</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">ARPU</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 font-mono mt-1">
                  {stats.arpu.toLocaleString()} <span className="text-sm font-normal">SAR</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-purple-600">+{stats.arpuGrowth}%</span>
                </div>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{language === 'ar' ? 'معدل التراجع' : 'Churn Rate'}</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 font-mono mt-1">
                  {stats.churnRate}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">{stats.churnTrend}%</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500 rounded-xl">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Percent className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">NRR</p>
                <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">{stats.nrr}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">LTV</p>
                <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">{(stats.ltv / 1000).toFixed(1)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">CAC</p>
                <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">{(stats.cac / 1000).toFixed(1)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">LTV:CAC</p>
                <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">{stats.ltvCacRatio}x</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{language === 'ar' ? 'عملاء جدد صافي' : 'Net New'}</p>
                <p className="text-xl font-bold text-erp-navy dark:text-white font-mono">+{stats.newCustomers - stats.churnedCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
        <TabsList className="w-full justify-start bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 rounded-lg mb-6 overflow-x-auto">
          <TabsTrigger value="revenue" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <CreditCard className="w-4 h-4" />
            {language === 'ar' ? 'الإيرادات' : 'Revenue'}
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Users className="w-4 h-4" />
            {language === 'ar' ? 'الاشتراكات' : 'Subscriptions'}
          </TabsTrigger>
          <TabsTrigger value="churn" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <TrendingDown className="w-4 h-4" />
            {language === 'ar' ? 'التراجع' : 'Churn'}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Server className="w-4 h-4" />
            {language === 'ar' ? 'الأداء' : 'Performance'}
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MRR Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'نمو الإيرادات الشهرية' : 'MRR Growth'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="mrr"
                      name="MRR"
                      stroke="#00D4AA"
                      fill="url(#colorMrr)"
                    />
                    <Bar yAxisId="right" dataKey="newMrr" name={language === 'ar' ? 'جديد' : 'New'} fill="#22c55e" opacity={0.8} />
                    <Bar yAxisId="right" dataKey="churnMrr" name={language === 'ar' ? 'فاقد' : 'Lost'} fill="#ef4444" opacity={0.8} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Plan */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'الإيرادات حسب الباقة' : 'Revenue by Plan'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={revenueByPlanData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueByPlanData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {revenueByPlanData.map((plan) => (
                    <div key={plan.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                        <span>{plan.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{plan.value}%</span>
                        <span className="font-mono font-medium">{plan.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Subscribers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-cairo">
                  {language === 'ar' ? 'المشتركون الجدد' : 'New Subscribers'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الشركة' : 'Company'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الباقة' : 'Plan'}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('common.date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newSubscribers.length > 0 ? newSubscribers.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{sub.plan}</Badge></TableCell>
                        <TableCell>
                          <Badge className={sub.status === 'active' ? 'bg-green-500' : sub.status === 'trial' ? 'bg-blue-500' : 'bg-gray-500'}>
                            {t(`saas.status.${sub.status}`) || sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{sub.date}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          {language === 'ar' ? 'لا يوجد مشتركون جدد' : 'No new subscribers'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expiring Subscriptions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  {language === 'ar' ? 'اشتراكات تنتهي قريباً' : 'Expiring Soon'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الشركة' : 'Company'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الباقة' : 'Plan'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الأيام المتبقية' : 'Days Left'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المخاطرة' : 'Risk'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringSubscriptions.length > 0 ? expiringSubscriptions.map((sub) => {
                      const daysLeft = sub.end_date ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                      const risk = daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low';
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.tenants?.name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{sub.plan_code || 'N/A'}</Badge></TableCell>
                          <TableCell className="font-mono">{daysLeft}</TableCell>
                          <TableCell>
                            <Badge className={
                              risk === 'high' ? 'bg-red-500' :
                              risk === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                            }>
                              {risk === 'high' ? (language === 'ar' ? 'عالية' : 'High') :
                               risk === 'medium' ? (language === 'ar' ? 'متوسطة' : 'Medium') :
                               (language === 'ar' ? 'منخفضة' : 'Low')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          {language === 'ar' ? 'لا توجد اشتراكات تنتهي قريباً' : 'No subscriptions expiring soon'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Churn Tab */}
        <TabsContent value="churn" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-cairo flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                {language === 'ar' ? 'تحليل التراجع' : 'Churn Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={churnAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 5]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="churnRate"
                    name={language === 'ar' ? 'معدل التراجع' : 'Churn Rate'}
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-erp-navy dark:text-white font-mono">{stats.churnedCustomers}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'تراجعوا هذا الشهر' : 'Churned This Month'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-erp-navy dark:text-white font-mono">{stats.churnRate}%</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'معدل التراجع الحالي' : 'Current Churn Rate'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 font-mono">{stats.churnTrend}%</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'اتجاه التحسن' : 'Improvement Trend'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-erp-navy dark:text-white">{language === 'ar' ? 'وقت التشغيل' : 'Uptime'}</h3>
                  <Badge className="bg-green-500">99.99%</Badge>
                </div>
                <Progress value={99.99} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-erp-navy dark:text-white">{language === 'ar' ? 'زمن الاستجابة' : 'Response Time'}</h3>
                  <Badge variant="outline">120ms</Badge>
                </div>
                <Progress value={88} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-erp-navy dark:text-white">{language === 'ar' ? 'معدل الخطأ' : 'Error Rate'}</h3>
                  <Badge className="bg-green-500">0.01%</Badge>
                </div>
                <Progress value={1} className="h-2 [&>div]:bg-green-500" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
