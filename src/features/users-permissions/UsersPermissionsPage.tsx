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
    ClipboardList,
    type LucideIcon
} from 'lucide-react';

// ─── Tab Components ─────────────────────────────────────────────────────
// Direct imports (no lazy loading) for instant tab switching

import UserGroupsSection from './components/UserGroupsSection';
import UsersManagementTab from '@/features/settings/components/UsersManagementTab';
import BranchesManagementTab from '@/features/settings/components/BranchesManagementTab';
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

    // ⚡ PERFORMANCE: Only mount tabs when first visited
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getActiveTab()]));

    // Sync tab with URL changes
    useEffect(() => {
        const newTab = getActiveTab();
        setActiveTab(newTab);
        setVisitedTabs(prev => {
            if (prev.has(newTab)) return prev;
            return new Set(prev).add(newTab);
        });
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
            setVisitedTabs(prev => {
                if (prev.has(tabId)) return prev;
                return new Set(prev).add(tabId);
            });
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
            {/* ── Page Header — Glass Gradient (Navy → Teal) ──── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-teal-800 to-erp-navy p-6 rounded-2xl shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-teal-400/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-teal-400/10 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <ShieldCheck className="w-6 h-6 text-teal-300" />
                            </div>
                            <h1 className="text-2xl font-bold text-white font-cairo">
                                {isAr ? 'المستخدمون والصلاحيات' : 'Users & Permissions'}
                            </h1>
                        </div>
                        <p className="text-sm text-teal-200/80 font-tajawal ps-12">
                            {isAr
                                ? 'إدارة مجموعات المستخدمين، المستخدمين، الفروع، والصلاحيات'
                                : 'Manage user groups, users, branches, and permissions'}
                        </p>
                    </div>
                    {rbacLoading && (
                        <Loader2 className="w-5 h-5 animate-spin text-teal-300" />
                    )}
                </div>
            </div>

            {/* ── Tabs Bar (MainTabsBar — underline variant) ───── */}
            <MainTabsBar
                tabs={tabsForBar}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
            />

            {/* 
              ⚡ PERFORMANCE: Keep Visited Mounted Pattern
              Only tabs visited at least once are rendered.
            */}
            <div className="relative">
                {visibleTabs.map((tab) => {
                    const TabComponent = tab.component;
                    const isActive = activeTab === tab.id;
                    const wasVisited = visitedTabs.has(tab.id);

                    if (!wasVisited) return null;

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
