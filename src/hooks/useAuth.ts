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

    // Get initial session - use both getSession and getUser for reliability
    const initializeAuth = async () => {
      try {
        // First, try to get session from storage
        const { session: storedSession, error: sessionError } = await getSession();
        
        // Only log session errors if there's actually a session issue (not just missing session)
        if (sessionError && sessionError.message !== 'Auth session missing!') {
          console.error('Session error:', sessionError);
        }

        // Also verify the user is still valid
        const { user: currentUser, error: userError } = await getCurrentUser();
        
        // Only log user errors if user is expected but missing (not just no user logged in)
        if (userError && storedSession && userError.message !== 'Auth session missing!') {
          console.error('User verification error:', userError);
        }

        // If we have a session but no user (or vice versa), try to refresh
        if (storedSession && !currentUser) {
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(storedSession);
          if (!refreshError && refreshData.session && mounted) {
            setState({
              session: refreshData.session,
              user: refreshData.session.user,
              authUser: null, // Will be populated later
              loading: false,
              error: null,
            });
            return;
          }
        }

        // Get extended user with metadata
        const authUser = currentUser || storedSession?.user 
          ? await getCurrentUserWithMetadata()
          : null;

        // Set state based on what we have
        // Don't set error if it's just "Auth session missing" (normal before login)
        const shouldShowError = (errorMsg: string | null | undefined) => {
          if (!errorMsg) return null;
          // Ignore "Auth session missing" errors - these are normal before login
          if (errorMsg.includes('Auth session missing') || errorMsg.includes('session missing')) {
            return null;
          }
          return errorMsg;
        };

        if (mounted) {
          setState({
            session: storedSession || null,
            user: currentUser || storedSession?.user || null,
            authUser: authUser,
            loading: false,
            error: shouldShowError(sessionError?.message) || shouldShowError(userError?.message) || null,
          });
        }
      } catch (err: any) {
        // Only log errors that are not "Auth session missing"
        const errorMessage = err?.message || '';
        if (!errorMessage.includes('Auth session missing') && !errorMessage.includes('session missing')) {
          console.error('Auth initialization error:', err);
        }
        
        if (mounted) {
          // Don't set error if it's just "Auth session missing"
          const shouldSetError = errorMessage && 
            !errorMessage.includes('Auth session missing') && 
            !errorMessage.includes('session missing');
            
          setState(prev => ({
            ...prev,
            loading: false,
            error: shouldSetError ? (err?.message || 'Failed to initialize authentication') : null,
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only log if there's actually a user (not just INITIAL_SESSION with no user)
        if (session?.user) {
          console.log('Auth state change:', event, session.user.email);
        }
        
        if (mounted) {
          // Get extended user with metadata
          const authUser = session?.user ? await getCurrentUserWithMetadata() : null;
          
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
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Clear any existing session first
      await supabase.auth.signOut();
      
      // Use new signInWithMetadata to get tenant_id and company_id
      const { user: authUser, error } = await signInWithMetadata(email, password);
      
      if (error || !authUser) {
        const errorMessage = error?.message || 'فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.';
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        return { error: errorMessage };
      }
      
      // Wait a bit for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get session and user after successful login to update state immediately
      const [sessionResult, userResult] = await Promise.all([
        getSession(),
        getCurrentUser(),
      ]);
      
      const newSession = sessionResult.session;
      const currentUser = userResult.user;
      
      if (sessionResult.error && userResult.error) {
        const errorMessage = sessionResult.error.message || 'فشل الحصول على الجلسة.';
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        return { error: errorMessage };
      }
      
      // Update state with both session, user, and authUser
      setState({
        session: newSession,
        user: currentUser || newSession?.user || null,
        authUser: authUser,
        loading: false,
        error: null,
      });
      
      return { data: { user: currentUser, authUser } };
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { error: errorMessage };
    }
  };

  const register = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await signUp(email, password);
    if (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      return { error };
    }
    return { data };
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
