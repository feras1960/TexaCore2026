-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 2: إنشاء صلاحيات Full Admin
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ استبدل القيم التالية بالقيم الحقيقية من الخطوة 1:
--
-- YOUR_USER_ID = (user_id من الخطوة 1)
-- YOUR_TENANT_ID = (tenant_id من الخطوة 1)
-- YOUR_COMPANY_ID = (company_id من الخطوة 1)
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1: التحقق من القيم (نفذ هذا أولاً للتأكد)
DO $$
DECLARE
    v_user_id UUID := 'YOUR_USER_ID'::UUID;  -- ← ضع user_id هنا
    v_tenant_id UUID := 'YOUR_TENANT_ID'::UUID;  -- ← ضع tenant_id هنا
    v_company_id UUID := 'YOUR_COMPANY_ID'::UUID;  -- ← ضع company_id هنا
    v_user_exists BOOLEAN;
    v_tenant_exists BOOLEAN;
    v_company_exists BOOLEAN;
BEGIN
    -- التحقق من وجود المستخدم
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id) INTO v_user_exists;
    
    -- التحقق من وجود الـ tenant
    SELECT EXISTS(SELECT 1 FROM tenants WHERE id = v_tenant_id) INTO v_tenant_exists;
    
    -- التحقق من وجود الـ company
    SELECT EXISTS(SELECT 1 FROM companies WHERE id = v_company_id) INTO v_company_exists;
    
    -- عرض النتائج
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'التحقق من البيانات:';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    
    IF v_user_exists THEN
        RAISE NOTICE '✅ User موجود: %', v_user_id;
    ELSE
        RAISE NOTICE '❌ User غير موجود: %', v_user_id;
        RAISE EXCEPTION 'User ID غير صحيح! راجع الخطوة 1';
    END IF;
    
    IF v_tenant_exists THEN
        RAISE NOTICE '✅ Tenant موجود: %', v_tenant_id;
    ELSE
        RAISE NOTICE '❌ Tenant غير موجود: %', v_tenant_id;
        RAISE EXCEPTION 'Tenant ID غير صحيح! راجع الخطوة 1';
    END IF;
    
    IF v_company_exists THEN
        RAISE NOTICE '✅ Company موجودة: %', v_company_id;
    ELSE
        RAISE NOTICE '❌ Company غير موجودة: %', v_company_id;
        RAISE EXCEPTION 'Company ID غير صحيح! راجع الخطوة 1';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ جميع البيانات صحيحة! يمكنك المتابعة للخطوة 2.2';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════

-- 2.2: إنشاء صلاحيات full_admin على جميع الموديولات
-- ⚠️ نفذ هذا فقط بعد نجاح الخطوة 2.1
/*
INSERT INTO user_module_permissions (
    user_id,
    tenant_id,
    company_id,
    module_code,
    can_view,
    can_create,
    can_edit,
    can_delete,
    can_export,
    can_import,
    can_approve,
    can_manage_settings
)
SELECT 
    'YOUR_USER_ID'::UUID,  -- ← ضع user_id هنا
    'YOUR_TENANT_ID'::UUID,  -- ← ضع tenant_id هنا
    'YOUR_COMPANY_ID'::UUID,  -- ← ضع company_id هنا
    module_code,
    true, -- can_view
    true, -- can_create
    true, -- can_edit
    true, -- can_delete
    true, -- can_export
    true, -- can_import
    true, -- can_approve
    true  -- can_manage_settings
FROM modules
WHERE is_active = true
ON CONFLICT (user_id, tenant_id, company_id, module_code) 
DO UPDATE SET
    can_view = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    can_export = true,
    can_import = true,
    can_approve = true,
    can_manage_settings = true,
    updated_at = NOW();
*/

-- ═══════════════════════════════════════════════════════════════════════════

-- 2.3: التحقق من الصلاحيات المُنشأة
-- نفذ هذا بعد الخطوة 2.2
/*
SELECT 
    u.email,
    ump.module_code,
    m.name_ar,
    ump.can_view,
    ump.can_create,
    ump.can_edit,
    ump.can_delete,
    ump.can_export
FROM user_module_permissions ump
JOIN auth.users u ON ump.user_id = u.id
JOIN modules m ON ump.module_code = m.module_code
WHERE ump.user_id = 'YOUR_USER_ID'::UUID  -- ← ضع user_id هنا
ORDER BY m.display_order;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 📝 بعد تنفيذ هذا الملف:
-- ═══════════════════════════════════════════════════════════════════════════
--
-- سترى:
-- ✅ صلاحيات full_admin على ~32 موديول
-- ✅ كل الصلاحيات = true
-- ✅ جاهز للانتقال للخطوة 3
--
-- ═══════════════════════════════════════════════════════════════════════════
