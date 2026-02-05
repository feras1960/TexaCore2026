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
  Globe
} from 'lucide-react';
import { AddAccountSheet } from './AddAccountSheet';
import { AccountTreeView } from './AccountTreeView';
import { UniversalDetailSheet } from '@/components/sheets';
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

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
}

type ViewMode = 'tree' | 'table';

export function ChartOfAccounts() {
  const { t, language, direction } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
  const [collapseAll, setCollapseAll] = useState<boolean | undefined>(undefined);
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { selectedCurrency, setSelectedCurrency, currencyOptions, formatAmount } = useViewCurrency();

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

  const handleAddClick = () => {
    setSelectedParent(null);
    setEditingAccount(null);
    setIsGroupMode(false);
    setIsAddSheetOpen(true);
  };

  const handleAccountClick = (account: Account) => {
    // فقط فتح popup للحسابات التفصيلية (ليس المجموعات)
    if (!account.is_group) {
      setSelectedAccountForDetails(account);
      setIsAccountDetailsOpen(true);
    }
    // المجموعات ستُعرض في الجانب الأيمن تلقائياً عبر AccountTreeView
  };

  const handleAddChild = (parent: Account) => {
    setSelectedParent(parent);
    setEditingAccount(null);
    setIsGroupMode(false);
    setIsAddSheetOpen(true);
  };

  const handleAddGroup = () => {
    setSelectedParent(null);
    setEditingAccount(null);
    setIsGroupMode(true);
    setIsAddSheetOpen(true);
  };

  const handleDeleteClick = (account: Account) => {
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

      setIsAddSheetOpen(false);
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
  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
  const groupsCount = accounts.filter((a) => a.is_group).length;

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
      account.currency_code || 'SAR',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Filter accounts based on search query and filters
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

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
  }, [accounts, searchQuery, accountTypeFilter, statusFilter, selectedCurrency, company?.default_currency]);



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
        const balance = row.current_balance ?? 0;
        const currencyCode = selectedCurrency && selectedCurrency !== 'all'
          ? selectedCurrency
          : (row.currency_code || row.currency || company?.default_currency || '');
        return (
          <span
            className={cn(
              'font-medium',
              balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {currencyCode && (
              <span className="text-xs ms-1 text-gray-500 dark:text-gray-400">
                {currencyCode}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label={t('accounting.totalAccounts')}
          value={totalAccounts}
          icon={BarChart3}
        />
        <StatCard
          label={t('accounting.activeAccounts')}
          value={activeAccounts}
          icon={CheckCircle2}
        />
        <StatCard
          label={t('accounting.groupsCount')}
          value={groupsCount}
          icon={Folder}
        />
        <StatCard
          label={t('accounting.totalBalance')}
          value={totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          icon={DollarSign}
        />
      </div>

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
                <SelectItem value="all">{t('common.all')}</SelectItem>
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

      {/* Add/Edit Sheet */}
      {companyId && (
        <AddAccountSheet
          isOpen={isAddSheetOpen}
          onClose={() => {
            setIsAddSheetOpen(false);
            setEditingAccount(null);
            setSelectedParent(null);
            setIsGroupMode(false);
          }}
          onSave={handleSave}
          parentAccount={selectedParent}
          editingAccount={editingAccount}
          allAccounts={accounts}
          companyId={companyId}
          isGroupMode={isGroupMode}
        />
      )}

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

      {/* Account Details Sheet - Universal */}
      <UniversalDetailSheet
        isOpen={isAccountDetailsOpen}
        onClose={() => {
          setIsAccountDetailsOpen(false);
          setSelectedAccountForDetails(null);
        }}
        docType="account"
        data={selectedAccountForDetails}
        onRefresh={refetch}
        onEdit={() => {
          setEditingAccount(selectedAccountForDetails);
          setSelectedParent(null);
          setIsGroupMode(false);
          setIsAccountDetailsOpen(false);
          setIsAddSheetOpen(true);
        }}
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
