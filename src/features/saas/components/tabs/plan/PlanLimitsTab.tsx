/**
 * Plan Limits Tab - حدود وميزات الباقة
 * ✨ مع إمكانية التعديل
 */

import React, { useState } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, Database, FileText, Image, Building2,
  HardDrive, ShoppingCart, Package,
  Infinity, CheckCircle2, XCircle, Edit, Save, X 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const PlanLimitsTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t,
  onRefresh 
}) => {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    max_users: data.max_users || 0,
    max_companies: data.max_companies || 0,
    max_customers: data.max_customers || 0,
    max_products: data.max_products || 0,
    max_documents: data.max_documents || 0,
    max_images: data.max_images || 0,
    max_records: data.max_records || 0,
    storage_gb: data.storage_gb || 0,
  });

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('subscription_plans')
        .update(formData)
        .eq('id', data.id);

      if (error) throw error;

      toast.success(t('messages.saved'));
      setEditMode(false);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error saving limits:', error);
      toast.error(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      max_users: data.max_users || 0,
      max_companies: data.max_companies || 0,
      max_customers: data.max_customers || 0,
      max_products: data.max_products || 0,
      max_documents: data.max_documents || 0,
      max_images: data.max_images || 0,
      max_records: data.max_records || 0,
      storage_gb: data.storage_gb || 0,
    });
    setEditMode(false);
  };

  const LimitCard = ({ 
    icon: Icon, 
    label, 
    fieldName,
    unit = '', 
    color = 'primary'
  }: any) => {
    const value = editMode ? formData[fieldName as keyof typeof formData] : data[fieldName];
    const isUnlimited = value === -1 || value === 0;

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
            <div className="text-sm font-medium mb-2 text-muted-foreground">{label}</div>
            {editMode ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData[fieldName as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [fieldName]: parseInt(e.target.value) || 0 })}
                  className="h-9 w-32"
                  min="-1"
                />
                <span className="text-sm text-muted-foreground">
                  {value === -1 ? t('common.unlimited') : unit}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isUnlimited ? 'text-primary' : 'text-foreground'}`}>
                  {isUnlimited ? (
                    <div className="flex items-center gap-1">
                      <Infinity className="h-6 w-6" />
                      <span className="text-sm">{t('common.unlimited')}</span>
                    </div>
                  ) : (
                    value
                  )}
                </span>
                {!isUnlimited && unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              </div>
            )}
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
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {language === 'ar' ? 'الحدود والقيود' : 'Limits & Quotas'}
        </h3>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 me-1" />
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 me-1" />
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              <Edit className="h-4 w-4 me-1" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Limits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <LimitCard
          icon={Building2}
          label={language === 'ar' ? 'عدد الشركات' : 'Max Companies'}
          fieldName="max_companies"
          color="primary"
        />

        <LimitCard
          icon={Users}
          label={language === 'ar' ? 'عدد المستخدمين' : 'Max Users'}
          fieldName="max_users"
          color="green"
        />

        <LimitCard
          icon={ShoppingCart}
          label={language === 'ar' ? 'عدد العملاء' : 'Max Customers'}
          fieldName="max_customers"
          color="purple"
        />

        <LimitCard
          icon={Package}
          label={language === 'ar' ? 'عدد المنتجات' : 'Max Products'}
          fieldName="max_products"
          color="orange"
        />

        <LimitCard
          icon={HardDrive}
          label={language === 'ar' ? 'المساحة التخزينية' : 'Storage Space'}
          fieldName="storage_gb"
          unit="GB"
          color="primary"
        />

        <LimitCard
          icon={FileText}
          label={language === 'ar' ? 'عدد الوثائق' : 'Max Documents'}
          fieldName="max_documents"
          color="green"
        />

        <LimitCard
          icon={Image}
          label={language === 'ar' ? 'عدد الصور' : 'Max Images'}
          fieldName="max_images"
          color="purple"
        />

        <LimitCard
          icon={Database}
          label={language === 'ar' ? 'عدد السجلات' : 'Max Records'}
          fieldName="max_records"
          color="orange"
        />
      </div>

      {/* Features */}
      {!editMode && (
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
      )}
    </div>
  );
};
