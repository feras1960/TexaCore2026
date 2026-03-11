/**
 * ════════════════════════════════════════════════════════════════
 * 🔗 IntegrationsTab — تبويب التكاملات الخارجية
 * ════════════════════════════════════════════════════════════════
 * 
 * Manages external service integrations for the company:
 * - Nova Poshta (Shipping Carrier API)
 * - Google Workspace (Sheets, Calendar, Drive, Meet)
 * - Future: Payment gateways, SMS providers, etc.
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
    Video, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';

// ─── Types ────────────────────────────────────────────────────
interface NovaPoshtaSettings {
    api_key: string;
    sender_ref: string;
    sender_city_ref: string;
    sender_address_ref: string;
    sender_contact_ref: string;
    sender_phone: string;
}

interface GoogleIntegration {
    connected: boolean;
    connected_email?: string;
    connected_name?: string;
    connected_picture?: string;
    connected_at?: string;
    scopes?: string[];
}

interface Integrations {
    nova_poshta?: Partial<NovaPoshtaSettings>;
    google?: GoogleIntegration;
}

// ─── Component ────────────────────────────────────────────────
export default function IntegrationsTab() {
    const { language } = useLanguage();
    const { toast } = useToast();
    const { companyId } = useCompany();
    const isAr = language === 'ar';

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [integrations, setIntegrations] = useState<Integrations>({});

    // NP-specific
    const [npApiKey, setNpApiKey] = useState('');
    const [npSenderRef, setNpSenderRef] = useState('');
    const [npSenderCityRef, setNpSenderCityRef] = useState('');
    const [npSenderAddressRef, setNpSenderAddressRef] = useState('');
    const [npSenderContactRef, setNpSenderContactRef] = useState('');
    const [npSenderPhone, setNpSenderPhone] = useState('');
    const [npShowApiKey, setNpShowApiKey] = useState(false);
    const [npTestStatus, setNpTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Google-specific
    const [googleStatus, setGoogleStatus] = useState<GoogleIntegration | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    // ─── Load integrations ──────────────────────────────────────
    const loadIntegrations = useCallback(async () => {
        if (!companyId) return;
        try {
            setLoading(true);

            const { data: company } = await supabase
                .from('companies')
                .select('integrations')
                .eq('id', companyId)
                .single();

            const intg: Integrations = company?.integrations || {};
            setIntegrations(intg);

            // Populate NP fields
            if (intg.nova_poshta) {
                setNpApiKey(intg.nova_poshta.api_key || '');
                setNpSenderRef(intg.nova_poshta.sender_ref || '');
                setNpSenderCityRef(intg.nova_poshta.sender_city_ref || '');
                setNpSenderAddressRef(intg.nova_poshta.sender_address_ref || '');
                setNpSenderContactRef(intg.nova_poshta.sender_contact_ref || '');
                setNpSenderPhone(intg.nova_poshta.sender_phone || '');
            }

            // Google status
            if (intg.google?.connected) {
                setGoogleStatus(intg.google);
            }

        } catch (err) {
            console.error('Error loading integrations:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadIntegrations();
    }, [loadIntegrations]);

    // Check URL params for Google OAuth callback (code comes from Google redirect)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Google redirects back with ?code=xxx&state=xxx
        const code = params.get('code');
        const state = params.get('state');

        if (code && state && companyId) {
            // Exchange code for tokens via Edge Function
            const exchangeCode = async () => {
                setGoogleLoading(true);
                try {
                    const redirectUri = window.location.origin + window.location.pathname;
                    const { data, error } = await supabase.functions.invoke('google-integration', {
                        body: {
                            action: 'exchange_code',
                            company_id: companyId,
                            code,
                            redirect_uri: redirectUri,
                        }
                    });

                    if (error) throw error;
                    if (data?.success) {
                        toast({
                            title: isAr ? '✅ تم ربط Google بنجاح!' : '✅ Google Connected!',
                            description: isAr ? `تم الربط بحساب: ${data.email}` : `Connected to: ${data.email}`,
                        });
                        loadIntegrations();
                    } else {
                        throw new Error(data?.error || 'Unknown error');
                    }
                } catch (err: any) {
                    toast({
                        title: isAr ? '❌ فشل ربط Google' : '❌ Google Connection Failed',
                        description: err.message,
                        variant: 'destructive',
                    });
                } finally {
                    setGoogleLoading(false);
                    // Clean URL
                    window.history.replaceState({}, '', window.location.pathname);
                }
            };
            exchangeCode();
        }

        // Handle errors
        if (params.get('error')) {
            toast({
                title: isAr ? '❌ فشل ربط Google' : '❌ Google Connection Failed',
                description: params.get('error'),
                variant: 'destructive',
            });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [companyId]);


    // ─── Save integrations ──────────────────────────────────────
    const handleSave = async () => {
        if (!companyId) return;
        setSaving(true);
        try {
            const newIntegrations: Integrations = {
                ...integrations,
                nova_poshta: {
                    api_key: npApiKey.trim(),
                    sender_ref: npSenderRef.trim(),
                    sender_city_ref: npSenderCityRef.trim(),
                    sender_address_ref: npSenderAddressRef.trim(),
                    sender_contact_ref: npSenderContactRef.trim(),
                    sender_phone: npSenderPhone.trim(),
                },
            };

            const { error } = await supabase
                .from('companies')
                .update({ integrations: newIntegrations })
                .eq('id', companyId);

            if (error) throw error;

            setIntegrations(newIntegrations);
            toast({
                title: isAr ? '✅ تم الحفظ' : '✅ Saved',
                description: isAr ? 'تم حفظ إعدادات التكاملات بنجاح' : 'Integration settings saved successfully',
            });
        } catch (err: any) {
            toast({
                title: isAr ? '❌ خطأ' : '❌ Error',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // ─── Test NP Connection ─────────────────────────────────────
    const testNpConnection = async () => {
        if (!npApiKey.trim()) {
            toast({
                title: isAr ? '⚠️ مطلوب' : '⚠️ Required',
                description: isAr ? 'يرجى إدخال API Key أولاً' : 'Please enter API Key first',
                variant: 'destructive',
            });
            return;
        }

        setNpTestStatus('testing');
        try {
            const { data, error } = await supabase.functions.invoke('nova-poshta', {
                body: {
                    action: 'getCounterparties',
                    apiKey: npApiKey.trim(),
                    params: { CounterpartyProperty: 'Sender', Page: '1' },
                },
            });

            if (error) throw error;
            if (data?.success) {
                setNpTestStatus('success');
                toast({
                    title: isAr ? '✅ الاتصال ناجح!' : '✅ Connection successful!',
                    description: isAr
                        ? `تم العثور على ${data.data?.length || 0} مرسل`
                        : `Found ${data.data?.length || 0} sender(s)`,
                });

                if (data.data?.length === 1 && !npSenderRef) {
                    setNpSenderRef(data.data[0].Ref || '');
                }
            } else {
                setNpTestStatus('error');
                toast({
                    title: isAr ? '❌ فشل الاتصال' : '❌ Connection failed',
                    description: data?.errors?.join(', ') || 'Unknown error',
                    variant: 'destructive',
                });
            }
        } catch (err: any) {
            setNpTestStatus('error');
            toast({
                title: isAr ? '❌ خطأ' : '❌ Error',
                description: err.message,
                variant: 'destructive',
            });
        }
    };

    // ─── Google: Connect ────────────────────────────────────────
    const connectGoogle = async () => {
        if (!companyId) return;
        setGoogleLoading(true);
        try {
            const redirectUrl = window.location.origin + '/system-config/integrations';
            const { data, error } = await supabase.functions.invoke('google-integration', {
                body: {
                    action: 'authorize',
                    company_id: companyId,
                    redirect_url: redirectUrl,
                }
            });

            if (error) throw error;
            if (data?.auth_url) {
                window.location.href = data.auth_url;
            }
        } catch (err: any) {
            toast({
                title: isAr ? '❌ خطأ' : '❌ Error',
                description: err.message,
                variant: 'destructive',
            });
            setGoogleLoading(false);
        }
    };

    // ─── Google: Disconnect ─────────────────────────────────────
    const disconnectGoogle = async () => {
        if (!companyId) return;
        setGoogleLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('google-integration', {
                body: {
                    action: 'disconnect',
                    company_id: companyId,
                }
            });

            if (error) throw error;
            setGoogleStatus(null);
            setIntegrations(prev => {
                const updated = { ...prev };
                delete updated.google;
                return updated;
            });
            toast({
                title: isAr ? '✅ تم فصل Google' : '✅ Google Disconnected',
                description: isAr ? 'تم إلغاء ربط حساب Google' : 'Google account unlinked',
            });
        } catch (err: any) {
            toast({
                title: isAr ? '❌ خطأ' : '❌ Error',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setGoogleLoading(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    const googleConnected = !!googleStatus?.connected;

    return (
        <div className="space-y-6">
            {/* ═══ Header + Save ═══ */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-500" />
                        {isAr ? 'التكاملات الخارجية' : 'External Integrations'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {isAr
                            ? 'ربط النظام بخدمات Google وخدمات الشحن والذكاء الاصطناعي'
                            : 'Connect with Google Workspace, shipping and AI services'}
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isAr ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
            </div>

            {/* ═══ 1. Google Workspace Integration ═══ */}
            <Card className={`border-2 ${googleConnected ? 'border-green-200 dark:border-green-900/30' : 'border-blue-100 dark:border-blue-900/30'}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${googleConnected
                                ? 'bg-gradient-to-br from-green-500 to-green-600'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                }`}>
                                {googleConnected ? (
                                    googleStatus?.connected_picture ? (
                                        <img src={googleStatus.connected_picture} alt="" className="w-10 h-10 rounded-xl" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-white" />
                                    )
                                ) : (
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    Google Workspace
                                    {googleConnected && (
                                        <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
                                            ✅ {isAr ? 'متصل' : 'Connected'}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {isAr
                                        ? 'Google Sheets، التقويم، Drive، اجتماعات Meet'
                                        : 'Google Sheets, Calendar, Drive, Meet'}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {googleConnected ? (
                        <>
                            {/* Connected State */}
                            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                {googleStatus?.connected_picture && (
                                    <img src={googleStatus.connected_picture} alt="" className="w-9 h-9 rounded-full" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                        {googleStatus?.connected_name || googleStatus?.connected_email}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                        {googleStatus?.connected_email}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">
                                    {isAr ? 'متصل منذ' : 'Since'} {googleStatus?.connected_at ? new Date(googleStatus.connected_at).toLocaleDateString() : ''}
                                </Badge>
                            </div>

                            {/* Scopes */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    <FileSpreadsheet className="w-3 h-3" />
                                    Google Sheets
                                </Badge>
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    <Calendar className="w-3 h-3" />
                                    Calendar
                                </Badge>
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    <HardDrive className="w-3 h-3" />
                                    Drive
                                </Badge>
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    <Video className="w-3 h-3" />
                                    Meet
                                </Badge>
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={disconnectGoogle}
                                    disabled={googleLoading}
                                    className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    {googleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                                    {isAr ? 'فصل Google' : 'Disconnect'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadIntegrations()}
                                    className="gap-1.5 text-xs"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {isAr ? 'تحديث' : 'Refresh'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Not Connected State */}
                            <div className="text-center py-4 space-y-3">
                                <div className="flex justify-center gap-4 text-gray-400">
                                    <div className="flex flex-col items-center gap-1">
                                        <FileSpreadsheet className="w-6 h-6" />
                                        <span className="text-[10px]">Sheets</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <Calendar className="w-6 h-6" />
                                        <span className="text-[10px]">Calendar</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <HardDrive className="w-6 h-6" />
                                        <span className="text-[10px]">Drive</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <Video className="w-6 h-6" />
                                        <span className="text-[10px]">Meet</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {isAr
                                        ? 'اربط حساب Google لتصدير البيانات إلى Sheets، مزامنة التقويم، وإنشاء اجتماعات Meet'
                                        : 'Connect Google to export data to Sheets, sync Calendar, and create Meet meetings'}
                                </p>
                                <Button
                                    onClick={connectGoogle}
                                    disabled={googleLoading}
                                    className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                                >
                                    {googleLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    )}
                                    {isAr ? 'ربط حساب Google' : 'Connect Google Account'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ═══ 2. Nova Poshta Integration ═══ */}
            <Card className="border-2 border-red-100 dark:border-red-900/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                                <Truck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    Nova Poshta
                                    {npApiKey && (
                                        <Badge variant="outline" className={`text-[10px] ${npTestStatus === 'success' ? 'border-green-500 text-green-600' :
                                            npApiKey ? 'border-amber-500 text-amber-600' : ''
                                            }`}>
                                            {npTestStatus === 'success'
                                                ? (isAr ? '✅ متصل' : '✅ Connected')
                                                : (isAr ? '🔑 مُعد' : '🔑 Configured')}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {isAr
                                        ? 'إنشاء بوالص الشحن (TTN)، تتبع الشحنات، التكامل المباشر'
                                        : 'Create shipping waybills (TTN), track shipments, direct API integration'}
                                </CardDescription>
                            </div>
                        </div>
                        <a
                            href="https://developers.novaposhta.ua/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                            API Docs <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* API Key */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-red-500" />
                            API Key
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={npShowApiKey ? 'text' : 'password'}
                                    value={npApiKey}
                                    onChange={(e) => { setNpApiKey(e.target.value); setNpTestStatus('idle'); }}
                                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="h-9 text-sm font-mono pe-9"
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setNpShowApiKey(!npShowApiKey)}
                                    className="absolute end-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {npShowApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testNpConnection}
                                disabled={npTestStatus === 'testing' || !npApiKey}
                                className={`gap-1.5 h-9 px-3 text-xs ${npTestStatus === 'success' ? 'border-green-500 text-green-600' :
                                    npTestStatus === 'error' ? 'border-red-500 text-red-600' : ''
                                    }`}
                            >
                                {npTestStatus === 'testing' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : npTestStatus === 'success' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : npTestStatus === 'error' ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                ) : (
                                    <Zap className="w-3.5 h-3.5" />
                                )}
                                {isAr ? 'اختبار' : 'Test'}
                            </Button>
                        </div>
                        <p className="text-[10px] text-gray-400">
                            {isAr
                                ? 'يمكنك الحصول على API Key من لوحة تحكم Nova Poshta → الإعدادات → أمان API'
                                : 'Get your API Key from Nova Poshta dashboard → Settings → API Security'}
                        </p>
                    </div>

                    <Separator />

                    {/* Sender Details */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <Settings className="w-3.5 h-3.5 text-red-500" />
                            {isAr ? 'بيانات المرسل (Sender)' : 'Sender Details'}
                        </h4>
                        <p className="text-[10px] text-gray-400 -mt-1">
                            {isAr
                                ? 'هذه البيانات مطلوبة لإنشاء البوالص تلقائياً. يمكنك الحصول عليها من API بعد اختبار الاتصال.'
                                : 'Required for automatic TTN creation. Retrieved from API after testing connection.'}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-gray-500">Sender Ref (UUID)</Label>
                                <Input
                                    value={npSenderRef}
                                    onChange={(e) => setNpSenderRef(e.target.value)}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="h-8 text-xs font-mono"
                                    dir="ltr"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-gray-500">
                                    {isAr ? 'هاتف المرسل' : 'Sender Phone'}
                                </Label>
                                <Input
                                    value={npSenderPhone}
                                    onChange={(e) => setNpSenderPhone(e.target.value)}
                                    placeholder="+380XXXXXXXXX"
                                    className="h-8 text-xs font-mono"
                                    dir="ltr"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-gray-500">Sender City Ref</Label>
                                <Input
                                    value={npSenderCityRef}
                                    onChange={(e) => setNpSenderCityRef(e.target.value)}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="h-8 text-xs font-mono"
                                    dir="ltr"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-gray-500">Sender Address Ref</Label>
                                <Input
                                    value={npSenderAddressRef}
                                    onChange={(e) => setNpSenderAddressRef(e.target.value)}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="h-8 text-xs font-mono"
                                    dir="ltr"
                                />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <Label className="text-[10px] text-gray-500">Sender Contact Ref</Label>
                                <Input
                                    value={npSenderContactRef}
                                    onChange={(e) => setNpSenderContactRef(e.target.value)}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="h-8 text-xs font-mono"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Future Integrations ═══ */}
            <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 opacity-60">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-gray-400">
                        {isAr ? '🔜 تكاملات قادمة: بوابات الدفع، خدمات SMS، WhatsApp Business' : '🔜 Coming: Payment gateways, SMS, WhatsApp Business'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
