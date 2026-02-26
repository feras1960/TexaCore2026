/**
 * 📎 Attachment Service — خدمة المرفقات الموحدة
 * 
 * نقطة الدخول الوحيدة لجميع عمليات المرفقات في النظام.
 * 
 * Storage Providers:
 * - supabase: Supabase Storage (document-attachments bucket) — الافتراضي
 * - google_drive: Google Drive API — ربط ملفات من Drive
 * 
 * بيانات: جدول documents الموحد (بدون تكرار جداول)
 * 
 * الحدود:
 * - 5 MB حد أقصى للملف الواحد (Supabase)
 * - 10 ملفات حد أقصى لكل كيان (entity)
 * - 20 MB حد أقصى إجمالي لكل كيان
 * - أنواع مدعومة: PDF, JPG, PNG, WebP
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Storage Provider Type
// ═══════════════════════════════════════════════════════════════

/** 
 * مزود التخزين — يحدد أين يُخزّن الملف الفعلي
 * - supabase: Supabase Storage bucket (الافتراضي)
 * - google_drive: Google Drive — الملف في Drive ونحتفظ بالرابط + metadata
 */
export type StorageProvider = 'supabase' | 'google_drive';

/** معلومات ملف Google Drive */
export interface GoogleDriveFileInfo {
    driveFileId: string;
    webViewLink: string;
    webContentLink?: string;
    thumbnailLink?: string;
    mimeType: string;
    size: number;
    name: string;
}

// ═══════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════

/** أنواع الكيانات المدعومة للمرفقات */
export type AttachmentEntityType =
    | 'container'
    | 'purchase_invoice'
    | 'sales_invoice'
    | 'journal_entry'
    | 'supplier'
    | 'customer'
    | 'company'
    | 'purchase_order'
    | 'sales_order'
    | 'quotation';

/** تصنيفات المرفقات */
export type AttachmentCategory =
    | 'contract'
    | 'signature'
    | 'original_invoice'
    | 'bill_of_lading'
    | 'certificate'
    | 'receipt'
    | 'insurance'
    | 'customs'
    | 'bank_statement'
    | 'commercial_register'
    | 'tax_certificate'
    | 'license'
    | 'other';

/** أنواع الملفات المدعومة */
export type AttachmentFileType = 'pdf' | 'image';

/**
 * تحويل docType + tradeMode (من UnifiedAccountingSheet) لنوع الكيان
 * يُستخدم في خدمة المرفقات و DocumentAttachmentsTab و UnifiedAccountingSheet
 */
export function resolveEntityType(docType: string, tradeMode?: string): AttachmentEntityType {
    // UnifiedAccountingSheet docTypes: trade_invoice, trade_order, trade_container, etc.
    const tradeMap: Record<string, Record<string, AttachmentEntityType>> = {
        purchase: {
            trade_invoice: 'purchase_invoice',
            trade_order: 'purchase_order',
            trade_quotation: 'quotation',
            trade_request: 'purchase_order',
            trade_receipt: 'purchase_invoice',
            trade_return: 'purchase_invoice',
        },
        sales: {
            trade_invoice: 'sales_invoice',
            trade_order: 'sales_order',
            trade_quotation: 'quotation',
            trade_delivery: 'sales_order',
            trade_reservation: 'sales_order',
            trade_return: 'sales_invoice',
        },
    };

    // Try tradeMode-specific mapping first
    if (tradeMode && tradeMap[tradeMode]?.[docType]) {
        return tradeMap[tradeMode][docType];
    }

    // Direct mapping
    const directMap: Record<string, AttachmentEntityType> = {
        'trade_container': 'container',
        'container': 'container',
        'purchase_invoice': 'purchase_invoice',
        'sales_invoice': 'sales_invoice',
        'journal': 'journal_entry',
        'journal_entry': 'journal_entry',
        'purchase_order': 'purchase_order',
        'sales_order': 'sales_order',
        'quotation': 'quotation',
        'supplier': 'supplier',
        'customer': 'customer',
        'company': 'company',
        'goods_receipt': 'purchase_invoice',
    };

    return directMap[docType] || 'container';
}

/** سجل مرفق من قاعدة البيانات */
export interface Attachment {
    id: string;
    tenant_id: string;
    entity_type: string;
    entity_id: string;
    file_name: string;
    original_name: string;
    file_type: string;
    mime_type: string;
    file_size: number;
    storage_path: string;
    public_url?: string | null;
    description?: string | null;
    category?: string | null;
    tags?: string[];
    metadata?: Record<string, any>;
    document_title?: string | null;
    document_number?: string | null;
    document_date?: string | null;
    notes?: string | null;
    uploaded_by?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    /** مزود التخزين — supabase (افتراضي) أو google_drive */
    storage_provider?: StorageProvider;
}

/** معاملات رفع مرفق (Supabase Storage) */
export interface UploadAttachmentParams {
    file: File;
    entityType: AttachmentEntityType;
    entityId: string;
    tenantId: string;
    category?: AttachmentCategory;
    documentTitle?: string;
    documentNumber?: string;
    documentDate?: string;
    notes?: string;
    description?: string;
    tags?: string[];
}

/** معاملات ربط ملف Google Drive */
export interface LinkGoogleDriveParams {
    driveFile: GoogleDriveFileInfo;
    entityType: AttachmentEntityType;
    entityId: string;
    tenantId: string;
    category?: AttachmentCategory;
    documentTitle?: string;
    documentNumber?: string;
    documentDate?: string;
    notes?: string;
}

/** معاملات تحديث مرفق */
export interface UpdateAttachmentParams {
    category?: AttachmentCategory;
    documentTitle?: string;
    documentNumber?: string;
    documentDate?: string;
    notes?: string;
    description?: string;
    tags?: string[];
}

/** نتيجة عملية */
export interface AttachmentResult<T = Attachment> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
}

/** ملخص استخدام entity */
export interface EntityQuotaStatus {
    filesCount: number;
    totalSize: number;
    maxFiles: number;
    maxTotalSize: number;
    remainingFiles: number;
    remainingSize: number;
    isAtFileLimit: boolean;
    isAtSizeLimit: boolean;
    usagePercent: number;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const BUCKET_NAME = 'document-attachments';
const MAX_FILE_SIZE = 5 * 1024 * 1024;      // 5 MB
const MAX_FILES_PER_ENTITY = 10;
const MAX_TOTAL_SIZE_PER_ENTITY = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

/** تحديد نوع الملف */
function detectFileType(mimeType: string): AttachmentFileType {
    if (mimeType === 'application/pdf') return 'pdf';
    return 'image';
}

/** تنظيف اسم الملف */
function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80);
}

/** بناء مسار التخزين */
function buildStoragePath(
    tenantId: string,
    entityType: string,
    entityId: string,
    fileName: string
): string {
    const timestamp = Date.now();
    const safeName = sanitizeFileName(fileName);
    return `${tenantId}/${entityType}/${entityId}/${timestamp}_${safeName}`;
}

/** تحويل حجم الملف لصيغة قابلة للقراءة */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ═══════════════════════════════════════════════════════════════
// Attachment Service
// ═══════════════════════════════════════════════════════════════

export const attachmentService = {

    // ─── Entity Quota Status ───────────────────────────────────
    /**
     * الحصول على حالة استخدام المرفقات لكيان معين
     */
    async getEntityQuota(
        entityType: AttachmentEntityType,
        entityId: string
    ): Promise<EntityQuotaStatus> {
        const { data, error } = await supabase
            .from('documents')
            .select('file_size')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .eq('is_active', true);

        if (error) {
            console.error('[attachmentService] getEntityQuota error:', error);
            return {
                filesCount: 0,
                totalSize: 0,
                maxFiles: MAX_FILES_PER_ENTITY,
                maxTotalSize: MAX_TOTAL_SIZE_PER_ENTITY,
                remainingFiles: MAX_FILES_PER_ENTITY,
                remainingSize: MAX_TOTAL_SIZE_PER_ENTITY,
                isAtFileLimit: false,
                isAtSizeLimit: false,
                usagePercent: 0,
            };
        }

        const filesCount = data?.length || 0;
        const totalSize = data?.reduce((sum, d) => sum + (d.file_size || 0), 0) || 0;

        return {
            filesCount,
            totalSize,
            maxFiles: MAX_FILES_PER_ENTITY,
            maxTotalSize: MAX_TOTAL_SIZE_PER_ENTITY,
            remainingFiles: MAX_FILES_PER_ENTITY - filesCount,
            remainingSize: MAX_TOTAL_SIZE_PER_ENTITY - totalSize,
            isAtFileLimit: filesCount >= MAX_FILES_PER_ENTITY,
            isAtSizeLimit: totalSize >= MAX_TOTAL_SIZE_PER_ENTITY,
            usagePercent: Math.round((totalSize / MAX_TOTAL_SIZE_PER_ENTITY) * 100),
        };
    },

    // ─── Validate File ─────────────────────────────────────────
    /**
     * التحقق من صلاحية الملف للرفع
     */
    validateFile(
        file: File,
        quota: EntityQuotaStatus
    ): { valid: boolean; error?: string; errorCode?: string } {
        // نوع الملف
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!ext || !ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
                return {
                    valid: false,
                    error: 'نوع الملف غير مدعوم. الأنواع المسموحة: PDF, JPG, PNG, WebP',
                    errorCode: 'INVALID_FILE_TYPE',
                };
            }
        }

        // حجم الملف الفردي
        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `حجم الملف (${formatFileSize(file.size)}) يتجاوز الحد الأقصى (${formatFileSize(MAX_FILE_SIZE)})`,
                errorCode: 'FILE_TOO_LARGE',
            };
        }

        // حد عدد الملفات
        if (quota.isAtFileLimit) {
            return {
                valid: false,
                error: `تم الوصول للحد الأقصى (${MAX_FILES_PER_ENTITY} ملفات)`,
                errorCode: 'MAX_FILES_REACHED',
            };
        }

        // حد الحجم الإجمالي
        if (file.size + quota.totalSize > MAX_TOTAL_SIZE_PER_ENTITY) {
            return {
                valid: false,
                error: `الحجم الإجمالي سيتجاوز الحد (${formatFileSize(MAX_TOTAL_SIZE_PER_ENTITY)}). المتبقي: ${formatFileSize(quota.remainingSize)}`,
                errorCode: 'TOTAL_SIZE_EXCEEDED',
            };
        }

        return { valid: true };
    },

    // ─── Upload ────────────────────────────────────────────────
    /**
     * رفع مرفق جديد
     * 1. التحقق من الصلاحية
     * 2. رفع إلى Storage
     * 3. تسجيل في جدول documents
     */
    async upload(params: UploadAttachmentParams): Promise<AttachmentResult> {
        const {
            file,
            entityType,
            entityId,
            tenantId,
            category,
            documentTitle,
            documentNumber,
            documentDate,
            notes,
            description,
            tags,
        } = params;

        try {
            // 1. فحص الحصة
            const quota = await this.getEntityQuota(entityType, entityId);
            const validation = this.validateFile(file, quota);
            if (!validation.valid) {
                return { success: false, error: validation.error, errorCode: validation.errorCode };
            }

            // 2. بناء المسار
            const storagePath = buildStoragePath(tenantId, entityType, entityId, file.name);

            // 3. رفع الملف إلى Storage
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, file, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error('[attachmentService] Upload error:', uploadError);
                return {
                    success: false,
                    error: `فشل رفع الملف: ${uploadError.message}`,
                    errorCode: 'UPLOAD_FAILED',
                };
            }

            // 4. الحصول على المستخدم الحالي
            const { data: { user } } = await supabase.auth.getUser();

            // 5. تسجيل في جدول documents
            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    tenant_id: tenantId,
                    entity_type: entityType,
                    entity_id: entityId,
                    file_name: storagePath.split('/').pop(),
                    original_name: file.name,
                    file_type: detectFileType(file.type),
                    mime_type: file.type,
                    file_size: file.size,
                    storage_path: storagePath,
                    category: category || 'other',
                    description: description || null,
                    document_title: documentTitle || null,
                    document_number: documentNumber || null,
                    document_date: documentDate || null,
                    notes: notes || null,
                    tags: tags || [],
                    uploaded_by: user?.id || null,
                    is_active: true,
                })
                .select()
                .single();

            if (dbError) {
                // إذا فشل DB، حذف الملف من Storage
                await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
                console.error('[attachmentService] DB insert error:', dbError);
                return {
                    success: false,
                    error: 'فشل تسجيل المرفق في قاعدة البيانات',
                    errorCode: 'DB_INSERT_FAILED',
                };
            }

            return { success: true, data: doc };
        } catch (err: any) {
            console.error('[attachmentService] Upload exception:', err);
            return {
                success: false,
                error: err.message || 'خطأ غير متوقع أثناء الرفع',
                errorCode: 'UNKNOWN_ERROR',
            };
        }
    },

    // ─── Get Attachments ───────────────────────────────────────
    /**
     * جلب كل مرفقات كيان معين
     */
    async getByEntity(
        entityType: AttachmentEntityType,
        entityId: string,
        options?: {
            category?: AttachmentCategory;
            sortBy?: 'created_at' | 'file_size' | 'original_name';
            sortOrder?: 'asc' | 'desc';
        }
    ): Promise<Attachment[]> {
        let query = supabase
            .from('documents')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .eq('is_active', true);

        if (options?.category) {
            query = query.eq('category', options.category);
        }

        const sortBy = options?.sortBy || 'created_at';
        const sortOrder = options?.sortOrder || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data, error } = await query;

        if (error) {
            console.error('[attachmentService] getByEntity error:', error);
            return [];
        }

        return data || [];
    },

    // ─── Count Attachments (for tab badge) ─────────────────────
    /**
     * عدد المرفقات لكيان معين (للـ badge فقط — لا يجلب البيانات)
     */
    async getEntityAttachmentCount(
        entityType: AttachmentEntityType,
        entityId: string
    ): Promise<number> {
        const { count, error } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .eq('is_active', true);

        if (error) {
            console.error('[attachmentService] getEntityAttachmentCount error:', error);
            return 0;
        }

        return count || 0;
    },

    // ─── Get All (for File Center) ─────────────────────────────
    /**
     * جلب كل مرفقات المستأجر (لمركز الملفات)
     */
    async getAll(
        tenantId: string,
        options?: {
            entityType?: AttachmentEntityType;
            category?: AttachmentCategory;
            search?: string;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ attachments: Attachment[]; total: number }> {
        let query = supabase
            .from('documents')
            .select('*', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (options?.entityType) {
            query = query.eq('entity_type', options.entityType);
        }
        if (options?.category) {
            query = query.eq('category', options.category);
        }
        if (options?.search) {
            query = query.or(
                `original_name.ilike.%${options.search}%,document_title.ilike.%${options.search}%,document_number.ilike.%${options.search}%`
            );
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[attachmentService] getAll error:', error);
            return { attachments: [], total: 0 };
        }

        return { attachments: data || [], total: count || 0 };
    },

    // ─── Get Single ────────────────────────────────────────────
    /**
     * جلب مرفق واحد بالـ ID
     */
    async getById(attachmentId: string): Promise<Attachment | null> {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', attachmentId)
            .single();

        if (error) {
            console.error('[attachmentService] getById error:', error);
            return null;
        }
        return data;
    },

    // ─── Update Metadata ──────────────────────────────────────
    /**
     * تحديث بيانات مرفق (بدون تغيير الملف نفسه)
     */
    async update(
        attachmentId: string,
        updates: UpdateAttachmentParams
    ): Promise<AttachmentResult> {
        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.documentTitle !== undefined) updateData.document_title = updates.documentTitle;
        if (updates.documentNumber !== undefined) updateData.document_number = updates.documentNumber;
        if (updates.documentDate !== undefined) updateData.document_date = updates.documentDate;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.tags !== undefined) updateData.tags = updates.tags;

        const { data, error } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', attachmentId)
            .select()
            .single();

        if (error) {
            console.error('[attachmentService] update error:', error);
            return { success: false, error: 'فشل تحديث المرفق', errorCode: 'UPDATE_FAILED' };
        }

        return { success: true, data };
    },

    // ─── Delete ────────────────────────────────────────────────
    /**
     * حذف مرفق (من Storage + DB)
     */
    async delete(attachmentId: string): Promise<AttachmentResult<void>> {
        // 1. جلب بيانات المرفق
        const attachment = await this.getById(attachmentId);
        if (!attachment) {
            return { success: false, error: 'المرفق غير موجود', errorCode: 'NOT_FOUND' };
        }

        // 2. حذف من Storage
        const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([attachment.storage_path]);

        if (storageError) {
            console.warn('[attachmentService] Storage delete warning:', storageError);
            // نستمر في حذف السجل
        }

        // 3. حذف من DB
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', attachmentId);

        if (dbError) {
            console.error('[attachmentService] DB delete error:', dbError);
            return { success: false, error: 'فشل حذف المرفق', errorCode: 'DELETE_FAILED' };
        }

        return { success: true };
    },

    // ─── Signed URL ────────────────────────────────────────────
    /**
     * الحصول على رابط مؤقت للعرض/التحميل (5 دقائق)
     */
    async getSignedUrl(attachmentId: string, expiresIn = 300): Promise<string | null> {
        const attachment = await this.getById(attachmentId);
        if (!attachment) return null;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(attachment.storage_path, expiresIn);

        if (error) {
            console.error('[attachmentService] getSignedUrl error:', error);
            return null;
        }

        return data?.signedUrl || null;
    },

    /**
     * الحصول على رابط مؤقت باستخدام storage_path مباشرة
     */
    async getSignedUrlByPath(storagePath: string, expiresIn = 300): Promise<string | null> {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(storagePath, expiresIn);

        if (error) {
            console.error('[attachmentService] getSignedUrlByPath error:', error);
            return null;
        }

        return data?.signedUrl || null;
    },

    // ─── Download ──────────────────────────────────────────────
    /**
     * تنزيل مرفق (Blob + اسم الملف)
     */
    async download(attachmentId: string): Promise<{ blob: Blob; fileName: string } | null> {
        const attachment = await this.getById(attachmentId);
        if (!attachment) return null;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .download(attachment.storage_path);

        if (error || !data) {
            console.error('[attachmentService] Download error:', error);
            return null;
        }

        return { blob: data, fileName: attachment.original_name };
    },

    // ─── Count by Entity ──────────────────────────────────────
    /**
     * عدد المرفقات لكيان معين (خفيف — للشارات)
     */
    async countByEntity(
        entityType: AttachmentEntityType,
        entityId: string
    ): Promise<number> {
        const { count, error } = await supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .eq('is_active', true);

        if (error) {
            console.error('[attachmentService] countByEntity error:', error);
            return 0;
        }

        return count || 0;
    },

    // ─── Link Google Drive File ────────────────────────────────
    /**
     * ربط ملف Google Drive (بدون رفع — فقط تسجيل metadata)
     * الملف يبقى في Google Drive، ونحتفظ بالرابط + البيانات
     */
    async linkGoogleDriveFile(params: LinkGoogleDriveParams): Promise<AttachmentResult> {
        const {
            driveFile,
            entityType,
            entityId,
            tenantId,
            category,
            documentTitle,
            documentNumber,
            documentDate,
            notes,
        } = params;

        try {
            // التحقق من الحصة
            const quota = await this.getEntityQuota(entityType, entityId);
            if (quota.isAtFileLimit) {
                return {
                    success: false,
                    error: `تم الوصول للحد الأقصى (${MAX_FILES_PER_ENTITY} ملفات)`,
                    errorCode: 'MAX_FILES_REACHED',
                };
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    tenant_id: tenantId,
                    entity_type: entityType,
                    entity_id: entityId,
                    file_name: driveFile.name,
                    original_name: driveFile.name,
                    file_type: detectFileType(driveFile.mimeType),
                    mime_type: driveFile.mimeType,
                    file_size: driveFile.size,
                    storage_path: `gdrive://${driveFile.driveFileId}`,
                    public_url: driveFile.webViewLink,
                    category: category || 'other',
                    document_title: documentTitle || null,
                    document_number: documentNumber || null,
                    document_date: documentDate || null,
                    notes: notes || null,
                    metadata: {
                        storage_provider: 'google_drive',
                        drive_file_id: driveFile.driveFileId,
                        web_view_link: driveFile.webViewLink,
                        web_content_link: driveFile.webContentLink,
                        thumbnail_link: driveFile.thumbnailLink,
                    },
                    uploaded_by: user?.id || null,
                    is_active: true,
                })
                .select()
                .single();

            if (dbError) {
                console.error('[attachmentService] Google Drive link error:', dbError);
                return {
                    success: false,
                    error: 'فشل ربط ملف Google Drive',
                    errorCode: 'DB_INSERT_FAILED',
                };
            }

            return { success: true, data: doc };
        } catch (err: any) {
            console.error('[attachmentService] linkGoogleDriveFile exception:', err);
            return {
                success: false,
                error: err.message || 'خطأ غير متوقع',
                errorCode: 'UNKNOWN_ERROR',
            };
        }
    },

    // ─── Resolve URL (multi-provider) ─────────────────────────
    /**
     * الحصول على رابط العرض بغض النظر عن مزود التخزين
     * - Supabase: signed URL
     * - Google Drive: webViewLink
     */
    async resolveViewUrl(attachment: Attachment): Promise<string | null> {
        const provider = attachment.metadata?.storage_provider || 'supabase';

        if (provider === 'google_drive') {
            return attachment.metadata?.web_view_link || attachment.public_url || null;
        }

        // Supabase Storage
        return this.getSignedUrlByPath(attachment.storage_path);
    },

    /**
     * الحصول على رابط التحميل بغض النظر عن مزود التخزين
     */
    async resolveDownloadUrl(attachment: Attachment): Promise<string | null> {
        const provider = attachment.metadata?.storage_provider || 'supabase';

        if (provider === 'google_drive') {
            return attachment.metadata?.web_content_link || attachment.public_url || null;
        }

        // Supabase Storage
        return this.getSignedUrlByPath(attachment.storage_path);
    },

    /**
     * هل المرفق من Google Drive؟
     */
    isGoogleDriveAttachment(attachment: Attachment): boolean {
        return attachment.metadata?.storage_provider === 'google_drive'
            || attachment.storage_path?.startsWith('gdrive://');
    },

    // ─── Constants Export ──────────────────────────────────────
    /** الثوابت المتاحة للاستخدام في المكونات */
    constants: {
        MAX_FILE_SIZE,
        MAX_FILES_PER_ENTITY,
        MAX_TOTAL_SIZE_PER_ENTITY,
        ALLOWED_MIME_TYPES,
        ALLOWED_EXTENSIONS,
        BUCKET_NAME,
    },
};

export default attachmentService;
