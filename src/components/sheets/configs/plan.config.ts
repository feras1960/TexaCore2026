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
  Activity,
  TrendingUp,
  BarChart3,
  Settings,
  Sparkles,
  Clock,
  Globe,
} from 'lucide-react';
import { type SheetConfig } from './sheet.types';

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
        label: 'plans.mostPopular',
        variant: 'info',
        icon: Sparkles,
      };
    }
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      true: { label: 'common.active', variant: 'success' },
      false: { label: 'common.inactive', variant: 'default' },
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
      label: 'plans.monthlyPrice',
      icon: DollarSign,
      value: (data) => data.price_monthly || 0,
      color: 'green',
      format: (value, data) => `${value.toLocaleString()} ${data?.currency || 'SAR'}`,
    },
    {
      key: 'subscribers_count',
      label: 'plans.subscribers',
      icon: Users,
      value: (data) => data.subscribers_count || data.subscribers?.length || 0,
      color: 'blue',
    },
    {
      key: 'monthly_revenue',
      label: 'plans.monthlyRevenue',
      icon: TrendingUp,
      value: (data) => data.monthly_revenue || (data.price_monthly * (data.subscribers_count || 0)),
      color: 'purple',
      format: (value) => `${value.toLocaleString()}`,
    },
    {
      key: 'modules_count',
      label: 'common.modules',
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
      label: 'plans.planCode', 
      type: 'text' 
    },
    { 
      key: 'description', 
      label: 'common.description', 
      type: 'text',
      format: (value, data) => data.description_ar || value || '-',
    },
    
    // التسعير
    { 
      key: 'price_monthly', 
      label: 'plans.monthlyPrice', 
      type: 'currency',
      icon: DollarSign,
      currency: 'SAR',
    },
    { 
      key: 'price_yearly', 
      label: 'plans.yearlyPrice', 
      type: 'currency',
      icon: DollarSign,
      currency: 'SAR',
    },
    { 
      key: 'currency', 
      label: 'common.currency', 
      type: 'badge',
      icon: Globe,
    },
    
    // الحدود
    { 
      key: 'max_users', 
      label: 'plans.maxUsers', 
      type: 'number',
      icon: Users,
    },
    { 
      key: 'max_companies', 
      label: 'plans.maxCompanies', 
      type: 'number',
      icon: Building2,
    },
    { 
      key: 'max_storage_gb', 
      label: 'plans.maxStorage', 
      type: 'text',
      icon: HardDrive,
      format: (value) => `${value || 0} GB`,
    },
    
    // معلومات إضافية
    { 
      key: 'trial_days', 
      label: 'plans.trialDays', 
      type: 'number',
      icon: Clock,
    },
    { 
      key: 'is_active', 
      label: 'common.status', 
      type: 'badge',
      badge: (value) => ({
        label: value ? 'common.active' : 'common.inactive',
        variant: value ? 'success' : 'default',
      }),
    },
    { 
      key: 'is_popular', 
      label: 'plans.popular', 
      type: 'badge',
      icon: Star,
      badge: (value) => value ? { label: 'plans.mostPopular', variant: 'info' } : null,
    },
    { 
      key: 'sort_order', 
      label: 'plans.sortOrder', 
      type: 'number' 
    },
    { 
      key: 'created_at', 
      label: 'common.created', 
      type: 'date', 
      icon: Calendar 
    },
    { 
      key: 'updated_at', 
      label: 'common.updated', 
      type: 'date' 
    },
  ],
  
  // Tabs - التبويبات
  tabs: [
    { 
      id: 'overview', 
      label: 'tabs.overview', 
      icon: Eye, 
      component: OverviewTab,
    },
    { 
      id: 'modules', 
      label: 'tabs.modules', 
      icon: Boxes, 
      component: OverviewTab, // سيتم استبداله بـ PlanModulesTab
      badge: (data) => data.modules?.length || 0,
    },
    { 
      id: 'limits', 
      label: 'tabs.limitsFeatures', 
      icon: Settings, 
      component: OverviewTab, // سيتم استبداله بـ PlanLimitsTab
      badge: (data) => data.features?.length || 0,
    },
    { 
      id: 'subscribers', 
      label: 'tabs.subscribers', 
      icon: Users, 
      component: OverviewTab, // سيتم استبداله بـ PlanSubscribersTab
      badge: (data) => data.subscribers_count || data.subscribers?.length || 0,
    },
    { 
      id: 'payments', 
      label: 'tabs.payments', 
      icon: DollarSign, 
      component: PaymentsTab,
    },
    { 
      id: 'analytics', 
      label: 'tabs.analytics', 
      icon: BarChart3, 
      component: OverviewTab, // سيتم استبداله بـ PlanAnalyticsTab
    },
    { 
      id: 'activity', 
      label: 'tabs.activity', 
      icon: Activity, 
      component: ActivityTab,
    },
  ],
  defaultTab: 'overview',
  
  // Actions - الإجراءات
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
      id: 'set_popular',
      label: 'actions.setAsPopular',
      icon: Star,
      variant: 'outline',
      show: (data) => !data.is_popular,
      onClick: () => {},
    },
    {
      id: 'remove_popular',
      label: 'actions.removePopular',
      icon: Star,
      variant: 'ghost',
      show: (data) => data.is_popular,
      onClick: () => {},
    },
    {
      id: 'deactivate',
      label: 'actions.deactivate',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.is_active,
      confirm: {
        title: 'dialogs.confirmDeactivation',
        description: 'dialogs.deactivatePlanWarning',
      },
      onClick: () => {},
    },
    {
      id: 'activate',
      label: 'actions.activate',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => !data.is_active,
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
    if (rowDocType === 'payment') {
      return { docType: 'payment', data: row };
    }
    return null;
  },
};

export default planConfig;
