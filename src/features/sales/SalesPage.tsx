/**
 * Sales Module Main Page
 * Matches the exact styling and structure of Accounting/Inventory/Purchases modules.
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import SectionLoader from '@/components/common/SectionLoader';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    FileText,
    CreditCard,
    BarChart3,
    Settings,
} from 'lucide-react';

// Lazy load components
const SalesDashboard = lazy(() => import('./pages/SalesDashboard'));
const CustomersList = lazy(() => import('./pages/CustomersList'));
const SalesCycleList = lazy(() => import('./pages/SalesCycleList'));
const SalesInvoicesList = lazy(() => import('./pages/SalesInvoicesList'));
const SalesPaymentsList = lazy(() => import('./pages/SalesPaymentsList'));
// Reports and Settings
const SalesReports = lazy(() => import('./pages/SalesReportsPage'));
const SalesSettings = lazy(() => import('./pages/SalesWorkflowSettings'));


// Loading component
const TabContentLoader = () => (
    <SectionLoader variant="dashboard" showTabs={false} />
);

export default function SalesPage() {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/sales')) {
            if (path.includes('/customers')) return 'customers';
            if (path.includes('/cycle')) return 'cycle';
            if (path.includes('/invoices')) return 'invoices';
            if (path.includes('/payments')) return 'payments';
            if (path.includes('/reports')) return 'reports';
            if (path.includes('/settings')) return 'settings';
            return 'dashboard';
        }
        return 'dashboard';
    };

    const [activeTab, setActiveTab] = useState(getActiveTab());

    // Update active tab when location changes
    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [location.pathname]);

    const tabs = [
        {
            id: 'dashboard',
            labelKey: 'sales.dashboard',
            icon: LayoutDashboard,
        },
        {
            id: 'customers',
            labelKey: 'sales.customers',
            icon: Users,
        },
        {
            id: 'cycle',
            labelKey: 'sales.cycle',
            icon: ShoppingCart,
        },
        {
            id: 'invoices',
            labelKey: 'sales.invoices',
            icon: FileText,
        },
        {
            id: 'payments',
            labelKey: 'sales.payments', // Or sales.receipts
            icon: CreditCard,
        },
        {
            id: 'reports',
            labelKey: 'sales.reports',
            icon: BarChart3,
        },
        {
            id: 'settings',
            labelKey: 'sales.settings',
            icon: Settings,
        },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        // Add navigation to enable deep linking
        const path = tabId === 'dashboard' ? '/sales' : `/sales/${tabId}`;
        navigate(path);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <SalesDashboard />;
            case 'customers':
                return <CustomersList />;
            case 'cycle':
                return <SalesCycleList />;
            case 'invoices':
                return <SalesInvoicesList />;
            case 'payments':
                return <SalesPaymentsList />;
            case 'reports':
                return <SalesReports />;
            case 'settings':
                return <SalesSettings />;
            default:
                return <SalesDashboard />;
        }
    };

    return (
        <div className="space-y-6">
            <MainTabsBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            <Suspense fallback={<TabContentLoader />}>
                {renderContent()}
            </Suspense>
        </div>
    );
}
