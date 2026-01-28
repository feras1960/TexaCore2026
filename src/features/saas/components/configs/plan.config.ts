/**
 * Plan Configuration for SaaS Detail Sheet
 * تكوين الباقات لشيت التفاصيل
 */

import { BaseSheetConfig } from '@/components/shared/sheets/types';
import { 
  Package, Info, Box, Target, Users, 
  FileText, Activity, Edit, Copy, 
  CheckCircle2, XCircle, Archive, Trash2, 
  Star, StarOff, Calendar, DollarSign 
} from 'lucide-react';
import { PlanOverviewTab } from '@/features/saas/components/tabs/plan/PlanOverviewTab';
import { PlanModulesTab } from '@/features/saas/components/tabs/plan/PlanModulesTab';
import { PlanLimitsTab } from '@/features/saas/components/tabs/plan/PlanLimitsTab';
import { PlanSubscribersTab } from '@/features/saas/components/tabs/plan/PlanSubscribersTab';
import { PlanLedgerTab } from '@/features/saas/components/tabs/plan/PlanLedgerTab';
import { PlanActivityTab } from '@/features/saas/components/tabs/plan/PlanActivityTab';
import {
  activatePlan,
  deactivatePlan,
  setAsPopular,
  removePopular,
  duplicatePlan,
  archivePlan,
  deletePlan,
} from '@/services/saas/planActionsHandler';
import { getLocalizedField, getSafeValue } from '@/lib/i18n-helpers';

export const getPlanConfig = (
  t: (key: string) => string,
  language: string,
  data: any
): BaseSheetConfig => {
  // Normalize data structure (handle both old and new formats)
  const price = getSafeValue(data, 'price', getSafeValue(data, 'price_monthly', 0));
  const currency = getSafeValue(data, 'currency', 'USD');
  const billingCycle = data.billing_cycle || 'monthly';
  
  return {
    // Header
    title: (data) => getLocalizedField(data, 'name', language, t('common.notSet')),
    subtitle: (data) => {
      const displayPrice = getSafeValue(data, 'price', getSafeValue(data, 'price_monthly', 0));
      const displayCurrency = getSafeValue(data, 'currency', 'USD');
      const cycle = data.billing_cycle ? t(`saas.plan.${data.billing_cycle}`) : t('saas.plan.monthly');
      return `${displayPrice} ${displayCurrency} / ${cycle}`;
    },
    icon: Package,
    iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    badge: (data) => {
      if (data.is_archived) {
        return { label: t('common.archived'), variant: 'error' };
      }
      if (data.is_active) {
        return { label: t('common.active'), variant: 'success' };
      }
      return { label: t('common.inactive'), variant: 'warning' };
    },

    // Stats
    stats: [
      {
        key: 'price',
        label: t('saas.plan.price'),
        value: getSafeValue(data, 'price', getSafeValue(data, 'price_monthly', 0)),
        icon: DollarSign,
        color: 'green',
        format: (value) => `${value} ${getSafeValue(data, 'currency', 'USD')}`,
      },
      {
        key: 'subscribers',
        label: t('saas.plan.subscribers'),
        value: getSafeValue(data, 'subscribers_count', 0),
        icon: Users,
        color: 'blue',
      },
      {
        key: 'modules',
        label: t('saas.plan.modules'),
        value: getSafeValue(data, 'modules_count', 0),
        icon: Box,
        color: 'purple',
      },
    ],

    // Tabs
    tabs: [
      {
        id: 'overview',
        label: t('common.overview'),
        icon: Info,
        component: PlanOverviewTab,
      },
      {
        id: 'modules',
        label: t('saas.plan.modules'),
        icon: Box,
        component: PlanModulesTab,
        badge: (data) => data.modules_count || 0,
      },
      {
        id: 'limits',
        label: t('saas.plan.limitsAndFeatures'),
        icon: Target,
        component: PlanLimitsTab,
      },
      {
        id: 'subscribers',
        label: t('saas.plan.subscribers'),
        icon: Users,
        component: PlanSubscribersTab,
        badge: (data) => data.subscribers_count || 0,
      },
      {
        id: 'ledger',
        label: t('saas.plan.ledger'),
        icon: FileText,
        component: PlanLedgerTab,
      },
      {
        id: 'activity',
        label: t('common.activity'),
        icon: Activity,
        component: PlanActivityTab,
      },
    ],
    defaultTab: 'overview',

    // Actions
    actions: [
      {
        id: 'edit',
        label: t('common.edit'),
        icon: Edit,
        variant: 'default',
        onClick: async (data, context) => {
          context?.handlers?.onEdit?.(data);
        },
      },
      {
        id: 'duplicate',
        label: t('common.duplicate'),
        icon: Copy,
        variant: 'outline',
        onClick: async (data, context) => {
          if (context) {
            await duplicatePlan(data, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
          }
        },
      },
      {
        id: 'activate',
        label: t('common.activate'),
        icon: CheckCircle2,
        variant: 'outline',
        show: (data) => !data.is_active && !data.is_archived,
        onClick: async (data, context) => {
          if (context) {
            await activatePlan(data.id, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
          }
        },
      },
      {
        id: 'deactivate',
        label: t('common.deactivate'),
        icon: XCircle,
        variant: 'outline',
        show: (data) => data.is_active && !data.is_archived,
        confirm: {
          title: t('saas.plan.deactivateConfirm'),
          description: t('saas.plan.deactivateDescription'),
        },
        onClick: async (data, context) => {
          if (context) {
            await deactivatePlan(data.id, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
          }
        },
      },
      {
        id: 'setPopular',
        label: t('saas.plan.setPopular'),
        icon: Star,
        variant: 'outline',
        show: (data) => !data.is_popular && !data.is_archived,
        onClick: async (data, context) => {
          if (context) {
            await setAsPopular(data.id, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
          }
        },
      },
      {
        id: 'removePopular',
        label: t('saas.plan.removePopular'),
        icon: StarOff,
        variant: 'outline',
        show: (data) => data.is_popular && !data.is_archived,
        onClick: async (data, context) => {
          if (context) {
            await removePopular(data.id, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
          }
        },
      },
      {
        id: 'archive',
        label: t('common.archive'),
        icon: Archive,
        variant: 'outline',
        show: (data) => !data.is_archived,
        confirm: {
          title: t('saas.plan.archiveConfirm'),
          description: t('saas.plan.archiveDescription'),
        },
        onClick: async (data, context) => {
          if (context) {
            await archivePlan(data.id, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
          }
        },
      },
      {
        id: 'delete',
        label: t('common.delete'),
        icon: Trash2,
        variant: 'destructive',
        show: (data) => data.is_archived,
        confirm: {
          title: t('common.deleteConfirm'),
          description: t('common.deleteDescription'),
        },
        onClick: async (data, context) => {
          if (context) {
            const success = await deletePlan(data.id, context.language as 'ar' | 'en', {
              onRefresh: context.handlers?.onRefresh,
            });
            if (success && context.handlers?.onRefresh) {
              // Close sheet after deletion
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }
          }
        },
      },
    ],

    // Size
    width: 'full',
    
    // ✨ Edit Configuration
    editConfig: {
      enabled: true,
      defaultMode: 'view',
      fields: [
        // Basic Info Fields
        {
          key: 'name_ar',
          type: 'text',
          label: 'اسم الباقة (عربي)',
          editable: true,
          required: true,
          tab: 'overview',
          validate: (value) => {
            if (!value || value.trim().length < 3) {
              return t('errors.minLength').replace('{min}', '3');
            }
            return null;
          },
        },
        {
          key: 'name_en',
          type: 'text',
          label: 'Plan Name (English)',
          editable: true,
          required: true,
          tab: 'overview',
          validate: (value) => {
            if (!value || value.trim().length < 3) {
              return t('errors.minLength').replace('{min}', '3');
            }
            return null;
          },
        },
        {
          key: 'description_ar',
          type: 'textarea',
          label: 'الوصف (عربي)',
          editable: true,
          required: false,
          tab: 'overview',
        },
        {
          key: 'description_en',
          type: 'textarea',
          label: 'Description (English)',
          editable: true,
          required: false,
          tab: 'overview',
        },
        {
          key: 'price',
          type: 'number',
          label: t('saas.plan.price'),
          editable: true,
          required: true,
          tab: 'overview',
          min: 0,
          validate: (value) => {
            if (value < 0) {
              return t('errors.invalidValue');
            }
            return null;
          },
        },
        {
          key: 'currency',
          type: 'select',
          label: t('saas.plan.currency'),
          editable: true,
          required: true,
          tab: 'overview',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'SAR', label: 'SAR' },
            { value: 'EUR', label: 'EUR' },
            { value: 'TRY', label: 'TRY' },
          ],
        },
        {
          key: 'billing_cycle',
          type: 'select',
          label: t('saas.plan.billingCycle'),
          editable: true,
          required: true,
          tab: 'overview',
          options: [
            { value: 'monthly', label: t('saas.plan.monthly') },
            { value: 'yearly', label: t('saas.plan.yearly') },
          ],
        },
        {
          key: 'max_users',
          type: 'number',
          label: t('saas.plan.maxUsers'),
          editable: true,
          required: true,
          tab: 'overview',
          min: 0,
          helpText: '0 = ' + t('common.unlimited'),
        },
      ],
      validation: (data) => {
        const errors: Record<string, string> = {};
        
        // Validate required fields
        if (!data.name_ar || data.name_ar.trim().length < 3) {
          errors.name_ar = t('errors.required');
        }
        if (!data.name_en || data.name_en.trim().length < 3) {
          errors.name_en = t('errors.required');
        }
        if (!data.price || data.price < 0) {
          errors.price = t('errors.invalidValue');
        }
        
        return errors;
      },
      saveButtonText: t('common.save'),
      cancelButtonText: t('common.cancel'),
    },
  };
};
