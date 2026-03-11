/**
 * AuthGuard Component
 * Protects routes that require authentication
 * 🛡️ SECURITY: Also checks if user has a valid tenant
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthGuard() {
  const { isAuthenticated, loading, authUser, logout, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [tenantValid, setTenantValid] = useState<boolean | null>(null);
  const [checkingTenant, setCheckingTenant] = useState(true);
  const [needsWizard, setNeedsWizard] = useState(false);
  const [processingMagicLink, setProcessingMagicLink] = useState(false);
  const magicLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Detect & process magic link tokens ────────────
  useEffect(() => {
    const handleMagicLinkToken = async () => {
      // Approach 1: token_hash in query params (from our custom Edge Function links)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenHash = urlParams.get('token_hash');
      const tokenType = urlParams.get('type');

      if (tokenHash && tokenType) {
        console.log('[AuthGuard] Token hash detected in query params, verifying...');
        setProcessingMagicLink(true);
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tokenType as 'magiclink' | 'email',
          });
          if (error) {
            console.error('[AuthGuard] verifyOtp failed:', error.message);
          } else {
            console.log('[AuthGuard] Magic link verified successfully!', data.user?.email);
          }
        } catch (err) {
          console.error('[AuthGuard] verifyOtp exception:', err);
        }
        // Clean URL params
        window.history.replaceState(null, '', window.location.pathname);
        // Give time for auth state to update
        setTimeout(() => setProcessingMagicLink(false), 1000);
        return;
      }

      // Approach 2: access_token in URL hash (standard Supabase redirect)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        console.log('[AuthGuard] Access token detected in URL hash, waiting...');
        setProcessingMagicLink(true);
        magicLinkTimerRef.current = setTimeout(() => {
          console.log('[AuthGuard] Hash processing timeout');
          setProcessingMagicLink(false);
        }, 5000);
      }
    };

    handleMagicLinkToken();
    return () => {
      if (magicLinkTimerRef.current) clearTimeout(magicLinkTimerRef.current);
    };
  }, []);

  // When authentication succeeds, clear magic link processing
  useEffect(() => {
    if (isAuthenticated && processingMagicLink) {
      console.log('[AuthGuard] Login successful!');
      setProcessingMagicLink(false);
      if (magicLinkTimerRef.current) clearTimeout(magicLinkTimerRef.current);
      // Clean up URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isAuthenticated, processingMagicLink]);

  // Routes that don't require tenant validation (for new users)
  const wizardRoutes = ['/registration-wizard'];
  const isWizardRoute = wizardRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    const checkTenantValidity = async () => {
      // Super Admin doesn't need a tenant
      if (isSuperAdmin) {
        setTenantValid(true);
        setCheckingTenant(false);
        return;
      }

      // If on wizard route, allow access without tenant
      if (isWizardRoute) {
        setTenantValid(true);
        setCheckingTenant(false);
        return;
      }

      // If no authUser yet, wait
      if (!authUser) {
        setCheckingTenant(false);
        return;
      }

      // If user has no tenant_id, they need to go through the wizard
      if (!authUser.tenant_id) {
        console.log('🧙 User has no tenant_id - needs registration wizard');
        setNeedsWizard(true);
        setTenantValid(false);
        setCheckingTenant(false);
        return;
      }

      // Check if tenant still exists in database
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, status')
          .eq('id', authUser.tenant_id)
          .single();

        if (error || !data) {
          console.warn('🛡️ Tenant not found or error:', error?.message);
          setTenantValid(false);
        } else if (data.status !== 'active') {
          console.warn('🛡️ Tenant is not active:', data.status);
          setTenantValid(false);
        } else {
          setTenantValid(true);
        }
      } catch (err) {
        console.error('Error checking tenant:', err);
        setTenantValid(false);
      }

      setCheckingTenant(false);
    };

    if (isAuthenticated && authUser) {
      checkTenantValidity();
    } else if (isAuthenticated && !authUser) {
      // User authenticated but no authUser loaded yet - keep checking
      setCheckingTenant(true);
    } else {
      setCheckingTenant(false);
    }
  }, [isAuthenticated, authUser, isSuperAdmin, isWizardRoute]);

  // Loading state
  if (loading || checkingTenant || processingMagicLink) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 🧙 New user needs to complete registration wizard
  if (needsWizard && !isWizardRoute) {
    return <Navigate to="/registration-wizard" replace />;
  }

  // 🛡️ SECURITY: Tenant deleted or suspended (not a new user case)
  if (tenantValid === false && !isSuperAdmin && !needsWizard) {
    // Log out and redirect to login with error message
    logout();
    return <Navigate to="/login?error=tenant_deleted" replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
