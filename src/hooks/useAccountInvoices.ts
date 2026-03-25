/**
 * useAccountInvoices Hook
 * React hook for fetching account invoices data
 * Provides invoices linked to a specific account for ledger display
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  accountInvoicesService, 
  type AccountInvoice, 
  type AccountInvoiceFilters,
  type AccountInvoiceStats 
} from '@/services/accountInvoicesService';

// ========== useAccountInvoices Hook ==========
interface UseAccountInvoicesOptions {
  accountId: string;
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  invoiceType?: string;
  autoFetch?: boolean;
}

interface UseAccountInvoicesReturn {
  invoices: AccountInvoice[];
  stats: AccountInvoiceStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilters: (filters: Partial<AccountInvoiceFilters>) => void;
}

export function useAccountInvoices(options: UseAccountInvoicesOptions): UseAccountInvoicesReturn {
  const {
    accountId,
    companyId,
    dateFrom: propDateFrom,
    dateTo: propDateTo,
    status: propStatus,
    invoiceType: propInvoiceType,
    autoFetch = true,
  } = options;

  const [invoices, setInvoices] = useState<AccountInvoice[]>([]);
  const [stats, setStats] = useState<AccountInvoiceStats>({
    totalCount: 0,
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for filter values to prevent infinite loops
  const filtersRef = useRef<Partial<AccountInvoiceFilters>>({
    accountId,
    dateFrom: propDateFrom,
    dateTo: propDateTo,
    status: propStatus,
    invoiceType: propInvoiceType,
  });

  // Track if initial fetch has been done
  const hasFetched = useRef(false);

  const fetchInvoices = useCallback(async () => {
    if (!accountId || !companyId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentFilters = filtersRef.current;
      
      // Fetch invoices
      const result = await accountInvoicesService.getByAccountId(
        accountId,
        companyId,
        {
          dateFrom: currentFilters.dateFrom,
          dateTo: currentFilters.dateTo,
          status: currentFilters.status,
        }
      );
      
      setInvoices(result);

      // Fetch stats
      const statsResult = await accountInvoicesService.getStatsByAccountId(accountId, companyId);
      setStats(statsResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch invoices');
      setError(error);
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, companyId]);

  const setFilters = useCallback((newFilters: Partial<AccountInvoiceFilters>) => {
    filtersRef.current = { ...filtersRef.current, ...newFilters };
    // Trigger refetch when filters change
    fetchInvoices();
  }, [fetchInvoices]);

  // Initial fetch - only run once when accountId/companyId are available
  useEffect(() => {
    if (autoFetch && accountId && companyId && !hasFetched.current) {
      hasFetched.current = true;
      fetchInvoices();
    }
  }, [autoFetch, accountId, companyId, fetchInvoices]);

  // Reset hasFetched when accountId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [accountId]);

  return {
    invoices,
    stats,
    loading,
    error,
    refetch: fetchInvoices,
    setFilters,
  };
}

// ========== useAccountInvoiceStats Hook ==========
interface UseAccountInvoiceStatsOptions {
  accountId: string;
  companyId: string;
  autoFetch?: boolean;
}

interface UseAccountInvoiceStatsReturn {
  stats: AccountInvoiceStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccountInvoiceStats(options: UseAccountInvoiceStatsOptions): UseAccountInvoiceStatsReturn {
  const { accountId, companyId, autoFetch = true } = options;

  const [stats, setStats] = useState<AccountInvoiceStats>({
    totalCount: 0,
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!accountId || !companyId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await accountInvoicesService.getStatsByAccountId(accountId, companyId);
      setStats(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch invoice stats');
      setError(error);
      console.error('Error fetching invoice stats:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, companyId]);

  useEffect(() => {
    if (autoFetch && accountId && companyId) {
      fetchStats();
    }
  }, [fetchStats, autoFetch, accountId, companyId]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

export default useAccountInvoices;
