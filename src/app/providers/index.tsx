import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { LanguageProvider } from './LanguageProvider';
import { ThemeProvider } from './ThemeProvider';
import { InterfaceModeProvider } from './InterfaceModeProvider';
import { Toaster } from '@/components/ui/toaster';
import { REALTIME_SUBSCRIPTIONS } from '@/hooks/useGlobalRealtime';
import { createDexiePersister } from '@/lib/queryPersistence';
import { isSelfHosted } from '@/lib/supabase';

// 🖥️ LOCAL MODE: DB is on same machine → skip IndexedDB (fetch is ~5ms)
// 🌐 REMOTE SELFHOSTED: DB over network → keep IndexedDB but lighter settings
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const isLocalMode = isLocalhost;  // Only true localhost skips persistence

// ═══════════════════════════════════════════════════════════════
// 🔄 Auto-build skip list from REALTIME_SUBSCRIPTIONS
// Queries managed by realtime should NOT get their timestamps
// refreshed on cold start — they must refetch to detect changes
// that happened while the app was closed.
// ═══════════════════════════════════════════════════════════════
const REALTIME_SKIP_KEYS: Set<string> = new Set([
  // Always skip these (not in REALTIME_SUBSCRIPTIONS but need fresh data)
  'materials-full-detail',
  'party_balances_supplier',
  'party_balances_customer',
  'party_balances_supplier_purchases',
  'customer_balances_subledger',
  'material-movements',
  'material-inventory',
  // Auto-extracted from REALTIME_SUBSCRIPTIONS
  ...REALTIME_SUBSCRIPTIONS.flatMap(sub =>
    sub.queryKeys.map(qk => qk[0])
  ),
]);

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
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isLocalMode ? 2 * 60 * 1000 : 5 * 60 * 1000,  // Local: 2min, Cloud: 5min
      gcTime: isLocalMode ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000, // Local: 30min, Cloud: 24hr
      refetchOnWindowFocus: false,           // Don't refetch when user returns to tab
      refetchOnReconnect: 'always',          // Always refetch on network reconnect
      retry: (isLocalMode || isSelfHosted) ? 0 : 1,  // Selfhosted: no retries (fast fail), Cloud: 1 retry
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// Persistence: IndexedDB via Dexie.js (CLOUD MODE ONLY)
// 🖥️ Local mode skips this entirely — no IndexedDB writes!
// ═══════════════════════════════════════════════════════════════
const persistOptions = isLocalMode ? null : {
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
  // v6: stock-movements limit 500 + consolidated sheet view (2026-04-13)
  buster: `v6-w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`,
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

    // 🔑 Show cached data instantly AND treat as fresh
    const freshTimestamp = Date.now();

    // ⚡ REALTIME_SKIP_KEYS (auto-built from REALTIME_SUBSCRIPTIONS at module level)
    // Queries managed by realtime should refetch on cold start to detect
    // changes that happened while the app was closed.

    successQueries.forEach((query) => {
      const key0 = query.queryKey[0] as string;

      // Skip realtime-managed queries — they must refetch on cold start
      if (REALTIME_SKIP_KEYS.has(key0)) return;

      // Skip inventory preload caches — must refetch for fresh stock data
      if (typeof key0 === 'string' && key0.startsWith('inventory-preload')) return;

      // 🔄 sales_cycle_full: previously removed stale caches without items join.
      // Now the query always includes items join, so we keep the cache as-is.

      query.setState({
        ...query.state,
        dataUpdatedAt: freshTimestamp,
      });
    });

    // Remove stale full-detail cache so it will refetch fresh data on next use
    // queryClient.removeQueries({ queryKey: ['materials-full-detail'] }); // Preserve full-detail cache for variant data

    const keys = successQueries.map(q => q.queryKey[0]).filter((v, i, a) => a.indexOf(v) === i);
    console.log(`⚡ [Cache] Query groups: ${keys.join(', ')}`);
    console.log(`⚡ [Cache] Data shown instantly — next sync after staleTime expires`);
  } else {
    console.log('📭 [Cache] No cached queries found — will fetch fresh data');
  }
}

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // 🖥️ LOCAL MODE: Use plain QueryClientProvider — no IndexedDB persistence
  //    This eliminates the main-thread-blocking IndexedDB writes that
  //    freeze the browser when handling thousands of entries.
  if (isLocalMode || !persistOptions) {
    console.log('⚡ [AppProviders] Local mode — IndexedDB persistence disabled');
    return (
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    );
  }

  // ☁️ CLOUD MODE: Use PersistQueryClientProvider with IndexedDB
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

