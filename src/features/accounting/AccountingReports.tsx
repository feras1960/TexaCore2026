import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import QuickActionsBar from './components/QuickActionsBar';

export default function AccountingReports() {
  const { t, direction } = useLanguage();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy font-cairo mb-2">{t('accounting.reports')}</h1>
          <p className="text-gray-500 font-tajawal">{t('accounting.reportsDescription')}</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <QuickActionsBar />
        </div>
      </div>

    </div>
  );
}
