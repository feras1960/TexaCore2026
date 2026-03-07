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
    ChevronDown, ChevronUp, Settings2, Truck, Warehouse, DollarSign, CalendarDays,
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
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [tgBotUsername, setTgBotUsername] = useState('');
    const [tgBotToken, setTgBotToken] = useState('');
    const [tgShowToken, setTgShowToken] = useState(false);
    const [tgSetupStatus, setTgSetupStatus] = useState<'idle' | 'setting' | 'success' | 'error'>('idle');
    const [tgVerificationCode, setTgVerificationCode] = useState('');
    const [tgSelectedUserId, setTgSelectedUserId] = useState('');
    const [systemUsers, setSystemUsers] = useState<any[]>([]);
    const [integrations, setIntegrations] = useState<any>({});
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [savingPrefs, setSavingPrefs] = useState<string | null>(null);

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

            // Load system users for linking
            const { data: users } = await supabase
                .from('user_profiles')
                .select('id, full_name, email, role')
                .eq('company_id', companyId)
                .order('full_name');
            if (users) setSystemUsers(users);

            // Load warehouses for assignment dropdown
            const { data: whs } = await supabase
                .from('warehouses')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('name_ar');
            if (whs) setWarehouses(whs);

            // Enrich connections with user profile data
            if (connections) {
                const enriched = connections.map(c => {
                    const profile = users?.find(u => u.id === c.user_id);
                    return { ...c, user_profiles: profile || null };
                });
                setLinkedUsers(enriched.filter(c => c.connection_type === 'private'));
                setLinkedGroups(enriched.filter(c => c.connection_type !== 'private'));
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
            toast.success(isAr ? '✅ تم تفعيل البوت!' : '✅ Bot activated!', { description: `@${infoData.result.username}` });
        } catch (err: any) {
            setTgSetupStatus('error');
            toast.error(isAr ? '❌ خطأ' : '❌ Error', { description: err.message });
        }
    };

    const handleGenerateCode = async () => {
        if (!tgSelectedUserId) return;
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            // Delete any existing pending (unverified) connections for this user first
            await supabase.from('telegram_connections')
                .delete()
                .eq('company_id', companyId)
                .eq('user_id', tgSelectedUserId)
                .eq('is_active', false);

            const { error } = await supabase.from('telegram_connections').insert({
                company_id: companyId, user_id: tgSelectedUserId, telegram_chat_id: 0,
                verification_code: code, is_active: false, connection_type: 'private',
            });
            if (error) { toast.error(error.message); return; }
            setTgVerificationCode(code);
            const u = systemUsers.find(u => u.id === tgSelectedUserId);
            toast.success(isAr ? '✅ تم إنشاء الرمز' : '✅ Code generated', { description: u?.full_name || '' });
        } catch (err: any) { toast.error(err.message); }
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
                        <>
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
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-gray-400 hover:text-red-500"
                                    onClick={() => { setTgConnected(false); setTgSetupStatus('idle'); }}>
                                    <RefreshCw className="w-3 h-3" /> {isAr ? 'تغيير' : 'Change'}
                                </Button>
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-1 ps-8">
                                Token: {tgBotToken ? tgBotToken.substring(0, 8) + '••••••••' : '—'}
                            </div>
                        </>
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
                                <button onClick={() => { navigator.clipboard.writeText(tgVerificationCode); toast.success(isAr ? '📋 تم النسخ' : '📋 Copied'); }} className="text-indigo-400 hover:text-indigo-600">
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[9px] text-indigo-400">{isAr ? 'أرسله للبوت في Telegram' : 'Send to bot in Telegram'}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ Step 3: Linked Users Table ═══ */}
            {tgConnected && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {isAr ? 'المستخدمون المربوطون' : 'Linked Users'}
                            {linkedUsers.length > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{linkedUsers.length}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {linkedUsers.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 px-4">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">{isAr ? 'لم يتم ربط أي مستخدم بعد' : 'No users linked yet'}</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30">
                                            <th className="text-start text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5">{isAr ? 'المستخدم' : 'User'}</th>
                                            <th className="text-start text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-3 py-2.5">{isAr ? 'حساب Telegram' : 'Telegram'}</th>
                                            <th className="text-start text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-3 py-2.5">{isAr ? 'المسؤولية' : 'Responsibility'}</th>
                                            <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-3 py-2.5">{isAr ? 'الحالة' : 'Status'}</th>
                                            <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-3 py-2.5">{isAr ? 'إجراءات' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linkedUsers.map((user, idx) => {
                                            const profile = user.user_profiles;
                                            const sysName = profile?.full_name || profile?.email || '';
                                            const sysRole = profile?.role || '';
                                            const isExpanded = expandedUserId === user.id;
                                            const userPrefs = user.notification_preferences || {};
                                            const isLast = idx === linkedUsers.length - 1;

                                            const handleTogglePref = async (key: string) => {
                                                const newPrefs = { ...userPrefs, [key]: !userPrefs[key] };
                                                setSavingPrefs(user.id);
                                                const { error } = await supabase.from('telegram_connections')
                                                    .update({ notification_preferences: newPrefs })
                                                    .eq('id', user.id);
                                                if (!error) {
                                                    setLinkedUsers(prev => prev.map(u =>
                                                        u.id === user.id ? { ...u, notification_preferences: newPrefs } : u
                                                    ));
                                                } else toast.error(error.message);
                                                setSavingPrefs(null);
                                            };

                                            const NOTIF_CATEGORIES = [
                                                {
                                                    cat: isAr ? '📦 المستودعات' : '📦 Warehouse', items: [
                                                        { key: 'receipt_order', ar: 'إذن استلام', en: 'Receipt Order' },
                                                        { key: 'issue_order', ar: 'إذن تسليم/صرف', en: 'Issue Order' },
                                                        { key: 'shipment_arrival', ar: 'وصول حاوية/شحنة', en: 'Shipment Arrival' },
                                                        { key: 'warehouse_transfer', ar: 'تحويل مستودعي', en: 'Warehouse Transfer' },
                                                        { key: 'low_stock', ar: 'مخزون منخفض', en: 'Low Stock Alert' },
                                                        { key: 'inventory_task', ar: 'مهمة جرد', en: 'Inventory Task' },
                                                    ]
                                                },
                                                {
                                                    cat: isAr ? '💰 المالية' : '💰 Finance', items: [
                                                        { key: 'payment_received', ar: 'دفعة مستلمة', en: 'Payment Received' },
                                                        { key: 'payment_sent', ar: 'دفعة صادرة', en: 'Payment Sent' },
                                                        { key: 'invoice_due', ar: 'فاتورة مستحقة', en: 'Invoice Due' },
                                                        { key: 'credit_limit', ar: 'تجاوز حد ائتمان', en: 'Credit Limit Exceeded' },
                                                        { key: 'price_update', ar: 'تحديث أسعار', en: 'Price Update' },
                                                    ]
                                                },
                                                {
                                                    cat: isAr ? '🚚 المبيعات والتوصيل' : '🚚 Sales & Delivery', items: [
                                                        { key: 'sales_order', ar: 'طلب بيع جديد', en: 'New Sales Order' },
                                                        { key: 'delivery_route', ar: 'وجهة توصيل', en: 'Delivery Route' },
                                                        { key: 'delivery_delayed', ar: 'تأخر توصيل', en: 'Delivery Delayed' },
                                                    ]
                                                },
                                                {
                                                    cat: isAr ? '📊 التقارير' : '📊 Reports', items: [
                                                        { key: 'daily_report_am', ar: 'تقرير صباحي', en: 'Morning Report' },
                                                        { key: 'daily_report_pm', ar: 'تقرير مسائي', en: 'Evening Report' },
                                                        { key: 'meeting_scheduled', ar: 'اجتماع مجدول', en: 'Scheduled Meeting' },
                                                    ]
                                                },
                                            ];

                                            // Count active notifications
                                            const allKeys = NOTIF_CATEGORIES.flatMap(c => c.items.map(i => i.key));
                                            const activeCount = allKeys.filter(k => userPrefs[k] !== false).length;

                                            return (
                                                <React.Fragment key={user.id}>
                                                    <tr className={`${!isLast && !isExpanded ? 'border-b border-gray-50 dark:border-gray-800' : ''} hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors ${isExpanded ? 'bg-purple-50/30 dark:bg-purple-900/5' : ''}`}>
                                                        {/* System Name */}
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                        {(sysName || user.telegram_first_name || '?')[0]?.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                                                                        {sysName || user.telegram_first_name || (isAr ? 'مستخدم' : 'User')}
                                                                    </div>
                                                                    {sysName && user.telegram_first_name && sysName !== user.telegram_first_name && (
                                                                        <div className="text-[10px] text-gray-400 truncate">{user.telegram_first_name}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* Telegram Handle */}
                                                        <td className="px-3 py-2.5">
                                                            <span className="text-[12px] text-blue-600 dark:text-blue-400 font-mono">
                                                                {user.telegram_username ? `@${user.telegram_username}` : `#${user.telegram_chat_id}`}
                                                            </span>
                                                        </td>
                                                        {/* Responsibility (Role + Warehouses) */}
                                                        <td className="px-3 py-2.5">
                                                            <div className="space-y-1">
                                                                <select
                                                                    value={user.notification_role || ''}
                                                                    onChange={async (e) => {
                                                                        const newRole = e.target.value || null;
                                                                        const { error } = await supabase.from('telegram_connections')
                                                                            .update({ notification_role: newRole })
                                                                            .eq('id', user.id);
                                                                        if (!error) {
                                                                            setLinkedUsers(prev => prev.map(u =>
                                                                                u.id === user.id ? { ...u, notification_role: newRole } : u
                                                                            ));
                                                                        } else toast.error(error.message);
                                                                    }}
                                                                    className="h-7 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 w-full cursor-pointer"
                                                                >
                                                                    <option value="">{isAr ? '— اختر الدور —' : '— Select role —'}</option>
                                                                    <option value="warehouse_keeper">{isAr ? '📦 أمين مستودع' : '📦 Warehouse Keeper'}</option>
                                                                    <option value="accountant">{isAr ? '💰 محاسب' : '💰 Accountant'}</option>
                                                                    <option value="owner">{isAr ? '👑 مالك / مدير' : '👑 Owner / Manager'}</option>
                                                                    <option value="driver">{isAr ? '🚗 سائق' : '🚗 Driver'}</option>
                                                                    <option value="sales_manager">{isAr ? '🛒 مدير مبيعات' : '🛒 Sales Manager'}</option>
                                                                </select>
                                                                {user.notification_role === 'warehouse_keeper' && warehouses.length > 0 && (
                                                                    <select
                                                                        value={(user.assigned_warehouses || [])[0] || ''}
                                                                        onChange={async (e) => {
                                                                            const whId = e.target.value;
                                                                            const newWhs = whId ? [whId] : [];
                                                                            const { error } = await supabase.from('telegram_connections')
                                                                                .update({ assigned_warehouses: newWhs })
                                                                                .eq('id', user.id);
                                                                            if (!error) {
                                                                                setLinkedUsers(prev => prev.map(u =>
                                                                                    u.id === user.id ? { ...u, assigned_warehouses: newWhs } : u
                                                                                ));
                                                                            } else toast.error(error.message);
                                                                        }}
                                                                        className="h-7 text-[10px] rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-1.5 w-full cursor-pointer text-blue-700 dark:text-blue-300"
                                                                    >
                                                                        <option value="">{isAr ? '📍 كل المستودعات' : '📍 All warehouses'}</option>
                                                                        {warehouses.map(wh => (
                                                                            <option key={wh.id} value={wh.id}>
                                                                                {isAr ? (wh.name_ar || wh.name_en) : (wh.name_en || wh.name_ar)}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {/* Status */}
                                                        <td className="px-3 py-2.5 text-center">
                                                            <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] px-1.5 py-0.5">
                                                                <CheckCircle2 className="w-3 h-3 me-0.5" /> {isAr ? 'مربوط' : 'Linked'}
                                                            </Badge>
                                                        </td>
                                                        {/* Actions */}
                                                        <td className="px-3 py-2.5 text-center">
                                                            <div className="flex items-center justify-center gap-0.5">
                                                                <button onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                                                                    className={`p-1.5 rounded-md transition-all ${isExpanded ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-500'}`}
                                                                    title={isAr ? `تفضيلات الإشعارات (${activeCount}/${allKeys.length})` : `Notification Preferences (${activeCount}/${allKeys.length})`}>
                                                                    <Bell className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={async () => {
                                                                    if (!confirm(isAr ? 'إزالة ربط هذا المستخدم؟' : 'Remove this link?')) return;
                                                                    const { error } = await supabase.from('telegram_connections').delete().eq('id', user.id);
                                                                    if (!error) { setLinkedUsers(prev => prev.filter(u => u.id !== user.id)); toast.success('✅'); }
                                                                    else toast.error(error.message);
                                                                }} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors" title={isAr ? 'إزالة الربط' : 'Unlink'}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {/* Expanded: Notification Preferences */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-3 bg-gradient-to-b from-purple-50/40 to-white dark:from-purple-900/5 dark:to-gray-900 border-b border-purple-100 dark:border-purple-900/20">
                                                                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mb-2.5 flex items-center gap-1.5">
                                                                    <Bell className="w-3.5 h-3.5" />
                                                                    {isAr ? 'تفضيلات الإشعارات' : 'Notification Preferences'}
                                                                    <span className="text-[10px] font-normal text-gray-400">({activeCount}/{allKeys.length})</span>
                                                                    {savingPrefs === user.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                </div>
                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                                    {NOTIF_CATEGORIES.map(cat => (
                                                                        <div key={cat.cat} className="bg-white dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700">
                                                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 pb-1 border-b border-gray-100 dark:border-gray-700">{cat.cat}</div>
                                                                            <div className="space-y-0.5">
                                                                                {cat.items.map(item => (
                                                                                    <label key={item.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1">
                                                                                        <Switch
                                                                                            checked={userPrefs[item.key] !== false}
                                                                                            onCheckedChange={() => handleTogglePref(item.key)}
                                                                                            className="scale-[0.65]"
                                                                                        />
                                                                                        <span className="text-[11px] text-gray-600 dark:text-gray-300">{isAr ? item.ar : item.en}</span>
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
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

        // ─── Document Type Notification Config ──────────────
        const DOC_TYPES = [
            {
                id: 'sales',
                icon: '🧾',
                color: 'emerald',
                labelAr: 'فواتير المبيعات والتسليم',
                labelEn: 'Sales Invoices & Delivery',
                descAr: 'إشعارات عند إصدار فاتورة أو تسليم بضاعة',
                descEn: 'Notifications on invoice creation or goods delivery',
                parties: [
                    { key: 'sales_notify_customer', labelAr: '👤 العميل', labelEn: '👤 Customer', hintAr: 'إعلام العميل "بضاعتكم جاهزة"', hintEn: 'Notify customer "Your goods are ready"' },
                    { key: 'sales_notify_warehouse', labelAr: '📦 أمين المستودع', labelEn: '📦 Warehouse Keeper', hintAr: 'إشعار بإذن الصرف والتسليم', hintEn: 'Issue/delivery order notification' },
                    { key: 'sales_notify_accountant', labelAr: '💰 المحاسب', labelEn: '💰 Accountant', hintAr: 'فاتورة جديدة للمراجعة', hintEn: 'New invoice for review' },
                    { key: 'sales_notify_owner', labelAr: '👑 المالك', labelEn: '👑 Owner', hintAr: 'طلب بيع جديد', hintEn: 'New sales order' },
                ],
            },
            {
                id: 'purchases',
                icon: '📥',
                color: 'indigo',
                labelAr: 'المشتريات والاستلام',
                labelEn: 'Purchases & Receipts',
                descAr: 'إشعارات استلام البضائع وفواتير الشراء',
                descEn: 'Goods receipt and purchase invoice notifications',
                parties: [
                    { key: 'purchase_notify_warehouse', labelAr: '📦 أمين المستودع', labelEn: '📦 Warehouse Keeper', hintAr: 'إذن استلام بضاعة جديدة', hintEn: 'New goods receipt order' },
                    { key: 'purchase_notify_accountant', labelAr: '💰 المحاسب', labelEn: '💰 Accountant', hintAr: 'فاتورة شراء للمراجعة', hintEn: 'Purchase invoice for review' },
                    { key: 'purchase_notify_owner', labelAr: '👑 المالك', labelEn: '👑 Owner', hintAr: 'ملخص المشتريات اليومية', hintEn: 'Daily purchases summary' },
                ],
            },
            {
                id: 'containers',
                icon: '🚢',
                color: 'blue',
                labelAr: 'الحاويات والشحنات',
                labelEn: 'Containers & Shipments',
                descAr: 'إشعارات وصول الحاويات والتخليص الجمركي',
                descEn: 'Container arrival and customs clearance alerts',
                parties: [
                    { key: 'container_notify_warehouse', labelAr: '📦 أمين المستودع', labelEn: '📦 Warehouse Keeper', hintAr: 'وصول حاوية — جاهز للاستلام', hintEn: 'Container arrived — ready for receipt' },
                    { key: 'container_notify_owner', labelAr: '👑 المالك', labelEn: '👑 Owner', hintAr: 'تحديث حالة الشحنة', hintEn: 'Shipment status update' },
                ],
            },
            {
                id: 'transfers',
                icon: '🔄',
                color: 'purple',
                labelAr: 'المناقلات المستودعية',
                labelEn: 'Warehouse Transfers',
                descAr: 'إشعارات تحويل البضائع بين المستودعات',
                descEn: 'Goods transfer between warehouses notifications',
                parties: [
                    { key: 'transfer_notify_from_wh', labelAr: '📤 مستودع المصدر', labelEn: '📤 Source Warehouse', hintAr: 'تجهيز وإخراج البضاعة', hintEn: 'Prepare and dispatch goods' },
                    { key: 'transfer_notify_to_wh', labelAr: '📥 مستودع الوجهة', labelEn: '📥 Destination Warehouse', hintAr: 'بضاعة في الطريق إليك', hintEn: 'Goods incoming to you' },
                ],
            },
            {
                id: 'delivery',
                icon: '🚚',
                color: 'orange',
                labelAr: 'التوصيل والسائقين',
                labelEn: 'Delivery & Drivers',
                descAr: 'إشعارات مهام التوصيل والوجهات',
                descEn: 'Delivery tasks and route notifications',
                parties: [
                    { key: 'delivery_notify_driver', labelAr: '🚗 السائق', labelEn: '🚗 Driver', hintAr: 'وجهة ومعلومات العميل', hintEn: 'Destination and customer info' },
                    { key: 'delivery_notify_customer', labelAr: '👤 العميل', labelEn: '👤 Customer', hintAr: 'بضاعتكم في الطريق', hintEn: 'Your goods are on the way' },
                ],
            },
            {
                id: 'finance',
                icon: '💰',
                color: 'yellow',
                labelAr: 'المالية والدفعات',
                labelEn: 'Finance & Payments',
                descAr: 'إشعارات الدفعات وتجاوز الائتمان والأسعار',
                descEn: 'Payment, credit limit, and price update alerts',
                parties: [
                    { key: 'finance_notify_accountant', labelAr: '💰 المحاسب', labelEn: '💰 Accountant', hintAr: 'دفعات وفواتير مستحقة', hintEn: 'Payments and due invoices' },
                    { key: 'finance_notify_owner', labelAr: '👑 المالك', labelEn: '👑 Owner', hintAr: 'تنبيهات مالية هامة', hintEn: 'Critical financial alerts' },
                    { key: 'finance_notify_sales', labelAr: '🛒 فريق المبيعات', labelEn: '🛒 Sales Team', hintAr: 'تحديث الأسعار وحدود الائتمان', hintEn: 'Price updates and credit limits' },
                ],
            },
            {
                id: 'inventory',
                icon: '📊',
                color: 'red',
                labelAr: 'المخزون والجرد',
                labelEn: 'Inventory & Stock',
                descAr: 'تنبيهات المخزون المنخفض ومهام الجرد',
                descEn: 'Low stock alerts and inventory task assignments',
                parties: [
                    { key: 'stock_notify_warehouse', labelAr: '📦 أمين المستودع', labelEn: '📦 Warehouse Keeper', hintAr: 'مهام جرد ومخزون منخفض', hintEn: 'Inventory tasks and low stock' },
                    { key: 'stock_notify_owner', labelAr: '👑 المالك', labelEn: '👑 Owner', hintAr: 'تنبيهات المخزون الحرجة', hintEn: 'Critical stock alerts' },
                ],
            },
        ];

        const colorMap: Record<string, string> = {
            emerald: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800',
            indigo: 'from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800',
            blue: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800',
            purple: 'from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800',
            orange: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800',
            yellow: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800',
            red: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800',
        };

        return (
            <div className="space-y-4">
                {!tgConnected && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 text-center">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ {isAr ? 'اربط Telegram Bot أولاً لتفعيل الإشعارات' : 'Connect Telegram Bot first to enable notifications'}
                        </p>
                    </div>
                )}

                {/* ─── Title ─── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-4 h-4 text-purple-500" />
                            {isAr ? 'إعدادات الإشعارات حسب نوع المستند' : 'Notification Settings by Document Type'}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {isAr ? 'حدد من يستقبل إشعارات Telegram لكل عملية' : 'Choose who receives Telegram notifications for each operation'}
                        </p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-[10px]">
                        {DOC_TYPES.reduce((s, d) => s + d.parties.filter(p => (notifPrefs as any)[p.key] !== false).length, 0)}/{DOC_TYPES.reduce((s, d) => s + d.parties.length, 0)} {isAr ? 'مفعّل' : 'active'}
                    </Badge>
                </div>

                {/* ─── Document Type Cards ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {DOC_TYPES.map(doc => {
                        const activeCount = doc.parties.filter(p => (notifPrefs as any)[p.key] !== false).length;
                        const allActive = activeCount === doc.parties.length;

                        return (
                            <div key={doc.id} className={`rounded-xl border bg-gradient-to-br ${colorMap[doc.color]} p-3 space-y-2.5`}>
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{doc.icon}</span>
                                        <div>
                                            <div className="text-[13px] font-bold text-gray-900 dark:text-white">
                                                {isAr ? doc.labelAr : doc.labelEn}
                                            </div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {isAr ? doc.descAr : doc.descEn}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={`text-[9px] px-1.5 ${allActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                        {activeCount}/{doc.parties.length}
                                    </Badge>
                                </div>

                                {/* Party Toggles */}
                                <div className="space-y-0.5">
                                    {doc.parties.map(party => (
                                        <label key={party.key}
                                            className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-white/60 dark:hover:bg-gray-800/40 transition-colors">
                                            <Switch
                                                checked={(notifPrefs as any)[party.key] !== false}
                                                onCheckedChange={() => toggleNotif(party.key)}
                                                className="scale-[0.7]"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-medium text-gray-800 dark:text-gray-200">
                                                    {isAr ? party.labelAr : party.labelEn}
                                                </div>
                                                <div className="text-[10px] text-gray-400 truncate">
                                                    {isAr ? party.hintAr : party.hintEn}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ─── Schedule ─── */}
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
