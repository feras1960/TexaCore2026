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
    Link2, Printer, FileUp,
    FileSpreadsheet, Users, TrendingUp,
    CheckCircle2, XCircle, Clock, Plus,
    X as XIcon, Bot,
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
import AILanguageSettingsTab from './components/AILanguageSettingsTab';
import { ImportWizard } from '@/features/import';
import { useLanguage as useImportLang } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Import Data Tab ─────────────────────────────────────────────────────
function ImportDataTab() {
    const { language } = useImportLang();
    const isAr = language === 'ar';
    const [showWizard, setShowWizard] = React.useState(false);

    const ENTITY_TYPES = [
        {
            type: 'customers', icon: Users, color: 'from-blue-500 to-blue-600',
            labelAr: 'العملاء', labelEn: 'Customers', labelTr: 'Müşteriler', labelRu: 'Клиенты', labelUk: 'Клієнти',
            descAr: 'كود، اسم (5 لغات)، هاتف، إيميل، عنوان، رصيد افتتاحي',
            descEn: 'Code, name (5 langs), phone, email, address, opening balance'
        },
        {
            type: 'suppliers', icon: Users, color: 'from-orange-500 to-orange-600',
            labelAr: 'الموردين', labelEn: 'Suppliers', labelTr: 'Tedarikçiler', labelRu: 'Поставщики', labelUk: 'Постачальники',
            descAr: 'كود، اسم (5 لغات)، هاتف، إيميل، شروط دفع، رصيد',
            descEn: 'Code, name (5 langs), phone, email, payment terms, balance'
        },
        {
            type: 'products', icon: Package, color: 'from-green-500 to-green-600',
            labelAr: 'المنتجات والمواد', labelEn: 'Products & Materials', labelTr: 'Ürünler', labelRu: 'Товары', labelUk: 'Товари',
            descAr: 'كود، اسم (5 لغات)، باركود، سعر بيع، تكلفة، كمية افتتاحية',
            descEn: 'Code, name (5 langs), barcode, sale price, cost, opening qty'
        },
        {
            type: 'journal_entries', icon: FileSpreadsheet, color: 'from-indigo-500 to-indigo-600',
            labelAr: 'القيود المحاسبية', labelEn: 'Journal Entries', labelTr: 'Muhasebe', labelRu: 'Проводки', labelUk: 'Проводки',
            descAr: 'تاريخ، مرجع، رقم حساب، مدين، دائن',
            descEn: 'Date, reference, account code, debit, credit'
        },
        {
            type: 'inventory_movements', icon: TrendingUp, color: 'from-teal-500 to-teal-600',
            labelAr: 'حركات المخزون', labelEn: 'Inventory Movements', labelTr: 'Stok Hareketleri', labelRu: 'Движение запасов', labelUk: 'Рух запасів',
            descAr: 'تاريخ، كود منتج، مستودع، نوع حركة، كمية',
            descEn: 'Date, product code, warehouse, movement type, quantity'
        },
    ];

    const handleDownloadTemplate = React.useCallback(async (entityType: string) => {
        try {
            const { downloadTemplate } = await import('@/features/import/templates/templateGenerator');
            downloadTemplate(entityType, (language || 'ar') as any);
        } catch (err) {
            console.error('Template download error:', err);
        }
    }, [language]);

    const getLabel = (et: typeof ENTITY_TYPES[0]) => {
        switch (language) {
            case 'ar': return et.labelAr;
            case 'tr': return et.labelTr;
            case 'ru': return et.labelRu;
            case 'uk': return et.labelUk;
            default: return et.labelEn;
        }
    };

    return (
        <div className="space-y-6 py-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {isAr ? 'استيراد البيانات' : 'Data Import'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isAr ? 'حمّل القالب الجاهز، عبّئ بياناتك، ثم ارفعه للاستيراد' : 'Download template, fill your data, then upload to import'}
                    </p>
                </div>
                <Button
                    onClick={() => setShowWizard(true)}
                    className="gap-2 bg-gradient-to-r from-erp-navy to-erp-teal hover:opacity-90 text-white shadow-lg"
                    size="lg"
                >
                    <Plus className="w-4 h-4" />
                    {isAr ? 'رفع ملف واستيراد' : 'Upload & Import'}
                </Button>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-900/10">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-indigo-600">①</span>
                    </div>
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {isAr ? 'حمّل القالب' : 'Download Template'}
                    </span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-green-50/70 dark:bg-green-900/10">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-green-600">②</span>
                    </div>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        {isAr ? 'عبّئ البيانات بكل اللغات' : 'Fill data in all languages'}
                    </span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-blue-50/70 dark:bg-blue-900/10">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-blue-600">③</span>
                    </div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {isAr ? 'ارفع الملف واستورد' : 'Upload & Import'}
                    </span>
                </div>
            </div>

            {/* Templates */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                        {isAr ? 'القوالب الجاهزة' : 'Ready Templates'}
                        <Badge variant="outline" className="text-[10px] ms-auto">
                            🇸🇦 🇬🇧 🇹🇷 🇷🇺 🇺🇦 {isAr ? 'كل اللغات بملف واحد' : 'All languages in one file'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {ENTITY_TYPES.map(et => {
                        const Icon = et.icon;
                        return (
                            <div
                                key={et.type}
                                className="flex items-center gap-4 p-3 rounded-xl border bg-white dark:bg-slate-800/50 hover:shadow-sm transition-shadow"
                            >
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${et.color} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{getLabel(et)}</div>
                                    <div className="text-[11px] text-gray-400 truncate">
                                        {isAr ? et.descAr : et.descEn}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadTemplate(et.type)}
                                    className="gap-1.5 flex-shrink-0 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
                                >
                                    <FileUp className="w-3.5 h-3.5" />
                                    {isAr ? 'تحميل القالب' : 'Download'}
                                </Button>
                            </div>
                        );
                    })}

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                        <span className="text-lg flex-shrink-0">💡</span>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            {isAr
                                ? 'كل قالب يحتوي على أعمدة لجميع اللغات (العربية، الإنجليزية، التركية، الروسية، الأوكرانية). عبّئ الاسم بكل لغة تحتاجها في نفس الصف — ملف واحد فقط!'
                                : 'Each template includes name columns for all languages (Arabic, English, Turkish, Russian, Ukrainian). Fill the name in each language you need in the same row — just one file!'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Wizard Dialog */}
            {showWizard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowWizard(false)}
                            className="absolute top-3 start-3 z-10 h-8 w-8 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600"
                        >
                            <XIcon className="w-4 h-4" />
                        </Button>
                        <ImportWizard
                            onClose={() => setShowWizard(false)}
                            onComplete={() => setShowWizard(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

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
    {
        id: 'import',
        labelKey: 'settings.tabs.import',
        labelAr: 'استيراد البيانات',
        labelEn: 'Data Import',
        icon: FileUp,
        component: ImportDataTab,
        requiresRole: ['super_admin', 'tenant_owner', 'company_admin'],
    },
    {
        id: 'ai-languages',
        labelKey: 'settings.tabs.aiLanguages',
        labelAr: 'الذكاء الاصطناعي',
        labelEn: 'AI & Languages',
        icon: Bot,
        component: AILanguageSettingsTab,
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
            {/* ── Page Header — Glass Gradient (Navy → Teal) ──── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-teal-800 to-erp-navy p-6 rounded-2xl shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-teal-400/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-teal-400/10 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <Settings className="w-6 h-6 text-teal-300" />
                            </div>
                            <h1 className="text-2xl font-bold text-white font-cairo">
                                {isAr ? 'إعدادات النظام' : 'System Settings'}
                            </h1>
                        </div>
                        <p className="text-sm text-teal-200/80 font-tajawal ps-12">
                            {isAr
                                ? 'بيانات المنشأة، الضرائب، المحاسبة، المستودعات، والصلاحيات'
                                : 'Company profile, taxes, accounting, warehouse, and permissions'}
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
