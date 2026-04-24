// ════════════════════════════════════════════════════════════
// Desktop Supabase Config Injector
// ════════════════════════════════════════════════════════════
// This script runs BEFORE the React app loads (injected by Electron's preload).
// It sets window.__TEXACORE_CONFIG__ to point to the local Docker stack.

const DESKTOP_CONFIG = {
  supabaseUrl: 'http://localhost:54321',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WO_eo0y4lHl1pBdvVu_mkwMvO1s22qwpM3C0',
  mode: 'selfhosted' as const,
  version: '1.0.0',
};

/**
 * Call this from Electron's preload.js to configure the app
 * to use the local Supabase stack instead of cloud.
 */
export function injectDesktopConfig() {
  if (typeof window !== 'undefined') {
    (window as any).__TEXACORE_CONFIG__ = DESKTOP_CONFIG;
    localStorage.setItem('texacore_mode', 'desktop');
    console.log('🖥️ [TexaCore Desktop] Config injected → localhost:54321');
  }
}

/**
 * Check if Docker services are running and healthy
 */
export async function checkDockerHealth(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
}> {
  const services: Record<string, boolean> = {
    kong: false,
    auth: false,
    rest: false,
    db: false,
  };

  try {
    // Check Kong (API Gateway)
    const kongRes = await fetch('http://localhost:54321/rest/v1/', {
      method: 'HEAD',
      headers: { apikey: DESKTOP_CONFIG.supabaseKey },
    }).catch(() => null);
    services.kong = kongRes?.ok || kongRes?.status === 200 || false;

    // Check Auth (GoTrue)
    const authRes = await fetch('http://localhost:54321/auth/v1/health', {
      headers: { apikey: DESKTOP_CONFIG.supabaseKey },
    }).catch(() => null);
    services.auth = authRes?.ok || false;

    // Check REST (PostgREST) — 200 or 406 both mean it's running
    const restRes = await fetch('http://localhost:54321/rest/v1/', {
      headers: { apikey: DESKTOP_CONFIG.supabaseKey },
    }).catch(() => null);
    services.rest = restRes !== null && restRes.status < 500;

    // If Kong + Auth are up, DB is up too
    services.db = services.kong && services.auth;
  } catch {
    // All failed
  }

  return {
    healthy: Object.values(services).every(Boolean),
    services,
  };
}

/**
 * Wait for Docker to be ready (with retries)
 */
export async function waitForDocker(
  maxRetries = 30,
  intervalMs = 2000,
  onRetry?: (attempt: number, maxRetries: number) => void,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const { healthy } = await checkDockerHealth();
    if (healthy) return true;
    onRetry?.(i + 1, maxRetries);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}
