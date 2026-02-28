/**
 * ═══════════════════════════════════════════════════════════════
 *  EcommercePage — لوحة تحكم المتجر الإلكتروني (الصفحة الرئيسية)
 * ═══════════════════════════════════════════════════════════════
 *  8 تبويبات: Dashboard, Orders, Customers, Products, Pricing,
 *  Shipping, SEO/Marketing, Settings
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    LayoutDashboard, ShoppingCart, Users, Package,
    Tag, Truck, Search, Settings, ExternalLink, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import EcommerceDashboard from './components/EcommerceDashboard';
import EcommerceOrders from './components/EcommerceOrders';
import EcommerceCustomers from './components/EcommerceCustomers';
import EcommerceProducts from './components/EcommerceProducts';
import EcommercePricing from './components/EcommercePricing';
import EcommerceShipping from './components/EcommerceShipping';
import EcommerceSEO from './components/EcommerceSEO';
import EcommerceSettings from './components/EcommerceSettings';

const TABS = [
    { id: 'dashboard', label_ar: 'لوحة التحكم', label_en: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label_ar: 'الطلبات', label_en: 'Orders', icon: ShoppingCart },
    { id: 'customers', label_ar: 'العملاء', label_en: 'Customers', icon: Users },
    { id: 'products', label_ar: 'المنتجات', label_en: 'Products', icon: Package },
    { id: 'pricing', label_ar: 'التسعير والعروض', label_en: 'Pricing & Offers', icon: Tag },
    { id: 'shipping', label_ar: 'الشحن والدفع', label_en: 'Shipping & Payment', icon: Truck },
    { id: 'seo', label_ar: 'SEO والتسويق', label_en: 'SEO & Marketing', icon: Search },
    { id: 'settings', label_ar: 'إعدادات المتجر', label_en: 'Store Settings', icon: Settings },
];

export default function EcommercePage() {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [activeTab, setActiveTab] = useState('dashboard');

    // Store URL - reads from env or config
    const storeUrl = import.meta.env.VITE_STORE_URL || 'http://localhost:3000';

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10" dir={direction}>
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {isRTL ? 'المتجر الإلكتروني' : 'E-Commerce'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        {isRTL ? 'إدارة المتجر — الطلبات — العملاء — الشحن' : 'Manage Store — Orders — Customers — Shipping'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Globe className="w-4 h-4" />
                            {isRTL ? 'فتح المتجر' : 'Open Store'}
                            <ExternalLink className="w-3 h-3" />
                        </Button>
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
                <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    {TABS.map(tab => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all"
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{isRTL ? tab.label_ar : tab.label_en}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="dashboard" className="mt-4">
                    <EcommerceDashboard />
                </TabsContent>
                <TabsContent value="orders" className="mt-4">
                    <EcommerceOrders />
                </TabsContent>
                <TabsContent value="customers" className="mt-4">
                    <EcommerceCustomers />
                </TabsContent>
                <TabsContent value="products" className="mt-4">
                    <EcommerceProducts />
                </TabsContent>
                <TabsContent value="pricing" className="mt-4">
                    <EcommercePricing />
                </TabsContent>
                <TabsContent value="shipping" className="mt-4">
                    <EcommerceShipping />
                </TabsContent>
                <TabsContent value="seo" className="mt-4">
                    <EcommerceSEO />
                </TabsContent>
                <TabsContent value="settings" className="mt-4">
                    <EcommerceSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
