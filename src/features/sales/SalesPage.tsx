/**
 * ════════════════════════════════════════════════════════════════
 * 🛒 Sales Module Main Page
 * ════════════════════════════════════════════════════════════════
 *
 * ⚡ PERFORMANCE PATTERN: "Eager Preload + Keep Visited Mounted"
 *
 * - Tab bar renders instantly (no blocking)
 * - Active tab component is rendered immediately (direct import)
 * - Other tabs are preloaded in background after initial render
 * - Once visited, tabs stay in DOM for instant switching (no flicker)
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
    BarChart3,
    Settings,
} from 'lucide-react';

// Direct imports — ensures components are available instantly from cache
import SalesDashboard from './pages/SalesDashboard';
import CustomersList from './pages/CustomersList';
import SalesCycleList from './pages/SalesCycleList';
import SalesPaymentsList from './pages/SalesPaymentsList';
import SalesReports from './pages/SalesReportsPage';
import SalesSettings from './pages/SalesWorkflowSettings';

// Tab configuration type
interface TabConfig {
    id: string;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
}

export default function SalesPage() {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = useCallback(() => {
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
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);

    // ⚡ PERFORMANCE: Track which tabs have been visited
    // Only visited tabs get mounted — prevents unnecessary queries
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
            labelKey: 'sales.dashboard',
            icon: LayoutDashboard,
            component: SalesDashboard,
        },
        {
            id: 'customers',
            labelKey: 'sales.customers',
            icon: Users,
            component: CustomersList,
        },
        {
            id: 'cycle',
            labelKey: 'sales.cycle',
            icon: ShoppingCart,
            component: SalesCycleList,
        },
        {
            id: 'payments',
            labelKey: 'sales.payments',
            icon: CreditCard,
            component: SalesPaymentsList,
        },
        {
            id: 'reports',
            labelKey: 'sales.reports',
            icon: BarChart3,
            component: SalesReports,
        },
        {
            id: 'settings',
            labelKey: 'sales.settings',
            icon: Settings,
            component: SalesSettings,
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
            const path = tabId === 'dashboard' ? '/sales' : `/sales/${tabId}`;
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
