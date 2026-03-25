/**
 * Features Service
 * خدمة إدارة الميزات والتحقق من الصلاحيات
 */

import { supabase } from '@/lib/supabase';

export interface ModuleFeature {
  id: string;
  module_code: string;
  feature_code: string;
  feature_name_ar: string;
  feature_name_en: string;
  description_ar?: string;
  description_en?: string;
  icon?: string;
  category: string;
  is_active: boolean;
}

export const featuresService = {
  /**
   * التحقق من توفر ميزة معينة
   */
  async checkFeatureAccess(
    moduleCode: string,
    featureCode: string,
    tenantId?: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_feature_access', {
        p_tenant_id: tenantId || null,
        p_module_code: moduleCode,
        p_feature_code: featureCode
      });

    if (error) {
      console.error('Error checking feature access:', error);
      return false;
    }

    return data || false;
  },

  /**
   * الحصول على كل الميزات لموديول معين
   */
  async getModuleFeatures(moduleCode: string): Promise<ModuleFeature[]> {
    const { data, error } = await supabase
      .from('module_features')
      .select('*')
      .eq('module_code', moduleCode)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching module features:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * الحصول على الميزات المفعلة في باقة معينة
   */
  async getPlanFeatures(planId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('plan_module_features')
      .select(`
        *,
        module_features:module_code (
          feature_name_ar,
          feature_name_en,
          icon,
          category
        )
      `)
      .eq('plan_id', planId)
      .eq('is_enabled', true);

    if (error) {
      console.error('Error fetching plan features:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * الحصول على كل الميزات في النظام (للـ Super Admin)
   */
  async getAllFeatures(): Promise<ModuleFeature[]> {
    const { data, error } = await supabase
      .from('module_features')
      .select('*')
      .eq('is_active', true)
      .order('module_code, display_order');

    if (error) {
      console.error('Error fetching all features:', error);
      throw error;
    }

    return data || [];
  }
};

export default featuresService;
