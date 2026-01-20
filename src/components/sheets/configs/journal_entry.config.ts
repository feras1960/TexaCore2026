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
      return { label: 'مرحّل', labelEn: 'Posted', variant: 'success' as const };
    case 'cancelled':
      return { label: 'ملغي', labelEn: 'Cancelled', variant: 'destructive' as const };
    default:
      return { label: 'مسودة', labelEn: 'Draft', variant: 'warning' as const };
  }
};

const getVoucherTypeColor = (type: string) => {
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
  return colors[type] || colors.journal;
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
  iconBg: (data) => getVoucherTypeColor(data.voucherType || data.entry_type || 'journal'),
  
  // Status Badge
  badge: (data) => {
    const info = getStatusInfo(data.status);
    return {
      label: info.label,
      variant: info.variant,
    };
  },
  
  // Balance Display - Total Amount
  balance: {
    value: (data) => {
      const totalDebit = data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
      return totalDebit;
    },
    label: 'Total',
    labelAr: 'الإجمالي',
    currency: 'SAR',
    showSign: false,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'total_debit',
      label: 'Total Debit',
      labelAr: 'إجمالي المدين',
      icon: CheckCircle2,
      value: (data) => data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0,
      color: 'green',
    },
    {
      key: 'total_credit',
      label: 'Total Credit',
      labelAr: 'إجمالي الدائن',
      icon: XCircle,
      value: (data) => data.totalCredit || data.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0,
      color: 'red',
    },
    {
      key: 'lines_count',
      label: 'Lines',
      labelAr: 'عدد البنود',
      icon: FileText,
      value: (data) => data.lines?.length || 0,
      color: 'blue',
    },
    {
      key: 'status',
      label: 'Status',
      labelAr: 'الحالة',
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
      label: 'Voucher Number',
      labelAr: 'رقم السند',
      type: 'text',
      icon: FileText,
    },
    {
      key: 'voucherType',
      label: 'Entry Type',
      labelAr: 'نوع القيد',
      type: 'text',
    },
    {
      key: 'date',
      label: 'Date',
      labelAr: 'التاريخ',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'reference',
      label: 'Reference',
      labelAr: 'المرجع',
      type: 'text',
    },
    {
      key: 'costCenter',
      label: 'Cost Center',
      labelAr: 'مركز التكلفة',
      type: 'text',
    },
    {
      key: 'project',
      label: 'Project',
      labelAr: 'المشروع',
      type: 'text',
    },
    {
      key: 'createdBy',
      label: 'Created By',
      labelAr: 'أنشأ بواسطة',
      type: 'text',
    },
    {
      key: 'createdAt',
      label: 'Created At',
      labelAr: 'تاريخ الإنشاء',
      type: 'date',
    },
    {
      key: 'description',
      label: 'Description',
      labelAr: 'الوصف',
      type: 'text',
      colSpan: 2,
    },
  ],
  
  // Tabs Configuration
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      labelAr: 'نظرة عامة',
      icon: Eye,
      component: JournalOverviewTab,
    },
    {
      id: 'lines',
      label: 'Entry Lines',
      labelAr: 'بنود القيد',
      icon: FileText,
      component: JournalLinesTab,
      badge: (data) => data.lines?.length || null,
    },
    {
      id: 'activity',
      label: 'Activity',
      labelAr: 'النشاط',
      icon: Activity,
      component: ActivityTab,
    },
  ],
  defaultTab: 'lines',
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'Edit',
      labelAr: 'تعديل',
      icon: Edit,
      variant: 'outline',
      show: (data) => data.status === 'draft',
    },
    {
      id: 'post',
      label: 'Post Entry',
      labelAr: 'ترحيل القيد',
      icon: CheckCircle2,
      variant: 'default',
      show: (data) => data.status === 'draft',
    },
    {
      id: 'reverse',
      label: 'Reverse Entry',
      labelAr: 'عكس القيد',
      icon: RotateCcw,
      variant: 'outline',
      show: (data) => data.status === 'posted',
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      labelAr: 'نسخ',
      icon: Copy,
      variant: 'outline',
    },
    {
      id: 'print',
      label: 'Print',
      labelAr: 'طباعة',
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
      id: 'cancel',
      label: 'Cancel Entry',
      labelAr: 'إلغاء القيد',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.status !== 'cancelled',
      confirm: {
        title: 'Cancel Entry',
        titleAr: 'إلغاء القيد',
        description: 'Are you sure you want to cancel this journal entry? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من إلغاء هذا القيد؟ لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'Cancel Entry',
        confirmLabelAr: 'إلغاء القيد',
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      labelAr: 'حذف',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => data.status === 'draft',
      confirm: {
        title: 'Delete Entry',
        titleAr: 'حذف القيد',
        description: 'Are you sure you want to delete this journal entry? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من حذف هذا القيد؟ لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'Delete',
        confirmLabelAr: 'حذف',
      },
    },
  ],
  
  // Quick Actions (in header)
  quickActions: [
    {
      id: 'print',
      label: 'Print',
      labelAr: 'طباعة',
      icon: Printer,
      variant: 'ghost',
      onClick: () => window.print(),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      labelAr: 'نسخ',
      icon: Copy,
      variant: 'ghost',
    },
  ],
  
  // Sheet Settings
  width: 'xl',
  
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
