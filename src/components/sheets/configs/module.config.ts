/**
 * Module Sheet Configuration
 * إعدادات شيت الوحدة/الموديول
 * 
 * التبويبات:
 * 1. نظرة عامة (Overview) - معلومات الوحدة الأساسية
 * 2. الميزات (Features) - قائمة الميزات في الوحدة
 * 3. الباقات (Plans) - الباقات التي تتضمن هذه الوحدة
 * 4. المشتركين (Subscribers) - المشتركين الذين يستخدمون الوحدة
 * 5. التكامل (Integration) - إعدادات التكامل
 * 6. الإحصائيات (Analytics) - إحصائيات الاستخدام
 * 7. السجل (Activity) - سجل الأحداث
 */

import {
  Boxes,
  Package,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Activity,
  BarChart3,
  Settings,
  Puzzle,
  Star,
  Layers,
  Code,
  FileText,
  Lock,
  Unlock,
  TrendingUp,
  Calendar,
  Tag,
  Globe,
  Zap,
  Shield,
  Link2,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

// أيقونات الوحدات
const MODULE_ICONS: Record<string, any> = {
  accounting: FileText,
  inventory: Package,
  sales: TrendingUp,
  purchases: Package,
  hr: Users,
  crm: Users,
  manufacturing: Settings,
  pos: Zap,
  ecommerce: Globe,
  reports: BarChart3,
  ai: Star,
};

export const moduleConfig: SheetConfig = {
  docType: 'module',
  
  // Header
  title: (data) => data.name_ar || data.name,
  subtitle: (data) => data.code?.toUpperCase(),
  icon: Boxes,
  iconBg: 'bg-gradient-to-br from-cyan-600 to-cyan-800',
  
  // Status Badge
  badge: (data) => {
    if (data.is_core) {
      return { label: 'أساسي', variant: 'info', icon: Shield };
    }
    if (data.is_addon) {
      return { label: 'إضافة', variant: 'warning', icon: Puzzle };
    }
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'نشط', variant: 'success' },
      inactive: { label: 'غير نشط', variant: 'default' },
      beta: { label: 'تجريبي', variant: 'warning' },
      deprecated: { label: 'متقادم', variant: 'error' },
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
      key: 'subscribers_count',
      label: 'Active Users',
      labelAr: 'المستخدمين النشطين',
      icon: Users,
      value: (data) => data.subscribers_count || data.active_users || 0,
      color: 'blue',
    },
    {
      key: 'plans_count',
      label: 'In Plans',
      labelAr: 'في الباقات',
      icon: Package,
      value: (data) => data.plans_count || data.included_in_plans?.length || 0,
      color: 'purple',
    },
    {
      key: 'features_count',
      label: 'Features',
      labelAr: 'الميزات',
      icon: Star,
      value: (data) => data.features?.length || 0,
      color: 'green',
    },
    {
      key: 'addon_price',
      label: 'Addon Price',
      labelAr: 'سعر الإضافة',
      icon: Tag,
      value: (data) => data.addon_price || 0,
      color: 'gray',
      format: (value) => value > 0 ? `${Number(value).toLocaleString()} SAR` : 'مجاني',
    },
  ],
  
  // Info Fields
  infoFields: [
    // معلومات الوحدة
    { 
      key: 'code', 
      label: 'Module Code', 
      labelAr: 'كود الوحدة', 
      type: 'text',
      icon: Code,
    },
    { 
      key: 'name', 
      label: 'Name (EN)', 
      labelAr: 'الاسم (إنجليزي)', 
      type: 'text' 
    },
    { 
      key: 'name_ar', 
      label: 'Name (AR)', 
      labelAr: 'الاسم (عربي)', 
      type: 'text' 
    },
    { 
      key: 'description', 
      label: 'Description', 
      labelAr: 'الوصف', 
      type: 'text',
      format: (value, data) => data.description_ar || value || '-',
    },
    
    // التصنيف
    { 
      key: 'category', 
      label: 'Category', 
      labelAr: 'التصنيف', 
      type: 'badge',
      icon: Layers,
      badge: (value) => ({
        label: value || 'عام',
        variant: 'default',
      }),
    },
    { 
      key: 'is_core', 
      label: 'Core Module', 
      labelAr: 'وحدة أساسية', 
      type: 'badge',
      icon: Shield,
      badge: (value) => value ? { label: 'نعم - متاح في جميع الباقات', variant: 'info' } : null,
    },
    { 
      key: 'is_addon', 
      label: 'Addon', 
      labelAr: 'إضافة اختيارية', 
      type: 'badge',
      icon: Puzzle,
      badge: (value) => value ? { label: 'نعم - يمكن شراؤها بشكل منفصل', variant: 'warning' } : null,
    },
    
    // التسعير (للإضافات)
    { 
      key: 'addon_price', 
      label: 'Addon Price', 
      labelAr: 'سعر الإضافة', 
      type: 'currency',
      icon: Tag,
      hidden: (data) => !data.is_addon,
    },
    { 
      key: 'addon_billing_cycle', 
      label: 'Billing Cycle', 
      labelAr: 'دورة الفوترة', 
      type: 'badge',
      hidden: (data) => !data.is_addon,
      badge: (value) => ({
        label: value === 'yearly' ? 'سنوي' : value === 'monthly' ? 'شهري' : 'مرة واحدة',
        variant: 'default',
      }),
    },
    
    // التكامل
    { 
      key: 'dependencies', 
      label: 'Dependencies', 
      labelAr: 'يعتمد على', 
      type: 'text',
      icon: Link2,
      format: (value) => {
        if (!value || value.length === 0) return 'لا يوجد';
        if (Array.isArray(value)) return value.join(', ');
        return value;
      },
    },
    { 
      key: 'api_endpoint', 
      label: 'API Endpoint', 
      labelAr: 'نقطة API', 
      type: 'text',
      icon: Code,
      hidden: (data) => !data.api_endpoint,
    },
    
    // حالة الوحدة
    { 
      key: 'status', 
      label: 'Status', 
      labelAr: 'الحالة', 
      type: 'badge',
      badge: (value) => {
        const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
          active: { label: 'نشط', variant: 'success' },
          inactive: { label: 'غير نشط', variant: 'default' },
          beta: { label: 'تجريبي', variant: 'warning' },
          deprecated: { label: 'متقادم', variant: 'error' },
        };
        return map[value] || map['inactive'];
      },
    },
    { 
      key: 'version', 
      label: 'Version', 
      labelAr: 'الإصدار', 
      type: 'text' 
    },
    { 
      key: 'release_date', 
      label: 'Release Date', 
      labelAr: 'تاريخ الإصدار', 
      type: 'date', 
      icon: Calendar 
    },
    
    // معلومات إضافية
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
      id: 'features', 
      label: 'Features', 
      labelAr: 'الميزات', 
      icon: Star, 
      component: OverviewTab, // سيتم استبداله بـ ModuleFeaturesTab
      badge: (data) => data.features?.length || 0,
    },
    { 
      id: 'plans', 
      label: 'Plans', 
      labelAr: 'الباقات', 
      icon: Package, 
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.plans_count || data.included_in_plans?.length || 0,
    },
    { 
      id: 'subscribers', 
      label: 'Users', 
      labelAr: 'المستخدمين', 
      icon: Users, 
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.subscribers_count || 0,
    },
    { 
      id: 'integration', 
      label: 'Integration', 
      labelAr: 'التكامل', 
      icon: Link2, 
      component: OverviewTab, // سيتم استبداله
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
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
      onClick: (data) => console.log('Edit module:', data.id),
    },
    {
      id: 'configure',
      label: 'Configure',
      labelAr: 'إعدادات',
      icon: Settings,
      variant: 'outline',
      onClick: (data) => console.log('Configure module:', data.id),
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      labelAr: 'تعطيل',
      icon: Lock,
      variant: 'destructive',
      show: (data) => data.status === 'active' && !data.is_core,
      confirm: {
        title: 'Confirm Deactivation',
        titleAr: 'تأكيد التعطيل',
        description: 'Are you sure you want to deactivate this module? Users will lose access to its features.',
        descriptionAr: 'هل أنت متأكد من تعطيل هذه الوحدة؟ سيفقد المستخدمون الوصول إلى ميزاتها.',
      },
      onClick: (data) => console.log('Deactivate module:', data.id),
    },
    {
      id: 'activate',
      label: 'Activate',
      labelAr: 'تفعيل',
      icon: Unlock,
      variant: 'success',
      show: (data) => data.status !== 'active',
      onClick: (data) => console.log('Activate module:', data.id),
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
    return null;
  },
};

export default moduleConfig;
