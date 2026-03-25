/**
 * ════════════════════════════════════════════════════════════════
 * 🏗️ Platforms Tab — Platform-Centric SaaS Management
 * ════════════════════════════════════════════════════════════════
 * 
 * Displays platform cards (saas_products) with real-time stats.
 * Each card shows: name, modules count, plans count, subscribers count.
 * Clicking a card opens PlatformDetailSheet with sub-tabs.
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    Boxes,
    Package,
    Users,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Settings,
    Globe,
    Layers,
    Factory,
    Heart,
    Banknote,
    Monitor,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PlatformDetailSheet from './components/PlatformDetailSheet';

// ─── Types ───────────────────────────────────────────────────
interface PlatformData {
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
    // Stats (computed)
    plans_count: number;
    subscribers_count: number;
    active_subscribers: number;
    modules_count: number;
}

// ─── Platform Icons & Colors ─────────────────────────────────
const PLATFORM_META: Record<string, { icon: React.ElementType; gradient: string; description_ar: string; description_en: string }> = {
    texacore: {
        icon: Layers,
        gradient: 'from-purple-500 to-indigo-600',
        description_ar: 'إدارة الأقمشة والنسيج',
        description_en: 'Fabric & Textile Management',
    },
    nexacore: {
        icon: Monitor,
        gradient: 'from-blue-500 to-cyan-600',
        description_ar: 'نظام ERP شامل',
        description_en: 'Comprehensive ERP System',
    },
    fincore: {
        icon: Banknote,
        gradient: 'from-emerald-500 to-teal-600',
        description_ar: 'الصرافة والمالية',
        description_en: 'Exchange & Finance',
    },
    medcore: {
        icon: Heart,
        gradient: 'from-red-500 to-rose-600',
        description_ar: 'المشافي والعيادات',
        description_en: 'Healthcare & Clinics',
    },
    inducore: {
        icon: Factory,
        gradient: 'from-amber-500 to-orange-600',
        description_ar: 'التصنيع والإنتاج',
        description_en: 'Manufacturing & Production',
    },
    'erp-saas': {
        icon: Globe,
        gradient: 'from-gray-500 to-slate-600',
        description_ar: 'نظام ERP عام',
        description_en: 'General ERP System',
    },
};

// ─── Main Component ──────────────────────────────────────────
export default function PlatformsTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [platforms, setPlatforms] = useState<PlatformData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformData | null>(null);

    // ─── Load Platforms with Stats (Parallel) ─────────────────
    const loadPlatforms = async () => {
        setLoading(true);
        try {
            // ⚡ تحميل متوازي — 3 استعلامات في نفس الوقت
            const [productsRes, plansRes, tenantsRes] = await Promise.all([
                supabase
                    .from('saas_products')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true }),
                supabase
                    .from('subscription_plans')
                    .select('product_id, is_active')
                    .eq('is_active', true),
                supabase
                    .from('tenants')
                    .select('product_id, status'),
            ]);

            if (productsRes.error) throw productsRes.error;

            const products = productsRes.data || [];
            const plansCounts = plansRes.data || [];
            const tenantsCounts = tenantsRes.data || [];

            // Build platform data with stats
            const platformsData: PlatformData[] = products.map(p => {
                const plans = plansCounts.filter(pl => pl.product_id === p.id);
                const tenants = tenantsCounts.filter(t => t.product_id === p.id);
                const activeTenants = tenants.filter(t => t.status === 'active');

                return {
                    id: p.id,
                    code: p.code,
                    name: p.name,
                    name_ar: p.name_ar || p.name,
                    description: p.description,
                    domain: p.domain,
                    logo_url: p.logo_url,
                    primary_color: p.primary_color || '#6366F1',
                    secondary_color: p.secondary_color,
                    default_modules: p.default_modules || [],
                    is_active: p.is_active,
                    display_order: p.display_order || 0,
                    plans_count: plans.length,
                    subscribers_count: tenants.length,
                    active_subscribers: activeTenants.length,
                    modules_count: (p.default_modules || []).length,
                };
            });

            setPlatforms(platformsData);
        } catch (err) {
            console.error('Error loading platforms:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlatforms();
    }, []);

    // ─── Platform Card ──────────────────────────────────────────
    const PlatformCard = ({ platform, index }: { platform: PlatformData; index: number }) => {
        const meta = PLATFORM_META[platform.code] || PLATFORM_META['erp-saas'];
        const Icon = meta.icon;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
            >
                <Card
                    className={cn(
                        "group relative overflow-hidden cursor-pointer transition-all duration-300",
                        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1",
                        "border-gray-200 dark:border-gray-700"
                    )}
                    onClick={() => setSelectedPlatform(platform)}
                >
                    {/* Gradient top bar */}
                    <div className={cn("h-1.5 bg-gradient-to-r", meta.gradient)} />

                    <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                                    meta.gradient
                                )}>
                                    <Icon className="w-5.5 h-5.5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        {platform.name}
                                    </h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        {isAr ? meta.description_ar : meta.description_en}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={platform.is_active ? "default" : "secondary"}
                                className={cn(
                                    "text-[10px] px-2",
                                    platform.is_active
                                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-gray-100 text-gray-500"
                                )}
                            >
                                {platform.is_active
                                    ? (isAr ? 'مفعّل' : 'Active')
                                    : (isAr ? 'معطّل' : 'Disabled')}
                            </Badge>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Package className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {platform.plans_count}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'باقات' : 'Plans'}
                                </div>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Boxes className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {platform.modules_count}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'موديولات' : 'Modules'}
                                </div>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {platform.subscribers_count}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'مشتركين' : 'Subscribers'}
                                </div>
                            </div>
                        </div>

                        {/* Domain */}
                        {platform.domain && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                <Globe className="w-3 h-3" />
                                <span>{platform.domain}</span>
                            </div>
                        )}

                        {/* Action Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-xs group-hover:bg-gray-50 dark:group-hover:bg-gray-800 transition-colors"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            {isAr ? 'إدارة المنصة' : 'Manage Platform'}
                            {isAr
                                ? <ChevronLeft className="w-3.5 h-3.5 ms-auto" />
                                : <ChevronRight className="w-3.5 h-3.5 ms-auto" />
                            }
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isAr ? 'إدارة المنصات' : 'Platform Management'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isAr
                            ? `${platforms.length} منصات مفعّلة — اختر منصة لإدارة الموديولات والباقات والمشتركين`
                            : `${platforms.length} active platforms — Select a platform to manage modules, plans, and subscribers`}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPlatforms}
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    {isAr ? 'تحديث' : 'Refresh'}
                </Button>
            </div>

            {/* Platform Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="overflow-hidden">
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700" />
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-11 h-11 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3].map(j => (
                                        <Skeleton key={j} className="h-16 rounded-lg" />
                                    ))}
                                </div>
                                <Skeleton className="h-9 w-full rounded-lg" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {platforms.map((platform, index) => (
                        <PlatformCard key={platform.id} platform={platform} index={index} />
                    ))}
                </div>
            )}

            {/* Platform Detail Sheet */}
            <PlatformDetailSheet
                platform={selectedPlatform}
                open={!!selectedPlatform}
                onClose={() => setSelectedPlatform(null)}
                onDataChange={loadPlatforms}
                gradient={PLATFORM_META[selectedPlatform?.code || '']?.gradient || 'from-gray-500 to-slate-600'}
                icon={PLATFORM_META[selectedPlatform?.code || '']?.icon || Globe}
            />
        </div>
    );
}
