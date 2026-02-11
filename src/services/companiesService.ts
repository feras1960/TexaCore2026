/**
 * Companies Service
 * Service layer for Companies
 */

import { supabase } from '@/lib/supabase';

export interface Company {
  id: string;
  tenant_id?: string;
  code: string;
  name: string;
  name_en?: string;
  logo_url?: string;
  tax_number?: string;
  commercial_register?: string;
  country_code: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  default_currency: string;
  fiscal_year_start_month: number;
  tax_system: string;
  vat_rate: number;
  enable_zatca?: boolean;
  zatca_settings?: any;
  enable_zakat?: boolean;
  zakat_calculation_method?: string;
  zakat_rate?: number;
  inventory_valuation_method: string;
  chart_type?: string; // نوع شجرة الحسابات: simple, extended, fabric_extended
  status?: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}

export const companiesService = {
  /**
   * Get all companies (Super Admin)
   */
  async getAll(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get all companies with Tenant info (Super Admin)
   */
  async getAllWithTenant(): Promise<any[]> {
    // We explicitly cast the result because the types usually don't have the joined table
    const { data, error } = await supabase
      .from('companies')
      .select('*, tenant:tenants(id, name, code, status)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching companies with tenant:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get companies by Tenant ID
   */
  async getByTenantId(tenantId: string): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*, tenants(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Suspend a company
   */
  async suspend(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Activate a company
   */
  async activate(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete a company
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get company by ID
   */
  async getById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching company:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get first company (for development/testing)
   */
  async getFirst(): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to handle empty result

    if (error) {
      // If no company exists, return null instead of throwing
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return null;
      }
      console.error('Error fetching first company:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update an existing company
   */
  async update(id: string, updates: Partial<Company>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating company:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new company
   */
  async create(company: Partial<Company>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single();

    if (error) {
      console.error('Error creating company:', error);
      throw error;
    }

    return data;
  },
};

export default companiesService;
