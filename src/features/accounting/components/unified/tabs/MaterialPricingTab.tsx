/**
 * ════════════════════════════════════════════════════════════════
 * 💰 Material Pricing Tab
 * تبويب الأسعار للمادة
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package } from 'lucide-react';

interface MaterialPricingTabProps {
    data: any;
}

export function MaterialPricingTab({ data }: MaterialPricingTabProps) {
    const { language } = useLanguage();

    return (
        <div className="space-y-6 p-6">
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <DollarSign className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {language === 'ar' ? 'تبويب الأسعار' : 'Pricing Tab'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'ar'
                            ? 'سيتم تطبيق إدارة الأسعار قريباً'
                            : 'Pricing management will be implemented soon'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export function MaterialSalesTab({ data }: { data: any }) {
    const { language } = useLanguage();

    return (
        <div className="space-y-6 p-6">
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {language === 'ar' ? 'تبويب المبيعات' : 'Sales Tab'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'ar'
                            ? 'سيتم تطبيق سجل المبيعات قريباً'
                            : 'Sales history will be implemented soon'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export function MaterialPurchasesTab({ data }: { data: any }) {
    const { language } = useLanguage();

    return (
        <div className="space-y-6 p-6">
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {language === 'ar' ? 'تبويب المشتريات' : 'Purchases Tab'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'ar'
                            ? 'سيتم تطبيق سجل المشتريات قريباً'
                            : 'Purchase history will be implemented soon'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export function MaterialAnalyticsTab({ data }: { data: any }) {
    const { language } = useLanguage();

    return (
        <div className="space-y-6 p-6">
            <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold mb-3">
                        <span>AI</span>
                        <span>{language === 'ar' ? 'الذكاء الاصطناعي' : 'Artificial Intelligence'}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {language === 'ar' ? 'تحليلات الذكاء الاصطناعي' : 'AI Analytics'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        {language === 'ar'
                            ? 'سيتم تطبيق تحليلات الذكاء الاصطناعي للتنبؤ بالطلب وتحليل الاتجاهات قريباً'
                            : 'AI-powered demand forecasting and trend analysis will be implemented soon'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
