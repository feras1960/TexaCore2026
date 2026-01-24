import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import PageLoader, { BrandedLoader } from '@/components/common/PageLoader';

// Import AuthGuard directly (not lazy) for better auth flow
import { AuthGuard } from '@/components/auth/AuthGuard';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('@/features/dashboard/Dashboard'));
const Accounting = React.lazy(() => import('@/features/accounting/Accounting'));
const SaaS = React.lazy(() => import('@/features/saas/SaaS'));
const ActivityLog = React.lazy(() => import('@/features/admin/activityLog/ActivityLog'));
const ComponentLab = React.lazy(() => import('@/features/componentLab/ComponentLab'));
const Login = React.lazy(() => import('@/features/auth/Login'));
const Register = React.lazy(() => import('@/features/auth/Register'));
const DesignSystemDemo = React.lazy(() => import('@/pages/DesignSystemDemo'));

// Public Route Guard (redirects to home if already authenticated)
// Reserved for future use when public routes are needed
const _PublicRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
void _PublicRouteGuard;

// Placeholder pages for modules - uses translation keys
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

// Route-level loader using the branded loader
const RouteLoader = () => <PageLoader variant="default" />;

// Auth page loader (branded)
const AuthLoader = () => <BrandedLoader fullScreen />;

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Auth Routes (Public) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
          <Route path="/accounting/*" element={<Accounting />} />
          <Route path="/saas/*" element={<SaaS />} />
          <Route path="/sales/*" element={<PlaceholderPage titleKey="navigation.sales" />} />
          <Route path="/crm/*" element={<PlaceholderPage titleKey="navigation.crm" />} />
          <Route path="/inventory/*" element={<PlaceholderPage titleKey="navigation.inventory" />} />
          <Route path="/purchases/*" element={<PlaceholderPage titleKey="navigation.purchases" />} />
          <Route path="/pos/*" element={<PlaceholderPage titleKey="navigation.pos" />} />
          <Route path="/exchange/*" element={<PlaceholderPage titleKey="navigation.exchange" />} />
          <Route path="/real-estate/*" element={<PlaceholderPage titleKey="navigation.realEstate" />} />
          <Route path="/manufacturing/*" element={<PlaceholderPage titleKey="navigation.manufacturing" />} />
          <Route path="/hr/*" element={<PlaceholderPage titleKey="navigation.hr" />} />
          <Route path="/ecommerce/*" element={<PlaceholderPage titleKey="navigation.ecommerce" />} />
          <Route path="/ai-analytics" element={<PlaceholderPage titleKey="navigation.aiAnalytics" />} />
          <Route path="/system-config/*" element={<PlaceholderPage titleKey="navigation.systemConfig" />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/component-lab" element={<ComponentLab />} />
          <Route path="/design-system" element={<DesignSystemDemo />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
