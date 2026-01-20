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
  Clock,
  DollarSign,
  RefreshCw,
  Edit,
  PauseCircle,
  PlayCircle,
  XCircle,
  Trash2,
  Eye,
  Book,
  Activity,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle,
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
      active: { label: 'نشط', variant: 'success' },
      trial: { label: 'تجريبي', variant: 'info' },
      pending: { label: 'معلق', variant: 'warning' },
      paused: { label: 'متوقف', variant: 'warning' },
      cancelled: { label: 'ملغي', variant: 'default' },
      expired: { label: 'منتهي', variant: 'error' },
      past_due: { label: 'متأخر', variant: 'error' },
    };
    const status = statusMap[data.status] || statusMap.pending;
    return {
      label: status.label,
      variant: status.variant,
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => data.amount || data.price || 0,
    label: 'Subscription Amount',
    labelAr: 'قيمة الاشتراك',
    currency: 'SAR',
  },
  
  // Stats Cards
  stats: [
    {
      key: 'amount',
      label: 'Amount',
      labelAr: 'القيمة',
      icon: DollarSign,
      value: (data) => data.amount || data.price || 0,
      color: 'green',
      format: (value) => `${value.toLocaleString()} SAR`,
    },
    {
      key: 'days_remaining',
      label: 'Days Left',
      labelAr: 'الأيام المتبقية',
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
      label: 'Billing Cycle',
      labelAr: 'دورة الفوترة',
      icon: RefreshCw,
      value: (data) => data.billing_cycle === 'yearly' ? 'سنوي' : 'شهري',
      color: 'purple',
    },
    {
      key: 'renewals_count',
      label: 'Renewals',
      labelAr: 'التجديدات',
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
      label: 'Subscription Code', 
      labelAr: 'كود الاشتراك', 
      type: 'text' 
    },
    { 
      key: 'tenant_name', 
      label: 'Subscriber', 
      labelAr: 'المشترك', 
      type: 'link',
      icon: Building2,
      link: (value, data) => data.tenant_id ? { docType: 'tenant' as DocType, id: data.tenant_id } : null,
    },
    { 
      key: 'plan_name', 
      label: 'Plan', 
      labelAr: 'الباقة', 
      type: 'link',
      icon: Package,
      link: (value, data) => data.plan_id ? { docType: 'plan' as DocType, id: data.plan_id } : null,
    },
    
    // الفترة
    { 
      key: 'start_date', 
      label: 'Start Date', 
      labelAr: 'تاريخ البداية', 
      type: 'date',
      icon: Calendar,
    },
    { 
      key: 'end_date', 
      label: 'End Date', 
      labelAr: 'تاريخ النهاية', 
      type: 'date',
      icon: Calendar,
    },
    { 
      key: 'billing_cycle', 
      label: 'Billing Cycle', 
      labelAr: 'دورة الفوترة', 
      type: 'badge',
      icon: RefreshCw,
      badge: (value) => ({
        label: value === 'yearly' ? 'سنوي' : value === 'monthly' ? 'شهري' : value,
        variant: 'default',
      }),
    },
    
    // التسعير
    { 
      key: 'amount', 
      label: 'Amount', 
      labelAr: 'القيمة', 
      type: 'currency',
      icon: DollarSign,
      currency: 'SAR',
    },
    { 
      key: 'discount_percent', 
      label: 'Discount', 
      labelAr: 'الخصم', 
      type: 'percentage',
      icon: Percent,
      hidden: (data) => !data.discount_percent,
    },
    { 
      key: 'coupon_code', 
      label: 'Coupon', 
      labelAr: 'كوبون الخصم', 
      type: 'link',
      link: (value, data) => data.coupon_id ? { docType: 'coupon' as DocType, id: data.coupon_id } : null,
      hidden: (data) => !data.coupon_code,
    },
    
    // التجديد التلقائي
    { 
      key: 'auto_renew', 
      label: 'Auto Renew', 
      labelAr: 'التجديد التلقائي', 
      type: 'badge',
      icon: RefreshCw,
      badge: (value) => ({
        label: value ? 'مفعل' : 'معطل',
        variant: value ? 'success' : 'default',
      }),
    },
    { 
      key: 'next_billing_date', 
      label: 'Next Billing', 
      labelAr: 'الفوترة القادمة', 
      type: 'date',
      icon: CalendarCheck,
      hidden: (data) => !data.auto_renew,
    },
    
    // معلومات إضافية
    { 
      key: 'created_at', 
      label: 'Created', 
      labelAr: 'تاريخ الإنشاء', 
      type: 'date', 
      icon: Calendar 
    },
    { 
      key: 'cancelled_at', 
      label: 'Cancelled', 
      labelAr: 'تاريخ الإلغاء', 
      type: 'date',
      hidden: (data) => !data.cancelled_at,
    },
    { 
      key: 'cancellation_reason', 
      label: 'Cancellation Reason', 
      labelAr: 'سبب الإلغاء', 
      type: 'text',
      hidden: (data) => !data.cancellation_reason,
    },
  ],
  
  // Tabs
  tabs: [
    { 
      id: 'overview', 
      label: 'Overview', 
      labelAr: 'نظرة عامة', 
      icon: Eye, 
      component: OverviewTab,
    },
    { 
      id: 'plan_details', 
      label: 'Plan Details', 
      labelAr: 'تفاصيل الباقة', 
      icon: Package, 
      component: OverviewTab, // سيتم استبداله
    },
    { 
      id: 'billing', 
      label: 'Billing', 
      labelAr: 'الفوترة', 
      icon: Receipt, 
      component: OverviewTab, // سيتم استبداله
    },
    { 
      id: 'payments', 
      label: 'Payments', 
      labelAr: 'المدفوعات', 
      icon: DollarSign, 
      component: PaymentsTab,
      badge: (data) => data.payments?.length || 0,
    },
    { 
      id: 'invoices', 
      label: 'Invoices', 
      labelAr: 'الفواتير', 
      icon: FileText, 
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.invoices?.length || 0,
    },
    { 
      id: 'renewals', 
      label: 'Renewals', 
      labelAr: 'التجديدات', 
      icon: RefreshCw, 
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.renewals?.length || 0,
    },
    { 
      id: 'activity', 
      label: 'Activity', 
      labelAr: 'السجل', 
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
      onClick: (data) => console.log('Edit subscription:', data.id),
    },
    {
      id: 'upgrade',
      label: 'Upgrade Plan',
      labelAr: 'ترقية الباقة',
      icon: ArrowUpCircle,
      variant: 'default',
      show: (data) => data.status === 'active',
      onClick: (data) => console.log('Upgrade subscription:', data.id),
    },
    {
      id: 'renew',
      label: 'Renew Now',
      labelAr: 'تجديد الآن',
      icon: RefreshCw,
      variant: 'success',
      show: (data) => ['active', 'expired', 'past_due'].includes(data.status),
      onClick: (data) => console.log('Renew subscription:', data.id),
    },
    {
      id: 'pause',
      label: 'Pause',
      labelAr: 'إيقاف مؤقت',
      icon: PauseCircle,
      variant: 'outline',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'Confirm Pause',
        titleAr: 'تأكيد الإيقاف',
        description: 'Are you sure you want to pause this subscription?',
        descriptionAr: 'هل أنت متأكد من إيقاف هذا الاشتراك مؤقتاً؟',
      },
      onClick: (data) => console.log('Pause subscription:', data.id),
    },
    {
      id: 'resume',
      label: 'Resume',
      labelAr: 'استئناف',
      icon: PlayCircle,
      variant: 'success',
      show: (data) => data.status === 'paused',
      onClick: (data) => console.log('Resume subscription:', data.id),
    },
    {
      id: 'cancel',
      label: 'Cancel',
      labelAr: 'إلغاء',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => ['active', 'paused', 'trial'].includes(data.status),
      confirm: {
        title: 'Confirm Cancellation',
        titleAr: 'تأكيد الإلغاء',
        description: 'Are you sure you want to cancel this subscription? This action may result in immediate loss of access.',
        descriptionAr: 'هل أنت متأكد من إلغاء هذا الاشتراك؟ قد يؤدي هذا إلى فقدان الوصول فوراً.',
        confirmLabel: 'Cancel Subscription',
        confirmLabelAr: 'إلغاء الاشتراك',
      },
      onClick: (data) => console.log('Cancel subscription:', data.id),
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
