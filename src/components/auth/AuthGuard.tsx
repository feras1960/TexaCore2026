/**
 * AuthGuard Component
 * Protects routes that require authentication
 * 🛡️ SECURITY: Also checks if user has a valid tenant
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthGuard() {
  const { isAuthenticated, loading, authUser, logout, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [tenantValid, setTenantValid] = useState<boolean | null>(null);
  const [checkingTenant, setCheckingTenant] = useState(true);
  const [needsWizard, setNeedsWizard] = useState(false);

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
  if (loading || checkingTenant) {
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
