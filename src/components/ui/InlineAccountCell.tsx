/**
 * ════════════════════════════════════════════════════════════════════
 * 🏦 InlineAccountCell — خلية اختيار حساب مدمجة
 * ════════════════════════════════════════════════════════════════════
 * 
 * Combobox-style account selector designed for NexaDataTable cells.
 * Supports:
 *   ✅ Direct typing + auto-filter matching
 *   ✅ Dropdown arrow button for browsing
 *   ✅ Full keyboard navigation (Tab, Enter, Arrow, Escape)
 *   ✅ data-cell-id for NexaDataTable cell navigation
 *   ✅ RTL support
 *   ✅ Shows account code + name
 * 
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Account, accountsService } from '@/services/accountsService';
import { useLanguage } from '@/app/providers/LanguageProvider';

// ═══ Global cache for accounts (shared across all instances) ═══
let cachedAccounts: Account[] | null = null;
let cacheCompanyId: string | null = null;
let loadingPromise: Promise<Account[]> | null = null;

/**
 * Read company_id directly from Supabase's cached session in localStorage.
 * This is INSTANT (0ms) — no network calls, no async, no auth chain.
 */
export function getCompanyIdFromCache(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                const companyId = parsed?.user?.user_metadata?.company_id;
                if (companyId) return companyId;
            }
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * Get the currently cached accounts (null if not loaded yet).
 * Use getAccountsAsync() if you need to wait for loading.
 */
export function getCachedAccounts(): Account[] | null {
    return cachedAccounts;
}

/**
 * Get accounts — returns cached immediately or waits for loading promise.
 */
export async function getAccountsAsync(companyId?: string): Promise<Account[]> {
    const cid = companyId || cacheCompanyId || getCompanyIdFromCache();
    if (!cid) return [];
    
    // Already cached for this company
    if (cachedAccounts && cacheCompanyId === cid) return cachedAccounts;
    
    // Currently loading — wait for it
    if (loadingPromise && cacheCompanyId === cid) return loadingPromise;
    
    // Not loaded yet — start loading
    preloadAccounts(cid);
    return loadingPromise || [];
}

/**
 * Preload accounts into the global cache, WITH real-time balances from RPC.
 * Calls get_account_balances_bulk to compute all account balances in ONE query.
 */
export function preloadAccounts(companyId: string): void {
    if (!companyId) return;
    if ((cachedAccounts && cacheCompanyId === companyId) ||
        (loadingPromise && cacheCompanyId === companyId)) return;

    cacheCompanyId = companyId;
    loadingPromise = (async () => {
        try {
            // ═══ تحميل موازٍ: الحسابات + الأرصدة الحقيقية ═══
            const [accountsData, balancesResult] = await Promise.all([
                accountsService.getGridAccounts(companyId),
                import('@/lib/supabase').then(({ supabase }) =>
                    supabase.rpc('get_account_balances_bulk', { p_company_id: companyId })
                ),
            ]);

            const filtered = (accountsData || []).filter(a => !a.is_group);

            // ═══ دمج الأرصدة الحقيقية في الحسابات ═══
            if (balancesResult.data && !balancesResult.error) {
                const balMap = new Map<string, { balance: number; balance_fc: number }>();
                for (const row of balancesResult.data) {
                    balMap.set(row.account_id, {
                        balance: Number(row.balance) || 0,
                        balance_fc: Number(row.balance_fc) || 0,
                    });
                }

                for (const acct of filtered) {
                    const bal = balMap.get(acct.id);
                    if (bal) {
                        acct.current_balance = bal.balance;
                        acct.current_balance_fc = bal.balance_fc;
                    } else {
                        // حساب بدون حركات مرحّلة
                        acct.current_balance = 0;
                        acct.current_balance_fc = 0;
                    }
                }
                console.log('[AccountCache] ✅ Loaded', filtered.length, 'accounts with', balMap.size, 'real balances');
            } else {
                console.warn('[AccountCache] ⚠️ Balance RPC failed, using chart_of_accounts.current_balance:', balancesResult.error?.message);
            }

            cachedAccounts = filtered;
            loadingPromise = null;
            return filtered;
        } catch (err) {
            console.warn('[preloadAccounts] Failed:', err);
            loadingPromise = null;
            return [];
        }
    })();
}

/**
 * Invalidate the global accounts cache and force a fresh reload.
 * Call this after posting/unposting journal entries to refresh balances.
 */
export function invalidateAccountsCache(): void {
    const cid = cacheCompanyId || getCompanyIdFromCache();
    cachedAccounts = null;
    loadingPromise = null;
    if (cid) {
        cacheCompanyId = null; // Force preload to run
        preloadAccounts(cid);
        console.log('[AccountCache] ♻️ Invalidated and reloading for company:', cid);
    }
}

// ═══ AUTO-PRELOAD: Start loading accounts at module import time ═══
// ⚠️ Only preload if the stored session is still valid (not expired).
// Without this check, a stale sb-*-auth-token with an old company_id
// triggers 406 errors on every page load (including the login page).
(() => {
    const cachedCid = getCompanyIdFromCache();
    if (cachedCid) {
        // Verify session token is not expired before preloading
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const parsed = JSON.parse(raw);
                    const expiresAt = parsed?.expires_at;
                    if (expiresAt && expiresAt * 1000 < Date.now()) {
                        return; // Session expired — skip preload
                    }
                }
            }
        } catch { /* ignore */ }
        preloadAccounts(cachedCid);
    }
})();

interface InlineAccountCellProps {
    value: string; // account_id
    companyId?: string;
    onChange: (accountId: string, account?: Account) => void;
    onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onCopyFromAbove?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    isRTL?: boolean;
    cellId?: string; // data-cell-id for NexaDataTable navigation
    placeholder?: string;
    className?: string;
    displayName?: string;
    displayCode?: string;
    // --- Account Balance Addition ---
    balanceElement?: React.ReactNode;
}

export function InlineAccountCell({
    value,
    companyId,
    onChange,
    onNavigate,
    onCopyFromAbove,
    onKeyDown: externalKeyDown,
    isRTL = false,
    cellId,
    placeholder,
    className,
    displayName,
    displayCode,
    balanceElement,
}: InlineAccountCellProps) {
    const { language } = useLanguage();
    const [accounts, setAccounts] = useState<Account[]>(cachedAccounts || []);
    const [loading, setLoading] = useState(!cachedAccounts || cacheCompanyId !== companyId);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ═══ Load accounts (with global cache) ═══
    useEffect(() => {
        if (!companyId) return;

        // If cache is valid, use it immediately
        if (cachedAccounts && cacheCompanyId === companyId) {
            setAccounts(cachedAccounts);
            setLoading(false);
            return;
        }

        // If already loading (e.g. from preload), wait for it
        if (loadingPromise && cacheCompanyId === companyId) {
            setLoading(true);
            loadingPromise.then(data => {
                setAccounts(data);
                setLoading(false);
            });
            return;
        }

        // Load from API (fallback if preload wasn't called)
        setLoading(true);
        cacheCompanyId = companyId;
        loadingPromise = accountsService.getGridAccounts(companyId).then(data => {
            const filtered = (data || []).filter(a => !a.is_group);
            cachedAccounts = filtered;
            loadingPromise = null;
            return filtered;
        });

        loadingPromise.then(data => {
            setAccounts(data);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
            loadingPromise = null;
        });
    }, [companyId]);

    // ═══ Find selected account from value ═══
    useEffect(() => {
        if (value && accounts.length > 0) {
            const found = accounts.find(a => a.id === value);
            setSelectedAccount(found);
            if (found && !isOpen) {
                setInputValue('');
            }
        } else {
            setSelectedAccount(undefined);
        }
    }, [value, accounts]);

    // ═══ Get display label ═══
    const getLabel = useCallback((acc?: Account) => {
        if (!acc) return '';
        const name = language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar);
        return `${acc.code} - ${name}`;
    }, [language]);

    // ═══ Filter accounts based on input ═══
    const filteredAccounts = useMemo(() => {
        if (!inputValue.trim()) return accounts.slice(0, 50);

        const lower = inputValue.toLowerCase().trim();
        return accounts.filter(acc =>
            acc.code?.includes(lower) ||
            (acc.name_ar && acc.name_ar.toLowerCase().includes(lower)) ||
            (acc.name_en && acc.name_en.toLowerCase().includes(lower))
        ).slice(0, 50);
    }, [accounts, inputValue]);

    // ═══ Reset highlight when filtered list changes ═══
    useEffect(() => {
        setHighlightIndex(0);
    }, [filteredAccounts.length]);

    // ═══ Scroll highlighted item into view ═══
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const item = dropdownRef.current.children[highlightIndex] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex, isOpen]);

    // ═══ Handle account selection ═══
    const handleSelect = useCallback((account: Account) => {
        onChange(account.id, account);
        setSelectedAccount(account);
        setInputValue('');
        setIsOpen(false);
        // Refocus input for continued Tab navigation
        setTimeout(() => inputRef.current?.focus(), 10);
    }, [onChange]);

    // ═══ Handle click outside ═══
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                if (!value) setInputValue('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);

    // ═══ Keyboard handler ═══
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // When dropdown is open, handle dropdown navigation
        if (isOpen) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation();
                    setHighlightIndex(prev =>
                        Math.min(prev + 1, filteredAccounts.length - 1)
                    );
                    return;

                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation();
                    setHighlightIndex(prev => Math.max(prev - 1, 0));
                    return;

                case 'Enter':
                    e.preventDefault();
                    e.stopPropagation();
                    if (filteredAccounts[highlightIndex]) {
                        handleSelect(filteredAccounts[highlightIndex]);
                    }
                    return;

                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                    setInputValue('');
                    return;

                case 'Tab':
                    // Select highlighted item and move to next cell
                    if (filteredAccounts[highlightIndex]) {
                        handleSelect(filteredAccounts[highlightIndex]);
                    }
                    setIsOpen(false);
                    // Allow Tab to propagate for cell navigation
                    break;
            }
        }

        // Ctrl+D = Copy from above (works whether dropdown is open or closed)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            onCopyFromAbove?.();
            return;
        }

        // When dropdown is closed, handle cell navigation
        if (!isOpen) {
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    onNavigate?.('up');
                    return;

                case 'ArrowDown':
                    e.preventDefault();
                    onNavigate?.('down');
                    return;

                case 'ArrowLeft':
                    e.preventDefault();
                    onNavigate?.(isRTL ? 'right' : 'left');
                    return;

                case 'ArrowRight':
                    e.preventDefault();
                    onNavigate?.(isRTL ? 'left' : 'right');
                    return;

                case 'Tab':
                    e.preventDefault();
                    if (e.shiftKey) {
                        onNavigate?.('left');
                    } else {
                        onNavigate?.('right');
                    }
                    return;

                case 'Enter':
                    e.preventDefault();
                    if (e.shiftKey) {
                        onNavigate?.('up');
                    } else {
                        onNavigate?.('down');
                    }
                    return;

                case 'Escape':
                    e.preventDefault();
                    setInputValue('');
                    inputRef.current?.blur();
                    return;
            }
        }

        // Forward to external handler
        externalKeyDown?.(e);
    };

    // ═══ Handle input change ═══
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        if (val.trim()) {
            setIsOpen(true);
        }
    };

    // ═══ Handle focus ═══
    const handleFocus = () => {
        // Show dropdown if there's a search term or on focus with existing value
        if (inputValue.trim()) {
            setIsOpen(true);
        }
    };

    // ═══ Toggle dropdown ═══
    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(prev => !prev);
        inputRef.current?.focus();
    };

    // ═══ Display value ═══
    const showPlaceholder = !selectedAccount && !inputValue;
    const displayText = isOpen || inputValue
        ? inputValue
        : (selectedAccount
            ? getLabel(selectedAccount)
            : (displayName && displayCode
                ? `${displayCode} - ${displayName}`
                : ''));

    return (
        <div ref={containerRef} className={cn("relative w-full h-full", className)}>
            {/* ═══ Input + Chevron Button ═══ */}
            <div className="flex items-center w-full h-full min-h-[36px]">
                <input
                    ref={inputRef}
                    type="text"
                    value={displayText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={placeholder || (isRTL ? 'اكتب للبحث عن حساب...' : 'Type to search account...')}
                    className={cn(
                        'flex-1 h-full min-h-[36px] px-3 py-2',
                        'bg-transparent border-0 outline-none shadow-none',
                        'focus:bg-blue-50/50 focus:ring-2 focus:ring-blue-400 focus:ring-inset',
                        'transition-colors duration-150 text-sm',
                        selectedAccount && !isOpen && !inputValue && 'text-gray-800 dark:text-gray-200',
                        showPlaceholder && 'text-muted-foreground'
                    )}
                    data-cell-id={cellId}
                />

                {/* Account Balance Display */}
                {balanceElement && !isOpen && (
                    <div className="flex-shrink-0 flex items-center pr-2 pl-1">
                        {balanceElement}
                    </div>
                )}

                {/* Chevron / Browse button */}
                <button
                    type="button"
                    onClick={toggleDropdown}
                    tabIndex={-1}
                    className={cn(
                        "flex-shrink-0 px-1.5 h-full flex items-center justify-center",
                        "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                        "transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                        isOpen && "text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    )}
                    title={isRTL ? 'استعراض الحسابات' : 'Browse accounts'}
                >
                    {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ChevronsUpDown className="w-4 h-4" />
                    }
                </button>
            </div>

            {/* ═══ Dropdown ═══ */}
            {isOpen && (
                <div
                    className={cn(
                        "absolute z-[9999] w-full min-w-[280px] mt-0.5",
                        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
                        "rounded-lg shadow-xl overflow-hidden",
                        // Position: always below the input
                        "top-full",
                        isRTL ? "right-0" : "left-0"
                    )}
                    style={{ maxHeight: '240px' }}
                >
                    <div
                        ref={dropdownRef}
                        className="overflow-y-auto"
                        style={{ maxHeight: '240px', overscrollBehavior: 'contain' }}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {loading && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                {isRTL ? 'جاري التحميل...' : 'Loading...'}
                            </div>
                        )}

                        {!loading && filteredAccounts.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {isRTL ? 'لا توجد حسابات مطابقة' : 'No matching accounts'}
                            </div>
                        )}

                        {!loading && filteredAccounts.map((account, idx) => {
                            const name = language === 'ar' ? account.name_ar : (account.name_en || account.name_ar);
                            const isSelected = value === account.id;
                            const isHighlighted = idx === highlightIndex;

                            return (
                                <div
                                    key={account.id}
                                    onClick={() => handleSelect(account)}
                                    onMouseEnter={() => setHighlightIndex(idx)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                                        "transition-colors duration-75",
                                        isHighlighted && "bg-blue-50 dark:bg-blue-900/30",
                                        !isHighlighted && "hover:bg-gray-50 dark:hover:bg-gray-800",
                                        isSelected && "bg-emerald-50 dark:bg-emerald-900/20"
                                    )}
                                >
                                    {/* Selection check */}
                                    <Check
                                        className={cn(
                                            "h-3.5 w-3.5 shrink-0",
                                            isSelected ? "opacity-100 text-emerald-600" : "opacity-0"
                                        )}
                                    />

                                    {/* Account info */}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-medium truncate text-sm">
                                            {name}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {account.code}
                                        </span>
                                    </div>

                                    {/* Highlight indicator */}
                                    {isHighlighted && (
                                        <span className="text-[10px] text-blue-400 shrink-0">
                                            Enter ↵
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Results count footer */}
                    {!loading && filteredAccounts.length > 0 && (
                        <div className="px-3 py-1.5 border-t text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                            <span>
                                {isRTL
                                    ? `${filteredAccounts.length} حساب`
                                    : `${filteredAccounts.length} accounts`
                                }
                            </span>
                            <span className="flex gap-2">
                                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[9px]">↑↓</kbd>
                                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[9px]">Enter</kbd>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default InlineAccountCell;
