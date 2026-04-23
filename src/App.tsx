import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import MainLayout from '@/components/layout/MainLayout';
import ModuleGuard from '@/components/layout/ModuleGuard';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import PageLoader from '@/components/common/PageLoader';
import { initArabicNumeralNormalizer } from '@/lib/arabicNumeralNormalizer';
import { LicenseExpiryBanner } from '@/components/LicenseExpiryBanner';

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

function App() {
  // 🔢 Auto-convert Arabic/Persian numerals to English globally
  useEffect(() => {
    const cleanup = initArabicNumeralNormalizer();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <LicenseExpiryBanner />
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
