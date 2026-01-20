/**
 * Journal Entry Lines Tab
 * تبويب بنود القيد المحاسبي
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
  TableFooter,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface JournalLinesTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
  onRowClick?: (row: any) => void;
}

export function JournalLinesTab({ data, language, onAction, onRowClick }: JournalLinesTabProps) {
  const isRTL = language === 'ar';
  const lines = data.lines || [];
  
  // Calculate totals
  const totalDebit = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleAccountClick = (line: any) => {
    if (onRowClick) {
      onRowClick({
        ...line,
        docType: 'account',
        id: line.accountId || line.account_id,
        code: line.accountCode,
        name: line.accountName,
      });
    }
  };

  if (lines.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {isRTL ? 'لا توجد بنود في هذا القيد' : 'No lines in this entry'}
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
                <TableHead className="w-12 text-center border border-slate-200 dark:border-slate-700 px-2">
                  #
                </TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'الحساب' : 'Account'}
                </TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'البيان' : 'Description'}
                </TableHead>
                <TableHead className="w-28 text-center border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'مدين' : 'Debit'}
                </TableHead>
                <TableHead className="w-28 text-center border border-slate-200 dark:border-slate-700 px-3">
                  {isRTL ? 'دائن' : 'Credit'}
                </TableHead>
                {lines.some((l: any) => l.costCenter) && (
                  <TableHead className="border border-slate-200 dark:border-slate-700 px-3">
                    {isRTL ? 'مركز التكلفة' : 'Cost Center'}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line: any, index: number) => (
                <TableRow 
                  key={line.id || index}
                  className={cn(
                    "hover:bg-blue-50/80 dark:hover:bg-slate-800 transition-all",
                    index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50',
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => handleAccountClick(line)}
                >
                  <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 text-sm text-gray-500">
                    {line.lineNo || index + 1}
                  </TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-700 px-3">
                    <div>
                      <p className="font-mono text-xs text-gray-400">{line.accountCode}</p>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {isRTL ? line.accountNameAr || line.accountName : line.accountName}
                      </p>
                      {line.party && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {line.partyType === 'customer' 
                            ? (isRTL ? 'عميل:' : 'Customer:') 
                            : (isRTL ? 'مورد:' : 'Supplier:')} {line.party}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-700 px-3 text-sm text-gray-600 dark:text-gray-400">
                    {isRTL ? line.descriptionAr || line.description : line.description || '-'}
                  </TableCell>
                  <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3">
                    {line.debit > 0 ? (
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {line.debit.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3">
                    {line.credit > 0 ? (
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {line.credit.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  {lines.some((l: any) => l.costCenter) && (
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3 text-sm">
                      {isRTL ? line.costCenterAr || line.costCenter : line.costCenter || '-'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-erp-navy text-white">
              <TableRow>
                <TableCell colSpan={3} className="border border-slate-600 px-3 text-start font-bold">
                  {isRTL ? 'الإجمالي' : 'Total'}
                  {!isBalanced && (
                    <Badge variant="destructive" className="ms-2">
                      {isRTL ? 'غير متوازن!' : 'Unbalanced!'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center border border-slate-600 px-3 font-mono font-bold text-emerald-300">
                  {totalDebit.toLocaleString()}
                </TableCell>
                <TableCell className="text-center border border-slate-600 px-3 font-mono font-bold text-rose-300">
                  {totalCredit.toLocaleString()}
                </TableCell>
                {lines.some((l: any) => l.costCenter) && (
                  <TableCell className="border border-slate-600 px-3" />
                )}
              </TableRow>
              {!isBalanced && (
                <TableRow className="bg-red-900/50">
                  <TableCell colSpan={3} className="border border-slate-600 px-3 text-start text-red-200">
                    {isRTL ? 'الفرق:' : 'Difference:'}
                  </TableCell>
                  <TableCell colSpan={2} className="text-center border border-slate-600 px-3 font-mono font-bold text-red-200">
                    {Math.abs(totalDebit - totalCredit).toLocaleString()}
                  </TableCell>
                  {lines.some((l: any) => l.costCenter) && (
                    <TableCell className="border border-slate-600 px-3" />
                  )}
                </TableRow>
              )}
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
