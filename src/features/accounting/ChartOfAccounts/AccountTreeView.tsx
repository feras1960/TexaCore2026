/**
 * AccountTreeView Component
 * Tree view for Chart of Accounts (ERPNext style)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Trash2, MoreHorizontal } from 'lucide-react';
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
import type { Account } from '@/services/accountsService';

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
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const getAccountName = (account: Account): string => {
    if (language === 'ar') {
      return account.name;
    }
    return account.name_en || account.name;
  };

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
            'font-medium text-sm font-tajawal truncate transition-colors',
            isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-700 dark:text-gray-300'
          )}>
            {getAccountName(node)}
          </span>
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
            .filter((child) => child.is_group) // Only show groups in the tree
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
  height = '600px',
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
      // Collect all group account IDs
      const allGroupIds = new Set<string>();
      accounts.forEach((account) => {
        if (account.is_group) {
          allGroupIds.add(account.id);
        }
      });
      setExpandedIds(allGroupIds);
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
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((node) => ({
          ...node,
          children: node.children ? sortByCode(node.children) : undefined,
        }));
    };

    return sortByCode(rootNodes);
  }, [accounts]);

  /**
   * Build tree structure for display - only groups in the tree view
   */
  const treeData = useMemo(() => {
    // Filter to show only groups in tree view, but keep all children structure
    const filterToGroups = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
      return nodes
        .filter((node) => node.is_group) // Only groups in tree view
        .map((node) => ({
          ...node,
          // Keep all children for table view, but filter children for tree display
          children: node.children ? filterToGroups(node.children) : undefined,
        }));
    };

    return filterToGroups(fullTreeData);
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
    // Only select groups (not regular accounts)
    if (node.is_group) {
      setSelectedId(node.id);
    }
    onAccountClick?.(node);
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

  const getAccountName = (account: Account): string => {
    if (language === 'ar') {
      return account.name;
    }
    return account.name_en || account.name;
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900',
        className
      )}
      style={{ height }}
    >
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Tree View (30%) - Groups */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="border-e border-gray-100 dark:border-gray-800">
          <div className="h-full overflow-auto p-4 bg-gray-50/30 dark:bg-gray-800/30" dir={direction}>
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
                  />
                ))
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-gray-200 dark:bg-gray-700" />

        {/* Right Panel - Table View (70%) - Accounts */}
        <ResizablePanel defaultSize={70}>
          <div className="h-full overflow-auto p-6 bg-white dark:bg-gray-900">
            {selectedGroup ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-2">
                    <Folder className="w-6 h-6 text-erp-teal" />
                    {getAccountName(selectedGroup)}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-mono mt-1">{selectedGroup.code}</p>
                </div>

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
                                {getAccountName(account)}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {t(`accounting.accountTypes.${account.account_type}`)}
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
