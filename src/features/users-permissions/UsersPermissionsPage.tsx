/**
 * ════════════════════════════════════════════════════════════════
 * 🛡️ UsersPermissionsPage - مركز المستخدمين والصلاحيات
 * ════════════════════════════════════════════════════════════════
 * 
 * Unified Users & Permissions Hub (Company-Level):
 * - User Groups / Roles (مجموعات المستخدمين / الأدوار)
 * - Users Management (المستخدمين)
 * - Branches Management (الفروع)
 * - Audit Log (سجل التدقيق)
 * 
 * ⚡ PERFORMANCE: Uses "Keep All Mounted" pattern
 * 📐 UI: Uses MainTabsBar with "underline" variant
 * 
 * @module features/users-permissions
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { Loader2 } from 'lucide-react';
import {
    ShieldCheck, Shield, Users, GitBranch,
    ClipboardList, Truck,
    type LucideIcon
} from 'lucide-react';

// ─── Tab Components ─────────────────────────────────────────────────────
// Direct imports (no lazy loading) for instant tab switching

import UserGroupsSection from './components/UserGroupsSection';
import UsersManagementTab from '@/features/settings/components/UsersManagementTab';
import BranchesManagementTab from '@/features/settings/components/BranchesManagementTab';
import DriversManagementTab from './components/DriversManagementTab';
import AuditLogTab from './components/AuditLogTab';

// ─── Tab Configuration ──────────────────────────────────────────────────

interface PermissionsTab {
    id: string;
    labelKey: string;
    labelAr: string;
    labelEn: string;
    icon: LucideIcon;
    component: React.ComponentType;
    requiresRole: string[];
}

const PERMISSIONS_TABS: PermissionsTab[] = [
    {
        id: 'roles',
        labelKey: 'usersPermissions.tabs.roles',
        labelAr: 'مجموعات المستخدمين',
        labelEn: 'User Groups',
        icon: Shield,
        component: UserGroupsSection,
        requiresRole: ['tenant_owner', 'company_admin', 'company_owner'],
    },
    {
        id: 'users',
        labelKey: 'usersPermissions.tabs.users',
        labelAr: 'المستخدمين',
        labelEn: 'Users',
        icon: Users,
        component: UsersManagementTab,
        requiresRole: ['tenant_owner', 'company_admin', 'company_owner'],
    },
    {
        id: 'branches',
        labelKey: 'usersPermissions.tabs.branches',
        labelAr: 'الفروع',
        labelEn: 'Branches',
        icon: GitBranch,
        component: BranchesManagementTab,
        requiresRole: ['tenant_owner', 'company_admin', 'company_owner'],
    },
    {
        id: 'drivers',
        labelKey: 'usersPermissions.tabs.drivers',
        labelAr: 'السائقون',
        labelEn: 'Drivers',
        icon: Truck,
        component: DriversManagementTab,
        requiresRole: ['tenant_owner', 'company_admin', 'company_owner'],
    },
    {
        id: 'audit-log',
        labelKey: 'usersPermissions.tabs.auditLog',
        labelAr: 'سجل التدقيق',
        labelEn: 'Audit Log',
        icon: ClipboardList,
        component: AuditLogTab,
        requiresRole: ['tenant_owner', 'company_admin', 'company_owner'],
    },
];

// ─── Main Component ─────────────────────────────────────────────────────

export default function UsersPermissionsPage() {
    const { language, t } = useLanguage();
    const { hasAnyRole, isAdmin, loading: rbacLoading } = useRBAC();
    const location = useLocation();
    const navigate = useNavigate();
    const isAr = language === 'ar';

    // ─── Active tab from URL ────────────────────────────────────
    const getActiveTab = useCallback(() => {
        const path = location.pathname;
        if (path.startsWith('/users-permissions')) {
            const segment = path.replace('/users-permissions', '').replace(/^\//, '');
            if (segment && PERMISSIONS_TABS.some(t => t.id === segment)) {
                return segment;
            }
        }
        return 'roles'; // default tab
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(getActiveTab);

    // Sync tab with URL changes
    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [getActiveTab]);

    // ─── Filter tabs by role ─────────────────────────────────────
    const visibleTabs = useMemo(() => {
        if (rbacLoading) return PERMISSIONS_TABS;
        // Admin (tenant_owner / company_admin / company_owner) sees ALL tabs
        if (isAdmin()) return PERMISSIONS_TABS;
        const filtered = PERMISSIONS_TABS.filter(tab => hasAnyRole(tab.requiresRole));
        return filtered.length > 0 ? filtered : PERMISSIONS_TABS.slice(0, 2);
    }, [rbacLoading, hasAnyRole, isAdmin]);

    // MainTabsBar needs only { id, labelKey, icon }
    const tabsForBar = useMemo(() =>
        visibleTabs.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })),
        [visibleTabs]
    );

    // ─── Handle tab switch ───────────────────────────────────────
    const handleTabChange = useCallback((tabId: string) => {
        if (tabId !== activeTab) {
            setActiveTab(tabId);
            const path = tabId === 'roles'
                ? '/users-permissions'
                : `/users-permissions/${tabId}`;
            navigate(path, { replace: true });
        }
    }, [activeTab, navigate]);

    // ─── Render ──────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* ── Page Header ───────────────────────────────────── */}
            <div className="flex items-center gap-4 px-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-tajawal">
                        {isAr ? 'المستخدمون والصلاحيات' : 'Users & Permissions'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                        {isAr
                            ? 'إدارة مجموعات المستخدمين، المستخدمين، الفروع، والصلاحيات'
                            : 'Manage user groups, users, branches, and permissions'}
                    </p>
                </div>
                {rbacLoading && (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 ms-auto" />
                )}
            </div>

            {/* ── Tabs Bar (MainTabsBar — underline variant) ───── */}
            <MainTabsBar
                tabs={tabsForBar}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {/* 
              ⚡ PERFORMANCE: Keep All Mounted Pattern
              All tab panels are rendered once and kept in DOM.
              CSS visibility controls which panel is shown.
            */}
            <div className="relative">
                {visibleTabs.map((tab) => {
                    const TabComponent = tab.component;
                    const isActive = activeTab === tab.id;

                    return (
                        <div
                            key={tab.id}
                            id={`panel-${tab.id}`}
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
        </motion.div>
    );
}
