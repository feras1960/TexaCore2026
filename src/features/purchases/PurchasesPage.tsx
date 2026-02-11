/**
 * Purchases Module Main Page
 * Matches the exact styling and structure of Accounting/Inventory modules.
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
    Container,
    Settings,
} from 'lucide-react';

// Lazy load components
const PurchasesDashboard = lazy(() => import('./pages/PurchasesDashboard'));
const SuppliersList = lazy(() => import('./pages/SuppliersList'));
const PurchaseCycleList = lazy(() => import('./pages/PurchaseCycleList'));
const PurchaseInvoicesList = lazy(() => import('./pages/PurchaseInvoicesList'));
const PaymentsList = lazy(() => import('./pages/PaymentsList'));
const ContainersList = lazy(() => import('./pages/ContainersList'));
const PurchasesSettings = lazy(() => import('./pages/PurchasesWorkflowSettings'));

// Loading component
const TabContentLoader = () => (
    <SectionLoader variant="dashboard" showTabs={false} />
);

export default function PurchasesPage() {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/purchases')) {
            if (path.includes('/suppliers')) return 'suppliers';
            if (path.includes('/cycle')) return 'cycle';
            if (path.includes('/invoices')) return 'invoices';
            if (path.includes('/payments')) return 'payments';
            if (path.includes('/containers')) return 'containers';
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
            labelKey: 'purchases.dashboard',
            icon: LayoutDashboard,
        },
        {
            id: 'suppliers',
            labelKey: 'purchases.suppliers',
            icon: Users,
        },
        {
            id: 'cycle',
            labelKey: 'purchases.cycle',
            icon: ShoppingCart,
        },
        {
            id: 'invoices',
            labelKey: 'purchases.invoices',
            icon: FileText,
        },
        {
            id: 'payments',
            labelKey: 'purchases.payments',
            icon: CreditCard,
        },
        {
            id: 'containers',
            labelKey: 'purchases.containers',
            icon: Container,
        },
        {
            id: 'settings',
            labelKey: 'purchases.settings',
            icon: Settings,
        },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        // Add navigation to enable deep linking
        const path = tabId === 'dashboard' ? '/purchases' : `/purchases/${tabId}`;
        navigate(path);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <PurchasesDashboard />;
            case 'suppliers':
                return <SuppliersList />;
            case 'cycle':
                return <PurchaseCycleList />;
            case 'invoices':
                return <PurchaseInvoicesList />;
            case 'payments':
                return <PaymentsList />;
            case 'containers':
                return <ContainersList />;
            case 'settings':
                return <PurchasesSettings />;
            default:
                return <PurchasesDashboard />;
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
