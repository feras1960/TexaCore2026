/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 Parties — الجهات (العملاء والموردين)
 * ════════════════════════════════════════════════════════════════
 * V2 — NexaListTable pattern with Sub-Ledger balances
 *   - Uses partyBalanceService for REAL balances from journal entries
 *   - NexaListTable with search, sort, row accent colors
 *   - UnifiedAccountingSheet for detail view
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';

// ─── Helper: IndexedDB persistence converts Map → Object. This restores it. ───
import { ensureMap } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol, CURRENCY_META } from '@/hooks/useCompanyCurrency';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePrefetchLedgers } from '@/hooks/usePrefetchLedgers';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { partyBalanceService, type PartyBalance } from '@/services/partyBalanceService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Truck, Building2, TrendingUp, TrendingDown,
  Plus, Phone, Star, FileText, MoreHorizontal, Eye,
  CreditCard, Upload, ChevronDown, Coins, Filter,
  Wallet, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
// AddPartySheet removed — using UnifiedAccountingSheet in create mode instead
import { ImportWizard } from '@/features/import';
import { cn } from '@/lib/utils';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { getLocalizedName } from '@/lib/utils/getLocalizedName';
import { matchesSearch } from '@/lib/utils/normalizeSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────
interface Party {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  name_tr?: string;
  name_ru?: string;
  name_uk?: string;
  type: 'customer' | 'supplier';
  phone?: string;
  mobile?: string;
  email?: string;
  status: string;
  company_name?: string;
  country?: string;
  city?: string;
  currency?: string;
  supplier_type?: string;
  balance?: number;
  rating?: number;
  created_at?: string;
  payable_account_id?: string;
  receivable_account_id?: string;
  account?: {
    id: string;
    name_ar: string;
    name_en: string;
    account_code: string;
  };
}

/** الحصول على الاسم المحلي — uses shared utility now */
// Removed inline getLocalizedName — using imported version from @/lib/utils/getLocalizedName

// ═══════════════════════════════════════════════════════════════
export default function Parties() {
  const { t, direction, language } = useLanguage();
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
  const isRTL = direction === 'rtl';
  const { currencyOptions, getRate } = useViewCurrency();
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    // Auto-select base currency if available (single-currency companies)
    return baseCurrency || 'all';
  });

  // Sync display currency when baseCurrency loads (async)
  React.useEffect(() => {
    if (baseCurrency && displayCurrency === 'all') {
      setDisplayCurrency(baseCurrency);
    }
  }, [baseCurrency]);

  // Effective currency for display
  const effectiveCurrency = displayCurrency !== 'all' ? displayCurrency : (baseCurrency || 'USD');
  const isConverting = displayCurrency !== 'all';

  // ═══ partyBalanceService now returns balances in NATIVE currency (e.g. USD for USD parties) ═══
  // Convert from party's native currency → display currency (only when filter is active)
  const convertBalance = useCallback((amount: number, fromCurrency: string): number => {
    if (!isConverting || !fromCurrency || fromCurrency === displayCurrency) return amount;
    const rate = getRate(fromCurrency, displayCurrency);
    return rate > 0 ? amount * rate : amount;
  }, [isConverting, displayCurrency, getRate]);

  // ─── State ───────────────────────────────────────────────────
  const [activeEntityTab, setActiveEntityTab] = useState<'suppliers' | 'customers'>('suppliers');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  // ── Hide zero-balance toggle (persisted) ──
  const [hideZeroBalance, setHideZeroBalance] = useState(() => {
    try { return localStorage.getItem('parties_hideZeroBalance') === 'true'; } catch { return false; }
  });
  const toggleHideZeroBalance = useCallback(() => {
    setHideZeroBalance(prev => {
      const next = !prev;
      try { localStorage.setItem('parties_hideZeroBalance', String(next)); } catch {}
      return next;
    });
  }, []);

  // Sheet states
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [quickDocType, setQuickDocType] = useState<string | null>(null);

  // 🔄 Realtime — جداول الجهات
  useRealtimeInvalidation({
    table: 'suppliers',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['parties_suppliers'], ['party_balances_supplier']],
  });
  useRealtimeInvalidation({
    table: 'customers',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['parties_customers'], ['party_balances_customer']],
  });
  // 🔄 Realtime — تحديث الأرصدة عند ترحيل/إلغاء ترحيل القيود
  useRealtimeInvalidation({
    table: 'journal_entries',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['party_balances_supplier'], ['party_balances_customer']],
  });
  useRealtimeInvalidation({
    table: 'journal_entry_lines',
    companyId,
    queryKeys: [['party_balances_supplier'], ['party_balances_customer']],
  });

  // ─── Fetch Suppliers ─────────────────────────────────────────
  // ⚡ language removed from queryKey — raw data is language-independent
  //    Localized `name` is computed at render time via useMemo below
  const { data: rawSuppliers = [], isLoading: suppLoading_, refetch: refetchSuppliers } = useCachedQuery({
    queryKey: ['parties_suppliers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('suppliers')
        .select(`*, account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        type: 'supplier' as const,
      })) as Party[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,  // 5 min — Realtime handles updates
  });

  // ─── Fetch Customers ─────────────────────────────────────────
  const { data: rawCustomers = [], isLoading: custLoading_, refetch: refetchCustomers } = useCachedQuery({
    queryKey: ['parties_customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select(`*, account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        type: 'customer' as const,
      })) as Party[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,  // 5 min — Realtime handles updates
  });

  // ─── Compute localized names at RENDER time (not query time) ──
  // This ensures names update instantly when language changes
  // without triggering a new network fetch
  const suppliers = useMemo(() =>
    rawSuppliers.map(s => ({ ...s, name: getLocalizedName(s, language) })),
    [rawSuppliers, language]
  );
  const customers = useMemo(() =>
    rawCustomers.map(c => ({ ...c, name: getLocalizedName(c, language) })),
    [rawCustomers, language]
  );

  // ⚡ Prefetch ledger data for all parties (background)
  const prefetchTargets = useMemo(() => {
    const targets: { glAccountId: string | null | undefined }[] = [];
    suppliers.forEach(s => targets.push({ glAccountId: s.payable_account_id }));
    customers.forEach(c => targets.push({ glAccountId: c.receivable_account_id }));
    return targets;
  }, [suppliers, customers]);
  usePrefetchLedgers(prefetchTargets, companyId);

  // ─── Fetch Sub-Ledger Balances ───────────────────────────────
  const { data: rawSupplierBalances } = useCachedQuery({
    queryKey: ['party_balances_supplier', companyId],
    queryFn: async () => {
      if (!companyId) return new Map<string, PartyBalance>();
      return partyBalanceService.getAllPartyBalances(companyId, 'supplier');
    },
    enabled: !!companyId,
    staleTime: 10_000,  // 10s — same as CustomersList/SuppliersList
  });
  // ⚡ ensureMap: IndexedDB persistence converts Map → Object. This restores it.
  const supplierBalances = useMemo(() => ensureMap<string, PartyBalance>(rawSupplierBalances), [rawSupplierBalances]);

  const { data: rawCustomerBalances } = useCachedQuery({
    queryKey: ['party_balances_customer', companyId],
    queryFn: async () => {
      if (!companyId) return new Map<string, PartyBalance>();
      return partyBalanceService.getAllPartyBalances(companyId, 'customer');
    },
    enabled: !!companyId,
    staleTime: 10_000,  // 10s — same as CustomersList/SuppliersList
  });
  const customerBalances = useMemo(() => ensureMap<string, PartyBalance>(rawCustomerBalances), [rawCustomerBalances]);



  // ─── Current data based on active tab ────────────────────────
  const currentData = activeEntityTab === 'suppliers' ? suppliers : customers;
  const currentBalances = activeEntityTab === 'suppliers' ? supplierBalances : customerBalances;
  // ⚡ CACHE-FIRST: useCachedQuery.isLoading is false during IndexedDB restoration.
  // This prevents the "no data" flash when navigating between sections.
  const suppLoading = !!companyId && suppLoading_;
  const custLoading = !!companyId && custLoading_;
  const isLoading = activeEntityTab === 'suppliers' ? suppLoading : custLoading;

  // ─── Filtered + Sorted Data ──────────────────────────────────
  const filteredData = useMemo(() => {
    let result = currentData;

    // Status filter
    if (activeStatusTab !== 'all') {
      result = result.filter(p => p.status === activeStatusTab);
    }

    // Search (smart multi-language)
    if (searchTerm.trim()) {
      result = result.filter(p =>
        matchesSearch(
          searchTerm,
          p.name || '',
          p.code || '',
          p.name_ar || '',
          p.name_en || '',
          p.name_ru || '',
          p.name_uk || '',
          p.name_tr || '',
          p.phone || '',
          p.email || '',
        )
      );
    }

    // Hide zero balance
    if (hideZeroBalance) {
      result = result.filter(p => {
        const bal = currentBalances.get(p.id);
        return bal && Math.abs(bal.balance) > 0.001;
      });
    }

    // Sort
    result = [...result].sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortField) {
        case 'name': av = a.name || ''; bv = b.name || ''; break;
        case 'balance': {
          const balA = currentBalances.get(a.id);
          const balB = currentBalances.get(b.id);
          av = balA?.balance || 0;
          bv = balB?.balance || 0;
          break;
        }
        default: av = a.created_at || ''; bv = b.created_at || '';
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [currentData, activeStatusTab, searchTerm, sortField, sortAsc, currentBalances, hideZeroBalance]);

  // ─── Stats ───────────────────────────────────────────────────
  // عند "جميع العملات" لا يجب جمع مبالغ بعملات مختلفة — بلا معنى محاسبي
  const showTotals = displayCurrency !== 'all';
  const stats = useMemo(() => {
    let totalSupplierPayable = 0;
    let totalCustomerReceivable = 0;
    if (showTotals) {
      supplierBalances.forEach((b, partyId) => {
        const party = suppliers.find(s => s.id === partyId);
        const cur = party?.currency || baseCurrency || 'USD';
        totalSupplierPayable += convertBalance(b.balance, cur);
      });
      customerBalances.forEach((b, partyId) => {
        const party = customers.find(c => c.id === partyId);
        const cur = party?.currency || baseCurrency || 'USD';
        totalCustomerReceivable += convertBalance(b.balance, cur);
      });
    }
    return {
      customers: { total: customers.length, active: customers.filter(c => c.status === 'active').length, totalReceivables: totalCustomerReceivable },
      suppliers: { total: suppliers.length, active: suppliers.filter(s => s.status === 'active').length, totalPayables: totalSupplierPayable },
    };
  }, [customers, suppliers, supplierBalances, customerBalances, convertBalance, baseCurrency, showTotals]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleRowClick = useCallback((row: Party) => {
    setSelectedParty(row);
    setIsDetailSheetOpen(true);
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(false); }
  }, [sortField]);

  const handleRefresh = useCallback(() => {
    refetchSuppliers();
    refetchCustomers();
  }, [refetchSuppliers, refetchCustomers]);

  // ─── Row accent ──────────────────────────────────────────────
  const getRowAccent = useCallback((row: Party) => {
    const bal = currentBalances.get(row.id);
    if (bal && bal.balance > 0) return 'border-s-red-400';
    if (bal && bal.balance < 0) return 'border-s-green-400';
    return row.status === 'active' ? 'border-s-emerald-400' : 'border-s-gray-300';
  }, [currentBalances]);

  // ─── Format amount ───────────────────────────────────────────
  const fmtAmount = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── Columns ─────────────────────────────────────────────────
  const columns: NexaListColumn<Party>[] = useMemo(() => [
    {
      id: 'code',
      header: t('table.code') || 'Code',
      sortable: true,
      sortKey: 'code',
      width: '110px',
      cell: (row) => (
        <span className="font-mono text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700">
          {row.code || '—'}
        </span>
      ),
    },
    {
      id: 'name',
      header: t('table.name') || 'Name',
      sortable: true,
      sortKey: 'name',
      cell: (row) => {
        // Compute localized name at render time for maximum reliability
        const displayName = row.name || getLocalizedName(row, language);
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0",
              row.type === 'supplier'
                ? "bg-gradient-to-br from-orange-500 to-red-600"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
            )}>
              {(displayName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
                {displayName || '—'}
              </p>
              {row.account ? (
                <span className="text-[10px] text-gray-400 font-mono">
                  {row.account.account_code} - {getLocalizedName(row.account, language)}
                </span>
              ) : row.email ? (
                <span className="text-[10px] text-gray-400">{row.email}</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: 'phone',
      header: t('common.phone') || 'Phone',
      width: '140px',
      cell: (row) => {
        const phone = row.phone || row.mobile;
        return phone ? (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="font-mono text-[12px] text-gray-700 dark:text-gray-300" dir="ltr">{phone}</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        );
      },
    },
    {
      id: 'currency',
      header: t('export.currency') || 'Currency',
      width: '90px',
      align: 'center',
      cell: (row) => {
        const cur = row.currency || baseCurrency || 'USD';
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
      header: t('stats.balance') || 'Balance',
      align: 'end',
      sortable: true,
      sortKey: 'balance',
      width: '170px',
      cell: (row) => {
        const subLedger = currentBalances.get(row.id);
        const rawBalance = subLedger ? subLedger.balance : 0;
        const cur = row.currency || baseCurrency || 'USD';
        const balance = convertBalance(rawBalance, cur);
        const displayCur = isConverting ? displayCurrency : cur;
        const isSupplier = activeEntityTab === 'suppliers';
        const color = balance > 0
          ? (isSupplier ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')
          : balance < 0
            ? (isSupplier ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
            : 'text-gray-400';
        return (
          <div className="flex flex-col items-end">
            <span className={cn("font-mono font-bold text-[14px] tracking-tight", color)} dir="ltr">
              {getCurrencySymbol(displayCur)} {fmtAmount(balance)}
            </span>
            {balance > 0 && isSupplier && <span className="text-[10px] text-red-400">{isRTL ? 'مستحق لهم' : 'we owe'}</span>}
            {balance > 0 && !isSupplier && <span className="text-[10px] text-green-400">{isRTL ? 'مستحق لنا' : 'they owe'}</span>}
            {subLedger && subLedger.transaction_count > 0 && (
              <span className="text-[9px] text-gray-300 mt-0.5">
                {subLedger.transaction_count} {isRTL ? 'حركة' : 'txn'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'last_txn',
      header: t('table.lastTxn') || 'Last Txn',
      width: '110px',
      align: 'center',
      cell: (row) => {
        const subLedger = currentBalances.get(row.id);
        const date = subLedger?.last_transaction_date;
        return date ? (
          <span className="text-xs text-gray-500 font-mono">{date}</span>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        );
      },
    },
    {
      id: 'status',
      header: t('table.status') || 'Status',
      width: '100px',
      align: 'center',
      cell: (row) => (
        <Badge
          variant={row.status === 'active' ? 'default' : 'secondary'}
          className={cn(
            "text-[10px] font-semibold",
            row.status === 'active'
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500"
          )}
        >
          {row.status === 'active' ? t('status.active') : t('status.inactive')}
        </Badge>
      ),
    },
  ], [isRTL, currentBalances, baseCurrency, activeEntityTab, convertBalance, isConverting, displayCurrency, language, t]);

  // ─── Actions ─────────────────────────────────────────────────
  const renderActions = useCallback((row: Party) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[150px]">
        <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleRowClick(row)} className="gap-2 cursor-pointer text-sm">
          <Eye className="h-3.5 w-3.5" />
          {isRTL ? 'عرض التفاصيل' : 'View Details'}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
          <FileText className="h-3.5 w-3.5" />
          {isRTL ? 'كشف حساب' : 'Account Statement'}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
          <CreditCard className="h-3.5 w-3.5" />
          {isRTL ? (activeEntityTab === 'suppliers' ? 'تسجيل دفعة' : 'تسجيل تحصيل') : (activeEntityTab === 'suppliers' ? 'Record Payment' : 'Record Collection')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ), [isRTL, handleRowClick, activeEntityTab]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 pb-6" dir={direction}>

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-erp-teal" />
          <div>
            <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight font-cairo">
              {t('pages.parties.title')}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-tajawal">
              {t('pages.parties.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 shadow-sm rounded-md shrink-0">
            <Button
              onClick={() => setShowAddSheet(true)}
              className="rounded-e-none gap-2 px-4 h-9 text-white shadow-sm bg-erp-teal hover:bg-erp-teal/90"
            >
              <Plus className="w-4 h-4" />
              {activeEntityTab === 'suppliers' ? t('pages.parties.addSupplier') : t('pages.parties.addCustomer')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="border-s border-white/20 rounded-s-none px-2 h-9 text-white bg-erp-teal hover:bg-erp-teal/90">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowImportWizard(true)} className="gap-2 cursor-pointer py-2.5">
                  <div className="p-1 bg-blue-100 rounded text-blue-600"><Upload className="w-3.5 h-3.5" /></div>
                  <span className="font-medium text-sm font-tajawal">{isRTL ? 'استيراد من ملف' : 'Import from File'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" className="h-9 px-3 gap-1.5 text-xs font-tajawal" onClick={() => setQuickDocType('receipt')}>
              <ArrowDownRight className="w-3.5 h-3.5 text-green-600" />
              {t('pages.parties.receipts')}
            </Button>
            <Button variant="outline" className="h-9 px-3 gap-1.5 text-xs font-tajawal" onClick={() => setQuickDocType('payment')}>
              <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
              {t('pages.parties.payments')}
            </Button>
            <Button variant="outline" className="h-9 px-3 gap-1.5 text-xs font-tajawal" onClick={() => setQuickDocType('cash')}>
              <Wallet className="w-3.5 h-3.5 text-purple-600" />
              {t('pages.parties.cashJournal')}
            </Button>
            <Button className="h-9 px-3 gap-1.5 text-xs font-tajawal bg-erp-teal hover:bg-erp-teal/90 text-white" onClick={() => setQuickDocType('journal')}>
              <Plus className="w-3.5 h-3.5" />
              {t('pages.parties.journalEntry')}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-tajawal">{t('pages.parties.totalCustomers')}</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono mt-1">{stats.customers.total}</p>
                <p className="text-xs text-blue-500">{stats.customers.active} {t('pages.parties.active')}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl"><Users className="w-6 h-6 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-tajawal">{t('pages.parties.totalReceivables')}</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 font-mono mt-1">
                  {showTotals
                    ? <>{getCurrencySymbol(effectiveCurrency)} {fmtAmount(stats.customers.totalReceivables)}</>
                    : <span className="text-gray-400 text-sm font-tajawal">{isRTL ? 'اختر عملة' : 'Select currency'}</span>
                  }
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl"><TrendingUp className="w-6 h-6 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-tajawal">{t('pages.parties.totalSuppliers')}</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 font-mono mt-1">{stats.suppliers.total}</p>
                <p className="text-xs text-orange-500">{stats.suppliers.active} {t('pages.parties.active')}</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl"><Truck className="w-6 h-6 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-tajawal">{t('pages.parties.totalPayables')}</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300 font-mono mt-1">
                  {showTotals
                    ? <>{getCurrencySymbol(effectiveCurrency)} {fmtAmount(stats.suppliers.totalPayables)}</>
                    : <span className="text-gray-400 text-sm font-tajawal">{isRTL ? 'اختر عملة' : 'Select currency'}</span>
                  }
                </p>
              </div>
              <div className="p-3 bg-rose-500 rounded-xl"><TrendingDown className="w-6 h-6 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Entity Tabs (Suppliers / Customers) ─── */}
      <div className="flex-1 min-h-0 flex flex-col space-y-3">
        <div className="flex flex-wrap items-center gap-3 px-1">
          {/* Entity switch */}
          <Tabs value={activeEntityTab} onValueChange={(v) => { setActiveEntityTab(v as any); setActiveStatusTab('all'); setSearchTerm(''); }} dir={direction}>
            <TabsList className="bg-white dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-800 rounded-lg">
              <TabsTrigger value="suppliers" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white text-xs px-4 h-8 font-tajawal">
                <Truck className="w-4 h-4" />
                {t('pages.parties.suppliers')}
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 ms-1.5 text-[10px] px-1.5 py-0 h-4">{stats.suppliers.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white text-xs px-4 h-8 font-tajawal">
                <Users className="w-4 h-4" />
                {t('pages.parties.customers')}
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 ms-1.5 text-[10px] px-1.5 py-0 h-4">{stats.customers.total}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status filter */}
          <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab} dir={direction}>
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-7 font-tajawal">
                {t('common.all') || 'All'}
                <Badge variant="secondary" className="ms-1.5 text-[10px] px-1.5 py-0 h-4 bg-gray-200/60">{currentData.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-7 text-emerald-600 font-tajawal">
                {t('status.active') || 'Active'}
              </TabsTrigger>
              <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-7 text-gray-500 font-tajawal">
                {t('status.inactive') || 'Inactive'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Currency filter */}
          {currencyOptions.length > 0 && (
            <div className="flex items-center gap-1.5 ms-auto">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <select
                value={displayCurrency}
                onChange={e => setDisplayCurrency(e.target.value)}
                className={cn(
                  "h-7 text-xs font-tajawal rounded-md border border-gray-200 dark:border-gray-700",
                  "bg-white dark:bg-gray-900 px-2 pe-6 cursor-pointer",
                  "focus:ring-1 focus:ring-erp-teal focus:border-erp-teal",
                  isConverting && "ring-1 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                )}
              >
                <option value="all">{t('pages.parties.allCurrencies')}</option>
                {currencyOptions.map(c => {
                  const meta = CURRENCY_META[c];
                  return (
                    <option key={c} value={c}>
                      {meta?.flag || '🏳️'} {c} — {meta?.nameAr || meta?.nameEn || c}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Hide zero balance toggle */}
          <Button
            variant={hideZeroBalance ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-7 gap-1.5 text-xs font-tajawal',
              hideZeroBalance
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
            onClick={toggleHideZeroBalance}
          >
            <Filter className="w-3.5 h-3.5" />
            {isRTL
              ? (hideZeroBalance ? 'إظهار الكل' : 'إخفاء بدون رصيد')
              : (hideZeroBalance ? 'Show All' : 'Hide Zero Balance')
            }
          </Button>
        </div>

        {/* ─── NexaListTable ─── */}
        <NexaListTable<Party>
          data={filteredData}
          columns={columns}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={isRTL ? 'بحث بالاسم، الرمز، الهاتف...' : 'Search name, code, phone...'}
          totalCount={currentData.length}
          countLabel={activeEntityTab === 'suppliers' ? (isRTL ? 'مورد' : 'suppliers') : (isRTL ? 'عميل' : 'customers')}
          sortField={sortField}
          sortAsc={sortAsc}
          onSort={handleSort}
          getRowAccent={getRowAccent}
          onRowClick={handleRowClick}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={activeEntityTab === 'suppliers' ? t('pages.parties.noSuppliers') : t('pages.parties.noCustomers')}
          showFooter={true}
          footerLeftText={
            isRTL
              ? `عرض ${filteredData.length} من ${currentData.length} ${activeEntityTab === 'suppliers' ? 'مورد' : 'عميل'}`
              : `Showing ${filteredData.length} of ${currentData.length} ${activeEntityTab === 'suppliers' ? 'suppliers' : 'customers'}`
          }
          footerRightContent={
            <span className="font-mono font-bold text-erp-navy dark:text-white">
              {displayCurrency !== 'all' ? (
                <>
                  {activeEntityTab === 'suppliers'
                    ? (isRTL ? 'إجمالي المستحق: ' : 'Total Payable: ')
                    : (isRTL ? 'إجمالي المستحقات: ' : 'Total Receivable: ')
                  }
                  {fmtAmount(activeEntityTab === 'suppliers' ? stats.suppliers.totalPayables : stats.customers.totalReceivables)}
                  <span className="text-gray-400 ms-1">{displayCurrency}</span>
                </>
              ) : (
                <span className="text-gray-400 text-xs font-tajawal">
                  {isRTL ? 'اختر عملة لعرض المجاميع' : 'Select currency for totals'}
                </span>
              )}
            </span>
          }
          renderActions={renderActions}
          isRTL={isRTL}
          direction={direction}
        />
      </div>

      {/* ─── Party Details Sheet ─── */}
      <UnifiedAccountingSheet
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false);
          setSelectedParty(null);
        }}
        docType="party"
        mode="view"
        data={selectedParty ? {
          ...selectedParty,
          current_balance: currentBalances.get(selectedParty.id)?.balance || 0,
          is_active: selectedParty.status === 'active',
          _partyType: selectedParty.type,
        } : null}
        companyId={companyId || undefined}
        onRefresh={handleRefresh}
        enableEditFlow
      />

      {/* ─── Add Party Sheet (uses UnifiedAccountingSheet in create mode) ─── */}
      <UnifiedAccountingSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        docType="party"
        mode="create"
        data={{
          _partyType: activeEntityTab === 'customers' ? 'customer' : 'supplier',
          is_active: true,
        }}
        companyId={companyId || undefined}
        onRefresh={handleRefresh}
        enableEditFlow
      />

      {/* ─── Import Wizard ─── */}
      {showImportWizard && (
        <ImportWizard
          defaultEntityType={activeEntityTab}
          onClose={() => setShowImportWizard(false)}
          onComplete={() => { setShowImportWizard(false); handleRefresh(); }}
        />
      )}
      {/* ─── Quick Doc Sheet (Journal / Cash / Receipt / Payment) ─── */}
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
