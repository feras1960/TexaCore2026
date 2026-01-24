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
import { type SheetConfig } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

// أيقونات الوحدات - Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MODULE_ICONS: Record<string, any> = {
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
      return { label: 'moduleTypes.core', variant: 'info', icon: Shield };
    }
    if (data.is_addon) {
      return { label: 'moduleTypes.addon', variant: 'warning', icon: Puzzle };
    }
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'status.active', variant: 'success' },
      inactive: { label: 'status.inactive', variant: 'default' },
      beta: { label: 'status.beta', variant: 'warning' },
      deprecated: { label: 'status.deprecated', variant: 'error' },
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
      label: 'stats.activeUsers',
      icon: Users,
      value: (data) => data.subscribers_count || data.active_users || 0,
      color: 'blue',
    },
    {
      key: 'plans_count',
      label: 'stats.inPlans',
      icon: Package,
      value: (data) => data.plans_count || data.included_in_plans?.length || 0,
      color: 'purple',
    },
    {
      key: 'features_count',
      label: 'stats.features',
      icon: Star,
      value: (data) => data.features?.length || 0,
      color: 'green',
    },
    {
      key: 'addon_price',
      label: 'stats.addonPrice',
      icon: Tag,
      value: (data) => data.addon_price || 0,
      color: 'gray',
      format: (value) => value > 0 ? `${Number(value).toLocaleString()} SAR` : '-',
    },
  ],
  
  // Info Fields
  infoFields: [
    // معلومات الوحدة
    { 
      key: 'code', 
      label: 'fields.moduleCode', 
      type: 'text',
      icon: Code,
    },
    { 
      key: 'name', 
      label: 'fields.nameEn', 
      type: 'text' 
    },
    { 
      key: 'name_ar', 
      label: 'fields.nameAr', 
      type: 'text' 
    },
    { 
      key: 'description', 
      label: 'fields.description', 
      type: 'text',
      format: (value, data) => data.description_ar || value || '-',
    },
    
    // التصنيف
    { 
      key: 'category', 
      label: 'fields.category', 
      type: 'badge',
      icon: Layers,
      badge: (value) => ({
        label: value || 'common.general',
        variant: 'default',
      }),
    },
    { 
      key: 'is_core', 
      label: 'fields.coreModule', 
      type: 'badge',
      icon: Shield,
      badge: (value) => value ? { label: 'moduleTypes.coreDescription', variant: 'info' } : null,
    },
    { 
      key: 'is_addon', 
      label: 'fields.addon', 
      type: 'badge',
      icon: Puzzle,
      badge: (value) => value ? { label: 'moduleTypes.addonDescription', variant: 'warning' } : null,
    },
    
    // التسعير (للإضافات)
    { 
      key: 'addon_price', 
      label: 'fields.addonPrice', 
      type: 'currency',
      icon: Tag,
      hidden: (data) => !data.is_addon,
    },
    { 
      key: 'addon_billing_cycle', 
      label: 'fields.billingCycle', 
      type: 'badge',
      hidden: (data) => !data.is_addon,
      badge: (value) => ({
        label: value === 'yearly' ? 'billingCycles.yearly' : value === 'monthly' ? 'billingCycles.monthly' : 'billingCycles.oneTime',
        variant: 'default',
      }),
    },
    
    // التكامل
    { 
      key: 'dependencies', 
      label: 'fields.dependencies', 
      type: 'text',
      icon: Link2,
      format: (value) => {
        if (!value || value.length === 0) return '-';
        if (Array.isArray(value)) return value.join(', ');
        return value;
      },
    },
    { 
      key: 'api_endpoint', 
      label: 'fields.apiEndpoint', 
      type: 'text',
      icon: Code,
      hidden: (data) => !data.api_endpoint,
    },
    
    // حالة الوحدة
    { 
      key: 'status', 
      label: 'common.status', 
      type: 'badge',
      badge: (value) => {
        const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
          active: { label: 'status.active', variant: 'success' },
          inactive: { label: 'status.inactive', variant: 'default' },
          beta: { label: 'status.beta', variant: 'warning' },
          deprecated: { label: 'status.deprecated', variant: 'error' },
        };
        return map[value] || map['inactive'];
      },
    },
    { 
      key: 'version', 
      label: 'fields.version', 
      type: 'text' 
    },
    { 
      key: 'release_date', 
      label: 'fields.releaseDate', 
      type: 'date', 
      icon: Calendar 
    },
    
    // معلومات إضافية
    { 
      key: 'sort_order', 
      label: 'fields.sortOrder', 
      type: 'number' 
    },
    { 
      key: 'created_at', 
      label: 'fields.created', 
      type: 'date', 
      icon: Calendar 
    },
    { 
      key: 'updated_at', 
      label: 'fields.updated', 
      type: 'date' 
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
      id: 'features', 
      label: 'tabs.features', 
      icon: Star, 
      component: OverviewTab, // سيتم استبداله بـ ModuleFeaturesTab
      badge: (data) => data.features?.length || 0,
    },
    { 
      id: 'plans', 
      label: 'tabs.plans', 
      icon: Package, 
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.plans_count || data.included_in_plans?.length || 0,
    },
    { 
      id: 'subscribers', 
      label: 'tabs.users', 
      icon: Users, 
      component: OverviewTab, // سيتم استبداله
      badge: (data) => data.subscribers_count || 0,
    },
    { 
      id: 'integration', 
      label: 'tabs.integration', 
      icon: Link2, 
      component: OverviewTab, // سيتم استبداله
    },
    { 
      id: 'analytics', 
      label: 'tabs.analytics', 
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
      id: 'configure',
      label: 'actions.configure',
      icon: Settings,
      variant: 'outline',
      onClick: () => {},
    },
    {
      id: 'deactivate',
      label: 'actions.deactivate',
      icon: Lock,
      variant: 'destructive',
      show: (data) => data.status === 'active' && !data.is_core,
      confirm: {
        title: 'dialogs.confirmDeactivation',
        description: 'dialogs.deactivateModuleWarning',
      },
      onClick: () => {},
    },
    {
      id: 'activate',
      label: 'actions.activate',
      icon: Unlock,
      variant: 'success',
      show: (data) => data.status !== 'active',
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
    if (rowDocType === 'plan') {
      return { docType: 'plan', data: row };
    }
    return null;
  },
};

export default moduleConfig;
