-- ========================================================
-- TexaCore PBX Cloud Module - Phase 3 (AI & Storage)
-- ========================================================

-- 1. Create AI Usage Quota Table
CREATE TABLE IF NOT EXISTS public.pbx_ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- e.g. '2026-05'
    characters_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, year_month)
);

-- RLS for pbx_ai_usage
ALTER TABLE public.pbx_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company AI usage"
ON public.pbx_ai_usage FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_pbx_ai_usage_modtime 
BEFORE UPDATE ON public.pbx_ai_usage 
FOR EACH ROW EXECUTE FUNCTION update_pbx_updated_at_column();

-- 2. Create Storage Bucket for PBX Media (Audio files)
-- We insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pbx_media', 'pbx_media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage Bucket (Public read, authenticated company upload)
-- Assuming we want anyone with the link to read it (Asterisk needs to download it)
-- But only company users can upload.
CREATE POLICY "Public Read Access for PBX Media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pbx_media' );

CREATE POLICY "Company Users can upload PBX Media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'pbx_media' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Company Users can update PBX Media"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'pbx_media' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Company Users can delete PBX Media"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'pbx_media' AND
    auth.role() = 'authenticated'
);
