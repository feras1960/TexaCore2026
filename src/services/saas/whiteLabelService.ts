/**
 * White Label Service
 * Service for managing White Label features for agents
 */

import { supabase } from '@/lib/supabase';
import { getCurrentTenantIdAsync } from '@/lib/supabase';

export interface WhiteLabelDomain {
  id: string;
  agent_id: string;
  domain: string;
  domain_type: 'subdomain' | 'custom';
  ssl_enabled: boolean;
  dns_configured: boolean;
  status: 'pending' | 'active' | 'inactive' | 'failed';
  verified: boolean;
  verified_at?: string;
  verification_token?: string;
  created_at: string;
  updated_at: string;
}

export interface WhiteLabelConfig {
  id: string;
  agent_id: string;
  brand_name?: string;
  brand_name_en?: string;
  brand_slogan_ar?: string;
  brand_slogan_en?: string;
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  contact_email?: string;
  contact_phone?: string;
  support_email?: string;
  website_url?: string;
  custom_css?: string;
  custom_js?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhiteLabelPayment {
  id: string;
  agent_id: string;
  amount: number;
  currency: string;
  payment_type: 'one_time' | 'annual' | 'monthly';
  period_months: number;
  valid_from?: string;
  valid_to?: string;
  payment_method?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_reference?: string;
  transaction_id?: string;
  created_at: string;
}

export interface RegisterWhiteLabelPaymentInput {
  agent_id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  period_months?: number;
}

export interface AddWhiteLabelDomainInput {
  agent_id: string;
  domain: string;
  domain_type?: 'subdomain' | 'custom';
}

class WhiteLabelService {
  /**
   * Register White Label payment
   */
  async registerPayment(input: RegisterWhiteLabelPaymentInput): Promise<WhiteLabelPayment> {
    const { data, error } = await supabase.rpc('register_white_label_payment', {
      p_agent_id: input.agent_id,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_payment_reference: input.payment_reference,
      p_period_months: input.period_months || 12,
    });

    if (error) {
      console.error('Error registering White Label payment:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to register payment');
    }

    // Fetch the created payment
    const { data: payment, error: fetchError } = await supabase
      .from('white_label_payments')
      .select('*')
      .eq('id', data.payment_id)
      .single();

    if (fetchError || !payment) {
      throw new Error('Payment registered but could not be retrieved');
    }

    return payment;
  }

  /**
   * Activate White Label after payment
   */
  async activate(agentId: string, paymentId: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('activate_white_label', {
      p_agent_id: agentId,
      p_payment_id: paymentId,
      p_approved_by: user.id,
    });

    if (error) {
      console.error('Error activating White Label:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to activate White Label');
    }

    return data;
  }

  /**
   * Add White Label domain
   */
  async addDomain(input: AddWhiteLabelDomainInput): Promise<WhiteLabelDomain> {
    const { data, error } = await supabase.rpc('add_white_label_domain', {
      p_agent_id: input.agent_id,
      p_domain: input.domain,
      p_domain_type: input.domain_type || 'subdomain',
    });

    if (error) {
      console.error('Error adding White Label domain:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to add domain');
    }

    // Fetch the created domain
    const { data: domain, error: fetchError } = await supabase
      .from('white_label_domains')
      .select('*')
      .eq('id', data.domain_id)
      .single();

    if (fetchError || !domain) {
      throw new Error('Domain added but could not be retrieved');
    }

    return domain;
  }

  /**
   * Verify White Label domain
   */
  async verifyDomain(domainId: string): Promise<any> {
    const { data, error } = await supabase.rpc('verify_white_label_domain', {
      p_domain_id: domainId,
    });

    if (error) {
      console.error('Error verifying domain:', error);
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to verify domain');
    }

    return data;
  }

  /**
   * Check White Label validity
   */
  async checkValidity(agentId: string): Promise<any> {
    const { data, error } = await supabase.rpc('check_white_label_validity', {
      p_agent_id: agentId,
    });

    if (error) {
      console.error('Error checking White Label validity:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get White Label domains for agent
   */
  async getDomains(agentId: string): Promise<WhiteLabelDomain[]> {
    const { data, error } = await supabase
      .from('white_label_domains')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching domains:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Get White Label config for agent
   */
  async getConfig(agentId: string): Promise<WhiteLabelConfig | null> {
    const { data, error } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching config:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Update White Label config
   */
  async updateConfig(agentId: string, config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
    // Check if config exists
    const existing = await this.getConfig(agentId);

    if (existing) {
      // Update existing config
      const { data, error } = await supabase
        .from('white_label_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating config:', error);
        throw new Error(error.message);
      }

      return data;
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('white_label_configs')
        .insert({
          agent_id: agentId,
          ...config,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating config:', error);
        throw new Error(error.message);
      }

      return data;
    }
  }

  /**
   * Get White Label payments for agent
   */
  async getPayments(agentId: string): Promise<WhiteLabelPayment[]> {
    const { data, error } = await supabase
      .from('white_label_payments')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Get White Label summary
   */
  async getSummary(agentId: string): Promise<any> {
    const { data, error } = await supabase
      .from('white_label_summary_view')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      console.error('Error fetching summary:', error);
      throw new Error(error.message);
    }

    return data;
  }
}

export const whiteLabelService = new WhiteLabelService();
