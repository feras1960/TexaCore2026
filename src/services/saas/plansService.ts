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
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
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
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        console.warn('subscription_plans table not found');
        return [];
      }
      console.error('Error fetching plans:', error);
      throw new Error(error.message);
    }

    // Map database fields to frontend Plan interface
    return (data || []).map(plan => ({
      id: plan.id,
      code: plan.code,
      name: plan.name_en || plan.name,
      name_ar: plan.name_ar,
      description: plan.description,
      description_ar: plan.description_ar,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currency: plan.currency || 'USD',
      max_users: plan.max_users,
      max_companies: plan.max_companies,
      max_storage_gb: plan.storage_gb,
      features: Array.isArray(plan.features) ? plan.features : [],
      modules: Array.isArray(plan.included_modules) ? plan.included_modules : [],
      is_active: plan.is_active !== false,
      is_popular: plan.is_popular || false,
      trial_days: plan.trial_days || 14,
      sort_order: plan.display_order || 0,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    })) as Plan[];
  }

  /**
   * Get active plans only
   */
  async getActive(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return [];
      }
      console.error('Error fetching active plans:', error);
      throw new Error(error.message);
    }

    // Map database fields to frontend Plan interface
    return (data || []).map(plan => ({
      id: plan.id,
      code: plan.code,
      name: plan.name_en || plan.name,
      name_ar: plan.name_ar,
      description: plan.description,
      description_ar: plan.description_ar,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currency: plan.currency || 'USD',
      max_users: plan.max_users,
      max_companies: plan.max_companies,
      max_storage_gb: plan.storage_gb,
      features: Array.isArray(plan.features) ? plan.features : [],
      modules: Array.isArray(plan.included_modules) ? plan.included_modules : [],
      is_active: plan.is_active !== false,
      is_popular: plan.is_popular || false,
      trial_days: plan.trial_days || 14,
      sort_order: plan.display_order || 0,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    })) as Plan[];
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
        currency: input.currency || 'USD',
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
    // Map frontend fields to database fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.name) updateData.name_en = input.name;
    if (input.name_ar) updateData.name_ar = input.name_ar;
    if (input.description) updateData.description = input.description;
    if (input.description_ar) updateData.description_ar = input.description_ar;
    if (input.price_monthly !== undefined) updateData.price_monthly = input.price_monthly;
    if (input.price_yearly !== undefined) updateData.price_yearly = input.price_yearly;
    if (input.max_users !== undefined) updateData.max_users = input.max_users;
    if (input.max_companies !== undefined) updateData.max_companies = input.max_companies;
    if (input.max_storage_gb !== undefined) updateData.storage_gb = input.max_storage_gb;
    if (input.modules) updateData.included_modules = input.modules;
    if (input.features) updateData.features = input.features;
    if (input.trial_days !== undefined) updateData.trial_days = input.trial_days;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.is_popular !== undefined) updateData.is_popular = input.is_popular;
    if (input.sort_order !== undefined) updateData.display_order = input.sort_order;

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating plan:', error);
      throw new Error(error.message);
    }

    // Map database fields to frontend Plan interface
    return {
      id: data.id,
      code: data.code,
      name: data.name_en || data.name,
      name_ar: data.name_ar,
      description: data.description,
      description_ar: data.description_ar,
      price_monthly: data.price_monthly,
      price_yearly: data.price_yearly,
      currency: data.currency || 'USD',
      max_users: data.max_users,
      max_companies: data.max_companies,
      max_storage_gb: data.storage_gb,
      features: Array.isArray(data.features) ? data.features : [],
      modules: Array.isArray(data.included_modules) ? data.included_modules : [],
      is_active: data.is_active !== false,
      is_popular: data.is_popular || false,
      trial_days: data.trial_days || 14,
      sort_order: data.display_order || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Plan;
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
