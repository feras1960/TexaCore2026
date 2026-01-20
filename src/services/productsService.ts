/**
 * Products Service
 * Service layer for Products (المنتجات)
 */

import { supabase } from '@/lib/supabase';

export interface Product {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  name_en?: string;
  category_id?: string;
  product_type: string;
  base_uom: string;
  cost_price: number;
  selling_price: number;
  currency_code: string;
  track_serial: boolean;
  track_batch: boolean;
  track_expiry: boolean;
  is_fabric: boolean;
  fabric_width?: number;
  fabric_weight_per_meter?: number;
  is_gold: boolean;
  gold_karat?: number;
  gold_weight_grams?: number;
  making_charge_type?: string;
  making_charge?: number;
  attributes: Record<string, any>;
  income_account_id?: string;
  expense_account_id?: string;
  inventory_account_id?: string;
  reorder_level: number;
  minimum_stock: number;
  maximum_stock?: number;
  is_active: boolean;
  is_sellable: boolean;
  is_purchasable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  company_id: string;
  sku: string;
  name: string;
  name_en?: string;
  category_id?: string;
  product_type?: string;
  base_uom?: string;
  cost_price?: number;
  selling_price?: number;
  currency_code?: string;
  // ... other optional fields
}

export const productsService = {
  /**
   * Get all products for a company
   */
  async getAll(companyId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .order('sku', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get products by type
   */
  async getByType(companyId: string, productType: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('product_type', productType)
      .order('sku', { ascending: true });

    if (error) {
      console.error('Error fetching products by type:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Create a new product
   */
  async create(input: CreateProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        product_type: input.product_type || 'standard',
        base_uom: input.base_uom || 'PCS',
        cost_price: input.cost_price || 0,
        selling_price: input.selling_price || 0,
        currency_code: input.currency_code || 'SAR',
        track_serial: false,
        track_batch: false,
        track_expiry: false,
        is_fabric: false,
        is_gold: false,
        attributes: {},
        reorder_level: 0,
        minimum_stock: 0,
        is_active: true,
        is_sellable: true,
        is_purchasable: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a product
   */
  async update(id: string, updates: Partial<CreateProductInput>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a product (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },
};

export default productsService;
