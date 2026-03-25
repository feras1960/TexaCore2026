/**
 * useAccounts Hook (Optimized with React Query)
 * Features caching with long staleTime for instant load.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const queryKey = ['accounts', companyId, accountType || 'all'];

  // Query: Fetch Accounts
  const {
    data: accounts = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!companyId) return [];
      if (accountType) {
        return await accountsService.getByType(companyId, accountType);
      } else {
        return await accountsService.getAll(companyId, { includePartyAccounts: true });
      }
    },
    enabled: !!companyId && autoFetch,
    staleTime: 10 * 60 * 1000, // 10 minutes (Consider fresh for 10 mins)
    gcTime: 30 * 60 * 1000, // 30 minutes (Keep in cache)
  });

  // Mutation: Create Account
  const createMutation = useMutation({
    mutationFn: (input: CreateAccountInput) => accountsService.create(input),
    onSuccess: () => {
      // Invalidate valid queries so they refetch next time (or optimistic update)
      queryClient.invalidateQueries({ queryKey: ['accounts', companyId] });
    },
  });

  // Mutation: Update Account
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateAccountInput> }) =>
      accountsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', companyId] });
    },
  });

  // Mutation: Delete Account
  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', companyId] });
    },
  });

  // Wrappers to match original interface
  const createAccount = useCallback(async (input: CreateAccountInput) => {
    return await createMutation.mutateAsync(input);
  }, [createMutation]);

  const updateAccount = useCallback(async (id: string, updates: Partial<CreateAccountInput>) => {
    return await updateMutation.mutateAsync({ id, updates });
  }, [updateMutation]);

  const deleteAccount = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  // Cast error to Error type safely
  const formattedError = error instanceof Error ? error : error ? new Error('Unknown error') : null;

  return {
    accounts,
    loading,
    error: formattedError,
    refetch: async () => { await refetch(); },
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

export default useAccounts;
