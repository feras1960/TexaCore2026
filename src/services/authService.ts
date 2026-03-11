/**
 * Authentication Service
 * Handles authentication and user metadata updates for Multi-Tenant system
 */

import { supabase, getCurrentTenantIdAsync, getCurrentCompanyId, isSuperAdmin } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Helper to check if error is AbortError (should be ignored)
const isAbortError = (error: any): boolean => {
  return error?.name === 'AbortError' ||
    error?.message?.includes('abort') ||
    error?.message?.includes('signal');
};

export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string | null;
  company_id: string | null;
  is_super_admin: boolean;
  user_metadata: Record<string, any>;
}

/**
 * Sign in and update user metadata with tenant_id and company_id
 */
export async function signInWithMetadata(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: Error | null }> {
  try {
    // 1. Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Don't log AbortError
      if (!isAbortError(authError)) {
        console.error('Sign in error:', authError);
      }
      return { user: null, error: authError || new Error('Authentication failed') };
    }

    // 2. Get user profile from database to get tenant_id and company_id
    let profile = null;
    try {
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id, company_id')
        .eq('id', authData.user.id)
        .maybeSingle();

      profile = data;

      if (profileError && !isAbortError(profileError)) {
        console.warn('Could not fetch user profile:', profileError.message);
      }
    } catch (profileErr) {
      // Silently ignore profile fetch errors
    }

    // 3. Check if user is super admin (ignore errors)
    let isSuper = false;
    try {
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin', {
        p_user_id: authData.user.id,
      });
      isSuper = superAdminCheck === true;
    } catch {
      // Ignore super admin check errors
    }

    // 4. Update user metadata with tenant_id, company_id, and is_super_admin
    const metadataUpdates: Record<string, any> = {
      tenant_id: profile?.tenant_id || null,
      company_id: profile?.company_id || null,
      is_super_admin: isSuper,
    };

    // Only update if we have new values
    const currentMetadata = authData.user.user_metadata || {};
    const needsUpdate =
      currentMetadata.tenant_id !== metadataUpdates.tenant_id ||
      currentMetadata.company_id !== metadataUpdates.company_id ||
      currentMetadata.is_super_admin !== metadataUpdates.is_super_admin;

    if (needsUpdate) {
      try {
        await supabase.auth.updateUser({
          data: metadataUpdates,
        });
      } catch {
        // Ignore metadata update errors - not critical
      }
    }

    // 5. Return formatted user
    const authUser: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || '',
      tenant_id: profile?.tenant_id || null,
      company_id: profile?.company_id || null,
      is_super_admin: isSuper,
      user_metadata: {
        ...authData.user.user_metadata,
        ...metadataUpdates,
      },
    };

    return { user: authUser, error: null };
  } catch (error: any) {
    // Don't log AbortError
    if (!isAbortError(error)) {
      console.error('Sign in error:', error);
    }
    return { user: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Check if current user is super admin (using RPC)
 */
export async function checkSuperAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_super_admin', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error checking super admin:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Super admin check error:', error);
    return false;
  }
}

/**
 * Get current user with metadata
 */
export async function getCurrentUserWithMetadata(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Don't log AbortError
      if (error && !isAbortError(error)) {
        console.warn('Get current user error:', error.message);
      }
      return null;
    }

    // Get tenant_id and company_id from metadata or profile
    let tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id || null;
    let companyId = user.user_metadata?.company_id || user.app_metadata?.company_id || null;

    // 🔄 Fallback: if company_id or tenant_id missing from metadata, fetch from user_profiles
    if (!tenantId || !companyId) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tenant_id, company_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          tenantId = tenantId || profile.tenant_id;
          companyId = companyId || profile.company_id;

          // Update metadata for future fast access
          if (profile.tenant_id || profile.company_id) {
            supabase.auth.updateUser({
              data: {
                tenant_id: tenantId,
                company_id: companyId,
              },
            }).catch(() => { /* ignore */ });
          }
        }
      } catch {
        // Ignore profile fetch errors
      }
    }

    // 🛡️ SECURITY: استدعاء الدالة الآمنة للتحقق من Super Admin
    let isSuper = false;
    try {
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin', { p_user_id: user.id });
      isSuper = superAdminCheck === true;
    } catch {
      // Ignore super admin check errors - default to false
    }

    return {
      id: user.id,
      email: user.email || '',
      tenant_id: tenantId,
      company_id: companyId,
      is_super_admin: isSuper,
      user_metadata: user.user_metadata || {},
    };
  } catch (error: any) {
    // Don't log AbortError
    if (!isAbortError(error)) {
      console.warn('Get current user error:', error?.message || error);
    }
    return null;
  }
}

/**
 * Update user metadata (tenant_id, company_id, etc.)
 */
export async function updateUserMetadata(updates: {
  tenant_id?: string | null;
  company_id?: string | null;
  is_super_admin?: boolean;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Register new subscriber (assigns pre-provisioned tenant)
 */
export async function registerNewSubscriber(
  email: string,
  password: string,
  userName: string
): Promise<{ user: AuthUser | null; error: Error | null }> {
  try {
    // 1. Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { user: null, error: authError || new Error('Registration failed') };
    }

    // 2. Call register_new_subscriber function to assign tenant
    const { data: tenantData, error: tenantError } = await supabase.rpc('register_new_subscriber', {
      p_user_email: email,
      p_user_name: userName,
    });

    if (tenantError) {
      console.error('Error registering subscriber:', tenantError);
      // Continue anyway - tenant assignment can be done later
    }

    // 3. Get updated profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, company_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    // 4. Update metadata
    if (profile) {
      await supabase.auth.updateUser({
        data: {
          tenant_id: profile.tenant_id,
          company_id: profile.company_id,
          is_super_admin: false,
        },
      });
    }

    const authUser: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || '',
      tenant_id: profile?.tenant_id || null,
      company_id: profile?.company_id || null,
      is_super_admin: false,
      user_metadata: {
        tenant_id: profile?.tenant_id || null,
        company_id: profile?.company_id || null,
        is_super_admin: false,
      },
    };

    return { user: authUser, error: null };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { user: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
