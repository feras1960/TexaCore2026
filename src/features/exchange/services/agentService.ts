/**
 * ════════════════════════════════════════════════════════════════
 * 🏦 Exchange Agents Service — خدمة الوكلاء
 * ════════════════════════════════════════════════════════════════
 * CRUD لجدول exchange_agents الجديد
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface ExchangeAgent {
  id: string;
  tenant_id: string;
  company_id: string;
  branch_id?: string;
  code: string;
  agent_type: 'individual' | 'company';
  name_ar: string;
  name_en?: string;
  name_tr?: string;
  name_ru?: string;
  name_uk?: string;
  country?: string;
  city?: string;
  phone?: string;
  email?: string;
  address?: string;
  currencies: string[];
  commission_rate: number;
  credit_limit: number;
  payable_account_id?: string;
  last_reconciliation_date?: string;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // computed
  name?: string;
}

export type CreateAgentInput = Omit<ExchangeAgent, 'id' | 'tenant_id' | 'company_id' | 'created_at' | 'updated_at' | 'name'>;

export interface EnrichedAgentData {
  _balance: number;
  _balanceCurrency: string;
  _lastRemittance: { remittance_number: string; send_amount: number; send_currency: string; status: string; created_at: string; agent_commission?: number; commission_amount?: number } | null;
  _remittanceCount: number;
  _remittanceTotal: number;
  _totalCommission: number;
}

export const agentService = {
  async getAll(companyId: string): Promise<(ExchangeAgent & EnrichedAgentData)[]> {
    // 1. Base agents
    const { data: agents, error } = await supabase
      .from('exchange_agents')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!agents?.length) return [];

    // 2. Collect all payable account IDs for balance lookup
    const accountIds = agents
      .map(a => a.payable_account_id)
      .filter(Boolean) as string[];

    // 3. Parallel enrichment queries
    const [balancesResult, lastRemittancesResult, remittanceStatsResult] = await Promise.allSettled([
      // Balance from journal_entry_lines (sum debits - credits for each account)
      accountIds.length > 0
        ? (async () => {
            try {
              const rpcRes = await supabase.rpc('get_account_balances_batch', { account_ids: accountIds });
              if (rpcRes.data) return rpcRes.data;
            } catch { /* RPC not available, fallback */ }
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

      // Last remittance per agent
      supabase
        .from('remittances')
        .select('agent_id, remittance_number, send_amount, send_currency, status, created_at, agent_commission, commission_amount')
        .eq('company_id', companyId)
        .in('agent_id', agents.map(a => a.id))
        .order('created_at', { ascending: false }),

      // Remittance stats per agent (count + sum)
      supabase
        .from('remittances')
        .select('agent_id, send_amount, agent_commission')
        .eq('company_id', companyId)
        .in('agent_id', agents.map(a => a.id))
        .not('status', 'eq', 'cancelled'),
    ]);

    // Process balances
    const balanceMap: Record<string, number> = {};
    if (balancesResult.status === 'fulfilled' && balancesResult.value) {
      (balancesResult.value as any[]).forEach((b: any) => {
        balanceMap[b.account_id] = b.balance;
      });
    }

    // Process last remittances (take first per agent since ordered by created_at desc)
    const lastRemittanceMap: Record<string, any> = {};
    if (lastRemittancesResult.status === 'fulfilled' && lastRemittancesResult.value?.data) {
      lastRemittancesResult.value.data.forEach((r: any) => {
        if (!lastRemittanceMap[r.agent_id]) {
          lastRemittanceMap[r.agent_id] = r;
        }
      });
    }

    // Process stats
    const statsMap: Record<string, { count: number; total: number; commission: number }> = {};
    if (remittanceStatsResult.status === 'fulfilled' && remittanceStatsResult.value?.data) {
      remittanceStatsResult.value.data.forEach((r: any) => {
        if (!statsMap[r.agent_id]) statsMap[r.agent_id] = { count: 0, total: 0, commission: 0 };
        statsMap[r.agent_id].count++;
        statsMap[r.agent_id].total += Number(r.send_amount) || 0;
        statsMap[r.agent_id].commission += Number(r.agent_commission) || 0;
      });
    }

    // Merge
    return agents.map(agent => ({
      ...agent,
      _balance: agent.payable_account_id ? (balanceMap[agent.payable_account_id] || 0) : 0,
      _balanceCurrency: agent.currencies?.[0] || 'USD',
      _lastRemittance: lastRemittanceMap[agent.id] || null,
      _remittanceCount: statsMap[agent.id]?.count || 0,
      _remittanceTotal: statsMap[agent.id]?.total || 0,
      _totalCommission: statsMap[agent.id]?.commission || 0,
    }));
  },

  async getById(id: string): Promise<ExchangeAgent | null> {
    const { data, error } = await supabase
      .from('exchange_agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(input: Partial<CreateAgentInput>): Promise<ExchangeAgent> {
    const { data, error } = await supabase
      .from('exchange_agents')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateAgentInput>): Promise<ExchangeAgent> {
    const { data, error } = await supabase
      .from('exchange_agents')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exchange_agents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
