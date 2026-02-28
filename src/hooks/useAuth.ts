import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, getCurrentUser, getSession } from '@/lib/supabase';
import { signInWithMetadata, getCurrentUserWithMetadata, type AuthUser } from '@/services/authService';

interface AuthState {
  user: User | null;
  authUser: AuthUser | null; // Extended user with tenant_id, company_id, etc.
  session: Session | null;
  loading: boolean;
  error: string | null;
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
  });

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
              }
            } catch {
              // Ignore — cached values are sufficient
            }
          }, 100);

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
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
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
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        return { error: errorMessage };
      }

      // Login succeeded - create minimal authUser from auth data
      // 🛡️ SECURITY NOTE: is_super_admin يتم تحديثه من الـ RPC عند تسجيل الدخول عبر authService
      const authUser: AuthUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        tenant_id: authData.user.user_metadata?.tenant_id || null,
        company_id: authData.user.user_metadata?.company_id || null,
        is_super_admin: authData.user.user_metadata?.is_super_admin || false, // cached from secure RPC
        user_metadata: authData.user.user_metadata || {},
      };

      // Update state immediately with auth data - don't wait for profile
      setState({
        session: authData.session,
        user: authData.user,
        authUser: authUser,
        loading: false,
        error: null,
      });

      return { data: { user: authData.user, authUser, success: true } };
    } catch (err: any) {
      // Don't log AbortError
      if (!isConnectionError(err)) {
        console.error('Login error:', err);
      }
      // Provide user-friendly error message
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
      // Clear localStorage manually to ensure cleanup
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

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
    isAuthenticated: !!state.user,
    tenantId: state.authUser?.tenant_id || null,
    companyId: state.authUser?.company_id || null,
    isSuperAdmin: state.authUser?.is_super_admin || false,
    login,
    register,
    logout,
  };
}
