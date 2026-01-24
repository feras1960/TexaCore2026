/**
 * Subscription Banner
 * بانر تنبيه حالة الاشتراك
 * 
 * يظهر في أعلى الصفحة عند اقتراب انتهاء الاشتراك
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import type { SubscriptionStatusInfo } from '@/services/subscriptionService';

interface SubscriptionBannerProps {
  status: SubscriptionStatusInfo;
  onDismiss?: () => void;
  className?: string;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  status,
  onDismiss,
  className,
}) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  // لا نعرض البانر إذا لم يكن هناك تحذير
  if (!status.shouldShowWarning || status.warningLevel === 'none') {
    return null;
  }

  // تحديد لون البانر
  const bannerStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    critical: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  };

  // تحديد الأيقونة
  const Icon = status.isLocked || status.isExpired ? AlertTriangle : Clock;

  // تحديد الرسالة
  const getMessage = () => {
    if (status.isLocked) {
      return t('subscription.alerts.lockedMessage');
    }
    if (status.isInGracePeriod) {
      return t('subscription.alerts.gracePeriodMessage', { days: status.graceDaysRemaining });
    }
    if (status.isExpired) {
      return t('subscription.alerts.expiredMessage');
    }
    if (status.daysRemaining <= 3) {
      return t('subscription.alerts.criticalWarning', { days: status.daysRemaining });
    }
    if (status.daysRemaining <= 7) {
      return t('subscription.alerts.warningMessage', { days: status.daysRemaining });
    }
    return t('subscription.alerts.infoMessage', { days: status.daysRemaining });
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 border-b px-4 py-3',
        bannerStyles[status.warningLevel],
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">{getMessage()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/billing">
            <Button
              size="sm"
              variant={status.warningLevel === 'critical' ? 'default' : 'outline'}
              className={cn(
                status.warningLevel === 'critical' && 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              <CreditCard className="h-4 w-4 me-2" />
              {status.isLocked || status.isExpired
                ? t('subscription.billing.payNow')
                : t('subscription.billing.renewNow')
              }
            </Button>
          </Link>
          
          {onDismiss && status.warningLevel !== 'critical' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
