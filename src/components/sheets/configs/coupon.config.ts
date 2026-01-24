/**
 * Coupon Sheet Configuration
 * إعدادات شيت الكوبون
 * 
 * التبويبات:
 * 1. نظرة عامة (Overview) - معلومات الكوبون الأساسية
 * 2. الاستخدامات (Usage) - سجل استخدام الكوبون
 * 3. القيود (Restrictions) - شروط وقيود الاستخدام
 * 4. الإحصائيات (Statistics) - إحصائيات الكوبون
 * 5. السجل (Activity) - سجل الأحداث
 */

import {
  Ticket,
  Percent,
  DollarSign,
  Calendar,
  Clock,
  Users,
  Package,
  CheckCircle,
  XCircle,
  Edit,
  Copy,
  Eye,
  Activity,
  BarChart3,
  Shield,
  Tag,
  Target,
  TrendingUp,
  Hash,
} from 'lucide-react';
import { type SheetConfig } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

export const couponConfig: SheetConfig = {
  docType: 'coupon',
  
  // Header
  title: (data) => data.code || data.name,
  subtitle: (data) => data.description || data.description_ar,
  icon: Ticket,
  iconBg: 'bg-gradient-to-br from-pink-600 to-pink-800',
  
  // Status Badge
  badge: (data) => {
    // تحقق من انتهاء الصلاحية
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { label: 'status.expired', variant: 'error' };
    }
    // تحقق من استنفاد الاستخدامات
    if (data.max_uses && data.uses_count >= data.max_uses) {
      return { label: 'status.exhausted', variant: 'warning' };
    }
    
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'status.active', variant: 'success' },
      inactive: { label: 'status.inactive', variant: 'default' },
      expired: { label: 'status.expired', variant: 'error' },
      exhausted: { label: 'status.exhausted', variant: 'warning' },
    };
    const status = statusMap[data.status] || statusMap['inactive'];
    return {
      label: status.label,
      variant: status.variant,
    };
  },
  
  // Stats Cards
  stats: [
    {
      key: 'discount_value',
      label: 'stats.discountValue',
      icon: Percent,
      value: (data) => data.discount_type === 'percentage' 
        ? `${data.discount_value}%` 
        : data.discount_value,
      color: 'green',
      format: (value, data) => data.discount_type === 'percentage' 
        ? `${value}%` 
        : `${Number(value).toLocaleString()} SAR`,
    },
    {
      key: 'uses_count',
      label: 'stats.uses',
      icon: Users,
      value: (data) => data.uses_count || 0,
      color: 'blue',
    },
    {
      key: 'remaining_uses',
      label: 'stats.remaining',
      icon: Target,
      value: (data) => data.max_uses ? (data.max_uses - (data.uses_count || 0)) : '∞',
      color: 'purple',
    },
    {
      key: 'total_savings',
      label: 'stats.totalSavings',
      icon: TrendingUp,
      value: (data) => data.total_discount_given || 0,
      color: 'gray',
      format: (value) => `${Number(value).toLocaleString()} SAR`,
    },
  ],
  
  // Info Fields
  infoFields: [
    // معلومات الكوبون
    { 
      key: 'code', 
      label: 'fields.couponCode', 
      type: 'text',
      icon: Hash,
    },
    { 
      key: 'name', 
      label: 'fields.name', 
      type: 'text',
      format: (value, data) => data.name_ar || value || '-',
    },
    { 
      key: 'description', 
      label: 'fields.description', 
      type: 'text',
      format: (value, data) => data.description_ar || value || '-',
    },
    
    // نوع وقيمة الخصم
    { 
      key: 'discount_type', 
      label: 'fields.discountType', 
      type: 'badge',
      icon: Tag,
      badge: (value) => ({
        label: value === 'percentage' ? 'discountTypes.percentage' : 'discountTypes.fixed',
        variant: value === 'percentage' ? 'info' : 'default',
      }),
    },
    { 
      key: 'discount_value', 
      label: 'fields.discountValue', 
      type: 'text',
      icon: Percent,
      format: (value, data) => data.discount_type === 'percentage' 
        ? `${value}%` 
        : `${Number(value).toLocaleString()} SAR`,
    },
    { 
      key: 'max_discount', 
      label: 'fields.maxDiscount', 
      type: 'currency',
      icon: DollarSign,
      hidden: (data) => !data.max_discount || data.discount_type !== 'percentage',
    },
    { 
      key: 'min_purchase', 
      label: 'fields.minPurchase', 
      type: 'currency',
      icon: DollarSign,
      hidden: (data) => !data.min_purchase,
    },
    
    // حدود الاستخدام
    { 
      key: 'max_uses', 
      label: 'fields.maxUses', 
      type: 'text',
      icon: Target,
      format: (value) => value || '∞',
    },
    { 
      key: 'max_uses_per_user', 
      label: 'fields.maxUsesPerUser', 
      type: 'number',
      format: (value) => value || '1',
    },
    { 
      key: 'uses_count', 
      label: 'fields.totalUses', 
      type: 'number',
      icon: Users,
    },
    
    // الفترة
    { 
      key: 'starts_at', 
      label: 'fields.startDate', 
      type: 'date',
      icon: Calendar,
    },
    { 
      key: 'expires_at', 
      label: 'fields.expiryDate', 
      type: 'date',
      icon: Clock,
    },
    
    // القيود
    { 
      key: 'applicable_plans', 
      label: 'fields.applicablePlans', 
      type: 'text',
      icon: Package,
      format: (value) => {
        if (!value || value.length === 0) return '-';
        if (Array.isArray(value)) return value.join(', ');
        return value;
      },
    },
    { 
      key: 'first_subscription_only', 
      label: 'fields.firstSubscriptionOnly', 
      type: 'badge',
      badge: (value) => value ? { label: 'common.yes', variant: 'warning' } : null,
    },
    
    // معلومات إضافية
    { 
      key: 'created_by', 
      label: 'fields.createdBy', 
      type: 'text' 
    },
    { 
      key: 'created_at', 
      label: 'fields.created', 
      type: 'date', 
      icon: Calendar 
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
      id: 'usage', 
      label: 'tabs.usageHistory', 
      icon: Users, 
      component: OverviewTab, // سيتم استبداله بـ CouponUsageTab
      badge: (data) => data.uses_count || 0,
    },
    { 
      id: 'restrictions', 
      label: 'tabs.restrictions', 
      icon: Shield, 
      component: OverviewTab, // سيتم استبداله
    },
    { 
      id: 'statistics', 
      label: 'tabs.statistics', 
      icon: BarChart3, 
      component: OverviewTab, // سيتم استبداله
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
      onClick: () => {},
    },
    {
      id: 'duplicate',
      label: 'actions.duplicate',
      icon: Copy,
      variant: 'outline',
      onClick: () => {},
    },
    {
      id: 'deactivate',
      label: 'actions.deactivate',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'dialogs.confirmDeactivation',
        description: 'dialogs.deactivateCouponWarning',
      },
      onClick: () => {},
    },
    {
      id: 'activate',
      label: 'actions.activate',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status !== 'active' && data.status !== 'expired',
      onClick: () => {},
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'tenant') {
      return { docType: 'tenant', data: row };
    }
    if (rowDocType === 'subscription') {
      return { docType: 'subscription', data: row };
    }
    return null;
  },
};

export default couponConfig;
