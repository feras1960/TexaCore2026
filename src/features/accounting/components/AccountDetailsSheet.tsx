import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from '@/components/ui/table';
// Commented out - qrcode.react package not installed
// import { QRCodeSVG } from 'qrcode.react';
import { 
  FileText, 
  Receipt, 
  CreditCard, 
  Printer,
  X,
  Save,
  MoreHorizontal,
  Send,
  Copy,
  Trash2,
  RotateCcw,
  Download,
  Edit2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  PauseCircle,
  Info,
  Plus,
  Minus,
  Book,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Sparkles,
  BarChart3,
  PieChart,
  CalendarCheck,
  MessageSquare,
  Bell,
  History,
  Wallet,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Hash,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  Search,
  Palette,
  Loader2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { flatAccounts, currencies } from '../data/accountingData';

// Import real data hooks
import { useAccountLedger, useAccountStats, useAccountPayments, useRecentActivity } from '@/hooks/useAccountLedger';
import { accountsService } from '@/services/accountsService';
import type { LedgerEntry, AccountStats, PaymentEntry } from '@/services/accountLedgerService';

// Main Tab Types
type MainTabType = 'overview' | 'ledger' | 'invoices' | 'payments' | 'reservations' | 'ai-analysis' | 'events';

// Reconciliation Colors for Ledger Marking
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

// Account statuses
const accountStatuses = [
  { value: 'active', labelAr: 'نشط', labelEn: 'Active', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'inactive', labelAr: 'معطل', labelEn: 'Inactive', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'frozen', labelAr: 'مجمد', labelEn: 'Frozen', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'closed', labelAr: 'مغلق', labelEn: 'Closed', color: 'bg-red-100 text-red-700 border-red-200' },
];

// Document statuses
const documentStatuses = [
  { value: 'draft', labelAr: 'مسودة', labelEn: 'Draft', color: 'bg-yellow-100 text-yellow-700', icon: PauseCircle },
  { value: 'confirmed', labelAr: 'مؤكد', labelEn: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { value: 'partial', labelAr: 'مدفوع جزئياً', labelEn: 'Partially Paid', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'paid', labelAr: 'مدفوع', labelEn: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  { value: 'cancelled', labelAr: 'ملغى', labelEn: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
];

// Account types
const accountTypes = [
  { value: 'Asset', labelAr: 'أصول', labelEn: 'Asset' },
  { value: 'Liability', labelAr: 'خصوم', labelEn: 'Liability' },
  { value: 'Equity', labelAr: 'حقوق ملكية', labelEn: 'Equity' },
  { value: 'Income', labelAr: 'إيرادات', labelEn: 'Income' },
  { value: 'Expense', labelAr: 'مصروفات', labelEn: 'Expense' },
];

interface Tab {
  id: string;
  title: string;
  type: 'info' | 'invoice' | 'journal' | 'payment' | 'receipt' | 'edit';
  closable: boolean;
  data?: any;
}

// Main Tabs Configuration
const mainTabs: { id: MainTabType; labelAr: string; labelEn: string; icon: any }[] = [
  { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: Eye },
  { id: 'ledger', labelAr: 'كشف الحساب', labelEn: 'Ledger', icon: Book },
  { id: 'invoices', labelAr: 'الفواتير', labelEn: 'Invoices', icon: Receipt },
  { id: 'payments', labelAr: 'الدفعات', labelEn: 'Payments', icon: Wallet },
  { id: 'reservations', labelAr: 'الحجوزات', labelEn: 'Reservations', icon: CalendarCheck },
  { id: 'ai-analysis', labelAr: 'تحليل الذكاء', labelEn: 'AI Analysis', icon: Sparkles },
  { id: 'events', labelAr: 'الأحداث', labelEn: 'Events', icon: Activity },
];

interface AccountDetailsSheetProps {
  account: any;
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onEditClick?: () => void;
}

export default function AccountDetailsSheet({ 
  account, 
  open, 
  isOpen: isOpenProp,
  onOpenChange,
  onClose: onCloseProp,
  onEditClick
}: AccountDetailsSheetProps) {
  const isOpen = open !== undefined ? open : (isOpenProp !== undefined ? isOpenProp : false);
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else if (onCloseProp) {
      onCloseProp();
    }
  };
  const { t, direction, language } = useLanguage();

  // Debug log
  console.log('AccountDetailsSheet render:', { account, isOpen });

  // Main Tab State
  const [mainTab, setMainTab] = useState<MainTabType>('overview');
  
  // Account edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    code: account?.code || '',
    name: account?.name || '',
    nameAr: account?.nameAr || '',
    type: account?.type || 'Asset',
    status: 'active',
    description: account?.description || '',
    parentAccount: account?.parent || '',
  });

  // Document Tabs state (for opening documents in new tabs)
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeDocTab, setActiveDocTab] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    dateFrom: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    currency: 'SAR',
    showCancelled: false,
  });

  // ========== REAL DATA FROM HOOKS ==========
  // Fetch real ledger data for this specific account
  const {
    entries: realLedgerEntries,
    stats: ledgerStats,
    loading: ledgerLoading,
    error: ledgerError,
    refetch: refetchLedger,
    setFilters: setLedgerFilters
  } = useAccountLedger({
    accountId: account?.id || '',
    companyId: account?.company_id || '',
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    autoFetch: !!account?.id,
  });

  // Fetch real payments data
  const {
    payments: realPayments,
    loading: paymentsLoading,
    totalReceipts,
    totalPayments: totalPaymentsAmount,
    refetch: refetchPayments
  } = useAccountPayments({
    accountId: account?.id || '',
    companyId: account?.company_id || '',
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    autoFetch: !!account?.id,
  });

  // Fetch recent activity
  const {
    activities: recentActivities,
    loading: activitiesLoading,
    refetch: refetchActivities
  } = useRecentActivity({
    accountId: account?.id || '',
    limit: 10,
    autoFetch: !!account?.id,
  });

  // Transform ledger entries to the format expected by components
  const ledgerEntries = useMemo(() => {
    if (realLedgerEntries.length > 0) {
      return realLedgerEntries.map(entry => ({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        reference: entry.reference,
        debit: entry.debit,
        credit: entry.credit,
        balance: entry.balance,
        type: entry.type,
        status: entry.status === 'posted' ? 'confirmed' : entry.status,
        customer: entry.partyType === 'customer' ? entry.partyId : undefined,
      }));
    }
    // Return empty array if no real data (no mock data anymore)
    return [];
  }, [realLedgerEntries]);

  // Use real stats from hook
  const totalDebit = ledgerStats.totalDebit;
  const totalCredit = ledgerStats.totalCredit;
  const currentBalance = ledgerStats.currentBalance;
  const openingBalance = ledgerStats.openingBalance;

  // Handle ledger row click - open in new tab
  const handleLedgerRowClick = useCallback((entry: any) => {
    const existingTab = tabs.find(tab => tab.id === entry.reference);
    if (existingTab) {
      setActiveDocTab(entry.reference);
      return;
    }

    const typeLabel = {
      invoice: language === 'ar' ? 'فاتورة' : 'Invoice',
      journal: language === 'ar' ? 'قيد محاسبي' : 'Journal',
      payment: language === 'ar' ? 'دفعة' : 'Payment',
      receipt: language === 'ar' ? 'إيصال' : 'Receipt',
    };

    const newTab: Tab = {
      id: entry.reference,
      title: `${typeLabel[entry.type as keyof typeof typeLabel]} ${entry.reference}`,
      type: entry.type,
      closable: true,
      data: entry,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveDocTab(entry.reference);
  }, [tabs, language]);

  // Open edit tab for account
  const handleOpenEditTab = useCallback(() => {
    const editTabId = `edit-${account?.id || 'account'}`;
    const existingTab = tabs.find(tab => tab.id === editTabId);
    if (existingTab) {
      setActiveDocTab(editTabId);
      return;
    }

    const newTab: Tab = {
      id: editTabId,
      title: language === 'ar' ? 'تعديل الحساب' : 'Edit Account',
      type: 'edit',
      closable: true,
      data: account,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveDocTab(editTabId);
  }, [tabs, language, account]);

  // Close document tab
  const closeDocTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeDocTab === tabId) {
      setActiveDocTab(null);
    }
  }, [activeDocTab]);

  // Back to main view
  const backToMain = useCallback(() => {
    setActiveDocTab(null);
  }, []);

  // Date shortcuts
  const handleDateShortcut = (type: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear') => {
    const now = new Date();
    let from: Date, to: Date;

    switch (type) {
      case 'today':
        from = now;
        to = now;
        break;
      case 'yesterday':
        from = subDays(now, 1);
        to = subDays(now, 1);
        break;
      case 'thisWeek':
        from = startOfWeek(now, { weekStartsOn: 6 });
        to = endOfWeek(now, { weekStartsOn: 6 });
        break;
      case 'lastWeek':
        from = startOfWeek(subDays(now, 7), { weekStartsOn: 6 });
        to = endOfWeek(subDays(now, 7), { weekStartsOn: 6 });
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'thisYear':
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      case 'lastYear':
        from = startOfYear(subYears(now, 1));
        to = endOfYear(subYears(now, 1));
        break;
      default:
        from = now;
        to = now;
    }
    setFilters(prev => ({
      ...prev,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd')
    }));
  };

  // Export to Google Sheets
  const exportToGoogleSheets = () => {
    window.open('https://sheets.google.com', '_blank');
  };

  // Save account changes
  const handleSaveAccount = () => {
    setIsEditing(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent 
        side={direction === 'rtl' ? 'left' : 'right'} 
        className="!w-[60%] !max-w-none p-0 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden z-[9999]"
      >
        {!account ? (
          <div className="p-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-tajawal">
                {language === 'ar' ? 'لم يتم تحديد حساب بعد' : 'No account selected yet'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm z-10 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-erp-navy to-erp-teal p-2.5 rounded-xl text-white shadow-lg">
                    <Book className="w-5 h-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                      {language === 'ar' ? (account.nameAr || account.name) : (account.name || account.nameAr)}
                      <Badge className={cn("text-[10px] px-2", accountStatuses.find(s => s.value === 'active')?.color)}>
                        {language === 'ar' ? 'نشط' : 'Active'}
                      </Badge>
                    </SheetTitle>
                    <SheetDescription className="font-mono text-xs flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      {account.code}
                      <span className="text-gray-300">|</span>
                      <span className="text-erp-teal">{language === 'ar' ? accountTypes.find(t => t.value === account.type)?.labelAr : accountTypes.find(t => t.value === account.type)?.labelEn}</span>
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-4 py-2 rounded-xl shadow-sm border",
                    currentBalance >= 0 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" 
                      : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
                  )}>
                    <p className="text-[10px] text-gray-500 mb-0.5">{language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</p>
                    <p className={cn(
                      "text-xl font-bold font-mono",
                      currentBalance >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {currentBalance.toLocaleString()}
                      <span className="text-xs mr-1 opacity-70">ر.س</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenEditTab}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Document Tabs (when document is open) */}
              {tabs.length > 0 && (
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                  <Button 
                    variant={activeDocTab === null ? "default" : "ghost"} 
                    size="sm" 
                    className="gap-1.5 text-xs h-8 shrink-0"
                    onClick={backToMain}
                  >
                    <Book className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'الحساب' : 'Account'}
                  </Button>
                  {tabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeDocTab === tab.id ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 text-xs h-8 shrink-0"
                      onClick={() => setActiveDocTab(tab.id)}
                    >
                      {tab.type === 'edit' && <Edit2 className="w-3.5 h-3.5" />}
                      {tab.type === 'invoice' && <Receipt className="w-3.5 h-3.5" />}
                      {tab.type === 'journal' && <FileText className="w-3.5 h-3.5" />}
                      {tab.type === 'payment' && <CreditCard className="w-3.5 h-3.5" />}
                      {tab.type === 'receipt' && <Wallet className="w-3.5 h-3.5" />}
                      {tab.title}
                      <button
                        onClick={(e) => closeDocTab(tab.id, e)}
                        className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Button>
                  ))}
                </div>
              )}

              {/* Main Tabs (hide when document tab is active) */}
              {activeDocTab === null && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {mainTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={mainTab === tab.id ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "gap-1.5 text-xs h-8 shrink-0 transition-all",
                          mainTab === tab.id 
                            ? "bg-erp-navy text-white shadow-md" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                        onClick={() => setMainTab(tab.id)}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {language === 'ar' ? tab.labelAr : tab.labelEn}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
              {/* Document Detail Tabs */}
              {activeDocTab !== null && tabs.map((tab) => (
                activeDocTab === tab.id && (
                  <ScrollArea key={tab.id} className="h-full">
                    <div className="p-4">
                      {tab.type === 'edit' && <EditAccountTab account={tab.data} language={language} t={t} direction={direction} onSaveSuccess={() => { refetchLedger(); refetchPayments(); }} />}
                      {tab.type === 'invoice' && <InvoiceDetailTab data={tab.data} language={language} t={t} />}
                      {tab.type === 'journal' && <JournalDetailTab data={tab.data} language={language} t={t} />}
                      {tab.type === 'payment' && <PaymentDetailTab data={tab.data} language={language} t={t} />}
                      {tab.type === 'receipt' && <ReceiptDetailTab data={tab.data} language={language} t={t} />}
                    </div>
                  </ScrollArea>
                )
              ))}

              {/* Main Tabs Content */}
              {activeDocTab === null && (
                <>
                  {mainTab === 'overview' && (
                    <OverviewTab 
                      account={account}
                      language={language}
                      t={t}
                      totalDebit={totalDebit}
                      totalCredit={totalCredit}
                      currentBalance={currentBalance}
                      openingBalance={openingBalance}
                      ledgerEntries={ledgerEntries}
                      onOpenEditTab={handleOpenEditTab}
                      loading={ledgerLoading}
                      stats={ledgerStats}
                      recentActivities={recentActivities}
                      onRefresh={refetchLedger}
                    />
                  )}
                  {mainTab === 'ledger' && (
                    <LedgerTab
                      account={account}
                      language={language}
                      t={t}
                      direction={direction}
                      filters={filters}
                      setFilters={setFilters}
                      handleDateShortcut={handleDateShortcut}
                      ledgerEntries={ledgerEntries}
                      onRowClick={handleLedgerRowClick}
                      exportToGoogleSheets={exportToGoogleSheets}
                      totalDebit={totalDebit}
                      totalCredit={totalCredit}
                      currentBalance={currentBalance}
                      loading={ledgerLoading}
                      onRefresh={refetchLedger}
                    />
                  )}
                  {mainTab === 'invoices' && (
                    <InvoicesTab
                      account={account}
                      language={language}
                      t={t}
                      onRowClick={handleLedgerRowClick}
                    />
                  )}
                  {mainTab === 'payments' && (
                    <PaymentsTab
                      account={account}
                      language={language}
                      t={t}
                      onRowClick={handleLedgerRowClick}
                      realPayments={realPayments}
                      loading={paymentsLoading}
                      totalReceipts={totalReceipts}
                      totalPaymentsAmount={totalPaymentsAmount}
                      onRefresh={refetchPayments}
                    />
                  )}
                  {mainTab === 'reservations' && (
                    <ReservationsTab
                      account={account}
                      language={language}
                      t={t}
                    />
                  )}
                  {mainTab === 'ai-analysis' && (
                    <AIAnalysisTab
                      account={account}
                      language={language}
                      t={t}
                      ledgerEntries={ledgerEntries}
                      totalDebit={totalDebit}
                      totalCredit={totalCredit}
                      stats={ledgerStats}
                      loading={ledgerLoading}
                    />
                  )}
                  {mainTab === 'events' && (
                    <EventsTab
                      account={account}
                      language={language}
                      t={t}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ===== OVERVIEW TAB =====
function OverviewTab({ 
  account, 
  language, 
  t, 
  totalDebit, 
  totalCredit, 
  currentBalance, 
  openingBalance,
  ledgerEntries, 
  onOpenEditTab,
  loading,
  stats: realStats,
  recentActivities,
  onRefresh
}: any) {
  // Use real stats from props
  const stats = {
    totalTransactions: realStats?.transactionCount || ledgerEntries.length,
    monthlyAverage: realStats?.monthlyAverage || Math.round(currentBalance / 12),
    creditUtilization: currentBalance > 0 ? Math.min(100, Math.round((currentBalance / 100000) * 100)) : 0,
    lastActivity: realStats?.lastActivityDate || (ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1]?.date : null),
    totalPurchases: totalDebit,
    totalOrders: realStats?.transactionCount || 0,
    openingBalance: openingBalance || 0,
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-erp-teal mx-auto mb-3" />
          <p className="text-sm text-gray-500">{language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Eye className="w-4 h-4 text-erp-teal" />
            {language === 'ar' ? 'نظرة عامة على الحساب' : 'Account Overview'}
          </h3>
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5 text-xs h-7">
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
                <span className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}</span>
              </div>
              <p className="text-lg font-bold font-mono text-green-600">{totalDebit.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownRight className="w-4 h-4 text-red-600" />
                <span className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}</span>
              </div>
              <p className="text-lg font-bold font-mono text-red-600">{totalCredit.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] text-gray-500">{language === 'ar' ? 'عدد العمليات' : 'Transactions'}</span>
              </div>
              <p className="text-lg font-bold font-mono text-blue-600">{stats.totalTransactions}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-[10px] text-gray-500">{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</span>
              </div>
              <p className="text-sm font-bold font-mono text-purple-600">{stats.lastActivity || (language === 'ar' ? 'لا يوجد' : 'None')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Utilization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'استخدام الائتمان' : 'Credit Utilization'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{language === 'ar' ? 'الحد الائتماني' : 'Credit Limit'}</span>
                <span className="font-mono font-bold">100,000 ر.س</span>
              </div>
              <Progress value={stats.creditUtilization} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{language === 'ar' ? 'مستخدم' : 'Used'}: {stats.creditUtilization}%</span>
                <span>{language === 'ar' ? 'متاح' : 'Available'}: {100 - stats.creditUtilization}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-erp-teal" />
                {language === 'ar' ? 'معلومات الحساب' : 'Account Info'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-dashed">
                <span className="text-gray-500">{language === 'ar' ? 'رقم الحساب' : 'Account No'}</span>
                <span className="font-mono">{account.code}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-dashed">
                <span className="text-gray-500">{language === 'ar' ? 'النوع' : 'Type'}</span>
                <Badge variant="outline" className="text-xs">
                  {language === 'ar' ? accountTypes.find(t => t.value === account.type)?.labelAr : accountTypes.find(t => t.value === account.type)?.labelEn}
                </Badge>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-dashed">
                <span className="text-gray-500">{language === 'ar' ? 'العملة' : 'Currency'}</span>
                <span>SAR - ريال سعودي</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">{language === 'ar' ? 'المجموعة' : 'Group'}</span>
                <span>{account.group || (language === 'ar' ? 'أصول' : 'Assets')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-erp-teal" />
                {language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-dashed">
                <span className="text-gray-500">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
                <span className="font-mono">{stats.totalPurchases.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-dashed">
                <span className="text-gray-500">{language === 'ar' ? 'عدد الطلبات' : 'Total Orders'}</span>
                <span className="font-mono">{stats.totalOrders}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-dashed">
                <span className="text-gray-500">{language === 'ar' ? 'متوسط شهري' : 'Monthly Avg'}</span>
                <span className="font-mono">{stats.monthlyAverage.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</span>
                <span>30 {language === 'ar' ? 'يوم' : 'Days'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'آخر الحركات' : 'Recent Transactions'}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {ledgerEntries.slice(0, 4).map((entry: any) => (
                  <TableRow key={entry.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                          entry.debit > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {entry.debit > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{entry.description}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{entry.reference}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">{entry.date}</TableCell>
                    <TableCell className={cn(
                      "text-sm font-bold font-mono text-end",
                      entry.debit > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {entry.debit > 0 ? `+${entry.debit.toLocaleString()}` : `-${entry.credit.toLocaleString()}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" className="flex-col h-16 gap-1">
            <Receipt className="w-5 h-5 text-erp-teal" />
            <span className="text-[10px]">{language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}</span>
          </Button>
          <Button variant="outline" className="flex-col h-16 gap-1">
            <Wallet className="w-5 h-5 text-erp-teal" />
            <span className="text-[10px]">{language === 'ar' ? 'استلام دفعة' : 'Receive Payment'}</span>
          </Button>
          <Button variant="outline" className="flex-col h-16 gap-1">
            <MessageSquare className="w-5 h-5 text-erp-teal" />
            <span className="text-[10px]">{language === 'ar' ? 'إرسال رسالة' : 'Send Message'}</span>
          </Button>
          <Button variant="outline" className="flex-col h-16 gap-1" onClick={onOpenEditTab}>
            <Edit2 className="w-5 h-5 text-erp-teal" />
            <span className="text-[10px]">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

// ===== LEDGER TAB =====
function LedgerTab({
  account,
  language,
  t,
  direction,
  filters,
  setFilters,
  handleDateShortcut,
  ledgerEntries,
  onRowClick,
  exportToGoogleSheets,
  totalDebit,
  totalCredit,
  currentBalance,
  loading,
  onRefresh
}: any) {
  // Reconciliation state
  const [selectedReconciliationColor, setSelectedReconciliationColor] = useState<string>('green');
  const [markedEntries, setMarkedEntries] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Toggle reconciliation mark
  const toggleReconciliationMark = (entryId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedEntries(prev => {
      const newMarked = { ...prev };
      if (newMarked[entryId] === selectedReconciliationColor) {
        delete newMarked[entryId];
      } else {
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'من' : 'From'}</Label>
            <Input 
              type="date" 
              value={filters.dateFrom} 
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'إلى' : 'To'}</Label>
            <Input 
              type="date" 
              value={filters.dateTo} 
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
            <Select value={filters.currency} onValueChange={(v) => setFilters({...filters, currency: v})}>
              <SelectTrigger className="h-7 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c: any) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} - {language === 'ar' ? c.nameAr : (c.name || c.nameAr)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-1">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 gap-1" 
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>
            {/* Reconciliation Color Picker */}
            <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-7 px-2">
                  <Palette className="w-3.5 h-3.5" />
                  <div 
                    className="w-3.5 h-3.5 rounded-full border"
                    style={{ backgroundColor: RECONCILIATION_COLORS.find(c => c.id === selectedReconciliationColor)?.color }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 z-[99999]" align="end" sideOffset={8}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">{language === 'ar' ? 'اختر لون المطابقة' : 'Select marker color'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {RECONCILIATION_COLORS.slice(1).map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedReconciliationColor(color.id);
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 cursor-pointer",
                        selectedReconciliationColor === color.id 
                          ? "ring-2 ring-offset-2 ring-blue-500 scale-110 border-white" 
                          : "border-gray-300 dark:border-gray-600"
                      )}
                      style={{ backgroundColor: color.color }}
                      title={language === 'ar' ? color.label : color.labelEn}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 gap-1" onClick={exportToGoogleSheets}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6.545h6.545m0 15.273H2.727V2.182h12l6.546 6.545v13.09z" fill="#0F9D58"/>
              </svg>
              Sheets
            </Button>
          </div>
        </div>

        {/* Date Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { label: language === 'ar' ? 'اليوم' : 'Today', key: 'today' as const },
            { label: language === 'ar' ? 'أمس' : 'Yesterday', key: 'yesterday' as const },
            { label: language === 'ar' ? 'هذا الأسبوع' : 'This Week', key: 'thisWeek' as const },
            { label: language === 'ar' ? 'هذا الشهر' : 'This Month', key: 'thisMonth' as const },
            { label: language === 'ar' ? 'هذه السنة' : 'This Year', key: 'thisYear' as const },
          ].map((chip) => (
            <Button
              key={chip.key}
              variant="outline"
              size="sm"
              className="h-5 text-[10px] whitespace-nowrap rounded-full bg-white hover:bg-erp-teal hover:text-white border-gray-200 transition-colors px-2"
              onClick={() => handleDateShortcut(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Summary */}
      <div className="bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}</p>
            <p className="text-sm font-bold font-mono text-green-600">{totalDebit.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}</p>
            <p className="text-sm font-bold font-mono text-red-600">{totalCredit.toLocaleString()}</p>
          </div>
          <div className="bg-erp-navy/10 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'الرصيد' : 'Balance'}</p>
            <p className="text-sm font-bold font-mono text-erp-navy">{currentBalance.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'المعلّم' : 'Marked'}</p>
            <p className="text-sm font-bold font-mono text-purple-600">{Object.keys(markedEntries).length}</p>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
        <Table className="border-collapse w-full" dir={direction}>
          <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 w-[40px] text-center text-xs font-bold text-erp-navy">#</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 w-[40px] text-center text-xs font-bold text-erp-navy">✓</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy w-[200px]">{language === 'ar' ? 'البيان' : 'Description'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'المرجع' : 'Reference'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgerEntries.map((entry: any, index: number) => (
              <TableRow 
                key={entry.id}
                className={cn(
                  "hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors h-8 cursor-pointer",
                  getReconciliationBg(entry.id)
                )}
                onClick={() => onRowClick(entry)}
              >
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-[11px] font-mono text-center text-gray-500">
                  {index + 1}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-center">
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
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-green-600">
                  {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-red-600">
                  {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate max-w-[200px]">{entry.description}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{entry.date}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-center">
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", documentStatuses.find(s => s.value === entry.status)?.color)}>
                    {language === 'ar' 
                      ? documentStatuses.find(s => s.value === entry.status)?.labelAr 
                      : documentStatuses.find(s => s.value === entry.status)?.labelEn
                    }
                  </Badge>
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-blue-600 hover:underline">{entry.reference}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end font-bold text-erp-navy">
                  {entry.balance.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-gray-100 dark:bg-gray-800 sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
            <TableRow className="h-9 border-t-2 border-erp-navy">
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-xs font-bold text-center bg-gray-100">
                {ledgerEntries.length}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-xs font-bold text-center bg-gray-100">
                <span className="text-purple-600">{Object.keys(markedEntries).length}</span>
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white text-green-600">
                {totalDebit.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white text-red-600">
                {totalCredit.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                {language === 'ar' ? 'الإجمالي' : 'Total'}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-erp-navy text-white">
                {currentBalance.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      </div>
    </div>
  );
}

// ===== INVOICES TAB =====
function InvoicesTab({ account, language, t, onRowClick }: any) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    search: ''
  });

  const invoices = [
    { id: 'INV-001', date: '2024-01-15', customer: 'شركة الأمل للتجارة', amount: 15000, paid: 15000, status: 'paid', dueDate: '2024-02-15' },
    { id: 'INV-023', date: '2024-02-15', customer: 'مؤسسة النور', amount: 25000, paid: 10000, status: 'partial', dueDate: '2024-03-15' },
    { id: 'INV-045', date: '2024-03-01', customer: 'شركة الفجر', amount: 8500, paid: 0, status: 'draft', dueDate: '2024-04-01' },
    { id: 'INV-067', date: '2024-03-10', customer: 'مؤسسة الرياض', amount: 32000, paid: 0, status: 'confirmed', dueDate: '2024-04-10' },
    { id: 'INV-089', date: '2024-03-20', customer: 'شركة البناء', amount: 45000, paid: 45000, status: 'paid', dueDate: '2024-04-20' },
    { id: 'INV-102', date: '2024-03-25', customer: 'مؤسسة الخليج', amount: 18000, paid: 5000, status: 'partial', dueDate: '2024-04-25' },
  ];

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid, 0);
  const totalRemaining = totalAmount - totalPaid;

  const handleDateShortcut = (shortcut: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear') => {
    const today = new Date();
    let from: Date, to: Date;
    switch (shortcut) {
      case 'today':
        from = to = today;
        break;
      case 'yesterday':
        from = to = subDays(today, 1);
        break;
      case 'thisWeek':
        from = startOfWeek(today, { weekStartsOn: 0 });
        to = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'thisYear':
        from = startOfYear(today);
        to = endOfYear(today);
        break;
    }
    setFilters(prev => ({
      ...prev,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd')
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'من' : 'From'}</Label>
            <Input 
              type="date" 
              value={filters.dateFrom} 
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'إلى' : 'To'}</Label>
            <Input 
              type="date" 
              value={filters.dateTo} 
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
              <SelectTrigger className="h-7 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                {documentStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{language === 'ar' ? s.labelAr : s.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'بحث' : 'Search'}</Label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder={language === 'ar' ? 'رقم أو عميل...' : 'Number or customer...'}
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="h-7 text-xs pr-8 bg-white"
              />
            </div>
          </div>
          <div className="flex items-end gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-7 bg-erp-teal hover:bg-erp-teal/90">
              <Plus className="w-3.5 h-3.5" />
              {language === 'ar' ? 'جديد' : 'New'}
            </Button>
          </div>
        </div>

        {/* Date Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { label: language === 'ar' ? 'اليوم' : 'Today', key: 'today' as const },
            { label: language === 'ar' ? 'أمس' : 'Yesterday', key: 'yesterday' as const },
            { label: language === 'ar' ? 'هذا الأسبوع' : 'This Week', key: 'thisWeek' as const },
            { label: language === 'ar' ? 'هذا الشهر' : 'This Month', key: 'thisMonth' as const },
            { label: language === 'ar' ? 'هذه السنة' : 'This Year', key: 'thisYear' as const },
          ].map((chip) => (
            <Button
              key={chip.key}
              variant="outline"
              size="sm"
              className="h-5 text-[10px] whitespace-nowrap rounded-full bg-white hover:bg-erp-teal hover:text-white border-gray-200 transition-colors px-2"
              onClick={() => handleDateShortcut(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Summary */}
      <div className="bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}</p>
            <p className="text-sm font-bold font-mono text-blue-600">{totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'المحصّل' : 'Collected'}</p>
            <p className="text-sm font-bold font-mono text-green-600">{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'المتبقي' : 'Remaining'}</p>
            <p className="text-sm font-bold font-mono text-red-600">{totalRemaining.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'عدد الفواتير' : 'Count'}</p>
            <p className="text-sm font-bold font-mono text-purple-600">{invoices.length}</p>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
        <Table className="border-collapse w-full">
          <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 w-[40px] text-center text-xs font-bold text-erp-navy">#</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy w-[180px]">{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice No'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'الاستحقاق' : 'Due Date'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv, index) => (
              <TableRow 
                key={inv.id}
                className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors h-8 cursor-pointer"
                onClick={() => onRowClick({ ...inv, type: 'invoice', reference: inv.id, debit: inv.amount })}
              >
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-[11px] font-mono text-center text-gray-500">
                  {index + 1}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-blue-600 font-bold">
                  {inv.amount.toLocaleString()}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-green-600">
                  {inv.paid > 0 ? inv.paid.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate max-w-[180px]">{inv.customer}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{inv.date}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-center">
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", documentStatuses.find(s => s.value === inv.status)?.color)}>
                    {language === 'ar' 
                      ? documentStatuses.find(s => s.value === inv.status)?.labelAr 
                      : documentStatuses.find(s => s.value === inv.status)?.labelEn
                    }
                  </Badge>
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-blue-600 hover:underline">{inv.id}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{inv.dueDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot>
            <TableRow className="h-9 border-t-2 border-erp-navy">
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-xs font-bold text-center bg-gray-100">
                {invoices.length}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white text-blue-600">
                {totalAmount.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white text-green-600">
                {totalPaid.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                {language === 'ar' ? 'الإجمالي' : 'Total'}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-erp-navy text-white">
                {totalRemaining.toLocaleString()}
              </TableCell>
            </TableRow>
          </tfoot>
        </Table>
        </div>
      </div>
    </div>
  );
}

// ===== PAYMENTS TAB =====
function PaymentsTab({ 
  account, 
  language, 
  t, 
  onRowClick,
  realPayments,
  loading,
  totalReceipts: propTotalReceipts,
  totalPaymentsAmount: propTotalPayments,
  onRefresh
}: any) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: 'all',
    method: 'all',
    search: ''
  });

  // Transform real payments to expected format, or use empty array
  const payments = useMemo(() => {
    if (realPayments && realPayments.length > 0) {
      return realPayments.map((p: any) => ({
        id: p.transactionNumber,
        date: p.transactionDate,
        description: p.description || '',
        amount: p.amount,
        method: p.paymentMethod || (language === 'ar' ? 'غير محدد' : 'Not specified'),
        methodEn: p.paymentMethod || 'Not specified',
        status: p.status === 'confirmed' ? 'confirmed' : p.status,
        isReceipt: p.transactionType === 'receipt',
        partyName: p.partyName,
      }));
    }
    return [];
  }, [realPayments, language]);

  // Use real totals from props or calculate from payments
  const totalReceipts = propTotalReceipts || payments.filter((p: any) => p.isReceipt).reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalPaymentsCalc = propTotalPayments || payments.filter((p: any) => !p.isReceipt).reduce((sum: number, p: any) => sum + p.amount, 0);
  const netBalance = totalReceipts - totalPaymentsCalc;

  const handleDateShortcut = (shortcut: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear') => {
    const today = new Date();
    let from: Date, to: Date;
    switch (shortcut) {
      case 'today':
        from = to = today;
        break;
      case 'yesterday':
        from = to = subDays(today, 1);
        break;
      case 'thisWeek':
        from = startOfWeek(today, { weekStartsOn: 0 });
        to = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'thisYear':
        from = startOfYear(today);
        to = endOfYear(today);
        break;
    }
    setFilters(prev => ({
      ...prev,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd')
    }));
  };

  const paymentMethods = [
    { value: 'all', labelAr: 'الكل', labelEn: 'All' },
    { value: 'cash', labelAr: 'نقدي', labelEn: 'Cash' },
    { value: 'bank', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
    { value: 'check', labelAr: 'شيك', labelEn: 'Check' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'من' : 'From'}</Label>
            <Input 
              type="date" 
              value={filters.dateFrom} 
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'إلى' : 'To'}</Label>
            <Input 
              type="date" 
              value={filters.dateTo} 
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
              <SelectTrigger className="h-7 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="receipt">{language === 'ar' ? 'إيصالات' : 'Receipts'}</SelectItem>
                <SelectItem value="payment">{language === 'ar' ? 'مدفوعات' : 'Payments'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'طريقة الدفع' : 'Method'}</Label>
            <Select value={filters.method} onValueChange={(v) => setFilters({...filters, method: v})}>
              <SelectTrigger className="h-7 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{language === 'ar' ? m.labelAr : m.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'بحث' : 'Search'}</Label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder={language === 'ar' ? 'رقم أو وصف...' : 'Number or description...'}
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="h-7 text-xs pr-8 bg-white"
              />
            </div>
          </div>
          <div className="flex items-end gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 gap-1" 
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-7 bg-green-600 hover:bg-green-700">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Date Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { label: language === 'ar' ? 'اليوم' : 'Today', key: 'today' as const },
            { label: language === 'ar' ? 'أمس' : 'Yesterday', key: 'yesterday' as const },
            { label: language === 'ar' ? 'هذا الأسبوع' : 'This Week', key: 'thisWeek' as const },
            { label: language === 'ar' ? 'هذا الشهر' : 'This Month', key: 'thisMonth' as const },
            { label: language === 'ar' ? 'هذه السنة' : 'This Year', key: 'thisYear' as const },
          ].map((chip) => (
            <Button
              key={chip.key}
              variant="outline"
              size="sm"
              className="h-5 text-[10px] whitespace-nowrap rounded-full bg-white hover:bg-erp-teal hover:text-white border-gray-200 transition-colors px-2"
              onClick={() => handleDateShortcut(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Summary */}
      <div className="bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي الإيصالات' : 'Total Receipts'}</p>
            <p className="text-sm font-bold font-mono text-green-600">{totalReceipts.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
            <p className="text-sm font-bold font-mono text-red-600">{totalPayments.toLocaleString()}</p>
          </div>
          <div className={cn("p-2 rounded-lg text-center", netBalance >= 0 ? "bg-erp-navy/10" : "bg-orange-50")}>
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'الصافي' : 'Net Balance'}</p>
            <p className={cn("text-sm font-bold font-mono", netBalance >= 0 ? "text-erp-navy" : "text-orange-600")}>{netBalance.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'عدد العمليات' : 'Count'}</p>
            <p className="text-sm font-bold font-mono text-purple-600">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
        <Table className="border-collapse w-full">
          <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 w-[40px] text-center text-xs font-bold text-erp-navy">#</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 w-[40px] text-center text-xs font-bold text-erp-navy">↕</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy w-[200px]">{language === 'ar' ? 'البيان' : 'Description'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'الرقم' : 'Number'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'الطريقة' : 'Method'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((pmt, index) => (
              <TableRow 
                key={pmt.id}
                className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors h-8 cursor-pointer"
                onClick={() => onRowClick({ 
                  ...pmt, 
                  type: pmt.isReceipt ? 'receipt' : 'payment', 
                  reference: pmt.id, 
                  debit: pmt.isReceipt ? pmt.amount : 0,
                  credit: pmt.isReceipt ? 0 : pmt.amount
                })}
              >
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-[11px] font-mono text-center text-gray-500">
                  {index + 1}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-center">
                  {pmt.isReceipt ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mx-auto" />
                  )}
                </TableCell>
                <TableCell className={cn(
                  "border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end font-bold",
                  pmt.isReceipt ? "text-green-600" : "text-red-600"
                )}>
                  {pmt.isReceipt ? '+' : '-'}{pmt.amount.toLocaleString()}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate max-w-[200px]">{pmt.description}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{pmt.date}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-center">
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", documentStatuses.find(s => s.value === pmt.status)?.color)}>
                    {language === 'ar' 
                      ? documentStatuses.find(s => s.value === pmt.status)?.labelAr 
                      : documentStatuses.find(s => s.value === pmt.status)?.labelEn
                    }
                  </Badge>
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-blue-600 hover:underline">{pmt.id}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px]">{language === 'ar' ? pmt.method : pmt.methodEn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot>
            <TableRow className="h-9 border-t-2 border-erp-navy">
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-xs font-bold text-center bg-gray-100">
                {payments.length}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-xs font-bold text-center bg-gray-100">
                ↕
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-erp-navy text-white">
                {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                {language === 'ar' ? 'الصافي' : 'Net'}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
            </TableRow>
          </tfoot>
        </Table>
        </div>
      </div>
    </div>
  );
}

// ===== RESERVATIONS TAB =====
function ReservationsTab({ account, language, t }: any) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    search: ''
  });

  const reservations = [
    { id: 'RES-001', date: '2024-03-20', product: 'قماش قطني أبيض', productEn: 'White Cotton Fabric', quantity: 500, unit: 'متر', unitEn: 'meter', value: 25000, status: 'active', expiryDate: '2024-04-20' },
    { id: 'RES-002', date: '2024-03-15', product: 'خيوط حرير', productEn: 'Silk Thread', quantity: 100, unit: 'بكرة', unitEn: 'roll', value: 8000, status: 'expired', expiryDate: '2024-03-25' },
    { id: 'RES-003', date: '2024-03-18', product: 'قماش صوف', productEn: 'Wool Fabric', quantity: 300, unit: 'متر', unitEn: 'meter', value: 45000, status: 'active', expiryDate: '2024-04-18' },
    { id: 'RES-004', date: '2024-03-22', product: 'أزرار معدنية', productEn: 'Metal Buttons', quantity: 1000, unit: 'قطعة', unitEn: 'piece', value: 5000, status: 'pending', expiryDate: '2024-04-22' },
    { id: 'RES-005', date: '2024-03-25', product: 'سحابات', productEn: 'Zippers', quantity: 500, unit: 'قطعة', unitEn: 'piece', value: 7500, status: 'active', expiryDate: '2024-04-25' },
  ];

  const totalValue = reservations.reduce((sum, res) => sum + res.value, 0);
  const activeCount = reservations.filter(r => r.status === 'active').length;
  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const expiredCount = reservations.filter(r => r.status === 'expired').length;

  const handleDateShortcut = (shortcut: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear') => {
    const today = new Date();
    let from: Date, to: Date;
    switch (shortcut) {
      case 'today':
        from = to = today;
        break;
      case 'yesterday':
        from = to = subDays(today, 1);
        break;
      case 'thisWeek':
        from = startOfWeek(today, { weekStartsOn: 0 });
        to = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'thisYear':
        from = startOfYear(today);
        to = endOfYear(today);
        break;
    }
    setFilters(prev => ({
      ...prev,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd')
    }));
  };

  const reservationStatuses = [
    { value: 'active', labelAr: 'نشط', labelEn: 'Active', color: 'bg-green-100 text-green-700' },
    { value: 'pending', labelAr: 'معلق', labelEn: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'expired', labelAr: 'منتهي', labelEn: 'Expired', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'من' : 'From'}</Label>
            <Input 
              type="date" 
              value={filters.dateFrom} 
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'إلى' : 'To'}</Label>
            <Input 
              type="date" 
              value={filters.dateTo} 
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
              <SelectTrigger className="h-7 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                {reservationStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{language === 'ar' ? s.labelAr : s.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{language === 'ar' ? 'بحث' : 'Search'}</Label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder={language === 'ar' ? 'رقم أو منتج...' : 'Number or product...'}
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="h-7 text-xs pr-8 bg-white"
              />
            </div>
          </div>
          <div className="flex items-end gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-7 bg-erp-teal hover:bg-erp-teal/90">
              <Plus className="w-3.5 h-3.5" />
              {language === 'ar' ? 'جديد' : 'New'}
            </Button>
          </div>
        </div>

        {/* Date Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { label: language === 'ar' ? 'اليوم' : 'Today', key: 'today' as const },
            { label: language === 'ar' ? 'أمس' : 'Yesterday', key: 'yesterday' as const },
            { label: language === 'ar' ? 'هذا الأسبوع' : 'This Week', key: 'thisWeek' as const },
            { label: language === 'ar' ? 'هذا الشهر' : 'This Month', key: 'thisMonth' as const },
            { label: language === 'ar' ? 'هذه السنة' : 'This Year', key: 'thisYear' as const },
          ].map((chip) => (
            <Button
              key={chip.key}
              variant="outline"
              size="sm"
              className="h-5 text-[10px] whitespace-nowrap rounded-full bg-white hover:bg-erp-teal hover:text-white border-gray-200 transition-colors px-2"
              onClick={() => handleDateShortcut(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Summary */}
      <div className="bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}</p>
            <p className="text-sm font-bold font-mono text-blue-600">{totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-sm font-bold font-mono text-green-600">{activeCount}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'معلق' : 'Pending'}</p>
            <p className="text-sm font-bold font-mono text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{language === 'ar' ? 'منتهي' : 'Expired'}</p>
            <p className="text-sm font-bold font-mono text-red-600">{expiredCount}</p>
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
        <Table className="border-collapse w-full">
          <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 w-[40px] text-center text-xs font-bold text-erp-navy">#</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'القيمة' : 'Value'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy w-[180px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'رقم الحجز' : 'Res. No'}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{language === 'ar' ? 'الانتهاء' : 'Expiry'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((res, index) => (
              <TableRow 
                key={res.id}
                className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors h-8 cursor-pointer"
              >
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-[11px] font-mono text-center text-gray-500">
                  {index + 1}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center">
                  {res.quantity} {language === 'ar' ? res.unit : res.unitEn}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-blue-600 font-bold">
                  {res.value.toLocaleString()}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate max-w-[180px]">{language === 'ar' ? res.product : res.productEn}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{res.date}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-center">
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", reservationStatuses.find(s => s.value === res.status)?.color)}>
                    {language === 'ar' 
                      ? reservationStatuses.find(s => s.value === res.status)?.labelAr 
                      : reservationStatuses.find(s => s.value === res.status)?.labelEn
                    }
                  </Badge>
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-blue-600 hover:underline">{res.id}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{res.expiryDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot>
            <TableRow className="h-9 border-t-2 border-erp-navy">
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 text-xs font-bold text-center bg-gray-100">
                {reservations.length}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-center bg-gray-100">
                {reservations.reduce((sum, r) => sum + r.quantity, 0).toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-erp-navy text-white">
                {totalValue.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                {language === 'ar' ? 'الإجمالي' : 'Total'}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
            </TableRow>
          </tfoot>
        </Table>
        </div>
      </div>
    </div>
  );
}

// ===== AI ANALYSIS TAB =====
function AIAnalysisTab({ account, language, t, ledgerEntries, totalDebit, totalCredit }: any) {
  const insights = [
    {
      type: 'trend',
      title: language === 'ar' ? 'نمط الإنفاق' : 'Spending Pattern',
      description: language === 'ar' 
        ? 'لاحظنا زيادة بنسبة 15% في المصروفات مقارنة بالشهر الماضي'
        : 'We noticed a 15% increase in expenses compared to last month',
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      type: 'prediction',
      title: language === 'ar' ? 'توقع الرصيد' : 'Balance Prediction',
      description: language === 'ar'
        ? 'بناءً على النمط الحالي، يُتوقع أن يصل الرصيد إلى 75,000 ر.س بنهاية الشهر'
        : 'Based on current pattern, balance is expected to reach 75,000 SAR by end of month',
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      type: 'alert',
      title: language === 'ar' ? 'تنبيه مهم' : 'Important Alert',
      description: language === 'ar'
        ? 'هناك 3 فواتير مستحقة الدفع خلال الأسبوع القادم'
        : 'There are 3 invoices due for payment within the next week',
      icon: Bell,
      color: 'text-red-600 bg-red-100',
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* AI Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-purple-900">{language === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}</h3>
            <p className="text-xs text-purple-600">{language === 'ar' ? 'رؤى ذكية حول حسابك' : 'Smart insights about your account'}</p>
          </div>
          <Button variant="outline" size="sm" className="mr-auto gap-1.5 text-xs border-purple-300 text-purple-700">
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", insight.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs text-gray-600">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">{language === 'ar' ? 'متوسط المعاملات' : 'Avg Transaction'}</span>
              </div>
              <p className="text-xl font-bold font-mono text-blue-600">
                {Math.round((totalDebit + totalCredit) / (ledgerEntries.length * 2)).toLocaleString()} ر.س
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">{language === 'ar' ? 'معدل النمو' : 'Growth Rate'}</span>
              </div>
              <p className="text-xl font-bold font-mono text-green-600">+12.5%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

// ===== EVENTS TAB =====
function EventsTab({ account, language, t }: any) {
  const events = [
    { id: 1, date: '2024-03-15 14:32', type: 'edit', user: 'أحمد محمد', description: language === 'ar' ? 'تعديل بيانات الحساب' : 'Account data updated' },
    { id: 2, date: '2024-03-14 10:15', type: 'invoice', user: 'سارة علي', description: language === 'ar' ? 'إنشاء فاتورة INV-067' : 'Created invoice INV-067' },
    { id: 3, date: '2024-03-12 09:00', type: 'payment', user: 'النظام', description: language === 'ar' ? 'تسجيل دفعة PV-012' : 'Payment PV-012 recorded' },
    { id: 4, date: '2024-03-10 16:45', type: 'receipt', user: 'خالد عبدالله', description: language === 'ar' ? 'استلام دفعة RCT-008' : 'Receipt RCT-008 received' },
    { id: 5, date: '2024-03-05 11:20', type: 'create', user: 'أحمد محمد', description: language === 'ar' ? 'إنشاء الحساب' : 'Account created' },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'edit': return <Edit2 className="w-3.5 h-3.5" />;
      case 'invoice': return <Receipt className="w-3.5 h-3.5" />;
      case 'payment': return <CreditCard className="w-3.5 h-3.5" />;
      case 'receipt': return <Wallet className="w-3.5 h-3.5" />;
      case 'create': return <Plus className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'edit': return 'bg-blue-100 text-blue-600';
      case 'invoice': return 'bg-purple-100 text-purple-600';
      case 'payment': return 'bg-red-100 text-red-600';
      case 'receipt': return 'bg-green-100 text-green-600';
      case 'create': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-erp-teal" />
            {language === 'ar' ? 'سجل الأحداث' : 'Activity Log'}
          </h3>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute top-0 bottom-0 right-4 w-px bg-gray-200"></div>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex gap-4 relative">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center z-10", getEventColor(event.type))}>
                  {getEventIcon(event.type)}
                </div>
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{event.description}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Users className="w-3 h-3" />
                      {event.user}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Account Info with Ledger Component (Legacy - kept for reference)
function AccountInfoWithLedger({ 
  account, 
  editForm, 
  setEditForm, 
  isEditing, 
  setIsEditing, 
  onSave,
  onOpenEditTab,
  language,
  t,
  direction,
  filters,
  setFilters,
  handleDateShortcut,
  ledgerEntries,
  onRowClick,
  exportToGoogleSheets,
  totalDebit,
  totalCredit,
  currentBalance
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Account Info Summary */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">{t('erp.common.type')}:</span>
              <span className="font-medium">{t(`erp.accounting.accounts.types.${(account.type || 'Asset').toLowerCase()}`)}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
              <span className="text-gray-500">{t('erp.common.group')}:</span>
              <span className="font-medium">{account.group || t('erp.accounting.accounts.typesPlural.asset')}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onOpenEditTab}
            className="gap-1 text-xs h-7"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('erp.common.edit')}
          </Button>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{t('erp.common.debit')}</p>
            <p className="text-sm font-bold font-mono text-green-600">{totalDebit.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{t('erp.common.credit')}</p>
            <p className="text-sm font-bold font-mono text-red-600">{totalCredit.toLocaleString()}</p>
          </div>
          <div className="bg-erp-navy/10 p-2 rounded-lg text-center">
            <p className="text-[10px] text-gray-500">{t('erp.common.balance')}</p>
            <p className="text-sm font-bold font-mono text-erp-navy">{currentBalance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{t('erp.common.from')}</Label>
            <Input 
              type="date" 
              value={filters.dateFrom} 
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{t('erp.common.to')}</Label>
            <Input 
              type="date" 
              value={filters.dateTo} 
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500">{t('common.currency')}</Label>
            <Select value={filters.currency} onValueChange={(v) => setFilters({...filters, currency: v})}>
              <SelectTrigger className="h-7 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c: any) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} - {language === 'ar' ? c.nameAr : (c.name || c.nameAr)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 gap-1" onClick={exportToGoogleSheets}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6.545h6.545m0 15.273H2.727V2.182h12l6.546 6.545v13.09z" fill="#0F9D58"/>
              </svg>
              Sheets
            </Button>
          </div>
        </div>

        {/* Date Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { label: t('erp.common.today'), key: 'today' as const },
            { label: t('erp.common.yesterday'), key: 'yesterday' as const },
            { label: t('erp.common.thisWeek'), key: 'thisWeek' as const },
            { label: t('erp.common.thisMonth'), key: 'thisMonth' as const },
            { label: t('erp.common.thisYear'), key: 'thisYear' as const },
          ].map((chip) => (
            <Button
              key={chip.key}
              variant="outline"
              size="sm"
              className="h-5 text-[10px] whitespace-nowrap rounded-full bg-white hover:bg-erp-teal hover:text-white border-gray-200 transition-colors px-2"
              onClick={() => handleDateShortcut(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
        <Table className="border-collapse w-full" dir={direction}>
          <TableHeader className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('erp.common.date')}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('erp.common.reference')}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy w-[200px]">{t('erp.common.description')}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('erp.common.debit')}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('erp.common.credit')}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy">{t('erp.common.balance')}</TableHead>
              <TableHead className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold text-erp-navy text-center">{t('erp.common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgerEntries.map((entry: any) => (
              <TableRow 
                key={entry.id}
                className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors h-8 cursor-pointer"
                onClick={() => onRowClick(entry)}
              >
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-center whitespace-nowrap">{entry.date}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-blue-600 hover:underline">{entry.reference}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] truncate max-w-[200px]">{entry.description}</TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-green-600">
                  {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end text-red-600">
                  {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-[11px] font-mono text-end font-bold text-erp-navy">
                  {entry.balance.toLocaleString()}
                </TableCell>
                <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-center">
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", documentStatuses.find(s => s.value === entry.status)?.color)}>
                    {language === 'ar' 
                      ? documentStatuses.find(s => s.value === entry.status)?.labelAr 
                      : documentStatuses.find(s => s.value === entry.status)?.labelEn
                    }
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-gray-100 dark:bg-gray-800 sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
            <TableRow className="h-9 border-t-2 border-erp-navy">
              <TableCell colSpan={3} className="border border-gray-300 dark:border-gray-700 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                {t('erp.common.total')}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white text-green-600">
                {totalDebit.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-white text-red-600">
                {totalCredit.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 text-xs font-bold font-mono text-end bg-erp-navy text-white">
                {currentBalance.toLocaleString()}
              </TableCell>
              <TableCell className="border border-gray-300 dark:border-gray-700 p-1 px-2 bg-gray-100"></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      </div>
    </div>
  );
}

// Invoice Detail Tab Component
function InvoiceDetailTab({ data, language, t }: any) {
  const [status, setStatus] = useState(data?.status || 'confirmed');
  const [isEditing, setIsEditing] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    number: data?.reference || 'INV-001',
    date: data?.date || '2024-01-15',
    dueDate: '2024-02-15',
    customer: data?.customer || 'شركة الأمل للتجارة',
    customerPhone: '+966 50 123 4567',
    customerEmail: 'info@alamal.com',
    currency: 'SAR',
    items: [
      { id: 1, name: 'منتج A - قطع غيار', quantity: 10, price: 500, tax: 15 },
      { id: 2, name: 'خدمة صيانة دورية', quantity: 1, price: 3500, tax: 15 },
      { id: 3, name: 'منتج B - أدوات', quantity: 5, price: 908.6, tax: 15 },
    ],
  });
  
  // Calculate totals
  const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const vatAmount = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.price * item.tax / 100), 0);
  const total = subtotal + vatAmount;

  // Generate QR code data
  const qrData = JSON.stringify({
    seller: 'شركتي',
    vat: '1234567890',
    date: invoiceForm.date,
    total: total,
    tax: vatAmount,
    invoice: invoiceForm.number,
  });

  // Add item
  const addItem = () => {
    const newItem = { id: Date.now(), name: '', quantity: 1, price: 0, tax: 15 };
    setInvoiceForm({...invoiceForm, items: [...invoiceForm.items, newItem]});
  };

  // Remove item
  const removeItem = (id: number) => {
    setInvoiceForm({...invoiceForm, items: invoiceForm.items.filter(item => item.id !== id)});
  };

  // Update item
  const updateItem = (id: number, field: string, value: any) => {
    setInvoiceForm({
      ...invoiceForm,
      items: invoiceForm.items.map(item => item.id === id ? {...item, [field]: value} : item)
    });
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{t('erp.common.status')}:</span>
          <div className="flex gap-1">
            {documentStatuses.map((s) => {
              const Icon = s.icon;
              return (
                <TooltipProvider key={s.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={status === s.value ? "default" : "ghost"}
                        size="sm"
                        className={cn("h-7 w-7 p-0", status === s.value && s.color)}
                        onClick={() => setStatus(s.value)}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'ar' ? s.labelAr : (s.labelEn || s.labelAr)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm" 
            className="gap-1.5 h-7 text-xs"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? t('erp.common.save') : t('erp.common.edit')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <Send className="w-3.5 h-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 text-xs">
                <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6.545h6.545m0 15.273H2.727V2.182h12l6.546 6.545v13.09z"/>
                </svg>
                {t('erp.common.sendToGoogleSheets')}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <Copy className="w-3.5 h-3.5" />
                {t('erp.common.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                {t('erp.common.createCreditNote')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-xs text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
                {t('erp.common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="col-span-2">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('erp.common.invoiceNumber')}</Label>
                <Input 
                  value={invoiceForm.number} 
                  onChange={(e) => setInvoiceForm({...invoiceForm, number: e.target.value})}
                  disabled={!isEditing}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('erp.common.customer')}</Label>
                <Input 
                  value={invoiceForm.customer} 
                  onChange={(e) => setInvoiceForm({...invoiceForm, customer: e.target.value})}
                  disabled={!isEditing}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('erp.common.date')}</Label>
                <Input 
                  type="date"
                  value={invoiceForm.date} 
                  onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})}
                  disabled={!isEditing}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('erp.common.dueDate')}</Label>
                <Input 
                  type="date"
                  value={invoiceForm.dueDate} 
                  onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                  disabled={!isEditing}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('common.currency')}</Label>
                <Select value={invoiceForm.currency} onValueChange={(v) => setInvoiceForm({...invoiceForm, currency: v})} disabled={!isEditing}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {language === 'ar' ? c.nameAr : (c.name || c.nameAr)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardContent className="p-3 flex flex-col items-center justify-center">
            {/* QRCodeSVG disabled - qrcode.react not installed */}
            <div className="w-[120px] h-[120px] bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
              QR Code
            </div>
            {/* <QRCodeSVG 
              value={qrData} 
              size={80}
              level="M"
              includeMargin={false}
            /> */}
            <p className="text-[10px] text-gray-500 mt-2">{t('erp.common.invoiceQR')}</p>
            <p className="text-xs font-mono font-bold text-erp-teal">{invoiceForm.number}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader className="py-2 px-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">{t('erp.common.invoiceItems')}</CardTitle>
          {isEditing && (
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={addItem}>
              <Plus className="w-3 h-3" />
              {t('erp.common.addItem')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 h-8">
                <TableHead className="text-xs">{t('erp.common.item')}</TableHead>
                <TableHead className="text-xs text-center w-20">{t('erp.common.quantity')}</TableHead>
                <TableHead className="text-xs text-center w-24">{t('erp.common.price')}</TableHead>
                <TableHead className="text-xs text-center w-20">{t('erp.common.tax')}</TableHead>
                <TableHead className="text-xs text-end w-24">{t('erp.common.total')}</TableHead>
                {isEditing && <TableHead className="w-8"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceForm.items.map((item) => {
                const itemTotal = item.quantity * item.price * (1 + item.tax / 100);
                return (
                  <TableRow key={item.id} className="h-9">
                    <TableCell className="p-1">
                      <Input 
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        disabled={!isEditing}
                        className="h-7 text-xs border-0 bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        disabled={!isEditing}
                        className="h-7 text-xs text-center font-mono border-0 bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                        disabled={!isEditing}
                        className="h-7 text-xs text-center font-mono border-0 bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number"
                        value={item.tax}
                        onChange={(e) => updateItem(item.id, 'tax', Number(e.target.value))}
                        disabled={!isEditing}
                        className="h-7 text-xs text-center font-mono border-0 bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="p-1 text-end font-mono text-xs font-bold">
                      {itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    {isEditing && (
                      <TableCell className="p-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeItem(item.id)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-gray-50">
                <TableCell colSpan={isEditing ? 4 : 3} className="text-xs">{t('erp.common.subtotal')}</TableCell>
                <TableCell className="text-end font-mono text-xs">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                {isEditing && <TableCell></TableCell>}
              </TableRow>
              <TableRow className="bg-gray-50">
                <TableCell colSpan={isEditing ? 4 : 3} className="text-xs">{t('erp.common.vat')}</TableCell>
                <TableCell className="text-end font-mono text-xs">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                {isEditing && <TableCell></TableCell>}
              </TableRow>
              <TableRow className="bg-erp-navy text-white">
                <TableCell colSpan={isEditing ? 4 : 3} className="text-xs font-bold">{t('erp.common.total')}</TableCell>
                <TableCell className="text-end font-mono text-sm font-bold">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} {invoiceForm.currency}</TableCell>
                {isEditing && <TableCell></TableCell>}
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Journal Detail Tab Component
function JournalDetailTab({ data, language, t }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [journalForm, setJournalForm] = useState({
    number: data?.reference || 'JV-001',
    date: data?.date || '2024-01-01',
    description: data?.description || 'رصيد افتتاحي',
    currency: 'SAR',
    entries: [
      { id: 1, account: '1101', accountName: 'نقدية بالصندوق', debit: data?.debit || 50000, credit: 0 },
      { id: 2, account: '3001', accountName: 'رأس المال', debit: 0, credit: data?.debit || 50000 },
    ],
  });

  const totalDebit = journalForm.entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = journalForm.entries.reduce((sum, e) => sum + e.credit, 0);
  const isBalanced = totalDebit === totalCredit;

  // QR Data
  const qrData = JSON.stringify({
    journal: journalForm.number,
    date: journalForm.date,
    debit: totalDebit,
    credit: totalCredit,
  });

  // Add entry
  const addEntry = () => {
    const newEntry = { id: Date.now(), account: '', accountName: '', debit: 0, credit: 0 };
    setJournalForm({...journalForm, entries: [...journalForm.entries, newEntry]});
  };

  // Remove entry
  const removeEntry = (id: number) => {
    setJournalForm({...journalForm, entries: journalForm.entries.filter(e => e.id !== id)});
  };

  // Update entry
  const updateEntry = (id: number, field: string, value: any) => {
    setJournalForm({
      ...journalForm,
      entries: journalForm.entries.map(e => e.id === id ? {...e, [field]: value} : e)
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <Badge className={documentStatuses.find(s => s.value === data?.status)?.color}>
          {language === 'ar' 
            ? documentStatuses.find(s => s.value === data?.status)?.labelAr 
            : (documentStatuses.find(s => s.value === data?.status)?.labelEn || documentStatuses.find(s => s.value === data?.status)?.labelAr)
          }
        </Badge>
        <div className="flex gap-1.5">
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm" 
            className="gap-1.5 h-7 text-xs"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? t('erp.common.save') : t('erp.common.edit')}
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6.545h6.545m0 15.273H2.727V2.182h12l6.546 6.545v13.09z"/>
            </svg>
            Sheets
          </Button>
        </div>
      </div>

      {/* Journal Header */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="col-span-2">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('erp.common.entryNumber')}</Label>
                <Input 
                  value={journalForm.number} 
                  onChange={(e) => setJournalForm({...journalForm, number: e.target.value})}
                  disabled={!isEditing}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('erp.common.date')}</Label>
                <Input 
                  type="date"
                  value={journalForm.date} 
                  onChange={(e) => setJournalForm({...journalForm, date: e.target.value})}
                  disabled={!isEditing}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">{t('common.currency')}</Label>
                <Select value={journalForm.currency} onValueChange={(v) => setJournalForm({...journalForm, currency: v})} disabled={!isEditing}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">{t('erp.common.description')}</Label>
              <Textarea 
                value={journalForm.description}
                onChange={(e) => setJournalForm({...journalForm, description: e.target.value})}
                disabled={!isEditing}
                className="min-h-[60px] text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardContent className="p-3 flex flex-col items-center justify-center h-full">
            {/* QRCodeSVG disabled - qrcode.react not installed */}
            <div className="w-[120px] h-[120px] bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
              QR Code
            </div>
            {/* <QRCodeSVG 
              value={qrData} 
              size={80}
              level="M"
              includeMargin={false}
            /> */}
            <p className="text-[10px] text-gray-500 mt-2">{t('erp.common.entryQR')}</p>
            <p className="text-xs font-mono font-bold text-erp-teal">{journalForm.number}</p>
          </CardContent>
        </Card>
      </div>

      {/* Journal Entries */}
      <Card>
        <CardHeader className="py-2 px-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">{t('erp.common.journalLines')}</CardTitle>
          {isEditing && (
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={addEntry}>
              <Plus className="w-3 h-3" />
              {t('erp.common.addLine')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 h-8">
                <TableHead className="text-xs w-24">{t('erp.common.accountNumber')}</TableHead>
                <TableHead className="text-xs">{t('erp.common.accountName')}</TableHead>
                <TableHead className="text-xs text-center w-28">{t('erp.common.debit')}</TableHead>
                <TableHead className="text-xs text-center w-28">{t('erp.common.credit')}</TableHead>
                {isEditing && <TableHead className="w-8"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalForm.entries.map((entry) => (
                <TableRow key={entry.id} className="h-9">
                  <TableCell className="p-1">
                    {isEditing ? (
                      <Select value={entry.account} onValueChange={(v) => {
                        const acc = flatAccounts.find(a => a.code === v);
                        updateEntry(entry.id, 'account', v);
                        if (acc) updateEntry(entry.id, 'accountName', language === 'ar' ? acc.nameAr : (acc.name || acc.nameAr));
                      }}>
                        <SelectTrigger className="h-7 text-xs font-mono">
                          <SelectValue placeholder="..." />
                        </SelectTrigger>
                        <SelectContent>
                          {flatAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.code}>{acc.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-mono text-xs">{entry.account}</span>
                    )}
                  </TableCell>
                  <TableCell className="p-1 text-xs">{entry.accountName}</TableCell>
                  <TableCell className="p-1">
                    <Input 
                      type="number"
                      value={entry.debit || ''}
                      onChange={(e) => updateEntry(entry.id, 'debit', Number(e.target.value) || 0)}
                      disabled={!isEditing}
                      className="h-7 text-xs text-center font-mono border-0 bg-transparent text-green-600"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input 
                      type="number"
                      value={entry.credit || ''}
                      onChange={(e) => updateEntry(entry.id, 'credit', Number(e.target.value) || 0)}
                      disabled={!isEditing}
                      className="h-7 text-xs text-center font-mono border-0 bg-transparent text-red-600"
                    />
                  </TableCell>
                  {isEditing && (
                    <TableCell className="p-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeEntry(entry.id)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-erp-navy text-white">
                <TableCell colSpan={2} className="text-xs font-bold">{t('erp.common.total')}</TableCell>
                <TableCell className="text-center font-mono text-xs font-bold">{totalDebit.toLocaleString()}</TableCell>
                <TableCell className="text-center font-mono text-xs font-bold">{totalCredit.toLocaleString()}</TableCell>
                {isEditing && <TableCell></TableCell>}
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Balance Check */}
      <div className={cn(
        "p-3 rounded-lg flex items-center gap-2 text-sm",
        isBalanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      )}>
        {isBalanced ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>{t('erp.common.entryBalanced')}</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>{t('erp.common.entryNotBalanced')}: {Math.abs(totalDebit - totalCredit).toLocaleString()}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Payment Detail Tab Component
function PaymentDetailTab({ data, language, t }: any) {
  const qrData = JSON.stringify({
    payment: data?.reference,
    date: data?.date,
    amount: data?.credit,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <Badge className={documentStatuses.find(s => s.value === data?.status)?.color}>
          {language === 'ar' 
            ? documentStatuses.find(s => s.value === data?.status)?.labelAr 
            : (documentStatuses.find(s => s.value === data?.status)?.labelEn || documentStatuses.find(s => s.value === data?.status)?.labelAr)
          }
        </Badge>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <Edit2 className="w-3.5 h-3.5" />
            {t('erp.common.edit')}
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('erp.common.paymentNumber')}</p>
                  <p className="text-lg font-bold font-mono text-erp-navy">{data?.reference}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500">{t('erp.common.date')}</p>
                  <p className="font-mono text-sm">{data?.date}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500">{t('erp.common.amount')}</p>
                  <p className="font-mono font-bold text-red-600">{data?.credit?.toLocaleString()} ر.س</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-[10px] text-gray-500">{t('erp.common.description')}</p>
                <p className="text-sm">{data?.description}</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-r pr-6">
              {/* QRCodeSVG disabled - qrcode.react not installed */}
              <div className="w-[120px] h-[120px] bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
                QR Code
              </div>
              {/* <QRCodeSVG 
                  value={qrData} 
                  size={100}
                  level="M"
                  includeMargin={false}
                /> */}
              <p className="text-[10px] text-gray-500 mt-2">{t('erp.common.paymentQR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Receipt Detail Tab Component
function ReceiptDetailTab({ data, language, t }: any) {
  const qrData = JSON.stringify({
    receipt: data?.reference,
    date: data?.date,
    amount: data?.debit,
    customer: data?.customer,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <Badge className={documentStatuses.find(s => s.value === data?.status)?.color}>
          {language === 'ar' 
            ? documentStatuses.find(s => s.value === data?.status)?.labelAr 
            : (documentStatuses.find(s => s.value === data?.status)?.labelEn || documentStatuses.find(s => s.value === data?.status)?.labelAr)
          }
        </Badge>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <Edit2 className="w-3.5 h-3.5" />
            {t('erp.common.edit')}
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <Send className="w-3.5 h-3.5" />
            {t('erp.common.send')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('erp.common.receiptNumber')}</p>
                  <p className="text-lg font-bold font-mono text-erp-teal">{data?.reference}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500">{t('erp.common.date')}</span>
                  <span className="font-mono text-sm">{data?.date}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500">{t('erp.common.customer')}</span>
                  <span className="text-sm font-medium">{data?.customer}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-xs text-gray-500">{t('erp.common.amountReceived')}</span>
                  <span className="font-mono font-bold text-green-600 text-lg">{data?.debit?.toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-r pr-6">
              {/* QRCodeSVG disabled - qrcode.react not installed */}
              <div className="w-[120px] h-[120px] bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
                QR Code
              </div>
              {/* <QRCodeSVG 
                  value={qrData} 
                  size={100}
                  level="M"
                  includeMargin={false}
                /> */}
              <p className="text-[10px] text-gray-500 mt-2">{t('erp.common.scanToVerify')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Edit Account Tab Component
function EditAccountTab({ account, language, t, direction, onSaveSuccess }: any) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basic Info - mapped from actual account data
    code: account?.code || account?.account_code || '',
    name: account?.name_en || account?.name || '',
    nameAr: account?.name_ar || account?.name || account?.nameAr || '',
    type: account?.account_type_id || account?.type || 'Asset',
    status: account?.is_active ? 'active' : 'inactive',
    description: account?.description || '',
    parentAccount: account?.parent_id || account?.parent || '',
    currency: account?.currency || 'SAR',
    
    // Bank Info
    is_bank_account: account?.is_bank_account || false,
    bank_name: account?.bank_name || '',
    bank_account_number: account?.bank_account_number || '',
    
    // Flags
    is_cash_account: account?.is_cash_account || false,
    is_receivable: account?.is_receivable || false,
    is_payable: account?.is_payable || false,
    
    // Notes
    notes: account?.notes || '',
  });

  const handleSave = async () => {
    if (!account?.id) {
      setSaveError(language === 'ar' ? 'معرف الحساب غير متوفر' : 'Account ID not available');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await accountsService.update(account.id, {
        account_code: formData.code,
        name_ar: formData.nameAr,
        name_en: formData.name,
        account_type_id: formData.type,
        description: formData.description,
        parent_id: formData.parentAccount || undefined,
        currency: formData.currency,
      });
      
      setSaveSuccess(true);
      
      // Notify parent component
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving account:', error);
      setSaveError(error.message || (language === 'ar' ? 'فشل في حفظ التغييرات' : 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-cairo text-erp-navy dark:text-white">
            {language === 'ar' ? 'تعديل الحساب' : 'Edit Account'}
          </h2>
          <p className="text-sm text-gray-500 font-mono">{account?.code || account?.account_code}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4" />
              {language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully'}
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </div>
          )}
          <Button onClick={handleSave} className="bg-erp-navy hover:bg-erp-navy/90 gap-2" disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
              : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
            }
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <Info className="w-4 h-4 text-erp-teal" />
              {t('erp.common.basicInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.accountCode')}</Label>
                <Input 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="font-mono text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.accountType')}</Label>
                <Select 
                  value={formData.type}
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {language === 'ar' ? type.labelAr : (type.labelEn || type.labelAr)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.arabicName')}</Label>
              <Input 
                value={formData.nameAr}
                onChange={(e) => setFormData({...formData, nameAr: e.target.value})}
                className="text-sm"
                dir="rtl"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.englishName')}</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="text-sm"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.status')}</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {language === 'ar' ? status.labelAr : (status.labelEn || status.labelAr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.description')}</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="text-sm min-h-[80px]"
                dir={direction}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-erp-teal" />
              {t('erp.common.contactInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.contactPerson')}</Label>
              <Input 
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                className="text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.phone')}</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="text-sm font-mono"
                  dir="ltr"
                  placeholder="+966 xx xxx xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.mobile')}</Label>
                <Input 
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  className="text-sm font-mono"
                  dir="ltr"
                  placeholder="+966 5x xxx xxxx"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.email')}</Label>
              <Input 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="text-sm"
                dir="ltr"
                type="email"
                placeholder="email@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.website')}</Label>
              <Input 
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                className="text-sm"
                dir="ltr"
                placeholder="https://www.example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <FileText className="w-4 h-4 text-erp-teal" />
              {t('erp.common.address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.address')}</Label>
              <Textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="text-sm min-h-[60px]"
                dir={direction}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.city')}</Label>
                <Input 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.country')}</Label>
                <Input 
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.postalCode')}</Label>
              <Input 
                value={formData.postalCode}
                onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                className="text-sm font-mono"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <Receipt className="w-4 h-4 text-erp-teal" />
              {t('erp.common.financialInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.creditLimit')}</Label>
                <Input 
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value) || 0})}
                  className="text-sm font-mono"
                  dir="ltr"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('erp.common.paymentTerms')}</Label>
                <Input 
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({...formData, paymentTerms: parseInt(e.target.value) || 0})}
                  className="text-sm font-mono"
                  dir="ltr"
                  type="number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.taxNumber')}</Label>
              <Input 
                value={formData.taxNumber}
                onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                className="text-sm font-mono"
                dir="ltr"
                placeholder="3xxxxxxxxxx00003"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.commercialRegister')}</Label>
              <Input 
                value={formData.commercialRegister}
                onChange={(e) => setFormData({...formData, commercialRegister: e.target.value})}
                className="text-sm font-mono"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t('erp.common.defaultCurrency')}</Label>
              <Select 
                value={formData.currency}
                onValueChange={(value) => setFormData({...formData, currency: value})}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency: any) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {language === 'ar' ? currency.nameAr : (currency.name || currency.nameAr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-cairo flex items-center gap-2">
            <Book className="w-4 h-4 text-erp-teal" />
            {t('erp.common.notes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="text-sm min-h-[100px]"
            dir={direction}
            placeholder={t('erp.common.addNotesPlaceholder')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
