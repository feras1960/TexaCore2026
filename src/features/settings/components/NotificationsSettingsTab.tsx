/**
 * 🔔 NotificationsSettingsTab — إعدادات الإشعارات العامة
 * 
 * Features:
 * - أنواع الإشعارات: كونتينرات / فواتير مشتريات / فواتير مبيعات / قيود محاسبية
 * - طريقة الإشعار: داخل التطبيق / n8n webhook / Telegram (مستقبلاً)
 * - تفعيل/إلغاء كل نوع على حدة
 * - خطة التكامل مع n8n (Phase القادمة)
 * 
 * 🎯 هذا التبويب للإعدادات العامة على مستوى الشركة
 *    (إعدادات الكونتينر الخاصة → في ContainerMainTab)
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Bell, BellRing, Ship, ShoppingBag, ShoppingCart, FileText,
    Webhook, Send, Globe2, CheckCircle2, Clock, ArrowRight,
    Settings2, Zap, Info, ExternalLink, MessageSquare,
    type LucideIcon
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface NotifChannel {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: LucideIcon;
    enabled: boolean;
    status: 'active' | 'planned' | 'coming_soon';
    descriptionAr: string;
    descriptionEn: string;
}

interface NotifEventType {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    enabled: boolean;
    triggerAr: string;
    triggerEn: string;
    targetAr: string;
    targetEn: string;
    status: 'active' | 'planned';
}

// ─── Data ───────────────────────────────────────────────────

const NOTIFICATION_CHANNELS: NotifChannel[] = [
    {
        id: 'in_app',
        labelAr: 'داخل التطبيق',
        labelEn: 'In-App',
        icon: Bell,
        enabled: true,
        status: 'active',
        descriptionAr: 'إشعارات فورية في جرس الإشعارات مع Realtime',
        descriptionEn: 'Real-time notifications in the notification bell',
    },
    {
        id: 'n8n_webhook',
        labelAr: 'n8n Webhook',
        labelEn: 'n8n Webhook',
        icon: Webhook,
        enabled: false,
        status: 'planned',
        descriptionAr: 'إرسال إشعار عبر n8n عند حدوث تغيير — يدعم Email, SMS, Slack',
        descriptionEn: 'Send webhook to n8n on events — supports Email, SMS, Slack',
    },
    {
        id: 'telegram',
        labelAr: 'Telegram Bot',
        labelEn: 'Telegram Bot',
        icon: Send,
        enabled: false,
        status: 'coming_soon',
        descriptionAr: 'إرسال إشعارات عبر بوت تليجرام مباشرة',
        descriptionEn: 'Send notifications via Telegram Bot directly',
    },
];

const NOTIFICATION_EVENT_TYPES: NotifEventType[] = [
    {
        id: 'container_status',
        labelAr: 'تغيير حالة الكونتينر',
        labelEn: 'Container Status Change',
        icon: Ship,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        enabled: true,
        triggerAr: 'عند تغيير حالة الكونتينر (مثل: تم التخليص، وصل الميناء)',
        triggerEn: 'When container status changes (e.g., cleared, arrived at port)',
        targetAr: 'حسب قواعد الإشعارات لكل كونتينر (موظف مبيعات / أمين المستودع)',
        targetEn: 'Based on per-container notification rules (sales rep / warehouse keeper)',
        status: 'active',
    },
    {
        id: 'purchase_invoice_status',
        labelAr: 'تغيير حالة فاتورة المشتريات',
        labelEn: 'Purchase Invoice Status',
        icon: ShoppingBag,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        enabled: true,
        triggerAr: 'عند تغيير حالة فاتورة المشتريات (مُعتمدة، مرحّلة، مدفوعة...)',
        triggerEn: 'When purchase invoice status changes (approved, posted, paid...)',
        targetAr: 'منشئ الفاتورة (created_by)',
        targetEn: 'Invoice creator (created_by)',
        status: 'active',
    },
    {
        id: 'sales_invoice_status',
        labelAr: 'تغيير حالة فاتورة المبيعات',
        labelEn: 'Sales Invoice Status',
        icon: ShoppingCart,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        enabled: true,
        triggerAr: 'عند تغيير حالة فاتورة المبيعات (مؤكدة، تم التسليم، مدفوعة...)',
        triggerEn: 'When sales invoice status changes (confirmed, delivered, paid...)',
        targetAr: 'منشئ الفاتورة (created_by)',
        targetEn: 'Invoice creator (created_by)',
        status: 'active',
    },
    {
        id: 'journal_entry',
        labelAr: 'ترحيل القيود المحاسبية',
        labelEn: 'Journal Entry Posting',
        icon: FileText,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        enabled: false,
        triggerAr: 'عند ترحيل أو إلغاء ترحيل قيد محاسبي',
        triggerEn: 'When a journal entry is posted or un-posted',
        targetAr: 'منشئ القيد + المحاسب الرئيسي',
        targetEn: 'Entry creator + chief accountant',
        status: 'planned',
    },
    {
        id: 'payment_due',
        labelAr: 'استحقاق المدفوعات',
        labelEn: 'Payment Due',
        icon: Clock,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        enabled: false,
        triggerAr: 'تذكير قبل 3/7 أيام من تاريخ استحقاق فواتير الموردين',
        triggerEn: 'Reminder 3/7 days before supplier invoice due date',
        targetAr: 'المحاسب + مدير المشتريات',
        targetEn: 'Accountant + Purchase Manager',
        status: 'planned',
    },
    {
        id: 'inventory_low',
        labelAr: 'انخفاض المخزون',
        labelEn: 'Low Inventory',
        icon: Zap,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        enabled: false,
        triggerAr: 'عندما ينخفض رصيد مادة تحت الحد الأدنى المُحدد',
        triggerEn: 'When material stock falls below minimum threshold',
        targetAr: 'أمين المستودع + مدير المشتريات',
        targetEn: 'Warehouse keeper + Purchase Manager',
        status: 'planned',
    },
];

// ─── N8N Integration Plan ────────────────────────────────────

interface N8NStep {
    stepAr: string;
    stepEn: string;
    descriptionAr: string;
    descriptionEn: string;
    status: 'done' | 'next' | 'future';
}

const N8N_INTEGRATION_PLAN: N8NStep[] = [
    {
        stepAr: 'إنشاء الـ Triggers في Supabase',
        stepEn: 'Create Supabase Triggers',
        descriptionAr: 'عند تغيير حالة (كونتينر / فاتورة) → إدخال في جدول notifications',
        descriptionEn: 'On status change (container / invoice) → insert into notifications table',
        status: 'done',
    },
    {
        stepAr: 'Realtime في التطبيق',
        stepEn: 'In-App Realtime',
        descriptionAr: 'Supabase Realtime يستمع لجدول notifications → يحدّث جرس الإشعارات فوراً',
        descriptionEn: 'Supabase Realtime subscribes to notifications → updates bell instantly',
        status: 'done',
    },
    {
        stepAr: 'إنشاء Supabase Edge Function',
        stepEn: 'Create Edge Function',
        descriptionAr: 'Database Webhook يُرسل POST request عند كل INSERT في notifications',
        descriptionEn: 'Database Webhook sends POST request on every INSERT into notifications',
        status: 'next',
    },
    {
        stepAr: 'ربط n8n Workflow',
        stepEn: 'Connect n8n Workflow',
        descriptionAr: 'n8n يستقبل Webhook → يُعالج البيانات → يرسل عبر Email / Telegram / SMS',
        descriptionEn: 'n8n receives webhook → processes data → sends via Email / Telegram / SMS',
        status: 'future',
    },
    {
        stepAr: 'إعدادات لكل مستخدم',
        stepEn: 'Per-User Preferences',
        descriptionAr: 'كل مستخدم يختار: أيّ أنواع إشعارات يستقبلها وبأي قناة',
        descriptionEn: 'Each user chooses which notification types to receive and via which channel',
        status: 'future',
    },
];

// ─── Component ──────────────────────────────────────────────

export default function NotificationsSettingsTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    // Local state (in the future, these will be saved to company_settings)
    const [channels, setChannels] = useState(NOTIFICATION_CHANNELS);
    const [events, setEvents] = useState(NOTIFICATION_EVENT_TYPES);
    const [webhookUrl, setWebhookUrl] = useState('');

    const toggleChannel = (id: string) => {
        setChannels(prev => prev.map(c =>
            c.id === id && c.status === 'active' ? { ...c, enabled: !c.enabled } : c
        ));
    };

    const toggleEvent = (id: string) => {
        setEvents(prev => prev.map(e =>
            e.id === id && e.status === 'active' ? { ...e, enabled: !e.enabled } : e
        ));
    };

    const activeEventsCount = events.filter(e => e.enabled).length;
    const activeChannelsCount = channels.filter(c => c.enabled).length;

    return (
        <div className="space-y-6">
            {/* ── Header Summary ── */}
            <Card className="border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-950/20 dark:to-purple-950/10">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <BellRing className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="font-tajawal text-lg">
                                    {isAr ? 'إعدادات الإشعارات' : 'Notification Settings'}
                                </CardTitle>
                                <CardDescription className="font-tajawal">
                                    {isAr
                                        ? 'تحكم بأنواع الإشعارات وقنوات الإرسال'
                                        : 'Control notification types and delivery channels'}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700">
                                {activeEventsCount} {isAr ? 'نوع' : 'types'} · {activeChannelsCount} {isAr ? 'قناة' : 'channels'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* ── Section 1: Delivery Channels ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-tajawal text-base flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-blue-500" />
                        {isAr ? 'قنوات الإرسال' : 'Delivery Channels'}
                    </CardTitle>
                    <CardDescription className="font-tajawal text-xs">
                        {isAr
                            ? 'كيف يتم إرسال الإشعارات للمستخدمين'
                            : 'How notifications are delivered to users'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {channels.map((channel) => {
                        const Icon = channel.icon;
                        return (
                            <div
                                key={channel.id}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                                    channel.enabled
                                        ? "border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/10"
                                        : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30",
                                    channel.status !== 'active' && "opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center",
                                        channel.enabled
                                            ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                    )}>
                                        <Icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                {isAr ? channel.labelAr : channel.labelEn}
                                            </span>
                                            {channel.status === 'active' && (
                                                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                                    {isAr ? 'فعّال' : 'Active'}
                                                </Badge>
                                            )}
                                            {channel.status === 'planned' && (
                                                <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                                    {isAr ? 'المرحلة القادمة' : 'Next Phase'}
                                                </Badge>
                                            )}
                                            {channel.status === 'coming_soon' && (
                                                <Badge className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-0">
                                                    {isAr ? 'قريباً' : 'Coming Soon'}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            {isAr ? channel.descriptionAr : channel.descriptionEn}
                                        </p>
                                    </div>
                                </div>

                                <Switch
                                    checked={channel.enabled}
                                    onCheckedChange={() => toggleChannel(channel.id)}
                                    disabled={channel.status !== 'active'}
                                    className="data-[state=checked]:bg-violet-500"
                                />
                            </div>
                        );
                    })}

                    {/* Webhook URL input (for n8n) */}
                    <div className={cn(
                        "p-4 rounded-xl border transition-all",
                        "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20"
                    )}>
                        <div className="flex items-center gap-2 mb-2">
                            <Webhook className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                                {isAr ? 'رابط Webhook (اختياري)' : 'Webhook URL (optional)'}
                            </span>
                            <Badge className="text-[8px] px-1 py-0 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                {isAr ? 'غداً' : 'Tomorrow'}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://n8n.yourdomain.com/webhook/..."
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                className="text-xs h-8 font-mono"
                                disabled
                                dir="ltr"
                            />
                            <Button size="sm" variant="outline" className="h-8 text-xs" disabled>
                                {isAr ? 'اختبار' : 'Test'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Section 2: Event Types ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-tajawal text-base flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-purple-500" />
                        {isAr ? 'أنواع الإشعارات' : 'Notification Types'}
                    </CardTitle>
                    <CardDescription className="font-tajawal text-xs">
                        {isAr
                            ? 'ما هي الأحداث التي تُنشئ إشعارات'
                            : 'Which events trigger notifications'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {events.map((event) => {
                        const Icon = event.icon;
                        return (
                            <div
                                key={event.id}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    event.enabled
                                        ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                                        : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20",
                                    event.status === 'planned' && "opacity-60"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            event.bgColor
                                        )}>
                                            <Icon className={cn("w-4 h-4", event.color)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {isAr ? event.labelAr : event.labelEn}
                                                </span>
                                                {event.status === 'active' && event.enabled && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                )}
                                                {event.status === 'planned' && (
                                                    <Badge className="text-[8px] px-1 py-0 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-0">
                                                        {isAr ? 'مُخطط' : 'Planned'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Switch
                                        checked={event.enabled}
                                        onCheckedChange={() => toggleEvent(event.id)}
                                        disabled={event.status !== 'active'}
                                        className="data-[state=checked]:bg-violet-500"
                                    />
                                </div>

                                <div className="ps-[42px] space-y-1">
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        <span className="font-medium text-gray-600 dark:text-gray-300">
                                            {isAr ? '⚡ المُحفز: ' : '⚡ Trigger: '}
                                        </span>
                                        {isAr ? event.triggerAr : event.triggerEn}
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        <span className="font-medium text-gray-600 dark:text-gray-300">
                                            {isAr ? '👤 المُستلم: ' : '👤 Target: '}
                                        </span>
                                        {isAr ? event.targetAr : event.targetEn}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ── Section 3: n8n Integration Roadmap ── */}
            <Card className="border-blue-200/60 dark:border-blue-800/40">
                <CardHeader>
                    <CardTitle className="font-tajawal text-base flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-blue-500" />
                        {isAr ? 'خطة تكامل n8n' : 'n8n Integration Plan'}
                    </CardTitle>
                    <CardDescription className="font-tajawal text-xs">
                        {isAr
                            ? 'المراحل المتبقية لربط الإشعارات الخارجية عبر n8n + Edge Functions'
                            : 'Remaining phases for external notifications via n8n + Edge Functions'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        {/* Timeline line */}
                        <div className={cn(
                            "absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-blue-300 to-gray-200 dark:from-emerald-700 dark:via-blue-700 dark:to-gray-700",
                            isAr ? "right-[15px]" : "left-[15px]"
                        )} />

                        <div className="space-y-4">
                            {N8N_INTEGRATION_PLAN.map((step, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {/* Timeline dot */}
                                    <div className={cn(
                                        "w-[30px] h-[30px] rounded-full flex items-center justify-center z-10 shrink-0 ring-2 ring-white dark:ring-gray-900",
                                        step.status === 'done' && "bg-emerald-500 text-white",
                                        step.status === 'next' && "bg-blue-500 text-white animate-pulse",
                                        step.status === 'future' && "bg-gray-200 dark:bg-gray-700 text-gray-400",
                                    )}>
                                        {step.status === 'done' ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : step.status === 'next' ? (
                                            <ArrowRight className="w-4 h-4" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={cn(
                                        "flex-1 pb-2 rounded-lg p-3 -mt-0.5",
                                        step.status === 'done' && "bg-emerald-50/50 dark:bg-emerald-950/10",
                                        step.status === 'next' && "bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-800/50",
                                        step.status === 'future' && "bg-gray-50/50 dark:bg-gray-900/20",
                                    )}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                step.status === 'done' && "text-emerald-700 dark:text-emerald-400",
                                                step.status === 'next' && "text-blue-700 dark:text-blue-400",
                                                step.status === 'future' && "text-gray-500 dark:text-gray-400",
                                            )}>
                                                {isAr ? step.stepAr : step.stepEn}
                                            </span>
                                            {step.status === 'done' && (
                                                <Badge className="text-[8px] px-1 py-0 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                                    ✅
                                                </Badge>
                                            )}
                                            {step.status === 'next' && (
                                                <Badge className="text-[8px] px-1 py-0 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                                                    {isAr ? 'التالي' : 'Next'}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {isAr ? step.descriptionAr : step.descriptionEn}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Info note */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30">
                        <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                            <p className="font-medium">
                                {isAr
                                    ? '📌 الخطوة القادمة: إنشاء Edge Function في Supabase + ربطها بـ n8n'
                                    : '📌 Next: Create Supabase Edge Function + connect to n8n'}
                            </p>
                            <p className="text-amber-600 dark:text-amber-400">
                                {isAr
                                    ? 'هذا سيُمكّن: Email notifications · Telegram alerts · SMS reminders · Slack integrations'
                                    : 'This will enable: Email notifications · Telegram alerts · SMS reminders · Slack integrations'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Section 4: Current Active Triggers Info ── */}
            <Card className="bg-gray-50/50 dark:bg-gray-900/30 border-gray-200/80 dark:border-gray-800/50">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {isAr ? 'الـ Triggers النشطة حالياً في قاعدة البيانات:' : 'Currently active database triggers:'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    { icon: Ship, labelAr: 'trg_container_status_notification', labelEn: 'Container Status', color: 'text-blue-500' },
                                    { icon: ShoppingBag, labelAr: 'trg_purchase_invoice_notification', labelEn: 'Purchase Invoice', color: 'text-orange-500' },
                                    { icon: ShoppingCart, labelAr: 'trg_sales_invoice_notification', labelEn: 'Sales Invoice', color: 'text-green-500' },
                                ].map((trigger) => {
                                    const TIcon = trigger.icon;
                                    return (
                                        <div key={trigger.labelEn} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                            <TIcon className={cn("w-3.5 h-3.5", trigger.color)} />
                                            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate">
                                                {isAr ? trigger.labelEn : trigger.labelEn}
                                            </span>
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500 ms-auto shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
