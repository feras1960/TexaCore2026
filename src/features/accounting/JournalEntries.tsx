import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useJournalEntries } from './hooks/useAccountingQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Plus,
  FileText,
  Calendar as CalendarIcon,
  ArrowRightLeft,
  RefreshCw,
  Upload,
  BookOpen,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UnifiedAccountingSheet } from './components/unified/UnifiedAccountingSheet';
import type { UnifiedDocType } from './components/unified/types';
import QuickActionsBar from './components/QuickActionsBar';
import AutomaticEntriesTab from './components/AutomaticEntriesTab';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { ImportWizard } from '@/features/import';
import { UniversalDetailSheet } from '@/components/sheets';
import type { JournalEntryData } from '@/components/shared/details/JournalEntryDetailSheet';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import RemittanceDetailSheet from '@/features/exchange/components/RemittanceDetailSheet';
import { format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';
import { getLocalizedLabel } from '@/lib/utils/getLocalizedUnit';

// Maps to UnifiedAccountingSheet docType
type AccountingDocType = 'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange';

export default function JournalEntries() {
  const { t, language, direction } = useLanguage();
  const { companyId } = useCompany();
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isRTL = direction === 'rtl';

  // ─── System entries toggle (super_admin only) ───
  const [showSystemEntries, setShowSystemEntries] = useState(false);
  // isSuperAdmin comes from useAuth() cache — no extra DB query needed
  const canToggleSystemEntries = isSuperAdmin;

  // Types considered "system/automatic" entries (container internal + COGS + settlement)
  // Note: sales_invoice and purchase_invoice stay VISIBLE — they are user-facing documents
  const SYSTEM_REFERENCE_TYPES = new Set([
    'container', 'container_tax', 'container_close', 'container_expense',
    'goods_receipt', 'vat_settlement', 'sales_cogs',
  ]);

  // ─── Sheet state ───
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<JournalEntryData | null>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [newEntryDocType, setNewEntryDocType] = useState<AccountingDocType>('journal');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sheetInitialData, setSheetInitialData] = useState<any>(null);

  // ─── Trade Sheet state (for opening source documents) ───
  const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
  const [tradeSheetMode, setTradeSheetMode] = useState<'purchase' | 'sales'>('purchase');
  const [tradeSheetData, setTradeSheetData] = useState<any>(null);
  const [tradeSheetStage, setTradeSheetStage] = useState<string | undefined>();
  const [containerSheetType, setContainerSheetType] = useState<'invoice' | 'container'>('invoice');

  // ─── Remittance Sheet state (for opening remittance from journal click) ───
  const [remittanceSheetOpen, setRemittanceSheetOpen] = useState(false);
  const [remittanceSheetId, setRemittanceSheetId] = useState<string | null>(null);

  // ─── Filter state ───
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), // أول السنة المالية
    to: new Date()
  });

  // ─── Sort state for NexaListTable ───
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortAsc, setSortAsc] = useState(false);
  const handleSort = useCallback((field: string) => {
    setSortField(prev => {
      if (prev === field) { setSortAsc(a => !a); return field; }
      setSortAsc(false);
      return field;
    });
  }, []);

  // ─── Entry type labels ───
  const entryTypes = useMemo(() => [
    { value: 'all', label: getLocalizedLabel('je_all', language) },
    { value: 'journal', label: getLocalizedLabel('je_journal', language) },
    { value: 'opening_balance', label: getLocalizedLabel('je_opening_balance', language) },
    { value: 'opening', label: getLocalizedLabel('je_opening', language) },
    { value: 'closing', label: getLocalizedLabel('je_closing', language) },
    { value: 'receipt', label: getLocalizedLabel('je_receipt', language) },
    { value: 'payment', label: getLocalizedLabel('je_payment', language) },
    { value: 'cash', label: getLocalizedLabel('je_cash', language) },
    { value: 'sales', label: getLocalizedLabel('je_sales', language) },
    { value: 'sales_invoice', label: getLocalizedLabel('je_sales_invoice', language) },
    { value: 'sales_cogs', label: getLocalizedLabel('je_sales_cogs', language) },
    { value: 'purchase', label: getLocalizedLabel('je_purchase', language) },
    { value: 'purchase_invoice', label: getLocalizedLabel('je_purchase_invoice', language) },
    { value: 'container_expense', label: getLocalizedLabel('je_cont_exp', language) },
    { value: 'container', label: getLocalizedLabel('je_container', language) },
    { value: 'container_tax', label: getLocalizedLabel('je_cont_tax', language) },
    { value: 'container_close', label: getLocalizedLabel('je_cont_close', language) },
    { value: 'goods_receipt', label: getLocalizedLabel('je_goods_receipt', language) },
    { value: 'return', label: getLocalizedLabel('je_return', language) },
    { value: 'expense', label: getLocalizedLabel('je_expense', language) },
    { value: 'transfer', label: getLocalizedLabel('je_transfer', language) },
    { value: 'exchange', label: getLocalizedLabel('je_exchange', language) },
    { value: 'depreciation', label: getLocalizedLabel('je_depreciation', language) },
    { value: 'payroll', label: getLocalizedLabel('je_payroll', language) },
    { value: 'adjustment', label: getLocalizedLabel('je_adjustment', language) },
    { value: 'vat_settlement', label: getLocalizedLabel('je_vat', language) },
    { value: 'mixed', label: getLocalizedLabel('je_mixed', language) },
    { value: 'manual', label: getLocalizedLabel('je_manual', language) },
  ], [language]);

  // ─── Data fetching via React Query — fetch ALL entries (date filter only) ───
  const journalFilters = useMemo(() => ({
    dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  }), [dateRange]);

  const { entries: rawEntries, loading, refetch: refetchEntries, invalidate: invalidateEntries } = useJournalEntries(journalFilters);

  // ─── Helper: get localized description ───
  const getLocalizedDescription = useCallback((entry: any) => {
    const langKey = `description_${language}`;
    return entry[langKey] || entry.description_en || entry.description_ar || entry.description || '';
  }, [language]);

  // ─── Transform raw → display format ───
  const allEntries = useMemo(() => {
    return (rawEntries || []).map((entry: any) => {
      const linesDebit = (entry.lines || []).reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0);
      const linesCredit = (entry.lines || []).reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0);

      // ═══ Foreign Currency totals (from lines debit_fc / credit_fc) ═══
      const linesDebitFc = (entry.lines || []).reduce((sum: number, line: any) => sum + Number(line.debit_fc || 0), 0);
      const linesCreditFc = (entry.lines || []).reduce((sum: number, line: any) => sum + Number(line.credit_fc || 0), 0);
      const entryCurrency = entry.currency || '';
      // Show FC only if currency is non-empty and FC amounts differ from base amounts
      const hasForeignCurrency = entryCurrency && linesDebitFc > 0 && Math.abs(linesDebitFc - (Number(entry.total_debit) || linesDebit)) > 0.01;

      return {
        id: entry.id,
        voucherNo: entry.entry_number || entry.id,
        date: entry.entry_date,
        reference: entry.reference_number || '',
        description: getLocalizedDescription(entry),
        totalDebit: Number(entry.total_debit) || linesDebit || 0,
        totalCredit: Number(entry.total_credit) || linesCredit || 0,
        // Foreign currency amounts
        totalDebitFc: hasForeignCurrency ? linesDebitFc : null,
        totalCreditFc: hasForeignCurrency ? linesCreditFc : null,
        currency: entryCurrency,
        status: entry.status,
        createdBy: entry.created_by || '',
        type: entry.entry_type || 'manual',
        referenceType: entry.reference_type || null,
        referenceId: entry.reference_id || null,
        origin: 'manual',
        // Keep raw entry for UnifiedAccountingSheet (needs original field names)
        _raw: entry,
        lines: (entry.lines || []).map((line: any) => ({
          id: line.id,
          account_id: line.account_id,
          account: line.account
            ? `${line.account.account_code} - ${language === 'ar' ? line.account.name_ar : line.account.name_en}`
            : '-',
          account_code: line.account?.account_code || '',
          account_name: language === 'ar' ? line.account?.name_ar : line.account?.name_en || '',
          description: line.description || '',
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          product: null,
        })),
      };
    });
  }, [rawEntries, isRTL, getLocalizedDescription]);

  // ─── Tab counts (always from ALL entries, not filtered) ───
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((e: any) => {
      const t = e.type || 'manual';
      counts[t] = (counts[t] || 0) + 1;
      if (e.status === 'posted') counts['posted'] = (counts['posted'] || 0) + 1;
      if (e.status === 'draft') counts['draft'] = (counts['draft'] || 0) + 1;
    });
    return counts;
  }, [allEntries]);

  // ─── Client-side tab + search filter ───
  const filteredData = useMemo(() => {
    let data = allEntries;

    // Apply tab filter
    if (activeTab !== 'all') {
      if (activeTab === 'posted' || activeTab === 'draft') {
        data = data.filter((e: any) => e.status === activeTab);
      } else {
        data = data.filter((e: any) => e.type === activeTab);
      }
    }

    // ── Hide system/automatic entries by default ──
    if (!showSystemEntries) {
      data = data.filter((e: any) => !e.referenceType || !SYSTEM_REFERENCE_TYPES.has(e.referenceType));
    }

    // Apply search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter((item: any) =>
        item.voucherNo?.toString().toLowerCase().includes(q) ||
        item.reference?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item._raw?.description?.toLowerCase().includes(q) ||
        item.totalDebit?.toString().includes(q)
      );
    }

    return data;
  }, [allEntries, activeTab, searchTerm, showSystemEntries]);

  // ─── Totals (from filteredData — what's currently shown) ───
  const totals = useMemo(() => {
    const totalDebit = filteredData.reduce((sum: number, entry: any) => sum + (Number(entry.totalDebit) || 0), 0);
    const totalCredit = filteredData.reduce((sum: number, entry: any) => sum + (Number(entry.totalCredit) || 0), 0);
    const postedCount = filteredData.filter((e: any) => e.status === 'posted').length;
    const draftCount = filteredData.filter((e: any) => e.status === 'draft').length;
    return { totalDebit, totalCredit, count: filteredData.length, postedCount, draftCount };
  }, [filteredData]);

  // ─── Background Prefetch for Instant Details ───
  // يخزن المستندات في الكاش لفتحها فوراً بدون انتظار عند الضغط على القيد
  const sourceDocsCache = useRef<Record<string, { type: string, data?: any, stage?: string, id?: string }>>({});

  useEffect(() => {
    if (loading || filteredData.length === 0) return;

    const prefetchSourceDocs = async () => {
      const pendingSales: string[] = [];
      const pendingPurchases: string[] = [];
      const pendingContainers: { jeId: string, containerId: string }[] = [];
      const pendingRemittances: { jeId: string, remitId: string }[] = [];

      filteredData.forEach(entry => {
        if (sourceDocsCache.current[entry.id]) return;
        
        const type = entry.type || '';
        const refType = entry.referenceType || '';
        
        if (type === 'sales' || refType === 'sales_invoice') pendingSales.push(entry.id);
        else if (type === 'purchase_invoice' || type === 'purchase' || refType === 'purchase_invoice') pendingPurchases.push(entry.id);
        else if (type === 'container_expense' || refType === 'container_expense') pendingContainers.push({ jeId: entry.id, containerId: entry.referenceId });
        else if (type === 'remittance' || refType === 'remittance') pendingRemittances.push({ jeId: entry.id, remitId: entry.referenceId });
      });

      // ═══ Sales: Check react-query cache first, then fetch remaining ═══
      if (pendingSales.length > 0) {
        const remainingSales: string[] = [];
        try {
          const queries = queryClient.getQueriesData({ queryKey: ['sales_cycle_full'] });
          for (const [_, cachedData] of queries) {
            if (Array.isArray(cachedData)) {
              for (const jeId of pendingSales) {
                if (sourceDocsCache.current[jeId]) continue;
                const match = cachedData.find((d: any) => d._rawData?.journal_entry_id === jeId);
                if (match?._rawData) {
                  sourceDocsCache.current[jeId] = { type: 'sales', data: match._rawData, stage: match._rawData.stage };
                } else {
                  remainingSales.push(jeId);
                }
              }
            }
          }
        } catch { remainingSales.push(...pendingSales.filter(id => !sourceDocsCache.current[id])); }

        if (remainingSales.length > 0) {
          const { data } = await supabase.from('sales_transactions').select('*, items:sales_transaction_items(*)').in('journal_entry_id', remainingSales);
          data?.forEach(d => { sourceDocsCache.current[d.journal_entry_id] = { type: 'sales', data: d, stage: d.stage }; });
        }
      }

      // ═══ Purchases: Check react-query cache first, then fetch remaining ═══
      if (pendingPurchases.length > 0) {
        const remainingPurchases: string[] = [];
        try {
          const queries = queryClient.getQueriesData({ queryKey: ['purchase_cycle_full'] });
          for (const [_, cachedData] of queries) {
            if (Array.isArray(cachedData)) {
              for (const jeId of pendingPurchases) {
                if (sourceDocsCache.current[jeId]) continue;
                const match = cachedData.find((d: any) => d._rawData?.journal_entry_id === jeId);
                if (match?._rawData) {
                  sourceDocsCache.current[jeId] = { type: 'purchase', data: match._rawData, stage: match._rawData.stage };
                } else {
                  remainingPurchases.push(jeId);
                }
              }
            }
          }
        } catch { remainingPurchases.push(...pendingPurchases.filter(id => !sourceDocsCache.current[id])); }

        if (remainingPurchases.length > 0) {
          const { data } = await supabase.from('purchase_transactions').select('*, items:purchase_transaction_items(*)').in('journal_entry_id', remainingPurchases);
          data?.forEach(d => { sourceDocsCache.current[d.journal_entry_id] = { type: 'purchase', data: d, stage: d.stage }; });
        }
      }

      if (pendingContainers.length > 0) {
        const directIds = pendingContainers.map(c => c.containerId).filter(Boolean);
        if (directIds.length > 0) {
          const { data } = await supabase.from('containers').select('*').in('id', directIds);
          data?.forEach(d => {
            const match = pendingContainers.find(c => c.containerId === d.id);
            if (match) sourceDocsCache.current[match.jeId] = { type: 'container', data: { ...d, party_id: d.supplier_id } };
          });
        }
        const jeIds = pendingContainers.filter(c => !c.containerId).map(c => c.jeId);
        if (jeIds.length > 0) {
          const { data: expenses } = await supabase.from('container_expenses').select('journal_entry_id, container_id').in('journal_entry_id', jeIds);
          const cIds = expenses?.map(e => e.container_id).filter(Boolean) || [];
          if (cIds.length > 0) {
             const { data: ctns } = await supabase.from('containers').select('*').in('id', cIds);
             expenses?.forEach(exp => {
                const ctn = ctns?.find(c => c.id === exp.container_id);
                if (ctn) sourceDocsCache.current[exp.journal_entry_id] = { type: 'container', data: { ...ctn, party_id: ctn.supplier_id } };
             });
          }
        }
      }

      if (pendingRemittances.length > 0) {
         const rIds = pendingRemittances.map(r => r.remitId).filter(Boolean);
         if (rIds.length > 0) {
            const { data } = await supabase.from('remittances').select('id').in('id', rIds);
            data?.forEach(d => {
               const match = pendingRemittances.find(c => c.remitId === d.id);
               if (match) sourceDocsCache.current[match.jeId] = { type: 'remittance', id: d.id };
            });
         }
         const jeIds = pendingRemittances.filter(r => !r.remitId).map(r => r.jeId);
         if (jeIds.length > 0) {
            const { data } = await supabase.from('remittances').select('id, journal_entry_id, execution_journal_id').or(`journal_entry_id.in.(${jeIds.join(',')}),execution_journal_id.in.(${jeIds.join(',')})`);
            data?.forEach(r => {
               if (r.journal_entry_id) sourceDocsCache.current[r.journal_entry_id] = { type: 'remittance', id: r.id };
               if (r.execution_journal_id) sourceDocsCache.current[r.execution_journal_id] = { type: 'remittance', id: r.id };
            });
         }
      }
    };
    
    prefetchSourceDocs();
  }, [filteredData, loading]);

  // ─── Helpers ───
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'journal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'opening': case 'opening_balance': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'closing': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'payment': return 'bg-red-100 text-red-700 border-red-200';
      case 'receipt': return 'bg-green-100 text-green-700 border-green-200';
      case 'cash': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'sales': case 'sales_invoice': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'sales_cogs': return 'bg-lime-100 text-lime-700 border-lime-200';
      case 'purchase': case 'purchase_invoice': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'container_expense': case 'container': case 'container_tax': case 'container_close': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'goods_receipt': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'expense': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'transfer': return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'exchange': return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
      case 'payroll': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'adjustment': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'vat_settlement': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'mixed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // ─── Smart row click: open source document or journal entry ───
  const handleViewDetails = useCallback(async (entry: any) => {
    const entryType = entry.type; // entry_type field
    const refType = entry.referenceType; // reference_type field (from RPC-created entries)
    const refId = entry.referenceId; // reference_id field
    const entryId = entry.id;

    // ═══ 0. BACKGROUND CACHE CHECK (Instant 0ms Loading) ═══
    const cached = sourceDocsCache.current[entryId];
    if (cached) {
      if (cached.type === 'remittance' && cached.id) {
        setRemittanceSheetId(cached.id);
        setRemittanceSheetOpen(true);
        return;
      }
      if (cached.type === 'container' && cached.data) {
        setTradeSheetMode('purchase');
        setTradeSheetData(cached.data);
        setTradeSheetStage(undefined);
        setContainerSheetType('container');
        setTradeSheetOpen(true);
        return;
      }
      if (cached.type === 'purchase' && cached.data) {
        setTradeSheetMode('purchase');
        setTradeSheetData(cached.data);
        setTradeSheetStage(cached.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }
      if (cached.type === 'sales' && cached.data) {
        setTradeSheetMode('sales');
        setTradeSheetData(cached.data);
        setTradeSheetStage(cached.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }
    }

    // ═══ 0a. Remittance entries → open RemittanceDetailSheet ═══
    if (refType === 'remittance' || entryType === 'remittance') {
      // Find the remittance ID from reference_id
      let remitId = refId;
      if (!remitId) {
        // Fallback: search remittances table by journal_entry_id
        const { data: remit } = await supabase
          .from('remittances')
          .select('id')
          .or(`journal_entry_id.eq.${entryId},execution_journal_id.eq.${entryId}`)
          .maybeSingle();
        remitId = remit?.id;
      }
      if (remitId) {
        setRemittanceSheetId(remitId);
        setRemittanceSheetOpen(true);
        return;
      }
      // Fallback: if no remittance found, open as regular journal
      console.warn('Remittance not found for JE:', entryId);
    }

    // ═══ 0b. Regular entries → open UnifiedAccountingSheet in edit/view mode ═══
    // Only entries with source-document refTypes (container, purchase, sales) go through async lookup
    const SOURCE_DOC_REF_TYPES = new Set([
      'container_expense', 'container', 'container_tax', 'container_close',
      'purchase_invoice', 'sales_invoice', 'goods_receipt', 'sales_cogs',
    ]);
    const ACCOUNTING_ENTRY_TYPES = new Set(['cash', 'receipt', 'payment']);

    if (ACCOUNTING_ENTRY_TYPES.has(entryType || '') || (!SOURCE_DOC_REF_TYPES.has(refType || '') && !SOURCE_DOC_REF_TYPES.has(entryType || ''))) {
      // ✅ cash/receipt/payment → افتح بواجهتها الأصلية (يومية الصندوق / سند القبض / سند الصرف)
      const cashDocTypes: Record<string, AccountingDocType> = {
        cash: 'cash',
        receipt: 'receipt',
        payment: 'payment',
      };
      const targetDocType: AccountingDocType = cashDocTypes[entryType] || 'journal';

      setNewEntryDocType(targetDocType);
      setEditEntryId(entryId);
      setIsEditMode(false);
      setSheetInitialData(entry._raw || entry);
      setIsNewEntryOpen(true);
      return;
    }

    // ═══ 1. Container expense → open Container sheet ═══
    // Container entries use reference_type='container_expense' and reference_id=container_id
    if (entryType === 'container_expense' || refType === 'container_expense') {
      const containerId = refId;
      if (containerId) {
        const { data: container, error } = await supabase
          .from('containers')
          .select('*')
          .eq('id', containerId)
          .maybeSingle();

        if (container && !error) {
          setTradeSheetMode('purchase');
          setTradeSheetData({ ...container, party_id: container.supplier_id });
          setTradeSheetStage(undefined);
          setContainerSheetType('container');
          setTradeSheetOpen(true);
          return;
        }
      }
      // Fallback: try to find container from container_expenses table
      const { data: expense } = await supabase
        .from('container_expenses')
        .select('container_id')
        .eq('journal_entry_id', entryId)
        .maybeSingle();

      if (expense?.container_id) {
        const { data: container } = await supabase
          .from('containers')
          .select('*')
          .eq('id', expense.container_id)
          .maybeSingle();

        if (container) {
          setTradeSheetMode('purchase');
          setTradeSheetData({ ...container, party_id: container.supplier_id });
          setTradeSheetStage(undefined);
          setContainerSheetType('container');
          setTradeSheetOpen(true);
          return;
        }
      }
      console.warn('Source container not found for JE:', entryId);
    }

    // ═══ 2. Purchase invoice → open Purchase sheet ═══
    if (entryType === 'purchase_invoice' || entryType === 'purchase') {
      let docCache = null;
      try {
        const queries = queryClient.getQueriesData({ queryKey: ['purchase_cycle_full'] });
        for (const [_, cachedData] of queries) {
          if (Array.isArray(cachedData)) {
            const match = cachedData.find((d: any) => d._rawData?.journal_entry_id === entryId || d.id === refId);
            if (match) { docCache = match._rawData; break; }
          }
        }
      } catch (e) { }

      if (docCache) {
        setTradeSheetMode('purchase');
        setTradeSheetData(docCache);
        setTradeSheetStage(docCache.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }

      // fallback
      let query = supabase.from('purchase_transactions').select('*, items:purchase_transaction_items(*)');
      if (refId) query = query.eq('id', refId);
      else query = query.eq('journal_entry_id', entryId);

      const { data: doc, error } = await query.maybeSingle();

      if (doc && !error) {
        setTradeSheetMode('purchase');
        setTradeSheetData(doc);
        setTradeSheetStage(doc.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }
      console.warn('Source purchase doc not found for JE:', entryId);
    }

    // ═══ 3. Sales invoice → open Sales sheet ═══
    // Sales entries: entry_type='sales' OR reference_type='sales_invoice'
    if (entryType === 'sales' || refType === 'sales_invoice') {
      let docCache = null;
      try {
        const queries = queryClient.getQueriesData({ queryKey: ['sales_cycle_full'] });
        for (const [_, cachedData] of queries) {
          if (Array.isArray(cachedData)) {
            const match = cachedData.find((d: any) => d._rawData?.journal_entry_id === entryId || d.id === refId);
            if (match) { docCache = match._rawData; break; }
          }
        }
      } catch (e) { }

      if (docCache) {
        setTradeSheetMode('sales');
        setTradeSheetData(docCache);
        setTradeSheetStage(docCache.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }

      // Fallback
      let query = supabase.from('sales_transactions').select('*, items:sales_transaction_items(*)');
      if (refId) query = query.eq('id', refId);
      else query = query.eq('journal_entry_id', entryId);

      const { data: doc, error } = await query.maybeSingle();

      if (doc && !error) {
        setTradeSheetMode('sales');
        setTradeSheetData(doc);
        setTradeSheetStage(doc.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }
      console.warn('Source sales doc not found for JE:', entryId);
    }

    // ═══ 4. Fallback: check reference_type for any unmatched entries ═══
    // Some manual entries have descriptions mentioning sales/purchase but wrong entry_type
    if (refType && !['container_expense', 'sales_invoice'].includes(refType) && refId) {
      // Could be a purchase invoice reference
      if (refType === 'purchase_invoice') {
        const { data: doc } = await supabase
          .from('purchase_transactions')
          .select('*')
          .eq('id', refId)
          .maybeSingle();
        if (doc) {
          setTradeSheetMode('purchase');
          setTradeSheetData(doc);
          setTradeSheetStage(doc.stage);
          setContainerSheetType('invoice');
          setTradeSheetOpen(true);
          return;
        }
      }
    }

    // ═══ 5. Universal container fallback ═══
    // Any JE linked to a container_expense → open Container sheet
    // This catches customs tax & other entries that may have entry_type='manual'
    {
      const { data: linkedExpense } = await supabase
        .from('container_expenses')
        .select('container_id')
        .eq('journal_entry_id', entryId)
        .maybeSingle();

      if (linkedExpense?.container_id) {
        const { data: container } = await supabase
          .from('containers')
          .select('*')
          .eq('id', linkedExpense.container_id)
          .maybeSingle();

        if (container) {
          setTradeSheetMode('purchase');
          setTradeSheetData({ ...container, party_id: container.supplier_id });
          setTradeSheetStage(undefined);
          setContainerSheetType('container');
          setTradeSheetOpen(true);
          return;
        }
      }
    }

    // ═══ 6. Manual / other types → open journal entry detail sheet ═══
    setSelectedEntryForDetails(entry);
  }, []);



  const badge = (count: number) => (
    <span className={cn(
      "ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] inline-flex items-center justify-center shadow-sm border",
      count > 0
        ? "bg-white/80 dark:bg-slate-700 border-slate-100"
        : "bg-slate-50 dark:bg-slate-800 border-slate-100 text-slate-300"
    )}>
      {count}
    </span>
  );

  // ══════════════════════════════════════════════════════════════
  // NexaListTable Columns — RTL order as requested:
  // المدين → الدائن → التاريخ → البيان → رقم القيد → المرجع → الحالة → النوع
  // ══════════════════════════════════════════════════════════════
  const columns: NexaListColumn<any>[] = useMemo(() => {
    const debitCol: NexaListColumn<any> = {
      id: 'totalDebit',
      header: getLocalizedLabel('je_debit', language),
      sortable: true,
      sortKey: 'totalDebit',
      align: 'end',
      width: 'min-w-[120px]',
      cell: (row) => {
        const v = Number(row.totalDebit || 0);
        if (v === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
        return (
          <div className="text-end">
            <span className="font-mono font-bold text-[13px] text-green-600 tabular-nums" dir="ltr">{formatCurrency(v)}</span>
            {row.totalDebitFc != null && (
              <div className="text-[10px] text-blue-500/80 font-mono tabular-nums mt-0.5" dir="ltr">
                {formatCurrency(row.totalDebitFc)} <span className="text-[9px] font-sans opacity-70">{row.currency}</span>
              </div>
            )}
          </div>
        );
      },
    };

    const creditCol: NexaListColumn<any> = {
      id: 'totalCredit',
      header: getLocalizedLabel('je_credit', language),
      sortable: true,
      sortKey: 'totalCredit',
      align: 'end',
      width: 'min-w-[120px]',
      cell: (row) => {
        const v = Number(row.totalCredit || 0);
        if (v === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
        return (
          <div className="text-end">
            <span className="font-mono font-bold text-[13px] text-red-600 tabular-nums" dir="ltr">{formatCurrency(v)}</span>
            {row.totalCreditFc != null && (
              <div className="text-[10px] text-blue-500/80 font-mono tabular-nums mt-0.5" dir="ltr">
                {formatCurrency(row.totalCreditFc)} <span className="text-[9px] font-sans opacity-70">{row.currency}</span>
              </div>
            )}
          </div>
        );
      },
    };

    const dateCol: NexaListColumn<any> = {
      id: 'date',
      header: getLocalizedLabel('je_date', language),
      sortable: true,
      sortKey: 'date',
      width: 'min-w-[110px]',
      cell: (row) => {
        if (!row.date) return <span className="text-[11px] text-gray-300">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-gray-600">
            <CalendarIcon className="w-3 h-3 opacity-50" />
            <span className="text-[12px] font-mono font-medium">
              {format(new Date(row.date), 'yyyy/MM/dd')}
            </span>
          </div>
        );
      },
    };

    const descriptionCol: NexaListColumn<any> = {
      id: 'description',
      header: getLocalizedLabel('je_desc', language),
      width: 'min-w-[220px]',
      cell: (row) => (
        <div className="max-w-[320px] truncate">
          <span className="text-sm text-gray-700 dark:text-gray-300">{row.description || '—'}</span>
          {row.lines?.length > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              {row.lines[0]?.account_name} {row.lines.length > 1 ? `+ ${row.lines.length - 1} ${getLocalizedLabel('je_others', language)}` : ''}
            </div>
          )}
        </div>
      ),
    };

    const voucherNoCol: NexaListColumn<any> = {
      id: 'voucherNo',
      header: getLocalizedLabel('je_entry_no', language),
      sortable: true,
      sortKey: 'voucherNo',
      width: 'min-w-[140px]',
      cell: (row) => <span className="font-mono font-bold text-[13px] text-erp-primary leading-tight">{row.voucherNo}</span>,
    };

    const referenceCol: NexaListColumn<any> = {
      id: 'reference',
      header: getLocalizedLabel('je_ref', language),
      width: 'min-w-[100px]',
      cell: (row) => <span className="text-xs text-slate-600 font-mono">{row.reference || '—'}</span>,
    };

    const statusCol: NexaListColumn<any> = {
      id: 'status',
      header: getLocalizedLabel('je_status', language),
      width: 'min-w-[90px]',
      cell: (row) => {
        const s = row.status || 'draft';
        const cfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
          posted: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: getLocalizedLabel('je_post', language) },
          draft: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: getLocalizedLabel('je_dft', language) },
          pending: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: getLocalizedLabel('je_pend', language) },
          cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: getLocalizedLabel('je_canc', language) },
        };
        const style = cfg[s] || cfg.draft;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        );
      },
    };

    const typeCol: NexaListColumn<any> = {
      id: 'type',
      header: getLocalizedLabel('je_type', language),
      width: 'min-w-[100px]',
      cell: (row) => (
        <Badge variant="outline" className={cn("font-medium border shadow-sm text-xs", getTypeStyle(row.type))}>
          {entryTypes.find(t => t.value === row.type)?.label || row.type}
        </Badge>
      ),
    };

    // ═══ RTL order (Arabic): المدين → الدائن → التاريخ → البيان → رقم القيد → المرجع → الحالة → النوع
    // ═══ LTR order (English): Type → Status → Reference → Entry# → Description → Date → Credit → Debit
    return isRTL
      ? [debitCol, creditCol, dateCol, descriptionCol, voucherNoCol, referenceCol, statusCol, typeCol]
      : [typeCol, statusCol, referenceCol, voucherNoCol, descriptionCol, dateCol, creditCol, debitCol];
  }, [isRTL, language, entryTypes]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full p-4 lg:p-6 pb-20 max-w-[1600px] mx-auto" dir={direction}>

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-erp-primary/10 to-erp-teal/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-erp-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {getLocalizedLabel('je_title', language)}
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{getLocalizedLabel('je_subtitle', language)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" className="gap-1.5 h-9 text-xs font-tajawal" onClick={() => setShowImportWizard(true)}>
            <Upload className="w-3.5 h-3.5" />
            {t('common.import')}
          </Button>
          <QuickActionsBar />
        </div>
      </div>

      {/* ─── Tabs Row + Date Picker — same style as Sales/Purchase ─── */}
      <div className="flex flex-wrap items-center gap-3 px-1 mb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
          <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{getLocalizedLabel('je_all', language)}{badge(allEntries.length)}</TabsTrigger>
            <TabsTrigger value="posted" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-green-600">{getLocalizedLabel('je_post', language)}{badge(tabCounts.posted || 0)}</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-yellow-600">{getLocalizedLabel('je_dft', language)}{badge(tabCounts.draft || 0)}</TabsTrigger>
            <TabsTrigger value="journal" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-blue-600">{getLocalizedLabel('je_journal', language)}{badge(tabCounts.journal || 0)}</TabsTrigger>
            <TabsTrigger value="receipt" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-emerald-600">{getLocalizedLabel('je_receipt', language)}{badge(tabCounts.receipt || 0)}</TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-red-600">{getLocalizedLabel('je_payment', language)}{badge(tabCounts.payment || 0)}</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-indigo-600">{getLocalizedLabel('je_sales', language)}{badge(tabCounts.sales || 0)}</TabsTrigger>
            <TabsTrigger value="purchase_invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-orange-600">{getLocalizedLabel('je_purchase', language)}{badge(tabCounts.purchase_invoice || 0)}</TabsTrigger>
          </TabsList>
        </Tabs>

        <DateRangePicker
          date={dateRange}
          setDate={setDateRange}
          className="w-full sm:w-[260px]"
        />

        {/* ── Toggle: إظهار قيود النظام — لصاحب الاشتراك والمحاسب فقط ── */}
        {canToggleSystemEntries && (
          <Button
            variant={showSystemEntries ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'gap-1.5 h-9 text-xs ms-auto',
              showSystemEntries
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'text-violet-600 border-violet-200 hover:bg-violet-50'
            )}
            onClick={() => setShowSystemEntries(prev => !prev)}
          >
            {showSystemEntries ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showSystemEntries ? getLocalizedLabel('je_hide_sys', language) : getLocalizedLabel('je_show_sys', language)}
          </Button>
        )}
      </div>

      {/* ─── Summary Stats Bar ─── */}
      <div className="flex flex-wrap items-center gap-3 px-1 mb-3">
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-lg border px-4 py-2.5 shadow-sm flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{getLocalizedLabel('je_t_debit', language)}</span>
            <span className="font-mono font-bold text-[14px] text-green-600" dir="ltr">{formatCurrency(totals.totalDebit)}</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{getLocalizedLabel('je_t_credit', language)}</span>
            <span className="font-mono font-bold text-[14px] text-red-600" dir="ltr">{formatCurrency(totals.totalCredit)}</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{getLocalizedLabel('je_t_net', language)}</span>
            <span className={cn("font-mono font-bold text-[14px]", totals.totalDebit - totals.totalCredit === 0 ? 'text-slate-500' : 'text-amber-600')} dir="ltr">
              {formatCurrency(totals.totalDebit - totals.totalCredit)}
            </span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{getLocalizedLabel('je_t_count', language)}</span>
            <span className="font-bold text-[14px] text-slate-700 dark:text-slate-200">{totals.count}</span>
            {totals.postedCount > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700 h-5 px-1.5 text-[10px]">{totals.postedCount} {getLocalizedLabel('je_post', language).toLowerCase()}</Badge>}
            {totals.draftCount > 0 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 h-5 px-1.5 text-[10px]">{totals.draftCount} {getLocalizedLabel('je_dft', language).toLowerCase()}</Badge>}
          </div>
        </div>
      </div>

      {/* ─── NexaListTable ─── */}
      <NexaListTable
        data={filteredData}
        columns={columns}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={getLocalizedLabel('je_search', language)}
        totalCount={filteredData.length}
        countLabel={getLocalizedLabel('je_entries', language)}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
        onRowClick={(row) => handleViewDetails(row)}
        getRowKey={(row: any) => row.id}
        isLoading={loading}
        emptyIcon={<FileText className="w-12 h-12 text-gray-300" />}
        emptyMessage={getLocalizedLabel('je_no_match', language)}
        showFooter={true}
        footerLeftText={`${filteredData.length} ${getLocalizedLabel('je_entries', language)}`}
        footerRightContent={
          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <span className="text-green-600" dir="ltr">
              {getLocalizedLabel('je_dr', language)}{formatCurrency(totals.totalDebit)}
            </span>
            <span className="text-red-600" dir="ltr">
              {getLocalizedLabel('je_cr', language)}{formatCurrency(totals.totalCredit)}
            </span>
            {totals.totalDebit - totals.totalCredit !== 0 && (
              <span className="text-amber-600 border-s border-gray-300 ps-3" dir="ltr">
                {getLocalizedLabel('je_diff', language)}{formatCurrency(totals.totalDebit - totals.totalCredit)}
              </span>
            )}
          </div>
        }
        isRTL={isRTL}
        direction={direction}
      />

      {/* ─── Unified Accounting Sheet (replaces legacy NewJournalEntrySheet) ─── */}
      <UnifiedAccountingSheet
        key={`${editEntryId || 'new'}-${isNewEntryOpen}`}
        isOpen={isNewEntryOpen}
        onClose={() => {
          setIsNewEntryOpen(false);
          setIsEditMode(false);
          setEditEntryId(null);
          setSheetInitialData(null);
          invalidateEntries();
        }}
        docType={newEntryDocType as UnifiedDocType}
        mode={isEditMode ? 'edit' : (editEntryId ? 'view' : 'create')}
        data={sheetInitialData}
        documentId={editEntryId || undefined}
        onSave={async () => {
          invalidateEntries();
        }}
        onRefresh={() => {
          invalidateEntries();
        }}
      />

      <UniversalDetailSheet
        isOpen={!!selectedEntryForDetails}
        onClose={() => setSelectedEntryForDetails(null)}
        docType="journal_entry"
        data={selectedEntryForDetails}
      />

      {/* Trade Sheet — for purchase/sales source documents */}
      {tradeSheetOpen && tradeSheetData && (
        <UnifiedTradeSheet
          open={tradeSheetOpen}
          onOpenChange={(open) => {
            setTradeSheetOpen(open);
            if (!open) {
              setTradeSheetData(null);
              setContainerSheetType('invoice');
              invalidateEntries();
            }
          }}
          mode={tradeSheetMode}
          type={containerSheetType}
          initialData={tradeSheetData}
          currentStage={tradeSheetStage}
          onRefresh={invalidateEntries}
        />
      )}

      {showImportWizard && (
        <ImportWizard
          defaultEntityType="journal_entries"
          onClose={() => setShowImportWizard(false)}
          onComplete={() => {
            setShowImportWizard(false);
            invalidateEntries();
          }}
        />
      )}

      {/* Remittance Sheet — for opening remittance from journal click */}
      <RemittanceDetailSheet
        remittanceId={remittanceSheetId}
        open={remittanceSheetOpen}
        onClose={() => {
          setRemittanceSheetOpen(false);
          setRemittanceSheetId(null);
          invalidateEntries();
        }}
        onDataChange={invalidateEntries}
      />
    </div>
  );
}
