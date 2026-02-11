/**
 * ════════════════════════════════════════════════════════════════
 * 🔗 IntegrationsTab — تبويب التكاملات الخارجية
 * ════════════════════════════════════════════════════════════════
 * 
 * Manages external service integrations for the company:
 * - Nova Poshta (Shipping Carrier API)
 * - Gemini AI (NexaAgent AI)
 * - Future: Payment gateways, SMS providers, etc.
 * 
 * Reads/writes from: companies.integrations (JSONB column)
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Truck, Bot, Save, CheckCircle2, AlertCircle,
    Loader2, Eye, EyeOff, RefreshCw, ExternalLink,
    Shield, Zap, Settings, Link2,
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
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────
interface NovaPoshtaSettings {
    api_key: string;
    sender_ref: string;
    sender_city_ref: string;
    sender_address_ref: string;
    sender_contact_ref: string;
    sender_phone: string;
}

interface GeminiSettings {
    enabled: boolean;
    model: string;
}

interface Integrations {
    nova_poshta?: Partial<NovaPoshtaSettings>;
    gemini?: Partial<GeminiSettings>;
}

// ─── Component ────────────────────────────────────────────────
export default function IntegrationsTab() {
    const { language } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    const isAr = language === 'ar';

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyId, setCompanyId] = useState<string>('');
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

    // Gemini-specific
    const [geminiEnabled, setGeminiEnabled] = useState(false);
    const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');

    // ─── Load integrations ──────────────────────────────────────
    const loadIntegrations = useCallback(async () => {
        try {
            setLoading(true);
            // Get company_id from user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;
            setCompanyId(profile.company_id);

            // Get integrations
            const { data: company } = await supabase
                .from('companies')
                .select('integrations')
                .eq('id', profile.company_id)
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

            // Populate Gemini fields
            if (intg.gemini) {
                setGeminiEnabled(intg.gemini.enabled || false);
                setGeminiModel(intg.gemini.model || 'gemini-2.0-flash');
            }

        } catch (err) {
            console.error('Error loading integrations:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadIntegrations();
    }, [loadIntegrations]);

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
                gemini: {
                    enabled: geminiEnabled,
                    model: geminiModel,
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

                // Auto-fill sender ref if only one
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

    // ─── Render ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* ═══ Header + Save ═══ */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-500" />
                        {isAr ? 'التكاملات الخارجية' : 'External Integrations'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {isAr
                            ? 'ربط النظام بخدمات الشحن والذكاء الاصطناعي'
                            : 'Connect the system with shipping and AI services'}
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

            {/* ═══ 1. Nova Poshta Integration ═══ */}
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

            {/* ═══ 2. Gemini AI Integration ═══ */}
            <Card className="border-2 border-purple-100 dark:border-purple-900/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                Gemini AI (NexaAgent)
                                <Badge variant="outline" className={`text-[10px] ${geminiEnabled ? 'border-green-500 text-green-600' : 'border-gray-400 text-gray-500'
                                    }`}>
                                    {geminiEnabled
                                        ? (isAr ? '🟢 مفعّل' : '🟢 Active')
                                        : (isAr ? '⚪ معطّل' : '⚪ Inactive')}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {isAr
                                    ? 'محادثة ذكية لتحليل العملاء، اقتراحات البيع، والتقارير'
                                    : 'Smart chat for customer analysis, sales suggestions, and reports'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Label className="text-xs text-gray-600 dark:text-gray-400 flex-1">
                            {isAr ? 'تفعيل NexaAgent AI' : 'Enable NexaAgent AI'}
                        </Label>
                        <button
                            onClick={() => setGeminiEnabled(!geminiEnabled)}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${geminiEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${geminiEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">
                            {isAr ? 'موديل Gemini' : 'Gemini Model'}
                        </Label>
                        <Input
                            value={geminiModel}
                            onChange={(e) => setGeminiModel(e.target.value)}
                            placeholder="gemini-2.0-flash"
                            className="h-8 text-xs font-mono"
                            dir="ltr"
                            disabled={!geminiEnabled}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                        💡 {isAr
                            ? 'API Key يُخزن في Supabase Edge Function Secrets (GOOGLE_AI_KEY). لا يحتاج تعديل من هنا.'
                            : 'API Key is stored in Supabase Edge Function Secrets (GOOGLE_AI_KEY). No configuration needed here.'}
                    </p>
                </CardContent>
            </Card>

            {/* ═══ Future Integrations Placeholder ═══ */}
            <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 opacity-60">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-gray-400">
                        {isAr ? '🔜 تكاملات قادمة: بوابات الدفع، خدمات SMS، ربط المتاجر الإلكترونية' : '🔜 Coming: Payment gateways, SMS services, E-commerce integrations'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
