/**
 * Chart Templates Service
 * Service layer for Chart of Accounts Templates
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

export interface ChartTemplate {
  id: string;
  tenant_id: string;
  template_code: string;
  template_name_ar: string;
  template_name_en?: string;
  chart_type: 'simple' | 'extended' | 'fabric_extended';
  include_demo_data: boolean;
  is_active: boolean;
  description_ar?: string;
  description_en?: string;
  created_at: string;
  updated_at: string;
}

export const chartTemplatesService = {
  /**
   * Get all available templates for current tenant
   */
  async getAll(): Promise<ChartTemplate[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('chart_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('template_code', { ascending: true });

    if (error) {
      console.error('Error fetching chart templates:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Apply a template to a company
   * Calls the PostgreSQL function apply_chart_template_to_company
   */
  async applyTemplate(companyId: string, templateCode: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Call the PostgreSQL function using RPC
    const { error } = await supabase.rpc('apply_chart_template_to_company', {
      p_company_id: companyId,
      p_template_code: templateCode,
    });

    if (error) {
      console.error('Error applying chart template:', error);
      throw new Error(error.message || 'Failed to apply chart template');
    }
  },

  /**
   * Setup templates for current tenant
   * Calls the PostgreSQL function setup_chart_templates_for_tenant
   */
  async setupTemplatesForTenant(): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { error } = await supabase.rpc('setup_chart_templates_for_tenant', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error setting up templates:', error);
      throw new Error(error.message || 'Failed to setup templates');
    }
  },
};

export default chartTemplatesService;
