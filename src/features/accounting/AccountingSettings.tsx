import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATIC_MODULES } from '@/config/modules';
import { Separator } from '@/components/ui/separator';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Settings, Save, Building2, DollarSign, Calendar, FileText,
  Globe, Wallet, Hash, AlertTriangle, CheckCircle2, Loader2,
  ChevronRight, RefreshCw, Edit2, Lock, Info, AlertCircle,
  Link2, Unlink, Percent, Receipt, Landmark, Plus, Trash2, Pencil, X,
  ArrowRightLeft, Send
} from 'lucide-react';
// UserPermissionsTab removed — now in SystemConfigPage
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useRBAC } from '@/hooks/useRBAC';
import CurrencyManagementTab from './components/CurrencyManagementTab';
import { getLocalizedLabel } from '@/lib/utils/getLocalizedUnit';

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
  default_transit_purchase_account_id?: string;
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
  name: string;
  code?: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  is_current: boolean;
  company_id: string;
  tenant_id: string;
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

// Exchange Settings Interface
interface ExchangeSettingsData {
  id?: string;
  company_id?: string;
  profit_account_id?: string;
  loss_account_id?: string;
  commission_income_account_id?: string;
  remittance_payable_account_id?: string;
  remittance_receivable_account_id?: string;
  agents_payable_account_id?: string;
  partners_receivable_account_id?: string;
  auto_post_exchange?: boolean;
  auto_post_remittance?: boolean;
  auto_post_variance?: boolean;
}

// Core accounting account code → setting key mapping (standard textile ERP codes)
const CORE_ACCOUNT_CODE_MAP: Record<string, string> = {
  // Financial
  '1110': 'default_cash_account_id',        // الصندوق
  '1120': 'default_bank_account_id',        // البنك
  '1210': 'default_receivable_account_id',  // الذمم المدينة
  '2110': 'default_payable_account_id',     // الذمم الدائنة
  // Operational
  '4110': 'default_revenue_account_id',     // الإيرادات
  '5110': 'default_expense_account_id',     // المصروفات
  '5120': 'default_purchase_account_id',    // المشتريات / تكلفة البضاعة
  '1140': 'default_inventory_account_id',   // المخزون
  '1145': 'default_transit_purchase_account_id', // مشتريات بالطريق
  '1510': 'default_tax_input_account_id',   // ضريبة مدخلات
  '2120': 'default_tax_output_account_id',  // ضريبة مخرجات
  '5130': 'default_freight_in_account_id',  // مصاريف الشحن
  // Advanced
  '3110': 'default_retained_earnings_account_id', // الأرباح المختزنة
  '433': 'default_fx_gain_account_id',      // أرباح فروقات عملات
  '543': 'default_fx_loss_account_id',      // خسائر فروقات عملات
};

// Alternative code patterns to try (some charts use 3-digit, 4-digit, or different numbering)
const CORE_ACCOUNT_CODE_ALTERNATIVES: Record<string, string[]> = {
  'default_cash_account_id':        ['1110', '111', '1010', '101', '100'],
  'default_bank_account_id':        ['1120', '112', '1020', '102'],
  'default_receivable_account_id':  ['1210', '121', '1200', '120', '130'],
  'default_payable_account_id':     ['2110', '211', '2010', '201', '210'],
  'default_revenue_account_id':     ['4110', '411', '4010', '401', '410'],
  'default_expense_account_id':     ['5110', '511', '5010', '501', '510'],
  'default_purchase_account_id':    ['5120', '512', '5020', '502', '520'],
  'default_inventory_account_id':   ['1140', '114', '1040', '104', '115'],
  'default_transit_purchase_account_id': ['1145', '1150', '115'],
  'default_tax_input_account_id':   ['1510', '151', '1500', '150', '1310'],
  'default_tax_output_account_id':  ['2120', '212', '2020', '202', '2210'],
  'default_freight_in_account_id':  ['5130', '513', '5030', '503'],
  'default_retained_earnings_account_id': ['3110', '311', '3010', '301'],
  'default_fx_gain_account_id':     ['433', '4330', '430'],
  'default_fx_loss_account_id':     ['543', '5430', '540'],
};

// Exchange account code → setting key mapping (V7 Chart)
const EXCHANGE_ACCOUNT_CODE_MAP: Record<string, keyof ExchangeSettingsData> = {
  '433': 'profit_account_id',
  '543': 'loss_account_id',
  '431': 'commission_income_account_id',
  '432': 'commission_income_account_id',
  '231': 'remittance_payable_account_id',
  '131': 'remittance_receivable_account_id',
  '232': 'agents_payable_account_id',
  '233': 'partners_receivable_account_id',
};


export default function AccountingSettings() {
  const { t, language, direction } = useLanguage();
  const { toast } = useToast();
  const { session, isSuperAdmin } = useAuth();
  const { companyId, company, loading: companyLoading } = useCompany();
  const { canSeeModule, isPlatformAdmin } = useRBAC();

  const [activeTab, setActiveTab] = useState('general');

  // MainTabsBar config for sub-tabs
  const accountingSubTabs = useMemo(() => [
    { id: 'general', labelKey: 'accounting.settingsTabs.general', icon: Building2 },
    { id: 'currencies', labelKey: 'accounting.settingsTabs.currencies', icon: Globe },
    { id: 'accounts', labelKey: 'accounting.settingsTabs.accounts', icon: Wallet },
    { id: 'fiscal', labelKey: 'accounting.settingsTabs.fiscal', icon: Calendar },
    { id: 'numbering', labelKey: 'accounting.settingsTabs.numbering', icon: Hash },
    { id: 'editSettings', labelKey: 'accounting.settingsTabs.editSettings', icon: Edit2 },
    { id: 'costCenters', labelKey: 'accounting.settingsTabs.costCenters', icon: Landmark },
  ], []);
  const [saving, setSaving] = useState(false);

  // Data states - defaults will be overwritten by company settings on load
  const [settings, setSettings] = useState<CompanySettings>({
    company_id: '',
    base_currency: '', // Will be loaded from company settings
    decimal_places: 2,
    date_format: 'DD/MM/YYYY',
    number_format: 'en-US',
    vat_enabled: true,
    vat_rate: 0,
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

  // Exchange Settings State
  const [exchangeSettings, setExchangeSettings] = useState<ExchangeSettingsData>({});
  const isExchangeModuleActive = isSuperAdmin || isPlatformAdmin() || canSeeModule('exchange') || STATIC_MODULES.find(m => m.code === 'exchange')?.is_enabled;

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

  // Load data when company is ready — using React Query for caching
  const queryClient = useQueryClient();
  // Force refresh on mount to avoid stale IndexedDB cache issues
  useEffect(() => {
    if (companyId) {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'settings', companyId] });
    }
  }, [companyId, queryClient]);
  const { data: loadedData, isLoading: queryLoading } = useCachedQuery({
    queryKey: ['accounting', 'settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const companyBaseCurrency = company?.default_currency || '';

      const [settingsRes, companyRes, yearsRes, entriesRes, accountsRes, currenciesRes, ccRes, exSettingsRes] = await Promise.all([
        supabase.from('company_accounting_settings').select('*').eq('company_id', companyId).single(),
        supabase.from('companies').select('accounting_settings').eq('id', companyId).single(),
        supabase.from('fiscal_years').select('*').eq('company_id', companyId).order('start_date', { ascending: false }),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('chart_of_accounts')
          .select('id, account_code, name_ar, name_en, is_cash_account, is_bank_account, is_receivable, is_payable, account_types(classification, name_ar, name_en)')
          .eq('company_id', companyId).eq('is_detail', true).eq('is_active', true).order('account_code'),
        supabase.from('currencies').select('code, name, name_ar, symbol').order('code'),
        supabase.from('cost_centers').select('*').eq('company_id', companyId).order('code'),
        supabase.from('exchange_settings').select('*').eq('company_id', companyId).maybeSingle(),
      ]);

      return { settingsRes, companyRes, yearsRes, entriesRes, accountsRes, currenciesRes, ccRes, exSettingsRes, companyBaseCurrency };
    },
    enabled: !!companyId && !companyLoading,
    staleTime: 5 * 60 * 1000,       // 5 min — refresh more often
    gcTime: 30 * 60 * 1000,          // 30 min
  });

  // Process loaded data into state (only when data changes)
  useEffect(() => {
    if (!loadedData || !companyId) return;
    const { settingsRes, companyRes, yearsRes, entriesRes, accountsRes, currenciesRes, ccRes, exSettingsRes, companyBaseCurrency } = loadedData;

    // Guard: if any result is missing (IndexedDB serialization edge case), skip processing
    if (!settingsRes || !companyRes || !yearsRes || !accountsRes || !currenciesRes) return;

    if (settingsRes.data) {
      const effectiveBase = settingsRes.data.base_currency || companyBaseCurrency || 'USD';
      setSettings({
        ...settingsRes.data,
        base_currency: effectiveBase,
        supported_currencies: (settingsRes.data.supported_currencies && settingsRes.data.supported_currencies.length > 0)
          ? settingsRes.data.supported_currencies
          : (effectiveBase ? [effectiveBase] : ['USD']),
        default_sales_currency: settingsRes.data.default_sales_currency || effectiveBase,
        default_purchase_currency: settingsRes.data.default_purchase_currency || effectiveBase,
        default_international_purchase_currency: settingsRes.data.default_international_purchase_currency || '',
      });
    } else {
      // No settings row — create defaults with USD
      const effectiveBase = companyBaseCurrency || 'USD';
      setSettings(prev => ({
        ...prev,
        company_id: companyId,
        base_currency: effectiveBase,
        supported_currencies: [effectiveBase],
        default_sales_currency: effectiveBase,
        default_purchase_currency: effectiveBase,
      }));
    }
    if (companyRes.data?.accounting_settings) {
      setEditSettings(prev => ({ ...prev, ...companyRes.data.accounting_settings }));
    }
    if (yearsRes.data) setFiscalYears(yearsRes.data);
    setHasJournalEntries((entriesRes.count || 0) > 0);
    if (accountsRes.data) {
      const mappedAccounts = accountsRes.data.map((a: any) => ({
        id: a.id, account_code: a.account_code, name_ar: a.name_ar, name_en: a.name_en,
        classification: a.account_types?.classification || '',
        type_name_ar: a.account_types?.name_ar || '', type_name_en: a.account_types?.name_en || '',
        is_cash_account: a.is_cash_account || false, is_bank_account: a.is_bank_account || false,
        is_receivable: a.is_receivable || false, is_payable: a.is_payable || false,
      }));
      setAccounts(mappedAccounts);

      // ═══ Auto-map core accounts if not already set ═══
      const codeToIdMap = new Map<string, string>();
      accountsRes.data.forEach((a: any) => {
        if (!codeToIdMap.has(a.account_code)) codeToIdMap.set(a.account_code, a.id);
      });

      setSettings(prev => {
        const updated = { ...prev };
        let changed = false;

        // 1) Try direct code mapping
        for (const [code, settingKey] of Object.entries(CORE_ACCOUNT_CODE_MAP)) {
          if (!(updated as any)[settingKey]) {
            const accountId = codeToIdMap.get(code);
            if (accountId) {
              (updated as any)[settingKey] = accountId;
              changed = true;
            }
          }
        }

        // 2) Try alternative codes for still-empty fields
        for (const [settingKey, altCodes] of Object.entries(CORE_ACCOUNT_CODE_ALTERNATIVES)) {
          if (!(updated as any)[settingKey]) {
            for (const code of altCodes) {
              const accountId = codeToIdMap.get(code);
              if (accountId) {
                (updated as any)[settingKey] = accountId;
                changed = true;
                break;
              }
            }
          }
        }

        // 3) Flag-based fallback: use is_cash_account, is_bank_account, etc.
        if (!updated.default_cash_account_id) {
          const cashAcc = mappedAccounts.find(a => a.is_cash_account);
          if (cashAcc) { (updated as any).default_cash_account_id = cashAcc.id; changed = true; }
        }
        if (!updated.default_bank_account_id) {
          const bankAcc = mappedAccounts.find(a => a.is_bank_account);
          if (bankAcc) { (updated as any).default_bank_account_id = bankAcc.id; changed = true; }
        }
        if (!updated.default_receivable_account_id) {
          const recAcc = mappedAccounts.find(a => a.is_receivable);
          if (recAcc) { (updated as any).default_receivable_account_id = recAcc.id; changed = true; }
        }
        if (!updated.default_payable_account_id) {
          const payAcc = mappedAccounts.find(a => a.is_payable);
          if (payAcc) { (updated as any).default_payable_account_id = payAcc.id; changed = true; }
        }

        // ═══ Auto-persist: save newly discovered accounts to DB ═══
        if (changed && companyId) {
          const autoSaveFields: Record<string, any> = {};
          for (const [key, value] of Object.entries(updated)) {
            if (key.endsWith('_account_id') && value && !(settingsRes.data as any)?.[key]) {
              autoSaveFields[key] = value;
            }
          }
          if (Object.keys(autoSaveFields).length > 0) {
            console.log('[AccountingSettings] 🔄 Auto-persisting discovered accounts:', Object.keys(autoSaveFields));
            supabase
              .from('company_accounting_settings')
              .update(autoSaveFields)
              .eq('company_id', companyId)
              .then(({ error }) => {
                if (error) console.warn('[AccountingSettings] Auto-persist failed:', error.message);
                else console.log('[AccountingSettings] ✅ Auto-persisted', Object.keys(autoSaveFields).length, 'accounts to DB');
              });
          }
        }

        return changed ? updated : prev;
      });
    }
    if (currenciesRes.data) {
      const uniqueCurrencies = new Map();
      currenciesRes.data.forEach(c => {
        if (!uniqueCurrencies.has(c.code)) {
          uniqueCurrencies.set(c.code, { code: c.code, name: c.name_ar || c.name, nameEn: c.name, symbol: c.symbol });
        }
      });
      setCurrencies(Array.from(uniqueCurrencies.values()));
    }
    if (ccRes.data) setCostCentersList(ccRes.data);
    if (exSettingsRes.data) {
      const loadedExSettings: ExchangeSettingsData = exSettingsRes.data;
      const codeToIdMap = new Map<string, string>();
      (accountsRes.data || []).forEach((a: any) => {
        if (!codeToIdMap.has(a.account_code)) codeToIdMap.set(a.account_code, a.id);
      });
      for (const [code, settingKey] of Object.entries(EXCHANGE_ACCOUNT_CODE_MAP)) {
        if (!(loadedExSettings as any)[settingKey]) {
          const accountId = codeToIdMap.get(code);
          if (accountId) (loadedExSettings as any)[settingKey] = accountId;
        }
      }
      setExchangeSettings(loadedExSettings);
    }
  }, [loadedData, companyId]);

  const loading = queryLoading;


  const handleSave = async () => {
    setSaving(true);
    try {
      // Save company_accounting_settings
      const { error } = await supabase
        .from('company_accounting_settings')
        .upsert(settings, { onConflict: 'company_id' });

      if (error) throw error;

      // Try to save accounting_settings (edit/fiscal year mode) to companies table
      try {
        const { error: companyError } = await supabase
          .from('companies')
          .update({ accounting_settings: editSettings })
          .eq('id', settings.company_id);

        if (companyError) {
          console.warn('Could not save accounting_settings (column may not exist):', companyError);
        }
      } catch (editError) {
        console.warn('Could not save edit settings:', editError);
      }

      // Save exchange settings if exchange module is active
      if (isExchangeModuleActive && exchangeSettings.company_id) {
        try {
          const { error: exError } = await supabase
            .from('exchange_settings')
            .upsert({ ...exchangeSettings, company_id: settings.company_id }, { onConflict: 'company_id' });
          if (exError) console.warn('Could not save exchange settings:', exError);
        } catch (e) {
          console.warn('Exchange settings save failed:', e);
        }
      }

      toast({
        title: getLocalizedLabel('stg_saved', language),
        description: getLocalizedLabel('stg_settings_saved_successfully', language),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: getLocalizedLabel('stg_error', language),
        description: getLocalizedLabel('stg_failed_to_save_settings', language),
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
          title: getLocalizedLabel('stg_cannot_remove', language),
          description: getLocalizedLabel('stg_cannot_remove_base_currency', language),
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

      {/* Sub-tabs bar — underline variant */}
      <MainTabsBar
        tabs={accountingSubTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      <div>

        {/* General Tab */}
        <div className={activeTab === 'general' ? 'mt-6 space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Display Settings */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                  <DollarSign className="w-5 h-5 text-erp-teal" />
                  {getLocalizedLabel('stg_number_format', language)}
                </CardTitle>
                <CardDescription className="font-tajawal">
                  {getLocalizedLabel('stg_number_and_date_display_settin', language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-tajawal text-sm">{getLocalizedLabel('stg_decimal_places', language)}</Label>
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
                  <Label className="font-tajawal text-sm">{getLocalizedLabel('stg_date_format', language)}</Label>
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
                  {getLocalizedLabel('stg_workflow', language)}
                </CardTitle>
                <CardDescription className="font-tajawal">
                  {getLocalizedLabel('stg_auto_posting_and_approval_sett', language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="space-y-0.5">
                    <Label className="font-tajawal text-sm font-medium">{getLocalizedLabel('stg_auto_post_entries', language)}</Label>
                    <p className="text-xs text-gray-500 font-tajawal">
                      {getLocalizedLabel('stg_auto_post_entries_after_saving', language)}
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_post_entries}
                    onCheckedChange={(v) => updateSetting('auto_post_entries', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="space-y-0.5">
                    <Label className="font-tajawal text-sm font-medium">{getLocalizedLabel('stg_require_approval', language)}</Label>
                    <p className="text-xs text-gray-500 font-tajawal">
                      {getLocalizedLabel('stg_require_approval_before_postin', language)}
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
        </div>


        {/* Currency Tab — Delegated to CurrencyManagementTab */}
        <div className={activeTab === 'currencies' ? 'mt-6' : 'hidden'}>
          <CurrencyManagementTab
            settings={settings}
            updateSetting={updateSetting}
            currencies={currencies}
            direction={direction}
          />
        </div>

        {/* Default Accounts Tab — Enhanced */}

        <div className={activeTab === 'accounts' ? 'mt-6 space-y-6' : 'hidden'}>
          {/* Status Summary */}
          {(() => {
            const accountFields: string[] = [
              'default_cash_account_id', 'default_bank_account_id',
              'default_revenue_account_id', 'default_expense_account_id',
              'default_receivable_account_id', 'default_payable_account_id',
              'default_purchase_account_id',
              'default_inventory_account_id',
              'default_transit_purchase_account_id',
              'default_fx_gain_account_id', 'default_fx_loss_account_id',
              'default_freight_in_account_id',
              'default_retained_earnings_account_id',
            ];
            // Include exchange accounts in the count when exchange module is active
            const exchangeFields = isExchangeModuleActive ? [
              'profit_account_id', 'loss_account_id', 'commission_income_account_id',
              'remittance_payable_account_id', 'remittance_receivable_account_id',
              'agents_payable_account_id', 'partners_receivable_account_id',
            ] : [];
            const configured = accountFields.filter(f => !!(settings as any)[f]).length
              + exchangeFields.filter(f => !!(exchangeSettings as any)[f]).length;
            const total = accountFields.length + exchangeFields.length;
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
                {getLocalizedLabel('stg_currency_settings', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_base_and_local_currency_locked', language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_base_currency', language)}</Label>
                  {hasJournalEntries && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1"><Lock className="w-3 h-3" />{getLocalizedLabel('stg_locked', language)}</Badge>}
                </div>
                <Select
                  value={settings.base_currency || ''}
                  onValueChange={(v) => updateSetting('base_currency', v)}
                  disabled={hasJournalEntries}
                >
                  <SelectTrigger className={hasJournalEntries ? 'opacity-70 cursor-not-allowed' : ''}>
                    <SelectValue placeholder={getLocalizedLabel('stg_select_currency', language)} />
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
                    ? (getLocalizedLabel('stg_cannot_change_base_currency_af', language))
                    : (getLocalizedLabel('stg_primary_accounting_currency_al', language))}
                </p>
              </div>

              {/* Default Sales Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_default_sales_currency', language)}</Label>
                </div>
                <Select
                  value={settings.default_sales_currency || ''}
                  onValueChange={(v) => updateSetting('default_sales_currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={getLocalizedLabel('stg_select_currency', language)} />
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
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_default_currency_for_sales_inv', language)}</p>
              </div>

              {/* Default Purchase Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_default_purchase_currency', language)}</Label>
                </div>
                <Select
                  value={settings.default_purchase_currency || ''}
                  onValueChange={(v) => updateSetting('default_purchase_currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={getLocalizedLabel('stg_select_currency', language)} />
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
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_default_currency_for_purchase_', language)}</p>
              </div>

              {/* Supported Currencies Info */}
              <div className="space-y-2">
                <Label>{getLocalizedLabel('stg_supported_currencies', language)}</Label>
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
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_active_currencies_add_more_fro', language)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group 1: Financial Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="w-5 h-5 text-erp-teal" />
                {getLocalizedLabel('stg_financial_accounts', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_cash_bank_and_receivables_paya', language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_cash_account', language)}</Label>
                  {settings.default_cash_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_cash_account_id || ''} onValueChange={(v) => updateSetting('default_cash_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_used_for_cash_receipts_and_pay', language)}</p>
              </div>

              {/* Bank */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_bank_account', language)}</Label>
                  {settings.default_bank_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_bank_account_id || ''} onValueChange={(v) => updateSetting('default_bank_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_used_for_bank_transfers_and_de', language)}</p>
              </div>

              {/* Receivable */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_accounts_receivable', language)}</Label>
                  {settings.default_receivable_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_receivable_account_id || ''} onValueChange={(v) => updateSetting('default_receivable_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_customer_account_used_in_sales', language)}</p>
              </div>

              {/* Payable */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_accounts_payable', language)}</Label>
                  {settings.default_payable_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_payable_account_id || ''} onValueChange={(v) => updateSetting('default_payable_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_vendor_account_used_in_purchas', language)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group 2: Operational Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-erp-teal" />
                {getLocalizedLabel('stg_operational_accounts', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_revenue_expenses_and_purchases', language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_revenue_account', language)}</Label>
                  {settings.default_revenue_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_revenue_account_id || ''} onValueChange={(v) => updateSetting('default_revenue_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('income'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_auto_used_in_sales_invoices', language)}</p>
              </div>

              {/* Expense */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_expense_account', language)}</Label>
                  {settings.default_expense_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_expense_account_id || ''} onValueChange={(v) => updateSetting('default_expense_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_used_for_general_and_operation', language)}</p>
              </div>

              {/* Purchases/COGS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_purchases_cogs', language)}</Label>
                  {(settings as any).default_purchase_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_required', language)}</Badge>}
                </div>
                <Select value={(settings as any).default_purchase_account_id || ''} onValueChange={(v) => updateSetting('default_purchase_account_id' as any, v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_debit_side_for_purchase_invoic', language)}</p>
              </div>

              {/* Tax Accounts → Managed in /system-config/tax */}
              <div className="col-span-full p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/20">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 font-tajawal">
                    {language === 'ar'
                      ? 'حسابات الضريبة (مدخلات / مخرجات) تُدار من '
                      : 'Tax accounts (input / output) are managed in '}
                    <a href="/system-config/tax" className="text-erp-teal hover:underline font-medium">
                      {getLocalizedLabel('stg_settings_tax_compliance', language)}
                    </a>
                  </span>
                </div>
              </div>

              {/* Inventory Account */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_inventory_account', language)}</Label>
                  {settings.default_inventory_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_inventory_account_id || ''} onValueChange={(v) => updateSetting('default_inventory_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_goods_fabric_inventory_account', language)}</p>
              </div>

              {/* Transit Purchase Account (1145) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_purchases_in_transit', language)}</Label>
                  {settings.default_transit_purchase_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_required', language)}</Badge>}
                </div>
                <Select value={settings.default_transit_purchase_account_id || ''} onValueChange={(v) => updateSetting('default_transit_purchase_account_id' as any, v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_transit_account_for_internatio', language)}</p>
              </div>

              {/* Freight In */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_freight_in', language)}</Label>
                  {settings.default_freight_in_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_freight_in_account_id || ''} onValueChange={(v) => updateSetting('default_freight_in_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('expenses'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_shipping_costs_on_purchases_an', language)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group 3: Advanced Accounts — FX, Retained Earnings, Advances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5 text-erp-teal" />
                {getLocalizedLabel('stg_advanced_accounts', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_currency_differences_retained_', language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Retained Earnings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_retained_earnings', language)}</Label>
                  {settings.default_retained_earnings_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_retained_earnings_account_id || ''} onValueChange={(v) => updateSetting('default_retained_earnings_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('equity'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_used_for_year_end_closing_prof', language)}</p>
              </div>

              {/* Customer Advance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_customer_advances', language)}</Label>
                  {settings.default_customer_advance_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_customer_advance_account_id || ''} onValueChange={(v) => updateSetting('default_customer_advance_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_advance_payments_from_customer', language)}</p>
              </div>

              {/* Supplier Advance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{getLocalizedLabel('stg_supplier_advances', language)}</Label>
                  {settings.default_supplier_advance_account_id
                    ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                </div>
                <Select value={settings.default_supplier_advance_account_id || ''} onValueChange={(v) => updateSetting('default_supplier_advance_account_id', v)}>
                  <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                  <SelectContent>
                    {renderGroupedOptions(getAccountsByClassification('assets'))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{getLocalizedLabel('stg_advance_payments_to_suppliers_', language)}</p>
              </div>
            </CardContent>
          </Card>

          {/* ═══ Group 4: Exchange & Remittance Accounts (conditional) ═══ */}
          {isExchangeModuleActive && (
            <>
              <Card className="border-amber-200/60 dark:border-amber-800/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                    {getLocalizedLabel('stg_exchange_remittance_accounts', language)}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 ms-2">
                      {getLocalizedLabel('stg_exchange_module', language)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {getLocalizedLabel('stg_exchange_and_fx_difference_acc', language)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Exchange Profit */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_fx_gains_exchange', language)}</Label>
                      {exchangeSettings.profit_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.profit_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, profit_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('income'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_gains_from_direct_currency_exc', language)}</p>
                  </div>

                  {/* Exchange Loss */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_fx_losses_exchange', language)}</Label>
                      {exchangeSettings.loss_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.loss_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, loss_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('expenses'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_losses_from_direct_currency_ex', language)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Remittance Accounts */}
              <Card className="border-blue-200/60 dark:border-blue-800/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Send className="w-5 h-5 text-blue-500" />
                    {getLocalizedLabel('stg_remittance_accounts', language)}
                  </CardTitle>
                  <CardDescription>
                    {getLocalizedLabel('stg_commissions_and_receivables_pa', language)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Commission Income */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_remittance_commission_income', language)}</Label>
                      {exchangeSettings.commission_income_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.commission_income_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, commission_income_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('income'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_our_commission_per_remittance_', language)}</p>
                  </div>

                  {/* Remittance Payable */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_remittances_payable', language)}</Label>
                      {exchangeSettings.remittance_payable_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.remittance_payable_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, remittance_payable_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_our_obligation_to_deliver_remi', language)}</p>
                  </div>

                  {/* Remittance Receivable */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_outgoing_remittance_receivable', language)}</Label>
                      {exchangeSettings.remittance_receivable_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.remittance_receivable_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, remittance_receivable_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('assets'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_remittance_amounts_awaiting_co', language)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Agent & Partner Accounts */}
              <Card className="border-violet-200/60 dark:border-violet-800/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Landmark className="w-5 h-5 text-violet-500" />
                    {getLocalizedLabel('stg_agent_partner_accounts', language)}
                  </CardTitle>
                  <CardDescription>
                    {getLocalizedLabel('stg_mutual_receivables_and_payable', language)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Agents Payable */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_agents_payable', language)}</Label>
                      {exchangeSettings.agents_payable_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.agents_payable_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, agents_payable_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('liabilities'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_amounts_we_owe_to_agents_232', language)}</p>
                  </div>

                  {/* Partners Payable */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{getLocalizedLabel('stg_partners_payable', language)}</Label>
                      {exchangeSettings.partners_receivable_account_id
                        ? <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_set', language)}</Badge>
                        : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getLocalizedLabel('stg_not_set', language)}</Badge>}
                    </div>
                    <Select value={exchangeSettings.partners_receivable_account_id || ''} onValueChange={(v) => setExchangeSettings(prev => ({ ...prev, partners_receivable_account_id: v, company_id: prev.company_id || companyId || '' }))}>
                      <SelectTrigger><SelectValue placeholder={getLocalizedLabel('stg_select_account', language)} /></SelectTrigger>
                      <SelectContent>
                        {renderGroupedOptions(getAccountsByClassification('liabilities', 'assets'))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{getLocalizedLabel('stg_partner_current_accounts_233', language)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-post settings for exchange */}
              <Card className="border-gray-200/60 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {getLocalizedLabel('stg_auto_post_exchange', language)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{getLocalizedLabel('stg_auto_post_exchange_operations', language)}</Label>
                      <p className="text-xs text-gray-500">{getLocalizedLabel('stg_auto_post_entry_when_exchange_', language)}</p>
                    </div>
                    <Switch checked={exchangeSettings.auto_post_exchange || false} onCheckedChange={(v) => setExchangeSettings(prev => ({ ...prev, auto_post_exchange: v, company_id: prev.company_id || companyId || '' }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{getLocalizedLabel('stg_auto_post_remittances', language)}</Label>
                      <p className="text-xs text-gray-500">{getLocalizedLabel('stg_auto_post_entry_when_remittanc', language)}</p>
                    </div>
                    <Switch checked={exchangeSettings.auto_post_remittance || false} onCheckedChange={(v) => setExchangeSettings(prev => ({ ...prev, auto_post_remittance: v, company_id: prev.company_id || companyId || '' }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{getLocalizedLabel('stg_auto_post_fx_variances', language)}</Label>
                      <p className="text-xs text-gray-500">{getLocalizedLabel('stg_auto_post_currency_rate_differ', language)}</p>
                    </div>
                    <Switch checked={exchangeSettings.auto_post_variance || false} onCheckedChange={(v) => setExchangeSettings(prev => ({ ...prev, auto_post_variance: v, company_id: prev.company_id || companyId || '' }))} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Fiscal Years Tab */}
        <div className={activeTab === 'fiscal' ? 'mt-6 space-y-6' : 'hidden'}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {getLocalizedLabel('stg_fiscal_years', language)}
              </h2>
              <p className="text-sm text-gray-500">
                {language === 'ar'
                  ? 'إدارة السنوات والفترات المحاسبية'
                  : 'Manage fiscal years and accounting periods'}
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              {getLocalizedLabel('stg_add_new_year', language)}
            </Button>
          </div>

          <div className="grid gap-4">
            {fiscalYears.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{getLocalizedLabel('stg_no_fiscal_years', language)}</AlertTitle>
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
                              {year.name || year.code || `${year.start_date?.substring(0, 4)}`}
                            </span>
                            {year.is_current && (
                              <Badge variant="default" className="bg-erp-teal">
                                {getLocalizedLabel('stg_current', language)}
                              </Badge>
                            )}
                            {year.is_closed && (
                              <Badge variant="secondary">
                                {getLocalizedLabel('stg_closed', language)}
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
        </div>

        {/* Numbering Tab */}
        <div className={activeTab === 'numbering' ? 'mt-6' : 'hidden'}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-erp-teal" />
                {getLocalizedLabel('stg_entry_numbering', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_configure_journal_entry_numb', language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{getLocalizedLabel('stg_entry_number_prefix', language)}</Label>
                  <Input
                    value={settings.journal_entry_prefix}
                    onChange={(e) => updateSetting('journal_entry_prefix', e.target.value)}
                    placeholder="JE"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500">
                    {`${getLocalizedLabel('stg_example', language)}: ${settings.journal_entry_prefix}-2026-00001`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{getLocalizedLabel('stg_current_sequence', language)}</Label>
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
                  <Label>{getLocalizedLabel('stg_reset_yearly', language)}</Label>
                  <p className="text-sm text-gray-500">
                    {getLocalizedLabel('stg_reset_numbering_to_1_at_the_', language)}
                  </p>
                </div>
                <Switch
                  checked={settings.reset_numbering_yearly}
                  onCheckedChange={(v) => updateSetting('reset_numbering_yearly', v)}
                />
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>{getLocalizedLabel('stg_current_format', language)}</AlertTitle>
                <AlertDescription className="font-mono">
                  {settings.journal_entry_prefix}-{new Date().getFullYear()}-{String(settings.current_entry_number).padStart(5, '0')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Edit Settings Tab (NEW) */}
        <div className={activeTab === 'editSettings' ? 'mt-6 space-y-6' : 'hidden'}>
          {/* Fiscal Year Mode */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-erp-teal" />
                {getLocalizedLabel('stg_fiscal_year_management_mode', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_choose_how_to_handle_closed_', language)}
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
                          {getLocalizedLabel('stg_independent_years', language)}
                        </h3>
                        {editSettings.fiscal_year_mode === 'independent' && (
                          <CheckCircle2 className="w-5 h-5 text-erp-teal" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        {getLocalizedLabel('stg_each_closed_fiscal_year_is_i', language)}
                      </p>
                      <Badge variant="secondary" className="mt-3">
                        {getLocalizedLabel('stg_recommended_for_smbs', language)}
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
                          {getLocalizedLabel('stg_linked_years', language)}
                        </h3>
                        {editSettings.fiscal_year_mode === 'linked' && (
                          <CheckCircle2 className="w-5 h-5 text-erp-teal" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        {getLocalizedLabel('stg_fiscal_years_are_linked__can', language)}
                      </p>
                      <Badge variant="secondary" className="mt-3">
                        {getLocalizedLabel('stg_recommended_for_large_regulate', language)}
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
                {getLocalizedLabel('stg_edit_settings', language)}
              </CardTitle>
              <CardDescription>
                {getLocalizedLabel('stg_control_how_posted_entries_c', language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{getLocalizedLabel('stg_allow_direct_edit_on_posted_en', language)}</Label>
                    <p className="text-sm text-gray-500">
                      {getLocalizedLabel('stg_system_auto_unposts__edits__', language)}
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
                    <Label>{getLocalizedLabel('stg_auto_re_post_after_save', language)}</Label>
                    <p className="text-sm text-gray-500">
                      {getLocalizedLabel('stg_automatically_post_entry_aft', language)}
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
                    <Label>{getLocalizedLabel('stg_require_edit_reason', language)}</Label>
                    <p className="text-sm text-gray-500">
                      {getLocalizedLabel('stg_require_user_to_enter_a_reas', language)}
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
                    <Label>{getLocalizedLabel('stg_notify_on_posted_edit', language)}</Label>
                    <p className="text-sm text-gray-500">
                      {getLocalizedLabel('stg_send_notification_when_editi', language)}
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
                  {getLocalizedLabel('stg_closed_year_settings', language)}
                </CardTitle>
                <CardDescription>
                  {getLocalizedLabel('stg_control_edit_permissions_for', language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="space-y-0.5">
                      <Label>{getLocalizedLabel('stg_allow_edit_on_closed_years', language)}</Label>
                      <p className="text-sm text-amber-700">
                        {getLocalizedLabel('stg__edits_will_not_affect_openin', language)}
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
                      <Label>{getLocalizedLabel('stg_allow_delete_in_closed_years', language)}</Label>
                      <p className="text-sm text-red-700">
                        {getLocalizedLabel('stg__not_recommended___deletions_', language)}
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
                      <Label>{getLocalizedLabel('stg_link_adjustment_entries_to_ori', language)}</Label>
                      <p className="text-sm text-gray-500">
                        {getLocalizedLabel('stg_create_a_link_between_adjust', language)}
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
              <AlertTitle className="text-blue-800">{getLocalizedLabel('stg_linked_years_mode', language)}</AlertTitle>
              <AlertDescription className="text-blue-700">
                {getLocalizedLabel('stg_in_this_mode__closed_fiscal_', language)}
              </AlertDescription>
            </Alert>
          )}

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5 text-erp-teal" />
                {getLocalizedLabel('stg_notifications', language)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>{getLocalizedLabel('stg_notify_cfo_on_closed_year_edit', language)}</Label>
                    <p className="text-sm text-gray-500">
                      {getLocalizedLabel('stg_send_notification_to_cfo', language)}
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
                    <Label>{getLocalizedLabel('stg_notify_on_large_adjustments', language)}</Label>
                    <p className="text-sm text-gray-500">
                      {`${getLocalizedLabel('stg_value_greater_than', language)} ${editSettings.notifications.large_adjustment_threshold.toLocaleString()}`}
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
                  <Label>{getLocalizedLabel('stg_large_adjustment_threshold', language)}</Label>
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
        </div>

        {/* ═══ Cost Centers Tab ═══ */}
        <div className={activeTab === 'costCenters' ? 'mt-6 space-y-6' : 'hidden'}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Landmark className="w-5 h-5 text-erp-teal" />
                    {getLocalizedLabel('stg_cost_center_management', language)}
                  </CardTitle>
                  <CardDescription>
                    {getLocalizedLabel('stg_add__edit_and_delete_cost_ce', language)}
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
                    {getLocalizedLabel('stg_add', language)}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Row */}
              {showAddCC && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Input
                    placeholder={getLocalizedLabel('stg_code', language)}
                    value={newCC.code}
                    onChange={(e) => setNewCC(p => ({ ...p, code: e.target.value }))}
                    className="w-24"
                  />
                  <Input
                    placeholder={getLocalizedLabel('stg_name_arabic', language)}
                    value={newCC.name_ar}
                    onChange={(e) => setNewCC(p => ({ ...p, name_ar: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder={getLocalizedLabel('stg_name_english', language)}
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
                      toast({ title: getLocalizedLabel('stg_added', language), description: newCC.name_ar });
                      setShowAddCC(false);
                      // Refresh
                      const { data } = await supabase.from('cost_centers').select('*').eq('company_id', companyId).order('code');
                      if (data) setCostCentersList(data);
                    } catch (err: any) {
                      toast({ title: getLocalizedLabel('stg_error', language), description: err.message, variant: 'destructive' });
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
                      <th className="px-4 py-2.5 text-start font-medium w-24">{getLocalizedLabel('stg_code', language)}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{getLocalizedLabel('stg_arabic_name', language)}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{getLocalizedLabel('stg_english_name', language)}</th>
                      <th className="px-4 py-2.5 text-center font-medium w-24">{getLocalizedLabel('stg_status', language)}</th>
                      <th className="px-4 py-2.5 text-center font-medium w-24">{getLocalizedLabel('stg_actions', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costCentersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {getLocalizedLabel('stg_no_cost_centers_click_add_to_c', language)}
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
                                    toast({ title: getLocalizedLabel('stg_updated', language) });
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
                                {cc.is_active ? (getLocalizedLabel('stg_active', language)) : (getLocalizedLabel('stg_inactive', language))}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCC({ ...cc })}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={async () => {
                                  if (!confirm(getLocalizedLabel('stg_are_you_sure', language))) return;
                                  const { error } = await supabase.from('cost_centers').delete().eq('id', cc.id);
                                  if (!error) {
                                    setCostCentersList(prev => prev.filter(c => c.id !== cc.id));
                                    toast({ title: getLocalizedLabel('stg_deleted', language) });
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
                {`${getLocalizedLabel('stg_total_cost_centers_', language)} ${costCentersList.length}`}
              </p>
            </CardContent>
          </Card>
        </div>

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
                {getLocalizedLabel('stg_saving', language)}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {getLocalizedLabel('stg_save_settings', language)}
              </>
            )}
          </Button>
        </div>
      </div>
    </div >
  );
}
