import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useJournalEntries } from './hooks/useAccountingQueries';
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
import AutomaticEntriesTab from './components/AutomaticEntriesTab';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { ImportWizard } from '@/features/import';
import { UniversalDetailSheet } from '@/components/sheets';
import type { JournalEntryData } from '@/components/shared/details/JournalEntryDetailSheet';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';

// Maps to UnifiedAccountingSheet docType
type AccountingDocType = 'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange';

export default function JournalEntries() {
  const { t, language, direction } = useLanguage();
  const { companyId } = useCompany();
  const { user, isSuperAdmin } = useAuth();
  const isRTL = direction === 'rtl';

  // ─── Role check for system entries toggle ───
  const [userRole, setUserRole] = useState<string>('');
  const [showSystemEntries, setShowSystemEntries] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data?.role) setUserRole(data.role); });
  }, [user?.id]);

  // Only super_admin (platform owner) can see the toggle — for debugging/verification only
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
    { value: 'all', label: isRTL ? 'الكل' : 'All' },
    { value: 'journal', label: isRTL ? 'قيد يومية' : 'Journal' },
    { value: 'opening', label: isRTL ? 'افتتاحي' : 'Opening' },
    { value: 'closing', label: isRTL ? 'إغلاق' : 'Closing' },
    { value: 'receipt', label: isRTL ? 'سند قبض' : 'Receipt' },
    { value: 'payment', label: isRTL ? 'سند صرف' : 'Payment' },
    { value: 'sales', label: isRTL ? 'مبيعات' : 'Sales' },
    { value: 'purchase', label: isRTL ? 'مشتريات' : 'Purchase' },
    { value: 'purchase_invoice', label: isRTL ? 'ف. مشتريات' : 'Purch. Inv.' },
    { value: 'container_expense', label: isRTL ? 'م. كونتينر' : 'Cont. Exp.' },
    { value: 'return', label: isRTL ? 'مرتجع' : 'Return' },
    { value: 'expense', label: isRTL ? 'مصروف' : 'Expense' },
    { value: 'depreciation', label: isRTL ? 'إهلاك' : 'Depreciation' },
    { value: 'payroll', label: isRTL ? 'رواتب' : 'Payroll' },
    { value: 'adjustment', label: isRTL ? 'تسوية' : 'Adjustment' },
    { value: 'mixed', label: isRTL ? 'مختلف' : 'Mixed' },
    { value: 'manual', label: isRTL ? 'يدوي' : 'Manual' },
  ], [isRTL]);

  // ─── Data fetching via React Query — fetch ALL entries (date filter only) ───
  const journalFilters = useMemo(() => ({
    dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  }), [dateRange]);

  const { entries: rawEntries, loading, refetch: refetchEntries, invalidate: invalidateEntries } = useJournalEntries(journalFilters);

  // ─── Transform raw → display format ───
  const allEntries = useMemo(() => {
    return (rawEntries || []).map((entry: any) => {
      const linesDebit = (entry.lines || []).reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0);
      const linesCredit = (entry.lines || []).reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0);

      return {
        id: entry.id,
        voucherNo: entry.entry_number || entry.id,
        date: entry.entry_date,
        reference: entry.reference || '',
        description: entry.description || '',
        totalDebit: Number(entry.total_debit) || linesDebit || 0,
        totalCredit: Number(entry.total_credit) || linesCredit || 0,
        costCenter: entry.cost_center_id || null,
        status: entry.status,
        createdBy: entry.created_by || '',
        type: entry.entry_type || 'manual',
        referenceType: entry.reference_type || null,
        referenceId: entry.reference_id || null,
        origin: 'manual',
        lines: (entry.lines || []).map((line: any) => ({
          id: line.id,
          account_id: line.account_id,
          account: line.account
            ? `${line.account.account_code} - ${isRTL ? line.account.name_ar : line.account.name_en}`
            : '-',
          account_code: line.account?.account_code || '',
          account_name: isRTL ? line.account?.name_ar : line.account?.name_en || '',
          description: line.description || '',
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          product: null,
        })),
      };
    });
  }, [rawEntries, isRTL]);

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

  // ─── Helpers ───
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'journal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'opening': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'payment': return 'bg-red-100 text-red-700 border-red-200';
      case 'receipt': return 'bg-green-100 text-green-700 border-green-200';
      case 'sales': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'purchase': case 'purchase_invoice': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'container_expense': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'expense': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'payroll': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'adjustment': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
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
      const { data: doc, error } = await supabase
        .from('purchase_transactions')
        .select('*')
        .eq('journal_entry_id', entryId)
        .maybeSingle();

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
      // search by journal_entry_id
      const { data: doc, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .eq('journal_entry_id', entryId)
        .maybeSingle();

      if (doc && !error) {
        setTradeSheetMode('sales');
        setTradeSheetData(doc);
        setTradeSheetStage(doc.stage);
        setContainerSheetType('invoice');
        setTradeSheetOpen(true);
        return;
      }
      // Also try searching by reference_id (RPC stores invoice_id as reference_id)
      if (refId) {
        const { data: doc2, error: err2 } = await supabase
          .from('sales_transactions')
          .select('*')
          .eq('id', refId)
          .maybeSingle();

        if (doc2 && !err2) {
          setTradeSheetMode('sales');
          setTradeSheetData(doc2);
          setTradeSheetStage(doc2.stage);
          setContainerSheetType('invoice');
          setTradeSheetOpen(true);
          return;
        }
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
      header: isRTL ? 'المدين' : 'Debit',
      sortable: true,
      sortKey: 'totalDebit',
      align: 'end',
      width: 'min-w-[110px]',
      cell: (row) => {
        const v = Number(row.totalDebit || 0);
        if (v === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
        return <span className="font-mono font-bold text-[13px] text-green-600 tabular-nums" dir="ltr">{formatCurrency(v)}</span>;
      },
    };

    const creditCol: NexaListColumn<any> = {
      id: 'totalCredit',
      header: isRTL ? 'الدائن' : 'Credit',
      sortable: true,
      sortKey: 'totalCredit',
      align: 'end',
      width: 'min-w-[110px]',
      cell: (row) => {
        const v = Number(row.totalCredit || 0);
        if (v === 0) return <span className="text-[11px] text-gray-300 text-end block">—</span>;
        return <span className="font-mono font-bold text-[13px] text-red-600 tabular-nums" dir="ltr">{formatCurrency(v)}</span>;
      },
    };

    const dateCol: NexaListColumn<any> = {
      id: 'date',
      header: isRTL ? 'التاريخ' : 'Date',
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
      header: isRTL ? 'البيان' : 'Description',
      width: 'min-w-[220px]',
      cell: (row) => (
        <div className="max-w-[320px] truncate">
          <span className="text-sm text-gray-700 dark:text-gray-300">{row.description || '—'}</span>
          {row.lines?.length > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              {row.lines[0]?.account_name} {row.lines.length > 1 ? `+ ${row.lines.length - 1} ${isRTL ? 'آخرين' : 'more'}` : ''}
            </div>
          )}
        </div>
      ),
    };

    const voucherNoCol: NexaListColumn<any> = {
      id: 'voucherNo',
      header: isRTL ? 'رقم القيد' : 'Entry #',
      sortable: true,
      sortKey: 'voucherNo',
      width: 'min-w-[140px]',
      cell: (row) => <span className="font-mono font-bold text-[13px] text-erp-primary leading-tight">{row.voucherNo}</span>,
    };

    const referenceCol: NexaListColumn<any> = {
      id: 'reference',
      header: isRTL ? 'المرجع' : 'Reference',
      width: 'min-w-[100px]',
      cell: (row) => <span className="text-xs text-slate-600 font-mono">{row.reference || '—'}</span>,
    };

    const statusCol: NexaListColumn<any> = {
      id: 'status',
      header: isRTL ? 'الحالة' : 'Status',
      width: 'min-w-[90px]',
      cell: (row) => {
        const s = row.status || 'draft';
        const cfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
          posted: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: isRTL ? 'مرحّل' : 'Posted' },
          draft: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: isRTL ? 'مسودة' : 'Draft' },
          pending: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: isRTL ? 'معلّق' : 'Pending' },
          cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: isRTL ? 'ملغي' : 'Cancelled' },
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
      header: isRTL ? 'النوع' : 'Type',
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
  }, [isRTL, entryTypes]);

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
              {t('accounting.journalEntries')}
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{t('accounting.manageEntries')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setShowImportWizard(true)}>
            <Upload className="w-4 h-4" />
            {t('common.import')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setNewEntryDocType('transfer'); setSheetInitialData(null); setIsEditMode(false); setEditEntryId(null); setIsNewEntryOpen(true); }}>
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            {isRTL ? 'تحويل' : 'Transfer'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setNewEntryDocType('exchange'); setSheetInitialData(null); setIsEditMode(false); setEditEntryId(null); setIsNewEntryOpen(true); }}>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            {isRTL ? 'صرافة' : 'Exchange'}
          </Button>
          <Button size="sm" className="bg-erp-primary hover:bg-erp-primary/90 text-white gap-1.5 h-9 px-4 shadow-sm" onClick={() => { setNewEntryDocType('journal'); setSheetInitialData(null); setIsEditMode(false); setEditEntryId(null); setIsNewEntryOpen(true); }}>
            <Plus className="w-4 h-4" />
            {isRTL ? 'قيد محاسبي' : 'Journal Entry'}
          </Button>
        </div>
      </div>

      {/* ─── Tabs Row + Date Picker — same style as Sales/Purchase ─── */}
      <div className="flex flex-wrap items-center gap-3 px-1 mb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
          <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max overflow-x-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8">{isRTL ? 'الكل' : 'All'}{badge(allEntries.length)}</TabsTrigger>
            <TabsTrigger value="posted" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-green-600">{isRTL ? 'مرحّل' : 'Posted'}{badge(tabCounts.posted || 0)}</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-yellow-600">{isRTL ? 'مسودة' : 'Draft'}{badge(tabCounts.draft || 0)}</TabsTrigger>
            <TabsTrigger value="journal" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-blue-600">{isRTL ? 'قيد يومية' : 'Journal'}{badge(tabCounts.journal || 0)}</TabsTrigger>
            <TabsTrigger value="receipt" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-emerald-600">{isRTL ? 'سند قبض' : 'Receipt'}{badge(tabCounts.receipt || 0)}</TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-red-600">{isRTL ? 'سند صرف' : 'Payment'}{badge(tabCounts.payment || 0)}</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-indigo-600">{isRTL ? 'مبيعات' : 'Sales'}{badge(tabCounts.sales || 0)}</TabsTrigger>
            <TabsTrigger value="purchase_invoice" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 h-8 text-orange-600">{isRTL ? 'مشتريات' : 'Purchase'}{badge(tabCounts.purchase_invoice || 0)}</TabsTrigger>
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
            {isRTL
              ? (showSystemEntries ? 'إخفاء قيود النظام' : 'إظهار قيود النظام')
              : (showSystemEntries ? 'Hide System' : 'Show System')
            }
          </Button>
        )}
      </div>

      {/* ─── Summary Stats Bar ─── */}
      <div className="flex flex-wrap items-center gap-3 px-1 mb-3">
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-lg border px-4 py-2.5 shadow-sm flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{isRTL ? 'إجمالي المدين' : 'Total Debit'}</span>
            <span className="font-mono font-bold text-[14px] text-green-600" dir="ltr">{formatCurrency(totals.totalDebit)}</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{isRTL ? 'إجمالي الدائن' : 'Total Credit'}</span>
            <span className="font-mono font-bold text-[14px] text-red-600" dir="ltr">{formatCurrency(totals.totalCredit)}</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{isRTL ? 'صافي الحركة' : 'Net Movement'}</span>
            <span className={cn("font-mono font-bold text-[14px]", totals.totalDebit - totals.totalCredit === 0 ? 'text-slate-500' : 'text-amber-600')} dir="ltr">
              {formatCurrency(totals.totalDebit - totals.totalCredit)}
            </span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{isRTL ? 'عدد القيود' : 'Entries'}</span>
            <span className="font-bold text-[14px] text-slate-700 dark:text-slate-200">{totals.count}</span>
            {totals.postedCount > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700 h-5 px-1.5 text-[10px]">{totals.postedCount} {isRTL ? 'مرحّل' : 'posted'}</Badge>}
            {totals.draftCount > 0 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 h-5 px-1.5 text-[10px]">{totals.draftCount} {isRTL ? 'مسودة' : 'draft'}</Badge>}
          </div>
        </div>
      </div>

      {/* ─── NexaListTable ─── */}
      <NexaListTable
        data={filteredData}
        columns={columns}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={isRTL ? 'بحث في القيود...' : 'Search entries...'}
        totalCount={filteredData.length}
        countLabel={isRTL ? 'قيد' : 'entries'}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
        onRowClick={(row) => handleViewDetails(row)}
        getRowKey={(row: any) => row.id}
        isLoading={loading}
        emptyIcon={<FileText className="w-12 h-12 text-gray-300" />}
        emptyMessage={isRTL ? 'لا توجد قيود مطابقة' : 'No matching entries'}
        showFooter={true}
        footerLeftText={`${filteredData.length} ${isRTL ? 'قيد' : 'entries'}`}
        footerRightContent={
          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <span className="text-green-600" dir="ltr">
              {isRTL ? 'مدين: ' : 'Dr: '}{formatCurrency(totals.totalDebit)}
            </span>
            <span className="text-red-600" dir="ltr">
              {isRTL ? 'دائن: ' : 'Cr: '}{formatCurrency(totals.totalCredit)}
            </span>
            {totals.totalDebit - totals.totalCredit !== 0 && (
              <span className="text-amber-600 border-s border-gray-300 ps-3" dir="ltr">
                {isRTL ? 'فرق: ' : 'Diff: '}{formatCurrency(totals.totalDebit - totals.totalCredit)}
              </span>
            )}
          </div>
        }
        isRTL={isRTL}
        direction={direction}
      />

      {/* ─── Unified Accounting Sheet (replaces legacy NewJournalEntrySheet) ─── */}
      <UnifiedAccountingSheet
        isOpen={isNewEntryOpen}
        onClose={() => {
          setIsNewEntryOpen(false);
          setIsEditMode(false);
          setEditEntryId(null);
          setSheetInitialData(null);
          invalidateEntries();
        }}
        docType={newEntryDocType as UnifiedDocType}
        mode={isEditMode ? 'edit' : 'create'}
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
    </div>
  );
}
