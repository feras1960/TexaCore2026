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

    // ⚡ Queries with realtime subscriptions should NOT have their timestamps refreshed.
    // These queries auto-sync via WebSocket, so they need to refetch on cold start
    // to detect changes that happened while the app was closed.
    const skipTimestampRefresh = new Set([
      'materials-full-detail',  // must always re-fetch to include parent_material_id
      'parties_suppliers',      // realtime-managed — must refetch on cold start
      'parties_customers',      // realtime-managed — must refetch on cold start
      'party_balances_supplier',
      'party_balances_customer',           // Parties page — must refetch on cold start
      'party_balances_supplier_purchases', // SuppliersList page — must refetch on cold start
      'customer_balances_subledger',       // CustomersList page — must refetch on cold start
      'material-movements',     // realtime-managed — must refetch for accurate movement log
      'material-inventory',     // realtime-managed — must refetch for warehouse distribution
    ]);

    // 🔄 Warehouse queries: Don't refresh timestamps — let them refetch for fresh data.
    // These have realtime subscriptions (fabric_materials, fabric_rolls, etc.)
    const isWarehouseRealtimeQuery = (key: any[]) => {
      if (key[0] !== 'warehouse') return false;
      const realtimeEntities = ['materials', 'dashboard-stats', 'low-stock', 'inventory-movements'];
      return realtimeEntities.some(e => key[1] === e);
    };

    // 🔄 Inventory preload caches — must refetch on cold start
    const isInventoryPreload = (key: any[]) => {
      return typeof key[0] === 'string' && (key[0] as string).startsWith('inventory-preload');
    };

    successQueries.forEach((query) => {
      const key0 = query.queryKey[0];
      if (skipTimestampRefresh.has(key0 as string)) return;

      // 🔄 Warehouse realtime queries: skip timestamp refresh → will refetch on mount
      if (isWarehouseRealtimeQuery(query.queryKey as any[])) return;

      // 🔄 Inventory preload: skip timestamp refresh → will refetch from Supabase
      if (isInventoryPreload(query.queryKey as any[])) return;

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
