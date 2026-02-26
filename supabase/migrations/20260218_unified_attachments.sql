-- ═══════════════════════════════════════════════════════════════
-- Migration: Unified Attachments Enhancement
-- Date: 2026-02-18
-- Purpose: تحسين نظام المرفقات الموحد — دعم الصور + حقول إضافية
-- ═══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- 1. أعمدة إضافية لجدول documents
-- ══════════════════════════════════════════════════

ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_title VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_number VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN documents.document_title IS 'اسم المستند الوصفي — اختياري';
COMMENT ON COLUMN documents.document_number IS 'رقم المستند الأصلي (رقم الفاتورة/العقد/البوليصة) — اختياري';
COMMENT ON COLUMN documents.document_date IS 'تاريخ المستند الأصلي — اختياري';
COMMENT ON COLUMN documents.notes IS 'ملاحظات إضافية — اختياري';

-- ══════════════════════════════════════════════════
-- 2. تحديث Storage Bucket — دعم الصور + حد 5MB
-- ══════════════════════════════════════════════════

-- إنشاء Bucket إذا لم يكن موجوداً + تحديث الإعدادات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'document-attachments',
    'document-attachments',
    false,
    5242880,  -- 5 MB (5 * 1024 * 1024)
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

-- ══════════════════════════════════════════════════
-- 3. Storage RLS Policies (idempotent)
-- ══════════════════════════════════════════════════

-- حذف السياسات القديمة إن وجدت (لتجنب التعارض)
DROP POLICY IF EXISTS "Tenant users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can delete attachments" ON storage.objects;

-- رفع: المستخدم يرفع فقط في مجلد tenant الخاص به
CREATE POLICY "Tenant users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'document-attachments'
    AND (storage.foldername(name))[1] IN (
        SELECT t.id::text 
        FROM tenants t
        JOIN companies c ON c.tenant_id = t.id
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = auth.uid()
    )
);

-- قراءة: المستخدم يقرأ فقط ملفات tenant الخاص به
CREATE POLICY "Tenant users can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'document-attachments'
    AND (storage.foldername(name))[1] IN (
        SELECT t.id::text 
        FROM tenants t
        JOIN companies c ON c.tenant_id = t.id
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = auth.uid()
    )
);

-- حذف: المستخدم يحذف فقط ملفات tenant الخاص به
CREATE POLICY "Tenant users can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'document-attachments'
    AND (storage.foldername(name))[1] IN (
        SELECT t.id::text 
        FROM tenants t
        JOIN companies c ON c.tenant_id = t.id
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = auth.uid()
    )
);

-- ══════════════════════════════════════════════════
-- 4. فهرس إضافي للبحث بالعنوان
-- ══════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_documents_title 
ON documents(document_title) WHERE document_title IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_number
ON documents(document_number) WHERE document_number IS NOT NULL;

-- ══════════════════════════════════════════════════
-- 5. تحديث سياسات RLS لجدول documents (UPDATE)
-- ══════════════════════════════════════════════════

-- إضافة سياسة UPDATE (غير موجودة في Migration القديم)
DROP POLICY IF EXISTS "Users can update documents of their tenant" ON documents;
CREATE POLICY "Users can update documents of their tenant" ON documents
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM companies WHERE id IN (
                SELECT company_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- ✅ Migration Complete
-- ═══════════════════════════════════════════════════════════════
