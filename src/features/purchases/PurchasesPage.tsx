/**
 * ════════════════════════════════════════════════════════════════
 * 🛍️ Purchases Module Main Page
 * ════════════════════════════════════════════════════════════════
 *
 * ⚡ PERFORMANCE PATTERN: "Keep Visited Mounted"
 *
 * Tabs are only mounted the FIRST TIME the user visits them.
 * After that, they stay in the DOM (hidden via CSS) for instant switching.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    CreditCard,
    Container,
    Settings,
} from 'lucide-react';

// Direct imports (no lazy loading) for instant switching
import PurchasesDashboard from './pages/PurchasesDashboard';
import SuppliersList from './pages/SuppliersList';
import PurchaseInvoicesList from './pages/PurchaseInvoicesList';
import PaymentsList from './pages/PaymentsList';
import ContainersList from './pages/ContainersList';
import PurchasesSettings from './pages/PurchasesWorkflowSettings';

// Tab configuration type
interface TabConfig {
    id: string;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
}

export default function PurchasesPage() {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = useCallback(() => {
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
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);

    // ⚡ PERFORMANCE: Track which tabs have been visited
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getActiveTab()]));

    // Update active tab when location changes
    useEffect(() => {
        const newTab = getActiveTab();
        setActiveTab(newTab);
        setVisitedTabs(prev => {
            if (prev.has(newTab)) return prev;
            return new Set(prev).add(newTab);
        });
    }, [getActiveTab]);

    // Tab configuration
    const tabs: TabConfig[] = useMemo(() => [
        {
            id: 'dashboard',
            labelKey: 'purchases.dashboard',
            icon: LayoutDashboard,
            component: PurchasesDashboard,
        },
        {
            id: 'suppliers',
            labelKey: 'purchases.suppliers',
            icon: Users,
            component: SuppliersList,
        },
        {
            id: 'cycle',
            labelKey: 'purchases.cycle',
            icon: ShoppingCart,
            component: PurchaseInvoicesList,
        },
        {
            id: 'payments',
            labelKey: 'purchases.payments',
            icon: CreditCard,
            component: PaymentsList,
        },
        {
            id: 'containers',
            labelKey: 'purchases.containers',
            icon: Container,
            component: ContainersList,
        },
        {
            id: 'settings',
            labelKey: 'purchases.settings',
            icon: Settings,
            component: PurchasesSettings,
        },
    ], []);

    // Handle tab change
    const handleTabChange = useCallback((tabId: string) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            setVisitedTabs(prev => {
                if (prev.has(tabId)) return prev;
                return new Set(prev).add(tabId);
            });
            const path = tabId === 'dashboard' ? '/purchases' : `/purchases/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    // Tabs data for MainTabsBar
    const tabsForBar = useMemo(() =>
        tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })) as { id: string; labelKey: string; icon?: any }[],
        [tabs]
    );

    return (
        <div className="space-y-6">
            <MainTabsBar
                tabs={tabsForBar}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {/* ⚡ Keep Visited Mounted Pattern */}
            <div className="relative">
                {tabs.map((tab) => {
                    const TabComponent = tab.component;
                    const isActive = activeTab === tab.id;
                    const wasVisited = visitedTabs.has(tab.id);

                    if (!wasVisited) return null;

                    return (
                        <div
                            key={tab.id}
                            role="tabpanel"
                            aria-labelledby={`tab-${tab.id}`}
                            aria-hidden={!isActive}
                            className={isActive ? 'block' : 'hidden'}
                            style={{
                                contain: isActive ? 'none' : 'strict',
                                contentVisibility: isActive ? 'visible' : 'hidden',
                            }}
                        >
                            <TabComponent />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
