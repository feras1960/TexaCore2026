/**
 * Plans Service
 * Service for managing subscription plans in the SaaS system
 */

import { supabase } from '@/lib/supabase';

export interface Plan {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_users: number;
  max_companies: number;
  max_storage_gb: number;
  features: string[];
  modules: string[];
  is_active: boolean;
  is_popular: boolean;
  trial_days: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  price_monthly: number;
  price_yearly: number;
  currency?: string;
  max_users: number;
  max_companies?: number;
  max_storage_gb?: number;
  features?: string[];
  modules?: string[];
  trial_days?: number;
  is_popular?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  price_monthly?: number;
  price_yearly?: number;
  max_users?: number;
  max_companies?: number;
  max_storage_gb?: number;
  features?: string[];
  modules?: string[];
  trial_days?: number;
  is_active?: boolean;
  is_popular?: boolean;
  sort_order?: number;
}

// Default plans for initial setup
export const defaultPlans: Omit<Plan, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    code: 'starter',
    name: 'Starter',
    name_ar: 'المبتدئ',
    description: 'Perfect for small businesses',
    description_ar: 'مثالي للشركات الصغيرة',
    price_monthly: 500,
    price_yearly: 5000,
    currency: 'SAR',
    max_users: 5,
    max_companies: 1,
    max_storage_gb: 10,
    features: ['Basic Accounting', 'Inventory Management', 'Email Support'],
    modules: ['accounting', 'inventory'],
    is_active: true,
    is_popular: false,
    trial_days: 14,
    sort_order: 1,
  },
  {
    code: 'professional',
    name: 'Professional',
    name_ar: 'الاحترافي',
    description: 'For growing businesses',
    description_ar: 'للشركات النامية',
    price_monthly: 1500,
    price_yearly: 15000,
    currency: 'SAR',
    max_users: 25,
    max_companies: 3,
    max_storage_gb: 50,
    features: ['Advanced Accounting', 'Multi-Warehouse', 'Priority Support', 'API Access'],
    modules: ['accounting', 'inventory', 'sales', 'purchases'],
    is_active: true,
    is_popular: true,
    trial_days: 14,
    sort_order: 2,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    name_ar: 'المؤسسات',
    description: 'For large organizations',
    description_ar: 'للمؤسسات الكبيرة',
    price_monthly: 5000,
    price_yearly: 50000,
    currency: 'SAR',
    max_users: 100,
    max_companies: 10,
    max_storage_gb: 200,
    features: ['Full ERP Suite', 'Custom Reports', 'Dedicated Manager', 'SLA', 'White Label'],
    modules: ['accounting', 'inventory', 'sales', 'purchases', 'hr', 'crm', 'manufacturing', 'pos'],
    is_active: true,
    is_popular: false,
    trial_days: 30,
    sort_order: 3,
  },
];

class PlansService {
  /**
   * Get all plans
   */
  async getAll(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      // If table doesn't exist, return default plans
      if (error.code === '42P01') {
        return this.getDefaultPlans();
      }
      console.error('Error fetching plans:', error);
      throw new Error(error.message);
    }

    return data || this.getDefaultPlans();
  }

  /**
   * Get active plans only
   */
  async getActive(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return this.getDefaultPlans().filter(p => p.is_active);
      }
      console.error('Error fetching active plans:', error);
      throw new Error(error.message);
    }

    return data || this.getDefaultPlans().filter(p => p.is_active);
  }

  /**
   * Get plan by ID
   */
  async getById(id: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching plan:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get plan by code
   */
  async getByCode(code: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        // Return from default plans if not in database
        const defaultPlan = defaultPlans.find(p => p.code === code);
        if (defaultPlan) {
          return {
            ...defaultPlan,
            id: code,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Plan;
        }
        return null;
      }
      console.error('Error fetching plan by code:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Create new plan
   */
  async create(input: CreatePlanInput): Promise<Plan> {
    const { data, error } = await supabase
      .from('saas_plans')
      .insert({
        ...input,
        currency: input.currency || 'SAR',
        max_companies: input.max_companies || 1,
        max_storage_gb: input.max_storage_gb || 10,
        features: input.features || [],
        modules: input.modules || [],
        trial_days: input.trial_days || 14,
        is_active: true,
        is_popular: input.is_popular || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Update plan
   */
  async update(id: string, input: UpdatePlanInput): Promise<Plan> {
    const { data, error } = await supabase
      .from('saas_plans')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plan:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Activate plan
   */
  async activate(id: string): Promise<Plan> {
    return this.update(id, { is_active: true });
  }

  /**
   * Deactivate plan
   */
  async deactivate(id: string): Promise<Plan> {
    return this.update(id, { is_active: false });
  }

  /**
   * Get default plans (fallback when DB table doesn't exist)
   */
  private getDefaultPlans(): Plan[] {
    return defaultPlans.map((plan, index) => ({
      ...plan,
      id: plan.code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }
}

export const plansService = new PlansService();
