// Step 6: Taxes (Optional)
import { motion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DesktopSetupData } from '../types';

interface Props { data: DesktopSetupData; onChange: (f: string, v: any) => void; lang: string; }

export function StepTaxes({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <Receipt className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAr ? 'إعداد الضرائب' : 'Tax Setup'}</h2>
        <p className="text-sm text-gray-500 mt-1">{isAr ? 'اختياري — يمكنك إعدادها لاحقاً' : 'Optional — you can set this up later'}</p>
      </div>

      <div className="space-y-4">
        {/* VAT */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <p className="font-semibold text-sm">{isAr ? 'ضريبة القيمة المضافة (VAT)' : 'Value Added Tax (VAT)'}</p>
            <p className="text-xs text-gray-500">{isAr ? 'تفعيل الضريبة على الفواتير' : 'Enable tax on invoices'}</p>
          </div>
          <Switch checked={data.vatEnabled} onCheckedChange={v => onChange('vatEnabled', v)} />
        </div>

        {data.vatEnabled && (
          <div className="grid grid-cols-2 gap-4 ps-4 border-s-2 border-teal-200">
            <div>
              <Label>{isAr ? 'نسبة الضريبة' : 'Tax Rate'}</Label>
              <Select value={data.vatRate.toString()} onValueChange={v => onChange('vatRate', parseFloat(v))}>
                <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 13, 15, 18, 20, 21, 23, 25].map(r =>
                    <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? 'الرقم الضريبي' : 'Tax Number'}</Label>
              <Input value={data.taxNumber} onChange={e => onChange('taxNumber', e.target.value)}
                placeholder={isAr ? 'اختياري' : 'Optional'} className="h-11 mt-1" dir="ltr" />
            </div>
          </div>
        )}

        {/* Withholding */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <p className="font-semibold text-sm">{isAr ? 'ضريبة الاستقطاع' : 'Withholding Tax'}</p>
            <p className="text-xs text-gray-500">{isAr ? 'خصم ضريبي من المورد' : 'Tax deduction from supplier'}</p>
          </div>
          <Switch checked={data.withholdingEnabled} onCheckedChange={v => onChange('withholdingEnabled', v)} />
        </div>
      </div>
    </motion.div>
  );
}
