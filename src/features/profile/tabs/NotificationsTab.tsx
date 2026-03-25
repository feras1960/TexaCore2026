/**
 * ════════════════════════════════════════════════════════════════
 * 🔔 NotificationsTab — الإشعارات والتلغرام
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { profileService, type FullUserProfile } from '../services/profileService';
import { supabase } from '@/lib/supabase';
import { sendTestNotification } from '@/services/telegramNotificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Bell, Send, CheckCircle2, Loader2, Mail, MessageSquare, BellRing,
    ShoppingCart, Package, FileCheck, Wallet, Users, Shield, BarChart3,
    Zap, TestTube2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTIFICATION_CATEGORIES = [
    { key: 'sales', iconComponent: ShoppingCart, color: 'text-emerald-600' },
    { key: 'purchases', iconComponent: Package, color: 'text-indigo-600' },
    { key: 'inventory', iconComponent: Package, color: 'text-amber-600' },
    { key: 'approvals', iconComponent: FileCheck, color: 'text-blue-600' },
    { key: 'finance', iconComponent: Wallet, color: 'text-purple-600' },
    { key: 'users', iconComponent: Users, color: 'text-cyan-600' },
    { key: 'security', iconComponent: Shield, color: 'text-red-600' },
    { key: 'reports', iconComponent: BarChart3, color: 'text-gray-600' },
];

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
    sales: { ar: 'المبيعات الجديدة', en: 'New Sales' },
    purchases: { ar: 'طلبات الشراء', en: 'Purchase Orders' },
    inventory: { ar: 'حركات المخزون', en: 'Stock Movements' },
    approvals: { ar: 'الموافقات المطلوبة', en: 'Pending Approvals' },
    finance: { ar: 'المعاملات المالية', en: 'Financial Transactions' },
    users: { ar: 'المستخدمين الجدد', en: 'New Users' },
    security: { ar: 'تنبيهات الأمان', en: 'Security Alerts' },
    reports: { ar: 'التقارير الأسبوعية', en: 'Weekly Reports' },
};

interface TelegramConnection {
    telegram_username: string;
    telegram_first_name: string;
    is_active: boolean;
    verified_at: string | null;
}

// ─── Test Notification Button ────────────────────────────
const CHANNEL_CONFIG = {
    telegram: { icon: Send, label: { ar: 'تجربة التلغرام', en: 'Test Telegram' }, color: 'bg-blue-600 hover:bg-blue-700' },
    email: { icon: Mail, label: { ar: 'تجربة الإيميل', en: 'Test Email' }, color: 'bg-purple-600 hover:bg-purple-700' },
    in_app: { icon: Bell, label: { ar: 'تجربة داخلي', en: 'Test In-App' }, color: 'bg-amber-600 hover:bg-amber-700' },
};

function TestButton({ channel, isAr }: { channel: 'telegram' | 'email' | 'in_app'; isAr: boolean }) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const config = CHANNEL_CONFIG[channel];
    const Icon = config.icon;

    const handleTest = async () => {
        setStatus('sending');
        try {
            const result = await sendTestNotification(channel);
            setStatus(result.ok ? 'success' : 'error');
        } catch {
            setStatus('error');
        }
        setTimeout(() => setStatus('idle'), 3000);
    };

    return (
        <Button
            size="sm"
            onClick={handleTest}
            disabled={status === 'sending'}
            className={cn(
                "gap-1.5 text-xs text-white transition-all",
                status === 'success' ? 'bg-green-600' :
                    status === 'error' ? 'bg-red-600' :
                        config.color
            )}
        >
            {status === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                    <Icon className="w-3.5 h-3.5" />}
            {status === 'success' ? (isAr ? 'تم ✓' : 'Sent ✓') :
                status === 'error' ? (isAr ? 'فشل' : 'Failed') :
                    config.label[isAr ? 'ar' : 'en']}
        </Button>
    );
}

export default function NotificationsTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [profile, setProfile] = useState<FullUserProfile | null>(null);
    const [telegramConn, setTelegramConn] = useState<TelegramConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [prefs, setPrefs] = useState<Record<string, { email: boolean; telegram: boolean; inapp: boolean }>>({});

    const isTelegramConnected = !!(telegramConn?.is_active && telegramConn?.verified_at);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const p = await profileService.getCurrentProfile();
            setProfile(p);

            // Check telegram_connections for actual link status
            if (p?.id) {
                const { data: tgConn } = await supabase
                    .from('telegram_connections')
                    .select('telegram_username, telegram_first_name, is_active, verified_at')
                    .eq('user_id', p.id)
                    .eq('is_active', true)
                    .maybeSingle();
                setTelegramConn(tgConn);
            }

            // Initialize prefs
            const existing = (p?.notification_preferences as any) || {};
            const initial: Record<string, any> = {};
            NOTIFICATION_CATEGORIES.forEach(cat => {
                initial[cat.key] = {
                    email: existing[cat.key]?.email ?? true,
                    telegram: existing[cat.key]?.telegram ?? false,
                    inapp: existing[cat.key]?.inapp ?? true,
                };
            });
            setPrefs(initial);
        } catch { }
        setLoading(false);
    };

    const togglePref = (category: string, channel: 'email' | 'telegram' | 'inapp') => {
        setPrefs(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [channel]: !prev[category][channel],
            },
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await profileService.updateProfile({ notification_preferences: prefs } as any);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { }
        setSaving(false);
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6 py-4 max-w-3xl mx-auto">
            {/* Telegram */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-500" />
                        {isAr ? 'ربط حساب تلغرام' : 'Connect Telegram'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isTelegramConnected ? (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <CheckCircle2 className="w-8 h-8 text-blue-600" />
                            <div className="flex-1">
                                <p className="font-semibold text-blue-800 dark:text-blue-400">
                                    {isAr ? 'تلغرام مربوط' : 'Telegram Connected'}
                                </p>
                                <p className="text-xs text-blue-600">
                                    @{telegramConn?.telegram_username} ({telegramConn?.telegram_first_name})
                                </p>
                            </div>
                            <TestButton channel="telegram" isAr={isAr} />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {isAr
                                    ? 'اربط حسابك بتلغرام لاستقبال الإشعارات الفورية'
                                    : 'Connect your Telegram to receive instant notifications'}
                            </p>
                            <ol className="text-sm text-gray-500 space-y-1.5 list-decimal list-inside">
                                <li>{isAr ? 'افتح @TexaCoreBot على تلغرام' : 'Open @TexaCoreBot on Telegram'}</li>
                                <li>{isAr ? 'أرسل الأمر /connect' : 'Send the /connect command'}</li>
                                <li>{isAr ? 'أدخل رمز التحقق الذي يظهر لك' : 'Enter the verification code shown'}</li>
                            </ol>
                            <Button className="gap-2 bg-[#0088cc] hover:bg-[#0077b3]">
                                <Send className="w-4 h-4" />
                                {isAr ? 'فتح بوت تلغرام' : 'Open Telegram Bot'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Test Notifications */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TestTube2 className="w-4 h-4 text-violet-600" />
                        {isAr ? 'تجربة الإشعارات' : 'Test Notifications'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 mb-3">
                        {isAr ? 'أرسل إشعار تجريبي للتحقق من عمل القنوات' : 'Send a test notification to verify channels work'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <TestButton channel="in_app" isAr={isAr} />
                        <TestButton channel="email" isAr={isAr} />
                        {isTelegramConnected && (
                            <TestButton channel="telegram" isAr={isAr} />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-amber-600" />
                        {isAr ? 'تفضيلات الإشعارات' : 'Notification Preferences'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 mb-3 text-xs text-gray-500 font-medium text-center">
                        <div></div>
                        <div className="flex flex-col items-center gap-0.5">
                            <Mail className="w-3.5 h-3.5" />
                            {isAr ? 'إيميل' : 'Email'}
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <Send className="w-3.5 h-3.5" />
                            {isAr ? 'تلغرام' : 'Telegram'}
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <Bell className="w-3.5 h-3.5" />
                            {isAr ? 'داخلي' : 'In-App'}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                        {NOTIFICATION_CATEGORIES.map(cat => {
                            const Icon = cat.iconComponent;
                            const pref = prefs[cat.key];
                            if (!pref) return null;
                            return (
                                <div key={cat.key} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center py-2 border-b last:border-0">
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn("w-4 h-4", cat.color)} />
                                        <span className="text-sm">{CATEGORY_LABELS[cat.key]?.[isAr ? 'ar' : 'en']}</span>
                                    </div>
                                    <div className="flex justify-center">
                                        <Switch checked={pref.email} onCheckedChange={() => togglePref(cat.key, 'email')} className="scale-75" />
                                    </div>
                                    <div className="flex justify-center">
                                        <Switch
                                            checked={pref.telegram}
                                            onCheckedChange={() => togglePref(cat.key, 'telegram')}
                                            disabled={!isTelegramConnected}
                                            className="scale-75"
                                        />
                                    </div>
                                    <div className="flex justify-center">
                                        <Switch checked={pref.inapp} onCheckedChange={() => togglePref(cat.key, 'inapp')} className="scale-75" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={saving} className={cn("gap-2 min-w-[140px]", saved ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700")}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : saved ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓') : (isAr ? 'حفظ التفضيلات' : 'Save Preferences')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
