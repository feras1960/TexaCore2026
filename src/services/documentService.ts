/**
 * Document Service
 * خدمة إدارة المستندات والملفات المرفقة
 * 
 * يدعم:
 * - رفع وتحميل وحذف المستندات
 * - إدارة حدود التخزين
 * - التنبيهات عند اقتراب الحد
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// الأنواع والواجهات
// ═══════════════════════════════════════════════════════════════

export interface Document {
  id: string;
  tenant_id: string;
  entity_type: EntityType;
  entity_id: string;
  file_name: string;
  original_name: string;
  file_type: FileType;
  mime_type: string;
  file_size: number;
  storage_path: string;
  public_url?: string;
  description?: string;
  category?: DocumentCategory;
  tags?: string[];
  metadata?: Record<string, any>;
  uploaded_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EntityType = 
  | 'invoice' 
  | 'contract' 
  | 'account' 
  | 'journal_entry' 
  | 'customer' 
  | 'supplier' 
  | 'product' 
  | 'tenant' 
  | 'agent'
  | 'payment'
  | 'order';

export type FileType = 'pdf' | 'image' | 'excel' | 'doc' | 'other';

export type DocumentCategory = 
  | 'contract' 
  | 'invoice_copy' 
  | 'receipt' 
  | 'id_document' 
  | 'certificate' 
  | 'report'
  | 'other';

export interface StorageQuota {
  id: string;
  tenant_id: string;
  max_storage_bytes: number;
  used_storage_bytes: number;
  max_files_count: number;
  current_files_count: number;
  max_file_size_bytes: number;
  alert_threshold_percent: number;
  critical_threshold_percent: number;
  last_alert_sent_at?: string;
  last_critical_alert_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadOptions {
  entityType: EntityType;
  entityId: string;
  category?: DocumentCategory;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface StorageStatus {
  used: number;
  max: number;
  usedPercent: number;
  filesCount: number;
  maxFiles: number;
  isNearLimit: boolean;
  isCritical: boolean;
  isAtLimit: boolean;
  remainingBytes: number;
  formattedUsed: string;
  formattedMax: string;
  formattedRemaining: string;
}

// ═══════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════

const STORAGE_BUCKET = 'documents';

/**
 * تحويل الحجم إلى صيغة قابلة للقراءة
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * تحديد نوع الملف من الـ MIME type
 */
export function getFileType(mimeType: string): FileType {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'excel';
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return 'doc';
  return 'other';
}

/**
 * توليد اسم ملف فريد
 */
function generateFileName(originalName: string, tenantId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop() || '';
  const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  return `${tenantId}/${timestamp}_${random}_${cleanName}.${ext}`;
}

// ═══════════════════════════════════════════════════════════════
// خدمة المستندات
// ═══════════════════════════════════════════════════════════════

export const documentService = {
  /**
   * الحصول على حالة التخزين للمستأجر
   */
  async getStorageStatus(tenantId: string): Promise<StorageStatus> {
    const { data: quota, error } = await supabase
      .from('storage_quotas')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !quota) {
      // إرجاع قيم افتراضية إذا لم يوجد سجل
      return {
        used: 0,
        max: 5 * 1024 * 1024 * 1024, // 5 GB
        usedPercent: 0,
        filesCount: 0,
        maxFiles: 1000,
        isNearLimit: false,
        isCritical: false,
        isAtLimit: false,
        remainingBytes: 5 * 1024 * 1024 * 1024,
        formattedUsed: '0 B',
        formattedMax: '5 GB',
        formattedRemaining: '5 GB',
      };
    }

    const usedPercent = (quota.used_storage_bytes / quota.max_storage_bytes) * 100;
    const remainingBytes = quota.max_storage_bytes - quota.used_storage_bytes;

    return {
      used: quota.used_storage_bytes,
      max: quota.max_storage_bytes,
      usedPercent,
      filesCount: quota.current_files_count,
      maxFiles: quota.max_files_count,
      isNearLimit: usedPercent >= quota.alert_threshold_percent,
      isCritical: usedPercent >= quota.critical_threshold_percent,
      isAtLimit: usedPercent >= 100 || quota.current_files_count >= quota.max_files_count,
      remainingBytes,
      formattedUsed: formatFileSize(quota.used_storage_bytes),
      formattedMax: formatFileSize(quota.max_storage_bytes),
      formattedRemaining: formatFileSize(remainingBytes),
    };
  },

  /**
   * التحقق من إمكانية رفع ملف
   */
  async checkQuota(tenantId: string, fileSize: number): Promise<{
    canUpload: boolean;
    reason?: string;
  }> {
    const status = await this.getStorageStatus(tenantId);

    // التحقق من حد الملفات
    if (status.filesCount >= status.maxFiles) {
      return { 
        canUpload: false, 
        reason: 'quota.maxFilesReached' 
      };
    }

    // التحقق من حد التخزين
    if (status.used + fileSize > status.max) {
      return { 
        canUpload: false, 
        reason: 'quota.storageLimitReached' 
      };
    }

    // التحقق من حجم الملف الفردي
    const { data: quota } = await supabase
      .from('storage_quotas')
      .select('max_file_size_bytes')
      .eq('tenant_id', tenantId)
      .single();

    const maxFileSize = quota?.max_file_size_bytes || 25 * 1024 * 1024; // 25 MB default
    if (fileSize > maxFileSize) {
      return { 
        canUpload: false, 
        reason: 'quota.fileTooLarge' 
      };
    }

    return { canUpload: true };
  },

  /**
   * رفع مستند جديد
   */
  async uploadDocument(
    file: File,
    tenantId: string,
    options: UploadOptions
  ): Promise<{ success: boolean; document?: Document; error?: string }> {
    try {
      // التحقق من الحصة
      const quotaCheck = await this.checkQuota(tenantId, file.size);
      if (!quotaCheck.canUpload) {
        return { success: false, error: quotaCheck.reason };
      }

      // توليد اسم الملف
      const storagePath = generateFileName(file.name, tenantId);

      // رفع الملف إلى Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { success: false, error: 'upload.failed' };
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // إنشاء سجل في قاعدة البيانات
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          tenant_id: tenantId,
          entity_type: options.entityType,
          entity_id: options.entityId,
          file_name: storagePath.split('/').pop(),
          original_name: file.name,
          file_type: getFileType(file.type),
          mime_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          public_url: urlData?.publicUrl,
          description: options.description,
          category: options.category,
          tags: options.tags || [],
          metadata: options.metadata || {},
        })
        .select()
        .single();

      if (dbError) {
        // حذف الملف من Storage إذا فشل إنشاء السجل
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        console.error('Database error:', dbError);
        return { success: false, error: 'database.failed' };
      }

      return { success: true, document };
    } catch (error) {
      console.error('Upload document error:', error);
      return { success: false, error: 'upload.unknown_error' };
    }
  },

  /**
   * جلب المستندات لكيان معين
   */
  async getDocuments(
    entityType: EntityType,
    entityId: string,
    options?: {
      category?: DocumentCategory;
      limit?: number;
      offset?: number;
    }
  ): Promise<Document[]> {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get documents error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * جلب كل مستندات المستأجر
   */
  async getAllDocuments(
    tenantId: string,
    options?: {
      entityType?: EntityType;
      category?: DocumentCategory;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ documents: Document[]; total: number }> {
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
      query = query.or(`original_name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get all documents error:', error);
      return { documents: [], total: 0 };
    }

    return { documents: data || [], total: count || 0 };
  },

  /**
   * جلب مستند واحد
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      console.error('Get document error:', error);
      return null;
    }

    return data;
  },

  /**
   * تحديث معلومات مستند
   */
  async updateDocument(
    documentId: string,
    updates: {
      description?: string;
      category?: DocumentCategory;
      tags?: string[];
    }
  ): Promise<{ success: boolean; document?: Document; error?: string }> {
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Update document error:', error);
      return { success: false, error: 'update.failed' };
    }

    return { success: true, document: data };
  },

  /**
   * حذف مستند
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    // جلب معلومات المستند أولاً
    const document = await this.getDocument(documentId);
    if (!document) {
      return { success: false, error: 'document.not_found' };
    }

    // حذف الملف من Storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // نستمر في حذف السجل حتى لو فشل حذف الملف
    }

    // حذف السجل من قاعدة البيانات
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return { success: false, error: 'delete.failed' };
    }

    return { success: true };
  },

  /**
   * الحصول على رابط التحميل
   */
  async getDownloadUrl(documentId: string): Promise<string | null> {
    const document = await this.getDocument(documentId);
    if (!document) return null;

    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(document.storage_path, 3600); // ساعة واحدة

    return data?.signedUrl || document.public_url || null;
  },

  /**
   * تنزيل مستند
   */
  async downloadDocument(documentId: string): Promise<{ blob: Blob; fileName: string } | null> {
    const document = await this.getDocument(documentId);
    if (!document) return null;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(document.storage_path);

    if (error || !data) {
      console.error('Download error:', error);
      return null;
    }

    return { blob: data, fileName: document.original_name };
  },
};

// التصدير الافتراضي
export default documentService;
