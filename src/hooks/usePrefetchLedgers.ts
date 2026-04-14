/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ usePrefetchLedgers — Pre-fetch party ledger data
 * ════════════════════════════════════════════════════════════════
 *
 * When a list page (Customers/Suppliers/Parties) loads,
 * this hook prefetches ledger data for each party's GL account
 * so that opening their detail sheet shows data INSTANTLY.
 *
 * Data is cached in React Query + IndexedDB (24h).
 * ════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { accountLedgerService } from '@/services/accountLedgerService';
import { enrichWithCounterAccounts } from '@/features/accounting/components/unified/hooks/useLedgerData';
import { CACHE_TIMES } from '@/engine/DataEngine';

interface PrefetchTarget {
  /** GL account ID (receivable_account_id or payable_account_id) */
  glAccountId: string | null | undefined;
}

/**
 * Prefetches ledger data for a batch of party GL accounts.
 * Runs once per mount, skips accounts already in cache.
 * Uses the same queryKey format as useLedgerData to ensure cache hits.
 */
export function usePrefetchLedgers(
  parties: PrefetchTarget[],
  companyId: string | null,
  enabled: boolean = true
) {
  const qc = useQueryClient();
  const didRun = useRef(false);

  useEffect(() => {
    if (!enabled || !companyId || parties.length === 0 || didRun.current) return;
    didRun.current = true;

    // Deduplicate GL account IDs
    const accountIds = [...new Set(
      parties
        .map(p => p.glAccountId)
        .filter((id): id is string => !!id)
    )];

    if (accountIds.length === 0) return;

    // Prefetch each account's default ledger (posted, all dates, no search)
    // This queryKey MUST match what useLedgerData generates for default view:
    // ['account_ledger', accountId, companyId, dateFrom='', dateTo='', status='posted', entryType='', search='']
    const BATCH_SIZE = 4;
    let idx = 0;

    const prefetchBatch = async () => {
      while (idx < accountIds.length) {
        const batch = accountIds.slice(idx, idx + BATCH_SIZE);
        idx += BATCH_SIZE;

        await Promise.allSettled(
          batch.map(accountId => {
            const queryKey = ['account_ledger', accountId, companyId, '', '', 'posted', '', ''];

            // Skip if already cached
            const existing = qc.getQueryData(queryKey);
            if (existing !== undefined) return Promise.resolve();

            return qc.prefetchQuery({
              queryKey,
              queryFn: async () => {
                const result = await accountLedgerService.getLedger({
                  accountId,
                  companyId: companyId!,
                  status: 'posted',
                });
                const enrichedEntries = await enrichWithCounterAccounts(result.entries, accountId);
                return { entries: enrichedEntries, stats: result.stats };
              },
              staleTime: CACHE_TIMES.DYNAMIC,
              gcTime: CACHE_TIMES.GC,
            });
          })
        );
      }
    };

    // Run prefetch in background — don't block UI
    prefetchBatch().catch(err => {
      console.warn('[usePrefetchLedgers] Background prefetch error:', err);
    });

    // Reset on unmount so re-mount triggers again if parties changed
    return () => { didRun.current = false; };
  }, [parties, companyId, enabled, qc]);
}
