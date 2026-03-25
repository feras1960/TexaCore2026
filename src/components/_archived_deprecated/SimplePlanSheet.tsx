/**
 * SimplePlanSheet - عرض بسيط لتفاصيل الباقة بدون تعقيدات
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { SimpleSheet } from './SimpleSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Plan } from '@/services/saas/plansService';
import {
  Package,
  Users,
  Building2,
  HardDrive,
  DollarSign,
  CheckCircle,
  XCircle,
  Star,
  Copy,
  Edit,
} from 'lucide-react';
import * as planActions from '@/services/saas/planActionsHandler';

interface SimplePlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onRefresh?: () => void;
}

export function SimplePlanSheet({
  isOpen,
  onClose,
  plan,
  onRefresh,
}: SimplePlanSheetProps) {
  const { t, language } = useLanguage();

  if (!plan) return null;

  const handlers = {
    onRefresh,
    onEdit: () => {},
  };

  const handleAction = async (action: () => Promise<any>) => {
    await action();
    // لا نغلق الـ sheet - نتركه مفتوح
  };

  return (
    <SimpleSheet
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? plan.name_ar : plan.name_en}
      side={language === 'ar' ? 'left' : 'right'}
    >
      {/* Status Badge */}
      <div className="mb-6">
        {plan.is_popular && (
          <Badge variant="default" className="me-2">
            <Star className="w-3 h-3 me-1" />
            {language === 'ar' ? 'مميزة' : 'Popular'}
          </Badge>
        )}
        <Badge variant={plan.is_active ? 'default' : 'secondary'}>
          {plan.is_active
            ? language === 'ar' ? 'نشطة' : 'Active'
            : language === 'ar' ? 'غير نشطة' : 'Inactive'}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <DollarSign className="w-5 h-5 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-green-600">
            {plan.price_monthly?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'السعر الشهري' : 'Monthly Price'}
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Users className="w-5 h-5 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-blue-600">
            {plan.max_users || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'المستخدمين' : 'Users'}
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Building2 className="w-5 h-5 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-purple-600">
            {plan.max_companies || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'الشركات' : 'Companies'}
          </div>
        </div>

        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <HardDrive className="w-5 h-5 text-orange-600 mb-2" />
          <div className="text-2xl font-bold text-orange-600">
            {plan.storage_gb || 0} GB
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'التخزين' : 'Storage'}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-500">
            {language === 'ar' ? 'الكود' : 'Code'}
          </label>
          <div className="mt-1 text-base">{plan.code}</div>
        </div>

        {plan.description && (
          <div>
            <label className="text-sm font-medium text-gray-500">
              {language === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <div className="mt-1 text-base">
              {language === 'ar' ? plan.description : plan.description}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-500">
            {language === 'ar' ? 'العملة' : 'Currency'}
          </label>
          <div className="mt-1 text-base">{plan.currency || 'SAR'}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction(() => 
            planActions.duplicatePlan(plan, language, handlers)
          )}
        >
          <Copy className="w-4 h-4 me-2" />
          {language === 'ar' ? 'تكرار' : 'Duplicate'}
        </Button>

        {!plan.is_popular && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction(() =>
              planActions.setAsPopular(plan.id, language, handlers)
            )}
          >
            <Star className="w-4 h-4 me-2" />
            {language === 'ar' ? 'جعلها مميزة' : 'Set as Popular'}
          </Button>
        )}

        {plan.is_popular && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(() =>
              planActions.removePopular(plan.id, language, handlers)
            )}
          >
            <Star className="w-4 h-4 me-2" />
            {language === 'ar' ? 'إزالة التميز' : 'Remove Popular'}
          </Button>
        )}

        {plan.is_active ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(language === 'ar' 
                ? 'هل أنت متأكد من تعطيل هذه الباقة؟'
                : 'Are you sure you want to deactivate this plan?'
              )) {
                handleAction(() =>
                  planActions.deactivatePlan(plan.id, language, handlers)
                );
              }
            }}
          >
            <XCircle className="w-4 h-4 me-2" />
            {language === 'ar' ? 'تعطيل' : 'Deactivate'}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAction(() =>
              planActions.activatePlan(plan.id, language, handlers)
            )}
          >
            <CheckCircle className="w-4 h-4 me-2" />
            {language === 'ar' ? 'تفعيل' : 'Activate'}
          </Button>
        )}
      </div>
    </SimpleSheet>
  );
}
