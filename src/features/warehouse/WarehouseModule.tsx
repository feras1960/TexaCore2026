/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Module Main Page
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ PERFORMANCE PATTERN: "Keep Visited Mounted"
 * 
 * Tabs are only mounted the FIRST TIME the user visits them.
 * After that, they stay in the DOM (hidden via CSS) for instant switching.
 * This means:
 *   - Opening /warehouse → only Dashboard mounts (4 queries)
 *   - Switching to Materials → Materials mounts + Dashboard stays
 *   - Switching back to Dashboard → INSTANT (already mounted)
 * 
 * Before this fix: all 11 tabs mounted at once → ~26 queries!
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
    Beaker,
    Repeat,
} from 'lucide-react';

// Direct imports (no lazy loading) for instant switching
import WarehouseListPage from './pages/WarehouseListPage';
import WarehouseSettingsPage from './pages/WarehouseSettingsPage';
import MaterialsPage from './pages/MaterialsPage';
import InventoryPage from './pages/InventoryPage';
import ReservationsPage from './pages/ReservationsPage';
import ReceiptsDeliveriesPage from './pages/ReceiptsDeliveriesPage';
import ReportsPage from './pages/ReportsPage';
import WarehouseDashboard from './pages/WarehouseDashboard';
import LocationManagementPage from './pages/LocationManagementPage';
import StockMovementsPage from './pages/StockMovementsPage';
import StockCountPage from './pages/StockCountPage';
import SamplesPage from './pages/SamplesPage';
import TransfersPage from './pages/TransfersPage';

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
        if (path.includes('/transfers')) return 'transfers';
        if (path.includes('/stockCount')) return 'stockCount';
        if (path.includes('/inventory')) return 'inventory';
        // /warehouse/locations now lives inside the warehouses sub-tab → redirect there
        if (path.includes('/locations')) return 'warehouses';

        // Other tabs
        if (path.includes('/list') || path.includes('/warehouses')) return 'warehouses';
        if (path.includes('/materials')) return 'materials';
        if (path.includes('/rolls')) return 'rolls'; // Alias for materials if needed
        if (path.includes('/reservations')) return 'reservations';
        if (path.includes('/receiptsDeliveries')) return 'receiptsDeliveries';
        if (path.includes('/reports')) return 'reports';
        if (path.includes('/settings')) return 'settings';
        if (path.includes('/samples')) return 'samples';

        return 'dashboard';
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);

    // ⚡ PERFORMANCE: Track which tabs have been visited
    // Only visited tabs get mounted — prevents ~26 queries on initial load
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
            id: 'receiptsDeliveries',
            labelKey: 'warehouse.tabs.receiptsDeliveries',
            icon: Truck,
            component: ReceiptsDeliveriesPage,
        },
        {
            id: 'stockMovements',
            labelKey: 'warehouse.tabs.stockMovements',
            icon: ArrowLeftRight,
            component: StockMovementsPage,
        },
        {
            id: 'transfers',
            labelKey: 'warehouse.tabs.transfers',
            icon: Repeat,
            component: TransfersPage,
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
            // Mark as visited so it mounts
            setVisitedTabs(prev => {
                if (prev.has(tabId)) return prev;
                return new Set(prev).add(tabId);
            });
            // Navigate to the correct URL so refresh preserves state
            const path = tabId === 'dashboard' ? '/warehouse' : `/warehouse/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    // Tabs data for MainTabsBar (without component property)
    const tabsForBar = useMemo(() =>
        tabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })) as { id: string; labelKey: string; icon?: any }[],
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
        ⚡ PERFORMANCE: Keep Visited Mounted Pattern
        
        Only tabs that have been visited at least once are rendered.
        After first visit, they stay in DOM (hidden via CSS) for instant switching.
        This prevents ~26 queries from firing on initial page load.
      */}
            <div className="relative">
                {tabs.map((tab) => {
                    const TabComponent = tab.component;
                    const isActive = activeTab === tab.id;
                    const wasVisited = visitedTabs.has(tab.id);

                    // Only mount the component after the tab has been visited
                    if (!wasVisited) return null;

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
