/**
 * EcommerceSettings — إعدادات المتجر
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { Store, Globe, Palette, Shield, Bell, Save, Languages, MapPin, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function EcommerceSettings() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const { data } = await supabase.from('ecommerce_store_config').select('*').limit(1).single();
            setConfig(data);
            setLoading(false);
        };
        fetch();
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        const { error } = await supabase.from('ecommerce_store_config').update({
            name: config.name,
            description: config.description,
            default_currency: config.default_currency,
            default_locale: config.default_locale,
            tax_rate: config.tax_rate,
            tax_inclusive: config.tax_inclusive,
            free_shipping_threshold: config.free_shipping_threshold,
            contact_email: config.contact_email,
            contact_phone: config.contact_phone,
            social_links: config.social_links,
        }).eq('id', config.id);

        if (error) {
            toast.error(isRTL ? 'خطأ في الحفظ' : 'Save error');
        } else {
            toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Settings saved');
        }
        setSaving(false);
    };

    const updateField = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    const updateName = (lang: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, name: { ...prev.name, [lang]: value } }));
    };

    const updateDesc = (lang: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, description: { ...prev.description, [lang]: value } }));
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-erp-teal" /></div>;
    if (!config) return <div className="text-center py-12 text-gray-400">{isRTL ? 'لم يتم العثور على إعدادات المتجر' : 'Store config not found'}</div>;

    const storeUrl = import.meta.env.VITE_STORE_URL || 'http://localhost:3000';

    return (
        <div className="space-y-6">
            {/* Store Identity */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Store className="w-5 h-5 text-erp-teal" /> {isRTL ? 'هوية المتجر' : 'Store Identity'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">{isRTL ? 'اسم المتجر (عربي)' : 'Store Name (Arabic)'}</Label>
                            <Input value={config.name?.ar || ''} onChange={e => updateName('ar', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs">{isRTL ? 'اسم المتجر (إنجليزي)' : 'Store Name (English)'}</Label>
                            <Input value={config.name?.en || ''} onChange={e => updateName('en', e.target.value)} className="mt-1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">{isRTL ? 'وصف المتجر (عربي)' : 'Description (Arabic)'}</Label>
                            <Textarea rows={2} value={config.description?.ar || ''} onChange={e => updateDesc('ar', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs">{isRTL ? 'وصف المتجر (إنجليزي)' : 'Description (English)'}</Label>
                            <Textarea rows={2} value={config.description?.en || ''} onChange={e => updateDesc('en', e.target.value)} className="mt-1" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">{isRTL ? 'رابط المتجر' : 'Store URL'}</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input value={storeUrl} readOnly className="bg-gray-50" />
                            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> {isRTL ? 'الإعدادات الإقليمية' : 'Regional Settings'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-xs">{isRTL ? 'العملة الافتراضية' : 'Default Currency'}</Label>
                            <Input value={config.default_currency || ''} onChange={e => updateField('default_currency', e.target.value)} className="mt-1" placeholder="UAH" />
                        </div>
                        <div>
                            <Label className="text-xs">{isRTL ? 'اللغة الافتراضية' : 'Default Locale'}</Label>
                            <Input value={config.default_locale || ''} onChange={e => updateField('default_locale', e.target.value)} className="mt-1" placeholder="ar" />
                        </div>
                        <div>
                            <Label className="text-xs">{isRTL ? 'نسبة الضريبة' : 'Tax Rate'}</Label>
                            <Input type="number" step="0.01" value={config.tax_rate || 0} onChange={e => updateField('tax_rate', parseFloat(e.target.value))} className="mt-1" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={config.tax_inclusive} onCheckedChange={(v) => updateField('tax_inclusive', v)} />
                        <Label className="text-sm">{isRTL ? 'الأسعار شاملة الضريبة' : 'Prices include tax'}</Label>
                    </div>
                    <div>
                        <Label className="text-xs">{isRTL ? 'حد الشحن المجاني' : 'Free Shipping Threshold'}</Label>
                        <Input type="number" value={config.free_shipping_threshold || 0} onChange={e => updateField('free_shipping_threshold', parseFloat(e.target.value))} className="mt-1 max-w-xs" />
                    </div>
                </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-500" /> {isRTL ? 'معلومات الاتصال' : 'Contact Info'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                            <Input value={config.contact_email || ''} onChange={e => updateField('contact_email', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                            <Input value={config.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value)} className="mt-1" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
}
