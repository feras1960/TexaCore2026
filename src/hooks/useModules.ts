/**
 * useModules Hook
 * للتعامل مع الموديولات المتاحة للمستخدم مع الصلاحيات
 * ✅ Updated to use get_user_allowed_modules
 */

import { useState, useEffect, useCallback } from 'react';
import { modulesService, type TenantModule, type SidebarStructure } from '@/services/modulesService';
import { useAuth } from './useAuth';

export function useModules() {
  const { user, tenantId } = useAuth();
  const [modules, setModules] = useState<TenantModule[]>([]);
  const [sidebar, setSidebar] = useState<SidebarStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [modulesData, sidebarData] = await Promise.all([
        modulesService.getAvailableModules(user.id),
        modulesService.getSidebarStructure(user.id)
      ]);

      setModules(modulesData);
      setSidebar(sidebarData);
    } catch (err: any) {
      console.error('Error loading modules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  /**
   * التحقق من توفر موديول معين
   */
  const hasModule = useCallback((moduleCode: string): boolean => {
    return modules.some(m => m.module_code === moduleCode && m.is_enabled);
  }, [modules]);

  /**
   * التحقق من أن موديول مقفل
   */
  const isModuleLocked = useCallback((moduleCode: string): boolean => {
    const module = modules.find(m => m.module_code === moduleCode);
    return module ? !module.is_enabled : true;
  }, [modules]);

  /**
   * الحصول على معلومات موديول معين
   */
  const getModule = useCallback((moduleCode: string): TenantModule | undefined => {
    return modules.find(m => m.module_code === moduleCode);
  }, [modules]);

  /**
   * الحصول على الموديولات المقفلة
   */
  const getLockedModules = useCallback((): TenantModule[] => {
    return modules.filter(m => !m.is_enabled && m.requires_upgrade);
  }, [modules]);

  /**
   * الحصول على الموديولات المفعلة
   */
  const getEnabledModules = useCallback((): TenantModule[] => {
    return modules.filter(m => m.is_enabled);
  }, [modules]);

  /**
   * التحقق من صلاحية معينة على موديول
   */
  const hasPermission = useCallback((
    moduleCode: string,
    permission: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve' | 'manage_settings'
  ): boolean => {
    const module = modules.find(m => m.module_code === moduleCode);
    if (!module || !module.is_enabled) return false;

    const permissionKey = `can_${permission}` as keyof TenantModule;
    return module[permissionKey] === true;
  }, [modules]);

  /**
   * الحصول على كل صلاحيات موديول معين
   */
  const getModulePermissions = useCallback((moduleCode: string): Record<string, boolean> => {
    const module = modules.find(m => m.module_code === moduleCode);
    if (!module) return {};

    return {
      can_view: module.can_view || false,
      can_create: module.can_create || false,
      can_edit: module.can_edit || false,
      can_delete: module.can_delete || false,
      can_export: module.can_export || false,
      can_import: module.can_import || false,
      can_approve: module.can_approve || false,
      can_manage_settings: module.can_manage_settings || false
    };
  }, [modules]);

  return {
    modules,
    sidebar,
    loading,
    error,
    hasModule,
    isModuleLocked,
    getModule,
    getLockedModules,
    getEnabledModules,
    hasPermission,
    getModulePermissions,
    refresh: loadModules
  };
}
