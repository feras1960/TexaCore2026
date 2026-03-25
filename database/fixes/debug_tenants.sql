-- ============================================================================
-- التحقق من بيانات المشتركين (Tenants)
-- ============================================================================

-- 1. عدد المشتركين في جدول tenants
SELECT 
    '📊 إجمالي المشتركين في tenants' as test,
    COUNT(*) as total
FROM tenants;

-- 2. عينة من المشتركين
SELECT 
    '👥 عينة من المشتركين' as test,
    id,
    name,
    code,
    status
FROM tenants
LIMIT 5;

-- 3. المشتركين مع المنتجات
SELECT 
    '🏢 المشتركين والمنتجات' as test,
    t.id,
    t.name,
    t.code,
    t.status,
    sp.name as product_name
FROM tenants t
LEFT JOIN saas_products sp ON t.product_id = sp.id
LIMIT 10;
