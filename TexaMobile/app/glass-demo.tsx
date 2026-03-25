/**
 * Glassmorphism Demo Screen
 * Test all glass components with theme switching
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  GlassBackground,
  GlassCard,
  GlassInput,
  GlassButton,
  GlassView,
} from '@/components/glass';
import {
  getTheme,
  Spacing,
  Typography,
} from '@/constants/glassmorphism-theme';

export default function GlassDemoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gradientPreset, setGradientPreset] = useState<any>('primary');

  const gradients = ['primary', 'secondary', 'sunset', 'ocean', 'forest', 'warm'];

  const handleButtonPress = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <GlassBackground preset={gradientPreset} animated>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            🎨 Glassmorphism Demo
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Mode: {isDark ? 'Dark 🌙' : 'Light ☀️'}
          </Text>
        </View>

        {/* Gradient Selector */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Gradient Presets
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.gradientButtons}>
                {gradients.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => setGradientPreset(preset)}
                    style={[
                      styles.gradientButton,
                      {
                        backgroundColor:
                          gradientPreset === preset
                            ? theme.accent
                            : theme.glass.background,
                        borderColor: theme.glass.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradientButtonText,
                        {
                          color:
                            gradientPreset === preset
                              ? theme.text.inverse
                              : theme.text.primary,
                        },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </GlassCard>

        {/* GlassView Variants */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              GlassView Variants
            </Text>

            <View style={styles.variantsContainer}>
              <GlassView variant="subtle" shadow="soft2" borderRadius="md" style={styles.variantBox}>
                <Text style={[styles.variantText, { color: theme.text.primary }]}>
                  Subtle (50%)
                </Text>
              </GlassView>

              <GlassView variant="medium" shadow="soft2" borderRadius="md" style={styles.variantBox}>
                <Text style={[styles.variantText, { color: theme.text.primary }]}>
                  Medium (70%)
                </Text>
              </GlassView>

              <GlassView variant="strong" shadow="soft2" borderRadius="md" style={styles.variantBox}>
                <Text style={[styles.variantText, { color: theme.text.primary }]}>
                  Strong (85%)
                </Text>
              </GlassView>
            </View>
          </View>
        </GlassCard>

        {/* Input Fields */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Glass Inputs
            </Text>

            <GlassInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={theme.text.secondary} />
              }
            />

            <GlassInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={theme.text.secondary} />
              }
              rightIcon={
                <Ionicons name="eye-outline" size={20} color={theme.text.secondary} />
              }
            />
          </View>
        </GlassCard>

        {/* Button Variants */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Button Variants
            </Text>

            <View style={styles.buttonsContainer}>
              <GlassButton
                variant="primary"
                size="md"
                onPress={handleButtonPress}
                loading={loading}
                fullWidth
                leftIcon={<Ionicons name="log-in-outline" size={20} color="#fff" />}
              >
                Primary Button
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="md"
                onPress={handleButtonPress}
                fullWidth
                leftIcon={<Ionicons name="settings-outline" size={20} color={theme.text.primary} />}
              >
                Secondary Button
              </GlassButton>

              <GlassButton
                variant="outline"
                size="md"
                onPress={handleButtonPress}
                fullWidth
                leftIcon={<Ionicons name="add-outline" size={20} color={theme.accent} />}
              >
                Outline Button
              </GlassButton>

              <GlassButton
                variant="ghost"
                size="md"
                onPress={handleButtonPress}
                fullWidth
                leftIcon={<Ionicons name="trash-outline" size={20} color={theme.accent} />}
              >
                Ghost Button
              </GlassButton>
            </View>
          </View>
        </GlassCard>

        {/* Button Sizes */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Button Sizes
            </Text>

            <View style={styles.buttonsContainer}>
              <GlassButton variant="primary" size="sm" onPress={handleButtonPress} fullWidth>
                Small (36px)
              </GlassButton>

              <GlassButton variant="primary" size="md" onPress={handleButtonPress} fullWidth>
                Medium (48px)
              </GlassButton>

              <GlassButton variant="primary" size="lg" onPress={handleButtonPress} fullWidth>
                Large (56px)
              </GlassButton>
            </View>
          </View>
        </GlassCard>

        {/* Interactive Cards */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Interactive Cards
            </Text>

            <View style={styles.cardsGrid}>
              {[1, 2, 3, 4].map((i) => (
                <GlassCard
                  key={i}
                  variant="medium"
                  shadow="soft2"
                  borderRadius="md"
                  onPress={() => console.log(`Card ${i} pressed`)}
                  pressable
                  hoverEffect
                  style={styles.interactiveCard}
                >
                  <View style={styles.cardContent}>
                    <Ionicons name="cube-outline" size={32} color={theme.accent} />
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                      Card {i}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: theme.text.secondary }]}>
                      Press me!
                    </Text>
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        </GlassCard>

        {/* Status Colors */}
        <GlassCard variant="strong" shadow="soft3" borderRadius="lg">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Status Colors
            </Text>

            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                <Text style={[styles.statusText, { color: '#fff' }]}>Success</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: theme.warning }]}>
                <Text style={[styles.statusText, { color: '#fff' }]}>Warning</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: theme.error }]}>
                <Text style={[styles.statusText, { color: '#fff' }]}>Error</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: theme.info }]}>
                <Text style={[styles.statusText, { color: '#fff' }]}>Info</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
            © 2026 TexaMobile - Glassmorphism Demo
          </Text>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl * 2,
    gap: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  section: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.lg,
  },
  gradientButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gradientButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  gradientButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  variantsContainer: {
    gap: Spacing.md,
  },
  variantBox: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  variantText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonsContainer: {
    gap: Spacing.md,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  interactiveCard: {
    width: '48%',
  },
  cardContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.sm,
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
});
