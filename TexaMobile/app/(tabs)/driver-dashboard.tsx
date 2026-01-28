/**
 * Driver Dashboard - لوحة تحكم السائق
 */

import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GlassBackground, GlassCard, GlassButton } from '@/components/glass';
import { getTheme, Spacing, Typography } from '@/constants/glassmorphism-theme';
import { useAuth } from '@/contexts/AuthContext';

export default function DriverDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);
  const { session } = useAuth();

  const deliveries = [
    { id: 1, address: 'شارع الملك فهد، الرياض', status: 'pending', time: '10:00 AM' },
    { id: 2, address: 'حي النخيل، جدة', status: 'in_progress', time: '2:00 PM' },
    { id: 3, address: 'طريق الملك عبدالله، الدمام', status: 'completed', time: '4:30 PM' },
  ];

  return (
    <GlassBackground preset="ocean" animated>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.driverIcon}>
            <Ionicons name="car-sport-outline" size={32} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            لوحة تحكم السائق
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            {session?.profile?.full_name || 'السائق'}
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons name="navigate-circle" size={16} color={theme.info} />
            <Text style={[styles.roleText, { color: theme.info }]}>
              Driver
            </Text>
          </View>
        </View>

        {/* Today's Stats */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.statsCard}>
            <Text style={[styles.statsTitle, { color: theme.text.primary }]}>
              إحصائيات اليوم
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.success }]}>8</Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  تم التوصيل
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.warning }]}>3</Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  قيد التنفيذ
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.accent }]}>124 كم</Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  المسافة
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Deliveries List */}
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          طلبات التوصيل
        </Text>

        {deliveries.map((delivery) => (
          <GlassCard key={delivery.id} variant="medium" shadow="soft2" borderRadius="md">
            <View style={styles.deliveryCard}>
              <View style={styles.deliveryInfo}>
                <View style={styles.deliveryHeader}>
                  <Ionicons 
                    name="location-outline" 
                    size={20} 
                    color={theme.accent} 
                  />
                  <Text style={[styles.deliveryAddress, { color: theme.text.primary }]}>
                    {delivery.address}
                  </Text>
                </View>
                <View style={styles.deliveryMeta}>
                  <Ionicons name="time-outline" size={16} color={theme.text.tertiary} />
                  <Text style={[styles.deliveryTime, { color: theme.text.secondary }]}>
                    {delivery.time}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: delivery.status === 'completed' ? theme.success + '20' : theme.warning + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: delivery.status === 'completed' ? theme.success : theme.warning }
                    ]}>
                      {delivery.status === 'completed' ? 'مكتمل' : 
                       delivery.status === 'in_progress' ? 'قيد التنفيذ' : 'معلق'}
                    </Text>
                  </View>
                </View>
              </View>
              {delivery.status === 'pending' && (
                <GlassButton variant="primary" size="sm" onPress={() => {}}>
                  ابدأ
                </GlassButton>
              )}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  driverIcon: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  roleText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  statsCard: {
    padding: Spacing.xl,
  },
  statsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginVertical: Spacing.lg,
  },
  deliveryCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  deliveryAddress: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  deliveryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deliveryTime: {
    fontSize: Typography.fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
