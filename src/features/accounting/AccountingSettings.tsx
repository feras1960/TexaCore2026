import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Building2, DollarSign, Calendar, FileText, Globe } from 'lucide-react';

export default function AccountingSettings() {
  const { t, direction } = useLanguage();
  const [settings, setSettings] = useState({
    companyName: 'شركة النظام المتكامل',
    currency: 'SAR',
    fiscalYearStart: '01-01',
    fiscalYearEnd: '12-31',
    taxEnabled: true,
    vatRate: 15,
    autoPostEntries: false,
    requireApproval: true,
    defaultDebitAccount: '',
    defaultCreditAccount: '',
  });

  const handleSave = () => {
    // TODO: Save to Supabase
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Settings className="w-7 h-7 text-erp-teal" />
            {t('accounting.settings')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {t('accounting.settingsDescription')}
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-erp-teal" />
                {t('accounting.settingsSections.company')}
              </CardTitle>
              <CardDescription>{t('accounting.settingsSections.companyDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('accounting.settingsFields.companyName')}</Label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('accounting.settingsFields.baseCurrency')}</Label>
                <Select value={settings.currency} onValueChange={(v) => setSettings(prev => ({ ...prev, currency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Year Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-erp-teal" />
                {t('accounting.settingsSections.fiscalYear')}
              </CardTitle>
              <CardDescription>{t('accounting.settingsSections.fiscalYearDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('accounting.settingsFields.fiscalYearStart')}</Label>
                  <Input
                    type="date"
                    value={`2024-${settings.fiscalYearStart}`}
                    onChange={(e) => {
                      const date = e.target.value.split('-');
                      setSettings(prev => ({ ...prev, fiscalYearStart: `${date[1]}-${date[2]}` }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('accounting.settingsFields.fiscalYearEnd')}</Label>
                  <Input
                    type="date"
                    value={`2024-${settings.fiscalYearEnd}`}
                    onChange={(e) => {
                      const date = e.target.value.split('-');
                      setSettings(prev => ({ ...prev, fiscalYearEnd: `${date[1]}-${date[2]}` }));
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax & VAT Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-erp-teal" />
                {t('accounting.settingsSections.tax')}
              </CardTitle>
              <CardDescription>{t('accounting.settingsSections.taxDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('accounting.settingsFields.enableTax')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.settingsFields.enableTaxDesc')}</p>
                </div>
                <Switch
                  checked={settings.taxEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, taxEnabled: checked }))}
                />
              </div>
              {settings.taxEnabled && (
                <div className="space-y-2">
                  <Label>{t('accounting.settingsFields.vatRate')}</Label>
                  <Input
                    type="number"
                    value={settings.vatRate}
                    onChange={(e) => setSettings(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounting Workflow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-erp-teal" />
                {t('accounting.settingsSections.workflow')}
              </CardTitle>
              <CardDescription>{t('accounting.settingsSections.workflowDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('accounting.settingsFields.autoPostEntries')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.settingsFields.autoPostEntriesDesc')}</p>
                </div>
                <Switch
                  checked={settings.autoPostEntries}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoPostEntries: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('accounting.settingsFields.requireApproval')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.settingsFields.requireApprovalDesc')}</p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireApproval: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                {t('accounting.settingsInfo.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>{t('accounting.settingsInfo.desc1')}</p>
              <p>{t('accounting.settingsInfo.desc2')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
