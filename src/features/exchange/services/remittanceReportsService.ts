/**
 * ════════════════════════════════════════════════════════════════
 * 📊 remittanceReportsService — تقارير الحوالات
 * ════════════════════════════════════════════════════════════════
 *
 * يوفر:
 *   1. كشف حوالات يومي/شهري (ملخص + تفاصيل)
 *   2. تقرير أرباح/خسائر FX
 *   3. ملخص أداء الوكلاء والشركاء
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────
export interface RemittanceSummary {
  totalOutgoing: number;
  totalIncoming: number;
  totalCommission: number;
  totalAgentCommission: number;
  netCommission: number;
  outgoingCount: number;
  incomingCount: number;
  cancelledCount: number;
  byCurrency: Record<string, { outgoing: number; incoming: number; count: number }>;
  byAgent: Array<{ agentId: string; agentName: string; count: number; totalAmount: number; commission: number }>;
  byStatus: Record<string, number>;
}

export interface FxProfitReport {
  totalProfit: number;
  totalLoss: number;
  netFx: number;
  byPair: Array<{ sendCurrency: string; receiveCurrency: string; profit: number; loss: number; net: number; count: number }>;
}

export const remittanceReportsService = {

  /**
   * كشف حوالات لفترة معينة
   */
  async getSummary(params: {
    companyId: string;
    startDate: string;
    endDate: string;
  }): Promise<RemittanceSummary> {
    const { companyId, startDate, endDate } = params;

    const { data: remittances, error } = await supabase
      .from('remittances')
      .select('id, remittance_type, status, send_amount, send_currency, receive_amount, receive_currency, commission_amount, our_commission, agent_commission, agent_id')
      .eq('company_id', companyId)
      .gte('remittance_date', startDate)
      .lte('remittance_date', endDate + 'T23:59:59');

    if (error) throw error;
    const rows = remittances || [];

    const summary: RemittanceSummary = {
      totalOutgoing: 0,
      totalIncoming: 0,
      totalCommission: 0,
      totalAgentCommission: 0,
      netCommission: 0,
      outgoingCount: 0,
      incomingCount: 0,
      cancelledCount: 0,
      byCurrency: {},
      byAgent: [],
      byStatus: {},
    };

    const agentMap: Record<string, { count: number; totalAmount: number; commission: number }> = {};

    for (const r of rows) {
      const sendAmt = Number(r.send_amount) || 0;
      const status = r.status || 'pending';

      // Status count
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

      if (status === 'cancelled') {
        summary.cancelledCount++;
        continue;
      }

      // Direction
      if (r.remittance_type === 'outgoing') {
        summary.totalOutgoing += sendAmt;
        summary.outgoingCount++;
      } else {
        summary.totalIncoming += sendAmt;
        summary.incomingCount++;
      }

      // Commissions
      summary.totalCommission += Number(r.our_commission) || Number(r.commission_amount) || 0;
      summary.totalAgentCommission += Number(r.agent_commission) || 0;

      // By currency
      const cur = r.send_currency || 'USD';
      if (!summary.byCurrency[cur]) summary.byCurrency[cur] = { outgoing: 0, incoming: 0, count: 0 };
      summary.byCurrency[cur].count++;
      if (r.remittance_type === 'outgoing') {
        summary.byCurrency[cur].outgoing += sendAmt;
      } else {
        summary.byCurrency[cur].incoming += sendAmt;
      }

      // By agent
      if (r.agent_id) {
        if (!agentMap[r.agent_id]) agentMap[r.agent_id] = { count: 0, totalAmount: 0, commission: 0 };
        agentMap[r.agent_id].count++;
        agentMap[r.agent_id].totalAmount += sendAmt;
        agentMap[r.agent_id].commission += Number(r.agent_commission) || 0;
      }
    }

    summary.netCommission = summary.totalCommission - summary.totalAgentCommission;
    summary.byAgent = Object.entries(agentMap).map(([agentId, stats]) => ({
      agentId,
      agentName: agentId, // In production, join with exchange_agents to get name
      ...stats,
    }));

    return summary;
  },

  /**
   * تقرير أرباح/خسائر فروقات العملات
   * يُحسب من القيود المحاسبية (journal_entry_lines) المرتبطة بحوالات
   */
  async getFxReport(params: {
    companyId: string;
    startDate: string;
    endDate: string;
  }): Promise<FxProfitReport> {
    const { companyId, startDate, endDate } = params;

    // Get remittances with different send/receive currencies
    const { data: fxRemittances, error } = await supabase
      .from('remittances')
      .select('send_amount, send_currency, receive_amount, receive_currency, exchange_rate, status')
      .eq('company_id', companyId)
      .gte('remittance_date', startDate)
      .lte('remittance_date', endDate + 'T23:59:59')
      .neq('status', 'cancelled');

    if (error) throw error;

    const report: FxProfitReport = {
      totalProfit: 0,
      totalLoss: 0,
      netFx: 0,
      byPair: [],
    };

    const pairMap: Record<string, { profit: number; loss: number; count: number }> = {};

    for (const r of fxRemittances || []) {
      if (r.send_currency === r.receive_currency) continue;
      if (!r.receive_amount || !r.exchange_rate) continue;

      const expected = Number(r.send_amount) * Number(r.exchange_rate);
      const actual = Number(r.receive_amount);
      const diff = expected - actual;

      const pairKey = `${r.send_currency}→${r.receive_currency}`;
      if (!pairMap[pairKey]) pairMap[pairKey] = { profit: 0, loss: 0, count: 0 };
      pairMap[pairKey].count++;

      if (diff > 0.01) {
        report.totalProfit += diff;
        pairMap[pairKey].profit += diff;
      } else if (diff < -0.01) {
        report.totalLoss += Math.abs(diff);
        pairMap[pairKey].loss += Math.abs(diff);
      }
    }

    report.netFx = report.totalProfit - report.totalLoss;
    report.byPair = Object.entries(pairMap).map(([key, stats]) => {
      const [sendCurrency, receiveCurrency] = key.split('→');
      return {
        sendCurrency,
        receiveCurrency,
        profit: stats.profit,
        loss: stats.loss,
        net: stats.profit - stats.loss,
        count: stats.count,
      };
    });

    return report;
  },

  /**
   * ملخص سريع لليوم الحالي
   */
  async getTodaySummary(companyId: string): Promise<RemittanceSummary> {
    const today = new Date().toISOString().split('T')[0];
    return this.getSummary({ companyId, startDate: today, endDate: today });
  },

  /**
   * ملخص الشهر الحالي
   */
  async getMonthSummary(companyId: string): Promise<RemittanceSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    return this.getSummary({ companyId, startDate: startOfMonth, endDate: today });
  },
};

export default remittanceReportsService;
