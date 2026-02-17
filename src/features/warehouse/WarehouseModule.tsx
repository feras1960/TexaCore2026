/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Module Main Page
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ PERFORMANCE PATTERN: "Keep All Mounted"
 * 
 * Instead of lazy loading and unmounting tabs on switch, we:
 * 1. Render ALL tab content once on mount
 * 2. Use CSS (display: none) to hide inactive tabs
 * 3. Result: INSTANT tab switching with ZERO flicker
 * 
 * This matches the Accounting module's smooth experience.
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Warehouse,
    Package,
    Boxes,
    Calendar,
    Truck,
    BarChart3,
    Settings,
    Layers,
    LayoutDashboard,
    ArrowLeftRight,
    ClipboardCheck,
    Beaker
} from 'lucide-react';

// Direct imports (no lazy loading) for instant switching
import WarehouseListPage from './pages/WarehouseListPage';
import WarehouseSettingsPage from './pages/WarehouseSettingsPage';
import MaterialsPage from './pages/MaterialsPage';
import InventoryPage from './pages/InventoryPage';
import ReservationsPage from './pages/ReservationsPage';
import DeliveryPage from './pages/DeliveryPage';
import ReportsPage from './pages/ReportsPage';
import WarehouseDashboard from './pages/WarehouseDashboard';
import LocationManagementPage from './pages/LocationManagementPage';
import StockMovementsPage from './pages/StockMovementsPage';
import StockCountPage from './pages/StockCountPage';
import SamplesPage from './pages/SamplesPage';

// Tab configuration type
interface TabConfig {
    id: string;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
}

export default function WarehouseModule() {
    const { t: _t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = useCallback(() => {
        const path = location.pathname;

        // Dashboard check
        if (path.endsWith('/warehouse') || path.endsWith('/warehouse/')) return 'dashboard';

        // Precise matching first
        if (path.includes('/stockMovements')) return 'stockMovements';
        if (path.includes('/stockCount')) return 'stockCount';
        if (path.includes('/inventory')) return 'inventory';

        // Other tabs
        if (path.includes('/list') || path.includes('/warehouses')) return 'warehouses';
        if (path.includes('/materials')) return 'materials';
        if (path.includes('/rolls')) return 'rolls'; // Alias for materials if needed
        if (path.includes('/reservations')) return 'reservations';
        if (path.includes('/delivery')) return 'delivery';
        if (path.includes('/reports')) return 'reports';
        if (path.includes('/settings')) return 'settings';
        if (path.includes('/samples')) return 'samples';

        return 'dashboard';
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);

    // Update active tab when location changes
    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [getActiveTab]);

    // Tab configuration - memoized to prevent re-renders
    // V8 Structure: 9 main tabs + Settings + Samples (admin)
    const tabs: TabConfig[] = useMemo(() => [
        {
            id: 'dashboard',
            labelKey: 'warehouse.tabs.dashboard',
            icon: LayoutDashboard,
            component: WarehouseDashboard,
        },
        {
            id: 'warehouses',
            labelKey: 'warehouse.tabs.warehousesAndLocations',
            icon: Warehouse,
            component: WarehouseListPage,
        },
        {
            id: 'materials',
            labelKey: 'warehouse.tabs.materials',
            icon: Layers,
            component: MaterialsPage,
        },
        {
            id: 'inventory',
            labelKey: 'warehouse.tabs.inventory',
            icon: Boxes,
            component: InventoryPage,
        },
        {
            id: 'stockMovements',
            labelKey: 'warehouse.tabs.stockMovements',
            icon: ArrowLeftRight,
            component: StockMovementsPage,
        },
        {
            id: 'stockCount',
            labelKey: 'warehouse.tabs.stockCount',
            icon: ClipboardCheck,
            component: StockCountPage,
        },
        {
            id: 'reservations',
            labelKey: 'warehouse.tabs.reservations',
            icon: Calendar,
            component: ReservationsPage,
        },
        {
            id: 'delivery',
            labelKey: 'warehouse.tabs.delivery',
            icon: Truck,
            component: DeliveryPage,
        },
        {
            id: 'reports',
            labelKey: 'warehouse.tabs.reports',
            icon: BarChart3,
            component: ReportsPage,
        },
        {
            id: 'samples',
            labelKey: 'warehouse.tabs.samples',
            icon: Beaker,
            component: SamplesPage,
        },
        {
            id: 'settings',
            labelKey: 'warehouse.tabs.settings',
            icon: Settings,
            component: WarehouseSettingsPage,
        },
    ], []);

    // Handle tab change - update state AND URL
    const handleTabChange = useCallback((tabId: string) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            // Navigate to the correct URL so refresh preserves state
            const path = tabId === 'dashboard' ? '/warehouse' : `/warehouse/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    // Tabs data for MainTabsBar (without component property)
    const tabsForBar = useMemo(() =>
        tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })),
        [tabs]
    );

    return (
        <div className="space-y-6">
            {/* Tabs Bar */}
            <MainTabsBar
                tabs={tabsForBar}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {/* 
        ⚡ PERFORMANCE: Keep All Mounted Pattern
        
        All tab panels are rendered once and kept in DOM.
        We use CSS to control visibility instead of conditional rendering.
        This eliminates the flicker caused by mounting/unmounting.
      */}
            <div className="relative">
                {tabs.map((tab) => {
                    const TabComponent = tab.component;
                    const isActive = activeTab === tab.id;

                    return (
                        <div
                            key={tab.id}
                            role="tabpanel"
                            aria-labelledby={`tab-${tab.id}`}
                            aria-hidden={!isActive}
                            className={isActive ? 'block' : 'hidden'}
                            // Performance: prevent any re-renders when hidden
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
