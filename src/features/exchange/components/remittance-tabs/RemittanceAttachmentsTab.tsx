/**
 * ════════════════════════════════════════════════════════════════
 * 📎 RemittanceAttachmentsTab — المرفقات والإثباتات
 * ════════════════════════════════════════════════════════════════
 * 
 * يدعم:
 *   - رفع صور إيصالات + إثباتات هوية + تأكيدات تسليم
 *   - عرض الصور في grid مصغّر مع preview كبير
 *   - تصنيف المرفقات (receipt, id_proof, delivery_proof, other)
 *   - حذف المرفقات
 * 
 * Storage: Supabase bucket "remittance-attachments"
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Remittance } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Upload, FileImage, FileText, Trash2, Eye, Download,
  Camera, CreditCard, CheckCircle, Paperclip, Plus, X,
  Image as ImageIcon, AlertCircle,
} from 'lucide-react';

// ─── Attachment Categories ────────────────────────────────────
interface AttachmentCategory {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  color: string;
  accept: string;
}

const CATEGORIES: AttachmentCategory[] = [
  { key: 'receipt',        labelAr: 'إيصال التحصيل',   labelEn: 'Collection Receipt', icon: FileText,    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/40',   accept: 'image/*,.pdf' },
  { key: 'id_proof',       labelAr: 'إثبات هوية',      labelEn: 'ID Proof',           icon: CreditCard,  color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/40', accept: 'image/*,.pdf' },
  { key: 'delivery_proof', labelAr: 'تأكيد التسليم',    labelEn: 'Delivery Proof',     icon: CheckCircle, color: 'text-green-500 bg-green-100 dark:bg-green-900/40', accept: 'image/*,.pdf' },
  { key: 'other',          labelAr: 'مرفق آخر',        labelEn: 'Other',              icon: Paperclip,   color: 'text-gray-500 bg-gray-100 dark:bg-gray-800',      accept: 'image/*,.pdf,.doc,.docx' },
];

// ─── Mock Attachment Type ─────────────────────────────────────
interface Attachment {
  id: string;
  name: string;
  category: string;
  url: string;
  size: number;
  type: string; // mime type
  uploadedAt: string;
  uploadedBy?: string;
}

// ─── Props ────────────────────────────────────────────────────
interface RemittanceAttachmentsTabProps {
  remittance: Partial<Remittance>;
  mode: 'create' | 'view';
}

// ═══════════════════════════════════════════════════════════════
export default function RemittanceAttachmentsTab({ remittance, mode }: RemittanceAttachmentsTabProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const isCreate = mode === 'create';

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('receipt');

  // ─── Group attachments by category ─────────────────────────
  const groupedAttachments = useMemo(() => {
    const groups: Record<string, Attachment[]> = {};
    for (const cat of CATEGORIES) {
      groups[cat.key] = attachments.filter(a => a.category === cat.key);
    }
    return groups;
  }, [attachments]);

  // ─── Handle file upload ────────────────────────────────────
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // In production, upload to Supabase Storage:
        // const { data, error } = await supabase.storage.from('remittance-attachments').upload(path, file);
        
        // For now, create blob URL for preview
        const blobUrl = URL.createObjectURL(file);
        
        const newAttachment: Attachment = {
          id: `att-${Date.now()}-${i}`,
          name: file.name,
          category: selectedCategory,
          url: blobUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Current User',
        };
        
        setAttachments(prev => [...prev, newAttachment]);
      }
    } finally {
      setUploading(false);
    }
  }, [selectedCategory]);

  // ─── Handle drag & drop ────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // ─── Delete attachment ─────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // ─── Format file size ──────────────────────────────────────
  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Is Image ──────────────────────────────────────────────
  const isImage = (type: string) => type.startsWith('image/');

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-4 space-y-4">

      {/* ─── Upload Zone ──────────────────────────────────── */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-b flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            {isAr ? 'رفع مرفقات' : 'Upload Attachments'}
          </h4>
          <Badge variant="outline" className="text-[10px]">
            {attachments.length} {isAr ? 'مرفق' : 'files'}
          </Badge>
        </div>
        <CardContent className="py-4 px-5 space-y-3">
          {/* Category Selection */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                    isSelected
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <CatIcon className="w-3.5 h-3.5" />
                  {isAr ? cat.labelAr : cat.labelEn}
                </button>
              );
            })}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
              dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
            )}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = CATEGORIES.find(c => c.key === selectedCategory)?.accept || 'image/*';
              input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
              input.click();
            }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-blue-600">{isAr ? 'جارٍ الرفع...' : 'Uploading...'}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {isAr ? 'اسحب الملفات هنا أو اضغط للاختيار' : 'Drag files here or click to browse'}
                </p>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                  {isAr ? 'صور، PDF، مستندات — حد أقصى 10 MB' : 'Images, PDF, documents — max 10 MB'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Attachments Grid ─────────────────────────────── */}
      {CATEGORIES.map(cat => {
        const catAttachments = groupedAttachments[cat.key] || [];
        if (catAttachments.length === 0) return null;

        const CatIcon = cat.icon;
        return (
          <Card key={cat.key} className="border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 border-b flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", cat.color)}>
                <CatIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {isAr ? cat.labelAr : cat.labelEn}
              </span>
              <Badge variant="outline" className="text-[9px] ms-auto">
                {catAttachments.length}
              </Badge>
            </div>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {catAttachments.map(att => (
                  <div
                    key={att.id}
                    className="group relative border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 hover:shadow-md transition-all"
                  >
                    {/* Preview */}
                    {isImage(att.type) ? (
                      <div
                        className="aspect-[4/3] bg-cover bg-center cursor-pointer"
                        style={{ backgroundImage: `url(${att.url})` }}
                        onClick={() => setPreviewUrl(att.url)}
                      />
                    ) : (
                      <div
                        className="aspect-[4/3] flex items-center justify-center bg-gray-100 dark:bg-gray-800 cursor-pointer"
                        onClick={() => setPreviewUrl(att.url)}
                      >
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    {/* Info Bar */}
                    <div className="p-2">
                      <p className="text-[10px] font-medium text-gray-900 dark:text-white truncate">
                        {att.name}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {fmtSize(att.size)}
                      </p>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-1 end-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 shadow flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={() => setPreviewUrl(att.url)}
                      >
                        <Eye className="w-3 h-3 text-blue-600" />
                      </button>
                      <button
                        className="w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 shadow flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900"
                        onClick={() => handleDelete(att.id)}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ─── Empty State ──────────────────────────────────── */}
      {attachments.length === 0 && (
        <Card className="border-gray-200/50 dark:border-gray-800/50">
          <CardContent className="p-8 text-center">
            <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {isAr ? 'لا توجد مرفقات بعد' : 'No attachments yet'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {isAr
                ? 'ارفع إيصالات التحصيل وإثباتات الهوية وتأكيدات التسليم'
                : 'Upload collection receipts, ID proofs, and delivery confirmations'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Preview Modal ────────────────────────────────── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              className="absolute -top-3 -end-3 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-red-100 z-10"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
