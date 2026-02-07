/**
 * Accounting Sheets Lab - مختبر شيتات المحاسبة
 * 
 * صفحة شاملة لاختبار ومقارنة جميع شيتات وديالوجات المحاسبة
 * لتحديد أي منها نحتفظ به وأي منها نحذفه
 */

import { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Eye,
    Code,
    FileText,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Layers,
    Book,
    RefreshCw,
    ArrowLeft,
    ArrowRight,
    Wallet,
    Users,
    CreditCard,
    ArrowRightLeft,
    DollarSign,
    Plus,
    Building2,
    Receipt,
    FileEdit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';

// Import ALL AccountDetailsSheet components for comparison
import AccountDetailsSheet from '@/features/accounting/components/AccountDetailsSheet';
import AccountDetailsSheetV2 from '@/features/accounting/components/AccountDetailsSheetV2';
// Import other sheets
import GeneralLedgerSheet from '@/features/accounting/components/GeneralLedgerSheet';
import TransactionDetailsSheet from '@/features/accounting/components/TransactionDetailsSheet';
import FundTransactionSheet from '@/features/accounting/components/FundTransactionSheet';
import { FundStatementSheet } from '@/features/accounting/components/FundStatementSheet';
import NewJournalEntrySheet from '@/features/accounting/components/NewJournalEntrySheet';
import { AddPartySheet } from '@/features/accounting/components/AddPartySheet';
// Import dialogs
import QuickReceiptDialog from '@/features/accounting/components/QuickReceiptDialog';
import QuickPaymentDialog from '@/features/accounting/components/QuickPaymentDialog';
import FundTransferDialog from '@/features/accounting/components/FundTransferDialog';
import CurrencyExchangeDialog from '@/features/accounting/components/CurrencyExchangeDialog';
import { AddFundDialog } from '@/features/accounting/components/AddFundDialog';
import { AddCostCenterDialog } from '@/features/accounting/components/AddCostCenterDialog';
// Import the NEW Unified Component
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';
// Import UniversalDetailSheet (used in Chart of Accounts)
import { UniversalDetailSheet } from '@/components/sheets';

// Mock account data for testing
const MOCK_ACCOUNT = {
    id: 'acc-001',
    code: '1101',
    name: 'الصندوق الرئيسي',
    nameAr: 'الصندوق الرئيسي',
    name_en: 'Main Cash',
    account_type: 'Asset',
    type: 'Asset',
    is_group: false,
    is_active: true,
    is_system: false,
    current_balance: 125000,
    balance: 125000,
    opening_balance: 50000,
    total_debit: 500000,
    total_credit: 375000,
    transaction_count: 156,
    monthly_average: 45000,
    credit_limit: 0,
    currency: 'SAR',
    parent_id: 'acc-parent-001',
    parent: { id: 'acc-parent-001', name: 'النقد والبنوك', code: '11' },
    parent_name: 'النقد والبنوك',
    company_id: 'company-001',
    description: 'الصندوق النقدي الرئيسي للشركة',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-20T10:00:00Z',
    last_activity: '2024-03-20',
};

// Mock fund data
const MOCK_FUND = {
    id: 1,
    name: 'الصندوق الرئيسي',
    type: 'cash' as const,
    balance: 45000,
    currency: 'SAR',
    accountNumber: 'FUND-001',
    totalDeposits: 125000,
    totalWithdrawals: 80000,
    todayChange: 3200,
    lastActivity: 'منذ ساعتين',
    defaultCurrency: 'SAR',
    balances: [
        { currency: 'SAR', balance: 45000, totalDeposits: 125000, totalWithdrawals: 80000, todayChange: 3200 },
        { currency: 'USD', balance: 2500, totalDeposits: 8000, totalWithdrawals: 5500, todayChange: 500 },
    ],
    transactionCount: 156,
};

// Mock funds list
const MOCK_FUNDS = [
    { id: 1, name: 'الصندوق الرئيسي', type: 'cash', balance: 45000 },
    { id: 2, name: 'بنك الراجحي', type: 'bank', balance: 125000 },
    { id: 3, name: 'بنك الأهلي', type: 'bank', balance: 85000 },
    { id: 4, name: 'صندوق المصروفات', type: 'cash', balance: 12000 },
];

// Mock transaction
const MOCK_TRANSACTION = {
    id: 'JV-2024-001',
    date: '2024-03-20',
    description: 'دفع إيجار المكتب',
    type: 'Payment',
    amount: 5000,
    status: 'posted',
    reference: 'JV-2024-001',
    account: 'Cash',
    counterAccount: 'Rent Expense',
};

// Mock data for NexaDataTable demo
interface DemoTableRow {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    type: string;
    balance: number;
    status: 'active' | 'inactive';
    created_at: string;
}

const MOCK_TABLE_DATA: DemoTableRow[] = [
    { id: '1', code: '1101', name_ar: 'الصندوق الرئيسي', name_en: 'Main Cash', type: 'أصول', balance: 125000, status: 'active', created_at: '2024-01-15' },
    { id: '2', code: '1102', name_ar: 'بنك الراجحي', name_en: 'Al Rajhi Bank', type: 'أصول', balance: 450000, status: 'active', created_at: '2024-01-15' },
    { id: '3', code: '1103', name_ar: 'بنك الأهلي', name_en: 'NCB Bank', type: 'أصول', balance: 320000, status: 'active', created_at: '2024-01-15' },
    { id: '4', code: '2101', name_ar: 'الموردون', name_en: 'Suppliers', type: 'خصوم', balance: 85000, status: 'active', created_at: '2024-01-20' },
    { id: '5', code: '2102', name_ar: 'القروض قصيرة الأجل', name_en: 'Short-term Loans', type: 'خصوم', balance: 200000, status: 'active', created_at: '2024-02-01' },
    { id: '6', code: '3101', name_ar: 'رأس المال', name_en: 'Capital', type: 'حقوق ملكية', balance: 1000000, status: 'active', created_at: '2024-01-01' },
    { id: '7', code: '4101', name_ar: 'إيرادات المبيعات', name_en: 'Sales Revenue', type: 'إيرادات', balance: 750000, status: 'active', created_at: '2024-01-15' },
    { id: '8', code: '4102', name_ar: 'إيرادات أخرى', name_en: 'Other Income', type: 'إيرادات', balance: 25000, status: 'inactive', created_at: '2024-03-01' },
    { id: '9', code: '5101', name_ar: 'تكلفة المبيعات', name_en: 'Cost of Sales', type: 'مصروفات', balance: 450000, status: 'active', created_at: '2024-01-15' },
    { id: '10', code: '5102', name_ar: 'مصروفات الإيجار', name_en: 'Rent Expense', type: 'مصروفات', balance: 120000, status: 'active', created_at: '2024-01-20' },
    { id: '11', code: '5103', name_ar: 'مصروفات الرواتب', name_en: 'Salary Expense', type: 'مصروفات', balance: 280000, status: 'active', created_at: '2024-01-15' },
    { id: '12', code: '5104', name_ar: 'مصروفات التسويق', name_en: 'Marketing Expense', type: 'مصروفات', balance: 45000, status: 'active', created_at: '2024-02-10' },
];

const DEMO_TABLE_COLUMNS: ColumnDef<DemoTableRow>[] = [
    { accessorKey: 'code', header: 'الرمز', size: 80 },
    { accessorKey: 'name_ar', header: 'الاسم بالعربية', size: 180 },
    { accessorKey: 'name_en', header: 'الاسم بالإنجليزية', size: 150 },
    { accessorKey: 'type', header: 'النوع', size: 100 },
    {
        accessorKey: 'balance',
        header: 'الرصيد',
        size: 120,
        cell: ({ row }) => (
            <span className="font-mono font-medium">
                {row.original.balance.toLocaleString('ar-SA')} ر.س
            </span>
        )
    },
    {
        accessorKey: 'status',
        header: 'الحالة',
        size: 80,
        cell: ({ row }) => (
            <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                row.original.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
            )}>
                {row.original.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
        )
    },
    { accessorKey: 'created_at', header: 'تاريخ الإنشاء', size: 120 },
];

// Component type definition
type ComponentCategory = 'sheet' | 'dialog' | 'form';
type ComponentStatus = 'legacy' | 'current' | 'new' | 'deprecated';
type Recommendation = 'keep' | 'delete' | 'rebuild' | 'review';

interface ComponentInfo {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    path: string;
    linesOfCode: number;
    sizeKB: number;
    category: ComponentCategory;
    status: ComponentStatus;
    recommendation: Recommendation;
    icon: any;
    tabs?: string[];
    features: string[];
    issues: string[];
}

// Complete registry of ALL accounting components
const COMPONENTS_REGISTRY: ComponentInfo[] = [
    // === 🆕 NEXA DATA TABLE (TanStack Table) ===
    {
        id: 'nexa-data-table',
        name: 'NexaDataTable',
        nameAr: '📊 جدول البيانات الجديد',
        description: 'NEW data table with TanStack Table - RTL, Drag & Drop, Resize',
        descriptionAr: 'جدول البيانات الجديد مع TanStack - RTL، سحب وإفلات، تغيير الحجم',
        path: 'src/components/ui/nexa-data-table.tsx',
        linesOfCode: 350,
        sizeKB: 14,
        category: 'sheet',
        status: 'new',
        recommendation: 'keep',
        icon: Layers,
        features: ['RTL كامل', 'سحب وإفلات الأعمدة', 'تغيير حجم الأعمدة', 'بحث وفلترة', 'تصفح Pagination'],
        issues: [],
    },
    // === NEW UNIFIED COMPONENT ===
    {
        id: 'unified-accounting-sheet',
        name: 'UnifiedAccountingSheet',
        nameAr: '🆕 الشيت الموحد الجديد',
        description: 'NEW unified component replacing all sheets',
        descriptionAr: 'المكون الموحد الجديد الذي سيستبدل جميع الشيتات',
        path: 'src/features/accounting/components/unified/UnifiedAccountingSheet.tsx',
        linesOfCode: 280,
        sizeKB: 12,
        category: 'sheet',
        status: 'new',
        recommendation: 'keep',
        icon: Layers,
        tabs: ['Overview', 'Ledger', 'Activity'],
        features: ['مكون واحد لكل الأنواع', 'تكوين مرن', 'RTL كامل', 'أرقام إنجليزية/عربية'],
        issues: [],
    },
    // === UNIVERSAL DETAIL SHEET (Used in Chart of Accounts) ===
    {
        id: 'universal-detail-sheet',
        name: 'UniversalDetailSheet',
        nameAr: '🌳 شيت الشجرة المحاسبية',
        description: 'Sheet used in Chart of Accounts when clicking on accounts',
        descriptionAr: 'الشيت المستخدم في شجرة الحسابات عند الضغط على أي حساب',
        path: 'src/components/sheets/UniversalDetailSheet.tsx',
        linesOfCode: 500,
        sizeKB: 20,
        category: 'sheet',
        status: 'current',
        recommendation: 'review',
        icon: FileText,
        tabs: ['نظرة عامة', 'كشف الحساب', 'المدفوعات', 'تحليل AI', 'السجل'],
        features: ['QR Code', 'Tabs متعددة', 'حركات الحساب', 'RTL'],
        issues: ['سيُستبدل بالشيت الموحد'],
    },
    // === SHEETS ===
    {
        id: 'account-details-sheet',
        name: 'AccountDetailsSheet',
        nameAr: 'شيت تفاصيل الحساب (القديم)',
        description: 'Original account details sheet with all features',
        descriptionAr: 'شيت تفاصيل الحساب الأصلي مع جميع الميزات',
        path: 'src/features/accounting/components/AccountDetailsSheet.tsx',
        linesOfCode: 3495,
        sizeKB: 164,
        category: 'sheet',
        status: 'legacy',
        recommendation: 'rebuild',
        icon: Book,
        tabs: ['Overview', 'Ledger', 'Invoices', 'Payments', 'Reservations', 'AI Analysis', 'Events'],
        features: ['7 تبويبات', 'Real data hooks', 'AI Analysis', 'Edit mode'],
        issues: ['ضخم جداً (3495 سطر)', 'صعب الصيانة', 'animations كثيرة'],
    },
    {
        id: 'account-details-sheet-v2',
        name: 'AccountDetailsSheetV2',
        nameAr: 'شيت تفاصيل الحساب V2',
        description: 'Cleaner version with LedgerTable',
        descriptionAr: 'نسخة أنظف مع LedgerTable',
        path: 'src/features/accounting/components/AccountDetailsSheetV2.tsx',
        linesOfCode: 1130,
        sizeKB: 43,
        category: 'sheet',
        status: 'current',
        recommendation: 'review',
        icon: Book,
        tabs: ['Overview', 'Ledger', 'Invoices', 'Payments', 'AI', 'Events'],
        features: ['6 تبويبات', 'LedgerTable', 'أصغر حجماً'],
        issues: ['بعض الترجمات مفقودة', 'لا يدعم الإنشاء'],
    },
    {
        id: 'fund-transaction-sheet',
        name: 'FundTransactionSheet',
        nameAr: 'شيت عمليات الصندوق',
        description: 'Fund/Bank transaction history',
        descriptionAr: 'سجل عمليات الصندوق/البنك',
        path: 'src/features/accounting/components/FundTransactionSheet.tsx',
        linesOfCode: 990,
        sizeKB: 51,
        category: 'sheet',
        status: 'current',
        recommendation: 'review',
        icon: Wallet,
        tabs: ['Transactions', 'Filters'],
        features: ['فلاتر متقدمة', 'تحويل عملات', 'تاريخ العمليات'],
        issues: ['كبير نسبياً', 'mock data'],
    },
    {
        id: 'fund-statement-sheet',
        name: 'FundStatementSheet',
        nameAr: 'شيت كشف الصندوق',
        description: 'Fund statement report',
        descriptionAr: 'كشف حساب الصندوق',
        path: 'src/features/accounting/components/FundStatementSheet.tsx',
        linesOfCode: 258,
        sizeKB: 11,
        category: 'sheet',
        status: 'current',
        recommendation: 'keep',
        icon: FileText,
        features: ['DataTable', 'Date filters', 'Print'],
        issues: ['أساسي'],
    },
    {
        id: 'general-ledger-sheet',
        name: 'GeneralLedgerSheet',
        nameAr: 'شيت دفتر الأستاذ العام',
        description: 'General ledger view',
        descriptionAr: 'عرض دفتر الأستاذ العام',
        path: 'src/features/accounting/components/GeneralLedgerSheet.tsx',
        linesOfCode: 409,
        sizeKB: 18,
        category: 'sheet',
        status: 'current',
        recommendation: 'review',
        icon: Book,
        features: ['فلاتر التاريخ', 'اختصارات التاريخ'],
        issues: ['mock data'],
    },
    {
        id: 'transaction-details-sheet',
        name: 'TransactionDetailsSheet',
        nameAr: 'شيت تفاصيل العملية',
        description: 'Single transaction details',
        descriptionAr: 'تفاصيل عملية مفردة',
        path: 'src/features/accounting/components/TransactionDetailsSheet.tsx',
        linesOfCode: 406,
        sizeKB: 17,
        category: 'sheet',
        status: 'current',
        recommendation: 'keep',
        icon: FileEdit,
        features: ['View + Edit mode', 'Journal lines'],
        issues: ['بعض الترجمات'],
    },
    {
        id: 'new-journal-entry-sheet',
        name: 'NewJournalEntrySheet',
        nameAr: 'شيت قيد محاسبي جديد',
        description: 'Create/Edit journal entry',
        descriptionAr: 'إنشاء/تعديل قيد محاسبي',
        path: 'src/features/accounting/components/NewJournalEntrySheet.tsx',
        linesOfCode: 222,
        sizeKB: 9,
        category: 'sheet',
        status: 'current',
        recommendation: 'keep',
        icon: FileEdit,
        features: ['Create mode', 'Edit mode', 'Actions toolbar'],
        issues: ['يعتمد على JournalEntryForm'],
    },
    {
        id: 'add-party-sheet',
        name: 'AddPartySheet',
        nameAr: 'شيت إضافة جهة',
        description: 'Add customer/supplier',
        descriptionAr: 'إضافة عميل/مورد',
        path: 'src/features/accounting/components/AddPartySheet.tsx',
        linesOfCode: 298,
        sizeKB: 13,
        category: 'sheet',
        status: 'current',
        recommendation: 'keep',
        icon: Users,
        features: ['Form validation', 'Type selection'],
        issues: [],
    },
    // === DIALOGS ===
    {
        id: 'quick-receipt-dialog',
        name: 'QuickReceiptDialog',
        nameAr: 'ديالوج سند قبض',
        description: 'Quick receipt voucher',
        descriptionAr: 'سند قبض سريع',
        path: 'src/features/accounting/components/QuickReceiptDialog.tsx',
        linesOfCode: 364,
        sizeKB: 17,
        category: 'dialog',
        status: 'current',
        recommendation: 'review',
        icon: Receipt,
        features: ['Multi-currency', 'Fund selection'],
        issues: ['متشابه مع Payment'],
    },
    {
        id: 'quick-payment-dialog',
        name: 'QuickPaymentDialog',
        nameAr: 'ديالوج سند صرف',
        description: 'Quick payment voucher',
        descriptionAr: 'سند صرف سريع',
        path: 'src/features/accounting/components/QuickPaymentDialog.tsx',
        linesOfCode: 415,
        sizeKB: 19,
        category: 'dialog',
        status: 'current',
        recommendation: 'review',
        icon: CreditCard,
        features: ['Multi-currency', 'Fund selection'],
        issues: ['متشابه مع Receipt'],
    },
    {
        id: 'fund-transfer-dialog',
        name: 'FundTransferDialog',
        nameAr: 'ديالوج تحويل بين الصناديق',
        description: 'Transfer between funds',
        descriptionAr: 'تحويل بين الصناديق',
        path: 'src/features/accounting/components/FundTransferDialog.tsx',
        linesOfCode: 350,
        sizeKB: 17,
        category: 'dialog',
        status: 'current',
        recommendation: 'keep',
        icon: ArrowRightLeft,
        features: ['Fund selection', 'Validation'],
        issues: [],
    },
    {
        id: 'currency-exchange-dialog',
        name: 'CurrencyExchangeDialog',
        nameAr: 'ديالوج صرف العملات',
        description: 'Currency exchange',
        descriptionAr: 'صرف العملات',
        path: 'src/features/accounting/components/CurrencyExchangeDialog.tsx',
        linesOfCode: 475,
        sizeKB: 21,
        category: 'dialog',
        status: 'current',
        recommendation: 'keep',
        icon: DollarSign,
        features: ['Exchange rates', 'Multi-currency'],
        issues: ['mock exchange rates'],
    },
    {
        id: 'add-fund-dialog',
        name: 'AddFundDialog',
        nameAr: 'ديالوج إضافة صندوق',
        description: 'Add new fund',
        descriptionAr: 'إضافة صندوق جديد',
        path: 'src/features/accounting/components/AddFundDialog.tsx',
        linesOfCode: 100,
        sizeKB: 3,
        category: 'dialog',
        status: 'current',
        recommendation: 'keep',
        icon: Plus,
        features: ['Simple form'],
        issues: [],
    },
    {
        id: 'add-cost-center-dialog',
        name: 'AddCostCenterDialog',
        nameAr: 'ديالوج إضافة مركز تكلفة',
        description: 'Add cost center',
        descriptionAr: 'إضافة مركز تكلفة',
        path: 'src/features/accounting/components/AddCostCenterDialog.tsx',
        linesOfCode: 200,
        sizeKB: 7,
        category: 'dialog',
        status: 'current',
        recommendation: 'keep',
        icon: Building2,
        features: ['Hierarchical selection'],
        issues: [],
    },
];

export default function AccountingSheetsLab() {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';

    // State for component testing
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<'all' | ComponentCategory>('all');

    // Filter components by category
    const filteredComponents = activeCategory === 'all'
        ? COMPONENTS_REGISTRY
        : COMPONENTS_REGISTRY.filter(c => c.category === activeCategory);

    // Get status badge color
    const getStatusColor = (status: ComponentStatus) => {
        switch (status) {
            case 'legacy': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'current': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'new': return 'bg-green-100 text-green-700 border-green-200';
            case 'deprecated': return 'bg-red-100 text-red-700 border-red-200';
        }
    };

    // Get category badge
    const getCategoryBadge = (category: ComponentCategory) => {
        switch (category) {
            case 'sheet': return { color: 'bg-blue-500', label: isAr ? 'شيت' : 'Sheet' };
            case 'dialog': return { color: 'bg-purple-500', label: isAr ? 'ديالوج' : 'Dialog' };
            case 'form': return { color: 'bg-green-500', label: isAr ? 'نموذج' : 'Form' };
        }
    };

    // Get recommendation badge
    const getRecommendationBadge = (rec: Recommendation) => {
        switch (rec) {
            case 'keep': return { icon: CheckCircle, color: 'bg-green-500', label: isAr ? 'احتفظ' : 'Keep' };
            case 'delete': return { icon: Trash2, color: 'bg-red-500', label: isAr ? 'احذف' : 'Delete' };
            case 'rebuild': return { icon: RefreshCw, color: 'bg-blue-500', label: isAr ? 'أعد بناءه' : 'Rebuild' };
            case 'review': return { icon: Eye, color: 'bg-yellow-500', label: isAr ? 'راجع' : 'Review' };
        }
    };

    // Calculate totals
    const totals = {
        components: COMPONENTS_REGISTRY.length,
        sheets: COMPONENTS_REGISTRY.filter(c => c.category === 'sheet').length,
        dialogs: COMPONENTS_REGISTRY.filter(c => c.category === 'dialog').length,
        totalLines: COMPONENTS_REGISTRY.reduce((sum, c) => sum + c.linesOfCode, 0),
        totalSize: COMPONENTS_REGISTRY.reduce((sum, c) => sum + c.sizeKB, 0),
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={direction}>
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
                            <Layers className="w-7 h-7 text-erp-teal" />
                            {isAr ? 'مختبر شيتات المحاسبة الشامل' : 'Comprehensive Accounting Sheets Lab'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
                            {isAr
                                ? `${totals.components} مكون | ${totals.sheets} شيت | ${totals.dialogs} ديالوج | ${totals.totalLines.toLocaleString()} سطر | ${totals.totalSize} KB`
                                : `${totals.components} components | ${totals.sheets} sheets | ${totals.dialogs} dialogs | ${totals.totalLines.toLocaleString()} lines | ${totals.totalSize} KB`
                            }
                        </p>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1 font-cairo">
                                {isAr ? 'صفحة اختبار ودراسة شاملة' : 'Comprehensive Testing Page'}
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 font-tajawal">
                                {isAr
                                    ? 'اختر أي مكون لاختباره بصرياً. الهدف: بناء مكون واحد موحد يستبدل جميع هذه المكونات.'
                                    : 'Select any component to test visually. Goal: Build one unified component to replace all of these.'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2">
                    {(['all', 'sheet', 'dialog'] as const).map((cat) => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveCategory(cat)}
                            className="gap-2"
                        >
                            {cat === 'all' && (isAr ? 'الكل' : 'All')}
                            {cat === 'sheet' && (isAr ? 'الشيتات' : 'Sheets')}
                            {cat === 'dialog' && (isAr ? 'الديالوجات' : 'Dialogs')}
                            <Badge variant="secondary" className="text-xs">
                                {cat === 'all' ? totals.components : cat === 'sheet' ? totals.sheets : totals.dialogs}
                            </Badge>
                        </Button>
                    ))}
                </div>

                {/* Components Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredComponents.map((component) => {
                        const rec = getRecommendationBadge(component.recommendation);
                        const RecIcon = rec.icon;
                        const CompIcon = component.icon;
                        const catBadge = getCategoryBadge(component.category);

                        return (
                            <Card
                                key={component.id}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-lg",
                                    selectedComponent === component.id && "ring-2 ring-erp-teal"
                                )}
                                onClick={() => setSelectedComponent(component.id)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", catBadge.color)}>
                                                <CompIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <Badge className={cn("text-[10px]", getStatusColor(component.status))}>
                                                {component.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs", rec.color)}>
                                            <RecIcon className="w-3 h-3" />
                                            {rec.label}
                                        </div>
                                    </div>
                                    <CardTitle className="text-sm font-mono">
                                        {component.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {isAr ? component.nameAr : component.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Code className="w-3.5 h-3.5" />
                                            <span>{component.linesOfCode.toLocaleString()} {isAr ? 'سطر' : 'lines'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>{component.sizeKB} KB</span>
                                        </div>
                                    </div>

                                    {/* Tabs (if any) */}
                                    {component.tabs && (
                                        <div className="text-[10px] text-gray-500">
                                            <span className="font-semibold">{isAr ? 'التبويبات:' : 'Tabs:'}</span>{' '}
                                            {component.tabs.slice(0, 3).join(', ')}
                                            {component.tabs.length > 3 && ` +${component.tabs.length - 3}`}
                                        </div>
                                    )}

                                    {/* Features & Issues */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] font-semibold text-green-600 mb-1">
                                                {isAr ? 'الميزات:' : 'Features:'}
                                            </p>
                                            <ul className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5">
                                                {component.features.slice(0, 2).map((f, i) => (
                                                    <li key={i} className="flex items-start gap-1">
                                                        <span className="text-green-500">✓</span>
                                                        <span className="truncate">{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {component.issues.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-red-600 mb-1">
                                                    {isAr ? 'المشاكل:' : 'Issues:'}
                                                </p>
                                                <ul className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5">
                                                    {component.issues.slice(0, 2).map((issue, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            <span className="text-red-500">✗</span>
                                                            <span className="truncate">{issue}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Test Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2 mt-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedComponent(component.id);
                                        }}
                                    >
                                        <Eye className="w-4 h-4" />
                                        {isAr ? 'اختبر المكون' : 'Test Component'}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Summary Stats */}
                <Card className="bg-gradient-to-r from-erp-navy to-erp-teal text-white">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold mb-4 font-cairo">
                            {isAr ? '📊 ملخص الدراسة' : '📊 Study Summary'}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-2xl font-bold">{totals.components}</div>
                                <div className="text-xs opacity-80">{isAr ? 'مكون' : 'Components'}</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-2xl font-bold">{totals.sheets}</div>
                                <div className="text-xs opacity-80">{isAr ? 'شيتات' : 'Sheets'}</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-2xl font-bold">{totals.dialogs}</div>
                                <div className="text-xs opacity-80">{isAr ? 'ديالوجات' : 'Dialogs'}</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-2xl font-bold">{(totals.totalLines / 1000).toFixed(1)}k</div>
                                <div className="text-xs opacity-80">{isAr ? 'سطر كود' : 'Lines'}</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-2xl font-bold">{totals.totalSize}</div>
                                <div className="text-xs opacity-80">KB</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* === COMPONENT PREVIEWS === */}

            {/* AccountDetailsSheet (Legacy) */}
            {selectedComponent === 'account-details-sheet' && (
                <AccountDetailsSheet
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    account={MOCK_ACCOUNT}
                />
            )}

            {/* AccountDetailsSheetV2 */}
            {selectedComponent === 'account-details-sheet-v2' && (
                <AccountDetailsSheetV2
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    account={MOCK_ACCOUNT}
                />
            )}

            {/* FundTransactionSheet */}
            {selectedComponent === 'fund-transaction-sheet' && (
                <FundTransactionSheet
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    fund={MOCK_FUND}
                />
            )}

            {/* FundStatementSheet */}
            {selectedComponent === 'fund-statement-sheet' && (
                <FundStatementSheet
                    isOpen={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    fund={MOCK_ACCOUNT}
                />
            )}

            {/* GeneralLedgerSheet */}
            {selectedComponent === 'general-ledger-sheet' && (
                <GeneralLedgerSheet
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                />
            )}

            {/* TransactionDetailsSheet */}
            {selectedComponent === 'transaction-details-sheet' && (
                <TransactionDetailsSheet
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    transaction={MOCK_TRANSACTION}
                />
            )}

            {/* NewJournalEntrySheet */}
            {selectedComponent === 'new-journal-entry-sheet' && (
                <NewJournalEntrySheet
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                />
            )}

            {/* AddPartySheet */}
            {selectedComponent === 'add-party-sheet' && (
                <AddPartySheet
                    isOpen={true}
                    onClose={() => setSelectedComponent(null)}
                    type="customer"
                    onComplete={() => setSelectedComponent(null)}
                />
            )}

            {/* QuickReceiptDialog */}
            {selectedComponent === 'quick-receipt-dialog' && (
                <QuickReceiptDialog
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    funds={MOCK_FUNDS}
                />
            )}

            {/* QuickPaymentDialog */}
            {selectedComponent === 'quick-payment-dialog' && (
                <QuickPaymentDialog
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    funds={MOCK_FUNDS}
                />
            )}

            {/* FundTransferDialog */}
            {selectedComponent === 'fund-transfer-dialog' && (
                <FundTransferDialog
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    funds={MOCK_FUNDS}
                />
            )}

            {/* CurrencyExchangeDialog */}
            {selectedComponent === 'currency-exchange-dialog' && (
                <CurrencyExchangeDialog
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                    fund={MOCK_FUND}
                />
            )}

            {/* AddFundDialog */}
            {selectedComponent === 'add-fund-dialog' && (
                <AddFundDialog
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                />
            )}

            {/* AddCostCenterDialog */}
            {selectedComponent === 'add-cost-center-dialog' && (
                <AddCostCenterDialog
                    open={true}
                    onOpenChange={(open) => !open && setSelectedComponent(null)}
                />
            )}

            {/* 🆕 NEW: UnifiedAccountingSheet */}
            {selectedComponent === 'unified-accounting-sheet' && (
                <UnifiedAccountingSheet
                    isOpen={true}
                    onClose={() => setSelectedComponent(null)}
                    docType="account"
                    mode="view"
                    data={MOCK_ACCOUNT}
                />
            )}

            {/* 🌳 UniversalDetailSheet (used in Chart of Accounts) */}
            {selectedComponent === 'universal-detail-sheet' && (
                <UniversalDetailSheet
                    isOpen={true}
                    onClose={() => setSelectedComponent(null)}
                    docType="account"
                    data={MOCK_ACCOUNT}
                />
            )}

            {/* 📊 NexaDataTable Demo */}
            {selectedComponent === 'nexa-data-table' && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedComponent(null)}>
                    <div
                        className="bg-background rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto p-6"
                        onClick={(e) => e.stopPropagation()}
                        dir={direction}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-erp-navy dark:text-white font-cairo">
                                    {isAr ? '📊 NexaDataTable - جدول البيانات المتقدم' : '📊 NexaDataTable - Advanced Data Table'}
                                </h2>
                                <p className="text-sm text-muted-foreground font-tajawal mt-1">
                                    {isAr
                                        ? 'مبني على TanStack Table - جرب السحب والإفلات وتغيير حجم الأعمدة!'
                                        : 'Built on TanStack Table - Try drag & drop and column resizing!'
                                    }
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedComponent(null)}>
                                <XCircle className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg p-4 mb-4">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">✅ RTL كامل</span>
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">✅ سحب وإفلات الأعمدة</span>
                                <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">✅ تغيير حجم الأعمدة</span>
                                <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">✅ بحث وفلترة</span>
                                <span className="bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 px-2 py-1 rounded-full">✅ تصفح الصفحات</span>
                            </div>
                        </div>

                        <NexaDataTable
                            data={MOCK_TABLE_DATA}
                            columns={DEMO_TABLE_COLUMNS}
                            isRTL={isAr}
                            searchPlaceholder={isAr ? 'ابحث في الحسابات...' : 'Search accounts...'}
                            emptyMessage={isAr ? 'لا توجد بيانات للعرض' : 'No data to display'}
                            onRowClick={(row) => console.log('Row clicked:', row)}
                            enableSequenceNumber={true}
                            enableMarker={true}
                            enableExcelMode={true}
                            maxHeight="400px"
                            showSummaryHeader={true}
                            showTotalsFooter={true}
                            openingBalance={6072}
                            debitKey="debit"
                            creditKey="credit"
                            showAmountInWords={true}
                        />

                        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm font-mono text-muted-foreground">
                            <p className="font-bold mb-2">{isAr ? 'كيفية الاستخدام:' : 'Usage:'}</p>
                            <pre className="text-xs overflow-x-auto">
                                {`import { NexaDataTable } from '@/components/ui/nexa-data-table';

<NexaDataTable
  data={data}
  columns={columns}
  isRTL={true}
  
  // === وضع الإكسل ===
  enableExcelMode={true}       // ✅ بدون pagination + scroll
  maxHeight="500px"            // ✅ ارتفاع منطقة البيانات
  
  // === الأرقام والتعليم ===
  enableSequenceNumber={true}  // ✅ عمود الرقم التسلسلي
  enableMarker={true}          // ✅ نظام التعليم بالألوان
  
  // === المجاميع ===
  showSummaryHeader={true}     // ✅ ملخص في الأعلى
  showTotalsFooter={true}      // ✅ سطر المجاميع الثابت
  openingBalance={6072}        // ✅ الرصيد الافتتاحي
  debitKey="debit"             // ✅ مفتاح المدين
  creditKey="credit"           // ✅ مفتاح الدائن
  showAmountInWords={true}     // ✅ المبلغ بالكلمات
/>`}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
