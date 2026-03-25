-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: ربط البيانات الموجودة بـ tenant افتراضي
-- STEP 3: Link existing data to default tenant
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - تربط البيانات ب tenant افتراضي فقط
-- ✅ Safe - Only links data to default tenant

DO $$
DECLARE
    v_default_tenant_id UUID;
    v_updated_count INT;
BEGIN
    -- الحصول على tenant الافتراضي
    SELECT id INTO v_default_tenant_id 
    FROM tenants 
    WHERE code = 'default' 
    LIMIT 1;
    
    IF v_default_tenant_id IS NULL THEN
        RAISE EXCEPTION '❌ Tenant الافتراضي غير موجود. يرجى تطبيق STEP_01 أولاً';
    END IF;
    
    RAISE NOTICE '✅ تم العثور على tenant الافتراضي: %', v_default_tenant_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1. ربط companies
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        UPDATE companies 
        SET tenant_id = v_default_tenant_id 
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '✅ تم ربط % من companies', v_updated_count;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. ربط branches (من خلال company)
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
        UPDATE branches b
        SET tenant_id = c.tenant_id
        FROM companies c
        WHERE b.company_id = c.id 
          AND b.tenant_id IS NULL;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '✅ تم ربط % من branches', v_updated_count;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. ربط currencies
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currencies') THEN
        UPDATE currencies 
        SET tenant_id = v_default_tenant_id 
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '✅ تم ربط % من currencies', v_updated_count;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. ربط accounts (من خلال company)
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        UPDATE accounts a
        SET tenant_id = c.tenant_id
        FROM companies c
        WHERE a.company_id = c.id 
          AND a.tenant_id IS NULL;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '✅ تم ربط % من accounts', v_updated_count;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. ربط user_profiles (من خلال company)
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        UPDATE user_profiles up
        SET tenant_id = c.tenant_id
        FROM companies c
        WHERE up.company_id = c.id 
          AND up.tenant_id IS NULL;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '✅ تم ربط % من user_profiles', v_updated_count;
    END IF;
    
    RAISE NOTICE '✅ تم ربط جميع البيانات ب tenant الافتراضي بنجاح!';
    
END $$;

-- ✅ تم! الآن جميع البيانات مرتبطة بـ tenant افتراضي
-- ✅ Done! All data is now linked to default tenant
--
-- 📝 ملاحظة: يمكنك التحقق من النتائج:
-- 📝 Note: You can verify the results:
-- SELECT COUNT(*) FROM companies WHERE tenant_id IS NOT NULL;
-- SELECT COUNT(*) FROM branches WHERE tenant_id IS NOT NULL;
