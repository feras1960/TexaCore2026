/**
 * ════════════════════════════════════════════════════════════════
 * 💱 useExchangeFilters — Hook مشترك لفلاتر قسم الصرافة
 * ════════════════════════════════════════════════════════════════
 * 
 * يوفر:
 *   1. فلتر العملات (كل العملات + العملات المعرّفة بالشركة)
 *   2. فلتر النشاط (الكل / الصرافة فقط / التجارة فقط) — لليومية فقط
 *   3. تحويل الأرصدة — convertBalance(amount, fromCurrency)
 *   4. isConverting — هل يوجد عملة مختارة للعرض
 * 
 * العملات تُقرأ من company_accounting_settings.supported_currencies
 * ثم التفاصيل من جدول currencies
 * يحفظ الاختيارات في localStorage حتى لا يفقد المستخدم إعداداته
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { useCompanyCurrency, getCurrencySymbol } from '@/hooks/useCompanyCurrency';

// ═══ Types ═══

export type ActivityFilterValue = 'all' | 'exchange' | 'trade';

interface CurrencyOption {
  code: string;
  name?: string;
  name_ar?: string;
  symbol?: string;
}

interface UseExchangeFiltersOptions {
  /** تبويب اليومية — يظهر فلتر النشاط */
  showActivityFilter?: boolean;
  /** مفتاح localStorage لحفظ الاختيار */
  storageKey: string;
}

interface UseExchangeFiltersReturn {
  /** العملة المختارة ('all' أو كود العملة) */
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  /** فلتر النشاط (لليومية فقط) */
  activityFilter: ActivityFilterValue;
  setActivityFilter: (filter: ActivityFilterValue) => void;
  /** العملات المتاحة */
  currencies: CurrencyOption[];
  /** هل يوجد فلتر نشط (غير 'all') */
  hasActiveFilters: boolean;
  /** مسح كل الفلاتر */
  clearFilters: () => void;
  /** تحميل العملات */
  isLoadingCurrencies: boolean;
  /** 🎯 ReactNode جاهز للتمرير كـ toolbarEndContent */
  currencyFilterNode: ReactNode;
  /** 🔄 هل وضع التحويل نشط (عملة معينة مختارة وليس 'all') */
  isConverting: boolean;
  /** 💰 تحويل مبلغ من عملة → العملة المختارة */
  convertBalance: (amount: number, fromCurrency: string) => number;
  /** 🏷️ العملة الأساسية للشركة */
  baseCurrency: string;
  /** 🏷️ عملة العرض الفعلية (المختارة أو الأساسية) */
  displayCurrency: string;
  /** 💲 رمز عملة العرض */
  displayCurrencySymbol: string;
}

// ═══ Storage Helpers ═══

function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredValue(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

// ═══ Hook ═══

export function useExchangeFilters({
  showActivityFilter = false,
  storageKey,
}: UseExchangeFiltersOptions): UseExchangeFiltersReturn {
  const { companyId } = useCompany();
  const { direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const { getRate } = useViewCurrency();
  const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');

  // ─── State with localStorage persistence ───
  const [selectedCurrency, setSelectedCurrencyState] = useState<string>(() =>
    getStoredValue(`${storageKey}_currency`, 'all')
  );

  const [activityFilter, setActivityFilterState] = useState<ActivityFilterValue>(() =>
    getStoredValue(`${storageKey}_activity`, 'all')
  );

  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);

  // ─── Persisters ───
  const setSelectedCurrency = useCallback((currency: string) => {
    setSelectedCurrencyState(currency);
    setStoredValue(`${storageKey}_currency`, currency);
  }, [storageKey]);

  const setActivityFilter = useCallback((filter: ActivityFilterValue) => {
    setActivityFilterState(filter);
    setStoredValue(`${storageKey}_activity`, filter);
  }, [storageKey]);

  // ─── Load ONLY company-defined currencies ───
  useEffect(() => {
    if (!companyId) return;

    const loadCurrencies = async () => {
      setIsLoadingCurrencies(true);
      try {
        const { data: settings } = await supabase
          .from('company_accounting_settings')
          .select('supported_currencies')
          .eq('company_id', companyId)
          .maybeSingle();

        const supportedCodes: string[] = settings?.supported_currencies || [];

        if (supportedCodes.length === 0) {
          setCurrencies([]);
          return;
        }

        const { data: currencyDetails, error } = await supabase
          .from('currencies')
          .select('code, name, name_ar, symbol')
          .in('code', supportedCodes)
          .order('code');

        if (!error && currencyDetails) {
          setCurrencies(currencyDetails.map(c => ({
            code: c.code,
            name: c.name,
            name_ar: c.name_ar,
            symbol: c.symbol,
          })));
        }
      } catch (err) {
        console.warn('[useExchangeFilters] Error loading currencies:', err);
      } finally {
        setIsLoadingCurrencies(false);
      }
    };

    loadCurrencies();
  }, [companyId]);

  // ─── Conversion logic ───
  const isConverting = selectedCurrency !== 'all';
  const displayCurrency = isConverting ? selectedCurrency : (baseCurrency || 'USD');
  const displayCurrencySymbol = getCurrencySymbol(displayCurrency);

  const convertBalance = useCallback((amount: number, fromCurrency: string): number => {
    if (!isConverting || !fromCurrency || fromCurrency === selectedCurrency) return amount;
    const rate = getRate(fromCurrency, selectedCurrency);
    return rate > 0 ? amount * rate : amount;
  }, [isConverting, selectedCurrency, getRate]);

  // ─── Active state ───
  const hasActiveFilters = selectedCurrency !== 'all' || activityFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSelectedCurrency('all');
    setActivityFilter('all');
  }, [setSelectedCurrency, setActivityFilter]);

  // ─── 🎯 ReactNode: Currency + Activity selects (inline in toolbar) ───
  const selectStyle = useMemo(() => ({
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: `${isRTL ? 'left' : 'right'} 8px center`,
  }), [isRTL]);

  // Active glow when currency is selected
  const activeSelectClass = isConverting
    ? 'h-9 px-2.5 pe-7 text-[12px] rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all appearance-none cursor-pointer shadow-sm min-w-[140px] ring-1 ring-amber-400/50'
    : 'h-9 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all appearance-none cursor-pointer shadow-sm min-w-[140px]';

  const currencyFilterNode = useMemo<ReactNode>(() => {
    return React.createElement('div', { className: 'flex items-center gap-2' },
      // Currency select
      React.createElement('select', {
        value: selectedCurrency,
        onChange: (e: any) => setSelectedCurrency(e.target.value),
        className: activeSelectClass,
        style: selectStyle,
      },
        React.createElement('option', { value: 'all' }, isRTL ? '💱 كل العملات' : '💱 All Currencies'),
        ...currencies.map(c =>
          React.createElement('option', { key: c.code, value: c.code },
            `${c.symbol || ''} ${c.code} — ${isRTL ? c.name_ar || c.name || c.code : c.name || c.code}`
          )
        )
      ),
      // Activity select (only for journal)
      ...(showActivityFilter ? [
        React.createElement('select', {
          key: 'activity',
          value: activityFilter,
          onChange: (e: any) => setActivityFilter(e.target.value as ActivityFilterValue),
          className: 'h-9 px-2.5 pe-7 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all appearance-none cursor-pointer shadow-sm min-w-[120px]',
          style: selectStyle,
        },
          React.createElement('option', { value: 'all' }, isRTL ? '📋 الكل' : '📋 All'),
          React.createElement('option', { value: 'exchange' }, isRTL ? '💱 الصرافة' : '💱 Exchange'),
          React.createElement('option', { value: 'trade' }, isRTL ? '🧵 التجارة' : '🧵 Trade'),
        ),
      ] : []),
    );
  }, [selectedCurrency, setSelectedCurrency, currencies, isRTL, selectStyle, activeSelectClass, showActivityFilter, activityFilter, setActivityFilter]);

  return {
    selectedCurrency,
    setSelectedCurrency,
    activityFilter,
    setActivityFilter,
    currencies,
    hasActiveFilters,
    clearFilters,
    isLoadingCurrencies,
    currencyFilterNode,
    // ─── Conversion ───
    isConverting,
    convertBalance,
    baseCurrency: baseCurrency || 'USD',
    displayCurrency,
    displayCurrencySymbol,
  };
}

export default useExchangeFilters;
