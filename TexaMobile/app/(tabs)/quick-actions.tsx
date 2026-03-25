/**
 * Quick Actions Screen - الإجراءات السريعة
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedDesignSystem } from '@/constants/unified-theme';
import { UserRole } from '@/lib/supabase';

export default function QuickActionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = UnifiedDesignSystem.getTheme(isDark);
  const { session } = useAuth();

  const role = session?.primaryRole;

  // الحصول على الإجراءات حسب الدور
  const actions = getActionsForRole(role);

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
            إجراءات سريعة
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            قم بتنفيذ المهام بسرعة
          </Text>
        </Animated.View>

        <View style={[styles.content, { paddingHorizontal: UnifiedDesignSystem.spacing.screenPadding }]}>
          {/* Actions Grid */}
          <View style={styles.grid}>
            {actions.map((action, index) => (
              <ActionCard
                key={action.id}
                action={action}
                isDark={isDark}
                delay={100 + index * 50}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// TYPES & DATA
// ═══════════════════════════════════════════

interface QuickAction {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

// الإجراءات حسب الدور
const getActionsForRole = (role?: UserRole | null): QuickAction[] => {
  switch (role) {
    case UserRole.ADMIN:
    case UserRole.FULL_ADMIN:
      return [
        {
          id: 'add_user',
          icon: 'person-add-outline',
          title: 'إضافة مستخدم',
          subtitle: 'إنشاء حساب مستخدم جديد',
          color: '#2d5a4c',
          onPress: () => console.log('Add user'),
        },
        {
          id: 'reports',
          icon: 'bar-chart-outline',
          title: 'التقارير',
          subtitle: 'عرض التقارير التفصيلية',
          color: '#2563eb',
          onPress: () => console.log('Reports'),
        },
        {
          id: 'backup',
          icon: 'cloud-download-outline',
          title: 'نسخ احتياطي',
          subtitle: 'إنشاء نسخة احتياطية',
          color: '#8b5cf6',
          onPress: () => console.log('Backup'),
        },
        {
          id: 'settings',
          icon: 'settings-outline',
          title: 'الإعدادات',
          subtitle: 'إعدادات النظام',
          color: '#6c757d',
          onPress: () => console.log('Settings'),
        },
      ];
      
    case UserRole.CASHIER:
      return [
        {
          id: 'new_deposit',
          icon: 'arrow-down-circle-outline',
          title: 'إيداع جديد',
          subtitle: 'تسجيل عملية إيداع',
          color: '#10b981',
          onPress: () => console.log('New deposit'),
        },
        {
          id: 'new_withdrawal',
          icon: 'arrow-up-circle-outline',
          title: 'سحب جديد',
          subtitle: 'تسجيل عملية سحب',
          color: '#dc2626',
          onPress: () => console.log('New withdrawal'),
        },
        {
          id: 'transfer',
          icon: 'swap-horizontal-outline',
          title: 'تحويل',
          subtitle: 'تحويل بين الحسابات',
          color: '#2563eb',
          onPress: () => console.log('Transfer'),
        },
        {
          id: 'transactions',
          icon: 'list-outline',
          title: 'سجل المعاملات',
          subtitle: 'عرض جميع المعاملات',
          color: '#6c757d',
          onPress: () => console.log('Transactions'),
        },
      ];
      
    case UserRole.DRIVER:
      return [
        {
          id: 'start_route',
          icon: 'navigate-outline',
          title: 'بدء الرحلة',
          subtitle: 'بدء رحلة التوصيل',
          color: '#f59e0b',
          onPress: () => console.log('Start route'),
        },
        {
          id: 'scan_delivery',
          icon: 'qr-code-outline',
          title: 'مسح الطلب',
          subtitle: 'مسح كود الطلب',
          color: '#2563eb',
          onPress: () => console.log('Scan delivery'),
        },
        {
          id: 'report_issue',
          icon: 'alert-circle-outline',
          title: 'الإبلاغ عن مشكلة',
          subtitle: 'تقرير مشكلة في التوصيل',
          color: '#dc2626',
          onPress: () => console.log('Report issue'),
        },
        {
          id: 'my_deliveries',
          icon: 'list-outline',
          title: 'طلباتي',
          subtitle: 'عرض جميع الطلبات',
          color: '#6c757d',
          onPress: () => console.log('My deliveries'),
        },
      ];
      
    case UserRole.WAREHOUSE_KEEPER:
    case UserRole.WAREHOUSE_MANAGER:
      return [
        {
          id: 'scan_product',
          icon: 'barcode-outline',
          title: 'مسح المنتج',
          subtitle: 'مسح الباركود',
          color: '#8b5cf6',
          onPress: () => console.log('Scan product'),
        },
        {
          id: 'receive_shipment',
          icon: 'cube-outline',
          title: 'استلام شحنة',
          subtitle: 'تسجيل شحنة واردة',
          color: '#10b981',
          onPress: () => console.log('Receive shipment'),
        },
        {
          id: 'stock_count',
          icon: 'calculator-outline',
          title: 'جرد المخزون',
          subtitle: 'عد المخزون الفعلي',
          color: '#2563eb',
          onPress: () => console.log('Stock count'),
        },
        {
          id: 'inventory',
          icon: 'list-outline',
          title: 'المخزون',
          subtitle: 'عرض حالة المخزون',
          color: '#6c757d',
          onPress: () => console.log('Inventory'),
        },
      ];
      
    default:
      return [
        {
          id: 'dashboard',
          icon: 'grid-outline',
          title: 'لوحة التحكم',
          subtitle: 'الانتقال للوحة التحكم',
          color: '#2d5a4c',
          onPress: () => console.log('Dashboard'),
        },
        {
          id: 'profile',
          icon: 'person-outline',
          title: 'الملف الشخصي',
          subtitle: 'عرض الملف الشخصي',
          color: '#2563eb',
          onPress: () => console.log('Profile'),
        },
        {
          id: 'help',
          icon: 'help-circle-outline',
          title: 'المساعدة',
          subtitle: 'الأسئلة الشائعة والدعم',
          color: '#6c757d',
          onPress: () => console.log('Help'),
        },
      ];
  }
};

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

interface ActionCardProps {
  action: QuickAction;
  isDark: boolean;
  delay: number;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, isDark, delay }) => {
  const theme = UnifiedDesignSystem.getTheme(isDark);
  
  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(600)}
      style={styles.actionCard}
    >
      <TouchableOpacity
        onPress={action.onPress}
        style={[
          styles.actionButton,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            ...UnifiedDesignSystem.shadows.soft2,
          },
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
          <Ionicons name={action.icon as any} size={32} color={action.color} />
        </View>
        
        <Text style={[styles.actionTitle, { color: theme.text.primary }]}>
          {action.title}
        </Text>
        
        <Text style={[styles.actionSubtitle, { color: theme.text.secondary }]}>
          {action.subtitle}
        </Text>
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
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UnifiedDesignSystem.spacing.md,
  },
  
  actionCard: {
    width: '48%',
  },
  
  actionButton: {
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.lg,
    borderWidth: 0.5,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: UnifiedDesignSystem.spacing.md,
  },
  
  actionTitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.md,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: UnifiedDesignSystem.spacing.xs,
  },
  
  actionSubtitle: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
});
