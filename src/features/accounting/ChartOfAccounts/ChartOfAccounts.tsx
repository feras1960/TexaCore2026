/**
 * ChartOfAccounts Page
 * Main page for Chart of Accounts with tree view
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Folder,
  DollarSign,
  Search,
  FileText,
  Printer,
  FolderPlus,
  FolderTree,
  Upload,
  LayoutList,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Filter,
  X,
  Globe,
  Eye,
  EyeOff,
  Lock,
  Shield,
  TrendingUp,
  TrendingDown,
  Scale,
  Landmark,
} from 'lucide-react';
import { AddAccountSheet } from './AddAccountSheet';
import { AccountTreeView } from './AccountTreeView';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { SummaryAccountSheet } from '@/features/accounting/components/summary/SummaryAccountSheet';
import type { SummaryAccountData } from '@/features/accounting/components/summary/SummaryAccountSheet';
import { ImportWizard } from '@/features/import';
import { ChartTemplateSelector } from '@/components/accounting/ChartTemplateSelector';
import { useAccounts } from '@/hooks/useAccounts';
import { useCompany } from '@/hooks/useCompany';
import { useViewCurrency } from '../hooks/useViewCurrency';
import { StatCard } from '@/components/shared/stats/StatCard';
import { NexaTable, type Column, UnifiedModal, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { Account, CreateAccountInput, SupportedLanguage } from '@/services/accountsService';
import { getAccountName } from '@/services/accountsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
}

type ViewMode = 'tree' | 'table';

export function ChartOfAccounts() {
  const { t, language, direction } = useLanguage();
  const { isTenantOwner, hasAnyRole } = useRBAC();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [createSheetData, setCreateSheetData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
  const [collapseAll, setCollapseAll] = useState<boolean | undefined>(undefined);
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { selectedCurrency, setSelectedCurrency, currencyOptions, formatAmount, convertAmount } = useViewCurrency();

  // Get company from hook (fetches first company automatically)
  const { company, companyId, loading: companyLoading, refetch: refetchCompany } = useCompany(true);

  const { accounts, loading, error, refetch, createAccount, updateAccount, deleteAccount } = useAccounts({
    companyId: companyId || undefined,
    autoFetch: !!companyId, // Only auto-fetch if we have a company ID
  });

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Chart template selector state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Summary Account Sheet state
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const [summarySheetData, setSummarySheetData] = useState<SummaryAccountData | null>(null);

  // ═══ Helper: resolve account_type_id from parent hierarchy ═══
  const resolveAccountTypeFromParent = useCallback((parentId: string): string | null => {
    const parent = accounts.find(a => a.id === parentId);
    if (!parent) return null;
    if (parent.account_type_id) return parent.account_type_id;
    if (parent.parent_id) return resolveAccountTypeFromParent(parent.parent_id);
    return null;
  }, [accounts]);

  const handleAddClick = () => {
    // Open UnifiedAccountingSheet in create mode (detail account)
    setCreateSheetData({
      company_id: companyId,
      is_group: false,
      is_active: true,
      level: 1,
    });
    setIsCreateSheetOpen(true);
  };

  const handleAccountClick = (account: Account) => {
    // Groups should not open the detail sheet — they are just containers
    if (account.is_group) return;

    // اعتراض: إذا كان حساب ملخص → فتح SummaryAccountSheet
    if ((account as any).is_summary_account) {
      setSummarySheetData({
        id: account.id,
        account_code: account.code || account.account_code || '',
        name_ar: account.name_ar || '',
        name_en: account.name_en || '',
        summary_party_type: (account as any).summary_party_type || 'employee',
        parent_id: account.parent_id || '',
        current_balance: account.current_balance || 0,
        company_id: (account as any).company_id || companyId || '',
        tenant_id: (account as any).tenant_id || '',
      });
      setSummarySheetOpen(true);
      return;
    }
    // فتح popup عادي
    setSelectedAccountForDetails(account);
    setIsAccountDetailsOpen(true);
  };

  // ═══ Helper: compute next sequential account code for a parent group ═══
  const getNextChildCode = useCallback((parent: Account): string => {
    const parentCode = parent.code || parent.account_code || '';
    if (!parentCode) return '';

    // Get direct children of this parent
    const children = accounts.filter(a => a.parent_id === parent.id);

    if (children.length === 0) {
      // First child: parentCode + "1" → e.g. 111 → 1111
      return parentCode + '1';
    }

    // Find max code among direct children (only codes that start with parentCode)
    const childCodes = children
      .map(a => {
        const code = a.code || a.account_code || '';
        return code.startsWith(parentCode) ? parseInt(code) : NaN;
      })
      .filter(n => !isNaN(n));

    if (childCodes.length === 0) {
      return parentCode + '1';
    }

    const maxCode = Math.max(...childCodes);
    return (maxCode + 1).toString();
  }, [accounts]);

  const handleAddChild = (parent: Account) => {
    // Open UnifiedAccountingSheet in create mode under a parent group
    const inheritedType = resolveAccountTypeFromParent(parent.id);
    const nextCode = getNextChildCode(parent);
    setCreateSheetData({
      company_id: companyId,
      parent_id: parent.id,
      is_group: false,
      is_active: true,
      level: (parent.level || 0) + 1,
      account_type_id: inheritedType || parent.account_type_id,
      account_code: nextCode,
    });
    setIsCreateSheetOpen(true);
  };

  const handleAddGroup = () => {
    // Open UnifiedAccountingSheet in create mode (group)
    setCreateSheetData({
      company_id: companyId,
      is_group: true,
      is_active: true,
      level: 1,
    });
    setIsCreateSheetOpen(true);
  };

  const handleDeleteClick = (account: Account) => {
    // حماية حسابات النظام من الحذف
    if (account.is_system) {
      toast.error(t('accounting.cannotDeleteSystemAccount') || 'لا يمكن حذف حساب نظام محمي');
      return;
    }
    setAccountToDelete(account);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    try {
      await deleteAccount(accountToDelete.id);
      setDeleteConfirmOpen(false);
      setAccountToDelete(null);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error?.message || t('accounting.deleteAccountError'));
    }
  };

  const handleSave = async (accountData: CreateAccountInput): Promise<void> => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
      } else {
        await createAccount(accountData);
      }

      // fetchAccounts is called automatically by createAccount/updateAccount
      // Wait a bit for the accounts to be refreshed
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsCreateSheetOpen(false);
      setCreateSheetData(null);
      setEditingAccount(null);
      setSelectedParent(null);
      setIsGroupMode(false);
    } catch (error: any) {
      console.error('Error saving account:', error);
      // Re-throw error so AddAccountSheet can handle it
      const errorMessage = error?.message || 'Failed to save account';
      throw new Error(errorMessage);
    }
  };

  // Calculate stats
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.is_active).length;
  const groupsCount = accounts.filter((a) => a.is_group).length;

  // Currency symbol mapping
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '€', UAH: '₴', TRY: '₺', RUB: '₽', GBP: '£', JPY: '¥', CNY: '¥',
  };
  const currencySymbol = selectedCurrency && selectedCurrency !== 'all'
    ? (CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency)
    : '$';

  // ═══ RPC-based account balances — single source of truth ═══
  // balance = FC (native currency), balance_base = base currency (always balanced)
  const [rpcBalances, setRpcBalances] = useState<Map<string, {
    total_debit: number;
    total_credit: number;
    balance: number;
    balance_base: number;
    currency: string;
    transaction_count: number;
    last_activity: string | null;
  }>>(new Map());

  useEffect(() => {
    if (!companyId || accounts.length === 0) return;
    const fetchAllBalances = async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_account_balances_fc', {
          p_company_id: companyId,
        });
        if (error || !data) {
          console.warn('[ChartOfAccounts] RPC get_all_account_balances_fc error:', error?.message);
          return;
        }
        const map = new Map<string, any>();
        (data as any[]).forEach((row: any) => {
          map.set(row.account_id, {
            total_debit: Number(row.total_debit) || 0,
            total_credit: Number(row.total_credit) || 0,
            balance: Number(row.balance) || 0,
            balance_base: Number(row.balance_base) || 0,
            currency: row.currency || '',
            transaction_count: Number(row.transaction_count) || 0,
            last_activity: row.last_activity,
          });
        });
        setRpcBalances(map);
      } catch (e) {
        console.warn('[ChartOfAccounts] Failed to fetch RPC balances:', e);
      }
    };
    fetchAllBalances();
  }, [companyId, accounts]);

  // ═══ 🔴 Realtime: auto-refresh on chart_of_accounts / journal_entries changes ═══
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase.channel(`coa-realtime-${companyId}`)
      // Listen to chart_of_accounts changes (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chart_of_accounts', filter: `company_id=eq.${companyId}` },
        () => {
          // Debounce: wait 500ms to batch rapid changes
          setTimeout(() => refetch(), 500);
        },
      )
      // Listen to journal_entries changes (affects balances)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journal_entries', filter: `company_id=eq.${companyId}` },
        () => {
          // When journal entries change, re-fetch balances
          setTimeout(() => refetch(), 800);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, refetch]);

  // ═══════════════════════════════════════════════════════════════
  // 💰 MULTI-CURRENCY: Per-account native currency approach
  // ═══════════════════════════════════════════════════════════════
  //
  // After DB fix (20260331_fix_rpc_currency_detection.sql):
  //   - All accounts now have correct currency in chart_of_accounts
  //   - All journal_entry_lines have correct debit_fc/credit_fc
  //   - RPC returns correct FC balance per account
  //
  // Balance display logic:
  //   FC balance = balance in the account's OWN currency
  //   When displaying in a different currency → convert using rates
  //   Tree totals aggregate converted balances
  // ═══════════════════════════════════════════════════════════════
  const baseCurrency = company?.default_currency || 'USD';

  const accountsWithRpcBalances = useMemo(() => {
    if (rpcBalances.size === 0) return accounts;
    return accounts.map(a => {
      const rpc = rpcBalances.get(a.id);
      if (!rpc) {
        // No RPC data: for group accounts, force balance to 0
        // (groups don't have their own balance — tree sums children)
        if (a.is_group) {
          return { ...a, current_balance: 0 };
        }
        return a;
      }

      // Account's actual currency from RPC (which reads from chart_of_accounts)
      const accountCurrency = rpc.currency || a.currency_code || a.currency || baseCurrency;

      return {
        ...a,
        // FC balance in the account's native currency
        current_balance: rpc.balance,
        // Account's own currency
        currency_code: accountCurrency,
        currency: accountCurrency,
        // Base balance for reference
        _balance_base: rpc.balance_base,
        _total_debit: rpc.total_debit,
        _total_credit: rpc.total_credit,
      };
    });
  }, [accounts, rpcBalances, baseCurrency]);

  // ═══ Convert from account's native currency → display currency ═══
  const enhancedConvertBalance = useCallback((amount: number, accountCurrency: string, _accountId?: string): number => {
    if (amount === 0) return 0;
    // If no currency info or same as display → no conversion
    if (!accountCurrency || accountCurrency === selectedCurrency) return amount;
    if (selectedCurrency === 'all') return amount;
    // Convert from account's native currency to selected display currency
    return convertAmount(amount, accountCurrency);
  }, [selectedCurrency, convertAmount]);

  // ═══ Financial Stats (by account_code prefix) — multi-currency aware ═══
  const financialStats = useMemo(() => {
    const getRootCode = (account: Account): string => {
      const code = account.code || (account as any).account_code || '';
      return code.charAt(0);
    };

    // Only leaf accounts (non-group), excluding SUM accounts
    const leafAccounts = accountsWithRpcBalances.filter(a => !a.is_group && !(a as any).is_summary_account);

    // Helper: convert from account's native currency → selected display currency
    const getConvertedBalance = (a: Account): number => {
      const balance = a.current_balance ?? 0;
      if (balance === 0) return 0;
      const accountCurrency = a.currency_code || a.currency || baseCurrency;
      if (selectedCurrency === 'all' || accountCurrency === selectedCurrency) return balance;
      return convertAmount(balance, accountCurrency);
    };

    const totalAssets = leafAccounts
      .filter(a => getRootCode(a) === '1')
      .reduce((sum, a) => sum + getConvertedBalance(a), 0);

    const totalLiabilities = leafAccounts
      .filter(a => getRootCode(a) === '2')
      .reduce((sum, a) => sum + getConvertedBalance(a), 0);

    const totalEquity = leafAccounts
      .filter(a => getRootCode(a) === '3')
      .reduce((sum, a) => sum + getConvertedBalance(a), 0);

    const totalRevenue = leafAccounts
      .filter(a => getRootCode(a) === '4')
      .reduce((sum, a) => sum + getConvertedBalance(a), 0);

    const totalExpenses = leafAccounts
      .filter(a => getRootCode(a) === '5')
      .reduce((sum, a) => sum + getConvertedBalance(a), 0);

    const netProfit = -totalRevenue - totalExpenses;

    const totalAll = totalAssets + totalExpenses + totalLiabilities + totalEquity + totalRevenue;
    const balanceDiff = Math.abs(totalAll);
    // balance_base is guaranteed balanced (sum of debit - credit = 0)
    const isBalanced = balanceDiff < 0.02;

    // ═══ Trial Balance: Debit = all positive, Credit = abs(all negative) ═══
    let debitSide = 0;
    let creditSide = 0;
    leafAccounts.forEach(a => {
      const converted = getConvertedBalance(a);
      if (converted > 0) {
        debitSide += converted;
      } else if (converted < 0) {
        creditSide += Math.abs(converted);
      }
    });
    const liabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netProfit,
      liabilitiesAndEquity,
      debitSide,
      creditSide,
      balanceDiff,
      isBalanced,
    };
  }, [accountsWithRpcBalances, selectedCurrency, convertAmount, baseCurrency]);

  // ═══ Trial Balance from Backend RPC — 100% guaranteed balanced ═══
  const [trialBalance, setTrialBalance] = useState<{
    total_debit: number;
    total_credit: number;
    balance_diff: number;
    is_balanced: boolean;
    base_currency: string;
  } | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const fetchTrialBalance = async () => {
      try {
        const { data, error } = await supabase.rpc('get_trial_balance_base', {
          p_company_id: companyId,
        });
        if (error || !data || data.length === 0) return;
        const row = data[0];
        setTrialBalance({
          total_debit: Number(row.total_debit) || 0,
          total_credit: Number(row.total_credit) || 0,
          balance_diff: Number(row.balance_diff) || 0,
          is_balanced: row.is_balanced,
          base_currency: row.base_currency || 'USD',
        });
      } catch (e) {
        console.warn('[ChartOfAccounts] Trial balance RPC error:', e);
      }
    };
    fetchTrialBalance();
  }, [companyId, accounts]);
  const canSeeProfitCard = hasAnyRole(['super_admin', 'tenant_owner', 'company_owner']);
  const [profitRevealed, setProfitRevealed] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Reset profit visibility when leaving page
  useEffect(() => {
    return () => setProfitRevealed(false);
  }, []);

  const handleProfitCardClick = () => {
    if (profitRevealed) {
      setProfitRevealed(false);
      return;
    }
    setPasswordInput('');
    setPasswordDialogOpen(true);
  };

  const verifyPasswordAndReveal = async () => {
    if (!user?.email || !passwordInput) return;
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordInput,
      });
      if (error) {
        toast.error(language === 'ar' ? 'كلمة السر غير صحيحة' : 'Incorrect password');
      } else {
        setProfitRevealed(true);
        setPasswordDialogOpen(false);
        toast.success(language === 'ar' ? 'تم التحقق بنجاح' : 'Verified successfully');
      }
    } catch {
      toast.error(language === 'ar' ? 'خطأ في التحقق' : 'Verification error');
    } finally {
      setPasswordLoading(false);
      setPasswordInput('');
    }
  };

  // Export to CSV
  const generateCSV = () => {
    const headers = [
      language === 'ar' ? 'الكود' : 'Code',
      language === 'ar' ? 'الاسم' : 'Name',
      language === 'ar' ? 'النوع' : 'Type',
      language === 'ar' ? 'المجموعة' : 'Group',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'الرصيد' : 'Balance',
      language === 'ar' ? 'العملة' : 'Currency',
    ];

    const rows = filteredAccounts.map(account => [
      account.code || '',
      getAccountName(account, language as SupportedLanguage),
      account.account_type_code ? t(`accounting.accountTypes.${account.account_type_code.toLowerCase()}`) : '',
      account.is_group ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No'),
      account.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive'),
      (account.current_balance ?? 0).toString(),
      account.currency_code || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Filter accounts based on search query and filters
  const filteredAccounts = useMemo(() => {
    let filtered = accountsWithRpcBalances;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          (account.code && account.code.toLowerCase().includes(query)) ||
          (account.name_ar && account.name_ar.toLowerCase().includes(query)) ||
          (account.name_en && account.name_en.toLowerCase().includes(query)) ||
          (account.name_ru && account.name_ru.toLowerCase().includes(query)) ||
          (account.name_uk && account.name_uk.toLowerCase().includes(query)) ||
          (account.name_ro && account.name_ro.toLowerCase().includes(query)) ||
          (account.name_pl && account.name_pl.toLowerCase().includes(query)) ||
          (account.name_tr && account.name_tr.toLowerCase().includes(query)) ||
          (account.name_de && account.name_de.toLowerCase().includes(query)) ||
          (account.name_it && account.name_it.toLowerCase().includes(query)) ||
          (account.account_type_code && account.account_type_code.toLowerCase().includes(query))
      );
    }

    // Account type filter
    if (accountTypeFilter !== 'all') {
      filtered = filtered.filter(
        (account) => account.account_type_code?.toLowerCase() === accountTypeFilter.toLowerCase()
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (account) => statusFilter === 'active' ? account.is_active : !account.is_active
      );
    }

    // Currency filter - REMOVED: Now acts as a View As selector, not a row filter
    // if (selectedCurrency && selectedCurrency !== 'all') { ... }

    return filtered;
  }, [accountsWithRpcBalances, searchQuery, accountTypeFilter, statusFilter, selectedCurrency, company?.default_currency]);



  // Build tree structure from flat accounts list
  const buildTree = useCallback((accs: Account[]): AccountTreeNode[] => {
    const accountMap = new Map<string, AccountTreeNode>();
    const rootNodes: AccountTreeNode[] = [];

    // First pass: create all nodes
    accs.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Second pass: build tree
    accs.forEach((account) => {
      const node = accountMap.get(account.id)!;
      if (account.parent_id) {
        const parent = accountMap.get(account.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Sort by code
    const sortByCode = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
      return nodes
        .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
        .map((node) => ({
          ...node,
          children: node.children ? sortByCode(node.children) : undefined,
        }));
    };

    return sortByCode(rootNodes);
  }, []);

  // Flatten tree for table view with levels
  const flattenTree = useCallback((tree: AccountTreeNode[], level = 0): (Account & { level: number })[] => {
    let result: (Account & { level: number })[] = [];
    tree.forEach((node) => {
      const { children, ...account } = node;
      result.push({ ...account, level } as Account & { level: number });
      if (children && children.length > 0) {
        result = [...result, ...flattenTree(children, level + 1)];
      }
    });
    return result;
  }, []);

  // Build tree from filtered accounts for both tree and table views
  const treeData = useMemo(() => buildTree(filteredAccounts), [filteredAccounts, buildTree]);

  // Flatten tree for table view
  const tableAccounts = useMemo(() => {
    if (treeData.length === 0) return [];
    return flattenTree(treeData);
  }, [treeData, flattenTree]);

  // Table columns
  const tableColumns: Column<Account & { level?: number }>[] = [
    {
      key: 'code',
      title: 'accounting.account.code',
      align: 'start',
      render: (value, row) => (
        <div className="flex items-center gap-2" style={{ paddingInlineStart: `${(row.level || 0) * 24}px` }}>
          <span className="font-mono font-semibold text-erp-navy dark:text-white">{value}</span>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'accounting.account.name',
      align: 'start',
      render: (_value, row) => (
        <div className="flex items-center gap-2" style={{ paddingInlineStart: `${(row.level || 0) * 8}px` }}>
          {row.is_group ? (
            <Folder className="w-4 h-4 text-erp-teal flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="font-tajawal">{getAccountName(row, language as SupportedLanguage)}</span>
        </div>
      ),
    },
    {
      key: 'is_group',
      title: 'accounting.account.type',
      align: 'start',
      render: (_value, row) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          row.is_group
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        )}>
          {row.is_group ? t('accounting.group') : t('accounting.detail')}
        </span>
      ),
    },
    {
      key: 'current_balance',
      title: 'accounting.account.balance',
      align: 'end',
      render: (_value, row) => {
        const rawBalance = row.current_balance ?? 0;
        const accountCurrency = row.currency_code || row.currency || baseCurrency;
        
        // Convert from account's native currency to display currency
        let displayBalance = rawBalance;
        let displayCurrency = accountCurrency;
        
        if (selectedCurrency && selectedCurrency !== 'all' && accountCurrency !== selectedCurrency) {
          displayBalance = convertAmount(rawBalance, accountCurrency);
          displayCurrency = selectedCurrency;
        } else if (selectedCurrency && selectedCurrency !== 'all') {
          displayCurrency = selectedCurrency;
        }

        return (
          <span
            className={cn(
              'font-medium',
              displayBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {displayCurrency && (
              <span className="text-xs ms-1 text-gray-500 dark:text-gray-400">
                {displayCurrency}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      title: 'common.status._',
      align: 'start',
      render: (_value, row) => (
        <StatusBadge status={row.is_active ? 'confirmed' : 'cancelled'} showIcon={false} size="sm" />
      ),
    },
    {
      key: 'actions',
      title: 'common.actions',
      align: 'start',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          {row.is_group && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-erp-teal hover:bg-erp-teal/10"
              onClick={(e) => {
                e.stopPropagation();
                handleAddChild(row);
              }}
              title={t('accounting.addSubAccount')}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Show loading while fetching company
  if (companyLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show message if no company exists
  if (!companyId || !company) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 mb-2">
            {t('accounting.noCompanySelected')}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
            {t('accounting.createCompanyFirst')}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            {t('accounting.runSQLScript')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if the error is related to missing database table
    const isMissingTableError = error.message?.includes('chart_of_accounts') ||
      error.message?.includes('schema cache') ||
      error.message?.includes('404');

    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-semibold mb-2">{t('messages.loadingError')}</p>

          {isMissingTableError && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium mb-1">
                {language === 'ar' ? 'جدول قاعدة البيانات غير موجود' : 'Database table not found'}
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                {language === 'ar'
                  ? 'يرجى تشغيل ملفات الترحيل (migrations) في Supabase لإنشاء جدول chart_of_accounts'
                  : 'Please run the migration files in Supabase to create the chart_of_accounts table'
                }
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1 font-mono">
                supabase/migrations/00004_add_accounting_tables.sql
              </p>
            </div>
          )}

          <Button onClick={refetch} variant="outline" className="mt-3">
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('accounting.chartOfAccounts')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {t('accounting.chartOfAccountsDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowImportWizard(true)}>
            <Upload className="w-4 h-4 me-2" />
            {t('common.import')}
          </Button>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 me-2', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 me-2" />
            {t('accounting.printReport')}
          </Button>
          <Button variant="outline" onClick={handleAddGroup}>
            <FolderPlus className="w-4 h-4 me-2" />
            {t('accounting.addGroup')}
          </Button>
          <Button variant="teal" onClick={handleAddClick}>
            <Plus className="w-4 h-4 me-2" />
            {t('accounting.addAccount')}
          </Button>
        </div>
      </div>

      {/* Stats — Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Accounts */}
        <StatCard
          label={t('accounting.totalAccounts')}
          value={totalAccounts}
          icon={BarChart3}
        />
        {/* 2. Groups */}
        <StatCard
          label={t('accounting.groupsCount')}
          value={groupsCount}
          icon={Folder}
        />
        {/* 3. Active Accounts */}
        <StatCard
          label={t('accounting.activeAccounts')}
          value={activeAccounts}
          icon={CheckCircle2}
        />
        {/* 4. إجمالي المدين — sum of positive balances (assets + equity) */}
        <StatCard
          label={language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}
          value={financialStats.debitSide.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          icon={TrendingUp}
          type="positive"
          prefix={currencySymbol}
        />
        {/* 5. إجمالي الدائن — sum of abs(negative balances) = liabilities */}
        <StatCard
          label={language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}
          value={financialStats.creditSide.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          icon={TrendingDown}
          type="info"
          prefix={currencySymbol}
        />
        {/* 6. ميزان المراجعة — always balanced (balance_base sums to zero) */}
        <StatCard
          label={language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
          value={
            financialStats.isBalanced
              ? (language === 'ar' ? '✅ متوازن' : '✅ Balanced')
              : `❌ ${language === 'ar' ? 'فرق' : 'Diff'}: ${financialStats.balanceDiff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          }
          icon={Shield}
          type={financialStats.isBalanced ? 'positive' : 'warning'}
        />
      </div>

      {/* Net Profit Card — Owner Only + Password Protected */}
      {canSeeProfitCard && (
        <div
          className={cn(
            'mt-3 rounded-xl border p-4 cursor-pointer select-none transition-all duration-300 hover:shadow-lg',
            'bg-gradient-to-r',
            profitRevealed
              ? financialStats.netProfit >= 0
                ? 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800'
                : 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800'
              : 'from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-200 dark:border-gray-700',
          )}
          onClick={handleProfitCardClick}
          title={language === 'ar' ? 'اضغط لعرض/إخفاء صافي الربح' : 'Click to show/hide net profit'}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                profitRevealed
                  ? financialStats.netProfit >= 0
                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                    : 'bg-red-100 dark:bg-red-900/40'
                  : 'bg-gray-100 dark:bg-gray-700',
              )}>
                {profitRevealed ? (
                  financialStats.netProfit >= 0
                    ? <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'صافي الربح / الخسارة' : 'Net Profit / Loss'}
                </p>
                <p className={cn(
                  'text-2xl font-bold font-cairo transition-all duration-500',
                  profitRevealed
                    ? financialStats.netProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                    : 'text-gray-400 dark:text-gray-500 blur-sm select-none',
                )}>
                  {profitRevealed
                    ? `$ ${Math.abs(financialStats.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '$ ••••••••'
                  }
                </p>
                {profitRevealed && (
                  <p className={cn('text-xs font-medium mt-0.5',
                    financialStats.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {financialStats.netProfit >= 0
                      ? (language === 'ar' ? '↗ ربح' : '↗ Profit')
                      : (language === 'ar' ? '↘ خسارة' : '↘ Loss')
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Help tooltip */}
              <div className="relative group/help" onClick={(e) => e.stopPropagation()}>
                <div className="w-5 h-5 rounded-full bg-white/50 dark:bg-gray-600/50 flex items-center justify-center cursor-help text-[10px] font-bold text-gray-400 dark:text-gray-300">?</div>
                <div className={cn(
                  "absolute bottom-full mb-2 w-56 p-2.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-[11px] leading-relaxed shadow-xl z-50 hidden group-hover/help:block pointer-events-none",
                  direction === 'rtl' ? 'start-0' : 'end-0'
                )}>
                  {language === 'ar'
                    ? 'صافي الربح = الإيرادات (كود 4xx) - المصروفات (كود 5xx). محمي بكلمة السر ومتاح فقط لصاحب الشركة'
                    : 'Net Profit = Revenue (4xx) - Expenses (5xx). Password protected, owner access only'
                  }
                  <div className="absolute top-full end-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1" />
                </div>
              </div>
              {profitRevealed ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span>{language === 'ar' ? 'اضغط للعرض' : 'Click to reveal'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Verification Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-cairo">
              <Lock className="w-5 h-5 text-erp-primary" />
              {language === 'ar' ? 'تحقق من الهوية' : 'Identity Verification'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'ar'
                ? 'ادخل كلمة سر حسابك لعرض صافي الربح / الخسارة'
                : 'Enter your account password to reveal net profit / loss'
              }
            </p>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'كلمة السر' : 'Password'}</Label>
              <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); verifyPasswordAndReveal(); }}>
                {/* Hidden username field to absorb autofill */}
                <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
                <Input
                  type="password"
                  name="profit-verify-password"
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل كلمة السر' : 'Enter your password'}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPasswordAndReveal()}
                  autoFocus
                />
              </form>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={verifyPasswordAndReveal}
              disabled={!passwordInput || passwordLoading}
              className="gap-2"
            >
              {passwordLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {language === 'ar' ? 'تحقق وعرض' : 'Verify & Reveal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search, Filters, and View Controls - في صف واحد */}
      <div className="space-y-3">
        <div className={cn(
          "flex items-center gap-3 flex-wrap",
          direction === 'rtl' ? 'flex-row-reverse' : ''
        )}>
          {/* Search - على اليسار في RTL */}
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder={t('accounting.searchPlaceholder') || t('common.search')}
              className="ps-9 bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-gray-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              name="coa-search"
            />
          </div>

          {/* Currency Selector */}
          <div className="min-w-[160px] sm:w-52">
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="h-9 bg-gray-50 dark:bg-gray-800 border-none">
                <Globe className="w-4 h-4 me-2 text-gray-400 dark:text-gray-500" />
                <SelectValue placeholder={t('common.currency')} />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9"
          >
            <Filter className="w-4 h-4 me-2" />
            {t('common.filter')}
            {(accountTypeFilter !== 'all' || statusFilter !== 'all' || (selectedCurrency && selectedCurrency !== 'all')) && (
              <span className="ms-2 px-1.5 py-0.5 bg-erp-teal text-white text-xs rounded-full">
                {(accountTypeFilter !== 'all' ? 1 : 0) +
                  (statusFilter !== 'all' ? 1 : 0) +
                  (selectedCurrency && selectedCurrency !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csvContent = generateCSV();
              const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
            className="h-9"
          >
            <Download className="w-4 h-4 me-2" />
            {t('common.export')}
          </Button>

          {/* View Controls - في أقصى اليمين */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tree')}
                className={cn(
                  'h-8 px-3',
                  viewMode === 'tree'
                    ? 'bg-erp-navy text-white dark:bg-erp-navy dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <FolderTree className="w-4 h-4 me-2" />
                {t('accounting.treeView')}
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  'h-8 px-3',
                  viewMode === 'table'
                    ? 'bg-erp-navy text-white dark:bg-erp-navy dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <LayoutList className="w-4 h-4 me-2" />
                {t('accounting.tableView')}
              </Button>
            </div>

            {/* Expand/Collapse All (only in tree view) */}
            {viewMode === 'tree' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCollapseAll(undefined);
                    setExpandAll(true);
                    setTimeout(() => setExpandAll(undefined), 100);
                  }}
                  className="h-8"
                >
                  <ChevronsDownUp className="w-4 h-4 me-2" />
                  {t('accounting.expandAll')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExpandAll(undefined);
                    setCollapseAll(true);
                    setTimeout(() => setCollapseAll(undefined), 100);
                  }}
                  className="h-8"
                >
                  <ChevronsUpDown className="w-4 h-4 me-2" />
                  {t('accounting.collapseAll')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('common.filter')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAccountTypeFilter('all');
                  setStatusFilter('all');
                  setSelectedCurrency('all');
                }}
                className="h-7 text-xs"
              >
                <X className="w-3 h-3 me-1" />
                {t('common.clear')}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  {t('accounting.account.type')}
                </Label>
                <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="asset">{t('accounting.accountTypes.asset')}</SelectItem>
                    <SelectItem value="current_asset">{t('accounting.accountTypes.current_asset')}</SelectItem>
                    <SelectItem value="fixed_asset">{t('accounting.accountTypes.fixed_asset')}</SelectItem>
                    <SelectItem value="liability">{t('accounting.accountTypes.liability')}</SelectItem>
                    <SelectItem value="current_liability">{t('accounting.accountTypes.current_liability')}</SelectItem>
                    <SelectItem value="long_term_liability">{t('accounting.accountTypes.long_term_liability')}</SelectItem>
                    <SelectItem value="equity">{t('accounting.accountTypes.equity')}</SelectItem>
                    <SelectItem value="revenue">{t('accounting.accountTypes.revenue')}</SelectItem>
                    <SelectItem value="expense">{t('accounting.accountTypes.expense')}</SelectItem>
                    <SelectItem value="cogs">{t('accounting.accountTypes.cogs')}</SelectItem>
                    <SelectItem value="other_income">{t('accounting.accountTypes.other_income')}</SelectItem>
                    <SelectItem value="other_expense">{t('accounting.accountTypes.other_expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  {t('common.status._')}
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="active">{t('common.status.active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tree View or Table View */}
      {!loading && accounts.length === 0 ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <FolderTree className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('accounting.noAccountsTitle')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('accounting.noAccountsDescription')}
              </p>
            </div>
            {company?.chart_type ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-start">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  <strong>{t('accounting.chartTypeApplied')}:</strong> {company.chart_type}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {t('accounting.chartTypeButNoAccounts')}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-start">
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2 font-medium">
                  {t('accounting.noChartTemplateApplied')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  {t('accounting.applyTemplateInstructions')}
                </p>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-900/30 p-2 rounded">
                  {t('accounting.sqlTemplateExample')}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2 flex-wrap">
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="w-4 h-4 me-2" />
                {t('common.refresh')}
              </Button>
              {companyId && (
                <Button variant="default" onClick={() => setShowTemplateSelector(true)}>
                  <FolderTree className="w-4 h-4 me-2" />
                  {t('accounting.templates.selectAndApply')}
                </Button>
              )}
              <Button variant="teal" onClick={handleAddClick}>
                <Plus className="w-4 h-4 me-2" />
                {t('accounting.addFirstAccount')}
              </Button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      ) : viewMode === 'tree' ? (
        <AccountTreeView
          accounts={filteredAccounts}
          onAccountClick={handleAccountClick}
          onDeleteClick={handleDeleteClick}
          onAddChild={handleAddChild}
          expandAll={expandAll}
          collapseAll={collapseAll}
          searchQuery={searchQuery}
          convertBalance={selectedCurrency !== 'all' ? convertAmount : undefined}
          enhancedConvertBalance={selectedCurrency !== 'all' ? enhancedConvertBalance : undefined}
          onExpandStateChange={() => {
            setExpandAll(undefined);
            setCollapseAll(undefined);
          }}
        />
      ) : (
        <NexaTable
          data={tableAccounts}
          columns={tableColumns}
          onRowClick={(row) => handleAccountClick(row)}
          showRowNumbers
          rowKey="id"
          emptyMessage={t('table.noData')}
        />
      )}

      {/* ═══ Create Account Sheet — UnifiedAccountingSheet in create mode ═══ */}
      <UnifiedAccountingSheet
        isOpen={isCreateSheetOpen}
        onClose={() => {
          setIsCreateSheetOpen(false);
          setCreateSheetData(null);
        }}
        docType="account"
        mode="create"
        data={createSheetData}
        companyId={companyId || undefined}
        options={{ allAccounts: accounts }}
        onRefresh={refetch}
        onSave={async () => {
          refetch();
          setIsCreateSheetOpen(false);
          setCreateSheetData(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <UnifiedModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setAccountToDelete(null);
        }}
        title={t('accounting.deleteAccount')}
        description={
          accountToDelete
            ? `${t('accounting.deleteAccountConfirm')}\n\n${accountToDelete.code} - ${getAccountName(accountToDelete, language as SupportedLanguage)}\n\n${t('accounting.deleteAccountWarning')}`
            : ''
        }
        icon={FolderTree}
        iconColor="from-red-500 to-red-600"
        size="md"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setAccountToDelete(null);
        }}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant="destructive"
      >
        <div />
      </UnifiedModal>

      {/* Account Details Sheet — Unified (Full-featured) */}
      <UnifiedAccountingSheet
        isOpen={isAccountDetailsOpen}
        onClose={() => {
          setIsAccountDetailsOpen(false);
          setSelectedAccountForDetails(null);
        }}
        docType="account"
        mode={selectedAccountForDetails?.id ? 'view' : 'create'}
        data={selectedAccountForDetails}
        companyId={companyId || undefined}
        options={{ allAccounts: accounts }}
        onRefresh={refetch}
        onSave={async () => {
          refetch();
          setIsAccountDetailsOpen(false);
          setSelectedAccountForDetails(null);
        }}
        enableEditFlow
        onEditPermissionDenied={() => {
          // Fallback: open unified sheet in edit mode
          if (selectedAccountForDetails) {
            setCreateSheetData(selectedAccountForDetails);
            setIsAccountDetailsOpen(false);
            setIsCreateSheetOpen(true);
          }
        }}
      />

      {/* ═══ Summary Account Sheet — حسابات ملخصة (موظفين/عملاء/موردين) ═══ */}
      <SummaryAccountSheet
        isOpen={summarySheetOpen}
        onClose={() => {
          setSummarySheetOpen(false);
          setSummarySheetData(null);
        }}
        data={summarySheetData}
        companyId={companyId || undefined}
        onRefresh={refetch}
      />

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          defaultEntityType="chart_of_accounts"
          onClose={() => setShowImportWizard(false)}
          onComplete={() => {
            setShowImportWizard(false);
            refetch();
          }}
        />
      )}

      {/* Chart Template Selector */}
      {companyId && (
        <ChartTemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          companyId={companyId}
          onApplied={async () => {
            // Refresh company data first to get updated chart_type
            try {
              await refetchCompany();
            } catch (error) {
              console.error('Error refreshing company:', error);
            }

            // Wait a bit for database to finish creating accounts
            // Then retry fetching accounts multiple times
            let retries = 0;
            const maxRetries = 6;
            const retryDelay = 2000; // 2 seconds between retries

            const tryFetchAccounts = async () => {
              try {
                await refetch();

                // Check if we got accounts by checking the accounts array
                // We'll check this in the next render cycle
                retries++;

                if (retries < maxRetries) {
                  setTimeout(tryFetchAccounts, retryDelay);
                } else {
                  // After max retries, show a message
                  console.warn('Accounts may still be loading. Please refresh manually if needed.');
                }
              } catch (error) {
                console.error('Error fetching accounts after template application:', error);
                retries++;
                if (retries < maxRetries) {
                  setTimeout(tryFetchAccounts, retryDelay);
                }
              }
            };

            // Start fetching after initial delay (give DB time to create accounts)
            setTimeout(tryFetchAccounts, 3000);
          }}
        />
      )}
    </div>
  );
}

export default ChartOfAccounts;
