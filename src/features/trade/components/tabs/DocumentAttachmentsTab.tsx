/**
 * 📎 DocumentAttachmentsTab — تبويب المرفقات الموحد
 * 
 * يدعم:
 * - رفع ملفات PDF + صور (JPG, PNG, WebP)
 * - حجم الملف الواحد: حد أقصى 5 ميغابايت
 * - إجمالي المرفقات لكل مستند: حد أقصى 20 ميغابايت / 10 ملفات
 * - Drag & Drop أو اختيار ملف
 * - استعراض مباشر (PDF iframe + Image بتكبير/تصغير)
 * - 3 أوضاع عرض: جدول + بطاقات + معرض
 * - حقول إضافية: اسم المستند + رقم + تاريخ + ملاحظات + تصنيف
 * 
 * يستخدم: attachmentService (unified)
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
    Paperclip, Upload, FileText, Trash2, Download, Eye,
    AlertTriangle, X, Loader2, Image as ImageIcon, ZoomIn, ZoomOut,
    FileSignature, Receipt, Ship, Award, FolderOpen, Shield,
    LayoutGrid, LayoutList, GalleryHorizontalEnd, Plus,
    ChevronLeft, ChevronRight, RotateCcw, Calendar, Hash, StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    attachmentService,
    formatFileSize,
    resolveEntityType,
    type Attachment,
    type AttachmentEntityType,
    type AttachmentCategory,
    type EntityQuotaStatus
} from '@/services/attachmentService';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const { MAX_FILE_SIZE, MAX_FILES_PER_ENTITY, MAX_TOTAL_SIZE_PER_ENTITY, ALLOWED_EXTENSIONS } = attachmentService.constants;

// Attachment categories with icons & colors
const ATTACHMENT_CATEGORIES = [
    { value: 'contract', labelAr: 'عقد', labelEn: 'Contract', icon: FileSignature, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
    { value: 'signature', labelAr: 'توقيع', labelEn: 'Signature', icon: FileSignature, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
    { value: 'original_invoice', labelAr: 'فاتورة أصلية', labelEn: 'Original Invoice', icon: Receipt, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { value: 'bill_of_lading', labelAr: 'بوليصة شحن', labelEn: 'Bill of Lading', icon: Ship, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40' },
    { value: 'certificate', labelAr: 'شهادة منشأ', labelEn: 'Certificate of Origin', icon: Award, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    { value: 'receipt', labelAr: 'إيصال', labelEn: 'Receipt', icon: Receipt, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
    { value: 'insurance', labelAr: 'تأمين', labelEn: 'Insurance', icon: Shield, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
    { value: 'customs', labelAr: 'جمارك', labelEn: 'Customs', icon: FolderOpen, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40' },
    { value: 'bank_statement', labelAr: 'كشف حساب', labelEn: 'Bank Statement', icon: FileText, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: FolderOpen, color: 'text-gray-600 bg-gray-50 dark:bg-gray-800/40' },
];

// resolveEntityType is now imported from attachmentService

type ViewMode = 'list' | 'cards' | 'gallery';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface DocumentAttachmentsTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    docType: string;
    tradeMode?: 'sales' | 'purchase';
    onChange?: (updates: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export const DocumentAttachmentsTab: React.FC<DocumentAttachmentsTabProps> = ({
    data,
    mode,
    docType,
    tradeMode,
    onChange,
}) => {
    const { isRTL } = useLanguage();
    const { company, companyId } = useCompany();
    const { user } = useAuth();
    const tenantId = company?.tenant_id || companyId;
    const isEditable = mode === 'create' || mode === 'edit';
    const entityType = resolveEntityType(docType, tradeMode);
    const entityId = data?.id;

    // ─── State ───
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [quota, setQuota] = useState<EntityQuotaStatus | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Upload dialog
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploadForm, setUploadForm] = useState({
        category: 'other' as string,
        documentTitle: '',
        documentNumber: '',
        documentDate: '',
        notes: '',
    });

    // Preview
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(100);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Load attachments ───
    useEffect(() => {
        if (!entityId || !tenantId) {
            setLoadingFiles(false);
            return;
        }
        loadAll();
    }, [entityId, tenantId]);

    const loadAll = async () => {
        setLoadingFiles(true);
        try {
            const [files, quotaStatus] = await Promise.all([
                attachmentService.getByEntity(entityType, entityId),
                attachmentService.getEntityQuota(entityType, entityId),
            ]);
            setAttachments(files);
            setQuota(quotaStatus);
            // Notify parent about attachment count change (for tab badge)
            onChange?.({ attachments_count: files.length });
        } catch (err) {
            console.error('Failed to load attachments:', err);
        }
        setLoadingFiles(false);
    };

    // ─── Computed ───
    const totalSize = useMemo(() => attachments.reduce((s, a) => s + (a.file_size || 0), 0), [attachments]);
    const usagePercent = (totalSize / MAX_TOTAL_SIZE_PER_ENTITY) * 100;
    const remainingSize = MAX_TOTAL_SIZE_PER_ENTITY - totalSize;

    // ─── File Selection Handler ───
    const handleFileSelected = useCallback((file: File) => {
        if (!quota) return;
        const validation = attachmentService.validateFile(file, quota);
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }
        setPendingFile(file);
        setUploadForm({ category: 'other', documentTitle: '', documentNumber: '', documentDate: '', notes: '' });
        setShowUploadDialog(true);
    }, [quota]);

    // ─── Upload ───
    const handleUpload = async () => {
        if (!pendingFile || !tenantId || !entityId) return;

        setShowUploadDialog(false);
        setUploading(true);
        setUploadProgress(20);

        try {
            setUploadProgress(40);

            const result = await attachmentService.upload({
                file: pendingFile,
                entityType,
                entityId,
                tenantId,
                category: uploadForm.category as AttachmentCategory,
                documentTitle: uploadForm.documentTitle || undefined,
                documentNumber: uploadForm.documentNumber || undefined,
                documentDate: uploadForm.documentDate || undefined,
                notes: uploadForm.notes || undefined,
            });

            setUploadProgress(90);

            if (!result.success) {
                toast.error(result.error || (isRTL ? 'فشل في رفع الملف' : 'Failed to upload'));
                return;
            }

            toast.success(isRTL ? `تم رفع "${pendingFile.name}" بنجاح` : `"${pendingFile.name}" uploaded`);
            await loadAll();

            // ─── تسجيل النشاط ───
            try {
                const catLabel = ATTACHMENT_CATEGORIES.find(c => c.value === uploadForm.category);
                await supabase.from('document_activity').insert({
                    tenant_id: tenantId,
                    entity_type: entityType,
                    entity_id: entityId,
                    activity_type: 'event',
                    content: isRTL
                        ? `تم رفع مرفق: ${uploadForm.documentTitle || pendingFile.name} (${catLabel?.labelAr || uploadForm.category})`
                        : `Document uploaded: ${uploadForm.documentTitle || pendingFile.name} (${catLabel?.labelEn || uploadForm.category})`,
                    event_code: 'document_uploaded',
                    metadata: {
                        file_name: pendingFile.name,
                        file_size: pendingFile.size,
                        file_type: pendingFile.type.startsWith('image/') ? 'image' : 'pdf',
                        category: uploadForm.category,
                        category_label: catLabel?.labelAr || uploadForm.category,
                        document_title: uploadForm.documentTitle || null,
                        document_number: uploadForm.documentNumber || null,
                    },
                    created_by: user?.id,
                });
            } catch { /* silent — لا نوقف العملية الأساسية */ }
        } catch (err: any) {
            toast.error(isRTL ? 'خطأ أثناء الرفع' : 'Upload error');
            console.error('Upload error:', err);
        } finally {
            setUploadProgress(100);
            setTimeout(() => { setUploading(false); setUploadProgress(0); setPendingFile(null); }, 500);
        }
    };

    // ─── Delete ───
    const handleDelete = async (att: Attachment) => {
        if (!confirm(isRTL ? 'هل تريد حذف هذا المرفق؟' : 'Delete this attachment?')) return;

        const result = await attachmentService.delete(att.id);
        if (result.success) {
            toast.success(isRTL ? 'تم حذف المرفق' : 'Attachment deleted');
            await loadAll();

            // ─── تسجيل النشاط ───
            try {
                const catLabel = ATTACHMENT_CATEGORIES.find(c => c.value === (att.category || 'other'));
                await supabase.from('document_activity').insert({
                    tenant_id: tenantId,
                    entity_type: entityType,
                    entity_id: entityId,
                    activity_type: 'event',
                    content: isRTL
                        ? `تم حذف مرفق: ${att.document_title || att.original_name} (${catLabel?.labelAr || att.category})`
                        : `Document deleted: ${att.document_title || att.original_name} (${catLabel?.labelEn || att.category})`,
                    event_code: 'document_deleted',
                    metadata: {
                        file_name: att.original_name,
                        file_size: att.file_size,
                        file_type: att.file_type || (att.mime_type?.startsWith('image/') ? 'image' : 'pdf'),
                        category: att.category,
                        category_label: catLabel?.labelAr || att.category,
                        document_title: att.document_title || null,
                    },
                    created_by: user?.id,
                });
            } catch { /* silent */ }
        } else {
            toast.error(result.error || (isRTL ? 'فشل الحذف' : 'Delete failed'));
        }
    };

    // ─── Download ───
    const handleDownload = async (att: Attachment) => {
        const result = await attachmentService.download(att.id);
        if (!result) {
            toast.error(isRTL ? 'فشل التحميل' : 'Download failed');
            return;
        }
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Preview ───
    const openPreview = async (att: Attachment) => {
        const url = await attachmentService.getSignedUrl(att.id);
        if (!url) {
            toast.error(isRTL ? 'فشل فتح المعاينة' : 'Preview failed');
            return;
        }
        setPreviewAttachment(att);
        setPreviewUrl(url);
        setZoomLevel(100);
    };

    const closePreview = () => {
        setPreviewAttachment(null);
        setPreviewUrl(null);
        setZoomLevel(100);
    };

    // Preview navigation
    const previewIndex = previewAttachment ? attachments.findIndex(a => a.id === previewAttachment.id) : -1;
    const canPrevious = previewIndex > 0;
    const canNext = previewIndex < attachments.length - 1;

    const navigatePreview = async (direction: 'prev' | 'next') => {
        const newIndex = direction === 'prev' ? previewIndex - 1 : previewIndex + 1;
        if (newIndex >= 0 && newIndex < attachments.length) {
            openPreview(attachments[newIndex]);
        }
    };

    // ─── Drag & Drop ───
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleFileSelected(files[0]);
    }, [handleFileSelected]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) handleFileSelected(files[0]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [handleFileSelected]);

    // ─── Helpers ───
    const getCategoryInfo = (category: string) => {
        return ATTACHMENT_CATEGORIES.find(c => c.value === category) || ATTACHMENT_CATEGORIES[9];
    };

    const isImage = (att: Attachment) => att.file_type === 'image' || att.mime_type?.startsWith('image/');

    // ═══════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="space-y-4 p-1">

            {/* ═══ Usage Summary ═══ */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            {isRTL ? 'المساحة المستخدمة' : 'Storage Used'}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                            {formatFileSize(totalSize)} / {formatFileSize(MAX_TOTAL_SIZE_PER_ENTITY)}
                        </span>
                    </div>
                    <Progress
                        value={usagePercent}
                        className={cn(
                            "h-2",
                            usagePercent > 80 ? "[&>div]:bg-red-500" :
                                usagePercent > 50 ? "[&>div]:bg-amber-500" :
                                    "[&>div]:bg-emerald-500"
                        )}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">
                            {attachments.length} / {MAX_FILES_PER_ENTITY} {isRTL ? 'مرفقات' : 'files'}
                        </span>
                        <span className="text-xs text-gray-400">
                            {isRTL ? `متبقي: ${formatFileSize(remainingSize)}` : `Remaining: ${formatFileSize(remainingSize)}`}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Upload Zone ═══ */}
            {isEditable && (
                <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
                    <CardContent className="pt-4">
                        <div
                            className={cn(
                                "relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer",
                                "flex flex-col items-center justify-center text-center",
                                dragOver
                                    ? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]"
                                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/30",
                                uploading && "pointer-events-none opacity-60"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleFileInputChange}
                            />

                            {uploading ? (
                                <>
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                    <p className="text-sm text-blue-600 font-medium">
                                        {isRTL ? 'جاري الرفع...' : 'Uploading...'}
                                    </p>
                                    <Progress value={uploadProgress} className="w-48 mt-2 h-1.5 [&>div]:bg-blue-500" />
                                </>
                            ) : (
                                <>
                                    <div className={cn(
                                        "p-3 rounded-full mb-3 transition-colors",
                                        dragOver ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-gray-800"
                                    )}>
                                        <Upload className={cn("w-6 h-6", dragOver ? "text-blue-500" : "text-gray-400")} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {dragOver
                                            ? (isRTL ? 'أفلت الملف هنا' : 'Drop file here')
                                            : (isRTL ? 'اسحب ملف هنا أو انقر للاختيار' : 'Drag a file here or click to browse')
                                        }
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        {isRTL
                                            ? `PDF, JPG, PNG, WebP • حد أقصى ${formatFileSize(MAX_FILE_SIZE)} للملف`
                                            : `PDF, JPG, PNG, WebP • Max ${formatFileSize(MAX_FILE_SIZE)} per file`
                                        }
                                    </p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ Files Header + View Toggle ═══ */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <FileText className="w-4 h-4" />
                            {isRTL ? 'الملفات المرفقة' : 'Attached Files'}
                            {attachments.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
                            )}
                        </CardTitle>

                        {attachments.length > 0 && (
                            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                                <Button
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                    size="sm" className="h-7 w-7 p-0"
                                    onClick={() => setViewMode('list')}
                                >
                                    <LayoutList className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                                    size="sm" className="h-7 w-7 p-0"
                                    onClick={() => setViewMode('cards')}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
                                    size="sm" className="h-7 w-7 p-0"
                                    onClick={() => setViewMode('gallery')}
                                >
                                    <GalleryHorizontalEnd className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="pt-1">
                    {loadingFiles ? (
                        <div className="flex items-center justify-center py-8 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
                        </div>
                    ) : attachments.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">{isRTL ? 'لا توجد مرفقات' : 'No attachments'}</p>
                            {isEditable && (
                                <p className="text-xs mt-1 text-gray-300">
                                    {isRTL ? 'ارفق عقود، فواتير، بواليص شحن، صور...' : 'Attach contracts, invoices, bills of lading, images...'}
                                </p>
                            )}
                        </div>
                    ) : viewMode === 'list' ? (
                        /* ══════ LIST VIEW ══════ */
                        <div className="space-y-2">
                            {attachments.map((att) => {
                                const catInfo = getCategoryInfo(att.category || 'other');
                                const CatIcon = catInfo.icon;
                                const isImg = isImage(att);

                                return (
                                    <div
                                        key={att.id}
                                        className="group flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        {/* Icon */}
                                        <div className={cn("p-2 rounded-lg shrink-0", catInfo.color)}>
                                            {isImg ? <ImageIcon className="w-4 h-4" /> : <CatIcon className="w-4 h-4" />}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                {att.document_title || att.original_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <Badge variant="outline" className="text-[10px] h-4">
                                                    {isRTL ? catInfo.labelAr : catInfo.labelEn}
                                                </Badge>
                                                {att.document_number && (
                                                    <span className="text-[10px] text-blue-500 font-mono">#{att.document_number}</span>
                                                )}
                                                <span className="text-[10px] text-gray-400 font-mono">{formatFileSize(att.file_size)}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(att.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500"
                                                onClick={(e) => { e.stopPropagation(); openPreview(att); }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-500"
                                                onClick={(e) => { e.stopPropagation(); handleDownload(att); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            {isEditable && (
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : viewMode === 'cards' ? (
                        /* ══════ CARDS VIEW ══════ */
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {attachments.map((att) => {
                                const catInfo = getCategoryInfo(att.category || 'other');
                                const CatIcon = catInfo.icon;
                                const isImg = isImage(att);

                                return (
                                    <div
                                        key={att.id}
                                        className="group relative border rounded-xl p-3 bg-white dark:bg-gray-900 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => openPreview(att)}
                                    >
                                        {/* File Type Icon */}
                                        <div className={cn("w-full h-20 rounded-lg flex items-center justify-center mb-2", catInfo.color)}>
                                            {isImg ? <ImageIcon className="w-8 h-8 opacity-60" /> : <FileText className="w-8 h-8 opacity-60" />}
                                        </div>

                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {att.document_title || att.original_name}
                                        </p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Badge variant="outline" className="text-[9px] h-3.5">
                                                {isRTL ? catInfo.labelAr : catInfo.labelEn}
                                            </Badge>
                                            <span className="text-[9px] text-gray-400 font-mono">{formatFileSize(att.file_size)}</span>
                                        </div>

                                        {/* Hover actions */}
                                        <div className="absolute top-2 end-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="secondary" size="sm" className="h-6 w-6 p-0 rounded-full shadow-sm"
                                                onClick={(e) => { e.stopPropagation(); handleDownload(att); }}>
                                                <Download className="w-3 h-3" />
                                            </Button>
                                            {isEditable && (
                                                <Button variant="destructive" size="sm" className="h-6 w-6 p-0 rounded-full shadow-sm"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ══════ GALLERY VIEW ══════ */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {attachments.map((att) => {
                                const isImg = isImage(att);
                                return (
                                    <div
                                        key={att.id}
                                        className="group relative aspect-square rounded-xl overflow-hidden border cursor-pointer bg-gray-50 dark:bg-gray-900 hover:ring-2 hover:ring-blue-400 transition-all"
                                        onClick={() => openPreview(att)}
                                    >
                                        <div className="w-full h-full flex items-center justify-center">
                                            {isImg ? (
                                                <ImageIcon className="w-12 h-12 text-gray-300" />
                                            ) : (
                                                <FileText className="w-12 h-12 text-red-300" />
                                            )}
                                        </div>

                                        {/* Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                            <p className="text-[10px] text-white truncate font-medium">
                                                {att.document_title || att.original_name}
                                            </p>
                                            <p className="text-[9px] text-white/70">{formatFileSize(att.file_size)}</p>
                                        </div>

                                        {/* Hover actions */}
                                        <div className="absolute top-1.5 end-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="secondary" size="sm" className="h-5 w-5 p-0 rounded-full"
                                                onClick={(e) => { e.stopPropagation(); handleDownload(att); }}>
                                                <Download className="w-2.5 h-2.5" />
                                            </Button>
                                            {isEditable && (
                                                <Button variant="destructive" size="sm" className="h-5 w-5 p-0 rounded-full"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}>
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Upload Dialog ═══ */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            {isRTL ? 'رفع مرفق جديد' : 'Upload Attachment'}
                        </DialogTitle>
                    </DialogHeader>

                    {pendingFile && (
                        <div className="space-y-4">
                            {/* File Preview */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                {pendingFile.type.startsWith('image/')
                                    ? <ImageIcon className="w-8 h-8 text-blue-500 shrink-0" />
                                    : <FileText className="w-8 h-8 text-red-500 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                                    <p className="text-xs text-gray-400">{formatFileSize(pendingFile.size)}</p>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <Label className="text-xs mb-1.5 block">{isRTL ? 'التصنيف' : 'Category'}</Label>
                                <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ATTACHMENT_CATEGORIES.map(cat => {
                                            const Icon = cat.icon;
                                            return (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    <span className="flex items-center gap-2">
                                                        <Icon className={cn("w-3.5 h-3.5", cat.color.split(' ')[0])} />
                                                        {isRTL ? cat.labelAr : cat.labelEn}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Document Title */}
                            <div>
                                <Label className="text-xs mb-1.5 flex items-center gap-1.5">
                                    <StickyNote className="w-3 h-3" />
                                    {isRTL ? 'اسم المستند' : 'Document Title'}
                                    <span className="text-gray-300 text-[10px]">({isRTL ? 'اختياري' : 'optional'})</span>
                                </Label>
                                <Input
                                    className="h-9 text-sm"
                                    placeholder={isRTL ? 'مثال: عقد توريد أقمشة...' : 'e.g. Fabric supply contract...'}
                                    value={uploadForm.documentTitle}
                                    onChange={e => setUploadForm(f => ({ ...f, documentTitle: e.target.value }))}
                                />
                            </div>

                            {/* Document Number + Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 flex items-center gap-1.5">
                                        <Hash className="w-3 h-3" />
                                        {isRTL ? 'رقم المستند' : 'Doc Number'}
                                    </Label>
                                    <Input
                                        className="h-9 text-sm"
                                        placeholder="C-2026-001"
                                        value={uploadForm.documentNumber}
                                        onChange={e => setUploadForm(f => ({ ...f, documentNumber: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" />
                                        {isRTL ? 'تاريخ المستند' : 'Doc Date'}
                                    </Label>
                                    <Input
                                        type="date"
                                        className="h-9 text-sm"
                                        value={uploadForm.documentDate}
                                        onChange={e => setUploadForm(f => ({ ...f, documentDate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <Label className="text-xs mb-1.5 block">
                                    {isRTL ? 'ملاحظات' : 'Notes'}
                                    <span className="text-gray-300 text-[10px] ms-1">({isRTL ? 'اختياري' : 'optional'})</span>
                                </Label>
                                <Textarea
                                    className="text-sm resize-none"
                                    rows={2}
                                    placeholder={isRTL ? 'ملاحظات إضافية...' : 'Additional notes...'}
                                    value={uploadForm.notes}
                                    onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleUpload} disabled={!pendingFile}>
                            <Upload className="w-4 h-4 me-1.5" />
                            {isRTL ? 'رفع المرفق' : 'Upload'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Document Viewer Modal ═══ */}
            {previewUrl && previewAttachment && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    onClick={closePreview}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') closePreview();
                        if (e.key === 'ArrowLeft') navigatePreview(isRTL ? 'next' : 'prev');
                        if (e.key === 'ArrowRight') navigatePreview(isRTL ? 'prev' : 'next');
                    }}
                    tabIndex={0}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b shrink-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex items-center gap-2">
                                    {isImage(previewAttachment)
                                        ? <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                        : <FileText className="w-4 h-4 text-red-500 shrink-0" />}
                                    {previewAttachment.document_title || previewAttachment.original_name}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {formatFileSize(previewAttachment.file_size)}
                                    {previewAttachment.document_number && ` • #${previewAttachment.document_number}`}
                                    {` • ${previewIndex + 1}/${attachments.length}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                    onClick={() => handleDownload(previewAttachment)}>
                                    <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                    onClick={closePreview}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-950">
                            {isImage(previewAttachment) ? (
                                <div className="w-full h-full flex items-center justify-center overflow-auto p-4 min-h-[60vh]">
                                    <img
                                        src={previewUrl}
                                        alt={previewAttachment.original_name}
                                        className="max-w-full max-h-full object-contain transition-transform duration-200"
                                        style={{ transform: `scale(${zoomLevel / 100})` }}
                                    />
                                </div>
                            ) : (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full min-h-[70vh] border-0"
                                    title="Document Preview"
                                />
                            )}
                        </div>

                        {/* Footer — Zoom + Navigation */}
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t shrink-0">
                            <Button variant="ghost" size="sm" disabled={!canPrevious}
                                onClick={() => navigatePreview('prev')}>
                                <ChevronLeft className="w-4 h-4 me-1" />
                                {isRTL ? 'التالي' : 'Previous'}
                            </Button>

                            {isImage(previewAttachment) && (
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => setZoomLevel(z => Math.max(25, z - 25))} disabled={zoomLevel <= 25}>
                                        <ZoomOut className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xs font-mono text-gray-500 w-10 text-center">{zoomLevel}%</span>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => setZoomLevel(z => Math.min(300, z + 25))} disabled={zoomLevel >= 300}>
                                        <ZoomIn className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => setZoomLevel(100)}>
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            )}

                            <Button variant="ghost" size="sm" disabled={!canNext}
                                onClick={() => navigatePreview('next')}>
                                {isRTL ? 'السابق' : 'Next'}
                                <ChevronRight className="w-4 h-4 ms-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Limits Info ═══ */}
            <div className="flex items-center gap-2 px-2 text-[11px] text-gray-400">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {isRTL
                    ? `PDF, JPG, PNG, WebP • حد أقصى ${formatFileSize(MAX_FILE_SIZE)} للملف • ${formatFileSize(MAX_TOTAL_SIZE_PER_ENTITY)} إجمالي • ${MAX_FILES_PER_ENTITY} ملفات لكل مستند`
                    : `PDF, JPG, PNG, WebP • Max ${formatFileSize(MAX_FILE_SIZE)}/file • ${formatFileSize(MAX_TOTAL_SIZE_PER_ENTITY)} total • ${MAX_FILES_PER_ENTITY} files/doc`
                }
            </div>
        </div>
    );
};
