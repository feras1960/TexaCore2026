-- ═══════════════════════════════════════════════════════════════
-- إصلاح RLS Policies لـ user_profiles (للسماح بالإدراج والتحديث)
-- ═══════════════════════════════════════════════════════════════

-- حذف جميع الـ Policies القديمة
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile (including company)" ON user_profiles;

-- Policy للإدراج: يسمح للمستخدم بإدراج ملفه الشخصي
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Policy للتحديث: يسمح للمستخدم بتحديث ملفه الشخصي (بما في ذلك company_id)
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- التحقق من أن جميع الـ Policies تم إنشاؤها
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
