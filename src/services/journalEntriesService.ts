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
  reference?: string;
  entry_number?: string;
  fund_account_id?: string;
  total_amount?: number;
  status?: 'draft' | 'posted' | 'cancelled';
  is_posted?: boolean;
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
    currency?: string | null;
    exchange_rate?: number;
    link_type?: string | null;
    invoice_id?: string | null;
    party_type?: string | null;
    party_id?: string | null;
    is_fund_line?: boolean;  // ← سطر الصندوق التلقائي — يُخفى في تبويب القيد
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

    // ✅ فلترة الأسطر الفارغة قبل التحقق والإدخال
    // (تمنع انتهاك قيد chk_debit_or_credit عند وجود صفوف فارغة في الشبكة)
    const validLines = input.lines.filter(line =>
      line.account_id &&
      ((Number(line.debit) || 0) > 0 || (Number(line.credit) || 0) > 0)
    );

    if (validLines.length < 2) {
      throw new Error('يجب أن يحتوي القيد على بندين هيين على الأقل');
    }

    // Calculate totals in BASE CURRENCY (amount × exchange_rate)
    const totalDebit  = validLines.reduce((sum, line) => sum + (line.debit  || 0) * (line.exchange_rate || 1), 0);
    const totalCredit = validLines.reduce((sum, line) => sum + (line.credit || 0) * (line.exchange_rate || 1), 0);

    // Validate balance in base currency
    if (Math.abs(totalDebit - totalCredit) > 0.1) {
      throw new Error('القيد غير متوازن! يجب أن يكون إجمالي المدين يساوي إجمالي الدائن');
    }

    // ═══ GROUP ACCOUNT GUARD ═══
    // Posting to GROUP accounts causes invisible balances (RPC only returns leaf accounts)
    const uniqueAccountIds = [...new Set(validLines.map(l => l.account_id))];
    if (uniqueAccountIds.length > 0) {
      const { data: accountChecks } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, name_ar, is_group')
        .in('id', uniqueAccountIds);

      const groupAccounts = accountChecks?.filter(a => a.is_group) || [];
      if (groupAccounts.length > 0) {
        const groupList = groupAccounts.map(a => `${a.account_code} (${a.name_ar})`).join(', ');
        console.error(`❌ [Group Guard] Attempted to post to GROUP account(s): ${groupList}`);
        throw new Error(
          `❌ لا يمكن الترحيل على حسابات مجموعة: ${groupList}\n` +
          `يجب استخدام حسابات تفصيلية (LEAF) فقط.\n\n` +
          `❌ Cannot post to GROUP accounts: ${groupList}\n` +
          `Only LEAF (detail) accounts are allowed in journal entries.`
        );
      }
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
        fund_account_id: input.fund_account_id || null,
        total_debit: Math.round(totalDebit * 100) / 100,
        total_credit: Math.round(totalCredit * 100) / 100,
        status: input.status || 'draft',
        is_posted: input.status === 'posted' || input.is_posted || false,
        posted_at: input.status === 'posted' ? new Date().toISOString() : null,
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

    // Create lines — store BASE currency in debit/credit (for RPC balance check)
    // debit_fc/credit_fc store NATIVE/original amounts for display
    const linesData = validLines.map((line, index) => {
      const rate = Number(line.exchange_rate) || 1;
      const debitBase  = Math.round((line.debit  || 0) * rate * 100) / 100;
      const creditBase = Math.round((line.credit || 0) * rate * 100) / 100;
      return {
        tenant_id: tenantId,
        entry_id: entry.id,
        line_number: index + 1,
        account_id: line.account_id,
        debit:    debitBase,
        credit:   creditBase,
        debit_fc:  line.debit  || 0,
        credit_fc: line.credit || 0,
        description: line.description || null,
        cost_center_id: line.cost_center_id || null,
        party_type: line.party_type || null,
        party_id: line.party_id || null,
        currency: line.currency || null,
        exchange_rate: rate,
        is_fund_line: line.is_fund_line === true,
        reference_type: line.reference_type || line.link_type || null,
        reference_id: line.reference_id || line.invoice_id || null,
      };
    });


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
    if (entryCheck?.reference_type === 'container' || entryCheck?.reference_type === 'remittance') {
      throw new Error('هذا القيد مولّد تلقائياً — التعديل متاح فقط من المصدر الأصلي');
    }

    // If lines are being updated, recalculate totals
    if (updates.lines) {
      // ✅ فلترة الأسطر الفارغة قبل التحقق والإدخال
      const validUpdateLines = updates.lines.filter(line =>
        line.account_id &&
        ((Number(line.debit) || 0) > 0 || (Number(line.credit) || 0) > 0)
      );

      // Update entry totals — base currency
      const convDebit  = validUpdateLines.reduce((sum, line) => sum + (line.debit  || 0) * (line.exchange_rate || 1), 0);
      const convCredit = validUpdateLines.reduce((sum, line) => sum + (line.credit || 0) * (line.exchange_rate || 1), 0);

      if (Math.abs(convDebit - convCredit) > 0.1) {
        throw new Error('القيد غير متوازن!');
      }

      const totalDebit  = Math.round(convDebit  * 100) / 100;
      const totalCredit = Math.round(convCredit * 100) / 100;
      // Update entry totals + status
      const newStatus = (updates as any).status || undefined;
      const isNowPosted = newStatus === 'posted';

      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({
          total_debit: totalDebit,
          total_credit: totalCredit,
          description: updates.description,
          entry_date: updates.entry_date,
          entry_type: updates.entry_type,
          ...(updates.fund_account_id !== undefined ? { fund_account_id: updates.fund_account_id } : {}),
          ...(newStatus ? {
            status: newStatus,
            is_posted: isNowPosted,
            posted_at: isNowPosted ? new Date().toISOString() : null,
          } : {}),
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

      // Insert new lines — BASE currency in debit/credit (for RPC), native in debit_fc/credit_fc
      const linesData = validUpdateLines.map((line, index) => {
        const rate = Number(line.exchange_rate) || 1;
        const debitBase  = Math.round((line.debit  || 0) * rate * 100) / 100;
        const creditBase = Math.round((line.credit || 0) * rate * 100) / 100;
        return {
          tenant_id: tenantId,
          entry_id: id,
          line_number: index + 1,
          account_id: line.account_id,
          debit:    debitBase,
          credit:   creditBase,
          debit_fc:  line.debit  || 0,
          credit_fc: line.credit || 0,
          description: line.description || null,
          cost_center_id: line.cost_center_id || null,
          party_type: line.party_type || null,
          party_id: line.party_id || null,
          currency: line.currency || null,
          exchange_rate: rate,
          is_fund_line: line.is_fund_line === true,
          reference_type: line.reference_type || line.link_type || null,
          reference_id: line.reference_id || line.invoice_id || null,
        };
      });

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

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // ✅ استخدام RPC المخصص الذي يعكس أرصدة chart_of_accounts ذرياً
    // ثم يُعيد القيد إلى مسودة — في نفس الـ transaction
    const { data, error } = await supabase.rpc('unpost_journal_entry', {
      p_entry_id: id,
      p_user_id:  userId,
    });

    if (error) {
      throw new Error(error.message || 'فشل إلغاء الترحيل');
    }

    // 📜 Activity Log
    activityLogService.logEvent({
      table: 'journal_entries',
      documentId: id,
      event: 'unposted',
      userId: userId || 'system',
      userName: 'المستخدم',
      details: { lines_reversed: data?.lines_reversed },
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
    const protectedRefs = ['container', 'purchase_invoice', 'sales_invoice', 'goods_receipt', 'remittance'];
    const protectedTypes = ['container_expense', 'container_expense_reversal', 'auto', 'provisional', 'remittance'];
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
