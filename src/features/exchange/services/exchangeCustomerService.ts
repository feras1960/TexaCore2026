/**
 * ════════════════════════════════════════════════════════════════
 * 🏦 Exchange Customers Service
 * ════════════════════════════════════════════════════════════════
 * يعمل مع جدول `customers` الموجود — فلترة بالحساب أو التصنيف
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface ExchangeCustomer {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  name_tr?: string;
  name_ru?: string;
  name_uk?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  country?: string;
  city?: string;
  address?: string;
  currency?: string;
  status: string;
  receivable_account_id?: string;
  id_type?: string;
  id_number?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // computed
  name?: string;
  type?: string;
}

export const exchangeCustomerService = {
  async getAll(companyId: string): Promise<ExchangeCustomer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ExchangeCustomer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },
};
