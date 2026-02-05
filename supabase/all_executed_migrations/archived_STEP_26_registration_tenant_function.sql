-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 26: وظيفة للحصول على Tenant الافتراضي أثناء التسجيل
-- STEP 26: Function to get default tenant during registration
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ SECURITY DEFINER لتجاوز RLS
-- ✅ Uses SECURITY DEFINER to bypass RLS

-- حذف الوظيفة إن وجدت
DROP FUNCTION IF EXISTS public.get_or_create_default_tenant();

-- إنشاء وظيفة للحصول على أو إنشاء tenant افتراضي
CREATE OR REPLACE FUNCTION public.get_or_create_default_tenant()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- محاولة الحصول على tenant افتراضي
    SELECT id INTO v_tenant_id 
    FROM tenants 
    WHERE code = 'default' 
    LIMIT 1;
    
    -- إذا لم يوجد، نحاول إنشاءه
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (code, name, email, status, default_language)
        VALUES ('default', 'Default Tenant', 'admin@system.local', 'active', 'ar')
        ON CONFLICT (code) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_tenant_id;
    END IF;
    
    -- إذا ما زال NULL، نجرب الحصول على أي tenant
    IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id 
        FROM tenants 
        WHERE status = 'active' 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    RETURN v_tenant_id;
END;
$$;

-- منح صلاحيات للمستخدمين
GRANT EXECUTE ON FUNCTION public.get_or_create_default_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_default_tenant() TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- وظيفة تسجيل مستخدم جديد (كاملة)
-- Complete registration function
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.register_new_user(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.register_new_user(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_full_name VARCHAR(255),
    p_company_name VARCHAR(255),
    p_phone VARCHAR(50) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_company_code VARCHAR(50);
    v_result JSON;
BEGIN
    -- 1. الحصول على tenant افتراضي
    v_tenant_id := get_or_create_default_tenant();
    
    IF v_tenant_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No tenant available'
        );
    END IF;
    
    -- 2. إنشاء كود للشركة
    v_company_code := 'COMP' || SUBSTRING(CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS VARCHAR), 8, 6);
    
    -- 3. إنشاء الشركة
    INSERT INTO companies (
        code,
        name,
        name_en,
        default_currency,
        fiscal_year_start_month,
        tax_system,
        vat_rate,
        inventory_valuation_method,
        country_code,
        tenant_id
    )
    VALUES (
        v_company_code,
        p_company_name,
        p_company_name,
        'SAR',
        1,
        'vat_sa',
        15.00,
        'weighted_average',
        'SA',
        v_tenant_id
    )
    RETURNING id INTO v_company_id;
    
    -- 4. إنشاء/تحديث user_profile
    INSERT INTO user_profiles (
        id,
        email,
        full_name,
        phone,
        role,
        company_id,
        tenant_id
    )
    VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_phone,
        'admin',
        v_company_id,
        v_tenant_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = 'admin',
        company_id = EXCLUDED.company_id,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = NOW();
    
    -- 5. إرجاع النتيجة
    RETURN json_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'company_code', v_company_code
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- منح صلاحيات
GRANT EXECUTE ON FUNCTION public.register_new_user(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_user(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- تحديث RLS لجدول tenants للسماح بالقراءة للـ default tenant
-- ═══════════════════════════════════════════════════════════════════════════

-- السماح لأي شخص بقراءة tenant الافتراضي
DROP POLICY IF EXISTS "Anyone can view default tenant" ON tenants;
CREATE POLICY "Anyone can view default tenant" ON tenants
    FOR SELECT USING (code = 'default');

-- ✅ تم! الآن يمكن للمستخدمين التسجيل بنجاح
-- ✅ Done! Users can now register successfully
