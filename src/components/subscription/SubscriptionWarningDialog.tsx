/**
 * Subscription Warning Dialog
 * نافذة تحذير حالة الاشتراك
 * 
 * تظهر كـ popup عند اقتراب انتهاء الاشتراك بشكل حرج
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CreditCard, Calendar, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import type { SubscriptionStatusInfo } from '@/services/subscriptionService';

interface SubscriptionWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: SubscriptionStatusInfo;
  onRemindLater?: () => void;
}

export const SubscriptionWarningDialog: React.FC<SubscriptionWarningDialogProps> = ({
  open,
  onOpenChange,
  status,
  onRemindLater,
}) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleGoToBilling = () => {
    onOpenChange(false);
    navigate('/billing');
  };

  const handleRemindLater = () => {
    onRemindLater?.();
    onOpenChange(false);
  };

  // تحديد نوع التحذير
  const getWarningContent = () => {
    if (status.isLocked) {
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        title: t('subscription.dialogs.lockedTitle'),
        description: t('subscription.dialogs.lockedDescription'),
        showRemindLater: false,
      };
    }
    if (status.isInGracePeriod) {
      return {
        icon: Clock,
        iconColor: 'text-orange-500',
        title: t('subscription.dialogs.gracePeriodTitle'),
        description: t('subscription.dialogs.gracePeriodDescription', { days: status.graceDaysRemaining }),
        showRemindLater: true,
      };
    }
    if (status.isExpired) {
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        title: t('subscription.dialogs.expiredTitle'),
        description: t('subscription.dialogs.expiredDescription'),
        showRemindLater: false,
      };
    }
    if (status.daysRemaining <= 3) {
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        title: t('subscription.dialogs.criticalTitle'),
        description: t('subscription.dialogs.criticalDescription', { days: status.daysRemaining }),
        showRemindLater: true,
      };
    }
    return {
      icon: Clock,
      iconColor: 'text-yellow-500',
      title: t('subscription.dialogs.warningTitle'),
      description: t('subscription.dialogs.warningDescription', { days: status.daysRemaining }),
      showRemindLater: true,
    };
  };

  const content = getWarningContent();
  const IconComponent = content.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn('sm:max-w-md', isRTL && 'rtl')}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <IconComponent className={cn('h-8 w-8', content.iconColor)} />
          </div>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-base">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* معلومات الاشتراك */}
        <div className="my-4 space-y-3 rounded-lg border bg-gray-50 p-4 dark:bg-gray-800/50">
          {status.plan && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Building2 className="h-4 w-4" />
                <span>{t('subscription.billing.currentPlan')}</span>
              </div>
              <Badge variant="secondary">
                {isRTL ? status.plan.name_ar : (status.plan.name_en || status.plan.name_ar)}
              </Badge>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{t('subscription.billing.daysRemaining')}</span>
            </div>
            <Badge 
              variant={status.daysRemaining <= 3 ? 'destructive' : 'outline'}
            >
              {status.isExpired 
                ? t('subscription.status.expired')
                : `${status.daysRemaining} ${t('common.days')}`
              }
            </Badge>
          </div>

          {status.isInGracePeriod && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{t('subscription.billing.gracePeriod')}</span>
              </div>
              <Badge variant="destructive">
                {status.graceDaysRemaining} {t('common.days')}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className={cn('gap-2', isRTL && 'flex-row-reverse')}>
          {content.showRemindLater && onRemindLater && (
            <Button variant="outline" onClick={handleRemindLater}>
              {t('subscription.dialogs.remindLater')}
            </Button>
          )}
          <Button onClick={handleGoToBilling} className="flex-1">
            <CreditCard className="h-4 w-4 me-2" />
            {status.isLocked || status.isExpired
              ? t('subscription.billing.payNow')
              : t('subscription.billing.renewNow')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionWarningDialog;
