/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 useCompany Hook (Optimized with React Query)
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ PERFORMANCE: Uses React Query for caching company data.
 * Company data is STATIC - it never changes during a session.
 * 
 * OLD PROBLEM:
 * - Used useState + useEffect with useRef guards
 * - Every time ANY component unmounted and remounted,
 *   useCompany would re-fetch from the server
 * - This caused ALL child hooks (useAccounts, useJournalEntries)
 *   to show loading state because companyId was null during fetch
 * 
 * NEW SOLUTION:
 * - React Query with staleTime: Infinity (never re-fetch automatically)
 * - gcTime: 60 minutes (keep in cache for a full session)
 * - On remount: instant return of cached company data
 * - Result: zero flicker, zero re-fetch on navigation
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { companiesService, type Company } from '@/services/companiesService';
import { userProfilesService } from '@/services/userProfilesService';

interface UseCompanyReturn {
  company: Company | null;
  companyId: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCompany(autoFetch: boolean = true): UseCompanyReturn {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company', user?.id || 'anonymous'],
    queryFn: async (): Promise<Company | null> => {
      let targetCompanyId: string | null = null;

      // Try to get company from user profile if authenticated
      if (isAuthenticated && user) {
        try {
          const profile = await userProfilesService.getByUserId(user.id);
          if (profile?.company_id) {
            targetCompanyId = profile.company_id;
          }
        } catch {
          // Ignore profile errors, fall back to first company
        }
      }

      // If we have companyId from profile, fetch that company
      if (targetCompanyId) {
        const data = await companiesService.getById(targetCompanyId);
        if (data) return data;
      }

      // Fallback: get first company (for development/testing)
      const data = await companiesService.getFirst();
      return data || null;
    },
    // Company data is static — never changes during a session
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000, // 1 hour
    // Don't fetch until auth is ready
    enabled: autoFetch && !authLoading,
    // Don't refetch on window focus or reconnect
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Retry once on failure
    retry: 1,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['company'] });
  }, [queryClient]);

  // Cast error to Error type safely
  const formattedError = query.error instanceof Error
    ? query.error
    : query.error
      ? new Error('Failed to fetch company')
      : null;

  return {
    company: query.data || null,
    companyId: query.data?.id || null,
    // Must include authLoading! When auth is loading:
    // - enabled=false → isLoading=false (React Query hasn't started)
    // - data=undefined → companyId=null
    // Without authLoading, components see loading=false + companyId=null = "no company" error
    loading: authLoading || query.isLoading,
    error: formattedError,
    refetch,
  };
}

export default useCompany;
