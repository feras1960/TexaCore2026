import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, getCurrentUser, getSession } from '@/lib/supabase';
import { signInWithMetadata, getCurrentUserWithMetadata, type AuthUser } from '@/services/authService';
import { dataEngine } from '@/engine/DataEngine';

interface AuthState {
  user: User | null;
  authUser: AuthUser | null; // Extended user with tenant_id, company_id, etc.
  session: Session | null;
  loading: boolean;
  error: string | null;
  // MFA state
  mfaRequired: boolean;
  mfaFactorId: string | null;
}

// Helper function to check if error is a timeout/abort/connection error
const isConnectionError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || error?.name?.toLowerCase() || '';
  return (
    error?.name === 'AbortError' ||
    errorMessage.includes('abort') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('fetch failed')
  );
};

// Helper to check if error should be shown to user
const shouldShowErrorToUser = (errorMsg: string | null | undefined): string | null => {
  if (!errorMsg) return null;
  const msg = errorMsg.toLowerCase();
  // Ignore these errors - they are normal or not helpful to show
  if (
    msg.includes('auth session missing') ||
    msg.includes('session missing') ||
    msg.includes('abort') ||
    msg.includes('timeout') ||
    msg.includes('signal')
  ) {
    return null;
  }
  return errorMsg;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    authUser: null,
    session: null,
    loading: true,
    error: null,
    mfaRequired: false,
    mfaFactorId: null,
  });

  // 🔐 MFA: Prevent onAuthStateChange from overriding MFA state during login
  const loginInProgressRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session - FAST path: use getSession (reads localStorage)
    // then verify with getUser in background
    const initializeAuth = async () => {
      if (!mounted) return;

      try {
        // 🚀 FAST: getSession() reads from localStorage (instant)
        const { session: storedSession, error: sessionError } = await getSession();

        if (!mounted) return;

        // If we have a stored session, use it IMMEDIATELY to unblock the UI
        if (storedSession?.user) {
          // Build authUser from session data (no network call needed)
          const sessionUser = storedSession.user;
          const authUser: AuthUser = {
            id: sessionUser.id,
            email: sessionUser.email || '',
            tenant_id: sessionUser.user_metadata?.tenant_id || sessionUser.app_metadata?.tenant_id || null,
            company_id: sessionUser.user_metadata?.company_id || sessionUser.app_metadata?.company_id || null,
            is_super_admin: sessionUser.user_metadata?.is_super_admin || false,
            user_metadata: sessionUser.user_metadata || {},
          };

          // Set state IMMEDIATELY — unblocks useCompany and all downstream hooks
          setState({
            session: storedSession,
            user: sessionUser,
            authUser,
            loading: false,
            error: null,
            mfaRequired: false,
            mfaFactorId: null,
          });

          // 🔄 BACKGROUND: Verify user and enrich metadata (non-blocking)
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const updatedAuthUser = await getCurrentUserWithMetadata();
              if (updatedAuthUser && mounted) {
                setState(prev => ({
                  ...prev,
                  authUser: updatedAuthUser,
                }));
              } else if (!updatedAuthUser && mounted) {
                // ⚠️ getCurrentUserWithMetadata returned null.
                // This can happen for NEW OAuth users (no user_profiles yet).
                // Only sign out if the session is truly invalid (user deleted).
                try {
                  const { data: { user: verifiedUser } } = await supabase.auth.getUser();
                  if (!verifiedUser) {
                    // User truly deleted from server
                    console.warn('🛡️ User not found on server — clearing stale session');
                    try { await supabase.auth.signOut(); } catch { /* ignore */ }
                    setState({
                      user: null,
                      authUser: null,
                      session: null,
                      loading: false,
                      error: null,
                      mfaRequired: false,
                      mfaFactorId: null,
                    });
                  } else {
                    // User exists but no profile yet (new OAuth user) — keep session
                    console.log('ℹ️ User verified but no profile yet (new registration)');
                  }
                } catch {
                  // Network error — keep current session
                }
              }
            } catch {
              // Ignore network errors — cached values are sufficient
            }
          }, 300);

          return;
        }

        // No stored session — try getCurrentUser as fallback
        const { user: currentUser, error: userError } = await getCurrentUser();
        if (!mounted) return;

        if (sessionError && !isConnectionError(sessionError) && sessionError.message !== 'Auth session missing!') {
          console.error('Session error:', sessionError);
        }
        if (userError && !isConnectionError(userError) && userError.message !== 'Auth session missing!') {
          console.error('User verification error:', userError);
        }

        // Try session refresh if needed
        if (storedSession && !currentUser && mounted) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(storedSession);
            if (!refreshError && refreshData.session && mounted) {
              setState({
                session: refreshData.session,
                user: refreshData.session.user,
                authUser: null,
                loading: false,
                error: null,
                mfaRequired: false,
                mfaFactorId: null,
              });
              return;
            }
          } catch {
            // Ignore refresh errors
          }
        }

        if (!mounted) return;

        // No session at all — set as unauthenticated
        if (mounted) {
          setState({
            session: storedSession || null,
            user: currentUser || storedSession?.user || null,
            authUser: null,
            loading: false,
            error: shouldShowErrorToUser(sessionError?.message) || shouldShowErrorToUser(userError?.message) || null,
            mfaRequired: false,
            mfaFactorId: null,
          });
        }
      } catch (err: any) {
        if (isConnectionError(err)) {
          if (mounted) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: null,
            }));
          }
          return;
        }

        const errorMessage = err?.message || '';
        if (!errorMessage.includes('Auth session missing')) {
          console.error('Auth initialization error:', err);
        }

        if (mounted) {
          const displayError = shouldShowErrorToUser(err?.message);
          setState(prev => ({
            ...prev,
            loading: false,
            error: displayError,
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // 🔐 MFA: Skip state update during login to prevent race condition
        // The login() function will handle state updates itself
        if (loginInProgressRef.current && event === 'SIGNED_IN') {
          return;
        }

        // إنشاء authUser فوري من بيانات الجلسة
        let authUser: AuthUser | null = null;

        if (session?.user) {
          authUser = {
            id: session.user.id,
            email: session.user.email || '',
            tenant_id: session.user.user_metadata?.tenant_id || null,
            company_id: session.user.user_metadata?.company_id || null,
            is_super_admin: session.user.user_metadata?.is_super_admin || false,
            user_metadata: session.user.user_metadata || {},
          };
        }

        // تحديث الحالة فوراً
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          authUser: authUser,
          loading: false,
          error: null,
        }));

        // 🛡️ SECURITY FIX: للأحداث المهمة، تحقق من Super Admin بشكل غير متزامن
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // استخدم setTimeout لتجنب blocking و AbortError
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const updatedAuthUser = await getCurrentUserWithMetadata();
              if (updatedAuthUser && mounted) {
                setState(prev => ({
                  ...prev,
                  authUser: updatedAuthUser,
                }));
              }
            } catch {
              // تجاهل الأخطاء - القيم المخزنة مؤقتاً كافية
            }
          }, 100);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null, mfaRequired: false, mfaFactorId: null }));
    // 🔐 Block onAuthStateChange from interfering during MFA check
    loginInProgressRef.current = true;
    try {
      // 🧹 Clear all cached data BEFORE login to ensure fresh data from server
      // This prevents stale IndexedDB cache from showing deleted/outdated records
      try {
        await dataEngine.clearAll();
        console.log('🧹 [Login] Cache cleared — will load fresh data');
      } catch (e) {
        console.warn('[Login] Cache clear failed (non-critical):', e);
      }

      // 🔐 Clear Warehouse Offline DB (L3) — prevents stale stock count data
      // from previous user's session on shared devices
      try {
        const { offlineDB } = await import('@/features/warehouse/services/warehouseOfflineDB');
        await offlineDB.delete();
        console.log('🧹 [Login] Warehouse offline DB cleared');
      } catch {
        // Ignore — Dexie might not be loaded yet
      }

      // Direct sign in without clearing session first (to avoid AbortError)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        // Provide user-friendly error messages
        let errorMessage = 'فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.';
        if (isConnectionError(authError)) {
          errorMessage = 'فشل الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
        } else if (authError?.message) {
          if (authError.message.includes('Invalid login credentials')) {
            errorMessage = 'بيانات الدخول غير صحيحة. تحقق من البريد الإلكتروني وكلمة المرور.';
          } else if (authError.message.includes('Email not confirmed')) {
            errorMessage = 'لم يتم تأكيد البريد الإلكتروني. تحقق من بريدك الوارد.';
          } else {
            errorMessage = authError.message;
          }
        }
        loginInProgressRef.current = false;
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        return { error: errorMessage };
      }

      // 🔐 MFA CHECK: After successful password auth, check if user has 2FA enabled
      try {
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        if (mfaData?.totp && mfaData.totp.length > 0) {
          const verifiedFactor = mfaData.totp.find(f => f.status === 'verified');
          if (verifiedFactor) {
            // 🔐 Check if this device is trusted (skip MFA)
            const trustedToken = localStorage.getItem('texacore_trusted_device');
            if (trustedToken) {
              const { data: isTrusted } = await supabase.rpc('check_trusted_device', { p_token: trustedToken });
              if (isTrusted) {
                // Device is trusted — skip MFA
                // Login succeeded (no MFA required) - create minimal authUser from auth data
                const authUser: AuthUser = {
                  id: authData.user.id,
                  email: authData.user.email || '',
                  tenant_id: authData.user.user_metadata?.tenant_id || null,
                  company_id: authData.user.user_metadata?.company_id || null,
                  is_super_admin: authData.user.user_metadata?.is_super_admin || false,
                  user_metadata: authData.user.user_metadata || {},
                };

                // Update state immediately with auth data - don't wait for profile
                setState({
                  session: authData.session,
                  user: authData.user,
                  authUser: authUser,
                  loading: false,
                  error: null,
                  mfaRequired: false,
                  mfaFactorId: null,
                });

                loginInProgressRef.current = false;
                return { data: { user: authData.user, authUser, success: true } };
              } else {
                // Token expired/invalid — clean up
                localStorage.removeItem('texacore_trusted_device');
              }
            }

            // User has 2FA enabled — require verification before completing login
            setState(prev => ({
              ...prev,
              loading: false,
              error: null,
              mfaRequired: true,
              mfaFactorId: verifiedFactor.id,
              // Keep session/user partial — they authenticated with password but not MFA yet
              session: authData.session,
              user: authData.user,
            }));
            loginInProgressRef.current = false; // Set to false here as login process is paused for MFA
            return { mfaRequired: true, factorId: verifiedFactor.id };
          }
        }
      } catch (mfaErr) {
        // If MFA check fails, proceed without MFA (don't block login)
        console.warn('MFA check failed, proceeding without MFA:', mfaErr);
      }

      // Login succeeded (no MFA required) - create minimal authUser from auth data
      const authUser: AuthUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        tenant_id: authData.user.user_metadata?.tenant_id || null,
        company_id: authData.user.user_metadata?.company_id || null,
        is_super_admin: authData.user.user_metadata?.is_super_admin || false,
        user_metadata: authData.user.user_metadata || {},
      };

      // Update state immediately with auth data - don't wait for profile
      setState({
        session: authData.session,
        user: authData.user,
        authUser: authUser,
        loading: false,
        error: null,
        mfaRequired: false,
        mfaFactorId: null,
      });

      loginInProgressRef.current = false;

      // 🔐 Initialize encryption + ⚡ Send auth to Service Worker (non-blocking)
      setTimeout(async () => {
        try {
          const { initEncryption } = await import('@/lib/queryPersistence');
          await initEncryption(authData.user.id, authUser.tenant_id || '');
        } catch { /* non-critical */ }
        try {
          const { sendAuthToSW } = await import('@/lib/serviceWorker/register');
          if (authData.session?.access_token) {
            await sendAuthToSW(
              authData.session.access_token,
              import.meta.env.VITE_SUPABASE_URL || '',
              import.meta.env.VITE_SUPABASE_ANON_KEY || ''
            );
          }
        } catch { /* non-critical */ }
      }, 500);

      return { data: { user: authData.user, authUser, success: true } };
    } catch (err: any) {
      loginInProgressRef.current = false;
      // Don't log AbortError
      if (!isConnectionError(err)) {
        console.error('Login error:', err);
      }
      let errorMessage = 'حدث خطأ غير متوقع أثناء تسجيل الدخول.';
      if (isConnectionError(err)) {
        errorMessage = 'فشل الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { error: errorMessage };
    }
  };

  // 🔐 MFA: Verify TOTP code after successful password login
  const verifyMfa = async (code: string, trustDevice?: boolean): Promise<{ success?: boolean; error?: string }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const factorId = state.mfaFactorId;
      if (!factorId) {
        return { error: 'لا يوجد عامل مصادقة / No MFA factor found' };
      }

      // Step 1: Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      // Step 2: Verify the code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      // Step 3: Save trusted device if requested
      if (trustDevice) {
        try {
          const token = crypto.randomUUID() + '-' + crypto.randomUUID();
          const ua = navigator.userAgent;
          const browserName = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
          const osName = ua.includes('Mac') ? 'macOS' : ua.includes('Windows') ? 'Windows' : ua.includes('Linux') ? 'Linux' : 'OS';

          // Get IP address
          let ipAddress = '';
          try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ipAddress = ipData.ip || '';
          } catch { }

          await supabase.from('trusted_devices').insert({
            user_id: state.user?.id,
            device_token: token,
            device_name: `${browserName} — ${osName}`,
            ip_address: ipAddress,
            trusted_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          localStorage.setItem('texacore_trusted_device', token);
        } catch {
          // Non-blocking — trust is optional
        }
      }

      // MFA verified — complete login
      const user = state.user;
      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email || '',
          tenant_id: user.user_metadata?.tenant_id || null,
          company_id: user.user_metadata?.company_id || null,
          is_super_admin: user.user_metadata?.is_super_admin || false,
          user_metadata: user.user_metadata || {},
        };

        setState(prev => ({
          ...prev,
          authUser,
          loading: false,
          mfaRequired: false,
          mfaFactorId: null,
        }));
      }

      return { success: true };
    } catch (err: any) {
      const errorMessage = err?.message?.includes('Invalid')
        ? 'رمز التحقق غير صحيح. حاول مرة أخرى.'
        : (err?.message || 'فشل التحقق');
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  };

  // Cancel MFA and sign out
  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      authUser: null,
      session: null,
      loading: false,
      error: null,
      mfaRequired: false,
      mfaFactorId: null,
    });
  };

  const register = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await signUp(email, password);

      if (error) {
        // Provide user-friendly error messages in Arabic
        let errorMessage = 'فشل التسجيل. حاول مرة أخرى.';
        const errorMsg = error.message?.toLowerCase() || '';

        if (errorMsg.includes('user already registered') || errorMsg.includes('already exists') || errorMsg.includes('already been registered')) {
          errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً. جرّب تسجيل الدخول أو استخدم بريد آخر.';
        } else if (errorMsg.includes('invalid email') || errorMsg.includes('email') && errorMsg.includes('invalid')) {
          errorMessage = 'صيغة البريد الإلكتروني غير صحيحة.';
        } else if (errorMsg.includes('password') && (errorMsg.includes('weak') || errorMsg.includes('short') || errorMsg.includes('characters'))) {
          errorMessage = 'كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل.';
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          errorMessage = 'طلبات كثيرة جداً. انتظر قليلاً ثم حاول مجدداً.';
        } else if (errorMsg.includes('signup') && errorMsg.includes('disabled')) {
          errorMessage = 'التسجيل معطل حالياً. تواصل مع الدعم الفني.';
        } else if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('fetch')) {
          errorMessage = 'فشل الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        console.error('Registration error:', error);
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        return { error: { ...error, message: errorMessage } };
      }

      // Check if email confirmation is required
      if (data?.user && !data.session) {
        // User created but needs email confirmation
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { data, needsEmailConfirmation: true };
      }

      setState(prev => ({ ...prev, loading: false, error: null }));
      return { data };
    } catch (err: any) {
      const errorMessage = 'حدث خطأ غير متوقع أثناء التسجيل.';
      console.error('Registration exception:', err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { error: { message: errorMessage } };
    }
  };

  const logout = async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      // 🧹 Clear ALL TexaCore localStorage keys on logout
      // Prevents data leakage: drafts, caches, preferences on shared devices
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        // Prefixes of ALL TexaCore app data stored in localStorage
        const APP_PREFIXES = [
          'sb-',                         // Supabase auth tokens
          'supabase',                    // Supabase misc
          'texacore_',                   // Trusted device, online rates, etc.
          'receipt_sessions',            // Receipt drafts (receiptLocalStore)
          'receipt_pending_queue',       // Receipt pending queue
          'delivery_draft_',             // Transfer delivery drafts
          'sales_delivery_draft_',       // Sales delivery drafts
          'ai_analysis_cache_',          // AI analytics cache
          'table_prefs_',               // Table column preferences
          'materials_',                  // Materials view mode, filters
          'wh_',                         // Warehouse location filters
          'dashboard_',                  // Dashboard currency preference
        ];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && APP_PREFIXES.some(prefix => key.startsWith(prefix) || key.includes(prefix))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 [Logout] Cleared ${keysToRemove.length} localStorage keys`);
      }

      // 🔐 مسح قاعدة البيانات المحلية (IndexedDB) — حماية الجهاز المشترك
      try {
        const { offlineDB } = await import('@/features/warehouse/services/warehouseOfflineDB');
        await offlineDB.delete();
      } catch {
        // تجاهل — قد لا يكون Dexie محملاً
      }

      // 🗑️ مسح كاش DataEngine (React Query + IndexedDB persistence)
      try {
        const { dataEngine } = await import('@/engine/DataEngine');
        await dataEngine.clearAll();
      } catch {
        // تجاهل — قد لا يكون DataEngine محملاً
      }

      // 🔐 Clear encryption key from memory
      try {
        const { dbEncryption } = await import('@/lib/crypto/indexedDBEncryption');
        dbEncryption.clearKey();
      } catch { /* ignore */ }

      // ⚡ Clear Service Worker auth
      try {
        const { clearSWAuth } = await import('@/lib/serviceWorker/register');
        await clearSWAuth();
      } catch { /* ignore */ }

      // 📡 Notify all other tabs to logout too
      try {
        const { getTabSync } = await import('@/lib/sync/tabSyncChannel');
        getTabSync().broadcast({ type: 'LOGOUT' });
      } catch { /* ignore */ }

      const { error } = await signOut();
      if (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }));
      } else {
        setState({
          user: null,
          authUser: null,
          session: null,
          loading: false,
          error: null,
          mfaRequired: false,
          mfaFactorId: null,
        });
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err?.message || 'Failed to logout',
        loading: false,
      }));
    }
  };

  return {
    user: state.user,
    authUser: state.authUser, // Extended user with tenant_id, company_id, is_super_admin
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user && !state.mfaRequired,
    mfaRequired: state.mfaRequired,
    mfaFactorId: state.mfaFactorId,
    tenantId: state.authUser?.tenant_id || null,
    companyId: state.authUser?.company_id || null,
    isSuperAdmin: state.authUser?.is_super_admin || false,
    login,
    verifyMfa,
    cancelMfa,
    register,
    logout,
  };
}
