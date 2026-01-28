/**
 * Plan Overview Tab - نظرة عامة على الباقة
 * ✨ مع دعم Edit Mode
 */

import React from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, DollarSign, Users, Package, 
  CheckCircle2, XCircle, Archive, Star 
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { getLocalizedField, getSafeValue } from '@/lib/i18n-helpers';
import { cn } from '@/lib/utils';

export const PlanOverviewTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t,
  isEditing = false,
  onUpdate,
  errors = {},
}) => {
  const locale = language === 'ar' ? ar : enUS;

  // Helper for editable fields
  const EditableField = ({ 
    icon: Icon, 
    label, 
    value, 
    fieldKey,
    type = 'text',
    options,
    highlight = false 
  }: any) => {
    const hasError = errors[fieldKey];
    
    if (isEditing && onUpdate) {
      return (
        <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
          <div className="mt-2.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {type === 'select' && options ? (
              <Select
                value={value?.toString()}
                onValueChange={(val) => onUpdate(fieldKey, type === 'number' ? parseFloat(val) : val)}
              >
                <SelectTrigger className={cn(hasError && 'border-red-500')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt: any) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={type}
                value={value}
                onChange={(e) => onUpdate(fieldKey, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                className={cn(highlight && 'font-bold', hasError && 'border-red-500')}
              />
            )}
            {hasError && (
              <p className="text-xs text-red-500">{hasError}</p>
            )}
          </div>
        </div>
      );
    }

    // View mode
    return (
      <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
        <div className="mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
          <div className={highlight ? 'text-lg font-bold text-primary' : 'text-sm font-medium'}>
            {value}
          </div>
        </div>
      </div>
    );
  };

  const InfoRow = ({ icon: Icon, label, value, highlight = false }: any) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className={highlight ? 'text-lg font-bold text-primary' : 'text-sm font-medium'}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t('saas.plan.basicInfo')}
        </h3>
        <div className="space-y-0">
          <EditableField
            icon={Package}
            label={language === 'ar' ? t('saas.plan.planName') + ' (عربي)' : t('saas.plan.planName') + ' (Arabic)'}
            value={data.name_ar || ''}
            fieldKey="name_ar"
            type="text"
            highlight
          />
          <EditableField
            icon={Package}
            label={language === 'ar' ? t('saas.plan.planName') + ' (إنجليزي)' : t('saas.plan.planName') + ' (English)'}
            value={data.name_en || ''}
            fieldKey="name_en"
            type="text"
            highlight
          />
          <EditableField
            icon={DollarSign}
            label={t('saas.plan.price')}
            value={getSafeValue(data, 'price', getSafeValue(data, 'price_monthly', 0))}
            fieldKey="price"
            type="number"
            highlight
          />
          <EditableField
            icon={DollarSign}
            label={t('saas.plan.currency')}
            value={getSafeValue(data, 'currency', 'USD')}
            fieldKey="currency"
            type="select"
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'SAR', label: 'SAR' },
              { value: 'EUR', label: 'EUR' },
              { value: 'TRY', label: 'TRY' },
            ]}
          />
          <EditableField
            icon={Calendar}
            label={t('saas.plan.billingCycle')}
            value={data.billing_cycle || 'monthly'}
            fieldKey="billing_cycle"
            type="select"
            options={[
              { value: 'monthly', label: t('saas.plan.monthly') },
              { value: 'yearly', label: t('saas.plan.yearly') },
            ]}
          />
          <EditableField
            icon={Users}
            label={t('saas.plan.maxUsers')}
            value={data.max_users || 0}
            fieldKey="max_users"
            type="number"
          />
          {!isEditing && (
            <InfoRow
              icon={Package}
              label={t('saas.plan.product')}
              value={getLocalizedField(data.saas_products || data.product, 'name', language, t('common.notSet'))}
            />
          )}
        </div>
      </Card>

      {/* Description */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {t('common.description')}
        </h3>
        {isEditing && onUpdate ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
              </Label>
              <Textarea
                value={data.description_ar || ''}
                onChange={(e) => onUpdate('description_ar', e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
              </Label>
              <Textarea
                value={data.description_en || ''}
                onChange={(e) => onUpdate('description_en', e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getLocalizedField(data, 'description', language) || t('common.notSet')}
          </p>
        )}
      </Card>

      {/* Status & Flags - View Only */}
      {!isEditing && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">
            {t('saas.plan.status')}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={data.is_active ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {data.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {data.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
            
            {data.is_popular && (
              <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                <Star className="h-3 w-3" />
                {t('saas.plan.popular')}
              </Badge>
            )}
            
            {data.is_archived && (
              <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-700">
                <Archive className="h-3 w-3" />
                {t('common.archived')}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Timestamps - View Only */}
      {!isEditing && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('common.dates')}
          </h3>
          <div className="space-y-0">
            <InfoRow
              icon={Calendar}
              label={t('common.createdAt')}
              value={format(new Date(data.created_at), 'PPp', { locale })}
            />
            {data.updated_at && (
              <InfoRow
                icon={Calendar}
                label={t('common.updatedAt')}
                value={format(new Date(data.updated_at), 'PPp', { locale })}
              />
            )}
            {data.archived_at && (
              <InfoRow
                icon={Archive}
                label={t('common.archivedAt')}
                value={format(new Date(data.archived_at), 'PPp', { locale })}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
