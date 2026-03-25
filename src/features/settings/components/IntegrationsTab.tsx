/**
 * ════════════════════════════════════════════════════════════════
 * 🔗 IntegrationsTab — Unified Integrations Table
 * ════════════════════════════════════════════════════════════════
 * 
 * Manages ALL external service integrations in one unified table:
 * - Twilio (WhatsApp, SMS, Voice)
 * - Telegram (Bot notifications)
 * - Google Workspace (Sheets, Calendar, Drive, Meet)
 * - Nova Poshta (Shipping Carrier API)
 * 
 * Features:
 * - Unified table with status, details, actions
 * - Add Integration wizard (dialog)
 * - Edit / Test / Enable-Disable / Delete per row
 * - Reusable: can be embedded in Exchange Settings or other pages
 * 
 * Reads/writes from: companies.integrations (JSONB column)
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Truck, Save, CheckCircle2, AlertCircle,
    Loader2, Eye, EyeOff, ExternalLink,
    Shield, Zap, Settings, Link2, Unlink,
    Calendar, FileSpreadsheet, HardDrive,
    Video, RefreshCw, Phone, MessageCircle,
    Plus, Pencil, Trash2, Power, PowerOff,
    Bot, X, ChevronRight, Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────
type IntegrationType = 'twilio' | 'telegram' | 'google' | 'nova_poshta';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface IntegrationConfig {
    connected?: boolean;
    enabled?: boolean;
    connected_at?: string;
    // Twilio
    account_sid?: string;
    auth_token?: string;
    whatsapp_sender?: string;
    friendly_name?: string;
    // Telegram
    bot_token?: string;
    bot_username?: string;
    chat_id?: string;
    // Google
    connected_email?: string;
    connected_name?: string;
    connected_picture?: string;
    scopes?: string[];
    // Nova Poshta
    api_key?: string;
    sender_ref?: string;
    sender_city_ref?: string;
    sender_address_ref?: string;
    sender_contact_ref?: string;
    sender_phone?: string;
}

interface Integrations {
    [key: string]: IntegrationConfig | undefined;
    twilio?: IntegrationConfig;
    telegram?: IntegrationConfig;
    google?: IntegrationConfig;
    nova_poshta?: IntegrationConfig;
}

// ─── Integration definitions ──────────────────────────────────
const INTEGRATION_DEFS: Record<IntegrationType, {
    icon: React.ElementType;
    color: string;
    gradient: string;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    link?: string;
    linkLabel?: string;
}> = {
    twilio: {
        icon: Phone,
        color: 'red',
        gradient: 'from-red-500 to-red-600',
        labelAr: 'Twilio',
        labelEn: 'Twilio',
        descAr: 'واتس آب، SMS، اتصالات صوتية',
        descEn: 'WhatsApp, SMS, Voice Calls',
        link: 'https://console.twilio.com',
        linkLabel: 'Console',
    },
    telegram: {
        icon: Bot,
        color: 'blue',
        gradient: 'from-blue-500 to-blue-600',
        labelAr: 'Telegram Bot',
        labelEn: 'Telegram Bot',
        descAr: 'إشعارات ذكية عبر البوت',
        descEn: 'Smart notifications via Bot',
        link: 'https://t.me/BotFather',
        linkLabel: 'BotFather',
    },
    google: {
        icon: Calendar,
        color: 'emerald',
        gradient: 'from-emerald-500 to-emerald-600',
        labelAr: 'Google Workspace',
        labelEn: 'Google Workspace',
        descAr: 'Sheets، التقويم، Drive، Meet',
        descEn: 'Sheets, Calendar, Drive, Meet',
    },
    nova_poshta: {
        icon: Truck,
        color: 'orange',
        gradient: 'from-orange-500 to-orange-600',
        labelAr: 'Nova Poshta',
        labelEn: 'Nova Poshta',
        descAr: 'إنشاء بوالص الشحن، تتبع الشحنات',
        descEn: 'Shipping waybills, Tracking',
        link: 'https://developers.novaposhta.ua/',
        linkLabel: 'API Docs',
    },
};

// ─── Component ────────────────────────────────────────────────
export default function IntegrationsTab() {
    const { language } = useLanguage();
    const { toast } = useToast();
    const { companyId } = useCompany();
    const isAr = language === 'ar';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [integrations, setIntegrations] = useState<Integrations>({});

    // Dialog states
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<IntegrationType | null>(null);
    const [wizardStep, setWizardStep] = useState(0); // 0=choose type, 1=config
    const [wizardEditing, setWizardEditing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<IntegrationType | null>(null);

    // Form fields (shared across wizard)
    const [formData, setFormData] = useState<IntegrationConfig>({});
    const [showSecret, setShowSecret] = useState(false);
    const [testStatus, setTestStatus] = useState<TestStatus>('idle');

    // Google OAuth
    const [googleLoading, setGoogleLoading] = useState(false);

    // ─── Load ────────────────────────────────────────────────────
    const loadIntegrations = useCallback(async () => {
        if (!companyId) return;
        try {
            setLoading(true);
            const { data: company } = await supabase
                .from('companies')
                .select('integrations')
                .eq('id', companyId)
                .single();
            setIntegrations(company?.integrations || {});
        } catch (err) {
            console.error('Error loading integrations:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

    // Google OAuth callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        if (code && state && companyId) {
            const exchangeCode = async () => {
                setGoogleLoading(true);
                try {
                    const redirectUri = window.location.origin + window.location.pathname;
                    const { data, error } = await supabase.functions.invoke('google-integration', {
                        body: { action: 'exchange_code', company_id: companyId, code, redirect_uri: redirectUri },
                    });
                    if (error) throw error;
                    if (data?.success) {
                        toast({ title: isAr ? '✅ تم ربط Google!' : '✅ Google Connected!', description: data.email });
                        loadIntegrations();
                    } else throw new Error(data?.error || 'Unknown error');
                } catch (err: any) {
                    toast({ title: isAr ? '❌ فشل' : '❌ Failed', description: err.message, variant: 'destructive' });
                } finally {
                    setGoogleLoading(false);
                    window.history.replaceState({}, '', window.location.pathname);
                }
            };
            exchangeCode();
        }
        if (params.get('error')) {
            toast({ title: isAr ? '❌ فشل Google' : '❌ Google Failed', description: params.get('error') || '', variant: 'destructive' });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [companyId]);

    // ─── Save single integration ─────────────────────────────────
    const saveIntegration = async (type: IntegrationType, config: IntegrationConfig) => {
        if (!companyId) return;
        setSaving(true);
        try {
            const updated = { ...integrations, [type]: { ...config, enabled: config.enabled !== false } };
            const { error } = await supabase
                .from('companies')
                .update({ integrations: updated })
                .eq('id', companyId);
            if (error) throw error;
            setIntegrations(updated);
            toast({ title: isAr ? '✅ تم الحفظ' : '✅ Saved' });
        } catch (err: any) {
            toast({ title: isAr ? '❌ خطأ' : '❌ Error', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    // ─── Toggle enabled ──────────────────────────────────────────
    const toggleEnabled = async (type: IntegrationType) => {
        const current = integrations[type];
        if (!current) return;
        const updated = { ...current, enabled: current.enabled === false ? true : false };
        await saveIntegration(type, updated);
    };

    // ─── Delete integration ──────────────────────────────────────
    const deleteIntegration = async (type: IntegrationType) => {
        if (!companyId) return;
        setSaving(true);
        try {
            const updated = { ...integrations };
            delete updated[type];
            const { error } = await supabase
                .from('companies')
                .update({ integrations: updated })
                .eq('id', companyId);
            if (error) throw error;
            setIntegrations(updated);
            toast({ title: isAr ? '✅ تم الحذف' : '✅ Deleted' });
        } catch (err: any) {
            toast({ title: isAr ? '❌ خطأ' : '❌ Error', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
            setDeleteTarget(null);
        }
    };

    // ─── Google: Connect/Disconnect ──────────────────────────────
    const connectGoogle = async () => {
        if (!companyId) return;
        setGoogleLoading(true);
        try {
            const redirectUrl = window.location.origin + '/system-config/integrations';
            const { data, error } = await supabase.functions.invoke('google-integration', {
                body: { action: 'authorize', company_id: companyId, redirect_url: redirectUrl },
            });
            if (error) throw error;
            if (data?.auth_url) window.location.href = data.auth_url;
        } catch (err: any) {
            toast({ title: isAr ? '❌ خطأ' : '❌ Error', description: err.message, variant: 'destructive' });
            setGoogleLoading(false);
        }
    };

    const disconnectGoogle = async () => {
        if (!companyId) return;
        setGoogleLoading(true);
        try {
            const { error } = await supabase.functions.invoke('google-integration', {
                body: { action: 'disconnect', company_id: companyId },
            });
            if (error) throw error;
            const updated = { ...integrations };
            delete updated.google;
            setIntegrations(updated);
            toast({ title: isAr ? '✅ تم فصل Google' : '✅ Google Disconnected' });
        } catch (err: any) {
            toast({ title: isAr ? '❌ خطأ' : '❌ Error', description: err.message, variant: 'destructive' });
        } finally {
            setGoogleLoading(false);
        }
    };

    // ─── Test Connection ─────────────────────────────────────────
    const testConnection = async (type: IntegrationType, config: IntegrationConfig) => {
        setTestStatus('testing');
        try {
            if (type === 'twilio') {
                const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.account_sid?.trim()}.json`, {
                    headers: { 'Authorization': 'Basic ' + btoa(`${config.account_sid?.trim()}:${config.auth_token?.trim()}`) },
                });
                if (resp.ok) {
                    const data = await resp.json();
                    setTestStatus('success');
                    setFormData(prev => ({ ...prev, friendly_name: data.friendly_name, connected: true, connected_at: new Date().toISOString() }));
                    toast({ title: isAr ? '✅ متصل!' : '✅ Connected!', description: data.friendly_name });
                } else { setTestStatus('error'); toast({ title: '❌', description: `HTTP ${resp.status}`, variant: 'destructive' }); }
            } else if (type === 'telegram') {
                const resp = await fetch(`https://api.telegram.org/bot${config.bot_token?.trim()}/getMe`);
                const data = await resp.json();
                if (data.ok) {
                    setTestStatus('success');
                    setFormData(prev => ({ ...prev, bot_username: data.result.username, connected: true, connected_at: new Date().toISOString() }));
                    toast({ title: isAr ? '✅ متصل!' : '✅ Connected!', description: `@${data.result.username}` });
                } else { setTestStatus('error'); toast({ title: '❌', description: data.description, variant: 'destructive' }); }
            } else if (type === 'nova_poshta') {
                const { data, error } = await supabase.functions.invoke('nova-poshta', {
                    body: { action: 'getCounterparties', apiKey: config.api_key?.trim(), params: { CounterpartyProperty: 'Sender', Page: '1' } },
                });
                if (error) throw error;
                if (data?.success) {
                    setTestStatus('success');
                    setFormData(prev => ({ ...prev, connected: true, connected_at: new Date().toISOString() }));
                    toast({ title: isAr ? '✅ متصل!' : '✅ Connected!', description: `${data.data?.length || 0} sender(s)` });
                } else { setTestStatus('error'); toast({ title: '❌', description: data?.errors?.join(', '), variant: 'destructive' }); }
            }
        } catch (err: any) {
            setTestStatus('error');
            toast({ title: '❌', description: err.message, variant: 'destructive' });
        }
    };

    // ─── Open Wizard ─────────────────────────────────────────────
    const openAddWizard = () => {
        setWizardType(null);
        setWizardStep(0);
        setFormData({});
        setShowSecret(false);
        setTestStatus('idle');
        setWizardEditing(false);
        setWizardOpen(true);
    };

    const openEditWizard = (type: IntegrationType) => {
        setWizardType(type);
        setWizardStep(1);
        setFormData({ ...integrations[type] } || {});
        setShowSecret(false);
        setTestStatus(integrations[type]?.connected ? 'success' : 'idle');
        setWizardEditing(true);
        setWizardOpen(true);
    };

    const handleWizardSave = async () => {
        if (!wizardType) return;
        await saveIntegration(wizardType, { ...formData, connected: testStatus === 'success' || formData.connected });
        setWizardOpen(false);
    };

    // ─── Active integrations list ────────────────────────────────
    const activeTypes = Object.keys(integrations).filter(
        k => Object.keys(INTEGRATION_DEFS).includes(k) && integrations[k]
    ) as IntegrationType[];

    const availableToAdd = (Object.keys(INTEGRATION_DEFS) as IntegrationType[]).filter(
        k => !activeTypes.includes(k)
    );

    // ─── Helpers ─────────────────────────────────────────────────
    const getDetail = (type: IntegrationType, config: IntegrationConfig): string => {
        switch (type) {
            case 'twilio': return config.whatsapp_sender || config.account_sid?.slice(0, 10) + '...' || '';
            case 'telegram': return config.bot_username ? `@${config.bot_username}` : (config.bot_token?.slice(0, 10) + '...' || '');
            case 'google': return config.connected_email || '';
            case 'nova_poshta': return config.api_key ? '••••' + config.api_key.slice(-6) : '';
            default: return '';
        }
    };

    const getStatusBadge = (type: IntegrationType, config: IntegrationConfig) => {
        if (config.enabled === false) {
            return <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-400">⏸ {isAr ? 'معطل' : 'Disabled'}</Badge>;
        }
        if (config.connected) {
            return <Badge variant="outline" className="text-[10px] border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20">✅ {isAr ? 'متصل' : 'Connected'}</Badge>;
        }
        return <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">🔑 {isAr ? 'مُعد' : 'Configured'}</Badge>;
    };

    // ─── Render ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-500" />
                        {isAr ? 'التكاملات الخارجية' : 'External Integrations'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {isAr ? 'إدارة جميع الخدمات المتكاملة من مكان واحد' : 'Manage all connected services from one place'}
                    </p>
                </div>
                <Button onClick={openAddWizard} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                    <Plus className="w-4 h-4" />
                    {isAr ? 'إضافة تكامل' : 'Add Integration'}
                </Button>
            </div>

            {/* ═══ Supported Integrations Badges ═══ */}
            <div className="flex flex-wrap gap-2">
                {(Object.keys(INTEGRATION_DEFS) as IntegrationType[]).map(type => {
                    const def = INTEGRATION_DEFS[type];
                    const active = activeTypes.includes(type);
                    const IconComp = def.icon;
                    return (
                        <Badge
                            key={type}
                            variant={active ? 'default' : 'outline'}
                            className={cn(
                                'gap-1.5 py-1 px-2.5 text-xs cursor-pointer transition-all',
                                active
                                    ? `bg-${def.color}-100 dark:bg-${def.color}-900/30 text-${def.color}-700 dark:text-${def.color}-300 border border-${def.color}-300 dark:border-${def.color}-700 hover:bg-${def.color}-200`
                                    : 'text-gray-400 border-dashed hover:border-gray-400'
                            )}
                            onClick={() => {
                                if (active) openEditWizard(type);
                                else { setWizardType(type); setWizardStep(1); setFormData({}); setTestStatus('idle'); setShowSecret(false); setWizardEditing(false); setWizardOpen(true); }
                            }}
                        >
                            <IconComp className="w-3.5 h-3.5" />
                            {isAr ? def.labelAr : def.labelEn}
                            {active && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        </Badge>
                    );
                })}
            </div>

            {/* ═══ Unified Table ═══ */}
            <Card>
                <CardContent className="p-0">
                    {activeTypes.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                            <Link2 className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto" />
                            <p className="text-sm text-gray-400">{isAr ? 'لا توجد تكاملات مضافة بعد' : 'No integrations added yet'}</p>
                            <Button variant="outline" size="sm" onClick={openAddWizard} className="gap-1.5">
                                <Plus className="w-3.5 h-3.5" /> {isAr ? 'أضف أول تكامل' : 'Add your first integration'}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                                        <th className="text-start px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{isAr ? 'التكامل' : 'Integration'}</th>
                                        <th className="text-start px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">{isAr ? 'النوع' : 'Type'}</th>
                                        <th className="text-start px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{isAr ? 'التفاصيل' : 'Details'}</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">{isAr ? 'الحالة' : 'Status'}</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300 w-32">{isAr ? 'إجراءات' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTypes.map(type => {
                                        const def = INTEGRATION_DEFS[type];
                                        const config = integrations[type]!;
                                        const IconComp = def.icon;
                                        const disabled = config.enabled === false;

                                        return (
                                            <tr key={type} className={cn(
                                                'border-b border-gray-50 dark:border-gray-800/50 transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/20',
                                                disabled && 'opacity-50'
                                            )}>
                                                {/* Integration name + icon */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${def.gradient} flex items-center justify-center shadow-sm`}>
                                                            <IconComp className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-gray-800 dark:text-gray-200">{isAr ? def.labelAr : def.labelEn}</span>
                                                            {config.friendly_name && (
                                                                <p className="text-[10px] text-gray-400">{config.friendly_name}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Type */}
                                                <td className="px-4 py-3 hidden sm:table-cell">
                                                    <span className="text-xs text-gray-500">{isAr ? def.descAr : def.descEn}</span>
                                                </td>

                                                {/* Details */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400" dir="ltr">
                                                        {type === 'google' && config.connected_picture ? (
                                                            <span className="flex items-center gap-2">
                                                                <img src={config.connected_picture} alt="" className="w-5 h-5 rounded-full" />
                                                                {config.connected_email}
                                                            </span>
                                                        ) : getDetail(type, config)}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3 text-center">{getStatusBadge(type, config)}</td>

                                                {/* Actions */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Edit */}
                                                        <button
                                                            type="button"
                                                            onClick={() => type === 'google' ? undefined : openEditWizard(type)}
                                                            className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                                                            title={isAr ? 'تعديل' : 'Edit'}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Toggle */}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleEnabled(type)}
                                                            className={cn(
                                                                'p-1.5 rounded-md transition-colors',
                                                                disabled
                                                                    ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500'
                                                                    : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500'
                                                            )}
                                                            title={disabled ? (isAr ? 'تفعيل' : 'Enable') : (isAr ? 'تعطيل' : 'Disable')}
                                                        >
                                                            {disabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            type="button"
                                                            onClick={() => type === 'google' ? disconnectGoogle() : setDeleteTarget(type)}
                                                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                                                            title={isAr ? 'حذف' : 'Delete'}
                                                        >
                                                            {type === 'google' ? <Unlink className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Google Special Section (if connected, show scopes) ═══ */}
            {integrations.google?.connected && (
                <Card className="border-green-200 dark:border-green-900/30">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {integrations.google.connected_picture && (
                                    <img src={integrations.google.connected_picture} alt="" className="w-8 h-8 rounded-full" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-green-700 dark:text-green-300">{integrations.google.connected_name}</p>
                                    <p className="text-xs text-green-500">{integrations.google.connected_email}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge variant="secondary" className="gap-1 text-xs"><FileSpreadsheet className="w-3 h-3" /> Sheets</Badge>
                                <Badge variant="secondary" className="gap-1 text-xs"><Calendar className="w-3 h-3" /> Calendar</Badge>
                                <Badge variant="secondary" className="gap-1 text-xs"><HardDrive className="w-3 h-3" /> Drive</Badge>
                                <Badge variant="secondary" className="gap-1 text-xs"><Video className="w-3 h-3" /> Meet</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ Add/Edit Wizard Dialog ═══ */}
            <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
                <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {wizardType && (() => { const def = INTEGRATION_DEFS[wizardType]; const IC = def.icon; return <IC className={`w-5 h-5 text-${def.color}-500`} />; })()}
                            {wizardStep === 0
                                ? (isAr ? 'إضافة تكامل جديد' : 'Add New Integration')
                                : wizardEditing
                                    ? (isAr ? `تعديل ${wizardType ? INTEGRATION_DEFS[wizardType][isAr ? 'labelAr' : 'labelEn'] : ''}` : `Edit ${wizardType ? INTEGRATION_DEFS[wizardType].labelEn : ''}`)
                                    : (isAr ? `إعداد ${wizardType ? INTEGRATION_DEFS[wizardType][isAr ? 'labelAr' : 'labelEn'] : ''}` : `Configure ${wizardType ? INTEGRATION_DEFS[wizardType].labelEn : ''}`)
                            }
                        </DialogTitle>
                        <DialogDescription>
                            {wizardStep === 0
                                ? (isAr ? 'اختر نوع التكامل المطلوب' : 'Choose the integration type')
                                : wizardType ? (isAr ? INTEGRATION_DEFS[wizardType].descAr : INTEGRATION_DEFS[wizardType].descEn) : ''
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step 0: Choose Type */}
                    {wizardStep === 0 && (
                        <div className="grid grid-cols-2 gap-3 py-4">
                            {(availableToAdd.length > 0 ? availableToAdd : Object.keys(INTEGRATION_DEFS) as IntegrationType[]).map(type => {
                                const def = INTEGRATION_DEFS[type];
                                const IconComp = def.icon;
                                const alreadyAdded = activeTypes.includes(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        disabled={alreadyAdded && type !== 'google'}
                                        onClick={() => {
                                            if (type === 'google') { connectGoogle(); setWizardOpen(false); return; }
                                            setWizardType(type);
                                            setWizardStep(1);
                                            setFormData({});
                                            setTestStatus('idle');
                                        }}
                                        className={cn(
                                            'p-4 rounded-xl border-2 transition-all text-start space-y-2 hover:shadow-md',
                                            alreadyAdded && type !== 'google'
                                                ? 'border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                        )}
                                    >
                                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${def.gradient} flex items-center justify-center`}>
                                            <IconComp className="w-4.5 h-4.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{isAr ? def.labelAr : def.labelEn}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{isAr ? def.descAr : def.descEn}</p>
                                        </div>
                                        {alreadyAdded && type !== 'google' && (
                                            <Badge variant="outline" className="text-[9px]">{isAr ? 'مضاف' : 'Added'}</Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 1: Configuration */}
                    {wizardStep === 1 && wizardType && (
                        <div className="space-y-4 py-2">
                            {/* Twilio Fields */}
                            {wizardType === 'twilio' && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-red-500" /> Account SID
                                        </Label>
                                        <Input
                                            value={formData.account_sid || ''}
                                            onChange={e => setFormData(p => ({ ...p, account_sid: e.target.value }))}
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            className="h-9 text-sm font-mono" dir="ltr"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-red-500" /> Auth Token
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={showSecret ? 'text' : 'password'}
                                                value={formData.auth_token || ''}
                                                onChange={e => setFormData(p => ({ ...p, auth_token: e.target.value }))}
                                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                className="h-9 text-sm font-mono pe-9" dir="ltr"
                                            />
                                            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute end-2 top-2 text-gray-400 hover:text-gray-600">
                                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <MessageCircle className="w-3 h-3 text-emerald-500" /> {isAr ? 'رقم واتس آب' : 'WhatsApp Number'}
                                        </Label>
                                        <Input
                                            value={formData.whatsapp_sender || ''}
                                            onChange={e => setFormData(p => ({ ...p, whatsapp_sender: e.target.value }))}
                                            placeholder="+14155238886"
                                            className="h-9 text-sm font-mono" dir="ltr"
                                        />
                                        <p className="text-[10px] text-gray-400">{isAr ? 'رقم Twilio Sandbox أو WhatsApp Business' : 'Twilio Sandbox or WhatsApp Business number'}</p>
                                    </div>
                                </>
                            )}

                            {/* Telegram Fields */}
                            {wizardType === 'telegram' && (
                                <>
                                    {/* ═══ Setup Guide ═══ */}
                                    {!formData.connected && (
                                        <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 space-y-3">
                                            <p className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                                                <Bot className="w-4 h-4" />
                                                {isAr ? '📋 كيفية إنشاء بوت تلغرام' : '📋 How to Create a Telegram Bot'}
                                            </p>
                                            <ol className={cn("text-[11px] text-blue-700 dark:text-blue-400 space-y-2", isAr && "text-right")} dir={isAr ? 'rtl' : 'ltr'}>
                                                <li className="flex items-start gap-2">
                                                    <span className="min-w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                                                    <span>{isAr
                                                        ? 'افتح تلغرام وابحث عن @BotFather ثم ابدأ محادثة معه'
                                                        : 'Open Telegram, search for @BotFather and start a chat'}</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="min-w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                                                    <span>{isAr
                                                        ? 'أرسل الأمر /newbot واختر اسماً للبوت (مثال: TexaCore Bot)'
                                                        : 'Send /newbot command and choose a name (e.g., TexaCore Bot)'}</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="min-w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                                                    <span>{isAr
                                                        ? 'اختر اسم مستخدم ينتهي بـ bot (مثال: texacore_erp_bot)'
                                                        : 'Choose a username ending with bot (e.g., texacore_erp_bot)'}</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="min-w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold mt-0.5">4</span>
                                                    <span>{isAr
                                                        ? 'سيعطيك BotFather التوكن — انسخه والصقه أدناه'
                                                        : 'BotFather will give you a token — copy and paste it below'}</span>
                                                </li>
                                            </ol>
                                            <a
                                                href="https://t.me/BotFather"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {isAr ? 'فتح BotFather مباشرة' : 'Open BotFather directly'}
                                            </a>
                                        </div>
                                    )}

                                    {/* Token Field */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-blue-500" /> Bot Token
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={showSecret ? 'text' : 'password'}
                                                value={formData.bot_token || ''}
                                                onChange={e => setFormData(p => ({ ...p, bot_token: e.target.value }))}
                                                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyz"
                                                className="h-9 text-sm font-mono pe-9" dir="ltr"
                                            />
                                            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute end-2 top-2 text-gray-400 hover:text-gray-600">
                                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400">{isAr ? 'التوكن الذي حصلت عليه من @BotFather' : 'The token you received from @BotFather'}</p>
                                    </div>

                                    {/* Connected Bot Info */}
                                    {formData.bot_username && (
                                        <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/40">
                                            <Bot className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-mono text-blue-700 dark:text-blue-300">@{formData.bot_username}</span>
                                            <Badge variant="outline" className="text-[10px] border-green-400 text-green-600">✅</Badge>
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Chat ID */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Send className="w-3 h-3 text-blue-500" /> {isAr ? 'Chat ID (معرف المحادثة)' : 'Chat ID'}
                                        </Label>
                                        <Input
                                            value={formData.chat_id || ''}
                                            onChange={e => setFormData(p => ({ ...p, chat_id: e.target.value }))}
                                            placeholder="-1001234567890"
                                            className="h-9 text-sm font-mono" dir="ltr"
                                        />
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1.5">
                                            <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                                {isAr ? '📌 كيف تحصل على Chat ID:' : '📌 How to get Chat ID:'}
                                            </p>
                                            <ul className={cn("text-[10px] text-gray-500 space-y-0.5", isAr ? "list-none" : "list-disc list-inside")}>
                                                <li>{isAr ? '• أرسل رسالة لبوتك على تلغرام' : 'Send a message to your bot on Telegram'}</li>
                                                <li>{isAr ? '• أو أضف البوت لمجموعة/قناة للإشعارات الجماعية' : 'Or add the bot to a group/channel for team alerts'}</li>
                                                <li>{isAr ? '• ثم افتح: api.telegram.org/bot[TOKEN]/getUpdates' : 'Then open: api.telegram.org/bot[TOKEN]/getUpdates'}</li>
                                                <li>{isAr ? '• ابحث عن "chat":{"id": ...} وانسخ الرقم' : 'Find "chat":{"id": ...} and copy the number'}</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* ═══ Available Features ═══ */}
                                    <div className="space-y-2.5">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            {isAr ? 'الميزات المتاحة عبر البوت' : 'Available Bot Features'}
                                        </p>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {[
                                                { icon: '📦', titleAr: 'تنبيهات المبيعات', titleEn: 'Sales Alerts', descAr: 'إشعار فوري عند إنشاء فاتورة بيع أو تحصيل جديد', descEn: 'Instant notification on new sales invoice or payment' },
                                                { icon: '🛒', titleAr: 'تنبيهات المشتريات', titleEn: 'Purchase Alerts', descAr: 'إشعار عند وصول كونتينر أو فاتورة شراء جديدة', descEn: 'Alert on container arrival or new purchase invoice' },
                                                { icon: '📊', titleAr: 'تقارير المحاسبة', titleEn: 'Accounting Reports', descAr: 'ملخص يومي للإيرادات والمصروفات والأرصدة', descEn: 'Daily summary of revenue, expenses, and balances' },
                                                { icon: '🏭', titleAr: 'تنبيهات المخزون', titleEn: 'Inventory Alerts', descAr: 'تنبيه عند انخفاض المخزون تحت الحد الأدنى', descEn: 'Alert when stock falls below minimum level' },
                                                { icon: '🚢', titleAr: 'تتبع الشحنات', titleEn: 'Shipment Tracking', descAr: 'تحديثات حالة الكونتينرات والشحنات', descEn: 'Container and shipment status updates' },
                                                { icon: '💱', titleAr: 'تنبيهات الصرافة', titleEn: 'Exchange Alerts', descAr: 'إشعار عند تغير أسعار الصرف بشكل ملحوظ', descEn: 'Alert on significant exchange rate changes' },
                                                { icon: '👥', titleAr: 'نشاط CRM', titleEn: 'CRM Activity', descAr: 'إشعار عند تحويل عميل محتمل أو صفقة جديدة', descEn: 'Notification on lead conversion or new deal' },
                                                { icon: '📋', titleAr: 'ملخص يومي', titleEn: 'Daily Summary', descAr: 'تقرير يومي شامل يُرسل في الوقت المحدد', descEn: 'Comprehensive daily report at scheduled time' },
                                            ].map((feature, i) => (
                                                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                    <span className="text-base mt-0.5">{feature.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                                            {isAr ? feature.titleAr : feature.titleEn}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 leading-relaxed">
                                                            {isAr ? feature.descAr : feature.descEn}
                                                        </p>
                                                    </div>
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Nova Poshta Fields */}
                            {wizardType === 'nova_poshta' && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-orange-500" /> API Key
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={showSecret ? 'text' : 'password'}
                                                value={formData.api_key || ''}
                                                onChange={e => setFormData(p => ({ ...p, api_key: e.target.value }))}
                                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                className="h-9 text-sm font-mono pe-9" dir="ltr"
                                            />
                                            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute end-2 top-2 text-gray-400 hover:text-gray-600">
                                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Separator />
                                    <p className="text-xs font-semibold flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                        <Settings className="w-3.5 h-3.5 text-orange-500" />
                                        {isAr ? 'بيانات المرسل' : 'Sender Details'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">Sender Ref</Label>
                                            <Input value={formData.sender_ref || ''} onChange={e => setFormData(p => ({ ...p, sender_ref: e.target.value }))} placeholder="UUID" className="h-8 text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">{isAr ? 'هاتف المرسل' : 'Phone'}</Label>
                                            <Input value={formData.sender_phone || ''} onChange={e => setFormData(p => ({ ...p, sender_phone: e.target.value }))} placeholder="+380XXXXXXXXX" className="h-8 text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">City Ref</Label>
                                            <Input value={formData.sender_city_ref || ''} onChange={e => setFormData(p => ({ ...p, sender_city_ref: e.target.value }))} placeholder="UUID" className="h-8 text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">Address Ref</Label>
                                            <Input value={formData.sender_address_ref || ''} onChange={e => setFormData(p => ({ ...p, sender_address_ref: e.target.value }))} placeholder="UUID" className="h-8 text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-[10px] text-gray-500">Contact Ref</Label>
                                            <Input value={formData.sender_contact_ref || ''} onChange={e => setFormData(p => ({ ...p, sender_contact_ref: e.target.value }))} placeholder="UUID" className="h-8 text-xs font-mono" dir="ltr" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Test Button */}
                            {wizardType !== 'google' && (
                                <Button
                                    variant="outline"
                                    onClick={() => testConnection(wizardType!, formData)}
                                    disabled={testStatus === 'testing' || (
                                        wizardType === 'twilio' ? (!formData.account_sid || !formData.auth_token) :
                                        wizardType === 'telegram' ? !formData.bot_token :
                                        !formData.api_key
                                    )}
                                    className={cn(
                                        'w-full gap-2 h-10',
                                        testStatus === 'success' ? 'border-green-400 text-green-600 bg-green-50 dark:bg-green-900/10' :
                                        testStatus === 'error' ? 'border-red-400 text-red-600' : ''
                                    )}
                                >
                                    {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                     testStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                                     testStatus === 'error' ? <AlertCircle className="w-4 h-4" /> :
                                     <Zap className="w-4 h-4" />}
                                    {testStatus === 'success' ? (isAr ? '✅ الاتصال ناجح!' : '✅ Connected!') :
                                     testStatus === 'error' ? (isAr ? '❌ فشل — حاول مجدداً' : '❌ Failed — try again') :
                                     (isAr ? 'اختبار الاتصال' : 'Test Connection')}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Dialog Footer */}
                    {wizardStep === 1 && (
                        <DialogFooter className="gap-2">
                            {!wizardEditing && (
                                <Button variant="outline" onClick={() => { setWizardStep(0); setWizardType(null); }}>
                                    {isAr ? 'رجوع' : 'Back'}
                                </Button>
                            )}
                            <Button
                                onClick={handleWizardSave}
                                disabled={saving}
                                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isAr ? 'حفظ' : 'Save'}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═══ Delete Confirmation ═══ */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isAr ? 'حذف التكامل؟' : 'Delete Integration?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isAr
                                ? `هل أنت متأكد من حذف تكامل ${deleteTarget ? INTEGRATION_DEFS[deleteTarget]?.[isAr ? 'labelAr' : 'labelEn'] : ''}؟ هذا الإجراء لا يمكن التراجع عنه.`
                                : `Are you sure you want to delete ${deleteTarget ? INTEGRATION_DEFS[deleteTarget]?.labelEn : ''}? This action cannot be undone.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && deleteIntegration(deleteTarget)}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isAr ? 'حذف' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
