-- =====================================================
-- FIX_platform_owner_v3.sql
-- إصلاح صلاحيات مالك المنصة
-- تاريخ: 2026-02-05
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 1: عرض هيكل الجداول أولاً
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 هيكل جدول roles:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'roles'
ORDER BY ordinal_position;

SELECT '📋 هيكل جدول super_admins:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'super_admins'
ORDER BY ordinal_position;

SELECT '📋 هيكل جدول user_role_assignments:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_role_assignments'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 2: عرض الأدوار الموجودة
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 الأدوار الموجودة:' as info;
SELECT * FROM roles LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 3: عرض super_admins الموجودين
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 Super Admins الموجودين:' as info;
SELECT * FROM super_admins;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 4: البحث عن المستخدم
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 بيانات المستخدم feras1960@gmail.com:' as info;
SELECT 
    id,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'feras1960@gmail.com';

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 5: عرض أدوار المستخدم الحالية
-- ═══════════════════════════════════════════════════════════════

SELECT '📋 أدوار المستخدم الحالية:' as info;
SELECT 
    ura.*,
    r.code as role_code
FROM user_role_assignments ura
LEFT JOIN roles r ON r.id = ura.role_id
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'feras1960@gmail.com';
