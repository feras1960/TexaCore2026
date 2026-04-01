/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ TexaCore Service Worker — Background Sync
 * ════════════════════════════════════════════════════════════════
 *
 * يزامن البيانات المعلقة في IndexedDB حتى لو المتصفح مغلق.
 * يعمل عبر Background Sync API (Chrome/Edge).
 *
 * ════════════════════════════════════════════════════════════════
 */

const SW_VERSION = '1.0.0';
const SYNC_TAG = 'texacore-sync';

// ─── Install ──────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${SW_VERSION}`);
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activated v${SW_VERSION}`);
  event.waitUntil(self.clients.claim());
});

// ─── Background Sync ─────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // 1. Open IndexedDB directly (no Dexie in SW context)
    const db = await openSyncDB();
    if (!db) {
      console.log('[SW] No sync database found');
      return;
    }

    // 2. Read pending items
    const pendingItems = await getPendingItems(db);
    if (pendingItems.length === 0) {
      console.log('[SW] No pending items');
      db.close();
      return;
    }

    console.log(`[SW] Syncing ${pendingItems.length} items`);

    // 3. Get auth token
    const token = getStoredToken();
    const config = getSupabaseConfig();

    if (!token || !config) {
      console.warn('[SW] No auth token or config — aborting sync');
      db.close();
      return;
    }

    // 4. Sync each item
    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        await syncItem(item, token, config);
        await updateItemStatus(db, item.id, 'done');
        synced++;
      } catch (err) {
        console.warn(`[SW] Failed to sync item ${item.id}:`, err.message);
        await updateItemStatus(db, item.id, 'pending', err.message);
        failed++;
      }
    }

    db.close();

    // 5. Notify clients
    const allClients = await self.clients.matchAll();
    allClients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETED',
        synced,
        failed,
        total: pendingItems.length,
      });
    });

    console.log(`[SW] Sync completed: ${synced} synced, ${failed} failed`);

    if (failed > 0) {
      throw new Error(`${failed} items failed — will retry`);
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // Browser will retry later
  }
}

// ─── IndexedDB Helpers (raw API — no Dexie in SW) ────────────

function openSyncDB() {
  return new Promise((resolve) => {
    // Find the warehouse offline DB
    const request = indexedDB.open('TexaCoreWarehouse');

    request.onerror = () => {
      resolve(null);
    };

    request.onsuccess = () => {
      const db = request.result;
      // Check if syncQueue store exists
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.close();
        resolve(null);
        return;
      }
      resolve(db);
    };

    request.onupgradeneeded = () => {
      // DB doesn't exist or needs upgrade — don't create it
      request.transaction.abort();
      resolve(null);
    };
  });
}

function getPendingItems(db) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    } catch {
      resolve([]);
    }
  });
}

function updateItemStatus(db, id, status, errorMessage) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.status = status;
          item.updatedAt = new Date().toISOString();
          if (status === 'pending') {
            item.attempts = (item.attempts || 0) + 1;
          }
          if (errorMessage) {
            item.errorMessage = errorMessage;
          }
          store.put(item);
        }
        resolve();
      };

      getReq.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function syncItem(item, token, config) {
  const method = item.operation === 'delete' ? 'DELETE'
    : item.operation === 'update' ? 'PATCH'
    : 'POST';

  let url = `${config.url}/rest/v1/${item.table}`;

  // For update/delete, add ID filter
  if ((method === 'PATCH' || method === 'DELETE') && item.payload?.id) {
    url += `?id=eq.${item.payload.id}`;
  }

  const body = method === 'DELETE' ? undefined : JSON.stringify(
    method === 'PATCH' ? (() => { const { id, ...rest } = item.payload; return rest; })() : item.payload
  );

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.anonKey,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
  }
}

// ─── Auth Token + Config ─────────────────────────────────────

function getStoredToken() {
  // SW can't access localStorage — use a message/cache approach
  // But we can try via IndexedDB or get it from the message
  // For now, we'll rely on the client sending the token
  return self.__texacore_token || null;
}

function getSupabaseConfig() {
  return self.__texacore_config || null;
}

// Listen for config from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_AUTH') {
    self.__texacore_token = event.data.token;
    self.__texacore_config = event.data.config;
  }

  if (event.data?.type === 'CLEAR_AUTH') {
    self.__texacore_token = null;
    self.__texacore_config = null;
  }
});
