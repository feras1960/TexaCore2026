-- ═══════════════════════════════════════════════════════════════
-- إصلاح شامل: إضافة الأعمدة المفقودة وتحديث البيانات للشركة الحالية
-- Target Company: 1313232a-6ad3-4002-891c-a9a9e8849a93
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    target_company_id UUID := '1313232a-6ad3-4002-891c-a9a9e8849a93';
BEGIN
    -- 1. جدول fabric_groups: إضافة company_id إذا كان مفقوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_groups' AND column_name = 'company_id') THEN
        ALTER TABLE public.fabric_groups ADD COLUMN company_id UUID DEFAULT NULL;
        RAISE NOTICE 'Added company_id to fabric_groups';
        CREATE INDEX IF NOT EXISTS idx_fabric_groups_company ON public.fabric_groups(company_id);
    END IF;

    -- 2. جدول fabric_materials: إضافة company_id إذا كان مفقوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'company_id') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN company_id UUID DEFAULT NULL;
        RAISE NOTICE 'Added company_id to fabric_materials';
        CREATE INDEX IF NOT EXISTS idx_fabric_materials_company ON public.fabric_materials(company_id);
    END IF;

    -- 3. تحديث البيانات لربطها بالشركة الحالية
    
    -- تحديث المجموعات
    UPDATE public.fabric_groups
    SET company_id = target_company_id
    WHERE company_id IS NULL OR company_id != target_company_id;
    
    -- تحديث المواد
    UPDATE public.fabric_materials
    SET company_id = target_company_id
    WHERE company_id IS NULL OR company_id != target_company_id;

    RAISE NOTICE 'Updated all data to company %', target_company_id;

END $$;
