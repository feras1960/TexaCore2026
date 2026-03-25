-- ═══════════════════════════════════════════════════════════════
-- إصلاح النقص في جدول fabric_materials
-- إضافة عمود company_id المفقود
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- التحقق وإضافة company_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'company_id') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN company_id UUID DEFAULT NULL;
        RAISE NOTICE 'Added company_id column to fabric_materials';
        
        -- إنشاء Index لتحسين الأداء
        CREATE INDEX IF NOT EXISTS idx_fabric_materials_company ON public.fabric_materials(company_id);
    END IF;

    -- التحقق وإضافة group_id (للاحتياط، بما أننا هنا)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fabric_materials' AND column_name = 'group_id') THEN
        ALTER TABLE public.fabric_materials ADD COLUMN group_id UUID DEFAULT NULL REFERENCES public.fabric_groups(id);
        RAISE NOTICE 'Added group_id column to fabric_materials';
        
        CREATE INDEX IF NOT EXISTS idx_fabric_materials_group ON public.fabric_materials(group_id);
    END IF;

END $$;

-- تحديث company_id للمواد التي لا تملك قيمة (اختياري، يعتمد على البيانات الموجودة)
-- سنفترض أننا نريد تعيين company_id من أول شركة موجودة إذا كان فارغاً لضمان الظهور
UPDATE public.fabric_materials
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

-- إعادة تفعيل السياسات للتأكد من أنها تستخدم العمود الجديد بشكل صحيح
ALTER TABLE public.fabric_materials ENABLE ROW LEVEL SECURITY;
