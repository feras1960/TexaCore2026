/**
 * ════════════════════════════════════════════════════════════════
 * 📱 customerPhoneService — إدارة أرقام هواتف العملاء
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface CustomerPhone {
  id: string;
  customer_id: string;
  phone_number: string;
  country?: string;
  city?: string;
  label?: string;
  last_used_at?: string;
}

export const customerPhoneService = {
  /**
   * Get all phones for a customer, sorted by last used
   */
  async getPhones(customerId: string): Promise<CustomerPhone[]> {
    const { data, error } = await supabase
      .from('customer_phones')
      .select('*')
      .eq('customer_id', customerId)
      .order('last_used_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Upsert a phone — creates if new, updates last_used_at if exists
   */
  async upsertPhone(customerId: string, phoneNumber: string, country?: string, city?: string): Promise<void> {
    if (!phoneNumber?.trim()) return;
    const phone = phoneNumber.trim();

    const { data: existing } = await supabase
      .from('customer_phones')
      .select('id')
      .eq('customer_id', customerId)
      .eq('phone_number', phone)
      .maybeSingle();

    if (existing) {
      // Update last_used_at + country/city
      await supabase
        .from('customer_phones')
        .update({
          last_used_at: new Date().toISOString(),
          ...(country && { country }),
          ...(city && { city }),
        })
        .eq('id', existing.id);
    } else {
      // Get tenant_id from customer record
      const { data: cust } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', customerId)
        .single();
      
      // Insert new
      await supabase
        .from('customer_phones')
        .insert({
          customer_id: customerId,
          phone_number: phone,
          country: country || null,
          city: city || null,
          label: 'primary',
          last_used_at: new Date().toISOString(),
          tenant_id: cust?.tenant_id,
        });
    }
  },
};
