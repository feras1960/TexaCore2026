/**
 * Plan Sheet Configuration
 * إعدادات شيت الباقة
 * 
 * التبويبات:
 * 1. نظرة عامة (Overview) - معلومات الباقة الأساسية والتسعير
 * 2. الوحدات (Modules) - الموديولات المتاحة في الباقة
 * 3. الحدود (Limits) - التخزين، المستخدمين، الشركات
 * 4. المشتركين (Subscribers) - قائمة المشتركين بهذه الباقة
 * 5. المدفوعات (Payments) - الدفعات المرتبطة بالباقة
 * 6. التحليلات (Analytics) - إحصائيات وتحليلات الباقة
 * 7. السجل (Activity) - سجل الأحداث والتغييرات
 */

import {
  Package,
  Users,
  Building2,
  HardDrive,
  Boxes,
  DollarSign,
  Calendar,
  Star,
  Edit,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  Book,
  Activity,
  TrendingUp,
  BarChart3,
  Settings,
  Sparkles,
  Clock,
  Percent,
  Globe,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';

// سيتم إنشاء هذه التبويبات لاحقاً
// import { PlanModulesTab } from '../tabs/plan/PlanModulesTab';
// import { PlanLimitsTab } from '../tabs/plan/PlanLimitsTab';
// import { PlanSubscribersTab } from '../tabs/plan/PlanSubscribersTab';
// import { PlanAnalyticsTab } from '../tabs/plan/PlanAnalyticsTab';

export const planConfig: SheetConfig = {
  docType: 'plan',
  
  // Header
  title: (data) => data.name_ar || data.name,
  subtitle: (data) => data.code?.toUpperCase(),
  icon: Package,
  iconBg: 'bg-gradient-to-br from-indigo-600 to-indigo-800',
  
  // Status Badge
  badge: (data) => {
    if (data.is_popular) {
      return {
        label: 'الأكثر طلباً',
        variant: 'info',
        icon: Sparkles,
      };
    }
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      true: { label: 'نشط', variant: 'success' },
      false: { label: 'غير نشط', variant: 'default' },
    };
    const status = statusMap[String(data.is_active)] || statusMap['false'];
    return {
      label: status.label,
      variant: status.variant,
    };
  },
  
  // Stats Cards
  stats: [
    {
      key: 'price_monthly',
      label: 'Monthly Price',
      labelAr: 'السعر الشهري',
      icon: DollarSign,
      value: (data) => data.price_monthly || 0,
      color: 'green',
      format: (value, data) => `${value.toLocaleString()} ${data?.currency || 'SAR'}`,
    },
    {
      key: 'subscribers_count',
      label: 'Subscribers',
      labelAr: 'المشتركين',
      icon: Users,
      value: (data) => data.subscribers_count || data.subscribers?.length || 0,
      color: 'blue',
    },
    {
      key: 'monthly_revenue',
      label: 'Monthly Revenue',
      labelAr: 'الإيراد الشهري',
      icon: TrendingUp,
      value: (data) => data.monthly_revenue || (data.price_monthly * (data.subscribers_count || 0)),
      color: 'purple',
      format: (value) => `${value.toLocaleString()}`,
    },
    {
      key: 'modules_count',
      label: 'Modules',
      labelAr: 'الوحدات',
      icon: Boxes,
      value: (data) => data.modules?.length || 0,
      color: 'gray',
    },
  ],
  
  // Info Fields - المعلومات الأساسية
  infoFields: [
    // معلومات الباقة
    { 
      key: 'code', 
      label: 'Plan Code', 
      labelAr: 'كود الباقة', 
      type: 'text' 
    },
    { 
      key: 'description', 
      label: 'Description', 
      labelAr: 'الوصف', 
      type: 'text',
      format: (value, data) => data.description_ar || value || '-',
    },
    
    // التسعير
    { 
      key: 'price_monthly', 
      label: 'Monthly Price', 
      labelAr: 'السعر الشهري', 
      type: 'currency',
      icon: DollarSign,
      currency: 'SAR',
    },
    { 
      key: 'price_yearly', 
      label: 'Yearly Price', 
      labelAr: 'السعر السنوي', 
      type: 'currency',
      icon: DollarSign,
      currency: 'SAR',
    },
    { 
      key: 'currency', 
      label: 'Currency', 
      labelAr: 'العملة', 
      type: 'badge',
      icon: Globe,
    },
    
    // الحدود
    { 
      key: 'max_users', 
      label: 'Max Users', 
      labelAr: 'الحد الأقصى للمستخدمين', 
      type: 'number',
      icon: Users,
    },
    { 
      key: 'max_companies', 
      label: 'Max Companies', 
      labelAr: 'الحد الأقصى للشركات', 
      type: 'number',
      icon: Building2,
    },
    { 
      key: 'max_storage_gb', 
      label: 'Max Storage', 
      labelAr: 'الحد الأقصى للتخزين', 
      type: 'text',
      icon: HardDrive,
      format: (value) => `${value || 0} GB`,
    },
    
    // معلومات إضافية
    { 
      key: 'trial_days', 
      label: 'Trial Days', 
      labelAr: 'أيام التجربة', 
      type: 'number',
      icon: Clock,
    },
    { 
      key: 'is_active', 
      label: 'Status', 
      labelAr: 'الحالة', 
      type: 'badge',
      badge: (value) => ({
        label: value ? 'نشط' : 'غير نشط',
        variant: value ? 'success' : 'default',
      }),
    },
    { 
      key: 'is_popular', 
      label: 'Popular', 
      labelAr: 'مميز', 
      type: 'badge',
      icon: Star,
      badge: (value) => value ? { label: 'الأكثر طلباً', variant: 'info' } : null,
    },
    { 
      key: 'sort_order', 
      label: 'Sort Order', 
      labelAr: 'ترتيب العرض', 
      type: 'number' 
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      labelAr: 'تاريخ الإنشاء', 
      type: 'date', 
      icon: Calendar 
    },
    { 
      key: 'updated_at', 
      label: 'Updated', 
      labelAr: 'آخر تحديث', 
      type: 'date' 
    },
  ],
  
  // Tabs - التبويبات
  tabs: [
    { 
      id: 'overview', 
      label: 'Overview', 
      labelAr: 'نظرة عامة', 
      icon: Eye, 
      component: OverviewTab,
    },
    { 
      id: 'modules', 
      label: 'Modules', 
      labelAr: 'الوحدات', 
      icon: Boxes, 
      component: OverviewTab, // سيتم استبداله بـ PlanModulesTab
      badge: (data) => data.modules?.length || 0,
    },
    { 
      id: 'limits', 
      label: 'Limits & Features', 
      labelAr: 'الحدود والميزات', 
      icon: Settings, 
      component: OverviewTab, // سيتم استبداله بـ PlanLimitsTab
      badge: (data) => data.features?.length || 0,
    },
    { 
      id: 'subscribers', 
      label: 'Subscribers', 
      labelAr: 'المشتركين', 
      icon: Users, 
      component: OverviewTab, // سيتم استبداله بـ PlanSubscribersTab
      badge: (data) => data.subscribers_count || data.subscribers?.length || 0,
    },
    { 
      id: 'payments', 
      label: 'Payments', 
      labelAr: 'المدفوعات', 
      icon: DollarSign, 
      component: PaymentsTab,
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      labelAr: 'التحليلات', 
      icon: BarChart3, 
      component: OverviewTab, // سيتم استبداله بـ PlanAnalyticsTab
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
  
  // Actions - الإجراءات
  actions: [
    {
      id: 'edit',
      label: 'Edit',
      labelAr: 'تعديل',
      icon: Edit,
      variant: 'outline',
      onClick: (data) => console.log('Edit plan:', data.id),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      labelAr: 'نسخ',
      icon: Copy,
      variant: 'outline',
      onClick: (data) => console.log('Duplicate plan:', data.id),
    },
    {
      id: 'set_popular',
      label: 'Set as Popular',
      labelAr: 'تعيين كمميز',
      icon: Star,
      variant: 'outline',
      show: (data) => !data.is_popular,
      onClick: (data) => console.log('Set popular:', data.id),
    },
    {
      id: 'remove_popular',
      label: 'Remove Popular',
      labelAr: 'إزالة التميز',
      icon: Star,
      variant: 'ghost',
      show: (data) => data.is_popular,
      onClick: (data) => console.log('Remove popular:', data.id),
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      labelAr: 'تعطيل',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.is_active,
      confirm: {
        title: 'Confirm Deactivation',
        titleAr: 'تأكيد التعطيل',
        description: 'Are you sure you want to deactivate this plan? Existing subscribers will not be affected.',
        descriptionAr: 'هل أنت متأكد من تعطيل هذه الباقة؟ المشتركون الحاليون لن يتأثروا.',
      },
      onClick: (data) => console.log('Deactivate plan:', data.id),
    },
    {
      id: 'activate',
      label: 'Activate',
      labelAr: 'تفعيل',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => !data.is_active,
      onClick: (data) => console.log('Activate plan:', data.id),
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
    if (rowDocType === 'payment') {
      return { docType: 'payment', data: row };
    }
    return null;
  },
};

export default planConfig;
