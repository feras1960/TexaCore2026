/**
 * Sheet Tabs Component - نظام التبويبات الموحد
 * يعرض ويدير التبويبات حسب تكوين المستند
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    LayoutDashboard,
    FileText,
    Files,
    CreditCard,
    BarChart3,
    Clock,
    ArrowRightLeft,
    DollarSign,
    Receipt,
    Users,
    FileEdit,
    Paperclip,
    Info,
    List,
    Image,
    Database,
    TrendingUp,
    Ruler,
    Layers,
    Package,
    ShoppingCart,
    Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabConfig, SheetMode } from '../types';

// Icon mapping
const tabIconMap: Record<string, any> = {
    LayoutDashboard,
    FileText,
    Files,
    CreditCard,
    BarChart3,
    Clock,
    ArrowRightLeft,
    DollarSign,
    Receipt,
    Users,
    FileEdit,
    Paperclip,
    Info,
    List,
    Image,
    Cylinder: Database,  // Cylinder not in lucide, use Database as visual fallback
    Database,
    TrendingUp,
    Ruler,
    Layers,
    Package,
    ShoppingCart,
    Truck,
};

interface SheetTabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    mode: SheetMode;
    children?: React.ReactNode;
    className?: string;
    variant?: 'default' | 'pills' | 'underline';
}

export function SheetTabs({
    tabs,
    activeTab,
    onTabChange,
    mode,
    children,
    className,
    variant = 'default',
}: SheetTabsProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    // Filter tabs by mode
    const visibleTabs = tabs.filter((tab) => {
        if (tab.hidden) return false;
        if (!tab.showInModes) return true;
        return tab.showInModes.includes(mode);
    });

    // Variant styles
    const getTabsListClass = () => {
        switch (variant) {
            case 'pills':
                return 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg';
            case 'underline':
                return 'border-b bg-transparent rounded-none';
            default:
                return 'bg-gray-100/50 dark:bg-gray-800/50 rounded-lg';
        }
    };

    const getTabTriggerClass = (isActive: boolean) => {
        const base = "gap-2 transition-all font-tajawal";

        switch (variant) {
            case 'pills':
                return cn(
                    base,
                    "rounded-md px-4 py-2",
                    isActive
                        ? "bg-white dark:bg-gray-900 shadow-sm text-erp-primary"
                        : "hover:bg-white/50"
                );
            case 'underline':
                return cn(
                    base,
                    "rounded-none border-b-2 -mb-px px-4 py-2",
                    isActive
                        ? "border-erp-primary text-erp-primary"
                        : "border-transparent hover:border-gray-300"
                );
            default:
                return cn(
                    base,
                    "rounded-md px-3 py-1.5",
                    isActive && "bg-white dark:bg-gray-800 shadow-sm"
                );
        }
    };

    return (
        <Tabs
            value={activeTab}
            onValueChange={onTabChange}
            className={cn("w-full flex flex-col h-full", className)}
            dir={direction}
        >
            {/* Tabs Header - Fixed (shrink-0) */}
            <div className="border-b bg-white dark:bg-gray-900 px-4 shrink-0 z-10">
                <ScrollArea className="w-full" dir={direction}>
                    <TabsList className={cn(
                        "inline-flex h-11 w-full gap-1 !justify-start",
                        getTabsListClass()
                    )}>
                        {visibleTabs.map((tab) => {
                            const IconComponent = tabIconMap[tab.icon] || FileText;
                            const isActive = activeTab === tab.id;

                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className={getTabTriggerClass(isActive)}
                                >
                                    <IconComponent className="w-4 h-4" />
                                    <span className="text-sm">{t(tab.labelKey)}</span>
                                    {tab.badge && (
                                        <Badge
                                            variant="secondary"
                                            className="px-1.5 py-0 text-[10px] bg-erp-primary/10 text-erp-primary"
                                        >
                                            {tab.badge}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                    <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </div>

            {/* Tab Content - Scrollable (flex-1) */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {children}
            </div>
        </Tabs>
    );
}

// Tab Content Wrapper - غلاف محتوى التبويب
interface TabContentWrapperProps {
    tabId: string;
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export function TabContentWrapper({
    tabId,
    children,
    className,
    noPadding = false,
}: TabContentWrapperProps) {
    return (
        <TabsContent
            value={tabId}
            className={cn(
                "flex-1 overflow-auto m-0",
                !noPadding && "p-4",
                className
            )}
        >
            {children}
        </TabsContent>
    );
}

// Simple Tab Buttons - أزرار تبويب بسيطة (للاستخدام خارج Tabs)
interface SimpleTabButtonsProps {
    tabs: Array<{
        id: string;
        label: string;
        icon?: any;
        badge?: string | number;
    }>;
    activeTab: string;
    onTabChange: (tabId: string) => void;
    size?: 'sm' | 'md';
}

export function SimpleTabButtons({
    tabs,
    activeTab,
    onTabChange,
    size = 'md',
}: SimpleTabButtonsProps) {
    const { direction } = useLanguage();

    return (
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "flex items-center gap-2 rounded-md font-medium transition-all",
                            size === 'sm' ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                            isActive
                                ? "bg-white dark:bg-gray-900 text-erp-primary shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50"
                        )}
                    >
                        {Icon && <Icon className={cn("w-4 h-4", size === 'sm' && "w-3.5 h-3.5")} />}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px]"
                            >
                                {tab.badge}
                            </Badge>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default SheetTabs;
