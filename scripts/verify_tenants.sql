-- الاستعلام عن جميع المشتركين (Tenants) مع تاريخ انتهاء الاشتراك
-- يتم جلب تاريخ انتهاء الاشتراك من جدول subscriptions

SELECT 
    t.name,
    t.code,
    t.status,
    t.email,
    t.phone,
    (
        SELECT current_period_end 
        FROM subscriptions s 
        WHERE s.tenant_id = t.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as subscription_end,
    t.created_at
FROM 
    tenants t
ORDER BY 
    t.created_at DESC;
