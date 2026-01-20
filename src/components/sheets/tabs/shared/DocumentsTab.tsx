/**
 * Documents Tab - تبويب المستندات والمرفقات
 * يعرض المستندات المرتبطة بالسجل مع دعم الرفع الفعلي
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  FileText,
  File,
  Download,
  Eye,
  Upload,
  Trash2,
  Calendar,
  User,
  FolderOpen,
  FileSpreadsheet,
  FileImage,
  FileType2,
  HardDrive,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  documentService, 
  type Document, 
  type EntityType, 
  type DocumentCategory,
  type StorageStatus,
  formatFileSize,
} from '@/services/documentService';

interface DocumentsTabProps {
  data: any;
  language: string;
  entityType?: EntityType;
  entityId?: string;
  tenantId?: string;
  onAction?: (actionId: string, data?: any) => void;
  onRowClick?: (row: any) => void;
}

const getFileIcon = (type: string) => {
  const icons: Record<string, any> = {
    pdf: FileType2,
    image: FileImage,
    excel: FileSpreadsheet,
    doc: FileText,
    default: File,
  };
  return icons[type] || icons.default;
};

const getFileTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    pdf: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    image: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    excel: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    doc: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    default: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30',
  };
  return colors[type] || colors.default;
};

const CATEGORY_OPTIONS: DocumentCategory[] = [
  'contract',
  'invoice_copy',
  'receipt',
  'id_document',
  'certificate',
  'report',
  'other',
];

export function DocumentsTab({ 
  data, 
  language, 
  entityType = 'invoice',
  entityId,
  tenantId,
  onAction, 
  onRowClick 
}: DocumentsTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [documents, setDocuments] = useState<Document[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('other');
  const [uploadDescription, setUploadDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // الحصول على الـ tenant ID
  const resolvedTenantId = tenantId || user?.user_metadata?.tenant_id || data?.tenant_id;
  const resolvedEntityId = entityId || data?.id;

  // جلب المستندات
  const fetchDocuments = useCallback(async () => {
    if (!resolvedEntityId) {
      setDocuments(data?.documents || data?.attachments || []);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const docs = await documentService.getDocuments(entityType, resolvedEntityId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Fallback to mock data
      setDocuments(data?.documents || data?.attachments || []);
    } finally {
      setLoading(false);
    }
  }, [entityType, resolvedEntityId, data]);

  // جلب حالة التخزين
  const fetchStorageStatus = useCallback(async () => {
    if (!resolvedTenantId) return;

    try {
      const status = await documentService.getStorageStatus(resolvedTenantId);
      setStorageStatus(status);
    } catch (error) {
      console.error('Error fetching storage status:', error);
    }
  }, [resolvedTenantId]);

  useEffect(() => {
    fetchDocuments();
    fetchStorageStatus();
  }, [fetchDocuments, fetchStorageStatus]);

  // اختيار ملف
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من الحجم (25 MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error(t('documents.errors.fileTooLarge'));
      return;
    }

    setSelectedFile(file);
    setShowUploadDialog(true);
  };

  // رفع الملف
  const handleUpload = async () => {
    if (!selectedFile || !resolvedTenantId || !resolvedEntityId) {
      toast.error(t('documents.errors.missingInfo'));
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(20);

      // التحقق من الحصة
      const quotaCheck = await documentService.checkQuota(resolvedTenantId, selectedFile.size);
      if (!quotaCheck.canUpload) {
        toast.error(t(`documents.errors.${quotaCheck.reason}`));
        return;
      }

      setUploadProgress(50);

      // رفع المستند
      const result = await documentService.uploadDocument(
        selectedFile,
        resolvedTenantId,
        {
          entityType,
          entityId: resolvedEntityId,
          category: uploadCategory,
          description: uploadDescription,
        }
      );

      setUploadProgress(100);

      if (result.success && result.document) {
        toast.success(t('documents.uploadSuccess'));
        setDocuments(prev => [result.document!, ...prev]);
        fetchStorageStatus(); // تحديث حالة التخزين
        onAction?.('document_uploaded', result.document);
      } else {
        toast.error(t(`documents.errors.${result.error || 'uploadFailed'}`));
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('documents.errors.uploadFailed'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadCategory('other');
      setUploadDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // تحميل ملف
  const handleDownload = async (doc: Document) => {
    try {
      const result = await documentService.downloadDocument(doc.id);
      if (result) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('documents.errors.downloadFailed'));
    }
  };

  // عرض ملف
  const handleView = async (doc: Document) => {
    try {
      const url = await documentService.getDownloadUrl(doc.id);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('View error:', error);
      toast.error(t('documents.errors.viewFailed'));
    }
  };

  // حذف ملف
  const handleDelete = async (docId: string) => {
    try {
      const result = await documentService.deleteDocument(docId);
      if (result.success) {
        toast.success(t('documents.deleteSuccess'));
        setDocuments(prev => prev.filter(d => d.id !== docId));
        fetchStorageStatus();
        onAction?.('document_deleted', { id: docId });
      } else {
        toast.error(t(`documents.errors.${result.error || 'deleteFailed'}`));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('documents.errors.deleteFailed'));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* شريط التخزين */}
      {storageStatus && (
        <Card className={cn(
          'border',
          storageStatus.isCritical && 'border-red-300 bg-red-50 dark:bg-red-900/20',
          storageStatus.isNearLimit && !storageStatus.isCritical && 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{t('documents.storage')}</span>
              </div>
              <span className="text-sm text-gray-500">
                {storageStatus.formattedUsed} / {storageStatus.formattedMax}
              </span>
            </div>
            <Progress 
              value={storageStatus.usedPercent} 
              className={cn(
                'h-2',
                storageStatus.isCritical && '[&>div]:bg-red-500',
                storageStatus.isNearLimit && !storageStatus.isCritical && '[&>div]:bg-yellow-500'
              )}
            />
            {(storageStatus.isNearLimit || storageStatus.isCritical) && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <AlertTriangle className={cn(
                  'h-3 w-3',
                  storageStatus.isCritical ? 'text-red-500' : 'text-yellow-500'
                )} />
                <span className={storageStatus.isCritical ? 'text-red-600' : 'text-yellow-600'}>
                  {storageStatus.isCritical 
                    ? t('documents.storageCritical')
                    : t('documents.storageWarning')
                  }
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* زر الرفع */}
      <div className="flex justify-end">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={storageStatus?.isAtLimit}
        >
          <Upload className="w-4 h-4 me-2" />
          {t('documents.upload')}
        </Button>
      </div>

      {/* إحصائيات */}
      {documents.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{documents.length}</p>
              <p className="text-xs text-gray-500">{t('common.total')}</p>
            </CardContent>
          </Card>
          {['pdf', 'image', 'excel'].map((type) => {
            const count = documents.filter(d => d.file_type === type).length;
            return (
              <Card key={type} className="bg-gray-50 dark:bg-gray-800/50">
                <CardContent className="p-2 text-center">
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{count}</p>
                  <p className="text-xs text-gray-500 capitalize">{type}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* قائمة المستندات */}
      {documents.length === 0 ? (
        <div className="p-8 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('documents.noDocuments')}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={storageStatus?.isAtLimit}
          >
            <Upload className="w-4 h-4 me-2" />
            {t('documents.uploadFirst')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type || 'default');
            const colorClass = getFileTypeColor(doc.file_type || 'default');
            
            return (
              <Card 
                key={doc.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", colorClass)}>
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                        {doc.original_name || doc.file_name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        {doc.category && (
                          <Badge variant="secondary" className="text-xs">
                            {t(`documents.categories.${doc.category}`)}
                          </Badge>
                        )}
                        {doc.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleView(doc)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteConfirmId(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* نافذة رفع الملف */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('documents.uploadTitle')}</DialogTitle>
            <DialogDescription>
              {t('documents.uploadDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              {/* معلومات الملف */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <File className="h-8 w-8 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setShowUploadDialog(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* التصنيف */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('documents.category')}</label>
                <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as DocumentCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`documents.categories.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* الوصف */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('documents.description')}</label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder={t('documents.descriptionPlaceholder')}
                  rows={2}
                />
              </div>

              {/* شريط التقدم */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-center text-gray-500">
                    {t('documents.uploading')}... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
              }}
              disabled={uploading}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t('documents.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 me-2" />
                  {t('documents.upload')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('documents.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('documents.deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
