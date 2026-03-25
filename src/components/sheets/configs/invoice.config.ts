/**
 * Invoice Sheet Configuration
 * إعدادات شيت الفاتورة
 */

import {
  Receipt,
  Calendar,
  User,
  Building2,
  CreditCard,
  DollarSign,
  Printer,
  Download,
  Edit,
  Trash2,
  Eye,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';

export const invoiceConfig: SheetConfig = {
  docType: 'invoice',

  // Header
  title: (data) => data.invoice_no || data.invoiceNo || data.reference,
  subtitle: (data) => data.party_name || data.partyName || data.customer_name,
  icon: Receipt,
  iconBg: 'bg-gradient-to-br from-green-600 to-green-800',

  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
      paid: { label: 'status.paid', variant: 'success' },
      partial: { label: 'status.partial', variant: 'info' },
      unpaid: { label: 'status.unpaid', variant: 'error' },
      overdue: { label: 'status.overdue', variant: 'error' },
      draft: { label: 'status.draft', variant: 'warning' },
      submitted: { label: 'status.submitted', variant: 'info' },
      cancelled: { label: 'status.cancelled', variant: 'default' },
    };
    const status = statusMap[data.status] || statusMap.draft;
    return {
      label: status.label,
      variant: status.variant,
      icon: status.variant === 'success' ? CheckCircle :
        status.variant === 'error' ? AlertTriangle : Clock,
    };
  },

  // Balance Display
  balance: {
    value: (data: any) => data.balance || (data.grand_total || data.grandTotal || 0) - (data.paid_amount || data.paidAmount || 0),
    label: 'fields.balanceDue',
    currency: undefined,
    showSign: false,
  },

  // Stats Cards
  stats: [
    {
      key: 'grand_total',
      label: 'stats.total',
      icon: DollarSign,
      value: (data) => data.grand_total || data.grandTotal || 0,
      color: 'blue',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'paid_amount',
      label: 'stats.paid',
      icon: CheckCircle,
      value: (data) => data.paid_amount || data.paidAmount || 0,
      color: 'green',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'balance',
      label: 'stats.balance',
      icon: AlertTriangle,
      value: (data) => (data.grand_total || data.grandTotal || 0) - (data.paid_amount || data.paidAmount || 0),
      color: 'red',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'items_count',
      label: 'stats.items',
      icon: FileText,
      value: (data) => data.items?.length || 0,
      color: 'gray',
    },
  ],

  // Info Fields
  infoFields: [
    { key: 'invoice_no', label: 'fields.invoiceNo', type: 'text' },
    {
      key: 'invoice_type',
      label: 'fields.type',
      type: 'badge',
      badge: (value) => {
        const types: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
          sales: { label: 'invoiceTypes.sales', variant: 'success' },
          purchase: { label: 'invoiceTypes.purchase', variant: 'info' },
          credit_note: { label: 'invoiceTypes.creditNote', variant: 'warning' },
          debit_note: { label: 'invoiceTypes.debitNote', variant: 'default' },
        };
        return types[value] || { label: value, variant: 'default' };
      },
    },
    { key: 'date', label: 'fields.date', type: 'date', icon: Calendar },
    { key: 'due_date', label: 'fields.dueDate', type: 'date', icon: Clock },
    {
      key: 'party_name',
      label: 'fields.customer',
      type: 'link',
      icon: Building2,
      link: (_value: any, data: any) => data.party_id ? { docType: (data.party_type === 'supplier' ? 'supplier' : 'customer') as DocType, id: data.party_id } : null,
    },
    { key: 'party_phone', label: 'fields.phone', type: 'phone' },
    { key: 'party_email', label: 'fields.email', type: 'email' },
    { key: 'payment_method', label: 'fields.paymentMethod', type: 'text', icon: CreditCard },
    { key: 'sales_person', label: 'fields.salesPerson', type: 'text', icon: User },
    { key: 'currency', label: 'common.currency', type: 'text' },
    { key: 'created_at', label: 'fields.created', type: 'date' },
  ],

  // Tabs
  tabs: [
    { id: 'overview', label: 'tabs.overview', icon: Eye, component: OverviewTab },
    {
      id: 'payments',
      label: 'tabs.payments',
      icon: CreditCard,
      component: PaymentsTab,
      badge: (data) => data.payments?.length || 0,
    },
    { id: 'activity', label: 'tabs.activity', icon: Activity, component: ActivityTab },
  ],
  defaultTab: 'overview',

  // Quick Actions (shown in header)
  quickActions: [
    {
      id: 'print',
      label: 'actions.print',
      icon: Printer,
      variant: 'ghost',
      onClick: (_data: any) => window.print(),
    },
    {
      id: 'download',
      label: 'actions.download',
      icon: Download,
      variant: 'ghost',
      onClick: () => { },
    },
  ],

  // Actions
  actions: [
    {
      id: 'edit',
      label: 'actions.edit',
      icon: Edit,
      variant: 'outline',
      show: (data) => data.status === 'draft',
      onClick: () => { },
    },
    {
      id: 'submit',
      label: 'actions.submit',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status === 'draft',
      onClick: () => { },
    },
    {
      id: 'cancel',
      label: 'actions.cancel',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.status !== 'cancelled' && data.status !== 'paid',
      confirm: {
        title: 'dialogs.confirmCancel',
        description: 'dialogs.cancelInvoiceWarning',
      },
      onClick: () => { },
    },
    {
      id: 'delete',
      label: 'actions.delete',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => data.status === 'draft' || data.status === 'cancelled',
      confirm: {
        title: 'dialogs.confirmDelete',
        description: 'dialogs.deleteInvoiceWarning',
      },
      onClick: () => { },
    },
  ],

  // Sheet Settings
  width: 'lg',

  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'payment') {
      return { docType: 'payment', data: row };
    }
    if (rowDocType === 'customer' || rowDocType === 'supplier') {
      return { docType: rowDocType, data: row };
    }
    return null;
  },
};

export default invoiceConfig;
