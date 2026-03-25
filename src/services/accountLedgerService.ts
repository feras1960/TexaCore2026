/**
 * Account Ledger Service
 * Service layer for Account Ledger/Statement (كشف الحساب)
 * Fetches real transactions from journal_entry_lines for a specific account
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  referenceType: string;
  referenceId?: string;
  entryId: string;
  entryType?: string;
  entryNumber: string;
  lineNumber: number;
  debit: number;     // المبلغ بالعملة الأساسية (UAH)
  credit: number;    // المبلغ بالعملة الأساسية (UAH)
  debitFc: number | null;   // المبلغ بعملة المعاملة الأصلية (مثلاً USD)
  creditFc: number | null;  // المبلغ بعملة المعاملة الأصلية
  balance: number; // Running balance (calculated)
  type: 'journal' | 'invoice' | 'payment' | 'receipt' | 'transfer' | 'cash';
  status: 'draft' | 'posted' | 'cancelled';
  costCenterId?: string;
  costCenterName?: string;
  partyType?: string;
  partyId?: string;
  partyName?: string;
  currency?: string;
  exchangeRate?: number; // سعر الصرف وقت العملية
  markerColor?: string | null; // لون الماركر (للمطابقة)
  createdAt: string;
}

export interface AccountStats {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  openingBalance: number;
  transactionCount: number;
  lastActivityDate: string | null;
  monthlyAverage: number;
  periodDebit: number;
  periodCredit: number;
}

export interface LedgerFilters {
  accountId: string;
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  status?: 'all' | 'posted' | 'draft';
  entryType?: string;
  search?: string;
  costCenterId?: string;
  projectId?: string;
}

export interface PaymentEntry {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: 'receipt' | 'payment' | 'transfer';
  amount: number;
  currency: string;
  partyName?: string;
  partyType?: string;
  paymentMethod?: string;
  checkNumber?: string;
  checkDate?: string;
  description?: string;
  status: string;
  referenceNumber?: string;
  createdAt: string;
}

export const accountLedgerService = {
  /**
   * Get account ledger entries (كشف الحساب)
   * Fetches all journal entry lines for a specific account
   */
  async getLedger(filters: LedgerFilters): Promise<{
    entries: LedgerEntry[];
    stats: AccountStats;
  }> {
    const tenantId = await getCurrentTenantIdAsync();

    // Build query for journal entry lines with journal entry details
    let query = supabase
      .from('journal_entry_lines')
      .select(`
        id,
        line_number,
        debit,
        credit,
        debit_fc,
        credit_fc,
        description,
        cost_center_id,
        party_type,
        party_id,
        reference_type,
        reference_id,
        currency,
        exchange_rate,
        created_at,
        journal_entries!inner (
          id,
          entry_number,
          entry_date,
          description,
          status,
          is_posted,
          reference_type,
          reference_id,
          reference_number,
          entry_type,
          currency
        )
      `)
      .eq('account_id', filters.accountId);

    // Add tenant filter if available
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Date filters
    if (filters.dateFrom) {
      query = query.gte('journal_entries.entry_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('journal_entries.entry_date', filters.dateTo);
    }

    // Status filter — always exclude cancelled and voided entries
    query = query.neq('journal_entries.status', 'cancelled');
    query = query.neq('journal_entries.status', 'voided');

    // ⚠️ DEFAULT BEHAVIOUR: show only POSTED entries unless caller explicitly asks for drafts
    // This prevents unposted/draft journal entries from appearing in any account ledger
    if (filters.status === 'draft') {
      query = query.eq('journal_entries.status', 'draft');
    } else if (filters.status === 'all') {
      // 'all' — show everything except cancelled (already filtered above)
    } else {
      // Default ('posted' or undefined) — only posted entries
      query = query.eq('journal_entries.is_posted', true);
    }

    // Cost Center Filter
    if (filters.costCenterId && filters.costCenterId !== 'all') {
      const isNull = filters.costCenterId === 'null'; // Handle "No Cost Center" case if needed
      if (!isNull) {
        query = query.eq('cost_center_id', filters.costCenterId);
      } else {
        query = query.is('cost_center_id', null);
      }
    }

    // Currency Filter — NOT done at query level
    // Currency conversion is handled client-side by useLedgerData hook
    // All entries are fetched, then amounts are converted to the target currency

    // Order by date (using created_at as reliable fallback)
    // 🚀 LIMIT to prevent loading excessive data — max 1000 entries
    query = query.order('created_at', { ascending: true }).limit(1000);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ledger entries:', error);
      throw error;
    }

    // Get opening balance from account
    const { data: accountData } = await supabase
      .from('chart_of_accounts')
      .select('opening_balance, current_balance')
      .eq('id', filters.accountId)
      .maybeSingle();

    const openingBalance = accountData?.opening_balance || 0;

    // Sort data by entry date (since ordering by referenced table can be unreliable)
    const sortedData = (data || []).sort((a: any, b: any) => {
      const dateA = a.journal_entries?.entry_date || '';
      const dateB = b.journal_entries?.entry_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    // Calculate running balance and transform data
    let runningBalance = openingBalance;
    const entries: LedgerEntry[] = sortedData.map((line: any) => {
      const entry = line.journal_entries;
      const debit = line.debit || 0;
      const credit = line.credit || 0;
      const debitFc = line.debit_fc != null ? Number(line.debit_fc) : null;
      const creditFc = line.credit_fc != null ? Number(line.credit_fc) : null;

      // Calculate running balance (debit increases, credit decreases for asset accounts)
      runningBalance = runningBalance + debit - credit;

      // Determine entry type based on reference_type or entry_type
      let type: LedgerEntry['type'] = 'journal';
      const refType = entry.reference_type || entry.entry_type || '';
      const jeType = entry.entry_type || '';
      if (refType.includes('invoice') || refType.includes('INV')) {
        type = 'invoice';
      } else if (refType.includes('payment') || refType.includes('PAY') || jeType === 'payment') {
        type = 'payment';
      } else if (refType.includes('receipt') || refType.includes('RCT') || jeType === 'receipt') {
        type = 'receipt';
      } else if (refType.includes('transfer') || refType.includes('TRF')) {
        type = 'transfer';
      } else if (jeType === 'cash') {
        type = 'cash';
      }

      return {
        id: line.id,
        date: entry.entry_date,
        description: line.description || entry.description,
        reference: entry.reference_number || entry.entry_number,
        referenceType: entry.reference_type || entry.entry_type || 'manual',
        referenceId: entry.reference_id || line.reference_id || undefined,
        entryId: entry.id,
        entryType: entry.entry_type || 'manual',
        entryNumber: entry.entry_number,
        lineNumber: line.line_number,
        debit,
        credit,
        debitFc,
        creditFc,
        balance: runningBalance,
        type,
        status: entry.status,
        costCenterId: line.cost_center_id,
        partyType: line.party_type,
        partyId: line.party_id,
        currency: line.currency || entry.currency,
        exchangeRate: line.exchange_rate || 1,
        markerColor: line.marker_color || null, // safe — undefined if column missing
        createdAt: line.created_at,
      };
    });

    // Calculate stats
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    // Calculate monthly average (if we have entries)
    let monthlyAverage = 0;
    if (entries.length > 0) {
      const firstDate = new Date(entries[0].date);
      const lastDate = new Date(entries[entries.length - 1].date);
      const months = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      monthlyAverage = Math.round((totalDebit + totalCredit) / 2 / months);
    }

    const stats: AccountStats = {
      totalDebit,
      totalCredit,
      currentBalance: runningBalance,
      openingBalance,
      transactionCount: entries.length,
      lastActivityDate: lastEntry?.date || null,
      monthlyAverage,
      periodDebit: totalDebit,
      periodCredit: totalCredit,
    };

    return { entries, stats };
  },

  /**
   * Get account statistics only (without full ledger)
   */
  async getStats(accountId: string, companyId: string): Promise<AccountStats> {
    const tenantId = await getCurrentTenantIdAsync();

    // Get account info
    const { data: accountData } = await supabase
      .from('chart_of_accounts')
      .select('opening_balance, current_balance')
      .eq('id', accountId)
      .maybeSingle();

    // Get aggregated stats from journal entry lines
    let query = supabase
      .from('journal_entry_lines')
      .select(`
        debit,
        credit,
        journal_entries!inner (
          entry_date,
          is_posted
        )
      `)
      .eq('account_id', accountId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Only posted entries for stats
    query = query.eq('journal_entries.is_posted', true);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching account stats:', error);
      throw error;
    }

    const entries = data || [];
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);
    const openingBalance = accountData?.opening_balance || 0;

    // Find last activity date
    let lastActivityDate: string | null = null;
    if (entries.length > 0) {
      const dates = entries.map((e: any) => e.journal_entries.entry_date).sort();
      lastActivityDate = dates[dates.length - 1];
    }

    // Calculate monthly average
    let monthlyAverage = 0;
    if (entries.length > 0) {
      const dates = entries.map((e: any) => new Date(e.journal_entries.entry_date)).sort((a, b) => a.getTime() - b.getTime());
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const months = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      monthlyAverage = Math.round((totalDebit + totalCredit) / 2 / months);
    }

    return {
      totalDebit,
      totalCredit,
      currentBalance: openingBalance + totalDebit - totalCredit,
      openingBalance,
      transactionCount: entries.length,
      lastActivityDate,
      monthlyAverage,
      periodDebit: totalDebit,
      periodCredit: totalCredit,
    };
  },

  /**
   * Get payments/receipts related to an account
   * From cash_transactions table
   */
  async getPayments(
    accountId: string,
    companyId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      transactionType?: 'receipt' | 'payment' | 'all';
    }
  ): Promise<PaymentEntry[]> {
    const tenantId = await getCurrentTenantIdAsync();

    // First, check if this account is linked to a cash_account
    let query = supabase
      .from('cash_transactions')
      .select(`
        id,
        transaction_number,
        transaction_date,
        transaction_type,
        amount,
        currency,
        party_name,
        party_type,
        payment_method,
        check_number,
        check_date,
        description,
        status,
        reference_number,
        created_at,
        cash_accounts!inner (
          gl_account_id
        )
      `)
      .eq('company_id', companyId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Filter by account through cash_accounts.gl_account_id
    query = query.eq('cash_accounts.gl_account_id', accountId);

    // Date filters
    if (filters?.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('transaction_date', filters.dateTo);
    }

    // Transaction type filter
    if (filters?.transactionType && filters.transactionType !== 'all') {
      query = query.eq('transaction_type', filters.transactionType);
    }

    query = query.order('transaction_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      // If error is because no cash_account link, try contra_account approach
      let altQuery = supabase
        .from('cash_transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('contra_account_id', accountId);

      if (tenantId) {
        altQuery = altQuery.eq('tenant_id', tenantId);
      }

      if (filters?.dateFrom) {
        altQuery = altQuery.gte('transaction_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        altQuery = altQuery.lte('transaction_date', filters.dateTo);
      }

      altQuery = altQuery.order('transaction_date', { ascending: false });

      const { data: altData, error: altError } = await altQuery;

      if (altError) {
        console.error('Error fetching payments:', altError);
        return [];
      }

      return (altData || []).map((t: any) => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        transactionDate: t.transaction_date,
        transactionType: t.transaction_type,
        amount: t.amount,
        currency: t.currency || '',
        partyName: t.party_name,
        partyType: t.party_type,
        paymentMethod: t.payment_method,
        checkNumber: t.check_number,
        checkDate: t.check_date,
        description: t.description,
        status: t.status,
        referenceNumber: t.reference_number,
        createdAt: t.created_at,
      }));
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      transactionNumber: t.transaction_number,
      transactionDate: t.transaction_date,
      transactionType: t.transaction_type,
      amount: t.amount,
      currency: t.currency || '',
      partyName: t.party_name,
      partyType: t.party_type,
      paymentMethod: t.payment_method,
      checkNumber: t.check_number,
      checkDate: t.check_date,
      description: t.description,
      status: t.status,
      referenceNumber: t.reference_number,
      createdAt: t.created_at,
    }));
  },

  /**
   * Get recent activity/events for an account
   */
  async getRecentActivity(
    accountId: string,
    limit: number = 10
  ): Promise<LedgerEntry[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('journal_entry_lines')
      .select(`
        id,
        line_number,
        debit,
        credit,
        description,
        created_at,
        journal_entries!inner (
          id,
          entry_number,
          entry_date,
          description,
          status,
          reference_type,
          reference_number,
          entry_type
        )
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // ⚠️ Only posted entries appear in account activity
    query = query.eq('journal_entries.is_posted', true);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }

    return (data || []).map((line: any) => {
      const entry = line.journal_entries;
      return {
        id: line.id,
        date: entry.entry_date,
        description: line.description || entry.description,
        reference: entry.reference_number || entry.entry_number,
        referenceType: entry.reference_type || entry.entry_type || 'manual',
        entryId: entry.id,
        entryNumber: entry.entry_number,
        lineNumber: line.line_number,
        debit: line.debit || 0,
        credit: line.credit || 0,
        debitFc: null,
        creditFc: null,
        balance: 0, // Not calculated for recent activity
        type: 'journal' as const,
        status: entry.status,
        createdAt: line.created_at,
      };
    });
  },
};

export default accountLedgerService;
