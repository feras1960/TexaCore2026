/**
 * Plan Limits Tab - حدود وميزات الباقة
 * ✨ مع جميع الميزات من الباك إند
 */

import React from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Database, FileText, Image, Building2,
  HardDrive, ShoppingCart, Package,
  Infinity, CheckCircle2, XCircle 
} from 'lucide-react';

export const PlanLimitsTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t 
}) => {
  const LimitCard = ({ 
    icon: Icon, 
    label, 
    value, 
    max, 
    unit = '', 
    isUnlimited = false,
    color = 'primary'
  }: any) => {
    const percentage = isUnlimited ? 100 : max > 0 ? (value / max) * 100 : 0;
    const progressColor = percentage < 50 ? 'text-green-600' : percentage < 80 ? 'text-yellow-600' : 'text-red-600';

    const colorClasses = {
      primary: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };

    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 mb-3">
          <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1 text-muted-foreground">{label}</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${isUnlimited ? 'text-primary' : progressColor}`}>
                {isUnlimited ? (
                  <div className="flex items-center gap-1">
                    <Infinity className="h-6 w-6" />
                    <span className="text-sm">{t('common.unlimited')}</span>
                  </div>
                ) : (
                  max
                )}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const FeatureItem = ({ label, enabled }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm">{label}</span>
      {enabled ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 me-1" />
          {t('common.enabled')}
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-gray-50 text-gray-700">
          <XCircle className="h-3 w-3 me-1" />
          {t('common.disabled')}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Limits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <LimitCard
          icon={Building2}
          label={language === 'ar' ? 'عدد الشركات' : 'Max Companies'}
          max={data.max_companies || 0}
          isUnlimited={data.max_companies === 0}
          color="primary"
        />

        <LimitCard
          icon={Users}
          label={language === 'ar' ? 'عدد المستخدمين' : 'Max Users'}
          max={data.max_users || 0}
          isUnlimited={data.max_users === 0}
          color="green"
        />

        <LimitCard
          icon={ShoppingCart}
          label={language === 'ar' ? 'عدد العملاء' : 'Max Customers'}
          max={data.max_customers || 0}
          isUnlimited={data.max_customers === 0}
          color="purple"
        />

        <LimitCard
          icon={Package}
          label={language === 'ar' ? 'عدد المنتجات' : 'Max Products'}
          max={data.max_products || 0}
          isUnlimited={data.max_products === 0}
          color="orange"
        />

        <LimitCard
          icon={HardDrive}
          label={language === 'ar' ? 'المساحة التخزينية' : 'Storage Space'}
          max={data.max_storage_gb || 0}
          unit="GB"
          isUnlimited={data.max_storage_gb === 0}
          color="primary"
        />

        <LimitCard
          icon={FileText}
          label={language === 'ar' ? 'عدد الوثائق' : 'Max Documents'}
          max={data.max_documents || 0}
          isUnlimited={data.max_documents === 0}
          color="green"
        />

        <LimitCard
          icon={Image}
          label={language === 'ar' ? 'عدد الصور' : 'Max Images'}
          max={data.max_images || 0}
          isUnlimited={data.max_images === 0}
          color="purple"
        />

        <LimitCard
          icon={Database}
          label={language === 'ar' ? 'عدد السجلات' : 'Max Records'}
          max={data.max_records || 0}
          isUnlimited={data.max_records === 0}
          color="orange"
        />
      </div>

      {/* Features */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          {language === 'ar' ? 'الميزات المتاحة' : 'Available Features'}
        </h3>
        <div className="space-y-0">
          <FeatureItem
            label={language === 'ar' ? 'دعم متعدد العملات' : 'Multi-Currency Support'}
            enabled={data.features?.multi_currency !== false}
          />
          <FeatureItem
            label={language === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports'}
            enabled={data.features?.advanced_reports !== false}
          />
          <FeatureItem
            label={language === 'ar' ? 'الوصول عبر API' : 'API Access'}
            enabled={data.features?.api_access !== false}
          />
          <FeatureItem
            label={language === 'ar' ? 'علامة تجارية مخصصة' : 'Custom Branding'}
            enabled={data.features?.custom_branding || false}
          />
          <FeatureItem
            label={language === 'ar' ? 'الدعم الفني الأولوية' : 'Priority Support'}
            enabled={data.features?.priority_support || false}
          />
          <FeatureItem
            label={language === 'ar' ? 'النسخ الاحتياطي التلقائي' : 'Auto Backup'}
            enabled={data.features?.auto_backup !== false}
          />
          <FeatureItem
            label={language === 'ar' ? 'التصدير إلى Excel' : 'Excel Export'}
            enabled={data.features?.excel_export !== false}
          />
          <FeatureItem
            label={language === 'ar' ? 'الإشعارات البريدية' : 'Email Notifications'}
            enabled={data.features?.email_notifications !== false}
          />
        </div>
      </Card>
    </div>
  );
};
