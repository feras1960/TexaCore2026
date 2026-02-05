-- ═══════════════════════════════════════════════════════════════
-- إصلاح RLS Policies للشركات (للسماح بالقراءة للتطوير)
-- ═══════════════════════════════════════════════════════════════

-- حذف الـ Policy القديمة (إذا كانت موجودة)
DROP POLICY IF EXISTS "Users can view their company" ON companies;

-- إنشاء Policy جديدة تسمح بالقراءة للجميع (للتطوير فقط)
-- في الإنتاج يجب ربطها بالمستخدمين
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'companies' 
        AND policyname = 'Companies are viewable by all (dev)'
    ) THEN
        CREATE POLICY "Companies are viewable by all (dev)" ON companies
            FOR SELECT USING (true);
    END IF;
END $$;

-- يمكنك أيضاً إضافة Policies أخرى حسب الحاجة:
-- السماح بالإدراج (للتطوير)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'companies' 
        AND policyname = 'Companies are insertable (dev)'
    ) THEN
        CREATE POLICY "Companies are insertable (dev)" ON companies
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- عرض الـ Policies الحالية
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'companies';
