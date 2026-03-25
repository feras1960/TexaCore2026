/**
 * useRoleNavigation Hook
 * إدارة التنقل الديناميكي حسب دور المستخدم
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTabsForRole, type NavigationTab } from '@/constants/navigation-config';
import { UserRole } from '@/lib/supabase';

export interface UseRoleNavigationResult {
  tabs: NavigationTab[];
  isLoading: boolean;
  currentRole: UserRole | null;
  hasAccess: (tabId: string) => boolean;
}

/**
 * Hook للحصول على التابات المتاحة حسب دور المستخدم
 */
export const useRoleNavigation = (): UseRoleNavigationResult => {
  const { session, loading } = useAuth();

  // احصل على التابات حسب الدور
  const tabs = useMemo(() => {
    if (!session?.primaryRole) {
      return [];
    }
    
    return getTabsForRole(session.primaryRole);
  }, [session?.primaryRole]);

  // تحقق من صلاحية الوصول لتاب محدد
  const hasAccess = (tabId: string): boolean => {
    return tabs.some(tab => tab.id === tabId);
  };

  return {
    tabs,
    isLoading: loading,
    currentRole: session?.primaryRole || null,
    hasAccess,
  };
};

export default useRoleNavigation;
