import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { LanguageProvider } from './LanguageProvider';
import { ThemeProvider } from './ThemeProvider';
import { InterfaceModeProvider } from './InterfaceModeProvider';
import { Toaster } from '@/components/ui/toaster';
import { createDexiePersister } from '@/lib/queryPersistence';

// ═══════════════════════════════════════════════════════════════
// 💾 React Query — Unified Cache Configuration
// ═══════════════════════════════════════════════════════════════
//
// 🔑 HOW IT WORKS:
//   1. App loads → PersistQueryClientProvider restores cache from IndexedDB
//   2. onSuccess → timestamps refreshed so data is "fresh"
//   3. User navigates → data shows INSTANTLY from cache (0ms)
//   4. Background refetch happens ONLY after staleTime expires
//   5. On mutations → relevant queries are invalidated → refetch
//   6. On realtime events → relevant queries are invalidated → refetch
//
// 📏 CACHE POLICY (for all modules):
//   staleTime: 5 min → data stays "fresh" for 5 minutes
//   gcTime: 24 hours → kept in memory for IndexedDB persistence
//   Individual hooks can override staleTime for dynamic data (2 min)
//
// ═══════════════════════════════════════════════════════════════
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,            // 5 minutes - data is "fresh"
      gcTime: 24 * 60 * 60 * 1000,          // 24 hours - keep for persistence
      refetchOnWindowFocus: false,           // Don't refetch when user returns to tab
      refetchOnReconnect: 'always',          // Always refetch on network reconnect
      retry: 1,
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// Persistence: IndexedDB via Dexie.js
// ═══════════════════════════════════════════════════════════════
const persistOptions = {
  persister: createDexiePersister(),
  maxAge: 7 * 24 * 60 * 60 * 1000,          // 7 days max cache age
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      // Only persist successful queries with data
      return query.state.status === 'success' && query.state.data !== undefined;
    },
  },
  // Auto-generate buster based on week number — invalidates old schema caches weekly
  // Change format manually (e.g. 'v2.0.0') for breaking schema updates
  buster: `v1-w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`,
};

// ═══════════════════════════════════════════════════════════════
// onSuccess: Called AFTER cache is restored from IndexedDB
// ═══════════════════════════════════════════════════════════════
// CRITICAL: Without this, restored queries have OLD timestamps
// and React Query considers them "stale" → refetches everything!
// We refresh timestamps so restored data is treated as "fresh".
// ═══════════════════════════════════════════════════════════════
function handlePersistSuccess() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const successQueries = queries.filter(
    q => q.state.status === 'success' && q.state.data !== undefined
  );

  if (successQueries.length > 0) {
    console.log(`⚡ [Cache] Restored ${successQueries.length} queries from IndexedDB`);

    // 🔑 KEY CHANGE: Set dataUpdatedAt to a timestamp OLDER than staleTime
    // This means: show cached data instantly (0ms) BUT mark as stale
    // → React Query will refetch from server in the background
    // → UI updates seamlessly when fresh data arrives
    // Old behavior: dataUpdatedAt = now → data treated as "fresh" → NO refetch for 5 min!
    const staleTimestamp = Date.now() - (6 * 60 * 1000); // 6 min ago → always stale

    successQueries.forEach((query) => {
      query.setState({
        ...query.state,
        dataUpdatedAt: staleTimestamp,
      });
    });

    // Log restored query keys for debugging
    const keys = successQueries.map(q => q.queryKey[0]).filter((v, i, a) => a.indexOf(v) === i);
    console.log(`⚡ [Cache] Query groups: ${keys.join(', ')}`);
    console.log(`⚡ [Cache] Data shown instantly — background sync will update`);
  } else {
    console.log('📭 [Cache] No cached queries found — will fetch fresh data');
  }
}

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={handlePersistSuccess}
    >
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <ThemeProvider>
            <InterfaceModeProvider>
              {children}
              <Toaster />
            </InterfaceModeProvider>
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}

export * from './LanguageProvider';
export * from './ThemeProvider';
export * from './InterfaceModeProvider';
