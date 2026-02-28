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
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol, CURRENCY_META } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
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
  CreditCard, Upload, ChevronDown,
} from 'lucide-react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { AddPartySheet } from './components/AddPartySheet';
import { ImportWizard } from '@/features/import';
import QuickActionsBar from './components/QuickActionsBar';
import { cn } from '@/lib/utils';
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

// ═══════════════════════════════════════════════════════════════
export default function Parties() {
  const { t, direction, language } = useLanguage();
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
  const isRTL = direction === 'rtl';

  // ─── State ───────────────────────────────────────────────────
  const [activeEntityTab, setActiveEntityTab] = useState<'suppliers' | 'customers'>('suppliers');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // Sheet states
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  // 🔄 Realtime
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

  // ─── Fetch Suppliers ─────────────────────────────────────────
  const { data: suppliers = [], isLoading: suppLoading, refetch: refetchSuppliers } = useQuery({
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
        name: language === 'ar' ? (s.name_ar || s.name_en || '') : (s.name_en || s.name_ar || ''),
      })) as Party[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Fetch Customers ─────────────────────────────────────────
  const { data: customers = [], isLoading: custLoading, refetch: refetchCustomers } = useQuery({
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
        name: language === 'ar' ? (c.name_ar || c.name_en || '') : (c.name_en || c.name_ar || ''),
      })) as Party[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Fetch Sub-Ledger Balances ───────────────────────────────
  const { data: supplierBalances = new Map() } = useQuery({
    queryKey: ['party_balances_supplier', companyId],
    queryFn: async () => {
      if (!companyId) return new Map<string, PartyBalance>();
      return partyBalanceService.getAllPartyBalances(companyId, 'supplier');
    },
    enabled: !!companyId,
    staleTime: 30000,
  });

  const { data: customerBalances = new Map() } = useQuery({
    queryKey: ['party_balances_customer', companyId],
    queryFn: async () => {
      if (!companyId) return new Map<string, PartyBalance>();
      return partyBalanceService.getAllPartyBalances(companyId, 'customer');
    },
    enabled: !!companyId,
    staleTime: 30000,
  });

  // ─── Current data based on active tab ────────────────────────
  const currentData = activeEntityTab === 'suppliers' ? suppliers : customers;
  const currentBalances = activeEntityTab === 'suppliers' ? supplierBalances : customerBalances;
  const isLoading = activeEntityTab === 'suppliers' ? suppLoading : custLoading;

  // ─── Filtered + Sorted Data ──────────────────────────────────
  const filteredData = useMemo(() => {
    let result = currentData;

    // Status filter
    if (activeStatusTab !== 'all') {
      result = result.filter(p => p.status === activeStatusTab);
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.name_ar || '').toLowerCase().includes(q) ||
        (p.name_en || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
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
  }, [currentData, activeStatusTab, searchTerm, sortField, sortAsc, currentBalances]);

  // ─── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalSupplierPayable = 0;
    supplierBalances.forEach(b => { totalSupplierPayable += b.balance; });
    let totalCustomerReceivable = 0;
    customerBalances.forEach(b => { totalCustomerReceivable += b.balance; });
    return {
      customers: { total: customers.length, active: customers.filter(c => c.status === 'active').length, totalReceivables: totalCustomerReceivable },
      suppliers: { total: suppliers.length, active: suppliers.filter(s => s.status === 'active').length, totalPayables: totalSupplierPayable },
    };
  }, [customers, suppliers, supplierBalances, customerBalances]);

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
      header: isRTL ? 'الرمز' : 'Code',
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
      header: isRTL ? 'الاسم' : 'Name',
      sortable: true,
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0",
            row.type === 'supplier'
              ? "bg-gradient-to-br from-orange-500 to-red-600"
              : "bg-gradient-to-br from-blue-500 to-indigo-600"
          )}>
            {(row.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">
              {row.name || '—'}
            </p>
            {row.account ? (
              <span className="text-[10px] text-gray-400 font-mono">
                {row.account.account_code} - {isRTL ? row.account.name_ar : row.account.name_en}
              </span>
            ) : row.email ? (
              <span className="text-[10px] text-gray-400">{row.email}</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: isRTL ? 'الهاتف' : 'Phone',
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
      header: isRTL ? 'العملة' : 'Currency',
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
      header: isRTL ? 'الرصيد' : 'Balance',
      align: 'end',
      sortable: true,
      sortKey: 'balance',
      width: '170px',
      cell: (row) => {
        const subLedger = currentBalances.get(row.id);
        const balance = subLedger ? subLedger.balance : 0;
        const cur = row.currency || baseCurrency || 'USD';
        const isSupplier = activeEntityTab === 'suppliers';
        const color = balance > 0
          ? (isSupplier ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')
          : balance < 0
            ? (isSupplier ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
            : 'text-gray-400';
        return (
          <div className="flex flex-col items-end">
            <span className={cn("font-mono font-bold text-[14px] tracking-tight", color)} dir="ltr">
              {getCurrencySymbol(cur)} {fmtAmount(balance)}
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
      header: isRTL ? 'آخر حركة' : 'Last Txn',
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
      header: isRTL ? 'الحالة' : 'Status',
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
          {row.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
        </Badge>
      ),
    },
  ], [isRTL, currentBalances, baseCurrency, activeEntityTab]);

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
              {isRTL ? 'الجهات' : 'Parties'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-tajawal">
              {isRTL ? 'إدارة العملاء والموردين والذمم المدينة والدائنة' : 'Manage customers, suppliers, receivables & payables'}
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
              {activeEntityTab === 'suppliers' ? (isRTL ? 'إضافة مورد' : 'Add Supplier') : (isRTL ? 'إضافة عميل' : 'Add Customer')}
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
          <QuickActionsBar />
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-tajawal">{isRTL ? 'إجمالي العملاء' : 'Total Customers'}</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono mt-1">{stats.customers.total}</p>
                <p className="text-xs text-blue-500">{stats.customers.active} {isRTL ? 'نشط' : 'active'}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl"><Users className="w-6 h-6 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-tajawal">{isRTL ? 'إجمالي المستحقات' : 'Total Receivables'}</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 font-mono mt-1">
                  {getCurrencySymbol(baseCurrency || 'USD')} {fmtAmount(stats.customers.totalReceivables)}
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
                <p className="text-xs text-orange-600 dark:text-orange-400 font-tajawal">{isRTL ? 'إجمالي الموردين' : 'Total Suppliers'}</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 font-mono mt-1">{stats.suppliers.total}</p>
                <p className="text-xs text-orange-500">{stats.suppliers.active} {isRTL ? 'نشط' : 'active'}</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl"><Truck className="w-6 h-6 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-tajawal">{isRTL ? 'إجمالي المستحقات عليك' : 'Total Payables'}</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300 font-mono mt-1">
                  {getCurrencySymbol(baseCurrency || 'USD')} {fmtAmount(stats.suppliers.totalPayables)}
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
                {isRTL ? 'الموردين' : 'Suppliers'}
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 ms-1.5 text-[10px] px-1.5 py-0 h-4">{stats.suppliers.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white text-xs px-4 h-8 font-tajawal">
                <Users className="w-4 h-4" />
                {isRTL ? 'العملاء' : 'Customers'}
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 ms-1.5 text-[10px] px-1.5 py-0 h-4">{stats.customers.total}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status filter */}
          <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab} dir={direction}>
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-7 font-tajawal">
                {isRTL ? 'الكل' : 'All'}
                <Badge variant="secondary" className="ms-1.5 text-[10px] px-1.5 py-0 h-4 bg-gray-200/60">{currentData.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-7 text-emerald-600 font-tajawal">
                {isRTL ? 'نشط' : 'Active'}
              </TabsTrigger>
              <TabsTrigger value="inactive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-7 text-gray-500 font-tajawal">
                {isRTL ? 'غير نشط' : 'Inactive'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
          emptyMessage={activeEntityTab === 'suppliers' ? (isRTL ? 'لا يوجد موردين' : 'No suppliers found') : (isRTL ? 'لا يوجد عملاء' : 'No customers found')}
          showFooter={true}
          footerLeftText={
            isRTL
              ? `عرض ${filteredData.length} من ${currentData.length} ${activeEntityTab === 'suppliers' ? 'مورد' : 'عميل'}`
              : `Showing ${filteredData.length} of ${currentData.length} ${activeEntityTab === 'suppliers' ? 'suppliers' : 'customers'}`
          }
          footerRightContent={
            <span className="font-mono font-bold text-erp-navy dark:text-white">
              {activeEntityTab === 'suppliers'
                ? (isRTL ? 'إجمالي المستحق: ' : 'Total Payable: ')
                : (isRTL ? 'إجمالي المستحقات: ' : 'Total Receivable: ')
              }
              {fmtAmount(activeEntityTab === 'suppliers' ? stats.suppliers.totalPayables : stats.customers.totalReceivables)}
              <span className="text-gray-400 ms-1">{baseCurrency || ''}</span>
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

      {/* ─── Add Party Sheet ─── */}
      <AddPartySheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        type={activeEntityTab === 'customers' ? 'customer' : 'supplier'}
        onComplete={handleRefresh}
      />

      {/* ─── Import Wizard ─── */}
      {showImportWizard && (
        <ImportWizard
          defaultEntityType={activeEntityTab}
          onClose={() => setShowImportWizard(false)}
          onComplete={() => { setShowImportWizard(false); handleRefresh(); }}
        />
      )}
    </div>
  );
}
