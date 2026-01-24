/**
 * Fund Sheet Configuration
 * إعدادات شيت الصندوق/البنك
 */

import {
  Wallet,
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
    // These will be translated in the component
    return data.type === 'cash' ? 'funds.cashBox' : 'funds.bankAccount';
  },
  icon: Wallet,
  iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-700',
  
  // Status Badge
  badge: (data) => {
    const isCash = data.type === 'cash';
    return {
      label: isCash ? 'funds.cash' : 'funds.bank',
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
    label: 'common.balance',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'balance',
      label: 'funds.currentBalance',
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
      label: 'funds.totalDeposits',
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
      label: 'funds.totalWithdrawals',
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
      label: 'funds.todayChange',
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
      label: 'funds.fundName',
      type: 'text',
      icon: Wallet,
    },
    {
      key: 'type',
      label: 'common.type',
      type: 'text',
    },
    {
      key: 'accountNumber',
      label: 'funds.accountNumber',
      type: 'text',
      icon: Hash,
    },
    {
      key: 'defaultCurrency',
      label: 'funds.defaultCurrency',
      type: 'text',
      icon: DollarSign,
    },
    {
      key: 'transactionCount',
      label: 'common.transactions',
      type: 'number',
    },
    {
      key: 'lastActivity',
      label: 'common.lastActivity',
      type: 'text',
    },
  ],
  
  // Tabs Configuration
  tabs: [
    {
      id: 'overview',
      label: 'tabs.overview',
      icon: Eye,
      component: FundOverviewTab,
    },
    {
      id: 'transactions',
      label: 'tabs.transactions',
      icon: FileText,
      component: FundTransactionsTab as any,
      badge: (data) => data.transactionCount || data.transaction_count || null,
    },
    {
      id: 'activity',
      label: 'tabs.activity',
      icon: Activity,
      component: ActivityTab,
    },
  ],
  defaultTab: 'overview',
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'actions.edit',
      icon: Edit,
      variant: 'outline',
    },
    {
      id: 'receipt',
      label: 'actions.receipt',
      icon: ArrowDownRight,
      variant: 'default',
    },
    {
      id: 'payment',
      label: 'actions.payment',
      icon: ArrowUpRight,
      variant: 'outline',
    },
    {
      id: 'transfer',
      label: 'actions.transfer',
      icon: ArrowRightLeft,
      variant: 'outline',
    },
    {
      id: 'exchange',
      label: 'actions.exchange',
      icon: RefreshCw,
      variant: 'outline',
      show: (data) => data.balances && data.balances.length > 1,
    },
    {
      id: 'print',
      label: 'actions.printStatement',
      icon: Printer,
      variant: 'outline',
      onClick: () => window.print(),
    },
    {
      id: 'export',
      label: 'actions.export',
      icon: Download,
      variant: 'outline',
    },
    {
      id: 'delete',
      label: 'actions.delete',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => !data.has_transactions && data.balance === 0,
      confirm: {
        title: 'dialogs.deleteFund',
        description: 'dialogs.deleteFundWarning',
        confirmLabel: 'actions.delete',
      },
    },
  ],
  
  // Quick Actions (in header)
  quickActions: [
    {
      id: 'receipt',
      label: 'actions.receipt',
      icon: ArrowDownRight,
      variant: 'ghost',
    },
    {
      id: 'payment',
      label: 'actions.payment',
      icon: ArrowUpRight,
      variant: 'ghost',
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
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
