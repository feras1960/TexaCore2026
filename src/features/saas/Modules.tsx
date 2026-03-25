import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import ModulesTable from './ModulesTable';

export default function Modules() {
    const { t, language, direction } = useLanguage();

    return (
        <div className="space-y-6" dir={direction}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {language === 'ar' ? 'إدارة الموديولات' : 'Modules Management'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
                        {language === 'ar' ? 'عرض وتحكم في الموديولات والميزات للنظام' : 'View and control system modules and features'}
                    </p>
                </div>
            </div>

            {/* Table View */}
            <ModulesTable />
        </div>
    );
}
