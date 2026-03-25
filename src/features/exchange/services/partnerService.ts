/**
 * ════════════════════════════════════════════════════════════════
 * 🤝 Exchange Partners Service — خدمة الشركاء
 * ════════════════════════════════════════════════════════════════
 * CRUD لجدول exchange_partners
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface ExchangePartner {
  id: string;
  tenant_id: string;
  company_id: string;
  code: string;
  partner_type: 'bank' | 'exchange_house' | 'correspondent' | 'fintech' | 'other';
  name_ar: string;
  name_en?: string;
  name_tr?: string;
  name_ru?: string;
  name_uk?: string;
  country?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  license_number?: string;
  countries: string[];
  currencies: string[];
  agreement_type?: 'commission' | 'fixed' | 'spread' | 'hybrid';
  commission_rate: number;
  settlement_period?: 'daily' | 'weekly' | 'monthly';
  credit_limit: number;
  receivable_account_id?: string;
  last_reconciliation_date?: string;
  last_settlement_date?: string;
  next_settlement_date?: string;
  status: 'active' | 'inactive' | 'under_review' | 'suspended';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // computed
  name?: string;
}

export type CreatePartnerInput = Omit<ExchangePartner, 'id' | 'tenant_id' | 'company_id' | 'created_at' | 'updated_at' | 'name'>;

export interface EnrichedPartnerData {
  _balance: number;
  _balanceCurrency: string;
  _lastRemittance: { remittance_number: string; send_amount: number; send_currency: string; status: string; created_at: string; agent_commission?: number; commission_amount?: number } | null;
  _remittanceCount: number;
  _remittanceTotal: number;
  _totalCommission: number;
}

export const partnerService = {
  async getAll(companyId: string): Promise<(ExchangePartner & EnrichedPartnerData)[]> {
    // 1. Base partners
    const { data: partners, error } = await supabase
      .from('exchange_partners')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!partners?.length) return [];

    // 2. Collect account IDs for balance
    const accountIds = partners
      .map(p => p.receivable_account_id)
      .filter(Boolean) as string[];

    // 3. Parallel enrichment
    const [balancesResult, lastRemittancesResult, remittanceStatsResult] = await Promise.allSettled([
      // Balance
      accountIds.length > 0
        ? (async () => {
            try {
              const rpcRes = await supabase.rpc('get_account_balances_batch', { account_ids: accountIds });
              if (rpcRes.data) return rpcRes.data;
            } catch { /* fallback */ }
            const r = await supabase
              .from('journal_entry_lines')
              .select('account_id, debit, credit')
              .in('account_id', accountIds);
            const balances: Record<string, number> = {};
            (r.data || []).forEach((l: any) => {
              balances[l.account_id] = (balances[l.account_id] || 0) + (l.debit || 0) - (l.credit || 0);
            });
            return Object.entries(balances).map(([account_id, balance]) => ({ account_id, balance }));
          })()
        : Promise.resolve([]),

      // Last remittance per partner
      supabase
        .from('remittances')
        .select('partner_id, remittance_number, send_amount, send_currency, status, created_at, agent_commission, commission_amount')
        .eq('company_id', companyId)
        .in('partner_id', partners.map(p => p.id))
        .order('created_at', { ascending: false }),

      // Stats
      supabase
        .from('remittances')
        .select('partner_id, send_amount, agent_commission')
        .eq('company_id', companyId)
        .in('partner_id', partners.map(p => p.id))
        .not('status', 'eq', 'cancelled'),
    ]);

    const balanceMap: Record<string, number> = {};
    if (balancesResult.status === 'fulfilled' && balancesResult.value) {
      (balancesResult.value as any[]).forEach((b: any) => {
        balanceMap[b.account_id] = b.balance;
      });
    }

    const lastRemittanceMap: Record<string, any> = {};
    if (lastRemittancesResult.status === 'fulfilled' && lastRemittancesResult.value?.data) {
      lastRemittancesResult.value.data.forEach((r: any) => {
        if (!lastRemittanceMap[r.partner_id]) lastRemittanceMap[r.partner_id] = r;
      });
    }

    const statsMap: Record<string, { count: number; total: number; commission: number }> = {};
    if (remittanceStatsResult.status === 'fulfilled' && remittanceStatsResult.value?.data) {
      remittanceStatsResult.value.data.forEach((r: any) => {
        if (!statsMap[r.partner_id]) statsMap[r.partner_id] = { count: 0, total: 0, commission: 0 };
        statsMap[r.partner_id].count++;
        statsMap[r.partner_id].total += Number(r.send_amount) || 0;
        statsMap[r.partner_id].commission += Number(r.agent_commission) || 0;
      });
    }

    return partners.map(partner => ({
      ...partner,
      _balance: partner.receivable_account_id ? (balanceMap[partner.receivable_account_id] || 0) : 0,
      _balanceCurrency: partner.currencies?.[0] || 'USD',
      _lastRemittance: lastRemittanceMap[partner.id] || null,
      _remittanceCount: statsMap[partner.id]?.count || 0,
      _remittanceTotal: statsMap[partner.id]?.total || 0,
      _totalCommission: statsMap[partner.id]?.commission || 0,
    }));
  },

  async getById(id: string): Promise<ExchangePartner | null> {
    const { data, error } = await supabase
      .from('exchange_partners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(input: Partial<CreatePartnerInput>): Promise<ExchangePartner> {
    const { data, error } = await supabase
      .from('exchange_partners')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreatePartnerInput>): Promise<ExchangePartner> {
    const { data, error } = await supabase
      .from('exchange_partners')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exchange_partners')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
