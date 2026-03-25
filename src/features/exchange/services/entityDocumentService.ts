/**
 * ════════════════════════════════════════════════════════════════
 * 📄 Entity Document Service — خدمة المستندات الديناميكية
 * ════════════════════════════════════════════════════════════════
 * CRUD + Attachments + Activity Log for entity_documents
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────

export type EntityType = 'customer' | 'agent' | 'partner' | 'remittance' | 'transaction';

export type DocumentType =
  // هويات شخصية
  | 'national_id' | 'passport' | 'residence_permit' | 'driving_license' | 'military_id'
  // مستندات تجارية
  | 'trade_license' | 'tax_certificate' | 'commercial_register'
  // مستندات بنكية (SWIFT)
  | 'swift_notice' | 'bank_statement' | 'bank_guarantee' | 'transfer_receipt'
  // عقود
  | 'contract' | 'agreement' | 'power_of_attorney'
  // أخرى
  | 'other';

export type DocumentStatus = 'active' | 'expired' | 'revoked' | 'pending_verification';

export interface DocumentAttachment {
  url: string;
  name: string;
  type: string;      // mime type
  size: number;       // bytes
  uploaded_at: string; // ISO date
}

export interface EntityDocument {
  id: string;
  tenant_id: string;
  company_id: string;
  entity_type: EntityType;
  entity_id: string;
  document_type: DocumentType;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  remittance_id: string | null;
  status: DocumentStatus;
  is_primary: boolean;
  is_verified: boolean;
  notes: string | null;
  metadata: Record<string, any>;
  attachments: DocumentAttachment[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EntityDocumentInsert = Partial<EntityDocument> & {
  entity_type: EntityType;
  entity_id: string;
  document_type: DocumentType;
};

// ─── Document Type Labels ─────────────────────────────────────

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { ar: string; en: string; icon: string; category: string }> = {
  // هويات شخصية
  national_id:        { ar: 'بطاقة هوية وطنية', en: 'National ID', icon: '🪪', category: 'identity' },
  passport:           { ar: 'جواز سفر', en: 'Passport', icon: '🛂', category: 'identity' },
  residence_permit:   { ar: 'تصريح إقامة', en: 'Residence Permit', icon: '📋', category: 'identity' },
  driving_license:    { ar: 'رخصة قيادة', en: 'Driving License', icon: '🚗', category: 'identity' },
  military_id:        { ar: 'بطاقة عسكرية', en: 'Military ID', icon: '🎖️', category: 'identity' },
  // مستندات تجارية
  trade_license:      { ar: 'رخصة تجارية', en: 'Trade License', icon: '🏪', category: 'commercial' },
  tax_certificate:    { ar: 'شهادة ضريبية', en: 'Tax Certificate', icon: '📜', category: 'commercial' },
  commercial_register:{ ar: 'سجل تجاري', en: 'Commercial Register', icon: '📖', category: 'commercial' },
  // مستندات بنكية
  swift_notice:       { ar: 'إشعار سويفت', en: 'SWIFT Notice', icon: '🏦', category: 'banking' },
  bank_statement:     { ar: 'كشف حساب بنكي', en: 'Bank Statement', icon: '📊', category: 'banking' },
  bank_guarantee:     { ar: 'ضمان بنكي', en: 'Bank Guarantee', icon: '🔒', category: 'banking' },
  transfer_receipt:   { ar: 'إيصال تحويل', en: 'Transfer Receipt', icon: '📧', category: 'banking' },
  // عقود
  contract:           { ar: 'عقد', en: 'Contract', icon: '📝', category: 'legal' },
  agreement:          { ar: 'اتفاقية', en: 'Agreement', icon: '🤝', category: 'legal' },
  power_of_attorney:  { ar: 'وكالة', en: 'Power of Attorney', icon: '⚖️', category: 'legal' },
  // أخرى
  other:              { ar: 'أخرى', en: 'Other', icon: '📄', category: 'other' },
};

export const DOCUMENT_CATEGORIES = {
  identity:   { ar: 'هويات شخصية', en: 'Identity Documents' },
  commercial: { ar: 'مستندات تجارية', en: 'Commercial Documents' },
  banking:    { ar: 'مستندات بنكية', en: 'Banking Documents' },
  legal:      { ar: 'عقود واتفاقيات', en: 'Contracts & Agreements' },
  other:      { ar: 'أخرى', en: 'Other' },
};

// ─── Service ──────────────────────────────────────────────────

export const entityDocumentService = {

  /**
   * جلب جميع مستندات كيان معين
   */
  async getByEntity(entityType: EntityType, entityId: string): Promise<EntityDocument[]> {
    const { data, error } = await supabase
      .from('entity_documents')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entity documents:', error);
      return [];
    }
    return (data || []) as EntityDocument[];
  },

  /**
   * جلب مستندات حوالة (SWIFT notices)
   */
  async getByRemittance(remittanceId: string): Promise<EntityDocument[]> {
    const { data, error } = await supabase
      .from('entity_documents')
      .select('*')
      .eq('remittance_id', remittanceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching remittance documents:', error);
      return [];
    }
    return (data || []) as EntityDocument[];
  },

  /**
   * إنشاء مستند جديد
   */
  async create(doc: EntityDocumentInsert): Promise<EntityDocument | null> {
    const { data, error } = await supabase
      .from('entity_documents')
      .insert(doc)
      .select()
      .single();

    if (error) {
      console.error('Error creating entity document:', error);
      throw error;
    }
    return data as EntityDocument;
  },

  /**
   * تحديث مستند
   */
  async update(id: string, updates: Partial<EntityDocument>): Promise<EntityDocument | null> {
    const { id: _, tenant_id, company_id, created_at, created_by, ...safeUpdates } = updates as any;

    const { data, error } = await supabase
      .from('entity_documents')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating entity document:', error);
      throw error;
    }
    return data as EntityDocument;
  },

  /**
   * حذف مستند
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('entity_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting entity document:', error);
      throw error;
    }
    return true;
  },

  /**
   * تعيين مستند كأساسي (وإلغاء الأساسي السابق)
   */
  async setPrimary(id: string, entityType: EntityType, entityId: string): Promise<void> {
    // إلغاء الأساسي الحالي
    await supabase
      .from('entity_documents')
      .update({ is_primary: false })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_primary', true);

    // تعيين المستند الجديد كأساسي
    await supabase
      .from('entity_documents')
      .update({ is_primary: true })
      .eq('id', id);
  },

  /**
   * رفع مرفق وإضافته للمستند
   */
  async addAttachment(
    documentId: string,
    file: File,
    existingAttachments: DocumentAttachment[]
  ): Promise<DocumentAttachment[]> {
    // رفع الملف إلى Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `documents/${documentId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading attachment:', uploadError);
      throw uploadError;
    }

    // الحصول على URL العام
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

    const newAttachment: DocumentAttachment = {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      uploaded_at: new Date().toISOString(),
    };

    const updatedAttachments = [...existingAttachments, newAttachment];

    // تحديث المستند
    await supabase
      .from('entity_documents')
      .update({ attachments: updatedAttachments })
      .eq('id', documentId);

    return updatedAttachments;
  },

  /**
   * حذف مرفق من مستند
   */
  async removeAttachment(
    documentId: string,
    attachmentUrl: string,
    existingAttachments: DocumentAttachment[]
  ): Promise<DocumentAttachment[]> {
    const updatedAttachments = existingAttachments.filter(a => a.url !== attachmentUrl);

    await supabase
      .from('entity_documents')
      .update({ attachments: updatedAttachments })
      .eq('id', documentId);

    return updatedAttachments;
  },

  /**
   * التحقق من اكتمال KYC لكيان
   */
  async checkKYCStatus(entityType: EntityType, entityId: string): Promise<{
    isComplete: boolean;
    hasExpired: boolean;
    totalDocs: number;
    expiredDocs: number;
    primaryDoc: EntityDocument | null;
  }> {
    const docs = await this.getByEntity(entityType, entityId);
    const identityDocs = docs.filter(d =>
      ['national_id', 'passport', 'residence_permit', 'driving_license', 'military_id'].includes(d.document_type)
    );

    const expiredDocs = identityDocs.filter(d => d.status === 'expired');
    const primaryDoc = identityDocs.find(d => d.is_primary) || identityDocs[0] || null;

    return {
      isComplete: identityDocs.length > 0 && identityDocs.some(d => d.document_number),
      hasExpired: expiredDocs.length > 0,
      totalDocs: docs.length,
      expiredDocs: expiredDocs.length,
      primaryDoc,
    };
  },

  /**
   * عدد المستندات لكل كيان (للعرض في الجداول)
   */
  async getDocumentCounts(entityType: EntityType, entityIds: string[]): Promise<Map<string, number>> {
    if (!entityIds.length) return new Map();

    const { data, error } = await supabase
      .from('entity_documents')
      .select('entity_id')
      .eq('entity_type', entityType)
      .in('entity_id', entityIds);

    if (error) return new Map();

    const counts = new Map<string, number>();
    (data || []).forEach((d: any) => {
      counts.set(d.entity_id, (counts.get(d.entity_id) || 0) + 1);
    });
    return counts;
  },
};

export default entityDocumentService;
