-- ═══════════════════════════════════════════════════════════════════════════
-- 🟣 استعلام 4: سياسات user_profiles (فحص العزل الذاتي)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    policyname as "السياسة",
    cmd as "العملية",
    qual::text as "شرط USING",
    with_check::text as "شرط WITH CHECK"
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
