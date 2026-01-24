/**
 * SaaS Reports Page
 * صفحة تقارير وتحليلات SaaS
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  Download, 
  Printer
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Reports() {
  const { t, language, direction } = useLanguage();
  const [timeRange, setTimeRange] = useState('6months');

  const handlePrint = () => window.print();
  const handleExport = () => {
    // TODO: Implement export functionality
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-erp-teal" />
            {language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal mt-1">
            {language === 'ar' ? 'تحليلات شاملة للإيرادات والمشتركين' : 'Comprehensive revenue and subscriber analytics'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">{language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days'}</SelectItem>
              <SelectItem value="3months">{language === 'ar' ? 'آخر 3 أشهر' : 'Last 3 Months'}</SelectItem>
              <SelectItem value="6months">{language === 'ar' ? 'آخر 6 أشهر' : 'Last 6 Months'}</SelectItem>
              <SelectItem value="12months">{language === 'ar' ? 'آخر 12 شهر' : 'Last 12 Months'}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">{t('common.print')}</span>
          </Button>
          <Button onClick={handleExport} className="gap-2 bg-erp-teal hover:bg-erp-teal/90 text-white">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{language === 'ar' ? 'تصدير' : 'Export'}</span>
          </Button>
        </div>
      </div>

      {/* Content will be rebuilt */}
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 font-cairo">
          {language === 'ar' ? 'سيتم إعادة بناء التقارير قريباً' : 'Reports will be rebuilt soon'}
        </h2>
        <p className="text-gray-500 dark:text-gray-500 font-tajawal mt-2">
          {language === 'ar' ? 'جاري العمل على تحسين تجربة استعراض البيانات' : 'We are working on improving the data visualization experience'}
        </p>
      </div>
    </div>
  );
}
