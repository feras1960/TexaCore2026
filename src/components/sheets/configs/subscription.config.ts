/**
 * Subscription Sheet Configuration
 * إعدادات شيت الاشتراك
 * 
 * التبويبات:
 * 1. نظرة عامة (Overview) - معلومات الاشتراك الأساسية
 * 2. تفاصيل الباقة (Plan Details) - تفاصيل الباقة المشترك بها
 * 3. الفوترة (Billing) - معلومات الفوترة والدورة
 * 4. المدفوعات (Payments) - سجل الدفعات
 * 5. الفواتير (Invoices) - الفواتير المرتبطة
 * 6. التجديدات (Renewals) - سجل التجديدات
 * 7. السجل (Activity) - سجل الأحداث
 */

import {
  CreditCard,
  Building2,
  Package,
  Calendar,
  DollarSign,
  RefreshCw,
  Edit,
  PauseCircle,
  PlayCircle,
  XCircle,
  Eye,
  Activity,
  FileText,
  Receipt,
  ArrowUpCircle,
  CalendarCheck,
  Timer,
  Percent,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';

export const subscriptionConfig: SheetConfig = {
  docType: 'subscription',

  // Header
  title: (data) => data.subscription_code || data.id?.slice(0, 8).toUpperCase(),
  subtitle: (data) => data.tenant_name || data.tenant?.name,
  icon: CreditCard,
  iconBg: 'bg-gradient-to-br from-green-600 to-green-800',

  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
      active: { label: 'status.active', variant: 'success' },
      trial: { label: 'status.trial', variant: 'info' },
      pending: { label: 'status.pending', variant: 'warning' },
      paused: { label: 'status.paused', variant: 'warning' },
      cancelled: { label: 'status.cancelled', variant: 'default' },
      expired: { label: 'status.expired', variant: 'error' },
      past_due: { label: 'status.pastDue', variant: 'error' },
    };
    const status = statusMap[data?.status] || statusMap.pending;
    return {
      label: status.label,
      variant: status.variant,
    };
  },

  // Balance Display
  balance: {
    value: (data) => data.amount || data.price || 0,
    label: 'fields.subscriptionAmount',
    currency: undefined,
  },

  // Stats Cards
  stats: [
    {
      key: 'amount',
      label: 'stats.amount',
      icon: DollarSign,
      value: (data) => data.amount || data.price || 0,
      color: 'green',
      format: (value, data) => `${value.toLocaleString()} ${data?.currency || ''}`,
    },
    {
      key: 'days_remaining',
      label: 'stats.daysLeft',
      icon: Timer,
      value: (data) => {
        if (!data.end_date) return '-';
        const end = new Date(data.end_date);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
      },
      color: 'blue',
    },
    {
      key: 'billing_cycle',
      label: 'stats.billingCycle',
      icon: RefreshCw,
      value: (data) => data.billing_cycle,
      color: 'purple',
    },
    {
      key: 'renewals_count',
      label: 'stats.renewals',
      icon: CalendarCheck,
      value: (data) => data.renewals_count || data.renewals?.length || 0,
      color: 'gray',
    },
  ],

  // Info Fields
  infoFields: [
    // معلومات الاشتراك
    {
      key: 'subscription_code',
      label: 'fields.subscriptionCode',
      type: 'text'
    },
    {
      key: 'tenant_name',
      label: 'fields.subscriber',
      type: 'link',
      icon: Building2,
      link: (_value, data) => data.tenant_id ? { docType: 'tenant' as DocType, id: data.tenant_id } : null,
    },
    {
      key: 'plan_name',
      label: 'fields.plan',
      type: 'link',
      icon: Package,
      link: (_value, data) => data.plan_id ? { docType: 'plan' as DocType, id: data.plan_id } : null,
    },

    // الفترة
    {
      key: 'start_date',
      label: 'fields.startDate',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'end_date',
      label: 'fields.endDate',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'billing_cycle',
      label: 'fields.billingCycle',
      type: 'badge',
      icon: RefreshCw,
      badge: (value) => ({
        label: value === 'yearly' ? 'billingCycles.yearly' : value === 'monthly' ? 'billingCycles.monthly' : value,
        variant: 'default',
      }),
    },

    // التسعير
    {
      key: 'amount',
      label: 'fields.amount',
      type: 'currency',
      icon: DollarSign,
      currency: undefined,
    },
    {
      key: 'discount_percent',
      label: 'fields.discount',
      type: 'percentage',
      icon: Percent,
      hidden: (data) => !data.discount_percent,
    },
    {
      key: 'coupon_code',
      label: 'fields.coupon',
      type: 'link',
      link: (_value, data) => data.coupon_id ? { docType: 'coupon' as DocType, id: data.coupon_id } : null,
      hidden: (data) => !data.coupon_code,
    },

    // التجديد التلقائي
    {
      key: 'auto_renew',
      label: 'fields.autoRenew',
      type: 'badge',
      icon: RefreshCw,
      badge: (_value, data) => ({
        label: data.auto_renew ? 'status.enabled' : 'status.disabled',
        variant: data.auto_renew ? 'success' : 'default',
      }),
    },
    {
      key: 'next_billing_date',
      label: 'fields.nextBilling',
      type: 'date',
      icon: CalendarCheck,
      hidden: (data) => !data.auto_renew,
    },

    // معلومات إضافية
    {
      key: 'created_at',
      label: 'fields.created',
      type: 'date',
      icon: Calendar
    },
    {
      key: 'cancelled_at',
      label: 'fields.cancelledAt',
      type: 'date',
      hidden: (data) => !data.cancelled_at,
    },
    {
      key: 'cancellation_reason',
      label: 'fields.cancellationReason',
      type: 'text',
      hidden: (data) => !data.cancellation_reason,
    },
  ],

  // Tabs
  tabs: [
    {
      id: 'overview',
      label: 'tabs.overview',
      icon: Eye,
      component: OverviewTab,
    },
    {
      id: 'plan_details',
      label: 'tabs.planDetails',
      icon: Package,
      component: OverviewTab, // سيتم استبداله
    },
    {
      id: 'billing',
      label: 'tabs.billing',
      icon: Receipt,
      component: OverviewTab, // سيتم استبداله
    },
    {
      id: 'payments',
      label: 'tabs.payments',
      icon: DollarSign,
      component: PaymentsTab,
      badge: (data) => data.payments?.length || 0,
    },
    {
      id: 'invoices',
      label: 'tabs.invoices',
      icon: FileText,
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.invoices?.length || 0,
    },
    {
      id: 'renewals',
      label: 'tabs.renewals',
      icon: RefreshCw,
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.renewals?.length || 0,
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
      onClick: () => { },
    },
    {
      id: 'upgrade',
      label: 'actions.upgradePlan',
      icon: ArrowUpCircle,
      variant: 'default',
      show: (data) => data?.status === 'active',
      onClick: () => { },
    },
    {
      id: 'renew',
      label: 'actions.renewNow',
      icon: RefreshCw,
      variant: 'success',
      show: (data) => ['active', 'expired', 'past_due'].includes(data?.status),
      onClick: () => { },
    },
    {
      id: 'pause',
      label: 'actions.pause',
      icon: PauseCircle,
      variant: 'outline',
      show: (data) => data?.status === 'active',
      confirm: {
        title: 'dialogs.confirmPause',
        description: 'dialogs.pauseSubscriptionWarning',
      },
      onClick: () => { },
    },
    {
      id: 'resume',
      label: 'actions.resume',
      icon: PlayCircle,
      variant: 'success',
      show: (data) => data?.status === 'paused',
      onClick: () => { },
    },
    {
      id: 'cancel',
      label: 'actions.cancel',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => ['active', 'paused', 'trial'].includes(data?.status),
      confirm: {
        title: 'dialogs.confirmCancellation',
        description: 'dialogs.cancelSubscriptionWarning',
        confirmLabel: 'actions.cancelSubscription',
      },
      onClick: () => { },
    },
  ],

  // Sheet Settings
  width: 'lg',

  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'tenant') {
      return { docType: 'tenant', data: row };
    }
    if (rowDocType === 'plan') {
      return { docType: 'plan', data: row };
    }
    if (rowDocType === 'payment') {
      return { docType: 'payment', data: row };
    }
    if (rowDocType === 'invoice') {
      return { docType: 'invoice', data: row };
    }
    return null;
  },
};

export default subscriptionConfig;
