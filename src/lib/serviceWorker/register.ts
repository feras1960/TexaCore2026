/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ Service Worker Registration — تسجيل + Background Sync
 * ════════════════════════════════════════════════════════════════
 *
 * يُسجل الـ Service Worker ويُعد الـ Background Sync API.
 * Chrome/Edge فقط — fallback في المتصفحات الأخرى.
 *
 * ════════════════════════════════════════════════════════════════
 */

const SYNC_TAG = 'texacore-sync';

// ─── Register Service Worker ──────────────────────────────────

let _registration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    _registration = registration;
    console.log('[SW] ✅ Registered:', registration.scope);

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', _handleSWMessage);

    // Update check
    registration.addEventListener('updatefound', () => {
      console.log('[SW] New version found — installing...');
    });

    return registration;
  } catch (error) {
    console.warn('[SW] Registration failed:', error);
    return null;
  }
}

// ─── Send Auth to Service Worker ──────────────────────────────

/**
 * إرسال token و config للـ Service Worker
 * يُستدعى عند login وعند token refresh
 */
export async function sendAuthToSW(token: string, supabaseUrl: string, anonKey: string): Promise<void> {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return;

  sw.postMessage({
    type: 'SET_AUTH',
    token,
    config: { url: supabaseUrl, anonKey },
  });
}

/**
 * مسح auth من Service Worker (عند logout)
 */
export async function clearSWAuth(): Promise<void> {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return;

  sw.postMessage({ type: 'CLEAR_AUTH' });
}

// ─── Request Background Sync ──────────────────────────────────

/**
 * طلب مزامنة خلفية — يعمل حتى لو المتصفح مغلق (Chrome/Edge فقط)
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = _registration || await navigator.serviceWorker.ready;

    // Check if Background Sync API is supported
    if (!('sync' in registration)) {
      console.log('[SW] Background Sync API not supported');
      return false;
    }

    await (registration as any).sync.register(SYNC_TAG);
    console.log('[SW] ✅ Background sync registered');
    return true;
  } catch (error) {
    console.warn('[SW] Failed to register background sync:', error);
    return false;
  }
}

// ─── Handle SW Messages ──────────────────────────────────────

function _handleSWMessage(event: MessageEvent): void {
  const { data } = event;
  if (!data?.type) return;

  switch (data.type) {
    case 'BACKGROUND_SYNC_COMPLETED':
      console.log(`[SW] Background sync completed: ${data.synced} synced, ${data.failed} failed`);
      // Dispatch custom event for UI to pick up
      window.dispatchEvent(new CustomEvent('texacore-bg-sync', {
        detail: data,
      }));
      break;
  }
}

// ─── Unregister (for debugging) ───────────────────────────────

export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(r => r.unregister()));
  _registration = null;
  console.log('[SW] All service workers unregistered');
}
