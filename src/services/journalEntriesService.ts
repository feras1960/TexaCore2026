/**
 * Journal Entries Service
 * Service layer for Journal Entries (القيود اليومية)
 */

import { supabase, getCurrentTenantIdAsync, getCurrentCompanyId } from '@/lib/supabase';
import { activityLogService } from './activityLogService';

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
  party_type?: string | null;   // 'supplier' | 'customer'
  party_id?: string | null;     // UUID of supplier or customer
  created_at: string;
}

export interface CreateJournalEntryInput {
  company_id: string;
  branch_id?: string;
  entry_type?: string;
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
    party_type?: string | null;   // 'supplier' | 'customer'
    party_id?: string | null;     // UUID of supplier or customer
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

    // Get lines with account details
    const { data: lines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select(`
        *,
        account:chart_of_accounts(id, account_code, name_ar, name_en)
      `)
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

    // Generate entry number — use timestamp-based unique ID
    // (RPC generate_sequence_number may return colliding numbers)
    const entryNumber = `JE-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        company_id: input.company_id,
        branch_id: input.branch_id || null,
        entry_number: entryNumber,
        entry_date: input.entry_date,
        entry_type: input.entry_type || 'manual',
        description: input.description,
        reference_type: input.reference_type || null,
        reference_id: input.reference_id || null,
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

    if (!entry) {
      throw new Error('Failed to create journal entry after multiple attempts');
    }

    // ═══ Sub-Ledger Validation ═══
    // Warn if party_type is set without party_id (helps catch missing supplier/customer tracking)
    for (const line of input.lines) {
      if (line.party_type && !line.party_id) {
        console.warn(
          `⚠️ [Sub-Ledger] Line has party_type="${line.party_type}" but no party_id!`,
          `Entry: "${input.description}", Account: ${line.account_id}`,
          'This means the transaction won\'t appear in the party\'s balance.'
        );
      }
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
      party_type: line.party_type || null,
      party_id: line.party_id || null,
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

    // 📜 Activity Log: تسجيل الإنشاء
    activityLogService.logEvent({
      table: 'journal_entries',
      documentId: entry.id,
      event: 'created',
      userId: 'system',
      userName: 'النظام',
      details: { entry_number: entryNumber, total: totalDebit },
    });

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

    // 📜 Activity Log: تسجيل الترحيل
    activityLogService.logEvent({
      table: 'journal_entries',
      documentId: entryId,
      event: 'posted',
      userId,
      userName: '',
    });
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

    // حماية: القيود المولّدة من الكونتينر لا يُسمح بتعديلها من هنا
    const { data: entryCheck } = await supabase
      .from('journal_entries')
      .select('reference_type')
      .eq('id', id)
      .single();
    if (entryCheck?.reference_type === 'container') {
      throw new Error('هذا القيد مولّد تلقائياً من الكونتينر — التعديل متاح فقط من صفحة الكونتينر');
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
          entry_type: updates.entry_type,
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
        party_type: line.party_type || null,
        party_id: line.party_id || null,
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



  // Unpost entry (return to draft)
  async unpost(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    // حماية: القيود المرتبطة بمستندات أخرى
    const { data: entryCheck } = await supabase
      .from('journal_entries')
      .select('reference_type, entry_type')
      .eq('id', id)
      .single();

    const protectedRefs = ['container', 'purchase_invoice', 'sales_invoice', 'goods_receipt'];
    const protectedTypes = ['container_expense', 'container_expense_reversal', 'auto', 'provisional'];
    if (protectedRefs.includes(entryCheck?.reference_type) || protectedTypes.includes(entryCheck?.entry_type)) {
      throw new Error('هذا القيد مرتبط بمستند آخر — التعديل متاح فقط من المصدر الأصلي');
    }

    const { error } = await supabase
      .from('journal_entries')
      .update({ status: 'draft', is_posted: false })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // 📜 Activity Log: تسجيل إلغاء الترحيل
    activityLogService.logEvent({
      table: 'journal_entries',
      documentId: id,
      event: 'unposted',
      userId: 'system',
      userName: 'النظام',
    });
  },

  // Duplicate entry
  async duplicate(id: string): Promise<string> {
    const originalEntry = await this.getById(id);
    if (!originalEntry) throw new Error('Original entry not found');

    const newEntryInput: CreateJournalEntryInput = {
      company_id: originalEntry.company_id, // Added required field
      entry_date: new Date().toISOString().split('T')[0], // Today's date
      description: `${originalEntry.description} (Copy)`,
      lines: originalEntry.lines.map(line => ({
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        cost_center_id: line.cost_center_id,
      }))
    };

    const newEntry = await this.create(newEntryInput);
    return newEntry.id;
  },

  /**
   * Delete journal entry (only if draft)
   */
  async delete(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Check if entry is posted or container-generated
    const { data: entry } = await supabase
      .from('journal_entries')
      .select('is_posted, status, reference_type, entry_type')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    // حماية: القيود المرتبطة بمستندات أخرى لا تُحذف من هنا
    const protectedRefs = ['container', 'purchase_invoice', 'sales_invoice', 'goods_receipt'];
    const protectedTypes = ['container_expense', 'container_expense_reversal', 'auto', 'provisional'];
    if (protectedRefs.includes(entry?.reference_type) || protectedTypes.includes(entry?.entry_type)) {
      throw new Error('هذا القيد مرتبط بمستند آخر — الحذف متاح فقط من المصدر الأصلي');
    }

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
