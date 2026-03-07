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
    Sun, Moon, AlertTriangle, Star, UserPlus, Languages, Trash2,
    Eye, EyeOff, ExternalLink, RefreshCw, Copy, AlertCircle,
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
    const [tgBotToken, setTgBotToken] = useState('');
    const [tgShowToken, setTgShowToken] = useState(false);
    const [tgSetupStatus, setTgSetupStatus] = useState<'idle' | 'setting' | 'success' | 'error'>('idle');
    const [tgVerificationCode, setTgVerificationCode] = useState('');
    const [tgSelectedUserId, setTgSelectedUserId] = useState('');
    const [systemUsers, setSystemUsers] = useState<any[]>([]);
    const [integrations, setIntegrations] = useState<any>({});

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

    // Load current settings + linked users + system users
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
                    setIntegrations(intg);
                    if (intg.telegram?.bot_token) {
                        setTgBotToken(intg.telegram.bot_token);
                    }
                    if (intg.telegram?.webhook_active && intg.telegram?.bot_username) {
                        setTgConnected(true);
                        setTgBotUsername(intg.telegram.bot_username);
                        setTgSetupStatus('success');
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

            // Load system users for linking
            const { data: users } = await supabase
                .from('user_profiles')
                .select('id, full_name, email, role')
                .eq('company_id', companyId)
                .order('full_name');
            if (users) setSystemUsers(users);

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

    const handleActivateBot = async () => {
        if (!tgBotToken.trim()) return;
        setTgSetupStatus('setting');
        try {
            const infoRes = await fetch(`https://api.telegram.org/bot${tgBotToken.trim()}/getMe`);
            const infoData = await infoRes.json();
            if (!infoData.ok) throw new Error(infoData.description || 'Invalid token');
            setTgBotUsername(infoData.result.username);

            const secret = crypto.randomUUID().replace(/-/g, '');
            const projectUrl = import.meta.env.VITE_SUPABASE_URL || '';
            const webhookUrl = `${projectUrl}/functions/v1/telegram-webhook`;
            const whRes = await fetch(`https://api.telegram.org/bot${tgBotToken.trim()}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
            });
            const whData = await whRes.json();
            if (!whData.ok) throw new Error(whData.description || 'Webhook failed');

            const telegramConfig = { bot_token: tgBotToken.trim(), bot_username: infoData.result.username, webhook_active: true, webhook_secret: secret };
            const newIntg = { ...integrations, telegram: telegramConfig };
            await supabase.from('companies').update({ integrations: newIntg }).eq('id', companyId);
            setIntegrations(newIntg);
            setTgConnected(true);
            setTgSetupStatus('success');
            toast({ title: isAr ? '✅ تم تفعيل البوت!' : '✅ Bot activated!', description: `@${infoData.result.username}` });
        } catch (err: any) {
            setTgSetupStatus('error');
            toast({ title: isAr ? '❌ خطأ' : '❌ Error', description: err.message, variant: 'destructive' });
        }
    };

    const handleGenerateCode = async () => {
        if (!tgSelectedUserId) return;
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            const { error } = await supabase.from('telegram_connections').insert({
                company_id: companyId, user_id: tgSelectedUserId, telegram_chat_id: 0,
                verification_code: code, is_active: false, connection_type: 'private',
            });
            if (error) { toast({ title: '❌', description: error.message, variant: 'destructive' }); return; }
            setTgVerificationCode(code);
            const u = systemUsers.find(u => u.id === tgSelectedUserId);
            toast({ title: isAr ? '✅ تم إنشاء الرمز' : '✅ Code generated', description: u?.full_name || '' });
        } catch (err: any) { toast({ title: '❌', description: err.message, variant: 'destructive' }); }
    };

    const renderTelegramUsersTab = () => (
        <div className="space-y-4">
            {/* ═══ Step 1: Bot Setup ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-500" />
                        {isAr ? 'إعداد البوت' : 'Bot Setup'}
                        {tgConnected && <Badge className="bg-green-100 text-green-700 text-[10px]">✅ {isAr ? 'نشط' : 'Active'}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {tgConnected ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-green-700 dark:text-green-300">@{tgBotUsername}</div>
                                <div className="text-[10px] text-green-600">{isAr ? 'البوت نشط وجاهز لاستقبال الرسائل' : 'Bot is active and ready'}</div>
                            </div>
                            <a href={`https://t.me/${tgBotUsername}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-green-300 text-green-600">
                                    <ExternalLink className="w-3 h-3" /> {isAr ? 'فتح' : 'Open'}
                                </Button>
                            </a>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] text-gray-400">
                                {isAr ? 'الصق Token البوت من @BotFather ثم اضغط تفعيل' : 'Paste bot token from @BotFather then click Activate'}
                            </p>
                            <div className="flex gap-2 items-center">
                                <div className="flex-1 relative">
                                    <input
                                        type={tgShowToken ? 'text' : 'password'}
                                        value={tgBotToken}
                                        onChange={e => setTgBotToken(e.target.value)}
                                        placeholder="1234567890:ABCdef..."
                                        className="w-full h-9 text-xs px-3 pe-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono"
                                    />
                                    <button onClick={() => setTgShowToken(!tgShowToken)} className="absolute end-2 top-2 text-gray-400">
                                        {tgShowToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <Button variant="outline" size="sm" disabled={!tgBotToken.trim() || tgSetupStatus === 'setting'}
                                    onClick={handleActivateBot}
                                    className={`gap-1.5 h-9 px-3 text-xs shrink-0 ${tgSetupStatus === 'success' ? 'border-green-500 text-green-600' : tgSetupStatus === 'error' ? 'border-red-500 text-red-600' : ''}`}>
                                    {tgSetupStatus === 'setting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                        tgSetupStatus === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                                    {isAr ? 'تفعيل' : 'Activate'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Step 2: Link Users ═══ */}
            {tgConnected && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-blue-500" />
                            {isAr ? 'ربط مستخدم جديد' : 'Link New User'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-[11px] text-gray-400">
                            {isAr ? 'اختر المستخدم من النظام ثم أنشئ رمز تحقق وأرسله للموظف ليربط حسابه عبر البوت' : 'Select user, generate code, send to employee to link via bot'}
                        </p>
                        <div className="flex gap-2 items-center">
                            <select value={tgSelectedUserId} onChange={e => setTgSelectedUserId(e.target.value)}
                                className="flex-1 h-8 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2">
                                <option value="">{isAr ? '— اختر المستخدم —' : '— Select User —'}</option>
                                {systemUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name || u.email} {u.role ? `(${u.role})` : ''}</option>
                                ))}
                            </select>
                            <Button variant="outline" size="sm" disabled={!tgSelectedUserId} onClick={handleGenerateCode} className="gap-1.5 h-8 text-xs shrink-0">
                                <RefreshCw className="w-3 h-3" /> {isAr ? 'إنشاء رمز' : 'Generate'}
                            </Button>
                        </div>
                        {tgVerificationCode && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200">
                                <span className="text-lg font-mono font-black text-indigo-700 dark:text-indigo-300 tracking-widest">{tgVerificationCode}</span>
                                <button onClick={() => { navigator.clipboard.writeText(tgVerificationCode); toast({ title: isAr ? '📋 تم النسخ' : '📋 Copied' }); }} className="text-indigo-400 hover:text-indigo-600">
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[9px] text-indigo-400">{isAr ? 'أرسله للبوت في Telegram' : 'Send to bot in Telegram'}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ Step 3: Linked Users List ═══ */}
            {tgConnected && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {isAr ? 'المستخدمون المربوطون' : 'Linked Users'}
                            {linkedUsers.length > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{linkedUsers.length}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {linkedUsers.length === 0 ? (
                            <div className="text-center py-6 text-gray-400">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">{isAr ? 'لم يتم ربط أي مستخدم بعد' : 'No users linked yet'}</p>
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
                                        <div className="flex items-center gap-1.5">
                                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                                                <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'مربوط' : 'Linked'}
                                            </Badge>
                                            <button onClick={async () => {
                                                if (!confirm(isAr ? 'إزالة ربط هذا المستخدم؟' : 'Remove this link?')) return;
                                                const { error } = await supabase.from('telegram_connections').delete().eq('id', user.id);
                                                if (!error) { setLinkedUsers(prev => prev.filter(u => u.id !== user.id)); toast({ title: '✅' }); }
                                                else toast({ title: '❌', description: error.message, variant: 'destructive' });
                                            }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors" title={isAr ? 'إزالة' : 'Unlink'}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ Groups ═══ */}
            {tgConnected && linkedGroups.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-blue-500" /> {isAr ? 'المجموعات' : 'Groups'}
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">{linkedGroups.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {linkedGroups.map(group => (
                                <div key={group.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                    <MessageCircle className="w-4 h-4 text-indigo-600" />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{group.telegram_first_name || (isAr ? 'مجموعة' : 'Group')}</div>
                                    </div>
                                    <Badge className="bg-green-100 text-green-700 text-[10px]">
                                        <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'نشط' : 'Active'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
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
