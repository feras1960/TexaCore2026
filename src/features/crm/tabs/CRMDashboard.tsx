import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/app/providers/LanguageProvider';

export default function CRMDashboard() {
    const { t } = useLanguage();
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                {t('crm.dashboard') || 'CRM Dashboard'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-gray-500">Pipeline Value</p>
                        <p className="text-2xl font-bold">$1,250,000</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-gray-500">Active Deals</p>
                        <p className="text-2xl font-bold">45</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-gray-500">Win Rate</p>
                        <p className="text-2xl font-bold">24%</p>
                    </CardContent>
                </Card>
            </div>
            {/* Placeholder for future charts */}
            <Card className="h-96 flex items-center justify-center border-dashed">
                <p className="text-gray-400">Charts & Analytics will appear here</p>
            </Card>
        </div>
    );
}
