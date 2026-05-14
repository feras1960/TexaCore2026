import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { WebCallback } from '../pages/WebCallbacksPage';
import { Save, Loader2, Globe } from 'lucide-react';

interface WebCallbackSheetProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    data: WebCallback | null;
    companyId: string;
    onSuccess: () => void;
}

export function WebCallbackSheet({ isOpen, onClose, mode, data, companyId, onSuccess }: WebCallbackSheetProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<WebCallback>>({
        name: '',
        target_type: 'extension',
        target_id: '',
        allowed_domains: [],
        theme_color: '#4f46e5',
        title_text: isRTL ? 'اتصل بي' : 'Call Me Back',
        description_text: isRTL ? 'أدخل رقمك وسنقوم بالاتصال بك خلال 30 ثانية.' : 'Enter your number and we will call you back within 30 seconds.',
        is_active: true
    });
    
    // Domains input state
    const [domainsInput, setDomainsInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && data) {
                setFormData(data);
                setDomainsInput(data.allowed_domains?.join(', ') || '');
            } else {
                setFormData({
                    name: '',
                    target_type: 'extension',
                    target_id: '',
                    allowed_domains: [],
                    theme_color: '#4f46e5',
                    title_text: isRTL ? 'اتصل بي' : 'Call Me Back',
                    description_text: isRTL ? 'أدخل رقمك وسنقوم بالاتصال بك خلال 30 ثانية.' : 'Enter your number and we will call you back within 30 seconds.',
                    is_active: true
                });
                setDomainsInput('');
            }
        }
    }, [isOpen, mode, data, isRTL]);

    const handleSave = async () => {
        if (!formData.name || !formData.target_id) return;
        setIsSaving(true);
        try {
            // Process domains
            const domainsList = domainsInput.split(',').map(d => d.trim()).filter(d => d.length > 0);
            
            const payload = {
                company_id: companyId,
                name: formData.name,
                target_type: formData.target_type,
                target_id: formData.target_id,
                theme_color: formData.theme_color,
                title_text: formData.title_text,
                description_text: formData.description_text,
                allowed_domains: domainsList,
                is_active: formData.is_active
            };

            if (mode === 'create') {
                const { error } = await supabase.from('pbx_web_callbacks').insert(payload);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('pbx_web_callbacks').update(payload).eq('id', data!.id);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving web callback:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side={isRTL ? 'right' : 'left'} className="w-[400px] sm:w-[540px] flex flex-col p-0 border-none">
                <div className="flex flex-col h-full bg-white dark:bg-slate-950 shadow-2xl">
                    <SheetHeader className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="text-start">
                                <SheetTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                    {mode === 'create' ? (isRTL ? 'إنشاء ويدجت جديد' : 'Create New Widget') : (isRTL ? 'تعديل إعدادات الويدجت' : 'Edit Widget Settings')}
                                </SheetTitle>
                                <SheetDescription className="text-xs text-gray-500">
                                    {isRTL ? 'قم بضبط إعدادات الويدجت والتوجيه' : 'Configure the widget and call routing settings'}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" dir={direction}>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'اسم الويدجت' : 'Widget Name'} *</Label>
                            <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={isRTL ? 'مثال: المبيعات - الموقع الرئيسي' : 'e.g. Sales - Main Website'} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'نوع الوجهة' : 'Target Type'} *</Label>
                                <Select value={formData.target_type} onValueChange={(val: any) => setFormData({ ...formData, target_type: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="extension">{isRTL ? 'رقم داخلي' : 'Extension'}</SelectItem>
                                        <SelectItem value="ring_group">{isRTL ? 'مجموعة رنين' : 'Ring Group'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'معرف الوجهة (الرقم)' : 'Target ID (Number)'} *</Label>
                                <Input value={formData.target_id || ''} onChange={e => setFormData({ ...formData, target_id: e.target.value })} placeholder="100, 200..." />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'النطاقات المسموحة (مفصولة بفاصلة)' : 'Allowed Domains (comma separated)'}</Label>
                            <Input value={domainsInput} onChange={e => setDomainsInput(e.target.value)} placeholder="example.com, my-store.com" />
                            <p className="text-[10px] text-gray-400">{isRTL ? 'اتركها فارغة للسماح للكل (غير منصوح به أمنياً)' : 'Leave empty to allow all (not recommended)'}</p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold mb-4">{isRTL ? 'إعدادات المظهر (الشكل)' : 'Appearance Settings'}</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'لون الويدجت' : 'Theme Color'}</Label>
                                    <div className="flex items-center gap-3">
                                        <Input type="color" className="w-12 h-10 p-1" value={formData.theme_color || '#4f46e5'} onChange={e => setFormData({ ...formData, theme_color: e.target.value })} />
                                        <Input value={formData.theme_color || ''} onChange={e => setFormData({ ...formData, theme_color: e.target.value })} className="font-mono text-xs" />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'النص الرئيسي (العنوان)' : 'Title Text'}</Label>
                                    <Input value={formData.title_text || ''} onChange={e => setFormData({ ...formData, title_text: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">{isRTL ? 'الوصف' : 'Description Text'}</Label>
                                    <Textarea value={formData.description_text || ''} onChange={e => setFormData({ ...formData, description_text: e.target.value })} className="h-20 resize-none text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                            <div>
                                <Label className="text-sm font-semibold">{isRTL ? 'تفعيل الويدجت' : 'Widget Active'}</Label>
                                <p className="text-xs text-gray-500">{isRTL ? 'تعطيل الويدجت يمنع استقبال أي مكالمات من خلاله' : 'Disable widget to stop receiving calls from it'}</p>
                            </div>
                            <Switch checked={formData.is_active} onCheckedChange={(val) => setFormData({ ...formData, is_active: val })} />
                        </div>
                    </div>

                    <SheetFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-slate-900">
                        <div className="flex items-center justify-end gap-2 w-full">
                            <Button variant="outline" onClick={onClose} disabled={isSaving}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]" onClick={handleSave} disabled={isSaving || !formData.name || !formData.target_id}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 me-2" /> {isRTL ? 'حفظ' : 'Save'}</>}
                            </Button>
                        </div>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}
