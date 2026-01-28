/**
 * Dynamic Tab Layout - نظام تنقل ديناميكي حسب الدور
 * يعرض التابات المناسبة لكل مستخدم حسب دوره
 * Icons: Lucide React Native
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View, StyleSheet, Platform, I18nManager } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoleNavigation } from '@/hooks/use-role-navigation';
import { UnifiedDesignSystem } from '@/constants/unified-theme';
import { isRTL } from '@/i18n';

// Custom Tab Icon Component with Background (No animations for web compatibility)
interface TabIconProps {
  focused: boolean;
  Icon: LucideIcon;
  isDark: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, Icon, isDark }) => {
  const theme = UnifiedDesignSystem.getTheme(isDark);

  return (
    <View
      style={{
        // مربع مثالي مع خلفية Navy للنشط
        backgroundColor: focused ? theme.secondary : 'transparent',
        borderRadius: 16,
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: focused ? 1 : 0.75,
        transform: [{ scale: focused ? 1 : 0.92 }],
      }}
    >
      <Icon
        size={26}
        color={focused ? theme.primary : theme.text.tertiary}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = UnifiedDesignSystem.getTheme(isDark);
  const { i18n } = useTranslation();
  
  const { tabs, isLoading } = useRoleNavigation();
  
  // Check if RTL
  const rtl = isRTL();

  // Loading state
  if (isLoading || tabs.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Get all possible dashboard screens
  const allDashboards = ['admin-dashboard', 'cashier-dashboard', 'driver-dashboard', 'warehouse-dashboard'];
  
  // Get screens that should be visible
  const visibleScreens = tabs.map(tab => tab.route.split('/').pop() || tab.id);
  
  // Get screens that should be hidden (not in visible list)
  const hiddenDashboards = allDashboards.filter(dashboard => !visibleScreens.includes(dashboard));
  
  // Reverse tabs order for RTL (Arabic)
  const displayTabs = rtl ? [...tabs].reverse() : tabs;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary, // #00D4AA (Teal/Cyan)
        tabBarInactiveTintColor: theme.text.tertiary, // Gray
        tabBarStyle: {
          backgroundColor: isDark ? theme.secondary : theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 0.5,
          height: 72, // زيادة الارتفاع
          paddingBottom: 12,
          paddingTop: 12,
          paddingHorizontal: 8, // مساحة جانبية
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
          // Force RTL/LTR based on language
          flexDirection: rtl ? 'row-reverse' : 'row',
        },
        tabBarShowLabel: false, // إخفاء النصوص (مثل Facebook)
        tabBarItemStyle: {
          paddingHorizontal: 2, // تباعد بين الأيقونات
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      {/* الشاشات المرئية فقط */}
      {displayTabs.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.route.split('/').pop() || tab.id}
          options={{
            title: rtl ? tab.nameAr : tab.nameEn,
            tabBarIcon: ({ focused }) => (
          <TabIcon
            focused={focused}
            Icon={tab.icon}
            isDark={isDark}
          />
            ),
            tabBarBadge: tab.badge && tab.badge > 0 ? tab.badge : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.error,
              color: theme.text.inverse,
              fontSize: 10,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
            },
          }}
        />
      ))}
      
      {/* إخفاء الـ dashboards الغير مستخدمة فقط */}
      {hiddenDashboards.map((dashboard) => (
        <Tabs.Screen
          key={`hidden-${dashboard}`}
          name={dashboard}
          options={{
            href: null, // إخفاء من Tab Bar
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
