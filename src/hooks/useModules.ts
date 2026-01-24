/**
 * useModules Hook
 * للتعامل مع الموديولات المتاحة للتينانت
 */

import { useState, useEffect, useCallback } from 'react';
import { modulesService, type TenantModule, type SidebarStructure } from '@/services/modulesService';
import { useAuth } from './useAuth';

export function useModules() {
  const { tenantId } = useAuth();
  const [modules, setModules] = useState<TenantModule[]>([]);
  const [sidebar, setSidebar] = useState<SidebarStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [modulesData, sidebarData] = await Promise.all([
        modulesService.getAvailableModules(tenantId),
        modulesService.getSidebarStructure(tenantId)
      ]);

      setModules(modulesData);
      setSidebar(sidebarData);
    } catch (err: any) {
      console.error('Error loading modules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

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
    refresh: loadModules
  };
}
