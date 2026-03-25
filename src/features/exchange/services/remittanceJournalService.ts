/**
 * ════════════════════════════════════════════════════════════════
 * 🏦 remittanceJournalService — حفظ القيد المحاسبي للحوالات
 * ════════════════════════════════════════════════════════════════
 *
 * يدعم:
 *   1. createJournalEntry — قيد يدوي من التبويبة
 *   2. confirmRemittance — قيد تأكيد (مدين عميل / دائن معلقة + إيرادات)
 *   3. executeRemittance — قيد تنفيذ (مدين معلقة / دائن وكيل)
 *   4. confirmAndExecute — قيد شامل (تأكيد + تنفيذ)
 *   5. cancelRemittance — قيد عكسي للإلغاء
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { journalEntriesService, type CreateJournalEntryInput } from '@/services/journalEntriesService';
import type { JournalLine } from '../components/remittance-tabs/RemittanceJournalTab';

// ─── Real Number Generator: RMT-YYMMDD-NNN ───────────────────
async function generateRemittanceNumber(companyId: string): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `RMT-${yy}${mm}${dd}`;

  // Count how many non-draft remittances exist today for this company
  const startOfDay = `${now.getFullYear()}-${mm}-${dd}T00:00:00`;
  const { count } = await supabase
    .from('remittances')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .neq('status', 'draft')
    .gte('created_at', startOfDay);

  const seq = String((count || 0) + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
}

export interface SaveRemittanceJournalParams {
  remittanceId: string;
  remittanceNumber: string;
  companyId: string;
  entryDate: string;
  description: string;
  lines: JournalLine[];
  autoPost?: boolean;
}

/** Accounts needed for confirmation entry */
export interface ConfirmationAccounts {
  customerAccountId: string;    // حساب العميل (ذمة مدينة)
  remittancePayableId: string;  // 231 — حوالات معلقة
  commissionIncomeId: string;   // 432 — إيرادات عمولات
}

export interface ConfirmRemittanceParams {
  remittanceId: string;
  remittanceNumber: string;
  companyId: string;
  sendAmount: number;
  commissionAmount: number;
  currency: string;
  senderName: string;
  accounts: ConfirmationAccounts;
  autoPost?: boolean;
}

export const remittanceJournalService = {
  // ─── Generic Journal Entry (from tab) ───────────────────────
  async createJournalEntry(params: SaveRemittanceJournalParams): Promise<string> {
    const { remittanceId, remittanceNumber, companyId, entryDate, description, lines, autoPost } = params;

    const validLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      throw new Error('القيد يجب أن يحتوي على بندين على الأقل');
    }

    const totalDebit = validLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = validLines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`القيد غير متوازن! مدين: ${totalDebit.toFixed(2)} ≠ دائن: ${totalCredit.toFixed(2)}`);
    }

    const journalInput: CreateJournalEntryInput = {
      company_id: companyId,
      entry_date: entryDate,
      entry_type: 'remittance',
      description,
      reference_type: 'remittance',
      reference_id: remittanceId,
      reference: remittanceNumber,
      status: autoPost ? 'posted' : 'draft',
      is_posted: autoPost || false,
      lines: validLines.map(l => ({
        account_id: l.account_id!,
        debit: l.debit,
        credit: l.credit,
        description: l.description_ar || l.description_en || '',
        currency: l.currency || null,
        exchange_rate: 1,
      })),
    };

    const createdEntry = await journalEntriesService.create(journalInput);

    await supabase
      .from('remittances')
      .update({ journal_entry_id: createdEntry.id })
      .eq('id', remittanceId);

    if (autoPost && !createdEntry.is_posted) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'system';
        await journalEntriesService.post(createdEntry.id, userId);
      } catch (e) {
        console.error('[RemittanceJournal] Auto-post failed:', e);
      }
    }

    return createdEntry.id;
  },

  // ═══════════════════════════════════════════════════════════════
  // 📋 تأكيد الحوالة — قيد التأكيد
  // ═══════════════════════════════════════════════════════════════
  //
  // مدين: حساب العميل (المبلغ + العمولة)
  //   دائن: حوالات مستحقة (الإجمالي الكامل — بدون إيرادات حتى التنفيذ)
  //
  async confirmRemittance(params: ConfirmRemittanceParams): Promise<string> {
    const {
      remittanceId, remittanceNumber, companyId,
      sendAmount, commissionAmount, currency,
      senderName, accounts, autoPost,
    } = params;

    const totalAmount = sendAmount + commissionAmount;
    const entryDate = new Date().toISOString().split('T')[0];

    const lines: Array<{
      account_id: string; debit: number; credit: number;
      description: string; currency: string | null; exchange_rate: number;
    }> = [
      {
        account_id: accounts.customerAccountId,
        debit: totalAmount, credit: 0,
        description: `تأكيد حوالة ${remittanceNumber} — ${senderName}`,
        currency, exchange_rate: 1,
      },
      {
        account_id: accounts.remittancePayableId,
        debit: 0, credit: totalAmount,
        description: `حوالات مستحقة للتسليم ${remittanceNumber} (مبلغ + عمولة)`,
        currency, exchange_rate: 1,
      },
    ];

    const journalInput: CreateJournalEntryInput = {
      company_id: companyId,
      entry_date: entryDate,
      entry_type: 'remittance',
      description: `تأكيد حوالة ${remittanceNumber} — ${senderName}`,
      reference_type: 'remittance',
      reference_id: remittanceId,
      reference: remittanceNumber,
      // Always posted — confirmed remittance is a committed transaction
      status: 'posted',
      is_posted: true,
      lines,
    };

    const createdEntry = await journalEntriesService.create(journalInput);

    // Generate real remittance number
    const realNumber = await generateRemittanceNumber(companyId);

    // Update remittance: status → pending, link journal, assign real number
    const { error } = await supabase
      .from('remittances')
      .update({
        status: 'pending',
        remittance_number: realNumber,
        journal_entry_id: createdEntry.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', remittanceId);

    if (error) throw error;

    // Return the real number for UI update
    (this as any)._lastGeneratedNumber = realNumber;

    // Auto-post
    if (autoPost && !createdEntry.is_posted) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'system';
        await journalEntriesService.post(createdEntry.id, userId);
      } catch (e) {
        console.error('[Confirm] Auto-post failed:', e);
      }
    }

    return createdEntry.id;
  },

  /** Get the last generated number after confirmRemittance */
  getLastGeneratedNumber(): string | null {
    return (this as any)._lastGeneratedNumber || null;
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚡ تنفيذ حوالة مؤكدة — تحديث القيد الأول (لا إنشاء قيد ثاني)
  // ═══════════════════════════════════════════════════════════════
  //
  // يُحدّث قيد التأكيد الأصلي ليصبح شاملاً:
  //   مدين: حساب العميل (المبلغ + كل العمولات)
  //   دائن: حساب الوكيل/الشريك (المبلغ + عمولة التغطية)
  //   دائن: إيرادات عمولات (صافي الربح)
  //
  // النتيجة: قيد واحد فقط لكل حوالة — لا تكرار في صفحة القيود
  //
  async executeRemittance(params: {
    remittanceId: string;
    remittanceNumber: string;
    companyId: string;
    sendAmount: number;
    commissionAmount: number;     // إجمالي العمولة (our + agent)
    agentCommission: number;
    currency: string;
    senderName: string;
    remittancePayableId: string;  // 231 — حوالات مستحقة
    commissionIncomeId: string;   // 432 — إيرادات عمولات
    executorAccountId: string;    // حساب الوكيل/الشريك
    autoPost?: boolean;
  }): Promise<string> {
    const {
      remittanceId, remittanceNumber, companyId,
      sendAmount, commissionAmount, agentCommission, currency,
      senderName, commissionIncomeId, executorAccountId,
    } = params;

    const totalCustomerDebit = sendAmount + commissionAmount;
    const totalToExecutor = sendAmount + agentCommission;
    const netRevenue = commissionAmount - agentCommission; // صافي الربح

    // 1. Fetch the existing confirmation journal entry
    const { data: remittanceRow } = await supabase
      .from('remittances')
      .select('journal_entry_id')
      .eq('id', remittanceId)
      .single();

    const existingJeId = remittanceRow?.journal_entry_id;
    if (!existingJeId) {
      throw new Error('لا يوجد قيد تأكيد لتحديثه — يرجى تأكيد الحوالة أولاً');
    }

    // 2. Get the customer account from existing entry lines (first debit line)
    const { data: existingLines } = await supabase
      .from('journal_entry_lines')
      .select('account_id, tenant_id')
      .eq('entry_id', existingJeId)
      .gt('debit', 0)
      .limit(1);

    const customerAccountId = existingLines?.[0]?.account_id;
    const tenantId = existingLines?.[0]?.tenant_id;

    if (!customerAccountId) {
      throw new Error('فشل استخراج حساب العميل من القيد الأصلي');
    }

    // 3. Build new comprehensive lines (customer → executor + revenue)
    const newLines: Array<{
      account_id: string; debit: number; credit: number;
      description: string; currency: string | null; exchange_rate: number;
    }> = [];

    // مدين: حساب العميل (إجمالي: مبلغ + كل العمولات)
    newLines.push({
      account_id: customerAccountId,
      debit: totalCustomerDebit, credit: 0,
      description: `حوالة ${remittanceNumber} — ${senderName}`,
      currency, exchange_rate: 1,
    });

    // دائن: حساب الوكيل/الشريك (المبلغ + عمولة التغطية)
    newLines.push({
      account_id: executorAccountId,
      debit: 0, credit: totalToExecutor,
      description: `تنفيذ حوالة ${remittanceNumber} — إلى الوكيل/الشريك`,
      currency, exchange_rate: 1,
    });

    // دائن: إيرادات عمولات (صافي الربح)
    if (netRevenue > 0) {
      newLines.push({
        account_id: commissionIncomeId,
        debit: 0, credit: netRevenue,
        description: `إيرادات عمولة حوالة ${remittanceNumber} (صافي)`,
        currency, exchange_rate: 1,
      });
    }

    // 4. Delete old lines & insert new ones
    await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('entry_id', existingJeId);

    await supabase
      .from('journal_entry_lines')
      .insert(newLines.map(l => ({
        ...l,
        entry_id: existingJeId,
        tenant_id: tenantId,
      })));

    // 5. Update journal entry description & totals
    await supabase
      .from('journal_entries')
      .update({
        description: `تأكيد وتنفيذ حوالة ${remittanceNumber} — ${senderName}`,
        total_debit: totalCustomerDebit,
        total_credit: totalCustomerDebit,
      })
      .eq('id', existingJeId);

    // 6. Status → sent
    const { error } = await supabase
      .from('remittances')
      .update({
        status: 'sent',
      })
      .eq('id', remittanceId);

    if (error) throw error;

    // Return the SAME journal entry ID (not a new one)
    return existingJeId;
  },

  // ═══════════════════════════════════════════════════════════════
  // ⛔ إلغاء الحوالة — قيد عكسي
  // ═══════════════════════════════════════════════════════════════
  //
  // يعكس كل سطور القيد الأصلي (مدين ↔ دائن)
  // الحالة → cancelled
  //
  async cancelRemittance(
    remittanceId: string,
    journalEntryId: string,
    companyId: string,
    remittanceNumber: string,
    autoPost?: boolean,
  ): Promise<string> {
    // 1. Fetch original journal lines
    const { data: originalLines, error: fetchError } = await supabase
      .from('journal_entry_lines')
      .select('account_id, debit, credit, description, currency, exchange_rate')
      .eq('entry_id', journalEntryId);

    if (fetchError || !originalLines?.length) {
      throw new Error('فشل تحميل القيد الأصلي للعكس');
    }

    // 2. Reverse lines (swap debit ↔ credit)
    const reversedLines = originalLines.map(l => ({
      account_id: l.account_id,
      debit: l.credit || 0,
      credit: l.debit || 0,
      description: `عكس: ${l.description || ''}`,
      currency: l.currency || null,
      exchange_rate: l.exchange_rate || 1,
    }));

    // 3. Create reversal entry
    const entryDate = new Date().toISOString().split('T')[0];
    const journalInput: CreateJournalEntryInput = {
      company_id: companyId,
      entry_date: entryDate,
      entry_type: 'remittance',
      description: `إلغاء حوالة ${remittanceNumber} — قيد عكسي`,
      reference_type: 'remittance',
      reference_id: remittanceId,
      reference: remittanceNumber,
      // Always posted — remittance reversal must reflect immediately
      status: 'posted',
      is_posted: true,
      lines: reversedLines,
    };

    const reversalEntry = await journalEntriesService.create(journalInput);

    // 4. Update remittance → cancelled
    const { error } = await supabase
      .from('remittances')
      .update({
        status: 'cancelled',
      })
      .eq('id', remittanceId);

    if (error) throw error;

    // 5. Auto-post reversal
    if (autoPost && !reversalEntry.is_posted) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'system';
        await journalEntriesService.post(reversalEntry.id, userId);
      } catch (e) {
        console.error('[Cancel] Auto-post reversal failed:', e);
      }
    }

    return reversalEntry.id;
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚡ تأكيد + تنفيذ مباشر — قيد شامل واحد
  // ═══════════════════════════════════════════════════════════════
  //
  // مدين: حساب العميل + مصروف تغطية + رسوم شبكة
  // دائن: حساب الوكيل/الشريك + إيرادات عمولات + صندوق شبكة
  //
  async confirmAndExecute(params: ConfirmRemittanceParams & {
    executorAccountId: string;    // payable_account_id of agent/partner
    agentCommission: number;      // coverage fee
    networkFee: number;           // network fee
    networkAccountId?: string;    // cash/bank account for network fee (optional)
  }): Promise<string> {
    const {
      remittanceId, remittanceNumber, companyId,
      sendAmount, commissionAmount, currency,
      senderName, accounts, autoPost,
      executorAccountId, agentCommission,
    } = params;

    // commissionAmount = total commission (ourCommission + agentCommission)
    // ourCommission (net profit) = commissionAmount - agentCommission
    const ourCommission = commissionAmount - agentCommission;
    const totalCustomerDebit = sendAmount + commissionAmount;
    const totalToExecutor = sendAmount + agentCommission;
    const entryDate = new Date().toISOString().split('T')[0];

    const lines: Array<{
      account_id: string; debit: number; credit: number;
      description: string; currency: string | null; exchange_rate: number;
    }> = [];

    // DEBIT: Customer account (total: send + all commission)
    lines.push({
      account_id: accounts.customerAccountId,
      debit: totalCustomerDebit, credit: 0,
      description: `حوالة ${remittanceNumber} — ${senderName}`,
      currency, exchange_rate: 1,
    });

    // CREDIT: Executor account (send + agent commission — bundled together)
    lines.push({
      account_id: executorAccountId,
      debit: 0, credit: totalToExecutor,
      description: `تنفيذ حوالة ${remittanceNumber} — إلى الوكيل/الشريك`,
      currency, exchange_rate: 1,
    });

    // CREDIT: Commission revenue (NET profit = ourCommission only)
    if (ourCommission > 0) {
      lines.push({
        account_id: accounts.commissionIncomeId,
        debit: 0, credit: ourCommission,
        description: `إيرادات عمولة — حوالة ${remittanceNumber} (صافي)`,
        currency, exchange_rate: 1,
      });
    }

    const journalInput: CreateJournalEntryInput = {
      company_id: companyId,
      entry_date: entryDate,
      entry_type: 'remittance',
      description: `تأكيد وتنفيذ حوالة ${remittanceNumber} — ${senderName}`,
      reference_type: 'remittance',
      reference_id: remittanceId,
      reference: remittanceNumber,
      // Always posted — confirm+execute is committed
      status: 'posted',
      is_posted: true,
      lines,
    };

    const createdEntry = await journalEntriesService.create(journalInput);

    // Generate real remittance number
    const realNumber = await generateRemittanceNumber(companyId);

    // Status → sent (skip pending/processing), assign real number
    const { error } = await supabase
      .from('remittances')
      .update({
        status: 'sent',
        remittance_number: realNumber,
        journal_entry_id: createdEntry.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', remittanceId);

    if (error) throw error;

    (this as any)._lastGeneratedNumber = realNumber;

    // Auto-post
    if (autoPost && !createdEntry.is_posted) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'system';
        await journalEntriesService.post(createdEntry.id, userId);
      } catch (e) {
        console.error('[ConfirmAndExecute] Auto-post failed:', e);
      }
    }

    return createdEntry.id;
  },

  // ─── Delete journal entry ───────────────────────────────────
  async deleteJournalEntry(remittanceId: string, journalEntryId: string): Promise<void> {
    try {
      await supabase
        .from('remittances')
        .update({ journal_entry_id: null })
        .eq('id', remittanceId);

      await journalEntriesService.delete(journalEntryId);
    } catch (err) {
      console.error('[RemittanceJournal] Failed to delete journal entry:', err);
      throw err;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // 📥 تأكيد الحوالة الواردة — القيد الأول
  // ═══════════════════════════════════════════════════════════════
  //
  // مدين: حساب الوكيل/الشريك (مصدر الحوالة)
  // دائن: حساب المستقبل الجاري (زبون دائم) أو 232 (زبون طيّار)
  //
  async confirmIncomingRemittance(params: {
    remittanceId: string;
    remittanceNumber: string;
    companyId: string;
    sendAmount: number;
    currency: string;
    senderName: string;      // informational only
    receiverName: string;
    sourceAccountId: string;  // Agent/Partner accounting account (debit)
    receiverAccountId: string; // Customer current account OR 232 (credit)
    autoPost?: boolean;
  }): Promise<string> {
    const {
      remittanceId, remittanceNumber, companyId,
      sendAmount, currency,
      senderName, receiverName,
      sourceAccountId, receiverAccountId,
      autoPost,
    } = params;

    const entryDate = new Date().toISOString().split('T')[0];

    const lines: Array<{
      account_id: string; debit: number; credit: number;
      description: string; currency: string | null; exchange_rate: number;
    }> = [
      {
        account_id: sourceAccountId,
        debit: sendAmount, credit: 0,
        description: `حوالة واردة ${remittanceNumber} — من ${senderName}`,
        currency, exchange_rate: 1,
      },
      {
        account_id: receiverAccountId,
        debit: 0, credit: sendAmount,
        description: `حوالة واردة ${remittanceNumber} — لصالح ${receiverName}`,
        currency, exchange_rate: 1,
      },
    ];

    const journalInput: CreateJournalEntryInput = {
      company_id: companyId,
      entry_date: entryDate,
      entry_type: 'remittance',
      description: `تأكيد استلام حوالة واردة ${remittanceNumber} — من ${senderName} إلى ${receiverName}`,
      reference_type: 'remittance',
      reference_id: remittanceId,
      reference: remittanceNumber,
      status: 'posted',
      is_posted: true,
      lines,
    };

    const createdEntry = await journalEntriesService.create(journalInput);

    // Generate real remittance number
    const realNumber = await generateRemittanceNumber(companyId);

    // Update remittance: status → confirmed, link journal, assign real number
    const { error } = await supabase
      .from('remittances')
      .update({
        status: 'pending', // "confirmed" maps to pending in the DB
        remittance_number: realNumber,
        journal_entry_id: createdEntry.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', remittanceId);

    if (error) throw error;

    (this as any)._lastGeneratedNumber = realNumber;

    // Auto-post
    if (autoPost && !createdEntry.is_posted) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'system';
        await journalEntriesService.post(createdEntry.id, userId);
      } catch (e) {
        console.error('[ConfirmIncoming] Auto-post failed:', e);
      }
    }

    return createdEntry.id;
  },

  // ═══════════════════════════════════════════════════════════════
  // 📦 تسليم الحوالة الواردة — القيد الثاني
  // ═══════════════════════════════════════════════════════════════
  //
  // مدين: حساب المستقبل الجاري أو 232 (إغلاق الرصيد)
  // دائن: صندوق/بنك (الكاش الفعلي المدفوع)
  // دائن: إيرادات عمولات (عمولتنا)
  //
  async deliverIncomingRemittance(params: {
    remittanceId: string;
    remittanceNumber: string;
    companyId: string;
    sendAmount: number;
    commissionAmount: number;    // our commission
    currency: string;
    receiverName: string;
    receiverAccountId: string;   // Customer current account OR 232
    fundAccountId: string;       // Cash/Bank account for actual payment
    commissionIncomeId: string;  // 432 — Commission income
    autoPost?: boolean;
  }): Promise<string> {
    const {
      remittanceId, remittanceNumber, companyId,
      sendAmount, commissionAmount, currency,
      receiverName, receiverAccountId, fundAccountId, commissionIncomeId,
      autoPost,
    } = params;

    const netPayment = sendAmount - commissionAmount;
    const entryDate = new Date().toISOString().split('T')[0];

    const lines: Array<{
      account_id: string; debit: number; credit: number;
      description: string; currency: string | null; exchange_rate: number;
    }> = [];

    // Debit: Close receiver account (customer or 232)
    lines.push({
      account_id: receiverAccountId,
      debit: sendAmount, credit: 0,
      description: `تسليم حوالة واردة ${remittanceNumber} — ${receiverName}`,
      currency, exchange_rate: 1,
    });

    // Credit: Cash/Bank (actual payment)
    lines.push({
      account_id: fundAccountId,
      debit: 0, credit: netPayment,
      description: `دفع حوالة واردة ${remittanceNumber} — نقدي`,
      currency, exchange_rate: 1,
    });

    // Credit: Commission income
    if (commissionAmount > 0) {
      lines.push({
        account_id: commissionIncomeId,
        debit: 0, credit: commissionAmount,
        description: `عمولة تسليم حوالة واردة ${remittanceNumber}`,
        currency, exchange_rate: 1,
      });
    }

    const journalInput: CreateJournalEntryInput = {
      company_id: companyId,
      entry_date: entryDate,
      entry_type: 'remittance',
      description: `تسليم حوالة واردة ${remittanceNumber} — ${receiverName}`,
      reference_type: 'remittance',
      reference_id: remittanceId,
      reference: remittanceNumber,
      status: 'posted',
      is_posted: true,
      lines,
    };

    const createdEntry = await journalEntriesService.create(journalInput);

    // Status → delivered
    const { error } = await supabase
      .from('remittances')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', remittanceId);

    if (error) throw error;

    // Auto-post
    if (autoPost && !createdEntry.is_posted) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'system';
        await journalEntriesService.post(createdEntry.id, userId);
      } catch (e) {
        console.error('[DeliverIncoming] Auto-post failed:', e);
      }
    }

    return createdEntry.id;
  },
};

export default remittanceJournalService;
