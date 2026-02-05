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
import { toast } from 'sonner';
import { tenantsService } from '@/services/saas/tenantsService';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';
import { TenantSubscriptionsTab } from '../tabs/tenant/TenantSubscriptionsTab';
import { TenantUsageTab } from '../tabs/tenant/TenantUsageTab';
import { TenantModulesTab } from '../tabs/tenant/TenantModulesTab';
import { TenantCompaniesList } from '@/features/saas/components/TenantCompaniesList';

export const tenantConfig: SheetConfig = {
  docType: 'tenant',

  // Header
  title: (data) => data.name,
  subtitle: (data) => data.code,
  icon: Building2,
  iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800',

  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'status.active', variant: 'success' },
      inactive: { label: 'status.inactive', variant: 'default' },
      suspended: { label: 'status.suspended', variant: 'error' },
      expired: { label: 'status.expired', variant: 'warning' },
    };
    const status = statusMap[data.status] || statusMap.inactive;
    return {
      label: status.label,
      variant: status.variant,
    };
  },

  // Stats Cards
  stats: [
    {
      key: 'users_count',
      label: 'stats.users',
      icon: Users,
      value: (data) => data.users_count || 0,
      color: 'blue',
    },
    {
      key: 'modules_count',
      label: 'stats.modules',
      icon: Boxes,
      value: (data) => data.enabled_modules?.length || 0,
      color: 'purple',
    },
    {
      key: 'monthly_revenue',
      label: 'stats.monthlyRevenue',
      icon: DollarSign,
      value: (data) => data.monthly_revenue || data.subscription_amount || 0,
      color: 'green',
      format: (value) => `${value.toLocaleString()} SAR`,
    },
    {
      key: 'days_remaining',
      label: 'stats.daysRemaining',
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
    { key: 'code', label: 'fields.code', type: 'text' },
    { key: 'email', label: 'fields.email', type: 'email', icon: Mail },
    { key: 'phone', label: 'fields.phone', type: 'phone', icon: Phone },
    { key: 'country', label: 'fields.country', type: 'text', icon: Globe },
    { key: 'default_language', label: 'fields.language', type: 'badge' },
    { key: 'plan_name', label: 'fields.plan', type: 'badge', icon: Package },
    { key: 'created_at', label: 'fields.created', type: 'date', icon: Calendar },
    {
      key: 'agent_name',
      label: 'fields.agent',
      type: 'link',
      link: (_value, data) => data.agent_id ? { docType: 'agent' as DocType, id: data.agent_id } : null,
    },
    { key: 'referral_code', label: 'fields.referralCode', type: 'text' },
    { key: 'referral_source', label: 'fields.referralSource', type: 'text' },
  ],



  // Tabs
  tabs: [
    { id: 'overview', label: 'tabs.overview', icon: Eye, component: OverviewTab },
    { id: 'companies', label: 'saas.companies', icon: Building2, component: TenantCompaniesList },
    { id: 'subscriptions', label: 'tabs.subscriptions', icon: Package, component: TenantSubscriptionsTab },
    { id: 'usage', label: 'tabs.usage', icon: Activity, component: TenantUsageTab },
    { id: 'modules', label: 'tabs.modules', icon: Boxes, component: TenantModulesTab },
    { id: 'payments', label: 'tabs.payments', icon: DollarSign, component: PaymentsTab },
    { id: 'ledger', label: 'tabs.ledger', icon: Book, component: LedgerTab },
    { id: 'activity', label: 'tabs.activity', icon: Activity, component: ActivityTab },
  ],
  defaultTab: 'overview',

  // Actions
  actions: [
    {
      id: 'edit',
      label: 'actions.edit',
      icon: Edit,
      variant: 'outline',
      onClick: async (data) => {
        // Edit logic here or open edit sheet
        console.log('Edit tenant:', data);
      },
    },
    {
      id: 'suspend',
      label: 'actions.suspend',
      icon: PauseCircle,
      variant: 'destructive',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'dialogs.confirmSuspend',
        description: 'dialogs.suspendTenantWarning',
      },
      onClick: async (data) => {
        try {
          await tenantsService.suspend(data.id);
          toast.success('تم تعليق المشترك بنجاح');
        } catch (error: any) {
          toast.error(error.message || 'حدث خطأ أثناء التعليق');
          throw error;
        }
      },
    },
    {
      id: 'activate',
      label: 'actions.activate',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status === 'suspended' || data.status === 'inactive',
      onClick: async (data) => {
        try {
          await tenantsService.activate(data.id);
          toast.success('تم تفعيل المشترك بنجاح');
        } catch (error: any) {
          toast.error(error.message || 'حدث خطأ أثناء التفعيل');
          throw error;
        }
      },
    },
    {
      id: 'delete',
      label: 'actions.delete',
      icon: Trash2,
      variant: 'destructive',
      confirm: {
        title: 'dialogs.confirmDelete',
        description: 'dialogs.deleteTenantWarning',
        confirmLabel: 'actions.delete',
      },
      requiresAuth: true,
      closeOnSuccess: true,
      onClick: async (data) => {
        try {
          await tenantsService.delete(data.id);
          toast.success('تم حذف المشترك بنجاح');
        } catch (error: any) {
          toast.error(error.message || 'حدث خطأ أثناء الحذف');
          throw error;
        }
      },
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
