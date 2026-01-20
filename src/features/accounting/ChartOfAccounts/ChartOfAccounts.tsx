/**
 * ChartOfAccounts Page
 * Main page for Chart of Accounts with tree view
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Upload
} from 'lucide-react';
import { AddAccountSheet } from './AddAccountSheet';
import { UniversalDetailSheet } from '@/components/sheets';
import { ImportWizard } from '@/features/import';
import { useAccounts } from '@/hooks/useAccounts';
import { useCompany } from '@/hooks/useCompany';
import { StatCard } from '@/components/shared/stats/StatCard';
import { NexaTable, type Column, UnifiedModal, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { Account, CreateAccountInput, SupportedLanguage } from '@/services/accountsService';
import { getAccountName } from '@/services/accountsService';

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
}

export function ChartOfAccounts() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);

  // Get company from hook (fetches first company automatically)
  const { company, companyId, loading: companyLoading } = useCompany(true);
  
  const { accounts, loading, error, refetch, createAccount, updateAccount, deleteAccount } = useAccounts({
    companyId: companyId || undefined,
    autoFetch: !!companyId, // Only auto-fetch if we have a company ID
  });

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  
  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);

  const handleAddClick = () => {
    setSelectedParent(null);
    setEditingAccount(null);
    setIsGroupMode(false);
    setIsAddSheetOpen(true);
  };

  const handleAccountClick = (account: Account) => {
    // Open AccountDetailsSheet when clicking on an account
    setSelectedAccountForDetails(account);
    setIsAccountDetailsOpen(true);
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

  // Filter accounts based on search query (searches in all language fields)
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter(
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
        (account.name_it && account.name_it.toLowerCase().includes(query))
    );
  }, [accounts, searchQuery]);

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
        .sort((a, b) => a.code.localeCompare(b.code))
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
        return (
          <span
            className={cn(
              'font-medium',
              balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      title: 'common.status',
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

      {/* Search */}
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder={t('common.search')}
            className="ps-9 bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-gray-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table View */}
      <NexaTable
        data={tableAccounts}
        columns={tableColumns}
        onRowClick={(row) => handleAccountClick(row)}
        showRowNumbers
        rowKey="id"
        emptyMessage={t('table.noData')}
      />

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
    </div>
  );
}

export default ChartOfAccounts;
