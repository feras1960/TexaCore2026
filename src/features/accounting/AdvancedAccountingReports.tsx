// ==============================================
// Advanced Accounting Reports Page
// التقارير المحاسبية المتقدمة - بنفس نمط تقارير المستودعات
// ==============================================

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Filter, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  History,
  Palette,
  CalendarIcon,
  BarChart3,
  DollarSign,
  Calculator,
  Users,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  UserCheck,
  Scale,
  Activity,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

// ==============================================
// Reconciliation Colors
// ==============================================

const RECONCILIATION_COLORS = [
  { id: 'none', color: 'transparent', bg: 'bg-transparent', label: 'بدون', labelEn: 'None' },
  { id: 'green', color: '#22c55e', bg: 'bg-green-100', label: 'أخضر', labelEn: 'Green' },
  { id: 'red', color: '#ef4444', bg: 'bg-red-100', label: 'أحمر', labelEn: 'Red' },
  { id: 'yellow', color: '#eab308', bg: 'bg-yellow-100', label: 'أصفر', labelEn: 'Yellow' },
  { id: 'blue', color: '#3b82f6', bg: 'bg-blue-100', label: 'أزرق', labelEn: 'Blue' },
  { id: 'purple', color: '#a855f7', bg: 'bg-purple-100', label: 'بنفسجي', labelEn: 'Purple' },
  { id: 'orange', color: '#f97316', bg: 'bg-orange-100', label: 'برتقالي', labelEn: 'Orange' },
  { id: 'gray', color: '#6b7280', bg: 'bg-gray-200', label: 'رمادي', labelEn: 'Gray' },
];

// ==============================================
// Report Types
// ==============================================

const reportTypes = [
  { id: 'income_statement', icon: FileText, labelAr: 'قائمة الدخل', labelEn: 'Income Statement' },
  { id: 'trial_balance', icon: Calculator, labelAr: 'ميزان المراجعة', labelEn: 'Trial Balance' },
  { id: 'overdue_debts', icon: AlertTriangle, labelAr: 'الديون المتأخرة', labelEn: 'Overdue Debts' },
  { id: 'installments', icon: CreditCard, labelAr: 'الأقساط', labelEn: 'Installments' },
  { id: 'kpi', icon: TrendingUp, labelAr: 'مؤشرات الأداء', labelEn: 'KPI' },
  { id: 'sales_performance', icon: UserCheck, labelAr: 'أداء المبيعات', labelEn: 'Sales Performance' },
];

// ==============================================
// Filter Options
// ==============================================

const branches = [
  { value: 'all', labelAr: 'جميع الفروع', labelEn: 'All Branches' },
  { value: 'main', labelAr: 'الفرع الرئيسي', labelEn: 'Main Branch' },
  { value: 'riyadh', labelAr: 'فرع الرياض', labelEn: 'Riyadh Branch' },
  { value: 'jeddah', labelAr: 'فرع جدة', labelEn: 'Jeddah Branch' },
];

const accountTypes = [
  { value: 'all', labelAr: 'الكل', labelEn: 'All' },
  { value: 'assets', labelAr: 'أصول', labelEn: 'Assets' },
  { value: 'liabilities', labelAr: 'خصوم', labelEn: 'Liabilities' },
  { value: 'equity', labelAr: 'حقوق الملكية', labelEn: 'Equity' },
  { value: 'revenue', labelAr: 'إيرادات', labelEn: 'Revenue' },
  { value: 'expenses', labelAr: 'مصروفات', labelEn: 'Expenses' },
];

const debtStatuses = [
  { value: 'all', labelAr: 'جميع الحالات', labelEn: 'All Status' },
  { value: 'critical', labelAr: 'حرج (+90 يوم)', labelEn: 'Critical (+90 days)' },
  { value: 'warning', labelAr: 'تحذير (60-90 يوم)', labelEn: 'Warning (60-90 days)' },
  { value: 'moderate', labelAr: 'متوسط (30-60 يوم)', labelEn: 'Moderate (30-60 days)' },
];

const installmentTypes = [
  { value: 'all', labelAr: 'جميع الأنواع', labelEn: 'All Types' },
  { value: 'customer', labelAr: 'عملاء', labelEn: 'Customers' },
  { value: 'supplier', labelAr: 'موردين', labelEn: 'Suppliers' },
  { value: 'loan', labelAr: 'قروض', labelEn: 'Loans' },
  { value: 'rent', labelAr: 'إيجارات', labelEn: 'Rent' },
];

const installmentStatuses = [
  { value: 'all', labelAr: 'جميع الحالات', labelEn: 'All Status' },
  { value: 'overdue', labelAr: 'متأخر', labelEn: 'Overdue' },
  { value: 'pending', labelAr: 'قادم', labelEn: 'Pending' },
  { value: 'paid', labelAr: 'مدفوع', labelEn: 'Paid' },
];

// ==============================================
// Mock Data
// ==============================================
// Mock Data - Income Statement
// ==============================================

const MOCK_INCOME_DATA = [
  { id: '1', account: 'المبيعات', accountEn: 'Sales', type: 'revenue', amount: 1250000, budget: 1200000, variance: 50000, percentVar: 4.2 },
  { id: '2', account: 'إيرادات الخدمات', accountEn: 'Service Revenue', type: 'revenue', amount: 180000, budget: 200000, variance: -20000, percentVar: -10 },
  { id: '3', account: 'إيرادات أخرى', accountEn: 'Other Revenue', type: 'revenue', amount: 45000, budget: 40000, variance: 5000, percentVar: 12.5 },
  { id: '4', account: 'تكلفة المبيعات', accountEn: 'Cost of Sales', type: 'expenses', amount: -750000, budget: -720000, variance: -30000, percentVar: -4.2 },
  { id: '5', account: 'رواتب الموظفين', accountEn: 'Employee Salaries', type: 'expenses', amount: -280000, budget: -270000, variance: -10000, percentVar: -3.7 },
  { id: '6', account: 'الإيجار', accountEn: 'Rent', type: 'expenses', amount: -120000, budget: -120000, variance: 0, percentVar: 0 },
  { id: '7', account: 'المرافق', accountEn: 'Utilities', type: 'expenses', amount: -35000, budget: -40000, variance: 5000, percentVar: 12.5 },
  { id: '8', account: 'التسويق', accountEn: 'Marketing', type: 'expenses', amount: -65000, budget: -50000, variance: -15000, percentVar: -30 },
  { id: '9', account: 'مصروفات إدارية', accountEn: 'Admin Expenses', type: 'expenses', amount: -48000, budget: -45000, variance: -3000, percentVar: -6.7 },
];

// Mock Data - Trial Balance
const MOCK_TRIAL_BALANCE = [
  { id: '1', code: '1100', account: 'النقدية', accountEn: 'Cash', type: 'assets', debit: 450000, credit: 0 },
  { id: '2', code: '1200', account: 'البنك', accountEn: 'Bank', type: 'assets', debit: 890000, credit: 0 },
  { id: '3', code: '1300', account: 'الذمم المدينة', accountEn: 'Accounts Receivable', type: 'assets', debit: 320000, credit: 0 },
  { id: '4', code: '1400', account: 'المخزون', accountEn: 'Inventory', type: 'assets', debit: 580000, credit: 0 },
  { id: '5', code: '2100', account: 'الذمم الدائنة', accountEn: 'Accounts Payable', type: 'liabilities', debit: 0, credit: 280000 },
  { id: '6', code: '2200', account: 'القروض', accountEn: 'Loans', type: 'liabilities', debit: 0, credit: 500000 },
  { id: '7', code: '3100', account: 'رأس المال', accountEn: 'Capital', type: 'equity', debit: 0, credit: 1000000 },
  { id: '8', code: '3200', account: 'الأرباح المحتجزة', accountEn: 'Retained Earnings', type: 'equity', debit: 0, credit: 460000 },
  { id: '9', code: '4100', account: 'المبيعات', accountEn: 'Sales', type: 'revenue', debit: 0, credit: 1250000 },
  { id: '10', code: '5100', account: 'تكلفة المبيعات', accountEn: 'Cost of Sales', type: 'expenses', debit: 750000, credit: 0 },
  { id: '11', code: '5200', account: 'الرواتب', accountEn: 'Salaries', type: 'expenses', debit: 280000, credit: 0 },
  { id: '12', code: '5300', account: 'الإيجار', accountEn: 'Rent', type: 'expenses', debit: 120000, credit: 0 },
  { id: '13', code: '5400', account: 'مصاريف أخرى', accountEn: 'Other Expenses', type: 'expenses', debit: 100000, credit: 0 },
];

// Mock Data - Overdue Debts
const mockOverdueDebts = [
  {
    id: '1',
    customerName: 'شركة النور للتجارة',
    customerCode: 'C001',
    invoiceNumber: 'INV-2024-0145',
    originalAmount: 45000,
    remainingAmount: 45000,
    dueDate: '2024-10-15',
    daysOverdue: 92,
    lastContact: '2024-12-20',
    phone: '0501234567',
    status: 'critical',
  },
  {
    id: '2',
    customerName: 'مؤسسة الأمل',
    customerCode: 'C002',
    invoiceNumber: 'INV-2024-0189',
    originalAmount: 28500,
    remainingAmount: 15000,
    dueDate: '2024-11-01',
    daysOverdue: 75,
    lastContact: '2024-12-28',
    phone: '0509876543',
    status: 'warning',
  },
  {
    id: '3',
    customerName: 'متجر السلام',
    customerCode: 'C003',
    invoiceNumber: 'INV-2024-0212',
    originalAmount: 12000,
    remainingAmount: 12000,
    dueDate: '2024-11-20',
    daysOverdue: 56,
    lastContact: '2024-12-15',
    phone: '0551122334',
    status: 'warning',
  },
  {
    id: '4',
    customerName: 'شركة البناء الحديث',
    customerCode: 'C004',
    invoiceNumber: 'INV-2024-0267',
    originalAmount: 85000,
    remainingAmount: 60000,
    dueDate: '2024-12-01',
    daysOverdue: 45,
    lastContact: '2025-01-10',
    phone: '0507654321',
    status: 'moderate',
  },
  {
    id: '5',
    customerName: 'مصنع الفجر',
    customerCode: 'C005',
    invoiceNumber: 'INV-2024-0298',
    originalAmount: 150000,
    remainingAmount: 150000,
    dueDate: '2024-09-01',
    daysOverdue: 137,
    lastContact: '2024-11-30',
    phone: '0503334455',
    status: 'critical',
  },
];

// Mock Data - Installments
const mockInstallments = [
  {
    id: '1',
    partyName: 'شركة التقنية المتقدمة',
    partyType: 'customer',
    contractNumber: 'CONT-2024-001',
    installmentNumber: 3,
    totalInstallments: 12,
    amount: 25000,
    dueDate: '2024-12-15',
    status: 'overdue',
    daysOverdue: 31,
    penalty: 750,
  },
  {
    id: '2',
    partyName: 'مؤسسة الخليج',
    partyType: 'customer',
    contractNumber: 'CONT-2024-002',
    installmentNumber: 5,
    totalInstallments: 10,
    amount: 18000,
    dueDate: '2025-01-01',
    status: 'overdue',
    daysOverdue: 14,
    penalty: 270,
  },
  {
    id: '3',
    partyName: 'البنك الأهلي - قرض معدات',
    partyType: 'loan',
    contractNumber: 'LOAN-2024-001',
    installmentNumber: 8,
    totalInstallments: 36,
    amount: 45000,
    dueDate: '2025-01-20',
    status: 'pending',
  },
  {
    id: '4',
    partyName: 'إيجار المستودع الرئيسي',
    partyType: 'rent',
    contractNumber: 'RENT-2024-001',
    installmentNumber: 12,
    totalInstallments: 12,
    amount: 35000,
    dueDate: '2025-01-25',
    status: 'pending',
  },
  {
    id: '5',
    partyName: 'شركة المعدات الصناعية',
    partyType: 'supplier',
    contractNumber: 'SUP-2024-003',
    installmentNumber: 2,
    totalInstallments: 6,
    amount: 55000,
    dueDate: '2024-11-30',
    status: 'overdue',
    daysOverdue: 46,
    penalty: 1650,
  },
  {
    id: '6',
    partyName: 'متجر الرياض',
    partyType: 'customer',
    contractNumber: 'CONT-2024-005',
    installmentNumber: 1,
    totalInstallments: 4,
    amount: 12000,
    dueDate: '2024-12-01',
    paidDate: '2024-11-28',
    status: 'paid',
  },
  {
    id: '7',
    partyName: 'مؤسسة الفرسان',
    partyType: 'customer',
    contractNumber: 'CONT-2024-006',
    installmentNumber: 4,
    totalInstallments: 8,
    amount: 22000,
    dueDate: '2024-12-25',
    paidDate: '2024-12-24',
    status: 'paid',
  },
];

// Mock Data - KPIs
const mockKPIs = [
  { name: 'العائد على الاستثمار (ROI)', nameEn: 'Return on Investment (ROI)', value: 18.5, target: 20, unit: '%', trend: 'up', change: 2.3 },
  { name: 'العائد على حقوق الملكية (ROE)', nameEn: 'Return on Equity (ROE)', value: 22.8, target: 25, unit: '%', trend: 'up', change: 1.5 },
  { name: 'نسبة السيولة الحالية', nameEn: 'Current Ratio', value: 1.85, target: 2, unit: '', trend: 'stable', change: 0.05 },
  { name: 'نسبة السيولة السريعة', nameEn: 'Quick Ratio', value: 1.2, target: 1.5, unit: '', trend: 'down', change: -0.1 },
  { name: 'معدل دوران المخزون', nameEn: 'Inventory Turnover', value: 6.2, target: 8, unit: 'مرة', trend: 'up', change: 0.4 },
  { name: 'معدل دوران الذمم المدينة', nameEn: 'AR Turnover (Days)', value: 45, target: 30, unit: 'يوم', trend: 'down', change: -5 },
  { name: 'هامش الربح الإجمالي', nameEn: 'Gross Profit Margin', value: 35.2, target: 40, unit: '%', trend: 'up', change: 1.8 },
  { name: 'هامش الربح الصافي', nameEn: 'Net Profit Margin', value: 12.5, target: 15, unit: '%', trend: 'stable', change: 0.2 },
];

// Mock Data - Sales Performance
const MOCK_SALES_PERFORMANCE = [
  { id: '1', name: 'أحمد محمد', sales: 450000, target: 400000, orders: 45, commission: 22500, achievement: 112.5 },
  { id: '2', name: 'سعيد العمري', sales: 380000, target: 350000, orders: 38, commission: 19000, achievement: 108.6 },
  { id: '3', name: 'خالد الفهد', sales: 320000, target: 350000, orders: 32, commission: 16000, achievement: 91.4 },
  { id: '4', name: 'محمد السالم', sales: 280000, target: 300000, orders: 28, commission: 14000, achievement: 93.3 },
  { id: '5', name: 'فهد الراشد', sales: 250000, target: 300000, orders: 25, commission: 12500, achievement: 83.3 },
];

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

// ==============================================
// Main Component
// ==============================================

export const AdvancedAccountingReports: React.FC = () => {
  const { language, direction } = useLanguage();
  const [reportType, setReportType] = useState('income_statement');
  const [branch, setBranch] = useState('all');
  const [accountType, setAccountType] = useState('all');
  const [debtStatus, setDebtStatus] = useState('all');
  const [installmentType, setInstallmentType] = useState('all');
  const [installmentStatus, setInstallmentStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  // Marked entries for reconciliation
  const [markedEntries, setMarkedEntries] = useState<Record<string, string>>({});
  const [selectedReconciliationColor, setSelectedReconciliationColor] = useState('green');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Detail Sheet state
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  // Toggle reconciliation mark
  const toggleReconciliationMark = (id: string) => {
    setMarkedEntries(prev => {
      if (prev[id]) {
        const { [id]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: selectedReconciliationColor };
    });
  };

  // Get reconciliation background color
  const getReconciliationBg = (id: string) => {
    const colorId = markedEntries[id];
    if (!colorId) return '';
    return RECONCILIATION_COLORS.find(c => c.id === colorId)?.bg || '';
  };

  // Reset filters
  const resetFilters = () => {
    setBranch('all');
    setAccountType('all');
    setDebtStatus('all');
    setInstallmentType('all');
    setInstallmentStatus('all');
    setSearchQuery('');
    setSortConfig(null);
    setMarkedEntries({});
    setDateFrom(startOfMonth(new Date()));
    setDateTo(new Date());
  };

  // Handle sort
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

  // Get summary stats
  const getSummaryStats = () => {
    switch (reportType) {
      case 'income_statement':
        const totalRevenue = MOCK_INCOME_DATA.filter(i => i.type === 'revenue').reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = Math.abs(MOCK_INCOME_DATA.filter(i => i.type === 'expenses').reduce((sum, i) => sum + i.amount, 0));
        return { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
      case 'trial_balance':
        const totalDebit = MOCK_TRIAL_BALANCE.reduce((sum, i) => sum + i.debit, 0);
        const totalCredit = MOCK_TRIAL_BALANCE.reduce((sum, i) => sum + i.credit, 0);
        return { totalDebit, totalCredit, balanced: totalDebit === totalCredit };
      case 'overdue_debts':
        return {
          totalDebts: mockOverdueDebts.length,
          totalAmount: mockOverdueDebts.reduce((sum, d) => sum + d.remainingAmount, 0),
          criticalCount: mockOverdueDebts.filter(d => d.status === 'critical').length,
        };
      case 'installments':
        return {
          totalInstallments: mockInstallments.length,
          overdueAmount: mockInstallments.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0),
          totalPenalties: mockInstallments.reduce((sum, i) => sum + (i.penalty || 0), 0),
        };
      default:
        return {};
    }
  };

  const stats = getSummaryStats() as any;

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let data: any[] = [];
    if (reportType === 'income_statement') data = [...MOCK_INCOME_DATA];
    else if (reportType === 'trial_balance') data = [...MOCK_TRIAL_BALANCE];
    else if (reportType === 'overdue_debts') data = [...mockOverdueDebts];
    else if (reportType === 'installments') data = [...mockInstallments];
    else if (reportType === 'kpi') data = [...mockKPIs];
    else if (reportType === 'sales_performance') data = [...MOCK_SALES_PERFORMANCE];
    else data = [...MOCK_INCOME_DATA];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(query)
        )
      );
    }

    // Apply status filters
    if (reportType === 'overdue_debts' && debtStatus !== 'all') {
      data = data.filter((item: any) => item.status === debtStatus);
    }
    if (reportType === 'installments') {
      if (installmentType !== 'all') {
        data = data.filter((item: any) => item.partyType === installmentType);
      }
      if (installmentStatus !== 'all') {
        data = data.filter((item: any) => item.status === installmentStatus);
      }
    }
    if ((reportType === 'income_statement' || reportType === 'trial_balance') && accountType !== 'all') {
      data = data.filter((item: any) => item.type === accountType);
    }

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
  }, [reportType, searchQuery, debtStatus, installmentType, installmentStatus, accountType, sortConfig]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1 text-[10px]"><AlertCircle className="h-3 w-3" />{language === 'ar' ? 'حرج' : 'Critical'}</Badge>;
      case 'warning':
        return <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500 text-[10px]"><AlertTriangle className="h-3 w-3" />{language === 'ar' ? 'تحذير' : 'Warning'}</Badge>;
      case 'moderate':
        return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500 text-[10px]"><Clock className="h-3 w-3" />{language === 'ar' ? 'متوسط' : 'Moderate'}</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="gap-1 text-[10px]"><AlertCircle className="h-3 w-3" />{language === 'ar' ? 'متأخر' : 'Overdue'}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500 text-[10px]"><Clock className="h-3 w-3" />{language === 'ar' ? 'قادم' : 'Pending'}</Badge>;
      case 'paid':
        return <Badge variant="outline" className="gap-1 border-green-500 text-green-500 text-[10px]"><CheckCircle2 className="h-3 w-3" />{language === 'ar' ? 'مدفوع' : 'Paid'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get party type icon
  const getPartyTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4 text-blue-500" />;
      case 'supplier': return <Building2 className="h-4 w-4 text-purple-500" />;
      case 'loan': return <Landmark className="h-4 w-4 text-green-500" />;
      case 'rent': return <Building2 className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  // Render filters based on report type
  const renderFilters = () => {
    switch (reportType) {
      case 'overdue_debts':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.value} value={b.value}>
                      {language === 'ar' ? b.labelAr : b.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'حالة الدين' : 'Debt Status'}</Label>
              <Select value={debtStatus} onValueChange={setDebtStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {debtStatuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {language === 'ar' ? s.labelAr : s.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-xs">{language === 'ar' ? 'بحث' : 'Search'}</Label>
              <Input 
                placeholder={language === 'ar' ? 'بحث بالزبون أو رقم الفاتورة...' : 'Search by customer or invoice...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        );
      
      case 'installments':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'نوع القسط' : 'Type'}</Label>
              <Select value={installmentType} onValueChange={setInstallmentType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {installmentTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {language === 'ar' ? t.labelAr : t.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
              <Select value={installmentStatus} onValueChange={setInstallmentStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {installmentStatuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {language === 'ar' ? s.labelAr : s.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-xs">{language === 'ar' ? 'بحث' : 'Search'}</Label>
              <Input 
                placeholder={language === 'ar' ? 'بحث بالاسم أو رقم العقد...' : 'Search by name or contract...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        );

      case 'trial_balance':
      case 'income_statement':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.value} value={b.value}>
                      {language === 'ar' ? b.labelAr : b.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'نوع الحساب' : 'Account Type'}</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {language === 'ar' ? t.labelAr : t.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-xs">{language === 'ar' ? 'بحث' : 'Search'}</Label>
              <Input 
                placeholder={language === 'ar' ? 'بحث بالحساب...' : 'Search by account...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.value} value={b.value}>
                      {language === 'ar' ? b.labelAr : b.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-3">
              <Label className="text-xs">{language === 'ar' ? 'بحث' : 'Search'}</Label>
              <Input 
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        );
    }
  };

  // Render content based on report type
  const renderContent = () => {
    switch (reportType) {
      case 'income_statement':
        return (
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="min-w-[200px] font-bold border-e border-gray-300 text-right">{language === 'ar' ? 'الحساب' : 'Account'}</TableHead>
                <TableHead className="w-[100px] border-e border-gray-300 text-right">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead className="w-[120px] text-center border-e border-gray-300">{language === 'ar' ? 'الفعلي' : 'Actual'}</TableHead>
                <TableHead className="w-[120px] text-center border-e border-gray-300">{language === 'ar' ? 'الموازنة' : 'Budget'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'الفرق' : 'Variance'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'الفرق %' : 'Var %'}</TableHead>
                <TableHead className="w-[40px] text-center">✓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((item: any) => (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "hover:bg-gray-100 dark:hover:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer transition-colors",
                    getReconciliationBg(item.id)
                  )}
                  onClick={() => { setSelectedItem({...item, reportType: 'income_statement'}); setIsDetailSheetOpen(true); }}
                >
                  <TableCell className="font-medium border-e border-gray-200 text-right">{language === 'ar' ? item.account : item.accountEn}</TableCell>
                  <TableCell className="border-e border-gray-200 text-right">
                    <Badge className={cn(
                      "text-[10px] px-1.5",
                      item.type === 'revenue' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {item.type === 'revenue' ? (language === 'ar' ? 'إيراد' : 'Revenue') : (language === 'ar' ? 'مصروف' : 'Expense')}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm border-e border-gray-200",
                    item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>{item.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-mono text-sm border-e border-gray-200">{item.budget.toLocaleString()}</TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm border-e border-gray-200",
                    item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>{item.variance > 0 ? '+' : ''}{item.variance.toLocaleString()}</TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm border-e border-gray-200",
                    item.percentVar >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>{item.percentVar > 0 ? '+' : ''}{item.percentVar}%</TableCell>
                  <TableCell className="text-center p-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!markedEntries[item.id]}
                      onCheckedChange={() => toggleReconciliationMark(item.id)}
                      className={cn("w-4 h-4", markedEntries[item.id] && "border-2")}
                      style={{
                        borderColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                        backgroundColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'trial_balance':
        return (
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[80px] font-bold border-e border-gray-300">{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                <TableHead className="min-w-[200px] border-e border-gray-300">{language === 'ar' ? 'الحساب' : 'Account'}</TableHead>
                <TableHead className="w-[100px] border-e border-gray-300">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead className="w-[130px] text-center border-e border-gray-300">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
                <TableHead className="w-[130px] text-center border-e border-gray-300">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
                <TableHead className="w-[40px] text-center">✓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((item: any) => (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "hover:bg-gray-100 dark:hover:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer transition-colors",
                    getReconciliationBg(item.id)
                  )}
                  onClick={() => { setSelectedItem({...item, reportType: 'trial_balance'}); setIsDetailSheetOpen(true); }}
                >
                  <TableCell className="font-mono text-xs text-erp-teal border-e border-gray-200">{item.code}</TableCell>
                  <TableCell className="font-medium border-e border-gray-200">{language === 'ar' ? item.account : item.accountEn}</TableCell>
                  <TableCell className="border-e border-gray-200">
                    <Badge className={cn(
                      "text-[10px] px-1.5",
                      item.type === 'assets' ? 'bg-blue-100 text-blue-700' :
                      item.type === 'liabilities' ? 'bg-orange-100 text-orange-700' :
                      item.type === 'equity' ? 'bg-purple-100 text-purple-700' :
                      item.type === 'revenue' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {language === 'ar' 
                        ? accountTypes.find(t => t.value === item.type)?.labelAr 
                        : accountTypes.find(t => t.value === item.type)?.labelEn}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-semibold border-e border-gray-200">{item.debit > 0 ? item.debit.toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-center font-mono text-sm font-semibold border-e border-gray-200">{item.credit > 0 ? item.credit.toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-center p-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!markedEntries[item.id]}
                      onCheckedChange={() => toggleReconciliationMark(item.id)}
                      className={cn("w-4 h-4", markedEntries[item.id] && "border-2")}
                      style={{
                        borderColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                        backgroundColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-gray-200 dark:bg-slate-700 font-bold">
                <TableCell colSpan={3} className="text-center border-e border-gray-300">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                <TableCell className="text-center font-mono text-sm border-e border-gray-300">{filteredAndSortedData.reduce((sum: number, i: any) => sum + i.debit, 0).toLocaleString()}</TableCell>
                <TableCell className="text-center font-mono text-sm border-e border-gray-300">{filteredAndSortedData.reduce((sum: number, i: any) => sum + i.credit, 0).toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'overdue_debts':
        return (
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="min-w-[150px] font-bold border-e border-gray-300">{language === 'ar' ? 'الزبون' : 'Customer'}</TableHead>
                <TableHead className="w-[120px] border-e border-gray-300">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice No.'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'المبلغ الأصلي' : 'Original'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'المتبقي' : 'Remaining'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'أيام التأخير' : 'Days'}</TableHead>
                <TableHead className="w-[90px] text-center border-e border-gray-300">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'آخر تواصل' : 'Last Contact'}</TableHead>
                <TableHead className="w-[40px] text-center">✓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((item: any) => (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "hover:bg-gray-100 dark:hover:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer transition-colors",
                    item.status === 'critical' ? 'bg-red-50 dark:bg-red-950/20' : '',
                    getReconciliationBg(item.id)
                  )}
                  onClick={() => { setSelectedItem({...item, reportType: 'overdue_debts'}); setIsDetailSheetOpen(true); }}
                >
                  <TableCell className="border-e border-gray-200">
                    <div>
                      <div className="font-medium">{item.customerName}</div>
                      <div className="text-xs text-muted-foreground">{item.customerCode} • {item.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-erp-teal border-e border-gray-200">{item.invoiceNumber}</TableCell>
                  <TableCell className="text-center font-mono text-sm border-e border-gray-200">{item.originalAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold text-red-600 border-e border-gray-200">{item.remainingAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-center text-sm border-e border-gray-200">{item.dueDate}</TableCell>
                  <TableCell className="text-center border-e border-gray-200">
                    <span className={cn(
                      "font-bold",
                      item.daysOverdue > 90 ? 'text-red-600' : item.daysOverdue > 60 ? 'text-orange-500' : 'text-yellow-600'
                    )}>
                      {item.daysOverdue} {language === 'ar' ? 'يوم' : 'days'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center border-e border-gray-200">{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground border-e border-gray-200">{item.lastContact}</TableCell>
                  <TableCell className="text-center p-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!markedEntries[item.id]}
                      onCheckedChange={() => toggleReconciliationMark(item.id)}
                      className={cn("w-4 h-4", markedEntries[item.id] && "border-2")}
                      style={{
                        borderColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                        backgroundColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'installments':
        return (
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="min-w-[150px] font-bold border-e border-gray-300">{language === 'ar' ? 'الطرف' : 'Party'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead className="w-[120px] border-e border-gray-300">{language === 'ar' ? 'رقم العقد' : 'Contract No.'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'القسط' : 'Install.'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead className="w-[100px] text-center border-e border-gray-300">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[70px] text-center border-e border-gray-300">{language === 'ar' ? 'التأخير' : 'Days'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'الغرامة' : 'Penalty'}</TableHead>
                <TableHead className="w-[40px] text-center">✓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((item: any) => (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "hover:bg-gray-100 dark:hover:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer transition-colors",
                    item.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/20' : '',
                    getReconciliationBg(item.id)
                  )}
                  onClick={() => { setSelectedItem({...item, reportType: 'installments'}); setIsDetailSheetOpen(true); }}
                >
                  <TableCell className="border-e border-gray-200">
                    <div className="flex items-center gap-2">
                      {getPartyTypeIcon(item.partyType)}
                      <span className="font-medium">{item.partyName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center border-e border-gray-200">
                    <Badge variant="outline" className="text-[10px]">
                      {language === 'ar' 
                        ? installmentTypes.find(t => t.value === item.partyType)?.labelAr 
                        : installmentTypes.find(t => t.value === item.partyType)?.labelEn}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-erp-teal border-e border-gray-200">{item.contractNumber}</TableCell>
                  <TableCell className="text-center border-e border-gray-200">
                    <span className="font-medium">{item.installmentNumber}</span>
                    <span className="text-muted-foreground">/{item.totalInstallments}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold border-e border-gray-200">{item.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-center text-sm border-e border-gray-200">{item.dueDate}</TableCell>
                  <TableCell className="text-center border-e border-gray-200">{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-center border-e border-gray-200">
                    {item.daysOverdue > 0 ? (
                      <span className="text-red-600 font-bold">{item.daysOverdue}</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center border-e border-gray-200">
                    {item.penalty > 0 ? (
                      <span className="text-orange-600 font-medium">{item.penalty.toLocaleString()}</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center p-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!markedEntries[item.id]}
                      onCheckedChange={() => toggleReconciliationMark(item.id)}
                      className={cn("w-4 h-4", markedEntries[item.id] && "border-2")}
                      style={{
                        borderColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                        backgroundColor: markedEntries[item.id] 
                          ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[item.id])?.color 
                          : undefined,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'kpi':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {filteredAndSortedData.map((kpi: any) => (
              <Card key={kpi.name} className="shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? kpi.name : kpi.nameEn}</span>
                    {kpi.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                    {kpi.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    {kpi.trend === 'stable' && <Activity className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    <span className="text-sm text-muted-foreground mb-1">{kpi.unit}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{language === 'ar' ? 'التقدم نحو الهدف' : 'Progress to Target'}</span>
                      <span>{Math.round((kpi.value / kpi.target) * 100)}%</span>
                    </div>
                    <Progress value={(kpi.value / kpi.target) * 100} className="h-1.5" />
                  </div>
                  <div className={`text-xs mt-2 ${kpi.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {kpi.change >= 0 ? '+' : ''}{kpi.change}{kpi.unit} {language === 'ar' ? 'عن الفترة السابقة' : 'vs previous'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'sales_performance':
        return (
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-e border-gray-300">#</TableHead>
                <TableHead className="min-w-[150px] font-bold border-e border-gray-300">{language === 'ar' ? 'المندوب' : 'Salesperson'}</TableHead>
                <TableHead className="w-[120px] text-center border-e border-gray-300">{language === 'ar' ? 'المبيعات' : 'Sales'}</TableHead>
                <TableHead className="w-[120px] text-center border-e border-gray-300">{language === 'ar' ? 'الهدف' : 'Target'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'الإنجاز %' : 'Achievement'}</TableHead>
                <TableHead className="w-[80px] text-center border-e border-gray-300">{language === 'ar' ? 'الطلبات' : 'Orders'}</TableHead>
                <TableHead className="w-[100px] text-center">{language === 'ar' ? 'العمولة' : 'Commission'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((item: any, index: number) => (
                <TableRow 
                  key={item.id} 
                  className="hover:bg-gray-100 dark:hover:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  <TableCell className="text-center border-e border-gray-200">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mx-auto",
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    )}>
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium border-e border-gray-200">{item.name}</TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold border-e border-gray-200">{item.sales.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-mono text-sm border-e border-gray-200">{item.target.toLocaleString()}</TableCell>
                  <TableCell className="text-center border-e border-gray-200">
                    <Badge className={cn(
                      "text-[10px] px-1.5",
                      item.achievement >= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {item.achievement}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm border-e border-gray-200">{item.orders}</TableCell>
                  <TableCell className="text-center font-mono text-sm text-green-600 font-semibold">{item.commission.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {language === 'ar' ? 'اختر نوع التقرير' : 'Select a report type'}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{language === 'ar' ? 'التقارير المحاسبية' : 'Accounting Reports'}</h2>
            <p className="text-sm text-muted-foreground">{language === 'ar' ? '6 تقارير شاملة لمتابعة الأداء المالي' : '6 comprehensive financial reports'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateFrom, 'dd/MM/yyyy')} - {format(dateTo, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: dateFrom, to: dateTo }}
                onSelect={(range) => {
                  if (range?.from) setDateFrom(range.from);
                  if (range?.to) setDateTo(range.to);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 me-1" />
            {language === 'ar' ? 'إعادة' : 'Reset'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 me-1" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 me-1" />
            {language === 'ar' ? 'طباعة' : 'Print'}
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Button
              key={report.id}
              variant={reportType === report.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "gap-2",
                reportType === report.id && "bg-erp-navy text-white"
              )}
              onClick={() => setReportType(report.id)}
            >
              <Icon className="h-4 w-4" />
              {language === 'ar' ? report.labelAr : report.labelEn}
            </Button>
          );
        })}
      </div>

      {/* Summary Stats */}
      {reportType === 'income_statement' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm border-e-4 border-e-green-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalRevenue?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-e-4 border-e-red-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</div>
              <div className="text-2xl font-bold text-red-600">{stats.totalExpenses?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-e-4 border-e-blue-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</div>
              <div className="text-2xl font-bold text-blue-600">{stats.netProfit?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'overdue_debts' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm border-e-4 border-e-red-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الديون المتأخرة' : 'Total Overdue'}</div>
              <div className="text-2xl font-bold text-red-600">{stats.totalAmount?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-e-4 border-e-orange-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'عدد الزبائن' : 'Customers'}</div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalDebts}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-e-4 border-e-red-700">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'حالات حرجة' : 'Critical Cases'}</div>
              <div className="text-2xl font-bold text-red-700">{stats.criticalCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'installments' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm border-e-4 border-e-blue-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'عدد الأقساط' : 'Total Installments'}</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalInstallments}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-e-4 border-e-red-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'المتأخرة' : 'Overdue Amount'}</div>
              <div className="text-2xl font-bold text-red-600">{stats.overdueAmount?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-e-4 border-e-orange-500">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الغرامات' : 'Total Penalties'}</div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalPenalties?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{language === 'ar' ? 'الفلاتر' : 'Filters'}</span>
            {/* Reconciliation Color Picker */}
            <div className="me-auto flex items-center gap-2">
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: RECONCILIATION_COLORS.find(c => c.id === selectedReconciliationColor)?.color }}
                    />
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'ar' ? 'لون التأشير' : 'Mark Color'}</Label>
                    <div className="flex flex-wrap gap-1">
                      {RECONCILIATION_COLORS.filter(c => c.id !== 'none').map(color => (
                        <button
                          key={color.id}
                          className={cn(
                            "w-6 h-6 rounded border-2 transition-all",
                            selectedReconciliationColor === color.id ? "ring-2 ring-offset-1 ring-primary" : ""
                          )}
                          style={{ backgroundColor: color.color }}
                          onClick={() => {
                            setSelectedReconciliationColor(color.id);
                            setShowColorPicker(false);
                          }}
                          title={language === 'ar' ? color.label : color.labelEn}
                        />
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {renderFilters()}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {renderContent()}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{language === 'ar' ? `إجمالي ${filteredAndSortedData.length} سجل` : `Total ${filteredAndSortedData.length} records`}</span>
        <span>{language === 'ar' ? `آخر تحديث: ${format(new Date(), 'dd/MM/yyyy HH:mm')}` : `Last updated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`}</span>
      </div>
    </div>
  );
};

export default AdvancedAccountingReports;
