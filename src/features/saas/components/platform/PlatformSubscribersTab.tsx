/**
 * ════════════════════════════════════════════════════════════════
 * 👥 Platform Subscribers Tab — Drill-down Management
 * ════════════════════════════════════════════════════════════════
 * List → Subscriber Detail with sub-tabs:
 *   📋 General — Info, plan, status, dates
 *   🏢 Companies — Companies under this tenant
 *   👤 Users — Users, roles, permissions
 *   📦 Modules — Custom module control per subscriber
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
    Users, Building2, Boxes, ChevronLeft, ChevronRight, Search,
    Loader2, Calendar, Mail, Globe, Shield, Crown, Package,
    UserCircle, Settings, Eye, RefreshCw,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SubscribersTabProps {
    platformId: string;
    platformCode: string;
}

const STATUS_MAP: Record<string, { labelAr: string; labelEn: string; color: string }> = {
    active: { labelAr: 'نشط', labelEn: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    trial: { labelAr: 'تجريبي', labelEn: 'Trial', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    suspended: { labelAr: 'معلّق', labelEn: 'Suspended', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    expired: { labelAr: 'منتهي', labelEn: 'Expired', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    cancelled: { labelAr: 'ملغي', labelEn: 'Cancelled', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

type SubTab = 'general' | 'companies' | 'users' | 'modules';

const SUB_TABS: { id: SubTab; labelAr: string; labelEn: string; icon: React.ElementType }[] = [
    { id: 'general', labelAr: 'عام', labelEn: 'General', icon: Settings },
    { id: 'companies', labelAr: 'الشركات', labelEn: 'Companies', icon: Building2 },
    { id: 'users', labelAr: 'المستخدمين', labelEn: 'Users', icon: Users },
    { id: 'modules', labelAr: 'الموديولات', labelEn: 'Modules', icon: Boxes },
];

export default function PlatformSubscribersTab({ platformId, platformCode }: SubscribersTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    // List state
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    // Detail state
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [subTab, setSubTab] = useState<SubTab>('general');
    const [detailLoading, setDetailLoading] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [tenantModules, setTenantModules] = useState<any[]>([]);
    const [allModules, setAllModules] = useState<any[]>([]);
    const [moduleSaving, setModuleSaving] = useState(false);

    // ─── Load subscribers list ───────────────────────────────────
    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('product_id', platformId)
                .order('created_at', { ascending: false });

            const { data: subData } = await supabase
                .from('tenant_subscriptions')
                .select('*, subscription_plans(name_ar, name_en, code, price_monthly)')
                .order('created_at', { ascending: false });

            const enriched = await Promise.all((tenantData || []).map(async (t) => {
                const { count: cc } = await supabase.from('companies').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id);
                const { data: tCompanies } = await supabase.from('companies').select('id').eq('tenant_id', t.id);
                const cIds = tCompanies?.map(c => c.id) || [];
                const { count: uc } = cIds.length > 0 ? await supabase.from('user_profiles').select('id', { count: 'exact', head: true }).in('company_id', cIds) : { count: 0 };
                const sub = (subData || []).find(s => s.tenant_id === t.id);
                return { ...t, companies_count: cc || 0, users_count: uc || 0, _subscription: sub };
            }));

            setTenants(enriched);
        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    }, [platformId]);

    useEffect(() => { loadList(); }, [loadList]);

    // ─── Load detail data ────────────────────────────────────────
    const loadDetail = useCallback(async (tenant: any) => {
        setDetailLoading(true);
        try {
            // Fetch companies first to get users by company_id instead of tenant_id
            const companiesRes = await supabase.from('companies').select('*').eq('tenant_id', tenant.id).order('name_ar');
            const cIds = (companiesRes.data || []).map(c => c.id);

            const [usersRes, modulesRes, sysModulesRes] = await Promise.all([
                cIds.length > 0 ? supabase.from('user_profiles').select('*').in('company_id', cIds).order('created_at') : Promise.resolve({ data: [] }),
                supabase.from('tenant_modules').select('*').eq('tenant_id', tenant.id).order('module_code'),
                supabase.from('system_modules').select('*').eq('is_active', true).order('display_order'),
            ]);

            // Fetch role assignments for these users separately
            const userIds = (usersRes.data || []).map((u: any) => u.id);
            let rolesMap: Record<string, any[]> = {};
            if (userIds.length > 0) {
                const { data: roleAssignments } = await supabase
                    .from('user_role_assignments')
                    .select('*')
                    .in('user_id', userIds);

                // Get unique role_ids and fetch role details
                const roleIds = [...new Set((roleAssignments || []).map((ra: any) => ra.role_id).filter(Boolean))];
                let rolesById: Record<string, any> = {};
                if (roleIds.length > 0) {
                    const { data: rolesData } = await supabase
                        .from('roles')
                        .select('id, code, name_ar, name_en')
                        .in('id', roleIds);
                    (rolesData || []).forEach((r: any) => { rolesById[r.id] = r; });
                }

                // Group by user_id with role details
                (roleAssignments || []).forEach((ra: any) => {
                    if (!rolesMap[ra.user_id]) rolesMap[ra.user_id] = [];
                    rolesMap[ra.user_id].push({ ...ra, roles: rolesById[ra.role_id] || null });
                });
            }

            // Merge roles into users
            const enrichedUsers = (usersRes.data || []).map((u: any) => ({
                ...u,
                user_role_assignments: rolesMap[u.id] || [],
            }));

            setCompanies(companiesRes.data || []);
            setUsers(enrichedUsers);
            setTenantModules(modulesRes.data || []);
            setAllModules(sysModulesRes.data || []);
        } catch (err) {
            console.error('Detail load error:', err);
        }
        setDetailLoading(false);
    }, []);

    // ─── Open detail ──────────────────────────────────────────────
    const openDetail = (tenant: any) => {
        setSelectedTenant(tenant);
        setSubTab('general');
        loadDetail(tenant);
    };

    const goBack = () => { setSelectedTenant(null); };

    // ─── Toggle module ───────────────────────────────────────────
    const toggleModule = async (moduleCode: string, currentActive: boolean) => {
        if (!selectedTenant) return;
        setModuleSaving(true);
        try {
            const existing = tenantModules.find(m => m.module_code === moduleCode);
            if (existing) {
                await supabase.from('tenant_modules').update({ is_active: !currentActive }).eq('id', existing.id);
            } else {
                await supabase.from('tenant_modules').insert({
                    tenant_id: selectedTenant.id,
                    module_code: moduleCode,
                    is_active: true,
                });
            }
            // Refresh modules
            const { data } = await supabase.from('tenant_modules').select('*').eq('tenant_id', selectedTenant.id);
            setTenantModules(data || []);
            toast.success(isAr ? 'تم تحديث الموديول' : 'Module updated');
        } catch (err: any) {
            toast.error(err.message);
        }
        setModuleSaving(false);
    };

    // ─── Filter ──────────────────────────────────────────────────
    const filtered = tenants.filter(t =>
        !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase()) ||
        t.owner_name?.toLowerCase().includes(search.toLowerCase())
    );

    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const totalUsers = tenants.reduce((s, t) => s + (t.users_count || 0), 0);

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    // ═══════════════════════════════════════════════════════════════
    // DETAIL VIEW
    // ═══════════════════════════════════════════════════════════════
    if (selectedTenant) {
        const sub = selectedTenant._subscription;
        const plan = sub?.subscription_plans;
        const statusInfo = STATUS_MAP[selectedTenant.status] || STATUS_MAP.active;

        return (
            <div className="space-y-4">
                {/* Breadcrumb */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-gray-500 hover:text-gray-900">
                            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            {isAr ? 'المشتركين' : 'Subscribers'}
                        </Button>
                        <span className="text-gray-300">/</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {selectedTenant.owner_name || selectedTenant.name || selectedTenant.email}
                        </span>
                        <Badge className={cn("text-[10px]", statusInfo.color)}>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadDetail(selectedTenant)} className="gap-1.5 text-xs">
                        <RefreshCw className="w-3 h-3" />
                        {isAr ? 'تحديث' : 'Refresh'}
                    </Button>
                </div>

                {/* Sub-tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-0.5">
                        {SUB_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSubTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2",
                                    subTab === tab.id
                                        ? "border-purple-600 text-purple-700 dark:text-purple-400"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {isAr ? tab.labelAr : tab.labelEn}
                                {tab.id === 'companies' && <Badge variant="secondary" className="text-[9px] px-1 h-4">{companies.length}</Badge>}
                                {tab.id === 'users' && <Badge variant="secondary" className="text-[9px] px-1 h-4">{users.length}</Badge>}
                                {tab.id === 'modules' && <Badge variant="secondary" className="text-[9px] px-1 h-4">{tenantModules.filter(m => m.is_active).length}</Badge>}
                            </button>
                        ))}
                    </div>
                </div>

                {detailLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={subTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

                            {/* ═══ General Tab ═══ */}
                            {subTab === 'general' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Subscriber Info */}
                                    <Card className="border-gray-200 dark:border-gray-700">
                                        <CardContent className="p-4 space-y-3">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <UserCircle className="w-3.5 h-3.5" />
                                                {isAr ? 'معلومات المشترك' : 'Subscriber Info'}
                                            </h4>
                                            <div className="space-y-2">
                                                {[
                                                    { label: isAr ? 'الاسم' : 'Name', value: selectedTenant.owner_name || selectedTenant.name, icon: UserCircle },
                                                    { label: isAr ? 'البريد' : 'Email', value: selectedTenant.email, icon: Mail },
                                                    { label: isAr ? 'الدولة' : 'Country', value: selectedTenant.settings?.country || '—', icon: Globe },
                                                    { label: isAr ? 'تاريخ التسجيل' : 'Registered', value: selectedTenant.created_at?.split('T')[0], icon: Calendar },
                                                ].map(item => (
                                                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <item.icon className="w-3 h-3" />{item.label}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-900 dark:text-white">{item.value || '—'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Plan & Subscription */}
                                    <Card className="border-gray-200 dark:border-gray-700">
                                        <CardContent className="p-4 space-y-3">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Crown className="w-3.5 h-3.5" />
                                                {isAr ? 'الباقة والاشتراك' : 'Plan & Subscription'}
                                            </h4>
                                            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-purple-700 dark:text-purple-400">
                                                            {isAr ? plan?.name_ar : plan?.name_en || plan?.name_ar || '—'}
                                                        </p>
                                                        <p className="text-[11px] text-purple-500 font-mono">{plan?.code || '—'}</p>
                                                    </div>
                                                    <div className="text-end">
                                                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                                            ${plan?.price_monthly || 0}
                                                            <span className="text-[10px] text-purple-400 font-normal">/{isAr ? 'شهر' : 'mo'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    { label: isAr ? 'الحالة' : 'Status', value: isAr ? statusInfo.labelAr : statusInfo.labelEn },
                                                    { label: isAr ? 'بداية' : 'Start', value: sub?.start_date || '—' },
                                                    { label: isAr ? 'نهاية' : 'End', value: sub?.end_date || '—' },
                                                    { label: isAr ? 'نهاية التجريب' : 'Trial End', value: sub?.trial_end_date || '—' },
                                                ].map(item => (
                                                    <div key={item.label} className="flex items-center justify-between py-1 text-xs">
                                                        <span className="text-gray-500">{item.label}</span>
                                                        <span className="font-medium font-mono text-gray-900 dark:text-white">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Quick stats */}
                                            <div className="grid grid-cols-2 gap-2 pt-2">
                                                <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/10 text-center">
                                                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{companies.length}</p>
                                                    <p className="text-[10px] text-blue-500">{isAr ? 'شركة' : 'Companies'}</p>
                                                </div>
                                                <div className="p-2 rounded bg-green-50 dark:bg-green-900/10 text-center">
                                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{users.length}</p>
                                                    <p className="text-[10px] text-green-500">{isAr ? 'مستخدم' : 'Users'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* ═══ Companies Tab ═══ */}
                            {subTab === 'companies' && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {isAr ? `شركات المشترك (${companies.length})` : `Subscriber Companies (${companies.length})`}
                                    </h4>
                                    {companies.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">{isAr ? 'لا توجد شركات' : 'No companies'}</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {companies.map((c, i) => (
                                                <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                                    <Card className="border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                                                        <CardContent className="p-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                                    {(c.name_ar || c.name || '?').charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.name_ar || c.name}</p>
                                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                        {c.name_en && <span>{c.name_en}</span>}
                                                                        <span className="font-mono">{c.id.slice(0, 8)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {c.base_currency && (
                                                                    <Badge variant="secondary" className="text-[10px]">{c.base_currency}</Badge>
                                                                )}
                                                                <Badge className={cn("text-[10px]", c.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                                                                    {c.is_active !== false ? (isAr ? 'نشطة' : 'Active') : (isAr ? 'غير نشطة' : 'Inactive')}
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══ Users Tab ═══ */}
                            {subTab === 'users' && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {isAr ? `مستخدمو المشترك (${users.length})` : `Subscriber Users (${users.length})`}
                                    </h4>
                                    {users.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">{isAr ? 'لا يوجد مستخدمين' : 'No users'}</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {users.map((u, i) => {
                                                const roles = (u.user_role_assignments || []).map((a: any) => a.roles).filter(Boolean);
                                                return (
                                                    <motion.div key={u.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                                        <Card className="border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                                                            <CardContent className="p-3 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            {u.full_name || u.display_name || u.email}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                            <Mail className="w-2.5 h-2.5" />
                                                                            <span>{u.email || '—'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                                    {roles.map((r: any) => (
                                                                        <Badge key={r.code} className={cn(
                                                                            "text-[10px] gap-0.5",
                                                                            r.code === 'super_admin' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                                                r.code === 'tenant_owner' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                                        )}>
                                                                            <Shield className="w-2.5 h-2.5" />
                                                                            {isAr ? r.name_ar : r.name_en || r.code}
                                                                        </Badge>
                                                                    ))}
                                                                    {roles.length === 0 && (
                                                                        <Badge variant="secondary" className="text-[10px] text-gray-400">{isAr ? 'بدون دور' : 'No Role'}</Badge>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══ Modules Tab ═══ */}
                            {subTab === 'modules' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {isAr
                                                ? `الموديولات المخصصة (${tenantModules.filter(m => m.is_active).length}/${allModules.length})`
                                                : `Custom Modules (${tenantModules.filter(m => m.is_active).length}/${allModules.length})`}
                                        </h4>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {isAr ? 'التحكم على مستوى المشترك' : 'Per-subscriber control'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {allModules.map((mod) => {
                                            const tm = tenantModules.find(m => m.module_code === mod.code);
                                            const isActive = tm?.is_active || false;
                                            const isCore = mod.is_core || mod.code === 'dashboard';
                                            return (
                                                <div
                                                    key={mod.code}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg transition-colors border",
                                                        isCore
                                                            ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                                            : isActive
                                                                ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
                                                                : "bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Boxes className={cn(
                                                            "w-4 h-4",
                                                            isCore ? "text-blue-600" : isActive ? "text-emerald-600" : "text-gray-400"
                                                        )} />
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {isAr ? mod.name_ar : mod.name_en}
                                                            </span>
                                                            {isCore && (
                                                                <Badge className="ms-2 text-[9px] px-1.5 bg-blue-100 text-blue-700 border-blue-200 gap-0.5">
                                                                    {isAr ? 'أساسي' : 'Core'}
                                                                </Badge>
                                                            )}
                                                            <p className="text-[10px] text-gray-400 font-mono">{mod.code}</p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={isActive}
                                                        onCheckedChange={() => toggleModule(mod.code, isActive)}
                                                        disabled={isCore || moduleSaving}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // LIST VIEW
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 border-violet-200 dark:border-violet-800">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] text-violet-600 dark:text-violet-400">{isAr ? 'إجمالي المشتركين' : 'Total Subscribers'}</p>
                            <p className="text-xl font-bold text-violet-700 dark:text-violet-300 font-mono">{tenants.length}</p>
                        </div>
                        <div className="p-2 bg-violet-500 rounded-lg"><Users className="w-4 h-4 text-white" /></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{isAr ? 'نشطين' : 'Active'}</p>
                            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">{activeTenants}</p>
                        </div>
                        <div className="p-2 bg-emerald-500 rounded-lg"><Eye className="w-4 h-4 text-white" /></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400">{isAr ? 'إجمالي المستخدمين' : 'Total Users'}</p>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">{totalUsers}</p>
                        </div>
                        <div className="p-2 bg-blue-500 rounded-lg"><UserCircle className="w-4 h-4 text-white" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={isAr ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                    className="ps-9 h-9 text-sm"
                />
            </div>

            {/* Subscribers List */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">{isAr ? 'لا يوجد مشتركين' : 'No subscribers'}</div>
                ) : (
                    filtered.map((tenant, i) => {
                        const sub = tenant._subscription;
                        const plan = sub?.subscription_plans;
                        const statusInfo = STATUS_MAP[tenant.status] || STATUS_MAP.active;

                        return (
                            <motion.div key={tenant.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card
                                    className="overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-gray-200 dark:border-gray-700"
                                    onClick={() => openDetail(tenant)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                    {(tenant.owner_name || tenant.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {tenant.owner_name || tenant.name}
                                                        </h3>
                                                        <Badge className={cn("text-[9px]", statusInfo.color)}>
                                                            {isAr ? statusInfo.labelAr : statusInfo.labelEn}
                                                        </Badge>
                                                        {plan && (
                                                            <Badge className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                                <Package className="w-2.5 h-2.5 me-0.5" />
                                                                {isAr ? plan.name_ar : plan.name_en || plan.name_ar}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                                                        <span>{tenant.email}</span>
                                                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {tenant.companies_count} {isAr ? 'شركة' : 'co.'}</span>
                                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tenant.users_count} {isAr ? 'مستخدم' : 'users'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isAr
                                                ? <ChevronLeft className="w-4 h-4 text-gray-400" />
                                                : <ChevronRight className="w-4 h-4 text-gray-400" />
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
