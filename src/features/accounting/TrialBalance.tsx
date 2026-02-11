import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Download, Printer, Filter, Eye } from 'lucide-react';
import { ReportPreviewDialog, ReportData } from '@/components/shared/ReportPreviewDialog';

export default function TrialBalance() {
  const { t, language } = useLanguage();
  const { currencyCode: companyCurrency } = useCompanyCurrency();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Mock Data
  const data = [
    { code: '1010', account: 'Cash on Hand', debit: 50000, credit: 0 },
    { code: '1020', account: 'Bank Al-Rajhi', debit: 120000, credit: 0 },
    { code: '2010', account: 'Accounts Payable', debit: 0, credit: 45000 },
    { code: '3010', account: 'Capital', debit: 0, credit: 100000 },
    { code: '4010', account: 'Sales Revenue', debit: 0, credit: 85000 },
    { code: '5010', account: 'Rent Expense', debit: 15000, credit: 0 },
    { code: '5020', account: 'Salaries Expense', debit: 45000, credit: 0 },
  ];

  const totalDebit = data.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = data.reduce((sum, item) => sum + item.credit, 0);

  // Report data for preview
  const reportData: ReportData = {
    title: language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance',
    subtitle: language === 'ar' ? 'القائمة التفصيلية لأرصدة الحسابات' : 'Detailed Account Balances',
    period: language === 'ar' ? 'حتى تاريخ اليوم' : 'As of Today',
    company: language === 'ar' ? 'شركة النظام المتكامل' : 'ERP Company',
    type: 'table',
    summaryItems: [
      { label: language === 'ar' ? 'إجمالي المدين' : 'Total Debit', value: `${companyCurrency} ${totalDebit.toLocaleString()}`, type: 'positive' },
      { label: language === 'ar' ? 'إجمالي الدائن' : 'Total Credit', value: `${companyCurrency} ${totalCredit.toLocaleString()}`, type: 'negative' },
      { label: language === 'ar' ? 'الفرق' : 'Difference', value: `${companyCurrency} ${Math.abs(totalDebit - totalCredit).toLocaleString()}`, type: totalDebit === totalCredit ? 'positive' : 'negative' },
      { label: language === 'ar' ? 'عدد الحسابات' : 'Accounts', value: data.length.toString() },
    ],
    headers: [
      language === 'ar' ? 'رقم الحساب' : 'Account Code',
      language === 'ar' ? 'اسم الحساب' : 'Account Name',
      language === 'ar' ? 'مدين' : 'Debit',
      language === 'ar' ? 'دائن' : 'Credit',
    ],
    rows: data.map(row => [
      row.code,
      row.account,
      row.debit > 0 ? `${companyCurrency} ${row.debit.toLocaleString()}` : '-',
      row.credit > 0 ? `${companyCurrency} ${row.credit.toLocaleString()}` : '-',
    ]),
    totals: [
      { label: language === 'ar' ? 'إجمالي المدين' : 'Total Debit', value: `${companyCurrency} ${totalDebit.toLocaleString()}`, highlight: false },
      { label: language === 'ar' ? 'إجمالي الدائن' : 'Total Credit', value: `${companyCurrency} ${totalCredit.toLocaleString()}`, highlight: true },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold font-cairo text-erp-navy">{t('accounting.trialBalance')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            {t('filter') || 'Filter'}
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            {t('print') || 'Print'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('export') || 'Export'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-erp-teal border-erp-teal/30 hover:bg-erp-teal/10"
            onClick={() => setReportDialogOpen(true)}
          >
            <Eye className="w-4 h-4" />
            {language === 'ar' ? 'عرض التقرير' : 'View Report'}
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
            <Table className="border-collapse w-full">
              <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                <TableRow className="h-10 border-b-2 border-gray-300">
                  <TableHead className="w-[100px] border border-gray-300 bg-gray-100 dark:bg-gray-700 p-2 text-xs font-bold text-erp-navy dark:text-white">{t('accountCode') || 'Code'}</TableHead>
                  <TableHead className="border border-gray-300 bg-gray-100 dark:bg-gray-700 p-2 text-xs font-bold text-erp-navy dark:text-white">{t('accountName') || 'Account Name'}</TableHead>
                  <TableHead className="w-[120px] text-center border border-gray-300 bg-gray-100 dark:bg-gray-700 p-2 text-xs font-bold text-erp-navy dark:text-white">{t('debit') || 'Debit'}</TableHead>
                  <TableHead className="w-[120px] text-center border border-gray-300 bg-gray-100 dark:bg-gray-700 p-2 text-xs font-bold text-erp-navy dark:text-white">{t('credit') || 'Credit'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index} className={cn(
                    "h-10 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                    index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"
                  )}>
                    <TableCell className="text-[11px] font-mono border border-gray-200 p-2">{row.code}</TableCell>
                    <TableCell className="text-[11px] border border-gray-200 p-2">{row.account}</TableCell>
                    <TableCell className={`text-center text-[11px] font-mono border border-gray-200 p-2 ${row.debit > 0 ? "text-green-600 font-bold" : ""}`}>
                      {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-center text-[11px] font-mono border border-gray-200 p-2 ${row.credit > 0 ? "text-red-600 font-bold" : ""}`}>
                      {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Footer Totals - Aligned to columns */}
          <div className="shrink-0 border-t-2 border-erp-navy bg-erp-navy text-white">
            <div className="grid grid-cols-[100px_1fr_120px_120px] gap-0 py-2">
              <div className="border-l border-gray-600 px-3">
                <span className="text-[10px] text-gray-300">{t('total') || 'المجموع'}</span>
              </div>
              <div className="border-l border-gray-600 px-3">
                <span className="text-[10px] text-gray-300">{t('accounts') || 'حسابات'}: </span>
                <span className="font-mono font-bold">{data.length}</span>
              </div>
              <div className="text-center border-l border-gray-600 px-2">
                <span className="font-mono font-bold text-green-300">{totalDebit.toLocaleString()}</span>
              </div>
              <div className="text-center px-2">
                <span className="font-mono font-bold text-rose-300">{totalCredit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      <ReportPreviewDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportData={reportData}
      />
    </div>
  );
}
