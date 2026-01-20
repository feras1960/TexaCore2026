/**
 * Create Tenant Dialog
 * نافذة إنشاء مشترك جديد في نظام SaaS
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { tenantsService, type CreateTenantInput } from '@/services/saas/tenantsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Package,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  agentId?: string;
}

const availablePlans = [
  { id: 'starter', code: 'starter', name: 'Starter', nameAr: 'المبتدئ', price: 500, users: 5, storage: 10 },
  { id: 'professional', code: 'professional', name: 'Professional', nameAr: 'الاحترافي', price: 1500, users: 25, storage: 50 },
  { id: 'enterprise', code: 'enterprise', name: 'Enterprise', nameAr: 'المؤسسات', price: 5000, users: 100, storage: 200 },
];

const countries = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية' },
  { code: 'AE', name: 'UAE', nameAr: 'الإمارات' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن' },
];

const languages = [
  { code: 'ar', name: 'Arabic', nameAr: 'العربية' },
  { code: 'en', name: 'English', nameAr: 'الإنجليزية' },
];

export function CreateTenantDialog({ open, onOpenChange, onSuccess, agentId }: CreateTenantDialogProps) {
  const { t, language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Company Info
    companyName: '',
    // Owner Info
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    // Subscription
    plan: 'professional',
    // Settings
    country: 'SA',
    timezone: 'Asia/Riyadh',
    defaultLanguage: 'ar',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedPlan = availablePlans.find(p => p.id === formData.plan);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = t('common.required');
    }
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = t('common.required');
    }
    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = t('common.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = t('auth.fillAllFields');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const input: CreateTenantInput = {
        name: formData.companyName,
        owner_email: formData.ownerEmail,
        owner_name: formData.ownerName,
        plan_code: formData.plan,
        country: formData.country,
        timezone: formData.timezone,
        default_language: formData.defaultLanguage,
        agent_id: agentId,
      };

      await tenantsService.create(input);
      
      // Reset form
      setFormData({
        companyName: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        plan: 'professional',
        country: 'SA',
        timezone: 'Asia/Riyadh',
        defaultLanguage: 'ar',
      });
      setActiveTab('company');
      
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error creating tenant:', err);
      setError(err.message || t('saas.tenants.error.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            {t('saas.tenants.create')}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger 
              value="company" 
              className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white"
            >
              <Building2 className="w-4 h-4" />
              {t('saas.tenants.tabs.company')}
            </TabsTrigger>
            <TabsTrigger 
              value="owner" 
              className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white"
            >
              <User className="w-4 h-4" />
              {t('saas.tenants.tabs.owner')}
            </TabsTrigger>
            <TabsTrigger 
              value="subscription" 
              className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white"
            >
              <Package className="w-4 h-4" />
              {t('saas.tenants.tabs.subscription')}
            </TabsTrigger>
          </TabsList>

          {/* Company Info Tab */}
          <TabsContent value="company" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-tajawal">
                <Building2 className="w-4 h-4 text-gray-400" />
                {t('common.name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder={t('saas.tenants.placeholders.companyName')}
                className={errors.companyName ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.companyName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.companyName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-tajawal">{t('common.country')}</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(v) => setFormData({ ...formData, country: v })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {language === 'ar' ? c.nameAr : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-tajawal">{t('common.language')}</Label>
                <Select 
                  value={formData.defaultLanguage} 
                  onValueChange={(v) => setFormData({ ...formData, defaultLanguage: v })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {language === 'ar' ? l.nameAr : l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setActiveTab('owner')} disabled={loading}>
                {t('common.next')}
              </Button>
            </div>
          </TabsContent>

          {/* Owner Info Tab */}
          <TabsContent value="owner" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-tajawal">
                <User className="w-4 h-4 text-gray-400" />
                {t('saas.tenants.ownerName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder={t('saas.tenants.placeholders.ownerName')}
                className={errors.ownerName ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.ownerName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.ownerName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-tajawal">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {t('common.email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder={t('saas.tenants.placeholders.ownerEmail')}
                  className={errors.ownerEmail ? 'border-red-500' : ''}
                  disabled={loading}
                  dir="ltr"
                />
                {errors.ownerEmail && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.ownerEmail}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-tajawal">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {t('common.phone')}
                </Label>
                <Input
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                  disabled={loading}
                  dir="ltr"
                />
              </div>
            </div>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-sm text-blue-700 dark:text-blue-300">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('auth.checkEmail') || 'سيتم إرسال دعوة للمالك على البريد الإلكتروني لإعداد كلمة المرور'}
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab('company')} disabled={loading}>
                {t('common.previous')}
              </Button>
              <Button onClick={() => setActiveTab('subscription')} disabled={loading}>
                {t('common.next')}
              </Button>
            </div>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4">
            <div className="space-y-2">
              <Label className="font-tajawal">{t('saas.tenants.plan')}</Label>
              <div className="grid grid-cols-3 gap-4">
                {availablePlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all ${
                      formData.plan === plan.id
                        ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border hover:border-gray-300 dark:hover:border-gray-600'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && setFormData({ ...formData, plan: plan.id })}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2 h-6">
                        {formData.plan === plan.id && (
                          <div className="p-1 bg-blue-500 rounded-full">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-erp-navy dark:text-white">
                        {language === 'ar' ? plan.nameAr : plan.name}
                      </h4>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 my-2">
                        {plan.price} <span className="text-sm">SAR</span>
                      </p>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {plan.users} {t('common.default')}
                        </Badge>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {plan.storage} GB
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab('owner')} disabled={loading}>
                {t('common.previous')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedPlan && (
              <>
                <Package className="w-4 h-4" />
                <span>{language === 'ar' ? selectedPlan.nameAr : selectedPlan.name}: </span>
                <span className="font-bold text-erp-navy dark:text-white">
                  {selectedPlan.price} SAR/{t('filters.thisMonth')}
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              {t('saas.tenants.create')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateTenantDialog;
