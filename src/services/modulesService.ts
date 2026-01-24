/**
 * Modules Service
 * خدمة إدارة الموديولات والتحقق من الصلاحيات
 */

import { supabase } from '@/lib/supabase';

export interface TenantModule {
  module_code: string;
  module_name_ar: string;
  module_name_en: string;
  icon: string;
  category: string;
  is_enabled: boolean;
  is_included_in_plan: boolean;
  is_core: boolean;
  requires_upgrade: boolean;
  upgrade_plan: string | null;
}

export interface SidebarStructure {
  categories: {
    category: string;
    modules: {
      code: string;
      name_ar: string;
      name_en: string;
      icon: string;
      path: string;
      is_enabled: boolean;
      is_core: boolean;
      badge?: 'locked' | null;
    }[];
  }[];
}

export const modulesService = {
  /**
   * الحصول على الموديولات المتاحة للتينانت الحالي
   */
  async getAvailableModules(tenantId?: string): Promise<TenantModule[]> {
    const { data, error } = await supabase
      .rpc('get_tenant_available_modules', {
        p_tenant_id: tenantId || null
      });

    if (error) {
      console.error('Error fetching modules:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * الحصول على بنية القائمة الجانبية
   */
  async getSidebarStructure(tenantId?: string): Promise<SidebarStructure> {
    const { data, error } = await supabase
      .rpc('get_tenant_sidebar_structure', {
        p_tenant_id: tenantId || null
      });

    if (error) {
      console.error('Error fetching sidebar structure:', error);
      throw error;
    }

    return data as SidebarStructure;
  },

  /**
   * التحقق من توفر موديول معين
   */
  async checkModuleAccess(moduleCode: string, tenantId?: string): Promise<boolean> {
    const modules = await this.getAvailableModules(tenantId);
    const module = modules.find(m => m.module_code === moduleCode);
    return module?.is_enabled || false;
  },

  /**
   * (Super Admin) تفعيل/تعطيل موديول لتينانت
   */
  async toggleModuleForTenant(
    tenantId: string,
    moduleCode: string,
    enabled: boolean,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .rpc('toggle_tenant_module', {
        p_tenant_id: tenantId,
        p_module_code: moduleCode,
        p_enabled: enabled,
        p_notes: notes || null
      });

    if (error) {
      console.error('Error toggling module:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; error?: string };
  },

  /**
   * الحصول على قائمة كل الموديولات في النظام (للـ Super Admin)
   */
  async getAllSystemModules(): Promise<any[]> {
    const { data, error } = await supabase
      .from('system_modules')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching system modules:', error);
      throw error;
    }

    return data || [];
  }
};

export default modulesService;
