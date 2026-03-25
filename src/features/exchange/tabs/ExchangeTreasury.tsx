/**
 * ════════════════════════════════════════════════════════════════
 * 💰 ExchangeTreasury — تبويب الصناديق والخزينة
 * ════════════════════════════════════════════════════════════════
 * V1 — يعرض حسابات الصناديق المرتبطة بالصرافة
 * يستخدم نفس بيانات FundsManagement لكن بعرض مخصص للصرافة
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useExchangeFilters } from '../hooks/useExchangeFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Wallet, Banknote, Building, Plus,
  TrendingUp, TrendingDown, ArrowRightLeft, Landmark,
} from 'lucide-react';

interface TreasuryAccount {
  id: string;
  account_number: string;
  name_ar: string;
  name_en?: string;
  account_type: string;
  currency?: string;
  parent_id?: string;
  is_active: boolean;
  balance: number;
  name?: string;
}

const fmtAmount = (n: number) => Math.abs(n).toLocaleString('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

// ═══════════════════════════════════════════════════════════════
export default function ExchangeTreasury() {
  const { t, language } = useLanguage();
  const { companyId } = useCompany();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('account_number');
  const [sortAsc, setSortAsc] = useState(true);

  // ─── Exchange Filters (shared hook) ─────────────────────────
  const {
    currencyFilterNode, isConverting, convertBalance,
    baseCurrency, displayCurrency, displayCurrencySymbol,
  } = useExchangeFilters({ storageKey: 'exchange_treasury' });

  // ─── Fetch treasury accounts (funds & banks under 111) ─────────
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['exchange_treasury', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Get fund/bank accounts (children of 111 = الصندوق والبنوك)
      // These are the actual cash/bank accounts used in exchange operations
      const { data: parentAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .in('account_code', ['111', '1110', '1111'])
        .limit(1);
      
      const parentId = parentAccounts?.[0]?.id;
      
      let query = supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_detail', true)
        .order('account_code', { ascending: true });
      
      if (parentId) {
        // Fetch accounts under funds/banks parent
        query = query.eq('parent_id', parentId);
      } else {
        // Fallback: fetch accounts whose code starts with 111
        query = query.like('account_code', '111%');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get balances with RPC
      const withBalances = await Promise.all(
        (data || []).map(async (acc) => {
          try {
            const { data: balData } = await supabase.rpc('get_account_balance_fc', {
              p_account_id: acc.id,
              p_company_id: companyId,
            });
            return { 
              ...acc, 
              balance: balData || 0, 
              account_number: acc.account_code,
              name: language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar) 
            };
          } catch {
            return { 
              ...acc, 
              balance: 0, 
              account_number: acc.account_code,
              name: language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar) 
            };
          }
        })
      );

      return withBalances as TreasuryAccount[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Filter + Sort ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = accounts;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.account_number || '').includes(q) ||
        (a.name_ar || '').toLowerCase().includes(q)
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
  }, [accounts, searchTerm, sortField, sortAsc]);

  // ─── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalBalance = 0;
    let positive = 0;
    let negative = 0;
    accounts.forEach(a => {
      if (isConverting) {
        totalBalance += convertBalance(a.balance, a.currency || baseCurrency);
      }
      if (a.balance > 0) positive++;
      if (a.balance < 0) negative++;
    });
    return { total: accounts.length, totalBalance, positive, negative };
  }, [accounts, isConverting, convertBalance, baseCurrency]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(true); }
  }, [sortField]);

  // ─── Columns ─────────────────────────────────────────────────
  const columns: NexaListColumn<TreasuryAccount>[] = useMemo(() => [
    {
      id: 'account_number',
      header: t('exchange.common.code'),
      sortable: true,
      sortKey: 'account_number',
      width: '120px',
      cell: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.account_number}</span>
      ),
    },
    {
      id: 'name',
      header: t('exchange.common.name'),
      sortable: true,
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
            {row.account_type === 'bank' || row.account_number?.startsWith('102')
              ? <Landmark className="w-4 h-4 text-violet-500" />
              : <Wallet className="w-4 h-4 text-violet-500" />
            }
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {row.name || row.name_ar}
              </span>
              {row.currency && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0 rounded bg-blue-50 text-blue-600 border border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700/50">
                  {row.currency}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'balance',
      header: t('exchange.common.balance'),
      sortable: true,
      sortKey: 'balance',
      width: '180px',
      align: 'end' as const,
      cell: (row) => {
        if (row.balance === 0) {
          return <span className="text-gray-300 text-xs">0.00</span>;
        }
        const cur = row.currency || baseCurrency;
        const amount = convertBalance(row.balance, cur);
        const showCur = isConverting ? displayCurrency : (row.currency || '');
        const isPositive = amount > 0;
        return (
          <div className={cn(
            "flex items-center gap-1 justify-end text-sm font-semibold",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{fmtAmount(amount)}</span>
            <span className="text-[10px] font-normal text-gray-400 ms-0.5">{showCur}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('fields.status'),
      width: '90px',
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-2 py-0.5",
            row.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          )}
        >
          {row.is_active ? t('exchange.status.active') : t('exchange.status.inactive')}
        </Badge>
      ),
    },
  ], [t]);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 border-violet-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-violet-600/70 font-tajawal">{t('exchange.treasury.totalAccounts')}</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-violet-500/10 rounded-xl"><Wallet className="w-5 h-5 text-violet-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 font-tajawal">{t('exchange.treasury.totalBalance')}</p>
                {isConverting ? (
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{displayCurrencySymbol} {fmtAmount(stats.totalBalance)}</p>
                ) : (
                  <p className="text-lg font-bold text-gray-400 mt-1">—</p>
                )}
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl"><Banknote className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600/70 font-tajawal">{t('exchange.treasury.positiveBalance')}</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.positive}</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 border-red-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600/70 font-tajawal">{t('exchange.treasury.negativeBalance')}</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{stats.negative}</p>
              </div>
              <div className="p-2.5 bg-red-500/10 rounded-xl"><TrendingDown className="w-5 h-5 text-red-600" /></div>
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
        searchPlaceholder={t('exchange.treasury.searchPlaceholder')}
        totalCount={accounts.length}
        countLabel={t('exchange.treasury.countLabel')}
        onRowClick={() => {}}
        onSort={handleSort}
        sortField={sortField}
        sortAsc={sortAsc}
        getRowKey={(row) => row.id}
        emptyIcon={<Wallet className="w-12 h-12 text-gray-300" />}
        emptyMessage={t('exchange.treasury.noAccounts')}
        toolbarEndContent={currencyFilterNode}
        showFooter={true}
      />
    </div>
  );
}
