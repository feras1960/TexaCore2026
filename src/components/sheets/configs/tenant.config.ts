/**
 * Tenant Sheet Configuration
 * إعدادات شيت المشترك
 */

import {
  Building2,
  Mail,
  Phone,
  Calendar,
  Globe,
  Package,
  Users,
  Edit,
  PauseCircle,
  CheckCircle,
  Trash2,
  Eye,
  Book,
  Activity,
  DollarSign,
  Boxes,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';
import { TenantSubscriptionsTab } from '../tabs/tenant/TenantSubscriptionsTab';
import { TenantUsageTab } from '../tabs/tenant/TenantUsageTab';
import { TenantModulesTab } from '../tabs/tenant/TenantModulesTab';

export const tenantConfig: SheetConfig = {
  docType: 'tenant',
  
  // Header
  title: (data) => data.name,
  subtitle: (data) => data.code,
  icon: Building2,
  iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800',
  
  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; labelAr: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'Active', labelAr: 'نشط', variant: 'success' },
      inactive: { label: 'Inactive', labelAr: 'غير نشط', variant: 'default' },
      suspended: { label: 'Suspended', labelAr: 'موقوف', variant: 'error' },
      expired: { label: 'Expired', labelAr: 'منتهي', variant: 'warning' },
    };
    const status = statusMap[data.status] || statusMap.inactive;
    return {
      label: status.labelAr, // Will be handled by language context
      variant: status.variant,
    };
  },
  
  // Stats Cards
  stats: [
    {
      key: 'users_count',
      label: 'Users',
      labelAr: 'المستخدمين',
      icon: Users,
      value: (data) => data.users_count || 0,
      color: 'blue',
    },
    {
      key: 'modules_count',
      label: 'Modules',
      labelAr: 'الوحدات',
      icon: Boxes,
      value: (data) => data.enabled_modules?.length || 0,
      color: 'purple',
    },
    {
      key: 'monthly_revenue',
      label: 'Monthly Revenue',
      labelAr: 'الإيراد الشهري',
      icon: DollarSign,
      value: (data) => data.monthly_revenue || data.subscription_amount || 0,
      color: 'green',
      format: (value) => `${value.toLocaleString()} SAR`,
    },
    {
      key: 'days_remaining',
      label: 'Days Remaining',
      labelAr: 'الأيام المتبقية',
      icon: Calendar,
      value: (data) => {
        if (!data.subscription_end) return '-';
        const end = new Date(data.subscription_end);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
      },
      color: 'gray',
    },
  ],
  
  // Info Fields
  infoFields: [
    { key: 'code', label: 'Code', labelAr: 'الكود', type: 'text' },
    { key: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', icon: Mail },
    { key: 'phone', label: 'Phone', labelAr: 'الهاتف', type: 'phone', icon: Phone },
    { key: 'country', label: 'Country', labelAr: 'الدولة', type: 'text', icon: Globe },
    { key: 'default_language', label: 'Language', labelAr: 'اللغة', type: 'badge' },
    { key: 'plan_name', label: 'Plan', labelAr: 'الباقة', type: 'badge', icon: Package },
    { key: 'created_at', label: 'Created', labelAr: 'تاريخ الإنشاء', type: 'date', icon: Calendar },
    { 
      key: 'agent_name', 
      label: 'Agent', 
      labelAr: 'الوكيل', 
      type: 'link',
      link: (value, data) => data.agent_id ? { docType: 'agent' as DocType, id: data.agent_id } : null,
    },
    { key: 'referral_code', label: 'Referral Code', labelAr: 'كود الإحالة', type: 'text' },
    { key: 'referral_source', label: 'Referral Source', labelAr: 'مصدر الإحالة', type: 'text' },
  ],
  
  // Tabs
  tabs: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', icon: Eye, component: OverviewTab },
    { id: 'subscriptions', label: 'Subscriptions', labelAr: 'الاشتراكات', icon: Package, component: TenantSubscriptionsTab },
    { id: 'usage', label: 'Usage', labelAr: 'الاستخدام', icon: Activity, component: TenantUsageTab },
    { id: 'modules', label: 'Modules', labelAr: 'الوحدات', icon: Boxes, component: TenantModulesTab },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات', icon: DollarSign, component: PaymentsTab },
    { id: 'ledger', label: 'Ledger', labelAr: 'كشف الحساب', icon: Book, component: LedgerTab },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط', icon: Activity, component: ActivityTab },
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
      onClick: (data) => console.log('Edit tenant:', data.id),
    },
    {
      id: 'suspend',
      label: 'Suspend',
      labelAr: 'تعليق',
      icon: PauseCircle,
      variant: 'destructive',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'Confirm Suspend',
        titleAr: 'تأكيد التعليق',
        description: 'Are you sure you want to suspend this tenant? They will lose access to the system.',
        descriptionAr: 'هل أنت متأكد من تعليق هذا المشترك؟ سيفقد الوصول إلى النظام.',
      },
      onClick: (data) => console.log('Suspend tenant:', data.id),
    },
    {
      id: 'activate',
      label: 'Activate',
      labelAr: 'تفعيل',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status === 'suspended' || data.status === 'inactive',
      onClick: (data) => console.log('Activate tenant:', data.id),
    },
    {
      id: 'delete',
      label: 'Delete',
      labelAr: 'حذف',
      icon: Trash2,
      variant: 'destructive',
      confirm: {
        title: 'Confirm Delete',
        titleAr: 'تأكيد الحذف',
        description: 'Are you sure you want to delete this tenant? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من حذف هذا المشترك؟ لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'Delete',
        confirmLabelAr: 'حذف',
      },
      onClick: (data) => console.log('Delete tenant:', data.id),
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'subscription') {
      return { docType: 'subscription', data: row };
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

export default tenantConfig;
