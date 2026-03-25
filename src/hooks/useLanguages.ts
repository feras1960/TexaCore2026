/**
 * useLanguages Hook
 * للتعامل مع اللغات المتعددة للتينانت
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  languagesService, 
  type SystemLanguage, 
  type TenantLanguage, 
  type LanguageLimitInfo 
} from '@/services/languagesService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useLanguages() {
  const { tenantId } = useAuth();
  const [systemLanguages, setSystemLanguages] = useState<SystemLanguage[]>([]);
  const [tenantLanguages, setTenantLanguages] = useState<TenantLanguage[]>([]);
  const [limitInfo, setLimitInfo] = useState<LanguageLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * تحميل كل البيانات
   */
  const loadLanguages = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [system, tenant, limit] = await Promise.all([
        languagesService.getSystemLanguages(),
        languagesService.getTenantLanguages(tenantId),
        languagesService.checkLanguageLimit(tenantId)
      ]);

      setSystemLanguages(system);
      setTenantLanguages(tenant);
      setLimitInfo(limit);
    } catch (err: any) {
      console.error('Error loading languages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  /**
   * الحصول على اللغة الأساسية
   */
  const getPrimaryLanguage = useCallback((): TenantLanguage | null => {
    return tenantLanguages.find(l => l.is_primary) || null;
  }, [tenantLanguages]);

  /**
   * التحقق من تفعيل لغة معينة
   */
  const isLanguageEnabled = useCallback((languageCode: string): boolean => {
    return tenantLanguages.some(l => l.language_code === languageCode);
  }, [tenantLanguages]);

  /**
   * الحصول على اللغات المتاحة للإضافة
   */
  const getAvailableToAdd = useCallback((): SystemLanguage[] => {
    const enabledCodes = tenantLanguages.map(l => l.language_code);
    return systemLanguages.filter(lang => !enabledCodes.includes(lang.code));
  }, [systemLanguages, tenantLanguages]);

  /**
   * تفعيل لغة جديدة
   */
  const enableLanguage = useCallback(async (
    languageCode: string,
    isPrimary: boolean = false
  ): Promise<boolean> => {
    if (!tenantId) {
      toast.error('Tenant not found');
      return false;
    }

    // التحقق من الحد الأقصى
    if (limitInfo && !limitInfo.can_add_more) {
      toast.error(`لقد وصلت للحد الأقصى من اللغات (${limitInfo.max_languages})`);
      return false;
    }

    try {
      const result = await languagesService.enableLanguage(
        tenantId,
        languageCode,
        isPrimary
      );

      if (result.success) {
        toast.success('تم تفعيل اللغة بنجاح');
        await loadLanguages(); // إعادة تحميل البيانات
        return true;
      } else {
        toast.error(result.error || 'فشل تفعيل اللغة');
        return false;
      }
    } catch (err: any) {
      console.error('Error enabling language:', err);
      toast.error(err.message);
      return false;
    }
  }, [tenantId, limitInfo, loadLanguages]);

  /**
   * تعطيل لغة
   */
  const disableLanguage = useCallback(async (
    languageCode: string
  ): Promise<boolean> => {
    if (!tenantId) {
      toast.error('Tenant not found');
      return false;
    }

    // حماية: لا يمكن تعطيل آخر لغة
    if (tenantLanguages.length <= 1) {
      toast.error('لا يمكن تعطيل آخر لغة');
      return false;
    }

    try {
      const result = await languagesService.disableLanguage(
        tenantId,
        languageCode
      );

      if (result.success) {
        toast.success('تم تعطيل اللغة');
        await loadLanguages();
        return true;
      } else {
        toast.error(result.error || 'فشل تعطيل اللغة');
        return false;
      }
    } catch (err: any) {
      console.error('Error disabling language:', err);
      toast.error(err.message);
      return false;
    }
  }, [tenantId, tenantLanguages, loadLanguages]);

  /**
   * تعيين اللغة الأساسية
   */
  const setPrimaryLanguage = useCallback(async (
    languageCode: string
  ): Promise<boolean> => {
    if (!tenantId) {
      toast.error('Tenant not found');
      return false;
    }

    try {
      const result = await languagesService.setPrimaryLanguage(
        tenantId,
        languageCode
      );

      if (result.success) {
        toast.success('تم تعيين اللغة الأساسية');
        await loadLanguages();
        return true;
      } else {
        toast.error(result.error || 'فشل تعيين اللغة الأساسية');
        return false;
      }
    } catch (err: any) {
      console.error('Error setting primary language:', err);
      toast.error(err.message);
      return false;
    }
  }, [tenantId, loadLanguages]);

  /**
   * الحصول على أكواد اللغات المفعلة (مفيد للـ translation inputs)
   */
  const getEnabledLanguageCodes = useCallback((): string[] => {
    return tenantLanguages.map(l => l.language_code);
  }, [tenantLanguages]);

  return {
    systemLanguages,
    tenantLanguages,
    limitInfo,
    loading,
    error,
    getPrimaryLanguage,
    isLanguageEnabled,
    getAvailableToAdd,
    getEnabledLanguageCodes,
    enableLanguage,
    disableLanguage,
    setPrimaryLanguage,
    refresh: loadLanguages
  };
}
