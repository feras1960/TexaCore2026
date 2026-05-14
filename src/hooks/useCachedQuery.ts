/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 useCachedQuery — useQuery wrapper with smart loading state
 * ════════════════════════════════════════════════════════════════
 *
 * Wraps React Query's useQuery with automatic handling of the
 * IndexedDB cache restoration period. During restoration,
 * `isLoading` returns false so pages don't flash a loading spinner.
 *
 * USAGE: Drop-in replacement for useQuery:
 *   const { data, isLoading } = useCachedQuery({ ... })
 *
 * The only difference from useQuery:
 *   - During cache restoration: isLoading = false (not true)
 *   - This prevents the "جاري التحميل" flash when navigating
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useQuery, useIsRestoring, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

export function useCachedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const isRestoring = useIsRestoring();
  const query = useQuery(options);



  return {
    ...query,
    // During restoration: don't show loading spinner
    // After restoration: normal isLoading behavior
    isLoading: isRestoring ? false : query.isLoading,
    // Expose restoration state for components that need it
    isRestoring,
  };
}
