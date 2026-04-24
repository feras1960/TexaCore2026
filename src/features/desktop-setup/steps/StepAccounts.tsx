// Step 5: Chart of Accounts Template
import { motion } from 'framer-motion';
import { BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHART_TEMPLATES, type DesktopSetupData } from '../types';

interface Props { data: DesktopSetupData; onChange: (f: string, v: any) => void; lang: string; }

export function StepAccounts({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAr ? 'شجرة الحسابات' : 'Chart of Accounts'}</h2>
        <p className="text-sm text-gray-500 mt-1">{isAr ? 'اختر قالب محاسبي يناسب نشاطك' : 'Choose an accounting template for your business'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHART_TEMPLATES.map(t => (
          <button key={t.id} onClick={() => onChange('chartTemplate', t.id)}
            className={cn('relative text-start p-4 rounded-xl border-2 transition-all hover:shadow-md',
              data.chartTemplate === t.id ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300')}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{isAr ? t.ar : t.en}</span>
              {data.chartTemplate === t.id && <Check className="w-5 h-5 text-teal-600" />}
            </div>
            <p className="text-xs text-gray-500">{isAr ? t.descAr : t.descEn}</p>
            {t.accounts > 0 && (
              <span className="mt-2 inline-block text-xs font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600">
                {t.accounts} {isAr ? 'حساب' : 'accounts'}
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
