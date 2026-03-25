import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import SectionLoader from '@/components/common/SectionLoader';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    LayoutDashboard,
    Users,
    TrendingUp,
    CheckSquare,
    Megaphone,
    Activity,
    PhoneCall,
    Settings
} from 'lucide-react';

// Lazy load tabs
const CRMDashboard = lazy(() => import('./tabs/CRMDashboard'));
const ContactsTable = lazy(() => import('./tabs/ContactsTable'));
const PipelineBoard = lazy(() => import('./tabs/PipelineBoard'));
const TasksTable = lazy(() => import('./tabs/TasksTable'));
const CampaignsList = lazy(() => import('./tabs/CampaignsList'));
const ActivityFeed = lazy(() => import('./tabs/ActivityFeed'));
const CallCenterDashboard = lazy(() => import('./tabs/CallCenter/CallCenterDashboard'));
const CRMSettings = lazy(() => import('./tabs/CRMSettings'));

const TabContentLoader = () => (
    <SectionLoader variant="dashboard" showTabs={false} />
);

export default function CRM() {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from route
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/crm/contacts')) return 'contacts';
        if (path.includes('/crm/pipeline')) return 'pipeline';
        if (path.includes('/crm/tasks')) return 'tasks';
        if (path.includes('/crm/campaigns')) return 'campaigns';
        if (path.includes('/crm/activity')) return 'activity';
        if (path.includes('/crm/communications')) return 'communications';
        if (path.includes('/crm/settings')) return 'settings';
        return 'dashboard';
    };

    const [activeTab, setActiveTab] = useState(getActiveTab());

    // Update active tab when location changes
    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [location.pathname]);

    const tabs = [
        { id: 'dashboard', labelKey: 'crm.dashboard', icon: LayoutDashboard },
        { id: 'contacts', labelKey: 'crm.contacts', icon: Users },
        { id: 'pipeline', labelKey: 'crm.pipeline', icon: TrendingUp },
        { id: 'tasks', labelKey: 'crm.tasks', icon: CheckSquare },
        { id: 'campaigns', labelKey: 'crm.campaigns', icon: Megaphone },
        { id: 'activity', labelKey: 'crm.activity', icon: Activity },
        { id: 'communications', labelKey: 'crm.communications', icon: PhoneCall },
        { id: 'settings', labelKey: 'crm.settings', icon: Settings },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (tabId === 'dashboard') navigate('/crm');
        else navigate(`/crm/${tabId}`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <CRMDashboard />;
            case 'contacts': return <ContactsTable />;
            case 'pipeline': return <PipelineBoard />;
            case 'tasks': return <TasksTable />;
            case 'campaigns': return <CampaignsList />;
            case 'activity': return <ActivityFeed />;
            case 'communications': return <CallCenterDashboard />;
            case 'settings': return <CRMSettings />;
            default: return <CRMDashboard />;
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
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
