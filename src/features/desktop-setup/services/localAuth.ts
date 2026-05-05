// ════════════════════════════════════════════════════════════
// Desktop Local Auth Service
// ════════════════════════════════════════════════════════════
// Since we use Supabase Self-Hosted (GoTrue in Docker),
// auth works the same as cloud — we just need to:
// 1. Auto-create the admin user during setup
// 2. Point the Supabase client to localhost:54321
// 3. Store credentials locally for offline re-auth

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appConfig } from '@/lib/supabase';

// ─── Desktop Supabase Client (points to local Docker) ─────
const DESKTOP_SUPABASE_URL = appConfig.supabaseUrl || 'http://localhost:54321';
const DESKTOP_ANON_KEY = appConfig.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WO_eo0y4lHl1pBdvVu_mkwMvO1s22qwpM3C0';
const DESKTOP_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

let desktopClient: SupabaseClient | null = null;
let desktopServiceClient: SupabaseClient | null = null;

export function getDesktopSupabase(): SupabaseClient {
  if (!desktopClient) {
    desktopClient = createClient(DESKTOP_SUPABASE_URL, DESKTOP_ANON_KEY, {
      auth: { persistSession: true, storageKey: 'texacore-desktop-auth' },
    });
  }
  return desktopClient;
}

export function getDesktopServiceSupabase(): SupabaseClient {
  if (!desktopServiceClient) {
    desktopServiceClient = createClient(DESKTOP_SUPABASE_URL, DESKTOP_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return desktopServiceClient;
}

// ─── Check if running in Desktop mode ─────────────────────
export function isDesktopMode(): boolean {
  return !!(window as any).electronAPI || localStorage.getItem('texacore_mode') === 'desktop';
}

// ─── Create admin user during first-run setup ─────────────
export async function createAdminUser(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<{ userId: string; error?: string }> {
  const svc = getDesktopServiceSupabase();

  // Create user via admin API (service_role bypasses email confirmation)
  const { data, error } = await svc.auth.admin.createUser({
    email: params.email || `admin@${Date.now()}.local`,
    password: params.password,
    email_confirm: true, // auto-confirm
    user_metadata: {
      full_name: params.fullName,
      phone: params.phone || '',
      role: 'admin',
      is_super_admin: true,
    },
  });

  if (error) return { userId: '', error: error.message };
  return { userId: data.user.id };
}

// ─── Sign in locally ──────────────────────────────────────
export async function signInLocal(email: string, password: string) {
  const client = getDesktopSupabase();
  return client.auth.signInWithPassword({ email, password });
}

// ─── Offline re-auth (cached credentials) ─────────────────
const OFFLINE_AUTH_KEY = 'texacore_offline_auth';

export function cacheAuthForOffline(email: string, sessionToken: string) {
  try {
    localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify({
      email, sessionToken, cachedAt: Date.now(),
    }));
  } catch {}
}

export function getOfflineAuth(): { email: string; sessionToken: string } | null {
  try {
    const stored = localStorage.getItem(OFFLINE_AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}
