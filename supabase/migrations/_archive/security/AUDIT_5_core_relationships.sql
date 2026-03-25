-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 استعلام 5: هيكلية الجداول الأساسية وعلاقاتها
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    tc.table_name as "من_جدول",
    kcu.column_name as "من_عمود",
    ccu.table_name AS "إلى_جدول",
    ccu.column_name AS "إلى_عمود"
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (
        tc.table_name IN ('tenants', 'companies', 'branches', 'user_profiles', 'user_role_assignments')
        OR ccu.table_name IN ('tenants', 'companies', 'branches', 'user_profiles')
    )
ORDER BY tc.table_name;
