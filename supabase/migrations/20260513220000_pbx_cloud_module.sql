-- ========================================================
-- TexaCore PBX Cloud Module (Multi-Tenant SaaS)
-- Phase 1: Database Schema & RLS
-- ========================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PBX Extensions
CREATE TABLE IF NOT EXISTS public.pbx_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    extension_number VARCHAR(10) NOT NULL,
    display_name TEXT NOT NULL,
    sip_password TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- ERP User Link
    voicemail_enabled BOOLEAN DEFAULT false,
    call_recording BOOLEAN DEFAULT false,
    max_concurrent_calls INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, extension_number)
);

-- 2. PBX Ring Groups
CREATE TABLE IF NOT EXISTS public.pbx_ring_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strategy TEXT NOT NULL CHECK (strategy IN ('ringall', 'roundrobin', 'sequential')),
    ring_timeout INTEGER DEFAULT 20,
    fallback_action TEXT NOT NULL CHECK (fallback_action IN ('voicemail', 'ivr', 'extension', 'hangup')),
    fallback_target TEXT,
    members JSONB DEFAULT '[]'::jsonb, -- Array of extension_numbers
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PBX Trunks (Gateways)
CREATE TABLE IF NOT EXISTS public.pbx_trunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sip_trunk', 'voip_gateway', 'gsm_gateway')),
    host TEXT NOT NULL,
    port INTEGER DEFAULT 5060,
    username TEXT,
    password TEXT,
    codecs TEXT[] DEFAULT ARRAY['ulaw', 'alaw', 'gsm', 'g729'],
    max_channels INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    outbound_caller_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PBX Smart IVR Menus
CREATE TABLE IF NOT EXISTS public.pbx_ivr_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('greeting', 'hold', 'out_of_office', 'busy')),
    text_content TEXT,
    voice_id TEXT,
    audio_url TEXT,
    bgm_enabled BOOLEAN DEFAULT false,
    bgm_volume NUMERIC DEFAULT 0.15,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PBX Call Routing (Inbound/Outbound Rules)
CREATE TABLE IF NOT EXISTS public.pbx_call_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 10,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    condition_type TEXT NOT NULL CHECK (condition_type IN ('time_based', 'caller_id', 'did_number', 'prefix', 'all')),
    condition_value JSONB DEFAULT '{}'::jsonb,
    action TEXT NOT NULL CHECK (action IN ('ring_group', 'extension', 'ivr', 'voicemail', 'trunk', 'external')),
    action_target TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PBX Call Logs (CDR - Call Detail Records)
CREATE TABLE IF NOT EXISTS public.pbx_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    call_date TIMESTAMPTZ DEFAULT now(),
    caller TEXT NOT NULL,
    callee TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
    duration_seconds INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('answered', 'missed', 'busy', 'failed', 'voicemail')),
    recording_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ========================================================
-- Row Level Security (RLS) Policies
-- Ensures each company can only access its own PBX data
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE public.pbx_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbx_ring_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbx_trunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbx_ivr_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbx_call_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbx_call_logs ENABLE ROW LEVEL SECURITY;


-- Common Policy Function (if you have one, or just standard role checks)
-- Assuming TexaCore's standard policy structure:
-- (auth.uid() IN (SELECT user_id FROM user_profiles WHERE company_id = table.company_id))

-- 1. PBX Extensions Policies
CREATE POLICY "Users can view extensions in their company"
ON public.pbx_extensions FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage extensions in their company"
ON public.pbx_extensions FOR ALL
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 2. PBX Ring Groups Policies
CREATE POLICY "Users can view ring groups in their company"
ON public.pbx_ring_groups FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage ring groups in their company"
ON public.pbx_ring_groups FOR ALL
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 3. PBX Trunks Policies
CREATE POLICY "Users can view trunks in their company"
ON public.pbx_trunks FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage trunks in their company"
ON public.pbx_trunks FOR ALL
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 4. PBX Smart IVR Menus Policies
CREATE POLICY "Users can view IVR menus in their company"
ON public.pbx_ivr_menus FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage IVR menus in their company"
ON public.pbx_ivr_menus FOR ALL
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 5. PBX Call Routing Policies
CREATE POLICY "Users can view call routing in their company"
ON public.pbx_call_routing FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage call routing in their company"
ON public.pbx_call_routing FOR ALL
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 6. PBX Call Logs Policies (Usually Read-Only or managed by service role)
CREATE POLICY "Users can view call logs in their company"
ON public.pbx_call_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Allowing inserts if needed via API, but normally handled by Asterisk webhook
CREATE POLICY "System can insert call logs"
ON public.pbx_call_logs FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()));


-- ========================================================
-- Triggers for updated_at
-- ========================================================

CREATE OR REPLACE FUNCTION update_pbx_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pbx_extensions_modtime BEFORE UPDATE ON public.pbx_extensions FOR EACH ROW EXECUTE FUNCTION update_pbx_updated_at_column();
CREATE TRIGGER update_pbx_ring_groups_modtime BEFORE UPDATE ON public.pbx_ring_groups FOR EACH ROW EXECUTE FUNCTION update_pbx_updated_at_column();
CREATE TRIGGER update_pbx_trunks_modtime BEFORE UPDATE ON public.pbx_trunks FOR EACH ROW EXECUTE FUNCTION update_pbx_updated_at_column();
CREATE TRIGGER update_pbx_ivr_menus_modtime BEFORE UPDATE ON public.pbx_ivr_menus FOR EACH ROW EXECUTE FUNCTION update_pbx_updated_at_column();
CREATE TRIGGER update_pbx_call_routing_modtime BEFORE UPDATE ON public.pbx_call_routing FOR EACH ROW EXECUTE FUNCTION update_pbx_updated_at_column();

-- End of File
