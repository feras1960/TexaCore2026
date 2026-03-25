/**
 * AddContactSheet — نافذة إضافة/عرض/تعديل جهة اتصال
 * 
 * ✅ نمط الشيت الجانبي (Sheet)
 * ✅ إدخال متعدد اللغات (9 لغات)
 * ✅ تبويبات: المعلومات الأساسية + التصنيف + ملاحظات
 * ✅ زر التحويل إلى عميل
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Save, X, UserCheck, Phone, Mail, Building2,
    Globe, MapPin, Tag, MessageSquare, Edit3,
} from 'lucide-react';

import { contactsService, type Contact } from '@/services/contactsService';

interface AddContactSheetProps {
    isOpen: boolean;
    onClose: () => void;
    contact?: Contact | null;
    mode: 'create' | 'edit' | 'view';
    onSaved: () => void;
    onConvert?: (contact: Contact) => void;
}

const LANGUAGE_FIELDS = [
    { key: 'name_ar', label: 'العربية', flag: '🇸🇦' },
    { key: 'name_en', label: 'English', flag: '🇬🇧' },
    { key: 'name_ru', label: 'Русский', flag: '🇷🇺' },
    { key: 'name_uk', label: 'Українська', flag: '🇺🇦' },
    { key: 'name_ro', label: 'Română', flag: '🇷🇴' },
    { key: 'name_pl', label: 'Polski', flag: '🇵🇱' },
    { key: 'name_tr', label: 'Türkçe', flag: '🇹🇷' },
    { key: 'name_de', label: 'Deutsch', flag: '🇩🇪' },
    { key: 'name_it', label: 'Italiano', flag: '🇮🇹' },
];

export default function AddContactSheet({ isOpen, onClose, contact, mode, onSaved, onConvert }: AddContactSheetProps) {
    const { t, language, direction } = useLanguage();
    const { companyId, company } = useCompany();
    const isRTL = direction === 'rtl';
    const isViewMode = mode === 'view';
    const isEditing = mode === 'create' || mode === 'edit';

    // Form state
    const [form, setForm] = useState<Partial<Contact>>({
        first_name: '', last_name: '',
        name_ar: '', name_en: '',
        organization: '', job_title: '',
        email: '', phone: '', mobile: '', whatsapp: '',
        telegram_username: '',
        country: '', city: '', address: '',
        source: 'manual',
        contact_type: 'lead',
        lifecycle_stage: 'new',
        priority: 'medium',
        notes: '',
        status: 'active',
    });
    const [saving, setSaving] = useState(false);
    const [showAllLanguages, setShowAllLanguages] = useState(false);

    // Populate form when editing/viewing
    useEffect(() => {
        if (contact) {
            setForm({ ...contact });
        } else {
            setForm({
                first_name: '', last_name: '',
                name_ar: '', name_en: '',
                organization: '', job_title: '',
                email: '', phone: '', mobile: '', whatsapp: '',
                telegram_username: '',
                country: '', city: '', address: '',
                source: 'manual',
                contact_type: 'lead',
                lifecycle_stage: 'new',
                priority: 'medium',
                notes: '',
                status: 'active',
            });
        }
    }, [contact]);

    const updateField = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!form.name_ar && !form.name_en && !form.first_name) {
            toast.error(isRTL ? 'الاسم مطلوب' : 'Name is required');
            return;
        }

        setSaving(true);
        try {
            if (mode === 'create') {
                await contactsService.createContact({
                    ...form,
                    tenant_id: company?.tenant_id!,
                    company_id: companyId!,
                });
                toast.success(isRTL ? 'تم إنشاء جهة الاتصال' : 'Contact created');
            } else if (mode === 'edit' && contact?.id) {
                await contactsService.updateContact(contact.id, form);
                toast.success(isRTL ? 'تم تحديث جهة الاتصال' : 'Contact updated');
            }
            onSaved();
        } catch (e: any) {
            toast.error(e.message || (isRTL ? 'حدث خطأ' : 'Error occurred'));
        } finally {
            setSaving(false);
        }
    };

    const inputClass = isViewMode
        ? 'bg-gray-50 dark:bg-gray-800 border-transparent cursor-default'
        : '';

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side={isRTL ? 'left' : 'right'}
                className="w-full sm:max-w-lg p-0 flex flex-col"
            >
                {/* Header */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-lg font-bold text-erp-navy dark:text-white">
                                {mode === 'create'
                                    ? (isRTL ? 'إضافة جهة اتصال' : 'Add Contact')
                                    : mode === 'edit'
                                        ? (isRTL ? 'تعديل جهة الاتصال' : 'Edit Contact')
                                        : (isRTL ? 'تفاصيل جهة الاتصال' : 'Contact Details')
                                }
                            </SheetTitle>
                            <SheetDescription className="text-xs text-gray-400 mt-1">
                                {mode === 'create'
                                    ? (isRTL ? 'أدخل بيانات جهة الاتصال الجديدة' : 'Enter new contact information')
                                    : contact?.lifecycle_stage && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {contact.lifecycle_stage}
                                        </Badge>
                                    )
                                }
                            </SheetDescription>
                        </div>
                        {isViewMode && contact && !contact.converted_customer_id && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onConvert?.(contact)}
                                    className="gap-1 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {isRTL ? 'تحويل لعميل' : 'Convert'}
                                </Button>
                            </div>
                        )}
                        {contact?.converted_customer_id && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                                <UserCheck className="w-3 h-3" />
                                {isRTL ? 'تم التحويل' : 'Converted'}
                            </Badge>
                        )}
                    </div>
                </SheetHeader>

                {/* Body */}
                <ScrollArea className="flex-1 px-6 py-4">
                    <div className="space-y-6 pb-6">
                        {/* Names */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Edit3 className="w-4 h-4" />
                                {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'الاسم الأول' : 'First Name'}</Label>
                                    <Input
                                        value={form.first_name || ''}
                                        onChange={e => updateField('first_name', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'الاسم الأخير' : 'Last Name'}</Label>
                                    <Input
                                        value={form.last_name || ''}
                                        onChange={e => updateField('last_name', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                            </div>

                            {/* Primary names (ar + en) */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">🇸🇦 {isRTL ? 'الاسم العربي' : 'Arabic Name'}</Label>
                                    <Input
                                        value={form.name_ar || ''}
                                        onChange={e => updateField('name_ar', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                        dir="rtl"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">🇬🇧 {isRTL ? 'الاسم الإنجليزي' : 'English Name'}</Label>
                                    <Input
                                        value={form.name_en || ''}
                                        onChange={e => updateField('name_en', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {/* Other 7 languages (collapsible) */}
                            {isEditing && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllLanguages(!showAllLanguages)}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 px-0"
                                >
                                    <Globe className="w-3.5 h-3.5 me-1" />
                                    {showAllLanguages
                                        ? (isRTL ? 'إخفاء اللغات الأخرى' : 'Hide other languages')
                                        : (isRTL ? 'إضافة اسم بلغات أخرى (7)' : 'Add name in other languages (7)')
                                    }
                                </Button>
                            )}
                            {showAllLanguages && LANGUAGE_FIELDS.filter(f => !['name_ar', 'name_en'].includes(f.key)).map(lang => (
                                <div key={lang.key} className="space-y-1.5">
                                    <Label className="text-xs">{lang.flag} {lang.label}</Label>
                                    <Input
                                        value={(form as any)[lang.key] || ''}
                                        onChange={e => updateField(lang.key, e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                            ))}

                            {/* Organization */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {isRTL ? 'الشركة/المنظمة' : 'Organization'}
                                    </Label>
                                    <Input
                                        value={form.organization || ''}
                                        onChange={e => updateField('organization', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                                    <Input
                                        value={form.job_title || ''}
                                        onChange={e => updateField('job_title', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Contact Info */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {isRTL ? 'معلومات الاتصال' : 'Contact Information'}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                                    <Input
                                        value={form.phone || ''}
                                        onChange={e => updateField('phone', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'الجوال' : 'Mobile'}</Label>
                                    <Input
                                        value={form.mobile || ''}
                                        onChange={e => updateField('mobile', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {isRTL ? 'البريد' : 'Email'}
                                    </Label>
                                    <Input
                                        type="email"
                                        value={form.email || ''}
                                        onChange={e => updateField('email', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        {isRTL ? 'واتساب' : 'WhatsApp'}
                                    </Label>
                                    <Input
                                        value={form.whatsapp || ''}
                                        onChange={e => updateField('whatsapp', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{isRTL ? 'تيلغرام' : 'Telegram'}</Label>
                                <Input
                                    value={form.telegram_username || ''}
                                    onChange={e => updateField('telegram_username', e.target.value)}
                                    readOnly={isViewMode}
                                    className={`h-9 text-sm ${inputClass}`}
                                    dir="ltr"
                                    placeholder="@username"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Address */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {isRTL ? 'العنوان' : 'Address'}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'الدولة' : 'Country'}</Label>
                                    <Input
                                        value={form.country || ''}
                                        onChange={e => updateField('country', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'المدينة' : 'City'}</Label>
                                    <Input
                                        value={form.city || ''}
                                        onChange={e => updateField('city', e.target.value)}
                                        readOnly={isViewMode}
                                        className={`h-9 text-sm ${inputClass}`}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{isRTL ? 'العنوان التفصيلي' : 'Full Address'}</Label>
                                <Textarea
                                    value={form.address || ''}
                                    onChange={e => updateField('address', e.target.value)}
                                    readOnly={isViewMode}
                                    className={`text-sm min-h-[60px] ${inputClass}`}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Classification */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                {isRTL ? 'التصنيف' : 'Classification'}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'المصدر' : 'Source'}</Label>
                                    <Select
                                        value={form.source || 'manual'}
                                        onValueChange={v => updateField('source', v)}
                                        disabled={isViewMode}
                                    >
                                        <SelectTrigger className={`h-9 text-xs ${inputClass}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">{isRTL ? 'يدوي' : 'Manual'}</SelectItem>
                                            <SelectItem value="phone_inbound">{isRTL ? 'مكالمة واردة' : 'Inbound Call'}</SelectItem>
                                            <SelectItem value="phone_outbound">{isRTL ? 'مكالمة صادرة' : 'Outbound Call'}</SelectItem>
                                            <SelectItem value="website">{isRTL ? 'الموقع' : 'Website'}</SelectItem>
                                            <SelectItem value="google_ads">{isRTL ? 'جوجل' : 'Google Ads'}</SelectItem>
                                            <SelectItem value="facebook_ads">{isRTL ? 'فيسبوك' : 'Facebook'}</SelectItem>
                                            <SelectItem value="instagram_ads">{isRTL ? 'انستغرام' : 'Instagram'}</SelectItem>
                                            <SelectItem value="telegram">{isRTL ? 'تلغرام' : 'Telegram'}</SelectItem>
                                            <SelectItem value="whatsapp">{isRTL ? 'واتساب' : 'WhatsApp'}</SelectItem>
                                            <SelectItem value="referral">{isRTL ? 'إحالة' : 'Referral'}</SelectItem>
                                            <SelectItem value="walk_in">{isRTL ? 'زيارة' : 'Walk-in'}</SelectItem>
                                            <SelectItem value="exhibition">{isRTL ? 'معرض' : 'Exhibition'}</SelectItem>
                                            <SelectItem value="email_campaign">{isRTL ? 'حملة بريدية' : 'Email'}</SelectItem>
                                            <SelectItem value="online_store">{isRTL ? 'المتجر' : 'Store'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'الأولوية' : 'Priority'}</Label>
                                    <Select
                                        value={form.priority || 'medium'}
                                        onValueChange={v => updateField('priority', v)}
                                        disabled={isViewMode}
                                    >
                                        <SelectTrigger className={`h-9 text-xs ${inputClass}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{isRTL ? 'منخفض' : 'Low'}</SelectItem>
                                            <SelectItem value="medium">{isRTL ? 'متوسط' : 'Medium'}</SelectItem>
                                            <SelectItem value="high">{isRTL ? 'عالي' : 'High'}</SelectItem>
                                            <SelectItem value="urgent">{isRTL ? 'عاجل' : 'Urgent'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'النوع' : 'Type'}</Label>
                                    <Select
                                        value={form.contact_type || 'lead'}
                                        onValueChange={v => updateField('contact_type', v)}
                                        disabled={isViewMode}
                                    >
                                        <SelectTrigger className={`h-9 text-xs ${inputClass}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lead">{isRTL ? 'عميل محتمل' : 'Lead'}</SelectItem>
                                            <SelectItem value="prospect">{isRTL ? 'مرشح' : 'Prospect'}</SelectItem>
                                            <SelectItem value="wholesale_lead">{isRTL ? 'جملة' : 'Wholesale'}</SelectItem>
                                            <SelectItem value="retail_lead">{isRTL ? 'مفرق' : 'Retail'}</SelectItem>
                                            <SelectItem value="partner_lead">{isRTL ? 'شريك' : 'Partner'}</SelectItem>
                                            <SelectItem value="existing_contact">{isRTL ? 'قائم' : 'Existing'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{isRTL ? 'المرحلة' : 'Stage'}</Label>
                                    <Select
                                        value={form.lifecycle_stage || 'new'}
                                        onValueChange={v => updateField('lifecycle_stage', v)}
                                        disabled={isViewMode}
                                    >
                                        <SelectTrigger className={`h-9 text-xs ${inputClass}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">{isRTL ? 'جديد' : 'New'}</SelectItem>
                                            <SelectItem value="contacted">{isRTL ? 'تم التواصل' : 'Contacted'}</SelectItem>
                                            <SelectItem value="interested">{isRTL ? 'مهتم' : 'Interested'}</SelectItem>
                                            <SelectItem value="qualified">{isRTL ? 'مؤهل' : 'Qualified'}</SelectItem>
                                            <SelectItem value="negotiation">{isRTL ? 'تفاوض' : 'Negotiation'}</SelectItem>
                                            <SelectItem value="lost">{isRTL ? 'خسارة' : 'Lost'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Notes */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {isRTL ? 'ملاحظات' : 'Notes'}
                            </h3>
                            <Textarea
                                value={form.notes || ''}
                                onChange={e => updateField('notes', e.target.value)}
                                readOnly={isViewMode}
                                className={`text-sm min-h-[80px] ${inputClass}`}
                                placeholder={isRTL ? 'أضف ملاحظاتك هنا...' : 'Add your notes here...'}
                                rows={3}
                            />
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer Actions */}
                {isEditing && (
                    <div className="border-t px-6 py-4 flex justify-end gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={onClose} className="gap-1">
                            <X className="w-4 h-4" />
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                        >
                            <Save className="w-4 h-4" />
                            {saving
                                ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...')
                                : (isRTL ? 'حفظ' : 'Save')
                            }
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
