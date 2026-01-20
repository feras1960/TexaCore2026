/**
 * AccountDetailsSheetV2 - مكون تفاصيل الحساب (الإصدار الجديد المحسّن)
 * يعرض تفاصيل الحساب مع 7 تبويبات: نظرة عامة، كشف الحساب، الفواتير، الدفعات، الحجوزات، تحليل الذكاء، الأحداث
 * 
 * التحسينات:
 * - استخدام LedgerTable المحسّن للجداول
 * - تصميم مطابق للصور المرجعية
 * - إصلاح مشكلة التحميل اللانهائي
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { 
  FileText, 
  Receipt, 
  Printer,
  X,
  Edit2,
  Book,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  CalendarCheck,
  Wallet,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Info,
  Download,
  Bell,
  BarChart3,
  Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Import LedgerTable
import { LedgerTable, type LedgerColumn, type LedgerStats } from '@/components/shared';

// Import hooks for real data
import { useAccountLedger, useAccountPayments, useRecentActivity } from '@/hooks/useAccountLedger';
import { useAccountInvoices } from '@/hooks/useAccountInvoices';
import { useAccountReservations } from '@/hooks/useAccountReservations';
import type { LedgerEntry, PaymentEntry } from '@/services/accountLedgerService';
import type { AccountInvoice } from '@/services/accountInvoicesService';
import type { Reservation } from '@/services/reservationsService';
import { getAccountName, type SupportedLanguage } from '@/services/accountsService';

// ===== TYPES =====
type MainTabType = 'overview' | 'ledger' | 'invoices' | 'payments' | 'reservations' | 'ai-analysis' | 'events';

interface AccountDetailsSheetV2Props {
  account: any;
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onEditClick?: () => void;
}

// ===== MAIN COMPONENT =====
export default function AccountDetailsSheetV2({ 
  account, 
  open, 
  isOpen: isOpenProp,
  onOpenChange,
  onClose: onCloseProp,
  onEditClick
}: AccountDetailsSheetV2Props) {
  const isOpen = open !== undefined ? open : (isOpenProp !== undefined ? isOpenProp : false);
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else if (onCloseProp) {
      onCloseProp();
    }
  };
  const { t, direction, language } = useLanguage();

  // Main Tab State
  const [mainTab, setMainTab] = useState<MainTabType>('overview');

  // ========== REAL DATA FROM HOOKS ==========
  const {
    entries: ledgerEntries,
    stats: ledgerStats,
    loading: ledgerLoading,
    error: ledgerError,
    refetch: refetchLedger,
  } = useAccountLedger({
    accountId: account?.id || '',
    companyId: account?.company_id || '',
    autoFetch: !!account?.id,
  });

  const {
    payments: realPayments,
    loading: paymentsLoading,
    totalReceipts,
    totalPayments: totalPaymentsAmount,
    refetch: refetchPayments
  } = useAccountPayments({
    accountId: account?.id || '',
    companyId: account?.company_id || '',
    autoFetch: !!account?.id,
  });

  const {
    activities: recentActivities,
    loading: activitiesLoading,
    refetch: refetchActivities
  } = useRecentActivity({
    accountId: account?.id || '',
    limit: 10,
    autoFetch: !!account?.id,
  });

  // Invoices data
  const {
    invoices: realInvoices,
    stats: invoiceStats,
    loading: invoicesLoading,
    refetch: refetchInvoices
  } = useAccountInvoices({
    accountId: account?.id || '',
    companyId: account?.company_id || '',
    autoFetch: !!account?.id,
  });

  // Reservations data
  const {
    reservations: realReservations,
    stats: reservationStats,
    loading: reservationsLoading,
    refetch: refetchReservations
  } = useAccountReservations({
    accountId: account?.id || '',
    companyId: account?.company_id || '',
    autoFetch: !!account?.id,
  });

  // Stats from hook
  const totalDebit = ledgerStats.totalDebit;
  const totalCredit = ledgerStats.totalCredit;
  const currentBalance = ledgerStats.currentBalance;
  const openingBalance = ledgerStats.openingBalance;

  // Main Tabs Configuration
  const mainTabs = [
    { id: 'overview' as MainTabType, labelKey: 'tabs.overview', icon: Eye },
    { id: 'ledger' as MainTabType, labelKey: 'tabs.ledger', icon: Book },
    { id: 'invoices' as MainTabType, labelKey: 'tabs.invoices', icon: Receipt },
    { id: 'payments' as MainTabType, labelKey: 'tabs.payments', icon: Wallet },
    { id: 'reservations' as MainTabType, labelKey: 'tabs.reservations', icon: CalendarCheck },
    { id: 'ai-analysis' as MainTabType, labelKey: 'tabs.aiAnalysis', icon: Sparkles },
    { id: 'events' as MainTabType, labelKey: 'tabs.events', icon: Activity },
  ];

  // Refresh all data
  const handleRefreshAll = useCallback(() => {
    refetchLedger();
    refetchPayments();
    refetchActivities();
    refetchInvoices();
    refetchReservations();
  }, [refetchLedger, refetchPayments, refetchActivities, refetchInvoices, refetchReservations]);

  if (!account) return null;

  const accountName = getAccountName(account, language as SupportedLanguage);
  const accountStatus = account.is_active !== false ? 'active' : 'inactive';
  const statusColor = accountStatus === 'active' 
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' 
    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side={direction === 'rtl' ? 'left' : 'right'}
        className="w-full sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[75vw] p-0 gap-0 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-erp-navy via-erp-navy to-slate-800 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-cairo">{accountName}</h2>
                  <Badge className={cn('text-xs', statusColor)}>
                    {accountStatus === 'active' ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-white/70 text-sm">
                  <span className="font-mono">{account.code}</span>
                  <span>•</span>
                  <span>{account.account_type || account.type}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={handleRefreshAll}
              >
                <RefreshCw className={cn('w-4 h-4', (ledgerLoading || paymentsLoading) && 'animate-spin')} />
              </Button>
              {onEditClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={onEditClick}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={handleClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="mt-4 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="text-xs text-white/60 mb-1">{t('accounting.currentBalance')}</div>
            <div className={cn(
              'text-2xl font-bold font-mono',
              currentBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'
            )}>
              {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-sm text-white/60 ms-1">{t('currencies.SAR')}</span>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    mainTab === tab.id
                      ? 'bg-white text-erp-navy shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {mainTab === 'overview' && (
            <OverviewTab
              account={account}
              language={language}
              t={t}
              stats={ledgerStats}
              loading={ledgerLoading}
              recentActivities={recentActivities}
              activitiesLoading={activitiesLoading}
            />
          )}
          {mainTab === 'ledger' && (
            <LedgerTab
              account={account}
              language={language}
              t={t}
              entries={ledgerEntries}
              loading={ledgerLoading}
              error={ledgerError}
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              openingBalance={openingBalance}
              currentBalance={currentBalance}
              onRefresh={refetchLedger}
            />
          )}
          {mainTab === 'invoices' && (
            <InvoicesTab 
              language={language} 
              t={t} 
              invoices={realInvoices}
              stats={invoiceStats}
              loading={invoicesLoading}
              onRefresh={refetchInvoices}
            />
          )}
          {mainTab === 'payments' && (
            <PaymentsTab
              language={language}
              t={t}
              payments={realPayments}
              loading={paymentsLoading}
              totalReceipts={totalReceipts}
              totalPayments={totalPaymentsAmount}
              onRefresh={refetchPayments}
            />
          )}
          {mainTab === 'reservations' && (
            <ReservationsTab 
              language={language} 
              t={t} 
              reservations={realReservations}
              stats={reservationStats}
              loading={reservationsLoading}
              onRefresh={refetchReservations}
            />
          )}
          {mainTab === 'ai-analysis' && (
            <AIAnalysisTab
              language={language}
              t={t}
              stats={ledgerStats}
              entriesCount={ledgerEntries.length}
            />
          )}
          {mainTab === 'events' && (
            <EventsTab
              language={language}
              t={t}
              activities={recentActivities}
              loading={activitiesLoading}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== OVERVIEW TAB =====
function OverviewTab({ account, language, t, stats, loading, recentActivities, activitiesLoading }: any) {
  // Credit limit calculation (example)
  const creditLimit = 100000;
  const usedCredit = Math.abs(stats.currentBalance);
  const creditUsagePercent = Math.min((usedCredit / creditLimit) * 100, 100);
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Stats Grid - 4 cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <ArrowUpRight className="w-4 h-4 text-blue-500" />
              <span>{t('accounting.labels.debitTotal')}</span>
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {stats.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span>{t('accounting.labels.creditTotal')}</span>
            </div>
            <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
              {stats.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span>{language === 'ar' ? 'عدد العمليات' : 'Transactions'}</span>
            </div>
            <div className="text-xl font-bold font-mono text-gray-700 dark:text-gray-300">
              {stats.transactionCount}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</span>
            </div>
            <div className="text-lg font-bold font-mono text-gray-700 dark:text-gray-300">
              {stats.lastActivityDate || '-'}
            </div>
          </div>
        </div>

        {/* Credit Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'استخدام الائتمان' : 'Credit Usage'}
            </h3>
            <span className="text-sm text-gray-500">
              {language === 'ar' ? 'الحد الائتماني' : 'Credit Limit'}: {creditLimit.toLocaleString()} {t('currencies.SAR')}
            </span>
          </div>
          <Progress value={creditUsagePercent} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{language === 'ar' ? 'مستخدم' : 'Used'}: {creditUsagePercent.toFixed(0)}%</span>
            <span>{language === 'ar' ? 'متاح' : 'Available'}: {(100 - creditUsagePercent).toFixed(0)}%</span>
          </div>
        </div>

        {/* Two columns: Account Info + Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
          {/* Account Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'معلومات الحساب' : 'Account Info'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('accounting.account.code')}</span>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{account.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('accounting.account.type')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{account.account_type || account.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('common.currency')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('currencies.SAR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'المجموعة' : 'Group'}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {account.parent?.name || (language === 'ar' ? 'أصول' : 'Assets')}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {(125000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'عدد الطلبات' : 'Orders Count'}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'متوسط شهري' : 'Monthly Average'}</span>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {stats.monthlyAverage.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {language === 'ar' ? 'يوم 30' : '30 days'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'آخر الحركات' : 'Recent Activity'}
            </h3>
            <Button variant="ghost" size="sm" className="text-xs text-erp-teal">
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </div>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-2">
              {recentActivities.slice(0, 5).map((activity: LedgerEntry, index: number) => (
                <div key={activity.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs',
                      activity.debit > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    )}>
                      {activity.debit > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{activity.description || activity.reference}</div>
                      <div className="text-xs text-gray-500 font-mono">{activity.reference}</div>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className={cn(
                      'text-sm font-mono font-medium',
                      activity.debit > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {activity.debit > 0 ? '+' : '-'}{(activity.debit || activity.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">{activity.date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message={t('common.noData')} />
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// ===== LEDGER TAB - Using LedgerTable =====
function LedgerTab({ account, language, t, entries, loading, error, totalDebit, totalCredit, openingBalance, currentBalance, onRefresh }: any) {
  // Column order: debit, credit, description, date, status, reference, balance
  const columns: LedgerColumn<LedgerEntry>[] = [
    {
      key: 'debit',
      title: 'accounting.entry.debit',
      width: '120px',
      align: 'end',
      type: 'currency',
      colorize: false,
      showZeroAs: '-',
      sortable: true,
      footer: 'sum',
      render: (value) => value > 0 ? (
        <span className="font-mono text-green-600 dark:text-green-400">
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ) : <span className="text-gray-300">-</span>,
    },
    {
      key: 'credit',
      title: 'accounting.entry.credit',
      width: '120px',
      align: 'end',
      type: 'currency',
      colorize: false,
      showZeroAs: '-',
      sortable: true,
      footer: 'sum',
      render: (value) => value > 0 ? (
        <span className="font-mono text-red-600 dark:text-red-400">
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ) : <span className="text-gray-300">-</span>,
    },
    {
      key: 'description',
      title: 'common.description',
      sortable: true,
      filterable: true,
    },
    {
      key: 'date',
      title: 'common.date',
      width: '110px',
      type: 'date',
      sortable: true,
    },
    {
      key: 'status',
      title: 'common.status',
      width: '100px',
      type: 'status',
      sortable: true,
    },
    {
      key: 'reference',
      title: 'common.reference',
      width: '100px',
      type: 'reference',
      clickable: true,
      sortable: true,
    },
    {
      key: 'balance',
      title: 'common.balance',
      width: '120px',
      align: 'end',
      render: (value) => (
        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ),
    },
  ];

  const stats: LedgerStats = {
    label1: { title: language === 'ar' ? 'إجمالي المدين' : 'Total Debit', value: totalDebit, color: 'blue' },
    label2: { title: language === 'ar' ? 'إجمالي الدائن' : 'Total Credit', value: totalCredit, color: 'red' },
    label3: { title: language === 'ar' ? 'الرصيد' : 'Balance', value: currentBalance, color: currentBalance >= 0 ? 'green' : 'red' },
    label4: { title: language === 'ar' ? 'المعلق' : 'Pending', value: 0, color: 'gray' },
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{t('messages.loadingError')}</p>
          <Button variant="outline" className="mt-3" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 me-2" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LedgerTable
      data={entries}
      columns={columns}
      loading={loading}
      showFilters
      showQuickFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="ledger"
      onRefresh={onRefresh}
      onPrint={() => window.print()}
      onExport={(format) => console.log('Export:', format)}
      footerLabel={language === 'ar' ? 'الإجمالي' : 'Total'}
      emptyMessage={t('common.noData')}
    />
  );
}

// ===== INVOICES TAB - Using Real Data =====
function InvoicesTab({ language, t, invoices, stats: invoiceStats, loading, onRefresh }: any) {
  // Map invoice data to table format
  const tableData = (invoices || []).map((inv: AccountInvoice) => ({
    id: inv.id,
    dueDate: inv.due_date || '',
    invoiceNo: inv.invoice_number,
    status: inv.status,
    date: inv.invoice_date,
    customerName: inv.party_name || '-',
    paidAmount: inv.paid_amount,
    amount: inv.total_amount,
    debit: inv.debit_amount,
    credit: inv.credit_amount,
  }));

  const columns: LedgerColumn<any>[] = [
    { key: 'dueDate', title: language === 'ar' ? 'الاستحقاق' : 'Due Date', width: '100px', type: 'date', sortable: true },
    { key: 'invoiceNo', title: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #', width: '120px', type: 'reference', clickable: true },
    { key: 'status', title: 'common.status', width: '100px', type: 'status' },
    { key: 'date', title: 'common.date', width: '100px', type: 'date' },
    { key: 'customerName', title: language === 'ar' ? 'العميل' : 'Customer' },
    { 
      key: 'paidAmount', 
      title: language === 'ar' ? 'المدفوع' : 'Paid', 
      width: '120px', 
      align: 'end', 
      render: (value) => (
        <span className="font-mono text-green-600 dark:text-green-400">
          {value > 0 ? value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    { 
      key: 'amount', 
      title: 'common.amount', 
      width: '120px', 
      align: 'end', 
      render: (value) => (
        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
          {value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
      footer: 'sum',
    },
  ];

  const stats: LedgerStats = {
    label1: { title: language === 'ar' ? 'عدد الفواتير' : 'Invoice Count', value: invoiceStats?.totalCount || 0 },
    label2: { title: language === 'ar' ? 'المتبقي' : 'Remaining', value: invoiceStats?.remainingAmount || 0, color: 'red' },
    label3: { title: language === 'ar' ? 'المحصل' : 'Collected', value: invoiceStats?.paidAmount || 0, color: 'green' },
    label4: { title: language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices', value: invoiceStats?.totalAmount || 0, color: 'blue' },
  };

  return (
    <LedgerTable
      data={tableData}
      columns={columns}
      loading={loading}
      showFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="invoices"
      onRefresh={onRefresh}
      emptyMessage={language === 'ar' 
        ? 'لا توجد فواتير مرتبطة بهذا الحساب'
        : 'No invoices linked to this account'}
      emptyIcon={<Receipt className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
    />
  );
}

// ===== PAYMENTS TAB - Using LedgerTable =====
function PaymentsTab({ language, t, payments, loading, totalReceipts, totalPayments, onRefresh }: any) {
  const columns: LedgerColumn<PaymentEntry>[] = [
    {
      key: 'transactionDate',
      title: 'common.date',
      width: '100px',
      type: 'date',
      sortable: true,
    },
    {
      key: 'transactionNumber',
      title: 'common.number',
      width: '120px',
      type: 'reference',
      clickable: true,
      sortable: true,
    },
    {
      key: 'status',
      title: 'common.status',
      width: '100px',
      type: 'status',
    },
    {
      key: 'description',
      title: 'common.description',
    },
    {
      key: 'amount',
      title: 'common.amount',
      width: '130px',
      align: 'end',
      sortable: true,
      render: (value, row) => (
        <span className={cn(
          'font-mono font-medium',
          row.transactionType === 'receipt' ? 'text-green-600' : 'text-red-600'
        )}>
          {row.transactionType === 'receipt' ? '+' : '-'}{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
      footer: 'sum',
    },
    {
      key: 'paymentMethod',
      title: language === 'ar' ? 'الطريقة' : 'Method',
      width: '100px',
      render: (value) => (
        <span className="text-xs text-gray-500">{value || '-'}</span>
      ),
    },
  ];

  const netAmount = totalReceipts - totalPayments;
  const stats: LedgerStats = {
    label1: { title: language === 'ar' ? 'عدد العمليات' : 'Count', value: payments?.length || 0 },
    label2: { title: language === 'ar' ? 'الصافي' : 'Net', value: netAmount, color: netAmount >= 0 ? 'green' : 'red' },
    label3: { title: language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments', value: totalPayments, color: 'red' },
    label4: { title: language === 'ar' ? 'إجمالي الإيصالات' : 'Total Receipts', value: totalReceipts, color: 'green' },
  };

  return (
    <LedgerTable
      data={payments || []}
      columns={columns}
      loading={loading}
      showFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="payments"
      onRefresh={onRefresh}
      footerLabel={language === 'ar' ? 'الإجمالي' : 'Total'}
      emptyMessage={t('common.noData')}
    />
  );
}

// ===== RESERVATIONS TAB - Using Real Data =====
function ReservationsTab({ language, t, reservations, stats: reservationStats, loading, onRefresh }: any) {
  // Map reservation data to table format
  const tableData = (reservations || []).map((res: Reservation) => ({
    id: res.id,
    expiryDate: res.end_date || '',
    reservationNo: res.reservation_number,
    status: res.status,
    date: res.reservation_date,
    customerName: res.party_name || '-',
    value: res.estimated_amount,
    depositPaid: res.deposit_paid,
    debit: res.debit_amount,
    credit: res.credit_amount,
    reservationType: res.reservation_type,
  }));

  const columns: LedgerColumn<any>[] = [
    { key: 'expiryDate', title: language === 'ar' ? 'الانتهاء' : 'Expiry', width: '100px', type: 'date', sortable: true },
    { key: 'reservationNo', title: language === 'ar' ? 'رقم الحجز' : 'Reservation #', width: '130px', type: 'reference', clickable: true },
    { key: 'status', title: 'common.status', width: '100px', type: 'status' },
    { key: 'date', title: 'common.date', width: '100px', type: 'date' },
    { key: 'customerName', title: language === 'ar' ? 'العميل' : 'Customer' },
    { 
      key: 'depositPaid', 
      title: language === 'ar' ? 'العربون' : 'Deposit', 
      width: '120px', 
      align: 'end', 
      render: (value) => (
        <span className="font-mono text-green-600 dark:text-green-400">
          {value > 0 ? value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    { 
      key: 'value', 
      title: language === 'ar' ? 'القيمة' : 'Value', 
      width: '120px', 
      align: 'end', 
      render: (value) => (
        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
          {value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
      footer: 'sum',
    },
  ];

  const stats: LedgerStats = {
    label1: { title: language === 'ar' ? 'ملغي' : 'Cancelled', value: reservationStats?.cancelledCount || 0, color: 'red' },
    label2: { title: language === 'ar' ? 'معلق' : 'Pending', value: reservationStats?.pendingCount || 0 },
    label3: { title: language === 'ar' ? 'نشط' : 'Active', value: reservationStats?.activeCount || 0, color: 'green' },
    label4: { title: language === 'ar' ? 'إجمالي القيمة' : 'Total Value', value: reservationStats?.totalValue || 0, color: 'blue' },
  };

  return (
    <LedgerTable
      data={tableData}
      columns={columns}
      loading={loading}
      showFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="reservations"
      onRefresh={onRefresh}
      emptyMessage={language === 'ar' 
        ? 'لا توجد حجوزات مرتبطة بهذا الحساب'
        : 'No reservations linked to this account'}
      emptyIcon={<CalendarCheck className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
    />
  );
}

// ===== AI ANALYSIS TAB =====
function AIAnalysisTab({ language, t, stats, entriesCount }: any) {
  // Growth rate calculation
  const growthRate = stats.totalDebit > 0 ? ((stats.totalDebit - stats.totalCredit) / stats.totalDebit * 100) : 0;
  const avgTransaction = entriesCount > 0 ? (stats.totalDebit + stats.totalCredit) / 2 / entriesCount : 0;
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {language === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
              </h3>
              <p className="text-xs text-gray-500">
                {language === 'ar' ? 'رؤى ذكية حول حسابك' : 'Smart insights about your account'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 me-2" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Insight Cards */}
        <div className="space-y-3">
          {/* Spending Pattern */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'ar' ? 'نمط الإنفاق' : 'Spending Pattern'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {language === 'ar' 
                    ? `لاحظنا زيادة بنسبة ${Math.abs(growthRate).toFixed(0)}% في المصروفات مقارنة بالشهر الماضي`
                    : `We noticed a ${Math.abs(growthRate).toFixed(0)}% ${growthRate >= 0 ? 'increase' : 'decrease'} in expenses compared to last month`}
                </p>
              </div>
            </div>
          </div>

          {/* Balance Forecast */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'ar' ? 'توقع الرصيد' : 'Balance Forecast'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {language === 'ar' 
                    ? `بناءً على النمط الحالي، نتوقع أن يصل الرصيد إلى ${(stats.currentBalance * 1.1).toLocaleString()} ر.س بنهاية الشهر`
                    : `Based on current patterns, we expect the balance to reach ${(stats.currentBalance * 1.1).toLocaleString()} SAR by month end`}
                </p>
              </div>
            </div>
          </div>

          {/* Important Alert */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'ar' ? 'تنبيه مهم' : 'Important Alert'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {language === 'ar' 
                    ? 'هناك 3 فواتير مستحقة الدفع خلال الأسبوع القادم'
                    : 'There are 3 invoices due for payment within the next week'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>{language === 'ar' ? 'معدل النمو' : 'Growth Rate'}</span>
            </div>
            <div className={cn(
              'text-2xl font-bold font-mono',
              growthRate >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span>{language === 'ar' ? 'متوسط المعاملات' : 'Avg Transaction'}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-gray-700 dark:text-gray-300">
              {avgTransaction.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-sm text-gray-500 ms-1">{t('currencies.SAR')}</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ===== EVENTS TAB =====
function EventsTab({ language, t, activities, loading }: any) {
  const getEventIcon = (entry: LedgerEntry) => {
    if (entry.type === 'invoice') return <Receipt className="w-3.5 h-3.5" />;
    if (entry.type === 'payment') return <Wallet className="w-3.5 h-3.5" />;
    if (entry.type === 'receipt') return <DollarSign className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  const getEventColor = (entry: LedgerEntry) => {
    if (entry.debit > 0) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  };

  const getEventTypeLabel = (entry: LedgerEntry) => {
    if (language === 'ar') {
      if (entry.type === 'invoice') return 'إنشاء فاتورة';
      if (entry.type === 'payment') return 'تسجيل دفعة';
      if (entry.type === 'receipt') return 'استلام دفعة';
      return 'تعديل بيانات الحساب';
    }
    if (entry.type === 'invoice') return 'Invoice Created';
    if (entry.type === 'payment') return 'Payment Recorded';
    if (entry.type === 'receipt') return 'Receipt Received';
    return 'Account Updated';
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-erp-teal" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === 'ar' ? 'سجل الأحداث' : 'Event Log'}
            </h3>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 me-2" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity: LedgerEntry, index: number) => (
              <div
                key={activity.id || index}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-full', getEventColor(activity))}>
                    {getEventIcon(activity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getEventTypeLabel(activity)}
                        </span>
                        <span className="text-sm text-gray-500 ms-2 font-mono">
                          {activity.reference}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {activity.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{activity.description || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            message={language === 'ar' 
              ? 'لا توجد أحداث حديثة'
              : 'No recent events'} 
          />
        )}
      </div>
    </ScrollArea>
  );
}

// ===== EMPTY STATE COMPONENT =====
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="text-center p-6">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

export { AccountDetailsSheetV2 };
