/**
 * ════════════════════════════════════════════════════════════════
 * 📊 ExchangeDashboard — لوحة تحكم الصرافة
 * ════════════════════════════════════════════════════════════════
 * V1 — Stats + Recent Operations + Alerts + Currency Rates
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowRightLeft, Send, Users, Building, Handshake,
  Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle,
  DollarSign, Euro, Banknote, Activity,
} from 'lucide-react';

const fmtNum = (n: number) => n.toLocaleString('en-US');
const fmtAmt = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═══════════════════════════════════════════════════════════════
export default function ExchangeDashboard() {
  const { t } = useLanguage();
  const { companyId } = useCompany();

  // ─── Fetch Summary Counts ──────────────────────────────────
  const { data: summary, isLoading } = useQuery({
    queryKey: ['exchange_dashboard', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Safe query helper — returns {count:0, data:[]} if table doesn't exist
      const safeQuery = async (query: any) => {
        try {
          const result = await query;
          if (result.error) return { count: 0, data: [] };
          return result;
        } catch {
          return { count: 0, data: [] };
        }
      };

      const [ops, rem, agents, partners, customers] = await Promise.all([
        safeQuery(supabase.from('exchange_transactions').select('id', { count: 'exact', head: true }).eq('company_id', companyId)),
        // remittances table not yet created — return empty
        Promise.resolve({ count: 0, data: [] }),
        safeQuery(supabase.from('exchange_agents').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active')),
        safeQuery(supabase.from('exchange_partners').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active')),
        // customers/parties table not yet available — return empty
        Promise.resolve({ count: 0, data: [] }),
      ]);

      const pendingRemittances = (rem.data || []).filter((r: any) => r.status === 'pending' || r.status === 'processing').length;

      return {
        totalOperations: ops.count || 0,
        totalRemittances: rem.count || 0,
        pendingRemittances,
        activeAgents: agents.count || 0,
        activePartners: partners.count || 0,
        activeCustomers: customers.count || 0,
      };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Fetch Recent Operations ──────────────────────────────
  const { data: recentOps = [] } = useQuery({
    queryKey: ['exchange_recent_ops', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        const { data, error } = await supabase
          .from('exchange_transactions')
          .select('id, transaction_number, transaction_type, from_currency, to_currency, from_amount, to_amount, status, transaction_date, customer_name')
          .eq('company_id', companyId)
          .order('transaction_date', { ascending: false })
          .limit(5);
        if (error) return [];
        return data || [];
      } catch { return []; }
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Fetch Recent Remittances ──────────────────────────────
  const { data: recentRemittances = [] } = useQuery({
    queryKey: ['exchange_recent_rem', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // remittances table not yet created — return empty
      return [];
      // try {
      //   const { data, error } = await supabase
      //     .from('remittances')
      //     .select('id, remittance_number, remittance_type, sender_name, receiver_name, amount, currency, status, remittance_date')
      //     .eq('company_id', companyId)
      //     .order('remittance_date', { ascending: false })
      //     .limit(5);
      //   if (error) return [];
      //   return data || [];
      // } catch { return []; }
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const s = summary || { totalOperations: 0, totalRemittances: 0, pendingRemittances: 0, activeAgents: 0, activePartners: 0, activeCustomers: 0 };

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ═══ Main Stats (6 Cards) ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: ArrowRightLeft, label: t('exchange.dashboard.totalOperations'), value: fmtNum(s.totalOperations), color: 'amber', gradient: 'from-amber-50 to-amber-100/50' },
          { icon: Send,           label: t('exchange.dashboard.totalRemittances'), value: fmtNum(s.totalRemittances), color: 'blue', gradient: 'from-blue-50 to-blue-100/50' },
          { icon: Clock,          label: t('exchange.dashboard.pendingRemittances'), value: fmtNum(s.pendingRemittances), color: 'red', gradient: 'from-red-50 to-red-100/50' },
          { icon: Users,          label: t('exchange.dashboard.activeCustomers'), value: fmtNum(s.activeCustomers), color: 'emerald', gradient: 'from-emerald-50 to-emerald-100/50' },
          { icon: Building,       label: t('exchange.dashboard.activeAgents'), value: fmtNum(s.activeAgents), color: 'violet', gradient: 'from-violet-50 to-violet-100/50' },
          { icon: Handshake,      label: t('exchange.dashboard.activePartners'), value: fmtNum(s.activePartners), color: 'teal', gradient: 'from-teal-50 to-teal-100/50' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className={cn("bg-gradient-to-br dark:from-gray-900/50", stat.gradient, `border-${stat.color}-200/50`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn("text-[10px] font-tajawal", `text-${stat.color}-600/70`)}>{stat.label}</p>
                    <p className={cn("text-xl font-bold mt-1", `text-${stat.color}-700`)}>{stat.value}</p>
                  </div>
                  <div className={cn("p-2 rounded-xl", `bg-${stat.color}-500/10`)}>
                    <Icon className={cn("w-4 h-4", `text-${stat.color}-600`)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══ Two Column Layout ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Operations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
              {t('exchange.dashboard.recentOperations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentOps.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-300">
                <Activity className="w-8 h-8 mb-2" />
                <p className="text-xs">{t('exchange.dashboard.noRecentOps')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOps.map((op: any) => (
                  <div key={op.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        op.transaction_type === 'buy' ? "bg-emerald-50" : "bg-red-50"
                      )}>
                        {op.transaction_type === 'buy'
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {op.transaction_number}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {op.from_currency} → {op.to_currency}
                          {op.customer_name && ` • ${op.customer_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {fmtAmt(op.from_amount)}
                      </p>
                      <p className="text-[10px] text-gray-400">{op.from_currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Remittances */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-blue-500" />
              {t('exchange.dashboard.recentRemittances')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentRemittances.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-300">
                <Send className="w-8 h-8 mb-2" />
                <p className="text-xs">{t('exchange.dashboard.noRecentRem')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRemittances.map((rem: any) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    processing: 'bg-blue-50 text-blue-700 border-blue-200',
                    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    delivered: 'bg-green-50 text-green-700 border-green-200',
                    cancelled: 'bg-red-50 text-red-600 border-red-200',
                  };
                  return (
                    <div key={rem.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          rem.remittance_type === 'outgoing' ? "bg-indigo-50" : "bg-teal-50"
                        )}>
                          <Send className={cn("w-3.5 h-3.5", rem.remittance_type === 'outgoing' ? "text-indigo-600" : "text-teal-600")} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {rem.remittance_number}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[150px]">
                            {rem.sender_name} → {rem.receiver_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusColors[rem.status] || statusColors.pending)}>
                          {t(`exchange.remittances.status.${rem.status}`)}
                        </Badge>
                        <div className="text-end">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {fmtAmt(rem.amount || 0)}
                          </p>
                          <p className="text-[10px] text-gray-400">{rem.currency}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Alerts / Notifications ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {t('exchange.dashboard.alerts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {s.pendingRemittances > 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t('exchange.dashboard.pendingAlert')}
                </p>
                <p className="text-xs text-amber-600/70 mt-0.5">
                  {s.pendingRemittances} {t('exchange.dashboard.remittancesNeedAction')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-gray-300">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-xs">{t('exchange.dashboard.noAlerts')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
