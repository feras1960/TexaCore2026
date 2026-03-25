import { supabase } from '@/lib/supabase';
import { Remittance, RemittanceTracking } from '../types';

export const remittanceService = {
  // ─── Query ────────────────────────────────────────────────────
  async getRemittances(companyId: string): Promise<Remittance[]> {
    const { data, error } = await supabase
      .from('remittances')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Remittance[];
  },

  async getRemittance(id: string): Promise<Remittance> {
    const { data, error } = await supabase
      .from('remittances')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Remittance;
  },

  async getTrackingTimeline(remittanceId: string): Promise<RemittanceTracking[]> {
    const { data, error } = await supabase
      .from('remittance_tracking')
      .select('*')
      .eq('remittance_id', remittanceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as RemittanceTracking[];
  },

  // ─── Create & Update ──────────────────────────────────────────
  async createRemittance(remittanceData: Partial<Remittance>): Promise<Remittance> {
    const { data, error } = await supabase
      .from('remittances')
      .insert([remittanceData])
      .select()
      .single();

    if (error) throw error;

    // Create initial tracking point
    await this.addTrackingPoint(data.id, data.status, 'إصدار مسودة الحوالة');

    return data as Remittance;
  },

  async updateRemittance(id: string, updates: Partial<Remittance>): Promise<Remittance> {
    const { data, error } = await supabase
      .from('remittances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Remittance;
  },

  // ─── Status Lifecycle ─────────────────────────────────────────
  async changeStatus(
    remittanceId: string, 
    newStatus: Remittance['status'], 
    notes?: string, 
    location?: string
  ): Promise<void> {
    // Map status → timestamp field (only fields that exist in DB schema)
    const timestampMap: Record<string, string> = {
      pending: 'confirmed_at',
      delivered: 'delivered_at',
    };
    const tsField = timestampMap[newStatus as string];
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (tsField) updateData[tsField] = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('remittances')
      .update(updateData)
      .eq('id', remittanceId);

    if (updateError) throw updateError;

    // Add history point
    await this.addTrackingPoint(remittanceId, newStatus, notes, location);
  },

  async addTrackingPoint(
    remittanceId: string, 
    status: string, 
    notes?: string, 
    location?: string
  ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('remittance_tracking')
      .insert([{
        remittance_id: remittanceId,
        status,
        notes,
        location,
        updated_by: userData?.user?.id,
      }]);

    if (error) throw error;
  }
};
