import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Filter,
  Download,
  Printer,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  X,
  RotateCcw,
  FileText,
  BarChart3,
  Eye,
  Edit,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { accountLedgerService, LedgerEntry } from '@/services/accountLedgerService';
import { Loader2 } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'exchange';
  amount: number;
  balance: number;
  status: 'completed' | 'pending' | 'cancelled';
  reference: string;
  createdBy: string;
  contraAccount: string;
  origin: string;
  currency: string;
}

interface FundData {
  id: number;
  name: string;
  type: 'cash' | 'bank';
  balance: number;
  currency: string;
  accountNumber: string;
  totalDeposits: number;
  totalWithdrawals: number;
  todayChange: number;
  lastActivity: string;
}

interface FundTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: FundData | null;
  selectedCurrency?: string;
}

interface FilterState {
  search: string;
  transactionType: string;
  status: string;
  origin: string;
  reference: string;
  dateRange: DateRange | undefined;
  datePreset: string;
  minAmount: string;
  maxAmount: string;
  currency: string;
};

// Currency display info - will be extended from DB in future
const currencyInfo: Record<string, { symbol: string; flag: string; name: { ar: string; en: string } }> = {
  SAR: { symbol: 'ر.س', flag: '🇸🇦', name: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  USD: { symbol: '$', flag: '🇺🇸', name: { ar: 'دولار أمريكي', en: 'US Dollar' } },
  EUR: { symbol: '€', flag: '🇪🇺', name: { ar: 'يورو', en: 'Euro' } },
  GBP: { symbol: '£', flag: '🇬🇧', name: { ar: 'جنيه إسترليني', en: 'British Pound' } },
  AED: { symbol: 'د.إ', flag: '🇦🇪', name: { ar: 'درهم إماراتي', en: 'UAE Dirham' } },
  UAH: { symbol: '₴', flag: '🇺🇦', name: { ar: 'هريفنيا أوكرانية', en: 'Ukrainian Hryvnia' } },
  TRY: { symbol: '₺', flag: '🇹🇷', name: { ar: 'ليرة تركية', en: 'Turkish Lira' } },
};

// Helper: map ledger entry to Transaction
function mapLedgerToTransaction(entry: LedgerEntry, baseCurrency: string): Transaction {
  const isDebit = (entry.debit || 0) > 0;
  let type: Transaction['type'] = 'deposit';
  if (isDebit) type = 'withdrawal'; // debit on fund = money going out
  // Check if it's a transfer based on reference type
  const ref = (entry.referenceType || '').toLowerCase();
  if (ref === 'transfer') type = isDebit ? 'transfer_out' : 'transfer_in';
  if (ref === 'exchange') type = 'exchange';

  return {
    id: entry.id,
    date: entry.date,
    description: entry.description || '',
    type,
    amount: isDebit ? entry.debit : entry.credit,
    balance: entry.balance || 0,
    status: entry.status === 'posted' ? 'completed' : entry.status === 'cancelled' ? 'cancelled' : 'pending',
    reference: entry.entryNumber || entry.reference || '',
    createdBy: '',
    contraAccount: entry.partyName || '',
    origin: ref || 'manual',
    currency: entry.currency || baseCurrency,
  };
}

export default function FundTransactionSheet({
  open,
  onOpenChange,
  fund,
  selectedCurrency
}: FundTransactionSheetProps) {
  const { language, direction } = useLanguage();
  const { companyId } = useCompany();
  const { currencyCode: baseCurrency } = useCompanyCurrency();
  const { lookupRate } = useExchangeRateLookup();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<string>(selectedCurrency || 'all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    transactionType: 'all',
    status: 'all',
    origin: 'all',
    reference: '',
    dateRange: undefined,
    datePreset: 'all',
    minAmount: '',
    maxAmount: '',
    currency: 'all'
  });

  // Convert amount using dynamic exchange rates
  const convertCurrency = useCallback((amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    const rate = lookupRate(from, to);
    return amount * rate;
  }, [lookupRate]);

  // Fetch real transactions when the sheet opens
  useEffect(() => {
    if (!open || !fund || !companyId) return;

    const fetchTransactions = async () => {
      // Fund.id is typically the account_id in the chart_of_accounts
      const accountId = String(fund.id);
      if (!accountId) return;

      setIsLoading(true);
      try {
        const result = await accountLedgerService.getLedger({
          accountId,
          companyId,
          dateFrom: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
          dateTo: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
          status: filters.status !== 'all' ? filters.status as 'posted' | 'draft' : undefined,
          currency: filters.currency !== 'all' ? filters.currency : undefined,
        });

        const mapped = result.entries.map(entry => mapLedgerToTransaction(entry, baseCurrency));
        setTransactions(mapped);
      } catch (err) {
        console.error('Failed to load fund transactions:', err);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [open, fund?.id, companyId, baseCurrency, filters.dateRange, filters.status, filters.currency]);

  // Update display currency when selectedCurrency prop changes
  React.useEffect(() => {
    if (selectedCurrency) {
      setDisplayCurrency(selectedCurrency);
    }
  }, [selectedCurrency]);

  // Reset selected transaction when sheet closes
  React.useEffect(() => {
    if (!open) {
      setSelectedTransaction(null);
    }
  }, [open]);

  const transactionTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'deposit', label: language === 'ar' ? 'إيداع' : 'Deposit' },
    { value: 'withdrawal', label: language === 'ar' ? 'سحب' : 'Withdrawal' },
    { value: 'transfer_in', label: language === 'ar' ? 'تحويل وارد' : 'Transfer In' },
    { value: 'transfer_out', label: language === 'ar' ? 'تحويل صادر' : 'Transfer Out' },
    { value: 'exchange', label: language === 'ar' ? 'تصريف' : 'Exchange' },
  ];

  const statusTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'completed', label: language === 'ar' ? 'مكتمل' : 'Completed' },
    { value: 'pending', label: language === 'ar' ? 'قيد الانتظار' : 'Pending' },
    { value: 'cancelled', label: language === 'ar' ? 'ملغي' : 'Cancelled' },
  ];

  const originTypes = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'manual', label: language === 'ar' ? 'يدوي' : 'Manual' },
    { value: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales' },
    { value: 'purchases', label: language === 'ar' ? 'المشتريات' : 'Purchases' },
    { value: 'transfer', label: language === 'ar' ? 'تحويل' : 'Transfer' },
    { value: 'payroll', label: language === 'ar' ? 'الرواتب' : 'Payroll' },
    { value: 'system', label: language === 'ar' ? 'النظام' : 'System' },
  ];

  const datePresets = [
    { value: 'all', label: language === 'ar' ? 'كل الفترات' : 'All Time' },
    { value: 'today', label: language === 'ar' ? 'اليوم' : 'Today' },
    { value: 'yesterday', label: language === 'ar' ? 'أمس' : 'Yesterday' },
    { value: 'thisWeek', label: language === 'ar' ? 'هذا الأسبوع' : 'This Week' },
    { value: 'thisMonth', label: language === 'ar' ? 'هذا الشهر' : 'This Month' },
    { value: 'lastMonth', label: language === 'ar' ? 'الشهر الماضي' : 'Last Month' },
    { value: 'last7Days', label: language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days' },
    { value: 'last30Days', label: language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days' },
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
      case 'thisMonth':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(today), 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'last7Days':
        return { from: subDays(today, 7), to: today };
      case 'last30Days':
        return { from: subDays(today, 30), to: today };
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
      transactionType: 'all',
      status: 'all',
      origin: 'all',
      reference: '',
      dateRange: undefined,
      datePreset: 'all',
      minAmount: '',
      maxAmount: '',
      currency: selectedCurrency || 'all'
    });
  };

  const hasActiveFilters = filters.search || filters.transactionType !== 'all' || filters.status !== 'all' ||
    filters.origin !== 'all' || filters.reference || filters.dateRange || filters.minAmount || filters.maxAmount ||
    (filters.currency !== 'all' && !selectedCurrency);

  // Get available currencies in transactions
  const availableCurrencies = useMemo(() => {
    const currencies = new Set(transactions.map(t => t.currency));
    return Array.from(currencies);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let data = [...transactions];

    // Filter by currency first
    if (filters.currency && filters.currency !== 'all') {
      data = data.filter((item) => item.currency === filters.currency);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter((item) =>
        item.description.toLowerCase().includes(searchLower) ||
        item.reference.toLowerCase().includes(searchLower) ||
        item.createdBy.toLowerCase().includes(searchLower)
      );
    }

    if (filters.transactionType !== 'all') {
      data = data.filter((item) => item.type === filters.transactionType);
    }

    if (filters.status !== 'all') {
      data = data.filter((item) => item.status === filters.status);
    }

    if (filters.origin !== 'all') {
      data = data.filter((item) => item.origin === filters.origin);
    }

    if (filters.reference) {
      data = data.filter((item) =>
        item.reference.toLowerCase().includes(filters.reference.toLowerCase())
      );
    }

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

    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      data = data.filter((item) => item.amount >= min);
    }

    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      data = data.filter((item) => item.amount <= max);
    }

    return data;
  }, [filters]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case 'withdrawal': return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'transfer_in': return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'transfer_out': return <ArrowRightLeft className="w-4 h-4 text-purple-600" />;
      case 'exchange': return <BarChart3 className="w-4 h-4 text-amber-600" />;
      default: return null;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'bg-green-100 text-green-700 border-green-200';
      case 'withdrawal': return 'bg-red-100 text-red-700 border-red-200';
      case 'transfer_in': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'transfer_out': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'exchange': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    const found = transactionTypes.find(t => t.value === type);
    return found?.label || type;
  };

  if (!fund) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 overflow-hidden"
        dir={direction}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className={`p-6 ${fund.type === 'bank' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-green-600 to-emerald-500'} text-white flex-none`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {fund.type === 'bank' ? <Landmark className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                </div>
                <div>
                  <SheetTitle className="text-2xl font-cairo text-white">
                    {fund.name}
                  </SheetTitle>
                  <SheetDescription className="text-white/80 mt-1 font-mono">
                    {fund.type === 'bank' ? fund.accountNumber : (language === 'ar' ? 'صندوق نقدي' : 'Cash Fund')}
                  </SheetDescription>
                </div>
              </div>
              {/* Currency Display Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/70">{language === 'ar' ? 'عرض بـ:' : 'Display in:'}</span>
                <Button
                  size="sm"
                  variant={displayCurrency === 'all' ? 'secondary' : 'ghost'}
                  className={`h-7 px-2 text-xs ${displayCurrency === 'all' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/20'}`}
                  onClick={() => setDisplayCurrency('all')}
                >
                  {language === 'ar' ? 'الكل' : 'All'}
                </Button>
                {availableCurrencies.map(curr => (
                  <Button
                    key={curr}
                    size="sm"
                    variant={displayCurrency === curr ? 'secondary' : 'ghost'}
                    className={`h-7 px-2 gap-1 ${displayCurrency === curr ? 'bg-white text-gray-900' : 'text-white hover:bg-white/20'}`}
                    onClick={() => setDisplayCurrency(curr)}
                  >
                    <span>{currencyInfo[curr]?.flag}</span>
                    <span className="text-xs font-mono">{curr}</span>
                  </Button>
                ))}
              </div>
            </div>
          </SheetHeader>

          {/* Stats Cards */}
          <div className="flex-none p-4 bg-gray-50 border-b">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-white">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</p>
                      <p className="font-mono font-bold text-erp-navy">{fund.balance.toLocaleString()} {fund.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits'}</p>
                      <p className="font-mono font-bold text-green-600">{fund.totalDeposits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-100 rounded-lg">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي السحوبات' : 'Total Withdrawals'}</p>
                      <p className="font-mono font-bold text-red-600">{fund.totalWithdrawals.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 ${fund.todayChange >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg`}>
                      {fund.todayChange >= 0
                        ? <TrendingUp className="w-4 h-4 text-green-600" />
                        : <TrendingDown className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{language === 'ar' ? 'حركة اليوم' : "Today's Change"}</p>
                      <p className={`font-mono font-bold ${fund.todayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fund.todayChange >= 0 ? '+' : ''}{fund.todayChange.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Balance Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{language === 'ar' ? 'نسبة الرصيد من إجمالي الإيداعات' : 'Balance % of Total Deposits'}</span>
                <span>{((fund.balance / fund.totalDeposits) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(fund.balance / fund.totalDeposits) * 100} className="h-2" />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex-none p-4 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                <Input
                  placeholder={language === 'ar' ? 'بحث في المعاملات...' : 'Search transactions...'}
                  className={`${direction === 'rtl' ? 'pr-9' : 'pl-9'} bg-white`}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                className={`gap-2 ${showFilters ? 'bg-erp-navy' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                {language === 'ar' ? 'الفلاتر' : 'Filters'}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="bg-erp-teal text-white text-xs px-1.5 py-0">
                    {Object.values(filters).filter(v => v && v !== 'all').length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:text-red-700" onClick={resetFilters}>
                  <RotateCcw className="w-3 h-3" />
                  {language === 'ar' ? 'مسح' : 'Reset'}
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Transaction Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'نوع العملية' : 'Transaction Type'}
                    </label>
                    <Select value={filters.transactionType} onValueChange={(v) => setFilters(prev => ({ ...prev, transactionType: v }))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </label>
                    <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusTypes.map(status => (
                          <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Origin */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'المصدر' : 'Origin'}
                    </label>
                    <Select value={filters.origin} onValueChange={(v) => setFilters(prev => ({ ...prev, origin: v }))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {originTypes.map(origin => (
                          <SelectItem key={origin.value} value={origin.value}>{origin.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Preset */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'الفترة الزمنية' : 'Time Period'}
                    </label>
                    <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {datePresets.map(preset => (
                          <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Reference */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'المرجع' : 'Reference'}
                    </label>
                    <Input
                      placeholder="REC-2024-..."
                      value={filters.reference}
                      onChange={(e) => setFilters(prev => ({ ...prev, reference: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  {/* Min Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'الحد الأدنى للمبلغ' : 'Min Amount'}
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  {/* Max Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      {language === 'ar' ? 'الحد الأقصى للمبلغ' : 'Max Amount'}
                    </label>
                    <Input
                      type="number"
                      placeholder="999999"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  {/* Custom Date Range */}
                  {filters.datePreset === 'custom' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        {language === 'ar' ? 'فترة مخصصة' : 'Custom Range'}
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange?.from ? (
                              filters.dateRange.to ? (
                                <span className="text-xs">
                                  {format(filters.dateRange.from, "MM/dd")} - {format(filters.dateRange.to, "MM/dd")}
                                </span>
                              ) : (
                                format(filters.dateRange.from, "yyyy/MM/dd")
                              )
                            ) : (
                              <span className="text-gray-500 text-xs">{language === 'ar' ? 'اختر' : 'Pick'}</span>
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-500">
                {language === 'ar'
                  ? `عرض ${filteredTransactions.length} من ${transactions.length} معاملة`
                  : `Showing ${filteredTransactions.length} of ${transactions.length} transactions`
                }
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {fund.lastActivity}
              </div>
            </div>
          </div>

          {/* Main Content with Tabs */}
          <Tabs value={selectedTransaction ? 'details' : 'list'} className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex-none border-b bg-white px-4">
              <TabsList className="h-10 bg-transparent gap-0 p-0">
                <TabsTrigger
                  value="list"
                  className="relative h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-erp-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-2"
                  onClick={() => setSelectedTransaction(null)}
                >
                  <FileText className="w-4 h-4" />
                  {language === 'ar' ? 'المعاملات' : 'Transactions'}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-100">
                    {filteredTransactions.length}
                  </Badge>
                </TabsTrigger>
                {selectedTransaction && (
                  <TabsTrigger
                    value="details"
                    className="relative h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-erp-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {language === 'ar' ? 'تفاصيل القيد' : 'Details'}
                    <span className="text-[10px] text-gray-400 font-mono">{selectedTransaction.reference}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 hover:bg-red-100 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); setSelectedTransaction(null); }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Tab Content */}
            <TabsContent value="list" className="flex-1 m-0 data-[state=inactive]:hidden overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'المرجع' : 'Reference'}</TableHead>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      {displayCurrency !== 'all' && <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'محوّل' : 'Converted'}</TableHead>}
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                      <TableHead className="text-gray-500 text-xs">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((trx) => {
                        const convertedAmount = displayCurrency !== 'all' && trx.currency !== displayCurrency
                          ? convertCurrency(trx.amount, trx.currency, displayCurrency)
                          : null;
                        const isPositive = trx.type === 'deposit' || trx.type === 'transfer_in' || (trx.type === 'exchange' && trx.contraAccount !== trx.currency);

                        return (
                          <TableRow
                            key={trx.id}
                            className="cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => setSelectedTransaction(trx)}
                          >
                            <TableCell className="text-gray-500 text-sm">{trx.date}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-700">{trx.reference}</TableCell>
                            <TableCell className="font-medium text-erp-navy text-sm max-w-[200px] truncate">{trx.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getTypeBadgeColor(trx.type)}`}>
                                <span className="mr-1">{getTypeIcon(trx.type)}</span>
                                {getTypeLabel(trx.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs gap-1">
                                <span>{currencyInfo[trx.currency]?.flag}</span>
                                <span className="font-mono">{trx.currency}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className={`font-mono font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {isPositive ? '+' : '-'}{trx.amount.toLocaleString()}
                            </TableCell>
                            {displayCurrency !== 'all' && (
                              <TableCell className="font-mono text-xs text-amber-600">
                                {convertedAmount ? `≈${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${displayCurrency}` : '-'}
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-sm text-gray-700">{trx.balance.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`text-xs ${trx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                trx.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                {statusTypes.find(s => s.value === trx.status)?.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={displayCurrency !== 'all' ? 9 : 8} className="text-center py-12 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-12 h-12 text-gray-300" />
                            <p>{language === 'ar' ? 'لا توجد معاملات مطابقة' : 'No matching transactions'}</p>
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
            </TabsContent>

            {/* Transaction Details Tab */}
            <TabsContent value="details" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
              {selectedTransaction && (
                <>
                  {/* Detail Header Actions */}
                  <div className="flex-none p-4 bg-white border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`${getTypeBadgeColor(selectedTransaction.type)} text-sm px-3 py-1`}>
                        {getTypeIcon(selectedTransaction.type)}
                        <span className="ml-2">{getTypeLabel(selectedTransaction.type)}</span>
                      </Badge>
                      <div>
                        <p className="font-mono text-sm text-gray-700">{selectedTransaction.reference}</p>
                        <p className="text-xs text-gray-400">{selectedTransaction.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Edit className="w-4 h-4" />
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Copy className="w-4 h-4" />
                        {language === 'ar' ? 'نسخ' : 'Copy'}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Printer className="w-4 h-4" />
                        {language === 'ar' ? 'طباعة' : 'Print'}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>

                  {/* Detail Content */}
                  <div className="flex-1 overflow-auto p-6 space-y-6 bg-gray-50">
                    {/* Amount Card */}
                    <Card className={`${selectedTransaction.type === 'deposit' || selectedTransaction.type === 'transfer_in'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : selectedTransaction.type === 'exchange'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-500'
                      } text-white border-none shadow-lg`}>
                      <CardContent className="p-6 text-center">
                        <p className="text-white/80 text-sm mb-2">{language === 'ar' ? 'المبلغ' : 'Amount'}</p>
                        <p className="text-4xl font-bold font-mono">
                          {selectedTransaction.type === 'deposit' || selectedTransaction.type === 'transfer_in' ? '+' : '-'}
                          {selectedTransaction.amount.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-2xl">{currencyInfo[selectedTransaction.currency]?.flag}</span>
                          <span className="text-lg">{selectedTransaction.currency}</span>
                        </div>
                        {displayCurrency !== 'all' && selectedTransaction.currency !== displayCurrency && (
                          <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-white/70 text-xs">{language === 'ar' ? 'القيمة بالعملة المختارة' : 'Value in selected currency'}</p>
                            <p className="text-xl font-mono mt-1">
                              ≈ {convertCurrency(selectedTransaction.amount, selectedTransaction.currency, displayCurrency).toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                          <p className="font-medium">{selectedTransaction.date}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                          <Badge variant="secondary" className={`text-sm ${selectedTransaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            selectedTransaction.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {statusTypes.find(s => s.value === selectedTransaction.status)?.label}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'المرجع' : 'Reference'}</p>
                          <p className="font-mono">{selectedTransaction.reference}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'المنشئ' : 'Created By'}</p>
                          <p>{selectedTransaction.createdBy}</p>
                        </CardContent>
                      </Card>
                      <Card className="col-span-2">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</p>
                          <p>{selectedTransaction.description}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الحساب المقابل' : 'Contra Account'}</p>
                          <p className="font-mono text-sm">{selectedTransaction.contraAccount}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'المصدر' : 'Origin'}</p>
                          <Badge variant="outline">
                            {originTypes.find(o => o.value === selectedTransaction.origin)?.label || selectedTransaction.origin}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card className="col-span-2">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الرصيد بعد العملية' : 'Balance After'}</p>
                          <p className="font-mono text-xl font-bold">{selectedTransaction.balance.toLocaleString()} {selectedTransaction.currency}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Currency Conversion Info */}
                    {displayCurrency !== 'all' && selectedTransaction.currency !== displayCurrency && (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <RefreshCw className="w-5 h-5 text-amber-600" />
                            <span className="font-bold text-amber-800">{language === 'ar' ? 'معلومات التحويل' : 'Currency Conversion'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">{language === 'ar' ? 'العملة الأصلية' : 'Original Currency'}</p>
                              <p className="font-mono font-bold text-lg">{selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{language === 'ar' ? 'العملة المحولة' : 'Converted to'}</p>
                              <p className="font-mono font-bold text-lg text-amber-700">
                                {convertCurrency(selectedTransaction.amount, selectedTransaction.currency, displayCurrency).toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}</p>
                              <p className="font-mono">1 {selectedTransaction.currency} = {lookupRate(selectedTransaction.currency, displayCurrency).toFixed(4)} {displayCurrency}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
