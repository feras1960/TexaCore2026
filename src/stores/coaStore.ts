// ═══════════════════════════════════════════════════════════════
// Chart of Accounts Store - Zustand with Caching & Realtime
// ═══════════════════════════════════════════════════════════════
// Features:
// - localStorage persistence (instant load)
// - Realtime subscriptions (auto-update)
// - Optimistic updates (instant UX)
// - Smart caching (5 min refresh)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// Define ChartOfAccount type locally since supabase types may be outdated
interface ChartOfAccount {
    id: string;
    tenant_id: string;
    company_id: string;
    parent_id: string | null;
    account_type_id: string | null;
    account_code: string;
    name_ar: string;
    name_en: string | null;
    description: string | null;
    currency: string | null;
    is_group: boolean;
    is_detail: boolean;
    is_active: boolean;
    is_system: boolean;
    is_cash_account: boolean;
    is_bank_account: boolean;
    is_receivable: boolean;
    is_payable: boolean;
    opening_balance: number | null;
    current_balance: number | null;
    created_at: string;
    updated_at: string;
}

interface COAStore {
    // State
    accounts: ChartOfAccount[];
    lastFetched: number;
    isLoading: boolean;
    error: string | null;

    // Read Operations
    fetchAccounts: (companyId: string, force?: boolean) => Promise<void>;
    subscribeToChanges: (companyId: string) => () => void;

    // Write Operations (with Optimistic Updates)
    addAccountOptimistic: (account: Partial<ChartOfAccount>) => Promise<ChartOfAccount>;
    updateAccountOptimistic: (id: string, updates: Partial<ChartOfAccount>) => Promise<void>;
    deleteAccountOptimistic: (id: string) => Promise<void>;

    // Internal Updates
    addAccount: (account: ChartOfAccount) => void;
    updateAccount: (id: string, updates: Partial<ChartOfAccount>) => void;
    deleteAccount: (id: string) => void;

    // Helpers
    getAccountById: (id: string) => ChartOfAccount | undefined;
    getAccountsByType: (typeId: string) => ChartOfAccount[];
    getAccountsByParent: (parentId: string | null) => ChartOfAccount[];
    searchAccounts: (query: string) => ChartOfAccount[];
    getCashAccounts: () => ChartOfAccount[];
    getBankAccounts: () => ChartOfAccount[];

    // Reset
    reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useCOAStore = create<COAStore>()(
    persist(
        (set, get) => ({
            // ═══════════════════════════════════════════════════════
            // Initial State
            // ═══════════════════════════════════════════════════════

            accounts: [],
            lastFetched: 0,
            isLoading: false,
            error: null,

            // ═══════════════════════════════════════════════════════
            // Read Operations
            // ═══════════════════════════════════════════════════════

            fetchAccounts: async (companyId: string, force = false) => {
                const now = Date.now();
                const state = get();

                // Use cache if fresh and not forced
                if (!force && state.accounts.length > 0) {
                    set({ isLoading: false });

                    // Background refresh if cache is old
                    if (now - state.lastFetched > CACHE_DURATION) {
                        try {
                            const { data, error } = await supabase
                                .from('chart_of_accounts')
                                .select('*')
                                .eq('company_id', companyId)
                                .order('account_code');

                            if (!error && data) {
                                set({ accounts: data, lastFetched: now });
                            }
                        } catch (err) {
                            console.error('Background refresh failed:', err);
                        }
                    }
                    return;
                }

                // Full fetch
                set({ isLoading: true, error: null });

                try {
                    const { data, error } = await supabase
                        .from('chart_of_accounts')
                        .select('*')
                        .eq('company_id', companyId)
                        .order('account_code');

                    if (error) throw error;

                    set({
                        accounts: data || [],
                        lastFetched: now,
                        isLoading: false,
                        error: null
                    });
                } catch (error: any) {
                    set({
                        error: error.message,
                        isLoading: false
                    });
                    throw error;
                }
            },

            // ═══════════════════════════════════════════════════════
            // Realtime Subscriptions
            // ═══════════════════════════════════════════════════════

            subscribeToChanges: (companyId: string) => {
                const channel = supabase
                    .channel(`coa-changes-${companyId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'chart_of_accounts',
                            filter: `company_id=eq.${companyId}`
                        },
                        (payload) => {
                            console.log('COA change detected:', payload.eventType);

                            if (payload.eventType === 'INSERT') {
                                get().addAccount(payload.new as ChartOfAccount);
                            } else if (payload.eventType === 'UPDATE') {
                                get().updateAccount(payload.new.id, payload.new as Partial<ChartOfAccount>);
                            } else if (payload.eventType === 'DELETE') {
                                get().deleteAccount(payload.old.id);
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            },

            // ═══════════════════════════════════════════════════════
            // Write Operations (Optimistic Updates)
            // ═══════════════════════════════════════════════════════

            addAccountOptimistic: async (account) => {
                const tempId = `temp-${Date.now()}`;
                const optimistic: ChartOfAccount = {
                    id: tempId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...account,
                } as ChartOfAccount;

                // Optimistic update
                get().addAccount(optimistic);

                try {
                    const { data, error } = await supabase
                        .from('chart_of_accounts')
                        .insert(account)
                        .select()
                        .single();

                    if (error) throw error;

                    // Replace temp with real
                    get().deleteAccount(tempId);
                    get().addAccount(data);

                    return data;
                } catch (error) {
                    // Rollback
                    get().deleteAccount(tempId);
                    throw error;
                }
            },

            updateAccountOptimistic: async (id, updates) => {
                const original = get().accounts.find(a => a.id === id);

                // Optimistic update
                get().updateAccount(id, updates);

                try {
                    const { error } = await supabase
                        .from('chart_of_accounts')
                        .update(updates)
                        .eq('id', id);

                    if (error) throw error;
                } catch (error) {
                    // Rollback
                    if (original) {
                        get().updateAccount(id, original);
                    }
                    throw error;
                }
            },

            deleteAccountOptimistic: async (id) => {
                const original = get().accounts.find(a => a.id === id);

                // Optimistic delete
                get().deleteAccount(id);

                try {
                    const { error } = await supabase
                        .from('chart_of_accounts')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                } catch (error) {
                    // Rollback
                    if (original) {
                        get().addAccount(original);
                    }
                    throw error;
                }
            },

            // ═══════════════════════════════════════════════════════
            // Internal Updates
            // ═══════════════════════════════════════════════════════

            addAccount: (account) => {
                set((state) => ({
                    accounts: [...state.accounts, account].sort((a, b) =>
                        a.account_code.localeCompare(b.account_code)
                    )
                }));
            },

            updateAccount: (id, updates) => {
                set((state) => ({
                    accounts: state.accounts.map(acc =>
                        acc.id === id ? { ...acc, ...updates } : acc
                    )
                }));
            },

            deleteAccount: (id) => {
                set((state) => ({
                    accounts: state.accounts.filter(acc => acc.id !== id)
                }));
            },

            // ═══════════════════════════════════════════════════════
            // Helper Functions
            // ═══════════════════════════════════════════════════════

            getAccountById: (id) => {
                return get().accounts.find(acc => acc.id === id);
            },

            getAccountsByType: (typeId) => {
                return get().accounts.filter(acc => acc.account_type_id === typeId);
            },

            getAccountsByParent: (parentId) => {
                return get().accounts.filter(acc => acc.parent_id === parentId);
            },

            searchAccounts: (query) => {
                const lower = query.toLowerCase();
                return get().accounts.filter(acc =>
                    acc.account_code.toLowerCase().includes(lower) ||
                    acc.name_ar.toLowerCase().includes(lower) ||
                    acc.name_en?.toLowerCase().includes(lower)
                );
            },

            getCashAccounts: () => {
                return get().accounts.filter(acc => acc.is_cash_account);
            },

            getBankAccounts: () => {
                return get().accounts.filter(acc => acc.is_bank_account);
            },

            // ═══════════════════════════════════════════════════════
            // Reset
            // ═══════════════════════════════════════════════════════

            reset: () => {
                set({
                    accounts: [],
                    lastFetched: 0,
                    isLoading: false,
                    error: null
                });
            }
        }),
        {
            name: 'coa-storage',
            partialize: (state) => ({
                accounts: state.accounts,
                lastFetched: state.lastFetched
            })
        }
    )
);

// ═══════════════════════════════════════════════════════════════
// Hook for easy usage
// ═══════════════════════════════════════════════════════════════

export const useChartOfAccounts = (companyId?: string) => {
    const store = useCOAStore();

    React.useEffect(() => {
        if (!companyId) return;

        // Fetch accounts (from cache or server)
        store.fetchAccounts(companyId);

        // Subscribe to realtime changes
        const unsubscribe = store.subscribeToChanges(companyId);

        return unsubscribe;
    }, [companyId]);

    return store;
};
