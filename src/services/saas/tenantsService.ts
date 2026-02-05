/**
 * Tenants Service
 * Service for managing tenants (subscribers) in the SaaS system
 */

import { supabase } from '@/lib/supabase';
import { getCurrentTenantIdAsync } from '@/lib/supabase';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  default_language?: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  settings?: Record<string, any>;
  agent_id?: string;
  referral_code?: string;
  referral_source?: string;
  tenant_referral_code?: string;
  referral_credits?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInput {
  name: string;
  owner_email: string;
  owner_name: string;
  product_code?: string;
  plan_code?: string;
  country?: string;
  timezone?: string;
  default_language?: string;
  agent_id?: string;
  referral_code?: string;
}

export interface UpdateTenantInput {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  default_language?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'expired';
  settings?: Record<string, any>;
}

class TenantsService {
  /**
   * Get all tenants
   */
  async getAll(): Promise<Tenant[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Get tenant by ID
   */
  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching tenant:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Create new tenant
   */
  async create(input: CreateTenantInput): Promise<Tenant> {
    // Call RPC function to create tenant
    const { data, error } = await supabase.rpc('create_tenant', {
      p_name: input.name,
      p_owner_email: input.owner_email,
      p_owner_name: input.owner_name,
      p_product_code: input.product_code || 'erpcore',
      p_plan_code: input.plan_code || 'professional',
      p_country: input.country || null,
      p_timezone: input.timezone || 'UTC',
      p_default_language: input.default_language || 'ar',
    });

    if (error) {
      console.error('Error creating tenant:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to create tenant');
    }

    // If agent_id is provided, link tenant to agent
    if (input.agent_id) {
      await supabase
        .from('tenants')
        .update({
          agent_id: input.agent_id,
          referral_code: input.referral_code,
          referral_source: 'agent',
        })
        .eq('id', data.tenant_id);
    }

    // Fetch the created tenant
    const tenant = await this.getById(data.tenant_id);
    if (!tenant) {
      throw new Error('Tenant created but could not be retrieved');
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tenant:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Suspend tenant
   */
  async suspend(id: string, reason?: string): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error suspending tenant:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Activate tenant
   */
  async activate(id: string): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error activating tenant:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get tenants by agent
   */
  async getByAgent(agentId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent tenants:', error);
      throw new Error(error.message);
    }

    return data || [];
  }
  /**
   * Delete tenant - Uses RPC function to handle all dependencies
   */
  async delete(id: string): Promise<boolean> {
    // 🛡️ استخدام دالة RPC الآمنة التي تحذف كل البيانات المرتبطة
    const { data, error } = await supabase.rpc('delete_tenant_complete', {
      p_tenant_id: id
    });

    if (error) {
      console.error('Error deleting tenant:', error);
      throw new Error(error.message);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'فشل في حذف المشترك');
    }

    return true;
  }
}

export const tenantsService = new TenantsService();
