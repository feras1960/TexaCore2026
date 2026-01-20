/**
 * Payments Service
 * Service for managing payments and invoices in the SaaS system
 */

import { supabase } from '@/lib/supabase';

export interface Payment {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  payment_method: 'bank_transfer' | 'credit_card' | 'cash' | 'online' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_date?: string;
  due_date?: string;
  description?: string;
  reference?: string;
  agent_id?: string;
  agent_name?: string;
  commission_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  invoice_number: string;
  subscription_id?: string;
  plan_name?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  tenant_id: string;
  invoice_number?: string;
  amount: number;
  currency?: string;
  payment_method: 'bank_transfer' | 'credit_card' | 'cash' | 'online' | 'other';
  payment_date?: string;
  description?: string;
  reference?: string;
  notes?: string;
}

// Note: Real data is fetched from Supabase tables
// saas_payments and saas_invoices

class PaymentsService {
  /**
   * Get all payments from database
   */
  async getAll(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('saas_payments table does not exist');
          return [];
        }
        throw error;
      }

      // Map tenant name from join
      return (data || []).map(p => ({
        ...p,
        tenant_name: p.tenants?.name || p.tenant_name
      }));
    } catch (err) {
      console.error('Error fetching payments:', err);
      return [];
    }
  }

  /**
   * Get payments by tenant
   */
  async getByTenant(tenantId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching tenant payments:', err);
      return [];
    }
  }

  /**
   * Get payment by ID
   */
  async getById(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('saas_payments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error fetching payment:', err);
      return null;
    }
  }

  /**
   * Create new payment
   */
  async create(input: CreatePaymentInput): Promise<Payment> {
    const { data, error } = await supabase
      .from('saas_payments')
      .insert({
        ...input,
        currency: input.currency || 'SAR',
        status: 'pending',
        invoice_number: input.invoice_number || `PAY-${Date.now()}`,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Mark payment as completed
   */
  async markCompleted(id: string, reference?: string): Promise<Payment> {
    const { data, error } = await supabase
      .from('saas_payments')
      .update({
        status: 'completed',
        payment_date: new Date().toISOString(),
        reference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking payment completed:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Mark payment as failed
   */
  async markFailed(id: string, notes?: string): Promise<Payment> {
    const { data, error } = await supabase
      .from('saas_payments')
      .update({
        status: 'failed',
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking payment failed:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get all invoices from database
   */
  async getAllInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('saas_invoices')
        .select('*, tenants(name), tenant_subscriptions(plan_code)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('saas_invoices table does not exist');
          return [];
        }
        throw error;
      }

      // Map tenant name and plan from joins
      return (data || []).map(inv => ({
        ...inv,
        tenant_name: inv.tenants?.name || inv.tenant_name,
        plan_name: inv.tenant_subscriptions?.plan_code || inv.plan_name,
      }));
    } catch (err) {
      console.error('Error fetching invoices:', err);
      return [];
    }
  }

  /**
   * Get payment statistics
   */
  async getStats(): Promise<{
    totalRevenue: number;
    pendingAmount: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
  }> {
    const payments = await this.getAll();
    
    return {
      totalRevenue: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0),
      completedCount: payments.filter(p => p.status === 'completed').length,
      pendingCount: payments.filter(p => p.status === 'pending').length,
      failedCount: payments.filter(p => p.status === 'failed').length,
    };
  }
}

export const paymentsService = new PaymentsService();
