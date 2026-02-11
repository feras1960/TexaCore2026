/**
 * Reservations Service
 * Service layer for Reservations (الحجوزات)
 * Handles reservations linked to chart of accounts for ledger display
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

// ========== TYPES ==========

export interface Reservation {
  id: string;
  tenant_id: string;
  company_id: string;
  branch_id?: string;

  reservation_number: string;
  reservation_date: string;

  reservation_type: 'general' | 'product' | 'service' | 'room' | 'equipment' | 'advance_payment';

  account_id?: string;

  party_type?: 'customer' | 'supplier' | 'employee' | 'other';
  party_id?: string;
  party_name?: string;
  customer_id?: string;

  contact_phone?: string;
  contact_email?: string;

  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;

  currency: string;
  exchange_rate: number;

  estimated_amount: number;
  deposit_amount: number;
  deposit_paid: number;
  final_amount: number;

  debit_amount: number;
  credit_amount: number;

  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

  invoice_id?: string;
  converted_to_invoice: boolean;
  converted_at?: string;

  journal_entry_id?: string;
  is_posted: boolean;

  description?: string;
  notes?: string;
  internal_notes?: string;

  metadata?: any;

  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationInput {
  company_id: string;
  branch_id?: string;
  reservation_number?: string;
  reservation_date?: string;
  reservation_type?: 'general' | 'product' | 'service' | 'room' | 'equipment' | 'advance_payment';
  account_id?: string;
  party_type?: string;
  party_id?: string;
  party_name?: string;
  customer_id?: string;
  contact_phone?: string;
  contact_email?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  currency?: string;
  estimated_amount?: number;
  deposit_amount?: number;
  deposit_paid?: number;
  debit_amount?: number;
  credit_amount?: number;
  description?: string;
  notes?: string;
}

export interface ReservationFilters {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  reservationType?: string;
  customerId?: string;
}

export interface ReservationStats {
  totalCount: number;
  activeCount: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalValue: number;
  totalDeposit: number;
  depositPaid: number;
}

// ========== HELPER FUNCTIONS ==========

const mapReservation = (record: any): Reservation => ({
  ...record,
  estimated_amount: record.estimated_amount ?? 0,
  deposit_amount: record.deposit_amount ?? 0,
  deposit_paid: record.deposit_paid ?? 0,
  final_amount: record.final_amount ?? 0,
  debit_amount: record.debit_amount ?? 0,
  credit_amount: record.credit_amount ?? 0,
  exchange_rate: record.exchange_rate ?? 1,
  is_posted: record.is_posted ?? false,
  converted_to_invoice: record.converted_to_invoice ?? false,
  status: record.status ?? 'pending',
  reservation_type: record.reservation_type ?? 'general',
  currency: record.currency ?? '',
  metadata: record.metadata ?? {},
});

// ========== SERVICE ==========

export const reservationsService = {
  /**
   * Get all reservations for a company with optional filters
   */
  async getAll(companyId: string, filters?: ReservationFilters): Promise<Reservation[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('reservations')
      .select('*')
      .eq('company_id', companyId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Apply filters
    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters?.dateFrom) {
      query = query.gte('reservation_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('reservation_date', filters.dateTo);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.reservationType && filters.reservationType !== 'all') {
      query = query.eq('reservation_type', filters.reservationType);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    const { data, error } = await query.order('reservation_date', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }

    return (data || []).map(mapReservation);
  },

  /**
   * Get reservations for a specific account (for ledger display)
   */
  async getByAccountId(accountId: string, companyId: string, filters?: Partial<ReservationFilters>): Promise<Reservation[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('reservations')
      .select('*')
      .eq('account_id', accountId)
      .eq('company_id', companyId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (filters?.dateFrom) {
      query = query.gte('reservation_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('reservation_date', filters.dateTo);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('reservation_date', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }

    return (data || []).map(mapReservation);
  },

  /**
   * Get reservation by ID
   */
  async getById(id: string): Promise<Reservation | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching reservation:', error);
      throw error;
    }

    return data ? mapReservation(data) : null;
  },

  /**
   * Get statistics for reservations of an account
   */
  async getStatsByAccountId(accountId: string, companyId: string): Promise<ReservationStats> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('reservations')
      .select('*')
      .eq('account_id', accountId)
      .eq('company_id', companyId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reservation stats:', error);
      return {
        totalCount: 0,
        activeCount: 0,
        pendingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        totalValue: 0,
        totalDeposit: 0,
        depositPaid: 0,
      };
    }

    const reservations = (data || []).map(mapReservation);

    return {
      totalCount: reservations.length,
      activeCount: reservations.filter(r => r.status === 'confirmed' || r.status === 'in_progress').length,
      pendingCount: reservations.filter(r => r.status === 'pending').length,
      completedCount: reservations.filter(r => r.status === 'completed').length,
      cancelledCount: reservations.filter(r => r.status === 'cancelled').length,
      totalValue: reservations.reduce((sum, r) => sum + r.estimated_amount, 0),
      totalDeposit: reservations.reduce((sum, r) => sum + r.deposit_amount, 0),
      depositPaid: reservations.reduce((sum, r) => sum + r.deposit_paid, 0),
    };
  },

  /**
   * Create a new reservation
   */
  async create(input: CreateReservationInput): Promise<Reservation> {
    let tenantId = await getCurrentTenantIdAsync();

    if (!tenantId) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('tenant_id')
        .eq('id', input.company_id)
        .single();

      tenantId = companyData?.tenant_id || null;
    }

    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Generate reservation number if not provided
    const reservationNumber = input.reservation_number || await this.generateReservationNumber(tenantId, input.company_id);

    const insertData = {
      tenant_id: tenantId,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      reservation_number: reservationNumber,
      reservation_date: input.reservation_date || new Date().toISOString().split('T')[0],
      reservation_type: input.reservation_type || 'general',
      account_id: input.account_id || null,
      party_type: input.party_type || 'customer',
      party_id: input.party_id || null,
      party_name: input.party_name || null,
      customer_id: input.customer_id || null,
      contact_phone: input.contact_phone || null,
      contact_email: input.contact_email || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      currency: input.currency || '',
      exchange_rate: 1,
      estimated_amount: input.estimated_amount || 0,
      deposit_amount: input.deposit_amount || 0,
      deposit_paid: input.deposit_paid || 0,
      final_amount: 0,
      debit_amount: input.debit_amount || 0,
      credit_amount: input.credit_amount || input.deposit_paid || 0,
      status: 'pending',
      converted_to_invoice: false,
      is_posted: false,
      description: input.description || null,
      notes: input.notes || null,
      metadata: {},
    };

    const { data, error } = await supabase
      .from('reservations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }

    return mapReservation(data);
  },

  /**
   * Update a reservation
   */
  async update(id: string, updates: Partial<CreateReservationInput>): Promise<Reservation> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Map updates
    if (updates.reservation_date) updateData.reservation_date = updates.reservation_date;
    if (updates.reservation_type) updateData.reservation_type = updates.reservation_type;
    if (updates.account_id !== undefined) updateData.account_id = updates.account_id;
    if (updates.party_type) updateData.party_type = updates.party_type;
    if (updates.party_id !== undefined) updateData.party_id = updates.party_id;
    if (updates.party_name !== undefined) updateData.party_name = updates.party_name;
    if (updates.customer_id !== undefined) updateData.customer_id = updates.customer_id;
    if (updates.contact_phone !== undefined) updateData.contact_phone = updates.contact_phone;
    if (updates.contact_email !== undefined) updateData.contact_email = updates.contact_email;
    if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
    if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
    if (updates.estimated_amount !== undefined) updateData.estimated_amount = updates.estimated_amount;
    if (updates.deposit_amount !== undefined) updateData.deposit_amount = updates.deposit_amount;
    if (updates.deposit_paid !== undefined) updateData.deposit_paid = updates.deposit_paid;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }

    return mapReservation(data);
  },

  /**
   * Update reservation status
   */
  async updateStatus(id: string, status: Reservation['status'], reason?: string): Promise<Reservation> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancel_reason = reason || null;
    }

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating reservation status:', error);
      throw error;
    }

    return mapReservation(data);
  },

  /**
   * Delete a reservation (only pending)
   */
  async delete(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Check if reservation is pending
    const reservation = await this.getById(id);
    if (reservation && reservation.status !== 'pending') {
      throw new Error('Cannot delete non-pending reservation');
    }

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting reservation:', error);
      throw error;
    }
  },

  /**
   * Generate reservation number
   */
  async generateReservationNumber(tenantId: string, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'RES';

    const { data } = await supabase
      .from('reservations')
      .select('reservation_number')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .like('reservation_number', `${prefix}-${year}-%`)
      .order('reservation_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].reservation_number;
      const match = lastNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
  },
};

export default reservationsService;
