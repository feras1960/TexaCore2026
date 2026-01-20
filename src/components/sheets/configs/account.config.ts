/**
 * Account Sheet Configuration
 * إعدادات شيت الحساب
 */

import {
  Building2,
  BookOpen,
  Receipt,
  Wallet,
  Activity,
  Sparkles,
  CalendarCheck,
  Edit,
  Trash2,
  Printer,
  Download,
  Eye,
  Brain,
  FileText,
  StickyNote,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { AccountOverviewTab } from '../tabs/account/AccountOverviewTab';
import { AccountLedgerTab } from '../tabs/account/AccountLedgerTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';
import { ReservationsTab } from '../tabs/shared/ReservationsTab';
import { AIAnalysisTab } from '../tabs/shared/AIAnalysisTab';
import { DocumentsTab } from '../tabs/shared/DocumentsTab';
import { NotesTab } from '../tabs/shared/NotesTab';

export const accountConfig: SheetConfig = {
  docType: 'account',
  
  // Header
  title: (data) => data.name || data.nameAr || data.name_ar || 'Account',
  subtitle: (data) => data.code,
  icon: Building2,
  iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900',
  
  // Status Badge
  badge: (data) => {
    const isActive = data.is_active !== false;
    return {
      label: isActive ? 'نشط' : 'غير نشط',
      variant: isActive ? 'success' : 'default',
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => data.current_balance || data.balance || 0,
    label: 'Current Balance',
    labelAr: 'الرصيد الحالي',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'total_debit',
      label: 'Total Debit',
      labelAr: 'إجمالي المدين',
      icon: BookOpen,
      value: (data) => data.total_debit || 0,
      color: 'blue',
    },
    {
      key: 'total_credit',
      label: 'Total Credit',
      labelAr: 'إجمالي الدائن',
      icon: BookOpen,
      value: (data) => data.total_credit || 0,
      color: 'red',
    },
    {
      key: 'transaction_count',
      label: 'Transactions',
      labelAr: 'عدد العمليات',
      icon: Activity,
      value: (data) => data.transaction_count || 0,
      color: 'purple',
    },
    {
      key: 'opening_balance',
      label: 'Opening Balance',
      labelAr: 'الرصيد الافتتاحي',
      icon: Wallet,
      value: (data) => data.opening_balance || 0,
      color: 'gray',
    },
  ],
  
  // Info Fields for Overview
  infoFields: [
    {
      key: 'code',
      label: 'Account Code',
      labelAr: 'رمز الحساب',
      type: 'text',
      icon: BookOpen,
    },
    {
      key: 'account_type',
      label: 'Account Type',
      labelAr: 'نوع الحساب',
      type: 'badge',
      badge: (value) => ({
        label: value || 'Asset',
        variant: 'info',
      }),
    },
    {
      key: 'parent.name',
      label: 'Parent Account',
      labelAr: 'الحساب الأب',
      type: 'text',
      format: (value, data) => data.parent?.name || data.parent_name || '-',
    },
    {
      key: 'currency',
      label: 'Currency',
      labelAr: 'العملة',
      type: 'text',
      format: (value) => value || 'SAR',
    },
    {
      key: 'created_at',
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
      component: AccountOverviewTab,
    },
    {
      id: 'ledger',
      label: 'Ledger',
      labelAr: 'كشف الحساب',
      icon: BookOpen,
      component: AccountLedgerTab,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      labelAr: 'الفواتير',
      icon: Receipt,
      component: PaymentsTab, // Reuse PaymentsTab for now, can create InvoicesTab later
      hidden: (data) => !['customer', 'supplier', 'Asset', 'Liability'].includes(data.account_type || data.type),
    },
    {
      id: 'payments',
      label: 'Payments',
      labelAr: 'المدفوعات',
      icon: Wallet,
      component: PaymentsTab,
      hidden: (data) => !['customer', 'supplier', 'Asset', 'Liability'].includes(data.account_type || data.type),
    },
    {
      id: 'reservations',
      label: 'Reservations',
      labelAr: 'الحجوزات',
      icon: CalendarCheck,
      component: ReservationsTab,
      badge: (data) => data.reservations?.length || null,
      hidden: (data) => !data.reservations || data.reservations.length === 0,
    },
    {
      id: 'documents',
      label: 'Documents',
      labelAr: 'المستندات',
      icon: FileText,
      component: DocumentsTab,
      badge: (data) => data.documents?.length || data.attachments?.length || null,
    },
    {
      id: 'notes',
      label: 'Notes',
      labelAr: 'الملاحظات',
      icon: StickyNote,
      component: NotesTab,
    },
    {
      id: 'ai-analysis',
      label: 'AI Analysis',
      labelAr: 'تحليلات AI',
      icon: Brain,
      component: AIAnalysisTab,
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
      show: (data) => !data.is_system && data.transaction_count === 0,
      confirm: {
        title: 'Delete Account',
        titleAr: 'حذف الحساب',
        description: 'Are you sure you want to delete this account? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.',
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
      id: 'export',
      label: 'Export',
      labelAr: 'تصدير',
      icon: Download,
      variant: 'ghost',
    },
  ],
  
  // Sheet Settings
  width: 'xl',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    // Handle clicking on ledger entries, invoices, payments
    if (rowDocType === 'journal_entry' || row.journal_id) {
      return {
        docType: 'journal_entry' as DocType,
        data: { id: row.journal_id, ...row },
      };
    }
    if (rowDocType === 'invoice' || row.invoice_id) {
      return {
        docType: 'invoice' as DocType,
        data: { id: row.invoice_id, ...row },
      };
    }
    if (rowDocType === 'payment' || row.payment_id) {
      return {
        docType: 'payment' as DocType,
        data: { id: row.payment_id, ...row },
      };
    }
    return null;
  },
};
