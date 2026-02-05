import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { saasModulesService, ModuleWithPlans } from '@/services/saas/modulesService';
import { LedgerTable, type LedgerColumn, type LedgerFilters, type LedgerStats } from '@/components/shared/tables/LedgerTable';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ModuleDetailSheet } from './components/ModuleDetailSheet';
import { cn } from '@/lib/utils';
import {
    Boxes,
    Check,
    X,
    Crown,
    Search,
    Filter,
    ShieldAlert,
    ShieldCheck,
    LucideIcon
} from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n-helpers';

// Dynamically import icons map for rendering
import * as Icons from 'lucide-react';

export default function ModulesTable() {
    const { t, language } = useLanguage();
    const [modules, setModules] = useState<ModuleWithPlans[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<ModuleWithPlans | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [filters, setFilters] = useState<LedgerFilters>({});

    // Load modules
    const loadModules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await saasModulesService.getAllWithPlans();
            setModules(data);
        } catch (err) {
            console.error('Error loading modules:', err);
            toast.error(language === 'ar' ? 'فشل تحميل الموديولات' : 'Failed to load modules');
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        loadModules();
    }, [loadModules]);

    // Statistics
    const stats: LedgerStats = useMemo(() => {
        return {
            label1: {
                title: language === 'ar' ? 'إجمالي الموديولات' : 'Total Modules',
                value: modules.length,
                color: 'blue',
            },
            label2: {
                title: language === 'ar' ? 'موديولات أساسية' : 'Core Modules',
                value: modules.filter(m => m.is_core).length,
                color: 'blue',
            },
            label3: {
                title: language === 'ar' ? 'مفعلة' : 'Active',
                value: modules.filter(m => m.is_active).length,
                color: 'green',
            },
            label4: {
                title: language === 'ar' ? 'قابلة للتعطيل' : 'Optional',
                value: modules.filter(m => !m.is_core).length,
                color: 'gray',
            },
        };
    }, [modules, language]);

    // Handle row click
    const handleRowClick = (module: ModuleWithPlans) => {
        setSelectedModule(module);
        setIsSheetOpen(true);
    };

    // Render Icon helper
    const renderIcon = (iconName: string) => {
        const Icon = (Icons as any)[iconName] || Boxes;
        return <Icon className="w-5 h-5" />;
    };

    // Columns
    const columns: LedgerColumn<ModuleWithPlans>[] = [
        {
            key: 'name',
            title: language === 'ar' ? 'الموديول' : 'Module',
            width: '25%',
            type: 'text',
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        {renderIcon(row.icon)}
                    </div>
                    <div>
                        <div className="font-bold text-erp-navy dark:text-white">
                            {getLocalizedField(row, 'name', language)}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            {row.code}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            title: language === 'ar' ? 'الفئة' : 'Category',
            width: '15%',
            type: 'text',
            sortable: true,
            render: (value) => (
                <Badge variant="outline" className="capitalize">
                    {value}
                </Badge>
            ),
        },
        {
            key: 'is_core',
            title: language === 'ar' ? 'النوع' : 'Type',
            width: '10%',
            type: 'status',
            align: 'center',
            render: (value) => (
                value ? (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200">
                        <ShieldAlert className="w-3 h-3 me-1" />
                        Core
                    </Badge>
                ) : (
                    <Badge variant="secondary">
                        Optional
                    </Badge>
                )
            ),
        },
        {
            key: 'plans_availability',
            title: language === 'ar' ? 'التوافر في الباقات' : 'Plan Availability',
            width: '30%',
            type: 'text',
            render: (value, row) => (
                <div className="flex gap-1 flex-wrap">
                    {row.plans_availability.map((plan) => (
                        <Badge
                            key={plan.plan_code}
                            variant="outline"
                            className={cn(
                                "text-[10px] px-1.5 py-0.5 border",
                                plan.is_included
                                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                    : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800/50 dark:text-gray-600 dark:border-gray-700 dashed border-dashed"
                            )}
                        >
                            {plan.is_included ? <Check className="w-3 h-3 me-1 inline" /> : <X className="w-3 h-3 me-1 inline" />}
                            {plan.plan_code.toUpperCase()}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            key: 'is_active',
            title: language === 'ar' ? 'الحالة' : 'Status',
            width: '10%',
            type: 'status',
            align: 'center',
            statusConfig: {
                true: { label: language === 'ar' ? 'نشط' : 'Active', color: 'green' },
                false: { label: language === 'ar' ? 'معطل' : 'Inactive', color: 'gray' },
            },
        },
    ];

    return (
        <>
            <LedgerTable
                data={modules}
                columns={columns}
                loading={loading}
                showStats={true}
                stats={stats}
                showFilters={true}
                filters={filters}
                onFiltersChange={setFilters}
                onRowClick={handleRowClick}
                onRefresh={loadModules}
                rowKey="code"
                emptyMessage={language === 'ar' ? 'لا توجد موديولات' : 'No modules found'}
            />

            {selectedModule && (
                <ModuleDetailSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedModule(null);
                    }}
                    module={selectedModule}
                />
            )}
        </>
    );
}
