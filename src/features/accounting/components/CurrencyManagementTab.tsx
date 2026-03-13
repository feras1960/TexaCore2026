/**
 * ════════════════════════════════════════════════════════════════
 * 💱 Currency Management Tab — V2 Professional
 * ════════════════════════════════════════════════════════════════
 * 
 * Professional currency management interface with:
 * - Base currency selection (locked after journal entries)
 * - Add currencies via dialog with search
 * - Active currencies table (buy/sell/mid rates vs base currency)
 * - CurrencyDetailSheet (PlatformSheet-style) on row click
 * - Module default currencies
 * - Online rate refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Globe, DollarSign, Plus, X, Save, Trash2, RefreshCw,
    Lock, CheckCircle2, Settings, TrendingUp, ArrowRightLeft,
    ArrowUpDown
} from 'lucide-react';
import { ExchangeRateOnlineService } from '@/services/data/ExchangeRateOnlineService';
import { ExchangeRatesService, ExchangeRate } from '@/services/data/ExchangeRatesService';
import { supabase } from '@/lib/supabase';
import CurrencyDetailSheet from './CurrencyDetailSheet';

// ─── Types ─────────────────────────────────────────────────────
interface CurrencyInfo {
    code: string;
    name: string;
    nameEn: string;
    symbol: string;
}

interface CurrencyManagementTabProps {
    settings: {
        base_currency?: string;
        supported_currencies?: string[];
        default_sales_currency?: string;
        default_purchase_currency?: string;
        default_international_purchase_currency?: string;
        [key: string]: any;
    };
    updateSetting: (key: string, value: any) => void;
    currencies: CurrencyInfo[];
    direction: string;
}

// ─── Component ─────────────────────────────────────────────────
export default function CurrencyManagementTab({
    settings,
    updateSetting,
    currencies,
    direction,
}: CurrencyManagementTabProps) {
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const { company } = useCompany();
    const { toast } = useToast();

    // ─── State ─────────────────────────────────────────────────
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [onlineRates, setOnlineRates] = useState<Record<string, number>>({});
    const [dbRates, setDbRates] = useState<ExchangeRate[]>([]);
    const [fetchingRates, setFetchingRates] = useState(false);
    const [lastFetchLabel, setLastFetchLabel] = useState('');
    const [hasJournalEntries, setHasJournalEntries] = useState(false);

    const baseCurrency = settings.base_currency || '';
    const supportedCurrencies = settings.supported_currencies || [];

    // ─── Check journal entries ───────────────────────────────
    useEffect(() => {
        const check = async () => {
            if (!company?.id) return;
            const { count } = await supabase
                .from('journal_entries')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .limit(1);
            setHasJournalEntries((count || 0) > 0);
        };
        check();
    }, [company?.id]);

    // ─── Load DB rates ───────────────────────────────────────
    const loadDbRates = useCallback(async () => {
        if (!company?.id) return;
        try {
            const rates = await ExchangeRatesService.getRates(company.id);
            setDbRates(rates);
        } catch (err) {
            console.warn('Failed to load DB rates:', err);
        }
    }, [company?.id]);

    useEffect(() => { loadDbRates(); }, [loadDbRates]);

    // ─── Fetch online rates ──────────────────────────────────
    const fetchOnlineRates = useCallback(async () => {
        if (!baseCurrency) return;
        setFetchingRates(true);
        try {
            const result = await ExchangeRateOnlineService.fetchRates(baseCurrency);
            if (result?.rates) {
                setOnlineRates(result.rates);
                setLastFetchLabel(ExchangeRateOnlineService.getTimeSinceLastFetch(baseCurrency, isAr));
                toast({
                    title: t('currencyMgmt.updated'),
                    description: t('currencyMgmt.onlineRatesSuccess'),
                });
            }
        } catch {
            toast({ title: t('common.error') || 'Error', description: t('currencyMgmt.fetchFailed'), variant: 'destructive' });
        } finally {
            setFetchingRates(false);
        }
    }, [baseCurrency, isAr, toast]);

    useEffect(() => {
        if (baseCurrency) {
            const cached = ExchangeRateOnlineService.getCachedRates(baseCurrency);
            if (cached?.rates) {
                setOnlineRates(cached.rates);
                setLastFetchLabel(ExchangeRateOnlineService.getTimeSinceLastFetch(baseCurrency, isAr));
            }
            if (!ExchangeRateOnlineService.isCacheFresh(baseCurrency)) {
                fetchOnlineRates();
            }
        }
    }, [baseCurrency]);

    // ─── Toggle currency ─────────────────────────────────────
    const toggleCurrency = (code: string) => {
        const current = supportedCurrencies;
        if (current.includes(code)) {
            if (code === baseCurrency) {
                toast({ title: t('currencyMgmt.cannotRemove'), description: t('currencyMgmt.cannotRemoveBase'), variant: 'destructive' });
                return;
            }
            updateSetting('supported_currencies', current.filter(c => c !== code));
        } else {
            updateSetting('supported_currencies', [...current, code]);
        }
    };

    // ─── Get rate for currency (DISPLAY format: 1 foreign = X local) ───
    const getRateForCurrency = (code: string) => {
        if (code === baseCurrency) return { buy: 1, sell: 1, mid: 1, source: 'base' as const };
        // DB rates are technical (1 local = X foreign), invert to display (1 foreign = X local)
        const dbRate = dbRates.find(r => r.from_currency === baseCurrency && r.to_currency === code);
        if (dbRate) {
            const displayBuy = dbRate.buy_rate > 0 ? (1 / dbRate.buy_rate) : 0;
            const displaySell = dbRate.sell_rate > 0 ? (1 / dbRate.sell_rate) : 0;
            const displayMid = dbRate.mid_rate && dbRate.mid_rate > 0 ? (1 / dbRate.mid_rate) : ((displayBuy + displaySell) / 2);
            return {
                buy: displayBuy,
                sell: displaySell,
                mid: displayMid,
                source: 'manual' as const,
                margin: dbRate.margin_percent,
            };
        }
        // Online rates are technical too, invert
        const online = onlineRates[code];
        if (online && online > 0) {
            const displayRate = 1 / online;
            return { buy: displayRate, sell: displayRate, mid: displayRate, source: 'online' as const };
        }
        return null;
    };

    // ─── Render ──────────────────────────────────────────────
    return (
        <div className="space-y-6" dir={direction}>

            {/* ═══ Header Banner ═══ */}
            <div className="bg-gradient-to-r from-erp-navy/5 via-erp-teal/5 to-erp-navy/5 dark:from-erp-navy/20 dark:via-erp-teal/10 dark:to-erp-navy/20 border border-erp-teal/20 rounded-xl p-5">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-erp-teal/10 dark:bg-erp-teal/20 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-6 h-6 text-erp-teal" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-tajawal font-bold text-lg text-erp-navy dark:text-white">
                            {t('currencyMgmt.title')}
                        </h3>
                        <p className="font-tajawal text-sm text-gray-500 mt-1">
                            {t('currencyMgmt.subtitle')}
                        </p>
                        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                            <Badge variant="outline" className="font-tajawal font-mono bg-erp-teal/10 text-erp-teal border-erp-teal/30 px-3 py-1 text-xs">
                                ★ {baseCurrency || '—'}
                                {(() => { const bc = currencies.find(c => c.code === baseCurrency); return bc ? ` — ${isAr ? bc.name : bc.nameEn}` : ''; })()}
                            </Badge>
                            <Badge variant="outline" className="font-tajawal bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700 px-3 py-1 text-xs">
                                {`${supportedCurrencies.length} ${t('currencyMgmt.activeCount')}`}
                            </Badge>
                            {lastFetchLabel && (
                                <Badge variant="outline" className="font-tajawal bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700 px-3 py-1 text-xs">
                                    <RefreshCw className="w-3 h-3 me-1" />
                                    {lastFetchLabel}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={fetchOnlineRates} disabled={fetchingRates} className="font-tajawal text-xs gap-1.5 rounded-lg border-erp-teal/30 text-erp-teal hover:bg-erp-teal/5">
                            <RefreshCw className={`w-3.5 h-3.5 ${fetchingRates ? 'animate-spin' : ''}`} />
                            {t('currencyMgmt.refreshRates')}
                        </Button>
                        <Button size="sm" onClick={() => { setShowAddDialog(true); setSearchQuery(''); }} className="font-tajawal text-xs gap-1.5 rounded-lg bg-erp-teal hover:bg-erp-teal/90 text-white">
                            <Plus className="w-3.5 h-3.5" />
                            {t('currencyMgmt.addCurrency')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ═══ Base Currency Card ═══ */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white text-base">
                        <DollarSign className="w-5 h-5 text-erp-teal" />
                        {t('currencyMgmt.baseCurrency')}
                    </CardTitle>
                    <CardDescription className="font-tajawal">
                        {hasJournalEntries
                            ? t('currencyMgmt.baseCurrencyLocked')
                            : t('currencyMgmt.baseCurrencyHint')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-sm">
                        <Select value={baseCurrency} disabled={hasJournalEntries} onValueChange={(v) => { updateSetting('base_currency', v); if (!supportedCurrencies.includes(v)) toggleCurrency(v); }}>
                            <SelectTrigger className={`font-mono font-tajawal ${hasJournalEntries ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies.map(c => (
                                    <SelectItem key={c.code} value={c.code} className="font-tajawal">
                                        <span className="font-mono">{c.code}</span> — {isAr ? c.name : c.nameEn}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {hasJournalEntries && (
                            <div className="flex items-center gap-1.5 mt-2 text-amber-600 dark:text-amber-400">
                                <Lock className="w-3.5 h-3.5" />
                                <span className="text-xs font-tajawal">{t('currencyMgmt.lockedEntries')}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Active Currencies Table ═══ */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white text-base">
                                <ArrowRightLeft className="w-5 h-5 text-erp-teal" />
                                {t('currencyMgmt.activeCurrencies')}
                            </CardTitle>
                            <CardDescription className="font-tajawal mt-1">
                                {t('currencyMgmt.clickToOpen')}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {supportedCurrencies.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-tajawal text-sm">{t('currencyMgmt.noCurrencies')}</p>
                            <Button variant="outline" size="sm" className="mt-3 font-tajawal text-xs" onClick={() => setShowAddDialog(true)}>
                                <Plus className="w-3.5 h-3.5 me-1" />
                                {t('currencyMgmt.addCurrency')}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                        <th className="text-start font-tajawal font-medium text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs">{t('export.currency')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs">
                                            <span className="flex items-center gap-1">{`1 X = ? ${baseCurrency}`}</span>
                                        </th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs">
                                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {t('currency.buy') || (isAr ? 'شراء' : 'Buy')}</span>
                                        </th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs">
                                            <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> {t('currency.sell') || (isAr ? 'بيع' : 'Sell')}</span>
                                        </th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs">{t('currency.source') || (isAr ? 'المصدر' : 'Source')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs">{t('currency.margin') || (isAr ? 'الهامش' : 'Margin')}</th>
                                        <th className="px-4 py-2.5 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supportedCurrencies.map((code) => {
                                        const cur = currencies.find(c => c.code === code);
                                        const isBase = code === baseCurrency;
                                        const rate = getRateForCurrency(code);

                                        return (
                                            <tr
                                                key={code}
                                                className={`border-b border-gray-100 dark:border-gray-800 transition-colors group cursor-pointer ${isBase ? 'bg-amber-50/30 dark:bg-amber-900/5 hover:bg-amber-50/60 dark:hover:bg-amber-900/10' : 'hover:bg-erp-teal/5 dark:hover:bg-erp-teal/10'
                                                    }`}
                                                onClick={() => setSelectedCurrency(code)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base font-mono flex-shrink-0">
                                                            {cur?.symbol || code[0]}
                                                        </div>
                                                        <div>
                                                            <span className="font-mono font-bold text-erp-navy dark:text-white text-sm">{code}</span>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-tajawal leading-tight">
                                                                {isAr ? cur?.name : cur?.nameEn}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Rate: 1 Foreign = X Local (already in display format) */}
                                                <td className="px-4 py-3">
                                                    {isBase ? (
                                                        <span className="font-mono text-sm text-gray-400">1.00</span>
                                                    ) : rate ? (
                                                        <div>
                                                            <span className="font-mono text-sm font-bold text-erp-navy dark:text-white">{rate.mid.toFixed(2)}</span>
                                                            <span className="text-[10px] text-gray-400 ms-1">{baseCurrency}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-tajawal">—</span>
                                                    )}
                                                </td>
                                                {/* Buy */}
                                                <td className="px-4 py-3">
                                                    {isBase ? (
                                                        <span className="font-mono text-xs text-gray-400">—</span>
                                                    ) : rate ? (
                                                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{rate.buy.toFixed(2)}</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-tajawal">—</span>
                                                    )}
                                                </td>
                                                {/* Sell */}
                                                <td className="px-4 py-3">
                                                    {isBase ? (
                                                        <span className="font-mono text-xs text-gray-400">—</span>
                                                    ) : rate ? (
                                                        <span className="font-mono text-xs text-purple-600 dark:text-purple-400">{rate.sell.toFixed(2)}</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-tajawal">—</span>
                                                    )}
                                                </td>
                                                {/* Source */}
                                                <td className="px-4 py-3">
                                                    {isBase ? (
                                                        <Badge className="font-tajawal text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                                            {t('currency.baseCurrency') || (isAr ? 'أساسية' : 'Base')}
                                                        </Badge>
                                                    ) : rate?.source === 'manual' ? (
                                                        <Badge className="font-tajawal text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                                                            {t('currency.manual') || (isAr ? 'يدوي' : 'Manual')}
                                                        </Badge>
                                                    ) : rate?.source === 'online' ? (
                                                        <Badge className="font-tajawal text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                                            {t('currency.online') || (isAr ? 'أونلاين' : 'Online')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="font-tajawal text-[10px]">—</Badge>
                                                    )}
                                                </td>
                                                {/* Margin */}
                                                <td className="px-4 py-3">
                                                    {isBase ? (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    ) : rate?.margin ? (
                                                        <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{rate.margin.toFixed(1)}%</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                {/* Delete */}
                                                <td className="px-4 py-3">
                                                    {!isBase && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={(e) => { e.stopPropagation(); toggleCurrency(code); }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Module Default Currencies ═══ */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white text-base">
                        <Settings className="w-5 h-5 text-erp-teal" />
                        {t('currency.moduleDefaults') || (isAr ? 'العملات الافتراضية للأنظمة' : 'Module Default Currencies')}
                    </CardTitle>
                    <CardDescription className="font-tajawal">
                        {t('currency.moduleDefaultsHint') || (isAr ? 'العملة المختارة تلقائياً عند إنشاء مستند جديد' : 'Auto-selected currency when creating a new document')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="font-tajawal text-sm">{t('accounting.sales') || (isAr ? 'المبيعات' : 'Sales')}</Label>
                            <Select value={settings.default_sales_currency} onValueChange={(v) => updateSetting('default_sales_currency', v)}>
                                <SelectTrigger className="font-tajawal"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {supportedCurrencies.map(code => (
                                        <SelectItem key={code} value={code} className="font-tajawal font-mono">{code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-tajawal text-sm">{t('accounting.localPurchases') || (isAr ? 'المشتريات المحلية' : 'Local Purchases')}</Label>
                            <Select value={settings.default_purchase_currency} onValueChange={(v) => updateSetting('default_purchase_currency', v)}>
                                <SelectTrigger className="font-tajawal"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {supportedCurrencies.map(code => (
                                        <SelectItem key={code} value={code} className="font-tajawal font-mono">{code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-tajawal text-sm">{t('accounting.intlPurchases') || (isAr ? 'المشتريات الدولية' : 'Intl. Purchases')}</Label>
                            <Select value={settings.default_international_purchase_currency} onValueChange={(v) => updateSetting('default_international_purchase_currency', v)}>
                                <SelectTrigger className="font-tajawal"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {supportedCurrencies.map(code => (
                                        <SelectItem key={code} value={code} className="font-tajawal font-mono">{code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Add Currency Dialog ═══ */}
            {showAddDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddDialog(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" dir={direction} onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="font-tajawal font-bold text-lg text-erp-navy dark:text-white flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-erp-teal" />
                                    {t('currencyMgmt.addCurrency')}
                                </h3>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowAddDialog(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="relative mt-3">
                                <Input
                                    placeholder={isAr ? 'ابحث عن عملة... (USD, يورو, ليرة)' : t('common.search') + '... (USD, Euro)'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ps-9 font-tajawal text-sm h-10"
                                    autoFocus
                                />
                                <Globe className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3">
                            <div className="grid grid-cols-1 gap-2">
                                {currencies
                                    .filter(c =>
                                        !supportedCurrencies.includes(c.code) && (
                                            searchQuery === '' ||
                                            c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                    )
                                    .slice(0, 30)
                                    .map((cur) => (
                                        <div
                                            key={cur.code}
                                            onClick={() => { toggleCurrency(cur.code); setShowAddDialog(false); setSearchQuery(''); }}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-erp-teal hover:bg-erp-teal/5 cursor-pointer transition-all"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">{cur.symbol}</div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-mono font-bold text-sm text-erp-navy dark:text-white">{cur.code}</span>
                                                <p className="text-xs text-gray-500 font-tajawal truncate">{isAr ? cur.name : cur.nameEn}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        </div>
                                    ))}
                                {currencies.filter(c =>
                                    !supportedCurrencies.includes(c.code) && (
                                        searchQuery === '' ||
                                        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                ).length === 0 && (
                                        <div className="text-center py-8 text-gray-400 font-tajawal text-sm">
                                            {t('common.noData') || 'No currencies found'}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Currency Detail Sheet ═══ */}
            <CurrencyDetailSheet
                currencyCode={selectedCurrency}
                open={!!selectedCurrency}
                onClose={() => setSelectedCurrency(null)}
                onRateUpdated={loadDbRates}
                baseCurrency={baseCurrency}
                supportedCurrencies={supportedCurrencies}
                currencies={currencies}
                onlineRates={onlineRates}
            />
        </div>
    );
}
