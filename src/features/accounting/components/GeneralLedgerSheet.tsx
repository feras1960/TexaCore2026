import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Filter, Search, X, Book, Download, Printer } from 'lucide-react';
import { flatAccounts, costCenters } from '../data/accountingData';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import { useCompanyCurrencies } from '@/hooks/useCompanyCurrencies';
import { SmartCurrencySelector } from './shared/CurrencySelector';

interface GeneralLedgerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock Data Type
interface GLEntry {
  id: string;
  date: string;
  voucherType: string;
  voucherNo: string;
  account: string;
  party?: string;
  costCenter?: string;
  project?: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'posted' | 'cancelled' | 'draft';
}

export default function GeneralLedgerSheet({ open, onOpenChange }: GeneralLedgerSheetProps) {
  const { t, language, direction } = useLanguage();
  const { baseCurrency } = useCompanyCurrencies();

  // Filters State
  const [filters, setFilters] = useState({
    company: 'Main Company',
    financeBook: 'General Ledger',
    accountId: '',
    dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    currency: '',
    costCenter: '',
    project: '',
    voucherNo: '',
    showCancelled: false,
  });

  // Mock Data Generation based on filters
  const data = useMemo(() => {
    // Generate some deterministic mock data
    const entries: GLEntry[] = [];
    let balance = 0;

    // Simulate fetching data
    const types = ['Invoice', 'Payment', 'Receipt', 'Journal', 'Expense'];
    const count = 25;

    for (let i = 0; i < count; i++) {
      const isDebit = Math.random() > 0.4;
      const amount = Math.floor(Math.random() * 10000) + 100;
      const debit = isDebit ? amount : 0;
      const credit = !isDebit ? amount : 0;

      balance += (debit - credit);

      entries.push({
        id: `GL-${2024000 + i}`,
        date: format(subDays(new Date(), count - i), 'yyyy-MM-dd'),
        voucherType: types[Math.floor(Math.random() * types.length)],
        voucherNo: `JV-${1000 + i}`,
        account: filters.accountId ? flatAccounts.find(a => a.id === filters.accountId)?.name || 'Account' : 'Various Accounts',
        party: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'Customer A' : 'Supplier X') : '-',
        costCenter: Math.random() > 0.6 ? 'Sales Dept' : '-',
        project: Math.random() > 0.8 ? 'Project Alpha' : '-',
        debit,
        credit,
        balance,
        status: Math.random() > 0.95 ? 'cancelled' : 'posted'
      });
    }

    if (!filters.showCancelled) {
      return entries.filter(e => e.status !== 'cancelled');
    }
    return entries;
  }, [filters]);

  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit,
    }), { debit: 0, credit: 0 });
  }, [data]);

  const handleDateShortcut = (type: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear') => {
    const now = new Date();
    let from, to;

    switch (type) {
      case 'today':
        from = now;
        to = now;
        break;
      case 'yesterday':
        from = subDays(now, 1);
        to = subDays(now, 1);
        break;
      case 'thisWeek':
        from = startOfWeek(now, { weekStartsOn: 6 });
        to = endOfWeek(now, { weekStartsOn: 6 });
        break;
      case 'lastWeek':
        from = startOfWeek(subDays(now, 7), { weekStartsOn: 6 });
        to = endOfWeek(subDays(now, 7), { weekStartsOn: 6 });
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'thisYear':
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      case 'lastYear':
        from = startOfYear(subYears(now, 1));
        to = endOfYear(subYears(now, 1));
        break;
    }
    setFilters(prev => ({
      ...prev,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd')
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[85vw] md:w-[60%] lg:w-[50%] max-w-none p-0 flex flex-col h-full bg-gray-50 dark:bg-gray-900" side={direction === 'rtl' ? 'left' : 'right'}>
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-erp-navy p-2 rounded-lg text-white">
                <Book className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-cairo text-erp-navy dark:text-white">
                  {t('accounting.generalLedger')}
                </SheetTitle>
                <SheetDescription className="font-tajawal text-xs">
                  {t('accounting.generalLedger')} - {t('accounting.dashboardLabel')}
                </SheetDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">

            {/* Row 1 */}
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('company')}</Label>
              <Input
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="h-7 text-xs bg-white"
                dir={direction}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('financeBook')}</Label>
              <Select value={filters.financeBook} onValueChange={(v) => setFilters({ ...filters, financeBook: v })}>
                <SelectTrigger className="h-7 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General Ledger">General Ledger</SelectItem>
                  <SelectItem value="IFRS Book">IFRS Book</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[10px] text-gray-500">{t('accounting.account.code')}</Label>
              <Select value={filters.accountId} onValueChange={(v) => setFilters({ ...filters, accountId: v })}>
                <SelectTrigger className="h-7 text-xs bg-white">
                  <SelectValue placeholder={t('accounting.searchPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {flatAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {language === 'ar' ? acc.nameAr : acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('fromDate')}</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="h-7 text-xs bg-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('toDate')}</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="h-7 text-xs bg-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('accounting.account.currency')}</Label>
              <SmartCurrencySelector
                value={filters.currency || baseCurrency}
                onValueChange={(v) => setFilters({ ...filters, currency: v })}
                showAllOption={true}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('accounting.costCenters')}</Label>
              <Select value={filters.costCenter} onValueChange={(v) => setFilters({ ...filters, costCenter: v })}>
                <SelectTrigger className="h-7 text-xs bg-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {costCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{language === 'ar' ? cc.nameAr : cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3 - Collapsible or Extra */}
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('project')}</Label>
              <Input
                placeholder={t('optional') || 'Optional'}
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                className="h-7 text-xs bg-white"
                dir={direction}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('voucherNo')}</Label>
              <Input
                placeholder="e.g. JV-1001"
                value={filters.voucherNo}
                onChange={(e) => setFilters({ ...filters, voucherNo: e.target.value })}
                className="h-7 text-xs bg-white"
                dir={direction}
              />
            </div>
            <div className="space-y-1 flex items-center pt-5 gap-2 col-span-2">
              <Checkbox
                id="showCancelled"
                checked={filters.showCancelled}
                onCheckedChange={(c) => setFilters({ ...filters, showCancelled: c as boolean })}
              />
              <Label htmlFor="showCancelled" className="text-xs font-normal cursor-pointer">
                {t('showCancelled')}
              </Label>
            </div>
          </div>

          {/* Date Chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar mask-gradient">
            {[
              { label: t('filters.today'), key: 'today' },
              { label: t('filters.yesterday'), key: 'yesterday' },
              { label: t('filters.thisWeek'), key: 'thisWeek' },
              { label: t('filters.lastWeek'), key: 'lastWeek' },
              { label: t('filters.thisMonth'), key: 'thisMonth' },
              { label: t('filters.lastMonth'), key: 'lastMonth' },
              { label: t('filters.thisYear'), key: 'thisYear' },
            ].map((chip: any) => (
              <Button
                key={chip.key}
                variant="outline"
                size="sm"
                className="h-6 text-[10px] whitespace-nowrap rounded-full bg-white hover:bg-erp-teal hover:text-white border-gray-200 transition-colors"
                onClick={() => handleDateShortcut(chip.key)}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 bg-white dark:bg-gray-900 relative overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto scrollbar-thin h-full" style={{ maxHeight: '400px' }}>
            <Table className="border-collapse w-full" dir={direction}>
              <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                <TableRow className="h-8">
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('accounting.entry.date')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('voucherType')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('voucherNo')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy w-[200px]">{t('accounting.account.code')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('party')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('accounting.costCenters')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('accounting.entry.debit')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('accounting.entry.credit')}</TableHead>
                  <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('accounting.account.balance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      "hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors h-8",
                      entry.status === 'cancelled' && "opacity-50 line-through bg-gray-50"
                    )}
                  >
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{entry.date}</TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] text-center">{entry.voucherType}</TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center text-blue-600 hover:underline cursor-pointer">{entry.voucherNo}</TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-medium truncate max-w-[200px]">{entry.account}</TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate">{entry.party}</TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate">{entry.costCenter}</TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-gray-600">
                      {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-gray-600">
                      {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end font-bold text-erp-navy">
                      {entry.balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-gray-100 dark:bg-gray-800 sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                <TableRow className="h-9 border-t-2 border-erp-navy">
                  <TableCell colSpan={6} className="border border-gray-300 dark:border-gray-700 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                    {t('totals')}
                  </TableCell>
                  <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white">
                    {totals.debit.toLocaleString()}
                  </TableCell>
                  <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white">
                    {totals.credit.toLocaleString()}
                  </TableCell>
                  <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-erp-navy text-white">
                    {(totals.debit - totals.credit).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
