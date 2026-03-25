-- ═══════════════════════════════════════════════════════════════
-- إصلاح شامل لـ RLS Policies على user_profiles
-- ═══════════════════════════════════════════════════════════════

-- عرض الـ Policies الحالية (للمعرفة)
SELECT 
    policyname, 
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- حذف جميع الـ Policies القديمة (للتأكد)
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile (including company)" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- 1. Policy للقراءة (SELECT)
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- 2. Policy للإدراج (INSERT) - مهم جداً
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 3. Policy للتحديث (UPDATE) - مهم جداً لـ upsert
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- التحقق النهائي من الـ Policies
SELECT 
    policyname, 
    cmd,
    permissive,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual 
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check 
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        ELSE 4
    END,
    policyname;
