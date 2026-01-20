import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, HelpCircle, DollarSign, BarChart3, FileText, Info, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import TrialBalance from './TrialBalance';
import IncomeStatement from './IncomeStatement';
import BalanceSheet from './BalanceSheet';
import QuickActionsBar from './components/QuickActionsBar';

export default function AccountingReports() {
  const { t, direction, language } = useLanguage();
  const [profitLossOpen, setProfitLossOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [activeHelpTopic, setActiveHelpTopic] = useState<'trial' | 'income' | 'balance' | 'profitLoss'>('trial');

  // Mock Profit & Loss Data
  const profitLossData = {
    totalRevenue: 175000,
    totalExpenses: 125000,
    netProfit: 50000,
    profitMargin: 28.57,
    monthlyData: [
      { month: language === 'ar' ? 'يناير' : 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
      { month: language === 'ar' ? 'فبراير' : 'Feb', revenue: 52000, expenses: 38000, profit: 14000 },
      { month: language === 'ar' ? 'مارس' : 'Mar', revenue: 48000, expenses: 35000, profit: 13000 },
      { month: language === 'ar' ? 'أبريل' : 'Apr', revenue: 30000, expenses: 20000, profit: 10000 },
    ],
    revenueBreakdown: [
      { name: language === 'ar' ? 'إيرادات المبيعات' : 'Sales Revenue', amount: 150000, percentage: 85.7 },
      { name: language === 'ar' ? 'إيرادات الخدمات' : 'Service Revenue', amount: 25000, percentage: 14.3 },
    ],
    expenseBreakdown: [
      { name: language === 'ar' ? 'تكلفة البضاعة المباعة' : 'Cost of Goods Sold', amount: 75000, percentage: 60 },
      { name: language === 'ar' ? 'الرواتب والأجور' : 'Salaries & Wages', amount: 30000, percentage: 24 },
      { name: language === 'ar' ? 'الإيجارات' : 'Rent', amount: 12000, percentage: 9.6 },
      { name: language === 'ar' ? 'مصاريف أخرى' : 'Other Expenses', amount: 8000, percentage: 6.4 },
    ],
  };

  const helpContent = {
    trial: {
      title: language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance',
      description: language === 'ar' 
        ? 'ميزان المراجعة هو قائمة بجميع حسابات الشركة مع أرصدتها في تاريخ معين. يُستخدم للتأكد من أن إجمالي المدين يساوي إجمالي الدائن.'
        : 'The Trial Balance is a list of all company accounts with their balances at a specific date. It is used to verify that total debits equal total credits.',
      purpose: language === 'ar'
        ? 'التحقق من دقة القيود المحاسبية وتوازن الدفاتر'
        : 'Verify accuracy of accounting entries and balance of books',
      howToRead: language === 'ar'
        ? [
            'عمود المدين: يحتوي على أرصدة الأصول والمصروفات',
            'عمود الدائن: يحتوي على أرصدة الالتزامات والإيرادات وحقوق الملكية',
            'إذا تساوى المجموعان فالدفاتر متوازنة',
          ]
        : [
            'Debit column: Contains balances of assets and expenses',
            'Credit column: Contains balances of liabilities, revenues, and equity',
            'If totals are equal, books are balanced',
          ],
    },
    income: {
      title: language === 'ar' ? 'قائمة الدخل' : 'Income Statement',
      description: language === 'ar'
        ? 'قائمة الدخل تُظهر إيرادات ومصروفات الشركة خلال فترة زمنية محددة، وتحدد صافي الربح أو الخسارة.'
        : 'The Income Statement shows company revenues and expenses over a specific period, determining net profit or loss.',
      purpose: language === 'ar'
        ? 'قياس أداء الشركة المالي ومعرفة مصادر الربح والخسارة'
        : 'Measure company financial performance and identify profit/loss sources',
      howToRead: language === 'ar'
        ? [
            'الإيرادات: المبالغ المكتسبة من النشاط الأساسي',
            'تكلفة المبيعات: التكاليف المباشرة للبضاعة المباعة',
            'مجمل الربح = الإيرادات - تكلفة المبيعات',
            'صافي الربح = مجمل الربح - المصروفات التشغيلية',
          ]
        : [
            'Revenue: Amounts earned from core activities',
            'COGS: Direct costs of goods sold',
            'Gross Profit = Revenue - COGS',
            'Net Profit = Gross Profit - Operating Expenses',
          ],
    },
    balance: {
      title: language === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet',
      description: language === 'ar'
        ? 'الميزانية العمومية تُظهر المركز المالي للشركة في لحظة معينة من خلال عرض الأصول والالتزامات وحقوق الملكية.'
        : 'The Balance Sheet shows the company\'s financial position at a specific point in time by displaying assets, liabilities, and equity.',
      purpose: language === 'ar'
        ? 'معرفة ما تملكه الشركة وما عليها من التزامات'
        : 'Know what the company owns and owes',
      howToRead: language === 'ar'
        ? [
            'الأصول = الالتزامات + حقوق الملكية (المعادلة المحاسبية)',
            'الأصول المتداولة: يمكن تحويلها لنقد خلال سنة',
            'الأصول الثابتة: أصول طويلة الأجل',
            'الالتزامات: ديون الشركة للغير',
            'حقوق الملكية: ما يملكه المساهمون',
          ]
        : [
            'Assets = Liabilities + Equity (Accounting Equation)',
            'Current Assets: Can be converted to cash within a year',
            'Fixed Assets: Long-term assets',
            'Liabilities: Company debts to others',
            'Equity: What shareholders own',
          ],
    },
    profitLoss: {
      title: language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Report',
      description: language === 'ar'
        ? 'تقرير الأرباح والخسائر يُقدم ملخصاً شاملاً لأداء الشركة المالي، يوضح الإيرادات والمصروفات وصافي الربح أو الخسارة.'
        : 'The Profit & Loss report provides a comprehensive summary of the company\'s financial performance, showing revenues, expenses, and net profit or loss.',
      purpose: language === 'ar'
        ? 'تقييم ربحية الشركة واتخاذ قرارات استراتيجية'
        : 'Evaluate company profitability and make strategic decisions',
      howToRead: language === 'ar'
        ? [
            'صافي الربح = إجمالي الإيرادات - إجمالي المصروفات',
            'هامش الربح = (صافي الربح / الإيرادات) × 100',
            'الرقم الإيجابي يعني ربح، السلبي يعني خسارة',
            'قارن بين الفترات لمعرفة اتجاه الأداء',
          ]
        : [
            'Net Profit = Total Revenue - Total Expenses',
            'Profit Margin = (Net Profit / Revenue) × 100',
            'Positive number means profit, negative means loss',
            'Compare periods to understand performance trends',
          ],
    },
  };

  const openHelp = (topic: 'trial' | 'income' | 'balance' | 'profitLoss') => {
    setActiveHelpTopic(topic);
    setHelpDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy font-cairo mb-2">{t('accounting.reports')}</h1>
          <p className="text-gray-500 font-tajawal">{t('accounting.reportsDescription')}</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <QuickActionsBar />
        </div>
      </div>

      <Tabs defaultValue="trial-balance" dir={direction} className="w-full">
        <TabsList className="w-full justify-start bg-transparent p-0 border-b rounded-none h-auto">
          <div className="flex items-center">
            <TabsTrigger 
              value="trial-balance"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-erp-navy data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 font-cairo"
            >
              {t('accounting.trialBalance')}
            </TabsTrigger>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100" onClick={() => openHelp('trial')}>
              <HelpCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center">
            <TabsTrigger 
              value="income-statement"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-erp-navy data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 font-cairo"
            >
              {t('incomeStatement') || 'Income Statement'}
            </TabsTrigger>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100" onClick={() => openHelp('income')}>
              <HelpCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center">
            <TabsTrigger 
              value="balance-sheet"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-erp-navy data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 font-cairo"
            >
              {t('accounting.balanceSheet')}
            </TabsTrigger>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100" onClick={() => openHelp('balance')}>
              <HelpCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
          {/* Profit & Loss Button */}
          <div className="flex items-center mr-auto">
            <Button 
              onClick={() => setProfitLossOpen(true)}
              size="sm"
              className="h-8 px-3 gap-1.5 bg-gradient-to-r from-erp-navy to-erp-teal hover:from-erp-navy/90 hover:to-erp-teal/90 text-white"
            >
              <DollarSign className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الأرباح والخسائر' : 'Profit & Loss'}
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100" onClick={() => openHelp('profitLoss')}>
              <HelpCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TabsList>
        
        <TabsContent value="trial-balance" className="mt-6">
          <TrialBalance />
        </TabsContent>
        
        <TabsContent value="income-statement" className="mt-6">
          <IncomeStatement />
        </TabsContent>

        <TabsContent value="balance-sheet" className="mt-6">
          <BalanceSheet />
        </TabsContent>
      </Tabs>

      {/* Profit & Loss Sheet */}
      <Sheet open={profitLossOpen} onOpenChange={setProfitLossOpen}>
        <SheetContent 
          side={direction === 'rtl' ? 'left' : 'right'} 
          className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 overflow-hidden"
          dir={direction}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <SheetHeader className="p-6 bg-gradient-to-r from-erp-navy to-erp-teal text-white">
              <div className="flex justify-between items-start">
                <div>
                  <SheetTitle className="text-2xl font-cairo text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    {language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Report'}
                  </SheetTitle>
                  <SheetDescription className="text-white/80 mt-2">
                    {language === 'ar' ? 'ملخص شامل للأداء المالي للشركة' : 'Comprehensive summary of company financial performance'}
                  </SheetDescription>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => openHelp('profitLoss')}>
                  <HelpCircle className="w-5 h-5" />
                </Button>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-tajawal">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                        <p className="text-2xl font-bold font-mono text-green-700">{profitLossData.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <ArrowUpRight className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-tajawal">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</p>
                        <p className="text-2xl font-bold font-mono text-red-700">{profitLossData.totalExpenses.toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <ArrowDownRight className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${profitLossData.netProfit >= 0 ? 'bg-erp-navy' : 'bg-red-600'} text-white`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/80 font-tajawal">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</p>
                        <p className="text-2xl font-bold font-mono">{profitLossData.netProfit.toLocaleString()}</p>
                        <Badge variant="secondary" className="mt-1 bg-white/20 text-white">
                          {profitLossData.profitMargin.toFixed(1)}% {language === 'ar' ? 'هامش الربح' : 'Margin'}
                        </Badge>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        {profitLossData.netProfit >= 0 ? (
                          <TrendingUp className="w-6 h-6" />
                        ) : (
                          <TrendingDown className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Performance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-cairo text-erp-navy">
                    {language === 'ar' ? 'الأداء الشهري' : 'Monthly Performance'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profitLossData.monthlyData.map((month, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-16 font-bold text-erp-navy font-tajawal">{month.month}</div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">{language === 'ar' ? 'إيرادات' : 'Revenue'}</p>
                            <p className="font-mono text-green-600">{month.revenue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{language === 'ar' ? 'مصروفات' : 'Expenses'}</p>
                            <p className="font-mono text-red-600">{month.expenses.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{language === 'ar' ? 'ربح' : 'Profit'}</p>
                            <p className={`font-mono font-bold ${month.profit >= 0 ? 'text-erp-teal' : 'text-red-600'}`}>
                              {month.profit.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue & Expense Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-cairo text-green-700 text-base">
                      {language === 'ar' ? 'توزيع الإيرادات' : 'Revenue Breakdown'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profitLossData.revenueBreakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-tajawal">{item.name}</span>
                        <div className="text-end">
                          <p className="font-mono text-green-700">{item.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{item.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-cairo text-red-700 text-base">
                      {language === 'ar' ? 'توزيع المصروفات' : 'Expense Breakdown'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profitLossData.expenseBreakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm font-tajawal">{item.name}</span>
                        <div className="text-end">
                          <p className="font-mono text-red-700">{item.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{item.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="w-full max-w-lg" dir={direction}>
          <DialogHeader>
            <DialogTitle className="font-cairo text-erp-navy flex items-center gap-2">
              <Info className="w-5 h-5 text-erp-teal" />
              {helpContent[activeHelpTopic].title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-gray-700 font-tajawal leading-relaxed">
                {helpContent[activeHelpTopic].description}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-erp-navy font-cairo mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {language === 'ar' ? 'الهدف' : 'Purpose'}
              </h4>
              <p className="text-gray-600 font-tajawal text-sm">
                {helpContent[activeHelpTopic].purpose}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-erp-navy font-cairo mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {language === 'ar' ? 'كيف تقرأ هذا التقرير؟' : 'How to read this report?'}
              </h4>
              <ul className="space-y-2">
                {helpContent[activeHelpTopic].howToRead.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600 font-tajawal">
                    <span className="w-5 h-5 rounded-full bg-erp-teal/20 text-erp-teal flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
