-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 60: إصلاح مشاكل صفحة الباقات في SaaS
-- ═══════════════════════════════════════════════════════════════════════════
-- التاريخ: 28 يناير 2026
--
-- المشاكل المعالجة:
-- 1. إضافة جدول plan_modules لربط الباقات بالموديولات
-- 2. إضافة حقول max_customers و max_documents و max_images و max_records
-- 3. تحديث PlanLimitsTab ليكون قابل للتعديل
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    RAISE NOTICE '🚀 Starting STEP 60: Fix SaaS Packages...';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: إنشاء جدول plan_modules
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    RAISE NOTICE '📦 Part 1: Creating plan_modules table...';
END $$;

CREATE TABLE IF NOT EXISTS plan_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- العلاقات
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    module_id UUID NOT NULL, -- References system_modules(id)
    
    -- الحالة
    is_enabled BOOLEAN DEFAULT true,
    is_core BOOLEAN DEFAULT false, -- موديول أساسي (لا يمكن إزالته)
    
    -- الترتيب
    display_order INT DEFAULT 0,
    
    -- التواريخ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- منع التكرار
    UNIQUE(plan_id, module_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_modules_plan ON plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_module ON plan_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_enabled ON plan_modules(is_enabled);

COMMENT ON TABLE plan_modules IS 'ربط الباقات بالموديولات المتاحة فيها';
COMMENT ON COLUMN plan_modules.is_core IS 'موديول أساسي - لا يمكن إزالته من الباقة';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: إضافة حقول الحدود الجديدة لجدول subscription_plans
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    RAISE NOTICE '📦 Part 2: Adding new limit fields to subscription_plans...';
END $$;

-- إضافة max_customers
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_customers'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN max_customers INT DEFAULT 0;
        RAISE NOTICE '✅ Added max_customers column';
    ELSE
        RAISE NOTICE '⏭️ max_customers already exists';
    END IF;
END $$;

-- إضافة max_documents
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_documents'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN max_documents INT DEFAULT 0;
        RAISE NOTICE '✅ Added max_documents column';
    ELSE
        RAISE NOTICE '⏭️ max_documents already exists';
    END IF;
END $$;

-- إضافة max_images
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_images'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN max_images INT DEFAULT 0;
        RAISE NOTICE '✅ Added max_images column';
    ELSE
        RAISE NOTICE '⏭️ max_images already exists';
    END IF;
END $$;

-- إضافة max_records
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_records'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN max_records INT DEFAULT 0;
        RAISE NOTICE '✅ Added max_records column';
    ELSE
        RAISE NOTICE '⏭️ max_records already exists';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: تحديث البيانات الحالية
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    RAISE NOTICE '📦 Part 3: Updating existing data...';
END $$;

-- تحديث باقة Starter
UPDATE subscription_plans
SET 
    max_customers = 100,
    max_documents = 500,
    max_images = 200,
    max_records = 5000
WHERE code = 'starter';

-- تحديث باقة Professional
UPDATE subscription_plans
SET 
    max_customers = 1000,
    max_documents = 5000,
    max_images = 2000,
    max_records = 50000
WHERE code = 'professional';

-- تحديث باقة Enterprise
UPDATE subscription_plans
SET 
    max_customers = -1, -- unlimited
    max_documents = -1,
    max_images = -1,
    max_records = -1
WHERE code = 'enterprise';

DO $$ BEGIN
    RAISE NOTICE '✅ Updated limits for all plans';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: ملء جدول plan_modules من included_modules الموجود
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    RAISE NOTICE '📦 Part 4: Populating plan_modules from existing data...';
END $$;

DO $$
DECLARE
    v_plan RECORD;
    v_module_code TEXT;
    v_module_id UUID;
    v_is_core BOOLEAN;
    v_inserted_count INT := 0;
BEGIN
    -- Loop through all plans
    FOR v_plan IN (
        SELECT id, code, included_modules 
        FROM subscription_plans 
        WHERE included_modules IS NOT NULL
    )
    LOOP
        -- Loop through modules in included_modules array
        FOR v_module_code IN 
            SELECT jsonb_array_elements_text(v_plan.included_modules)
        LOOP
            -- Get module_id from system_modules
            SELECT id INTO v_module_id
            FROM system_modules
            WHERE code = v_module_code
            LIMIT 1;
            
            IF v_module_id IS NOT NULL THEN
                -- Determine if it's a core module (first 4 for starter, first 8 for professional)
                v_is_core := CASE 
                    WHEN v_plan.code = 'starter' AND v_module_code IN ('accounting', 'sales', 'purchases', 'inventory') THEN true
                    WHEN v_plan.code = 'professional' AND v_module_code IN ('accounting', 'sales', 'purchases', 'inventory') THEN true
                    ELSE false
                END;
                
                -- Insert into plan_modules
                INSERT INTO plan_modules (plan_id, module_id, is_enabled, is_core)
                VALUES (v_plan.id, v_module_id, true, v_is_core)
                ON CONFLICT (plan_id, module_id) DO NOTHING;
                
                v_inserted_count := v_inserted_count + 1;
            ELSE
                RAISE NOTICE '⚠️ Module not found: % for plan %', v_module_code, v_plan.code;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Inserted % module assignments', v_inserted_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: إنشاء دوال مساعدة
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    RAISE NOTICE '📦 Part 5: Creating helper functions...';
END $$;

-- دالة للحصول على موديولات باقة معينة
CREATE OR REPLACE FUNCTION get_plan_modules(p_plan_id UUID)
RETURNS TABLE (
    module_id UUID,
    module_code VARCHAR(50),
    module_name_en VARCHAR(100),
    module_name_ar VARCHAR(100),
    module_icon VARCHAR(50),
    is_enabled BOOLEAN,
    is_core BOOLEAN,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.module_id,
        sm.code,
        sm.name_en,
        sm.name_ar,
        sm.icon,
        pm.is_enabled,
        pm.is_core,
        sm.is_active
    FROM plan_modules pm
    JOIN system_modules sm ON pm.module_id = sm.id
    WHERE pm.plan_id = p_plan_id
    ORDER BY pm.display_order, sm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_plan_modules IS 'الحصول على موديولات باقة معينة مع تفاصيلها';

-- دالة لإضافة موديول لباقة
CREATE OR REPLACE FUNCTION add_module_to_plan(
    p_plan_id UUID,
    p_module_id UUID,
    p_is_core BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_module_exists BOOLEAN;
BEGIN
    -- التحقق من وجود الموديول
    SELECT EXISTS (
        SELECT 1 FROM system_modules WHERE id = p_module_id
    ) INTO v_module_exists;
    
    IF NOT v_module_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'module_not_found',
            'message', 'الموديول غير موجود'
        );
    END IF;
    
    -- إضافة الموديول
    INSERT INTO plan_modules (plan_id, module_id, is_enabled, is_core)
    VALUES (p_plan_id, p_module_id, true, p_is_core)
    ON CONFLICT (plan_id, module_id) DO UPDATE SET
        is_enabled = true,
        is_core = EXCLUDED.is_core,
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تمت إضافة الموديول بنجاح'
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

COMMENT ON FUNCTION add_module_to_plan IS 'إضافة موديول إلى باقة';

-- دالة لإزالة موديول من باقة
CREATE OR REPLACE FUNCTION remove_module_from_plan(
    p_plan_id UUID,
    p_module_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_is_core BOOLEAN;
BEGIN
    -- التحقق من أن الموديول ليس أساسي
    SELECT is_core INTO v_is_core
    FROM plan_modules
    WHERE plan_id = p_plan_id AND module_id = p_module_id;
    
    IF v_is_core THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'core_module',
            'message', 'لا يمكن إزالة موديول أساسي'
        );
    END IF;
    
    -- حذف الموديول
    DELETE FROM plan_modules
    WHERE plan_id = p_plan_id AND module_id = p_module_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تمت إزالة الموديول بنجاح'
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

COMMENT ON FUNCTION remove_module_from_plan IS 'إزالة موديول من باقة (إلا إذا كان أساسي)';

-- دالة لتحديث حدود الباقة
CREATE OR REPLACE FUNCTION update_plan_limits(
    p_plan_id UUID,
    p_max_users INT DEFAULT NULL,
    p_max_companies INT DEFAULT NULL,
    p_max_customers INT DEFAULT NULL,
    p_max_products INT DEFAULT NULL,
    p_max_documents INT DEFAULT NULL,
    p_max_images INT DEFAULT NULL,
    p_max_records INT DEFAULT NULL,
    p_storage_gb INT DEFAULT NULL
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
    
    -- تحديث الحدود (فقط القيم المرسلة)
    UPDATE subscription_plans
    SET
        max_users = COALESCE(p_max_users, max_users),
        max_companies = COALESCE(p_max_companies, max_companies),
        max_customers = COALESCE(p_max_customers, max_customers),
        max_products = COALESCE(p_max_products, max_products),
        max_documents = COALESCE(p_max_documents, max_documents),
        max_images = COALESCE(p_max_images, max_images),
        max_records = COALESCE(p_max_records, max_records),
        storage_gb = COALESCE(p_storage_gb, storage_gb)
    WHERE id = p_plan_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تحديث الحدود بنجاح'
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

COMMENT ON FUNCTION update_plan_limits IS 'تحديث حدود الباقة (المستخدمين، الشركات، العملاء، إلخ)';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: التحقق النهائي
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_plans_count INT;
    v_modules_count INT;
    v_assignments_count INT;
BEGIN
    SELECT COUNT(*) INTO v_plans_count FROM subscription_plans WHERE is_active = true;
    SELECT COUNT(*) INTO v_modules_count FROM system_modules WHERE is_active = true;
    SELECT COUNT(*) INTO v_assignments_count FROM plan_modules;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ STEP 60 completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Active Plans: %', v_plans_count;
    RAISE NOTICE '   - Active Modules: %', v_modules_count;
    RAISE NOTICE '   - Module Assignments: %', v_assignments_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 New Features:';
    RAISE NOTICE '   ✅ plan_modules table created';
    RAISE NOTICE '   ✅ New limit fields added (customers, documents, images, records)';
    RAISE NOTICE '   ✅ Module assignments populated from existing data';
    RAISE NOTICE '   ✅ Helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '   1. Update PlanModulesTab component to use plan_modules table';
    RAISE NOTICE '   2. Update PlanLimitsTab to enable editing';
    RAISE NOTICE '   3. Test module management features';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;
