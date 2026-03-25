/**
 * Notifications Screen - شاشة الإشعارات
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UnifiedDesignSystem } from '@/constants/unified-theme';

interface Notification {
  id: string;
  icon: string;
  iconColor: string;
  titleKey: string;
  messageKey: string;
  time: string;
  isRead: boolean;
}

// بيانات تجريبية
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: 'checkmark-circle',
    iconColor: '#10b981',
    titleKey: 'notifications.types.success',
    messageKey: 'notifications.messages.accountSaved',
    time: 'notifications.time.minutesAgo',
    isRead: false,
  },
  {
    id: '2',
    icon: 'person-add',
    iconColor: '#2563eb',
    titleKey: 'notifications.types.newUser',
    messageKey: 'notifications.messages.userAdded',
    time: 'notifications.time.hoursAgo',
    isRead: false,
  },
  {
    id: '3',
    icon: 'warning',
    iconColor: '#f59e0b',
    titleKey: 'notifications.types.warning',
    messageKey: 'notifications.messages.lowStock',
    time: 'notifications.time.hoursAgo',
    isRead: true,
  },
  {
    id: '4',
    icon: 'document-text',
    iconColor: '#8b5cf6',
    titleKey: 'notifications.types.report',
    messageKey: 'notifications.messages.reportReady',
    time: 'notifications.time.yesterday',
    isRead: true,
  },
  {
    id: '5',
    icon: 'cash',
    iconColor: '#10b981',
    titleKey: 'notifications.types.transaction',
    messageKey: 'notifications.messages.transactionComplete',
    time: 'notifications.time.yesterday',
    isRead: true,
  },
];

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = UnifiedDesignSystem.getTheme(isDark);

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          entering={FadeInUp.duration(600)}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: theme.text.primary }]}>
                {t('notifications.title')}
              </Text>
              {unreadCount > 0 && (
                <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                  {t('notifications.newCount', { count: unreadCount })}
                </Text>
              )}
            </View>
            
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.markAllButton, { backgroundColor: theme.primaryLight }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.markAllText, { color: theme.primary }]}>
                  {t('notifications.markAllRead')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <View style={[styles.content, { paddingHorizontal: UnifiedDesignSystem.spacing.screenPadding }]}>
          {/* Notifications List */}
          {MOCK_NOTIFICATIONS.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isDark={isDark}
              delay={100 + index * 50}
            />
          ))}
          
          {/* Empty State */}
          {MOCK_NOTIFICATIONS.length === 0 && (
            <Animated.View 
              entering={FadeInDown.delay(100).duration(600)}
              style={styles.emptyState}
            >
              <Ionicons name="notifications-off-outline" size={64} color={theme.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                {t('notifications.noNotifications')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
                {t('notifications.noNotificationsSubtitle')}
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

interface NotificationItemProps {
  notification: Notification;
  isDark: boolean;
  delay: number;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  isDark,
  delay,
}) => {
  const { t } = useTranslation();
  const theme = UnifiedDesignSystem.getTheme(isDark);
  
  // Get time with proper translation
  const getTimeText = (timeKey: string) => {
    if (timeKey === 'notifications.time.yesterday') {
      return t('notifications.time.yesterday');
    } else if (timeKey === 'notifications.time.minutesAgo') {
      return t('notifications.time.minutesAgo', { count: 5 });
    } else if (timeKey === 'notifications.time.hoursAgo') {
      return t('notifications.time.hoursAgo', { count: notification.id === '2' ? 1 : 3 });
    }
    return t(timeKey);
  };
  
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)}>
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: notification.isRead ? theme.card : theme.primaryLight,
            borderColor: notification.isRead ? theme.border : theme.primary + '30',
          },
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: notification.iconColor + '20' }]}>
          <Ionicons name={notification.icon as any} size={24} color={notification.iconColor} />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, { color: theme.text.primary }]}>
              {t(notification.titleKey)}
            </Text>
            {!notification.isRead && (
              <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
            )}
          </View>
          
          <Text style={[styles.notificationMessage, { color: theme.text.secondary }]}>
            {t(notification.messageKey)}
          </Text>
          
          <Text style={[styles.notificationTime, { color: theme.text.tertiary }]}>
            {getTimeText(notification.time)}
          </Text>
        </View>
      </TouchableOpacity>
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
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  title: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xxxl,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.bold,
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  subtitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
  },
  
  markAllButton: {
    paddingHorizontal: UnifiedDesignSystem.spacing.md,
    paddingVertical: UnifiedDesignSystem.spacing.sm,
    borderRadius: UnifiedDesignSystem.borderRadius.sm,
  },
  
  markAllText: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xs,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
  },
  
  content: {
    paddingBottom: UnifiedDesignSystem.spacing.xxxl,
  },
  
  notificationItem: {
    flexDirection: 'row',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    borderWidth: 0.5,
    marginBottom: UnifiedDesignSystem.spacing.sm,
  },
  
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UnifiedDesignSystem.spacing.md,
  },
  
  notificationContent: {
    flex: 1,
  },
  
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  notificationTitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.md,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
    flex: 1,
  },
  
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: UnifiedDesignSystem.spacing.sm,
  },
  
  notificationMessage: {
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  notificationTime: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xs,
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: UnifiedDesignSystem.spacing.xxxxl,
  },
  
  emptyTitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xl,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.bold,
    marginTop: UnifiedDesignSystem.spacing.lg,
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  emptySubtitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.base,
    textAlign: 'center',
  },
});
