import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import MainLayout from '@/components/layout/MainLayout';
import ModuleGuard from '@/components/layout/ModuleGuard';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import PageLoader from '@/components/common/PageLoader';
import { initArabicNumeralNormalizer } from '@/lib/arabicNumeralNormalizer';
import { LicenseExpiryBanner } from '@/components/LicenseExpiryBanner';
import { initSessionGuard, isSelfHosted } from '@/services/sessionGuardService';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { TourProvider } from '@/components/tour/InteractiveTour';

// Import AuthGuard directly (not lazy) for better auth flow
import { AuthGuard } from '@/components/auth/AuthGuard';

import KeepAliveOutlet from '@/components/layout/KeepAliveOutlet';

// Pages only needed in NormalRoutes (placeholders + dev tools)
const Login = React.lazy(() => import('@/features/auth/Login'));
const Register = React.lazy(() => import('@/features/auth/Register'));
const RegistrationWizard = React.lazy(() => import('@/features/auth/FabricRegistrationWizard'));
const ComponentLab = React.lazy(() => import('@/features/componentLab/ComponentLab'));
const AccountingSheetsLab = React.lazy(() => import('@/features/componentLab/AccountingSheetsLab'));
const DesignSystemDemo = React.lazy(() => import('@/pages/DesignSystemDemo'));
const NexaDataTableDemo = React.lazy(() => import('@/pages/NexaDataTableDemo'));
const SheetsPreview = React.lazy(() => import('@/pages/SheetsPreview'));
const KanbanLabPage = React.lazy(() => import('@/pages/KanbanLabPage'));
const AccountingGridLab = React.lazy(() => import('@/pages/AccountingGridLab'));
const AdvancedQRScannerPage = React.lazy(() => import('@/pages/advanced/AdvancedQRScannerPage'));
const UiEffectsLab = React.lazy(() => import('@/features/componentLab/UiEffectsLab'));

// Placeholder pages for modules under development
const PlaceholderPage = ({ titleKey }: { titleKey: string }) => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
          {t(titleKey)}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-tajawal">
          {t('messages.pageUnderDevelopment')}
        </p>
      </div>
    </div>
  );
};

// Route-level loader
const RouteLoader = () => <PageLoader variant="default" />;

// ─── Non-keep-alive routes (placeholders + dev tools) ───────────
function NormalRoutes() {
  return (
    <Routes>
      {/* Placeholder modules */}
      <Route path="/pos/*" element={<PlaceholderPage titleKey="navigation.pos" />} />
      <Route path="/real-estate/*" element={<PlaceholderPage titleKey="navigation.realEstate" />} />
      <Route path="/manufacturing/*" element={<PlaceholderPage titleKey="navigation.manufacturing" />} />
      {/* Dev tools (no need for keep-alive) */}
      <Route path="/component-lab" element={<ComponentLab />} />
      <Route path="/sheets-lab" element={<AccountingSheetsLab />} />
      <Route path="/design-system" element={<DesignSystemDemo />} />
      <Route path="/nexa-table" element={<NexaDataTableDemo />} />
      <Route path="/sheets-preview" element={<SheetsPreview />} />
      <Route path="/kanban-lab" element={<KanbanLabPage />} />
      <Route path="/grid-lab" element={<AccountingGridLab />} />
      <Route path="/qr-scan" element={<AdvancedQRScannerPage />} />
      <Route path="/ui-effects-lab" element={<UiEffectsLab />} />
      <Route path="*" element={null} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Auth Routes (Public) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Registration Wizard - Semi-public (has its own internal auth guard) */}
        <Route path="/registration-wizard" element={<RegistrationWizard />} />

        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<MainLayout />}>
            <Route element={<ModuleGuard />}>
              {/* ⚡ Keep-alive pages + normal pages combined */}
              <Route path="/*" element={
                <KeepAliveOutlet fallbackElement={<NormalRoutes />} />
              } />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

// ─── Session Blocked Screen ─────────────────────────────────────
function SessionBlockedScreen({ sessionsMax }: { sessionsMax?: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Session Limit Reached
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Maximum {sessionsMax || 1} concurrent session{(sessionsMax || 1) > 1 ? 's' : ''} allowed for your plan.
          Please close another session first.
        </p>
        <p className="text-sm text-gray-400">
          تم الوصول للحد الأقصى من الجلسات المتزامنة. أغلق جلسة أخرى أولاً.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry / إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

function App() {
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [sessionsMax, setSessionsMax] = useState<number | undefined>();

  // 🔢 Auto-convert Arabic/Persian numerals to English globally
  useEffect(() => {
    const cleanup = initArabicNumeralNormalizer();
    return cleanup;
  }, []);

  // 🔒 Session Guard — only for self-hosted mode
  useEffect(() => {
    if (!isSelfHosted()) return;

    initSessionGuard().then((result) => {
      if (!result.allowed) {
        console.warn('[SessionGuard] Blocked:', result.error);
        setSessionBlocked(true);
        setSessionsMax(result.sessions_max);
      } else {
        console.log(`[SessionGuard] ✅ Session registered (${result.sessions_used}/${result.sessions_max})`);
      }
    });
  }, []);

  if (sessionBlocked) {
    return <SessionBlockedScreen sessionsMax={sessionsMax} />;
  }

  return (
    <ErrorBoundary>
      <AppProviders>
        <TourProvider>
          <LicenseExpiryBanner />
          <OnboardingWizard />
          <AppRoutes />
        </TourProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
