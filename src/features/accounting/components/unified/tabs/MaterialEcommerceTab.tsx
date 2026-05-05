/**
 * MaterialEcommerceTab — تبويب المتجر الإلكتروني + SEO
 * ═══════════════════════════════════════════════════════
 * يشمل: الاسم التجاري + الوصف + السعر + بيانات SEO + صور
 * مع ترجمة تلقائية بوكيل نيكسا AI
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Store, Globe, Search, Tag, FileText,
    ImageIcon, Sparkles, Loader2,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { supabase, cloudSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { SheetMode } from '../types';

interface MaterialEcommerceTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
}

// اللغات المعتمدة للمتجر الإلكتروني (لترجمة الاسم التجاري والوصف والسيو)
const STORE_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l.code !== 'ar');

export function MaterialEcommerceTab({ data, mode, onChange }: MaterialEcommerceTabProps) {
    const { language } = useLanguage();
    const isView = mode === 'view';
    const isAr = language === 'ar';

    const customFields = data?.custom_fields || {};
    const published = customFields?.ecommerce_published || false;
    const marketingName = customFields?.ecommerce_marketing_name || '';
    const marketingDesc = customFields?.ecommerce_marketing_description || '';
    const sellingPrice = customFields?.ecommerce_price || data?.standard_selling_price || 0;

    // SEO fields
    const seoTitle = customFields?.seo_title || '';
    const seoDescription = customFields?.seo_description || '';
    const seoKeywords = customFields?.seo_keywords || '';
    const seoSlug = customFields?.seo_slug || '';

    // Translated marketing names (stored as ecommerce_name_{lang})
    const getStoreName = (langCode: string) => customFields?.[`ecommerce_name_${langCode}`] || '';
    const getStoreDesc = (langCode: string) => customFields?.[`ecommerce_desc_${langCode}`] || '';
    const getSeoTitleLang = (langCode: string) => customFields?.[`seo_title_${langCode}`] || '';
    const getSeoDescLang = (langCode: string) => customFields?.[`seo_desc_${langCode}`] || '';

    // AI Translation states
    const [translatingNames, setTranslatingNames] = useState(false);
    const [translatingDesc, setTranslatingDesc] = useState(false);
    const [translatingSeoTitle, setTranslatingSeoTitle] = useState(false);
    const [translatingSeoDesc, setTranslatingSeoDesc] = useState(false);

    const { translate } = useAutoTranslate({
        context: 'product_name',
        onTranslated: () => { },
    });

    const updateCustomField = (field: string, value: any) => {
        if (!isView) {
            onChange({
                custom_fields: { ...customFields, [field]: value }
            });
        }
    };

    const updateMultipleCustomFields = (updates: Record<string, any>) => {
        if (!isView) {
            onChange({
                custom_fields: { ...customFields, ...updates }
            });
        }
    };

    // Helper to call Edge Function directly (for generate modes)
    const callAutoTranslate = async (body: any) => {
        const { data: result, error } = await cloudSupabase.functions.invoke('auto-translate', { body });
        if (error) throw error;
        if (!result?.success) throw new Error(result?.error || 'Failed');
        return result;
    };

    const SYSTEM_LANGS = ['ar', 'en', 'ru', 'uk', 'ro', 'pl', 'tr', 'de', 'it', 'fr'];

    // ═══ ترجمة/توليد الاسم التجاري ═══
    const handleTranslateNames = async () => {
        const source = marketingName || data?.name_ar || data?.name_en || '';
        if (!source.trim()) {
            toast.warning(isAr ? 'أدخل اسم المادة أولاً' : 'Enter material name first');
            return;
        }
        setTranslatingNames(true);
        try {
            const hasMarketingName = !!marketingName.trim();
            const result = hasMarketingName
                ? await translate(marketingName, 'ar')
                : (await callAutoTranslate({
                    text: source,
                    source_language: 'ar',
                    target_languages: SYSTEM_LANGS,
                    mode: 'generate_marketing_name',
                }))?.translations;

            if (result) {
                const updates: Record<string, any> = {};
                for (const [lang, text] of Object.entries(result)) {
                    if (lang === 'ar' && !hasMarketingName) {
                        updates['ecommerce_marketing_name'] = text as string;
                    }
                    updates[`ecommerce_name_${lang}`] = text;
                }
                updateMultipleCustomFields(updates);
                toast.success(isAr
                    ? (hasMarketingName ? '✅ تمت ترجمة الأسماء' : '✅ تم توليد اسم تجاري + ترجمة')
                    : (hasMarketingName ? '✅ Names translated' : '✅ Marketing name generated'));
            }
        } catch (e: any) {
            console.error('Names error:', e);
            toast.error(isAr ? 'فشل التوليد' : 'Generation failed');
        } finally {
            setTranslatingNames(false);
        }
    };

    // ═══ ترجمة/توليد الوصف التسويقي ═══
    const handleTranslateDesc = async () => {
        const source = marketingDesc || data?.name_ar || data?.name_en || '';
        if (!source.trim()) return;
        setTranslatingDesc(true);
        try {
            const hasDesc = !!marketingDesc.trim();
            const result = hasDesc
                ? await translate(marketingDesc, 'ar')
                : (await callAutoTranslate({
                    text: source,
                    source_language: 'ar',
                    target_languages: SYSTEM_LANGS,
                    mode: 'generate_description',
                }))?.translations;

            if (result) {
                const updates: Record<string, any> = {};
                for (const [lang, text] of Object.entries(result)) {
                    if (lang === 'ar' && !hasDesc) {
                        updates['ecommerce_marketing_description'] = text as string;
                    }
                    updates[`ecommerce_desc_${lang}`] = text;
                }
                updateMultipleCustomFields(updates);
                toast.success(isAr
                    ? (hasDesc ? '✅ تمت ترجمة الوصف' : '✅ تم توليد وصف تسويقي')
                    : (hasDesc ? '✅ Desc translated' : '✅ Description generated'));
            }
        } catch (e: any) {
            console.error('Desc error:', e);
            toast.error(isAr ? 'فشل التوليد' : 'Generation failed');
        } finally {
            setTranslatingDesc(false);
        }
    };

    // ═══ توليد/ترجمة SEO ═══
    const handleTranslateSeoTitle = async () => {
        const source = seoTitle || marketingName || data?.name_ar || '';
        if (!source.trim()) return;
        setTranslatingSeoTitle(true);
        try {
            if (seoTitle.trim()) {
                const result = await translate(seoTitle, 'ar');
                if (result) {
                    const updates: Record<string, any> = {};
                    for (const [lang, text] of Object.entries(result)) updates[`seo_title_${lang}`] = text;
                    updateMultipleCustomFields(updates);
                    toast.success(isAr ? '✅ تمت ترجمة عنوان SEO' : '✅ SEO title translated');
                }
            } else {
                const r = await callAutoTranslate({ text: source, source_language: 'ar', target_languages: SYSTEM_LANGS, mode: 'generate_seo' });
                if (r?.translations) {
                    const updates: Record<string, any> = {};
                    const t = r.translations;
                    if (t.title) for (const [lang, text] of Object.entries(t.title as Record<string, string>)) {
                        if (lang === 'ar') updates['seo_title'] = text;
                        updates[`seo_title_${lang}`] = text;
                    }
                    if (t.description) for (const [lang, text] of Object.entries(t.description as Record<string, string>)) {
                        if (lang === 'ar') updates['seo_description'] = text;
                        updates[`seo_desc_${lang}`] = text;
                    }
                    updateMultipleCustomFields(updates);
                    toast.success(isAr ? '✅ تم توليد بيانات SEO' : '✅ SEO data generated');
                }
            }
        } catch (e: any) {
            console.error('SEO error:', e);
            toast.error(isAr ? 'فشل توليد SEO' : 'SEO generation failed');
        } finally {
            setTranslatingSeoTitle(false);
        }
    };

    // ترجمة وصف SEO
    const handleTranslateSeoDesc = async () => {
        if (!seoDescription.trim()) { handleTranslateSeoTitle(); return; }
        setTranslatingSeoDesc(true);
        try {
            const result = await translate(seoDescription, 'ar');
            if (result) {
                const updates: Record<string, any> = {};
                for (const [lang, text] of Object.entries(result)) updates[`seo_desc_${lang}`] = text;
                updateMultipleCustomFields(updates);
                toast.success(isAr ? '✅ تمت ترجمة وصف SEO' : '✅ SEO desc translated');
            }
        } finally {
            setTranslatingSeoDesc(false);
        }
    };

    // Auto-generate slug from marketing name
    const generateSlug = () => {
        const name = getStoreName('en') || marketingName || data?.name_en || '';
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        updateCustomField('seo_slug', slug);
    };

    return (
        <div className="space-y-5 pb-6">

            {/* ═══ 1. نشر في المتجر ═══ */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                                <Store className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {isAr ? 'نشر في المتجر الإلكتروني' : 'Publish to E-commerce'}
                                </Label>
                                <p className="text-xs text-gray-500">
                                    {isAr ? 'اجعل هذا المنتج متاحاً للبيع وسيتم نقل بيانات السيو تلقائياً' : 'Make this product available for sale — SEO data synced automatically'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={published}
                            onCheckedChange={(val) => updateCustomField('ecommerce_published', val)}
                            disabled={isView}
                            className={published ? "data-[state=checked]:bg-emerald-500" : ""}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ═══ 2. الاسم التجاري + السعر ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Tag className="w-4 h-4 text-teal-500" />
                            {isAr ? 'بيانات المتجر' : 'Store Data'}
                        </CardTitle>
                        {!isView && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleTranslateNames}
                                disabled={translatingNames}
                                className="gap-1.5 border-purple-200 text-purple-600 hover:bg-purple-50 shrink-0"
                            >
                                {translatingNames ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAr ? 'يترجم...' : 'Translating...'}</>
                                ) : (
                                    <><Sparkles className="w-3.5 h-3.5" /> {isAr ? '✨ ترجم الأسماء' : '✨ Translate Names'}</>
                                )}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{isAr ? 'الاسم التجاري (عربي)' : 'Marketing Name (Arabic)'}</Label>
                            <Input
                                placeholder={isAr ? 'مثال: قماش حرير طبيعي 100%' : 'e.g., 100% Natural Silk Fabric'}
                                value={marketingName}
                                disabled={isView}
                                onChange={(e) => updateCustomField('ecommerce_marketing_name', e.target.value)}
                                dir="rtl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{isAr ? 'السعر في المتجر' : 'Store Selling Price'}</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={sellingPrice}
                                disabled={isView}
                                onChange={(e) => updateCustomField('ecommerce_price', Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Translated marketing names */}
                    {STORE_LANGUAGES.map(lang => (
                        <div key={lang.code} className="flex items-center gap-3">
                            <div className="w-24 shrink-0">
                                <Badge variant="outline" className="w-full justify-center text-xs">
                                    {lang.flag} {lang.nativeName}
                                </Badge>
                            </div>
                            <Input
                                value={getStoreName(lang.code)}
                                onChange={(e) => updateCustomField(`ecommerce_name_${lang.code}`, e.target.value)}
                                placeholder={`${isAr ? 'الاسم بـ' : 'Name in '}${lang.name}`}
                                disabled={isView}
                                className="flex-1"
                                dir={lang.direction}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ═══ 3. الوصف التسويقي ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-teal-500" />
                            {isAr ? 'الوصف التسويقي' : 'Marketing Description'}
                        </CardTitle>
                        {!isView && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleTranslateDesc}
                                disabled={translatingDesc}
                                className="gap-1.5 border-purple-200 text-purple-600 hover:bg-purple-50 shrink-0"
                            >
                                {translatingDesc ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAr ? 'يترجم...' : 'Translating...'}</>
                                ) : (
                                    <><Sparkles className="w-3.5 h-3.5" /> {isAr ? '✨ ترجم الوصف' : '✨ Translate Desc'}</>
                                )}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder={isAr ? 'اكتب وصفاً تسويقياً جذاباً بالعربية...' : 'Write an attractive marketing description...'}
                        value={marketingDesc}
                        disabled={isView}
                        onChange={(e) => updateCustomField('ecommerce_marketing_description', e.target.value)}
                        className="min-h-[80px]"
                        dir="rtl"
                    />

                    {/* Translated descriptions */}
                    {STORE_LANGUAGES.map(lang => (
                        <div key={lang.code} className="space-y-1">
                            <Label className="text-xs text-gray-500 flex items-center gap-1">
                                {lang.flag} {lang.nativeName}
                            </Label>
                            <Textarea
                                value={getStoreDesc(lang.code)}
                                onChange={(e) => updateCustomField(`ecommerce_desc_${lang.code}`, e.target.value)}
                                placeholder={`${isAr ? 'الوصف بـ' : 'Description in '}${lang.name}`}
                                disabled={isView}
                                className="min-h-[60px]"
                                dir={lang.direction}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ═══ 4. SEO Data ═══ */}
            <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Search className="w-4 h-4 text-blue-500" />
                            {isAr ? 'بيانات تحسين محركات البحث (SEO)' : 'Search Engine Optimization (SEO)'}
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">SEO</Badge>
                        </CardTitle>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {isAr
                            ? 'بيانات السيو تُنقل تلقائياً لصفحة المنتج في المتجر الإلكتروني'
                            : 'SEO data auto-syncs to the product page in the online store'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* SEO Slug */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">{isAr ? 'الرابط الثابت (Slug)' : 'URL Slug'}</Label>
                            {!isView && (
                                <Button type="button" variant="ghost" size="sm" onClick={generateSlug}
                                    className="text-xs text-blue-600 h-6 px-2">
                                    {isAr ? 'توليد تلقائي' : 'Auto-generate'}
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 shrink-0 font-mono">/product/</span>
                            <Input
                                value={seoSlug}
                                onChange={(e) => updateCustomField('seo_slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                placeholder="natural-silk-fabric"
                                disabled={isView}
                                className="font-mono text-sm"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* SEO Title (Arabic) + Translate */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">{isAr ? 'عنوان SEO (عربي)' : 'SEO Title (Arabic)'}</Label>
                            {!isView && (
                                <Button type="button" variant="outline" size="sm" onClick={handleTranslateSeoTitle}
                                    disabled={translatingSeoTitle}
                                    className="gap-1 border-purple-200 text-purple-600 hover:bg-purple-50 h-6 px-2 text-[10px]">
                                    {translatingSeoTitle
                                        ? <><Loader2 className="w-3 h-3 animate-spin" /> ...</>
                                        : <><Sparkles className="w-3 h-3" /> {isAr ? 'ترجم' : 'Translate'}</>
                                    }
                                </Button>
                            )}
                        </div>
                        <Input
                            value={seoTitle}
                            onChange={(e) => updateCustomField('seo_title', e.target.value)}
                            placeholder={isAr ? 'عنوان الصفحة في نتائج البحث' : 'Page title in search results'}
                            disabled={isView}
                            dir="rtl"
                        />
                        <p className="text-[10px] text-gray-400">
                            {seoTitle.length}/60 {isAr ? 'حرف (يُفضل 50-60)' : 'chars (recommended 50-60)'}
                        </p>

                        {/* Translated SEO titles */}
                        {STORE_LANGUAGES.map(lang => (
                            <div key={lang.code} className="flex items-center gap-2">
                                <span className="text-xs w-8 shrink-0">{lang.flag}</span>
                                <Input
                                    value={getSeoTitleLang(lang.code)}
                                    onChange={(e) => updateCustomField(`seo_title_${lang.code}`, e.target.value)}
                                    placeholder={`SEO title (${lang.name})`}
                                    disabled={isView}
                                    className="text-xs h-8"
                                    dir={lang.direction}
                                />
                            </div>
                        ))}
                    </div>

                    {/* SEO Description (Arabic) + Translate */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">{isAr ? 'وصف SEO (عربي)' : 'SEO Description (Arabic)'}</Label>
                            {!isView && (
                                <Button type="button" variant="outline" size="sm" onClick={handleTranslateSeoDesc}
                                    disabled={translatingSeoDesc}
                                    className="gap-1 border-purple-200 text-purple-600 hover:bg-purple-50 h-6 px-2 text-[10px]">
                                    {translatingSeoDesc
                                        ? <><Loader2 className="w-3 h-3 animate-spin" /> ...</>
                                        : <><Sparkles className="w-3 h-3" /> {isAr ? 'ترجم' : 'Translate'}</>
                                    }
                                </Button>
                            )}
                        </div>
                        <Textarea
                            value={seoDescription}
                            onChange={(e) => updateCustomField('seo_description', e.target.value)}
                            placeholder={isAr ? 'وصف يظهر أسفل العنوان في نتائج البحث' : 'Description shown below title in search results'}
                            disabled={isView}
                            className="min-h-[60px]"
                            dir="rtl"
                        />
                        <p className="text-[10px] text-gray-400">
                            {seoDescription.length}/160 {isAr ? 'حرف (يُفضل 120-160)' : 'chars (recommended 120-160)'}
                        </p>

                        {/* Translated SEO descriptions */}
                        {STORE_LANGUAGES.map(lang => (
                            <div key={lang.code} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs w-8 shrink-0">{lang.flag}</span>
                                    <Textarea
                                        value={getSeoDescLang(lang.code)}
                                        onChange={(e) => updateCustomField(`seo_desc_${lang.code}`, e.target.value)}
                                        placeholder={`SEO desc (${lang.name})`}
                                        disabled={isView}
                                        className="text-xs min-h-[40px]"
                                        dir={lang.direction}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SEO Keywords */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">{isAr ? 'الكلمات المفتاحية' : 'Keywords'}</Label>
                        <Input
                            value={seoKeywords}
                            onChange={(e) => updateCustomField('seo_keywords', e.target.value)}
                            placeholder={isAr ? 'قماش, حرير, طبيعي, فاخر (مفصولة بفواصل)' : 'fabric, silk, natural, luxury (comma separated)'}
                            disabled={isView}
                        />
                    </div>

                    {/* SEO Preview */}
                    <div className="p-3 rounded-lg bg-white dark:bg-gray-950 border">
                        <p className="text-[10px] text-gray-400 mb-2 font-medium">
                            {isAr ? '👁️ معاينة نتائج البحث:' : '👁️ Search Preview:'}
                        </p>
                        <div className="space-y-0.5">
                            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium truncate">
                                {seoTitle || (isAr ? 'عنوان المنتج' : 'Product Title')}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 font-mono">
                                texacore.com/product/{seoSlug || 'product-slug'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {seoDescription || (isAr ? 'وصف المنتج سيظهر هنا...' : 'Product description will appear here...')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ 5. صور المتجر ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-teal-500" />
                        {isAr ? 'صور المتجر' : 'Store Images'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                            {isAr ? 'ارفع الصور التسويقية الخاصة بالمتجر (قريباً)' : 'Upload store marketing images (Coming soon)'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* NexaAI Footer */}
            <p className="text-[10px] text-center text-gray-400">
                ⚡ NexaAI Agent · Gemini 2.5 Flash · {isAr ? 'ترجمة تلقائية لكل اللغات المدعومة' : 'Auto-translation to all supported languages'}
            </p>
        </div>
    );
}

export default MaterialEcommerceTab;
