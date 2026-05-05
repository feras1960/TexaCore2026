/**
 * AuthGuard Component
 * Protects routes that require authentication
 * 🛡️ SECURITY: Also checks if user has a valid tenant
 * ⚡ PERIODIC CHECK: Validates session every 5 minutes
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// صفحة التوجيه عند الطرد
const KICK_REDIRECT_URL = '/login?error=account_removed';

export function AuthGuard() {
  const { isAuthenticated, loading, authUser, logout, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [tenantValid, setTenantValid] = useState<boolean | null>(null);
  const [checkingTenant, setCheckingTenant] = useState(true);
  const [needsWizard, setNeedsWizard] = useState(false);
  const [processingMagicLink, setProcessingMagicLink] = useState(false);
  const magicLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tenantCheckedRef = useRef(false);
  const periodicCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Force kick: تسجيل خروج وتوجيه للموقع الرئيسي ────────
  const forceKickUser = useCallback(async (reason: string) => {
    console.warn(`🛡️ SECURITY: Kicking user — ${reason}`);
    try { await logout(); } catch { /* ignore */ }
    // توجيه مباشر (لا ننتظر React)
    window.location.href = KICK_REDIRECT_URL;
  }, [logout]);

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

  // ─── Tenant Validation ────────────────────────────────
  useEffect(() => {
    const checkTenantValidity = async () => {
      // Super Admin doesn't need a tenant
      if (isSuperAdmin) {
        setTenantValid(true);
        setCheckingTenant(false);
        tenantCheckedRef.current = true;
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

      // If user has no tenant_id, they need to go through the wizard.
      // BUT: in local mode (localhost) the company is pre-provisioned,
      // so we skip the wizard and let them in.
      if (!authUser.tenant_id) {
        // Check if we're in local self-hosted mode
        const isLocalMode = (() => {
          try {
            const stored = localStorage.getItem('texacore_active_company');
            if (!stored) return false;
            const company = JSON.parse(stored);
            return company?.url?.includes('localhost') || company?.url?.includes('127.0.0.1');
          } catch { return false; }
        })();

        if (isLocalMode) {
          // Local mode: company already created — skip wizard, allow access
          console.log('[AuthGuard] Local mode: skipping wizard, company is pre-provisioned');
          setTenantValid(true);
          setCheckingTenant(false);
          tenantCheckedRef.current = true;
          return;
        }

        console.log('🧙 User has no tenant_id - needs registration wizard');
        setNeedsWizard(true);
        setTenantValid(false);
        setCheckingTenant(false);
        tenantCheckedRef.current = true;
        return;
      }

      // Skip re-check if tenant was already validated
      if (tenantCheckedRef.current && tenantValid === true) {
        setCheckingTenant(false);
        return;
      }

      // ⭐ تحقق من صلاحية الجلسة أولاً (يكشف المستخدمين المحذوفين)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          // المستخدم محذوف أو الجلسة منتهية
          forceKickUser('Session invalid or user deleted');
          return;
        }
      } catch {
        // تجاهل أخطاء الشبكة
      }

      // Check if tenant still exists in database
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, status')
          .eq('id', authUser.tenant_id)
          .maybeSingle();

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

      tenantCheckedRef.current = true;
      setCheckingTenant(false);
    };

    if (isAuthenticated && authUser) {
      checkTenantValidity();
    } else if (isAuthenticated && !authUser) {
      if (!tenantCheckedRef.current) {
        setCheckingTenant(true);
      }
    } else {
      setCheckingTenant(false);
    }
  }, [isAuthenticated, authUser?.tenant_id, isSuperAdmin, isWizardRoute]);

  // ─── ⚡ فحص دوري كل 5 دقائق ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated || isSuperAdmin) return;

    periodicCheckRef.current = setInterval(async () => {
      try {
        // 1. فحص صلاحية الجلسة (يكشف المحذوفين فوراً)
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          forceKickUser('Periodic check: user deleted or session expired');
          return;
        }

        // 2. فحص المستأجر
        if (authUser?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('status')
            .eq('id', authUser.tenant_id)
            .maybeSingle();

          if (!tenant || tenant.status !== 'active') {
            forceKickUser('Periodic check: tenant deleted or suspended');
            return;
          }
        }
      } catch {
        // تجاهل أخطاء الشبكة في الفحص الدوري
      }
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => {
      if (periodicCheckRef.current) clearInterval(periodicCheckRef.current);
    };
  }, [isAuthenticated, isSuperAdmin, authUser?.tenant_id, forceKickUser]);

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

  // 🛡️ SECURITY: Tenant deleted or suspended → طرد فوري للموقع الرئيسي
  // In local mode: skip this check — the local tenant is always valid
  const isLocalMode = (() => {
    try {
      const stored = localStorage.getItem('texacore_active_company');
      if (!stored) return false;
      const c = JSON.parse(stored);
      return c?.url?.includes('localhost') || c?.url?.includes('127.0.0.1');
    } catch { return false; }
  })();

  if (tenantValid === false && !isSuperAdmin && !needsWizard && !isLocalMode) {
    // استخدام window.location.href للتوجيه المباشر (لا ينتظر React)
    logout().then(() => {
      window.location.href = KICK_REDIRECT_URL;
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto" />
          <p className="text-gray-500">جاري تسجيل الخروج...</p>
        </div>
      </div>
    );
  }



  return <Outlet />;
}

export default AuthGuard;

