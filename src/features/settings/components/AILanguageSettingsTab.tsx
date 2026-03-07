/**
 * AILanguageSettingsTab — مركز وكيل نيكسا الذكي
 * ════════════════════════════════════════════════════════
 * Sub-tabs:
 * 1. الحالة والميزات — Overview of all NexaAgent features
 * 2. مستخدمو Telegram — Link employees to Telegram bot
 * 3. الإشعارات — Notification preferences per role
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Sparkles, Check, Loader2, Bot, Zap,
    Send, Users, Bell, Shield, CheckCircle2,
    MessageCircle, Clock, TrendingUp, Package,
    Sun, Moon, AlertTriangle, Star, UserPlus, Languages,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────
interface SubTab {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: React.ReactNode;
}

const SUB_TABS: SubTab[] = [
    { id: 'status', labelAr: 'الحالة والميزات', labelEn: 'Status & Features', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'telegram-users', labelAr: 'مستخدمو Telegram', labelEn: 'Telegram Users', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'notifications', labelAr: 'الإشعارات', labelEn: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
];

// ─── Main Component ───────────────────────────────────────────
export default function AILanguageSettingsTab() {
    const { language } = useLanguage();
    const { companyId } = useCompany();
    const isAr = language === 'ar';

    const [activeSubTab, setActiveSubTab] = useState('status');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);

    // Telegram state
    const [tgConnected, setTgConnected] = useState(false);
    const [linkedUsers, setLinkedUsers] = useState<any[]>([]);
    const [linkedGroups, setLinkedGroups] = useState<any[]>([]);
    const [tgBotUsername, setTgBotUsername] = useState('');

    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState({
        daily_report: true,
        workflow_alerts: true,
        customer_reminders: true,
        price_updates: false,
        motivational: true,
        report_time_morning: '08:00',
        report_time_evening: '18:00',
    });

    // Load current settings + linked users
    useEffect(() => {
        if (!companyId) return;
        (async () => {
            setLoading(true);
            // Load company settings
            const { data, error } = await supabase
                .from('companies')
                .select('settings, integrations')
                .eq('id', companyId)
                .single();

            if (!error && data) {
                if (data.settings && typeof data.settings === 'object') {
                    if ((data.settings as any).notification_preferences) {
                        setNotifPrefs(prev => ({ ...prev, ...(data.settings as any).notification_preferences }));
                    }
                }
                if (data.integrations && typeof data.integrations === 'object') {
                    const intg = data.integrations as any;
                    if (intg.telegram?.webhook_active && intg.telegram?.bot_username) {
                        setTgConnected(true);
                        setTgBotUsername(intg.telegram.bot_username);
                    }
                }
            }

            // Load linked Telegram connections
            const { data: connections } = await supabase
                .from('telegram_connections')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (connections) {
                setLinkedUsers(connections.filter(c => c.connection_type === 'private'));
                setLinkedGroups(connections.filter(c => c.connection_type !== 'private'));
            }

            setLoading(false);
        })();
    }, [companyId]);

    const handleSave = async () => {
        if (!companyId) return;
        setSaving(true);
        try {
            // Get current settings first to avoid overwriting
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
                        notification_preferences: notifPrefs,
                    },
                })
                .eq('id', companyId);

            if (error) throw error;
            toast.success(isAr ? '✅ تم حفظ الإعدادات' : '✅ Settings saved');
            setHasChanges(false);
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(isAr ? 'فشل الحفظ' : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
        );
    }

    // ─── Sub-tab Content Renderers ────────────────────────────

    const renderStatusTab = () => (
        <div className="space-y-4">
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* NexaAgent AI */}
                <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {isAr ? 'وكيل نيكسا برو' : 'NexaPro Agent'}
                                    </span>
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                                        <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'مفعّل' : 'Active'}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{isAr ? 'ذكاء اصطناعي متقدم' : 'Advanced AI'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Smart Translation */}
                <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md shrink-0">
                                <Languages className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {isAr ? 'الترجمة الذكية' : 'Smart Translation'}
                                    </span>
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                                        <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'تلقائي' : 'Auto'}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{isAr ? 'كل اللغات المدعومة' : 'All supported languages'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Telegram Bot */}
                <Card className={cn(
                    tgConnected
                        ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10"
                        : "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10"
                )}>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shrink-0">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Telegram</span>
                                    {tgConnected ? (
                                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                                            <CheckCircle2 className="w-3 h-3 me-0.5" /> @{tgBotUsername}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                            <AlertTriangle className="w-3 h-3 me-0.5" /> {isAr ? 'غير مربوط' : 'Not Set'}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    {tgConnected ? (isAr ? 'إجراءات وإشعارات' : 'Actions & alerts') : (isAr ? 'اربط من التكاملات' : 'Connect from Integrations')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-950/10">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shrink-0">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {isAr ? 'إجراءات سريعة' : 'Quick Actions'}
                                    </span>
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                                        {isAr ? '🔜 قريباً' : '🔜 Soon'}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{isAr ? 'من المحادثة' : 'Via chat'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Banner */}
            <div className="rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 p-4 border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">🧠</span>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {isAr ? 'وكيل نيكسا برو — مدمج بالنظام' : 'NexaPro Agent — Built-in'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-5">
                            {isAr
                                ? 'وكيل نيكسا برو مدمج بالنظام ويعمل تلقائياً — تحليلات ذكية، ترجمة فورية لكل اللغات، ومحادثة مع بيانات حقيقية. قريباً: إجراءات سريعة من المحادثة وإشعارات Telegram.'
                                : 'NexaPro Agent is built-in and works automatically — smart analytics, instant translation for all languages, and real-data chat. Coming soon: quick actions via chat and Telegram notifications.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTelegramUsersTab = () => (
        <div className="space-y-4">
            {!tgConnected ? (
                /* Not Connected Banner */
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
                    <CardContent className="py-8 text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto shadow-lg">
                            <Send className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                            {isAr ? 'Telegram Bot غير مربوط' : 'Telegram Bot Not Connected'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            {isAr
                                ? 'لربط المستخدمين عبر Telegram، يجب أولاً إنشاء بوت وربطه من الإعدادات → التكاملات'
                                : 'To link users via Telegram, first create a bot and connect it from Settings → Integrations'}
                        </p>
                        <Button variant="outline" className="gap-2 mt-2"
                            onClick={() => window.location.href = '/system-config/integrations'}>
                            <Shield className="w-4 h-4" />
                            {isAr ? 'الذهاب إلى التكاملات' : 'Go to Integrations'}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Bot Status */}
                    <Card className="border-green-200 dark:border-green-800">
                        <CardContent className="py-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-green-700 dark:text-green-300">@{tgBotUsername}</span>
                                    <span className="text-xs text-green-600 ms-2">{isAr ? 'متصل وجاهز' : 'Connected & Ready'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Linked Users */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    {isAr ? 'المستخدمون المربوطون' : 'Linked Users'}
                                    {linkedUsers.length > 0 && (
                                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">{linkedUsers.length}</Badge>
                                    )}
                                </CardTitle>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                                    onClick={() => window.location.href = '/system-config/integrations'}>
                                    <UserPlus className="w-3.5 h-3.5" />
                                    {isAr ? 'ربط مستخدم' : 'Link User'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {linkedUsers.length === 0 ? (
                                <div className="text-center py-6 text-gray-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">{isAr ? 'لم يتم ربط أي مستخدم بعد' : 'No users linked yet'}</p>
                                    <p className="text-xs mt-1">{isAr ? 'أنشئ رمز تحقق من التكاملات وأرسله للموظف' : 'Generate a code from Integrations and send it to the employee'}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {linkedUsers.map(user => (
                                        <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <Send className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.telegram_first_name || (isAr ? 'مستخدم' : 'User')}
                                                </div>
                                                <div className="text-[11px] text-gray-400">
                                                    {user.telegram_username ? `@${user.telegram_username}` : `ID: ${user.telegram_chat_id}`}
                                                </div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                                                <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'مربوط' : 'Linked'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Groups */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-blue-500" />
                                    {isAr ? 'المجموعات' : 'Groups'}
                                    {linkedGroups.length > 0 && (
                                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">{linkedGroups.length}</Badge>
                                    )}
                                </CardTitle>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                                    <UserPlus className="w-3.5 h-3.5" />
                                    {isAr ? 'ربط مجموعة' : 'Link Group'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {linkedGroups.length === 0 ? (
                                <div className="text-center py-6 text-gray-400">
                                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">{isAr ? 'لم يتم ربط أي مجموعة بعد' : 'No groups linked yet'}</p>
                                    <p className="text-xs mt-1">{isAr ? 'أضف البوت إلى مجموعة Telegram لتفعيل التقارير الجماعية' : 'Add the bot to a Telegram group to enable team reports'}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {linkedGroups.map(group => (
                                        <div key={group.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                <MessageCircle className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {group.telegram_first_name || (isAr ? 'مجموعة' : 'Group')}
                                                </div>
                                                <div className="text-[11px] text-gray-400">
                                                    {group.connection_type} • ID: {group.telegram_chat_id}
                                                </div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                                                <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'نشط' : 'Active'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );

    const renderNotificationsTab = () => {
        const toggleNotif = (key: string) => {
            setNotifPrefs(prev => ({ ...prev, [key]: !(prev as any)[key] }));
            setHasChanges(true);
        };

        const notifItems = [
            { key: 'daily_report', icon: <Sun className="w-4 h-4 text-amber-500" />, labelAr: 'تقرير صباحي يومي', labelEn: 'Daily Morning Report', descAr: 'ملخص المبيعات والمهام لكل موظف عند بداية اليوم', descEn: 'Sales summary and tasks for each employee at start of day' },
            { key: 'workflow_alerts', icon: <Package className="w-4 h-4 text-blue-500" />, labelAr: 'تنبيهات سير العمل', labelEn: 'Workflow Alerts', descAr: 'كونتينر وصل، فاتورة جديدة، مخزون منخفض', descEn: 'Container arrival, new invoice, low inventory' },
            { key: 'customer_reminders', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, labelAr: 'تذكير الزبائن المتأخرين', labelEn: 'Late Customer Reminders', descAr: 'تنبيه بالزبائن المتأخرين بالدفع', descEn: 'Alert for customers with overdue payments' },
            { key: 'price_updates', icon: <TrendingUp className="w-4 h-4 text-green-500" />, labelAr: 'تحديثات الأسعار', labelEn: 'Price Updates', descAr: 'إرسال تحديثات الأسعار لفريق المبيعات', descEn: 'Send price updates to sales team' },
            { key: 'motivational', icon: <Star className="w-4 h-4 text-yellow-500" />, labelAr: 'رسائل تحفيزية', labelEn: 'Motivational Messages', descAr: 'نجم اليوم، أفضل أداء، تشجيع الفريق', descEn: 'Star of the day, best performance, team encouragement' },
        ];

        return (
            <div className="space-y-4">
                {!tgConnected && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 text-center">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ {isAr ? 'اربط Telegram Bot أولاً لتفعيل الإشعارات الخارجية' : 'Connect Telegram Bot first to enable external notifications'}
                        </p>
                    </div>
                )}

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Bell className="w-4 h-4 text-purple-500" />
                            {isAr ? 'أنواع الإشعارات' : 'Notification Types'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {isAr ? 'اختر الإشعارات التي تُرسل عبر Telegram لفريقك' : 'Choose which notifications to send via Telegram to your team'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {notifItems.map(item => (
                            <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {isAr ? item.labelAr : item.labelEn}
                                    </div>
                                    <div className="text-[11px] text-gray-400 truncate">
                                        {isAr ? item.descAr : item.descEn}
                                    </div>
                                </div>
                                <Switch
                                    checked={(notifPrefs as any)[item.key]}
                                    onCheckedChange={() => toggleNotif(item.key)}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Schedule */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            {isAr ? 'أوقات الإرسال' : 'Send Schedule'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Sun className="w-3 h-3 text-amber-500" />
                                    {isAr ? 'التقرير الصباحي' : 'Morning Report'}
                                </Label>
                                <input type="time" value={notifPrefs.report_time_morning}
                                    onChange={(e) => { setNotifPrefs(p => ({ ...p, report_time_morning: e.target.value })); setHasChanges(true); }}
                                    className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" dir="ltr" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Moon className="w-3 h-3 text-indigo-500" />
                                    {isAr ? 'ملخص نهاية اليوم' : 'End of Day Summary'}
                                </Label>
                                <input type="time" value={notifPrefs.report_time_evening}
                                    onChange={(e) => { setNotifPrefs(p => ({ ...p, report_time_evening: e.target.value })); setHasChanges(true); }}
                                    className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" dir="ltr" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // ─── Main Render ──────────────────────────────────────────
    return (
        <div className="space-y-5 py-4">

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isAr ? 'مركز وكيل نيكسا برو' : 'NexaPro Control Center'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isAr ? 'إعدادات الذكاء الاصطناعي، Telegram، والإشعارات' : 'AI settings, Telegram, and notifications'}
                    </p>
                </div>
                {hasChanges && (
                    <Button onClick={handleSave} disabled={saving}
                        className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isAr ? 'حفظ' : 'Save'}
                    </Button>
                )}
            </div>

            {/* Sub-tabs Bar */}
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                {SUB_TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            activeSubTab === tab.id
                                ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm border border-gray-200 dark:border-gray-600"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
                        )}>
                        {tab.icon}
                        <span className="hidden sm:inline">{isAr ? tab.labelAr : tab.labelEn}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeSubTab === 'status' && renderStatusTab()}
                {activeSubTab === 'telegram-users' && renderTelegramUsersTab()}
                {activeSubTab === 'notifications' && renderNotificationsTab()}
            </div>
        </div>
    );
}
