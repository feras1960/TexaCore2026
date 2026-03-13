/**
 * ════════════════════════════════════════════════════════════════
 * 🏦 Funds Management V2 — الصناديق والبنوك
 * ════════════════════════════════════════════════════════════════
 * V2 — NexaListTable + Backend RPC Balances + UnifiedAccountingSheet
 *   - Uses get_account_balance_fc RPC for REAL balances
 *   - NexaListTable with rich columns (icon, name, type, branch, currency, balance, status, last activity)
 *   - UnifiedAccountingSheet for detail view (same as Chart of Accounts)
 *   - Professional stat cards
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol, CURRENCY_META } from '@/hooks/useCompanyCurrency';
import { useFunds } from './hooks/useAccountingQueries';
import { supabase } from '@/lib/supabase';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, Landmark, TrendingUp, Building2, Plus,
  RefreshCw, Search, Users, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, Eye, FileText, Coins,
} from 'lucide-react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
// AddFundDialog removed — using UnifiedAccountingSheet in create mode instead
import QuickActionsBar from './components/QuickActionsBar';
import { AccountingPageHeader } from './components/shared/AccountingPageHeader';
import { cn } from '@/lib/utils';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────
interface FundBalance {
  total_debit: number;
  total_credit: number;
  balance: number;
  currency: string;
  transaction_count: number;
  last_activity: string | null;
}

// ═══════════════════════════════════════════════════════════════
export default function FundsManagement() {
  const { t, direction, language } = useLanguage();
  const { company: currentCompany, companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
  const isRTL = direction === 'rtl';
  const { currencyOptions, getRate } = useViewCurrency();
  const [displayCurrency, setDisplayCurrency] = useState<string>('all');

  // ─── Data ───────────────────────────────────────────────────
  const { funds: rawFunds, loading: isLoading, refetch: refetchFunds, invalidate: invalidateFunds } = useFunds();

  // ─── State ──────────────────────────────────────────────────
  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'cash' | 'bank'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Sheets
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [quickDocType, setQuickDocType] = useState<string | null>(null);

  // ─── RPC Balances ───────────────────────────────────────────
  const [fundBalances, setFundBalances] = useState<Map<string, FundBalance>>(new Map());

  useEffect(() => {
    if (!rawFunds.length || !companyId) return;

    const fetchAllBalances = async () => {
      const balanceMap = new Map<string, FundBalance>();

      // Fetch balance for each fund via RPC
      const promises = rawFunds.map(async (fund: any) => {
        try {
          const { data, error } = await supabase.rpc('get_account_balance_fc', {
            p_account_id: fund.id,
            p_company_id: companyId,
          });
          if (!error && data && data.length > 0) {
            balanceMap.set(fund.id, {
              total_debit: Number(data[0].total_debit) || 0,
              total_credit: Number(data[0].total_credit) || 0,
              balance: Number(data[0].balance) || 0,
              currency: data[0].currency || fund.currency || baseCurrency || 'USD',
              transaction_count: Number(data[0].transaction_count) || 0,
              last_activity: data[0].last_activity || null,
            });
          }
        } catch (err) {
          console.warn(`[Funds] Balance fetch failed for ${fund.id}:`, err);
        }
      });

      await Promise.all(promises);
      setFundBalances(balanceMap);
    };

    fetchAllBalances();
  }, [rawFunds, companyId, baseCurrency]);

  // ─── Currency conversion ───────────────────────────────────
  const isConverting = displayCurrency !== 'all';
  const convertBalance = useCallback((amount: number, fromCurrency: string): number => {
    if (!isConverting || !fromCurrency || fromCurrency === displayCurrency) return amount;
    const rate = getRate(fromCurrency, displayCurrency);
    return rate > 0 ? amount * rate : amount;
  }, [isConverting, displayCurrency, getRate]);

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    let cashCount = 0, bankCount = 0;
    let totalCash = 0, totalBank = 0;

    rawFunds.forEach((fund: any) => {
      const isCash = fund.is_cash_account;
      const isBank = fund.is_bank_account;
      const bal = fundBalances.get(fund.id);
      const fundCur = bal?.currency || fund.currency || baseCurrency || 'USD';
      const rawBalance = bal ? bal.balance : 0;
      const displayBalance = convertBalance(rawBalance, fundCur);

      if (isCash) { cashCount++; totalCash += displayBalance; }
      if (isBank) { bankCount++; totalBank += displayBalance; }
    });

    const effectiveCurrency = isConverting ? displayCurrency : (baseCurrency || 'USD');

    return {
      totalFunds: rawFunds.length,
      cashCount,
      bankCount,
      totalCash,
      totalBank,
      grandTotal: totalCash + totalBank,
      effectiveCurrency,
    };
  }, [rawFunds, fundBalances, convertBalance, isConverting, displayCurrency, baseCurrency]);

  // ─── Filtering ──────────────────────────────────────────────
  const filteredFunds = useMemo(() => {
    let data = [...rawFunds];

    // Type filter
    if (activeTypeTab === 'cash') {
      data = data.filter((f: any) => f.is_cash_account);
    } else if (activeTypeTab === 'bank') {
      data = data.filter((f: any) => f.is_bank_account);
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter((f: any) =>
        (f.account_code || '').toLowerCase().includes(term) ||
        (f.name_ar || '').toLowerCase().includes(term) ||
        (f.name_en || '').toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField) {
      data.sort((a: any, b: any) => {
        let va: any, vb: any;
        if (sortField === 'balance') {
          va = fundBalances.get(a.id)?.balance || 0;
          vb = fundBalances.get(b.id)?.balance || 0;
        } else if (sortField === 'code') {
          va = a.account_code || '';
          vb = b.account_code || '';
        } else {
          va = a[sortField] || '';
          vb = b[sortField] || '';
        }
        if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortAsc ? va - vb : vb - va;
      });
    }

    return data;
  }, [rawFunds, activeTypeTab, searchTerm, sortField, sortAsc, fundBalances]);

  // ─── Helpers ────────────────────────────────────────────────
  const fmtAmount = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getFundName = (fund: any) => {
    const nameMap: Record<string, string> = {
      ar: fund.name_ar,
      en: fund.name_en,
      tr: fund.name_tr,
      ru: fund.name_ru,
      uk: fund.name_uk,
    };
    return nameMap[language] || fund.name_en || fund.name_ar || '';
  };

  // ─── Handlers ───────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleRowClick = useCallback((fund: any) => {
    setSelectedFund(fund);
    setIsDetailSheetOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    invalidateFunds();
    refetchFunds();
  }, [invalidateFunds, refetchFunds]);

  // ─── Row accent ─────────────────────────────────────────────
  const getRowAccent = useCallback((fund: any) => {
    const bal = fundBalances.get(fund.id);
    if (bal && bal.balance > 0) return 'border-s-green-400';
    if (bal && bal.balance < 0) return 'border-s-red-400';
    return fund.is_bank_account ? 'border-s-blue-400' : 'border-s-emerald-400';
  }, [fundBalances]);

  // ─── Columns ────────────────────────────────────────────────
  const columns: NexaListColumn<any>[] = useMemo(() => [
    {
      id: 'code',
      header: t('pages.funds.accountCode'),
      sortable: true,
      sortKey: 'code',
      width: '120px',
      cell: (fund: any) => (
        <span className="font-mono text-[13px] font-bold text-indigo-600 dark:text-indigo-400">
          {fund.account_code || '—'}
        </span>
      ),
    },
    {
      id: 'name',
      header: t('pages.funds.fundBankName'),
      sortable: true,
      sortKey: 'name',
      cell: (fund: any) => {
        const isBank = fund.is_bank_account;
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0",
              isBank
                ? "bg-gradient-to-br from-blue-500 to-blue-700"
                : "bg-gradient-to-br from-emerald-500 to-green-700"
            )}>
              {isBank ? <Landmark className="w-4.5 h-4.5" /> : <Wallet className="w-4.5 h-4.5" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                {getFundName(fund)}
              </p>
              <span className="text-[10px] text-gray-400 font-mono">
                {fund.account_code} · {isBank ? t('pages.funds.bankAccount') : t('pages.funds.cashFund')}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'type',
      header: t('pages.funds.type'),
      width: '100px',
      align: 'center',
      cell: (fund: any) => {
        const isBank = fund.is_bank_account;
        return (
          <Badge className={cn(
            "text-[10px] font-semibold px-2 py-0.5",
            isBank
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          )}>
            {isBank
              ? <><Landmark className="w-3 h-3 me-1 inline" />{t('pages.funds.bank')}</>
              : <><Wallet className="w-3 h-3 me-1 inline" />{t('pages.funds.cashType')}</>
            }
          </Badge>
        );
      },
    },
    {
      id: 'currency',
      header: t('export.currency'),
      width: '90px',
      align: 'center',
      cell: (fund: any) => {
        const bal = fundBalances.get(fund.id);
        const cur = bal?.currency || fund.currency || baseCurrency || 'USD';
        const meta = CURRENCY_META[cur];
        return (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {meta?.flag || '🏳️'} {cur}
          </span>
        );
      },
    },
    {
      id: 'balance',
      header: t('stats.balance'),
      align: 'end',
      sortable: true,
      sortKey: 'balance',
      width: '170px',
      cell: (fund: any) => {
        const bal = fundBalances.get(fund.id);
        const rawBalance = bal ? bal.balance : 0;
        const fundCur = bal?.currency || fund.currency || baseCurrency || 'USD';
        const displayBalance = convertBalance(rawBalance, fundCur);
        const displayCur = isConverting ? displayCurrency : fundCur;
        const color = displayBalance > 0
          ? 'text-green-600 dark:text-green-400'
          : displayBalance < 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-400';
        return (
          <div className="flex flex-col items-end">
            <span className={cn("font-mono font-bold text-[14px] tracking-tight", color)} dir="ltr">
              {getCurrencySymbol(displayCur)} {fmtAmount(displayBalance)}
            </span>
            {bal && bal.transaction_count > 0 && (
              <span className="text-[9px] text-gray-300 mt-0.5">
                {bal.transaction_count} {t('table.txn')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'last_activity',
      header: t('pages.funds.lastActivity'),
      width: '110px',
      align: 'center',
      cell: (fund: any) => {
        const bal = fundBalances.get(fund.id);
        const date = bal?.last_activity;
        return date ? (
          <span className="text-xs text-gray-500 font-mono">{date}</span>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        );
      },
    },
    {
      id: 'status',
      header: t('table.status'),
      width: '90px',
      align: 'center',
      cell: (fund: any) => (
        <Badge
          className={cn(
            "text-[10px] font-semibold",
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          )}
        >
          {t('status.active')}
        </Badge>
      ),
    },
  ], [isRTL, fundBalances, baseCurrency, convertBalance, isConverting, displayCurrency, language]);

  // ─── Actions ────────────────────────────────────────────────
  const renderActions = useCallback((fund: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => { setSelectedFund(fund); setIsDetailSheetOpen(true); }}>
          <Eye className="w-4 h-4 me-2" />
          {t('common.viewDetails')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setSelectedFund(fund); setIsDetailSheetOpen(true); }}>
          <FileText className="w-4 h-4 me-2" />
          {t('common.accountStatement')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ), [isRTL]);

  const effectiveCurrency = stats.effectiveCurrency;

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-500" dir={direction}>

      {/* ─── Header ─── */}
      <AccountingPageHeader
        title={t('pages.funds.title')}
        description={t('pages.funds.subtitle')}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button onClick={() => setIsAddDialogOpen(true)} className="h-9 px-3 gap-1.5 text-xs font-tajawal text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            {t('pages.funds.addFund')}
          </Button>
          <QuickActionsBar />
        </div>
      </AccountingPageHeader>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Card 1: Total Count */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/20 dark:to-gray-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Coins className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs font-tajawal text-gray-500 dark:text-gray-400">{t('pages.funds.totalAccounts')}</p>
              <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{stats.totalFunds}</p>
              <p className="text-[10px] text-gray-400">{stats.cashCount} {t('pages.funds.cash')} · {stats.bankCount} {t('pages.funds.bank')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Cash Total */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-tajawal text-gray-500 dark:text-gray-400">{t('pages.funds.totalCash')}</p>
              <p className={cn("text-lg font-bold font-mono", stats.totalCash >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600')} dir="ltr">
                {getCurrencySymbol(effectiveCurrency)} {fmtAmount(stats.totalCash)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Bank Total */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Landmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-tajawal text-gray-500 dark:text-gray-400">{t('pages.funds.totalBanks')}</p>
              <p className={cn("text-lg font-bold font-mono", stats.totalBank >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600')} dir="ltr">
                {getCurrencySymbol(effectiveCurrency)} {fmtAmount(stats.totalBank)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Grand Total */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-tajawal text-gray-500 dark:text-gray-400">{t('pages.funds.grandTotal')}</p>
              <p className={cn("text-lg font-bold font-mono", stats.grandTotal >= 0 ? 'text-orange-700 dark:text-orange-300' : 'text-red-600')} dir="ltr">
                {getCurrencySymbol(effectiveCurrency)} {fmtAmount(stats.grandTotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs: All / Cash / Bank */}
        <Tabs value={activeTypeTab} onValueChange={(v) => setActiveTypeTab(v as any)}>
          <TabsList className="h-9 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" dir={direction}>
            <TabsTrigger value="all" className="h-7 px-3 text-xs font-tajawal data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <Coins className="w-3.5 h-3.5 me-1.5" />
              {t('common.all')} <span className="ms-1.5 px-1.5 py-0 text-[10px] rounded-full bg-gray-200 dark:bg-gray-600">{rawFunds.length}</span>
            </TabsTrigger>
            <TabsTrigger value="cash" className="h-7 px-3 text-xs font-tajawal data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <Wallet className="w-3.5 h-3.5 me-1.5 text-emerald-500" />
              {t('pages.funds.cash')} <span className="ms-1.5 px-1.5 py-0 text-[10px] rounded-full bg-emerald-100 text-emerald-700">{stats.cashCount}</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="h-7 px-3 text-xs font-tajawal data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <Landmark className="w-3.5 h-3.5 me-1.5 text-blue-500" />
              {t('pages.funds.banks')} <span className="ms-1.5 px-1.5 py-0 text-[10px] rounded-full bg-blue-100 text-blue-700">{stats.bankCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Currency filter */}
        <div className="flex items-center gap-2">
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="h-8 px-2 text-xs border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">{t('pages.parties.allCurrencies')}</option>
            {currencyOptions.map((cur: string) => (
              <option key={cur} value={cur}>{CURRENCY_META[cur]?.flag || ''} {cur}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh} title={t('pages.vat.refresh')}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ─── NexaListTable ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800">
        <NexaListTable
          data={filteredFunds}
          columns={columns}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('pages.funds.searchPlaceholder')}
          sortField={sortField}
          sortAsc={sortAsc}
          onSort={handleSort}
          getRowAccent={getRowAccent}
          onRowClick={handleRowClick}
          getRowKey={(fund: any) => fund.id}
          isLoading={isLoading}
          emptyMessage={t('pages.funds.noFunds')}
          showFooter={true}
          footerLeftText={
            `${t('common.showing') || 'Showing'} ${filteredFunds.length} / ${rawFunds.length}`
          }
          footerRightContent={
            <span className="font-mono font-bold text-erp-navy dark:text-white">
              {t('stats.total')}: 
              {getCurrencySymbol(effectiveCurrency)} {fmtAmount(stats.grandTotal)}
              <span className="text-gray-400 ms-1">{effectiveCurrency}</span>
            </span>
          }
          renderActions={renderActions}
          isRTL={isRTL}
          direction={direction}
        />
      </div>

      {/* ─── Fund Detail Sheet (UnifiedAccountingSheet) ─── */}
      <UnifiedAccountingSheet
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false);
          setSelectedFund(null);
        }}
        docType="fund"
        mode="view"
        data={selectedFund ? {
          ...selectedFund,
          name: getFundName(selectedFund),
          current_balance: fundBalances.get(selectedFund.id)?.balance || 0,
          total_debit: fundBalances.get(selectedFund.id)?.total_debit || 0,
          total_credit: fundBalances.get(selectedFund.id)?.total_credit || 0,
          transaction_count: fundBalances.get(selectedFund.id)?.transaction_count || 0,
          last_activity: fundBalances.get(selectedFund.id)?.last_activity || null,
          currency: fundBalances.get(selectedFund.id)?.currency || selectedFund.currency || baseCurrency,
          is_active: true,
        } : null}
        companyId={companyId || undefined}
        onRefresh={handleRefresh}
        enableEditFlow
      />

      {/* ─── Add Fund/Bank Sheet (UnifiedAccountingSheet in create mode) ─── */}
      <UnifiedAccountingSheet
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          handleRefresh();
        }}
        docType="fund"
        mode="create"
        data={{
          is_cash_account: activeTypeTab === 'bank' ? false : true,
          is_bank_account: activeTypeTab === 'bank' ? true : false,
          is_active: true,
        }}
        companyId={companyId || undefined}
        onRefresh={handleRefresh}
        enableEditFlow
      />

      {/* ─── Quick Doc Sheet ─── */}
      {quickDocType && (
        <UnifiedAccountingSheet
          isOpen={true}
          onClose={() => setQuickDocType(null)}
          docType={quickDocType as any}
          mode="create"
          companyId={companyId || undefined}
          onRefresh={handleRefresh}
          enableEditFlow
        />
      )}
    </div>
  );
}
