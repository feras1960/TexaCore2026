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
      gcTime: isLocalMode ? 10 * 60 * 1000 : 60 * 60 * 1000, // Local: 10min, Cloud: 60min (prevents memory bloat)
      refetchOnWindowFocus: false,           // Don't refetch when user returns to tab
      refetchOnReconnect: 'always',          // Always refetch on network reconnect
      retry: (isLocalMode || isSelfHosted) ? 0 : 1,  // Selfhosted: no retries (fast fail), Cloud: 1 retry
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// Persistence: IndexedDB via Dexie.js — ENABLED FOR ALL MODES
// 🖥️ Local mode uses lighter gc settings to avoid main-thread blocking
// ═══════════════════════════════════════════════════════════════
const persistOptions = {
  persister: createDexiePersister(),
  maxAge: isLocalMode ? 2 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // Local: 2 days, Cloud: 7 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      // Only persist successful queries with data
      if (query.state.status !== 'success' || query.state.data === undefined) return false;
      // 📉 Skip large arrays (>500 items) — they're too heavy to serialize
      // These queries refetch quickly anyway from the database
      const data = query.state.data;
      if (Array.isArray(data) && data.length > 500) return false;
      return true;
    },
  },
  // Auto-generate buster based on week number — invalidates old schema caches weekly
  // v10: fix stale stage='draft' in purchase_cycle_full cache (2026-05-12)
  buster: `v10-w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`,
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

    // ═══════════════════════════════════════════════════════════
    // ⚡ BATCHED TIMESTAMP UPDATE (v2)
    //
    // Previous approach: query.setState() per query → triggered
    // React Query observers for EACH update → cascade of re-renders
    //
    // New approach: Directly modify the internal state object,
    // which does NOT trigger observers. This means ZERO re-renders
    // during the hydration loop. The UI will render once when React
    // naturally commits, with all timestamps already updated.
    // ═══════════════════════════════════════════════════════════
    let updatedCount = 0;

    successQueries.forEach((query) => {
      const key0 = query.queryKey[0] as string;

      // Skip realtime-managed queries — they must refetch on cold start
      if (REALTIME_SKIP_KEYS.has(key0)) return;

      // Skip inventory preload caches — must refetch for fresh stock data
      if (typeof key0 === 'string' && key0.startsWith('inventory-preload')) return;

      // Direct state mutation — no observer notification
      (query.state as any).dataUpdatedAt = freshTimestamp;
      updatedCount++;
    });

    const keys = successQueries.map(q => q.queryKey[0]).filter((v, i, a) => a.indexOf(v) === i);
    console.log(`⚡ [Cache] ${updatedCount} timestamps refreshed (batched, 0 re-renders)`);
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
  // ☁️ All modes: Use PersistQueryClientProvider with IndexedDB
  // 🖥️ Local mode gets lighter gc/staleTime settings (configured above)
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

