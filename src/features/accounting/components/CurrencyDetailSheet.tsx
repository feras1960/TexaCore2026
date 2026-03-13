/**
 * ════════════════════════════════════════════════════════════════
 * 💱 Currency Detail Sheet — Full Currency Management
 * ════════════════════════════════════════════════════════════════
 * 
 * Opens as a large sheet (like PlatformDetailSheet) when clicking
 * a currency row. Contains sub-tabs:
 *   1. Overview — Rate summary, buy/sell/mid with margin
 *   2. Rate History — Historical rate changes
 *   3. Cross Rates — Rates vs all other supported currencies
 *   4. Settings — Currency configuration
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
    DollarSign, TrendingUp, ArrowRightLeft, Settings,
    ChevronLeft, ChevronRight, RefreshCw, Save, Trash2,
    Clock, Globe, BarChart3, Percent, ArrowUpDown,
    CheckCircle2, X, History, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ExchangeRateOnlineService } from '@/services/data/ExchangeRateOnlineService';
import { ExchangeRatesService, ExchangeRate } from '@/services/data/ExchangeRatesService';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────
interface CurrencyInfo {
    code: string;
    name: string;
    nameEn: string;
    symbol: string;
}

interface CurrencyDetailSheetProps {
    currencyCode: string | null;
    open: boolean;
    onClose: () => void;
    onRateUpdated?: () => void;
    baseCurrency: string;
    supportedCurrencies: string[];
    currencies: CurrencyInfo[];
    onlineRates: Record<string, number>;
}

// ─── Sub-tab definition ──────────────────────────────────────
interface SubTab {
    id: string;
    tKey: string;
    icon: React.ElementType;
}

const SUB_TABS: SubTab[] = [
    { id: 'overview', tKey: 'currency.overview', icon: DollarSign },
    { id: 'history', tKey: 'currency.rateHistory', icon: History },
    { id: 'cross-rates', tKey: 'currency.crossRates', icon: ArrowRightLeft },
    { id: 'settings', tKey: 'currency.settings', icon: Settings },
];

// ─── Main Component ──────────────────────────────────────────
export default function CurrencyDetailSheet({
    currencyCode,
    open,
    onClose,
    onRateUpdated,
    baseCurrency,
    supportedCurrencies,
    currencies,
    onlineRates,
}: CurrencyDetailSheetProps) {
    const { language, t, direction } = useLanguage();
    const isAr = language === 'ar';
    const { company } = useCompany();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);

    // Rate editing state
    const [buyRate, setBuyRate] = useState('');
    const [sellRate, setSellRate] = useState('');
    const [marginPercent, setMarginPercent] = useState(0);
    const [currentDbRate, setCurrentDbRate] = useState<ExchangeRate | null>(null);
    const [rateHistory, setRateHistory] = useState<any[]>([]);

    const cur = currencies.find(c => c.code === currencyCode);
    // onlineRates from API are in 'technical' format: 1 base = X foreign (e.g., 1 UAH = 0.024 USD)
    const onlineRateTechnical = currencyCode ? onlineRates[currencyCode] || null : null;
    // Inverted for user display: 1 foreign = X local (e.g., 1 USD = 41.67 UAH)
    const onlineRateDisplay = onlineRateTechnical ? (1 / onlineRateTechnical) : null;

    // ─── Load DB rate on open ────────────────────────────────
    useEffect(() => {
        if (currencyCode && open && company?.id) {
            setActiveTab('overview');
            loadCurrentRate();
            loadRateHistory();
        }
    }, [currencyCode, open, company?.id]);

    const loadCurrentRate = async () => {
        if (!company?.id || !currencyCode) return;
        setLoading(true);
        try {
            const rates = await ExchangeRatesService.getRates(company.id);
            const rate = rates.find(
                r => r.from_currency === baseCurrency && r.to_currency === currencyCode
            );
            setCurrentDbRate(rate || null);
            if (rate) {
                // DB stores technical rate (1 base = X foreign, e.g., 0.024)
                // Convert to display format (1 foreign = X local, e.g., 41.67)
                const dbBuy = rate.buy_rate || 0;
                const dbSell = rate.sell_rate || 0;
                setBuyRate(dbBuy > 0 ? (1 / dbBuy).toFixed(2) : '');
                setSellRate(dbSell > 0 ? (1 / dbSell).toFixed(2) : '');
                setMarginPercent(rate.margin_percent || 0);
            } else {
                // Pre-fill with online rate (display format: 1 foreign = X local)
                const displayRate = onlineRateDisplay?.toFixed(2) || '';
                setBuyRate(displayRate);
                setSellRate(displayRate);
                setMarginPercent(0);
            }
        } catch (err) {
            console.warn('Failed to load rate:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRateHistory = async () => {
        if (!company?.id || !currencyCode) return;
        try {
            const { data } = await supabase
                .from('exchange_rates')
                .select('*')
                .eq('company_id', company.id)
                .eq('from_currency', baseCurrency)
                .eq('to_currency', currencyCode)
                .order('effective_from', { ascending: false })
                .limit(50);
            setRateHistory(data || []);
        } catch (err) {
            console.warn('Failed to load history:', err);
        }
    };

    // ─── Calculate & margin (all in display format: 1 foreign = X local) ──
    const calculateMidRate = (buy: number, sell: number) => {
        return (buy + sell) / 2;
    };

    const applyMarginToDisplayRate = (displayRate: number, margin: number) => {
        // Buy lower (we pay less local per 1 foreign) 
        // Sell higher (customer pays more local per 1 foreign)
        const buyR = displayRate * (1 - margin / 100);
        const sellR = displayRate * (1 + margin / 100);
        return { buy: buyR, sell: sellR };
    };

    const handleApplyOnlineWithMargin = () => {
        if (!onlineRateDisplay) return;
        const { buy, sell } = applyMarginToDisplayRate(onlineRateDisplay, marginPercent);
        setBuyRate(buy.toFixed(2));
        setSellRate(sell.toFixed(2));
    };

    // ─── Save rates ──────────────────────────────────────────
    // ALWAYS creates a NEW record and deactivates the old one → proper history
    // User inputs display rates (1 foreign = X local, e.g., 43700)
    // DB stores technical rates (1 local = X foreign, e.g., 1/43700 = 0.0000229)
    const saveRate = async () => {
        if (!company?.id || !currencyCode) return;
        const displayBuy = parseFloat(buyRate);
        const displaySell = parseFloat(sellRate);
        if (isNaN(displayBuy) || isNaN(displaySell) || displayBuy <= 0 || displaySell <= 0) {
            toast({ title: t('currency.error'), description: t('currency.enterValidRates'), variant: 'destructive' });
            return;
        }
        // Convert display format to technical format for DB storage
        const technicalBuy = 1 / displayBuy;
        const technicalSell = 1 / displaySell;
        const now = new Date().toISOString();
        try {
            // Step 1: Deactivate OLD record (if exists) — keeps it in history
            if (currentDbRate) {
                await ExchangeRatesService.updateRate(currentDbRate.id, {
                    is_active: false,
                    effective_to: now,
                });
            }
            // Step 2: Create NEW record — this becomes the active rate
            await ExchangeRatesService.addRate({
                tenant_id: company.tenant_id || company.id,
                company_id: company.id,
                from_currency: baseCurrency,
                to_currency: currencyCode,
                buy_rate: technicalBuy,
                sell_rate: technicalSell,
                margin_percent: marginPercent,
                effective_from: now,
                source: 'manual',
                is_active: true,
            });
            toast({
                title: t('currency.saved'),
                description: `${t('currency.newRateRecorded')} ${currencyCode}`,
            });
            loadCurrentRate();
            loadRateHistory();
            onRateUpdated?.();
        } catch (err) {
            console.error('Failed to save rate:', err);
            toast({ title: t('currency.error'), description: t('currency.failedToSave'), variant: 'destructive' });
        }
    };

    // ─── Reset to online rate ────────────────────────────────
    const resetToOnline = async () => {
        if (!currentDbRate || !onlineRateDisplay) return;
        try {
            // Deactivate manual rate — system falls back to online
            await ExchangeRatesService.updateRate(currentDbRate.id, {
                is_active: false,
                effective_to: new Date().toISOString(),
            });
            setCurrentDbRate(null);
            const displayRate = onlineRateDisplay.toFixed(2);
            setBuyRate(displayRate);
            setSellRate(displayRate);
            setMarginPercent(0);
            toast({
                title: t('currency.resetDone'),
                description: t('currency.resetToOnline'),
            });
            loadRateHistory();
            onRateUpdated?.();
        } catch (err) {
            console.error('Failed to reset:', err);
        }
    };

    // ─── Delete manual rate ──────────────────────────────────
    const deleteRate = async () => {
        if (!currentDbRate) return;
        try {
            await ExchangeRatesService.deleteRate(currentDbRate.id);
            setCurrentDbRate(null);
            setBuyRate('');
            setSellRate('');
            setMarginPercent(0);
            toast({
                title: t('currency.removed'),
                description: t('currency.manualRateRemoved'),
            });
            onRateUpdated?.();
        } catch (err) {
            console.error('Failed to delete rate:', err);
        }
    };

    if (!currencyCode) return null;

    // buyRate/sellRate are in DISPLAY format: 1 foreign = X local (e.g., 43700)
    const buyNum = parseFloat(buyRate) || 0;
    const sellNum = parseFloat(sellRate) || 0;
    const midNum = calculateMidRate(buyNum, sellNum);
    const spread = sellNum - buyNum; // spread in local currency
    const spreadPercent = midNum > 0 ? ((spread / midNum) * 100) : 0;

    // ═══ Overview Tab ════════════════════════════════════════
    const renderOverviewTab = () => (
        <div className="space-y-5">
            {/* Stats Cards — all values are in display format (1 foreign = X local) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    {
                        label: t('currency.onlineRate'),
                        value: onlineRateDisplay ? onlineRateDisplay.toFixed(2) : '—',
                        subLabel: `1 ${currencyCode} = ${onlineRateDisplay ? onlineRateDisplay.toFixed(2) : '?'} ${baseCurrency}`,
                        icon: Globe,
                        color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
                    },
                    {
                        label: t('currency.buyRate'),
                        value: buyNum > 0 ? buyNum.toFixed(2) : '—',
                        subLabel: `${t('currency.weBuy')} 1 ${currencyCode} = ${buyNum > 0 ? buyNum.toFixed(2) : '?'} ${baseCurrency}`,
                        icon: TrendingUp,
                        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
                    },
                    {
                        label: t('currency.sellRate'),
                        value: sellNum > 0 ? sellNum.toFixed(2) : '—',
                        subLabel: `${t('currency.weSell')} 1 ${currencyCode} = ${sellNum > 0 ? sellNum.toFixed(2) : '?'} ${baseCurrency}`,
                        icon: ArrowUpDown,
                        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
                    },
                    {
                        label: t('currency.spread'),
                        value: spreadPercent > 0 ? `${spreadPercent.toFixed(2)}%` : '—',
                        subLabel: spread > 0 ? `${spread.toFixed(2)} ${baseCurrency}` : '',
                        icon: BarChart3,
                        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
                    },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card className="border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color)}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold font-mono text-gray-900 dark:text-white">{stat.value}</div>
                                        <div className="text-[11px] text-gray-500 font-tajawal">{stat.label}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-2 font-tajawal">{stat.subLabel}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Conversion Preview — Dual Display */}
            <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-r from-erp-teal/5 to-transparent dark:from-erp-teal/10">
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 gap-6">
                        {/* 1 Foreign = X Local (main display like exchange apps) */}
                        <div className="text-center space-y-1.5 border-e border-gray-200 dark:border-gray-700 pe-6">
                            <p className="text-xs text-gray-500 font-tajawal">
                                {`1 ${currencyCode} ${t('currency.inLocalCurrency')}`}
                            </p>
                            <div className="text-3xl font-bold font-mono text-erp-navy dark:text-white">
                                {midNum > 0 ? midNum.toFixed(2) : (onlineRateDisplay?.toFixed(2) || '—')}
                            </div>
                            <p className="text-xs text-gray-400 font-mono">
                                1 {currencyCode} = {midNum > 0 ? midNum.toFixed(2) : (onlineRateDisplay?.toFixed(2) || '?')} {baseCurrency}
                            </p>
                        </div>
                        {/* 1 Local = X Foreign (technical rate) */}
                        <div className="text-center space-y-1.5">
                            <p className="text-xs text-gray-500 font-tajawal">
                                {`1 ${baseCurrency} ${t('currency.inForeignCurrency')}`}
                            </p>
                            <div className="text-3xl font-bold font-mono text-gray-600 dark:text-gray-300">
                                {midNum > 0 ? (1 / midNum).toFixed(6) : (onlineRateTechnical?.toFixed(6) || '—')}
                            </div>
                            <p className="text-xs text-gray-400 font-mono">
                                1 {baseCurrency} = {midNum > 0 ? (1 / midNum).toFixed(6) : (onlineRateTechnical?.toFixed(6) || '?')} {currencyCode}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rate Setting Form */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-5 space-y-5">
                    <h4 className="text-sm font-bold font-tajawal text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-4 h-4 text-erp-teal" />
                        {t('currency.setExchangeRates')}
                    </h4>

                    {/* Online Rate Reference */}
                    {onlineRateDisplay && (
                        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-tajawal text-green-700 dark:text-green-300">
                                        {`${t('currency.onlineRateLabel')}: 1 ${currencyCode} =`}
                                    </span>
                                </div>
                                <span className="font-mono font-bold text-green-700 dark:text-green-300">
                                    {onlineRateDisplay.toFixed(2)} {baseCurrency}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Margin Slider */}
                    {onlineRateDisplay && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                    <Percent className="w-3.5 h-3.5 text-erp-teal" />
                                    {t('currency.exchangeMargin')}
                                </Label>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {marginPercent.toFixed(2)}%
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                                <Slider
                                    value={[marginPercent]}
                                    onValueChange={([v]) => setMarginPercent(v)}
                                    min={0}
                                    max={10}
                                    step={0.01}
                                    className="flex-1"
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    max={50}
                                    step={0.01}
                                    value={marginPercent}
                                    onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                                    className="w-20 font-mono text-xs text-center h-8"
                                    dir="ltr"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleApplyOnlineWithMargin}
                                className="w-full font-tajawal text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                            >
                                <RefreshCw className="w-3.5 h-3.5 me-1.5" />
                                {`${t('currency.applyOnlineWithMargin')} ${marginPercent}%`}
                            </Button>
                        </div>
                    )}

                    {/* Buy / Sell Inputs — display format: 1 foreign = X local */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-tajawal text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {`${t('currency.buyPriceFor')} 1 ${currencyCode}`}
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={buyRate}
                                onChange={(e) => setBuyRate(e.target.value)}
                                className="font-mono text-sm h-10"
                                dir="ltr"
                                placeholder={`${baseCurrency}`}
                            />
                            <p className="text-[10px] text-gray-400 font-tajawal">
                                {t('currency.weBuy')} 1 {currencyCode} = {buyRate || '?'} {baseCurrency}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-tajawal text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                <ArrowUpDown className="w-3 h-3" />
                                {`${t('currency.sellPriceFor')} 1 ${currencyCode}`}
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sellRate}
                                onChange={(e) => setSellRate(e.target.value)}
                                className="font-mono text-sm h-10"
                                dir="ltr"
                                placeholder={`${baseCurrency}`}
                            />
                            <p className="text-[10px] text-gray-400 font-tajawal">
                                {t('currency.weSell')} 1 {currencyCode} = {sellRate || '?'} {baseCurrency}
                            </p>
                        </div>
                    </div>

                    {/* Mid Rate + Spread Summary */}
                    {buyNum > 0 && sellNum > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                                <p className="text-[10px] text-gray-500 font-tajawal mb-1">{`${t('currency.mid')} 1 ${currencyCode}`}</p>
                                <p className="font-mono font-bold text-sm">{midNum.toFixed(2)} <span className="text-[10px] text-gray-400">{baseCurrency}</span></p>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                                <p className="text-[10px] text-gray-500 font-tajawal mb-1">{t('currency.difference')}</p>
                                <p className="font-mono font-bold text-sm text-amber-600">{spread.toFixed(2)} <span className="text-[10px]">{baseCurrency}</span></p>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                                <p className="text-[10px] text-gray-500 font-tajawal mb-1">{t('currency.margin')}</p>
                                <p className="font-mono font-bold text-sm text-green-600">{spreadPercent.toFixed(2)}%</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={saveRate}
                            className="flex-1 bg-erp-teal hover:bg-erp-teal/90 text-white font-tajawal text-sm"
                        >
                            <Save className="w-4 h-4 me-1.5" />
                            {t('currency.saveRates')}
                        </Button>
                        {currentDbRate && onlineRateDisplay && (
                            <Button
                                variant="outline"
                                onClick={resetToOnline}
                                className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20 font-tajawal text-sm"
                            >
                                <Globe className="w-4 h-4 me-1.5" />
                                {t('currency.autoRate')}
                            </Button>
                        )}
                        {currentDbRate && (
                            <Button
                                variant="outline"
                                onClick={deleteRate}
                                className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 font-tajawal text-sm"
                            >
                                <Trash2 className="w-4 h-4 me-1.5" />
                                {t('common.delete')}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // ═══ History Tab ═════════════════════════════════════════
    const renderHistoryTab = () => (
        <div className="space-y-4">
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-0">
                    {rateHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-tajawal text-sm">{t('currency.noRateHistory')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.date')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.buy')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.sell')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.midRate')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.margin')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.source')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rateHistory.map((rate, i) => (
                                        <tr key={rate.id} className={cn(
                                            "border-b border-gray-100 dark:border-gray-800",
                                            i === 0 && rate.is_active ? "bg-green-50/50 dark:bg-green-900/5" : ""
                                        )}>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <span className="font-mono text-xs">
                                                        {new Date(rate.effective_from).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                                        })}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 font-mono">
                                                        {new Date(rate.effective_from).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
                                                            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                                                        })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                                                {rate.buy_rate > 0 ? (1 / rate.buy_rate).toFixed(2) : '—'} <span className="text-[9px] text-gray-400">{baseCurrency}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-purple-600 dark:text-purple-400">
                                                {rate.sell_rate > 0 ? (1 / rate.sell_rate).toFixed(2) : '—'} <span className="text-[9px] text-gray-400">{baseCurrency}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">
                                                {rate.mid_rate > 0 ? (1 / rate.mid_rate).toFixed(2) : '—'} <span className="text-[9px] text-gray-400">{baseCurrency}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-amber-600">{rate.margin_percent?.toFixed(2)}%</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-[10px] font-tajawal">
                                                    {rate.source === 'manual' ? t('currency.manual') : rate.source}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {rate.is_active ? (
                                                    <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 font-tajawal">
                                                        {t('currency.active')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px] font-tajawal">
                                                        {t('currency.expired')}
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    // ═══ Cross Rates Tab ═════════════════════════════════════
    const renderCrossRatesTab = () => {
        const otherCurrencies = supportedCurrencies.filter(c => c !== currencyCode);
        return (
            <div className="space-y-4">
                <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">{t('currency.currencyLabel')}</th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">
                                            {isAr ? `1 ${currencyCode} =` : `1 ${currencyCode} =`}
                                        </th>
                                        <th className="text-start font-tajawal font-medium text-gray-500 px-4 py-2.5 text-xs">
                                            {`${t('currency.vs')} ${baseCurrency}`}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {otherCurrencies.map(otherCode => {
                                        const otherCur = currencies.find(c => c.code === otherCode);
                                        const otherOnlineRate = onlineRates[otherCode];
                                        let crossRate: number | null = null;

                                        // Cross rates use technical rates (1 base = X foreign)
                                        if (onlineRateTechnical && otherOnlineRate && otherCode !== baseCurrency) {
                                            crossRate = otherOnlineRate / (onlineRateTechnical || 1);
                                        } else if (onlineRateTechnical && otherCode === baseCurrency) {
                                            crossRate = 1 / onlineRateTechnical;
                                        } else if (otherOnlineRate && currencyCode === baseCurrency) {
                                            crossRate = otherOnlineRate;
                                        }

                                        // Display cross rate as: 1 [current] = X [other]
                                        const displayCross = crossRate !== null ? crossRate : null;

                                        return (
                                            <tr key={otherCode} className="border-b border-gray-100 dark:border-gray-800">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base flex-shrink-0">
                                                            {otherCur?.symbol}
                                                        </div>
                                                        <div>
                                                            <span className="font-mono font-bold text-sm text-erp-navy dark:text-white">{otherCode}</span>
                                                            <p className="text-[11px] text-gray-500 font-tajawal">{isAr ? otherCur?.name : otherCur?.nameEn}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-sm font-semibold text-erp-navy dark:text-white">
                                                        {displayCross !== null ? displayCross.toFixed(4) : '—'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 ms-1">{otherCode}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-gray-500">
                                                        {otherOnlineRate && otherOnlineRate > 0 ? (1 / otherOnlineRate).toFixed(2) : '—'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 ms-1">{baseCurrency}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // ═══ Settings Tab ════════════════════════════════════════
    const renderSettingsTab = () => (
        <div className="space-y-4">
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-5 space-y-4">
                    <h4 className="text-sm font-bold font-tajawal text-gray-900 dark:text-white">
                        {t('currency.currencyInfo')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500 font-tajawal">{t('currency.code')}:</span>
                            <span className="ms-2 font-mono font-bold">{currencyCode}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-tajawal">{t('currency.symbol')}:</span>
                            <span className="ms-2 text-lg">{cur?.symbol}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-tajawal">{t('currency.nameAr')}:</span>
                            <span className="ms-2 font-tajawal">{cur?.name}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-tajawal">{t('currency.nameEn')}:</span>
                            <span className="ms-2">{cur?.nameEn}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-800">
                <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-bold font-tajawal text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('currency.dangerZone')}
                    </h4>
                    <p className="text-xs text-gray-500 font-tajawal">
                        {t('currency.dangerWarning')}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 font-tajawal text-xs"
                        onClick={() => {
                            deleteRate();
                            onClose();
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5 me-1" />
                        {t('currency.removeCurrency')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    // ─── Render Tab Content ──────────────────────────────────
    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return renderOverviewTab();
            case 'history': return renderHistoryTab();
            case 'cross-rates': return renderCrossRatesTab();
            case 'settings': return renderSettingsTab();
            default: return null;
        }
    };

    // ═══ Main Render ═════════════════════════════════════════
    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent
                side={direction === 'rtl' ? 'left' : 'right'}
                className="w-full sm:w-[90vw] md:w-[80vw] lg:w-[65vw] xl:w-[55vw] max-w-[900px] p-0 border-0 [&>button]:hidden"
            >
                {/* Header — Gradient Banner */}
                <div className="bg-gradient-to-r from-erp-teal to-emerald-600 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                                {cur?.symbol || currencyCode?.[0]}
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-white font-mono">
                                    {currencyCode}
                                </SheetTitle>
                                <p className="text-sm text-white/70 font-tajawal">
                                    {isAr ? cur?.name : cur?.nameEn}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                            {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </Button>
                    </div>

                    {/* Quick Stats in Header */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        {[
                            { label: t('currency.online'), value: onlineRateDisplay ? onlineRateDisplay.toFixed(2) : '—' },
                            { label: t('currency.buy'), value: buyNum > 0 ? buyNum.toFixed(2) : '—' },
                            { label: t('currency.sell'), value: sellNum > 0 ? sellNum.toFixed(2) : '—' },
                            { label: t('currency.spread'), value: spreadPercent > 0 ? `${spreadPercent.toFixed(1)}%` : '—' },
                        ].map(s => (
                            <div key={s.label} className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                                <span className="text-lg font-bold text-white font-mono">{s.value}</span>
                                <span className="text-[10px] text-white/60 ms-1.5 font-tajawal">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sub-tabs Bar */}
                <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <div className="flex px-2 gap-0.5 min-w-max">
                            {SUB_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium font-tajawal transition-all whitespace-nowrap border-b-2",
                                        activeTab === tab.id
                                            ? "border-erp-teal text-erp-teal"
                                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {t(tab.tKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <ScrollArea className="h-[calc(100vh-220px)]">
                    <div className="p-5">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: isAr ? -10 : 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isAr ? 10 : -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderTabContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
