/**
 * ════════════════════════════════════════════════════════════════
 * ⚙️ ExchangeSettings — إعدادات الصرافة المتكاملة
 * ════════════════════════════════════════════════════════════════
 * V2 — متزامن مع إعدادات الشركة العامة
 * يضم: الحسابات الافتراضية + العملات + أسعار الصرف + التكاملات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CurrencyManagementTab from '@/features/accounting/components/CurrencyManagementTab';
import IntegrationsTab from '@/features/settings/components/IntegrationsTab';
import { cn } from '@/lib/utils';
import {
  Settings, DollarSign, Globe, Wallet, Shield, Save, Loader2,
  CheckCircle2, AlertTriangle, ArrowRightLeft, Send, Bot,
  MessageCircle, Sparkles, Bell, Link2, Info, Mail, Eye, Rocket,
  Landmark, TrendingUp, CreditCard, Hash,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types ────────────────────────────────────────────────────
interface ExchangeSettingsData {
  id?: string;
  company_id?: string;
  base_currency?: string;
  active_currencies?: string[];
  default_margin?: number;
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
  daily_limit_per_customer?: number;
  monthly_limit_per_customer?: number;
  single_transaction_limit?: number;
  exchange_number_prefix?: string;
  remittance_number_prefix?: string;
  telegram_enabled?: boolean;
  telegram_notifications?: boolean;
  ai_enabled?: boolean;
  whatsapp_enabled?: boolean;
  // ─── Notification settings (JSONB) ───────────────────────
  notification_channels?: {
    telegram: boolean;
    whatsapp: boolean;
    email: boolean;
    in_app: boolean;
  };
  // Structure: { trigger_key: { recipient_key: ['channel1', 'channel2'] } }
  remittance_notifications?: Record<string, Record<string, string[]>>;
  exchange_notifications?: Record<string, Record<string, string[]>>;
}

interface CompanySettings {
  base_currency?: string;
  supported_currencies?: string[];
  default_sales_currency?: string;
  default_purchase_currency?: string;
  default_international_purchase_currency?: string;
  [key: string]: any;
}

interface Account {
  id: string;
  account_code: string;
  name_ar: string;
  name_en: string;
  classification?: string;
}

// ═══════════════════════════════════════════════════════════════
export default function ExchangeSettings() {
  const { t, language, direction } = useLanguage();
  const { companyId, company } = useCompany();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRecipient, setActiveRecipient] = useState('employee');
  const [testingTrigger, setTestingTrigger] = useState<string | null>(null);

  const [exchangeSettings, setExchangeSettings] = useState<ExchangeSettingsData>({});
  const [companySettings, setCompanySettings] = useState<CompanySettings>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<{ code: string; name: string; nameEn: string; symbol: string }[]>([]);

  const nc = exchangeSettings.notification_channels || { telegram: true, whatsapp: false, email: false, in_app: true };

  // ─── Test Notification ────────────────────────────────────
  const sendTestNotification = async (triggerKey: string, section: 'remittance_notifications' | 'exchange_notifications') => {
    if (testingTrigger) return;
    setTestingTrigger(triggerKey);
    const isAr = language === 'ar';

    // Build sample message with real-looking data
    const sampleMessages: Record<string, string> = {
      draft_created: isAr ? '📝 مرحباً أحمد\nتم إنشاء مسودة حوالة جديدة\n📋 رقم: RM-2026-00042\n💰 المبلغ: 1,500 USD\n👤 المستفيد: محمد علي\n⏳ بانتظار التأكيد\n\nTexaCore — خدمتكم شرف لنا' : '📝 Hello Ahmed\nNew remittance draft\n📋 Ref: RM-2026-00042\n💰 Amount: 1,500 USD\n👤 To: Mohammad Ali\n⏳ Pending\n\nTexaCore',
      confirmed: isAr ? '✅ تم تأكيد حوالتك بنجاح!\n📋 رقم: RM-2026-00042\n💰 المبلغ: 1,500 USD\n👤 المستفيد: محمد علي\n🔄 قيد المعالجة والتنفيذ\n\nسنبقيك على اطلاع 🙏\nTexaCore' : '✅ Confirmed!\n📋 Ref: RM-2026-00042\n💰 1,500 USD\n👤 To: Mohammad Ali\n🔄 Processing',
      executed: isAr ? '⚡ تم تنفيذ حوالتك!\n📋 رقم: RM-2026-00042\n📍 تسليم عبر الوكيل\n🏢 فرع اسطنبول\n✨ في الطريق إلى محمد علي\nTexaCore' : '⚡ Executed!\n📋 Ref: RM-2026-00042\n📍 Agent delivery\n🏢 Istanbul Branch',
      delivered: isAr ? '📬 تم تسليم حوالتك بنجاح!\n📋 رقم: RM-2026-00042\n👤 محمد علي\n🎉 شكراً لثقتك بنا!\nTexaCore' : '📬 Delivered!\n📋 Ref: RM-2026-00042\n🎉 Thank you!',
      completed: isAr ? '✔️ اكتملت حوالتك بنجاح! 🎉\n📋 رقم: RM-2026-00042\n🙏 شكراً لاستخدامك خدمات TexaCore' : '✔️ Completed! 🎉\n📋 Ref: RM-2026-00042\n🙏 Thank you!',
      returned: isAr ? '↩️ تم إرجاع حوالتك\n📋 رقم: RM-2026-00042\n📝 السبب: بيانات المستفيد غير صحيحة' : '↩️ Returned\n📋 Ref: RM-2026-00042\n📝 Reason: Invalid beneficiary data',
      cancelled: isAr ? '❌ تم إلغاء حوالتك\n📋 رقم: RM-2026-00042' : '❌ Cancelled\n📋 Ref: RM-2026-00042',
      new_exchange: isAr ? '💱 عملية صرف تجريبية\n💰 1,000 USD → TRY' : '💱 Test exchange\n💰 1,000 USD → TRY',
      rate_update: isAr ? '💹 تحديث سعر صرف تجريبي' : '💹 Test rate update',
      limit_exceeded: isAr ? '⚠️ تجاوز حد تجريبي' : '⚠️ Test limit exceeded',
    };

    const message = sampleMessages[triggerKey] || (isAr ? `🔔 إشعار تجريبي — ${triggerKey}` : `🔔 Test — ${triggerKey}`);
    const results: string[] = [];

    try {
      // Load company integrations once — test ALL configured, regardless of nc toggles
      const { data: company } = await supabase.from('companies').select('integrations').eq('id', companyId).single();
      const integrations = company?.integrations || {};
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Telegram test (if bot is configured in integrations)
      if (integrations.telegram?.bot_token) {
        try {
          const botToken = integrations.telegram.bot_token;
          const { data: tgConn } = await supabase
            .from('telegram_connections')
            .select('telegram_chat_id')
            .eq('user_id', user?.id)
            .maybeSingle();
          
          if (tgConn?.telegram_chat_id) {
            const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: tgConn.telegram_chat_id, text: message, parse_mode: 'HTML' }),
            });
            const result = await resp.json();
            results.push(result.ok ? '✅ Telegram' : `❌ Telegram: ${result.description}`);
          } else {
            results.push(isAr ? '⚠️ تلغرام: حسابك غير مربوط بالبوت' : '⚠️ Telegram: Not connected to bot');
          }
        } catch { results.push('❌ Telegram: Error'); }
      }

      // 2. WhatsApp test (if Twilio is configured in integrations)
      if (integrations.twilio?.account_sid && integrations.twilio?.auth_token) {
        try {
          const twilio = integrations.twilio;
          if (twilio.whatsapp_sender) {
            // Normalize the sender number
            let senderNum = (twilio.whatsapp_sender || '').replace(/^whatsapp:/i, '').replace(/[\s\-()]/g, '').trim();
            if (!senderNum.startsWith('+')) senderNum = '+' + senderNum.replace(/^00/, '');

            const { data: profile } = await supabase.from('user_profiles').select('phone').eq('id', user?.id).single();
            let phone = profile?.phone?.replace(/[\s\-()]/g, '').replace(/^00/, '+');
            if (phone && !phone.startsWith('+')) phone = '+' + phone;
            
            console.log('[TestNotif] 📱 WhatsApp config:', { sender: senderNum, userPhone: phone, originalSender: twilio.whatsapp_sender });

            if (phone && phone.length >= 10) {
              const fromAddr = `whatsapp:${senderNum}`;
              const toAddr = `whatsapp:${phone}`;
              
              const urlParams = new URLSearchParams();
              urlParams.append('From', fromAddr);
              urlParams.append('To', toAddr);
              urlParams.append('Body', message);
              const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.account_sid}/Messages.json`, {
                method: 'POST',
                headers: { 'Authorization': 'Basic ' + btoa(`${twilio.account_sid}:${twilio.auth_token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
                body: urlParams,
              });
              const respData = await resp.json().catch(() => ({} as any));
              console.log('[TestNotif] WhatsApp Response:', JSON.stringify(respData, null, 2));

              if (resp.ok) {
                const msgSid = respData.sid;
                const initialStatus = respData.status; // queued, sent, delivered, failed, undelivered
                console.log(`[TestNotif] ✅ WhatsApp accepted. SID: ${msgSid}, Status: ${initialStatus}`);

                // Wait 3s then re-check actual delivery status
                if (msgSid) {
                  await new Promise(r => setTimeout(r, 3000));
                  try {
                    const checkResp = await fetch(
                      `https://api.twilio.com/2010-04-01/Accounts/${twilio.account_sid}/Messages/${msgSid}.json`,
                      { headers: { 'Authorization': 'Basic ' + btoa(`${twilio.account_sid}:${twilio.auth_token}`) } }
                    );
                    const checkData = await checkResp.json().catch(() => ({} as any));
                    const finalStatus = checkData.status;
                    const errorCode = checkData.error_code;
                    const errorMsg = checkData.error_message;
                    console.log(`[TestNotif] WhatsApp status after 3s: ${finalStatus}`, { errorCode, errorMsg });

                    if (['delivered', 'sent', 'read'].includes(finalStatus)) {
                      results.push(`✅ WhatsApp → ${phone} (${finalStatus})`);
                    } else if (['failed', 'undelivered'].includes(finalStatus)) {
                      results.push(`❌ WhatsApp [${errorCode}]: ${errorMsg || finalStatus}`);
                    } else {
                      results.push(`⏳ WhatsApp → ${phone} (${finalStatus}) — SID: ${msgSid?.slice(-8)}`);
                    }
                  } catch {
                    results.push(`⏳ WhatsApp → ${phone} (${initialStatus}) — SID: ${msgSid?.slice(-8)}`);
                  }
                } else {
                  results.push(`✅ WhatsApp → ${phone}`);
                }
              } else {
                console.error('🔴 Twilio WhatsApp Error:', { status: resp.status, respData, from: fromAddr, to: toAddr });
                const errMsg = respData?.message || respData?.more_info || '';
                const errCode = respData?.code || resp.status;
                results.push(`❌ WhatsApp [${errCode}]: ${errMsg}`);
              }
            } else {
              results.push(isAr 
                ? `⚠️ واتس: رقم الهاتف غير صالح (${profile?.phone || 'فارغ'})` 
                : `⚠️ WhatsApp: Invalid phone (${profile?.phone || 'empty'})`);
            }
          } else {
            results.push(isAr ? '⚠️ واتس: لم يتم تحديد رقم واتس آب' : '⚠️ WhatsApp: No sender number set');
          }
        } catch (e: any) {
          console.error('[TestNotif] WhatsApp error:', e);
          results.push(`❌ WhatsApp: ${e.message}`);
        }
      }

      // 3. Email test (placeholder — will use send-email Edge Function)
      if (integrations.google?.connected) {
        results.push(isAr ? '📧 Email: جاهز (Google متصل)' : '📧 Email: Ready (Google connected)');
      }

      // 4. In-App always works
      results.push('✅ In-App (toast)');

      toast({
        title: isAr ? '🚀 نتائج الاختبار' : '🚀 Test Results',
        description: results.join('\n') || (isAr ? 'لا توجد قنوات مفعلة' : 'No channels enabled'),
      });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setTestingTrigger(null);
    }
  };

  // ─── Load Data ────────────────────────────────────────────
  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  // ─── Account code → setting key mapping ─────────────────
  // V7 Chart: حسابات الصرافة بالترقيم الجديد (13, 23, 43, 54)
  const ACCOUNT_CODE_MAP: Record<string, keyof ExchangeSettingsData> = {
    '433': 'profit_account_id',        // أرباح فروقات عملات - صرافة
    '543': 'loss_account_id',          // خسائر فروقات عملات
    '431': 'commission_income_account_id', // إيرادات عمولات صرف
    '432': 'commission_income_account_id', // إيرادات عمولات حوالات (fallback)
    '231': 'remittance_payable_account_id', // حوالات مستحقة للتسليم
    '131': 'remittance_receivable_account_id', // ذمم حوالات صادرة
    '232': 'agents_payable_account_id', // ذمم الوكلاء الدائنة
    '233': 'partners_receivable_account_id', // ذمم الشركاء الدائنة
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load core data first (these tables always exist)
      const [
        { data: cSettings },
        { data: accs },
        { data: currs },
      ] = await Promise.all([
        supabase.from('company_accounting_settings').select('*').eq('company_id', companyId).maybeSingle(),
        supabase.from('chart_of_accounts').select('id, account_code, name_ar, name_en, account_types(classification)')
          .eq('company_id', companyId).eq('is_detail', true).eq('is_active', true).order('account_code'),
        supabase.from('currencies').select('code, name, name_ar, symbol').order('code'),
      ]);

      // Try exchange_settings separately (table may not exist yet → 404)
      let exSettings: any = null;
      try {
        const { data, error } = await supabase.from('exchange_settings').select('*').eq('company_id', companyId).maybeSingle();
        if (!error) exSettings = data;
      } catch {
        // Table doesn't exist — that's OK, use defaults
        console.warn('[ExchangeSettings] exchange_settings table not found, using defaults');
      }

      // Map accounts
      const accountsList: Account[] = (accs || []).map((a: any) => ({
        id: a.id,
        account_code: a.account_code,
        name_ar: a.name_ar,
        name_en: a.name_en || a.name_ar,
        classification: (a.account_types as any)?.classification || '',
      }));
      setAccounts(accountsList);

      // Build exchange settings with auto-fill for unset accounts
      const loadedSettings: ExchangeSettingsData = exSettings || { company_id: companyId };

      // Auto-fill default accounts from chart_of_accounts using code matching
      const codeToId = new Map<string, string>();
      accountsList.forEach(a => {
        const suffix4 = a.account_code.slice(-4);
        if (!codeToId.has(suffix4)) codeToId.set(suffix4, a.id);
      });

      for (const [code, settingKey] of Object.entries(ACCOUNT_CODE_MAP)) {
        if (!(loadedSettings as any)[settingKey]) {
          const accountId = codeToId.get(code);
          if (accountId) {
            (loadedSettings as any)[settingKey] = accountId;
          }
        }
      }

      setExchangeSettings(loadedSettings);

      setCompanySettings({
        base_currency: cSettings?.base_currency || company?.default_currency || 'USD',
        supported_currencies: cSettings?.supported_currencies || [],
        default_sales_currency: cSettings?.default_sales_currency || '',
        default_purchase_currency: cSettings?.default_purchase_currency || '',
      });

      if (currs) {
        const unique = new Map<string, any>();
        currs.forEach((c: any) => {
          if (!unique.has(c.code)) {
            unique.set(c.code, { code: c.code, name: c.name_ar || c.name, nameEn: c.name, symbol: c.symbol });
          }
        });
        setCurrencies(Array.from(unique.values()));
      }
    } catch (e) {
      console.error('Failed loading exchange settings:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // Map frontend field names → actual DB column names
      const payload: Record<string, any> = {
        company_id: companyId,
        // General settings
        default_currency: exchangeSettings.base_currency || 'USD',
        profit_margin_percent: exchangeSettings.default_margin || 1.0,
        auto_post_transactions: exchangeSettings.auto_post_exchange ?? true,
        auto_post_remittances: exchangeSettings.auto_post_remittance ?? true,
        // Limits
        daily_limit_per_customer: exchangeSettings.daily_limit_per_customer || null,
        monthly_limit_per_customer: exchangeSettings.monthly_limit_per_customer || null,
        single_transaction_limit: exchangeSettings.single_transaction_limit || null,
        // Accounting accounts (map to actual DB columns)
        currency_gain_account_id: exchangeSettings.profit_account_id || null,
        currency_loss_account_id: exchangeSettings.loss_account_id || null,
        commission_revenue_account_id: exchangeSettings.commission_income_account_id || null,
        agent_payable_account_id: exchangeSettings.agents_payable_account_id || null,
        partner_payable_account_id: exchangeSettings.partners_receivable_account_id || null,
        remittance_receivable_account_id: exchangeSettings.remittance_receivable_account_id || null,
        // Notifications (JSONB)
        notification_channels: exchangeSettings.notification_channels || { telegram: true, whatsapp: false, email: false, in_app: true },
        remittance_notifications: exchangeSettings.remittance_notifications || {},
        exchange_notifications: exchangeSettings.exchange_notifications || {},
        ai_enabled: exchangeSettings.ai_enabled || false,
      };
      
      // Try to save to exchange_settings
      const { error } = await supabase
        .from('exchange_settings')
        .upsert(payload, { onConflict: 'company_id' });

      if (error) {
        // If table doesn't exist (404/42P01), just warn — settings are kept in memory
        if (error.code === '42P01' || error.message?.includes('404') || error.message?.includes('relation')) {
          console.warn('[ExchangeSettings] Table not found, settings stored locally only');
          toast({
            title: t('exchange.settings.savedTitle'),
            description: t('exchange.settings.savedDesc'),
          });
          return;
        }
        throw error;
      }
      
      toast({
        title: t('exchange.settings.savedTitle'),
        description: t('exchange.settings.savedDesc'),
      });
    } catch (e: any) {
      console.error('Save error:', e);
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setExchangeSettings(prev => ({ ...prev, [key]: value }));
  };

  // ─── Helpers ─────────────────────────────────────────────
  const renderAccountSelect = (
    label: string,
    description: string,
    settingKey: keyof ExchangeSettingsData,
    classifications: string[],
  ) => {
    const filteredAccounts = accounts.filter(a => classifications.length === 0 || classifications.includes(a.classification || ''));
    const currentValue = (exchangeSettings as any)[settingKey] || '';

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {currentValue
            ? <Badge variant="default" className="bg-emerald-500 text-[10px] px-1.5 py-0">{t('exchange.settings.set')}</Badge>
            : <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400">{t('exchange.settings.notSet')}</Badge>
          }
        </div>
        <Select value={currentValue} onValueChange={(v) => updateSetting(settingKey as string, v)}>
          <SelectTrigger className="text-start">
            <SelectValue placeholder={t('exchange.settings.selectAccount')} />
          </SelectTrigger>
          <SelectContent>
            {filteredAccounts.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.account_code} - {language === 'ar' ? a.name_ar : a.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    );
  };

  const renderToggle = (label: string, description: string, key: keyof ExchangeSettingsData) => (
    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <Switch
        checked={!!(exchangeSettings as any)[key]}
        onCheckedChange={(v) => updateSetting(key as string, v)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-erp-teal" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10" dir={direction}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
        <div className="overflow-x-auto -mx-1 px-1" dir={direction}>
          <TabsList className="inline-flex w-auto min-w-full bg-gray-100/80 dark:bg-gray-800/50 p-1 rounded-xl gap-0.5 h-auto">
            <TabsTrigger value="general" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              <Settings className="w-3.5 h-3.5" />
              {t('exchange.settings.generalTab')}
            </TabsTrigger>
            <TabsTrigger value="accounts" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              <Wallet className="w-3.5 h-3.5" />
              {t('exchange.settings.accountsTab')}
            </TabsTrigger>
            <TabsTrigger value="currencies" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-erp-teal data-[state=active]:shadow-sm transition-all">
              <Globe className="w-3.5 h-3.5" />
              {t('exchange.settings.currenciesTab')}
            </TabsTrigger>
            <TabsTrigger value="limits" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              <Shield className="w-3.5 h-3.5" />
              {t('exchange.settings.limitsTab')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              <Bell className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="font-tajawal gap-1.5 px-3 py-2 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              <Link2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'التكاملات' : 'Integrations'}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════════════════════════
            Tab 1: General Settings
        ════════════════════════════════════════════════════════ */}
        <TabsContent value="general" className="mt-6 space-y-6">
          {/* Company Info (read-only sync) */}
          <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">{t('exchange.settings.syncWithCompany')}</AlertTitle>
            <AlertDescription className="text-blue-600/80">{t('exchange.settings.syncWithCompanyDesc')}</AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Base Currency (synced from company) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  {t('exchange.settings.baseCurrency')}
                </CardTitle>
                <CardDescription>{t('exchange.settings.baseCurrencyDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{companySettings.base_currency || 'USD'}</p>
                    <p className="text-[10px] text-gray-400">{t('exchange.settings.fromCompanySettings')}</p>
                  </div>
                  <Badge variant="outline" className="ms-auto text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                    <Link2 className="w-2.5 h-2.5 me-1" />
                    {t('exchange.settings.synced')}
                  </Badge>
                </div>

                {/* Supported currencies */}
                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">{t('exchange.settings.activeCurrencies')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(companySettings.supported_currencies || []).map(c => (
                      <Badge key={c} variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 border-emerald-200">
                        {c}
                      </Badge>
                    ))}
                    {(companySettings.supported_currencies || []).length === 0 && (
                      <span className="text-xs text-gray-300">{t('exchange.settings.noCurrencies')}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exchange Module Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ArrowRightLeft className="w-4 h-4 text-teal-500" />
                  {t('exchange.settings.exchangeSettings')}
                </CardTitle>
                <CardDescription>{t('exchange.settings.exchangeSettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t('exchange.settings.defaultMargin')}</Label>
                  <div className="relative">
                    <Input
                      type="number" min={0} max={100} step={0.01}
                      value={exchangeSettings.default_margin || ''}
                      onChange={(e) => updateSetting('default_margin', parseFloat(e.target.value) || 0)}
                      className="pe-10"
                      placeholder="1.50"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-400">{t('exchange.settings.defaultMarginDesc')}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('exchange.settings.exchangePrefix')}</Label>
                    <Input
                      value={exchangeSettings.exchange_number_prefix || 'EX'}
                      onChange={(e) => updateSetting('exchange_number_prefix', e.target.value)}
                      placeholder="EX"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('exchange.settings.remittancePrefix')}</Label>
                    <Input
                      value={exchangeSettings.remittance_number_prefix || 'RM'}
                      onChange={(e) => updateSetting('remittance_number_prefix', e.target.value)}
                      placeholder="RM"
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auto-posting */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                {t('exchange.settings.autoPosting')}
              </CardTitle>
              <CardDescription>{t('exchange.settings.autoPostingDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderToggle(
                t('exchange.settings.autoPostExchange'),
                t('exchange.settings.autoPostExchangeDesc'),
                'auto_post_exchange'
              )}
              {renderToggle(
                t('exchange.settings.autoPostRemittance'),
                t('exchange.settings.autoPostRemittanceDesc'),
                'auto_post_remittance'
              )}
              {renderToggle(
                t('exchange.settings.autoPostVariance'),
                t('exchange.settings.autoPostVarianceDesc'),
                'auto_post_variance'
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════
            Tab 2: Default Accounts
        ════════════════════════════════════════════════════════ */}
        <TabsContent value="accounts" className="mt-6 space-y-6">
          {/* Status */}
          {(() => {
            const fields = [
              'profit_account_id', 'loss_account_id', 'commission_income_account_id',
              'remittance_payable_account_id', 'remittance_receivable_account_id',
              'agents_payable_account_id', 'partners_receivable_account_id',
            ];
            const configured = fields.filter(f => !!(exchangeSettings as any)[f]).length;
            return (
              <Alert className={configured === fields.length ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
                {configured === fields.length
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertTriangle className="h-4 w-4 text-amber-600" />
                }
                <AlertTitle className={configured === fields.length ? 'text-emerald-800' : 'text-amber-800'}>
                  {`${configured} / ${fields.length}`} — {configured === fields.length ? t('exchange.settings.allAccountsSet') : t('exchange.settings.accountsMissing')}
                </AlertTitle>
                <AlertDescription className={configured === fields.length ? 'text-emerald-600' : 'text-amber-600'}>
                  {configured === fields.length ? t('exchange.settings.allAccountsSet') : t('exchange.settings.accountsMissing')}
                </AlertDescription>
              </Alert>
            );
          })()}

          {/* Exchange Accounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                {t('exchange.settings.exchangeAccounts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderAccountSelect(
                t('exchange.settings.profitAccount'),
                t('exchange.settings.profitAccountDesc'),
                'profit_account_id',
                ['income']
              )}
              {renderAccountSelect(
                t('exchange.settings.lossAccount'),
                t('exchange.settings.lossAccountDesc'),
                'loss_account_id',
                ['expenses']
              )}
            </CardContent>
          </Card>

          {/* Remittance Accounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-blue-500" />
                {t('exchange.settings.remittanceAccounts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderAccountSelect(
                t('exchange.settings.commissionIncomeAccount'),
                t('exchange.settings.commissionIncomeAccountDesc'),
                'commission_income_account_id',
                ['income']
              )}
              {renderAccountSelect(
                t('exchange.settings.remittancePayableAccount'),
                t('exchange.settings.remittancePayableAccountDesc'),
                'remittance_payable_account_id',
                ['liabilities']
              )}
              {renderAccountSelect(
                t('exchange.settings.remittanceReceivableAccount'),
                t('exchange.settings.remittanceReceivableAccountDesc'),
                'remittance_receivable_account_id',
                ['assets']
              )}
            </CardContent>
          </Card>

          {/* Agent & Partner Accounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Landmark className="w-4 h-4 text-violet-500" />
                {t('exchange.settings.agentPartnerAccounts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderAccountSelect(
                t('exchange.settings.agentsPayableAccount'),
                t('exchange.settings.agentsPayableAccountDesc'),
                'agents_payable_account_id',
                ['liabilities']
              )}
              {renderAccountSelect(
                t('exchange.settings.partnersReceivableAccount'),
                t('exchange.settings.partnersReceivableAccountDesc'),
                'partners_receivable_account_id',
                ['assets']
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════
            Tab 3: Currencies & Exchange Rates (reuse from Accounting)
        ════════════════════════════════════════════════════════ */}
        <TabsContent value="currencies" className="mt-6">
          <CurrencyManagementTab
            settings={companySettings}
            updateSetting={(key: string, value: any) => {
              setCompanySettings(prev => ({ ...prev, [key]: value }));
            }}
            currencies={currencies}
            direction={direction}
          />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════
            Tab 4: Transaction Limits
        ════════════════════════════════════════════════════════ */}
        <TabsContent value="limits" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-red-500" />
                {t('exchange.settings.transactionLimits')}
              </CardTitle>
              <CardDescription>{t('exchange.settings.transactionLimitsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">{t('exchange.settings.dailyLimit')}</Label>
                  <Input
                    type="number" min={0}
                    value={exchangeSettings.daily_limit_per_customer || ''}
                    onChange={(e) => updateSetting('daily_limit_per_customer', parseFloat(e.target.value) || 0)}
                    placeholder="50,000"
                  />
                  <p className="text-xs text-gray-400">{t('exchange.settings.dailyLimitDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('exchange.settings.monthlyLimit')}</Label>
                  <Input
                    type="number" min={0}
                    value={exchangeSettings.monthly_limit_per_customer || ''}
                    onChange={(e) => updateSetting('monthly_limit_per_customer', parseFloat(e.target.value) || 0)}
                    placeholder="500,000"
                  />
                  <p className="text-xs text-gray-400">{t('exchange.settings.monthlyLimitDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('exchange.settings.singleLimit')}</Label>
                  <Input
                    type="number" min={0}
                    value={exchangeSettings.single_transaction_limit || ''}
                    onChange={(e) => updateSetting('single_transaction_limit', parseFloat(e.target.value) || 0)}
                    placeholder="10,000"
                  />
                  <p className="text-xs text-gray-400">{t('exchange.settings.singleLimitDesc')}</p>
                </div>
              </div>

              <Alert className="border-gray-200 bg-gray-50">
                <Info className="h-4 w-4 text-gray-500" />
                <AlertDescription className="text-gray-600">
                  {t('exchange.settings.limitsNote')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════
            Tab 5: Notifications
        ════════════════════════════════════════════════════════ */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          {(() => {
            const isAr = language === 'ar';
            const channels = [
              { key: 'telegram', icon: Bot, label: isAr ? 'تلغرام' : 'Telegram', color: 'blue', badge: '' },
              { key: 'whatsapp', icon: MessageCircle, label: isAr ? 'واتس آب' : 'WhatsApp', color: 'emerald', badge: 'Twilio' },
              { key: 'email', icon: Mail, label: isAr ? 'بريد إلكتروني' : 'Email', color: 'amber', badge: '' },
              { key: 'in_app', icon: Bell, label: isAr ? 'داخل البرنامج' : 'In-App', color: 'violet', badge: '' },
            ] as const;

            const remittanceTriggers = [
              { key: 'draft_created', icon: '📝', labelAr: 'مسودة جديدة', labelEn: 'Draft Created' },
              { key: 'confirmed', icon: '✅', labelAr: 'تأكيد الحوالة', labelEn: 'Confirmed' },
              { key: 'executed', icon: '⚡', labelAr: 'تنفيذ', labelEn: 'Executed' },
              { key: 'delivered', icon: '📬', labelAr: 'تسليم', labelEn: 'Delivered' },
              { key: 'completed', icon: '✔️', labelAr: 'اكتمال', labelEn: 'Completed' },
              { key: 'returned', icon: '↩️', labelAr: 'إرجاع', labelEn: 'Returned' },
              { key: 'cancelled', icon: '❌', labelAr: 'إلغاء', labelEn: 'Cancelled' },
            ];

            // ─── Message Templates per recipient × trigger ─────────
            // Placeholders: {ref} {amount} {currency} {to_currency} {sender} {receiver}
            // {delivery} {branch} {agent_name} {location} {commission} {profit}
            // {reason} {cancelled_by} {created_by} {sent_at} {delivered_at}
            // {company} {bot_link} {base_currency}
            const messageTemplates: Record<string, Record<string, { ar: string; en: string }>> = {
              sender: {
                draft_created: { ar: '📝 مرحباً {sender}\nتم إنشاء مسودة حوالة جديدة\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 المستفيد: {receiver}\n⏳ بانتظار التأكيد\n\n{company} — خدمتكم شرف لنا', en: '📝 Hello {sender}\nNew remittance draft created\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n👤 To: {receiver}\n⏳ Pending confirmation\n\n{company}' },
                confirmed: { ar: '✅ تم تأكيد حوالتك بنجاح!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 المستفيد: {receiver}\n🔄 قيد المعالجة والتنفيذ\n\nسنبقيك على اطلاع بكل مرحلة 🙏\n{company}', en: '✅ Your remittance is confirmed!\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n👤 To: {receiver}\n🔄 Being processed\n\nWe\'ll keep you updated 🙏\n{company}' },
                executed: { ar: '⚡ تم تنفيذ حوالتك!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n📍 طريقة التسليم: {delivery}\n🏢 الفرع/الوكيل: {branch}\n🕐 وقت الإرسال: {sent_at}\n\n✨ حوالتك في الطريق إلى {receiver}\n{company}', en: '⚡ Your remittance is executed!\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n📍 Delivery: {delivery}\n🏢 Branch/Agent: {branch}\n🕐 Sent: {sent_at}\n\n✨ On the way to {receiver}\n{company}' },
                delivered: { ar: '📬 تم تسليم حوالتك بنجاح!\n📋 رقم: {ref}\n👤 المستفيد: {receiver}\n💰 المبلغ: {amount} {currency}\n🕐 وقت التسليم: {delivered_at}\n\n🎉 شكراً لثقتك بنا!\n{company}', en: '📬 Successfully delivered!\n📋 Ref: {ref}\n👤 To: {receiver}\n💰 Amount: {amount} {currency}\n🕐 At: {delivered_at}\n\n🎉 Thank you for trusting us!\n{company}' },
                completed: { ar: '✔️ اكتملت حوالتك بنجاح! 🎉\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 المستفيد: {receiver}\n\n🙏 شكراً لاستخدامك خدمات {company}\n💬 للخدمة الأسرع تابعنا على تلغرام:\n{bot_link}', en: '✔️ Remittance completed! 🎉\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n👤 To: {receiver}\n\n🙏 Thank you for choosing {company}\n💬 For faster service, follow us on Telegram:\n{bot_link}' },
                returned: { ar: '↩️ تم إرجاع حوالتك\n📋 رقم: {ref}\n📝 السبب: {reason}\n\n📞 تواصل معنا لإعادة الإرسال أو الاسترداد\n{company}', en: '↩️ Remittance returned\n📋 Ref: {ref}\n📝 Reason: {reason}\n\n📞 Contact us to resend or refund\n{company}' },
                cancelled: { ar: '❌ تم إلغاء حوالتك\n📋 رقم: {ref}\n📝 السبب: {reason}\n\n📞 للاستفسار تواصل معنا\n{company}', en: '❌ Remittance cancelled\n📋 Ref: {ref}\n📝 Reason: {reason}\n\n📞 For inquiries contact us\n{company}' },
              },
              receiver: {
                draft_created: { ar: '📝 مرحباً {receiver}\nحوالة جديدة باسمك قيد الإعداد\n💰 المبلغ: {amount} {currency}\n👤 من: {sender}\n\n{company}', en: '📝 Hello {receiver}\nA new remittance for you is being prepared\n💰 Amount: {amount} {currency}\n👤 From: {sender}\n\n{company}' },
                confirmed: { ar: '✅ حوالة مؤكدة باسمك!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 من: {sender}\n🔄 قيد التنفيذ\n\nسنُعلمك فور جهوزيتها للاستلام 🙏\n{company}', en: '✅ Confirmed remittance for you!\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n👤 From: {sender}\n🔄 Being processed\n\nWe\'ll notify you when ready 🙏\n{company}' },
                executed: { ar: '⚡ حوالتك في الطريق!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n📍 طريقة التسليم: {delivery}\n🏢 الفرع/الوكيل: {branch}\n\n📌 يرجى التوجه للاستلام عند الجهوزية\n{company}', en: '⚡ Your remittance is on the way!\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n📍 Delivery: {delivery}\n🏢 Branch/Agent: {branch}\n\n📌 Please be ready for pickup\n{company}' },
                delivered: { ar: '📬 حوالتك جاهزة للاستلام! 🎉\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n📍 مكان الاستلام: {location}\n🏢 {branch}\n\n📌 يرجى إحضار هوية شخصية عند الاستلام\n{company}', en: '📬 Ready for pickup! 🎉\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n📍 Location: {location}\n🏢 {branch}\n\n📌 Please bring valid ID\n{company}' },
                completed: { ar: '✔️ تم استلام حوالتك بنجاح! 🎉\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n\n🙏 شكراً لتعاملك مع {company}\n💬 للإشعارات الفورية تابعنا على تلغرام:\n{bot_link}', en: '✔️ Remittance received! 🎉\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n\n🙏 Thank you for choosing {company}\n💬 For instant notifications, join us on Telegram:\n{bot_link}' },
                returned: { ar: '↩️ نأسف، تم إرجاع الحوالة الموجهة لك\n📋 رقم: {ref}\n📝 السبب: {reason}\n\n📞 للاستفسار: {company}', en: '↩️ Sorry, your remittance was returned\n📋 Ref: {ref}\n📝 Reason: {reason}\n\n📞 Contact: {company}' },
                cancelled: { ar: '❌ تم إلغاء الحوالة الموجهة لك\n📋 رقم: {ref}\n\n📞 للاستفسار: {company}', en: '❌ Remittance for you was cancelled\n📋 Ref: {ref}\n\nContact: {company}' },
              },
              employee: {
                draft_created: { ar: '📝 مسودة حوالة جديدة\n📋 رقم: {ref}\n👤 المرسل: {sender}\n👤 المستفيد: {receiver}\n💰 {amount} {currency} → {to_currency}\n📍 {delivery}\n\n⏳ بانتظار التأكيد', en: '📝 New remittance draft\n📋 Ref: {ref}\n👤 Sender: {sender}\n👤 Receiver: {receiver}\n💰 {amount} {currency} → {to_currency}\n📍 {delivery}\n\n⏳ Pending confirmation' },
                confirmed: { ar: '✅ حوالة مؤكدة — بانتظار التنفيذ\n📋 رقم: {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n📍 التسليم: {delivery}\n🏢 الوكيل: {agent_name}', en: '✅ Confirmed — awaiting execution\n📋 Ref: {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n📍 Delivery: {delivery}\n🏢 Agent: {agent_name}' },
                executed: { ar: '⚡ تم تنفيذ الحوالة\n📋 رقم: {ref}\n👤 {sender} → {receiver}\n📍 {delivery} | 🏢 {branch}\n💰 العمولة: {commission}\n⏳ بانتظار التسليم', en: '⚡ Executed\n📋 Ref: {ref}\n👤 {sender} → {receiver}\n📍 {delivery} | 🏢 {branch}\n💰 Commission: {commission}\n⏳ Awaiting delivery' },
                delivered: { ar: '📬 تم التسليم\n📋 رقم: {ref}\n👤 المستفيد: {receiver}\n🕐 {delivered_at}\n🏢 {branch}', en: '📬 Delivered\n📋 Ref: {ref}\n👤 To: {receiver}\n🕐 {delivered_at}\n🏢 {branch}' },
                completed: { ar: '✔️ حوالة مكتملة ✅\n📋 رقم: {ref}\n👤 {sender} → {receiver}\n💰 الربح: {profit} {base_currency}\n💰 العمولة: {commission}', en: '✔️ Completed ✅\n📋 Ref: {ref}\n👤 {sender} → {receiver}\n💰 Profit: {profit} {base_currency}\n💰 Commission: {commission}' },
                returned: { ar: '↩️ حوالة مُرجعة ⚠️\n📋 رقم: {ref}\n👤 {sender} → {receiver}\n📝 السبب: {reason}\n⚠️ تحقق من التسوية المالية', en: '↩️ Returned ⚠️\n📋 Ref: {ref}\n👤 {sender} → {receiver}\n📝 Reason: {reason}\n⚠️ Check financial settlement' },
                cancelled: { ar: '❌ حوالة ملغاة\n📋 رقم: {ref}\n👤 {sender} → {receiver}\n📝 السبب: {reason}\n👤 ألغاها: {cancelled_by}', en: '❌ Cancelled\n📋 Ref: {ref}\n👤 {sender} → {receiver}\n📝 Reason: {reason}\n👤 By: {cancelled_by}' },
              },
              agent: {
                draft_created: { ar: '📝 مسودة حوالة جديدة للتغطية\n📋 رقم: {ref}\n💰 {amount} {currency}\n👤 المستفيد: {receiver}\n📍 {delivery}', en: '📝 New draft for coverage\n📋 Ref: {ref}\n💰 {amount} {currency}\n👤 Receiver: {receiver}\n📍 {delivery}' },
                confirmed: { ar: '✅ حوالة مؤكدة — مطلوب تغطية\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 المستفيد: {receiver}\n📍 التسليم: {delivery}\n🏢 الفرع: {branch}\n\n⚡ يرجى تجهيز المبلغ', en: '✅ Confirmed — coverage needed\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n👤 Receiver: {receiver}\n📍 Delivery: {delivery}\n🏢 Branch: {branch}\n\n⚡ Please prepare the amount' },
                executed: { ar: '⚡ تم تنفيذ الحوالة\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 المستفيد: {receiver}\n📍 {delivery} | 🏢 {branch}\n💰 عمولتك: {commission}\n\n📌 يرجى تسليم المبلغ للمستفيد', en: '⚡ Executed\n📋 Ref: {ref}\n💰 Amount: {amount} {currency}\n👤 Receiver: {receiver}\n📍 {delivery} | 🏢 {branch}\n💰 Your commission: {commission}\n\n📌 Please deliver to beneficiary' },
                delivered: { ar: '📬 تم التسليم بنجاح 🎉\n📋 رقم: {ref}\n👤 المستفيد: {receiver}\n💰 عمولتك: {commission}\n\n🙏 شكراً لتعاونك!\n{company}', en: '📬 Successfully delivered 🎉\n📋 Ref: {ref}\n👤 To: {receiver}\n💰 Your commission: {commission}\n\n🙏 Thank you for your cooperation!\n{company}' },
                completed: { ar: '✔️ حوالة مكتملة ✅\n📋 رقم: {ref}\n💰 عمولتك: {commission}\n\n🤝 شكراً لشراكتك المميزة!\n{company}', en: '✔️ Completed ✅\n📋 Ref: {ref}\n💰 Your commission: {commission}\n\n🤝 Thank you for your partnership!\n{company}' },
                returned: { ar: '↩️ حوالة مُرجعة\n📋 رقم: {ref}\n👤 المستفيد: {receiver}\n📝 السبب: {reason}\n\n📞 تواصل معنا للتنسيق', en: '↩️ Returned\n📋 Ref: {ref}\n👤 Receiver: {receiver}\n📝 Reason: {reason}\n\n📞 Contact us to coordinate' },
                cancelled: { ar: '❌ حوالة ملغاة\n📋 رقم: {ref}\n👤 المستفيد: {receiver}\n📝 السبب: {reason}', en: '❌ Cancelled\n📋 Ref: {ref}\n👤 Receiver: {receiver}\n📝 Reason: {reason}' },
              },
              manager: {
                draft_created: { ar: '📝 مسودة جديدة\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n👤 بواسطة: {created_by}', en: '📝 New draft\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n👤 By: {created_by}' },
                confirmed: { ar: '✅ تأكيد حوالة\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n🏢 الوكيل: {agent_name}', en: '✅ Confirmed\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n🏢 Agent: {agent_name}' },
                executed: { ar: '⚡ تنفيذ حوالة\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n📍 {delivery} | 🏢 {branch}', en: '⚡ Executed\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n📍 {delivery} | 🏢 {branch}' },
                delivered: { ar: '📬 تسليم حوالة\n📋 {ref}\n👤 المستفيد: {receiver}\n🕐 {delivered_at}', en: '📬 Delivered\n📋 {ref}\n👤 To: {receiver}\n🕐 {delivered_at}' },
                completed: { ar: '✔️ اكتمال حوالة\n📋 {ref}\n👤 {sender} → {receiver}\n💰 الربح: {profit} {base_currency}\n💰 العمولة: {commission}', en: '✔️ Completed\n📋 {ref}\n👤 {sender} → {receiver}\n💰 Profit: {profit} {base_currency}\n💰 Commission: {commission}' },
                returned: { ar: '⚠️ إرجاع حوالة — يتطلب مراجعة\n📋 {ref}\n👤 {sender} → {receiver}\n📝 {reason}\n💰 المبلغ: {amount} {currency}', en: '⚠️ Returned — review required\n📋 {ref}\n👤 {sender} → {receiver}\n📝 {reason}\n💰 Amount: {amount} {currency}' },
                cancelled: { ar: '🚨 إلغاء حوالة\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n📝 {reason}\n👤 ألغاها: {cancelled_by}', en: '🚨 Cancelled\n📋 {ref}\n👤 {sender} → {receiver}\n💰 {amount} {currency}\n📝 {reason}\n👤 By: {cancelled_by}' },
              },
            };

            const getMessagePreview = (triggerKey: string) => {
              const recipientTemplates = messageTemplates[activeRecipient];
              if (!recipientTemplates) return null;
              const template = recipientTemplates[triggerKey];
              if (!template) return null;
              return isAr ? template.ar : template.en;
            };

            const exchangeTriggers = [
              { key: 'new_exchange', icon: '💱', labelAr: 'عملية صرف جديدة', labelEn: 'New Exchange' },
              { key: 'rate_update', icon: '💹', labelAr: 'تحديث سعر صرف', labelEn: 'Rate Update' },
              { key: 'limit_exceeded', icon: '⚠️', labelAr: 'تجاوز حد العميل', labelEn: 'Limit Exceeded' },
            ];

            const toggleChannel = (channelKey: string) => {
              const updated = { ...nc, [channelKey]: !nc[channelKey as keyof typeof nc] };
              updateSetting('notification_channels', updated);
            };

            const recipients = [
              { key: 'sender', icon: '👤', labelAr: 'المرسل', labelEn: 'Sender' },
              { key: 'receiver', icon: '👤', labelAr: 'المستقبل', labelEn: 'Receiver' },
              { key: 'employee', icon: '💼', labelAr: 'الموظف', labelEn: 'Employee' },
              { key: 'agent', icon: '🏢', labelAr: 'الوكيل/شريك', labelEn: 'Agent/Partner' },
              { key: 'manager', icon: '🔔', labelAr: 'المدير', labelEn: 'Manager' },
            ];

            const isNotifEnabled = (section: 'remittance_notifications' | 'exchange_notifications', triggerKey: string, channelKey: string) => {
              const notifs = (exchangeSettings[section] as Record<string, Record<string, string[]>>) || {};
              const triggerData = notifs[triggerKey] || {};
              const recipientChannels = triggerData[activeRecipient] || [];
              return recipientChannels.includes(channelKey);
            };

            const toggleNotif = (section: 'remittance_notifications' | 'exchange_notifications', triggerKey: string, channelKey: string) => {
              const notifs = JSON.parse(JSON.stringify((exchangeSettings[section] as Record<string, Record<string, string[]>>) || {}));
              if (!notifs[triggerKey]) notifs[triggerKey] = {};
              if (!notifs[triggerKey][activeRecipient]) notifs[triggerKey][activeRecipient] = [];
              const current = notifs[triggerKey][activeRecipient] as string[];
              if (current.includes(channelKey)) {
                notifs[triggerKey][activeRecipient] = current.filter((c: string) => c !== channelKey);
              } else {
                notifs[triggerKey][activeRecipient] = [...current, channelKey];
              }
              updateSetting(section, notifs);
            };

            // Count active notifications for a recipient
            const countForRecipient = (section: 'remittance_notifications' | 'exchange_notifications', recipientKey: string) => {
              const notifs = (exchangeSettings[section] as Record<string, Record<string, string[]>>) || {};
              let count = 0;
              for (const trigger of Object.values(notifs)) {
                count += (trigger[recipientKey] || []).length;
              }
              return count;
            };

            const renderRecipientSelector = (section: 'remittance_notifications' | 'exchange_notifications') => (
              <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
                {recipients.map(r => {
                  const active = activeRecipient === r.key;
                  const count = countForRecipient(section, r.key);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setActiveRecipient(r.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                        active
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:text-blue-600"
                      )}
                    >
                      <span>{r.icon}</span>
                      {isAr ? r.labelAr : r.labelEn}
                      {count > 0 && (
                        <span className={cn(
                          "w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold",
                          active ? "bg-white/30 text-white" : "bg-blue-100 text-blue-600"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );

            const renderMatrix = (
              title: string,
              subtitle: string,
              icon: React.ElementType,
              triggers: typeof remittanceTriggers,
              section: 'remittance_notifications' | 'exchange_notifications',
              accentColor: string,
            ) => {
              const IconComp = icon;
              return (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <IconComp className={`w-4 h-4 text-${accentColor}-500`} />
                      {title}
                    </CardTitle>
                    <CardDescription>{subtitle}</CardDescription>
                  </CardHeader>
                  {/* Recipient Selector */}
                  {renderRecipientSelector(section)}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                            <th className="text-start px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 min-w-[160px]">
                              {isAr ? 'المحطة' : 'Trigger'}
                            </th>
                            {channels.map(ch => (
                              <th key={ch.key} className="px-3 py-2.5 text-center w-20">
                                <div className="flex flex-col items-center gap-0.5">
                                  <ch.icon className={`w-3.5 h-3.5 text-${ch.color}-500`} />
                                  <span className={`text-[10px] font-medium ${nc[ch.key as keyof typeof nc] ? `text-${ch.color}-600` : 'text-gray-300'}`}>
                                    {ch.label}
                                  </span>
                                </div>
                              </th>
                            ))}
                            {section === 'remittance_notifications' && (
                              <th className="px-2 py-2.5 text-center w-14">
                                <div className="flex flex-col items-center gap-0.5">
                                  <Rocket className="w-3.5 h-3.5 text-orange-500" />
                                  <span className="text-[10px] font-medium text-orange-600">
                                    {isAr ? 'تجربة' : 'Test'}
                                  </span>
                                </div>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {triggers.map((trigger, idx) => (
                            <tr key={trigger.key} className={cn(
                              "border-b border-gray-50 dark:border-gray-800 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20",
                              idx % 2 === 0 && "bg-white dark:bg-transparent"
                            )}>
                              <td className="px-4 py-2.5">
                                <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                                  <span className="text-sm">{trigger.icon}</span>
                                  {isAr ? trigger.labelAr : trigger.labelEn}
                                  {/* Message Preview Tooltip */}
                                  {section === 'remittance_notifications' && getMessagePreview(trigger.key) && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button type="button" className="p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <Eye className="w-3.5 h-3.5 text-blue-400 hover:text-blue-600" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[320px] p-3 bg-gray-900 text-white text-xs">
                                          <p className="font-bold text-blue-300 mb-1.5 text-[10px] uppercase tracking-wide">
                                            {isAr ? `معاينة رسالة ${recipients.find(r => r.key === activeRecipient)?.labelAr}` : `${activeRecipient} message preview`}
                                          </p>
                                          <div className="whitespace-pre-line leading-relaxed font-mono text-[11px]">
                                            {getMessagePreview(trigger.key)}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </span>
                              </td>
                              {channels.map(ch => {
                                const channelActive = nc[ch.key as keyof typeof nc];
                                const checked = channelActive && isNotifEnabled(section, trigger.key, ch.key);
                                return (
                                  <td key={ch.key} className="px-3 py-2.5 text-center">
                                    <button
                                      type="button"
                                      disabled={!channelActive}
                                      onClick={() => toggleNotif(section, trigger.key, ch.key)}
                                      className={cn(
                                        "w-7 h-7 rounded-lg border-2 transition-all mx-auto flex items-center justify-center",
                                        channelActive
                                          ? checked
                                            ? `bg-${ch.color}-100 dark:bg-${ch.color}-900/30 border-${ch.color}-400 dark:border-${ch.color}-600`
                                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                                          : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-30"
                                      )}
                                    >
                                      {checked && <CheckCircle2 className={`w-4 h-4 text-${ch.color}-500`} />}
                                    </button>
                                  </td>
                                );
                              })}
                              {/* Test button */}
                              {section === 'remittance_notifications' && (
                                <td className="px-2 py-2.5 text-center">
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => sendTestNotification(trigger.key, section)}
                                          disabled={testingTrigger !== null}
                                          className={cn(
                                            "w-7 h-7 rounded-lg border-2 transition-all mx-auto flex items-center justify-center",
                                            testingTrigger === trigger.key
                                              ? "border-orange-400 bg-orange-100 dark:bg-orange-900/30 animate-pulse"
                                              : "border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                          )}
                                        >
                                          {testingTrigger === trigger.key
                                            ? <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                            : <Rocket className="w-3.5 h-3.5 text-orange-500" />
                                          }
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="text-xs">
                                        {isAr ? `إرسال تجريبي — ${isAr ? trigger.labelAr : trigger.labelEn}` : `Send test — ${trigger.labelEn}`}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            };

            return (
              <>
                {/* Channel Toggles */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Bell className="w-4 h-4 text-blue-500" />
                      {isAr ? 'قنوات الإشعارات' : 'Notification Channels'}
                    </CardTitle>
                    <CardDescription>
                      {isAr ? 'فعّل القنوات التي تريد استخدامها للإشعارات' : 'Enable the channels you want to use for notifications'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {channels.map(ch => {
                        const active = nc[ch.key as keyof typeof nc];
                        return (
                          <button
                            key={ch.key}
                            type="button"
                            onClick={() => toggleChannel(ch.key)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                              active
                                ? `border-${ch.color}-300 dark:border-${ch.color}-700 bg-${ch.color}-50/50 dark:bg-${ch.color}-950/20`
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            )}
                          >
                            <div className={cn(
                              "p-2.5 rounded-xl transition-colors",
                              active
                                ? `bg-${ch.color}-100 dark:bg-${ch.color}-900/30`
                                : "bg-gray-100 dark:bg-gray-800"
                            )}>
                              <ch.icon className={cn(
                                "w-5 h-5",
                                active ? `text-${ch.color}-500` : "text-gray-400"
                              )} />
                            </div>
                            <div className="text-center">
                              <span className={cn(
                                "text-xs font-bold block",
                                active ? `text-${ch.color}-700 dark:text-${ch.color}-300` : "text-gray-400"
                              )}>
                                {ch.label}
                              </span>
                              {ch.badge && (
                                <Badge variant="outline" className={cn(
                                  "text-[8px] px-1 py-0 mt-0.5",
                                  active ? `text-${ch.color}-500 border-${ch.color}-300` : "text-gray-300 border-gray-200"
                                )}>
                                  {ch.badge}
                                </Badge>
                              )}
                            </div>
                            <div className={cn(
                              "w-8 h-4 rounded-full transition-colors flex items-center px-0.5",
                              active ? `bg-${ch.color}-500` : "bg-gray-300 dark:bg-gray-600"
                            )}>
                              <div className={cn(
                                "w-3 h-3 rounded-full bg-white transition-transform",
                                active && "translate-x-4"
                              )} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Remittance Notifications Matrix */}
                {renderMatrix(
                  isAr ? 'إشعارات الحوالات' : 'Remittance Notifications',
                  isAr ? 'حدد الإشعارات لكل مرحلة من مراحل الحوالة' : 'Configure notifications for each remittance stage',
                  Send,
                  remittanceTriggers,
                  'remittance_notifications',
                  'blue',
                )}

                {/* Exchange Notifications Matrix */}
                {renderMatrix(
                  isAr ? 'إشعارات الصرافة' : 'Exchange Notifications',
                  isAr ? 'إشعارات عمليات الصرف وأسعار العملات' : 'Notifications for exchange operations and rates',
                  ArrowRightLeft,
                  exchangeTriggers,
                  'exchange_notifications',
                  'amber',
                )}

                {/* AI Integration (preserved) */}
                <Card className={cn(
                  "transition-all",
                  exchangeSettings.ai_enabled && "ring-1 ring-violet-200 dark:ring-violet-800"
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                      </div>
                      {t('exchange.settings.aiIntegration')}
                      {exchangeSettings.ai_enabled && (
                        <Badge className="text-[9px] bg-violet-50 text-violet-600 border-violet-200" variant="outline">
                          {t('exchange.settings.enabled')}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{t('exchange.settings.aiIntegrationDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderToggle(
                      t('exchange.settings.enableAI'),
                      t('exchange.settings.enableAIDesc'),
                      'ai_enabled'
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════
            Tab 6: Integrations (reusable component)
        ════════════════════════════════════════════════════════ */}
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>

      {/* ═══ Save Button (floating) ═══ */}
      <div className="sticky bottom-4 flex justify-end z-20">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-gradient-to-r from-erp-teal to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg gap-2 px-8"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('exchange.settings.save')}
        </Button>
      </div>
    </div>
  );
}
