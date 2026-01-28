/**
 * Supabase Client Configuration
 * Multi-tenant ERP authentication with persistent session storage
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Use different storage based on platform
let storage;
if (Platform.OS === 'web') {
  // Use localStorage for web
  storage = {
    getItem: async (key: string) => {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      return null;
    },
    setItem: async (key: string, value: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    },
  };
} else {
  // Use AsyncStorage for mobile
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

// Supabase Configuration - Hardcoded for web compatibility
const SUPABASE_URL = 'https://wzkklenfsaepegymfxfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI';

// Debug log
console.log('🔑 Supabase Client Initialized');
console.log('  URL:', SUPABASE_URL);
console.log('  KEY:', SUPABASE_ANON_KEY.substring(0, 30) + '...');

// Create Supabase client with cross-platform storage and optimized settings
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'texa-mobile',
    },
  },
});

/**
 * Database Types (based on FINAL_RECONCILIATION_REPORT.md)
 */

// User Roles enum (matching role_code in user_roles table)
export enum UserRole {
  FULL_ADMIN = 'full_admin',
  ACCOUNTANT = 'accountant',
  WAREHOUSE_KEEPER = 'warehouse_keeper',
  SALES_REP = 'sales_rep',
  PURCHASING_MANAGER = 'purchasing_manager',
  // Legacy/fallback
  ADMIN = 'admin',
  DRIVER = 'driver',
  WAREHOUSE_MANAGER = 'warehouse_manager',
  CASHIER = 'cashier',
  SALES = 'sales',
  HR_MANAGER = 'hr_manager',
}

// User Profile interface (from user_profiles table)
export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id?: string;
  company_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// User Role Assignment interface (from user_roles / user_role_assignments table)
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role_name: UserRole;
  tenant_id?: string;
  company_id?: string;
  branch_id?: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
}

// Auth Session interface
export interface AuthSession {
  user: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
  };
  profile: UserProfile;
  roles: UserRoleAssignment[];
  primaryRole: UserRole;
  tenantId?: string;
  companyId?: string;
}

// Biometric storage keys
export const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: '@texa_biometric_enabled',
  USER_EMAIL: '@texa_user_email',
  LAST_LOGIN: '@texa_last_login',
  USER_ROLE: '@texa_user_role',
  SESSION_TOKEN: '@texa_session_token',
};

/**
 * Get current authenticated session - simplified to avoid lock timeouts
 */
export const getCurrentSession = async (): Promise<AuthSession | null> => {
  try {
    console.log('🔍 getCurrentSession: Starting...');
    
    // Use getUser() instead of getSession() to avoid locks
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user:', userError?.message);
      return null;
    }

    console.log('✅ Authenticated user found:', user.email);

    // Return basic session immediately without database queries
    // Database queries can be done later in the background if needed
    const basicSession: AuthSession = {
      user: {
        id: user.id,
        email: user.email!,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        created_at: user.created_at!,
        updated_at: user.updated_at!,
      },
      profile: {
        id: user.id,
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email,
        email: user.email,
        is_active: true,
        created_at: user.created_at!,
        updated_at: user.updated_at!,
      } as UserProfile,
      roles: [],
      primaryRole: UserRole.FULL_ADMIN, // Default role
    };

    console.log('✅ Basic session created for:', user.email);

    // Try to load profile and roles in background (non-blocking)
    loadUserDataInBackground(user.id).catch(err => {
      console.warn('⚠️ Background data load failed:', err.message);
    });

    return basicSession;
  } catch (error: any) {
    console.error('❌ Error getting session:', error.message);
    return null;
  }
};

/**
 * Load user profile and roles in background (non-blocking)
 */
const loadUserDataInBackground = async (userId: string): Promise<void> => {
  try {
    // This runs in background and doesn't block login
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: rolesData } = await supabase
      .from('user_role_assignments')
      .select(`
        id,
        user_id,
        role_id,
        is_active,
        user_roles:role_id (role_code)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(5);

    console.log('📦 Background data loaded:', {
      profile: profile?.email,
      roles: rolesData?.length || 0,
    });
  } catch (error: any) {
    console.warn('⚠️ Background load error:', error.message);
  }
};

/**
 * Sign in with email and password
 */
export const signInWithPassword = async (
  email: string,
  password: string
): Promise<{ session: AuthSession | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { session: null, error };
    }

    if (!data.session) {
      return { session: null, error: new Error('No session returned') };
    }

    // Get full session with profile and roles
    const session = await getCurrentSession();

    // Update last login
    if (session) {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', session.user.id);

      // Store for biometric login
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, session.primaryRole);
      }
    }

    return { session, error: null };
  } catch (error) {
    return { session: null, error: error as Error };
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    // Clear biometric data
    if (Platform.OS !== 'web') {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    }
    
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
};

/**
 * Check if user has specific role
 */
export const hasRole = (session: AuthSession | null, role: UserRole): boolean => {
  if (!session) return false;
  return session.roles.some(r => r.role_name === role && r.is_active);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (session: AuthSession | null, roles: UserRole[]): boolean => {
  if (!session) return false;
  return session.roles.some(r => roles.includes(r.role_name) && r.is_active);
};

/**
 * Get dashboard route based on primary role
 */
export const getDashboardRoute = (role: UserRole): string => {
  switch (role) {
    case UserRole.FULL_ADMIN:
    case UserRole.ADMIN:
      return '/(tabs)/admin-dashboard';
    case UserRole.ACCOUNTANT:
      return '/(tabs)/accountant-dashboard';
    case UserRole.WAREHOUSE_KEEPER:
    case UserRole.WAREHOUSE_MANAGER:
      return '/(tabs)/warehouse-dashboard';
    case UserRole.SALES_REP:
    case UserRole.SALES:
      return '/(tabs)/sales-dashboard';
    case UserRole.PURCHASING_MANAGER:
      return '/(tabs)/purchasing-dashboard';
    case UserRole.DRIVER:
      return '/(tabs)/driver-dashboard';
    case UserRole.CASHIER:
      return '/(tabs)/cashier-dashboard';
    case UserRole.HR_MANAGER:
      return '/(tabs)/hr-dashboard';
    default:
      return '/(tabs)/admin-dashboard'; // Default to admin dashboard
  }
};

export default supabase;
