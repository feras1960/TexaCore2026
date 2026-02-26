/**
 * ════════════════════════════════════════════════════════════════
 * 🖨️ PrintSettingsTab — إعدادات الطباعة + محرر القوالب
 * ════════════════════════════════════════════════════════════════
 * 
 * Features:
 * 1. ترويسة الشركة (شعار + ختم + توقيع + بيانات)
 * 2. قائمة القوالب حسب الفئة (CRUD + تبديل افتراضي)
 * 3. محرر قالب (HTML + CSS + متغيرات + معاينة)
 * 4. رفع قوالب مخصصة (عقود وغيرها)
 * 5. دليل المتغيرات مع شرح وأمثلة
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/app/providers/LanguageProvider';
import printService, {
    type PrintTemplate,
    type CompanyPrintSettings,
    type PrintOptions,
    VARIABLE_DOCS,
    getDocTitle,
    getPrintLanguage,
    COUNTRY_PRINT_LANGUAGE,
} from '@/services/printService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
    Printer, Upload, Save, Plus, Trash2, Eye, Copy, Star,
    FileText, FileCode, LayoutTemplate, Variable, HelpCircle,
    Image, Stamp, PenTool, QrCode, Settings2, Check, X,
    ChevronDown, Search, Info, ArrowLeft, ExternalLink, Languages,
} from 'lucide-react';
import { toast } from 'sonner';
import VisualTemplateEditor from '@/components/shared/print/VisualTemplateEditor';

// ─── Constants ──────────────────────────────────────────────────
const DOC_TYPE_CATEGORIES = [
    { category: 'invoice', label_ar: 'الفواتير', label_en: 'Invoices', types: ['sales_invoice', 'purchase_invoice', 'price_quote'] },
    { category: 'receipt', label_ar: 'السندات والقيود', label_en: 'Vouchers', types: ['receipt_voucher', 'payment_voucher', 'journal_entry'] },
    { category: 'report', label_ar: 'التقارير', label_en: 'Reports', types: ['account_statement'] },
    { category: 'contract', label_ar: 'العقود', label_en: 'Contracts', types: ['contract', 'custom'] },
    { category: 'label', label_ar: 'اللصاقات', label_en: 'Labels', types: ['roll_label', 'container_label'] },
];

const DOC_TYPE_NAMES: Record<string, { ar: string; en: string }> = {
    sales_invoice: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
    purchase_invoice: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
    price_quote: { ar: 'عرض سعر', en: 'Price Quote' },
    receipt_voucher: { ar: 'سند قبض', en: 'Receipt Voucher' },
    payment_voucher: { ar: 'سند صرف', en: 'Payment Voucher' },
    journal_entry: { ar: 'قيد يومية', en: 'Journal Entry' },
    account_statement: { ar: 'كشف حساب', en: 'Account Statement' },
    contract: { ar: 'عقد', en: 'Contract' },
    custom: { ar: 'مخصص', en: 'Custom' },
    roll_label: { ar: 'لصاقة رول', en: 'Roll Label' },
    container_label: { ar: 'لصاقة حاوية', en: 'Container Label' },
};

const VARIABLE_GROUPS = [
    { id: 'company', label_ar: '🏢 الشركة', label_en: '🏢 Company' },
    { id: 'party', label_ar: '👤 العميل/المورد', label_en: '👤 Party' },
    { id: 'document', label_ar: '📄 المستند', label_en: '📄 Document' },
    { id: 'items', label_ar: '📦 البنود', label_en: '📦 Items' },
    { id: 'totals', label_ar: '💰 المجاميع', label_en: '💰 Totals' },
    { id: 'country', label_ar: '🌍 الدولة', label_en: '🌍 Country' },
    { id: 'system', label_ar: '⚙️ النظام', label_en: '⚙️ System' },
];

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function PrintSettingsTab() {
    const { company, companyId } = useCompany();
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [activeSection, setActiveSection] = useState<'branding' | 'templates'>('templates');
    const [templates, setTemplates] = useState<PrintTemplate[]>([]);
    const [printSettings, setPrintSettings] = useState<CompanyPrintSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editor state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null);
    const [isNewTemplate, setIsNewTemplate] = useState(false);

    // Filter
    const [filterCategory, setFilterCategory] = useState('all');

    // ─── Load Data ────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const tenantId = (company as any)?.tenant_id;

            // Load templates — graceful failure
            try {
                const { data: tpls, error: tplErr } = await (await import('@/lib/supabase')).supabase
                    .from('print_templates')
                    .select('*')
                    .or(tenantId ? `tenant_id.eq.${tenantId},tenant_id.is.null` : 'tenant_id.is.null')
                    .eq('is_active', true)
                    .order('sort_order');
                if (tplErr) {
                    console.warn('[PrintSettings] Templates load error:', tplErr);
                } else {
                    setTemplates(tpls || []);
                }
            } catch (err) {
                console.warn('[PrintSettings] Templates fetch failed:', err);
            }

            // Load company print settings — graceful failure
            try {
                const settings = await printService.getCompanyPrintSettings(companyId);
                setPrintSettings(settings);
            } catch (err) {
                console.warn('[PrintSettings] Settings load error (table may not exist yet):', err);
                setPrintSettings(null);
            }
        } catch (err: any) {
            console.error('[PrintSettings] Critical error:', err);
            toast.error(isAr ? 'خطأ في تحميل الإعدادات' : 'Error loading settings');
        } finally {
            setLoading(false);
        }
    }, [companyId, company, isAr]);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── Branding Form State ──────────────────────────────────────
    const [brandForm, setBrandForm] = useState({
        logo_url: '', stamp_url: '', signature_url: '',
        header_company_name_ar: '', header_company_name_en: '',
        header_address_ar: '', header_address_en: '',
        header_phone: '', header_email: '', header_website: '',
        header_tax_number: '', header_commercial_reg: '',
        footer_text_ar: '', footer_text_en: '',
        footer_terms_ar: '', footer_terms_en: '',
        default_paper_size: 'A4', default_copies: 1,
        auto_print_on_confirm: false, show_qr_by_default: true,
    });

    useEffect(() => {
        if (printSettings) {
            setBrandForm({
                logo_url: printSettings.logo_url || '',
                stamp_url: printSettings.stamp_url || '',
                signature_url: printSettings.signature_url || '',
                header_company_name_ar: printSettings.header_company_name_ar || (company as any)?.name_ar || '',
                header_company_name_en: printSettings.header_company_name_en || (company as any)?.name_en || '',
                header_address_ar: printSettings.header_address_ar || '',
                header_address_en: printSettings.header_address_en || '',
                header_phone: printSettings.header_phone || (company as any)?.phone || '',
                header_email: printSettings.header_email || (company as any)?.email || '',
                header_website: printSettings.header_website || '',
                header_tax_number: printSettings.header_tax_number || company?.tax_number || '',
                header_commercial_reg: printSettings.header_commercial_reg || company?.commercial_register || '',
                footer_text_ar: printSettings.footer_text_ar || 'شكراً لتعاملكم معنا',
                footer_text_en: printSettings.footer_text_en || 'Thank you for your business',
                footer_terms_ar: printSettings.footer_terms_ar || '',
                footer_terms_en: printSettings.footer_terms_en || '',
                default_paper_size: printSettings.default_paper_size || 'A4',
                default_copies: printSettings.default_copies || 1,
                auto_print_on_confirm: printSettings.auto_print_on_confirm || false,
                show_qr_by_default: printSettings.show_qr_by_default ?? true,
            });
        }
    }, [printSettings, company]);

    // ─── Save Branding ────────────────────────────────────────────
    const saveBranding = async () => {
        if (!companyId) return;
        setSaving(true);
        try {
            const tenantId = (company as any)?.tenant_id;
            await printService.saveCompanyPrintSettings({
                company_id: companyId,
                tenant_id: tenantId,
                ...brandForm,
            } as any);
            toast.success(isAr ? 'تم حفظ إعدادات الطباعة' : 'Print settings saved');
            loadData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete Template ──────────────────────────────────────────
    const deleteTemplate = async (id: string, isSystem: boolean) => {
        if (isSystem) { toast.error(isAr ? 'لا يمكن حذف قالب النظام' : 'Cannot delete system template'); return; }
        if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا القالب؟' : 'Delete this template?')) return;
        try {
            await printService.deleteTemplate(id);
            toast.success(isAr ? 'تم الحذف' : 'Deleted');
            loadData();
        } catch (err: any) { toast.error(err.message); }
    };

    // ─── Set Default Template ─────────────────────────────────────
    const setDefault = async (id: string, docType: string) => {
        try {
            const tenantId = (company as any)?.tenant_id;
            await printService.setDefaultTemplate(id, docType, tenantId);
            toast.success(isAr ? 'تم التعيين كافتراضي' : 'Set as default');
            loadData();
        } catch (err: any) { toast.error(err.message); }
    };

    // ─── Duplicate Template ───────────────────────────────────────
    const duplicateTemplate = async (tpl: PrintTemplate) => {
        try {
            const tenantId = (company as any)?.tenant_id;
            await printService.createTemplate({
                ...tpl,
                id: undefined as any,
                tenant_id: tenantId,
                company_id: companyId,
                name_ar: tpl.name_ar + ' (نسخة)',
                name_en: (tpl.name_en || '') + ' (Copy)',
                is_system: false,
                is_default: false,
            });
            toast.success(isAr ? 'تم النسخ' : 'Duplicated');
            loadData();
        } catch (err: any) { toast.error(err.message); }
    };

    // ─── Open Editor ──────────────────────────────────────────────
    const openEditor = (tpl?: PrintTemplate) => {
        if (tpl) {
            setEditingTemplate({ ...tpl });
            setIsNewTemplate(false);
        } else {
            setEditingTemplate({
                id: '',
                tenant_id: (company as any)?.tenant_id || null,
                company_id: companyId,
                doc_type: 'custom',
                category: 'contract',
                name_ar: '',
                name_en: null,
                template_html: '<div class="page">\n  <h1>{{company.name}}</h1>\n  <p>{{doc_title}}</p>\n  <!-- أضف محتواك هنا -->\n</div>',
                template_css: 'body{font-family:{{font_family}};direction:{{direction}};font-size:12px}.page{width:190mm;margin:0 auto;padding:10mm}',
                variables: [],
                paper_size: 'A4',
                orientation: 'portrait',
                margins: { top: 10, right: 10, bottom: 10, left: 10 },
                include_qr: true,
                include_header: true,
                include_footer: true,
                include_logo: true,
                include_stamp: false,
                include_signature: false,
                is_default: false,
                is_system: false,
                is_active: true,
                sort_order: 99,
                created_at: '',
                updated_at: '',
            });
            setIsNewTemplate(true);
        }
        setEditorOpen(true);
    };

    // ─── Filtered Templates ───────────────────────────────────────
    const filteredTemplates = useMemo(() => {
        if (filterCategory === 'all') return templates;
        const cat = DOC_TYPE_CATEGORIES.find(c => c.category === filterCategory);
        if (!cat) return templates;
        return templates.filter(t => cat.types.includes(t.doc_type));
    }, [templates, filterCategory]);

    // ─── Render ───────────────────────────────────────────────────
    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-16">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Section Switcher */}
            <div className="flex gap-2">
                <Button
                    variant={activeSection === 'templates' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveSection('templates')}
                    className="gap-2"
                >
                    <LayoutTemplate className="w-4 h-4" />
                    {isAr ? 'القوالب' : 'Templates'}
                </Button>
                <Button
                    variant={activeSection === 'branding' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveSection('branding')}
                    className="gap-2"
                >
                    <Settings2 className="w-4 h-4" />
                    {isAr ? 'الترويسة والعلامة التجارية' : 'Branding & Header'}
                </Button>
            </div>

            {/* ═══ Templates Section ═══ */}
            {activeSection === 'templates' && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-tajawal flex items-center gap-2 text-lg">
                                    <LayoutTemplate className="w-5 h-5 text-primary" />
                                    {isAr ? 'قوالب الطباعة' : 'Print Templates'}
                                </CardTitle>
                                <CardDescription className="font-tajawal mt-1">
                                    {isAr ? `${templates.length} قالب — لغة القالب مرتبطة بدولة الشركة (${company?.country_code || 'SA'})`
                                        : `${templates.length} templates — template language linked to company country (${company?.country_code || 'SA'})`}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditor()} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    {isAr ? 'قالب جديد' : 'New Template'}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => document.getElementById('upload-template')?.click()} className="gap-2">
                                    <Upload className="w-4 h-4" />
                                    {isAr ? 'رفع HTML' : 'Upload HTML'}
                                </Button>
                                <input id="upload-template" type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        openEditor();
                                        setTimeout(() => {
                                            setEditingTemplate(prev => prev ? { ...prev, template_html: ev.target?.result as string || '' } : prev);
                                        }, 100);
                                    };
                                    reader.readAsText(file);
                                    e.target.value = '';
                                }} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Category Filter */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            <Button variant={filterCategory === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterCategory('all')}>
                                {isAr ? 'الكل' : 'All'} <Badge variant="secondary" className="ms-1">{templates.length}</Badge>
                            </Button>
                            {DOC_TYPE_CATEGORIES.map(cat => {
                                const count = templates.filter(t => cat.types.includes(t.doc_type)).length;
                                if (count === 0) return null;
                                return (
                                    <Button key={cat.category} variant={filterCategory === cat.category ? 'default' : 'ghost'} size="sm" onClick={() => setFilterCategory(cat.category)}>
                                        {isAr ? cat.label_ar : cat.label_en} <Badge variant="secondary" className="ms-1">{count}</Badge>
                                    </Button>
                                );
                            })}
                        </div>

                        {/* Templates Grid */}
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTemplates.map(tpl => (
                                <div key={tpl.id} className={`group relative border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all
                  ${tpl.is_default ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
                                >
                                    {/* Default badge */}
                                    {tpl.is_default && (
                                        <Badge className="absolute -top-2 end-3 bg-primary text-xs">
                                            {isAr ? 'افتراضي' : 'Default'}
                                        </Badge>
                                    )}
                                    {tpl.is_system && (
                                        <Badge variant="outline" className="absolute -top-2 start-3 text-xs border-amber-500/40 text-amber-600">
                                            {isAr ? 'نظام' : 'System'}
                                        </Badge>
                                    )}

                                    <div className="mb-3">
                                        <h3 className="font-semibold font-tajawal text-sm">{isAr ? tpl.name_ar : (tpl.name_en || tpl.name_ar)}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {DOC_TYPE_NAMES[tpl.doc_type]?.[isAr ? 'ar' : 'en'] || tpl.doc_type}
                                            {' · '}
                                            {tpl.paper_size} {tpl.orientation === 'landscape' ? '↔' : '↕'}
                                        </p>
                                    </div>

                                    <div className="flex gap-1 text-[10px] mb-3 flex-wrap">
                                        {tpl.include_qr && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">QR</Badge>}
                                        {tpl.include_header && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{isAr ? 'ترويسة' : 'Header'}</Badge>}
                                        {tpl.include_footer && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{isAr ? 'تذييل' : 'Footer'}</Badge>}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditor(tpl)} title={isAr ? 'تحرير' : 'Edit'}>
                                            <FileCode className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => duplicateTemplate(tpl)} title={isAr ? 'نسخ' : 'Duplicate'}>
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        {!tpl.is_default && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDefault(tpl.id, tpl.doc_type)} title={isAr ? 'تعيين افتراضي' : 'Set Default'}>
                                                <Star className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        {!tpl.is_system && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate(tpl.id, tpl.is_system)} title={isAr ? 'حذف' : 'Delete'}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredTemplates.length === 0 && (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    <LayoutTemplate className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p>{isAr ? 'لا توجد قوالب في هذه الفئة' : 'No templates in this category'}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ Branding Section ═══ */}
            {activeSection === 'branding' && (
                <div className="space-y-4">
                    {/* Images: Logo, Stamp, Signature */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-tajawal flex items-center gap-2 text-lg">
                                <Image className="w-5 h-5 text-primary" />
                                {isAr ? 'الشعار والختم والتوقيع' : 'Logo, Stamp & Signature'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                                {[
                                    { key: 'logo_url', label_ar: '🏢 شعار الشركة', label_en: '🏢 Company Logo', icon: Image },
                                    { key: 'stamp_url', label_ar: '🔴 ختم الشركة', label_en: '🔴 Company Stamp', icon: Stamp },
                                    { key: 'signature_url', label_ar: '✍️ التوقيع', label_en: '✍️ Signature', icon: PenTool },
                                ].map(item => (
                                    <div key={item.key} className="border rounded-lg p-4 text-center space-y-3">
                                        <p className="text-sm font-medium">{isAr ? item.label_ar : item.label_en}</p>
                                        {(brandForm as any)[item.key] ? (
                                            <img src={(brandForm as any)[item.key]} alt="" className="h-16 mx-auto object-contain rounded" />
                                        ) : (
                                            <div className="h-16 flex items-center justify-center text-muted-foreground">
                                                <item.icon className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}
                                        <Input
                                            placeholder={isAr ? 'رابط الصورة' : 'Image URL'}
                                            value={(brandForm as any)[item.key]}
                                            onChange={e => setBrandForm(prev => ({ ...prev, [item.key]: e.target.value }))}
                                            className="text-xs"
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Header Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-tajawal flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5 text-primary" />
                                {isAr ? 'بيانات الترويسة' : 'Header Information'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                <div><Label>{isAr ? 'اسم الشركة (عربي)' : 'Company Name (AR)'}</Label>
                                    <Input value={brandForm.header_company_name_ar} onChange={e => setBrandForm(p => ({ ...p, header_company_name_ar: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'اسم الشركة (إنجليزي)' : 'Company Name (EN)'}</Label>
                                    <Input value={brandForm.header_company_name_en} onChange={e => setBrandForm(p => ({ ...p, header_company_name_en: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'العنوان (عربي)' : 'Address (AR)'}</Label>
                                    <Input value={brandForm.header_address_ar} onChange={e => setBrandForm(p => ({ ...p, header_address_ar: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'العنوان (إنجليزي)' : 'Address (EN)'}</Label>
                                    <Input value={brandForm.header_address_en} onChange={e => setBrandForm(p => ({ ...p, header_address_en: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'الهاتف' : 'Phone'}</Label>
                                    <Input value={brandForm.header_phone} onChange={e => setBrandForm(p => ({ ...p, header_phone: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                                    <Input value={brandForm.header_email} onChange={e => setBrandForm(p => ({ ...p, header_email: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'الموقع' : 'Website'}</Label>
                                    <Input value={brandForm.header_website} onChange={e => setBrandForm(p => ({ ...p, header_website: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'الرقم الضريبي' : 'Tax Number'}</Label>
                                    <Input value={brandForm.header_tax_number} onChange={e => setBrandForm(p => ({ ...p, header_tax_number: e.target.value }))} /></div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer & Defaults */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-tajawal text-lg">{isAr ? 'التذييل والإعدادات الافتراضية' : 'Footer & Defaults'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                <div><Label>{isAr ? 'نص التذييل (عربي)' : 'Footer Text (AR)'}</Label>
                                    <Input value={brandForm.footer_text_ar} onChange={e => setBrandForm(p => ({ ...p, footer_text_ar: e.target.value }))} /></div>
                                <div><Label>{isAr ? 'نص التذييل (إنجليزي)' : 'Footer Text (EN)'}</Label>
                                    <Input value={brandForm.footer_text_en} onChange={e => setBrandForm(p => ({ ...p, footer_text_en: e.target.value }))} /></div>
                                <div className="md:col-span-2"><Label>{isAr ? 'الشروط والأحكام (عربي)' : 'Terms & Conditions (AR)'}</Label>
                                    <Textarea rows={2} value={brandForm.footer_terms_ar} onChange={e => setBrandForm(p => ({ ...p, footer_terms_ar: e.target.value }))} /></div>
                            </div>
                            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 pt-2 border-t">
                                <div className="flex items-center gap-2">
                                    <Switch checked={brandForm.show_qr_by_default} onCheckedChange={v => setBrandForm(p => ({ ...p, show_qr_by_default: v }))} />
                                    <Label className="text-sm">{isAr ? 'QR افتراضياً' : 'QR by default'}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={brandForm.auto_print_on_confirm} onCheckedChange={v => setBrandForm(p => ({ ...p, auto_print_on_confirm: v }))} />
                                    <Label className="text-sm">{isAr ? 'طباعة تلقائية' : 'Auto print'}</Label>
                                </div>
                                <div>
                                    <Label className="text-xs">{isAr ? 'حجم الورق' : 'Paper Size'}</Label>
                                    <Select value={brandForm.default_paper_size} onValueChange={v => setBrandForm(p => ({ ...p, default_paper_size: v }))}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A4">A4</SelectItem>
                                            <SelectItem value="A5">A5</SelectItem>
                                            <SelectItem value="Letter">Letter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">{isAr ? 'عدد النسخ' : 'Copies'}</Label>
                                    <Input type="number" min={1} max={5} value={brandForm.default_copies} onChange={e => setBrandForm(p => ({ ...p, default_copies: parseInt(e.target.value) || 1 }))} className="h-8" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button onClick={saveBranding} disabled={saving} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإعدادات' : 'Save Settings')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ Template Editor Sheet ═══ */}
            {editorOpen && editingTemplate && (
                <TemplateEditorSheet
                    template={editingTemplate}
                    isNew={isNewTemplate}
                    isAr={isAr}
                    companyId={companyId}
                    tenantId={(company as any)?.tenant_id}
                    countryCode={company?.country_code || 'SA'}
                    company={company}
                    onClose={() => { setEditorOpen(false); setEditingTemplate(null); }}
                    onSaved={() => { setEditorOpen(false); setEditingTemplate(null); loadData(); }}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Template Editor Sheet
// ═══════════════════════════════════════════════════════════════

interface EditorProps {
    template: PrintTemplate;
    isNew: boolean;
    isAr: boolean;
    companyId: string | null;
    tenantId: string | null;
    countryCode: string;
    company: any;
    onClose: () => void;
    onSaved: () => void;
}

function TemplateEditorSheet({ template, isNew, isAr, companyId, tenantId, countryCode, company, onClose, onSaved }: EditorProps) {
    const [form, setForm] = useState(template);
    const [saving, setSaving] = useState(false);
    const [editorTab, setEditorTab] = useState<'visual' | 'html' | 'css' | 'preview' | 'variables'>('visual');
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewLang, setPreviewLang] = useState(getPrintLanguage(countryCode));
    const [varSearch, setVarSearch] = useState('');
    const [varGroup, setVarGroup] = useState('all');
    const [showCodeTabs, setShowCodeTabs] = useState(false);
    const htmlRef = useRef<HTMLTextAreaElement>(null);

    const update = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

    // ─── Generate Preview ─────────────────────────────────────────
    const generatePrev = useCallback(async () => {
        try {
            // Use real company data for preview
            const co = company || {};
            const coName = co.name_ar || co.name_en || co.name || (isAr ? 'شركتك' : 'Your Company');
            const sampleData = {
                id: 'preview-001',
                company: {
                    name: coName, name_ar: co.name_ar || coName, name_en: co.name_en || coName,
                    address: co.address || co.city || '', phone: co.phone || '', email: co.email || '',
                    tax_id: co.tax_id || co.vat_number || '', commercial_reg: co.commercial_reg || co.cr_number || '', logo: co.logo_url || co.logo || '',
                },
                customer: {
                    name: isAr ? 'عميل تجريبي' : 'Demo Customer', name_ar: 'عميل تجريبي', name_en: 'Demo Customer',
                    phone: '+966 55 987 6543', address: isAr ? 'حي النور' : 'Al-Nour District', tax_id: '300987654300003'
                },
                supplier: {
                    name: isAr ? 'مورد تجريبي' : 'Demo Supplier', name_ar: 'مورد تجريبي', name_en: 'Demo Supplier',
                    phone: '+380 50 123 456', address: 'Kyiv, Ukraine', tax_id: '12345678'
                },
                party: { name: isAr ? 'طرف تجريبي' : 'Demo Party', name_ar: 'طرف تجريبي', name_en: 'Demo Party' },
                invoice: {
                    number: 'SI-2026-000042', date: new Date().toLocaleDateString('en-CA'), due_date: '2026-03-23', supply_date: new Date().toLocaleDateString('en-CA'),
                    subtotal: 5000, discount: 250, tax_amount: 712.50, total: 5462.50, paid: 2000, balance: 3462.50,
                    currency: co.base_currency || 'SAR', payment_terms: isAr ? 'نقداً' : 'Cash', notes: isAr ? 'شكراً لكم' : 'Thank you',
                    items: [
                        { name_ar: 'قماش قطني', name_en: 'Cotton Fabric', quantity: 100, unit: 'm', unit_price: 30, discount: 0, tax_rate: 15, tax_amount: 450, line_total: 3450 },
                        { name_ar: 'قماش حرير', name_en: 'Silk Fabric', quantity: 50, unit: 'm', unit_price: 40, discount: 5, tax_rate: 15, tax_amount: 262.50, line_total: 2012.50 },
                    ]
                },
                voucher: { number: 'RV-2026-0015', date: new Date().toLocaleDateString('en-CA'), amount: 5000, amount_words: isAr ? 'خمسة آلاف ريال فقط' : 'Five Thousand Only', currency: co.base_currency || 'SAR', description: isAr ? 'دفعة فاتورة' : 'Invoice payment', payment_method: isAr ? 'تحويل بنكي' : 'Bank Transfer' },
                entry: {
                    number: 'JE-2026-0100', date: new Date().toLocaleDateString('en-CA'), description: isAr ? 'تسجيل فاتورة مبيعات' : 'Record sales invoice',
                    total_debit: 5462.50, total_credit: 5462.50,
                    lines: [
                        { account_code: '1201', account_name: isAr ? 'ذمم مدينة' : 'Accounts Receivable', name_ar: 'ذمم مدينة', name_en: 'Accounts Receivable', debit: 5462.50, credit: 0 },
                        { account_code: '4101', account_name: isAr ? 'إيرادات المبيعات' : 'Sales Revenue', name_ar: 'إيرادات المبيعات', name_en: 'Sales Revenue', debit: 0, credit: 5000 },
                        { account_code: '2201', account_name: isAr ? 'ضريبة مستحقة' : 'VAT Payable', name_ar: 'ضريبة مستحقة', name_en: 'VAT Payable', debit: 0, credit: 462.50 },
                    ]
                },
                roll: { number: 'R-001', material_name: isAr ? 'قماش قطني 100%' : '100% Cotton', material_code: 'COT-001', color: isAr ? 'أبيض' : 'White', width: '150', weight: '180', length: '50', unit: 'm', composition: isAr ? 'قطن 100%' : '100% Cotton', container_no: 'CONT-2026-001', supplier_name: coName, batch_no: 'B-2026-001', cost_per_unit: '12.50' },
                container: { number: 'CONT-2026-001', name: isAr ? 'شحنة فبراير' : 'Feb Shipment', supplier: isAr ? 'مورد تجريبي' : 'Demo Supplier', origin: isAr ? 'الصين' : 'China', vessel: 'MSC ANNA', arrival_date: '2026-03-15', items_count: 25, total_value: 50000 },
                account: {
                    name: isAr ? 'الصندوق' : 'Cash', code: '1101', opening: 10000, closing: 15000, total_debit: 8000, total_credit: 3000,
                    entries: [
                        { date: '2026-02-20', entry_number: 'JE-001', description: isAr ? 'إيداع' : 'Deposit', debit: 5000, credit: 0 },
                        { date: '2026-02-22', entry_number: 'JE-002', description: isAr ? 'سحب' : 'Withdrawal', debit: 0, credit: 3000 },
                    ]
                },
                period: { from: '2026-02-01', to: '2026-02-28' },
                quote: { number: 'PQ-2026-001', date: new Date().toLocaleDateString('en-CA'), valid_until: '2026-03-23', subtotal: 5000, tax_amount: 750, total: 5750, currency: co.base_currency || 'SAR', notes: '', terms: '' },
                system: { date: new Date().toLocaleDateString('en-CA') },
                _printSettings: {},
                footer_text: isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
                footer_terms: '',
            };

            const html = await printService.generatePreview(form, sampleData, countryCode, {
                includeQR: form.include_qr, includeHeader: form.include_header, includeFooter: form.include_footer,
                includeStamp: false, includeSignature: false, copies: 1,
            }, previewLang);
            setPreviewHtml(html);
        } catch (err) {
            console.error('Preview error:', err);
        }
    }, [form, countryCode, previewLang, isAr]);

    useEffect(() => {
        if (editorTab === 'preview') generatePrev();
    }, [editorTab, previewLang]);

    // ─── Insert Variable ──────────────────────────────────────────
    const insertVariable = (key: string) => {
        if (htmlRef.current) {
            const ta = htmlRef.current;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const text = form.template_html;
            const newText = text.substring(0, start) + key + text.substring(end);
            update('template_html', newText);
            setTimeout(() => {
                ta.focus();
                ta.selectionStart = ta.selectionEnd = start + key.length;
            }, 0);
        } else {
            update('template_html', form.template_html + key);
        }
        toast.success(isAr ? `تم إدراج ${key}` : `Inserted ${key}`);
    };

    // ─── Filtered Variables ───────────────────────────────────────
    const filteredVars = useMemo(() => {
        return VARIABLE_DOCS.filter(v => {
            if (varGroup !== 'all' && v.group !== varGroup) return false;
            if (varSearch) {
                const s = varSearch.toLowerCase();
                return v.key.toLowerCase().includes(s) || v.label_ar.includes(varSearch) || v.label_en.toLowerCase().includes(s);
            }
            return true;
        });
    }, [varSearch, varGroup]);

    // ─── Save ─────────────────────────────────────────────────────
    const save = async () => {
        if (!form.name_ar.trim()) { toast.error(isAr ? 'الاسم بالعربي مطلوب' : 'Arabic name required'); return; }
        setSaving(true);
        try {
            if (isNew) {
                await printService.createTemplate({
                    ...form,
                    id: undefined as any,
                    tenant_id: tenantId,
                    company_id: companyId,
                });
            } else {
                await printService.updateTemplate(form.id, form);
            }
            toast.success(isAr ? 'تم الحفظ' : 'Saved');
            onSaved();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={true} onOpenChange={() => onClose()}>
            <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col" style={{ maxWidth: '100vw' }}>
                <SheetTitle className="sr-only">
                    {isNew ? (isAr ? 'قالب جديد' : 'New Template') : (isAr ? 'تحرير القالب' : 'Edit Template')}
                </SheetTitle>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
                        <div>
                            <h2 className="font-semibold font-tajawal">{isNew ? (isAr ? '✨ قالب جديد' : '✨ New Template') : (isAr ? '✏️ تحرير القالب' : '✏️ Edit Template')}</h2>
                            <p className="text-xs text-muted-foreground">{form.name_ar || (isAr ? 'بدون اسم' : 'Untitled')}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                        <Button size="sm" onClick={save} disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? '...' : (isAr ? 'حفظ' : 'Save')}
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Settings Panel */}
                    <div className="w-64 border-e shrink-0 overflow-y-auto p-3 space-y-3 bg-muted/10">
                        <div><Label className="text-xs">{isAr ? 'الاسم (عربي) *' : 'Name (AR) *'}</Label>
                            <Input value={form.name_ar} onChange={e => update('name_ar', e.target.value)} className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">{isAr ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
                            <Input value={form.name_en || ''} onChange={e => update('name_en', e.target.value)} className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">{isAr ? 'نوع المستند' : 'Document Type'}</Label>
                            <Select value={form.doc_type} onValueChange={v => update('doc_type', v)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(DOC_TYPE_NAMES).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs">{isAr ? 'الورق' : 'Paper'}</Label>
                                <Select value={form.paper_size} onValueChange={v => update('paper_size', v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="A5">A5</SelectItem><SelectItem value="Letter">Letter</SelectItem></SelectContent>
                                </Select></div>
                            <div><Label className="text-xs">{isAr ? 'الاتجاه' : 'Orient.'}</Label>
                                <Select value={form.orientation} onValueChange={v => update('orientation', v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="portrait">↕</SelectItem><SelectItem value="landscape">↔</SelectItem></SelectContent>
                                </Select></div>
                        </div>
                        <div className="space-y-2 pt-2 border-t">
                            {[
                                { key: 'include_qr', label_ar: 'QR Code', label_en: 'QR Code', icon: QrCode },
                                { key: 'include_header', label_ar: 'ترويسة', label_en: 'Header', icon: FileText },
                                { key: 'include_footer', label_ar: 'تذييل', label_en: 'Footer', icon: FileText },
                                { key: 'include_stamp', label_ar: 'ختم', label_en: 'Stamp', icon: Stamp },
                                { key: 'include_signature', label_ar: 'توقيع', label_en: 'Signature', icon: PenTool },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs"><item.icon className="w-3 h-3" />{isAr ? item.label_ar : item.label_en}</div>
                                    <Switch checked={(form as any)[item.key]} onCheckedChange={v => update(item.key, v)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Editor Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Editor Tabs */}
                        <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/5 shrink-0">
                            {[
                                { id: 'visual', label: isAr ? '🎨 مرئي' : '🎨 Visual', icon: LayoutTemplate },
                                { id: 'preview', label: isAr ? '👁 معاينة' : '👁 Preview', icon: Eye },
                                ...(showCodeTabs ? [
                                    { id: 'html', label: 'HTML', icon: FileCode },
                                    { id: 'css', label: 'CSS', icon: FileCode },
                                ] : []),
                            ].map(tab => (
                                <Button key={tab.id} size="sm" variant={editorTab === tab.id ? 'default' : 'ghost'} className="h-7 text-xs gap-1"
                                    onClick={() => setEditorTab(tab.id as any)}>
                                    {tab.label}
                                </Button>
                            ))}
                            <div className="ms-auto">
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-muted-foreground" onClick={() => setShowCodeTabs(!showCodeTabs)}>
                                    <FileCode className="w-3 h-3" />
                                    {showCodeTabs ? (isAr ? 'إخفاء الكود' : 'Hide Code') : (isAr ? 'عرض الكود' : 'Show Code')}
                                </Button>
                            </div>
                            {editorTab === 'preview' && (
                                <div className="flex items-center gap-2">
                                    <Languages className="w-3.5 h-3.5" />
                                    <Select value={previewLang} onValueChange={v => { setPreviewLang(v); }}>
                                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ar">العربية</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="uk">Українська</SelectItem>
                                            <SelectItem value="tr">Türkçe</SelectItem>
                                            <SelectItem value="de">Deutsch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 overflow-hidden">
                            {/* Visual Editor Tab */}
                            {editorTab === 'visual' && (
                                <VisualTemplateEditor
                                    initialHtml={form.template_html}
                                    initialCss={form.template_css || ''}
                                    docType={form.doc_type}
                                    isAr={isAr}
                                    onHtmlChange={(html) => update('template_html', html)}
                                    onCssChange={(css) => update('template_css', css)}
                                />
                            )}

                            {/* HTML Tab */}
                            {editorTab === 'html' && (
                                <textarea
                                    ref={htmlRef}
                                    value={form.template_html}
                                    onChange={e => update('template_html', e.target.value)}
                                    className="w-full h-full p-4 font-mono text-sm bg-gray-950 text-green-400 resize-none focus:outline-none"
                                    dir="ltr"
                                    spellCheck={false}
                                    placeholder="<div class='page'>...</div>"
                                />
                            )}

                            {/* CSS Tab */}
                            {editorTab === 'css' && (
                                <textarea
                                    value={form.template_css || ''}
                                    onChange={e => update('template_css', e.target.value)}
                                    className="w-full h-full p-4 font-mono text-sm bg-gray-950 text-blue-400 resize-none focus:outline-none"
                                    dir="ltr"
                                    spellCheck={false}
                                    placeholder="body { font-family: {{font_family}}; direction: {{direction}}; }"
                                />
                            )}

                            {/* Variables Tab */}
                            {editorTab === 'variables' && (
                                <div className="h-full flex flex-col p-3 overflow-hidden">
                                    {/* Info banner */}
                                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-3 text-sm border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-medium text-blue-700 dark:text-blue-300">
                                                    {isAr ? 'كيف تعمل المتغيرات؟' : 'How do variables work?'}
                                                </p>
                                                <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                                                    {isAr
                                                        ? 'انقر على أي متغير لإدراجه مباشرة في محرر HTML. المتغيرات تُستبدل تلقائياً ببيانات حقيقية عند الطباعة. المتغيرات المسبوقة بـ {{ }} تتغير تلقائياً حسب دولة ولغة الشركة.'
                                                        : 'Click any variable to insert it into the HTML editor. Variables are auto-replaced with real data at print time. Variables wrapped in {{ }} auto-adapt based on your company country and language.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Search + Filter */}
                                    <div className="flex gap-2 mb-3 shrink-0">
                                        <div className="relative flex-1">
                                            <Search className="absolute start-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                                            <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={varSearch} onChange={e => setVarSearch(e.target.value)}
                                                className="h-8 ps-8 text-sm" />
                                        </div>
                                        <Select value={varGroup} onValueChange={setVarGroup}>
                                            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                                                {VARIABLE_GROUPS.map(g => (
                                                    <SelectItem key={g.id} value={g.id}>{isAr ? g.label_ar : g.label_en}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Variables List */}
                                    <ScrollArea className="flex-1">
                                        <div className="space-y-1.5">
                                            {filteredVars.map(v => (
                                                <div key={v.key}
                                                    className="flex items-start gap-3 p-2.5 rounded-md border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
                                                    onClick={() => insertVariable(v.key)}
                                                >
                                                    <code className="bg-gray-100 dark:bg-gray-800 text-primary font-mono text-xs px-2 py-1 rounded shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        {v.key}
                                                    </code>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm">{isAr ? v.label_ar : v.label_en}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{isAr ? v.description_ar : v.description_en}</p>
                                                        <p className="text-xs text-blue-500 mt-0.5">{isAr ? 'مثال:' : 'Example:'} {v.example}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredVars.length === 0 && (
                                                <p className="text-center text-muted-foreground py-8 text-sm">{isAr ? 'لا نتائج' : 'No results'}</p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}

                            {/* Preview Tab */}
                            {editorTab === 'preview' && (
                                <div className="h-full bg-gray-100 dark:bg-gray-900 flex items-start justify-center overflow-auto p-4">
                                    <div className="bg-white shadow-lg rounded-sm" style={{ width: '210mm', minHeight: '297mm' }}>
                                        <iframe srcDoc={previewHtml} className="w-full" style={{ minHeight: '297mm', border: 'none' }} title="preview" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
