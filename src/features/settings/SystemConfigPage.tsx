/**
 * SystemConfigPage - صفحة إعدادات النظام
 * System Configuration Page
 * 
 * @module features/settings
 * @description Main settings page with tabs for roles, users, and permissions management
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { Loader2 } from 'lucide-react';
import {
    Settings, Shield, Users, Building2,
    Key, Eye, Layers, Wallet, Warehouse
} from 'lucide-react';

// Import tab components
import RolesManagementTab from './components/RolesManagementTab';
import UsersManagementTab from './components/UsersManagementTab';
import VisibilityRulesTab from './components/VisibilityRulesTab';
// Import resource permissions from accounting (will be unified here)
import UserPermissionsTab from '@/features/accounting/components/UserPermissionsTab';

// Tab configuration
const CONFIG_TABS = [
    {
        id: 'roles',
        labelKey: 'settings.tabs.roles',
        labelAr: 'إدارة الأدوار',
        labelEn: 'Roles Management',
        icon: Shield,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'users',
        labelKey: 'settings.tabs.users',
        labelAr: 'إدارة المستخدمين',
        labelEn: 'Users Management',
        icon: Users,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'resources',
        labelKey: 'settings.tabs.resources',
        labelAr: 'صلاحيات الموارد',
        labelEn: 'Resource Permissions',
        icon: Wallet,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'visibility',
        labelKey: 'settings.tabs.visibility',
        labelAr: 'قواعد الإخفاء',
        labelEn: 'Visibility Rules',
        icon: Eye,
        requiresRole: ['super_admin', 'tenant_owner'],
    },
    {
        id: 'modules',
        labelKey: 'settings.tabs.modules',
        labelAr: 'الموديولات',
        labelEn: 'Modules',
        icon: Layers,
        requiresRole: ['super_admin', 'tenant_owner'],
    },
];

export default function SystemConfigPage() {
    const { t, language, direction } = useLanguage();
    const { hasAnyRole, loading: rbacLoading } = useRBAC();
    const [activeTab, setActiveTab] = useState('roles');

    // Filter tabs based on user role - show all tabs while loading
    const visibleTabs = useMemo(() => {
        if (rbacLoading) {
            // Show all tabs while loading
            return CONFIG_TABS;
        }
        // Filter based on roles after loading
        const filtered = CONFIG_TABS.filter(tab => hasAnyRole(tab.requiresRole));
        // Fallback: if no tabs visible (user has access to the page), show roles tab
        return filtered.length > 0 ? filtered : CONFIG_TABS.slice(0, 1);
    }, [rbacLoading, hasAnyRole]);

    // Get tab label based on language
    const getTabLabel = (tab: typeof CONFIG_TABS[0]) => {
        return language === 'ar' ? tab.labelAr : tab.labelEn;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 space-y-6"
        >
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-erp-navy to-erp-teal flex items-center justify-center">
                    <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-tajawal">
                        {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                        {language === 'ar'
                            ? 'إدارة الأدوار والمستخدمين والصلاحيات'
                            : 'Manage roles, users, and permissions'}
                    </p>
                </div>
                {rbacLoading && (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 ms-auto" />
                )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 gap-2 h-auto p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    {visibleTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center gap-2 py-3 px-4 font-tajawal data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-md rounded-lg transition-all"
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{getTabLabel(tab)}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {/* Roles Tab */}
                <TabsContent value="roles" className="mt-6">
                    <RolesManagementTab />
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="mt-6">
                    <UsersManagementTab />
                </TabsContent>

                {/* Resource Permissions Tab */}
                <TabsContent value="resources" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-tajawal flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-erp-teal" />
                                {language === 'ar' ? 'صلاحيات الموارد' : 'Resource Permissions'}
                            </CardTitle>
                            <CardDescription className="font-tajawal">
                                {language === 'ar'
                                    ? 'تحديد صلاحيات المستخدمين على الصناديق والمستودعات والفروع'
                                    : 'Define user permissions on funds, warehouses, and branches'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserPermissionsTab />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Visibility Rules Tab */}
                <TabsContent value="visibility" className="mt-6">
                    <VisibilityRulesTab />
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-tajawal flex items-center gap-2">
                                <Layers className="w-5 h-5 text-erp-teal" />
                                {language === 'ar' ? 'إدارة الموديولات' : 'Modules Management'}
                            </CardTitle>
                            <CardDescription className="font-tajawal">
                                {language === 'ar'
                                    ? 'تفعيل وإلغاء تفعيل الموديولات للأدوار المختلفة'
                                    : 'Enable and disable modules for different roles'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 dark:text-gray-400 font-tajawal text-center py-8">
                                {language === 'ar' ? 'قريباً...' : 'Coming soon...'}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}


