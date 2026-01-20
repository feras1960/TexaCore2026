-- ═══════════════════════════════════════════════════════════════
-- إصلاح RLS Policies للـ user_profiles (للسماح بالإدراج والتحديث)
-- ═══════════════════════════════════════════════════════════════

-- السماح للمستخدمين بإنشاء ملفاتهم الشخصية
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- السماح للمستخدمين بتحديث ملفاتهم الشخصية (بما في ذلك company_id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can update their own profile (including company)'
    ) THEN
        CREATE POLICY "Users can update their own profile (including company)" ON user_profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- عرض الـ Policies الحالية
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';
