/**
 * Packages Management Page
 * إدارة الباقات والأسعار
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { plansService, type Plan, defaultPlans } from '@/services/saas/plansService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  Check,
  X,
  Users,
  HardDrive,
  Building2,
  Star,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';
import { cn } from '@/lib/utils';

export default function Packages() {
  const { t, language, direction } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Load plans
  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await plansService.getAll();
      setPlans(data.length > 0 ? data : defaultPlans.map((p, i) => ({
        ...p,
        id: p.code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));
    } catch (err: any) {
      console.error('Error loading plans:', err);
      // Fallback to default plans
      setPlans(defaultPlans.map((p, i) => ({
        ...p,
        id: p.code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Format price
  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.packages')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar' ? 'إدارة باقات الاشتراك والأسعار' : 'Manage subscription packages and pricing'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPlans} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إضافة باقة' : 'Add Package'}
          </Button>
        </div>
      </div>

      {/* Packages Grid (Card View) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              'relative overflow-hidden transition-all hover:shadow-lg cursor-pointer',
              plan.is_popular && 'border-2 border-blue-500 dark:border-blue-400'
            )}
            onClick={() => {
              setSelectedPlan(plan);
              setIsDetailsOpen(true);
            }}
          >
            {/* Popular Badge */}
            {plan.is_popular && (
              <div className="absolute top-0 right-0">
                <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {language === 'ar' ? 'الأكثر طلباً' : 'Popular'}
                </div>
              </div>
            )}

            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  plan.code === 'starter' && 'bg-gray-100 dark:bg-gray-800',
                  plan.code === 'professional' && 'bg-blue-100 dark:bg-blue-900/30',
                  plan.code === 'enterprise' && 'bg-purple-100 dark:bg-purple-900/30'
                )}>
                  <Package className={cn(
                    'w-6 h-6',
                    plan.code === 'starter' && 'text-gray-600 dark:text-gray-400',
                    plan.code === 'professional' && 'text-blue-600 dark:text-blue-400',
                    plan.code === 'enterprise' && 'text-purple-600 dark:text-purple-400'
                  )} />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">
                    {language === 'ar' ? plan.name_ar : plan.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {plan.code.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Price */}
              <div className="text-center py-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-3xl font-bold text-erp-navy dark:text-white">
                  {formatPrice(plan.price_monthly, plan.currency)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  /{language === 'ar' ? 'شهرياً' : 'month'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {formatPrice(plan.price_yearly, plan.currency)} /{language === 'ar' ? 'سنوياً' : 'year'}
                </p>
              </div>

              {/* Limits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    {language === 'ar' ? 'المستخدمين' : 'Users'}
                  </span>
                  <span className="font-semibold">{plan.max_users}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Building2 className="w-4 h-4" />
                    {language === 'ar' ? 'الشركات' : 'Companies'}
                  </span>
                  <span className="font-semibold">{plan.max_companies}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <HardDrive className="w-4 h-4" />
                    {language === 'ar' ? 'التخزين' : 'Storage'}
                  </span>
                  <span className="font-semibold">{plan.max_storage_gb} GB</span>
                </div>
              </div>

              {/* Features Preview */}
              <div className="space-y-2 pt-2">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </div>
                ))}
                {plan.features.length > 4 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    +{plan.features.length - 4} {language === 'ar' ? 'ميزات أخرى' : 'more features'}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    plan.is_active
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {plan.is_active ? t('saas.status.active') : t('saas.status.inactive')}
                </Badge>
                <span className="text-xs text-gray-500">
                  {plan.trial_days} {language === 'ar' ? 'يوم تجربة' : 'days trial'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Packages Table (Alternative View) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-cairo">
            {language === 'ar' ? 'مقارنة الباقات' : 'Plans Comparison'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('common.name')}</TableHead>
                <TableHead className="text-start">{language === 'ar' ? 'السعر الشهري' : 'Monthly'}</TableHead>
                <TableHead className="text-start">{language === 'ar' ? 'السعر السنوي' : 'Yearly'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'المستخدمين' : 'Users'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'التخزين' : 'Storage'}</TableHead>
                <TableHead className="text-center">{t('common.status')}</TableHead>
                <TableHead className="text-center">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{language === 'ar' ? plan.name_ar : plan.name}</span>
                      {plan.is_popular && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'مميز' : 'Popular'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatPrice(plan.price_monthly, plan.currency)}
                  </TableCell>
                  <TableCell className="text-green-600 dark:text-green-400">
                    {formatPrice(plan.price_yearly, plan.currency)}
                  </TableCell>
                  <TableCell className="text-center">{plan.max_users}</TableCell>
                  <TableCell className="text-center">{plan.max_storage_gb} GB</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        plan.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      )}
                    >
                      {plan.is_active ? t('saas.status.active') : t('saas.status.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedPlan(plan);
                          setIsDetailsOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          {t('common.details')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {plan.is_active ? (
                          <DropdownMenuItem className="text-red-600">
                            <X className="w-4 h-4 mr-2" />
                            {language === 'ar' ? 'تعطيل' : 'Deactivate'}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-green-600">
                            <Check className="w-4 h-4 mr-2" />
                            {language === 'ar' ? 'تفعيل' : 'Activate'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Details Sheet */}
      {selectedPlan && (
        <UnifiedSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedPlan(null);
          }}
          size="lg"
          icon={Package}
          title={language === 'ar' ? selectedPlan.name_ar : selectedPlan.name}
          subtitle={selectedPlan.code.toUpperCase()}
        >
          <div className="space-y-6 py-4">
            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'السعر الشهري' : 'Monthly Price'}
                </p>
                <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                  {formatPrice(selectedPlan.price_monthly, selectedPlan.currency)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'السعر السنوي' : 'Yearly Price'}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {formatPrice(selectedPlan.price_yearly, selectedPlan.currency)}
                </p>
              </div>
            </div>

            {/* Limits */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-3">{language === 'ar' ? 'الحدود' : 'Limits'}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Users className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{selectedPlan.max_users}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'مستخدم' : 'Users'}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Building2 className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                  <p className="text-2xl font-bold">{selectedPlan.max_companies}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'شركة' : 'Companies'}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <HardDrive className="w-6 h-6 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{selectedPlan.max_storage_gb}</p>
                  <p className="text-xs text-gray-500">GB</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-3">{language === 'ar' ? 'الميزات' : 'Features'}</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectedPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-3">{language === 'ar' ? 'الوحدات المتاحة' : 'Available Modules'}</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPlan.modules.map((module, idx) => (
                  <Badge key={idx} variant="outline" className="capitalize">
                    {module}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">{language === 'ar' ? 'فترة التجربة' : 'Trial Period'}</p>
                  <p className="font-semibold">{selectedPlan.trial_days} {language === 'ar' ? 'يوم' : 'days'}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('common.status')}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      selectedPlan.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    )}
                  >
                    {selectedPlan.is_active ? t('saas.status.active') : t('saas.status.inactive')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </UnifiedSheet>
      )}
    </div>
  );
}
