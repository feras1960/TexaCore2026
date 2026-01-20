/**
 * Register Page
 * With automatic company creation
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { companiesService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!email || !password || !confirmPassword || !fullName || !companyName) {
      setFormError(t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setFormError(t('auth.passwordMinLength'));
      return;
    }

    setIsCreating(true);

    try {
      // Step 1: Register user
      const { data: authData, error: authError } = await register(email, password);
      
      if (authError) {
        setFormError(typeof authError === 'string' ? authError : t('auth.registrationFailed'));
        setIsCreating(false);
        return;
      }

      // Note: If email confirmation is enabled, user might be null
      // We'll use the email to get user ID from Supabase auth
      let userId: string;
      
      if (authData?.user) {
        userId = authData.user.id;
      } else {
        // If user is null (email confirmation), try to get from session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setFormError(t('auth.registrationFailed') + ' - ' + t('auth.checkEmail'));
          setIsCreating(false);
          return;
        }
        userId = session.user.id;
      }

      // Step 2: Create company
      const companyCode = `COMP${Date.now().toString().slice(-6)}`;
      const newCompany = await companiesService.create({
        code: companyCode,
        name: companyName,
        name_en: companyName,
        default_currency: 'SAR',
        fiscal_year_start_month: 1,
        tax_system: 'vat_sa',
        vat_rate: 15.00,
        inventory_valuation_method: 'weighted_average',
        country_code: 'SA',
      });

      // Step 3: Create or update user profile with company link
      // Use database function with SECURITY DEFINER to bypass RLS
      const { error: profileError } = await supabase.rpc(
        'update_user_profile_on_registration',
        {
          p_user_id: userId,
          p_email: email,
          p_full_name: fullName,
          p_role: 'admin',
          p_company_id: newCompany.id,
        }
      );

      if (profileError) {
        console.error('Error creating/updating user profile:', profileError);
        const errorMessage = profileError.message || profileError.code || 'Unknown error';
        setFormError(`${t('auth.profileCreationFailed')}: ${errorMessage}`);
        setIsCreating(false);
        return;
      }

      // Success - redirect to dashboard
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setFormError(err.message || t('auth.registrationFailed'));
      setIsCreating(false);
    }
  };

  const isLoading = loading || isCreating;

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-erp-cream dark:bg-gray-950 p-4",
      direction === 'rtl' && 'font-tajawal'
    )} dir={direction}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Logo size="lg" showText={true} />
        </div>

        {/* Register Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white mb-2 text-center font-cairo">
            {t('auth.register')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
            {t('auth.registerDescription')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.fullNamePlaceholder')}
                required
                disabled={isLoading}
              />
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">{t('auth.companyName')}</Label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t('auth.companyNamePlaceholder')}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                {t('auth.companyWillBeCreated')}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                disabled={isLoading}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                required
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {(formError || error) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {formError || error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="teal"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('auth.creatingAccount')}
                </>
              ) : (
                t('auth.register')
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.haveAccount')}{' '}
                <Link
                  to="/login"
                  className="text-erp-teal hover:underline font-medium"
                >
                  {t('auth.login')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
