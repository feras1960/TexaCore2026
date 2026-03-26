/**
 * 🔔 NotificationsSettingsTab — مركز الإشعارات الموحد
 * ════════════════════════════════════════════════════════
 * 
 * Synced with AILanguageSettingsTab — reads/writes from:
 * - companies.settings.notification_preferences (company-level toggles)
 * - companies.integrations.telegram (Telegram connection status)
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Bell, BellRing, Send, Globe2, CheckCircle2, Clock,
    Settings2, Webhook, Loader2, Save, Sun, Moon, Mail,
    TestTube2, Zap, Play,
} from 'lucide-react';
import { sendTestNotification, telegramNotify } from '@/services/telegramNotificationService';

// ─── Document Type Notification Config ──────────────────────

interface DocTypeConfig {
    id: string;
    icon: string;
    color: string;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    parties: Array<{
        key: string;
        labelAr: string;
        labelEn: string;
        emoji: string;
    }>;
}

const DOC_TYPES: DocTypeConfig[] = [
    {
        id: 'sales',
        icon: '🧾',
        color: 'emerald',
        labelAr: 'فواتير المبيعات والتسليم',
        labelEn: 'Sales Invoices & Delivery',
        descAr: 'إشعارات عند إصدار فاتورة أو تسليم بضاعة',
        descEn: 'Notifications on invoice creation or goods delivery',
        parties: [
            { key: 'sales_notify_customer', labelAr: 'العميل', labelEn: 'Customer', emoji: '👤' },
            { key: 'sales_notify_warehouse', labelAr: 'أمين المستودع', labelEn: 'Warehouse Keeper', emoji: '📦' },
            { key: 'sales_notify_picker', labelAr: 'العتّال', labelEn: 'Picker', emoji: '🏋️' },
            { key: 'sales_notify_accountant', labelAr: 'المحاسب', labelEn: 'Accountant', emoji: '💰' },
            { key: 'sales_notify_cashier', labelAr: 'أمين الصندوق', labelEn: 'Cashier', emoji: '💳' },
            { key: 'sales_notify_owner', labelAr: 'المالك / المدير', labelEn: 'Owner / Manager', emoji: '👑' },
        ],
    },
    {
        id: 'purchases',
        icon: '🛒',
        color: 'orange',
        labelAr: 'المشتريات والاستلام',
        labelEn: 'Purchases & Receipts',
        descAr: 'إشعارات عند استلام بضاعة أو تأكيد مشتريات',
        descEn: 'Notifications on goods receipt or purchase confirmation',
        parties: [
            { key: 'purchase_notify_warehouse', labelAr: 'أمين المستودع', labelEn: 'Warehouse Keeper', emoji: '📦' },
            { key: 'purchase_notify_picker', labelAr: 'العتّال', labelEn: 'Picker', emoji: '🏋️' },
            { key: 'purchase_notify_accountant', labelAr: 'المحاسب', labelEn: 'Accountant', emoji: '💰' },
            { key: 'purchase_notify_owner', labelAr: 'المالك / المدير', labelEn: 'Owner / Manager', emoji: '👑' },
        ],
    },
    {
        id: 'containers',
        icon: '🚢',
        color: 'blue',
        labelAr: 'الحاويات والشحن',
        labelEn: 'Containers & Shipping',
        descAr: 'إشعارات عند وصول شحنة أو تغيير حالة حاوية',
        descEn: 'Notifications on shipment arrival or container status change',
        parties: [
            { key: 'container_notify_warehouse', labelAr: 'أمين المستودع', labelEn: 'Warehouse Keeper', emoji: '📦' },
            { key: 'container_notify_owner', labelAr: 'المالك / المدير', labelEn: 'Owner / Manager', emoji: '👑' },
        ],
    },
    {
        id: 'transfers',
        icon: '🔄',
        color: 'purple',
        labelAr: 'التحويلات المستودعية',
        labelEn: 'Warehouse Transfers',
        descAr: 'إشعارات عند تحويل بضاعة بين المستودعات',
        descEn: 'Notifications on inter-warehouse transfers',
        parties: [
            { key: 'transfer_notify_from_wh', labelAr: 'المستودع المُرسِل', labelEn: 'Source WH', emoji: '📤' },
            { key: 'transfer_notify_to_wh', labelAr: 'المستودع المستقبِل', labelEn: 'Dest WH', emoji: '📥' },
            { key: 'transfer_notify_picker', labelAr: 'العتّال', labelEn: 'Picker', emoji: '🏋️' },
        ],
    },
    {
        id: 'finance',
        icon: '💳',
        color: 'indigo',
        labelAr: 'المالية والمدفوعات',
        labelEn: 'Finance & Payments',
        descAr: 'إشعارات عن المدفوعات والفواتير المستحقة',
        descEn: 'Notifications about payments and due invoices',
        parties: [
            { key: 'finance_notify_accountant', labelAr: 'المحاسب', labelEn: 'Accountant', emoji: '💰' },
            { key: 'finance_notify_cashier', labelAr: 'أمين الصندوق', labelEn: 'Cashier', emoji: '💳' },
            { key: 'finance_notify_owner', labelAr: 'المالك / المدير', labelEn: 'Owner / Manager', emoji: '👑' },
            { key: 'finance_notify_sales', labelAr: 'مدير المبيعات', labelEn: 'Sales Manager', emoji: '🛒' },
        ],
    },
    {
        id: 'inventory',
        icon: '📊',
        color: 'amber',
        labelAr: 'المخزون والجرد',
        labelEn: 'Inventory & Stock',
        descAr: 'إشعارات عند انخفاض المخزون أو مهام الجرد',
        descEn: 'Notifications on low stock or inventory tasks',
        parties: [
            { key: 'stock_notify_warehouse', labelAr: 'أمين المستودع', labelEn: 'Warehouse Keeper', emoji: '📦' },
            { key: 'stock_notify_picker', labelAr: 'العتّال', labelEn: 'Picker', emoji: '🏋️' },
            { key: 'stock_notify_owner', labelAr: 'المالك / المدير', labelEn: 'Owner / Manager', emoji: '👑' },
        ],
    },
    {
        id: 'delivery',
        icon: '🚚',
        color: 'teal',
        labelAr: 'التوصيل',
        labelEn: 'Delivery',
        descAr: 'إشعارات وجهات التوصيل للسائقين',
        descEn: 'Delivery route notifications for drivers',
        parties: [
            { key: 'delivery_notify_driver', labelAr: 'السائق', labelEn: 'Driver', emoji: '🚗' },
        ],
    },
];

const colorMap: Record<string, string> = {
    emerald: 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10',
    orange: 'border-orange-200 dark:border-orange-800/40 bg-orange-50/30 dark:bg-orange-950/10',
    blue: 'border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/10',
    purple: 'border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/10',
    indigo: 'border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/30 dark:bg-indigo-950/10',
    amber: 'border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10',
    teal: 'border-teal-200 dark:border-teal-800/40 bg-teal-50/30 dark:bg-teal-950/10',
};

// ─── Test Scenarios Section ─────────────────────────────────

const TEST_SCENARIOS = [
    { id: 'sales_invoice', icon: '🧾', labelAr: 'فاتورة مبيعات', labelEn: 'Sales Invoice' },
    { id: 'purchase_receipt', icon: '🛒', labelAr: 'استلام مشتريات', labelEn: 'Purchase Receipt' },
    { id: 'container_arrival', icon: '🚢', labelAr: 'وصول حاوية', labelEn: 'Container Arrival' },
    { id: 'warehouse_transfer', icon: '🔄', labelAr: 'تحويل مستودعي', labelEn: 'Warehouse Transfer' },
    { id: 'payment_received', icon: '💰', labelAr: 'دفعة مستلمة', labelEn: 'Payment Received' },
    { id: 'low_stock', icon: '⚠️', labelAr: 'مخزون منخفض', labelEn: 'Low Stock Alert' },
    { id: 'delivery_route', icon: '🚚', labelAr: 'مهمة توصيل', labelEn: 'Delivery Route' },
    { id: 'price_update', icon: '💹', labelAr: 'تحديث أسعار', labelEn: 'Price Update' },
    { id: 'invoice_due', icon: '📄', labelAr: 'فاتورة مستحقة', labelEn: 'Invoice Due' },
];

function TestScenariosSection({ companyId, isAr, telegramConnected }: { companyId: string; isAr: boolean; telegramConnected: boolean }) {
    const [testingId, setTestingId] = useState<string | null>(null);
    const [resultId, setResultId] = useState<string | null>(null);

    const runTest = async (scenarioId: string) => {
        if (!companyId) {
            toast.error(isAr ? 'لا يوجد شركة محددة' : 'No company selected');
            return;
        }
        setTestingId(scenarioId);
        setResultId(null);

        try {
            switch (scenarioId) {
                case 'sales_invoice':
                    await telegramNotify.salesOrder(companyId, {
                        orderNumber: 'INV-TEST-001',
                        customerName: isAr ? 'أحمد التاجر (تجريبي)' : 'Ahmad Trader (Test)',
                        totalAmount: 45250,
                        currency: '₺',
                        itemCount: 4,
                        salesPerson: isAr ? 'خالد - مندوب المبيعات' : 'Khaled - Sales Rep',
                        items: [
                            { name: isAr ? 'قماش قطني أبيض' : 'White Cotton', qty: 200, unit: 'م', price: 85, rolls: 4 },
                            { name: isAr ? 'بوليستر أزرق' : 'Blue Polyester', qty: 150, unit: 'م', price: 120, rolls: 3 },
                            { name: isAr ? 'حرير أحمر' : 'Red Silk', qty: 50, unit: 'م', price: 250, rolls: 1 },
                            { name: isAr ? 'كتان طبيعي' : 'Natural Linen', qty: 100, unit: 'م', price: 95, rolls: 2 },
                        ],
                    });
                    break;
                case 'purchase_receipt':
                    await telegramNotify.receiptOrder(companyId, {
                        orderNumber: 'RCV-TEST-001',
                        supplierName: isAr ? 'مصنع الأقمشة الذهبية (تجريبي)' : 'Golden Fabric Factory (Test)',
                        warehouseName: isAr ? 'المستودع الرئيسي' : 'Main Warehouse',
                        createdBy: isAr ? 'محمد - أمين المستودع' : 'Mohammed - WH Keeper',
                        totalQty: 1800,
                        totalRolls: 18,
                        items: [
                            { name: isAr ? 'قماش قطني أبيض' : 'White Cotton', qty: 500, unit: 'م', rolls: 5 },
                            { name: isAr ? 'بوليستر أزرق' : 'Blue Polyester', qty: 300, unit: 'م', rolls: 3 },
                            { name: isAr ? 'حرير طبيعي' : 'Natural Silk', qty: 200, unit: 'م', rolls: 2 },
                            { name: isAr ? 'جينز ثقيل' : 'Heavy Denim', qty: 400, unit: 'م', rolls: 4 },
                            { name: isAr ? 'شيفون شفاف' : 'Sheer Chiffon', qty: 400, unit: 'م', rolls: 4 },
                        ],
                        notes: isAr ? 'الدفعة الثانية من طلب الشراء PO-2026-045' : '2nd batch from PO-2026-045',
                    });
                    break;
                case 'container_arrival':
                    await telegramNotify.shipmentArrival(companyId, {
                        containerNumber: 'TXCU-2026-0387',
                        supplierName: isAr ? 'مصنع شنغهاي للمنسوجات (تجريبي)' : 'Shanghai Textiles (Test)',
                        originCountry: isAr ? '🇨🇳 الصين' : '🇨🇳 China',
                        itemCount: 15,
                        totalCost: 185000,
                        currency: '$',
                        warehouseName: isAr ? 'المستودع الرئيسي' : 'Main Warehouse',
                        arrivalDate: new Date().toLocaleDateString('ar-u-nu-latn'),
                        invoices: [
                            { number: 'PI-2026-112', amount: 62500, items: 5 },
                            { number: 'PI-2026-113', amount: 48000, items: 4 },
                            { number: 'PI-2026-118', amount: 74500, items: 6 },
                        ],
                    });
                    break;
                case 'warehouse_transfer':
                    await telegramNotify.warehouseTransfer(companyId, {
                        transferNumber: 'TR-TEST-001',
                        fromWarehouse: isAr ? 'المستودع الرئيسي' : 'Main WH',
                        toWarehouse: isAr ? 'فرع المنطقة الصناعية' : 'Industrial Branch',
                        createdBy: isAr ? 'أحمد - مدير المخزون' : 'Ahmad - Stock Manager',
                        items: [
                            { name: isAr ? 'قماش كتان طبيعي' : 'Natural Linen', qty: 200, unit: 'م', rolls: 4 },
                            { name: isAr ? 'قطن مصري فاخر' : 'Egyptian Cotton', qty: 350, unit: 'م', rolls: 7 },
                            { name: isAr ? 'بوليستر مخلوط' : 'Blended Polyester', qty: 150, unit: 'م', rolls: 3 },
                        ],
                    });
                    break;
                case 'payment_received':
                    await telegramNotify.paymentReceived(companyId, {
                        amount: 28500,
                        currency: '₺',
                        customerName: isAr ? 'محمد الخياط (تجريبي)' : 'Mohammed Tailor (Test)',
                        paymentMethod: isAr ? 'تحويل بنكي - بنك زراعات' : 'Bank Transfer - Ziraat',
                        referenceNumber: 'PAY-TEST-001',
                        invoiceNumber: 'INV-2026-0234',
                        remainingBalance: 12750,
                        receivedBy: isAr ? 'سارة - المحاسبة' : 'Sara - Accounting',
                    });
                    break;
                case 'low_stock':
                    await telegramNotify.lowStock(companyId, {
                        materialName: isAr ? 'قماش حرير أحمر فاخر (تجريبي)' : 'Premium Red Silk (Test)',
                        currentQty: 15,
                        minQty: 50,
                        unit: 'م',
                        warehouseName: isAr ? 'المستودع الرئيسي' : 'Main Warehouse',
                    });
                    break;
                case 'delivery_route':
                    await telegramNotify.deliveryRoute(companyId, {
                        deliveryNumber: 'DEL-TEST-001',
                        customerName: isAr ? 'محل علي للأقمشة (تجريبي)' : 'Ali Fabric Shop (Test)',
                        customerPhone: '+90 555 123 4567',
                        address: isAr ? 'اسطنبول - الفاتح - شارع محمد الفاتح رقم 45/B' : 'Istanbul - Fatih - Mehmet Fatih St. No 45/B',
                        items: isAr ? '3 رولون قماش قطني + 2 رولون بوليستر' : '3 cotton rolls + 2 polyester rolls',
                        collectAmount: 12800,
                        currency: '₺',
                    });
                    break;
                case 'price_update':
                    await telegramNotify.priceUpdate(companyId, {
                        items: [
                            { name: isAr ? 'قماش قطني أبيض' : 'White Cotton', oldPrice: 80, newPrice: 95 },
                            { name: isAr ? 'بوليستر أزرق' : 'Blue Polyester', oldPrice: 120, newPrice: 115 },
                            { name: isAr ? 'حرير طبيعي' : 'Natural Silk', oldPrice: 230, newPrice: 260 },
                        ],
                        updatedBy: isAr ? 'فراس - مدير المبيعات' : 'Feras - Sales Manager',
                        reason: isAr ? 'تحديث أسعار الموسم الجديد (تجريبي)' : 'New season price update (Test)',
                    });
                    break;
                case 'invoice_due':
                    await telegramNotify.invoiceDue(companyId, {
                        invoiceNumber: 'INV-2026-0198',
                        customerName: isAr ? 'شركة النسيج العربي (تجريبي)' : 'Arab Textile Co (Test)',
                        amount: 34500,
                        currency: '₺',
                        dueDate: new Date(Date.now() + 2 * 86400000).toLocaleDateString('ar-u-nu-latn'),
                        daysLeft: 2,
                    });
                    break;
            }
            setResultId(scenarioId);
            toast.success(isAr ? '✅ تم إرسال الإشعار التجريبي' : '✅ Test notification sent');
        } catch (err) {
            toast.error(isAr ? '❌ فشل في الإرسال' : '❌ Failed to send');
        }

        setTestingId(null);
        setTimeout(() => setResultId(null), 3000);
    };

    return (
        <Card className="border-violet-200 dark:border-violet-800/40">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TestTube2 className="w-4 h-4 text-violet-500" />
                    {isAr ? 'تجربة سيناريوهات الإشعارات' : 'Test Notification Scenarios'}
                </CardTitle>
                <CardDescription className="text-xs">
                    {isAr
                        ? 'أرسل إشعار تجريبي لكل نوع مستند للتحقق من عمل النظام'
                        : 'Send a test notification for each document type to verify the system works'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Quick Channel Tests */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500 w-full mb-1">
                        {isAr ? '⚡ تجربة سريعة للقنوات:' : '⚡ Quick channel test:'}
                    </span>
                    <QuickTestBtn channel="in_app" isAr={isAr} />
                    <QuickTestBtn channel="email" isAr={isAr} />
                    {telegramConnected && <QuickTestBtn channel="telegram" isAr={isAr} />}
                </div>

                {/* Scenario Tests */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {TEST_SCENARIOS.map(scenario => (
                        <Button
                            key={scenario.id}
                            size="sm"
                            variant="outline"
                            onClick={() => runTest(scenario.id)}
                            disabled={testingId === scenario.id}
                            className={cn(
                                "h-auto py-2.5 px-3 flex flex-col items-center gap-1.5 text-xs transition-all",
                                resultId === scenario.id
                                    ? "border-green-300 bg-green-50 dark:bg-green-950/20 text-green-700"
                                    : "hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
                            )}
                        >
                            {testingId === scenario.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                            ) : resultId === scenario.id ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                                <span className="text-lg">{scenario.icon}</span>
                            )}
                            <span className="font-medium">
                                {resultId === scenario.id
                                    ? (isAr ? 'تم ✓' : 'Sent ✓')
                                    : (isAr ? scenario.labelAr : scenario.labelEn)}
                            </span>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function QuickTestBtn({ channel, isAr }: { channel: 'telegram' | 'email' | 'in_app'; isAr: boolean }) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle');
    const labels = {
        telegram: { icon: Send, text: { ar: 'تلغرام', en: 'Telegram' }, color: 'bg-blue-600 hover:bg-blue-700' },
        email: { icon: Mail, text: { ar: 'إيميل', en: 'Email' }, color: 'bg-purple-600 hover:bg-purple-700' },
        in_app: { icon: Bell, text: { ar: 'داخلي', en: 'In-App' }, color: 'bg-emerald-600 hover:bg-emerald-700' },
    };
    const cfg = labels[channel];
    const Icon = cfg.icon;

    const onClick = async () => {
        setStatus('sending');
        try {
            const r = await sendTestNotification(channel);
            setStatus(r.ok ? 'ok' : 'fail');
        } catch { setStatus('fail'); }
        setTimeout(() => setStatus('idle'), 3000);
    };

    return (
        <Button size="sm" onClick={onClick} disabled={status === 'sending'}
            className={cn("gap-1.5 text-[11px] text-white", status === 'ok' ? 'bg-green-600' : status === 'fail' ? 'bg-red-600' : cfg.color)}>
            {status === 'sending' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                status === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
            {status === 'ok' ? '✓' : cfg.text[isAr ? 'ar' : 'en']}
        </Button>
    );
}

// ─── Component ──────────────────────────────────────────────

export default function NotificationsSettingsTab() {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const { companyId } = useCompany();
    const isAr = language === 'ar';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [notifPrefs, setNotifPrefs] = useState<Record<string, any>>({});
    const [telegramConnected, setTelegramConnected] = useState(false);

    // Schedule settings
    const [reportMorning, setReportMorning] = useState('08:00');
    const [reportEvening, setReportEvening] = useState('18:00');

    // ─── Load from companies.settings + companies.integrations ───
    useEffect(() => {
        if (!companyId) return;
        (async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('companies')
                .select('settings, integrations')
                .eq('id', companyId)
                .single();

            if (!error && data) {
                // notification_preferences from companies.settings
                if (data.settings && typeof data.settings === 'object') {
                    const prefs = (data.settings as any).notification_preferences || {};
                    setNotifPrefs(prefs);
                    if (prefs.report_time_morning) setReportMorning(prefs.report_time_morning);
                    if (prefs.report_time_evening) setReportEvening(prefs.report_time_evening);
                }
                // Telegram status from companies.integrations
                if (data.integrations && typeof data.integrations === 'object') {
                    const intg = data.integrations as any;
                    if (intg.telegram?.webhook_active && intg.telegram?.bot_username) {
                        setTelegramConnected(true);
                    }
                }
            }
            setLoading(false);
        })();
    }, [companyId]);

    // Toggle a specific notification key
    const togglePref = (key: string) => {
        setNotifPrefs(prev => {
            const current = prev[key];
            // Default is true (opt-out model), so toggle between true/false
            return { ...prev, [key]: current === false ? true : false };
        });
        setHasChanges(true);
    };

    // ─── Save to companies.settings.notification_preferences ───
    // Same location as AILanguageSettingsTab.handleSave
    const handleSave = async () => {
        if (!companyId) return;
        setSaving(true);
        try {
            // Get current settings first to avoid overwriting other fields
            const { data: current } = await supabase
                .from('companies')
                .select('settings')
                .eq('id', companyId)
                .single();

            const currentSettings = (current?.settings && typeof current.settings === 'object') ? current.settings as any : {};

            const { error } = await supabase
                .from('companies')
                .update({
                    settings: {
                        ...currentSettings,
                        notification_preferences: {
                            ...notifPrefs,
                            report_time_morning: reportMorning,
                            report_time_evening: reportEvening,
                        },
                    },
                })
                .eq('id', companyId);

            if (error) throw error;

            toast.success(isAr ? '✅ تم حفظ إعدادات الإشعارات' : '✅ Notification settings saved');
            setHasChanges(false);
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(err.message || 'Failed to save');
        }
        setSaving(false);
    };

    // Count active notifications
    const allKeys = DOC_TYPES.flatMap(dt => dt.parties.map(p => p.key));
    const activeCount = allKeys.filter(k => notifPrefs[k] !== false).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <Card className="border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-950/20 dark:to-purple-950/10">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <BellRing className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="font-tajawal text-lg">
                                    {isAr ? 'مركز الإشعارات' : 'Notification Center'}
                                </CardTitle>
                                <CardDescription className="font-tajawal">
                                    {isAr
                                        ? 'إعدادات الشركة لقنوات وأنواع الإشعارات'
                                        : 'Company-level notification channels and types'}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700">
                                {activeCount}/{allKeys.length} {isAr ? 'مُفعّل' : 'active'}
                            </Badge>
                            {hasChanges && (
                                <Button onClick={handleSave} disabled={saving} size="sm"
                                    className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {isAr ? 'حفظ' : 'Save'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* ── Channels Status ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="font-tajawal text-sm flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-blue-500" />
                        {isAr ? 'قنوات الإرسال' : 'Delivery Channels'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* In-App */}
                        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {isAr ? 'داخل التطبيق' : 'In-App'}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'إشعارات فورية في جرس الإشعارات' : 'Real-time bell notifications'}
                                </div>
                            </div>
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                <CheckCircle2 className="w-3 h-3 me-0.5" />
                                {isAr ? 'فعّال' : 'Active'}
                            </Badge>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/10">
                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {isAr ? 'البريد الإلكتروني' : 'Email'}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'إشعارات عبر Resend' : 'Notifications via Resend'}
                                </div>
                            </div>
                            <Badge className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                                <CheckCircle2 className="w-3 h-3 me-0.5" />
                                {isAr ? 'فعّال' : 'Active'}
                            </Badge>
                        </div>

                        {/* Telegram */}
                        <div className={cn(
                            "flex items-center gap-3 p-3.5 rounded-xl border",
                            telegramConnected
                                ? "border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/10"
                                : "border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20 opacity-60"
                        )}>
                            <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                telegramConnected
                                    ? "bg-blue-100 dark:bg-blue-900/40"
                                    : "bg-gray-100 dark:bg-gray-800"
                            )}>
                                <Send className={cn("w-4 h-4", telegramConnected ? "text-blue-600 dark:text-blue-400" : "text-gray-400")} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    Telegram
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'رسائل عبر بوت تلغرام' : 'Messages via Telegram Bot'}
                                </div>
                            </div>
                            {telegramConnected ? (
                                <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                                    <CheckCircle2 className="w-3 h-3 me-0.5" />
                                    {isAr ? 'مربوط' : 'Connected'}
                                </Badge>
                            ) : (
                                <Badge className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-0
                                    cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    onClick={() => navigate('/system-config/integrations')}>
                                    {isAr ? 'غير مربوط — فعّله من التكاملات ↗' : 'Not Connected — set up in Integrations ↗'}
                                </Badge>
                            )}
                        </div>

                        {/* n8n */}
                        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20 opacity-60">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Webhook className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    n8n / Webhook
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {isAr ? 'Email, SMS, Slack عبر n8n' : 'Email, SMS, Slack via n8n'}
                                </div>
                            </div>
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                {isAr ? 'قريباً' : 'Soon'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Cross-link to user-level preferences ── */}
            <div className="flex items-center justify-between px-1 py-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                    💡 {isAr ? 'هذه إعدادات الشركة. لإدارة تفضيلات كل موظف → ' : 'These are company settings. For per-user preferences → '}
                </p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-100 gap-1"
                    onClick={() => navigate('/system-config/ai-languages')}>
                    {isAr ? 'صفحة الذكاء الصناعي' : 'AI & Users page'} →
                </Button>
            </div>

            {/* ── Document Type Notifications ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-purple-500" />
                        {isAr ? 'إشعارات حسب نوع المستند' : 'Notifications by Document Type'}
                    </h3>
                </div>

                {DOC_TYPES.map(docType => {
                    const activeParties = docType.parties.filter(p => notifPrefs[p.key] !== false).length;
                    return (
                        <Card key={docType.id} className={cn("border transition-all", colorMap[docType.color] || '')}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xl">{docType.icon}</span>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                {isAr ? docType.labelAr : docType.labelEn}
                                            </div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {isAr ? docType.descAr : docType.descEn}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                        {activeParties}/{docType.parties.length}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {docType.parties.map(party => {
                                        const isEnabled = notifPrefs[party.key] !== false;
                                        return (
                                            <label
                                                key={party.key}
                                                className={cn(
                                                    "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                                    isEnabled
                                                        ? "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60"
                                                        : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 opacity-50"
                                                )}
                                            >
                                                <Switch
                                                    checked={isEnabled}
                                                    onCheckedChange={() => togglePref(party.key)}
                                                    className="scale-[0.65]"
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">
                                                        {party.emoji} {isAr ? party.labelAr : party.labelEn}
                                                    </div>
                                                    {isEnabled && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="In-App" />
                                                            {telegramConnected && (
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Telegram" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Test Scenarios ── */}
            <TestScenariosSection companyId={companyId || ''} isAr={isAr} telegramConnected={telegramConnected} />

            {/* ── Schedule ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        {isAr ? 'أوقات التقارير' : 'Report Schedule'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Sun className="w-3 h-3 text-amber-500" />
                                {isAr ? 'التقرير الصباحي' : 'Morning Report'}
                            </Label>
                            <input type="time" value={reportMorning}
                                onChange={(e) => { setReportMorning(e.target.value); setHasChanges(true); }}
                                className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Moon className="w-3 h-3 text-indigo-500" />
                                {isAr ? 'ملخص نهاية اليوم' : 'End of Day Summary'}
                            </Label>
                            <input type="time" value={reportEvening}
                                onChange={(e) => { setReportEvening(e.target.value); setHasChanges(true); }}
                                className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" dir="ltr" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Channel Legend ── */}
            <div className="flex items-center gap-4 px-2 text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    {isAr ? 'داخل التطبيق' : 'In-App'}
                </div>
                {telegramConnected && (
                    <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                        Telegram
                    </div>
                )}
                <div className="flex items-center gap-1 opacity-50">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    n8n ({isAr ? 'قريباً' : 'soon'})
                </div>
            </div>
        </div>
    );
}
