/**
 * Journal Entry Sheet Configuration
 * إعدادات شيت القيد المحاسبي
 */

import {
  FileText,
  Calendar,
  Edit,
  Trash2,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { JournalOverviewTab } from '../tabs/journal/JournalOverviewTab';
import { JournalLinesTab } from '../tabs/journal/JournalLinesTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'posted':
      return { label: 'status.posted', variant: 'success' as const };
    case 'cancelled':
      return { label: 'status.cancelled', variant: 'destructive' as const };
    default:
      return { label: 'status.draft', variant: 'warning' as const };
  }
};

// Voucher type colors - reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getVoucherTypeColor = (_type: string): string => {
  const colors: Record<string, string> = {
    journal: 'bg-gradient-to-br from-blue-600 to-blue-800',
    payment: 'bg-gradient-to-br from-orange-600 to-orange-800',
    receipt: 'bg-gradient-to-br from-emerald-600 to-emerald-800',
    transfer: 'bg-gradient-to-br from-purple-600 to-purple-800',
    opening: 'bg-gradient-to-br from-cyan-600 to-cyan-800',
    sales: 'bg-gradient-to-br from-green-600 to-green-800',
    purchase: 'bg-gradient-to-br from-amber-600 to-amber-800',
    expense: 'bg-gradient-to-br from-red-600 to-red-800',
    payroll: 'bg-gradient-to-br from-indigo-600 to-indigo-800',
  };
  return colors[_type] || colors.journal;
};

export const journalEntryConfig: SheetConfig = {
  docType: 'journal_entry',
  
  // Header
  title: (data) => data.voucherNo || data.entry_number || 'Journal Entry',
  subtitle: (data) => {
    const date = data.date ? new Date(data.date).toLocaleDateString('ar-SA') : '';
    return date;
  },
  icon: FileText,
  iconBg: 'blue',
  
  // Status Badge
  badge: (data: any) => {
    const info = getStatusInfo(data.status);
    return {
      label: info.label,
      variant: info.variant === 'destructive' ? 'error' : info.variant,
    } as { label: string; variant: 'default' | 'success' | 'outline' | 'error' | 'info' | 'warning' };
  },
  
  // Balance Display - Total Amount
  balance: {
    value: (data) => {
      const totalDebit = data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
      return totalDebit;
    },
    label: 'common.total',
    currency: 'SAR',
    showSign: false,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'total_debit',
      label: 'fields.totalDebit',
      icon: CheckCircle2,
      value: (data) => data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0,
      color: 'green',
    },
    {
      key: 'total_credit',
      label: 'fields.totalCredit',
      icon: XCircle,
      value: (data) => data.totalCredit || data.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0,
      color: 'red',
    },
    {
      key: 'lines_count',
      label: 'accounting.lines',
      icon: FileText,
      value: (data) => data.lines?.length || 0,
      color: 'blue',
    },
    {
      key: 'status',
      label: 'common.status',
      icon: Clock,
      value: (data) => {
        const info = getStatusInfo(data.status);
        return info.label;
      },
      color: 'purple',
    },
  ],
  
  // Info Fields for Overview
  infoFields: [
    {
      key: 'voucherNo',
      label: 'fields.voucherNumber',
      type: 'text',
      icon: FileText,
    },
    {
      key: 'voucherType',
      label: 'fields.entryType',
      type: 'text',
    },
    {
      key: 'date',
      label: 'fields.date',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'reference',
      label: 'fields.reference',
      type: 'text',
    },
    {
      key: 'costCenter',
      label: 'fields.costCenter',
      type: 'text',
    },
    {
      key: 'project',
      label: 'fields.project',
      type: 'text',
    },
    {
      key: 'createdBy',
      label: 'fields.createdBy',
      type: 'text',
    },
    {
      key: 'createdAt',
      label: 'fields.createdAt',
      type: 'date',
    },
    {
      key: 'description',
      label: 'fields.description',
      type: 'text',
      colSpan: 2,
    },
  ],
  
  // Tabs Configuration
  tabs: [
    {
      id: 'overview',
      label: 'tabs.overview',
      icon: Eye,
      component: JournalOverviewTab,
    },
    {
      id: 'lines',
      label: 'tabs.entryLines',
      icon: FileText,
      component: JournalLinesTab as any,
      badge: (data) => data.lines?.length || null,
    },
    {
      id: 'activity',
      label: 'tabs.activity',
      icon: Activity,
      component: ActivityTab,
    },
  ],
  defaultTab: 'lines',
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'actions.edit',
      icon: Edit,
      variant: 'outline',
      show: (data) => data.status === 'draft',
    },
    {
      id: 'post',
      label: 'actions.post',
      icon: CheckCircle2,
      variant: 'default',
      show: (data) => data.status === 'draft',
    },
    {
      id: 'reverse',
      label: 'actions.reverse',
      icon: RotateCcw,
      variant: 'outline',
      show: (data) => data.status === 'posted',
    },
    {
      id: 'duplicate',
      label: 'actions.duplicate',
      icon: Copy,
      variant: 'outline',
    },
    {
      id: 'print',
      label: 'actions.print',
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
      id: 'cancel',
      label: 'actions.cancelEntry',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.status !== 'cancelled',
      confirm: {
        title: 'dialogs.cancelEntry',
        description: 'dialogs.cancelEntryWarning',
        confirmLabel: 'actions.cancelEntry',
      },
    },
    {
      id: 'delete',
      label: 'actions.delete',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => data.status === 'draft',
      confirm: {
        title: 'dialogs.deleteEntry',
        description: 'dialogs.deleteEntryWarning',
        confirmLabel: 'actions.delete',
      },
    },
  ],
  
  // Quick Actions (in header)
  quickActions: [
    {
      id: 'print',
      label: 'actions.print',
      icon: Printer,
      variant: 'ghost',
      onClick: () => window.print(),
    },
    {
      id: 'duplicate',
      label: 'actions.duplicate',
      icon: Copy,
      variant: 'ghost',
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    // When clicking on an account in the lines
    if (rowDocType === 'account' || row.accountId || row.account_id) {
      return {
        docType: 'account' as DocType,
        data: {
          id: row.accountId || row.account_id || row.id,
          code: row.accountCode || row.code,
          name: row.accountName || row.name,
          ...row,
        },
      };
    }
    return null;
  },
};
