/**
 * useAllowedTabs Hook
 * للتحكم في التبويبات المتاحة حسب الباقة والميزات
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface TabConfig {
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  order: number;
  is_core: boolean;
}

export function useAllowedTabs(sectionCode: string) {
  const { tenantId } = useAuth();
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTabs = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_allowed_tabs', {
            p_tenant_id: tenantId,
            p_section_code: sectionCode
          });

        if (error) throw error;

        if (mounted) {
          setTabs(data || []);
        }
      } catch (err) {
        console.error('Error loading allowed tabs:', err);
        if (mounted) {
          setTabs([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTabs();

    return () => {
      mounted = false;
    };
  }, [tenantId, sectionCode]);

  /**
   * التحقق من توفر تبويب معين
   */
  const hasTab = useMemo(() => {
    return (tabCode: string): boolean => {
      return tabs.some(t => t.code === tabCode);
    };
  }, [tabs]);

  /**
   * الحصول على التبويبات الأساسية فقط
   */
  const coreTabs = useMemo(() => {
    return tabs.filter(t => t.is_core);
  }, [tabs]);

  /**
   * الحصول على التبويبات الإضافية (غير أساسية)
   */
  const extraTabs = useMemo(() => {
    return tabs.filter(t => !t.is_core);
  }, [tabs]);

  return {
    tabs,
    coreTabs,
    extraTabs,
    loading,
    hasTab
  };
}
