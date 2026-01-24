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
    const abortController = new AbortController();

    // Get initial session - use both getSession and getUser for reliability
    const initializeAuth = async () => {
      // Skip if component unmounted
      if (!mounted || abortController.signal.aborted) return;
      
      try {
        // First, try to get session from storage
        const { session: storedSession, error: sessionError } = await getSession();
        
        // Skip if unmounted during async operation
        if (!mounted || abortController.signal.aborted) return;
        
        // Only log session errors if there's actually a session issue (not just missing session or connection error)
        if (sessionError && !isConnectionError(sessionError) && sessionError.message !== 'Auth session missing!') {
          console.error('Session error:', sessionError);
        }

        // Also verify the user is still valid
        const { user: currentUser, error: userError } = await getCurrentUser();
        
        // Skip if unmounted during async operation
        if (!mounted || abortController.signal.aborted) return;
        
        // Only log user errors if user is expected but missing (not just no user logged in or connection error)
        if (userError && !isConnectionError(userError) && storedSession && userError.message !== 'Auth session missing!') {
          console.error('User verification error:', userError);
        }

        // If we have a session but no user (or vice versa), try to refresh
        if (storedSession && !currentUser && mounted && !abortController.signal.aborted) {
          // Try to refresh the session
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(storedSession);
            if (!refreshError && refreshData.session && mounted && !abortController.signal.aborted) {
              setState({
                session: refreshData.session,
                user: refreshData.session.user,
                authUser: null, // Will be populated later
                loading: false,
                error: null,
              });
              return;
            }
          } catch {
            // Ignore refresh errors - just continue
          }
        }

        // Skip if unmounted during async operation
        if (!mounted || abortController.signal.aborted) return;

        // Get extended user with metadata
        let authUser = null;
        if (currentUser || storedSession?.user) {
          try {
            authUser = await getCurrentUserWithMetadata();
          } catch (metadataErr) {
            // Ignore metadata fetch errors silently
          }
        }

        if (mounted && !abortController.signal.aborted) {
          setState({
            session: storedSession || null,
            user: currentUser || storedSession?.user || null,
            authUser: authUser,
            loading: false,
            // Don't show connection/timeout errors during initial load - user can still try to login
            error: shouldShowErrorToUser(sessionError?.message) || shouldShowErrorToUser(userError?.message) || null,
          });
        }
      } catch (err: any) {
        // Silently ignore AbortError and connection errors
        if (isConnectionError(err)) {
          if (mounted && !abortController.signal.aborted) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: null,
            }));
          }
          return;
        }
        
        // Log errors except "Auth session missing"
        const errorMessage = err?.message || '';
        if (!errorMessage.includes('Auth session missing')) {
          console.error('Auth initialization error:', err);
        }
        
        if (mounted && !abortController.signal.aborted) {
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
        if (mounted && !abortController.signal.aborted) {
          // Create simple authUser from session data (no extra API calls)
          const authUser: AuthUser | null = session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
            tenant_id: session.user.user_metadata?.tenant_id || null,
            company_id: session.user.user_metadata?.company_id || null,
            is_super_admin: session.user.user_metadata?.is_super_admin || false,
            user_metadata: session.user.user_metadata || {},
          } : null;
          
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            authUser: authUser,
            loading: false,
            error: null, // Clear error on auth state change
          }));
        }
      }
    );

    return () => {
      mounted = false;
      abortController.abort();
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
