/**
 * useFeatures Hook
 * للتعامل مع الميزات والتحقق من الصلاحيات
 */

import { useState, useEffect, useCallback } from 'react';
import { featuresService } from '@/services/featuresService';
import { useAuth } from './useAuth';

interface FeatureCache {
  [key: string]: boolean;
}

export function useFeatures() {
  const { tenantId } = useAuth();
  const [featureCache, setFeatureCache] = useState<FeatureCache>({});
  const [loading, setLoading] = useState(false);

  /**
   * التحقق من توفر ميزة معينة
   */
  const hasFeature = useCallback(async (
    moduleCode: string,
    featureCode: string
  ): Promise<boolean> => {
    const cacheKey = `${moduleCode}:${featureCode}`;
    
    // التحقق من الـ cache أولاً
    if (featureCache[cacheKey] !== undefined) {
      return featureCache[cacheKey];
    }

    try {
      const hasAccess = await featuresService.checkFeatureAccess(
        moduleCode,
        featureCode,
        tenantId
      );

      // حفظ في cache
      setFeatureCache(prev => ({
        ...prev,
        [cacheKey]: hasAccess
      }));

      return hasAccess;
    } catch (err) {
      console.error('Error checking feature access:', err);
      return false;
    }
  }, [featureCache, tenantId]);

  /**
   * التحقق من عدة ميزات دفعة واحدة
   */
  const hasFeatures = useCallback(async (
    features: { moduleCode: string; featureCode: string }[]
  ): Promise<{ [key: string]: boolean }> => {
    const results: { [key: string]: boolean } = {};

    await Promise.all(
      features.map(async ({ moduleCode, featureCode }) => {
        const key = `${moduleCode}:${featureCode}`;
        results[key] = await hasFeature(moduleCode, featureCode);
      })
    );

    return results;
  }, [hasFeature]);

  /**
   * مسح الـ cache
   */
  const clearCache = useCallback(() => {
    setFeatureCache({});
  }, []);

  /**
   * التحقق السريع من الـ cache فقط (بدون استدعاء API)
   */
  const hasFeatureSync = useCallback((
    moduleCode: string,
    featureCode: string
  ): boolean | null => {
    const cacheKey = `${moduleCode}:${featureCode}`;
    return featureCache[cacheKey] ?? null;
  }, [featureCache]);

  return {
    hasFeature,
    hasFeatures,
    hasFeatureSync,
    clearCache,
    loading
  };
}

/**
 * Hook مبسط للتحقق من ميزة واحدة
 */
export function useFeature(moduleCode: string, featureCode: string) {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useAuth();

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      setLoading(true);
      try {
        const access = await featuresService.checkFeatureAccess(
          moduleCode,
          featureCode,
          tenantId
        );
        if (mounted) {
          setHasAccess(access);
        }
      } catch (err) {
        console.error('Error checking feature:', err);
        if (mounted) {
          setHasAccess(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [moduleCode, featureCode, tenantId]);

  return { hasAccess, loading };
}
