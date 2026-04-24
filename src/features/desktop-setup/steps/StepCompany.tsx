// Step 2: Company Information
import { motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { countries } from '@/data/countries';
import { BUSINESS_TYPES, type DesktopSetupData } from '../types';

interface Props {
  data: DesktopSetupData;
  onChange: (field: string, value: any) => void;
  lang: string;
}

export function StepCompany({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';
  const sorted = [...countries].sort((a, b) => {
    const nA = isAr ? a.nameAr : a.name;
    const nB = isAr ? b.nameAr : b.name;
    return nA.localeCompare(nB, lang);
  });
  const selCountry = countries.find(c => c.code === data.country);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <Store className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? 'معلومات الشركة' : 'Company Information'}
        </h2>
      </div>

      <div className="grid gap-4">
        <div>
          <Label>{isAr ? 'اسم الشركة' : 'Company Name'} <span className="text-red-500">*</span></Label>
          <Input value={data.companyName} onChange={e => onChange('companyName', e.target.value)}
            placeholder={isAr ? 'أدخل اسم شركتك' : 'Enter company name'} className="h-11 mt-1" autoFocus />
        </div>

        <div>
          <Label>{isAr ? 'نوع النشاط' : 'Business Type'}</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.id} onClick={() => onChange('businessType', bt.id)}
                className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs',
                  data.businessType === bt.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300')}>
                <span className="text-xl">{bt.icon}</span>
                <span className="font-medium">{isAr ? bt.ar : bt.en}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{isAr ? 'البلد' : 'Country'} <span className="text-red-500">*</span></Label>
            <Select value={data.country} onValueChange={val => {
              onChange('country', val);
              const c = countries.find(x => x.code === val);
              if (c) { onChange('localCurrency', c.currency); if (!data.mainCurrency) onChange('mainCurrency', c.currency); }
            }}>
              <SelectTrigger className="h-11 mt-1"><SelectValue placeholder={isAr ? 'اختر البلد' : 'Select country'} /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {sorted.map(c => <SelectItem key={c.code} value={c.code}>{isAr ? c.nameAr : c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isAr ? 'المدينة' : 'City'}</Label>
            <Input value={data.city} onChange={e => onChange('city', e.target.value)} className="h-11 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{isAr ? 'الهاتف' : 'Phone'}</Label>
            <div className="relative flex items-center mt-1" dir="ltr">
              <div className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r px-3 flex items-center rounded-l text-sm font-mono min-w-[60px]">
                {selCountry?.phoneCode || '+...'}
              </div>
              <Input value={data.phone} onChange={e => onChange('phone', e.target.value.replace(/\D/g, ''))}
                className="h-11 pl-[70px]" inputMode="numeric" />
            </div>
          </div>
          <div>
            <Label>{isAr ? 'بداية السنة المالية' : 'Fiscal Year Start'}</Label>
            <Select value={data.fiscalYearStart.toString()} onValueChange={v => onChange('fiscalYearStart', parseInt(v))}>
              <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(isAr
                  ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
                  : ['January','February','March','April','May','June','July','August','September','October','November','December']
                ).map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1} - {m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
