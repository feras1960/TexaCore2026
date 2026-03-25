/**
 * ════════════════════════════════════════════════════════════════
 * 🛡️ remittanceLimitsService — التحقق من حدود المعاملات
 * ════════════════════════════════════════════════════════════════
 *
 * يتحقق من:
 *   1. حد المعاملة الواحدة (single_transaction_limit)
 *   2. الحد اليومي لكل عميل (daily_limit_per_customer)
 *   3. الحد الشهري لكل عميل (monthly_limit_per_customer)
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface LimitCheckResult {
  allowed: boolean;
  violations: LimitViolation[];
}

export interface LimitViolation {
  type: 'single_transaction' | 'daily_limit' | 'monthly_limit';
  limit: number;
  current: number;
  attempted: number;
  currency: string;
  messageAr: string;
  messageEn: string;
}

export const remittanceLimitsService = {
  /**
   * التحقق من حدود المعاملات قبل إنشاء حوالة
   */
  async checkLimits(params: {
    companyId: string;
    senderCustomerId?: string;
    sendAmount: number;
    sendCurrency: string;
  }): Promise<LimitCheckResult> {
    const { companyId, senderCustomerId, sendAmount, sendCurrency } = params;
    const violations: LimitViolation[] = [];

    try {
      // ─── 1. Load exchange_settings limits ────────────────────
      const { data: settings } = await supabase
        .from('exchange_settings')
        .select('single_transaction_limit, daily_limit_per_customer, monthly_limit_per_customer')
        .eq('company_id', companyId)
        .maybeSingle();

      if (!settings) return { allowed: true, violations: [] };

      const singleLimit = Number(settings.single_transaction_limit) || 0;
      const dailyLimit = Number(settings.daily_limit_per_customer) || 0;
      const monthlyLimit = Number(settings.monthly_limit_per_customer) || 0;

      // ─── 2. Check single transaction limit ──────────────────
      if (singleLimit > 0 && sendAmount > singleLimit) {
        violations.push({
          type: 'single_transaction',
          limit: singleLimit,
          current: 0,
          attempted: sendAmount,
          currency: sendCurrency,
          messageAr: `المبلغ ${sendAmount.toLocaleString()} يتجاوز حد المعاملة الواحدة (${singleLimit.toLocaleString()} ${sendCurrency})`,
          messageEn: `Amount ${sendAmount.toLocaleString()} exceeds single transaction limit (${singleLimit.toLocaleString()} ${sendCurrency})`,
        });
      }

      // ─── 3. Check daily & monthly limits (need customer) ────
      if (senderCustomerId && (dailyLimit > 0 || monthlyLimit > 0)) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        // Get today's total for this customer
        if (dailyLimit > 0) {
          const { data: dailyTotal } = await supabase
            .from('remittances')
            .select('send_amount')
            .eq('company_id', companyId)
            .eq('sender_customer_id', senderCustomerId)
            .gte('remittance_date', startOfDay)
            .not('status', 'eq', 'cancelled');

          const todaySum = (dailyTotal || []).reduce((s, r) => s + (Number(r.send_amount) || 0), 0);
          if (todaySum + sendAmount > dailyLimit) {
            violations.push({
              type: 'daily_limit',
              limit: dailyLimit,
              current: todaySum,
              attempted: sendAmount,
              currency: sendCurrency,
              messageAr: `المجموع اليومي (${(todaySum + sendAmount).toLocaleString()}) يتجاوز الحد اليومي (${dailyLimit.toLocaleString()} ${sendCurrency})`,
              messageEn: `Daily total (${(todaySum + sendAmount).toLocaleString()}) exceeds daily limit (${dailyLimit.toLocaleString()} ${sendCurrency})`,
            });
          }
        }

        // Get this month's total for this customer
        if (monthlyLimit > 0) {
          const { data: monthlyTotal } = await supabase
            .from('remittances')
            .select('send_amount')
            .eq('company_id', companyId)
            .eq('sender_customer_id', senderCustomerId)
            .gte('remittance_date', startOfMonth)
            .not('status', 'eq', 'cancelled');

          const monthSum = (monthlyTotal || []).reduce((s, r) => s + (Number(r.send_amount) || 0), 0);
          if (monthSum + sendAmount > monthlyLimit) {
            violations.push({
              type: 'monthly_limit',
              limit: monthlyLimit,
              current: monthSum,
              attempted: sendAmount,
              currency: sendCurrency,
              messageAr: `المجموع الشهري (${(monthSum + sendAmount).toLocaleString()}) يتجاوز الحد الشهري (${monthlyLimit.toLocaleString()} ${sendCurrency})`,
              messageEn: `Monthly total (${(monthSum + sendAmount).toLocaleString()}) exceeds monthly limit (${monthlyLimit.toLocaleString()} ${sendCurrency})`,
            });
          }
        }
      }

      return {
        allowed: violations.length === 0,
        violations,
      };
    } catch (err) {
      console.error('[RemittanceLimits] Check failed:', err);
      // On error, allow the transaction (don't block business)
      return { allowed: true, violations: [] };
    }
  },
};

export default remittanceLimitsService;
