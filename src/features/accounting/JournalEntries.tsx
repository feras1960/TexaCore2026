import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Search,
  Plus,
  Filter,
  Download,
  FileText,
  MoreHorizontal,
  Calendar as CalendarIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  RefreshCw,
  Eye,
  Edit,
  X,
  RotateCcw,
  DollarSign,
  Wallet,
  Palette,
  FileSpreadsheet,
  Printer,
  Upload
} from 'lucide-react';
import NewJournalEntrySheet from './components/NewJournalEntrySheet';
import AutomaticEntriesTab from './components/AutomaticEntriesTab';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { ImportWizard } from '@/features/import';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { UniversalDetailSheet } from '@/components/sheets';
import type { JournalEntryData } from '@/components/shared/details/JournalEntryDetailSheet';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

// Import the new unified marker colors with fixed meanings
import {
  ColorMarkerPalette,
  MARKER_COLORS,
  getMarkerBackgroundColor,
  type MarkerColorId
} from '@/components/shared/ColorMarkerPalette';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

interface FilterState {
  search: string;
  entryType: string;
  status: string;
  origin: string;
  entryNumber: string;
  reference: string;
  dateRange: DateRange | undefined;
  datePreset: string;
}

type TabType = 'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange';

export default function JournalEntries() {
  const { t, language, direction } = useLanguage();
  const { companyId } = useCompany();
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<JournalEntryData | null>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<TabType>('journal');
  const [showFilters, setShowFilters] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for refetching

  // Edit mode state
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Marker Colors - using unified ColorMarkerPalette with fixed meanings
  const [selectedMarkerColor, setSelectedMarkerColor] = useState<MarkerColorId>('green');
  const [markedEntries, setMarkedEntries] = useState<Record<string, MarkerColorId>>({});


  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    entryType: 'all',
    status: 'all',
    origin: 'all',
    entryNumber: '',
    reference: '',
    dateRange: undefined, // No date filter by default - show all entries
    datePreset: 'all' // Default to All entries
  });


  // Entry Types
  const entryTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'journal', label: language === 'ar' ? 'قيد يومية' : 'Journal Entry' },
    { value: 'opening', label: language === 'ar' ? 'قيد افتتاحي' : 'Opening Entry' },
    { value: 'closing', label: language === 'ar' ? 'قيد إغلاق' : 'Closing Entry' },
    { value: 'receipt', label: language === 'ar' ? 'سند قبض' : 'Receipt Voucher' },
    { value: 'payment', label: language === 'ar' ? 'سند صرف' : 'Payment Voucher' },
    { value: 'sales', label: language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice' },
    { value: 'purchase', label: language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice' },
    { value: 'return', label: language === 'ar' ? 'مرتجع' : 'Return' },
    { value: 'asset', label: language === 'ar' ? 'أصل ثابت' : 'Fixed Asset' },
    { value: 'depreciation', label: language === 'ar' ? 'إهلاك' : 'Depreciation' },
    { value: 'expense', label: language === 'ar' ? 'مصروف' : 'Expense' },
    { value: 'payroll', label: language === 'ar' ? 'رواتب' : 'Payroll' },
    { value: 'adjustment', label: language === 'ar' ? 'تسوية' : 'Adjustment' },
    { value: 'mixed', label: language === 'ar' ? 'قيد مختلف' : 'Mixed Entry' },
  ];

  // Status Types
  const statusTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'posted', label: language === 'ar' ? 'مرحّل' : 'Posted' },
    { value: 'draft', label: language === 'ar' ? 'مسودة' : 'Draft' },
    { value: 'pending', label: language === 'ar' ? 'قيد المراجعة' : 'Pending' },
    { value: 'cancelled', label: language === 'ar' ? 'ملغي' : 'Cancelled' },
  ];

  // Origin Types
  const originTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'manual', label: language === 'ar' ? 'يدوي' : 'Manual' },
    { value: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales' },
    { value: 'purchases', label: language === 'ar' ? 'المشتريات' : 'Purchases' },
    { value: 'inventory', label: language === 'ar' ? 'المستودعات' : 'Inventory' },
    { value: 'payroll', label: language === 'ar' ? 'الرواتب' : 'Payroll' },
    { value: 'system', label: language === 'ar' ? 'النظام' : 'System' },
  ];

  // Date Presets
  const datePresets = [
    { value: 'all', label: language === 'ar' ? 'كل الفترات' : 'All Time' },
    { value: 'today', label: language === 'ar' ? 'اليوم' : 'Today' },
    { value: 'yesterday', label: language === 'ar' ? 'أمس' : 'Yesterday' },
    { value: 'thisWeek', label: language === 'ar' ? 'هذا الأسبوع' : 'This Week' },
    { value: 'lastWeek', label: language === 'ar' ? 'الأسبوع الماضي' : 'Last Week' },
    { value: 'thisMonth', label: language === 'ar' ? 'هذا الشهر' : 'This Month' },
    { value: 'lastMonth', label: language === 'ar' ? 'الشهر الماضي' : 'Last Month' },
    { value: 'thisYear', label: language === 'ar' ? 'هذه السنة' : 'This Year' },
    { value: 'lastYear', label: language === 'ar' ? 'السنة الماضية' : 'Last Year' },
    { value: 'custom', label: language === 'ar' ? 'تاريخ مخصص' : 'Custom Range' },
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getDateRangeFromPreset = (preset: string): DateRange | undefined => {
    const today = new Date();
    switch (preset) {
      case 'today':
        return { from: today, to: today };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { from: yesterday, to: yesterday };
      case 'thisWeek':
        return { from: startOfWeek(today, { weekStartsOn: 6 }), to: endOfWeek(today, { weekStartsOn: 6 }) };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 6 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 6 });
        return { from: lastWeekStart, to: lastWeekEnd };
      case 'thisMonth':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subDays(startOfMonth(today), 1));
        const lastMonthEnd = endOfMonth(subDays(startOfMonth(today), 1));
        return { from: lastMonthStart, to: lastMonthEnd };
      case 'thisYear':
        return { from: startOfYear(today), to: new Date() }; // Until now
      case 'lastYear':
        const lastYearStart = startOfYear(subDays(startOfYear(today), 1));
        const lastYearEnd = endOfMonth(subDays(startOfYear(today), 1));
        return { from: lastYearStart, to: lastYearEnd };
      case 'all':
        return undefined;
      default:
        return undefined;
    }
  };

  useEffect(() => {
    const fetchEntries = async () => {
      if (!companyId) return;

      setLoading(true);
      try {
        let query = supabase
          .from('journal_entries')
          .select(`
            *,
            lines:journal_entry_lines(
              id,
              account_id,
              description,
              debit,
              credit,
              account:chart_of_accounts(
                id,
                account_code,
                name_ar,
                name_en
              )
            )
          `)
          .eq('company_id', companyId)
          .order('entry_date', { ascending: false });

        // Apply filters
        if (filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        if (filters.entryType !== 'all') {
          query = query.eq('entry_type', filters.entryType);
        }

        if (filters.entryNumber) {
          query = query.ilike('entry_number', `%${filters.entryNumber}%`);
        }

        if (filters.reference) {
          query = query.ilike('reference', `%${filters.reference}%`);
        }

        if (filters.dateRange?.from) {
          query = query.gte('entry_date', format(filters.dateRange.from, 'yyyy-MM-dd'));
          if (filters.dateRange.to) {
            query = query.lte('entry_date', format(filters.dateRange.to, 'yyyy-MM-dd'));
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching journal entries:', error);
          setEntries([]);
        } else {
          // Transform data to match the expected format
          const transformedEntries = (data || []).map((entry: any) => {
            // Calculate totals from lines if not stored on entry
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
              origin: 'manual',
              marker_color: entry.marker_color || null,
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
          setEntries(transformedEntries);

          // Initialize markedEntries from database marker_color
          const markers: Record<string, MarkerColorId> = {};
          transformedEntries.forEach((entry: any) => {
            if (entry.marker_color) {
              markers[entry.id] = entry.marker_color;
            }
          });
          setMarkedEntries(markers);
        }
      } catch (error) {
        console.error('Error fetching journal entries:', error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [companyId, filters.status, filters.entryType, filters.dateRange, filters.entryNumber, filters.reference, refreshTrigger, language]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedData = useMemo(() => {
    let data = [...entries];

    // Apply Search Filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter((item) =>
        item.id.toLowerCase().includes(searchLower) ||
        item.voucherNo.toString().toLowerCase().includes(searchLower) ||
        item.reference.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.amount.toString().includes(searchLower)
      );
    }

    // Apply Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [entries, filters.search, sortConfig]);

  // Calculate Totals
  const totals = useMemo(() => {
    const totalDebit = filteredAndSortedData.reduce((sum, entry) => sum + (Number(entry.totalDebit) || 0), 0);
    const totalCredit = filteredAndSortedData.reduce((sum, entry) => sum + (Number(entry.totalCredit) || 0), 0);
    const postedCount = filteredAndSortedData.filter(e => e.status === 'posted').length;
    const draftCount = filteredAndSortedData.filter(e => e.status === 'draft').length;
    const pendingCount = filteredAndSortedData.filter(e => e.status === 'pending').length;

    return {
      totalDebit,
      totalCredit,
      count: filteredAndSortedData.length,
      postedCount,
      draftCount,
      pendingCount
    };
  }, [filteredAndSortedData]);

  const resetFilters = () => {
    setFilters({
      search: '',
      entryType: 'all',
      status: 'all',
      origin: 'all',
      entryNumber: '',
      reference: '',
      dateRange: {
        from: startOfWeek(new Date(), { weekStartsOn: 6 }),
        to: new Date()
      },
      datePreset: 'thisWeek'
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.entryType !== 'all' ||
      filters.status !== 'all' ||
      filters.origin !== 'all' ||
      filters.entryNumber !== '' ||
      filters.reference !== '' ||
      filters.datePreset !== 'all' // Default
    );
  }, [filters]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">{language === 'ar' ? 'مرحّل' : 'Posted'}</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">{language === 'ar' ? 'مسودة' : 'Draft'}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">{language === 'ar' ? 'معلّق' : 'Pending'}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200">{language === 'ar' ? 'ملغي' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'journal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'opening': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'payment': return 'bg-red-100 text-red-700 border-red-200';
      case 'receipt': return 'bg-green-100 text-green-700 border-green-200';
      case 'sales': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'purchase': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'expense': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'payroll': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'adjustment': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'mixed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleViewDetails = (entry: any) => {
    console.log('Opening Entry Details:', {
      id: entry.id,
      linesCount: entry.lines?.length,
      lines: entry.lines
    });
    setSelectedEntryForDetails(entry);
  };

  // Toggle marker for an entry - saves to database
  const toggleMarker = async (entryId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentColor = markedEntries[entryId];
    const newColor: MarkerColorId = currentColor === selectedMarkerColor ? null : selectedMarkerColor;

    // Update local state immediately for responsive UI
    setMarkedEntries(prev => {
      const newMarked = { ...prev };
      if (newColor === null) {
        delete newMarked[entryId];
      } else {
        newMarked[entryId] = newColor;
      }
      return newMarked;
    });

    // Save to Supabase - PERSIST to database
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ marker_color: newColor })
        .eq('id', entryId);

      if (error) {
        console.error('Error saving marker:', error);
      }
    } catch (err) {
      console.error('Error saving marker:', err);
    }
  };

  // Get background color for marked entry - using new unified system
  const getMarkerBg = (entryId: string): string => {
    const colorId = markedEntries[entryId];
    return colorId ? (getMarkerBackgroundColor(colorId) || '') : '';
  };

  const renderSortableHeader = (label: string, key: string) => (
    <span
      className="cursor-pointer hover:text-erp-navy flex items-center gap-1"
      onClick={() => handleSort(key)}
    >
      {label}
      {sortConfig?.key === key ? (
        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 text-gray-300" />
      )}
    </span>
  );

  const setActiveViewTab = (value: string) => {
    // Handle tab change logic if needed
  };

  return (
    <div className="space-y-4 p-4 lg:p-6 pb-20 max-w-[1600px] mx-auto relative min-h-screen" dir={direction}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{t('accounting.journalEntries')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('accounting.manageEntries')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Marker Colors Palette - with help icon */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-medium text-slate-500 px-2 hidden sm:inline-block">
              {language === 'ar' ? 'التعليم:' : 'Mark:'}
            </span>

            <ColorMarkerPalette
              selectedColor={selectedMarkerColor}
              onColorSelect={setSelectedMarkerColor}
              size="sm"
              showClear={false}
              showHelp={true}
            />

            <Separator orientation="vertical" className="h-5" />

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:text-red-600"
              onClick={() => setMarkedEntries({})}
              disabled={Object.keys(markedEntries).length === 0}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {language === 'ar' ? 'مسح الكل' : 'Clear All'}
            </Button>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImportWizard(true)}>
            <Upload className="w-4 h-4" />
            {t('common.import')}
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDefaultTab('transfer'); setIsNewEntryOpen(true); }}>
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            {t('accounting.transfer')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDefaultTab('exchange'); setIsNewEntryOpen(true); }}>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            {t('accounting.exchange')}
          </Button>
          <Button size="sm" className="bg-erp-teal hover:bg-erp-teal/90 text-white gap-1.5" onClick={() => { setDefaultTab('journal'); setIsNewEntryOpen(true); }}>
            <Plus className="w-3.5 h-3.5" />
            {t('accounting.journalEntry')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="journal_entries" className="w-full" onValueChange={setActiveViewTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="journal_entries">{t('accounting.manualEntries') || 'Manual Entries'}</TabsTrigger>
          <TabsTrigger value="automatic_entries">{t('accounting.automaticEntries') || 'Automatic Entries'}</TabsTrigger>
        </TabsList>

        <TabsContent value="journal_entries" className="space-y-4">


          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 scale-95 origin-top-left -mb-2">
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('accounting.totalDebit')}</span>
                <div className="text-xl font-bold font-mono text-erp-teal">
                  {formatCurrency(totals.totalDebit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('accounting.totalCredit')}</span>
                <div className="text-xl font-bold font-mono text-erp-indigo">
                  {formatCurrency(totals.totalCredit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('accounting.netMovement')}</span>
                <div className={cn("text-xl font-bold font-mono", totals.totalDebit - totals.totalCredit === 0 ? "text-slate-600" : "text-amber-600")}>
                  {formatCurrency(totals.totalDebit - totals.totalCredit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('accounting.entriesCount')}</span>
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-200">{totals.count}</div>
                  <div className="flex gap-1">
                    {totals.postedCount > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700 h-5 px-1.5 text-[10px]">{totals.postedCount} posted</Badge>}
                    {totals.draftCount > 0 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 h-5 px-1.5 text-[10px]">{totals.draftCount} draft</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <NexaDataTable
              data={filteredAndSortedData}
              columns={(() => {
                // Define all columns
                const debitCol = {
                  accessorKey: 'totalDebit',
                  header: language === 'ar' ? 'المدين' : 'Debit',
                  size: 120,
                  cell: ({ getValue }: any) => (
                    <span className="font-mono font-bold text-green-600">{formatCurrency(Number(getValue()) || 0)}</span>
                  )
                };

                const creditCol = {
                  accessorKey: 'totalCredit',
                  header: language === 'ar' ? 'الدائن' : 'Credit',
                  size: 120,
                  cell: ({ getValue }: any) => (
                    <span className="font-mono font-bold text-red-600">{formatCurrency(Number(getValue()) || 0)}</span>
                  )
                };

                const descriptionCol = {
                  accessorKey: 'description',
                  header: language === 'ar' ? 'البيان' : 'Description',
                  size: 250,
                  cell: ({ row }: any) => (
                    <div className="max-w-[250px] truncate" title={row.original.description}>
                      {row.original.description}
                      {row.original.lines?.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {row.original.lines[0].account_name} {row.original.lines.length > 1 ? `+ ${row.original.lines.length - 1} ${language === 'ar' ? 'آخرين' : 'more'}` : ''}
                        </div>
                      )}
                    </div>
                  )
                };

                const dateCol = {
                  accessorKey: 'date',
                  header: language === 'ar' ? 'التاريخ' : 'Date',
                  size: 100,
                  cell: ({ getValue }: any) => (
                    <span className="text-slate-600 dark:text-slate-400">{format(new Date(getValue() as string), 'dd/MM/yyyy')}</span>
                  )
                };

                const typeCol = {
                  accessorKey: 'type',
                  header: language === 'ar' ? 'النوع' : 'Type',
                  size: 110,
                  cell: ({ row }: any) => (
                    <Badge variant="outline" className={cn("font-medium border shadow-sm text-xs", getTypeStyle(row.original.type))}>
                      {entryTypes.find(t => t.value === row.original.type)?.label || row.original.type}
                    </Badge>
                  )
                };

                const voucherNoCol = {
                  accessorKey: 'voucherNo',
                  header: language === 'ar' ? 'رقم القيد' : 'Entry #',
                  size: 90,
                  cell: ({ getValue }: any) => <span className="font-mono font-medium">{getValue() as string}</span>
                };

                const statusCol = {
                  accessorKey: 'status',
                  header: language === 'ar' ? 'الحالة' : 'Status',
                  size: 90,
                  cell: ({ getValue }: any) => getStatusBadge(getValue() as string)
                };

                const costCenterCol = {
                  accessorKey: 'costCenter',
                  header: language === 'ar' ? 'م.التكلفة' : 'Cost Ctr',
                  size: 80,
                  enableHiding: true, // Can be hidden by user
                  cell: ({ getValue }: any) => (
                    <span className="text-xs text-slate-500">{getValue() ? getValue() : '-'}</span>
                  )
                };

                // Optional/Hideable columns
                const referenceCol = {
                  accessorKey: 'reference',
                  header: language === 'ar' ? 'المرجع' : 'Reference',
                  size: 100,
                  enableHiding: true,
                  cell: ({ getValue }: any) => (
                    <span className="text-xs text-slate-600 font-mono">{getValue() || '-'}</span>
                  )
                };

                const createdByCol = {
                  accessorKey: 'createdBy',
                  header: language === 'ar' ? 'المنشئ' : 'Created By',
                  size: 100,
                  enableHiding: true,
                  cell: ({ getValue }: any) => (
                    <span className="text-xs text-slate-500">{getValue() || '-'}</span>
                  )
                };

                const originCol = {
                  accessorKey: 'origin',
                  header: language === 'ar' ? 'الأصل' : 'Origin',
                  size: 80,
                  enableHiding: true,
                  cell: ({ getValue }: any) => (
                    <Badge variant="outline" className="text-[10px]">
                      {getValue() === 'manual' ? (language === 'ar' ? 'يدوي' : 'Manual') : (language === 'ar' ? 'تلقائي' : 'Auto')}
                    </Badge>
                  )
                };

                // RTL order (Arabic): # → Debit → Credit → Description → Date → Type → Entry# → Status → CostCenter → [Hideable: Reference, CreatedBy, Origin]
                // LTR order (English): [Hideable: Origin, CreatedBy, Reference] → CostCenter → Status → Entry# → Type → Date → Description → Credit → Debit → #
                const rtlColumns = [debitCol, creditCol, descriptionCol, dateCol, typeCol, voucherNoCol, statusCol, costCenterCol, referenceCol, createdByCol, originCol];
                const ltrColumns = [originCol, createdByCol, referenceCol, costCenterCol, statusCol, voucherNoCol, typeCol, dateCol, descriptionCol, creditCol, debitCol];

                return (direction === 'rtl' ? rtlColumns : ltrColumns);
              })() as ColumnDef<any>[]}
              isRTL={direction === 'rtl'}
              enableMarker={true}
              enableSequenceNumber={true}
              enableColumnResizing={true}
              enableColumnVisibility={true}
              persistKey="journal-entries-table"
              enableSearch={false}
              enableExport={true}
              enablePagination={false}
              enableExcelMode={true}
              maxHeight="calc(100vh - 400px)"
              showTotalsFooter={true}
              debitKey="totalDebit"
              creditKey="totalCredit"
              emptyMessage={language === 'ar' ? 'لا توجد قيود مطابقة' : 'No matching entries'}
              onRowClick={(row) => handleViewDetails(row)}
              getRowId={(row) => row.id}
              getRowMarker={(row) => markedEntries[row.id]}
              onMarkerChange={(rowId, color) => {
                setMarkedEntries(prev => {
                  if (color) {
                    return { ...prev, [rowId]: color };
                  } else {
                    const newMarked = { ...prev };
                    delete newMarked[rowId];
                    return newMarked;
                  }
                });
                // Save to database
                supabase
                  .from('journal_entries')
                  .update({ marker_color: color || null })
                  .eq('id', rowId)
                  .then(({ error }) => {
                    if (error) console.error('Error saving marker:', error);
                  });
              }}
              exportTitle={language === 'ar' ? 'القيود اليومية' : 'Journal Entries'}
              exportFilename={`journal-entries-${format(new Date(), 'yyyy-MM-dd')}`}
            />
          </div>
        </TabsContent>

        <TabsContent value="automatic_entries">
          <AutomaticEntriesTab onViewDetails={handleViewDetails} />
        </TabsContent>
      </Tabs>

      <NewJournalEntrySheet
        open={isNewEntryOpen}
        onOpenChange={(open) => {
          setIsNewEntryOpen(open);
          if (!open) {
            setIsEditMode(false);
            setEditEntryId(null);
          }
        }}
        defaultTab={defaultTab}
        editMode={isEditMode}
        entryId={editEntryId}
        onUpdate={() => {
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Journal Entry Details Sheet - Universal */}
      <UniversalDetailSheet
        isOpen={!!selectedEntryForDetails}
        onClose={() => setSelectedEntryForDetails(null)}
        docType="journal_entry"
        data={selectedEntryForDetails}
      />

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          defaultEntityType="journal_entries"
          onClose={() => setShowImportWizard(false)}
          onComplete={() => {
            setShowImportWizard(false);
            // Refresh entries
            if (companyId) {
              setLoading(true);
              // Will trigger re-fetch via useEffect
            }
          }}
        />
      )}
    </div>
  );
}
