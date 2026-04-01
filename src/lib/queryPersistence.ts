/**
 * ════════════════════════════════════════════════════════════════
 * 💾 Query Persistence — حفظ كاش React Query في IndexedDB
 * ════════════════════════════════════════════════════════════════
 *
 * يحفظ كاش React Query على الهارد ديسك (IndexedDB عبر Dexie.js)
 * بحيث عند إغلاق المتصفح وإعادة فتحه → البيانات تظهر فوراً (0ms)
 * ثم يزامن بالخلفية مع السيرفر.
 *
 * 🔐 ISOLATION: Each user+company gets its own IndexedDB database.
 * DB Name format: TexaCoreCache_{userId}_{companyId}
 * This prevents cross-company data leaking when switching companies.
 *
 * ⚠️ IMPORTANT: Cache busting is handled by PersistQueryClientProvider's
 *    built-in `buster` option. Do NOT add custom buster logic here.
 *    Keep restoreClient as simple as possible per TanStack docs.
 *
 * ════════════════════════════════════════════════════════════════
 */

import Dexie, { type Table } from 'dexie';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

// ─── Cache Entry Schema ──────────────────────────────────────
interface CacheEntry {
    key: string;          // 'REACT_QUERY_OFFLINE_CACHE'
    value: string;        // JSON-serialized PersistedClient
    updatedAt: number;    // timestamp
}

// ─── Dexie Database for Query Cache ──────────────────────────
class QueryCacheDB extends Dexie {
    cache!: Table<CacheEntry>;

    constructor(dbName: string) {
        super(dbName);
        this.version(1).stores({
            cache: 'key',
        });
    }
}

// ─── Resolve current user + company from Supabase session ────
// Uses localStorage directly to avoid circular imports with supabase.ts
function resolveSessionIdentity(): { userId: string; companyId: string } {
    try {
        // Find the Supabase auth token in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const user = parsed?.user || parsed?.currentSession?.user;
                    if (user?.id) {
                        const userId = user.id.substring(0, 8);
                        const companyId = (
                            user.user_metadata?.company_id ||
                            user.app_metadata?.company_id ||
                            'default'
                        ).substring(0, 8);
                        return { userId, companyId };
                    }
                }
            }
        }
    } catch {
        // localStorage might not be available
    }
    return { userId: 'anon', companyId: 'default' };
}

// ─── Singleton management ────────────────────────────────────
let currentDB: QueryCacheDB | null = null;
let currentDBName: string | null = null;

function getDB(): QueryCacheDB {
    const { userId, companyId } = resolveSessionIdentity();
    const dbName = `TexaCoreCache_${userId}_${companyId}`;

    // Reuse existing DB if name matches
    if (currentDB && currentDBName === dbName) {
        return currentDB;
    }

    // Close old DB and open new one
    currentDB?.close();
    currentDB = new QueryCacheDB(dbName);
    currentDBName = dbName;

    return currentDB;
}

// ─── Create the Persister (Dexie-backed, user+company scoped) ─
// ⚠️ Keep this as SIMPLE as possible — no custom buster logic.
// PersistQueryClientProvider handles cache invalidation via its `buster` option.
export function createDexiePersister(): Persister {
    return {
        persistClient: async (client: PersistedClient) => {
            try {
                const db = getDB();
                const serialized = JSON.stringify(client);
                await db.cache.put({
                    key: 'REACT_QUERY_OFFLINE_CACHE',
                    value: serialized,
                    updatedAt: Date.now(),
                });
            } catch (err) {
                console.warn('⚠️ [QueryPersistence] Failed to persist cache:', err);
            }
        },

        restoreClient: async (): Promise<PersistedClient | undefined> => {
            try {
                const db = getDB();
                const entry = await db.cache.get('REACT_QUERY_OFFLINE_CACHE');
                if (!entry?.value) {
                    console.log('📭 [QueryPersistence] No cache found in IndexedDB');
                    return undefined;
                }

                const parsed = JSON.parse(entry.value);
                console.log(`⚡ [QueryPersistence] Restored cache from ${currentDBName} (${Math.round(entry.value.length / 1024)}KB, ${new Date(entry.updatedAt).toLocaleTimeString()})`);
                return parsed as PersistedClient;
            } catch (err) {
                console.warn('⚠️ [QueryPersistence] Failed to restore cache:', err);
                return undefined;
            }
        },

        removeClient: async () => {
            try {
                const db = getDB();
                await db.cache.delete('REACT_QUERY_OFFLINE_CACHE');
                console.log('🗑️ [QueryPersistence] Cache removed');
            } catch (err) {
                console.warn('⚠️ [QueryPersistence] Failed to remove cache:', err);
            }
        },
    };
}

// ─── Helper: Clear cache for security events ─────────────────
export async function clearUserCache(userId: string) {
    try {
        // Clear all DBs that match this userId
        const databases = await Dexie.getDatabaseNames();
        const userCaches = databases.filter(n =>
            n.startsWith(`TexaCoreCache_${userId.substring(0, 8)}`)
        );
        await Promise.all(userCaches.map(n => Dexie.delete(n)));
        console.log(`🗑️ [QueryPersistence] Cleared ${userCaches.length} cache DBs for user:`, userId.substring(0, 8));
    } catch (err) {
        console.warn('⚠️ [QueryPersistence] Failed to clear user cache:', err);
    }
}

// ─── Helper: Clear all caches (for debugging / logout) ────────
export async function clearAllCaches() {
    const databases = await Dexie.getDatabaseNames();
    const texaCaches = databases.filter(n => n.startsWith('TexaCoreCache_'));
    await Promise.all(texaCaches.map(n => Dexie.delete(n)));
    console.log(`🗑️ [QueryPersistence] Cleared ${texaCaches.length} cache databases`);
}

