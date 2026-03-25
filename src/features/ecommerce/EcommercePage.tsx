/**
 * ═══════════════════════════════════════════════════════════════
 *  EcommercePage — المتجر الإلكتروني (Unified Tabs Pattern)
 * ═══════════════════════════════════════════════════════════════
 *  Uses MainTabsBar matching Accounting / Warehouse pattern
 *  8 tabs: Dashboard, Orders, Customers, Products, Pricing,
 *  Shipping, SEO/Marketing, Settings
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    LayoutDashboard, ShoppingCart, Users, Package,
    Tag, Truck, Search, Settings,
} from 'lucide-react';

import EcommerceDashboard from './components/EcommerceDashboard';
import EcommerceOrders from './components/EcommerceOrders';
import EcommerceCustomers from './components/EcommerceCustomers';
import EcommerceProducts from './components/EcommerceProducts';
import EcommercePricing from './components/EcommercePricing';
import EcommerceShipping from './components/EcommerceShipping';
import EcommerceSEO from './components/EcommerceSEO';
import EcommerceSettings from './components/EcommerceSettings';

interface TabConfig {
    id: string;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
}

export default function EcommercePage() {
    const { t: _t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    const getActiveTab = useCallback(() => {
        const path = location.pathname;
        if (path.endsWith('/ecommerce') || path.endsWith('/ecommerce/')) return 'dashboard';
        if (path.includes('/orders')) return 'orders';
        if (path.includes('/customers')) return 'customers';
        if (path.includes('/products')) return 'products';
        if (path.includes('/pricing')) return 'pricing';
        if (path.includes('/shipping')) return 'shipping';
        if (path.includes('/seo')) return 'seo';
        if (path.includes('/settings')) return 'settings';
        return 'dashboard';
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getActiveTab()]));

    useEffect(() => {
        const newTab = getActiveTab();
        setActiveTab(newTab);
        setVisitedTabs(prev => {
            if (prev.has(newTab)) return prev;
            return new Set(prev).add(newTab);
        });
    }, [getActiveTab]);

    const tabs: TabConfig[] = useMemo(() => [
        { id: 'dashboard', labelKey: 'ecommerce.tabs.dashboard', icon: LayoutDashboard, component: EcommerceDashboard },
        { id: 'orders', labelKey: 'ecommerce.tabs.orders', icon: ShoppingCart, component: EcommerceOrders },
        { id: 'customers', labelKey: 'ecommerce.tabs.customers', icon: Users, component: EcommerceCustomers },
        { id: 'products', labelKey: 'ecommerce.tabs.products', icon: Package, component: EcommerceProducts },
        { id: 'pricing', labelKey: 'ecommerce.tabs.pricing', icon: Tag, component: EcommercePricing },
        { id: 'shipping', labelKey: 'ecommerce.tabs.shipping', icon: Truck, component: EcommerceShipping },
        { id: 'seo', labelKey: 'ecommerce.tabs.seo', icon: Search, component: EcommerceSEO },
        { id: 'settings', labelKey: 'ecommerce.tabs.settings', icon: Settings, component: EcommerceSettings },
    ], []);

    const handleTabChange = useCallback((tabId: string) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            setVisitedTabs(prev => {
                if (prev.has(tabId)) return prev;
                return new Set(prev).add(tabId);
            });
            const path = tabId === 'dashboard' ? '/ecommerce' : `/ecommerce/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    const tabsForBar = useMemo(() =>
        tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })) as { id: string; labelKey: string; icon?: any }[],
        [tabs]
    );

    return (
        <div className="space-y-6">
            {/* MainTabsBar — matching Accounting / Warehouse / HR pattern */}
            <MainTabsBar
                tabs={tabsForBar}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {/* Keep Visited Mounted Pattern */}
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
