import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, Calendar, Eye } from 'lucide-react';
import { ReportPreviewDialog, ReportData } from '@/components/shared/ReportPreviewDialog';

export default function BalanceSheet() {
  const { t, language } = useLanguage();
  const { currencyCode: cc } = useCompanyCurrency();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Report data for preview
  const reportData: ReportData = {
    title: language === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet',
    subtitle: language === 'ar' ? 'قائمة المركز المالي' : 'Statement of Financial Position',
    period: language === 'ar' ? 'كما في 31/12/2024' : 'As of 31/12/2024',
    company: language === 'ar' ? 'شركة النظام المتكامل' : 'ERP Company',
    type: 'table',
    summaryItems: [
      { label: language === 'ar' ? 'إجمالي الأصول' : 'Total Assets', value: `${cc} 190,000` },
      { label: language === 'ar' ? 'إجمالي الالتزامات' : 'Total Liabilities', value: `${cc} 55,000`, type: 'negative' },
      { label: language === 'ar' ? 'حقوق الملكية' : 'Total Equity', value: `${cc} 135,000`, type: 'positive' },
    ],
    headers: [
      language === 'ar' ? 'البند' : 'Item',
      language === 'ar' ? 'المبلغ' : 'Amount',
    ],
    rows: [
      [language === 'ar' ? '=== الأصول ===' : '=== ASSETS ===', ''],
      [language === 'ar' ? 'النقد والنقد المعادل' : 'Cash & Equivalents', `${cc} 50,000`],
      [language === 'ar' ? 'الذمم المدينة' : 'Accounts Receivable', `${cc} 30,000`],
      [language === 'ar' ? 'المخزون' : 'Inventory', `${cc} 25,000`],
      [language === 'ar' ? 'إجمالي الأصول المتداولة' : 'Total Current Assets', `${cc} 105,000`],
      ['', ''],
      [language === 'ar' ? 'المعدات' : 'Equipment', `${cc} 80,000`],
      [language === 'ar' ? 'الأثاث' : 'Furniture', `${cc} 20,000`],
      [language === 'ar' ? 'مجمع الإهلاك' : 'Accumulated Depreciation', `(${cc} 15,000)`],
      [language === 'ar' ? 'إجمالي الأصول الثابتة' : 'Total Fixed Assets', `${cc} 85,000`],
      ['', ''],
      [language === 'ar' ? '=== الالتزامات ===' : '=== LIABILITIES ===', ''],
      [language === 'ar' ? 'الذمم الدائنة' : 'Accounts Payable', `${cc} 45,000`],
      [language === 'ar' ? 'قروض قصيرة الأجل' : 'Short-term Loans', `${cc} 10,000`],
      [language === 'ar' ? 'إجمالي الالتزامات' : 'Total Liabilities', `${cc} 55,000`],
      ['', ''],
      [language === 'ar' ? '=== حقوق الملكية ===' : '=== EQUITY ===', ''],
      [language === 'ar' ? 'رأس المال' : 'Capital', `${cc} 100,000`],
      [language === 'ar' ? 'الأرباح المحتجزة' : 'Retained Earnings', `${cc} 35,000`],
      [language === 'ar' ? 'إجمالي حقوق الملكية' : 'Total Equity', `${cc} 135,000`],
    ],
    totals: [
      { label: language === 'ar' ? 'إجمالي الأصول' : 'Total Assets', value: `${cc} 190,000`, highlight: false },
      { label: language === 'ar' ? 'إجمالي الالتزامات وحقوق الملكية' : 'Total Liabilities & Equity', value: `${cc} 190,000`, highlight: true },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold font-cairo text-erp-navy">{t('accounting.balanceSheet')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {t('asOfDate') || 'As of Date'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <Card className="h-full">
          <CardContent className="p-6 space-y-6">
            <h4 className="font-bold text-xl mb-4 text-erp-navy border-b pb-2">{t('assets') || 'Assets'}</h4>

            <div>
              <h5 className="font-bold text-gray-600 mb-2">{t('currentAssets') || 'Current Assets'}</h5>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>{t('cashAndEquivalents') || 'Cash & Equivalents'}</span>
                  <span className="font-mono">50,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('accountsReceivable') || 'Accounts Receivable'}</span>
                  <span className="font-mono">30,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('inventoryAsset') || 'Inventory'}</span>
                  <span className="font-mono">25,000.00</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                  <span>{t('totalCurrentAssets') || 'Total Current Assets'}</span>
                  <span className="font-mono">105,000.00</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-gray-600 mb-2">{t('fixedAssets') || 'Fixed Assets'}</h5>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>{t('equipment') || 'Equipment'}</span>
                  <span className="font-mono">80,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('furniture') || 'Furniture'}</span>
                  <span className="font-mono">20,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('accumulatedDepreciation') || 'Less: Accumulated Depreciation'}</span>
                  <span className="font-mono text-red-600">(15,000.00)</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                  <span>{t('totalFixedAssets') || 'Total Fixed Assets'}</span>
                  <span className="font-mono">85,000.00</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center font-bold text-lg mt-auto">
              <span>{t('totalAssets') || 'Total Assets'}</span>
              <span className="font-mono text-erp-navy">190,000.00</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card className="h-full">
          <CardContent className="p-6 space-y-6">
            <h4 className="font-bold text-xl mb-4 text-erp-navy border-b pb-2">{t('liabilitiesAndEquity') || 'Liabilities & Equity'}</h4>

            <div>
              <h5 className="font-bold text-gray-600 mb-2">{t('liabilities') || 'Liabilities'}</h5>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>{t('accountsPayable') || 'Accounts Payable'}</span>
                  <span className="font-mono">45,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('shortTermLoans') || 'Short-term Loans'}</span>
                  <span className="font-mono">10,000.00</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                  <span>{t('totalLiabilities') || 'Total Liabilities'}</span>
                  <span className="font-mono">55,000.00</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-gray-600 mb-2">{t('equity') || 'Equity'}</h5>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>{t('capital') || 'Capital'}</span>
                  <span className="font-mono">100,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('retainedEarnings') || 'Retained Earnings'}</span>
                  <span className="font-mono">35,000.00</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                  <span>{t('totalEquity') || 'Total Equity'}</span>
                  <span className="font-mono">135,000.00</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center font-bold text-lg mt-auto">
              <span>{t('totalLiabilitiesEquity') || 'Total Liabilities & Equity'}</span>
              <span className="font-mono text-erp-navy">190,000.00</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview Dialog */}
      <ReportPreviewDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportData={reportData}
      />
    </div>
  );
}
