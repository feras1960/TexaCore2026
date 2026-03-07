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
    Truck, Save, CheckCircle2, AlertCircle,
    Loader2, Eye, EyeOff, ExternalLink,
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

interface Integrations {
    nova_poshta?: Partial<NovaPoshtaSettings>;
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



    // ─── Load integrations ──────────────────────────────────────
    const loadIntegrations = useCallback(async () => {
        if (!companyId) return;
        try {
            setLoading(true);

            // Get integrations directly — companyId comes from useCompany
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





        } catch (err) {
            console.error('Error loading integrations:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

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

            {/* ═══ Future Integrations Placeholder ═══ */}
            <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 opacity-60">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-gray-400">
                        {isAr ? '🔜 تكاملات قادمة: بوابات الدفع، خدمات SMS، WhatsApp Business، Telegram' : '🔜 Coming: Payment gateways, SMS, WhatsApp Business, Telegram'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
