-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 45: نظام الباقات الكامل (Complete Subscription Plans System)
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ إنشاء الباقات الافتراضية
-- ✅ تحديث دالة التسجيل لدعم الباقات
-- ✅ دوال إدارة الباقات (CRUD)
-- ✅ دوال التحقق من الحدود
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. التحقق من جدول المنتجات وإنشاء منتج ERP الرئيسي
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_product_id UUID;
BEGIN
    -- التحقق من وجود جدول saas_products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saas_products') THEN
        RAISE NOTICE '✅ جدول saas_products موجود';
        
        -- إنشاء المنتج الرئيسي إذا لم يكن موجوداً
        INSERT INTO saas_products (code, name, name_ar, description, is_active)
        VALUES (
            'erp-saas',
            'ERP System',
            'نظام ERP',
            'نظام إدارة موارد المؤسسات - شامل المحاسبة، المبيعات، المشتريات، والمخزون',
            true
        )
        ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            name_ar = EXCLUDED.name_ar,
            description = EXCLUDED.description,
            is_active = EXCLUDED.is_active
        RETURNING id INTO v_product_id;
        
        RAISE NOTICE '✅ تم إنشاء/تحديث المنتج الرئيسي: %', v_product_id;
    ELSE
        RAISE NOTICE '⚠️ جدول saas_products غير موجود - سيتم تخطي إنشاء المنتج';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. إنشاء الباقات الثلاثة الافتراضية
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_product_id UUID;
BEGIN
    -- الحصول على product_id
    SELECT id INTO v_product_id FROM saas_products WHERE code = 'erp-saas' LIMIT 1;
    
    IF v_product_id IS NULL THEN
        RAISE NOTICE '⚠️ لم يتم العثور على المنتج - سيتم تخطي إنشاء الباقات';
        RETURN;
    END IF;
    
    RAISE NOTICE '📦 إنشاء الباقات الافتراضية...';
    
    -- ═══════════════════════════════════════════════════════════════
    -- Starter Plan (الباقة الأساسية)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO subscription_plans (
        product_id,
        code,
        name_ar,
        name_en,
        description,
        max_users,
        max_companies,
        max_branches,
        max_warehouses,
        max_products,
        storage_gb,
        included_modules,
        features,
        price_monthly,
        price_yearly,
        currency,
        trial_days,
        is_popular,
        display_order,
        is_active
    ) VALUES (
        v_product_id,
        'starter',
        'الباقة الأساسية',
        'Starter Plan',
        'مثالية للشركات الصغيرة والمشاريع الناشئة',
        5,      -- max_users
        1,      -- max_companies ✅
        50,     -- max_branches
        5,      -- max_warehouses
        1000,   -- max_products
        10,     -- storage_gb
        ARRAY['accounting', 'sales', 'purchases', 'inventory'],
        '{
            "multi_currency": false,
            "advanced_reports": false,
            "api_access": false,
            "white_label": false,
            "priority_support": false,
            "custom_fields": false,
            "export_excel": true,
            "export_pdf": true,
            "sms_notifications": false,
            "email_notifications": true,
            "mobile_app": false
        }'::jsonb,
        99.00,   -- price_monthly (USD) ✅
        1188.00, -- price_yearly (USD) = 99 × 12 ✅
        'USD',   -- ✅
        14,      -- trial_days
        false,   -- is_popular
        1,       -- display_order
        true     -- is_active
    )
    ON CONFLICT (product_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        description = EXCLUDED.description,
        max_users = EXCLUDED.max_users,
        max_companies = EXCLUDED.max_companies,
        max_branches = EXCLUDED.max_branches,
        max_warehouses = EXCLUDED.max_warehouses,
        max_products = EXCLUDED.max_products,
        storage_gb = EXCLUDED.storage_gb,
        included_modules = EXCLUDED.included_modules,
        features = EXCLUDED.features,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        currency = EXCLUDED.currency,
        trial_days = EXCLUDED.trial_days,
        is_popular = EXCLUDED.is_popular,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active;
    
    RAISE NOTICE '✅ تم إنشاء/تحديث باقة Starter';
    
    -- ═══════════════════════════════════════════════════════════════
    -- Professional Plan (الباقة الاحترافية)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO subscription_plans (
        product_id,
        code,
        name_ar,
        name_en,
        description,
        max_users,
        max_companies,
        max_branches,
        max_warehouses,
        max_products,
        storage_gb,
        included_modules,
        features,
        price_monthly,
        price_yearly,
        currency,
        trial_days,
        is_popular,
        display_order,
        is_active
    ) VALUES (
        v_product_id,
        'professional',
        'الباقة الاحترافية',
        'Professional Plan',
        'للشركات المتوسطة التي تحتاج ميزات متقدمة',
        10,     -- max_users
        3,      -- max_companies ✅
        60,     -- max_branches
        5,      -- max_warehouses
        5000,   -- max_products
        50,     -- storage_gb
        ARRAY['accounting', 'sales', 'purchases', 'inventory', 'hr', 'crm', 'fabric', 'pos'],
        '{
            "multi_currency": true,
            "advanced_reports": true,
            "api_access": false,
            "white_label": false,
            "priority_support": true,
            "custom_fields": true,
            "export_excel": true,
            "export_pdf": true,
            "sms_notifications": true,
            "email_notifications": true,
            "mobile_app": true,
            "premium_internet_hosting": true
        }'::jsonb,
        799.00,  -- price_monthly (USD) ✅
        9588.00, -- price_yearly (USD) = 799 × 12 ✅
        'USD',   -- ✅
        14,      -- trial_days
        true,    -- is_popular ⭐
        2,       -- display_order
        true     -- is_active
    )
    ON CONFLICT (product_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        description = EXCLUDED.description,
        max_users = EXCLUDED.max_users,
        max_companies = EXCLUDED.max_companies,
        max_branches = EXCLUDED.max_branches,
        max_warehouses = EXCLUDED.max_warehouses,
        max_products = EXCLUDED.max_products,
        storage_gb = EXCLUDED.storage_gb,
        included_modules = EXCLUDED.included_modules,
        features = EXCLUDED.features,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        currency = EXCLUDED.currency,
        trial_days = EXCLUDED.trial_days,
        is_popular = EXCLUDED.is_popular,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active;
    
    RAISE NOTICE '✅ تم إنشاء/تحديث باقة Professional';
    
    -- ═══════════════════════════════════════════════════════════════
    -- Enterprise Plan (باقة الأعمال)
    -- ═══════════════════════════════════════════════════════════════
    INSERT INTO subscription_plans (
        product_id,
        code,
        name_ar,
        name_en,
        description,
        max_users,
        max_companies,
        max_branches,
        max_warehouses,
        max_products,
        storage_gb,
        included_modules,
        features,
        price_monthly,
        price_yearly,
        currency,
        trial_days,
        is_popular,
        display_order,
        is_active
    ) VALUES (
        v_product_id,
        'enterprise',
        'باقة المؤسسات',
        'Enterprise Plan',
        'للشركات الكبيرة والمؤسسات - ميزات غير محدودة',
        -1,     -- max_users (unlimited)
        -1,     -- max_companies (unlimited) ✅
        -1,     -- max_branches (unlimited)
        -1,     -- max_warehouses (unlimited)
        -1,     -- max_products (unlimited)
        200,    -- storage_gb
        ARRAY['accounting', 'sales', 'purchases', 'inventory', 'hr', 'crm', 'fabric', 'pos', 'healthcare', 'exchange', 'manufacturing', 'projects'],
        '{
            "multi_currency": true,
            "advanced_reports": true,
            "api_access": true,
            "white_label": true,
            "priority_support": true,
            "custom_fields": true,
            "export_excel": true,
            "export_pdf": true,
            "sms_notifications": true,
            "email_notifications": true,
            "mobile_app": true,
            "dedicated_manager": true,
            "custom_integrations": true,
            "on_premise_option": true,
            "premium_internet_hosting": true
        }'::jsonb,
        1199.00, -- price_monthly (USD) ✅
        14388.00, -- price_yearly (USD) = 1199 × 12 ✅
        'USD',   -- ✅
        30,      -- trial_days
        false,   -- is_popular
        3,       -- display_order
        true     -- is_active
    )
    ON CONFLICT (product_id, code) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        description = EXCLUDED.description,
        max_users = EXCLUDED.max_users,
        max_companies = EXCLUDED.max_companies,
        max_branches = EXCLUDED.max_branches,
        max_warehouses = EXCLUDED.max_warehouses,
        max_products = EXCLUDED.max_products,
        storage_gb = EXCLUDED.storage_gb,
        included_modules = EXCLUDED.included_modules,
        features = EXCLUDED.features,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        currency = EXCLUDED.currency,
        trial_days = EXCLUDED.trial_days,
        is_popular = EXCLUDED.is_popular,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active;
    
    RAISE NOTICE '✅ تم إنشاء/تحديث باقة Enterprise';
    
    RAISE NOTICE '🎉 تم إنشاء/تحديث جميع الباقات بنجاح!';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. دالة التحقق من حدود الباقة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_plan_limits(
    p_tenant_id UUID,
    p_limit_type VARCHAR(50) -- 'companies', 'users', 'branches', 'warehouses', 'products', 'storage'
)
RETURNS JSONB AS $$
DECLARE
    v_subscription_id UUID;
    v_plan_id UUID;
    v_plan RECORD;
    v_current_count INT;
    v_current_size BIGINT;
BEGIN
    -- الحصول على الاشتراك النشط
    SELECT id, plan_id INTO v_subscription_id, v_plan_id
    FROM subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('trial', 'active')
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'no_active_subscription',
            'error_ar', 'لا يوجد اشتراك نشط',
            'error_en', 'No active subscription'
        );
    END IF;
    
    -- الحصول على تفاصيل الباقة
    SELECT * INTO v_plan FROM subscription_plans WHERE id = v_plan_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'plan_not_found',
            'error_ar', 'الباقة غير موجودة',
            'error_en', 'Plan not found'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- التحقق حسب نوع الحد
    -- ═══════════════════════════════════════════════════════════════
    
    -- 1. التحقق من عدد الشركات
    IF p_limit_type = 'companies' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM companies
        WHERE tenant_id = p_tenant_id;
        
        RETURN jsonb_build_object(
            'allowed', v_current_count < v_plan.max_companies,
            'limit_type', 'companies',
            'current', v_current_count,
            'max', v_plan.max_companies,
            'remaining', GREATEST(v_plan.max_companies - v_current_count, 0),
            'plan_code', v_plan.code,
            'plan_name_ar', v_plan.name_ar,
            'plan_name_en', v_plan.name_en
        );
    END IF;
    
    -- 2. التحقق من عدد المستخدمين
    IF p_limit_type = 'users' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM user_profiles
        WHERE tenant_id = p_tenant_id;
        
        RETURN jsonb_build_object(
            'allowed', v_current_count < v_plan.max_users,
            'limit_type', 'users',
            'current', v_current_count,
            'max', v_plan.max_users,
            'remaining', GREATEST(v_plan.max_users - v_current_count, 0),
            'plan_code', v_plan.code,
            'plan_name_ar', v_plan.name_ar,
            'plan_name_en', v_plan.name_en
        );
    END IF;
    
    -- 3. التحقق من عدد الفروع
    IF p_limit_type = 'branches' THEN
        -- افتراض وجود جدول branches (سيتم إنشاؤه لاحقاً)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
            EXECUTE format('SELECT COUNT(*) FROM branches WHERE tenant_id = %L', p_tenant_id) INTO v_current_count;
        ELSE
            v_current_count := 0;
        END IF;
        
        RETURN jsonb_build_object(
            'allowed', v_current_count < v_plan.max_branches,
            'limit_type', 'branches',
            'current', v_current_count,
            'max', v_plan.max_branches,
            'remaining', GREATEST(v_plan.max_branches - v_current_count, 0),
            'plan_code', v_plan.code
        );
    END IF;
    
    -- 4. التحقق من عدد المخازن
    IF p_limit_type = 'warehouses' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses') THEN
            EXECUTE format('SELECT COUNT(*) FROM warehouses WHERE tenant_id = %L', p_tenant_id) INTO v_current_count;
        ELSE
            v_current_count := 0;
        END IF;
        
        RETURN jsonb_build_object(
            'allowed', v_current_count < v_plan.max_warehouses,
            'limit_type', 'warehouses',
            'current', v_current_count,
            'max', v_plan.max_warehouses,
            'remaining', GREATEST(v_plan.max_warehouses - v_current_count, 0),
            'plan_code', v_plan.code
        );
    END IF;
    
    -- 5. التحقق من عدد المنتجات
    IF p_limit_type = 'products' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
            EXECUTE format('SELECT COUNT(*) FROM products WHERE tenant_id = %L', p_tenant_id) INTO v_current_count;
        ELSE
            v_current_count := 0;
        END IF;
        
        -- -1 يعني غير محدود
        IF v_plan.max_products = -1 THEN
            RETURN jsonb_build_object(
                'allowed', true,
                'limit_type', 'products',
                'current', v_current_count,
                'max', -1,
                'unlimited', true,
                'plan_code', v_plan.code
            );
        END IF;
        
        RETURN jsonb_build_object(
            'allowed', v_current_count < v_plan.max_products,
            'limit_type', 'products',
            'current', v_current_count,
            'max', v_plan.max_products,
            'remaining', GREATEST(v_plan.max_products - v_current_count, 0),
            'plan_code', v_plan.code
        );
    END IF;
    
    -- 6. التحقق من المساحة التخزينية (TODO: يحتاج تطبيق لاحقاً)
    IF p_limit_type = 'storage' THEN
        -- حالياً نفترض 0 GB مستخدم
        v_current_size := 0;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'limit_type', 'storage',
            'current_gb', v_current_size,
            'max_gb', v_plan.storage_gb,
            'remaining_gb', v_plan.storage_gb - v_current_size,
            'plan_code', v_plan.code
        );
    END IF;
    
    -- نوع حد غير معروف
    RETURN jsonb_build_object(
        'allowed', false,
        'error', 'unknown_limit_type',
        'limit_type', p_limit_type
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'exception',
            'error_message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_plan_limits IS 'التحقق من حدود الباقة للتينانت';

-- ═══════════════════════════════════════════════════════════════
-- 4. دالة الحصول على جميع الباقات
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_subscription_plans(
    p_active_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    code VARCHAR(50),
    name_ar VARCHAR(100),
    name_en VARCHAR(100),
    description TEXT,
    max_users INT,
    max_companies INT,
    max_branches INT,
    max_warehouses INT,
    max_products INT,
    storage_gb INT,
    included_modules JSONB,
    features JSONB,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3),
    trial_days INT,
    is_popular BOOLEAN,
    display_order INT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.product_id,
        sp.code,
        sp.name_ar,
        sp.name_en,
        sp.description,
        sp.max_users,
        sp.max_companies,
        sp.max_branches,
        sp.max_warehouses,
        sp.max_products,
        sp.storage_gb,
        sp.included_modules,
        sp.features,
        sp.price_monthly,
        sp.price_yearly,
        sp.currency,
        sp.trial_days,
        sp.is_popular,
        sp.display_order,
        sp.is_active,
        sp.created_at
    FROM subscription_plans sp
    WHERE (NOT p_active_only OR sp.is_active = true)
    ORDER BY sp.display_order ASC, sp.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_subscription_plans IS 'الحصول على قائمة الباقات';

-- ═══════════════════════════════════════════════════════════════
-- 5. دالة إنشاء باقة جديدة (Platform Owner فقط)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_subscription_plan(
    p_code VARCHAR(50),
    p_name_ar VARCHAR(100),
    p_name_en VARCHAR(100),
    p_description TEXT,
    p_max_users INT DEFAULT 5,
    p_max_companies INT DEFAULT 1,
    p_max_branches INT DEFAULT 2,
    p_max_warehouses INT DEFAULT 2,
    p_max_products INT DEFAULT 1000,
    p_storage_gb INT DEFAULT 5,
    p_included_modules JSONB DEFAULT '[]'::jsonb,
    p_features JSONB DEFAULT '{}'::jsonb,
    p_price_monthly DECIMAL(10,2) DEFAULT 0,
    p_price_yearly DECIMAL(10,2) DEFAULT 0,
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_trial_days INT DEFAULT 14,
    p_is_popular BOOLEAN DEFAULT false,
    p_display_order INT DEFAULT 999
)
RETURNS JSONB AS $$
DECLARE
    v_product_id UUID;
    v_plan_id UUID;
BEGIN
    -- الحصول على product_id
    SELECT id INTO v_product_id FROM saas_products WHERE code = 'erp-saas' LIMIT 1;
    
    IF v_product_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'product_not_found',
            'message', 'المنتج الرئيسي غير موجود'
        );
    END IF;
    
    -- التحقق من عدم وجود الكود مسبقاً
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE product_id = v_product_id AND code = p_code) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'code_exists',
            'message', 'كود الباقة موجود مسبقاً'
        );
    END IF;
    
    -- إنشاء الباقة
    INSERT INTO subscription_plans (
        product_id,
        code,
        name_ar,
        name_en,
        description,
        max_users,
        max_companies,
        max_branches,
        max_warehouses,
        max_products,
        storage_gb,
        included_modules,
        features,
        price_monthly,
        price_yearly,
        currency,
        trial_days,
        is_popular,
        display_order,
        is_active
    ) VALUES (
        v_product_id,
        p_code,
        p_name_ar,
        p_name_en,
        p_description,
        p_max_users,
        p_max_companies,
        p_max_branches,
        p_max_warehouses,
        p_max_products,
        p_storage_gb,
        p_included_modules,
        p_features,
        p_price_monthly,
        p_price_yearly,
        p_currency,
        p_trial_days,
        p_is_popular,
        p_display_order,
        true
    )
    RETURNING id INTO v_plan_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'plan_id', v_plan_id,
        'code', p_code,
        'message', 'تم إنشاء الباقة بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'exception',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_subscription_plan IS 'إنشاء باقة جديدة (Platform Owner فقط)';

-- ═══════════════════════════════════════════════════════════════
-- 6. دالة تحديث باقة موجودة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_subscription_plan(
    p_plan_id UUID,
    p_name_ar VARCHAR(100) DEFAULT NULL,
    p_name_en VARCHAR(100) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_max_users INT DEFAULT NULL,
    p_max_companies INT DEFAULT NULL,
    p_max_branches INT DEFAULT NULL,
    p_max_warehouses INT DEFAULT NULL,
    p_max_products INT DEFAULT NULL,
    p_storage_gb INT DEFAULT NULL,
    p_included_modules JSONB DEFAULT NULL,
    p_features JSONB DEFAULT NULL,
    p_price_monthly DECIMAL(10,2) DEFAULT NULL,
    p_price_yearly DECIMAL(10,2) DEFAULT NULL,
    p_currency VARCHAR(3) DEFAULT NULL,
    p_trial_days INT DEFAULT NULL,
    p_is_popular BOOLEAN DEFAULT NULL,
    p_display_order INT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    -- التحقق من وجود الباقة
    IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'plan_not_found',
            'message', 'الباقة غير موجودة'
        );
    END IF;
    
    -- تحديث الحقول المحددة فقط
    UPDATE subscription_plans
    SET
        name_ar = COALESCE(p_name_ar, name_ar),
        name_en = COALESCE(p_name_en, name_en),
        description = COALESCE(p_description, description),
        max_users = COALESCE(p_max_users, max_users),
        max_companies = COALESCE(p_max_companies, max_companies),
        max_branches = COALESCE(p_max_branches, max_branches),
        max_warehouses = COALESCE(p_max_warehouses, max_warehouses),
        max_products = COALESCE(p_max_products, max_products),
        storage_gb = COALESCE(p_storage_gb, storage_gb),
        included_modules = COALESCE(p_included_modules, included_modules),
        features = COALESCE(p_features, features),
        price_monthly = COALESCE(p_price_monthly, price_monthly),
        price_yearly = COALESCE(p_price_yearly, price_yearly),
        currency = COALESCE(p_currency, currency),
        trial_days = COALESCE(p_trial_days, trial_days),
        is_popular = COALESCE(p_is_popular, is_popular),
        display_order = COALESCE(p_display_order, display_order),
        is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_plan_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'plan_id', p_plan_id,
        'message', 'تم تحديث الباقة بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'exception',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_subscription_plan IS 'تحديث باقة موجودة (Platform Owner فقط)';

-- ═══════════════════════════════════════════════════════════════
-- 7. دالة تفعيل/تعطيل باقة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION toggle_plan_status(
    p_plan_id UUID,
    p_is_active BOOLEAN
)
RETURNS JSONB AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'plan_not_found'
        );
    END IF;
    
    UPDATE subscription_plans
    SET is_active = p_is_active
    WHERE id = p_plan_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'plan_id', p_plan_id,
        'is_active', p_is_active
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 8. تحديث دالة register_new_subscriber لدعم الباقات
-- ═══════════════════════════════════════════════════════════════

-- حذف الدالة القديمة بجميع توقيعاتها
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'SAR',
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_plan_code VARCHAR(50) DEFAULT 'starter' -- ✅ جديد
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_code VARCHAR(50);
    v_tenant_id UUID;
    v_company_id UUID;
    v_plan_id UUID;
    v_subscription_id UUID;
    v_trial_days INT;
    v_result JSONB;
BEGIN
    RAISE NOTICE '🚀 بدء تسجيل مشترك جديد: %', p_user_email;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1. توليد كود فريد للـ Tenant
    -- ═══════════════════════════════════════════════════════════════
    v_tenant_code := 'T-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 10));
    RAISE NOTICE '📝 تم توليد كود التينانت: %', v_tenant_code;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. الحصول على Plan ID
    -- ═══════════════════════════════════════════════════════════════
    SELECT id, trial_days INTO v_plan_id, v_trial_days
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RAISE NOTICE '⚠️ الباقة % غير موجودة، استخدام Starter', p_plan_code;
        SELECT id, trial_days INTO v_plan_id, v_trial_days
        FROM subscription_plans
        WHERE code = 'starter' AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'لا توجد باقات نشطة في النظام';
    END IF;
    
    RAISE NOTICE '📦 الباقة المختارة: % (Trial: % يوم)', p_plan_code, v_trial_days;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. إنشاء Tenant جديد
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        v_tenant_id := create_new_tenant(
            v_tenant_code,
            COALESCE(p_company_name, p_user_name),
            p_user_email,
            p_phone,
            p_country_code,
            'ar',
            p_business_type
        );
        
        IF v_tenant_id IS NULL THEN
            RAISE EXCEPTION 'فشل إنشاء Tenant';
        END IF;
        
        RAISE NOTICE '✅ تم إنشاء Tenant: %', v_tenant_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في إنشاء Tenant: %', SQLERRM;
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. إنشاء Subscription (trial)
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        INSERT INTO subscriptions (
            tenant_id,
            product_id,
            plan_id,
            status,
            trial_ends_at,
            current_period_start,
            current_period_end
        )
        SELECT
            v_tenant_id,
            sp.product_id,
            v_plan_id,
            'trial',
            NOW() + (v_trial_days || ' days')::INTERVAL,
            NOW(),
            NOW() + (v_trial_days || ' days')::INTERVAL
        FROM subscription_plans sp
        WHERE sp.id = v_plan_id
        RETURNING id INTO v_subscription_id;
        
        RAISE NOTICE '✅ تم إنشاء Subscription: % (Trial حتى: %)', 
            v_subscription_id, 
            NOW() + (v_trial_days || ' days')::INTERVAL;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في إنشاء Subscription: %', SQLERRM;
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. إنشاء الشركة الأولى (production فقط)
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        v_company_id := create_default_company_for_tenant(
            v_tenant_id,
            COALESCE(p_company_name, p_user_name),
            'production',
            p_business_type,
            p_currency,
            p_country_code
        );
        
        IF v_company_id IS NULL THEN
            RAISE EXCEPTION 'فشل إنشاء الشركة';
        END IF;
        
        RAISE NOTICE '✅ تم إنشاء الشركة: %', v_company_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في إنشاء الشركة: %', SQLERRM;
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. ربط المستخدم بالـ Tenant والشركة
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            role,
            tenant_id,
            company_id,
            updated_at
        )
        VALUES (
            p_user_id,
            p_user_email,
            p_user_name,
            'owner',
            v_tenant_id,
            v_company_id,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            role = 'owner',
            tenant_id = EXCLUDED.tenant_id,
            company_id = EXCLUDED.company_id,
            updated_at = NOW();
        
        RAISE NOTICE '✅ تم ربط المستخدم بالـ Tenant والشركة';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في ربط المستخدم: %', SQLERRM;
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 7. تفعيل الموديولات حسب الباقة
    -- ═══════════════════════════════════════════════════════════════
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
            INSERT INTO tenant_modules (tenant_id, module_code, is_active)
            SELECT 
                v_tenant_id,
                m.code,
                true
            FROM modules m
            WHERE m.code = ANY(
                SELECT jsonb_array_elements_text(sp.included_modules)
                FROM subscription_plans sp
                WHERE sp.id = v_plan_id
            )
            AND m.is_active = true
            ON CONFLICT (tenant_id, module_code) DO UPDATE SET
                is_active = true;
            
            RAISE NOTICE '✅ تم تفعيل الموديولات حسب الباقة';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تحذير في تفعيل الموديولات: %', SQLERRM;
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 8. إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════════
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', v_tenant_code,
        'company_id', v_company_id,
        'subscription_id', v_subscription_id,
        'plan_code', p_plan_code,
        'trial_days', v_trial_days,
        'trial_ends_at', NOW() + (v_trial_days || ' days')::INTERVAL,
        'message', 'تم التسجيل بنجاح'
    );
    
    RAISE NOTICE '🎉 اكتمل التسجيل بنجاح!';
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في التسجيل: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_new_subscriber IS 'تسجيل مشترك جديد مع دعم الباقات';

-- ═══════════════════════════════════════════════════════════════
-- 9. Indexes للأداء
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON subscription_plans(code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON subscription_plans(display_order);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. جدول الخصومات الموسمية (Promotional Discounts)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promotional_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ التعريف ═══
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    name_de VARCHAR(200),
    name_tr VARCHAR(200),
    name_ru VARCHAR(200),
    name_uk VARCHAR(200),
    name_it VARCHAR(200),
    name_pl VARCHAR(200),
    name_ro VARCHAR(200),
    description TEXT,
    
    -- ═══ نسبة الخصم ═══
    discount_percentage INT NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    
    -- ═══ الفترة ═══
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    
    -- ═══ الباقات المشمولة ═══
    applicable_plans JSONB DEFAULT '[]'::jsonb,
    -- [] = جميع الباقات
    -- ["starter", "professional"] = باقات محددة
    
    -- ═══ نوع الخصم ═══
    applies_to VARCHAR(20) DEFAULT 'both', -- 'monthly', 'yearly', 'both'
    
    -- ═══ الحالة ═══
    is_active BOOLEAN DEFAULT true,
    auto_apply BOOLEAN DEFAULT true, -- تطبيق تلقائي
    
    -- ═══ الترتيب ═══
    priority INT DEFAULT 0, -- أعلى أولوية = أعلى رقم
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotional_discounts_code ON promotional_discounts(code);
CREATE INDEX IF NOT EXISTS idx_promotional_discounts_active ON promotional_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_promotional_discounts_dates ON promotional_discounts(valid_from, valid_to);

-- إنشاء خصم افتراضي 50%
INSERT INTO promotional_discounts (
    code, 
    name_ar, name_en, name_de, name_tr, name_ru, name_uk, name_it, name_pl, name_ro,
    discount_percentage,
    valid_from, valid_to,
    applicable_plans,
    applies_to,
    is_active, auto_apply, priority
) VALUES (
    'LAUNCH_50',
    'خصم الإطلاق 50%',
    'Launch Sale 50%',
    'Startrabatt 50%',
    'Başlangıç İndirimi %50',
    'Скидка при запуске 50%',
    'Знижка на запуск 50%',
    'Sconto di Lancio 50%',
    'Zniżka startowa 50%',
    'Reducere de lansare 50%',
    50,
    '2026-01-01'::TIMESTAMPTZ,
    '2026-12-31'::TIMESTAMPTZ,
    '[]'::jsonb, -- جميع الباقات
    'both',
    true,
    true,
    100
)
ON CONFLICT (code) DO UPDATE SET
    discount_percentage = EXCLUDED.discount_percentage,
    valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
    is_active = EXCLUDED.is_active;

-- ═══════════════════════════════════════════════════════════════
-- 11. دالة حساب السعر مع الخصومات
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_plan_pricing(
    p_plan_code VARCHAR(50),
    p_billing_cycle VARCHAR(10) DEFAULT 'monthly', -- 'monthly' أو 'yearly'
    p_free_months INT DEFAULT 2 -- عدد الأشهر المجانية للسنوي
)
RETURNS JSONB AS $$
DECLARE
    v_plan RECORD;
    v_discount RECORD;
    v_original_price DECIMAL(10,2);
    v_monthly_after_promo DECIMAL(10,2);
    v_final_price DECIMAL(10,2);
    v_yearly_months_paid INT;
    v_promo_discount INT := 0;
BEGIN
    -- 1. الحصول على الباقة
    SELECT * INTO v_plan
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'plan_not_found',
            'message', 'الباقة غير موجودة'
        );
    END IF;
    
    -- 2. الحصول على الخصم الموسمي النشط
    SELECT * INTO v_discount
    FROM promotional_discounts
    WHERE is_active = true
      AND auto_apply = true
      AND NOW() BETWEEN valid_from AND valid_to
      AND (
          applies_to = 'both'
          OR applies_to = p_billing_cycle
      )
      AND (
          applicable_plans = '[]'::jsonb
          OR applicable_plans @> to_jsonb(ARRAY[p_plan_code])
      )
    ORDER BY priority DESC, discount_percentage DESC
    LIMIT 1;
    
    -- 3. حساب السعر حسب نوع الاشتراك
    IF p_billing_cycle = 'monthly' THEN
        -- ═══ شهري ═══
        v_original_price := v_plan.price_monthly;
        
        -- تطبيق الخصم الموسمي
        IF v_discount IS NOT NULL THEN
            v_promo_discount := v_discount.discount_percentage;
            v_monthly_after_promo := v_original_price * (1 - v_promo_discount::DECIMAL / 100);
        ELSE
            v_monthly_after_promo := v_original_price;
        END IF;
        
        v_final_price := v_monthly_after_promo;
        
    ELSE
        -- ═══ سنوي ═══
        v_original_price := v_plan.price_yearly; -- شهري × 12
        
        -- تطبيق الخصم الموسمي على الشهري أولاً
        IF v_discount IS NOT NULL THEN
            v_promo_discount := v_discount.discount_percentage;
            v_monthly_after_promo := v_plan.price_monthly * (1 - v_promo_discount::DECIMAL / 100);
        ELSE
            v_monthly_after_promo := v_plan.price_monthly;
        END IF;
        
        -- حساب السنوي مع بونص الأشهر المجانية
        -- مثال: 12 شهر - 2 شهر مجاني = 10 أشهر مدفوعة
        v_yearly_months_paid := 12 - p_free_months;
        v_final_price := v_monthly_after_promo * v_yearly_months_paid;
    END IF;
    
    -- 4. إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'plan_code', v_plan.code,
        'plan_name_ar', v_plan.name_ar,
        'plan_name_en', v_plan.name_en,
        'billing_cycle', p_billing_cycle,
        'currency', v_plan.currency,
        
        -- الأسعار
        'original_price', v_original_price,
        'monthly_after_promo', v_monthly_after_promo,
        'final_price', ROUND(v_final_price, 2),
        
        -- التفاصيل
        'promo_discount', v_promo_discount,
        'promo_name_ar', COALESCE(v_discount.name_ar, NULL),
        'promo_name_en', COALESCE(v_discount.name_en, NULL),
        'free_months', CASE WHEN p_billing_cycle = 'yearly' THEN p_free_months ELSE 0 END,
        'months_paid', CASE WHEN p_billing_cycle = 'yearly' THEN v_yearly_months_paid ELSE 1 END,
        
        -- التوفير
        'total_savings', ROUND(v_original_price - v_final_price, 2),
        'savings_percentage', ROUND((v_original_price - v_final_price) / v_original_price * 100, 2)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'exception',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_plan_pricing IS 'حساب السعر النهائي مع الخصومات والبونص السنوي';

-- ═══════════════════════════════════════════════════════════════
-- 12. دالة إنشاء خصم جديد (Platform Owner فقط)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_promotional_discount(
    p_code VARCHAR(50),
    p_name_ar VARCHAR(200),
    p_name_en VARCHAR(200),
    p_discount_percentage INT,
    p_valid_from TIMESTAMPTZ,
    p_valid_to TIMESTAMPTZ,
    p_applicable_plans JSONB DEFAULT '[]'::jsonb,
    p_applies_to VARCHAR(20) DEFAULT 'both',
    p_auto_apply BOOLEAN DEFAULT true,
    p_priority INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_discount_id UUID;
BEGIN
    -- التحقق من الكود
    IF EXISTS (SELECT 1 FROM promotional_discounts WHERE code = p_code) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'code_exists',
            'message', 'كود الخصم موجود مسبقاً'
        );
    END IF;
    
    -- إنشاء الخصم
    INSERT INTO promotional_discounts (
        code, name_ar, name_en,
        discount_percentage,
        valid_from, valid_to,
        applicable_plans, applies_to,
        is_active, auto_apply, priority
    ) VALUES (
        p_code, p_name_ar, p_name_en,
        p_discount_percentage,
        p_valid_from, p_valid_to,
        p_applicable_plans, p_applies_to,
        true, p_auto_apply, p_priority
    )
    RETURNING id INTO v_discount_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'discount_id', v_discount_id,
        'code', p_code,
        'message', 'تم إنشاء الخصم بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'exception',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 13. دالة تحديث خصم
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_promotional_discount(
    p_discount_id UUID,
    p_name_ar VARCHAR(200) DEFAULT NULL,
    p_name_en VARCHAR(200) DEFAULT NULL,
    p_discount_percentage INT DEFAULT NULL,
    p_valid_from TIMESTAMPTZ DEFAULT NULL,
    p_valid_to TIMESTAMPTZ DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_priority INT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM promotional_discounts WHERE id = p_discount_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'discount_not_found'
        );
    END IF;
    
    UPDATE promotional_discounts
    SET
        name_ar = COALESCE(p_name_ar, name_ar),
        name_en = COALESCE(p_name_en, name_en),
        discount_percentage = COALESCE(p_discount_percentage, discount_percentage),
        valid_from = COALESCE(p_valid_from, valid_from),
        valid_to = COALESCE(p_valid_to, valid_to),
        is_active = COALESCE(p_is_active, is_active),
        priority = COALESCE(p_priority, priority),
        updated_at = NOW()
    WHERE id = p_discount_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'discount_id', p_discount_id,
        'message', 'تم تحديث الخصم بنجاح'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 14. دالة الحصول على جميع الخصومات
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_promotional_discounts(
    p_active_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(50),
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    discount_percentage INT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    applicable_plans JSONB,
    applies_to VARCHAR(20),
    is_active BOOLEAN,
    auto_apply BOOLEAN,
    priority INT,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id,
        pd.code,
        pd.name_ar,
        pd.name_en,
        pd.discount_percentage,
        pd.valid_from,
        pd.valid_to,
        pd.applicable_plans,
        pd.applies_to,
        pd.is_active,
        pd.auto_apply,
        pd.priority,
        (NOW() BETWEEN pd.valid_from AND pd.valid_to)::BOOLEAN as is_current
    FROM promotional_discounts pd
    WHERE (NOT p_active_only OR pd.is_active = true)
    ORDER BY pd.priority DESC, pd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 15. التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_plans_count INT;
    v_discounts_count INT;
    v_plan RECORD;
BEGIN
    SELECT COUNT(*) INTO v_plans_count FROM subscription_plans WHERE is_active = true;
    SELECT COUNT(*) INTO v_discounts_count FROM promotional_discounts WHERE is_active = true;
    
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 45 completed successfully!';
    RAISE NOTICE '📦 عدد الباقات النشطة: %', v_plans_count;
    RAISE NOTICE '🎁 عدد الخصومات النشطة: %', v_discounts_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الباقات المتاحة:';
    
    FOR v_plan IN (
        SELECT code, name_ar, price_monthly, price_yearly, max_companies, currency 
        FROM subscription_plans 
        WHERE is_active = true 
        ORDER BY display_order
    )
    LOOP
        RAISE NOTICE '   - %: % ($%/mo, $%/yr, % شركات)', 
            v_plan.code, v_plan.name_ar, v_plan.price_monthly, v_plan.price_yearly, v_plan.max_companies;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 مثال على السعر مع الخصم:';
    RAISE NOTICE '   Starter شهري: %', get_plan_pricing('starter', 'monthly', 2);
    RAISE NOTICE '   Starter سنوي (10 أشهر): %', get_plan_pricing('starter', 'yearly', 2);
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;
