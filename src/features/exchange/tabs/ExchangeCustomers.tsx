/**
 * ════════════════════════════════════════════════════════════════
 * 👥 ExchangeCustomers — تبويب زبائن الصرافة
 * ════════════════════════════════════════════════════════════════
 * V1 — NexaListTable + Search + Status Filter + Row Click → Sheet
 * يعمل مع جدول customers الموجود مع فلترة مخصصة
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useExchangeFilters } from '../hooks/useExchangeFilters';
import { partyBalanceService, type PartyBalance } from '@/services/partyBalanceService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Users, Phone, Mail, MapPin, Plus, TrendingUp,
  TrendingDown, Eye, Clock, CheckCircle2, Building2,
  History,
} from 'lucide-react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';

// ─── Types ────────────────────────────────────────────────────
interface Customer {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  name_tr?: string;
  name_ru?: string;
  name_uk?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  country?: string;
  city?: string;
  status: string;
  customer_type?: string;
  currency?: string;
  receivable_account_id?: string;
  branch_id?: string;
  last_reconciliation_date?: string;
  created_at: string;
  name?: string;
  type?: 'customer';
}

function daysSince(date: string | undefined, t: (key: string) => string): string {
  if (!date) return '—';
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t('exchange.agents.today');
  if (diff === 1) return t('exchange.agents.yesterday');
  return `${diff} ${t('exchange.agents.daysAgo')}`;
}

function getLocalizedName(row: any, lang: string): string {
  const nameMap: Record<string, string> = {
    ar: row.name_ar, en: row.name_en, tr: row.name_tr,
    ru: row.name_ru, uk: row.name_uk,
  };
  return nameMap[lang] || row.name_en || row.name_ar || '';
}

// ═══════════════════════════════════════════════════════════════
export default function ExchangeCustomers() {
  const { t, direction, language } = useLanguage();
  const { companyId } = useCompany();
  const isRTL = direction === 'rtl';

  // ─── State ───────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const queryClient = useQueryClient();

  // ─── Memoized data for create sheet (prevent re-render resets) ───
  const createSheetData = useRef({
    _partyType: 'customer' as const,
    customer_type: 'exchange',
    _exchangeContext: true,
    is_active: true,
  }).current;

  // ─── Exchange Filters (shared hook) ─────────────────────────
  const {
    currencyFilterNode, isConverting, convertBalance,
    baseCurrency, displayCurrency, displayCurrencySymbol,
  } = useExchangeFilters({ storageKey: 'exchange_customers' });

  // 🔄 Realtime
  useRealtimeInvalidation({
    table: 'customers',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['exchange_customers'], ['exchange_customer_balances']],
  });

  // ─── Fetch Customers ─────────────────────────────────────────
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['exchange_customers', companyId, language],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        type: 'customer' as const,
        name: getLocalizedName(c, language),
      })) as Customer[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Fetch Branches (for branch column) ───────────────────────
  const { data: branchesMap = new Map() } = useQuery({
    queryKey: ['branches_map', companyId],
    queryFn: async () => {
      if (!companyId) return new Map<string, string>();
      const { data } = await supabase
        .from('branches')
        .select('id, name_ar, name_en')
        .eq('company_id', companyId);
      const map = new Map<string, string>();
      (data || []).forEach((b: any) => map.set(b.id, language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)));
      return map;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Fetch Balances ──────────────────────────────────────────
  const { data: balances = new Map() } = useQuery({
    queryKey: ['exchange_customer_balances', companyId],
    queryFn: async () => {
      if (!companyId) return new Map<string, PartyBalance>();
      return partyBalanceService.getAllPartyBalances(companyId, 'customer');
    },
    enabled: !!companyId,
    staleTime: 10_000,
  });

  // ─── Filter + Sort ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = customers;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.name_ar || '').toLowerCase().includes(q) ||
        (c.name_en || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortField) {
        case 'name': av = a.name || ''; bv = b.name || ''; break;
        case 'balance': {
          av = balances.get(a.id)?.balance || 0;
          bv = balances.get(b.id)?.balance || 0;
          break;
        }
        default: av = a.created_at || ''; bv = b.created_at || '';
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [customers, searchTerm, sortField, sortAsc, balances]);

  // ─── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalReceivable = 0;
    let debtors = 0;
    balances.forEach((b, partyId) => {
      if (isConverting) {
        const party = customers.find(c => c.id === partyId);
        const cur = party?.currency || baseCurrency;
        totalReceivable += convertBalance(b.balance, cur);
      } else {
        totalReceivable += b.balance;
      }
      if (b.balance > 0) debtors++;
    });
    return {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      totalReceivable,
      debtors,
    };
  }, [customers, balances, isConverting, convertBalance, baseCurrency]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleRowClick = useCallback((row: Customer) => {
    setSelectedCustomer(row);
    setIsDetailSheetOpen(true);
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(false); }
  }, [sortField]);

  const fmtAmount = (n: number) => Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  // ─── Row accent ──────────────────────────────────────────────
  const getRowAccent = useCallback((row: Customer) => {
    const bal = balances.get(row.id);
    if (bal && bal.balance > 0) return 'border-s-red-400';
    if (bal && bal.balance < 0) return 'border-s-green-400';
    return row.status === 'active' ? 'border-s-emerald-400' : 'border-s-gray-300';
  }, [balances]);

  // ─── Columns ─────────────────────────────────────────────────
  const columns: NexaListColumn<Customer>[] = useMemo(() => [
    {
      id: 'code',
      header: t('exchange.common.code'),
      sortable: true,
      sortKey: 'code',
      width: '100px',
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
            {row.currency && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0 rounded bg-blue-50 text-blue-600 border border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700/50">
                {row.currency}
              </span>
            )}
          </div>
          {row.name_en && language === 'ar' && (
            <span className="text-xs text-gray-400">{row.name_en}</span>
          )}
        </div>
      ),
    },
    {
      id: 'phone',
      header: t('exchange.common.phone'),
      width: '140px',
      cell: (row) => row.phone ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Phone className="w-3 h-3" />
          <span dir="ltr">{row.phone}</span>
        </div>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      id: 'country',
      header: t('exchange.common.location'),
      width: '140px',
      cell: (row) => (row.country || row.city) ? (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{[row.city, row.country].filter(Boolean).join(', ')}</span>
        </div>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      id: 'balance',
      header: t('exchange.common.balance'),
      sortable: true,
      sortKey: 'balance',
      width: '140px',
      cell: (row) => {
        const bal = balances.get(row.id);
        if (!bal || bal.balance === 0) {
          return <span className="text-gray-300 text-xs font-mono tabular-nums">0.00</span>;
        }
        const cur = row.currency || baseCurrency;
        const amount = convertBalance(bal.balance, cur);
        const showCur = isConverting ? displayCurrency : (row.currency || '');
        const isDebit = amount > 0;
        return (
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold font-mono tabular-nums",
            isDebit ? "text-red-600" : "text-green-600"
          )}>
            {isDebit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{fmtAmount(amount)}</span>
            <span className="text-[10px] font-normal text-gray-400 ms-0.5">{showCur}</span>
          </div>
        );
      },
    },
    {
      id: 'branch',
      header: t('exchange.common.branch'),
      width: '120px',
      cell: (row) => {
        if (!row.branch_id) return <span className="text-gray-300">—</span>;
        const name = branchesMap.get(row.branch_id);
        return (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Building2 className="w-3 h-3" />
            <span>{name || '—'}</span>
          </div>
        );
      },
    },
    {
      id: 'lastReconciliation',
      header: t('exchange.common.lastReconciliation'),
      width: '130px',
      cell: (row) => {
        const d = row.last_reconciliation_date;
        if (!d) return (
          <span className="text-[10px] text-gray-300 flex items-center gap-1">
            <History className="w-3 h-3" />
            {t('exchange.agents.never')}
          </span>
        );
        const elapsed = daysSince(d, t);
        const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500">{new Date(d).toLocaleDateString()}</span>
            <span className={cn(
              "text-[10px]",
              days > 30 ? "text-red-500" : days > 14 ? "text-amber-500" : "text-emerald-500"
            )}>
              {elapsed}
            </span>
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
            row.status === 'active'
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          )}
        >
          {row.status === 'active'
            ? t('exchange.status.active')
            : t('exchange.status.inactive')}
        </Badge>
      ),
    },
  ], [language, balances]);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600/70 font-tajawal">
                  {t('exchange.stats.totalCustomers')}
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 font-tajawal">
                  {t('exchange.stats.activeCustomers')}
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{stats.active}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600/70 font-tajawal">
                  {t('exchange.stats.totalReceivables')}
                </p>
                {isConverting ? (
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
                    {displayCurrencySymbol} {fmtAmount(stats.totalReceivable)}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-gray-400 dark:text-gray-500 mt-1">
                    —
                  </p>
                )}
              </div>
              <div className="p-2.5 bg-red-500/10 rounded-xl">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600/70 font-tajawal">
                  {t('exchange.stats.debtors')}
                </p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{stats.debtors}</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <Clock className="w-5 h-5 text-amber-600" />
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
        searchPlaceholder={t('exchange.customers.searchPlaceholder')}
        totalCount={customers.length}
        countLabel={t('exchange.customers.countLabel')}
        onRowClick={handleRowClick}
        onSort={handleSort}
        sortField={sortField}
        sortAsc={sortAsc}
        getRowAccent={getRowAccent}
        getRowKey={(row) => row.id}
        emptyIcon={<Users className="w-12 h-12 text-gray-300" />}
        emptyMessage={t('exchange.customers.noCustomers')}
        toolbarEndContent={
          <div className="flex items-center gap-2">
            {currencyFilterNode}
            <Button
              size="sm"
              className="bg-erp-teal hover:bg-erp-teal/90 text-white gap-1.5 h-7 text-xs"
              onClick={() => setShowAddSheet(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('exchange.customers.newCustomer')}
            </Button>
          </div>
        }
        showFooter={true}
        footerLeftText={`${t('exchange.common.showing')} ${filteredData.length} ${t('exchange.common.of')} ${customers.length} ${t('exchange.customers.countLabel')}`}
      />

      {/* Exchange Customer Detail Sheet */}
      <UnifiedAccountingSheet
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false);
          setSelectedCustomer(null);
        }}
        docType="party"
        mode="view"
        data={selectedCustomer ? {
          ...selectedCustomer,
          current_balance: balances.get(selectedCustomer.id)?.balance || 0,
          is_active: selectedCustomer.status === 'active',
          _partyType: 'customer',
          _exchangeContext: true,
          customer_type: selectedCustomer.customer_type || 'exchange',
        } : null}
        companyId={companyId || undefined}
        onSave={async () => {
          queryClient.invalidateQueries({ queryKey: ['exchange_customers'] });
          queryClient.invalidateQueries({ queryKey: ['parties_customers'] });
          setIsDetailSheetOpen(false);
          setSelectedCustomer(null);
        }}
        onRefresh={() => {}}
        enableEditFlow
      />

      {/* Add New Exchange Customer Sheet */}
      <UnifiedAccountingSheet
        key={`create-customer-${createKey}`}
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        docType="party"
        mode="create"
        data={createSheetData}
        companyId={companyId || undefined}
        onSave={async () => {
          queryClient.invalidateQueries({ queryKey: ['exchange_customers'] });
          queryClient.invalidateQueries({ queryKey: ['parties_customers'] });
          setShowAddSheet(false);
          setCreateKey(k => k + 1);
        }}
        onRefresh={() => {}}
        enableEditFlow
      />
    </div>
  );
}
