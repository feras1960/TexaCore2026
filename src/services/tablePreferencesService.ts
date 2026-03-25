/**
 * User Table Preferences Service
 * 
 * خدمة لإدارة تفضيلات الجداول للمستخدمين
 * تُخزن في Supabase مع fallback إلى localStorage
 */

import { supabase } from '@/lib/supabase';

export interface TablePreferences {
    columnVisibility: Record<string, boolean>;
    columnSizing: Record<string, number>;
    columnOrder: string[];
}

const CACHE_PREFIX = 'nexa-table-prefs-cache-';

// In-memory cache for instant access (avoids Supabase round-trip)
const memoryCache: Record<string, { prefs: TablePreferences; timestamp: number }> = {};
const MEMORY_CACHE_TTL = 60_000; // 60 seconds

/**
 * جلب تفضيلات جدول معين للمستخدم الحالي
 */
export async function getTablePreferences(tableKey: string): Promise<TablePreferences | null> {
    // 0. Check in-memory cache first (fastest)
    const memoryCached = memoryCache[tableKey];
    if (memoryCached && (Date.now() - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
        return memoryCached.prefs;
    }

    try {
        // 1. Try localStorage cache first (fast, works offline)
        const cached = localStorage.getItem(CACHE_PREFIX + tableKey);
        let localPrefs: TablePreferences | null = null;
        if (cached) {
            localPrefs = JSON.parse(cached);
            // Store in memory cache for even faster subsequent access
            if (localPrefs) {
                memoryCache[tableKey] = { prefs: localPrefs, timestamp: Date.now() };
            }
        }

        // 2. Try Supabase in background (don't block rendering)
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
            const { data, error } = await supabase
                .from('user_table_preferences')
                .select('column_visibility, column_sizing, column_order')
                .eq('user_id', user.id)
                .eq('table_key', tableKey)
                .maybeSingle();

            if (data && !error) {
                const prefs: TablePreferences = {
                    columnVisibility: data.column_visibility || {},
                    columnSizing: data.column_sizing || {},
                    columnOrder: data.column_order || [],
                };
                localStorage.setItem(CACHE_PREFIX + tableKey, JSON.stringify(prefs));
                memoryCache[tableKey] = { prefs, timestamp: Date.now() };
                return prefs;
            }
        }

        return localPrefs;
    } catch (error) {
        console.warn('Failed to get table preferences:', error);

        // Try localStorage fallback
        const cached = localStorage.getItem(CACHE_PREFIX + tableKey);
        if (cached) {
            const prefs = JSON.parse(cached);
            memoryCache[tableKey] = { prefs, timestamp: Date.now() };
            return prefs;
        }

        return null;
    }
}

/**
 * حفظ تفضيلات جدول معين للمستخدم الحالي
 */
export async function saveTablePreferences(
    tableKey: string,
    preferences: Partial<TablePreferences>
): Promise<boolean> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
            // Save to localStorage only if not authenticated
            const existing = localStorage.getItem(CACHE_PREFIX + tableKey);
            const current = existing ? JSON.parse(existing) : {};
            const updated = { ...current, ...preferences };
            localStorage.setItem(CACHE_PREFIX + tableKey, JSON.stringify(updated));
            return true;
        }

        // Prepare data for upsert
        const updateData: Record<string, any> = {
            user_id: user.id,
            table_key: tableKey,
        };

        if (preferences.columnVisibility !== undefined) {
            updateData.column_visibility = preferences.columnVisibility;
        }
        if (preferences.columnSizing !== undefined) {
            updateData.column_sizing = preferences.columnSizing;
        }
        if (preferences.columnOrder !== undefined) {
            updateData.column_order = preferences.columnOrder;
        }

        // Upsert to Supabase
        const { error } = await supabase
            .from('user_table_preferences')
            .upsert(updateData, {
                onConflict: 'user_id,table_key',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Failed to save to Supabase:', error);
            // Fallback: save to localStorage
            const existing = localStorage.getItem(CACHE_PREFIX + tableKey);
            const current = existing ? JSON.parse(existing) : {};
            const updated = { ...current, ...preferences };
            localStorage.setItem(CACHE_PREFIX + tableKey, JSON.stringify(updated));
            return false;
        }

        // Update local cache + memory cache
        const existing = localStorage.getItem(CACHE_PREFIX + tableKey);
        const current = existing ? JSON.parse(existing) : {};
        const updated = { ...current, ...preferences };
        localStorage.setItem(CACHE_PREFIX + tableKey, JSON.stringify(updated));
        memoryCache[tableKey] = { prefs: updated as TablePreferences, timestamp: Date.now() };

        return true;
    } catch (error) {
        console.warn('Failed to save table preferences:', error);

        // Fallback: save to localStorage
        try {
            const existing = localStorage.getItem(CACHE_PREFIX + tableKey);
            const current = existing ? JSON.parse(existing) : {};
            const updated = { ...current, ...preferences };
            localStorage.setItem(CACHE_PREFIX + tableKey, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }

        return false;
    }
}

/**
 * حذف تفضيلات جدول معين (إعادة التعيين)
 */
export async function resetTablePreferences(tableKey: string): Promise<boolean> {
    try {
        localStorage.removeItem(CACHE_PREFIX + tableKey);

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
            const { error } = await supabase
                .from('user_table_preferences')
                .delete()
                .eq('user_id', user.id)
                .eq('table_key', tableKey);

            if (error) {
                console.error('Failed to delete from Supabase:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.warn('Failed to reset table preferences:', error);
        return false;
    }
}

// Debounce helper for saving preferences
let saveTimeouts: Record<string, NodeJS.Timeout> = {};

export function debouncedSavePreferences(
    tableKey: string,
    preferences: Partial<TablePreferences>,
    delay: number = 1000
): void {
    // Clear existing timeout
    if (saveTimeouts[tableKey]) {
        clearTimeout(saveTimeouts[tableKey]);
    }

    // Set new timeout
    saveTimeouts[tableKey] = setTimeout(() => {
        saveTablePreferences(tableKey, preferences);
        delete saveTimeouts[tableKey];
    }, delay);
}
