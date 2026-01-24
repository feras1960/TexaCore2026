import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import QuickActionsBar from './components/QuickActionsBar';

export default function AccountingDashboard() {
  const { t, direction } = useLanguage();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo mb-2">{t('accounting.dashboardLabel')}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickActionsBar />
        </div>
      </div>
    </div>
  );
}
