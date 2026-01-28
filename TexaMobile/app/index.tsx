/**
 * Root Index - الصفحة الرئيسية
 * توجيه تلقائي إلى Login أو Dashboard حسب دور المستخدم
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/supabase';
import { UnifiedDesignSystem } from '@/constants/unified-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function Index() {
  const { session, loading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = UnifiedDesignSystem.getTheme(isDark);

  // Loading state with branding
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContent}>
          <Text style={[styles.logo, { color: theme.primary }]}>TEXA</Text>
          <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            جارٍ التحميل...
          </Text>
        </View>
      </View>
    );
  }

  // Redirect based on auth state and user role
  if (session) {
    // Get dynamic dashboard route based on user's primary role
    const dashboardRoute = getDashboardRoute(session.primaryRole);
    console.log('🔄 Redirecting to:', dashboardRoute, 'Role:', session.primaryRole);
    return <Redirect href={dashboardRoute as any} />;
  }

  // Not authenticated → Login
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 2,
  },
  loader: {
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
});
