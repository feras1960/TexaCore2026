-- =====================================================
-- CHECK_roles_only.sql - فحص هيكل جدول roles
-- =====================================================

-- عرض أعمدة جدول roles بالتفصيل
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'roles'
ORDER BY ordinal_position;
