/**
 * AccountTreeView Component
 * Tree view for Chart of Accounts (ERPNext style)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Trash2, MoreHorizontal, BarChart3, DollarSign, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Account, SupportedLanguage } from '@/services/accountsService';
import { getAccountName } from '@/services/accountsService';

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
  expanded?: boolean;
}

interface AccountTreeViewProps {
  accounts: Account[];
  onAccountClick?: (account: Account) => void;
  onAccountExpand?: (account: Account, expanded: boolean) => void;
  onDeleteClick?: (account: Account) => void;
  onAddChild?: (parent: Account) => void;
  expandAll?: boolean;
  collapseAll?: boolean;
  onExpandStateChange?: () => void;
  className?: string;
  height?: string;
}

// TreeNode component - renders a single tree node using divs (not table)
function TreeNode({
  node,
  level = 0,
  onToggle,
  onSelect,
  expanded,
  selectedId,
  t,
  language,
  onDeleteClick,
  onAddChild,
  getChildrenCount,
}: {
  node: AccountTreeNode;
  level?: number;
  onToggle: (id: string) => void;
  onSelect: (node: AccountTreeNode) => void;
  expanded: Set<string>;
  selectedId?: string | null;
  t: (key: string) => string;
  language: string;
  onDeleteClick?: (account: Account) => void;
  onAddChild?: (parent: Account) => void;
  getChildrenCount?: (node: AccountTreeNode) => number;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  // استخدام getAccountName من accountsService
  const accountName = getAccountName(node, language as SupportedLanguage);

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-all duration-200 group',
          isSelected
            ? 'bg-erp-navy/10 dark:bg-erp-navy/30 text-erp-navy dark:text-white shadow-sm border border-erp-navy/20 dark:border-erp-navy/30'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-sm',
          level > 0 && 'mr-6',
          !node.is_active && 'opacity-60'
        )}
        style={{ paddingInlineStart: `${level * 24 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
          if (hasChildren && !isExpanded) onToggle(node.id);
        }}
      >
        <div
          className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : language === 'ar' ? (
              <ChevronRight className="w-4 h-4 rotate-180" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          {node.is_group ? (
            <Folder
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-colors',
                isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-400 dark:text-gray-500'
              )}
            />
          ) : (
            <FileText className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
          )}
          <span className={cn(
            'text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded transition-colors',
            isSelected
              ? 'bg-erp-navy/20 dark:bg-erp-navy/40 text-erp-navy dark:text-white font-semibold'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          )}>
            {node.code}
          </span>
          <span className={cn(
            'font-medium text-sm font-tajawal truncate transition-colors flex-1',
            isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-700 dark:text-gray-300'
          )}>
            {accountName}
          </span>

          {/* Balance Display */}
          <span className={cn(
            'text-xs font-mono px-2',
            (node.current_balance || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' :
              (node.current_balance || 0) < 0 ? 'text-rose-600 dark:text-rose-400' :
                'text-gray-400'
          )}>
            {Number(node.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          {/* عرض عدد الحسابات الفرعية بجانب المجموعات */}
          {node.is_group && getChildrenCount && getChildrenCount(node) > 0 && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
              isSelected
                ? 'bg-erp-teal/20 text-erp-teal dark:bg-erp-teal/30 dark:text-erp-teal'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}>
              {getChildrenCount(node)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {node.is_group && onAddChild && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-erp-teal hover:bg-erp-teal/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node);
              }}
              title={t('accounting.addSubAccount')}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDeleteClick && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-[10001]">
                {node.is_group && onAddChild && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(node);
                      }}
                    >
                      <Plus className="w-4 h-4 me-2" />
                      {t('accounting.addSubAccount')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(node);
                  }}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  {t('accounting.deleteAccount')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-5 animate-in slide-in-from-top-1 duration-200">
          {node.children!
            // عرض جميع الحسابات (المجموعات والحسابات التفصيلية)
            .map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onToggle={onToggle}
                onSelect={onSelect}
                expanded={expanded}
                selectedId={selectedId}
                t={t}
                language={language}
                onDeleteClick={onDeleteClick}
                onAddChild={onAddChild}
                getChildrenCount={getChildrenCount}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function AccountTreeView({
  accounts,
  onAccountClick,
  onAccountExpand,
  onDeleteClick,
  onAddChild,
  expandAll,
  collapseAll,
  onExpandStateChange,
  className,
  height,
}: AccountTreeViewProps) {
  const { t, direction, language } = useLanguage();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-expand parent nodes to show all accounts
  useEffect(() => {
    const newExpandedIds = new Set<string>();

    // For each account with a parent, expand the parent
    accounts.forEach((account) => {
      if (account.parent_id) {
        newExpandedIds.add(account.parent_id);

        // Also expand grandparent if exists
        const parent = accounts.find((a) => a.id === account.parent_id);
        if (parent?.parent_id) {
          newExpandedIds.add(parent.parent_id);
        }
      }
    });

    setExpandedIds(newExpandedIds);
  }, [accounts]);

  // Handle expand all / collapse all
  useEffect(() => {
    if (expandAll === true) {
      // Collect all account IDs (groups and detail accounts)
      const allAccountIds = new Set<string>();
      accounts.forEach((account) => {
        allAccountIds.add(account.id);
      });
      setExpandedIds(allAccountIds);
      onExpandStateChange?.();
    } else if (collapseAll === true) {
      setExpandedIds(new Set());
      onExpandStateChange?.();
    }
  }, [expandAll, collapseAll, accounts, onExpandStateChange]);

  /**
   * Build full tree structure from flat list (with all children for table view)
   */
  const fullTreeData = useMemo(() => {
    const accountMap = new Map<string, AccountTreeNode>();
    const rootNodes: AccountTreeNode[] = [];

    // First pass: create all nodes
    accounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Second pass: build full tree (with all children: groups + accounts)
    accounts.forEach((account) => {
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

    // Sort by code (keep all children for table view)
    const sortByCode = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
      return nodes
        .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
        .map((node) => ({
          ...node,
          children: node.children ? sortByCode(node.children) : undefined,
        }));
    };

    return sortByCode(rootNodes);
  }, [accounts]);

  /**
   * Build tree structure for display - عرض جميع الحسابات (المجموعات والحسابات التفصيلية)
   */
  const treeData = useMemo(() => {
    // عرض جميع الحسابات في الشجرة (ليس فقط المجموعات)
    return fullTreeData;
  }, [fullTreeData]);

  /**
   * Toggle expand/collapse
   */
  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedIds(newExpanded);

    const account = accounts.find((a) => a.id === accountId);
    if (account && onAccountExpand) {
      onAccountExpand(account, newExpanded.has(accountId));
    }
  };

  /**
   * Handle node select
   */
  const handleNodeSelect = (node: AccountTreeNode) => {
    // فقط تحديد المجموعات لعرض الحسابات في الجانب الأيمن
    if (node.is_group) {
      setSelectedId(node.id);
    }
    // لا نستدعي onAccountClick هنا للمجموعات
    // فقط للحسابات التفصيلية
    if (!node.is_group) {
      onAccountClick?.(node);
    }
  };

  // Get selected group and its children - only groups can be selected
  // Use fullTreeData to get all children (groups + accounts) for table view
  const selectedGroup = useMemo(() => {
    if (!selectedId) return null;

    const findNode = (nodes: AccountTreeNode[]): AccountTreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedId && node.is_group) return node;
        if (node.children && node.children.length > 0) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    // Use fullTreeData to get all children (groups + accounts)
    return findNode(fullTreeData);
  }, [selectedId, fullTreeData]);

  const rightPanelAccounts = selectedGroup?.children || [];

  // Calculate stats for selected group
  const groupStats = useMemo(() => {
    if (!selectedGroup || !rightPanelAccounts.length) return null;

    const totalChildren = rightPanelAccounts.length;
    const groupsCount = rightPanelAccounts.filter(a => a.is_group).length;
    const accountsCount = rightPanelAccounts.filter(a => !a.is_group).length;
    const totalBalance = rightPanelAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
    const activeCount = rightPanelAccounts.filter(a => a.is_active).length;

    return {
      totalChildren,
      groupsCount,
      accountsCount,
      totalBalance,
      activeCount,
    };
  }, [selectedGroup, rightPanelAccounts]);

  // دالة لحساب عدد الحسابات الفرعية لكل مجموعة
  const getChildrenCount = (node: AccountTreeNode): number => {
    if (!node.children) return 0;
    return node.children.length;
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col',
        className
      )}
      style={height ? { height } : undefined}
    >
      <ResizablePanelGroup
        key="coa-layout-40-60"
        direction="horizontal"
        className={cn('w-full', height ? 'flex-1 min-h-0 flex' : 'h-auto')}
        style={height ? undefined : { height: 'auto' }}
      >
        <ResizablePanel
          defaultSize={40}
          minSize={30}
          maxSize={70}
          className="border-e border-gray-100 dark:border-gray-800 flex flex-col"
          style={height ? undefined : { height: 'auto' }}
        >
          <div className="p-4 bg-gray-50/30 dark:bg-gray-800/30" dir={direction}>
            <div className="space-y-1">
              {treeData.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  {t('table.noData')}
                </div>
              ) : (
                treeData.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    onToggle={toggleExpand}
                    onSelect={handleNodeSelect}
                    expanded={expandedIds}
                    selectedId={selectedId}
                    t={t}
                    language={language}
                    onDeleteClick={onDeleteClick}
                    onAddChild={onAddChild}
                    getChildrenCount={getChildrenCount}
                  />
                ))
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-gray-200 dark:bg-gray-700" />

        {/* Right Panel - Table View (70%) - Accounts */}
        <ResizablePanel
          defaultSize={60}
          className="flex flex-col"
          style={height ? undefined : { height: 'auto' }}
        >
          <div className="p-6 bg-white dark:bg-gray-900">
            {selectedGroup ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-2">
                    <Folder className="w-6 h-6 text-erp-teal" />
                    {getAccountName(selectedGroup, language as SupportedLanguage)}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-mono mt-1">{selectedGroup.code}</p>
                </div>

                {/* Group Stats - إحصائيات سريعة */}
                {groupStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {t('accounting.totalAccounts')}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {groupStats.totalChildren}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Folder className="w-4 h-4 text-erp-teal" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {t('accounting.groupsCount')}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {groupStats.groupsCount}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {t('accounting.totalBalance')}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {groupStats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {t('accounting.activeAccounts')}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {groupStats.activeCount}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-md border border-gray-200 dark:border-gray-800 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
                      <TableRow className="border-b border-gray-200 dark:border-gray-800">
                        <TableHead className="text-start text-gray-500 dark:text-gray-400">{t('accounting.account.code')}</TableHead>
                        <TableHead className="text-start text-gray-500 dark:text-gray-400">{t('accounting.account.name')}</TableHead>
                        <TableHead className="text-start text-gray-500 dark:text-gray-400">{t('accounting.account.type')}</TableHead>
                        <TableHead className="text-end text-gray-500 dark:text-gray-400">{t('accounting.account.balance')}</TableHead>
                        <TableHead className="text-start text-gray-500 dark:text-gray-400">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rightPanelAccounts.length > 0 ? (
                        rightPanelAccounts.map((account) => (
                          <TableRow
                            key={account.id}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 transition-colors"
                            onClick={() => onAccountClick?.(account)}
                          >
                            <TableCell className="font-mono text-gray-700 dark:text-gray-300">{account.code}</TableCell>
                            <TableCell className="font-medium font-tajawal text-gray-900 dark:text-gray-100">
                              <div className="flex items-center gap-2">
                                {account.is_group ? (
                                  <Folder className="w-4 h-4 text-erp-teal" />
                                ) : (
                                  <FileText className="w-4 h-4 text-gray-400" />
                                )}
                                {getAccountName(account, language as SupportedLanguage)}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {account.account_type_code
                                ? t(`accounting.accountTypes.${account.account_type_code.toLowerCase()}`)
                                : account.account_type || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-gray-900 dark:text-gray-100 text-end">
                              {account.current_balance.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              <span className="text-xs text-gray-500 ms-1">{account.currency_code}</span>
                            </TableCell>
                            <TableCell>
                              {onAddChild && account.is_group && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-erp-teal hover:bg-erp-teal/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddChild(account);
                                  }}
                                  title={t('accounting.addSubAccount')}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('table.noData')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>{t('accounting.selectGroupToView')}</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default AccountTreeView;
