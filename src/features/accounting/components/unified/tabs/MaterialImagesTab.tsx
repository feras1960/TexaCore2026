/**
 * ════════════════════════════════════════════════════════════════
 * 📷 Material Images Tab V2 — Hierarchical Image Management
 * تبويب صور المادة - رفع هرمي (عامة / تصاميم / ألوان) + AI Wizard
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ImagePlus, Trash2, Star, Upload, X, Image as ImageIcon,
    ZoomIn, MoreVertical, Loader2, Wand2, ChevronDown, ChevronRight,
    Layers, Palette, FolderOpen, Eye, EyeOff, Sparkles,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import type { SheetMode } from '../types';
import { toast } from 'sonner';
import { AIImageWizard } from './AIImageWizard';

// ═══ Types ═══
interface MaterialImage {
    id: string;
    material_id: string;
    variant_id?: string | null;
    storage_path: string;
    url: string;
    thumbnail_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    alt_text_ar?: string | null;
    alt_text_en?: string | null;
    image_type?: string;
    sort_order: number;
    is_primary: boolean;
    is_published: boolean;
    source?: string;
    image_scope?: string; // 'general' | 'design' | 'color'
    variant_group_key?: string | null;
    is_ai_generated?: boolean;
    created_at?: string;
}

interface VariantGroupInfo {
    key: string; // axis_value_id
    name_ar: string;
    name_en: string;
    type: 'design' | 'color';
    hex_color?: string;
}

interface MaterialImagesTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
}

// ═══ Constants ═══
const BUCKET = 'material-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB raw (قبل الضغط)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
// أيضاً بعض المتصفحات تبلغ عن HEIC كـ '' (empty) أو 'application/octet-stream'
const HEIC_EXTENSIONS = ['.heic', '.heif'];

// ═══ معالج ضغط وتحويل الصور ═══
async function processImage(file: File): Promise<File> {
    const isHeic = HEIC_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)) ||
        file.type === 'image/heic' || file.type === 'image/heif';

    let processedBlob: Blob;

    if (isHeic) {
        // تحويل HEIC/HEIF إلى JPEG
        try {
            const heic2any = (await import('heic2any')).default;
            const result = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.85,
            });
            processedBlob = Array.isArray(result) ? result[0] : result;
        } catch (err) {
            console.error('HEIC conversion failed:', err);
            throw new Error('فشل تحويل صورة HEIC — جرّب تصديرها كـ JPEG من الجوال');
        }
    } else {
        processedBlob = file;
    }

    // ضغط الصورة — تصغير الأبعاد وتقليل الجودة
    try {
        const imageCompression = (await import('browser-image-compression')).default;
        const compressed = await imageCompression(processedBlob as File, {
            maxSizeMB: 0.5,           // حد أقصى 500KB بعد الضغط
            maxWidthOrHeight: 1920,    // أقصى أبعاد
            useWebWorker: true,
            fileType: 'image/webp',    // تحويل لـ WebP (أفضل ضغط)
            initialQuality: 0.82,
        });

        // تسمية الملف الجديد
        const newName = file.name.replace(/\.(heic|heif|png|jpeg|jpg|gif)$/i, '.webp');
        return new File([compressed], newName, { type: 'image/webp' });
    } catch (err) {
        console.warn('Compression fallback — using original:', err);
        // فالباك: إرجاع الملف المحوّل بدون ضغط إضافي
        const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        return new File([processedBlob], name, { type: processedBlob.type || 'image/jpeg' });
    }
}

export function MaterialImagesTab({ data, mode, onChange }: MaterialImagesTabProps) {
    const { language } = useLanguage();
    const { companyId, company } = useCompany();
    const tenantId = (company as any)?.tenant_id;
    const isReadOnly = mode === 'view';
    const materialId = data?.id;
    const materialCode = data?.code || 'unknown';
    const isVariantParent = data?.is_variant_parent || data?.has_variants;
    const parentMaterialId = data?.parent_material_id;
    const isAr = language === 'ar';

    const [images, setImages] = useState<MaterialImage[]>([]);
    const [inheritedImages, setInheritedImages] = useState<{ design: MaterialImage[]; parent: MaterialImage[] }>({ design: [], parent: [] });
    const [variantGroups, setVariantGroups] = useState<VariantGroupInfo[]>([]);
    const [selectedImage, setSelectedImage] = useState<MaterialImage | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));
    const [showInherited, setShowInherited] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadScope, setUploadScope] = useState<{ scope: string; groupKey?: string }>({ scope: 'general' });
    const [showAIWizard, setShowAIWizard] = useState(false);

    // ═══ جلب الصور ═══
    useEffect(() => {
        if (!materialId) { setIsLoading(false); return; }

        const fetchAll = async () => {
            setIsLoading(true);

            // 1. صور المادة الحالية
            const { data: imgs } = await supabase
                .from('material_images')
                .select('*')
                .eq('material_id', materialId)
                .order('sort_order', { ascending: true });

            if (imgs) setImages(imgs as MaterialImage[]);

            // 2. إذا كانت مادة أم → جلب مجموعات التصاميم والألوان من الفرعيات
            if (isVariantParent) {
                const { data: children } = await supabase
                    .from('fabric_materials')
                    .select('id, variant_data')
                    .eq('parent_material_id', materialId);

                if (children && children.length > 0) {
                    const groups: VariantGroupInfo[] = [];
                    const seenKeys = new Set<string>();

                    for (const child of children) {
                        if (!child.variant_data) continue;
                        const vd = child.variant_data as Record<string, any>;
                        const entries = Object.entries(vd).sort(([, a]: any, [, b]: any) =>
                            (a.sort_order || 0) - (b.sort_order || 0)
                        );

                        for (const [axisId, axisData] of entries) {
                            const key = axisData.value_id;
                            if (!key || seenKeys.has(key)) continue;
                            seenKeys.add(key);

                            groups.push({
                                key,
                                name_ar: axisData.value_name_ar || axisData.value_name_en || key,
                                name_en: axisData.value_name_en || axisData.value_name_ar || key,
                                type: (axisData.sort_order === 0) ? 'design' : 'color',
                                hex_color: axisData.color_hex || undefined,
                            });
                        }
                    }
                    setVariantGroups(groups);
                }
            }

            // 3. إذا كانت مادة فرعية → جلب صور الأم والتصميم (موروثة)
            if (parentMaterialId) {
                // صور الأم العامة
                const { data: parentImgs } = await supabase
                    .from('material_images')
                    .select('*')
                    .eq('material_id', parentMaterialId)
                    .eq('image_scope', 'general')
                    .order('sort_order', { ascending: true });

                // صور التصميم — من variant_data نستخرج design value_id
                let designImgs: MaterialImage[] = [];
                if (data?.variant_data) {
                    const vd = data.variant_data as Record<string, any>;
                    const entries = Object.entries(vd).sort(([, a]: any, [, b]: any) =>
                        (a.sort_order || 0) - (b.sort_order || 0)
                    );
                    // المحور الأول = التصميم
                    if (entries.length > 0) {
                        const designKey = entries[0][1]?.value_id;
                        if (designKey) {
                            const { data: dImgs } = await supabase
                                .from('material_images')
                                .select('*')
                                .eq('material_id', parentMaterialId)
                                .eq('image_scope', 'design')
                                .eq('variant_group_key', designKey)
                                .order('sort_order', { ascending: true });
                            if (dImgs) designImgs = dImgs as MaterialImage[];
                        }
                    }
                }

                setInheritedImages({
                    design: designImgs,
                    parent: (parentImgs || []) as MaterialImage[],
                });
            }

            setIsLoading(false);
        };

        fetchAll();
    }, [materialId, isVariantParent, parentMaterialId]);

    // ═══ تصنيف الصور حسب النطاق ═══
    const groupedImages = useMemo(() => {
        const general = images.filter(i => !i.image_scope || i.image_scope === 'general');
        const byDesign = new Map<string, MaterialImage[]>();
        const byColor = new Map<string, MaterialImage[]>();

        for (const img of images) {
            if (img.image_scope === 'design' && img.variant_group_key) {
                const arr = byDesign.get(img.variant_group_key) || [];
                arr.push(img);
                byDesign.set(img.variant_group_key, arr);
            }
            if (img.image_scope === 'color' && img.variant_group_key) {
                const arr = byColor.get(img.variant_group_key) || [];
                arr.push(img);
                byColor.set(img.variant_group_key, arr);
            }
        }

        return { general, byDesign, byColor };
    }, [images]);

    const designGroups = variantGroups.filter(g => g.type === 'design');
    const colorGroups = variantGroups.filter(g => g.type === 'color');

    // ═══ Toggle section ═══
    const toggleSection = (key: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    // ═══ رفع الملف ═══
    const uploadFile = useCallback(async (file: File, scope: string, groupKey?: string): Promise<MaterialImage | null> => {
        if (!materialId || !companyId || !tenantId) {
            toast.error(isAr ? 'بيانات المادة غير متوفرة' : 'Material data not available');
            return null;
        }

        // التحقق من النوع — HEIC أحياناً يأتي بـ type فارغ أو application/octet-stream
        const isHeicByExtension = HEIC_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
        const isAllowedType = ALLOWED_TYPES.includes(file.type) || isHeicByExtension || file.type === '' || file.type === 'application/octet-stream';

        if (!isAllowedType) {
            toast.error(isAr ? 'نوع الملف غير مدعوم' : 'Unsupported file type');
            return null;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error(isAr ? 'حجم الملف أكبر من 10 ميجابايت' : 'File size exceeds 10MB');
            return null;
        }

        // ═══ معالجة الصورة: تحويل HEIC + ضغط ═══
        let processedFile: File;
        try {
            const originalSize = file.size;
            processedFile = await processImage(file);
            const savedPercent = Math.round((1 - processedFile.size / originalSize) * 100);
            if (savedPercent > 10) {
                console.log(`📷 Image compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(processedFile.size / 1024).toFixed(0)}KB (${savedPercent}% saved)`);
            }
        } catch (err: any) {
            toast.error(err.message || (isAr ? 'فشل معالجة الصورة' : 'Image processing failed'));
            return null;
        }

        const timestamp = Date.now();
        const safeName = processedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${companyId}/${materialCode}/${scope}/${timestamp}_${safeName}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, processedFile, { cacheControl: '31536000', upsert: false, contentType: processedFile.type });

        if (uploadError) {
            toast.error(isAr ? `فشل الرفع: ${uploadError.message}` : `Upload failed: ${uploadError.message}`);
            return null;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        const isPrimary = images.filter(i => (i.image_scope || 'general') === scope).length === 0;

        const { data: inserted, error: dbError } = await supabase
            .from('material_images')
            .insert({
                tenant_id: tenantId,
                company_id: companyId,
                material_id: materialId,
                storage_path: storagePath,
                url: urlData.publicUrl,
                file_name: file.name, // الاسم الأصلي للعرض
                file_size: processedFile.size, // الحجم بعد الضغط
                mime_type: processedFile.type, // النوع بعد التحويل
                sort_order: images.length,
                is_primary: isPrimary,
                source: 'upload',
                image_scope: scope,
                variant_group_key: groupKey || null,
            })
            .select()
            .single();

        if (dbError) {
            toast.error(isAr ? 'فشل حفظ بيانات الصورة' : 'Failed to save image data');
            return null;
        }

        return inserted as MaterialImage;
    }, [materialId, companyId, tenantId, images.length, materialCode, isAr]);

    // ═══ معالجة رفع الملفات ═══
    const handleFileUpload = async (files: FileList | File[], scope?: string, groupKey?: string) => {
        if (!files || files.length === 0) return;
        const targetScope = scope || uploadScope.scope;
        const targetGroup = groupKey || uploadScope.groupKey;

        setIsUploading(true);
        setUploadProgress(0);
        const fileArray = Array.from(files);
        let completed = 0;
        const newImages: MaterialImage[] = [];

        for (const file of fileArray) {
            const img = await uploadFile(file, targetScope, targetGroup);
            if (img) newImages.push(img);
            completed++;
            setUploadProgress(Math.round((completed / fileArray.length) * 100));
        }

        if (newImages.length > 0) {
            setImages(prev => [...prev, ...newImages]);
            toast.success(isAr ? `تم رفع ${newImages.length} صورة` : `${newImages.length} image(s) uploaded`);
        }

        setIsUploading(false);
        setUploadProgress(0);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFileUpload(e.target.files);
            e.target.value = '';
        }
    };

    // ═══ Drag & Drop ═══
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e: React.DragEvent, scope?: string, groupKey?: string) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files, scope, groupKey);
    };

    // ═══ حذف صورة ═══
    const handleRemoveImage = async (imageId: string) => {
        const img = images.find(i => i.id === imageId);
        if (!img) return;
        await supabase.storage.from(BUCKET).remove([img.storage_path]);
        await supabase.from('material_images').delete().eq('id', imageId);

        const updated = images.filter(i => i.id !== imageId);
        if (img.is_primary && updated.length > 0) {
            await supabase.from('material_images').update({ is_primary: true }).eq('id', updated[0].id);
            updated[0] = { ...updated[0], is_primary: true };
        }
        setImages(updated);
        toast.success(isAr ? 'تم حذف الصورة' : 'Image deleted');
    };

    // ═══ تعيين صورة رئيسية ═══
    const handleSetPrimary = async (imageId: string) => {
        await supabase.from('material_images').update({ is_primary: false }).eq('material_id', materialId);
        await supabase.from('material_images').update({ is_primary: true }).eq('id', imageId);
        setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId })));
        toast.success(isAr ? 'تم تعيين الصورة الرئيسية' : 'Primary image set');
    };

    // ═══ عنصر شبكة الصور ═══
    const ImageGrid = ({ imgs, readonly = false, scope, groupKey }: {
        imgs: MaterialImage[];
        readonly?: boolean;
        scope?: string;
        groupKey?: string;
    }) => (
        <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {imgs.map((image, index) => (
                    <div
                        key={image.id}
                        className={cn(
                            "relative group rounded-xl overflow-hidden border-2 transition-all aspect-square",
                            "hover:shadow-lg cursor-pointer",
                            image.is_primary
                                ? "border-erp-primary ring-2 ring-erp-primary/20"
                                : readonly
                                    ? "border-gray-200/50 dark:border-gray-700/50 opacity-80"
                                    : "border-gray-200 dark:border-gray-700"
                        )}
                        onClick={() => setSelectedImage(image)}
                    >
                        <img
                            src={image.url}
                            alt={image.alt_text_ar || image.alt_text_en || `Image ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ddd"><rect width="100" height="100"/><text x="50" y="55" text-anchor="middle" font-size="14" fill="%23999">📷</text></svg>';
                            }}
                        />

                        {/* Badges */}
                        {image.is_primary && (
                            <div className="absolute top-1.5 start-1.5 bg-erp-primary text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                {isAr ? 'رئيسية' : 'Primary'}
                            </div>
                        )}
                        {image.is_ai_generated && (
                            <div className="absolute top-1.5 end-1.5 bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                AI
                            </div>
                        )}
                        {readonly && (
                            <div className="absolute top-1.5 end-1.5 bg-gray-500/80 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                                {isAr ? 'موروثة' : 'Inherited'}
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(image); }}>
                                <ZoomIn className="w-3.5 h-3.5" />
                            </Button>
                            {!isReadOnly && !readonly && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white h-7 w-7 p-0"
                                            onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {!image.is_primary && (
                                            <DropdownMenuItem onClick={() => handleSetPrimary(image.id)}>
                                                <Star className="w-4 h-4 me-2" />{isAr ? 'تعيين كرئيسية' : 'Set as Primary'}
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveImage(image.id)}>
                                            <Trash2 className="w-4 h-4 me-2" />{isAr ? 'حذف' : 'Delete'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                ))}

                {/* زر إضافة */}
                {!isReadOnly && !readonly && (
                    <div
                        className={cn(
                            "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all",
                            "hover:border-erp-primary/50 hover:bg-erp-primary/5 text-gray-400 hover:text-erp-primary"
                        )}
                        onClick={() => {
                            setUploadScope({ scope: scope || 'general', groupKey });
                            fileInputRef.current?.click();
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, scope, groupKey)}
                    >
                        <ImagePlus className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{isAr ? 'إضافة' : 'Add'}</span>
                    </div>
                )}
            </div>
        </div>
    );

    // ═══ عنصر قسم مع عنوان قابل للطي ═══
    const ImageSection = ({ title, icon, count, sectionKey, children, badge, color }: {
        title: string; icon: React.ReactNode; count: number; sectionKey: string;
        children: React.ReactNode; badge?: string; color?: string;
    }) => {
        const isOpen = expandedSections.has(sectionKey);
        return (
            <div className={cn("rounded-xl border transition-all", isOpen ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800")}>
                <button
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                    onClick={() => toggleSection(sectionKey)}
                >
                    <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        {icon}
                        <span className="font-medium text-sm">{title}</span>
                        {color && <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: color }} />}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
                    </div>
                    {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
                </button>
                {isOpen && <div className="px-3 pb-3">{children}</div>}
            </div>
        );
    };

    // ═══ Loading ═══
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-erp-primary" />
            </div>
        );
    }

    // ═══ Main Render ═══
    return (
        <div className="space-y-4 pb-6">
            {/* ═══ AI Wizard Banner ═══ */}
            {!isReadOnly && (
                <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                                <Wand2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {isAr ? '🤖 إنشاء صور احترافية بالذكاء الاصطناعي' : '🤖 AI Professional Image Generation'}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {isAr
                                        ? 'ارفع صورة واحدة وسيُنشئ الذكاء صور لكل التصاميم والألوان'
                                        : 'Upload one photo and AI will generate images for all designs and colors'}
                                </p>
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shrink-0"
                                onClick={() => setShowAIWizard(true)}
                            >
                                <Sparkles className="w-4 h-4 me-1.5" />
                                {isAr ? 'ابدأ الإنشاء' : 'Start'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ Hierarchical Image Sections (for parent materials) ═══ */}
            {isVariantParent ? (
                <div className="space-y-3">
                    {/* صور عامة */}
                    <ImageSection
                        title={isAr ? 'صور عامة' : 'General Images'}
                        icon={<ImageIcon className="w-4 h-4 text-blue-500" />}
                        count={groupedImages.general.length}
                        sectionKey="general"
                        badge={isAr ? 'تظهر في كل المتغيرات' : 'Shown in all variants'}
                    >
                        <ImageGrid imgs={groupedImages.general} scope="general" />
                    </ImageSection>

                    {/* تصاميم */}
                    {designGroups.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <Layers className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isAr ? 'التصاميم' : 'Designs'}
                                </span>
                            </div>
                            {designGroups.map(group => {
                                const designImages = groupedImages.byDesign.get(group.key) || [];
                                return (
                                    <ImageSection
                                        key={group.key}
                                        title={isAr ? group.name_ar : group.name_en}
                                        icon={<FolderOpen className="w-4 h-4 text-emerald-500" />}
                                        count={designImages.length}
                                        sectionKey={`design-${group.key}`}
                                    >
                                        <ImageGrid imgs={designImages} scope="design" groupKey={group.key} />
                                    </ImageSection>
                                );
                            })}
                        </div>
                    )}

                    {/* ألوان */}
                    {colorGroups.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <Palette className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isAr ? 'صور الألوان (override)' : 'Color Images (override)'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {colorGroups.map(group => {
                                    const colorImages = groupedImages.byColor.get(group.key) || [];
                                    const hasImages = colorImages.length > 0;
                                    return (
                                        <div
                                            key={group.key}
                                            className={cn(
                                                "rounded-lg border p-2 text-center transition-all",
                                                hasImages ? "border-gray-200" : "border-dashed border-gray-200/60"
                                            )}
                                        >
                                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                {group.hex_color && (
                                                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: group.hex_color }} />
                                                )}
                                                <span className="text-xs font-medium">{isAr ? group.name_ar : group.name_en}</span>
                                            </div>
                                            {hasImages ? (
                                                <div className="grid grid-cols-2 gap-1">
                                                    {colorImages.slice(0, 4).map(img => (
                                                        <img key={img.id} src={img.url} alt=""
                                                            className="w-full aspect-square rounded object-cover cursor-pointer hover:opacity-80"
                                                            onClick={() => setSelectedImage(img)} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div
                                                    className="aspect-square rounded border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-erp-primary/50 hover:bg-erp-primary/5 transition-all"
                                                    onClick={() => {
                                                        setUploadScope({ scope: 'color', groupKey: group.key });
                                                        fileInputRef.current?.click();
                                                    }}
                                                >
                                                    <span className="text-[10px] text-gray-400">
                                                        {isAr ? 'يرث' : 'Inherits'} ✓
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ═══ عرض بسيط للمواد العادية أو الفرعية ═══ */
                <div className="space-y-4">
                    {/* رفع يدوي */}
                    {!isReadOnly && (
                        <Card
                            className={cn(
                                "border-2 border-dashed transition-all duration-200",
                                isDragOver ? "border-erp-primary bg-erp-primary/5" : "border-erp-primary/30 hover:border-erp-primary/50"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e)}
                        >
                            <CardContent className="p-4">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-erp-primary/10 flex items-center justify-center">
                                        <Upload className={cn("w-6 h-6 text-erp-primary", isDragOver && "animate-bounce")} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium">{isAr ? 'رفع صور المادة' : 'Upload Material Images'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {isAr ? 'اسحب وأفلت أو انقر للاختيار' : 'Drag & drop or click to select'}
                                        </p>
                                    </div>
                                    {isUploading ? (
                                        <div className="w-full max-w-xs">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Loader2 className="w-4 h-4 animate-spin text-erp-primary" />
                                                <span className="text-xs text-erp-primary">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-200 rounded-full">
                                                <div className="h-full bg-erp-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="default" size="sm" onClick={() => fileInputRef.current?.click()}>
                                            <ImagePlus className="w-4 h-4 me-1.5" />{isAr ? 'اختيار صور' : 'Select Images'}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* صور المادة */}
                    {images.length > 0 ? (
                        <div>
                            <h3 className="text-sm font-semibold mb-3">
                                {isAr ? `صوري (${images.length})` : `My Images (${images.length})`}
                            </h3>
                            <ImageGrid imgs={images} />
                        </div>
                    ) : !isReadOnly ? null : (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <ImageIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">{isAr ? 'لا توجد صور' : 'No Images'}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* صور موروثة (للمواد الفرعية) */}
                    {parentMaterialId && (inheritedImages.design.length > 0 || inheritedImages.parent.length > 0) && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isAr ? 'صور موروثة' : 'Inherited Images'}
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                                    onClick={() => setShowInherited(!showInherited)}>
                                    {showInherited ? <EyeOff className="w-3 h-3 me-1" /> : <Eye className="w-3 h-3 me-1" />}
                                    {showInherited ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'عرض' : 'Show')}
                                </Button>
                            </div>
                            {showInherited && (
                                <>
                                    {inheritedImages.design.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                <FolderOpen className="w-3 h-3" />
                                                {isAr ? 'من التصميم' : 'From Design'}
                                                <Badge variant="secondary" className="text-[10px] px-1">{inheritedImages.design.length}</Badge>
                                            </p>
                                            <ImageGrid imgs={inheritedImages.design} readonly />
                                        </div>
                                    )}
                                    {inheritedImages.parent.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3" />
                                                {isAr ? 'من المادة الأم' : 'From Parent Material'}
                                                <Badge variant="secondary" className="text-[10px] px-1">{inheritedImages.parent.length}</Badge>
                                            </p>
                                            <ImageGrid imgs={inheritedImages.parent} readonly />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleInputChange}
                className="hidden"
            />

            {/* ═══ Lightbox ═══ */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh]">
                        <Button size="icon" variant="ghost"
                            className="absolute -top-12 end-0 text-white hover:bg-white/20"
                            onClick={() => setSelectedImage(null)}>
                            <X className="w-6 h-6" />
                        </Button>
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.alt_text_ar || selectedImage.alt_text_en || 'Material Image'}
                            className="w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
                            <div className="flex items-center justify-between text-white">
                                <div>
                                    {selectedImage.file_name && <p className="text-sm font-medium">{selectedImage.file_name}</p>}
                                    <p className="text-xs text-white/70">
                                        {selectedImage.file_size && `${(selectedImage.file_size / 1024).toFixed(0)} KB`}
                                        {selectedImage.is_ai_generated && ' • 🤖 AI Generated'}
                                        {selectedImage.image_scope && selectedImage.image_scope !== 'general' && 
                                            ` • ${selectedImage.image_scope === 'design' ? '📁 Design' : '🎨 Color'}`}
                                    </p>
                                </div>
                                {selectedImage.is_primary && (
                                    <div className="flex items-center gap-1 bg-erp-primary px-2 py-1 rounded-full text-xs">
                                        <Star className="w-3 h-3 fill-current" />{isAr ? 'رئيسية' : 'Primary'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ AI Image Wizard ═══ */}
            {showAIWizard && materialId && companyId && tenantId && (
                <AIImageWizard
                    materialId={materialId}
                    companyId={companyId}
                    tenantId={tenantId}
                    materialCode={materialCode}
                    materialInfo={{
                        name: data?.name_ar || data?.name_en || '',
                        design: data?.variant_data ? Object.values(data.variant_data as Record<string, any>).find((v: any) => v.sort_order === 0)?.value_name_en : undefined,
                        color: data?.variant_data ? Object.values(data.variant_data as Record<string, any>).find((v: any) => v.sort_order === 1)?.value_name_en : undefined,
                        composition: data?.composition || '',
                        category: data?.category || '',
                        code: materialCode,
                        fabric_type: data?.fabric_type || '',
                        usage_type: data?.usage_type || '',
                    }}
                    variantGroups={variantGroups}
                    onClose={() => setShowAIWizard(false)}
                    onImagesGenerated={(newImgs) => {
                        // Refresh images
                        const fetchRefresh = async () => {
                            const { data: imgs } = await supabase
                                .from('material_images')
                                .select('*')
                                .eq('material_id', materialId)
                                .order('sort_order', { ascending: true });
                            if (imgs) setImages(imgs as MaterialImage[]);
                        };
                        fetchRefresh();
                    }}
                />
            )}
        </div>
    );
}
