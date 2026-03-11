/**
 * Register Page - Professional Design
 * TexaCore ERP System for Fabric Trading
 * Matching Reference Design from Tempo Labs
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
// companiesService removed - using register_new_subscriber RPC instead
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  Loader2,
  Mail,
  Eye,
  EyeOff,
  User,
  Building2,
  Phone,
  Globe,
  ChevronDown,
  CheckCircle2,
  ShoppingCart,
  Boxes,
  Calculator,
  Shield,
  BadgeCheck,
  Fingerprint,
  Star,
  ArrowLeft,
  ArrowRight,
  Check
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

// Benefit Check Item
const BenefitCheck = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center">
      <Check className="w-3 h-3 text-teal-400" />
    </div>
    <span className="text-gray-600 text-sm">{text}</span>
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

export default function Register() {
  const { t, direction, language, setLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  // ✅ Read URL params from website (plan, billing, name, email, company, phone)
  const urlParams = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      plan: params.get('plan') || '',
      billing: params.get('billing') || 'monthly',
      name: params.get('name') || '',
      email: params.get('email') || '',
      phone: params.get('phone') || '',
      company: params.get('company') || '',
      size: params.get('size') || '',
      lang: params.get('lang') || '',
    };
  }, []);

  const [formData, setFormData] = useState({
    email: urlParams.email || '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isRTL = direction === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simplified Validation (Email & Password only)
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setFormError(t('auth.fillAllFields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (formData.password.length < 8) {
      setFormError(t('authPage.register.passwordMinLength'));
      return;
    }

    if (!agreeToTerms) {
      setFormError(t('authPage.register.mustAgreeTerms'));
      return;
    }

    setIsCreating(true);

    try {
      const result = await register(formData.email, formData.password) as {
        error?: { message: string } | null;
        data?: { user: any; session: any } | null;
        needsEmailConfirmation?: boolean;
      };

      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : result.error.message || t('auth.registrationFailed');
        setFormError(errorMsg);
        setIsCreating(false);
        return;
      }

      const authData = result.data;

      // Check if email confirmation is needed
      if (result.needsEmailConfirmation || (authData?.user && !authData?.session)) {
        setFormError(language === 'ar'
          ? '✅ تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد ثم سجّل الدخول.'
          : '✅ Account created! Check your email for confirmation, then login.');
        setIsCreating(false);
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // ✅ Success! Auth user created
      // Now redirect to wizard to complete registration
      console.log('✅ Auth successful, redirecting to wizard');

      // Pass all data from URL + form to wizard
      const registrationData = {
        email: formData.email,
        plan: urlParams.plan || '',
        billing: urlParams.billing || 'monthly',
        name: urlParams.name || '',
        phone: urlParams.phone || '',
        companyName: urlParams.company || '',
        companySize: urlParams.size || '',
      };
      localStorage.setItem('registration_data', JSON.stringify(registrationData));

      navigate('/registration-wizard');
    } catch (err: any) {
      setFormError(err.message || t('auth.registrationFailed'));
      setIsCreating(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.hostname === 'localhost'
            ? `${window.location.origin}/`
            : 'https://app.texacore.ai/',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        console.error('[Google Register] Error:', error);
        setFormError(
          language === 'ar'
            ? 'فشل التسجيل بـ Google: ' + error.message
            : 'Google sign-up failed: ' + error.message
        );
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error('[Google Register] Exception:', err);
      setFormError(
        language === 'ar'
          ? 'حدث خطأ أثناء الاتصال بـ Google'
          : 'Error connecting to Google'
      );
      setGoogleLoading(false);
    }
  };

  const isLoading = loading || isCreating;

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

        {/* Decorative Circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-10">
          <div className="w-48 h-48 rounded-full border-2 border-white/30 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

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
                {t('authPage.register.heroTitle')}
              </h1>
              <p className="text-white/60 text-sm leading-relaxed">
                {t('authPage.register.heroDescription')}
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

          {/* Bottom - Testimonial */}
          <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <p className="text-white/80 text-sm italic mb-4 leading-relaxed">
              "{t('authPage.testimonial.quote')}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                أ
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{t('authPage.testimonial.author')}</p>
                <p className="text-white/50 text-xs">{t('authPage.testimonial.role')}</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== WHITE FORM SECTION ========== */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white min-h-screen overflow-y-auto">

        {/* Top Bar */}
        <div className="flex justify-between items-center p-4 sm:p-6 sticky top-0 bg-white z-10 border-b border-gray-50">
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
        <div className="flex-1 flex items-start justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('authPage.register.title')}
              </h2>
              <p className="text-gray-500 text-sm">
                {t('authPage.register.subtitle')}
              </p>
            </div>

            {/* Benefits */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 p-4 bg-teal-50/50 rounded-xl border border-teal-100">
              <BenefitCheck text={t('authPage.register.benefits.freeTrial')} />
              <BenefitCheck text={t('authPage.register.benefits.noCard')} />
              <BenefitCheck text={t('authPage.register.benefits.support')} />
              <BenefitCheck text={t('authPage.register.benefits.quickSetup')} />
            </div>

            {/* Google Sign-Up */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-sm font-medium gap-3 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                onClick={handleGoogleLogin}
                disabled={googleLoading || isLoading}
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
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">{t('common.or')}</span>
              </div>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700 font-medium">
                  {t('auth.email')}
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    disabled={isLoading}
                    className="h-11 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 pe-10"
                  />
                  <Mail className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 end-3" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700 font-medium">
                  {t('auth.password')}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    disabled={isLoading}
                    className="h-11 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 end-3"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700 font-medium">
                  {t('auth.confirmPassword')}
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    required
                    disabled={isLoading}
                    className="h-11 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 end-3"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{t('authPage.register.passwordHint')}</p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                    className="mt-0.5 border-gray-300 data-[state=checked]:bg-teal-600"
                  />
                  <Label htmlFor="terms" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
                    {t('authPage.register.agreeToTerms')}{' '}
                    <Link to="/terms" className="text-teal-600 hover:underline">{t('authPage.register.terms')}</Link>
                    {' '}{t('common.and')}{' '}
                    <Link to="/privacy" className="text-teal-600 hover:underline">{t('authPage.register.privacy')}</Link>
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="newsletter"
                    checked={subscribeNewsletter}
                    onCheckedChange={(checked) => setSubscribeNewsletter(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-teal-600"
                  />
                  <Label htmlFor="newsletter" className="text-xs text-gray-600 cursor-pointer">
                    {t('authPage.register.subscribeNewsletter')}
                  </Label>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {(formError || error) && (
                  <motion.div
                    className="bg-red-50 border border-red-100 rounded-lg p-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-sm text-red-600">{formError || error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold text-white gap-2 shadow-lg shadow-teal-600/20 transition-all hover:shadow-xl"
                style={{ backgroundColor: '#0d5c4d' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('auth.creatingAccount')}
                  </>
                ) : (
                  <>
                    {t('authPage.register.createAccount')}
                    <ArrowIcon className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
              <TrustBadge icon={Shield} text={t('auth.secure')} />
              <TrustBadge icon={BadgeCheck} text={t('auth.trusted')} />
              <TrustBadge icon={Fingerprint} text={t('auth.encrypted')} />
            </div>

            {/* European Quality Badge */}
            <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                <span className="text-lg">🇪🇺</span>
                <span>{t('auth.europeanQuality')}</span>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                {t('auth.haveAccount')}{' '}
                <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                  {t('auth.login')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
