import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  Printer,
  Wallet,
  Landmark
} from 'lucide-react';
import TransactionDetailsSheet from './components/TransactionDetailsSheet';

// Mock Data for Transactions
const mockTransactions = [
  { id: 'TRX-001', date: '2024-03-20', description: 'Opening Balance', type: 'deposit', amount: 50000, balance: 50000, status: 'completed', reference: 'OP-001', createdBy: 'Admin' },
  { id: 'TRX-002', date: '2024-03-21', description: 'Sales Deposit - Invoice #1023', type: 'deposit', amount: 12500, balance: 62500, status: 'completed', reference: 'INV-1023', createdBy: 'Ahmed' },
  { id: 'TRX-003', date: '2024-03-22', description: 'Office Rent Payment', type: 'withdrawal', amount: 5000, balance: 57500, status: 'completed', reference: 'EXP-001', createdBy: 'Sarah' },
  { id: 'TRX-004', date: '2024-03-23', description: 'Supplier Payment - ABC Corp', type: 'withdrawal', amount: 15000, balance: 42500, status: 'pending', reference: 'PO-992', createdBy: 'Ahmed' },
  { id: 'TRX-005', date: '2024-03-24', description: 'Petty Cash Replenishment', type: 'withdrawal', amount: 2000, balance: 40500, status: 'completed', reference: 'TR-005', createdBy: 'Sarah' },
];

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

interface FundDetailsProps {
  fundId?: string | number;
}

export default function FundDetails({ fundId: propFundId }: FundDetailsProps) {
  const { id: paramId } = useParams();
  const id = propFundId?.toString() || paramId;
  const navigate = useNavigate();
  const { t, direction } = useLanguage();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Mock Fund Info (In real app, fetch based on ID)
  const fundInfo = {
    id: id,
    name: id === '2' ? 'Bank Al-Bilad' : 'Main Cash Fund',
    type: id === '2' ? 'bank' : 'cash',
    balance: 40500,
    currency: '',
    accountNumber: id === '2' ? 'SA45 1234 5678 9012' : '-'
  };

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

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredAndSortedData = useMemo(() => {
    let data = [...mockTransactions];

    // Apply Filters
    Object.keys(filters).forEach((key) => {
      const value = filters[key].toLowerCase();
      if (value) {
        data = data.filter((item) =>
          String((item as any)[key]).toLowerCase().includes(value)
        );
      }
    });

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
  }, [filters, sortConfig]);

  const handleRowClick = (transaction: any) => {
    setSelectedTransaction(transaction);
  };

  const renderHeader = (label: string, key: string, options?: string[]) => (
    <div className="flex items-center gap-2">
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
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${filters[key] ? 'text-erp-teal' : 'text-gray-300'}`}>
            <Filter className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-gray-500 mb-1">Filter by {label}</h4>
            {options ? (
              <Select
                value={filters[key] || "all"}
                onValueChange={(value) => handleFilter(key, value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={`Search ${label}...`}
                value={filters[key] || ''}
                onChange={(e) => handleFilter(key, e.target.value)}
                className="h-8 text-sm"
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 h-full flex flex-col" dir={direction}>
      <div className="flex items-center gap-4 flex-none">
        {!propFundId && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/accounting/funds')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-2">
            {fundInfo.type === 'bank' ? <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />}
            {fundInfo.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-mono text-xs">{fundInfo.accountNumber}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border dark:border-gray-800 shadow-sm text-right mr-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('currentBalance')}</p>
            <p className="text-lg font-bold font-mono text-erp-navy dark:text-white leading-none">{fundInfo.balance.toLocaleString()} {fundInfo.currency}</p>
          </div>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            {t('print')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-gray-900 flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 pt-4 px-4 flex-none">
          <CardTitle className="font-cairo text-base text-erp-navy dark:text-white">{t('transactionHistory') || 'Transaction History'}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-bold border-l border-gray-300 h-10">{renderHeader(t('date'), 'date')}</TableHead>
                <TableHead className="border-l border-gray-300 h-10">{renderHeader(t('reference'), 'reference')}</TableHead>
                <TableHead className="border-l border-gray-300 h-10">{renderHeader(t('description'), 'description')}</TableHead>
                <TableHead className="w-[80px] border-l border-gray-300 h-10">{renderHeader(t('type'), 'type', ['deposit', 'withdrawal'])}</TableHead>
                <TableHead className="w-[100px] text-center font-bold border-l border-gray-300 h-10">{renderHeader(t('amount'), 'amount')}</TableHead>
                <TableHead className="w-[100px] text-center font-bold border-l border-gray-300 h-10">{t('balance')}</TableHead>
                <TableHead className="w-[80px] border-l border-gray-300 h-10">{renderHeader(t('status'), 'status', ['completed', 'pending'])}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((trx) => (
                  <TableRow
                    key={trx.id}
                    className="hover:bg-gray-100 border-b border-gray-200 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(trx)}
                  >
                    <TableCell className="font-mono text-xs border-l border-gray-200 py-2">{trx.date}</TableCell>
                    <TableCell className="font-mono text-xs border-l border-gray-200 py-2">{trx.reference}</TableCell>
                    <TableCell className="text-sm border-l border-gray-200 py-2">{trx.description}</TableCell>
                    <TableCell className="border-l border-gray-200 py-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${trx.type === 'deposit' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {t(trx.type) || trx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-center font-mono text-sm font-semibold border-l border-gray-200 py-2 ${trx.type === 'deposit' ? 'text-green-600' : 'text-rose-600'}`}>
                      {trx.type === 'deposit' ? '+' : '-'}{trx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm border-l border-gray-200 py-2">{trx.balance.toLocaleString()}</TableCell>
                    <TableCell className="border-l border-gray-200 py-2">
                      <span className={`text-[10px] ${trx.status === 'completed' ? 'text-green-600' : 'text-amber-500'}`}>
                        {trx.status === 'completed' ? '✓' : '○'} {t(trx.status) || trx.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500 dark:text-gray-400">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Sheet */}
      {selectedTransaction && (
        <TransactionDetailsSheet
          open={!!selectedTransaction}
          onOpenChange={(open) => !open && setSelectedTransaction(null)}
          transaction={{
            id: selectedTransaction.id,
            date: selectedTransaction.date,
            description: selectedTransaction.description,
            type: selectedTransaction.type === 'deposit' ? 'Receipt' : 'Payment',
            amount: selectedTransaction.amount,
            status: selectedTransaction.status === 'completed' ? 'posted' : 'pending',
            reference: selectedTransaction.reference,
            account: selectedTransaction.type === 'deposit' ? 'Cash' : 'Cash',
            counterAccount: selectedTransaction.description,
          }}
        />
      )}
    </div>
  );
}
