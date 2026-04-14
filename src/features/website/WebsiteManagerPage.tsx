/**
 * Website Manager - الصفحة الرئيسية
 * إدارة المواقع والصفحات والمحتوى والـ SEO
 */
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { websiteService, type WebsiteSite } from '@/services/websiteService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    PanelTop,
    Plus,
    Globe,
    Eye,
    EyeOff,
    Settings,
    FileText,
    Search,
    ExternalLink,
    Palette,
    BarChart3,
    Loader2,
    Store,
    Layout,
} from 'lucide-react';
import WebsitePagesManager from './components/WebsitePagesManager';

const t = {
    title: { ar: 'إدارة المواقع', en: 'Website Manager' },
    subtitle: { ar: 'إدارة مواقع اللاندينغ بيج والمتاجر', en: 'Manage landing pages & stores' },
    addSite: { ar: 'إضافة موقع', en: 'Add Site' },
    sites: { ar: 'المواقع', en: 'Sites' },
    pages: { ar: 'الصفحات', en: 'Pages' },
    published: { ar: 'منشور', en: 'Published' },
    draft: { ar: 'مسودة', en: 'Draft' },
    landing: { ar: 'لاندينغ بيج', en: 'Landing Page' },
    store: { ar: 'متجر', en: 'Store' },
    blog: { ar: 'مدونة', en: 'Blog' },
    managePages: { ar: 'إدارة الصفحات', en: 'Manage Pages' },
    seoSettings: { ar: 'إعدادات SEO', en: 'SEO Settings' },
    siteName: { ar: 'اسم الموقع', en: 'Site Name' },
    siteSlug: { ar: 'الرابط المختصر', en: 'Slug' },
    siteType: { ar: 'نوع الموقع', en: 'Site Type' },
    domain: { ar: 'الدومين', en: 'Domain' },
    create: { ar: 'إنشاء', en: 'Create' },
    cancel: { ar: 'إلغاء', en: 'Cancel' },
    noSites: { ar: 'لا توجد مواقع بعد', en: 'No sites yet' },
    noSitesDesc: { ar: 'ابدأ بإنشاء موقعك الأول', en: 'Start by creating your first site' },
    publish: { ar: 'نشر', en: 'Publish' },
    unpublish: { ar: 'إلغاء النشر', en: 'Unpublish' },
    totalSites: { ar: 'إجمالي المواقع', en: 'Total Sites' },
    publishedSites: { ar: 'مواقع منشورة', en: 'Published Sites' },
    totalPages: { ar: 'إجمالي الصفحات', en: 'Total Pages' },
    backToSites: { ar: '← العودة للمواقع', en: '← Back to Sites' },
};

export default function WebsiteManagerPage() {
    const { language } = useLanguage();
    const getText = (obj: Record<string, string>) => obj[language] || obj.en;

    const [sites, setSites] = useState<WebsiteSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState<WebsiteSite | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newSite, setNewSite] = useState({
        name: '',
        slug: '',
        site_type: 'landing' as 'landing' | 'store' | 'blog',
        domain: '',
    });

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            setLoading(true);
            const data = await websiteService.getSites();
            setSites(data);
        } catch (err) {
            console.error('Error loading sites:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSite = async () => {
        if (!newSite.name || !newSite.slug) return;
        setCreating(true);
        try {
            const site = await websiteService.createSite({
                name: newSite.name,
                slug: newSite.slug,
                site_type: newSite.site_type,
                domain: newSite.domain || null,
                site_title_ar: newSite.name,
                site_title_en: newSite.name,
            });

            // إنشاء صفحات افتراضية
            await websiteService.seedDefaultPages(site.id, newSite.site_type as any);

            setShowCreateDialog(false);
            setNewSite({ name: '', slug: '', site_type: 'landing', domain: '' });
            loadSites();
        } catch (err) {
            console.error('Error creating site:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleTogglePublish = async (site: WebsiteSite) => {
        try {
            await websiteService.togglePublish(site.id, !site.is_published);
            loadSites();
        } catch (err) {
            console.error('Error toggling publish:', err);
        }
    };

    // إذا تم اختيار موقع → إظهار صفحات الموقع
    if (selectedSite) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => setSelectedSite(null)}
                            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
                        >
                            {getText(t.backToSites)}
                        </button>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <PanelTop className="w-6 h-6 text-emerald-600" />
                            {selectedSite.name}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedSite.domain && (
                            <Button variant="outline" size="sm" onClick={() => window.open(`https://${selectedSite.domain}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 me-1" />
                                {selectedSite.domain}
                            </Button>
                        )}
                        <Badge variant={selectedSite.is_published ? 'default' : 'secondary'}>
                            {selectedSite.is_published ? getText(t.published) : getText(t.draft)}
                        </Badge>
                    </div>
                </div>

                <WebsitePagesManager siteId={selectedSite.id} language={language} />
            </div>
        );
    }

    // عرض قائمة المواقع
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <PanelTop className="w-6 h-6 text-emerald-600" />
                        {getText(t.title)}
                    </h1>
                    <p className="text-gray-500 mt-1">{getText(t.subtitle)}</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 me-2" />
                    {getText(t.addSite)}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{sites.length}</p>
                            <p className="text-sm text-gray-500">{getText(t.totalSites)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{sites.filter(s => s.is_published).length}</p>
                            <p className="text-sm text-gray-500">{getText(t.publishedSites)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{sites.reduce((acc, s) => acc + (s.pages_count || 0), 0)}</p>
                            <p className="text-sm text-gray-500">{getText(t.totalPages)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sites Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : sites.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">{getText(t.noSites)}</h3>
                        <p className="text-gray-400 mb-6">{getText(t.noSitesDesc)}</p>
                        <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="w-4 h-4 me-2" />
                            {getText(t.addSite)}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site) => (
                        <Card key={site.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                            <CardContent className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${site.primary_color}20` }}
                                        >
                                            {site.site_type === 'store' ? (
                                                <Store className="w-5 h-5" style={{ color: site.primary_color }} />
                                            ) : (
                                                <Layout className="w-5 h-5" style={{ color: site.primary_color }} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{site.name}</h3>
                                            <p className="text-xs text-gray-400">{site.domain || site.slug}</p>
                                        </div>
                                    </div>
                                    <Badge variant={site.is_published ? 'default' : 'secondary'} className="text-xs">
                                        {site.is_published ? getText(t.published) : getText(t.draft)}
                                    </Badge>
                                </div>

                                {/* Info */}
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {site.pages_count || 0} {getText(t.pages)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Palette className="w-3.5 h-3.5" />
                                        {getText(site.site_type === 'store' ? t.store : site.site_type === 'blog' ? t.blog : t.landing)}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setSelectedSite(site)}
                                    >
                                        <FileText className="w-3.5 h-3.5 me-1" />
                                        {getText(t.managePages)}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePublish(site);
                                        }}
                                    >
                                        {site.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Site Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{getText(t.addSite)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">{getText(t.siteName)}</label>
                            <Input
                                value={newSite.name}
                                onChange={(e) => setNewSite({ ...newSite, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                placeholder="TexaCore"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{getText(t.siteSlug)}</label>
                            <Input
                                value={newSite.slug}
                                onChange={(e) => setNewSite({ ...newSite, slug: e.target.value })}
                                placeholder="texacore"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{getText(t.siteType)}</label>
                            <div className="flex gap-2">
                                {(['landing', 'store', 'blog'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewSite({ ...newSite, site_type: type })}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${newSite.site_type === type
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {getText(type === 'landing' ? t.landing : type === 'store' ? t.store : t.blog)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{getText(t.domain)}</label>
                            <Input
                                value={newSite.domain}
                                onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                                placeholder="texacore.com"
                                dir="ltr"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            {getText(t.cancel)}
                        </Button>
                        <Button
                            onClick={handleCreateSite}
                            disabled={creating || !newSite.name || !newSite.slug}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
                            {getText(t.create)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
