import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Wallet, 
  Landmark, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRightLeft,
  MoreHorizontal,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  BarChart3,
  FileText,
  Printer,
  RefreshCw,
  Coins,
  LayoutGrid,
  List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddFundDialog } from './components/AddFundDialog';
import QuickReceiptDialog from './components/QuickReceiptDialog';
import QuickPaymentDialog from './components/QuickPaymentDialog';
import FundTransferDialog from './components/FundTransferDialog';
import FundTransactionSheet from './components/FundTransactionSheet';
import { UniversalDetailSheet } from '@/components/sheets';
import CurrencyExchangeDialog from './components/CurrencyExchangeDialog';
import QuickActionsBar from './components/QuickActionsBar';

// Currency configuration
const currencyInfo: Record<string, { symbol: string; flag: string; name: { ar: string; en: string } }> = {
  SAR: { symbol: 'ر.س', flag: '🇸🇦', name: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  USD: { symbol: '$', flag: '🇺🇸', name: { ar: 'دولار أمريكي', en: 'US Dollar' } },
  EUR: { symbol: '€', flag: '🇪🇺', name: { ar: 'يورو', en: 'Euro' } },
  GBP: { symbol: '£', flag: '🇬🇧', name: { ar: 'جنيه إسترليني', en: 'British Pound' } },
  AED: { symbol: 'د.إ', flag: '🇦🇪', name: { ar: 'درهم إماراتي', en: 'UAE Dirham' } }
};

// Exchange rates to SAR (base currency)
const exchangeRatesToSAR: Record<string, number> = {
  SAR: 1,
  USD: 3.75,
  EUR: 4.09,
  GBP: 4.74,
  AED: 1.02
};

// Get exchange rate between any two currencies
const getExchangeRate = (from: string, to: string): number => {
  if (from === to) return 1;
  const fromToSAR = exchangeRatesToSAR[from] || 1;
  const toToSAR = exchangeRatesToSAR[to] || 1;
  return fromToSAR / toToSAR;
};

// Convert amount from one currency to another
const convertCurrency = (amount: number, from: string, to: string): number => {
  return amount * getExchangeRate(from, to);
};

interface CurrencyBalance {
  currency: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  todayChange: number;
}

interface FundData {
  id: number;
  name: string;
  type: 'cash' | 'bank';
  defaultCurrency: string;
  accountNumber: string;
  balances: CurrencyBalance[];
  lastActivity: string;
  transactionCount: number;
}

// For backward compatibility with existing dialogs
interface SimpleFundData {
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
  transactionCount: number;
}

export default function FundsManagement() {
  const { t, direction, language } = useLanguage();
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState<number | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [selectedFundForSheet, setSelectedFundForSheet] = useState<SimpleFundData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedFundForExchange, setSelectedFundForExchange] = useState<FundData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Enhanced Mock Data with Multi-Currency Support
  const funds: FundData[] = [
    { 
      id: 1, 
      name: language === 'ar' ? 'الصندوق الرئيسي' : 'Main Cash Fund', 
      type: 'cash', 
      defaultCurrency: 'SAR',
      accountNumber: '-',
      balances: [
        { currency: 'SAR', balance: 15420, totalDeposits: 125000, totalWithdrawals: 109580, todayChange: 3200 },
        { currency: 'USD', balance: 2500, totalDeposits: 8000, totalWithdrawals: 5500, todayChange: 500 },
        { currency: 'EUR', balance: 1800, totalDeposits: 5000, totalWithdrawals: 3200, todayChange: 0 }
      ],
      lastActivity: language === 'ar' ? 'منذ ساعتين' : '2 hours ago',
      transactionCount: 156
    },
    { 
      id: 2, 
      name: language === 'ar' ? 'بنك البلاد' : 'Bank Al-Bilad', 
      type: 'bank', 
      defaultCurrency: 'SAR',
      accountNumber: 'SA45 1234 5678 9012',
      balances: [
        { currency: 'SAR', balance: 85200, totalDeposits: 350000, totalWithdrawals: 264800, todayChange: -5000 },
        { currency: 'USD', balance: 12000, totalDeposits: 45000, totalWithdrawals: 33000, todayChange: 1200 }
      ],
      lastActivity: language === 'ar' ? 'منذ 30 دقيقة' : '30 minutes ago',
      transactionCount: 89
    },
    { 
      id: 3, 
      name: language === 'ar' ? 'صندوق النثرية' : 'Petty Cash', 
      type: 'cash', 
      defaultCurrency: 'SAR',
      accountNumber: '-',
      balances: [
        { currency: 'SAR', balance: 2500, totalDeposits: 15000, totalWithdrawals: 12500, todayChange: 0 }
      ],
      lastActivity: language === 'ar' ? 'منذ يومين' : '2 days ago',
      transactionCount: 45
    },
    { 
      id: 4, 
      name: language === 'ar' ? 'بنك الراجحي' : 'Al-Rajhi Bank', 
      type: 'bank', 
      defaultCurrency: 'SAR',
      accountNumber: 'SA98 7654 3210 9876',
      balances: [
        { currency: 'SAR', balance: 120500, totalDeposits: 450000, totalWithdrawals: 329500, todayChange: 8300 },
        { currency: 'USD', balance: 8500, totalDeposits: 25000, totalWithdrawals: 16500, todayChange: -200 },
        { currency: 'EUR', balance: 5200, totalDeposits: 12000, totalWithdrawals: 6800, todayChange: 0 },
        { currency: 'GBP', balance: 3000, totalDeposits: 8000, totalWithdrawals: 5000, todayChange: 500 }
      ],
      lastActivity: language === 'ar' ? 'منذ ساعة' : '1 hour ago',
      transactionCount: 124
    },
  ];

  // Get all available currencies across all funds
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    funds.forEach(fund => {
      fund.balances.forEach(bal => currencies.add(bal.currency));
    });
    return Array.from(currencies).sort();
  }, [funds]);

  // Calculate totals per currency (raw without conversion)
  const currencyTotals = useMemo(() => {
    const totals: Record<string, { balance: number; deposits: number; withdrawals: number; todayChange: number }> = {};
    
    funds.forEach(fund => {
      fund.balances.forEach(bal => {
        if (!totals[bal.currency]) {
          totals[bal.currency] = { balance: 0, deposits: 0, withdrawals: 0, todayChange: 0 };
        }
        totals[bal.currency].balance += bal.balance;
        totals[bal.currency].deposits += bal.totalDeposits;
        totals[bal.currency].withdrawals += bal.totalWithdrawals;
        totals[bal.currency].todayChange += bal.todayChange;
      });
    });
    
    return totals;
  }, [funds]);

  // Calculate CONVERTED totals to selected currency
  const convertedTotals = useMemo(() => {
    const targetCurrency = selectedCurrency === 'ALL' ? 'SAR' : selectedCurrency;
    let totalBalance = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalTodayChange = 0;

    Object.entries(currencyTotals).forEach(([currency, totals]) => {
      totalBalance += convertCurrency(totals.balance, currency, targetCurrency);
      totalDeposits += convertCurrency(totals.deposits, currency, targetCurrency);
      totalWithdrawals += convertCurrency(totals.withdrawals, currency, targetCurrency);
      totalTodayChange += convertCurrency(totals.todayChange, currency, targetCurrency);
    });

    return { balance: totalBalance, deposits: totalDeposits, withdrawals: totalWithdrawals, todayChange: totalTodayChange };
  }, [currencyTotals, selectedCurrency]);

  // Get fund balance converted to selected currency
  const getFundConvertedBalance = (fund: FundData, targetCurrency: string): number => {
    const target = targetCurrency === 'ALL' ? 'SAR' : targetCurrency;
    return fund.balances.reduce((sum, bal) => {
      return sum + convertCurrency(bal.balance, bal.currency, target);
    }, 0);
  };

  // Convert FundData to SimpleFundData for existing dialogs
  const getSimpleFundData = (fund: FundData, currency?: string): SimpleFundData => {
    const curr = currency || fund.defaultCurrency;
    const bal = fund.balances.find(b => b.currency === curr) || fund.balances[0];
    return {
      id: fund.id,
      name: fund.name,
      type: fund.type,
      balance: bal.balance,
      currency: bal.currency,
      accountNumber: fund.accountNumber,
      totalDeposits: bal.totalDeposits,
      totalWithdrawals: bal.totalWithdrawals,
      todayChange: bal.todayChange,
      lastActivity: fund.lastActivity,
      transactionCount: fund.transactionCount
    };
  };

  // Get simplified funds for dialogs
  const simpleFunds = useMemo(() => {
    return funds.map(f => getSimpleFundData(f, selectedCurrency === 'ALL' ? f.defaultCurrency : selectedCurrency));
  }, [funds, selectedCurrency]);

  // Get balance for a specific currency or total
  const getFundBalance = (fund: FundData, currency: string): number => {
    if (currency === 'ALL') {
      return fund.balances.find(b => b.currency === fund.defaultCurrency)?.balance || 0;
    }
    return fund.balances.find(b => b.currency === currency)?.balance || 0;
  };

  const getFundTodayChange = (fund: FundData, currency: string): number => {
    if (currency === 'ALL') {
      return fund.balances.reduce((sum, b) => sum + b.todayChange, 0);
    }
    return fund.balances.find(b => b.currency === currency)?.todayChange || 0;
  };

  const handleViewDetails = (fund: FundData) => {
    const simpleFund = getSimpleFundData(fund, selectedCurrency === 'ALL' ? fund.defaultCurrency : selectedCurrency);
    setSelectedFundForSheet(simpleFund);
    setTransactionSheetOpen(true);
  };

  const handleQuickAction = (action: 'receipt' | 'payment' | 'transfer' | 'exchange', fundId?: number, fund?: FundData) => {
    if (fundId) setSelectedFundId(fundId);
    if (action === 'receipt') setIsReceiptDialogOpen(true);
    else if (action === 'payment') setIsPaymentDialogOpen(true);
    else if (action === 'transfer') setIsTransferDialogOpen(true);
    else if (action === 'exchange' && fund) {
      setSelectedFundForExchange(fund);
      setIsExchangeDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo mb-2">{t('accounting.funds')}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal">{t('accounting.fundsDescription')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickActionsBar />
        </div>
      </div>

      {/* Currency Selector and Balance Summary */}
      <Card className="bg-white dark:bg-gray-900 shadow-sm border-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Currency Tabs */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/20 rounded-md">
                <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <Tabs value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <TabsList className="h-8">
                  <TabsTrigger value="ALL" className="text-xs px-2.5 h-7">
                    {language === 'ar' ? 'الكل' : 'All'}
                  </TabsTrigger>
                  {availableCurrencies.map(curr => (
                    <TabsTrigger key={curr} value={curr} className="text-xs px-2.5 h-7 gap-1">
                      <span className="text-sm">{currencyInfo[curr]?.flag}</span>
                      {curr}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              
              {/* Add Fund/Bank Button */}
              <Button 
                size="sm"
                className="h-8 px-3 gap-1.5 bg-erp-navy dark:bg-gray-800 hover:bg-erp-navy/90 dark:hover:bg-gray-700 text-white" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                {language === 'ar' ? 'صندوق/بنك' : 'Fund/Bank'}
              </Button>
            </div>

            {/* Currency Balances Overview - Shows raw balances per currency */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(currencyTotals).map(([curr, totals]) => {
                const convertedToSelected = selectedCurrency !== 'ALL' && selectedCurrency !== curr
                  ? convertCurrency(totals.balance, curr, selectedCurrency)
                  : null;
                return (
                  <div 
                    key={curr}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border cursor-pointer transition-all ${
                      selectedCurrency === curr 
                        ? 'bg-erp-navy text-white border-erp-navy' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-erp-navy/50'
                    }`}
                    onClick={() => setSelectedCurrency(curr)}
                  >
                    <span className="text-sm">{currencyInfo[curr]?.flag}</span>
                    <div>
                      <p className={`font-mono font-bold text-xs ${selectedCurrency === curr ? 'text-white' : 'text-erp-navy dark:text-white'}`}>
                        {totals.balance.toLocaleString()} <span className="text-[10px] font-normal">{curr}</span>
                      </p>
                      {convertedToSelected && (
                        <p className={`text-[9px] font-mono ${selectedCurrency === curr ? 'text-white/70' : 'text-gray-400'}`}>
                          ≈ {convertedToSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Shows CONVERTED totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-gray-900 shadow-sm border-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-erp-navy dark:text-white font-mono">
                  {convertedTotals.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'إجمالي الرصيد' : 'Total Balance'} ({selectedCurrency === 'ALL' ? 'SAR' : selectedCurrency})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 shadow-sm border-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-md">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 font-mono">
                  +{convertedTotals.deposits.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'ar' ? 'إجمالي المقبوضات' : 'Total Receipts'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 shadow-sm border-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-md">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">
                  -{convertedTotals.withdrawals.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-none ${convertedTotals.todayChange >= 0 ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${convertedTotals.todayChange >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {convertedTotals.todayChange >= 0 
                  ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                }
              </div>
              <div>
                <p className={`text-lg font-bold font-mono ${convertedTotals.todayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {convertedTotals.todayChange >= 0 ? '+' : ''}{convertedTotals.todayChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'ar' ? 'صافي التدفق اليوم' : "Today's Net Flow"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-erp-navy dark:text-white font-cairo">
          {language === 'ar' ? 'الصناديق والبنوك' : 'Funds & Banks'}
          <Badge variant="secondary" className="mr-2 text-[10px]">{funds.length}</Badge>
        </h3>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            className={`h-7 px-2.5 gap-1 text-xs ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {language === 'ar' ? 'بطاقات' : 'Grid'}
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            className={`h-7 px-2.5 gap-1 text-xs ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <List className="w-3.5 h-3.5" />
            {language === 'ar' ? 'جدول' : 'Table'}
          </Button>
        </div>
      </div>

      {/* Funds Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {funds.map((fund) => {
            const targetCurrency = selectedCurrency === 'ALL' ? 'SAR' : selectedCurrency;
            const convertedBalance = getFundConvertedBalance(fund, selectedCurrency);
            const displayChange = getFundTodayChange(fund, selectedCurrency);
            
            return (
            <Card 
              key={fund.id} 
              className="bg-white dark:bg-gray-900 shadow-sm border-none hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleViewDetails(fund)}
            >
              <CardContent className="p-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1 rounded-md ${fund.type === 'bank' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                    {fund.type === 'bank' 
                      ? <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> 
                      : <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    }
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(fund); }}>
                        <Eye className="w-3.5 h-3.5 ml-2" />
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction('receipt', fund.id); }}>
                        <ArrowDownRight className="w-3.5 h-3.5 ml-2 text-green-600" />
                        {language === 'ar' ? 'مقبوضات' : 'Receipt'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction('payment', fund.id); }}>
                        <ArrowUpRight className="w-3.5 h-3.5 ml-2 text-red-600" />
                        {language === 'ar' ? 'مدفوعات' : 'Payment'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction('transfer', fund.id); }}>
                        <ArrowRightLeft className="w-3.5 h-3.5 ml-2 text-purple-600" />
                        {language === 'ar' ? 'تحويل' : 'Transfer'}
                      </DropdownMenuItem>
                      {fund.balances.length > 1 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction('exchange', fund.id, fund); }}>
                            <RefreshCw className="w-3.5 h-3.5 ml-2 text-amber-600" />
                            {language === 'ar' ? 'تصريف عملات' : 'Exchange'}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Fund Name */}
                <h3 className="font-bold text-erp-navy dark:text-white font-cairo text-sm leading-tight mb-0.5 truncate">{fund.name}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate mb-2">
                  {fund.type === 'bank' ? fund.accountNumber : (language === 'ar' ? 'صندوق نقدي' : 'Cash Fund')}
                </p>

                {/* Converted Balance */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">{currencyInfo[targetCurrency]?.flag} {targetCurrency}</span>
                    {fund.balances.length > 1 && (
                      <span className="text-[9px] text-amber-500">{language === 'ar' ? 'محوّل' : 'conv.'}</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-erp-navy dark:text-white font-mono">
                    {convertedBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Currency Balances - Compact */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {fund.balances.map(bal => (
                    <Badge key={bal.currency} variant="outline" className="text-[9px] py-0 px-1.5 gap-0.5 font-mono">
                      {currencyInfo[bal.currency]?.flag}
                      {bal.balance.toLocaleString()}
                    </Badge>
                  ))}
                </div>

                {/* Today's Change */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-0.5">
                    {displayChange >= 0 
                      ? <TrendingUp className="w-2.5 h-2.5 text-green-600" />
                      : <TrendingDown className="w-2.5 h-2.5 text-red-600" />
                    }
                    <span className={`font-mono font-bold ${displayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayChange >= 0 ? '+' : ''}{displayChange.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-gray-400 truncate">{fund.lastActivity}</span>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {/* Funds Table View */}
      {viewMode === 'table' && (
        <Card className="bg-white dark:bg-gray-900 shadow-sm border-none">
          <CardContent className="p-0">
            <Table className="border-collapse">
              <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                <TableRow className="h-12 border-b-2 border-slate-300 dark:border-slate-600">
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الصندوق/البنك' : 'Fund/Bank'}</TableHead>
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className="w-[120px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الرصيد' : 'Balance'} ({selectedCurrency === 'ALL' ? 'SAR' : selectedCurrency})</TableHead>
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'تفاصيل العملات' : 'Currency Details'}</TableHead>
                  <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'حركة اليوم' : "Today's Change"}</TableHead>
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</TableHead>
                  <TableHead className="w-[100px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund, index) => {
                  const targetCurrency = selectedCurrency === 'ALL' ? 'SAR' : selectedCurrency;
                  const convertedBalance = getFundConvertedBalance(fund, selectedCurrency);
                  const displayChange = getFundTodayChange(fund, selectedCurrency);
                  
                  return (
                    <TableRow 
                      key={fund.id} 
                      className={`h-12 hover:bg-blue-50/80 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50'}`}
                      onClick={() => handleViewDetails(fund)}
                    >
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-md ${fund.type === 'bank' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                            {fund.type === 'bank' 
                              ? <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> 
                              : <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 font-cairo">{fund.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {fund.type === 'bank' ? fund.accountNumber : (language === 'ar' ? 'صندوق نقدي' : 'Cash Fund')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <Badge variant="outline" className={`text-xs font-medium px-2.5 py-1 ${fund.type === 'bank' ? 'text-blue-600 border-blue-200' : 'text-green-600 border-green-200'}`}>
                          {fund.type === 'bank' ? (language === 'ar' ? 'بنك' : 'Bank') : (language === 'ar' ? 'صندوق' : 'Cash')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <div>
                          <p className="font-mono font-semibold text-sm text-emerald-600">
                            {convertedBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          {fund.balances.length > 1 && (
                            <p className="text-xs text-amber-500 mt-0.5">{language === 'ar' ? 'محوّل' : 'converted'}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {fund.balances.map(bal => (
                            <Badge key={bal.currency} variant="outline" className="text-xs font-medium py-0.5 px-2 gap-0.5 font-mono">
                              {currencyInfo[bal.currency]?.flag}
                              {bal.balance.toLocaleString()} {bal.currency}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {displayChange >= 0 
                            ? <TrendingUp className="w-3 h-3 text-emerald-600" />
                            : <TrendingDown className="w-3 h-3 text-rose-600" />
                          }
                          <span className={`font-mono text-sm font-semibold ${displayChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {displayChange >= 0 ? '+' : ''}{displayChange.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <span className="text-sm text-slate-500">{fund.lastActivity}</span>
                      </TableCell>
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            onClick={(e) => { e.stopPropagation(); handleQuickAction('receipt', fund.id); }}
                          >
                            <ArrowDownRight className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); handleQuickAction('payment', fund.id); }}
                          >
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction('transfer', fund.id); }}>
                                <ArrowRightLeft className="w-3.5 h-3.5 ml-2 text-purple-600" />
                                {language === 'ar' ? 'تحويل' : 'Transfer'}
                              </DropdownMenuItem>
                              {fund.balances.length > 1 && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction('exchange', fund.id, fund); }}>
                                  <RefreshCw className="w-3.5 h-3.5 ml-2 text-amber-600" />
                                  {language === 'ar' ? 'تصريف عملات' : 'Exchange'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Printer className="w-3.5 h-3.5 ml-2" />
                                {language === 'ar' ? 'طباعة كشف' : 'Print Statement'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* Footer Totals - Aligned to columns */}
            <div className="shrink-0 border-t-2 border-erp-navy bg-erp-navy text-white">
              <div className="grid grid-cols-[1fr_1fr_120px_1fr_100px_1fr_100px] gap-0 py-2">
                <div className="border-l border-gray-600 px-3">
                  <span className="text-[10px] text-gray-300">{language === 'ar' ? 'عدد:' : 'Count:'} </span>
                  <span className="font-mono font-bold">{funds.length}</span>
                </div>
                <div className="border-l border-gray-600 px-2"></div>
                <div className="text-center border-l border-gray-600 px-2">
                  <span className="font-mono font-bold text-green-300">
                    {funds.reduce((sum, f) => sum + getFundConvertedBalance(f, selectedCurrency), 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-l border-gray-600 px-2"></div>
                <div className="text-center border-l border-gray-600 px-2">
                  <span className={`font-mono font-bold ${funds.reduce((sum, f) => sum + getFundTodayChange(f, selectedCurrency), 0) >= 0 ? 'text-green-300' : 'text-rose-300'}`}>
                    {funds.reduce((sum, f) => sum + getFundTodayChange(f, selectedCurrency), 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-l border-gray-600 px-2"></div>
                <div className="px-2">
                  <span className="text-[10px] text-gray-400">{selectedCurrency === 'ALL' ? 'SAR' : selectedCurrency}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddFundDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      
      <QuickReceiptDialog 
        open={isReceiptDialogOpen} 
        onOpenChange={setIsReceiptDialogOpen}
        selectedFundId={selectedFundId || undefined}
        funds={simpleFunds}
      />
      
      <QuickPaymentDialog 
        open={isPaymentDialogOpen} 
        onOpenChange={setIsPaymentDialogOpen}
        selectedFundId={selectedFundId || undefined}
        funds={simpleFunds}
      />
      
      <FundTransferDialog 
        open={isTransferDialogOpen} 
        onOpenChange={setIsTransferDialogOpen}
        selectedFundId={selectedFundId || undefined}
        funds={simpleFunds}
      />

      {/* Old Fund Transaction Sheet - keeping for reference */}
      {/* <FundTransactionSheet
        open={transactionSheetOpen}
        onOpenChange={setTransactionSheetOpen}
        fund={selectedFundForSheet}
        selectedCurrency={selectedCurrency === 'ALL' ? undefined : selectedCurrency}
      /> */}

      {/* Fund Details Sheet - Universal */}
      <UniversalDetailSheet
        isOpen={transactionSheetOpen}
        onClose={() => {
          setTransactionSheetOpen(false);
          setSelectedFundForSheet(null);
        }}
        docType="fund"
        data={selectedFundForSheet}
      />

      <CurrencyExchangeDialog
        open={isExchangeDialogOpen}
        onOpenChange={setIsExchangeDialogOpen}
        fund={selectedFundForExchange}
      />
    </div>
  );
}
