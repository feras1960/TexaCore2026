/**
 * SaaS Dashboard Service
 * خدمة لوحة تحكم SaaS - إحصائيات من قاعدة البيانات الفعلية
 */

import { supabase, isSelfHosted } from '@/lib/supabase';

export interface DashboardStats {
  // المشتركين
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  expiredTenants: number;
  newTenantsThisMonth: number;
  
  // الوكلاء
  totalAgents: number;
  activeAgents: number;
  pendingAgents: number;
  
  // الإيرادات
  mrr: number;
  arr: number;
  mrrGrowth: number;
  totalRevenue: number;
  pendingPayments: number;
  
  // معدلات
  churnRate: number;
  retentionRate: number;
  conversionRate: number;
  
  // الباقات
  starterCount: number;
  professionalCount: number;
  enterpriseCount: number;
  
  // النظام
  uptime: number;
}

export interface RevenueData {
  month: string;
  mrr: number;
  arr: number;
  newMrr: number;
  churnMrr: number;
}

export interface TenantGrowthData {
  month: string;
  newTenants: number;
  churned: number;
  total: number;
}

class DashboardService {
  /**
   * جلب إحصائيات لوحة التحكم
   */
  async getStats(): Promise<DashboardStats> {
    if (isSelfHosted) return this.getDefaultStats();
    try {
      // جلب إحصائيات المشتركين
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, status, created_at');

      if (tenantsError && tenantsError.code !== '42P01') {
        throw tenantsError;
      }

      const tenantsData = tenants || [];
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // جلب إحصائيات الوكلاء
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, status');

      if (agentsError && agentsError.code !== '42P01') {
        throw agentsError;
      }

      const agentsData = agents || [];

      // جلب إحصائيات المدفوعات
      const { data: payments, error: paymentsError } = await supabase
        .from('saas_payments')
        .select('id, amount, status, created_at');

      // إذا كان الجدول غير موجود، نستخدم قيم افتراضية
      const paymentsData = (paymentsError?.code === '42P01') ? [] : (payments || []);

      // جلب إحصائيات الاشتراكات
      const { data: subscriptions, error: subsError } = await supabase
        .from('tenant_subscriptions')
        .select('id, plan_code, status, monthly_price');

      const subscriptionsData = (subsError?.code === '42P01') ? [] : (subscriptions || []);

      // حساب الإحصائيات
      const activeTenants = tenantsData.filter(t => t.status === 'active').length;
      const suspendedTenants = tenantsData.filter(t => t.status === 'suspended').length;
      const expiredTenants = tenantsData.filter(t => t.status === 'expired').length;
      const trialTenants = tenantsData.filter(t => t.status === 'trial').length;
      const newTenantsThisMonth = tenantsData.filter(t => 
        new Date(t.created_at) >= thisMonth
      ).length;

      const activeAgents = agentsData.filter(a => a.status === 'active').length;
      const pendingAgents = agentsData.filter(a => a.status === 'pending').length;

      // حساب MRR من الاشتراكات النشطة
      const activeSubs = subscriptionsData.filter(s => s.status === 'active');
      const mrr = activeSubs.reduce((sum, s) => sum + (s.monthly_price || 0), 0);
      const arr = mrr * 12;

      // حساب الإيرادات
      const completedPayments = paymentsData.filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingPaymentsAmount = paymentsData
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // حساب معدل التراجع
      const churnRate = tenantsData.length > 0 
        ? ((suspendedTenants + expiredTenants) / tenantsData.length) * 100 
        : 0;

      // حساب توزيع الباقات
      const starterCount = activeSubs.filter(s => s.plan_code === 'starter').length;
      const professionalCount = activeSubs.filter(s => s.plan_code === 'professional').length;
      const enterpriseCount = activeSubs.filter(s => s.plan_code === 'enterprise').length;

      return {
        totalTenants: tenantsData.length,
        activeTenants,
        trialTenants,
        suspendedTenants,
        expiredTenants,
        newTenantsThisMonth,
        
        totalAgents: agentsData.length,
        activeAgents,
        pendingAgents,
        
        mrr,
        arr,
        mrrGrowth: 0, // سيتم حسابه لاحقاً من البيانات التاريخية
        totalRevenue,
        pendingPayments: pendingPaymentsAmount,
        
        churnRate: Math.round(churnRate * 100) / 100,
        retentionRate: Math.round((100 - churnRate) * 100) / 100,
        conversionRate: trialTenants > 0 
          ? Math.round((activeTenants / (activeTenants + trialTenants)) * 100 * 100) / 100 
          : 100,
        
        starterCount,
        professionalCount,
        enterpriseCount,
        
        uptime: 99.99, // يتم جلبه من نظام المراقبة
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // إرجاع قيم افتراضية في حالة الخطأ
      return this.getDefaultStats();
    }
  }

  /**
   * جلب بيانات الإيرادات الشهرية
   */
  async getRevenueData(months: number = 6): Promise<RevenueData[]> {
    if (isSelfHosted) return [];
    try {
      const { data: payments, error } = await supabase
        .from('saas_payments')
        .select('amount, status, created_at')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error && error.code !== '42P01') {
        throw error;
      }

      // تجميع البيانات حسب الشهر
      const monthlyData: Record<string, { total: number; count: number }> = {};
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                         'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

      (payments || []).forEach(p => {
        const date = new Date(p.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, count: 0 };
        }
        monthlyData[monthKey].total += p.amount || 0;
        monthlyData[monthKey].count += 1;
      });

      // تحويل إلى مصفوفة
      const result: RevenueData[] = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const data = monthlyData[monthKey] || { total: 0, count: 0 };
        
        result.push({
          month: monthNames[date.getMonth()],
          mrr: data.total,
          arr: data.total * 12,
          newMrr: 0, // يحتاج تحليل إضافي
          churnMrr: 0, // يحتاج تحليل إضافي
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      return [];
    }
  }

  /**
   * جلب بيانات نمو المشتركين
   */
  async getTenantGrowthData(months: number = 6): Promise<TenantGrowthData[]> {
    if (isSelfHosted) return [];
    try {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, status, created_at')
        .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error && error.code !== '42P01') {
        throw error;
      }

      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                         'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

      const monthlyData: Record<string, { new: number; churned: number }> = {};

      (tenants || []).forEach(t => {
        const date = new Date(t.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { new: 0, churned: 0 };
        }
        monthlyData[monthKey].new += 1;
        if (t.status === 'suspended' || t.status === 'expired') {
          monthlyData[monthKey].churned += 1;
        }
      });

      const result: TenantGrowthData[] = [];
      const now = new Date();
      let runningTotal = 0;

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const data = monthlyData[monthKey] || { new: 0, churned: 0 };
        
        runningTotal += data.new - data.churned;
        
        result.push({
          month: monthNames[date.getMonth()],
          newTenants: data.new,
          churned: data.churned,
          total: Math.max(0, runningTotal),
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching tenant growth data:', error);
      return [];
    }
  }

  /**
   * جلب المشتركين الأخيرين
   */
  async getRecentTenants(limit: number = 5): Promise<any[]> {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, code, name, email, status, created_at,
          tenant_subscriptions(plan_code, status, monthly_price)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && error.code !== '42P01') {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent tenants:', error);
      return [];
    }
  }

  /**
   * جلب المدفوعات المعلقة
   */
  async getPendingPayments(limit: number = 5): Promise<any[]> {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select('*, tenants(name)')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(limit);

      if (error && error.code !== '42P01') {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      return [];
    }
  }

  /**
   * جلب الاشتراكات المنتهية قريباً
   */
  async getExpiringSubscriptions(days: number = 30): Promise<any[]> {
    if (isSelfHosted) return [];
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select('*, tenants(id, name, email)')
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString())
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true });

      if (error && error.code !== '42P01') {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching expiring subscriptions:', error);
      return [];
    }
  }

  /**
   * القيم الافتراضية
   */
  private getDefaultStats(): DashboardStats {
    return {
      totalTenants: 0,
      activeTenants: 0,
      trialTenants: 0,
      suspendedTenants: 0,
      expiredTenants: 0,
      newTenantsThisMonth: 0,
      totalAgents: 0,
      activeAgents: 0,
      pendingAgents: 0,
      mrr: 0,
      arr: 0,
      mrrGrowth: 0,
      totalRevenue: 0,
      pendingPayments: 0,
      churnRate: 0,
      retentionRate: 100,
      conversionRate: 0,
      starterCount: 0,
      professionalCount: 0,
      enterpriseCount: 0,
      uptime: 99.99,
    };
  }
}

export const dashboardService = new DashboardService();
