// Step 3: Currencies
import { motion } from 'framer-motion';
import { Coins, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { allCurrencies } from '@/data/currencies';
import { cn } from '@/lib/utils';
import type { DesktopSetupData } from '../types';

interface Props { data: DesktopSetupData; onChange: (f: string, v: any) => void; lang: string; }

export function StepCurrencies({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';
  const currencies = allCurrencies.map(c => ({ code: c.code, name: isAr ? c.nameAr : c.nameEn, symbol: c.symbol }));
  const toggleCurrency = (code: string) => {
    const list = data.additionalCurrencies.includes(code)
      ? data.additionalCurrencies.filter(c => c !== code)
      : [...data.additionalCurrencies, code];
    onChange('additionalCurrencies', list);
  };
  const popular = ['USD', 'EUR', 'TRY', 'GBP', 'SAR', 'AED', 'EGP', 'CNY'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <Coins className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAr ? 'العملات' : 'Currencies'}</h2>
        <p className="text-sm text-gray-500 mt-1">{isAr ? 'حدد العملة الأساسية والعملات الإضافية' : 'Set your base currency and additional currencies'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'العملة المحلية' : 'Local Currency'} <span className="text-red-500">*</span></Label>
          <Select value={data.localCurrency} onValueChange={v => onChange('localCurrency', v)}>
            <SelectTrigger className="h-11 mt-1"><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{isAr ? 'العملة الرئيسية (للتقارير)' : 'Main Currency (Reports)'} <span className="text-red-500">*</span></Label>
          <Select value={data.mainCurrency} onValueChange={v => onChange('mainCurrency', v)}>
            <SelectTrigger className="h-11 mt-1 font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">{isAr ? 'عملات إضافية (اختياري)' : 'Additional Currencies (Optional)'}</Label>
        <div className="flex flex-wrap gap-2">
          {popular.filter(c => c !== data.localCurrency && c !== data.mainCurrency).map(code => {
            const c = allCurrencies.find(x => x.code === code);
            const selected = data.additionalCurrencies.includes(code);
            return (
              <button key={code} onClick={() => toggleCurrency(code)}
                className={cn('px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                  selected ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30' : 'border-gray-200 text-gray-600 hover:border-teal-300')}>
                {c?.symbol} {code} {selected && '✓'}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
