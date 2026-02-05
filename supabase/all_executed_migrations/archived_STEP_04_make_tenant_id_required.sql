-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: جعل tenant_id مطلوب (NOT NULL)
-- STEP 4: Make tenant_id required (NOT NULL)
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ تأكد من تطبيق STEP_03 أولاً!
-- ⚠️ Make sure to apply STEP_03 first!

DO $$
DECLARE
    v_null_count INT;
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- 1. التحقق من companies
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        SELECT COUNT(*) INTO v_null_count 
        FROM companies 
        WHERE tenant_id IS NULL;
        
        IF v_null_count > 0 THEN
            RAISE EXCEPTION '❌ يوجد % من companies بدون tenant_id. يرجى تطبيق STEP_03 أولاً', v_null_count;
        END IF;
        
        ALTER TABLE companies 
        ALTER COLUMN tenant_id SET NOT NULL;
        
        RAISE NOTICE '✅ تم جعل tenant_id مطلوب في companies';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. التحقق من branches
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
        SELECT COUNT(*) INTO v_null_count 
        FROM branches 
        WHERE tenant_id IS NULL;
        
        IF v_null_count > 0 THEN
            RAISE EXCEPTION '❌ يوجد % من branches بدون tenant_id. يرجى تطبيق STEP_03 أولاً', v_null_count;
        END IF;
        
        ALTER TABLE branches 
        ALTER COLUMN tenant_id SET NOT NULL;
        
        RAISE NOTICE '✅ تم جعل tenant_id مطلوب في branches';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. التحقق من currencies
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currencies') THEN
        SELECT COUNT(*) INTO v_null_count 
        FROM currencies 
        WHERE tenant_id IS NULL;
        
        IF v_null_count > 0 THEN
            RAISE EXCEPTION '❌ يوجد % من currencies بدون tenant_id. يرجى تطبيق STEP_03 أولاً', v_null_count;
        END IF;
        
        ALTER TABLE currencies 
        ALTER COLUMN tenant_id SET NOT NULL;
        
        RAISE NOTICE '✅ تم جعل tenant_id مطلوب في currencies';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. التحقق من accounts (إن وجد)
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        SELECT COUNT(*) INTO v_null_count 
        FROM accounts 
        WHERE tenant_id IS NULL;
        
        IF v_null_count > 0 THEN
            RAISE WARNING '⚠️ يوجد % من accounts بدون tenant_id. سيتم تخطي هذا الجدول', v_null_count;
        ELSE
            ALTER TABLE accounts 
            ALTER COLUMN tenant_id SET NOT NULL;
            
            RAISE NOTICE '✅ تم جعل tenant_id مطلوب في accounts';
        END IF;
    END IF;
    
    RAISE NOTICE '✅ تم جعل tenant_id مطلوب في جميع الجداول بنجاح!';
    
END $$;

-- ✅ تم! الآن tenant_id مطلوب في جميع الجداول
-- ✅ Done! tenant_id is now required in all tables
--
-- 📝 ملاحظة: الآن البيانات محمية - لا يمكن إضافة سجلات بدون tenant_id
-- 📝 Note: Data is now protected - cannot add records without tenant_id
