/**
 * SaaS Settings Page
 * صفحة إعدادات SaaS - تجمع الوحدات والإعدادات العامة
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Settings,
  Package,
  Webhook,
  Shield,
  Bell,
  Database,
  Globe,
  Mail,
  Key,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Server,
  Lock,
  Users,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import Module Management
import ModuleManagement from './components/ModuleManagement';
import { CompanySwitcher } from '@/components/settings/CompanySwitcher';
import SubscriptionAlerts from '@/pages/SubscriptionAlerts';
import BillingAccountingSettings from '@/pages/SaasSettings';

// Mock webhooks data
const mockWebhooks = [
  { id: 1, name: 'New Subscription', url: 'https://api.example.com/webhooks/subscription', events: ['subscription.created'], status: 'active', lastTriggered: '2024-01-20' },
  { id: 2, name: 'Payment Received', url: 'https://api.example.com/webhooks/payment', events: ['payment.completed'], status: 'active', lastTriggered: '2024-01-19' },
  { id: 3, name: 'User Activity', url: 'https://api.example.com/webhooks/activity', events: ['user.login', 'user.logout'], status: 'inactive', lastTriggered: '2024-01-15' },
];

// Mock API keys data
const mockApiKeys = [
  { id: 1, name: 'Production API', key: 'sk_prod_****************************', permissions: ['read', 'write'], created: '2024-01-01', lastUsed: '2024-01-20' },
  { id: 2, name: 'Testing API', key: 'sk_test_****************************', permissions: ['read'], created: '2024-01-15', lastUsed: '2024-01-18' },
];

export default function SaaSSettings() {
  const { t, language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('billing');
  const [webhooks, setWebhooks] = useState(mockWebhooks);
  const [apiKeys, setApiKeys] = useState(mockApiKeys);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Namaa Systems',
    supportEmail: 'support@namaa.com',
    defaultLanguage: 'ar',
    defaultCurrency: 'SAR',
    trialDays: 14,
    enableAutoRenewal: true,
    enableUsageAlerts: true,
    enableWeeklyReports: true,
    maintenanceMode: false,
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    requireTwoFactor: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    enforceStrongPasswords: true,
    enableAuditLog: true,
    ipWhitelist: '',
  });

  const handleToggleWebhook = (id: number) => {
    setWebhooks(prev => prev.map(w =>
      w.id === id ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' } : w
    ));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Settings className="w-7 h-7 text-erp-teal" />
            {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal mt-1">
            {language === 'ar' ? 'إدارة الوحدات والإعدادات العامة للنظام' : 'Manage modules and general system settings'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
        <TabsList className="w-full justify-start bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 rounded-lg mb-6 overflow-x-auto">
          <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <DollarSign className="w-4 h-4" />
            {language === 'ar' ? 'الفوترة والمحاسبة' : 'Billing & Accounting'}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Bell className="w-4 h-4" />
            {language === 'ar' ? 'التنبيهات' : 'Alerts'}
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <ArrowRightLeft className="w-4 h-4" />
            {language === 'ar' ? 'الشركات' : 'Companies'}
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Package className="w-4 h-4" />
            {language === 'ar' ? 'الوحدات' : 'Modules'}
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Settings className="w-4 h-4" />
            {language === 'ar' ? 'عام' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Key className="w-4 h-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Shield className="w-4 h-4" />
            {language === 'ar' ? 'الأمان' : 'Security'}
          </TabsTrigger>
        </TabsList>

        {/* Billing & Accounting Settings Tab */}
        <TabsContent value="billing">
          <BillingAccountingSettings />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <SubscriptionAlerts />
        </TabsContent>

        {/* Company Switcher Tab */}
        <TabsContent value="company">
          <CompanySwitcher />
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <ModuleManagement />
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Globe className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'معلومات الشركة' : 'Company Info'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم الشركة' : 'Company Name'}</Label>
                  <Input
                    value={generalSettings.companyName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'بريد الدعم' : 'Support Email'}</Label>
                  <Input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}</Label>
                    <Select
                      value={generalSettings.defaultLanguage}
                      onValueChange={(v) => setGeneralSettings({ ...generalSettings, defaultLanguage: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'العملة الافتراضية' : 'Default Currency'}</Label>
                    <Select
                      value={generalSettings.defaultCurrency}
                      onValueChange={(v) => setGeneralSettings({ ...generalSettings, defaultCurrency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                        <SelectItem value="USD">USD - دولار</SelectItem>
                        <SelectItem value="EUR">EUR - يورو</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Clock className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'إعدادات الاشتراك' : 'Subscription Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'أيام التجربة' : 'Trial Days'}</Label>
                  <Input
                    type="number"
                    value={generalSettings.trialDays}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, trialDays: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{language === 'ar' ? 'التجديد التلقائي' : 'Auto Renewal'}</Label>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'تجديد الاشتراكات تلقائياً' : 'Automatically renew subscriptions'}</p>
                  </div>
                  <Switch
                    checked={generalSettings.enableAutoRenewal}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, enableAutoRenewal: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{language === 'ar' ? 'تنبيهات الاستخدام' : 'Usage Alerts'}</Label>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'إرسال تنبيهات عند تجاوز الحدود' : 'Send alerts when limits exceeded'}</p>
                  </div>
                  <Switch
                    checked={generalSettings.enableUsageAlerts}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, enableUsageAlerts: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Bell className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{language === 'ar' ? 'التقارير الأسبوعية' : 'Weekly Reports'}</Label>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'إرسال تقرير أسبوعي بالبريد' : 'Send weekly email reports'}</p>
                  </div>
                  <Switch
                    checked={generalSettings.enableWeeklyReports}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, enableWeeklyReports: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Server className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'حالة النظام' : 'System Status'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <Label className="text-amber-700 dark:text-amber-400">{language === 'ar' ? 'وضع الصيانة' : 'Maintenance Mode'}</Label>
                      <p className="text-xs text-amber-600">{language === 'ar' ? 'تعطيل الوصول للمستخدمين' : 'Disable user access'}</p>
                    </div>
                  </div>
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceMode: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button className="bg-erp-teal hover:bg-erp-teal/90">
              {t('common.save')}
            </Button>
          </div>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {language === 'ar' ? 'إدارة webhooks للتكامل مع الأنظمة الخارجية' : 'Manage webhooks for external system integration'}
            </p>
            <Button size="sm" className="bg-erp-teal hover:bg-erp-teal/90">
              <Plus className="w-4 h-4 me-2" />
              {language === 'ar' ? 'إضافة Webhook' : 'Add Webhook'}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>{language === 'ar' ? 'الأحداث' : 'Events'}</TableHead>
                    <TableHead>{t('common.status._')}</TableHead>
                    <TableHead>{language === 'ar' ? 'آخر تشغيل' : 'Last Triggered'}</TableHead>
                    <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500 max-w-[200px] truncate">{webhook.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">{event}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={webhook.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                          }
                        >
                          {webhook.status === 'active' ? (
                            <><CheckCircle className="w-3 h-3 me-1" />{t('saas.status.active')}</>
                          ) : (
                            <><XCircle className="w-3 h-3 me-1" />{t('saas.status.inactive')}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-500">{webhook.lastTriggered}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 me-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleWebhook(webhook.id)}>
                              {webhook.status === 'active' ? (
                                <><XCircle className="w-4 h-4 me-2" />{language === 'ar' ? 'تعطيل' : 'Disable'}</>
                              ) : (
                                <><CheckCircle className="w-4 h-4 me-2" />{language === 'ar' ? 'تفعيل' : 'Enable'}</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 me-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {language === 'ar' ? 'إدارة مفاتيح API للوصول البرمجي' : 'Manage API keys for programmatic access'}
            </p>
            <Button size="sm" className="bg-erp-teal hover:bg-erp-teal/90">
              <Plus className="w-4 h-4 me-2" />
              {language === 'ar' ? 'إنشاء مفتاح' : 'Create Key'}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المفتاح' : 'Key'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الصلاحيات' : 'Permissions'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                    <TableHead>{language === 'ar' ? 'آخر استخدام' : 'Last Used'}</TableHead>
                    <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{apiKey.key}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {apiKey.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-500">{apiKey.created}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-500">{apiKey.lastUsed}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 me-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'إعادة توليد' : 'Regenerate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'إلغاء' : 'Revoke'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Lock className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'المصادقة' : 'Authentication'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Auth'}</Label>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'إلزام المستخدمين بالمصادقة الثنائية' : 'Require 2FA for all users'}</p>
                  </div>
                  <Switch
                    checked={securitySettings.requireTwoFactor}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireTwoFactor: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'مهلة الجلسة (دقائق)' : 'Session Timeout (minutes)'}</Label>
                  <Input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الحد الأقصى لمحاولات الدخول' : 'Max Login Attempts'}</Label>
                  <Input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Password Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Key className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'سياسة كلمات المرور' : 'Password Policy'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{language === 'ar' ? 'كلمات مرور قوية' : 'Strong Passwords'}</Label>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'إلزام استخدام كلمات مرور قوية' : 'Enforce strong password requirements'}</p>
                  </div>
                  <Switch
                    checked={securitySettings.enforceStrongPasswords}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enforceStrongPasswords: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Audit Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Database className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{language === 'ar' ? 'تفعيل سجل التدقيق' : 'Enable Audit Log'}</Label>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'تسجيل جميع العمليات' : 'Log all system operations'}</p>
                  </div>
                  <Switch
                    checked={securitySettings.enableAuditLog}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enableAuditLog: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* IP Whitelist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo flex items-center gap-2">
                  <Shield className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'قائمة IP المسموح' : 'IP Whitelist'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'عناوين IP المسموح بها' : 'Allowed IP Addresses'}</Label>
                  <Textarea
                    placeholder={language === 'ar' ? 'أدخل عنوان IP واحد في كل سطر' : 'Enter one IP address per line'}
                    value={securitySettings.ipWhitelist}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    {language === 'ar' ? 'اتركه فارغاً للسماح لجميع العناوين' : 'Leave empty to allow all IPs'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button className="bg-erp-teal hover:bg-erp-teal/90">
              {t('common.save')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
