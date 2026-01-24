/**
 * Languages Service
 * خدمة إدارة اللغات المتعددة للتينانت
 */

import { supabase } from '@/lib/supabase';

export interface SystemLanguage {
  code: string;
  name_ar: string;
  name_en: string;
  name_native: string;
  direction: 'ltr' | 'rtl';
  flag_emoji: string;
  is_active: boolean;
}

export interface TenantLanguage {
  language_code: string;
  language_name_ar: string;
  language_name_en: string;
  is_primary: boolean;
  display_order: number;
  direction: 'ltr' | 'rtl';
  flag_emoji: string;
}

export interface LanguageLimitInfo {
  max_languages: number;
  current_languages: number;
  remaining: number;
  can_add_more: boolean;
  error?: string;
}

export const languagesService = {
  /**
   * الحصول على كل اللغات المتاحة في النظام
   */
  async getSystemLanguages(): Promise<SystemLanguage[]> {
    const { data, error } = await supabase
      .from('system_languages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching system languages:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * الحصول على اللغات المفعلة للتينانت
   */
  async getTenantLanguages(tenantId?: string): Promise<TenantLanguage[]> {
    const { data, error } = await supabase
      .rpc('get_tenant_active_languages', {
        p_tenant_id: tenantId || null
      });

    if (error) {
      console.error('Error fetching tenant languages:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * التحقق من حد اللغات المسموح به
   */
  async checkLanguageLimit(tenantId?: string): Promise<LanguageLimitInfo> {
    const { data, error } = await supabase
      .rpc('check_language_limit', {
        p_tenant_id: tenantId || null
      });

    if (error) {
      console.error('Error checking language limit:', error);
      throw error;
    }

    return data as LanguageLimitInfo;
  },

  /**
   * تفعيل لغة للتينانت
   */
  async enableLanguage(
    tenantId: string,
    languageCode: string,
    isPrimary: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .rpc('enable_tenant_language', {
        p_tenant_id: tenantId,
        p_language_code: languageCode,
        p_is_primary: isPrimary
      });

    if (error) {
      console.error('Error enabling language:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; error?: string };
  },

  /**
   * تعطيل لغة للتينانت
   */
  async disableLanguage(
    tenantId: string,
    languageCode: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .rpc('disable_tenant_language', {
        p_tenant_id: tenantId,
        p_language_code: languageCode
      });

    if (error) {
      console.error('Error disabling language:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; error?: string };
  },

  /**
   * تعيين اللغة الأساسية
   */
  async setPrimaryLanguage(
    tenantId: string,
    languageCode: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .rpc('set_primary_language', {
        p_tenant_id: tenantId,
        p_language_code: languageCode
      });

    if (error) {
      console.error('Error setting primary language:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; error?: string };
  },

  /**
   * الحصول على اللغات المتاحة للإضافة
   */
  async getAvailableLanguagesToAdd(tenantId?: string): Promise<SystemLanguage[]> {
    // الحصول على كل اللغات المتاحة
    const systemLanguages = await this.getSystemLanguages();
    
    // الحصول على اللغات المفعلة حالياً
    const tenantLanguages = await this.getTenantLanguages(tenantId);
    const enabledCodes = tenantLanguages.map(l => l.language_code);
    
    // تصفية اللغات المتاحة للإضافة
    return systemLanguages.filter(lang => !enabledCodes.includes(lang.code));
  }
};

export default languagesService;
