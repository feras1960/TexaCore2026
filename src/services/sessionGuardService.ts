// ════════════════════════════════════════════════════════════════
// 🔒 Session Guard Service — Concurrent session limiting
// ════════════════════════════════════════════════════════════════

const SESSION_GUARD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-guard`;
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

// Generate a unique session token per browser tab
const SESSION_TOKEN = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Get stored license key from localStorage (set by self-hosted installer)
 */
function getLicenseKey(): string | null {
  try {
    const config = localStorage.getItem('texacore_selfhosted_config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.licenseKey || null;
    }
  } catch {}
  return null;
}

/**
 * Get hardware ID from localStorage (set by Electron preload)
 */
function getHardwareId(): string | null {
  try {
    const config = localStorage.getItem('texacore_selfhosted_config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.hardwareId || null;
    }
  } catch {}
  return null;
}

/**
 * Check if running in self-hosted mode
 */
export function isSelfHosted(): boolean {
  return !!getLicenseKey();
}

/**
 * Register a session — call on app startup / login
 * Returns { success, error?, sessions_used, sessions_max }
 */
export async function registerSession(): Promise<{
  success: boolean;
  error?: string;
  sessions_used?: number;
  sessions_max?: number;
  devices_used?: number;
  devices_max?: number;
}> {
  const licenseKey = getLicenseKey();
  if (!licenseKey) return { success: true }; // Cloud mode — no limit

  try {
    const res = await fetch(SESSION_GUARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        license_key: licenseKey,
        session_token: SESSION_TOKEN,
        hardware_id: getHardwareId(),
        user_agent: navigator.userAgent,
        hostname: window.location.hostname,
      }),
    });

    const data = await res.json();

    if (data.success) {
      // Start heartbeat
      startHeartbeat();
    }

    return data;
  } catch (err) {
    console.warn('[SessionGuard] Register failed:', err);
    // Allow access if guard is unreachable (offline mode)
    return { success: true };
  }
}

/**
 * Send heartbeat to keep session alive
 */
async function sendHeartbeat(): Promise<void> {
  try {
    await fetch(SESSION_GUARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        session_token: SESSION_TOKEN,
      }),
    });
  } catch {
    // Silent fail — next heartbeat will retry
  }
}

/**
 * Start heartbeat timer
 */
function startHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

/**
 * End session — call on logout or tab close
 */
export async function endSession(): Promise<void> {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  const licenseKey = getLicenseKey();
  if (!licenseKey) return;

  try {
    // Use sendBeacon for reliable delivery on tab close
    const payload = JSON.stringify({
      action: 'end',
      session_token: SESSION_TOKEN,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(SESSION_GUARD_URL, new Blob([payload], { type: 'application/json' }));
    } else {
      await fetch(SESSION_GUARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    // Best effort
  }
}

/**
 * Initialize session guard — register + setup cleanup on unload
 */
export async function initSessionGuard(): Promise<{
  allowed: boolean;
  error?: string;
  sessions_used?: number;
  sessions_max?: number;
}> {
  if (!isSelfHosted()) {
    return { allowed: true };
  }

  const result = await registerSession();

  if (!result.success) {
    return {
      allowed: false,
      error: result.error,
      sessions_used: result.sessions_used,
      sessions_max: result.sessions_max,
    };
  }

  // Clean up on tab close / refresh
  window.addEventListener('beforeunload', () => {
    endSession();
  });

  // Clean up on visibility change (tab hidden for long time)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
    }
  });

  return {
    allowed: true,
    sessions_used: result.sessions_used,
    sessions_max: result.sessions_max,
  };
}
