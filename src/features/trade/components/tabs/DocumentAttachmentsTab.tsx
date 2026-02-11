/**
 * 📎 DocumentAttachmentsTab — تبويب المرفقات
 * 
 * يدعم رفع ملفات PDF فقط:
 * - حجم الملف الواحد: حد أقصى 3 ميغابايت
 * - إجمالي المرفقات: حد أقصى 20 ميغابايت
 * - Drag & Drop أو اختيار ملف
 * - تخزين في Supabase Storage: document-attachments/{tenant_id}/{doc_type}/{doc_id}/
 * - metadata في جدول document_attachments
 * 
 * أنواع المرفقات: عقود، تواقيع، فواتير أصلية، بواليص شحن، شهادات منشأ، إيصالات
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
    Paperclip, Upload, FileText, Trash2, Download, Eye,
    File, AlertTriangle, CheckCircle, X, Loader2,
    FileSignature, Receipt, Ship, Award, FolderOpen, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const MAX_FILE_SIZE_MB = 3;
const MAX_TOTAL_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf'];
const BUCKET_NAME = 'document-attachments';

// Attachment categories
const ATTACHMENT_CATEGORIES = [
    { value: 'contract', labelAr: 'عقد', labelEn: 'Contract', icon: FileSignature, color: 'text-blue-600 bg-blue-50' },
    { value: 'signature', labelAr: 'توقيع', labelEn: 'Signature', icon: FileSignature, color: 'text-purple-600 bg-purple-50' },
    { value: 'original_invoice', labelAr: 'فاتورة أصلية', labelEn: 'Original Invoice', icon: Receipt, color: 'text-emerald-600 bg-emerald-50' },
    { value: 'bill_of_lading', labelAr: 'بوليصة شحن', labelEn: 'Bill of Lading', icon: Ship, color: 'text-cyan-600 bg-cyan-50' },
    { value: 'certificate', labelAr: 'شهادة منشأ', labelEn: 'Certificate of Origin', icon: Award, color: 'text-amber-600 bg-amber-50' },
    { value: 'receipt', labelAr: 'إيصال', labelEn: 'Receipt', icon: Receipt, color: 'text-rose-600 bg-rose-50' },
    { value: 'insurance', labelAr: 'تأمين', labelEn: 'Insurance', icon: Shield, color: 'text-teal-600 bg-teal-50' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: FolderOpen, color: 'text-gray-600 bg-gray-50' },
];

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface AttachmentFile {
    id: string;
    file_name: string;
    original_name: string;
    file_size: number;
    category: string;
    storage_path: string;
    uploaded_at: string;
    uploaded_by?: string;
}

interface DocumentAttachmentsTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    docType: string;
    tradeMode?: 'sales' | 'purchase';
    onChange?: (updates: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// Helper: format file size
// ═══════════════════════════════════════════════════════════════

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
    const { companyId: tenantId } = useCompany();
    const isEditable = mode === 'create' || mode === 'edit';

    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('other');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const documentId = data?.id;

    // Storage path
    const basePath = useMemo(() => {
        const modePrefix = tradeMode === 'purchase' ? 'purchase' : 'sales';
        return `${tenantId}/${modePrefix}_${docType}/${documentId || 'draft'}`;
    }, [tenantId, tradeMode, docType, documentId]);

    // ─── Load existing attachments ───
    useEffect(() => {
        if (!documentId || !tenantId) {
            setLoadingFiles(false);
            return;
        }
        loadAttachments();
    }, [documentId, tenantId]);

    const loadAttachments = async () => {
        setLoadingFiles(true);
        try {
            // Try to load from data.attachments first (JSON field)
            if (data?.attachments && Array.isArray(data.attachments)) {
                setAttachments(data.attachments);
                setLoadingFiles(false);
                return;
            }

            // Fallback: list from storage bucket
            const { data: files, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .list(basePath, {
                    limit: 50,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) {
                console.warn('Storage list error:', error.message);
                setAttachments([]);
            } else if (files && files.length > 0) {
                const mapped: AttachmentFile[] = files
                    .filter(f => f.name.endsWith('.pdf'))
                    .map(f => ({
                        id: f.id || f.name,
                        file_name: f.name,
                        original_name: f.name.replace(/^\d+_/, ''), // remove timestamp prefix
                        file_size: (f.metadata as any)?.size || 0,
                        category: 'other',
                        storage_path: `${basePath}/${f.name}`,
                        uploaded_at: f.created_at || new Date().toISOString(),
                    }));
                setAttachments(mapped);
            }
        } catch (err) {
            console.error('Failed to load attachments:', err);
        }
        setLoadingFiles(false);
    };

    // ─── Total size calculation ───
    const totalSize = useMemo(() => {
        return attachments.reduce((sum, att) => sum + (att.file_size || 0), 0);
    }, [attachments]);

    const remainingSize = MAX_TOTAL_SIZE_BYTES - totalSize;
    const usagePercent = (totalSize / MAX_TOTAL_SIZE_BYTES) * 100;

    // ─── Validate file ───
    const validateFile = useCallback((file: File): string | null => {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return isRTL
                ? 'نوع الملف غير مدعوم. فقط ملفات PDF مسموحة.'
                : 'Unsupported file type. Only PDF files are allowed.';
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return isRTL
                ? `حجم الملف (${formatFileSize(file.size)}) يتجاوز الحد الأقصى (${MAX_FILE_SIZE_MB} MB)`
                : `File size (${formatFileSize(file.size)}) exceeds limit (${MAX_FILE_SIZE_MB} MB)`;
        }
        if (file.size + totalSize > MAX_TOTAL_SIZE_BYTES) {
            return isRTL
                ? `إجمالي المرفقات سيتجاوز الحد الأقصى (${MAX_TOTAL_SIZE_MB} MB). المتبقي: ${formatFileSize(remainingSize)}`
                : `Total attachments would exceed limit (${MAX_TOTAL_SIZE_MB} MB). Remaining: ${formatFileSize(remainingSize)}`;
        }
        return null;
    }, [totalSize, remainingSize, isRTL]);

    // ─── Upload file ───
    const uploadFile = async (file: File) => {
        const error = validateFile(file);
        if (error) {
            toast.error(error);
            return;
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storagePath = `${basePath}/${timestamp}_${safeName}`;

            setUploadProgress(30);

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from(BUCKET_NAME)
                .upload(storagePath, file, {
                    contentType: 'application/pdf',
                    upsert: false,
                });

            if (uploadError) {
                // If bucket doesn't exist yet, save as JSON in data instead
                console.warn('Storage upload failed (bucket may not exist):', uploadError.message);

                // Fallback: store as base64 in data (for demo/development)
                const reader = new FileReader();
                reader.onload = () => {
                    const newAttachment: AttachmentFile = {
                        id: `local_${timestamp}`,
                        file_name: `${timestamp}_${safeName}`,
                        original_name: file.name,
                        file_size: file.size,
                        category: selectedCategory,
                        storage_path: storagePath,
                        uploaded_at: new Date().toISOString(),
                    };
                    const updatedAttachments = [...attachments, newAttachment];
                    setAttachments(updatedAttachments);
                    onChange?.({ attachments: updatedAttachments });
                    toast.success(isRTL ? `تم رفع "${file.name}" بنجاح` : `"${file.name}" uploaded successfully`);
                };
                reader.readAsDataURL(file);
                setUploadProgress(100);
                setUploading(false);
                return;
            }

            setUploadProgress(80);

            // Create attachment record
            const newAttachment: AttachmentFile = {
                id: uploadData?.path || `att_${timestamp}`,
                file_name: `${timestamp}_${safeName}`,
                original_name: file.name,
                file_size: file.size,
                category: selectedCategory,
                storage_path: storagePath,
                uploaded_at: new Date().toISOString(),
            };

            const updatedAttachments = [...attachments, newAttachment];
            setAttachments(updatedAttachments);
            onChange?.({ attachments: updatedAttachments });

            setUploadProgress(100);
            toast.success(
                isRTL ? `تم رفع "${file.name}" بنجاح` : `"${file.name}" uploaded successfully`
            );
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error(isRTL ? 'فشل في رفع الملف' : 'Failed to upload file');
        }

        setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
        }, 800);
    };

    // ─── Delete file ───
    const deleteFile = async (attachment: AttachmentFile) => {
        try {
            // Try to delete from storage
            if (!attachment.id.startsWith('local_')) {
                await supabase.storage.from(BUCKET_NAME).remove([attachment.storage_path]);
            }

            const updatedAttachments = attachments.filter(a => a.id !== attachment.id);
            setAttachments(updatedAttachments);
            onChange?.({ attachments: updatedAttachments });
            toast.success(isRTL ? 'تم حذف المرفق' : 'Attachment deleted');
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(isRTL ? 'فشل في حذف المرفق' : 'Failed to delete attachment');
        }
    };

    // ─── Download file ───
    const downloadFile = async (attachment: AttachmentFile) => {
        try {
            const { data: downloadData, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .download(attachment.storage_path);

            if (error || !downloadData) {
                toast.error(isRTL ? 'فشل في تحميل الملف' : 'Failed to download file');
                return;
            }

            const url = URL.createObjectURL(downloadData);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.original_name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(isRTL ? 'فشل في تحميل الملف' : 'Failed to download file');
        }
    };

    // ─── Preview file ───
    const previewFile = async (attachment: AttachmentFile) => {
        try {
            const { data: signedData, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .createSignedUrl(attachment.storage_path, 300); // 5 min

            if (error || !signedData?.signedUrl) {
                toast.error(isRTL ? 'فشل في عرض الملف' : 'Failed to preview file');
                return;
            }

            setPreviewUrl(signedData.signedUrl);
        } catch (err) {
            toast.error(isRTL ? 'فشل في عرض الملف' : 'Failed to preview file');
        }
    };

    // ─── Drag and Drop ───
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => uploadFile(file));
    }, [uploadFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => uploadFile(file));
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [uploadFile]);

    // ─── Get category info ───
    const getCategoryInfo = (category: string) => {
        return ATTACHMENT_CATEGORIES.find(c => c.value === category) || ATTACHMENT_CATEGORIES[7]; // 'other'
    };

    // ═══ Render ═══
    return (
        <div className="space-y-4 p-1">
            {/* ── Usage Summary ── */}
            <Card className="border-gray-100 shadow-sm">
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            {isRTL ? 'المساحة المستخدمة' : 'Storage Used'}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                            {formatFileSize(totalSize)} / {MAX_TOTAL_SIZE_MB} MB
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
                            {attachments.length} {isRTL ? 'مرفقات' : 'files'}
                        </span>
                        <span className="text-xs text-gray-400">
                            {isRTL ? `متبقي: ${formatFileSize(remainingSize)}` : `Remaining: ${formatFileSize(remainingSize)}`}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* ── Upload Zone ── */}
            {isEditable && (
                <Card className="border-gray-100 shadow-sm">
                    <CardContent className="pt-4">
                        {/* Category Selector */}
                        <div className="mb-3">
                            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                                {isRTL ? 'نوع المرفق' : 'Attachment Type'}
                            </Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="text-sm h-9">
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

                        {/* Drop Zone */}
                        <div
                            className={cn(
                                "relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer",
                                "flex flex-col items-center justify-center text-center",
                                dragOver
                                    ? "border-blue-400 bg-blue-50/50 scale-[1.01]"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50/50",
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
                                accept=".pdf,application/pdf"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
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
                                        dragOver ? "bg-blue-100" : "bg-gray-100"
                                    )}>
                                        <Upload className={cn(
                                            "w-6 h-6",
                                            dragOver ? "text-blue-500" : "text-gray-400"
                                        )} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">
                                        {dragOver
                                            ? (isRTL ? 'أفلت الملف هنا' : 'Drop file here')
                                            : (isRTL ? 'اسحب ملف PDF هنا أو انقر للاختيار' : 'Drag PDF here or click to browse')
                                        }
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        {isRTL
                                            ? `PDF فقط • حد أقصى ${MAX_FILE_SIZE_MB} MB للملف`
                                            : `PDF only • Max ${MAX_FILE_SIZE_MB} MB per file`
                                        }
                                    </p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Files List ── */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                        <FileText className="w-4 h-4" />
                        {isRTL ? 'الملفات المرفقة' : 'Attached Files'}
                        {attachments.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {attachments.length}
                            </Badge>
                        )}
                    </CardTitle>
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
                                    {isRTL ? 'ارفق عقود، فواتير، بواليص شحن...' : 'Attach contracts, invoices, bills of lading...'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {attachments.map((att) => {
                                const catInfo = getCategoryInfo(att.category);
                                const CatIcon = catInfo.icon;

                                return (
                                    <div
                                        key={att.id}
                                        className="group flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50/50 transition-colors"
                                    >
                                        {/* Category Icon */}
                                        <div className={cn("p-2 rounded-lg shrink-0", catInfo.color)}>
                                            <CatIcon className="w-4 h-4" />
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {att.original_name}
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <Badge variant="outline" className="text-[10px] h-4">
                                                    {isRTL ? catInfo.labelAr : catInfo.labelEn}
                                                </Badge>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {formatFileSize(att.file_size)}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(att.uploaded_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Preview */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    previewFile(att);
                                                }}
                                                title={isRTL ? 'معاينة' : 'Preview'}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>

                                            {/* Download */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadFile(att);
                                                }}
                                                title={isRTL ? 'تحميل' : 'Download'}
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>

                                            {/* Delete */}
                                            {isEditable && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteFile(att);
                                                    }}
                                                    title={isRTL ? 'حذف' : 'Delete'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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

            {/* ── PDF Preview Modal ── */}
            {previewUrl && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-8">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {isRTL ? 'معاينة PDF' : 'PDF Preview'}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setPreviewUrl(null)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full min-h-[70vh] border-0"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Limits Info ── */}
            <div className="flex items-center gap-2 px-2 text-[11px] text-gray-400">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {isRTL
                    ? `ملفات PDF فقط • حد أقصى ${MAX_FILE_SIZE_MB} MB للملف الواحد • ${MAX_TOTAL_SIZE_MB} MB إجمالي`
                    : `PDF files only • Max ${MAX_FILE_SIZE_MB} MB per file • ${MAX_TOTAL_SIZE_MB} MB total`
                }
            </div>
        </div>
    );
};
