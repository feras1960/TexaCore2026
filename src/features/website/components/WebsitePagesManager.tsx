/**
 * Website Pages Manager
 * إدارة صفحات الموقع + SEO لكل صفحة
 */
import React, { useState, useEffect } from 'react';
import { websiteService, type WebsitePage } from '@/services/websiteService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Plus,
    Eye,
    EyeOff,
    Search,
    FileText,
    Settings,
    Trash2,
    GripVertical,
    Globe,
    Save,
    Loader2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Image as ImageIcon,
    Hash,
    Bot,
} from 'lucide-react';

interface Props {
    siteId: string;
    language: string;
}

const t = {
    pages: { ar: 'الصفحات', en: 'Pages' },
    addPage: { ar: 'إضافة صفحة', en: 'Add Page' },
    editSeo: { ar: 'تعديل SEO', en: 'Edit SEO' },
    editContent: { ar: 'تعديل المحتوى', en: 'Edit Content' },
    pageName: { ar: 'اسم الصفحة', en: 'Page Name' },
    pageSlug: { ar: 'رابط الصفحة', en: 'Page Slug' },
    save: { ar: 'حفظ', en: 'Save' },
    cancel: { ar: 'إلغاء', en: 'Cancel' },
    delete: { ar: 'حذف', en: 'Delete' },
    published: { ar: 'منشور', en: 'Published' },
    draft: { ar: 'مسودة', en: 'Draft' },
    showInNav: { ar: 'في القائمة', en: 'In Nav' },
    showInFooter: { ar: 'في الفوتر', en: 'In Footer' },
    noPages: { ar: 'لا توجد صفحات', en: 'No pages' },
    // SEO tabs
    seoGeneral: { ar: 'عام', en: 'General' },
    seoArabic: { ar: 'العربية', en: 'Arabic' },
    seoEnglish: { ar: 'الإنجليزية', en: 'English' },
    seoAdvanced: { ar: 'متقدم', en: 'Advanced' },
    seoAi: { ar: 'AI / GEO', en: 'AI / GEO' },
    // SEO fields
    seoTitle: { ar: 'عنوان SEO', en: 'SEO Title' },
    seoDescription: { ar: 'وصف SEO', en: 'SEO Description' },
    seoKeywords: { ar: 'كلمات مفتاحية', en: 'Keywords' },
    ogImage: { ar: 'صورة Open Graph', en: 'OG Image' },
    canonicalUrl: { ar: 'رابط Canonical', en: 'Canonical URL' },
    schemaType: { ar: 'نوع Schema', en: 'Schema Type' },
    llmDescription: { ar: 'وصف AI', en: 'AI Description' },
    llmDescHint: { ar: 'يستخدمه ChatGPT و Gemini لفهم الصفحة', en: 'Used by ChatGPT & Gemini to understand the page' },
    titleAr: { ar: 'العنوان بالعربية', en: 'Title (Arabic)' },
    titleEn: { ar: 'العنوان بالإنجليزية', en: 'Title (English)' },
    saved: { ar: 'تم الحفظ', en: 'Saved' },
    charCount: { ar: 'حرف', en: 'chars' },
};

export default function WebsitePagesManager({ siteId, language }: Props) {
    const getText = (obj: Record<string, string>) => obj[language] || obj.en;

    const [pages, setPages] = useState<WebsitePage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newPage, setNewPage] = useState({ title_ar: '', title_en: '', slug: '' });

    useEffect(() => {
        loadPages();
    }, [siteId]);

    const loadPages = async () => {
        try {
            setLoading(true);
            const data = await websiteService.getPages(siteId);
            setPages(data);
        } catch (err) {
            console.error('Error loading pages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePage = async () => {
        if (!newPage.slug) return;
        try {
            await websiteService.createPage({
                site_id: siteId,
                title_ar: newPage.title_ar,
                title_en: newPage.title_en,
                slug: newPage.slug.startsWith('/') ? newPage.slug : `/${newPage.slug}`,
                sort_order: pages.length,
            });
            setShowCreateDialog(false);
            setNewPage({ title_ar: '', title_en: '', slug: '' });
            loadPages();
        } catch (err) {
            console.error('Error creating page:', err);
        }
    };

    const handleSavePage = async (page: WebsitePage) => {
        setSaving(true);
        try {
            await websiteService.updatePage(page.id, page);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            loadPages();
        } catch (err) {
            console.error('Error saving page:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePage = async (id: string) => {
        if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الصفحة؟' : 'Delete this page?')) return;
        try {
            await websiteService.deletePage(id);
            setSelectedPage(null);
            loadPages();
        } catch (err) {
            console.error('Error deleting page:', err);
        }
    };

    const handleTogglePublish = async (page: WebsitePage) => {
        try {
            await websiteService.updatePage(page.id, { is_published: !page.is_published } as any);
            loadPages();
        } catch (err) {
            console.error('Error toggling publish:', err);
        }
    };

    // عرض محرر SEO للصفحة المختارة
    if (selectedPage) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSelectedPage(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        {language === 'ar' ? '← العودة للصفحات' : '← Back to Pages'}
                    </button>
                    <div className="flex items-center gap-2">
                        {saved && (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                ✓ {getText(t.saved)}
                            </Badge>
                        )}
                        <Button
                            onClick={() => handleSavePage(selectedPage)}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                            {getText(t.save)}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold mb-4">
                            {selectedPage.title_ar || selectedPage.title_en || selectedPage.slug}
                            <span className="text-sm font-normal text-gray-400 ms-2" dir="ltr">{selectedPage.slug}</span>
                        </h2>

                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="w-full justify-start mb-4">
                                <TabsTrigger value="general"><Settings className="w-3.5 h-3.5 me-1.5" />{getText(t.seoGeneral)}</TabsTrigger>
                                <TabsTrigger value="arabic">🇦🇪 {getText(t.seoArabic)}</TabsTrigger>
                                <TabsTrigger value="english">🇬🇧 {getText(t.seoEnglish)}</TabsTrigger>
                                <TabsTrigger value="advanced"><Hash className="w-3.5 h-3.5 me-1.5" />{getText(t.seoAdvanced)}</TabsTrigger>
                                <TabsTrigger value="ai"><Bot className="w-3.5 h-3.5 me-1.5" />{getText(t.seoAi)}</TabsTrigger>
                            </TabsList>

                            {/* General Tab */}
                            <TabsContent value="general" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>{getText(t.titleAr)}</Label>
                                        <Input
                                            value={selectedPage.title_ar || ''}
                                            onChange={(e) => setSelectedPage({ ...selectedPage, title_ar: e.target.value })}
                                            dir="rtl"
                                        />
                                    </div>
                                    <div>
                                        <Label>{getText(t.titleEn)}</Label>
                                        <Input
                                            value={selectedPage.title_en || ''}
                                            onChange={(e) => setSelectedPage({ ...selectedPage, title_en: e.target.value })}
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>{getText(t.pageSlug)}</Label>
                                        <Input
                                            value={selectedPage.slug}
                                            onChange={(e) => setSelectedPage({ ...selectedPage, slug: e.target.value })}
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <Label>{getText(t.ogImage)}</Label>
                                        <Input
                                            value={selectedPage.og_image_url || ''}
                                            onChange={(e) => setSelectedPage({ ...selectedPage, og_image_url: e.target.value })}
                                            placeholder="https://..."
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedPage.show_in_nav}
                                            onChange={(e) => setSelectedPage({ ...selectedPage, show_in_nav: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{getText(t.showInNav)}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedPage.show_in_footer}
                                            onChange={(e) => setSelectedPage({ ...selectedPage, show_in_footer: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{getText(t.showInFooter)}</span>
                                    </label>
                                </div>
                            </TabsContent>

                            {/* Arabic SEO Tab */}
                            <TabsContent value="arabic" className="space-y-4">
                                <div>
                                    <div className="flex justify-between">
                                        <Label>{getText(t.seoTitle)}</Label>
                                        <span className="text-xs text-gray-400">{(selectedPage.seo_title_ar || '').length}/60 {getText(t.charCount)}</span>
                                    </div>
                                    <Input
                                        value={selectedPage.seo_title_ar || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, seo_title_ar: e.target.value })}
                                        dir="rtl"
                                        placeholder="عنوان الصفحة لمحركات البحث"
                                        maxLength={60}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">يظهر في نتائج Google — الأمثل 50-60 حرف</p>
                                </div>
                                <div>
                                    <div className="flex justify-between">
                                        <Label>{getText(t.seoDescription)}</Label>
                                        <span className="text-xs text-gray-400">{(selectedPage.seo_description_ar || '').length}/160 {getText(t.charCount)}</span>
                                    </div>
                                    <Textarea
                                        value={selectedPage.seo_description_ar || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, seo_description_ar: e.target.value })}
                                        dir="rtl"
                                        placeholder="وصف الصفحة لمحركات البحث"
                                        maxLength={160}
                                        rows={3}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">يظهر تحت العنوان في Google — الأمثل 150-160 حرف</p>
                                </div>
                                <div>
                                    <Label>{getText(t.seoKeywords)}</Label>
                                    <Input
                                        value={selectedPage.seo_keywords_ar || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, seo_keywords_ar: e.target.value })}
                                        dir="rtl"
                                        placeholder="نظام ERP, أقمشة, محاسبة, مخزون"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">افصل بفاصلة بين كل كلمة</p>
                                </div>
                            </TabsContent>

                            {/* English SEO Tab */}
                            <TabsContent value="english" className="space-y-4">
                                <div>
                                    <div className="flex justify-between">
                                        <Label>{getText(t.seoTitle)}</Label>
                                        <span className="text-xs text-gray-400">{(selectedPage.seo_title_en || '').length}/60 {getText(t.charCount)}</span>
                                    </div>
                                    <Input
                                        value={selectedPage.seo_title_en || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, seo_title_en: e.target.value })}
                                        dir="ltr"
                                        placeholder="Page SEO title"
                                        maxLength={60}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between">
                                        <Label>{getText(t.seoDescription)}</Label>
                                        <span className="text-xs text-gray-400">{(selectedPage.seo_description_en || '').length}/160 {getText(t.charCount)}</span>
                                    </div>
                                    <Textarea
                                        value={selectedPage.seo_description_en || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, seo_description_en: e.target.value })}
                                        dir="ltr"
                                        placeholder="Page SEO description"
                                        maxLength={160}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>{getText(t.seoKeywords)}</Label>
                                    <Input
                                        value={selectedPage.seo_keywords_en || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, seo_keywords_en: e.target.value })}
                                        dir="ltr"
                                        placeholder="ERP system, textile, accounting, inventory"
                                    />
                                </div>
                            </TabsContent>

                            {/* Advanced Tab */}
                            <TabsContent value="advanced" className="space-y-4">
                                <div>
                                    <Label>{getText(t.canonicalUrl)}</Label>
                                    <Input
                                        value={selectedPage.canonical_url || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, canonical_url: e.target.value })}
                                        dir="ltr"
                                        placeholder="https://texacore.com/features"
                                    />
                                </div>
                                <div>
                                    <Label>{getText(t.schemaType)}</Label>
                                    <select
                                        value={selectedPage.schema_type || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, schema_type: e.target.value })}
                                        className="w-full border rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">— None —</option>
                                        <option value="WebPage">WebPage</option>
                                        <option value="FAQPage">FAQPage</option>
                                        <option value="Product">Product</option>
                                        <option value="Organization">Organization</option>
                                        <option value="ContactPage">ContactPage</option>
                                        <option value="AboutPage">AboutPage</option>
                                        <option value="CollectionPage">CollectionPage</option>
                                    </select>
                                </div>
                            </TabsContent>

                            {/* AI / GEO Tab */}
                            <TabsContent value="ai" className="space-y-4">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700 mb-4">
                                    <Bot className="w-4 h-4 inline me-1" />
                                    {language === 'ar'
                                        ? 'هذا الوصف يُقرأ بواسطة محركات الذكاء الاصطناعي (ChatGPT, Gemini, Perplexity) لفهم محتوى الصفحة'
                                        : 'This description is read by AI search engines (ChatGPT, Gemini, Perplexity) to understand page content'}
                                </div>
                                <div>
                                    <Label>{getText(t.llmDescription)} (العربية)</Label>
                                    <Textarea
                                        value={selectedPage.llm_description_ar || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, llm_description_ar: e.target.value })}
                                        dir="rtl"
                                        placeholder="وصف تفصيلي للصفحة لمحركات الذكاء الاصطناعي..."
                                        rows={5}
                                    />
                                </div>
                                <div>
                                    <Label>{getText(t.llmDescription)} (English)</Label>
                                    <Textarea
                                        value={selectedPage.llm_description_en || ''}
                                        onChange={(e) => setSelectedPage({ ...selectedPage, llm_description_en: e.target.value })}
                                        dir="ltr"
                                        placeholder="Detailed page description for AI search engines..."
                                        rows={5}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // قائمة الصفحات
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{getText(t.pages)} ({pages.length})</h2>
                <Button onClick={() => setShowCreateDialog(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 me-1" />
                    {getText(t.addPage)}
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : pages.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">{getText(t.noPages)}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {pages.map((page) => (
                        <Card key={page.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {page.title_ar || page.title_en || page.slug}
                                            </span>
                                            <span className="text-xs text-gray-400 font-mono" dir="ltr">{page.slug}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {page.show_in_nav && (
                                                <Badge variant="outline" className="text-xs py-0">{getText(t.showInNav)}</Badge>
                                            )}
                                            {page.show_in_footer && (
                                                <Badge variant="outline" className="text-xs py-0">{getText(t.showInFooter)}</Badge>
                                            )}
                                            {page.seo_title_ar && (
                                                <Badge variant="outline" className="text-xs py-0 text-green-600 border-green-200">SEO ✓</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={page.is_published ? 'default' : 'secondary'} className="text-xs">
                                        {page.is_published ? getText(t.published) : getText(t.draft)}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleTogglePublish(page)}
                                    >
                                        {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedPage(page)}
                                    >
                                        <Settings className="w-3.5 h-3.5 me-1" />
                                        SEO
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeletePage(page.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Page Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{getText(t.addPage)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>{getText(t.titleAr)}</Label>
                            <Input
                                value={newPage.title_ar}
                                onChange={(e) => setNewPage({ ...newPage, title_ar: e.target.value })}
                                dir="rtl"
                                placeholder="الميزات"
                            />
                        </div>
                        <div>
                            <Label>{getText(t.titleEn)}</Label>
                            <Input
                                value={newPage.title_en}
                                onChange={(e) => setNewPage({ ...newPage, title_en: e.target.value, slug: `/${e.target.value.toLowerCase().replace(/\s+/g, '-')}` })}
                                dir="ltr"
                                placeholder="Features"
                            />
                        </div>
                        <div>
                            <Label>{getText(t.pageSlug)}</Label>
                            <Input
                                value={newPage.slug}
                                onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                                dir="ltr"
                                placeholder="/features"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            {getText(t.cancel)}
                        </Button>
                        <Button
                            onClick={handleCreatePage}
                            disabled={!newPage.slug}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 me-2" />
                            {getText(t.save)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
