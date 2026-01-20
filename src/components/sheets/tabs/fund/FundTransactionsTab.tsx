/**
 * Fund Transactions Tab
 * تبويب عمليات الصندوق
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FundTransactionsTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
  onRowClick?: (row: any) => void;
}

const getTransactionTypeConfig = (type: string, isRTL: boolean) => {
  const configs: Record<string, { icon: any; color: string; label: string }> = {
    receipt: { 
      icon: ArrowDownRight, 
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', 
      label: isRTL ? 'مقبوضات' : 'Receipt' 
    },
    deposit: { 
      icon: ArrowDownRight, 
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', 
      label: isRTL ? 'إيداع' : 'Deposit' 
    },
    payment: { 
      icon: ArrowUpRight, 
      color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', 
      label: isRTL ? 'مدفوعات' : 'Payment' 
    },
    withdrawal: { 
      icon: ArrowUpRight, 
      color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', 
      label: isRTL ? 'سحب' : 'Withdrawal' 
    },
    transfer: { 
      icon: ArrowRightLeft, 
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', 
      label: isRTL ? 'تحويل' : 'Transfer' 
    },
    exchange: { 
      icon: RefreshCw, 
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', 
      label: isRTL ? 'تصريف' : 'Exchange' 
    },
  };
  return configs[type] || configs.receipt;
};

export function FundTransactionsTab({ data, language, onAction, onRowClick }: FundTransactionsTabProps) {
  const isRTL = language === 'ar';
  
  // Get transactions from data
  const transactions = data.transactions || data.movements || [];
  
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {isRTL ? 'لا توجد عمليات في هذا الصندوق' : 'No transactions in this fund'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100 dark:bg-slate-800">
              <TableRow className="border-b-2 border-slate-300 dark:border-slate-600">
                <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'التاريخ' : 'Date'}
                </TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'النوع' : 'Type'}
                </TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'المرجع' : 'Reference'}
                </TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'البيان' : 'Description'}
                </TableHead>
                <TableHead className="w-24 text-center border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'وارد' : 'In'}
                </TableHead>
                <TableHead className="w-24 text-center border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'صادر' : 'Out'}
                </TableHead>
                <TableHead className="w-28 text-center border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'الرصيد' : 'Balance'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any, index: number) => {
                const typeConfig = getTransactionTypeConfig(tx.type || tx.transaction_type, isRTL);
                const TypeIcon = typeConfig.icon;
                const isInflow = ['receipt', 'deposit'].includes(tx.type || tx.transaction_type);
                
                return (
                  <TableRow 
                    key={tx.id || index}
                    className={cn(
                      "hover:bg-blue-50/80 dark:hover:bg-slate-800 transition-all",
                      index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50',
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(tx)}
                  >
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tx.date ? new Date(tx.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3">
                      <Badge className={cn("gap-1", typeConfig.color)}>
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3">
                      <span className="font-mono text-sm">{tx.reference || tx.voucher_no || '-'}</span>
                    </TableCell>
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isRTL ? tx.descriptionAr || tx.description : tx.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3">
                      {isInflow ? (
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          +{(tx.amount || tx.inAmount || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3">
                      {!isInflow ? (
                        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                          -{(tx.amount || tx.outAmount || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3">
                      <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                        {(tx.balance || tx.running_balance || 0).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
