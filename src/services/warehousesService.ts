/**
 * Warehouses Service
 * Service layer for Warehouses (المستودعات)
 */

import { supabase } from '@/lib/supabase';

export interface Warehouse {
  id: string;
  company_id: string;
  branch_id?: string;
  code: string;
  name: string;
  name_en?: string;
  warehouse_type: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateWarehouseInput {
  company_id: string;
  branch_id?: string;
  code: string;
  name: string;
  name_en?: string;
  warehouse_type?: string;
  address?: string;
}

export const warehousesService = {
  /**
   * Get all warehouses for a company
   */
  async getAll(companyId: string): Promise<Warehouse[]> {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', companyId)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching warehouses:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get warehouse by ID
   */
  async getById(id: string): Promise<Warehouse | null> {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching warehouse:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new warehouse
   */
  async create(input: CreateWarehouseInput): Promise<Warehouse> {
    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        ...input,
        warehouse_type: input.warehouse_type || 'regular',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating warehouse:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a warehouse
   */
  async update(id: string, updates: Partial<CreateWarehouseInput>): Promise<Warehouse> {
    const { data, error } = await supabase
      .from('warehouses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a warehouse (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('warehouses')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting warehouse:', error);
      throw error;
    }
  },
};

export default warehousesService;
