/**
 * Payment Sheet Configuration
 * إعدادات شيت الدفعة
 */

import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Book,
  Activity,
  Receipt,
  Building2,
} from 'lucide-react';
import { type SheetConfig } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

export const paymentConfig: SheetConfig = {
  docType: 'payment',

  // Header
  title: (data) => data.invoice_number || `PMT-${data.id}`,
  subtitle: (data) => data.tenant_name || data.reference,
  icon: DollarSign,
  iconBg: 'bg-gradient-to-br from-green-600 to-green-800',

  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
      completed: { label: 'status.completed', variant: 'success' },
      pending: { label: 'status.pending', variant: 'warning' },
      failed: { label: 'status.failed', variant: 'error' },
      refunded: { label: 'status.refunded', variant: 'info' },
      cancelled: { label: 'status.cancelled', variant: 'default' },
    };
    const status = statusMap[data?.status] || statusMap.pending;
    return {
      label: status.label,
      variant: status.variant,
    };
  },

  // Balance Display
  balance: {
    value: (data) => data.amount || 0,
    label: 'fields.amount',
    currency: undefined,
    showSign: false,
  },

  // Stats Cards
  stats: [
    {
      key: 'amount',
      label: 'stats.amount',
      icon: DollarSign,
      value: (data) => data.amount || 0,
      color: 'green',
      format: (value, data) => `${value.toLocaleString()} ${data?.currency || ''}`,
    },
    {
      key: 'commission',
      label: 'stats.commission',
      icon: Receipt,
      value: (data) => data.commission_amount || 0,
      color: 'blue',
      format: (value, data) => `${value.toLocaleString()} ${data?.currency || ''}`,
    },
    {
      key: 'payment_date',
      label: 'stats.paymentDate',
      icon: Calendar,
      value: (data) => {
        if (!data.payment_date) return '-';
        return new Date(data.payment_date).toLocaleDateString();
      },
      color: 'gray',
    },
  ],

  // Info Fields
  infoFields: [
    { key: 'invoice_number', label: 'fields.invoiceNumber', type: 'text', icon: FileText },
    {
      key: 'tenant_name',
      label: 'fields.tenant',
      type: 'link',
      icon: Building2,
      link: (_value, data) => data.tenant_id ? { docType: 'tenant', id: data.tenant_id } : null,
    },
    { key: 'payment_method', label: 'fields.paymentMethod', type: 'badge', icon: CreditCard },
    { key: 'amount', label: 'fields.amount', type: 'currency', icon: DollarSign },
    { key: 'payment_date', label: 'fields.paymentDate', type: 'date', icon: Calendar },
    { key: 'due_date', label: 'fields.dueDate', type: 'date', icon: Calendar },
    {
      key: 'agent_name',
      label: 'fields.agent',
      type: 'link',
      link: (_value, data) => data.agent_id ? { docType: 'agent', id: data.agent_id } : null,
    },
    { key: 'commission_amount', label: 'fields.commission', type: 'currency' },
    { key: 'reference', label: 'fields.reference', type: 'text' },
    { key: 'notes', label: 'fields.notes', type: 'text', colSpan: 2 },
  ],

  // Tabs
  tabs: [
    { id: 'overview', label: 'tabs.overview', icon: Eye, component: OverviewTab },
    { id: 'activity', label: 'tabs.activity', icon: Activity, component: ActivityTab },
  ],
  defaultTab: 'overview',

  // Actions
  actions: [
    {
      id: 'view_invoice',
      label: 'actions.viewInvoice',
      icon: FileText,
      variant: 'outline',
      show: (data) => !!data.invoice_id,
      onClick: () => { },
    },
    {
      id: 'confirm',
      label: 'actions.confirm',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data?.status === 'pending',
      onClick: () => { },
    },
    {
      id: 'refund',
      label: 'actions.refund',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data?.status === 'completed',
      confirm: {
        title: 'dialogs.confirmRefund',
        description: 'dialogs.refundPaymentWarning',
      },
      onClick: () => { },
    },
  ],

  // Sheet Settings
  width: 'md',
};

export default paymentConfig;
