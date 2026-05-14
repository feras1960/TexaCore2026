import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { WebRTCWidget } from '../pages/WebRTCWidgetsPage';
import { Save, Loader2, PhoneOutgoing } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WebRTCWidgetSheetProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    data: WebRTCWidget | null;
    companyId: string;
    onSuccess: () => void;
}

export function WebRTCWidgetSheet({ isOpen, onClose, mode, data, companyId, onSuccess }: WebRTCWidgetSheetProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<WebRTCWidget>>({
        name: '',
        target_destination: '700', // Default to IVR 700
        allowed_domains: [],
        theme_color: '#10b981',
        button_text: isRTL ? 'اتصال مجاني' : 'Free Call',
        is_active: true
    });
    
    const [domainsInput, setDomainsInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && data) {
                setFormData(data);
                setDomainsInput(data.allowed_domains?.join(', ') || '');
            } else {
                setFormData({
                    name: '',
                    target_destination: '700',
                    allowed_domains: [],
                    theme_color: '#10b981',
                    button_text: isRTL ? 'اتصال مجاني' : 'Free Call',
                    is_active: true
                });
                setDomainsInput('');
            }
        }
    }, [isOpen, mode, data, isRTL]);

    const handleSave = async () => {
        if (!formData.name || !formData.target_destination) return;
        setIsSaving(true);
        try {
            const domainsList = domainsInput.split(',').map(d => d.trim()).filter(d => d.length > 0);
            
            const payload = {
                company_id: companyId,
                name: formData.name,
                target_destination: formData.target_destination,
                theme_color: formData.theme_color,
                button_text: formData.button_text,
                allowed_domains: domainsList,
                is_active: formData.is_active
            };

            if (mode === 'create') {
                const { error } = await supabase.from('pbx_webrtc_widgets').insert(payload);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('pbx_webrtc_widgets').update(payload).eq('id', data!.id);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving WebRTC widget:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side={isRTL ? 'right' : 'left'} className="w-[400px] sm:w-[540px] flex flex-col p-0 border-none">
                <div className="flex flex-col h-full bg-white dark:bg-slate-950 shadow-2xl">
                    <SheetHeader className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                                <PhoneOutgoing className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="text-start">
                                <SheetTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                    {mode === 'create' ? (isRTL ? 'إنشاء ويدجت اتصال مباشر' : 'Create WebRTC Widget') : (isRTL ? 'تعديل ويدجت الاتصال' : 'Edit WebRTC Widget')}
                                </SheetTitle>
                                <SheetDescription className="text-xs text-gray-500">
                                    {isRTL ? 'يتيح لزوار موقعك الاتصال بمقسمك مجاناً عبر المتصفح' : 'Allow visitors to call your PBX for free via their browser'}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" dir={direction}>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'اسم الويدجت' : 'Widget Name'} *</Label>
                            <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={isRTL ? 'مثال: الدعم الفني للموقع' : 'e.g. Website Support Line'} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'الوجهة المستهدفة (Target Destination)' : 'Target Destination'} *</Label>
                            <Input value={formData.target_destination || ''} onChange={e => setFormData({ ...formData, target_destination: e.target.value })} placeholder="e.g. 700 or 100" />
                            <Alert className="bg-blue-50 border-blue-100 py-2">
                                <AlertDescription className="text-xs text-blue-800">
                                    {isRTL 
                                        ? '💡 يُنصح بتوجيه المكالمة إلى الرد الآلي (مثال: 700) ليستمع العميل لرسالة ترحيب قبل تحويله للموظف.' 
                                        : '💡 It is recommended to route calls to the IVR (e.g. 700) so callers hear a greeting first.'}
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'النطاقات المسموحة (مفصولة بفاصلة)' : 'Allowed Domains (comma separated)'}</Label>
                            <Input value={domainsInput} onChange={e => setDomainsInput(e.target.value)} placeholder="texacore.ai, example.com" />
                            <p className="text-[10px] text-gray-400">{isRTL ? 'حماية السيرفر من الاتصالات العشوائية بحصره على موقعك.' : 'Protect your server from spam by restricting to your domains.'}</p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold mb-4">{isRTL ? 'إعدادات زر الاتصال' : 'Call Button Settings'}</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'لون الزر الأساسي' : 'Theme Color'}</Label>
                                    <div className="flex items-center gap-3">
                                        <Input type="color" className="w-12 h-10 p-1" value={formData.theme_color || '#10b981'} onChange={e => setFormData({ ...formData, theme_color: e.target.value })} />
                                        <Input value={formData.theme_color || ''} onChange={e => setFormData({ ...formData, theme_color: e.target.value })} className="font-mono text-xs uppercase" />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'نص زر الاتصال' : 'Button Text'}</Label>
                                    <Input value={formData.button_text || ''} onChange={e => setFormData({ ...formData, button_text: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                            <div>
                                <Label className="text-sm font-semibold">{isRTL ? 'تفعيل الويدجت' : 'Widget Active'}</Label>
                                <p className="text-xs text-gray-500">{isRTL ? 'تعطيل الويدجت يمنع إجراء اتصالات من خلاله' : 'Disable to stop calls from this widget'}</p>
                            </div>
                            <Switch checked={formData.is_active} onCheckedChange={(val) => setFormData({ ...formData, is_active: val })} />
                        </div>
                    </div>

                    <SheetFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-slate-900">
                        <div className="flex items-center justify-end gap-2 w-full">
                            <Button variant="outline" onClick={onClose} disabled={isSaving}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]" onClick={handleSave} disabled={isSaving || !formData.name || !formData.target_destination}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 me-2" /> {isRTL ? 'حفظ' : 'Save'}</>}
                            </Button>
                        </div>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}
