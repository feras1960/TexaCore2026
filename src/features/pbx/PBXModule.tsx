import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    LayoutDashboard,
    Phone,
    HeadphonesIcon,
    Settings,
    Mic,
    Network,
    Route,
    History,
    Globe,
    PhoneForwarded,
    PhoneOutgoing
} from 'lucide-react';

// Direct imports — ensures components are available instantly from cache
import PBXDashboardTab from './pages/PBXDashboardTab';
import ExtensionsPage from './pages/ExtensionsPage';
import RingGroupsPage from './pages/RingGroupsPage';
import IVRMenusPage from './pages/IVRMenusPage';
import TrunksPage from './pages/TrunksPage';
import CallRoutingPage from './pages/CallRoutingPage';
import CallLogsPage from './pages/CallLogsPage';
import PBXSettingsTab from './pages/PBXSettingsTab';
import WebCallbacksPage from './pages/WebCallbacksPage';
import CallbackRequestsPage from './pages/CallbackRequestsPage';
import WebRTCWidgetsPage from './pages/WebRTCWidgetsPage';

// Tab configuration type
interface TabConfig {
    id: string;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
}

export default function PBXModule() {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = useCallback(() => {
        const path = location.pathname;
        if (path.includes('/pbx')) {
            if (path.includes('/extensions')) return 'extensions';
            if (path.includes('/ring-groups')) return 'ring-groups';
            if (path.includes('/ivr')) return 'ivr';
            if (path.includes('/trunks')) return 'trunks';
            if (path.includes('/routing')) return 'routing';
            if (path.includes('/call-logs')) return 'call-logs';
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
            labelKey: 'pbx.dashboard', // Assuming translation keys, fallback to text if needed
            icon: LayoutDashboard,
            component: PBXDashboardTab,
        },
        {
            id: 'extensions',
            labelKey: 'pbx.extensions',
            icon: Phone,
            component: ExtensionsPage,
        },
        {
            id: 'ring-groups',
            labelKey: 'pbx.ring_groups',
            icon: HeadphonesIcon,
            component: RingGroupsPage,
        },
        {
            id: 'ivr',
            labelKey: 'pbx.ivr',
            icon: Mic,
            component: IVRMenusPage,
        },
        {
            id: 'trunks',
            labelKey: 'pbx.trunks',
            icon: Network,
            component: TrunksPage,
        },
        {
            id: 'routing',
            labelKey: 'pbx.routing',
            icon: Route,
            component: CallRoutingPage,
        },
        {
            id: 'call-logs',
            labelKey: 'pbx.call_logs',
            icon: History,
            component: CallLogsPage,
        },
        {
            id: 'settings',
            labelKey: 'pbx.settings',
            icon: Settings,
            component: PBXSettingsTab,
        },
        {
            id: 'web-callbacks',
            labelKey: 'pbx.web_callbacks',
            icon: Globe,
            component: WebCallbacksPage,
        },
        {
            id: 'callback-requests',
            labelKey: 'pbx.callback_requests',
            icon: PhoneForwarded,
            component: CallbackRequestsPage,
        },
        {
            id: 'webrtc-widgets',
            labelKey: 'pbx.webrtc_widgets',
            icon: PhoneOutgoing,
            component: WebRTCWidgetsPage,
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
            const path = tabId === 'dashboard' ? '/pbx' : `/pbx/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    const tabsForBar = useMemo(() => [
        { id: 'dashboard', labelKey: 'pbx.dashboard', icon: LayoutDashboard },
        { id: 'extensions', labelKey: 'pbx.extensions', icon: Phone },
        { id: 'ring-groups', labelKey: 'pbx.ring_groups', icon: HeadphonesIcon },
        { id: 'ivr', labelKey: 'pbx.ivr', icon: Mic },
        { id: 'trunks', labelKey: 'pbx.trunks', icon: Network },
        { id: 'routing', labelKey: 'pbx.routing', icon: Route },
        { id: 'call-logs', labelKey: 'pbx.call_logs', icon: History },
        { id: 'web-callbacks', labelKey: 'pbx.web_callbacks', icon: Globe },
        { id: 'callback-requests', labelKey: 'pbx.callback_requests', icon: PhoneForwarded },
        { id: 'webrtc-widgets', labelKey: 'pbx.webrtc_widgets', icon: PhoneOutgoing },
        { id: 'settings', labelKey: 'pbx.settings', icon: Settings },
    ], []);

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
