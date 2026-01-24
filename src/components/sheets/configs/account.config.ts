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
      label: isActive ? 'status.active' : 'status.inactive',
      variant: isActive ? 'success' : 'default',
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => data.current_balance || data.balance || 0,
    label: 'fields.currentBalance',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'total_debit',
      label: 'fields.totalDebit',
      icon: BookOpen,
      value: (data) => data.total_debit || 0,
      color: 'blue',
    },
    {
      key: 'total_credit',
      label: 'fields.totalCredit',
      icon: BookOpen,
      value: (data) => data.total_credit || 0,
      color: 'red',
    },
    {
      key: 'transaction_count',
      label: 'common.transactions',
      icon: Activity,
      value: (data) => data.transaction_count || 0,
      color: 'purple',
    },
    {
      key: 'opening_balance',
      label: 'accounting.openingBalance',
      icon: Wallet,
      value: (data) => data.opening_balance || 0,
      color: 'gray',
    },
  ],
  
  // Info Fields for Overview
  infoFields: [
    {
      key: 'code',
      label: 'accounting.accountCode',
      type: 'text',
      icon: BookOpen,
    },
    {
      key: 'account_type',
      label: 'accounting.accountType',
      type: 'badge',
      badge: (value) => ({
        label: value || 'Asset',
        variant: 'info',
      }),
    },
    {
      key: 'parent.name',
      label: 'accounting.parentAccount',
      type: 'text',
      format: (_value, data) => data.parent?.name || data.parent_name || '-',
    },
    {
      key: 'currency',
      label: 'common.currency',
      type: 'text',
      format: (_value, data) => data.currency || 'SAR',
    },
    {
      key: 'created_at',
      label: 'fields.created',
      type: 'date',
    },
    {
      key: 'description',
      label: 'common.description',
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
      component: AccountOverviewTab,
    },
    {
      id: 'ledger',
      label: 'tabs.ledger',
      icon: BookOpen,
      component: AccountLedgerTab,
    },
    {
      id: 'invoices',
      label: 'tabs.invoices',
      icon: Receipt,
      component: PaymentsTab,
      hidden: (data) => !['customer', 'supplier', 'Asset', 'Liability'].includes(data.account_type || data.type),
    },
    {
      id: 'payments',
      label: 'tabs.payments',
      icon: Wallet,
      component: PaymentsTab,
      hidden: (data) => !['customer', 'supplier', 'Asset', 'Liability'].includes(data.account_type || data.type),
    },
    {
      id: 'reservations',
      label: 'tabs.reservations',
      icon: CalendarCheck,
      component: ReservationsTab as any,
      badge: (data) => data.reservations?.length || null,
      hidden: (data) => !data.reservations || data.reservations.length === 0,
    },
    {
      id: 'documents',
      label: 'tabs.documents',
      icon: FileText,
      component: DocumentsTab as any,
      badge: (data) => data.documents?.length || data.attachments?.length || null,
    },
    {
      id: 'notes',
      label: 'tabs.notes',
      icon: StickyNote,
      component: NotesTab,
    },
    {
      id: 'ai-analysis',
      label: 'tabs.aiAnalysis',
      icon: Brain,
      component: AIAnalysisTab,
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
      show: (data) => !data.is_system && data.transaction_count === 0,
      confirm: {
        title: 'dialogs.deleteAccount',
        description: 'dialogs.deleteAccountWarning',
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
      id: 'export',
      label: 'actions.export',
      icon: Download,
      variant: 'ghost',
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
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
