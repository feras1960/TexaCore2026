/**
 * useAccounts Hook
 * React hook for managing accounts data
 */

import { useState, useEffect, useCallback } from 'react';
import { accountsService, type Account, type CreateAccountInput } from '@/services/accountsService';

interface UseAccountsOptions {
  companyId?: string;
  accountType?: string; // account_type_id (UUID)
  autoFetch?: boolean;
}

interface UseAccountsReturn {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createAccount: (input: CreateAccountInput) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<CreateAccountInput>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
}

export function useAccounts(options: UseAccountsOptions = {}): UseAccountsReturn {
  const { companyId, accountType, autoFetch = true } = options;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch accounts from Supabase
   */
  const fetchAccounts = useCallback(async () => {
    if (!companyId) {
      // Don't clear accounts when companyId is temporarily unavailable
      // This prevents flickering during auth state changes
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: Account[];

      if (accountType) {
        data = await accountsService.getByType(companyId, accountType);
      } else {
        data = await accountsService.getAll(companyId);
      }

      setAccounts(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch accounts');
      setError(error);
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, accountType]);

  /**
   * Refetch accounts
   */
  const refetch = useCallback(async () => {
    await fetchAccounts();
  }, [fetchAccounts]);

  /**
   * Create a new account
   */
  const createAccount = useCallback(
    async (input: CreateAccountInput): Promise<Account> => {
      setError(null);
      try {
        const newAccount = await accountsService.create(input);
        // Refresh the list
        await fetchAccounts();
        return newAccount;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create account');
        setError(error);
        throw error;
      }
    },
    [fetchAccounts]
  );

  /**
   * Update an account
   */
  const updateAccount = useCallback(
    async (id: string, updates: Partial<CreateAccountInput>): Promise<Account> => {
      setError(null);
      try {
        const updatedAccount = await accountsService.update(id, updates);
        // Refresh the list
        await fetchAccounts();
        return updatedAccount;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update account');
        setError(error);
        throw error;
      }
    },
    [fetchAccounts]
  );

  /**
   * Delete an account
   */
  const deleteAccount = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await accountsService.delete(id);
        // Refresh the list
        await fetchAccounts();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete account');
        setError(error);
        throw error;
      }
    },
    [fetchAccounts]
  );

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchAccounts();
    }
  }, [fetchAccounts, autoFetch]);

  return {
    accounts,
    loading,
    error,
    refetch,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

export default useAccounts;
