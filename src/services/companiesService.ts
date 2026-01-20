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
  created_at: string;
  updated_at: string;
}

export const companiesService = {
  /**
   * Get all companies
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
