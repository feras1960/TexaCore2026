import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, Calendar, Eye } from 'lucide-react';
import { ReportPreviewDialog, ReportData } from '@/components/shared/ReportPreviewDialog';

export default function IncomeStatement() {
  const { t, language } = useLanguage();
  const { currencyCode: cc } = useCompanyCurrency();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Report data for preview
  const reportData: ReportData = {
    title: language === 'ar' ? 'قائمة الدخل' : 'Income Statement',
    subtitle: language === 'ar' ? 'قائمة الإيرادات والمصروفات' : 'Statement of Revenue and Expenses',
    period: language === 'ar' ? 'للفترة المنتهية في 31/12/2024' : 'For the Period Ending 31/12/2024',
    company: language === 'ar' ? 'شركة النظام المتكامل' : 'ERP Company',
    type: 'table',
    summaryItems: [
      { label: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', value: `${cc} 175,000`, type: 'positive' },
      { label: language === 'ar' ? 'تكلفة المبيعات' : 'COGS', value: `${cc} 75,000`, type: 'negative' },
      { label: language === 'ar' ? 'مجمل الربح' : 'Gross Profit', value: `${cc} 100,000`, type: 'positive' },
      { label: language === 'ar' ? 'صافي الدخل' : 'Net Income', value: `${cc} 35,000`, type: 'positive' },
    ],
    headers: [
      language === 'ar' ? 'البند' : 'Item',
      language === 'ar' ? 'المبلغ' : 'Amount',
    ],
    rows: [
      [language === 'ar' ? 'إيرادات المبيعات' : 'Sales Revenue', `${cc} 150,000`],
      [language === 'ar' ? 'إيرادات الخدمات' : 'Service Revenue', `${cc} 25,000`],
      [language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', `${cc} 175,000`],
      ['', ''],
      [language === 'ar' ? 'مخزون أول المدة' : 'Opening Inventory', `${cc} 20,000`],
      [language === 'ar' ? 'المشتريات' : 'Purchases', `${cc} 80,000`],
      [language === 'ar' ? 'مخزون آخر المدة' : 'Closing Inventory', `(${cc} 25,000)`],
      [language === 'ar' ? 'تكلفة البضاعة المباعة' : 'Total COGS', `${cc} 75,000`],
      ['', ''],
      [language === 'ar' ? 'مجمل الربح' : 'Gross Profit', `${cc} 100,000`],
      ['', ''],
      [language === 'ar' ? 'الرواتب والأجور' : 'Salaries & Wages', `${cc} 45,000`],
      [language === 'ar' ? 'الإيجارات' : 'Rent', `${cc} 15,000`],
      [language === 'ar' ? 'المرافق' : 'Utilities', `${cc} 5,000`],
      [language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses', `${cc} 65,000`],
    ],
    totals: [
      { label: language === 'ar' ? 'صافي الدخل' : 'Net Income', value: `${cc} 35,000`, highlight: true },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold font-cairo text-erp-navy">{t('accounting.incomeStatement')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {t('period') || 'Period'}
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

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Revenue Section */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-erp-navy border-b pb-2">{t('revenue') || 'Revenue'}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('salesRevenue') || 'Sales Revenue'}</span>
                <span className="font-mono">150,000.00</span>
              </div>
              <div className="flex justify-between">
                <span>{t('serviceRevenue') || 'Service Revenue'}</span>
                <span className="font-mono">25,000.00</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>{t('totalRevenue') || 'Total Revenue'}</span>
                <span className="font-mono text-green-600">175,000.00</span>
              </div>
            </div>
          </div>

          {/* COGS Section */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-erp-navy border-b pb-2">{t('cogs') || 'Cost of Goods Sold'}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('openingInventory') || 'Opening Inventory'}</span>
                <span className="font-mono">20,000.00</span>
              </div>
              <div className="flex justify-between">
                <span>{t('purchases') || 'Purchases'}</span>
                <span className="font-mono">80,000.00</span>
              </div>
              <div className="flex justify-between">
                <span>{t('closingInventory') || 'Closing Inventory'}</span>
                <span className="font-mono">(25,000.00)</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>{t('totalCogs') || 'Total COGS'}</span>
                <span className="font-mono text-red-600">75,000.00</span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center font-bold text-xl">
            <span>{t('grossProfit') || 'Gross Profit'}</span>
            <span className="font-mono text-erp-navy">100,000.00</span>
          </div>

          {/* Expenses Section */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-erp-navy border-b pb-2">{t('expenses') || 'Operating Expenses'}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('salariesAndWages') || 'Salaries & Wages'}</span>
                <span className="font-mono">45,000.00</span>
              </div>
              <div className="flex justify-between">
                <span>{t('rent') || 'Rent'}</span>
                <span className="font-mono">15,000.00</span>
              </div>
              <div className="flex justify-between">
                <span>{t('utilities') || 'Utilities'}</span>
                <span className="font-mono">5,000.00</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>{t('totalExpenses') || 'Total Expenses'}</span>
                <span className="font-mono text-red-600">65,000.00</span>
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className="bg-erp-navy text-white p-4 rounded-lg flex justify-between items-center font-bold text-xl">
            <span>{t('netIncome') || 'Net Income'}</span>
            <span className="font-mono">35,000.00</span>
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
