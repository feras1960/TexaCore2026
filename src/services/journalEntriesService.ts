/**
 * Journal Entries Service
 * Service layer for Journal Entries (القيود اليومية)
 */

import { supabase, getCurrentTenantIdAsync, getCurrentCompanyId } from '@/lib/supabase';

export interface JournalEntry {
  id: string;
  tenant_id: string;
  company_id: string;
  branch_id?: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'cancelled';
  is_posted: boolean;
  posted_at?: string;
  posted_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  tenant_id: string;
  entry_id: string;
  line_number: number;
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: string;
  created_at: string;
}

export interface CreateJournalEntryInput {
  company_id: string;
  branch_id?: string;
  entry_date: string;
  description: string;
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
  }[];
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
}

export const journalEntriesService = {
  /**
   * Get all journal entries for a company
   */
  async getAll(
    companyId: string,
    filters?: {
      status?: 'draft' | 'posted' | 'cancelled';
      fromDate?: string;
      toDate?: string;
      search?: string;
    }
  ): Promise<JournalEntry[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.fromDate) {
      query = query.gte('entry_date', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.lte('entry_date', filters.toDate);
    }

    if (filters?.search) {
      query = query.or(
        `entry_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching journal entries:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get journal entry by ID with lines
   */
  async getById(id: string): Promise<JournalEntryWithLines | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Get entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (entryError) {
      console.error('Error fetching journal entry:', entryError);
      throw entryError;
    }

    if (!entry) {
      return null;
    }

    // Get lines
    const { data: lines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select('*')
      .eq('entry_id', id)
      .eq('tenant_id', tenantId)
      .order('line_number', { ascending: true });

    if (linesError) {
      console.error('Error fetching journal entry lines:', linesError);
      throw linesError;
    }

    return {
      ...entry,
      lines: lines || [],
    };
  },

  /**
   * Create a new journal entry with lines
   */
  async create(input: CreateJournalEntryInput): Promise<JournalEntryWithLines> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Calculate totals
    const totalDebit = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    // Validate balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('القيد غير متوازن! يجب أن يكون إجمالي المدين يساوي إجمالي الدائن');
    }

    // Generate entry number
    const entryNumber = await supabase.rpc('generate_sequence_number', {
      p_tenant_id: tenantId,
      p_company_id: input.company_id,
      p_sequence_type: 'journal_entry',
    });

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        company_id: input.company_id,
        branch_id: input.branch_id || null,
        entry_number: entryNumber.data || `JE-${Date.now()}`,
        entry_date: input.entry_date,
        description: input.description,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft',
        is_posted: false,
      })
      .select()
      .single();

    if (entryError) {
      console.error('Error creating journal entry:', entryError);
      throw entryError;
    }

    // Create lines
    const linesData = input.lines.map((line, index) => ({
      tenant_id: tenantId,
      entry_id: entry.id,
      line_number: index + 1,
      account_id: line.account_id,
      debit: line.debit || 0,
      credit: line.credit || 0,
      description: line.description || null,
      cost_center_id: line.cost_center_id || null,
    }));

    const { data: lines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(linesData)
      .select();

    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
      // Try to delete the entry if lines creation fails
      await supabase.from('journal_entries').delete().eq('id', entry.id);
      throw linesError;
    }

    return {
      ...entry,
      lines: lines || [],
    };
  },

  /**
   * Post a journal entry (ترحيل القيد)
   */
  async post(entryId: string, userId: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { error } = await supabase.rpc('post_journal_entry', {
      p_entry_id: entryId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error posting journal entry:', error);
      throw error;
    }
  },

  /**
   * Update journal entry
   */
  async update(
    id: string,
    updates: Partial<CreateJournalEntryInput>
  ): Promise<JournalEntryWithLines> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // If lines are being updated, recalculate totals
    if (updates.lines) {
      const totalDebit = updates.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = updates.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('القيد غير متوازن!');
      }

      // Update entry totals
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({
          total_debit: totalDebit,
          total_credit: totalCredit,
          description: updates.description,
          entry_date: updates.entry_date,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw updateError;
      }

      // Delete old lines
      await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('entry_id', id)
        .eq('tenant_id', tenantId);

      // Insert new lines
      const linesData = updates.lines.map((line, index) => ({
        tenant_id: tenantId,
        entry_id: id,
        line_number: index + 1,
        account_id: line.account_id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || null,
        cost_center_id: line.cost_center_id || null,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesData);

      if (linesError) {
        throw linesError;
      }
    } else {
      // Update entry only
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw updateError;
      }
    }

    // Return updated entry with lines
    return this.getById(id) as Promise<JournalEntryWithLines>;
  },

  /**
   * Delete journal entry (only if draft)
   */
  async delete(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Check if entry is posted
    const { data: entry } = await supabase
      .from('journal_entries')
      .select('is_posted, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (entry?.is_posted || entry?.status === 'posted') {
      throw new Error('لا يمكن حذف قيد مرحّل. يجب إلغاء الترحيل أولاً');
    }

    // Delete lines first
    await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('entry_id', id)
      .eq('tenant_id', tenantId);

    // Delete entry
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw error;
    }
  },
};

export default journalEntriesService;
