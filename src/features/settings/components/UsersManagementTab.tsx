/**
 * UsersManagementTab - تبويب إدارة المستخدمين
 * Users Management Tab
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Users, Search, Edit2, UserPlus, Shield, Trash2,
    Loader2, Save, RefreshCw, Building2,
    Warehouse, Wallet, GitBranch, Check, X,
    Mail, User, ToggleRight, Lock
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { rbacService, Role, UserRole } from '@/services/rbacService';
import { companiesService } from '@/services/companiesService';
import { supabase, supabaseAdmin, cloudSupabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAuditEvent } from '@/features/users-permissions/components/AuditLogTab';

// ─── Role Filtering (same as RolesManagementTab) ────────────
const HIDDEN_ROLE_CODES = ['super_admin', 'support', 'support_senior', 'tenant_admin'];
// ─── Hidden Support Accounts (never shown in user management) ───
const SUPPORT_HIDDEN_EMAILS = ['feras1960@gmail.com'];
const SUPPORT_HIDDEN_ROLES = ['super_admin'];
const ROLE_LEVEL_FIX: Record<string, string> = {
    auditor: 'special',
    purchaser: 'operations',
    employee: 'operations',
    driver: 'operations',
    agent: 'operations',
    picker: 'operations',
};
const ROLE_SORT_PRIORITY: Record<string, number> = {
    tenant: 0, company: 1, branch: 2, operations: 3, custom: 4, special: 5,
};

// User type with roles
interface UserWithDetails {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    company_id?: string;
    branch_id?: string;
    is_active: boolean;
    roles: {
        id: string;
        code: string;
        name_ar: string;
        name_en?: string;
    }[];
}

// Resource type
interface Resource {
    id: string;
    name_ar: string;
    name_en?: string;
    code?: string;
}

export default function UsersManagementTab() {
    const { language, direction } = useLanguage();
    const { toast } = useToast();
    const { companyId, authUser, tenantId: authTenantId } = useAuth();
    const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(authTenantId);
    const tenantId = resolvedTenantId || authTenantId;
    const isAr = language === 'ar';

    // State
    const [users, setUsers] = useState<UserWithDetails[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [companies, setCompanies] = useState<{ id: string; name: string; name_en?: string | null }[]>([]);
    const [branches, setBranches] = useState<Resource[]>([]);
    const [warehouses, setWarehouses] = useState<Resource[]>([]);
    const [funds, setFunds] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        phone: '',
        selectedCompany: companyId || '',
        selectedRoles: [] as string[],
        selectedBranches: [] as string[],
        selectedWarehouses: [] as string[],
        selectedFunds: [] as string[],
        primaryBranch: '' as string,
        is_active: true,
        require_mfa: false,
    });

    // Resolve tenant_id from user_profiles if not available from auth
    useEffect(() => {
        if (authTenantId) {
            setResolvedTenantId(authTenantId);
        } else if (authUser?.id) {
            supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('id', authUser.id)
                .single()
                .then(({ data }) => {
                    if (data?.tenant_id) setResolvedTenantId(data.tenant_id);
                });
        }
    }, [authTenantId, authUser?.id]);

    // Load data — scoped to current tenant
    const loadData = useCallback(async () => {
        if (!tenantId) return; // Don't load until tenantId is resolved
        try {
            setLoading(true);

            // Get companies for this tenant first to filter users
            const { data: tenantCompanies } = await supabase
                .from('companies')
                .select('id')
                .eq('tenant_id', tenantId);
                
            const companyIds = tenantCompanies?.map(c => c.id) || [];

            // Load users — filtered by company_ids (mandatory since tenant_id is dropped)
            let usersQuery = supabase
                .from('user_profiles')
                .select('id, email, full_name, avatar_url, company_id, branch_id, is_active, phone, is_support_account')
                .order('full_name');
                
            if (companyIds.length > 0) {
                usersQuery = usersQuery.in('company_id', companyIds);
            } else {
                // If no companies, don't return any users
                usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            }
                
            const { data: usersData, error: usersError } = await usersQuery;

            if (usersError) throw usersError;

            // Get user IDs for this company
            const companyUserIds = (usersData || []).map(u => u.id);

            // Load user_roles only for company users
            let allUserRoles: any[] = [];
            if (companyUserIds.length > 0) {
                const { data } = await supabase
                    .from('user_roles')
                    .select('user_id, role_id')
                    .eq('is_active', true)
                    .in('user_id', companyUserIds);
                allUserRoles = data || [];
            }

            // Load all roles (roles are tenant-level, not company-specific)
            const { data: allRolesData } = await supabase
                .from('roles')
                .select('id, code, name_ar, name_en');

            // Create a map of roles
            const rolesMap = new Map((allRolesData || []).map(r => [r.id, r]));

            // Create a map of user -> roles
            const userRolesMap = new Map<string, any[]>();
            (allUserRoles || []).forEach(ur => {
                const role = rolesMap.get(ur.role_id);
                if (role) {
                    const existing = userRolesMap.get(ur.user_id) || [];
                    existing.push(role);
                    userRolesMap.set(ur.user_id, existing);
                }
            });

            // Transform data & filter out hidden support accounts
            const transformedUsers = (usersData || [])
                .filter((u: any) => !SUPPORT_HIDDEN_EMAILS.includes(u.email?.toLowerCase()))
                .filter((u: any) => !u.is_support_account)
                .map((u: any) => ({
                    id: u.id,
                    email: u.email,
                    full_name: u.full_name,
                    avatar_url: u.avatar_url,
                    company_id: u.company_id,
                    branch_id: u.branch_id,
                    is_active: u.is_active !== false,
                    roles: userRolesMap.get(u.id) || [],
                }));

            setUsers(transformedUsers);

            // Load roles for dropdown — filtered by company scope
            const rolesData = await rbacService.getRoles(
                tenantId ? { tenant_id: tenantId } : undefined
            );
            // Apply fixes and filter
            const filteredRoles = rolesData
                .map(r => ({ ...r, level: (ROLE_LEVEL_FIX[r.code] || r.level) as typeof r.level }))
                .filter(r => !HIDDEN_ROLE_CODES.includes(r.code))
                .sort((a, b) => {
                    const pa = ROLE_SORT_PRIORITY[a.level] ?? 99;
                    const pb = ROLE_SORT_PRIORITY[b.level] ?? 99;
                    return pa - pb;
                });
            setRoles(filteredRoles);

            // Load companies for tenant
            if (tenantId) {
                try {
                    const comps = await companiesService.getByTenantId(tenantId);
                    setCompanies(comps.map(c => ({ id: c.id, name: c.name, name_en: c.name_en })));
                } catch { /* ignore */ }
            }

            // Load branches — filtered by company_id
            let branchesQuery = supabase
                .from('branches')
                .select('id, name_ar, name_en, code')
                .eq('is_active', true);
            if (companyId) {
                branchesQuery = branchesQuery.eq('company_id', companyId);
            }
            const { data: branchesData } = await branchesQuery;
            setBranches(branchesData || []);

            // Load warehouses — filtered by company_id
            let warehousesQuery = supabase
                .from('warehouses')
                .select('id, name_ar, name_en, code')
                .eq('is_active', true);
            if (companyId) {
                warehousesQuery = warehousesQuery.eq('company_id', companyId);
            }
            const { data: warehousesData } = await warehousesQuery;
            setWarehouses(warehousesData || []);

            // Load funds (cash + bank accounts)
            let fundsQuery = supabase
                .from('chart_of_accounts')
                .select('id, name_ar, name_en, account_code')
                .or('is_cash_account.eq.true,is_bank_account.eq.true')
                .eq('is_detail', true);
            if (companyId) {
                fundsQuery = fundsQuery.eq('company_id', companyId);
            }
            const { data: fundsData } = await fundsQuery;
            setFunds((fundsData || []).map(f => ({
                id: f.id,
                name_ar: f.name_ar,
                name_en: f.name_en,
                code: f.account_code,
            })));

        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [language, toast, companyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter users by search + role + company
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Company filter
            if (companyFilter !== 'all') {
                if (companyFilter === 'no_company') {
                    if (user.company_id) return false;
                } else {
                    if (user.company_id !== companyFilter) return false;
                }
            }
            // Role filter
            if (roleFilter !== 'all') {
                if (roleFilter === 'no_role') {
                    if (user.roles.length > 0) return false;
                } else {
                    if (!user.roles.some(r => r.code === roleFilter)) return false;
                }
            }
            // Search filter
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                (user.full_name?.toLowerCase() || '').includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.roles.some(r => r.name_ar.includes(query) || r.code.includes(query))
            );
        });
    }, [users, searchQuery, roleFilter, companyFilter]);

    // Open ADD user sheet
    const handleAddUser = () => {
        setEditingUser(null);
        setIsAddMode(true);
        setFormData({
            email: '',
            full_name: '',
            phone: '',
            selectedCompany: companyId || '',
            selectedRoles: [],
            selectedBranches: [],
            selectedWarehouses: [],
            selectedFunds: [],
            primaryBranch: '',
            is_active: true,
            require_mfa: false,
        });
        setIsSheetOpen(true);
    };

    // Open EDIT user sheet
    const handleEditUser = async (user: UserWithDetails) => {
        setEditingUser(user);
        setIsAddMode(false);

        // Check if user has owner/admin roles — they have IMPLICIT full access
        // so user_resource_access table is empty for them
        const OWNER_ROLES = ['tenant_owner', 'company_owner', 'company_admin'];
        const isOwnerOrAdmin = user.roles.some(r => OWNER_ROLES.includes(r.code));

        // Load user's resource access + MFA status
        try {
            const [resources, mfaResult] = await Promise.all([
                rbacService.getUserAccessibleResources(user.id),
                supabase
                    .from('mfa_user_settings')
                    .select('is_enabled, totp_verified')
                    .eq('user_id', user.id)
                    .maybeSingle(),
            ]);

            let mfaEnabled = mfaResult.data?.is_enabled || mfaResult.data?.totp_verified || false;

            // If custom table has no record, check Supabase Auth native MFA
            // (only works for the currently logged-in user)
            if (!mfaEnabled && authUser?.id === user.id) {
                try {
                    const { data: factors } = await supabase.auth.mfa.listFactors();
                    mfaEnabled = factors?.totp?.some(f => f.status === 'verified') ?? false;
                } catch { /* ignore — not available for other users */ }
            }

            // For owner/admin users: auto-select ALL resources (implicit full access)
            const selectedBranches = isOwnerOrAdmin && (resources.branch?.length || 0) === 0
                ? branches.map(b => b.id)
                : resources.branch?.map(r => r.resource_id) || [];

            const selectedWarehouses = isOwnerOrAdmin && (resources.warehouse?.length || 0) === 0
                ? warehouses.map(w => w.id)
                : resources.warehouse?.map(r => r.resource_id) || [];

            const selectedFunds = isOwnerOrAdmin && (resources.cash_account?.length || 0) === 0
                ? funds.map(f => f.id)
                : resources.cash_account?.map(r => r.resource_id) || [];

            const primaryBranch = resources.branch?.find(r => r.is_primary)?.resource_id
                || (isOwnerOrAdmin && branches.length > 0 ? branches[0].id : '');

            setFormData({
                email: user.email,
                full_name: user.full_name || '',
                phone: (user as any).phone || '',
                selectedCompany: user.company_id || companyId || '',
                selectedRoles: user.roles.map(r => r.id),
                selectedBranches,
                selectedWarehouses,
                selectedFunds,
                primaryBranch,
                is_active: user.is_active,
                require_mfa: mfaEnabled,
            });
        } catch (error) {
            console.error('Error loading user resources:', error);
            setFormData({
                email: user.email,
                full_name: user.full_name || '',
                phone: (user as any).phone || '',
                selectedCompany: user.company_id || companyId || '',
                selectedRoles: user.roles.map(r => r.id),
                // For owners on error, still select all
                selectedBranches: isOwnerOrAdmin ? branches.map(b => b.id) : [],
                selectedWarehouses: isOwnerOrAdmin ? warehouses.map(w => w.id) : [],
                selectedFunds: isOwnerOrAdmin ? funds.map(f => f.id) : [],
                primaryBranch: isOwnerOrAdmin && branches.length > 0 ? branches[0].id : '',
                is_active: user.is_active,
                require_mfa: false,
            });
        }

        setIsSheetOpen(true);
    };

    // Toggle user active status
    const handleToggleUserStatus = async (user: UserWithDetails) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ is_active: !user.is_active })
                .eq('id', user.id);

            if (error) throw error;

            // Audit log
            logAuditEvent({
                action: !user.is_active ? 'activate_user' : 'deactivate_user',
                entity_type: 'user_profiles',
                entity_id: user.id,
                entity_name: user.full_name || user.email,
                old_values: { is_active: user.is_active },
                new_values: { is_active: !user.is_active },
            });

            toast({
                title: isAr ? 'تم التحديث' : 'Updated',
                description: isAr
                    ? `تم ${!user.is_active ? 'تفعيل' : 'تعطيل'} المستخدم`
                    : `User ${!user.is_active ? 'activated' : 'deactivated'}`,
            });
            loadData();
        } catch (error) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: isAr ? 'فشل تحديث حالة المستخدم' : 'Failed to update user status',
                variant: 'destructive',
            });
        }
    };

    // Delete user
    const handleDeleteUser = async (user: UserWithDetails) => {
        const confirmMsg = isAr
            ? `هل أنت متأكد من حذف المستخدم "${user.full_name || user.email}"?\n\nسيتم حذف الحساب والأدوار والموارد نهائياً.`
            : `Are you sure you want to delete "${user.full_name || user.email}"?\n\nThis will permanently remove the account, roles, and resources.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            // Delete user_resource_access
            await supabase
                .from('user_resource_access')
                .delete()
                .eq('user_id', user.id);

            // Delete user_roles
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', user.id);

            // Delete user_profile (CASCADE from auth.users FK handles this too)
            await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id);

            // Try to delete from auth.users via RPC
            try { await supabase.rpc('delete_auth_user', { p_user_id: user.id }); } catch { /* ignore */ }

            // Audit log
            logAuditEvent({
                action: 'delete_user',
                entity_type: 'user_profiles',
                entity_id: user.id,
                entity_name: user.full_name || user.email,
                old_values: { email: user.email, roles: user.roles.map(r => r.code) },
            });

            toast({
                title: isAr ? '✅ تم الحذف' : '✅ Deleted',
                description: isAr
                    ? `تم حذف المستخدم ${user.full_name || user.email}`
                    : `User ${user.full_name || user.email} deleted`,
            });

            loadData();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: isAr ? 'فشل حذف المستخدم' : 'Failed to delete user',
                variant: 'destructive',
            });
        }
    };

    // Save user (Add or Edit)
    const handleSaveUser = async () => {
        try {
            setSaving(true);

            if (isAddMode) {
                // ─── ADD MODE: Create/invite user via Edge Function ───────
                if (!formData.email) {
                    toast({
                        title: isAr ? 'خطأ' : 'Error',
                        description: isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required',
                        variant: 'destructive',
                    });
                    return;
                }

                const targetCompany = formData.selectedCompany || companyId;

                // ✅ Call Edge Function (creates user + profile + roles + sends welcome email)
                const { data: fnResult, error: fnError } = await cloudSupabase.functions.invoke('invite-user', {
                    body: {
                        email: formData.email,
                        full_name: formData.full_name || null,
                        phone: formData.phone || null,
                        company_id: targetCompany || null,
                        tenant_id: tenantId || null,
                        role_ids: formData.selectedRoles,
                        branch_ids: formData.selectedBranches,
                        primary_branch_id: formData.primaryBranch || null,
                        warehouse_ids: formData.selectedWarehouses,
                        fund_ids: formData.selectedFunds,
                        redirect_url: window.location.origin + '/',
                    },
                });

                if (fnError) {
                    // Extract actual error message from Edge Function response body
                    let errorMsg = 'فشل في استدعاء خدمة الدعوة';
                    try {
                        if (fnError.context?.body) {
                            const errorBody = await fnError.context.json();
                            errorMsg = errorBody?.error || errorBody?.message || errorMsg;
                        } else if (fnResult?.error) {
                            errorMsg = fnResult.error;
                        }
                    } catch { /* use default */ }
                    console.error('[InviteUser] Edge Function error:', fnError, 'Parsed:', errorMsg);
                    throw new Error(errorMsg);
                }

                // Parse response (Edge Function returns JSON body)
                const result = fnResult as { success: boolean; message?: string; error?: string; data?: { user_id: string; is_new: boolean; email_sent: boolean } };

                if (!result?.success) {
                    throw new Error(result?.error || 'فشل في إضافة المستخدم');
                }

                const userId = result.data?.user_id;
                const isNewUser = result.data?.is_new ?? true;
                const emailSent = result.data?.email_sent ?? false;

                toast({
                    title: isAr ? '✅ تم الإضافة' : '✅ User Added',
                    description: isAr
                        ? isNewUser
                            ? `تم إنشاء المستخدم ${formData.email}${emailSent ? ' وإرسال دعوة بالبريد ✉️' : ''}`
                            : `تم تحديث المستخدم ${formData.email}`
                        : isNewUser
                            ? `User ${formData.email} created${emailSent ? ' — invitation email sent ✉️' : ''}`
                            : `User ${formData.email} updated successfully`,
                });

                if (emailSent) {
                    toast({
                        title: isAr ? '📧 تم إرسال بريد الترحيب' : '📧 Welcome Email Sent',
                        description: isAr
                            ? `تم إرسال رسالة ترحيب مع رابط الدخول إلى ${formData.email}`
                            : `Welcome email with login link sent to ${formData.email}`,
                    });
                }

                // Audit log
                logAuditEvent({
                    action: 'create_user',
                    entity_type: 'user_profiles',
                    entity_id: userId || '',
                    entity_name: formData.full_name || formData.email,
                    new_values: {
                        email: formData.email,
                        roles: formData.selectedRoles.length,
                        is_new: isNewUser,
                        email_sent: emailSent,
                    },
                });

            } else if (editingUser) {
                // ─── EDIT MODE: Update existing user ─────────────

                // Update is_active + require_mfa status
                const profileUpdates: Record<string, any> = {};
                if (editingUser.is_active !== formData.is_active) {
                    profileUpdates.is_active = formData.is_active;
                }
                // 🔐 Sync 2FA requirement to user_profiles
                profileUpdates.two_factor_enabled = formData.require_mfa || false;
                
                if (Object.keys(profileUpdates).length > 0) {
                    await supabase
                        .from('user_profiles')
                        .update(profileUpdates)
                        .eq('id', editingUser.id);
                }

                // 🔐 Sync mfa_user_settings table
                await supabase
                    .from('mfa_user_settings')
                    .upsert({
                        user_id: editingUser.id,
                        is_enabled: formData.require_mfa || false,
                        totp_verified: formData.require_mfa || false,
                        preferred_method: 'totp',
                    });

                // Update roles: remove all, then re-add
                const { error: removeError } = await supabase
                    .from('user_roles')
                    .delete()
                    .eq('user_id', editingUser.id);

                if (removeError) throw removeError;

                if (formData.selectedRoles.length > 0) {
                    const { error: insertError } = await supabase
                        .from('user_roles')
                        .insert(
                            formData.selectedRoles.map(roleId => ({
                                user_id: editingUser.id,
                                role_id: roleId,
                                is_active: true,
                            }))
                        );
                    if (insertError) throw insertError;
                }

                // Update resource access
                await updateResourceAccess(editingUser.id, 'branch', formData.selectedBranches, formData.primaryBranch);
                await updateResourceAccess(editingUser.id, 'warehouse', formData.selectedWarehouses);
                await updateResourceAccess(editingUser.id, 'cash_account', formData.selectedFunds);

                toast({
                    title: isAr ? 'تم الحفظ' : 'Saved',
                    description: isAr ? 'تم تحديث إعدادات المستخدم' : 'User settings updated',
                });

                // Audit log
                logAuditEvent({
                    action: 'update_user_roles',
                    entity_type: 'user_profiles',
                    entity_id: editingUser.id,
                    entity_name: editingUser.full_name || editingUser.email,
                    new_values: {
                        roles: formData.selectedRoles.length,
                        branches: formData.selectedBranches.length,
                        is_active: formData.is_active,
                    },
                });
            }

            setIsSheetOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving user:', error);
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: isAr ? 'فشل حفظ البيانات' : 'Failed to save data',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Helper to update resource access
    const updateResourceAccess = async (
        userId: string,
        resourceType: string,
        resourceIds: string[],
        primaryId?: string
    ) => {
        // Remove existing
        await supabase
            .from('user_resource_access')
            .delete()
            .eq('user_id', userId)
            .eq('resource_type', resourceType);

        // Add new
        if (resourceIds.length > 0) {
            await supabase
                .from('user_resource_access')
                .insert(
                    resourceIds.map(resourceId => ({
                        user_id: userId,
                        resource_type: resourceType,
                        resource_id: resourceId,
                        is_primary: resourceId === primaryId,
                        can_read: true,
                        can_write: true,
                    }))
                );
        }
    };

    // Toggle role
    const toggleRole = (roleId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedRoles: prev.selectedRoles.includes(roleId)
                ? prev.selectedRoles.filter(id => id !== roleId)
                : [...prev.selectedRoles, roleId],
        }));
    };

    // Toggle resource
    const toggleResource = (type: 'branches' | 'warehouses' | 'funds', resourceId: string) => {
        const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof formData;
        setFormData(prev => {
            const current = prev[key] as string[];
            return {
                ...prev,
                [key]: current.includes(resourceId)
                    ? current.filter(id => id !== resourceId)
                    : [...current, resourceId],
            };
        });
    };

    // Get user initials
    const getUserInitials = (user: UserWithDetails) => {
        if (user.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user.email.slice(0, 2).toUpperCase();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-tajawal flex items-center gap-2">
                            <Users className="w-5 h-5 text-erp-teal" />
                            {language === 'ar' ? 'إدارة المستخدمين' : 'Users Management'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'تعيين الأدوار وربط الموارد للمستخدمين'
                                : 'Assign roles and link resources to users'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleAddUser}
                            className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-tajawal"
                        >
                            <UserPlus className="w-4 h-4" />
                            {isAr ? 'إضافة مستخدم' : 'Add User'}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadData}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Search + Role Filter */}
                <div className="flex items-center gap-3 mt-4">
                    <div className="relative flex-1">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder={language === 'ar' ? 'البحث عن مستخدم...' : 'Search users...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ps-10 font-tajawal"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px] h-9 text-sm font-tajawal">
                            <Shield className="w-4 h-4 me-1 text-gray-400" />
                            <SelectValue placeholder={isAr ? 'كل الأدوار' : 'All Roles'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-tajawal">
                                {isAr ? 'كل الأدوار' : 'All Roles'}
                            </SelectItem>
                            <SelectItem value="no_role" className="font-tajawal text-gray-400">
                                {isAr ? 'بدون دور' : 'No Role'}
                            </SelectItem>
                            {roles.map(role => (
                                <SelectItem key={role.id} value={role.code} className="font-tajawal">
                                    {isAr ? role.name_ar : (role.name_en || role.name_ar)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {companies.length > 1 && (
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                            <SelectTrigger className="w-[180px] h-9 text-sm font-tajawal">
                                <Building2 className="w-4 h-4 me-1 text-gray-400" />
                                <SelectValue placeholder={isAr ? 'كل الشركات' : 'All Companies'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-tajawal">
                                    {isAr ? 'كل الشركات' : 'All Companies'}
                                </SelectItem>
                                {companies.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-tajawal">
                                        {isAr ? c.name : (c.name_en || c.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Active filter info */}
                {(roleFilter !== 'all' || companyFilter !== 'all' || searchQuery) && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 font-tajawal">
                            {filteredUsers.length} {isAr ? 'نتيجة' : 'results'}
                        </span>
                        {roleFilter !== 'all' && (
                            <Badge
                                variant="secondary"
                                className="text-xs font-tajawal cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={() => setRoleFilter('all')}
                            >
                                {roleFilter === 'no_role'
                                    ? (isAr ? 'بدون دور' : 'No Role')
                                    : roles.find(r => r.code === roleFilter)?.[isAr ? 'name_ar' : 'name_en'] || roleFilter
                                }
                                <X className="w-3 h-3 ms-1" />
                            </Badge>
                        )}
                        {companyFilter !== 'all' && (
                            <Badge
                                variant="secondary"
                                className="text-xs font-tajawal cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                                onClick={() => setCompanyFilter('all')}
                            >
                                {companies.find(c => c.id === companyFilter)?.[isAr ? 'name' : 'name_en'] || companyFilter}
                                <X className="w-3 h-3 ms-1" />
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'المستخدم' : 'User'}
                                    </TableHead>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'الأدوار' : 'Roles'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-center hidden md:table-cell">
                                        {language === 'ar' ? 'الحالة' : 'Status'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-end">
                                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredUsers.map((user) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback className="bg-erp-navy text-white text-sm">
                                                            {getUserInitials(user)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium font-tajawal truncate">
                                                            {user.full_name || user.email}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.slice(0, 2).map((role) => (
                                                        <Badge key={role.id} variant="outline" className="text-xs font-tajawal">
                                                            {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                                        </Badge>
                                                    ))}
                                                    {user.roles.length > 2 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{user.roles.length - 2}
                                                        </Badge>
                                                    )}
                                                    {user.roles.length === 0 && (
                                                        <span className="text-xs text-gray-400 font-tajawal">
                                                            {language === 'ar' ? 'بدون دور' : 'No role'}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center hidden md:table-cell">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Switch
                                                        checked={user.is_active}
                                                        onCheckedChange={() => handleToggleUserStatus(user)}

                                                    />
                                                    <span className={`text-xs font-tajawal ${user.is_active ? 'text-teal-600' : 'text-gray-400'}`}>
                                                        {user.is_active
                                                            ? (isAr ? 'نشط' : 'Active')
                                                            : (isAr ? 'معطل' : 'Inactive')}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditUser(user)}
                                                        className="gap-2"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        <span className="hidden sm:inline font-tajawal">
                                                            {language === 'ar' ? 'تعديل' : 'Edit'}
                                                        </span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Add/Edit Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-xl flex flex-col p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                        <SheetTitle className="font-tajawal">
                            {isAddMode
                                ? (isAr ? 'دعوة مستخدم جديد' : 'Invite New User')
                                : (isAr ? 'تعديل إعدادات المستخدم' : 'Edit User Settings')}
                        </SheetTitle>
                        <SheetDescription className="font-tajawal">
                            {isAddMode
                                ? (isAr ? 'أدخل بيانات المستخدم وسيتم إرسال دعوة بالبريد الإلكتروني' : 'Enter user details — an invitation email will be sent')
                                : (editingUser?.full_name || editingUser?.email)}
                        </SheetDescription>
                    </SheetHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                        {/* ─── User Info Section ──────────────────── */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {isAr ? 'بيانات المستخدم' : 'User Information'}
                            </h3>

                            {isAddMode ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-tajawal">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="user@example.com"
                                                className="font-mono text-sm"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-tajawal">{isAr ? 'الاسم الكامل' : 'Full Name'}</Label>
                                            <Input
                                                value={formData.full_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                                placeholder={isAr ? 'اسم المستخدم' : 'User Name'}
                                                className="font-tajawal"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-tajawal">{isAr ? 'رقم الهاتف' : 'Phone Number'}</Label>
                                        <Input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="+90 5XX XXX XX XX"
                                            className="font-mono text-sm"
                                            dir="ltr"
                                        />
                                        <p className="text-xs text-gray-400 font-tajawal">
                                            {isAr ? 'لإشعارات التلغرام — يجب على المستخدم بدء محادثة مع البوت أولاً' : 'For Telegram notifications — user must start bot conversation first'}
                                        </p>
                                    </div>

                                    {/* Company selection (for multi-company tenants) */}
                                    {companies.length > 1 && (
                                        <div className="space-y-2">
                                            <Label className="font-tajawal">{isAr ? 'الشركة' : 'Company'}</Label>
                                            <Select
                                                value={formData.selectedCompany}
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, selectedCompany: val }))}
                                            >
                                                <SelectTrigger className="font-tajawal">
                                                    <SelectValue placeholder={isAr ? 'اختر الشركة' : 'Select company'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {companies.map(c => (
                                                        <SelectItem key={c.id} value={c.id} className="font-tajawal">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="w-4 h-4 text-blue-500" />
                                                                {isAr ? c.name : (c.name_en || c.name)}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Edit mode — show user info card */
                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={editingUser?.avatar_url} />
                                            <AvatarFallback className="bg-erp-navy text-white">
                                                {editingUser ? getUserInitials(editingUser) : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium font-tajawal">{editingUser?.full_name || '—'}</p>
                                            <p className="text-xs text-gray-400" dir="ltr">{editingUser?.email}</p>
                                        </div>
                                    </div>
                                    {/* Active status toggle */}
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <Label className="text-sm font-tajawal text-gray-600">
                                            {isAr ? 'حالة المستخدم' : 'User Status'}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={formData.is_active}
                                                onCheckedChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
                                            />
                                            <span className={`text-xs font-tajawal ${formData.is_active ? 'text-teal-600' : 'text-gray-400'}`}>
                                                {formData.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── Security: MFA / Two-Factor Auth ────── */}
                        <div className="space-y-3">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-500" />
                                {isAr ? 'الأمان' : 'Security'}
                            </h3>
                            <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-amber-600" />
                                        <Label className="text-sm font-tajawal text-gray-700 dark:text-gray-300">
                                            {isAr ? 'التحقق بخطوتين (2FA)' : 'Two-Factor Authentication (2FA)'}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={formData.require_mfa || false}
                                            onCheckedChange={(val) => setFormData(prev => ({ ...prev, require_mfa: val }))}
                                        />
                                        <span className={`text-xs font-tajawal ${formData.require_mfa ? 'text-amber-600' : 'text-gray-400'}`}>
                                            {formData.require_mfa ? (isAr ? 'إلزامي' : 'Required') : (isAr ? 'اختياري' : 'Optional')}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-tajawal">
                                    {isAr
                                        ? 'عند التفعيل، سيُطلب من المستخدم إعداد التحقق بخطوتين عند أول تسجيل دخول'
                                        : 'When enabled, user must set up 2FA on first login'}
                                </p>
                            </div>
                        </div>

                        {/* User Groups (Roles) */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                {isAr ? 'مجموعات المستخدمين' : 'User Groups'}
                            </h3>
                            <ScrollArea className="h-48 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {roles.map(role => (
                                        <div
                                            key={role.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={formData.selectedRoles.includes(role.id)}
                                                onCheckedChange={() => toggleRole(role.id)}
                                            />
                                            <Label
                                                htmlFor={`role-${role.id}`}
                                                className="flex-1 cursor-pointer text-gray-900 dark:text-white"
                                            >
                                                <span className="font-tajawal">
                                                    {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                                </span>
                                                <code className="text-xs text-gray-400 ms-2">{role.code}</code>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Branches */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <GitBranch className="w-4 h-4" />
                                {language === 'ar' ? 'الفروع' : 'Branches'}
                            </h3>
                            <ScrollArea className="h-36 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {branches.map(branch => (
                                        <div
                                            key={branch.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`branch-${branch.id}`}
                                                checked={formData.selectedBranches.includes(branch.id)}
                                                onCheckedChange={() => toggleResource('branches', branch.id)}
                                            />
                                            <Label
                                                htmlFor={`branch-${branch.id}`}
                                                className="flex-1 font-tajawal cursor-pointer text-gray-900 dark:text-white"
                                            >
                                                {language === 'ar' ? branch.name_ar : branch.name_en || branch.name_ar}
                                            </Label>
                                            {formData.selectedBranches.includes(branch.id) && (
                                                <Button
                                                    variant={formData.primaryBranch === branch.id ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setFormData(prev => ({ ...prev, primaryBranch: branch.id }))}
                                                    className="text-xs"
                                                >
                                                    {language === 'ar' ? 'رئيسي' : 'Primary'}
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {branches.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4 font-tajawal">
                                            {language === 'ar' ? 'لا توجد فروع' : 'No branches'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Warehouses */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Warehouse className="w-4 h-4" />
                                {language === 'ar' ? 'المستودعات' : 'Warehouses'}
                            </h3>
                            <ScrollArea className="h-36 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {warehouses.map(warehouse => (
                                        <div
                                            key={warehouse.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`warehouse-${warehouse.id}`}
                                                checked={formData.selectedWarehouses.includes(warehouse.id)}
                                                onCheckedChange={() => toggleResource('warehouses', warehouse.id)}
                                            />
                                            <Label
                                                htmlFor={`warehouse-${warehouse.id}`}
                                                className="flex-1 font-tajawal cursor-pointer text-gray-900 dark:text-white"
                                            >
                                                {language === 'ar' ? warehouse.name_ar : warehouse.name_en || warehouse.name_ar}
                                            </Label>
                                        </div>
                                    ))}
                                    {warehouses.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4 font-tajawal">
                                            {language === 'ar' ? 'لا توجد مستودعات' : 'No warehouses'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Funds */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Wallet className="w-4 h-4" />
                                {language === 'ar' ? 'الصناديق والبنوك' : 'Cash & Banks'}
                            </h3>
                            <ScrollArea className="h-36 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {funds.map(fund => (
                                        <div
                                            key={fund.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`fund-${fund.id}`}
                                                checked={formData.selectedFunds.includes(fund.id)}
                                                onCheckedChange={() => toggleResource('funds', fund.id)}
                                            />
                                            <Label
                                                htmlFor={`fund-${fund.id}`}
                                                className="flex-1 font-tajawal cursor-pointer text-gray-900 dark:text-white"
                                            >
                                                {language === 'ar' ? fund.name_ar : fund.name_en || fund.name_ar}
                                                <code className="text-xs text-gray-400 ms-2">{fund.code}</code>
                                            </Label>
                                        </div>
                                    ))}
                                    {funds.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4 font-tajawal">
                                            {language === 'ar' ? 'لا توجد صناديق' : 'No funds'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* ─── Sticky Footer ────────────────────────── */}
                    <div className="flex-shrink-0 border-t px-6 py-4 bg-white dark:bg-gray-950 flex items-center justify-between gap-3">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)} className="font-tajawal">
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        {isAddMode ? (
                            <Button
                                onClick={handleSaveUser}
                                disabled={saving || !formData.email}
                                className="gap-2 font-tajawal bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Mail className="w-4 h-4" />
                                )}
                                {isAr ? 'إرسال الدعوة' : 'Send Invitation'}
                            </Button>
                        ) : (
                            <Button onClick={handleSaveUser} disabled={saving} className="gap-2 font-tajawal">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                            </Button>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </Card>
    );
}
