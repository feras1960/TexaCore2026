/**
 * Website Manager Service
 * خدمة إدارة المواقع - CRUD للمواقع والصفحات والأقسام
 */
import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface WebsiteSite {
    id: string;
    tenant_id: string;
    company_id: string;
    name: string;
    slug: string;
    site_type: 'landing' | 'store' | 'blog';
    domain: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    primary_color: string;
    secondary_color: string;
    contact_email: string | null;
    contact_phone: string | null;
    contact_address: string | null;
    social_links: Record<string, string>;
    default_language: string;
    supported_languages: string[];
    is_published: boolean;
    is_active: boolean;
    site_title_ar: string | null;
    site_title_en: string | null;
    site_description_ar: string | null;
    site_description_en: string | null;
    created_at: string;
    updated_at: string;
    // Virtual
    pages_count?: number;
}

export interface WebsitePage {
    id: string;
    tenant_id: string;
    company_id: string;
    site_id: string;
    slug: string;
    page_type: 'static' | 'product' | 'category' | 'blog';
    sort_order: number;
    is_published: boolean;
    show_in_nav: boolean;
    show_in_footer: boolean;
    title_ar: string | null;
    title_en: string | null;
    title_uk: string | null;
    title_tr: string | null;
    seo_title_ar: string | null;
    seo_title_en: string | null;
    seo_description_ar: string | null;
    seo_description_en: string | null;
    seo_keywords_ar: string | null;
    seo_keywords_en: string | null;
    og_image_url: string | null;
    canonical_url: string | null;
    schema_type: string | null;
    schema_data: any;
    llm_description_ar: string | null;
    llm_description_en: string | null;
    seo_multilingual: Record<string, { title?: string; description?: string; keywords?: string }>;
    created_at: string;
    updated_at: string;
    // Virtual
    sections_count?: number;
}

export interface WebsiteSection {
    id: string;
    tenant_id: string;
    company_id: string;
    page_id: string;
    section_key: string;
    section_type: string;
    sort_order: number;
    is_visible: boolean;
    content: Record<string, any>;
    background_color: string | null;
    background_image_url: string | null;
    custom_css: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// Sites CRUD
// ============================================

export const websiteService = {
    // --- Sites ---

    async getSites() {
        const { data, error } = await supabase
            .from('website_sites')
            .select('*, website_pages(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((site: any) => ({
            ...site,
            pages_count: site.website_pages?.[0]?.count || 0,
        }));
    },

    async getSiteById(id: string) {
        const { data, error } = await supabase
            .from('website_sites')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as WebsiteSite;
    },

    async createSite(site: Partial<WebsiteSite>) {
        const { data, error } = await supabase
            .from('website_sites')
            .insert(site)
            .select()
            .single();

        if (error) throw error;
        return data as WebsiteSite;
    },

    async updateSite(id: string, updates: Partial<WebsiteSite>) {
        const { data, error } = await supabase
            .from('website_sites')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as WebsiteSite;
    },

    async deleteSite(id: string) {
        const { error } = await supabase
            .from('website_sites')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async togglePublish(id: string, is_published: boolean) {
        return this.updateSite(id, { is_published });
    },

    // --- Pages ---

    async getPages(siteId: string) {
        const { data, error } = await supabase
            .from('website_pages')
            .select('*')
            .eq('site_id', siteId)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data as WebsitePage[];
    },

    async getPageById(id: string) {
        const { data, error } = await supabase
            .from('website_pages')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as WebsitePage;
    },

    async createPage(page: Partial<WebsitePage>) {
        const { data, error } = await supabase
            .from('website_pages')
            .insert(page)
            .select()
            .single();

        if (error) throw error;
        return data as WebsitePage;
    },

    async updatePage(id: string, updates: Partial<WebsitePage>) {
        const { data, error } = await supabase
            .from('website_pages')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as WebsitePage;
    },

    async deletePage(id: string) {
        const { error } = await supabase
            .from('website_pages')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Sections ---

    async getSections(pageId: string) {
        const { data, error } = await supabase
            .from('website_sections')
            .select('*')
            .eq('page_id', pageId)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data as WebsiteSection[];
    },

    async createSection(section: Partial<WebsiteSection>) {
        const { data, error } = await supabase
            .from('website_sections')
            .insert(section)
            .select()
            .single();

        if (error) throw error;
        return data as WebsiteSection;
    },

    async updateSection(id: string, updates: Partial<WebsiteSection>) {
        const { data, error } = await supabase
            .from('website_sections')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as WebsiteSection;
    },

    async deleteSection(id: string) {
        const { error } = await supabase
            .from('website_sections')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Bulk Operations ---

    async seedDefaultPages(siteId: string, siteType: 'landing' | 'store') {
        const defaultPages: Partial<WebsitePage>[] = siteType === 'landing'
            ? [
                { site_id: siteId, slug: '/', title_ar: 'الصفحة الرئيسية', title_en: 'Home', sort_order: 0, show_in_nav: false },
                { site_id: siteId, slug: '/features', title_ar: 'الميزات', title_en: 'Features', sort_order: 1, show_in_nav: true },
                { site_id: siteId, slug: '/pricing', title_ar: 'الأسعار', title_en: 'Pricing', sort_order: 2, show_in_nav: true },
                { site_id: siteId, slug: '/solutions', title_ar: 'الحلول', title_en: 'Solutions', sort_order: 3, show_in_nav: true },
                { site_id: siteId, slug: '/about', title_ar: 'من نحن', title_en: 'About', sort_order: 4, show_in_nav: true },
                { site_id: siteId, slug: '/contact', title_ar: 'تواصل معنا', title_en: 'Contact', sort_order: 5, show_in_nav: true },
                { site_id: siteId, slug: '/faq', title_ar: 'الأسئلة الشائعة', title_en: 'FAQ', sort_order: 6, show_in_nav: false, show_in_footer: true },
                { site_id: siteId, slug: '/privacy', title_ar: 'سياسة الخصوصية', title_en: 'Privacy', sort_order: 7, show_in_nav: false, show_in_footer: true },
                { site_id: siteId, slug: '/terms', title_ar: 'الشروط', title_en: 'Terms', sort_order: 8, show_in_nav: false, show_in_footer: true },
            ]
            : [
                { site_id: siteId, slug: '/', title_ar: 'الصفحة الرئيسية', title_en: 'Home', sort_order: 0, show_in_nav: false },
                { site_id: siteId, slug: '/products', title_ar: 'المنتجات', title_en: 'Products', sort_order: 1, show_in_nav: true },
                { site_id: siteId, slug: '/categories', title_ar: 'التصنيفات', title_en: 'Categories', sort_order: 2, show_in_nav: true },
                { site_id: siteId, slug: '/about', title_ar: 'من نحن', title_en: 'About', sort_order: 3, show_in_nav: true },
                { site_id: siteId, slug: '/contact', title_ar: 'تواصل معنا', title_en: 'Contact', sort_order: 4, show_in_nav: true },
            ];

        const { data, error } = await supabase
            .from('website_pages')
            .insert(defaultPages)
            .select();

        if (error) throw error;
        return data;
    },

    // --- Public API (for Astro frontend) ---

    async getPublicSite(slug: string) {
        const { data, error } = await supabase
            .from('website_sites')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .eq('is_active', true)
            .single();

        if (error) return null;
        return data as WebsiteSite;
    },

    async getPublicPages(siteId: string) {
        const { data, error } = await supabase
            .from('website_pages')
            .select('*')
            .eq('site_id', siteId)
            .eq('is_published', true)
            .order('sort_order');

        if (error) return [];
        return data as WebsitePage[];
    },

    async getPublicSections(pageId: string) {
        const { data, error } = await supabase
            .from('website_sections')
            .select('*')
            .eq('page_id', pageId)
            .eq('is_visible', true)
            .order('sort_order');

        if (error) return [];
        return data as WebsiteSection[];
    },
};
