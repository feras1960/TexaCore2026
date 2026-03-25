/**
 * ════════════════════════════════════════════════════════════════
 * 💱 CurrencyCalculator — حاسبة العملات السريعة
 * تُفتح بـ Ctrl+E (أو ⌘+E على Mac) من أي مكان في التطبيق
 * 
 * ✨ المميزات:
 *    1. تحويل فوري لكل العملات المفعّلة دفعة واحدة
 *    2. عرض سعر الشراء والبيع
 *    3. نسخ النتيجة بضغطة واحدة
 *    4. تصميم Command Palette أنيق
 *    5. RTL + LTR تلقائي
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, X, Copy, Check, ArrowRightLeft, RefreshCw,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';

// ── Currency Flags & Labels ──────────────────────────────────────────
const CURRENCY_META: Record<string, { flag: string; name_ar: string; name_en: string; symbol: string }> = {
  USD: { flag: '🇺🇸', name_ar: 'دولار أمريكي', name_en: 'US Dollar', symbol: '$' },
  EUR: { flag: '🇪🇺', name_ar: 'يورو', name_en: 'Euro', symbol: '€' },
  UAH: { flag: '🇺🇦', name_ar: 'غريفنا أوكراني', name_en: 'Ukrainian Hryvnia', symbol: '₴' },
  TRY: { flag: '🇹🇷', name_ar: 'ليرة تركية', name_en: 'Turkish Lira', symbol: '₺' },
  SAR: { flag: '🇸🇦', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', symbol: '﷼' },
  AED: { flag: '🇦🇪', name_ar: 'درهم إماراتي', name_en: 'UAE Dirham', symbol: 'د.إ' },
  GBP: { flag: '🇬🇧', name_ar: 'جنيه إسترليني', name_en: 'British Pound', symbol: '£' },
  RUB: { flag: '🇷🇺', name_ar: 'روبل روسي', name_en: 'Russian Ruble', symbol: '₽' },
  CNY: { flag: '🇨🇳', name_ar: 'يوان صيني', name_en: 'Chinese Yuan', symbol: '¥' },
  JPY: { flag: '🇯🇵', name_ar: 'ين ياباني', name_en: 'Japanese Yen', symbol: '¥' },
  INR: { flag: '🇮🇳', name_ar: 'روبية هندية', name_en: 'Indian Rupee', symbol: '₹' },
  EGP: { flag: '🇪🇬', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound', symbol: 'ج.م' },
  IQD: { flag: '🇮🇶', name_ar: 'دينار عراقي', name_en: 'Iraqi Dinar', symbol: 'ع.د' },
  BRL: { flag: '🇧🇷', name_ar: 'ريال برازيلي', name_en: 'Brazilian Real', symbol: 'R$' },
  KRW: { flag: '🇰🇷', name_ar: 'وون كوري', name_en: 'South Korean Won', symbol: '₩' },
  PLN: { flag: '🇵🇱', name_ar: 'زلوتي بولندي', name_en: 'Polish Zloty', symbol: 'zł' },
  CZK: { flag: '🇨🇿', name_ar: 'كرونة تشيكية', name_en: 'Czech Koruna', symbol: 'Kč' },
  GEL: { flag: '🇬🇪', name_ar: 'لاري جورجي', name_en: 'Georgian Lari', symbol: '₾' },
};

function getCurrencyMeta(code: string) {
  return CURRENCY_META[code] || { flag: '💰', name_ar: code, name_en: code, symbol: code };
}

// ── Number formatting ────────────────────────────────────────────────
function formatNumber(num: number, decimals = 2): string {
  if (num === 0) return '0.00';
  if (Math.abs(num) >= 1_000_000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── Main Component ─────────────────────────────────────────────────
export function CurrencyCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [copiedCurrency, setCopiedCurrency] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { lookupRate, lookupRateDetails, rates, isLoading, refreshRates } = useExchangeRateLookup();
  const { currencyOptions } = useViewCurrency();
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';

  // ── Global keyboard shortcut: Ctrl+E / ⌘+E ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // ── Focus input when dialog opens ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ── Parse input amount ──
  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }, [amount]);

  // ── Get target currencies (all except source) ──
  const targetCurrencies = useMemo(() => {
    const options = currencyOptions.length > 0 ? currencyOptions : ['USD', 'EUR', 'UAH', 'TRY'];
    return options.filter(c => c !== fromCurrency && c !== 'all');
  }, [currencyOptions, fromCurrency]);

  // ── Compute conversions ──
  const conversions = useMemo(() => {
    return targetCurrencies.map(toCurrency => {
      const details = lookupRateDetails(fromCurrency, toCurrency);
      const rate = lookupRate(fromCurrency, toCurrency);
      const convertedAmount = parsedAmount * rate;

      let buyAmount: number | null = null;
      let sellAmount: number | null = null;

      if (details) {
        buyAmount = details.buyRate > 0 ? parsedAmount * details.buyRate : null;
        sellAmount = details.sellRate > 0 ? parsedAmount * details.sellRate : null;
      }

      return {
        currency: toCurrency,
        rate,
        convertedAmount,
        buyAmount,
        sellAmount,
        source: details?.source || 'calculated',
        meta: getCurrencyMeta(toCurrency),
      };
    });
  }, [targetCurrencies, fromCurrency, parsedAmount, lookupRate, lookupRateDetails]);

  // ── Copy to clipboard ──
  const handleCopy = useCallback((currency: string, value: number) => {
    navigator.clipboard.writeText(formatNumber(value));
    setCopiedCurrency(currency);
    setTimeout(() => setCopiedCurrency(null), 1500);
  }, []);

  // ── Switch currency ──
  const handleSelectFromCurrency = useCallback((currency: string) => {
    setFromCurrency(currency);
  }, []);

  if (!isOpen) return null;

  const fromMeta = getCurrencyMeta(fromCurrency);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Calculator Dialog */}
          <motion.div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className={cn(
                "w-[520px] max-h-[75vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl",
                "border border-gray-200/50 dark:border-gray-700/50",
                "overflow-hidden flex flex-col",
                "ring-1 ring-black/5 dark:ring-white/5"
              )}
              dir={direction}
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white font-tajawal">
                        {isAr ? 'حاسبة العملات السريعة' : 'Quick Currency Calculator'}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => refreshRates()}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      title={isAr ? 'تحديث الأسعار' : 'Refresh rates'}
                    >
                      <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                    <div className="text-[11px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md font-mono">
                      {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+E
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Amount Input + Currency Selector ── */}
                <div className="flex items-center gap-2">
                  {/* Amount Input */}
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={amount}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setAmount(val);
                      }}
                      className={cn(
                        "w-full h-11 px-4 text-xl font-bold font-mono",
                        "bg-gray-50 dark:bg-gray-800 rounded-xl",
                        "border-2 border-transparent focus:border-emerald-500/50",
                        "text-gray-900 dark:text-white",
                        "outline-none transition-all",
                        "placeholder:text-gray-400"
                      )}
                      placeholder="1,000"
                      dir="ltr"
                    />
                  </div>

                  {/* From Currency Selector */}
                  <div className="relative">
                    <select
                      value={fromCurrency}
                      onChange={e => handleSelectFromCurrency(e.target.value)}
                      className={cn(
                        "h-11 px-3 pe-8 text-sm font-bold",
                        "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30",
                        "border-2 border-emerald-200 dark:border-emerald-800 rounded-xl",
                        "text-emerald-700 dark:text-emerald-300",
                        "outline-none focus:border-emerald-500",
                        "cursor-pointer appearance-none transition-all"
                      )}
                      dir="ltr"
                    >
                      {(currencyOptions.length > 0 ? currencyOptions.filter(c => c !== 'all') : ['USD', 'EUR', 'UAH', 'TRY']).map(c => (
                        <option key={c} value={c}>
                          {getCurrencyMeta(c).flag} {c}
                        </option>
                      ))}
                    </select>
                    <ArrowRightLeft className="absolute top-1/2 end-2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ── Results List ── */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                    <span className="ms-2 text-sm text-gray-500">{isAr ? 'جارٍ تحميل الأسعار...' : 'Loading rates...'}</span>
                  </div>
                ) : conversions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {isAr ? 'لا توجد عملات مفعّلة' : 'No active currencies'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversions.map((conv, idx) => (
                      <motion.div
                        key={conv.currency}
                        initial={{ opacity: 0, x: direction === 'rtl' ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "group flex items-center justify-between px-3 py-2.5 rounded-xl",
                          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                          "transition-all cursor-pointer"
                        )}
                        onClick={() => handleCopy(conv.currency, conv.convertedAmount)}
                      >
                        {/* Currency Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0">{conv.meta.flag}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                {conv.currency}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 truncate font-tajawal">
                                {isAr ? conv.meta.name_ar : conv.meta.name_en}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-gray-400 font-mono">
                                1 {fromCurrency} = {formatNumber(conv.rate, 4)} {conv.currency}
                              </span>
                              {conv.source && conv.source !== 'calculated' && (
                                <span className="text-[10px] px-1.5 py-0 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
                                  {conv.source.includes('manual') ? (isAr ? 'يدوي' : 'manual') :
                                   conv.source.includes('online') ? (isAr ? 'أونلاين' : 'online') :
                                   conv.source.includes('api') ? 'API' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Converted Amount */}
                        <div className="flex items-center gap-2">
                          <div className="text-end">
                            <div className="text-base font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                              {conv.meta.symbol} {formatNumber(conv.convertedAmount)}
                            </div>
                            {conv.buyAmount !== null && conv.sellAmount !== null && conv.buyAmount !== conv.sellAmount && (
                              <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                  <TrendingUp className="w-3 h-3 inline me-0.5" />
                                  {formatNumber(conv.buyAmount)}
                                </span>
                                <span className="text-red-500 dark:text-red-400 font-mono">
                                  <TrendingDown className="w-3 h-3 inline me-0.5" />
                                  {formatNumber(conv.sellAmount)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Copy Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(conv.currency, conv.convertedAmount);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                              copiedCurrency === conv.currency
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600"
                            )}
                          >
                            {copiedCurrency === conv.currency ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-tajawal">
                    {isAr ? 'اضغط على أي عملة للنسخ' : 'Click any currency to copy'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-tajawal">
                      {conversions.length} {isAr ? 'عملة' : 'currencies'}
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">ESC</kbd>
                      {' '}
                      {isAr ? 'إغلاق' : 'close'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CurrencyCalculator;
