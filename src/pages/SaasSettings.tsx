import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Settings, Bell, DollarSign, FileText, Save, AlertTriangle, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MfaSystemSettingsCard } from '@/components/settings/MfaSettings';

interface SaasSettings {
  id: string;
  enable_alerts: boolean;
  alert_days_before: number[];
  send_email_alerts: boolean;
  send_sms_alerts: boolean;
  default_billing_mode: string;
  default_minimum_days: number;
  default_grace_period_days: number;
  auto_suspend_after_grace: boolean;
  create_accounting_entries: boolean;
  default_currency: string;
  allow_partial_payments: boolean;
  allow_overpayments: boolean;
}

export default function SaasSettings() {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SaasSettings | null>(null);
  const [alertDaysInput, setAlertDaysInput] = useState('7, 3, 1');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saas_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        // تحويل array إلى string للعرض
        setAlertDaysInput(data.alert_days_before.join(', '));
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل الإعدادات' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      // تحويل string إلى array
      const alertDays = alertDaysInput
        .split(',')
        .map(d => parseInt(d.trim()))
        .filter(d => !isNaN(d) && d >= 0)
        .sort((a, b) => b - a); // ترتيب تنازلي

      const { error } = await supabase
        .from('saas_settings')
        .update({
          ...settings,
          alert_days_before: alertDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
      loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(language === 'ar' ? 'خطأ في حفظ الإعدادات' : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            {language === 'ar' ? 'إعدادات SaaS' : 'SaaS Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar'
              ? 'إدارة إعدادات الاشتراكات والفوترة والتنبيهات'
              : 'Manage subscriptions, billing, and alerts settings'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 me-2" />
          {saving
            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
            : (language === 'ar' ? 'حفظ' : 'Save')}
        </Button>
      </div>

      {/* إعدادات التنبيهات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إعدادات التنبيهات' : 'Alerts Settings'}
          </CardTitle>
          <CardDescription>
            {language === 'ar'
              ? 'تخصيص تنبيهات انتهاء الاشتراكات'
              : 'Customize subscription expiry notifications'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* تفعيل التنبيهات */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">
                {language === 'ar' ? 'تفعيل نظام التنبيهات' : 'Enable Alerts System'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'تلقي إشعارات قبل انتهاء الاشتراكات'
                  : 'Receive notifications before subscription expiry'}
              </p>
            </div>
            <Switch
              checked={settings.enable_alerts}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_alerts: checked })}
            />
          </div>

          <Separator />

          {/* أيام التنبيه */}
          <div className="space-y-2">
            <Label className="text-base">
              {language === 'ar' ? 'أيام التنبيه قبل الانتهاء' : 'Alert Days Before Expiry'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {language === 'ar'
                ? 'أدخل الأيام مفصولة بفواصل (مثال: 7, 3, 1)'
                : 'Enter days separated by commas (example: 7, 3, 1)'}
            </p>
            <Input
              value={alertDaysInput}
              onChange={(e) => setAlertDaysInput(e.target.value)}
              placeholder="7, 3, 1"
              disabled={!settings.enable_alerts}
            />
            <div className="flex gap-2 flex-wrap">
              {alertDaysInput.split(',').map((day, idx) => {
                const parsed = parseInt(day.trim());
                if (isNaN(parsed)) return null;
                return (
                  <Badge key={idx} variant="secondary">
                    {parsed === 0
                      ? (language === 'ar' ? 'يوم الانتهاء' : 'Expiry day')
                      : `${parsed} ${language === 'ar' ? 'يوم قبل' : 'days before'}`
                    }
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* إرسال Email */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">
                {language === 'ar' ? 'إرسال تنبيهات Email' : 'Send Email Alerts'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إرسال التنبيهات عبر البريد الإلكتروني' : 'Send alerts via email'}
              </p>
            </div>
            <Switch
              checked={settings.send_email_alerts}
              onCheckedChange={(checked) => setSettings({ ...settings, send_email_alerts: checked })}
              disabled={!settings.enable_alerts}
            />
          </div>

          {/* إرسال SMS */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">
                {language === 'ar' ? 'إرسال تنبيهات SMS' : 'Send SMS Alerts'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إرسال التنبيهات عبر الرسائل القصيرة' : 'Send alerts via SMS'}
              </p>
            </div>
            <Switch
              checked={settings.send_sms_alerts}
              onCheckedChange={(checked) => setSettings({ ...settings, send_sms_alerts: checked })}
              disabled={!settings.enable_alerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الفوترة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إعدادات الفوترة' : 'Billing Settings'}
          </CardTitle>
          <CardDescription>
            {language === 'ar'
              ? 'تخصيص نظام الحساب والفوترة'
              : 'Customize billing and calculation system'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* نمط الفوترة */}
          <div className="space-y-2">
            <Label className="text-base">
              {language === 'ar' ? 'نمط الفوترة الافتراضي' : 'Default Billing Mode'}
            </Label>
            <Select
              value={settings.default_billing_mode}
              onValueChange={(value) => setSettings({ ...settings, default_billing_mode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">
                  {language === 'ar' ? '📅 شهري (Monthly)' : '📅 Monthly'}
                </SelectItem>
                <SelectItem value="daily">
                  {language === 'ar' ? '📆 يومي (Daily)' : '📆 Daily'}
                </SelectItem>
                <SelectItem value="flexible">
                  {language === 'ar' ? '🔄 مرن (Flexible) - موصى به' : '🔄 Flexible - Recommended'}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.default_billing_mode === 'flexible' && (
                language === 'ar'
                  ? '✅ النمط المرن يحسب الأيام بدقة ويدعم الدفعات الجزئية'
                  : '✅ Flexible mode calculates days precisely and supports partial payments'
              )}
            </p>
          </div>

          <Separator />

          {/* الحد الأدنى للأيام */}
          <div className="space-y-2">
            <Label className="text-base">
              {language === 'ar' ? 'الحد الأدنى لعدد الأيام' : 'Minimum Days'}
            </Label>
            <Input
              type="number"
              min="1"
              value={settings.default_minimum_days}
              onChange={(e) => setSettings({
                ...settings,
                default_minimum_days: parseInt(e.target.value) || 1
              })}
            />
            <p className="text-xs text-muted-foreground">
              {language === 'ar'
                ? 'الحد الأدنى للأيام المطلوبة للتفعيل (موصى به: 7 أيام)'
                : 'Minimum days required for activation (recommended: 7 days)'}
            </p>
          </div>

          <Separator />

          {/* فترة السماح */}
          <div className="space-y-2">
            <Label className="text-base">
              {language === 'ar' ? 'فترة السماح (بالأيام)' : 'Grace Period (Days)'}
            </Label>
            <Input
              type="number"
              min="0"
              value={settings.default_grace_period_days}
              onChange={(e) => setSettings({
                ...settings,
                default_grace_period_days: parseInt(e.target.value) || 0
              })}
            />
            <p className="text-xs text-muted-foreground">
              {language === 'ar'
                ? 'عدد الأيام بعد الانتهاء قبل تعليق الخدمة (موصى به: 3 أيام)'
                : 'Days after expiry before service suspension (recommended: 3 days)'}
            </p>
          </div>

          <Separator />

          {/* التعليق التلقائي */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {language === 'ar' ? 'التعليق التلقائي بعد فترة السماح' : 'Auto-suspend After Grace Period'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'إيقاف الخدمة تلقائياً للحسابات المنتهية بعد فترة السماح'
                  : 'Automatically suspend expired accounts after grace period'}
              </p>
            </div>
            <Switch
              checked={settings.auto_suspend_after_grace}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                auto_suspend_after_grace: checked
              })}
            />
          </div>

          <Separator />

          {/* الدفعات الجزئية */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">
                {language === 'ar' ? 'السماح بالدفعات الجزئية' : 'Allow Partial Payments'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'السماح بدفع مبلغ أقل من سعر الباقة الشهري'
                  : 'Allow payments less than monthly plan price'}
              </p>
            </div>
            <Switch
              checked={settings.allow_partial_payments}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                allow_partial_payments: checked
              })}
            />
          </div>

          {/* الدفعات الزائدة */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">
                {language === 'ar' ? 'السماح بالدفعات الزائدة' : 'Allow Overpayments'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'حفظ الرصيد المتبقي من الدفعات الزائدة'
                  : 'Save remaining balance from overpayments'}
              </p>
            </div>
            <Switch
              checked={settings.allow_overpayments}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                allow_overpayments: checked
              })}
            />
          </div>

          <Separator />

          {/* العملة الافتراضية */}
          <div className="space-y-2">
            <Label className="text-base">
              {language === 'ar' ? 'العملة الافتراضية' : 'Default Currency'}
            </Label>
            <Select
              value={settings.default_currency}
              onValueChange={(value) => setSettings({ ...settings, default_currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">🇺🇸 USD - Dollar</SelectItem>
                <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                <SelectItem value="TRY">🇹🇷 TRY - Turkish Lira</SelectItem>
                <SelectItem value="GBP">🇬🇧 GBP - Pound Sterling</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات المحاسبة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إعدادات المحاسبة' : 'Accounting Settings'}
          </CardTitle>
          <CardDescription>
            {language === 'ar'
              ? 'ربط نظام الدفعات بالمحاسبة'
              : 'Link payment system with accounting'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* إنشاء قيود تلقائية */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">
                {language === 'ar' ? 'إنشاء قيود محاسبية تلقائية' : 'Create Automatic Accounting Entries'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'إنشاء قيد محاسبي تلقائياً عند كل دفعة'
                  : 'Automatically create journal entry for each payment'}
              </p>
            </div>
            <Switch
              checked={settings.create_accounting_entries}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                create_accounting_entries: checked
              })}
            />
          </div>

          {settings.create_accounting_entries && (
            <>
              <Separator />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-blue-900">
                      {language === 'ar' ? 'القيد المحاسبي التلقائي:' : 'Automatic Journal Entry:'}
                    </p>
                    <div className="space-y-1 text-blue-800">
                      <p>
                        {language === 'ar'
                          ? 'من حـ/ الصندوق أو البنك (حسب طريقة الدفع)'
                          : 'From: Cash Box or Bank (based on payment method)'}
                      </p>
                      <p>
                        {language === 'ar'
                          ? 'إلى حـ/ إيرادات الاشتراكات'
                          : 'To: Subscription Revenue'}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        {language === 'ar'
                          ? '✅ يتم إنشاء القيد فوراً عند تفعيل الاشتراك'
                          : '✅ Entry created immediately upon subscription activation'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* إعدادات التحقق بخطوتين */}
      <MfaSystemSettingsCard />

      {/* ملخص الإعدادات */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">
            {language === 'ar' ? '📊 ملخص الإعدادات الحالية' : '📊 Current Settings Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{language === 'ar' ? 'نظام الحساب:' : 'Billing Mode:'}</span>
              <p className="font-semibold">
                {settings.default_billing_mode === 'flexible'
                  ? (language === 'ar' ? '🔄 مرن' : '🔄 Flexible')
                  : settings.default_billing_mode === 'monthly'
                    ? (language === 'ar' ? '📅 شهري' : '📅 Monthly')
                    : (language === 'ar' ? '📆 يومي' : '📆 Daily')
                }
              </p>
            </div>

            <div>
              <span className="text-muted-foreground">{language === 'ar' ? 'الحد الأدنى:' : 'Minimum Days:'}</span>
              <p className="font-semibold">{settings.default_minimum_days} {language === 'ar' ? 'يوم' : 'days'}</p>
            </div>

            <div>
              <span className="text-muted-foreground">{language === 'ar' ? 'فترة السماح:' : 'Grace Period:'}</span>
              <p className="font-semibold">{settings.default_grace_period_days} {language === 'ar' ? 'يوم' : 'days'}</p>
            </div>

            <div>
              <span className="text-muted-foreground">{language === 'ar' ? 'التعليق التلقائي:' : 'Auto Suspend:'}</span>
              <p className="font-semibold">
                {settings.auto_suspend_after_grace
                  ? (language === 'ar' ? '✅ مفعّل' : '✅ Enabled')
                  : (language === 'ar' ? '❌ معطل' : '❌ Disabled')
                }
              </p>
            </div>

            <div>
              <span className="text-muted-foreground">{language === 'ar' ? 'القيود المحاسبية:' : 'Accounting Entries:'}</span>
              <p className="font-semibold">
                {settings.create_accounting_entries
                  ? (language === 'ar' ? '✅ تلقائية' : '✅ Automatic')
                  : (language === 'ar' ? '❌ معطلة' : '❌ Disabled')
                }
              </p>
            </div>

            <div>
              <span className="text-muted-foreground">{language === 'ar' ? 'التنبيهات:' : 'Alerts:'}</span>
              <p className="font-semibold">
                {settings.enable_alerts
                  ? `✅ ${settings.alert_days_before.length} ${language === 'ar' ? 'تنبيه' : 'alerts'}`
                  : (language === 'ar' ? '❌ معطلة' : '❌ Disabled')
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-5 w-5 me-2" />
          {saving
            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
            : (language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')}
        </Button>
      </div>
    </div>
  );
}
