/**
 * ════════════════════════════════════════════════════════════════
 * 📝 Platform Content Management Tab
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Megaphone, MessageSquareQuote, Phone, Layout,
    Save, Plus, Trash2, Edit, X, Loader2, Star,
    type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────
interface ContentTabProps {
    platformCode: string;
    siteId: string;
}

type ContentSection = 'announcements' | 'testimonials' | 'contact' | 'hero';

const CONTENT_SECTIONS: { id: ContentSection; labelAr: string; labelEn: string; icon: LucideIcon }[] = [
    { id: 'announcements', labelAr: 'الإعلانات', labelEn: 'Announcements', icon: Megaphone },
    { id: 'testimonials', labelAr: 'آراء الزبائن', labelEn: 'Testimonials', icon: MessageSquareQuote },
    { id: 'contact', labelAr: 'معلومات الاتصال', labelEn: 'Contact Info', icon: Phone },
    { id: 'hero', labelAr: 'القسم الرئيسي', labelEn: 'Hero Section', icon: Layout },
];

const LANGUAGES = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'ro', label: 'Română', flag: '🇷🇴' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function PlatformContentTab({ platformCode, siteId }: ContentTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [activeSection, setActiveSection] = useState<ContentSection>('announcements');

    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
                {CONTENT_SECTIONS.map(section => (
                    <Button key={section.id}
                        variant={activeSection === section.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveSection(section.id)}
                        className={cn("gap-1.5 text-xs h-8", activeSection === section.id && "bg-indigo-600 hover:bg-indigo-700")}>
                        <section.icon className="w-3.5 h-3.5" />
                        {isAr ? section.labelAr : section.labelEn}
                    </Button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={activeSection} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    {activeSection === 'announcements' && <AnnouncementManager siteId={siteId} isAr={isAr} />}
                    {activeSection === 'testimonials' && <TestimonialsManager siteId={siteId} isAr={isAr} />}
                    {activeSection === 'contact' && <ContactManager siteId={siteId} isAr={isAr} />}
                    {activeSection === 'hero' && <HeroManager siteId={siteId} isAr={isAr} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// LANGUAGE SELECTOR COMPONENT (reusable)
// ═══════════════════════════════════════════════════════════════
function LangSelector({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
    return (
        <div className="flex gap-1 flex-wrap">
            {LANGUAGES.map(l => (
                <Button key={l.code} size="sm" variant={lang === l.code ? 'default' : 'ghost'}
                    className={cn("h-7 text-xs px-1.5", lang === l.code && "bg-indigo-600")}
                    onClick={() => setLang(l.code)}>
                    {l.flag}
                </Button>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 📢 ANNOUNCEMENTS MANAGER
// ═══════════════════════════════════════════════════════════════
function AnnouncementManager({ siteId, isAr }: { siteId: string; isAr: boolean }) {
    const [lang, setLang] = useState('ar');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        text: '',
        link: '',
        is_enabled: true,
        background_color: '#047857',
        text_color: '#ffffff',
        animation_type: 'scroll' as string,
        animation_speed: 30,
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: row, error } = await supabase
                .from('announcement_settings')
                .select('*')
                .eq('site_id', siteId)
                .eq('language', lang)
                .maybeSingle();
            if (row && !error) {
                setData(row);
                setForm({
                    text: row.text || '',
                    link: row.link || '',
                    is_enabled: row.is_enabled ?? true,
                    background_color: row.background_color || '#047857',
                    text_color: row.text_color || '#ffffff',
                    animation_type: row.animation_type || 'scroll',
                    animation_speed: row.animation_speed ?? 30,
                });
            } else {
                setData(null);
                setForm({ text: '', link: '', is_enabled: true, background_color: '#047857', text_color: '#ffffff', animation_type: 'scroll', animation_speed: 30 });
            }
        } catch (err) {
            console.error('Load announcement error:', err);
        }
        setLoading(false);
    }, [siteId, lang]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        const payload = { site_id: siteId, language: lang, ...form };
        const { error } = data?.id
            ? await supabase.from('announcement_settings').update(payload).eq('id', data.id)
            : await supabase.from('announcement_settings').insert(payload);
        if (error) toast.error((isAr ? 'خطأ: ' : 'Error: ') + error.message);
        else { toast.success(isAr ? 'تم الحفظ ✅' : 'Saved ✅'); load(); }
        setSaving(false);
    };

    const ANIM_TYPES = [
        { value: 'scroll', labelAr: '🎞️ تحريك', labelEn: '🎞️ Scroll' },
        { value: 'static', labelAr: '📌 ثابت', labelEn: '📌 Static' },
        { value: 'blink', labelAr: '✨ وميض', labelEn: '✨ Blink' },
    ];

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-orange-500" />
                        {isAr ? 'شريط الإعلانات' : 'Announcement Bar'}
                        {data && <Badge variant="secondary" className="text-[10px]">{isAr ? 'محفوظ' : 'Saved'}</Badge>}
                    </CardTitle>
                    <LangSelector lang={lang} setLang={setLang} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <Label className="text-xs min-w-[60px]">{isAr ? 'مفعّل' : 'Active'}</Label>
                    <Switch checked={form.is_enabled} onCheckedChange={v => setForm({ ...form, is_enabled: v })} />
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'نص الإعلان' : 'Message'}</Label>
                    <Textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
                        placeholder={isAr ? 'اكتب نص الإعلان...' : 'Announcement text...'} className="mt-1 text-sm" rows={2} />
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'رابط' : 'Link (optional)'}</Label>
                    <Input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })}
                        placeholder="/pricing" className="mt-1 text-sm" dir="ltr" />
                </div>

                {/* Animation Controls */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs mb-1.5 block">{isAr ? 'نوع المؤثر' : 'Animation'}</Label>
                        <div className="flex gap-1">
                            {ANIM_TYPES.map(t => (
                                <Button key={t.value} size="sm"
                                    variant={form.animation_type === t.value ? 'default' : 'outline'}
                                    onClick={() => setForm({ ...form, animation_type: t.value })}
                                    className={cn("h-8 text-xs flex-1", form.animation_type === t.value && "bg-indigo-600")}>
                                    {isAr ? t.labelAr : t.labelEn}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs mb-1.5 block">{isAr ? 'السرعة' : 'Speed'} ({form.animation_speed}s)</Label>
                        <input type="range" min="10" max="60" value={form.animation_speed}
                            onChange={e => setForm({ ...form, animation_speed: Number(e.target.value) })}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-indigo-600 mt-3" />
                    </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">{isAr ? 'لون الخلفية' : 'Background'}</Label>
                        <div className="flex gap-2 mt-1 items-center">
                            <input type="color" value={form.background_color} onChange={e => setForm({ ...form, background_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border" />
                            <Input value={form.background_color} onChange={e => setForm({ ...form, background_color: e.target.value })} className="text-xs h-8 font-mono" dir="ltr" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">{isAr ? 'لون النص' : 'Text Color'}</Label>
                        <div className="flex gap-2 mt-1 items-center">
                            <input type="color" value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border" />
                            <Input value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="text-xs h-8 font-mono" dir="ltr" />
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                {form.text && (
                    <div>
                        <Label className="text-xs mb-1.5 block text-gray-500">{isAr ? '👁️ معاينة' : '👁️ Preview'}</Label>
                        <div className="rounded-lg border" style={{ backgroundColor: form.background_color, color: form.text_color, overflow: 'hidden', height: '42px', position: 'relative' }}>
                            {form.animation_type === 'scroll' ? (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                    <div style={{ whiteSpace: 'nowrap', display: 'inline-block', animation: `adminMarquee${lang === 'ar' ? 'RTL' : 'LTR'} ${Math.max(10, form.animation_speed)}s linear infinite` }}>
                                        {[0, 1, 2].map(i => (
                                            <span key={i} style={{ display: 'inline', padding: '0 24px', fontSize: '14px', fontWeight: 500 }}>
                                                {form.text}{form.link ? ` — ${lang === 'ar' ? 'اعرف المزيد ←' : '→ Learn more'}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={cn("flex items-center justify-center h-full text-sm font-medium", form.animation_type === 'blink' && "animate-pulse")}>
                                    {form.text}{form.link ? ` — ${lang === 'ar' ? 'اعرف المزيد' : 'Learn more'}` : ''}
                                </div>
                            )}
                        </div>
                        <style>{`@keyframes adminMarqueeLTR{0%{transform:translateX(0)}100%{transform:translateX(-33.33%)}}@keyframes adminMarqueeRTL{0%{transform:translateX(-33.33%)}100%{transform:translateX(0)}}`}</style>
                    </div>
                )}

                <Button onClick={save} disabled={saving} size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                    {isAr ? 'حفظ' : 'Save'}
                </Button>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// ⭐ TESTIMONIALS MANAGER
// ═══════════════════════════════════════════════════════════════
function TestimonialsManager({ siteId, isAr }: { siteId: string; isAr: boolean }) {
    const [lang, setLang] = useState('ar');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .eq('site_id', siteId)
                .eq('language', lang)
                .order('order_index');
            if (error) console.error('Load testimonials error:', error);
            setItems(data || []);
        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    }, [siteId, lang]);

    useEffect(() => { load(); }, [load]);

    const newItem = () => {
        setEditItem({
            site_id: siteId, language: lang,
            name: '', role: '', company: '', content: '',
            rating: 5, order_index: items.length, active: true,
        });
    };

    const save = async () => {
        if (!editItem) return;
        setSaving(true);
        const { id, created_at, ...payload } = editItem;
        const { error } = id
            ? await supabase.from('testimonials').update(payload).eq('id', id)
            : await supabase.from('testimonials').insert(payload);
        if (error) toast.error((isAr ? 'خطأ: ' : 'Error: ') + error.message);
        else { toast.success(isAr ? 'تم الحفظ ✅' : 'Saved ✅'); setEditItem(null); load(); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        await supabase.from('testimonials').delete().eq('id', id);
        toast.success(isAr ? 'تم الحذف' : 'Deleted');
        load();
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquareQuote className="w-4 h-4 text-yellow-500" />
                        {isAr ? 'آراء الزبائن' : 'Testimonials'}
                        <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </CardTitle>
                    <div className="flex gap-1 items-center">
                        <LangSelector lang={lang} setLang={(l) => { setLang(l); setEditItem(null); }} />
                        <Button size="sm" variant="outline" onClick={newItem} className="h-7 text-xs gap-1 ms-2">
                            <Plus className="w-3 h-3" /> {isAr ? 'جديد' : 'New'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {editItem && (
                    <div className="border rounded-lg p-3 bg-blue-50/50 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-700">{editItem.id ? (isAr ? 'تعديل' : 'Edit') : (isAr ? 'إضافة جديد' : 'New')}</span>
                            <Button size="sm" variant="ghost" onClick={() => setEditItem(null)} className="h-6 w-6 p-0"><X className="w-3 h-3" /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[10px]">{isAr ? 'الاسم' : 'Name'}</Label>
                                <Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} className="h-8 text-xs mt-0.5" />
                            </div>
                            <div>
                                <Label className="text-[10px]">{isAr ? 'المنصب' : 'Role'}</Label>
                                <Input value={editItem.role} onChange={e => setEditItem({ ...editItem, role: e.target.value })} className="h-8 text-xs mt-0.5" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-[10px]">{isAr ? 'الشركة' : 'Company'}</Label>
                            <Input value={editItem.company} onChange={e => setEditItem({ ...editItem, company: e.target.value })} className="h-8 text-xs mt-0.5" />
                        </div>
                        <div>
                            <Label className="text-[10px]">{isAr ? 'المحتوى' : 'Content'}</Label>
                            <Textarea value={editItem.content} onChange={e => setEditItem({ ...editItem, content: e.target.value })} className="text-xs mt-0.5" rows={3} />
                        </div>
                        <div className="flex items-center gap-3">
                            <Label className="text-[10px]">{isAr ? 'التقييم' : 'Rating'}</Label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} className={cn("w-4 h-4 cursor-pointer", n <= editItem.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")}
                                        onClick={() => setEditItem({ ...editItem, rating: n })} />
                                ))}
                            </div>
                            <div className="flex-1" />
                            <Switch checked={editItem.active} onCheckedChange={v => setEditItem({ ...editItem, active: v })} />
                            <span className="text-[10px]">{isAr ? 'مفعّل' : 'Active'}</span>
                        </div>
                        <Button onClick={save} disabled={saving} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 h-8">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : <Save className="w-3 h-3 me-1" />}
                            {isAr ? 'حفظ' : 'Save'}
                        </Button>
                    </div>
                )}

                {items.length === 0 && !editItem && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        {isAr ? 'لا توجد آراء — اضغط "جديد" لإضافة' : 'No testimonials — click "New" to add'}
                    </div>
                )}
                {items.map(item => (
                    <div key={item.id} className={cn("border rounded-lg p-3 flex gap-3", !item.active && "opacity-50")}>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold truncate">{item.name}</span>
                                <span className="text-[10px] text-gray-500">{item.role} — {item.company}</span>
                                {!item.active && <Badge variant="secondary" className="text-[9px]">{isAr ? 'مخفي' : 'Hidden'}</Badge>}
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                            <div className="flex gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} className={cn("w-3 h-3", n <= item.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditItem(item)}><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => remove(item.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// 📞 CONTACT INFO MANAGER
// ═══════════════════════════════════════════════════════════════
function ContactManager({ siteId, isAr }: { siteId: string; isAr: boolean }) {
    const [lang, setLang] = useState('ar');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ email: '', phone: '', address: '', whatsapp: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: row, error } = await supabase
                .from('contact_info')
                .select('*')
                .eq('site_id', siteId)
                .eq('language', lang)
                .maybeSingle();
            if (row && !error) {
                setData(row);
                setForm({ email: row.email || '', phone: row.phone || '', address: row.address || '', whatsapp: row.whatsapp || '' });
            } else {
                setData(null);
                setForm({ email: '', phone: '', address: '', whatsapp: '' });
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [siteId, lang]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        const payload = { site_id: siteId, language: lang, ...form };
        const { error } = data?.id
            ? await supabase.from('contact_info').update(payload).eq('id', data.id)
            : await supabase.from('contact_info').insert(payload);
        if (error) toast.error((isAr ? 'خطأ: ' : 'Error: ') + error.message);
        else { toast.success(isAr ? 'تم الحفظ ✅' : 'Saved ✅'); load(); }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-500" />
                        {isAr ? 'معلومات الاتصال' : 'Contact Info'}
                        {data && <Badge variant="secondary" className="text-[10px]">{isAr ? 'محفوظ' : 'Saved'}</Badge>}
                    </CardTitle>
                    <LangSelector lang={lang} setLang={setLang} />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                        <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="info@texacore.ai" className="mt-1 text-sm" dir="ltr" />
                    </div>
                    <div>
                        <Label className="text-xs">{isAr ? 'الهاتف' : 'Phone'}</Label>
                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            placeholder="+353 83 081 3305" className="mt-1 text-sm" dir="ltr" />
                    </div>
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'واتساب' : 'WhatsApp'}</Label>
                    <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                        placeholder="+353830813305" className="mt-1 text-sm" dir="ltr" />
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'العنوان' : 'Address'}</Label>
                    <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        placeholder={isAr ? 'عنوان المكتب...' : 'Office address...'} className="mt-1 text-sm" rows={2} />
                </div>
                <Button onClick={save} disabled={saving} size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                    {isAr ? 'حفظ' : 'Save'}
                </Button>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// 🏠 HERO CONTENT MANAGER
// ═══════════════════════════════════════════════════════════════
function HeroManager({ siteId, isAr }: { siteId: string; isAr: boolean }) {
    const [lang, setLang] = useState('ar');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: '', subtitle: '', description: '',
        cta_text: '', cta_link: '', image_url: '', active: true,
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: row, error } = await supabase
                .from('hero_content')
                .select('*')
                .eq('site_id', siteId)
                .eq('language', lang)
                .maybeSingle();
            if (row && !error) {
                setData(row);
                setForm({
                    title: row.title || '', subtitle: row.subtitle || '',
                    description: row.description || '', cta_text: row.cta_text || '',
                    cta_link: row.cta_link || '', image_url: row.image_url || '',
                    active: row.active ?? true,
                });
            } else {
                setData(null);
                setForm({ title: '', subtitle: '', description: '', cta_text: '', cta_link: '', image_url: '', active: true });
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [siteId, lang]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        const payload = { site_id: siteId, language: lang, ...form };
        const { error } = data?.id
            ? await supabase.from('hero_content').update(payload).eq('id', data.id)
            : await supabase.from('hero_content').insert(payload);
        if (error) toast.error((isAr ? 'خطأ: ' : 'Error: ') + error.message);
        else { toast.success(isAr ? 'تم الحفظ ✅' : 'Saved ✅'); load(); }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Layout className="w-4 h-4 text-purple-500" />
                        {isAr ? 'القسم الرئيسي (Hero)' : 'Hero Section'}
                        {data && <Badge variant="secondary" className="text-[10px]">{isAr ? 'محفوظ' : 'Saved'}</Badge>}
                    </CardTitle>
                    <LangSelector lang={lang} setLang={setLang} />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                    <Label className="text-xs min-w-[60px]">{isAr ? 'مفعّل' : 'Active'}</Label>
                    <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'العنوان الرئيسي' : 'Title'}</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder={isAr ? 'نظام ERP الأول للأقمشة' : 'The #1 ERP for Textiles'} className="mt-1 text-sm" />
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'العنوان الفرعي' : 'Subtitle'}</Label>
                    <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className="mt-1 text-sm" />
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 text-sm" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">{isAr ? 'نص الزر' : 'CTA Text'}</Label>
                        <Input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })}
                            placeholder={isAr ? 'ابدأ مجاناً' : 'Start Free'} className="mt-1 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs">{isAr ? 'رابط الزر' : 'CTA Link'}</Label>
                        <Input value={form.cta_link} onChange={e => setForm({ ...form, cta_link: e.target.value })}
                            placeholder="/register" className="mt-1 text-sm" dir="ltr" />
                    </div>
                </div>
                <div>
                    <Label className="text-xs">{isAr ? 'رابط الصورة' : 'Image URL'}</Label>
                    <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                        placeholder="https://..." className="mt-1 text-sm" dir="ltr" />
                </div>
                <Button onClick={save} disabled={saving} size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                    {isAr ? 'حفظ' : 'Save'}
                </Button>
            </CardContent>
        </Card>
    );
}
