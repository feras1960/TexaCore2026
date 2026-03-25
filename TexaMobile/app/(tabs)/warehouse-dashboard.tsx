/**
 * Warehouse Manager Dashboard - لوحة تحكم مدير المستودع
 */

import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GlassBackground, GlassCard } from '@/components/glass';
import { getTheme, Spacing, Typography } from '@/constants/glassmorphism-theme';
import { useAuth } from '@/contexts/AuthContext';

export default function WarehouseDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);
  const { session } = useAuth();

  const inventory = [
    { name: 'قماش قطني', quantity: 1250, unit: 'متر', status: 'normal' },
    { name: 'قماش حريري', quantity: 45, unit: 'متر', status: 'low' },
    { name: 'خيوط', quantity: 350, unit: 'بكرة', status: 'normal' },
    { name: 'أزرار', quantity: 15, unit: 'علبة', status: 'critical' },
  ];

  return (
    <GlassBackground preset="forest" animated>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.icon}>
            <Ionicons name="cube-outline" size={32} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            لوحة تحكم المستودع
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            {session?.profile?.full_name || 'مدير المستودع'}
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons name="business" size={16} color={theme.success} />
            <Text style={[styles.roleText, { color: theme.success }]}>
              Warehouse Manager
            </Text>
          </View>
        </View>

        {/* Inventory Stats */}
        <View style={styles.statsGrid}>
          <GlassCard variant="medium" shadow="soft3" borderRadius="lg">
            <View style={styles.statCard}>
              <Ionicons name="layers-outline" size={28} color={theme.info} />
              <Text style={[styles.statValue, { color: theme.text.primary }]}>
                1,250
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                إجمالي الأصناف
              </Text>
            </View>
          </GlassCard>
          
          <GlassCard variant="medium" shadow="soft3" borderRadius="lg">
            <View style={styles.statCard}>
              <Ionicons name="alert-circle-outline" size={28} color={theme.error} />
              <Text style={[styles.statValue, { color: theme.text.primary }]}>
                12
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                مخزون منخفض
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Inventory List */}
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          حالة المخزون
        </Text>

        {inventory.map((item, index) => (
          <GlassCard key={index} variant="medium" shadow="soft2" borderRadius="md">
            <View style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text.primary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemQuantity, { color: theme.text.secondary }]}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
              <View style={[
                styles.statusIndicator,
                {
                  backgroundColor: item.status === 'critical' ? theme.error + '20' :
                                 item.status === 'low' ? theme.warning + '20' :
                                 theme.success + '20'
                }
              ]}>
                <Ionicons
                  name={item.status === 'critical' ? 'alert-circle' :
                        item.status === 'low' ? 'warning' : 'checkmark-circle'}
                  size={20}
                  color={item.status === 'critical' ? theme.error :
                         item.status === 'low' ? theme.warning : theme.success}
                />
              </View>
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
  icon: {
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
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.lg,
  },
  itemCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  itemQuantity: {
    fontSize: Typography.fontSize.sm,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
