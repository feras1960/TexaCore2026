import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Book,
  Search,
  Printer,
  CalendarIcon,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Check,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Building,
  Coins,
  Target,
  FolderOpen,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  Edit2,
  Save,
  ChevronLeft,
  ChevronRight,
  Package,
  User,
  FileCheck,
  Palette,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { flatAccounts, currencies, costCenters } from './data/accountingData';
import { Textarea } from '@/components/ui/textarea';
import QuickActionsBar from './components/QuickActionsBar';
import { 
  JournalEntryDetailSheet, 
  InvoiceDetailSheet, 
  PaymentDetailSheet,
  type JournalEntryData,
  type InvoiceData,
  type PaymentData 
} from '@/components/shared/details';

// Reconciliation Colors - 9 preset colors
const RECONCILIATION_COLORS = [
  { id: 'none', color: 'transparent', bg: 'bg-transparent', label: 'بدون', labelEn: 'None' },
  { id: 'green', color: '#22c55e', bg: 'bg-green-100', label: 'أخضر', labelEn: 'Green' },
  { id: 'red', color: '#ef4444', bg: 'bg-red-100', label: 'أحمر', labelEn: 'Red' },
  { id: 'yellow', color: '#eab308', bg: 'bg-yellow-100', label: 'أصفر', labelEn: 'Yellow' },
  { id: 'blue', color: '#3b82f6', bg: 'bg-blue-100', label: 'أزرق', labelEn: 'Blue' },
  { id: 'purple', color: '#a855f7', bg: 'bg-purple-100', label: 'بنفسجي', labelEn: 'Purple' },
  { id: 'orange', color: '#f97316', bg: 'bg-orange-100', label: 'برتقالي', labelEn: 'Orange' },
  { id: 'gray', color: '#6b7280', bg: 'bg-gray-200', label: 'رمادي', labelEn: 'Gray' },
  { id: 'pink', color: '#ec4899', bg: 'bg-pink-100', label: 'وردي', labelEn: 'Pink' },
  { id: 'cyan', color: '#06b6d4', bg: 'bg-cyan-100', label: 'سماوي', labelEn: 'Cyan' },
];

// Types
interface GLEntry {
  id: string;
  date: string;
  voucherType: string;
  voucherNo: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  costCenter?: string;
  project?: string;
  status: 'posted' | 'cancelled' | 'draft';
  reconciliationColor?: string;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: string;
  balance?: number;
}

// Mock companies
const companies = [
  { id: 'comp1', name: 'الشركة الرئيسية', nameEn: 'Main Company' },
  { id: 'comp2', name: 'الشركة الفرعية', nameEn: 'Branch Company' },
  { id: 'comp3', name: 'شركة التوزيع', nameEn: 'Distribution Company' },
];

// Mock finance books
const financeBooks = [
  { id: 'main', name: 'الدفتر الرئيسي', nameEn: 'Main Book' },
  { id: 'tax', name: 'دفتر الضرائب', nameEn: 'Tax Book' },
  { id: 'internal', name: 'الدفتر الداخلي', nameEn: 'Internal Book' },
];

// Mock projects
const projects = [
  { id: 'proj1', name: 'مشروع التوسع', nameEn: 'Expansion Project' },
  { id: 'proj2', name: 'مشروع التطوير', nameEn: 'Development Project' },
  { id: 'proj3', name: 'مشروع التحديث', nameEn: 'Modernization Project' },
];

// Mock accounts with balances
const accountsWithBalances: AccountOption[] = flatAccounts.map(acc => ({
  ...acc,
  balance: Math.floor(Math.random() * 500000) - 100000,
}));

// Number to Arabic Words converter
const numberToArabicWords = (num: number): string => {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  const isNegative = num < 0;
  num = Math.abs(Math.floor(num));
  
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    const millionWord = millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : `${numberToArabicWords(millions)} ملايين`;
    return (isNegative ? 'سالب ' : '') + millionWord + (remainder > 0 ? ' و' + numberToArabicWords(remainder) : '');
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    const thousandWord = thousands === 1 ? 'ألف' : thousands === 2 ? 'ألفان' : `${numberToArabicWords(thousands)} آلاف`;
    return (isNegative ? 'سالب ' : '') + thousandWord + (remainder > 0 ? ' و' + numberToArabicWords(remainder) : '');
  }
  
  if (num >= 100) {
    const hundredPart = Math.floor(num / 100);
    const remainder = num % 100;
    return (isNegative ? 'سالب ' : '') + hundreds[hundredPart] + (remainder > 0 ? ' و' + numberToArabicWords(remainder) : '');
  }
  
  if (num >= 20) {
    const tenPart = Math.floor(num / 10);
    const onePart = num % 10;
    return (isNegative ? 'سالب ' : '') + (onePart > 0 ? ones[onePart] + ' و' : '') + tens[tenPart];
  }
  
  if (num >= 10) {
    return (isNegative ? 'سالب ' : '') + teens[num - 10];
  }
  
  return (isNegative ? 'سالب ' : '') + ones[num];
};

const formatAmountInWords = (amount: number, currency: string = 'SAR'): string => {
  const absAmount = Math.abs(amount);
  const intPart = Math.floor(absAmount);
  const decPart = Math.round((absAmount - intPart) * 100);
  
  const currencyNames: Record<string, { main: string; sub: string }> = {
    'SAR': { main: 'ريال سعودي', sub: 'هللة' },
    'USD': { main: 'دولار أمريكي', sub: 'سنت' },
    'EUR': { main: 'يورو', sub: 'سنت' },
    'AED': { main: 'درهم إماراتي', sub: 'فلس' },
  };
  
  const curr = currencyNames[currency] || currencyNames['SAR'];
  
  let result = numberToArabicWords(intPart) + ' ' + curr.main;
  if (decPart > 0) {
    result += ' و' + numberToArabicWords(decPart) + ' ' + curr.sub;
  }
  
  if (amount < 0) {
    result = 'سالب ' + result;
  }
  
  return result + ' فقط لا غير';
};

// Mock GL Entries Generator
const generateMockEntries = (accountId: string, dateFrom: string, dateTo: string): GLEntry[] => {
  const entries: GLEntry[] = [];
  let runningBalance = 0;
  
  // Opening balance
  const openingBalance = Math.floor(Math.random() * 100000) - 20000;
  runningBalance = openingBalance;
  
  entries.push({
    id: 'opening',
    date: dateFrom,
    voucherType: 'Opening',
    voucherNo: '-',
    description: 'رصيد افتتاحي / Opening Balance',
    reference: '-',
    debit: openingBalance > 0 ? openingBalance : 0,
    credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
    balance: runningBalance,
    status: 'posted',
  });

  const voucherTypes = [
    { type: 'JV', label: 'قيد محاسبي' },
    { type: 'SI', label: 'فاتورة مبيعات' },
    { type: 'PI', label: 'فاتورة مشتريات' },
    { type: 'RV', label: 'سند قبض' },
    { type: 'PV', label: 'سند صرف' },
    { type: 'CN', label: 'إشعار دائن' },
    { type: 'DN', label: 'إشعار مدين' },
  ];

  const descriptions = [
    'دفعة من العميل',
    'تحويل بين حسابات',
    'مصاريف تشغيلية',
    'إيرادات خدمات',
    'سداد مستحقات',
    'مشتريات نقدية',
    'مصاريف إدارية',
    'عمولات بنكية',
    'إيجار شهري',
    'رواتب موظفين',
  ];

  const count = Math.floor(Math.random() * 30) + 15;
  const startDate = parseISO(dateFrom);
  const daysDiff = Math.max(1, Math.floor((parseISO(dateTo).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  for (let i = 0; i < count; i++) {
    const isDebit = Math.random() > 0.45;
    const amount = Math.floor(Math.random() * 50000) + 500;
    const debit = isDebit ? amount : 0;
    const credit = !isDebit ? amount : 0;
    runningBalance += (debit - credit);
    
    const voucherInfo = voucherTypes[Math.floor(Math.random() * voucherTypes.length)];
    const randomDays = Math.floor(Math.random() * daysDiff);
    const entryDate = new Date(startDate);
    entryDate.setDate(entryDate.getDate() + randomDays);

    entries.push({
      id: `GL-${2024000 + i + 1}`,
      date: format(entryDate, 'yyyy-MM-dd'),
      voucherType: voucherInfo.type,
      voucherNo: `${voucherInfo.type}-${2024}${String(i + 1).padStart(4, '0')}`,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      reference: Math.random() > 0.5 ? `REF-${Math.floor(Math.random() * 9000) + 1000}` : '-',
      debit,
      credit,
      balance: runningBalance,
      costCenter: costCenters[Math.floor(Math.random() * costCenters.length)]?.name,
      project: projects[Math.floor(Math.random() * projects.length)]?.name,
      status: Math.random() > 0.1 ? 'posted' : (Math.random() > 0.5 ? 'draft' : 'cancelled'),
    });
  }

  // Sort by date
  entries.sort((a, b) => {
    if (a.id === 'opening') return -1;
    if (b.id === 'opening') return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Recalculate balances after sorting
  let balance = 0;
  entries.forEach((entry, index) => {
    if (index === 0) {
      balance = entry.debit - entry.credit;
    } else {
      balance += entry.debit - entry.credit;
    }
    entry.balance = balance;
  });

  return entries;
};

export default function GeneralLedgerPage() {
  const { t, language, direction } = useLanguage();

  // Filter States
  const [company, setCompany] = useState<string>('comp1');
  const [financeBook, setFinanceBook] = useState<string>('main');
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [accountSearchOpen, setAccountSearchOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountCode, setAccountCode] = useState<string>('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [costCenter, setCostCenter] = useState<string>('all');
  const [project, setProject] = useState<string>('all');
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Reconciliation
  const [selectedReconciliationColor, setSelectedReconciliationColor] = useState<string>('green');
  const [markedEntries, setMarkedEntries] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Data
  const [entries, setEntries] = useState<GLEntry[]>([]);

  // Entry Details Sheet
  const [selectedEntry, setSelectedEntry] = useState<GLEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTabs, setSheetTabs] = useState<Array<{id: string; type: 'entry' | 'account' | 'product'; title: string; data: any}>>([]);
  const [activeSheetTab, setActiveSheetTab] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // New Detail Sheets
  const [journalDetailOpen, setJournalDetailOpen] = useState(false);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<JournalEntryData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);

  // Open entry details
  const openEntryDetails = (entry: GLEntry) => {
    const tabId = `entry-${entry.id}`;
    const existingTab = sheetTabs.find(t => t.id === tabId);
    if (existingTab) {
      setActiveSheetTab(tabId);
    } else {
      const newTab = {
        id: tabId,
        type: 'entry' as const,
        title: entry.voucherNo,
        data: entry
      };
      setSheetTabs([newTab]);
      setActiveSheetTab(tabId);
    }
    setSelectedEntry(entry);
    setSheetOpen(true);
    setIsEditing(false);
  };

  // Open enhanced entry details based on voucher type
  const openEnhancedEntryDetails = (entry: GLEntry) => {
    const voucherType = entry.voucherType.toLowerCase();
    
    // Check if it's an invoice (SI, PI, etc.) - check this first as it's more specific
    if (voucherType === 'si' || voucherType === 'pi' || voucherType.includes('invoice') || voucherType.includes('فاتورة') || voucherType === 'sinv' || voucherType === 'pinv') {
      const isSales = voucherType === 'si' || voucherType.includes('sales') || voucherType.includes('مبيعات') || voucherType === 'sinv';
      const invoiceData: InvoiceData = {
        id: entry.id,
        invoiceNo: entry.voucherNo,
        invoiceType: isSales ? 'sales' : 'purchase',
        date: entry.date,
        status: 'submitted',
        partyName: isSales ? 'العميل - شركة ABC' : 'المورد - شركة XYZ',
        partyNameAr: isSales ? 'العميل - شركة ABC' : 'المورد - شركة XYZ',
        partyType: isSales ? 'customer' : 'supplier',
        partyPhone: '+966 50 123 4567',
        partyEmail: 'info@company.com',
        partyAddress: 'الرياض، المملكة العربية السعودية',
        partyTaxId: '300123456700003',
        currency: 'SAR',
        paymentTerms: 'صافي 30 يوم',
        paymentMethod: 'تحويل بنكي',
        salesPerson: 'أحمد محمد',
        subtotal: entry.debit || entry.credit,
        taxRate: 15,
        taxAmount: (entry.debit || entry.credit) * 0.15,
        grandTotal: (entry.debit || entry.credit) * 1.15,
        paidAmount: Math.random() > 0.5 ? (entry.debit || entry.credit) * 0.5 : 0,
        balance: Math.random() > 0.5 ? (entry.debit || entry.credit) * 0.65 : (entry.debit || entry.credit) * 1.15,
        items: [
          { id: '1', itemCode: 'FAB001', itemName: 'قماش قطني', itemNameAr: 'قماش قطني', description: 'قماش قطني 100%', quantity: 50, uom: 'متر', unitPrice: (entry.debit || entry.credit) * 0.4 / 50, taxRate: 15, taxAmount: (entry.debit || entry.credit) * 0.4 * 0.15 / 50, lineTotal: (entry.debit || entry.credit) * 0.4 },
          { id: '2', itemCode: 'FAB002', itemName: 'قماش حرير', itemNameAr: 'قماش حرير', description: 'قماش حرير طبيعي', quantity: 30, uom: 'متر', unitPrice: (entry.debit || entry.credit) * 0.35 / 30, taxRate: 15, taxAmount: (entry.debit || entry.credit) * 0.35 * 0.15 / 30, lineTotal: (entry.debit || entry.credit) * 0.35 },
          { id: '3', itemCode: 'ACC001', itemName: 'خيوط تطريز', itemNameAr: 'خيوط تطريز', description: 'خيوط تطريز متعددة الألوان', quantity: 100, uom: 'بكرة', unitPrice: (entry.debit || entry.credit) * 0.25 / 100, taxRate: 15, taxAmount: (entry.debit || entry.credit) * 0.25 * 0.15 / 100, lineTotal: (entry.debit || entry.credit) * 0.25 },
        ],
        accountingEntries: [
          { id: '1', accountCode: isSales ? '1201' : '2101', accountName: isSales ? 'العملاء' : 'الموردون', accountNameAr: isSales ? 'العملاء' : 'الموردون', debit: isSales ? (entry.debit || entry.credit) * 1.15 : 0, credit: isSales ? 0 : (entry.debit || entry.credit) * 1.15 },
          { id: '2', accountCode: isSales ? '4101' : '5101', accountName: isSales ? 'المبيعات' : 'المشتريات', accountNameAr: isSales ? 'المبيعات' : 'المشتريات', debit: isSales ? 0 : entry.debit || entry.credit, credit: isSales ? entry.debit || entry.credit : 0 },
          { id: '3', accountCode: '2201', accountName: 'ضريبة القيمة المضافة', accountNameAr: 'ضريبة القيمة المضافة', debit: isSales ? 0 : (entry.debit || entry.credit) * 0.15, credit: isSales ? (entry.debit || entry.credit) * 0.15 : 0 },
        ],
        remarks: entry.description,
        reference: entry.reference,
      };
      setSelectedInvoice(invoiceData);
      setInvoiceDetailOpen(true);
    }
    // Check if it's a payment/receipt (RV, PV, etc.)
    else if (voucherType === 'rv' || voucherType === 'pv' || voucherType.includes('payment') || voucherType.includes('receipt') || voucherType.includes('سند')) {
      const isReceipt = voucherType === 'rv' || voucherType.includes('receipt') || voucherType.includes('قبض');
      const paymentData: PaymentData = {
        id: entry.id,
        voucherNo: entry.voucherNo,
        voucherType: isReceipt ? 'receipt' : 'payment',
        date: entry.date,
        status: entry.status,
        paymentType: isReceipt ? 'receive' : 'pay',
        amount: entry.debit || entry.credit,
        currency: 'SAR',
        partyId: 'CUST001',
        partyName: isReceipt ? 'شركة الرياض للتجارة' : 'مؤسسة النور للمستلزمات',
        partyNameAr: isReceipt ? 'شركة الرياض للتجارة' : 'مؤسسة النور للمستلزمات',
        partyType: isReceipt ? 'customer' : 'supplier',
        partyPhone: '+966 50 123 4567',
        paymentMethod: Math.random() > 0.5 ? 'cash' : 'bank',
        paymentAccount: '1101',
        paymentAccountName: 'الصندوق الرئيسي',
        description: entry.description,
        descriptionAr: entry.description,
        reference: entry.reference,
        references: [
          { id: '1', documentType: 'invoice', documentNo: `INV-2024-${Math.floor(Math.random() * 1000)}`, date: entry.date, originalAmount: (entry.debit || entry.credit) * 1.5, allocatedAmount: entry.debit || entry.credit },
        ],
        accountingEntries: [
          { id: '1', accountCode: '1101', accountName: 'نقد في الصندوق', accountNameAr: 'نقد في الصندوق', debit: isReceipt ? (entry.debit || entry.credit) : 0, credit: isReceipt ? 0 : (entry.debit || entry.credit) },
          { id: '2', accountCode: isReceipt ? '1201' : '2101', accountName: isReceipt ? 'العملاء' : 'الموردون', accountNameAr: isReceipt ? 'العملاء' : 'الموردون', debit: isReceipt ? 0 : (entry.debit || entry.credit), credit: isReceipt ? (entry.debit || entry.credit) : 0 },
        ],
        remarks: entry.description,
      };
      setSelectedPayment(paymentData);
      setPaymentDetailOpen(true);
    }
    // Check if it's a journal entry (JV)
    else if (voucherType === 'jv' || voucherType.includes('journal') || voucherType.includes('قيد')) {
      const journalData: JournalEntryData = {
        id: entry.id,
        voucherNo: entry.voucherNo,
        voucherType: 'journal',
        date: entry.date,
        status: entry.status,
        description: entry.description,
        reference: entry.reference,
        costCenter: entry.costCenter,
        project: entry.project,
        lines: [
          { id: '1', accountCode: '1101', accountName: 'نقد في الصندوق', accountNameAr: 'نقد في الصندوق', debit: entry.debit, credit: 0, description: entry.description, currency: 'SAR', exchangeRate: 1 },
          { id: '2', accountCode: '4101', accountName: 'إيرادات المبيعات', accountNameAr: 'إيرادات المبيعات', debit: 0, credit: entry.credit || entry.debit, description: entry.description, currency: 'SAR', exchangeRate: 1 },
        ],
      };
      setSelectedJournalEntry(journalData);
      setJournalDetailOpen(true);
    }
    // Handle credit/debit notes (CN, DN) as invoices
    else if (voucherType === 'cn' || voucherType === 'dn') {
      const isCreditNote = voucherType === 'cn';
      const invoiceData: InvoiceData = {
        id: entry.id,
        invoiceNo: entry.voucherNo,
        invoiceType: isCreditNote ? 'credit_note' : 'debit_note',
        date: entry.date,
        status: 'submitted',
        partyName: 'العميل / المورد',
        partyType: 'customer',
        currency: 'SAR',
        subtotal: entry.debit || entry.credit,
        taxAmount: (entry.debit || entry.credit) * 0.15,
        grandTotal: (entry.debit || entry.credit) * 1.15,
        paidAmount: 0,
        balance: (entry.debit || entry.credit) * 1.15,
        items: [
          { id: '1', itemCode: 'ITM001', itemName: isCreditNote ? 'مرتجعات' : 'تعديل مدين', quantity: 1, uom: 'وحدة', unitPrice: entry.debit || entry.credit, lineTotal: entry.debit || entry.credit },
        ],
        accountingEntries: [
          { id: '1', accountCode: '1201', accountName: 'العملاء', debit: isCreditNote ? 0 : (entry.debit || entry.credit) * 1.15, credit: isCreditNote ? (entry.debit || entry.credit) * 1.15 : 0 },
          { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: isCreditNote ? entry.debit || entry.credit : 0, credit: isCreditNote ? 0 : entry.debit || entry.credit },
        ],
        remarks: entry.description,
      };
      setSelectedInvoice(invoiceData);
      setInvoiceDetailOpen(true);
    }
    // Default to old behavior for any unmatched types
    else {
      openEntryDetails(entry);
    }
  };

  // Open account drill-down
  const openAccountDrillDown = (accountId: string, accountName: string) => {
    const tabId = `account-${accountId}`;
    const existingTab = sheetTabs.find(t => t.id === tabId);
    if (existingTab) {
      setActiveSheetTab(tabId);
    } else {
      const newTab = {
        id: tabId,
        type: 'account' as const,
        title: accountName,
        data: { id: accountId, name: accountName }
      };
      setSheetTabs(prev => [...prev, newTab]);
      setActiveSheetTab(tabId);
    }
  };

  // Close sheet tab
  const closeSheetTab = (tabId: string) => {
    const newTabs = sheetTabs.filter(t => t.id !== tabId);
    if (newTabs.length === 0) {
      setSheetOpen(false);
      setSheetTabs([]);
      setActiveSheetTab('');
    } else {
      if (activeSheetTab === tabId) {
        setActiveSheetTab(newTabs[newTabs.length - 1].id);
      }
      setSheetTabs(newTabs);
    }
  };

  // Toggle reconciliation mark for an entry
  const toggleReconciliationMark = (entryId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedEntries(prev => {
      const newMarked = { ...prev };
      if (newMarked[entryId] === selectedReconciliationColor) {
        // If same color, remove mark
        delete newMarked[entryId];
      } else {
        // Set new color
        newMarked[entryId] = selectedReconciliationColor;
      }
      return newMarked;
    });
  };

  // Get background class for marked entry
  const getReconciliationBg = (entryId: string) => {
    const colorId = markedEntries[entryId];
    if (!colorId) return '';
    const color = RECONCILIATION_COLORS.find(c => c.id === colorId);
    return color?.bg || '';
  };

  // Sync account code when account is selected
  useEffect(() => {
    if (selectedAccount) {
      setAccountCode(selectedAccount.code);
    }
  }, [selectedAccount]);

  // Account dropdown ref for click outside
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setAccountSearchOpen(false);
      }
    };
    
    if (accountSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountSearchOpen]);

  // Handle account code change - find matching account
  const handleAccountCodeChange = (code: string) => {
    setAccountCode(code);
    const matchedAccount = accountsWithBalances.find(acc => acc.code === code);
    if (matchedAccount) {
      setSelectedAccount(matchedAccount);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setCompany('comp1');
    setFinanceBook('main');
    setSelectedAccount(null);
    setAccountCode('');
    setCurrency('SAR');
    setCostCenter('all');
    setProject('all');
    setVoucherNo('');
    setShowCancelled(false);
    setDateFrom(startOfMonth(new Date()));
    setDateTo(new Date());
    setEntries([]);
  };

  // Filtered accounts for search
  const filteredAccounts = useMemo(() => {
    if (!accountSearch || accountSearch.trim() === '') {
      return accountsWithBalances;
    }
    const search = accountSearch.toLowerCase().trim();
    return accountsWithBalances.filter(acc =>
      acc.name?.toLowerCase().includes(search) ||
      acc.nameEn?.toLowerCase().includes(search) ||
      acc.code?.toLowerCase().includes(search)
    );
  }, [accountSearch, accountsWithBalances]);

  // Load data
  const loadData = () => {
    if (!selectedAccount) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const data = generateMockEntries(
        selectedAccount.id,
        format(dateFrom, 'yyyy-MM-dd'),
        format(dateTo, 'yyyy-MM-dd')
      );
      
      let filtered = data;
      if (!showCancelled) {
        filtered = data.filter(e => e.status !== 'cancelled');
      }
      if (costCenter && costCenter !== 'all') {
        filtered = filtered.filter(e => e.costCenter === costCenter);
      }
      if (project && project !== 'all') {
        filtered = filtered.filter(e => e.project === project);
      }
      if (voucherNo) {
        filtered = filtered.filter(e => e.voucherNo.toLowerCase().includes(voucherNo.toLowerCase()));
      }
      
      setEntries(filtered);
      setIsLoading(false);
    }, 500);
  };

  // Totals calculation
  const totals = useMemo(() => {
    const result = entries.reduce((acc, entry) => {
      if (entry.id !== 'opening') {
        acc.totalDebit += entry.debit;
        acc.totalCredit += entry.credit;
      }
      return acc;
    }, { totalDebit: 0, totalCredit: 0 });
    
    const openingEntry = entries.find(e => e.id === 'opening');
    const openingBalance = openingEntry ? (openingEntry.debit - openingEntry.credit) : 0;
    const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
    
    return {
      ...result,
      openingBalance,
      closingBalance,
      netMovement: result.totalDebit - result.totalCredit,
    };
  }, [entries]);

  // Quick date presets
  const datePresets = [
    { label: t('filters.today'), from: new Date(), to: new Date() },
    { label: t('filters.yesterday'), from: subDays(new Date(), 1), to: subDays(new Date(), 1) },
    { label: t('filters.thisWeek'), from: startOfWeek(new Date(), { weekStartsOn: 0 }), to: endOfWeek(new Date(), { weekStartsOn: 0 }) },
    { label: t('filters.lastWeek'), from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }) },
    { label: t('filters.thisMonth'), from: startOfMonth(new Date()), to: new Date() },
    { label: t('filters.lastMonth'), from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) },
    { label: t('filters.thisYear'), from: startOfYear(new Date()), to: new Date() },
  ];

  // Generate CSV data for export
  const generateCSVData = () => {
    if (entries.length === 0) return '';
    
    const headers = [
      language === 'ar' ? 'التاريخ' : 'Date',
      language === 'ar' ? 'نوع القيد' : 'Voucher Type',
      language === 'ar' ? 'رقم القيد' : 'Voucher No',
      language === 'ar' ? 'البيان' : 'Description',
      language === 'ar' ? 'المرجع' : 'Reference',
      language === 'ar' ? 'مدين' : 'Debit',
      language === 'ar' ? 'دائن' : 'Credit',
      language === 'ar' ? 'الرصيد' : 'Balance',
      language === 'ar' ? 'مركز التكلفة' : 'Cost Center',
      language === 'ar' ? 'المشروع' : 'Project',
    ];
    
    const rows = entries.map(entry => [
      entry.date,
      entry.voucherType,
      entry.voucherNo,
      entry.description,
      entry.reference,
      entry.debit.toString(),
      entry.credit.toString(),
      entry.balance.toString(),
      entry.costCenter || '',
      entry.project || '',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');
    return csvContent;
  };

  const handleExportGoogleSheets = async () => {
    if (entries.length === 0) {
      alert(t('common.noDataToExport'));
      return;
    }
    
    // Generate CSV/TSV data
    const csvData = generateCSVData();
    
    try {
      // Copy to clipboard first
      await navigator.clipboard.writeText(csvData);
      
      // Show instructions
      const message = language === 'ar' 
        ? 'تم نسخ البيانات بنجاح!\n\n1. سيتم فتح جداول غوغل في نافذة جديدة\n2. اضغط Ctrl+V (أو Cmd+V في ماك) للصق البيانات\n3. اختر "تقسيم النص إلى أعمدة" إذا ظهرت الخيار'
        : 'Data copied successfully!\n\n1. Google Sheets will open in a new window\n2. Press Ctrl+V (or Cmd+V on Mac) to paste data\n3. Choose "Split text to columns" if prompted';
      
      alert(message);
      
      // Open Google Sheets
      window.open('https://docs.google.com/spreadsheets/create', '_blank');
    } catch (err) {
      // Fallback: Create a textarea and copy manually
      const textarea = document.createElement('textarea');
      textarea.value = csvData;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        const message = language === 'ar' 
          ? 'تم نسخ البيانات! الصق (Ctrl+V) في جداول غوغل'
          : 'Data copied! Paste (Ctrl+V) in Google Sheets';
        alert(message);
        window.open('https://docs.google.com/spreadsheets/create', '_blank');
      } catch (copyErr) {
        alert(t('common.copyFailed'));
      }
      
      document.body.removeChild(textarea);
    }
  };

  // Get print styles - RTL aware
  const getPrintStyles = () => {
    const isRTL = language === 'ar';
    return `
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; margin: 0; padding: 0; }
      html, body { direction: ${isRTL ? 'rtl' : 'ltr'}; }
      body { padding: 20px; font-size: 12px; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0A2540; padding-bottom: 15px; }
      .header h1 { color: #0A2540; margin: 0 0 10px 0; font-size: 24px; }
      .header .account-info { font-size: 16px; color: #333; margin: 5px 0; }
      .header .date-range { font-size: 14px; color: #666; }
      .summary { display: flex; justify-content: space-around; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 8px; flex-direction: ${isRTL ? 'row-reverse' : 'row'}; }
      .summary-item { text-align: center; }
      .summary-item .label { font-size: 12px; color: #666; }
      .summary-item .value { font-size: 18px; font-weight: bold; font-family: 'JetBrains Mono', monospace; }
      .summary-item .value.positive { color: #22c55e; }
      .summary-item .value.negative { color: #ef4444; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
      th { background: #0A2540; color: white; padding: 10px 6px; text-align: ${isRTL ? 'right' : 'left'}; font-weight: 600; }
      td { padding: 8px 6px; border-bottom: 1px solid #e5e5e5; text-align: ${isRTL ? 'right' : 'left'}; }
      tr:nth-child(even) { background: #fafafa; }
      .number { font-family: 'JetBrains Mono', monospace; text-align: ${isRTL ? 'left' : 'right'} !important; direction: ltr; }
      .debit { color: #22c55e; }
      .credit { color: #ef4444; }
      .balance-positive { color: #22c55e; font-weight: 600; }
      .balance-negative { color: #ef4444; font-weight: 600; }
      .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;
  };

  // Generate print HTML content
  const generatePrintHTML = () => {
    const isRTL = language === 'ar';
    return `
      <!DOCTYPE html>
      <html lang="${language}" dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${t('accounting.generalLedger')}</title>
          <style>${getPrintStyles()}</style>
        </head>
        <body dir="${isRTL ? 'rtl' : 'ltr'}">
          <div class="header">
            <h1>${t('accounting.generalLedger')}</h1>
            <div class="account-info">${selectedAccount ? (language === 'ar' ? selectedAccount.name : selectedAccount.nameEn) : ''} (${selectedAccount?.code || ''})</div>
            <div class="date-range">${t('filters.from')}: ${format(dateFrom, 'yyyy-MM-dd')} - ${t('filters.to')}: ${format(dateTo, 'yyyy-MM-dd')}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('accounting.openingBalance')}</div>
              <div class="value ${totals.openingBalance >= 0 ? 'positive' : 'negative'}">${Math.abs(totals.openingBalance).toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('totalDebit') || 'إجمالي المدين'}</div>
              <div class="value positive">${totals.totalDebit.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('accounting.labels.creditTotal')}</div>
              <div class="value negative">${totals.totalCredit.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('accounting.closingBalance')}</div>
              <div class="value ${totals.closingBalance >= 0 ? 'positive' : 'negative'}">${Math.abs(totals.closingBalance).toLocaleString()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>${t('common.date')}</th>
                <th>${t('common.voucherType')}</th>
                <th>${t('common.voucherNo')}</th>
                <th>${t('common.description')}</th>
                <th>${t('common.reference')}</th>
                <th class="number">${t('accounting.entry.debit')}</th>
                <th class="number">${t('accounting.entry.credit')}</th>
                <th class="number">${t('common.balance')}</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(entry => `
                <tr>
                  <td>${entry.date}</td>
                  <td>${entry.voucherType}</td>
                  <td class="number">${entry.voucherNo}</td>
                  <td>${entry.description}</td>
                  <td>${entry.reference}</td>
                  <td class="number debit">${entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                  <td class="number credit">${entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                  <td class="number ${entry.balance >= 0 ? 'balance-positive' : 'balance-negative'}">${Math.abs(entry.balance).toLocaleString()} ${entry.balance >= 0 ? (language === 'ar' ? 'م' : 'D') : (language === 'ar' ? 'د' : 'C')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            ${t('common.printedOn')}: ${format(new Date(), 'yyyy-MM-dd HH:mm')}
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = () => {
    if (entries.length === 0) {
      alert(t('common.noDataToExport'));
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handlePrint = () => {
    if (entries.length === 0) {
      alert(t('common.noDataToExport'));
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const getVoucherTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'JV': 'bg-blue-100 text-blue-700',
      'SI': 'bg-green-100 text-green-700',
      'PI': 'bg-orange-100 text-orange-700',
      'RV': 'bg-emerald-100 text-emerald-700',
      'PV': 'bg-rose-100 text-rose-700',
      'CN': 'bg-cyan-100 text-cyan-700',
      'DN': 'bg-amber-100 text-amber-700',
      'Opening': 'bg-gray-100 text-gray-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]" dir={direction}>
      {/* Row 1: Header - Title + Export Icons */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white dark:bg-slate-900 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <Book className="w-6 h-6 text-erp-teal" />
          <h1 className="text-xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('accounting.generalLedger')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <QuickActionsBar />
        </div>
      </div>

      {/* Row 2: Company, Finance Book, Cost Center, Project, Voucher No, Date From/To */}
      <div className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 dark:border-slate-600 w-[140px] flex-shrink-0">
              <Building className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-1" />
              <SelectValue placeholder={t('common.company')} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {language === 'ar' ? c.name : c.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={financeBook} onValueChange={setFinanceBook}>
            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 dark:border-slate-600 w-[130px] flex-shrink-0">
              <Book className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-1" />
              <SelectValue placeholder={t('common.financeBook')} />
            </SelectTrigger>
            <SelectContent>
              {financeBooks.map((fb) => (
                <SelectItem key={fb.id} value={fb.id}>
                  {language === 'ar' ? fb.name : fb.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={costCenter} onValueChange={setCostCenter}>
            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 dark:border-slate-600 w-[130px] flex-shrink-0">
              <Target className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-1" />
              <SelectValue placeholder={t('accounting.costCenters')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.name}>
                  {language === 'ar' ? cc.nameAr : cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 dark:border-slate-600 w-[130px] flex-shrink-0">
              <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-1" />
              <SelectValue placeholder={t('common.project')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {language === 'ar' ? p.name : p.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input 
            placeholder={t('common.voucherNo')} 
            value={voucherNo}
            onChange={(e) => setVoucherNo(e.target.value)}
            className="h-9 font-mono bg-white dark:bg-slate-800 dark:border-slate-600 w-[110px] flex-shrink-0"
          />

          <Separator orientation="vertical" className="h-7 mx-1" />

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 bg-white gap-1.5 w-[120px] flex-shrink-0">
                <CalendarIcon className="w-4 h-4" />
                {format(dateFrom, 'yyyy-MM-dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => date && setDateFrom(date)}
                locale={language === 'ar' ? ar : enUS}
              />
            </PopoverContent>
          </Popover>

          <span className="text-gray-400 text-sm">→</span>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 bg-white gap-1.5 w-[120px] flex-shrink-0">
                <CalendarIcon className="w-4 h-4" />
                {format(dateTo, 'yyyy-MM-dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => date && setDateTo(date)}
                locale={language === 'ar' ? ar : enUS}
              />
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-7 mx-1" />
          
          {/* Reconciliation Colors */}
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 px-2.5">
                <Palette className="w-3.5 h-3.5" />
                <div 
                  className="w-3.5 h-3.5 rounded-full border"
                  style={{ backgroundColor: RECONCILIATION_COLORS.find(c => c.id === selectedReconciliationColor)?.color }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="flex gap-2">
                {RECONCILIATION_COLORS.slice(1).map((color) => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedReconciliationColor(color.id);
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                      selectedReconciliationColor === color.id 
                        ? "ring-2 ring-offset-2 ring-erp-navy scale-110" 
                        : "border-gray-300"
                    )}
                    style={{ backgroundColor: color.color }}
                    title={language === 'ar' ? color.label : color.labelEn}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {/* Export Buttons */}
          <Button variant="outline" size="sm" className="h-9 px-2.5" onClick={handleExportGoogleSheets} title={t('common.googleSheets')}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-2.5" onClick={handleExportPDF} title="PDF">
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-2.5" onClick={handlePrint} title={t('print') || 'طباعة'}>
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 3: Account, Currency, Date Presets, Show Cancelled, Reset, Search */}
      <div className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Account Selection - Input with dropdown button */}
          <div ref={accountDropdownRef} className="relative flex-shrink-0 flex items-center">
            <Input
              placeholder={t('accounting.account.name')}
              value={accountSearch !== '' ? accountSearch : (selectedAccount ? (language === 'ar' ? selectedAccount.name : selectedAccount.nameEn) : '')}
              onChange={(e) => {
                const value = e.target.value;
                setAccountSearch(value);
                setAccountSearchOpen(true);
              }}
              onFocus={() => {
                // فقط افتح القائمة إذا لم يكن هناك حساب محدد
                if (!selectedAccount) {
                  setAccountSearchOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAccountSearchOpen(false);
                  setAccountSearch('');
                }
                if (e.key === 'ArrowDown') {
                  setAccountSearchOpen(true);
                }
              }}
              className="h-9 bg-white w-[220px] pr-3 pl-9"
            />
            <button
              type="button"
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors z-10"
              onClick={() => {
                setAccountSearchOpen(!accountSearchOpen);
              }}
            >
              <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", accountSearchOpen && "rotate-180")} />
            </button>
            {accountSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-md shadow-lg z-50 w-[380px]">
                <div className="p-2 border-b dark:border-slate-600">
                  <Input
                    placeholder={t('searchAccount') || 'ابحث عن حساب...'}
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                </div>
                <ScrollArea className="h-[260px]">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t('accounting.account.notFound')}
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredAccounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccount(account);
                            setAccountSearch('');
                            setAccountSearchOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-right hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors",
                            selectedAccount?.id === account.id && "bg-gray-50 dark:bg-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                "w-4 h-4",
                                selectedAccount?.id === account.id ? "opacity-100 text-erp-teal" : "opacity-0"
                              )}
                            />
                            <span className="font-mono text-xs text-gray-400">{account.code}</span>
                            <span className="text-sm">{language === 'ar' ? account.name : account.nameEn}</span>
                          </div>
                          <span className={cn(
                            "font-mono text-xs",
                            (account.balance || 0) >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {(account.balance || 0).toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Currency */}
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 dark:border-slate-600 w-[100px] flex-shrink-0">
              <Coins className="w-4 h-4 text-gray-400 ml-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-7 mx-1" />

          {/* Date Presets */}
          <div className="flex gap-0.5 flex-shrink-0">
            {datePresets.slice(0, 5).map((preset, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom(preset.from);
                  setDateTo(preset.to);
                }}
                className="h-8 px-2 text-xs hover:bg-white dark:hover:bg-slate-700"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-7 mx-1" />

          {/* Show Cancelled */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Checkbox 
              id="showCancelled" 
              checked={showCancelled}
              onCheckedChange={(checked) => setShowCancelled(checked as boolean)}
              className="w-4 h-4"
            />
            <Label htmlFor="showCancelled" className="text-xs cursor-pointer whitespace-nowrap">
              {t('common.showCancelledEntries')}
            </Label>
          </div>

          <div className="flex-1" />

          {/* Reset */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-9 gap-1.5 flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.reset')}
          </Button>

          {/* Search Button */}
          <Button 
            className="bg-erp-teal hover:bg-erp-teal/90 h-9 gap-2 px-4 flex-shrink-0" 
            onClick={loadData}
            disabled={!selectedAccount || isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {t('common.search')}
          </Button>
        </div>
      </div>

      {/* Summary Cards - Inline with larger text */}
      {entries.length > 0 && (
        <div className="flex items-center gap-6 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-gray-500">{t('accounting.openingBalance')}:</span>
            <span className={cn(
              "font-mono font-bold text-base",
              totals.openingBalance >= 0 ? "text-blue-600" : "text-red-600"
            )}>
              {Math.abs(totals.openingBalance).toLocaleString()}
            </span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            <span className="text-xs text-gray-500">{t('accounting.labels.debitTotal')}:</span>
            <span className="font-mono font-bold text-base text-green-600">
              {totals.totalDebit.toLocaleString()}
            </span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-rose-500" />
            <span className="text-xs text-gray-500">{t('totalCredit') || 'إجمالي الدائن'}:</span>
            <span className="font-mono font-bold text-base text-rose-600">
              {totals.totalCredit.toLocaleString()}
            </span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Building2 className={cn("w-5 h-5", totals.closingBalance >= 0 ? "text-purple-500" : "text-red-500")} />
            <span className="text-xs text-gray-500">{t('accounting.closingBalance')}:</span>
            <span className={cn(
              "font-mono font-bold text-base",
              totals.closingBalance >= 0 ? "text-purple-600" : "text-red-600"
            )}>
              {Math.abs(totals.closingBalance).toLocaleString()}
              <span className="text-xs font-normal mr-1">
                {totals.closingBalance >= 0 ? 'م' : 'د'}
              </span>
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mr-auto">{currency}</span>
        </div>
      )}

      {/* Ledger Table - Flexible Height */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
        {!selectedAccount ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p className="text-lg">{t('accounting.selectAccountPrompt')}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Book className="w-12 h-12 mb-4" />
            <p className="text-lg">{t('noEntriesFound') || 'لا توجد حركات في هذه الفترة'}</p>
            <p className="text-sm mt-1">{t('clickSearchToLoad') || 'اضغط على بحث لتحميل البيانات'}</p>
          </div>
        ) : (
          <>
            {/* Scrollable Table Body */}
            <div className="flex-1 overflow-auto min-h-0">
              <Table className="border-collapse">
                <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                  <TableRow className="h-12 border-b-2 border-slate-300 dark:border-slate-600">
                    <TableHead className="w-[40px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">✓</TableHead>
                    <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('debit') || 'مدين'}</TableHead>
                    <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('credit') || 'دائن'}</TableHead>
                    <TableHead className="w-[120px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('balance') || 'الرصيد'}</TableHead>
                    <TableHead className="w-[80px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('reference') || 'المرجع'}</TableHead>
                    <TableHead className="min-w-[180px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('description') || 'البيان'}</TableHead>
                    <TableHead className="w-[60px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('type') || 'النوع'}</TableHead>
                    <TableHead className="w-[100px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('voucherNo') || 'رقم القيد'}</TableHead>
                    <TableHead className="w-[90px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('date') || 'التاريخ'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow 
                      key={entry.id}
                      onClick={() => entry.id !== 'opening' && openEnhancedEntryDetails(entry)}
                      className={cn(
                        entry.id === 'opening' && !markedEntries[entry.id] && "bg-blue-50 font-medium",
                        entry.status === 'cancelled' && "opacity-50 line-through",
                        `h-12 hover:bg-blue-50/80 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50'}`,
                        getReconciliationBg(entry.id)
                      )}
                    >
                      <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <Checkbox
                          checked={!!markedEntries[entry.id]}
                          onCheckedChange={() => toggleReconciliationMark(entry.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "w-4 h-4",
                            markedEntries[entry.id] && "border-2"
                          )}
                          style={{
                            borderColor: markedEntries[entry.id] 
                              ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[entry.id])?.color 
                              : undefined,
                            backgroundColor: markedEntries[entry.id] 
                              ? RECONCILIATION_COLORS.find(c => c.id === markedEntries[entry.id])?.color 
                              : undefined,
                          }}
                        />
                      </TableCell>
                      <TableCell className={cn(
                        "text-center font-mono text-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5",
                        entry.debit > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"
                      )}>
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-center font-mono text-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5",
                        entry.credit > 0 ? "text-rose-600 font-semibold" : "text-slate-400"
                      )}>
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-center font-mono font-semibold text-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5",
                        entry.balance >= 0 ? "text-blue-600" : "text-rose-600"
                      )}>
                        {Math.abs(entry.balance).toLocaleString()}
                        <span className="text-xs text-slate-400 mr-1">
                          {entry.balance >= 0 ? 'م' : 'د'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-2.5">{entry.reference}</TableCell>
                      <TableCell className="truncate max-w-[180px] text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5" title={entry.description}>
                        {entry.description}
                      </TableCell>
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <Badge className={cn("text-xs font-medium px-2.5 py-1", getVoucherTypeBadge(entry.voucherType))}>
                          {entry.voucherType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5">{entry.voucherNo}</TableCell>
                      <TableCell className="font-mono text-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5">{entry.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Fixed Footer with Totals */}
            <div className="shrink-0 border-t-2 border-erp-navy bg-erp-navy text-white">
              <div className="flex items-center py-2 px-4 gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{t('marked') || 'معلّم'}:</span>
                  <span className="font-mono font-bold text-sm">{Object.keys(markedEntries).length}</span>
                </div>
                <Separator orientation="vertical" className="h-6 bg-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-300">{t('totalDebit') || 'مدين'}:</span>
                  <span className="font-mono font-bold text-green-300">{totals.totalDebit.toLocaleString()}</span>
                </div>
                <Separator orientation="vertical" className="h-6 bg-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-300">{t('totalCredit') || 'دائن'}:</span>
                  <span className="font-mono font-bold text-rose-300">{totals.totalCredit.toLocaleString()}</span>
                </div>
                <Separator orientation="vertical" className="h-6 bg-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-300">{t('closingBalance') || 'الرصيد'}:</span>
                  <span className={cn(
                    "font-mono font-bold",
                    totals.closingBalance >= 0 ? "text-blue-300" : "text-red-300"
                  )}>
                    {Math.abs(totals.closingBalance).toLocaleString()}
                    <span className="text-xs mr-1">{totals.closingBalance >= 0 ? 'م' : 'د'}</span>
                  </span>
                </div>
                <div className="mr-auto flex-1 truncate">
                  <span className="text-[10px] text-gray-400 ml-2">{t('amountInWords') || 'التفقيط'}:</span>
                  <span className={cn(
                    "text-xs",
                    totals.closingBalance >= 0 ? "text-blue-200" : "text-red-200"
                  )}>
                    {formatAmountInWords(totals.closingBalance, currency)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Entry Details Side Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent 
          side={direction === 'rtl' ? 'left' : 'right'} 
          className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b bg-gray-50 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-cairo">
                {t('entryDetails') || 'تفاصيل القيد'}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1">
                    <Edit2 className="w-3.5 h-3.5" />
                    {t('edit') || 'تعديل'}
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={() => setIsEditing(false)} className="gap-1 bg-erp-teal hover:bg-erp-teal/90">
                    <Save className="w-3.5 h-3.5" />
                    {t('save') || 'حفظ'}
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Tabs Navigation */}
          {sheetTabs.length > 0 && (
            <div className="px-2 py-1 border-b dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
              <div className="flex gap-1">
                {sheetTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm cursor-pointer border border-b-0 transition-colors",
                      activeSheetTab === tab.id
                        ? "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 font-medium"
                        : "bg-gray-100 dark:bg-slate-700 border-transparent hover:bg-gray-200 dark:hover:bg-slate-600"
                    )}
                    onClick={() => setActiveSheetTab(tab.id)}
                  >
                    {tab.type === 'entry' && <FileCheck className="w-3.5 h-3.5 text-blue-500" />}
                    {tab.type === 'account' && <FolderOpen className="w-3.5 h-3.5 text-purple-500" />}
                    {tab.type === 'product' && <Package className="w-3.5 h-3.5 text-green-500" />}
                    <span className="truncate max-w-[100px]">{tab.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSheetTab(tab.id);
                      }}
                      className="p-0.5 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {sheetTabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "space-y-4",
                  activeSheetTab !== tab.id && "hidden"
                )}
              >
                {tab.type === 'entry' && (
                  <EntryDetailsContent 
                    entry={tab.data} 
                    isEditing={isEditing}
                    onAccountClick={openAccountDrillDown}
                    language={language}
                    t={t}
                  />
                )}
                {tab.type === 'account' && (
                  <AccountDrillDownContent 
                    accountId={tab.data.id}
                    accountName={tab.data.name}
                    language={language}
                    t={t}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Enhanced Detail Sheets */}
      <JournalEntryDetailSheet
        open={journalDetailOpen}
        onOpenChange={setJournalDetailOpen}
        entry={selectedJournalEntry}
        onEdit={() => {
          console.log('Edit journal entry:', selectedJournalEntry?.voucherNo);
          // TODO: Implement edit functionality
        }}
        onDelete={() => {
          console.log('Delete journal entry:', selectedJournalEntry?.voucherNo);
          // TODO: Implement delete functionality
          setJournalDetailOpen(false);
        }}
        onPrint={() => console.log('Print journal entry')}
        onAccountClick={(code, name) => {
          setJournalDetailOpen(false);
          openAccountDrillDown(code, name);
          setSheetOpen(true);
        }}
        isEditable={true}
        isDeletable={true}
      />

      <InvoiceDetailSheet
        open={invoiceDetailOpen}
        onOpenChange={setInvoiceDetailOpen}
        invoice={selectedInvoice}
        onEdit={() => {
          console.log('Edit invoice:', selectedInvoice?.invoiceNo);
          // TODO: Implement edit functionality
        }}
        onDelete={() => {
          console.log('Delete invoice:', selectedInvoice?.invoiceNo);
          // TODO: Implement delete functionality
          setInvoiceDetailOpen(false);
        }}
        onPrint={() => console.log('Print invoice')}
        onAccountClick={(code, name) => {
          setInvoiceDetailOpen(false);
          openAccountDrillDown(code, name);
          setSheetOpen(true);
        }}
        isEditable={true}
        isDeletable={true}
      />

      <PaymentDetailSheet
        open={paymentDetailOpen}
        onOpenChange={setPaymentDetailOpen}
        payment={selectedPayment}
        onEdit={() => {
          console.log('Edit payment:', selectedPayment?.voucherNo);
          // TODO: Implement edit functionality
        }}
        onDelete={() => {
          console.log('Delete payment:', selectedPayment?.voucherNo);
          // TODO: Implement delete functionality
          setPaymentDetailOpen(false);
        }}
        onPrint={() => console.log('Print payment')}
        onAccountClick={(code, name) => {
          setPaymentDetailOpen(false);
          openAccountDrillDown(code, name);
          setSheetOpen(true);
        }}
        isEditable={true}
        isDeletable={true}
      />
    </div>
  );
}

// Entry Details Content Component
function EntryDetailsContent({ 
  entry, 
  isEditing, 
  onAccountClick,
  language,
  t 
}: { 
  entry: GLEntry; 
  isEditing: boolean;
  onAccountClick: (id: string, name: string) => void;
  language: string;
  t: (key: string) => string;
}) {
  const [description, setDescription] = useState(entry.description);
  const [reference, setReference] = useState(entry.reference);

  // Mock line items for the entry
  const lineItems = [
    { account: '1101', accountName: 'نقد في الصندوق', debit: entry.debit, credit: 0 },
    { account: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: entry.credit || entry.debit },
  ];

  return (
    <div className="space-y-6">
      {/* Entry Header Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">{t('voucherNo') || 'رقم القيد'}</Label>
          <p className="font-mono font-bold text-lg">{entry.voucherNo}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">{t('date') || 'التاريخ'}</Label>
          <p className="font-mono">{entry.date}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">{t('type') || 'النوع'}</Label>
          <Badge>{entry.voucherType}</Badge>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">{t('status') || 'الحالة'}</Label>
          <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'}>
            {entry.status === 'posted' ? (t('posted') || 'مرحّل') : 
             entry.status === 'cancelled' ? (t('cancelled') || 'ملغي') : (t('draft') || 'مسودة')}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">{t('description') || 'البيان'}</Label>
        {isEditing ? (
          <Textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none"
            rows={2}
          />
        ) : (
          <p className="text-sm bg-gray-50 p-2 rounded">{entry.description}</p>
        )}
      </div>

      {/* Reference */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">{t('reference') || 'المرجع'}</Label>
        {isEditing ? (
          <Input 
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="font-mono"
          />
        ) : (
          <p className="font-mono text-sm bg-gray-50 p-2 rounded">{entry.reference || '-'}</p>
        )}
      </div>

      <Separator />

      {/* Line Items */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-500 font-bold">{t('lineItems') || 'بنود القيد'}</Label>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs">{t('account') || 'الحساب'}</TableHead>
                <TableHead className="text-xs text-center w-[100px]">{t('debit') || 'مدين'}</TableHead>
                <TableHead className="text-xs text-center w-[100px]">{t('credit') || 'دائن'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-gray-50">
                  <TableCell>
                    <button
                      onClick={() => onAccountClick(item.account, item.accountName)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span className="font-mono text-xs text-gray-400">{item.account}</span>
                      <span className="text-sm">{item.accountName}</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm",
                    item.debit > 0 && "text-green-600 font-semibold"
                  )}>
                    {item.debit > 0 ? item.debit.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm",
                    item.credit > 0 && "text-rose-600 font-semibold"
                  )}>
                    {item.credit > 0 ? item.credit.toLocaleString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Additional Info */}
      {(entry.costCenter || entry.project) && (
        <>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entry.costCenter && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">{t('costCenter') || 'مركز التكلفة'}</Label>
                <p className="text-sm">{entry.costCenter}</p>
              </div>
            )}
            {entry.project && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">{t('project') || 'المشروع'}</Label>
                <p className="text-sm">{entry.project}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Account Drill-Down Content Component
function AccountDrillDownContent({ 
  accountId, 
  accountName,
  language,
  t 
}: { 
  accountId: string; 
  accountName: string;
  language: string;
  t: (key: string) => string;
}) {
  // Mock account data
  const accountDetails = {
    code: accountId,
    name: accountName,
    type: 'أصول متداولة',
    balance: 125000,
    currency: 'SAR',
    parent: 'الأصول',
  };

  // Mock recent transactions
  const recentTransactions = [
    { date: '2024-01-15', voucherNo: 'JV-20240001', description: 'دفعة من العميل', debit: 5000, credit: 0 },
    { date: '2024-01-14', voucherNo: 'PV-20240012', description: 'مصاريف إدارية', debit: 0, credit: 3000 },
    { date: '2024-01-13', voucherNo: 'RV-20240005', description: 'إيرادات خدمات', debit: 8000, credit: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FolderOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-mono text-sm text-gray-500">{accountDetails.code}</p>
            <h3 className="font-bold text-lg font-cairo">{accountDetails.name}</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500">{t('accountType') || 'نوع الحساب'}</p>
            <p className="text-sm font-medium">{accountDetails.type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('parent') || 'الحساب الأب'}</p>
            <p className="text-sm font-medium">{accountDetails.parent}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('currentBalance') || 'الرصيد الحالي'}</p>
            <p className="text-lg font-bold font-mono text-purple-600">
              {accountDetails.balance.toLocaleString()} {accountDetails.currency}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Recent Transactions */}
      <div className="space-y-2">
        <h4 className="font-bold text-sm">{t('recentTransactions') || 'آخر الحركات'}</h4>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs">{t('date') || 'التاريخ'}</TableHead>
                <TableHead className="text-xs">{t('voucherNo') || 'رقم القيد'}</TableHead>
                <TableHead className="text-xs">{t('description') || 'البيان'}</TableHead>
                <TableHead className="text-xs text-center">{t('debit') || 'مدين'}</TableHead>
                <TableHead className="text-xs text-center">{t('credit') || 'دائن'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((tx, idx) => (
                <TableRow key={idx} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-xs">{tx.date}</TableCell>
                  <TableCell className="font-mono text-xs">{tx.voucherNo}</TableCell>
                  <TableCell className="text-sm">{tx.description}</TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm",
                    tx.debit > 0 && "text-green-600 font-semibold"
                  )}>
                    {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-mono text-sm",
                    tx.credit > 0 && "text-rose-600 font-semibold"
                  )}>
                    {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Full Ledger Button */}
      <Button variant="outline" className="w-full gap-2">
        <Book className="w-4 h-4" />
        {t('viewFullLedger') || 'عرض كشف الحساب الكامل'}
      </Button>
    </div>
  );
}
