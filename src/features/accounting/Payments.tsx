import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  Printer
} from 'lucide-react';
import NewJournalEntrySheet from './components/NewJournalEntrySheet';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import JournalEntryDetailsView from './JournalEntryDetailsView';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

// Reconciliation Colors - Same as GeneralLedgerPage
const RECONCILIATION_COLORS = [
  { id: 'none', color: 'transparent', bg: 'bg-transparent', label: 'بدون', labelEn: 'None' },
  { id: 'green', color: '#22c55e', bg: 'bg-green-100', label: 'أخضر', labelEn: 'Green' },
  { id: 'red', color: '#ef4444', bg: 'bg-red-100', label: 'أحمر', labelEn: 'Red' },
  { id: 'yellow', color: '#eab308', bg: 'bg-yellow-100', label: 'أصفر', labelEn: 'Yellow' },
  { id: 'blue', color: '#3b82f6', bg: 'bg-blue-100', label: 'أزرق', labelEn: 'Blue' },
  { id: 'purple', color: '#a855f7', bg: 'bg-purple-100', label: 'بنفسجي', labelEn: 'Purple' },
  { id: 'orange', color: '#f97316', bg: 'bg-orange-100', label: 'برتقالي', labelEn: 'Orange' },
  { id: 'gray', color: '#6b7280', bg: 'bg-gray-200', label: 'رمادي', labelEn: 'Gray' },
  { id: 'pink', color: '#ec4899', bg: 'bg-pink-100', label: 'وردي', labelEn: 'Pink' },
  { id: 'cyan', color: '#06b6d4', bg: 'bg-cyan-100', label: 'سماوي', labelEn: 'Cyan' },
];

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

export default function Payments() {
  const { t, language, direction } = useLanguage();
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<any>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<TabType>('payment');
  const [showFilters, setShowFilters] = useState(false);
  
  // Reconciliation
  const [selectedReconciliationColor, setSelectedReconciliationColor] = useState<string>('green');
  const [markedPayments, setMarkedPayments] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    entryType: 'all',
    status: 'all',
    origin: 'all',
    entryNumber: '',
    reference: '',
    dateRange: undefined,
    datePreset: 'all'
  });

  // Entry Types
  const entryTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'receipt', label: language === 'ar' ? 'مقبوضات' : 'Receipts' },
    { value: 'payment', label: language === 'ar' ? 'مدفوعات' : 'Payments' },
    { value: 'cash', label: language === 'ar' ? 'يومية الصندوق' : 'Cash Journal' },
    { value: 'sales', label: language === 'ar' ? 'قيد مبيعات' : 'Sales Entry' },
    { value: 'purchase', label: language === 'ar' ? 'قيد مشتريات' : 'Purchase Entry' },
    { value: 'expense', label: language === 'ar' ? 'قيد مصروفات' : 'Expense Entry' },
    { value: 'payroll', label: language === 'ar' ? 'قيد رواتب' : 'Payroll Entry' },
    { value: 'adjustment', label: language === 'ar' ? 'قيد تسوية' : 'Adjustment Entry' },
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
    { value: 'last7Days', label: language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days' },
    { value: 'last30Days', label: language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days' },
    { value: 'last90Days', label: language === 'ar' ? 'آخر 90 يوم' : 'Last 90 Days' },
    { value: 'thisYear', label: language === 'ar' ? 'هذه السنة' : 'This Year' },
    { value: 'custom', label: language === 'ar' ? 'فترة مخصصة' : 'Custom Range' },
  ];

  const getDateRangeFromPreset = (preset: string): DateRange | undefined => {
    const today = new Date();
    switch (preset) {
      case 'today':
        return { from: today, to: today };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { from: yesterday, to: yesterday };
      case 'thisWeek':
        return { from: startOfWeek(today, { weekStartsOn: 0 }), to: endOfWeek(today, { weekStartsOn: 0 }) };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 0 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 0 });
        return { from: lastWeekStart, to: lastWeekEnd };
      case 'thisMonth':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(today), 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'last7Days':
        return { from: subDays(today, 7), to: today };
      case 'last30Days':
        return { from: subDays(today, 30), to: today };
      case 'last90Days':
        return { from: subDays(today, 90), to: today };
      case 'thisYear':
        return { from: startOfYear(today), to: today };
      default:
        return undefined;
    }
  };

  const handleDatePresetChange = (preset: string) => {
    setFilters(prev => ({
      ...prev,
      datePreset: preset,
      dateRange: preset === 'custom' ? prev.dateRange : getDateRangeFromPreset(preset)
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      entryType: 'all',
      status: 'all',
      origin: 'all',
      entryNumber: '',
      reference: '',
      dateRange: undefined,
      datePreset: 'all'
    });
  };

  const hasActiveFilters = filters.search || filters.entryType !== 'all' || filters.status !== 'all' || 
    filters.origin !== 'all' || filters.entryNumber || filters.reference || filters.dateRange;

  // Mock Data with enhanced entry types and lines
  const entries = [
    { 
      id: 'JV-2024-001', 
      date: '2024-03-20', 
      reference: 'REF-001', 
      description: 'Office Rent Payment', 
      amount: 5000, 
      status: 'posted', 
      createdBy: 'Ahmed Mohamed',
      type: 'expense',
      origin: 'manual',
      lines: [
        { id: 1, account: '5010 - إيجار المكتب', description: 'إيجار شهر مارس', debit: 5000, credit: 0, product: null },
        { id: 2, account: '1010 - الصندوق', description: 'سداد نقدي', debit: 0, credit: 5000, product: null },
      ]
    },
    { 
      id: 'JV-2024-002', 
      date: '2024-03-19', 
      reference: 'INV-001', 
      description: 'فاتورة مبيعات - لابتوب HP', 
      amount: 12500, 
      status: 'posted', 
      createdBy: 'Sarah Ali',
      type: 'sales',
      origin: 'sales',
      lines: [
        { id: 1, account: '1200 - المدينون', description: 'مبيعات آجلة', debit: 12500, credit: 0, product: { code: 'PRD-001', name: 'لابتوب HP ProBook' } },
        { id: 2, account: '4010 - إيرادات المبيعات', description: 'مبيعات بضاعة', debit: 0, credit: 10869.57, product: { code: 'PRD-001', name: 'لابتوب HP ProBook' } },
        { id: 3, account: '2210 - ضريبة القيمة المضافة', description: 'ضريبة 15%', debit: 0, credit: 1630.43, product: null },
      ]
    },
    { 
      id: 'JV-2024-003', 
      date: '2024-03-18', 
      reference: 'EXP-042', 
      description: 'Office Supplies', 
      amount: 450, 
      status: 'draft', 
      createdBy: 'Ahmed Mohamed',
      type: 'expense',
      origin: 'manual',
      lines: [
        { id: 1, account: '5020 - مصروفات مكتبية', description: 'أدوات مكتبية', debit: 450, credit: 0, product: { code: 'SUP-001', name: 'أدوات مكتبية متنوعة' } },
        { id: 2, account: '1010 - الصندوق', description: 'دفع نقدي', debit: 0, credit: 450, product: null },
      ]
    },
    { 
      id: 'JV-2024-004', 
      date: '2024-03-18', 
      reference: 'INV-002', 
      description: 'خدمات استشارية', 
      amount: 3000, 
      status: 'posted', 
      createdBy: 'Khaled Omar',
      type: 'receipt',
      origin: 'sales',
      lines: [
        { id: 1, account: '1010 - الصندوق', description: 'تحصيل نقدي', debit: 3000, credit: 0, product: null },
        { id: 2, account: '4020 - إيرادات الخدمات', description: 'خدمات استشارية', debit: 0, credit: 2608.70, product: null },
        { id: 3, account: '2210 - ضريبة القيمة المضافة', description: 'ضريبة 15%', debit: 0, credit: 391.30, product: null },
      ]
    },
    { 
      id: 'JV-2024-005', 
      date: '2024-03-17', 
      reference: 'BILL-103', 
      description: 'فاتورة انترنت', 
      amount: 120, 
      status: 'posted', 
      createdBy: 'Sarah Ali',
      type: 'payment',
      origin: 'purchases',
      lines: [
        { id: 1, account: '5030 - مصروفات الاتصالات', description: 'انترنت شهر مارس', debit: 120, credit: 0, product: null },
        { id: 2, account: '2010 - الدائنون', description: 'مستحق STC', debit: 0, credit: 120, product: null },
      ]
    },
    { 
      id: 'JV-2024-006', 
      date: '2024-03-16', 
      reference: 'SALARY-03', 
      description: 'رواتب مارس', 
      amount: 45000, 
      status: 'posted', 
      createdBy: 'System',
      type: 'payroll',
      origin: 'payroll',
      lines: [
        { id: 1, account: '5100 - الرواتب والأجور', description: 'رواتب الموظفين', debit: 45000, credit: 0, product: null },
        { id: 2, account: '1010 - الصندوق', description: 'صرف الرواتب', debit: 0, credit: 45000, product: null },
      ]
    },
    { 
      id: 'JV-2024-007', 
      date: '2024-03-15', 
      reference: 'DEP-001', 
      description: 'إهلاك الأصول الثابتة', 
      amount: 1200, 
      status: 'draft', 
      createdBy: 'System',
      type: 'adjustment',
      origin: 'system',
      lines: [
        { id: 1, account: '5200 - مصروف الإهلاك', description: 'إهلاك شهري', debit: 1200, credit: 0, product: null },
        { id: 2, account: '1520 - مجمع الإهلاك', description: 'مجمع إهلاك الأصول', debit: 0, credit: 1200, product: null },
      ]
    },
    { 
      id: 'JV-2024-008', 
      date: '2024-03-14', 
      reference: 'CASH-001', 
      description: 'تحصيل نقدي من العميل', 
      amount: 8500, 
      status: 'posted', 
      createdBy: 'Ahmed Mohamed',
      type: 'cash',
      origin: 'manual',
      lines: [
        { id: 1, account: '1010 - الصندوق', description: 'تحصيل نقدي', debit: 8500, credit: 0, product: null },
        { id: 2, account: '1200 - المدينون', description: 'تسوية ذمة عميل', debit: 0, credit: 8500, product: null },
      ]
    },
    { 
      id: 'JV-2024-009', 
      date: '2024-03-13', 
      reference: 'PO-055', 
      description: 'شراء بضاعة', 
      amount: 25000, 
      status: 'posted', 
      createdBy: 'Khaled Omar',
      type: 'purchase',
      origin: 'purchases',
      lines: [
        { id: 1, account: '1300 - المخزون', description: 'شراء بضاعة', debit: 25000, credit: 0, product: null },
        { id: 2, account: '2010 - الدائنون', description: 'مستحق للمورد', debit: 0, credit: 25000, product: null },
      ]
    },
    { 
      id: 'JV-2024-010', 
      date: '2024-03-12', 
      reference: 'MIX-001', 
      description: 'قيد تسوية مختلف', 
      amount: 3500, 
      status: 'pending', 
      createdBy: 'Sarah Ali',
      type: 'mixed',
      origin: 'manual',
      lines: [
        { id: 1, account: '5050 - مصروفات متنوعة', description: 'مصروفات إدارية', debit: 2000, credit: 0, product: null },
        { id: 2, account: '5060 - مصروفات تسويق', description: 'إعلانات', debit: 1500, credit: 0, product: null },
        { id: 3, account: '1010 - الصندوق', description: 'سداد نقدي', debit: 0, credit: 3500, product: null },
      ]
    },
  ];

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
    // Filter only payments
    let data = entries.filter((item) => item.type === 'payment');

    // Apply Search Filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter((item) => 
        item.id.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.reference.toLowerCase().includes(searchLower) ||
        item.createdBy.toLowerCase().includes(searchLower)
      );
    }

    // Apply Status Filter
    if (filters.status && filters.status !== 'all') {
      data = data.filter((item) => item.status === filters.status);
    }

    // Apply Origin Filter
    if (filters.origin && filters.origin !== 'all') {
      data = data.filter((item) => item.origin === filters.origin);
    }

    // Apply Entry Number Filter
    if (filters.entryNumber) {
      data = data.filter((item) => 
        item.id.toLowerCase().includes(filters.entryNumber.toLowerCase())
      );
    }

    // Apply Reference Filter
    if (filters.reference) {
      data = data.filter((item) => 
        item.reference.toLowerCase().includes(filters.reference.toLowerCase())
      );
    }

    // Apply Date Range Filter
    if (filters.dateRange?.from) {
      data = data.filter((item) => {
        const itemDate = new Date(item.date);
        if (filters.dateRange?.from && filters.dateRange?.to) {
          return itemDate >= filters.dateRange.from && itemDate <= filters.dateRange.to;
        } else if (filters.dateRange?.from) {
          return itemDate >= filters.dateRange.from;
        }
        return true;
      });
    }

    // Apply Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [filters, sortConfig, entries]);

  const getEntryTypeLabel = (type: string) => {
    const found = entryTypes.find(t => t.value === type);
    return found?.label || type;
  };

  const getEntryTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'receipt': return 'bg-green-100 text-green-700 border-green-200';
      case 'payment': return 'bg-red-100 text-red-700 border-red-200';
      case 'cash': return 'bg-blue-100 text-blue-700 border-blue-200';
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
    setSelectedEntryForDetails(entry);
  };

  // Toggle reconciliation mark for an entry
  const toggleReconciliationMark = (entryId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedPayments(prev => {
      const newMarked = { ...prev };
      if (newMarked[entryId] === selectedReconciliationColor) {
        // If same color, remove mark
        delete newMarked[entryId];
      } else {
        // Set new color
        newMarked[entryId] = selectedReconciliationColor;
      }
      return newMarked;
    });
  };

  // Get background class for marked entry
  const getReconciliationBg = (entryId: string) => {
    const colorId = markedPayments[entryId];
    if (!colorId) return '';
    const color = RECONCILIATION_COLORS.find(c => c.id === colorId);
    return color?.bg || '';
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

  // Calculate totals for summary
  const totals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, entry) => {
      // Calculate total debit and credit from entry lines
      const entryDebit = entry.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || entry.amount;
      const entryCredit = entry.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || entry.amount;
      
      return {
        totalDebit: acc.totalDebit + entryDebit,
        totalCredit: acc.totalCredit + entryCredit,
        count: acc.count + 1,
        postedCount: acc.postedCount + (entry.status === 'posted' ? 1 : 0),
        draftCount: acc.draftCount + (entry.status === 'draft' ? 1 : 0),
        pendingCount: acc.pendingCount + (entry.status === 'pending' ? 1 : 0),
      };
    }, { totalDebit: 0, totalCredit: 0, count: 0, postedCount: 0, draftCount: 0, pendingCount: 0 });
  }, [filteredAndSortedData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">{t('accounting.payments')}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-erp-teal hover:bg-erp-teal/90 text-white gap-1.5" onClick={() => { setDefaultTab('payment'); setIsNewEntryOpen(true); }}>
            <Plus className="w-3.5 h-3.5" />
            {t('accounting.payment.title') || 'إضافة مدفوعات'}
          </Button>
        </div>
      </div>

      {/* Summary Stats Bar - Same style as General Ledger */}
      <div className="flex items-center gap-6 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b shrink-0">
        {/* Total Payments */}
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <span className="text-xs text-gray-500">{language === 'ar' ? 'عدد المدفوعات' : 'Payments'}:</span>
          <span className="font-mono font-bold text-base text-blue-600">{totals.count}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />

        {/* Total Debit */}
        <div className="flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-green-500" />
          <span className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}:</span>
          <span className="font-mono font-bold text-base text-green-600">{totals.totalDebit.toLocaleString()}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />

        {/* Total Credit */}
        <div className="flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-rose-500" />
          <span className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}:</span>
          <span className="font-mono font-bold text-base text-rose-600">{totals.totalCredit.toLocaleString()}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />

        {/* Posted Count */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          <span className="text-xs text-gray-500">{language === 'ar' ? 'مرحّل' : 'Posted'}:</span>
          <span className="font-mono font-bold text-base text-green-600">{totals.postedCount}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />

        {/* Draft Count */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{language === 'ar' ? 'مسودات' : 'Drafts'}:</span>
          <span className="font-mono font-bold text-base text-amber-600">{totals.draftCount}</span>
        </div>

        <span className="text-[10px] text-gray-400 mr-auto">SAR</span>

        {/* Export */}
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {t('export')}
        </Button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Search and Filter Row */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <Input 
                placeholder={language === 'ar' ? 'بحث في القيود...' : 'Search entries...'} 
                className={`${direction === 'rtl' ? 'pr-9' : 'pl-9'} h-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant={showFilters ? "default" : "outline"} 
                size="sm"
                className={`gap-1.5 ${showFilters ? 'bg-erp-navy' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-3.5 h-3.5" />
                {language === 'ar' ? 'فلترة' : 'Filter'}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="bg-erp-teal text-white text-[10px] h-4 px-1">
                    {Object.values(filters).filter(v => v && v !== 'all').length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1 text-gray-500 hover:text-red-600" onClick={resetFilters}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
              )}
              
              {/* Reconciliation Colors */}
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 px-2.5">
                    <Palette className="w-3.5 h-3.5" />
                    <div 
                      className="w-3.5 h-3.5 rounded-full border"
                      style={{ backgroundColor: RECONCILIATION_COLORS.find(c => c.id === selectedReconciliationColor)?.color }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="flex gap-2">
                    {RECONCILIATION_COLORS.slice(1).map((color) => (
                      <button
                        key={color.id}
                        onClick={() => {
                          setSelectedReconciliationColor(color.id);
                          setShowColorPicker(false);
                        }}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                          selectedReconciliationColor === color.id 
                            ? "ring-2 ring-offset-2 ring-erp-navy scale-110" 
                            : "border-gray-300"
                        )}
                        style={{ backgroundColor: color.color }}
                        title={language === 'ar' ? color.label : color.labelEn}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {/* Export Buttons */}
              <Button variant="outline" size="sm" className="h-9 px-2.5" title={language === 'ar' ? 'جداول غوغل' : 'Google Sheets'}>
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-2.5" title="PDF">
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-2.5" title={language === 'ar' ? 'طباعة' : 'Print'}>
                <Printer className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-md p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              {/* Filters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {/* Entry Type */}
                <Select value={filters.entryType} onValueChange={(v) => setFilters(prev => ({ ...prev, entryType: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900">
                    <SelectValue placeholder={language === 'ar' ? 'النوع' : 'Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {entryTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900">
                    <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTypes.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Origin */}
                <Select value={filters.origin} onValueChange={(v) => setFilters(prev => ({ ...prev, origin: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900">
                    <SelectValue placeholder={language === 'ar' ? 'المنشأ' : 'Origin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {originTypes.map(origin => (
                      <SelectItem key={origin.value} value={origin.value}>{origin.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Preset */}
                <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900">
                    <SelectValue placeholder={language === 'ar' ? 'الفترة' : 'Period'} />
                  </SelectTrigger>
                  <SelectContent>
                    {datePresets.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Entry Number */}
                <Input 
                  placeholder={language === 'ar' ? 'رقم القيد' : 'Entry #'}
                  value={filters.entryNumber}
                  onChange={(e) => setFilters(prev => ({ ...prev, entryNumber: e.target.value }))}
                  className="h-8 text-xs bg-white dark:bg-gray-900"
                />

                {/* Reference */}
                <Input 
                  placeholder={language === 'ar' ? 'المرجع' : 'Reference'}
                  value={filters.reference}
                  onChange={(e) => setFilters(prev => ({ ...prev, reference: e.target.value }))}
                  className="h-8 text-xs bg-white dark:bg-gray-900"
                />
              </div>

              {/* Custom Date Range (only shown when custom is selected) */}
              {filters.datePreset === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs justify-start text-left font-normal bg-white dark:bg-gray-900">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "yyyy/MM/dd", { locale: language === 'ar' ? ar : undefined })} -{" "}
                            {format(filters.dateRange.to, "yyyy/MM/dd", { locale: language === 'ar' ? ar : undefined })}
                          </>
                        ) : (
                          format(filters.dateRange.from, "yyyy/MM/dd", { locale: language === 'ar' ? ar : undefined })
                        )
                      ) : (
                        <span className="text-gray-500">{language === 'ar' ? 'اختر الفترة' : 'Pick range'}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange?.from}
                      selected={filters.dateRange}
                      onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Active Filters - Compact */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1">
                  {filters.entryType !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                      {entryTypes.find(t => t.value === filters.entryType)?.label}
                      <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, entryType: 'all' }))} />
                    </Badge>
                  )}
                  {filters.status !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                      {statusTypes.find(s => s.value === filters.status)?.label}
                      <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))} />
                    </Badge>
                  )}
                  {filters.origin !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                      {originTypes.find(o => o.value === filters.origin)?.label}
                      <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, origin: 'all' }))} />
                    </Badge>
                  )}
                  {filters.entryNumber && (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                      #{filters.entryNumber}
                      <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, entryNumber: '' }))} />
                    </Badge>
                  )}
                  {filters.reference && (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                      {filters.reference}
                      <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, reference: '' }))} />
                    </Badge>
                  )}
                  {filters.dateRange?.from && (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                      {datePresets.find(p => p.value === filters.datePreset)?.label}
                      <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, dateRange: undefined, datePreset: 'all' }))} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table - Same style as GeneralLedgerPage */}
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
        <Table className="border-collapse w-full">
          <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
            <TableRow className="h-12 border-b-2 border-slate-300 dark:border-slate-600">
              <TableHead className="w-[40px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">✓</TableHead>
              <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
              <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
              <TableHead className="w-[80px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'المرجع' : 'Ref'}</TableHead>
              <TableHead className="min-w-[180px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{renderSortableHeader(t('description'), 'description')}</TableHead>
              <TableHead className="w-[60px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
              <TableHead className="w-[100px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{renderSortableHeader(language === 'ar' ? 'رقم القيد' : 'Entry #', 'id')}</TableHead>
              <TableHead className="w-[90px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">{renderSortableHeader(t('date'), 'date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((entry, index) => {
                // Calculate debit/credit from lines
                const entryDebit = entry.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || entry.amount;
                const entryCredit = entry.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || entry.amount;
                
                return (
                  <TableRow 
                    key={entry.id}
                    onClick={() => handleViewDetails(entry)}
                    className={cn(
                      "h-12 hover:bg-blue-50/80 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150",
                      index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-800/50",
                      getReconciliationBg(entry.id)
                    )}
                  >
                    <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                      <Checkbox
                        checked={!!markedPayments[entry.id]}
                        onCheckedChange={() => toggleReconciliationMark(entry.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "w-4 h-4",
                          markedPayments[entry.id] && "border-2"
                        )}
                        style={{
                          borderColor: markedPayments[entry.id] 
                            ? RECONCILIATION_COLORS.find(c => c.id === markedPayments[entry.id])?.color 
                            : undefined,
                          backgroundColor: markedPayments[entry.id] 
                            ? RECONCILIATION_COLORS.find(c => c.id === markedPayments[entry.id])?.color 
                            : undefined,
                        }}
                      />
                    </TableCell>
                    <TableCell className={`text-center text-sm font-mono border border-slate-200 dark:border-slate-700 px-3 py-2.5 ${entryDebit > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {entryDebit > 0 ? entryDebit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-center text-sm font-mono border border-slate-200 dark:border-slate-700 px-3 py-2.5 ${entryCredit > 0 ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                      {entryCredit > 0 ? entryCredit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-2.5">{entry.reference}</TableCell>
                    <TableCell className="truncate max-w-[180px] text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5" title={entry.description}>{entry.description}</TableCell>
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-center">
                      <Badge className={`text-xs font-medium px-2.5 py-1 ${getEntryTypeBadgeColor(entry.type)}`}>
                        {getEntryTypeLabel(entry.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-blue-600 border border-slate-200 dark:border-slate-700 px-3 py-2.5">{entry.id}</TableCell>
                    <TableCell className="text-sm font-mono text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">{entry.date}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-300" />
                    <p className="text-sm">{language === 'ar' ? 'لا توجد مدفوعات مطابقة' : 'No matching payments'}</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={resetFilters} className="text-erp-teal">
                        {language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {/* Fixed Footer with Totals - Aligned to columns */}
        <div className="shrink-0 border-t-2 border-erp-navy bg-erp-navy text-white">
          <div className="grid grid-cols-[40px_100px_100px_80px_minmax(180px,1fr)_60px_100px_90px] gap-0 py-2">
            <div className="text-center border-l border-gray-600 px-2">
              <span className="font-mono font-bold text-sm">{Object.keys(markedPayments).length}</span>
            </div>
            <div className="text-center border-l border-gray-600 px-2">
              <span className="font-mono font-bold text-green-300">{totals.totalDebit.toLocaleString()}</span>
            </div>
            <div className="text-center border-l border-gray-600 px-2">
              <span className="font-mono font-bold text-rose-300">{totals.totalCredit.toLocaleString()}</span>
            </div>
            <div className="border-l border-gray-600 px-2"></div>
            <div className="border-l border-gray-600 px-3">
              <span className="text-xs text-gray-400">
                {language === 'ar' 
                  ? `${totals.postedCount} مرحّل • ${totals.draftCount} مسودة • ${totals.pendingCount} معلّق`
                  : `${totals.postedCount} posted • ${totals.draftCount} draft • ${totals.pendingCount} pending`
                }
              </span>
            </div>
            <div className="border-l border-gray-600 px-2"></div>
            <div className="border-l border-gray-600 px-2">
              <span className="text-[10px] text-gray-300">{language === 'ar' ? 'عدد:' : 'Count:'}</span>
              <span className="font-mono font-bold text-sm mr-1">{filteredAndSortedData.length}</span>
            </div>
            <div className="px-2">
              <span className={`font-mono font-bold text-sm ${totals.totalDebit === totals.totalCredit ? 'text-green-300' : 'text-amber-300'}`}>
                {totals.totalDebit === totals.totalCredit ? '✓' : (totals.totalDebit - totals.totalCredit).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <NewJournalEntrySheet 
        open={isNewEntryOpen} 
        onOpenChange={setIsNewEntryOpen} 
        defaultTab={defaultTab}
      />

      {/* Journal Entry Details Sheet */}
      {selectedEntryForDetails && (
        <Sheet open={!!selectedEntryForDetails} onOpenChange={(open) => !open && setSelectedEntryForDetails(null)}>
          <SheetContent 
            side={direction === 'rtl' ? 'left' : 'right'} 
            className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[60vw] max-w-none p-0 overflow-y-auto"
            dir={direction}
          >
            <SheetHeader className="p-6 border-b">
              <SheetTitle className="font-cairo">
                {t('journalEntryDetails') || 'Journal Entry Details'}
              </SheetTitle>
            </SheetHeader>
            <div className="p-6">
              <JournalEntryDetailsView entry={selectedEntryForDetails} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
