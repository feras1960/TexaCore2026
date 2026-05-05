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
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
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

  const query = useCachedQuery({
    // ⚡ STABLE KEY: Use fixed key so IndexedDB cache restoration always matches.
    // Previously ['company', user?.id] → during auth restore user=null → key=['company','anonymous']
    // → didn't match persisted ['company','real-user-id'] → CACHE MISS → loading!
    // Now: always ['company', 'current'] → persistence hit → instant company data.
    // Safe because: login/logout clear all caches, company is same for all tenant users.
    queryKey: ['company', 'current'],
    queryFn: async (): Promise<Company | null> => {
      let targetCompanyId: string | null = null;

      if (isAuthenticated && user) {
        // ⚡ FAST PATH: company_id is already in user_metadata (set at login)
        // This avoids an extra network call to user_profiles
        targetCompanyId = user.user_metadata?.company_id 
          || user.app_metadata?.company_id 
          || null;

        // Fallback: query user_profiles only if metadata is missing
        if (!targetCompanyId) {
          try {
            const profile = await userProfilesService.getByUserId(user.id);
            if (profile?.company_id) {
              targetCompanyId = profile.company_id;
            }
          } catch {
            // Ignore profile errors, fall back to first company
          }
        }
      }

      // 🖥️ LOCAL MODE FALLBACK: If no company_id from JWT/profiles,
      // read from texacore_active_company (set by .tcdb file opener or wizard)
      if (!targetCompanyId) {
        try {
          const stored = localStorage.getItem('texacore_active_company');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.id) targetCompanyId = parsed.id;
          }
        } catch { /* ignore */ }
      }

      // If we have companyId, fetch that company
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
    // Don't fetch until auth is ready AND user is actually authenticated
    // Without isAuthenticated check, the query fires on the login page
    // and reads a stale company_id from localStorage → 406 error
    enabled: autoFetch && !authLoading && isAuthenticated,
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
    // ⚡ Smart loading: If we already have cached company data, don't show loading
    // even during auth re-initialization. This prevents "جاري التحميل..." flash
    // on every page that uses useCompany after a hard refresh.
    // Only show loading if auth is loading AND we have NO cached data yet.
    loading: query.data ? false : (authLoading || query.isLoading),
    error: formattedError,
    refetch,
  };
}

export default useCompany;
