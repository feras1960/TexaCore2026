-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: إضافة tenant_id للجداول الموجودة (NULL أولاً)
-- STEP 2: Add tenant_id to existing tables (NULL first)
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - الحقل NULL مؤقتاً، لا يؤثر على البيانات الموجودة
-- ✅ Safe - Field is NULL temporarily, does not affect existing data

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة tenant_id لجدول companies (NULL)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- التحقق من وجود جدول companies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        -- إضافة tenant_id إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE companies 
            ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ تم إضافة tenant_id لجدول companies';
        ELSE
            RAISE NOTICE '⚠️ tenant_id موجود مسبقاً في companies';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ جدول companies غير موجود';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. إضافة tenant_id لجدول branches (NULL)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'branches' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE branches 
            ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ تم إضافة tenant_id لجدول branches';
        ELSE
            RAISE NOTICE '⚠️ tenant_id موجود مسبقاً في branches';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ جدول branches غير موجود';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. إضافة tenant_id لجدول currencies (NULL)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currencies') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'currencies' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE currencies 
            ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ تم إضافة tenant_id لجدول currencies';
        ELSE
            RAISE NOTICE '⚠️ tenant_id موجود مسبقاً في currencies';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ جدول currencies غير موجود';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. إضافة tenant_id لجدول accounts (إن وجد)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'accounts' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE accounts 
            ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ تم إضافة tenant_id لجدول accounts';
        ELSE
            RAISE NOTICE '⚠️ tenant_id موجود مسبقاً في accounts';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ جدول accounts غير موجود (هذا طبيعي)';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. إضافة tenant_id لجدول user_profiles (إن وجد)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE user_profiles 
            ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ تم إضافة tenant_id لجدول user_profiles';
        ELSE
            RAISE NOTICE '⚠️ tenant_id موجود مسبقاً في user_profiles';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ جدول user_profiles غير موجود';
    END IF;
END $$;

-- ✅ تم! الآن جميع الجداول لديها tenant_id (NULL)
-- ✅ Done! All tables now have tenant_id (NULL)
-- 
-- 📝 ملاحظة: البيانات الموجودة لا تزال تعمل بشكل طبيعي
-- 📝 Note: Existing data still works normally
