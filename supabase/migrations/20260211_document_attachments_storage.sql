-- ═══════════════════════════════════════════════════════════════
-- Document Attachments Storage Bucket + RLS
-- For PDF attachments (contracts, invoices, bills of lading, etc.)
-- Max 3MB per file, 20MB total per document
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'document-attachments',
    'document-attachments',
    false,                          -- private bucket
    3145728,                        -- 3 MB in bytes (3 * 1024 * 1024)
    ARRAY['application/pdf']        -- PDF only
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 3145728,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Storage RLS Policies

-- Allow authenticated users to upload files to their tenant's folder
CREATE POLICY "Tenant users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'document-attachments'
    AND (storage.foldername(name))[1] IN (
        SELECT c.id::text FROM companies c
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = auth.uid()
    )
);

-- Allow authenticated users to read their tenant's attachments
CREATE POLICY "Tenant users can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'document-attachments'
    AND (storage.foldername(name))[1] IN (
        SELECT c.id::text FROM companies c
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = auth.uid()
    )
);

-- Allow authenticated users to delete their tenant's attachments
CREATE POLICY "Tenant users can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'document-attachments'
    AND (storage.foldername(name))[1] IN (
        SELECT c.id::text FROM companies c
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = auth.uid()
    )
);
