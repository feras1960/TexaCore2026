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
 * 🔧 Pipeline (Phase 2):
 *   SAVE: JSON → SHA-256 hash → LZ-String compress → AES-GCM encrypt → Store
 *   LOAD: Store → Decrypt → Decompress → Verify hash → Parse
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

// ─── Create the Persister (with compression + integrity + encryption) ─

export function createDexiePersister(): Persister {
    return {
        persistClient: async (client: PersistedClient) => {
            try {
                const db = getDB();

                // === SAVE PIPELINE ===
                // 1. Serialize
                const json = JSON.stringify(client);

                // 2. Compute integrity hash (on original data)
                const hash = await dataIntegrity.computeHash(json);

                // 3. Compress (smart — only if > 1KB)
                const { data: maybeCompressed, compressed } = dataCompressor.smartCompress(json);

                // 4. Encrypt (if key is available)
                const encrypted = dbEncryption.hasKey();
                const finalData = encrypted
                    ? await dbEncryption.encrypt(maybeCompressed)
                    : maybeCompressed;

                // 5. Store with metadata
                await db.cache.put({
                    key: 'REACT_QUERY_OFFLINE_CACHE',
                    value: finalData,
                    updatedAt: Date.now(),
                    compressed,
                    encrypted,
                    hash,
                });

                // Log stats
                const ratio = ((finalData.length / json.length) * 100).toFixed(1);
                console.log(
                    `💾 [Persist] Saved: ${(json.length / 1024).toFixed(0)}KB → ${(finalData.length / 1024).toFixed(0)}KB (${ratio}%) | 🗜${compressed ? '✅' : '⬜'} 🔐${encrypted ? '✅' : '⬜'}`
                );
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

                // === LOAD PIPELINE ===
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

