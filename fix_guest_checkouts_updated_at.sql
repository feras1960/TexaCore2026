-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 إصلاح: إضافة عمود updated_at لجدول guest_checkouts
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة العمود إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_checkouts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE guest_checkouts 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE '✅ تمت إضافة عمود updated_at لجدول guest_checkouts';
    ELSE
        RAISE NOTICE '⏭️ عمود updated_at موجود بالفعل';
    END IF;
END $$;

-- التحقق
SELECT 
    '✅ التحقق' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'guest_checkouts'
  AND column_name IN ('created_at', 'updated_at', 'expires_at')
ORDER BY ordinal_position;
