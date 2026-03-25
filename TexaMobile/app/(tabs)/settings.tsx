/**
 * Settings Screen - شاشة الإعدادات
 * Swiss Minimalism + iOS Fluid Style
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedDesignSystem } from '@/constants/unified-theme';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = UnifiedDesignSystem.getTheme(isDark);
  const { session, signOut } = useAuth();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);
  const [languageSelectorVisible, setLanguageSelectorVisible] = useState(false);
  
  // Get current language name
  const getCurrentLanguageName = () => {
    return t(`languages.${i18n.language}`);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          entering={FadeInUp.duration(600)}
          style={styles.header}
        >
          <Text style={[styles.title, { color: theme.text.primary }]}>
            {t('settings.title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            {session?.profile?.full_name || session?.user?.email}
          </Text>
        </Animated.View>

        <View style={[styles.content, { paddingHorizontal: UnifiedDesignSystem.spacing.screenPadding }]}>
          {/* Profile Section */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              {t('settings.sections.account')}
            </Text>
            
            <SettingItem
              icon="person-outline"
              title={t('settings.account.profile')}
              subtitle={t('settings.account.profileSubtitle')}
              onPress={() => {}}
              isDark={isDark}
              delay={200}
            />
            
            <SettingItem
              icon="lock-closed-outline"
              title={t('settings.account.changePassword')}
              subtitle={t('settings.account.changePasswordSubtitle')}
              onPress={() => {}}
              isDark={isDark}
              delay={250}
            />
          </Animated.View>

          {/* Preferences Section */}
          <Animated.View 
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              {t('settings.sections.preferences')}
            </Text>
            
            <SettingToggle
              icon="notifications-outline"
              title={t('settings.preferences.notifications')}
              subtitle={t('settings.preferences.notificationsSubtitle')}
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              isDark={isDark}
              delay={400}
            />
            
            <SettingToggle
              icon="finger-print-outline"
              title={t('settings.preferences.biometric')}
              subtitle={t('settings.preferences.biometricSubtitle')}
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              isDark={isDark}
              delay={450}
            />
            
            <SettingToggle
              icon="moon-outline"
              title={t('settings.preferences.darkMode')}
              subtitle={t('settings.preferences.darkModeSubtitle')}
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              isDark={isDark}
              delay={500}
            />
          </Animated.View>

          {/* App Section */}
          <Animated.View 
            entering={FadeInDown.delay(550).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              {t('settings.sections.app')}
            </Text>
            
            <SettingItem
              icon="language-outline"
              title={t('settings.app.language')}
              subtitle={getCurrentLanguageName()}
              onPress={() => setLanguageSelectorVisible(true)}
              isDark={isDark}
              delay={600}
            />
            
            <SettingItem
              icon="help-circle-outline"
              title={t('settings.app.help')}
              subtitle={t('settings.app.helpSubtitle')}
              onPress={() => {}}
              isDark={isDark}
              delay={650}
            />
            
            <SettingItem
              icon="information-circle-outline"
              title={t('settings.app.about')}
              subtitle={t('settings.app.aboutSubtitle', { version: t('settings.app.version') })}
              onPress={() => {}}
              isDark={isDark}
              delay={700}
            />
          </Animated.View>

          {/* Logout */}
          <Animated.View 
            entering={FadeInDown.delay(750).duration(600)}
            style={styles.section}
          >
            <TouchableOpacity
              onPress={handleSignOut}
              style={[
                styles.logoutButton,
                {
                  backgroundColor: theme.error,
                  ...UnifiedDesignSystem.shadows.soft2,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color={theme.text.inverse} />
              <Text style={[styles.logoutText, { color: theme.text.inverse }]}>
                {t('settings.logout')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
      
      {/* Language Selector Modal */}
      <LanguageSelector
        visible={languageSelectorVisible}
        onClose={() => setLanguageSelectorVisible(false)}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDark: boolean;
  delay: number;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  isDark,
  delay,
}) => {
  const theme = UnifiedDesignSystem.getTheme(isDark);
  
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.settingItem, { backgroundColor: theme.card, borderColor: theme.border }]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name={icon as any} size={24} color={theme.primary} />
        </View>
        
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: theme.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.text.secondary }]}>
            {subtitle}
          </Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={theme.text.tertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface SettingToggleProps {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark: boolean;
  delay: number;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  isDark,
  delay,
}) => {
  const theme = UnifiedDesignSystem.getTheme(isDark);
  
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)}>
      <View style={[styles.settingItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name={icon as any} size={24} color={theme.primary} />
        </View>
        
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: theme.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.text.secondary }]}>
            {subtitle}
          </Text>
        </View>
        
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={theme.card}
          ios_backgroundColor={theme.border}
        />
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
    paddingTop: 60,
    paddingHorizontal: UnifiedDesignSystem.spacing.screenPadding,
    paddingBottom: UnifiedDesignSystem.spacing.xl,
  },
  
  title: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xxxl,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.bold,
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  subtitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.base,
  },
  
  content: {
    paddingBottom: UnifiedDesignSystem.spacing.xxxl,
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
  
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    borderWidth: 0.5,
    marginBottom: UnifiedDesignSystem.spacing.sm,
  },
  
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UnifiedDesignSystem.spacing.md,
  },
  
  settingContent: {
    flex: 1,
  },
  
  settingTitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.md,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.medium,
    marginBottom: 2,
  },
  
  settingSubtitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
  },
  
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    gap: UnifiedDesignSystem.spacing.sm,
  },
  
  logoutText: {
    fontSize: UnifiedDesignSystem.typography.fontSize.md,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
  },
});
