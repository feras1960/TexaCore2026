/**
 * TenantSubscriptionsTab - تبويب اشتراكات المشترك
 * يعرض قائمة الاشتراكات والباقات
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { type TabComponentProps } from '../../configs/sheet.types';

// Subscription Interface
interface Subscription {
  id: string;
  plan_name: string;
  plan_code?: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'trial';
  start_date: string;
  end_date?: string;
  amount: number;
  currency: string;
  billing_cycle?: 'monthly' | 'yearly' | 'quarterly';
  auto_renew?: boolean;
  features?: string[];
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; labelAr: string; labelEn: string }> = {
  active: { icon: CheckCircle, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', labelAr: 'نشط', labelEn: 'Active' },
  expired: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', labelAr: 'منتهي', labelEn: 'Expired' },
  cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', labelAr: 'ملغي', labelEn: 'Cancelled' },
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', labelAr: 'معلق', labelEn: 'Pending' },
  trial: { icon: AlertTriangle, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', labelAr: 'تجريبي', labelEn: 'Trial' },
};

const BILLING_CYCLE_LABELS: Record<string, { ar: string; en: string }> = {
  monthly: { ar: 'شهري', en: 'Monthly' },
  yearly: { ar: 'سنوي', en: 'Yearly' },
  quarterly: { ar: 'ربع سنوي', en: 'Quarterly' },
};

// Subscription Card Component
function SubscriptionCard({
  subscription,
  language,
  onClick
}: {
  subscription: Subscription;
  language: string;
  onClick?: () => void;
}) {
  const isArabic = language === 'ar';
  const statusConfig = STATUS_CONFIG[subscription.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US');
  };

  const daysRemaining = useMemo(() => {
    if (!subscription.end_date) return null;
    const end = new Date(subscription.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [subscription.end_date]);

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-erp-teal/50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-erp-navy to-erp-teal flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {subscription.plan_name}
            </h4>
            {subscription.plan_code && (
              <p className="text-xs text-gray-500 font-mono">{subscription.plan_code}</p>
            )}
          </div>
        </div>
        <Badge className={cn('text-xs', statusConfig.color)}>
          <StatusIcon className="w-3 h-3 me-1" />
          {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
        </Badge>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Period */}
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar className="w-4 h-4" />
          <div>
            <span className="block text-xs">{isArabic ? 'الفترة' : 'Period'}</span>
            <span className="text-gray-900 dark:text-white text-xs">
              {formatDate(subscription.start_date)}
              {subscription.end_date && ` - ${formatDate(subscription.end_date)}`}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2 text-gray-500">
          <CreditCard className="w-4 h-4" />
          <div>
            <span className="block text-xs">{isArabic ? 'المبلغ' : 'Amount'}</span>
            <span className="text-gray-900 dark:text-white font-mono text-xs">
              {subscription.amount.toLocaleString()} {subscription.currency}
              {subscription.billing_cycle && (
                <span className="text-gray-400 ms-1">
                  / {isArabic ? BILLING_CYCLE_LABELS[subscription.billing_cycle]?.ar : BILLING_CYCLE_LABELS[subscription.billing_cycle]?.en}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Days Remaining Warning */}
      {daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 && (
        <div className={cn(
          'mt-3 p-2 rounded text-xs flex items-center gap-2',
          daysRemaining <= 7
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
        )}>
          <AlertTriangle className="w-4 h-4" />
          {isArabic
            ? `متبقي ${daysRemaining} يوم على انتهاء الاشتراك`
            : `${daysRemaining} days remaining`
          }
        </div>
      )}

      {/* Auto Renew Badge */}
      {subscription.auto_renew && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {isArabic ? 'تجديد تلقائي' : 'Auto-renew enabled'}
        </div>
      )}
    </div>
  );
}

export function TenantSubscriptionsTab({ data, docType: _docType, language, t: _t, onRowClick, onRefresh: _onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';

  // Get subscriptions from data
  const subscriptions: Subscription[] = useMemo(() => {
    if (data.subscriptions && Array.isArray(data.subscriptions)) {
      return data.subscriptions;
    }
    // Mock data if no subscriptions
    return [{
      id: '1',
      plan_name: data.plan_name || (isArabic ? 'الباقة الأساسية' : 'Basic Plan'),
      plan_code: data.plan_code,
      status: data.subscription_status || 'active',
      start_date: data.subscription_start || data.created_at,
      end_date: data.subscription_end,
      amount: data.subscription_amount || 0,
      currency: data.currency || '-',
      billing_cycle: data.billing_cycle || 'monthly',
      auto_renew: data.auto_renew,
    }];
  }, [data, isArabic]);

  // Stats
  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const totalAmount = subscriptions.reduce((sum, s) => sum + (s.status === 'active' ? s.amount : 0), 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-erp-teal" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'الاشتراكات' : 'Subscriptions'}
            </h3>
            <Badge variant="secondary">{subscriptions.length}</Badge>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 me-1" />
            {isArabic ? 'اشتراك جديد' : 'New Subscription'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400">
              {isArabic ? 'اشتراكات نشطة' : 'Active Subscriptions'}
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {activeCount}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {isArabic ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
            </div>
            <div className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300">
              {totalAmount.toLocaleString()} SAR
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="space-y-3">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              language={language}
              onClick={onRowClick ? () => onRowClick(subscription, 'subscription') : undefined}
            />
          ))}
        </div>

        {subscriptions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            {isArabic ? 'لا توجد اشتراكات' : 'No subscriptions'}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default TenantSubscriptionsTab;
