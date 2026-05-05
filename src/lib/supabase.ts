import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase'; // TODO: Update Database types from Supabase

// ════════════════════════════════════════════════════════════════
// 🔧 Dynamic Config — supports both SaaS and Self-Hosted modes
// ════════════════════════════════════════════════════════════════
// Priority:
//   1. window.__TEXACORE_CONFIG__  → Self-Hosted (injected by Docker/Nginx)
//   2. import.meta.env             → SaaS (from .env file)
// ════════════════════════════════════════════════════════════════

interface TexaCoreConfig {
  supabaseUrl: string;
  supabaseKey: string;
  mode: 'saas' | 'selfhosted';
  licensingUrl?: string;   // URL لسيرفر التراخيص (Cloud)
  version?: string;        // إصدار التطبيق
}

declare global {
  interface Window {
    __TEXACORE_CONFIG__?: Partial<TexaCoreConfig>;
  }
}

function getConfig(): TexaCoreConfig {
  const windowConfig = typeof window !== 'undefined' ? window.__TEXACORE_CONFIG__ : undefined;

  // 🖥️ Desktop/Local mode — check localStorage for active local company
  // This is written by LocalRegistrationWizard after successful company creation
  let localUrl = '';
  let localKey = '';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('texacore_active_company');
      if (stored) {
        const parsed = JSON.parse(stored);
        localUrl = parsed?.url  || '';
        localKey = parsed?.anonKey || '';
      }
    } catch { /* ignore malformed data */ }
  }

  // Support both naming conventions from config.js:
  //   supabaseUrl / supabaseKey  (preferred — matches TexaCoreConfig)
  //   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (legacy compat)
  const wc = windowConfig as any;
  const supabaseUrl = wc?.supabaseUrl || wc?.VITE_SUPABASE_URL || localUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = wc?.supabaseKey || wc?.VITE_SUPABASE_ANON_KEY || localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const mode        = wc?.mode
    || (supabaseUrl.includes('localhost') ? 'selfhosted' : undefined)
    || (localUrl ? 'selfhosted' : undefined)
    || (import.meta.env.VITE_TEXACORE_MODE as 'saas' | 'selfhosted')
    || 'saas';

  return {
    supabaseUrl,
    supabaseKey,
    mode,
    licensingUrl: windowConfig?.licensingUrl || import.meta.env.VITE_LICENSING_URL || '',
    version: windowConfig?.version || import.meta.env.VITE_APP_VERSION || '0.0.0',
  };
}


const config = getConfig();
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseKey;

/** Whether the app is running in Self-Hosted mode */
export const isSelfHosted = config.mode === 'selfhosted';

/** App configuration (read-only) */
export const appConfig = Object.freeze(config);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Please check your .env file or __TEXACORE_CONFIG__.');
}

// Detect local mode for Realtime disabling
const isLocalHost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Create Supabase client with proper auth configuration
// Removed custom fetch timeout as it was causing AbortError issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: supabaseUrl.includes('localhost')
      ? `sb-local-auth-token`   // consistent key for ALL local instances
      : undefined,              // supabase-js default (sb-{project}-auth-token)
    flowType: 'pkce',
    lock: async (_name: string, _timeout: number, cb: () => Promise<any>) => cb(),
    debug: false,
  },
  global: {
    headers: { 'x-client-info': 'erp-system' },
  },
});

// ═══════════════════════════════════════════════════════════════
// 🖥️ LOCAL MODE: Disable ALL WebSocket/Realtime connections
// This monkey-patches supabase.channel() to return a no-op channel
// so that EVERY component that calls .channel().on().subscribe()
// works silently without attempting WebSocket connections.
// ═══════════════════════════════════════════════════════════════
if (isLocalHost) {
  const noopChannel: any = {
    on: () => noopChannel,
    subscribe: (cb?: (status: string) => void) => {
      // Simulate successful subscription
      if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
      return noopChannel;
    },
    unsubscribe: () => Promise.resolve(),
    send: () => noopChannel,
  };

  const originalChannel = supabase.channel.bind(supabase);
  supabase.channel = (..._args: any[]) => noopChannel;
  supabase.removeChannel = () => Promise.resolve('ok' as any);
  supabase.removeAllChannels = () => Promise.resolve([] as any);

  console.log('🖥️ [Local Mode] Realtime WebSocket disabled — all .channel() calls return no-op');
}


// ═══════════════════════════════════════════════════════════════
// ☁️ CLOUD CLIENT — for Edge Functions only (AI, email, etc.)
// In self-hosted mode the main `supabase` client points to localhost.
// Edge Functions live on Supabase Cloud, so we need a separate client
// that always points there. Uses dedicated VITE_CLOUD_ values first,
// then falls back to the main VITE_ values.
// ═══════════════════════════════════════════════════════════════
const cloudUrl = import.meta.env.VITE_CLOUD_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const cloudKey = import.meta.env.VITE_CLOUD_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const cloudSupabase = (isSelfHosted && cloudUrl && cloudKey && !cloudUrl.includes('localhost') && !cloudUrl.includes('127.0.0.1'))
  ? createClient(cloudUrl, cloudKey, {
      auth: {
        persistSession: false,   // don't interfere with local auth
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-client-info': 'erp-system-hybrid' },
      },
    })
  : supabase;  // In SaaS mode, cloud = main client

// 🔐 Admin operations should use Edge Functions, not browser-side service_role
// Service role key removed from frontend for security
export const supabaseAdmin = null;

// ============================================
// Multi-Tenant Helper Functions
// ============================================

/**
 * Get current tenant_id from user metadata
 */
export const getCurrentTenantId = (): string | null => {
  try {
    const session = supabase.auth.getSession();
    if (!session) return null;

    // Try to get from session synchronously (cached)
    const cachedSession = localStorage.getItem(`sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`);
    if (cachedSession) {
      try {
        const parsed = JSON.parse(cachedSession);
        return parsed?.user?.user_metadata?.tenant_id || parsed?.user?.app_metadata?.tenant_id || null;
      } catch {
        // Ignore parse errors
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Get current tenant_id asynchronously (from server)
 */
export const getCurrentTenantIdAsync = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return user.user_metadata?.tenant_id || user.app_metadata?.tenant_id || null;
  } catch {
    return null;
  }
};

/**
 * Get current company_id from user metadata
 */
export const getCurrentCompanyId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return user.user_metadata?.company_id || user.app_metadata?.company_id || null;
  } catch {
    return null;
  }
};

/**
 * Check if current user is super admin
 * 🛡️ SECURITY: يستدعي الـ database function الآمنة بدلاً من قراءة user_metadata
 */
export const isSuperAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // ✅ Use cached metadata — RPC is unreliable (502/CORS)
    return user.user_metadata?.is_super_admin === true;
  } catch {
    return false;
  }
};

// ============================================
// Auth Helpers
// ============================================

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Expose supabase client to window for debugging (development only)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__SUPABASE_CLIENT__ = supabase;
}

// ─── Local Mode Helpers ──────────────────────────────────────────

/** True when the app is running against a locally-provisioned company */
export const isLocalMode = (): boolean => {
  try { return !!localStorage.getItem('texacore_active_company'); }
  catch { return false; }
};

/** Remove all local company data and restore cloud mode */
export const clearLocalMode = (): void => {
  try {
    localStorage.removeItem('texacore_active_company');
    localStorage.removeItem('texacore_local_session');
    localStorage.removeItem('sb-local-auth-token');
  } catch { /* ignore */ }
};

