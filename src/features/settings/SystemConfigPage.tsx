/**
 * ════════════════════════════════════════════════════════════════
 * ⚙️ SystemConfigPage - مركز الإعدادات الموحد
 * ════════════════════════════════════════════════════════════════
 * 
 * Unified System Settings Hub that consolidates:
 * - Company Profile (بيانات المنشأة)
 * - Tax System (الضرائب والأنظمة)
 * - Accounting Settings (المحاسبة)
 * - Warehouse Settings (المستودعات)
 * - Sales Settings (المبيعات)
 * - Purchases Settings (المشتريات)
 * - Roles & Permissions (الأدوار والصلاحيات)
 * - Users Management (إدارة المستخدمين)
 * - Visibility Rules (قواعد الإخفاء)
 * - Modules Management (الموديولات)
 * 
 * ⚡ PERFORMANCE: Uses "Keep All Mounted" pattern
 * Same pattern as Accounting, Warehouse, and Sales modules.
 * 
 * 📐 UI: Uses MainTabsBar with "underline" variant
 * Same tab pattern as all other modules for visual consistency.
 * 
 * @module features/settings
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';

import { useLanguage } from '@/app/providers/LanguageProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { Loader2 } from 'lucide-react';
import {
    Settings, Building2,
    Globe, Bell,
    Calculator, Package, ShoppingCart,
    Link2, Printer,
    type LucideIcon
} from 'lucide-react';

// Tab Components
import CompanyProfileTab from './components/CompanyProfileTab';
import TaxSystemTab from './components/TaxSystemTab';

// Module settings
import AccountingSettings from '@/features/accounting/AccountingSettings';
import WarehouseSettingsPage from '@/features/warehouse/pages/WarehouseSettingsPage';
import SalesWorkflowSettings from '@/features/sales/pages/SalesWorkflowSettings';
import IntegrationsTab from './components/IntegrationsTab';
import NotificationsSettingsTab from './components/NotificationsSettingsTab';
import PrintSettingsTab from './components/PrintSettingsTab';

// ─── Tab Configuration ──────────────────────────────────────────────────

interface ConfigTab {
    id: string;
    labelKey: string;
    labelAr: string;
    labelEn: string;
    icon: LucideIcon;
    component: React.ComponentType;
    requiresRole: string[];
}

const CONFIG_TABS: ConfigTab[] = [
    // ─ Company & Tax ─────────────────────────────
    {
        id: 'company',
        labelKey: 'settings.tabs.company',
        labelAr: 'بيانات المنشأة',
        labelEn: 'Company Profile',
        icon: Building2,
        component: CompanyProfileTab,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'tax',
        labelKey: 'settings.tabs.tax',
        labelAr: 'الضرائب والأنظمة',
        labelEn: 'Tax System',
        icon: Globe,
        component: TaxSystemTab,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    // ─ Module Settings ───────────────────────────
    {
        id: 'accounting',
        labelKey: 'settings.tabs.accounting',
        labelAr: 'المحاسبة',
        labelEn: 'Accounting',
        icon: Calculator,
        component: AccountingSettings,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'warehouse',
        labelKey: 'settings.tabs.warehouse',
        labelAr: 'المستودعات',
        labelEn: 'Warehouse',
        icon: Package,
        component: WarehouseSettingsPage,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin', 'branch_manager'],
    },
    {
        id: 'sales',
        labelKey: 'settings.tabs.sales',
        labelAr: 'المبيعات',
        labelEn: 'Sales',
        icon: ShoppingCart,
        component: SalesWorkflowSettings,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'integrations',
        labelKey: 'settings.tabs.integrations',
        labelAr: 'التكاملات',
        labelEn: 'Integrations',
        icon: Link2,
        component: IntegrationsTab,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'print',
        labelKey: 'settings.tabs.print',
        labelAr: 'الطباعة',
        labelEn: 'Printing',
        icon: Printer,
        component: PrintSettingsTab,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'notifications',
        labelKey: 'settings.tabs.notifications',
        labelAr: 'الإشعارات',
        labelEn: 'Notifications',
        icon: Bell,
        component: NotificationsSettingsTab,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
];

// ─── Main Component ─────────────────────────────────────────────────────

export default function SystemConfigPage() {
    const { language, direction } = useLanguage();
    const { hasAnyRole, loading: rbacLoading } = useRBAC();
    const location = useLocation();
    const navigate = useNavigate();
    const isAr = language === 'ar';

    // ─── Active tab from URL ────────────────────────────────────
    const getActiveTab = useCallback(() => {
        const path = location.pathname;
        if (path.startsWith('/system-config')) {
            // Match /system-config/company, /system-config/tax, etc.
            const segment = path.replace('/system-config', '').replace(/^\//, '');
            if (segment && CONFIG_TABS.some(t => t.id === segment)) {
                return segment;
            }
        }
        return 'company'; // default tab
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
        if (rbacLoading) return CONFIG_TABS;
        const filtered = CONFIG_TABS.filter(tab => hasAnyRole(tab.requiresRole));
        return filtered.length > 0 ? filtered : CONFIG_TABS.slice(0, 2);
    }, [rbacLoading, hasAnyRole]);

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
            const path = tabId === 'company'
                ? '/system-config'
                : `/system-config/${tabId}`;
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-erp-navy to-erp-teal flex items-center justify-center shadow-lg">
                    <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-tajawal">
                        {isAr ? 'إعدادات النظام' : 'System Settings'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                        {isAr
                            ? 'بيانات المنشأة، الضرائب، المحاسبة، المستودعات، والصلاحيات'
                            : 'Company profile, taxes, accounting, warehouse, and permissions'}
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
