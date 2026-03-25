/**
 * Supplier Sheet Configuration
 * إعدادات شيت المورد
 */

import {
  Truck,
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
  FileText,
  Package,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

export const supplierConfig: SheetConfig = {
  docType: 'supplier',

  // Header
  title: (data) => data.name || data.nameAr || 'Supplier',
  subtitle: (data) => data.code,
  icon: Truck,
  iconBg: 'bg-gradient-to-br from-orange-600 to-orange-800',

  // Status Badge
  badge: (data) => {
    const status = data.status || (data.is_active !== false ? 'active' : 'inactive');
    return {
      label: status === 'active' ? 'common.status.active' : 'common.status.inactive',
      variant: status === 'active' ? 'success' : 'default',
    };
  },

  // Balance Display
  balance: {
    value: (data) => data.balance || data.current_balance || 0,
    label: 'fields.payables',
    currency: undefined,
    showSign: true,
  },

  // Stats Cards
  stats: [
    {
      key: 'total_invoices',
      label: 'stats.totalBills',
      icon: Receipt,
      value: (data) => data.total_invoices || data.bills_count || 0,
      color: 'blue',
    },
    {
      key: 'total_purchases',
      label: 'stats.totalPurchases',
      icon: Package,
      value: (data) => data.total_purchases || 0,
      color: 'green',
    },
    {
      key: 'balance',
      label: 'fields.balance',
      icon: Wallet,
      value: (data) => Math.abs(data.balance || data.current_balance || 0),
      color: 'red',
    },
    {
      key: 'orders_count',
      label: 'stats.purchaseOrders',
      icon: FileText,
      value: (data) => data.orders_count || data.purchase_orders_count || 0,
      color: 'yellow',
    },
  ],

  // Info Fields for Overview
  infoFields: [
    {
      key: 'code',
      label: 'fields.supplierCode',
      type: 'text',
      icon: Truck,
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
      key: 'tax_number',
      label: 'fields.taxNumber',
      type: 'text',
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
      id: 'bills',
      label: 'tabs.bills',
      icon: Receipt,
      component: PaymentsTab, // Reuse for now
      badge: (data) => data.bills?.length || data.bills_count || null,
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
      id: 'create_bill',
      label: 'parties.actions.createBill',
      labelAr: 'إنشاء فاتورة',
      icon: Receipt,
      variant: 'default',
    },
    {
      id: 'create_payment',
      label: 'actions.recordPayment',
      icon: Wallet,
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
      show: (data) => !data.has_transactions,
      confirm: {
        title: 'dialogs.deleteSupplier',
        description: 'dialogs.deleteSupplierWarning',
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
    if (rowDocType === 'invoice' || row.invoice_id || row.bill_id) {
      return {
        docType: 'invoice' as DocType,
        data: { id: row.invoice_id || row.bill_id || row.id, ...row },
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
