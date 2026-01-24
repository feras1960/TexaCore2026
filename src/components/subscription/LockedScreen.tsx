/**
 * Locked Screen
 * شاشة الحظر عند انتهاء الاشتراك
 * 
 * تظهر كصفحة كاملة تمنع الوصول للتطبيق
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, Phone, Mail, Building2, Calendar, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import type { SubscriptionStatusInfo } from '@/services/subscriptionService';

interface LockedScreenProps {
  status: SubscriptionStatusInfo;
  tenantName?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export const LockedScreen: React.FC<LockedScreenProps> = ({
  status,
  tenantName,
  supportEmail = 'support@erp.com',
  supportPhone = '+1234567890',
}) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleGoToBilling = () => {
    navigate('/billing');
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:${supportEmail}`;
  };

  return (
    <div 
      className={cn(
        'min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-4'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          {/* أيقونة القفل */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Lock className="h-10 w-10 text-red-500" />
          </div>
          
          <CardTitle className="text-2xl text-red-600 dark:text-red-400">
            {t('subscription.locked.title')}
          </CardTitle>
          
          <CardDescription className="text-base mt-2">
            {t('subscription.locked.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* معلومات الحساب */}
          <div className="rounded-lg border bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
            {tenantName && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="h-4 w-4" />
                  <span>{t('subscription.locked.account')}</span>
                </div>
                <span className="font-medium">{tenantName}</span>
              </div>
            )}
            
            {status.plan && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CreditCard className="h-4 w-4" />
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
                <span>{t('subscription.locked.status')}</span>
              </div>
              <Badge variant="destructive">
                {status.isLocked 
                  ? t('subscription.status.locked')
                  : t('subscription.status.expired')
                }
              </Badge>
            </div>
          </div>

          {/* رسالة توضيحية */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {status.isInGracePeriod 
                ? t('subscription.locked.gracePeriodInfo', { days: status.graceDaysRemaining })
                : t('subscription.locked.paymentInfo')
              }
            </p>
          </div>

          {/* أزرار الإجراءات */}
          <div className="space-y-3">
            <Button 
              onClick={handleGoToBilling} 
              className="w-full h-12 text-base"
              size="lg"
            >
              <CreditCard className="h-5 w-5 me-2" />
              {t('subscription.billing.goToBilling')}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleContactSupport}
              className="w-full"
            >
              <HelpCircle className="h-4 w-4 me-2" />
              {t('subscription.locked.contactSupport')}
            </Button>
          </div>

          {/* معلومات الدعم */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-3">
              {t('subscription.locked.needHelp')}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <a 
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{supportEmail}</span>
              </a>
              <a 
                href={`tel:${supportPhone}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span dir="ltr">{supportPhone}</span>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LockedScreen;
