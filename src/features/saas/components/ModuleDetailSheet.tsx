import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModuleWithPlans, saasModulesService } from '@/services/saas/modulesService';
import {
    Boxes,
    Check,
    X,
    Lock,
    Settings,
    List,
    LayoutGrid
} from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n-helpers';

interface ModuleDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    module: ModuleWithPlans;
}

export function ModuleDetailSheet({ isOpen, onClose, module }: ModuleDetailSheetProps) {
    const { t, language, direction } = useLanguage();
    const [activeTab, setActiveTab] = useState('overview');
    const [features, setFeatures] = useState<any[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);

    useEffect(() => {
        if (isOpen && module.code) {
            loadFeatures();
        }
    }, [isOpen, module.code]);

    const loadFeatures = async () => {
        setLoadingFeatures(true);
        try {
            const data = await saasModulesService.getModuleDetails(module.code);
            setFeatures(data.features || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingFeatures(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-[100%] sm:w-[50%] p-0">
                <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                    {/* Header */}
                    <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                <Boxes className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold font-cairo text-erp-navy dark:text-white">
                                    {getLocalizedField(module, 'name', language)}
                                </SheetTitle>
                                <SheetDescription className="font-tajawal mt-1">
                                    {getLocalizedField(module, 'description', language) || 'No description available'}
                                </SheetDescription>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <div className="px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                                    <TabsTrigger
                                        value="overview"
                                        className="h-full px-6 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                    >
                                        <List className="w-4 h-4 me-2" />
                                        {language === 'ar' ? 'نظرة عامة' : 'Overview'}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="plans"
                                        className="h-full px-6 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                    >
                                        <LayoutGrid className="w-4 h-4 me-2" />
                                        {language === 'ar' ? 'توافر الباقات' : 'Plan Availability'}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="features"
                                        className="h-full px-6 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                    >
                                        <Settings className="w-4 h-4 me-2" />
                                        {language === 'ar' ? 'الميزات والخصائص' : 'Features'}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1 p-6">

                                {/* Overview Tab */}
                                <TabsContent value="overview" className="mt-0 space-y-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                                        <h3 className="text-lg font-bold mb-4 font-cairo">
                                            {language === 'ar' ? 'معلومات الموديول' : 'Module Information'}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-sm text-gray-500 block mb-1">Code</span>
                                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-sm text-pink-600 font-mono">
                                                    {module.code}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500 block mb-1">Category</span>
                                                <Badge variant="outline">{module.category}</Badge>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500 block mb-1">Status</span>
                                                <Badge variant={module.is_active ? 'default' : 'secondary'}>
                                                    {module.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500 block mb-1">Type</span>
                                                <Badge variant={module.is_core ? 'destructive' : 'outline'}>
                                                    {module.is_core ? 'Core Module' : 'Add-on'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Plans Tab */}
                                <TabsContent value="plans" className="mt-0">
                                    <div className="grid gap-4">
                                        {module.plans_availability.map((plan) => (
                                            <div
                                                key={plan.plan_code}
                                                className={`flex items-center justify-between p-4 rounded-xl border ${plan.is_included
                                                        ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                                                        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${plan.is_included ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {plan.is_included ? <Check className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-erp-navy dark:text-white">
                                                            {getLocalizedField(plan, 'plan_name', language)}
                                                        </h4>
                                                        <p className="text-sm text-gray-500">
                                                            {plan.plan_code.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={plan.is_included ? 'default' : 'secondary'}>
                                                    {plan.is_included
                                                        ? (language === 'ar' ? 'متاح' : 'Available')
                                                        : (language === 'ar' ? 'مقفل' : 'Locked')}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* Features Tab */}
                                <TabsContent value="features" className="mt-0">
                                    {loadingFeatures ? (
                                        <div className="text-center py-10 text-gray-500">Loading features...</div>
                                    ) : features.length > 0 ? (
                                        <div className="space-y-4">
                                            {features.map((feature) => (
                                                <div key={feature.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                                                {getLocalizedField(feature, 'feature_name', language)}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">
                                                                {getLocalizedField(feature, 'description', language)}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-500">
                                                            {feature.feature_code}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300">
                                            <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">
                                                {language === 'ar' ? 'لا توجد ميزات معرفة لهذا الموديول' : 'No features defined for this module'}
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                            </ScrollArea>
                        </Tabs>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
