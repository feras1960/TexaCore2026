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
  // User permissions (from get_user_allowed_modules)
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_export?: boolean;
  can_import?: boolean;
  can_approve?: boolean;
  can_manage_settings?: boolean;
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
   * الحصول على الموديولات المتاحة للمستخدم الحالي مع الصلاحيات
   * استخدام get_user_allowed_modules بدلاً من get_tenant_available_modules
   */
  async getAvailableModules(userId: string): Promise<TenantModule[]> {
    const { data, error } = await supabase
      .rpc('get_user_allowed_modules', {
        p_user_id: userId
      });

    if (error) {
      console.error('Error fetching user modules:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * (Deprecated) الحصول على موديولات التينانت - استخدم getAvailableModules بدلاً منها
   */
  async getTenantModules(tenantId?: string): Promise<TenantModule[]> {
    const { data, error } = await supabase
      .rpc('get_tenant_available_modules', {
        p_tenant_id: tenantId || null
      });

    if (error) {
      console.error('Error fetching tenant modules:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * الحصول على بنية القائمة الجانبية للمستخدم
   */
  async getSidebarStructure(userId: string): Promise<SidebarStructure> {
    // نستخدم get_user_allowed_modules ونبني الـ sidebar منها
    const modules = await this.getAvailableModules(userId);
    
    // تجميع الموديولات حسب الفئة
    const categories: Record<string, any[]> = {};
    
    modules.forEach(module => {
      if (!categories[module.category]) {
        categories[module.category] = [];
      }
      
      categories[module.category].push({
        code: module.module_code,
        name_ar: module.module_name_ar,
        name_en: module.module_name_en,
        icon: module.icon,
        path: `/${module.module_code}`,
        is_enabled: module.is_enabled,
        is_core: module.is_core,
        badge: module.requires_upgrade ? 'locked' : null
      });
    });
    
    // تحويل إلى مصفوفة مرتبة
    const structure: SidebarStructure = {
      categories: Object.entries(categories).map(([category, mods]) => ({
        category,
        modules: mods
      }))
    };
    
    return structure;
  },

  /**
   * التحقق من توفر موديول معين للمستخدم
   */
  async checkModuleAccess(moduleCode: string, userId: string): Promise<boolean> {
    const modules = await this.getAvailableModules(userId);
    const module = modules.find(m => m.module_code === moduleCode);
    return module?.is_enabled || false;
  },

  /**
   * التحقق من صلاحية معينة على موديول
   */
  async checkModulePermission(
    userId: string,
    moduleCode: string,
    permission: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve' | 'manage_settings'
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_user_module_permission', {
        p_user_id: userId,
        p_module_code: moduleCode,
        p_permission_type: permission
      });

    if (error) {
      console.error('Error checking module permission:', error);
      return false;
    }

    return data || false;
  },

  /**
   * الحصول على كل صلاحيات المستخدم على موديول معين
   */
  async getModulePermissions(userId: string, moduleCode: string): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .rpc('get_user_module_permissions', {
        p_user_id: userId,
        p_module_code: moduleCode
      });

    if (error) {
      console.error('Error fetching module permissions:', error);
      return {};
    }

    return data || {};
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
