/**
 * ════════════════════════════════════════════════════════════════
 * 💱 ExchangeOperations — تبويب عمليات الصرف
 * ════════════════════════════════════════════════════════════════
 * V1 — NexaListTable + Buy/Sell filter + Stats
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useExchangeFilters } from '../hooks/useExchangeFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  ArrowRightLeft, ArrowDownRight, ArrowUpRight, Plus,
  TrendingUp, DollarSign, Receipt, Banknote,
} from 'lucide-react';

interface ExchangeTransaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: 'buy' | 'sell';
  customer_name?: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  commission_amount: number;
  profit_amount: number;
  status: string;
  created_at: string;
}

const fmtAmount = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRate = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });

export default function ExchangeOperations() {
  const { t, language } = useLanguage();
  const { companyId } = useCompany();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [sortField, setSortField] = useState('transaction_date');
  const [sortAsc, setSortAsc] = useState(false);

  // ─── Exchange Filters (shared hook) ─────────────────────────
  const { currencyFilterNode } = useExchangeFilters({ storageKey: 'exchange_operations' });

  useRealtimeInvalidation({
    table: 'exchange_transactions',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['exchange_transactions']],
  });

  const { data: transactions = [], isLoading } = useCachedQuery({
    queryKey: ['exchange_transactions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('exchange_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ExchangeTransaction[];
    },
    enabled: !!companyId,
    staleTime: 15_000,
  });

  const filteredData = useMemo(() => {
    let result = transactions;
    if (typeFilter !== 'all') {
      result = result.filter(t => t.transaction_type === typeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.transaction_number || '').toLowerCase().includes(q) ||
        (t.customer_name || '').toLowerCase().includes(q) ||
        (t.from_currency || '').toLowerCase().includes(q) ||
        (t.to_currency || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, typeFilter, searchTerm]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxns = transactions.filter(t =>
      t.transaction_date?.startsWith(today) && t.status === 'completed'
    );
    return {
      total: transactions.length,
      todayCount: todayTxns.length,
      todayProfit: todayTxns.reduce((s, t) => s + (t.profit_amount || 0), 0),
      totalProfit: transactions.filter(t => t.status === 'completed').reduce((s, t) => s + (t.profit_amount || 0), 0),
    };
  }, [transactions]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(false); }
  }, [sortField]);

  const columns: NexaListColumn<ExchangeTransaction>[] = useMemo(() => [
    {
      id: 'number',
      header: '#',
      width: '110px',
      sortable: true,
      sortKey: 'transaction_number',
      cell: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.transaction_number}</span>
      ),
    },
    {
      id: 'type',
      header: t('exchange.common.type'),
      width: '80px',
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-[10px] px-2 py-0.5 gap-1",
            row.transaction_type === 'buy'
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          )}
        >
          {row.transaction_type === 'buy'
            ? <><ArrowDownRight className="w-3 h-3" />{t('exchange.operations.buy')}</>
            : <><ArrowUpRight className="w-3 h-3" />{t('exchange.operations.sell')}</>}
        </Badge>
      ),
    },
    {
      id: 'customer',
      header: t('exchange.common.customer'),
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.customer_name || t('exchange.operations.cash')}
        </span>
      ),
    },
    {
      id: 'from',
      header: t('exchange.operations.from'),
      width: '130px',
      align: 'end' as const,
      cell: (row) => (
        <div className="text-end">
          <span className="text-sm font-medium">{fmtAmount(row.from_amount)}</span>
          <span className="text-[10px] text-gray-400 ms-1">{row.from_currency}</span>
        </div>
      ),
    },
    {
      id: 'rate',
      header: t('exchange.operations.rate'),
      width: '100px',
      align: 'center' as const,
      cell: (row) => (
        <span className="text-xs font-mono text-gray-500">{fmtRate(row.exchange_rate)}</span>
      ),
    },
    {
      id: 'to',
      header: t('exchange.operations.to'),
      width: '130px',
      align: 'end' as const,
      cell: (row) => (
        <div className="text-end">
          <span className="text-sm font-medium">{fmtAmount(row.to_amount)}</span>
          <span className="text-[10px] text-gray-400 ms-1">{row.to_currency}</span>
        </div>
      ),
    },
    {
      id: 'profit',
      header: t('exchange.operations.profit'),
      width: '100px',
      align: 'end' as const,
      cell: (row) => (
        <span className={cn("text-xs font-semibold", row.profit_amount > 0 ? "text-emerald-600" : "text-gray-400")}>
          {row.profit_amount > 0 ? `+${fmtAmount(row.profit_amount)}` : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('fields.status'),
      width: '80px',
      cell: (row) => {
        const cfg: Record<string, { l: string; c: string }> = {
          completed: { l: t('exchange.status.done'), c: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          pending: { l: t('exchange.status.pending'), c: 'bg-amber-50 text-amber-700 border-amber-200' },
          cancelled: { l: t('exchange.status.cancelled'), c: 'bg-red-50 text-red-600 border-red-200' },
        };
        const s = cfg[row.status] || cfg.completed;
        return <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", s.c)}>{s.l}</Badge>;
      },
    },
  ], [language]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600/70 font-tajawal">{t('exchange.stats.totalOperations')}</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-xl"><Receipt className="w-5 h-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 font-tajawal">{t('exchange.stats.todayOperations')}</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.todayCount}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl"><ArrowRightLeft className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600/70 font-tajawal">{t('exchange.stats.todayProfit')}</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{fmtAmount(stats.todayProfit)}</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 border-purple-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600/70 font-tajawal">{t('exchange.stats.totalProfit')}</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{fmtAmount(stats.totalProfit)}</p>
              </div>
              <div className="p-2.5 bg-purple-500/10 rounded-xl"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type filter + action button */}
      <div className="flex items-center justify-between gap-3">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">{t('exchange.operations.all')}</TabsTrigger>
            <TabsTrigger value="buy" className="text-xs px-3 h-7 gap-1">
              <ArrowDownRight className="w-3 h-3" />{t('exchange.operations.buy')}
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-xs px-3 h-7 gap-1">
              <ArrowUpRight className="w-3 h-3" />{t('exchange.operations.sell')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" className="bg-erp-teal hover:bg-erp-teal/90 text-white gap-1.5">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('exchange.operations.newOperation')}</span>
        </Button>
      </div>

      {/* Table */}
      <NexaListTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('exchange.operations.searchPlaceholder')}
        totalCount={transactions.length}
        countLabel={t('exchange.operations.countLabel')}
        onRowClick={() => {}}
        onSort={handleSort}
        sortField={sortField}
        sortAsc={sortAsc}
        getRowKey={(row) => row.id}
        emptyIcon={<ArrowRightLeft className="w-12 h-12 text-gray-300" />}
        emptyMessage={t('exchange.operations.noOperations')}
        toolbarEndContent={currencyFilterNode}
        showFooter={true}
      />
    </div>
  );
}
