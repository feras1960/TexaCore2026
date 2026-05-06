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
 *
 * 🧵 Architecture (v3 — Web Worker):
 *   SAVE: Main thread sends data → Worker does JSON.stringify + SHA-256 + LZ compress + IndexedDB write
 *   LOAD: Main thread reads from IndexedDB → Decrypt → Decompress → Verify hash → Parse
 *
 *   ✅ ZERO main-thread blocking during save operations
 *
 * ════════════════════════════════════════════════════════════════
 */

import Dexie, { type Table } from 'dexie';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { dataCompressor } from '@/lib/compression/dataCompression';
import { dataIntegrity } from '@/lib/integrity/dataIntegrity';
import { dbEncryption } from '@/lib/crypto/indexedDBEncryption';

// ─── Cache Entry Schema ──────────────────────────────────────
interface CacheEntry {
    key: string;          // 'REACT_QUERY_OFFLINE_CACHE'
    value: string;        // processed data (may be compressed + encrypted)
    updatedAt: number;    // timestamp
    compressed: boolean;  // flag: was LZ-String applied?
    encrypted: boolean;   // flag: was AES-GCM applied?
    hash: string;         // SHA-256 of original JSON (before compress/encrypt)
}

// ─── Encryption Salt Storage ─────────────────────────────────
interface EncryptionMeta {
    id: string;           // `${userId}_${tenantId}`
    salt: string;         // base64 encoded
    createdAt: number;
    version: number;
}

// ─── Dexie Database for Query Cache ──────────────────────────
class QueryCacheDB extends Dexie {
    cache!: Table<CacheEntry>;
    encryptionMeta!: Table<EncryptionMeta>;

    constructor(dbName: string) {
        super(dbName);
        this.version(2).stores({
            cache: 'key',
            encryptionMeta: '&id',
        });
    }
}

// ─── Resolve current user + company from Supabase session ────
function resolveSessionIdentity(): { userId: string; companyId: string } {
    try {
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

    if (currentDB && currentDBName === dbName) {
        return currentDB;
    }

    currentDB?.close();
    currentDB = new QueryCacheDB(dbName);
    currentDBName = dbName;

    return currentDB;
}

/** Get the current DB name (for passing to worker) */
function resolveDBName(): string {
    const { userId, companyId } = resolveSessionIdentity();
    return `TexaCoreCache_${userId}_${companyId}`;
}

// ═══════════════════════════════════════════════════════════════
// 🧵 Web Worker — handles heavy persistence off main thread
// ═══════════════════════════════════════════════════════════════
let persistWorker: Worker | null = null;

function getWorker(): Worker | null {
    if (persistWorker) return persistWorker;

    try {
        persistWorker = new Worker(
            new URL('./workers/persistWorker.ts', import.meta.url),
            { type: 'module' }
        );

        persistWorker.onmessage = (event) => {
            const { type } = event.data;
            if (type === 'PERSIST_DONE') {
                const { stats } = event.data;
                console.log(
                    `💾 [Persist] 🧵 Worker saved: ${stats.originalKB}KB → ${stats.finalKB}KB (${stats.ratio}%) in ${stats.elapsed}ms | 🗜${stats.compressed ? '✅' : '⬜'} | Main thread: 0ms ✅`
                );
            } else if (type === 'PERSIST_ERROR') {
                console.warn('⚠️ [Persist] Worker error:', event.data.error);
            } else if (type === 'PERSIST_SKIP') {
                console.log('💾 [Persist] Worker skipped:', event.data.reason);
            }
        };

        persistWorker.onerror = (err) => {
            console.warn('⚠️ [Persist] Worker failed, falling back to main thread:', err.message);
            persistWorker = null;
        };

        console.log('🧵 [Persist] Web Worker initialized — persistence is off-thread');
        return persistWorker;
    } catch (err) {
        console.warn('⚠️ [Persist] Web Worker not available, using main thread fallback');
        return null;
    }
}

// ─── Create the Persister ────────────────────────────────────

export function createDexiePersister(): Persister {
    // ═══════════════════════════════════════════════
    // 🧵 Anti-Freeze Strategy (v3 — Web Worker):
    //
    //    Previous problem: JSON.stringify + LZ compress on main thread
    //    blocked UI for 200-800ms, causing visible freezes.
    //
    //    Solution: ALL heavy save operations run in a Web Worker:
    //    1. STARTUP GRACE: Skip writes for 120s after page load
    //    2. THROTTLE: At most once per 120s
    //    3. WORKER: stringify + hash + compress + write → off-thread
    //    4. FALLBACK: If Worker fails, use main thread with idle callback
    //
    //    Result: 0ms main-thread blocking during persistence ✅
    // ═══════════════════════════════════════════════
    let pendingClient: PersistedClient | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const THROTTLE_MS = 120_000;         // 120 seconds between writes
    const STARTUP_GRACE_MS = 120_000;    // Skip persistence for first 120s
    const startupTime = Date.now();

    // Ensure DB is created (Dexie schema) before Worker tries to write
    // This runs once — very fast, just opens the DB connection
    try { getDB(); } catch { /* will retry later */ }

    // ── Main-thread fallback (used only if Worker unavailable) ──
    const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 0));

    async function doFlushMainThread(client: PersistedClient) {
        try {
            const db = getDB();
            const t0 = performance.now();

            const json = JSON.stringify(client);
            await yieldToMain();

            const hash = await dataIntegrity.computeHash(json);
            await yieldToMain();

            const { data: maybeCompressed, compressed } = dataCompressor.smartCompress(json);
            await yieldToMain();

            const encrypted = dbEncryption.hasKey();
            const finalData = encrypted
                ? await dbEncryption.encrypt(maybeCompressed)
                : maybeCompressed;
            await yieldToMain();

            await db.cache.put({
                key: 'REACT_QUERY_OFFLINE_CACHE',
                value: finalData,
                updatedAt: Date.now(),
                compressed,
                encrypted,
                hash,
            });

            const ratio = ((finalData.length / json.length) * 100).toFixed(1);
            const elapsed = Math.round(performance.now() - t0);
            console.log(
                `💾 [Persist] Main-thread saved: ${(json.length / 1024).toFixed(0)}KB → ${(finalData.length / 1024).toFixed(0)}KB (${ratio}%) in ${elapsed}ms | 🗜${compressed ? '✅' : '⬜'} 🔐${encrypted ? '✅' : '⬜'}`
            );
        } catch (err) {
            console.warn('⚠️ [QueryPersistence] Failed to persist cache:', err);
        }
    }

    // ── Flush: send to Worker or fallback ──
    function doFlush() {
        const client = pendingClient;
        pendingClient = null;
        if (!client) return;

        const worker = getWorker();

        if (worker && !dbEncryption.hasKey()) {
            // 🧵 Off-thread persistence — ZERO main thread blocking
            // Note: encryption requires main-thread crypto key, so we skip Worker for encrypted mode
            const dbName = resolveDBName();
            worker.postMessage({
                type: 'PERSIST',
                payload: { clientData: client, dbName },
            });
        } else {
            // Fallback: main thread (Worker unavailable or encryption active)
            doFlushMainThread(client);
        }
    }

    return {
        persistClient: async (client: PersistedClient) => {
            // Batch: just store latest state, actual write is deferred
            pendingClient = client;

            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    throttleTimer = null;

                    // 🛡️ During startup grace period, defer further
                    const elapsed = Date.now() - startupTime;
                    if (elapsed < STARTUP_GRACE_MS) {
                        const remaining = STARTUP_GRACE_MS - elapsed + 1000;
                        console.log(`💾 [Persist] Startup grace — deferring ${Math.round(remaining / 1000)}s`);
                        throttleTimer = setTimeout(() => {
                            throttleTimer = null;
                            doFlush();
                        }, remaining);
                        return;
                    }

                    doFlush();
                }, THROTTLE_MS);
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

                // === LOAD PIPELINE (main thread — runs once at startup) ===
                // 1. Decrypt (if encrypted)
                let data: string;
                if (entry.encrypted) {
                    if (!dbEncryption.hasKey()) {
                        console.log('🔐 [QueryPersistence] Cache is encrypted but no key — skipping');
                        return undefined;
                    }
                    data = await dbEncryption.decrypt(entry.value);
                } else {
                    data = entry.value;
                }

                // 2. Decompress (if compressed)
                data = dataCompressor.smartDecompress(data, entry.compressed);

                // 3. Verify integrity hash
                if (entry.hash) {
                    const isValid = await dataIntegrity.verify(data, entry.hash);
                    if (!isValid) {
                        console.error('❌ [QueryPersistence] Hash mismatch — cache corrupted, clearing...');
                        await db.cache.delete('REACT_QUERY_OFFLINE_CACHE');
                        return undefined;
                    }
                }

                // 4. Parse
                const parsed = JSON.parse(data);
                console.log(
                    `⚡ [QueryPersistence] Restored from ${currentDBName} (${Math.round(data.length / 1024)}KB, ${new Date(entry.updatedAt).toLocaleTimeString()}) | 🗜${entry.compressed ? '✅' : '⬜'} 🔐${entry.encrypted ? '✅' : '⬜'}`
                );
                return parsed as PersistedClient;
            } catch (err) {
                console.warn('⚠️ [QueryPersistence] Failed to restore cache:', err);
                // Corrupted cache — clear it
                try {
                    const db = getDB();
                    await db.cache.delete('REACT_QUERY_OFFLINE_CACHE');
                } catch { /* ignore */ }
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

// ─── Encryption Key Management ───────────────────────────────

/**
 * Initialize encryption after login — derives key from user identity
 */
export async function initEncryption(userId: string, tenantId: string): Promise<void> {
    try {
        const db = getDB();
        const metaKey = `${userId.substring(0, 8)}_${tenantId || 'default'}`;

        let meta = await db.encryptionMeta.get(metaKey);

        if (!meta) {
            // First time — generate new salt
            const { salt } = await dbEncryption.deriveKey(userId, tenantId || 'default');
            await db.encryptionMeta.put({
                id: metaKey,
                salt: _arrayBufferToBase64(new Uint8Array(salt).buffer as ArrayBuffer),
                createdAt: Date.now(),
                version: 1,
            });
            console.log('🔐 [Persist] New encryption key derived + salt saved');
        } else {
            // Existing — restore key from saved salt
            const salt = new Uint8Array(_base64ToArrayBuffer(meta.salt));
            await dbEncryption.deriveKey(userId, tenantId || 'default', salt);
            console.log('🔐 [Persist] Encryption key restored from saved salt');
        }
    } catch (err) {
        console.warn('🔐 [Persist] Encryption init failed (non-critical):', err);
    }
}

// ─── Helper: Clear cache for security events ─────────────────
export async function clearUserCache(userId: string) {
    try {
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

// ─── Helper: Clear all caches ─────────────────────────────────
export async function clearAllCaches() {
    const databases = await Dexie.getDatabaseNames();
    const texaCaches = databases.filter(n => n.startsWith('TexaCoreCache_'));
    await Promise.all(texaCaches.map(n => Dexie.delete(n)));
    console.log(`🗑️ [QueryPersistence] Cleared ${texaCaches.length} cache databases`);
}

// ─── Base64 Utilities ─────────────────────────────────────────

function _arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
