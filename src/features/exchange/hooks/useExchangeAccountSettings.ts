/**
 * ════════════════════════════════════════════════════════════════
 * 🔑 useExchangeAccountSettings — تحميل حسابات الصرافة
 * ════════════════════════════════════════════════════════════════
 *
 * Hook مشترك يُستخدم من:
 *   - RemittanceJournalTab (لبناء القيد الحي)
 *   - منطق حفظ القيد الفعلي
 *
 * يحمّل الحسابات من exchange_settings مع fallback على أكواد الشجرة
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';

// ─── Types ────────────────────────────────────────────────────
export interface ExchangeAccountMap {
  /** 231 — حوالات مستحقة للتسليم */
  remittance_payable:     { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** 131 — ذمم حوالات صادرة */
  remittance_receivable:  { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** 432 — إيرادات عمولات حوالات */
  commission_income:      { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** 232 — ذمم الوكلاء */
  agents_payable:         { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** 233 — ذمم الشركاء */
  partners_receivable:    { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** 433 — أرباح فروقات عملات */
  exchange_profit:        { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** 543 — خسائر فروقات عملات */
  exchange_loss:          { id: string; code: string; nameAr: string; nameEn: string } | null;
}

export interface ExchangeAutoPostSettings {
  auto_post_exchange: boolean;
  auto_post_remittance: boolean;
  auto_post_variance: boolean;
}

export interface UseExchangeAccountSettingsResult {
  accounts: ExchangeAccountMap;
  autoPost: ExchangeAutoPostSettings;
  loading: boolean;
  /** حساب الصندوق/البنك — يُمرر ديناميكياً من الحوالة */
  resolveAccountById: (accountId: string) => { id: string; code: string; nameAr: string; nameEn: string } | null;
}

// ─── Setting key → fallback chart code mapping ───────────────
const SETTING_TO_CODE: Record<string, string> = {
  remittance_payable_account_id:    '231',
  remittance_receivable_account_id: '131',
  commission_income_account_id:     '432',
  agents_payable_account_id:        '232',
  partners_receivable_account_id:   '233',
  profit_account_id:                '433',
  loss_account_id:                  '543',
};

// ─── Friendly key mapping ─────────────────────────────────────
const SETTING_TO_KEY: Record<string, keyof ExchangeAccountMap> = {
  remittance_payable_account_id:    'remittance_payable',
  remittance_receivable_account_id: 'remittance_receivable',
  commission_income_account_id:     'commission_income',
  agents_payable_account_id:        'agents_payable',
  partners_receivable_account_id:   'partners_receivable',
  profit_account_id:                'exchange_profit',
  loss_account_id:                  'exchange_loss',
};

// ═══════════════════════════════════════════════════════════════
export function useExchangeAccountSettings(): UseExchangeAccountSettingsResult {
  const { companyId } = useCompany();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [chartAccounts, setChartAccounts] = useState<Map<string, { id: string; code: string; nameAr: string; nameEn: string }>>(new Map());
  const [chartById, setChartById] = useState<Map<string, { id: string; code: string; nameAr: string; nameEn: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      try {
        // Parallel: exchange_settings + chart_of_accounts
        const [settingsRes, chartRes] = await Promise.all([
          // exchange_settings may not exist yet — handle gracefully
          (async () => {
            try {
              const { data } = await supabase.from('exchange_settings').select('*').eq('company_id', companyId).maybeSingle();
              return data;
            } catch {
              return null;
            }
          })(),
          supabase.from('chart_of_accounts')
            .select('id, account_code, name_ar, name_en')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .in('account_code', ['131', '231', '232', '233', '431', '432', '433', '543', '110', '111', '112'])
            .then(r => r.data || []),
        ]);

        // Build code → account map
        const codeMap = new Map<string, { id: string; code: string; nameAr: string; nameEn: string }>();
        const idMap = new Map<string, { id: string; code: string; nameAr: string; nameEn: string }>();
        for (const a of chartRes) {
          const entry = { id: a.id, code: a.account_code, nameAr: a.name_ar, nameEn: a.name_en || a.name_ar };
          codeMap.set(a.account_code, entry);
          idMap.set(a.id, entry);
        }

        setChartAccounts(codeMap);
        setChartById(idMap);
        setSettings(settingsRes || {});
      } catch (err) {
        console.error('[useExchangeAccountSettings] Load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [companyId]);

  // ─── Build resolved account map ─────────────────────────────
  const accounts = useMemo((): ExchangeAccountMap => {
    const result: ExchangeAccountMap = {
      remittance_payable: null,
      remittance_receivable: null,
      commission_income: null,
      agents_payable: null,
      partners_receivable: null,
      exchange_profit: null,
      exchange_loss: null,
    };

    for (const [settingKey, friendlyKey] of Object.entries(SETTING_TO_KEY)) {
      const fallbackCode = SETTING_TO_CODE[settingKey];

      // Priority 1: exchange_settings has an account ID
      const settingValue = settings[settingKey];
      if (settingValue && chartById.has(settingValue)) {
        result[friendlyKey] = chartById.get(settingValue)!;
        continue;
      }

      // Priority 2: find by chart code (fallback)
      if (fallbackCode && chartAccounts.has(fallbackCode)) {
        result[friendlyKey] = chartAccounts.get(fallbackCode)!;
      }
    }

    return result;
  }, [settings, chartAccounts, chartById]);

  // ─── Auto-post settings ─────────────────────────────────────
  const autoPost = useMemo((): ExchangeAutoPostSettings => ({
    auto_post_exchange: settings.auto_post_exchange ?? false,
    auto_post_remittance: settings.auto_post_remittance ?? false,
    auto_post_variance: settings.auto_post_variance ?? false,
  }), [settings]);

  // ─── Resolve any account by ID (for fund/bank) ──────────────
  const resolveAccountById = (accountId: string) => {
    if (!accountId) return null;
    // Check pre-loaded chart accounts
    if (chartById.has(accountId)) return chartById.get(accountId)!;
    return null;
  };

  return { accounts, autoPost, loading, resolveAccountById };
}
