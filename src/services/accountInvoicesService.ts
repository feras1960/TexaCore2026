/**
 * Account Invoices Service
 * Service layer for Account Invoices (فواتير الحسابات)
 * Handles invoices linked to chart of accounts for ledger display
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

// ========== TYPES ==========

export interface AccountInvoice {
  id: string;
  tenant_id: string;
  company_id: string;
  branch_id?: string;
  
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  
  invoice_type: 'receivable' | 'payable' | 'internal';
  
  account_id?: string;
  
  party_type?: 'customer' | 'supplier' | 'employee' | 'other';
  party_id?: string;
  party_name?: string;
  
  currency: string;
  exchange_rate: number;
  
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  
  debit_amount: number;
  credit_amount: number;
  
  status: 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  
  journal_entry_id?: string;
  is_posted: boolean;
  posted_at?: string;
  posted_by?: string;
  
  description?: string;
  notes?: string;
  internal_notes?: string;
  
  attachment_url?: string;
  
  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInvoiceInput {
  company_id: string;
  branch_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  invoice_type?: 'receivable' | 'payable' | 'internal';
  account_id?: string;
  party_type?: string;
  party_id?: string;
  party_name?: string;
  currency?: string;
  exchange_rate?: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  debit_amount?: number;
  credit_amount?: number;
  description?: string;
  notes?: string;
}

export interface AccountInvoiceFilters {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  invoiceType?: string;
  partyType?: string;
  partyId?: string;
}

export interface AccountInvoiceStats {
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

// ========== HELPER FUNCTIONS ==========

const mapInvoice = (record: any): AccountInvoice => ({
  ...record,
  subtotal: record.subtotal ?? 0,
  discount_amount: record.discount_amount ?? 0,
  tax_amount: record.tax_amount ?? 0,
  total_amount: record.total_amount ?? 0,
  paid_amount: record.paid_amount ?? 0,
  debit_amount: record.debit_amount ?? 0,
  credit_amount: record.credit_amount ?? 0,
  exchange_rate: record.exchange_rate ?? 1,
  is_posted: record.is_posted ?? false,
  status: record.status ?? 'draft',
  payment_status: record.payment_status ?? 'unpaid',
  currency: record.currency ?? 'USD',
});

// ========== SERVICE ==========

export const accountInvoicesService = {
  /**
   * Get all invoices for a company with optional filters
   */
  async getAll(companyId: string, filters?: AccountInvoiceFilters): Promise<AccountInvoice[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('account_invoices')
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
      query = query.gte('invoice_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('invoice_date', filters.dateTo);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.invoiceType && filters.invoiceType !== 'all') {
      query = query.eq('invoice_type', filters.invoiceType);
    }
    if (filters?.partyType) {
      query = query.eq('party_type', filters.partyType);
    }
    if (filters?.partyId) {
      query = query.eq('party_id', filters.partyId);
    }

    const { data, error } = await query.order('invoice_date', { ascending: false });

    if (error) {
      console.error('Error fetching account invoices:', error);
      throw error;
    }

    return (data || []).map(mapInvoice);
  },

  /**
   * Get invoices for a specific account (for ledger display)
   */
  async getByAccountId(accountId: string, companyId: string, filters?: Partial<AccountInvoiceFilters>): Promise<AccountInvoice[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('account_invoices')
      .select('*')
      .eq('account_id', accountId)
      .eq('company_id', companyId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (filters?.dateFrom) {
      query = query.gte('invoice_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('invoice_date', filters.dateTo);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('invoice_date', { ascending: false });

    if (error) {
      console.error('Error fetching account invoices:', error);
      throw error;
    }

    return (data || []).map(mapInvoice);
  },

  /**
   * Get invoice by ID
   */
  async getById(id: string): Promise<AccountInvoice | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('account_invoices')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching invoice:', error);
      throw error;
    }

    return data ? mapInvoice(data) : null;
  },

  /**
   * Get statistics for invoices of an account
   */
  async getStatsByAccountId(accountId: string, companyId: string): Promise<AccountInvoiceStats> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('account_invoices')
      .select('*')
      .eq('account_id', accountId)
      .eq('company_id', companyId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoice stats:', error);
      return {
        totalCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
      };
    }

    const invoices = (data || []).map(mapInvoice);
    const today = new Date().toISOString().split('T')[0];

    const overdueInvoices = invoices.filter(
      inv => inv.due_date && inv.due_date < today && inv.payment_status !== 'paid'
    );

    return {
      totalCount: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
      paidAmount: invoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
      remainingAmount: invoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0),
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0),
    };
  },

  /**
   * Create a new invoice
   */
  async create(input: CreateAccountInvoiceInput): Promise<AccountInvoice> {
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

    // Generate invoice number if not provided
    const invoiceNumber = input.invoice_number || await this.generateInvoiceNumber(tenantId, input.company_id);

    const insertData = {
      tenant_id: tenantId,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      invoice_number: invoiceNumber,
      invoice_date: input.invoice_date || new Date().toISOString().split('T')[0],
      due_date: input.due_date || null,
      invoice_type: input.invoice_type || 'receivable',
      account_id: input.account_id || null,
      party_type: input.party_type || null,
      party_id: input.party_id || null,
      party_name: input.party_name || null,
      currency: input.currency || 'USD',
      exchange_rate: input.exchange_rate || 1,
      subtotal: input.subtotal || input.total_amount,
      discount_amount: input.discount_amount || 0,
      tax_amount: input.tax_amount || 0,
      total_amount: input.total_amount,
      paid_amount: 0,
      debit_amount: input.debit_amount || (input.invoice_type === 'receivable' ? input.total_amount : 0),
      credit_amount: input.credit_amount || (input.invoice_type === 'payable' ? input.total_amount : 0),
      status: 'draft',
      payment_status: 'unpaid',
      is_posted: false,
      description: input.description || null,
      notes: input.notes || null,
    };

    const { data, error } = await supabase
      .from('account_invoices')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }

    return mapInvoice(data);
  },

  /**
   * Update an invoice
   */
  async update(id: string, updates: Partial<CreateAccountInvoiceInput>): Promise<AccountInvoice> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Map updates
    if (updates.invoice_date) updateData.invoice_date = updates.invoice_date;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.account_id !== undefined) updateData.account_id = updates.account_id;
    if (updates.party_type) updateData.party_type = updates.party_type;
    if (updates.party_id !== undefined) updateData.party_id = updates.party_id;
    if (updates.party_name !== undefined) updateData.party_name = updates.party_name;
    if (updates.total_amount !== undefined) updateData.total_amount = updates.total_amount;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('account_invoices')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }

    return mapInvoice(data);
  },

  /**
   * Delete an invoice (only drafts)
   */
  async delete(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Check if invoice is draft
    const invoice = await this.getById(id);
    if (invoice && invoice.status !== 'draft') {
      throw new Error('Cannot delete non-draft invoice');
    }

    const { error } = await supabase
      .from('account_invoices')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },

  /**
   * Generate invoice number
   */
  async generateInvoiceNumber(tenantId: string, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'INV';

    const { data } = await supabase
      .from('account_invoices')
      .select('invoice_number')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .like('invoice_number', `${prefix}-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].invoice_number;
      const match = lastNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
  },
};

export default accountInvoicesService;
