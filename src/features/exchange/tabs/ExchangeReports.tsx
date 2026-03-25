/**
 * ════════════════════════════════════════════════════════════════
 * 📊 ExchangeReports — تقارير الصرافة والحوالات
 * ════════════════════════════════════════════════════════════════
 * V1 — Dashboard-style reports with:
 *   • Daily/Monthly summary
 *   • Revenue breakdown (commissions, FX)
 *   • Agent performance
 *   • Currency pair analytics
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { remittanceReportsService, type RemittanceSummary, type FxProfitReport } from '../services/remittanceReportsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight,
  ArrowDownLeft, Calendar, BarChart3, PieChart, Activity, 
  Wallet, RefreshCw, Loader2, Globe,
} from 'lucide-react';

const fmt = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═══════════════════════════════════════════════════════════════
export default function ExchangeReports() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useCompany();

  // Date range
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');

  // Quick period setter
  const setQuickPeriod = (p: 'today' | 'week' | 'month') => {
    setPeriod(p);
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = end;
    if (p === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.toISOString().split('T')[0];
    } else if (p === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    setStartDate(start);
    setEndDate(end);
  };

  // ─── Fetch Summary ──────────────────────────────────────────
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['exchange_report_summary', companyId, startDate, endDate],
    queryFn: () => remittanceReportsService.getSummary({ companyId: companyId!, startDate, endDate }),
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Fetch FX Report ────────────────────────────────────────
  const { data: fxReport, isLoading: loadingFx } = useQuery({
    queryKey: ['exchange_report_fx', companyId, startDate, endDate],
    queryFn: () => remittanceReportsService.getFxReport({ companyId: companyId!, startDate, endDate }),
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const isLoading = loadingSummary || loadingFx;
  const s = summary || {
    totalOutgoing: 0, totalIncoming: 0, totalCommission: 0,
    totalAgentCommission: 0, netCommission: 0, outgoingCount: 0,
    incomingCount: 0, cancelledCount: 0, byCurrency: {}, byAgent: [], byStatus: {},
  } as RemittanceSummary;

  const fx = fxReport || { totalProfit: 0, totalLoss: 0, netFx: 0, byPair: [] } as FxProfitReport;

  const totalTxns = s.outgoingCount + s.incomingCount;
  const totalVolume = s.totalOutgoing + s.totalIncoming;

  // Status distribution
  const statusData = useMemo(() => {
    const statuses = [
      { key: 'pending', ar: 'قيد الانتظار', en: 'Pending', color: 'bg-amber-400' },
      { key: 'processing', ar: 'قيد المعالجة', en: 'Processing', color: 'bg-blue-400' },
      { key: 'sent', ar: 'تم الإرسال', en: 'Sent', color: 'bg-indigo-400' },
      { key: 'delivered', ar: 'تم التسليم', en: 'Delivered', color: 'bg-emerald-400' },
      { key: 'completed', ar: 'مكتمل', en: 'Completed', color: 'bg-green-500' },
      { key: 'cancelled', ar: 'ملغي', en: 'Cancelled', color: 'bg-red-400' },
    ];
    return statuses
      .map(st => ({ ...st, count: s.byStatus[st.key] || 0 }))
      .filter(st => st.count > 0);
  }, [s.byStatus]);

  const totalStatusCount = statusData.reduce((a, b) => a + b.count, 0) || 1;

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ═══ PERIOD SELECTOR ═══ */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {isAr ? 'فترة التقرير' : 'Report Period'}
              </span>
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {[
                  { key: 'today' as const, ar: 'اليوم', en: 'Today' },
                  { key: 'week' as const, ar: 'أسبوع', en: 'Week' },
                  { key: 'month' as const, ar: 'الشهر', en: 'Month' },
                ].map(p => (
                  <Button
                    key={p.key}
                    variant={period === p.key ? 'default' : 'ghost'}
                    size="sm"
                    className={cn("h-7 text-xs px-3", period === p.key && "shadow-sm")}
                    onClick={() => setQuickPeriod(p.key)}
                  >
                    {isAr ? p.ar : p.en}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setPeriod('custom'); }}
                className="h-8 text-xs w-36"
              />
              <span className="text-gray-400 text-xs">→</span>
              <Input
                type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setPeriod('custom'); }}
                className="h-8 text-xs w-36"
              />
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => refetchSummary()}>
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ KPI CARDS (4 main) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <Card className="bg-gradient-to-br from-violet-50 via-violet-100/50 to-purple-50 dark:from-violet-950/40 dark:via-violet-900/20 dark:to-purple-950/30 border-violet-200/50 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-violet-200/20 dark:bg-violet-500/10 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-violet-600/70 dark:text-violet-400/70 font-semibold mb-1">
                  {isAr ? 'إجمالي الحجم' : 'Total Volume'}
                </p>
                <p className="text-2xl font-bold text-violet-800 dark:text-violet-300">{fmt(totalVolume)}</p>
                <p className="text-[11px] text-violet-500 mt-1 font-medium">{totalTxns} {isAr ? 'حوالة' : 'transactions'}</p>
              </div>
              <div className="p-2.5 bg-violet-500/15 rounded-xl">
                <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Commission (Revenue) */}
        <Card className="bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-green-50 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-green-950/30 border-emerald-200/50 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-emerald-200/20 dark:bg-emerald-500/10 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold mb-1">
                  {isAr ? 'صافي الإيرادات' : 'Net Revenue'}
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{fmt(s.netCommission)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-emerald-500">{isAr ? 'عمولتنا' : 'Ours'}: {fmt(s.totalCommission)}</span>
                  <span className="text-[11px] text-red-400">- {isAr ? 'وكلاء' : 'Agents'}: {fmt(s.totalAgentCommission)}</span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-500/15 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outgoing */}
        <Card className="bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/20 dark:to-amber-950/30 border-orange-200/50 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-orange-200/20 dark:bg-orange-500/10 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70 font-semibold mb-1">
                  {isAr ? 'صادرة' : 'Outgoing'}
                </p>
                <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">{fmt(s.totalOutgoing)}</p>
                <p className="text-[11px] text-orange-500 mt-1 font-medium">{s.outgoingCount} {isAr ? 'حوالة' : 'txn'}</p>
              </div>
              <div className="p-2.5 bg-orange-500/15 rounded-xl">
                <ArrowUpRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incoming */}
        <Card className="bg-gradient-to-br from-teal-50 via-teal-100/50 to-cyan-50 dark:from-teal-950/40 dark:via-teal-900/20 dark:to-cyan-950/30 border-teal-200/50 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-teal-200/20 dark:bg-teal-500/10 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-teal-600/70 dark:text-teal-400/70 font-semibold mb-1">
                  {isAr ? 'واردة' : 'Incoming'}
                </p>
                <p className="text-2xl font-bold text-teal-800 dark:text-teal-300">{fmt(s.totalIncoming)}</p>
                <p className="text-[11px] text-teal-500 mt-1 font-medium">{s.incomingCount} {isAr ? 'حوالة' : 'txn'}</p>
              </div>
              <div className="p-2.5 bg-teal-500/15 rounded-xl">
                <ArrowDownLeft className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 2: Status Distribution + Currency Breakdown ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Status Distribution */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <PieChart className="w-4 h-4 text-violet-500" />
              {isAr ? 'توزيع الحالات' : 'Status Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {statusData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
            ) : (
              <div className="space-y-3">
                {/* Visual bar */}
                <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {statusData.map(st => (
                    <div
                      key={st.key}
                      className={cn("h-full transition-all", st.color)}
                      style={{ width: `${(st.count / totalStatusCount) * 100}%` }}
                      title={`${isAr ? st.ar : st.en}: ${st.count}`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {statusData.map(st => (
                    <div key={st.key} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", st.color)} />
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{isAr ? st.ar : st.en}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{st.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency Breakdown */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Globe className="w-4 h-4 text-blue-500" />
              {isAr ? 'تحليل العملات' : 'Currency Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {Object.keys(s.byCurrency).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(s.byCurrency)
                  .sort(([, a], [, b]) => (b.outgoing + b.incoming) - (a.outgoing + a.incoming))
                  .map(([currency, data]) => (
                    <div key={currency} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                            {currency}
                          </Badge>
                          <span className="text-[11px] text-gray-400">{data.count} {isAr ? 'حوالة' : 'txn'}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {fmt(data.outgoing + data.incoming)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-orange-500 font-medium flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          {isAr ? 'صادرة' : 'Out'}: {fmt(data.outgoing)}
                        </span>
                        <span className="text-teal-500 font-medium flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" />
                          {isAr ? 'واردة' : 'In'}: {fmt(data.incoming)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 3: FX P&L + Agent Performance ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* FX Profit/Loss */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Activity className="w-4 h-4 text-amber-500" />
              {isAr ? 'أرباح/خسائر أسعار الصرف' : 'FX Profit & Loss'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmt(fx.totalProfit)}</p>
                <p className="text-[10px] text-emerald-500 font-medium">{isAr ? 'أرباح' : 'Profit'}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700 dark:text-red-400">{fmt(fx.totalLoss)}</p>
                <p className="text-[10px] text-red-500 font-medium">{isAr ? 'خسائر' : 'Loss'}</p>
              </div>
              <div className={cn("rounded-lg p-3 text-center", fx.netFx >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20")}>
                <DollarSign className={cn("w-4 h-4 mx-auto mb-1", fx.netFx >= 0 ? "text-emerald-500" : "text-red-500")} />
                <p className={cn("text-lg font-bold", fx.netFx >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>{fmt(fx.netFx)}</p>
                <p className="text-[10px] text-gray-500 font-medium">{isAr ? 'صافي' : 'Net'}</p>
              </div>
            </div>

            {/* By Pair */}
            {fx.byPair.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">{isAr ? 'حسب زوج العملات' : 'By Currency Pair'}</p>
                {fx.byPair.map((pair, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <Badge variant="outline" className="text-[10px] font-mono px-2">
                      {pair.sendCurrency} → {pair.receiveCurrency}
                    </Badge>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-400">{pair.count} txn</span>
                      <span className={cn("font-bold", pair.net >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {pair.net >= 0 ? '+' : ''}{fmt(pair.net)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Users className="w-4 h-4 text-indigo-500" />
              {isAr ? 'أداء الوكلاء' : 'Agent Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {s.byAgent.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{isAr ? 'لا توجد حوالات مرتبطة بوكلاء' : 'No agent-linked remittances'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.byAgent
                  .sort((a, b) => b.totalAmount - a.totalAmount)
                  .map((agent, i) => (
                    <div key={agent.agentId} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[11px] font-bold text-indigo-600">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{agent.agentName}</p>
                            <p className="text-[10px] text-gray-400">{agent.count} {isAr ? 'حوالة' : 'transactions'}</p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{fmt(agent.totalAmount)}</p>
                          <p className="text-[10px] text-emerald-500 font-medium">
                            {isAr ? 'عمولة' : 'Commission'}: {fmt(agent.commission)}
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (agent.totalAmount / (s.totalOutgoing || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 4: Revenue Breakdown ═══ */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Wallet className="w-4 h-4 text-emerald-500" />
            {isAr ? 'تحليل الإيرادات' : 'Revenue Analysis'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: isAr ? 'إيرادات العمولات' : 'Commission Revenue', value: s.totalCommission, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: isAr ? 'تكلفة الوكلاء' : 'Agent Cost', value: -s.totalAgentCommission, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
              { label: isAr ? 'صافي العمولات' : 'Net Commission', value: s.netCommission, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: isAr ? 'أرباح FX' : 'FX Profit', value: fx.netFx, color: fx.netFx >= 0 ? 'text-emerald-600' : 'text-red-500', bg: fx.netFx >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20' },
              { label: isAr ? 'إجمالي الأرباح' : 'Total Profit', value: s.netCommission + fx.netFx, color: 'text-violet-700', bg: 'bg-violet-50 dark:bg-violet-900/20' },
            ].map((item, i) => (
              <div key={i} className={cn("rounded-xl p-4 text-center", item.bg)}>
                <p className="text-[11px] text-gray-500 font-semibold mb-1">{item.label}</p>
                <p className={cn("text-xl font-bold", item.color)}>{item.value < 0 ? '-' : ''}{fmt(Math.abs(item.value))}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
