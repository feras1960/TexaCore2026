import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase'; // TODO: Update Database types from Supabase

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Please check your .env file.');
}

// Create Supabase client with proper auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce', // Use PKCE flow for better security
  },
  global: {
    headers: {
      'x-client-info': 'erp-system',
    },
  },
});

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
 */
export const isSuperAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    return (
      user.user_metadata?.is_super_admin === true ||
      user.app_metadata?.is_super_admin === true ||
      false
    );
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

// Expose supabase client to window for debugging/seeding (development only)
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_CLIENT__ = supabase;
}
