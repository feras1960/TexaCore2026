/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 AgentsPage — تبويب الوكلاء
 * ════════════════════════════════════════════════════════════════
 * V1 — NexaListTable + CRUD + Sheet
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { agentService, type ExchangeAgent } from '../services/agentService';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useExchangeFilters } from '../hooks/useExchangeFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Building, Plus,
  CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';

function getLocalizedName(row: any, lang: string): string {
  const nameMap: Record<string, string> = {
    ar: row.name_ar, en: row.name_en, tr: row.name_tr,
    ru: row.name_ru, uk: row.name_uk,
  };
  return nameMap[lang] || row.name_en || row.name_ar || '';
}

function daysSince(date: string | undefined, t: (key: string) => string): string {
  if (!date) return '—';
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t('exchange.agents.today');
  if (diff === 1) return t('exchange.agents.yesterday');
  return `${diff} ${t('exchange.agents.daysAgo')}`;
}

// ═══════════════════════════════════════════════════════════════
export default function AgentsPage() {
  const { t, language } = useLanguage();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ExchangeAgent | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [createKey, setCreateKey] = useState(0); // Forces sheet remount on each open

  // ─── Memoized data for sheets (prevent re-render resets) ───
  const createSheetData = useRef({
    _partyType: 'agent' as const,
    _partyLabel: 'agent' as const,
    _exchangeContext: true,
    is_active: true,
  }).current;

  // ─── Exchange Filters (shared hook) ─────────────────────────
  const { currencyFilterNode } = useExchangeFilters({ storageKey: 'exchange_agents' });

  // 🔄 Realtime
  useRealtimeInvalidation({
    table: 'exchange_agents',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['exchange_agents']],
  });

  // ─── Fetch ────────────────────────────────────────────────
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['exchange_agents', companyId, language],
    queryFn: async () => {
      if (!companyId) return [];
      const data = await agentService.getAll(companyId);
      return data.map(a => ({ ...a, name: getLocalizedName(a, language) }));
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Filter + Sort ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = agents;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.code || '').toLowerCase().includes(q) ||
        (a.name_ar || '').toLowerCase().includes(q) ||
        (a.phone || '').includes(q) ||
        (a.city || '').toLowerCase().includes(q) ||
        (a.country || '').toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a: any, b: any) => {
      const av = a[sortField] || '';
      const bv = b[sortField] || '';
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [agents, searchTerm, sortField, sortAsc]);

  // ─── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    needsReconciliation: agents.filter(a => {
      if (!a.last_reconciliation_date) return true;
      const days = (Date.now() - new Date(a.last_reconciliation_date).getTime()) / (1000 * 60 * 60 * 24);
      return days > 30;
    }).length,
  }), [agents]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(false); }
  }, [sortField]);

  const getRowAccent = useCallback((row: ExchangeAgent) => {
    if (row.status === 'suspended') return 'border-s-red-400';
    if (row.status === 'inactive') return 'border-s-gray-300';
    if (!row.last_reconciliation_date) return 'border-s-amber-400';
    return 'border-s-emerald-400';
  }, []);

  const fmt = useCallback((n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);

  const statusLabel = useCallback((s: string) => {
    const map: Record<string, { ar: string; en: string; cls: string }> = {
      draft: { ar: 'مسودة', en: 'Draft', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
      pending: { ar: 'بانتظار', en: 'Pending', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
      sent: { ar: 'منفذة', en: 'Sent', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
      delivered: { ar: 'مسلمة', en: 'Delivered', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
      cancelled: { ar: 'ملغاة', en: 'Cancelled', cls: 'bg-red-50 text-red-500 border-red-200' },
    };
    const cfg = map[s] || map.draft;
    return { label: language === 'ar' ? cfg.ar : cfg.en, cls: cfg.cls };
  }, [language]);

  // ─── Columns ─────────────────────────────────────────────────
  const columns: NexaListColumn<ExchangeAgent>[] = useMemo(() => [
    {
      id: 'code',
      header: t('exchange.common.code'),
      sortable: true,
      sortKey: 'code',
      width: '80px',
      cell: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.code}</span>
      ),
    },
    {
      id: 'name',
      header: t('exchange.common.name'),
      sortable: true,
      sortKey: 'name',
      cell: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {row.name || row.name_ar}
            </span>
            {row.currencies && row.currencies.length > 0 && (
              <div className="flex items-center gap-0.5">
                {row.currencies.slice(0, 2).map(c => (
                  <span key={c} className="text-[10px] font-mono font-medium px-1.5 py-0 rounded bg-blue-50 text-blue-600 border border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700/50">
                    {c}
                  </span>
                ))}
                {row.currencies.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{row.currencies.length - 2}</span>
                )}
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400">
            {row.agent_type === 'company'
              ? t('exchange.agents.company')
              : t('exchange.agents.individual')}
          </span>
        </div>
      ),
    },
    {
      id: 'balance',
      header: language === 'ar' ? 'الرصيد' : 'Balance',
      width: '140px',
      align: 'center' as const,
      sortable: true,
      sortKey: '_balance',
      cell: (row: any) => {
        const bal = row._balance || 0;
        const cur = row._balanceCurrency || '';
        if (bal === 0 && !row.payable_account_id) return <span className="text-xs text-gray-300">—</span>;
        const isNeg = bal < 0;
        return (
          <div className={cn("text-sm font-semibold font-mono", isNeg ? "text-red-600" : bal > 0 ? "text-emerald-600" : "text-gray-500")}>
            {fmt(Math.abs(bal))} <span className="text-[11px] opacity-70">{cur}</span>
          </div>
        );
      },
    },
    {
      id: 'lastRemittance',
      header: language === 'ar' ? 'آخر حوالة' : 'Last Remittance',
      width: '180px',
      cell: (row: any) => {
        const lr = row._lastRemittance;
        if (!lr) return <span className="text-xs text-gray-300">{language === 'ar' ? 'لا يوجد' : 'None'}</span>;
        const st = statusLabel(lr.status);
        const d = new Date(lr.created_at);
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-gray-600">{lr.remittance_number}</span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 leading-tight", st.cls)}>{st.label}</Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="font-medium">{fmt(lr.send_amount)} {lr.send_currency}</span>
              <span>• {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'totalRemittances',
      header: language === 'ar' ? 'إجمالي الحوالات' : 'Total',
      width: '100px',
      align: 'center' as const,
      sortable: true,
      sortKey: '_remittanceCount',
      cell: (row: any) => {
        if (!row._remittanceCount) return <span className="text-xs text-gray-300">0</span>;
        return (
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{row._remittanceCount}</span>
            <span className="text-[11px] text-gray-400">{fmt(row._remittanceTotal)} {row._balanceCurrency}</span>
          </div>
        );
      },
    },
    {
      id: 'commission',
      header: t('exchange.agents.commission'),
      width: '110px',
      align: 'center' as const,
      cell: (row: any) => {
        const rate = row.commission_rate;
        const totalComm = row._totalCommission || 0;
        return (
          <div className="flex flex-col items-center gap-0.5">
            {rate > 0 && (
              <span className="text-xs font-semibold text-indigo-600">{rate}%</span>
            )}
            {totalComm > 0 ? (
              <span className="text-xs text-gray-600 font-mono font-medium">{fmt(totalComm)}</span>
            ) : (
              !rate && <span className="text-xs text-gray-300">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'reconciliation',
      header: t('exchange.agents.lastReconciliation'),
      width: '100px',
      cell: (row) => {
        const days = row.last_reconciliation_date
          ? Math.floor((Date.now() - new Date(row.last_reconciliation_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const isOld = days !== null && days > 30;
        return (
          <div className={cn("flex items-center gap-1 text-xs", isOld ? "text-amber-600" : "text-gray-400")}>
            <Clock className="w-3 h-3" />
            <span>{row.last_reconciliation_date ? daysSince(row.last_reconciliation_date, t) : t('exchange.agents.never')}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('fields.status'),
      width: '80px',
      cell: (row) => {
        const statusConfig: Record<string, { label: string; cls: string }> = {
          active: { label: t('exchange.status.active'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          inactive: { label: t('exchange.status.inactive'), cls: 'bg-gray-50 text-gray-500 border-gray-200' },
          suspended: { label: t('exchange.status.suspended'), cls: 'bg-red-50 text-red-600 border-red-200' },
        };
        const cfg = statusConfig[row.status] || statusConfig.inactive;
        return <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", cfg.cls)}>{cfg.label}</Badge>;
      },
    },
  ], [language, fmt, statusLabel]);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 border-indigo-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600/70 font-tajawal">
                  {t('exchange.stats.totalAgents')}
                </p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 font-tajawal">
                  {t('exchange.stats.activeAgents')}
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{stats.active}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600/70 font-tajawal">
                  {t('exchange.stats.needsReconciliation')}
                </p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{stats.needsReconciliation}</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Main Table ═══ */}
      <NexaListTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('exchange.agents.searchPlaceholder')}
        totalCount={agents.length}
        countLabel={t('exchange.agents.countLabel')}
        onRowClick={(row) => {
          setSelectedAgent(row);
          setIsDetailSheetOpen(true);
        }}
        onSort={handleSort}
        sortField={sortField}
        sortAsc={sortAsc}
        getRowAccent={getRowAccent}
        getRowKey={(row) => row.id}
        emptyIcon={<Building className="w-12 h-12 text-gray-300" />}
        emptyMessage={t('exchange.agents.noAgents')}
        toolbarEndContent={
          <div className="flex items-center gap-2">
            {currencyFilterNode}
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-7 text-xs"
              onClick={() => setShowAddSheet(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('exchange.agents.newAgent')}
            </Button>
          </div>
        }
        showFooter={true}
      />

      {/* Agent Detail Sheet */}
      <UnifiedAccountingSheet
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false);
          setSelectedAgent(null);
        }}
        docType="exchange_agent"
        mode="view"
        data={selectedAgent ? Object.assign({}, selectedAgent, {
          is_active: selectedAgent.status === 'active',
          currency: (selectedAgent as any).currencies?.[0] || '',
          _partyType: 'agent',
          _partyLabel: 'agent',
          _exchangeContext: true,
        }) : null}
        companyId={companyId || undefined}
        onSave={async () => {
          queryClient.invalidateQueries({ queryKey: ['exchange_agents'] });
          setIsDetailSheetOpen(false);
          setSelectedAgent(null);
        }}
        onRefresh={() => {}}
        enableEditFlow
      />

      {/* Add New Agent Sheet */}
      <UnifiedAccountingSheet
        key={`create-agent-${createKey}`}
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        docType="exchange_agent"
        mode="create"
        data={createSheetData}
        companyId={companyId || undefined}
        onSave={async () => {
          queryClient.invalidateQueries({ queryKey: ['exchange_agents'] });
          setShowAddSheet(false);
          setCreateKey(k => k + 1);
        }}
        onRefresh={() => {}}
        enableEditFlow
      />
    </div>
  );
}
