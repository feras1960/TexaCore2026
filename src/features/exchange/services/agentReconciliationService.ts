/**
 * ════════════════════════════════════════════════════════════════
 * 🤝 agentReconciliationService — تسوية الوكلاء والشركاء
 * ════════════════════════════════════════════════════════════════
 *
 * يوفر:
 *   1. حساب الرصيد المعلّق لكل وكيل/شريك
 *   2. تفاصيل الحوالات غير المسوّاة
 *   3. إنشاء تسوية (reconciliation) تربط بقيد محاسبي
 *   4. تحديث حالة التسوية على الحوالات
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────
export interface AgentBalance {
  agentId: string;
  agentName: string;
  agentType: 'agent' | 'partner';
  totalOwed: number;       // ما نستحقه عليهم
  totalPaid: number;       // ما دفعوه
  pendingBalance: number;  // المعلّق
  currency: string;
  unreconciledCount: number;
  lastReconciliationDate?: string;
}

export interface UnreconciledRemittance {
  id: string;
  remittanceNumber: string;
  remittanceDate: string;
  senderName: string;
  receiverName: string;
  sendAmount: number;
  sendCurrency: string;
  agentCommission: number;
  status: string;
}

export interface ReconciliationParams {
  companyId: string;
  agentId?: string;
  partnerId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  remittanceIds: string[];
}

export const agentReconciliationService = {

  /**
   * حساب أرصدة الوكلاء غير المسوّاة
   */
  async getAgentBalances(companyId: string): Promise<AgentBalance[]> {
    const balances: AgentBalance[] = [];

    // ─── Agents ────────────────────────────────────────────
    const { data: agents } = await supabase
      .from('exchange_agents')
      .select('id, name_ar, name_en')
      .eq('company_id', companyId)
      .eq('is_active', true);

    for (const agent of agents || []) {
      const { data: remittances } = await supabase
        .from('remittances')
        .select('agent_commission, is_reconciled, send_currency')
        .eq('company_id', companyId)
        .eq('agent_id', agent.id)
        .neq('status', 'cancelled');

      const totalOwed = (remittances || []).reduce((s, r) => s + (Number(r.agent_commission) || 0), 0);
      const totalPaid = (remittances || [])
        .filter(r => r.is_reconciled)
        .reduce((s, r) => s + (Number(r.agent_commission) || 0), 0);
      const unreconciledCount = (remittances || []).filter(r => !r.is_reconciled && Number(r.agent_commission) > 0).length;
      const currency = remittances?.[0]?.send_currency || 'USD';

      if (totalOwed > 0 || unreconciledCount > 0) {
        balances.push({
          agentId: agent.id,
          agentName: agent.name_ar || agent.name_en || agent.id,
          agentType: 'agent',
          totalOwed,
          totalPaid,
          pendingBalance: totalOwed - totalPaid,
          currency,
          unreconciledCount,
        });
      }
    }

    // ─── Partners ──────────────────────────────────────────
    const { data: partners } = await supabase
      .from('exchange_partners')
      .select('id, name_ar, name_en')
      .eq('company_id', companyId)
      .eq('is_active', true);

    for (const partner of partners || []) {
      const { data: remittances } = await supabase
        .from('remittances')
        .select('agent_commission, is_reconciled, send_currency')
        .eq('company_id', companyId)
        .eq('partner_id', partner.id)
        .neq('status', 'cancelled');

      const totalOwed = (remittances || []).reduce((s, r) => s + (Number(r.agent_commission) || 0), 0);
      const totalPaid = (remittances || [])
        .filter(r => r.is_reconciled)
        .reduce((s, r) => s + (Number(r.agent_commission) || 0), 0);
      const unreconciledCount = (remittances || []).filter(r => !r.is_reconciled && Number(r.agent_commission) > 0).length;
      const currency = remittances?.[0]?.send_currency || 'USD';

      if (totalOwed > 0 || unreconciledCount > 0) {
        balances.push({
          agentId: partner.id,
          agentName: partner.name_ar || partner.name_en || partner.id,
          agentType: 'partner',
          totalOwed,
          totalPaid,
          pendingBalance: totalOwed - totalPaid,
          currency,
          unreconciledCount,
        });
      }
    }

    return balances.sort((a, b) => b.pendingBalance - a.pendingBalance);
  },

  /**
   * الحوالات غير المسوّاة لوكيل محدد
   */
  async getUnreconciledRemittances(params: {
    companyId: string;
    agentId?: string;
    partnerId?: string;
  }): Promise<UnreconciledRemittance[]> {
    let query = supabase
      .from('remittances')
      .select('id, remittance_number, remittance_date, sender_name, receiver_name, send_amount, send_currency, agent_commission, status')
      .eq('company_id', params.companyId)
      .eq('is_reconciled', false)
      .neq('status', 'cancelled')
      .gt('agent_commission', 0)
      .order('remittance_date', { ascending: false });

    if (params.agentId) query = query.eq('agent_id', params.agentId);
    if (params.partnerId) query = query.eq('partner_id', params.partnerId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      remittanceNumber: r.remittance_number,
      remittanceDate: r.remittance_date,
      senderName: r.sender_name,
      receiverName: r.receiver_name,
      sendAmount: Number(r.send_amount),
      sendCurrency: r.send_currency,
      agentCommission: Number(r.agent_commission),
      status: r.status,
    }));
  },

  /**
   * إجراء تسوية — تحديث الحوالات كمسوّاة
   */
  async reconcile(params: ReconciliationParams): Promise<{ success: boolean; reconciledCount: number }> {
    const { remittanceIds, notes } = params;

    if (!remittanceIds.length) {
      throw new Error('يجب تحديد حوالة واحدة على الأقل للتسوية');
    }

    // Mark remittances as reconciled
    const { error } = await supabase
      .from('remittances')
      .update({
        is_reconciled: true,
        last_reconciliation_date: new Date().toISOString(),
        notes: notes ? supabase.rpc ? notes : notes : notes,
      })
      .in('id', remittanceIds);

    if (error) throw error;

    return {
      success: true,
      reconciledCount: remittanceIds.length,
    };
  },
};

export default agentReconciliationService;
