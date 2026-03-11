/**
 * ════════════════════════════════════════════════════════════════
 * 🌐 Platform Website Tab — Mini CMS Dashboard
 * ════════════════════════════════════════════════════════════════
 * 
 * A mini dashboard for managing the platform's website:
 * - Dashboard: Status & Links
 * - SEO: Read/Edit from website_pages table
 * - Pricing Sync: Dynamic pricing status
 * - Pages & Content (future)
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PlatformContentTab from './PlatformContentTab';
import {
    Globe,
    ExternalLink,
    Link,
    Copy,
    Check,
    Search,
    Rocket,
    FileText,
    Users,
    Save,
    BarChart3,
    FileEdit,
    Newspaper,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Loader2,
    type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PlatformWebsiteTabProps {
    platform: {
        id: string;
        code: string;
        name: string;
        domain: string | null;
        logo_url: string | null;
        primary_color: string;
    };
    plansCount: number;
    subscribersCount: number;
    onUpdate?: () => void;
}

// ─── Website Sub-sections ────────────────────────────────────
type WebSection = 'dashboard' | 'seo' | 'pricing' | 'pages' | 'content';

const WEB_SECTIONS: { id: WebSection; labelAr: string; labelEn: string; icon: LucideIcon; ready: boolean }[] = [
    { id: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: BarChart3, ready: true },
    { id: 'content', labelAr: 'إدارة المحتوى', labelEn: 'Content', icon: FileEdit, ready: true },
    { id: 'seo', labelAr: 'SEO', labelEn: 'SEO', icon: Search, ready: true },
    { id: 'pricing', labelAr: 'ربط الأسعار', labelEn: 'Pricing Sync', icon: RefreshCw, ready: true },
    { id: 'pages', labelAr: 'الصفحات', labelEn: 'Pages', icon: Newspaper, ready: true },
];

// ─── SEO page data ───────────────────────────────────────────
interface PageSEOData {
    id: string;
    slug: string;
    title_ar: string;
    title_en: string;
    seo_title_ar: string;
    seo_title_en: string;
    seo_description_ar: string;
    seo_description_en: string;
    seo_keywords_ar: string;
    seo_keywords_en: string;
    og_image_url: string | null;
    canonical_url: string | null;
    llm_description_ar: string | null;
    llm_description_en: string | null;
    seo_multilingual: Record<string, { title?: string; description?: string; keywords?: string }> | null;
    is_published: boolean;
}

// 8 languages the website supports
const SEO_LANGUAGES = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'uk', label: 'Українська', flag: '🇺🇦' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'ro', label: 'Română', flag: '🇷🇴' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export default function PlatformWebsiteTab({
    platform,
    plansCount,
    subscribersCount,
    onUpdate,
}: PlatformWebsiteTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [activeSection, setActiveSection] = useState<WebSection>('dashboard');
    const [copied, setCopied] = useState<string | null>(null);

    // ─── Domain settings state ─────────────────────────────────
    const [domain, setDomain] = useState(platform.domain || '');
    const [logoUrl, setLogoUrl] = useState(platform.logo_url || '');
    const [savingDomain, setSavingDomain] = useState(false);

    // ─── SEO state ─────────────────────────────────────────────
    const [seoPages, setSeoPages] = useState<PageSEOData[]>([]);
    const [loadingSEO, setLoadingSEO] = useState(false);
    const [selectedPage, setSelectedPage] = useState<PageSEOData | null>(null);
    const [editSEO, setEditSEO] = useState<PageSEOData | null>(null);
    const [savingSEO, setSavingSEO] = useState(false);
    const [siteId, setSiteId] = useState<string | null>(null);
    const [seoLang, setSeoLang] = useState('ar');

    // Known website URLs
    const WEBSITE_URLS: Record<string, { site: string; pricing: string; register: string; app: string }> = {
        texacore: { site: 'https://texacore.ai', pricing: 'https://texacore.ai/pricing', register: 'https://app.texacore.ai/register', app: 'https://app.texacore.ai' },
        nexacore: { site: 'https://nexacore.com', pricing: 'https://nexacore.com/pricing', register: 'https://app.nexacore.com/register', app: 'https://app.nexacore.com' },
        fincore: { site: 'https://fincore.ai', pricing: 'https://fincore.ai/pricing', register: 'https://app.fincore.ai/register', app: 'https://app.fincore.ai' },
        medcore: { site: 'https://medcore.ai', pricing: 'https://medcore.ai/pricing', register: 'https://app.medcore.ai/register', app: 'https://app.medcore.ai' },
        inducore: { site: 'https://inducore.ai', pricing: 'https://inducore.ai/pricing', register: 'https://app.inducore.ai/register', app: 'https://app.inducore.ai' },
    };

    const urls = WEBSITE_URLS[platform.code] || {
        site: domain ? `https://${domain}` : '',
        pricing: domain ? `https://${domain}/pricing` : '',
        register: domain ? `https://app.${domain}/register` : '',
        app: domain ? `https://app.${domain}` : '',
    };

    // Load SEO pages from DB
    const loadSEOPages = async () => {
        setLoadingSEO(true);
        try {
            // Get site by slug
            const { data: site } = await supabase
                .from('website_sites')
                .select('id')
                .eq('slug', platform.code)
                .single();

            if (!site) {
                setLoadingSEO(false);
                return;
            }

            setSiteId(site.id);

            const { data: pages } = await supabase
                .from('website_pages')
                .select('id, slug, title_ar, title_en, seo_title_ar, seo_title_en, seo_description_ar, seo_description_en, seo_keywords_ar, seo_keywords_en, og_image_url, canonical_url, llm_description_ar, llm_description_en, seo_multilingual, is_published')
                .eq('site_id', site.id)
                .order('slug');

            setSeoPages(pages || []);
        } catch (err) {
            console.error('Error loading SEO:', err);
        } finally {
            setLoadingSEO(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'seo' || activeSection === 'pages') {
            loadSEOPages();
        }
    }, [activeSection]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const saveDomainSettings = async () => {
        setSavingDomain(true);
        try {
            const { error } = await supabase.from('saas_products').update({
                domain: domain || null, logo_url: logoUrl || null, updated_at: new Date().toISOString(),
            }).eq('id', platform.id);
            if (error) throw error;
            toast.success(isAr ? 'تم حفظ الإعدادات' : 'Settings saved');
            onUpdate?.();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSavingDomain(false);
        }
    };

    // Get/set multilingual SEO field
    const getMultiLangField = (lang: string, field: 'title' | 'description' | 'keywords') => {
        if (lang === 'ar') return (editSEO as any)?.[`seo_${field === 'title' ? 'title' : field}_ar`] || '';
        if (lang === 'en') return (editSEO as any)?.[`seo_${field === 'title' ? 'title' : field}_en`] || '';
        return editSEO?.seo_multilingual?.[lang]?.[field] || '';
    };

    const setMultiLangField = (lang: string, field: 'title' | 'description' | 'keywords', value: string) => {
        if (!editSEO) return;
        if (lang === 'ar') {
            const key = field === 'title' ? 'seo_title_ar' : field === 'description' ? 'seo_description_ar' : 'seo_keywords_ar';
            setEditSEO({ ...editSEO, [key]: value });
        } else if (lang === 'en') {
            const key = field === 'title' ? 'seo_title_en' : field === 'description' ? 'seo_description_en' : 'seo_keywords_en';
            setEditSEO({ ...editSEO, [key]: value });
        } else {
            const multi = { ...(editSEO.seo_multilingual || {}) };
            multi[lang] = { ...(multi[lang] || {}), [field]: value };
            setEditSEO({ ...editSEO, seo_multilingual: multi });
        }
    };

    // Save SEO page changes
    const saveSEOPage = async () => {
        if (!editSEO) return;
        setSavingSEO(true);
        try {
            const { error } = await supabase.from('website_pages').update({
                seo_title_ar: editSEO.seo_title_ar,
                seo_title_en: editSEO.seo_title_en,
                seo_description_ar: editSEO.seo_description_ar,
                seo_description_en: editSEO.seo_description_en,
                seo_keywords_ar: editSEO.seo_keywords_ar,
                seo_keywords_en: editSEO.seo_keywords_en,
                og_image_url: editSEO.og_image_url,
                canonical_url: editSEO.canonical_url,
                llm_description_ar: editSEO.llm_description_ar,
                llm_description_en: editSEO.llm_description_en,
                seo_multilingual: editSEO.seo_multilingual || {},
                updated_at: new Date().toISOString(),
            }).eq('id', editSEO.id);

            if (error) throw error;
            toast.success(isAr ? 'تم حفظ SEO بكل اللغات' : 'All-language SEO saved');
            setSelectedPage({ ...editSEO });
            loadSEOPages();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSavingSEO(false);
        }
    };

    const hasDomainChanges = domain !== (platform.domain || '') || logoUrl !== (platform.logo_url || '');
    const hasSEOChanges = selectedPage && editSEO && JSON.stringify(selectedPage) !== JSON.stringify(editSEO);

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════
    const renderDashboard = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? 'الموقع' : 'Website', value: urls.site ? '🟢' : '🔴', sub: urls.site ? (isAr ? 'متصل' : 'Online') : (isAr ? 'غير متصل' : 'Offline'), icon: Globe },
                    { label: isAr ? 'صفحات SEO' : 'SEO Pages', value: seoPages.length || '—', sub: isAr ? 'صفحة' : 'pages', icon: Search },
                    { label: isAr ? 'الباقات' : 'Plans', value: plansCount, sub: isAr ? 'منشورة' : 'published', icon: FileText },
                    { label: isAr ? 'ربط الأسعار' : 'Price Sync', value: '✅', sub: isAr ? 'ديناميكي' : 'Dynamic', icon: RefreshCw },
                ].map((stat, i) => (
                    <Card key={i} className="border-gray-200 dark:border-gray-700">
                        <CardContent className="p-3 text-center">
                            <stat.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</div>
                            <div className="text-[10px] text-gray-500">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isAr ? 'روابط سريعة' : 'Quick Links'}</h4>
                    {[
                        { label: isAr ? 'الموقع الرئيسي' : 'Main Website', url: urls.site, icon: Globe },
                        { label: isAr ? 'صفحة الأسعار' : 'Pricing', url: urls.pricing, icon: FileText },
                        { label: isAr ? 'التسجيل' : 'Register', url: urls.register, icon: Rocket },
                        { label: isAr ? 'لوحة التحكم' : 'Dashboard', url: urls.app, icon: Link },
                    ].map((link, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                            <div className="flex items-center gap-2">
                                <link.icon className="w-3.5 h-3.5 text-gray-400" />
                                <div>
                                    <div className="text-xs font-medium text-gray-900 dark:text-white">{link.label}</div>
                                    <div className="text-[10px] text-blue-600 font-mono truncate max-w-[280px]">{link.url || '—'}</div>
                                </div>
                            </div>
                            {link.url && (
                                <div className="flex gap-0.5">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(link.url, link.label)}>
                                        {copied === link.label ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(link.url, '_blank')}>
                                        <ExternalLink className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isAr ? 'إعدادات الدومين' : 'Domain'}</h4>
                        {hasDomainChanges && (
                            <Button size="sm" onClick={saveDomainSettings} disabled={savingDomain}
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                                <Save className="w-3 h-3" /> {savingDomain ? '...' : (isAr ? 'حفظ' : 'Save')}
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-[11px]">{isAr ? 'الدومين' : 'Domain'}</Label>
                            <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="texacore.ai" className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px]">{isAr ? 'اللوغو' : 'Logo URL'}</Label>
                            <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="/logos/texacore.svg" className="h-8 text-xs font-mono" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // ═══════════════════════════════════════════════════════════
    // SEO — Page List + Detail Editor
    // ═══════════════════════════════════════════════════════════
    const renderSEO = () => {
        // If a page is selected, show detail editor
        if (selectedPage && editSEO) {
            return (
                <div className="space-y-4">
                    {/* Breadcrumb */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedPage(null); setEditSEO(null); }} className="gap-1 text-gray-500 h-7">
                                {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                {isAr ? 'الصفحات' : 'Pages'}
                            </Button>
                            <span className="text-gray-300">/</span>
                            <span className="font-mono text-xs text-gray-600">{editSEO.slug}</span>
                        </div>
                        {hasSEOChanges && (
                            <Button size="sm" onClick={saveSEOPage} disabled={savingSEO}
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                                <Save className="w-3 h-3" />
                                {savingSEO ? '...' : (isAr ? 'حفظ' : 'Save')}
                            </Button>
                        )}
                    </div>

                    {/* SEO Editor — Multi-Language */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    SEO — {editSEO.slug}
                                </h4>
                                {/* Smart Fill for ALL languages */}
                                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                                    onClick={() => {
                                        setEditSEO(prev => {
                                            if (!prev) return prev;
                                            const newData = { ...prev };
                                            // AR/EN
                                            newData.seo_title_ar = prev.seo_title_ar || `${prev.title_ar} - ${platform.name} ERP`;
                                            newData.seo_title_en = prev.seo_title_en || `${prev.title_en} - ${platform.name} ERP`;
                                            newData.seo_description_ar = prev.seo_description_ar || `${prev.title_ar} في نظام ${platform.name} - نظام إدارة تجارة الأقمشة الشامل.`;
                                            newData.seo_description_en = prev.seo_description_en || `${prev.title_en} in ${platform.name} - Comprehensive fabric trade management system.`;
                                            newData.seo_keywords_ar = prev.seo_keywords_ar || `${prev.title_ar}, ${platform.name}, ERP, أقمشة`;
                                            newData.seo_keywords_en = prev.seo_keywords_en || `${prev.title_en}, ${platform.name}, ERP, fabric`;
                                            newData.canonical_url = prev.canonical_url || `${urls.site}${prev.slug}`;
                                            newData.llm_description_ar = prev.llm_description_ar || `${prev.title_ar} في ${platform.name} ERP`;
                                            newData.llm_description_en = prev.llm_description_en || `${prev.title_en} in ${platform.name} ERP`;
                                            // Multilingual
                                            const multi = { ...(prev.seo_multilingual || {}) };
                                            const langTemplates: Record<string, { title: string; desc: string; kw: string }> = {
                                                tr: { title: `${prev.title_en} - ${platform.name} ERP`, desc: `${platform.name} kumaş ticaret yönetim sistemi.`, kw: `${prev.title_en}, ${platform.name}, ERP, tekstil` },
                                                uk: { title: `${prev.title_en} - ${platform.name} ERP`, desc: `${platform.name} система управління текстильною торгівлею.`, kw: `${prev.title_en}, ${platform.name}, ERP, текстиль` },
                                                ru: { title: `${prev.title_en} - ${platform.name} ERP`, desc: `${platform.name} система управления текстильной торговлей.`, kw: `${prev.title_en}, ${platform.name}, ERP, текстиль` },
                                                ro: { title: `${prev.title_en} - ${platform.name} ERP`, desc: `${platform.name} sistem de management textil.`, kw: `${prev.title_en}, ${platform.name}, ERP, textil` },
                                                pl: { title: `${prev.title_en} - ${platform.name} ERP`, desc: `${platform.name} system zarządzania handlem tekstylnym.`, kw: `${prev.title_en}, ${platform.name}, ERP, tekstylia` },
                                                it: { title: `${prev.title_en} - ${platform.name} ERP`, desc: `${platform.name} sistema di gestione tessile.`, kw: `${prev.title_en}, ${platform.name}, ERP, tessile` },
                                            };
                                            Object.entries(langTemplates).forEach(([lang, tmpl]) => {
                                                multi[lang] = {
                                                    title: multi[lang]?.title || tmpl.title,
                                                    description: multi[lang]?.description || tmpl.desc,
                                                    keywords: multi[lang]?.keywords || tmpl.kw,
                                                };
                                            });
                                            newData.seo_multilingual = multi;
                                            return newData;
                                        });
                                        toast.success(isAr ? 'تم التعبئة لـ 8 لغات ✨' : 'Smart-filled 8 languages ✨');
                                    }}>
                                    <Sparkles className="w-3 h-3" />
                                    {isAr ? 'تعبئة 8 لغات' : 'Fill 8 Languages'}
                                </Button>
                            </div>

                            {/* Language Tabs */}
                            <div className="flex gap-1 flex-wrap">
                                {SEO_LANGUAGES.map(lang => {
                                    const hasContent = lang.code === 'ar' ? !!editSEO.seo_title_ar : lang.code === 'en' ? !!editSEO.seo_title_en : !!editSEO.seo_multilingual?.[lang.code]?.title;
                                    return (
                                        <Button key={lang.code} variant={seoLang === lang.code ? 'default' : 'outline'} size="sm"
                                            onClick={() => setSeoLang(lang.code)}
                                            className={cn("gap-1 text-[10px] h-7 px-2", seoLang === lang.code && "bg-indigo-600 hover:bg-indigo-700")}>
                                            <span>{lang.flag}</span>
                                            <span>{lang.code.toUpperCase()}</span>
                                            {hasContent && <span className="text-[8px]">✅</span>}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* Fields for selected language */}
                            <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                                <div className="space-y-1">
                                    <Label className="text-[11px]">SEO Title ({seoLang.toUpperCase()})</Label>
                                    <Input value={getMultiLangField(seoLang, 'title')} onChange={e => setMultiLangField(seoLang, 'title', e.target.value)}
                                        className="h-8 text-xs" dir={seoLang === 'ar' ? 'rtl' : 'ltr'} />
                                    <div className="text-[9px] text-gray-400">{getMultiLangField(seoLang, 'title').length}/60</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Meta Description ({seoLang.toUpperCase()})</Label>
                                    <Textarea value={getMultiLangField(seoLang, 'description')} onChange={e => setMultiLangField(seoLang, 'description', e.target.value)}
                                        className="text-xs" rows={2} dir={seoLang === 'ar' ? 'rtl' : 'ltr'} />
                                    <div className="text-[9px] text-gray-400">{getMultiLangField(seoLang, 'description').length}/160</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Keywords ({seoLang.toUpperCase()})</Label>
                                    <Input value={getMultiLangField(seoLang, 'keywords')} onChange={e => setMultiLangField(seoLang, 'keywords', e.target.value)}
                                        className="h-8 text-xs" dir={seoLang === 'ar' ? 'rtl' : 'ltr'} />
                                </div>
                            </div>

                            {/* AI/LLM + OG (only for AR/EN) */}
                            {(seoLang === 'ar' || seoLang === 'en') && (
                                <div className="space-y-3 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-500" /> AI Description ({seoLang.toUpperCase()})</Label>
                                        <Textarea value={seoLang === 'ar' ? (editSEO.llm_description_ar || '') : (editSEO.llm_description_en || '')}
                                            onChange={e => setEditSEO(p => p ? { ...p, [seoLang === 'ar' ? 'llm_description_ar' : 'llm_description_en']: e.target.value } : p)}
                                            className="text-xs" rows={2} dir={seoLang === 'ar' ? 'rtl' : 'ltr'}
                                            placeholder={isAr ? 'وصف يظهر في ChatGPT, Gemini, Perplexity...' : 'Description for ChatGPT, Gemini, Perplexity...'} />
                                    </div>
                                </div>
                            )}

                            {/* OG & Canonical (shared) */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[11px]">OG Image</Label>
                                    <Input value={editSEO.og_image_url || ''} onChange={e => setEditSEO(p => p ? { ...p, og_image_url: e.target.value } : p)}
                                        className="h-8 text-xs font-mono" placeholder="/images/og-texacore.png" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Canonical URL</Label>
                                    <Input value={editSEO.canonical_url || ''} onChange={e => setEditSEO(p => p ? { ...p, canonical_url: e.target.value } : p)}
                                        className="h-8 text-xs font-mono" placeholder={`${urls.site}${editSEO.slug}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Google Preview — adapts to selected language */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4 space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {isAr ? 'معاينة Google' : 'Google Preview'} — {seoLang.toUpperCase()}
                            </h4>
                            <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border" dir={seoLang === 'ar' ? 'rtl' : 'ltr'}>
                                <div className="text-[11px] text-green-700 font-mono mb-0.5">{urls.site}{editSEO.slug}</div>
                                <div className="text-base text-blue-700 font-medium mb-1">
                                    {getMultiLangField(seoLang, 'title') || (seoLang === 'ar' ? editSEO.title_ar : editSEO.title_en)}
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">
                                    {getMultiLangField(seoLang, 'description') || '...'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Language Coverage */}
                    <Card className="border-gray-200 dark:border-gray-700">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-gray-500">{isAr ? 'تغطية اللغات:' : 'Coverage:'}</span>
                                {SEO_LANGUAGES.map(lang => {
                                    const filled = lang.code === 'ar' ? !!editSEO.seo_title_ar : lang.code === 'en' ? !!editSEO.seo_title_en : !!editSEO.seo_multilingual?.[lang.code]?.title;
                                    return (
                                        <span key={lang.code} className={cn("text-[10px] px-1.5 py-0.5 rounded", filled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                                            {lang.flag} {filled ? '✅' : '❌'}
                                        </span>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // SEO Pages List
        return (
            <div className="space-y-3">
                {loadingSEO ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : seoPages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{isAr ? 'لا توجد صفحات SEO لهذه المنصة' : 'No SEO pages for this platform'}</p>
                    </div>
                ) : (
                    <>
                        <div className="text-xs text-gray-500 mb-1">
                            {seoPages.length} {isAr ? 'صفحة — اضغط على أي صفحة لتعديل SEO' : 'pages — click any page to edit SEO'}
                        </div>
                        {seoPages.map((page, i) => {
                            const hasSeoTitle = !!page.seo_title_ar;
                            const hasDesc = !!page.seo_description_ar;
                            const hasKeywords = !!page.seo_keywords_ar;
                            const score = [hasSeoTitle, hasDesc, hasKeywords].filter(Boolean).length;
                            return (
                                <motion.div key={page.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                                        onClick={() => { setSelectedPage(page); setEditSEO({ ...page }); }}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                                                score === 3 ? "bg-green-100 text-green-700" : score >= 1 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                            )}>{score}/3</div>
                                            <div>
                                                <div className="text-xs font-medium text-gray-900 dark:text-white">
                                                    {isAr ? page.title_ar : page.title_en}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">{page.slug}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {page.is_published
                                                ? <Badge className="text-[8px] bg-green-100 text-green-700 border-green-200">✅</Badge>
                                                : <Badge className="text-[8px] bg-gray-100 text-gray-500">Draft</Badge>}
                                            {isAr ? <ChevronLeft className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // PRICING SYNC — Live data
    // ═══════════════════════════════════════════════════════════
    const [syncPlans, setSyncPlans] = useState<any[]>([]);
    const [loadingSync, setLoadingSync] = useState(false);

    const loadSyncPlans = async () => {
        setLoadingSync(true);
        try {
            const { data } = await supabase
                .from('subscription_plans')
                .select('code, name_ar, name_en, price_monthly, price_yearly, original_price_monthly, is_active, is_popular, max_users, max_companies, max_branches, included_modules, trial_days')
                .eq('product_id', platform.id)
                .eq('is_active', true)
                .order('display_order');
            setSyncPlans(data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingSync(false); }
    };

    useEffect(() => {
        if (activeSection === 'pricing') loadSyncPlans();
    }, [activeSection]);

    const renderPricingSync = () => (
        <div className="space-y-4">
            {/* Status Banner */}
            <Card className="border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                                {isAr ? 'الربط الديناميكي مفعّل ✅' : 'Dynamic Sync Active ✅'}
                            </h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-500">
                                {isAr
                                    ? `الموقع يقرأ الأسعار مباشرة من subscription_plans. أي تغيير يظهر فوراً للعميل.`
                                    : `Website reads prices directly from subscription_plans. Changes appear instantly.`}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Live Plans Table */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isAr ? 'الباقات المنشورة على الموقع' : 'Published Plans on Website'}</h4>
                        <Button variant="ghost" size="sm" onClick={loadSyncPlans} className="h-6 w-6 p-0">
                            <RefreshCw className={cn("w-3 h-3", loadingSync && "animate-spin")} />
                        </Button>
                    </div>
                    {loadingSync ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                    ) : syncPlans.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-xs">{isAr ? 'لا توجد باقات مفعّلة' : 'No active plans'}</div>
                    ) : (
                        <div className="space-y-2">
                            {syncPlans.map(plan => {
                                const websiteKey = plan.code.includes('starter') ? 'basic' : plan.code.includes('professional') ? 'professional' : plan.code.includes('enterprise') ? 'enterprise' : null;
                                return (
                                    <div key={plan.code} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", plan.is_active ? "bg-green-500" : "bg-red-500")} />
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">{isAr ? plan.name_ar : plan.name_en}</span>
                                                {plan.is_popular && <Badge className="text-[7px] py-0 bg-amber-100 text-amber-700">⭐ Popular</Badge>}
                                                {websiteKey && <Badge className="text-[7px] py-0 bg-blue-100 text-blue-700">→ {websiteKey}</Badge>}
                                            </div>
                                            <span className="font-mono text-[10px] text-gray-400">{plan.code}</span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                            <div className="text-center p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                <div className="text-[9px] text-gray-400">{isAr ? 'شهري' : 'Monthly'}</div>
                                                <div className="text-xs font-bold text-emerald-600">${plan.price_monthly}</div>
                                                {plan.original_price_monthly > 0 && (
                                                    <div className="text-[9px] text-gray-400 line-through">${plan.original_price_monthly}</div>
                                                )}
                                            </div>
                                            <div className="text-center p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                <div className="text-[9px] text-gray-400">{isAr ? 'سنوي' : 'Yearly'}</div>
                                                <div className="text-xs font-bold text-blue-600">${plan.price_yearly}</div>
                                            </div>
                                            <div className="text-center p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                <div className="text-[9px] text-gray-400">{isAr ? 'خصم' : 'Discount'}</div>
                                                <div className="text-xs font-bold text-red-500">
                                                    {plan.original_price_monthly > 0 ? `${Math.round(((plan.original_price_monthly - plan.price_monthly) / plan.original_price_monthly) * 100)}%` : '—'}
                                                </div>
                                            </div>
                                            <div className="text-center p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                <div className="text-[9px] text-gray-400">{isAr ? 'مستخدمين' : 'Users'}</div>
                                                <div className="text-xs font-bold">{plan.max_users === -1 ? '∞' : plan.max_users}</div>
                                            </div>
                                            <div className="text-center p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                <div className="text-[9px] text-gray-400">{isAr ? 'موديولات' : 'Modules'}</div>
                                                <div className="text-xs font-bold">{plan.included_modules?.length || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mapping Reference */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isAr ? 'خريطة الربط' : 'Mapping Reference'}</h4>
                    <div className="text-[10px] text-gray-500 space-y-1">
                        <div className="flex items-center gap-2"><span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">texa-starter</span> → <span className="font-mono bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-blue-700">basic</span> {isAr ? '(باقة البداية)' : '(Starter)'}</div>
                        <div className="flex items-center gap-2"><span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">texa-professional</span> → <span className="font-mono bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-blue-700">professional</span> {isAr ? '(الاحترافية)' : '(Pro)'}</div>
                        <div className="flex items-center gap-2"><span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">texa-enterprise</span> → <span className="font-mono bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-blue-700">enterprise</span> {isAr ? '(المؤسسية)' : '(Enterprise)'}</div>
                    </div>
                </CardContent>
            </Card>

            {/* How it Works */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isAr ? 'كيف يعمل' : 'How it Works'}</h4>
                    {[
                        { step: 1, ar: 'تعديل الباقات والأسعار من تبويب "الباقات"', en: 'Edit plans & prices from "Plans" tab' },
                        { step: 2, ar: 'الحفظ في جدول subscription_plans في Supabase', en: 'Saved to subscription_plans in Supabase' },
                        { step: 3, ar: 'الموقع يجلب البيانات عبر pricingService.ts', en: 'Website fetches via pricingService.ts' },
                        { step: 4, ar: 'العميل يرى الأسعار المحدثة فوراً (بدون إعادة نشر)', en: 'Customer sees updated prices instantly (no redeploy)' },
                    ].map(item => (
                        <div key={item.step} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                            <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">{item.step}</div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">{isAr ? item.ar : item.en}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );

    // ═══════════════════════════════════════════════════════════
    // PAGES — List of all website_pages
    // ═══════════════════════════════════════════════════════════
    const renderPages = () => (
        <div className="space-y-3">
            {loadingSEO ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500">{seoPages.length} {isAr ? 'صفحة في الموقع' : 'pages on website'}</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {seoPages.map(page => (
                            <Card key={page.id} className="border-gray-200 dark:border-gray-700 hover:shadow-sm cursor-pointer transition-all"
                                onClick={() => { setActiveSection('seo'); setSelectedPage(page); setEditSEO({ ...page }); }}>
                                <CardContent className="p-3">
                                    <div className="text-xs font-medium text-gray-900 dark:text-white mb-1 truncate">
                                        {isAr ? page.title_ar : page.title_en}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono truncate">{page.slug}</div>
                                    <div className="flex items-center gap-1 mt-2">
                                        {page.is_published
                                            ? <Badge className="text-[8px] py-0 bg-green-100 text-green-700 border-green-200">✅ Published</Badge>
                                            : <Badge className="text-[8px] py-0 bg-gray-100 text-gray-500">Draft</Badge>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    // ─── Render Section ────────────────────────────────────────
    const renderSection = () => {
        switch (activeSection) {
            case 'dashboard': return renderDashboard();
            case 'content': return <PlatformContentTab platformCode={platform.code} siteId={siteId || 'texafab'} />;
            case 'seo': return renderSEO();
            case 'pricing': return renderPricingSync();
            case 'pages': return renderPages();
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            {/* Section Nav */}
            <div className="flex gap-2 flex-wrap">
                {WEB_SECTIONS.map(section => (
                    <Button key={section.id}
                        variant={activeSection === section.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setActiveSection(section.id); if (section.id !== 'seo') { setSelectedPage(null); setEditSEO(null); } }}
                        className={cn("gap-1.5 text-xs h-8", activeSection === section.id && "bg-purple-600 hover:bg-purple-700")}>
                        <section.icon className="w-3.5 h-3.5" />
                        {isAr ? section.labelAr : section.labelEn}
                    </Button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={activeSection + (selectedPage?.id || '')} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    {renderSection()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
