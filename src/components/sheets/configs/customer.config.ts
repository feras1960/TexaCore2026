/**
 * Customer Sheet Configuration
 * إعدادات شيت العميل
 */

import {
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  Wallet,
  Activity,
  Edit,
  Trash2,
  Printer,
  Download,
  Eye,
  CreditCard,
  FileText,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

export const customerConfig: SheetConfig = {
  docType: 'customer',

  // Header
  title: (data) => data.name || data.nameAr || 'Customer',
  subtitle: (data) => data.code,
  icon: Users,
  iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800',

  // Status Badge
  badge: (data) => {
    const status = data?.status || (data.is_active !== false ? 'active' : 'inactive');
    return {
      label: status === 'active' ? 'common.status.active' : 'common.status.inactive',
      variant: status === 'active' ? 'success' : 'default',
    };
  },

  // Balance Display
  balance: {
    value: (data) => data.balance || data.current_balance || 0,
    label: 'fields.receivables',
    currency: undefined,
    showSign: true,
  },

  // Stats Cards
  stats: [
    {
      key: 'total_invoices',
      label: 'stats.totalInvoices',
      icon: Receipt,
      value: (data) => data.total_invoices || data.invoices_count || 0,
      color: 'blue',
    },
    {
      key: 'total_sales',
      label: 'stats.totalSales',
      icon: CreditCard,
      value: (data) => data.total_sales || 0,
      color: 'green',
    },
    {
      key: 'balance',
      label: 'fields.balance',
      icon: Wallet,
      value: (data) => data.balance || data.current_balance || 0,
      color: 'purple',
    },
    {
      key: 'orders_count',
      label: 'stats.orders',
      icon: FileText,
      value: (data) => data.orders_count || 0,
      color: 'yellow',
    },
  ],

  // Info Fields for Overview
  infoFields: [
    {
      key: 'code',
      label: 'fields.customerCode',
      type: 'text',
      icon: Users,
    },
    {
      key: 'email',
      label: 'fields.email',
      type: 'email',
      icon: Mail,
    },
    {
      key: 'phone',
      label: 'fields.phone',
      type: 'phone',
      icon: Phone,
    },
    {
      key: 'address',
      label: 'fields.address',
      type: 'text',
      icon: MapPin,
    },
    {
      key: 'city',
      label: 'fields.city',
      type: 'text',
    },
    {
      key: 'country',
      label: 'fields.country',
      type: 'text',
    },
    {
      key: 'credit_limit',
      label: 'fields.creditLimit',
      type: 'currency',
      icon: CreditCard,
    },
    {
      key: 'payment_terms',
      label: 'fields.paymentTerms',
      type: 'text',
    },
    {
      key: 'created_at',
      label: 'fields.createdAt',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'notes',
      label: 'fields.notes',
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
      component: OverviewTab,
    },
    {
      id: 'ledger',
      label: 'tabs.accountStatement',
      icon: FileText,
      component: LedgerTab,
    },
    {
      id: 'invoices',
      label: 'tabs.invoices',
      icon: Receipt,
      component: PaymentsTab, // Reuse for now
      badge: (data) => data.invoices?.length || data.invoices_count || null,
    },
    {
      id: 'payments',
      label: 'tabs.payments',
      icon: Wallet,
      component: PaymentsTab,
      badge: (data) => data.payments?.length || null,
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
      id: 'create_invoice',
      label: 'parties.actions.createInvoice',
      labelAr: 'إنشاء فاتورة',
      icon: Receipt,
      variant: 'default',
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
      show: (data) => !data.has_transactions,
      confirm: {
        title: 'dialogs.deleteCustomer',
        description: 'dialogs.deleteCustomerWarning',
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
  ],

  // Sheet Settings
  width: 'lg',

  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'invoice' || row.invoice_id) {
      return {
        docType: 'invoice' as DocType,
        data: { id: row.invoice_id || row.id, ...row },
      };
    }
    if (rowDocType === 'payment' || row.payment_id) {
      return {
        docType: 'payment' as DocType,
        data: { id: row.payment_id || row.id, ...row },
      };
    }
    return null;
  },
};
