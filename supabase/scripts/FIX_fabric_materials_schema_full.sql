-- ═══════════════════════════════════════════════════════════════
-- إصلاح شامل لهيكلية جدول fabric_materials
-- إضافة custom_fields وأعمدة أخرى مفقودة لتتوافق مع الـ Frontend
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- 1. إضافة custom_fields (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'custom_fields') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added custom_fields column';
    END IF;

    -- 2. التحقق من الأعمدة الأخرى الشائعة وإضافتها إن لم توجد
    
    -- min_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'min_stock') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN min_stock NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added min_stock column';
    END IF;

    -- reorder_point
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'reorder_point') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN reorder_point NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added reorder_point column';
    END IF;

    -- composition (تكوين المادة)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'composition') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN composition TEXT;
        RAISE NOTICE 'Added composition column';
    END IF;

    -- notes (ملاحظات)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'notes') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'status') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE 'Added status column';
    END IF;

     -- category (تصنيف نصي إضافي)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'category') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN category TEXT DEFAULT 'mixed';
        RAISE NOTICE 'Added category column';
    END IF;

    -- تنظيف الكاش (Supabase يقوم بذلك تلقائياً عند تغيير الـ Schema، ولكن للتأكيد)
    NOTIFY pgrst, 'reload schema';

END $$;
