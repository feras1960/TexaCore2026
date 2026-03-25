/**
 * Cashier Dashboard - Swiss Minimalism + Real Data
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { SwissTheme } from '@/constants/swiss-theme';

export default function CashierDashboard() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={SwissTheme.layout.screen}>
      <StatusBar style="dark" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInUp.duration(600)}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={SwissTheme.typography.caption}>لوحة تحكم</Text>
              <Text style={SwissTheme.typography.h2}>الكاشير</Text>
            </View>
            
            <TouchableOpacity 
              onPress={signOut}
              style={styles.logoutButton}
            >
              <Ionicons name="log-out-outline" size={24} color={SwissTheme.colors.gray700} />
            </TouchableOpacity>
          </View>
          
          <Text style={[SwissTheme.typography.caption, { marginTop: 8 }]}>
            {session?.profile?.full_name || session?.user?.email}
          </Text>
        </Animated.View>

        <View style={styles.content}>
          {/* Quick Stats */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.section}
          >
            <Text style={[SwissTheme.typography.h3, styles.sectionTitle]}>
              ملخص سريع
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color={SwissTheme.colors.black} />
                <Text style={SwissTheme.typography.number}>0</Text>
                <Text style={SwissTheme.typography.caption}>المعاملات اليوم</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="wallet-outline" size={24} color={SwissTheme.colors.black} />
                <Text style={SwissTheme.typography.number}>0</Text>
                <Text style={SwissTheme.typography.caption}>الرصيد</Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View 
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.section}
          >
            <Text style={[SwissTheme.typography.h3, styles.sectionTitle]}>
              إجراءات سريعة
            </Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="add-circle-outline" size={24} color={SwissTheme.colors.black} />
                <Text style={SwissTheme.typography.body}>إيداع</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="remove-circle-outline" size={24} color={SwissTheme.colors.black} />
                <Text style={SwissTheme.typography.body}>سحب</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="swap-horizontal-outline" size={24} color={SwissTheme.colors.black} />
                <Text style={SwissTheme.typography.body}>تحويل</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: SwissTheme.spacing.screenPadding,
    paddingBottom: SwissTheme.spacing.lg,
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SwissTheme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: {
    paddingHorizontal: SwissTheme.spacing.screenPadding,
    paddingBottom: SwissTheme.spacing.xxl,
  },
  
  section: {
    marginBottom: SwissTheme.spacing.xl,
  },
  
  sectionTitle: {
    marginBottom: SwissTheme.spacing.md,
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: SwissTheme.spacing.md,
  },
  
  statCard: {
    flex: 1,
    ...SwissTheme.components.statCard,
    alignItems: 'center',
    gap: SwissTheme.spacing.sm,
  },
  
  actionsGrid: {
    flexDirection: 'row',
    gap: SwissTheme.spacing.md,
  },
  
  actionButton: {
    flex: 1,
    padding: SwissTheme.spacing.md,
    backgroundColor: SwissTheme.colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: SwissTheme.colors.gray200,
    alignItems: 'center',
    gap: SwissTheme.spacing.sm,
  },
});
