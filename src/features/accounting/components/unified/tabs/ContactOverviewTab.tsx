/**
 * ContactOverviewTab — تبويب نظرة عامة / نموذج جهة الاتصال
 * 
 * ✅ يستخدم في الوضعيات الثلاث: create / edit / view
 * ✅ 9 لغات للاسم (قابل للطي)
 * ✅ معلومات الاتصال + العنوان + التصنيف
 * ✅ بطاقات إحصائية في وضع العرض
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Edit3, Phone, Mail, Building2, Globe, MapPin, Tag,
    MessageSquare, UserCheck, Clock, Star, TrendingUp,
    PhoneIncoming, PhoneOutgoing, Sparkles, Target,
    ArrowUpDown, AlertCircle, Archive,
} from 'lucide-react';

import type { SheetMode } from '../types';

interface ContactOverviewTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    groups?: any[];
}

const LANGUAGE_FIELDS = [
    { key: 'name_ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    { key: 'name_en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
    { key: 'name_ru', label: 'Русский', flag: '🇷🇺', dir: 'ltr' },
    { key: 'name_uk', label: 'Українська', flag: '🇺🇦', dir: 'ltr' },
    { key: 'name_ro', label: 'Română', flag: '🇷🇴', dir: 'ltr' },
    { key: 'name_pl', label: 'Polski', flag: '🇵🇱', dir: 'ltr' },
    { key: 'name_tr', label: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
    { key: 'name_de', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
    { key: 'name_it', label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
];

const STAGE_CONFIG: Record<string, { color: string; icon: React.ElementType; labelAr: string; labelEn: string }> = {
    new: { color: 'bg-blue-100 text-blue-700', icon: Sparkles, labelAr: 'جديد', labelEn: 'New' },
    contacted: { color: 'bg-cyan-100 text-cyan-700', icon: Phone, labelAr: 'تم التواصل', labelEn: 'Contacted' },
    interested: { color: 'bg-amber-100 text-amber-700', icon: Star, labelAr: 'مهتم', labelEn: 'Interested' },
    qualified: { color: 'bg-green-100 text-green-700', icon: Target, labelAr: 'مؤهل', labelEn: 'Qualified' },
    negotiation: { color: 'bg-purple-100 text-purple-700', icon: ArrowUpDown, labelAr: 'تفاوض', labelEn: 'Negotiation' },
    converted: { color: 'bg-emerald-100 text-emerald-700', icon: UserCheck, labelAr: 'محوّل', labelEn: 'Converted' },
    lost: { color: 'bg-red-100 text-red-700', icon: AlertCircle, labelAr: 'خسارة', labelEn: 'Lost' },
    archived: { color: 'bg-gray-100 text-gray-500', icon: Archive, labelAr: 'مؤرشف', labelEn: 'Archived' },
};

export function ContactOverviewTab({ data, mode, onChange }: ContactOverviewTabProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isViewMode = mode === 'view';
    const isEditing = mode === 'create' || mode === 'edit';
    const [showAllLanguages, setShowAllLanguages] = useState(false);

    const updateField = (key: string, value: any) => {
        onChange({ [key]: value });
    };

    const inputClass = isViewMode
        ? 'bg-gray-50 dark:bg-gray-800 border-transparent cursor-default'
        : '';

    // View-mode stats cards
    const stats = isViewMode && data ? [
        { label: isRTL ? 'التفاعلات' : 'Interactions', value: data.interaction_count || 0, icon: MessageSquare, color: 'text-indigo-600' },
        { label: isRTL ? 'المكالمات' : 'Calls', value: data.total_calls || 0, icon: Phone, color: 'text-green-600' },
        { label: isRTL ? 'نقاط العميل' : 'Lead Score', value: data.lead_score || 0, icon: Star, color: 'text-amber-600' },
        {
            label: isRTL ? 'آخر نشاط' : 'Last Activity',
            value: data.last_interaction_at
                ? new Date(data.last_interaction_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
                : '—',
            icon: Clock,
            color: 'text-gray-500',
        },
    ] : [];

    return (
        <div className="space-y-6">
            {/* View Mode: Stats Cards */}
            {isViewMode && stats.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <Card key={i} className="border-0 shadow-sm">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${s.color}`}>
                                        <Icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-erp-navy dark:text-white">{s.value}</p>
                                        <p className="text-[11px] text-gray-400">{s.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* View Mode: Pipeline Stage */}
            {isViewMode && data?.lifecycle_stage && (
                <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
                        const isActive = data.lifecycle_stage === key;
                        const StageIcon = cfg.icon;
                        return (
                            <Badge
                                key={key}
                                variant="outline"
                                className={`gap-1 text-xs px-2.5 py-1 transition-all ${isActive ? `${cfg.color} border-0 font-semibold ring-2 ring-offset-1 ring-current/20` : 'text-gray-300 border-gray-200'
                                    }`}
                            >
                                <StageIcon className="w-3 h-3" />
                                {isRTL ? cfg.labelAr : cfg.labelEn}
                            </Badge>
                        );
                    })}
                </div>
            )}

            {/* Section: Basic Information */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'الاسم الأول' : 'First Name'}</Label>
                        <Input value={data?.first_name || ''} onChange={e => updateField('first_name', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'الاسم الأخير' : 'Last Name'}</Label>
                        <Input value={data?.last_name || ''} onChange={e => updateField('last_name', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} />
                    </div>
                </div>

                {/* Primary names */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">🇸🇦 {isRTL ? 'الاسم العربي' : 'Arabic Name'}</Label>
                        <Input value={data?.name_ar || ''} onChange={e => updateField('name_ar', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="rtl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">🇬🇧 {isRTL ? 'الاسم الإنجليزي' : 'English Name'}</Label>
                        <Input value={data?.name_en || ''} onChange={e => updateField('name_en', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="ltr" />
                    </div>
                </div>

                {/* Collapsible 7 other languages */}
                {isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllLanguages(!showAllLanguages)} className="text-xs text-indigo-600 hover:text-indigo-700 px-0">
                        <Globe className="w-3.5 h-3.5 me-1" />
                        {showAllLanguages
                            ? (isRTL ? 'إخفاء اللغات الأخرى' : 'Hide other languages')
                            : (isRTL ? 'إضافة اسم بلغات أخرى (7)' : 'Add name in other languages (7)')
                        }
                    </Button>
                )}
                {(showAllLanguages || isViewMode) && LANGUAGE_FIELDS.filter(f => !['name_ar', 'name_en'].includes(f.key)).map(lang => {
                    const val = data?.[lang.key];
                    // In view mode, skip empty languages
                    if (isViewMode && !val) return null;
                    return (
                        <div key={lang.key} className="space-y-1.5">
                            <Label className="text-xs">{lang.flag} {lang.label}</Label>
                            <Input value={val || ''} onChange={e => updateField(lang.key, e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir={lang.dir} />
                        </div>
                    );
                })}

                {/* Organization */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Building2 className="w-3 h-3" /> {isRTL ? 'الشركة/المنظمة' : 'Organization'}</Label>
                        <Input value={data?.organization || ''} onChange={e => updateField('organization', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                        <Input value={data?.job_title || ''} onChange={e => updateField('job_title', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} />
                    </div>
                </div>
            </div>

            <Separator />

            {/* Section: Contact Information */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {isRTL ? 'معلومات الاتصال' : 'Contact Information'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                        <Input value={data?.phone || ''} onChange={e => updateField('phone', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="ltr" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'الجوال' : 'Mobile'}</Label>
                        <Input value={data?.mobile || ''} onChange={e => updateField('mobile', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="ltr" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {isRTL ? 'البريد' : 'Email'}</Label>
                        <Input type="email" value={data?.email || ''} onChange={e => updateField('email', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="ltr" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {isRTL ? 'واتساب' : 'WhatsApp'}</Label>
                        <Input value={data?.whatsapp || ''} onChange={e => updateField('whatsapp', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="ltr" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'تيلغرام' : 'Telegram'}</Label>
                    <Input value={data?.telegram_username || ''} onChange={e => updateField('telegram_username', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} dir="ltr" placeholder="@username" />
                </div>
            </div>

            <Separator />

            {/* Section: Address */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {isRTL ? 'العنوان' : 'Address'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'الدولة' : 'Country'}</Label>
                        <Input value={data?.country || ''} onChange={e => updateField('country', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'المدينة' : 'City'}</Label>
                        <Input value={data?.city || ''} onChange={e => updateField('city', e.target.value)} readOnly={isViewMode} className={`h-9 text-sm ${inputClass}`} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? 'العنوان التفصيلي' : 'Full Address'}</Label>
                    <Textarea value={data?.address || ''} onChange={e => updateField('address', e.target.value)} readOnly={isViewMode} className={`text-sm min-h-[60px] ${inputClass}`} rows={2} />
                </div>
            </div>

            <Separator />

            {/* Section: Classification */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {isRTL ? 'التصنيف' : 'Classification'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'المصدر' : 'Source'}</Label>
                        <Select value={data?.source || 'manual'} onValueChange={v => updateField('source', v)} disabled={isViewMode}>
                            <SelectTrigger className={`h-9 text-xs ${inputClass}`}><SelectValue /></SelectTrigger>
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
                        <Select value={data?.priority || 'medium'} onValueChange={v => updateField('priority', v)} disabled={isViewMode}>
                            <SelectTrigger className={`h-9 text-xs ${inputClass}`}><SelectValue /></SelectTrigger>
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
                        <Select value={data?.contact_type || 'lead'} onValueChange={v => updateField('contact_type', v)} disabled={isViewMode}>
                            <SelectTrigger className={`h-9 text-xs ${inputClass}`}><SelectValue /></SelectTrigger>
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
                        <Select value={data?.lifecycle_stage || 'new'} onValueChange={v => updateField('lifecycle_stage', v)} disabled={isViewMode}>
                            <SelectTrigger className={`h-9 text-xs ${inputClass}`}><SelectValue /></SelectTrigger>
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

            {/* View: Converted badge */}
            {isViewMode && data?.converted_customer_id && (
                <>
                    <Separator />
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <UserCheck className="w-5 h-5 text-emerald-600" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                {isRTL ? 'تم التحويل إلى عميل' : 'Converted to Customer'}
                            </p>
                            {data.converted_at && (
                                <p className="text-xs text-emerald-500">
                                    {new Date(data.converted_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default ContactOverviewTab;
