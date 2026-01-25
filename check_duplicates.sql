-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 فحص شامل للموديولات المكررة
-- التاريخ: 24 يناير 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. فحص العقارات (Real Estate)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    id, 
    module_code, 
    name_ar, 
    name_en,
    created_at,
    'Real Estate Duplicate' as issue
FROM modules 
WHERE module_code IN ('real_estate', 'realestate', 'real-estate')
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. فحص المشتريات (Purchases)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    id, 
    module_code, 
    name_ar, 
    name_en,
    created_at,
    'Purchases Duplicate' as issue
FROM modules 
WHERE module_code IN ('purchases', 'purchase', 'buying')
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. فحص المحاسبة (Accounting)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    id, 
    module_code, 
    name_ar, 
    name_en,
    created_at,
    'Accounting Duplicate' as issue
FROM modules 
WHERE module_code IN ('accounting', 'accounts', 'finance')
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. فحص المخازن/المستودعات (Inventory/Warehouse)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    id, 
    module_code, 
    name_ar, 
    name_en,
    created_at,
    'Inventory/Warehouse Duplicate' as issue
FROM modules 
WHERE module_code IN ('inventory', 'warehouse', 'warehouses', 'storage', 'stock')
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. فحص المبيعات (Sales)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    id, 
    module_code, 
    name_ar, 
    name_en,
    created_at,
    'Sales Duplicate' as issue
FROM modules 
WHERE module_code IN ('sales', 'sale', 'selling')
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. فحص نقاط البيع (POS)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    id, 
    module_code, 
    name_ar, 
    name_en,
    created_at,
    'POS Duplicate' as issue
FROM modules 
WHERE module_code IN ('pos', 'point_of_sale', 'pointofsale')
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ملخص المكررات (إجمالي)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    module_code,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️ مكرر'
        ELSE '✅ OK'
    END as status
FROM modules
GROUP BY module_code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. جميع الموديولات مع التفاصيل
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    module_code,
    name_ar,
    name_en,
    category,
    display_order,
    is_active,
    created_at
FROM modules
ORDER BY 
    CASE 
        WHEN category = 'core' THEN 1
        WHEN category = 'basic' THEN 2
        WHEN category = 'operations' THEN 3
        WHEN category = 'specialized' THEN 4
        WHEN category = 'advanced' THEN 5
        ELSE 6
    END,
    display_order;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ انتهى الفحص!
-- ═══════════════════════════════════════════════════════════════════════════
-- بعد تنفيذ هذا الملف، سترى:
-- 1. جميع المكررات لكل نوع
-- 2. ملخص بعدد المكررات
-- 3. قائمة كاملة بجميع الموديولات
--
-- استخدم الـ id لحذف المكررات القديمة
