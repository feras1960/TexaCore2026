/**
 * ════════════════════════════════════════════════════════════════
 * 💱 CurrencyExchangeTab - مكون صرف العملات
 * 
 * Form for currency exchange operations.
 * Creates journal entries for buying/selling currencies.
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SmartAccountSelector } from '../../shared/SmartAccountSelector';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { SheetMode } from '../types';
import {
    RefreshCw,
    Calendar as CalendarIcon,
    ArrowRight,
    ArrowLeftRight,
    DollarSign,
    TrendingUp,
} from 'lucide-react';

export interface CurrencyExchangeTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    onSaveComplete?: () => void;
    companyId?: string;
}

// Common currency list
const CURRENCIES = [
    { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: '﷼' },
    { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$' },
    { code: 'EUR', nameAr: 'يورو', nameEn: 'Euro', symbol: '€' },
    { code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£' },
    { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'UAH', nameAr: 'هريفنيا أوكرانية', nameEn: 'Ukrainian Hryvnia', symbol: '₴' },
    { code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺' },
];

export function CurrencyExchangeTab({
    data,
    mode,
    onChange,
    onSaveComplete,
    companyId: propCompanyId,
}: CurrencyExchangeTabProps) {
    const { t, language, direction } = useLanguage();
    const { companyId: hookCompanyId } = useCompany();
    const { currencyCode: companyCurrency } = useCompanyCurrency();
    const isRTL = direction === 'rtl' || language === 'ar';
    const isReadOnly = mode === 'view';
    const isCreate = mode === 'create';
    const effectiveCompanyId = propCompanyId || hookCompanyId;

    // ─── Form State ───
    const [exchangeDate, setExchangeDate] = useState<Date>(new Date());
    const [fromCurrency, setFromCurrency] = useState(companyCurrency || '');
    const [toCurrency, setToCurrency] = useState('USD');
    const [fromAmount, setFromAmount] = useState<number>(0);
    const [exchangeRate, setExchangeRate] = useState<number>(0);
    const [fundAccountId, setFundAccountId] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');

    // ─── Computed ───
    const toAmount = useMemo(() => {
        if (fromAmount && exchangeRate) {
            return Number((fromAmount * exchangeRate).toFixed(4));
        }
        return 0;
    }, [fromAmount, exchangeRate]);

    // ─── Load existing data ───
    useEffect(() => {
        if (data && !isCreate) {
            setExchangeDate(data.entry_date ? new Date(data.entry_date) : new Date());
            setFromCurrency(data.from_currency || companyCurrency || '');
            setToCurrency(data.to_currency || '');
            setFromAmount(Number(data.from_amount) || 0);
            setExchangeRate(Number(data.exchange_rate) || 0);
            setFundAccountId(data.fund_account_id || '');
            setDescription(data.description || '');
            setReference(data.reference || '');
        }
    }, [data, isCreate]);

    // ─── Sync to parent ───
    useEffect(() => {
        if (!isReadOnly) {
            const exchangeDescription = description || `صرف ${fromAmount} ${fromCurrency} → ${toAmount} ${toCurrency}`;
            onChange({
                entry_date: format(exchangeDate, 'yyyy-MM-dd'),
                entry_type: 'exchange',
                from_currency: fromCurrency,
                to_currency: toCurrency,
                from_amount: fromAmount,
                to_amount: toAmount,
                exchange_rate: exchangeRate,
                fund_account_id: fundAccountId,
                description: exchangeDescription,
                reference,
                amount: fromAmount,
                total_debit: fromAmount,
                total_credit: fromAmount,
                // Lines for journal entry creation
                // Exchange creates a balanced entry using the fund account
                lines: fundAccountId && fromAmount > 0 ? [
                    {
                        account_id: fundAccountId,
                        debit: fromAmount,
                        credit: 0,
                        description: `${toCurrencyData.symbol} ${toAmount.toLocaleString()} ← صرف وارد (${toCurrency})`,
                    },
                    {
                        account_id: fundAccountId,
                        debit: 0,
                        credit: fromAmount,
                        description: `${fromCurrencyData.symbol} ${fromAmount.toLocaleString()} → صرف صادر (${fromCurrency})`,
                    },
                ] : [],
            });
        }
    }, [exchangeDate, fromCurrency, toCurrency, fromAmount, exchangeRate, toAmount, fundAccountId, description, reference, isReadOnly]);

    // ─── Swap Currencies ───
    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
        if (exchangeRate > 0) {
            setExchangeRate(Number((1 / exchangeRate).toFixed(6)));
        }
    };

    const fromCurrencyData = CURRENCIES.find(c => c.code === fromCurrency) || CURRENCIES[0];
    const toCurrencyData = CURRENCIES.find(c => c.code === toCurrency) || CURRENCIES[1];

    return (
        <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {t('accounting.currencyExchange.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {isRTL ? 'تحويل بين العملات المختلفة' : 'Convert between different currencies'}
                    </p>
                </div>
            </div>

            {/* Exchange Form */}
            <Card className="p-6 space-y-6">
                {/* Date & Reference */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                            {t('accounting.currencyExchange.date')}
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild disabled={isReadOnly}>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal h-9"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {format(exchangeDate, "PPP", { locale: language === 'ar' ? ar : undefined })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={exchangeDate}
                                    onSelect={(d) => d && setExchangeDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                            {t('accounting.currencyExchange.reference')}
                        </Label>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            readOnly={isReadOnly}
                            placeholder={t('accounting.placeholders.exchangeRef')}
                            className="h-9"
                        />
                    </div>
                </div>

                {/* Fund Account */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-cyan-500" />
                        {t('accounting.cashFund')}
                    </Label>
                    {!isReadOnly ? (
                        <SmartAccountSelector
                            value={fundAccountId}
                            onChange={setFundAccountId}
                            placeholder={t('accounting.placeholders.selectFund')}
                            className="border-cyan-200 focus:ring-cyan-200"
                        />
                    ) : (
                        <div className="h-9 border rounded-md px-3 flex items-center bg-gray-50 text-sm">
                            {fundAccountId || '—'}
                        </div>
                    )}
                </div>

                {/* Currency Exchange Box */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-5 space-y-4">
                    {/* FROM Currency */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            {t('accounting.currencyExchange.fromCurrency')}
                        </Label>
                        <div className="flex gap-3">
                            <Select
                                value={fromCurrency}
                                onValueChange={setFromCurrency}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-[140px] h-12 bg-white dark:bg-gray-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map(c => (
                                        <SelectItem key={c.code} value={c.code}>
                                            <span className="flex items-center gap-2">
                                                <span className="font-mono text-xs">{c.symbol}</span>
                                                <span>{c.code}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                min={0}
                                value={fromAmount || ''}
                                onChange={(e) => setFromAmount(Number(e.target.value) || 0)}
                                readOnly={isReadOnly}
                                className="flex-1 text-lg font-bold font-mono h-12 bg-white dark:bg-gray-800"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Swap + Rate */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 border-t border-dashed" />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSwap}
                            disabled={isReadOnly}
                            className="rounded-full h-8 w-8 p-0 bg-white dark:bg-gray-800 shadow-sm"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-600" />
                        </Button>
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border shadow-sm">
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
                            <Input
                                type="number"
                                min={0}
                                step="0.0001"
                                value={exchangeRate || ''}
                                onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                                readOnly={isReadOnly}
                                className="w-24 text-center text-sm font-mono h-7 border-0 p-0 bg-transparent"
                                placeholder={t('accounting.placeholders.exchangeRate')}
                            />
                        </div>
                        <div className="flex-1 border-t border-dashed" />
                    </div>

                    {/* TO Currency */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            {t('accounting.currencyExchange.toCurrency')}
                        </Label>
                        <div className="flex gap-3">
                            <Select
                                value={toCurrency}
                                onValueChange={setToCurrency}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-[140px] h-12 bg-white dark:bg-gray-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map(c => (
                                        <SelectItem key={c.code} value={c.code}>
                                            <span className="flex items-center gap-2">
                                                <span className="font-mono text-xs">{c.symbol}</span>
                                                <span>{c.code}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex-1 h-12 border rounded-md px-4 flex items-center bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                                <span className="text-lg font-bold font-mono text-green-700 dark:text-green-400">
                                    {toAmount > 0
                                        ? toAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                                        : '0.00'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                {fromAmount > 0 && exchangeRate > 0 && (
                    <div className="text-center text-sm text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg">
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                            {fromAmount.toLocaleString()} {fromCurrencyData.symbol}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 inline mx-2 text-blue-400" />
                        <span className="font-bold text-green-700 dark:text-green-400">
                            {toAmount.toLocaleString('en-US', { maximumFractionDigits: 4 })} {toCurrencyData.symbol}
                        </span>
                        <span className="block text-[10px] mt-1 opacity-70">
                            {isRTL ? `سعر الصرف: 1 ${fromCurrency} = ${exchangeRate} ${toCurrency}` : `Rate: 1 ${fromCurrency} = ${exchangeRate} ${toCurrency}`}
                        </span>
                    </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        {t('accounting.entry.description')}
                    </Label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        readOnly={isReadOnly}
                        placeholder={t('accounting.placeholders.descriptionDots')}
                        rows={2}
                        className="resize-none"
                    />
                </div>
            </Card>
        </div>
    );
}

export default CurrencyExchangeTab;
