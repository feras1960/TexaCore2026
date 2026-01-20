/**
 * useAccountLedger Hook
 * React hook for fetching account ledger/statement data
 * Provides real-time data from journal_entry_lines
 * 
 * Fixed: Infinite loading loop by using useRef for filters
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { accountLedgerService, type LedgerEntry, type AccountStats, type LedgerFilters, type PaymentEntry } from '@/services/accountLedgerService';
import { format, subDays } from 'date-fns';

// ========== useAccountLedger Hook ==========
interface UseAccountLedgerOptions {
  accountId: string;
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  status?: 'all' | 'posted' | 'draft';
  autoFetch?: boolean;
}

interface UseAccountLedgerReturn {
  entries: LedgerEntry[];
  stats: AccountStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilters: (filters: Partial<LedgerFilters>) => void;
}

// Default dates
const getDefaultDateFrom = () => format(subDays(new Date(), 365), 'yyyy-MM-dd');
const getDefaultDateTo = () => format(new Date(), 'yyyy-MM-dd');

export function useAccountLedger(options: UseAccountLedgerOptions): UseAccountLedgerReturn {
  const {
    accountId,
    companyId,
    dateFrom: propDateFrom,
    dateTo: propDateTo,
    currency: propCurrency,
    status: propStatus = 'all',
    autoFetch = true,
  } = options;

  // Use refs to avoid re-creating objects on each render
  const defaultDateFrom = useRef(propDateFrom || getDefaultDateFrom());
  const defaultDateTo = useRef(propDateTo || getDefaultDateTo());
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<AccountStats>({
    totalDebit: 0,
    totalCredit: 0,
    currentBalance: 0,
    openingBalance: 0,
    transactionCount: 0,
    lastActivityDate: null,
    monthlyAverage: 0,
    periodDebit: 0,
    periodCredit: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs for filter values to prevent infinite loops
  const filtersRef = useRef<Partial<LedgerFilters>>({
    dateFrom: defaultDateFrom.current,
    dateTo: defaultDateTo.current,
    currency: propCurrency,
    status: propStatus,
  });
  
  // Track if initial fetch has been done
  const hasFetched = useRef(false);

  const fetchLedger = useCallback(async () => {
    if (!accountId || !companyId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentFilters = filtersRef.current;
      const result = await accountLedgerService.getLedger({
        accountId,
        companyId,
        dateFrom: currentFilters.dateFrom || defaultDateFrom.current,
        dateTo: currentFilters.dateTo || defaultDateTo.current,
        currency: currentFilters.currency,
        status: currentFilters.status || propStatus,
      });

      setEntries(result.entries);
      setStats(result.stats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch ledger');
      setError(error);
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, companyId, propStatus]);

  const setFilters = useCallback((newFilters: Partial<LedgerFilters>) => {
    filtersRef.current = { ...filtersRef.current, ...newFilters };
    // Trigger refetch when filters change
    fetchLedger();
  }, [fetchLedger]);

  // Initial fetch - only run once when accountId/companyId are available
  useEffect(() => {
    if (autoFetch && accountId && companyId && !hasFetched.current) {
      hasFetched.current = true;
      fetchLedger();
    }
  }, [autoFetch, accountId, companyId, fetchLedger]);

  // Reset hasFetched when accountId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [accountId]);

  return {
    entries,
    stats,
    loading,
    error,
    refetch: fetchLedger,
    setFilters,
  };
}

// ========== useAccountStats Hook ==========
interface UseAccountStatsOptions {
  accountId: string;
  companyId: string;
  autoFetch?: boolean;
}

interface UseAccountStatsReturn {
  stats: AccountStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccountStats(options: UseAccountStatsOptions): UseAccountStatsReturn {
  const { accountId, companyId, autoFetch = true } = options;

  const [stats, setStats] = useState<AccountStats>({
    totalDebit: 0,
    totalCredit: 0,
    currentBalance: 0,
    openingBalance: 0,
    transactionCount: 0,
    lastActivityDate: null,
    monthlyAverage: 0,
    periodDebit: 0,
    periodCredit: 0,
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
      const result = await accountLedgerService.getStats(accountId, companyId);
      setStats(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch stats');
      setError(error);
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, companyId]);

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [fetchStats, autoFetch]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// ========== useAccountPayments Hook ==========
interface UseAccountPaymentsOptions {
  accountId: string;
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: 'receipt' | 'payment' | 'all';
  autoFetch?: boolean;
}

interface UseAccountPaymentsReturn {
  payments: PaymentEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  totalReceipts: number;
  totalPayments: number;
}

export function useAccountPayments(options: UseAccountPaymentsOptions): UseAccountPaymentsReturn {
  const {
    accountId,
    companyId,
    dateFrom,
    dateTo,
    transactionType = 'all',
    autoFetch = true,
  } = options;

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if initial fetch has been done
  const hasFetched = useRef(false);
  
  // Store filter values in ref
  const filtersRef = useRef({ dateFrom, dateTo, transactionType });

  const fetchPayments = useCallback(async () => {
    if (!accountId || !companyId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentFilters = filtersRef.current;
      const result = await accountLedgerService.getPayments(accountId, companyId, {
        dateFrom: currentFilters.dateFrom,
        dateTo: currentFilters.dateTo,
        transactionType: currentFilters.transactionType,
      });
      setPayments(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch payments');
      setError(error);
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, companyId]);

  // Initial fetch - only run once when accountId/companyId are available
  useEffect(() => {
    if (autoFetch && accountId && companyId && !hasFetched.current) {
      hasFetched.current = true;
      fetchPayments();
    }
  }, [autoFetch, accountId, companyId, fetchPayments]);

  // Reset hasFetched when accountId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [accountId]);

  // Calculate totals
  const { totalReceipts, totalPayments: totalPaymentsAmount } = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        if (p.transactionType === 'receipt') {
          acc.totalReceipts += p.amount;
        } else if (p.transactionType === 'payment') {
          acc.totalPayments += p.amount;
        }
        return acc;
      },
      { totalReceipts: 0, totalPayments: 0 }
    );
  }, [payments]);

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
    totalReceipts,
    totalPayments: totalPaymentsAmount,
  };
}

// ========== useRecentActivity Hook ==========
interface UseRecentActivityOptions {
  accountId: string;
  limit?: number;
  autoFetch?: boolean;
}

interface UseRecentActivityReturn {
  activities: LedgerEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useRecentActivity(options: UseRecentActivityOptions): UseRecentActivityReturn {
  const { accountId, limit = 10, autoFetch = true } = options;

  const [activities, setActivities] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if initial fetch has been done
  const hasFetched = useRef(false);
  
  // Store limit in ref
  const limitRef = useRef(limit);

  const fetchActivities = useCallback(async () => {
    if (!accountId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await accountLedgerService.getRecentActivity(accountId, limitRef.current);
      setActivities(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch activities');
      setError(error);
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  // Initial fetch - only run once when accountId is available
  useEffect(() => {
    if (autoFetch && accountId && !hasFetched.current) {
      hasFetched.current = true;
      fetchActivities();
    }
  }, [autoFetch, accountId, fetchActivities]);

  // Reset hasFetched when accountId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [accountId]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}

export default useAccountLedger;
