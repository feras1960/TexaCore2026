/**
 * RBAC Service - Role-Based Access Control
 * خدمة إدارة الصلاحيات والأدوار
 * 
 * @module services/rbacService
 * @description Comprehensive RBAC service for managing roles, permissions,
 * user assignments, resource access, and visibility rules.
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════

export type Permission = 'read' | 'write' | 'delete';
export type RoleLevel = 'system' | 'tenant' | 'company' | 'branch' | 'operations' | 'custom';
export type ResourceType = 'branch' | 'warehouse' | 'cash_account' | 'bank_account' | 'cost_center';
export type VisibilityRuleType = 'page' | 'field' | 'module' | 'report' | 'action';

// Special Permissions — 14 granular permissions per role
export type SpecialPermissionKey =
    | 'can_edit_posted_purchase'
    | 'can_edit_posted_sale'
    | 'can_edit_posted_journal'
    | 'can_delete_posted'
    | 'can_unpost'
    | 'can_edit_closed_period'
    | 'can_view_audit_log'
    | 'can_view_all_branches'
    | 'can_manage_roles'
    | 'can_approve_transactions'
    | 'can_view_cost_prices'
    | 'can_view_profit_margins'
    | 'can_export_data'
    | 'can_manage_containers';

export type SpecialPermissions = Partial<Record<SpecialPermissionKey, boolean>>;

// All special permission keys with labels (for UI)
export const SPECIAL_PERMISSIONS_KEYS: Array<{ key: SpecialPermissionKey; name_ar: string; name_en: string; category: string }> = [
    { key: 'can_edit_posted_purchase', name_ar: 'تعديل مشتريات مرحلة', name_en: 'Edit Posted Purchase', category: 'documents' },
    { key: 'can_edit_posted_sale', name_ar: 'تعديل مبيعات مرحلة', name_en: 'Edit Posted Sale', category: 'documents' },
    { key: 'can_edit_posted_journal', name_ar: 'تعديل قيود مرحلة', name_en: 'Edit Posted Journal', category: 'documents' },
    { key: 'can_delete_posted', name_ar: 'حذف مستندات مرحلة', name_en: 'Delete Posted Documents', category: 'documents' },
    { key: 'can_unpost', name_ar: 'إلغاء ترحيل المستندات', name_en: 'Unpost Documents', category: 'documents' },
    { key: 'can_edit_closed_period', name_ar: 'تعديل فترة مغلقة', name_en: 'Edit Closed Period', category: 'accounting' },
    { key: 'can_view_audit_log', name_ar: 'عرض سجل التدقيق', name_en: 'View Audit Log', category: 'system' },
    { key: 'can_view_all_branches', name_ar: 'عرض جميع الفروع', name_en: 'View All Branches', category: 'system' },
    { key: 'can_manage_roles', name_ar: 'إدارة الأدوار', name_en: 'Manage Roles', category: 'system' },
    { key: 'can_approve_transactions', name_ar: 'اعتماد المعاملات', name_en: 'Approve Transactions', category: 'operations' },
    { key: 'can_view_cost_prices', name_ar: 'عرض أسعار التكلفة', name_en: 'View Cost Prices', category: 'financial' },
    { key: 'can_view_profit_margins', name_ar: 'عرض هوامش الربح', name_en: 'View Profit Margins', category: 'financial' },
    { key: 'can_export_data', name_ar: 'تصدير البيانات', name_en: 'Export Data', category: 'operations' },
    { key: 'can_manage_containers', name_ar: 'إدارة الحاويات', name_en: 'Manage Containers', category: 'operations' },
];

export interface Role {
    id: string;
    tenant_id?: string;
    company_id?: string;
    code: string;
    name_ar: string;
    name_en?: string;
    description?: string;
    level: RoleLevel;
    permissions: Record<string, Permission[]>;
    special_permissions?: SpecialPermissions;
    is_system: boolean;
    is_custom: boolean;
    can_be_deleted: boolean;
    display_order: number;
    icon?: string;
    color?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface UserRole {
    id: string;
    user_id: string;
    role_id: string;
    tenant_id?: string;
    company_id?: string;
    assigned_by?: string;
    assigned_at: string;
    expires_at?: string;
    is_active: boolean;
    notes?: string;
    // Joined data
    role?: Role;
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface RoleDelegation {
    id: string;
    tenant_id?: string;
    company_id?: string;
    delegator_role_id: string;
    delegatee_role_id: string;
    can_create_roles: boolean;
    can_manage_users: boolean;
    can_assign_roles: boolean;
    can_remove_roles: boolean;
    max_delegable_level: string;
    restrictions: Record<string, any>;
    created_by?: string;
    created_at: string;
    // Joined data
    delegator_role?: Role;
    delegatee_role?: Role;
}

export interface VisibilityRule {
    id: string;
    tenant_id?: string;
    company_id?: string;
    rule_type: VisibilityRuleType;
    target_type: string;
    target_name: string;
    visible_to_roles: string[];
    hidden_from_roles: string[];
    mask_value?: string;
    is_active: boolean;
    priority: number;
    description?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface UserResourceAccess {
    id: string;
    user_id: string;
    tenant_id?: string;
    company_id?: string;
    resource_type: ResourceType;
    resource_id: string;
    permissions: {
        read?: boolean;
        write?: boolean;
        delete?: boolean;
        manage?: boolean;
    };
    is_primary: boolean;
    assigned_by?: string;
    assigned_at: string;
    expires_at?: string;
    notes?: string;
    // Joined data based on resource_type
    resource?: {
        id: string;
        name: string;
        code?: string;
    };
}

export interface CreateRoleDTO {
    code: string;
    name_ar: string;
    name_en?: string;
    description?: string;
    level?: RoleLevel;
    permissions: Record<string, Permission[]>;
    special_permissions?: SpecialPermissions;
    tenant_id?: string;
    company_id?: string;
    icon?: string;
    color?: string;
}

export interface UpdateRoleDTO {
    name_ar?: string;
    name_en?: string;
    description?: string;
    permissions?: Record<string, Permission[]>;
    special_permissions?: SpecialPermissions;
    icon?: string;
    color?: string;
}

export interface AssignRoleDTO {
    user_id: string;
    role_id: string;
    company_id?: string;
    expires_at?: string;
    notes?: string;
}

export interface CreateVisibilityRuleDTO {
    rule_type: VisibilityRuleType;
    target_type: string;
    target_name: string;
    visible_to_roles: string[];
    hidden_from_roles?: string[];
    mask_value?: string;
    description?: string;
    priority?: number;
}

export interface AssignResourceDTO {
    user_id: string;
    resource_type: ResourceType;
    resource_id: string;
    permissions?: {
        read?: boolean;
        write?: boolean;
        delete?: boolean;
        manage?: boolean;
    };
    is_primary?: boolean;
    notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// Module List for Permissions
// ═══════════════════════════════════════════════════════════════

export const AVAILABLE_MODULES = [
    { code: 'dashboard', name_ar: 'لوحة التحكم', name_en: 'Dashboard', icon: 'LayoutDashboard' },
    { code: 'accounting', name_ar: 'المحاسبة', name_en: 'Accounting', icon: 'Calculator' },
    { code: 'treasury', name_ar: 'الخزينة', name_en: 'Treasury', icon: 'Wallet' },
    { code: 'sales', name_ar: 'المبيعات', name_en: 'Sales', icon: 'ShoppingBag' },
    { code: 'purchases', name_ar: 'المشتريات', name_en: 'Purchases', icon: 'ShoppingCart' },
    { code: 'inventory', name_ar: 'المخزون', name_en: 'Inventory', icon: 'Package' },
    { code: 'warehouse', name_ar: 'المستودعات', name_en: 'Warehouses', icon: 'Warehouse' },
    { code: 'fabric', name_ar: 'الأقمشة', name_en: 'Fabric', icon: 'Scissors' },
    { code: 'pharmacy', name_ar: 'الصيدلية', name_en: 'Pharmacy', icon: 'Pill' },
    { code: 'healthcare', name_ar: 'الرعاية الصحية', name_en: 'Healthcare', icon: 'Heart' },
    { code: 'doctors', name_ar: 'عيادات الأطباء', name_en: 'Doctors', icon: 'Stethoscope' },
    { code: 'restaurant', name_ar: 'المطاعم', name_en: 'Restaurant', icon: 'UtensilsCrossed' },
    { code: 'gold', name_ar: 'الذهب والمجوهرات', name_en: 'Gold', icon: 'Gem' },
    { code: 'shipments', name_ar: 'الشحنات', name_en: 'Shipments', icon: 'Ship' },
    { code: 'crm', name_ar: 'علاقات العملاء', name_en: 'CRM', icon: 'Users' },
    { code: 'pos', name_ar: 'نقاط البيع', name_en: 'Point of Sale', icon: 'Monitor' },
    { code: 'real_estate', name_ar: 'العقارات', name_en: 'Real Estate', icon: 'Building' },
    { code: 'exchange', name_ar: 'الصرافة', name_en: 'Exchange', icon: 'DollarSign' },
    { code: 'manufacturing', name_ar: 'التصنيع', name_en: 'Manufacturing', icon: 'Factory' },
    { code: 'hr', name_ar: 'الموارد البشرية', name_en: 'HR', icon: 'UserCircle' },
    { code: 'e-commerce', name_ar: 'التجارة الإلكترونية', name_en: 'E-Commerce', icon: 'ShoppingCart' },
    { code: 'pbx', name_ar: 'المقسم السحابي', name_en: 'Cloud PBX', icon: 'Phone' },
    { code: 'saas', name_ar: 'إدارة المنصة', name_en: 'SaaS', icon: 'Cloud' },
    { code: 'ai_analytics', name_ar: 'تحليلات الذكاء الاصطناعي', name_en: 'AI Analytics', icon: 'Brain' },
    { code: 'activity_log', name_ar: 'سجل النشاط', name_en: 'Activity Log', icon: 'History' },
    { code: 'system_config', name_ar: 'إعدادات النظام', name_en: 'System Config', icon: 'Settings' },
    { code: 'reports', name_ar: 'التقارير', name_en: 'Reports', icon: 'FileText' },
] as const;

// ═══════════════════════════════════════════════════════════════
// RBAC Service
// ═══════════════════════════════════════════════════════════════

class RBACService {
    // ─────────────────────────────────────────────────────────────
    // Roles Management
    // ─────────────────────────────────────────────────────────────

    /**
     * Get all roles (optionally filtered)
     */
    async getRoles(filters?: {
        tenant_id?: string;
        company_id?: string;
        level?: RoleLevel;
        is_system?: boolean;
        include_system?: boolean;
    }): Promise<Role[]> {
        let query = supabase
            .from('roles')
            .select('*')
            .order('level', { ascending: true })
            .order('created_at', { ascending: true });

        // 🔒 Always hide super_admin (system level) from tenant users
        // Only platform SaaS panel should see system roles
        if (filters?.include_system !== true) {
            query = query.neq('level', 'system');
        }

        if (filters?.tenant_id) {
            query = query.or(`tenant_id.eq.${filters.tenant_id},tenant_id.is.null`);
        }
        if (filters?.company_id) {
            query = query.or(`company_id.eq.${filters.company_id},company_id.is.null`);
        }
        if (filters?.level) {
            query = query.eq('level', filters.level);
        }
        if (filters?.is_system !== undefined) {
            query = query.eq('is_system', filters.is_system);
        }
        if (filters?.include_system === false) {
            query = query.eq('is_system', false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Get a single role by ID
     */
    async getRole(id: string): Promise<Role | null> {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Create a new role
     */
    async createRole(data: CreateRoleDTO): Promise<Role> {
        const { data: user } = await supabase.auth.getUser();

        const { data: role, error } = await supabase
            .from('roles')
            .insert({
                ...data,
                is_custom: true,
                is_system: false,
                can_be_deleted: true,
                created_by: user?.user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return role;
    }

    /**
     * Update an existing role
     */
    async updateRole(id: string, data: UpdateRoleDTO): Promise<Role> {
        const { data: role, error } = await supabase
            .from('roles')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return role;
    }

    /**
     * Delete a role (only if can_be_deleted is true)
     */
    async deleteRole(id: string): Promise<void> {
        // First check if role can be deleted
        const role = await this.getRole(id);
        if (!role) throw new Error('Role not found');
        if (!role.can_be_deleted) throw new Error('This role cannot be deleted');

        const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Duplicate a role with a new code
     */
    async duplicateRole(id: string, newCode: string, newNameAr: string): Promise<Role> {
        const sourceRole = await this.getRole(id);
        if (!sourceRole) throw new Error('Source role not found');

        return this.createRole({
            code: newCode,
            name_ar: newNameAr,
            name_en: sourceRole.name_en ? `${sourceRole.name_en} (Copy)` : undefined,
            description: sourceRole.description,
            level: 'custom',
            permissions: sourceRole.permissions,
            tenant_id: sourceRole.tenant_id,
            company_id: sourceRole.company_id,
            icon: sourceRole.icon,
            color: sourceRole.color,
        });
    }

    // ─────────────────────────────────────────────────────────────
    // User Roles Management
    // ─────────────────────────────────────────────────────────────

    /**
     * Get roles assigned to a user
     * Uses separate queries to avoid PostgREST FK cache issues
     */
    async getUserRoles(userId: string): Promise<UserRole[]> {
        try {
            // First try using the RPC function
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_roles', { p_user_id: userId });

            if (!rpcError && rpcData && rpcData.length > 0) {
                // Transform RPC result to UserRole format
                return rpcData.map((r: any) => ({
                    id: r.role_id,
                    user_id: userId,
                    role_id: r.role_id,
                    is_active: r.is_active,
                    role: {
                        id: r.role_id,
                        code: r.role_code,
                        name_ar: r.role_name_ar,
                        name_en: r.role_name_en,
                        level: r.role_level,
                    }
                }));
            }

            // Fallback: Use separate queries
            const { data: userRolesData, error: urError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (urError || !userRolesData || userRolesData.length === 0) {
                return [];
            }

            // Get role details separately
            const roleIds = userRolesData.map(ur => ur.role_id);
            const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select('*')
                .in('id', roleIds);

            if (rolesError) {
                console.warn('Could not load roles:', rolesError);
                return userRolesData;
            }

            // Map roles to user_roles
            const rolesMap = new Map(rolesData?.map(r => [r.id, r]) || []);
            return userRolesData.map(ur => ({
                ...ur,
                role: rolesMap.get(ur.role_id)
            }));
        } catch (error) {
            console.warn('getUserRoles error:', error);
            return [];
        }
    }

    /**
     * Get all user-role assignments (for admin view)
     * Uses separate queries to avoid PostgREST FK cache issues
     */
    async getAllUserRoles(filters?: {
        tenant_id?: string;
        company_id?: string;
        role_id?: string;
    }): Promise<UserRole[]> {
        try {
            // Build user_roles query
            let query = supabase
                .from('user_roles')
                .select('*')
                .eq('is_active', true);

            if (filters?.tenant_id) {
                query = query.eq('tenant_id', filters.tenant_id);
            }
            if (filters?.company_id) {
                query = query.eq('company_id', filters.company_id);
            }
            if (filters?.role_id) {
                query = query.eq('role_id', filters.role_id);
            }

            const { data: userRolesData, error: urError } = await query;
            if (urError || !userRolesData || userRolesData.length === 0) {
                return [];
            }

            // Get unique role IDs and user IDs
            const roleIds = [...new Set(userRolesData.map(ur => ur.role_id))];
            const userIds = [...new Set(userRolesData.map(ur => ur.user_id))];

            // Load roles and users separately
            const [rolesResult, usersResult] = await Promise.all([
                supabase.from('roles').select('*').in('id', roleIds),
                supabase.from('user_profiles').select('id, full_name, email, avatar_url').in('id', userIds)
            ]);

            // Create lookup maps
            const rolesMap = new Map((rolesResult.data || []).map(r => [r.id, r]));
            const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]));

            // Combine data
            return userRolesData.map(ur => ({
                ...ur,
                role: rolesMap.get(ur.role_id),
                user: usersMap.get(ur.user_id)
            }));
        } catch (error) {
            console.warn('getAllUserRoles error:', error);
            return [];
        }
    }

    /**
     * Assign a role to a user
     */
    async assignRoleToUser(data: AssignRoleDTO): Promise<UserRole> {
        const { data: user } = await supabase.auth.getUser();

        // Get company_id from user profile or tenant_id from role
        const [{ data: profile }, { data: role }] = await Promise.all([
            supabase.from('user_profiles').select('company_id').eq('id', data.user_id).maybeSingle(),
            supabase.from('roles').select('tenant_id').eq('id', data.role_id).single(),
        ]);

        const { data: userRole, error } = await supabase
            .from('user_roles')
            .insert({
                user_id: data.user_id,
                role_id: data.role_id,
                tenant_id: role?.tenant_id,
                company_id: data.company_id,
                expires_at: data.expires_at,
                notes: data.notes,
                assigned_by: user?.user?.id,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;
        return userRole;
    }

    /**
     * Remove a role from a user (soft delete - set is_active to false)
     */
    async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
        const { error } = await supabase
            .from('user_roles')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('role_id', roleId);

        if (error) throw error;
    }

    /**
     * Update user's roles (replace all)
     */
    async updateUserRoles(userId: string, roleIds: string[], companyId?: string): Promise<void> {
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('id', userId)
            .maybeSingle();

        // Deactivate all existing roles
        await supabase
            .from('user_roles')
            .update({ is_active: false })
            .eq('user_id', userId);

        // Insert new roles
        if (roleIds.length > 0) {
            const { error } = await supabase
                .from('user_roles')
                .insert(
                    roleIds.map(roleId => ({
                        user_id: userId,
                        role_id: roleId,
                        tenant_id: null,
                        company_id: companyId,
                        assigned_by: user?.user?.id,
                        is_active: true,
                    }))
                );

            if (error) throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Resource Access Management
    // ─────────────────────────────────────────────────────────────

    /**
     * Get user's resource access
     */
    async getUserResources(userId: string, type?: ResourceType): Promise<UserResourceAccess[]> {
        let query = supabase
            .from('user_resource_access')
            .select('*')
            .eq('user_id', userId);

        if (type) {
            query = query.eq('resource_type', type);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Assign a resource to a user
     */
    async assignResourceToUser(data: AssignResourceDTO): Promise<UserResourceAccess> {
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('id', data.user_id)
            .maybeSingle();

        const { data: access, error } = await supabase
            .from('user_resource_access')
            .upsert({
                user_id: data.user_id,
                resource_type: data.resource_type,
                resource_id: data.resource_id,
                permissions: data.permissions || { read: true },
                is_primary: data.is_primary || false,
                notes: data.notes,
                tenant_id: null,
                company_id: profile?.company_id,
                assigned_by: user?.user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return access;
    }

    /**
     * Remove resource access from a user
     */
    async removeResourceFromUser(userId: string, type: ResourceType, resourceId: string): Promise<void> {
        const { error } = await supabase
            .from('user_resource_access')
            .delete()
            .eq('user_id', userId)
            .eq('resource_type', type)
            .eq('resource_id', resourceId);

        if (error) throw error;
    }

    /**
     * Update all resource access for a user (replace)
     */
    async updateUserResources(
        userId: string,
        type: ResourceType,
        resources: Array<{ id: string; permissions?: Record<string, boolean>; is_primary?: boolean }>
    ): Promise<void> {
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('id', userId)
            .maybeSingle();

        // Delete existing resources of this type
        await supabase
            .from('user_resource_access')
            .delete()
            .eq('user_id', userId)
            .eq('resource_type', type);

        // Insert new resources
        if (resources.length > 0) {
            const { error } = await supabase
                .from('user_resource_access')
                .insert(
                    resources.map(r => ({
                        user_id: userId,
                        resource_type: type,
                        resource_id: r.id,
                        permissions: r.permissions || { read: true },
                        is_primary: r.is_primary || false,
                        tenant_id: null,
                        company_id: profile?.company_id,
                        assigned_by: user?.user?.id,
                    }))
                );

            if (error) throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Visibility Rules Management
    // ─────────────────────────────────────────────────────────────

    /**
     * Get visibility rules
     */
    async getVisibilityRules(filters?: {
        tenant_id?: string;
        company_id?: string;
        rule_type?: VisibilityRuleType;
    }): Promise<VisibilityRule[]> {
        let query = supabase
            .from('visibility_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (filters?.tenant_id) {
            query = query.eq('tenant_id', filters.tenant_id);
        }
        if (filters?.company_id) {
            query = query.or(`company_id.eq.${filters.company_id},company_id.is.null`);
        }
        if (filters?.rule_type) {
            query = query.eq('rule_type', filters.rule_type);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Create a visibility rule
     */
    async createVisibilityRule(data: CreateVisibilityRuleDTO, tenantId?: string, companyId?: string): Promise<VisibilityRule> {
        const { data: user } = await supabase.auth.getUser();

        const { data: rule, error } = await supabase
            .from('visibility_rules')
            .insert({
                ...data,
                tenant_id: tenantId,
                company_id: companyId,
                is_active: true,
                created_by: user?.user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return rule;
    }

    /**
     * Update a visibility rule
     */
    async updateVisibilityRule(id: string, data: Partial<CreateVisibilityRuleDTO>): Promise<VisibilityRule> {
        const { data: rule, error } = await supabase
            .from('visibility_rules')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return rule;
    }

    /**
     * Delete a visibility rule
     */
    async deleteVisibilityRule(id: string): Promise<void> {
        const { error } = await supabase
            .from('visibility_rules')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // ─────────────────────────────────────────────────────────────
    // Permission Checking
    // ─────────────────────────────────────────────────────────────

    /**
     * Check if user has a specific permission
     */
    async checkPermission(userId: string, module: string, permission: Permission): Promise<boolean> {
        const userRoles = await this.getUserRoles(userId);

        for (const ur of userRoles) {
            const role = ur.role;
            if (!role) continue;

            // Check for 'all' permission
            if (role.permissions?.all) return true;

            // Check specific module permission
            const modulePerms = role.permissions?.[module];
            if (modulePerms && modulePerms.includes(permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has access to a specific resource
     */
    async checkResourceAccess(
        userId: string,
        type: ResourceType,
        resourceId: string,
        permission: keyof UserResourceAccess['permissions'] = 'read'
    ): Promise<boolean> {
        const resources = await this.getUserResources(userId, type);

        const resource = resources.find(r => r.resource_id === resourceId);
        if (!resource) return false;

        return resource.permissions[permission] === true;
    }

    /**
     * Check if content should be visible to user
     */
    async checkVisibility(
        userId: string,
        ruleType: VisibilityRuleType,
        targetType: string,
        targetName: string
    ): Promise<boolean> {
        // Get user's role IDs
        const userRoles = await this.getUserRoles(userId);
        const userRoleIds = userRoles.map(ur => ur.role_id);

        // Get applicable visibility rule
        const { data: rules } = await supabase
            .from('visibility_rules')
            .select('*')
            .eq('rule_type', ruleType)
            .eq('target_type', targetType)
            .eq('target_name', targetName)
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .limit(1);

        // If no rule exists, content is visible
        if (!rules || rules.length === 0) return true;

        const rule = rules[0];

        // Check if user's roles are in visible_to_roles
        const isVisible = rule.visible_to_roles.some(
            (roleId: string) => userRoleIds.includes(roleId)
        );

        // Check if user's roles are in hidden_from_roles
        const isHidden = rule.hidden_from_roles?.some(
            (roleId: string) => userRoleIds.includes(roleId)
        ) || false;

        return isVisible && !isHidden;
    }

    /**
     * Get mask value for hidden field
     */
    async getMaskValue(targetType: string, targetName: string): Promise<string | null> {
        const { data } = await supabase
            .from('visibility_rules')
            .select('mask_value')
            .eq('rule_type', 'field')
            .eq('target_type', targetType)
            .eq('target_name', targetName)
            .eq('is_active', true)
            .single();

        return data?.mask_value || null;
    }

    // ─────────────────────────────────────────────────────────────
    // Delegation Management
    // ─────────────────────────────────────────────────────────────

    /**
     * Get delegations for a role
     */
    async getDelegations(roleId: string): Promise<RoleDelegation[]> {
        const { data, error } = await supabase
            .from('role_delegations')
            .select(`
        *,
        delegator_role:roles!delegator_role_id(*),
        delegatee_role:roles!delegatee_role_id(*)
      `)
            .eq('delegator_role_id', roleId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Create a delegation
     */
    async createDelegation(data: {
        delegator_role_id: string;
        delegatee_role_id: string;
        can_create_roles?: boolean;
        can_manage_users?: boolean;
        can_assign_roles?: boolean;
        can_remove_roles?: boolean;
        max_delegable_level?: string;
        restrictions?: Record<string, any>;
    }, tenantId?: string, companyId?: string): Promise<RoleDelegation> {
        const { data: user } = await supabase.auth.getUser();

        const { data: delegation, error } = await supabase
            .from('role_delegations')
            .insert({
                ...data,
                tenant_id: tenantId,
                company_id: companyId,
                created_by: user?.user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return delegation;
    }

    /**
     * Delete a delegation
     */
    async deleteDelegation(id: string): Promise<void> {
        const { error } = await supabase
            .from('role_delegations')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Check if user can delegate to another role
     */
    async canDelegateTo(userId: string, targetRoleId: string): Promise<boolean> {
        const userRoles = await this.getUserRoles(userId);

        for (const ur of userRoles) {
            const delegations = await this.getDelegations(ur.role_id);

            for (const d of delegations) {
                if (d.delegatee_role_id === targetRoleId && d.can_manage_users) {
                    return true;
                }
            }
        }

        return false;
    }

    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // Special Permissions
    // ─────────────────────────────────────────────────────────────

    /**
     * Check if user has a specific special permission.
     * Uses SQL function for best performance. Falls back to JS check.
     * super_admin always returns true.
     */
    async checkSpecialPermission(userId: string, permName: SpecialPermissionKey): Promise<boolean> {
        try {
            // Try SQL function first
            const { data, error } = await supabase
                .rpc('check_special_permission', {
                    p_user_id: userId,
                    p_perm_name: permName
                });

            if (!error && data !== null) {
                return !!data;
            }

            // Fallback: JS-based check
            console.warn('[RBAC] check_special_permission RPC failed, using fallback:', error?.message);
            const userRoles = await this.getUserRoles(userId);
            for (const ur of userRoles) {
                if (!ur.role) continue;
                // super_admin, tenant_owner, and company_owner always have all permissions
                if (['super_admin', 'tenant_owner', 'company_owner'].includes(ur.role.code)) return true;
                const sp = (ur.role as Role & { special_permissions?: SpecialPermissions }).special_permissions;
                if (sp && sp[permName] === true) return true;
            }
            return false;
        } catch (err) {
            console.error('[RBAC] checkSpecialPermission error:', err);
            return false;
        }
    }

    /**
     * Get all special permissions for a user (merged from all roles).
     * Uses SQL function for best performance. Falls back to JS merge.
     * super_admin returns all true.
     */
    async getUserSpecialPermissions(userId: string): Promise<SpecialPermissions> {
        try {
            // JS-based merge (SQL function not yet deployed)
            const userRoles = await this.getUserRoles(userId);
            const merged: SpecialPermissions = {};

            for (const ur of userRoles) {
                if (!ur.role) continue;
                // super_admin / tenant_owner / company_owner = all true
                if (['super_admin', 'tenant_owner', 'company_owner'].includes(ur.role.code)) {
                    const allTrue: SpecialPermissions = {};
                    SPECIAL_PERMISSIONS_KEYS.forEach(k => { allTrue[k.key] = true; });
                    return allTrue;
                }
                const sp = (ur.role as Role & { special_permissions?: SpecialPermissions }).special_permissions;
                if (sp) {
                    // Permissive merge: true overrides false
                    for (const [key, val] of Object.entries(sp)) {
                        if (val === true) {
                            merged[key as SpecialPermissionKey] = true;
                        } else if (!(key as SpecialPermissionKey in merged)) {
                            merged[key as SpecialPermissionKey] = val;
                        }
                    }
                }
            }
            return merged;
        } catch (err) {
            console.error('[RBAC] getUserSpecialPermissions error:', err);
            return {};
        }
    }

    /**
     * Update special permissions for a role
     */
    async updateRoleSpecialPermissions(roleId: string, specialPerms: SpecialPermissions): Promise<void> {
        const { error } = await supabase
            .from('roles')
            .update({ special_permissions: specialPerms })
            .eq('id', roleId);

        if (error) throw error;
    }

    // Utility Methods
    // ─────────────────────────────────────────────────────────────

    /**
     * Get user's effective permissions (merged from all roles)
     */
    async getUserEffectivePermissions(userId: string): Promise<Record<string, Permission[]>> {
        const userRoles = await this.getUserRoles(userId);
        const merged: Record<string, Set<Permission>> = {};

        for (const ur of userRoles) {
            const role = ur.role;
            if (!role) continue;

            // Handle 'all' permission
            if (role.permissions?.all) {
                return { all: ['read', 'write', 'delete'] };
            }

            // Merge permissions
            if (role.permissions) {
              for (const [module, perms] of Object.entries(role.permissions)) {
                if (!merged[module]) {
                    merged[module] = new Set();
                }
                (perms as Permission[]).forEach(p => merged[module].add(p));
              }
            }
        }

        // Convert Sets back to arrays
        const result: Record<string, Permission[]> = {};
        for (const [module, perms] of Object.entries(merged)) {
            result[module] = Array.from(perms);
        }

        return result;
    }

    /**
     * Get all resources accessible by user (grouped by type)
     */
    async getUserAccessibleResources(userId: string): Promise<Record<ResourceType, UserResourceAccess[]>> {
        const resources = await this.getUserResources(userId);

        const grouped: Record<ResourceType, UserResourceAccess[]> = {
            branch: [],
            warehouse: [],
            cash_account: [],
            bank_account: [],
            cost_center: [],
        };

        for (const r of resources) {
            grouped[r.resource_type].push(r);
        }

        return grouped;
    }

    // ─────────────────────────────────────────────────────────────
    // Brand & Module Visibility
    // ─────────────────────────────────────────────────────────────

    /**
     * Get all brands
     */
    async getBrands(): Promise<Brand[]> {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get brand by ID
     */
    async getBrand(id: string): Promise<Brand | null> {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get brand by code
     */
    async getBrandByCode(code: string): Promise<Brand | null> {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('code', code)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get company's brand
     */
    async getCompanyBrand(companyId: string): Promise<Brand | null> {
        const { data: company, error } = await supabase
            .from('companies')
            .select('brand_id')
            .eq('id', companyId)
            .single();

        if (error || !company?.brand_id) return null;
        return this.getBrand(company.brand_id);
    }

    /**
     * Get user's visible modules using the database function
     * This uses the SQL function `get_user_visible_modules` for better performance
     */
    async getUserVisibleModules(userId: string): Promise<string[]> {
        try {
            // Try to use the SQL function first (faster)
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_visible_modules', { p_user_id: userId });

            if (!rpcError && rpcData) {
                return rpcData as string[];
            }

            // Fallback: Get from user's roles directly
            const userRoles = await this.getUserRoles(userId);

            const roleModules = new Set<string>();
            let isSuperAdmin = false;
            for (const ur of userRoles) {
                const role = ur.role as RoleWithModules | undefined;
                if (role?.visible_modules) {
                    role.visible_modules.forEach(m => roleModules.add(m));
                }
                // Super admin sees all
                if (role?.permissions?.all || role?.code === 'super_admin') {
                    isSuperAdmin = true;
                }
            }

            if (isSuperAdmin) return ['all'];

            // If role has 'all' modules, return immediately (e.g. company_owner)
            if (roleModules.has('all')) return ['all'];

            // If no roles assigned, return at least dashboard
            if (roleModules.size === 0) {
                return ['dashboard'];
            }

            // ✅ Get tenant's active modules (from SaaS platform management)
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('company_id')
                .eq('id', userId)
                .maybeSingle();

            if (profile?.company_id) {
                // Fetch tenant_id from the company
                const { data: company } = await supabase
                    .from('companies')
                    .select('tenant_id')
                    .eq('id', profile.company_id)
                    .maybeSingle();

                if (company?.tenant_id) {
                    const { data: tenantMods } = await supabase
                        .from('tenant_modules')
                        .select('module_code')
                        .eq('tenant_id', company.tenant_id)
                        .eq('is_active', true);

                    if (tenantMods && tenantMods.length > 0) {
                        // Intersect: role modules ∩ tenant active modules
                        const tenantModSet = new Set(tenantMods.map(m => m.module_code));
                        return Array.from(roleModules).filter(m => tenantModSet.has(m));
                    }
                }
            }

            // Fallback: brand-based filtering
            if (profile?.company_id) {
                const brand = await this.getCompanyBrand(profile.company_id);
                if (brand?.available_modules?.length) {
                    const brandModules = new Set(brand.available_modules);
                    return Array.from(roleModules).filter(m => brandModules.has(m));
                }
            }

            // Return role modules if no tenant/brand restriction
            return Array.from(roleModules);
        } catch (error) {
            console.error('Error getting user visible modules:', error);
            return ['dashboard']; // Fallback to dashboard only
        }
    }

    /**
     * Check if user can see a specific module
     */
    async canSeeModule(userId: string, moduleCode: string): Promise<boolean> {
        const visibleModules = await this.getUserVisibleModules(userId);

        // Super admin sees all
        if (visibleModules.includes('all')) return true;

        return visibleModules.includes(moduleCode);
    }

    /**
     * Get role's visible modules
     */
    async getRoleVisibleModules(roleId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('roles')
            .select('visible_modules')
            .eq('id', roleId)
            .single();

        if (error) throw error;
        return (data as { visible_modules?: string[] })?.visible_modules || [];
    }

    /**
     * Update role's visible modules
     */
    async updateRoleVisibleModules(roleId: string, modules: string[]): Promise<void> {
        const { error } = await supabase
            .from('roles')
            .update({ visible_modules: modules })
            .eq('id', roleId);

        if (error) throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// Brand Interface
// ═══════════════════════════════════════════════════════════════

export interface Brand {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    description?: string;
    logo_url?: string;
    primary_color: string;
    secondary_color: string;
    available_modules: string[];
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

// Extended Role type with visible_modules
interface RoleWithModules extends Role {
    visible_modules?: string[];
}

// Export singleton instance
export const rbacService = new RBACService();
export default rbacService;

