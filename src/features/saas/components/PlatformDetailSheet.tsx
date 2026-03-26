/**
 * ════════════════════════════════════════════════════════════════
 * 🏗️ Platform Detail Sheet — Full Platform Management
 * ════════════════════════════════════════════════════════════════
 * 
 * Opens as a large sheet when clicking a platform card.
 * Contains 9 sub-tabs for complete platform management.
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    LayoutDashboard,
    Users,
    Boxes,
    Package,
    CreditCard,
    Gift,

    Settings,
    Globe,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Building2,
    Layers,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import PlatformModulesTab from './platform/PlatformModulesTab';
import PlatformPlansTab from './platform/PlatformPlansTab';
import PlatformWebsiteTab from './platform/PlatformWebsiteTab';
import PlatformSettingsTab from './platform/PlatformSettingsTab';
import PlatformSubscribersTab from './platform/PlatformSubscribersTab';
import PlatformPaymentsTab from './platform/PlatformPaymentsTab';
import PlatformMarketingTab from './platform/PlatformMarketingTab';

// ─── Types ───────────────────────────────────────────────────
export interface PlatformData {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    description: string | null;
    domain: string | null;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string | null;
    default_modules: string[];
    is_active: boolean;
    display_order: number;
    plans_count: number;
    subscribers_count: number;
    active_subscribers: number;
    modules_count: number;
}

interface PlatformDetailSheetProps {
    platform: PlatformData | null;
    open: boolean;
    onClose: () => void;
    onDataChange?: () => void;
    gradient: string;
    icon: React.ElementType;
}

// ─── Sub-tab definition ──────────────────────────────────────
interface SubTab {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    ready: boolean; // Whether the tab content is implemented
}

const SUB_TABS: SubTab[] = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: LayoutDashboard, ready: true },
    { id: 'modules', labelAr: 'الموديولات', labelEn: 'Modules', icon: Boxes, ready: true },
    { id: 'plans', labelAr: 'الباقات', labelEn: 'Plans', icon: Package, ready: true },
    { id: 'subscribers', labelAr: 'المشتركون', labelEn: 'Subscribers', icon: Users, ready: true },
    { id: 'payments', labelAr: 'المدفوعات', labelEn: 'Payments', icon: CreditCard, ready: true },
    { id: 'marketing', labelAr: 'التسويق', labelEn: 'Marketing', icon: Gift, ready: true },
    { id: 'website', labelAr: 'الموقع', labelEn: 'Website', icon: Globe, ready: true },
    { id: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: Settings, ready: true },
];

// ─── Main Component ──────────────────────────────────────────
export default function PlatformDetailSheet({
    platform,
    open,
    onClose,
    onDataChange,
    gradient,
    icon: PlatformIcon,
}: PlatformDetailSheetProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [activeTab, setActiveTab] = useState('overview');

    // ─── Platform detailed stats ────────────────────────────────
    const [plans, setPlans] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (platform && open) {
            setActiveTab('overview');
            loadPlatformDetails();
        }
    }, [platform, open]);

    const loadPlatformDetails = async () => {
        if (!platform) return;
        setLoading(true);
        try {
            // Load plans for this platform
            const { data: plansData } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('product_id', platform.id)
                .eq('is_active', true)
                .order('display_order');

            // Load tenants for this platform
            const { data: tenantsData } = await supabase
                .from('tenants')
                .select('id, name, status, created_at')
                .eq('product_id', platform.id);

            // Load all modules to match with default_modules
            const { data: modulesData } = await supabase
                .from('modules')
                .select('module_code, name_ar, name_en, icon, color, is_core, is_active')
                .eq('is_active', true)
                .order('display_order');

            setPlans(plansData || []);
            setTenants(tenantsData || []);
            setModules(modulesData || []);
        } catch (err) {
            console.error('Error loading platform details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!platform) return null;

    // Filter modules that belong to this platform
    const platformModules = modules.filter(m =>
        platform.default_modules.includes(m.module_code)
    );
    const availableModules = modules.filter(m =>
        !platform.default_modules.includes(m.module_code)
    );

    // ─── Overview Tab Content ───────────────────────────────────
    const renderOverviewTab = () => (
        <div className="space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    {
                        label: isAr ? 'المشتركون' : 'Subscribers',
                        value: tenants.length,
                        subLabel: `${tenants.filter(t => t.status === 'active').length} ${isAr ? 'نشط' : 'active'}`,
                        icon: Users,
                        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
                    },
                    {
                        label: isAr ? 'الباقات' : 'Plans',
                        value: plans.length,
                        subLabel: isAr ? 'باقات مفعّلة' : 'active plans',
                        icon: Package,
                        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
                    },
                    {
                        label: isAr ? 'الموديولات' : 'Modules',
                        value: platformModules.length,
                        subLabel: `${modules.length} ${isAr ? 'إجمالي متاح' : 'total available'}`,
                        icon: Boxes,
                        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
                    },
                    {
                        label: isAr ? 'الإيرادات' : 'Revenue',
                        value: '$0',
                        subLabel: isAr ? 'هذا الشهر' : 'this month',
                        icon: TrendingUp,
                        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
                    },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card className="border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color)}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                                        <div className="text-[11px] text-gray-500">{stat.label}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-2">{stat.subLabel}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Platform Info */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {isAr ? 'معلومات المنصة' : 'Platform Info'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500">{isAr ? 'الكود' : 'Code'}:</span>
                            <span className="ms-2 font-mono text-gray-900 dark:text-white">{platform.code}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">{isAr ? 'الحالة' : 'Status'}:</span>
                            <Badge className="ms-2 text-[10px] bg-green-100 text-green-700 border-green-200">
                                {platform.is_active ? (isAr ? 'مفعّل' : 'Active') : (isAr ? 'معطّل' : 'Disabled')}
                            </Badge>
                        </div>
                        <div>
                            <span className="text-gray-500">{isAr ? 'الدومين' : 'Domain'}:</span>
                            <span className="ms-2 text-gray-900 dark:text-white">{platform.domain || '—'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">{isAr ? 'اللون الأساسي' : 'Primary Color'}:</span>
                            <span className="ms-2 inline-flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: platform.primary_color }} />
                                <span className="text-gray-900 dark:text-white font-mono text-xs">{platform.primary_color}</span>
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Modules */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isAr ? 'الموديولات المفعّلة' : 'Active Modules'}
                        </h4>
                        <Badge variant="secondary" className="text-[10px]">
                            {platformModules.length}/{modules.length}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {platformModules.map(m => (
                            <Badge
                                key={m.module_code}
                                variant="outline"
                                className={cn(
                                    "text-xs gap-1.5 py-1 px-2.5",
                                    m.is_core
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                )}
                            >
                                {isAr ? m.name_ar : m.name_en}
                                {m.is_core && <span className="text-[9px] opacity-60">⚙️</span>}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Plans Summary */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {isAr ? 'الباقات' : 'Plans'}
                    </h4>
                    <div className="space-y-2">
                        {plans.map(plan => (
                            <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {isAr ? plan.name_ar : plan.name_en || plan.name_ar}
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                        {(plan.included_modules || []).length} {isAr ? 'موديولات' : 'modules'}
                                        {plan.max_users ? ` • ${plan.max_users} ${isAr ? 'مستخدم' : 'users'}` : ''}
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                        ${plan.price_monthly || 0}<span className="text-[10px] text-gray-400 font-normal">/{isAr ? 'شهر' : 'mo'}</span>
                                    </div>
                                    {plan.price_yearly && (
                                        <div className="text-[10px] text-gray-400">
                                            ${plan.price_yearly}/{isAr ? 'سنة' : 'yr'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {plans.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-4">
                                {isAr ? 'لا توجد باقات' : 'No plans yet'}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Subscribers */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {isAr ? 'المشتركون' : 'Subscribers'}
                    </h4>
                    <div className="space-y-2">
                        {tenants.map(tenant => (
                            <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{tenant.name}</div>
                                        <div className="text-[10px] text-gray-400">
                                            {new Date(tenant.created_at).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                                        </div>
                                    </div>
                                </div>
                                <Badge className={cn(
                                    "text-[10px]",
                                    tenant.status === 'active'
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : "bg-gray-100 text-gray-500"
                                )}>
                                    {tenant.status === 'active' ? (isAr ? 'نشط' : 'Active') : tenant.status}
                                </Badge>
                            </div>
                        ))}
                        {tenants.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-4">
                                {isAr ? 'لا يوجد مشتركون بعد' : 'No subscribers yet'}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // ─── Placeholder Tab ────────────────────────────────────────
    const renderPlaceholderTab = (tab: SubTab) => (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-4", gradient)}>
                <tab.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {isAr ? tab.labelAr : tab.labelEn}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
                {isAr
                    ? `سيتم تنفيذ تبويب "${tab.labelAr}" في المرحلة القادمة`
                    : `"${tab.labelEn}" tab will be implemented in the next phase`}
            </p>
            <Badge variant="secondary" className="mt-3 text-[10px]">
                🔜 {isAr ? 'قريباً' : 'Coming Soon'}
            </Badge>
        </div>
    );

    // ─── Render Tab Content ─────────────────────────────────────
    const renderTabContent = () => {
        const tab = SUB_TABS.find(t => t.id === activeTab);
        if (!tab) return null;

        switch (activeTab) {
            case 'overview':
                return renderOverviewTab();
            case 'modules':
                return (
                    <PlatformModulesTab
                        platformId={platform.id}
                        platformCode={platform.code}
                        defaultModules={platform.default_modules}
                        allModules={modules}
                        onModulesUpdate={(newModules) => {
                            platform.default_modules = newModules;
                            loadPlatformDetails();
                            onDataChange?.();
                        }}
                    />
                );
            case 'plans':
                return (
                    <PlatformPlansTab
                        plans={plans}
                        allModules={modules}
                        platformName={platform.name}
                        onPlansUpdate={() => {
                            loadPlatformDetails();
                            onDataChange?.();
                        }}
                    />
                );
            case 'website':
                return (
                    <PlatformWebsiteTab
                        platform={platform}
                        plansCount={plans.length}
                        subscribersCount={tenants.length}
                        onUpdate={() => {
                            loadPlatformDetails();
                            onDataChange?.();
                        }}
                    />
                );
            case 'settings':
                return (
                    <PlatformSettingsTab
                        platform={platform}
                        onUpdate={() => {
                            loadPlatformDetails();
                            onDataChange?.();
                        }}
                    />
                );
            case 'subscribers':
                return (
                    <PlatformSubscribersTab
                        platformId={platform.id}
                        platformCode={platform.code}
                    />
                );
            case 'payments':
                return (
                    <PlatformPaymentsTab
                        platformId={platform.id}
                        platformCode={platform.code}
                    />
                );
            case 'marketing':
                return (
                    <PlatformMarketingTab
                        platformId={platform.id}
                        platformCode={platform.code}
                    />
                );
            default:
                return renderPlaceholderTab(tab);
        }
    };

    // ─── Main Render ────────────────────────────────────────────
    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent
                side={isAr ? 'left' : 'right'}
                className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:w-[65vw] max-w-[1200px] p-0 border-0 [&>button]:hidden"
            >
                {/* Header */}
                <div className={cn("bg-gradient-to-r p-5", gradient)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <PlatformIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-white">
                                    {platform.name}
                                </SheetTitle>
                                <p className="text-sm text-white/70">
                                    {isAr ? platform.name_ar : platform.name} • {platform.code}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                            {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </Button>
                    </div>

                    {/* Quick Stats in Header */}
                    <div className="flex items-center gap-4 mt-4">
                        {[
                            { label: isAr ? 'مشتركين' : 'Subscribers', value: tenants.length },
                            { label: isAr ? 'باقات' : 'Plans', value: plans.length },
                            { label: isAr ? 'موديولات' : 'Modules', value: platformModules.length },
                        ].map(s => (
                            <div key={s.label} className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                                <span className="text-lg font-bold text-white">{s.value}</span>
                                <span className="text-[10px] text-white/60 ms-1.5">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sub-tabs Bar */}
                <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <div className="flex px-2 gap-0.5 min-w-max">
                            {SUB_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all whitespace-nowrap border-b-2",
                                        activeTab === tab.id
                                            ? "border-current text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {isAr ? tab.labelAr : tab.labelEn}
                                    {!tab.ready && (
                                        <span className="text-[8px] opacity-50">🔜</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <ScrollArea className="h-[calc(100vh-220px)]">
                    <div className="p-5">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: isAr ? -10 : 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isAr ? 10 : -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderTabContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
