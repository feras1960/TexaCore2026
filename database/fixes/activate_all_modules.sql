-- ═══════════════════════════════════════════════════════════════════════════
-- 🚀 تفعيل جميع الموديولات للـ tenant الخاص بك
-- المستخدم: feras1960@gmail.com
-- Tenant: NeXxov Platform
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. التحقق من الموديولات المفعلة حالياً لـ tenant الخاص بك
SELECT 
    t.code as tenant_code,
    COUNT(tm.module_code) as active_modules
FROM tenants t
LEFT JOIN tenant_modules tm ON t.id = tm.tenant_id AND tm.is_active = true
WHERE t.id = (
    SELECT tenant_id FROM user_profiles WHERE id = (
        SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
    )
)
GROUP BY t.code;

-- المتوقع: يجب أن يكون أقل من 32

-- ═══════════════════════════════════════════════════════════════════════════

-- 2. عرض الموديولات المفقودة (غير المفعلة)
SELECT 
    m.module_code,
    m.name_ar,
    m.name_en,
    'Not Activated for Tenant' as status
FROM modules m
WHERE m.is_active = true
AND NOT EXISTS (
    SELECT 1 
    FROM tenant_modules tm
    WHERE tm.module_code = m.module_code
    AND tm.tenant_id = (
        SELECT tenant_id FROM user_profiles WHERE id = (
            SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
        )
    )
    AND tm.is_active = true
)
ORDER BY m.display_order;

-- يجب أن ترى الموديولات المفقودة

-- ═══════════════════════════════════════════════════════════════════════════

-- 3. تفعيل جميع الموديولات النشطة للـ tenant الخاص بك
INSERT INTO tenant_modules (tenant_id, module_code, is_active)
SELECT 
    (SELECT tenant_id FROM user_profiles WHERE id = (
        SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
    )),
    module_code,
    true
FROM modules
WHERE is_active = true
ON CONFLICT (tenant_id, module_code) 
DO UPDATE SET 
    is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════

-- 4. التحقق النهائي
SELECT 
    t.code as tenant_code,
    COUNT(tm.module_code) as active_modules
FROM tenants t
LEFT JOIN tenant_modules tm ON t.id = tm.tenant_id AND tm.is_active = true
WHERE t.id = (
    SELECT tenant_id FROM user_profiles WHERE id = (
        SELECT id FROM auth.users WHERE email = 'feras1960@gmail.com'
    )
)
GROUP BY t.code;

-- المتوقع: 32 موديول نشط

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ انتهى! جميع الموديولات مفعلة الآن
-- ═══════════════════════════════════════════════════════════════════════════
