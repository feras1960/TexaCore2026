/**
 * Packages Management Page
 * إدارة الباقات والأسعار
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { plansService, type Plan, type UpdatePlanInput } from '@/services/saas/plansService';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
} from 'lucide-react';
import PackagesTable from './PackagesTable';

export default function Packages() {
  const { t, language, direction } = useLanguage();
  const [loading, setLoading] = useState(true);

  // Load plans from backend
  const loadPlans = async () => {
    setLoading(true);
    try {
      await plansService.getAll();
    } catch (err: any) {
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.packages')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar' ? 'إدارة باقات الاشتراك والأسعار' : 'Manage subscription packages and pricing'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPlans} disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Table View */}
      <PackagesTable />
    </div>
  );
}
