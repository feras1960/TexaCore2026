/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ SpecialPermissionsTab - تبويب الصلاحيات الخاصة (مستوى الشركة)
 * ════════════════════════════════════════════════════════════════
 * 
 * Matrix-style view showing special permissions per role.
 * SCOPE: Company-level roles ONLY.
 * 
 * Roles shown: مالك الشركة، مدير الشركة، مدير الفرع، محاسب،
 *   أمين صندوق، أمين مستودع، مندوب مبيعات، مسؤول مشتريات،
 *   وكيل، سائق، مدقق، مشاهد، موظف
 * 
 * NOT shown: أدوار المنصة (super_admin, support) وأدوار المستأجر (tenant_owner)
 * — tenant_owner always has ALL permissions enforced in rbacService.
 * — company_owner always has ALL permissions (locked switches).
 * 
 * Features:
 * - Company filter for multi-company tenants
 * - Auto-apply defaults for new subscribers
 * - company_owner permissions locked (all true)
 * 
 * @module features/users-permissions/components
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { rbacService, Role, SPECIAL_PERMISSIONS_KEYS, SpecialPermissions, SpecialPermissionKey } from '@/services/rbacService';
import { companiesService } from '@/services/companiesService';
import {
    Loader2, Zap, Save, FileText, Calculator, Settings,
    Briefcase, DollarSign, RefreshCw, Wand2, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// Visible Roles (include tenant_owner as "المالك")
// ═══════════════════════════════════════════════════════════════

// Platform/system roles — NEVER shown
const HIDDEN_ROLE_CODES = ['super_admin', 'support', 'support_senior', 'tenant_admin'];

// Fix wrong levels from DB migration bug
const ROLE_LEVEL_FIX: Record<string, string> = {
    auditor: 'special',
    purchaser: 'operations',
    employee: 'operations',
    driver: 'operations',
    agent: 'operations',
};

// Roles with FULL permissions (always true, locked switches)
const FULL_PERMISSION_ROLES = ['tenant_owner', 'company_owner'];

// Sort priority: المالك → مالك الشركة → مدير الشركة → مدير الفرع → عمليات → مخصص
const ROLE_LEVEL_PRIORITY: Record<string, number> = {
    tenant: 0,      // المالك (tenant_owner)
    company: 1,     // مالك الشركة / مدير الشركة
    branch: 2,      // مدير الفرع
    operations: 3,  // محاسب / أمين صندوق / أمين مستودع / مندوب...
    custom: 4,      // أدوار مخصصة / مشاهد
    special: 5,     // مدقق
};

// ═══════════════════════════════════════════════════════════════
// Default Permissions per Role Level
// ═══════════════════════════════════════════════════════════════

const ALL_TRUE_PERMISSIONS: SpecialPermissions = {
    can_edit_posted_purchase: true,
    can_edit_posted_sale: true,
    can_edit_posted_journal: true,
    can_delete_posted: true,
    can_unpost: true,
    can_edit_closed_period: true,
    can_view_audit_log: true,
    can_view_all_branches: true,
    can_manage_roles: true,
    can_approve_transactions: true,
    can_view_cost_prices: true,
    can_view_profit_margins: true,
    can_export_data: true,
    can_manage_containers: true,
};

const DEFAULT_PERMISSIONS_BY_LEVEL: Record<string, SpecialPermissions> = {
    tenant: {
        // المالك — كل الصلاحيات
        ...ALL_TRUE_PERMISSIONS,
    },
    company: {
        // مالك الشركة / مدير الشركة — كل الصلاحيات
        ...ALL_TRUE_PERMISSIONS,
    },
    branch: {
        // مدير الفرع — صلاحيات الفرع فقط
        can_edit_posted_purchase: false,
        can_edit_posted_sale: false,
        can_edit_posted_journal: false,
        can_delete_posted: false,
        can_unpost: false,
        can_edit_closed_period: false,
        can_view_audit_log: false,
        can_view_all_branches: false,
        can_manage_roles: false,
        can_approve_transactions: true,
        can_view_cost_prices: true,
        can_view_profit_margins: true,
        can_export_data: true,
        can_manage_containers: false,
    },
    operations: {
        // عمليات (محاسب، أمين مستودع...) — صلاحيات محدودة
        can_edit_posted_purchase: false,
        can_edit_posted_sale: false,
        can_edit_posted_journal: false,
        can_delete_posted: false,
        can_unpost: false,
        can_edit_closed_period: false,
        can_view_audit_log: false,
        can_view_all_branches: false,
        can_manage_roles: false,
        can_approve_transactions: false,
        can_view_cost_prices: false,
        can_view_profit_margins: false,
        can_export_data: false,
        can_manage_containers: false,
    },
    custom: {
        // أدوار مخصصة — لا صلاحيات افتراضية
        can_edit_posted_purchase: false,
        can_edit_posted_sale: false,
        can_edit_posted_journal: false,
        can_delete_posted: false,
        can_unpost: false,
        can_edit_closed_period: false,
        can_view_audit_log: false,
        can_view_all_branches: false,
        can_manage_roles: false,
        can_approve_transactions: false,
        can_view_cost_prices: false,
        can_view_profit_margins: false,
        can_export_data: false,
        can_manage_containers: false,
    },
    special: {
        // مدقق — قراءة فقط
        can_edit_posted_purchase: false,
        can_edit_posted_sale: false,
        can_edit_posted_journal: false,
        can_delete_posted: false,
        can_unpost: false,
        can_edit_closed_period: false,
        can_view_audit_log: true,
        can_view_all_branches: false,
        can_manage_roles: false,
        can_approve_transactions: false,
        can_view_cost_prices: false,
        can_view_profit_margins: false,
        can_export_data: true,
        can_manage_containers: false,
    },
};

// Category icons & colors — teal/turquoise theme matching system colors
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; labelAr: string; labelEn: string }> = {
    documents: {
        icon: <FileText className="w-4 h-4" />,
        color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
        labelAr: 'المستندات',
        labelEn: 'Documents',
    },
    accounting: {
        icon: <Calculator className="w-4 h-4" />,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        labelAr: 'المحاسبة',
        labelEn: 'Accounting',
    },
    system: {
        icon: <Settings className="w-4 h-4" />,
        color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
        labelAr: 'النظام',
        labelEn: 'System',
    },
    operations: {
        icon: <Briefcase className="w-4 h-4" />,
        color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
        labelAr: 'العمليات',
        labelEn: 'Operations',
    },
    financial: {
        icon: <DollarSign className="w-4 h-4" />,
        color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
        labelAr: 'المالية',
        labelEn: 'Financial',
    },
};

// Group permissions by category
const PERMISSIONS_BY_CATEGORY = SPECIAL_PERMISSIONS_KEYS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
}, {} as Record<string, typeof SPECIAL_PERMISSIONS_KEYS>);

// ═══════════════════════════════════════════════════════════════
// Company type for filter
// ═══════════════════════════════════════════════════════════════
interface CompanyOption {
    id: string;
    name: string;
    name_en?: string;
}

export default function SpecialPermissionsTab() {
    const { language } = useLanguage();
    const { toast } = useToast();
    const { authUser } = useAuth();
    const isAr = language === 'ar';
    const tenantId = authUser?.tenant_id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [permMatrix, setPermMatrix] = useState<Record<string, SpecialPermissions>>({});
    const [dirty, setDirty] = useState<Set<string>>(new Set());

    // Company filter state
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

    // Load companies for the tenant
    useEffect(() => {
        async function loadCompanies() {
            if (!tenantId) return;
            try {
                const comps = await companiesService.getByTenantId(tenantId);
                setCompanies(comps.map(c => ({ id: c.id, name: c.name, name_en: c.name_en })));
            } catch (err) {
                console.error('Failed to load companies:', err);
            }
        }
        loadCompanies();
    }, [tenantId]);

    // Load roles scoped to current tenant
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const allRoles = await rbacService.getRoles(
                tenantId ? { tenant_id: tenantId } : undefined
            );

            // Fix wrong levels from DB migration bug
            const fixedRoles = allRoles.map(r => ({
                ...r,
                level: (ROLE_LEVEL_FIX[r.code] || r.level) as typeof r.level,
            }));

            // Filter and sort
            const filteredRoles = fixedRoles
                .filter(r => !HIDDEN_ROLE_CODES.includes(r.code))
                .sort((a, b) => {
                    const priorityA = ROLE_LEVEL_PRIORITY[a.level] ?? 99;
                    const priorityB = ROLE_LEVEL_PRIORITY[b.level] ?? 99;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
                    return (a.name_ar || '').localeCompare(b.name_ar || '');
                });

            setRoles(filteredRoles);

            // Build permission matrix
            // Auto-apply defaults if permissions are empty (for new subscribers)
            const matrix: Record<string, SpecialPermissions> = {};
            let needsAutoSave = false;

            for (const role of filteredRoles) {
                const existingPerms = (role as any).special_permissions || {};
                const isEmpty = !existingPerms || Object.keys(existingPerms).length === 0
                    || SPECIAL_PERMISSIONS_KEYS.every(k => existingPerms[k.key] === undefined);

                if (FULL_PERMISSION_ROLES.includes(role.code)) {
                    // company_owner always gets all true
                    matrix[role.id] = { ...ALL_TRUE_PERMISSIONS };
                    if (isEmpty) needsAutoSave = true;
                } else if (isEmpty) {
                    // Auto-apply defaults for empty roles
                    const defaults = DEFAULT_PERMISSIONS_BY_LEVEL[role.level] || DEFAULT_PERMISSIONS_BY_LEVEL.custom;
                    matrix[role.id] = { ...defaults };
                    needsAutoSave = true;
                } else {
                    matrix[role.id] = existingPerms;
                }
            }

            setPermMatrix(matrix);

            // Auto-save defaults for new/empty roles
            if (needsAutoSave) {
                const emptyRoles = filteredRoles.filter(role => {
                    const existingPerms = (role as any).special_permissions || {};
                    return !existingPerms || Object.keys(existingPerms).length === 0
                        || SPECIAL_PERMISSIONS_KEYS.every(k => existingPerms[k.key] === undefined);
                });

                if (emptyRoles.length > 0) {
                    try {
                        await Promise.all(
                            emptyRoles.map(role =>
                                rbacService.updateRoleSpecialPermissions(role.id, matrix[role.id])
                            )
                        );
                        console.log(`[RBAC] Auto-applied default permissions for ${emptyRoles.length} roles`);
                    } catch (err) {
                        console.warn('[RBAC] Failed to auto-save defaults:', err);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load special permissions:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Toggle a permission for a role
    const togglePermission = useCallback((roleId: string, permKey: SpecialPermissionKey) => {
        setPermMatrix(prev => {
            const rolePerms = { ...prev[roleId] };
            rolePerms[permKey] = !rolePerms[permKey];
            return { ...prev, [roleId]: rolePerms };
        });
        setDirty(prev => new Set(prev).add(roleId));
    }, []);

    // Apply default permissions for all roles
    const applyDefaults = useCallback(() => {
        const newMatrix: Record<string, SpecialPermissions> = {};
        const newDirty = new Set<string>();

        for (const role of roles) {
            if (FULL_PERMISSION_ROLES.includes(role.code)) {
                newMatrix[role.id] = { ...ALL_TRUE_PERMISSIONS };
            } else {
                const defaults = DEFAULT_PERMISSIONS_BY_LEVEL[role.level] || DEFAULT_PERMISSIONS_BY_LEVEL.custom || {};
                newMatrix[role.id] = { ...defaults };
            }
            newDirty.add(role.id);
        }

        setPermMatrix(newMatrix);
        setDirty(newDirty);

        toast({
            title: isAr ? 'تم تطبيق الإعدادات الافتراضية' : 'Defaults Applied',
            description: isAr
                ? 'تم تعيين الصلاحيات الافتراضية لكل دور حسب مستواه. اضغط حفظ لتأكيد التغييرات.'
                : 'Default permissions set per role level. Click Save to confirm.',
        });
    }, [roles, isAr, toast]);

    // Save all changes
    const saveChanges = useCallback(async () => {
        if (dirty.size === 0) return;
        try {
            setSaving(true);
            const promises = Array.from(dirty).map(roleId =>
                rbacService.updateRoleSpecialPermissions(roleId, permMatrix[roleId])
            );
            await Promise.all(promises);
            setDirty(new Set());
            toast({
                title: isAr ? 'تم الحفظ' : 'Saved',
                description: isAr
                    ? `تم حفظ الصلاحيات لـ ${promises.length} أدوار`
                    : `Saved permissions for ${promises.length} roles`,
            });
        } catch (error) {
            console.error('Failed to save special permissions:', error);
            toast({
                variant: 'destructive',
                title: isAr ? 'خطأ' : 'Error',
                description: isAr ? 'فشل حفظ الصلاحيات' : 'Failed to save permissions',
            });
        } finally {
            setSaving(false);
        }
    }, [dirty, permMatrix, isAr, toast]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with save button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-tajawal">
                            {isAr ? 'مصفوفة الصلاحيات الخاصة' : 'Special Permissions Matrix'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                            {isAr
                                ? 'تحكم بصلاحيات كل دور — كتعديل المرحّل، الحذف، عرض الأرباح...'
                                : 'Control per-role permissions — edit posted, delete, view profits...'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Company Filter — only show if tenant has multiple companies */}
                    {companies.length > 1 && (
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-[200px] h-9 text-sm font-tajawal">
                                <Building2 className="w-4 h-4 me-1 text-gray-400" />
                                <SelectValue placeholder={isAr ? 'كل الشركات' : 'All Companies'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-tajawal">
                                    {isAr ? 'كل الشركات' : 'All Companies'}
                                </SelectItem>
                                {companies.map(comp => (
                                    <SelectItem key={comp.id} value={comp.id} className="font-tajawal">
                                        {isAr ? comp.name : (comp.name_en || comp.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {/* Apply Defaults Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={applyDefaults}
                        disabled={saving}
                        className="border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400"
                    >
                        <Wand2 className="w-4 h-4 me-1" />
                        {isAr ? 'تطبيق الافتراضي' : 'Apply Defaults'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={saving}
                    >
                        <RefreshCw className="w-4 h-4 me-1" />
                        {isAr ? 'تحديث' : 'Refresh'}
                    </Button>
                    {dirty.size > 0 && (
                        <Button
                            size="sm"
                            onClick={saveChanges}
                            disabled={saving}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin me-1" />
                            ) : (
                                <Save className="w-4 h-4 me-1" />
                            )}
                            {isAr ? `حفظ (${dirty.size})` : `Save (${dirty.size})`}
                        </Button>
                    )}
                </div>
            </div>

            {/* Permission Matrix by Category */}
            {Object.entries(PERMISSIONS_BY_CATEGORY).map(([category, perms]) => {
                const catConfig = CATEGORY_CONFIG[category];
                return (
                    <Card key={category} className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('gap-1', catConfig?.color)}>
                                    {catConfig?.icon}
                                    {isAr ? catConfig?.labelAr : catConfig?.labelEn}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                    ({perms.length} {isAr ? 'صلاحية' : 'permissions'})
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-start py-3 px-4 font-medium text-gray-500 dark:text-gray-400 min-w-[200px] font-tajawal">
                                                {isAr ? 'الصلاحية' : 'Permission'}
                                            </th>
                                            {roles.map(role => (
                                                <th
                                                    key={role.id}
                                                    className="py-3 px-3 font-medium text-gray-700 dark:text-gray-300 text-center min-w-[90px] font-tajawal"
                                                >
                                                    <span className="text-xs leading-tight whitespace-nowrap">
                                                        {isAr ? role.name_ar : (role.name_en || role.name_ar)}
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {perms.map((perm, idx) => (
                                            <tr
                                                key={perm.key}
                                                className={cn(
                                                    'border-b dark:border-gray-800 transition-colors',
                                                    idx % 2 === 0
                                                        ? 'bg-white dark:bg-gray-900'
                                                        : 'bg-gray-50/50 dark:bg-gray-800/30'
                                                )}
                                            >
                                                <td className="py-2.5 px-4 font-tajawal text-gray-700 dark:text-gray-300">
                                                    {isAr ? perm.name_ar : perm.name_en}
                                                </td>
                                                {roles.map(role => {
                                                    const isLockedRole = FULL_PERMISSION_ROLES.includes(role.code);
                                                    const isOn = isLockedRole ? true : permMatrix[role.id]?.[perm.key] === true;
                                                    return (
                                                        <td key={role.id} className="py-2.5 px-3 text-center">
                                                            <div className="flex justify-center">
                                                                <Switch
                                                                    checked={isOn}
                                                                    disabled={isLockedRole}
                                                                    onCheckedChange={() => !isLockedRole && togglePermission(role.id, perm.key)}
                                                                    className={cn(
                                                                        'data-[state=checked]:bg-teal-600',
                                                                        isLockedRole && 'opacity-60 cursor-not-allowed',
                                                                        dirty.has(role.id) && 'ring-2 ring-teal-400/50'
                                                                    )}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
