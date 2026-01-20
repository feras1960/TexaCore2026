/**
 * AccountTreeSidePanel Component
 * Side panel for selecting accounts from chart of accounts tree
 * Supports double-click to add account and multi-selection
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ChevronRight, ChevronDown, Folder, FileText, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Account } from '@/services/accountsService';

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
}

interface AccountTreeSidePanelProps {
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  onAccountSelect: (account: Account) => void;
  selectedAccountIds?: Set<string>;
  className?: string;
}

function TreeNode({
  node,
  level = 0,
  onToggle,
  onSelect,
  expanded,
  searchTerm,
  selectedAccountIds,
  t,
  language,
}: {
  node: AccountTreeNode;
  level?: number;
  onToggle: (id: string) => void;
  onSelect: (node: AccountTreeNode) => void;
  expanded: Set<string>;
  searchTerm: string;
  selectedAccountIds?: Set<string>;
  t: (key: string) => string;
  language: string;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedAccountIds?.has(node.id);
  const isGroup = node.is_group;
  const isVisible = useMemo(() => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = (language === 'ar' ? node.name : node.name_en || node.name)
      .toLowerCase()
      .includes(searchLower);
    const codeMatch = node.code.toLowerCase().includes(searchLower);
    return nameMatch || codeMatch;
  }, [searchTerm, node, language]);

  const getAccountName = (account: Account): string => {
    if (language === 'ar') {
      return account.name;
    }
    return account.name_en || account.name;
  };

  // Filter children based on search
  const visibleChildren = useMemo(() => {
    if (!hasChildren) return [];
    if (!searchTerm) return node.children || [];
    
    const filterChildren = (children: AccountTreeNode[]): AccountTreeNode[] => {
      return children.filter(child => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = (language === 'ar' ? child.name : child.name_en || child.name)
          .toLowerCase()
          .includes(searchLower);
        const codeMatch = child.code.toLowerCase().includes(searchLower);
        
        if (nameMatch || codeMatch) return true;
        if (child.children && child.children.length > 0) {
          return filterChildren(child.children).length > 0;
        }
        return false;
      });
    };
    
    return filterChildren(node.children || []);
  }, [node.children, searchTerm, language]);

  if (!isVisible && (!hasChildren || visibleChildren.length === 0)) {
    return null;
  }

  // Handle click on row - for groups, toggle expand/collapse
  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Skip if clicking on chevron (it has its own handler)
    if ((e.target as HTMLElement).closest('.chevron-button')) {
      return;
    }
    
    if (isGroup && hasChildren) {
      onToggle(node.id);
    }
  };

  // Handle double-click on row - for accounts, add to entry
  const handleRowDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isGroup) {
      onSelect(node);
    }
  };

  // Handle click on chevron - toggle expand/collapse
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  return (
    <div 
      className="select-none"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 rounded-md transition-all duration-200 group',
          !isGroup && 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20',
          isGroup && hasChildren && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
          isSelected && !isGroup && 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700',
          !node.is_active && 'opacity-60'
        )}
        style={{ 
          [language === 'ar' ? 'paddingRight' : 'paddingLeft']: `${level * 20 + 8}px`,
          direction: language === 'ar' ? 'rtl' : 'ltr'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={handleRowClick}
        onDoubleClick={handleRowDoubleClick}
      >
        <div
          className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 transition-colors cursor-pointer flex-shrink-0 chevron-button"
          onClick={handleChevronClick}
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

        <div 
          className="flex items-center gap-2 flex-1 overflow-hidden min-w-0 row-content"
        >
          {isGroup ? (
            <Folder
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-colors',
                'text-gray-400 dark:text-gray-500'
              )}
            />
          ) : (
            <FileText className="w-4 h-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
          )}
          <span className={cn(
            'text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded transition-colors',
            isSelected && !isGroup
              ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-semibold' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          )}>
            {node.code}
          </span>
          <span className={cn(
            'font-medium text-sm font-tajawal truncate transition-colors',
            isSelected && !isGroup 
              ? 'text-blue-900 dark:text-blue-100 font-semibold' 
              : 'text-gray-700 dark:text-gray-300'
          )}>
            {getAccountName(node)}
          </span>
          {!isGroup && (
            <span className={cn(
              "text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0",
              language === 'ar' ? 'mr-auto' : 'ml-auto'
            )}>
              {t('accounting.account.doubleClickToAdd')}
            </span>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div 
          className={cn(
            "animate-in slide-in-from-top-1 duration-200",
            language === 'ar' 
              ? 'border-r-2 border-gray-200 dark:border-gray-700 mr-5' 
              : 'border-l-2 border-gray-200 dark:border-gray-700 ml-5'
          )}
        >
          {visibleChildren
            .sort((a, b) => {
              // Sort: groups first, then accounts, then by code
              if (a.is_group !== b.is_group) {
                return a.is_group ? -1 : 1;
              }
              return a.code.localeCompare(b.code);
            })
            .map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onToggle={onToggle}
                onSelect={onSelect}
                expanded={expanded}
                searchTerm={searchTerm}
                selectedAccountIds={selectedAccountIds}
                t={t}
                language={language}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function AccountTreeSidePanel({
  accounts,
  open,
  onClose,
  onAccountSelect,
  selectedAccountIds,
  className,
}: AccountTreeSidePanelProps) {
  const { t, direction, language } = useLanguage();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Build tree structure
  const treeData = useMemo(() => {
    const accountMap = new Map<string, AccountTreeNode>();
    const rootNodes: AccountTreeNode[] = [];

    // First pass: create all nodes
    accounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Second pass: build tree
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
  }, [accounts]);

  // Auto-expand when searching
  useEffect(() => {
    if (searchTerm) {
      const newExpanded = new Set<string>();
      accounts.forEach((account) => {
        if (account.parent_id) {
          newExpanded.add(account.parent_id);
          const parent = accounts.find((a) => a.id === account.parent_id);
          if (parent?.parent_id) {
            newExpanded.add(parent.parent_id);
          }
        }
      });
      setExpandedIds(newExpanded);
    }
  }, [searchTerm, accounts]);

  // Handle expand/collapse
  const toggleExpand = (accountId: string) => {
    setExpandedIds(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(accountId)) {
        newExpanded.delete(accountId);
      } else {
        newExpanded.add(accountId);
      }
      return newExpanded;
    });
  };

  // Handle account selection (double-click) - always add new row
  const handleAccountSelect = (node: AccountTreeNode) => {
    if (!node.is_group) {
      onAccountSelect(node);
    }
  };

  // Filter root nodes based on search
  const visibleRootNodes = useMemo(() => {
    if (!searchTerm) return treeData;
    
    return treeData.filter(node => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = (language === 'ar' ? node.name : node.name_en || node.name)
        .toLowerCase()
        .includes(searchLower);
      const codeMatch = node.code.toLowerCase().includes(searchLower);
      return nameMatch || codeMatch || (node.children && node.children.length > 0);
    });
  }, [treeData, searchTerm, language]);

  const selectedCount = selectedAccountIds?.size || 0;

  // Use portal to render outside the Sheet component
  if (typeof window === 'undefined' || !open) return null;
  
  const panelContent = (
    <>
      {/* Overlay - closes panel when clicked */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99998] animate-in fade-in-0 duration-200"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      {/* Side Panel */}
      <div
        className={cn(
          'fixed top-0 bottom-0 w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-[99999] flex flex-col',
          direction === 'rtl' 
            ? 'left-0 border-r dark:border-gray-800' 
            : 'right-0 border-l dark:border-gray-800',
          'animate-in slide-in-from-right duration-300',
          className
        )}
        dir={direction}
        style={{
          [direction === 'rtl' ? 'left' : 'right']: 0,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        onKeyUp={(e) => {
          e.stopPropagation();
        }}
        onFocus={(e) => {
          e.stopPropagation();
        }}
        onBlur={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg font-cairo">
                {t('accounting.account.treeSelector')}
              </h3>
              <p className="text-sm text-white/80 mt-0.5">
                {t('accounting.account.treeSelectorDescription')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className={cn(
              "absolute top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60",
              direction === 'rtl' ? 'right-3' : 'left-3'
            )} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('accounting.searchPlaceholder')}
              className={cn(
                "bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30",
                direction === 'rtl' ? 'pr-9' : 'pl-9'
              )}
              dir={direction}
            />
          </div>
          
          {selectedCount > 0 && (
            <div className="mt-2 text-sm text-white/90">
              {selectedCount} {t('accounting.account.selectedCount')}
            </div>
          )}
        </div>

        {/* Tree Content */}
        <ScrollArea 
          className="flex-1 p-4"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="space-y-1"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {visibleRootNodes.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                {t('accounting.account.notFound')}
              </div>
            ) : (
              visibleRootNodes.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  onToggle={toggleExpand}
                  onSelect={handleAccountSelect}
                  expanded={expandedIds}
                  searchTerm={searchTerm}
                  selectedAccountIds={selectedAccountIds}
                  t={t}
                  language={language}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            {t('accounting.account.closeTree')}
          </Button>
        </div>
      </div>
    </>
  );
  
  return createPortal(panelContent, document.body);
}

export default AccountTreeSidePanel;
