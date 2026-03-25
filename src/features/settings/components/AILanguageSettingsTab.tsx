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
import { useNavigate } from 'react-router-dom';
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
    { id: 'telegram-users', labelAr: 'مستخدمو Telegram', labelEn: 'Telegram Users', icon: <Users className="w-3.5 h-3.5" /> },
];

// ─── Main Component ───────────────────────────────────────────
export default function AILanguageSettingsTab() {
    const { language } = useLanguage();
    const { companyId } = useCompany();
    const navigate = useNavigate();
    const isAr = language === 'ar';

    const [activeSubTab, setActiveSubTab] = useState('telegram-users');
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


    // Bot setup is now managed in Integrations page — this page only reads the status

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
            {/* ═══ Bot Status (read-only — setup is in Integrations page) ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-500" />
                        {isAr ? 'حالة البوت' : 'Bot Status'}
                        {tgConnected && <Badge className="bg-green-100 text-green-700 text-[10px]">✅ {isAr ? 'نشط' : 'Active'}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {tgConnected ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-green-700 dark:text-green-300">@{tgBotUsername}</div>
                                <div className="text-[10px] text-green-600">{isAr ? 'البوت نشط وجاهز — يمكنك ربط المستخدمين أدناه' : 'Bot is active — link users below'}</div>
                            </div>
                            <a href={`https://t.me/${tgBotUsername}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-green-300 text-green-600">
                                    <ExternalLink className="w-3 h-3" /> {isAr ? 'فتح' : 'Open'}
                                </Button>
                            </a>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-gray-400 hover:text-blue-500"
                                onClick={() => navigate('/system-config/integrations')}>
                                <Settings2 className="w-3 h-3" /> {isAr ? 'الإعدادات' : 'Settings'}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isAr ? 'البوت غير مُعَد بعد' : 'Bot not configured yet'}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    {isAr ? 'يجب إعداد بوت Telegram أولاً من صفحة التكاملات لتتمكن من ربط المستخدمين' : 'Set up the Telegram Bot from the Integrations page first to link users'}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                onClick={() => navigate('/system-config/integrations')}>
                                <Zap className="w-3.5 h-3.5" />
                                {isAr ? 'الذهاب لصفحة التكاملات' : 'Go to Integrations'}
                            </Button>
                        </div>
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
                                                                    <button onClick={() => navigate('/system-config/notifications')}
                                                                        className="ms-auto text-[9px] font-normal text-blue-500 hover:text-blue-700 hover:underline">
                                                                        {isAr ? 'إعدادات الشركة ↗' : 'Company settings ↗'}
                                                                    </button>
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

            {/* Content */}
            {renderTelegramUsersTab()}
        </div>
    );
}
