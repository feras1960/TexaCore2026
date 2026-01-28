/**
 * Login Screen - Enhanced with Full Authentication Logic
 * Features: Email/Password login, Biometric authentication, Role-based routing
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  GlassBackground,
  GlassCard,
  GlassInput,
  GlassButton,
  GlassToast,
} from '@/components/glass';
import {
  getTheme,
  Spacing,
  Typography,
} from '@/constants/glassmorphism-theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkBiometricAvailability,
  isBiometricLoginEnabled,
  getBiometricIconName,
  getBiometricDisplayName,
} from '@/lib/biometrics';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);
  const { signIn, signInWithBiometric, loading: authLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [toastMessage, setToastMessage] = useState('');

  // Animation values
  const logoScale = useSharedValue(0.8);
  const cardScale = useSharedValue(0.95);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometric();
    
    // Logo entrance animation
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkBiometric = async () => {
    const availability = await checkBiometricAvailability();
    const enabled = await isBiometricLoginEnabled();
    
    setBiometricAvailable(availability.isAvailable);
    setBiometricEnabled(enabled);
    setBiometricType(availability.biometricType);
  };

  // Logo animation style
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
    };
  });

  // Card shake animation for errors
  const shakeCard = () => {
    cardScale.value = withSequence(
      withSpring(0.98, { damping: 10 }),
      withSpring(1.02, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cardScale.value }],
    };
  });

  // Show toast notification
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
  };

  // Validation
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError('البريد الإلكتروني غير صالح');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    if (text && text.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    } else {
      setPasswordError('');
    }
  };

  // Handle Email/Password Login
  const handleLogin = async () => {
    console.log('🔐 handleLogin called');
    console.log('📧 Email:', email);
    console.log('🔒 Password:', password ? '***' : 'empty');
    console.log('❌ Email Error:', emailError);
    console.log('❌ Password Error:', passwordError);

    // Validate
    if (!email || !password) {
      console.log('❌ Validation failed: empty fields');
      if (!email) setEmailError('البريد الإلكتروني مطلوب');
      if (!password) setPasswordError('كلمة المرور مطلوبة');
      shakeCard();
      showToast('error', 'يرجى ملء جميع الحقول');
      return;
    }

    // Skip error validation temporarily to test
    // if (emailError || passwordError) {
    //   console.log('❌ Validation failed: has errors');
    //   shakeCard();
    //   showToast('error', 'يرجى تصحيح الأخطاء أولاً');
    //   return;
    // }

    console.log('✅ Validation passed, attempting sign in...');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      console.log('🔍 signIn result:', error ? 'ERROR' : 'SUCCESS');

      if (error) {
        console.log('❌ Login error:', error.message);
        shakeCard();
        
        // Map error messages to Arabic
        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
        } else if (error.message.includes('Network')) {
          errorMessage = 'خطأ في الاتصال. يرجى التحقق من الإنترنت';
        }
        
        showToast('error', errorMessage);
      } else {
        console.log('✅ Login successful!');
        showToast('success', 'تم تسجيل الدخول بنجاح');
      }
    } catch (error: any) {
      console.log('❌ Caught exception:', error);
      shakeCard();
      showToast('error', error.message || 'حدث خطأ غير متوقع');
    } finally {
      console.log('🏁 Login process complete');
      setLoading(false);
    }
  };

  // Handle Biometric Login
  const handleBiometricLogin = async () => {
    if (!biometricEnabled) {
      showToast('warning', 'يجب تسجيل الدخول بكلمة المرور أولاً لتفعيل البصمة');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signInWithBiometric();

      if (error) {
        showToast('error', error.message || 'فشلت المصادقة بالبصمة');
      } else {
        showToast('success', 'تم تسجيل الدخول بالبصمة بنجاح');
      }
    } catch (error: any) {
      showToast('error', error.message || 'حدث خطأ أثناء المصادقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground preset="primary" animated>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Toast Notification */}
      <GlassToast
        visible={toastVisible}
        type={toastType}
        message={toastMessage}
        position="top"
        duration={3000}
        onHide={() => setToastVisible(false)}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Welcome Text */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={[styles.header, logoAnimatedStyle]}
          >
            <View style={[styles.logoContainer, { backgroundColor: theme.accent }]}>
              <Ionicons name="cube-outline" size={48} color={theme.text.inverse} />
            </View>
            
            <Text style={[styles.title, { color: theme.text.primary }]}>
              مرحباً بك في TexaMobile
            </Text>
            
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              سجل دخولك للمتابعة
            </Text>

            {/* Theme indicator */}
            <View style={styles.themeIndicator}>
              <Ionicons 
                name={isDark ? 'moon' : 'sunny'} 
                size={16} 
                color={theme.text.tertiary} 
              />
              <Text style={[styles.themeText, { color: theme.text.tertiary }]}>
                {isDark ? 'الوضع الليلي' : 'الوضع النهاري'}
              </Text>
            </View>
          </Animated.View>

          {/* Login Card */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={[styles.cardContainer, cardAnimatedStyle]}
          >
            <GlassCard variant="strong" shadow="soft4" borderRadius="xl">
              <View style={styles.cardContent}>
                {/* Email Input */}
                <GlassInput
                  label="البريد الإلكتروني"
                  value={email}
                  onChangeText={validateEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={emailError}
                  leftIcon={
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={theme.text.secondary}
                    />
                  }
                  editable={!loading}
                />

                {/* Password Input */}
                <GlassInput
                  label="كلمة المرور"
                  value={password}
                  onChangeText={validatePassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  error={passwordError}
                  leftIcon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.text.secondary}
                    />
                  }
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.text.secondary}
                      />
                    </TouchableOpacity>
                  }
                  editable={!loading}
                />

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
                  <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>
                    هل نسيت كلمة المرور؟
                  </Text>
                </TouchableOpacity>

                {/* Login Button */}
                <GlassButton
                  variant="primary"
                  size="lg"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading || authLoading}
                  fullWidth
                  leftIcon={
                    !loading && (
                      <Ionicons name="log-in-outline" size={20} color="#fff" />
                    )
                  }
                >
                  {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </GlassButton>

                {/* Biometric Login Button */}
                {biometricAvailable && (
                  <>
                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: theme.glass.border }]} />
                      <Text style={[styles.dividerText, { color: theme.text.tertiary }]}>
                        أو
                      </Text>
                      <View style={[styles.dividerLine, { backgroundColor: theme.glass.border }]} />
                    </View>

                    <GlassButton
                      variant="secondary"
                      size="lg"
                      onPress={handleBiometricLogin}
                      disabled={loading || authLoading || !biometricEnabled}
                      fullWidth
                      leftIcon={
                        <Ionicons
                          name={getBiometricIconName(biometricType) as any}
                          size={20}
                          color={theme.accent}
                        />
                      }
                    >
                      {biometricEnabled 
                        ? `الدخول بـ ${getBiometricDisplayName(biometricType)}`
                        : 'تسجيل الدخول أولاً لتفعيل البصمة'
                      }
                    </GlassButton>
                  </>
                )}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600).springify()}
            style={styles.signupContainer}
          >
            <Text style={[styles.signupText, { color: theme.text.secondary }]}>
              لا تمتلك حساب؟{' '}
            </Text>
            <TouchableOpacity disabled={loading}>
              <Text style={[styles.signupLink, { color: theme.accent }]}>
                سجل الآن
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(600).springify()}
            style={styles.footer}
          >
            <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
              © 2026 TexaMobile - Next Revolution Company
            </Text>
            <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
              Multi-tenant ERP System
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl * 2,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  themeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  themeText: {
    fontSize: Typography.fontSize.xs,
  },
  cardContainer: {
    marginBottom: Spacing.xl,
  },
  cardContent: {
    padding: Spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: Typography.fontSize.sm,
    marginHorizontal: Spacing.md,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  signupText: {
    fontSize: Typography.fontSize.base,
  },
  signupLink: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
});
