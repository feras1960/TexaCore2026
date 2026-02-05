import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Settings, Save, Building2, DollarSign, Calendar, FileText,
  Globe, Wallet, Hash, AlertTriangle, CheckCircle2, Loader2,
  ChevronRight, RefreshCw, Edit2, Lock, Info, AlertCircle,
  Link2, Unlink, Users
} from 'lucide-react';
import UserPermissionsTab from './components/UserPermissionsTab';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Types
interface CompanySettings {
  id?: string;
  company_id: string;
  base_currency: string;
  decimal_places: number;
  date_format: string;
  number_format: string;
  vat_enabled: boolean;
  vat_rate: number;
  auto_post_entries: boolean;
  require_approval: boolean;
  default_cash_account_id?: string;
  default_bank_account_id?: string;
  default_revenue_account_id?: string;
  default_expense_account_id?: string;
  default_receivable_account_id?: string;
  default_payable_account_id?: string;
  journal_entry_prefix: string;
  reset_numbering_yearly: boolean;
  current_entry_number: number;
  // New Currency Fields
  supported_currencies?: string[];
  default_sales_currency?: string;
  default_purchase_currency?: string;
  default_international_purchase_currency?: string;
}

interface FiscalYear {
  id: string;
  year_number: number;
  name_ar: string;
  name_en: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  is_current: boolean;
}

interface Account {
  id: string;
  account_code: string;
  name_ar: string;
  name_en: string;
}

// Accounting Settings from companies.accounting_settings
interface AccountingEditSettings {
  fiscal_year_mode: 'independent' | 'linked';
  edit_settings: {
    allow_direct_edit_posted: boolean;
    auto_repost_after_save: boolean;
    require_edit_reason: boolean;
    notify_on_posted_edit: boolean;
  };
  closed_period_settings: {
    allow_edit_closed_period: boolean;
    require_manager_approval: boolean;
  };
  closed_year_settings: {
    allow_edit_closed_year: boolean;
    allow_delete_closed_year: boolean;
    require_adjustment_entry: boolean;
    auto_link_adjustments: boolean;
  };
  notifications: {
    notify_cfo_on_closed_year_edit: boolean;
    notify_on_large_adjustments: boolean;
    large_adjustment_threshold: number;
  };
}

// ... existing interfaces ...

export default function AccountingSettings() {
  const { t, language, direction } = useLanguage();
  const { toast } = useToast();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states - defaults will be overwritten by company settings on load
  const [settings, setSettings] = useState<CompanySettings>({
    company_id: '',
    base_currency: '', // Will be loaded from company settings
    decimal_places: 2,
    date_format: 'DD/MM/YYYY',
    number_format: 'en-US',
    vat_enabled: true,
    vat_rate: 15,
    auto_post_entries: false,
    require_approval: true,
    journal_entry_prefix: 'JE',
    reset_numbering_yearly: true,
    current_entry_number: 1,
    supported_currencies: [], // Will be loaded from company settings
    default_sales_currency: '', // Will use base_currency from company
    default_purchase_currency: '', // Will use base_currency from company
    default_international_purchase_currency: 'USD',
  });

  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  // جلب العملات من قاعدة البيانات بدلاً من القائمة الثابتة
  const [currencies, setCurrencies] = useState<{ code: string; name: string; nameEn: string; symbol: string }[]>([]);
  const [currencySearch, setCurrencySearch] = useState('');

  // Edit & Fiscal Year Settings
  const [editSettings, setEditSettings] = useState<AccountingEditSettings>({
    fiscal_year_mode: 'independent',
    edit_settings: {
      allow_direct_edit_posted: true,
      auto_repost_after_save: true,
      require_edit_reason: true,
      notify_on_posted_edit: false,
    },
    closed_period_settings: {
      allow_edit_closed_period: false,
      require_manager_approval: true,
    },
    closed_year_settings: {
      allow_edit_closed_year: true,
      allow_delete_closed_year: false,
      require_adjustment_entry: false,
      auto_link_adjustments: true,
    },
    notifications: {
      notify_cfo_on_closed_year_edit: true,
      notify_on_large_adjustments: true,
      large_adjustment_threshold: 10000,
    },
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get company ID and default currency
      const { data: companies } = await supabase
        .from('companies')
        .select('id, default_currency')
        .limit(1)
        .single();

      if (companies) {
        const companyBaseCurrency = companies.default_currency || 'USD';

        // Load settings
        const { data: settingsData } = await supabase
          .from('company_accounting_settings')
          .select('*')
          .eq('company_id', companies.id)
          .single();

        if (settingsData) {
          setSettings({
            ...settingsData,
            supported_currencies: settingsData.supported_currencies || [companyBaseCurrency],
            default_sales_currency: settingsData.default_sales_currency || companyBaseCurrency,
            default_purchase_currency: settingsData.default_purchase_currency || companyBaseCurrency,
            default_international_purchase_currency: settingsData.default_international_purchase_currency || 'USD',
          });
        } else {
          setSettings(prev => ({ ...prev, company_id: companies.id, base_currency: companyBaseCurrency }));
        }

        // Load accounting_settings from companies table (for edit/fiscal year mode)
        const { data: companyData } = await supabase
          .from('companies')
          .select('accounting_settings')
          .eq('id', companies.id)
          .single();

        if (companyData?.accounting_settings) {
          setEditSettings(prev => ({
            ...prev,
            ...companyData.accounting_settings,
          }));
        }

        // Load fiscal years
        const { data: yearsData } = await supabase
          .from('fiscal_years')
          .select('*')
          .order('start_date', { ascending: false });

        if (yearsData) setFiscalYears(yearsData);

        // Load accounts for dropdowns
        const { data: accountsData } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, name_ar, name_en')
          .eq('is_detail', true)
          .eq('is_active', true)
          .order('account_code');

        if (accountsData) setAccounts(accountsData);

        // ✨ Load ALL currencies from database (remove duplicates)
        const { data: currenciesData } = await supabase
          .from('currencies')
          .select('code, name, name_ar, symbol')
          .order('code');

        if (currenciesData) {
          // Remove duplicates using Map
          const uniqueCurrencies = new Map();
          currenciesData.forEach(c => {
            if (!uniqueCurrencies.has(c.code)) {
              uniqueCurrencies.set(c.code, {
                code: c.code,
                name: c.name_ar || c.name,
                nameEn: c.name,
                symbol: c.symbol
              });
            }
          });
          setCurrencies(Array.from(uniqueCurrencies.values()));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ في تحميل الإعدادات' : 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save company_accounting_settings
      const { error } = await supabase
        .from('company_accounting_settings')
        .upsert(settings, { onConflict: 'company_id' });

      if (error) throw error;

      // Try to save accounting_settings (edit/fiscal year mode) to companies table
      // This may fail if the column doesn't exist yet (migration not applied)
      try {
        const { error: companyError } = await supabase
          .from('companies')
          .update({ accounting_settings: editSettings })
          .eq('id', settings.company_id);

        if (companyError) {
          console.warn('Could not save accounting_settings (column may not exist):', companyError);
          // Don't throw - just warn, as the main settings were saved
        }
      } catch (editError) {
        console.warn('Could not save edit settings:', editError);
      }

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ في حفظ الإعدادات' : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSupportedCurrency = (code: string) => {
    const current = settings.supported_currencies || [];
    const isSupported = current.includes(code);
    let newSupported;

    if (isSupported) {
      // Don't allow removing base currency
      if (code === settings.base_currency) {
        toast({
          title: language === 'ar' ? 'لا يمكن الحذف' : 'Cannot Remove',
          description: language === 'ar' ? 'لا يمكن إزالة العملة الأساسية' : 'Cannot remove base currency',
          variant: 'destructive',
        });
        return;
      }
      newSupported = current.filter(c => c !== code);
    } else {
      newSupported = [...current, code];
    }

    updateSetting('supported_currencies', newSupported);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-erp-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Settings className="w-7 h-7 text-erp-teal" />
            {language === 'ar' ? 'إعدادات المحاسبة' : 'Accounting Settings'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar'
              ? 'تكوين إعدادات قسم المحاسبة لشركتك'
              : 'Configure accounting module settings for your company'}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-erp-teal hover:bg-erp-teal/90"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'عام' : 'General'}</span>
          </TabsTrigger>
          <TabsTrigger value="currencies" className="gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'العملات' : 'Currencies'}</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الحسابات' : 'Accounts'}</span>
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'السنوات المالية' : 'Fiscal Years'}</span>
          </TabsTrigger>
          <TabsTrigger value="numbering" className="gap-2">
            <Hash className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الترقيم' : 'Numbering'}</span>
          </TabsTrigger>
          <TabsTrigger value="editSettings" className="gap-2">
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'التعديلات' : 'Edit Rules'}</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الصلاحيات' : 'Permissions'}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'تنسيق الأرقام' : 'Number Format'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'دقة الأرقام العشرية' : 'Decimal Places'}</Label>
                  <Select
                    value={String(settings.decimal_places)}
                    onValueChange={(v) => updateSetting('decimal_places', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}</Label>
                  <Select
                    value={settings.date_format}
                    onValueChange={(v) => updateSetting('date_format', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/01/2026)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (01/31/2026)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-01-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tax Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'الضريبة' : 'Tax Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'تفعيل ضريبة القيمة المضافة' : 'Enable VAT'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar' ? 'احتساب الضريبة تلقائياً' : 'Auto-calculate VAT'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.vat_enabled}
                    onCheckedChange={(v) => updateSetting('vat_enabled', v)}
                  />
                </div>
                {settings.vat_enabled && (
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نسبة الضريبة %' : 'VAT Rate %'}</Label>
                    <Input
                      type="number"
                      value={settings.vat_rate}
                      onChange={(e) => updateSetting('vat_rate', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Settings */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'سير العمل' : 'Workflow'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'ترحيل تلقائي للقيود' : 'Auto-post Entries'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'ترحيل القيود تلقائياً بعد الحفظ'
                        : 'Auto-post entries after saving'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_post_entries}
                    onCheckedChange={(v) => updateSetting('auto_post_entries', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'طلب موافقة' : 'Require Approval'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'طلب موافقة قبل الترحيل'
                        : 'Require approval before posting'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_approval}
                    onCheckedChange={(v) => updateSetting('require_approval', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Currency Tab (NEW) */}
        <TabsContent value="currencies" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'إدارة العملات' : 'Currency Management'}
              </CardTitle>
              <CardDescription>
                {t('currencySettingsDesc') || (language === 'ar' ? 'حدد العملات المدعومة والعملات الافتراضية لكل نظام' : 'Configure supported currencies and default module currencies')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Base Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-erp-navy">{language === 'ar' ? 'العملة الأساسية' : 'Base Currency'}</Label>
                  <Select
                    value={settings.base_currency}
                    onValueChange={(v) => {
                      updateSetting('base_currency', v);
                      // Ensure base currency is always supported
                      if (!settings.supported_currencies?.includes(v)) {
                        toggleSupportedCurrency(v);
                      }
                    }}
                  >
                    <SelectTrigger className="font-mono bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} - {language === 'ar' ? c.name : c.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {language === 'ar' ? 'العملة المستخدمة في التقارير المالية الرئيسية' : 'Currency used for main financial reporting'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Supported Currencies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-erp-navy">
                    {language === 'ar' ? 'العملات المفعلة' : 'Supported Currencies'}
                    <Badge variant="outline" className="ms-2">
                      {settings.supported_currencies?.length || 0}
                    </Badge>
                  </Label>
                  {/* Search Input */}
                  <div className="relative w-64">
                    <Input
                      placeholder={language === 'ar' ? 'ابحث عن عملة...' : 'Search currency...'}
                      value={currencySearch}
                      onChange={(e) => setCurrencySearch(e.target.value)}
                      className="ps-9"
                    />
                    <Globe className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Currently Active Currencies */}
                {settings.supported_currencies && settings.supported_currencies.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
                    {settings.supported_currencies.map(code => {
                      const currency = currencies.find(c => c.code === code);
                      const isBase = code === settings.base_currency;
                      return (
                        <Badge
                          key={code}
                          variant={isBase ? "default" : "secondary"}
                          className={`gap-1 ${!isBase ? 'cursor-pointer hover:bg-red-100 hover:text-red-700' : ''}`}
                          onClick={() => !isBase && toggleSupportedCurrency(code)}
                        >
                          {currency?.symbol || code} {code}
                          {!isBase && <span className="ms-1 text-xs">×</span>}
                          {isBase && <span className="ms-1 text-xs">★</span>}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-slate-500">
                  {language === 'ar'
                    ? 'انقر على العملة لإضافتها أو إزالتها من قائمة العملات المفعلة'
                    : 'Click on a currency to add or remove it from supported currencies'}
                </p>

                {/* All Currencies Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-80 overflow-y-auto p-1">
                  {currencies
                    .filter(currency =>
                      currencySearch === '' ||
                      currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                      currency.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                      currency.nameEn.toLowerCase().includes(currencySearch.toLowerCase())
                    )
                    .map((currency) => {
                      const isSelected = settings.supported_currencies?.includes(currency.code);
                      const isBase = currency.code === settings.base_currency;
                      return (
                        <div
                          key={currency.code}
                          onClick={() => !isBase && toggleSupportedCurrency(currency.code)}
                          className={`
                            relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${isSelected
                              ? 'border-erp-teal bg-erp-teal/5 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'}
                            ${isBase ? 'border-orange-300 bg-orange-50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold font-mono text-base text-erp-navy">{currency.code}</span>
                            <span className="text-lg">{currency.symbol}</span>
                          </div>
                          <span className="text-xs text-slate-600 truncate">
                            {language === 'ar' ? currency.name : currency.nameEn}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="absolute top-1 end-1 w-4 h-4 text-erp-teal" />
                          )}
                          {isBase && (
                            <Badge variant="secondary" className="mt-1 w-fit text-[9px]">
                              {language === 'ar' ? 'الأساسية' : 'Base'}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <Separator />

              {/* Module Defaults */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-erp-navy">{language === 'ar' ? 'العملات الافتراضية للأنظمة' : 'Module Default Currencies'}</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Sales */}
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المبيعات' : 'Sales'}</Label>
                    <Select
                      value={settings.default_sales_currency}
                      onValueChange={(v) => updateSetting('default_sales_currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.supported_currencies?.map(code => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Local Purchases */}
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المشتريات المحلية' : 'Local Purchases'}</Label>
                    <Select
                      value={settings.default_purchase_currency}
                      onValueChange={(v) => updateSetting('default_purchase_currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.supported_currencies?.map(code => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* International Purchases */}
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المشتريات الدولية' : 'International Purchases'}</Label>
                    <Select
                      value={settings.default_international_purchase_currency}
                      onValueChange={(v) => updateSetting('default_international_purchase_currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.supported_currencies?.map(code => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Accounts Tab */}
        <TabsContent value="accounts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'الحسابات الافتراضية' : 'Default Accounts'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'حدد الحسابات الافتراضية للعمليات المحاسبية'
                  : 'Set default accounts for accounting operations'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash Account */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حساب الصندوق الافتراضي' : 'Default Cash Account'}</Label>
                <Select
                  value={settings.default_cash_account_id || ''}
                  onValueChange={(v) => updateSetting('default_cash_account_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.account_code.startsWith('1')).map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bank Account */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حساب البنك الافتراضي' : 'Default Bank Account'}</Label>
                <Select
                  value={settings.default_bank_account_id || ''}
                  onValueChange={(v) => updateSetting('default_bank_account_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.account_code.startsWith('1')).map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Revenue Account */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حساب الإيرادات الافتراضي' : 'Default Revenue Account'}</Label>
                <Select
                  value={settings.default_revenue_account_id || ''}
                  onValueChange={(v) => updateSetting('default_revenue_account_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.account_code.startsWith('4')).map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expense Account */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حساب المصروفات الافتراضي' : 'Default Expense Account'}</Label>
                <Select
                  value={settings.default_expense_account_id || ''}
                  onValueChange={(v) => updateSetting('default_expense_account_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.account_code.startsWith('5')).map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Receivable Account */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حساب الذمم المدينة' : 'Accounts Receivable'}</Label>
                <Select
                  value={settings.default_receivable_account_id || ''}
                  onValueChange={(v) => updateSetting('default_receivable_account_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.account_code.startsWith('1')).map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payable Account */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حساب الذمم الدائنة' : 'Accounts Payable'}</Label>
                <Select
                  value={settings.default_payable_account_id || ''}
                  onValueChange={(v) => updateSetting('default_payable_account_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.account_code.startsWith('2')).map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal Years Tab */}
        <TabsContent value="fiscal" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {language === 'ar' ? 'السنوات المالية' : 'Fiscal Years'}
              </h2>
              <p className="text-sm text-gray-500">
                {language === 'ar'
                  ? 'إدارة السنوات والفترات المحاسبية'
                  : 'Manage fiscal years and accounting periods'}
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              {language === 'ar' ? 'إضافة سنة جديدة' : 'Add New Year'}
            </Button>
          </div>

          <div className="grid gap-4">
            {fiscalYears.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{language === 'ar' ? 'لا توجد سنوات مالية' : 'No Fiscal Years'}</AlertTitle>
                <AlertDescription>
                  {language === 'ar'
                    ? 'لم يتم تعريف أي سنة مالية بعد. قم بإضافة سنة مالية جديدة.'
                    : 'No fiscal years defined yet. Add a new fiscal year.'}
                </AlertDescription>
              </Alert>
            ) : (
              fiscalYears.map(year => (
                <Card key={year.id} className={year.is_current ? 'border-erp-teal' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-erp-teal/10 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-erp-teal" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {language === 'ar' ? year.name_ar : year.name_en}
                            </span>
                            {year.is_current && (
                              <Badge variant="default" className="bg-erp-teal">
                                {language === 'ar' ? 'الحالية' : 'Current'}
                              </Badge>
                            )}
                            {year.is_closed && (
                              <Badge variant="secondary">
                                {language === 'ar' ? 'مغلقة' : 'Closed'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {year.start_date} → {year.end_date}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Numbering Tab */}
        <TabsContent value="numbering" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'ترقيم القيود' : 'Entry Numbering'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'تكوين نظام ترقيم القيود المحاسبية'
                  : 'Configure journal entry numbering system'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'بادئة رقم القيد' : 'Entry Number Prefix'}</Label>
                  <Input
                    value={settings.journal_entry_prefix}
                    onChange={(e) => updateSetting('journal_entry_prefix', e.target.value)}
                    placeholder="JE"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500">
                    {language === 'ar'
                      ? `مثال: ${settings.journal_entry_prefix}-2026-00001`
                      : `Example: ${settings.journal_entry_prefix}-2026-00001`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الرقم التسلسلي الحالي' : 'Current Sequence'}</Label>
                  <Input
                    type="number"
                    value={settings.current_entry_number}
                    onChange={(e) => updateSetting('current_entry_number', parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'إعادة الترقيم سنوياً' : 'Reset Yearly'}</Label>
                  <p className="text-sm text-gray-500">
                    {language === 'ar'
                      ? 'إعادة الترقيم من 1 مع بداية كل سنة مالية'
                      : 'Reset numbering to 1 at the start of each fiscal year'}
                  </p>
                </div>
                <Switch
                  checked={settings.reset_numbering_yearly}
                  onCheckedChange={(v) => updateSetting('reset_numbering_yearly', v)}
                />
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>{language === 'ar' ? 'التنسيق الحالي' : 'Current Format'}</AlertTitle>
                <AlertDescription className="font-mono">
                  {settings.journal_entry_prefix}-{new Date().getFullYear()}-{String(settings.current_entry_number).padStart(5, '0')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Settings Tab (NEW) */}
        <TabsContent value="editSettings" className="mt-6 space-y-6">
          {/* Fiscal Year Mode */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'نمط إدارة السنوات المالية' : 'Fiscal Year Management Mode'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'اختر كيفية التعامل مع السنوات المالية المُغلقة'
                  : 'Choose how to handle closed fiscal years'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Independent Mode */}
                <div
                  onClick={() => setEditSettings(prev => ({ ...prev, fiscal_year_mode: 'independent' }))}
                  className={`
                    relative p-6 rounded-xl border-2 cursor-pointer transition-all
                    ${editSettings.fiscal_year_mode === 'independent'
                      ? 'border-erp-teal bg-erp-teal/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${editSettings.fiscal_year_mode === 'independent' ? 'bg-erp-teal/20' : 'bg-slate-100'}`}>
                      <Unlink className={`w-6 h-6 ${editSettings.fiscal_year_mode === 'independent' ? 'text-erp-teal' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-erp-navy">
                          {language === 'ar' ? 'السنوات المستقلة' : 'Independent Years'}
                        </h3>
                        {editSettings.fiscal_year_mode === 'independent' && (
                          <CheckCircle2 className="w-5 h-5 text-erp-teal" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        {language === 'ar'
                          ? 'كل سنة مالية مُغلقة تُعتبر مستقلة. يمكن التعديل على القيود بدون التأثير على السنوات اللاحقة.'
                          : 'Each closed fiscal year is independent. You can edit entries without affecting subsequent years.'}
                      </p>
                      <Badge variant="secondary" className="mt-3">
                        {language === 'ar' ? '⚡ مُوصى به للشركات الصغيرة والمتوسطة' : '⚡ Recommended for SMBs'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Linked Mode */}
                <div
                  onClick={() => setEditSettings(prev => ({ ...prev, fiscal_year_mode: 'linked' }))}
                  className={`
                    relative p-6 rounded-xl border-2 cursor-pointer transition-all
                    ${editSettings.fiscal_year_mode === 'linked'
                      ? 'border-erp-teal bg-erp-teal/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${editSettings.fiscal_year_mode === 'linked' ? 'bg-erp-teal/20' : 'bg-slate-100'}`}>
                      <Link2 className={`w-6 h-6 ${editSettings.fiscal_year_mode === 'linked' ? 'text-erp-teal' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-erp-navy">
                          {language === 'ar' ? 'السنوات المترابطة' : 'Linked Years'}
                        </h3>
                        {editSettings.fiscal_year_mode === 'linked' && (
                          <CheckCircle2 className="w-5 h-5 text-erp-teal" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        {language === 'ar'
                          ? 'السنوات المالية مُرتبطة. لا يمكن تعديل السنوات المُغلقة. التصحيح يتم بقيد تسوية في السنة الحالية.'
                          : 'Fiscal years are linked. Cannot edit closed years. Corrections require adjustment entries in current year.'}
                      </p>
                      <Badge variant="secondary" className="mt-3">
                        {language === 'ar' ? '🏢 مُوصى به للشركات الكبيرة والمُلزمة ضريبياً' : '🏢 Recommended for large/regulated companies'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Edit2 className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'إعدادات التعديل' : 'Edit Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'تحكم في طريقة التعديل على القيود المُرحلة'
                  : 'Control how posted entries can be edited'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'السماح بالتعديل المباشر على القيود المُرحلة' : 'Allow direct edit on posted entries'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'النظام يُلغي الترحيل تلقائياً للتعديل ثم يُعيد الترحيل'
                        : 'System auto-unposts, edits, then re-posts'}
                    </p>
                  </div>
                  <Switch
                    checked={editSettings.edit_settings.allow_direct_edit_posted}
                    onCheckedChange={(v) => setEditSettings(prev => ({
                      ...prev,
                      edit_settings: { ...prev.edit_settings, allow_direct_edit_posted: v }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'إعادة الترحيل تلقائياً بعد الحفظ' : 'Auto re-post after save'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'ترحيل القيد تلقائياً بعد حفظ التعديلات'
                        : 'Automatically post entry after saving edits'}
                    </p>
                  </div>
                  <Switch
                    checked={editSettings.edit_settings.auto_repost_after_save}
                    onCheckedChange={(v) => setEditSettings(prev => ({
                      ...prev,
                      edit_settings: { ...prev.edit_settings, auto_repost_after_save: v }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'طلب سبب للتعديل' : 'Require edit reason'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'إلزام المستخدم بإدخال سبب عند التعديل'
                        : 'Require user to enter a reason when editing'}
                    </p>
                  </div>
                  <Switch
                    checked={editSettings.edit_settings.require_edit_reason}
                    onCheckedChange={(v) => setEditSettings(prev => ({
                      ...prev,
                      edit_settings: { ...prev.edit_settings, require_edit_reason: v }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'إشعار عند التعديل على المُرحل' : 'Notify on posted edit'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'إرسال إشعار عند التعديل على قيد مُرحل'
                        : 'Send notification when editing posted entries'}
                    </p>
                  </div>
                  <Switch
                    checked={editSettings.edit_settings.notify_on_posted_edit}
                    onCheckedChange={(v) => setEditSettings(prev => ({
                      ...prev,
                      edit_settings: { ...prev.edit_settings, notify_on_posted_edit: v }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Closed Year Settings (only for Independent mode) */}
          {editSettings.fiscal_year_mode === 'independent' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'إعدادات السنوات المُغلقة' : 'Closed Year Settings'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar'
                    ? 'تحكم في صلاحيات التعديل على السنوات المالية المُغلقة (النظام المستقل)'
                    : 'Control edit permissions for closed fiscal years (Independent mode)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="space-y-0.5">
                      <Label>{language === 'ar' ? 'السماح بالتعديل على السنوات المُغلقة' : 'Allow edit on closed years'}</Label>
                      <p className="text-sm text-amber-700">
                        {language === 'ar'
                          ? '⚠️ التعديلات لن تؤثر على الأرصدة الافتتاحية للسنوات اللاحقة'
                          : '⚠️ Edits will not affect opening balances of subsequent years'}
                      </p>
                    </div>
                    <Switch
                      checked={editSettings.closed_year_settings.allow_edit_closed_year}
                      onCheckedChange={(v) => setEditSettings(prev => ({
                        ...prev,
                        closed_year_settings: { ...prev.closed_year_settings, allow_edit_closed_year: v }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="space-y-0.5">
                      <Label>{language === 'ar' ? 'السماح بالحذف في السنوات المُغلقة' : 'Allow delete in closed years'}</Label>
                      <p className="text-sm text-red-700">
                        {language === 'ar'
                          ? '❌ غير مُوصى به - الحذف يُسجّل في Audit Log'
                          : '❌ Not recommended - Deletions are logged in Audit'}
                      </p>
                    </div>
                    <Switch
                      checked={editSettings.closed_year_settings.allow_delete_closed_year}
                      onCheckedChange={(v) => setEditSettings(prev => ({
                        ...prev,
                        closed_year_settings: { ...prev.closed_year_settings, allow_delete_closed_year: v }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label>{language === 'ar' ? 'ربط قيود التسوية بالقيود الأصلية' : 'Link adjustment entries to originals'}</Label>
                      <p className="text-sm text-gray-500">
                        {language === 'ar'
                          ? 'إنشاء رابط بين قيد التسوية والقيد الأصلي'
                          : 'Create a link between adjustment and original entry'}
                      </p>
                    </div>
                    <Switch
                      checked={editSettings.closed_year_settings.auto_link_adjustments}
                      onCheckedChange={(v) => setEditSettings(prev => ({
                        ...prev,
                        closed_year_settings: { ...prev.closed_year_settings, auto_link_adjustments: v }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Mode Info */}
          {editSettings.fiscal_year_mode === 'linked' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">{language === 'ar' ? 'نظام السنوات المترابطة' : 'Linked Years Mode'}</AlertTitle>
              <AlertDescription className="text-blue-700">
                {language === 'ar'
                  ? 'في هذا النظام، لا يمكن التعديل على السنوات المالية المُغلقة. أي تصحيحات يجب أن تتم عبر قيد تسوية في السنة المالية الحالية، مرتبط بالقيد الأصلي.'
                  : 'In this mode, closed fiscal years cannot be edited. Any corrections must be made through an adjustment entry in the current fiscal year, linked to the original entry.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'إشعار المدير المالي عند التعديل على سنة مُغلقة' : 'Notify CFO on closed year edit'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'إرسال إشعار للمدير المالي'
                        : 'Send notification to CFO'}
                    </p>
                  </div>
                  <Switch
                    checked={editSettings.notifications.notify_cfo_on_closed_year_edit}
                    onCheckedChange={(v) => setEditSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, notify_cfo_on_closed_year_edit: v }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{language === 'ar' ? 'إشعار عند التسويات الكبيرة' : 'Notify on large adjustments'}</Label>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? `قيمة أكبر من ${editSettings.notifications.large_adjustment_threshold.toLocaleString()}`
                        : `Value greater than ${editSettings.notifications.large_adjustment_threshold.toLocaleString()}`}
                    </p>
                  </div>
                  <Switch
                    checked={editSettings.notifications.notify_on_large_adjustments}
                    onCheckedChange={(v) => setEditSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, notify_on_large_adjustments: v }
                    }))}
                  />
                </div>
              </div>

              {editSettings.notifications.notify_on_large_adjustments && (
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'حد التسوية الكبيرة' : 'Large Adjustment Threshold'}</Label>
                  <Input
                    type="number"
                    value={editSettings.notifications.large_adjustment_threshold}
                    onChange={(e) => setEditSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, large_adjustment_threshold: parseInt(e.target.value) || 10000 }
                    }))}
                    min={0}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'إدارة الصلاحيات' : 'Permissions Management'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'تم نقل إدارة الصلاحيات إلى صفحة إعدادات النظام الموحدة'
                  : 'Permissions management has been moved to the unified System Config page'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-erp-teal/10">
                <Settings className="w-12 h-12 text-erp-teal" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center font-tajawal max-w-md">
                {language === 'ar'
                  ? 'يمكنك الآن إدارة الأدوار والمستخدمين والصلاحيات من صفحة واحدة موحدة. انتقل إلى إعدادات النظام للوصول إلى جميع خيارات الصلاحيات.'
                  : 'You can now manage roles, users, and permissions from a single unified page. Navigate to System Config to access all permission options.'}
              </p>
              <Button
                onClick={() => window.location.href = '/system-config?tab=resources'}
                className="gap-2 bg-erp-teal hover:bg-erp-teal/90"
              >
                <Settings className="w-4 h-4" />
                {language === 'ar' ? 'انتقل إلى إعدادات النظام' : 'Go to System Config'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
