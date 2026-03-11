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
  Link2, Unlink, Percent, Receipt, Landmark, Plus, Trash2, Pencil, X
} from 'lucide-react';
// UserPermissionsTab removed — now in SystemConfigPage
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import CurrencyManagementTab from './components/CurrencyManagementTab';

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
  default_purchase_account_id?: string;
  default_cogs_account_id?: string;
  default_sales_account_id?: string;
  default_tax_input_account_id?: string;
  default_tax_output_account_id?: string;
  default_inventory_account_id?: string;
  // حسابات إضافية
  default_fx_gain_account_id?: string;
  default_fx_loss_account_id?: string;
  default_freight_in_account_id?: string;
  default_retained_earnings_account_id?: string;
  default_customer_advance_account_id?: string;
  default_supplier_advance_account_id?: string;
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
  classification?: string; // 'assets' | 'liabilities' | 'equity' | 'income' | 'expenses'
  type_name_ar?: string;
  type_name_en?: string;
  is_cash_account?: boolean;
  is_bank_account?: boolean;
  is_receivable?: boolean;
  is_payable?: boolean;
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
  const { companyId, company, loading: companyLoading } = useCompany();

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
    default_international_purchase_currency: '',
  });

  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  // جلب العملات من قاعدة البيانات بدلاً من القائمة الثابتة
  const [currencies, setCurrencies] = useState<{ code: string; name: string; nameEn: string; symbol: string }[]>([]);
  const [currencySearch, setCurrencySearch] = useState('');
  const [hasJournalEntries, setHasJournalEntries] = useState(false);

  // Cost Centers State
  const [costCentersList, setCostCentersList] = useState<any[]>([]);
  const [editingCC, setEditingCC] = useState<any | null>(null);
  const [newCC, setNewCC] = useState({ code: '', name_ar: '', name_en: '', is_active: true });
  const [showAddCC, setShowAddCC] = useState(false);
  const [savingCC, setSavingCC] = useState(false);

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

  // Load data when company is ready
  useEffect(() => {
    if (companyId && !companyLoading) {
      loadData(companyId);
    }
  }, [companyId, companyLoading]);

  const loadData = async (currentCompanyId: string) => {
    setLoading(true);
    try {
      const companyBaseCurrency = company?.default_currency || '';

      // Load settings
      const { data: settingsData } = await supabase
        .from('company_accounting_settings')
        .select('*')
        .eq('company_id', currentCompanyId)
        .single();

      if (settingsData) {
        setSettings({
          ...settingsData,
          supported_currencies: settingsData.supported_currencies || [companyBaseCurrency],
          default_sales_currency: settingsData.default_sales_currency || companyBaseCurrency,
          default_purchase_currency: settingsData.default_purchase_currency || companyBaseCurrency,
          default_international_purchase_currency: settingsData.default_international_purchase_currency || '',
        });
      } else {
        setSettings(prev => ({ ...prev, company_id: currentCompanyId, base_currency: companyBaseCurrency }));
      }

      // Load accounting_settings from companies table (for edit/fiscal year mode)
      const { data: companyData } = await supabase
        .from('companies')
        .select('accounting_settings')
        .eq('id', currentCompanyId)
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

      // Check if journal entries exist (to lock currency changes)
      const { count: entriesCount } = await supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId);

      setHasJournalEntries((entriesCount || 0) > 0);

      // Load accounts for dropdowns — filtered by company + classification
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, name_ar, name_en, is_cash_account, is_bank_account, is_receivable, is_payable, account_types(classification, name_ar, name_en)')
        .eq('company_id', currentCompanyId)
        .eq('is_detail', true)
        .eq('is_active', true)
        .order('account_code');

      if (accountsData) {
        setAccounts(accountsData.map((a: any) => ({
          id: a.id,
          account_code: a.account_code,
          name_ar: a.name_ar,
          name_en: a.name_en,
          classification: a.account_types?.classification || '',
          type_name_ar: a.account_types?.name_ar || '',
          type_name_en: a.account_types?.name_en || '',
          is_cash_account: a.is_cash_account || false,
          is_bank_account: a.is_bank_account || false,
          is_receivable: a.is_receivable || false,
          is_payable: a.is_payable || false,
        })));
      }

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

      // Load cost centers
      const { data: ccData } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('code');
      if (ccData) setCostCentersList(ccData);

    } catch (error) {
      // Silently handle - Don't show toast since Keep All Mounted loads this even when tab isn't visible
      console.warn('Settings load issue:', error);
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

  // ═══════════════════════════════════════════════════════════════
  // Classification-based account helpers
  // ═══════════════════════════════════════════════════════════════
  const classificationLabels: Record<string, { ar: string; en: string }> = {
    assets: { ar: '📂 الأصول', en: '📂 Assets' },
    liabilities: { ar: '📂 الخصوم', en: '📂 Liabilities' },
    equity: { ar: '📂 حقوق الملكية', en: '📂 Equity' },
    income: { ar: '📂 الإيرادات', en: '📂 Revenue' },
    expenses: { ar: '📂 المصاريف', en: '📂 Expenses' },
  };

  /** Filter accounts by classification(s) */
  const getAccountsByClassification = (...classifications: string[]) => {
    return accounts.filter(a => classifications.includes(a.classification || ''));
  };

  /** Render grouped account options for Select dropdown */
  const renderGroupedOptions = (filteredAccounts: Account[]) => {
    // Group by classification
    const groups = new Map<string, Account[]>();
    filteredAccounts.forEach(a => {
      const cls = a.classification || 'other';
      if (!groups.has(cls)) groups.set(cls, []);
      groups.get(cls)!.push(a);
    });

    // If only one group, render without headers
    if (groups.size <= 1) {
      return filteredAccounts.map(a => (
        <SelectItem key={a.id} value={a.id}>
          {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
        </SelectItem>
      ));
    }

    // Multiple groups — render with headers
    return Array.from(groups.entries()).map(([cls, accs]) => (
      <React.Fragment key={cls}>
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
          {classificationLabels[cls]?.[language === 'ar' ? 'ar' : 'en'] || cls}
        </div>
        {accs.map(a => (
          <SelectItem key={a.id} value={a.id}>
            {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
          </SelectItem>
        ))}
      </React.Fragment>
    ));
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto" dir={direction}>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
        <div className="overflow-x-auto -mx-1 px-1" dir={direction}>
          <TabsList className="inline-flex w-auto min-w-full bg-gray-100/80 dark:bg-gray-800/50 p-1 rounded-xl gap-0.5 h-auto">
            <TabsTrigger value="general" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Building2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'عام' : 'General'}
            </TabsTrigger>
            <TabsTrigger value="currencies" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-teal dark:data-[state=active]:text-erp-teal data-[state=active]:shadow-sm transition-all">
              <Globe className="w-3.5 h-3.5" />
              {language === 'ar' ? 'العملات' : 'Currencies'}
            </TabsTrigger>
            <TabsTrigger value="tax" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Percent className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الضرائب' : 'Tax'}
            </TabsTrigger>
            <TabsTrigger value="accounts" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Wallet className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الحسابات' : 'Accounts'}
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Calendar className="w-3.5 h-3.5" />
              {language === 'ar' ? 'السنوات المالية' : 'Fiscal Years'}
            </TabsTrigger>
            <TabsTrigger value="numbering" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Hash className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الترقيم' : 'Numbering'}
            </TabsTrigger>
            <TabsTrigger value="editSettings" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Edit2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'التعديلات' : 'Edit Rules'}
            </TabsTrigger>
            <TabsTrigger value="costCenters" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
              <Landmark className="w-3.5 h-3.5" />
              {language === 'ar' ? 'مراكز التكلفة' : 'Cost Centers'}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Display Settings */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                  <DollarSign className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'تنسيق الأرقام' : 'Number Format'}
                </CardTitle>
                <CardDescription className="font-tajawal">
                  {language === 'ar' ? 'إعدادات عرض الأرقام والتواريخ في النظام' : 'Number and date display settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-tajawal text-sm">{language === 'ar' ? 'دقة الأرقام العشرية' : 'Decimal Places'}</Label>
                  <Select
                    value={String(settings.decimal_places)}
                    onValueChange={(v) => updateSetting('decimal_places', parseInt(v))}
                  >
                    <SelectTrigger className="font-tajawal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="font-tajawal">0</SelectItem>
                      <SelectItem value="2" className="font-tajawal">2</SelectItem>
                      <SelectItem value="3" className="font-tajawal">3</SelectItem>
                      <SelectItem value="4" className="font-tajawal">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-tajawal text-sm">{language === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}</Label>
                  <Select
                    value={settings.date_format}
                    onValueChange={(v) => updateSetting('date_format', v)}
                  >
                    <SelectTrigger className="font-tajawal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY" className="font-mono">DD/MM/YYYY (31/01/2026)</SelectItem>
                      <SelectItem value="MM/DD/YYYY" className="font-mono">MM/DD/YYYY (01/31/2026)</SelectItem>
                      <SelectItem value="YYYY-MM-DD" className="font-mono">YYYY-MM-DD (2026-01-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Settings */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                  <FileText className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'سير العمل' : 'Workflow'}
                </CardTitle>
                <CardDescription className="font-tajawal">
                  {language === 'ar' ? 'إعدادات الترحيل التلقائي والموافقات' : 'Auto-posting and approval settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="space-y-0.5">
                    <Label className="font-tajawal text-sm font-medium">{language === 'ar' ? 'ترحيل تلقائي للقيود' : 'Auto-post Entries'}</Label>
                    <p className="text-xs text-gray-500 font-tajawal">
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
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="space-y-0.5">
                    <Label className="font-tajawal text-sm font-medium">{language === 'ar' ? 'طلب موافقة' : 'Require Approval'}</Label>
                    <p className="text-xs text-gray-500 font-tajawal">
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

        {/* Currency Tab — Delegated to CurrencyManagementTab */}
        <TabsContent value="currencies" className="mt-6">
          <CurrencyManagementTab
            settings={settings}
            updateSetting={updateSetting}
            currencies={currencies}
            direction={direction}
          />
        </TabsContent>

        {/* Default Accounts Tab — Enhanced */}
        {/* ═══ Tax Settings Tab ═══ */}
        <TabsContent value="tax" className="mt-6 space-y-6">
          {/* Tax Enable/Disable Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'إعدادات ضريبة القيمة المضافة (VAT)' : 'VAT Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'تفعيل وتهيئة الضريبة لتطبيقها تلقائياً على الفواتير'
                  : 'Enable and configure tax to apply automatically on invoices'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    {language === 'ar' ? 'تفعيل ضريبة القيمة المضافة' : 'Enable VAT'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar'
                      ? 'عند التفعيل، ستُحسب الضريبة تلقائياً على جميع الفواتير'
                      : 'When enabled, VAT will be automatically calculated on all invoices'}
                  </p>
                </div>
                <Switch
                  checked={settings.vat_enabled}
                  onCheckedChange={(v) => updateSetting('vat_enabled', v)}
                />
              </div>

              {/* VAT Rate */}
              {settings.vat_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'نسبة الضريبة (%)' : 'VAT Rate (%)'}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={settings.vat_rate}
                        onChange={(e) => updateSetting('vat_rate', parseFloat(e.target.value) || 0)}
                        className="pe-10"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar'
                        ? 'النسبة الافتراضية: السعودية 15%، الإمارات 5%'
                        : 'Default rates: Saudi Arabia 15%, UAE 5%'}
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'معاينة حساب الضريبة' : 'Tax Calculation Preview'}
                    </Label>
                    <div className="p-4 bg-muted/40 rounded-lg border space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'المبلغ قبل الضريبة:' : 'Amount before tax:'}</span>
                        <span className="font-mono">1,000.00</span>
                      </div>
                      <div className="flex justify-between text-sm text-amber-600">
                        <span>{language === 'ar' ? `ضريبة (${settings.vat_rate}%):` : `VAT (${settings.vat_rate}%):`}</span>
                        <span className="font-mono">{(1000 * settings.vat_rate / 100).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm font-bold">
                        <span>{language === 'ar' ? 'الإجمالي شامل الضريبة:' : 'Total incl. tax:'}</span>
                        <span className="font-mono text-emerald-600">{(1000 + 1000 * settings.vat_rate / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Accounts Card */}
          {settings.vat_enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="w-5 h-5 text-erp-teal" />
                  {language === 'ar' ? 'حسابات الضريبة' : 'Tax Accounts'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar'
                    ? 'ربط حسابات الضريبة المستخدمة في القيود المحاسبية للفواتير'
                    : 'Link tax accounts used in invoice journal entries'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tax Input Account */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>{language === 'ar' ? 'ضريبة المدخلات (المشتريات)' : 'Input VAT (Purchases)'}</Label>
                    {settings.default_tax_input_account_id
                      ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                      : <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'مطلوب ❗' : 'Required ❗'}</Badge>}
                  </div>
                  <Select value={settings.default_tax_input_account_id || ''} onValueChange={(v) => updateSetting('default_tax_input_account_id', v)}>
                    <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                    <SelectContent>
                      {renderGroupedOptions(getAccountsByClassification('assets', 'liabilities'))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar'
                      ? 'يُسجَّل كمدين عند شراء بضاعة — ضريبة قابلة للاسترداد'
                      : 'Debited when purchasing goods — recoverable tax'}
                  </p>
                </div>

                {/* Tax Output Account */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>{language === 'ar' ? 'ضريبة المخرجات (المبيعات)' : 'Output VAT (Sales)'}</Label>
                    {settings.default_tax_output_account_id
                      ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                      : <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'مطلوب ❗' : 'Required ❗'}</Badge>}
                  </div>
                  <Select value={settings.default_tax_output_account_id || ''} onValueChange={(v) => updateSetting('default_tax_output_account_id', v)}>
                    <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                    <SelectContent>
                      {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar'
                      ? 'يُسجَّل كدائن عند بيع بضاعة — ضريبة مستحقة الدفع'
                      : 'Credited when selling goods — tax payable'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Status Summary */}
          <Alert className={settings.vat_enabled ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}>
            {settings.vat_enabled
              ? <CheckCircle2 className="h-4 w-4 text-green-600" />
              : <Info className="h-4 w-4 text-gray-500" />}
            <AlertTitle className={settings.vat_enabled ? 'text-green-800' : 'text-gray-700'}>
              {settings.vat_enabled
                ? (language === 'ar' ? `الضريبة مفعّلة بنسبة ${settings.vat_rate}%` : `VAT enabled at ${settings.vat_rate}%`)
                : (language === 'ar' ? 'الضريبة غير مفعّلة' : 'VAT is disabled')}
            </AlertTitle>
            <AlertDescription className={settings.vat_enabled ? 'text-green-700' : 'text-gray-600'}>
              {settings.vat_enabled
                ? (language === 'ar'
                  ? 'سيتم احتساب الضريبة تلقائياً عند إنشاء فواتير البيع والشراء وإدراجها في القيد المحاسبي'
                  : 'Tax will be automatically calculated on sales and purchase invoices and included in journal entries')
                : (language === 'ar'
                  ? 'لن يتم احتساب أي ضريبة على الفواتير. يمكنك تفعيلها في أي وقت'
                  : 'No tax will be calculated on invoices. You can enable it at any time')}
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="accounts" className="mt-6 space-y-6">
          {/* Status Summary */}
          {(() => {
            const accountFields = [
              'default_cash_account_id', 'default_bank_account_id',
              'default_revenue_account_id', 'default_expense_account_id',
              'default_receivable_account_id', 'default_payable_account_id',
              'default_purchase_account_id',
              'default_inventory_account_id',
              'default_tax_input_account_id', 'default_tax_output_account_id',
              'default_fx_gain_account_id', 'default_fx_loss_account_id',
              'default_freight_in_account_id',
              'default_retained_earnings_account_id',
            ] as const;
            const configured = accountFields.filter(f => !!(settings as any)[f]).length;
            const total = accountFields.length;
            return (
              <Alert className={configured === total ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}>
                {configured === total
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                <AlertTitle className={configured === total ? 'text-green-800' : 'text-amber-800'}>
                  {language === 'ar'
                    ? `${configured} من ${total} حسابات مُعيّنة`
                    : `${configured} of ${total} accounts configured`}
                </AlertTitle>
                <AlertDescription className={configured === total ? 'text-green-700' : 'text-amber-700'}>
                  {language === 'ar'
                    ? configured === total
                      ? 'جميع الحسابات الافتراضية مُعيّنة ✓'
                      : 'يُرجى تعيين الحسابات المتبقية لضمان سير العمليات المحاسبية'
                    : configured === total
                      ? 'All default accounts are configured ✓'
                      : 'Please configure remaining accounts to ensure smooth accounting operations'}
                </AlertDescription>
              </Alert>
            );
          })()}

          {/* Group 0: Currency Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'إعدادات العملات' : 'Currency Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'العملة الرئيسية والعملة المحلية — تُقفل بعد أول حركة محاسبية' : 'Base and local currency — locked after first journal entry'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'العملة الرئيسية' : 'Base Currency'}</Label>
                  {hasJournalEntries && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1"><Lock className="w-3 h-3" />{language === 'ar' ? 'مقفلة' : 'Locked'}</Badge>}
                </div>
                <Select
                  value={settings.base_currency || ''}
                  onValueChange={(v) => updateSetting('base_currency', v)}
                  disabled={hasJournalEntries}
                >
                  <SelectTrigger className={hasJournalEntries ? 'opacity-70 cursor-not-allowed' : ''}>
                    <SelectValue placeholder={language === 'ar' ? 'اختر العملة...' : 'Select currency...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {language === 'ar' ? c.name : c.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  {hasJournalEntries
                    ? (language === 'ar' ? '🔒 لا يمكن تغيير العملة الرئيسية بعد وجود قيود محاسبية' : '🔒 Cannot change base currency after journal entries exist')
                    : (language === 'ar' ? 'عملة المحاسبة الأساسية — جميع التقارير تصدر بها' : 'Primary accounting currency — all reports are generated in this currency')}
                </p>
              </div>

              {/* Default Sales Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'عملة البيع الافتراضية' : 'Default Sales Currency'}</Label>
                </div>
                <Select
                  value={settings.default_sales_currency || ''}
                  onValueChange={(v) => updateSetting('default_sales_currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر العملة...' : 'Select currency...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings.supported_currencies || []).map(code => {
                      const cur = currencies.find(c => c.code === code);
                      return (
                        <SelectItem key={code} value={code}>
                          {cur?.symbol || ''} {code} — {language === 'ar' ? (cur?.name || code) : (cur?.nameEn || code)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'العملة المستخدمة افتراضياً في فواتير المبيعات' : 'Default currency for sales invoices'}</p>
              </div>

              {/* Default Purchase Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'عملة الشراء الافتراضية' : 'Default Purchase Currency'}</Label>
                </div>
                <Select
                  value={settings.default_purchase_currency || ''}
                  onValueChange={(v) => updateSetting('default_purchase_currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر العملة...' : 'Select currency...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings.supported_currencies || []).map(code => {
                      const cur = currencies.find(c => c.code === code);
                      return (
                        <SelectItem key={code} value={code}>
                          {cur?.symbol || ''} {code} — {language === 'ar' ? (cur?.name || code) : (cur?.nameEn || code)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'العملة المستخدمة افتراضياً في فواتير المشتريات' : 'Default currency for purchase invoices'}</p>
              </div>

              {/* Supported Currencies Info */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العملات المدعومة' : 'Supported Currencies'}</Label>
                <div className="flex flex-wrap gap-2">
                  {(settings.supported_currencies || []).map(code => {
                    const cur = currencies.find(c => c.code === code);
                    return (
                      <Badge key={code} variant="outline" className="text-sm">
                        {cur?.symbol || ''} {code}
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'العملات المفعّلة — يمكن إضافة المزيد من تبويب العملات' : 'Active currencies — add more from the Currencies tab'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group 1: Financial Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'الحسابات المالية' : 'Financial Accounts'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'الصندوق والبنك والذمم' : 'Cash, bank, and receivables/payables'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'حساب الصندوق' : 'Cash Account'}</Label>
                  {settings.default_cash_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_cash_account_id || ''} onValueChange={(v) => updateSetting('default_cash_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'يُستخدم في سندات القبض والصرف النقدي' : 'Used for cash receipts and payments'}</p>
              </div>

              {/* Bank */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'حساب البنك' : 'Bank Account'}</Label>
                  {settings.default_bank_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_bank_account_id || ''} onValueChange={(v) => updateSetting('default_bank_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'يُستخدم في التحويلات البنكية والإيداعات' : 'Used for bank transfers and deposits'}</p>
              </div>

              {/* Receivable */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'الذمم المدينة' : 'Accounts Receivable'}</Label>
                  {settings.default_receivable_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_receivable_account_id || ''} onValueChange={(v) => updateSetting('default_receivable_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'حساب العملاء - يُستخدم في فواتير المبيعات' : 'Customer account - used in sales invoices'}</p>
              </div>

              {/* Payable */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'الذمم الدائنة' : 'Accounts Payable'}</Label>
                  {settings.default_payable_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_payable_account_id || ''} onValueChange={(v) => updateSetting('default_payable_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'حساب الموردين - يُستخدم في فواتير المشتريات' : 'Vendor account - used in purchase invoices'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group 2: Operational Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'حسابات التشغيل' : 'Operational Accounts'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'الإيرادات والمصروفات والمشتريات' : 'Revenue, expenses, and purchases'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'حساب الإيرادات' : 'Revenue Account'}</Label>
                  {settings.default_revenue_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_revenue_account_id || ''} onValueChange={(v) => updateSetting('default_revenue_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('income'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'يُستخدم تلقائياً في فواتير المبيعات' : 'Auto-used in sales invoices'}</p>
              </div>

              {/* Expense */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'حساب المصروفات' : 'Expense Account'}</Label>
                  {settings.default_expense_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_expense_account_id || ''} onValueChange={(v) => updateSetting('default_expense_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'يُستخدم في المصروفات العامة والتشغيلية' : 'Used for general and operational expenses'}</p>
              </div>

              {/* Purchases/COGS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'حساب المشتريات / تكلفة البضاعة' : 'Purchases / COGS'}</Label>
                  {(settings as any).default_purchase_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'مطلوب ❗' : 'Required ❗'}</Badge>}
                </div>
                <Select value={(settings as any).default_purchase_account_id || ''} onValueChange={(v) => updateSetting('default_purchase_account_id' as any, v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'الجانب المدين في فواتير المشتريات — ضروري للترحيل' : 'Debit side for purchase invoices — required for posting'}</p>
              </div>

              {/* Tax Input Account */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'ضريبة القيمة المضافة — مدخلات' : 'VAT Input (Purchases)'}</Label>
                  {settings.default_tax_input_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_tax_input_account_id || ''} onValueChange={(v) => updateSetting('default_tax_input_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets', 'liabilities'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'ضريبة المشتريات القابلة للاسترداد' : 'Recoverable VAT on purchases'}</p>
              </div>

              {/* Tax Output Account */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'ضريبة القيمة المضافة — مخرجات' : 'VAT Output (Sales)'}</Label>
                  {settings.default_tax_output_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_tax_output_account_id || ''} onValueChange={(v) => updateSetting('default_tax_output_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'ضريبة المبيعات المستحقة للدفع' : 'VAT payable on sales'}</p>
              </div>

              {/* Inventory Account */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'حساب المخزون' : 'Inventory Account'}</Label>
                  {settings.default_inventory_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_inventory_account_id || ''} onValueChange={(v) => updateSetting('default_inventory_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'حساب البضاعة / مخزون الأقمشة' : 'Goods / fabric inventory account'}</p>
              </div>

              {/* Freight In */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? 'مصاريف الشحن والنقل' : 'Freight In'}</Label>
                  {settings.default_freight_in_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_freight_in_account_id || ''} onValueChange={(v) => updateSetting('default_freight_in_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'تكاليف الشحن على المشتريات والشحنات' : 'Shipping costs on purchases and shipments'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group 3: Advanced Accounts — FX, Retained Earnings, Advances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5 text-erp-teal" />
                {language === 'ar' ? 'حسابات متقدمة' : 'Advanced Accounts'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'فروقات العملات، الأرباح المحتجزة، والسلف' : 'Currency differences, retained earnings, and advances'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FX Gain */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? '💱 أرباح فروقات العملة' : '💱 FX Gains'}</Label>
                  {settings.default_fx_gain_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_fx_gain_account_id || ''} onValueChange={(v) => updateSetting('default_fx_gain_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('income'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'أرباح ناتجة عن تحويل العملات بأسعار مختلفة' : 'Gains from currency conversion at different rates'}</p>
              </div>

              {/* FX Loss */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? '💱 خسائر فروقات العملة' : '💱 FX Losses'}</Label>
                  {settings.default_fx_loss_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_fx_loss_account_id || ''} onValueChange={(v) => updateSetting('default_fx_loss_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'خسائر ناتجة عن تحويل العملات' : 'Losses from currency conversion'}</p>
              </div>

              {/* Retained Earnings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? '📊 الأرباح المحتجزة' : '📊 Retained Earnings'}</Label>
                  {settings.default_retained_earnings_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_retained_earnings_account_id || ''} onValueChange={(v) => updateSetting('default_retained_earnings_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('equity'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'يُستخدم عند إقفال السنة المالية — تُرحل إليه الأرباح' : 'Used for year-end closing — profits are transferred here'}</p>
              </div>

              {/* Customer Advance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? '🧾 سلف العملاء' : '🧾 Customer Advances'}</Label>
                  {settings.default_customer_advance_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_customer_advance_account_id || ''} onValueChange={(v) => updateSetting('default_customer_advance_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'دفعات مقدمة من العملاء قبل التسليم' : 'Advance payments from customers before delivery'}</p>
              </div>

              {/* Supplier Advance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{language === 'ar' ? '🧾 سلف الموردين' : '🧾 Supplier Advances'}</Label>
                  {settings.default_supplier_advance_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{language === 'ar' ? 'مُعيّن' : 'Set'}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'غير مُعيّن' : 'Not set'}</Badge>}
                </div>
                <Select value={settings.default_supplier_advance_account_id || ''} onValueChange={(v) => updateSetting('default_supplier_advance_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر حساب...' : 'Select account...'} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{language === 'ar' ? 'دفعات مقدمة للموردين قبل الاستلام' : 'Advance payments to suppliers before receipt'}</p>
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

        {/* ═══ Cost Centers Tab ═══ */}
        <TabsContent value="costCenters" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Landmark className="w-5 h-5 text-erp-teal" />
                    {language === 'ar' ? 'إدارة مراكز التكلفة' : 'Cost Center Management'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'إضافة وتعديل وحذف مراكز التكلفة المستخدمة في القيود اليومية'
                      : 'Add, edit and delete cost centers used in journal entries'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    const cid = companyId;
                    if (!cid) return;
                    const { data } = await supabase
                      .from('cost_centers')
                      .select('*')
                      .eq('company_id', cid)
                      .order('code');
                    if (data) setCostCentersList(data);
                  }}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button size="sm" className="gap-1 bg-erp-teal hover:bg-erp-teal/90" onClick={() => {
                    setShowAddCC(true);
                    setNewCC({ code: '', name_ar: '', name_en: '', is_active: true });
                  }}>
                    <Plus className="w-4 h-4" />
                    {language === 'ar' ? 'إضافة' : 'Add'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Row */}
              {showAddCC && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Input
                    placeholder={language === 'ar' ? 'الرمز' : 'Code'}
                    value={newCC.code}
                    onChange={(e) => setNewCC(p => ({ ...p, code: e.target.value }))}
                    className="w-24"
                  />
                  <Input
                    placeholder={language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
                    value={newCC.name_ar}
                    onChange={(e) => setNewCC(p => ({ ...p, name_ar: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder={language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
                    value={newCC.name_en}
                    onChange={(e) => setNewCC(p => ({ ...p, name_en: e.target.value }))}
                    className="flex-1"
                  />
                  <Button size="sm" disabled={savingCC || !newCC.code || !newCC.name_ar} onClick={async () => {
                    setSavingCC(true);
                    try {
                      const { error } = await supabase.from('cost_centers').insert({
                        company_id: companyId,
                        code: newCC.code,
                        name_ar: newCC.name_ar,
                        name_en: newCC.name_en || newCC.name_ar,
                        is_active: true,
                      });
                      if (error) throw error;
                      toast({ title: language === 'ar' ? 'تمت الإضافة' : 'Added', description: newCC.name_ar });
                      setShowAddCC(false);
                      // Refresh
                      const { data } = await supabase.from('cost_centers').select('*').eq('company_id', companyId).order('code');
                      if (data) setCostCentersList(data);
                    } catch (err: any) {
                      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
                    } finally {
                      setSavingCC(false);
                    }
                  }} className="bg-emerald-600 hover:bg-emerald-700">
                    {savingCC ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddCC(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-2.5 text-start font-medium w-24">{language === 'ar' ? 'الرمز' : 'Code'}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{language === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}</th>
                      <th className="px-4 py-2.5 text-center font-medium w-24">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-2.5 text-center font-medium w-24">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costCentersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {language === 'ar' ? 'لا توجد مراكز تكلفة. اضغط "إضافة" لإنشاء مركز تكلفة جديد.' : 'No cost centers. Click "Add" to create one.'}
                        </td>
                      </tr>
                    ) : costCentersList.map((cc) => (
                      <tr key={cc.id} className="border-t hover:bg-muted/30 transition-colors">
                        {editingCC?.id === cc.id ? (
                          <>
                            <td className="px-3 py-1.5">
                              <Input value={editingCC.code} onChange={(e) => setEditingCC((p: any) => ({ ...p, code: e.target.value }))} className="h-8 text-sm" />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={editingCC.name_ar} onChange={(e) => setEditingCC((p: any) => ({ ...p, name_ar: e.target.value }))} className="h-8 text-sm" />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={editingCC.name_en} onChange={(e) => setEditingCC((p: any) => ({ ...p, name_en: e.target.value }))} className="h-8 text-sm" />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <Switch checked={editingCC.is_active} onCheckedChange={(v) => setEditingCC((p: any) => ({ ...p, is_active: v }))} />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={async () => {
                                  const { error } = await supabase.from('cost_centers').update({
                                    code: editingCC.code,
                                    name_ar: editingCC.name_ar,
                                    name_en: editingCC.name_en,
                                    is_active: editingCC.is_active,
                                  }).eq('id', editingCC.id);
                                  if (!error) {
                                    toast({ title: language === 'ar' ? 'تم التحديث' : 'Updated' });
                                    setEditingCC(null);
                                    const { data } = await supabase.from('cost_centers').select('*').eq('company_id', companyId).order('code');
                                    if (data) setCostCentersList(data);
                                  }
                                }}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCC(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 font-mono text-xs">{cc.code}</td>
                            <td className="px-4 py-2.5">{cc.name_ar}</td>
                            <td className="px-4 py-2.5">{cc.name_en}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={cc.is_active ? 'default' : 'secondary'} className="text-[10px]">
                                {cc.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Inactive')}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCC({ ...cc })}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={async () => {
                                  if (!confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
                                  const { error } = await supabase.from('cost_centers').delete().eq('id', cc.id);
                                  if (!error) {
                                    setCostCentersList(prev => prev.filter(c => c.id !== cc.id));
                                    toast({ title: language === 'ar' ? 'تم الحذف' : 'Deleted' });
                                  }
                                }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                {language === 'ar'
                  ? `إجمالي مراكز التكلفة: ${costCentersList.length}`
                  : `Total cost centers: ${costCentersList.length}`}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions removed — now in SystemConfigPage tabs */}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-erp-teal to-emerald-600 hover:from-erp-teal/90 hover:to-emerald-600/90 text-white font-tajawal px-8 py-2.5 rounded-xl shadow-lg disabled:opacity-50 gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
              </>
            )}
          </Button>
        </div>
      </Tabs >
    </div >
  );
}
