/**
 * useRBAC Hook - Role-Based Access Control
 * هوك للتحقق من صلاحيات المستخدم
 * 
 * @module hooks/useRBAC
 * @description React hook for checking user permissions, resource access,
 * and visibility rules throughout the application.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
    rbacService,
    Role,
    Permission,
    ResourceType,
    UserResourceAccess,
    AVAILABLE_MODULES,
    SpecialPermissions,
    SpecialPermissionKey,
    SPECIAL_PERMISSIONS_KEYS
} from '@/services/rbacService';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface UseRBACReturn {
    // State
    loading: boolean;
    roles: Role[];
    userRoles: Role[];
    userPermissions: Record<string, Permission[]>;
    userResources: Record<ResourceType, UserResourceAccess[]>;
    visibleModules: string[];
    specialPermissions: SpecialPermissions;

    // Permission checks
    hasPermission: (module: string, permission: Permission) => boolean;
    hasAnyPermission: (module: string, permissions: Permission[]) => boolean;
    hasAllPermissions: (module: string, permissions: Permission[]) => boolean;

    // Resource checks
    hasResourceAccess: (type: ResourceType, resourceId: string, permission?: keyof UserResourceAccess['permissions']) => boolean;
    getAccessibleResourceIds: (type: ResourceType) => string[];
    getPrimaryResource: (type: ResourceType) => UserResourceAccess | undefined;

    // Visibility checks
    canSee: (target: string, type?: 'page' | 'field' | 'module') => boolean;
    canSeeModule: (moduleCode: string) => boolean;
    getMaskValue: (targetType: string, targetName: string) => string | null;

    // Special permission checks
    hasSpecialPermission: (permName: SpecialPermissionKey) => boolean;
    getSpecialPermissionKeys: () => typeof SPECIAL_PERMISSIONS_KEYS;

    // Role checks
    hasRole: (roleCode: string) => boolean;
    hasAnyRole: (roleCodes: string[]) => boolean;
    isPlatformAdmin: () => boolean; // super_admin only (platform owner)
    isAdmin: () => boolean;
    isTenantOwner: () => boolean;
    isCompanyAdmin: () => boolean;

    // Utilities
    refreshPermissions: () => Promise<void>;
    getModules: () => typeof AVAILABLE_MODULES;
}

// ═══════════════════════════════════════════════════════════════
// Visibility Cache (for performance)
// ═══════════════════════════════════════════════════════════════

interface VisibilityCache {
    [key: string]: {
        visible: boolean;
        maskValue?: string | null;
        timestamp: number;
    };
}

const visibilityCache: VisibilityCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════

export function useRBAC(): UseRBACReturn {
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<Role[]>([]);
    const [userRoles, setUserRoles] = useState<Role[]>([]);
    const [userPermissions, setUserPermissions] = useState<Record<string, Permission[]>>({});
    const [userResources, setUserResources] = useState<Record<ResourceType, UserResourceAccess[]>>({
        branch: [],
        warehouse: [],
        cash_account: [],
        bank_account: [],
        cost_center: [],
    });
    const [visibleModules, setVisibleModules] = useState<string[]>(['dashboard']);
    const [specialPermissions, setSpecialPermissions] = useState<SpecialPermissions>({});
    const [visibilityRules, setVisibilityRules] = useState<Map<string, { visible: boolean; maskValue?: string }>>(new Map());

    // Load user permissions on mount/user change
    const loadPermissions = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // ═══════════════════════════════════════════════════════════════
            // 🚀 PERFORMANCE: Run ALL queries in parallel instead of sequential
            // Previously: 5 sequential calls (~5s) → Now: parallel (~1s)
            // ═══════════════════════════════════════════════════════════════

            const [
                allRolesResult,
                userRoleAssignmentsResult,
                permissionsResult,
                resourcesResult,
                modulesResult,
                specialPermsResult
            ] = await Promise.all([
                // 1. Load all roles (non-critical)
                rbacService.getRoles().catch(e => {
                    console.warn('Could not load roles:', e);
                    return [] as Role[];
                }),
                // 2. Load user role assignments
                rbacService.getUserRoles(user.id).catch(e => {
                    console.warn('Could not load user roles:', e);
                    return [] as any[];
                }),
                // 3. Load effective permissions
                rbacService.getUserEffectivePermissions(user.id).catch(e => {
                    console.warn('Could not load permissions:', e);
                    return {} as Record<string, Permission[]>;
                }),
                // 4. Load accessible resources
                rbacService.getUserAccessibleResources(user.id).catch(e => {
                    console.warn('Could not load resources:', e);
                    return {
                        branch: [],
                        warehouse: [],
                        cash_account: [],
                        bank_account: [],
                        cost_center: [],
                    } as Record<ResourceType, UserResourceAccess[]>;
                }),
                // 5. Load visible modules
                rbacService.getUserVisibleModules(user.id).catch(e => {
                    console.warn('Could not load modules:', e);
                    return ['dashboard'] as string[];
                }),
                // 6. Load special permissions
                rbacService.getUserSpecialPermissions(user.id).catch(e => {
                    console.warn('Could not load special permissions:', e);
                    return {} as SpecialPermissions;
                }),
            ]);

            setRoles(allRolesResult);
            setUserRoles(userRoleAssignmentsResult.map(ur => ur.role).filter(Boolean) as Role[]);
            setUserPermissions(permissionsResult);
            setUserResources(resourcesResult);
            setVisibleModules(modulesResult.length > 0 ? modulesResult : ['dashboard']);
            setSpecialPermissions(specialPermsResult);

        } catch (error) {
            console.error('Failed to load RBAC permissions:', error);
            // Set default values so the app can still function
            setVisibleModules(['dashboard']);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!authLoading) {
            loadPermissions();
        }
    }, [authLoading, loadPermissions]);

    // ═══════════════════════════════════════════════════════════════
    // 🔄 Realtime: auto-refresh when admin changes modules or roles
    // ═══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!user?.id) return;

        // Get user's tenant_id first
        let tenantId: string | null = null;
        const getTenantAndSubscribe = async () => {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();
            tenantId = profile?.tenant_id;
            if (!tenantId) return;

            const channel = supabase
                .channel('rbac-realtime')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'tenant_modules',
                    filter: `tenant_id=eq.${tenantId}`,
                }, () => {
                    console.log('[RBAC] tenant_modules changed — refreshing...');
                    loadPermissions();
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'user_role_assignments',
                    filter: `user_id=eq.${user.id}`,
                }, () => {
                    console.log('[RBAC] user_role_assignments changed — refreshing...');
                    loadPermissions();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const cleanup = getTenantAndSubscribe();
        return () => {
            cleanup.then(unsub => unsub?.());
        };
    }, [user?.id, loadPermissions]);

    // ─────────────────────────────────────────────────────────────
    // Permission Checks
    // ─────────────────────────────────────────────────────────────

    const hasPermission = useCallback((module: string, permission: Permission): boolean => {
        // Check for 'all' permission (super admin)
        if (userPermissions.all) return true;

        // Check specific module
        const modulePerms = userPermissions[module];
        return modulePerms?.includes(permission) || false;
    }, [userPermissions]);

    const hasAnyPermission = useCallback((module: string, permissions: Permission[]): boolean => {
        return permissions.some(p => hasPermission(module, p));
    }, [hasPermission]);

    const hasAllPermissions = useCallback((module: string, permissions: Permission[]): boolean => {
        return permissions.every(p => hasPermission(module, p));
    }, [hasPermission]);

    // ─────────────────────────────────────────────────────────────
    // Resource Checks
    // ─────────────────────────────────────────────────────────────

    const hasResourceAccess = useCallback((
        type: ResourceType,
        resourceId: string,
        permission: keyof UserResourceAccess['permissions'] = 'read'
    ): boolean => {
        const resources = userResources[type] || [];
        const resource = resources.find(r => r.resource_id === resourceId);
        return resource?.permissions[permission] === true;
    }, [userResources]);

    const getAccessibleResourceIds = useCallback((type: ResourceType): string[] => {
        const resources = userResources[type] || [];
        return resources.map(r => r.resource_id);
    }, [userResources]);

    const getPrimaryResource = useCallback((type: ResourceType): UserResourceAccess | undefined => {
        const resources = userResources[type] || [];
        return resources.find(r => r.is_primary);
    }, [userResources]);

    // ─────────────────────────────────────────────────────────────
    // Visibility Checks
    // ─────────────────────────────────────────────────────────────

    const canSee = useCallback((target: string, type: 'page' | 'field' | 'module' = 'page'): boolean => {
        const cacheKey = `${type}:${target}`;

        // Check cache
        const cached = visibilityCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.visible;
        }

        // For now, use role-based visibility
        // This will be enhanced with async visibility rule checking
        const userRoleCodes = userRoles.map(r => r.code);

        // Super admin, tenant owner, and company owner can see everything
        if (userRoleCodes.includes('super_admin') || userRoleCodes.includes('tenant_owner') || userRoleCodes.includes('company_owner')) {
            return true;
        }

        // Default visibility rules
        const restrictedTargets: Record<string, string[]> = {
            // Pages
            'profit_loss_report': ['tenant_owner', 'company_admin'],
            'profit_margins': ['tenant_owner', 'company_admin'],

            // Modules
            'suppliers': ['tenant_owner', 'company_admin', 'accountant', 'purchasing_manager'],

            // Fields
            'cost_price': ['tenant_owner', 'company_admin', 'accountant'],
            'profit_margin': ['tenant_owner', 'company_admin'],
        };

        const allowedRoles = restrictedTargets[target];
        if (!allowedRoles) {
            return true; // No restriction
        }

        const isVisible = allowedRoles.some(role => userRoleCodes.includes(role));

        // Cache result
        visibilityCache[cacheKey] = { visible: isVisible, timestamp: Date.now() };

        return isVisible;
    }, [userRoles]);

    const getMaskValueSync = useCallback((targetType: string, targetName: string): string | null => {
        const cacheKey = `field:${targetType}.${targetName}`;
        const cached = visibilityCache[cacheKey];
        return cached?.maskValue || null;
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Role Checks
    // ─────────────────────────────────────────────────────────────

    const hasRole = useCallback((roleCode: string): boolean => {
        return userRoles.some(r => r.code === roleCode);
    }, [userRoles]);

    const hasAnyRole = useCallback((roleCodes: string[]): boolean => {
        return roleCodes.some(code => hasRole(code));
    }, [hasRole]);

    // Platform admin only (you as platform owner)
    const isPlatformAdmin = useCallback((): boolean => {
        return hasRole('super_admin');
    }, [hasRole]);

    // Any admin level (platform, tenant owner, company owner, or company admin)
    const isAdmin = useCallback((): boolean => {
        return hasAnyRole(['super_admin', 'tenant_owner', 'company_owner', 'company_admin']);
    }, [hasAnyRole]);

    // Tenant owner level (highest customer role)
    const isTenantOwner = useCallback((): boolean => {
        return hasAnyRole(['super_admin', 'tenant_owner']);
    }, [hasAnyRole]);

    // Company admin level
    const isCompanyAdmin = useCallback((): boolean => {
        return hasAnyRole(['super_admin', 'tenant_owner', 'company_owner', 'company_admin']);
    }, [hasAnyRole]);

    // ─────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────

    const refreshPermissions = useCallback(async () => {
        // Clear visibility cache
        Object.keys(visibilityCache).forEach(key => delete visibilityCache[key]);

        // Reload permissions
        await loadPermissions();
    }, [loadPermissions]);

    const getModules = useCallback(() => AVAILABLE_MODULES, []);

    // ─────────────────────────────────────────────────────────────
    // Special Permission Checks
    // ─────────────────────────────────────────────────────────────

    const hasSpecialPermission = useCallback((permName: SpecialPermissionKey): boolean => {
        // super_admin and tenant_owner always true
        if (userRoles.some(r => r.code === 'super_admin' || r.code === 'tenant_owner')) return true;
        return specialPermissions[permName] === true;
    }, [userRoles, specialPermissions]);

    const getSpecialPermissionKeys = useCallback(() => SPECIAL_PERMISSIONS_KEYS, []);

    // ─────────────────────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────────────────────

    // Module visibility check
    const canSeeModule = useCallback((moduleCode: string): boolean => {
        // Super admin sees all
        if (visibleModules.includes('all')) return true;
        return visibleModules.includes(moduleCode);
    }, [visibleModules]);

    return useMemo(() => ({
        // State
        loading: loading || authLoading,
        roles,
        userRoles,
        userPermissions,
        userResources,
        visibleModules,
        specialPermissions,

        // Permission checks
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,

        // Resource checks
        hasResourceAccess,
        getAccessibleResourceIds,
        getPrimaryResource,

        // Visibility checks
        canSee,
        canSeeModule,
        getMaskValue: getMaskValueSync,

        // Role checks
        hasRole,
        hasAnyRole,
        isPlatformAdmin,
        isAdmin,
        isTenantOwner,
        isCompanyAdmin,

        // Utilities
        refreshPermissions,
        getModules,

        // Special permissions
        hasSpecialPermission,
        getSpecialPermissionKeys,
    }), [
        loading,
        authLoading,
        roles,
        userRoles,
        userPermissions,
        userResources,
        visibleModules,
        specialPermissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasResourceAccess,
        getAccessibleResourceIds,
        getPrimaryResource,
        canSee,
        canSeeModule,
        getMaskValueSync,
        hasRole,
        hasAnyRole,
        isPlatformAdmin,
        isAdmin,
        isTenantOwner,
        isCompanyAdmin,
        refreshPermissions,
        getModules,
        hasSpecialPermission,
        getSpecialPermissionKeys,
    ]);
}

// ═══════════════════════════════════════════════════════════════
// PermissionGuard Component
// ═══════════════════════════════════════════════════════════════

interface PermissionGuardProps {
    module?: string;
    permission?: Permission;
    permissions?: Permission[];
    requireAll?: boolean;
    role?: string;
    roles?: string[];
    specialPermission?: SpecialPermissionKey;
    resource?: { type: ResourceType; id: string; permission?: keyof UserResourceAccess['permissions'] };
    target?: string;
    targetType?: 'page' | 'field' | 'module';
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on permissions
 */
export function PermissionGuard({
    module,
    permission,
    permissions,
    requireAll = false,
    role,
    roles,
    specialPermission,
    resource,
    target,
    targetType = 'page',
    fallback = null,
    children,
}: PermissionGuardProps): React.ReactNode {
    const {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        hasResourceAccess,
        hasSpecialPermission,
        canSee,
        loading,
    } = useRBAC();

    if (loading) {
        return fallback;
    }

    // Check special permission
    if (specialPermission && !hasSpecialPermission(specialPermission)) {
        return fallback;
    }

    // Check module permission
    if (module && permission) {
        if (!hasPermission(module, permission)) {
            return fallback;
        }
    }

    // Check multiple permissions
    if (module && permissions && permissions.length > 0) {
        const check = requireAll ? hasAllPermissions : hasAnyPermission;
        if (!check(module, permissions)) {
            return fallback;
        }
    }

    // Check role
    if (role && !hasRole(role)) {
        return fallback;
    }

    // Check multiple roles
    if (roles && roles.length > 0 && !hasAnyRole(roles)) {
        return fallback;
    }

    // Check resource access
    if (resource && !hasResourceAccess(resource.type, resource.id, resource.permission)) {
        return fallback;
    }

    // Check visibility
    if (target && !canSee(target, targetType)) {
        return fallback;
    }

    return children;
}

// ═══════════════════════════════════════════════════════════════
// HiddenField Component
// ═══════════════════════════════════════════════════════════════

interface HiddenFieldProps {
    targetType: string;
    targetName: string;
    value: React.ReactNode;
    maskValue?: string;
}

/**
 * Component that shows value or mask based on visibility rules
 */
export function HiddenField({
    targetType,
    targetName,
    value,
    maskValue = '***',
}: HiddenFieldProps): React.ReactNode {
    const { canSee, getMaskValue } = useRBAC();

    const isVisible = canSee(`${targetType}.${targetName}`, 'field');

    if (isVisible) {
        return value;
    }

    const customMask = getMaskValue(targetType, targetName);
    return React.createElement('span', { className: "text-muted-foreground" }, customMask || maskValue);
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export default useRBAC;
