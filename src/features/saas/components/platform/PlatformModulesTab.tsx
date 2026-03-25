/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Platform Modules Tab — Enable/Disable Modules per Platform
 * ════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Lock,
    Save,
    Boxes,
    Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface PlatformModulesTabProps {
    platformId: string;
    platformCode: string;
    defaultModules: string[];
    allModules: any[];
    onModulesUpdate: (modules: string[]) => void;
}

export default function PlatformModulesTab({
    platformId,
    platformCode,
    defaultModules,
    allModules,
    onModulesUpdate,
}: PlatformModulesTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [enabledModules, setEnabledModules] = useState<string[]>(defaultModules);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    const hasChanges = JSON.stringify([...enabledModules].sort()) !== JSON.stringify([...defaultModules].sort());

    // Toggle module
    const toggleModule = (moduleCode: string, isCore: boolean) => {
        if (isCore) return; // Can't disable core modules
        setEnabledModules(prev =>
            prev.includes(moduleCode)
                ? prev.filter(m => m !== moduleCode)
                : [...prev, moduleCode]
        );
    };

    // Save to DB
    const saveModules = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('saas_products')
                .update({ default_modules: enabledModules, updated_at: new Date().toISOString() })
                .eq('id', platformId);

            if (error) throw error;

            toast.success(isAr ? 'تم حفظ الموديولات بنجاح' : 'Modules saved successfully');
            onModulesUpdate(enabledModules);
        } catch (err: any) {
            console.error('Error saving modules:', err);
            toast.error(err.message || (isAr ? 'خطأ في الحفظ' : 'Error saving'));
        } finally {
            setSaving(false);
        }
    };

    // Filter modules
    const filteredModules = allModules.filter(m => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            m.module_code.toLowerCase().includes(q) ||
            (m.name_ar || '').includes(search) ||
            (m.name_en || '').toLowerCase().includes(q)
        );
    });

    // Group: Core first, then enabled, then available
    const coreModules = filteredModules.filter(m => m.is_core);
    const enabledNonCore = filteredModules.filter(m => !m.is_core && enabledModules.includes(m.module_code));
    const availableModules = filteredModules.filter(m => !m.is_core && !enabledModules.includes(m.module_code));

    const ModuleRow = ({ mod, index }: { mod: any; index: number }) => {
        const isEnabled = enabledModules.includes(mod.module_code);
        const isCore = mod.is_core;

        return (
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
            >
                <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    isCore
                        ? "bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30"
                        : isEnabled
                            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30"
                            : "bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold",
                            isCore
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : isEnabled
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                        )}>
                            <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {isAr ? mod.name_ar : mod.name_en}
                                </span>
                                {isCore && (
                                    <Badge className="text-[9px] px-1.5 bg-blue-100 text-blue-700 border-blue-200 gap-0.5">
                                        <Lock className="w-2.5 h-2.5" />
                                        {isAr ? 'أساسي' : 'Core'}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono">{mod.module_code}</span>
                        </div>
                    </div>

                    <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleModule(mod.module_code, isCore)}
                        disabled={isCore}
                        className={cn(isCore && "opacity-60")}
                    />
                </div>
            </motion.div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header with search and save */}
            <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={isAr ? 'بحث الموديولات...' : 'Search modules...'}
                        className="ps-9 h-9 text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                        {enabledModules.length}/{allModules.length} {isAr ? 'مفعّل' : 'enabled'}
                    </Badge>
                    {hasChanges && (
                        <Button
                            size="sm"
                            onClick={saveModules}
                            disabled={saving}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Core Modules */}
            {coreModules.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-900/30">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Lock className="w-3.5 h-3.5 text-blue-600" />
                            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                {isAr ? 'الموديولات الأساسية (لا يمكن إلغاؤها)' : 'Core Modules (Cannot be disabled)'}
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {coreModules.map((mod, i) => (
                                <ModuleRow key={mod.module_code} mod={mod} index={i} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Enabled Modules */}
            {enabledNonCore.length > 0 && (
                <Card className="border-emerald-200 dark:border-emerald-900/30">
                    <CardContent className="p-4 space-y-2">
                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                            {isAr ? `الموديولات المفعّلة (${enabledNonCore.length})` : `Enabled Modules (${enabledNonCore.length})`}
                        </h4>
                        <div className="space-y-2">
                            {enabledNonCore.map((mod, i) => (
                                <ModuleRow key={mod.module_code} mod={mod} index={i} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Available Modules */}
            {availableModules.length > 0 && (
                <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {isAr ? `الموديولات المتاحة (${availableModules.length})` : `Available Modules (${availableModules.length})`}
                        </h4>
                        <div className="space-y-2">
                            {availableModules.map((mod, i) => (
                                <ModuleRow key={mod.module_code} mod={mod} index={i} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
