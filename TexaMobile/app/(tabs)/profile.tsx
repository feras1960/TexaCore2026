/**
 * Profile Screen - شاشة الملف الشخصي
 * Swiss Minimalism + iOS Fluid Style
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedDesignSystem } from '@/constants/unified-theme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = UnifiedDesignSystem.getTheme(isDark);
  const { session } = useAuth();

  const profile = session?.profile;
  const user = session?.user;
  const role = session?.primaryRole;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          entering={FadeInUp.duration(600)}
          style={styles.header}
        >
          {/* Avatar */}
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={48} color={theme.text.inverse} />
            )}
          </View>
          
          {/* Name */}
          <Text style={[styles.name, { color: theme.text.primary }]}>
            {profile?.full_name || user?.email?.split('@')[0]}
          </Text>
          
          {/* Email */}
          <Text style={[styles.email, { color: theme.text.secondary }]}>
            {user?.email}
          </Text>
          
          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.roleText, { color: theme.primary }]}>
              {role || 'User'}
            </Text>
          </View>
        </Animated.View>

        <View style={[styles.content, { paddingHorizontal: UnifiedDesignSystem.spacing.screenPadding }]}>
          {/* Stats */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.statsContainer}
          >
            <StatCard
              icon="calendar-outline"
              label="عضو منذ"
              value={new Date(user?.created_at || '').toLocaleDateString('ar')}
              isDark={isDark}
              delay={200}
            />
            
            <StatCard
              icon="time-outline"
              label="آخر دخول"
              value={profile?.last_login_at ? new Date(profile.last_login_at).toLocaleDateString('ar') : 'اليوم'}
              isDark={isDark}
              delay={250}
            />
          </Animated.View>

          {/* Info Section */}
          <Animated.View 
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              المعلومات الشخصية
            </Text>
            
            <InfoItem
              icon="mail-outline"
              label="البريد الإلكتروني"
              value={user?.email || '-'}
              isDark={isDark}
              delay={400}
            />
            
            <InfoItem
              icon="call-outline"
              label="رقم الهاتف"
              value={profile?.phone || 'غير محدد'}
              isDark={isDark}
              delay={450}
            />
            
            <InfoItem
              icon="language-outline"
              label="اللغة"
              value={profile?.language || 'العربية'}
              isDark={isDark}
              delay={500}
            />
            
            <InfoItem
              icon="business-outline"
              label="الشركة"
              value={profile?.company_id || 'غير محدد'}
              isDark={isDark}
              delay={550}
            />
          </Animated.View>

          {/* Actions */}
          <Animated.View 
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.section}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={24} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.text.primary }]}>
                تحديث المعلومات
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.text.primary }]}>
                الأمان والخصوصية
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  isDark: boolean;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, isDark, delay }) => {
  const theme = UnifiedDesignSystem.getTheme(isDark);
  
  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(600)}
      style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Ionicons name={icon as any} size={24} color={theme.primary} />
      <Text style={[styles.statValue, { color: theme.text.primary }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

interface InfoItemProps {
  icon: string;
  label: string;
  value: string;
  isDark: boolean;
  delay: number;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, isDark, delay }) => {
  const theme = UnifiedDesignSystem.getTheme(isDark);
  
  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(600)}
      style={[styles.infoItem, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.infoIcon, { backgroundColor: theme.surface }]}>
        <Ionicons name={icon as any} size={20} color={theme.primary} />
      </View>
      
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: theme.text.primary }]}>
          {value}
        </Text>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: UnifiedDesignSystem.spacing.xxl,
  },
  
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: UnifiedDesignSystem.spacing.lg,
    ...UnifiedDesignSystem.shadows.soft3,
  },
  
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  
  name: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xxl,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.bold,
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  email: {
    fontSize: UnifiedDesignSystem.typography.fontSize.base,
    marginBottom: UnifiedDesignSystem.spacing.md,
  },
  
  roleBadge: {
    paddingHorizontal: UnifiedDesignSystem.spacing.lg,
    paddingVertical: UnifiedDesignSystem.spacing.sm,
    borderRadius: UnifiedDesignSystem.borderRadius.round,
  },
  
  roleText: {
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  
  content: {
    paddingBottom: UnifiedDesignSystem.spacing.xxxl,
  },
  
  statsContainer: {
    flexDirection: 'row',
    gap: UnifiedDesignSystem.spacing.md,
    marginBottom: UnifiedDesignSystem.spacing.xxl,
  },
  
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    borderWidth: 0.5,
    gap: UnifiedDesignSystem.spacing.sm,
  },
  
  statValue: {
    fontSize: UnifiedDesignSystem.typography.fontSize.lg,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
  },
  
  statLabel: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xs,
  },
  
  section: {
    marginBottom: UnifiedDesignSystem.spacing.xxl,
  },
  
  sectionTitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: UnifiedDesignSystem.spacing.md,
  },
  
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    borderWidth: 0.5,
    marginBottom: UnifiedDesignSystem.spacing.sm,
  },
  
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UnifiedDesignSystem.spacing.md,
  },
  
  infoContent: {
    flex: 1,
  },
  
  infoLabel: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xs,
    marginBottom: 2,
  },
  
  infoValue: {
    fontSize: UnifiedDesignSystem.typography.fontSize.base,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.medium,
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    borderWidth: 0.5,
    marginBottom: UnifiedDesignSystem.spacing.sm,
    gap: UnifiedDesignSystem.spacing.md,
  },
  
  actionText: {
    fontSize: UnifiedDesignSystem.typography.fontSize.md,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.medium,
  },
});
