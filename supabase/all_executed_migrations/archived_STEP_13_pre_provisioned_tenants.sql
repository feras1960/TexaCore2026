-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 13: إنشاء Tenants جاهزة مسبقاً + Super User
-- STEP 13: Create Pre-provisioned Tenants + Super User
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء 10+ tenants جاهزة لتسريع التسجيل
-- ✅ Create 10+ pre-provisioned tenants for faster registration

-- ═══════════════════════════════════════════════════════════════
-- 1. إنشاء Tenants جاهزة مسبقاً
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_counter INT;
BEGIN
    -- إنشاء 15 tenant جاهزة (يمكن زيادة العدد)
    FOR v_counter IN 1..15 LOOP
        INSERT INTO tenants (
            code,
            name,
            email,
            status,
            default_language
        )
        VALUES (
            'tenant-' || LPAD(v_counter::TEXT, 3, '0'),
            'Tenant ' || v_counter,
            'tenant' || v_counter || '@erp.local',
            'available',  -- حالة: متاح للتسجيل
            'ar'
        )
        ON CONFLICT (code) DO NOTHING
        RETURNING id INTO v_tenant_id;
        
        IF v_tenant_id IS NOT NULL THEN
            RAISE NOTICE '✅ تم إنشاء Tenant: tenant-%', LPAD(v_counter::TEXT, 3, '0');
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ تم إنشاء جميع Tenants الجاهزة';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Function لربط مشترك جديد بـ Tenant جاهز
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assign_available_tenant(
    p_user_email VARCHAR(200),
    p_user_name VARCHAR(200)
)
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_tenant_code VARCHAR(50);
BEGIN
    -- البحث عن tenant متاح
    SELECT id, code INTO v_tenant_id, v_tenant_code
    FROM tenants
    WHERE status = 'available'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;  -- تجنب التعارض
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد Tenants متاحة حالياً';
    END IF;
    
    -- تحديث بيانات Tenant
    UPDATE tenants
    SET 
        name = p_user_name,
        email = p_user_email,
        status = 'active',
        updated_at = NOW()
    WHERE id = v_tenant_id;
    
    RAISE NOTICE '✅ تم ربط المشترك بـ Tenant: %', v_tenant_code;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 3. Function لإنشاء Company افتراضية للـ Tenant
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_default_company_for_tenant(
    p_tenant_id UUID,
    p_company_name VARCHAR(200)
)
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
    v_company_code VARCHAR(50);
BEGIN
    -- توليد code للشركة
    v_company_code := 'COMP-' || LPAD(
        (SELECT COUNT(*) FROM companies WHERE tenant_id = p_tenant_id)::TEXT,
        3, '0'
    );
    
    -- إنشاء Company
    INSERT INTO companies (
        tenant_id,
        code,
        name,
        name_ar,
        name_en,
        is_active
    )
    VALUES (
        p_tenant_id,
        v_company_code,
        p_company_name,
        p_company_name,
        p_company_name,
        true
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ تم إنشاء Company: %', v_company_code;
    
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 4. Function كاملة لتسجيل مشترك جديد
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(200),
    p_user_name VARCHAR(200),
    p_company_name VARCHAR(200) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_result JSONB;
BEGIN
    -- 1. ربط بـ Tenant جاهز
    v_tenant_id := assign_available_tenant(p_user_email, p_user_name);
    
    -- 2. إنشاء Company افتراضية
    v_company_id := create_default_company_for_tenant(
        v_tenant_id,
        COALESCE(p_company_name, p_user_name || ' Company')
    );
    
    -- 3. ربط المستخدم بالـ Company
    UPDATE user_profiles
    SET 
        tenant_id = v_tenant_id,
        company_id = v_company_id
    WHERE id = p_user_id;
    
    -- 4. إرجاع النتيجة
    SELECT jsonb_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'success', true
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 5. Function لإعادة Tenant إلى الحالة المتاحة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION release_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- إعادة Tenant إلى الحالة المتاحة
    UPDATE tenants
    SET 
        status = 'available',
        name = 'Tenant ' || SUBSTRING(code FROM 8),  -- استعادة الاسم الافتراضي
        email = code || '@erp.local',
        updated_at = NOW()
    WHERE id = p_tenant_id;
    
    -- حذف البيانات (اختياري - يمكن تعديله)
    -- DELETE FROM companies WHERE tenant_id = p_tenant_id;
    -- DELETE FROM customers WHERE tenant_id = p_tenant_id;
    -- إلخ...
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 6. Function للتحقق من Tenants المتاحة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_available_tenants_count()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM tenants
    WHERE status = 'available';
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 7. Trigger لإعادة ملء Tenants المتاحة تلقائياً
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_refill_tenants()
RETURNS TRIGGER AS $$
DECLARE
    v_available_count INT;
    v_needed_count INT;
BEGIN
    -- حساب عدد Tenants المتاحة
    SELECT COUNT(*) INTO v_available_count
    FROM tenants
    WHERE status = 'available';
    
    -- إذا قل العدد عن 5، أنشئ المزيد
    IF v_available_count < 5 THEN
        v_needed_count := 10 - v_available_count;
        
        -- إنشاء Tenants جديدة
        FOR i IN 1..v_needed_count LOOP
            INSERT INTO tenants (
                code,
                name,
                email,
                status,
                default_language
            )
            VALUES (
                'tenant-' || LPAD(
                    (SELECT COUNT(*) FROM tenants)::TEXT,
                    3, '0'
                ),
                'Tenant ' || (SELECT COUNT(*) FROM tenants),
                'tenant' || (SELECT COUNT(*) FROM tenants) || '@erp.local',
                'available',
                'ar'
            )
            ON CONFLICT (code) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: عند تغيير حالة Tenant
CREATE TRIGGER trg_auto_refill_tenants
    AFTER UPDATE OF status ON tenants
    FOR EACH ROW
    WHEN (OLD.status = 'active' AND NEW.status = 'available')
    EXECUTE FUNCTION auto_refill_tenants();

-- ═══════════════════════════════════════════════════════════════
-- 8. إحصائيات Tenants
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_tenants_statistics()
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', (SELECT COUNT(*) FROM tenants),
        'available', (SELECT COUNT(*) FROM tenants WHERE status = 'available'),
        'active', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
        'inactive', (SELECT COUNT(*) FROM tenants WHERE status = 'inactive')
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ تم! الآن لديك نظام Tenants جاهزة مسبقاً
-- ✅ Done! Pre-provisioned tenants system is ready
--
-- 📝 ملاحظة: يمكن زيادة عدد Tenants الجاهزة حسب الحاجة
-- 📝 Note: You can increase the number of pre-provisioned tenants as needed
