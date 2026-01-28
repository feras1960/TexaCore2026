-- ============================================================================
-- التحقق من بيانات العملاء (Subscribers/Tenants)
-- ============================================================================

-- 1. عدد العملاء الإجمالي
SELECT 
    '📊 إجمالي العملاء' as test,
    COUNT(*) as total_tenants,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tenants,
    SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial_tenants,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tenants
FROM tenants;

-- 2. عرض أول 10 عملاء مع كل التفاصيل
SELECT 
    '👥 عينة من العملاء' as test,
    id,
    name,
    code,
    email,
    phone,
    contact_person,
    tax_number,
    status,
    product_id
FROM tenants
ORDER BY created_at DESC
LIMIT 10;

-- 3. العملاء مع أسماء المنتجات
SELECT 
    '🏢 العملاء والمنتجات' as test,
    t.name as tenant_name,
    t.code as tenant_code,
    t.status,
    sp.name as product_name,
    sp.code as product_code
FROM tenants t
LEFT JOIN saas_products sp ON t.product_id = sp.id
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. العملاء مع الاشتراكات
SELECT 
    '📋 العملاء والاشتراكات' as test,
    t.name as tenant_name,
    t.code as tenant_code,
    ts.id as subscription_id,
    ts.status as subscription_status,
    spl.name_en as plan_name,
    spl.price_monthly,
    spl.currency
FROM tenants t
LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
LEFT JOIN subscription_plans spl ON ts.plan_id = spl.id
ORDER BY t.created_at DESC
LIMIT 10;

-- 5. العملاء بدون اشتراكات
SELECT 
    '⚠️ عملاء بدون اشتراك' as test,
    COUNT(*) as count_without_subscription
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_subscriptions ts 
    WHERE ts.tenant_id = t.id
);

-- 6. عملاء بدون منتج
SELECT 
    '⚠️ عملاء بدون منتج' as test,
    COUNT(*) as count_without_product
FROM tenants
WHERE product_id IS NULL;

-- 7. اختبار البحث - العملاء الذين يحتوي اسمهم على حرف معين
SELECT 
    '🔍 اختبار البحث' as test,
    name,
    code,
    phone,
    email
FROM tenants
WHERE name ILIKE '%a%' -- غيّر الحرف للاختبار
LIMIT 5;

-- 8. إحصائيات شاملة
SELECT 
    '📈 الإحصائيات الشاملة' as test,
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM tenants WHERE status = 'active') as active_tenants,
    (SELECT COUNT(*) FROM tenant_subscriptions) as total_subscriptions,
    (SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'active') as active_subscriptions;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ تم التحقق من بيانات العملاء';
END $$;
