/**
 * ════════════════════════════════════════════════════════════════
 * 👤 UserProfilePage — صفحة الملف الشخصي والإعدادات
 * ════════════════════════════════════════════════════════════════
 * 
 * Unified profile page with 5 tabs:
 * - Personal Info (المعلومات الشخصية)
 * - Security (الأمان)
 * - Notifications (الإشعارات)
 * - Preferences (التفضيلات)
 * - Account (الحساب)
 * 
 * Uses same tab pattern as SystemConfigPage for consistency.
 * 
 * @module features/profile
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    User, Shield, Bell, Settings, FileText,
    type LucideIcon
} from 'lucide-react';

// Lazy tabs
const PersonalInfoTab = React.lazy(() => import('./tabs/PersonalInfoTab'));
const SecurityTab = React.lazy(() => import('./tabs/SecurityTab'));
const NotificationsTab = React.lazy(() => import('./tabs/NotificationsTab'));
const PreferencesTab = React.lazy(() => import('./tabs/PreferencesTab'));
const AccountTab = React.lazy(() => import('./tabs/AccountTab'));

// ─── Tab Configuration ──────────────────────────────────────────────────

interface ProfileTab {
    id: string;
    labelKey: string;
    labelAr: string;
    labelEn: string;
    icon: LucideIcon;
    component: React.ComponentType;
}

const PROFILE_TABS: ProfileTab[] = [
    {
        id: 'personal',
        labelKey: 'profile.tabs.personal',
        labelAr: 'المعلومات الشخصية',
        labelEn: 'Personal Info',
        icon: User,
        component: PersonalInfoTab,
    },
    {
        id: 'security',
        labelKey: 'profile.tabs.security',
        labelAr: 'الأمان',
        labelEn: 'Security',
        icon: Shield,
        component: SecurityTab,
    },
    {
        id: 'notifications',
        labelKey: 'profile.tabs.notifications',
        labelAr: 'الإشعارات',
        labelEn: 'Notifications',
        icon: Bell,
        component: NotificationsTab,
    },
    {
        id: 'preferences',
        labelKey: 'profile.tabs.preferences',
        labelAr: 'التفضيلات',
        labelEn: 'Preferences',
        icon: Settings,
        component: PreferencesTab,
    },
    {
        id: 'account',
        labelKey: 'profile.tabs.account',
        labelAr: 'الحساب',
        labelEn: 'Account',
        icon: FileText,
        component: AccountTab,
    },
];

// ─── Main Component ─────────────────────────────────────────────────────

export default function UserProfilePage() {
    const { language, direction } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const isAr = language === 'ar';

    // ─── Active tab from URL ────────────────────────────────────
    const getActiveTab = useCallback(() => {
        const path = location.pathname;
        if (path.startsWith('/profile')) {
            const segment = path.replace('/profile', '').replace(/^\//, '');
            if (segment && PROFILE_TABS.some(t => t.id === segment)) {
                return segment;
            }
        }
        return 'personal';
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);

    // ⚡ Keep Visited Mounted pattern
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getActiveTab()]));

    useEffect(() => {
        const newTab = getActiveTab();
        setActiveTab(newTab);
        setVisitedTabs(prev => {
            if (prev.has(newTab)) return prev;
            return new Set(prev).add(newTab);
        });
    }, [getActiveTab]);

    const tabsForBar = useMemo(() =>
        PROFILE_TABS.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })),
        []
    );

    const handleTabChange = useCallback((tabId: string) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            setVisitedTabs(prev => {
                if (prev.has(tabId)) return prev;
                return new Set(prev).add(tabId);
            });
            const path = tabId === 'personal'
                ? '/profile'
                : `/profile/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* ── Page Header ─────────────────────────────────── */}
            <div className="flex items-center gap-4 px-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-tajawal">
                        {isAr ? 'الملف الشخصي' : 'My Profile'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                        {isAr
                            ? 'إدارة حسابك الشخصي وإعدادات الأمان والتفضيلات'
                            : 'Manage your personal account, security settings, and preferences'}
                    </p>
                </div>
            </div>

            {/* ── Tabs Bar ─────────────────────────────────────── */}
            <MainTabsBar
                tabs={tabsForBar}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {/* ── Tab Content ──────────────────────────────────── */}
            <div className="relative">
                <React.Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                }>
                    {PROFILE_TABS.map((tab) => {
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
                </React.Suspense>
            </div>
        </motion.div>
    );
}
