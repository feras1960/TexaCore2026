-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 2: إنشاء صلاحيات Full Admin
-- المستخدم: fera3186@gmail.com
-- التاريخ: 24 يناير 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1: التحقق من البيانات (نفذ هذا أولاً)
DO $$
DECLARE
    v_user_id UUID := '65a5c73b-bb93-4c84-8ba8-155079b8736c'::UUID;
    v_tenant_id UUID := '6b1a9664-7692-4337-a3e8-2c12f786e573'::UUID;
    v_company_id UUID := '13232324-0b03-4882-491c-d93065b93a93'::UUID;
    v_user_exists BOOLEAN;
    v_tenant_exists BOOLEAN;
    v_company_exists BOOLEAN;
    v_modules_count INT;
BEGIN
    -- التحقق من وجود المستخدم
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id) INTO v_user_exists;
    
    -- التحقق من وجود الـ tenant
    SELECT EXISTS(SELECT 1 FROM tenants WHERE id = v_tenant_id) INTO v_tenant_exists;
    
    -- التحقق من وجود الـ company
    SELECT EXISTS(SELECT 1 FROM companies WHERE id = v_company_id) INTO v_company_exists;
    
    -- عدد الموديولات النشطة
    SELECT COUNT(*) FROM modules WHERE is_active = true INTO v_modules_count;
    
    -- عرض النتائج
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'التحقق من البيانات:';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    
    IF v_user_exists THEN
        RAISE NOTICE '✅ User موجود: fera3186@gmail.com';
    ELSE
        RAISE EXCEPTION '❌ User غير موجود!';
    END IF;
    
    IF v_tenant_exists THEN
        RAISE NOTICE '✅ Tenant موجود: NeXxov Platform';
    ELSE
        RAISE EXCEPTION '❌ Tenant غير موجود!';
    END IF;
    
    IF v_company_exists THEN
        RAISE NOTICE '✅ Company موجودة';
    ELSE
        RAISE EXCEPTION '❌ Company غير موجودة!';
    END IF;
    
    RAISE NOTICE '✅ عدد الموديولات النشطة: %', v_modules_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ جميع البيانات صحيحة! انتقل للخطوة 2.2';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
