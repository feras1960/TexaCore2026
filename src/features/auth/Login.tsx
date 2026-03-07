/**
 * Login Page - Professional Design
 * TexaCore ERP System for Fabric Trading
 * Matching Reference Design from Tempo Labs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  Globe,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  ShoppingCart,
  Boxes,
  Calculator,
  Cpu,
  Shield,
  BadgeCheck,
  Fingerprint
} from 'lucide-react';

// ============================================
// COMPONENTS
// ============================================

// Feature Item - Responsive to language direction
const FeatureItem = ({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4 group">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 border border-white/5">
      <Icon className="w-5 h-5 text-white/90" />
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-white text-base mb-1">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

// Stats Item
const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-white/50 text-xs mt-1">{label}</div>
  </div>
);

// Trust Badge
const TrustBadge = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
    <Icon className="w-3.5 h-3.5" />
    <span>{text}</span>
  </div>
);

// Language Selector
const LanguageSelector = ({
  currentLanguage,
  supportedLanguages,
  onLanguageChange
}: {
  currentLanguage: string;
  supportedLanguages: Array<{ code: string; nativeName: string; flag: string }>;
  onLanguageChange: (lang: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = supportedLanguages.find(l => l.code === currentLanguage);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span>{current?.nativeName}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 end-0 w-48 py-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto"
            >
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                    currentLanguage === lang.code && "bg-teal-50 text-teal-700"
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                  {currentLanguage === lang.code && (
                    <CheckCircle2 className="w-4 h-4 ms-auto text-teal-600" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);



// ============================================
// MAIN COMPONENT
// ============================================

export default function Login() {
  const { t, direction, language, setLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isRTL = direction === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // 🛡️ SECURITY: Check for tenant_deleted error in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');

    if (errorParam === 'tenant_deleted') {
      setFormError(t('auth.errors.tenantDeleted') || 'تم حذف أو تعليق اشتراكك. الرجاء التواصل مع الدعم الفني.');
      // Clear the URL parameter
      window.history.replaceState({}, '', '/login');
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError(t('auth.fillAllFields'));
      return;
    }

    const result = await login(email, password);
    if (result.error) {
      setFormError(result.error);
    } else if (result.data?.success) {
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setFormError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        console.error('[Google Login] Error:', error);
        setFormError(
          language === 'ar'
            ? 'فشل تسجيل الدخول بـ Google: ' + error.message
            : 'Google sign-in failed: ' + error.message
        );
        setGoogleLoading(false);
      }
      // If no error, the browser will redirect to Google
    } catch (err: any) {
      console.error('[Google Login] Exception:', err);
      setFormError(
        language === 'ar'
          ? 'حدث خطأ أثناء الاتصال بـ Google'
          : 'Error connecting to Google'
      );
      setGoogleLoading(false);
    }
  };



  // Features for the hero section
  const features = [
    {
      icon: ShoppingCart,
      title: t('authPage.features.ecommerce.title'),
      description: t('authPage.features.ecommerce.description'),
    },
    {
      icon: Boxes,
      title: t('authPage.features.inventory.title'),
      description: t('authPage.features.inventory.description'),
    },
    {
      icon: Calculator,
      title: t('authPage.features.accounting.title'),
      description: t('authPage.features.accounting.description'),
    },
    {
      icon: Cpu,
      title: t('authPage.features.ai.title'),
      description: t('authPage.features.ai.description'),
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-row-reverse"
      dir={direction}
    >

      {/* ========== GREEN HERO SECTION ========== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: '#0d5c4d' }}>

        {/* Gradient Overlay - Top Light Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10" />

        {/* Radial Glow Effect */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)'
          }}
        />

        {/* Grid Pattern - Larger Size */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">

          {/* Top - Logo with Animation */}
          <Logo
            size="lg"
            variant="light"
            animated={true}
          />

          {/* Middle - Hero Content */}
          <div className="space-y-8 max-w-md w-full mx-auto">

            {/* Main Heading */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
                {t('authPage.login.welcomeBack')}
              </h1>
              <p className="text-white/60 text-sm leading-relaxed">
                {t('authPage.login.heroDescription')}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-5">
              {features.map((feature, index) => (
                <FeatureItem
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>

          {/* Bottom - Stats */}
          <div className="flex justify-center items-center gap-8 py-6 border-t border-white/10">
            <StatItem value="#1" label={t('authPage.stats.ranking')} />
            <div className="w-px h-8 bg-white/10" />
            <StatItem value="+36" label={t('authPage.stats.experience')} />
            <div className="w-px h-8 bg-white/10" />
            <StatItem value="+1,000" label={t('authPage.stats.partners')} />
          </div>
        </div>
      </div>

      {/* ========== WHITE FORM SECTION ========== */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white min-h-screen">

        {/* Top Bar */}
        <div className="flex justify-between items-center p-6">
          {/* Mobile Logo */}
          <div className="lg:hidden">
            <Logo size="sm" variant="dark" animated={true} />
          </div>

          {/* Language Selector */}
          <div className="ms-auto">
            <LanguageSelector
              currentLanguage={language}
              supportedLanguages={supportedLanguages}
              onLanguageChange={(lang) => setLanguage(lang as any)}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm">

            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('authPage.login.title')}
              </h2>
              <p className="text-gray-500 text-sm">
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="text-teal-600 hover:text-teal-700 font-semibold">
                  {t('authPage.createAccount')}
                </Link>
              </p>
            </div>

            {/* Google Sign-In */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-sm font-medium gap-3 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {t('auth.continueWithGoogle')}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">{t('common.or')}</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                  {t('auth.email')}
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    disabled={loading}
                    className="h-12 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-all pe-10"
                  />
                  <Mail className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 end-3" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                    {t('auth.password')}
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="h-12 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-all pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors end-3"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-gray-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  {t('auth.rememberMe')}
                </Label>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {(formError || (error && !error.includes('session'))) && (
                  <motion.div
                    className="bg-red-50 border border-red-100 rounded-lg p-3"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-sm text-red-600">{formError || error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold text-white gap-2 shadow-lg shadow-teal-600/20 transition-all hover:shadow-xl hover:shadow-teal-600/30"
                style={{ backgroundColor: '#0d5c4d' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    {t('auth.login')}
                  </>
                )}
              </Button>
            </form>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-gray-100">
              <TrustBadge icon={Shield} text={t('auth.secure')} />
              <TrustBadge icon={BadgeCheck} text={t('auth.trusted')} />
              <TrustBadge icon={Fingerprint} text={t('auth.encrypted')} />
            </div>

            {/* European Quality Badge */}
            <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                <span className="text-lg">🇪🇺</span>
                <span>{t('auth.europeanQuality')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
