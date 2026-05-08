/**
 * ════════════════════════════════════════════════════════════════
 * 🔍 DataPreviewPanels — ألواح معاينة البيانات
 * ════════════════════════════════════════════════════════════════
 * Expandable preview panels for each data type.
 * Shows actual data content before import.
 * @module features/import/wizard
 */


import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { UnifiedImportData, UnifiedAccount, UnifiedCustomer, UnifiedSupplier, UnifiedMaterial, UnifiedJournalEntry, UnifiedCurrency, UnifiedCostCenter, UnifiedWarehouse, UnifiedPurchaseInvoice, UnifiedSalesInvoice } from '../core/unified-data-model';

// ─── Props ───────────────────────────────────────────────────
interface ExistingAccount {
  code: string; name: string; nameAr: string;
  parentCode: string | null; isGroup: boolean;
}

interface PreviewProps {
  data: UnifiedImportData;
  existingAccounts?: ExistingAccount[];
  isAr: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🌳 Merged Tree — Preserves Rashid hierarchy inside TexaCore
// ═══════════════════════════════════════════════════════════════

// Groups with code.length <= 2 are auto-transparent (skip, process children individually)

// Direct merge: Rashid group → existing TexaCore group (details go INSIDE)
const MERGE_INTO: Record<string, string> = {
  '161': '1131', // الزبائن → ذمم الجملة
  '261': '2111', // الموردين → دائنون الموردين
  '181': '111',  // الصندوق
  '182': '112',  // البنوك
};

// Fallback parent: where to create NEW groups under
function getParentTarget(code: string): string {
  if (/^(16|17)/.test(code)) return '113';
  if (/^(26|27)/.test(code)) return '211';
  if (code.startsWith('18')) return '11';
  if (code.startsWith('14')) return '114';
  if (code.startsWith('23')) return '12';
  if (/^(21|22)/.test(code)) return '3';
  if (/^(25|28|29)/.test(code)) return '21';
  if (code.startsWith('31')) return '51';
  if (code.startsWith('32')) return '52';
  if (/^(33|34)/.test(code)) return '53';
  if (/^(35|36|37|38|39)/.test(code)) return '59';
  if (/^(41|42)/.test(code)) return '41';
  if (/^(43|44|45|46|47|48|49)/.test(code)) return '42';
  return '119';
}

interface TreeNode {
  code: string; name: string; isGroup: boolean;
  balance: number; isImported: boolean; originalCode?: string;
  children: TreeNode[]; uid: string; // unique key for React
}

function buildMergedTree(existing: ExistingAccount[], imported: UnifiedAccount[]): TreeNode[] {
  // ── 1. Build existing TexaCore tree ──
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const a of existing) {
    const node: TreeNode = { code: a.code, name: a.nameAr || a.name, isGroup: a.isGroup, balance: 0, isImported: false, children: [], uid: `ex_${a.code}` };
    nodeMap.set(a.code, node);
  }
  for (const a of existing) {
    const node = nodeMap.get(a.code)!;
    if (a.parentCode && nodeMap.has(a.parentCode)) {
      nodeMap.get(a.parentCode)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // ── 2. Build imported Rashid parent→children map ──
  // NOTE: Rashid RSF stores Ref="0" for most accounts instead of actual parent.
  //       We derive parent-child from CODE STRUCTURE instead.
  const impByCode = new Map<string, UnifiedAccount>();
  for (const acc of imported) impByCode.set(acc.code, acc);

  // Derive parent from code structure: 161002→161, 161→16, 16→(from Ref or root)
  function deriveParent(code: string): string | null {
    // Try progressively shorter prefixes
    for (let len = code.length - 1; len >= 1; len--) {
      const candidate = code.substring(0, len);
      if (impByCode.has(candidate)) return candidate;
    }
    return null; // true root
  }

  const impChildren = new Map<string, UnifiedAccount[]>();
  const impRoots: UnifiedAccount[] = [];
  for (const acc of imported) {
    const parent = deriveParent(acc.code);
    if (parent) {
      if (!impChildren.has(parent)) impChildren.set(parent, []);
      impChildren.get(parent)!.push(acc);
    } else {
      impRoots.push(acc);
    }
  }

  // ── 2b. Determine isGroup from STRUCTURE ──
  const groupCodes = new Set<string>();
  for (const [code, children] of impChildren) {
    if (children.length > 0) groupCodes.add(code);
  }
  const isGrp = (code: string) => groupCodes.has(code);

  // ── 3. Code generation (avoids clashes) ──
  const groupCounters: Record<string, number> = {};
  const detailCounters: Record<string, number> = {};
  // Pre-count existing children
  for (const a of existing) {
    if (a.parentCode) {
      if (a.isGroup) {
        groupCounters[a.parentCode] = (groupCounters[a.parentCode] || 0) + 1;
      } else {
        detailCounters[a.parentCode] = (detailCounters[a.parentCode] || 0) + 1;
      }
    }
  }

  function nextGroupCode(parent: string): string {
    groupCounters[parent] = (groupCounters[parent] || 0) + 1;
    let code = `${parent}${groupCounters[parent]}`;
    while (nodeMap.has(code)) { groupCounters[parent]++; code = `${parent}${groupCounters[parent]}`; }
    return code;
  }
  function nextDetailCode(parent: string): string {
    detailCounters[parent] = (detailCounters[parent] || 0) + 1;
    let code = `${parent}${String(detailCounters[parent]).padStart(3, '0')}`;
    while (nodeMap.has(code)) { detailCounters[parent]++; code = `${parent}${String(detailCounters[parent]).padStart(3, '0')}`; }
    return code;
  }

  // ── 4. Recursive grafting with smart mapping ──
  function addDetailAccount(acc: UnifiedAccount, texaParent: string): TreeNode {
    const newCode = nextDetailCode(texaParent);
    const bal = (acc.openingDebit || 0) - (acc.openingCredit || 0);
    const node: TreeNode = { code: newCode, name: acc.nameAr || acc.name, isGroup: false, balance: bal, isImported: true, originalCode: acc.code, children: [], uid: `imp_${acc.code}` };
    nodeMap.set(newCode, node);
    return node;
  }

  function addNewGroup(acc: UnifiedAccount, texaParent: string): TreeNode {
    const newCode = nextGroupCode(texaParent);
    const bal = (acc.openingDebit || 0) - (acc.openingCredit || 0);
    const node: TreeNode = { code: newCode, name: acc.nameAr || acc.name, isGroup: true, balance: bal, isImported: true, originalCode: acc.code, children: [], uid: `imp_${acc.code}` };
    nodeMap.set(newCode, node);
    // Process children of this imported group under the new code
    const kids = impChildren.get(acc.code) || [];
    for (const kid of kids) {
      processImported(kid, newCode);
    }
    return node;
  }

  function processImported(acc: UnifiedAccount, texaParent: string) {
    const kids = impChildren.get(acc.code) || [];
    const accIsGroup = isGrp(acc.code);

    // A) Transparent container: all Rashid groups with short codes (1, 11, 16, 26, etc.)
    if (accIsGroup && acc.code.length <= 2) {
      for (const kid of kids) {
        const childTarget = getParentTarget(kid.code);
        processImported(kid, childTarget);
      }
      return;
    }

    // B) Merge into existing TexaCore group (e.g. 161 → 1131)
    const mergeTarget = MERGE_INTO[acc.code];
    if (mergeTarget && nodeMap.has(mergeTarget) && accIsGroup) {
      const target = nodeMap.get(mergeTarget)!;
      for (const kid of kids) {
        if (isGrp(kid.code)) {
          target.children.push(addNewGroup(kid, mergeTarget));
        } else {
          target.children.push(addDetailAccount(kid, mergeTarget));
        }
      }
      return;
    }

    // C) Find TexaCore parent and add
    const parentNode = nodeMap.get(texaParent);
    if (!parentNode) return;

    if (accIsGroup) {
      parentNode.children.push(addNewGroup(acc, texaParent));
    } else {
      parentNode.children.push(addDetailAccount(acc, texaParent));
    }
  }

  // ── 5. Process all imported roots ──
  for (const acc of impRoots) {
    const target = getParentTarget(acc.code);
    processImported(acc, target);
  }

  // ── 6. Calculate balances bottom-up ──
  function calcBal(n: TreeNode): number {
    if (n.children.length > 0) n.balance = n.children.reduce((s, c) => s + calcBal(c), 0);
    return n.balance;
  }
  roots.forEach(calcBal);

  return roots;
}

export function AccountsPreview({ data, existingAccounts = [], isAr }: PreviewProps) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['1','11','111','112','113','1131','2','21','211','2111']));
  const tree = useMemo(() => buildMergedTree(existingAccounts, data.chartOfAccounts), [existingAccounts, data.chartOfAccounts]);
  const importedCount = data.chartOfAccounts.filter(a => !a.isGroup).length;
  const net = data.chartOfAccounts.reduce((s, a) => s + (a.openingDebit || 0) - (a.openingCredit || 0), 0);

  const toggleGroup = (code: string) => setExpandedGroups(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (search) {
      const q = search.toLowerCase();
      const match = node.code.includes(q) || node.name.toLowerCase().includes(q) || (node.originalCode || '').includes(q);
      const childMatch = node.children.some(c => c.code.includes(q) || c.name.toLowerCase().includes(q) || (c.originalCode || '').includes(q));
      if (!match && !childMatch && !node.isGroup) return null;
    }
    const pad = 12 + depth * 16;
    const isExp = expandedGroups.has(node.code);
    const newCount = node.children.filter(c => c.isImported).length;

    if (node.isGroup) {
      const hasNew = node.children.some(c => c.isImported || c.children.some(gc => gc.isImported));
      return (
        <div key={node.uid}>
          <div className={`flex items-center gap-1.5 py-1 text-xs cursor-pointer ${hasNew ? 'hover:bg-indigo-50 dark:hover:bg-indigo-900/10 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-slate-800 font-medium text-gray-500'}`}
            style={{ paddingInlineStart: `${pad}px` }} onClick={() => toggleGroup(node.code)}>
            <span className="w-3.5 flex-shrink-0">{node.children.length > 0 ? (isExp ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronLeft className="w-3 h-3 text-gray-400" />) : <span className="w-3" />}</span>
            <span className="font-mono text-[10px] text-gray-400">{node.code}</span>
            <span className="flex-1 truncate">{node.name}</span>
            {newCount > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">+{newCount} {isAr ? 'جديد' : 'new'}</span>}
            {node.balance !== 0 && <span className={`text-[9px] font-mono ${node.balance > 0 ? 'text-green-600' : 'text-red-500'}`}>{Math.abs(node.balance).toLocaleString()}</span>}
          </div>
          {isExp && node.children.map(c => renderNode(c, depth + 1))}
        </div>
      );
    }
    return (
      <div key={node.uid} className={`flex items-center gap-1.5 py-0.5 text-[11px] ${node.isImported ? 'bg-green-50/50 hover:bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400'}`}
        style={{ paddingInlineStart: `${pad}px` }}>
        <span className="text-[9px]">{node.isImported ? '🆕' : '📄'}</span>
        <span className={`font-mono text-[10px] flex-shrink-0 w-16 ${node.isImported ? 'text-indigo-600 font-semibold' : 'text-gray-300'}`}>{node.code}</span>
        <span className={`flex-1 truncate ${node.isImported ? '' : 'text-gray-400'}`}>{node.name}</span>
        {node.balance !== 0 && <span className={`text-[9px] font-mono ${node.balance > 0 ? 'text-green-600' : 'text-red-500'}`}>{Math.abs(node.balance).toLocaleString()}</span>}
        {node.isImported && node.originalCode && <span className="font-mono text-[8px] text-gray-300 flex-shrink-0" title={isAr ? 'كود الرشيد' : 'Rashid code'}>← {node.originalCode}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-3">

      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">🆕 {importedCount} {isAr ? 'حساب جديد' : 'new'}</span>
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">🌳 {existingAccounts.length} {isAr ? 'حالي' : 'existing'}</span>
        <span className={`px-2 py-1 rounded-full font-medium font-mono ${net >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
          {isAr ? 'صافي' : 'Net'}: {Math.abs(net).toLocaleString()} {net >= 0 ? (isAr ? 'مدين' : 'Dr') : (isAr ? 'دائن' : 'Cr')}
        </span>
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute start-2.5 top-2 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'} className="h-7 text-xs ps-8" />
      </div>
      <div className="max-h-[500px] overflow-y-auto border rounded-lg bg-white dark:bg-slate-900 py-1">
        {tree.length === 0
          ? <p className="text-center text-xs text-gray-400 py-4">{isAr ? 'لا توجد شجرة' : 'No tree'}</p>
          : tree.map(n => renderNode(n, 0))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 👥 Customers/Suppliers Preview Table
// ═══════════════════════════════════════════════════════════════

export function PartyPreview({ items, type, isAr }: {
  items: (UnifiedCustomer | UnifiedSupplier)[];
  type: 'customers' | 'suppliers';
  isAr: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return items.slice(0, 50);
    const q = search.toLowerCase();
    return items.filter(i =>
      i.code.includes(q) || (i.name || '').toLowerCase().includes(q) || (i.nameAr || '').includes(q)
    ).slice(0, 50);
  }, [items, search]);

  const totalBalance = items.reduce((sum, i) => sum + (i.openingBalance || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
          {items.length} {type === 'customers' ? (isAr ? 'عميل' : 'customers') : (isAr ? 'مورد' : 'suppliers')}
        </span>
        {totalBalance !== 0 && (
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium font-mono">
            {isAr ? 'إجمالي الأرصدة' : 'Total balance'}: {totalBalance.toLocaleString()}
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute start-2.5 top-2 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? 'بحث...' : 'Search...'} className="h-7 text-xs ps-8" />
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'كود' : 'Code'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'هاتف' : 'Phone'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'الرصيد' : 'Balance'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.code} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{item.code}</td>
                <td className="px-2 py-1 truncate max-w-[200px]">{item.nameAr || item.name}</td>
                <td className="px-2 py-1 text-gray-400">{item.phone || '—'}</td>
                <td className="px-2 py-1 text-end font-mono">
                  {(item.openingBalance || 0) !== 0
                    ? <span className={(item.openingBalance || 0) > 0 ? 'text-red-500' : 'text-green-600'}>{item.openingBalance?.toLocaleString()}</span>
                    : <span className="text-gray-300">0</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 50 && !search && (
          <p className="text-[10px] text-gray-400 text-center py-1">
            {isAr ? `عرض أول 50 من ${items.length}` : `Showing first 50 of ${items.length}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 📦 Materials Preview
// ═══════════════════════════════════════════════════════════════

export function MaterialsPreview({ items, isAr }: { items: UnifiedMaterial[]; isAr: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return items.filter(m => !m.isGroup).slice(0, 50);
    const q = search.toLowerCase();
    return items.filter(m => !m.isGroup && (
      m.code.includes(q) || (m.name || '').toLowerCase().includes(q) || (m.nameAr || '').includes(q)
    )).slice(0, 50);
  }, [items, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute start-2.5 top-2 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? 'بحث...' : 'Search...'} className="h-7 text-xs ps-8" />
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'كود' : 'Code'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'شراء' : 'Buy'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'بيع' : 'Sell'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'رصيد' : 'Qty'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.code} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{m.code}</td>
                <td className="px-2 py-1 truncate max-w-[180px]">{m.nameAr || m.name}</td>
                <td className="px-2 py-1 text-end font-mono text-gray-500">{m.buyPrice ? m.buyPrice.toLocaleString() : '—'}</td>
                <td className="px-2 py-1 text-end font-mono text-gray-500">{m.sellPrice ? m.sellPrice.toLocaleString() : '—'}</td>
                <td className="px-2 py-1 text-end font-mono">{m.openingBalance || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 📋 Journal Entries Preview
// ═══════════════════════════════════════════════════════════════

export function JournalEntriesPreview({ entries, isAr }: { entries: UnifiedJournalEntry[]; isAr: boolean }) {
  const totalDebit = entries.reduce((s, e) => s + (e.totalDebit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.totalCredit || 0), 0);
  const shown = entries.slice(0, 30);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
          {entries.length} {isAr ? 'قيد' : 'entries'}
        </span>
        <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 font-mono">
          {isAr ? 'مدين' : 'Dr'}: {totalDebit.toLocaleString()}
        </span>
        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-mono">
          {isAr ? 'دائن' : 'Cr'}: {totalCredit.toLocaleString()}
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">#</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'التاريخ' : 'Date'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'البيان' : 'Description'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'مدين' : 'Debit'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'دائن' : 'Credit'}</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-500">{isAr ? 'سطور' : 'Lines'}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(e => (
              <tr key={e.sourceNumber} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{e.sourceNumber}</td>
                <td className="px-2 py-1 text-gray-500">{e.date}</td>
                <td className="px-2 py-1 truncate max-w-[150px]">{e.description || '—'}</td>
                <td className="px-2 py-1 text-end font-mono text-red-500">{e.totalDebit?.toLocaleString()}</td>
                <td className="px-2 py-1 text-end font-mono text-green-600">{e.totalCredit?.toLocaleString()}</td>
                <td className="px-2 py-1 text-center"><Badge variant="outline" className="text-[8px]">{e.lines.length}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length > 30 && (
          <p className="text-[10px] text-gray-400 text-center py-1">
            {isAr ? `عرض أول 30 من ${entries.length}` : `Showing first 30 of ${entries.length}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 💱 Currencies Preview
// ═══════════════════════════════════════════════════════════════

export function CurrenciesPreview({ items, isAr }: { items: UnifiedCurrency[]; isAr: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
          💱 {items.length} {isAr ? 'عملة' : 'currencies'}
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">#</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الكود' : 'Code'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الرمز' : 'Symbol'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'السعر' : 'Rate'}</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-500">{isAr ? 'أساسية' : 'Base'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.sourceNum} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{c.sourceNum}</td>
                <td className="px-2 py-1 font-mono font-semibold">{c.code}</td>
                <td className="px-2 py-1">{c.nameAr || c.name}</td>
                <td className="px-2 py-1 text-gray-400">{c.symbol || '—'}</td>
                <td className="px-2 py-1 text-end font-mono">{c.rate}</td>
                <td className="px-2 py-1 text-center">{c.isBaseCurrency ? '⭐' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🏷️ Cost Centers Preview
// ═══════════════════════════════════════════════════════════════

export function CostCentersPreview({ items, isAr }: { items: UnifiedCostCenter[]; isAr: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
          🏷️ {items.length} {isAr ? 'مركز تكلفة' : 'cost centers'}
        </span>
        <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium">
          {items.filter(c => !c.isGroup).length} {isAr ? 'تفصيلي' : 'detail'}
        </span>
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
          {items.filter(c => c.isGroup).length} {isAr ? 'مجموعة' : 'groups'}
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'كود' : 'Code'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-500">{isAr ? 'النوع' : 'Type'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.code} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{c.code}</td>
                <td className="px-2 py-1">
                  {c.parentCode && <span className="text-gray-300 me-1">↳</span>}
                  {c.nameAr || c.name}
                </td>
                <td className="px-2 py-1 text-center">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${c.isGroup ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {c.isGroup ? (isAr ? 'مجموعة' : 'Group') : (isAr ? 'تفصيلي' : 'Detail')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🏭 Warehouses Preview
// ═══════════════════════════════════════════════════════════════

export function WarehousesPreview({ items, isAr }: { items: UnifiedWarehouse[]; isAr: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-teal-50 text-teal-600 font-medium">
          🏭 {items.length} {isAr ? 'مستودع' : 'warehouses'}
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">#</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-500">{isAr ? 'افتراضي' : 'Default'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(w => (
              <tr key={w.sourceNum} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{w.sourceNum}</td>
                <td className="px-2 py-1">{w.nameAr || w.name}</td>
                <td className="px-2 py-1 text-center">{w.isDefault ? '⭐' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🧾 Purchase Invoices Preview
// ═══════════════════════════════════════════════════════════════

export function PurchaseInvoicesPreview({ invoices, isAr }: { invoices: UnifiedPurchaseInvoice[]; isAr: boolean }) {
  const total = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const shown = invoices.slice(0, 30);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600 font-medium">
          🧾 {invoices.length} {isAr ? 'فاتورة مشتريات' : 'purchase invoices'}
        </span>
        {total > 0 && (
          <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium font-mono">
            {isAr ? 'إجمالي' : 'Total'}: {total.toLocaleString()}
          </span>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">#</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'التاريخ' : 'Date'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'المورد' : 'Supplier'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'المبلغ' : 'Amount'}</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-500">{isAr ? 'أصناف' : 'Items'}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(inv => (
              <tr key={inv.sourceNumber} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{inv.sourceNumber}</td>
                <td className="px-2 py-1 text-gray-500">{inv.date}</td>
                <td className="px-2 py-1 truncate max-w-[120px]">{inv.supplierCode || '—'}</td>
                <td className="px-2 py-1 text-end font-mono text-red-500">{inv.totalAmount?.toLocaleString()}</td>
                <td className="px-2 py-1 text-center"><Badge variant="outline" className="text-[8px]">{inv.items.length}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length > 30 && (
          <p className="text-[10px] text-gray-400 text-center py-1">
            {isAr ? `عرض أول 30 من ${invoices.length}` : `Showing first 30 of ${invoices.length}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🛒 Sales Invoices Preview
// ═══════════════════════════════════════════════════════════════

export function SalesInvoicesPreview({ invoices, isAr }: { invoices: UnifiedSalesInvoice[]; isAr: boolean }) {
  const total = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const shown = invoices.slice(0, 30);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium">
          🛒 {invoices.length} {isAr ? 'فاتورة مبيعات' : 'sales invoices'}
        </span>
        {total > 0 && (
          <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium font-mono">
            {isAr ? 'إجمالي' : 'Total'}: {total.toLocaleString()}
          </span>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">#</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'التاريخ' : 'Date'}</th>
              <th className="px-2 py-1.5 text-start font-medium text-gray-500">{isAr ? 'العميل' : 'Customer'}</th>
              <th className="px-2 py-1.5 text-end font-medium text-gray-500">{isAr ? 'المبلغ' : 'Amount'}</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-500">{isAr ? 'أصناف' : 'Items'}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(inv => (
              <tr key={inv.sourceNumber} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-2 py-1 font-mono text-indigo-600">{inv.sourceNumber}</td>
                <td className="px-2 py-1 text-gray-500">{inv.date}</td>
                <td className="px-2 py-1 truncate max-w-[120px]">{inv.customerCode || '—'}</td>
                <td className="px-2 py-1 text-end font-mono text-green-600">{inv.totalAmount?.toLocaleString()}</td>
                <td className="px-2 py-1 text-center"><Badge variant="outline" className="text-[8px]">{inv.items.length}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length > 30 && (
          <p className="text-[10px] text-gray-400 text-center py-1">
            {isAr ? `عرض أول 30 من ${invoices.length}` : `Showing first 30 of ${invoices.length}`}
          </p>
        )}
      </div>
    </div>
  );
}
