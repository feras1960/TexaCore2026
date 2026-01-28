/**
 * Authentication Context
 * Manages user session, roles, and authentication state
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import {
  supabase,
  getCurrentSession,
  signInWithPassword,
  signOut,
  AuthSession,
  UserRole,
  getDashboardRoute,
} from '@/lib/supabase';
import {
  authenticateWithBiometrics,
  isBiometricLoginEnabled,
  getBiometricEmail,
} from '@/lib/biometrics';

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithBiometric: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Load initial session with timeout
  useEffect(() => {
    loadSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log('🔔 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && supabaseSession) {
        console.log('✅ SIGNED_IN - Loading full session...');
        try {
          // Add timeout for session loading
          const sessionPromise = getCurrentSession();
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Session load timeout')), 8000)
          );
          
          const fullSession = await Promise.race([sessionPromise, timeoutPromise]);
          
          if (fullSession) {
            console.log('✅ Full session loaded:', fullSession.user.email);
            setSession(fullSession);
          } else {
            console.warn('⚠️ Session load timed out, using basic session');
            // Fallback: use basic session
            setSession({
              user: {
                id: supabaseSession.user.id,
                email: supabaseSession.user.email!,
                email_confirmed_at: supabaseSession.user.email_confirmed_at,
                phone: supabaseSession.user.phone,
                created_at: supabaseSession.user.created_at,
                updated_at: supabaseSession.user.updated_at,
              },
              profile: {
                id: supabaseSession.user.id,
                user_id: supabaseSession.user.id,
                full_name: supabaseSession.user.email,
                email: supabaseSession.user.email,
                is_active: true,
                created_at: supabaseSession.user.created_at,
                updated_at: supabaseSession.user.updated_at,
              } as any,
              roles: [],
              primaryRole: UserRole.FULL_ADMIN,
            });
          }
        } catch (error) {
          console.error('❌ Error loading session:', error);
          // Use fallback session
          setSession({
            user: {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email!,
              email_confirmed_at: supabaseSession.user.email_confirmed_at,
              phone: supabaseSession.user.phone,
              created_at: supabaseSession.user.created_at,
              updated_at: supabaseSession.user.updated_at,
            },
            profile: {
              id: supabaseSession.user.id,
              user_id: supabaseSession.user.id,
              full_name: supabaseSession.user.email,
              email: supabaseSession.user.email,
              is_active: true,
              created_at: supabaseSession.user.created_at,
              updated_at: supabaseSession.user.updated_at,
            } as any,
            roles: [],
            primaryRole: UserRole.FULL_ADMIN,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 SIGNED_OUT');
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED' && supabaseSession) {
        console.log('🔄 TOKEN_REFRESHED');
        // Don't reload full session on token refresh to avoid repeated queries
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Redirect to dashboard if authenticated and in auth screens
      const dashboardRoute = getDashboardRoute(session.primaryRole);
      router.replace(dashboardRoute as any);
    }
  }, [session, segments, loading]);

  const loadSession = async () => {
    try {
      console.log('🔍 Loading initial session...');
      
      // Add timeout
      const sessionPromise = getCurrentSession();
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Initial session load timeout')), 8000)
      );
      
      const currentSession = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (currentSession) {
        console.log('✅ Initial session loaded:', currentSession.user.email);
        setSession(currentSession);
      } else {
        console.log('⚠️ No session found or timeout');
        setSession(null);
      }
    } catch (error) {
      console.error('❌ Error loading session:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { session: newSession, error } = await signInWithPassword(email, password);
      
      if (error) {
        return { error };
      }

      if (newSession) {
        setSession(newSession);
        
        // Navigate to appropriate dashboard
        const dashboardRoute = getDashboardRoute(newSession.primaryRole);
        router.replace(dashboardRoute as any);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const handleSignInWithBiometric = async (): Promise<{ error: Error | null }> => {
    try {
      // Check if biometric is enabled
      const biometricEnabled = await isBiometricLoginEnabled();
      
      if (!biometricEnabled) {
        return { error: new Error('البصمة غير مفعلة') };
      }

      // Get stored email
      const email = await getBiometricEmail();
      
      if (!email) {
        return { error: new Error('لم يتم العثور على بيانات المستخدم') };
      }

      // Authenticate with biometric
      const biometricResult = await authenticateWithBiometrics('قم بالمصادقة للدخول');
      
      if (!biometricResult.success) {
        return { error: new Error(biometricResult.error || 'فشلت المصادقة') };
      }

      // Load existing session (user should already be logged in)
      const currentSession = await getCurrentSession();
      
      if (!currentSession) {
        return { error: new Error('لم يتم العثور على جلسة نشطة. يرجى تسجيل الدخول بكلمة المرور') };
      }

      setSession(currentSession);
      
      // Navigate to dashboard
      const dashboardRoute = getDashboardRoute(currentSession.primaryRole);
      router.replace(dashboardRoute as any);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSession(null);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const checkRole = (role: UserRole): boolean => {
    if (!session) return false;
    return session.roles.some(r => r.role_name === role && r.is_active);
  };

  const checkAnyRole = (roles: UserRole[]): boolean => {
    if (!session) return false;
    return session.roles.some(r => roles.includes(r.role_name) && r.is_active);
  };

  const value: AuthContextType = {
    session,
    loading,
    signIn: handleSignIn,
    signInWithBiometric: handleSignInWithBiometric,
    signOut: handleSignOut,
    hasRole: checkRole,
    hasAnyRole: checkAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
