/**
 * ════════════════════════════════════════════════════════════════
 * 🧵 Persist Worker — خيط منفصل لعمليات الحفظ الثقيلة
 * ════════════════════════════════════════════════════════════════
 *
 * يستقبل بيانات الكاش من الـ main thread ويقوم بـ:
 *   1. JSON.stringify  (200-500ms — أثقل عملية)
 *   2. SHA-256 hash    (50ms)
 *   3. LZ-String compress (100-300ms)
 *   4. IndexedDB write (5ms)
 *
 * كل هذا يعمل على خيط منفصل — صفر تأثير على الـ UI ✅
 *
 * ════════════════════════════════════════════════════════════════
 */

import LZString from 'lz-string';

// ─── Types ────────────────────────────────────────────────────

interface PersistMessage {
  type: 'PERSIST';
  payload: {
    clientData: unknown;
    dbName: string;
  };
}

interface PersistDoneMessage {
  type: 'PERSIST_DONE';
  stats: {
    originalKB: number;
    finalKB: number;
    ratio: string;
    compressed: boolean;
    elapsed: number;
  };
}

interface PersistErrorMessage {
  type: 'PERSIST_ERROR';
  error: string;
}

interface PersistSkipMessage {
  type: 'PERSIST_SKIP';
  reason: string;
}

type WorkerOutMessage = PersistDoneMessage | PersistErrorMessage | PersistSkipMessage;

// ─── SHA-256 Hash ─────────────────────────────────────────────

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Raw IndexedDB Helpers ────────────────────────────────────
// Using raw IndexedDB (not Dexie) to keep worker lightweight.
// The database is created by Dexie on the main thread; worker only writes.

function openDB(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      // Open WITHOUT version → uses existing version, no upgrade trigger
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains('cache')) {
          resolve(db);
        } else {
          db.close();
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeEntry(db: IDBDatabase, entry: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Message Handler ──────────────────────────────────────────

self.onmessage = async (event: MessageEvent<PersistMessage>) => {
  const { type, payload } = event.data;

  if (type !== 'PERSIST') return;

  const { clientData, dbName } = payload;
  const t0 = performance.now();

  try {
    // Phase 1: Serialize (HEAVY — 200-500ms for large caches)
    const json = JSON.stringify(clientData);

    // Phase 2: Compute SHA-256 integrity hash
    const hash = await computeHash(json);

    // Phase 3: Smart compress (LZ-String, only if > 1KB)
    let finalData = json;
    let compressed = false;
    if (json.length > 1024) {
      const comp = LZString.compressToUTF16(json);
      if (comp.length < json.length) {
        finalData = comp;
        compressed = true;
      }
    }

    // Phase 4: Write to IndexedDB
    const db = await openDB(dbName);
    if (!db) {
      const msg: PersistSkipMessage = { type: 'PERSIST_SKIP', reason: 'DB not ready yet' };
      self.postMessage(msg);
      return;
    }

    await writeEntry(db, {
      key: 'REACT_QUERY_OFFLINE_CACHE',
      value: finalData,
      updatedAt: Date.now(),
      compressed,
      encrypted: false,
      hash,
    });
    db.close();

    const elapsed = Math.round(performance.now() - t0);
    const ratio = ((finalData.length / json.length) * 100).toFixed(1);

    const msg: PersistDoneMessage = {
      type: 'PERSIST_DONE',
      stats: {
        originalKB: Math.round(json.length / 1024),
        finalKB: Math.round(finalData.length / 1024),
        ratio,
        compressed,
        elapsed,
      },
    };
    self.postMessage(msg);
  } catch (err: any) {
    const msg: PersistErrorMessage = {
      type: 'PERSIST_ERROR',
      error: err?.message || String(err),
    };
    self.postMessage(msg);
  }
};
