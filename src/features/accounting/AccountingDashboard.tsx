import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';

import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  FileText,
  Plus,
  ArrowRightLeft,
  Book,
  Calendar,
  CreditCard,
  MoreHorizontal,
  RefreshCw,
  Settings2,
  GripVertical,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  Receipt,
  Percent,
  Building,
  PieChart,
  BarChart3,
  TrendingUp as TrendUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import NewJournalEntrySheet from './components/NewJournalEntrySheet';
import GeneralLedgerSheet from './components/GeneralLedgerSheet';
import FundTransferDialog from './components/FundTransferDialog';
import CurrencyExchangeDialog from './components/CurrencyExchangeDialog';
import TransactionDetailsSheet from './components/TransactionDetailsSheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Widget configuration type
interface Widget {
  id: string;
  titleAr: string;
  titleEn: string;
  type: 'kpi' | 'chart' | 'list' | 'alert';
  size: 'small' | 'medium' | 'large';
  enabled: boolean;
  order: number;
}

// Default widget configurations
const defaultWidgets: Widget[] = [
  { id: 'liquidity', titleAr: 'نسبة السيولة', titleEn: 'Liquidity Ratio', type: 'kpi', size: 'small', enabled: true, order: 0 },
  { id: 'profitMargin', titleAr: 'هامش الربح الصافي', titleEn: 'Net Profit Margin', type: 'kpi', size: 'small', enabled: true, order: 1 },
  { id: 'dso', titleAr: 'أيام الذمم المدينة', titleEn: 'Days Sales Outstanding', type: 'kpi', size: 'small', enabled: true, order: 2 },
  { id: 'dpo', titleAr: 'أيام الذمم الدائنة', titleEn: 'Days Payables Outstanding', type: 'kpi', size: 'small', enabled: true, order: 3 },
  { id: 'cashFlowChart', titleAr: 'التدفق النقدي الشهري', titleEn: 'Monthly Cash Flow', type: 'chart', size: 'medium', enabled: true, order: 4 },
  { id: 'expenseBreakdown', titleAr: 'توزيع المصروفات', titleEn: 'Expense Breakdown', type: 'chart', size: 'medium', enabled: true, order: 5 },
  { id: 'overdueAlerts', titleAr: 'تنبيهات الذمم المتأخرة', titleEn: 'Overdue Alerts', type: 'alert', size: 'medium', enabled: true, order: 6 },
  { id: 'vatSummary', titleAr: 'ملخص ضريبة القيمة المضافة', titleEn: 'VAT Summary', type: 'kpi', size: 'small', enabled: true, order: 7 },
  { id: 'pendingItems', titleAr: 'البنود المعلقة', titleEn: 'Pending Items', type: 'list', size: 'medium', enabled: true, order: 8 },
  { id: 'revenueComparison', titleAr: 'مقارنة الإيرادات', titleEn: 'Revenue Comparison', type: 'chart', size: 'large', enabled: false, order: 9 },
];

export default function AccountingDashboard() {
  const { t, direction, language } = useLanguage();
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isGeneralLedgerOpen, setIsGeneralLedgerOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [defaultTab, setDefaultTab] = useState<'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange'>('journal');
  const [isWidgetSettingsOpen, setIsWidgetSettingsOpen] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('accounting-dashboard-widgets');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Save widgets to localStorage when changed
  useEffect(() => {
    localStorage.setItem('accounting-dashboard-widgets', JSON.stringify(widgets));
  }, [widgets]);

  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    if (draggedWidget && draggedWidget !== widgetId) {
      const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
      const targetIndex = widgets.findIndex(w => w.id === widgetId);
      
      const newWidgets = [...widgets];
      const [removed] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, removed);
      
      // Update order values
      newWidgets.forEach((w, i) => w.order = i);
      setWidgets(newWidgets);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  // Reset widgets to default
  const resetWidgets = () => {
    setWidgets(defaultWidgets);
    localStorage.removeItem('accounting-dashboard-widgets');
  };

  // Get enabled widgets sorted by order
  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  // Mock funds data for transfer dialog
  const fundsData = [
    { id: 1, name: 'الصندوق الرئيسي', type: 'cash', balance: 45000 },
    { id: 2, name: 'بنك الراجحي', type: 'bank', balance: 125000 },
    { id: 3, name: 'بنك الأهلي', type: 'bank', balance: 85000 },
    { id: 4, name: 'صندوق المصروفات', type: 'cash', balance: 12000 },
  ];

  // Mock fund data for exchange dialog
  const exchangeFundData = {
    id: 1,
    name: 'الصندوق الرئيسي',
    type: 'cash' as const,
    defaultCurrency: 'SAR',
    accountNumber: 'FUND-001',
    balances: [
      { currency: 'SAR', balance: 45000, totalDeposits: 100000, totalWithdrawals: 55000, todayChange: 2500 },
      { currency: 'USD', balance: 5000, totalDeposits: 8000, totalWithdrawals: 3000, todayChange: 500 },
      { currency: 'EUR', balance: 3000, totalDeposits: 5000, totalWithdrawals: 2000, todayChange: 0 },
    ],
    lastActivity: '2024-03-20',
    transactionCount: 156
  };

  // Mock Data
  const recentTransactions = [
    { id: 'JV-2024-001', date: '2024-03-20', description: t('officeRentPayment') || 'Office Rent Payment', type: 'Payment', amount: 5000, status: 'posted' },
    { id: 'JV-2024-002', date: '2024-03-19', description: `${t('clientInvoice') || 'Client Invoice'} #INV-001`, type: 'Invoice', amount: 12500, status: 'posted' },
    { id: 'JV-2024-003', date: '2024-03-18', description: t('officeSupplies') || 'Office Supplies', type: 'Expense', amount: 450, status: 'draft' },
    { id: 'JV-2024-004', date: '2024-03-18', description: t('consultingServices') || 'Consulting Services', type: 'Invoice', amount: 3000, status: 'posted' },
    { id: 'JV-2024-005', date: '2024-03-17', description: t('internetBill') || 'Internet Bill', type: 'Bill', amount: 120, status: 'posted' },
  ];

  // Summary stats
  const stats = {
    revenue: 124500,
    revenueChange: 12.5,
    expenses: 45200,
    expensesChange: -2.4,
    netProfit: 79300,
    netProfitChange: 8.2,
    cashFlow: 32000,
    cashFlowChange: 5.1
  };

  // Accounts watchlist
  const watchlistAccounts = [
    { name: t('cashOnHand') || 'Cash on Hand', code: '1110', category: t('currentAssets') || 'Current Assets', balance: 12450, type: 'debit' },
    { name: t('bankAlBilad') || 'Bank Al-Bilad', code: '1120', category: t('bankAccounts') || 'Bank Accounts', balance: 85200, type: 'debit' },
    { name: t('accountsReceivable') || 'Accounts Receivable', code: '1130', category: t('currentAssets') || 'Current Assets', balance: 45100, type: 'debit', alert: true },
    { name: t('accountsPayable') || 'Accounts Payable', code: '2110', category: t('currentLiabilities') || 'Current Liabilities', balance: 28300, type: 'credit' },
  ];

  // Additional widget data
  const widgetData = {
    liquidity: { value: 2.4, target: 2.0, status: 'good' as const },
    profitMargin: { value: 18.5, target: 15.0, status: 'good' as const },
    dso: { value: 32, target: 30, status: 'warning' as const },
    dpo: { value: 45, target: 45, status: 'good' as const },
    vat: { collected: 15200, paid: 8500, net: 6700, dueDate: '2024-04-15' },
    pendingItems: [
      { type: 'journal', label: language === 'ar' ? 'قيود بانتظار المراجعة' : 'Journals pending review', count: 3 },
      { type: 'reconciliation', label: language === 'ar' ? 'تسويات بنكية معلقة' : 'Bank reconciliations pending', count: 2 },
      { type: 'invoice', label: language === 'ar' ? 'فواتير بحاجة للاعتماد' : 'Invoices awaiting approval', count: 5 },
    ],
    overdueAlerts: [
      { customer: language === 'ar' ? 'شركة الأمل التجارية' : 'Al-Amal Trading Co.', amount: 12500, days: 45, invoiceId: 'INV-2024-042' },
      { customer: language === 'ar' ? 'مؤسسة النور' : 'Al-Noor Est.', amount: 8200, days: 30, invoiceId: 'INV-2024-058' },
      { customer: language === 'ar' ? 'شركة البناء الحديث' : 'Modern Construction', amount: 25000, days: 15, invoiceId: 'INV-2024-071' },
    ],
    cashFlowMonthly: [
      { month: language === 'ar' ? 'يناير' : 'Jan', inflow: 85000, outflow: 62000 },
      { month: language === 'ar' ? 'فبراير' : 'Feb', inflow: 92000, outflow: 71000 },
      { month: language === 'ar' ? 'مارس' : 'Mar', inflow: 78000, outflow: 58000 },
    ],
    expenseCategories: [
      { category: language === 'ar' ? 'الرواتب' : 'Salaries', amount: 45000, percentage: 45, color: 'bg-blue-500' },
      { category: language === 'ar' ? 'الإيجارات' : 'Rent', amount: 15000, percentage: 15, color: 'bg-green-500' },
      { category: language === 'ar' ? 'المرافق' : 'Utilities', amount: 8000, percentage: 8, color: 'bg-yellow-500' },
      { category: language === 'ar' ? 'التسويق' : 'Marketing', amount: 12000, percentage: 12, color: 'bg-purple-500' },
      { category: language === 'ar' ? 'أخرى' : 'Others', amount: 20000, percentage: 20, color: 'bg-gray-500' },
    ],
  };

  // Render widget content based on type
  const renderWidgetContent = (widget: Widget) => {
    switch (widget.id) {
      case 'liquidity':
        return (
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{language === 'ar' ? 'النسبة الحالية' : 'Current Ratio'}</span>
              <Percent className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white">{widgetData.liquidity.value}x</p>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'ar' ? 'الهدف:' : 'Target:'} {widgetData.liquidity.target}x
              </p>
              <div className="flex items-center gap-1 mt-2">
                <div className={`w-2 h-2 rounded-full ${widgetData.liquidity.status === 'good' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className={`text-xs ${widgetData.liquidity.status === 'good' ? 'text-green-600' : 'text-amber-600'}`}>
                  {widgetData.liquidity.status === 'good' ? (language === 'ar' ? 'صحي' : 'Healthy') : (language === 'ar' ? 'تحذير' : 'Warning')}
                </span>
              </div>
            </div>
          </div>
        );

      case 'profitMargin':
        return (
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{language === 'ar' ? 'صافي الهامش' : 'Net Margin'}</span>
              <TrendUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold font-mono text-erp-teal">{widgetData.profitMargin.value}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'ar' ? 'الهدف:' : 'Target:'} {widgetData.profitMargin.target}%
              </p>
              <Progress value={(widgetData.profitMargin.value / 25) * 100} className="h-1.5 mt-2" />
            </div>
          </div>
        );

      case 'dso':
        return (
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{language === 'ar' ? 'متوسط التحصيل' : 'Avg. Collection'}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white">
                {widgetData.dso.value} <span className="text-base text-gray-400">{language === 'ar' ? 'يوم' : 'days'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'ar' ? 'الهدف:' : 'Target:'} {widgetData.dso.target} {language === 'ar' ? 'يوم' : 'days'}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <div className={`w-2 h-2 rounded-full ${widgetData.dso.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'}`} />
                <span className={`text-xs ${widgetData.dso.status === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>
                  {widgetData.dso.value > widgetData.dso.target ? `+${widgetData.dso.value - widgetData.dso.target}` : ''}
                </span>
              </div>
            </div>
          </div>
        );

      case 'dpo':
        return (
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{language === 'ar' ? 'متوسط السداد' : 'Avg. Payment'}</span>
              <Receipt className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold font-mono text-erp-navy dark:text-white">
                {widgetData.dpo.value} <span className="text-base text-gray-400">{language === 'ar' ? 'يوم' : 'days'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'ar' ? 'الهدف:' : 'Target:'} {widgetData.dpo.target} {language === 'ar' ? 'يوم' : 'days'}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">{language === 'ar' ? 'ضمن الهدف' : 'On Target'}</span>
              </div>
            </div>
          </div>
        );

      case 'vatSummary':
        return (
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{language === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT Summary'}</span>
              <Building className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{language === 'ar' ? 'محصّلة:' : 'Collected:'}</span>
                <span className="font-mono text-green-600">+{widgetData.vat.collected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{language === 'ar' ? 'مدفوعة:' : 'Paid:'}</span>
                <span className="font-mono text-red-600">-{widgetData.vat.paid.toLocaleString()}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="text-xs font-medium">{language === 'ar' ? 'صافي:' : 'Net:'}</span>
                <span className="font-mono font-bold text-erp-navy dark:text-white">{widgetData.vat.net.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">
                {language === 'ar' ? 'موعد التقديم:' : 'Due:'} {widgetData.vat.dueDate}
              </p>
            </div>
          </div>
        );

      case 'overdueAlerts':
        return (
          <div className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{language === 'ar' ? 'ذمم متأخرة' : 'Overdue Receivables'}</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="space-y-2">
              {widgetData.overdueAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-800">
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{alert.customer}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{alert.invoiceId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono text-red-600">{alert.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-red-500">{alert.days} {language === 'ar' ? 'يوم' : 'days'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'pendingItems':
        return (
          <div className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{language === 'ar' ? 'بنود معلقة' : 'Pending Items'}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="space-y-2">
              {widgetData.pendingItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded-md border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/20 cursor-pointer transition-colors">
                  <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
                  <Badge variant="outline" className="bg-white dark:bg-gray-800 text-amber-600 border-amber-300">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cashFlowChart':
        return (
          <div className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{language === 'ar' ? 'التدفق النقدي' : 'Cash Flow'}</span>
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="space-y-3">
              {widgetData.cashFlowMonthly.map((month, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{month.month}</span>
                    <span className={`font-mono ${month.inflow > month.outflow ? 'text-green-600' : 'text-red-600'}`}>
                      {month.inflow > month.outflow ? '+' : ''}{(month.inflow - month.outflow).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${(month.inflow / (month.inflow + month.outflow)) * 100}%` }} 
                    />
                    <div 
                      className="bg-red-400 h-full" 
                      style={{ width: `${(month.outflow / (month.inflow + month.outflow)) * 100}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{language === 'ar' ? 'وارد:' : 'In:'} {month.inflow.toLocaleString()}</span>
                    <span>{language === 'ar' ? 'صادر:' : 'Out:'} {month.outflow.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'expenseBreakdown':
        return (
          <div className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{language === 'ar' ? 'توزيع المصروفات' : 'Expense Breakdown'}</span>
              <PieChart className="w-4 h-4 text-purple-500" />
            </div>
            <div className="space-y-2">
              {widgetData.expenseCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                      {cat.category}
                    </span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{cat.amount.toLocaleString()}</span>
                  </div>
                  <Progress value={cat.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'revenueComparison':
        return (
          <div className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{language === 'ar' ? 'مقارنة الإيرادات' : 'Revenue Comparison'}</span>
              <TrendUp className="w-4 h-4 text-erp-teal" />
            </div>
            <div className="flex items-end justify-around h-32 pt-4">
              <div className="text-center">
                <div className="bg-gray-300 dark:bg-gray-600 w-12 rounded-t" style={{ height: '60px' }} />
                <p className="text-xs text-gray-500 mt-1">2023</p>
                <p className="text-xs font-mono">850K</p>
              </div>
              <div className="text-center">
                <div className="bg-erp-teal w-12 rounded-t" style={{ height: '80px' }} />
                <p className="text-xs text-gray-500 mt-1">2024</p>
                <p className="text-xs font-mono">1.12M</p>
              </div>
            </div>
            <p className="text-center text-xs text-green-600 mt-2">+31.8% {language === 'ar' ? 'نمو' : 'growth'}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">{t('accountingDashboard')}</h1>
        <div className="flex items-center gap-2">
          {/* Widget Settings Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => setIsWidgetSettingsOpen(true)}
              >
                <Settings2 className="w-5 h-5" />
                <span className="hidden md:inline">{language === 'ar' ? 'تخصيص' : 'Customize'}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => { setDefaultTab('receipt'); setIsNewEntryOpen(true); }}>
                <ArrowDownRight className="w-5 h-5" />
                <span className="hidden md:inline">{t('accounting.receipts')}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => { setDefaultTab('payment'); setIsNewEntryOpen(true); }}>
                <ArrowUpRight className="w-5 h-5" />
                <span className="hidden md:inline">{t('accounting.payments')}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => { setDefaultTab('cash'); setIsNewEntryOpen(true); }}>
                <Wallet className="w-5 h-5" />
                <span className="hidden md:inline">{t('cashJournal') || 'يومية صندوق'}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => { setDefaultTab('transfer'); setIsNewEntryOpen(true); }}>
                <ArrowRightLeft className="w-5 h-5" />
                <span className="hidden md:inline">{t('accounting.transfer')}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => { setDefaultTab('exchange'); setIsNewEntryOpen(true); }}>
                <RefreshCw className="w-5 h-5" />
                <span className="hidden md:inline">{t('accounting.exchange')}</span>
              </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 text-erp-teal border-erp-teal/30 hover:bg-erp-teal/10 dark:text-erp-teal dark:border-erp-teal/30 dark:hover:bg-erp-teal/20 font-medium" onClick={() => { setDefaultTab('journal'); setIsNewEntryOpen(true); }}>
                <Plus className="w-5 h-5" />
                {t('accounting.journalEntry')}
              </Button>
        </div>
      </div>

      

      {/* Unified Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
        {/* Revenue */}
        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
          <TrendingUp className="w-5 h-5 text-erp-teal/70" />
          <div>
            <p className="text-sm text-gray-500">{t('totalRevenue') || 'Revenue'}</p>
            <p className="font-mono text-xl font-bold text-erp-teal">
              ${stats.revenue.toLocaleString()}
              <span className="text-xs font-normal ml-1">+{stats.revenueChange}%</span>
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
          <TrendingDown className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">{t('totalExpenses') || 'Expenses'}</p>
            <p className="font-mono text-xl font-bold text-erp-navy dark:text-gray-300">
              ${stats.expenses.toLocaleString()}
              <span className="text-xs font-normal text-erp-teal ml-1">{stats.expensesChange}%</span>
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
          <Wallet className="w-5 h-5 text-erp-navy/60" />
          <div>
            <p className="text-sm text-gray-500">{t('netProfit') || 'Net Profit'}</p>
            <p className="font-mono text-xl font-bold text-erp-navy dark:text-white">
              ${stats.netProfit.toLocaleString()}
              <span className="text-xs font-normal text-erp-teal ml-1">+{stats.netProfitChange}%</span>
            </p>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="flex items-center gap-3 pe-5 border-e border-gray-200 dark:border-gray-700">
          <ArrowRightLeft className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">{t('cashFlow') || 'Cash Flow'}</p>
            <p className="font-mono text-xl font-bold text-erp-teal">
              ${stats.cashFlow.toLocaleString()}
              <span className="text-xs font-normal ml-1">+{stats.cashFlowChange}%</span>
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Period selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {t('thisMonth') || 'This Month'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>{t('today') || 'Today'}</DropdownMenuItem>
            <DropdownMenuItem>{t('thisWeek') || 'This Week'}</DropdownMenuItem>
            <DropdownMenuItem>{t('thisMonth') || 'This Month'}</DropdownMenuItem>
            <DropdownMenuItem>{t('thisQuarter') || 'This Quarter'}</DropdownMenuItem>
            <DropdownMenuItem>{t('thisYear') || 'This Year'}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Customizable Widgets Grid */}
      {enabledWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {enabledWidgets.map((widget) => (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              className={`
                bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 
                ${widget.size === 'small' ? 'col-span-1' : widget.size === 'medium' ? 'col-span-1 md:col-span-2' : 'col-span-2 md:col-span-4'}
                ${draggedWidget === widget.id ? 'opacity-50 border-dashed border-erp-teal' : ''}
                hover:border-erp-teal/50 transition-all cursor-move group relative
                ${widget.size === 'small' ? 'min-h-[140px]' : widget.size === 'medium' ? 'min-h-[180px]' : 'min-h-[200px]'}
              `}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWidget(widget.id);
                }}
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>
              {renderWidgetContent(widget)}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-medium text-erp-navy dark:text-white">{t('recentTransactions') || 'Recent Transactions'}</h3>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500">
              {t('viewAll') || 'View All'}
            </Button>
          </div>
          <Table className="border-collapse">
            <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow className="h-12 border-b-2 border-slate-300 dark:border-slate-600">
                <TableHead className="text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5">{t('reference') || 'Ref'}</TableHead>
                <TableHead className="text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5">{t('date') || 'Date'}</TableHead>
                <TableHead className="text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5">{t('description') || 'Description'}</TableHead>
                <TableHead className="w-[100px] text-center text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5">{t('amount') || 'Amount'}</TableHead>
                <TableHead className="w-[80px] text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5">{t('status') || 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((tx, index) => (
                <TableRow 
                  key={tx.id} 
                  className={`h-12 hover:bg-blue-50/80 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50'}`}
                  onClick={() => {
                    setSelectedTransaction(tx);
                    setIsTransactionDetailsOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-sm text-slate-600 border border-slate-200 dark:border-slate-700 px-4 py-2.5">{tx.id}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-2.5">{tx.date}</TableCell>
                  <TableCell className="text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5">{tx.description}</TableCell>
                  <TableCell className="text-center font-mono text-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                    {tx.type === 'Payment' || tx.type === 'Expense' || tx.type === 'Bill' ? (
                      <span className="text-rose-600 font-semibold">-{tx.amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">+{tx.amount.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                    <span className={`text-sm font-medium ${tx.status === 'posted' ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {tx.status === 'posted' ? '✓' : '○'} {t(tx.status) || tx.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Accounts Watchlist */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-medium text-erp-navy dark:text-white">{t('accountsWatchlist') || 'Watchlist'}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-2 space-y-1">
            {watchlistAccounts.map((account, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-erp-navy dark:text-white truncate">{account.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{account.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-bold text-sm ${account.alert ? 'text-amber-500' : 'text-erp-navy dark:text-white'}`}>
                    ${account.balance.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">{account.type === 'debit' ? 'Dr' : 'Cr'}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500">
              <Plus className="w-3 h-3 mr-1" />
              {t('addAccount') || 'Add to Watchlist'}
            </Button>
          </div>
        </div>
      </div>
      <NewJournalEntrySheet 
        open={isNewEntryOpen} 
        onOpenChange={setIsNewEntryOpen} 
        defaultTab={defaultTab}
      />
      <GeneralLedgerSheet 
        open={isGeneralLedgerOpen} 
        onOpenChange={setIsGeneralLedgerOpen} 
      />
      <FundTransferDialog 
        open={isTransferDialogOpen} 
        onOpenChange={setIsTransferDialogOpen}
        funds={fundsData}
      />
      <CurrencyExchangeDialog 
        open={isExchangeDialogOpen} 
        onOpenChange={setIsExchangeDialogOpen}
        fund={exchangeFundData}
      />
      <TransactionDetailsSheet
        open={isTransactionDetailsOpen}
        onOpenChange={setIsTransactionDetailsOpen}
        transaction={selectedTransaction}
        onSave={(updatedTx) => {
          console.log('Transaction updated:', updatedTx);
          setIsTransactionDetailsOpen(false);
        }}
      />

      {/* Widget Settings Dialog */}
      <Dialog open={isWidgetSettingsOpen} onOpenChange={setIsWidgetSettingsOpen}>
        <DialogContent className="w-full sm:max-w-[500px]" dir={direction}>
          <DialogHeader>
            <DialogTitle className="font-cairo text-erp-navy dark:text-white">
              {language === 'ar' ? 'تخصيص لوحة المعلومات' : 'Customize Dashboard'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-500">
              {language === 'ar' 
                ? 'اختر الويدجت التي تريد إظهارها في لوحة المعلومات. يمكنك سحب وإفلات الويدجت لإعادة ترتيبها.'
                : 'Choose which widgets to display on your dashboard. You can drag and drop widgets to reorder them.'}
            </p>
            <Separator />
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.id)}
                  onDragOver={(e) => handleDragOver(e, widget.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-move
                    ${widget.enabled 
                      ? 'bg-white dark:bg-gray-800 border-erp-teal/30' 
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'}
                    ${draggedWidget === widget.id ? 'border-dashed border-erp-teal' : ''}
                    hover:border-erp-teal/50
                  `}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {language === 'ar' ? widget.titleAr : widget.titleEn}
                      </p>
                      <p className="text-xs text-gray-400">
                        {widget.type === 'kpi' && (language === 'ar' ? 'مؤشر' : 'KPI')}
                        {widget.type === 'chart' && (language === 'ar' ? 'رسم بياني' : 'Chart')}
                        {widget.type === 'list' && (language === 'ar' ? 'قائمة' : 'List')}
                        {widget.type === 'alert' && (language === 'ar' ? 'تنبيهات' : 'Alerts')}
                        {' • '}
                        {widget.size === 'small' && (language === 'ar' ? 'صغير' : 'Small')}
                        {widget.size === 'medium' && (language === 'ar' ? 'متوسط' : 'Medium')}
                        {widget.size === 'large' && (language === 'ar' ? 'كبير' : 'Large')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {widget.enabled ? (
                      <Eye className="w-4 h-4 text-erp-teal" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={resetWidgets}>
                {language === 'ar' ? 'إعادة تعيين' : 'Reset to Default'}
              </Button>
              <Button size="sm" onClick={() => setIsWidgetSettingsOpen(false)} className="bg-erp-navy hover:bg-erp-navy/90">
                {language === 'ar' ? 'تم' : 'Done'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
