/**
 * Plan Limits Tab - حدود وميزات الباقة
 */

import React from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Database, FileText, Image, 
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
    isUnlimited = false 
  }: any) => {
    const percentage = isUnlimited ? 100 : max > 0 ? (value / max) * 100 : 0;
    const color = percentage < 50 ? 'text-green-600' : percentage < 80 ? 'text-yellow-600' : 'text-red-600';

    return (
      <Card className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">{label}</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${color}`}>
                {isUnlimited ? <Infinity className="h-6 w-6" /> : value}
              </span>
              {!isUnlimited && max > 0 && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-lg text-muted-foreground">{max}</span>
                </>
              )}
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          </div>
        </div>
        {!isUnlimited && max > 0 && (
          <Progress value={percentage} className="h-2" />
        )}
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
      {/* Limits */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t('saas.plan.limits')}</h3>
        
        <LimitCard
          icon={Users}
          label={t('saas.plan.maxUsers')}
          value={0}
          max={data.max_users}
          isUnlimited={data.max_users === 0}
        />

        <LimitCard
          icon={Database}
          label={t('saas.plan.storageLimit')}
          value={0}
          max={data.storage_limit_mb}
          unit="MB"
          isUnlimited={data.storage_limit_mb === 0}
        />

        <LimitCard
          icon={FileText}
          label={t('saas.plan.maxDocuments')}
          value={0}
          max={data.max_documents}
          isUnlimited={data.max_documents === 0}
        />

        <LimitCard
          icon={Image}
          label={t('saas.plan.maxImages')}
          value={0}
          max={data.max_images}
          isUnlimited={data.max_images === 0}
        />
      </div>

      {/* Features */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">{t('saas.plan.features')}</h3>
        <div className="space-y-0">
          <FeatureItem
            label={t('saas.plan.feature.multiCurrency')}
            enabled={data.features?.multi_currency || false}
          />
          <FeatureItem
            label={t('saas.plan.feature.advancedReports')}
            enabled={data.features?.advanced_reports || false}
          />
          <FeatureItem
            label={t('saas.plan.feature.apiAccess')}
            enabled={data.features?.api_access || false}
          />
          <FeatureItem
            label={t('saas.plan.feature.customBranding')}
            enabled={data.features?.custom_branding || false}
          />
          <FeatureItem
            label={t('saas.plan.feature.prioritySupport')}
            enabled={data.features?.priority_support || false}
          />
        </div>
      </Card>
    </div>
  );
};
