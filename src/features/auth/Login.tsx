/**
 * Login Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect when authenticated
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

    const { error } = await login(email, password);
    if (error) {
      setFormError(error);
    }
    // Navigation will happen automatically via useEffect when isAuthenticated becomes true
  };

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

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white mb-2 text-center font-cairo">
            {t('auth.login')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
            {t('auth.loginDescription')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={loading}
                className="w-full"
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
                disabled={loading}
                className="w-full"
              />
            </div>

            {/* Error Message */}
            {/* Only show errors that are not "Auth session missing" (normal before login) */}
            {(formError || (error && !error.includes('Auth session missing') && !error.includes('session missing'))) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {formError || (typeof error === 'string' ? error : error?.message || 'حدث خطأ غير متوقع')}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="teal"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.login')
              )}
            </Button>

            {/* Register Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.noAccount')}{' '}
                <Link
                  to="/register"
                  className="text-erp-teal hover:underline font-medium"
                >
                  {t('auth.register')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
