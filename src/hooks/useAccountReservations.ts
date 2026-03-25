/**
 * useAccountReservations Hook
 * React hook for fetching account reservations data
 * Provides reservations linked to a specific account for ledger display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  reservationsService, 
  type Reservation, 
  type ReservationFilters,
  type ReservationStats 
} from '@/services/reservationsService';

// ========== useAccountReservations Hook ==========
interface UseAccountReservationsOptions {
  accountId: string;
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  reservationType?: string;
  autoFetch?: boolean;
}

interface UseAccountReservationsReturn {
  reservations: Reservation[];
  stats: ReservationStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilters: (filters: Partial<ReservationFilters>) => void;
}

export function useAccountReservations(options: UseAccountReservationsOptions): UseAccountReservationsReturn {
  const {
    accountId,
    companyId,
    dateFrom: propDateFrom,
    dateTo: propDateTo,
    status: propStatus,
    reservationType: propReservationType,
    autoFetch = true,
  } = options;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<ReservationStats>({
    totalCount: 0,
    activeCount: 0,
    pendingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalValue: 0,
    totalDeposit: 0,
    depositPaid: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for filter values to prevent infinite loops
  const filtersRef = useRef<Partial<ReservationFilters>>({
    accountId,
    dateFrom: propDateFrom,
    dateTo: propDateTo,
    status: propStatus,
    reservationType: propReservationType,
  });

  // Track if initial fetch has been done
  const hasFetched = useRef(false);

  const fetchReservations = useCallback(async () => {
    if (!accountId || !companyId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentFilters = filtersRef.current;
      
      // Fetch reservations
      const result = await reservationsService.getByAccountId(
        accountId,
        companyId,
        {
          dateFrom: currentFilters.dateFrom,
          dateTo: currentFilters.dateTo,
          status: currentFilters.status,
        }
      );
      
      setReservations(result);

      // Fetch stats
      const statsResult = await reservationsService.getStatsByAccountId(accountId, companyId);
      setStats(statsResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch reservations');
      setError(error);
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, companyId]);

  const setFilters = useCallback((newFilters: Partial<ReservationFilters>) => {
    filtersRef.current = { ...filtersRef.current, ...newFilters };
    // Trigger refetch when filters change
    fetchReservations();
  }, [fetchReservations]);

  // Initial fetch - only run once when accountId/companyId are available
  useEffect(() => {
    if (autoFetch && accountId && companyId && !hasFetched.current) {
      hasFetched.current = true;
      fetchReservations();
    }
  }, [autoFetch, accountId, companyId, fetchReservations]);

  // Reset hasFetched when accountId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [accountId]);

  return {
    reservations,
    stats,
    loading,
    error,
    refetch: fetchReservations,
    setFilters,
  };
}

// ========== useReservationStats Hook ==========
interface UseReservationStatsOptions {
  accountId: string;
  companyId: string;
  autoFetch?: boolean;
}

interface UseReservationStatsReturn {
  stats: ReservationStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useReservationStats(options: UseReservationStatsOptions): UseReservationStatsReturn {
  const { accountId, companyId, autoFetch = true } = options;

  const [stats, setStats] = useState<ReservationStats>({
    totalCount: 0,
    activeCount: 0,
    pendingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalValue: 0,
    totalDeposit: 0,
    depositPaid: 0,
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
      const result = await reservationsService.getStatsByAccountId(accountId, companyId);
      setStats(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch reservation stats');
      setError(error);
      console.error('Error fetching reservation stats:', error);
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

export default useAccountReservations;
