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
  AlertTriangle,
  Infinity,
  Hash,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

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
      return { label: 'منتهي الصلاحية', variant: 'error' };
    }
    // تحقق من استنفاد الاستخدامات
    if (data.max_uses && data.uses_count >= data.max_uses) {
      return { label: 'مستنفد', variant: 'warning' };
    }
    
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'نشط', variant: 'success' },
      inactive: { label: 'غير نشط', variant: 'default' },
      expired: { label: 'منتهي', variant: 'error' },
      exhausted: { label: 'مستنفد', variant: 'warning' },
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
      label: 'Discount',
      labelAr: 'قيمة الخصم',
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
      label: 'Uses',
      labelAr: 'الاستخدامات',
      icon: Users,
      value: (data) => data.uses_count || 0,
      color: 'blue',
    },
    {
      key: 'remaining_uses',
      label: 'Remaining',
      labelAr: 'المتبقي',
      icon: Target,
      value: (data) => data.max_uses ? (data.max_uses - (data.uses_count || 0)) : '∞',
      color: 'purple',
    },
    {
      key: 'total_savings',
      label: 'Total Savings',
      labelAr: 'إجمالي التوفير',
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
      label: 'Coupon Code', 
      labelAr: 'كود الكوبون', 
      type: 'text',
      icon: Hash,
    },
    { 
      key: 'name', 
      label: 'Name', 
      labelAr: 'الاسم', 
      type: 'text',
      format: (value, data) => data.name_ar || value || '-',
    },
    { 
      key: 'description', 
      label: 'Description', 
      labelAr: 'الوصف', 
      type: 'text',
      format: (value, data) => data.description_ar || value || '-',
    },
    
    // نوع وقيمة الخصم
    { 
      key: 'discount_type', 
      label: 'Discount Type', 
      labelAr: 'نوع الخصم', 
      type: 'badge',
      icon: Tag,
      badge: (value) => ({
        label: value === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت',
        variant: value === 'percentage' ? 'info' : 'default',
      }),
    },
    { 
      key: 'discount_value', 
      label: 'Discount Value', 
      labelAr: 'قيمة الخصم', 
      type: 'text',
      icon: Percent,
      format: (value, data) => data.discount_type === 'percentage' 
        ? `${value}%` 
        : `${Number(value).toLocaleString()} SAR`,
    },
    { 
      key: 'max_discount', 
      label: 'Max Discount', 
      labelAr: 'الحد الأقصى للخصم', 
      type: 'currency',
      icon: DollarSign,
      hidden: (data) => !data.max_discount || data.discount_type !== 'percentage',
    },
    { 
      key: 'min_purchase', 
      label: 'Min Purchase', 
      labelAr: 'الحد الأدنى للشراء', 
      type: 'currency',
      icon: DollarSign,
      hidden: (data) => !data.min_purchase,
    },
    
    // حدود الاستخدام
    { 
      key: 'max_uses', 
      label: 'Max Uses', 
      labelAr: 'الحد الأقصى للاستخدام', 
      type: 'text',
      icon: Target,
      format: (value) => value || '∞ (غير محدود)',
    },
    { 
      key: 'max_uses_per_user', 
      label: 'Max Uses Per User', 
      labelAr: 'الاستخدام لكل مستخدم', 
      type: 'number',
      format: (value) => value || '1',
    },
    { 
      key: 'uses_count', 
      label: 'Total Uses', 
      labelAr: 'إجمالي الاستخدامات', 
      type: 'number',
      icon: Users,
    },
    
    // الفترة
    { 
      key: 'starts_at', 
      label: 'Start Date', 
      labelAr: 'تاريخ البداية', 
      type: 'date',
      icon: Calendar,
    },
    { 
      key: 'expires_at', 
      label: 'Expiry Date', 
      labelAr: 'تاريخ الانتهاء', 
      type: 'date',
      icon: Clock,
    },
    
    // القيود
    { 
      key: 'applicable_plans', 
      label: 'Applicable Plans', 
      labelAr: 'الباقات المطبقة', 
      type: 'text',
      icon: Package,
      format: (value) => {
        if (!value || value.length === 0) return 'جميع الباقات';
        if (Array.isArray(value)) return value.join(', ');
        return value;
      },
    },
    { 
      key: 'first_subscription_only', 
      label: 'First Subscription Only', 
      labelAr: 'للاشتراك الأول فقط', 
      type: 'badge',
      badge: (value) => value ? { label: 'نعم', variant: 'warning' } : null,
    },
    
    // معلومات إضافية
    { 
      key: 'created_by', 
      label: 'Created By', 
      labelAr: 'أنشأ بواسطة', 
      type: 'text' 
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      labelAr: 'تاريخ الإنشاء', 
      type: 'date', 
      icon: Calendar 
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
      id: 'usage', 
      label: 'Usage History', 
      labelAr: 'سجل الاستخدام', 
      icon: Users, 
      component: OverviewTab, // سيتم استبداله بـ CouponUsageTab
      badge: (data) => data.uses_count || 0,
    },
    { 
      id: 'restrictions', 
      label: 'Restrictions', 
      labelAr: 'القيود', 
      icon: Shield, 
      component: OverviewTab, // سيتم استبداله
    },
    { 
      id: 'statistics', 
      label: 'Statistics', 
      labelAr: 'الإحصائيات', 
      icon: BarChart3, 
      component: OverviewTab, // سيتم استبداله
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
      onClick: (data) => console.log('Edit coupon:', data.id),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      labelAr: 'نسخ',
      icon: Copy,
      variant: 'outline',
      onClick: (data) => console.log('Duplicate coupon:', data.id),
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      labelAr: 'تعطيل',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'Confirm Deactivation',
        titleAr: 'تأكيد التعطيل',
        description: 'Are you sure you want to deactivate this coupon? It will no longer be usable.',
        descriptionAr: 'هل أنت متأكد من تعطيل هذا الكوبون؟ لن يكون قابلاً للاستخدام.',
      },
      onClick: (data) => console.log('Deactivate coupon:', data.id),
    },
    {
      id: 'activate',
      label: 'Activate',
      labelAr: 'تفعيل',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status !== 'active' && data.status !== 'expired',
      onClick: (data) => console.log('Activate coupon:', data.id),
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
