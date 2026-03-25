/**
 * AccountTreeView Component
 * Tree view for Chart of Accounts (ERPNext style)
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Trash2, MoreHorizontal, BarChart3, DollarSign, CheckCircle2, Pin, PinOff, Home, Shield } from 'lucide-react';
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
  searchQuery?: string;
  convertBalance?: (amount: number, currency: string) => number;
  enhancedConvertBalance?: (amount: number, currency: string, accountId?: string) => number;
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
  pinnedIds,
  onTogglePin,
  focusedId: focusedNodeId,
  convertBalance,
  siblings,
  enhancedConvertBalance,
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
  pinnedIds?: Set<string>;
  onTogglePin?: (id: string) => void;
  focusedId?: string | null;
  convertBalance?: (amount: number, currency: string) => number;
  siblings?: AccountTreeNode[];  // siblings (parent's children) — needed for SUM accounts
  enhancedConvertBalance?: (amount: number, currency: string, accountId?: string) => number;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isPinned = pinnedIds?.has(node.id) || false;
  const isFocused = focusedNodeId === node.id;

  // حساب مجموع أرصدة كل الأبناء التفصيلية (recursively)
  // DB تخزن Net (Dr-Cr) = سالب للخصوم/الإيرادات، موجب للأصول/المصروفات
  // لا نقلب الإشارة — نعرض كما هو
  const aggregateBalance = useMemo(() => {
    // Helper: get converted balance for a single account (with multi-currency support)
    const getBalance = (acct: AccountTreeNode): number => {
      const bal = acct.current_balance || 0;
      const cur = acct.currency_code || acct.currency || '';
      // Use enhanced conversion for multi-currency accounts
      if (enhancedConvertBalance) {
        return enhancedConvertBalance(bal, cur, acct.id);
      }
      if (bal === 0 || !convertBalance) return bal;
      return cur ? convertBalance(bal, cur) : bal;
    };

    // ═══ حساب المجاميع (SUM): جمع أرصدة الأخوة المحوّلة ═══
    if ((node as any).is_summary_account && siblings && siblings.length > 0) {
      return siblings
        .filter(s => s.id !== node.id && !(s as any).is_summary_account)
        .reduce((sum, s) => {
          if (s.is_group && s.children && s.children.length > 0) {
            // لمجموعات فرعية: جمع أبنائها بتحويل
            const sumGroupChildren = (children: AccountTreeNode[]): number => {
              return children
                .filter(c => !(c as any).is_summary_account)
                .reduce((acc, child) => {
                  if (child.is_group && child.children && child.children.length > 0) {
                    return acc + sumGroupChildren(child.children);
                  }
                  return acc + getBalance(child);
                }, 0);
            };
            return sum + sumGroupChildren(s.children);
          }
          return sum + getBalance(s);
        }, 0);
    }

    // ═══ حساب عادي (leaf) ═══
    if (!node.is_group || !node.children || node.children.length === 0) {
      return getBalance(node);
    }

    // ═══ مجموعة (group): جمع الأبناء مع استبعاد SUM ═══
    const sumChildren = (children: AccountTreeNode[]): number => {
      return children
        .filter(c => !(c as any).is_summary_account) // استبعاد SUM لتجنب الحساب المزدوج
        .reduce((sum, child) => {
          if (child.is_group && child.children && child.children.length > 0) {
            return sum + sumChildren(child.children);
          }
          return sum + getBalance(child);
        }, 0);
    };
    return sumChildren(node.children);
  }, [node, convertBalance, siblings, enhancedConvertBalance]);

  // استخدام getAccountName من accountsService
  const accountName = getAccountName(node, language as SupportedLanguage);

  return (
    <div className="select-none" data-node-id={node.id}>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-all duration-200 group',
          isSelected
            ? 'bg-erp-navy/10 dark:bg-erp-navy/30 text-erp-navy dark:text-white shadow-sm border border-erp-navy/20 dark:border-erp-navy/30'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-sm',
          isPinned && 'border-s-2 border-amber-400',
          isFocused && !isSelected && 'ring-2 ring-erp-teal/40 ring-inset',
          level > 0 && 'ms-6',
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
            <>
              <Folder
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-400 dark:text-gray-500'
                )}
              />
              {isPinned && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 -ms-1 -mt-2" />
              )}
            </>
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

          {/* Balance Display — groups show aggregate */}
          <span className={cn(
            'text-xs font-mono px-2',
            node.is_group ? 'font-semibold' : '',
            aggregateBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' :
              aggregateBalance < 0 ? 'text-rose-600 dark:text-rose-400' :
                'text-gray-400'
          )}>
            {Number(aggregateBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          {/* Pin/Unpin button for groups */}
          {node.is_group && onTogglePin && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 w-6 p-0 transition-opacity',
                isPinned
                  ? 'text-amber-500 opacity-100'
                  : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-amber-500'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(node.id);
              }}
              title={isPinned ? (language === 'ar' ? 'إلغاء التثبيت' : 'Unpin') : (language === 'ar' ? 'تثبيت' : 'Pin')}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </Button>
          )}
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
                {node.is_system ? (
                  <DropdownMenuItem disabled className="text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <Shield className="w-4 h-4 me-2" />
                    {t('accounting.systemProtected') || 'محمي'}
                  </DropdownMenuItem>
                ) : (
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
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className={cn(
          'border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-1 duration-200',
          language === 'ar' ? 'border-r-2 mr-5' : 'border-l-2 ml-5'
        )}>
          {node.children!
            // إخفاء حسابات الأطراف (party) من العرض — تبقى في البيانات للحساب
            .filter((child) => !(child as any).is_party_account)
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
                pinnedIds={pinnedIds}
                onTogglePin={onTogglePin}
                focusedId={focusedNodeId}
                convertBalance={convertBalance}
                siblings={node.children}
                enhancedConvertBalance={enhancedConvertBalance}
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
  searchQuery,
  convertBalance,
  enhancedConvertBalance,
}: AccountTreeViewProps) {
  const { t, direction, language } = useLanguage();
  const SESSION_KEY = 'coa_expanded_ids';
  const PIN_KEY = 'coa_pinned_ids';

  // تحميل المجموعات المثبتة من localStorage (دائمة بين الجلسات)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(PIN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set<string>(parsed);
      }
    } catch { /* ignore */ }
    return new Set<string>();
  });

  // تحميل حالة التوسيع من sessionStorage (أو فتح المثبتات إذا جلسة جديدة)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return new Set<string>(parsed);
      }
    } catch { /* ignore */ }
    // جلسة جديدة → فتح المجموعات المثبتة فقط
    try {
      const pinned = localStorage.getItem(PIN_KEY);
      if (pinned) {
        const parsed = JSON.parse(pinned);
        if (Array.isArray(parsed)) return new Set<string>(parsed);
      }
    } catch { /* ignore */ }
    return new Set<string>();
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // حفظ حالة التوسيع في sessionStorage
  const saveExpandedState = useCallback((ids: Set<string>) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
    } catch { /* ignore */ }
  }, []);

  // تبديل التثبيت
  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(PIN_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Handle expand all / collapse all
  useEffect(() => {
    if (expandAll === true) {
      const allAccountIds = new Set<string>();
      accounts.forEach((account) => {
        allAccountIds.add(account.id);
      });
      setExpandedIds(allAccountIds);
      saveExpandedState(allAccountIds);
      onExpandStateChange?.();
    } else if (collapseAll === true) {
      const empty = new Set<string>();
      setExpandedIds(empty);
      saveExpandedState(empty);
      onExpandStateChange?.();
    }
  }, [expandAll, collapseAll, accounts, onExpandStateChange, saveExpandedState]);

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

  // Breadcrumb: بناء مسار التنقل للمجموعة المختارة
  const breadcrumb = useMemo(() => {
    if (!selectedId) return [];
    const path: { id: string; name: string; code: string }[] = [];

    const findPath = (nodes: AccountTreeNode[], target: string): boolean => {
      for (const node of nodes) {
        if (node.id === target) {
          path.push({ id: node.id, name: getAccountName(node, language as SupportedLanguage), code: node.code || '' });
          return true;
        }
        if (node.children && node.children.length > 0 && findPath(node.children, target)) {
          path.unshift({ id: node.id, name: getAccountName(node, language as SupportedLanguage), code: node.code || '' });
          return true;
        }
      }
      return false;
    };

    findPath(fullTreeData, selectedId);
    return path;
  }, [selectedId, fullTreeData, language]);

  // Auto-expand: عند البحث، فتح الآباء تلقائياً لإظهار النتائج
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) return;
    const query = searchQuery.toLowerCase();
    const newExpanded = new Set(expandedIds);
    let changed = false;

    const expandParents = (nodes: AccountTreeNode[], parents: string[]): boolean => {
      for (const node of nodes) {
        const name = getAccountName(node, language as SupportedLanguage);
        const matches = (node.code || '').toLowerCase().includes(query) ||
          name.toLowerCase().includes(query);

        let childMatches = false;
        if (node.children && node.children.length > 0) {
          childMatches = expandParents(node.children, [...parents, node.id]);
        }

        if (matches || childMatches) {
          parents.forEach(pid => {
            if (!newExpanded.has(pid)) {
              newExpanded.add(pid);
              changed = true;
            }
          });
          if (node.children && node.children.length > 0 && !newExpanded.has(node.id)) {
            newExpanded.add(node.id);
            changed = true;
          }
          return true;
        }
      }
      return false;
    };

    expandParents(fullTreeData, []);
    if (changed) {
      setExpandedIds(newExpanded);
      saveExpandedState(newExpanded);
    }
  }, [searchQuery, fullTreeData, language]);

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
    saveExpandedState(newExpanded);

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
  // For display: hide individual party accounts (customer/supplier) — they're accessible from their own tabs
  const displayedAccounts = rightPanelAccounts.filter(a => !(a as any).is_party_account);

  // Calculate stats for selected group
  const groupStats = useMemo(() => {
    if (!selectedGroup || !rightPanelAccounts.length) return null;

    const totalChildren = displayedAccounts.length;
    const groupsCount = displayedAccounts.filter(a => a.is_group).length;
    const accountsCount = displayedAccounts.filter(a => !a.is_group).length;
    // Exclude SUM accounts from total to avoid double-counting
    // Use rightPanelAccounts (includes party accounts) for correct balance calculation
    const totalBalance = rightPanelAccounts
      .filter(a => !(a as any).is_summary_account)
      .reduce((sum, a) => {
        const bal = a.current_balance ?? 0;
        const cur = a.currency_code || a.currency || '';
        if (enhancedConvertBalance) {
          return sum + enhancedConvertBalance(bal, cur, a.id);
        }
        if (bal === 0 || !convertBalance) return sum + bal;
        return sum + (cur ? convertBalance(bal, cur) : bal);
      }, 0);
    const activeCount = displayedAccounts.filter(a => a.is_active).length;

    return {
      totalChildren,
      groupsCount,
      accountsCount,
      totalBalance,
      activeCount,
    };
  }, [selectedGroup, rightPanelAccounts, displayedAccounts, convertBalance, enhancedConvertBalance]);

  // دالة لحساب عدد الحسابات الفرعية لكل مجموعة
  const getChildrenCount = (node: AccountTreeNode): number => {
    if (!node.children) return 0;
    return node.children.length;
  };

  // ═══ Keyboard Navigation ═══
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Flatten visible nodes (only expanded children)
  const visibleNodes = useMemo(() => {
    const result: AccountTreeNode[] = [];
    const flatten = (nodes: AccountTreeNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
          flatten(node.children);
        }
      }
    };
    flatten(treeData);
    return result;
  }, [treeData, expandedIds]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (visibleNodes.length === 0) return;
    const currentIdx = focusedId ? visibleNodes.findIndex(n => n.id === focusedId) : -1;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIdx = currentIdx < visibleNodes.length - 1 ? currentIdx + 1 : 0;
        setFocusedId(visibleNodes[nextIdx].id);
        // Scroll into view
        const el = treeContainerRef.current?.querySelector(`[data-node-id="${visibleNodes[nextIdx].id}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : visibleNodes.length - 1;
        setFocusedId(visibleNodes[prevIdx].id);
        const el = treeContainerRef.current?.querySelector(`[data-node-id="${visibleNodes[prevIdx].id}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (focusedId) {
          const node = visibleNodes.find(n => n.id === focusedId);
          if (node?.children && node.children.length > 0 && !expandedIds.has(focusedId)) {
            toggleExpand(focusedId);
          }
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (focusedId) {
          if (expandedIds.has(focusedId)) {
            toggleExpand(focusedId);
          } else {
            // Go to parent
            const node = visibleNodes.find(n => n.id === focusedId);
            if (node?.parent_id) {
              setFocusedId(node.parent_id);
              const el = treeContainerRef.current?.querySelector(`[data-node-id="${node.parent_id}"]`);
              el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (focusedId) {
          const node = visibleNodes.find(n => n.id === focusedId);
          if (node) handleNodeSelect(node);
        }
        break;
      }
    }
  }, [focusedId, visibleNodes, expandedIds, toggleExpand, handleNodeSelect]);

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          .coa-tree-container {
            border: none !important;
            height: auto !important;
          }
          .coa-tree-container [data-panel-group] {
            flex-direction: column !important;
          }
          .coa-tree-container [data-panel-resize-handle-id] {
            display: none !important;
          }
          .coa-tree-container .group-hover\:opacity-100 {
            display: none !important;
          }
          .coa-tree-container button {
            display: none !important;
          }
          .coa-tree-container .select-none {
            break-inside: avoid;
          }
        }
      `}</style>
      <div
        ref={treeContainerRef}
        className={cn(
          'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col coa-tree-container',
          className
        )}
        style={height ? { height } : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
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
                      pinnedIds={pinnedIds}
                      onTogglePin={togglePin}
                      focusedId={focusedId}
                      convertBalance={convertBalance}
                      enhancedConvertBalance={enhancedConvertBalance}
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
                  {/* Breadcrumb Navigation */}
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    <button
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-erp-teal transition-colors flex items-center gap-1"
                      onClick={() => setSelectedId(null)}
                    >
                      <Home className="w-3.5 h-3.5" />
                    </button>
                    {breadcrumb.map((item, i) => (
                      <React.Fragment key={item.id}>
                        <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0 rtl:rotate-180" />
                        <button
                          className={cn(
                            'text-xs transition-colors flex items-center gap-1',
                            i === breadcrumb.length - 1
                              ? 'text-erp-navy dark:text-white font-semibold'
                              : 'text-gray-500 dark:text-gray-400 hover:text-erp-teal'
                          )}
                          onClick={() => {
                            setSelectedId(item.id);
                            if (!expandedIds.has(item.id)) {
                              const ne = new Set(expandedIds);
                              ne.add(item.id);
                              setExpandedIds(ne);
                              saveExpandedState(ne);
                            }
                          }}
                        >
                          <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.code}</span>
                          {item.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

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
                        {displayedAccounts.length > 0 ? (
                          displayedAccounts.map((account) => (
                            <TableRow
                              key={account.id}
                              className={cn(
                                "cursor-pointer border-b border-gray-200 dark:border-gray-800 transition-colors",
                                account.is_group
                                  ? "hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              )}
                              onClick={() => {
                                if (account.is_group) {
                                  // المجموعة → ندخل فيها (توسيع في الشجرة + عرض أبنائها)
                                  setSelectedId(account.id);
                                  if (!expandedIds.has(account.id)) {
                                    const newExpanded = new Set(expandedIds);
                                    newExpanded.add(account.id);
                                    setExpandedIds(newExpanded);
                                    saveExpandedState(newExpanded);
                                  }
                                } else {
                                  // حساب تفصيلي → فتح الشيت
                                  onAccountClick?.(account);
                                }
                              }}
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
                                  {account.is_group && (
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 ms-auto" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">
                                {account.account_type_code
                                  ? t(`accounting.accountTypes.${account.account_type_code.toLowerCase()}`)
                                  : account.account_type || '-'}
                              </TableCell>
                              <TableCell className="font-mono text-gray-900 dark:text-gray-100 text-end">
                                {(() => {
                                  // SUM accounts: use dynamically computed total from siblings (not DB balance)
                                  if ((account as any).is_summary_account && groupStats) {
                                    return groupStats.totalBalance.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    });
                                  }
                                  // Regular accounts: convert with proper exchange rates
                                  const bal = account.current_balance || 0;
                                  const cur = account.currency_code || account.currency || '';
                                  const converted = enhancedConvertBalance
                                    ? enhancedConvertBalance(bal, cur, account.id)
                                    : (convertBalance && cur ? convertBalance(bal, cur) : bal);
                                  return converted.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  });
                                })()}
                                <span className="text-xs text-gray-500 ms-1">{(account as any).is_summary_account ? '' : account.currency_code}</span>
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
    </>
  );
}

export default AccountTreeView;
