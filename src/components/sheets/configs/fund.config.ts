/**
 * Fund Sheet Configuration
 * إعدادات شيت الصندوق/البنك
 */

import {
  Wallet,
  Landmark,
  Edit,
  Trash2,
  Printer,
  Download,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  Activity,
  Eye,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Hash,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { FundOverviewTab } from '../tabs/fund/FundOverviewTab';
import { FundTransactionsTab } from '../tabs/fund/FundTransactionsTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

export const fundConfig: SheetConfig = {
  docType: 'fund',
  
  // Header
  title: (data) => data.name || 'Fund',
  subtitle: (data) => {
    if (data.type === 'bank' && data.accountNumber) {
      return data.accountNumber;
    }
    return data.type === 'cash' ? 'صندوق نقدي' : 'حساب بنكي';
  },
  icon: Wallet,
  iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-700',
  
  // Status Badge
  badge: (data) => {
    const isCash = data.type === 'cash';
    return {
      label: isCash ? 'صندوق' : 'بنك',
      variant: isCash ? 'success' : 'default',
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => {
      if (data.balances && data.balances.length > 0) {
        return data.balances.reduce((sum: number, b: any) => sum + (b.balance || 0), 0);
      }
      return data.balance || data.current_balance || 0;
    },
    label: 'Balance',
    labelAr: 'الرصيد',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'balance',
      label: 'Current Balance',
      labelAr: 'الرصيد الحالي',
      icon: DollarSign,
      value: (data) => {
        if (data.balances && data.balances.length > 0) {
          return data.balances.reduce((sum: number, b: any) => sum + (b.balance || 0), 0);
        }
        return data.balance || 0;
      },
      color: 'blue',
    },
    {
      key: 'total_deposits',
      label: 'Total Deposits',
      labelAr: 'إجمالي الإيداعات',
      icon: ArrowDownRight,
      value: (data) => {
        if (data.balances && data.balances.length > 0) {
          return data.balances.reduce((sum: number, b: any) => sum + (b.totalDeposits || 0), 0);
        }
        return data.totalDeposits || data.total_deposits || 0;
      },
      color: 'green',
    },
    {
      key: 'total_withdrawals',
      label: 'Total Withdrawals',
      labelAr: 'إجمالي السحوبات',
      icon: ArrowUpRight,
      value: (data) => {
        if (data.balances && data.balances.length > 0) {
          return data.balances.reduce((sum: number, b: any) => sum + (b.totalWithdrawals || 0), 0);
        }
        return data.totalWithdrawals || data.total_withdrawals || 0;
      },
      color: 'red',
    },
    {
      key: 'today_change',
      label: "Today's Change",
      labelAr: 'حركة اليوم',
      icon: TrendingUp,
      value: (data) => {
        if (data.balances && data.balances.length > 0) {
          return data.balances.reduce((sum: number, b: any) => sum + (b.todayChange || 0), 0);
        }
        return data.todayChange || data.today_change || 0;
      },
      color: 'purple',
    },
  ],
  
  // Info Fields for Overview
  infoFields: [
    {
      key: 'name',
      label: 'Fund Name',
      labelAr: 'اسم الصندوق',
      type: 'text',
      icon: Wallet,
    },
    {
      key: 'type',
      label: 'Type',
      labelAr: 'النوع',
      type: 'text',
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      labelAr: 'رقم الحساب',
      type: 'text',
      icon: Hash,
    },
    {
      key: 'defaultCurrency',
      label: 'Default Currency',
      labelAr: 'العملة الأساسية',
      type: 'text',
      icon: DollarSign,
    },
    {
      key: 'transactionCount',
      label: 'Transactions',
      labelAr: 'عدد العمليات',
      type: 'number',
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      labelAr: 'آخر نشاط',
      type: 'text',
    },
  ],
  
  // Tabs Configuration
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      labelAr: 'نظرة عامة',
      icon: Eye,
      component: FundOverviewTab,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      labelAr: 'العمليات',
      icon: FileText,
      component: FundTransactionsTab,
      badge: (data) => data.transactionCount || data.transaction_count || null,
    },
    {
      id: 'activity',
      label: 'Activity',
      labelAr: 'النشاط',
      icon: Activity,
      component: ActivityTab,
    },
  ],
  defaultTab: 'overview',
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'Edit',
      labelAr: 'تعديل',
      icon: Edit,
      variant: 'outline',
    },
    {
      id: 'receipt',
      label: 'Receipt',
      labelAr: 'مقبوضات',
      icon: ArrowDownRight,
      variant: 'default',
    },
    {
      id: 'payment',
      label: 'Payment',
      labelAr: 'مدفوعات',
      icon: ArrowUpRight,
      variant: 'outline',
    },
    {
      id: 'transfer',
      label: 'Transfer',
      labelAr: 'تحويل',
      icon: ArrowRightLeft,
      variant: 'outline',
    },
    {
      id: 'exchange',
      label: 'Exchange',
      labelAr: 'تصريف عملات',
      icon: RefreshCw,
      variant: 'outline',
      show: (data) => data.balances && data.balances.length > 1,
    },
    {
      id: 'print',
      label: 'Print Statement',
      labelAr: 'طباعة كشف',
      icon: Printer,
      variant: 'outline',
      onClick: () => window.print(),
    },
    {
      id: 'export',
      label: 'Export',
      labelAr: 'تصدير',
      icon: Download,
      variant: 'outline',
    },
    {
      id: 'delete',
      label: 'Delete',
      labelAr: 'حذف',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => !data.has_transactions && data.balance === 0,
      confirm: {
        title: 'Delete Fund',
        titleAr: 'حذف الصندوق',
        description: 'Are you sure you want to delete this fund? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من حذف هذا الصندوق؟ لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'Delete',
        confirmLabelAr: 'حذف',
      },
    },
  ],
  
  // Quick Actions (in header)
  quickActions: [
    {
      id: 'receipt',
      label: 'Receipt',
      labelAr: 'مقبوضات',
      icon: ArrowDownRight,
      variant: 'ghost',
    },
    {
      id: 'payment',
      label: 'Payment',
      labelAr: 'مدفوعات',
      icon: ArrowUpRight,
      variant: 'ghost',
    },
  ],
  
  // Sheet Settings
  width: 'xl',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'journal_entry' || row.voucherNo || row.voucher_no) {
      return {
        docType: 'journal_entry' as DocType,
        data: {
          id: row.id,
          voucherNo: row.voucherNo || row.voucher_no,
          ...row,
        },
      };
    }
    return null;
  },
};
