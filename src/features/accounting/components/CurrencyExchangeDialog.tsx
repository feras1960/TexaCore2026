import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Wallet,
  ArrowRight,
  AlertTriangle,
  X,
  DollarSign,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CurrencyBalance {
  currency: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  todayChange: number;
}

interface FundWithCurrencies {
  id: number;
  name: string;
  type: 'cash' | 'bank';
  defaultCurrency: string;
  accountNumber: string;
  balances: CurrencyBalance[];
  lastActivity: string;
  transactionCount: number;
}

interface CurrencyExchangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: FundWithCurrencies | null;
  initialFromCurrency?: string;
  initialToCurrency?: string;
}

// Exchange rates (mock data - in real app would come from API)
const exchangeRates: Record<string, Record<string, number>> = {
  SAR: { USD: 0.2667, EUR: 0.2444, GBP: 0.2111, AED: 0.9792 },
  USD: { SAR: 3.75, EUR: 0.9167, GBP: 0.7917, AED: 3.6725 },
  EUR: { SAR: 4.0909, USD: 1.0909, GBP: 0.8636, AED: 4.0045 },
  GBP: { SAR: 4.7368, USD: 1.2632, EUR: 1.1579, AED: 4.6368 },
  AED: { SAR: 1.0213, USD: 0.2723, EUR: 0.2497, GBP: 0.2157 }
};

const currencyInfo: Record<string, { symbol: string; flag: string; name: { ar: string; en: string } }> = {
  SAR: { symbol: 'ر.س', flag: '🇸🇦', name: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  USD: { symbol: '$', flag: '🇺🇸', name: { ar: 'دولار أمريكي', en: 'US Dollar' } },
  EUR: { symbol: '€', flag: '🇪🇺', name: { ar: 'يورو', en: 'Euro' } },
  GBP: { symbol: '£', flag: '🇬🇧', name: { ar: 'جنيه إسترليني', en: 'British Pound' } },
  AED: { symbol: 'د.إ', flag: '🇦🇪', name: { ar: 'درهم إماراتي', en: 'UAE Dirham' } }
};

export default function CurrencyExchangeDialog({ 
  open, 
  onOpenChange, 
  fund,
  initialFromCurrency = 'USD',
  initialToCurrency = 'SAR'
}: CurrencyExchangeDialogProps) {
  const { language, direction } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());
  const [rateType, setRateType] = useState<'market' | 'custom'>('market');
  const [formData, setFormData] = useState({
    fromCurrency: initialFromCurrency,
    toCurrency: initialToCurrency,
    amount: '',
    customRate: '',
    description: ''
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open && fund) {
      const availableCurrencies = fund.balances.filter(b => b.balance > 0).map(b => b.currency);
      setFormData({
        fromCurrency: initialFromCurrency && availableCurrencies.includes(initialFromCurrency) 
          ? initialFromCurrency 
          : availableCurrencies[0] || 'USD',
        toCurrency: initialToCurrency || 'SAR',
        amount: '',
        customRate: '',
        description: ''
      });
      setRateType('market');
    }
  }, [open, fund, initialFromCurrency, initialToCurrency]);

  const fromBalance = fund?.balances.find(b => b.currency === formData.fromCurrency);
  const toBalance = fund?.balances.find(b => b.currency === formData.toCurrency);
  
  const amount = parseFloat(formData.amount) || 0;
  const marketRate = exchangeRates[formData.fromCurrency]?.[formData.toCurrency] || 1;
  const effectiveRate = rateType === 'custom' && formData.customRate 
    ? parseFloat(formData.customRate) 
    : marketRate;
  const resultAmount = amount * effectiveRate;
  
  const isOverBalance = fromBalance && amount > fromBalance.balance;
  const isSameCurrency = formData.fromCurrency === formData.toCurrency;

  const handleSwapCurrencies = () => {
    setFormData(prev => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency
    }));
  };

  const handleSubmit = () => {
    // TODO: Implement actual currency exchange
    onOpenChange(false);
  };

  if (!fund) return null;

  const availableCurrencies = Object.keys(currencyInfo);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={direction === 'rtl' ? 'left' : 'right'} 
        className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 overflow-hidden"
        dir={direction}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 bg-gradient-to-r from-amber-600 to-orange-500 text-white flex-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-cairo text-white">
                  {language === 'ar' ? 'تصريف عملات' : 'Currency Exchange'}
                </SheetTitle>
                <SheetDescription className="text-white/80 mt-1">
                  {fund.name}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Available Balances */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <h4 className="font-bold text-gray-700 mb-3 font-cairo text-sm">
                  {language === 'ar' ? 'الأرصدة المتاحة في الصندوق' : 'Available Fund Balances'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {fund.balances.filter(b => b.balance > 0).map(balance => (
                    <div 
                      key={balance.currency} 
                      className={`p-2 rounded-lg border ${
                        balance.currency === formData.fromCurrency 
                          ? 'bg-amber-50 border-amber-300' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{currencyInfo[balance.currency]?.flag}</span>
                        <span className="font-mono font-bold text-sm">{balance.balance.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">{balance.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Exchange Visual */}
            <div className="flex items-center gap-4">
              {/* From Currency */}
              <Card className={`flex-1 ${isOverBalance ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <Label className="text-xs text-gray-500 mb-2 block">
                    {language === 'ar' ? 'من' : 'From'}
                  </Label>
                  <Select 
                    value={formData.fromCurrency} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, fromCurrency: v }))}
                  >
                    <SelectTrigger className="bg-white mb-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(curr => (
                        <SelectItem key={curr} value={curr} disabled={curr === formData.toCurrency}>
                          <span className="flex items-center gap-2">
                            <span>{currencyInfo[curr].flag}</span>
                            <span>{curr}</span>
                            <span className="text-gray-400">
                              {language === 'ar' ? currencyInfo[curr].name.ar : currencyInfo[curr].name.en}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {fromBalance && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{language === 'ar' ? 'الرصيد' : 'Balance'}</span>
                      <span className={`font-mono font-bold ${isOverBalance ? 'text-red-600' : 'text-gray-900'}`}>
                        {fromBalance.balance.toLocaleString()} {formData.fromCurrency}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Swap Button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full flex-none"
                onClick={handleSwapCurrencies}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              {/* To Currency */}
              <Card className="flex-1 border-gray-200">
                <CardContent className="p-4">
                  <Label className="text-xs text-gray-500 mb-2 block">
                    {language === 'ar' ? 'إلى' : 'To'}
                  </Label>
                  <Select 
                    value={formData.toCurrency} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, toCurrency: v }))}
                  >
                    <SelectTrigger className="bg-white mb-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(curr => (
                        <SelectItem key={curr} value={curr} disabled={curr === formData.fromCurrency}>
                          <span className="flex items-center gap-2">
                            <span>{currencyInfo[curr].flag}</span>
                            <span>{curr}</span>
                            <span className="text-gray-400">
                              {language === 'ar' ? currencyInfo[curr].name.ar : currencyInfo[curr].name.en}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {toBalance ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{language === 'ar' ? 'الرصيد' : 'Balance'}</span>
                      <span className="font-mono text-gray-900">
                        {toBalance.balance.toLocaleString()} {formData.toCurrency}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      {language === 'ar' ? 'سيتم إنشاء رصيد جديد' : 'New balance will be created'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Same Currency Warning */}
            {isSameCurrency && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' ? 'لا يمكن التصريف إلى نفس العملة!' : 'Cannot exchange to the same currency!'}
                </AlertDescription>
              </Alert>
            )}

            {/* Amount and Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {language === 'ar' ? 'المبلغ المراد تصريفه' : 'Amount to Exchange'}
                </Label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className={`pl-16 font-mono text-lg font-bold ${isOverBalance ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {formData.fromCurrency}
                  </span>
                </div>
                {isOverBalance && (
                  <p className="text-xs text-red-600">
                    {language === 'ar' ? 'المبلغ أكبر من الرصيد المتاح!' : 'Amount exceeds available balance!'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Exchange Rate */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-bold text-blue-900 font-cairo flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
                </h4>

                <RadioGroup value={rateType} onValueChange={(v) => setRateType(v as 'market' | 'custom')}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="market" id="market" />
                      <Label htmlFor="market" className="cursor-pointer text-sm">
                        {language === 'ar' ? 'سعر السوق:' : 'Market Rate:'}{' '}
                        <span className="font-mono font-bold">
                          1 {formData.fromCurrency} = {marketRate.toFixed(4)} {formData.toCurrency}
                        </span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="cursor-pointer text-sm">
                        {language === 'ar' ? 'سعر مخصص:' : 'Custom Rate:'}
                      </Label>
                    </div>
                    {rateType === 'custom' && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">1 {formData.fromCurrency} =</span>
                        <Input 
                          type="number"
                          placeholder={marketRate.toFixed(4)}
                          value={formData.customRate}
                          onChange={(e) => setFormData(prev => ({ ...prev, customRate: e.target.value }))}
                          className="w-28 font-mono text-sm h-8"
                        />
                        <span className="text-sm text-gray-500">{formData.toCurrency}</span>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Result Preview */}
            {amount > 0 && !isSameCurrency && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <h4 className="font-bold text-amber-900 mb-3 font-cairo">
                    {language === 'ar' ? 'ملخص التصريف' : 'Exchange Summary'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{currencyInfo[formData.fromCurrency]?.flag}</span>
                        <span className="text-gray-600">{language === 'ar' ? 'خصم:' : 'Deduct:'}</span>
                      </div>
                      <span className="font-mono font-bold text-red-600">
                        -{amount.toLocaleString()} {formData.fromCurrency}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-amber-700" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{currencyInfo[formData.toCurrency]?.flag}</span>
                        <span className="text-gray-600">{language === 'ar' ? 'إضافة:' : 'Add:'}</span>
                      </div>
                      <span className="font-mono font-bold text-green-600">
                        +{resultAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.toCurrency}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{language === 'ar' ? 'سعر الصرف المطبق:' : 'Applied Rate:'}</span>
                      <span className="font-mono">
                        1 {formData.fromCurrency} = {effectiveRate.toFixed(4)} {formData.toCurrency}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{language === 'ar' ? 'البيان' : 'Description'}</Label>
              <Textarea 
                placeholder={language === 'ar' 
                  ? `تصريف ${formData.fromCurrency} إلى ${formData.toCurrency}` 
                  : `Exchange ${formData.fromCurrency} to ${formData.toCurrency}`
                }
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex-none border-t bg-gray-50 dark:bg-slate-800 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                <X className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto" 
                onClick={handleSubmit}
                disabled={isOverBalance || isSameCurrency || !amount}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تنفيذ التصريف' : 'Execute Exchange'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
