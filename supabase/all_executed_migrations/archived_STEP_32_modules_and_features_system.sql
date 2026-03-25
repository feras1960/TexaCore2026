-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 32: نظام التحكم في الموديولات والميزات والتبويبات
-- Modules, Features & UI Tabs Control System
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - لا تؤثر على الجداول الموجودة
-- ✅ Safe - Does not affect existing tables
--
-- المحتويات:
-- 1. جدول module_features - الميزات داخل كل موديول
-- 2. جدول plan_module_features - ربط الميزات بالباقات
-- 3. جدول ui_tabs - التبويبات القابلة للتحكم
-- 4. الدوال (get_tenant_available_modules, toggle_tenant_module, check_feature_access, etc.)
-- 5. Indexes و RLS Policies

-- ═══════════════════════════════════════════════════════════════
-- الجزء 1: جدول الميزات داخل الموديولات
-- Part 1: Module Features Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS module_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ الموديول المرتبط ═══
    module_code VARCHAR(50) NOT NULL,
    -- مرجع لـ system_modules.code
    
    -- ═══ تعريف الميزة ═══
    feature_code VARCHAR(100) NOT NULL,
    feature_name_ar VARCHAR(200) NOT NULL,
    feature_name_en VARCHAR(200),
    
    -- ═══ الوصف ═══
    description_ar TEXT,
    description_en TEXT,
    
    -- ═══ الأيقونة ═══
    icon VARCHAR(50),
    
    -- ═══ الفئة ═══
    category VARCHAR(50) DEFAULT 'general',
    -- general, reporting, integration, advanced, ai, api
    
    -- ═══ الترتيب ═══
    display_order INT DEFAULT 0,
    
    -- ═══ الحالة ═══
    is_active BOOLEAN DEFAULT true,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(module_code, feature_code)
);

-- ═══════════════════════════════════════════════════════════════
-- الجزء 2: ربط الميزات بالباقات
-- Part 2: Plan-Module-Features Mapping
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS plan_module_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    module_code VARCHAR(50) NOT NULL,
    feature_code VARCHAR(100) NOT NULL,
    
    -- ═══ التفعيل ═══
    is_enabled BOOLEAN DEFAULT true,
    
    -- ═══ ملاحظات ═══
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(plan_id, module_code, feature_code)
);

-- ═══════════════════════════════════════════════════════════════
-- الجزء 3: جدول التبويبات القابلة للتحكم (UI Tabs)
-- Part 3: Controllable UI Tabs Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ui_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ التعريف ═══
    tab_code VARCHAR(100) NOT NULL UNIQUE,
    
    -- ═══ الموديول والقسم ═══
    module_code VARCHAR(50),
    section_code VARCHAR(100) NOT NULL,
    -- invoice_details, account_sheet, customer_profile, etc.
    
    -- ═══ الأسماء ═══
    tab_name_ar VARCHAR(200) NOT NULL,
    tab_name_en VARCHAR(200),
    
    -- ═══ الأيقونة ═══
    icon VARCHAR(50),
    
    -- ═══ الترتيب ═══
    display_order INT DEFAULT 0,
    
    -- ═══ الشروط للظهور ═══
    required_feature_code VARCHAR(100),
    -- إذا كانت فارغة = متاح للجميع
    -- إذا كانت مملوءة = يحتاج الميزة
    
    min_plan_level VARCHAR(20),
    -- starter, professional, enterprise
    
    -- ═══ الحالة ═══
    is_active BOOLEAN DEFAULT true,
    is_core BOOLEAN DEFAULT false,
    -- core tabs تظهر دائماً
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- الجزء 4: الفهارس (Indexes)
-- Part 4: Indexes
-- ═══════════════════════════════════════════════════════════════

-- Indexes لجدول module_features
CREATE INDEX IF NOT EXISTS idx_module_features_module_code ON module_features(module_code);
CREATE INDEX IF NOT EXISTS idx_module_features_feature_code ON module_features(feature_code);
CREATE INDEX IF NOT EXISTS idx_module_features_category ON module_features(category);
CREATE INDEX IF NOT EXISTS idx_module_features_active ON module_features(is_active) WHERE is_active = true;

-- Indexes لجدول plan_module_features
CREATE INDEX IF NOT EXISTS idx_plan_module_features_plan_id ON plan_module_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_module_features_module ON plan_module_features(module_code);
CREATE INDEX IF NOT EXISTS idx_plan_module_features_combo ON plan_module_features(plan_id, module_code);

-- Indexes لجدول ui_tabs
CREATE INDEX IF NOT EXISTS idx_ui_tabs_section ON ui_tabs(section_code);
CREATE INDEX IF NOT EXISTS idx_ui_tabs_module ON ui_tabs(module_code);
CREATE INDEX IF NOT EXISTS idx_ui_tabs_feature ON ui_tabs(required_feature_code);
CREATE INDEX IF NOT EXISTS idx_ui_tabs_active ON ui_tabs(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 5: الدوال (Functions)
-- Part 5: Functions
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- دالة: الحصول على الموديولات المتاحة للتينانت
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tenant_available_modules(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    module_code VARCHAR(50),
    module_name_ar VARCHAR(100),
    module_name_en VARCHAR(100),
    icon VARCHAR(50),
    category VARCHAR(50),
    is_enabled BOOLEAN,
    is_included_in_plan BOOLEAN,
    is_core BOOLEAN,
    requires_upgrade BOOLEAN,
    upgrade_plan VARCHAR(50)
) AS $$
DECLARE
    v_tenant_id UUID;
    v_plan_id UUID;
    v_plan_code VARCHAR(50);
BEGIN
    -- الحصول على tenant_id
    v_tenant_id := COALESCE(p_tenant_id, get_current_tenant_id());
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;
    
    -- الحصول على plan_id للتينانت
    SELECT s.plan_id, sp.code INTO v_plan_id, v_plan_code
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE s.tenant_id = v_tenant_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- إرجاع الموديولات مع حالتها
    RETURN QUERY
    SELECT 
        sm.code,
        sm.name_ar,
        sm.name_en,
        sm.icon,
        sm.category,
        -- هل الموديول مفعل للتينانت؟
        COALESCE(tm.is_active, sm.is_core) as is_enabled,
        -- هل الموديول مضمن في الباقة؟
        CASE 
            WHEN sm.is_core THEN true
            WHEN v_plan_id IS NOT NULL THEN
                EXISTS(
                    SELECT 1 FROM subscription_plans sp
                    WHERE sp.id = v_plan_id
                    AND sm.code = ANY(
                        SELECT jsonb_array_elements_text(sp.included_modules)
                    )
                )
            ELSE false
        END as is_included_in_plan,
        sm.is_core,
        -- هل يحتاج ترقية؟
        CASE
            WHEN sm.is_core THEN false
            WHEN COALESCE(tm.is_active, false) THEN false
            ELSE true
        END as requires_upgrade,
        -- الباقة المطلوبة للترقية
        CASE
            WHEN v_plan_code = 'starter' THEN 'professional'
            WHEN v_plan_code = 'professional' THEN 'enterprise'
            ELSE NULL
        END as upgrade_plan
    FROM system_modules sm
    LEFT JOIN tenant_modules tm ON tm.module_code = sm.code 
        AND tm.tenant_id = v_tenant_id
    WHERE sm.is_active = true
    ORDER BY sm.display_order, sm.name_en;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- دالة: تفعيل/تعطيل موديول لتينانت (Super Admin)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION toggle_tenant_module(
    p_tenant_id UUID,
    p_module_code VARCHAR(50),
    p_enabled BOOLEAN,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_user_id UUID;
    v_is_super_admin BOOLEAN;
BEGIN
    -- التحقق من أن المستخدم super admin
    v_current_user_id := auth.uid();
    v_is_super_admin := COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
        false
    );
    
    IF NOT v_is_super_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Super Admin access required'
        );
    END IF;
    
    -- التحقق من وجود الموديول
    IF NOT EXISTS (SELECT 1 FROM system_modules WHERE code = p_module_code) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Module not found'
        );
    END IF;
    
    -- إدراج أو تحديث
    INSERT INTO tenant_modules (
        tenant_id,
        module_code,
        is_active,
        enabled_by,
        enabled_at
    ) VALUES (
        p_tenant_id,
        p_module_code,
        p_enabled,
        v_current_user_id,
        CASE WHEN p_enabled THEN NOW() ELSE NULL END
    )
    ON CONFLICT (tenant_id, module_code)
    DO UPDATE SET
        is_active = p_enabled,
        enabled_by = v_current_user_id,
        enabled_at = CASE WHEN p_enabled THEN NOW() ELSE tenant_modules.enabled_at END;
    
    -- تسجيل في audit log
    PERFORM log_audit(
        CASE WHEN p_enabled THEN 'enable_module' ELSE 'disable_module' END,
        'tenant_modules',
        p_tenant_id,
        p_module_code,
        NULL,
        jsonb_build_object('module_code', p_module_code, 'enabled', p_enabled, 'notes', p_notes)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'module_code', p_module_code,
        'enabled', p_enabled
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- دالة: الحصول على بنية القائمة الجانبية للتينانت
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tenant_sidebar_structure(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, get_current_tenant_id());
    
    SELECT jsonb_build_object(
        'categories', jsonb_agg(
            jsonb_build_object(
                'category', category,
                'modules', modules
            )
        )
    ) INTO v_result
    FROM (
        SELECT 
            COALESCE(sm.category, 'basic') as category,
            jsonb_agg(
                jsonb_build_object(
                    'code', sm.code,
                    'name_ar', sm.name_ar,
                    'name_en', sm.name_en,
                    'icon', sm.icon,
                    'path', '/' || sm.code,
                    'is_enabled', COALESCE(tm.is_active, sm.is_core),
                    'is_core', sm.is_core,
                    'badge', CASE 
                        WHEN NOT COALESCE(tm.is_active, sm.is_core) THEN 'locked'
                        ELSE NULL
                    END
                )
                ORDER BY sm.display_order
            ) as modules
        FROM system_modules sm
        LEFT JOIN tenant_modules tm ON tm.module_code = sm.code 
            AND tm.tenant_id = v_tenant_id
        WHERE sm.is_active = true
        GROUP BY sm.category
    ) categories;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- دالة: التحقق من توفر ميزة معينة
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_feature_access(
    p_tenant_id UUID,
    p_module_code VARCHAR(50),
    p_feature_code VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_id UUID;
    v_has_access BOOLEAN;
    v_module_enabled BOOLEAN;
BEGIN
    -- التحقق من تفعيل الموديول أولاً
    SELECT COALESCE(tm.is_active, sm.is_core) INTO v_module_enabled
    FROM system_modules sm
    LEFT JOIN tenant_modules tm ON tm.module_code = sm.code AND tm.tenant_id = p_tenant_id
    WHERE sm.code = p_module_code;
    
    IF NOT COALESCE(v_module_enabled, false) THEN
        RETURN false;
    END IF;
    
    -- الحصول على plan_id للـ tenant
    SELECT s.plan_id INTO v_plan_id
    FROM subscriptions s
    WHERE s.tenant_id = p_tenant_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- التحقق من الميزة في الباقة
    SELECT COALESCE(pmf.is_enabled, false) INTO v_has_access
    FROM plan_module_features pmf
    WHERE pmf.plan_id = v_plan_id
    AND pmf.module_code = p_module_code
    AND pmf.feature_code = p_feature_code;
    
    RETURN COALESCE(v_has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- دالة: الحصول على التبويبات المتاحة لقسم معين
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_allowed_tabs(
    p_tenant_id UUID,
    p_section_code VARCHAR(100)
)
RETURNS JSONB AS $$
DECLARE
    v_plan_id UUID;
    v_plan_code VARCHAR(50);
    v_tabs JSONB;
BEGIN
    -- الحصول على plan_id و plan_code
    SELECT s.plan_id, sp.code INTO v_plan_id, v_plan_code
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE s.tenant_id = p_tenant_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- إرجاع التبويبات المتاحة
    SELECT jsonb_agg(
        jsonb_build_object(
            'code', tab_code,
            'name_ar', tab_name_ar,
            'name_en', tab_name_en,
            'icon', icon,
            'order', display_order,
            'is_core', is_core
        )
        ORDER BY display_order
    ) INTO v_tabs
    FROM ui_tabs
    WHERE section_code = p_section_code
    AND is_active = true
    AND (
        -- التبويبات الأساسية
        is_core = true
        OR
        -- التبويبات بدون شروط
        (required_feature_code IS NULL AND min_plan_level IS NULL)
        OR
        -- التبويبات بشرط الباقة فقط
        (
            required_feature_code IS NULL 
            AND min_plan_level IS NOT NULL
            AND CASE v_plan_code
                WHEN 'starter' THEN min_plan_level = 'starter'
                WHEN 'professional' THEN min_plan_level IN ('starter', 'professional')
                WHEN 'enterprise' THEN true
                ELSE false
            END
        )
        OR
        -- التبويبات بشرط الميزة
        (
            required_feature_code IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM plan_module_features pmf
                WHERE pmf.plan_id = v_plan_id
                AND pmf.feature_code = required_feature_code
                AND pmf.is_enabled = true
            )
        )
    );
    
    RETURN COALESCE(v_tabs, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 6: RLS Policies
-- Part 6: RLS Policies
-- ═══════════════════════════════════════════════════════════════

-- تفعيل RLS
ALTER TABLE module_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_module_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_tabs ENABLE ROW LEVEL SECURITY;

-- Policy: الجميع يمكنهم قراءة الميزات
DROP POLICY IF EXISTS "Anyone can view module features" ON module_features;
CREATE POLICY "Anyone can view module features" ON module_features
    FOR SELECT USING (true);

-- Policy: Super Admin فقط يمكنه التعديل
DROP POLICY IF EXISTS "Super Admin can manage features" ON module_features;
CREATE POLICY "Super Admin can manage features" ON module_features
    FOR ALL USING (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
            false
        )
    );

-- Policy: الجميع يمكنهم قراءة ربط الميزات بالباقات
DROP POLICY IF EXISTS "Anyone can view plan features" ON plan_module_features;
CREATE POLICY "Anyone can view plan features" ON plan_module_features
    FOR SELECT USING (true);

-- Policy: Super Admin فقط يمكنه التعديل
DROP POLICY IF EXISTS "Super Admin can manage plan features" ON plan_module_features;
CREATE POLICY "Super Admin can manage plan features" ON plan_module_features
    FOR ALL USING (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
            false
        )
    );

-- Policy: الجميع يمكنهم قراءة التبويبات
DROP POLICY IF EXISTS "Anyone can view ui tabs" ON ui_tabs;
CREATE POLICY "Anyone can view ui tabs" ON ui_tabs
    FOR SELECT USING (true);

-- Policy: Super Admin فقط يمكنه التعديل
DROP POLICY IF EXISTS "Super Admin can manage ui tabs" ON ui_tabs;
CREATE POLICY "Super Admin can manage ui tabs" ON ui_tabs
    FOR ALL USING (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
            false
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- الجزء 7: التحقق النهائي
-- Part 7: Final Verification
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_table TEXT;
    v_exists BOOLEAN;
    v_tables TEXT[] := ARRAY[
        'module_features',
        'plan_module_features',
        'ui_tabs'
    ];
    v_func TEXT;
    v_functions TEXT[] := ARRAY[
        'get_tenant_available_modules',
        'toggle_tenant_module',
        'get_tenant_sidebar_structure',
        'check_feature_access',
        'get_allowed_tabs'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 التحقق من الجداول الجديدة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = v_table
        ) INTO v_exists;
        
        IF v_exists THEN
            RAISE NOTICE '✅ جدول: %', v_table;
        ELSE
            RAISE NOTICE '❌ جدول: % - غير موجود', v_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 التحقق من الدوال الجديدة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    
    FOREACH v_func IN ARRAY v_functions
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = v_func
        ) INTO v_exists;
        
        IF v_exists THEN
            RAISE NOTICE '✅ دالة: %', v_func;
        ELSE
            RAISE NOTICE '❌ دالة: % - غير موجودة', v_func;
        END IF;
    END LOOP;
    
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل تنفيذ STEP 32: Modules & Features System';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ✅ تم إنشاء نظام التحكم في الموديولات والميزات والتبويبات
-- ✅ Modules, Features & UI Tabs Control System Created
