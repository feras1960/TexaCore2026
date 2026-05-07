/**
 * ════════════════════════════════════════════════════════════════
 * 💰 Platform Plans Tab — View & Edit Plans per Platform
 * ════════════════════════════════════════════════════════════════
 * 
 * Features drill-down navigation:
 * Plans List → Plan Detail (with sub-tabs: General, Limits, Modules)
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Package,
    Users,
    Star,
    Boxes,
    Building2,
    Warehouse,
    FileText,
    HardDrive,
    Crown,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    ArrowLeft,
    Save,
    Lock,
    Settings,
    Image as ImageIcon,
    Database,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PlatformPlansTabProps {
    plans: any[];
    allModules: any[];
    platformName: string;
    onPlansUpdate?: () => void;
}

// ─── Sub-tab definition for plan detail ──────────────────────
type PlanSubTab = 'general' | 'limits' | 'modules';

const PLAN_SUB_TABS: { id: PlanSubTab; labelAr: string; labelEn: string; icon: React.ElementType }[] = [
    { id: 'general', labelAr: 'عام', labelEn: 'General', icon: Settings },
    { id: 'limits', labelAr: 'الحدود', labelEn: 'Limits', icon: Database },
    { id: 'modules', labelAr: 'الموديولات', labelEn: 'Modules', icon: Boxes },
];

export default function PlatformPlansTab({
    plans,
    allModules,
    platformName,
    onPlansUpdate,
}: PlatformPlansTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    // Drill-down state
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [planSubTab, setPlanSubTab] = useState<PlanSubTab>('general');
    const [editData, setEditData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Start editing a plan
    const openPlanDetail = (plan: any) => {
        setSelectedPlan(plan);
        const data = { ...plan };
        // Always compute daily from yearly
        const yearly = parseFloat(data.price_yearly) || 0;
        if (yearly > 0) data.price_daily = Math.round((yearly / 365) * 100) / 100;
        setEditData(data);
        setPlanSubTab('general');
    };

    // Go back to list
    const goBackToList = () => {
        setSelectedPlan(null);
        setEditData(null);
    };

    // Convert Arabic/Persian numerals to Latin
    const normalizeNumber = (val: string): string => {
        return val
            .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    };

    // Update edit field (with Arabic numeral support)
    const updateField = (field: string, value: any) => {
        const normalized = typeof value === 'string' ? normalizeNumber(value) : value;
        setEditData((prev: any) => {
            const updated = { ...prev, [field]: normalized };
            // Auto-calculate daily from yearly
            if (field === 'price_yearly') {
                const yearly = parseFloat(normalized) || 0;
                if (yearly > 0) updated.price_daily = Math.round((yearly / 365) * 100) / 100;
            }
            if (field === 'price_monthly') {
                // If yearly exists, recalc daily too
                const yearly = parseFloat(updated.price_yearly) || 0;
                if (yearly > 0) updated.price_daily = Math.round((yearly / 365) * 100) / 100;
            }
            return updated;
        });
    };

    // Format value for input (remove leading zero problem)
    const inputVal = (v: any) => (v === 0 || v === '0' || !v) ? '' : v;

    // Toggle module in plan
    const togglePlanModule = (moduleCode: string) => {
        const current = editData.included_modules || [];
        const updated = current.includes(moduleCode)
            ? current.filter((m: string) => m !== moduleCode)
            : [...current, moduleCode];
        updateField('included_modules', updated);
    };

    // Check if there are changes
    const hasChanges = selectedPlan && editData && JSON.stringify(selectedPlan) !== JSON.stringify(editData);

    // Save changes
    const savePlanChanges = async () => {
        if (!editData) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('subscription_plans')
                .update({
                    name_ar: editData.name_ar,
                    name_en: editData.name_en,
                    description: editData.description,
                    price_monthly: parseFloat(editData.price_monthly) || 0,
                    price_yearly: parseFloat(editData.price_yearly) || 0,
                    price_daily: parseFloat(editData.price_daily) || 0,
                    original_price_monthly: parseFloat(editData.original_price_monthly) || 0,
                    max_users: parseInt(editData.max_users) || -1,
                    max_companies: parseInt(editData.max_companies) || -1,
                    max_branches: parseInt(editData.max_branches) || -1,
                    max_warehouses: parseInt(editData.max_warehouses) || -1,
                    max_products: parseInt(editData.max_products) || -1,
                    max_invoices_monthly: parseInt(editData.max_invoices_monthly) || -1,
                    max_customers: parseInt(editData.max_customers) || -1,
                    max_documents: parseInt(editData.max_documents) || -1,
                    max_images: parseInt(editData.max_images) || -1,
                    max_records: parseInt(editData.max_records) || -1,
                    storage_gb: parseInt(editData.storage_gb) || 0,
                    trial_days: parseInt(editData.trial_days) || 0,
                    included_modules: editData.included_modules,
                    is_popular: editData.is_popular,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', editData.id);

            if (error) throw error;

            // ═══ Sync tenant_modules for all subscribers on this plan ═══
            const newModules: string[] = editData.included_modules || [];
            // Always include core modules
            const coreModules = ['dashboard', 'core', 'users', 'companies', 'warehouse', 'settings', 'system_config'];
            const allSyncModules = [...new Set([...coreModules, ...newModules])];

            const { data: subscriptions } = await supabase
                .from('tenant_subscriptions')
                .select('tenant_id')
                .eq('plan_id', editData.id)
                .eq('status', 'active');

            if (subscriptions && subscriptions.length > 0) {
                for (const sub of subscriptions) {
                    // Deactivate modules NOT in the new plan (excluding core)
                    await supabase
                        .from('tenant_modules')
                        .update({ is_active: false })
                        .eq('tenant_id', sub.tenant_id)
                        .not('module_code', 'in', `(${allSyncModules.join(',')})`);

                    // Activate/insert modules IN the new plan + core
                    for (const mod of allSyncModules) {
                        await supabase
                            .from('tenant_modules')
                            .upsert(
                                { tenant_id: sub.tenant_id, module_code: mod, is_active: true },
                                { onConflict: 'tenant_id,module_code' }
                            );
                    }
                }
                console.log(`[Plans] Synced ${allSyncModules.length} modules for ${subscriptions.length} subscriber(s)`);
            }

            toast.success(isAr ? 'تم حفظ الباقة ومزامنة المشتركين' : 'Plan saved & subscribers synced');
            setSelectedPlan({ ...editData });
            onPlansUpdate?.();
        } catch (err: any) {
            console.error('Error saving plan:', err);
            toast.error(err.message || (isAr ? 'خطأ في الحفظ' : 'Error saving'));
        } finally {
            setSaving(false);
        }
    };

    // Get module display name
    const getModuleName = (code: string) => {
        const mod = allModules.find(m => m.module_code === code);
        return mod ? (isAr ? mod.name_ar : mod.name_en) : code;
    };

    const formatLimit = (val: number | null) => {
        if (!val || val <= 0) return isAr ? 'غير محدود' : 'Unlimited';
        return val.toLocaleString();
    };

    // ═══════════════════════════════════════════════════════════
    // PLAN DETAIL VIEW
    // ═══════════════════════════════════════════════════════════
    if (selectedPlan && editData) {
        return (
            <div className="space-y-4">
                {/* Breadcrumb + Back */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <Button variant="ghost" size="sm" onClick={goBackToList} className="gap-1 text-gray-500 hover:text-gray-900">
                            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            {isAr ? 'الباقات' : 'Plans'}
                        </Button>
                        <span className="text-gray-300">/</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {isAr ? editData.name_ar : editData.name_en || editData.name_ar}
                        </span>
                    </div>
                    {hasChanges && (
                        <Button
                            size="sm"
                            onClick={savePlanChanges}
                            disabled={saving}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save')}
                        </Button>
                    )}
                </div>

                {/* Plan Sub-tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-0.5">
                        {PLAN_SUB_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setPlanSubTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2",
                                    planSubTab === tab.id
                                        ? "border-purple-600 text-purple-700 dark:text-purple-400"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {isAr ? tab.labelAr : tab.labelEn}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Plan Sub-tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={planSubTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* ─── General Tab ──────────────────────────────── */}
                        {planSubTab === 'general' && (
                            <div className="space-y-4">
                                <Card className="border-gray-200 dark:border-gray-700">
                                    <CardContent className="p-4 space-y-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {isAr ? 'معلومات الباقة' : 'Plan Info'}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                                                <Input
                                                    value={editData.name_ar || ''}
                                                    onChange={e => updateField('name_ar', e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                                                <Input
                                                    value={editData.name_en || ''}
                                                    onChange={e => updateField('name_en', e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">{isAr ? 'الكود' : 'Code'}</Label>
                                            <Input
                                                value={editData.code || ''}
                                                disabled
                                                className="h-9 text-sm font-mono bg-gray-50 dark:bg-gray-800"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                                            <Textarea
                                                value={editData.description || ''}
                                                onChange={e => updateField('description', e.target.value)}
                                                rows={3}
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                                            <div className="flex items-center gap-2">
                                                <Crown className="w-4 h-4 text-purple-600" />
                                                <span className="text-sm font-medium">{isAr ? 'باقة شائعة (مميزة)' : 'Popular Plan (Featured)'}</span>
                                            </div>
                                            <Switch
                                                checked={editData.is_popular || false}
                                                onCheckedChange={v => updateField('is_popular', v)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Pricing */}
                                <Card className="border-gray-200 dark:border-gray-700">
                                    <CardContent className="p-4 space-y-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {isAr ? 'التسعير' : 'Pricing'}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">{isAr ? 'السعر الشهري ($)' : 'Monthly Price ($)'}</Label>
                                                <Input
                                                    type="number"
                                                    value={inputVal(editData.price_monthly)}
                                                    placeholder="0"
                                                    onChange={e => updateField('price_monthly', e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-red-500 flex items-center gap-1">
                                                    <span className="line-through">{isAr ? 'السعر الأصلي ($)' : 'Original Price ($)'}</span>
                                                    <span className="text-[9px] text-gray-400">{isAr ? '(المشخوط)' : '(strikethrough)'}</span>
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={inputVal(editData.original_price_monthly)}
                                                    placeholder="0"
                                                    onChange={e => updateField('original_price_monthly', e.target.value)}
                                                    className="h-9 text-sm border-red-200 dark:border-red-800"
                                                />
                                            </div>
                                        </div>
                                        {editData.original_price_monthly > 0 && editData.price_monthly > 0 && (
                                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">
                                                <Star className="w-3.5 h-3.5" />
                                                {isAr ? 'نسبة الخصم' : 'Discount'}: {Math.round(((editData.original_price_monthly - editData.price_monthly) / editData.original_price_monthly) * 100)}%
                                                <span className="text-gray-400">|</span>
                                                <span className="line-through text-gray-400">${editData.original_price_monthly}</span>
                                                <span>→</span>
                                                <span className="font-bold">${editData.price_monthly}</span>
                                            </div>
                                        )}
                                        {/* Yearly Price — editable, auto-computed discount */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">{isAr ? 'السعر السنوي ($)' : 'Yearly Price ($)'}</Label>
                                                <Input
                                                    type="number"
                                                    value={inputVal(editData.price_yearly)}
                                                    placeholder="0"
                                                    onChange={e => updateField('price_yearly', e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-gray-400">{isAr ? 'اليومي ($) — محسوب من السنوي' : 'Daily ($) — from yearly'}</Label>
                                                <Input
                                                    type="number"
                                                    value={inputVal(editData.price_daily)}
                                                    disabled
                                                    className="h-9 text-sm bg-gray-50 dark:bg-gray-800"
                                                />
                                            </div>
                                        </div>
                                        {editData.price_monthly > 0 && editData.price_yearly > 0 && (() => {
                                            const fullYearly = editData.price_monthly * 12;
                                            const savings = fullYearly - editData.price_yearly;
                                            const discountPct = Math.round((savings / fullYearly) * 100);
                                            const bonusMonths = Math.round(savings / editData.price_monthly * 10) / 10;
                                            return (
                                                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
                                                    <div className="grid grid-cols-4 gap-2 text-center">
                                                        <div className="p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                            <div className="text-[9px] text-gray-400">{isAr ? 'شهري × 12' : 'Monthly × 12'}</div>
                                                            <div className="text-xs text-gray-500 line-through">${fullYearly}</div>
                                                        </div>
                                                        <div className="p-1.5 rounded bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
                                                            <div className="text-[9px] text-emerald-600">{isAr ? 'السنوي' : 'Yearly'}</div>
                                                            <div className="text-xs font-bold text-emerald-700">${editData.price_yearly}</div>
                                                        </div>
                                                        <div className="p-1.5 rounded bg-white dark:bg-gray-900 border border-red-100 dark:border-red-800">
                                                            <div className="text-[9px] text-red-500">{isAr ? 'التوفير' : 'Savings'}</div>
                                                            <div className="text-xs font-bold text-red-600">{savings > 0 ? `$${savings}` : '$0'}</div>
                                                        </div>
                                                        <div className="p-1.5 rounded bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-800">
                                                            <div className="text-[9px] text-purple-500">{isAr ? 'بونص أشهر' : 'Bonus Months'}</div>
                                                            <div className="text-xs font-bold text-purple-700">{bonusMonths > 0 ? `${bonusMonths} 🎁` : '0'}</div>
                                                        </div>
                                                    </div>
                                                    {discountPct > 0 && (
                                                        <div className="flex items-center gap-2 text-xs text-emerald-700">
                                                            <Star className="w-3 h-3" />
                                                            {isAr
                                                                ? `الزبون يوفر ${discountPct}% عند الدفع السنوي (ما يعادل ${bonusMonths} شهر مجاناً)`
                                                                : `Customer saves ${discountPct}% with annual billing (equivalent to ${bonusMonths} free months)`}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">{isAr ? 'أيام التجربة المجانية' : 'Free Trial Days'}</Label>
                                                <Input
                                                    type="number"
                                                    value={editData.trial_days || 0}
                                                    onChange={e => updateField('trial_days', e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">{isAr ? 'العملة' : 'Currency'}</Label>
                                                <Input
                                                    value={editData.currency || 'USD'}
                                                    onChange={e => updateField('currency', e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ─── Limits Tab ──────────────────────────────── */}
                        {planSubTab === 'limits' && (
                            <Card className="border-gray-200 dark:border-gray-700">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {isAr ? 'حدود الباقة' : 'Plan Limits'}
                                        </h4>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {isAr ? '-1 = غير محدود' : '-1 = Unlimited'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {[
                                            { field: 'max_users', label: isAr ? 'المستخدمين' : 'Users', icon: Users },
                                            { field: 'max_companies', label: isAr ? 'الشركات' : 'Companies', icon: Building2 },
                                            { field: 'max_branches', label: isAr ? 'الفروع' : 'Branches', icon: Building2 },
                                            { field: 'max_warehouses', label: isAr ? 'المستودعات' : 'Warehouses', icon: Warehouse },
                                            { field: 'max_products', label: isAr ? 'المنتجات' : 'Products', icon: Package },
                                            { field: 'max_invoices_monthly', label: isAr ? 'الفواتير/شهر' : 'Invoices/mo', icon: FileText },
                                            { field: 'max_customers', label: isAr ? 'الزبائن' : 'Customers', icon: Users },
                                            { field: 'max_documents', label: isAr ? 'المستندات' : 'Documents', icon: FileText },
                                            { field: 'max_images', label: isAr ? 'الصور' : 'Images', icon: ImageIcon },
                                            { field: 'max_records', label: isAr ? 'السجلات' : 'Records', icon: Database },
                                            { field: 'storage_gb', label: isAr ? 'التخزين (GB)' : 'Storage (GB)', icon: HardDrive },
                                        ].map(limit => (
                                            <div key={limit.field} className="space-y-1.5">
                                                <Label className="text-xs flex items-center gap-1.5">
                                                    <limit.icon className="w-3 h-3 text-gray-400" />
                                                    {limit.label}
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={editData[limit.field] ?? -1}
                                                    onChange={e => updateField(limit.field, e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                                <div className="text-[9px] text-gray-400">
                                                    {(editData[limit.field] ?? -1) <= 0
                                                        ? (isAr ? '✓ غير محدود' : '✓ Unlimited')
                                                        : `${editData[limit.field]} ${limit.label}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ─── Modules Tab ──────────────────────────────── */}
                        {planSubTab === 'modules' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {isAr
                                            ? `الموديولات المتضمنة في الباقة (${(editData.included_modules || []).length}/${allModules.length})`
                                            : `Modules Included in Plan (${(editData.included_modules || []).length}/${allModules.length})`}
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    {allModules.map((mod, i) => {
                                        const isIncluded = mod.is_core || (editData.included_modules || []).includes(mod.module_code);
                                        return (
                                            <div
                                                key={mod.module_code}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-lg transition-colors border",
                                                    mod.is_core
                                                        ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                                        : isIncluded
                                                            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
                                                            : "bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Boxes className={cn(
                                                        "w-4 h-4",
                                                        mod.is_core ? "text-blue-600" : isIncluded ? "text-emerald-600" : "text-gray-400"
                                                    )} />
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {isAr ? mod.name_ar : mod.name_en}
                                                        </span>
                                                        {mod.is_core && (
                                                            <Badge className="ms-2 text-[9px] px-1.5 bg-blue-100 text-blue-700 border-blue-200 gap-0.5">
                                                                <Lock className="w-2.5 h-2.5" /> {isAr ? 'أساسي' : 'Core'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={isIncluded}
                                                    onCheckedChange={() => togglePlanModule(mod.module_code)}
                                                    disabled={mod.is_core}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // PLANS LIST VIEW
    // ═══════════════════════════════════════════════════════════
    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {isAr ? 'لا توجد باقات' : 'No Plans'}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">
                    {isAr
                        ? `لم يتم إنشاء باقات لمنصة ${platformName} بعد`
                        : `No plans have been created for ${platformName} yet`}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="text-sm text-gray-500 mb-2">
                {plans.length} {isAr ? 'باقات مفعّلة — اضغط على أي باقة لتعديلها' : 'active plans — click any plan to edit'}
            </div>

            {plans.map((plan, index) => {
                const modules = plan.included_modules || [];

                return (
                    <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card
                            className={cn(
                                "overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
                                plan.is_popular
                                    ? "border-purple-300 dark:border-purple-700 ring-1 ring-purple-200 dark:ring-purple-800"
                                    : "border-gray-200 dark:border-gray-700"
                            )}
                            onClick={() => openPlanDetail(plan)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            plan.is_popular
                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                        )}>
                                            {plan.is_popular ? <Crown className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {isAr ? plan.name_ar : plan.name_en || plan.name_ar}
                                                </h3>
                                                {plan.is_popular && (
                                                    <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 gap-0.5">
                                                        <Star className="w-2.5 h-2.5" /> {isAr ? 'شائع' : 'Popular'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                                                <span className="font-mono">{plan.code}</span>
                                                <span className="flex items-center gap-1"><Boxes className="w-3 h-3" /> {modules.length} {isAr ? 'موديول' : 'modules'}</span>
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {formatLimit(plan.max_users)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-end">
                                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                ${plan.price_monthly || 0}
                                                <span className="text-[10px] text-gray-400 font-normal ms-0.5">/{isAr ? 'شهر' : 'mo'}</span>
                                            </div>
                                            {plan.original_price_monthly > 0 && (
                                                <div className="text-[10px] text-red-400 line-through">
                                                    ${plan.original_price_monthly}
                                                </div>
                                            )}
                                            {plan.price_yearly > 0 && (
                                                <div className="text-[10px] text-gray-400">
                                                    ${plan.price_yearly}/{isAr ? 'سنة' : 'yr'}
                                                </div>
                                            )}
                                        </div>
                                        {isAr
                                            ? <ChevronLeft className="w-4 h-4 text-gray-400" />
                                            : <ChevronRight className="w-4 h-4 text-gray-400" />
                                        }
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
