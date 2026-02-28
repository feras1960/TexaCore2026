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
const AccountingSheetsLab = React.lazy(() => import('@/features/componentLab/AccountingSheetsLab'));
const Login = React.lazy(() => import('@/features/auth/Login'));
const Register = React.lazy(() => import('@/features/auth/Register'));
const RegistrationWizard = React.lazy(() => import('@/features/auth/FabricRegistrationWizard'));
const DesignSystemDemo = React.lazy(() => import('@/pages/DesignSystemDemo'));
const NexaDataTableDemo = React.lazy(() => import('@/pages/NexaDataTableDemo'));
const SheetsPreview = React.lazy(() => import('@/pages/SheetsPreview'));
const KanbanLabPage = React.lazy(() => import('@/pages/KanbanLabPage'));
const AdvancedQRScannerPage = React.lazy(() => import('@/pages/advanced/AdvancedQRScannerPage'));
const CRM = React.lazy(() => import('@/features/crm/CRM'));
const HR = React.lazy(() => import('@/features/hr/HR'));

const Fabrics = React.lazy(() => import('@/features/fabrics/Fabrics')); // Keep file name as is for now, but route is /fabric
const Pharmacy = React.lazy(() => import('@/features/pharmacy/Pharmacy'));
const Healthcare = React.lazy(() => import('@/features/healthcare/Healthcare'));
const Doctors = React.lazy(() => import('@/features/doctors/Doctors'));
const Restaurant = React.lazy(() => import('@/features/restaurant/Restaurant'));
const Gold = React.lazy(() => import('@/features/gold/Gold'));
// const Shipments — REMOVED 2026-02-17: unified into containers module
const WarehouseModule = React.lazy(() => import('@/features/warehouse/WarehouseModule'));
const Purchases = React.lazy(() => import('@/features/purchases/PurchasesPage'));
const SystemConfigPage = React.lazy(() => import('@/features/settings/SystemConfigPage'));
const UsersPermissionsPage = React.lazy(() => import('@/features/users-permissions/UsersPermissionsPage'));
const Sales = React.lazy(() => import('@/features/sales/SalesPage'));
const WorkflowCenter = React.lazy(() => import('@/features/workflow-center/WorkflowCenter'));
const EcommercePage = React.lazy(() => import('@/features/ecommerce/EcommercePage'));

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
          {/* Registration Wizard - After signup */}
          <Route path="/registration-wizard" element={<RegistrationWizard />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounting/*" element={<Accounting />} />
            <Route path="/saas/*" element={<SaaS />} />

            {/* Hardcoded Modules */}
            <Route path="/fabric/*" element={<Fabrics />} />
            <Route path="/pharmacy/*" element={<Pharmacy />} />
            <Route path="/healthcare/*" element={<Healthcare />} />
            <Route path="/doctors/*" element={<Doctors />} />
            <Route path="/restaurant/*" element={<Restaurant />} />
            <Route path="/gold/*" element={<Gold />} />
            {/* Shipments route removed 2026-02-17: unified into containers */}

            <Route path="/sales/*" element={<Sales />} />
            <Route path="/crm/*" element={<CRM />} />
            <Route path="/warehouse/*" element={<WarehouseModule />} />
            <Route path="/inventory/*" element={<WarehouseModule />} />
            <Route path="/purchases/*" element={<Purchases />} />
            <Route path="/pos/*" element={<PlaceholderPage titleKey="navigation.pos" />} />
            <Route path="/exchange/*" element={<PlaceholderPage titleKey="navigation.exchange" />} />
            <Route path="/real-estate/*" element={<PlaceholderPage titleKey="navigation.realEstate" />} />
            <Route path="/manufacturing/*" element={<PlaceholderPage titleKey="navigation.manufacturing" />} />
            <Route path="/hr/*" element={<HR />} />
            <Route path="/ecommerce/*" element={<EcommercePage />} />
            <Route path="/ai-analytics" element={<PlaceholderPage titleKey="navigation.aiAnalytics" />} />
            <Route path="/system-config/*" element={<SystemConfigPage />} />
            <Route path="/users-permissions/*" element={<UsersPermissionsPage />} />
            <Route path="/workflows/*" element={<WorkflowCenter />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/component-lab" element={<ComponentLab />} />
            <Route path="/sheets-lab" element={<AccountingSheetsLab />} />
            <Route path="/design-system" element={<DesignSystemDemo />} />
            <Route path="/nexa-table" element={<NexaDataTableDemo />} />
            <Route path="/sheets-preview" element={<SheetsPreview />} />
            <Route path="/kanban-lab" element={<KanbanLabPage />} />
            <Route path="/qr-scan" element={<AdvancedQRScannerPage />} />
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
