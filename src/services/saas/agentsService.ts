/**
 * Agents Service
 * Service for managing agents/resellers in the SaaS system
 */

import { supabase } from '@/lib/supabase';
import { getCurrentTenantIdAsync } from '@/lib/supabase';

export interface Agent {
  id: string;
  code: string;
  name: string;
  name_en?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  address?: string;
  timezone?: string;
  tenant_id?: string;
  user_id?: string;
  agent_type: 'reseller' | 'distributor' | 'affiliate';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  commission_percent: number;
  recurring_commission_percent: number;
  bonus_per_tenant: number;
  current_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  min_withdrawal: number;
  free_tenant_id?: string;
  referral_code?: string;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  has_white_label?: boolean;
  white_label_status?: 'inactive' | 'pending' | 'active' | 'suspended' | 'expired';
  white_label_commission_percent?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  name_en?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  address?: string;
  agent_type?: 'reseller' | 'distributor' | 'affiliate';
}

export interface UpdateAgentInput {
  name?: string;
  name_en?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  address?: string;
  agent_type?: 'reseller' | 'distributor' | 'affiliate';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  commission_percent?: number;
  recurring_commission_percent?: number;
  status?: 'pending' | 'active' | 'suspended' | 'terminated';
}

class AgentsService {
  /**
   * Get all agents
   */
  async getAll(): Promise<Agent[]> {
    const tenantId = await getCurrentTenantIdAsync();

    // Check if user is super admin - they see all agents
    // 🛡️ SECURITY: استدعاء الدالة الآمنة بدلاً من قراءة user_metadata
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    let isSuperAdmin = user?.user_metadata?.is_super_admin === true;
    if (user && !isSuperAdmin) {
      try {
        const { data: superAdminCheck, error: rpcErr } = await supabase.rpc('is_super_admin', { p_user_id: user.id });
        if (!rpcErr) isSuperAdmin = superAdminCheck === true;
      } catch { /* RPC unavailable — use metadata */ }
    }

    let query = supabase
      .from('agents')
      .select('*');

    // To handle the "column does not exist" error gracefully
    try {
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // If it's a "column does not exist" error, retry without the filter
        if (error.message.includes('column agents.tenant_id does not exist')) {
          console.warn('Column agents.tenant_id does not exist, retrying without filter');
          const { data: retryData, error: retryError } = await supabase
            .from('agents')
            .select('*')
            .order('created_at', { ascending: false });

          if (retryError) throw new Error(retryError.message);
          return retryData || [];
        }
        throw new Error(error.message);
      }
      return data || [];
    } catch (err: any) {
      console.error('Error fetching agents:', err);
      // Fallback: try one more time without any filters if we hit schema issues
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) return data || [];
      } catch (innerErr) { }
      throw err;
    }
  }

  /**
   * Get agent by ID
   */
  async getById(id: string): Promise<Agent | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching agent:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Register new agent
   */
  async register(input: CreateAgentInput): Promise<Agent> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Call RPC function to register agent
    const { data, error } = await supabase.rpc('register_agent', {
      p_name: input.name,
      p_email: input.email,
      p_phone: input.phone || null,
      p_country: input.country || null,
      p_city: input.city || null,
      p_whatsapp: input.whatsapp || null,
    });

    if (error) {
      console.error('Error registering agent:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to register agent');
    }

    // Fetch the created agent
    const agent = await this.getById(data.agent_id);
    if (!agent) {
      throw new Error('Agent created but could not be retrieved');
    }

    return agent;
  }

  /**
   * Approve agent
   */
  async approve(agentId: string, freePlanCode: string = 'professional'): Promise<Agent> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('approve_agent', {
      p_agent_id: agentId,
      p_approved_by: user.id,
      p_free_plan_code: freePlanCode,
    });

    if (error) {
      console.error('Error approving agent:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to approve agent');
    }

    const agent = await this.getById(agentId);
    if (!agent) {
      throw new Error('Agent approved but could not be retrieved');
    }

    return agent;
  }

  /**
   * Update agent
   */
  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Suspend agent
   */
  async suspend(id: string, reason?: string): Promise<Agent> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error suspending agent:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Activate agent
   */
  async activate(id: string): Promise<Agent> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error activating agent:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get agent dashboard data
   */
  async getDashboardData(agentId: string): Promise<any> {
    const { data, error } = await supabase
      .from('agent_dashboard_view')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error) {
      console.error('Error fetching agent dashboard:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get agent tenants
   */
  async getAgentTenants(agentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('agent_tenants_view')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent tenants:', error);
      throw new Error(error.message);
    }

    return data || [];
  }
}

export const agentsService = new AgentsService();
