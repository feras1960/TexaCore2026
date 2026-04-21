/**
 * ════════════════════════════════════════════════════════════════
 * 📄 IdentityDocumentsSection — قسم المستندات الديناميكي
 * ════════════════════════════════════════════════════════════════
 * يستبدل حقول KYC الثابتة بنظام سطور ديناميكية
 * كل مستند = كارد قابل للتعديل مع مرفقات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import {
  entityDocumentService,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CATEGORIES,
  type EntityDocument,
  type EntityType,
  type DocumentType,
  type DocumentAttachment,
} from '@/features/exchange/services/entityDocumentService';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  StarOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Paperclip,
  Download,
  X,
  Shield,
  Edit3,
  Save,
  XCircle,
  Eye,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────

interface IdentityDocumentsSectionProps {
  entityType: EntityType;
  entityId: string;
  isEditable: boolean;
  /** اختياري — لتصفية أنواع المستندات المعروضة */
  allowedCategories?: string[];
  /** Show only banking category (for remittances) */
  bankingOnly?: boolean;
  /** Linked remittance ID (for SWIFT notices) */
  remittanceId?: string;
}

// ─── Helper: get localized label ──────────────────────────────

function useT() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  return (ar: string, en: string) => isAr ? ar : en;
}

// ─── Document Status Badge ────────────────────────────────────

function StatusBadge({ status, expiryDate }: { status: string; expiryDate?: string | null }) {
  const t = useT();

  if (status === 'expired' || (expiryDate && new Date(expiryDate) < new Date())) {
    return (
      <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-0.5">
        <AlertTriangle className="w-2.5 h-2.5" />
        {t('منتهي', 'Expired')}
      </Badge>
    );
  }

  // expires within 90 days
  if (expiryDate) {
    const daysLeft = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 90 && daysLeft > 0) {
      return (
        <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {t(`ينتهي خلال ${daysLeft} يوم`, `Expires in ${daysLeft}d`)}
        </Badge>
      );
    }
  }

  if (status === 'pending_verification') {
    return (
      <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-0.5">
        <Clock className="w-2.5 h-2.5" />
        {t('بانتظار التحقق', 'Pending')}
      </Badge>
    );
  }

  return (
    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-0.5">
      <CheckCircle2 className="w-2.5 h-2.5" />
      {t('ساري', 'Active')}
    </Badge>
  );
}

// ─── Single Document Card ─────────────────────────────────────

interface DocumentCardProps {
  doc: EntityDocument;
  isEditable: boolean;
  onUpdate: (id: string, updates: Partial<EntityDocument>) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onUploadAttachment: (id: string, file: File) => void;
  onRemoveAttachment: (id: string, url: string) => void;
}

function DocumentCard({
  doc,
  isEditable,
  onUpdate,
  onDelete,
  onSetPrimary,
  onUploadAttachment,
  onRemoveAttachment,
}: DocumentCardProps) {
  const t = useT();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EntityDocument>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeInfo = DOCUMENT_TYPE_LABELS[doc.document_type] || DOCUMENT_TYPE_LABELS.other;
  const hasExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
  const attachmentCount = (doc.attachments || []).length;

  const startEdit = () => {
    setEditData({
      document_number: doc.document_number,
      issue_date: doc.issue_date,
      expiry_date: doc.expiry_date,
      issuing_authority: doc.issuing_authority,
      nationality: doc.nationality,
      date_of_birth: doc.date_of_birth,
      notes: doc.notes,
    });
    setIsEditing(true);
    setIsExpanded(true);
  };

  const saveEdit = () => {
    onUpdate(doc.id, editData);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadAttachment(doc.id, file);
      e.target.value = '';
    }
  };

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200",
      hasExpired
        ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10"
        : doc.is_primary
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
      "hover:shadow-sm"
    )}>
      {/* Header Row */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={() => !isEditing && setIsExpanded(prev => !prev)}
      >
        {/* Icon */}
        <span className="text-lg shrink-0">{typeInfo.icon}</span>

        {/* Type & Number */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {isAr ? typeInfo.ar : typeInfo.en}
            </span>
            {doc.is_primary && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
          </div>
          {doc.document_number && (
            <span className="text-xs text-gray-500 font-mono" dir="ltr">
              {doc.document_number}
            </span>
          )}
        </div>

        {/* Status */}
        <StatusBadge status={doc.status} expiryDate={doc.expiry_date} />

        {/* Attachments count */}
        {attachmentCount > 0 && (
          <div className="flex items-center gap-0.5 text-xs text-gray-400">
            <Paperclip className="w-3 h-3" />
            <span>{attachmentCount}</span>
          </div>
        )}

        {/* Expand arrow */}
        <div className="text-gray-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 pb-3 pt-2 space-y-3">
          {/* Detail Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                {t('رقم الوثيقة', 'Document Number')}
              </label>
              {isEditing ? (
                <Input
                  value={editData.document_number || ''}
                  onChange={(e) => setEditData(p => ({ ...p, document_number: e.target.value }))}
                  dir="ltr"
                  className="h-8 text-sm"
                  placeholder={t('رقم الوثيقة', 'Document number')}
                />
              ) : (
                <p className="text-sm font-mono" dir="ltr">{doc.document_number || '—'}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                {t('جهة الإصدار', 'Issuing Authority')}
              </label>
              {isEditing ? (
                <Input
                  value={editData.issuing_authority || ''}
                  onChange={(e) => setEditData(p => ({ ...p, issuing_authority: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder={t('جهة الإصدار', 'Issuing authority')}
                />
              ) : (
                <p className="text-sm">{doc.issuing_authority || '—'}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                {t('تاريخ الإصدار', 'Issue Date')}
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.issue_date || ''}
                  onChange={(e) => setEditData(p => ({ ...p, issue_date: e.target.value }))}
                  dir="ltr"
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm" dir="ltr">{doc.issue_date || '—'}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                {t('تاريخ الانتهاء', 'Expiry Date')}
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.expiry_date || ''}
                  onChange={(e) => setEditData(p => ({ ...p, expiry_date: e.target.value }))}
                  dir="ltr"
                  className="h-8 text-sm"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm" dir="ltr">{doc.expiry_date || '—'}</p>
                  {hasExpired && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
              )}
            </div>

            {/* Nationality — for identity docs */}
            {['national_id', 'passport', 'residence_permit', 'military_id'].includes(doc.document_type) && (
              <>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                    {t('الجنسية', 'Nationality')}
                  </label>
                  {isEditing ? (
                    <Input
                      value={editData.nationality || ''}
                      onChange={(e) => setEditData(p => ({ ...p, nationality: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm">{doc.nationality || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                    {t('تاريخ الميلاد', 'Date of Birth')}
                  </label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.date_of_birth || ''}
                      onChange={(e) => setEditData(p => ({ ...p, date_of_birth: e.target.value }))}
                      dir="ltr"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm" dir="ltr">{doc.date_of_birth || '—'}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {(isEditing || doc.notes) && (
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 block">
                {t('ملاحظات', 'Notes')}
              </label>
              {isEditing ? (
                <Textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              ) : (
                <p className="text-xs text-gray-500">{doc.notes}</p>
              )}
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-gray-400 font-semibold uppercase flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {t('المرفقات', 'Attachments')}
                {attachmentCount > 0 && (
                  <span className="text-blue-500">({attachmentCount})</span>
                )}
              </label>
              {isEditable && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-blue-600 hover:text-blue-700 gap-0.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3" />
                    {t('رفع', 'Upload')}
                  </Button>
                </>
              )}
            </div>
            {attachmentCount > 0 ? (
              <div className="space-y-1">
                {(doc.attachments || []).map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-1.5 rounded bg-gray-50 dark:bg-gray-800 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {att.name}
                    </span>
                    <span className="text-gray-400 text-[10px]">
                      {(att.size / 1024).toFixed(0)}KB
                    </span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                    {isEditable && (
                      <button
                        className="text-red-400 hover:text-red-600"
                        onClick={() => onRemoveAttachment(doc.id, att.url)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-300 text-center py-1">
                {t('لا توجد مرفقات', 'No attachments')}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditable && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={saveEdit}>
                      <Save className="w-3 h-3" />
                      {t('حفظ', 'Save')}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={cancelEdit}>
                      <XCircle className="w-3 h-3" />
                      {t('إلغاء', 'Cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-blue-600"
                      onClick={startEdit}
                    >
                      <Edit3 className="w-3 h-3" />
                      {t('تعديل', 'Edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 text-xs gap-1",
                        doc.is_primary ? "text-amber-600" : "text-gray-400"
                      )}
                      onClick={() => onSetPrimary(doc.id)}
                    >
                      {doc.is_primary ? (
                        <><Star className="w-3 h-3 fill-current" /> {t('أساسي', 'Primary')}</>
                      ) : (
                        <><StarOff className="w-3 h-3" /> {t('جعله أساسي', 'Set Primary')}</>
                      )}
                    </Button>
                  </>
                )}
              </div>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(doc.id)}
                >
                  <Trash2 className="w-3 h-3" />
                  {t('حذف', 'Delete')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add New Document Dialog ──────────────────────────────────

interface AddDocumentFormProps {
  entityType: EntityType;
  entityId: string;
  allowedCategories?: string[];
  onAdd: (doc: any) => void;
  onCancel: () => void;
}

function AddDocumentForm({ entityType, entityId, allowedCategories, onAdd, onCancel }: AddDocumentFormProps) {
  const t = useT();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [formData, setFormData] = useState({
    document_type: '' as DocumentType | '',
    document_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    nationality: '',
    date_of_birth: '',
    notes: '',
  });

  const categories = allowedCategories || Object.keys(DOCUMENT_CATEGORIES);

  const groupedTypes = useMemo(() => {
    const groups: Record<string, { type: DocumentType; info: typeof DOCUMENT_TYPE_LABELS[DocumentType] }[]> = {};
    Object.entries(DOCUMENT_TYPE_LABELS).forEach(([type, info]) => {
      if (categories.includes(info.category)) {
        if (!groups[info.category]) groups[info.category] = [];
        groups[info.category].push({ type: type as DocumentType, info });
      }
    });
    return groups;
  }, [categories]);

  const handleSubmit = () => {
    if (!formData.document_type) return;
    onAdd({
      entity_type: entityType,
      entity_id: entityId,
      ...formData,
      document_type: formData.document_type,
    });
  };

  const isIdentityType = ['national_id', 'passport', 'residence_permit', 'military_id'].includes(formData.document_type);

  return (
    <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/30 dark:bg-blue-950/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          {t('إضافة مستند جديد', 'Add New Document')}
        </h4>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Document Type Selector */}
      <div>
        <label className="text-[10px] text-gray-500 font-semibold uppercase mb-1 block">
          {t('نوع المستند', 'Document Type')} *
        </label>
        <Select
          value={formData.document_type}
          onValueChange={(v) => setFormData(p => ({ ...p, document_type: v as DocumentType }))}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={t('اختر نوع المستند...', 'Select document type...')} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedTypes).map(([category, types]) => (
              <React.Fragment key={category}>
                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase">
                  {isAr
                    ? (DOCUMENT_CATEGORIES as any)[category]?.ar
                    : (DOCUMENT_CATEGORIES as any)[category]?.en}
                </div>
                {types.map(({ type, info }) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{isAr ? info.ar : info.en}</span>
                    </span>
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Form Fields — show after selecting type */}
      {formData.document_type && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
                {t('رقم الوثيقة', 'Document Number')}
              </label>
              <Input
                value={formData.document_number}
                onChange={(e) => setFormData(p => ({ ...p, document_number: e.target.value }))}
                dir="ltr"
                className="h-8 text-sm"
                placeholder={t('رقم الوثيقة', 'Document number')}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
                {t('جهة الإصدار', 'Issuing Authority')}
              </label>
              <Input
                value={formData.issuing_authority}
                onChange={(e) => setFormData(p => ({ ...p, issuing_authority: e.target.value }))}
                className="h-8 text-sm"
                placeholder={t('جهة الإصدار', 'Issuing authority')}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
                {t('تاريخ الإصدار', 'Issue Date')}
              </label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(p => ({ ...p, issue_date: e.target.value }))}
                dir="ltr"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
                {t('تاريخ الانتهاء', 'Expiry Date')}
              </label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(p => ({ ...p, expiry_date: e.target.value }))}
                dir="ltr"
                className="h-8 text-sm"
              />
            </div>

            {/* Identity-specific fields */}
            {isIdentityType && (
              <>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
                    {t('الجنسية', 'Nationality')}
                  </label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => setFormData(p => ({ ...p, nationality: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
                    {t('تاريخ الميلاد', 'Date of Birth')}
                  </label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(p => ({ ...p, date_of_birth: e.target.value }))}
                    dir="ltr"
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5 block">
              {t('ملاحظات', 'Notes')}
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="text-sm"
              placeholder={t('ملاحظات اختيارية...', 'Optional notes...')}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit}>
              <Plus className="w-3 h-3" />
              {t('إضافة المستند', 'Add Document')}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
              {t('إلغاء', 'Cancel')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export function IdentityDocumentsSection({
  entityType,
  entityId,
  isEditable,
  allowedCategories,
  bankingOnly,
  remittanceId,
}: IdentityDocumentsSectionProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const categories = bankingOnly ? ['banking'] : allowedCategories;

  // ─── Query ────────────────────────────────────────────────────
  const queryKey = ['entity_documents', entityType, entityId];

  const { data: documents = [], isLoading } = useCachedQuery({
    queryKey,
    queryFn: () => entityDocumentService.getByEntity(entityType, entityId),
    enabled: !!entityId,
    staleTime: 30_000,
  });

  // ─── Mutations ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (doc: any) => entityDocumentService.create(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EntityDocument> }) =>
      entityDocumentService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => entityDocumentService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => entityDocumentService.setPrimary(id, entityType, entityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // ─── Handlers ──────────────────────────────────────────────

  const handleAdd = useCallback((doc: any) => {
    createMutation.mutate(doc);
  }, [createMutation]);

  const handleUpdate = useCallback((id: string, updates: Partial<EntityDocument>) => {
    updateMutation.mutate({ id, updates });
  }, [updateMutation]);

  const handleDelete = useCallback((id: string) => {
    if (confirm(t('هل أنت متأكد من حذف هذا المستند؟', 'Are you sure you want to delete this document?'))) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleSetPrimary = useCallback((id: string) => {
    setPrimaryMutation.mutate(id);
  }, [setPrimaryMutation]);

  const handleUploadAttachment = useCallback(async (docId: string, file: File) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    try {
      await entityDocumentService.addAttachment(docId, file, doc.attachments || []);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, [documents, queryClient, queryKey]);

  const handleRemoveAttachment = useCallback(async (docId: string, url: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    try {
      await entityDocumentService.removeAttachment(docId, url, doc.attachments || []);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      console.error('Remove attachment failed:', err);
    }
  }, [documents, queryClient, queryKey]);

  // ─── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const identityDocs = documents.filter(d =>
      ['national_id', 'passport', 'residence_permit', 'driving_license', 'military_id'].includes(d.document_type)
    );
    const expiredDocs = documents.filter(d => d.status === 'expired' || (d.expiry_date && new Date(d.expiry_date) < new Date()));
    const totalAttachments = documents.reduce((sum, d) => sum + (d.attachments || []).length, 0);

    return {
      total: documents.length,
      identity: identityDocs.length,
      expired: expiredDocs.length,
      attachments: totalAttachments,
      isComplete: identityDocs.length > 0 && identityDocs.some(d => d.document_number),
    };
  }, [documents]);

  // ─── Render ─────────────────────────────────────────────────

  if (!entityId) return null;

  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stats.isComplete ? (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Shield className="w-3 h-3 me-0.5" />
              {t('مُكتمل', 'Complete')}
            </Badge>
          ) : stats.total > 0 ? (
            <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="w-3 h-3 me-0.5" />
              {t('غير مُكتمل', 'Incomplete')}
            </Badge>
          ) : (
            <Badge className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {t('لا توجد مستندات', 'No documents')}
            </Badge>
          )}
          {stats.expired > 0 && (
            <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30">
              <AlertTriangle className="w-3 h-3 me-0.5" />
              {stats.expired} {t('منتهية', 'expired')}
            </Badge>
          )}
          {stats.attachments > 0 && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Paperclip className="w-3 h-3" /> {stats.attachments}
            </span>
          )}
        </div>
        {isEditable && !showAddForm && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-3 h-3" />
            {t('إضافة مستند', 'Add Document')}
          </Button>
        )}
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isEditable={isEditable}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onSetPrimary={handleSetPrimary}
              onUploadAttachment={handleUploadAttachment}
              onRemoveAttachment={handleRemoveAttachment}
            />
          ))}
        </div>
      ) : !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <FileText className="w-8 h-8 text-gray-200 mb-2" />
          <p className="text-xs text-gray-400">
            {t('لم يتم إضافة أي مستندات بعد', 'No documents added yet')}
          </p>
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-blue-600 gap-1"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-3 h-3" />
              {t('إضافة أول مستند', 'Add first document')}
            </Button>
          )}
        </div>
      ) : null}

      {/* Add Form */}
      {showAddForm && (
        <AddDocumentForm
          entityType={entityType}
          entityId={entityId}
          allowedCategories={categories}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Warning for no KYC */}
      {!isLoading && stats.identity === 0 && !showAddForm && !bankingOnly && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t(
              'لم يتم إدخال مستندات هوية — يُنصح بإكمال بيانات KYC',
              'No identity documents added — completing KYC is recommended'
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default IdentityDocumentsSection;
