import { supabase, isSelfHosted } from '@/lib/supabase';

export interface ProductStats {
  product_code: string;
  product_name: string;
  total_plans: number;
  active_plans: number;
  total_tenants: number;
  active_tenants: number;
  available_modules: number;
  monthly_revenue?: number;
  yearly_revenue?: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalPlans: number;
  totalTenants: number;
  activeTenants: number;
  totalRevenue: number;
  products: ProductStats[];
}

class SaaSStatsService {
  /**
   * Get statistics for a specific product
   */
  async getProductStats(productCode: string): Promise<ProductStats | null> {
    if (isSelfHosted) return null;
    try {
      const { data, error } = await supabase.rpc('get_product_stats', {
        p_product_code: productCode,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return {
        product_code: productCode,
        product_name: data[0].product_name,
        total_plans: data[0].total_plans || 0,
        active_plans: data[0].active_plans || 0,
        total_tenants: data[0].total_tenants || 0,
        active_tenants: data[0].active_tenants || 0,
        available_modules: data[0].available_modules || 0,
      };
    } catch (error) {
      console.error('Error fetching product stats:', error);
      return null;
    }
  }

  /**
   * Get overall dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    if (isSelfHosted) return { totalProducts: 0, totalPlans: 0, totalTenants: 0, activeTenants: 0, totalRevenue: 0, products: [] };
    try {
      const productCodes = ['nexacore', 'texacore', 'fincore', 'inducore', 'medcore'];
      
      // Fetch stats for all products in parallel
      const statsPromises = productCodes.map((code) => this.getProductStats(code));
      const productsStats = await Promise.all(statsPromises);
      
      // Filter out null results
      const validStats = productsStats.filter((stat): stat is ProductStats => stat !== null);
      
      // Calculate totals
      const totalPlans = validStats.reduce((sum, stat) => sum + stat.total_plans, 0);
      const totalTenants = validStats.reduce((sum, stat) => sum + stat.total_tenants, 0);
      const activeTenants = validStats.reduce((sum, stat) => sum + stat.active_tenants, 0);
      
      // Calculate REAL revenue from actual PAYMENTS (not subscriptions)
      // This is the correct way - revenue = actual money collected
      const { data: paymentsData } = await supabase
        .from('saas_payments')
        .select('amount')
        .eq('status', 'completed');
      
      const totalRevenue = paymentsData?.reduce((sum, payment: any) => {
        return sum + (payment.amount || 0);
      }, 0) || 0;

      return {
        totalProducts: validStats.length,
        totalPlans,
        totalTenants,
        activeTenants,
        totalRevenue,
        products: validStats,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalProducts: 0,
        totalPlans: 0,
        totalTenants: 0,
        activeTenants: 0,
        totalRevenue: 0,
        products: [],
      };
    }
  }

  /**
   * Get recent tenants across all products
   */
  async getRecentTenants(limit: number = 10) {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          code,
          name,
          email,
          status,
          created_at,
          product_id,
          saas_products!inner(name, code)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent tenants:', error);
      return [];
    }
  }

  /**
   * Get revenue by product
   */
  async getRevenueByProduct(currency: string = 'USD') {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          product_id,
          price_monthly,
          price_yearly,
          currency,
          saas_products!inner(name, code)
        `)
        .eq('is_active', true)
        .eq('currency', currency);

      if (error) throw error;

      // Group by product
      const revenueMap = new Map<string, { name: string; revenue: number }>();
      
      data?.forEach((plan: any) => {
        const productCode = plan.saas_products.code;
        const productName = plan.saas_products.name;
        const revenue = plan.price_monthly || 0;
        
        if (revenueMap.has(productCode)) {
          const existing = revenueMap.get(productCode)!;
          revenueMap.set(productCode, {
            name: existing.name,
            revenue: existing.revenue + revenue,
          });
        } else {
          revenueMap.set(productCode, { name: productName, revenue });
        }
      });

      return Array.from(revenueMap.entries()).map(([code, data]) => ({
        product: code,
        name: data.name,
        revenue: data.revenue,
      }));
    } catch (error) {
      console.error('Error fetching revenue by product:', error);
      return [];
    }
  }

  /**
   * Get subscribers growth over time (last 12 months)
   */
  async getSubscribersGrowth() {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('created_at, status')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, { total: number; active: number }>();
      
      data?.forEach((tenant: any) => {
        const month = new Date(tenant.created_at).toISOString().slice(0, 7); // YYYY-MM
        
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { total: 0, active: 0 });
        }
        
        const current = monthlyData.get(month)!;
        current.total += 1;
        if (tenant.status === 'active') {
          current.active += 1;
        }
      });

      return Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        total: data.total,
        active: data.active,
      }));
    } catch (error) {
      console.error('Error fetching subscribers growth:', error);
      return [];
    }
  }

  /**
   * Get plan distribution (how many subscribers per plan)
   */
  async getPlanDistribution() {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select(`
          id,
          status,
          subscription_plans!inner(
            name_en,
            name_ar,
            code
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Count by plan
      const planCounts = new Map<string, { name_en: string; name_ar: string; count: number }>();
      
      data?.forEach((sub: any) => {
        const planCode = sub.subscription_plans.code;
        const planNameEn = sub.subscription_plans.name_en;
        const planNameAr = sub.subscription_plans.name_ar;
        
        if (!planCounts.has(planCode)) {
          planCounts.set(planCode, { name_en: planNameEn, name_ar: planNameAr, count: 0 });
        }
        
        planCounts.get(planCode)!.count += 1;
      });

      return Array.from(planCounts.entries()).map(([code, data]) => ({
        code,
        name_en: data.name_en,
        name_ar: data.name_ar,
        count: data.count,
      }));
    } catch (error) {
      console.error('Error fetching plan distribution:', error);
      return [];
    }
  }

  /**
   * Get revenue trend (last 12 months) - from actual payments
   */
  async getRevenueTrend() {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select('collection_date, amount, status')
        .eq('status', 'completed')
        .gte('collection_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('collection_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyRevenue = new Map<string, number>();
      
      data?.forEach((payment: any) => {
        const month = new Date(payment.collection_date).toISOString().slice(0, 7);
        const amount = payment.amount || 0;
        
        monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + amount);
      });

      return Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
        month,
        revenue,
      }));
    } catch (error) {
      console.error('Error fetching revenue trend:', error);
      return [];
    }
  }

  /**
   * Get churn rate (percentage of cancelled subscriptions)
   */
  async getChurnRate() {
    if (isSelfHosted) return { total: 0, active: 0, cancelled: 0, churnRate: 0 };
    try {
      const { data: allSubs } = await supabase
        .from('tenant_subscriptions')
        .select('id, status');

      const total = allSubs?.length || 0;
      const cancelled = allSubs?.filter((sub: any) => sub.status === 'cancelled').length || 0;
      
      return {
        total,
        active: total - cancelled,
        cancelled,
        churnRate: total > 0 ? (cancelled / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Error fetching churn rate:', error);
      return {
        total: 0,
        active: 0,
        cancelled: 0,
        churnRate: 0,
      };
    }
  }

  /**
   * Get payment statistics by method
   */
  async getPaymentsByMethod() {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select('payment_method, amount, currency, status')
        .eq('status', 'completed');

      if (error) throw error;

      // Group by payment method
      const methodStats = new Map<string, { count: number; total: number }>();
      
      data?.forEach((payment: any) => {
        const method = payment.payment_method;
        const amount = payment.amount || 0;
        
        if (!methodStats.has(method)) {
          methodStats.set(method, { count: 0, total: 0 });
        }
        
        const stats = methodStats.get(method)!;
        stats.count += 1;
        stats.total += amount;
      });

      return Array.from(methodStats.entries()).map(([method, stats]) => ({
        method,
        count: stats.count,
        total: stats.total,
      }));
    } catch (error) {
      console.error('Error fetching payments by method:', error);
      return [];
    }
  }

  /**
   * Get recent payments
   */
  async getRecentPayments(limit: number = 10) {
    if (isSelfHosted) return [];
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select(`
          id,
          payment_number,
          amount,
          currency,
          payment_method,
          status,
          collection_date,
          tenants!inner(name, code),
          subscription_plans(name_en, name_ar)
        `)
        .order('collection_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent payments:', error);
      return [];
    }
  }
}

export const saasStatsService = new SaaSStatsService();
